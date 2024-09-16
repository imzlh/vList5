import { UI } from '@/App.vue';
import WebViewTemplate from './webview.html?raw';
import { parse } from 'ini';

export class vWebView {
    private root: ShadowRoot;
    private webview: HTMLIFrameElement;
    private container: HTMLElement;

    constructor(container: HTMLElement){
        this.root = container.attachShadow({mode: 'open'});
        this.root.innerHTML = WebViewTemplate;
        this.container = this.root.getElementById('root') as HTMLElement;
        this.webview = this.root.getElementById('frame') as HTMLIFrameElement;
        this.webview.allow = 'fullscreen';
        this.webview.referrerPolicy = 'no-referrer';

        const btns = this.root.getElementById('btns') as HTMLDivElement,
            __child = Array.from(btns.children as any as ArrayLike<HTMLElement>),
            fullscreenBtn = __child.filter(node => node.dataset.role === 'fullscreen')[0],
            exitFullscreenBtn = __child.filter(node => node.dataset.role === 'exit-fullscreen')[0];
        btns.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if(!target.dataset.role) return;
            e.preventDefault();

            switch(target.dataset.role){
                case 'fullscreen':
                    this.container.requestFullscreen();
                    UI.fullscreen.value = true;
                    fullscreenBtn.hidden = true;
                    exitFullscreenBtn.hidden = false;
                    break;

                case 'exit-fullscreen':
                    UI.fullscreen.value = false;
                    fullscreenBtn.hidden = false;
                    exitFullscreenBtn.hidden = true;
                    document.exitFullscreen();
                    break;

                case 'reload':
                    this.src = this.webview.src;
                    break;

                case 'open-in-browser':
                    window.open(this.webview.src);
                    break;
            }
        });
    }

    set src(url: string){
        const urlObj = new URL(url, window.location.href);
        if(urlObj.pathname.endsWith('.url'))
            fetch(url)
               .then(response => response.text())
               .then(text => parse(text))
               .then(ini => {
                    const target = ini.InternetShortcut.URL,
                        type = ini.InternetShortcut.ShowCommand;
                    if(type == '3'){
                        window.open(target);
                    }else{
                        this.webview.src = target;
                    }
               });
        else
            this.webview.src = url;
    }

    get src(): string{
        return this.webview.src;
    }

    addArg(arg: string){
        this.container.setAttribute(arg, '');
    }

    reload(){
        this.webview.src = this.webview.src;
    }
}