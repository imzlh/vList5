<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/env';
    import { FS, Global, getConfig, regConfig, splitPath } from '@/utils';
    import { onMounted, onUnmounted, ref, watch } from 'vue';

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
        opts = defineProps(['option']),
        file = opts['option'] as vFile,
        element = ref<HTMLDivElement>(),
        loading = ref(false),
        SETTING = {
            accessibilityPageSize: 10,
            accessibilitySupport: 'on',
            autoClosingBrackets: 'always',
            autoClosingDelete: 'always',
            autoClosingOvertype: 'always',
            autoClosingQuotes: 'always',
            bracketPairColorization: {
                enabled: CFG['bracketPairColorization'].value,
            },
            automaticLayout: true,
            codeLens: true,
            colorDecorators: CFG['colorDecorators'].value != 'off',
            colorDecoratorsActivatedOn: CFG['colorDecorators'].value == 'off' ? undefined : CFG['colorDecorators'].value,
            contextmenu: true,
            autoSurround: 'languageDefined',
            copyWithSyntaxHighlighting: true,
            cursorSmoothCaretAnimation: CFG['cursorSmoothCaretAnimation'].value ? 'on' : 'off',
            cursorSurroundingLines: 0,
            cursorSurroundingLinesStyle: 'all',
            glyphMargin: true,
            largeFileOptimizations: CFG['maxTokenizationLineLength'].value != 0,
            lightbulb: {
                enabled: CFG['lightbulb'].value
            },
            lineHeight: (CFG['codeLensFontSize'].value as number) * (CFG['lineHeight'].value as number),
            padding: {
                top: 40,
                bottom: 40
            },
            minimap: {
                enabled: CFG['minimap'].value
            },
            folding: true,
            links: false,
            overviewRulerBorder: false,
            renderLineHighlight: 'gutter',
            roundedSelection: false, 
            scrollBeyondLastLine: true,
            readOnly: false,
        } as Record<string,any>;

    // 合并配置
    for (const key in CFG)
        if(!(key in SETTING))
            SETTING[key] = CFG[key];

    // 类型判断
    let lang = 'plaintext';
    for (const langs in MAP)
        if(MAP[langs].includes(splitPath(file)['ext'].toLowerCase())){
            lang = langs;
            break;
        }
    
    // 初始化
    onMounted(async () => {
        // 初始化coder
        const coder = monaco.editor.create(element.value as HTMLElement,SETTING);

        // 定义销毁事件
        onUnmounted(() => coder.dispose());

        // 添加命令
        coder.addCommand(monaco.KeyCode.F5,function(){
            fetch(file.url)
                .then(res => res.text())
                .then(txt => coder.setValue(txt));
        });
        coder.addAction({
            "id": "api.fs.save",
            "label": "vList: 保存文件(save file)",
            "contextMenuOrder": 2,
            run(){
                const res = new Blob([coder.getValue({
                    preserveBOM: false,
                    lineEnding: "\r\n"
                })]);
                FS.write(file.path,res).then(() => Global('ui.message').call({
                    "type": "success",
                    "title": "VSCode",
                    "content":{
                        "title": "保存成功",
                        "content": "文件已经写入远程"
                    },
                    "timeout": 3
                }));
            }
        });
        coder.addAction({
            "id": "api.fs.refresh",
            "label": "vList: 刷新",
            "contextMenuOrder": 1,
            "keybindings": [
                monaco.KeyCode.F5
            ],
            run() {
                fetch(file.url)
                    .then(res => res.text())
                    .then(txt => coder.setValue(txt));
            },
        });

        

        // 获取内容
        try{
            const xhr = await fetch(file.url);
            if(!xhr.ok || parseInt(xhr.headers.get('Content-Length') || '0') >= 2 * 1024 * 1024)
                throw 1;
            coder.setValue(await xhr.text());
        }catch{
            return Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content":{
                    "title": '无法读取文件夹',
                    "content": '网络错误'
                },
                "timeout": 5
            } satisfies MessageOpinion);
        }
    });
