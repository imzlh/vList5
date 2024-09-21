/**
 * 插件共享sdk
 */

import { alert, contextMenu, createWindow, destoryWindow, FS, message, openFile, registerCommand, selectOpener, setCurrentWindow, showFilePicker } from '@/utils';
import type { AlertOpts, Command, CtxDispOpts, MessageOpinion, OpenerOption, TabWindow, vFile } from '../env';
import { getOpenerId, OPENER, regSelf } from '@/opener';

const pool = {
    'ui.alert': (opt: AlertOpts) => alert(opt),
    'ui.ctxmenu': (opt: CtxDispOpts) => contextMenu(opt),
    'ui.message': (opt: MessageOpinion) => message(opt),
    'ui.panel': (...opt: Array<Command>) => registerCommand(...opt),

    'window.create': (opt: TabWindow) => createWindow(opt),
    'window.remove': (opt: string) => destoryWindow(opt),
    'window.home': () => setCurrentWindow(''),
    'window.set': (opt: string) => setCurrentWindow(opt),

    'opener.select': (opt: vFile) => selectOpener(opt),
    'opener.get': (opt: vFile) => getOpenerId(opt),
    'opener.register': (opt: OpenerOption) => OPENER.push(opt),
    'opener.session': (self: string, callback: (file: vFile) => void) => () => regSelf(self, callback),
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
