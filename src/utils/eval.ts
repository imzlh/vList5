/**
 * 在模块顶层使用 _eval函数以方便打包
 * @param code 代码
 * @returns 运行结果
 */
export function _eval(code: string){
    return eval(code);
}