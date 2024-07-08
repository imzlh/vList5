<script setup lang="ts">
    import { Global } from '@/utils';
    import type { AlertOpts } from '@/env';
    import { ref } from 'vue';

    const item = ref<AlertOpts>(),
        dataref = ref();

    function call(role: string | Function) {
        if (role == 'close') item.value = undefined;
        else if (role == 'submit') item.value?.callback(dataref.value);
        else (role as Function)(dataref.value);
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
                <button v-for="btn in item.button" :style="{ color: btn.color }" @click="call(btn.role)">
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
        position: absolute;
        top: 1rem;
        left: 0;
        right: 0;
        margin: auto;
        width: 100vw;
        max-width: 23rem;
        z-index: 120;
        box-sizing: border-box;
        box-shadow: .35rem .15rem 1rem .25rem rgba(198, 193, 193, 0.87);
        border-radius: .35rem;
        border-width: .1rem;
        border-color: #969696;
        background-color: rgba(255, 255, 255, 0.8);
        overflow: hidden;
        transition: all .2s;
        animation: fadein .5s;

        &:hover {
            background-color: white;
        }

        .basic {
            padding: 1rem;
            font-size: .85rem;

            h3 {
                margin: 0;
                color: #353333;
                font-weight: 500;
                font-size: 1rem;
            }

            span {
                margin: .5rem 0;
                display: block;
                color: #8e8888;
                word-break: break-all;
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
            background-color: rgb(247 247 247);
            @include ui_btn-group();

            button {
                background-color: rgb(139 191 234);
                padding: .35rem 1rem;
                margin: 0 .25rem;
                font-size: .8rem;
                flex-shrink: 0;
                cursor: pointer;
            }
        }
    }
</style>