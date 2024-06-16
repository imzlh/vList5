<script lang="ts">
    import type { AlertOpts, CtxDispOpts, CtxMenuData, FileOrDir, vDir, vFile } from '@/data';
    import { DEFAULT_FILE_ICON, FS, Global, getOpenerId, load, openFile, reloadTree, size2str, splitPath } from '@/utils';
    import { ref, watch } from 'vue';

    let marked = [] as Array<FileOrDir>;
    const markmap = ref<Array<string>>([]);

    export default {
        name: 'tree',
        props: {
            data: {
                required: true,
                type: Object
            },
            topLevel: {
                required: false,
                type: Boolean,
                default: true
            },
            active: {
                required: false,
                type: Boolean,
                default: true
            }
        },
        setup: function (prop) {
            const show = ref<boolean>(prop.data.show || false),
                locked = ref(false);
            return {
                show,
                locked,
                load,
                DEFAULT_FILE_ICON,
                openFile,
                markmap
            };
        },
        methods: {
            desc(data:FileOrDir){
                var tmp = data.dispName || data.name;
                if(data.ctime > 0) tmp += '\n创建日期: ' + (new Date(data.ctime).toDateString());
                if(data.type == 'dir') tmp += '\n类型: 文件夹';
                else{
                    if(data.size) tmp += '\n文件大小: ' + size2str(data.size);
                    tmp += '\n类型: ' + splitPath(data)['ext'].toUpperCase() + '文件';
                }
                return tmp;
            },
            markup(ev:MouseEvent,self:FileOrDir){
                if(ev.shiftKey){
                    marked.push(self);
                    markmap.value.push(self.path);
                }else{
                    marked = [self];
                    markmap.value = [self.path];
                }
            },
            folder(){
                if(this.locked) this.show = true
                else if(this.data.child) this.show = !this.show;
                else{
                    load(this.data as any)
                        .then(() => this.locked = false);
                    this.locked = true;this.show = true;
                }
            },
            ctxmenu(e:MouseEvent){
                const item = [
                    {
                        "text": "创建",
                        "icon": "icon/new.webp",
                        "child": [
                            {
                                "text": "文件夹",
                                "icon": "icon/folder.webp",
                                handle: () => 
                                    Global('ui.alert').call({
                                        "type": "prompt",
                                        "title": "创建文件夹",
                                        "message": "请输入文件夹名称",
                                        callback: (data) => 
                                            // 创建文件夹
                                            FS.mkdir((this.data as vFile).path + data)
                                                .then(() => load(this.data as vDir)),
                                    } satisfies AlertOpts)
                            },{
                                "text": "文件",
                                "icon": "icon/textfile.webp",
                                handle: () => 
                                    Global('ui.alert').call({
                                        "type": "prompt",
                                        "title": "新建文件",
                                        "message": "请输入文件名称",
                                        callback: (data) => 
                                            // 创建文件夹
                                            FS.touch((this.data as vFile).path + data)
                                                .then(() => load(this.data as vDir)),
                                    } satisfies AlertOpts)
                            }
                        ],
                    },{
                        "text": "刷新",
                        "icon": "icon/refresh.webp",
                        handle: () => {
                            load(this.data as vDir)
                        },
                    },'---',{
                        "text": "剪切",
                        "icon": "icon/cut.webp",
                        handle:() => {
                            FS.mark('move',marked);
                        },
                    }, {
                        "text": "复制",
                        "icon": "icon/copy.webp",
                        handle: () => {
                            FS.mark('copy',marked);
                        },
                    }
                ] as Array<CtxMenuData>;

                if(marked.length > 0){
                    item.push({
                        "text": "粘贴",
                        "icon": "icon/paste.webp",
                        handle: () => {
                            FS.exec(this.data as vDir);
                        }
                    });
                }

                item.push({
                    "text": "删除",
                    "icon": 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23b7a6a6" viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/></svg>',
                    handle: async () => {
                        if( await FS.deleteAll(marked) === false) return;
                        const refdir = [] as Array<string>;
                        for (const file of marked) {
                            const dir = splitPath(file)['dir'];
                            if(!refdir.includes(dir)) refdir.push(dir);
                        }

                        // 刷新
                        reloadTree(refdir);
                    }
                });
                
                if(marked.length == 1){
                    item.push({
                        "text": "重命名",
                        "icon": "icon/rename.webp",
                        handle: () => {
                            Global('ui.alert').call({
                                "type": "prompt",
                                "message": marked[0].dispName || marked[0].name,
                                "title": "重命名此文件为:",
                                callback(data) {
                                    if(!data) return;
                                    let dir = marked[0].path;
                                    // 是文件夹
                                    if(dir[dir.length-1] == '/')
                                        dir = dir.substring(0,dir.length-1);
                                    // 寻找斜杠
                                    const pos = dir.lastIndexOf('/');
                                    // 文件夹
                                    dir = dir.substring(0,pos + 1);
                                    // 目标
                                    let newp = dir + data;
                                    // 移动文件
                                    FS.move(marked[0].path,newp)
                                        // 重新加载文件夹
                                        .then(() => reloadTree([dir]));
                                },
                            } satisfies AlertOpts)
                        },
                    });
                }

                
                if(marked.length == 1 && marked[0].type == 'file'){
                    item.push('---',{
                        "text": "打开",
                        "icon": "icon/open.webp",
                        handle: () => openFile(marked[0]),
                    },{
                        "text": "打开方式",
                        "icon": "icon/opener.webp",
                        handle() {
                            Global('opener.chooser.choose').call(marked[0])
                                .then(opener => opener.open(marked[0]));
                        },
                    });
                }

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
    <div class="vlist" :show="show" :active="active" v-if="topLevel" @contextmenu.prevent="ctxmenu">

        <div class="parent" @dblclick.stop="openFile(data as vFile)"
            @click="markup($event,data as any)" :selected="markmap.includes(data.path)"
            :title="desc(data as any)">
            <div :class="['btn-hide', { 'show': show }]" @click.stop="folder"></div>
            <img :src="data.icon" v-if="data.icon">
            <span>{{ data.dispName || data.name }}</span>
        </div>

        <div v-if="data.child" class="child" v-show="show">
            <template v-for="(child,i) in data.child">

                <tree v-if="child.type == 'dir'" 
                    :data="child" :top-level="false"
                />

                <div v-else :class="['item',child.type]" :title="desc(child)"
                    @click="markup($event,child)"
                    @dblclick.stop="openFile(child as vFile)"
                    :selected="markmap.includes(child.path)"
                >
                    <img :src="child.icon || DEFAULT_FILE_ICON">
                    <span>{{ child.dispName || child.name }}</span>
                </div>

            </template>
        </div>
    </div>


    <template  v-else >
        <div class="parent" @dblclick.stop="openFile(data as vFile)"
            @click="markup($event,data as any)" :selected="markmap.includes(data.path)"
            :title="desc(data as any)">
            <div :class="['btn-hide', { 'show': show }]" @click.stop="folder"></div>
            <img :src="data.icon" v-if="data.icon">
            <span>{{ data.dispName || data.name }}</span>
        </div>

        <div v-if="data.child" class="child" v-show="show">
            <template v-for="(child,i) in data.child">

                <tree v-if="child.type == 'dir'" 
                    :data="child" :top-level="false" 
                />

                <div v-else :class="['item',child.type]" :title="desc(child)"
                    @click="markup($event,child)"
                    @dblclick.stop="openFile(child as vFile)"
                    :selected="markmap.includes(child.path)"
                >
                    <img :src="child.icon || DEFAULT_FILE_ICON">
                    <span>{{ child.dispName || child.name }}</span>
                </div>

            </template>
        </div>
    </template>
</template>

<style lang="scss">
.vlist {
    display: block;
    margin: .5rem 0;

    &[show=false]>div:not(.parent) {
        display: none;
    }

    &[active=true]{
        .parent, .item{
            &[selected=true] {
                background-color: rgba(44, 83, 222, 0.3);
            }

            &[selected=true]:hover {
                border-color: rgb(94, 174, 235);
            }
        }
    }

    .child{
        padding-left: 1rem;
    }

    .parent,
    .item {
        display: flex;
        user-select: none;
        border: solid .05rem transparent;
        border-radius: .2rem;
        min-height: 1rem;
        margin: .07rem;
        overflow: hidden;

        outline: none;

        &.file{
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

            &.show {
                transform: rotate(180deg);
            }
        }

        >span {
            font-size: .8rem;
            font-weight: 400;
            flex-grow: 1;
            pointer-events: none;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }

        // &.active {
        //     background-color: rgba(126, 118, 118, 0.3);
        // }

        &:hover {
            background-color: rgb(44 83 222 / 18%);
        }

        &[selected=true] {
            background-color: rgb(122 122 122 / 20%);
        }
    }

    >.parent {
        padding: .2rem;
    }
}
</style>