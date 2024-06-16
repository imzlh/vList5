<script setup lang="ts">
    import type { AlertOpts } from '@/data';
    import { Global } from '@/utils';
    import { reactive, ref } from 'vue';

    const data = reactive<Array<AlertOpts>>([]);

    function call(role:string|Function,i:number){
        if(role == 'close') delete data[i];
        else if(role == 'submit') data[i].callback(data[i].data);
        else (role as Function)(data[i].data);
    }

    Global('ui.alert').data = (d:AlertOpts) => data.push(d);
</script>

<template>
    <div class="alert-layer">
        <template v-for="(item,i) in data">
            <div :type="item.type" v-if="item">
                <div class="basic">
                    <h3 v-if="item.title">{{ item.title }}</h3>
                    <span>{{ item.message }}</span>

                    <input type="text" v-model="item.data" v-if="item.type == 'prompt'">
                </div>
                <div class="btns">
                    <div style="flex-grow: 1;"></div>
                    <template v-if="item.button">
                        <button v-for="btn in item.button" :style="{color: btn.color}" @click="call(btn.role,i)">
                            {{ btn.content }}
                        </button>
                    </template>
                    <template v-else>
                        <button style="background-color: #e5e5e5" 
                            @click="item.type == 'confirm' && item.callback(item.data = false);delete data[i];"
                        >
                            取消
                        </button>
                        <button style="color: white;" 
                            @click="item.type == 'confirm' && (item.data = false);item.callback(item.data);delete data[i];
                            "
                        >
                            确定
                        </button>
                    </template>
                </div>
            </div>
        </template>
        
    </div>
</template>

<style lang="scss">
    @import '../public/button.scss';

    @keyframes fadein{
        from{
            transform: rotateX(90deg) translateY(-50%);
            opacity: 0;
        }to{
            transform: rotateX(0deg) translateY(0);
            opacity: 1;
        }
    }

    .alert-layer{
        position: absolute;
        top: 1rem;
        left: 0;
        right: 0;
        margin: auto;
        width: 100vw;
        max-width: 23rem;
        z-index: 120;

        > div{
            margin: 0 0 1rem 0;
            box-sizing: border-box;
            box-shadow: .35rem .15rem 1rem .25rem rgba(198, 193, 193, 0.87);
            border-radius: .35rem;
            border-width: .1rem;
            border-color: #969696;
            background-color: rgba(255, 255, 255, 0.8);
            overflow: hidden;
            transition: all .2s;
            animation: fadein .5s;

            &:hover{
                background-color: white;
            }

            .basic{
                padding: 1rem;
                font-size: .85rem;
                
                h3{
                    margin: 0;
                    color: #353333;
                    font-weight: 500;
                    font-size: 1rem;
                }

                span{
                    margin: .5rem 0;
                    display: block;
                    color: #8e8888;
                    word-break: break-all;
                }

                input{
                    border: none;
                    outline: none;
                    border-bottom: solid .1rem #7bc8cf;
                    background-color: transparent;
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: .35rem .5rem;
                }
            }

            .btns{
                background-color: rgb(247 247 247);
                @include ui_btn-group();

                button{
                    background-color: rgb(139 191 234);
                    padding: .35rem 1rem;
                    margin: 0 .25rem;
                    font-size: .8rem;
                    flex-shrink: 0;
                    cursor: pointer;
                }
            }
        }
    }
</style>