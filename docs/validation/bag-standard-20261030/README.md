# 背包标准模块：本批实际证据

2026-10-30，用户指定完整名称、features/Bag、BaseModel/BaseController、全局 EventDispatcher 和 EventScope 后的最终样板。本批基于 d7ea90a0 + 已有未提交修改；[source-version.json](source-version.json) 记录输入哈希和 10 个移动脚本原 UUID。人工代码/Prefab 修改体验仍待用户确认，未提交推送、发布、清库或构建包。

## 已通过

- [全量检查](project-checks.log)：26/26 suites，包括原有鉴权、阵容冲突、奖励、页面、资源、绑定和历史链检查，以及本批 bag-mvc、backpack、super-scroll。
- [Creator 类型检查日志](creator-types.log)：Creator 3.8.8 自带 TypeScript 执行 tsconfig.remake.json，退出 0，成功时无文本输出。包括 bag-module-types-check 的负向约束：错误事件名/参数、把模块 Controller 当页面 Controller 都应编译失败。
- 业务检查覆盖 BaseModel 重置/版本/重复清理、BaseController 显式初始化/重复注册/会话切换/重复销毁/重新初始化、EventScope 清理异常隔离、全局 on/once/提前取消/一次性监听重入、监听者异常继续派发。背包检查保留只读数据、四类状态、全量/增量、错误、同角色查询乱序、旧会话读写/401、串行写入、同步监听回调请求去重和奖励幂等。
- [真实 MVC 预览](preview-mvc.log) 与 [真实库存/奖励/会话快照](preview-mvc.json)：7456 + 18080，浏览器错误 0。新目录、新类名和全局 EventDispatcher 通过 Creator import map 加载，不使用 Node 假 View 替代本次运行。
- 实际 MVC 流程：窗口从未打开时查询、开页不额外查询且立即显示、打开期间刷新、三轮开关监听不累积且外部监听保留；领奖回包延迟到切离战斗页后交付，背包窗口也关闭，钱包和库存仍一致提交；交付领奖前捕获且尚未超时的旧 GET 后不回滚；重复实际领取不重复更新/通知；退出、换号、同账号换服库存隔离通过。
- [真实列表预览](preview-list.log) 与 [布局/滚动快照](preview-list.json)：四分类/选中/详情、拖动不误触、重复刷新一次点击、滚动保留、兼容 104×104 Cell、切页重开通过。中性夹具覆盖横向、竖向、两种网格、0/1/3/18、缩短限制和非中心锚点，浏览器错误 0；不写玩家库存或源 Prefab。
- 最后仅归位纯数据类型、保留旧协议原名称，并补跑 strict、backpack、super-scroll 与 [legacy 回归](legacy-recheck.log) 通过；没有用命名替换修改旧协议。

当前截图：[领奖后背包](../../images/backpack-standard-reward.png)、[同账号换服后背包](../../images/backpack-standard-new-world.png)。这是本机真实开发后端结果，不是正式服截图或 1:1 结论。源 Prefab、SuperScroll/SuperContent 和资源路径未修改。

## 失败记录与验证边界

[首次列表尝试](attempt-cold-hero.log) 因工具固定等待两秒而早于冷英雄页挂载，报 hero absent，没有浏览器运行错误。工具改为等待实际 View 后，preview-list 全流程重新通过；未修改业务来迎合该测试。

真实流程没有故意使服务器返回旧账号 401、断网或制造并发阵容冲突；这些保护由既有与新增可控异步检查覆盖，不称为全部逐项人工点击。大库存性能、其他模块迁移与全页静态布局不在完成结论内。

独立 H5/App/微信包未构建或运行此源码，遵循用户本机优先要求；历史 H5 成果不代替本批验证。后端/数据库代码和 HTTP 传输未改动，没有清库。

## 重跑方式

工作目录 `F:\project\mxzg`，Creator 导入完成并预览 Remake.scene，后端 18080 可用。下面的 Node 检查编译的是测试夹具，不构建游戏包。

```powershell
node client/tools/check-project.mjs
node C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js -p client/tools/tsconfig.remake.json
$env:MXZG_PLAYWRIGHT_MODULE='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:MXZG_PREVIEW_URL='http://localhost:7456/'
$env:MXZG_SCREENSHOT_PREFIX='bag-standard-recheck-mvc'
node client/tools/check-remake-preview.cjs --bag-mvc
$env:MXZG_SCREENSHOT_PREFIX='bag-standard-recheck-list'
node client/tools/check-remake-preview.cjs --backpack-list
```

Playwright 路径是本机工具缓存，可换成其他机器已有模块路径；不是游戏依赖。测试使用独立浏览器和普通开发账号，不操作用户 Creator 窗口。人工验收步骤与实际方法调用见 [维护指南](../../bag-mvc-maintenance.md)。
