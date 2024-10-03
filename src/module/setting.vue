<script setup lang="ts">
    import type { SettingObject } from '@/utils/config';
    import type { SettingItem } from '@/env';
    import { shallowRef, type Ref } from 'vue';

    const props = defineProps(['option']),
        item = props['option'] as SettingObject,
        items = shallowRef<Array<SettingItem>>(item.child),
        path = shallowRef<Array<SettingObject>>([item]);

    function click(el: PointerEvent, step = -1, refl: Ref<number>){
        const target = el.target as HTMLElement;
        if(typeof refl.value != 'number') refl.value = 0;

        let timer: number|undefined|NodeJS.Timeout = setTimeout(function(){
            timer = undefined;
            interval = setInterval(() => refl.value += step,100);
        }, 500),interval: undefined | number | NodeJS.Timeout;

        document.documentElement.addEventListener('pointerup',function(){
            interval ? clearInterval(interval) : refl.value += step;
            timer && clearTimeout(timer);
        },{
            "once": true,
            "passive": true
        });
    }
</script>

<template>
    <div class="setting-container">
        <div class="nav">
            <template v-for="(nav,i) in path">
                <div v-if="i == path.length -1">
                    {{ nav.name }}
                </div>
                <div v-else class="navitem" @click="items = nav.child,path = path.slice(0,i +1)">
                    {{ nav.name }}
                </div>
            </template>
        </div>
        <div class="main">
            <template v-for="item in items">
                <h1 v-if="typeof item == 'string'">
                    {{ item }}
                </h1>
                <div v-else @click="item.type == 'object' ? (items = item.child, path.push(item)) : null">
                    <div class="left">
                        <div>{{ item.name }}</div>
                        <span v-if="item.desc">{{ item.desc }}</span>
                    </div>

                    <input v-if="item.type == 'text'" v-model="item.value.value" class="right input" type="text">

                    <div v-else-if="item.type == 'number'" class="right numinput">
                        <div vs-icon="minus" button class="minus" @pointerdown="click($event, -item.step, item.value)"></div>
                        <div class="real">{{ item.value.value }}</div>
                        <div vs-icon="plus" button class="add" @pointerdown="click($event, item.step, item.value)"></div>
                    </div>

                    <input v-else-if="item.type == 'check'" class="right check" type="checkbox"
                        v-model="item.value.value"
                    />

                    <input type="range" class="right range" v-else-if="item.type == 'range'"
                        v-model="item.value.value" :title="item.value.value.toString()"
                        :min="item.min" :max="item.max" :step="item.step"
                    >

                    <div v-else-if="item.type == 'object'" vs-icon="right" class="goto right"></div>

                    <div v-else class="right choose">
                        <div tabindex="-1">
                            <div v-for="choose in item.item"
                                @click="item.value.value = choose.value" :active="item.value.value == choose.value"
                            >
                                {{ choose.display }}
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<style lang="scss">
    @import '@/style/icon.scss';
    @import '@/style/input.scss';

    .setting-container {
        position: relative;
        height: 100%;
        height: 100%;
        box-sizing: border-box;
        background-color: rgb(239, 244, 249);
        overflow-y: auto;
        overflow-x: hidden;
        user-select: none;

        .nav {
            position: absolute;
            top: 0;left: 0;
            padding: 1.5rem .75rem .5rem .75rem;
            background-color: rgb(243, 243, 243);
            font-size: 1.2rem;
            display: flex;
            width: 100%;

            >.navitem {
                color: rgb(106, 100, 100);
                cursor: pointer;

                &::after {
                    content: $icon_right;
                    display: inline-block;
                    height: .8rem;
                    width: .8rem;
                    margin: 0 .75rem;
                    opacity: .6;
                }
            }
        }

        > .main{
            padding: .5rem 2rem;
            padding-top: 5rem;

            > h1{
                margin: .5rem 0;
                font-size: 1.5rem;
                font-weight: 500;
                margin-left: .5rem;
                color: #464849;
            }

            >div {
                margin-bottom: 1rem;
                border: solid .1rem #e1dcdc;
                padding: 1rem;
                display: flex;
                gap: 1rem;
                background-color: rgb(251 250 255);
                border-radius: .35rem;
                align-items: center;

                >.left {
                    flex-grow: 1;

                    >div {
                        font-size: .95rem;
                    }

                    >span {
                        font-size: .75rem;
                        color: rgb(163, 159, 159);
                    }
                }

                >.right {
                    flex-grow: 1;

                    &.input, &.choose {
                        min-width: 10rem;

                        @include v-winui-input();
                    }

                    &.choose {
                        padding: .1rem;
                        position: relative;
                        min-width: 12rem;
                        flex-grow: 0;
                        height: 1.9rem;
                        box-sizing: border-box;

                        // 包装div
                        >div {

                            >* {
                                padding: .35rem .55rem;
                                position: relative;
                                line-height: 1rem;
                                font-size: .8rem;

                                display: none;

                                &[active=true] {
                                    display: block;
                                }
                            }

                            &:focus {
                                position: absolute;
                                left: 0;
                                background-color: white;
                                top: 50%;
                                transform: translateY(-50%);
                                width: 100%;
                                z-index: 1;
                                padding: .35rem;
                                border-radius: 0.4rem;
                                box-shadow: .2rem .1rem 0.8rem rgb(218 218 218);

                                >div:not(:last-child) {
                                    margin-bottom: .25rem;
                                }

                                >* {
                                    display: block !important;
                                    border-radius: .3rem;

                                    &[active=true] {
                                        background-color: rgb(241 241 241);

                                        @keyframes select_in {
                                            from{
                                                height: 0;
                                                opacity: 0;
                                            }to{
                                                height: 1.25em;
                                                opacity: 1;
                                            }
                                        }

                                        &::before {
                                            content: '';
                                            position: absolute;
                                            left: 0;
                                            top: 50%;
                                            height: 1.25em;
                                            width: .25em;
                                            border-radius: .15em;
                                            background-color: #49a4f5;
                                            transform: translateY(-50%);
                                            animation: select_in .1s;
                                        }
                                    }

                                    &:hover {
                                        background-color: rgb(243, 242, 242);
                                    }
                                }
                            }
                        }
                    }

                    &.numinput {
                        display: flex;
                        align-items: center;
                        gap: .45rem;
                        background-color: white;
                        border: solid .1rem #e2dfdf;
                        border-radius: .35rem;
                        flex-grow: 0;
                        padding: .15rem .3rem;

                        >.real {
                            font-size: .85rem;
                        }
                    }

                    &.goto {
                        width: .8rem;
                        height: .8rem;
                        flex-grow: 0;
                    }

                    &.range {
                        flex-grow: 9;
                        @include v-winui-range();
                    }

                    &.check{
                        flex-grow: 0;
                        @include v-checkbox();
                    }
                }
            }
        }
    }
</style>
