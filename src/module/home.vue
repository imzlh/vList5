<script lang="ts">
    import { reactive, shallowRef, type Directive } from 'vue';
    import { Global } from '@/utils';
    import I_VLIST from '/favicon.svg';
    import { nextTick } from 'vue';

    interface Log{
        type: 'info' | 'warn' | 'error',
        message: string,
        time: string,
        trace?: Array<string>
    }

    const logs = reactive<Array<Log>>([]),
        objCache = [] as Array<Object>,
        viewObj = shallowRef<Object>();

    function highlight(input: any) {
        switch (typeof input) {
            case 'string':
                return input;
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
                else if (Array.isArray(input)) return `<span obj data-id="${objCache.push(input) - 1}">Array[${input.length}]</span>`;
                else if (input instanceof Error) return `<span style="color: red">Error(${input.message})</span>`;
                else if (input instanceof HTMLElement) return `<span dom><${input.tagName.toLowerCase()}${input.id ? '#' + input.id : ''
                    }${input.classList.length > 0 ? '.' + Array.from(input.classList).join('.') : ''
                    }}></span>`;
                else return `<span obj data-id="${objCache.push(input) - 1}">Object(${input.constructor.name})</span>`;
            case 'function':
                return `<span func>${input.name || 'anonymous'}</span>`;
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
                        return String(data);

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
                            else id = '<' + data.tagName.toLowerCase() + '>';
                            return `<span dom>${id}</span>`;
                        }
                    case 'O':
                        const id = objCache.push(data) - 1;
                        return `<span obj data-id="${id}">${data.constructor.name}</span>`;

                    case 'c':
                        unclosed_span++;
                        return `<span style="${data}">`;

                    default:
                        return _;
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
        }else{
            viewObj.value = undefined;
        }
    }

    function createObjectDisplay(obj: Record<string, any>, container: HTMLElement) {
        const objContainer = document.createElement('div');
        objContainer.className = 'obj-wrapper';

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const itemContainer = document.createElement('div');
                itemContainer.className = 'item';
                const keySpan = document.createElement('span');
                keySpan.className = 'key';
                keySpan.textContent = key + ': ';
                itemContainer.appendChild(keySpan);

                if (typeof value === 'object' && value !== null) {
                    const details = document.createElement('details');
                    const summary = document.createElement('summary');
                    summary.textContent = Array.isArray(value) ? '[' + value.length + ']' : '{ ... }';
                    details.appendChild(summary);

                    if (Array.isArray(value)) {
                        const arrayContainer = document.createElement('div');
                        value.forEach((item, index) => {
                            arrayContainer.appendChild(createObjectDisplay(item, arrayContainer));
                            if (index < value.length - 1) {
                                arrayContainer.appendChild(document.createTextNode(', '));
                            }
                        });
                        details.appendChild(arrayContainer);
                    } else {
                        details.appendChild(createObjectDisplay(value, details));
                    }

                    itemContainer.appendChild(details);
                } else {
                    const valueSpan = document.createElement('span');
                    valueSpan.innerHTML = highlight(value);
                    const title = String(value);
                    valueSpan.title = title.length > 100 ? title.substring(0, 100) + '...' : title;
                    itemContainer.appendChild(valueSpan);
                }

                objContainer.appendChild(itemContainer);
            }
        }

        container.appendChild(objContainer);
        return objContainer;
    }
    const vPrint = {
        mounted(el: HTMLElement, obj){
            createObjectDisplay(obj.value, el);
        }
    } satisfies Directive;

    // 拦截日志
    console.info = (...args) => logs.push({ type: 'info', message: formatLog(args), time: new Date().toLocaleString(), trace: Error().stack?.split('\n').slice(2) });
    console.warn = (...args) => logs.push({ type: 'warn', message: formatLog(args), time: new Date().toLocaleString(), trace: Error().stack?.split('\n').slice(2) });
    console.error = (...args) => logs.push({ type: 'error', message: formatLog(args), time: new Date().toLocaleString(), trace: Error().stack?.split('\n').slice(2) });
    console.trace = console.log = console.info;
    if(import.meta.env.DEV) console.debug = console.info;
    console.clear = () => {logs.splice(0, logs.length), objCache.splice(0, objCache.length)};
    document.addEventListener('DOMContentLoaded', () => console.info(`%c${name} V${version}`, 'color: #2cae61; padding: .5rem 1rem; background-color: #d5f9ff;'));
    window.addEventListener('error', (event) => logs.push({ type: 'error', message: event.message, time: new Date().toLocaleString(), trace: event.error.stack.split('\n').slice(2) }));
    window.addEventListener('unhandledrejection', (event) => logs.push({ type: 'error', message: event.reason, time: new Date().toLocaleString(), trace: event.reason.stack.split('\n').slice(2) }));
</script>

<script lang="ts" setup>
    import { version, name } from '/package.json';
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
                <small>{{ log.time }}</small><br>
                <ul v-if="log.trace && log.trace.length > 0">
                    <li v-for="trace in log.trace">{{ trace }}</li>
                </ul>
            </div>
        </div>

        <div class="obj-viewer" v-if="!!viewObj" v-print="viewObj" 
            :objname="viewObj.constructor.name"
        ></div>
    </div>
</template>
    <style>
        .obj-wrapper {
            border: 1px solid #ccc;
            padding: 10px;
            margin: 10px;
        }
        .key {
            font-weight: bold;
        }
    </style>

<style lang="scss">
    .debug-info{
        height: 100%;

        > .app-info {
            background-image: linear-gradient(45deg, #b1f8ff, #cbffa1);
            text-align: center;
            padding: 2rem 0;
            height: 6rem;

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

                > span{
                    display: flex;
                    align-items: center;
                    font-size: .8rem;
                    font-weight: 300;
                    gap: .5rem;

                    &::before{
                        display: block;
                        width: 1rem;
                        height: 1rem;
                        flex-shrink: 0;
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
                    font-size: 0.8rem;
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

        > .obj-viewer{
            position: absolute;
            top: 1rem;
            left: 0; right: 0;
            max-width: 25rem;
            margin: auto;
            z-index: 55;
            padding: 1rem;
            box-shadow: 0 0 1rem white;
            border-radius: .5rem;
            background-color: white;
            font-size: .8rem;
            max-height: 60vh;
            overflow-y: auto;

            &::before{
                content: attr(objname) '{';
            }

            &::after{
                content: '}';
            }

            summary{
                font-weight: 300;
                font-size: .85rem;
            }

            div.obj-wrapper{
                border: none;
                margin: 0;
                padding: 0 0 0 .75rem;
            }

            div.item{
                display: flex;
                gap: .5rem;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;

                > span{
                    font-size: .8rem;
                    white-space: nowrap;
                    overflow: hidden;
                    font-weight: 300;
                    flex-shrink: 0;
                }

                > span.key{
                    color: #89a5ff;
                    font-weight: 400;
                }

                > details{
                    flex-grow: 1;
                    font-weight: 300;
                }
            }
        }

        > .logs, > .obj-viewer{
            span{
                &[num]{
                    color: #538bec;
                }

                &[obj]{
                    color: #c02dc0;
                    cursor: pointer;
                    font-weight: 500;
                    border-bottom: dashed .05rem rgb(54, 239, 177);
                }

                &[bool]{
                    font-weight: 400;
                    font-family: sans-serif;
                    font-style: italic;
                }

                &[func]{
                    color: #1fd7a6;
                    border-bottom: dotted .05rem gray;
                    
                    &::before{
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
        }
    }
</style>