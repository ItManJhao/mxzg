# 背包库存事件：本批验证

基线 main / `2022a566`，开始时工作区干净，当前修改未提交。环境、完整输入 SHA256 见 [source-version.json](source-version.json)。没有构建包、清库、发布或推送，没有修改后端/HTTP 协议、通用派发器、基类、Prefab 或 SuperScroll/SuperContent。

## 代码与类型检查

- [完整检查](project-checks.log)：27/27。保留账号、阵容版本冲突、主线奖励、资源、页面、历史链检查，新增 bag-events。
- [事件专项](events-check.log)：首次同步、两种新增聚合、已有数量增加/减少、归零移除、同批新增/数量/删除、重复快照、无效全量/增量、失败恢复、旧账号响应、直接/外层 batchNotifications 中的回调提交下一批及回调重置。
- 每个库存回调都断言当前 Model 版本与参数一致，并保留该次完整库存快照比较；事件参数、数组、原条目及数量变化对象冻结。捕获派发器的异常日志，避免监听断言被异常隔离吞掉却误报通过。
- [Creator strict 日志](creator-types.log)：Creator 3.8.8 自带 TypeScript，tsconfig.remake.json，退出 0；成功无文本。负向约束覆盖错误事件名/参数、事件快照不可修改，以及模块 Controller 不可作页面 Controller。

## 实际本机运行

- [背包关闭时领奖日志](preview-closed.log) / [实际参数和快照](preview-closed.json)。
- [背包打开时领奖日志](preview-open.log) / [实际参数和快照](preview-open.json)。

两轮均使用独立浏览器、Creator 7456 和 18080 真实开发后端，浏览器错误 0，没有伪造库存或替换网络响应。具体验证包括：闭页查询、开页立即读 Model、不额外查询、相同查询零次列表重绘且两次状态文字更新，三轮开关的汇总/状态监听不累积，外部汇总订阅保留；真实领奖、迟到 GET 拒绝、重复实际领取、到账后详情、退出清理、换号和同账号换服。

真实第一关结果两轮一致：

- 新增 900401×100、1004001×1、20204004×30，聚合为 **一次 BagAdd**。
- 900101 从 50 到 550（+500），900102 从 2 到 4（+2），聚合为 **一次 BagQuantityChanged**。
- 没有移除，所以 **零次 BagRemove**。
- 最后 **一次 BagUpdate**，reason=reward，参数版本一致；每次回调的完整库存与钱包都等于原服务器结果。

打开背包的领奖路径特意延迟真实结算响应到 BagView 已挂载后才交付，断言只产生一次列表刷新。另一轮在背包和战斗页面关闭后交付，数据仍正常提交。旧 GET 也持有真实服务器结果，在领奖后确认仍未超时，再交付，库存未回退；不是用超时取消代替迟到回包验证。

截图：[领奖后背包](../../images/backpack-events-reward.png)、[到账后详情](../../images/backpack-events-detail.png)。是本机开发预览，不是正式服或 1:1 结论。

## 早期失败与未验证范围

[首次运行](attempt-stale-creator.log) 读到旧 Changed 常量，探针因契约不匹配停止，未记作新事件运行通过。用户完成导入刷新后，上述两轮运行了新事件契约并通过。

当前真实服务没有道具消耗/删除入口，所以真实删除、数量减少及同批三类变化只由业务检查覆盖；没有为验收向服务器塞假库存。未让真实服务器故意返回非法数据/401/断网，相关错误和会话保护由可控异步检查覆盖。未重复完整中性列表布局矩阵，通用列表和参数未改；本批真实覆盖分类、选择/详情、刷新及开关。未验收大库存性能、其他模块或 H5/App/微信包；用户暂停构建的要求继续有效。

人工代码阅读和 Inspector 体验仍由用户确认，不由测试代签。

## 重跑

工作目录 `F:\project\mxzg`，18080 后端和 Creator Remake.scene 预览就绪：

```powershell
node client/tools/check-project.mjs
node C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js -p client/tools/tsconfig.remake.json
$env:MXZG_PLAYWRIGHT_MODULE='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:MXZG_PREVIEW_URL='http://localhost:7456/'
$env:MXZG_BAG_REWARD_OPEN='0'
$env:MXZG_SCREENSHOT_PREFIX='bag-events-recheck-closed'
node client/tools/check-remake-preview.cjs --bag-mvc
$env:MXZG_BAG_REWARD_OPEN='1'
$env:MXZG_SCREENSHOT_PREFIX='bag-events-recheck-open'
node client/tools/check-remake-preview.cjs --bag-mvc
```

工具模块路径按本机已有安装调整。测试只操作隔离浏览器和普通开发账号，不操作用户 Creator 窗口。方法链及维护入口见 [库存事件说明](../../bag-inventory-events.md) 和 [背包维护指南](../../bag-mvc-maintenance.md)。
