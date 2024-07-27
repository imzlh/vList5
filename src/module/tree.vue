<script lang="ts">
    import type { MessageOpinion } from '@/env';
    import { DEFAULT_FILE_ICON, FS, Global, loadTree, UI, openFile, reloadTree, size2str, splitPath, clipFName } from '@/utils';
    import { ref, shallowRef, toRaw, watch, type PropType } from 'vue';
    import { upload, type iDir, type iFile, type iMixed } from '@/script/tree';
    import { TREE_REG } from '@/action/tree';

    export const marked = shallowRef<Array<iMixed>>([]),
        markmap = ref<Array<string>>([]),
        updated = ref(false);

    // DRAG的口令，用于鉴别
    const DRAG_TOKEN = Math.floor(Math.random() * 100000000).toString(36);

    export function acceptDrag(elem: HTMLElement, callback: (file: iFile) => void){
        elem.addEventListener('dragover',function(e){
            if(!e.dataTransfer) return;
            e.dataTransfer.dropEffect = 'copy';
            e.preventDefault();
        });
        elem.addEventListener('drop', function(e){
            if(!e.dataTransfer) return;
            e.preventDefault();
            if(e.dataTransfer.getData('text/vtoken') == DRAG_TOKEN)
                callback(JSON.parse(e.dataTransfer.getData('application/json')));
        });
    }

    export default {
        name: 'tree',
        props: {
            data: {
                required: true,
                type: Object as PropType<iDir>
            },
            active: {
                required: false,
                type: Boolean,
                default: true
            }
        },
        setup: function (prop) {
            watch(() => prop.data.child,(n,r) => r == undefined && (prop.data.show = true));

            return {
                loadTree,
                DEFAULT_FILE_ICON,
                openFile,
                markmap,
                marked
            };
        },
        directives: {
            focus: {
                mounted(el: HTMLInputElement){
                    el.select() ;el.focus();
                }
            },
            into: {
                updated(el:HTMLElement, bind){
                    if(bind.value){
                        const pos = el.getBoundingClientRect().y;
                        if(pos <= UI.fontSize.value * 4.6 || pos >= document.documentElement.clientHeight)
                            el.scrollIntoView({
                                'behavior': 'smooth',
                                'block': 'center'
                            });
                        el.classList.add('selected');
                    }else{
                        el.classList.remove('selected');
                    }
                }
            }
        },
        methods: {
            
            drag_start(e: DragEvent, fd: iMixed){
                if(!e.dataTransfer) return e.preventDefault();

                e.dataTransfer.setData('application/json', JSON.stringify(toRaw(fd)));
                e.dataTransfer.setData('text/vtoken', DRAG_TOKEN);
                e.dataTransfer.setData('text/uri-list', fd.url);
                e.dataTransfer.setData('text/plain', `[ ${fd.name.replace(/[\[\]]/g, match => '\\' + match[0])} ](${encodeURI(fd.url)})`);
                e.dataTransfer.dropEffect = 'copy';

                if(fd.icon){
                    const image = new Image(60, 60);
                    image.src = fd.icon;
                    e.dataTransfer.setDragImage(image, 10, 10);
                }
            },
            drag_alert(e: DragEvent, fd: iDir){
                if(!e.dataTransfer) return;

                // 加载事件
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                (e.currentTarget as HTMLElement).classList.add('moving');
            },
            async drag_onto(e: DragEvent, to_fd: iDir){
                if(!e.dataTransfer) return;
                // 去除高亮
                (e.currentTarget as HTMLElement).classList.remove('moving');
                // 只有满足vlist文件的才可以被拖拽
                if(e.dataTransfer.getData('text/vtoken') == DRAG_TOKEN){
                    // 拖拽到原处不受理
                    const from_fd:iMixed = JSON.parse(e.dataTransfer.getData('application/json'));
                    if((from_fd.type == 'dir' ? from_fd.path : splitPath(from_fd).dir )== to_fd.path) return;

                    FS.move(from_fd.path, to_fd.path)
                        .then(() => reloadTree([
                            from_fd.type == 'dir' ? from_fd.path : splitPath(from_fd)['dir'],
                            to_fd.path
                        ]))
                        .catch(e => Global('ui.message').call({
                            "title": "资源管理器",
                            "content": {
                                "title": "移动错误",
                                "content": e instanceof Error ? e.message : new String(e).toString()
                            },
                            "type": "error",
                            "timeout": 10
                        } satisfies MessageOpinion));
                }else{
                    // 处理事件
                    upload(e, to_fd);
                }
            },
            desc(data:iMixed){
                var tmp = data.dispName || data.name;
                if(data.ctime > 0) tmp += '\n创建日期: ' + (new Date(data.ctime).toDateString());
                if(data.type == 'dir') tmp += '\n类型: 文件夹';
                else{
                    if(data.size) tmp += '\n文件大小: ' + size2str(data.size);
                    tmp += '\n类型: ' + splitPath(data)['ext'].toUpperCase() + '文件';
                }
                return tmp;
            },
            markup(ev:MouseEvent,self:iMixed){
                if(marked.value.includes(self)) return;
                if(ev.shiftKey){
                    marked.value.push(self);
                    markmap.value.push(self.path);
                }else{
                    marked.value = [self];
                    markmap.value = [self.path];
                }
            },
            folder(dir?:iDir){
                dir = dir || this.data;
                if(dir.locked) dir.show = true
                else if(dir.child) dir.show = !dir.show;
                else{
                    loadTree(dir as any)
                        .then(() => dir.locked = false);
                        dir.locked = dir.show = true;
                }
            },
            rename(file: iMixed, val: string){
                FS.rename({
                    [file.path]: splitPath(file).dir + val
                }).then(() => (
                    file.name = val ,
                    file.url = file.url.substring(0, file.url.lastIndexOf('/', file.url.length -2) +1) + file.name,
                    file.rename = false,
                    file.ctime = Date.now()
                )).catch((e: Error) => (Global('ui.message').call({
                    'type': 'error',
                    'content': {
                        'title': '删除失败',
                        'content': e.message
                    },
                    'title': '文件资源管理器',
                    'timeout': 10
                } satisfies MessageOpinion), file.rename = false));
            },
            ctxmenu(fd: iMixed, e: MouseEvent) {
                if (marked.value.length == 0) marked.value = [fd];
                TREE_REG.display({
                    x: e.clientX,
                    y: e.clientY,
                    indir: this.data
                })
            }
        }
    }
