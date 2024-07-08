<script setup lang="ts">
    import type { vFile } from '@/env';

    const props = defineProps(['option']),
        file = props['option'] as vFile;
</script>

<template>
    <iframe class="browser" :src="file.url" frameborder="0"></iframe>
</template>

<style lang="scss">
    iframe.browser{
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
    }
</style>