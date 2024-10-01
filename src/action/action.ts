import type { MessageOpinion, FileOrDir, vDir } from "@/env";
import { FS, getActiveFile, message, splitPath } from "@/utils";

// 文件操作
export const FACTION = {
    marked: [] as Array<FileOrDir>,
    action: 'copy' as 'copy' | 'move',
    async exec(dest: vDir): Promise<boolean | number> {
        try{
            const origin = this.marked.map(item => item.path);
            if(this.action == 'copy') FS.copy(origin, dest.path);
            else FS.move(origin, dest.path);
            await FS.loadPaths([...this.marked.map(item => splitPath(item).dir), dest.path]);
        }catch(e){
            message({
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

    mark(action: 'copy' | 'move') {
        this.marked = getActiveFile();
        this.action = action;
    }
}