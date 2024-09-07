import type { AlertOpts, Command, CtxDispOpts, MessageOpinion, OpenerOption, TabWindow, vDir, vFile } from './env';
const pool = {};

/**
 * vList内建全部数据索引
 */
interface GlobalDataTable{
    'ui.alert': (opt: AlertOpts) => void,
    'ui.window.add': (opt: TabWindow) => number,
    'ui.window.del': (opt: number) => void,
    'ui.message': (opt: MessageOpinion) => number,
    'ui.ctxmenu': (opt: CtxDispOpts) => void,
    'opener.choose': (opt: vFile) => Promise<OpenerOption>,
    'ui.choose': (opt: string) => Promise<Array<vFile>>,
    'ui.command': (...opt: Array<Command>) => () => void
}

/**
 * Global function to get reactive data.
 * Global: 获取响应式数据，组件间同步数据
 * 
 * @param get 
 * @returns 
 */
export function Global<I extends (keyof GlobalDataTable) | string>(get: I)
    : ReactiveData<I extends keyof GlobalDataTable ? GlobalDataTable[I] : any>
{
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

class ReactiveData<T>{
    private parent:Record<string,any>;
    private key:string;
    private readonly:boolean;
    readonly fullname:string;
    readonly type:Types;

    /**
     * @internal
     */
    constructor(pa:any,ke:string,fn:string,ro:boolean){
        this.parent = pa,this.key = ke,this.readonly = ro,this.fullname = fn;
        const data = pa[ke];
        if(data == null) this.type = 'null';
        else this.type = typeof data;
    }

    get data(): T{
        if(import.meta.env.DEV) console.debug('Reading trace(',this.fullname,').');
        return this.parent[this.key];
    }

    set data(data: T){
        if(this.readonly) console.warn('%c Warning %cReadonly data:'+this.fullname,
            'color:red;','color:#645757;');
        this.parent[this.key] = data;
    }

    /**
     * 安全调用函数，返回Promise
     * 当不是函数时返回一个空Promise
     * 调用函数时，如果返回值是Promise，则等待Promise完成后返回结果，否则直接返回结果
     * @param args 参数
     * @returns Promise
     */
    call(...args: T extends (...args: any) => any ? Parameters<T> : Array<any>)
        :T extends (...args: any) => any 
            ? ReturnType<T> extends Promise<any> ? ReturnType<T> : Promise<ReturnType<T>>
            : Promise<any>
    {
        return new Promise(async (rs,rj) => {
            if(this.type != 'function'){
                console.trace('%c WARNING %c['+this.fullname+'] is not a function.',
                    'color: #c4c41f;','color:#645757;');
                rs(null);
            }
            try{
                rs(await (this.data as Function)(...args));
            }catch(e){
                rj(e);
            }
        }) as any;
    }

    expect<P extends Types>(type: P): T extends P ? T : null {
        return type == this.type ? this.data : null as any;
    }
}

export * from '../config';
export * from './utils/fs';
export * from './utils/openfile';
export * from './utils/config';
export { acceptDrag } from './module/tree.vue';
export { FACTION } from './action/action';
export * from './App.vue';
export * from './utils/icon';

import "./action/tree";