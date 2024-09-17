import type { vDir } from "@/env";
import I_DESKTOP from '/icon/desktop.webp';
import { reactive, ref, watch } from "vue";
import type { AlertOpts, FileOrDir, ListPredirect, vFile, vSimpleFileOrDir } from "@/env";
import { APP_API, DEFAULT_DIR_ICON, FILE_PROXY_SERVER, Global, getConfig } from "@/utils";
import { type Ref } from "vue";
import SHA from "jssha";
import { getIcon } from "./icon";

export class PermissionDeniedError extends Error{}
export class LoginError extends Error{}

interface xFile extends File{
    fullpath?: string
}

/**
 * 文件树结构
 */
export const TREE = reactive<vDir>({
    "type": "dir",
    "ctime": 0,
    "name": "/",
    "dispName": "此服务器",
    "url": FILE_PROXY_SERVER,
    "icon": I_DESKTOP,
    "path": "/",
    // 为了兼容性设置的虚拟父节点
    "parent": {
        "name": "__ROOT__",
        "path": "{vio:0}",
        "url": "",
        "type": "dir",
        "ctime": -1,
        "icon": "",
        "parent": null,
        "active": new Map()
    },
    "active": new Map()
});
(TREE.parent as vDir).child = [TREE];

const b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const b64chs = Array.prototype.slice.call(b64ch);

/**
 * base64编码
 * @param buf 输入
 * @returns 输出
 */
function base64_encode(buf: ArrayBuffer){
    const bin = new Uint8Array(buf);
    let u32, c0, c1, c2, asc = '';
    const pad = bin.length % 3;
    for (let i = 0; i < bin.length;) {
        c0 = bin[i++],
        c1 = bin[i++],
        c2 = bin[i++];

        u32 = (c0 << 16) | (c1 << 8) | c2;
        asc += b64chs[u32 >> 18 & 63]
            + b64chs[u32 >> 12 & 63]
            + b64chs[u32 >> 6 & 63]
            + b64chs[u32 & 63];
    }
    return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
}

/**
 * 为双方安全传输编码的函数
 * @param ctxlen 消息长度
 * @param pass 密码
 * @returns 加密后的信息
 */
async function encrypto(ctxlen: number, pass: string, content: string):Promise<string>{
    // 打乱pass，验证消息有效性
    const pass_code = new TextEncoder().encode(pass);
    if(ctxlen < 1000) ctxlen *= ctxlen;
    for (let i = 0; i < pass_code.length; i++) 
        pass_code[i] &= ctxlen >> (i % 4);

    // hmac+sha1加密
    if(crypto.subtle){
        const hmac = await crypto.subtle.importKey(
            'raw', 
            pass_code,
            {
                "name": "HMAC",
                "hash": "SHA-1"
            },
            false,
            ['sign']
        );
        var value = await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(content));
    }else{
        const sha = new SHA('SHA-1', 'TEXT', {
            'hmacKey': {
                'format': 'UINT8ARRAY',
                'value': pass_code
            }
        });
        sha.update(content);
        var value = sha.getHMAC('ARRAYBUFFER');
    }

    return base64_encode(value);
}

/**
 * 响应式带缓存的文件IO
 */
export namespace FS{
    /**
     * @private
     */
    let auth_key: null | Ref<string> = null;

    /**
     * 请求后端
     * @private
     * @param method 类型
     * @param body 参数
     * @param json 是否以json返回
     * @returns JSON
     */
    export async function __request(method: string,body: Object, json = false){
        if(!auth_key)
            auth_key = getConfig('基础').authkey;
        const content = JSON.stringify(body),
            xhr = await fetch(APP_API + '?action=' + method,{
            method: 'POST',
            body: content,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth_key?.value
                    ? await encrypto(content.length, auth_key.value, content)
                    : ''
            },
        });
        if(xhr.status == 403) throw new PermissionDeniedError(await xhr.text());
        else if(xhr.status == 400) throw new SyntaxError(await xhr.text());
        else if(xhr.status == 401) try{
            await __auth();
            await __request(method, body, json);
        }catch{
            throw new LoginError();
        }else if(Math.floor(xhr.status / 100) != 2) throw new Error(await xhr.text());
           
