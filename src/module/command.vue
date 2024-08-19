<script lang="ts" setup>
    import type { Command } from '@/env';
    import { Global } from '@/utils';
    import { reactive, ref, watch } from 'vue';

    const commands = reactive<Array<Command & { hide?: boolean }>>([{
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

    watch(() => ui.input, v => commands.forEach(c => v || (c.name.includes(v) || c.title.includes(v)) && (c.hide = true)));
    watch(() => ui.display, v => v && requestAnimationFrame(() => {
        commands.forEach(c => c.hide = false)
        inputEl.value!.focus()
    }));
    watch(inputEl, inp => inp && inp.addEventListener('keydown', function(ev){
        switch(ev.key){
            case 'ArrowDown':
                do{
                    ui.select == commands.length - 1? ui.select = 0 : ui.select ++;
                }while(commands[ui.select].hide);
            break;

            case 'ArrowUp':
                do{
                    ui.select == 0? ui.select = commands.length - 1 : ui.select --;
                }while(commands[ui.select].hide);
            break;

            case 'Enter':
                commands[ui.select].handler();
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
    }))

    // 注册
    Global('ui.command').data = function(){
        const cache = {} as Record<string, number>;
        commands.forEach((c, i) => cache[c.name] = i)
        for(const arg of arguments)
            if(arg.name in cache) commands[cache[arg.name]] = arg;
            else commands.unshift(arg);

        // 销毁命令
        return () => {
            const cache = {} as Record<string, number>;
            commands.forEach((c, i) => cache[c.name] = i)
            for(const arg of arguments)
                delete commands[cache[arg.name]];
        }
    };
    document.addEventListener('keydown', event => event.ctrlKey && event.key === 'r' && (ui.display = true, event.preventDefault()));
</script>

<template>
    <div class="command-panel-wrapper" v-show="ui.display">
        <input type="text" v-model="ui.input" placeholder="输入命令" ref="inputEl"
            @blur="ui.display = false; ui.select = 0; ui.input = '';"
        >
        <ul class="commands">
            <li v-for="(command, i) in commands" v-show="!command.hide" @click="ui.display = false; command.handler();ui.select = 0; "
                :select="ui.select == i"
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