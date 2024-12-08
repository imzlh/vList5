<script lang="ts">
    import type { FileOrDir, vDir, vFile } from '@/env';
    import { contextMenu, FS, openFile} from '@/utils';
    import { computed, reactive, ref, shallowRef, watch } from 'vue';
    import List from './list.vue';
    import type { CtxDispOpts } from '@/env';
    import I_LIST from '/icon/viewinfo.webp';
    import I_ICON from '/icon/viewlarge.webp';

    const data = reactive({
        display: false,
        history: [] as Array<string>,
        data: undefined as vDir | undefined,
        current: -1,
        showPath: false,
        displaymode: 'list',
        type: 'file',
        layout: {
            table: [60, 20, 20],
            orderBy: 'name' as 'name' | 'name_rev' | 'date' | 'date_rev' | 'size' | 'size_rev'
        }
    }),
    path = computed({
        get: () => data.history[data.current],
        set: v => data.current = data.history.push(v) -1
    });

    let resolver:undefined|Function;

    export function show(f: string, filter: 'dir'): Promise<vDir[]>;
    export function show(f: string, filter: 'file'): Promise<vFile[]>;
    export function show(f: string, filter: undefined): Promise<FileOrDir[]>;
    export function show(f: string, filter: 'dir' | 'file' | undefined) {
        f ||= '/';
        return new Promise(rs => {
            data.history = [f],data.current = 0,data.display = true;
            data.type = filter || 'all';
            resolver = rs;
        });
    }

    function dirBack(){
        let dir = data.history[data.current];
        if(!dir) return;
        if(dir[dir.length-1] == '/') dir = dir.substring(0,dir.length-1);

        const pos = dir.lastIndexOf('/');
        // 没有上一级
        if(pos == -1) return false;
        // 切换
        return path.value = dir.substring(0,pos);
    }

    const getPath = computed(() => {
        let prefix = '/';
        if(!path.value) return [];
        return ([{path: '/', name: '根目录'}] as Array<any>).concat(path.value.split('/').map(item => item ? {
            path: prefix += item + '/',
            name: item
        } : null));
    });

    function submit(){
        resolver && resolver([...data.data!.active.keys()]);
        resolver = undefined;data.display = false;
    }

    function ctxmenu(item: FileOrDir, e: MouseEvent){
        contextMenu({
            pos_x: e.clientX,
            pos_y: e.clientY,
            content: [
                {
                    "text": '打开',
                    "handle": () => item.type == 'dir' ? (path.value = item.path) : openFile(item)
                },{
                    "text": "显示为",
                    "child": [
                        {
                            "text": "图标",
                            "icon": I_ICON,
                            "handle": () => data.displaymode = 'view'
                        },{
                            "text": "列表",
                            "icon": I_LIST,
                            "handle": () => data.displaymode = 'list'
                        }
                    ]
                },{
                    "text": "排序方式",
                    "child": [
                        {
                            text: "名称",
                            handle: () => data.layout.orderBy = 'name'
                        },{
                            text: "名称(逆序)",
                            handle: () => data.layout.orderBy = 'name_rev'
                        },{
                            text: "日期",
                            handle: () => data.layout.orderBy = 'date'
                        },{
                            text: "日期(逆序)",
                            handle: () => data.layout.orderBy = 'date_rev'
                        },{
                            text: "大小",
                            handle: () => data.layout.orderBy = 'size'
                        },{
                            text: "大小(逆序)",
                            handle: () => data.layout.orderBy = 'size_rev'
                        }
                    ]
                }
            ]
        } satisfies CtxDispOpts);
    }

    watch(path, v => v && FS.loadPath(v).then(_ => data.data = _));
</script>

<script lang="ts" setup>
    const _ = data;
</script>

<template>
    <div class="widget-chooser" v-show="_.display">
        <div class="head">
            <div class="flex">
                <!-- 上一页 -->
                <div class="icon" data-action="history-back" :disabled="_.current == 0" @click="_.current --" vs-icon="left" button />
                <!-- 下一页 -->
                <div class="icon" data-action="history-resume" :disabled="_.current == _.history.length -1" @click="_.current ++" button vs-icon="right" />
                <!-- 文件夹返回 -->
                <div class="icon" data-action="file-back" @click="dirBack" vs-icon="point-up" button />
                <div class="title">
                    选择文件
                </div>
                <!-- 按钮 -->
                <button class="non-fill" @click="_.display = false">取消</button>
                <button class="fill" @click="submit"
                    :disabled="!_.data?.active.size || ( _.type != 'all' && Array.from(_.data.active).some(item => item[0].type != data.type) )"
                >确定</button>
            </div>
            <!-- 路径 -->
            <div class="path">
                <!-- 路径输入 -->
                <input type="text" v-if="_.showPath" :value="path" >
                <!-- 路径分层 -->
                <div class="bread" v-else
                    @click="_.showPath = true" @blur="_.showPath = false"
                    tabindex="-11"
                >
                    <template v-for="item of getPath">
                        <div @click.stop="path = item.path" v-if="item">
                            {{ item.name }}
                        </div>
                    </template>
                </div>
            </div>
        </div>
        <!-- 列表 -->
        <div v-if="_.data" style="padding-top: 4rem;box-sizing: border-box;height: 100%">
            <List :dir="_.data" :layout="_.layout"
                @ctxmenu="ctxmenu"
                @open="(file:FileOrDir) => file.type == 'dir' ? (path = file.path) : submit()"
            ></List>
        </div>
    </div>
</template>

<style lang="scss">
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
        z-index: 56;

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
                    pointer-events: none;
                }

                > div{
                    color: rgb(161, 154, 154);
                    transition: all .2s;

                    &:hover{
                        color: black;
                    }
                }

                [vs-icon]::before{
                    width: 1rem;
                    height: 1rem;
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
                            content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>');
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
                            color: black;
                        }
                    }
                }
            }
        }
    }
</style>
