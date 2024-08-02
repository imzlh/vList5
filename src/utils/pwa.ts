import type { MessageOpinion, vFile } from "@/env";
import { FS, Global, openFile } from "@/utils";

// @function 加载外部文件

declare global{
    interface LaunchParams{
        files: Array<FileSystemFileHandle>,
        targetURL: string
    }

    namespace launchQueue{
        function setConsumer(callback: (param: LaunchParams) => any): void;
    }
}

if ("launchQueue" in globalThis) {
    globalThis.launchQueue.setConsumer(async launchParams => {
        const url = new URL(launchParams.targetURL);
        if (launchParams.files && launchParams.files.length)
            for (const file of launchParams.files) 
                if(url.searchParams.has('open')){
                    openFile(await FS.create(file));
                }else{
                    Global('ui.choose').call('/')
                        .then((arr: Array<vFile>) => file.getFile().then(f => 
                            FS.write(arr[0].path, f)
                        ));
                }
    });
}

// @function 使用系统通知
// try{
//     const prom = await Notification.requestPermission();
//     const raw = Global('ui.message').data;
//     Global('ui.message').data = function(data: MessageOpinion){
//         if(!data.title && !data.content?.content)
//             return raw(data);

//         const msg = new Notification(data.title as string,{
//             "body": data.content?.content
//         });
//         navigator.not.
//     }
// }catch{
//     console.log('通知被禁用或不支持')
// }