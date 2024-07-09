import type { FileOrDir, MessageOpinion, OpenerOption, vFile } from "@/env";
import { clipFName, splitPath } from "./fs";
import { OPENER } from "@/opener";
import { Global } from "@/utils";

export function getOpenerId(file:vFile):Promise<OpenerOption>|OpenerOption{
    const ext = splitPath(file)['ext'];
    for (let i = 0; i < OPENER.length; i++)
        if(OPENER[i].format.includes(ext.toLowerCase()))
            return OPENER[i];
    // 默认方式
    return Global('opener.chooser.choose').call(file);
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