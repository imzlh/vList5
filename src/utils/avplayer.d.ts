import type ASS from "assjs"

export default class Stat {
    channels: number
    sampleRate: number
    audioFrameSize: number
    audioPacketBytes: bigint
    audioPacketCount: bigint
    audioPacketQueueLength: number
    audioDropPacketCount: bigint
    audioDecodeErrorPacketCount: number
    audioFrameDecodeCount: bigint
    audioFrameRenderCount: bigint
    audioFrameDropCount: number
    width: number
    height: number
    keyFrameInterval: number
    gop: number
    videoPacketBytes: bigint
    videoPacketCount: bigint
    videoPacketQueueLength: number
    videoDropPacketCount: bigint
    videoDecodeErrorPacketCount: number
    videoFrameDecodeCount: bigint
    videoFrameRenderCount: bigint
    videoFrameDropCount: number
    keyFrameCount: bigint

    bufferDropBytes: bigint
    bufferReceiveBytes: bigint
    bufferOutputBytes: bigint
    audioBitrate: number
    videoBitrate: number
    videoDecodeFramerate: number
    videoRenderFramerate: number
    audioDecodeFramerate: number
    audioRenderFramerate: number

    audioFrameDecodeIntervalMax: number
    audioFrameRenderIntervalMax: number
    videoFrameDecodeIntervalMax: number
    videoFrameRenderIntervalMax: number
    bandwidth: number
    jitter: double

    audioStutter: number
    videoStutter: number

    audiocodec: string
    videocodec: string

    firstAudioMuxDts: bigint
    lastAudioMuxDts: bigint

    firstVideoMuxDts: bigint
    lastVideoMuxDts: bigint
}

export interface Chapter{
    /**
     * unique ID to identify the chapter
     */
    id: bigint;
    /**
     * time base in which the start/end timestamps are specified
     */
    time_base: {
        num: number,
        den: number
    };
    /**
     * chapter start/end time in time_base units
     */
    start?: bigint;
    end?: bigint;
    /**
     * (pointer)
     */
    metadata: number;
}

export interface Subtitle {
    source: string | File
    lang?: string
    title?: string
}

export interface Export {
    url: string,
    playBackRate: number,
    loop: boolean,
    volume: number,
    time: {
        total: bigint,
        current: bigint
    },
    tracks: {
        audio: Array<Stream>,
        audioTrack: number,
        video: Array<Stream>,
        videoTrack: number,
        subtitle: Array<Stream>,
        subTrack: number,
        chapter: Array<Chapter>
    },
    ended: boolean,
    play: boolean,
    stop: boolean,
    destroy: () => void,
    status: Stat,
    display: {
        fill: boolean,
        rotate: number,
        flip: {
            vertical: boolean,
            horizontal: boolean
        }
    },
    func: {
        snapshot: (type?: string) => void,
        seek: (time: bigint | number) => void,
        resize: [number, number],
        extSub: (source: Subtitle) => Promise<Stream> 
    }
}

export interface Stream {
    codecpar: number,
    type: number,
    disposition: bigint,
    duration: bigint,
    id: number
    index: number,
    metadata: { language: number, languageString?: string } & Record<string, string>
    nbFrames: bigint,
    startTime: bigint
    timeBase: bigint,
    codecparProxy: Record<string, bigint | string | number>,
    mediaType: 'Audio' | 'Video' | 'Subtitle' | 'Attachment' | 'Data'
}

export default function (el: HTMLDivElement): Promise<Export>;