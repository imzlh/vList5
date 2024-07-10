<script lang="ts" setup>
    import type { vFile } from '@/env';
    import {
        CodeBlockLanguageSelector,
        EmojiSelector,
        en,
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
        TableRowColumMenu,
        zh,
    } from '@muyajs/core';
    import '@muyajs/core/lib/style.css';
    import { onMounted, ref } from 'vue';

    Muya.use(EmojiSelector);
    Muya.use(InlineFormatToolbar);
    Muya.use(ImageToolBar);
    Muya.use(ImageResizeBar);
    Muya.use(CodeBlockLanguageSelector);

    Muya.use(ParagraphFrontButton);
    Muya.use(ParagraphFrontMenu);
    Muya.use(TableColumnToolbar);
    Muya.use(ParagraphQuickInsertMenu);
    Muya.use(TableDragBar);
    Muya.use(TableRowColumMenu);
    Muya.use(PreviewToolBar);

    const container = ref<HTMLElement>(),
        _input = defineProps(['option']),
        input = _input.option as vFile;

    onMounted(async function(){
        const text = await (await fetch(input.url)).text(),
            muya = new Muya(container.value as HTMLElement, {
                "markdown": text,
                "autoPairBracket": true,
                "autoPairMarkdownSyntax": true,
                "autoPairQuote": true,
                "locale": {
                    name: "zh",
                    resource: {
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
                    }
                    },
                "math": true,
                "tabSize": 4
            });

        muya.init();
    });
</script>

<template>
    <div class="md-container" ref="container"></div>
</template>

<style lang="scss">
    .md-container{
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;

        padding-top: 3rem;
    }
</style>