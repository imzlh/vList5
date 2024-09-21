import type { CtxDispOpts, CtxMenuData, vDir, FileOrDir } from "@/env";
import { contextMenu, getActiveFile } from "@/utils";

export interface DisplayCondition{
    single: boolean,
    sort: 'file' | 'dir' | 'all',
    filter?: (file: FileOrDir[]) => boolean
}

export class CtxMenuRegister{
    private items = [[]] as Array<Array<[ (click_in_dir: vDir) => CtxMenuData, DisplayCondition ]>>;

    display(pos: { x: number, y: number, indir: vDir }){
        const pre:Array<CtxMenuData> = [];
        for (let i = 0; i < this.items.length; i++) {
            let actived = 0;
            const marked = getActiveFile();
            for (const item of this.items[i]) {
                if (item[1].single && marked.length != 1) continue;
                if (item[1].sort != 'all' && marked.some(each => item[1].sort != each.type))
                    continue;
                if (item[1].filter && !item[1].filter(marked))
                    continue;
                pre.push(item[0](pos.indir));
                actived ++;
            }
            if(actived) pre.push('---');
        }
        if(pre[pre.length - 1] == '---') pre.pop();
        contextMenu({
            'pos_x': pos.x,
            'pos_y': pos.y,
            'content': pre
        } satisfies CtxDispOpts);
    }

    register(data: (click_in_dir: vDir) => CtxMenuData, cdt: DisplayCondition){
        this.items[this.items.length -1].push([data, cdt]);
    }

    add_slash(){
        this.items.push([]);
    }
}