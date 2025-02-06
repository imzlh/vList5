<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { FS, message, UI } from "@/utils";
    import { createRoot } from 'react-dom/client';
    import { onMounted, onUnmounted, ref, watch, shallowRef } from "vue";
    import { createElement } from "react";
    import { Editor, Tldraw, type TldrawProps } from 'tldraw';
    import ASSETS from './whiteboard/build';
    import { decode, encode2Blob } from '@/utils/bjson';

    import "tldraw/tldraw.css";

    const container = ref<HTMLDivElement>(),
        _prop = defineProps(['option']),
        file = _prop.option as vFile,
        editor = shallowRef<Editor>();

    function vaild(data: any){
        if(!data.document.store["document:document"].name)
            data.document.store["document:document"].name = file.name;
        return data; 
    }

    fetch(file.url).then(res => res.body!).then(dat => decode(dat)).catch(e =>
        message({
            "type": "error",
            "title": "Whiteboard",
            "content": {
                "title": "打开白板失败",
                "content": "无法从服务器加载白板数据"
            },
            "timeout": 10
        })
    ).then(data => editor.value
        ? editor.value.loadSnapshot(vaild(data))
        : watch(editor, val => val && val.loadSnapshot(vaild(data)))
    );

    function save() {
        const data = editor.value!.getSnapshot();
        encode2Blob(data).then(res => FS.write(file.path, res)).then(() => 
            message({
                "type": "success",
                "title": "Whiteboard",
                "content": {
                    "title": "保存成功",
                    "content": "白板数据已同步到远程服务器"
                }
            })
        );
    }

    onMounted(() => {
        const root = createRoot(container.value!);
        root.render(createElement(Tldraw, {
            assetUrls: ASSETS,
            onMount: edit => void(editor.value = edit),
            autoFocus: true
        } satisfies TldrawProps));

        onUnmounted(() => root.unmount());
    });
</script>

<template>
    <div ref="container" class="v-tl-container" v-bind="$attrs"
        :style="{ paddingTop: UI.fullscreen.value ? '0' : '3rem' }"
    ></div>
    <div class="v-tl-tools">
        <button @click="save" vs-icon="save">保存</button>
    </div>
</template>

<style lang="scss">
    .v-tl-container {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        background-image: linear-gradient(0deg, #f1f1f1, #ffffff);
        background-size: 100% 3rem;
        background-repeat: no-repeat;

        .tl-error-boundary__refresh{
            display: none !important;
        }

        .tl-error-boundary__reset{
            display: none !important;
        }
    }

    .v-tl-tools{
        position: absolute;
        bottom: 0;
        right: 0;
        z-index: 10;
        box-shadow: 0 0 .5rem rgba(224, 224, 224);
        padding: .25rem;
        border-radius: .3rem 0 0 0;
        background-color: rgb(237, 240, 242);
        display: flex;
        gap: .5rem;

        > button{
            outline: none;
            border: none;
            display: flex;
            gap: .5rem;
            padding: .45rem;
            transition: background-color .2s ease-in-out;
            cursor: pointer;
            border-radius: .35rem;
            opacity: .6;

            &::before{
                width: 1.1rem;
                height: 1.1rem;
            }

            &:hover{
                background-color: rgb(224, 224, 224);
            }
        }
    }

    .tl-watermark_SEE-LICENSE{
        display: none !important;
    }

    .tlui-button__menu[title=语言]{
        display: none !important;
    }
</style>