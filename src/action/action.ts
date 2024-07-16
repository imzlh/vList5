import type { MessageOpinion } from "@/env";
import { APP_API, FS, Global, reloadTree, splitPath, type iDir, type iMixed } from "@/utils";

// 文件操作
export const FACTION = {
    marked: [] as Array<iMixed>,
    action: 'copy' as 'copy' | 'move',
    async exec(dest: iDir): Promise<boolean | number> {
        try{
            await FS.__request(this.action, {
                from: this.marked.map(item => item.path),
                to: dest.path
            });
            await reloadTree([... this.marked.map(item => splitPath(item).dir), dest.path]);
        }catch(e){
            Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content": {
                    "title": {
                        'copy': '复制',
                        'move': '剪切'
                    }[this.action] + '文件失败',
                    "content": (e as Error).message
                },
                "timeout": 5
            } satisfies MessageOpinion);
            return false;
        }
        return true;
    },

    mark(action: 'copy' | 'move', file: Array<iMixed>) {
        this.marked = file;
        this.action = action;
    }
}