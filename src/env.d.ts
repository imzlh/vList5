/// <reference types="vite/client" />

/**
 * vList5 全局共享类型定义
 * 
 * @copyright 2021-2022 vList authors
 * @license MIT
 */

import type { Component, Ref } from "vue";

/**
 * 显示一个窗口实现的接口
 * (调用`Global('ui.window.add').call(...)`的第一个参数数据结构)
 */
interface TabWindow {
    /**
     * 名称
     */
    name: string,

    /**
     * 当窗口从隐藏状态切换到显示状态时触发的回调函数
     */
    onDisplay?: Function,

    /**
     * 当窗口从显示状态切换到隐藏状态时触发的回调函数
     */
    onLeave?: Function,

    /**
     * 窗口的组件
     */
    content: Component,

    /**
     * 窗口的图标
     */
    icon: string,

    /**
     * 窗口的UUID，用来标记窗口的唯一性
     */
    uuid?: string,

    /**
     * 传递给组件(content)的额外参数
     */
    option?: any
}

/**
 * 文件与目录共用的数据
 */
interface FileAndDir {
    /**
     * 名称
     */
    name: string,

    /**
     * 显示的名称
     */
    dispName?:string,

    /**
     * 创建时间
     */
    ctime: number,

    /**
     * 文件（夹）直链
     */
    url: string,

    /**
     * 文件(夹)的绝对路径
     */
    path: string,

    /**
     * 文件(夹)的显示图标
     */
    icon?:string,

    /**
     * 正在重命名模式，true激活重命名
     */
    rename?: boolean,

    /**
     * 上传状态，可选0-100，为undefined表示未上传
     */
    upload?: number,

    /**
     * 锁定文件，防止操作时被删除、重命名、移动等操作
     */
    lock?: boolean,

    /**
     * 父文件夹(unstable)
     */
    parent: vDir | null
}

/**
 * 文件结构
 */
interface vFile extends FileAndDir {
    type: 'file',

    /**
     * 文件大小
     */
    size: number
}

/**
 * 目录结构
 */
interface vDir extends FileAndDir{
    type: 'dir',

    /**
     * 子文件(夹)列表
     */
    child?: Array<FileOrDir>,

    /**
     * 是否显示子文件(夹)列表
     */
    unfold?: boolean,

    /**
     * 被选中的子文件(夹)
     * 一个Map, 对应 文件(夹) => 文件(夹)路径
     */
    active: Map<FileOrDir, string>
}

/**
 * 最简单的文件（夹）数据结构
 */
interface vSimpleFileOrDir{
    /**
     * 文件(夹)名称
     */
    name: string,

    /**
     * 文件(夹)的直链
     */
    url: string,

    /**
     * 绝对路径
     */
    path: string
}

/**
 * 文件或文件夹数据结构
 */
type FileOrDir = vFile | vDir;

/**
 * 热键数据结构
 */
interface HotKey{
    /**
     * 是否需要按下Ctrl键
     */
    ctrl: boolean,

    /**
     * 是否需要按下Alt键
     */
    alt: boolean,

    /**
     * 是否需要按下Shift键
     */
    shift: boolean,

    /**
     * 按键名称，如`A`
     */
    key: string
}

/**
 * 菜单项数据结构
 */
interface MenuItem {
    /**
     * 子菜单
     */
    child?: Array<MenuItem>,

    /**
     * 图标
     */
    icon?: string,

    /**
     * 显示的标题文字
     */
    text: string | null,

    /**
     * 长时间悬浮的提示信息
     */
    tip?: string,

    /**
     * 显示的热键
     */
    kbd?: HotKey,

    /**
     * 当这个项被点击时触发的回调函数
     * @param ev 事件对象
     */
    handle?: (ev:MouseEvent) => void
}

/**
 * 打开方式的数据结构
 */
interface OpenerOption{

    /**
     * 名称
     */
    name: string,

    /**
     * 图标
     */
    icon?: string,

    /**
     * 兼容的格式列表
     */
    format: Array<string>,

    /**
     * 支持的类mime类型
     */
    type?: string,

    /**
     * 对于类型的描述
     */
    typeDesc?: string,

    /**
     * 缩略图的生成函数
     * @param file 文件
     * @returns 一个URL字符串
     */
    thumb?: (file:vFile) => string,

    /**
     * 打开文件的方法
     * @param file 文件
     */
    open: (file:vFile) => any
}

/**
 * 消息提示的数据结构
 * (调用`Global('ui.message').call(...)`的第一个参数数据结构)
 */
