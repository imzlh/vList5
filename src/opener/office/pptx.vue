<script lang="ts" setup>
    
    import { onMounted, ref } from 'vue';
    
    // @ts-ignore
    import renderPPTX, { __v_store__ } from './pptist';
    import './style.css';
    import type { vFile } from '@/env';

    const container = ref<HTMLElement>(),
        __prop = defineProps(['option']);
    onMounted(() => renderPPTX(container.value!));
    __v_store__.value = {
        file: __prop.option as vFile,
        dir: (__prop.option as vFile).parent!.path
    }
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