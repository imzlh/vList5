<script setup lang="ts">
    import type { FileOrDir } from '@/env';
    import { FS, Global, type iMixed } from '@/utils';
    import { ref, shallowRef, watch } from 'vue';
    import List from './list.vue';

    const display = ref(false),
        history = ref([] as Array<string>),
        data = shallowRef<Array<FileOrDir>>([]),
        current = ref(-1),
        showPath = ref(false),
        path = ref('');

    let exports = [] as Array<FileOrDir>;

    let resolver:undefined|Function;

    Global('ui.choose').data = (f:string) => new Promise(function(rs){
        history.value = [f],current.value = 0,display.value = true;
        resolver = rs;
    });

    async function switchTo(dir:string){
        data.value = await FS.listall(dir);
        current.value = history.value.push(dir) -1;
    }

    function dirBack(){
        let dir = history.value[current.value];
        if(!dir) return;
        if(dir[dir.length-1] == '/') dir = dir.substring(0,dir.length-1);

        const pos = dir.lastIndexOf('/');
        // 没有上一级
        if(pos == -1) return false;
        // 切换
        return switchTo(dir.substring(0,pos));
    }

    function getPath(){
        let prefix = '/';
        return ([{path: '/', name: '根目录'}] as Array<any>).concat(path.value.split('/').map(item => item ? {
            path: prefix += item + '/',
            name: item
        } : null));
    }

    function submit(){
        resolver && resolver(exports);
        resolver = undefined;display.value = false;
    }

    watch(current,() => history.value[current.value] &&
        FS.listall(history.value[current.value]).then(list => data.value = list)
    );
    watch(current, () => path.value = history.value[current.value] || '/');
</script>

<template>
    <div class="widget-chooser" v-show="display">
        <div class="head">
            <div class="flex">
                <!-- 上一页 -->
                <div class="icon" data-action="history-back" :disabled="current == 0" @click="current --">
                    <svg viewBox="0 0 448 512">
                        <path fill="currentColor"
                            d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z">
                        </path>
                    </svg>
                </div>
                <!-- 下一页 -->
                <div class="icon" data-action="history-resume" :disabled="current == history.length -1" @click="current ++">
                    <svg viewBox="0 0 448 512">
                        <path fill="currentColor"
                            d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z">
                        </path>
                    </svg>
                </div>
                <!-- 文件夹返回 -->
                <div class="icon" data-action="file-back" @click="dirBack">
                    <svg viewBox="0 0 384 512">
                        <path fill="currentColor"
                            d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z">
                        </path>
                    </svg>
                </div>
                <div class="title">
                    选择文件
                </div>
                <!-- 按钮 -->
                <button class="non-fill" @click="display = false">取消</button>
                <button class="fill" @click="submit">确定</button>
            </div>
            <!-- 路径 -->
            <div class="path">
                <!-- 路径输入 -->
                <input type="text" v-if="showPath" :value="path" >
                <!-- 路径分层 -->
                <div class="bread" v-else
                    @click="showPath = true" @blur="showPath = false"
                    tabindex="-11"
                >
                    <template v-for="item of getPath()">
                        <div @click.stop="switchTo(item.path)" v-if="item">
                            {{ item.name }}
                        </div>
                    </template>
                </div>
            </div>
        </div>
        <!-- 列表 -->
        <List :list="data" style="padding-top: 3.5rem;"
            @open="(file:FileOrDir) => file.type == 'dir' ? switchTo(file.path) : null"
            @select="(data :iMixed) => exports.push(data)" @clear="() => exports = []"
        ></List>
    </div>
</template>

<style lang="scss">
    @import '@/icon.scss';

    .widget-chooser{
        position: fixed;
        top: 50vh;
        left: 50vw;
        transform: translate(-50%, -50%);
        border-radius: .25rem;
        overflow: hidden;

        width: 100vw;
        height: 80vh;
        max-width: 35rem;
        max-height: 25rem;
        background-color: #f3f3f3;
        border: solid .1rem #8080804a;
        z-index: 58;

        // 针对list
        --size: 5rem;
        --icon: 3rem;

        > .head{
            background-color: rgb(237, 242, 242);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1;

            user-select: none;

            > .flex{
                display: flex;
                align-items: center;
                height: 1.6rem;
                padding: .35rem .5rem;
                gap: .35rem;

                > *{
                    flex-shrink: 0;
                }

                > .title{
                    flex-grow: 1;
                    text-align: center;
                    font-size: .9rem;
                    padding-bottom: .35rem;
                }

                > div{
                    color: rgb(161, 154, 154);
                    transition: all .2s;

                    &:hover{
                        color: black;
                    }
                }

                svg{
                    fill: currentColor;
                    width: 1rem;
                    height: 1rem;
                    margin: 0 .2rem;
                }

                > button{
                    font-size: .8rem;
                    padding: 0 .75rem;
                    border-radius: .3rem;
                    outline: none;
                    border: none;

                    &.fill{
                        background-color: rgb(75, 165, 125);
                        color: white;
                        line-height: 1.6rem;
                    }

                    &.non-fill{
                        line-height: 1.4rem;
                        border: solid .1rem rgb(150, 204, 180);
                    }
                }
            }

            > .path{
                // border-top: solid .1rem rgb(193, 189, 189);
                position: relative;
                height: 2rem;
                color: rgb(85, 81, 81);
                margin-top: -.5rem;
                padding: 0 .35rem;

                input{
                    border: none;
                    outline: none;
                    background-color: transparent;

                    position: absolute;
                    inset: 0;
                    line-height: 1.3rem;
                    padding: 0 .45rem;
                }

                > .bread{
                    display: flex;
                    font-size: .8rem;

                    > *:not(:last-child){
                        color: rgb(148, 144, 144);

                        &::after{
                            display: inline-block;
                            margin: 0 .2rem;
                            height: .6rem;
                            width: .6rem;
                            content: $icon_right;
                        }
                    }

                    > *{
                        padding: 0 .2rem;
                        line-height: 2rem;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        max-width: 50%;

                        &:hover{
                            background-color: rgb(236, 241, 241);
                        }
                    }
                }
            }
        }
    }
</style>
