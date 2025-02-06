<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { FS, message } from "@/utils";
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
        ? editor.value.loadSnapshot(data)
        : watch(editor, val => val && val.loadSnapshot(data))
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
    <div ref="container" class="v-tl-container" v-bind="$attrs"></div>
    <div class="v-tl-tools">
        <button @click="save">保存</button>
    </div>
</template>

<style lang="scss">
    .v-tl-container {
        width: 100%;
        height: 100%;
        padding-top: 3rem;
        box-sizing: border-box;
        background-image: linear-gradient(0deg, #f1f1f1, #ffffff);
        background-size: 100% 3rem;
        background-repeat: no-repeat;

        &[debug=false] .tlui-debug-panel{
            display: none !important;
        }

        .tl-error-boundary__refresh{
            display: none !important;
        }

        .tl-error-boundary__reset{
            display: none !important;
        }
    }

    .v-tl-tools{
        position: absolute;
        top: -.1rem;
        right: -.1rem;
        z-index: 10;
        box-shadow: 0 0 .5rem rgba(224, 224, 224);
        padding: .5rem .75rem;
        border-radius: 0 0 0 .35rem;
        background-color: rgb(237, 240, 242);
        display: flex;
        gap: .5rem;

        > button{
            outline: none;
            padding: .3rem .75rem;
            border-radius:.2rem;
            background-color: #a6efff;
            color: white;
            cursor: pointer;
            border: none;
            transition: background-color .2s ease-in-out;

            &:hover{
                background-color: #a4caff;
            }
        }
    }
</style>