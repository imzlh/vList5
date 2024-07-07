<script setup lang="ts">
    import type { MessageOpinion, vFile } from '@/data';
    import { Global, getConfig, regConfig } from '@/utils';
    import { Float16Array } from '@petamoriken/float16';
    import { ref, watch } from 'vue';

    const opts = defineProps(['option']),
        file = opts['option'] as vFile,
        selected = ref(-1),
        info = ref({} as {
            "8": number,
            "16": number,
            "u8": number,
            "u16": number,
            "f16": number,
            "s8": string,
            "s16": string
        }),
        range = ref(1),
        binary = ref<Uint8Array>(),
        CONFIG = getConfig('hexviewer'),
        CLIP = CONFIG.clip;
    let fullbin:ArrayBuffer;
    const match = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

    try{
        const xhr = await fetch(file.url);
        if(!xhr.ok) throw new Error('Response is not OK');
        fullbin = new Uint8Array(await xhr.arrayBuffer());

        // 动态更新列表
        watch(range,
            i => binary.value = new Uint8Array(fullbin.slice((range.value -1) * CLIP.value,range.value * CLIP.value)),
            {immediate: true}
        );

        // 检测选中的元素变化
        watch(selected,function(i){
            if(!binary.value) return;
            const data = binary.value[i + (range.value -1) * CLIP.value];
            
            info.value = {
                "8": new Int8Array([data])[0],
                "16": new Int16Array([data])[0],
                "u8": data,
                "u16": new Uint16Array([data])[0],
                "f16": new Float16Array([data])[0],
                "s8": new TextDecoder('utf-8').decode(binary.value.buffer.slice(i * 2, i * 2 + 2)),
                "s16": String.fromCharCode(data)
            };
        },{immediate: true});
    }catch(e){
        Global('ui.message').call({
            "type": "error",
            "title": "文件资源管理器",
            "content":{
                "title": '获取内容失败',
                "content": (e as Error).message
            }
        } satisfies MessageOpinion);
        console.error(e);
    }
</script>

<template>
    <div class="hex-app">
        <div class="hex">
            <span v-for="i in match" class="header">0{{ i }}</span>
            <span v-for="(hex,offset) in binary"
                :active="offset == selected "
                @click="selected = offset"
            >{{ match[hex >> 4] + '' + match[hex % 16] }}</span>
        </div>
        <table class="dataview" v-if="selected != -1">
            <tr>
                <td>2进制</td>
                <td>{{ info[8].toString(2) }}</td>
            </tr>
            <tr>
                <td>8进制</td>
                <td>{{ info[8].toString(8) }}</td>
            </tr>
            <tr>
                <td>10进制</td>
                <td>{{ info[8].toString(10) }}</td>
            </tr>
            <tr>
                <td>16进制</td>
                <td>{{ info[8].toString(16).toUpperCase() }}</td>
            </tr>
            <hr>
            <tr>
                <td>8位整数</td>
                <td>{{ info.u8 }}</td>
            </tr>
            <tr>
                <td>16位整数</td>
                <td>{{ info.u16 }}</td>
            </tr>
            <tr>
                <td>8位自然数</td>
                <td>{{ info[8] }}</td>
            </tr>
            <tr>
                <td>16位自然数</td>
                <td>{{ info[16] }}</td>
            </tr>
            <tr>
                <td>16位浮点数</td>
                <td>{{ info.f16 }}</td>
            </tr>
            <tr>
                <td>UTF8字符</td>
                <td>{{ info.s8 }}</td>
            </tr>
            <tr>
                <td>UTF16字符</td>
                <td>{{ info.s16 }}</td>
            </tr>
        </table>
        <div class="range">
            <div v-for="i in Math.ceil(fullbin.byteLength / 2 / CLIP)"
                @click="range = i"
                :active="range == i"
            >{{ i }}</div>
        </div>
    </div>
</template>

<script lang="ts">
    regConfig('hexviewer',[
        {
            "type": "number",
            "step": 1 * 1024,
            "desc": "Hex文件切片大小，不建议太大或太小",
            "name": "切片大小",
            "default": 16 * 1024,
            "key": "clip"
        }
    ])
</script>

<style lang="scss">
    .hex-app{
        display: flex;
        height: 100%;
        overflow-y: auto;

        @mixin hex{
            display: inline-block;
            width: 2rem;
            font-size: .85rem;
            text-align: center;
            box-sizing: border-box;
        }

        > .hex{
            width: 33rem;
            overflow-y: scroll;
            padding-top: 3rem;
            flex-shrink: 0;
            user-select: none;

            > *{
                @include hex();
                color: rgb(120, 115, 115);

                &:hover{
                    color: black;
                }
                
                &[active=true]{
                    border: solid .1rem rgb(104, 161, 253);
                    background-color: rgb(206, 219, 240);
                    border-radius: .2rem;
                }

                &.header{
                    color: rgb(30, 130, 192);
                }
            }
        }

        > table{
            font-size: .9rem;

            * {
                border: none;
            }

            > tr > td{
                padding: .15rem .25rem;
            }

            > tr > td:nth-child(odd){
                background-color: whitesmoke;
            }
        }

        > .range{
            position: absolute;
            bottom: .5rem;
            right: .5rem;
            display: flex;
            overflow: hidden;
            border-radius: .25rem;
            padding: .25rem;
            gap: .25rem;
            z-index: 1;
            background-color: rgba(255, 255, 255, 0.6);
            box-shadow: 0 .1rem .5rem #d7d5d5;
            font-size: .8rem;
            max-width: 50vw;
            overflow-x: auto;

            > div{
                padding: .25rem 0;
                min-width: 1.8rem;
                border-radius: .25rem;
                text-align: center;
                cursor: pointer;

                &[active=true]{
                    background-color: rgb(229, 228, 228);
                }
            }
        }
    }
</style>