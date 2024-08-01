<script lang="ts" setup>
    import { onMounted, onUnmounted, reactive, ref, watch, type Directive } from 'vue';
    import createAV, { type Export } from '@/utils/avplayer';
    import type { CtxDispOpts, MessageOpinion, vFile } from '@/env';
    import { reqFullscreen, UI } from '@/App.vue';
    import { acceptDrag, FS, Global, splitPath } from '@/utils';
    import ASS from 'assjs';

    const CONFIG = {
        seek_time: 10,
        media: [
            "webm",
            "mka",
            "mkv",
            "mp4",
            "m4a",
            "ogv",
            "ogg",
            "opus",
            "mp3",
            "flac",
            // extra pack
            "pcm",
            "flv",
            "mov",
            "m2ts",
            "ivf",
            "wav"
        ]
    },vSpeed = {
        mounted(el, bind){
            watch(() => player.value?.playBackRate, val => 
                el.setAttribute('active', val == bind.value ? 'true' : 'false')
            );
            el.onclick = () => player.value && (player.value.playBackRate = bind.value);
        }
    } satisfies Directive<HTMLElement, number>;

    const videoel = ref<HTMLDivElement>(),
        _prop = defineProps(['option']),
        file = _prop.option as vFile,
        ui = reactive({
            about: false,
            track: false,
            playlist: false,
            speed: false,
            videos: [] as Array<vFile & { name: string }>,
            videoID: 0
        }),
        root = ref<HTMLElement>();

    function time2str(time:number){
        time /= 1000;
        const min = Math.floor(time / 60),
            sec = Math.floor(time % 60);
        return min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
    }

    const exitFullScreen = () => document.exitFullscreen();

    const player = ref<Export>();
    onMounted(function(){
        player.value = createAV(videoel.value as HTMLDivElement);
        CTRL.play(file);
    });
    onUnmounted(() => player.value?.destroy());

    const CTRL = {
        dir: '?',
        temp_url: null as null|string,
        async play(file: vFile) {
            const dir = splitPath(file)['dir'];
            let id: number | undefined;
            if(this.ass) this.ass.destroy();
            if (this.dir == dir) {
                // 找到ID
                for (let i = 0; i < ui.videos.length; i++)
                    if (ui.videos[i].path == file.path) {
                        id = i;
                        break;
                    }
            } else {
                // 更新列表
                const list = (await FS.listall(dir || '/')).filter(item => item.type == 'file');
                ui.videos = [];
                let i = 0;
                list.forEach(item => {
                    const info = splitPath(item);
                    // 是视频
                    if (CONFIG.media.includes(info.ext.toLowerCase())) {
                        if (item.name == file.name)
                            id = i;
                        // 转换
                        ui.videos.push({...item, name: info.name});
                        i++;
                    }
                });
                // 更新
                this.dir = dir;
            }

            if (id !== undefined){
                ui.videoID = id;
            }else Global('ui.message').call({
                "type": "error",
                "title": "vPlayer",
                "content": {
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                },
                "timeout": 5
            } satisfies MessageOpinion);
        },
        next(){
            if(ui.videoID == ui.videos.length -1)
                ui.videoID = 0;
            else ui.videoID ++;
        },
        prev(){
            if(ui.videoID == 0)
                ui.videoID = ui.videos.length -1;
            else ui.videoID --;
        },
        ass: undefined as undefined | ASS,
        async createASS(file: vFile){
            if(this.ass) this.ass.destroy();
            const fctx = await (await fetch(file.url)).text();
            this.ass = new ASS(fctx, videoel.value as any, {
                container: videoel.value,
                resampling: 'script_width'
            });
            Global('ui.message').call({
                'type': 'info',
                'title': 'AVPlayer',
                'content': {
                    'title': '成功',
                    'content': '字母轨道成功渲染'
                },
                'timeout': 3
            } satisfies MessageOpinion);
        }
    };

    function ctxmenu(e: MouseEvent){
        Global('ui.ctxmenu').call({
            'pos_x': e.clientX,
            'pos_y': e.clientY,
            'content': [
                {
                    "text": "播放速度",
                    handle: () => ui.speed = true
                },{
                    "text": "播放列表",
                    handle: () => ui.playlist = true
                },{
                    "text": "视频轨道",
                    handle: () => ui.track = true
                },{
                    "text": "截图",
                    "child": [
                        {
                            text: 'webp',
                            handle: () => player.value?.func.snapshot('webp')
                        },{
                            text: 'png',
                            handle: () => player.value?.func.snapshot('png')
                        },{
                            text: 'jpg/jpeg',
                            handle: () => player.value?.func.snapshot('jpeg')
                        }
                    ]
                },{
                    text: "校准轨道",
                    handle: () => player.value?.func.seek(player.value.time.current +1)
                },'---',{
                    "text": "统计信息",
                    handle: () => ui.about = true
                }
            ]
        } satisfies CtxDispOpts);
    }

    function basicKbdHandle(e: KeyboardEvent){
        if(!player.value || player.value.time.total == 0) return;
        switch(e.key){
            case 'ArrowRight':
                player.value.func.seek(player.value.time.current + 10 * 1000);
            break;

            case 'ArrowLeft':
                player.value.func.seek(player.value.time.current - 10 * 1000);
            break;

            case 'ArrowUp':
                player.value.volume <= 0.9
                    ? player.value.volume += .1
                    : player.value.volume = 1;
            break;

            case 'ArrowDown':
                player.value.volume <= 0.1
                    ? player.value.volume -= .1
                    : player.value.volume = 0;
            break;

            case ' ':
            case 'Enter':
                player.value.play = !player.value.play;
            break;
        }
    }

    watch(() => ui.videos[ui.videoID], function(vid){
        if(!vid || !player.value) return;
        player.value.url = vid.url;
    });

    watch(root, val => acceptDrag(val as HTMLElement, f => 
        f.name.endsWith('.ass') ? CTRL.createASS(f) : CTRL.play(f)
    ));
    watch(UI.app_width, w => player.value && (player.value.func.resize = [w, UI.height_total.value]));
