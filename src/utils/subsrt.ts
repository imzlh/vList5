export function parseSrt(content: string, video: HTMLVideoElement) {
    const lines = content.split(/\r?\n\r?\n/),
        track = video.addTextTrack('subtitles', 'SRT Subtitle', 'zh-CN');
    track.mode = 'showing';

    for (let i = 0; i < lines.length; i++) {
        if(!lines[i]) continue;
        const res = lines[i].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\s*(.*)/);
        if (!res) throw new Error(`Invalid SRT format at group ${i + 1}`);
        const start = time2num(res[1]),
            end = time2num(res[2]),
            text = res[3].trim();
        if (start > end) throw new Error(`Invalid SRT format at group ${i + 1}`);
        if(start == end) continue; // 跳过空字幕

        // 跳过ASS m字段
        if(/^\s*m[1-9a-z,-\s]+$/.test(text)) continue;

        // 尝试解析部分ASS Tag
        const cue = new VTTCue(start, end, text);
        cue.text = text.replace(/\{(\\[a-z].+?)+\}/g, (_, match) => {
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

function time2num(time: string): number {
    const [hours, minutes, seconds, ms] = time.split(/[:,]/).map(Number);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}
