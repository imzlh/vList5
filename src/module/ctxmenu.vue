<script lang="ts">
    import type { MenuItem } from '@/data';
    import { ref, watch, nextTick } from 'vue';

    const active = ref(-1);
    let timer:number | undefined;

    export default {
        name: 'ctxTree',
        setup(){
            return {active};
        },
        mounted() {
            watch(() => this.$props['display'],val => {
                if(!val) return this.active = -1;
                this.$el.style.transform = '';
                // 超出长度
                nextTick(() => {
                    if(this.$props.x + this.$el.offsetWidth > document.documentElement.clientWidth)
                        this.$el.style.transform += 'translateX(-100%)';
                    if(this.$props.y + this.$el.offsetHeight > document.documentElement.clientHeight)
                        this.$el.style.transform += 'translateY(-100%)';
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
    <div class="ctx-menu" :style="{
        display: display ? 'block' : 'none',
        position: 'fixed',
        left: x + 'px',
        top: y + 'px'
    }">
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
                    v-if="item.child" :data="item.child" :x="0" :y="0"
                    class="child"  :display="active == i" @click.stop
                    @blur="active = -1;$emit('blur')"
                ></ctxTree>
            </div>
            <ul v-else>
                <li v-for="child of item.child" :style="{backgroundImage: `url('${child.icon}')`}"></li>
            </ul>
        </template>
        
    </div>
</template>
<style lang="scss">
    @import '../public/menu.scss';
    @import '../public/button.scss';

    .ctx-menu{
        @include ui_menu();
        font-size: .85rem;
        z-index: 120;
        user-select: none;

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