</script>

<template>
    <div class="tab-loading" v-if="loading"></div>
    <div class="vscode-main" v-else ref="element"></div>
</template>

<script lang="ts">
    import * as monaco from 'monaco-editor';

    regConfig('vscode',[
        {
            "type": "number",
            "step": 1,
            "default": 16,
            "name": "字体大小",
            "desc": "VSCode编辑器字体大小",
            "key": "codeLensFontSize"
        },{
            "type": "select",
            "key": "cursorBlinking",
            "name": "光标行为",
            "default": "solid",
            "desc": "默认活动时光标的动画",
            "item": [
                {
                    "value": "smooth",
                    "display": "smooth"
                },{
                    "display": "闪烁",
                    "value": "blink"
                },{
                    "display": "phase",
                    "value": "phase"
                },{
                    "display": "expand",
                    "value": "expand"
                },{
                    "display": "solid",
                    "value": "solid"
                }
            ]
        },{
            "type": "select",
            "key": "cursorStyle",
            "name": "光标样式",
            "default": "block",
            "desc": "光标显示样式",
            "item": [
                {
                    "value": "line",
                    "display": "行"
                },{
                    "value": "block",
                    "display": "方块"
                },{
                    "value": "underline",
                    "display": "下划线"
                },{
                    "value": "line-thin",
                    "display": "细线"
                },{
                    "value": "block-outline",
                    "display": "长方形框"
                },{
                    "value": "underline-thin",
                    "display": "细下划线"
                }
            ]
        },{
            "type": "check",
            "default": false,
            "name": "平滑光标",
            "desc": "当更改光标位置时使用动画",
            "key": "cursorSmoothCaretAnimation"
        },{
            "type": "number",
            "key": "cursorWidth",
            "default": 2,
            "name": "光标大小",
            "step": 1
        },{
            "type": "check",
            "key": "minimap",
            "default": true,
            "name": "显示预览"
        },{
            "type": "select",
            "default": "vs",
            "name": "样式",
            "key": "theme",
            "item": [
                {
                    "display": "黑暗模式",
                    "value": "vs-dark"
                },{
                    "display": "正常",
                    "value": "vs"
                }
            ]
        },{
            "key": "acceptSuggestionOnCommitCharacter",
            "type": "check",
            "default": true,
            "name": "启用补全",
            "desc": "当输入代码时接受VSCode的建议"
        },{
            "key": "acceptSuggestionOnEnter",
            "type": "check",
            "default": false,
            "name": "自动补全",
            "desc": "按下Enter自动补全第一个选项",
        },{
            "key": "insertSpaces",
            "type": "number",
            "default": 4,
            "name": "Tab大小",
            "desc": "定义按下Tab后输入的空格数量",
            "step": 1
        },{
            "type": "check",
            "key": "lightbulb",
            "default": true,
            "name": "提示灯泡",
            "desc": "💡 是否显示代码左侧的提示灯泡"
        },{
            "key": "colorDecorators",
            "type": "select",
            "default": "hover",
            "name": "拾色器",
            "desc": "何时显示VSCode内置拾色器",
            "item": [
                {
                    display: "禁用",
                    value: "off"
                },{
                    display: "鼠标悬浮",
                    value: "hover"
                },{
                    display: "鼠标按下",
                    value: "click"
                },{
                    display: "同时",
                    value: 'clickAndHover'
                }
            ]
        },{
            "key": "autoIndent",
            "type": "select",
            "name": "自动缩进",
            "desc": "当粘贴入VSCode时代码缩进行为",
            "default": "advanced",
            "item": [
                {
                    display: "关闭",
                    value: 'none'
                },{
                    display: "保留",
                    value: 'keep'
                },{
                    display: "括号",
                    value: 'brackets'
                },{
                    display: '完全调整',
                    value: 'full'
                },{
                    display: '自动',
                    value: 'advanced'
                }
            ]
        },{
            "key": "formatOnPaste",
            "type": "check",
            "name": "自动格式化",
            "desc": "当粘贴入VSCode时自动代码格式化",
            "default": true
        },{
            "key": "dragAndDrop",
            "type": "check",
            "default": true,
            "name": "文本拖拽"
        },{
            "key": "bracketPairColorization",
            "type": "check",
            "name": "括号美化",
            "desc": "为每一对相邻括号渲染不同的颜色",
            "default": true
        },{
            "key": "matchBrackets",
            "name": "括号高亮",
            "type": "check",
            "desc": "光标在括号周围时突出显示",
            "default": true,
        },{
            "key": "columnSelection",
            "type": "check",
            "name": "行选择",
            "desc": "在左栏按住滑动可以多行选中",
            "default": true
        },{
            "key": "defaultColorDecorators",
            "type": "text",
            "name": "默认文本颜色",
            "desc": "未被渲染的文本颜色，默认黑色",
            "default": "#000"
        },{
            "key": "definitionLinkOpensInPeek",
            "type": "check",
            "name": "渲染链接",
            "desc": "高亮代码中的链接并允许打开",
            "default": false
        },{
            "key": "detectIndentation",
            "type": "check",
            "name": "自动决定Tab",
            "desc": "自动根据代码内容决定一个Tab的长度",
            "default": true
        },{
            "key": "emptySelectionClipboard",
            "type": "check",
            "name": "空复制",
            "desc": "当未选中内容仍想要复制时，复制这一行的内容",
            "default": true
        },{
            "key": "fastScrollSensitivity",
            "type": "number",
            "step": 1,
            "default": 5,
            "name": "快速滚动",
            "desc": "按住Alt加速滑动时的速度"
        },{
            "key": "fontFamily",
            "type": "text",
            "default": "Consolas, 'Courier New', monospace",
            "name": "字体",
            "desc": "定义代码显示字体"
        },{
            "key": "fontWeight",
            "type": "select",
            "default": "300",
            "name": "字体粗细",
            "item": [
                {
                    display: "极细",
                    value: '100'
                },{
                    display: "较细",
                    value: '200'
                },{
                    display: "细",
                    value: '300'
                },{
                    display: "中等",
                    value: '400'
                },{
                    display: "较粗",
                    value: '500'
                },{
                    display: "细",
                    value: '600'
                },{
                    display: "极粗",
                    value: '700'
                }
            ]
        },{
            "key": "maxTokenizationLineLength",
            "type": "number",
            "name": "单行渲染",
            "desc": "当某一行长度超过这个数值时会停止渲染，0以禁用",
            "default": 5000,
            "step": 100
        },{
            "key": "lineHeight",
            "type": "range",
            "name": "行高比",
            "default": 1.2,
            "min": 1,
            "max": 2,
            "step": .01
        },'加载选项',{
            "key": "importURL",
            "type": "text",
            "default": "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/esm/vs",
            "name": "CDN地址",
            "desc": "在CDN加载VSCode将极大加快加载速度\n请不要携带随尾斜杠"
        }
    ]);

    // 监听变化
    const CFG = getConfig('vscode');
    watch(
        CFG['theme'],
        res => monaco.editor.setTheme(res)
    );
    
    // 设置monaco
    window.MonacoEnvironment = {
        "baseUrl": CFG['importURL'].value,
        "getWorker": async (id, label) => {
            let url = `${CFG['importURL'].value}/basic-languages/${label}/${label}.contribution.js`;
            if(label == 'editorWorkerService') url = `${CFG['importURL'].value}/base/common/worker/simpleWorker.js`;
            
            const res = URL.createObjectURL(await (await fetch(url)).blob());
            return new Worker(res,{
                "name": label + 'language worker(vlist)',
                "type": "module"
            });
        },
        "getWorkerUrl": (id, label) => label == 'editorWorkerService'
            ? `${CFG['importURL'].value}/base/common/worker/simpleWorker.js`
            : `${CFG['importURL'].value}/basic-languages/${label}/${label}.contribution.js`
    }
</script>

<style lang="scss">
    .vscode-main{
        height: 100%
    }
</style>