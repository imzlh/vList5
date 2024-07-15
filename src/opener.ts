import I_VSCODE from '/app/vscode.webp';
import I_CHROME from '/app/chrome.webp';
import I_HEX from '/app/hex.webp';
import type { MessageOpinion, OpenerOption, vFile } from './env';
import { clipFName, Global } from './utils';
import I_ART from '/app/artplayer.webp';
import I_APLAYER from '/app/aplayer.webp';
import I_VLITE from "/app/vlite.svg";
import I_MUYA from '/app/muya.webp';
import I_VPLAYER from '/app/vplayer.webp';
import I_IMAGER from '/app/imager.webp';
import I_DESIGNER from '/app/desginer.webp';

export const OPENER:Array<OpenerOption> = [
    // Monaco-Editor(VsCode)
    // @link https://microsoft.github.io/monaco-editor/
    {
        "name": "VSCode",
        "type": "text/coder",
        "typeDesc": "在线编辑代码",
        "icon": I_VSCODE,
        "format": [
            "php",
            "js", "css",
            "scss", "ts",
            "json", "ini", "xml", "yaml",
            "c", "cpp", "h",
            "java",
            "go",
            "make",
            "perl", "pl",
            "sh", "bash", "cmd", "bat", "vbs",
            "dockerfile", "docker",
            "py", "jspy",
            "html", "htm", "xhtml",
            "txt", "log"
        ],
        async open(file) {
            if(file.size > 1 * 1024 * 1024)
                Global('ui.message').call({
                    "type": "error",
                    "title": "VSCode",
                    "content": {
                        "title": '打开文件失败',
                        "content": "文件大小超过了最大限制(1M)"
                    },
                    "timeout": 10
                } satisfies MessageOpinion);
            else
                Global('ui.window.add').call({
                    "content": (await import('@/opener/vscode.vue')).default,
                    "icon": I_VSCODE,
                    "name": file.name + " - VSCode",
                    "option": file
                }, file);
        },
    },
    // muya
    // @link https://github.com/marktext/muya?tab=readme-ov-file
    {
        "name": "Muya",
        "type": "text/markdown",
        "typeDesc": "在线编辑预览Markdown",
        "icon": I_MUYA,
        "format": [
            "md"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/markdown.vue')).default,
                "icon": I_MUYA,
                "name": file.name + " - Muya",
                "option": file
            }, file);
        },
    },
    // imager.vue
    // 2024 izGroup copyright
    {
        "name": "Imager",
        "type": "media/image",
        "icon": I_IMAGER,
        "typeDesc": "简约的图片浏览器",
        "format": [
            "avif",
            "webp",
            "jpg", "jpeg", "jxl",
            "png",
            "ico",
            "bmp",
            "svg"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/imager.vue')).default,
                "icon": I_IMAGER,
                "name": "imgViewer",
                "option": file
            }, file);
        },
    },
    // browser.vue
    // copyright(C) 2024 izGroup
    {
        "name": "Chrome",
        "icon": I_CHROME,
        "type": "application/html",
        "typeDesc": "使用你的浏览器打开",
        "format": [
            "pdf"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/browser.vue')).default,
                "icon": I_CHROME,
                "name": file.name + " - Chrome",
                "option": file
            }, file);
        },
    },
    // vPlayer-vue
    // copyright(C) 2024 izGroup
    {
        "name": "vPlayer",
        "type": "media/video",
        "typeDesc": "播放视频",
        "icon": I_VPLAYER,
        "format": [
            "mp4",
            "webm",
            "mkv",
            "ogv",
            "flv",
            "m3u8",
            "ts",
            "mpg"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/vplayer.vue')).default,
                "icon": I_VPLAYER,
                "name": "vPlayer",
                "option": file
            }, file);
        }
    },
    // vLite.vue
    // Copyright(C) 2024 izGroup
    {
        "name": "vLite",
        "icon": I_VLITE,
        "type": "media/audio",
        "typeDesc": "高颜值的音乐播放器",
        "format":[
            "mp3",
            "wav",
            "flac",
            "opus",
            "mka",
            "m4a",
            "ogg",
            "cue"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/vlite.vue')).default,
                "icon": I_VLITE,
                "name": "vLite",
                "option": file
            }, file);
        },
    },
    // font-viewer V1
    // Copyright(C) 2024 izGroup
    {
        "name": "fontool",
        "icon": I_DESIGNER,
        "type": "applcation/font",
        "typeDesc": "字体预览工具",
        "format": [
            "woff",
            "woff2",
            "ttf",
            "otf",
            "eof"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/font-view.vue')).default,
                "icon": I_DESIGNER,
                "name": "Font-" + clipFName(file,20),
                "option": file
            }, file);
        },
    },
    // HexViewer V1
    // Copyright(C) 2024 izGroup
    {
        "name": "HexViewer",
        "icon": I_HEX,
        "type": "*",
        "typeDesc": "二进制预览工具",
        "format": [
            "bin"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/hex.vue')).default,
                "icon": I_HEX,
                "name": "Hex-" + clipFName(file,20),
                "option": file
            }, file);
        },
    },
    // ArtPlayer
    // @link https://artplayer.org/
    {
        "name": "ArtPlayer",
        "type": "media/video",
        "typeDesc": "播放视频",
        "icon": I_ART,
        "format": [
            "mp4",
            "webm",
            "mkv",
            "ogv",
            "flv",
            "m3u8",
            "ts",
            "mpg"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/artplayer.vue')).default,
                "icon": I_ART,
                "name": "artplayer",
                "option": file
            }, file);
        }
    },
    // APlayer-ts
    // @link https://github.com/liuly0322/aplayer-ts
    // @link https://aplayer.js.org/
    {
        "name": "APlayer",
        "icon": I_APLAYER,
        "type": "media/audio",
        "typeDesc": "播放音乐",
        "format":[
            "mp3",
            "wav",
            "flac",
            "opus",
            "mka",
            "m4a",
            "ogg"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/aplayer.vue')).default,
                "icon": I_APLAYER,
                "name": "APlayer",
                "option": file
            }, file);
        },
    },
];

export function regSelf(name:string,open:(file:vFile) => any){
    for (let i = 0; i < OPENER.length; i++)
        if(OPENER[i].name == name){
            let raw = OPENER[i].open;
            OPENER[i].open = open;
            return () => OPENER[i].open = raw;
        }
    
    throw new TypeError('ERROR: '+ name +' not found');
}