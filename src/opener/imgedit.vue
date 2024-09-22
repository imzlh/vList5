<script lang="ts" setup>
    import { onMounted, onUnmounted, ref } from 'vue';
    import Editor, { TABS, TOOLS } from 'react-filerobot-image-editor';
    import { FS } from '../utils';
    import { createRoot } from 'react-dom/client';
    import { createElement } from 'react';

    const _prop = defineProps(['visibility', 'option']),
        file = _prop.option,
        ev = defineEmits(['close']),
        container = ref(),
        element = createElement(Editor,
            {
                source: file.url,
                onSave: async function (obj) {
                    if (!obj.imageCanvas) return;
                    const blob = await new Promise<Blob | null>(rs => obj.imageCanvas!.toBlob(rs, obj.mimeType, 1)),
                        path = obj.name + '.' + obj.extension;
                    blob && FS.write(path, blob);
                },
                onClose: () => ev('close'),
                annotationsCommon: {
                    fill: '#ff0000',
                },
                Text: { text: 'Filerobot...' },
                Rotate: { angle: 90, componentType: 'slider' },
                Crop: {
                    presetsItems: [
                        {
                            titleKey: 'classicTv',
                            descriptionKey: '4:3',
                            ratio: 4 / 3,
                        },
                        {
                            titleKey: 'cinemascope',
                            descriptionKey: '21:9',
                            ratio: 21 / 9,
                        },
                    ],
                    presetsFolders: [
                        {
                            titleKey: 'socialMedia',
                            groups: [
                                {
                                    titleKey: 'facebook',
                                    items: [
                                        {
                                            titleKey: 'profile',
                                            width: 180,
                                            height: 180,
                                            descriptionKey: 'fbProfileSize',
                                        },
                                        {
                                            titleKey: 'coverPhoto',
                                            width: 820,
                                            height: 312,
                                            descriptionKey: 'fbCoverPhotoSize',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                tabsIds: [TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS, TABS.FINETUNE],
                defaultTabId: TABS.ANNOTATE,
                defaultToolId: TOOLS.TEXT,
                savingPixelRatio: 1,
                previewPixelRatio: 1,
            }
        );

    onMounted(() => {
        const app = createRoot(container.value);
        app.render(element);
        onUnmounted(() => app.unmount());
    })
</script>

<template>
    <div ref="container" class="container"></div>
</template>

<style scoped>
    .container {
        height: 100%;
    }

    @media screen and (min-width: 30rem) {
        .container{
            height: calc(100% - 2rem);
            margin-top: 2rem;
        }
    }
</style>