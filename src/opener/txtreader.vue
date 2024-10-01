<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { alert, FS, getConfig, message, openSetting, regConfig, reqFullscreen, UI } from "@/utils";
    import { generateTxtDB, loadTxtDB, TxtDB } from './txt/txtdb';
    import { onMounted, reactive, ref, watch } from "vue";

    const _prop = defineProps(['option']),
        file = _prop.option as vFile,
        container = ref<HTMLDivElement>(),
        ui = reactive({
            helper: false,
            chapter: false,
            goto: false,
            state: 0
        });

    if(!history[file.path]) history[file.path] = { bookmarks: [], readed: 0 };

    const cache = history[file.path], bookmark = reactive<Array<number>>(cache.bookmarks);

    // 读书进度缓存
    watch(() => ui.state, readed => cache.readed = readed);
    watch(() => bookmark, () => cache.bookmarks = bookmark);

    let contents: undefined | string;
    let db: TxtDB | undefined;
    let cached = CONFIG.cache.value;

    if(cached){
        try{
            const stat = await FS.stat(file.path + '.vtc');
            if(stat.type == 'dir') throw new Error('not a file');
            db = await loadTxtDB(stat);
        }catch(e){
            console.error(e);
            cached = false;
            alert({
                "type": "prompt",
                "title": "更新缓存",
                "message": "我们需要知道章节标题格式，请输入格式\n如：'第%章 ...' 匹配 '第1章 前情介绍'！",
                "callback": async (format) => {
                    // 生成正则
                    const reg = new RegExp((format as string)
                        .replace(/\s+/g, '\\s+').replace('%', '(?:[0-9一二三四五六七八九十百千万]+)').replace('...', '(.*)')
                     + '(?:\\r|\\n)+');
                    // 生成数据库
                    const data = await generateTxtDB(file, reg);
                    // 写入文件
                    await FS.write(file.path + '.vtc', data);
                    // 提示
                    message({
                        "type": "info",
                        "title": "TXT缓存成功",
                        "content": {
                            "title": "小说缓存成功",
                            "content": "重新打开标签页就可以体验啦"
                        },
                        "timeout": 5
                    });
                }
            });
            contents = await ( await fetch(file.url) ).text();
        }
    }else{
        contents = await ( await fetch(file.url) ).text();
    }

    async function getContent(start: number, end: number){
        if(cached){
            return db!.read(start, end);
        }else{
            return contents!.slice(start, end);
        }
    }

    // 写入文本并不断调整适应div大小
    // 返回末尾在content对应的位置
    async function renderContent(index: number, backward = false){
        if(!container.value) throw new Error('container not ready');
        // 估算大概能写入的文字
        const size = container.value.getBoundingClientRect(),
            charlen = Math.floor(size.width / CONFIG.fontSize.value * 1.5) * Math.floor(size.height / CONFIG.fontSize.value / 1.5),
            content = await getContent(backward ? index - charlen : index, backward ? index : index + charlen);
        // 写入内容
        container.value.innerText = content;
        let step = 20, pos2 = backward ? 0 : content.length;
        // 防止死循环
        if(container.value.scrollHeight <= size.height) return backward ? index - charlen : index + charlen;
        while(true){
            // 逐渐靠近合理字数
            if(container.value.scrollHeight > size.height){
                if(step != 20) step = Math.floor(step / 2);
                if(backward){
                    pos2 += step;
                }else{
                    pos2 -= step;
                }
            }else if(container.value.scrollHeight < size.height){
                step = Math.floor(step / 2);
                if(backward){
                    pos2 -= step;
                }else{
                    pos2 += step;
                }
            }else{
                const end = backward ? index - pos2 : pos2 + index,
                    start = backward ? index - charlen : index;
                ui.state = start / (contents?.length || db!.length) * 100;
                return end;
            }
            container.value.innerText = (backward
               ? content.substring(pos2, content.length)
               : content.substring(0, pos2 +1)) + '  ...';
        }
    }

    const next = () => startpos <= (contents?.length || db!.length) && renderContent(endpos! +1).then(pos => {startpos = endpos!, endpos = pos}),
        prev = () => endpos != null && endpos >= 0 && renderContent(endpos!, true).then(pos => {endpos = startpos, startpos = pos});

    let startpos = 0;
    let endpos: null | number = null;
    onMounted(() => renderContent(0).then(pos => endpos = pos));

    // 各种事件
    function handleClick(event: MouseEvent){
        if(event.button != 0) return;
        const size = container.value!.getBoundingClientRect();
        if(event.offsetX <= size.width / 3)
            prev();
        else if(event.offsetX >= size.width * 2 / 3)
            next();
        else
            ui.helper = true;
    }
    let pos_start = [0, 0],
        pos_end = [0, 0];
    function handleTouch(event: TouchEvent){
        switch(event.type){
            case 'touchstart':
                pos_start = [event.touches[0].clientX, event.touches[0].clientY];
                break;
            case 'touchmove':
                pos_end = [event.touches[0].clientX, event.touches[0].clientY];
                break;
            case 'touchend':
                const delta = Math.abs(pos_end[0] - pos_start[0]);
                if(delta > CONFIG.fontSize.value * 3)
                    prev();
                else if(delta < CONFIG.fontSize.value * 3)
                    next();
                else
                    ui.helper = true;
                break;
        }
    }
    function handleKbd(event: KeyboardEvent){
        switch(event.key){
            case 'ArrowRight':
                next();
                break;
            case 'ArrowLeft':
                prev();
                break;
            default: return;
        }
        event.preventDefault();
    }
    function handleWheel(event: WheelEvent){
        if(event.deltaY < 0)
            prev();
        else
            next();
        event.preventDefault();
    }
    function handleResize(){
        if(container.value)
            renderContent(endpos!);
    }
    watch(UI.app_width, handleResize);
