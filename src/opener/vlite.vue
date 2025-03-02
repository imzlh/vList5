<script setup lang="ts">
    import type { vFile } from '@/env';
    import { regSelf } from '@/opener';
    import parseCue from './media/cue';
    import { acceptDrag, encodePath, FILE_PROXY_SERVER, FS, message, splitPath } from '@/utils';
    import { Lrc, Runner, type Lyric } from 'lrc-kit';
    import MediaSession, { updateMediaSession } from './media/mediaSession';
    import { computed, nextTick, onMounted, onUnmounted, ref, shallowReactive, watch } from 'vue';

    interface Music {
        name: string,
        match_name: string,
        path: string,
        composer?: string,
        url: string,
        lrc?: string,
        cover?: string,
        album?: string,
        start?: number
    }

    const props = defineProps(['option', 'visibility']),
        data = props['option'] as vFile,
        root = ref<HTMLElement>(),
        CFG = shallowReactive({
            playlist: [] as Array<Music>,
            currentID: -1,
            currentTime: '0:00',
            progress: 0,
            totalTime: '-:-',
            playing: false,
            loop: 'all' as 'all' | 'one' | 'random',
            volume: 1,
            lrc: [] as Array<Lyric>,
            lrc_now: 0,
            cue_until: 0,

            show_playlist: false
        }), current = computed(() => CFG.playlist[CFG.currentID]),
        audio = new Audio(data.url),
        lrc_elem = ref<Array<HTMLElement>>([]),
        ev = defineEmits(['show']),
        getIcon = computed(() => ({
            "all": "point-right",
            "one": "loop",
            "random": "random"
        })[CFG.loop]);

    audio.preload = 'none';

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

    // 抢夺mediaSession
    watch(
        () => props.visibility,
        val => val && (MediaSession.value = {
            seekOnce: CONFIG.seek_time,
            prev: () => CFG.currentID == 0 ? CFG.currentID = CFG.playlist.length -1 : CFG.currentID --,
            next: () => CFG.currentID == CFG.playlist.length -1 ? CFG.currentID = 0 : CFG.currentID ++,
            play: () => audio.play(),
            pause: () => audio.pause(),
            set time(time: number){ audio.currentTime = time },
            get time(){ return audio.currentTime }
        }, current.value && updateMediaSession({
            "title": current.value.name,
            "artist": current.value.composer,
            "album": current.value.album,
            "artwork": [
                {
                    src: current.value.cover || ''
                }
            ]
        })),
        { immediate: true }
    );

    // 挂载后
    onMounted(() => root.value && acceptDrag(root.value, async function(file){
        if(file.type == 'dir') return;
        const info = splitPath(file);
        // 加载歌词
        if(info.ext.toLowerCase() == 'lrc'){
            const fe = await fetch(file.url);
            if(!fe.ok) return message({
                "type": "error",
                "title": "vLite",
                "content":{
                    "title": "歌词加载失败",
                    "content": "网络错误或格式不受支持"
                },
                "timeout": 5
            });
            runner = new Runner(Lrc.parse(await fe.text()));
            CFG.lrc = runner.lrc.lyrics;
        // 加载封面
        }else if(CONFIG.cover.includes(info.ext.toLowerCase())){
            CFG.playlist[CFG.currentID].cover = file.url;
        // 播放音频
        }else play(file);

    }));

    // 声音大小
    watch(
        () => CFG.volume,
        n => audio && (audio.volume = n),
        { immediate: true }
    );

    // 监听ID变化
    watch(() => CFG.currentID, (n, on) => {
        if(CFG.playlist.length == 0) return;
        // 最后一个了
        else if(n >= CFG.playlist.length) return CFG.currentID = 0;
        // 第一个了
        else if(n < 0) return CFG.currentID = CFG.playlist.length -1;
        // 还是那个
        if(on == n) {
            if(CFG.playlist[n].start) audio.currentTime = CFG.playlist[n].start as number;
            return audio.play();
        }
    },{
        immediate: true
    });

    // 监听曲目变化
    watch(current, (item, old) => {
        if(!item) return;
        
        // 刷新播放状态
        CFG.playing = false;
        CFG.totalTime = '-:-';
        CFG.currentTime = '0:00';
        CFG.progress = 0;

        // 音频设置
        if(!old || old.url != item.url){
            audio.src = item.url;
            audio.load();
        }

        // 清空歌词
        if(!CFG.playlist[CFG.currentID].lrc && runner)
            runner = undefined, CFG.lrc = [];

        // cue设置
        if(item.start != undefined){
            const cur = CFG.currentID;
            // 接下来的还是cue
            if(CFG.playlist[cur +1] && CFG.playlist[cur +1].start && CFG.playlist[cur +1].url == item.url){
                CFG.cue_until = CFG.playlist[cur +1].start as number;
                CFG.totalTime = time2str(CFG.playlist[cur +1].start as number - item.start);
            // 直到结束
            }else{
                CFG.cue_until = -1;
                // 长度直接可用
                if(old && item.url == old.url)
                    CFG.totalTime = time2str(audio.duration - (item.start as number));
                // 等待加载完毕可以得到
                else audio.addEventListener('durationchange',() =>
                    CFG.totalTime = time2str(audio.duration - (item.start as number))
                ,{ once: true });
            }
            // seek到起点
            if(audio.duration > 0)
                audio.currentTime = item.start as number;
            else audio.addEventListener('loadedmetadata',() =>
                    audio.currentTime = item.start as number
                ,{ once: true });
        // 常规media
        }else{
            CFG.cue_until = -1;
            audio.pause();
            audio.addEventListener('durationchange',() =>
                CFG.totalTime = time2str(audio.duration)
            ,{ once: true });
        }

        // 抢夺mediaSession
        updateMediaSession({
            "title": item.name,
            "artist": item.composer,
            "album": item.album,
            "artwork": [
                {
                    src: item.cover || current.value.cover || ''
                }
            ]
        });
    });

    // 字幕解析
    let runner:Runner|undefined;
    watch(
        () => CFG.playlist[CFG.currentID]?.lrc,
        async function(val){
            if(!val){
                CFG.lrc = [];
                CFG.lrc_now = 0;
                runner = undefined;
                return;
            }
            CFG.lrc = [{
                "content": "加载中",
                "timestamp": 0
            }];
            CFG.lrc_now = 0;

            try{
                const fe = await fetch(val);
                if(!fe.ok) throw 'e';
                var res = Lrc.parse(await fe.text());
            }catch{
                return message({
                    "type": "error",
                    "title": "vLite",
                    "content":{
                        "title": "获取歌词失败",
                        "content": "解析失败或网络错误"
                    },
                    "timeout": 5
                })
            }

            // 解析元数据
            if(res.info.ar) current.value.composer = res.info.ar;
            if(res.info.al) current.value.album = res.info.al;
            if(res.info.ti) current.value.name = res.info.ti;

            // 开始滚动歌词
            res.lyrics.sort((a,b) => a.timestamp - b.timestamp);
            CFG.lrc = res.lyrics;
            runner = new Runner(res);
        }
    );

    // DOM监听
    audio.onpause = () => CFG.playing = false;
    audio.onplay = () => CFG.playing = true;
    function time2str(time:number){
        const min = Math.floor(time / 60),
            sec = Math.floor(time % 60);
        return min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
    }
    audio.ontimeupdate = async function(ev){
        // cue
        if(CFG.cue_until > 0 && audio.currentTime >= CFG.cue_until)
            return audio.onended && audio.onended(ev);

        // 更新歌词
        if(runner){
            runner.timeUpdate(
                current.value.start == undefined
                    ? audio.currentTime
                    : audio.currentTime - current.value.start
            );
            const now =  runner.curIndex();
            if(CFG.lrc_now != now){
                CFG.lrc_now = now;
                const self = lrc_elem.value[CFG.lrc_now];
                if(!self) await new Promise(rs => nextTick(() => rs(null)));
                const parent = self.parentElement as HTMLElement;
                parent.scrollTop = self.offsetTop - parent.clientHeight /2 + self.clientHeight /2;
            }
        }
        // 更新时间
        CFG.currentTime = time2str(
            current.value?.start == undefined
                ? audio.currentTime
                : audio.currentTime - current.value.start
        );
        // 更新状态
        CFG.progress = current.value.start == undefined
            ? audio.currentTime / audio.duration
            : (audio.currentTime - (current.value.start as number)) / (
                (CFG.cue_until == -1 ? audio.duration : CFG.cue_until)
                 - (current.value.start as number)
            );
        CFG.playing = true;
    }
    audio.onvolumechange = () => CFG.volume = audio.volume;
    audio.onerror = () => message({
        "type": "error",
        "title": "vLite",
        "content":{
            "title": "音频播放失败",
            "content": "网络错误或格式不受支持"
        },
        "timeout": 5
    });
    audio.onended = function(){
        CFG.playing = false;
        if(CFG.loop == 'all') CFG.currentID ++;
        else if(CFG.loop == 'one') audio.play();
        else while(true){
            let nxt = Math.floor(Math.random() * (CFG.playlist.length -1));
            if(CFG.currentID == nxt) continue;
            CFG.currentID = nxt;
            break;
        }
    };
    audio.oncanplay = () => audio.play();

    function keyev(kbd:KeyboardEvent){
        switch(kbd.key){
            case 'ArrowRight':
                audio.currentTime += CONFIG.seek_time;
            break;

            case 'ArrowLeft':
                audio.currentTime -= CONFIG.seek_time;
            break;

            case 'ArrowUp':
                CFG.volume = CFG.volume < .1 ? 0 : CFG.volume - .1;
            break;

            case 'ArrowDown':
                CFG.volume = CFG.volume > .9 ? 1 : CFG.volume + .1;
            break;

            case ' ':
            case 'Enter':
                audio.paused ? audio.play() : audio.pause();
            break;

            default:
                return
        }
        kbd.preventDefault();kbd.stopPropagation();
    }

    function switchMode(){
        CFG.loop = {
            'all': 'one',
            'one': 'random',
            'random': 'all'
        }[CFG.loop] as 'one'|'random'|'all';
    }

    // 根据进度条seek
    function seekTo(pct: number){
        audio.currentTime = current.value.start === undefined
            ? audio.duration * pct
            : ((current.value.start as number) 
                + (CFG.cue_until == -1 ? audio.duration : CFG.cue_until)
                - (current.value.start as number) 
              )* pct
    }

    let cur_dir = '';
    async function play(file: vFile) {
        // 暂停
        audio.pause();
        CFG.currentID = -1;
        const dir = splitPath(file)['dir'];
        let id: number | undefined;
        if (cur_dir == dir) {
            // 找到ID
            for (let i = 0; i < CFG.playlist.length; i++)
                if (CFG.playlist[i].path == file.path) {
                    id = i;
                    break;
                }
        } else {
            // 更新列表
            const list = (await FS.list(dir || '/')).filter(item => item.type == 'file'),
                lrcs = {} as Record<string,string>,
                covers = {} as Record<string,string>,
                default_cover = [] as Array<string>;
            CFG.playlist = [];
            let i = 0;
            for(const item of list){
                const finfo = splitPath(item);
                // 是音频
                if (CONFIG.audio.includes(finfo.ext.toLowerCase())) {
                    if (item.name == file.name)
                        id = i;
                    // 转换
                    CFG.playlist.push({
                        "name": finfo.name,
                        "url": item.url,
                        "path": item.path,
                        "match_name": finfo.name
                    });
                    i++;
                // 是字幕
                } else if (finfo.ext.toLowerCase() == 'lrc') {
                    lrcs[finfo.name] = item.url;
                // 是封面
                } else if (CONFIG.cover.includes(finfo.ext.toLowerCase())) {
                    if(finfo.name.toLowerCase() == 'cover')
                        default_cover.push(item.url);
                    else
                        covers[finfo.name] = item.url;
                // 是音轨
                } else if(finfo.ext.toLowerCase() == 'cue') try{
                    // 获取音轨数据
                    const xhr = await fetch(item.url);
                    if(!xhr.ok) throw new Error('HTTP not ok');
                    const cue = parseCue(await xhr.text());

                    // 载入
                    if (file.name == item.name)
                        id = CFG.playlist.length;

                    cue.forEach(element => CFG.playlist.push({
                        "name": element.title,
                        "album": element.album,
                        "composer": element.performer,
                        "path": item.path,
                        "url": FILE_PROXY_SERVER + encodePath(finfo.dir + '/' + element.file),
                        "start": element.start,
                        "match_name": splitPath({path: element.file}).name
                    }));
                }catch(e){
                    console.error(e);
                }
            }

            // 字幕&封面配对
            for (let i = 0; i < CFG.playlist.length; i++){
                if (CFG.playlist[i].match_name in lrcs)
                    CFG.playlist[i].lrc = lrcs[CFG.playlist[i].match_name];
                if (CFG.playlist[i].match_name in covers)
                    CFG.playlist[i].cover = covers[CFG.playlist[i].match_name];
                else if(default_cover.length > 0)
                    CFG.playlist[i].cover = default_cover[0];
            }

            // 更新
            cur_dir = dir;
        }

        if (id !== undefined) CFG.currentID = id;
        else message({
            "type": "error",
            "title": "vLite",
            "content": {
                "title": "找不到文件",
                "content": "文件可能被移动、删除等，请尝试刷新网页"
            },
            "timeout": 5
        });
    }

    const cancel = regSelf('vLite',(f) => {
        play(f);
        ev('show');
    });
    onUnmounted(() => {audio.pause() ;cancel()});

    play(data);
