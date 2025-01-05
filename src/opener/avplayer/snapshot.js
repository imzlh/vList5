/**
 * 自定义的snapshot
 * @param {import('@libmedia/avplayer').default} av 
 * @param {'webp' | 'png' | 'jpeg'} imgtype 
 * @returns {Promise<string>}
 */
export function snapshot(av, imgtype){
    let canvas = av.canvas;
    if(av.video && !canvas){
        canvas = document.createElement('canvas');
        canvas.width = av.video.videoWidth;
        canvas.height = av.video.videoHeight;
        canvas.getContext('2d').drawImage(av.video, 0, 0, canvas.width, canvas.height);
        av.canvas = canvas;
    }

    if(!canvas) throw new Error('No content found');
    return new Promise((rs, rj) => canvas.toBlob(blob =>
        rs(URL.createObjectURL(blob))    
    , 'image/' + imgtype))
}