interface MessageOpinion {
    /**
     * 图标
     */
    icon?: string,

    /**
     * 标题
     */
    title?: string,

    /**
     * 内容，一个Vue组件
     */
    body?: Vue.Component,

    /**
     * 字符串内容
     */
    content?: {
        /**
         * 内容描述
         */
        content?: string,

        /**
         * 内容标题
         */
        title: string
    },

    /**
     * 消息的类型，可选
     *  - `warn`警告信息
     *  - `error`错误信息
     *  - `info`提示信息
     *  - `success`成功消息
     * 默认为`info`
     */
    type?: 'warn' | 'error' | 'info' | 'success',

    /**
     * 当点击消息的回调函数
     */
    handle?: Function,

    /**
     * @internal
     */
    hidden?: boolean,

    /**
     * 超时自动回收，默认不回收直到用户关闭
     */
    timeout?: number
}

/**
 * 右键菜单数据结构，`---`表示分隔符号
 */
type CtxMenuData = {
    /**
     * 子菜单
     */
    child?: Array<CtxMenuData>,

    /**
     * 图标
     */
    icon?: string,

    /**
     * 显示的标题文字
     */
    text: string | null,

    /**
     * 长时间悬浮的提示信息
     */
    tip?: string,

    /**
     * 显示的热键
     */
    kbd?: HotKey,

    /**
     * 点击的回调函数
     */
    handle?: () => void
} | "---";

/**
 * 显示右键菜单的选项数据结构
 * (调用`Global('ui.ctxmenu').call(...)`的第二个参数数据结构)
 */
interface CtxDispOpts{
    pos_x: number,
    pos_y: number,
    content: Array<CtxMenuData>
}

/**
 * 弹出框调用必须的数据结构
 * (调用`Global('ui.alert').call(...)`的第一个参数数据结构)
 */
interface AlertOpts{
    /**
     * 类型，可选
     *  - `alert`   普通提示框
     *  - `prompt`  输入提示框
     *  - `confirm` 确认框
     * 默认为普通提示框
     */
    type: 'alert'|'prompt'|'confirm',

    /**
     * 显示的信息
     */
    message: string,

    /**
     * 窗口标题
     */
    title?: string,

    /**
     * 自定义按钮，定义了默认按钮就不会显示
     */
    button?: Array<{
        /**
         * 按钮内容文字
         */
        content: string,

        /**
         * 按钮颜色，支持CSS颜色值
         */
        color?: string,

        /**
         * 按钮充当的角色
         *  - `close` 关闭窗口
         *  - `submit` 提交表单
         *  - `user` 自定义按钮
         * 默认为`user`
         */
        role: 'close' | 'submit' | 'user',

        /**
         * 按钮点击的回调函数
         * @param data 数据
         */
        click?: (data: boolean|string) => any
    }>,

    /**
     * 确定按钮的回调函数
     *  - 当`type`为`confirm`时返回`boolean`
     *  - 当`type`为`prompt`时返回`string`
     * @param data 窗口数据
     */
    callback: (data: boolean|string) => any
}

/**
 * 设置项目的数据结构
 */
type SettingItem = ({
    /**
     * 名称
     */
    name: string,

    /**
     * 存储时的唯一键名
     */
    key: string,

    /**
     * 项目的描述
     */
    desc?: string
} & ({
    type: 'text',
    value: Ref<string>,
} | {
    type: 'number',

    /**
     * 步进值，默认为1
     */
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

    /**
     * 最小值
     */
    min: number,

    /**
     * 最大值
     */
    max: number,

    /**
     * 步进值，默认为1
     */
    step: number
} | {
    type: 'object',

    /**
     * 子菜单
     */
    child: Array<SettingItem>
})) | string;

/**
 * 使用`fs.list`需要的预测条件
 * @deprecated 建议前端自行实现
 */
type ListPredirect = {
    select: 'name',

    /**
     * 正则表达式字符串，自动忽略大小写
     */
    reg: string,
} | {
    select: 'type',

    /**
     * 筛选文件类型，可选`file`、`dir`
     */
    type: 'file' | 'dir'
} | {
    select: 'size',

    /**
     * 文件大小最小值
     */
    min?: number,

    /**
     * 文件大小最大值
     */
    max?: number
} | {
    select: 'mode',

    /**
     * 文件可访问模式，可选`r`、`w`、`x`、`f`
     */
    mode: 'r' | 'w' | 'x' | 'f'
};