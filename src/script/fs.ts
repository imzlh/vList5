import type { AlertOpts, FileOrDir, ListPredirect, MessageOpinion, vDir, vFile, vSimpleFileOrDir } from "@/env";
import { APP_API, DEFAULT_DIR_ICON, FILE_PROXY_SERVER, Global, getConfig } from "@/utils";
import { getIcon } from "./icon";
import { ref, type Ref } from "vue";

export class PermissionDeniedError extends Error{}
export class LoginError extends Error{}

/**
 * 为双方安全传输编码的函数
 * @param ctxlen 消息长度
 * @param pass 密码
 * @returns 加密后的信息
 */
export async function encrypto(ctxlen: number, pass: string, content: string):Promise<string>{
    // 验证时间有效性: 10s内
    const timestrap = Date.now() / 1000;
    let timecode = Math.floor(timestrap / 10);
    if(timestrap % 10 > 5)
        timecode += 1;

    // 打乱pass，验证消息有效性
    const pass_code = new TextEncoder().encode(pass),
        encrypto = timecode & ctxlen;
    let safeCode = 0;
    for (let i = 0; i < pass_code.length; i++) 
        safeCode += (pass_code[i] << (4 * i % 4)) & (pass_code[i] >> 4);
    const hmac_key = (safeCode ^ encrypto).toString(20);

    // hmac+sha1加密
    const hmac = await crypto.subtle.importKey(
            'raw', 
            new TextEncoder().encode(hmac_key),
            {
                "name": "HMAC",
                "hash": "SHA-256"
            },
            false,
            ['sign']
        ),
        value = await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(content));
    const process = (input:number) => input < 0x20 ? input + 0x20 : (input > 0x7e) ? (input - 0x7e > 0x7e) ? 0x7e : input - 0x7e : input;
    return new TextDecoder().decode( value).replace(/[^\x20-\x7E]/g, input => String.fromCharCode(process(input.charCodeAt(0)))).trim();
}

