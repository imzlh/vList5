<script lang="ts">
    import type { MessageOpinion, vDir, vFile, FileOrDir } from '@/env';
    import { DEFAULT_FILE_ICON, FS, UI, openFile, size2str, splitPath, clearActiveFile, getActiveFile, message } from '@/utils';
    import { nextTick, type PropType } from 'vue';
    import { TREE_REG } from '@/action/tree';

    // DRAG的口令，用于鉴别
    const DRAG_TOKEN = Math.floor(Math.random() * 100000000).toString(36);

    export function acceptDrag(elem: HTMLElement, callback: (file: FileOrDir) => any){
        elem.addEventListener('dragover',function(e){
            if(!e.dataTransfer) return;
            e.dataTransfer.dropEffect = 'copy';
            e.preventDefault();
        });
        elem.addEventListener('drop', async function(e){
            if(!e.dataTransfer) return;
            e.preventDefault();
            if(e.dataTransfer.getData('vlist-data/vtoken') == DRAG_TOKEN)
                for(const path of JSON.parse(e.dataTransfer.getData('vlist-data/paths')))
                    callback(await FS.stat(path));
        });
    }

    export default {
        name: 'tree',
        props: {
            data: {
                required: true,
                type: Object as PropType<vDir>
            }
        },
        setup: function (prop) {
            return {
                loadTree: FS.loadTree,
                DEFAULT_FILE_ICON,
                openFile,
                data: prop.data
            };
        },
        directives: {
            focus: {
                mounted(el: HTMLInputElement){
                    const text = el.value,
                        pos_end = text.lastIndexOf('.');
                    // 选中.前内容
                    nextTick(() => requestAnimationFrame(() => el.focus()));
                    el.setSelectionRange(0, pos_end)
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
                        requestAnimationFrame(() => el.focus());
                    }else{
                        el.classList.remove('selected');
                    }
                }
            }
        },
        methods: {
            /**
             * 开始拖拽
             * @param e 事件
             * @param fd 文件或文件夹
             */
            drag_start(e: DragEvent, fd: FileOrDir){
                if(!fd.parent?.active.has(fd)){
                    clearActiveFile();
                    fd.parent?.active.set(fd, fd.path);
                }

                if(!e.dataTransfer) return e.preventDefault();

                const files = getActiveFile();

                e.dataTransfer.setData('vlist-data/vtoken', DRAG_TOKEN);
                e.dataTransfer.setData('vlist-data/paths', JSON.stringify(files.map(item => item.path)));
                e.dataTransfer.setData('text/uri-list', files.map(item => item.url).join('\n'));

                e.dataTransfer.setData('text/plain', 
                    files.map(item => item.type == 'file'
                        ? `[ ${fd.name.replace(/[\[\]]/g, match => '\\' + match[0])} ](${encodeURI(fd.url)})`
                        : fd.name    
                    ).join('')
                );

                e.dataTransfer.dropEffect = 'copy';

                if(fd.icon){
                    const image = new Image(60, 60);
                    image.src = fd.icon;
                    e.dataTransfer.setDragImage(image, 10, 10);
                }
            },
            /**
             * 拖拽过程
             * @param e 事件
             * @param fd 文件或文件夹
             */
            drag_alert(e: DragEvent, fd: vDir){
                if(!e.dataTransfer) return;

                // 加载事件
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                (e.currentTarget as HTMLElement).classList.add('moving');
            },
            /**
             * 拖拽结束，处理文件
             * @param e 事件
             * @param to_fd 目标文件夹
             */
            async drag_onto(e: DragEvent, to_fd: vDir){
                if(!e.dataTransfer) return;
                // 去除高亮
                (e.currentTarget as HTMLElement).classList.remove('moving');
                // 只有满足vlist文件的才可以被拖拽
                if(e.dataTransfer.getData('vlist-data/vtoken') == DRAG_TOKEN){
                    const data = JSON.parse(e.dataTransfer.getData('vlist-data/paths'));
                    const enabled = [];
                    for(const path of data){
                        // 拖拽到原处不受理
                        const from_fd:FileOrDir = await FS.stat(path);
                        if((from_fd.type == 'dir' ? from_fd.path : splitPath(from_fd).dir ) == to_fd.path)
                            continue;
                        else
                            enabled.push(from_fd.path);
                    }
                    FS.move(enabled, to_fd.path, true)
                        .catch(e => message({
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
                    FS.upload(e, to_fd);
                }
            },
            /**
             * 获取文件(夹)描述信息
             * @param data 文件或文件夹
             * @returns 描述信息
             */
            desc(data:FileOrDir){
                var tmp = data.dispName || data.name;
                if(data.ctime > 0) tmp += '\n创建日期:\t' + (new Date(data.ctime).toDateString());
                if(data.type == 'dir') tmp += '\n类型:\t文件夹';
                else{
                    if(data.size) tmp += '\n文件大小:\t' + size2str(data.size);
                    tmp += '\n类型:\t' + splitPath(data)['ext'].toUpperCase() + '文件';
                }
                return tmp;
            },
            /**
             * 标记文件或文件夹选中
             * @param ev 事件
             * @param self 文件或文件夹
             * @param parent 父文件夹
             */
            markup(ev:MouseEvent, self:FileOrDir){
                const parent = self.parent;
                if(!parent) return;
                // 多选
                if(ev.shiftKey || ev.button == 1){
                    parent.active.set(self, self.path);
                // 单选
                }else{
                    clearActiveFile();
                    parent.active.set(self, self.path);
                }
            },
            /**
             * 操作文件夹状态，展开或收拢
             * @param dir 目标文件夹，未指定则为当前文件夹
             */
            folder(dir?:vDir){
                dir = dir || this.data;
                if(dir.child) dir.unfold = !dir.unfold;
                else{
                    dir.lock = dir.unfold = true;
                    // 异步加载子项目
                    FS.loadTree(dir as any)
                        .then(() => dir.lock = !(dir.unfold = true));
                }
            },
            /**
             * 重命名文件或文件夹
             * @param file 文件或文件夹
             * @param val 新名称
             */
            rename(file: FileOrDir, val: string){
                FS.rename({
                    [file.path]: splitPath(file).dir + val
                }).catch((e: Error) => (message({
                    'type': 'error',
                    'content': {
                        'title': '删除失败',
                        'content': e.message
                    },
                    'title': '文件资源管理器',
                    'timeout': 10
                } satisfies MessageOpinion), file.rename = false));
            },
            /**
             * 显示右键菜单
             * @param fd 目标文件或文件夹
             * @param e 事件
             */
            ctxmenu(fd: FileOrDir, e: MouseEvent) {
                const parent = fd.parent;
                if(!parent) return;
                // 单选
                if(!e.shiftKey && !parent.active.has(fd))
                    parent.active.clear();

                // 显示右键菜单
                parent.active.set(fd, fd.path);
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
    <div class="parent" ref="parent" v-bind="$attrs"
        :style="{ pointerEvents: data.lock ? 'none' : 'all' }"
        @dblclick.stop="folder()" @click.stop="markup($event, data)" @contextmenu.stop.prevent="ctxmenu(data, $event)"
        @dragstart.stop="drag_start($event, data)" :draggable="(data).path != '/' && !(data as vDir).rename" @drop.stop="drag_onto($event, data)"
        @dragover.stop="drag_alert($event, data)"
        @dragleave.stop="($event.currentTarget as HTMLElement).classList.remove('moving')" :title="desc(data as any)"
        v-touch
        v-into="data.parent && data.parent.active.has(data)" tabindex="-1"
    >
        <div class="btn-hide" :show="data.unfold" @click="folder()"></div>
        <img :src="data.icon" v-if="data.icon">
        <input v-if="data.rename" :value="data.name"
            @change="rename(data, ($event.currentTarget as HTMLInputElement).value)"
            @contextmenu="(data as vDir).rename = false"
            @blur="(data as vDir).rename = false"
            @keydown.stop @drop.stop.prevent @click.stop @keyup.stop @dblclick.stop
            v-focus
        >
        <span class="text" v-else>{{ data.dispName || data.name }}</span>
    </div>

    <div v-if="data.child" class="child" v-show="data.unfold"
        @contextmenu.stop.prevent="ctxmenu(data, $event)"
        @dragover.stop="drag_alert($event, data)" @drop.stop="drag_onto($event, data)"
        @dragleave.stop="($event.currentTarget as HTMLElement).classList.remove('moving')"
        @click="data.active = new Map()"
    >
        <template v-for="(child, id) in data.child" :key="child.path">

            <tree v-if="child.type == 'dir'" :data="child" :data-position="data.path + ':' + id" />

            <div v-else class="item" :title="desc(child)" ref="elements"
                @click.stop="markup($event, child)" @contextmenu.stop.prevent="ctxmenu(child, $event)"
                v-touch 
                @dblclick.stop="openFile(child as vFile)" @dragstart.stop="drag_start($event, child)" :draggable="!(child as vFile).rename"
                v-into="data.active.has(child)" :process="child.upload"
                :style="{ '--status': child.upload || 0, pointerEvents: child.lock ? 'none' : 'all' }"
                tabindex="-1" :data-position="data.path + ':' + id"
            >
                <img :src="child.icon || DEFAULT_FILE_ICON">
                <input v-if="(child as vFile).rename" :value="child.name"
                    @change="rename(child, ($event.currentTarget as HTMLInputElement).value)"
                    @contextmenu="(child as vFile).rename = false"
                    @blur="(child as vFile).rename = false"
                    @keydown.stop @drop.stop.prevent @click.stop @keyup.stop @dblclick.stop
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

        input{
            border: solid .1rem #3695d3;
            outline: none;
            border-radius: .15rem;
            background-color: #ffffffb5;
            width: 100%;
            box-sizing: border-box;
        }

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

            &.item{
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
