<script setup lang="ts">
    import type { vFile } from '@/env';
    import { onMounted, ref } from 'vue';
    import { VSLang } from './vscode/language';
    import Editor from './vscode/editor';

    // VSCode不可复用
    const opts = defineProps(['option']),
        file = opts['option'] as vFile,
        element = ref<HTMLDivElement>(),
        loading = ref(true);
    
    let editor: undefined | Editor;

    // 初始化
    onMounted(() => new Editor(file, element.value!).load().then(self => {
        editor = self;
        loading.value = false;
    }));
</script>

<template>
    <div class="vscode-main" ref="element"></div>

    <div class="tab-loading" v-if="loading"></div>
    <div class="helper" v-else>
        <select :value="editor!.langRef.value" 
            @change="editor!.lang = ($event.target! as HTMLSelectElement).value" class="lang"
        >
            <option value="plaintext">Plain Text</option>
            <option v-for="lang in VSLang.langs" :value="lang">{{ lang }}</option>
        </select>
        <div class="btn" vs-icon="save" button inline @click="editor!.save()" />
    </div>
</template>

<script lang="ts">
    // 初始化配置
    import './vscode/configure';

    // 设置monaco
    window.MonacoEnvironment = { "getWorker": VSLang.getWorker };
</script>

<style lang="scss" scoped>
    @use '@/style/input';

    .vscode-main{
        height: 100%
    }

    .helper{
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        padding: .35rem .5rem;
        border-radius: .25rem;
        background-color: rgb(221 232 243 / 78%);
        backdrop-filter: blur(.45rem);
        z-index: 5;

        > .lang{
            @include input.winui-input;
            border: none;
            background-color: transparent;
        }
    }
</style>