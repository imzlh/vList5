<script setup lang="ts">
    import type { vFile } from '@/env';

    const props = defineProps(['option']),
        file = props['option'] as vFile;
</script>

<template>
    <div v-webview.right-bottom="file.url"></div>
</template>

<style lang="scss" scoped>
    div{
        width: 100%;
        height: 100%;
        border: none;
        outline: none;

        > div{
            width: 100%;
            height: 100%;
        }
    }
</style>