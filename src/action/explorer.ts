import I_TOOL from '/icon/quicktool.webp';
import I_PATH from '/icon/path.webp';
import I_DOWNLOAD from '/icon/download.webp';
import I_LINK from '/icon/url.webp';
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

import Upload from '@/module/upload.vue';
import { FACTION, FS, alert, createWindow, getActiveFile, message, openFile, selectOpener, size2str } from "@/utils";
import type { AlertOpts, MessageOpinion, vDir, vFile } from "@/env";
import { CtxMenuRegister } from './main';

export const EXP_REG = new CtxMenuRegister();

// ==================== 文件夹操作 ======================

EXP_REG.register(indir => ({
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

EXP_REG.register(indir => ({
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

EXP_REG.register(indir => ({
    "text": "刷新",
    "icon": I_REFRESH,
    handle: () => FS.loadTree(indir)
}
), {
    'single': false,
    'sort': 'all'
});

EXP_REG.add_slash();

// ===================== 文件操作 ====================

EXP_REG.register(() => ({
    "text": "剪切",
    "icon": I_CUT,
    handle: () =>
        FACTION.mark('move')
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

EXP_REG.register(() => ({
    "text": "复制",
    "icon": I_COPY,
    handle: () =>
        FACTION.mark('copy')
}), {
    'single': false,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

EXP_REG.register(() => ({
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
    'sort': 'dir'
});

EXP_REG.register(() => ({
    "text": "删除",
    "icon": 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23b7a6a6" viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/></svg>',
    handle: async () => {
        try {
            await FS.del(getActiveFile()[0].path)
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

EXP_REG.register(() => ({
    "text": "重命名",
    "icon": I_RENAME,
    handle: () => getActiveFile()[0].rename = true,
}), {
    'single': true,
    'sort': 'all',
    'filter': all => !all.some(item => item.path == '/')
});

EXP_REG.add_slash();

// ==================== 实用工具 ====================

EXP_REG.register(() => ({
    "text": "打开",
    "icon": I_OPEN,
    handle: () => openFile(getActiveFile()[0] as vFile),
}), {
    'sort': 'file',
    'single': true
});

EXP_REG.register(() => ({
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

EXP_REG.add_slash();

EXP_REG.register(() => ({
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