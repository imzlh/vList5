// 初始化avPlayer
export async function importAVPlayer(){
    const _CSS = window.CSS;
    window.CSS = {
        ..._CSS,
        // 空函数，用于导入ASS时避免出错
        registerProperty(){}
    };

    const script = document.createElement('script');
    script.src = AVPLAYER_SRC;
    document.body.append(script);
    await new Promise(rs => script.onload = rs);
    
    AVPlayer.setLogLevel(import.meta.DEV ? 1 : 4); // WARN LEVEL
    window.CSS = _CSS;
}