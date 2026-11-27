# 文档索引

排期与验收条件看[项目总计划](restructuring-plan.md)，已开放范围、实测结果和缺口看[开发进度](development-progress.md)。接手代码或搭建测试环境看[开发交接](handoff.md)和[仓库约定](../AGENTS.md)。

## 按任务查阅

| 要改的地方 | 说明 |
|---|---|
| 产品与技术边界 | [产品要求与已确认决定](product-requirements.md)、[模块职责与生命周期](architecture.md)、[开发约定](development-conventions.md) |
| 海外多语言可行性 | [多语言候选方案](localization-plan.md)，供评估语言覆盖、改造范围与验证成本，发行范围待定 |
| 通信、状态和恢复 | [网络契约](network-contract.md)、[断线恢复](reconnect-recovery.md)、[角色](role-data-contract.md) |
| 背包与资产 | [背包 MVC](bag-mvc-maintenance.md)、[库存事件](bag-inventory-events.md)、[英雄数据与实例](hero-data-contract.md) |
| 英雄养成、装备和布阵 | [当前操作与协议](hero-lineup-contract.md#当前代码与开放范围)、[神装四件套战斗效果](hero-lineup-contract.md#神装四件套战斗效果)、[阵容编辑](formation-ui-authoring.md) |
| 主城、社交与任务 | [聊天频道](network-contract.md#聊天频道)、[排行榜与点赞](network-contract.md#主城排行榜)、[邮件与好友](network-contract.md#邮件与好友)、[每日与成就](network-contract.md#每日任务与成就) |
| 商店与合成 | [普通市场](network-contract.md#普通市场)、[黑市与每日任务](network-contract.md#黑市)、[铁匠铺](network-contract.md#铁匠铺)、[竞技场及其商店](network-contract.md#竞技场)、[公会商店与捐献](network-contract.md#公会成员与申请) |
| 界面、弹窗与列表 | [Prefab 与弹窗](prefab-layout.md)、[虚拟列表](super-scroll-authoring.md)、[全局反馈](architecture.md#全局反馈与开发入口) |
| 主线和战斗 | [里程碑](main-chapter-milestone.md)、[战斗布局](battle-prefab-layout.md)、[统计](battle-statistics.md)、[待复验问题](battle-known-issues.md) |
| 挂机与奖励 | [领取事务](main-chapter-idle-settlement.md)、[收益规则](idle-reward-rules.md)、[活动控制](idle-activity-maintenance.md)、[通用奖励与确认](reward-feedback.md) |
| 公会 | [建会、成员、公告与大厅](guild-membership.md)、[公会业务协议](network-contract.md#公会成员与申请) |
| 副本大厅与竞技场 | [五类日常副本](network-contract.md#日常副本)、[幻境之塔](network-contract.md#幻境之塔)、[竞技场](network-contract.md#竞技场) |
| VIP 等级与领奖 | [契约任务、累计条件与回包](network-contract.md#vip-契约任务) |
| 配置、资源和构建 | [配置生成](config-pipeline.md)、[加载与缓存](staged-resource-loading.md)、[自动图集](bag-auto-atlas.md) |
| 内网打包机 | [Windows 打包机交接与发布流程](intranet-build-handoff.md) |
| 本机运行、GM和技能台 | [本机启停与独立验证](local-remake-workflow.md)、[GM维护](gm-development.md) |

## 记录怎样维护

优先级变化时更新项目总计划。功能接通后，在开发进度中写明验证过的操作、环境和已知缺口，并将协议或实现细节更新到对应专题。资产来源、Prefab 审查和检查输入保留在工具读取的路径。

查某次回归的输入、环境、结果或截图，从[验收记录](validation/README.md)进入。早期大附件的恢复方法见[历史关卡报告](validation/README.md#历史关卡报告)。

[开服规则研究](day60-open-server.md) 继续作为历史配置核对依据。
