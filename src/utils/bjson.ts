/**
 * 二进制JSON
 * 格式如下：
 * 【BJSON头】
 * 【vint标注的键名】【meta，用于标注数据类型和长度chunk的长度】【长度】【内容】
 * 或
 * 【vint标注的键名】【meta，用于标注Object/Array长度的长度】【长度】【...子元素】
 */

/**
 * BJson数据类型，占据4Bit
 */
enum DataType {
    False,      // false
    True,       // true

    Null,       // null

    String,     // 字符串
    
    NInt,       // 负整数
    Int,        // 正整数
    Float,      // 浮点数
    BigInt,     // 大整数
    Infinity,   // 正无穷
    NInfinity,  // 负无穷

    Array,      // 数组
    Object,     // 对象

    Binary,     // 二进制数据
    Unknown     // 未知类型
}

export const Unknown = Symbol("Unknown");

/**
 * 动态大小整数编码
 * @param obj 整数
 * @returns Buffer
 */
function int2buf(obj: number) {
    const dats: Array<number> = [];
    let num = Math.abs(Math.floor(obj));
    do dats.push(num & 0xff); while ((num >>= 8) > 0);

    return dats;
}

/**
 * 动态大小BigInt编码
 * @param obj BigInt
 * @returns Buffer
 */
function bigint2buf(num: bigint) {
    const dats: Array<number> = [];
    do dats.push(Number(num & 0xffn)); while ((num >>= 8n) > 0);
    return dats;
}

async function encodeData(obj: any, pipe: WritableStreamDefaultWriter<Uint8Array>) {
    if (obj === undefined) throw new Error("Undefined data");
    
    switch (typeof obj) {
        case "boolean":
            await pipe.write(new Uint8Array([(obj ? DataType.True : DataType.False) << 4]));
            break;

        case "undefined":
            await pipe.write(new Uint8Array([DataType.Null << 4]));
            break;

        case "symbol":
            await pipe.write(new Uint8Array([DataType.Unknown << 4]));
            break;

        case "number":
            if (Number.isNaN(obj)) {
                await pipe.write(new Uint8Array([DataType.Unknown << 4]));
            } else if (!Number.isFinite(obj)) {
                await pipe.write(new Uint8Array([(obj < 0 ? DataType.NInfinity : DataType.Infinity) << 4]));
            } else if (Number.isInteger(obj)) {
                const buf = int2buf(obj);
                if (buf.length > 0b1111) throw new Error("Number too large");
                buf.unshift(((obj < 0 ? DataType.NInt : DataType.Int) << 4) + buf.length);
                await pipe.write(new Uint8Array(buf));
            } else {
                const dat = new DataView(new ArrayBuffer(16));
                dat.setFloat64(0, obj);
                const res = new Uint8Array(dat.buffer).filter(Boolean);
                await pipe.write(new Uint8Array([(DataType.Float << 4) + res.length]));
                await pipe.write(res);
            }
            break;

        case "string":
            const strEncoded = new TextEncoder().encode(obj);
            const strLenBuf = int2buf(strEncoded.length);
            await pipe.write(new Uint8Array([(DataType.String << 4) + strLenBuf.length]));
            await pipe.write(new Uint8Array(strLenBuf));
            await pipe.write(strEncoded);
            break;

        case "bigint":
            const bigIntBuf = bigint2buf(obj);
            const bigIntLenBuf = int2buf(bigIntBuf.length);
            await pipe.write(new Uint8Array([(DataType.BigInt << 4) + bigIntLenBuf.length]));
            await pipe.write(new Uint8Array(bigIntLenBuf));
            await pipe.write(new Uint8Array(bigIntBuf));
            break;

        case "function":
        case "object":
            if (Array.isArray(obj)) {
                const arrLenBuf = int2buf(obj.length);
                await pipe.write(new Uint8Array([(DataType.Array << 4) + arrLenBuf.length]));
                await pipe.write(new Uint8Array(arrLenBuf));
                for (const item of obj)
                    await encodeData(item, pipe);
            } else if (obj === null) {
                await pipe.write(new Uint8Array([DataType.Null << 4]));
            } else if (obj instanceof ArrayBuffer || obj.buffer instanceof ArrayBuffer) {
                await pipe.write(new Uint8Array([(DataType.Binary << 4) + int2buf(obj.byteLength).length]));
                await pipe.write(new Uint8Array(int2buf(obj.byteLength)));
                await pipe.write(new Uint8Array(obj));
            } else {
                const keys = Object.keys(obj).filter(i => obj[i] !== undefined);
                await pipe.write(new Uint8Array([(DataType.Object << 4) + int2buf(keys.length).length]));
                await pipe.write(new Uint8Array(int2buf(keys.length)));

                for (const key of keys) {
                    const keyEncoded = new TextEncoder().encode(key);
                    if (keyEncoded.length > 255) throw new Error("Key too long");
                    await pipe.write(new Uint8Array([keyEncoded.length]));
                    await pipe.write(keyEncoded);
                    await encodeData(obj[key], pipe);
                }
            }
            break;
    }
}



