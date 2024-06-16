<script setup lang="ts">
    import type { vFile } from '@/data';
    import { regSelf } from '@/opener';
    import { FS, Global, splitPath } from '@/utils';
    import { Lrc, Runner, type Lyric } from 'lrc-kit';
    import { onUnmounted, ref, shallowReactive, watch } from 'vue';

    interface Music {
        name: string,
        path: string,
        composer?: string,
        url: string,
        lrc?: string,
        cover?: string,
        album?: string
    }

    const props = defineProps(['option']),
        data = props['option'] as vFile,
        config = shallowReactive({
            playlist: [] as Array<Music>,
            current: -1,
            timenow: '0:00',
            timeproc: 0,
            total: '-:-',
            playing: false,
            loop: 'all' as 'all' | 'one' | 'random',
            volume: 1,
            lrc: [] as Array<Lyric>,
            lrc_now: 0
        }), current = ref({
            "name": "未在播放",
            "url": ''
        } as Music), ui = shallowReactive({
            volume: false
        }), audio = new Audio(data.url),
        lrc_elem = ref<Array<HTMLElement>>([]);

    const CONFIG = {
        seek_time: 10,
        cover: [
            "avif",
            "webp",
            "jpg", "jpeg", "jxl",
            "png",
            "ico",
            "bmp"
        ],
        audio: [
            "mp3",
            "wav",
            "flac",
            "opus",
            "mka",
            "m4a",
            "ogg"
        ]
    }

    // 声音大小
    watch(
        () => config.volume, 
        n => audio && (audio.volume = n),
        { immediate: true }
    );

    // 曲目
    watch(() => config.current,function(n){
        if(config.playlist.length == 0) return;
        // 最后一个了
        else if(n >= config.playlist.length) return config.current = 1;
        // 第一个了
        else if(n < 0) return config.current = config.playlist.length -1;
        // 刷新播放状态
        audio.pause();
        config.playing = false;
        config.total = '-:-';
        config.timenow = '0:00';
        config.timeproc = 0;
        current.value = config.playlist[config.current];
        // 音频设置
        audio.src = current.value.url;
    },{ immediate: true });

    // 字幕解析
    let runner:Runner|undefined;
    watch(
        () => config.playlist[config.current]?.lrc,
        async function(val){
            if(!val){
                config.lrc = [];
                config.lrc_now = 0;
                runner = undefined;
                return;
            }
            config.lrc = [{
                "content": "加载中",
                "timestamp": 0
            }];
            config.lrc_now = 0;

            try{
                const fe = await fetch(val);
                if(!fe.ok) throw 'e';
                var res = Lrc.parse(await fe.text());
            }catch{
                return Global('ui.message').call({
                    "type": "error",
                    "title": "vLite",
                    "content":{
                        "title": "获取歌词失败",
                        "content": "解析失败或网络错误"
                    }
                })
            }
            
            // 解析元数据
            if(res.info.ar) current.value.composer = res.info.ar;
            if(res.info.al) current.value.album = res.info.al;
            if(res.info.ti) current.value.name = res.info.ti;
        
            // 开始滚动歌词
            config.lrc = res.lyrics;
            runner = new Runner(res);
        }
    );

    // DOM监听
    audio.onpause = () => config.playing = false;
    audio.onplay = () => config.playing = true;
    function time2str(time:number){
        var min = Math.floor(time/60),
            sec = time%60;
        return (min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec.toFixed() : sec.toFixed());
    }
    audio.ontimeupdate = function(){
        if(runner){
            runner.timeUpdate(audio.currentTime);
            const now =  runner.curIndex();
            if(config.lrc_now != now){
                config.lrc_now = now;
                const self = lrc_elem.value[config.lrc_now],
                    parent = self.parentElement as HTMLElement;
                parent.scrollTop = self.offsetTop - parent.clientHeight /2 + self.clientHeight /2;
            }
        }
        config.timenow = time2str(audio.currentTime);
        config.timeproc = audio.currentTime / audio.duration;
    }
    audio.onvolumechange = () => config.volume = audio.volume;
    audio.onerror = () => Global('ui.message').call({
        "type": "error",
        "title": "vLite",
        "content":{
            "title": "音频播放失败",
            "content": "网络错误或格式不受支持"
        }
    });
    audio.onended = function(){
        if(config.loop == 'all') config.current ++;
        else if(config.loop == 'one') audio.play();
        else config.current = Math.floor(Math.random() * (config.playlist.length -1));
    };
    audio.ondurationchange = () => config.total = time2str(audio.duration);
    audio.oncanplay = () => audio.play();

    function keyev(kbd:KeyboardEvent){
        kbd.preventDefault();kbd.stopPropagation();
        switch(kbd.key){
            case 'ArrowRight':
                audio.currentTime += CONFIG.seek_time;
            break;

            case 'ArrowLeft':
                audio.currentTime -= CONFIG.seek_time;
            break;

            case 'ArrowUp':
                config.volume = config.volume < .1 ? 0 : config.volume - .1;
            break;

            case 'ArrowDown':
                config.volume = config.volume > .9 ? 1 : config.volume + .1;
            break;

            case ' ':
            case 'Enter':
                audio.paused ? audio.play() : audio.pause();
            break;
        }
    }

    let cur_dir = '';
    async function play(file: vFile) {
        const dir = splitPath(file)['dir'];
        let id: number | undefined;
        if (cur_dir == dir) {
            // 找到ID
            for (let i = 0; i < config.playlist.length; i++)
                if (config.playlist[i].path == file.path) {
                    id = i;
                    break;
                }
        } else {
            // 更新列表
            const list = await FS.list(dir || '/'),
                lrcs = {} as Record<string,string>,
                covers = {} as Record<string,string>,
                default_cover = [] as Array<string>;
            config.playlist = [];
            let i = 0;
            list.forEach(item => item.type == 'dir' ? null : (() => {
                const info = splitPath(item);
                // 是音频
                if (CONFIG.audio.includes(info.ext.toLowerCase())) {
                    if (item.name == file.name)
                        id = i;
                    // 转换
                    config.playlist.push({
                        "name": info.name,
                        "url": item.url,
                        "path": item.path
                    });
                    i++;
                // 是字幕
                } else if (info.ext.toLowerCase() == 'lrc') {
                    lrcs[info.name] = item.url;
                // 是封面
                } else if (CONFIG.cover.includes(info.ext.toLowerCase())) {
                    if(info.name.toLowerCase() == 'cover')
                        default_cover.push(item.url);
                    else
                        covers[info.name] = item.url;
                }
            })());

            // 字幕&封面配对
            for (let i = 0; i < config.playlist.length; i++){
                if (config.playlist[i].name in lrcs)
                    config.playlist[i].lrc = lrcs[config.playlist[i].name];
                if (config.playlist[i].name in covers)
                    config.playlist[i].cover = covers[config.playlist[i].name];
                else if(default_cover.length > 0)
                    config.playlist[i].cover = default_cover[0];
            }

            // 更新
            cur_dir = dir;
        }

        if (id !== undefined) config.current = id;
        else Global('ui.message').call({
            "type": "error",
            "title": "ArtPlayer",
            "content": {
                "title": "找不到文件",
                "content": "文件可能被移动、删除等，请尝试刷新网页"
            }
        });
    }

    const cancel = regSelf('vLite',play);
    onUnmounted(() => {audio.pause() ;cancel()});

    play(data);
