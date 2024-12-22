<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/env';
    import { regSelf } from '@/opener';
    import { FS, UI, acceptDrag, clipFName, createWindow, message, registerCommand, reqFullscreen, showFilePicker, splitPath } from '@/utils';
    import ASS from 'assjs';
    import { nextTick, onMounted, onUnmounted, ref, shallowReactive, shallowRef, watch } from 'vue';
    import MediaSession, { updateMediaSession } from './media/mediaSession';
    import { parseSrt } from './media/subsrt';
    import I_IMAGE from '/app/vplayer.webp';

    interface subOption {
        name: string,
        url?: string,
        text?: string,
        sub_type: 'ass' | 'vtt' | 'srt'
    }

    interface videoOption extends vFile {
        vid_name: string,
        subtitle: Array<subOption>,
        poster?: string
    }

    const opts_ = defineProps(['option', 'visibility']),
        file = opts_['option'] as vFile,
        root = ref<HTMLElement>(),
        CFG = shallowReactive({
            // 信息条
            alert: '',
            // 当前播放百分比
            timeprog: 0,
            // 当前播放时间
            time: '0:00',
            // 总计时长
            timetotal: '-:-',
            // 当前videoID
            current: -1,
            // 是否循环播放
            loop: false,
            // 播放列表
            playlist: [] as Array<videoOption>,
            // 字幕列表
            subtitle: [] as Array<subOption>,
            // 当前字幕ID
            sub_current: 0,
            // 当前音量
            volume: 1,
            // 视频拉伸状态
            vid_state: 'auto' as 'auto' | 'width' | 'height' | 'full',
            // 播放倍速
            vid_rate: 1,
            // 播放状态
            playing: false,
            // 活动
            active: false,
            // 显示字幕
            disp_sub: true,
            // 操作提示
            action: '',
            // 字母偏移
            sub_offset: '0',
            // 错误提示
            error: false,
            // 当前时间
            datetime: new Date()
        }),
        video = shallowRef<HTMLVideoElement>(),
        cached = shallowRef<Array<[number,number]>>([]),
        ev = defineEmits(['show', 'close']);

    // 时间栏
    const timer = setInterval(() => CFG.datetime = new Date(), 350);

    // 监听可见性以抢夺mediaSession
    watch(() => opts_.visibility, val =>
        val && video.value && (MediaSession.value = {
            seekOnce: 10,
            prev: () => CFG.current--,
            next: () => CFG.current++,
            play: () => video.value?.play(),
            pause: () => video.value?.pause(),
            set time(val: number) { video.value && (video.value.currentTime = val) },
            get time() { return video.value? video.value.currentTime : 0 },
        }, updateMediaSession({
            "title": CFG.playlist[CFG.current].vid_name,
            "artist": "vlist",
            "album": "vlist",
            "artwork": [{ src: video.value.poster }]
        })),
        { immediate: true }
    );

    // 信息栏监听器
    let alert_timer = false as any;
    watch(() => CFG.alert,function(){
        if(CFG.alert == '') return;
        if(alert_timer !== false) clearTimeout(alert_timer);
        alert_timer = setTimeout(() => CFG.alert = '',5000);
    },{ immediate: true });

    // 鼠标监听
    let mouse_timer: any;
    function mouse(){
        if(mouse_timer !== undefined) clearTimeout(mouse_timer);
        mouse_timer = setTimeout(() => CFG.active = false,5000);
        CFG.active = true;
    }

    // 声音大小
    watch(
        () => CFG.volume,
        n => video.value && (video.value.volume = n,CFG.alert = '声音大小: ' + n * 100 + '%'),
        { immediate: true }
    );

    // 倍速
    watch(
        () => CFG.vid_rate,
        n => video.value && (video.value.playbackRate = n,CFG.alert = '倍速播放: ' + n + 'x'),
        { immediate: true }
    );

    // 字幕监听
    let ass:ASS|undefined;
    function load_sub(sub: subOption):Promise<ASS>{
        if(ass) ass.destroy(), ass = undefined;
        return new Promise(function(rs, rj){
            if(sub.url){
                const xhr = new XMLHttpRequest();
                xhr.open('GET',sub.url);
                xhr.send();
                xhr.onload = () => rs(ass = new ASS(xhr.responseText,video.value as HTMLVideoElement));
                xhr.onerror = () => rj(CFG.alert = '加载字幕失败');
            }else{
                ass = new ASS(sub.text as string ,video.value as HTMLVideoElement)
            }
        });
    }

    // 切换字幕
    let blob: undefined | string;
    watch(() => CFG.subtitle[CFG.sub_current], function(val, old){
        if(!val) return;
        if(blob) URL.revokeObjectURL(blob), blob = undefined;
        if(old?.sub_type == 'ass') ass && ass.destroy();
        else if(old?.sub_type == 'srt' && video.value && video.value.textTracks[0]?.cues){
            // BUG: https://github.com/whatwg/html/issues/1921
            // 删除textTrack所有cue
            for(const cue of video.value.textTracks[0].cues)
                video.value.textTracks[0].removeCue(cue);
            // 隐藏
            video.value.textTracks[0].mode = 'hidden';
        }
        
        if(val.sub_type == 'srt'){
            if(val.text)
                parseSrt(val.text, video.value!);
            else
                fetch(val.url!).then(res => res.text()).then(text => parseSrt(text, video.value!))
                    .then(() => CFG.alert = 'SRT字幕加载成功');
        }
        else if(val.sub_type == 'vtt'){
            if(val.text){
                const blob = new Blob([val.text], { type: 'text/vtt' });
                const url = URL.createObjectURL(blob);
                (video.value!.children[0] as HTMLTrackElement).src = url;
            }
        }
        else if(CFG.disp_sub) load_sub(val) .then(() => CFG.alert = '字幕加载成功');

        // 偏移设置
        if(CFG.sub_offset)
            CFG.sub_offset = '0';   // 还原默认
    });

    // 调整字幕显示状况
    watch(() => CFG.disp_sub,function(val){
        if(!CFG.subtitle[CFG.sub_current]){
            ass && ass.hide();
            video.value?.children[0]?.remove();
            return;
        }

        // ASS需要初始化
        if(CFG.subtitle[CFG.sub_current].sub_type == 'ass'){
            // 初始化：加载偏移
            if(!ass){
                load_sub(CFG.subtitle[CFG.sub_current]).then(
                    ass => val ? ass.show() : ass.hide()
                );
                // 偏移设置
                if(CFG.sub_offset)
                    init_sub_delay(parseFloat(CFG.sub_offset), parseFloat(CFG.sub_offset));
            // 调整显隐性
            }else{
                val ? ass.show() : ass.hide();
            }
        // 调整texttrack
        }else{
            video.value!.textTracks[0].mode = val ? 'showing' : 'hidden';
        }

        // 偏移设置
        if(CFG.sub_offset)
            init_sub_delay(parseFloat(CFG.sub_offset), parseFloat(CFG.sub_offset));
    });

    // 曲目
    watch(() => CFG.playlist[CFG.current],function(val){
        // 判断
        if(!video.value) return;
        if(!val)
            // 最后一个了
            if(CFG.current >= CFG.playlist.length) return CFG.current = 0;
            // 第一个了
            else if(CFG.current < 0) return CFG.current = CFG.playlist.length -1;

        // 刷新播放状态
        CFG.playing = false;
        CFG.timetotal = '-:-';
        CFG.time = '0:00';
        CFG.timeprog = 0;
        CFG.error = false;

        // 字幕设置
        ass && ass.destroy();               // 销毁ASS
        video.value.children[0]?.remove();   // 清理track
        CFG.subtitle = val.subtitle;
        if(CFG.subtitle.length > 0) CFG.sub_current = 0;
        else CFG.sub_current = -1;

        // 视频设置
        video.value.src = val.url;
        video.value.play();

        // poster
        video.value.poster = val.poster || '';
        updateMediaSession({
            "title": CFG.playlist[CFG.current].vid_name,
            "artist": "vlist",
            "album": "vlist",
            "artwork": val.poster ? [{ src: val.poster}] : undefined
        })
    },{ immediate: true });

    function init_sub_delay(time: number, changed: number){
        if(!video.value) return;
        if(CFG.subtitle[CFG.sub_current].sub_type == 'vtt'){
            const tracks = video.value.textTracks[0].cues;
            if(!tracks) return;
            for (let i = 0; i < tracks.length; i++)
                tracks[i].startTime += changed,
                tracks[i].endTime += changed;
        }else if(ass){
            ass.delay = time;
        }
    }

    // 偏移时间
    watch(() => CFG.sub_offset, (val, old) => {
        if(!CFG.subtitle[CFG.sub_current] || !CFG.disp_sub || val == old) return;
        init_sub_delay(parseFloat(val), parseFloat(val) - parseFloat(old));
    })

    // 添加快捷命令
    onUnmounted(registerCommand({
        "name": "vplayer.speed",
        "title": "vPlayer: 倍速播放",
        handler: () => CFG.vid_rate = CFG.vid_rate <= 2 ? CFG.vid_rate + 0.5 : 0.5
    }, {
        "name": "vplayer.mute",
        "title": "vPlayer: (取消)静音",
        handler: () => video.value && (video.value.muted = !video.value.muted)
    }, {
        "title": "vPlayer: 聚焦",
        "name": "vplauer.focus",
        handler: () => video.value && nextTick(() => requestAnimationFrame(() => video.value!.parentElement!.focus()))
    }, {
        "title": "vPlayer: 暂停/播放",
        "name": "vplayer.toggle",
        handler: () => video.value && (video.value.paused ? video.value.play() : video.value.pause())
    }))

    onMounted(function(){
        if(!video.value) return;
        const vid = video.value;
        vid.crossOrigin = 'anonymous';

        function time2str(time:number){
            const min = Math.floor(time / 60),
                sec = Math.floor(time % 60);
            return min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
        }

        vid.onpause = () => CFG.playing = false;
        vid.onplay = () => CFG.playing = true;
        vid.ontimeupdate = () => (
            CFG.timeprog = vid.currentTime / vid.duration,
            CFG.time = time2str(vid.currentTime)
        );
        vid.onvolumechange = () => CFG.volume = vid.volume;
        vid.onerror = () => CFG.error = true;
        vid.onended = () => CFG.loop ? vid.play() : CFG.current ++;
        vid.ondurationchange = () => CFG.timetotal = time2str(vid.duration);
        vid.onprogress = function(){
            cached.value = [];
            for (let i = 0; i < vid.buffered.length; i++)
                cached.value.push([vid.buffered.start(i) / vid.duration,vid.buffered.end(i) / vid.duration]);
        }
        vid.oncanplay = () => vid.playbackRate = CFG.vid_rate;

        // 初始化文件
        CTRL.play(file)

        root.value && acceptDrag(root.value, pl => {
            if(pl.type == 'dir') return;
            const info = splitPath(pl);
            if(CONFIG.subtitle.includes(info.ext.toLowerCase())){
                CFG.subtitle.push({
                    name: info.name,
                    sub_type: info.ext == 'vtt' ? 'vtt' : info.ext == 'srt' ? 'srt' : 'ass',
                    url: pl.url
                });
            }else CTRL.play(pl);
        });
    });

    function keyev(kbd:KeyboardEvent){
        if(!video.value) return;
        switch(kbd.key){
            case 'ArrowRight':
                if(kbd.ctrlKey) CFG.current ++;
                else video.value.currentTime += CONFIG.seek_time;
            break;

            case 'ArrowLeft':
                if(kbd.ctrlKey) CFG.current --;
                else video.value.currentTime -= CONFIG.seek_time;
            break;

            case 'ArrowUp':
                CFG.volume = CFG.volume > .9 ? 1 : CFG.volume + .1;
            break;

            case 'ArrowDown':
                CFG.volume = CFG.volume < .1 ? 0 : CFG.volume - .1;
            break;

            case ' ':
            case 'Enter':
                video.value.paused ? video.value.play() : video.value.pause();
            break;

            default:
                return;
        }

        kbd.preventDefault();kbd.stopPropagation();
    }

    const touch = {
        moved: {
            x: 0, y: 0,
            xmoved: 0, ymoved: 0,
            started: false,
            lastClick: 0
        },
        start(e:TouchEvent){
            this.moved.started = true;
            this.moved.x = e.touches[0].clientX,
            this.moved.y = e.touches[0].clientY,
            this.moved.xmoved = this.moved.ymoved = 0;
        },
        move(e:TouchEvent){
            if(!this.moved.started) return false;
            const x = e.touches[0].clientX,
                y = e.touches[0].clientY;
            this.moved.xmoved = x - this.moved.x,
            this.moved.ymoved = y - this.moved.y;

            // 进度调节
            if(Math.abs(this.moved.xmoved) > Math.abs(this.moved.ymoved)
                && Math.abs(this.moved.xmoved) > 20
            )   CFG.action = (this.moved.xmoved > 0 ? '快进 ' : '快退 ') + Math.abs(this.moved.xmoved / 10).toFixed() + ' 秒';

            // 声音调节
            else if(Math.abs(this.moved.ymoved) > 20)
                CFG.action = '声音 ' + (
                    CFG.volume * 100 - this.moved.ymoved > 100
                    ? 100
                    : (
                        CFG.volume * 100 - this.moved.ymoved / 5 < 0
                        ? 0
                        : (CFG.volume * 100 - this.moved.ymoved / 5).toFixed()
                    )
                ) + '%';

            else CFG.action = '';
        },
        end(e:TouchEvent){
            this.moved.started = false;
            const now = new Date().valueOf();

            if(!video.value) return;

            // 进度调节
            if(Math.abs(this.moved.xmoved) > Math.abs(this.moved.ymoved) && Math.abs(this.moved.xmoved) > 20)
                video.value.currentTime += Math.floor(this.moved.xmoved / 10);

            // 声音调节
            else if(Math.abs(this.moved.ymoved) > 10)
                video.value.volume =
                    CFG.volume * 100 - this.moved.ymoved > 100
                    ? 1
                    : (
                        CFG.volume * 100 - this.moved.ymoved < 0
                        ? 0
                        : Math.floor(CFG.volume - this.moved.ymoved / 500)
                    );

            // 唤起菜单
            else if(now - this.moved.lastClick < 500)
                CFG.playing ? video.value.pause() : video.value.play()
            else mouse();

            this.moved.lastClick = now,
            CFG.action = '';
        }
    }

    const exitFullScreen = () => document.exitFullscreen();

    const CONFIG = {
        seek_time: 10,
        subtitle: [
            "ssa",
            "ass",
            "vtt",
            "srt"
        ],
        "video": [
            "webm",
            "mkv",
            "mp4",
            "ogv"
        ],
        image: [
            'bmp',
            'jpg', 'png', 'jpeg',
            'webp',
            'avif'
        ]
    }

    const CTRL = {
        dir: '?',
        pick_sub() {
            const subnow = CFG.subtitle.map(each => each.name),
                subfor = CFG.current;
            showFilePicker(this.dir, 'file')
                .then(items => items.forEach(each => {
                    // 已经包含
                    if (subnow.includes(each.name)) return;
                    // 字幕太大
                    if (each.size > 10 * 1024 * 1024) return message({
                        "type": "error",
                        "title": "vPlayer",
                        "content": {
                            "title": "无法打开" + clipFName(each, 15),
                            "content": '文件太大, 极易造成卡顿或崩溃\n请选择较小的文件'
                        }
                    } satisfies MessageOpinion);
                    // 非推荐格式
                    const info = splitPath(each);
                    if (!CONFIG.subtitle.includes(info.ext.toLowerCase()))
                        return message({
                            "type": "warn",
                            "title": "vPlayer",
                            "content": {
                                "title": "可疑文件: " + clipFName(file, 15),
                                "content": "这个文件不是标准后缀，我们无法得知字幕类型"
                            },
                            "timeout": 5
                        } satisfies MessageOpinion);
                    // 推入列表
                    CFG.playlist[subfor].subtitle.push({
                        name: info.name,
                        sub_type: info.ext == 'vtt' ? 'vtt' : info.ext == 'srt' ? 'srt' : 'ass',
                        url: each.url
                    });
                    // 设置为当前字幕
                    if (subfor == CFG.current) {
                        CFG.sub_current = CFG.subtitle.push() - 1;
                    }
                }));
        },
        temp_url: null as null|string,
        async play(file: vFile) {
            //  清理URL
            if(this.temp_url)
                URL.revokeObjectURL(this.temp_url),this.temp_url = null;

            const dir = splitPath(file)['dir'];
            let id: number | undefined;
            if (this.dir == dir) {
                // 找到ID
                for (let i = 0; i < CFG.playlist.length; i++)
                    if (CFG.playlist[i].name == file.name) {
                        id = i;
                        break;
                    }
            } else {
                // 更新列表
                const list = (await FS.list(dir || '/')).filter(item => item.type == 'file'),
                    subs = {} as Record<string, Array<subOption>>,
                    posters = {} as Record<string, string>;
                CFG.playlist = []; CFG.subtitle = [];
                let i = 0;
                list.forEach(item => {
                    const info = splitPath(item);
                    // 是视频
                    if (CONFIG.video.includes(info.ext.toLowerCase())) {
                        if (item.name == file.name)
                            id = i;
                        // 转换
                        (item as videoOption).vid_name = info.name;
                        CFG.playlist.push(item as videoOption);
                        i++;
                    // 是字幕
                    } else if (CONFIG.subtitle.includes(info.ext.toLowerCase())) {
                        if (!(info.name in subs)) subs[info.name] = [];
                        subs[info.name].push({
                            name: info.name,
                            sub_type: info.ext == 'vtt' ? 'vtt' : info.ext == 'srt' ? 'srt' : 'ass',
                            url: item.url
                        })
                    // 是图片：poster
                    } else if ( CONFIG.image.includes(info.ext.toLowerCase())) {
                        posters[info.name] = item.url;
                    }
                });

                // 字幕配对
                for (let i = 0; i < CFG.playlist.length; i++){
                    if (CFG.playlist[i].vid_name in subs)
                        CFG.playlist[i].subtitle = subs[CFG.playlist[i].vid_name];
                    else
                        CFG.playlist[i].subtitle = [];
                    if(CFG.playlist[i].vid_name in posters)
                        CFG.playlist[i].poster = posters[CFG.playlist[i].vid_name];
                }

                // 更新
                this.dir = dir;
            }

            if (id !== undefined){
                CFG.current = id;
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
        shoot(open = true){
            return new Promise<string>(resolve => {
                if(!video.value) return;
                let canvas = document.createElement('canvas');
                let w = canvas.width = video.value.videoWidth,
                    h = canvas.height = video.value.videoHeight;
                canvas.getContext("2d")?.drawImage(video.value,0,0,w,h);
                canvas.toBlob(blob => {
                    if(!blob) return;
                    const url = URL.createObjectURL(blob);
                    if(open){
                        CFG.alert = '截图完成';
                        createWindow({
                            "name": "屏幕截图-" + new Date().toLocaleString(),
                            "content": url,
                            "onDestroy": () => URL.revokeObjectURL(url),
                            "icon": I_IMAGE
                        });
                    }
                    resolve(url);
                },"image/webp");
                
            });
        }
    };

    // 初始化自己
    const cancel = regSelf('vPlayer',f => {
        CTRL.play(f);
        ev('show');
    });
    onUnmounted(() => {
        cancel();
        clearInterval(timer);
    });
</script>

<template>
    <div class="vpf_container" :active="CFG.active"  tabindex="-1"
        @dblclick="CFG.playing ? video?.pause() : video?.play()"
        @pointermove="mouse" @click="mouse" ref="root"
        @keydown="keyev" v-touch 
    >
        <div class="video" :width="CFG.vid_state" tabindex="-1"
            @touchstart.stop.prevent="touch.start" @touchmove.stop.prevent="touch.move" @touchend.stop.prevent="touch.end"
        >
            <video ref="video">
                <track default v-if="CFG.subtitle[CFG.sub_current]?.sub_type == 'vtt'"
                    kind="captions" label="vtt sub" :src="CFG.subtitle[CFG.sub_current].url" />
            </video>
            <!-- 错误提示 -->
            <div class="error" :display="CFG.error" vs-icon="warning" invert />
        </div>
        <!-- 时间小工具 -->
        <div class="time">
            <span> {{ CFG.datetime.getHours().toString().padStart(2, '0') }}</span>
            :<span>{{ CFG.datetime.getMinutes().toString().padStart(2, '0') }}</span>
            :<span>{{ CFG.datetime.getSeconds().toString().padStart(2, '0') }}</span>
        </div>
        <!-- 顶部 -->
        <div class="top" v-if="CFG.playlist[CFG.current]">
            {{ CFG.playlist[CFG.current].name }}
        </div>
        <!--信息条-->
        <div class="alert" :active="CFG.alert != ''">
            {{ CFG.alert }}
        </div>
        <!-- 操作条 -->
        <div class="action-modal" v-show="CFG.action != ''">{{ CFG.action }}</div>
        <!-- 底部 -->
        <div class="bottom" @dblclick.stop>
            <div class="time">
                <span>{{ CFG.time }}</span>
                <span class="total">{{ CFG.timetotal }}</span>
            </div>
            <div class="progress"
                @click.stop="video && (video.currentTime = ($event.offsetX / ($event.currentTarget as HTMLElement).clientWidth * video.duration))"
            >
                <div v-for="cache in cached" :style="{
                    left: cache[0] * 100 + '%',
                    width: (cache[1] - cache[0]) * 100 + '%'
                }" class="cache"></div>
                <div class="prog" :style="{ width: CFG.timeprog * 100 + '%' }"></div>
            </div>
            <div class="btns">
                <!--上一个-->
                <div @click.stop="CFG.current--" vs-icon="prev" invert />
                <!--播放/暂停-->
                <div @click.stop="CFG.playing ? video?.pause() : video?.play()"
                    :vs-icon="CFG.playing ? 'pause' : 'play'" invert
                />
                <!--下一个-->
                <div @click.stop="CFG.current++" vs-icon="next" invert />
                <!--音量-->
                <div class="has_dialog" tabindex="-1" vs-icon="volume" invert >
                    <div class="dialog" left style="padding:.5rem 1rem;">
                        <input type="range" min="0" max="1" step="0.01" v-model="CFG.volume" class="func_volume" style="width:100%;">
                    </div>
                </div>
                <!--全屏-->
                <div right @click.stop="UI.fullscreen.value ? exitFullScreen() : reqFullscreen()"
                    :vs-icon="UI.fullscreen.value ? 'exit-fullscreen' : 'fullscreen'" invert
                />
                <!--拉伸-->
                <div class="has_dialog" right tabindex="-1" vs-icon="aspect" invert>
                    <div class="dialog selector">
                        <div :active="CFG.vid_state == 'auto'"
                            @click.stop="CFG.vid_state = 'auto'; CFG.alert = '视频大小:正常';">
                            <span>正常大小(不拉伸)</span>
                        </div>
                        <div :active="CFG.vid_state == 'width'"
                            @click.stop="CFG.vid_state = 'width'; CFG.alert = '视频大小:长度为100%';">
                            <span>长度优先(拉伸)</span>
                        </div>
                        <div :active="CFG.vid_state == 'height'"
                            @click.stop="CFG.vid_state = 'height'; CFG.alert = '视频大小:宽度为100%';">
                            <span>宽度优先(拉伸)</span>
                        </div>
                        <div :active="CFG.vid_state == 'full'"
                            @click.stop="CFG.vid_state = 'full'; CFG.alert = '视频大小:强制拉伸';">
                            <span>铺满屏幕(拉伸)</span>
                        </div>
                    </div>
                </div>
                <!--设置-->
                <div class="has_dialog" right tabindex="-1" vs-icon="setting" invert>
                    <div class="dialog">
                        <div @click.stop="CTRL.pick_sub()" vs-icon="browse">
                            <span>添加字幕轨</span>
                        </div>
                        <div class="check" :active="CFG.loop" @click.stop="CFG.loop = !CFG.loop" vs-icon="loop">
                            <span>此视频循环</span>
                        </div>
                        <div class="check" :active="CFG.disp_sub" @click.stop="CFG.disp_sub = !CFG.disp_sub" vs-icon="text">
                            <span>显示字幕</span>
                        </div>
                        <div v-if="CFG.disp_sub" :title="CFG.sub_offset + 's'" vs-icon="move">
                            <span class="has_input">
                                <div>字幕偏移 ({{ CFG.sub_offset }}s)</div>
                                <input type="range" min="-5" max="5" step="0.1" v-model="CFG.sub_offset" />
                            </span>
                        </div>
                    </div>
                </div>
                <!--倍速-->
                <div class="has_dialog" right tabindex="-1" vs-icon="clock" invert>
                    <div class="dialog selector func_speed">
                        <div @click.stop="CFG.vid_rate = 0.75" :active="CFG.vid_rate == 0.75">
                            <span>0.75x</span>
                        </div>
                        <div @click.stop="CFG.vid_rate = 1" :active="CFG.vid_rate == 1">
                            <span>1x</span>
                        </div>
                        <div @click.stop="CFG.vid_rate = 1.25" :active="CFG.vid_rate == 1.25">
                            <span>1.25x</span>
                        </div>
                        <div @click.stop="CFG.vid_rate = 1.5" :active="CFG.vid_rate == 1.5">
                            <span>1.5x</span>
                        </div>
                        <div @click.stop="CFG.vid_rate = 2" :active="CFG.vid_rate == 2">
                            <span>2x</span>
                        </div>
                        <div @click.stop="CFG.vid_rate = 3" :active="CFG.vid_rate == 3">
                            <span>3x</span>
                        </div>
                    </div>
                </div>
                <!--拍摄-->
                <div right @click.stop="CTRL.shoot()" vs-icon="shoot" invert></div>
                <!--字幕轨-->
                <div class="has_dialog" right tabindex="-1" vs-icon="chat" invert>
                    <div class="dialog selector">
                        <div v-for="(sub, i) in CFG.subtitle" :active="CFG.sub_current == i"
                            @click.stop="CFG.sub_current = i"
                        >
                            <span>{{ sub.name }} ({{ sub.sub_type }})</span>
                        </div>
                    </div>
                </div>
                <!--列表-->
                <div class="has_dialog" right tabindex="-1" vs-icon="list" invert>
                    <div class="dialog selector">
                        <div v-for="(sub, i) in CFG.playlist" :active="CFG.current == i"
                            @click.stop="CFG.current = i"
                        >
                            <span>{{ sub.name }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    @use '../style/input.scss';

    .vpf_container{
        position: relative;
        display: inline-flex;align-items: center;justify-content: center;
        overflow: hidden;background-color: black;
        width: 100%;height: 100%;

        &[fullscreen=true]{
            position: fixed !important;
            top: 0;left: 0;right: 0;bottom: 0;
            width: unset !important;height: unset !important;
            max-width: none !important;min-width: auto !important;
            max-height: none !important;min-height: auto !important;
        }

        > .video{
            display: inline-block;
            max-width: 100%;max-height: 100%;
            width: auto !important;height: auto !important;
            position: relative;
            outline: none;

            // 'auto' | 'width' | 'height' | 'full'
            &[width=width]{
                width: 100% !important;
                height: auto !important;
                max-height: unset !important;

                > video{
                    object-fit: contain;
                }
            }

            &[width=height]{
                max-width: auto !important;
                width: auto !important;
                height: 100% !important;

                > video{
                    object-fit: cover
                }
            }

            &[width=full]{
                width: 100% !important;
                height: 100% !important;

                > video{
                    object-fit: fill;
                }
            }

            > *:not(video){
                pointer-events: none;
                position: absolute !important;
                top: 50% !important;left: 50% !important;
                transform: translate(-50%, -50%);
            }

            > div.error{
                position: absolute;
                left: 0;top: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                align-items: center;
                justify-content: center;
                display: none;

                &[display=true]{
                    display: flex;
                }

                &::before{
                    display: block;
                    width: 4rem;
                    height: 4rem;
                    fill: white;
                    opacity: .6;
                }
            }

            > video{
                width: 100%;height: 100%;

                &::cue{
                    background-color: transparent;
                    text-shadow: black 1px 0 0,
                        black 0 1px 0,
                        black -1px 0 0,
                        black 0 -1px 0,
                        black 1px 1px 0,
                        black -1px -1px 0,
                        black 1px -1px 0,
                        black -1px 1px 0;
                }
            }
        }

        > .time{
            position: absolute;
            font-size: min(5vw, 8vh, 2.5rem);
            top: 5%;
            right: 5%;
            color: rgb(243 243 243 / 60%);
            font-family: 'Barlow';

            > span{
                display: inline-block;
                width: .8em;
                text-align: right;
            }
        }

        > .top{
            position: absolute;
            top: 0;left: 0;right: 0;z-index: 10;
            transform: translateY(-110%);
            background-image: linear-gradient(black,#424242c7,transparent);
            text-align: center;
            padding: .5rem 0 1rem 0;
            color: white;
            font-size: .85rem;
        }

        > .alert{
            position: absolute;z-index: 20;
            top: -5rem;left: 1rem;
            display: inline-block;margin: auto;
            padding: .5rem 1rem;border-radius: .35rem;
            background-color: #00000088;
            transition: top .3s;
            color: white;
            font-size: .9rem;

            &[active=true],&:hover{
                top: 1rem;
            }
        }

        > .action-modal{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50% ,-50%) !important;
            background-color: #000000;
            color: white;
            font-size: 1.2rem;
            padding: .5rem 1rem;border-radius: .35rem;
        }

        > .bottom{
            position: absolute;
            bottom: 0;left: 0;right: 0;z-index: 10;
            transform: translateY(100%);
            background-image: linear-gradient(transparent,#424242c7,black);
            user-select: none;

            > .time{
                position: absolute;
                top: -2rem;left: 0;right: 0;
                padding: .5rem;
                font-size: .95rem;
                font-family: 'Repair';
                font-weight: 600;
                letter-spacing: 1px;

                .total{
                    float: right;
                }

                > *{
                    transition: color .2s;
                    color: rgba(255, 255, 255, 0.6);
                }

                > *:hover{
                    color: white;
                }
            }

            > .progress{
                border-radius: 0.25rem;
                background-color: #bcb3b3;
                position: relative;top: -.2rem;
                opacity: .6;transition: opacity .2s;
                position: relative;
                height: .2rem;
                transition: all .2s;

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
                }

                > div.prog{
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

                > div.cache{
                    position: absolute;
                    background-color: rgb(238, 235, 235);
                    pointer-events: none;
                }
            }

            > .btns {
                padding: .5rem .5rem .25rem .5rem;

                > div{
                    display: inline-block;
                    margin: 0 .25rem;

                    &::before{
                        opacity: .6;
                        transition: opacity .2s;
                        display: block;
                        width: 1.5rem; height: 1.5rem;
                    }

                    &:hover::before{
                        opacity: 1;
                    }
                }

                > [right]{
                    float: right;
                    transform: scale(.8);
                }
            }

            .has_dialog{
                position: relative;
                box-sizing: border-box;

                &:focus{
                    &::before{
                        opacity: 1 !important;
                    }

                    > .dialog{
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                &:hover &::before{
                    opacity: .8;
                }

                > .dialog{
                    position: absolute;bottom: 3rem;right: 0;
                    z-index: 10;
                    border-radius: .25rem;
                    background-color: rgb(79 74 74 / 70%);
                    transform: scale(0);
                    transform-origin: right bottom;
                    transition: transform .2s,opacity .2s;
                    width: 15rem;max-height: 25rem;
                    overflow-y: auto;overflow-x: hidden;

                    &[left]{
                        right: unset;left: 0;
                        transform-origin: left bottom;
                    }

                    &.selector > div::before{
                        content: '';
                    }

                    &:hover{
                        transform: scale(1);
                    }

                    > div{
                        display: flex;
                        align-items: center;
                        transition: background .2s;

                        &::before{
                            flex-shrink: 0;
                            display: block;
                            width: 1.35rem;
                            height: 1.35rem;
                            margin: .5rem;
                            filter: invert(1);
                        }

                        &:hover span.has_input {
                            >div {
                                display: none;
                            }

                            &::before{
                                content: '';
                            }

                            >input {
                                display: block;
                            }
                        }

                        > span{
                            flex: 1 0;
                            color: white;
                            padding-right: .5rem;
                            text-overflow: ellipsis;
                            overflow: hidden;
                            white-space: nowrap;
                            position: relative;
                            /*word-break: break-all;*/

                            &.has_input{
                                height: 1.2rem;

                                &::before{
                                    position: absolute;
                                    width: .2rem;
                                    height: 1rem;
                                    background-color: rgba(85, 255, 190, 0.6);
                                    left: 50%;
                                    transform: translateX(-50%);
                                    top: 0
                                }

                                > input{
                                    display: none;
                                    width: 100%;
                                    opacity: .6;
                                    font-size: 1rem;

                                    @include input.winui-range();
                                }
                            }
                        }

                        &:hover{
                            background-color: gray;
                        }

                        &[active=true]::before{
                            background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/></svg>');
                        }
                    }
                }
            }
        }

        > div{
            transition: transform .5s;
        }

        &[active=true] > div, & > div:hover{
            transform: translateY(0);
        }
    }
</style>
