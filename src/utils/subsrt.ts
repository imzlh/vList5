import type { vFile } from "@/env";

function time2num(time: string): number{
    const [h, m, s] = time.split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

export function parseSrt(content: string, video: HTMLVideoElement){
    const lines = content.split(/[\r\n]{2,}[0-9]+[\r\n]+/);
    
    if(!video.textTracks ||!video.textTracks[0]){
        const track = document.createElement('track');
        video.appendChild(track);
    }

    for(let i = 0; i < lines.length; i++){
        const res = lines[i].match(/\S*([0-9:.]+)\S*-->\S*([0-9:.]+)\S*[\r\n]\S*(.*)/);
        if(!res || res[0] != i.toString()) throw new Error(`Invalid SRT format at group ${i+1}`);
        const start = time2num(res[2]),
            end = time2num(res[3]),
            text = res[4].trim();
        if(start >= end) throw new Error(`Invalid SRT format at group ${i+1}`);
        video.textTracks[0].addCue(new VTTCue(start, end, text));
    }
}