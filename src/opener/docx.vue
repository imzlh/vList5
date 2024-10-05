<script lang="ts" setup>
    import type { vFile } from '@/env';
    import { convertToHtml, images } from 'mammoth';
    import { onUnmounted, type PropType } from 'vue';

    const { option: file } = defineProps({
            option: {
                type: Object as PropType<vFile>,
                    required: true
            }
        }),
        imgtmp: Array<string> = [],
        data = await (await fetch(file.url)).arrayBuffer(),
        html = await convertToHtml({ arrayBuffer: data }, {
            convertImage: images.imgElement(async img => {
                const data = new Blob([await img.readAsArrayBuffer()]),
                    url = URL.createObjectURL(data);
                imgtmp.push(url);
                return { altText: img.contentType, src: url };
            }),
            ignoreEmptyParagraphs: false,
            includeEmbeddedStyleMap: true,
        });

    onUnmounted(() => imgtmp.forEach(url => URL.revokeObjectURL(url)));
</script>

<template>

    <div class="wrapper">
        <div class="document" v-html="html.value" />
    </div>
</template>

<style lang="scss" scoped>
    .wrapper {
        width: 100%;
        height: 100%;
        overflow: auto;

        > .document {
            width: 80%;
            margin: 6rem auto;
            padding: 2rem;
            background-color: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border: solid .1rem #ccc;
        }
    }
</style>