<script setup lang="ts">
    import { reactive } from 'vue';
    import { FS } from '@/utils';

    import type { vDir, vFile } from '@/env';
    import { getIcon } from '@/utils';

    const prop = defineProps(['option']),
        dir = prop['option'] as vDir,
        eque = reactive([] as Array<vFile>),
        mouse = reactive({
            'x': 0,
            'y': 0,
            'show': false
        }),
        event = defineEmits(['show', 'hide', 'close', 'select', 'upload', 'create']);

    if(!dir)
        throw new TypeError('Dir not defined');

    const drag = {
        start(e:DragEvent){
            mouse.show = true;
            mouse.x = e.clientX,
            mouse.y = e.clientY;
        },
        async end(e:DragEvent){
            if(!e.dataTransfer?.files.length) return;
            mouse.show = false;

            FS.upload(e, dir, {
                created: obj => eque.push(obj)
            });
        }
    }
</script>

<template>
    <div class="upload-wrapper" @dragover.prevent="drag.start" @drop.prevent="drag.end" @dragleave="mouse.show = false">
        <div class="container" @click="FS.upload(null, dir, { created: obj => eque.push(obj) })">
            <div v-for="item in eque" @click.stop="event('select', item.path)">
                <img :src="getIcon(item.name)" :alt="item.icon">
                <span class="name">{{ item.name }}</span>
                <div :style="{
                    width: (item.upload || 100) + '%',
                    backgroundColor: item.upload == undefined ? '#d9f7de' : '#efefef'
                }"></div>
            </div>
            <div class="default" v-if="eque.length == 0" vs-icon="upload" v-colorscale="[114, 216, 59]">
                <span>拖拽或点击选取上传</span>
            </div>
        </div>

        <!-- 右下侧小工具 -->
        <div class="tools">
            <!-- 清空 -->
            <div @click="eque.splice(0, eque.length)" vs-icon="minus" button />

            <!-- 添加上传文件 -->
            <div @click="FS.upload(null, dir, { created: obj => eque.push(obj) })" button vs-icon="plus" />
        </div>

        <div class="preview" v-show="mouse.show" :style="{
            left: mouse.x + 'px',
            top: mouse.y + 'px'
        }" vs-icon="plus" />
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
                    display: -webkit-box;
                    line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
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

                    &::before{
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

        > .tools{
            position: absolute;
            bottom: 5%;
            right: 5%;
            display: flex;
            flex-direction: column;
            gap: .15rem;
            padding: .15rem;
            background-color: white;
            border-radius: .4rem;
            border: solid .1rem rgb(212, 212, 212);
            z-index: 10;
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
