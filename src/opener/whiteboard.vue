<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { FS, Global } from "@/utils";
    import { createRoot } from 'react-dom/client';
    import { onMounted, onUnmounted, ref, watch } from "vue";
    import { createElement } from "react";
    import { Editor, Tldraw, type TldrawProps } from 'tldraw';
    import ASSETS from './whiteboard/build';

    import "tldraw/tldraw.css";

    const container = ref<HTMLDivElement>(),
        _prop = defineProps(['option']),
        file = _prop.option as vFile,
        editor = ref<Editor>();

    fetch(file.url).then(res => res.json()).catch(e =>
        Global('ui.message').call({
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
        const data = JSON.stringify(editor.value!.getSnapshot());
        FS.write(file.path, new Blob([data], { type: 'application/json' }));
        Global('ui.message').call({
            "type": "success",
            "title": "Whiteboard",
            "content": {
                "title": "保存成功",
                "content": "白板数据已同步到远程服务器"
            }
        });
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
    <div ref="container" style="width: 100%; height: 100%;"></div>
    <div class="tools">
        <button @click="save">保存</button>
    </div>
</template>

<style scoped lang="scss">
    .container {
        .tl-error-boundary__refresh{
            display: none !important;
        }
    }

    .tools{
        position: absolute;
        top: -.1rem;
        right: -.1rem;
        z-index: 10;
        box-shadow: 0 0 .5rem rgba(224, 224, 224);
        padding: .5rem .75rem;
        border-radius: 0 0 0 .35rem;
        background-color: rgb(237, 240, 242);

        > button{
            outline: none;
            padding: .3rem .65rem;
            border-radius:.2rem;
            background-color: #a6efff;
            color: white;
            cursor: pointer;
            border: none;

            &:hover{
                background-color: #a4caff;
            }
        }
    }
</style>