import type { Component, Ref } from "vue";

interface TabWindow {
    name: string,
    onDisplay?: Function,
    onLeave?: Function,
    content: Component,
    icon: string,
    option?: any
}

interface FileAndDir {
    name: string,
    dispName?:string,
    ctime: number,
    url: strings,
    path: string,
    icon?:string
}

interface vFile extends FileAndDir {
    type: 'file',
    size: number
}

interface vDir extends FileAndDir{
    type: 'dir',
    child?: Array<FileOrDir>
}

interface vSimpleFileOrDir{
    name: string,
    url: string,
    path: string
}

type FileOrDir = vFile | vDir;

interface HotKey{
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    key: string
}

interface MenuItem {
    child?: Array<{
        text: string,
        keyboard: HotKey,
        icon?: string,
        handle?: Function,
        disabled?: Ref<boolean>
    }>,
    icon?: string,
    text: string | null,
    tip?: string,
    kbd?: HotKey,
    handle?: (ev:MouseEvent) => void
}

interface Info{
    title: string,
    content: string,
    desc: string,
    change?: Function
}

interface OpenerOption{
    name: string,
    icon?: string,
    format: Array<string>,
    type?: string,
    typeDesc?: string,
    thumb?: (file:vFile) => string,
    meta?: (file:vFile) => Array<Info>,
    open: (file:vFile) => any
}

interface MessageOpinion {
    icon?: string,
    title?: string,
    body?: Vue.Component,
    content?: {
        content?: string,
        title: string
    },
    type?: 'warn' | 'error' | 'info' | 'success',
    handle?: Function,
    hidden?: boolean,
    timeout?: number
}

type CtxMenuData = {
    child?: Array<CtxMenuData>,
    icon?: string,
    text: string | null,
    tip?: string,
    kbd?: HotKey,
    handle?: () => void
} | "---";

interface CtxDispOpts{
    pos_x: number,
    pos_y: number,
    content: Array<CtxMenuData>
}

interface AlertOpts{
    type: 'alert'|'prompt'|'confirm',
    message: string,
    title?: string,
    button?: Array<{
        content: string,
        color?: string,
        role: Function|'close'|'submit'
    }>,
    callback: (data:boolean|string) => any
}

type SettingItem = ({
    name: string,
    key: string,
    desc?: string
} & ({
    type: 'text',
    value: Ref<string>,
} | {
    type: 'number',
    step: number,
    value: Ref<number>,
} | {
    type: 'select',
    value: Ref<string>,
    item: Array<{
        display: string,
        value: string
    }>,
} | {
    type: 'check',
    value: Ref<boolean>,
} | {
    type: 'range',
    value: Ref<number>,
    min: number,
    max: number,
    step: number
} | {
    type: 'object',
    child: Array<SettingItem>
})) | string;

interface SettingObject{
    name: string,
    key: string,
    desc?: string,
    type: 'object',
    child: Array<SettingItem>
}

type SettingItemFactory = ({
    name: string,
    key: string,
    desc?: string
} & ({
    type: 'text',
    default: string,
} | {
    type: 'number',
    step: number,
    default: number,
} | {
    type: 'select',
    item: Array<{
        display: string,
        value: string
    }>,
    default: string,
} | {
    type: 'check',
    default: boolean,
} | {
    type: 'range',
    min: number,
    max: number,
    step: number
    default: number
} | {
    type: 'object',
    child: Array<SettingItemFactory>
})) | string;

type ListPredirect = {
    select: 'name',
    reg: string,
} | {
    select: 'type',
    type: 'file' | 'dir'
} | {
    select: 'size',
    min?: number,
    max?: number
} | {
    select: 'mode',
    mode: 'r' | 'w' | 'x' | 'f'
};