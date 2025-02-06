export enum AVMediaType {
    /**
     * Usually treated as AVMEDIA_TYPE_DATA
     */
    AVMEDIA_TYPE_UNKNOWN = -1,
    AVMEDIA_TYPE_VIDEO = 0,
    AVMEDIA_TYPE_AUDIO = 1,
    /**
     * Opaque data information usually continuous
     */
    AVMEDIA_TYPE_DATA = 2,
    AVMEDIA_TYPE_SUBTITLE = 3,
    /**
     * Opaque data information usually sparse
     */
    AVMEDIA_TYPE_ATTACHMENT = 4,
    AVMEDIA_TYPE_NB = 5
}

export enum AVPlayerProgress {
    OPEN_FILE = 0,
    ANALYZE_FILE = 1,
    LOAD_AUDIO_DECODER = 2,
    LOAD_VIDEO_DECODER = 3
}

export enum AVPlayerStatus {
    STOPPED = 0,
    DESTROYING = 1,
    DESTROYED = 2,
    LOADING = 3,
    LOADED = 4,
    PLAYING = 5,
    PLAYED = 6,
    PAUSED = 7,
    SEEKING = 8,
    CHANGING = 9
}

export enum AVLogLevel {
    TRACE,
    INFO,
    DEBUG,
    WARNING,
    ERROR,
    FATAL
}

export interface Stats {
    /**
     * 音频通道数
     */
    channels: number
    /**
     * 音频采样率
     */
    sampleRate: number
    /**
     * 音频帧大小
     */
    audioFrameSize: number
    /**
     * 音频包总字节数
     */
    audioPacketBytes: bigint
    /**
     * 音频包总数
     */
    audioPacketCount: bigint
    /**
     * 当前音频包队列长度
     */
    audioPacketQueueLength: number
    /**
     * 音频包丢弃总数
     */
    audioDropPacketCount: bigint
    /**
     * 音频解码错误包总数
     */
    audioDecodeErrorPacketCount: number
    /**
     * 音频编码错误帧总数
     */
    audioEncodeErrorFrameCount: number
    /**
     * 音频解码帧总数
     */
    audioFrameDecodeCount: bigint
    /**
     * 音频编码包总数
     */
    audioPacketEncodeCount: bigint
    /**
     * 音频渲染帧总数
     */
    audioFrameRenderCount: bigint
    /**
     * 音频帧丢弃总数
     */
    audioFrameDropCount: number
    /**
     * 视频宽度
     */
    width: number
    /**
     * 视频高度
     */
    height: number
    /**
     * 视频关键帧间隔
     */
    keyFrameInterval: number
    /**
     * 视频 gop 长度
     */
    gop: number
    /**
     * 视频包总字节数
     */
    videoPacketBytes: bigint
    /**
     * 视频包总数
     */
    videoPacketCount: bigint
    /**
     * 当前视频包队列总数
     */
    videoPacketQueueLength: number
    /**
     * 视频包丢弃总数
     */
    videoDropPacketCount: bigint
    /**
     * 视频包解码错误总数
     */
    videoDecodeErrorPacketCount: number
    /**
     * 视频编码错误帧总数
     */
    videoEncodeErrorFrameCount: number
    /**
     * 视频解码帧总数
     */
    videoFrameDecodeCount: bigint
    /**
     * 视频编码包总数
     */
    videoPacketEncodeCount: bigint
    /**
     * 视频渲染帧总数
     */
    videoFrameRenderCount: bigint
    /**
     * 视频帧丢弃总数（解码未渲染）
     */
    videoFrameDropCount: number
    /**
     * 视频关键帧总数
     */
    keyFrameCount: bigint
  
    /**
     * buffer 丢弃总字节数
     */
    bufferDropBytes: bigint
    /**
     * buffer 接收总字节数
     */
    bufferReceiveBytes: bigint
    /**
     * buffer 发送总字节数
     */
    bufferSendBytes: bigint
    /**
     * buffer 总输出字节数
     * 
     */
    bufferOutputBytes: bigint
    /**
     * 音频码率
     */
    audioBitrate: number
    /**
     * 视频码率
     */
    videoBitrate: number
    /**
     * 视频解码帧率
     */
    videoDecodeFramerate: number
    /**
     * 视频渲染帧率
     */
    videoRenderFramerate: number
    /**
     * 视频编码帧率（根据 dts 计算）
     */
    videoEncodeFramerate: number
    /**
     * 音频解码帧率
     */
    audioDecodeFramerate: number
    /**
     * 音频渲染帧率
     */
    audioRenderFramerate: number
    /**
     * 音视频编码帧率（根据 dts 计算）
     */
    audioEncodeFramerate: number
  
    /**
     * 音频最大解码帧间隔（毫秒）
     */
    audioFrameDecodeIntervalMax: number
    /**
     * 音频最大渲染帧间隔（毫秒）
     */
    audioFrameRenderIntervalMax: number
    /**
     * 视频最大解码帧间隔（毫秒）
     */
    videoFrameDecodeIntervalMax: number
    /**
     * 视频最大渲染帧间隔（毫秒）
     */
    videoFrameRenderIntervalMax: number
    /**
     * 接收带宽
     */
    bandwidth: number
    /**
     * 抖动指标
     */
    jitter: number
  
    /**
     * jitter buffer
     */
    jitterBuffer: unknown
  
    /**
     * 音频卡顿次数
     */
    audioStutter: number
    /**
     * 视频卡顿次数
     */
    videoStutter: number
  
    /**
     * 音频 codec string
     */
    audiocodec: string
    /**
     * 视频 codec string
     */
    videocodec: string
  
    /**
     * 首个 audio mux dts
     */
    firstAudioMuxDts: bigint
    /**
     * 上一次 audio mux dts
     */
    lastAudioMuxDts: bigint
  
    /**
     * 首个 audio mux dts
     */
    firstVideoMuxDts: bigint
    /**
     * 上一次 video mux dts
     */
    lastVideoMuxDts: bigint
    /**
     * 当前音频播放时间戳
     */
    audioCurrentTime: bigint
    /**
     * 当前视频播放时间戳
     */
    videoCurrentTime: bigint
    /**
     * 下一个音频帧播放时间戳
     */
    audioNextTime: bigint
    /**
     * 下一个视频帧播放时间戳
     */
    videoNextTime: bigint
}