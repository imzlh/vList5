/**
 * 在模块顶层使用 _eval函数以方便打包
 * @param code 代码
 * @returns 运行结果
 */
export async function _eval(code: string){
    // 分析const、let、var声明的变量，并将其挂载到全局作用域
    const $var_preg = /^\s*(?:const|let|var)\s+(\w+)\s*(?:=\s*([\w\W]+))?\s*$/;
    if($var_preg.test(code)){
        const [_, name, value] = code.match($var_preg)!;
        if (value)
            (globalThis as any)[name] = await __eval(value);
        else
            (globalThis as any)[name] = undefined;
        return;
    }
    // 正常
    return await __eval(code);
}

async function __eval(code: string){
    // 检查异步请求
    const $async_preg = /^\s*await\s+([\w\W]+)$/;
    if($async_preg.test(code)){
        const [_, value] = code.match($async_preg)!;
        return await eval(value);
    }
    // 执行代码
    return eval(code);
}