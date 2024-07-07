<script setup lang="ts">
    import type { OpenerOption, vFile } from '@/data';
    import { Global, splitPath } from '@/utils';
    import { reactive, watch } from 'vue';
    import { OPENER } from '@/opener';

    const cfg = reactive({
        ext: '',
        display: false,
        opener: OPENER,
        selected: -1
    });

    let callback:undefined|Function;

    Global('opener.chooser.choose').data = function(file:vFile) {
        cfg.display = true;
        cfg.ext = splitPath(file)['ext'];
        return new Promise(rs => callback = rs);
    }
</script>

<template>
    <div :class="['opener-chooser',{display: cfg.display}]">
        <h3>你要如何打开 <b>{{ cfg.ext }}</b> ?</h3>
        <div class="list">
            <div v-for="(opener,i) in cfg.opener"
                @click.stop="cfg.selected = i" @dblclick="
                    () => {callback && callback(OPENER[cfg.selected]);cfg.display = false;}
                "
                :selected="i == cfg.selected"
            >
                <img :src="opener.icon || '/icon/app.webp'">
                <div>
                    <h4>{{ opener.name }}</h4>
                    <span >{{ opener.typeDesc }}</span>
                </div>
            </div>
        </div>
        <div class="btns" style="flex-direction: row-reverse;">
            <button @click="cfg.display = false;cfg.selected = -1;">取消</button>
            <button :disabled="-1 === cfg.selected" @click="callback && callback(OPENER[cfg.selected])">确定</button>
        </div>
    </div>
    <div class="opener-cover" @click="cfg.display = false" v-show="cfg.display"></div>
</template>

<style lang="scss">
    @import '../public/button.scss';

    .opener-chooser{
        position: fixed;
        top: -100vh;
        left: 50%;
        width: 40vw;
        max-width: 20rem;
        border-radius: .5rem;
        background-color: rgb(240 244 253 / 80%);
        overflow: hidden;
        z-index: 250;
        transform: translate(-50%,-50%);
        transition-timing-function: ease-out;
        opacity: 0;
        transition: opacity .2s,translate .35s;

        &.display{
            display: block;
            opacity: 1;
            top: 50vh;
            transition-timing-function: ease-in;
        }

        > h3{
            margin: 1.2rem 1rem .5rem 1rem;
            font-weight: 500;
        }

        .list{
            overflow-y: auto;
            overflow-x: hidden;
            max-height: 12rem;
            height: calc(100vh - 10rem);
            margin: .75rem;
            background-color: white;
            border-radius: .3rem;
        
            > div{
                padding: .45rem;
                border-radius: .3rem;
                transition: all .2s;
                display: flex;
                align-items: center;
                gap: .5rem;

                &:hover{
                    background-color: rgb(242 237 237);
                }

                &:active{
                    transform: scale(.95);
                }

                &[selected=true]{
                    background-color: rgb(221 225 237);
                }

                > img{
                    flex-shrink: 0;
                    height: 2rem;
                    width: 2rem;
                }

                > div{
                    > h4{
                        margin: .1rem;
                        font-size: .9rem;
                    }

                    > span{
                        color: rgb(134 131 131);
                        font-size: 0.75rem;
                    }
                }
            }
        }

        // 按钮组
        .btns{
            @include ui_btn-group($bg: #d6cece);
            background-color: #efefef;
            padding: 0.5rem 0.85rem;

            button{
                padding: .45rem;
                border: solid .1rem #dad7d7;
            }
        }
    }

    // 遮罩
	.opener-cover {
        content: '';
		position: fixed;
		inset: 0;
		background-color: rgba(210, 196, 196, 0.5);
		z-index: 200;
	}
</style>