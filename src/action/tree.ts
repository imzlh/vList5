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
import I_BANGUMI from '/icon/bangumi.webp';
import I_STORE from '/app/store.webp';

import Upload from '@/module/upload.vue';
import EXPLORER from '@/module/explorer.vue';
import { FACTION, FS, TREE, alert, clearActiveFile, createWindow, getActiveFile, installPlugin, message, openFile, selectOpener, size2str, splitPath } from "@/utils";
import type { AlertOpts, MessageOpinion, vDir, vFile } from "@/env";
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
                alert({
                    "type": "prompt",
                    "title": "创建文件夹",
                    "message": "请输入文件夹名称",
                    callback: (data) =>
                        // 创建文件夹
                        FS.mkdir(indir.path + data)
                            .then(() => FS.loadTree(indir)),
                } satisfies AlertOpts)
        }, {
            "text": "文件",
            "icon": I_TXT,
            handle: () =>
                alert({
                    "type": "prompt",
                    "title": "新建文件",
                    "message": "请输入文件名称",
                    callback: (data) =>
                        // 创建文件夹
                        FS.touch(indir.path + data)
                            .then(() => FS.loadTree(indir)),
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
        createWindow({
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
    handle: () => FS.loadTree(indir)
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
        FACTION.mark('move')
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.register(() => ({
    "text": "复制",
    "icon": I_COPY,
    handle: () =>
        FACTION.mark('copy')
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.register(() => ({
    "text": "粘贴",
    "icon": I_PASTE,
    handle: async () => {
        const dir = getActiveFile()[0] as vDir;

        // 覆盖提示
        try {
            if (!dir.child)
                await FS.loadTree(dir);
            if (!dir.child) dir.child = [];
            const mark = FACTION.marked.map(item => item.name),
                over = dir.child.filter(item => mark.includes(item.name));
            if (over.length > 0)
                await new Promise(rs => alert({
                    "type": "confirm",
                    "title": "覆盖或合并提示",
                    "message": "这些文件将会被合并/覆盖\n\n" +
                        over.map(item => item.name + '\t' + (item.type == 'dir' ? '文件夹' : size2str(item.size))),
                    "callback": res => res && rs(true)
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
            await FS.del(getActiveFile().map(item => item.path))
        } catch (e) {
            return message({
                'type': 'error',
                'content': {
                    'title': '删除失败',
                    'content': (e as Error).message
                },
                'title': '文件资源管理器',
                'timeout': 10
            } satisfies MessageOpinion)
        }
    }
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

TREE_REG.register(() => ({
    "text": "重命名",
    "icon": I_RENAME,
    handle: () => getActiveFile()[0].rename = true,
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
    handle: () => openFile(getActiveFile()[0] as vFile),
}), {
    'sort': 'file',
    'single': true
});
TREE_REG.register(() => ({
    "text": "打开方式",
    "icon": I_OPENER,
    handle() {
        selectOpener(getActiveFile()[0] as vFile)
            .then(opener => opener.open(getActiveFile()[0] as vFile));
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
        alert({
            'type': 'prompt',
            'title': '转到目录',
            'message': '输入目录名称，支持隐藏目录',
            callback(data) {
                FS.loadPath(data as string);
            },
        } satisfies AlertOpts)
    },
}), {
    'single': false,
    'sort': 'all'
});

TREE_REG.register(() => ({
    'icon': I_STORE,
    'text': '导入VlIST应用',
    handle() {
        const file = getActiveFile()[0] as vDir;
        installPlugin(file.url)
            .then(() => message({
                "type": "success",
                "title": "文件资源管理器",
                "content": {
                    "title": "导入成功",
                    "content": "应用已安装"
                },
                "timeout": 10
            }))
            .catch(e => message({
                "type": "error",
                "title": "文件资源管理器",
                "content": {
                    "title": "导入失败",
                    "content": String(e)
                },
                "timeout": 10
            }));
    }
}), {
    'single': true,
    'sort': 'dir',
    'filter': dir => dir[0].type == 'dir' && !!dir[0].child?.some(item => item.name == 'app.json')
});

TREE_REG.register(() => ({
    'text': '文件夹小工具',
    'icon': I_TOOL,
    "child": [
        {
            "text": "正则匹配",
            'icon': I_MATCH,
            handle() {
                alert({
                    'title': '正则匹配',
                    'message': '请输入正则表达式(忽略大小写)，匹配到的文件将被标记',
                    'type': 'prompt',
                    async callback(data) {
                        try {
                            var preg = new RegExp(data as string, 'i'),
                                item = getActiveFile()[0] as vDir;
                        } catch (e) {
                            return message({
                                'title': '正则错误',
                                'content': {
                                    'title': '无法加载正则表达式',
                                    'content': (e as Error).message
                                },
                                'type': 'error',
                                'timeout': 10
                            } satisfies MessageOpinion);
                        }

                        if (!item.child) await FS.loadTree(item);
                        item.unfold = true;

                        clearActiveFile();
                        for (let i = 0; i < item.child!.length; i++)
                            if (preg.test(item.child![i].name)) {
                                item.active.set(item.child![i], item.child![i].path);
                                getActiveFile().push(item.child![i]);
                            }
                    },
                } satisfies AlertOpts);
            },
        }, {
            "text": "番剧快速重命名",
            "icon": I_BANGUMI,
            async handle() {
                // 将视频(mkv mp4等) 字幕(srt ass vtt等)分别分类重命名
                const dir = getActiveFile()[0] as vDir;
                if (!dir.child) await FS.loadTree(dir);
                const video = dir.child!.filter(item => item.name.endsWith('.mkv') || item.name.endsWith('.mp4')),
                    subtitle = dir.child!.filter(item => item.name.endsWith('.ass') || item.name.endsWith('.srt') || item.name.endsWith('.vtt')),
                    rename = {} as Record<string, string>,
                    dels = [] as Array<string>;
                for (let i = 0; i < video.length; i++) {
                    const info = splitPath(video[i]);
                    rename[video[i].path] = info.dir + (i +1).toString().padStart(3, '0') + '.' + info.ext;
                }
                let subi = 1;
                for (let i = 0; i < subtitle.length; i++) {
                    const info = splitPath(subtitle[i]);
                    if(info.name.toLowerCase().includes('cht') || info.name.toLowerCase().includes('tc'))
                        dels.push(subtitle[i].path);
                    else 
                        rename[subtitle[i].path] = info.dir + (subi ++).toString().padStart(3, '0') + '.' + info.ext;
                }

                FS.rename(rename);
                FS.del(dels);
            },
        }, {
            'text': 'explorer窗格',
            'icon': I_EXPLORER,
            async handle() {
                createWindow({
                    "content": EXPLORER,
                    "icon": I_EXPLORER,
                    "name": 'Explorer',
                    "option": getActiveFile()[0]
                });
            },
        }, {
            'text': '全选',
            'icon': I_MATCH,
            async handle() {
                const item = getActiveFile()[0] as vDir;
                clearActiveFile();
                if(!item.child) await FS.loadTree(item);
                item.unfold = true;
                item.child!.forEach(child => item.active.set(child, child.path));
            },
        }, {
            'text': '全部展开',
            'icon': I_FOLDER,
            handle() {
                async function unfold(dir: vDir) {
                    dir.child || await FS.loadTree(dir);
                    dir.unfold = true;
                    for(let i = 0; i < dir.child!.length; i++)
                        if(dir.child![i].type == 'dir')
                            await unfold(dir.child![i] as vDir);
                }
                return unfold(getActiveFile()[0] as vDir);
            }
        }, {
            'text': '全部收起',
            'icon': I_FOLDER,
            handle() {
                const fold = (dir: vDir) => {
                    dir.unfold = false;
                    dir.child!.forEach(item => item.type == 'dir' && fold(item))
                };
                return fold(getActiveFile()[0] as vDir);
            }
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
                navigator.clipboard.writeText(getActiveFile()[0].path);
            },
        }, {
            'text': '复制文件链接',
            'icon': I_LINK,
            handle() {
                navigator.clipboard.writeText(getActiveFile()[0].url);
            },
        }, {
            'text': '下载文件',
            'icon': I_DOWNLOAD,
            handle() {
                const link = document.createElement('a');
                link.target = '_blank';
                link.href = getActiveFile()[0].url;
                link.download = getActiveFile()[0].name;
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
            async handle() {
                const ordered = getActiveFile().sort((a, b) => a.name.localeCompare(b.name)),
                    obj = {} as Record<string, string>,
                    reload = [] as Array<string>
                const start = parseInt(await new Promise(rs => alert({
                    "type": "prompt",
                    "title": "排序",
                    "message": "请输入起始值，默认为1",
                    "callback": rs as any
                }))) || 1;
                for (let i = 0; i < ordered.length; i++) {
                    const info = splitPath(ordered[i]);
                    ordered[i].lock = true;
                    obj[ordered[i].path] = info.dir + (i + start).toString().padStart(3, '0') + '.' + info.ext;
                    if (!reload.includes(info.dir)) reload.push(info.dir);
                }
                FS.rename(obj)
                    .then(() => ordered.forEach(item => item.lock = false))
                    .catch((e: Error) => message({
                        "type": "error",
                        "title": "文件资源管理器",
                        "content": {
                            "title": '重命名错误',
                            'content': e.message
                        },
                        "timeout": 5
                    } satisfies MessageOpinion));
            },
        }, 
    ]
}), {
    single: false,
    sort: 'file',
    filter: file => file.length > 1
});