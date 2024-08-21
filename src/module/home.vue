<script lang="ts">
    import { computed, reactive, ref, shallowRef, type Directive } from 'vue';
    import ObjTree from './objTree.vue';
import { _eval } from '@/utils/eval';

    interface Log{
        type: 'info' | 'warn' | 'error' | 'eval',
        message: string,
        time: string,
        trace?: Array<string>
    }

    const logs = reactive<Array<Log>>([]),
        objCache = [] as Array<Object>,
        viewObj = shallowRef<Object>(),
        viewTeteTo = shallowRef<HTMLElement>(),
        search = reactive({
            text: '',
            active: false,
            curpos: 0,
            resId: 0
        }),
        searchRes = computed(() => {
            if(!search.text) return [];
            const texts = search.text.split('.');
            let target = window as Record<string, any>;
            for(let i = 0; i < texts.length-1; i++){
                if(!target[texts[i]]) return [];
                target = target[texts[i]];
            }

            // 搜索
            const allKeys: (obj: Record<string, any>) => string[] = obj => obj.__proto__ ? Object.keys(obj).concat(allKeys(obj.__proto__)) : Object.keys(obj);
            return allKeys(target).filter(key => key.toLowerCase().includes(texts[texts.length-1].toLowerCase()));
        });

    const encodeHTMLChar = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace('\n', '</span><br/><span>')
        .replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;');

    const vScroll = {
        updated(el: HTMLElement, data){
            data.value && el.scrollIntoView();
        }
    } as Directive;

    function highlight(input: any) {
        switch (typeof input) {
            case 'string':
                return encodeHTMLChar(input);
            case 'number':
            case 'bigint':
                return `<span num>${input}</span>`;
            case 'boolean':
                return `<span style="color: ${input ? 'green' : '#dabf34'}" bool>${input ? 'true' : 'false'}</span>`;
            case 'symbol':
                return `<span obj>Symbol(${input.description})</span>`;
            case 'undefined':
                return `<span style="color: gray">undefined</span>`;
            case 'object':
                if (input === null) return `<span style="color: gray">null</span>`;
                else if (Array.isArray(input)) return `<span obj tabindex="-1" data-id="${objCache.push(input) - 1}">Array[${input.length}]</span>`;
                else if (input instanceof Error) return `<span style="color: red">Error(${input.message})</span>`;
                else if (input instanceof HTMLElement) return `<span dom><${input.tagName.toLowerCase()}${input.id ? '#' + input.id : ''
                    }${input.classList.length > 0 ? '.' + Array.from(input.classList).join('.') : ''
                    }}></span>`;
                else return `<span obj tabindex="-1" data-id="${objCache.push(input) - 1}">Object(${input.constructor.name})</span>`;
            case 'function':
                return `<span func tabindex="-1" data-id="${objCache.push(input.__proto__) - 1}">${input.name || 'anonymous'}</span>`;
        }
    }

    function formatLog(logs: Array<any>){
        const preg = /\%([sdifoOc])/g;

        if(typeof logs[0] =='string' && preg.test(logs[0])){
            let i = 1, unclosed_span = 0;
            return (logs[0] as string).replace(preg, (_, type) => {
                let data = logs[i++];
                switch(type){
                    case's': 
                        return encodeHTMLChar(String(data));

                    case 'i':
                    case 'd': 
                        if(typeof data != 'number') data = parseInt(data);
                        else if(data % 1 != 0) data = data.toFixed(0);
                        return `<span num>${data}</span>`;

                    case 'f': 
                        if(typeof data != 'number') data = parseFloat(data);
                        if(data % 1 == 0) return `<span num>${data}.0</span>`;
                        else return `<span num>${data}</span>`;

                    case 'o':
                        if(typeof data == 'object' && (data instanceof HTMLElement)){
                            const classList = Array.from(data.classList);
                            let id = '';
                            if(data.id) id = data.tagName.toLowerCase() + '#' + data.id;
                            else if(classList.length > 0) id = data.tagName.toLowerCase() + '.' + classList.join('.');
                            else id = '&lt;' + data.tagName.toLowerCase() + '&gt;';
                            return `<span dom>${id}</span>`;
                        }
                    case 'O':
                        const id = objCache.push(data) - 1;
                        return `<span obj tabindex="-1" data-id="${id}">${data.constructor.name}</span>`;

                    case 'c':
                        unclosed_span++;
                        return `<span style="${data}">`;

                    default:
                        return encodeHTMLChar(_);
                    }
            }) + '</span>'.repeat(unclosed_span);
        }else{
            return '<span>' + logs.map(highlight).join('</span><span>') + '</span>';
        }
    }

    function handleClick(event: MouseEvent){
        const target = event.target as HTMLElement;
        if(target.tagName.toLowerCase() =='span' && target.dataset.id){
            const id = parseInt(target.dataset.id!);
            viewObj.value = objCache[id];

            let parent = target.parentElement;
            while(!parent?.classList.contains('log'))
                parent = parent!.parentElement;
            viewTeteTo.value = parent as HTMLElement;
        }else{
            viewObj.value = undefined;
        }
    }
    
    // 拦截日志
    console.info = (...args) => void logs.push({ type: 'info', message: formatLog(args), time: new Date().toLocaleString(), trace: Error().stack?.split('\n').slice(2) });
    console.warn = (...args) => void logs.push({ type: 'warn', message: formatLog(args), time: new Date().toLocaleString(), trace: Error().stack?.split('\n').slice(2) });
    console.error = (...args) => void logs.push({ type: 'error', message: formatLog(args), time: new Date().toLocaleString(), trace: Error().stack?.split('\n').slice(2) });
    console.trace = console.log = console.info;
    if(import.meta.env.DEV) console.debug = console.info;
    console.clear = () => {logs.splice(0, logs.length), objCache.splice(0, objCache.length)};
    document.addEventListener('DOMContentLoaded', () => console.info(`%c${name} V${version}`, 'color: #2cae61; padding: .5rem 1rem; background-color: #d5f9ff;'));
    window.addEventListener('error', (event) => logs.push({ type: 'error', message: event.message, time: new Date().toLocaleString(), trace: event.error.stack.split('\n').slice(2) }));
    window.addEventListener('unhandledrejection', (event) => logs.push({ type: 'error', message: event.reason, time: new Date().toLocaleString(), trace: event.reason.stack?.split('\n').slice(2) }));
