/**
 * avPlayer polyfill for vList
 * javascript2typescript adapter
 * 
 * @copyright izGroup
 */

import PCM_WASM from 'libmedia/dist/decode/pcm-simd.wasm?url';
import H264_WASM from 'libmedia/dist/decode/h264-simd.wasm?url';
import OGV_WASM from 'libmedia/dist/decode/theora-simd.wasm?url';
import AAC_WASM from 'libmedia/dist/decode/aac-simd.wasm?url';
import MP3_WASM from 'libmedia/dist/decode/mp3-simd.wasm?url';
import HEVC_WASM from 'libmedia/dist/decode/hevc-simd.wasm?url';
import VVC_WASM from 'libmedia/dist/decode/vvc-simd.wasm?url';
import MP4_WASM from 'libmedia/dist/decode/mpeg4-simd.wasm?url';
import AV1_WASM from 'libmedia/dist/decode/av1-simd.wasm?url';
import OPUS_WASM from 'libmedia/dist/decode/opus-simd.wasm?url';
import FLAC_WASM from 'libmedia/dist/decode/flac-simd.wasm?url';
import OGG_WASM from 'libmedia/dist/decode/vorbis-simd.wasm?url';
import AC3_WASM from 'libmedia/dist/decode/vorbis-simd.wasm?url';
import EAC3_WASM from 'libmedia/dist/decode/eac3-simd.wasm?url';
import DTS_WASM from 'libmedia/dist/decode/dca-simd.wasm?url';
import VP9_WASM from 'libmedia/dist/decode/vp9-simd.wasm?url';
import RSP_WASM from 'libmedia/dist/resample/resample-simd.wasm?url';
import SP_WASM from 'libmedia/dist/stretchpitch/stretchpitch-simd.wasm?url';
import { markRaw, reactive, watch } from 'vue';
import AVPLAYER_SRC from 'libmedia/dist/avplayer/avplayer?url';

// 初始化avPlayer
const _CSS = window.CSS;
window.CSS = {
    ..._CSS,
    registerProperty(def){
        console.debug('Register property:', def.name);
    }
};
async function importAVPlayer(){
    const script = document.createElement('script');
    script.src = AVPLAYER_SRC;
    document.body.append(script);
    await new Promise(rs => script.onload = rs);
    window.CSS = _CSS;
    AVPlayer.level = 3; // WARN LEVEL
}

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

let webgpu = false;

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
fn vertex(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment(fragData: VertexOut) -> @location(0) vec4f
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
                entryPoint: 'fragment',
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: 'triangle'
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

export default async function create(el){
    if(!globalThis.AVPlayer) await importAVPlayer();
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
            subTrack: 0,
            chapter: []
        },
        ended: false,
        play: false,
        stop: false,
        destroy: () => player.destroy(),
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
            snapshot: (type = 'webp') => player.canvas.toBlob(data => {
                let url = URL.createObjectURL(data);
                window.open(url).onbeforeunload = () => URL.revokeObjectURL(url);
            }, 'image/' + type, 1),
            seek: time => player.seek(time),
            resize: markRaw([0, 0]),
            extSub: track => player.loadExternalSubtitle(track).then(() => {
                const stream = player.getStreams().at(-1);
                refs.tracks.subtitle.push(stream);
                refs.tracks.subTrack = stream.id;
                return stream;
            })
        }
    });

    watch(() => refs.url, async (url, old) => {
        refs.time.total = 0;
        old && await player.stop();
        url && player.load(url).then(function(){
            // 加载完毕
            refs.time.total = player.getDuration();
            // 轨道分离
            refs.tracks.audio = markRaw([]);
            refs.tracks.video = markRaw([]);
            refs.tracks.subtitle = markRaw([]);
            for (const stream of player.getStreams()){
                if(stream.mediaType == 'Audio')
                    refs.tracks.audio.push(markRaw(stream));
                else if(stream.mediaType == 'Video')
                    refs.tracks.video.push(markRaw(stream));
                else if(stream.mediaType == 'Subtitle')
                    refs.tracks.subtitle.push(markRaw(stream));
            }
            refs.ended = false;
            refs.tracks.chapter = player.getChapters();
            player.play().then(() => refs.play = true);
        }
    )});
    watch(() => refs.stop, res => res ? player.resume() : player.stop())
    watch(() => refs.playBackRate, rate => player.setPlaybackRate(rate));
    watch(() => refs.loop, loop => player.setLoop(loop));
    watch(() => refs.volume, vol => player.setVolume(vol));
    watch(() => refs.play, state => state ? player.play() : player.pause());
    watch(() => refs.tracks.audioTrack, id => id && player.getSelectedAudioStreamId() != id && player.selectAudio(id));
    watch(() => refs.tracks.videoTrack, id => id > 0 && player.getSelectedVideoStreamId() != id && player.selectVideo(id));
    watch(() => refs.tracks.subTrack, id => id > 0 && player.getSelectedSubtitleStreamId() != id && player.selectSubtitle(id));
    watch(() => refs.display.fill, fill => player.setRenderMode(fill ? 1 : 0));
    watch(() => refs.display.rotate, rotate => player.setRotate(rotate));
    watch(() => refs.display.flip.horizontal, flip => player.enableHorizontalFlip(flip));
    watch(() => refs.display.flip.vertical, flip => player.enableVerticalFlip(flip));
    watch(() => refs.func.resize, size => player.resize(size[0], size[1]));

    player.on('ended', () => refs.ended = true);
    player.on('time', pts => refs.time.current = pts);
    player.on('firstVideoRendered', function(){
        refs.tracks.videoTrack = player.getSelectedVideoStreamId();
        refs.tracks.audioTrack = player.getSelectedAudioStreamId();
        refs.tracks.subTrack = player.getSelectedSubtitleStreamId();
    });

    // 欺骗ASS.js
    // el.videoHeight = el.videoWidth = 
    // el.currentTime = 0;
    // el.paused = true;

    watch(() => refs.time.total, total => el.duration = total || 0n);
    // player.on('ended', () => el.dispatchEvent(new Event('ended')));
    // player.on('loading', () => el.dispatchEvent(new Event('waiting')));
    // player.on('loaded', () => el.dispatchEvent(new Event('load')));
    // player.on('played', () => el.dispatchEvent(new Event('play')));
    // player.on('paused', () => el.dispatchEvent(new Event('pause')));
    // player.on('seeking', () => el.dispatchEvent(new Event('seeking')));
    // player.on('seeked', () => el.dispatchEvent(new Event('seeked')));
    player.on('time', time => el.currentTime = time);

    return refs;
}