import { markRaw, reactive, ref, type Ref } from "vue";
import type { FileOrDir, ListPredirect, MessageOpinion, OpenerOption, SettingItem, SettingItemFactory, SettingObject, vDir, vFile, vSimpleFileOrDir } from "./env";
import { OPENER } from "./opener";
import Setting from "./module/setting.vue";

import I_File from '/icon/file.webp';
import I_DIR from '/icon/dir.webp';
import I_SETTING from '/app/settings.webp';
import I_DESKTOP from '/icon/desktop.webp';

export const APP_NAME = 'izCloud';
export const DEFAULT_FILE_ICON = I_File;
export const DEFAULT_DIR_ICON = I_DIR;

export const APP_API = import.meta.env.DEV ? 'http://192.168.1.1:81/@api/' : '/@api/';
export const FILE_PROXY_SERVER = import.meta.env.DEV ? 'http://192.168.1.1:81/' : '';

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
 * @param parent 文件
 */
export async function load(parent:vDir){
    // 异步获取
    try{
        var f = await fetch(APP_API + '?action=slist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: parent.path
            })
        });
    }catch(e){
        return Global('ui.message').call({
            "type": "error",
            "title": "文件资源管理器",
            "content":{
                "title": '无法读取文件夹',
                "content": '网络错误'
            },
            "timeout": 5
        } satisfies MessageOpinion);
    }
    if(!f.ok) return Global('ui.message').call({
        "type": "error",
        "title": "文件资源管理器",
        "content":{
            "title": '无法读取文件夹',
            "content": await f.text() || '未知错误'
        },
        "timeout": 5
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
        element.url = parent.url + e.name + (e.type == 'dir' ? '/' : '');
        element.path = parent.path + e.name + (e.type == 'dir' ? '/' : '');
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
    parent.child = (dirs.sort(SortHandle) as Array<fd>).concat(files.sort(SortHandle));
}

export function clearPath(path:string){
    return path.replace('\\','/')
        .replace(/\/+/,'/')
        .replace('/./','/')
        .replace(/\/[\w\W]+\/\.\.\//,'/');
}

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

export function getOpenerId(file:vFile):Promise<OpenerOption>|OpenerOption{
    const ext = splitPath(file)['ext'];
    for (let i = 0; i < OPENER.length; i++)
        if(OPENER[i].format.includes(ext.toLowerCase()))
            return OPENER[i];
    // 默认方式
    return Global('opener.chooser.choose').call(file);
}

export function clipFName(file:{name: string},maxlen = 20){
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
            },
            "timeout": 5
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

export class PermissionDeniedError extends Error{}
export class LoginError extends Error{}

export const FS = {
    marked: [] as Array<FileOrDir>,
    action: 'copy' as file_action,

    async __request(method: string,body: Object, json = false){
        const xhr = await fetch(APP_API + '?action=' + method,{
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            },
        });
        if(xhr.status == 403) throw new PermissionDeniedError();
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

    async listall(path:string):Promise<Array<FileOrDir>>{
        return (await this.__request('slist',{ path },true)).map((item:FileOrDir) => {
            item.url = FILE_PROXY_SERVER + path + item.name + (item.type == 'dir' ? '/' : '');
            item.path = path + item.name + (item.type == 'dir' ? '/' : '');
            return item;
        });
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
        return this.__request('copy', {
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

export const TREE = reactive<vDir>({
    "type": "dir",
    "ctime": 0,
    "name": "/",
    "dispName": "此服务器",
    "url": FILE_PROXY_SERVER,
    "icon": I_DESKTOP,
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

var CONFIG: undefined | Record<string,Array<SettingItem>>,
    cached: undefined | Record<string,Record<string,any>>;

export function regConfig(namespace: string, config:Array<SettingItemFactory>){
    if(!cached) try{
        cached = JSON.parse(localStorage.getItem('vlist5') || '{}') as Record<string,Record<string,any>>;
    }catch{
        cached = {} as Record<string,Record<string,any>>;
    }
    if(!CONFIG) CONFIG = {};
    const cache = (cached[namespace] || {}) as Record<string,string>;
    // 填充value
    function fill(config:Array<SettingItemFactory>){
        for (const item of config)
            if(typeof item == 'object')
                if(item.type == 'object')
                    fill(item.child)
                else
                    (item as any).value = ref(cache[item.key] || item.default);
    }
    fill(config);
    // 加载
    CONFIG[namespace] = config as any;
}

export function getConfig(namespace: string){
    // 创建新配置
    if(!CONFIG) return CONFIG = {};
    if(namespace in CONFIG){
        const temp = {} as Record<string,Ref<any>>;
        
        function proc(obj:Array<SettingItem>){
            for (const item of obj)
                if(typeof item == 'object')
                    if(item.type == 'object')
                        proc(item.child);
                    else
                        temp[item.key] = item.value;
        }

        proc(CONFIG[namespace]);

        return temp;
    }else throw new Error('Unknown namespace');
}

export function openSetting(){
    if(!CONFIG) return CONFIG = {};
    const item:Array<SettingItem> = [];
    for (const key in CONFIG) {
        item.push({
            "type": "object",
            "name": key,
            "child": CONFIG[key],
            "key": key
        })
    }
    Global('ui.window.add').call({
        "content": Setting,
        "icon": I_SETTING,
        "name": "设置",
        "option": markRaw({
            "name": "设置",
            "child": item,
            "type": "object",
            "key": ""
        } satisfies SettingObject)
    });
}

// 保存状态
window.onbeforeunload = function(){
    let temp = {} as Record<string,any>;
    const real = {} as Record<string,any>;
    
    function proc(obj:Array<SettingItem>){
        for (const item of obj)
            if(typeof item == 'object')
                if(item.type == 'object')
                    proc(item.child);
                else
                    temp[item.key] = item.value.value;
    }

    for (const key in CONFIG){
        temp = {};
        proc(CONFIG[key]);
        real[key] = temp;
    }

    localStorage.setItem('vlist5',JSON.stringify(real));
}