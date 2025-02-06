// 清理CSS显示
const _REG = globalThis.CSS.registerProperty;
globalThis.CSS.registerProperty = (prop: PropertyDefinition) => {
    try{
        _REG.call(CSS, prop);
    }catch{
        console.debug('Register property failed');
    }
}