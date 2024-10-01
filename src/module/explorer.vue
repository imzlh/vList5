
<script setup lang="ts">
    import type { FileOrDir, vDir } from '@/env';
    import { computed, nextTick, reactive, ref, watch, type Ref } from 'vue';
    import List from './list.vue';
    import { FACTION, UI, FS, getConfig, openFile, regConfig, splitPath, getActiveFile, message } from '@/utils';

    import { EXP_REG } from '@/action/explorer';

    defineOptions({
        inheritAttrs: false
    });

    const config = getConfig('explorer'),
        event = defineEmits(['update','action']),
        { option } = defineProps(['option']) as { option: vDir },
        selected = ref<{selected: Array<FileOrDir>}>();

    // 自动加载子目录
    if(!option.child) await FS.loadTree(option);

    const CFG = reactive({
            parent: computed(() => trace.value[current.value]),
            path_splited: computed(function ():Array<[string, string]>{
                let prefix = '/';
                return CFG.parent.path.replace(/\/+/,'/').split('/').filter(item => item != '').map((value:string,index:number) =>
                    [value,prefix = prefix + value + '/']
                );
            }),
            search: false,
            search_text: '',
            path_input: false,
            trace: [] as Array<vDir>,
            font: UI.fontSize,
            input_size: config['ui.filebar_size'] as Ref<number>,
            pub_width: UI.app_width,
            style: 'view' as 'view' | 'list',
            order: 'name' as 'name' | 'name_rev' | 'date' | 'date_rev' | 'size' | 'size_rev'
        }),
        trace = ref<Array<vDir>>([option]),
        current = ref(0),
        search_size = computed(() => CFG.pub_width - CFG.input_size - CFG.font * 7),
        paths = ref<Array<HTMLElement>>([]);

    watch(paths, els => els[els.length -1]?.scrollIntoView({
        'behavior': 'smooth'
    }))

    // 延时激活
    // let btimer:number | undefined;
    // function bread_timer(){
    //     if(!btimer) btimer = setTimeout(function(){
    //         if(!CFG.path_input) CFG.path_input = true;
    //         btimer = undefined;
    //     },1000);
    // }
    // const stop_btimer = () => btimer && clearTimeout(btimer);

    async function goto(dir: string){
        const tree = await FS.loadPath(dir);
        if(tree) trace.value.unshift(tree);
        else FS.loadPath(dir).then(res => trace.value.unshift( res )).catch(e => message({
                'type': 'error',
                'content': {
                    'title': '枚举文件失败',
                    'content': e.message
                },
                'title': '文件资源管理器',
                'timeout': 10
            }));
    }

    function ctxev(fd: FileOrDir, ev: MouseEvent){
        const sel = selected.value?.selected;
        if(!sel) return;

        EXP_REG.display({
            x: ev.clientX,
            y: ev.clientY,
            indir: CFG.parent
        });
    }

    function open(fd: FileOrDir){
        if (fd.type == 'dir') fd.child ? trace.value.unshift(fd) : FS.loadTree(fd)
            .then(() => trace.value.unshift(fd)).catch(e => message({
                'type': 'error',
                'content': {
                    'title': '枚举文件失败',
                    'content': e.message
                },
                'title': '文件资源管理器',
                'timeout': 10
            }));
        else openFile(fd);
    }

    function resize(e:PointerEvent){
		const rawW = UI.width_total.value;
		function rszHandler(ev:PointerEvent){
			ev.preventDefault();
            CFG.input_size += ev.movementX;
		}

		document.addEventListener('pointermove',rszHandler);
		document.addEventListener(
			'pointerup',
			() => document.removeEventListener('pointermove',rszHandler),
			{ once: true}
		);
	}

    function del(){
        const items = getActiveFile(CFG.parent).map(item => item.path);
        FS.del(items);
    }

    function search(text: string){
        if(text.trim() == '') return;
        const reg = new RegExp(text, 'i');
        for(const item of CFG.parent.child as Array<FileOrDir>)
            if(reg.test(item.name))
                CFG.parent.active.set(item, item.path)
    }

