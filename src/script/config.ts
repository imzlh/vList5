import type { SettingItem, SettingItemFactory } from "@/env";
import Setting from "@/module/setting.vue";
import { Global } from "@/utils";
import { markRaw, ref, type Ref } from "vue";

import I_SETTING from '/app/settings.webp';

var CONFIG: undefined | Record<string,Array<SettingItem>>,
    cached: undefined | Record<string,Record<string,any>>;

export function regConfig(namespace: string, config:Array<SettingItemFactory>){
    if(!cached) try{
        cached = JSON.parse(localStorage.getItem('vlist5') || '{}') as Record<string,Record<string,any>>;
    }catch{
        cached = {} as Record<string,Record<string,any>>;
    }
    if(!CONFIG) CONFIG = {};
    const cache = (cached[namespace] || {}) as Record<string,string>;
    // 填充value
    function fill(config:Array<SettingItemFactory>){
        for (const item of config)
            if(typeof item == 'object')
                if(item.type == 'object')
                    fill(item.child)
                else
                    (item as any).value = ref(cache[item.key] || item.default);
    }
    fill(config);
    // 加载
    CONFIG[namespace] = config as any;
}

export function getConfig(namespace: string){
    // 创建新配置
    if(!CONFIG) return CONFIG = {};
    if(namespace in CONFIG){
        const temp = {} as Record<string,Ref<any>>;
        
        function proc(obj:Array<SettingItem>){
            for (const item of obj)
                if(typeof item == 'object')
                    if(item.type == 'object')
                        proc(item.child);
                    else
                        temp[item.key] = item.value;
        }

        proc(CONFIG[namespace]);

        return temp;
    }else throw new Error('Unknown namespace');
}

export function openSetting(){
    if(!CONFIG) return CONFIG = {};
    const item:Array<SettingItem> = [];
    for (const key in CONFIG) {
        item.push({
            "type": "object",
            "name": key,
            "child": CONFIG[key],
            "key": key
        })
    }
    Global('ui.window.add').call({
        "content": Setting,
        "icon": I_SETTING,
        "name": "设置",
        "option": markRaw({
            "name": "设置",
            "child": item,
            "type": "object",
            "key": ""
        } satisfies SettingItem)
    });
}

// 保存状态
window.onbeforeunload = function(){
    let temp = {} as Record<string,any>;
    const real = {} as Record<string,any>;
    
    function proc(obj:Array<SettingItem>){
        for (const item of obj)
            if(typeof item == 'object')
                if(item.type == 'object')
                    proc(item.child);
                else
                    temp[item.key] = item.value.value;
    }

    for (const key in CONFIG){
        temp = {};
        proc(CONFIG[key]);
        real[key] = temp;
    }

    localStorage.setItem('vlist5',JSON.stringify(real));
}