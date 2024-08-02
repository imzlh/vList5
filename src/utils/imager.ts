import type { CtxDispOpts, vFile } from "@/env";
import { FS, Global, splitPath } from "@/utils";
import { computed, readonly, ref, type Ref } from "vue";

export class ImageManager{

    static IMAGE = [
        "avif",
        "webp",
        "jpg", "jpeg", "jxl",
        "png",
        "ico",
        "bmp",
        "svg"
    ];
    static WHEEL_BEHAVIOR: 'zoom' | 'change' = 'zoom';

    private files: Ref<Array<vFile>> = ref([]);
    private id: Ref<number> = ref(-1);

    private readonly element: HTMLDivElement;
    private images: Array<HTMLImageElement> = [];
    private custom_ratio: number | null = null;
    private custom_offset: [number, number] = [0, 0];
    private custom_rotation: number | null = null;

    private current_dir = '';

    /**
     * 初始化图片管理器
     * @param element wrapper元素
     */
    constructor(element: HTMLDivElement){
        this.element = element;

        // 创建图片元素
        for(let i = 0 ; i < 3 ; i++){
            const img = document.createElement('img');
            img.draggable = false;
            img.crossOrigin = 'anonymous';
            img.loading = 'eager';
            this.images.push(img);
            this.element.appendChild(img);
        }

        // 绑定事件
        this.__init();
    }

    /**
     * 获取当前文件的ref
     */
    get file_ref(){
        return computed(() => this.files.value && this.files.value[this.id.value]);
    }

    /**
     * 获取ID ref
     */
    get id_ref(){
        return readonly(this.id);
    }

    /**
     * 获取文件列表 ref
     */
    get filelist_ref(){
        return readonly(this.files);
    }

    /**
     * 下一张图片
     */
    public async next(){
        const [img_prev, img_cur, img_next] = this.images;
        // id自增
        if(this.id.value == this.files.value.length -1)
            this.id.value = 0;
        else
            this.id.value++;

        // 上一张调整位置为下一张
        img_prev.src = this.id.value != this.files.value.length -1 ? this.files.value[this.id.value +1].url : this.files.value[0].url;
        // 调整数组
        this.images = [img_cur, img_next, img_prev];
        // 全部隐藏
        img_cur.hidden = img_next.hidden = true;
        // 重置位置
        await this.__reset();
        // 更改可见
        img_next.hidden = false;
    }

    /**
     * 上一张图片
     */
    public async prev(){
        const [img_prev, img_cur, img_next] = this.images;
        // id自减
        if(this.id.value == 0)
            this.id.value = this.files.value.length -1;
        else
            this.id.value--;

        // 本应该是下一张的调整位置为上一张
        img_next.src = this.id.value != 0 ? this.files.value[this.id.value -1].url : this.files.value[this.files.value.length -1].url;
        // 调整数组
        this.images = [img_next, img_prev, img_cur];
        // 全部隐藏
        img_next.hidden = img_cur.hidden = true;
        // 重置位置
        await this.__reset();
        // 更改可见
        img_prev.hidden = false;
    }

    private async __update(){
        const [img_prev, img_cur, img_next] = this.images;
        // 替换src
        img_prev.src = this.id.value == 0 ? this.files.value[this.files.value.length -1].url : this.files.value[this.id.value -1].url;
        img_cur.src = this.files.value[this.id.value].url;
        img_next.src = this.id.value == this.files.value.length -1 ? this.files.value[0].url : this.files.value[this.id.value +1].url;
        // 全部隐藏
        img_prev.hidden = img_cur.hidden = img_next.hidden = true;
        // 重置位置
        this.__reset();
        // 更改可见
        img_cur.hidden = false;
    }

    private async __reposition(){
        const image = this.images[1];

        if(image.naturalHeight + image.naturalWidth == 0)
            await new Promise(rs => image.addEventListener('load', rs, { once: true }));

        // 重置图片位置
        image.style.left = this.custom_offset[0] + 'px';
        image.style.top = this.custom_offset[1] + 'px';
    }

    /**
     * 图片旋转角度
     */
    set rotate(deg: number){
        // 旋转图片
        this.images[1].style.transform = `rotate(${deg}deg)`;
        // 记录旋转角度
        this.custom_rotation = deg;
    }

    get rotate(){
        return this.custom_rotation || 0;
    }

    private async __resize(){
        const image = this.images[1];
        const box_size = this.element.getBoundingClientRect(),
            width = box_size.width,
            height = box_size.height;

        if(image.naturalHeight + image.naturalWidth == 0)
            await new Promise(rs => image.addEventListener('load', rs, { once: true }));

        // 重置图片旋转
        this.images[1].style.transform = 'rotate(0deg)';

        if(this.custom_ratio){
            image.width = image.naturalWidth * this.custom_ratio;
            image.height = image.naturalHeight * this.custom_ratio;
        }else{
            if(image.naturalHeight > width || image.naturalHeight > height){
                const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
                image.width = ratio * image.naturalWidth;
                image.height = ratio * image.naturalHeight;
            }else{
                image.width = image.naturalWidth;
                image.height = image.naturalHeight;
            }
        }
    }

