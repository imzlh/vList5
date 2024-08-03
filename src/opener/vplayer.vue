<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/env';
    import { regSelf } from '@/opener';
    import { FS, Global, UI, acceptDrag, clipFName, regConfig, reqFullscreen, splitPath } from '@/utils';
    import ASS from 'assjs';
    import { onMounted, onUnmounted, ref, shallowReactive, shallowRef, watch } from 'vue';

    interface subOption {
        name: string,
        url?: string,
        text?: string,
        sub_type: 'ass' | 'vtt'
    }

    interface videoOption extends vFile {
        vid_name: string,
        subtitle: Array<subOption>
    }

    const MKV_EXTRACT = ['mkv','webm'];

    const opts_ = defineProps(['option']),
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
        ev = defineEmits(['show']);

    // 时间栏
    const timer = setInterval(() => CFG.datetime = new Date(), 350);

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
    watch(() => CFG.subtitle[CFG.sub_current],function(val:subOption){
        if(!val) return;
        if(val.sub_type == 'vtt') return ass && ass.hide();
        else if(CFG.disp_sub) load_sub(val) .then(() => CFG.alert = '字幕加载成功');

        // 偏移设置
        if(CFG.sub_offset)
            CFG.sub_offset = '0';   // 还原默认
    });

    // 调整字幕显示状况
    watch(() => CFG.disp_sub,function(val){
        if(!CFG.subtitle[CFG.sub_current]) return ass && ass.hide();

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
        }

        // 偏移设置
        else if(CFG.sub_offset)
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
        ass && ass.destroy();   // 销毁ASS
        CFG.subtitle = val.subtitle;
        if(CFG.subtitle.length > 0) CFG.sub_current = 0;
        else CFG.sub_current = -1;

        // 视频设置
        video.value.src = val.url;
        video.value.play();
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

        root.value && acceptDrag(root.value, pl => {
            if(pl.type == 'dir') return;
            const info = splitPath(pl);
            if(['ass', 'ssa', 'vtt'].includes(info.ext.toLowerCase())){
                CFG.subtitle.push({
                    name: info.name,
                    sub_type: info.ext == 'vtt' ? 'vtt' : 'ass',
                    url: pl.url
                });
            }else CTRL.play(pl);
        });
    });

    function keyev(kbd:KeyboardEvent){
        if(!video.value) return;
        kbd.preventDefault();kbd.stopPropagation();
        switch(kbd.key){
            case 'ArrowRight':
                video.value.currentTime += CONFIG.seek_time;
            break;

            case 'ArrowLeft':
                video.value.currentTime -= CONFIG.seek_time;
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
        }
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
            "vtt"
        ],
        "video": [
            "webm",
            "mkv",
            "mp4",
            "ogv"
        ]
    }

    const CTRL = {
        dir: '?',
        pick_sub() {
            const subnow = CFG.subtitle.map(each => each.name),
                subfor = CFG.current;
            Global('ui.choose').call(this.dir)
                .then((items: Array<vFile>) => items.forEach(each => {
                    // 已经包含
                    if (subnow.includes(each.name)) return;
                    // 字幕太大
                    // if (each.size > 10 * 1024 * 1024) return Global('ui.message').call({
                    //     "type": "error",
                    //     "title": "vPlayer",
                    //     "content": {
                    //         "title": "无法打开" + clipFName(each, 15),
                    //         "content": '文件太大，libass拒绝渲染'
                    //     }
                    // } satisfies MessageOpinion);
                    // 非推荐格式
                    const info = splitPath(each);
                    if (!['ass', 'ssa', 'vtt'].includes(info.ext.toLowerCase()))
                        return Global('ui.message').call({
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
                        sub_type: info.ext == 'vtt' ? 'vtt' : 'ass',
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
                    subs = {} as Record<string, Array<subOption>>;
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
                            sub_type: info.ext == 'vtt' ? 'vtt' : 'ass',
                            url: item.url
                        })
                    }
                });

                // 字幕配对
                for (let i = 0; i < CFG.playlist.length; i++)
                    if (CFG.playlist[i].vid_name in subs)
                        CFG.playlist[i].subtitle = subs[CFG.playlist[i].vid_name];
                    else
                        CFG.playlist[i].subtitle = [];

                // 更新
                this.dir = dir;
            }

            if (id !== undefined){
                CFG.current = id;
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
        shoot(){
            if(!video.value) return;
            let canvas = document.createElement('canvas');
            let w = canvas.width = video.value.videoWidth,
                h = canvas.height = video.value.videoHeight;
            canvas.getContext("2d")?.drawImage(video.value,0,0,w,h);
            canvas.toBlob(blob => {
                if(!blob) return;
                const url = URL.createObjectURL(blob);
                const win = window.open(url);
                if(win) win.onbeforeunload = () =>
                    URL.revokeObjectURL(url);    // 销毁链接
            },"image/webp");
            CFG.alert = '截图完成';
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

    // 初始化文件
    CTRL.play(file);
</script>

<template>
    <div class="vpf_container" :active="CFG.active"  tabindex="-1"
        @dblclick="CFG.playing ? video?.pause() : video?.play()"
        @pointermove="mouse" @click="mouse" ref="root"
        @keydown="keyev" v-touch 
    >
        <div class="video" :width="CFG.vid_state"
            @touchstart.stop.prevent="touch.start" @touchmove.stop.prevent="touch.move" @touchend.stop.prevent="touch.end"
        >
            <video ref="video">
                <track :default="CFG.disp_sub" v-if="CFG.subtitle[CFG.sub_current] && CFG.subtitle[CFG.sub_current].sub_type == 'vtt'"
                    kind="captions" label="vtt sub" :src="CFG.subtitle[CFG.sub_current].url" />
            </video>
            <!-- 错误提示 -->
            <div class="error" :display="CFG.error">
                <svg viewBox="0 0 16 16">
                    <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
                    <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
                </svg>
            </div>
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
                <div @click.stop="CFG.current--">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" />
                    </svg>
                </div>
                <!--播放/暂停-->
                <div style="transform:scale(1.4);" @click.stop="CFG.playing ? video?.pause() : video?.play()">
                    <svg viewBox="0 0 16 16" v-show="!CFG.playing">
                        <path
                            d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                    </svg>
                    <svg viewBox="0 0 16 16" v-show="CFG.playing">
                        <path
                            d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                    </svg>

                </div>
                <!--下一个-->
                <div @click.stop="CFG.current++">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0V4z" />
                    </svg>
                </div>
                <!--音量-->
                <div class="has_dialog" tabindex="-1">
                    <svg viewBox="0 0 16 16" style="transform: scale(1.2);">
                        <path
                            d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12V4zm3.025 4a4.486 4.486 0 0 1-1.318 3.182L10 10.475A3.489 3.489 0 0 0 11.025 8 3.49 3.49 0 0 0 10 5.525l.707-.707A4.486 4.486 0 0 1 12.025 8z" />
                    </svg>
                    <div class="dialog" left style="padding:.5rem 1rem;">
                        <input type="range" min="0" max="1" step="0.01" v-model="CFG.volume" class="func_volume" style="width:100%;">
                    </div>
                </div>
                <!--全屏-->
                <div right @click.stop="UI.fullscreen.value ? exitFullScreen() : reqFullscreen()">
                    <svg viewBox="0 0 16 16" v-show="!UI.fullscreen.value">
                        <path
                            d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
                    </svg>
                    <svg viewBox="0 0 16 16" v-show="UI.fullscreen.value">
                        <path
                            d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z" />
                    </svg>
                </div>
                <!--拉伸-->
                <div class="has_dialog" right tabindex="-1">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z" />
                        <path
                            d="M2 4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H3v2.5a.5.5 0 0 1-1 0v-3zm12 7a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H13V8.5a.5.5 0 0 1 1 0v3z" />
                    </svg>
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
                <div class="has_dialog" right tabindex="-1">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                    </svg>
                    <div class="dialog">
                        <div @click.stop="CTRL.pick_sub()">
                            <svg viewBox="0 0 16 16">
                                <path
                                    d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zM2 6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5a.5.5 0 0 0-.5.5V6zm-.367 1a.5.5 0 0 0-.496.562l.64 5.124A1.5 1.5 0 0 0 3.266 14h9.468a1.5 1.5 0 0 0 1.489-1.314l.64-5.124A.5.5 0 0 0 14.367 7H1.633z" />
                            </svg>
                            <span>添加字幕轨</span>
                        </div>
                        <div class="check" :active="CFG.loop" @click.stop="CFG.loop = !CFG.loop">
                            <svg viewBox="0 0 16 16" v-show="!CFG.loop">
                                <path
                                    d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                                <path fill-rule="evenodd"
                                    d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z" />
                            </svg>
                            <span>此视频循环</span>
                        </div>
                        <div class="check" :active="CFG.disp_sub" @click.stop="CFG.disp_sub = !CFG.disp_sub">
                            <svg viewBox="0 0 16 16">
                                <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2V2zm5 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2v5a2 2 0 0 1-2 2H5z"/>
                            </svg>
                            <span>显示字幕</span>
                        </div>
                        <div v-if="CFG.disp_sub" :title="CFG.sub_offset + 's'">
                            <svg viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10zM.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8z"/>
                            </svg>
                            <span class="has_input">
                                <div>字幕偏移 ({{ CFG.sub_offset }}s)</div>
                                <input type="range" min="-5" max="5" step="0.1" v-model="CFG.sub_offset" />
                            </span>
                        </div>
                    </div>
                </div>
                <!--倍速-->
                <div class="has_dialog" right tabindex="-1">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z" />
                        <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z" />
                        <path
                            d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z" />
                    </svg>
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
                <div right @click.stop="CTRL.shoot()">
                    <svg viewBox="0 0 16 16">
                        <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                        <path
                            d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
                    </svg>
                </div>
                <!--字幕轨-->
                <div class="has_dialog" right tabindex="-1">
                    <svg viewBox="0 0 16 16">
                        <path
                            d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z" />
                        <path
                            d="M4 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8zm0 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z" />
                    </svg>
                    <div class="dialog selector">
                        <div v-for="(sub, i) in CFG.subtitle" :active="CFG.sub_current == i"
                            @click.stop="CFG.sub_current = i"
                        >
                            <span>{{ sub.name }} ({{ sub.sub_type }})</span>
                        </div>
                    </div>
                </div>
                <!--列表-->
                <div class="has_dialog" right tabindex="-1">
                    <svg viewBox="0 0 16 16">
                        <path fill-rule="evenodd"
                            d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
                    </svg>
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

                > svg{
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
                    text-shadow: black 2px 0 0,
                        black 0 2px 0,
                        black -2px 0 0,
                        black 0 -2px 0,
                        black 2px 2px 0,
                        black -2px -2px 0,
                        black 2px -2px 0,
                        black -2px 2px 0;
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

                    > svg{
                        opacity: .6;
                        transition: opacity .2s;
                        pointer-events: none;
                        display: block;
                        width: 1.5rem;height: 1.5rem;
                        fill: white;
                        opacity: .6;
                        transition: opacity .2s;
                    }

                    &:hover > svg{
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
                    > svg{
                        opacity: 1 !important;
                    }

                    > .dialog{
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                &:hover > svg{
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

                        > svg{
                            flex-shrink: 0;
                            display: block;
                            width: 1.5rem;
                            height: 1.5rem;
                            margin: .5rem;
                            fill: white;
                        }

                        &:hover span.has_input {
                            &::before {
                                content: '';
                            }

                            >div {
                                // text-indent: .5rem;
                                display: none;
                            }

                            >input {
                                display: block;
                            }
                        }

                        > span{
                            flex-grow: 1;
                            color: white;
                            padding-right: .5rem;
                            text-overflow: ellipsis;
                            overflow: hidden;
                            white-space: nowrap;
                            position: relative;
                            /*word-break: break-all;*/

                            &.has_input{
                                &::before{
                                    position: absolute;
                                    width: .25rem;
                                    height: 1rem;
                                    border-radius: .2rem;
                                    background-color: rgba(85, 255, 190, 0.6);
                                    left: 50%;
                                    top: 0
                                }

                                > input{
                                    display: none;
                                    width: 100%;
                                    opacity: .6;
                                }
                            }
                        }

                        &:hover{
                            background-color: gray;
                        }

                        &::before{
                            display: inline-block;
                            width: 1.5rem;height: 1.5rem;
                            padding: .5rem;
                            flex-shrink: 0;
                        }

                        &[active=true]{
                            &::before{
                                content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/></svg>');
                            }

                            > svg{
                                display: none;
                            }
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
