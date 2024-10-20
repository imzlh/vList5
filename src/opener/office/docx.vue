<script lang="ts" setup>
    import type { vFile } from '@/env';
    import { onMounted, onUnmounted, ref, type PropType } from 'vue';
    import { renderAsync } from 'docx-preview';

    const { option: file } = defineProps({
            option: {
                type: Object as PropType<vFile>,
                    required: true
            }
        }),
        data = await (await fetch(file.url)).arrayBuffer(),
        box = ref<HTMLDivElement>(),
        style = ref<HTMLDivElement>();

    let blobs: string[] = [];

    onMounted(() => renderAsync(data, box.value!, style.value!, {
        experimental: true,
        renderChanges: true
    }).then(() => blobs = 
        Array.from(box.value!.innerHTML.matchAll(
            /(?<quote>'|")blob:\/\/[a-zA-Z0-9.-]+\/[a-z0-9-]+\k<quote>/g
        )).map(match => match[0])
    ));
    onUnmounted(() => blobs.forEach(url => URL.revokeObjectURL(url)));
</script>

<template>
    <div class="v-docx-wrapper" ref="box" v-bind="$attrs"></div>
    <div ref="style"></div>
</template>

<style>
    .v-docx-wrapper {
        width: 100%;
        height: 100%;
        overflow: auto;
    }

    .docx-wrapper {
        background: transparent !important;
        padding: 2rem !important;
        display: block !important;
        max-width: 95%;
        box-sizing: border-box;
        margin: 3rem auto;
        box-shadow: 0 0 .75rem #d9d9d9;
        overflow: hidden;
    }

    .docx-wrapper>section.docx {
        box-shadow: none !important;
        margin-bottom: 0 !important;
        line-height: 1.5;
    }
</style>