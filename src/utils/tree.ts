import I_DESKTOP from '/icon/desktop.webp';

import type { AlertOpts, FileOrDir, MessageOpinion, vDir, vFile } from "@/env";
import { reactive } from "vue";
import { getIcon } from "./icon";
import { DEFAULT_DIR_ICON, FILE_PROXY_SERVER } from "/config";
import { clearPath, FS, splitPath } from "./fs";
import { Global, openFile } from "@/utils";

interface xFile extends File{
    fullpath?: string
}

/**
 * 实用工具：通过input上传文件
 * @param e 上传的文件，由`input`带来
 * @param to_fd 目标文件夹，自动刷新
 * @returns 上传成功的文件
 */
export async function upload(e: FileList | Array<File> | DragEvent | boolean, to_fd: vDir,
    onCreate?: (file: vFile) => any
):Promise<Array<vFile>>{

    // 通过DragEvent导入
    if(e instanceof DragEvent){
        if(!e.dataTransfer) return [];
                
        // 加载事件
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        // 遍历
        const TREE = [] as Array<File>;
        async function add_to_tree(entry: FileSystemDirectoryEntry | FileSystemEntry, parent?: FileSystemDirectoryEntry) {
            if (entry.isFile){ 
                if(!parent) parent = await new Promise((rs, rj) => entry.getParent(rs as any, rj));
                const file = await new Promise((rs, rj) => (parent as FileSystemDirectoryEntry).getFile(entry.fullPath, undefined, r => (r as FileSystemFileEntry).file(rs, rj), rj)) as xFile;
                file.fullpath = entry.fullPath;
                TREE.push(file);
            }else {
                const reader = (entry as FileSystemDirectoryEntry).createReader();

                while (true) {
                    const result: FileSystemEntry[] = await new Promise((rs, rj) => reader.readEntries(rs, rj));
                    if (result.length == 0) break;
                    else for (const item of result) {
                        let fileordir: FileSystemDirectoryEntry | FileSystemEntry;
                        if (item.isDirectory)
                            fileordir = await new Promise((rs, rj) => (entry as FileSystemDirectoryEntry).getDirectory(item.fullPath, undefined, rs, rj));
                        else
                            fileordir = await new Promise((rs, rj) => (entry as FileSystemDirectoryEntry).getFile(item.fullPath, undefined, rs, rj));
                        add_to_tree(fileordir, entry as FileSystemDirectoryEntry)
                    }
                }
            }
        }

        for (const item of e.dataTransfer.items) {
            const entry = item.webkitGetAsEntry();
            if(!entry) continue;

            // 文件：遍历FileSystem
            if(entry.isFile){
                const root = entry.filesystem.root;
                if(root) await add_to_tree(root, root);
                else for (const item of e.dataTransfer.items) {
                    const entry = item.webkitGetAsEntry();
                    if(!entry) continue;
                    await add_to_tree(entry);
                }
            }
            // 文件夹：上传这个文件夹
            else await add_to_tree(entry);
        }

        e = TREE;
    }

    // 通过选择框
    if(typeof e == 'boolean')
        e = await new Promise((rs, rj) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = !!e;
            input.onchange = function(){
                if(input.files && input.files.length > 0)
                    rs(input.files);
                else
                    rj(new Error('User aborted'));
            }
            input.click();
        }) as FileList;

    // 检验根目录
    if(!to_fd.child) try{
        await loadTree(to_fd);
    } catch {
        Global('ui.message').call({
            "title": "资源管理器",
            "content": {
                "title": "上传错误",
                "content": "前提条件错误：根文件夹无法读取"
            },
            "type": "error",
            "timeout": 10
        } satisfies MessageOpinion);
        return [];
    }

    const repeated = [] as Array<vFile>,
        repeated_files = [] as Array<File>,
        uploaded = [] as Array<vFile>;
    for (const file of e) {
        // 相对的文件
        if (file.webkitRelativePath || (file as xFile).fullpath) {
            // 获取路径分层
            var path = splitPath({
                path:
                    file.webkitRelativePath
                        ? file.webkitRelativePath
                        : (file as xFile).fullpath as string
            }),
                parent = await loadPath(to_fd.path + path.dir);
        } else {
            var path = splitPath(to_fd),
                parent = to_fd;
        }

        const matched = parent.child?.filter(item => item.name == path.fname)[0];
        if (matched && matched.type == 'file') {
            repeated.push(matched), repeated_files.push(file);
        } else if (matched && matched.type == 'dir') {
            Global('ui.message').call({
                "title": "资源管理器",
                "content": {
                    "title": "上传错误",
                    "content": "前提条件错误：目标是一个文件夹"
                },
                "type": "error",
                "timeout": 10
            } satisfies MessageOpinion);
        } else {
            // 创建一个元素
            const file_element = reactive({
                "ctime": Date.now(),
                "icon": getIcon(file.name, true),
                "name": file.name,
                "path": to_fd.path + ((file as xFile).fullpath || file.webkitRelativePath || file.name),
                "size": file.size,
                "type": 'file',
                "url": FILE_PROXY_SERVER + to_fd.path + ((file as xFile).fullpath || file.webkitRelativePath || file.name),
                "status": 1,
                parent
            } as vFile);

            // 直接开始上传
            const id = (parent.child as Array<FileOrDir>).push(file_element);
            try {
                onCreate && onCreate(file_element);
                await FS.write(
                    file_element.path,
                    file,
                    prog => file_element.upload = prog.loaded / prog.total * 100
                );
                uploaded.push(file_element);
                file_element.upload = undefined;
            } catch (e) {
                // 删除对应元素
                (parent.child as Array<FileOrDir>).splice(id - 1, 1);
                // 抛出错误
                Global('ui.message').call({
                    "title": "资源管理器",
                    "content": {
                        "title": "上传错误",
                        "content": (e as Error).message
                    },
                    "type": "error",
                    "timeout": 10
                } satisfies MessageOpinion);
            }
        }
    }

    // 完毕
    if(repeated.length > 0)
        await new Promise(rs => Global('ui.alert').call({
            "type": "prompt",
            "title": "上传提示",
            "message": `您选中的这些文件已经存在\n\n${
                repeated.map(item => ' ' + item.path).join('\n')
            }\n\n确定覆盖吗`,
            "callback": rs
        } satisfies AlertOpts));

    // 开始上传
    const error_id = [] as Array<number>,
        error = [] as Array<Error>;
    for (let i = 0 ; i < repeated.length ; i ++) try{
        onCreate && onCreate(repeated[i]);
        await FS.write(
            repeated[i].path,
            repeated_files[i],
            prog => (repeated[i] as vFile).upload = prog.loaded / prog.total * 100
        );
        (repeated[i] as vFile).upload = undefined;
        uploaded.push(repeated[i]);
    }catch(e){
        error[i] = e as Error;
        error_id.push(i);
    }

    let list = '';
    for (const id of error_id)
        list += `${repeated[id].path}: ${error[id]}\n`;
    if(list) Global('ui.message').call({
        'type': 'error',
        'title': '上传错误',
        'content': {
            'title': '这些文件上传出错',
            'content': list
        },
        'timeout': 10
    } as MessageOpinion);

    return uploaded;
}

