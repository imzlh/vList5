<script setup lang="ts">
    import type { vFile } from '@/env';
    import { regSelf } from '@/opener';
    import { FS, getConfig, regConfig, splitPath } from '@/utils';
    import APlayer, { addMusicPlugin } from 'aplayer-ts';
    import { onMounted, onUnmounted, ref } from 'vue';

    const dom = ref<HTMLElement>(),
        props = defineProps(['option']),
        data = props['option'] as vFile,
        ev = defineEmits(['show']);
    var ap = APlayer() .use(addMusicPlugin),
        list:Array<vFile & {lrc?:vFile,cover?:vFile}> = [],
        cur = -1;

    const IMAGE = [
        "avif",
        "webp",
        "jpg", "jpeg", "jxl",
        "png",
        "ico",
        "bmp"
    ],THEME = getConfig('aplayer')['theme'];

    async function play(file:vFile){
        // 找到ID
        for (let i = 0; i < list.length; i++)
            if(list[i].path == file.path)
                return ap.list.switch(i);

        // 不在列表中
        const info = splitPath(file),
            dir = (await FS.listall(info['dir'])).filter(item => item.type == 'file') as vFile[];
        let cover: undefined | vFile, lrc: undefined | vFile;
        // 找到文件
        for (const file of dir) {
            const inf = splitPath(file),
                ext = inf.ext.toLowerCase(),
                fullmatch = inf.name.toLowerCase() == info['name'].toLowerCase();
            // 可以作为封面
            if (IMAGE.includes(ext) &&
                // 匹配图片
                (fullmatch || (inf.name.toLowerCase() == 'cover' && !cover))
            )
                cover = file;
            else if (ext == 'lrc' && fullmatch)
                lrc = file;
        }
        // 推入数据
        (file as any).cover = cover,
            (file as any).lrc = lrc;
        list.push(file);
        ap.list.switch(cur = length++);

        // 加载
        ap.list.add({
            "cover": cover?.url,
            "artist": "未知",
            "lrc": lrc?.url,
            "name": info['name'],
            "url": file.url
        });
    }

    const reg = regSelf('APlayer',function(file){
        play(file);
        ev('show');
    });

    onMounted(function(){
        ap.init({
            "container": dom.value,
            "audio": [],
            "autoplay": true,
            "listFolded": true,
            "theme": THEME.value
        });
        play(data);
    });

    onUnmounted(() => {ap.destroy(); reg()});
</script>

<template>
    <div class="aplayer" ref="dom">

    </div>
</template>

<script lang="ts">
    regConfig('aplayer',[
        {
            "name": "主题颜色",
            "type": "text",
            "key": "theme",
            "default": "#3fcd82",
            "desc": "默认的主题颜色，使用HEX"
        }
    ]);
</script>

