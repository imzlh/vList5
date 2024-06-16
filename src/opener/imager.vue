<script setup lang="ts">
    import type { CtxDispOpts, vFile } from '@/data';
    import { regSelf } from '@/opener';
    import { FS, Global, splitPath } from '@/utils';
    import { onMounted, onUnmounted, reactive, ref } from 'vue';

    const imgElem = ref<HTMLImageElement>(),
        boxElem = ref<HTMLDivElement>(),
        cfg = reactive({
            scale: 1,
            offset_x: 0,
            offset_y: 0,
            rotate: 0,
            id: 0,
            imgs: [] as Array<vFile>,
            loading: true
        }),
        opts_ = defineProps(['option']),
        file = opts_['option'] as vFile;

    // 自动加载的图片类型
    const IMAGE = [
        "avif",
        "webp",
        "jpg", "jpeg", "jxl",
        "png",
        "ico",
        "bmp"
    ],
    WHEEL_BEHAVIOR_SCALE = false;

    function set(i:number,fallback:number){
        if(!cfg.imgs[i]) cfg.id = fallback;
        else cfg.id = i;
    }
    
    let dir = '';
    async function initFile(f:vFile){
        const info = splitPath(f);

        if(info.dir == dir){
            // 激活viewer
            for (let i = 0; i < cfg.imgs.length; i++)
                if(cfg.imgs[i].path == f.path)
                    return cfg.id = i;
            Global('ui.message').call({
                "type": "error",
                "title": "Imager",
                "content":{
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                }
            })
        }else{
            // 请求URL
            const temp:Array<vFile> = [];
            let id = -1;
            (await FS.list(info.dir)).forEach(data => {
                (data.type == 'file' && IMAGE.includes(splitPath(data)['ext'].toLowerCase())) 
                    ? ( data.path == f.path ? id = temp.push(data)-1 : temp.push(data) ) : null
            });
            cfg.imgs = temp;
            // 激活viewer
            if(id == -1) Global('ui.message').call({
                "type": "error",
                "title": "Imager",
                "content":{
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                }
            });
            else cfg.id = id;
        }
    }

    function moveHandle(e: PointerEvent) {
        cfg.offset_x += e.movementX;
        cfg.offset_y += e.movementY;
        e.preventDefault();
    }
    function upHandle() {
        document.body.removeEventListener('pointermove', moveHandle);
        document.body.removeEventListener('pointerup', upHandle);
    }
    function moveStart() {
        document.body.addEventListener('pointermove', moveHandle);
        document.body.addEventListener('pointerup', upHandle);
    }

    function fullScreen(){
        if(document.fullscreenElement){
            document.exitFullscreen();
        }else{
            boxElem.value?.requestFullscreen();
        }
    }

    function scroll(e:WheelEvent){
        if(WHEEL_BEHAVIOR_SCALE){
            cfg.scale -= e.deltaX / 50;
        }else{
            cfg.offset_x -= e.deltaX,
            cfg.offset_y -= e.deltaY;
        }
    }

    function showCtx(e:MouseEvent){
        Global('ui.ctxmenu').call({
            "pos_x": e.clientX,
            "pos_y": e.clientY,
            "content": [
                {
                    "text": "向右旋转45°",
                    handle: () => cfg.rotate += 45
                },{
                    "text": "向左旋转45°",
                    handle: () => cfg.rotate -= 45
                },{
                    "text": "倒置图片",
                    handle: () => cfg.rotate = cfg.rotate >= 180 ? 0 : 180
                },{
                    "text": "放大10%",
                    handle: () => cfg.scale /= .9
                },{
                    "text": "缩小10%",
                    handle: () => cfg.scale *= .9
                },{
                    "text": "恢复默认值",
                    handle: () => (cfg.scale = cfg.rotate = 1, cfg.offset_x = cfg.offset_y = 0)
                },'---',{
                    "text": "复制图片",
                    handle() {
                        const img = document.createElement('img'),
                            canvas = document.createElement('canvas'),
                            ctx = canvas.getContext('2d');

                        const E_IMAGE = {
                            "type": "error",
                            "title": "Imager",
                            "content": {
                                "title": "复制图片失败",
                                "content": "获取图像失败(-1)"
                            }
                        }, E_CLIPBOARD = {
                            "type": "error",
                            "title": "Imager",
                            "content": {
                                "title": "复制图片失败",
                                "content": "无法访问剪贴板，请检查浏览器版本和权限"
                            }
                        };

                        // 设置Image
                        if(!ctx) return Global('ui.message').call(E_IMAGE);
                        img.setAttribute('crossOrigin', 'anonymous');
                        img.src = cfg.imgs[cfg.id].url;
                        
                        // 转Blob
                        img.onload = function(){
                            // 重置画布大小
                            canvas.width = img.naturalWidth,
                            canvas.height = img.naturalHeight;
                            // 复制图像(-->jpg)
                            ctx.drawImage(img,0,0);
                            // 转Blob
                            canvas.toBlob(function(blob){
                                if(!blob) return Global('ui.message').call(E_CLIPBOARD);
                                // 复制
                                navigator.clipboard.write([
                                    new ClipboardItem({
                                        [blob.type]: blob
                                    })
                                ]).catch(() => Global('ui.message').call(E_CLIPBOARD));
                            });
                        },img.onerror = () => Global('ui.message').call(E_IMAGE);
                    },
                },{
                    "text": "复制图片链接",
                    handle: () => {

                        function gerror(e:Error){
                            Global('ui.message').call({
                                "type": "error",
                                "title": "Imager",
                                "content":{
                                    "title": "复制图片链接失败",
                                    "content": "无法访问剪贴板，请检查浏览器版本和权限"
                                }
                            });
                            console.error(e);
                        }
                        try{
                            navigator.clipboard.write([
                                new ClipboardItem({
                                    'text/plain': new Blob([cfg.imgs[cfg.id].url],{
                                        type: 'text/plain'
                                    })
                                })
                            ]).catch(gerror);
                        }catch(e){ gerror(e as Error) }
                    }
                },
            ]
        } satisfies CtxDispOpts);
    }

    function keyev(kbd:KeyboardEvent){
        switch(kbd.key){
            case 'ArrowRight':
                set(cfg.id + 1,0);
            break;

            case 'ArrowLeft':
                set(cfg.id - 1,cfg.imgs.length - 1);
            break;

            case 'ArrowUp':
                cfg.scale += .1;
            break;

            case 'ArrowDown':
                cfg.scale -= .1;
            break;
        }
    }

    const unreg = regSelf('Imager',initFile);
    onUnmounted(() => unreg());

    initFile(file);
