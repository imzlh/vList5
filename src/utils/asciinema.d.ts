declare module 'asciinema-player' {
    export function create(url: string, element: HTMLElement, options: any): Player;

    interface Events{
        play: () => void;
        pause: () => void;
        input: (data: {data: string}) => void;
        ended: () => void;
        playing: () => void;
        marker: (data: { index: number, time: number, label: string }) => void;
    }

    export class Player {
        dispose(): void;
        play(): void;
        pause(): void;
        seek(time: number): void;
        getCurrentTime(): number;
        getDuration(): number;
        addEventListener<T extends keyof Events>(event: T, listener: Events[T]): void;
    }
}