</script>

<script lang="ts" setup>
    import { version, name } from '/package.json';

    function autoComplete(event: KeyboardEvent){
        if(event.key == 'ArrowUp'){
            search.resId = search.resId == 0 ? searchRes.value.length - 1 : search.resId - 1;
        }else if(event.key == 'ArrowDown'){
            search.resId = search.resId == searchRes.value.length - 1 ? 0 : search.resId + 1;
        }else if(event.key == 'Tab'){
            const prefix = search.text.substring(0, search.text.lastIndexOf('.')),
                complete = searchRes.value[search.resId];
            if(/^[0-9]+$/.test(complete)) search.text = (prefix || 'window') + '[' + complete + ']';
            else if(/^[0-9]/.test(complete) || /[^a-zA-Z0-9_]/.test(complete))
                search.text = (prefix || 'window') + '["' + complete + '"]';
            else search.text = (prefix ? prefix + '.' : '') + complete;
            search.resId = 0;
        }else if(event.key == 'Enter'){
            _eval(search.text).then(res =>{
                logs.push({
                    "type": "eval",
                    "message": 
                        `&gt; <span style="color: #5b9739; font-weight: 400;">${search.text}</span><br>
                         &lt; <span>${highlight(res)}</span>`,
                    "time": '',
                    "trace": []
                });
                search.text = '', search.resId = 0, search.active = false;
            }).catch(err => logs.push({
                "type": "error",
                "message": highlight(err),
                "time": '',
                "trace": []
            }));
        }else return;
        event.preventDefault();
    }
</script>

<template>
    <div class="debug-info">
        <div class="app-info">
            <div class="logo">
                <img src="/favicon.ico" alt="vList图标">
                <h1>{{ name }} V{{ version }}</h1>
            </div>
            <div class="action">
                <a href="https://github.com/imzlh/vList5">Github</a>
                <a href="https://hi.imzlh.top/tag/vlist/">vList NEWs</a>
                <a href="https://github.com/imzlh/vList5/issues">Issue!</a>
            </div>
        </div>

        <div class="logs" @click="handleClick">
            <div v-for="log in logs" tabindex="-1" :type="log.type" :key="log.time" class="log">
                <span v-html="log.message"></span>
                <small>{{ log.time }}</small>
                <ul v-if="log.trace && log.trace.length > 0">
                    <li v-for="trace in log.trace">{{ trace }}</li>
                </ul>
            </div>
            <Teleport v-if="viewObj" :to="viewTeteTo">
                <details class="obj item" @blur="viewObj = undefined" @click.stop tabindex="-1">
                    <summary>{{ viewObj.constructor.name }}</summary>
                    <ObjTree :obj="viewObj" />
                </details>
            </Teleport>
        </div>

        <div class="command">
            <div class="recommend" :show="searchRes.length && search.active" :style="{
                left: `${search.curpos /2}em`,
            }">
                <div v-for="(cmd, index) in searchRes" :active="search.resId == index" v-scroll="search.resId == index" @click="search.text = (search.text ? search.text + '.' : '') + cmd">{{ cmd }}</div>
            </div>
            <input type="text"
                @focus="search.active = true" @blur="search.active = false"
                @keydown="autoComplete"
                @selectionchange="search.curpos = ($event.target as HTMLInputElement).selectionStart || 0"
                v-model="search.text" placeholder="> 输入命令"
            >
        </div>
    </div>
</template>