export const TREE = reactive<vDir>({
    "type": "dir",
    "ctime": 0,
    "name": "/",
    "dispName": "此服务器",
    "url": FILE_PROXY_SERVER,
    "icon": I_DESKTOP,
    "path": "/",
    "parent": null,
    "active": new Map()
});

/**
 * 加载文件夹树
 * @param input 源文件夹
 */
export async function loadTree(input: vDir){
    try{
        // 加载父文件夹
        const _item = (await FS.__request('slist',{ path: input.path },true)).map((item:FileOrDir) => {
                item.url = FILE_PROXY_SERVER + input.path + item.name + (item.type == 'dir' ? '/' : '');
                item.path = input.path + item.name + (item.type == 'dir' ? '/' : '');
                item.parent = input;
                item.type == 'dir' && (item.active = new Map());
                return item;
            }) as Array<FileOrDir>,
            item = _item.filter(item => item.type == 'dir').sort((a, b) => a.name.localeCompare(b.name))
                .concat(_item.filter(item => item.type == 'file').sort((a, b) => a.name.localeCompare(b.name)) as any) as Array<FileOrDir>;
        item.forEach(each => each.icon = getIcon(each.name, each.type == 'file'));
        input.child = reactive(item);
        
    }catch(e){
        return Global('ui.message').call({
            "type": "error",
            "title": "文件资源管理器",
            "content":{
                "title": '无法读取文件夹',
                "content": (e instanceof Error ? e.message : new String(e).toString()) || '未知错误'
            },
            "timeout": 5
        } satisfies MessageOpinion);
    }
}

