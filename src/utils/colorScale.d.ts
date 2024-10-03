
/**
 * 将颜色值转换为 CSS filter 值，以黑色为基准
 * 
 * @param r rgb()红色值
 * @param g rgb()绿色值
 * @param b rgb()蓝色值
 * @returns CSS filter 值，可以直接用于 CSS 的 filter 属性
 */
export function toFilter(r: number, g: number, b: number): string;