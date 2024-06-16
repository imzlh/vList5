<script setup lang="ts">
    import type { FileOrDir } from '@/data';
    import { computed, ref, shallowReactive, toRaw, watch } from 'vue';

    // ==================== 文件（夹）管理器 =======================
    const { list } = defineProps({
            list: {
                required: true,
                type: Object
            }
        }) as {list: Array<FileOrDir>},
        select = shallowReactive({
            enable: false,
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            selected: [] as Array<HTMLElement>
        }),
        list_element = ref<Array<HTMLElement>>([]),
        event = defineEmits(['open','ctxmenu','select','clear']);

    // 改变文件内容时清空
    watch(() => list.length,() => (select.selected = [],event('clear')));

    const getIcon = (fd: FileOrDir) => 
        fd.icon
            ? fd.icon
            : fd.type == 'dir'      // 默认
                ? '/icon/dir.webp'
                : '/icon/file.webp';

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
        const selected = select.selected;
        for (let i = 0; i < selected.length; i++) 
            selected[i].classList.remove('selected');
        select.selected = [];
        event('clear');
    }

    let timer:number;
    function init_select(ev:MouseEvent){
        if(!(ev.target as HTMLElement).classList.contains('fd-list')) return;
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
                const element = list_element.value[0].parentElement as HTMLElement,
                    style = element.getBoundingClientRect(),
                    top = ev.clientX - style.top,
                    total = element.clientHeight;
                if(top <= total / 2) {
                    const step = top < 0 ? total /4 - top : top;
                    element.scrollTop -= step;
                    select.y2 -= step;
                }else if(top >= total * .75){
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
        select.selected.push(element);
        event('select',id);
    }

    defineExpose({selected: select.selected});
</script>

<template>
    <div class="fd-list" @pointerdown="init_select" :data-empty="list.length == 0" :style="{
        overflowY: select.enable ? 'hidden' : 'auto'
    }" v-bind="$attrs">
        <!-- 默认输出 -->
        <div v-if="list.length == 0" style="width: auto;background-color: transparent;">
            此文件夹为空
        </div>
        <!-- 列表 -->
        <template v-else v-for="(fd,i) of list">
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
        <span v-show="select.selected.length != 0">选中 {{ select.selected.length }} 个项目</span>
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

        overflow-y: auto;
        overflow-x: hidden;
        scroll-behavior: smooth;

        &[data-empty=false] {
            padding: .25rem;
            overflow: hidden;

            display: grid;
            grid-column-gap: calc(var(--size) * .1);
            grid-template-columns: repeat(auto-fill, 6rem);
            justify-content: space-around;
            align-items: flex-start;

            position: relative;
        }

        >div {
            border-radius: .2rem;
            border: solid .1rem transparent;
            padding: .45rem 0;
            width: var(--size);
            font-size: .75rem;
            font-weight: 500;
            margin: .45em;
            user-select: none;

            outline: none;

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