    /**
     * 图片缩放比
     */
    set scale(ratio: number){
        // 缩放图片
        this.custom_ratio = ratio;
        this.__resize();
    }

    get scale(){
        return this.custom_ratio || 1;
    }

    /**
     * 移动图片量
     */
    set offset(offset: [number, number]){
        // 偏移图片
        this.custom_offset = offset;
        this.__reposition();
    }

    get offset(){
        return this.custom_offset;
    }

    /**
     * 当前图片ID
     */
    get current(){
        return this.id.value;
    }

    set current(id: number){
        this.id.value = id;
        this.__update();
    }

    private async __reset(){
        this.custom_ratio = null;
        this.custom_rotation = null;

        // 重置图片大小
        await this.__resize();

        // 重置custom_offset
        const box_size = this.element.getBoundingClientRect(),
            width = box_size.width,
            height = box_size.height;
        this.custom_offset = [
            width / 2 - this.images[1].width / 2,
            height / 2 - this.images[1].height / 2
        ]

        // 重置位置
        await this.__reposition();

        // 重置图片旋转
        this.images[1].style.transform = 'rotate(0deg)';
    }

    private __wheel(e: WheelEvent){
        e.preventDefault();
        const delta = e.deltaY;
        if(ImageManager.WHEEL_BEHAVIOR == 'change'){
            if(delta > 0){
                this.prev();
            }else{
                this.next();
            }
        }else{
            const image = this.images[1];
            if((e.target as HTMLImageElement).tagName.toLowerCase() != 'img') return;
            
            // 定位鼠标在图片相对位置
            const rect = image.getBoundingClientRect(),
                box_offset = this.element.getBoundingClientRect(),
                relative_x = e.clientX - this.custom_offset[0] - box_offset.left,
                relative_y = e.clientY - this.custom_offset[1] - box_offset.top;

            // 缩放比
            const rate = 1 - delta / 1000;
            this.custom_ratio = (this.custom_ratio ?? image.clientWidth / image.naturalWidth) * rate;
            this.__resize();

            // 使图片回到以鼠标为中心
            this.custom_offset = [
                e.clientX - box_offset.left - relative_x * rate,
                e.clientY - box_offset.top - relative_y * rate
            ];
            this.__reposition();
        }
    }

    private __keydown(e: KeyboardEvent){
        switch(e.key){
            case 'ArrowRight':
                this.next();
                break;

            case 'ArrowLeft':
                this.prev();
                break;

            case 'ArrowUp':
                this.custom_ratio = (this.custom_ratio || 1) + 0.1;
                this.__resize();
                break;

            case 'ArrowDown':
                this.custom_ratio = (this.custom_ratio || 1) - 0.1;
                this.__resize();
                break;

            case 'PageUp':
                this.custom_ratio = (this.custom_ratio || 1) + 0.5;
                this.__resize();
                break;

            case 'PageDown':
                this.custom_ratio = (this.custom_ratio || 1) - 0.5;
                this.__resize();
                break;

            case 'Home':
                this.custom_offset = [0, 0];
                this.__reposition();
                break;

            case 'End':
                this.custom_offset = [0, 0];
                this.__reposition();
                break;

            case 'Enter':
                this.custom_ratio = null;
                this.__resize();
                break;

            case 'Escape':
                this.__reset();
                break;
        }
    }

