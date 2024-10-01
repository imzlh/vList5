# 这个是什么？
为第三方插件做的 TypeScript定义 和 app.json JSONSchema文件。
示例请见: https://github.com/imzlh/vlist-demo-app

JSON: 加上这行
```json
{
    "$schema": "../src/schema.json",
}
```

TypeScript: 在tsconfig.json中加上:
```json
{
    "include": [
        "vlist.d.ts"
    ]
}
```

即可享受舒爽的开发体验。<br>
建议集成vue，兼容性更好！