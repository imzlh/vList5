import { marked, markmap, register } from "@/module/tree.vue";

import I_TOOL from '/icon/quicktool.webp';
import I_PATH from '/icon/path.webp';
import I_DOWNLOAD from '/icon/download.webp';
import I_LINK from '/icon/url.png';
import I_MATCH from '/icon/match.webp';
import I_ORDER from '/icon/transmit.webp';

import { FS, Global, loadTree, reloadTree, splitPath } from "@/utils";
import type { AlertOpts, MessageOpinion, vDir } from "@/env";

register(mark => ({
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
                                item = mark[0] as vDir;
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
                        marked.value = [];
                        for (let i = 0; i < item.child.length; i++)
                            if(preg.test(item.child[i].name)){
                                markmap.value.push(item.child[i].path);
                                marked.value.push(item.child[i]);
                            }

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

register(mark => ({
    'text': '文件小工具',
    'icon': I_TOOL,
    child: [
        {
            'text': '复制路径',
            'icon': I_PATH,
            handle() {
                navigator.clipboard.writeText(mark[0].path);
            },
        },{
            'text': '复制文件链接',
            'icon': I_LINK,
            handle() {
                navigator.clipboard.writeText(mark[0].url);
            },
        },{
            'text': '下载文件',
            'icon': I_DOWNLOAD,
            handle() {
                const link = document.createElement('a');
                link.target = '_blank';
                link.href = mark[0].url;
                link.download = mark[0].name;
                link.click();
            },
        }
    ]
}),{
    'single': true,
    'sort': 'file'
});

register(mark => ({
    'text': '文件小工具',
    'icon': I_TOOL,
    'child': [{
        'text': '批量排序',
        'icon': I_ORDER,
        handle() {
            const ordered = marked.value.sort((a,b) => a.name.localeCompare(b.name)),
                obj = {} as Record<string,string>,
                reload = [] as Array<string>;
            for (let i = 0; i < ordered.length; i++) {
                const info = splitPath(ordered[i]);
                ordered[i].status = 1;
                obj[ordered[i].path] = info.dir + (i +1).toString().padStart(3, '0') + '.' + info.ext;
                if(reload.includes(info.dir)) reload.push(info.dir);
            }
            FS.rename(obj).then(() => void reloadTree(reload))
                .catch((e:Error) => Global('ui.message').call({
                    "type": "error",
                    "title": "文件资源管理器",
                    "content":{
                        "title": '重命名错误',
                        'content': e.message
                    },
                    "timeout": 5
                } satisfies MessageOpinion));
        },
    }]
}), {
    single: false,
    sort: 'file',
    filter: file => file.length > 1
});