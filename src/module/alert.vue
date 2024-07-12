<script setup lang="ts">
    import { Global } from '@/utils';
    import type { AlertOpts } from '@/env';
    import { ref, shallowRef } from 'vue';

    const item = shallowRef<AlertOpts>(),
        dataref = ref();

    function call(role: string) {
        if (role == 'close') item.value = undefined;
        else if (role == 'submit') item.value?.callback(dataref.value), item.value = undefined;
    }

    Global('ui.alert').data = (d: AlertOpts) => {
        item.value = d; dataref.value = '';
    };
</script>

<template>
    <div :type="item.type" class="sys-alert" v-if="item">
        <div class="basic">
            <h3 v-if="item.title">{{ item.title }}</h3>
            <span>{{ item.message }}</span>

            <input type="text" v-model="dataref" v-if="item.type == 'prompt'">
        </div>
        <div class="btns">
            <div style="flex-grow: 1;"></div>
            <template v-if="item.button">
                <button v-for="btn in item.button" :style="{ backgroundColor: btn.color }"
                    @click="call(btn.role);btn.click && btn.click(dataref)">
                    {{ btn.content }}
                </button>
            </template>
            <template v-else>
                <button style="background-color: #e5e5e5"
                    @click="item.type == 'confirm' && item.callback(dataref = false);item = undefined">
                    取消
                </button>
                <button style="color: white;" @click="item.type == 'confirm' && (dataref = false); item.callback(dataref); item = undefined;
                ">
                    确定
                </button>
            </template>
        </div>
    </div>
</template>

<style lang="scss">
    @import '../public/button.scss';

    @keyframes fadein {
        from {
            transform: rotateX(90deg) translateY(-50%);
            opacity: 0;
        }

        to {
            transform: rotateX(0deg) translateY(0);
            opacity: 1;
        }
    }

    .sys-alert {
        position: fixed;
        top: 2rem;
        left: 0;
        right: 0;
        margin: auto;
        width: 100vw;
        max-width: 23rem;
        z-index: 120;
        box-sizing: border-box;
        border: solid .05rem #e7e7e7;
        border-radius: 0.35rem;
        border-width: 0.1rem;
        background-color: white;
        overflow: hidden;
        transition: all 0.2s;
        animation: fadein 0.5s;

        &:hover {
            background-color: white;
        }

        .basic {
            padding: 1.25rem 1.5rem;
            font-size: .85rem;

            h3 {
                margin: 0;
                color: #353333;
                font-size: 1.1rem;
                margin-bottom: .8rem;
                font-weight: 400;
            }

            span {
                margin: .5rem 0;
                display: block;
                color: #8e8888;
                word-break: break-all;
                white-space: pre-wrap;
            }

            input {
                border: none;
                outline: none;
                border-bottom: solid .1rem #7bc8cf;
                background-color: transparent;
                display: block;
                width: 100%;
                box-sizing: border-box;
                padding: .35rem .5rem;
            }
        }

        .btns {
            background-color: rgb(249 249 249);
            @include ui_btn-group();
            padding: 0.75rem 1rem;

            button {
                background-color: rgb(139 191 234);
                padding: 0.5rem 1.25rem;
                margin: 0 .25rem;
                font-size: .8rem;
                flex-shrink: 0;
                cursor: pointer;
            }
        }
    }
</style>