</script>

<template>
    <div class="parent selectable" ref="parent"
        @dblclick.stop="folder()" @click.stop="markup($event, data)" @contextmenu.stop.prevent="ctxmenu(data, $event)"
        @dragstart.stop="drag_start($event, data)" :draggable="(data).path != '/' && !(data as iDir).rename" @drop.stop="drag_onto($event, data)"
        @dragover.stop="drag_alert($event, data)"
        @dragleave.stop="($event.currentTarget as HTMLElement).classList.remove('moving')" :title="desc(data as any)"
        v-touch
        v-into="markmap.includes(data.path)" tabindex="-1"
    >
        <div class="btn-hide" :show="data.show" @click.stop="folder()"></div>
        <img :src="data.icon" v-if="data.icon">
        <input v-if="data.rename" :value="data.name"
            @change="rename(data, ($event.currentTarget as HTMLInputElement).value)"
            @contextmenu="(data as iDir).rename = false"
            @blur="(data as iDir).rename = false"
            @keydown.stop @drop.stop.prevent
            v-focus
        >
        <span class="text" v-else>{{ data.dispName || data.name }}</span>
    </div>

    <div v-if="data.child" class="child" v-show="data.show"
        @contextmenu.stop.prevent="ctxmenu(data, $event)"
        @dragover.stop="drag_alert($event, data)" @drop.stop="drag_onto($event, data)"
        @dragleave.stop="($event.currentTarget as HTMLElement).classList.remove('moving')"
        @click.stop="markmap = [];marked = [];"
    >
        <template v-for="child in data.child" :key="child.name">

            <tree v-if="child.type == 'dir'" :data="child" />

            <div v-else class="item selectable" :title="desc(child)" ref="elements"
                @click.stop="markup($event, child)" @contextmenu.stop.prevent="ctxmenu(child, $event)"
                v-touch
                @dblclick.stop="openFile(child as iFile)" @dragstart.stop="drag_start($event, child)" :draggable="!(child as iFile).rename"
                v-into="markmap.includes(child.path)" :process="(child as iFile).status"
                :style="{ '--status': (child as iFile).status }" :type="child.type" tabindex="-1"
            >
                <img :src="child.icon || DEFAULT_FILE_ICON">
                <input v-if="(child as iFile).rename" :value="child.name"
                    @change="rename(child, ($event.currentTarget as HTMLInputElement).value)"
                    @contextmenu="(child as iFile).rename = false"
                    @blur="(child as iFile).rename = false"
                    @keydown.stop @drop.stop.prevent
                    v-focus
                >
                <span class="text" v-else>{{ child.dispName || child.name }}</span>
            </div>

        </template>
    </div>
