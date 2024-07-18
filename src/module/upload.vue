<script setup lang="ts">
    import { reactive } from 'vue';
    import { upload, type iFile } from '@/utils';

    import type { vDir } from '@/env';
    import { getIcon } from '@/script/icon';

    const prop = defineProps(['option']),
        dir = prop['option'] as vDir,
        eque = reactive([] as Array<iFile>),
        mouse = reactive({
            'x': 0,
            'y': 0,
            'show': false
        }),
        event = defineEmits(['show', 'hide', 'close', 'select', 'upload', 'create']);

    const drag = {
        start(e:DragEvent){
            mouse.show = true;
            mouse.x = e.clientX,
            mouse.y = e.clientY;
        },
        async end(e:DragEvent){
            if(!e.dataTransfer?.files.length) return;
            mouse.show = false;

            upload(e, dir, obj => eque.push(obj));
        }
    }
</script>

<template>
    <div class="upload-wrapper" @dragover.prevent="drag.start" @drop.prevent="drag.end" @dragleave="mouse.show = false">
        <div class="container" @click="upload(true, dir)">
            <div v-for="item in eque" @click.stop="event('select', dir + '/' + item.name)">
                <img :src="getIcon(item.name)" :alt="item.icon">
                <span class="name">{{ item.name }}</span>
                <div :style="{
                    width: (item.status || 100) + '%',
                    backgroundColor: item.status == undefined ? '#d9f7de' : '#efefef'
                }"></div>
            </div>
            <div class="default" v-if="eque.length == 0">
                <svg viewBox="0 0 16 16">
                    <path d="M2.5 0c-.166 0-.33.016-.487.048l.194.98A1.51 1.51 0 0 1 2.5 1h.458V0H2.5zm2.292 0h-.917v1h.917V0zm1.833 0h-.917v1h.917V0zm1.833 0h-.916v1h.916V0zm1.834 0h-.917v1h.917V0zm1.833 0h-.917v1h.917V0zM13.5 0h-.458v1h.458c.1 0 .199.01.293.029l.194-.981A2.51 2.51 0 0 0 13.5 0zm2.079 1.11a2.511 2.511 0 0 0-.69-.689l-.556.831c.164.11.305.251.415.415l.83-.556zM1.11.421a2.511 2.511 0 0 0-.689.69l.831.556c.11-.164.251-.305.415-.415L1.11.422zM16 2.5c0-.166-.016-.33-.048-.487l-.98.194c.018.094.028.192.028.293v.458h1V2.5zM.048 2.013A2.51 2.51 0 0 0 0 2.5v.458h1V2.5c0-.1.01-.199.029-.293l-.981-.194zM0 3.875v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zM0 5.708v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zM0 7.542v.916h1v-.916H0zm15 .916h1v-.916h-1v.916zM0 9.375v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zm-16 .916v.917h1v-.917H0zm16 .917v-.917h-1v.917h1zm-16 .917v.458c0 .166.016.33.048.487l.98-.194A1.51 1.51 0 0 1 1 13.5v-.458H0zm16 .458v-.458h-1v.458c0 .1-.01.199-.029.293l.981.194c.032-.158.048-.32.048-.487zM.421 14.89c.183.272.417.506.69.689l.556-.831a1.51 1.51 0 0 1-.415-.415l-.83.556zm14.469.689c.272-.183.506-.417.689-.69l-.831-.556c-.11.164-.251.305-.415.415l.556.83zm-12.877.373c.158.032.32.048.487.048h.458v-1H2.5c-.1 0-.199-.01-.293-.029l-.194.981zM13.5 16c.166 0 .33-.016.487-.048l-.194-.98A1.51 1.51 0 0 1 13.5 15h-.458v1h.458zm-9.625 0h.917v-1h-.917v1zm1.833 0h.917v-1h-.917v1zm1.834-1v1h.916v-1h-.916zm1.833 1h.917v-1h-.917v1zm1.833 0h.917v-1h-.917v1zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                </svg>
                <span>拖拽或点击选取上传</span>
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

            z-index: 20;

            > svg{
                display: block;
                height: 2rem;
                width: 2rem;
                fill: rgb(45, 141, 201);
            }
        }
    }
</style>
