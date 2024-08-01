![vList5](public/favicon.svg)

# vlist5
<span style="color: gray">性能与全能的平衡</span>

全能还好看的文件管理方案<br>
使用Vue构建，与NJS集成<br>
支持超多打开方式，很多好用的小工具

## 为什么是vList
vList最初就是为了Nginx设计的，经历了4代的积淀已经拥有成熟的方案了<br>
为了并发考虑，我们将大部分功能放在了前端，且对于验证机制使用了SHA1-HMAC，安全可靠

## 目前已经完成

 - 强大的打开方式
    - 视频
    - 音频
    - 图片
    - 二进制
    - 代码/文本
    - 字体
    - HTML类
    - MarkDown编辑
    - ...(欢迎PR或issue)
 - 完善的UI
    - 手机端
    - PC
    - Windows式重命名、上传移动
    - 动画(正在计划中)
 - Vue响应式设计
    - 设置
    - `getConfig`、`setConfig`
 - 文件操作
    - 复制
    - 粘贴
    - 新建
    - 上传
    - 预览操作
    - 批量操作
    - explorer窗格
    - ...(欢迎PR或issue)
 - 额外的支持
    - libmedia UI
    - PWA应用
    - TypeScript化
    - 内置缓存

## 安装指南

需要NodeJS和<a href="https://github.com/imzlh/vlist-njs">NJS后端</a>

```sh
npm install
npm run build
```