</script>

<script lang="ts">
    regConfig('TxtReader', [
        {
            "name": "TXT缓存",
            "key": "cache",
            "type": "check",
            "default": false,
            "desc": "是否缓存TXT文件内容，以提高打开和翻页速度"
        },{
            "name": "字体大小",
            "key": "fontSize",
            "type": "number",
            "default": 16,
            "step": 1,
            "desc": "显示的字体大小"
        },{
            "name": "夜间模式",
            "key": "dark",
            "type": "check",
            "default": false,
            "desc": "是否使用暗色夜间模式"
        }
    ]);
    const CONFIG = getConfig('TxtReader'),
        fullscreen = () => UI.fullscreen.value ? document.exitFullscreen() : reqFullscreen();

    // 读书进度书签缓存
    const history = JSON.parse(localStorage.getItem("v_txtCache") || "{}") as Record<string, {
        bookmarks: Array<number>,
        readed: number
    }>;
    window.addEventListener('beforeunload', () => localStorage.setItem("v_txtCache", JSON.stringify(history)));
</script>

<template>
    <div class="txt-wrapper" :dark="CONFIG.dark.value">
        <div class="txt-content" ref="container"
            :style="{ fontSize: `${CONFIG.fontSize.value}px` }"
            @click="handleClick" @keypress="handleKbd" @wheel="handleWheel"
            @touchstart="handleTouch" @touchmove="handleTouch" @touchend="handleTouch"
        ></div>
        <div class="prev" vs-icon="left" @click="prev"></div>
        <div class="next" vs-icon="right" @click="next"></div>
        <div class="mask" v-show="ui.helper || ui.chapter" @click="ui.helper = ui.chapter = false"></div>
        <div class="helper" v-show="ui.helper">
            <button @click="bookmark.push(endpos! / db!.length)" v-if="cached">
                <svg viewBox="0 0 16 16">
                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z"/>
                </svg>
                <span>书签</span>
            </button>
            <button :active="ui.goto" @click="ui.goto = !ui.goto" v-if="cached">
                <svg viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M3.646 9.146a.5.5 0 0 1 .708 0L8 12.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708zm0-2.292a.5.5 0 0 0 .708 0L8 3.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708z"/>
                </svg>
                <span>转到</span>
            </button>
            <button @click="ui.chapter = !ui.chapter" v-if="cached">
                <svg viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                </svg>
                <span>目录</span>
            </button>
            <button @click="openSetting('TxtReader')">
                <svg viewBox="0 0 16 16">
                    <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13z"/>
                </svg>
                <span>设置</span>
            </button>
            <button @click="fullscreen">
                <svg viewBox="0 0 16 16">
                    <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
                    <path d="M2 4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H3v2.5a.5.5 0 0 1-1 0v-3zm12 7a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H13V8.5a.5.5 0 0 1 1 0v3z"/>
                </svg>
                <span>全屏</span>
            </button>
        </div>
        <div class="goto" v-if="ui.goto">
            <input type="range" min="0" max="1" step="0.001" @change="
                startpos = ($event.target as HTMLInputElement).valueAsNumber * db!.length;
                renderContent(startpos).then(ed => endpos = ed);
            " :value="ui.state / 100">
        </div>
        <div class="chapters" v-if="ui.chapter">
            <div v-for="(mark, id) of bookmark"
                @click="renderContent(mark * db!.length).then(ed => endpos = ed)"
            >
                书签 {{ id +1 }} ({{ mark.toFixed(2) }}%)
            </div>
            <ol>
                <template v-for="item in db!.chapter"> 
                    <li  v-if="item.title" @click="
                        startpos = item.offset ;
                        renderContent(item.offset).then(ed => endpos = ed);
                        ui.chapter = ui.helper = false" :data-offset="item.offset
                    ">
                        {{ item.title }}
                    </li>
                </template>
            </ol>
        </div>
        <span class="state">{{ ui.state.toFixed(2) }}%</span>
    </div>