</template>

<style lang="scss">
    .vlist {
        display: block;
        pointer-events: all;
        font-weight: 200;

        .moving{
            background-color: rgb(217, 246, 233);
            border-color: rgb(68, 222, 152);
        }

        .parent, .child > .item{
            display: flex;
            user-select: none;
            border: solid .05rem transparent;
            border-radius: .2rem;
            min-height: 1rem;
            margin: .05rem;
            padding: .1rem 0;
            overflow: hidden;

            outline: none;

            > img, > span{
                pointer-events: none;
            }

            &:hover {
                background-color: rgb(44 83 222 / 18%);
            }

            &.selected {
                background-color: rgba(107, 137, 245, 0.3);
            }

            &.selected:focus {
                border-color: rgb(94, 174, 235);
            }

            &:focus{
                background-color: rgba(114, 140, 255, 0.5);
            }

            &[type=file]{
                padding-left: 1rem;
            }

            > img {
                width: 1rem;
                height: 1rem;
                // transform: scale(1.1) translateY(10%);
                margin: 0 .25rem 0 .1rem;
                flex-shrink: 0;
            }

            >.btn-hide {
                padding: .2rem;
                content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path></svg>');
                width: .6rem;
                height: .6rem;
                display: block;
                border-radius: .2rem;
                transition: all .2s;

                &:hover {
                    background-color: #1ba9e653;
                    filter: opacity(.5);
                }

                &[show=true] {
                    transform: rotate(180deg);
                }
            }

            >.text {
                font-size: .8rem;
                line-height: 1rem;
                font-family: system-ui;
                font-weight: 300;
                flex-grow: 1;
                pointer-events: none;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;

                outline: none;
                border: none;

                &:focus{
                    // border: solid .05rem rgb(211, 211, 211);
                    border-radius: .2rem;
                    background-color: white
                }
            }

            // &.active {
            //     background-color: rgba(126, 118, 118, 0.3);
            // }

        }

        .child{
            padding-left: .75rem;
        }

        .item[process]{
            position: relative;
            color: rgb(164, 159, 159);
            pointer-events: none;

            > *{
                filter: grayscale(.6);
            }

            &::before{
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                border-radius: .2rem;
                width: calc( var( --status ) * 1% );
                background-color: rgb(233, 250, 209);
            }

            // &::after{
            //     content: '上传进度: ' attr(process) '%';
            //     position: absolute;
            //     bottom: 100%;
            //     left: 0;
            //     font-size: .75rem;padding: .1rem .35rem;
            //     transition: opacity .2s, transform .2s;
            //     transform: scale(0) translateY(120%);
            //     opacity: 0;
            // }

            // &:hover{
            //     overflow: visible;

            //     &::after{
            //         transition-delay: 1s;
            //         transform: scale(1) translateY(0);
            //         opacity: 1;
            //         background-color: white;
            //     }
            // }
        }
    }
</style>
