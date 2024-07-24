import { FileNamePattern } from '@/utils/icon';
import fileIcon from '@/utils/fileIcons';
import dirIcon from '@/utils/folderIcons';
import I_DIR from '/icon/dir.webp';
import I_File from '/icon/file.webp';
import { APP_ROOT } from '/config';


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