</script>

<script lang="ts">
    nextTick(() =>
        regConfig('explorer', [
            {
                "type": "number",
                "default": Math.abs(UI.app_width.value * .5), 
                "key": "ui.filebar_size",
                "name": "路径框大小",
                "step": 1
            }
        ])
    );
</script>

<template>
    <div class="app-explorer">
        <!-- 功能按键 -->
        <div class="header">
            <!-- 新建 -->
            <div class="btn" tabindex="-1">
                <img src="/icon/new.webp">
                <span @click="event('action','create')">新建</span>
                <div class="submenu">
                    <div @click="event('action','create_dir')">
                        <img src="/icon/dir.webp">
                        <span>文件夹</span>
                    </div>
                    <div @click="event('action','create_dir')">
                        <img src="/icon/file.webp">
                        <span>文件</span>
                    </div>
                </div>
                <desc style="transform: translateX(-2rem)">创建一个新项目</desc>
            </div>
            <!-- 分割 -->
            <div class="split"></div>
            <!-- 剪切 -->
            <div class="btn" @click="FACTION.mark('move')">
                <img src="/icon/cut.webp">
                <desc>剪切</desc>
            </div>
            <!-- 拷贝 -->
            <div class="btn" @click="FACTION.mark('copy')">
                <img src="/icon/copy.webp">
                <desc>复制</desc>
            </div>
            <!-- 粘贴 -->
            <div class="btn" @click="FACTION.exec(CFG.parent)" :disable="getActiveFile(CFG.parent).length == 0">
                <img src="/icon/paste.webp">
                <desc>粘贴</desc>
            </div>
            <!-- 重命名 -->
            <div class="btn" @click="getActiveFile(CFG.parent)[0].rename = true">
                <img src="/icon/rename.webp">
                <desc>重命名</desc>
            </div>
            <!-- 删除 -->
            <div class="btn" @click="del">
                <img src="/icon/del.svg">
                <desc>删除</desc>
            </div>
            <div class="split"></div>
            <div class="btn" tabindex="-1">
                <img src="/icon/transmit.webp">
                <span>排序</span>
                <div class="submenu">
                    <div :active="CFG.order == 'name'" @click="CFG.order = 'name'">
                        <span>名称</span>
                    </div>
                    <div :active="CFG.order == 'name_rev'" @click="CFG.order = 'name_rev'">
                        <span>名称(倒序)</span>
                    </div>
                    <div :active="CFG.order == 'date'" @click="CFG.order = 'date'">
                        <span>修改日期</span>
                    </div>
                    <div :active="CFG.order == 'date_rev'" @click="CFG.order = 'date_rev'">
                        <span>修改日期(倒序)</span>
                    </div>
                    <div :active="CFG.order == 'size'" @click="CFG.order = 'size'">
                        <span>大小</span>
                    </div>
                    <div :active="CFG.order == 'size_rev'" @click="CFG.order = 'size_rev'">
                        <span>大小(倒序)</span>
                    </div>
                </div>
                <desc>定义列表样式</desc>
            </div>
            <div class="btn" tabindex="-1">
                <img src="/icon/display.webp">
                <span>查看</span>
                <div class="submenu">
                    <div :active="CFG.style == 'view'" @click="CFG.style = 'view'">
                        <img src="/icon/viewlarge.webp">
                        <span>大图标</span>
                    </div>
                    <div :active="CFG.style == 'list'" @click="CFG.style = 'list'">
                        <img src="/icon/viewinfo.webp">
                        <span>详细信息</span>
                    </div>
                </div>
                <desc>定义列表样式</desc>
            </div>
        </div>

        <!-- 导航 -->
        <div class="selection">
            <!-- 上一页 -->
            <div class="icon" data-action="history-back" :disable="current == trace.length -1"
                @click="current ++"
            >
                <svg viewBox="0 0 448 512">
                    <path fill="currentColor"
                        d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z">
                    </path>
                </svg>
            </div>
            <!-- 下一页 -->
            <div class="icon" data-action="history-resume" :disable="current == 0"
                @click="current --"
            >
                <svg viewBox="0 0 448 512">
                    <path fill="currentColor"
                        d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z">
                    </path>
                </svg>
            </div>
            <!-- 文件夹返回 -->
            <div class="icon" data-action="file-back" :disable="CFG.parent.path == '/'"
                @click="goto(splitPath(CFG.parent).dir)"
            >
                <svg viewBox="0 0 384 512">
                    <path fill="currentColor"
                        d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z">
                    </path>
                </svg>
            </div>
            <!-- 路径 -->
            <div class="path" data-mode="normal" :style="{
                width: CFG.input_size + 'px'
            }">
                <input class="path-input" type="text" :value="CFG.parent.path" v-show="CFG.path_input"
                    @blur="CFG.path_input = false; goto(($event.target as HTMLInputElement).value)"
                >
                <div class="bread" @dblclick="CFG.path_input = true" tabindex="-1" v-show="!CFG.path_input">
                    <div @click.stop="CFG.parent.path = '/';goto('/')">/</div>
                    <div v-for="item of CFG.path_splited" @click.stop="goto(item[1])" ref="paths">
                        {{ item[0] }}
                    </div>
                </div>
            </div>
            <!-- 伸缩 -->
            <div class="resize" @pointerdown.prevent.stop="resize" v-touch></div>
            <!-- 搜索 -->
            <div class="search" :style="{
                width: search_size + 'px'
            }">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input type="text" placeholder="支持正则的筛选" class="search-input">
            </div>
        </div>

        <List v-if="CFG.parent.child" :dir="CFG.parent"
            :mode="CFG.style" :layout="reactive({
                table: [60, 20, 20],
                orderBy: computed({
                    get: () => CFG.order,
                    set: val => CFG.order = val
                })
            })"
            @ctxmenu="ctxev" @open="open" @ctxroot="ctxev(CFG.parent, $event)"
        ></List>
    </div>
