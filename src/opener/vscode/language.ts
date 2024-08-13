import type { vFile } from "@/env";
import { splitPath } from "@/utils";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

export namespace VSLang{
    const LangMap = {
        bat: ['bat'],
        cpp: ['cpp'],
        csharp: ['cs'],
        css: ['css'],
        dart: ['dart'],
        dockerfile: ['docker'],
        go: ['go'],
        html: ['htm','html','xhtml'],
        ini: ['ini'],
        java: ['java'],
        javascript: ['js','jsx'],
        json: ['json', 'jsonc'],
        less: ['less'],
        lua: ['lua'],
        markdown: ['md'],
        'objective-c': ['co'],
        perl: ['perl'],
        php: ['php'],
        powershell: ['ps','ps1'],
        python: ['py'],
        r: ['r'],
        ruby: ['rb'],
        rust: ['rs'],
        scss: ['scss'],
        shell: ['sh'],
        sql: ['sql'],
        typescript: ['ts','tsx'],
        xml: ['xml'],
        yaml: ['yaml']
    } as Record<string,Array<string>>;

    export function getLang(file: vFile): string{
        let lang = 'plaintext';
        for (const langs in LangMap)
            if(LangMap[langs].includes(splitPath(file)['ext'].toLowerCase())){
                lang = langs;
                break;
            }
        return lang;
    }

    const WorkerMap = {
        'json'      : jsonWorker,
        'css'       : cssWorker,
        'scss'      : cssWorker,
        'less'      : cssWorker,
        'html'      : htmlWorker,
        'typescript': tsWorker,
        'javascript': tsWorker,
    } as Record<string, {
        new(): Worker;
    }>;

    export async function getWorker(_: any, label: string){
        const cl = WorkerMap[label] || editorWorker;
        return new cl();
    }
}