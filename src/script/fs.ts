import type { FileOrDir, ListPredirect, MessageOpinion, vDir, vFile, vSimpleFileOrDir } from "@/env";
import { APP_API, DEFAULT_DIR_ICON, FILE_PROXY_SERVER, Global } from "@/utils";
import { getIcon } from "./icon";

type file_action = 'move'|'copy';

export class PermissionDeniedError extends Error{}
export class LoginError extends Error{}

export const FS = {
    marked: [] as Array<FileOrDir>,
    action: 'copy' as file_action,

    /**
     * 请求后端
     * @private
     * @param method 类型
     * @param body 参数
     * @param json 是否以json返回
     * @returns JSON
     */
    async __request(method: string,body: Object, json = false){
        const xhr = await fetch(APP_API + '?action=' + method,{
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            },
        });
        if(xhr.status == 403) throw new PermissionDeniedError(await xhr.text());
        else if(xhr.status == 400) throw new SyntaxError(await xhr.text());
        else if(xhr.status == 401) throw new LoginError(await xhr.text());
        else if(xhr.status != 200) throw new Error(await xhr.text());
           
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
        path = (predirect as any).path = path[path.length -1] == '/' ? path : path + '/';
        return (await this.__request('list',predirect,true) as Array<string>)
            .map((item) => ({
                name: item,
                path: path + item,
                url: FILE_PROXY_SERVER + path + item
            } satisfies vSimpleFileOrDir));
    },

    /**
     * 列举一个文件夹，并且返回详细信息
     * @param path 路径
     * @returns 详细信息
     */
    async listall(path:string):Promise<Array<FileOrDir>>{
        return (await this.__request('slist',{ path },true)).map((item:FileOrDir) => {
            item.url = FILE_PROXY_SERVER + path + item.name + (item.type == 'dir' ? '/' : '');
            item.path = path + item.name + (item.type == 'dir' ? '/' : '');
            return item;
        });
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

    write(file:string,content: Blob,progress?:(this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any):Promise<ProgressEvent<EventTarget>>{
        return new Promise((rs,rj) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST',APP_API + '?action=upload&path=' + encodeURIComponent(file));
            xhr.onprogress = progress || null;
            xhr.onerror = rj,xhr.onload = rs;
            xhr.send(content);
        });
    },

    async exec(dest: vDir):Promise<boolean|number>{
        // 异步获取
        const f = await fetch(APP_API + '?action=' + this.action, {
            "method": "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            "body": JSON.stringify({
                from: this.marked.map(item => item.path),
                to: dest.path
            })
        });
        if(!f.ok){
            Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content":{
                    "title": {
                        'copy': '复制',
                        'move': '剪切'
                    }[this.action] + '文件失败',
                    "content": await f.text()
                },
                "timeout": 5
            } satisfies MessageOpinion);
            return false;
        }
        return true;
    },

    mark(action:file_action,file:Array<FileOrDir>){
        this.marked = file;
        this.action = action;
        console.log(file);
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