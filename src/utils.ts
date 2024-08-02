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

export * from '../config';
export * from './utils/fs';
export * from './utils/openfile';
export * from './utils/tree';
export * from './utils/config';
export { marked as list_marked, markmap as list_markmap, acceptDrag } from './module/tree.vue';
export { FACTION } from './action/action';
export * from './App.vue';
export * from './utils/icon';

import "./action/tree";
