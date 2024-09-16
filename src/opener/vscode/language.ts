import type { vFile } from "@/env";
import { splitPath } from "@/utils";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

import { languages } from "monaco-editor";

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
        yaml: ['yaml'],
        ass: ['ass', 'ssa']
    } as Record<string,Array<string>>;

    export function getLang(file: vFile): string{
        let lang = 'plaintext';
        const ext = splitPath(file)['ext'].toLowerCase();
        for (const langs in LangMap)
            if(LangMap[langs].includes(ext)){
                lang = langs;
                break;
            }
        console.log('Monaco lang:', lang);
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
        console.log(label);
        const cl = WorkerMap[label] || editorWorker;
        return new cl();
    }
}

// 注册一个ass语言
languages.register({ id: 'ass' });
languages.setMonarchTokensProvider('ass', {
    keywords: ['Title', 'ScriptType', 'PlayResX', 'PlayResY', 'Format', 'Style', 'Comment', 'Dialogue'],
    tokenizer: {
        root: [
            [/$Script Info$/, 'header', '@script_info'],
            [/$V4\+ Styles$/, 'header', '@v4_styles'],
            [/$Events$/, 'header', '@events'],
            [/$.*?$/, 'header'],
            [/\w+:/, 'key'],
            [/\w+/, 'tag'],
            [/\d+:\d+:\d+(\.\d+)?/, 'time'],
            [/\d+(\.\d+)?/, 'number'],
            [/"(?:[^"\\]|\\.)*"/,'string'],
            [/'(?:[^'\\]|\\.)*'/, 'literal'],
            [/,/, 'delimiter'],
            [/\n/, 'newline'],
            [/\s+/, 'whitespace'],
            [/^\s*\;\s*/, 'delimiter'],
            [/\{([a-zA-Z]+.+?)+\}/, 'tag']
        ],
        common: [
            [/\w+:/, 'key'],
            [/\w+/, 'tag'],
            [/\d+:\d+:\d+(\.\d+)?/, 'time'],
            [/\d+(\.\d+)?/, 'number'],
            [/"(?:[^"\\]|\\.)*"/,'string'],
            [/'(?:[^'\\]|\\.)*'/, 'literal'],
            [/,/, 'delimiter'],
            [/\n/, 'newline'],
            [/\s+/, 'whitespace']
        ],
        script_info: [
            { include: 'common' }
        ],
        v4_styles: [
            { include: 'common' }
        ],
        events: [
            { include: 'common' }
        ]
    }
});
