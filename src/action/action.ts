import type { MessageOpinion } from "@/env";
import { APP_API, Global, reloadTree, type iDir, type iMixed } from "@/utils";

// 文件操作
export const FACTION = {
    marked: [] as Array<iMixed>,
    action: 'copy' as 'copy' | 'move',
    async exec(dest: iDir): Promise<boolean | number> {
        // 异步获取
        const f = await fetch(APP_API + '?action=' + this.action, {
            "method": "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            "body": JSON.stringify({
                from: this.marked.map(item => item.path),
                to: dest.path
            })
        });
        if (!f.ok) {
            Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content": {
                    "title": {
                        'copy': '复制',
                        'move': '剪切'
                    }[this.action] + '文件失败',
                    "content": await f.text()
                },
                "timeout": 5
            } satisfies MessageOpinion);
            return false;
        } else {
            reloadTree([dest.path]);
        }
        return true;
    },

    mark(action: 'copy' | 'move', file: Array<iMixed>) {
        this.marked = file;
        this.action = action;
    }
}