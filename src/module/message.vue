<script setup lang="ts">
    import type { MessageOpinion } from '@/env';
    import { Global } from '@/utils';
    import { nextTick, reactive } from 'vue';

    const message = reactive<Array<MessageOpinion>>([]);

    function postMessage(msg: MessageOpinion) {
        const i = message.push(msg) - 1;
        if (msg.timeout) setTimeout(() => delete message[i], msg.timeout * 1000);
    }
    function msg_destroy(i: number) {
        message[i].hidden = true;
        nextTick(() => setTimeout(() => delete message[i], 200));
    }

    Global('ui.message').data = postMessage;
</script>

<template>
    <div class="messages">
        <!-- 消息列表 -->
        <template v-for="(item, i) of message" :key="i">
            <div v-if="item" class="msg" :data-active="item.hidden ? null : ''" @click.stop>
                <header v-if="item.title">
                    <img v-if="item.icon" :src="item.icon">
                    <span>{{ item.title }}</span>
                    <i class="close" @click="msg_destroy(i)"></i>
                </header>
                <template v-if="item.content">
                    <div class="body" :data-level="item.type">
                        <div>
                            <h3>{{ item.content.title }}</h3>
                            <span>{{ item.content.content }}</span>
                        </div>
                    </div>
                </template>
                <component v-else-if="item.body" :is="item.body" :title="item.title" :icon="item.icon" @click="item.handle"
                    @destroy="delete message[i]"></component>
            </div>
        </template>
    </div>
</template>

<style lang="scss">
    @import '../public/icon.scss';

    .messages {
        // overflow: hidden;
        transform: none;
        width: 20rem;

        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 100;

        .msg {
            background-color: rgba(219, 224, 233, 0.9);
            border: solid 0.05rem #c5c2c2;
            border-radius: .5em;
            text-align: start;
            margin: 1em 0 !important;
            animation: msg_fadein .35s;
            gap: 0;

            >header {
                display: flex;
                height: 1.5em;
                gap: .75em;
                line-height: 1.5em;
                padding: .25rem .75rem;
                color: #7c7a7a;
                font-size: .8rem;

                .close {
                    content: $icon_right;
                    opacity: .2;
                    width: 1.2em;

                    &:hover {
                        opacity: .8;
                    }
                }

                span {
                    flex-grow: 1;
                }

                * {
                    flex-shrink: 0;
                }
            }

            >.body {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: .5rem 1rem 1rem 1rem;
                
                &[data-level]{
                    position: relative;

                    &::before{
                        content: '';

                        background-image: url('/icon/question.webp');
                        background-repeat: no-repeat;
                        background-size: cover;
                        width: 3rem;
                        height: 3rem;
                    }

                }
                &[data-level=info]::before{
                    background-image: url('/icon/info.webp');
                }

                &[data-level=warn]::before{
                    background-image: url('/icon/warning.webp');
                }

                &[data-level=error]::before{
                    background-image: url('/icon/error.webp');
                }

                &::before{
                    flex-shrink: 0;
                }

                > div{
                    flex-grow: 1;

                    > span {
                        line-height: 1rem;
                        font-size: .85rem;
                        color: #575252;
                    }

                    > h3 {
                        margin: 0;
                        line-height: 1.2rem;
                        font-size: 1rem;
                    }
                }
            }
        }

        >div {
            transition: all 0.2s;
            white-space: pre-wrap;

            &:not([data-active]) {
                transform: translateX(120%);
                margin-top: -100%
            }
        }
    }
</style>