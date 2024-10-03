<script setup lang="ts">
    import type { vFile } from '@/env';
    import { regSelf } from '@/opener';
    import { createWindow, reqFullscreen, UI } from '@/utils';
    import { onMounted, onUnmounted, ref, shallowRef } from 'vue';
    import { ImageManager } from './image/imager';
    import I_DESIGNER from '/app/desginer.webp';

    const boxElem = ref<HTMLDivElement>(),
        opts_ = defineProps(['option']),
        file = opts_['option'] as vFile,
        ev = defineEmits(['show']);

    let manager = shallowRef<ImageManager>();

    onMounted(() => {
        if(!boxElem.value) return;
        manager.value = new ImageManager(boxElem.value);
        manager.value.setImage(file);
    });

    const fullscreen = () => document.fullscreenElement ? document.exitFullscreen() : reqFullscreen();
    const openEditor = () => import('./imgedit.vue').then(m => createWindow({
        "name": "图片编辑",
        "icon": I_DESIGNER,
        "content": m.default,
        "option": file,
        "onDestroy": () => ev('show')
    }));

    const unreg = regSelf('Imager',f => {
        manager.value && manager.value.setImage(f);
        ev('show');
    });
    onUnmounted(() => unreg());
</script>

<template>
    <div class="image-viewer" ref="boxElem" tabindex="-1" v-bind="$attrs">
        <div class="ctrl" v-if="manager">
            <!-- 缩小 -->
            <div @click="manager.scale -= 0.1" vs-icon="zoom-small" button />
            <!-- 放大 -->
            <div @click="manager.scale += 0.1" vs-icon="zoom-large" button />
            <!-- 上一个 -->
            <div @click="manager.prev()" vs-icon="small-left" button />
            <!-- 编辑 -->
            <a @click="openEditor" vs-icon="edit" button />
            <!-- 下一个 -->
            <div @click="manager.next()" vs-icon="small-right" button />
            <!-- 旋转 -->
            <div @click="manager.rotate += 90" vs-icon="rotate" button />
            <!-- 全屏 -->
            <div @click="fullscreen" button :vs-icon="UI.fullscreen ? 'exit-fullscreen' : 'fullscreen'" />
        </div>
        <span class="vcount" v-if="manager">{{ manager.id_ref.value + 1 }} / <span style="color: darkgray;">{{ manager.filelist_ref.value.length }}</span></span>
    </div>
    <div v-show="!manager" class="tab-loading"></div>
</template>

<style lang="scss">
    .image-viewer{
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
        user-select: none;

        img{
            position: absolute;
            transition: all .2s;
        }

        .ctrl{
            display: flex;
            position: absolute;
            bottom: .5rem;
            gap: .5rem;
            left: 50%;
            transform: translateX(-50%);
            padding: .35rem;
            border-radius: .3rem;
            background-color: #f6f6f6;
            z-index: 1;
            background-color: #e3e3e394;
            backdrop-filter: blur(.35rem);

            > *{
                display: block;
                color: rgba(57, 56, 56, 0.4);
                transition: all .2s;
                width: 1rem;
                height: 1rem;
                flex-shrink: 0;

                &::before{
                    opacity: .6;
                }

                &:hover{
                    color: rgba(57, 56, 56);
                }
            }

        }

        .vcount{
            position: absolute;
            z-index: 1;
            top: .5rem;
            right: 1rem;
        }
    }

    @keyframes rotation {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
