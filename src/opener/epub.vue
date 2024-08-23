<script lang="ts" setup>
    import type { vFile } from '@/env';
    import { VueReader } from 'vue-reader';

    const _prop = defineProps(['option']),
        file: vFile = _prop.option
</script>

<template>
    <VueReader :url="file.url" />
</template>

<style>
    /* 防止挡住 */
    .readerArea > button.tocButton {
        bottom: .5rem !important;
        position: absolute;
        left: 1rem !important;
        top: unset !important;
    }
</style>