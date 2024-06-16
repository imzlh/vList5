import type { MessageOpinion, OpenerOption, vFile } from './data';
// import Artplayer from './opener/artplayer.vue';
import vPlayer from './opener/vplayer.vue';
import APlayer from './opener/aplayer.vue';
import VScode from './opener/vscode.vue';
// import Viewer from './opener/viewer.vue';
import Imager from './opener/imager.vue';
import Browser from './opener/browser.vue';
import vLite from './opener/vlite.vue';
import { Global } from './utils';

const VIEWER_ICON = "data:image/svg+xml,<svg viewBox=\"0 0 1024 1024\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M184.5 207.1h751.2v608.2H184.5z\" fill=\"%2391B4FF\"></path><path d=\"M87.8 603c-13.3 0-24.2-10.8-24.2-24.2v-49.2c0-13.3 10.8-24.2 24.2-24.2s24.2 10.8 24.2 24.2v49.2c0 13.4-10.8 24.2-24.2 24.2z\" fill=\"%233778FF\" ></path><path d=\"M935.6 839.4H87.8c-13.3 0-24.2-10.8-24.2-24.2V665.5c0-13.3 10.8-24.2 24.2-24.2s24.2 10.8 24.2 24.2v125.6h799.5V231.2H112v202.1c0 13.3-10.8 24.2-24.2 24.2s-24.2-10.8-24.2-24.2V207.1c0-13.3 10.8-24.2 24.2-24.2h847.8c13.3 0 24.2 10.8 24.2 24.2v608.2c0 13.3-10.8 24.1-24.2 24.1z\" fill=\"%233778FF\"></path><path d=\"M643.7 836H107.3c-9.7 0-18.5-5.8-22.3-14.8-3.8-9-1.8-19.3 5-26.3L358.3 522c9.1-9.2 25.4-9.2 34.5 0L661 794.8c6.8 7 8.8 17.3 5 26.3-3.8 9-12.6 14.9-22.3 14.9zM165 787.7h421.1L375.5 573.4 165 787.7z\" fill=\"%233778FF\"></path><path d=\"M927.9 836H638.2c-13.3 0-24.2-10.8-24.2-24.2s10.8-24.2 24.2-24.2h234L672.5 574.3 545.2 710.2c-9.1 9.7-24.4 10.3-34.2 1.1-9.7-9.1-10.2-24.4-1.1-34.2l144.9-154.7c9.1-9.8 26.2-9.8 35.3 0l255.5 272.8c6.6 7 8.4 17.3 4.5 26.1-3.9 9-12.6 14.7-22.2 14.7zM677.8 473.6c-57.2 0-103.7-46.5-103.7-103.7s46.5-103.7 103.7-103.7 103.7 46.5 103.7 103.7-46.6 103.7-103.7 103.7z m0-159.1c-30.5 0-55.4 24.8-55.4 55.4s24.8 55.4 55.4 55.4 55.4-24.8 55.4-55.4-24.9-55.4-55.4-55.4z\" fill=\"%233778FF\"></path></svg>";
const VPLAYER_ICON = 'data:image/svg+xml,<svg class="icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13134"><path d="M675.84-34.13333333l273.06666667 273.06666666v764.58666667c0 30.03733333-24.576 54.61333333-54.61333334 54.61333333H129.70666667c-30.03733333 0-54.61333333-24.576-54.61333334-54.61333333V20.48c0-30.03733333 24.576-54.61333333 54.61333334-54.61333333h546.13333333z m-46.42133333 385.024l-207.53066667 62.80533333c-24.576 8.192-46.42133333 32.768-46.42133333 57.344v218.45333333s-16.384-10.92266667-49.152-5.46133333c-46.42133333 8.192-87.38133333 46.42133333-87.38133334 87.38133333s40.96 62.80533333 90.112 57.344c49.152-8.192 84.65066667-43.69066667 84.65066667-81.92v-210.26133333c0-16.384 21.84533333-24.576 21.84533333-24.576l182.95466667-57.344s19.11466667-5.46133333 19.11466667 10.92266667v174.76266666s-19.11466667-10.92266667-51.88266667-5.46133333c-49.152 5.46133333-90.112 43.69066667-90.112 81.92s40.96 65.536 90.112 60.07466667c49.152-5.46133333 90.112-43.69066667 90.112-81.92V383.65866667c0-24.576-21.84533333-40.96-46.42133333-32.768z" fill="%238183F1"></path><path d="M675.84-34.13333333l273.06666667 273.06666666H675.84z" fill="%23B0B0FF"></path></svg>'

