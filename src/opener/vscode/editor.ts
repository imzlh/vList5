import type { vFile } from "@/env";
import { KeyCode, editor, languages, Uri } from 'monaco-editor';
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
            await analysis_import(this.file, this.editor);
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

    // 设置tsconfig
    languages.typescript.typescriptDefaults.setCompilerOptions({
        target: languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: languages.typescript.ModuleResolutionKind.NodeJs,
        module: languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        allowJs: false,
        typeRoots: ["node_modules/@types"]
    });

const lib_imported: Array<string> = [];
export async function analysis_import(pfile: vFile, session?: editor.IStandaloneCodeEditor){
    const code = await (await fetch(pfile.url)).text();

    // 分析导入
    if(!lib_imported.includes(pfile.path)){
        const preg_import = /import\s+(?:.+\s+from\s+)?['"]([^'"]+\.(?:js|ts|tsx|jsx))['"]/g,
            preg_cjs_import = /(?:require|import)\(['"]([^'"]+\.(ts|js|tsx|jsx))['"]\)/g,
            ref_syntax = /\/\/\/\s*\<reference.+path=\"(.+\.ts)\".*\>[\r\n]+/g;

        for(const match of [
            ...code.matchAll(preg_import),
            ...code.matchAll(preg_cjs_import),
            ...code.matchAll(ref_syntax)
        ]){
            const file = await FS.stat(new URL(match[1], pfile.url).pathname);
            if(file.type == 'dir') continue;
            const content = await analysis_import(file);
            languages.typescript.typescriptDefaults.addExtraLib(content, 'inmemory:' + file.path);
        }

        lib_imported.push(pfile.path);
    }
    if(session){
        const model = editor.createModel(code, 'typescript', Uri.parse('inmemory:' + pfile.path));
        session.setModel(model);
    }

    return code;
}