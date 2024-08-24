/**
 * 为TxtReader设计的缓存数据库
 * 通过章节索引，最小单元为chunk块，方便快速预览
 * vint为mkv EBML同款vint
 * 
 * TxTDB 文件结构
 * 0b01101100 标识
 * vint chunk字数(为了等大，使用3x字数作为大小)
 * vint 章节数
 * ... vint 章节标题长度
 * ... string 章节标题
 * ... vint 章节起始偏移位置(chunk id)
 * ... chunks 内容
 */

import type { vFile } from "@/env";

export class BinReader{
    private pipe: ReadableStreamDefaultReader<Uint8Array>;
    private buffer: Uint8Array | undefined;
    private pointer = 0;

    constructor(pipe: ReadableStream<Uint8Array>){
        this.pipe = pipe.getReader();
    }

    private async readBuffer(){
        const res = await this.pipe.read();
        if(!res.value || res.done) throw new Error("Stream ended");
        this.buffer = res.value;
    }

    async readVInt(): Promise<number>{
        if(!this.buffer?.length) await this.readBuffer();
        const { length, value } = parseVInt(this.buffer!);
        this.buffer = this.buffer!.slice(length);
        this.pointer += length;
        return value;
    }

    async readText(length: number): Promise<string>{
        while(!this.buffer?.length || this.buffer.length < length) await this.readBuffer();
        const buf = this.buffer.slice(0, length);
        let end = buf.length;
        while(buf[end -1] == 0) end --;
        const text = new TextDecoder().decode(buf.subarray(0, end));
        this.buffer = this.buffer.slice(length);
        this.pointer += length;
        return text;
    }

    async readToEnd(): Promise<string>{
        let text = "";
        while(true){
            try{
                await this.readBuffer();
            }catch{
                this.pointer = -1;
                return text;
            }
            text += new TextDecoder().decode(this.buffer);
            this.buffer = undefined;
        }
    }

    async readBin(length: number): Promise<Uint8Array>{
        while(!this.buffer?.length || this.buffer.length < length) await this.readBuffer();
        const bin = this.buffer.slice(0, length);
        this.buffer = this.buffer.slice(length);
        this.pointer += length;
        return bin;
    }

    get offset(){
        return this.pointer;
    }
}

export class TxtDB{
    // chunk缓存
    private cache = [] as Array<string>;

    // 每次请求时最少请求的大小
    private loadonce_minsize = 64 * 1024;

    constructor(
        private chapters: Array<[string, number, string]>,
        readonly chunk_size: number,
        readonly file: vFile,
        readonly body_offset: number
    ){}

    async readChunks(start_id: number, end_id?: number){
        start_id < 0 && (start_id = 0);
        end_id || (end_id = start_id);
        if(start_id > end_id) throw new Error("Invalid range");
        if(end_id > this.chapters.length) throw new Error("Out of range");
        // 检查缓存
        const cache_miss = [] as Array<number>;
        for(let i = start_id; i < end_id; i++)
            if(!this.cache[i]) cache_miss.push(i);
        if(cache_miss.length){
            const start = cache_miss[0] * this.chunk_size * 3 + this.body_offset,
                end = Math.max(
                    (cache_miss.at(-1)! +1) * this.chunk_size * 3 + this.body_offset,
                    Math.ceil(this.loadonce_minsize / 3 / this.chunk_size + cache_miss[0]) * this.chunk_size * 3 + this.body_offset
                ),
                data = new Uint8Array(await (await fetch(this.file.url, {
                    headers: { Range: `bytes=${start}-${end}` }
                })).arrayBuffer());
            // 拆分
            const i_end = data.length / 3 / this.chunk_size;
            for(let i = 0; i < i_end; i ++){
                const buf = data.slice(i * this.chunk_size * 3, (i + 1) * this.chunk_size * 3);
                let end = buf.length;
                while(buf[end -1] == 0) end --;
                this.cache[i + cache_miss[0]] = new TextDecoder().decode(buf.subarray(0, end)).padEnd(this.chunk_size, ' ');
            }
        }
        // 返回缓存
        return this.cache.slice(start_id, end_id +1).join();
    }
    
    async read(start: number, end: number): Promise<string>{
        const start_id = Math.floor(start / this.chunk_size),
            start_offset = start % this.chunk_size,
            end_id = Math.ceil(end / this.chunk_size),
            res = await this.readChunks(start_id, end_id);
        return res.substring(start_offset, end - start + start_offset);
    }

    get chapter(){
        return this.chapters.map(([title, offset, _]) => ({ title, offset: offset * this.chunk_size }));
    }
}