export const FS = {
    /**
     * @private
     */
    auth_key: null as null | Ref<string>,

    /**
     * 请求后端
     * @private
     * @param method 类型
     * @param body 参数
     * @param json 是否以json返回
     * @returns JSON
     */
    async __request(method: string,body: Object, json = false){
        if(!this.auth_key)
            this.auth_key = getConfig('基础').authkey;
        const content = JSON.stringify(body),
            xhr = await fetch(APP_API + '?action=' + method,{
            method: 'POST',
            body: content,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.auth_key?.value
                    ? await encrypto(content.length, this.auth_key.value, content)
                    : ''
            },
        });
        if(xhr.status == 403) throw new PermissionDeniedError(await xhr.text());
        else if(xhr.status == 400) throw new SyntaxError(await xhr.text());
        else if(xhr.status == 401) try{
            await this.__auth();
            await this.__request(method, body, json);
        }catch{
            throw new LoginError();
        }else if(Math.floor(xhr.status / 100) != 2) throw new Error(await xhr.text());
           
        try{
            if(json) return await xhr.json();
            else return await xhr.text();
        }catch{
            throw new TypeError('Server Error');
        }
    },

    /**
     * 列举一个文件夹
     * @param dir 文件夹路径
     * @returns 列表
     */
    async list(path:string, predirect: ListPredirect | {} = {}){
        (predirect as any).path = path[path.length -1] == '/' ? path : path + '/';
        const item = (await this.__request('list',predirect,true) as Array<string>)
            .map((item) => ({
                name: item,
                path: path + item,
                url: FILE_PROXY_SERVER + path + item
            } satisfies vSimpleFileOrDir)) as Array<FileOrDir>;
        return item.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * 列举一个文件夹，并且返回详细信息
     * @param path 路径
     * @returns 详细信息
     */
    async listall(path:string):Promise<Array<FileOrDir>>{
        const item = (await this.__request('slist',{ path },true)).map((item:FileOrDir) => {
            item.url = FILE_PROXY_SERVER + path + item.name + (item.type == 'dir' ? '/' : '');
            item.path = path + item.name + (item.type == 'dir' ? '/' : '');
            return item;
        }) as Array<FileOrDir>;
        return item.filter(item => item.type == 'dir').sort((a, b) => a.name.localeCompare(b.name))
            .concat(item.filter(item => item.type == 'file').sort((a, b) => a.name.localeCompare(b.name)) as any);
    },

    /**
     * 重命名文件
     * 与`FS.move()`不同的是, `rename()`是一对一的，而`move()`是多个复制到一个文件夹中的
     * 对于批量复制到一个地方`move()`更简便且节省带宽
     * @param fileList 文件列表，键值对应 `源文件:目标文件`
     */
    rename(fileList: Record<string,string>):Promise<void>{
        return this.__request('rename', fileList, false);
    },

    /**
     * 排序
     */
    sort<T extends { name: string, type?: string }>(input: Array<T>):Array<T>{
        type fd = T & {weights:RegExpMatchArray};

        const files:Array<fd> = [],dirs:Array<fd> = [],
            regexp = /[^\d]+|\d+/g;

        input.forEach(element => {
            const e = element as fd;
            if(regexp.test(e.name))
                e.weights = e.name.match(regexp) as RegExpMatchArray;
            if(e.type == undefined || e.type == 'file')
                files.push(e);
            else
                dirs.unshift(e);
        });

        function SortHandle(a:fd, b:fd){
            let weightA:number = 1, weightB:number = 1;
            for (let i = 0 ; weightA && weightB ; i ++) {
                weightA = parseInt(a.weights[i]),weightB = parseInt(b.weights[i]);
                const v = weightA - weightB;
                if (!isNaN(v) && v !== 0) return v;
                if (weightA !== weightB) return weightA > weightB ? 1 : -1;
            }
            return weightA ? 1 : -1;
        }

        return (dirs.sort(SortHandle) as Array<fd>).concat(files.sort(SortHandle));
    },

    stat(path:string):Promise<FileOrDir>{
        return this.__request('stat',{ path }, true);
    },

    delete(files:Array<string>|string){
        return this.__request('delete', { files: typeof files == 'string' ? [files] : files });
    },

    mkdir(dirs: Array<string>|string){
        return this.__request('mkdir', { files: typeof dirs == 'string' ? [dirs] : dirs });
    },

    touch(files:Array<string>|string, mode?: number){
        if(mode && mode > 0o7777)
            throw new Error('Mode Error');
        files = typeof files == 'string' ? [files] : files;
        return this.__request('touch', { 
            files,
            mode
        });
    },

    copy(from:Array<string>|string,to:string){
        from = typeof from == 'string' ? [from] : from;
        return this.__request('copy', {
            from,
            to
        });
    },

    move(from:Array<string>|string,to:string){
        from = typeof from == 'string' ? [from] : from;
        return this.__request('move', {
            from,
            to
        });
    },

    /**
     * @private
     */
    __auth: () => new Promise((rs, rj) => Global('ui.alert').call({
        'type': 'prompt',
        'title': '身份验证',
        'message': '由于身份验证失败，操作失败。\n请输入身份ID，如果忘记请查看nginx配置',
        'callback': (data) => {
            if(!FS.auth_key)
                FS.auth_key = getConfig('基础').authkey;
            FS.auth_key.value = data as string;
            rs(data as string);
        },
        'button': [
            {
                'content': '放弃',
                'color': '#e9e9e9',
                'role': 'close',
                'click': () => rj(new Error('User aborted due to password error'))
            },{
                'content': '提交',
                'color': '#6ce587',
                'role': 'submit'
            }
        ]
    } satisfies AlertOpts)) as Promise<string>,

    write(
        file:string,
        content: Blob,
        progress?:(this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any
    ):Promise<string>{
        if(!this.auth_key)
            this.auth_key = getConfig('基础').authkey;

        return new Promise(async (rs,rj) => {
            // 预检
            let _pre;
            try{
                _pre = await fetch(APP_API + '?action=upload&path=' + encodeURIComponent(file) + '&type=' + content.type + '&length=' + content.size,{
                    headers: {
                        'Authorization': this.auth_key?.value
                            ? await encrypto(content.size, this.auth_key.value, content.type)
                            : ''
                    }
                });
                if(_pre.status == 401){
                    await this.__auth();
                    return await this.write(file, content, progress).then(rs).catch(rj);
                }
                if(Math.floor(_pre.status / 100) != 2) throw 0;
            }catch{
                return rj(new Error('PreUpload Failed: ' + (_pre ? await _pre.text() : 'Unknown Error')));
            }

            const xhr = new XMLHttpRequest();
            xhr.timeout = 60000;
            
            if(progress) xhr.addEventListener('progress', progress);
            xhr.addEventListener('load', () => 
                Math.floor(xhr.status / 100) == 2
                    ? rs(xhr.responseText)
                    : rj(new Error('Status ' + xhr.status + ': ' + xhr.responseText))
            );
            xhr.addEventListener('error', () => rj(new Error('Network Error')));
            xhr.addEventListener('timeout', rj);

            xhr.open('POST',APP_API + '?action=upload&path=' + encodeURIComponent(file));
            xhr.setRequestHeader('Content-Type', content.type);
            if(this.auth_key?.value) 
                xhr.setRequestHeader('Authorization', await encrypto(content.size, this.auth_key.value, content.type));
            xhr.send(content);
        });
    }
}

/**
 * 清理路径，清除淤积的内容
 * @param path 路径
 * @returns 清理后的路径
 */
export function clearPath(path:string){
    return path.replace('\\','/')
        .replace(/\/+/,'/')
        .replace('/./','/')
        .replace(/\/[\w\W]+\/\.\.\//,'/');
}

/**
 * 分割路径
 * @param f 文件
 * @returns 文件信息
 */
export function splitPath(f: { path: string }){
    const path = clearPath(f.path),
        slash = path.lastIndexOf('/'),
        dot = path.lastIndexOf('.');
    return {
        dir   : path.substring(0,slash +1) || '/',
        name  : path.substring(slash + 1, dot),
        ext   : path.substring(dot + 1),
        fname : path.substring(slash + 1)
    }
}



export function clipFName(file:{name: string},maxlen = 20){
    if(file.name.length > maxlen){
        return file.name.substring(0,maxlen - 3) + '..'
    }else{
        return file.name;
    }
}


export function size2str(size: number){
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    for (let i = 0; i < sizes.length; i++)
        if (size / 1024 ** i < 800)
            return (size / 1024 ** i).toFixed(1) + sizes[i];
}