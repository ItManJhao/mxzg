# 开发交接

更新于 2026-11-19。先读 [AGENTS.md](../AGENTS.md)、[当前进度](development-progress.md) 与 [实施路线](restructuring-plan.md)，再从 [专题索引](README.md) 进入对应模块。开始修改前查看 Git 状态与分支，后续开发在 hao。

## 从哪里改

表内客户端路径相对 client/assets/scripts，服务端类在 backend/src/main/java/com/funsgamex/mxzg。

| 工作 | 首先查看 |
|---|---|
| 页面布局、缓存、模态和列表 | 功能 View 的 UIRegistry.view 与同名 Prefab，框架 UIManager / BaseView / SuperScroll |
| 底栏导航 | app/remake 的 HomeFeatureNavigation 负责准备与延迟提示，RemakeNavigation 切换已经准备好的页面 |
| 配置、资源与预载 | app/remake/LoadingPlan.ts、config/GameConfig.ts、framework/assets 的 ResManager / ResourcePool / PrefabLoader |
| 登录、换号、迟到响应 | [AccountController](../client/assets/scripts/features/account/AccountController.ts)、[AccountOperations](../client/assets/scripts/features/account/AccountOperations.ts) 和 [GameSocketClient](../client/assets/scripts/platform/GameSocketClient.ts) 管理认证与连接交付。Controller 通过现有账号通道发送当前角色的请求 |
| 区服列表与选服 | [ServerSelectionController](../client/assets/scripts/features/account/ServerSelectionController.ts) 负责请求区服列表并保存当前选择 |
| 统一资产快照 | [AssetStateBinding](../client/assets/scripts/app/remake/AssetStateBinding.ts) 核对区服、角色和版本，批量提交各模块，再通知视图。服务端入口为 SessionSnapshotService |
| 普通单抽 | 主城召唤法阵的按钮调用 `HeroRosterController.summon()`。免费或券够就发包，回包从 `onNotify` 进入获得窗。首笔固定英雄与后续普通池抽选都由服务端决定。[召唤窗口](../client/assets/scripts/features/hero/ui/FirstSummonView.ts) · [英雄控制器](../client/assets/scripts/features/hero/HeroRosterController.ts) · [抽取规则](../backend/src/main/java/com/funsgamex/mxzg/hero/HeroSummonRules.java) |
| 背包碎片合成 | 详情「使用」 → [BagController.composeHeroPieces](../client/assets/scripts/features/bag/BagController.ts)。服务端校验资格，背包和名册读取统一快照 |
| 主城普通市场 | 地图 `main_shop` → [MarketView](../client/assets/scripts/features/market/ui/MarketView.ts) → [MarketController](../client/assets/scripts/features/market/MarketController.ts) → [MarketService](../backend/src/main/java/com/funsgamex/mxzg/market/MarketService.java)。货架单独查询，钱包和库存沿用统一快照，购入复用奖励窗 |
| 副本大厅 | 底栏副本 → [DungeonHallView](../client/assets/scripts/features/dungeon/ui/DungeonHallView.ts)。`opencondition` 决定等级，`gamerewardshow` 提供四张卡的原奖励，点击图标复用只读物品说明 |
| 金币副本首关 | 大厅日常副本 → [GoldDungeonView](../client/assets/scripts/features/dungeon/ui/GoldDungeonView.ts) → [DailyDungeonController](../client/assets/scripts/features/dungeon/DailyDungeonController.ts) → [DailyDungeonService](../backend/src/main/java/com/funsgamex/mxzg/dungeon/DailyDungeonService.java)。服务端一次结算，战报、结算和扫荡奖励使用现有公共展示 |
| 英雄普通升级、布阵 | [HeroLevelController](../client/assets/scripts/features/hero/HeroLevelController.ts) 提交普通升级。[FormationController](../client/assets/scripts/features/hero/FormationController.ts) 提交草稿并等待权威阵容达到保存版本 |
| 主线挑战、战报与结算 | [MainChapterController](../client/assets/scripts/features/battle/MainChapterController.ts) 处理挑战、原战斗编号、结算和战报。BattleReplayPreview 播放战报 |
| 挂机、通关奖励和里程碑领取 | [MainChapterController](../client/assets/scripts/features/battle/MainChapterController.ts) 统一发收领取协议。[IdleClaimBinding](../client/assets/scripts/features/battle/IdleClaimBinding.ts) 负责宝箱点击和满额确认 |
| 共享发奖和提示 | 服务端 RewardGrantService、RewardFeedbackService。客户端 [RewardController](../client/assets/scripts/features/reward/RewardController.ts) 接收推送，[RewardBinding](../client/assets/scripts/features/reward/RewardBinding.ts) 展示通用奖励窗和全局飘字 |
| GM 发放与试战 | F9 菜单把操作交给 [GmController](../client/assets/scripts/features/gm/GmController.ts) 或 [BattlePreviewController](../client/assets/scripts/features/battle/BattlePreviewController.ts) |
| 协议修改 | [game.proto](../protocol/game.proto) 与 [通信时序](network-contract.md)。用生成工具更新产物 |

查玩家操作，从按钮所在 View 进入本模块 Controller 的发送方法，再跟到 onNotify。Model 处理数据，View 监听事件后刷新。普通点击发送一次。断线重连由统一首包恢复钱包、库存、名册和玩法状态。查启动与退出看 RemakeApp，查模块依赖看 ApplicationModules。[模块装配](../client/assets/scripts/app/remake/ApplicationModules.ts) · [架构](architecture.md) · [断线恢复](reconnect-recovery.md)

## 本机运行与独立验证

- 日常登录使用 [本机启停脚本](../scripts/README.md) 和 Creator 的 Remake.scene 预览。修改服务端后按项目脚本重启，核对属于当前项目的端口与进程。
- 写资产验证使用 [独立测试环境](local-remake-workflow.md)。测试地址和 run 必须对应该次实例，关闭时仅清理当次拥有的宿主。
- 本机挂机异常先核实际 local 启动配置、开服资料和活动控制。忽略提交的外部配置由各机器管理。见 [活动控制维护](idle-activity-maintenance.md)。
- 技能验收台从真实开发战报匹配演示。安装了新增扩展主入口的版本后首次完整重开 Creator，后续随项目启动。清理 backend/target 后需重跑相应样本测试。见 [技能演示维护](gm-development.md#技能演示的自动目录)。

## 常用检查

| 检查 | 命令或条件 |
|---|---|
| 客户端专项 | node client/tools/check-project.mjs --suite <名称>，用 --help 查有效名称 |
| 严格类型 | 用 Creator 3.8.8 自带 TypeScript 运行项目 tsconfig.json 的 strict、noEmit 检查 |
| 协议生成 | node tools/generate_game_protocol.cjs --check |
| 后端专项 | 在 backend 使用 Java 21 和 Maven Wrapper，运行 mvnw.cmd -Dtest=相关类 test |
| 关卡依赖 | node tools/audit_main_chapter_dependencies.cjs --write 重新取 Java 证据。归档新批次用独立 --snapshot 标签 |
| 文档 | node client/tools/check-project.mjs --suite docs |

Python 专项需要可用解释器，可通过 MXZG_PYTHON 指定。单项报告写在 client/temp/project-checks，运行产物、截图和日志先留在忽略目录。值得保留的长期证据筛选后进入 [验收记录](validation/README.md)。