    private __mouse(e: MouseEvent){
        if((e.target as HTMLElement).tagName.toLowerCase() != 'img' || e.button != 0) return;

        const [offsetX, offsetY] = this.custom_offset

        const handleMove = (ev: MouseEvent) => {
            e.preventDefault();

            this.custom_offset[0] = offsetX + ev.clientX - e.clientX;
            this.custom_offset[1] = offsetY + ev.clientY - e.clientY;

            this.__reposition();
        }

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleMove);
        });
    }

    private __touch(e: TouchEvent){
        if((e.target as HTMLElement).tagName.toLowerCase() != 'img') return;
        e.preventDefault();

        // 重置图片旋转
        this.images[1].style.transform = 'rotate(0deg)';

        // 原始位置
        const [offsetX, offsetY] = this.custom_offset;

        const handleTouch = (ev: TouchEvent) => {
            ev.preventDefault();

            // 单手指 => 移动图片
            if(e.touches.length == 1){
                const x = ev.touches[0].clientX - e.touches[0].clientX + offsetX,
                    y = ev.touches[0].clientY - e.touches[0].clientY + offsetY;

                if(this.custom_offset){
                    this.custom_offset[0] = x;
                    this.custom_offset[1] = y;
                }else{
                    this.custom_offset = [x, y];
                }

                this.__reposition();
            // 双手指 => 缩放图片
            }else if(e.touches.length == 2){
                const image = this.images[1];
                const raw_distance = Math.sqrt(
                    (e.touches[0].clientX - e.touches[1].clientX) ** 2 +
                    (e.touches[0].clientY - e.touches[1].clientY) ** 2
                ),current_distance = Math.sqrt(
                    (e.touches[1].clientX - e.touches[0].clientX) ** 2 +
                    (e.touches[1].clientY - e.touches[0].clientY) ** 2
                );

                this.custom_ratio = current_distance / raw_distance * (
                    this.custom_ratio ||
                    image.width / image.naturalWidth
                );

                this.__resize();
            }
        }

        document.addEventListener('touchmove', handleTouch, {
            passive: false
        });
        document.addEventListener('touchend', e => {
            e.preventDefault();
            document.removeEventListener('touchmove', handleTouch);
        }, { passive: false, once: true });
    }

    /**
     * 拍摄当前图片并复制到剪贴板
     * @returns void
     */
    shoot(){
        const canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');

        const E_IMAGE = {
            "type": "error",
            "title": "Imager",
            "content": {
                "title": "复制图片失败",
                "content": "获取图像失败(-1)"
            },
            "timeout": 5
        }, E_CLIPBOARD = {
            "type": "error",
            "title": "Imager",
            "content": {
                "title": "复制图片失败",
                "content": "无法访问剪贴板，请检查浏览器版本和权限"
            },
            "timeout": 5
        };

        // 设置Image
        if(!ctx) return Global('ui.message').call(E_IMAGE);

        // 转Blob
        const img = this.images[1];
        img.onload = function(){
            // 重置画布大小
            canvas.width = img.naturalWidth,
            canvas.height = img.naturalHeight;
            // 复制图像(-->jpg)
            ctx.drawImage(img,0,0);
            // 转Blob
            canvas.toBlob(function(blob){
                if(!blob) return Global('ui.message').call(E_CLIPBOARD);
                // 复制
                navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]).catch(() => Global('ui.message').call(E_CLIPBOARD));
            });
        },img.onerror = () => Global('ui.message').call(E_IMAGE);
    }

    /**
     * 复制图片链接
     */
    public copy_link(){
        function gerror(e:Error){
            Global('ui.message').call({
                "type": "error",
                "title": "Imager",
                "content":{
                    "title": "复制图片链接失败",
                    "content": "无法访问剪贴板，请检查浏览器版本和权限"
                },
                "timeout": 5
            });
            console.error(e);
        }
        try{
            navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([this.images[1].src],{
                        type: 'text/plain'
                    })
                })
            ]).catch(gerror);
        }catch(e){ gerror(e as Error) }
    }

    private __contextmenu(e: MouseEvent){
        Global('ui.ctxmenu').call({
            "pos_x": e.clientX,
            "pos_y": e.clientY,
            "content": [
                {
                    "text": "向右旋转45°",
                    handle: () => this.rotate += 45
                },{
                    "text": "向左旋转45°",
                    handle: () => this.rotate -= 45
                },{
                    "text": "倒置图片",
                    handle: () => this.rotate = this.rotate >= 180 ? 0 : 180
                },{
                    "text": "放大10%",
                    handle: () => this.scale /= .9
                },{
                    "text": "缩小10%",
                    handle: () => this.scale *= .9
                },{
                    "text": "恢复默认值",
                    handle: () => this.__reset()
                },'---',{
                    "text": "复制图片",
                    handle: () => this.shoot()
                },{
                    "text": "复制图片链接",
                    handle: () => this.copy_link()
                },
            ]
        } satisfies CtxDispOpts);
    }

    private __init(){
        this.element.addEventListener('wheel', e => this.__wheel(e));
        this.element.addEventListener('keydown', e => this.__keydown(e));
        this.element.addEventListener('mousedown', e => this.__mouse(e));
        this.element.addEventListener('touchstart', e => this.__touch(e), { passive: false });
        this.element.addEventListener('contextmenu', e => this.__contextmenu(e));
    }

    /**
     * 更改当前图片
     * @param f 文件
     */
    async setImage(f: vFile):Promise<void>{
        const info = splitPath(f);

        if(info.dir == this.current_dir){
            // 激活viewer
            for (let i = 0; i < this.files.value.length; i++)
                if(this.files.value[i].path == f.path)
                    return this.id.value = i, this.__update();
            Global('ui.message').call({
                "type": "error",
                "title": "Imager",
                "content":{
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                },
                "timeout": 5
            })
        }else{
            // 请求URL
            const temp:Array<vFile> = [];
            let id = -1;
            ((await FS.listall(info.dir)).filter(item => item.type == 'file') as vFile[])
                .forEach(data => {
                    (ImageManager.IMAGE.includes(splitPath(data)['ext'].toLowerCase()))
                    && ( data.path == f.path ? id = temp.push(data)-1 : temp.push(data) )
                });
            this.files.value = temp;
            this.current_dir = info.dir;
            // 激活viewer
            if(id == -1) Global('ui.message').call({
                "type": "error",
                "title": "Imager",
                "content":{
                    "title": "找不到文件",
                    "content": "文件可能被移动、删除等，请尝试刷新网页"
                },
                "timeout": 5
            });
            else this.id.value = id;
            this.__update();
        }
    }
}