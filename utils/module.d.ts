import { vDir, IUploadOption, vFile } from './vlist'

declare module 'fs'{
    export namespace fs {
        /**
         * 上传文件或文件夹
         * @param e 事件或文件列表
         * @param to 目标文件夹
         * @param option 选项
         * @returns 上传结果
         */
        function upload(e: DragEvent | FileList | null, to: vDir, option?: IUploadOption): Promise<any>;

        /**
         * 加载一个路径并返回目录节点
         * @param path 路径
         * @param reload 是否重新加载
         * @returns 目录节点
         */
        function loadPath(path: string, reload?: boolean): Promise<vDir>;

        /**
         * 加载多个路径，自动排重复项
         * @param dir 路径列表
         */
        function loadPaths(dir: string[]): Promise<void>;

        /**
         * 列出指定路径下的所有文件
         * @param path 路径
         * @param create 是否创建目录
         * @returns 目录下的文件列表
         */
        function list(path: string, create?: boolean): Promise<vDir[]>;

        /**
         * 重命名文件
         * @param map 文件重命名的映射关系
         */
        function rename(map: Record<string, string>): Promise<void>;

        /**
         * 获取文件状态
         * @param path 文件路径
         * @returns 文件信息
         */
        function stat(path: string): Promise<vFile>;

        /**
         * 移动文件
         * @param source 源文件或文件列表
         * @param target 目标路径
         * @param deep 是否深度移动
         */
        function move(source: string | string[], target: string, deep?: boolean): Promise<void>;

        /**
         * 删除文件
         * @param file 文件或文件列表
         */
        function del(file: string | string[]): Promise<void>;

        /**
         * 创建目录
         * @param dirs 要创建的目录
         */
        function mkdir(dirs: string | string[]): Promise<void>;

        /**
         * 创建文件
         * @param files 要创建的文件
         * @param mode 文件权限模式
         */
        function touch(files: string | string[], mode?: number): Promise<void>;

        /**
         * 复制文件
         * @param source 源文件或文件列表
         * @param target 目标路径
         */
        function copy(source: string | string[], target: string): Promise<void>;

        /**
         * 写入文件
         * @param file 文件路径
         * @param content 文件内容
         * @param overwrite 是否覆盖
         * @param timeout 超时时间
         */
        function write(file: string, content: Blob, overwrite?: boolean, timeout?: number): Promise<void>;

        /**
         * 加载树结构
         */
        function loadTree(): Promise<void>;
    }
}