import type { vFile } from "@/env";
import { KeyCode, editor, languages, Uri } from 'monaco-editor';
import genConfig from './configure';
import { FS, message, splitPath } from "@/utils";
import { VSLang } from "./language";
import { ref } from "vue";

export default class Editor{

    readonly editor;
    private file: vFile;

    constructor(file: vFile, container: HTMLElement){
        this.editor = editor.create(container, {
            ...genConfig(),
            language: this.langRef.value = VSLang.getLang(file)
        });
        this.file = file;

        // 绑定基础功能
        this.editor.addAction({
            "id": "api.fs.save",
            "label": "vList: 保存文件(save file)",
            "contextMenuOrder": 2,
            run: () => void(this.save())
        });
        this.editor.addAction({
            "id": "api.fs.refresh",
            "label": "vList: 刷新(refresh)",
            "contextMenuOrder": 1,
            "keybindings": [
                KeyCode.F5
            ],
            run: () => void(this.load())
        });
    }

    async load(){
        const ext = splitPath(this.file).ext;
        if(ext == '.ts' || ext == '.tsx' || ext == '.js' || ext == '.jsx'){
            // 获取内容
            try{
                await analysis_import(this.file, this.editor);
            }catch(e){
                console.error(e);
                message({
                    "type": "error",
                    "title": "文件资源管理器",
                    "content":{
                        "title": '无法读取文件夹',
                        "content": '网络错误'
                    },
                    "timeout": 5
                });
            }
        }else{
            const content = await (await fetch(this.file.url)).text();
            this.editor.setValue(content);
        }
        return this;
    }

    async save(){
        const res = new Blob([this.editor.getValue({
            preserveBOM: false,
            lineEnding: "\r\n"
        })]);
        FS.write(this.file.path,res).then(() => message({
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

    public langRef = ref('');

    set lang(lang: string) {
        editor.setModelLanguage(this.editor.getModel()!, lang);
        this.langRef.value = lang;
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
    allowJs: false
});

const lib_imported: Array<string> = [],
    fmodels = {} as Record<string, editor.IModel>;
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
            if(languages.typescript.typescriptDefaults.getExtraLibs()['inmemory:' + file.path] || file.type == 'dir')
                continue;
            const content = await analysis_import(file);
            languages.typescript.typescriptDefaults.addExtraLib(content, 'inmemory:' + file.path);
        }

        lib_imported.push(pfile.path);
    }
    if(session){
        var model;
        if(pfile.path in fmodels) (model = fmodels[pfile.path]).setValue(code);
        else fmodels[pfile.path] = model = editor.createModel(code, 'typescript', Uri.parse('inmemory:' + pfile.path));
        session.setModel(model);
    }

    return code;
}