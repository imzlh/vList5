import I_File from '/icon/file.webp';
import I_DIR from '/icon/dir.webp';
import { dev } from '/package.json';

const url = new URL(location.href).searchParams;

export const DEFAULT_FILE_ICON = I_File;
export const DEFAULT_DIR_ICON = I_DIR;
export const APP_API = import.meta.env.DEV
    ? dev.api_server 
    : (globalThis as any).VLIST_CONFIG_API 
        || url.get('api')
        || import.meta.env.VLIST_API 
        || location.protocol + '//' + location.host + '/@api/';
export const FILE_PROXY_SERVER = import.meta.env.DEV 
    ? dev.file_server
    : (globalThis as any).VLIST_CONFIG_API 
        || url.get('proxy')
        || import.meta.env.VLIST_FILE_SERVER
        || location.protocol + '//' + location.host + '/';
export const APP_ROOT = location.protocol + '//' + location.host + location.pathname;