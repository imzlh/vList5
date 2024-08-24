<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { FS, getConfig, Global, regConfig, UI } from "@/utils";
    import { generateTxtDB, loadTxtDB, TxtDB } from "@/utils/txtdb";
    import { onMounted, reactive, ref, render, watch } from "vue";

    const _prop = defineProps(['option']),
        file = _prop.option as vFile,
        container = ref<HTMLDivElement>(),
        ui = reactive({
            helper: false,
            chapter: false
        });

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
            Global('ui.alert').call({
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
                    Global('ui.message').call({
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
                return backward ? index - pos2 : pos2 + index;
            }
            container.value.innerText = (backward
               ? content.substring(pos2, content.length)
               : content.substring(0, pos2 +1)) + '  ...';
        }
    }

    const next = () => renderContent(endpos! +1).then(pos => {startpos = endpos!, endpos = pos}),
        prev = () => endpos && endpos > 0 && renderContent(endpos!, true).then(pos => {endpos = startpos, startpos = pos});

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
        }
    ]);
    const CONFIG = getConfig('TxtReader');
</script>

<template>
    <div class="txt-wrapper">
        <div class="txt-content" ref="container"
            :style="{ fontSize: `${CONFIG.fontSize.value}px` }"
            @click="handleClick" @keypress="handleKbd" @wheel="handleWheel"
            @touchstart="handleTouch" @touchmove="handleTouch" @touchend="handleTouch"
        ></div>
        <div class="prev" @click="prev"></div>
        <div class="next" @click="next"></div>
        <div class="mask" v-show="ui.helper || ui.chapter" @click="ui.helper = ui.chapter = false"></div>
        <div class="helper" v-show="ui.helper">
            <button @click="ui.chapter = !ui.chapter" v-if="cached">
                <svg viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                </svg>
                <span>目录</span>
            </button>
        </div>
        <ol class="chapters" v-if="ui.chapter">
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
</template>

<style lang="scss" >
    @import "@/icon.scss";

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

            padding: 1rem;
            box-sizing: border-box;
            width: 100%;
            max-width: 25rem;
            height: 90%;
            overflow: auto;
        }

        > .prev{
            content: $icon_left;
            left: 0;
        }

        > .next{
            content: $icon_right;
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

                &:hover{
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
            padding: 0.75rem 0.75rem 0.75rem 2.25rem;
            box-sizing: border-box;
            height: 100%;
            max-width: 15rem;
            box-shadow: 0 0 .85rem #cfcfcf;
            transition: all .2s;
            overflow-x: hidden;
            overflow-y: auto;
            font-size: .8em;
            margin: 0;

            > li{
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
    }
</style>