<style lang="scss">
    .debug-info{
        height: 100%;

        > .app-info {
            background-image: linear-gradient(45deg, #b1f8ff, #cbffa1);
            text-align: center;
            padding: 2rem 0;
            height: 4.5rem;

            > .logo{
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                margin-bottom: 1rem;

                > img{
                    display: inline-block;
                    width: 3rem;
                    height: 3rem;
                }

                > h1{
                    margin: 0;
                    font-size: 1.5rem;
                    color: white;
                    font-weight: 500;
                    display: inline-block;
                }
            }

            > .action{
                font-size: .85rem;
                line-height: 1.25rem;
                
                > a{
                    margin: .1rem .5rem;
                    padding: 0 .25rem;
                    text-decoration: none;
                    color: #19a57a;
                    transition: all .2s;
                    position: relative;

                    &::before{
                        position: absolute;
                        content: '';
                        left: 0;
                        bottom: -.25rem;
                        height: .1rem;
                        background-color: #9a3eb1;
                        transition: all .2s;
                        width: 0;
                    }

                    &:hover{
                        color: #b800cb;

                        &::before{
                            width: 100%;
                        }
                    }
                }
            } 
        }

        > .logs{
            height: calc(100% - 10rem);
            overflow-x: hidden;
            overflow: auto;
            padding-bottom: 1rem;
            box-sizing: border-box;

            > div{
                padding: .35rem .75rem;
                background-color: #e5f7f2;

                max-width: 30rem;
                margin: .15rem auto;

                &[type=error]{
                    background-color: #faeaea;

                    > span::before{
                        content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23d9534f" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>');
                    }
                }   

                &[type=warn]{
                    background-color: #f7eed3;
                    
                    > span::before{
                        content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23f0ad4e" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>');
                    }
                }

                &[type=eval]{
                    background-color: #f2f2f2;

                    > span{
                        padding-left: 0;
                    }
                }

                > span{
                    // display: flex;
                    // align-items: center;
                    // flex-wrap: wrap;
                    font-size: .8rem;
                    font-weight: 300;
                    gap: .5rem;
                    position: relative;
                    padding-left: 1.5rem;
                    display: block;

                    > *{
                        display: inline-block;
                    }

                    &::before{
                        display: block;
                        width: 1rem;
                        height: 1rem;
                        flex-shrink: 0;
                        position: absolute;
                        left: 0;
                        top: 50%;
                        transform: translateY(-50%);
                    }

                    span{
                        margin-left: .35rem;
                    }
                }

                span{
                    &[num] {
                        color: #538bec;
                    }

                    &[obj] {
                        color: #c02dc0;
                        cursor: pointer;
                        font-weight: 500;
                        border-bottom: dashed .05rem rgb(54, 239, 177);
                    }

                    &[bool] {
                        font-weight: 400;
                        font-family: sans-serif;
                        font-style: italic;
                    }

                    &[func] {
                        color: #1fd7a6;
                        border-bottom: dotted .05rem gray;

                        &::before {
                            content: 'f';
                            font-size: 1rem;
                            margin-right: .35rem;
                            color: #11845f;
                            font-style: italic;
                            font-weight: 500;
                            font-family: sans-serif;
                        }
                    }
                }

                details.obj {
                    font-size: .8rem;

                    &, details{
                        > *:not(summary){
                            margin-left: .75rem;
                        }
                    }

                    summary {
                        font-weight: 300;
                        font-size: .85rem;
                    }

                    div.obj-wrapper {
                        padding-left: .75rem;
                    }

                    div.item {
                        display: flex;
                        gap: .5rem;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        overflow: hidden;
                    }

                    span {
                        font-size: .8rem;
                        white-space: nowrap;
                        overflow: hidden;
                        font-weight: 300;
                        flex-shrink: 0;
                    }

                    span.key {
                        color: #881391;
                        font-weight: 400;
                        
                        &::after{
                            content: ' : ';
                        }
                    }

                    details {
                        flex-grow: 1;
                        font-weight: 300;
                    }
                }

                > small{
                    float: right;
                    color: #d7d7d7;
                    font-size: .7rem;
                }

                > ul{
                    display: none;
                    padding: .35rem 0 .35rem .5rem;
                    margin: 0;
                    list-style: none;
                    font-size: 0.7rem;
                    line-height: 1.25rem;
                    font-weight: 200;
                    color: #9e6c33;
                    font-size: .8rem;
                    background-color: rgb(252, 237, 255);
                
                    > li{
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                }

                &:focus > ul{
                    display: block;
                }
            }
        }

        > .command{
            height: 1.5rem;
            position: relative;
            font-size: .75rem;
            background-color: #e4e9fb;
            
            > input{
                width: 100%;
                height: 100%;
                border: none;
                outline: none;
                line-height: 1.5rem;
                padding: 0 .75rem;
                border-right: solid .2rem transparent;
                letter-spacing: 1px;
                box-sizing: border-box;

                &:focus{
                    border-right-color: #19a57a;
                }
            }

            > .recommend{
                position: absolute;
                bottom: 90%;
                box-shadow: 0 0 .5rem rgba(0,0,0,.2);
                background-color: white;
                z-index: 1;
                max-height: 10rem;
                border-radius: .2rem;
                overflow-x: hidden;
                overflow-y: auto;

                > div{
                    padding: 0 .5rem;
                    line-height: 1.25rem;
                    cursor: pointer;

                    &:hover{
                        background-color: rgb(230, 230, 230);
                    }

                    &[active=true]{
                        background-color: #dadcff;
                    }
                }
            }
        }
    }
</style>