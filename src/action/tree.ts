import I_TOOL from '/icon/quicktool.webp';
import I_PATH from '/icon/path.webp';
import I_DOWNLOAD from '/icon/download.webp';
import I_LINK from '/icon/url.webp';
import I_MATCH from '/icon/match.webp';
import I_ORDER from '/icon/transmit.webp';
import I_EXPLORER from '/app/explorer.webp';
import I_NEW from '/icon/new.webp';
import I_FOLDER from '/icon/folder.webp';
import I_TXT from '/icon/textfile.webp';
import I_UPLOAD from '/icon/transmit.webp';
import I_REFRESH from '/icon/refresh.webp';
import I_CUT from '/icon/cut.webp';
import I_COPY from '/icon/copy.webp';
import I_PASTE from '/icon/paste.webp';
import I_RENAME from '/icon/rename.webp';
import I_OPEN from "/icon/open.webp";
import I_OPENER from '/icon/opener.webp';
import I_DELETE from '/icon/del.svg';

import Upload from '@/module/upload.vue';
import EXPLORER from '@/module/explorer.vue';
import { FACTION, FS, Global, TREE, loadPath, loadTree, openFile, reloadTree, size2str, splitPath, type iFile } from "@/utils";
import type { AlertOpts, MessageOpinion, vDir } from "@/env";
import { list_marked as marked, list_markmap as markmap } from "@/utils";
import { CtxMenuRegister } from './main';

export const TREE_REG = new CtxMenuRegister();

// ==================== 文件夹操作 ======================

TREE_REG.register(indir => ({
    "text": "创建",
    "icon": I_NEW,
    "child": [
        {
            "text": "文件夹",
            "icon": I_FOLDER,
            handle: () =>
                Global('ui.alert').call({
                    "type": "prompt",
                    "title": "创建文件夹",
                    "message": "请输入文件夹名称",
                    callback: (data) =>
                        // 创建文件夹
                        FS.mkdir(indir.path + data)
                            .then(() => loadTree(indir)),
                } satisfies AlertOpts)
        }, {
            "text": "文件",
            "icon": I_TXT,
            handle: () =>
                Global('ui.alert').call({
                    "type": "prompt",
                    "title": "新建文件",
                    "message": "请输入文件名称",
                    callback: (data) =>
                        // 创建文件夹
                        FS.touch(indir.path + data)
                            .then(() => loadTree(indir)),
                } satisfies AlertOpts)
        }
    ],
}), {
    'single': false,
    'sort': 'all'
});

TREE_REG.register(indir => ({
    "text": "上传",
    "icon": I_UPLOAD,
    handle: () => {
        Global('ui.window.add').call({
            "content": Upload,
            "icon": I_UPLOAD,
            "name": "上传文件",
            "option": indir
        });
    }
}), {
    'single': false,
    'sort': 'all'
});
TREE_REG.register(indir => ({
    "text": "刷新",
    "icon": I_REFRESH,
    handle: () => loadTree(indir)
}
), {
    'single': false,
    'sort': 'all'
});

TREE_REG.add_slash();

// ===================== 文件操作 ====================

