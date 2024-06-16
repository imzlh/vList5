<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/data';
    import { Global, splitPath } from '@/utils';
    import { VueMonacoEditor, loader } from '@guolao/vue-monaco-editor';
    import { ref } from 'vue';
    import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

    loader.config({
        paths: {
            // 使用staticFile CDN
            vs: 'https://cdn.staticfile.net/monaco-editor/0.45.0/min/vs/'
        },
    })

    // VSCode不可复用

    const MAP = {
        bat: ['bat'],
        cpp: ['cpp'],
        csharp: ['cs'],
        css: ['css'],
        dart: ['dart'],
        dockerfile: ['docker'],
        go: ['go'],
        html: ['htm','html','xhtml'],
        ini: ['ini'],
        java: ['java'],
        javascript: ['js','jsx'],
        less: ['less'],
        lua: ['lua'],
        markdown: ['md'],
        'objective-c': ['co'],
        perl: ['perl'],
        php: ['php'],
        powershell: ['ps','ps1'],
        python: ['py'],
        r: ['r'],
        ruby: ['rb'],
        rust: ['rs'],
        scss: ['scss'],
        shell: ['sh'],
        sql: ['sql'],
        typescript: ['ts','tsx'],
        xml: ['xml'],
        yaml: ['yaml']
    } as Record<string,Array<string>>,
    value = ref(''),
    opts = defineProps(['option']),
    file = opts['option'] as vFile;

    const OPT = {
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on',
        accessibilityPageSize: 10,
        accessibilitySupport: 'on',
        autoClosingBrackets: 'always',
        autoClosingDelete: 'always',
        autoClosingOvertype: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'advanced',
        automaticLayout: true,
        codeLens: true,
        codeLensFontSize: 14,
        colorDecorators: true,
        contextmenu: true,
        columnSelection: true,
        autoSurround: 'languageDefined',
        copyWithSyntaxHighlighting: true,
        cursorBlinking: 'solid',
        cursorSmoothCaretAnimation: 'on',
        cursorStyle: 'line',
        cursorSurroundingLines: 0,
        cursorSurroundingLinesStyle: 'all',
        cursorWidth: 2,
        padding: {
            top: 40,
            bottom: 40
        },
        minimap: {
            enabled: false
        },
        folding: true,
        links: false,
        overviewRulerBorder: false,
        renderLineHighlight: 'gutter',
        roundedSelection: false, 
        scrollBeyondLastLine: true,
        readOnly: false
    } satisfies monacoEditor.editor.IStandaloneEditorConstructionOptions;

    let lang = 'plaintext';
    for (const langs in MAP)
        if(MAP[langs].includes(splitPath(file)['ext'].toLowerCase())){
            lang = langs;
            break;
        }
    
    fetch(file.url)
        .then(res => res.text())
        .then(txt => value.value = txt);
</script>

<template>
    <VueMonacoEditor theme="vs" :value="value" :language="lang" :options="OPT" />
</template>