export async function loadTxtDB(file: vFile): Promise<TxtDB>{
    const fe = await fetch(file.url), pipe = fe.body;
    if(!pipe) throw new Error("Failed to fetch file");
    const reader = new BinReader(pipe);

    // 判断格式是否为txtDB
    const magic = (await reader.readBin(1))[0];
    if(magic !== 0b01101100) throw new Error("Invalid magic number");
    
    // 读取header
    const chunk_size = await reader.readVInt();
    if(chunk_size < 64) throw new Error("Invalid chunk size: smaller than 64");
    const chapter_count = await reader.readVInt();
    const chapters = [] as Array<[string, number, string]>;
    for(let i = 0; i < chapter_count; i++){
        const title_length = await reader.readVInt();
        const title = await reader.readText(title_length);
        const offset = await reader.readVInt();
        chapters.push([title, offset, '']);
    }

    return new TxtDB(chapters, chunk_size, file, reader.offset);
}

function createVInt(value: number) {
    if (value < 0 || value > 2 ** 53) {
        throw new Error(`Unrepresentable value: ${value}`);
    }

    let length = 1;
    for (length = 1; length <= 8; length += 1)
        if (value < 2 ** (7 * length) - 1)
            break;

    const buffer = new Uint8Array(length);
    let val = value;
    for (let i = 1; i <= length; i += 1) {
        const b = val & 0xff;
        buffer[length - i] = b;
        val -= b;
        val /= 2 ** 8;
    }
    buffer[0] |= 1 << (8 - length);

    return buffer;
}

function parseVInt(buffer: Uint8Array) {
    if(buffer[0] == 0) throw new Error("Invalid vint");
    const length = 8 - Math.floor(Math.log2(buffer[0]));
    if (length > 8)
        throw new Error(`Unrepresentable length: ${length}`);

    let value = buffer[0] & ((1 << (8 - length)) - 1);
    for (let i = 1; i < length; i += 1) {
        if (i === 7) {
            if (value >= 2 ** 45 && buffer[7] > 0) {
                return { length, value: -1 };
            }
        }
        value *= 2 ** 8;
        value += buffer[i];
    }

    return { length, value };
}

export async function generateTxtDB(file: vFile, title_preg = /第[0-9]+(?:章|节)\s+(.+)(?:\r|\n)+/): Promise<Blob>{
    let content = await ( await fetch(file.url) ).text();
    const chunk_size = Math.min(Math.floor(content.length / 1000), 1024),
        chapters = [] as Array<[string, Array<Uint8Array>]>;

    let title = '', raw_title = '';
    while(true){
        const match = title_preg.exec(content);
        if(!match) break;

        // 匹配
        const chunks = [] as Array<Uint8Array>,
            contents = raw_title + content.substring(0, match.index).replace('\r', '\n');

        // 拆分为chunk块
        const encoder = new TextEncoder();
        for(let i = 0; i < contents.length; i += chunk_size)
            chunks.push(encoder.encode(contents.slice(i, i + chunk_size)));

        // 加入章节
        chapters.push([title, chunks]);

        // 准备后一个章节
        title = match[1];
        content = content.substring(match.index + match[0].length);
        raw_title = match[0];
    }

    // 最后一个章节
    if(content.length){
        // 拆分为chunk块
        const encoder = new TextEncoder(),
            chapter = [] as Array<Uint8Array>;
        for(let i = 0; i < content.length; i += chunk_size)
            chapter.push(encoder.encode(content.slice(i, i + chunk_size)));

        // 加入章节
        chapters.push([title, chapter]);
    }

    // 输出文件
    const blob_dataparts = [] as Array<Uint8Array>;
    // magic
    blob_dataparts.push(new Uint8Array([0b01101100]));
    // chunk size
    blob_dataparts.push(createVInt(chunk_size));
    // header
    blob_dataparts.push(createVInt(chapters.length));
    // chapters
    let offset = 0;
    for (const [_title, chapter] of chapters) {
        // title
        const title = new TextEncoder().encode(_title);
        blob_dataparts.push(createVInt(title.length));
        blob_dataparts.push(title);
        // offset
        blob_dataparts.push(createVInt(offset));
        offset += chapter.length;
    }
    // chunks
    for (const [_, chapter] of chapters) {
        for (const chunk of chapter) {
            const chunk_arr = new Uint8Array(chunk_size * 3);
            chunk_arr.set(chunk, 0);
            blob_dataparts.push(chunk_arr);
        }
    }
    return new Blob(blob_dataparts, { type: "application/octet-stream" });
}