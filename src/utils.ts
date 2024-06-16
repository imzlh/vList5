import { reactive } from "vue";
import type { FileOrDir, MessageOpinion, OpenerOption, TabWindow, vDir, vFile } from "./data";
import { OPENER } from "./opener";

export const APP_API = 'http://localhost/@fs_api/';
export const APP_NAME = 'ShineCloud';
export const DEFAULT_FILE_ICON = '/icon/file.webp'
export const DEFAULT_DIR_ICON = '/icon/dir.webp';
export const FILE_PROXY_SERVER = 'http://localhost/';

const pool = {};

export function Global(get:string){

    const path = get.split('.');
    let env:Record<string,any> = pool;

    for (let i = 0; i < path.length-1; i++) {
        if(!(path[i] in env)) env[path[i]] = {};
        env = env[path[i]];
    }

    return new ReactiveData(env,path[path.length -1],get,
        path[0] == 'system' && env[path[path.length -1]]);
}
(globalThis as any)._G = Global;

type Types = 'object'|'null'|'undefined'|'number'|'bigint'|'string'|'symbol'|'function'|'boolean';

class ReactiveData{
    private parent:Record<string,any>;
    private key:string;
    private readonly:boolean;
    readonly fullname:string;
    readonly type:Types;

    constructor(pa:any,ke:string,fn:string,ro:boolean){
        this.parent = pa,this.key = ke,this.readonly = ro,this.fullname = fn;
        const data = pa[ke];
        if(data == null) this.type = 'null';
        else this.type = typeof data;
    }

    get data(){
        console.debug('Reading trace(',this.fullname,').');
        return this.parent[this.key];
    }

    set data(data){
        if(this.readonly) console.warn('%c Warning %cReadonly data:'+this.fullname,
            'color:red;','color:#645757;');
        this.parent[this.key] = data;
    }

    call(...args:Array<any>):Promise<any>{
        return new Promise(async (rs,rj) => {
            if(this.type != 'function'){
                console.trace('%c WARNING %c['+this.fullname+'] is not a function.',
                    'color: #c4c41f;','color:#645757;');
                rs(false);
            }
            try{
                rs(await this.data(...args));
            }catch(e){
                rj(e);
            }
        });
    }

    expect(type:Types){
        return type == this.type ? this.data : null;
    }
}

/**
 * 加载文件夹，用于列表
 * @param file 文件
 */