<style lang="css">
    .aplayer {
        user-select: none;
    }

    .aplayer * {
        box-sizing: content-box
    }

    .aplayer svg {
        width: 100%;
        height: 100%
    }

    .aplayer svg circle,.aplayer svg path {
        fill: #fff
    }

    .aplayer.aplayer-withlist .aplayer-info {
        border-bottom: .05rem solid #e9e9e9
    }

    .aplayer.aplayer-loading .aplayer-info .aplayer-controller .aplayer-loading-icon {
        display: block
    }

    .aplayer.aplayer-loading .aplayer-info .aplayer-controller .aplayer-bar-wrap .aplayer-bar .aplayer-played .aplayer-thumb {
        -webkit-transform: scale(1);
        transform: scale(1)
    }

    .aplayer .aplayer-icon {
        width: 1rem;
        height: 1rem;
        border: none;
        background-color: transparent;
        outline: none;
        cursor: pointer;
        opacity: .8;
        vertical-align: middle;
        padding: 0;
        font-size: .8rem;
        margin: 0;
        display: inline-block
    }

    .aplayer .aplayer-icon path {
        transition: all .2s ease-in-out
    }

    .aplayer .aplayer-icon-lrc-inactivity svg {
        opacity: .4
    }

    .aplayer .aplayer-icon-forward {
        -webkit-transform: rotate(180deg);
        transform: rotate(180deg)
    }

    .aplayer .aplayer-lrc-content {
        display: none
    }

    .aplayer .aplayer-pic {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 50%;
        background-position: 50%;
        transition: all .3s ease;
        cursor: pointer;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }

    .aplayer .aplayer-pic:hover .aplayer-button {
        opacity: 1
    }

    .aplayer .aplayer-pic .aplayer-button {
        position: absolute;
        border-radius: 50%;
        opacity: .8;
        text-shadow: 0 .05rem .05rem rgba(0,0,0,.2);
        box-shadow: 0 .05rem .05rem rgba(0,0,0,.2);
        background: rgba(0,0,0,.2);
        transition: all .1s ease;
        z-index: 10;
    }

    .aplayer .aplayer-pic .aplayer-button path {
        fill: #fff
    }

    .aplayer .aplayer-pic .aplayer-hide {
        display: none
    }

    .aplayer .aplayer-pic .aplayer-play {
        width: 4rem;
        height: 4rem;
        border: .1rem solid #fff;
        bottom: 50%;
        right: 50%;
        margin: 0 -.8rem -.8rem 0
    }

    .aplayer .aplayer-pic .aplayer-play svg {
        position: absolute;
        top: .5rem;
        left: .65rem;
        height: 3rem;
        width: 3rem;
    }

    .aplayer .aplayer-pic .aplayer-pause {
        width: 2rem;
        height: 2rem;
        border: .1rem solid #fff;
        bottom: .75rem;
        right:.75rem;
    }

    .aplayer .aplayer-pic .aplayer-pause svg {
        position: absolute;
        top: .3rem;
        left: .3rem;
        height: 1.4rem;
        width: 1.4rem;
    }

    .aplayer .aplayer-info .aplayer-music {
        position: absolute;
        border: .2rem;
        left: 1rem;
        right: .2rem;
        top: calc(50% - 1.75rem);
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
        cursor: default;
        z-index: 5;
    }

    .aplayer .aplayer-info .aplayer-music .aplayer-title {
        font-size: .85rem;
    }

    .aplayer .aplayer-info .aplayer-music .aplayer-author {
        font-size: .8rem;
        color: #666
    }

    .aplayer .aplayer-info .aplayer-controller {
        position: absolute;
        bottom: .2rem;
        left: .2rem;
        right: .2rem;
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-bar-wrap {
        padding: .2rem 0;
        cursor: pointer!important;
        flex: 1
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-bar-wrap:hover .aplayer-bar .aplayer-played .aplayer-thumb {
        -webkit-transform: scale(1);
        transform: scale(1)
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-bar-wrap .aplayer-bar {
        position: relative;
        height: .1rem;
        width: 100%;
        background: #cdcdcd
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-bar-wrap .aplayer-bar .aplayer-loaded {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: #aaa;
        height: .1rem;
        transition: all .5s ease
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-bar-wrap .aplayer-bar .aplayer-played {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        height: .1rem
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-bar-wrap .aplayer-bar .aplayer-played .aplayer-thumb {
        position: absolute;
        top: 0;
        right: .25rem;
        margin-top: -.2rem;
        margin-right: -.6rem;
        height: .6rem;
        width: .6rem;
        border-radius: 50%;
        cursor: pointer;
        transition: all .3s ease-in-out;
        -webkit-transform: scale(0);
        transform: scale(0)
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time {
        color: #999;
        font-size: .8rem;
        display: flex;
        align-items: center
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-icon{
        margin: 0 .25rem;
        transform: scale(1.1);
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-time-inner {
        flex-grow: 1;
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-icon {
        cursor: pointer;
        transition: all .2s ease
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-icon path {
        fill: #666
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-icon.aplayer-icon-loop {
        margin-right: .1rem
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-icon:hover path {
        fill: #000
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-time .aplayer-icon.aplayer-icon-menu,.aplayer .aplayer-info .aplayer-controller .aplayer-time.aplayer-time-narrow .aplayer-icon-menu,.aplayer .aplayer-info .aplayer-controller .aplayer-time.aplayer-time-narrow .aplayer-icon-mode {
        display: none
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-volume-wrap {
        position: relative;
        margin-left: .15rem;
        cursor: pointer!important;
        float: right;
    }

    .aplayer .aplayer-volume-wrap .aplayer-volume-bar-wrap .aplayer-volume-bar {
        position: fixed;
        top: calc(50% - 5rem);
        right: .25rem;
        width: .8rem;
        height: 10rem;
        border-radius: .4rem;
        background: #dfd8d8a1;
        overflow: hidden;
        z-index: 12;

        opacity: 0;
        transition: opacity .1s;
        transition-delay: 3s;
    }

    .aplayer  .aplayer-volume-wrap:hover .aplayer-volume-bar{
        transition-delay: 0ms;
        opacity: 1;
    }

    .aplayer .aplayer-volume-bar:hover{
        opacity: 1;
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-volume-wrap .aplayer-volume-bar-wrap .aplayer-volume-bar .aplayer-volume {
        bottom: 0;
        position: absolute;
        right: 0;
        width: 100%;
        border-radius: .4rem;
        transition: all .1s ease;
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-loading-icon {
        display: none
    }

    .aplayer .aplayer-info .aplayer-controller .aplayer-loading-icon svg {
        position: absolute;
        -webkit-animation: rotate 1s linear infinite;
        animation: rotate 1s linear infinite
    }

    .aplayer .aplayer-lrc {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
    }

    .aplayer .aplayer-lrc:after {
        content: '';
        position: absolute;
        bottom: 0;
        height: 33%;
        width: 100%;
        background: linear-gradient(180deg,hsla(0,0%,100%,0) 0,hsla(0,0%,100%,.8));
        filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#00ffffff",endColorstr="#ccffffff",GradientType=0)
    }

    .aplayer .aplayer-lrc p {
        font-size: .8rem;
        color: #666;
        line-height: 1rem!important;
        height: 1rem!important;
        padding: 0!important;
        margin: 0!important;
        transition: all .5s ease-out;
        opacity: .4;
        overflow: hidden
    }

    .aplayer .aplayer-lrc p.aplayer-lrc-current {
        opacity: 1;
        overflow: visible;
        height: auto!important;
        min-height: 1rem
    }

    .aplayer .aplayer-lrc.aplayer-lrc-hide {
        display: none
    }

    .aplayer .aplayer-lrc .aplayer-lrc-contents {
        width: 100%;
        transition: all .5s ease-out;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
        cursor: default
    }

    .aplayer .aplayer-list{
        position: absolute !important;
        height: 50%;
        left: 0;
        right: 0;
        top: 50%;
        z-index: 10;
        overflow-y: auto;
    }

    .aplayer .aplayer-list ol {
        list-style-type: none;
        margin: 0;
        padding: 0;
        overflow-y: auto;
    }

    .aplayer .aplayer-list ol::-webkit-scrollbar {
        width: .25rem
    }

    .aplayer .aplayer-list ol::-webkit-scrollbar-thumb {
        border-radius: .15rem;
        background-color: #eee
    }

    .aplayer .aplayer-list ol::-webkit-scrollbar-thumb:hover {
        background-color: #ccc
    }

    .aplayer .aplayer-list ol li {
        position: relative;
        height: 2rem;
        line-height: 2rem;
        padding: 0 .8rem;
        font-size: .8rem;
        border-top: .05rem solid #e9e9e9;
        cursor: pointer;
        transition: all .2s ease;
        overflow: hidden;
        margin: 0
    }

    .aplayer .aplayer-list ol li:first-child {
        border-top: none
    }

    .aplayer .aplayer-list ol li:hover {
        background: #efefef
    }

    .aplayer .aplayer-list ol li.aplayer-list-light {
        background: #e9e9e9
    }

    .aplayer .aplayer-list ol li.aplayer-list-light .aplayer-list-cur {
        display: inline-block
    }

    .aplayer .aplayer-list ol li .aplayer-list-cur {
        display: none;
        width: .2rem;
        height: 1.5rem;
        position: absolute;
        left: 0;
        top: .25rem;
        cursor: pointer
    }

    .aplayer .aplayer-list ol li .aplayer-list-index {
        color: #666;
        margin-right: .8rem;
        cursor: pointer
    }

    .aplayer .aplayer-list ol li .aplayer-list-author {
        color: #666;
        float: right;
        cursor: pointer
    }

    .aplayer .aplayer-notice {
        opacity: 0;
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: .75rem;
        border-radius: .2rem;
        padding: .25rem .6rem;
        transition: all .3s ease-in-out;
        overflow: hidden;
        color: #fff;
        pointer-events: none;
        background-color: #f4f4f5;
        color: #909399
    }

    .aplayer .aplayer-miniswitcher {
        display: none;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        height: 100%;
        background: #e6e6e6;
        width: 1.2rem;
        border-radius: 0 .1rem .1rem 0
    }

    .aplayer .aplayer-miniswitcher .aplayer-icon {
        height: 100%;
        width: 100%;
        -webkit-transform: rotateY(180deg);
        transform: rotateY(180deg);
        transition: all .3s ease
    }

    .aplayer .aplayer-miniswitcher .aplayer-icon path {
        fill: #666
    }

    .aplayer .aplayer-miniswitcher .aplayer-icon:hover path {
        fill: #000
    }

    @-webkit-keyframes aplayer-roll {
        0% {
            left: 0
        }

        to {
            left: -100%
        }
    }

    @keyframes aplayer-roll {
        0% {
            left: 0
        }

        to {
            left: -100%
        }
    }

    @-webkit-keyframes rotate {
        0% {
            -webkit-transform: rotate(0);
            transform: rotate(0)
        }

        to {
            -webkit-transform: rotate(1turn);
            transform: rotate(1turn)
        }
    }

    @keyframes rotate {
        0% {
            -webkit-transform: rotate(0);
            transform: rotate(0)
        }

        to {
            -webkit-transform: rotate(1turn);
            transform: rotate(1turn)
        }
    }

</style>
