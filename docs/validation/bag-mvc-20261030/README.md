# 背包 MVC 第一批：实际证据

基线 `d7ea90a0aefd98723ff08b611225a3a71726a583` + dirty 工作区。输入哈希和环境见 [source-version.json](source-version.json)，不是新包的构建标识。本批没有构建任何包、推送、发布、清库或修改后端代码。人对代码/Prefab 的维护体验仍待验收。

## 最终通过结果

- [完整检查](project-checks.log)：26/26 suites，包含 bag-mvc、backpack、super-scroll、formation、remake-playable、legacy 和 architecture。后续同一命令继续执行 Creator 3.8.8 strict 检查，整个命令退出 0；类型检查通过时无独立文本输出。
- [真实 MVC 预览](preview-mvc.log) 与 [状态/真实奖励快照](preview-mvc.json)：7456 本机预览 + 18080 真实开发后端，浏览器错误 0。开页前库存已有数据；打开不额外查询；开页期间刷新与三轮关闭/重开不重复订阅；背包和战斗页均关闭时仍接受有效领奖；钱包与库存通知读取一致；重复真实领取不重复提交；旧 GET 在领奖后交付也不覆盖库存；退出、换号、同账号换服成功。
- [真实列表预览](preview-list.log) 与 [布局/滚动/兼容 Cell 快照](preview-list.json)：默认 4 列、22/22 间距、35/35/8/38 边距、viewport 520×555、content 520×614；分类、详情、拖动抑制、刷新保留、重复点击、兼容 104×104 Cell、重开通过。隔离中性夹具覆盖横/竖/两种网格、0/1/3/18 条、缩短限制和非中心锚点。运行错误 0。
- [领奖后实际页面](../../images/backpack-bag-mvc-reward.png) 与 [同账号换服后页面](../../images/backpack-bag-mvc-new-world.png)：真实开发账号与服务端库存，不是正式服截图，未声称视觉 1:1。

真实迟到 GET 探针先 route.fetch 保存原服务器响应，结算回包被另一个 gate 延迟到切离战斗页后才交付；库存更新后断言旧 GET 的 Promise **仍未结束**，再 route.fulfill 交付原响应，验证返回 false 且库存未回退。没有伪造库存、改超时或替换业务协议。开发账号是正常测试角色，没有清理其他账号数据。

## 可重跑入口

工作目录 `F:\project\mxzg`，Creator 完成导入并预览 Remake.scene，18080 后端可用。

```powershell
node client/tools/check-project.mjs
node C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js -p client/tools/tsconfig.remake.json
$env:MXZG_PLAYWRIGHT_MODULE='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:MXZG_PREVIEW_URL='http://localhost:7456/'
$env:MXZG_SCREENSHOT_PREFIX='bag-mvc-recheck'
node client/tools/check-remake-preview.cjs --bag-mvc
node client/tools/check-remake-preview.cjs --backpack-list
```

Playwright 路径是当前机器工具缓存，不是客户端运行依赖；另一台机器可以指定其已安装模块。生成日志和截图位于忽略的 `client/temp/project-checks`。测试使用隔离浏览器和普通开发账号，不操作用户 Creator 窗口。两次运行建议使用不同截图前缀，以免覆盖各自登录等截图。

## 早期尝试与验证边界

- [冷页面等待失败](attempt-cold-page.log)：固定等待早于资源加载结束；工具改为等待真实页面挂载，最终重新通过。
- [早期旧 GET 超时记录](attempt-timeout-get.log)：该轮业务流程通过，但 GET 被传输超时取消；不能据此声称实测了迟到回包。最终将捕获点移到结算前，增加未结束断言，使用 preview-mvc 的结果。
- [跳过按钮竞争](attempt-skip-race.log)：战斗已进入 result 后测试仍等待 skipButton；最终改为等待真实结算，不修改战斗业务来适配测试。
- [页面识别遗漏](attempt-state-discovery.log)：工具只记录 View 后缀，遗漏改名后的 BagV；最终修正状态采集后列表全流程重新通过。

跨会话的迟到写入/旧 401、错误和 ready-empty 等由可控异步业务检查覆盖；真实页面验证换号与换服，但没有在服务器故意制造 401 或真实断网。阵容冲突/鉴权等既有业务检查保留，未把所有保护都宣称本批逐条人工点击。

本批独立 H5/App/微信包未构建、未验收当前源码，这是用户指定的执行边界，并非发现新的 H5 阻塞。历史 H5 结果不等于当前 MVC 结果。大库存性能、其他模块迁移、整页静态布局整改和人工体验均不在技术通过结论内。