</script>

<template>
    <div class="vlite-container" @keydown.prevent="keyev" tabindex="-1">
        <div class="left" :single="!config.lrc.length">
            <div class="cover" :style="{ backgroundImage: current.cover ? `url('${current.cover}')` : undefined }"></div>
            <h3>{{ current.name }}</h3>
            <span>{{ current.composer || '未知' }}</span>
            <div class="time">
                <span>{{ config.timenow }}</span>
                <div class="timebar" @click="
                    audio.currentTime = $event.offsetX / ($event.currentTarget as HTMLElement).clientWidth * audio.duration
                ">
                    <div class="proc" :style="{ width: config.timeproc * 100 + '%' }"></div>
                </div>
                <span>{{ config.total }}</span>
            </div>
            <div class="btns">
                <!--音量-->
                <div @click="ui.volume = !ui.volume" btn-after :active="ui.volume" size="small">
                    <svg viewBox="0 0 16 16"  fill="currentColor" >
                        <path
                            d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12V4zm3.025 4a4.486 4.486 0 0 1-1.318 3.182L10 10.475A3.489 3.489 0 0 0 11.025 8 3.49 3.49 0 0 0 10 5.525l.707-.707A4.486 4.486 0 0 1 12.025 8z" />
                    </svg>
                    <div class="after volume" @click.stop.prevent="audio.volume = $event.offsetX / ($event.currentTarget as HTMLElement).clientWidth">
                        <div :style="{ width: config.volume * 100 + '%' }"></div>
                    </div>
                </div>
                <!--上一个-->
                <div @click.stop="config.current--">
                    <svg viewBox="0 0 16 16"  fill="currentColor" >
                        <path
                            d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" />
                    </svg>
                </div>
                <!--播放/暂停-->
                <div size="large" @click.stop="audio.paused ? audio.play() : audio.pause()">
                    <svg viewBox="0 0 16 16" fill="currentColor" v-show="!config.playing">
                        <path
                            d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                    </svg>
                    <svg viewBox="0 0 16 16" fill="currentColor" v-show="config.playing">
                        <path
                            d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                    </svg>

                </div>
                <!--下一个-->
                <div @click.stop="config.current++">
                    <svg viewBox="0 0 16 16" fill="currentColor">
                        <path
                            d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0V4z" />
                    </svg>
                </div>
                <!-- 循环模式 -->
                <div size="small">
                    <svg viewBox="0 0 100 100" v-show="config.loop == 'random'">
                        <line stroke-width="5" y2="22" x2="88" y1="21" x1="10" stroke="currentColor" />
                        <path d="m12,72l27,-0.1l24,-28l23,-0.25" stroke-width="5" stroke="currentColor" />
                        <line y2="43" x2="48" y1="42" x1="11" stroke-width="5" stroke="currentColor" />
                        <line y2="72" x2="86" y1="72" x1="54" stroke-width="5" stroke="currentColor" />
                        <line y2="52" x2="66" y1="52" x1="65" stroke-width="5" stroke="currentColor" />
                    </svg>
                    <svg viewBox="0 0 16 16" fill="currentColor" v-show="config.loop == 'all'">
                        <path fill-rule="evenodd"
                            d="M4.5 11.5A.5.5 0 0 1 5 11h10a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm-2-4A.5.5 0 0 1 3 7h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm-2-4A.5.5 0 0 1 1 3h10a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5z" />
                    </svg>
                    <svg viewBox="0 0 16 16" fill="currentColor" v-show="config.loop == 'one'">
                        <path
                            d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8Zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0ZM9.283 4.002V12H7.971V5.338h-.065L6.072 6.656V5.385l1.899-1.383h1.312Z" />
                    </svg>
                </div>
            </div>
        </div>
        <div class="right" v-if="config.lrc.length">
            <div ref="lrc_elem" v-for="(lrc,i) in config.lrc" :active="i == config.lrc_now"
                @click="audio.currentTime = lrc.timestamp"
            >
                {{ lrc.content }}
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .vlite-container{
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #58706d;
        height: 100%;
        gap: 1rem;

        > .left{
            display: flex;
            flex-direction: column;
            
            &[single=false]{
                min-width: 25%;
                width: 45vh;
                max-width: 45%;
                max-height: 70%;
            }

            &[single=true]{
                max-width: 60%;
                max-height: 90%;
                width: 50vh;
            }

            > .cover{
                flex-grow: 1;
                padding-top: 100%;
                background-position: center;
                background-size: cover;
                background-repeat: no-repeat;
                background-color: #ffffffad;
                border-radius: .3rem;
            }

            > .btns{
                display: flex;
                justify-content: center;
                align-items: center;
                color: rgba(255, 255, 255, 0.6);

                > div{
                    padding: .2rem;
                    margin: 0 .25rem;
                    border-radius: .3rem;
                    transition: all .2s;
                    position: relative;

                    > svg{
                        width: 1.6rem;
                        height: 1.6rem;
                        display: block;
                    }

                    &:hover{
                        background-color: rgba(193, 186, 186, 0.2);
                    }

                    &:not([btn-after]):active{
                        transform: scale(.9);
                    }

                    &[size=small]{
                        padding: .15rem;
                        border-radius: .2rem;
                        height: 1.2rem;
                        width: 1.2rem;
                        transition: all .2s;
                        overflow: hidden;

                        > svg{
                            width: 1.2rem;
                            height: 1.2rem;
                            opacity: .4;
                        }

                        &:hover svg{
                            opacity: .8;
                        }

                        &[active=true]{
                            overflow: visible;

                            > svg{
                                opacity: 1;
                            }
                        }
                    }

                    &[size=large]{
                        padding: .25rem;
                        margin: 0 .25rem;
                        border-radius: .4rem;
                        
                        > svg{
                            width: 2rem;
                            height: 2rem;
                        }
                    }

                    > .after{
                        width: 7.5rem;
                        height: .8rem;
                        padding: .3rem .5rem;
                        position: absolute;
                        left: 2rem;
                        top: 0;
                        background-color: #6c7171;
                        z-index: 1;
                    }

                    > .volume{
                        border-radius: 2rem;
                        background-color: rgba(92, 233, 184, 0.4);
                        height: .75rem;
                        top: 50%;
                        transform: translate(-.5rem, -50%);
                        padding: 0;

                        > div{
                            border-radius: 2rem;
                            height: 100%;
                            background-color: #5ce9b8;
                        }
                    }
                }
            }

            > h3{
                margin: .5rem 0 0 0;
                font-size: 1.25rem;
                color: rgb(241, 241, 241);
                padding-left: .5rem;
            }

            > span{
                color: rgb(229, 227, 227);
                font-size: .9rem;
                margin: 0 0 .5rem 0;
                padding-left: .5rem;
            }

            > h3, > span{
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            > .time{
                display: flex;
                align-items: center;
                font-size: .85rem;
                color: white;

                > *{
                    flex-shrink: 0;
                }
                
                > .timebar{
                    flex-grow: 1;
                    margin: 0 .25rem;
                    background-color: rgba(240, 255, 255, 0.6);
                    height: .2rem;
                    border-radius: .1rem;

                    &:hover > div::after{
                        content: '';
                    }

                    > div{
                        background-color: white;
                        height: .2rem;
                        border-radius: .1rem;
                        position: relative;

                        &::after{
                            float: right;
                            position: absolute;
                            top: -.2rem;
                            right: -.3rem;
                            height: .6rem;
                            width: .6rem;
                            border-radius: .3rem;
                            background-color: white;
                        }
                    }
                }
            }
        }

        > .right{
            overflow: hidden scroll;
            height: 100%;
            width: 50%;
            margin: 50% 0 50% 0;
            scroll-behavior: smooth;

            &::-webkit-scrollbar{
                display: none;
            }

            > div{
                box-sizing: border-box;
                width: 100%;
                padding: .35rem;
                font-size: 1.2rem;
                border-radius: .3rem;
                scroll-behavior: smooth;
                overflow: hidden auto;

                color: rgba(255, 255, 255, 0.6);
                transition: all .2s;

                display: flex;
                flex-direction: column;
                justify-items: center;

                &[active=true]{
                    color: white;
                }

                &:hover{
                    background-color: rgba(237, 234, 234, 0.2);
                }
            }
        }
    }
</style>