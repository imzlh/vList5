<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/env';
    import ArtPlayer from 'artplayer';
    import { onMounted, onUnmounted, ref } from 'vue';
    import { FS, Global, clipFName, getConfig, regConfig, splitPath } from '@/utils';
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
                    icon: `<i class="art-icon">
                                <svg width="22" height="22" viewBox="0 0 16 16">
                                    <path fill-rule="evenodd" d="M0 .5A.5.5 0 0 1 .5 0h4a.5.5 0 0 1 0 1h-4A.5.5 0 0 1 0 .5Zm0 2A.5.5 0 0 1 .5 2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm9 0a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Zm-9 2A.5.5 0 0 1 .5 4h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Zm5 0a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Zm7 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Zm-12 2A.5.5 0 0 1 .5 6h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Zm8 0a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Zm-8 2A.5.5 0 0 1 .5 8h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Zm7 0a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm-7 2a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5Z"/>
                                </svg>
                            </i>`,
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
            else Global('ui.message').call({
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
                    html: `<i class="art-icon">
                                <svg width="22" height="22" viewBox="0 0 16 16">
                                    <path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z"/>
                                </svg>
                            </i>`,
                    tooltip: '上一个视频',
                    click: () => control.last()
                }, {
                    name: 'forward',
                    index: 15,
                    position: 'left',
                    html: `<i class="art-icon">
                                <svg width="22" height="22" viewBox="0 0 16 16">
                                    <path d="M7.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C.713 12.69 0 12.345 0 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z"/>
                                    <path d="M15.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C8.713 12.69 8 12.345 8 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z"/>
                                    </svg>
                            </i>`,
                    tooltip: '快进 ' + CONFIG.seek_time + 's',
                    click: () => art && (art.forward = CONFIG.seek_time.value)
                }, {
                    name: 'backward',
                    index: 8,
                    position: 'left',
                    html: `<i class="art-icon">
                                <svg viewBox="0 0 20 20" width="22" height="22">
                                    <path d="M7.712 4.819A1.5 1.5 0 0110 6.095v2.973c.104-.131.234-.248.389-.344l6.323-3.905A1.5 1.5 0 0119 6.095v7.81a1.5 1.5 0 01-2.288 1.277l-6.323-3.905a1.505 1.505 0 01-.389-.344v2.973a1.5 1.5 0 01-2.288 1.276l-6.323-3.905a1.5 1.5 0 010-2.553L7.712 4.82z"></path>
                                </svg>
                            </i>`,
                    tooltip: '快退 ' + CONFIG.seek_time + 's',
                    click: () => art && (art.backward = CONFIG.seek_time.value)
                }, {
                    name: 'next',
                    index: 20,
                    position: 'left',
                    html: `<i class="art-icon">
                                <svg width="22" height="22" viewBox="0 0 16 16">
                                    <path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0V4z"/>
                                </svg>
                            </i>`,
                    tooltip: '下一个视频',
                    click: () => control.next()
                }
            ],
            settings: [
            {
                    html: '字幕',
                    name: 'subtitle',
                    tooltip: '选取当前字幕',
                    icon: `<i class="art-icon">
                                <svg width="22" height="22" viewBox="0 0 16 16">
                                    <path fill-rule="evenodd" d="M4.5 11.5A.5.5 0 0 1 5 11h10a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm-2-4A.5.5 0 0 1 3 7h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm-2-4A.5.5 0 0 1 1 3h10a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5z"/>
                                </svg>
                            </i>`,
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
                    icon: ` <i class="art-icon">
                                <svg width="22" height="22"  viewBox="0 0 16 16">
                                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                                    <path d="M4 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8zm0 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
                                </svg>        
                            </i>`,
                    selector: [],
                    onSelect: function (item) {
                        if (item.url == undefined)
                            return console.log('Failed to set:NULL element');
                        control.play(item as any);
                    }
                },{
                    html: '循环播放',
                    tooltip: '此视频循环播放',
                    icon: `<i class="art-icon">
                                <svg width="22" height="22" viewBox="0 0 16 16">
                                    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                                    <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                                </svg>
                            </i>`,
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
</style>