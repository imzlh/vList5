<script lang="ts">
    import type { AlertOpts, CtxDispOpts, CtxMenuData, MessageOpinion, vDir, vFile } from '@/env';
    import { APP_API, DEFAULT_FILE_ICON, FILE_PROXY_SERVER, FS, Global, loadTree, openFile, reloadTree, size2str, splitPath } from '@/utils';
    import { onMounted, reactive, ref, shallowRef, toRaw, watch, type PropType } from 'vue';
    import Upload from './upload.vue';

    import I_NEW from '/icon/new.webp';
    import I_FOLDER from '/icon/folder.webp';
    import I_TXT from '/icon/textfile.webp';
    import I_UPLOAD from '/icon/transmit.webp';
    import I_REFRESH from '/icon/refresh.webp';
    import I_CUT from '/icon/cut.webp';
    import I_COPY from '/icon/copy.webp';
    import I_PASTE from '/icon/paste.webp';
    import I_RENAME from '/icon/rename.webp';
    import I_OPEN from "/icon/open.webp";
    import I_OPENER from '/icon/opener.webp';
    import { getIcon } from '@/script/icon';

    export const marked = shallowRef<Array<iMixed>>([]);
    export const markmap = ref<Array<string>>([]);

    interface DisplayCondition{
        single: boolean,
        sort: 'file' | 'dir' | 'all',
        filter?: (file: iMixed[]) => boolean
    }

    type file_action = 'move'|'copy';

    interface iFile extends vFile{
        rename?: boolean,
        status?: number,
        show?: boolean
    }

    interface iDir extends vDir{
        rename?: boolean,
        show?: boolean,
        locked?: boolean
        status?: number
    }

    type iMixed = iFile | iDir; 

    const ADDITION = [] as Array<[(input: iMixed[]) => CtxMenuData, DisplayCondition]>;
    const DRAG_TOKEN = Math.floor(Math.random() * 100000000).toString(36);

    const FACTION = {
        marked: [] as Array<iMixed>,
        action: 'copy' as file_action,
        async exec(dest: iDir):Promise<boolean|number>{
            // 异步获取
            const f = await fetch(APP_API + '?action=' + this.action, {
                "method": "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                "body": JSON.stringify({
                    from: this.marked.map(item => item.path),
                    to: dest.path
                })
            });
            if(!f.ok){
                Global('ui.message').call({
                    "type": "error",
                    "title": "文件资源管理器",
                    "content":{
                        "title": {
                            'copy': '复制',
                            'move': '剪切'
                        }[this.action] + '文件失败',
                        "content": await f.text()
                    },
                    "timeout": 5
                } satisfies MessageOpinion);
                return false;
            }else{
                reloadTree([dest.path]);
            }
            return true;
        },

        mark(action:file_action,file:Array<iMixed>){
            this.marked = file;
            this.action = action;
        }
    }

    /**
     * 注册一个子集菜单
     * @param item 目录内容
     * @param cdt 显示此目录的条件
     */
    export const register = (item: (input: iMixed[]) => CtxMenuData, cdt: DisplayCondition) => 
        ADDITION.push([item, cdt]);

    let touch = {
        x: 0,
        y: 0,
        mx: 0,
        my: 0,
        time: 0
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
            }
        },
        methods: {
            touch_start(ev:TouchEvent){
                touch = {
                    x: ev.touches[0].clientX, 
                    y: ev.touches[0].clientY,
                    mx: ev.touches[0].clientX,
                    my: ev.touches[0].clientY,
                    time: new Date().getTime()
                };
            },
            touch_move(ev: TouchEvent){
                touch.mx = ev.touches[0].clientX,
                touch.my = ev.touches[0].clientY;
            },
            touch_end(file: iFile, el: TouchEvent){
                if(Math.abs(touch.mx - touch.x) > 10 || Math.abs(touch.my - touch.y) > 10) return;
                el.preventDefault();

                marked.value = [file];

                if(new Date().getTime() - touch.time <= 600) openFile(file);
                else this.ctxmenu(file, new MouseEvent('contextmenu', {
                    "clientX": touch.mx,
                    "clientY": touch.my
                }))
            },
            drag_start(e: DragEvent, fd: iMixed){
                if(!e.dataTransfer) return e.preventDefault();

                e.dataTransfer.setData('application/json', JSON.stringify(toRaw(fd)));
                e.dataTransfer.setData('text/plain', DRAG_TOKEN);
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
                
                // 加载事件
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                (e.currentTarget as HTMLElement).classList.remove('moving');

                // 文件上传
                if(e.dataTransfer.files.length > 0) for(const file of e.dataTransfer.files){
                    // 推入文件
                    const new_file = reactive({
                        "ctime": Date.now(),
                        "icon": getIcon(file.name, true),
                        "name": file.name,
                        "path": to_fd.path + file.name,
                        "size": file.size,
                        "type": 'file',
                        "url": FILE_PROXY_SERVER + to_fd.path + file.name,
                        "status": 1
                    } as iFile);
                    if(!to_fd.child) await loadTree(to_fd);
                    
                    // 寻找重复
                    for (let i = 0; i < (to_fd.child as Array<iMixed>).length; i++) {
                        const element = (to_fd.child as Array<iMixed>)[i];
                        if (element.name == new_file.name) {
                            const text = await new Promise(rs => Global('ui.alert').call({
                                "type": "prompt",
                                "title": "上传提示",
                                "message": `您选中的文件 ${file.name} 已经存在\n建议更改名称，或按下"确定"覆盖`,
                                "callback": rs
                            } satisfies AlertOpts));
                            // 覆盖
                            if(!text || text == element.name)
                                if(element.type == 'dir')
                                    Global('ui.message').call({
                                        "title": "资源管理器",
                                        "content": {
                                            "title": "上传错误",
                                            "content": "前提条件错误：目标是一个文件夹"
                                        },
                                        "type": "error",
                                        "timeout": 10
                                    } satisfies MessageOpinion)
                                else
                                    (to_fd.child as Array<iMixed>).splice(i, 1);
                            break;
                        }
                    }
                    const id = (to_fd.child as Array<iMixed>).push(new_file) -1;
                    try{
                        await FS.write(new_file.path, file, prog =>
                            new_file.status = prog.loaded / prog.total * 100
                        );
                        new_file.status = undefined;
                    }catch(e){
                        Global('ui.message').call({
                            "title": "资源管理器",
                            "content": {
                                "title": "上传错误",
                                "content": e instanceof Error ? e.message : new String(e).toString()
                            },
                            "type": "error",
                            "timeout": 10
                        } satisfies MessageOpinion);
                        (to_fd.child as Array<iMixed>).splice(id, 1);
                    }
                    return;
                }

                // 只有满足vlist文件的才可以被拖拽
                if(e.dataTransfer.getData('text/plain') != DRAG_TOKEN) return;
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
            folder(){
                if(this.data.locked) this.data.show = true
                else if(this.data.child) this.data.show = !this.data.show;
                else{
                    loadTree(this.data as any)
                        .then(() => this.data.locked = false);
                    this.data.locked = this.data.show = true;
                }
            },
            rename(file: iMixed, val: string){
                FS.rename({
                    [file.path]: val
                }).then(() => (
                    file.name = val,file.rename = false
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
            ctxmenu(fd: iMixed, e:MouseEvent){
                const dir = fd.type == 'dir' ? fd : this.data;

                const item = [
                    {
                        "text": "创建",
                        "icon": I_NEW,
                        "child": [
                            {
                                "text": "文件夹",
                                "icon": I_FOLDER,
                                handle: () => 
                                    Global('ui.alert').call({
                                        "type": "prompt",
                                        "title": "创建文件夹",
                                        "message": "请输入文件夹名称",
                                        callback: (data) => 
                                            // 创建文件夹
                                            FS.mkdir(dir.path + data)
                                                .then(() => loadTree(this.data)),
                                    } satisfies AlertOpts)
                            },{
                                "text": "文件",
                                "icon": I_TXT,
                                handle: () => 
                                    Global('ui.alert').call({
                                        "type": "prompt",
                                        "title": "新建文件",
                                        "message": "请输入文件名称",
                                        callback: (data) => 
                                            // 创建文件夹
                                            FS.touch(dir.path + data)
                                                .then(() => loadTree(this.data)),
                                    } satisfies AlertOpts)
                            }
                        ],
                    },{
                        "text": "上传",
                        "icon": I_UPLOAD,
                        handle: () => {
                            Global('ui.window.add').call({
                                "content": Upload,
                                "icon": I_UPLOAD,
                                "name": "上传文件",
                                "option": dir.path
                            });
                        },
                    },{
                        "text": "刷新",
                        "icon": I_REFRESH,
                        handle: () => {
                            loadTree(this.data)
                        },
                    },'---'
                ] as Array<CtxMenuData>;

                if(marked.value[0].path != '/')
                    item.push({
                        "text": "剪切",
                        "icon": I_CUT,
                        handle:() =>
                            FACTION.mark('move',marked.value)
                    },{
                        "text": "复制",
                        "icon": I_COPY,
                        handle: () =>
                            FACTION.mark('copy',marked.value)
                    });

                if(marked.value.length == 1){
                    item.push({
                        "text": "粘贴",
                        "icon": I_PASTE,
                        handle: async () => {
                            const dir = marked.value[0].type == 'dir'
                                ? marked.value[0]
                                : this.data;

                            // 覆盖提示
                            try{
                                if(!dir.child)
                                    await loadTree(dir);
                                if(!dir.child) dir.child = [];
                                const mark = FACTION.marked.map(item => item.name),
                                    over = dir.child.filter(item => mark.includes(item.name));
                                if(over.length > 0)
                                    await new Promise((rs, rj) => Global('ui.alert').call({
                                        "type": "confirm",
                                        "title": "覆盖或合并提示",
                                        "message": "这些文件将会被合并/覆盖\n\n" + 
                                            over.map(item => item.name + '\t' + (item.type == 'dir' ? '文件夹' : size2str(item.size))),
                                        "callback": rs
                                    } satisfies AlertOpts));
                            }catch{}    

                            FACTION.exec(dir);
                        }
                    });
                }

                    if(marked.value[0].path != '/'){
                        item.push({
                        "text": "删除",
                        "icon": 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23b7a6a6" viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/></svg>',
                        handle: async () => {
                            try {
                                await FS.delete(marked.value.map(item => item.path))
                            } catch (e) {
                                return Global('ui.message').call({
                                    'type': 'error',
                                    'content': {
                                        'title': '删除失败',
                                        'content': (e as Error).message
                                    },
                                    'title': '文件资源管理器',
                                    'timeout': 10
                                } satisfies MessageOpinion)
                            }
                            const refdir = [] as Array<string>;
                            for (const file of marked.value) if (file.type == 'file') {
                                const dir = splitPath(file)['dir'];
                                if (!refdir.includes(dir)) refdir.push(dir);
                            } else {
                                const slash = file.path.lastIndexOf('/', file.path.length - 2);
                                refdir.push(file.path.substring(0, slash + 1));
                            }
                            // 刷新
                            reloadTree(refdir);
                        }
                    });

                    if (marked.value.length == 1) {
                        item.push({
                            "text": "重命名",
                            "icon": I_RENAME,
                            handle: () => marked.value[0].rename = true,
                        });
                    }
                }

                    if (marked.value.length == 1 && marked.value[0].type == 'file') {
                        item.push('---', {
                            "text": "打开",
                            "icon": I_OPEN,
                            handle: () => openFile(marked.value[0]),
                        }, {
                            "text": "打开方式",
                            "icon": I_OPENER,
                            handle() {
                                Global('opener.chooser.choose').call(marked.value[0])
                                    .then(opener => opener.open(marked.value[0]));
                            },
                        });
                    }

                if(ADDITION.length > 0) item.push(
                    '---',
                    ...ADDITION.filter(item => {
                        if(item[1].single && marked.value.length != 1) return false;
                        if(item[1].sort != 'all') for (const fd of marked.value)
                            if(fd.type != item[1].sort) return false;
                        if(item[1].filter && !item[1].filter(marked.value))
                            return false;
                        return true;
                    }).map(item => item[0](marked.value))
                )

                Global('ui.ctxmenu').call({
                    "pos_x": e.clientX,
                    "pos_y": e.clientY,
                    "content": item
                } satisfies CtxDispOpts)
            }
        }
    }
</script>

<template>
    <div class="parent"
        @dblclick.stop="folder()" @click.stop="markup($event, data as any)" @contextmenu.stop.prevent="ctxmenu(data, $event)"
        @dragstart.stop="drag_start($event, data)" :draggable="(data).path != '/'" @drop.stop="drag_onto($event, data)"
        @dragover.stop="drag_alert($event, data)"
        @dragleave.stop="($event.currentTarget as HTMLElement).classList.remove('moving')" :title="desc(data as any)"
        :selected="markmap.includes(data.path)" tabindex="-1">
        <div class="btn-hide" :show="data.show" @click.stop="folder"></div>
        <img :src="data.icon" v-if="data.icon">
        <input v-if="data.rename" :value="data.name"
            @change="rename(data, ($event.currentTarget as HTMLInputElement).value)"
            @blur="data.rename = false"
            @mousedown.stop @pointerdown.stop @touchstart.stop @dragstart.stop
            v-focus
        >
        <span class="text" v-else>{{ data.dispName || data.name }}</span>
    </div>

    <div v-if="data.child" class="child" v-show="data.show"
        @contextmenu.stop.prevent="ctxmenu(data, $event)"
        @dragover.stop="drag_alert($event, data)" @drop.stop="drag_onto($event, data)"
        @click.stop="markmap = [];marked = [];"
    >
        <template v-for="child in data.child" :key="child.name">

            <tree v-if="child.type == 'dir'" :data="child" />

            <div v-else class="item" :title="desc(child)"
                @click.stop="markup($event, child)" @contextmenu.stop.prevent="ctxmenu(child, $event)"
                @touchstart.stop="touch_start" @touchmove.stop="touch_move" @touchend.stop="touch_end(child as iFile, $event)"
                @dblclick.stop="openFile(child as iFile)" @dragstart.stop="drag_start($event, child)" draggable="true"
                :selected="markmap.includes(child.path)" :process="(child as iFile).status"
                :style="{ '--status': (child as iFile).status }" :type="child.type" tabindex="-1"
            >
                <img :src="child.icon || DEFAULT_FILE_ICON">
                <input v-if="(child as iFile).rename" :value="child.name"
                    @change="rename(child, ($event.currentTarget as HTMLInputElement).value)"
                    @blur="(child as iFile).rename = false"
                    @mousedown.stop @pointerdown.stop @touchstart.stop @dragstart.stop
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
        margin: .5rem 0;
        pointer-events: all;

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
            margin: .07rem;
            overflow: hidden;

            outline: none;

            > img, > span{
                pointer-events: none;
            }

            &:hover {
                background-color: rgb(44 83 222 / 18%);
            }
            
            &[selected=true] {
                background-color: rgba(44, 83, 222, 0.3);
            }

            &[selected=true]:hover {
                border-color: rgb(94, 174, 235);
            }

            &:focus{
                background-color: rgba(114, 140, 255, 0.5);
            }

            &[type=file]{
                padding-left: .95rem;
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
                font-weight: 400;
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