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
