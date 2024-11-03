<script lang="ts" setup>
    import Xlsx from './office/excel.vue';
    import Docx from './office/docx.vue';
    import Pptx from './office/pptx.vue';
    import type { vFile } from '@/env';
    import { splitPath } from '@/utils';

    const _prop = defineProps(['option']),
        file = _prop.option as vFile,
        ext = splitPath(file).ext;
</script>

<template>
    <Xlsx v-if="ext === 'xlsx' || ext === 'vsheet'" :option="file" />
    <Docx v-else-if="ext === 'docx'" :option="file" />
    <Pptx v-else-if="ext === 'pptx'" :option="file" />
    <div v-else vs-icon="warning" inline>不支持该格式文件</div>
</template>