TREE_REG.register(() => ({
    "text": "剪切",
    "icon": I_CUT,
    handle: () =>
        FACTION.mark('move', marked.value)
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.register(() => ({
    "text": "复制",
    "icon": I_COPY,
    handle: () =>
        FACTION.mark('copy', marked.value)
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.register(() => ({
    "text": "粘贴",
    "icon": I_PASTE,
    handle: async () => {
        const dir = marked.value[0] as vDir;

        // 覆盖提示
        try {
            if (!dir.child)
                await loadTree(dir);
            if (!dir.child) dir.child = [];
            const mark = FACTION.marked.map(item => item.name),
                over = dir.child.filter(item => mark.includes(item.name));
            if (over.length > 0)
                await new Promise(rs => Global('ui.alert').call({
                    "type": "confirm",
                    "title": "覆盖或合并提示",
                    "message": "这些文件将会被合并/覆盖\n\n" +
                        over.map(item => item.name + '\t' + (item.type == 'dir' ? '文件夹' : size2str(item.size))),
                    "callback": rs
                } satisfies AlertOpts));
        } catch { }

        FACTION.exec(dir);
    }
}), {
    'single': true,
    'sort': 'dir',
    filter: files => FACTION.marked.length > 0
});

TREE_REG.register(() => ({
    "text": "删除",
    "icon": I_DELETE,
    handle: async () => {
        try {
            await FS.delete(marked.value.map(item => item.path))
        } catch (e) {
            return Global('ui.message').call({
                'type': 'error',
                'content': {
                    'title': '删除失败',
                    'content': (e as Error).message
                },
                'title': '文件资源管理器',
                'timeout': 10
            } satisfies MessageOpinion)
        }
        const refdir = [] as Array<string>;
        for (const file of marked.value) if (file.type == 'file') {
            const dir = splitPath(file)['dir'];
            if (!refdir.includes(dir)) refdir.push(dir);
        } else {
            const slash = file.path.lastIndexOf('/', file.path.length - 2);
            refdir.push(file.path.substring(0, slash + 1));
        }
        // 刷新
        reloadTree(refdir);
    }
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.register(() => ({
    "text": "重命名",
    "icon": I_RENAME,
    handle: () => marked.value[0].rename = true,
}), {
    'single': true,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.add_slash();

// ==================== 实用工具 ====================

TREE_REG.register(() => ({
    "text": "打开",
    "icon": I_OPEN,
    handle: () => openFile(marked.value[0] as iFile),
}), {
    'sort': 'file',
    'single': true
});
TREE_REG.register(() => ({
    "text": "打开方式",
    "icon": I_OPENER,
    handle() {
        Global('opener.chooser.choose').call(marked.value[0])
            .then(opener => opener.open(marked.value[0]));
    },
}), {
    'sort': 'file',
    'single': true
});

TREE_REG.add_slash();

// ====================== 小工具 ============================

TREE_REG.register(() => ({
    'icon': I_LINK,
    'text': '转到目录',
    handle() {
        Global('ui.alert').call({
            'type': 'prompt',
            'title': '转到目录',
            'message': '输入目录名称，支持隐藏目录',
            callback(data) {
                loadPath(data as string);
            },
        } satisfies AlertOpts)
    },
}), {
    'single': false,
    'sort': 'all'
});

TREE_REG.register(() => ({
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
                        try {
                            var preg = new RegExp(data as string, 'i'),
                                item = marked.value[0] as vDir;
                        } catch (e) {
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

                        if (!item.child) await loadTree(item);
                        if (!item.child) return; // for TypeScript TypeCheck

                        markmap.value = [];
                        marked.value = [];
                        for (let i = 0; i < item.child.length; i++)
                            if (preg.test(item.child[i].name)) {
                                markmap.value.push(item.child[i].path);
                                marked.value.push(item.child[i]);
                            }

                        (document.querySelector('.left > div.files') as HTMLElement).focus();
                    },
                } satisfies AlertOpts);
            },
        }, {
            'text': 'explorer窗格',
            'icon': I_EXPLORER,
            async handle() {
                Global('ui.window.add').call({
                    "content": EXPLORER,
                    "icon": I_EXPLORER,
                    "name": 'Explorer',
                    "option": marked.value[0]
                });
            },
        }
    ]
}), {
    'single': true,
    'sort': 'dir'
});

TREE_REG.register(() => ({
    'text': '文件小工具',
    'icon': I_TOOL,
    child: [
        {
            'text': '复制路径',
            'icon': I_PATH,
            handle() {
                navigator.clipboard.writeText(marked.value[0].path);
            },
        }, {
            'text': '复制文件链接',
            'icon': I_LINK,
            handle() {
                navigator.clipboard.writeText(marked.value[0].url);
            },
        }, {
            'text': '下载文件',
            'icon': I_DOWNLOAD,
            handle() {
                const link = document.createElement('a');
                link.target = '_blank';
                link.href = marked.value[0].url;
                link.download = marked.value[0].name;
                link.click();
            },
        }
    ]
}), {
    'single': true,
    'sort': 'file'
});

TREE_REG.register(() => ({
    'text': '文件小工具',
    'icon': I_TOOL,
    'child': [
        {
            'text': '批量排序',
            'icon': I_ORDER,
            handle() {
                const ordered = marked.value.sort((a, b) => a.name.localeCompare(b.name)),
                    obj = {} as Record<string, string>,
                    reload = [] as Array<string>;
                for (let i = 0; i < ordered.length; i++) {
                    const info = splitPath(ordered[i]);
                    ordered[i].status = 1;
                    obj[ordered[i].path] = info.dir + (i + 1).toString().padStart(3, '0') + '.' + info.ext;
                    if (reload.includes(info.dir)) reload.push(info.dir);
                }
                FS.rename(obj).then(() => void reloadTree(reload))
                    .catch((e: Error) => Global('ui.message').call({
                        "type": "error",
                        "title": "文件资源管理器",
                        "content": {
                            "title": '重命名错误',
                            'content': e.message
                        },
                        "timeout": 5
                    } satisfies MessageOpinion));
            },
        }
    ]
}), {
    single: false,
    sort: 'file',
    filter: file => file.length > 1
});