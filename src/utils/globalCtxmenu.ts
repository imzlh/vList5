import { contextMenu } from "@/App.vue";
import type { CtxDispOpts } from "@/env";
import { active } from "@/module/ctxmenu.vue";
import { showCommandPanel } from "@/module/panel.vue";
import { createWindow } from "@/utils";
import I_CHROME from '/app/chrome.svg';
import I_REFRESH from '/icon/refresh.webp';

window.addEventListener('contextmenu', async function(e) {
    e.preventDefault();
    if(!e.target) return;
    const target = e.target as HTMLElement;

    // 检查是否已经激活了右键菜单
    if(active.value !== -1) return;

    const initData: CtxDispOpts = {
        "pos_x": e.clientX,
        "pos_y": e.clientY,
        content: [{
            icon: I_REFRESH,
            text: '重新加载',
            handle: () => window.location.reload()
        }, {
            text: '打开命令窗口',
            handle: () => showCommandPanel()
        }]
    };

    // 检查是否有文本选择
    if(window.getSelection()?.toString()){
        initData.content.push('---');
        
        const text = window.getSelection()!.toString();
        initData.content.push({
            text: '复制 (^C)',
            handle: () => this.navigator.clipboard.writeText(text)
        });

        if(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'){
            initData.content.push({
                text: '剪切 (^X)',
                handle: () => {
                    const select = window.getSelection()!,
                        data = select.toString();
                    select.empty();
                    this.navigator.clipboard.writeText(data);
                }
            });

            try{
                const textInClipboard = await this.navigator.clipboard.readText();
                if(textInClipboard) initData.content.push({
                    text: '粘贴 (^V)',
                    handle: () => {
                        const select = window.getSelection()!;
                        select.empty();
                        select.getRangeAt(0).insertNode(document.createTextNode(textInClipboard));
                    }
                });
            }catch{}
        }
    }

    // <a>链接
    if(target.tagName === 'A' && (target as HTMLAnchorElement).href){
        initData.content.push('---');
        initData.content.push({
            text: '打开链接',
            handle: () => createWindow({
                "name": (target as HTMLAnchorElement).innerText.substring(0, 10),
                "content": (target as HTMLAnchorElement).href,
                "icon": I_CHROME
            })
        }, {
            text: '复制链接',
            handle: () => this.navigator.clipboard.writeText((target as HTMLAnchorElement).href)
        });
    }

    contextMenu(initData);
})