<script setup lang="ts">
    import type { vFile } from '@/env';
    import { size2str } from '@/utils';
    import { onUnmounted } from 'vue';

    const opts = defineProps(['option']),
        file = opts['option'] as vFile,
        ev = defineEmits(['play']),
        family = Math.floor(Math.random() * 10000000).toString(36);

    let error = '' ,font:FontFace ,binary:ArrayBuffer;

    try{
        const xhr = await fetch(file.url);
        if(!xhr.ok) throw new Error('Response is not OK');
        binary = await xhr.arrayBuffer();
    }catch(e){
        error = '网络请求失败';
        throw e;
    }

    try{
        font = new FontFace(family, binary);
        await font.load();
        document.fonts.add(font);
        font.family
    }catch(e){
        error = '字体加载失败';
        throw e;
    }
    onUnmounted(() => document.fonts.delete(font));
    console.log('Font init:', family);
</script>

<template>
    <div class="font-viewer">
        <textarea class="font-input" v-if="error == ''" :style="{ fontFamily: '\'' + family + '\'' }">1234567890
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
今天天气不错 What a sunny day
-------------- 字体信息 ------------------
文件名称: {{ file.name }}
文件大小: {{ size2str(file.size) }}
字体家族(可能有误): {{ font.family }}
可用unicode: {{ font.unicodeRange }}
-------------------------------------
        </textarea>
        <div v-else>
            <i vs-icon="warning" />
            <h2>{{ error }}</h2>
        </div>
    </div>
</template>

<style lang="scss">
    .font-viewer{
        > *,&{
            width: 100%;
            height: 100%;
        }

        > textarea.font-input{
            display: block;
            padding: 1rem;
            font-size: 1rem;
            resize: none;
            border: none;
            outline: none;
        }

        > div{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            > i{
                display: block;
                width: 4.5rem;
                height: 4.5rem;
                opacity: .6;
            }
        }
    }
</style>