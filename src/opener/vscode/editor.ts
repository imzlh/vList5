import type { vFile } from "@/env";
import { KeyCode, editor } from 'monaco-editor';
import genConfig from './configure';
import { FS, Global } from "@/utils";
import { VSLang } from "./language";

export default class Editor{

    readonly editor;
    private file: vFile;

    constructor(file: vFile, container: HTMLElement){
        this.editor = editor.create(container, genConfig());
        this.file = file;

        // 绑定基础功能
        this.editor.addCommand(KeyCode.Ctrl | KeyCode.KeyS, () => this.save() as any);
        this.editor.addAction({
            "id": "api.fs.save",
            "label": "vList: 保存文件(save file)",
            "contextMenuOrder": 2,
            run: () => this.save() as any
        });
        this.editor.addAction({
            "id": "api.fs.refresh",
            "label": "vList: 刷新(refresh)",
            "contextMenuOrder": 1,
            "keybindings": [
                KeyCode.F5
            ],
            run: () => this.load() as any
        });

        // 选择语言
        this.lang = VSLang.getLang(file);
    }

    async load(){
        // 获取内容
        try{
            const xhr = await fetch(this.file.url);
            if(!xhr.ok || parseInt(xhr.headers.get('Content-Length') || '0') >= 2 * 1024 * 1024)
                throw 1;
            this.editor.setValue(await xhr.text());
        }catch{
            Global('ui.message').call({
                "type": "error",
                "title": "文件资源管理器",
                "content":{
                    "title": '无法读取文件夹',
                    "content": '网络错误'
                },
                "timeout": 5
            });
        }
        return this;
    }

    async save(){
        const res = new Blob([this.editor.getValue({
            preserveBOM: false,
            lineEnding: "\r\n"
        })]);
        FS.write(this.file.path,res).then(() => Global('ui.message').call({
            "type": "success",
            "title": "VSCode",
            "content":{
                "title": "保存成功",
                "content": "文件已经写入远程"
            },
            "timeout": 3
        }));
        return this;
    }

    destroy(){
        this.editor.dispose();
    }

    set lang(lang: string) {
        editor.setModelLanguage(this.editor.getModel()!, lang);
        console.log("set lang", lang)
    }

    get lang() {
        return this.editor.getModel()!.getLanguageId()
    }
} 