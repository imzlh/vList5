/**
 * 为monaco-editor TypeScript添加额外的库定义
 */
import * as monaco from'monaco-editor';

// 设置tsconfig
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    allowJs: false,
    typeRoots: ["node_modules/@types"]
});

export default {
    node() {
        const NODE = import.meta.glob('/node_modules/@types/node/*.d.ts', {
            "query": '?raw',
            "eager": true
        });
        // 定义node库
        for (const file in NODE) {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
                (NODE[file] as { default: string }).default,
                file
            )
            // monaco.editor.createModel(source, 'typescript', monaco.Uri.parse(name))
        }
    },
    async vue() {
        const files = import.meta.glob('\\@vue/**/*.d.ts', {
            "query": '?raw',
            "eager": true
        });
        for (const file in files) {
            const content = (files[file] as { default: string }).default;
            monaco.languages.typescript.typescriptDefaults.addExtraLib(content, file);
        }
    }
};