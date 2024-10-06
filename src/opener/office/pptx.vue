<script lang="ts" setup>
    
    import { onMounted, onUnmounted, ref, type App } from 'vue';
    
    // @ts-ignore
    import renderPPTX, { __v_store__ } from './pptist';
    import STYLE from './style.css?raw';
    import type { vFile } from '@/env';

    if(__v_store__.value) throw new Error('pptx has already been rendered');

    const container = ref<HTMLElement>(),
        __prop = defineProps(['option']);
    onMounted(() => {
        const shadow = container.value!.attachShadow({ mode: 'open' }),
            div = document.createElement('div'),
            style = document.createElement('style');
        // 使得position: fixed以容器为基准
        div.setAttribute('style', 'width: 100%; height: 100%; transform: scale(1);');
        div.tabIndex = -1;
        style.innerHTML = STYLE;

        __v_store__.value = {
            file: __prop.option as vFile,
            dir: (__prop.option as vFile).parent!.path,
            shadow: shadow,
            root: div
        }
        shadow.appendChild(style);
        shadow.appendChild(div);
        
        const app = renderPPTX(div) as App;
        onUnmounted(() => app.unmount());
    });

    onUnmounted(() => __v_store__.value = undefined);
</script>

<template>
    <div ref="container" class="container" />
</template>

<style scoped>
    .container {
        width: 100%;
        height: calc(100% - 2.5rem);
        margin-top: 2.5rem;
    }
</style>