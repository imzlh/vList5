import { type vFile } from "@/env";
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