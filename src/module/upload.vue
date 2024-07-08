<script setup lang="ts">
    import { DEFAULT_FILE_ICON, FS, reloadTree } from '@/utils';
    import { reactive, ref } from 'vue';

    import I_MEDIA from '/file/media.webp';
    import I_TEXT from '/file/text.webp';
    import I_IMAGE from '/file/image.webp';
    import I_3D from '/file/3d.webp';

    const S_ERROR = 0,
        S_SUCCESS = 1,
        S_PROGRESS = 2;

    interface UploadItem{
        name: string,
        mime: string,
        status: number,
        progress: number
    }

    const prop = defineProps(['option']),
        dir = prop['option'] as string,
        ev = defineEmits(['show','hide','close']),
        eque = reactive([] as Array<UploadItem>),
        mouse = reactive({
            'x': 0,
            'y': 0,
            'show': false
        });

    const drag = {
        start(e:DragEvent){
            mouse.show = true;
            mouse.x = e.clientX,
            mouse.y = e.clientY;
        },
        end(e:DragEvent){
            if(!e.dataTransfer?.files[0]) return;
            mouse.show = false;

            // 添加队列
            const file = e.dataTransfer.files[0],
                id = eque.push({
                    "mime": file.type,
                    "name": file.name,
                    "status": S_PROGRESS,
                    "progress": 0
                }) -1;

            // 开始上传
            FS.write(dir + file.name,file,prog => eque[id].progress = prog.loaded / prog.total * 100)
                .then(() => {eque[id].status = S_SUCCESS, eque[id].progress = 100, reloadTree([dir])})
                .catch(() => eque[id].status = S_ERROR);
        }
    }

    function getIcon(mime:string){
        return {
            'audio': I_MEDIA,
            'video': I_MEDIA,
            'font':  I_TEXT,
            'text':  I_TEXT,
            'image': I_IMAGE,
            'model': I_3D
        }[mime.split('/',2)[0]] || DEFAULT_FILE_ICON;
    }
</script>

<template>
    <div class="upload-wrapper" @dragover.prevent="drag.start" @drop.prevent="drag.end" @dragleave="mouse.show = false">
        <div class="container">
            <div v-for="item in eque">
                <img :src="getIcon(item.name)" :alt="item.mime">
                <span class="name">{{ item.name }}</span>
                <div :style="{
                    width: item.progress + '%',
                    backgroundColor: {[S_ERROR]: '#ffb5b5', [S_PROGRESS]: '#efefef', [S_SUCCESS]: '#d9f7de'}[item.status],
                    opacity: item.status == S_ERROR ? .6 : 1
                }"></div>
            </div>
            <div class="default" v-if="eque.length == 0">
                <svg viewBox="0 0 16 16">
                    <path d="M2.5 0c-.166 0-.33.016-.487.048l.194.98A1.51 1.51 0 0 1 2.5 1h.458V0H2.5zm2.292 0h-.917v1h.917V0zm1.833 0h-.917v1h.917V0zm1.833 0h-.916v1h.916V0zm1.834 0h-.917v1h.917V0zm1.833 0h-.917v1h.917V0zM13.5 0h-.458v1h.458c.1 0 .199.01.293.029l.194-.981A2.51 2.51 0 0 0 13.5 0zm2.079 1.11a2.511 2.511 0 0 0-.69-.689l-.556.831c.164.11.305.251.415.415l.83-.556zM1.11.421a2.511 2.511 0 0 0-.689.69l.831.556c.11-.164.251-.305.415-.415L1.11.422zM16 2.5c0-.166-.016-.33-.048-.487l-.98.194c.018.094.028.192.028.293v.458h1V2.5zM.048 2.013A2.51 2.51 0 0 0 0 2.5v.458h1V2.5c0-.1.01-.199.029-.293l-.981-.194zM0 3.875v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zM0 5.708v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zM0 7.542v.916h1v-.916H0zm15 .916h1v-.916h-1v.916zM0 9.375v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zm-16 .916v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zm-16 .917v.458c0 .166.016.33.048.487l.98-.194A1.51 1.51 0 0 1 1 13.5v-.458H0zm16 .458v-.458h-1v.458c0 .1-.01.199-.029.293l.981.194c.032-.158.048-.32.048-.487zM.421 14.89c.183.272.417.506.69.689l.556-.831a1.51 1.51 0 0 1-.415-.415l-.83.556zm14.469.689c.272-.183.506-.417.689-.69l-.831-.556c-.11.164-.251.305-.415.415l.556.83zm-12.877.373c.158.032.32.048.487.048h.458v-1H2.5c-.1 0-.199-.01-.293-.029l-.194.981zM13.5 16c.166 0 .33-.016.487-.048l-.194-.98A1.51 1.51 0 0 1 13.5 15h-.458v1h.458zm-9.625 0h.917v-1h-.917v1zm1.833 0h.917v-1h-.917v1zm1.834-1v1h.916v-1h-.916zm1.833 1h.917v-1h-.917v1zm1.833 0h.917v-1h-.917v1zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                </svg>
                <span>拖拽上传</span>
            </div>
        </div>
        <div class="preview" v-show="mouse.show" :style="{
            left: mouse.x + 'px',
            top: mouse.y + 'px'
        }">
            <svg viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
            </svg>
        </div>
    </div>
    
</template>

<style lang="scss">
    .upload-wrapper{
        width: 100%;
        height: 100%;
        background-color: rgb(69, 196, 221);

        > .container{
            max-width: 20rem;
            max-height: 20rem;
            width: 100%;
            height: 100%;
            border-radius: .4rem;
            background-color: white;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            overflow-y: auto;

            > div{
                display: flex;
                gap: .5rem;
                position: relative;
                align-items: center;
                height: 1.25rem;
                padding: .375rem;

                > img{
                    display: block;
                    width: 1.25rem;
                }

                > span{
                    display: block;
                    font-size: .8rem;
                    color: #a49e9e;
                    flex-grow: 1;
                }

                > div{
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    z-index: -1;
                }

                &.default{
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    flex-direction: column;
                    transform: translate(-50%, -50%);
                    width: unset;
                    height: unset;

                    > svg{
                        fill: rgb(114, 216, 59);
                        display: block;
                        width: 3rem;
                        height: 3rem;
                        margin: auto;
                    }

                    > span{
                        margin-top: .75rem;
                        width: 4.5rem;
                        word-break: break-all;
                        text-align: center;
                    }
                }
            }
        }
        
        > .preview{
            // background-color: white;
            // box-shadow: .35rem .45rem 2rem -.2rem #c4c4c4;
            transform: translate(-50%, -50%);
            font-size: .8rem;

            position: fixed;
            pointer-events: none;

            > svg{
                display: block;
                height: 2rem;
                width: 2rem;
                fill: rgb(45, 141, 201);
            }
        }
    }
</style>