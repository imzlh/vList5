<script lang="ts">
    import type { MenuItem } from '@/env';
    import { ref, watch, nextTick } from 'vue';

    const active = ref(-1);

    export default {
        name: 'ctxTree',
        setup(){
            return {active};
        },
        mounted() {
            watch(() => this.$props.display ,val => {

                // 非关闭模式
                if(!val)
                    return this.$el.style.display = 'none', active.value = -1;
                const el = this.$el as HTMLElement;

                // 清空样式
                el.style.height = 'auto',
                el.style.top = this.$props.y + 'px',
                el.style.left = this.$props.x + 'px',
                el.style.display = 'block';

                // 等待渲染，判断是否超出长度
                nextTick(() => {

                    const pos = el.getBoundingClientRect(),
                        sc_w = document.documentElement.clientWidth,
                        sc_h = document.documentElement.clientHeight;

                    // 超出底部
                    if(pos.bottom > sc_h)
                        if(pos.height > sc_h)
                            el.style.top = '0', el.style.height = sc_h - pos.height + 'px';
                        else
                            el.style.top = this.y - (pos.bottom - sc_h) - 10 + 'px', el.style.height = 'auto';

                    // 超出宽度
                    if(pos.right > sc_w)
                        el.style.left = this.x - (pos.right - sc_w) - 10 + 'px',
                        el.style.right = '0';
                });
            });
        },
        emits: ['blur'],
        props:{
            'data':{
                type: Object,
                required: true
            },'display':{
                type: Boolean,
                required: true
            }, 'x':{
                type: Number,
                required: true
            }, 'y':{
                type: Number,
                required: true
            }
        },
        methods:{
            enter(){
                // timer = setTimeout(() => (active.value = true,timer = undefined),1*1000);
            },
            leave(){
                // if(timer) clearTimeout(timer);
            },
            clickMe(item:MenuItem,event:MouseEvent){
                if(item.child) return;
                if(item.handle) item.handle(event);
                this.$emit('blur',item);
            }
        }
    }
</script>
<template>
    <div class="ctx-menu">
        <template v-for="(item,i) in (data as Array<MenuItem>)">
            <span v-if="typeof item == 'string'"></span>
            <div tabindex="-1" v-else-if="item.text"
                @mouseenter="enter" @mouseleave="leave"
                @click="active = i;clickMe(item,$event);"
            >
                <img :src="item.icon" v-if="item.icon" class="icon">
                <span class="icon" v-else></span>

                <span class="text">{{ item.text }}</span>

                <span class="kbd" v-if="item.kbd">
                    {{ item.kbd.shift ? 'Shift + ' : '' }}
                    {{ item.kbd.ctrl ? 'Ctrl + ' : '' }}
                    {{ item.kbd.key }}
                </span>

                <ctxTree
                    v-if="item.child" :data="item.child" :x="10" :y="0"
                    class="child" :display="active == i" @click.stop
                    @blur="active = -1;$emit('blur')"
                    style="position: absolute;transform: translateX(100%)"
                ></ctxTree>
            </div>
            <ul v-else>
                <li v-for="child of item.child" :style="{backgroundImage: `url('${child.icon}')`}"></li>
            </ul>
        </template>

    </div>
</template>
<style lang="scss">
    .ctx-menu{
        display: none;
        font-size: .85rem;
        z-index: 58;
        user-select: none;
        position: fixed;

        padding: .125em 0;
        border-radius: .25em;
        box-shadow: 0.1em 0.2em 0.5em rgb(83, 77, 77, .45);
        background-color: rgba(255, 255, 255, .6);
        backdrop-filter: blur(1rem);
        width: 12rem;

        >div {
            padding: 0.375em;
            font-weight: normal;
            border-radius: 0.2em;
            margin: 0.125em 0.25em;
            position: relative;

            display: flex;
            align-items: center;

            cursor: pointer;

            transition: all .2s;

            >.icon {
                width: 1.25em;
                height: 1.25em;
                margin: 0 .5em;
                flex-shrink: 0;
            }

            >.text {
                text-overflow: clip;
                text-align: start;

                flex-grow: 1;
                line-height: 1.25em;
                min-width: 8em;
            }

            > .keyboard {
                min-width: 5em;
                font-size: .8em;
                font-weight: 400;
                color: rgb(126, 118, 118);
                overflow: hidden;
            }

            >.child{
                transform: translateX(100%);
            }

            &:hover,&:focus{
                background-color: rgba(201, 199, 199, 0.5);
            }

            &:focus >.child{
                display: block;
            }
        }

        >span{
            margin: .25rem;
            height: .1rem;
            display: block;
            background-color: rgba(206, 191, 191, 0.2);
        }

        > ul{
            list-style: none;
            margin: 0;
            padding: .25rem .5rem;

            display: flex;
            gap: .2rem;

            > li{
                width: 2rem;
                height: 2rem;
                border-radius: .25rem;
                flex-shrink: 0;

                background-size: 1.25rem 1.25rem;
                background-position: center;
                background-repeat: no-repeat;

                position: static !important;
                &:hover{
                    background-color: rgb(117 109 109 / 20%);
                }
            }
        }
    }
</style>
