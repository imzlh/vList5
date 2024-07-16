import I_File from '/icon/file.webp';
import I_DIR from '/icon/dir.webp';

export const APP_NAME = 'izCloud';
export const DEFAULT_FILE_ICON = I_File;
export const DEFAULT_DIR_ICON = I_DIR;
export const APP_API = import.meta.env.DEV
    ? 'http://192.168.1.1:81/@api/' 
    : '/@api/';
export const FILE_PROXY_SERVER = import.meta.env.DEV 
    ? 'http://192.168.1.1:81/' 
    : '';
export const APP_ROOT = location.protocol + '//' + location.host + location.pathname;