</script>

<template>
    <div class="image-viewer" v-if="cfg.imgs[cfg.id]" ref="boxElem" tabindex="-1"
        @wheel="scroll" @contextmenu.prevent="showCtx" @keydown.prevent="keyev"
    >
        <img ref="imgElem"
            :style="{
                transform: `scale(${cfg.scale}) translate(calc(${cfg.offset_x}px - 50%), calc(${cfg.offset_y}px - 50%)) rotate(${cfg.rotate}deg)`,
                display: cfg.loading ? 'none' : 'block'
            }"
            :src="cfg.imgs[cfg.id].url" 
            :alt="cfg.imgs[cfg.id].dispName || cfg.imgs[cfg.id].name"
            @load="cfg.loading = false" @loadstart="cfg.loading = true"
            @pointerdown.prevent="moveStart"
        >
        <div class="ctrl">
            <!-- 缩小 -->
            <div @click="cfg.scale -= 0.1">
                <svg viewBox="0 0 16 16">
                    <path d="M8 0c-.176 0-.35.006-.523.017l.064.998a7.117 7.117 0 0 1 .918 0l.064-.998A8.113 8.113 0 0 0 8 0zM6.44.152c-.346.069-.684.16-1.012.27l.321.948c.287-.098.582-.177.884-.237L6.44.153zm4.132.271a7.946 7.946 0 0 0-1.011-.27l-.194.98c.302.06.597.14.884.237l.321-.947zm1.873.925a8 8 0 0 0-.906-.524l-.443.896c.275.136.54.29.793.459l.556-.831zM4.46.824c-.314.155-.616.33-.905.524l.556.83a7.07 7.07 0 0 1 .793-.458L4.46.824zM2.725 1.985c-.262.23-.51.478-.74.74l.752.66c.202-.23.418-.446.648-.648l-.66-.752zm11.29.74a8.058 8.058 0 0 0-.74-.74l-.66.752c.23.202.447.418.648.648l.752-.66zm1.161 1.735a7.98 7.98 0 0 0-.524-.905l-.83.556c.169.253.322.518.458.793l.896-.443zM1.348 3.555c-.194.289-.37.591-.524.906l.896.443c.136-.275.29-.54.459-.793l-.831-.556zM.423 5.428a7.945 7.945 0 0 0-.27 1.011l.98.194c.06-.302.14-.597.237-.884l-.947-.321zM15.848 6.44a7.943 7.943 0 0 0-.27-1.012l-.948.321c.098.287.177.582.237.884l.98-.194zM.017 7.477a8.113 8.113 0 0 0 0 1.046l.998-.064a7.117 7.117 0 0 1 0-.918l-.998-.064zM16 8a8.1 8.1 0 0 0-.017-.523l-.998.064a7.11 7.11 0 0 1 0 .918l.998.064A8.1 8.1 0 0 0 16 8zM.152 9.56c.069.346.16.684.27 1.012l.948-.321a6.944 6.944 0 0 1-.237-.884l-.98.194zm15.425 1.012c.112-.328.202-.666.27-1.011l-.98-.194c-.06.302-.14.597-.237.884l.947.321zM.824 11.54a8 8 0 0 0 .524.905l.83-.556a6.999 6.999 0 0 1-.458-.793l-.896.443zm13.828.905c.194-.289.37-.591.524-.906l-.896-.443c-.136.275-.29.54-.459.793l.831.556zm-12.667.83c.23.262.478.51.74.74l.66-.752a7.047 7.047 0 0 1-.648-.648l-.752.66zm11.29.74c.262-.23.51-.478.74-.74l-.752-.66c-.201.23-.418.447-.648.648l.66.752zm-1.735 1.161c.314-.155.616-.33.905-.524l-.556-.83a7.07 7.07 0 0 1-.793.458l.443.896zm-7.985-.524c.289.194.591.37.906.524l.443-.896a6.998 6.998 0 0 1-.793-.459l-.556.831zm1.873.925c.328.112.666.202 1.011.27l.194-.98a6.953 6.953 0 0 1-.884-.237l-.321.947zm4.132.271a7.944 7.944 0 0 0 1.012-.27l-.321-.948a6.954 6.954 0 0 1-.884.237l.194.98zm-2.083.135a8.1 8.1 0 0 0 1.046 0l-.064-.998a7.11 7.11 0 0 1-.918 0l-.064.998zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
                </svg>
            </div>
            <!-- 放大 -->
            <div @click="cfg.scale += 0.1">
                <svg viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
            </div>
            <!-- 上一个 -->
            <div @click="() => set(cfg.id - 1,cfg.imgs.length - 1)">
                <svg viewBox="0 0 16 16">
                    <path d="M10 12.796V3.204L4.519 8 10 12.796zm-.659.753-5.48-4.796a1 1 0 0 1 0-1.506l5.48-4.796A1 1 0 0 1 11 3.204v9.592a1 1 0 0 1-1.659.753z"/>
                </svg>
            </div>
            <!-- 下载 -->
            <a :href="cfg.imgs[cfg.id].url + '?download'" target="_blank" download>
                <svg viewBox="0 0 16 16">
                    <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"/>
                    <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z"/>
                </svg>
            </a>
            <!-- 下一个 -->
            <div @click="() => set(cfg.id + 1,0)">
                <svg viewBox="0 0 16 16">
                    <path d="M6 12.796V3.204L11.481 8 6 12.796zm.659.753 5.48-4.796a1 1 0 0 0 0-1.506L6.66 2.451C6.011 1.885 5 2.345 5 3.204v9.592a1 1 0 0 0 1.659.753z"/>
                </svg>
            </div>
            <!-- 旋转 -->
            <div @click="cfg.rotate += 90">
                <svg viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
            </div>
            <!-- 全屏 -->
            <div @click="fullScreen">
                <svg viewBox="0 0 16 16">
                    <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
                    <path d="M2 4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H3v2.5a.5.5 0 0 1-1 0v-3zm12 7a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H13V8.5a.5.5 0 0 1 1 0v3z"/>
                </svg>
            </div>
        </div>
        <span class="vcount">{{ cfg.id + 1 }} / <span style="color: darkgray;">{{ cfg.imgs.length }}</span></span>
    </div>
    <div v-show="cfg.loading" class="imager-async"></div>
