import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    build: {
        rollupOptions: {
            output:{
                manualChunks(id) {
                    // core
                    if(
                        (!id.includes('node_modules') || ['vue'].some(item => id.includes(item)))
                        && !['markdown.vue', 'aplayer.vue', 'artplayer.vue', 'vscode.vue'].some(item => id.includes(item))
                    ) return 'main';
                    // monaco
                    if(id.includes('monaco-editor') || id.includes('vscode.vue'))
                        return 'vscode';
                    // muya
                    if((id.includes('muya') && !['prism' ,'mermaid', 'mindmap', 'vega', 'flowchart'].some(item => id.includes(item))) || id.includes('markdown.vue'))
                        return 'muya';
                    else if(id.includes('prism'))
                        return 'prism';
                },
            },
        },
        chunkSizeWarningLimit: 1000
    },
    base: './'
});
