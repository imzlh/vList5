/**
 * 输出对应AVwasm
 */

// import PCM_WASM from 'libmedia/dist/decode/pcm-simd.wasm?url';
// import H264_WASM from 'libmedia/dist/decode/h264-simd.wasm?url';
// import OGV_WASM from 'libmedia/dist/decode/theora-simd.wasm?url';
// import AAC_WASM from 'libmedia/dist/decode/aac-simd.wasm?url';
// import MP3_WASM from 'libmedia/dist/decode/mp3-simd.wasm?url';
// import HEVC_WASM from 'libmedia/dist/decode/hevc-simd.wasm?url';
// import VVC_WASM from 'libmedia/dist/decode/vvc-simd.wasm?url';
// import MP4_WASM from 'libmedia/dist/decode/mpeg4-simd.wasm?url';
// import AV1_WASM from 'libmedia/dist/decode/av1-simd.wasm?url';
// import OPUS_WASM from 'libmedia/dist/decode/opus-simd.wasm?url';
// import FLAC_WASM from 'libmedia/dist/decode/flac-simd.wasm?url';
// import OGG_WASM from 'libmedia/dist/decode/vorbis-simd.wasm?url';
// import AC3_WASM from 'libmedia/dist/decode/ac3-simd.wasm?url';
// import EAC3_WASM from 'libmedia/dist/decode/eac3-simd.wasm?url';
// import DTS_WASM from 'libmedia/dist/decode/dca-simd.wasm?url';
// import VP9_WASM from 'libmedia/dist/decode/vp9-simd.wasm?url';
// import RSP_WASM from 'libmedia/dist/resample/resample-simd.wasm?url';
// import SP_WASM from 'libmedia/dist/stretchpitch/stretchpitch-simd.wasm?url';

const CDN = 'https://cdn.jsdelivr.net/gh/zhaohappy/libmedia/dist'

const PCM_WASM = `${CDN}/decode/pcm-simd.wasm`,
    H264_WASM = `${CDN}/decode/h264-simd.wasm`,
    OGV_WASM = `${CDN}/decode/theora-simd.wasm`,
    AAC_WASM = `${CDN}/decode/aac-simd.wasm`,
    MP3_WASM = `${CDN}/decode/mp3-simd.wasm`,
    HEVC_WASM = `${CDN}/decode/hevc-simd.wasm`,
    VVC_WASM = `${CDN}/decode/vvc-simd.wasm`,
    MP4_WASM = `${CDN}/decode/mpeg4-simd.wasm`,
    AV1_WASM = `${CDN}/decode/av1-simd.wasm`,
    OPUS_WASM = `${CDN}/decode/opus-simd.wasm`,
    FLAC_WASM = `${CDN}/decode/flac-simd.wasm`,
    OGG_WASM = `${CDN}/decode/vorbis-simd.wasm`,
    AC3_WASM = `${CDN}/decode/ac3-simd.wasm`,
    EAC3_WASM = `${CDN}/decode/eac3-simd.wasm`,
    DTS_WASM = `${CDN}/decode/dca-simd.wasm`,
    VP9_WASM = `${CDN}/decode/vp9-simd.wasm`,
    RSP_WASM = `${CDN}/resample/resample-simd.wasm`,
    SP_WASM = `${CDN}/stretchpitch/stretchpitch-simd.wasm`;

const CODEC_MAP = {
    12: MP4_WASM,
    27: H264_WASM,
    30: OGV_WASM,
    167: VP9_WASM,
    173: HEVC_WASM,
    196: VVC_WASM,
    225: AV1_WASM,
    86018: AAC_WASM,
    86017: MP3_WASM,
    86021: OGG_WASM,
    86028: FLAC_WASM,
    86076: OPUS_WASM,
    86019: AC3_WASM,
    86056: EAC3_WASM,
    86020: DTS_WASM,
};

export function getWasm (type: string, codecId?: number){
    switch (type) {
        case 'decoder': 
            if(!codecId) return null;
            if (codecId >= 65536 && codecId <= 65572) return PCM_WASM;
            // @ts-ignore
            else return CODEC_MAP[codecId] || null;

        case 'resampler':
            return RSP_WASM;

        case 'stretchpitcher':
            return SP_WASM;
    }
}