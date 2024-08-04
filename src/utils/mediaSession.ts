import { shallowRef } from "vue";

export interface mediaSessionCtrl {
    element: HTMLMediaElement;
    seekOnce: number;
    prev: () => void;
    next: () => void;
};

const ctrl = shallowRef<mediaSessionCtrl>();

export const  updateMediaSession = (data: MediaMetadataInit) =>
    navigator.mediaSession && (navigator.mediaSession.metadata = new MediaMetadata(data));

export default ctrl;

if('mediaSession' in navigator){
    navigator.mediaSession.setActionHandler('play', () => ctrl.value?.element.play());
    navigator.mediaSession.setActionHandler('pause', () => ctrl.value?.element.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => 
        ctrl.value && (ctrl.value.element.currentTime -= ctrl.value?.seekOnce)
    );
    navigator.mediaSession.setActionHandler('seekforward', () => 
        ctrl.value && (ctrl.value.element.currentTime += ctrl.value?.seekOnce)
    );
    navigator.mediaSession.setActionHandler('previoustrack', () => ctrl.value?.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => ctrl.value?.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        const seekTime = details.seekTime;
        ctrl.value && seekTime && (ctrl.value.element.currentTime = seekTime);
    });
    navigator.mediaSession.setActionHandler('stop', () => ctrl.value?.element.pause());
}