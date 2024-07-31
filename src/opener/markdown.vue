<script lang="ts" setup>
    import type { AlertOpts, MessageOpinion, vDir, vFile } from '@/env';
    import Upload from '@/module/upload.vue';
    import { FILE_PROXY_SERVER, FS, Global, getTree, splitPath } from '@/utils';
    import {
        CodeBlockLanguageSelector,
        EmojiSelector,
        ImageEditTool,
        ImageResizeBar,
        ImageToolBar,
        InlineFormatToolbar,
        Muya,
        ParagraphFrontButton,
        ParagraphFrontMenu,
        ParagraphQuickInsertMenu,
        PreviewToolBar,
        TableColumnToolbar,
        TableDragBar,
        TableRowColumMenu
    } from '@muyajs/core';
    import '@muyajs/core/lib/style.css';
    import type { Search } from '@muyajs/core/lib/types/search/index.js';
    import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

    Muya.use(EmojiSelector);
    Muya.use(InlineFormatToolbar);
    Muya.use(ImageToolBar);
    Muya.use(ImageResizeBar);
    Muya.use(CodeBlockLanguageSelector);
    Muya.use(ImageEditTool);
    Muya.use(ParagraphFrontButton);
    Muya.use(ParagraphFrontMenu);
    Muya.use(TableColumnToolbar);
    Muya.use(ParagraphQuickInsertMenu);
    Muya.use(TableDragBar);
    Muya.use(TableRowColumMenu);
    Muya.use(PreviewToolBar);

    const container = ref<HTMLElement>(),
        _input = defineProps(['option']),
        input = _input.option as vFile,
        CFG = reactive({
            search: false,
            replace: false,
            upload: false,
            search_res: 0,
            search_index: 0,
            search_text: '',
            replace_text: ''
        }),
        el = defineEmits(['hide', 'show', 'close']);

    let muya: undefined | Muya;

    onMounted(async function(){
        const text = await (await fetch(input.url)).text(),
            box = document.createElement('div');
        box.classList.add('md-container');
        (container.value as HTMLElement).append(box);
        (muya = new Muya(box, {
            "markdown": text,
            "autoPairBracket": true,
            "autoPairMarkdownSyntax": true,
            "autoPairQuote": true,
            "locale": {
                name: "zh",
                resource: LANG_PACK
            },
            "math": true,
            "tabSize": 4
        })).init();
    });

    function save(){
        if(!muya) return;
        FS.write(input.path, new Blob([
            muya.getMarkdown()
        ])).then(() => Global('ui.message').call({
            'type': 'info',
            'timeout': 5,
            'title': 'Muya',
            'content': {
                'title': '保存成功',
                'content': '文件成功写入远程'
            }
        } satisfies MessageOpinion))
        .catch((e:Error) => Global('ui.message').call({
            'type': 'error',
            'timeout': 5,
            'title': 'Muya',
            'content': {
                'title': '保存失败',
                'content': e.message
            }
        } satisfies MessageOpinion));
    }

    function reload(){
        if(!muya) return;

        Global('ui.alert').call({
            'type': 'confirm',
            'title': '确认覆盖',
            'message': '可能会覆盖更改，确认重载吗',
            'callback': async res => {
                if(!res) return;
                const text = await (await fetch(input.url)).text();
                muya?.setContent(text);
                Global('ui.message').call({
                    'type': 'info',
                    'timeout': 5,
                    'title': 'Muya',
                    'content': {
                        'title': '刷新成功',
                        'content': '内容已经是最新版本了'
                    }
                } satisfies MessageOpinion);
            }
        } satisfies AlertOpts);
    }

    const REPManager = {
        obj: undefined as undefined | Search,
        el: undefined as Array<HTMLElement> | undefined,
        init(){
            if(!muya) return;
            this.obj = muya.search(CFG.search_text);

            const temp = container.value?.querySelectorAll('.mu-highlight, .mu-selection');
            this.el = [];
            temp?.forEach(item => {
                const react = item.getBoundingClientRect();
                react.width == 0 || react.height == 0 || this.el?.push(item as HTMLElement);
            });
            CFG.search_res = this.el?.length || 0,
            CFG.search_index == 0;
        },
        /**
         * @private
         */
        restore(){
            if(!this.el) return;
            const el = this.el[CFG.search_index];
            if(el) el.classList.add('mu-selection'),
                el.classList.remove('mu-highlight');
        },
        last(){
            if(!this.el || !this.el) return;

            this.restore();

            if(CFG.search_index == 0)
                CFG.search_index = CFG.search_res;

            CFG.search_index --;
            const el = this.el[CFG.search_index];

            el.scrollIntoView({
                'block': 'center'
            });
            el.classList.remove('mu-selection');
            el.classList.add('mu-highlight');
        },
        next(){
            if(!this.el || !this.el) return;

            this.restore();

            if(CFG.search_index+1 == CFG.search_res)
                CFG.search_index = -1;

            CFG.search_index ++;
            const el = this.el[CFG.search_index];

            el.scrollIntoView({
                'block': 'center'
            });
            el.classList.remove('mu-selection');
            el.classList.add('mu-highlight');
        },
        // rep(){
        //     this.obj?.replace(CFG.replace_text,{
        //         isSingle: true,
        //         isRegexp: false
        //     });
        //     this.obj.index = CFG.search_index;
        // },
        repAll(){
            this.obj?.replace(CFG.replace_text ,{
                isSingle: false,
                isRegexp: false
            });
            this.init();
        }
    };

    const img = [
        "avif",
        "webp",
        "jpg", "jpeg", "jxl",
        "png",
        "ico",
        "bmp",
        "svg"
    ];

    function plug(file: string){
        if(!muya?.editor.activeContentBlock) return;
        const data = muya.editor.activeContentBlock.text,
            cur = muya.editor.activeContentBlock.getCursor(),
            meta = splitPath({path: file});
        let prefix = '';
        if(img.includes(meta.ext.toLowerCase()))
            prefix = '!';
        if(cur) muya.editor.activeContentBlock.text =
            data.substring(0, cur.start.offset) +
            prefix + `[ ${data.substring(cur.start.offset, cur.end.offset +1) || meta.fname} ](${FILE_PROXY_SERVER + file} "${meta.fname}")` +
            data.substring(cur.end.offset +1);
        else muya.editor.activeContentBlock.text =
            prefix + `[ ${data || meta.fname} ](${FILE_PROXY_SERVER + file} "${meta.fname}")`;
        muya.editor.activeContentBlock.focusHandler();
        muya.focus();
    }

    onUnmounted(() => muya && muya.destroy());