export const OPENER:Array<OpenerOption> = [
    // ArtPlayer
    // @link https://artplayer.org/
    // {
    //     "name": "ArtPlayer",
    //     "type": "media/video",
    //     "typeDesc": "播放视频",
    //     "icon": 'app/artplayer.webp',
    //     "format": [
    //         "mp4",
    //         "webm",
    //         "mkv",
    //         "ogv",
    //         "flv",
    //         "m3u8",
    //         "ts",
    //         "mpg"
    //     ],
    //     open(file) {
    //         Global('ui.window.add').call({
    //             "content": Artplayer,
    //             "icon": 'app/artplayer.webp',
    //             "name": "artplayer",
    //             "option": file
    //         }, file);
    //     }
    // },
    // APlayer-ts
    // @link https://github.com/liuly0322/aplayer-ts
    // @link https://aplayer.js.org/
    // {
    //     "name": "APlayer",
    //     "icon": "app/aplayer.webp",
    //     "type": "media/audio",
    //     "typeDesc": "播放音乐",
    //     "format":[
    //         "mp3",
    //         "wav",
    //         "flac",
    //         "opus",
    //         "mka",
    //         "m4a",
    //         "ogg"
    //     ],
    //     open(file) {
    //         Global('ui.window.add').call({
    //             "content": APlayer,
    //             "icon": 'app/aplayer.webp',
    //             "name": "APlayer",
    //             "option": file
    //         }, file);
    //     },
    // },
    // Monaco-Editor(VsCode)
    // @link https://microsoft.github.io/monaco-editor/
    {
        "name": "VSCode",
        "type": "text/coder",
        "typeDesc": "在线编辑代码",
        "icon": 'app/vscode.webp',
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
        open(file) {
            if(file.size > 1 * 1024 * 1024)
                Global('ui.message').call({
                    "type": "error",
                    "title": "VSCode",
                    "content": {
                        "title": '打开文件失败',
                        "content": "文件大小超过了最大限制(1M)"
                    }
                } satisfies MessageOpinion);
            else
                Global('ui.window.add').call({
                "content": VScode,
                "icon": 'app/vscode.webp',
                "name": file.name + " - VSCode",
                "option": file
            }, file);
        },
    },
    // viewer.js
    // @link https://github.com/fengyuanchen/viewerjs/
    // {
    //     "name": "Viewer",
    //     "type": "media/image",
    //     "icon": VIEWER_ICON,
    //     "typeDesc": "简约的图片浏览器",
    //     "format": [
    //         "avif",
    //         "webp",
    //         "jpg", "jpeg", "jxl",
    //         "png",
    //         "ico",
    //         "bmp"
    //     ],
    //     open(file) {
    //         Global('ui.window.add').call({
    //             "content": Viewer,
    //             "icon": VIEWER_ICON,
    //             "name": "imgViewer",
    //             "option": file
    //         }, file);
    //     },
    // },
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
            "bmp"
        ],
        open(file) {
            Global('ui.window.add').call({
                "content": Imager,
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
        "icon": "app/chrome.webp",
        "type": "application/html",
        "typeDesc": "使用你的浏览器打开",
        "format": [
            "pdf"
        ],
        open(file) {
            Global('ui.window.add').call({
                "content": Browser,
                "icon": "app/chrome.webp",
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
        open(file) {
            Global('ui.window.add').call({
                "content": vPlayer,
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
        "icon": "app/vlite.svg",
        "type": "media/audio",
        "typeDesc": "高颜值的音乐播放器",
        "format":[
            "mp3",
            "wav",
            "flac",
            "opus",
            "mka",
            "m4a",
            "ogg"
        ],
        open(file) {
            Global('ui.window.add').call({
                "content": vLite,
                "icon": 'app/vlite.svg',
                "name": "vLite",
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
    throw new Error('not found');
}