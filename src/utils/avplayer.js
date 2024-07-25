/**
 * avPlayer polyfill for vList
 * javascript2typescript adapter
 * 
 * @copyright izGroup
 */

import PCM_WASM from 'libmedia/dist/decode/pcm-simd.wasm?url';
import H264_WASM from 'libmedia/dist/decode/h264-simd.wasm?url';
import AAC_WASM from 'libmedia/dist/decode/aac-simd.wasm?url';
import MP3_WASM from 'libmedia/dist/decode/mp3-simd.wasm?url';
import HEVC_WASM from 'libmedia/dist/decode/hevc-simd.wasm?url';
import VVC_WASM from 'libmedia/dist/decode/vvc-simd.wasm?url';
import MP4_WASM from 'libmedia/dist/decode/mpeg4-simd.wasm?url';
import AV1_WASM from 'libmedia/dist/decode/av1-simd.wasm?url';
import OPUS_WASM from 'libmedia/dist/decode/opus-simd.wasm?url';
import FLAC_WASM from 'libmedia/dist/decode/flac-simd.wasm?url';
import OGG_WASM from 'libmedia/dist/decode/vorbis-simd.wasm?url';
import VP9_WASM from 'libmedia/dist/decode/vp9-simd.wasm?url';
import RSP_WASM from 'libmedia/dist/resample/resample-simd.wasm?url';
import SP_WASM from 'libmedia/dist/stretchpitch/stretchpitch-simd.wasm?url';
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
// @link https://mdn.github.io/dom-examples/webgpu-render-demo/script.js
try{
    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 },
        vertices = new Float32Array([
            0.0,  0.6, 0, 1, 1, 0, 0, 1,
            -0.5, -0.6, 0, 1, 0, 1, 0, 1,
            0.5, -0.6, 0, 1, 0, 0, 1, 1
        ]),shaders = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`;
    const adapter = await navigator.gpu.requestAdapter(),
        device = await adapter.requestDevice(),
        shaderModule = device.createShaderModule({ code: shaders });

    const canvas = document.createElement('canvas'),
        context = canvas.getContext('webgpu');

    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied'
    });

    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const vertexBuffers = [{
            attributes: [{
                shaderLocation: 0, // position
                offset: 0,
                format: 'float32x4'
            }, {
                shaderLocation: 1, // color
                offset: 16,
                format: 'float32x4'
            }],
            arrayStride: 32,
            stepMode: 'vertex'
        }],pipelineDescriptor = {
            vertex: {
                module: shaderModule,
                entryPoint: 'vertex_main',
                buffers: vertexBuffers
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragment_main',
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: 'triangle-list'
            },
            layout: 'auto'
        };

    const renderPipeline = device.createRenderPipeline(pipelineDescriptor),
        commandEncoder = device.createCommandEncoder(),
        renderPassDescriptor = {
            colorAttachments: [{
            clearValue: clearColor,
            loadOp: 'clear',
            storeOp: 'store',
            view: context.getCurrentTexture().createView()
            }]
        },
        passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}catch(e){
    console.warn('Your device doesnot support WebGPU.');
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
    watch(() => refs.destroy, val => val && player.destroy());
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