        try{
            if(json) return await xhr.json();
            else return await xhr.text();
        }catch{
            throw new TypeError('Server Error');
        }
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
                    const file = await new Promise<xFile>((rs, rj) => (entry as FileSystemFileEntry).file(rs, rj));
                    if(!file) return;
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

            if(e.dataTransfer.items.length == 1){
                await add_to_tree(e.dataTransfer.items[0].webkitGetAsEntry()!);
            }else{
                const entry = e.dataTransfer.items[0].webkitGetAsEntry()!;
                const root = entry.filesystem.root;
                if(root) await add_to_tree(root, root);
                else for (const item of e.dataTransfer.items) {
                    const entry = item.webkitGetAsEntry();
                    if(!entry) continue;
                    await add_to_tree(entry);
                }
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
            });
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
                });
                try{
                    var parent = await stat(path.dir) as vDir;
                }catch{
                    await mkdir(path.dir);
                    parent = await stat(path.dir) as vDir;
                }
            } else {
                var path = splitPath(to_fd),
                    parent = to_fd;
            }

            const matched = parent.child?.find(item => item.name == path.fname);
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
                });
            } else {
                // 直接开始上传
                try {
                    const ref_ele = ref();
                    onCreate && watch(ref_ele, ele => onCreate(ele));
                    await FS.write(
                        parent.path + file.name,
                        file,
                        undefined,
                        ref_ele
                    );
                    ref_ele.value
                } catch (e) {
                    // 抛出错误
                    Global('ui.message').call({
                        "title": "资源管理器",
                        "content": {
                            "title": "上传错误",
                            "content": (e as Error).message
                        },
                        "type": "error",
                        "timeout": 10
                    });
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
            const ref_ele = ref();
            onCreate && watch(ref_ele, ele => onCreate(ele));
            await FS.write(
                repeated[i].path,
                repeated_files[i],
                undefined,
                ref_ele
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
        });

        return uploaded;
    }

    /**
     * 列举一个文件夹
     * @deprecated 请使用`FS.list()`
     * @param dir 文件夹路径
     * @returns 列表
     */
    export async function __list(path:string, predirect: ListPredirect | {} = {}){
        if(/^vfs:\/\/([a-z0-9-]+)\/(.+)$/.test(path))
            throw new TypeError('vfs is not accessable');
        (predirect as any).path = path[path.length -1] == '/' ? path : path + '/';
        const item = (await __request('list',predirect,true) as Array<string>)
            .map((item) => ({
                name: item,
                path: path + item,
                url: FILE_PROXY_SERVER + path + item
            } satisfies vSimpleFileOrDir)) as Array<vSimpleFileOrDir>;
        return item.sort((a, b) => a.name.localeCompare(b.name));
    }

    export async function loadTree(input: vDir, quiet = false){
        try{
            // 加载父文件夹
            input.lock = true;
            const _item = (await __request('slist',{ path: input.path },true)).map((item:FileOrDir) => {
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
            quiet && Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content":{
                    "title": '无法读取文件夹',
                    "content": (e instanceof Error ? e.message : new String(e).toString()) || '未知错误'
                },
                "timeout": 5
            });
        }
        input.lock = false;
    }

    export function __findTree(dir: string):vDir{
        const paths = clearPath(dir).split('/');
        let current = TREE;
        for (const name of paths) {
            if(!name) continue;
            if(!current.child) throw new Error('Folder not found');
            const cur = (current.child as Array<FileOrDir>)
               .find(item => item.name == name && item.type == 'dir');
            if(!cur) throw new Error('Folder not found');
            current = cur as vDir;
        }
        return current;
    }

    export async function  loadPaths(dir:Array<string>) {
        dir = dir.filter(item => dir.every(item2 => item == item2 || !item.startsWith(item2)));
        for (const each of dir)
            await loadPath(each);
    }

    export async function loadPath(dirpath: string, reload = false, create_on_miss = false): Promise<vDir>{
        try{
            await stat(dirpath);
        }catch{
            if(create_on_miss) await mkdir(dirpath);
            else throw new Error('Folder not found');
            
            const dir = __findTree(dirpath);
            await loadTree(dir);
            return dir;
        }

        const dir = await stat(dirpath) as vDir;
        if(!reload) return dir;
        // 获取所有打开的子文件夹
        function getOpenedFolder(tree: vDir): Array<string> {
            const cache = [];
            if (tree.child)
                for (const fd of tree.child)
                    if (fd.type == 'dir' && fd.child)
                        cache.push(fd.path, ...getOpenedFolder(fd));

            return cache;
        }
        // 排除重复项
        let opened = getOpenedFolder(dir);
        opened.filter(item => opened.every(item2 => item == item2 || !item.startsWith(item2)));
        // 重新加载目录
        await loadTree(dir);
        // 依次加载子文件夹
        for (const fd of opened) try {
            await loadPath(fd);
        } catch { }
        return dir;
    }

    /**
     * （带缓存功能，响应式）
     * 列举一个文件夹，并且返回子项目详细信息
     * @param path 路径
     * @param create 是否创建不存在的目录
     * @returns 子项目数组
     */
    export async function list(path:string, create = false):Promise<Array<FileOrDir>>{
        let current = TREE;
        for (const name of path.split('/')) {
            if(!name) continue;
            if(!current.child) await loadTree(current, true);
            const cur = (current.child as Array<FileOrDir>).filter(item => item.name == name && item.type == 'dir')[0] as vDir | undefined;
            if(!cur){
                // 存在，只是被隐藏了
                try{
                    if((await stat(current.path + name + '/')).type != 'dir')
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
        return current.child as Array<FileOrDir>;
    }

    /**
     * 重命名文件
     * 与`FS.move()`不同的是, `rename()`是一对一的，而`move()`是多个复制到一个文件夹中的
     * 对于批量复制到一个地方`move()`更简便且节省带宽
     * @param fileList 文件列表，键值对应 `源文件:目标文件`
     */
    export async function rename(fileList: Record<string,string>, highlight = true):Promise<void>{
        // 查重
        const items = Object.keys(fileList).concat(Object.values(fileList)),
            set = new Set(items);
        if(set.size != items.length)
            throw new Error('Duplicate file path');
        if(items.length == 0) return;

        // 重命名
        await __request('rename', fileList, false);
        // 将这些文件从原TREE位置删除
        for(let [src, dst] of Object.entries(fileList)){
            // 找到原节点
            let current = TREE;
            const paths = src.split('/').filter(item => !!item);
            for(let i = 0; i < paths.length - 1; i++){
                const name = paths[i];
                current = (current.child as Array<FileOrDir>)
                    .filter(item => item.name == name && item.type == 'dir')[0] as vDir;
            }
            // 去除节点
            const index = (current.child as Array<FileOrDir>).findIndex(item => item.path == src);
            const node = current.child![index];
            index != -1 && (current.child as Array<FileOrDir>).splice(index, 1);
            current.parent?.active.delete(node);
            // 找到目标节点并插入
            current = TREE;
            const paths2 = dst.split('/').filter(item => !!item);
            for(let i = 0; i < paths2.length - 1; i++){
                const name = paths2[i];
                if(!current.child) await loadTree(current, true);
                current = current.child!.filter(item => item.name == name && item.type == 'dir')[0] as vDir;
            }
            // 是否重复
            const newname = paths2[paths2.length - 1];
            function merge(source: vDir, target: vDir){
                for(const item of source.child!)
                    if(item.type == 'file')
                        target.child!.push(item);
                    else if(target.child!.some(item2 => item2.name == item.name))
                        merge(item, target.child!.find(item2 => item2.name == item.name) as vDir);
                    else
                        target.child!.push(item);
            }
            if(current.child && current.child.some(item => item.name == newname)){
                const targetNode = current.child.find(item => item.name == newname)!;
                if(node.type != targetNode.type)
                    throw new Error('Target path already exists');
                if(node.type == 'file')
                    current.child[current.child.findIndex(item => item.name == newname)] = node;
                else
                    merge(node, current.child.find(item => item.name == newname) as vDir);
            }else{
                node.type == 'file'
                    ? current.child!.push(node)
                    : current.child!.unshift(node);
                // 更改节点路径
                if(node.type == 'dir' && dst[dst.length -1] != '/') dst += '/';
                node.icon = getIcon(node.name, node.type == 'file');
                node.type == 'dir' && __update_child(node);
                node.parent = current;
                node.path = dst;
                node.url = FILE_PROXY_SERVER + dst;
                node.name = paths2[paths2.length - 1];
                if(highlight) current.active.set(node, node.path);
            }
        }
    }

    export async function  stat(path:string):Promise<FileOrDir>{
        let match: RegExpMatchArray | null;
        let use_create = false;
        if(match = path.match(/^vfs:\/\/([a-z0-9-]+)\/(.+)$/))
            return new Promise(rs => match && rs(vfiles[match[1]]));

        // 尝试找到这个文件
        let current = TREE;
        const paths = path.split('/').filter(item => !!item);
        if(paths.length == 0) return current;
        for(let i = 0; i < paths.length; i++){
            const name = paths[i];
            if(!name) continue;
            if(!current.child) await loadTree(current, true);
            const cur = (current.child as Array<FileOrDir>).find(item => item.name == name);
            if(!cur){
                use_create = true;
                break; // 找不到就尝试直接stat()
            }

            // 找到了
            if(i == paths.length - 1)
                return cur;

            // 不是文件，抛出错误
            else if(cur.type == 'file')
                throw new Error('Path ' + paths.slice(0, i+1).join('/') + ' is not a dir');

            // 继续查找
            else
                current = cur;
        }

        
        const res = await __request('stat',{ path }, true) as FileOrDir;
        res.type == 'dir' && path[path.length -1] != '/' && (path += '/');
        res.type == 'file' && path[path.length -1] == '/' && (path = path.slice(0, -1));
        res.icon = getIcon(res.name, res.type == 'file');
        res.path = path;
        res.url = FILE_PROXY_SERVER + path;
        res.parent = current;
        res.type == 'dir' && (res.active = new Map());
        use_create && __create(() => res, [ path ]);
        return res;
    }

    export async function del(files:Array<string>|string){
        if(files?.length == 0) return;
        await __request('delete', { files: typeof files == 'string' ? [files] : files });
        // 删除源节点
        for(const file of typeof files == 'string' ? [files] : files){
            let current = TREE;
            const paths = file.split('/').filter(item => !!item);
            for(let i = 0; i < paths.length - 1; i++){
                const name = paths[i];
                if(!current.child) await loadTree(current, true);
                current = (current.child as Array<FileOrDir>)
                    .find(item => item.name == name && item.type == 'dir') as vDir;
            }
            const index = (current.child as Array<FileOrDir>).findIndex(item => item.path == file);
            index != -1 && (current.child as Array<FileOrDir>).splice(index, 1);
        }
    }

    /**
     * 在指定的父文件夹中创建返回的元素
     */
    async function __create(item: (name: string, fullpath: string, parent: vDir) => FileOrDir, files: Array<string>){
        for(const dir of files){
            // 找到dir
            let current = TREE;
            const paths = dir.split('/').filter(item => !!item);
            for(let i = 0; i < paths.length -1; i++){
                const name = paths[i];
                if(current.type != 'dir') throw new Error('Path ' + paths.slice(0, i+1).join('/') + ' is not a dir');
                if(!current.child) await loadTree(current, true);
                current = (current.child as Array<FileOrDir>).find(item => item.name == name && item.type == 'dir') as vDir;
            }
            current.child || (current.child = []);
            const nitem = item(paths[paths.length - 1], dir, current);
            // 排异
            for(let i = 0; i < current.child.length - 1; i++)
                if(current.child[i].name == paths[paths.length - 1])
                    return current.child[i] = nitem;
            // 添加一个
            nitem.type == 'file'
                ? current.child.push(nitem)
                : current.child.unshift(nitem);
        }
    }

    export async function  mkdir(dirs: Array<string>|string){
        if(dirs?.length == 0) return;
        await __request('mkdir', { files: typeof dirs == 'string' ? [dirs] : dirs });
        // 在文件夹下创建文件夹
        await __create((name, dirpath, parent) => ({
            "type": "dir",
            "ctime": Date.now(),
            "icon": DEFAULT_DIR_ICON,
            "name": name,
            "path": dirpath,
            "url": FILE_PROXY_SERVER + dirpath,
            parent,
            active: new Map()
        }), typeof dirs == 'string' ? [dirs] : dirs);
    }

    export async function  touch(files:Array<string>|string, mode?: number){
        if(mode && mode > 0o7777)
            throw new Error('Mode Error');
        files = typeof files == 'string' ? [files] : files;
        if(files.length == 0) return;
        await __request('touch', { 
            files,
            mode
        });
        await __create((name, fullpath, parent) => ({
            "type": "file",
            "ctime": Date.now(),
            "icon": getIcon(name, true),
            "name": name,
            "path": fullpath,
            "url": FILE_PROXY_SERVER + fullpath,
            "size": 0,
            parent,
            active: new Map()
        }), files);
    }

    async function __analysis_from_to(delete_origin = false, from: Array<string>, to: string, highlight = true){
        // 找到目标节点
        let current = TREE;
        const paths = to.split('/');
        for(let i = 0; i < paths.length; i++){
            const name = paths[i];
            if(!name) continue;
            if(!current.child) await loadTree(current, true);
            current = (current.child as Array<FileOrDir>)
                .find(item => item.name == name && item.type == 'dir') as vDir;
        }
        const target = current;
        // 找到源节点
        for(const item of from){
            let current = TREE;
            const paths = item.split('/').filter(item => !!item);
            for(let i = 0; i < paths.length - 1; i++){
                const name = paths[i];
                if(!current.child) await loadTree(current, true);
                current = (current.child as Array<FileOrDir>)
                    .find(item => item.name == name && item.type == 'dir') as vDir;
            }
            const index = (current.child as Array<FileOrDir>)
                .findIndex(item => item.name == paths[paths.length - 1]);
            target.child || (target.child = []);
            // 检查是否重复
            function merge(source: vDir, target: vDir){
                for(const item of source.child!)
                    if(item.type == 'file')
                        target.child!.push(item);
                    else if(target.child!.some(item2 => item2.name == item.name))
                        merge(item, target.child!.find(item2 => item2.name == item.name) as vDir);
                    else
                        target.child!.push(item);
            }
            if(target.child.some(item => item.name == paths[paths.length - 1])){
                if(delete_origin)
                    current.child && (current.child as Array<FileOrDir>).splice(index, 1);
                else if(current.child![index].type == 'file')
                    target.child[target.child.findIndex(item => item.name == paths[paths.length - 1])] = current.child![index];
                else
                    merge(current.child![index] as vDir, target.child.find(item => item.name == paths[paths.length - 1]) as vDir);
            }else{
                current.child![index].type == 'file' 
                    ? target.child.push(current.child![index])
                    : target.child.unshift(current.child![index]);
                if(delete_origin)
                    current.child && (current.child as Array<FileOrDir>).splice(index, 1);
                current.child![index].parent = target;
                if(highlight) target.active.set(current.child![index], current.child![index].path);
            }
        }
        // 更新子项目路径
        __update_child(target);
    }
    
    function __update_child(parent: vDir){
        if(!parent.child) return;
        for(const item of parent.child)
            if(item.type == 'dir')
                __update_child(item);
            else
                item.path = parent.path + item.name + (item.type == 'file' ? '' : '/'),
                item.url = FILE_PROXY_SERVER + parent.path + item.name + (item.type == 'file' ? '' : '/');
    }

    export async function  copy(from:Array<string>|string,to:string){
        from = typeof from == 'string' ? [from] : from;
        if(from.length == 0) return;
        await __request('copy', {
            from,
            to
        });
        await __analysis_from_to(false, from, to);
    }

    export async function  move(from:Array<string>|string, to:string, deep_move = false){
        from = typeof from == 'string' ? [from] : from;
        if(from.length == 0) return;
        await __request(deep_move ? 'fmove' : 'move', {
            from,
            to
        });
        await __analysis_from_to(true, from, to);
    }

    /**
     * @private
     */
    const __auth = () => new Promise<string>((rs, rj) => Global('ui.alert').call({
        'type': 'prompt',
        'title': '身份验证',
        'message': '由于身份验证失败，操作失败。\n请输入身份ID，如果忘记请查看nginx配置',
        'callback': (data) => {
            if(!auth_key)
                auth_key = getConfig('基础').authkey;
            auth_key.value = data as string;
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
    } satisfies AlertOpts))

    export function write(
        file:string,
        content: Blob,
        progress?:(this: XMLHttpRequest, ev: number) => any,
        file_ref?: Ref<vFile | undefined>
    ):Promise<string>{
        if(!auth_key)
            auth_key = getConfig('基础').authkey;

        // 虚拟文件系统
        let match: RegExpMatchArray | null;
        if(match = file.match(/^vfs:\/\/([a-z0-9-]+)\/(.+)$/))
            return (async () => {
                if(!match) throw 1;  // TypeScript Check

                const obj = vfiles[match[1]],
                    write = await obj.vHandle.createWritable({
                        "keepExistingData": false
                    });
                await write.write(content);
                return 'OK';
            })();

        const promise = new Promise(async (rs,rj) => {
            // 预检
            let _pre;
            try{
                _pre = await fetch(APP_API + '?action=upload&path=' + encodeURIComponent(file) + '&length=' + content.size,{
                    headers: {
                        'Authorization': auth_key?.value
                            ? await encrypto(content.size, auth_key.value, file)
                            : ''
                    }
                });
                if(_pre.status == 401){
                    await __auth();
                    return await write(file, content, progress).then(rs).catch(rj);
                }
                if(Math.floor(_pre.status / 100) != 2) throw 0;
            }catch{
                return rj(new Error('PreUpload Failed: ' + (_pre ? await _pre.text() : 'Unknown Error')));
            }

            file_ref = file_ref || ref<vFile>();
            await __create((name, fullpath, parent) => (file_ref as Ref<vFile>).value = reactive({
                "type": "file",
                "ctime": Date.now(),
                "icon": getIcon(name, true),
                "name": name,
                "path": fullpath,
                "url": FILE_PROXY_SERVER + fullpath,
                "size": content.size,
                parent,
                active: new Map()
            }), [file]);

            const xhr = new XMLHttpRequest();
            xhr.timeout = 60000;
            
            if(progress) xhr.addEventListener('progress', ev => 
                progress.call(xhr, (file_ref?.value as vFile).upload = ev.loaded / ev.total * 100)
            );
            xhr.addEventListener('load', () => 
                Math.floor(xhr.status / 100) == 2
                    ? rs(xhr.responseText)
                    : rj(new Error('Status ' + xhr.status + ': ' + xhr.responseText))
            );
            xhr.addEventListener('error', () => {
                rj(new Error('Network Error'));
            });
            xhr.addEventListener('timeout', rj);

            xhr.open('POST',APP_API + '?action=upload&path=' + encodeURIComponent(file));
            xhr.setRequestHeader('Content-Type', content.type);
            if(auth_key?.value) 
                xhr.setRequestHeader('Authorization', await encrypto(content.size, auth_key.value, file));
            xhr.send(content);
        });

        return promise as Promise<string>;
    }

    const vfiles: Record<string, vFile & { vHandle: FileSystemFileHandle }> = {};

    export async function  create( handle: FileSystemFileHandle ){
        const uuid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36),
            file = await handle.getFile();
        return vfiles[uuid] = {
            "ctime": file.lastModified,
            "name": handle.name,
            "size": file.size,
            "icon": getIcon(file.name, true),
            "path": "vfs://" + uuid + '/' + file.name,
            "type": "file",
            "url": URL.createObjectURL(file),
            vHandle: handle,
            parent: null,
        };
    }
}

/**
 * 文件大小转换为字符串
 * @param size 文件大小
 * @returns 文件大小字符串
 */
export function size2str(size: number){
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    for (let i = 0; i < sizes.length; i++)
        if (size / 1024 ** i < 800)
            return (size / 1024 ** i).toFixed(1) + sizes[i];
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
        slash = path.lastIndexOf('/', path.length -2),
        dot = path.lastIndexOf('.');
    return {
        dir   : path.substring(0,slash +1) || '/',
        name  : path.substring(slash + 1, dot == -1 ? undefined : dot),
        ext   : path.substring(dot == -1 ? slash + 1 : dot + 1),
        fname : path.substring(slash + 1)
    }
}

/**
 * 裁剪文件名，方便输出
 * @param file 类文件 vFile
 * @param maxlen 最大长度
 * @returns 裁剪后的文件名
 */
export function clipFName(file:{name: string},maxlen = 20){
    if(file.name.length > maxlen){
        return file.name.substring(0,maxlen - 3) + '...'
    }else{
        return file.name;
    }
}

/**
 * 获取被选中的文件（夹）
 * @returns 被选中的文件（夹）
 */
export function getActiveFile(parent = TREE.parent): Array<FileOrDir>{
    const active = [] as Array<FileOrDir>;
    function traverse(tree: vDir){
        if(tree.child)
            for (const item of tree.child)
                if(tree.active.has(item))
                    active.push(item);
                else if(item.type == 'dir')
                    traverse(item);
    }
    parent && traverse(parent);
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
    traverse(TREE.parent as vDir);
}