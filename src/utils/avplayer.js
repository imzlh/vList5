/**
 * avPlayer polyfill for vList
 * javascript2typescript adapter
 * 
 * @copyright izGroup
 */

import PCM_WASM from 'libmedia/dist/decode/pcm-atomic.wasm?url';
import H264_WASM from 'libmedia/dist/decode/h264-atomic.wasm?url';
import AAC_WASM from 'libmedia/dist/decode/aac-atomic.wasm?url';
import MP3_WASM from 'libmedia/dist/decode/mp3-atomic.wasm?url';
import HEVC_WASM from 'libmedia/dist/decode/hevc-atomic.wasm?url';
import VVC_WASM from 'libmedia/dist/decode/vvc-atomic.wasm?url';
import MP4_WASM from 'libmedia/dist/decode/mpeg4-atomic.wasm?url';
import AV1_WASM from 'libmedia/dist/decode/av1-atomic.wasm?url';
import OPUS_WASM from 'libmedia/dist/decode/opus-atomic.wasm?url';
import FLAC_WASM from 'libmedia/dist/decode/flac-atomic.wasm?url';
import OGG_WASM from 'libmedia/dist/decode/vorbis-atomic.wasm?url';
import VP9_WASM from 'libmedia/dist/decode/vp9-atomic.wasm?url';
import RSP_WASM from 'libmedia/dist/resample/resample-atomic.wasm?url';
import SP_WASM from 'libmedia/dist/stretchpitch/stretchpitch-atomic.wasm?url';
import { markRaw, reactive, watch } from 'vue';
import AVPLAYER_SRC from 'libmedia/dist/avplayer/avplayer?url';

// 初始化avPlayer
const script = document.createElement('script');
script.src = AVPLAYER_SRC;
document.body.append(script);
await new Promise(rs => script.onload = rs);
AVPlayer.level = 3; // WARN LEVEL

const CODEC_MAP = {
    12: MP4_WASM,
    27: H264_WASM,
    167: VP9_WASM,
    173: HEVC_WASM,
    196: VVC_WASM,
    225: AV1_WASM,
    86018: AAC_WASM,
    86017: MP3_WASM,
    86021: OGG_WASM,
    86028: FLAC_WASM,
    86076: OPUS_WASM,
};

let webgpu = false;
const BUFFER_SIZE = 1000; 
const shader = `@group(0) @binding(0)
var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u,

  @builtin(local_invocation_id)
  local_id : vec3u,
) {
  if (global_id.x >= ${BUFFER_SIZE}u) {
    return;
  }

  output[global_id.x] =
    f32(global_id.x) * 1000. + f32(local_id.x);
}`;

// 测试WebGPU是否可用
try{
    const device = await (await navigator.gpu.requestAdapter()).requestDevice();

    const shaderModule = device.createShaderModule({code: shader});
    const output = device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        }),
        stagingBuffer = device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }
        ]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
        binding: 0,
        resource: {
            buffer: output,
        }
        }]
    });

    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        compute: {
            module: shaderModule,
            entryPoint: 'main'
        }
    });

    const passEncoder = device.createCommandEncoder().beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64));
    passEncoder.end();

    commandEncoder.copyBufferToBuffer(
        output, 0,
        stagingBuffer,
        0, BUFFER_SIZE
    );
    device.queue.submit([commandEncoder.finish()]);

    await stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0,
        BUFFER_SIZE
    );
    webgpu = true;
}catch{
    console.log('Your device doesnot support WebGPU. Maybe not support DX12?');
}

const AVMEDIA_TYPE_VIDEO = 0,
    AVMEDIA_TYPE_AUDIO = 1,
    AVMEDIA_TYPE_DATA = 2,
    AVMEDIA_TYPE_SUBTITLE = 3;

export default function(el){
    const player = new globalThis.AVPlayer({
        "container": el,
        "enableHardware": true,
        "getWasm": (type, codecId) => {
            switch (type) {
                case 'decoder': 
                    if (codecId >= 65536 && codecId <= 65572) return PCM_WASM;
                    else return CODEC_MAP[codecId] || null;

                case 'resampler':
                    return RSP_WASM;

                case 'stretchpitcher':
                    return SP_WASM;
            }
        },
        "enableWebGPU": webgpu,
        "simd": true
    });

    const refs = reactive({
        url: '',
        playBackRate: 1,
        loop: false,
        volume: 1,
        time: {
            total: 0,
            current: 0
        },
        tracks: {
            audio: [],
            audioTrack: 0,
            video: [],
            videoTrack: 0,
            subtitle: [],
            subTrack: 0
        },
        ended: false,
        play: false,
        stop: false,
        destroy: false,
        status: player.stats,
        display: {
            fill: false,
            rotate: 0,
            flip: {
                vertical: false,
                horizontal: false
            }
        },
        func: {
            snapshot: false,
            seek: 0,
            resize: markRaw([0, 0])
        }
    });

    watch(() => refs.url, url => url && player.load(url).then(function(){
        // 加载完毕
        refs.time.total = Number(player.getDuration());
        // 轨道分离
        refs.tracks.audio = [];
        refs.tracks.video = [];
        refs.tracks.subtitle = [];
        for (const stream of player.getStreams()){
            if(stream.type == AVMEDIA_TYPE_AUDIO)
                refs.tracks.audio.push(markRaw(stream));
            else if(stream.type == AVMEDIA_TYPE_VIDEO)
                refs.tracks.video.push(markRaw(stream));
            else if(stream.type == AVMEDIA_TYPE_SUBTITLE)
                refs.tracks.subtitle.push(markRaw(stream));
        }
        if(refs.tracks.subtitle.length > 0) refs.tracks.subTrack = 0;
        if(refs.tracks.video.length > 0) refs.tracks.videoTrack = 0;
        if(refs.tracks.audio.length > 0) refs.tracks.audioTrack = 0;
        refs.ended = false;
        refs.tracks.videoTrack = refs.tracks.audioTrack = refs.tracks.subTrack = 0;
    }));
    watch(() => refs.stop, res => res ? player.resume() : player.stop())
    watch(() => refs.playBackRate, rate => player.setPlaybackRate(rate));
    watch(() => refs.loop, loop => player.setLoop(loop));
    watch(() => refs.func.seek, seek => seek > 0 && (player.seek(seek), refs.func.seek = -1));
    watch(() => refs.volume, vol => player.setVolume(vol));
    watch(() => refs.play, state => state ? player.play() : player.pause());
    watch(() => refs.tracks.audioTrack, id => player.selectAudio(id));
    watch(() => refs.tracks.videoTrack, id => player.selectVideo(id));
    watch(() => refs.tracks.subTrack, id => player.selectSubtitle(id));
    watch(() => refs.destroy, val => val == false && player.destroy());
    watch(() => refs.display.fill, fill => player.setRenderMode(fill ? 1 : 0));
    watch(() => refs.display.rotate, rotate => player.setRotate(rotate));
    watch(() => refs.display.flip.horizontal, flip => player.enableHorizontalFlip(flip));
    watch(() => refs.display.flip.vertical, flip => player.enableVerticalFlip(flip));
    watch(() => refs.func.snapshot, val => val && (player.snapshot('webp'), val = false));
    watch(() => refs.func.resize, size => player.resize(size[0], size[1]));

    player.on('ended', () => refs.ended = true);
    player.on('time', pts => refs.time.current = Number(pts));

    return refs;
}