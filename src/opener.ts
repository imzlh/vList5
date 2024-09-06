import I_VSCODE from '/app/vscode.webp';
import I_CHROME from '/app/chrome.webp';
import I_HEX from '/app/hex.webp';
import type { MessageOpinion, OpenerOption, vFile } from './env';
import { clipFName, Global } from './utils';
import I_ART from '/app/artplayer.webp';
import I_VLITE from "/app/vlite.svg";
import I_MUYA from '/app/muya.webp';
import I_VPLAYER from '/app/vplayer.webp';
import I_IMAGER from '/app/imager.webp';
import I_DESIGNER from '/app/desginer.webp';
import I_MEDIA from '/app/video.webp';
import I_PS from '/app/ps.webp';
import I_ASCIINEMA from '/app/asciinema.svg';
import I_NOTES from '/app/notes.webp';

export const OPENER:Array<OpenerOption> = [
    // Monaco-Editor(VsCode)
    // @link https://microsoft.github.io/monaco-editor/
    {
        "name": "VSCode",
        "type": "text/coder",
        "typeDesc": "在线编辑大部分代码，基于微软Monaco",
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
            "log", "ass", "vtt", "ssa", "srt"
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
                });
        },
    },
    // muya
    // @link https://github.com/marktext/muya?tab=readme-ov-file
    {
        "name": "Muya",
        "type": "text/markdown",
        "typeDesc": "在线编辑预览Markdown，所见即所得",
        "icon": I_MUYA,
        "format": [
            "md"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import ('@/opener/markdown.vue')).default,
                "icon": I_MUYA,
                "name": file.name + " - Muya",
                "option": file
            });
        },
    },
    // asciinema
    // @link https://asciinema.org/
    {
        "name": "Asciinema",
        "type": "text/asciinema",
        "typeDesc": "在线播放Asciinema终端录制的动画",
        "icon": I_ASCIINEMA,
        "format": [
            "cast"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/asciinema.vue')).default,
                "icon": I_ASCIINEMA,
                "name": file.name + " - Asciinema",
                "option": file
            });
        },
    },
    // imager.vue
    // 2024 izGroup copyright
    {
        "name": "Imager",
        "type": "media/image",
        "icon": I_IMAGER,
        "typeDesc": "简约而强大的图片浏览器",
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
            });
        },
    },
    // browser.vue
    // copyright(C) 2024 izGroup
    {
        "name": "Chrome",
        "icon": I_CHROME,
        "type": "application/html",
        "typeDesc": "使用你的浏览器打开这个文件",
        "format": [
            "pdf"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/browser.vue')).default,
                "icon": I_CHROME,
                "name": file.name + " - Chrome",
                "option": file
            });
        },
    },
    // vPlayer-vue
    // copyright(C) 2024 izGroup
    {
        "name": "vPlayer",
        "type": "media/video",
        "typeDesc": "使用强大的vPlayer播放视频，支持字幕",
        "icon": I_VPLAYER,
        "format": [
            "mp4",
            "webm",
            "mkv",
            "ogv",
            "mpg"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/vplayer.vue')).default,
                "icon": I_VPLAYER,
                "name": "vPlayer",
                "option": file
            });
        }
    },
    // vLite.vue
    // Copyright(C) 2024 izGroup
    {
        "name": "vLite",
        "icon": I_VLITE,
        "type": "media/audio",
        "typeDesc": "高颜值的音乐播放器，支持歌词",
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
            });
        },
    },
    // avPlayer <- libmedia
    // https://github.com/zhaohappy/libmedia/
    {
        "name": "avPlayer",
        "type": "media/*",
        "typeDesc": "播放vPlayer不支持的视频音频，基于ffmpeg",
        "icon": I_MEDIA,
        "format":[
            "webm",
            "mka",
            "mkv",
            "mp4",
            "m4a",
            "ogv",
            "ogg",
            "opus",
            "mp3",
            "flac",
            "pcm",
            "flv",
            "mov",
            "m2ts",
            "ivf",
            "wav"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/avplayer.vue')).default,
                "icon": I_MEDIA,
                "name": file.name ,
                "option": file
            });
        },
    },
    // filerobot-image-editor
    // @link https://github.com/scaleflex/filerobot-image-editor
    {
        "name": "imgEditor",
        "icon": I_DESIGNER,
        "type": "media/image",
        "typeDesc": "简单的在线图片编辑器",
        "format": [
            "jpg", "jpeg", "jxl",
            "png",
            "ico",
            "bmp",
            "svg"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/imgedit.vue')).default,
                "icon": I_DESIGNER,
                "name": file.name + " - imgEditor",
                "option": file
            });
        },
    },
    // excalidraw
    // @link https://github.com/excalidraw/excalidraw
    // {
    //     "name": "Excalidraw",
    //     "icon": I_DESIGNER,
    //     "type": "media/image",
    //     "typeDesc": "在线涂涂画画并同步到你的服务器",
    //     "format": [
    //         "excalidraw"
    //     ],
    //     async open(file) {
    //         Global('ui.window.add').call({
    //             "content": (await import('@/opener/whiteboard.vue')).default,
    //             "icon": I_DESIGNER,
    //             "name": file.name + " - Excalidraw",
    //             "option": file
    //         });
    //     },
    // },
    // psd.js
    // Copyright(C) 2024 izGroup
    {
        "name": "PS预览器",
        "icon": I_PS,
        "type": "media/image",
        "typeDesc": "PS图片预览，支持PSD图层",
        "format": [
            "psd",
            "psb"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/psdviewer.vue')).default,
                "icon": I_PS,
                "name": file.name + " - PS预览器",
                "option": file
            });
        },
    },
    // epub.js
    // @link https://github.com/futurepress/epub.js
    {
        "name": "epub浏览器",
        "icon": I_NOTES,
        "type": "application/epub",
        "typeDesc": "轻松浏览epub格式电子书",
        "format": [
            "epub"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/epub.vue')).default,
                "icon": I_NOTES,
                "name": file.name + " - epub",
                "option": file
            });
        }
    },
    // txtReader
    // Copyright(C) 2024 izGroup
    {
        "name": "TXT阅读",
        "icon": I_NOTES,
        "type": "text/plain",
        "typeDesc": "在线顺畅阅读TXT小说",
        "format": [
            "txt"
        ],
        async open(file) {
            Global('ui.window.add').call({
                "content": (await import('@/opener/txtreader.vue')).default,
                "icon": I_NOTES,
                "name": file.name + " - TXT阅读",
                "option": file
            });
        }
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
            });
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
            });
        },
    },
    // ArtPlayer
    // @link https://artplayer.org/
    {
        "name": "ArtPlayer",
        "type": "media/video",
        "typeDesc": "(deprecated)使用artplayer播放视频",
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
            });
        }
    }
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