</script>

<template>
    <div class="vlite-container" tabindex="-1" @keydown.prevent="keyev" ref="root">
        <div class="container">
            <div class="left" :single="!CFG.lrc.length" v-if="current">
                <div class="cover" :style="{ backgroundImage: current.cover ? `url('${current.cover}')` : undefined }">
                </div>
                <h3>{{ current.name }}</h3>
                <span>{{ current.composer || '未知' }}</span>
                <div class="time">
                    <span>{{ CFG.currentTime }}</span>
                    <div class="timebar" @click="
                        seekTo($event.offsetX / ($event.currentTarget as HTMLElement).clientWidth)
                    ">
                        <div class="proc" :style="{ width: CFG.progress * 100 + '%' }"></div>
                    </div>
                    <span>{{ CFG.totalTime }}</span>
                </div>
                <div class="btns">
                    <!--音量-->
                    <div tabindex="-1" class="volume-c" size="small" vs-icon="volume" button="small" invert>
                        <div class="after volume"
                            @click.stop.prevent="audio.volume = $event.offsetX / ($event.currentTarget as HTMLElement).clientWidth">
                            <div :style="{ width: CFG.volume * 100 + '%' }"></div>
                        </div>
                    </div>
                    <!--上一个-->
                    <div @click.stop="CFG.currentID--" vs-icon="prev" invert button />
                    <!--播放/暂停-->
                    <div size="large"
                        @click.stop="audio.paused ? audio.play() : audio.pause()" 
                        :vs-icon="audio.paused ? 'play' : 'pause'" invert button="large"
                    />
                    <!--下一个-->
                    <div @click.stop="CFG.currentID++" vs-icon="next" invert button />
                    <!-- 侧栏 -->
                    <div size="small" @click="CFG.show_playlist = true" vs-icon="music-list" invert button="small" />
                </div>
            </div>
            <div class="right" v-if="CFG.lrc.length">
                <div ref="lrc_elem" v-for="(lrc,i) in CFG.lrc" :active="i == CFG.lrc_now"
                    @click="audio.currentTime = lrc.timestamp">
                    {{ lrc.content }}
                </div>
            </div>
        </div>
        <div class="side-overlay" v-if="CFG.show_playlist" @click="CFG.show_playlist = false"></div>
        <div class="side" :active="CFG.show_playlist">
            <h1>
                播放列表
                <!-- 循环模式 -->
                <div @click="switchMode" :vs-icon="getIcon" button />
            </h1>
            <div v-for="(item,id) in CFG.playlist" :active="id == CFG.currentID" :style="{
                    '--backdrop': item.cover ? `url(${item.cover})` : 'gray'
                }" @click="CFG.currentID = id">
                <h1>
                    {{ item.name }}
                    <span v-if="item.composer">{{item.composer}}</span>
                </h1>
                <span>{{ item.album || '未知专辑' }}</span>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .vlite-container{
        height: 100%;

        > .container{
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #58706d;
            height: 100%;
            gap: 1rem;
            transform: translate(0);

            > .left{
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                

                @media screen and ((max-width: 30rem) or (max-height: 25rem)){
                    position: absolute;
                    bottom: 0;
                    left: .5rem;
                    right: .5rem;
                    background-color: #58706d;
                    display: block;
                    max-width: none !important;
                    width: unset !important;
                    z-index: 0;

                    > .cover{
                        position: fixed;
                        inset: 0;
                        z-index: -1;
                        filter: brightness(0.5);
                    }

                    > .time{
                        width: 100%;
                    }
                }

                &[single=false]{
                    min-width: 25%;
                    width: 45vh;
                    max-width: 45%;
                    max-height: 85%;
                }

                &[single=true]{
                    max-width: 60%;
                    max-height: 90%;
                    width: 50vh;
                }

                > .cover{
                    flex-grow: 1;
                    padding-top: 100%;
                    background-image: linear-gradient(60deg, #3c9ea4, #cfe9bc);
                    background-position: center;
                    background-size: cover;
                    background-repeat: no-repeat;
                    border-radius: .3rem;
                }

                > .btns{
                    display: flex;
                    gap: .35rem;
                    justify-content: center;
                    align-items: center;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 1.25rem;

                    > div.volume-c{
                        position: relative;
                        overflow: hidden;

                        &:focus{
                            overflow: visible;
                            transition: none;
                            transform: none;

                            svg{
                                opacity: 1;
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
                    font-family: 'Barlow';

                    > *{
                        flex-shrink: 0;
                        min-width: 3em;
                        text-align: center;
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
                overflow: hidden;
                height: 100%;
                width: 50%;
                scroll-behavior: smooth;

                @media screen and ((max-width: 30rem) or (max-height: 25rem)) {
                    width: unset;height: unset;
                    z-index: 0;
                    position: absolute;
                    margin: 0;
                    top: 0;left: .75rem;
                    right: .75rem;bottom: 7rem;
                }

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

        > .side-overlay{
            background-color: #dedede49;
            z-index: 39;
            position: absolute;
            inset: 0;
            backdrop-filter: blur( .2rem );
        }

        >.side{
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            overflow-y: auto;
            width: 50vw;
            min-width: 10rem;
            max-width: 15rem;
            padding: 1rem;
            background-color: rgba(255, 255, 255, 0.9);
            z-index: 40;
            transform: translateX(100%);
            transition: all .2s;

            &[active=true]{
                transform: none;
            }

            > h1{
                margin: 0 0 1rem .75rem;
                font-size: 1.6rem;
                font-weight: 500;
                color: #78acf3;

                > div{
                    float: right;
                    width: 1.3em;
                    height: 1.3em;
                }
            }

            > div{
                margin-bottom: .35rem;
                border-radius: .3rem;
                padding: .5rem;
                transition: all .2s;

                &[active=true]{
                    color: rgb(111, 103, 224);

                    > h1{
                        font-weight: 400;
                    }
                }

                > *{
                    display: block;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    margin: 0;
                }

                > h1{
                    font-weight: 200;
                    font-size: 1rem;
                    line-height: 1.2rem;

                    > span{
                        font-size: .8rem;
                        line-height: 1.2rem;
                        opacity: .6;
                        float: right;
                    }
                }

                > span{
                    opacity: .5;
                    display: block;
                    font-size: .75rem;
                }

                &:hover{
                    background-color: rgba(218, 215, 215, 0.5);
                }
            }
        }
    }
</style>
