<script lang="ts" setup>
    import type { vFile } from "@/env";
    import { getConfig, Global, regConfig } from "@/utils";
    import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types/types";
    import { createRoot } from 'react-dom/client';
    import { onMounted, onUnmounted, ref } from "vue";
    import { createElement } from "react";

    const container = ref<HTMLDivElement>(),
        config = getConfig('whiteboard'),
        _prop = defineProps(['option']),
        file = _prop.option as vFile,
        api = ref<ExcalidrawImperativeAPI>();

    let state = {};
    if(file) try{
        state = await (await fetch(file.url)).json();
    }catch(e){
        Global('ui.message').call({
            "type": "error",
            "title": "Whiteboard",
            "content": {
                "title": "打开白板失败",
                "content": "无法从服务器加载白板数据"
            },
            "timeout": 10
        });
    }

    const Excalidraw = (await import('@excalidraw/excalidraw')).Excalidraw;

    onMounted(() => {
        const root = createRoot(container.value!);
        root.render(createElement(Excalidraw, {
            langCode: "zh",
            theme: config.theme.value,
            initialData: state,
            name: file ? file.name : "未命名白板",
            autoFocus: true,
            excalidrawAPI: a => api.value = a,
            UIOptions: {
                canvasActions: {
                    export: {
                        saveFileToDisk: false,
                        onExportToBackend: dat => console.log(dat)
                    }
                }   
            }
        } satisfies ExcalidrawProps));
        onUnmounted(() => root.unmount());
    });
</script>

<script lang="ts">
    // 欺骗process
    (globalThis as any).process = { env: {} };
    (globalThis as any).EXCALIDRAW_ASSET_PATH = "https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw/dist/";

    // 注册配置
    regConfig('whiteboard', [
        {
            "type": "select",
            "key": "theme",
            "name": "主题",
            "default": "light",
            "item": [
                {
                    display: "亮色",
                    value: "light"
                },
                {
                    display: "暗色",
                    value: "dark"
                }
            ]
        }
    ])
</script>

<template>
    <div ref="container" style="width: 100%; height: 100%;"></div>
</template>