</script>

<template>
    <div class="md-root" ref="container">
        <div class="md-tools">
            <div class="search" v-show="CFG.search || CFG.replace">
                <div>
                    <input type="text" placeholder="查找" v-model="CFG.search_text" @change="REPManager.init">
                    <span v-if="CFG.search_res">
                        {{ CFG.search_index }} / {{ CFG.search_res }}
                    </span>
                    <span v-else style="color: red;">
                        无结果
                    </span>
                    <!-- 上一个 -->
                    <div @click="REPManager.last()">
                        <svg fill="currentColor" class="bi bi-arrow-up" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
                        </svg>
                    </div>
                    <!-- 下一个 -->
                    <div @click="REPManager.next()">
                        <svg fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                        </svg>
                    </div>
                    <!-- 关闭 -->
                    <div @click="CFG.search = CFG.replace = false">
                        <svg fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                    </div>
                </div>
                <div v-show="CFG.replace" style="margin-top: .35rem; gap: .35rem">
                    <input type="text" placeholder="替换" v-model="CFG.replace_text">
                    <!-- <button @click="REPManager.rep">替换</button> -->
                    <button @click="REPManager.repAll">全部替换</button>
                </div>
            </div>
        </div>
        <div class="md-action">
            <!-- 保存 -->
            <div @click="save">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                </svg>
            </div>
            <!-- 重载 -->
            <div @click="reload">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
            </div>
            <!-- 菜单2 -->
            <span></span>
            <div @click="muya?.undo()">
                <svg fill="currentColor"  viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M14.5 1.5a.5.5 0 0 1 .5.5v4.8a2.5 2.5 0 0 1-2.5 2.5H2.707l3.347 3.346a.5.5 0 0 1-.708.708l-4.2-4.2a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 8.3H12.5A1.5 1.5 0 0 0 14 6.8V2a.5.5 0 0 1 .5-.5z"/>
                </svg>
            </div>
            <div @click="muya?.redo()">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M14.854 4.854a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 4H3.5A2.5 2.5 0 0 0 1 6.5v8a.5.5 0 0 0 1 0v-8A1.5 1.5 0 0 1 3.5 5h9.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4z"/>
                </svg>
            </div>
            <!-- 搜索 -->
            <div @click="CFG.search = !CFG.search,CFG.replace = false">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
            </div>
            <!-- 替换 -->
            <div @click="CFG.replace = !CFG.replace">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                    <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
                </svg>
            </div>
            <!-- 添加 -->
            <div @click="CFG.upload = !CFG.upload" :active="CFG.upload">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>

                <Upload :option="getTree(splitPath(input).dir)" class="after" :active="CFG.upload" @click.stop
                    @create="plug" @select="plug"
                />
                <!-- <div @click.stop class="after" :active="CFG.upload"></div> -->
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    const LANG_PACK = {
        "Insert Row Above": "上面插入行",
        "Insert Row Below": "下面插入行",
        "Remove Row": "删除所在行",
        "Align Left": "左对齐",
        "Align Center": "居中对齐",
        "Align Right": "右对齐",
        "Insert Column left": "在左边插入列",
        "Insert Column right": "在右边插入列",
        "Remove Column": "删除所在列",
        Paragraph: "普通段落",
        "Horizontal Line": "水平分割线",
        "Front Matter": "顶部信息块",
        "Header 1": "大标题",
        "Header 2": "2级标题",
        "Header 3": "中等标题",
        "Header 4": "4级标题",
        "Header 5": "5级标题",
        "Header 6": "小标题",
        "Table Block": "表格",
        "Display Math": "数学公式",
        "HTML Block": "HTML块",
        "Code Block": "代码块",
        "Quote Block": "引用文字",
        "Order List": "有序列表",
        "Bullet List": "无序列表",
        "To-do List": "任务列表",
        "Vega Chart": "Vega 图",
        Mermaid: "Mermaid",
        Plantuml: "Plantuml",
        "basic blocks": "基础块",
        headers: "标题",
        "advanced blocks": "高级块",
        "list blocks": "列表",
        diagrams: "图表",
        "No result": "无结果",
        "Search keyword...": "搜索关键字...",
        "Type / to insert...": "输入 / 插入段落",
        Emphasize: "加粗",
        Italic: "斜体",
        Underline: "下划线",
        Strikethrough: "删除线",
        Highlight: "高亮",
        "Inline Code": "行内代码",
        "Inline Math": "行内数学公式",
        Link: "超链接",
        Image: "图片",
        Eliminate: "清除样式",
        "Copy content": "复制内容",
        "Input Language Identifier...": "输入程序语言标识...",
        "Smileys & Emotion": "笑脸&情绪",
        "People & Body": "人物&身体",
        "Animals & Nature": "动物&自然",
        "Food & Drink": "食物&饮料",
        "Travel & Places": "旅游地",
        Activities: "活动",
        Objects: "物体",
        Symbols: "抽象",
        Flags: "国旗",
        Duplicate: "复制段落",
        "New Paragraph": "新建段落",
        Delete: "删除段落",
        "Edit Image": "编辑图片",
        "Inline Image": "行内图片",
        "Remove Image": "删除图片",
        "Image src placeholder": "图片链接",
        "Confirm Text": "确定",
        "Loading...": "加载中...",
        "Invalid Diagram Code": "图表渲染失败",
        "Empty Diagram": "空图表",
        "Input Mathematical Formula...": "输入数学公式...",
        "Input Front Matter...": "输入页眉...",
        "Invalid Mathematical Formula": "数学公式错误",
        "Empty Mathematical Formula": "空数学公式",
        "Click to add an image": "添加图片",
        "Load image failed": "添加图片失败"
    };
