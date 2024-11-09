
/**
 * vList5 loader
 */

const createURL = (exportVar: string) => URL.createObjectURL(
    new Blob(['export default ' + exportVar], { type: 'text/javascript' })
), script = document.createElement('script');
script.type = 'importmap';
script.innerHTML = JSON.stringify({
    "imports": {
        "vue": createURL('vExport.vue'),
        "fs": createURL('vExport.fs')
    }
});
document.currentScript!.after(script);
import('./init').catch(e => document.write(e));