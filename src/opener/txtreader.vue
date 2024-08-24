<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { onMounted, reactive, ref, render } from "vue";

    const _prop = defineProps(['option']),
        file = _prop.option as vFile,
        container = ref<HTMLDivElement>(),
        FONT_SIZE = 16,
        ui = reactive({
            helper: false
        });

    const contents = await (await fetch(file.url)).text();

    // 写入文本并不断调整适应div大小
    // 返回末尾在content对应的位置
    async function renderContent(index: number, backward = false){
        debugger;
        if(!container.value) throw new Error('container not ready');
        // 估算大概能写入的文字
        const size = container.value.getBoundingClientRect(),
            charlen = Math.floor(size.width / FONT_SIZE * 1.5) * Math.floor(size.height / FONT_SIZE / 1.5),
            content = contents.substring(backward ? index - charlen : index, backward ? index : index + charlen);
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
               : content.substring(0, pos2 +1)) + '...';
        }
    }

    const next = () => renderContent(endpos! +1).then(pos => {startpos = endpos!, endpos = pos}),
        prev = () => renderContent(endpos!, true).then(pos => {endpos = startpos, startpos = pos});

    let startpos = 0;
    let endpos: null | number = null;
    onMounted(() => renderContent(0).then(pos => endpos = pos));

    // 各种事件
    function handleClick(event: MouseEvent){
        if(event.button != 0) return;
        if(event.x <= container.value!.clientWidth / 3)
            prev();
        else if(event.x >= container.value!.clientWidth * 2 / 3)
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
                if(delta > FONT_SIZE * 3)
                    prev();
                else if(delta < FONT_SIZE * 3)
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
</script>

<template>
    <div class="txt-wrapper">
        <div class="txt-content" ref="container"
            :style="{ fontSize: `${FONT_SIZE}px` }"
            @click="handleClick" @keypress="handleKbd"
            @touchstart="handleTouch" @touchmove="handleTouch" @touchend="handleTouch"
        ></div>
        <div class="prev" @click="prev"></div>
        <div class="next" @click="next"></div>
        <div class="helper" v-show="ui.helper"></div>
    </div>
</template>

<style lang="scss" >
    @import "@/icon.scss";

    .txt-wrapper {
        position: relative;
        height: 100%;

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
            height: 100%;
            max-height: 30rem;
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
    }
</style>