</script>

<style lang="scss">
    .md-root{
        height: 100%;

        @mixin btn_div() {
            padding: .3rem;
            border-radius: .2rem;

            &:hover, &[active=true] {
                background-color: rgb(229 229 229);
            }

            >svg {
                display: block;
                height: 1rem;
                width: 1rem;
            }
        }

        .md-action{
            display: flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.3rem;
            border-radius: 0.45rem;
            background-color: rgb(247 247 247);
            box-shadow: 0 .1rem .5rem #d7d7d7;
            position: absolute;
            bottom: 0.75rem;
            left: 50%;
            transform: translateX(-50%);
            margin: auto;
            z-index: 6;

            > span{
                margin: 0 .1rem;
                height: .9rem;
                width: .1rem;
                background-color: #dddddd;
            }

            > div{
                position: relative;
                @include btn_div();

                > div.after{
                    position: absolute;
                    left: 50%;
                    bottom: 100%;
                    transform: translate(-50%, -1rem) scale(0);
                    opacity: 0;
                    padding: 1rem;
                    border-radius: .35rem;
                    background-color: #f0f0f0;
                    border: solid .1rem #d4d4d4;
                    transition: opacity .2s;
                    z-index: 10;

                    min-width: 12rem;
                    min-height: 12rem;

                    &[active=true]{
                        transform: translate(-50%, -1rem) scale(1);
                        opacity: 1;
                    }
                }
            }
        }

        .md-tools{
            position: absolute;
            top: 2rem;
            right: 1rem;
            z-index: 18;

            > *{
                width: 100vw;
                max-width: 22rem;
                min-width: 18rem;

                background-color: rgb(245, 243, 243);
                padding: .5rem;
                border-radius: .3rem;
            }

            > .search{
                > div{
                    display: flex;
                    align-items: center;

                    > *{
                        flex-shrink: 0;
                    }

                    > span{
                        font-size: .8rem;
                        margin-left: .45rem;
                        flex-grow: 1;
                    }

                    > input{
                        outline: none;
                        border: solid .05rem rgb(194, 194, 194);
                        border-radius: .25rem;
                        padding: .35rem .65rem;
                        width: 50%;

                        &:focus{
                            border-color: #52b5f3;
                        }
                    }

                    > div{
                        @include btn_div();
                    }

                    > button{
                        outline: none;
                        background-color: white;
                        padding: .25rem .5rem;
                        border-radius: .2rem;
                        border: solid .05rem #dbdbdb;
                        cursor: pointer;
                        margin: 0;
                    }
                }

            }
        }

        .md-container{
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;

            padding-top: 3rem;
        }
    }
</style>

<script lang="ts">

</script>
