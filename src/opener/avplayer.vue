<script lang="ts" setup>
    import { onMounted, onUnmounted, reactive, ref, watch, type Directive } from 'vue';
    import createAV, { AVState, type Export } from './avplayer/avplayer';
    import type { MessageOpinion, vFile } from '@/env';
    import { contextMenu, reqFullscreen, UI } from '@/App.vue';
    import { acceptDrag, FS, message, splitPath } from '@/utils';
    import MediaSession, { updateMediaSession } from '@/opener/media/mediaSession';

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
        ],
        subtitle: [
            "ass",
            "ssa",
            "srt",
            "vtt",
            "ttml"
        ]
    },vSpeed = {
        mounted(el, bind){
            watch(() => player.value?.playBackRate, val => 
                el.setAttribute('active', val == bind.value ? 'true' : 'false')
            );
            el.onclick = () => player.value && (player.value.playBackRate = bind.value);
        }
    } satisfies Directive<HTMLElement, number>;

    let timer: number | NodeJS.Timeout | undefined;
    function active(){
        ui.tool = true;
        if(timer) clearTimeout(timer);
        timer = setTimeout(() => ui.tool = false, 3000);
    }

    const videoel = ref<HTMLDivElement>(),
        _prop = defineProps(['option', 'visibility']),
        file = _prop.option as vFile,
        ui = reactive({
            about: false,
            track: false,
            playlist: false,
            videos: [] as Array<vFile & { name: string, sub: Record<string, string> }>,
            videoID: 0,
            tool: false,
            alert: ''
        }),
        root = ref<HTMLElement>();
    
    active();

    function time2str(time: bigint){
        if(!time) return '00:00';
        time /= 1000n;
        const min = time / 60n, sec = time % 60n;
        return min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
    }

    const exitFullScreen = () => document.exitFullscreen();

    const player = ref<Export>();
    onMounted(() => 
        createAV(videoel.value as HTMLDivElement).then(val => {
            player.value = val;
            CTRL.play(file);
        })
    );
    onUnmounted(() => player.value?.destroy());

    watch(() => _prop.visibility, val => val && player.value && (
        MediaSession.value = {
            next: () => CTRL.next(),
            prev: () => CTRL.prev(),
            play: () => player.value && (player.value.play = true),
            pause: () => player.value && (player.value.play = false),
            set time(val: number){ player.value?.func.seek(BigInt(val) * 1000n); },
            get time(){ return Number((player.value?.time.current || 0n) / 1000n); },
            seekOnce: CONFIG.seek_time
        },
        updateMediaSession({
            "title": ui.videos[ui.videoID].name,
            "artist": "vPlayer",
            "album": "vPlayer",
            "artwork": []
        })
    ), { immediate: true });

    const CTRL = {
        dir: '?',
        temp_url: null as null|string,
        async play(file: vFile) {
            const dir = splitPath(file)['dir'];
            let id: number | undefined;
            if (this.dir == dir) {
                // 找到ID
                for (let i = 0; i < ui.videos.length; i++)
                    if (ui.videos[i].path == file.path) {
                        id = i;
                        break;
                    }
            } else {
                // 更新列表
                const list = (await FS.list(dir || '/')).filter(item => item.type == 'file') as vFile[];
                ui.videos = [];
                let i = 0;
                const subMap = {} as Record<string, Record<string, string>>;
                list.forEach(item => {
                    const info = splitPath(item);
                    // 是视频
                    if (CONFIG.media.includes(info.ext.toLowerCase())) {
                        if (item.name == file.name)
                            id = i;
                        i ++;
                        // 转换
                        ui.videos.push({...item, name: info.name, sub: {}});
                    // 字幕
                    }else if(CONFIG.subtitle.includes(info.ext.toLowerCase())){
                        const sub = subMap[info.name] || (subMap[info.name] = {});
                        sub[info.ext.toLowerCase()] = item.url;
                    }
                });
                // 匹配字幕
                ui.videos.forEach(item => 
                    item.name in subMap && (item.sub = subMap[item.name])
                );
                // 更新
                this.dir = dir;
            }

            if (id !== undefined){
                ui.videoID = id;
            }else message({
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
        }
    };

    function ctxmenu(e: MouseEvent){
        contextMenu({
            'pos_x': e.clientX,
            'pos_y': e.clientY,
            'content': [
                {
                    "text": "播放速度",
                    handle: () => ui.playlist = true
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
                    handle: () => player.value?.func.seek(player.value.time.current +1n)
                },'---',{
                    "text": "统计信息",
                    handle: () => ui.about = true
                }
            ]
        });
    }

    function basicKbdHandle(e: KeyboardEvent){
        if(!player.value || player.value.time.total == 0n) return;
        switch(e.key){
            case 'ArrowRight':
                player.value.func.seek(player.value.time.current + 10000n);
            break;

            case 'ArrowLeft':
                player.value.func.seek(player.value.time.current - 10000n);
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

            default:
                return;
        }
        e.preventDefault();
    }

    function float(num: bigint, n: number){
        const numstr = num.toString(),
            n1 = numstr.substring(0, numstr.length - n),
            n2 = numstr.substring(numstr.length - n);
        return n1 + '.' + n2;
    }

    function prog(prog: CustomEvent<AVState>){
        switch(prog.detail){
            case AVState.ANALYZE_FILE:
                ui.alert = '分析文件中...';
            break;

            case AVState.LOAD_AUDIO_DECODER:
                ui.alert = '加载音频解码器...';
            break;

            case AVState.LOAD_VIDEO_DECODER:
                ui.alert = '加载视频解码器...';
            break;

            case AVState.OPEN_FILE:
                ui.alert = '打开文件中...';
            break;
        }
    }

    watch(() => ui.videos[ui.videoID], function(vid){
        if(!vid || !player.value) return;
        player.value.url = vid.url;
        updateMediaSession({
            "title": vid.name,
            "artist": "vPlayer",
            "album": "vPlayer",
            "artwork": []
        });
        watch(() => player.value?.time.current, val => val && vid.sub && Object.entries(vid.sub).forEach(([ext, url]) => 
            player.value?.func.extSub({
                "title": ext,
                "source": url,
                "lang": "zh-CN"
            })
        ), { once: true });
    });

    watch(() => _prop.visibility, dis => dis && player.value && updateMediaSession({
        "title": ui.videos[ui.videoID]?.name || '未在播放',
        "artist": "vPlayer",
        "album": "vPlayer",
        "artwork": []
    }))

    watch(root, val => acceptDrag(val as HTMLElement, f => 
        f.type == 'file' && (function(){
            const info = splitPath(f);
            if(CONFIG.media.includes(info.ext.toLowerCase()))
                CTRL.play({...f, name: info.name});
            else if(CONFIG.subtitle.includes(info.ext.toLowerCase()))
                player.value?.func.extSub({
                    source: f.url,
                    lang: 'zh-CN',
                    title: info.name
                });
        })()
    ));
    watch(UI.app_width, w => player.value && (player.value.func.resize = [w, UI.height_total.value]));
</script>

<template>
    <div class="av-container" ref="root" v-touch tabindex="-1"
        @contextmenu.prevent="ctxmenu" @keydown.stop="basicKbdHandle"
        @dblclick.prevent="player && (player.play = !player.play)"
        @pointermove="active" @click="active"
    >
        <div class="video" ref="videoel"
            @ended="CTRL.next()" @progress="prog($event as any)" @load="ui.alert = ''"
        ></div>

        <div class="alert" :show="ui.alert">{{ ui.alert }}</div>

        <div class="bar" v-if="player" :style="{
            pointerEvents: player.time.total == 0n ? 'none' : 'all'
        }" :active="ui.tool">
            <div class="icons">
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
                    <svg viewBox="0 0 16 16" v-show="player.play">
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
            </div>

            <div class="time">
                <div class="current">{{ time2str(player.time.current) }}</div>
                <div class="timebar" @click="player.func.seek(BigInt(Math.floor($event.offsetX / ($event.currentTarget as HTMLElement).clientWidth * Number(player.time.total / 1000n))) * 1000n)">
                    <div class="prog" :style="{ width: float((player.time.current || 0n) * 10000n / (player.time.total || 1n), 2)+ '%' }"></div>
                    <div class="chapter" v-if="player.time.total">
                        <div v-for="(chap, i) in player.tracks.chapter" :style="{
                            left: float((chap.start || 0n) / player.time.total, 4) + '%'
                        }" :title="'Chapter' + i"></div>
                    </div>
                </div>
                <div class="total">{{ time2str(player.time.total) }}</div>
            </div>
            
            <div class="icons" style="flex-shrink: 1;overflow-x: auto;">

                <!-- 播放列表 -->
                <div small @click="ui.playlist = !ui.playlist">
                    <svg viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                </div>

                <!-- 轨道设置 -->
                <div small @click="ui.track = !ui.track">
                    <svg viewBox="0 0 16 16">
                        <path d="M14 4.577v6.846L8 15V1l6 3.577zM8.5.134a1 1 0 0 0-1 0l-6 3.577a1 1 0 0 0-.5.866v6.846a1 1 0 0 0 .5.866l6 3.577a1 1 0 0 0 1 0l6-3.577a1 1 0 0 0 .5-.866V4.577a1 1 0 0 0-.5-.866L8.5.134z"/>
                    </svg>
                </div>

                <!-- 信息 -->
                <div @click="ui.about = !ui.about" small>
                    <svg viewBox="0 0 16 16">
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                </div>

                <!-- 下一帧 -->
                <div small @click="player.func.nextFrame()">
                    <svg viewBox="0 0 16 16">
                        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
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

        <div class="frame-mask" v-show="ui.about || ui.track || ui.playlist"
            @click="ui.about = ui.track = ui.playlist = false"
        ></div>

        <div class="about frame" :display="ui.about">
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
                    <td v-if="player.status.videoPacketCount > 0n">
                        {{ player.status.videoDropPacketCount / player.status.videoPacketCount * 100n }}%
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

        <div class="offcv track" :display="ui.track">
            <ul v-if="player?.tracks.audio">
                <h1>音频轨道({{ player.tracks.audio.length }})</h1>
                <li v-for="item in player.tracks.audio"
                    :active="item.id == player.tracks.audioTrack"
                    @click="player.tracks.audioTrack = item.id"
                >({{ item.id }}) {{ item.metadata.languageString || item.metadata.language }}</li>
            </ul>
            <ul v-if="player?.tracks.video">
                <h1>视频轨道({{ player.tracks.video.length }})</h1>
                <li v-for="item in player.tracks.video"
                    :active="item.id == player.tracks.videoTrack"
                    @click="player.tracks.videoTrack = item.id"
                >({{ item.id }}) {{ item.metadata.languageString || item.metadata.language }}</li>
            </ul>
            <ul v-if="player?.tracks.subtitle">
                <h1>字幕轨道({{ player.tracks.subtitle.length }})</h1>
                <li v-for="item in player.tracks.subtitle"
                    :active="item.id == player.tracks.subTrack"
                    @click="player.tracks.subTrack = item.id"
                >({{ item.id }}) {{ item.metadata.languageString || item.metadata.language }}</li>
            </ul>
        </div>

        <div class="offcv videos" :display="ui.playlist">
            <h1>播放速度</h1>
            <ul class="select">
                <li v-speed=".5">0.5x</li>
                <li v-speed=".75">0.75x</li>
                <li v-speed="1">1x</li>
                <li v-speed="1.25">1.25x</li>
                <li v-speed="1.5">1.5x</li>
                <li v-speed="2">2x</li>
                <li v-speed="3">3x</li>
            </ul>
            <h1>播放列表</h1>
            <div>
                <div :active="ui.videoID == i" v-for="(item,i) in ui.videos" @click="ui.videoID = i">
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

            > *:not(video){
                pointer-events: none;
                position: absolute !important;
                top: 50% !important;left: 50% !important;
                transform: translate(-50%, -50%);
            }
        }

        > .bar{
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            padding: .2rem;
            display: flex;
            gap: .5rem;

            width: 90%;
            border-radius: .35rem .35rem 0 0 ;
            transition: all .2s;

            &[active=false]:not(:hover){
                transform: translateY(80%) translateX(-50%);
                opacity: 0;
            }

            > *{
                display: flex;
                gap: .35rem;
                align-items: center;

                padding: .25rem .35rem;
                border-radius: .25rem;
                background-color: rgba(100, 100, 100, 0.6);
                backdrop-filter: blur(.2rem);
                border: solid .1rem rgba(209, 209, 209, 0.5);
                color: white;
            }

            > .alert{
                position: absolute;
                background-color: rgba(254, 254, 254, 0.8);
                padding: .25rem .5rem;
                font-size: .8rem;
                border-radius: .2rem;
                color: white;
                max-width: 60%;

                transition: all .2s;
                transform: translate(-100%, -100%);
                bottom: 0;
                right: 0;
                opacity: 0;

                &[show=true]{
                    bottom: 3rem;
                    right: 1rem;
                    transform: none;
                    opacity: 1;
                }
            }

            > .time{
                font-size: .8rem;
                min-width: 12rem;
                display: flex;
                flex-grow: 1;
                gap: .75rem;
                padding: .25rem .5rem;
                font-family: 'Repair';

                > *{
                    min-width: 2rem;
                }

                // > .total{
                //     color: #615a5a;
                // }

                > .timebar{
                    border-radius: 0.25rem;
                    background-color: #bcb3b3;
                    opacity: .6;transition: opacity .2s;
                    position: relative;
                    height: .2rem;
                    transition: all .2s;
                    flex-grow: 1;
                    flex-shrink: 0;

                    &:hover{
                        height: .5rem;

                        > .prog{
                            min-width: .5rem;
                        }

                        > div.prog::after{
                            content: '';
                        }
                    }

                    > .prog{
                        border-radius: 0.2rem;
                        min-width: .2rem;
                        height: 100%;
                        transition: all .2s;
                        background-color: rgba(19, 108, 180, 0.5);
                        position: relative;
                        max-width: 100%;

                        &::after{
                            float: right;
                            position: absolute;
                            top: -.3rem;
                            right: -.5rem;
                            height: 1rem;
                            width: 1rem;
                            border-radius: 1rem;
                            background-color: rgba(255, 255, 255);
                            border: solid .05rem gray;
                        }
                    }

                    > .chapter{
                        position: absolute;
                        top: -.4rem;
                        bottom: 100%;
                        width: 100%;
                        overflow: hidden;

                        &::after{
                            content: '';
                            display: block;
                            right: 0;
                        }

                        > div, &::after{
                            position: absolute;
                            border: solid .05rem rgb(184, 184, 184);
                            border-bottom: none;border-top: none;
                            height: .25rem;
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

                    &[large]{
                        transform: scale(1.2);

                        > svg{
                            transform: scale(1.35);
                        }
                    }

                    > svg{
                        display: block;
                        // width: 1.2rem;
                        // height: 1.2rem;
                        fill: currentColor;
                        opacity: .7;
                    // }

                    // &[small] svg{
                        width: 1rem;
                        height: 1rem;
                        // opacity: .4;
                    }

                    // &[large] svg{
                    //     width: 1.5rem;
                    //     height: 1.5rem;
                    // }

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
            transition: all .2s;

            h1{
                margin: 0;
                padding: 0;
                font-size: 1.5rem;
                font-weight: 200;
                color: #9ed1fe;
                padding-left: .5rem;
            }

            &[display=false]{
                transform: rotateX( 90deg );
                top: -100%;
                opacity: 0;
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

        > .offcv{
            position: absolute;
            right: 0;
            top: 0;
            z-index: 5;
            background-color: rgb(255 255 255 / 60%);
            width: 80%;
            padding: 2rem;
            box-sizing: border-box;
            height: 100%;
            backdrop-filter: blur(.35rem);
            max-width: 20rem;
            transition: all .2s;

            &[display=false]{
                transform: translateX( 120% );
                opacity: 0;
            }
        }

        > .track{

            h1{
                font-size: 1.25rem;
                line-height: 2rem;
            }

            > ul{
                margin: 0;
                padding: 0;
                flex-grow: 1;
                min-width: 10rem;

                > li{
                    list-style: none;
                    font-size: .85rem;
                    padding: .25rem .5rem;
                    position: relative;

                    &:hover{
                        background-color: #ffffff30
                    }

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

            > .select{
                padding: 0;
                display: flex;
                flex-wrap: wrap;
                border-radius: .25rem;
                overflow: hidden;
                border: solid .1rem #756e6eb8;

                > *{
                    padding: .3rem;
                    flex-grow: 1;
                    text-align: center;
                    color: rgb(90, 87, 87);
                    transition: all .2s;
                    min-width: 3rem;
                    list-style: none;
                    user-select: none;

                    &[active=true]{
                        background-color: #c9c5c5b8;
                        color: rgb(66, 62, 62);
                    }
                }
            }

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

        > .frame-mask{
            position: absolute;
            inset: 0;
            backdrop-filter: blur(.2rem);
            background-color: rgb(255 255 255 / 60%);
            z-index: 2;
        }
    }
</style>