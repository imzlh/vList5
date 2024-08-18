<script setup lang="ts">
    import type { vFile } from '@/env';
    import { onMounted, ref } from 'vue';
    import { VSLang } from './vscode/language';
    import Editor from './vscode/editor';

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
    // 初始化配置
    import './vscode/configure';

    // 初始化TS库
    import DEFINE from './vscode/lib';
    // DEFINE.vue()
    DEFINE.node()

    // 设置monaco
    window.MonacoEnvironment = { "getWorker": VSLang.getWorker };
</script>

<style lang="scss">
    .vscode-main{
        height: 100%
    }
</style>