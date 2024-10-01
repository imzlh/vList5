/**
 * 插件共享sdk
 */

import { alert, contextMenu, createWindow, destoryWindow, FILE_PROXY_SERVER, FS, message, openFile, registerCommand, selectOpener, setCurrentWindow, showFilePicker } from '@/utils';
import type { AlertOpts, Command, CtxDispOpts, MessageOpinion, OpenerOption, TabWindow, vApplication, vFile } from '../env';
import { getOpenerId, OPENER, regSelf } from '@/opener';
import { remove } from '@/module/message.vue';
import { shallowReactive } from 'vue';
import { _eval } from './eval';
import * as vue from 'vue';

const pool = {
    'ui.alert': (opt: AlertOpts) => alert(opt),
    'ui.ctxmenu': (opt: CtxDispOpts) => contextMenu(opt),
    'ui.message': (opt: MessageOpinion) => message(opt),
    'ui.removeMessage': (id: number) => remove(id),
    'ui.panel': (...opt: Array<Command>) => registerCommand(...opt),

    'window.create': (opt: TabWindow) => createWindow(opt),
    'window.remove': (opt: string) => destoryWindow(opt),
    'window.home': () => setCurrentWindow(''),
    'window.set': (opt: string) => setCurrentWindow(opt),

    'opener.select': (opt: vFile) => selectOpener(opt),
    'opener.get': (opt: vFile) => getOpenerId(opt),
    'opener.register': (opt: OpenerOption) => OPENER.push(opt) -1,
    'opener.session': (self: string, callback: (file: vFile) => void) => regSelf(self, callback),
    'opener.open': (file: vFile) => openFile(file),

    'fs.pick': (opt: { src: string, type: 'file'|'dir' }) => showFilePicker(opt.src, opt.type as any),
    'fs.copy': FS.copy,
    'fs.move': FS.move,
    'fs.delete': FS.del,
    'fs.rename': FS.rename,
    'fs.touch': FS.touch,
    'fs.stat': FS.stat,
    'fs.scandir': FS.list,
    'fs.upload': FS.upload,
    'fs.write': FS.write,

    'tree.load': FS.loadTree,
    'tree.get': FS.stat,
    'tree.loadPath': FS.loadPath,
    'tree.loadPaths': FS.loadPaths,
} as any;

/**
 * Global: 暴露给浏览器全局，组件间同步数据
 * 
 * @param get 项目名称
 * @returns 响应式数据
 */
(globalThis as any)._G =  function(get: string){
    if(!(get in pool)) throw new TypeError(`"${get}" is not exported`);
    return pool[get];
};


// 数据共享
const plugin_data = shallowReactive<vApplication[]>(
    JSON.parse(localStorage.getItem('vlist_plugin') || '[]')
);
window.addEventListener('beforeunload', () => localStorage.setItem('vlist_plugin', JSON.stringify(plugin_data)));
window.addEventListener('load', () => plugin_data.forEach(item => importPlugin(item)))

// @ts-ignore 全局变量clear_plugin
globalThis.clear_plugin = () => plugin_data.splice(0, plugin_data.length);

if(!('process' in globalThis)){
    // @ts-ignore 全局变量process
    globalThis.process = {
        env: {
            NODE_ENV: 'development'
        }
    }
}

// @ts-ignore 全局变量Vue
globalThis.Vue = vue;

export async function installPlugin(path: string){
    // 读取插件信息
    try{
        var data: vApplication = await (await fetch(path + '/app.json')).json();
        if(!data.name || !data.entry) throw new TypeError();
    }catch(e){
        console.error(e);
        throw new Error('Plugin app.json not found or contains error');
    }

    // 检查插件是否已安装
    if(-1 !== plugin_data.findIndex(item => item.package === data.package))
        return console.info('Plugin already exists');
    data.home = path;

    // 导入插件
    await importPlugin(data);
    plugin_data.push(data);
}

export async function importPlugin(data: vApplication){
    const baseURL = new URL(data.home, new URL(FILE_PROXY_SERVER, location.href));
    const resolve = (path: string) => new URL(path, baseURL).href;

    try{
        await _eval(resolve(data.entry));
    }catch(e){
        console.error(e);
        throw new Error('cannot import plugin entry');
    }

    if(data.preload)
        for(const item of data.preload){
            switch(item.type){
                case 'style':
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = resolve(item.path);
                    link.onerror = () => console.error('Failed to load style', item.path);
                    document.head.appendChild(link);
                break;

                case 'script':
                    const script = document.createElement('script');
                    script.src = resolve(item.path);
                    script.type = 'text/javascript';
                    script.onerror = () => console.error('Failed to load script', item.path);
                    document.head.appendChild(script);
                break;

                case 'module':
                    import(resolve(item.path))
                        .catch(e => console.error('Failed to load module', item.path, '\n', e));
                break;

                case 'preload':
                    const preload = document.createElement('link');
                    preload.rel = 'preload';
                    preload.as = 'fetch';
                    preload.href = resolve(item.path);
                    preload.onerror = () => console.error('Failed to load preload', item.path);
                    document.head.appendChild(preload);
                break;
            }
        }
}