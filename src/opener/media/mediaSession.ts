import { shallowRef } from "vue";

export interface mediaSessionCtrl {
    seekOnce: number;
    prev: () => void;
    next: () => void;
    play: () => void;
    pause: () => void;
    set time(time: number);
    get time(): number;
};

const ctrl = shallowRef<mediaSessionCtrl>();

export const  updateMediaSession = (data: MediaMetadataInit) =>
    navigator.mediaSession && (navigator.mediaSession.metadata = new MediaMetadata(data));

export default ctrl;

if('mediaSession' in navigator){
    navigator.mediaSession.setActionHandler('play', () => ctrl.value?.play());
    navigator.mediaSession.setActionHandler('pause', () => ctrl.value?.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => 
        ctrl.value && (ctrl.value.time -= ctrl.value.seekOnce)
    );
    navigator.mediaSession.setActionHandler('seekforward', () => 
        ctrl.value && (ctrl.value.time += ctrl.value.seekOnce)
    );
    navigator.mediaSession.setActionHandler('previoustrack', () => ctrl.value?.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => ctrl.value?.next());
    navigator.mediaSession.setActionHandler('seekto', ({seekTime}) => ctrl.value && seekTime && (ctrl.value.time = seekTime)),
    navigator.mediaSession.setActionHandler('stop', () => ctrl.value?.pause());
}