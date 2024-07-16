import I_DESKTOP from '/icon/desktop.webp';

import type { AlertOpts, FileOrDir, MessageOpinion, vDir, vFile } from "@/env";
import { reactive } from "vue";
import { getIcon } from "./icon";
import { DEFAULT_DIR_ICON, FILE_PROXY_SERVER } from "/config";
import { FS, splitPath } from "./fs";
import { Global } from "@/utils";

export interface iFile extends vFile{
    rename?: boolean,
    status?: number,
    show?: boolean
}

export interface iDir extends vDir{
    rename?: boolean,
    show?: boolean,
    locked?: boolean
    status?: number
}

export type iMixed = iFile | iDir; 

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
    onCreate?: (file: iFile) => any
):Promise<Array<vFile>>{

    // 通过DragEvent导入
    if(e instanceof DragEvent){
        if(!e.dataTransfer) return [];
                
        // 加载事件
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        // 遍历
        const TREE = [] as Array<File>;
        async function add_to_tree(entry: FileSystemDirectoryEntry | FileSystemEntry, parent: FileSystemDirectoryEntry) {
            if (entry.isFile){
                const file = await new Promise((rs, rj) => parent.getFile(entry.fullPath, undefined, r => (r as FileSystemFileEntry).file(rs, rj), rj)) as xFile;
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

        // 遍历为{文件：文件对象}
        for (const item of e.dataTransfer.items) {
            const entry = item.webkitGetAsEntry(),
                file = item.getAsFile();
            if(!entry && file && file.size > 4096) TREE.push(file);
            else if(entry) await add_to_tree(entry, await new Promise((rs, rj) => entry.getParent(r => rs(r as FileSystemDirectoryEntry), rj)));
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
        return Global('ui.message').call({
            "title": "资源管理器",
            "content": {
                "title": "上传错误",
                "content": "前提条件错误：根文件夹无法读取"
            },
            "type": "error",
            "timeout": 10
        } satisfies MessageOpinion);
    }

    const repeated = [] as Array<vFile>,
        repeated_files = [] as Array<File>,
        uploaded = [] as Array<iFile>;
    for (const file of e) await (async function(){
        // 相对目录
        let relative = to_fd as vDir;
        
        // 相对的文件
        if(file.webkitRelativePath || (file as xFile).fullpath){
            // 获取路径分层
            const path = file.webkitRelativePath 
                ? splitPath({ path: (file as xFile).fullpath as string }).dir.split('/')
                : file.webkitRelativePath.split('/');

            for (let ii = 0 ; ii < path.length ; ii ++) {

                // 针对webkitRelativePath去除空层
                if(path[ii] == '') path[ii] = file.name;

                // 加载列表
                if(!relative.child) try{
                    await loadTree(relative);
                }catch{
                    try{
                        await FS.mkdir(relative.path + path.slice(ii).join('/') + '/');
                        break;
                    }catch(e){
                        return Global('ui.message').call({
                            "title": "资源管理器",
                            "content": {
                                "title": "上传错误",
                                "content": "前提条件错误：创建文件夹失败"
                            },
                            "type": "error",
                            "timeout": 10
                        } satisfies MessageOpinion);
                    }
                }

                // 寻找文件夹是否存在
                for (let i = 0; i < (relative.child as Array<iMixed>).length; i++){
                    const child = (relative.child as Array<iMixed>)[i];
                    // 文件夹存在
                    if(child.name == path[i])
                        if(child.type == 'dir')
                            relative = child;

                    // 文件存在
                    if(ii < path.length && child.name == file.name)
                        if(child.type == 'file')
                            return repeated.push(child),repeated_files.push(file);
                        else
                            return Global('ui.message').call({
                                "title": "资源管理器",
                                "content": {
                                    "title": "上传错误",
                                    "content": "前提条件错误：目标是一个文件夹"
                                },
                                "type": "error",
                                "timeout": 10
                            } satisfies MessageOpinion);
                }
            }
        }

        // 创建一个元素
        const file_element = reactive({
            "ctime": Date.now(),
            "icon": getIcon(file.name, true),
            "name": file.name,
            "path": to_fd.path + file.name,
            "size": file.size,
            "type": 'file',
            "url": FILE_PROXY_SERVER + to_fd.path + file.name,
            "status": 1
        } as iFile);
        onCreate && onCreate(file_element);

        // 直接开始上传
        const id = (relative.child as Array<FileOrDir>).push(file_element);
        try{
            await FS.write(
                to_fd.path + ((file as xFile).fullpath || file.webkitRelativePath + '/' + file.name),
                file,
                prog => file_element.status = prog.loaded / prog.total * 100
            );
            uploaded.push(file_element);
            file_element.status = undefined;
        }catch(e){
            // 删除对应元素
            (relative.child as Array<FileOrDir>).splice(id -1, 1);
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
    })();

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
            prog => (repeated[i] as iFile).status = prog.loaded / prog.total * 100
        );
        (repeated[i] as iFile).status = undefined;
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
    "path": "/"
});

export async function loadTree(input: vDir){
    try{
        const item = await FS.listall(input.path);
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

export function reloadTree(dir:Array<string>){
    function subTree(tree:vDir){
        // 当前目录需要刷新
        if(dir.includes(tree.path ))
            loadTree(tree);

        // 遍历子元素
        if(tree.child)
            for (const fd of tree.child)
                if(fd.type == 'dir') subTree(fd);
    }
    subTree(TREE);
}

export function getTree(dir: string):vDir | undefined{
    function subTree(tree:vDir){
        // 是当前目录
        if(dir == tree.path)
            return tree;

        // 遍历子元素
        if(tree.child)
            for (const fd of tree.child)
                if(fd.type == 'dir') return subTree(fd);
    }
    return subTree(TREE);
}

export async function loadPath(path: string){
    let current = TREE;
    for (const name of path.split('/')) {
        if(!name) continue;
        if(!current.child) await loadTree(current);
        const cur = (current.child as Array<FileOrDir>).filter(item => item.name == name && item.type == 'dir')[0] as vDir | undefined;
        // 找不到就创建
        if(!cur) current.child?.unshift(current = {
            'type': 'dir',
            'ctime': Date.now(),
            'icon': DEFAULT_DIR_ICON,
            'name': name,
            'path': current.path + name + '/',
            'url': current.url + name + '/'
        });
        else current = cur;
    }
    if(!current.child) await loadTree(current);
    return current;
}

window.addEventListener('hashchange',async function(ev){
    const hash = this.location.hash.substring(1);
    if(hash[0] != '/') return;

    const file = await FS.stat(hash);
    if(file.type == 'dir') await loadPath(hash);
    else await loadPath(splitPath({ 'path' : hash }).dir);

});

window.addEventListener('load', function(){
    this.dispatchEvent(new HashChangeEvent('hashchange'));
})