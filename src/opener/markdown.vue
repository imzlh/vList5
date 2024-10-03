<script lang="ts" setup>
    import type { AlertOpts, MessageOpinion, vFile } from '@/env';
    import Upload from '@/module/upload.vue';
    import { alert, encodePath, FILE_PROXY_SERVER, FS, message, splitPath } from '@/utils';
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
    import { onMounted, onUnmounted, reactive, ref } from 'vue';

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
        ])).then(() => message({
            'type': 'info',
            'timeout': 5,
            'title': 'Muya',
            'content': {
                'title': '保存成功',
                'content': '文件成功写入远程'
            }
        } satisfies MessageOpinion))
        .catch((e:Error) => message({
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

        alert({
            'type': 'confirm',
            'title': '确认覆盖',
            'message': '可能会覆盖更改，确认重载吗',
            'callback': async res => {
                if(!res) return;
                const text = await (await fetch(input.url)).text();
                muya?.setContent(text);
                message({
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
            prefix + `[ ${data.substring(cur.start.offset, cur.end.offset +1) || meta.fname} ](${FILE_PROXY_SERVER + encodePath(file)} "${meta.fname}")` +
            data.substring(cur.end.offset +1);
        else muya.editor.activeContentBlock.text =
            prefix + `[ ${data || meta.fname} ](${FILE_PROXY_SERVER + encodePath(file)} "${meta.fname}")`;
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
                    <div @click="REPManager.last()" vs-icon="top" />
                    <!-- 下一个 -->
                    <div @click="REPManager.next()" vs-icon="bottom" />
                    <!-- 关闭 -->
                    <div @click="CFG.search = CFG.replace = false" vs-icon="x" />
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
            <div @click="save" vs-icon="save" />
            <!-- 重载 -->
            <div @click="reload" vs-icon="reload" />
            <!-- 菜单2 -->
            <span></span>
            <div @click="muya?.undo()" vs-icon="point-left" />
            <div @click="muya?.redo()" vs-icon="point-right" />
            <!-- 搜索 -->
            <div @click="CFG.search = !CFG.search,CFG.replace = false" vs-icon="search" />
            <!-- 替换 -->
            <div @click="CFG.replace = !CFG.replace" vs-icon="mix" />
            <!-- 添加 -->
            <div @click="CFG.upload = !CFG.upload" :active="CFG.upload">
                <i vs-icon="plus" />

                <Upload :option="FS.stat(splitPath(input).dir)" class="after" :active="CFG.upload" @click.stop
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

            [vs-icon] {
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
                width: 1rem;
                height: 1rem;
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
                        width: 1rem;
                        height: 1rem;
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
