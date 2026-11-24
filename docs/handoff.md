# 开发交接

更新于 2026-11-24。开发分支为 `hao`。开始前核对工作区和[仓库约定](../AGENTS.md)，查现有可用功能看[当前进度](development-progress.md)，查下一批规则、数据依赖和验收条件看[实施路线](restructuring-plan.md)。

## 从哪里改

表内客户端路径相对 client/assets/scripts，服务端类在 backend/src/main/java/com/funsgamex/mxzg。

| 工作 | 首先查看 |
|---|---|
| 页面布局、模态和列表 | 功能 View 的 UIRegistry.view 与同名 Prefab，框架 UIManager / BaseView / SuperScroll |
| 关闭页面和闲置预制体的回收 | 打开了 `cache` 的页面关闭后，由 [UIManager](../client/assets/scripts/framework/ui/UIManager.ts) 保留最多 6 个实例、最长 600 秒。无实例持有的预制体由 [PrefabLoader](../client/assets/scripts/framework/assets/PrefabLoader.ts) 单独维护，最多 16 份、闲置 600 秒。动态素材的持有与释放查 [ResourcePool](../client/assets/scripts/framework/assets/ResourcePool.ts) |
| 底栏导航 | app/remake 的 HomeFeatureNavigation 负责准备与延迟提示，RemakeNavigation 切换已经准备好的页面 |
| 配置、资源与预载 | 登录阶段与主城后的预载顺序查 [LoadingPlan](../client/assets/scripts/app/remake/LoadingPlan.ts)，实际调度查 [ApplicationResources](../client/assets/scripts/app/remake/ApplicationResources.ts)。业务读取 GameConfig 的配置映射。[分段加载](staged-resource-loading.md) |
| 登录、换号、迟到响应 | [AccountController](../client/assets/scripts/features/account/AccountController.ts)、[AccountOperations](../client/assets/scripts/features/account/AccountOperations.ts) 和 [GameSocketClient](../client/assets/scripts/platform/GameSocketClient.ts) 管理认证与连接交付。Controller 通过现有账号通道发送当前角色的请求 |
| 区服列表与选服 | [ServerSelectionController](../client/assets/scripts/features/account/ServerSelectionController.ts) 负责请求区服列表并保存当前选择 |
| 统一资产快照 | [AssetStateBinding](../client/assets/scripts/app/remake/AssetStateBinding.ts) 核对区服、角色和版本，批量提交各模块，再通知视图。服务端入口为 SessionSnapshotService |
| 主城召唤法阵 | 基础、友情、高级召唤与积分兑换共用 `HeroRosterController.summon(pool, count, maxDiamonds)`。控制器收发请求，服务端核定消耗、抽取结果和保底，名册与余额随快照更新。现行召唤页的脚本名仍为 FirstSummonView。[召唤页](../client/assets/scripts/features/hero/ui/FirstSummonView.ts) · [控制器](../client/assets/scripts/features/hero/HeroRosterController.ts) · [抽取服务](../backend/src/main/java/com/funsgamex/mxzg/hero/HeroSummonService.java) |
| 背包碎片合成 | 详情「使用」 → [BagController.composeHeroPieces](../client/assets/scripts/features/bag/BagController.ts)。服务端校验资格，背包和名册读取统一快照 |
| 主城普通市场 | 地图 `main_shop` → [MarketView](../client/assets/scripts/features/market/ui/MarketView.ts) → [MarketController](../client/assets/scripts/features/market/MarketController.ts) → [MarketService](../backend/src/main/java/com/funsgamex/mxzg/market/MarketService.java)。货架单独查询，钱包和库存沿用统一快照，购入复用奖励窗 |
| 副本大厅 | 底栏副本 → [DungeonHallView](../client/assets/scripts/features/dungeon/ui/DungeonHallView.ts)。`opencondition` 决定等级，`gamerewardshow` 提供四张卡的原奖励，点击图标复用只读物品说明 |
| 日常副本 | 大厅日常副本 → [GoldDungeonView](../client/assets/scripts/features/dungeon/ui/GoldDungeonView.ts) / [GoldDungeonStageCell](../client/assets/scripts/features/dungeon/ui/GoldDungeonStageCell.ts) → [DailyDungeonController](../client/assets/scripts/features/dungeon/DailyDungeonController.ts) → [DailyDungeonService](../backend/src/main/java/com/funsgamex/mxzg/dungeon/DailyDungeonService.java)。五类日常副本使用同一界面与结算流程，各类型单独记录当日胜次和最高通关 |
| 副本开战等待 | 列表显示后的预热和点击挑战从 GoldDungeonView 跟入；战场首帧、开场特效及首招的时间分别核对。[战报播放器](../client/assets/scripts/features/battle/ui/BattleReplayPreview.ts) · [隔离预览基线](development-progress.md#11-月-24-日的体验与性能复验) |
| 幻境之塔、竞技场 | 进入挑战分别查看 [TowerController](../client/assets/scripts/features/tower/TowerController.ts)、[ArenaController](../client/assets/scripts/features/arena/ArenaController.ts)。塔守军、层数上限和里程碑奖励的生成入口为[塔配置导出器](../tools/export_tower_rules.py) |
| 公会 | 底栏公会 → GuildView → GuildController → GuildService。公会列表按区服查询，余额及个人空间公会名随统一快照更新。[公会维护](guild-membership.md) |
| VIP | 底栏 VIP → [VipView](../client/assets/scripts/features/vip/ui/VipView.ts) → [VipController](../client/assets/scripts/features/vip/VipController.ts) → [VipService](../backend/src/main/java/com/funsgamex/mxzg/vip/VipService.java)。任务随统一快照更新，领奖复用通用奖励反馈。[契约协议](network-contract.md#vip-契约任务) |
| 英雄详情、创造法阵与神装商店 | 从[英雄维护表](hero-lineup-contract.md#当前代码与开放范围)按操作找 View、Controller 和协议。创造法阵和详情共用升星事务，神装商店与探宝共用神装实例发放。四件套的被动从[战斗规则](hero-lineup-contract.md#神装四件套战斗效果)查 |
| 主线布阵 | [FormationController](../client/assets/scripts/features/hero/FormationController.ts) 提交页面草稿并等待权威阵容达到保存版本。[阵型与草稿](formation-ui-authoring.md) |
| 主线挑战、战报与结算 | [MainChapterController](../client/assets/scripts/features/battle/MainChapterController.ts) 处理挑战、原战斗编号、结算和战报。BattleReplayPreview 播放战报 |
| 挂机、通关奖励和里程碑领取 | [MainChapterController](../client/assets/scripts/features/battle/MainChapterController.ts) 统一发收领取协议。[IdleClaimBinding](../client/assets/scripts/features/battle/IdleClaimBinding.ts) 负责宝箱点击和满额确认 |
| 共享发奖和提示 | 服务端 RewardGrantService、RewardFeedbackService。客户端 [RewardController](../client/assets/scripts/features/reward/RewardController.ts) 接收推送，[RewardBinding](../client/assets/scripts/features/reward/RewardBinding.ts) 展示通用奖励窗和全局飘字 |
| GM 发放与试战 | F9 菜单把操作交给 [GmController](../client/assets/scripts/features/gm/GmController.ts) 或 [BattlePreviewController](../client/assets/scripts/features/battle/BattlePreviewController.ts) |
| 协议修改 | [game.proto](../protocol/game.proto) 与 [通信时序](network-contract.md)。用生成工具更新产物 |

查玩家操作，从按钮所在 View 进入本模块 Controller 的发送方法，再跟到 onNotify。Model 处理数据，View 监听事件后刷新。普通点击发送一次。断线重连由统一首包恢复钱包、库存、名册和玩法状态。查启动与退出看 RemakeApp，查模块依赖看 ApplicationModules。[模块装配](../client/assets/scripts/app/remake/ApplicationModules.ts) · [架构](architecture.md) · [断线恢复](reconnect-recovery.md)

## 本机运行与独立验证

- 日常登录使用[本机启停脚本](../scripts/README.md)和 Creator 的 Remake.scene 预览。修改服务端后核对项目端口与进程。需要更新预览资源时通知负责人刷新并点击「预览」，在独立会话验证。
- 写资产验证使用 [独立测试环境](local-remake-workflow.md)。测试地址和 run 必须对应该次实例，关闭时仅清理当次拥有的宿主。
- 本机挂机异常先核实际 local 启动配置、开服资料和活动控制。忽略提交的外部配置由各机器管理。见 [活动控制维护](idle-activity-maintenance.md)。
- 技能验收台从真实开发战报匹配演示。安装了新增扩展主入口的版本后首次完整重开 Creator，后续随项目启动。清理 backend/target 后需重跑相应样本测试。见 [技能演示维护](gm-development.md#技能演示的自动目录)。

## 常用检查

| 检查 | 命令或条件 |
|---|---|
| 客户端专项 | `node client/tools/check-project.mjs --suite <名称>`，用 `--help` 查有效名称 |
| 开战与缓存 | 开场资源时序选 `battle-opening`，日常副本选择和挑战入口选 `dungeon-reminder`。底栏切换与关闭缓存选 `remake-navigation`，主城后预载选 `staged-loading`，资源池和闲置预制体选 `resources` |
| 客户端类型 | 使用 Creator 3.8.8 自带 TypeScript，分别运行 `tsc --noEmit -p client/tsconfig.json` 和 `tsc -p client/tools/tsconfig.remake.json`。前者使用编辑器配置，后者对业务脚本启用 strict |
| 英雄养成配置漂移 | 在统一入口选择对应的生成专项。名称、覆盖产物和更新步骤见[配置维护](config-pipeline.md#英雄养成配置) |
| 协议生成 | node tools/generate_game_protocol.cjs --check |
| 后端专项 | 在 backend 使用 Java 21 和 Maven Wrapper，运行 mvnw.cmd -Dtest=相关类 test |
| 关卡依赖 | `node tools/audit_main_chapter_dependencies.cjs --write` 重新取 Java 证据。归档新批次用独立的 `--snapshot=<标签>` |
| 文档 | node client/tools/check-project.mjs --suite docs |

Python 专项需要可用解释器，可通过 MXZG_PYTHON 指定。单项报告写在 client/temp/project-checks，运行产物、截图和日志先留在忽略目录。值得保留的长期证据筛选后进入 [验收记录](validation/README.md)。
