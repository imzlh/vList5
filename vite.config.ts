import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA as pwa } from 'vite-plugin-pwa';

// 这里定义应用名称
const APP_NAME = 'izCloud';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        pwa({
            "filename": "sw.js",
            "registerType": "autoUpdate",
            "injectRegister": "inline",
            "workbox": {
                "globPatterns": [
                    '**/*.{js,css,html,webp,wasm,ico}',
                    '!type/(*.svg)' // 文件类型图标会被忽略
                ]
            },
            manifest: {
                name: APP_NAME,
                short_name: 'vList',
                description: 'vList5 文件管理器',
                theme_color: '#ffffff',
                categories: ['entertainment', 'utilities'],
                display: 'fullscreen',
                display_override: ['window-controls-overlay', 'fullscreen', 'minimal-ui', 'standalone', 'browser'],
                id: 'com.izgroup.nginx-vlist.vlist5',
                file_handlers: [
                    {
                        // 允许vList打开，自动绑定系统文件扩展
                        accept: {
                            // 音频
                            "audio/*": [
                                ".mp3",
                                ".wav",
                                ".flac",
                                ".opus",
                                ".mka",
                                ".m4a",
                                ".ogg",

                                // avPlayer额外支持
                                ".pcm",
                                ".wav"
                            ],
                            "image/*": [
                                ".avif",
                                ".webp",
                                ".jpg", ".jpeg", ".jxl",
                                ".png",
                                ".ico",
                                ".bmp",
                                ".svg"
                            ],
                            "text/*": [
                                ".php",
                                ".js", ".css",
                                ".scss", ".ts",
                                ".json", ".ini", ".xml", ".yaml",
                                ".c", ".cpp", ".h",
                                ".java",
                                ".go",
                                ".make",
                                ".perl", ".pl",
                                ".sh", ".bash", ".cmd", ".bat", ".vbs",
                                ".dockerfile", ".docker",
                                ".py", ".jspy",
                                ".html", ".htm", ".xhtml",
                                ".txt", ".log", ".md"
                            ],
                            "text/cue": [
                                ".cue"
                            ],
                            "video/*": [
                                ".mp4",
                                ".webm",
                                ".mkv",
                                ".ogv",
                                ".mpg",
                                ".webm",

                                // avPlayer额外支持
                                ".flv",
                                ".mov",
                                ".m2ts",
                                ".ivf"
                            ],
                            "font/*": [
                                ".woff",
                                ".woff2",
                                ".ttf",
                                ".otf",
                                ".eof"
                            ]
                        },
                        action: '?open'
                    }
                ],
                protocol_handlers: [
                    {
                        "protocol": "web+vlist",
                        "url": '#%s'
                    }
                ],
                icons: [
                    {
                        src: 'favicon.ico',
                        sizes: '128x128',
                        type: 'image/ico'
                    },
                    {
                        src: 'favicon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'common': fileURLToPath(new URL('./node_modules/libmedia-common/', import.meta.url))
        }
    },
    server:{
        headers:{
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    },
    build: {
        target: [
            'es2022', 'chrome100', 'safari16', 'firefox100', 'edge100'
        ],
        rollupOptions: {
            output:{
                manualChunks(id) {
                    // core
                    if(
                        (!id.includes('node_modules') || ['vue'].some(item => id.includes(item)))
                        && !['markdown.vue', 'aplayer.vue', 'artplayer.vue', 'vscode.vue', 'avplayer.vue'].some(item => id.includes(item))
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
    base: './',
    assetsInclude: [
        /\.w?asm$/
    ]
});
