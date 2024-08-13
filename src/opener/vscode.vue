<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/env';
    import { FS, Global, getConfig, regConfig, splitPath } from '@/utils';
    import { onMounted, onUnmounted, ref, watch } from 'vue';
    import { VSLang } from './vscode/language';

    // VSCode不可复用
    const opts = defineProps(['option']),
        file = opts['option'] as vFile,
        element = ref<HTMLDivElement>(),
        loading = ref(false);
    
    let editor: undefined | Editor;

    // 初始化
    onMounted(() => new Editor(file, element.value!).load().then(self => editor = self));
</script>

<template>
    <div class="tab-loading" v-if="loading"></div>
    <div class="vscode-main" v-else ref="element"></div>
</template>

<script lang="ts">
    import { CFG } from "./vscode/configure";
    import Editor from './vscode/editor';
    
    // 设置monaco
    window.MonacoEnvironment = {
        "baseUrl": CFG['importURL'].value,
        "getWorker": VSLang.getWorker
    }
</script>

<style lang="scss">
    .vscode-main{
        height: 100%
    }
</style>