</template>

<style lang="scss">
    .app-explorer {
        --message: #f2e7e7d0;
        --text: rgb(129, 114, 114);
        height: 100%;

        $split: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" > <path d="M342.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L274.7 256 105.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"> </path> </svg>');

        @mixin input {
            display: block;
            width: 100%;
            padding: .25rem 0;
            line-height: 1.5rem;
            border: none;
            outline: none;
            box-sizing: border-box;
        }

        > .header {
            background-color: #f6f3f3;
            position: absolute;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            gap: 0.35rem;
            padding: 0 0.35rem 0.35rem 0.35rem;
            align-items: center;
            position: relative;
            flex-wrap: wrap;

            @media screen and (min-width: 30rem) {
                padding-top: 2.5rem;
            }

            > .btn {
                padding: .35rem;
                border-radius: .25rem;
                position: relative;
                display: flex;
                align-items: center;
                gap: .35rem;

                user-select: none;

                &:hover, &:focus {
                    background-color: rgb(232 232 232);
                }

                &[disabled=true] {
                    opacity: .4;
                    pointer-events: none;
                }
                .submenu {
                    display: none;
                    position: absolute;
                    top: 110%;
                    left: -.25rem;
                    font-size: .8rem;
                    font-weight: 300;
                    background-color: #ffffffe8;
                    padding: .25rem;
                    border-radius: .3rem;
                    min-width: 8rem;
                    z-index: 1;
                    border: solid .1rem #ececec;
                    z-index: 2;

                    > div {
                        display: flex;
                        padding: .25rem;
                        gap: .25rem;
                        border-radius: .2rem;
                        align-items: center;
                        transition: all .2s;
                        color: rgb(98, 92, 92);

                        &:hover {
                            background-color: #f1f1f1;
                        }

                        &[active=true]{
                            font-weight: 500;
                            color: black;
                        }

                        &:active{
                            transform: scale(.9);
                        }

                        > img{
                            width: 1.1rem;
                            height: 1.1rem;
                        }
                    }
                }

                &:focus .submenu{
                    display: block;
                }

                > img {
                    width: 1.1rem;
                    height: 1.1rem;
                    display: inline-block;
                }

                > span {
                    color: var(--text);
                    font-size: .8rem;
                    font-weight: 200;
                }

                > desc {
                    position: absolute;
                    opacity: 0;
                    z-index: -1;
                    transition: all .2s;
                    display: block;
                    top: -100%;
                    left: 50%;
                    transform: translateX(-50%) scale(.5);

                    text-wrap: nowrap;
                    font-size: 0.8rem;
                    font-weight: 500;
                    padding: 0.25rem 0.35rem;
                    background-color: #ffffffd0;
                    color: rgb(91 84 84);
                    border: solid .05rem #e7e7e7;
                    border-radius: .25rem;
                }

                &:not([disabled=true]):not(:focus):hover desc {
                    opacity: 1;
                    z-index: 1;
                    top: 110%;
                    left: 50%;
                    transform: translateX(-50%) scale(1);
                    transition-delay: 1s;
                }
            }

            > .split {
                height: 1rem;
                width: .1rem;
                background-color: gray;
                margin: 0 .5rem;
            }
        }

        .selection {

            display: flex;
            align-items: center;
            padding: .35rem;
            overflow: hidden;

            @mixin border-item {
                border: solid .05rem rgb(106, 95, 95);
                border-radius: .2rem;
            }

            >* {
                flex-shrink: 0;
            }

            >.icon {
                padding: .35rem;
                border-radius: .25rem;

                &:hover {
                    background-color: rgba(0, 178, 255, .16);
                }

                >svg {
                    display: block;
                    width: .9rem;
                    height: .9rem;
                }

                &[disable=true]{
                    pointer-events: none;
                    opacity: .4;
                }
            }

            > .path {

                height: 1.5rem;
                margin-left: .2rem;

                @include border-item();
                $border: rgb(86, 219, 240);

                .path-input {
                    box-sizing: border-box;
                    height: 1.5rem;
                    font-size: .85rem;
                    padding: 0 .35rem;

                    @include input();
                }

                .bread {
                    font-size: .85rem;
                    color: #362e2e;
                    overflow-x: scroll;
                    overflow-y: hidden;
                    height: 1.5rem;
                    box-sizing: border-box;
                    width: 100%;
                    white-space: nowrap;

                    &::-webkit-scrollbar{
                        display: none;
                    }

                    >* {
                        max-width: 10em;
                        line-height: 1.5rem;
                        overflow: hidden;
                        text-overflow: clip;
                        white-space: nowrap;
                        border: solid 0.05rem transparent;
                        padding: 0 0 0 0.35rem;
                        user-select: none;
                        display: inline-block;

                        &:hover {
                            border-color: $border;
                            background-color: rgba(0, 183, 255, .2);
                        }

                        &::after {
                            display: inline-block;
                            padding: 0 .3rem;
                            width: .4rem;
                            height: .4rem;
                            border-left: solid .05rem $border;

                            content: $split;

                            &:hover {
                                border-left-color: $border;
                            }
                        }
                    }
                }
            }

            > .search {

                display: flex;
                align-items: center;

                @include border-item();
                padding: 0 .5rem;
                width: 12rem;
                height: 1.5rem;

                > svg {
                    display: block;
                    width: 1rem;
                    height: 1rem;
                }

                > input {
                    @include input();
                    padding: 0 .35rem;
                }
            }

            > .resize{
                width: .35rem;
                height: 1.5rem;
                cursor: ew-resize;
            }
        }

        > .fd-list{
            height: calc(100% - 7rem);
            // height: calc(100svh - 7rem);
            overflow-x: hidden;
            overflow-y: scroll;

            // 针对list
            --size: 5rem;
            --icon: 3rem;
        }
    }
</style>
