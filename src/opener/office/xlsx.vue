<script lang="ts" setup>
    import type { vFile } from '@/env';
    import { onMounted, ref, type PropType } from 'vue';
    import Spreadsheet from "x-data-spreadsheet";
    import { read, write } from 'xlsx';
    import { FS, message, reqFullscreen, UI } from '@/utils';

    const { option: file } = defineProps({
            option: {
                type: Object as PropType<vFile>,
                    required: true
            }
        }),
        data = read(await (await fetch(file.url)).arrayBuffer()),
        box = ref<HTMLDivElement>();

    let obj: undefined | Spreadsheet;

    async function save() {
        // @ts-expect-error
        const wb = xtos(obj!.getData()),
            data: ArrayBuffer = write(wb, { compression: true, type: 'array' });
        const blob = new Blob([data], { type: "application/octet-stream" });
        await FS.write(file.path, blob, true);
        message({
            "type": "success",
            "title": "Excel",
            "timeout": 5,
            "content": {
                "title": "保存成功",
                "content": "文件已成功同步并保存"
            }
        });
    }
    
    const fs = () => UI.fullscreen.value ? document.exitFullscreen() : reqFullscreen();

    onMounted(() => obj = new Spreadsheet(box.value!).loadData(stox(data)));
</script>

<script lang="ts">
    /**
     * convert data between x-spreadsheet and SheetJS formats.
     * improvements: Type Support, Refactoring
     * 
     * @author iz
     * @link https://github.com/SheetJS/sheetjs/blob/master/demos/xspreadsheet/xlsxspread.js
     */

    import { utils, type WorkBook } from 'xlsx';
    import type { SheetData, Cell, Row } from "x-data-spreadsheet";

    /**
     * Converts data from SheetJS to x-spreadsheet
     *
     */
    export const stox = (wb: WorkBook): SheetData[] => wb.SheetNames.map(name => {
        const ws = wb.Sheets[name];
        if (!ws || !ws["!ref"]) return null;

        const range = utils.decode_range(ws['!ref']);
        range.s = { r: 0, c: 0 }; // Reset range coordinates

        const aoa = utils.sheet_to_json(ws, {
            raw: false,
            header: 1,
            range: range
        }) as any[][];

        const rows: { [key: number]: Row } = {};
        aoa.forEach((r, i) => {
            const cells = r.reduce((acc, c, j) => {
                const cellRef = utils.encode_cell({ r: i, c: j });
                acc[j] = { text: ws[cellRef]?.f ? `=${ws[cellRef].f}` : c }; // Handle formulas
                return acc;
            }, {} as { [key: number]: Cell });
            rows[i] = { cells };
        });

        const merges: string[] = (ws["!merges"] || []).map((merge: any) =>
            utils.encode_range(merge)
        );

        return { name, rows, merges };
    }).filter(Boolean) as SheetData[];

    /**
     * Converts data from x-spreadsheet to SheetJS
     */
    export const xtos = (sdata: SheetData[]): WorkBook => {
        const out = utils.book_new();

        for(const xws of sdata){
            const ws: { [key: string]: any } = {};
            const rowobj = xws.rows;
            if(!rowobj) continue;
            let minCoord = { r: 0, c: 0 };
            let maxCoord = { r: -1, c: -1 };

            for(const [ri, row] of Object.entries(rowobj)){
                for(const k in row.cells){
                    const idx = +k;
                    if (isNaN(idx)) continue;

                    const lastRef = utils.encode_cell({ r: +ri, c: idx });
                    maxCoord.r = Math.max(maxCoord.r, +ri);
                    maxCoord.c = Math.max(maxCoord.c, idx);

                    let { text: cellText, merge } = row.cells[k];
                    let type: string = "s";

                    if (!cellText) {
                        cellText = "";
                        type = "z";
                    } else if (!isNaN(Number(cellText))) {
                        cellText = Number(cellText).toString();
                        type = "n";
                    } else if (cellText.toLowerCase() === "true" || cellText.toLowerCase() === "false") {
                        cellText = Boolean(cellText).toString();
                        type = "b";
                    }

                    ws[lastRef] = { v: cellText, t: type };
                    if (type === "s" && cellText[0] === "=") {
                        ws[lastRef].f = cellText.slice(1);
                    }

                    if (merge) {
                        if (!ws["!merges"]) ws["!merges"] = [];
                        ws["!merges"].push({
                            s: { r: +ri, c: idx },
                            e: {
                                r: +ri + merge[0],
                                c: idx + merge[1]
                            }
                        });
                    }
                }
            }
            ws["!ref"] = minCoord ? utils.encode_range({ s: minCoord, e: maxCoord }) : "A1";

            utils.book_append_sheet(out, ws, xws.name);
        }

        return out;
    };
</script>

<template>
    <div class="helper">
        <div vs-icon="save" @click="save" button="large" inline />
        <div :vs-icon="UI.fullscreen.value ? 'exit-fullscreen' : 'fullscreen'" @click="fs" button="large" inline />
    </div>
    <div class="wrapper" ref="box" />
</template>

<style scoped>
    .wrapper {
        width: 100%;
        height: 100%;
        height: calc(100% - 2.75rem);
    }

    .helper{
        height: 2.75rem;
        text-align: right;
        box-sizing: border-box;
        padding: .35rem .75rem;
    }
</style>

<style>
    .x-spreadsheet-scrollbar::-webkit-scrollbar{
        width: .6rem !important;
        height: .6rem !important;
    }
</style>