</template>

<style lang="scss">
    .image-viewer{
        width: 100%;
        height: 100%;
        overflow: hidden;
        user-select: none;

        img{
            max-width: 100%;
            max-height: 100%;
            position: absolute;
            top: 50%;
            left: 50%;
            transition: all .2s;
        }

        .ctrl{
            display: flex;
            position: absolute;
            bottom: .5rem;
            gap: .5rem;
            left: 50%;
            transform: translateX(-50%);
            padding: .35rem;
            border-radius: .3rem;
            background-color: #f6f6f6;

            > *{
                display: block;
                color: rgba(57, 56, 56, 0.4);
                transition: all .2s;

                &:hover{
                    color: rgba(57, 56, 56);
                }

                > svg{
                    fill: currentColor;
                    display: block;
                    width: 1.25rem;
                    height: 1.25rem;
                }
            }
            
        }

        .vcount{
            position: absolute;
            top: .5rem;
            right: 1rem;
        }
    }

    @keyframes rotation {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .imager-async{
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        z-index: 1;

        &::after{
            content: '';
            width: 3rem;
            height: 3rem;
            border: .4rem solid;
            border-color: #90cf5b transparent;
            border-radius: 50%;
            -webkit-animation: rotation 1s linear infinite;
            animation: rotation 1s linear infinite;
        }
    }
</style>