# 文档索引

更新于 2026-11-18。第一次接手先看 [开发交接](handoff.md) 和 [仓库约定](../AGENTS.md)。

| 想了解什么 | 去哪里查 |
|---|---|
| 现在能用什么，验证做到哪 | [当前进度](development-progress.md) |
| 接下来做什么，怎样完成 | [实施路线](restructuring-plan.md) |
| 功能归属、调用和状态生命周期 | [架构](architecture.md)、[开发约定](development-conventions.md) |
| 长期目标和确认过的设计决定 | [产品要求](product-requirements.md) |
| 哪次测试做了什么，历史附件怎样取回 | [验收记录](validation/README.md) |

## 按任务查阅

| 要改的地方 | 说明 |
|---|---|
| 通信、状态和恢复 | [网络契约](network-contract.md)、[断线恢复](reconnect-recovery.md)、[角色](role-data-contract.md) |
| 背包和英雄 | [背包MVC](bag-mvc-maintenance.md)、[库存事件](bag-inventory-events.md)、[英雄](hero-data-contract.md)、[阵容](hero-lineup-contract.md) |
| 界面、弹窗与列表 | [Prefab与弹窗](prefab-layout.md)、[虚拟列表](super-scroll-authoring.md)、[阵容编辑](formation-ui-authoring.md) |
| 主线和战斗 | [里程碑](main-chapter-milestone.md)、[战斗布局](battle-prefab-layout.md)、[统计](battle-statistics.md)、[待复验问题](battle-known-issues.md) |
| 挂机与奖励 | [领取事务](main-chapter-idle-settlement.md)、[收益规则](idle-reward-rules.md)、[活动控制](idle-activity-maintenance.md)、[通用奖励与确认](reward-feedback.md) |
| 配置、资源和构建 | [配置生成](config-pipeline.md)、[加载与缓存](staged-resource-loading.md)、[自动图集](bag-auto-atlas.md) |
| 本机运行、GM和技能台 | [本机启停与独立验证](local-remake-workflow.md)、[GM维护](gm-development.md) |

## 记录怎样维护

开放范围改进度，计划改路线，当前实现改架构或对应专题。资产来源、Prefab 审查和检查输入按工具使用的路径保留。验收记录保留当时的输入、环境、结果和必要图片。只用于历史追溯的大附件从固定 Git 版本取回，入口见 [历史关卡报告](validation/README.md#历史关卡报告)。

[开服规则研究](day60-open-server.md) 继续作为历史配置核对依据。
