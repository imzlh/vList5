import * as Vue from 'vue'

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
 * 显示右键菜单的选项数据结构
 * (调用`Global('ui.ctxmenu').call(...)`的第二个参数数据结构)
 */
interface CtxDispOpts{
    pos_x: number,
    pos_y: number,
    content: Array<CtxMenuData>
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
 * 命令面板的命令
 * 使用`Global('ui.command').call(...)`添加命令
 */
interface Command{
    /**
     * 快捷键绑定
     */
    keybinding?: {
        ctrl: boolean,
        alt: boolean,
        shift: boolean,
        key: string
    },

    /**
     * 英文名称，方便筛选
     */
    name: string,

    /**
     * 中文名称，显示在面板上
     */
    title: string,

    /**
     * 命令的回调函数
     */
    handler():any;
}

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
     * 当窗口关闭时触发的回调函数
     */
    onDestroy?: Function,

    /**
     * 窗口的组件，允许为string指明URL
     */
    content: Vue.Component | string,

    /**
     * 窗口的图标
     */
    icon: string,

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
     * 修改时间
     */
    mtime: number,

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
 * 文件或文件夹数据结构
 */
type FileOrDir = vFile | vDir;

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
 * 上传函数的选项
 */
interface IUploadOption{
    /**
     * 是否覆盖已存在的文件
     */
    overwrite?: boolean,

    /**
     * XHR超时时间
     */
    timeout?: number,

    /**
     * 创建文件时触发的回调函数
     * @param file 文件引用
     */
    created?: (file: vFile) => any,

    /**
     * 上传完成后触发的回调
     * @param file 文件引用
     */
    uploaded?: (file: vFile) => any,

    /**
     * 处理线程数，即并发上传数量
     */
    thread_pool?: number
}

interface GlobalShared{
    'ui.alert': (opt: AlertOpts) => void,
    'ui.ctxmenu': (opt: CtxDispOpts) => void,
    'ui.message': (opt: MessageOpinion) => number,
    'ui.removeMessage': (id: number) => void,
    'ui.panel': (...opt: Array<Command>) => () => void,

    'window.create': (opt: TabWindow) => string,
    'window.remove': (opt: string) => void,
    'window.home': () => void,
    'window.set': (opt: string) => void,

    'opener.select': (opt: vFile) => Promise<OpenerOption>,
    'opener.get': (opt: vFile) => OpenerOption,
    'opener.register': (opt: OpenerOption) => number,
    'opener.session': (self: string, callback: (file: vFile) => void) => () => (file: vFile) => any,
    'opener.open': (file: vFile) => Promise<void>,

    'fs.pick': (opt: { src: string, type?: 'file' | 'dir' }) => Promise<FileOrDir>,
    'fs.copy': (source: Array<string> | string, target: string) => Promise<void>,
    'fs.move': (source: Array<string> | string, target: string, deep?: boolean) => Promise<void>,
    'fs.delete': (file: Array<string> | string) => Promise<void>,
    'fs.rename': (map: Record<string, string>) => Promise<void>,
    'fs.touch':  (files: string[] | string, mode?: number) => Promise<void>,
    'fs.stat': (path: string) => Promise<FileOrDir>,
    'fs.scandir': (path: string, create?: boolean) => Promise<FileOrDir[]>,
    'fs.upload': (e: DragEvent | FileList | null, to: vDir, option?: IUploadOption) => Promise<void>,
    'fs.write': (file: string, content: Blob, overwrite?: boolean, timeout?: number) => Promise<void>,

    'tree.load': (input: vDir, quiet?: boolean) => Promise<void>,
    'tree.get': (path: string) => Promise<FileOrDir>,
    'tree.loadPath': (path: string, reload?: boolean) => Promise<vDir>,
    'tree.loadPaths': (dir: string[]) => Promise<void>,
}

interface FakeProcess{
    /**
     * 当前进程的环境变量
     */
    env: Record<string, string> & {
        NODE_ENV: 'production',
        ENTRY: string
    },

    /**
     * 当前进程的工作目录
     */
    __path: string,

    /**
     * 当前进程的元数据
     */
    __meta: Record<string, any>,

    /**
     * 分析一个路径，返回绝对路径
     * @param path 路径
     * @returns 绝对路径
     */
    resolve: (path: string) => string
}

declare global {
    /**
     * 获取vList的全局共享对象
     * @param key 键名
     */
    function _G<T extends keyof GlobalShared>(key: T): GlobalShared[T];

    /**
     * 获取应用的process信息
     */
    // @ts-ignore
    const process: FakeProcess;
}