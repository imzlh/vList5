import type { vFile } from '@/env';
import PSD, { type NodeChild as PsdNode } from '@webtoon/psd';

class Node{
    readonly $name: string;
    readonly $children: Array<Node | LayerData>;
    private $hidden = false;
    private $switch: HTMLInputElement | undefined;

    static async create(psNode: PsdNode): Promise<Node | LayerData>{
        if(psNode.type == 'Group'){
            const children = [];
            for(let i = 0 ; i < psNode.children.length; i++){
                const child = psNode.children[i];
                if(child.type == 'Group')
                    children.push(await this.create(child));
                else{
                    const imgData = await child.composite();
                    children.push(new LayerData(imgData, child));
                }
            }
            return new Node(children, psNode);
        }else{
            return new LayerData(await psNode.composite(), psNode);
        }
    }

    private constructor(children: Array<Node | LayerData>, raw: PsdNode){
        this.$name = raw.name;
        this.$children = children;
    }

    get hidden(){
        return this.$hidden;
    }

    set hidden(value: boolean){
        this.$hidden = value;

        for(const child of this.$children)
            child.hidden = value;

        this.$switch && (this.$switch.checked = !value);
    }

    drawTo(canvas: CanvasRenderingContext2D){
        for(let i = this.$children.length-1 ; i >= 0; i--){
            const child = this.$children[i];
            if(!child.hidden)
                if(child instanceof LayerData)
                    child.put(canvas);
                else
                    child.drawTo(canvas);
        }
    }

    set switch(el: HTMLInputElement){
        this.$switch = el;
        el.addEventListener('change', () => this.hidden = !el.checked);
    }

    get name(){
        return this.$name;
    }
}

class LayerData{
    protected $raw;
    private $hidden;
    private $switch: HTMLInputElement | undefined;
    private $data: Uint8ClampedArray;

    constructor(data: Uint8ClampedArray, raw: PsdNode){
        if(raw.type!= 'Layer') throw new Error('Invalid layer data');

        this.$data = data;
        this.$raw = raw;
        this.$hidden = raw.isHidden;
    }

    get hidden(){
        return this.$hidden;
    }

    set hidden(value: boolean){
        this.$hidden = value;
        this.$switch && (this.$switch.checked = !value);
    }

    put(canvas: CanvasRenderingContext2D){
        const data = canvas.getImageData(this.$raw.left, this.$raw.top, this.$raw.width, this.$raw.height).data,
            data2 = this.$data;
        // 叠加
        for(let i = 0; i < data.length; i += 4){
            if(data2[i+3] == 0) continue;
            const opacity = data[i+3] / 255,
                opacity2 = data2[i+3] / 255;
            data[i] = data2[i] * opacity2 + data[i] * opacity * (1 - opacity2);
            data[i+1] = data2[i+1] * opacity2 + data[i+1] * opacity * (1 - opacity2);
            data[i+2] = data2[i+2] * opacity2 + data[i+2] * opacity * (1 - opacity2);
            data[i+3] = 255;
        }
        // 绘图
        canvas.putImageData(new ImageData(data, this.$raw.width, this.$raw.height), this.$raw.left, this.$raw.top);
    }

    set switch(el: HTMLInputElement){
        this.$switch = el;
        el.addEventListener('change', () => this.hidden = !el.checked);
    }

    get name(){ return this.$raw.name; }
}

export default class PSDReader {
    static async create(file: vFile){
        const data = await (await fetch(file.url)).arrayBuffer();
        const psd = PSD.parse(data);
        const children = await Promise.all(psd.children.map(node => Node.create(node)));
        return new this(children, psd);
    }

    protected $children: Array<Node | LayerData>;
    protected $raw: PSD;

    constructor(data: Array<Node | LayerData>, raw: PSD){
        this.$children = data, this.$raw = raw;
    }

    drawTo(canvas: CanvasRenderingContext2D){
        canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
        for(let i = this.$children.length-1 ; i >= 0; i--){
            const child = this.$children[i];
            if(!child.hidden)
                if(child instanceof LayerData)
                    child.put(canvas);
                else
                    child.drawTo(canvas);
        }
        console.debug('Flush canvas')
    }

    render(tree: HTMLUListElement, canvas: HTMLCanvasElement){
        // 绑定画布
        canvas.width = this.$raw.width, canvas.height = this.$raw.height;
        const ctx = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: true,
        });
        if(!ctx) throw new Error('Failed to get canvas context');
        this.drawTo(ctx);

        // 创建树
        const Tree = (element: HTMLUListElement, nodes: Array<Node | LayerData>) => {
            for(const node of nodes){
                let el = node instanceof Node? document.createElement('ul') : document.createElement('li');

                // 文本
                const span = document.createElement('span');
                span.innerText = node.name;

                // 按钮
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = !node.hidden;
                node.switch = input;
                input.addEventListener('change', () => this.drawTo(ctx));
                
                el.append(input, span);

                // 遍历
                if(node instanceof Node)
                    Tree(el as any, node.$children);

                
                element.append(el);
            }
        }
    
        Tree(tree, this.$children);
    }
}