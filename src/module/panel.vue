<script lang="ts" setup>
    const _ = ui;
</script>

<script lang="ts">
    import type { Command } from '@/env';
    import { reactive, ref, watch } from 'vue';

    const commands = ref<Array<Command & { hide?: boolean }>>([{
        "name": "global.reload",
        "title": "重新加载vList",
        "handler": () => location.reload()
    },{
        "name": "action.about",
        "title": "关于vList",
        "handler": () => window.open('https://github.com/imzlh/vList5/')
    },{
        "name": "action.close",
        "title": "关闭",
        "handler": () => void 0
    }]),
        ui = reactive({
            input: '',
            display: false,
            select: 0
        }),
        inputEl = ref<HTMLDivElement>();

    watch(() => ui.input, v => commands.value.forEach(c => v || (c.name.includes(v) || c.title.includes(v)) && (c.hide = true)));
    watch(() => ui.display, v => v ? requestAnimationFrame(() => {
        commands.value.forEach(c => c.hide = false)
        inputEl.value!.focus()
    }) : inputEl.value?.blur());
    function keyEV(ev: KeyboardEvent){
        switch(ev.key){
            case 'ArrowDown':
                do{
                    ui.select == commands.value.length - 1? ui.select = 0 : ui.select ++;
                }while(commands.value[ui.select].hide);
            break;

            case 'ArrowUp':
                do{
                    ui.select == 0? ui.select = commands.value.length - 1 : ui.select --;
                }while(commands.value[ui.select].hide);
            break;

            case 'Enter':
                commands.value[ui.select].handler();
                ui.display = false;
            break;

            case 'Escape':
                ui.display = false;
                ui.select = 0;
            break;

            case 'Delete':
                ui.input = '';
            break;

            default:
                return;
        }

        ev.preventDefault();
    }

    /**
     * 注册命令
     * @param args 命令对象
     * @returns 销毁命令的函数
     */
    export function register(...args: Command[]): () => void;
    export function register (){
        const cache = {} as Record<string, number>;
        commands.value.forEach((c, i) => cache[c.name] = i)
        for(const arg of arguments)
            if(arg.name in cache) commands.value[cache[arg.name]] = arg;
            else commands.value.unshift(arg);

        // 销毁命令
        return () => {
            const cache = {} as Record<string, number>;
            commands.value.forEach((c, i) => cache[c.name] = i)
            for(const arg of arguments)
                delete commands.value[cache[arg.name]];
            commands.value = commands.value.filter(c => c);
        }
    };
    document.addEventListener('keydown', event => event.ctrlKey && event.key === 'r' && (ui.display = true, event.preventDefault()));
</script>

<template>
    <div class="command-panel-wrapper" v-show="_.display">
        <input type="text" v-model="_.input" placeholder="输入命令" ref="inputEl"
            @blur="_.display = false; _.select = 0; _.input = '';" @keydown="keyEV"
        >
        <ul class="commands">
            <li v-for="(command, i) in commands" v-show="!command.hide" @click="_.display = false; command.handler();_.select = 0; "
                :select="_.select == i"
            >
                {{ command.title }}
            </li>
        </ul>
    </div>
</template>

<style lang="scss">
    .command-panel-wrapper {
        position: fixed;
        top: .5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        background-color: white;
        border-radius: 0.3rem;
        padding: .25rem;
        box-shadow: 0 0 .5rem 0.35rem rgba(0, 0, 0, 0.1);
        width: 20rem;
        max-width: 90vw;

        &:active{
            display: block!important;
        }

        *{
            box-sizing: border-box;
        }

        > input{
            outline: none;
            border: solid .1rem rgb(225, 225, 225);
            padding: .25rem .35rem;
            font-size: .75rem;
            color: rgb(159, 155, 155);
            border-radius: 0.2rem;
            display: block;
            width: 100%;

            &:focus{
                border-color: #66b9fd;
                color: #4f4f4f
            }
        }

        > ul{
            list-style: none;
            margin: .35rem 0 0 0;
            padding: 0;
            font-size: .75rem;
            color: rgb(159, 155, 155);

            > li{
                margin: .1rem 0;
                padding: .15rem .5rem;
                cursor: pointer;
                transition: background-color .2s ease-in-out;
                border-radius: .2rem;

                &:hover{
                    background-color: #e8e8e8;
                }

                &[select=true]{
                    background-color: #e0eaff;
                }
            }
        }
    }
</style>