function conv2int(buf: Uint8Array): number {
    let num = 0;
    for (let i = 0; i < buf.length; i++)
        num = (num << 8) | buf[i];
    return num;
}

Uint8Array.prototype.pad = function(len: number, pad: number = 0) {
    if(len <= this.length) return this;
    const res = new Uint8Array(len);
    res.set(this, 0);
    if(pad) res.fill(pad, this.length);
    return res;
}
declare global {
    interface Uint8Array {
        pad(len: number, pad?: number): Uint8Array;
    }
}

/**
 * 解码数据
 * @param buffer 编码后的数据数组
 * @returns 解码后的原始数据
 */
function decodeData(pipe: ReadableStreamDefaultReader<Uint8Array>): Promise<any> {
    let index = 0;
    let buffer = new Uint8Array();
    let bufferLength = 0; // 记录当前 buffer 的长度

    async function readBytes(len = 1) {
        // 如果请求的长度超出了当前 buffer 的长度，则从管道中读取更多数据
        while (index + len > bufferLength) {
            const readResult = await pipe.read();
            if (readResult.done) {
                throw new Error("Unexpected end of stream");
            }else{
                // 如果读取到的数据，将其与当前 buffer 合并
                const newData = readResult.value;
                const newBuffer = new Uint8Array(bufferLength + newData.length);
                newBuffer.set(buffer);
                newBuffer.set(newData, bufferLength);
                buffer = newBuffer;
                bufferLength += newData.length;
            }
        }

        const res = buffer.slice(index, index + len);
        index += len;
        return res;
    }

    async function decodeValue(): Promise<any> {
        const header = (await readBytes())[0];
        const dataType = header >> 4;

        switch (dataType) {
            case DataType.False:
            return false;

            case DataType.True:
            return true;
            
            case DataType.Null:
            return null;

            case DataType.String:
                const lenlen = header & 0b1111, len = conv2int(await readBytes(lenlen));
            return new TextDecoder().decode(await readBytes(len));

            case DataType.Int:
            case DataType.NInt:
                let num = 0;
                const nlen = header & 0b1111;
                for (let i = 0; i < nlen; i++) {
                    const byte = (await readBytes())[0];
                    num = (num << 8) | (byte & 0xff);
                }
            return dataType === DataType.NInt ? -num : num;

            case DataType.Float:
                const len2 = header & 0b1111;
                const view = new DataView((await readBytes(len2)).pad(8).buffer);
            return view.getFloat64(0);

            case DataType.BigInt:
                let num2 = 0n;
                const nlen2 = header & 0b1111,
                    nlen3 = conv2int(await readBytes(nlen2));
                for (let i = 0; i < nlen3; i++) {
                    const byte = (await readBytes())[0];
                    num2 = (num2 << 8n) | BigInt(byte & 0xff);
                }
            return num2;

            case DataType.Array:
                const lenlen2 = header & 0b1111, arrLen = conv2int(await readBytes(lenlen2));
                const arr = [];
                for (let i = 0; i < arrLen; i++)
                    arr.push(await decodeValue());
            return arr;

            case DataType.Object:
                const obj: Record<string, any> = {},
                    lenlen3 = header & 0b1111, objLen = conv2int(await readBytes(lenlen3));
                for(let i = 0; i < objLen; i++) {
                    const keyLen = (await readBytes())[0],
                        key = new TextDecoder().decode(await readBytes(keyLen)),
                        type = buffer[index] >> 4;
                    obj[key] = await decodeValue()
                }
            return obj;

            case DataType.Binary:
                const binaryLen = conv2int(await readBytes(header & 0b1111));
            return readBytes(binaryLen);

            case DataType.Unknown:
            return Unknown;

            case DataType.Infinity:
            return Infinity;

            case DataType.NInfinity:
            return -Infinity;

            default:
                throw new Error("Unknown data type");
        }
    }

    return decodeValue();
}

export const encode = (data: any) => {
    const pipe = new CompressionStream('gzip'),
        writer = pipe.writable.getWriter();
    encodeData(data, writer).then(() => writer.close());
    return pipe.readable;
};
export const decode = async (stream: ReadableStream) => {
    const pipe = new DecompressionStream('gzip'),
        reader = pipe.readable.getReader();
    let closed = false;
    reader.closed.then(() => closed = true);
    stream.pipeTo(pipe.writable);
    const res = await decodeData(reader);
    if(!closed || !(await reader.read()).done)
        throw new Error("Invalid data length");
    return res;
};

export async function encode2Blob(data: any): Promise<Blob> {
    const pipe = encode(data).getReader();
    const chunks: Uint8Array[] = [];
    let res = await pipe.read();
    while (!res.done) {
        chunks.push(res.value);
        res = await pipe.read();
    }
    return new Blob(chunks, { type: 'application/bjson' });
}