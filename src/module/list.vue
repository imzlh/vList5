<script setup lang="ts">
    import type { FileOrDir, vFile } from '@/env';
    import { DEFAULT_DIR_ICON, DEFAULT_FILE_ICON, size2str, type iMixed, UI } from '@/utils';
    import { computed, reactive, ref, shallowReactive, watch } from 'vue';

    // ==================== 文件（夹）管理器 =======================
    const _prop = defineProps({
            list: {
                required: true,
                type: Array
            },
            mode: {
                required: false,
                default: 'view',
                type: String
            },
            layout: {
                required: false,
                default: reactive({
                    table: [60, 20, 20],
                    orderBy: 'name'
                }),
                type: Object
            }
        }) as {
            layout: {
                table: Array<number>,
                orderBy: 'name' | 'name_rev' | 'date' | 'date_rev' | 'size' | 'size_rev'
            },
            list: Array<iMixed>,
            mode: 'list' | 'view',
        },
        layout = _prop.layout,
        _modes = ['name' , 'name_rev' , 'date' , 'date_rev' , 'size' , 'size_rev'],
        flist = computed(function(){
            if(layout.orderBy == 'name_rev')
                return [ ..._prop.list ].reverse();
            if(layout.orderBy == 'date')
                return [ ..._prop.list ].sort((a, b) => a.ctime - b.ctime)
            if(layout.orderBy == 'date_rev')
                return [ ..._prop.list ].sort((a, b) => b.ctime - a.ctime)
            if(layout.orderBy == 'size')
                return _prop.list.filter(item => item.type == 'dir')
                    .concat((_prop.list.filter(item => item.type == 'file') as Array<vFile>).sort((a, b) => a.size - b.size) as any)
            if(layout.orderBy == 'size_rev')
                return (_prop.list.filter(item => item.type == 'file') as Array<vFile>).sort((a, b) => b.size - a.size)
                    .concat(_prop.list.filter(item => item.type == 'dir') as any);
            return _prop.list
        }),
        select = shallowReactive({
            enable: false,
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
        }),
        selected = ref<Array<HTMLElement>>([]),
        list_element = ref<Array<HTMLElement>>([]),
        data = ref<HTMLDivElement>(),
        event = defineEmits(['open','ctxmenu','select','clear','ctxroot']);

    // 改变文件内容时清空
    watch(() => _prop.list,() => (
        selected.value.forEach(ele => ele.classList.remove('selected')),
        selected.value = [], event('clear')
    ));

    const getIcon = (fd: FileOrDir) =>
        fd.icon
            ? fd.icon
            : fd.type == 'dir'      // 默认
                ? DEFAULT_DIR_ICON
                : DEFAULT_FILE_ICON;

    //  ===================== 选择管理 ==================
    function mark_selected(){
        if(!list_element.value) return console.error('List not ready.');
        // 整理数据
        const minmax = (num1:number,num2:number) =>
                num1 > num2 ? [num2,num1] : [num1,num2],
            [xr1,xr2] = minmax(select.x1,select.x2),
            [yr1,yr2] = minmax(select.y1,select.y2),
            element = list_element.value;
        // 逐个判断
        for (let i = 0; i < element.length; i++) {
            const child = element[i] as HTMLElement;
            if(child.classList.contains('select')) continue;
            const y1 = child.offsetTop,
                y2 = child.offsetTop + child.offsetHeight,
                x1 = child.offsetLeft,
                x2 = child.offsetLeft + child.offsetWidth;
            // 完全选中
            if(
                !((x1>xr2 || xr1>x2) || (y1>yr2 || yr1>y2))
                // (x1 <= xr2 || x2 >= xr1) && (y1 <= yr2 || y2 >= yr1)
            ) node_select(child,false);
        }
    }

    function clear_selected(){
        for (let i = 0; i < selected.value.length; i++)
            selected.value[i].classList.remove('selected'),
            selected.value[i].blur();
        selected.value = [];
        event('clear');
    }

    function init_select(ev:MouseEvent){
        clear_selected();

        select.x1 = select.x2 = ev.offsetX + (ev.target as HTMLElement).scrollLeft,
        select.y1 = select.y2 = ev.offsetY + (ev.target as HTMLElement).scrollTop;

        let started = false;

        let timer:number|undefined;
        const handle = function(ev:MouseEvent){
            ev.preventDefault(),ev.stopPropagation();
            select.x2 += ev.movementX,
            select.y2 += ev.movementY;
            if(!started && Math.abs(select.y2 - select.y1) >= 10 && Math.abs(select.x2 - select.x1) >= 10)
                select.enable = true,started = true;
            // 自动滑动
            if(timer){
                clearInterval(timer);
                timer = undefined;
            }
            timer = setInterval(() => {
                if( !list_element.value[0] ) return;
                const element = data.value as HTMLElement,
                    style = element.getBoundingClientRect(),
                    top = ev.clientY - style.top,
                    total = element.clientHeight;
                // 比较
                if(top <= total / 2 && element.scrollTop > total + element.clientHeight /2) {
                    const step = top < 0 ? total /4 - top : top;
                    element.scrollTop -= step;
                    select.y2 -= step;
                }else if(top >= total * .75 && element.scrollTop > - element.clientHeight /2){
                    const step = top - total * .75;
                    element.scrollTop += step;
                    select.y2 += step;
                }
            },250);
        }

        document.addEventListener('pointermove',handle),
        document.addEventListener('pointerup',
            () => {
                document.removeEventListener('pointermove',handle);
                if( timer ) clearInterval(timer);
                if( !started )
                    return clear_selected();
                mark_selected();
                select.enable = false;
            },
            { once: true });

    }

    function node_select(element:HTMLElement,only?:boolean){
        if(only) clear_selected();
        element.classList.add('selected');
        const id = parseInt(element.dataset.id || '0');
        selected.value.push(element);
        event('select',flist.value[id] ,only);
    }

    function format(date: Date){
        return `${date.getFullYear()}/${date.getMonth().toString().padStart(2,'0')}/${date.getDay().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    }

    function resizeTab(e: PointerEvent, id: number){
        // 100% - .5rem
        const divHeight = computed(() => UI.app_width.value - Math.floor(UI.fontSize.value * .5)),
            rawWidth = layout.table[id];

        function handler(ev: PointerEvent){
            ev.preventDefault();
            layout.table[id] = rawWidth + ((ev.clientX - e.clientX) * 100 / divHeight.value);
        }

        const remove = () =>
            document.removeEventListener('pointermove', handler)

        document.addEventListener('pointermove', handler);
        document.addEventListener('pointerup', remove, {
            "once": true
        });
    }

    defineExpose({elements: selected, selected: computed(() =>
        selected.value.map(item => flist.value[parseInt(item.dataset.id as string)])
    )});
</script>

<template>
    <div class="fd-list" :data-empty="list.length == 0" :style="{
        overflowY: select.enable ? 'hidden' : 'auto',
        paddingRight: select.enable ? '.2rem' : '0'
    }" v-bind="$attrs" ref="data" @contextmenu.prevent.stop="event('ctxroot', $event)">
        <!-- 默认输出 -->
        <div v-if="list.length == 0" style="width: auto;background-color: transparent;">
            此文件夹为空
        </div>
        <!-- 列表 -->
        <div class="view" v-else-if="_prop.mode == 'view'" tabindex="-1"
            @pointerdown.stop.prevent="init_select" @click.prevent.stop="clear_selected()"
        >
            <template v-for="(fd,i) of flist" :key="fd.path">
                <div :type="fd.type" ref="list_element" class="item" tabindex="2" @pointerdown.stop @pointermove.prevent
                    @click.stop="node_select($event.currentTarget as HTMLElement, !$event.shiftKey);" @dblclick.prevent="event('open', fd)"
                    @contextmenu.prevent="event('ctxmenu', fd, $event)"
                    :data-id="i"
                >
                    <!-- 图标 -->
                    <img :src="getIcon(fd)" />
                    <!-- 名称 -->
                    <span>{{ fd.name }}</span>
                </div>
            </template>
        </div>
        <table class="list" v-else>

            <thead>
                <tr>
                    <template v-for="(item, i) in ['名称', '修改时间', '大小']">
                        <th class="name" :style="{ width: layout.table[i] + '%' }"
                            :active="Math.floor(_modes.indexOf(layout.orderBy) / 2) == i"
                            @pointerdown.stop.prevent="layout.orderBy = layout.orderBy == _modes[i *2 +1] ? _modes[i *2] : _modes[i *2 +1] as any"
                        >
                            {{ item }}
                            <div class="resizer" @pointerdown.stop="resizeTab($event, i)"></div>
                        </th>
                    </template>
                </tr>
            </thead>

            <tbody @click.stop>
                <template v-for="(fd,i) of flist" :key="fd.path">
                    <tr :type="fd.type" ref="list_element" class="item" tabindex="2" @pointerdown.stop @pointermove.prevent
                        @click.stop="node_select($event.currentTarget as HTMLElement, !$event.shiftKey);" @dblclick.prevent="event('open', fd)"
                        @contextmenu.prevent="event('ctxmenu', fd, $event)"
                        :data-id="i" :style="{
                            '--icon': `url('${getIcon(fd)}')`
                        }"
                    >
                        <td class="name">
                            {{ fd.name }}
                        </td>

                        <td>
                            {{ format(new Date(fd.ctime)) }}
                        </td>

                        <td>
                            {{ fd.type == 'dir' ? '' :  size2str(fd.size) }}
                        </td>
                    </tr>
                 </template>
            </tbody>

        </table>

        <!-- 信息栏 -->
        <div class="select" :style="{
            display: select.enable ? 'block' : 'none',
            left: Math.min(select.x1, select.x2) + 'px',
            top: Math.min(select.y1, select.y2) + 'px',
            width: Math.abs(select.x1 - select.x2) + 'px',
            height: Math.abs(select.y1 - select.y2) + 'px'
        }" @click.stop></div>
    </div>
    <div class="list-info">
        <span>{{ list.length }} 个项目</span>
        <span v-show="selected.length != 0">选中 {{ selected.length }} 个项目</span>
    </div>
</template>

<style lang="scss">
    .fd-list {
        position: relative;
        --focus: #00b7ff40;
        --hover: #00b2ff29;
        --border: #00b2ff40;

        text-align: center;
        padding-top: 1rem;
        box-sizing: border-box;
        height: 100%;
        width: 100%;

        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;

        &[data-empty=false] {
            padding: .25rem;
            overflow: hidden;

            // 网格
            > div.view{
                display: grid;
                gap: calc(var(--size) * .1);
                grid-template-columns: repeat(auto-fill, 6rem);
                justify-content: space-around;
                align-items: flex-start;
                width: 100%;
            }

            position: relative;
        }

        > .view{

            > div {
                border-radius: .2rem;
                border: solid .1rem transparent;
                padding: .45rem 0;
                width: var(--size);
                font-size: .75rem;
                font-weight: 500;
                margin: .45em;
                user-select: none;

                outline: none;

                border-radius: .2rem;
                outline: none;
                border: none;

                >img {
                        display: block;
                        width: var(--icon);
                        height: var(--icon);
                        margin: auto;
                        pointer-events: none;
                    }

                    >span {
                        text-align: center;
                        word-wrap: break-word;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        line-clamp: 2;
                        -webkit-box-orient: vertical;
                        pointer-events: none;
                    }

                    &:hover>div {
                        opacity: 1;
                        z-index: 1;
                    }

                    &:hover {
                        background-color: var(--hover);
                    }

                    &:focus,
                    &.selected {
                        background-color: var(--focus);
                        border-color: var(--border);
                    }
            }
        }

        >table.list {
            border: none;
            font-size: .8rem;
            table-layout: fixed;
            width: 100%;
            border-spacing: 0;
            user-select: none;
            position: absolute;

            > thead{
                position: sticky;
                top: -.45rem;
                z-index: 1;
                background-color: white;

                th{
                    text-align: left;
                    padding-left: .75rem;
                    color: #564f4f;
                    font-weight: 300;
                    line-height: 1.5rem;

                    &[active=true]{
                        color: black;
                        font-weight: 500;
                    }
                }

                .resizer{
                    background-color: rgb(248 248 248);
                    width: .1rem;
                    float: right;
                    height: 1.5rem;
                    cursor: col-resize;
                    position: relative;

                    &::before{
                        content: '';
                        position: absolute;
                        left: -.25rem;
                        right: -.25rem;
                        height: 100%;
                    }
                }
            }

            > tbody{
                text-align: left;

                > tr{
                    overflow: hidden;
                    border-radius: .2rem;
                    color: #716e6e;
                    font-weight: 300;

                    &.selected{
                        background-color: #00b3ff4f;
                    }

                    &:hover{
                        background-color: #00b3ff39;
                    }

                    > td{
                        line-height: 1.4rem;
                        white-space: nowrap;
                        word-break: break-all;
                        text-overflow: ellipsis;
                        overflow: hidden;
                    }

                    > .name{
                        color: black;
                        font-weight: normal;

                        &::before {
                            content: '';
                            background-position: center;
                            background-size: cover;
                            background-image: var( --icon );
                            display: inline-block;
                            width: 1em;
                            height: 1em;
                            margin: 0 .5rem;
                            transform: scale(1.2);
                        }
                    }
                }
            }


        }

        >.select {
            position: absolute;
            display: none;
            border: solid .1rem rgba(55, 116, 230, 0.7);
            background-color: rgba(52, 118, 232, 0.3);
            z-index: 1;
            box-sizing: border-box;
        }
    }

    .list-info {
        position: absolute;
        left: 0.25rem;
        bottom: 0.25rem;
        font-size: 0.8rem;
        background-color: rgb(248 245 245 / 60%);
        padding: .15rem .35rem;
        backdrop-filter: blur(0.25rem);

        >span {
            border-right: .1rem rgba(227, 217, 217, 0.426) solid;
            padding: 0 .5rem;
        }
    }
</style>
