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

export interface Export {
    url: string,
    playBackRate: number,
    loop: boolean,
    volume: 1,
    time: {
        total: number,
        current: number
    },
    tracks: {
        audio: Array<Stream>,
        audioTrack: number,
        video: Array<Stream>,
        videoTrack: number,
        subtitle: Array<Stream>,
        subTrack: number
    },
    ended: boolean,
    play: boolean,
    stop: boolean,
    destroy: boolean,
    status: Stat,
    display: {
        fill: boolean,
        rotate: 0,
        flip: {
            vertical: boolean,
            horizontal: boolean
        }
    },
    func: {
        snapshot: boolean,
        seek: number,
        resize: [number, number]
    }
}

export interface Stream {
    codecpar: number,
    type: number,
    disposition: bigint,
    duration: bigint,
    id: number
    index: number,
    metadata: { language: string } & Record<string, string>
    nbFrames: bigint,
    startTime: bigint
    timeBase: bigint
}

export default function (el: HTMLDivElement): Export;