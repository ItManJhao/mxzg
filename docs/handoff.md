# 开发交接

更新于 2026-11-18。先读 [AGENTS.md](../AGENTS.md)、[当前进度](development-progress.md) 与 [实施路线](restructuring-plan.md)，再从 [专题索引](README.md) 进入对应模块。开始修改前查看 Git 状态与分支，后续开发在 hao。

## 从哪里改

表内客户端路径相对 client/assets/scripts，服务端类在 backend/src/main/java/com/funsgamex/mxzg。

| 工作 | 首先查看 |
|---|---|
| 页面布局、缓存、模态和列表 | 功能 View 的 UIRegistry.view 与同名 Prefab，框架 UIManager / BaseView / SuperScroll |
| 底栏导航 | app/remake 的 HomeFeatureNavigation 负责准备与延迟提示，RemakeNavigation 切换已经准备好的页面 |
| 配置、资源与预载 | app/remake/LoadingPlan.ts、config/GameConfig.ts、framework/assets 的 ResManager / ResourcePool / PrefabLoader |
| 登录、换号与统一快照 | app/remake/AssetStateBinding.ts、features/account/AccountService.ts、platform/GameSocketClient.ts，服务端 SessionSnapshotService |
| 背包、英雄、布阵 | features/bag 与 features/hero。布阵保存由 FormationController / FormationSaveModel 确认，权威阵容归 HeroRosterModel |
| 主线挑战、战报与结算 | features/battle/MainChapterController.ts、MainChapterModel.ts、ui/BattleReplayPreview.ts。服务端 MainChapterService、MainChapterRules、HeroBattleChapterScenario |
| 挂机和里程碑领取 | app/remake 的 IdleClaimBinding / MainChapterMilestoneBinding，服务端 MainChapterIdleClaimService / MainChapterMilestoneService |
| 共享发奖和提示 | 服务端 RewardGrantService / RewardFeedbackService，客户端 app/remake/RewardBinding.ts 与 features/reward |
| 协议修改 | [game.proto](../protocol/game.proto) 与 [通信时序](network-contract.md)。用生成工具更新产物 |

身份隔离由应用和连接层负责，功能 View 管理自己的关闭、监听与迟到展示。资产写入在服务端权威事务内完成，回执与快照各有职责。详细边界见 [架构](architecture.md) 和 [断线恢复](reconnect-recovery.md)。

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
