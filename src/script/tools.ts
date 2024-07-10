import { markmap, register } from "@/module/tree.vue";

import I_TOOL from '/icon/quicktool.webp';
import I_PATH from '/icon/path.webp';
import I_DOWNLOAD from '/icon/download.webp';
import I_LINK from '/icon/url.png';
import I_MATCH from '/icon/match.webp';
import { Global, loadTree } from "@/utils";
import type { AlertOpts, FileOrDir, MessageOpinion, vDir } from "@/env";

register(marked => ({
    'text': '文件夹小工具',
    'icon': I_TOOL,
    "child": [
        {
            "text": "正则匹配",
            'icon': I_MATCH,
            handle() {
                Global('ui.alert').call({
                    'title': '正则匹配',
                    'message': '请输入正则表达式(忽略大小写)，匹配到的文件将被标记',
                    'type': 'prompt',
                    async callback(data) {
                        try{
                            var preg = new RegExp(data as string, 'i'),
                                item = marked[0] as vDir;
                        }catch(e){
                            return Global('ui.message').call({
                                'title': '正则错误',
                                'content': {
                                    'title': '无法加载正则表达式',
                                    'content': (e as Error).message
                                },
                                'type': 'error',
                                'timeout': 10
                            } satisfies MessageOpinion);
                        }

                        if(!item.child) await loadTree(item);
                        if(!item.child) return; // for TypeScript TypeCheck

                        markmap.value = [];
                        for (let i = 0; i < item.child.length; i++)
                            if(preg.test(item.child[i].name))
                                markmap.value.push(item.child[i].path);

                        (document.querySelector('.left > div.files') as HTMLElement).focus();
                    },
                } satisfies AlertOpts);
            },
        }
    ]
}),{
    'single': true,
    'sort': 'dir'
});

register(marked => ({
    'text': '文件小工具',
    'icon': I_TOOL,
    child: [
        {
            'text': '复制路径',
            'icon': I_PATH,
            handle() {
                navigator.clipboard.writeText(marked[0].path);
            },
        },{
            'text': '复制文件链接',
            'icon': I_LINK,
            handle() {
                navigator.clipboard.writeText(marked[0].url);
            },
        },{
            'text': '下载文件',
            'icon': I_DOWNLOAD,
            handle() {
                const link = document.createElement('a');
                link.target = '_blank';
                link.href = marked[0].url;
                link.download = marked[0].name;
                link.click();
            },
        }
    ]
}),{
    'single': true,
    'sort': 'file'
});