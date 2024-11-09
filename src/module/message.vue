<script lang="ts">
    import type { MessageOpinion } from '@/env';
    import { nextTick, reactive } from 'vue';

    const message = reactive<Array<MessageOpinion & { uuid: string }>>([]);

    export function create(msg: MessageOpinion) {
        const i = message.push({
            ...msg,
            uuid: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36)
        }) - 1;
        if (msg.timeout) setTimeout(() => message.splice(i, 1), msg.timeout * 1000);
        return i;
    }
    export function remove(i: number) {
        message[i].hidden = true;
        nextTick(() => setTimeout(() => message.splice(i, 1), 200));
    }
</script>

<script lang="ts" setup>
    const msg_destroy = remove;
</script>

<template>
    <div class="messages">
        <!-- 消息列表 -->
        <template v-for="(item, i) of message" :key="item.uuid">
            <div v-if="item" class="msg" :data-active="item.hidden ? null : ''" @click.stop>
                <header v-if="item.title">
                    <img v-if="item.icon" :src="item.icon">
                    <span>{{ item.title }}</span>
                    <i class="close" @click="msg_destroy(i)" vs-icon="x"></i>
                </header>
                <template v-if="item.content">
                    <div class="body" :data-level="item.type">
                        <div>
                            <h3>{{ item.content.title }}</h3>
                            <span v-html="item.content.content" />
                        </div>
                    </div>
                </template>
                <component v-else-if="item.body" :is="item.body" :title="item.title" :icon="item.icon" @click="item.handle"
                    @destroy="message.splice(i, 1)"></component>
            </div>
        </template>
    </div>
</template>

<style lang="scss">
    @import '@/style/icon.scss';

    .messages {
        // overflow: hidden;
        transform: none;
        width: 20rem;

        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 25;

        @keyframes pushin {
            from{
                transform: translateX(-150%);
            }to{
                transform: 0;
            }
        }

        .msg {
            background-color: rgba(219, 224, 233, 0.9);
            border: solid 0.05rem #c5c2c2;
            border-radius: .5em;
            text-align: start;
            margin: 1em 0 !important;
            animation: msg_fadein .35s;
            gap: 0;
            transition: all .2s;

            &:active{
                transform: scale(.9);
            }

            >header {
                display: flex;
                height: 1.5em;
                gap: .3em;
                line-height: 1.5em;
                padding: .25rem .75rem;
                color: #7c7a7a;
                font-size: .8rem;

                .close {
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
                        font-size: .8rem;
                        color: #575252;
                    }

                    > h3 {
                        margin: 0;
                        line-height: 1.5rem;
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