/**
 * 重新加载文件夹树
 * @param dir 文件夹路径
 */
export async function reloadTree(dir:Array<string>){
    // 剔除子目录
    dir = dir.filter(item => dir.every(item2 => item == item2 || !item.startsWith(item2)));
    for (const each of dir){
        const dir = getTree(each);
        // 获取所有打开的子文件夹
        function getOpenedFolder(tree:vDir): Array<string>{
            const cache = [];
            if(tree.child)
                for (const fd of tree.child)
                    if(fd.type == 'dir' && fd.child)
                        cache.push(fd.path, ...getOpenedFolder(fd));
                        
            return cache;
        }
        // 排除重复项
        let opened = getOpenedFolder(dir);
        opened.filter(item => opened.every(item2 => item == item2 || !item.startsWith(item2)));
        // 重新加载目录
        await loadTree(dir);
        // 依次加载子文件夹
        for(const fd of opened) try{
            await loadPath(fd, false);
        }catch{}
    }
}

/**
 * 根据给定的路径获取目录树
 * @param dir 路径
 * @returns 目录树
 */
export function getTree(dir: string):vDir{
    const paths = clearPath(dir).split('/');
    let current = TREE;
    for (const name of paths) {
        if(!name) continue;
        if(!current.child) throw new Error('Folder not found');
        const cur = (current.child as Array<FileOrDir>)
           .filter(item => item.name == name && item.type == 'dir')[0];
        if(!cur) throw new Error('Folder not found');
        current = cur as vDir;
    }
    return current;
}

/**
 * 按照路径加载文件夹并返回文件夹
 * @param path 文件路径
 * @param create 是否自动创建不存在的目录
 * @returns 目录对象
 */
export async function loadPath(path: string, create = false, ): Promise<vDir>{
    let current = TREE;
    for (const name of path.split('/')) {
        if(!name) continue;
        if(!current.child) await loadTree(current);
        const cur = (current.child as Array<FileOrDir>).filter(item => item.name == name && item.type == 'dir')[0] as vDir | undefined;
        if(!cur){
            // 存在，只是被隐藏了
            try{
                if((await FS.stat(current.path + name + '/')).type != 'dir')
                    throw 1;
                current.child?.unshift(current = {
                    'type': 'dir',
                    'ctime': Date.now(),
                    'icon': DEFAULT_DIR_ICON,
                    'name': name,
                    'path': current.path + name + '/',
                    'url': current.url + name + '/',
                    parent: current,
                    active: new Map()
                });
            // 找不到就创建
            }catch{
                if(create) await FS.mkdir(current.path + name + '/');
                else throw new Error('Folder not found');
            }
        }else current = cur;
    }
    if(!current.child) await loadTree(current);
    return current;
}

/**
 * 获取被选中的文件（夹）
 * @returns 被选中的文件（夹）
 */
export function getActiveFile(parent = TREE): Array<FileOrDir>{
    const active = [] as Array<FileOrDir>;
    function traverse(tree: vDir){
        if(tree.child)
            for (const item of tree.child)
                if(tree.active.has(item))
                    active.push(item);
                else if(item.type == 'dir')
                    traverse(item);
    }
    traverse(parent);
    return active;
}

/**
 * 取消所有选中的文件（夹）
 */
export function clearActiveFile(){
    function traverse(tree: vDir){
        tree.active.clear();
        if(tree.child)
            for (const item of tree.child)
                if(item.type == 'dir')
                    traverse(item);
    }
    traverse(TREE);
}

export async function listByTree(path: string):Promise<vDir>{
    return await loadPath(path);
}

window.addEventListener('hashchange',async function(ev){
    const hash = this.location.hash.substring(1);
    if(hash[0] != '/') return;

    try{
        var file = await FS.stat(hash);
    }catch(e){
        return Global('ui.message').call({
            'title': '文件资源管理器',
            'content': {
                'title': '文件打开失败',
                'content': (e as Error).message
            },
            'timeout': 5,
            'type': 'error'
        } satisfies MessageOpinion);
    }
    if(file.type == 'dir') await loadPath(hash);
    else{
        openFile(file);
        await loadPath(splitPath({ 'path' : hash }).dir);
    }
});

window.addEventListener('load', function(){
    this.dispatchEvent(new HashChangeEvent('hashchange'));
});