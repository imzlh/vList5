export function parseSrt(content: string, video: HTMLVideoElement) {
    const lines = content.split(/(?:\r?\n){2,}/),
        track = video.addTextTrack('subtitles', 'SRT Subtitle', 'zh-CN');
    track.mode = 'showing';

    for (let i = 0; i < lines.length; i++) {
        if(!lines[i]) continue;
        const res = lines[i].match(/^(\d+)\r?\n(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*([\w\W]*)\s*$/);
        if (!res) throw new Error(`Invalid SRT format at group ${i + 1}`);
        
        const start = parseInt(res[2]) * 3600 + parseInt(res[3]) * 60 + parseInt(res[4]) + parseInt(res[5]) / 1000,
            end = parseInt(res[6]) * 3600 + parseInt(res[7]) * 60 + parseInt(res[8]) + parseInt(res[9]) / 1000;
        if (start == end) continue; // 跳过空字幕
        if (start > end) throw new Error(`Invalid SRT timestrap at group ${i + 1}`);
        if (res[1] != (i + 1).toString() && res[1] != i.toString())
            throw new Error(`Invalid SRT index at group ${i + 1}`);

        // 尝试解析部分ASS Tag
        const cue = new VTTCue(start, end, '');
        cue.text = res[10].replace(/\{(\\[a-z].+?)+\}/g, (_, match) => {
            for(const tag of match.split('\\').filter(Boolean)){
                // \an, \a 字幕位置
                if(tag.startsWith('a')){
                    const mode = parseInt(tag.substring(2));
                    switch(Math.floor(mode / 3)){
                        case 1:
                            cue.line = -1;
                            break;
                        case 2:
                            cue.line = 0.5;
                            break;
                        case 3:
                            cue.line = 0;
                            break;
                    }
                    switch(mode % 3){
                        case 1:
                            cue.align = 'left';
                            break;
                        case 2:
                            cue.align = 'center';
                            break;
                        case 3:
                            cue.align = 'right';
                            break;
                    }
                    continue;
                }
            }

            return '';
        });
        track.addCue(cue);
    }
}