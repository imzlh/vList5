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