</script>

<script lang="ts">
    const DEFS = {
        0: BigInt(0),
        100: BigInt(100)
    }
</script>

<template>
    <div class="av-container" ref="root" v-touch tabindex="-1"
        @contextmenu.prevent="ctxmenu" @keydown.prevent.stop="basicKbdHandle"
        @dblclick.prevent="player && (player.play = !player.play)"
    >
        <div class="video" ref="videoel"></div>
        <div class="bar" v-if="player" :style="{
            pointerEvents: player.time.total == 0 ? 'none' : 'all'
        }">
            <div class="time">
                <div class="current">{{ time2str(player.time.current) }}</div>
                <div class="timebar" @click="player.func.seek($event.offsetX / ($event.currentTarget as HTMLElement).clientWidth * player.time.total)">
                    <div :style="{ width: player.time.current / player.time.total * 100 + '%' }"></div>
                </div>
                <div class="total">{{ time2str(player.time.total) }}</div>
            </div>
            
            <div class="icons">

                <!-- 播放列表 -->
                <div small @click="ui.playlist = !ui.playlist">
                    <svg viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                </div>

                <!-- 速度 -->
                <div small @click="ui.speed = !ui.speed">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z" />
                        <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z" />
                        <path
                            d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z" />
                    </svg>
                </div>

                <!-- 轨道设置 -->
                <div small @click="ui.track = !ui.track">
                    <svg viewBox="0 0 16 16">
                        <path d="M14 4.577v6.846L8 15V1l6 3.577zM8.5.134a1 1 0 0 0-1 0l-6 3.577a1 1 0 0 0-.5.866v6.846a1 1 0 0 0 .5.866l6 3.577a1 1 0 0 0 1 0l6-3.577a1 1 0 0 0 .5-.866V4.577a1 1 0 0 0-.5-.866L8.5.134z"/>
                    </svg>
                </div>

                <!--上一个-->
                <div @click.stop="CTRL.prev()">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" />
                    </svg>
                </div>

                <!-- 播放暂停 -->
                <div large @click.stop="player.play = !player.play">
                    <svg viewBox="0 0 16 16" v-show="!player.play">
                        <path
                            d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                    </svg>
                    <svg viewBox="0 0 16 16" v-show="player.play" style="transform: scale(1.2);">
                        <path
                            d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                    </svg>
                </div>

                <div @click.stop="CTRL.next()">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0V4z" />
                    </svg>
                </div>
                
                <!-- 信息 -->
                <div @click="ui.about = !ui.about" small>
                    <svg viewBox="0 0 16 16">
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                </div>

                <!-- 截图 -->
                <div @click="player.func.snapshot()">
                    <svg viewBox="0 0 16 16">
                        <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
                        <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
                    </svg>
                </div>
                
                <!--全屏-->
                <div small @click.stop="UI.fullscreen.value ? exitFullScreen() : reqFullscreen()">
                    <svg viewBox="0 0 16 16" v-show="!UI.fullscreen.value">
                        <path
                            d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
                    </svg>
                    <svg viewBox="0 0 16 16" v-show="UI.fullscreen.value">
                        <path
                            d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z" />
                    </svg>
                </div>
            </div>
            
        </div>
        <div class="frame speed" v-show="ui.speed">
            <h1>播放速度</h1>
            <ul class="select">
                <li v-speed=".75">0.75x</li>
                <li v-speed="1">1x</li>
                <li v-speed="1.25">1.25x</li>
                <li v-speed="1.5">1.5x</li>
                <li v-speed="2">2x</li>
            </ul>
        </div>
        <div class="about frame" v-show="ui.about">
            <h1>统计信息</h1>
            <table v-if="player?.status">
                <tr>
                    <td>音频编码</td>
                    <td>{{ player.status.audiocodec }}</td>
                </tr>
                <tr>
                    <td>视频编码</td>
                    <td>{{ player.status.videocodec }}</td>
                </tr>
                <tr>
                    <td>视频大小</td>
                    <td>{{ player.status.width }} x {{ player.status.height }}</td>
                </tr>
                <tr>
                    <td>音频比特率</td>
                    <td>{{ player.status.audioBitrate }}</td>
                </tr>
                <tr>
                    <td>音频声道</td>
                    <td>{{ player.status.channels }}</td>
                </tr>
                <tr>
                    <td>音频采样率</td>
                    <td>{{ player.status.sampleRate }}</td>
                </tr>
                <tr>
                    <td>音频帧率</td>
                    <td>{{ player.status.audioDecodeFramerate }}</td>
                </tr>
                <tr>
                    <td>视频丢包率</td>
                    <td v-if="player.status.videoPacketCount > DEFS[0]">
                        {{ player.status.videoDropPacketCount / player.status.videoPacketCount * DEFS[100] }}%
                    </td>
                    <td v-else> 0 </td>
                </tr>
                <tr>
                    <td>视频错误率</td>
                    <td v-if="player.status.videoPacketCount > 0">
                        {{ player.status.videoDecodeErrorPacketCount / Number(player.status.videoPacketCount) }}
                    </td>
                    <td v-else> 0 </td>
                </tr>
                <tr>
                    <td>视频比特率</td>
                    <td>{{ player.status.videoBitrate }}</td>
                </tr>
                <tr>
                    <td>视频帧率</td>
                    <td>{{ player.status.videoRenderFramerate }}</td>
                </tr>
                <tr>
                    <td>传输速率</td>
                    <td>{{ player.status.bandwidth /1000 }} Kbps</td>
                </tr>
            </table>
        </div>

        <div class="frame track" v-show="ui.track">
            <ul class="left" v-if="player?.tracks.audio">
                <h1>音频轨道({{ player.tracks.audio.length }})</h1>
                <li v-for="item in player.tracks.audio"
                    :active="item.index == player.tracks.audioTrack"
                >{{ item.metadata.language }}</li>
            </ul>
            <ul class="right" v-if="player?.tracks.video">
                <h1>视频轨道({{ player.tracks.video.length }})</h1>
                <li v-for="item in player.tracks.video"
                    :active="item.index == player.tracks.videoTrack"
                >{{ item.metadata.language }}</li>
            </ul>
        </div>

        <div class="frame videos" v-show="ui.playlist">
            <h1>播放列表</h1>
            <div>
                <div :active="ui.videoID == i" v-for="(item,i) in ui.videos">
                    {{ item.name }}
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .av-container{
        height: 100%;
        background-color: black;
        position: relative;
        user-select: none;

        > .video{
            height: 100%;
            width: 100%;
            position: relative;

            > canvas{
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
            }
        }

        > .bar{
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            padding: .35rem;

            width: 90%;
            border-radius: .35rem .35rem 0 0 ;

            background-color: rgba(255, 255, 255, 0.9);

            > *{
                display: flex;
                gap: .35rem;
                align-items: center;
            }

            > .time{
                font-size: .8rem;
                display: flex;

                > .total{
                    color: #615a5a;
                }

                > .timebar{
                    border-radius: 0.25rem;
                    background-color: #bcb3b3;
                    opacity: .6;transition: opacity .2s;
                    position: relative;
                    height: .2rem;
                    transition: all .2s;
                    flex-grow: 1;
                    min-width: 50%;

                    &:hover{
                        height: .5rem;

                        > div{
                            min-width: .5rem;
                        }

                        > div.prog::after{
                            content: '';
                        }
                    }

                    > div{
                        border-radius: 0.2rem;
                        min-width: .2rem;
                        height: 100%;
                        transition: all .2s;
                        background-color: rgba(19, 108, 180, 0.5);
                        position: relative;

                        &::after{
                            float: right;
                            position: absolute;
                            top: -.3rem;
                            right: -.5rem;
                            height: 1rem;
                            width: 1rem;
                            border-radius: 1rem;
                            background-color: white;
                            border: solid .05rem gray;
                        }
                    }
                }
            }

            > .icons{
                justify-content: center;

                > div{
                    padding: .2rem;
                    border-radius: .25rem;
                    transition: all .2s;

                    > svg{
                        display: block;
                        width: 1.2rem;
                        height: 1.2rem;
                        fill: currentColor;
                        opacity: .7;
                    }

                    &[small] svg{
                        width: 1rem;
                        height: 1rem;
                        opacity: .4;
                    }

                    &[large] svg{
                        width: 1.5rem;
                        height: 1.5rem;
                    }

                    &:hover{
                        background-color: rgb(175 175 175 / 30%);
                        
                        svg{
                            opacity: 1;
                        }
                    }
                }
            }
        }

        > .frame {
            position: absolute;
            z-index: 5;
            top: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(128, 120, 120, 0.8);
            padding: 1rem;
            border-radius: .5rem;
            color: white;
            max-width: 90%;
            box-sizing: border-box;

            h1{
                margin: 0;
                padding: 0;
                font-size: 1.5rem;
                font-weight: 200;
                color: #9ed1fe;
                padding-left: .5rem;
            }

            > .select{
                padding: 0;
                display: flex;
                border-radius: .25rem;
                overflow: hidden;
                border: solid .1rem #ffffffb8;

                > *{
                    padding: .3rem;
                    flex-grow: 1;
                    text-align: center;
                    color: white;
                    transition: all .2s;
                    min-width: 3rem;
                    list-style: none;
                    user-select: none;

                    &[active=true]{
                        background-color: #ffffffb8;
                        color: rgb(66, 62, 62);
                    }
                }
            }
        }

        > .about{

            > table{
                width: 18rem;
                max-width: 90vw;
                font-size: .85rem;
            
                td:nth-child(even){
                    font-weight: 300;
                }
            }
        }

        @mixin hover() {
            padding-left: .5rem;
            background-color: #ffffff30;

            &::before {
                content: '';
                height: 100%;
                width: .2rem;
                position: absolute;
                top: 0;
                left: 0;
                border-radius: .1rem;
                background-color: rgb(99, 226, 226)
            }
        }

        > .track{
            display: flex;
            width: 20rem;
            max-width: 90vw;
            gap: 1rem;

            h1{
                font-size: 1.25rem;
                line-height: 2rem;
            }

            > ul{
                margin: 0;
                padding: 0;
                flex-grow: 1;

                > li{
                    list-style: none;
                    font-size: .85rem;
                    padding: .25rem .5rem;
                    position: relative;

                    &[active=true]{
                        @include hover();
                    }
                }
            }
        }

        > .videos{
            overflow-y: auto;
            font-size: .8rem;
            overflow: hidden;

            > div{
                overflow-y: auto;
                overflow-x: hidden;
                max-height: 60vh;

                > div{
                    white-space: nowrap;
                    // overflow: hidden;
                    text-overflow: ellipsis;
                    word-break: break-all;
                    padding: .25rem;
                    border-radius: .2rem;
                    position: relative;

                    &[active=true]{
                        @include hover();
                    }

                    &:hover{
                        background-color: #cecece63;
                    }
                }
            }
        }
    }
</style>