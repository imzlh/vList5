<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/env';
    import ArtPlayer from 'artplayer';
    import { onMounted, onUnmounted, ref } from 'vue';
    import { FS, getConfig, message, regConfig, splitPath } from '@/utils';
    import { regSelf } from '@/opener';
    import type { Selector } from 'artplayer/types/component';

    const element = ref<HTMLDivElement>();
    const props = defineProps({
        "option": {
            "type": Object,
            "required": true
        }
    }),file = props['option'] as vFile,
    ev = defineEmits(['show']);

    var art: ArtPlayer | undefined,
        plugASS:Record<string,any>;

    const DC = getConfig('artplayer'),CONFIG = {
        seek_time: DC['seek'],
        subtitle: [
            "ssa",
            "ass",
            "vtt",
            "srt"
        ],
        "video":[
            "webm",
            "mkv",
            "mp4",
            "ogv"
        ]
    }

    interface Item extends Selector{
        url?: string,
        name: string,
        selector: Array<Item>
    }

    const control = {
        current: 0,
        loop: false,
        dir: '?',
        subtitles: [] as Array<vFile>,
        videos: [] as Array<vFile>,
        set(i:number){
            if(!art) return;
            if(!this.videos[i]) return console.error('Video#' + i + ' not found');

            // 选中视频
            const file = this.videos[i];
            art.setting.update({
                "selector": this.videos.map(item => ({
                    "html": item.name,
                    "url": item.url,
                    "name": item.name,
                    "default": file.name == item.name
                })),
                "name": "playlists"
            });
            art.url = file.url;
    
            // 找到适合字幕
            art.setting.update({
                "selector": [{
                    html: '启用字幕',
                    tooltip: '已启用',
                    icon: `<i class="art-icon" vs-icon="text" invert />`,
                    switch: true,
                    onSwitch: function (item:Record<string,any>) {
                        item.tooltip = item.switch ? '已关闭' : '已启用';
                        plugASS && plugASS.hide();
                        return !item.switch;
                    },
                } as any,...this.subtitles.map(item => ({
                    "html": item.name,
                    "url": item.url,
                    "name": item.name,
                    "default": file.path == item.path
                }))],
                "name": "subtitle"
            });

            // 成功
            this.current = i;
        },
        next() {
            if(!art) return;

            if(this.current == this.videos.length-1)
                this.set(0);
            else
                this.set(this.current +1);
        },
        last() {
            if(!art) return;

            if(this.current == 0)
                this.set(this.videos.length -1);
            else
                this.set(this.current -1);
        },
        async play(file:vFile) {
            if(!art) return;

            const dir = splitPath(file)['dir'];
            let id:number|undefined;
            if(this.dir == dir){
                // 找到ID
                for (let i = 0; i < this.videos.length; i++)
                    if(this.videos[i].name == file.name){
                        id = i;
                        break;
                    }
            }else{
                // 更新列表
                const list = (await FS.list(dir || '/')).filter(item => item.type == 'file') as Array<vFile>;
                this.videos = [];this.subtitles = [];
                let i = 0;
                list.forEach(item => {
                    const info = splitPath(item);
                    // 是视频
                    if(CONFIG.video.includes(info.ext.toLowerCase())){
                        if(item.name == file.name)
                            id = i;
                        this.videos.push(item);
                        i++;
                    // 是字幕
                    }else if(CONFIG.subtitle.includes(info.ext.toLowerCase())){
                        this.subtitles.push(item);
                    }
                });

                // 更新
                this.dir = dir;
            }

            if(id !== undefined) return this.set(id);
            else message({
                "type": "error",
                "title": "ArtPlayer",
                "content":{
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                },
                "timeout": 5
            } satisfies MessageOpinion);
        }
    };

    // 注册自己
    const reg = regSelf('ArtPlayer',(f) => {
        control.play(f);
        ev('show');
    });

    onUnmounted(function(){
        art && art.destroy();
        reg();
    });

    onMounted(function () {
        if (!element.value) return;
        art = new ArtPlayer({
            "airplay": true,
            "container": element.value,
            "url": file.url,
            "theme": "#3fcd82",
            "autoplay": true,
            "flip": true,
            "playbackRate": true,
            "setting": true,
            "aspectRatio": true,
            "screenshot": true,
            "pip": true,
            "fullscreen": true,
            "subtitleOffset": true,
            "lock": true,
            "fastForward": true,
            "autoOrientation": true,
            "autoPlayback": true,
            "subtitle": {
                escape: false
            },
            // "customType": {
            //     "m3u8": opener.mpd,
            //     "flv": opener.flv,
            //     "mpd": opener.mpd
            // },
            "controls": [
                {
                    name: 'last',
                    index: 5,
                    position: 'left',
                    html: `<i class="art-icon" vs-icon="prev" invert />`,
                    tooltip: '上一个视频',
                    click: () => control.last()
                }, {
                    name: 'forward',
                    index: 15,
                    position: 'left',
                    html: `<i class="art-icon" vs-icon="forward" invert />`,
                    tooltip: '快进 ' + CONFIG.seek_time.value + 's',
                    click: () => art && (art.forward = CONFIG.seek_time.value)
                }, {
                    name: 'backward',
                    index: 8,
                    position: 'left',
                    html: `<i class="art-icon" vs-icon="backward" invert />`,
                    tooltip: '快退 ' + CONFIG.seek_time + 's',
                    click: () => art && (art.backward = CONFIG.seek_time.value)
                }, {
                    name: 'next',
                    index: 20,
                    position: 'left',
                    html: `<i class="art-icon" vs-icon="next" invert />`,
                    tooltip: '下一个视频',
                    click: () => control.next()
                }
            ],
            settings: [
            {
                    html: '字幕',
                    name: 'subtitle',
                    tooltip: '选取当前字幕',
                    icon: `<i class="art-icon" vs-icon="text" invert />`,
                    selector: [],
                    onSelect: function (item) {
                        if (item.url){
                            this.subtitle.url = item.url;
                        }else{
                            return false;
                        }
                    }
                },{
                    html: '播放列表',
                    name: 'playlists',
                    width: 250,
                    tooltip: '选择播放的视频',
                    icon: ` <i class="art-icon" vs-icon="list" invert />`,
                    selector: [],
                    onSelect: function (item) {
                        if (item.url == undefined)
                            return console.log('Failed to set:NULL element');
                        control.play(item as any);
                    }
                },{
                    html: '循环播放',
                    tooltip: '此视频循环播放',
                    icon: `<i class="art-icon" vs-icon="loop" invert />`,
                    switch: false,
                    onSwitch: item => control.loop = !item.switch
                }
            ]
        });
        // 初始化列表
        control.play(file);
    });

</script>

<template>
    <div class="art-container" ref="element" style="width: 100%;height: 100%;"></div>
</template>

<script lang="ts">
    regConfig('artplayer',[
        {
            "type": "number",
            "name": "单次切换时长",
            "default": 10,
            "key": "seek",
            "desc": "当快进/快退时更改的时长",
            "step": 1
        }
    ])
</script>

<style lang="scss">
    // 修复ArtPlayer Bug
    .art-setting-item-left-icon{
        flex-shrink: 0;
    }
    .art-setting-item-left-text{
        font-size: 12px;
        line-height: 14px;
        max-height: 28px;
        overflow: hidden;
    }
    .art-setting-item-back{
        background-color: #3f3f3f;
        position: sticky;
        top: 0;
    }
    .art-icon[vs-icon]::before{
        transform: scale(1.5);
    }
</style>