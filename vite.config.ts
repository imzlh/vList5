import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA as pwa } from 'vite-plugin-pwa';
import nlsPlugin, {
    Languages,
    esbuildPluginMonacoEditorNls,
} from "./src/opener/vscode/vite_plugin.i18n";
import I18n from './src/opener/vscode/translate.i18n.json';
import { basename, join, matchesGlob, resolve } from 'node:path';
import { copyFileSync, existsSync, mkdir, mkdirSync, readdirSync } from 'node:fs';

// 这里定义应用名称
const APP_NAME = 'izCloud';

// avplayer: 将动态文件放在viteDep
if(process.env.NODE_ENV === 'development'){
    if(!existsSync('node_modules/.vite/deps'))
        mkdirSync('node_modules/.vite/deps', { recursive: true });

    console.log('Please wait for copying avplayer dependencies...');

    const dep_path = resolve(__dirname, 'node_modules/.vite/deps'),
        src_path = resolve(__dirname, 'node_modules/@libmedia/avplayer/dist/esm'),
        mods = readdirSync(src_path);

    for (const mod of mods){
        if(! mod.match(/[0-9]+\.avplayer\.js$/)) continue;
        const src = resolve(src_path, mod),
            dst = join(dep_path, basename(mod));
        copyFileSync(src, dst);
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        nlsPlugin({
            locale: Languages.zh_hans,
            localeData: I18n,
        }),
        pwa({
            "filename": "sw.js",
            "registerType": "autoUpdate",
            "injectRegister": "inline",
            "workbox": {
                "globPatterns": [
                    '**/*.{js,css,html,webp,ico,svg,woff2}'
                ],
                maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
                globIgnores: [
                    'type/(*.svg)'
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
                // vList内联打开文件，不建议使用
                // file_handlers: [
                //     {
                //         // 允许vList打开，自动绑定系统文件扩展
                //         accept: {
                //             // 音频
                //             "audio/*": [
                //                 ".mp3",
                //                 ".wav",
                //                 ".flac",
                //                 ".opus",
                //                 ".mka",
                //                 ".m4a",
                //                 ".ogg",

                //                 // avPlayer额外支持
                //                 ".pcm",
                //                 ".wav"
                //             ],
                //             "image/*": [
                //                 ".avif",
                //                 ".webp",
                //                 ".jpg", ".jpeg", ".jxl",
                //                 ".png",
                //                 ".ico",
                //                 ".bmp",
                //                 ".svg"
                //             ],
                //             "text/*": [
                //                 ".php",
                //                 ".js", ".css",
                //                 ".scss", ".ts",
                //                 ".json", ".ini", ".xml", ".yaml",
                //                 ".c", ".cpp", ".h",
                //                 ".java",
                //                 ".go",
                //                 ".make",
                //                 ".perl", ".pl",
                //                 ".sh", ".bash", ".cmd", ".bat", ".vbs",
                //                 ".dockerfile", ".docker",
                //                 ".py", ".jspy",
                //                 ".html", ".htm", ".xhtml",
                //                 ".txt", ".log", ".md"
                //             ],
                //             "text/cue": [
                //                 ".cue"
                //             ],
                //             "video/*": [
                //                 ".mp4",
                //                 ".webm",
                //                 ".mkv",
                //                 ".ogv",
                //                 ".mpg",
                //                 ".webm",

                //                 // avPlayer额外支持
                //                 ".flv",
                //                 ".mov",
                //                 ".m2ts",
                //                 ".ivf"
                //             ],
                //             "font/*": [
                //                 ".woff",
                //                 ".woff2",
                //                 ".ttf",
                //                 ".otf",
                //                 ".eof"
                //             ]
                //         },
                //         action: '?open'
                //     }
                // ],
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
        }),
        // 将vite-client移动位置
        {
            name: 'my-plugin',
            transformIndexHtml(html) {
                if(process.env.NODE_ENV === 'development')
                    return html
                        .replace(/<head>\s*<script\s+type="module"\s+src="\/@vite\/client"><\/script>/, '')
                        .replace('</head>', '<script type="module" src="/@vite/client"></script></head>');
            }
        }
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
        },
        host: '0.0.0.0'
    },
    build: {
        target: [
            'es2022', 'chrome100', 'safari16', 'firefox100', 'edge100'
        ],
        rollupOptions: {
            output:{
                manualChunks(id) {
                    id = id.toLowerCase();
                    // // eval兼容包
                    // if(id.endsWith('eval.ts')) return 'eval';
                    // // 获取信息
                    // const ext = id.split('.').pop()!,
                    //     module = id.includes('/node_modules/');
                    // // 排除静态资源
                    // if(
                    //     !module && ![
                    //         'ts',
                    //         'js',
                    //         'tsx',
                    //         'jsx',
                    //         'scss'
                    //     ].includes(ext.toLowerCase())
                    // ) return 'main';
                    // // 打包全部module
                    // if(module
                    //     ? id.includes('vue')
                    //     : id.includes('/module/')
                    //         || id.includes('/action/') 
                    //         || id.match(/\/src\/[^/\\]+/)
                    // )
                    //     return 'main';
                    // // 将monaco vscode asciinema epub markdown muya imgedit分开打包
                    // if(
                    //     module 
                    //         ? id.includes('monaco-editor')
                    //         : id.includes('vscode')
                    // ) return 'vscode';
                    // else if(
                    //     module
                    //         ? id.includes('muya') || id.includes('prism')
                    //         : id.includes('markdown')
                    // ) return 'muya';
                    // else if(
                    //     module
                    //         ? id.includes('imgedit')
                    //         : id.includes('react')
                    // ) return 'imgedit';
                    // else if(
                    //     id.includes('epub')
                    // ) return 'epub';
                    // else if(
                    //     id.includes('asciinema')
                    // ) return 'asciinema';
                    // else return 'opener';
                    // eval兼容包
                    if(id.endsWith('eval.ts')) return 'eval';
                    // core
                    if(
                        ['svg', 'png', 'jpg', 'webp', 'ico'].some(item => id.endsWith('.' + item)) ||
                        ((!id.includes('node_modules/') || [
                            'vue',
                        ].some(item => id.includes(item)))
                        && ![
                            '/asciinema',
                            '/markdown.vue',
                            '/artplayer.vue',
                            '/imgedit', 
                            '/vscode',
                            '/epub',
                            '/psd',
                            '/whiteboard',
                            '/office',
                            '/avplayer'
                        ].some(item => id.includes(item)))
                    ) return 'main';
                    // monaco
                    if(id.includes('/monaco-editor/') || id.includes('/vscode') || id.includes('/@types/'))
                        return 'vscode';
                    // prism
                    if(id.includes('/prism'))
                        return 'prism';
                    // muya
                    if(id.includes('muya') || id.includes('/markdown.vue'))
                        return 'muya';
                    // 所有React组件
                    if(id.includes('react') || id.includes('/imgedit') ||  id.includes('/whiteboard') || id.includes('tldraw'))
                        return 'reactapp';
                    // office
                    if(id.includes('/office/'))
                        return 'office';
                    // additional pack
                    if(id.includes('/psd') 
                        || id.includes('/asciinema') 
                        || id.includes('/artplayer') 
                        || id.includes('/epub.vue') 
                        || id.includes('vue-reader') 
                        || id.includes('libmedia')
                        || id.includes('avplayer')
                    )
                        return 'additional';
                },
            },
            input: {
                'index': './index.html',
                'init': "./src/init.ts"
            }
        },
        chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                esbuildPluginMonacoEditorNls({
                    locale: Languages.zh_hans,
                    localeData: I18n,
                }),
            ],
        },
    },
    base: './',
    assetsInclude: [
        /\.w?asm$/
    ]
});
