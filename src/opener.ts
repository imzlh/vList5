import I_VSCODE from '/app/vscode.webp';
import I_CHROME from '/app/chrome.webp';
import I_HEX from '/app/hex.webp';
import type { MessageOpinion, OpenerOption, vFile } from './env';
import { clipFName, Global } from './utils';
import I_ART from '/app/artplayer.webp';
import I_APLAYER from '/app/aplayer.webp';
import I_VLITE from "/app/vlite.svg";
import I_MUYA from '/app/muya.webp';

const VIEWER_ICON = "data:image/svg+xml,<svg viewBox=\"0 0 1024 1024\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M184.5 207.1h751.2v608.2H184.5z\" fill=\"%2391B4FF\"></path><path d=\"M87.8 603c-13.3 0-24.2-10.8-24.2-24.2v-49.2c0-13.3 10.8-24.2 24.2-24.2s24.2 10.8 24.2 24.2v49.2c0 13.4-10.8 24.2-24.2 24.2z\" fill=\"%233778FF\" ></path><path d=\"M935.6 839.4H87.8c-13.3 0-24.2-10.8-24.2-24.2V665.5c0-13.3 10.8-24.2 24.2-24.2s24.2 10.8 24.2 24.2v125.6h799.5V231.2H112v202.1c0 13.3-10.8 24.2-24.2 24.2s-24.2-10.8-24.2-24.2V207.1c0-13.3 10.8-24.2 24.2-24.2h847.8c13.3 0 24.2 10.8 24.2 24.2v608.2c0 13.3-10.8 24.1-24.2 24.1z\" fill=\"%233778FF\"></path><path d=\"M643.7 836H107.3c-9.7 0-18.5-5.8-22.3-14.8-3.8-9-1.8-19.3 5-26.3L358.3 522c9.1-9.2 25.4-9.2 34.5 0L661 794.8c6.8 7 8.8 17.3 5 26.3-3.8 9-12.6 14.9-22.3 14.9zM165 787.7h421.1L375.5 573.4 165 787.7z\" fill=\"%233778FF\"></path><path d=\"M927.9 836H638.2c-13.3 0-24.2-10.8-24.2-24.2s10.8-24.2 24.2-24.2h234L672.5 574.3 545.2 710.2c-9.1 9.7-24.4 10.3-34.2 1.1-9.7-9.1-10.2-24.4-1.1-34.2l144.9-154.7c9.1-9.8 26.2-9.8 35.3 0l255.5 272.8c6.6 7 8.4 17.3 4.5 26.1-3.9 9-12.6 14.7-22.2 14.7zM677.8 473.6c-57.2 0-103.7-46.5-103.7-103.7s46.5-103.7 103.7-103.7 103.7 46.5 103.7 103.7-46.6 103.7-103.7 103.7z m0-159.1c-30.5 0-55.4 24.8-55.4 55.4s24.8 55.4 55.4 55.4 55.4-24.8 55.4-55.4-24.9-55.4-55.4-55.4z\" fill=\"%233778FF\"></path></svg>";
const VPLAYER_ICON = 'data:image/svg+xml,<svg class="icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" p-id="13134"><path d="M675.84-34.13333333l273.06666667 273.06666666v764.58666667c0 30.03733333-24.576 54.61333333-54.61333334 54.61333333H129.70666667c-30.03733333 0-54.61333333-24.576-54.61333334-54.61333333V20.48c0-30.03733333 24.576-54.61333333 54.61333334-54.61333333h546.13333333z m-46.42133333 385.024l-207.53066667 62.80533333c-24.576 8.192-46.42133333 32.768-46.42133333 57.344v218.45333333s-16.384-10.92266667-49.152-5.46133333c-46.42133333 8.192-87.38133333 46.42133333-87.38133334 87.38133333s40.96 62.80533333 90.112 57.344c49.152-8.192 84.65066667-43.69066667 84.65066667-81.92v-210.26133333c0-16.384 21.84533333-24.576 21.84533333-24.576l182.95466667-57.344s19.11466667-5.46133333 19.11466667 10.92266667v174.76266666s-19.11466667-10.92266667-51.88266667-5.46133333c-49.152 5.46133333-90.112 43.69066667-90.112 81.92s40.96 65.536 90.112 60.07466667c49.152-5.46133333 90.112-43.69066667 90.112-81.92V383.65866667c0-24.576-21.84533333-40.96-46.42133333-32.768z" fill="%238183F1"></path><path d="M675.84-34.13333333l273.06666667 273.06666666H675.84z" fill="%23B0B0FF"></path></svg>'
const FONT_ICON = 'data:image/svg+xml,<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M767.872 951.04H275.328C163.584 951.04 72.96 860.416 72.96 748.672V256.128C72.96 144.384 163.584 53.76 275.328 53.76h492.544C879.616 53.76 970.24 144.384 970.24 256.128v492.544c0 111.744-90.624 202.368-202.368 202.368z" fill="%230079F5"></path><path d="M647.68 312.192h-44.416L462.208 642.56h49.152l38.912-93.696h150.4l38.912 93.696h49.152L647.68 312.192z m36.864 197.504h-118.144L625.664 368.64l58.88 141.056zM374.272 386.048H343.04l-88.576 207.488h36.864l23.68-57.088h87.296l23.68 57.088h36.864l-88.576-207.488z m-46.848 120.32l31.232-74.496 31.104 74.496h-62.336z"></path></svg>';

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
        "icon": VIEWER_ICON,
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
                "icon": VIEWER_ICON,
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
        "icon": VPLAYER_ICON,
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
                "icon": VPLAYER_ICON,
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
                "icon": '/app/vlite.svg',
                "name": "vLite",
                "option": file
            }, file);
        },
    },
    // font-viewer V1
    // Copyright(C) 2024 izGroup
    {
        "name": "fontool",
        "icon": FONT_ICON,
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
                "icon": FONT_ICON,
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