<script lang="ts" setup>
    import type { vFile } from '@/env';
    import Editor from '@hufe921/canvas-editor';
    import docxPlugin from '@hufe921/canvas-editor-plugin-docx'
    import { onMounted, ref } from 'vue';
    import Funcs from './docx-helper';
    
    const container = ref<HTMLDivElement>(),
        actions = ref<HTMLDivElement>(),
        _prop = defineProps<{
            option: vFile
        }>(),
        file = _prop.option;
    let editor: Editor | undefined;

    const fileData = fetch(file.url).then(response => response.arrayBuffer());

    onMounted(() => {
        editor = new Editor(container.value!, [], {
            
        });
        editor.use(docxPlugin);

        // 导入文件
        fileData.then(arrayBuffer => 
            // @ts-expect-error
            editor.command.executeImportDocx({
                arrayBuffer
            })
        );

        // 初始化操作
        for(const action of actions.value!.children){
            const el = action as HTMLElement;
            if(! (el.dataset.func! in Funcs))
                continue;
            if(el.tagName == 'INPUT' || el.tagName == 'SELECT' || el.tagName == 'BUTTON')
                el.onchange = () => Funcs[el.dataset.func!].call(el, editor!, (el as HTMLInputElement|HTMLSelectElement|HTMLButtonElement).value);
            else
                el.onclick = () => Funcs[el.dataset.func!].call(el, editor!);
        }
    });
</script>

<template>
    <div ref="container"></div>

    <div class="action" ref="actions">
        <div data-func="undo">撤销</div>
        <div data-func="redo">重做</div>
        <div data-func="save">保存</div>
    </div>
</template>

<style scoped lang="scss">
    div{
        width: 100%;
        height: 100%;
    }
</style>