</template>

<style lang="scss" >
    @font-face {
        font-family: 'GenJyuuGothic';
        src: url('/font/GenJyuuGothic-Regular.woff2') format('woff2');
    }

    .txt-wrapper {
        position: relative;
        height: 100%;

        > .mask{
            position: absolute;
            inset: 0;
            background-color: rgba(128, 128, 128, 0.2);
        }

        > .txt-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
            color: #333;
            font-family: 'GenJyuuGothic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

            padding: 1rem;
            box-sizing: border-box;
            width: 100%;
            max-width: 25rem;
            height: 90%;
            overflow: auto;
        }

        > .prev{
            left: 0;
        }

        > .next{
            right: 0;
        }

        > .prev, > .next{
            opacity: .3;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            width: 2rem;
            height: 2rem;
            transition: opacity .3s ease-in-out;
            user-select: none;

            &:hover{
                opacity: 1;
            }
        }

        > .helper{
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            background-color: rgb(245, 245, 255);

            > *{
                display: block;
                border: none;
                outline: none;
                padding: .45rem 1rem;
                border-radius: 0;
                background-color: transparent;
                font-size: .7em;

                > svg{
                    fill: currentColor;
                    width: 1.5em;
                    height: 1.5em;
                    display: block;
                    margin: auto;
                }

                > span{
                    display: block;
                }

                &:hover, &[active=true]{
                    background-color: #ebebeb;
                }
            }
        }

        > .chapters{
            position: absolute;
            right: 0;
            top: 0;
            z-index: 5;
            background-color: rgb(250 247 247);
            width: 80%;
            padding: .75rem .75rem .75rem 0;
            box-sizing: border-box;
            height: 100%;
            max-width: 15rem;
            box-shadow: 0 0 .85rem #cfcfcf;
            transition: all .2s;
            overflow-x: hidden;
            overflow-y: auto;
            font-size: .8em;
            margin: 0;

            > div{
                display: block;
                position: absolute;
                width: 100%;
                box-sizing: border-box;
                margin-left: 1.5rem;

                &::before{
                    content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23007bff" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>');
                    position: absolute;
                    left: -1.25rem;
                    top: .35rem;
                    height: 1rem;
                    width: 1rem;
                }
            }

            > ol > li, > div{
                padding: .35rem .25rem;
                cursor: pointer;
                transition: background-color .2s ease-in-out;

                &:hover{
                    background-color: #f5f5f5;
                }
            }

            &[display=false]{
                transform: translateX( 120% );
                opacity: 0;
            }
        }

        > .goto{
            position: absolute;
            bottom: 4.5rem;
            left: 1rem;
            right: 1rem;
            margin: auto;
            max-width: 15rem;
            background-color: white;
            padding: .5rem 1.25rem;
            border-radius: .35rem;
            box-shadow: 0 0 .5rem .05rem #d9d9d9;

            > input{
                width: 100%;

                &::-webkit-slider-thumb {
                    transform: scale(1.2);
                    box-shadow: 0 0 .75rem rgb(121, 183, 249);
                    border-radius: 2rem;
                }
            }
        }

        > .state{
            position: absolute;
            top: .75rem;
            right: .5rem;
            font-size: 0.85em;
            color: rgb(202 202 202);
            font-family: 'Repair';
        }

        &[dark=true]{
            background-color: #605b5b;

            > .txt-content{
                color: #fff;
            }

            > .prev, > .next{
                filter: invert(1);
            }

            > .helper{
                background-color: #262626;

                > *{
                    color: #fff;

                    &:hover, &[active=true]{
                        background-color: #575757;
                    }
                }
            }

            > .chapters{
                background-color: #1f1f1f;
                box-shadow: 0 0 .85rem #111;

                > li{
                    color: #fff;

                    &:hover{
                        background-color: #707070;
                    }
                }
            }

            > .goto{
                background-color: #585858;
                box-shadow: 0 0 .5rem -.05rem #4e4e4e;
            }

            > .state{
                color: #999;
            }
        }
    }
</style>