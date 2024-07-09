import type { FileOrDir, MessageOpinion, vDir } from "@/env";
import { FILE_PROXY_SERVER, FS, Global } from "@/utils";
import { reactive } from "vue";
import { getIcon } from "./icon";

import I_DESKTOP from '/icon/desktop.webp';

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
        const merged: Array<FileOrDir> = item.filter(item => item.type == 'dir').sort((a, b) => a.name.localeCompare(b.name))
            .concat(item.filter(item => item.type == 'file').sort((a, b) => a.name.localeCompare(b.name)) as any);
        merged.forEach(each => each.icon = getIcon(each.name, each.type == 'file'));
        input.child = merged;
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