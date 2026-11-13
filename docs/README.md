# 文档索引

更新：2026-11-13。新聊天从[交接文档](handoff.md)进入；先读根目录[AGENTS.md](../AGENTS.md)，再按用途查阅。

| 想了解什么 | 唯一主入口 | 维护边界 |
|---|---|---|
| 现在做到哪、哪些还未开放 | [当前进度](development-progress.md) | 当前状态、最新证据及未验证范围；不继续累加长批次日志 |
| 接下来先做什么 | [实施路线](restructuring-plan.md) | 执行顺序、前置条件及完成标准；不复制当前状态表 |
| 代码由谁负责、从哪里修改 | [架构](architecture.md)、[开发约定](development-conventions.md) | 当前职责、调用链、生命周期与人工维护方式 |
| 最终要还原什么 | [产品要求](product-requirements.md) | 长期需求与已确认差异，分期不等于删减 |
| 为什么这样实现、过去如何验证 | validation/ 中对应批次记录 | 只证明记录当时的版本与范围，不代替当前代码或验收 |

## 按任务查阅

- 通信与状态：[网络契约](network-contract.md)、[角色](role-data-contract.md)、[背包通信/MVC样板](bag-mvc-maintenance.md)、[库存事件](bag-inventory-events.md)、[英雄](hero-data-contract.md)、[阵容](hero-lineup-contract.md)。
- 页面与交互：[Prefab规范](prefab-layout.md)、[战斗布局](battle-prefab-layout.md)、[阵容编辑](formation-ui-authoring.md)、[虚拟列表](super-scroll-authoring.md)。
- 资源与构建：[三段加载、Bundle与缓存](staged-resource-loading.md)、[自动图集与构建工具](bag-auto-atlas.md)、[配置生成与查询](config-pipeline.md)。
- 玩法恢复：[挂机规则审计](idle-reward-rules.md)、[挂机输入契约草案](idle-reward-input-contract.md)、[战斗统计](battle-statistics.md)、[战斗待复验问题](battle-known-issues.md)。
- 运行与排错：[本机启停](local-remake-workflow.md)、[开发GM](gm-development.md)。

## 历史与证据

2026-11-13 将重复批次过程和过时路线状态移出当前入口，完整原文保存在[进度历史快照](validation/development-history-20261113.md)与[旧路线快照](validation/restructuring-plan-history-20261113.md)。历史中的旧包数量、HTTP方案、已退役类名或“未提交”只表示当时情况，不能据此重新开放功能或判断今天的分支状态。

[开服规则研究](day60-open-server.md)是旧配置参考，images/保存截图；资源来源、Prefab审查等 JSON 仍供工具和追溯使用，不能因数量多而删除。后续修改对应主文档，历史证据保留，不再新增另一份“当前进度”。