export async function load(file:vDir){
    // 异步获取
    try{
        var f = await fetch(APP_API + '?mode=list&path=' + encodeURIComponent(file.path));
    }catch(e){
        return Global('ui.message').call({
            "type": "error",
            "title": "文件资源管理器",
            "content":{
                "title": '无法读取文件夹',
                "content": '网络错误'
            }
        } satisfies MessageOpinion);
    }
    if(!f.ok) return Global('ui.message').call({
        "type": "error",
        "title": "文件资源管理器",
        "content":{
            "title": '无法读取文件夹',
            "content": await f.text() || '未知错误'
        }
    } satisfies MessageOpinion);
    // 排序
    const data:Array<vFile|vDir> = await f.json();
    if(typeof data != 'object')
        throw new Error('invaild response');
    type f = vFile & {weights:RegExpMatchArray};
    type d = vDir & {weights:RegExpMatchArray};
    type fd = f | d;
    const files:Array<f> = [],dirs:Array<d> = [],
        regexp = /[^\d]+|\d+/g;
    data.forEach((element) => {
        const e = element as fd;
        element.url = file.url + e.name + (e.type == 'dir' ? '/' : '');
        element.path = file.path + e.name + (e.type == 'dir' ? '/' : '');
        if(regexp.test(e.name))
            e.weights = e.name.match(regexp) as RegExpMatchArray;
        if(e.type == 'file')
            files.push(e);
        else{
            e.icon = DEFAULT_DIR_ICON;
            dirs.unshift(e);
        }
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
    file.child = (dirs.sort(SortHandle) as Array<fd>).concat(files.sort(SortHandle));
}

export function clearPath(path:string){
    return path.replace('\\','/')
        .replace(/\/+/,'/')
        .replace('/./','/')
        .replace(/\/[\w\W]+\/\.\.\//,'/');
}

export function splitPath(fname:FileOrDir){
    const path = clearPath(fname.path),
        slash = path.lastIndexOf('/'),
        dot = path.lastIndexOf('.');
    return {
        dir   : path.substring(0,slash +1) || '/',
        name  : path.substring(slash + 1, dot),
        ext   : path.substring(dot + 1),
        fname : path.substring(slash + 1)
    }
}

export function getOpenerId(file:vFile):Promise<OpenerOption>|OpenerOption{
    const ext = splitPath(file)['ext'];
    for (let i = 0; i < OPENER.length; i++)
        if(OPENER[i].format.includes(ext.toLowerCase()))
            return OPENER[i];
    // 默认方式
    return Global('opener.chooser.choose').call(file);
}

export function clipFName(file:vFile,maxlen = 20){
    if(file.name.length > maxlen){
        return file.name.substring(0,maxlen - 3) + '..'
    }else{
        return file.name;
    }
}

export async function openFile(file:FileOrDir){
    if(file.type == 'dir') return;
    const opener = await getOpenerId(file);
    try{
        await opener.open(file);
    }catch(e){
        Global('ui.message').call({
            "type": "error",
            "title": "打开文件",
            "content":{
                "title": "无法打开" + clipFName(file,15),
                "content": e instanceof Error ? e.message : e?.toString()
            }
        } satisfies MessageOpinion);
        console.log(e);
    }
}

export function size2str(size: number){
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    for (let i = 0; i < sizes.length; i++)
        if (size / 1024 ** i < 800)
            return (size / 1024 ** i).toFixed(1) + sizes[i];
}

type file_action = 'move'|'copy';

export const FS = {
    marked: [] as Array<FileOrDir>,
    action: 'copy' as file_action,

    async __request(query:string):Promise<any>{
        // 异步获取
        const f = await fetch(APP_API + '?' + query);
        if(!f.ok)
            throw new Error('Request failed: Server returns with ' + f.status);
        const data:Array<vFile|vDir> = await f.json();
        if(typeof data != 'object')
            throw new Error('invaild server response.Not JSON?');
        return data;
    },

    async __request_int(query:string):Promise<number>{
        // 异步获取
        const f = await fetch(APP_API + '?' + query);
        if(!f.ok)
            throw new Error('Request failed: Server returns with ' + f.status);
        return parseInt(await f.text());
    },

    async list(dir:string):Promise<Array<FileOrDir>>{
        return (await this.__request('mode=list&path=' + encodeURIComponent(dir))).map((item:FileOrDir) => {
            item.url = FILE_PROXY_SERVER + dir + item.name + (item.type == 'dir' ? '/' : '');
            item.path = dir + item.name + (item.type == 'dir' ? '/' : '');
            return item;
        });
    },

    stat(file:string):Promise<FileOrDir>{
        return this.__request('mode=stat&path=' + encodeURIComponent(file));
    },

    delete(file:string,action:file_action){
        return this.__request_int('mode=delete&path=' + encodeURIComponent(file));
    },

    mkdir(path: string){
        return this.__request_int('mode=mkdir&path=' + encodeURIComponent(path));
    },

    touch(path: string){
        return this.__request_int('mode=touch&path=' + encodeURIComponent(path));
    },

    copy(from:string,to:string){
        return this.__request_int('mode=copy&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
    },

    move(from:string,to:string){
        return this.__request_int('mode=move&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
    },

    async deleteAll(fds:Array<FileOrDir>):Promise<boolean>{
        // 异步获取
        const f = await fetch(APP_API + '?mode=post_delete', {
            "method": "POST",
            "body": JSON.stringify(fds.map(each => each.path)),
            "headers": {
                "Content-Type": "application/json"
            }
        });
        if(!f.ok){
            Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content":{
                    "title": '删除文件失败',
                    "content": await f.text()
                }
            } satisfies MessageOpinion);
            return false;
        }
        return true;
    },

    async exec(dest: vDir):Promise<boolean|number>{
        // 异步获取
        const f = await fetch(APP_API + '?mode=post_' + this.action + '&to=' + encodeURIComponent(dest.path), {
            "method": "POST",
            "body": JSON.stringify(this.marked.map(item => item.path)),
            "headers": {
                "Content-Type": "application/json"
            }
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
                }
            } satisfies MessageOpinion);
            return false;
        }
        return parseInt(await f.text());
    },

    mark(action:file_action,file:Array<FileOrDir>){
        this.marked = file;
        this.action = action;
        console.log(file);
    }
}

export const TREE = reactive<vDir>({
    "type": "dir",
    "ctime": 0,
    "name": "/",
    "dispName": "此服务器",
    "url": FILE_PROXY_SERVER,
    "path": "/"
});

export function reloadTree(dir:Array<string>){
    function subTree(tree:vDir){
        // 当前目录需要刷新
        if(dir.includes(tree.path ))
            load(tree);

        // 遍历子元素
        if(tree.child)
            for (const fd of tree.child)
                if(fd.type == 'dir') subTree(fd);
    }
    subTree(TREE);
}