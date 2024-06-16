<script setup lang="ts">
    import type { vFile } from '@/data';
    import { regSelf } from '@/opener';
    import { FS, Global, splitPath } from '@/utils';
    import Viewer from 'viewerjs';
    import 'viewerjs/src/index.css';
    import { nextTick, onMounted, reactive, ref, watch } from 'vue';

    const IMAGE = [
        "avif",
        "webp",
        "jpg", "jpeg", "jxl",
        "png",
        "ico",
        "bmp"
    ];

    const opts = {
            navbar:false,
            interval: 5 * 1000,
            zoomRatio: 0.1,
            inheritedAttributes: []
        },
        elem = ref<HTMLDivElement>(),
        box = ref<HTMLDivElement>(),
        opts_ = defineProps(['option']),
        file = opts_['option'] as vFile;

    let viewer:undefined|Viewer;

    onMounted(function(){
        viewer = new Viewer(elem.value as HTMLDivElement,{
            navbar: false,
            url: 'data-url',
            interval: 3 * 1000,
            zoomRatio: .2,
            inheritedAttributes: [],
            // container: box.value as HTMLDivElement
        });
        (globalThis as any).view = viewer;
        initFile(file);
    });
    
    const images = ref<Array<vFile>>([]);

    let dir = '';
    async function initFile(f:vFile){
        if(!viewer || !elem.value) return; 
        const info = splitPath(f);

        function find(errorHandle:Function):any{
            if(!elem.value) return nextTick(() => find(errorHandle));
            const ele = elem.value.children;
            for (let i = 0; i < ele.length; i++)
                if((ele[i] as HTMLElement).dataset.path == f.path)
                    return (ele[i] as HTMLElement).click();
            errorHandle();
        }

        if(info.dir == dir){
            // 激活viewer
            find(function(){
                // 错误:重新加载
                dir = '';
                initFile(f);
            });
        }else{
            // 请求URL
            const temp:Array<vFile> = [];
            (await FS.list(info.dir)).forEach(data => 
                (data.type == 'file' && IMAGE.includes(splitPath(data)['ext'].toLowerCase())) 
                    ? temp.push(data) : null
            );
            images.value = temp;
            dir = info.dir;
            // 激活viewer
            nextTick(() => find(() => Global('ui.message').call({
                "type": "error",
                "title": "ViewerJS",
                "content":{
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                }
            })));
        }
    }

    // 监视
    watch(images,() => viewer && viewer.toggle());
    regSelf('Viewer',initFile);
</script>

<template>
    <div ref="elem">
        <img v-for="img in images" :data-url="img.url" :data-path="img.path" :src="img.url">
    </div>
    <div class="viewer-container" ref="box" style="width: 100%;height: 100%;"></div>
</template>