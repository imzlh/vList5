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
                    // prisma
                    if(id.includes('prism')) return 'prism';
                    // monaco
                    if(id.includes('/node_modules/') && id.includes('monaco-editor'))
                        return 'vscode';
                    // muya
                    if(id.includes('/node_modules/') && id.includes('muya'))
                        return 'muya';
                }
            }
        }
    },
    base: './'
});
