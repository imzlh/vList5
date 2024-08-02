import fileIcon from '@/utils/fileIcons';
import dirIcon from '@/utils/folderIcons';
import I_DIR from '/icon/dir.webp';
import I_File from '/icon/file.webp';
import { APP_ROOT } from '/config';

export enum FileNamePattern {
    /** Adds the following extensions to the file name: . */
    Ecmascript = 'ecmascript',

    /** Adds the following extensions to the file name: . */
    Configuration = 'configuration',

    /** Adds the following extensions to the file name: . */
    NodeEcosystem = 'nodeEcosystem',
}

enum IconPack {
    Angular = 'angular',
    Nest = 'nest',
    Ngrx = 'angular_ngrx',
    React = 'react',
    Redux = 'react_redux',
    Qwik = 'qwik',
    Vue = 'vue',
    Vuex = 'vue_vuex',
}

type Patterns = Record<string, FileNamePattern>;

export interface FileIcons {
    /**
     * Name of the icon, e.g. 'javascript'
     */
    name: string;

    /**
     * Define the file extensions that should use this icon.
     * E.g. ['js']
     */
    fileExtensions?: string[];

    /**
     * Define if there are some static file names that should apply this icon.
     * E.g. ['sample.js']
     */
    fileNames?: string[];

    /**
     * Define patterns for file names. Patterns are used to generate common file names and file extensions based on a key.
     */
    patterns?: Patterns;
}

export interface FolderIcon {
    /**
     * Name of the icon, e.g. 'src'
     */
    name: string;

    /**
     * Define the folder names that should apply the icon.
     * E.g. ['src', 'source']
     */
    folderNames: string[];
}

const enumatch = {
    [FileNamePattern.Configuration]: [
        'json','jsonc','json5',
        'yaml','yml',
        'toml'
    ],
    [FileNamePattern.Ecmascript]: [
        `js`, `mjs`, `cjs`,
        `ts`, `mts`, `cts`
    ],
    [FileNamePattern.NodeEcosystem]: [
        "js", "mjs", "cjs", 
        "ts", "mts", "cts", 
        "json", "jsonc", "json5", 
        "yaml", "yml", "toml"
    ]
} as Record<string,Array<string>>;

export function getIcon(name: string, is_file = true){
    if(is_file){
        const ext = name.substring(name.lastIndexOf('.') +1).toLowerCase();

        let full_match: undefined | string, 
            half_match: undefined | string,
            ext_match: undefined | string;

        for (let i = 0; i < fileIcon.length; i++) {
            const element = fileIcon[i];
            
            if(element.fileNames?.includes(name.toLowerCase()))
                full_match = APP_ROOT + `/type/${element.name}.svg`;

            else if(element.fileExtensions?.includes(ext))
                ext_match =  APP_ROOT + `/type/${element.name}.svg`;

            else for (const key in element.patterns)
                if(name.startsWith(key) && enumatch[(element.patterns as any)[key]].includes(ext))
                    half_match =  APP_ROOT + `/type/${element.name}.svg`;
        }

        return full_match || half_match || ext_match || I_File;
    }else{
        for (let i = 0; i < dirIcon.length; i++)
            if(dirIcon[i].folderNames.includes(name))
                return  APP_ROOT + `/type/${dirIcon[i].name}.svg`;
        return I_DIR;
    }
}
