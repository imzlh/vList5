<script lang="ts" setup>
    import type { vFile } from '@/env';
    import { message } from '@/utils';
    import PSD from './psd/psd';
    import { onMounted, ref } from 'vue';
    import I_PS from '/app/ps.webp';

    const mgr = ref<HTMLUListElement>(),
        canvas = ref<HTMLCanvasElement>(),
        _prop = defineProps(['option']),
        file = _prop.option as vFile;

    try{
        var psd = await PSD.create(file);
    }catch{
        message({
            "type": "error",
            "title": "PhotoShop Viewer",
            "icon": I_PS,
            "content": {
                "title": "打开失败",
                "content": "请检查文件是否损坏或未打开最大兼容模式"
            }
        })
    }

    onMounted(() =>
        psd.render(mgr.value!, canvas.value!)
    )
</script>

<template>
    <div class="psd-container">
        <canvas ref="canvas"></canvas>
        <div class="float" v-drag>
            <header class="drag">图层</header>
            <ul ref="mgr"></ul>
        </div>
    </div>
</template>

<style lang="scss" >
    .psd-container {
        height: 100%;
        background-color: #5c5c5c;

        > canvas{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border: solid .1rem gray;

            max-width: 95%;
            max-height: 95%;
            object-fit: scale-down;
        }

        > .float{
            position: absolute;
            width: 10rem;
            background-color: #6d6b6b;
            border-radius: .35rem;
            font-size: .8rem;
            overflow: hidden;
            resize: both;
            color: white;
            line-height: 1.2rem;

            bottom: 2rem;
            right: 2rem;

            height: 10rem;

            > header{
                display: block;
                font-size: .9rem;
                background-color: rgb(80, 82, 104);
                padding: .35rem .75rem;

                user-select: none;
                position: sticky;
                top: 0;
                z-index: 1;
            }

            ul{
                padding: 0;

                > li{
                    list-style: none;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                > li:not(:first-child){
                    margin-left: .75rem;
                }
            }

            input{
                appearance: none;
                width: 1em;
                height: 1em;
                transform: translateY(5%);
                margin: 0 .25rem;
                content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>');

                &:checked{
                    content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>');
                }
            }

            > ul{
                padding: 0 .35rem;
                height: calc(100% - 3rem);
                overflow-y: auto;
            }
        }
    }
</style>