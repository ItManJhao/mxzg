# 新聊天交接文档

更新：2026-11-17。此页只保留接手步骤、改动入口和注意事项；当前状态见[项目进度](development-progress.md)，下一批顺序见[实施路线](restructuring-plan.md)，不用本页再复制整段批次日志。

## 先读什么

1. 根目录[AGENTS.md](../AGENTS.md)：目标、职责、中文注释、目录、分支及网络约束。
2. [当前进度](development-progress.md)：已实现、未开放、证据及未验证范围。
3. [实施路线](restructuring-plan.md#接下来的执行顺序)：有界的下一批任务及完成条件。
4. [架构](architecture.md)、[开发约定](development-conventions.md)，再按涉及领域读[文档索引](README.md)。

开始修改前检查分支和工作区，开发统一在hao，保留用户及其他Chat编辑。已提交基线为`b333e3d9`，此前推送及快进main授权已执行；随后三项战斗显示修正已完成限定复验，仍保留本地。旧授权不延续到后续提交、推送或合并，实际分支与工作区状态仍以Git为准。

## 接手要保留的边界

- 新项目 `G:/work/FsGame/Project/mxzg`；旧项目 `G:/work/FsGame/Demo/mj/program` 已是正常工作目录。旧源码/配置是主要规则依据，正式服用于可观察效果，游爱只参考阅读习惯。
- 完整目录、挂机收益投影及只读产物说明均覆盖850个全局idx；新挑战默认连续1～20，challengeLimit仍来自统一快照。前20通用依赖接通不代表其余关卡已验收，不自动开放审计中其他离散可解析关。快速战斗、召唤、升级和穿脱仍关闭。
- 挂机玩家按钮现已接原`IdleClaimBinding.begin`，`RemakeApp`前端策略启用，服务端local新请求默认true、基础全局仍false。复用原V24/V25、65秒客户端/60秒服务端门槛、满额确认、持久原请求、双确认、现场收取和共享反馈，不新建领取链。`chapter.claim`仍是挑战结算，`chapter.idle.claim`才是挂机领取。
- 本机local-1/2原开服/活动控制缺失已先只读核实，再按负责人确认的2026-11-17上海零点补齐，044明确未发布。资料在Git忽略的`backend/.local/idle-activity.yml`，未另设附加配置时由`backend/dev.ps1`正常启动自动载入，本次日常启动日志已记录维护两服；后续必须核当前进程与配置，不能复用历史PID。其他环境不得照抄本机日期，044实际发布仍需完整配置。
- V27的milestoneProgress是真实已领集合，V28为每角色/rewardId持久原回执。15关领奖已完整接入，原英雄10105007真实入库，双确认后复用通用HeroRewardView。应用先持久化稳定rewardId，冷恢复先status；实际反馈显示后才条件清理，清理失败只重试原条件删除。详见[领域流程](main-chapter-milestone.md)。
- 暖重连保留当前页；冷重登默认主城，只在首次进入主线时恢复原pending结算。布阵ACK和权威状态双确认后才继续出战；没有ACK不能猜成功，有ACK缺状态只同步不重写。
- 业务唯一契约为WS＋Protobuf；AssetStateBinding统一接纳版本快照，Controller提交唯一Model，View只展示/转交。账号与连接隔离归应用/平台层，页面仅保护自身关闭和迟到绘制。
- 普通父子详情使用openChild，统计等独立页使用open；不手动二次runOpen、不全局按id关闭别的来源。共享模态仍一份节点，列表复用SuperScroll，静态布局归Prefab/Widget。
- LoadingPlan三段显式配置、其余按需；页面地址定义一次，配置包安装到GameConfig后直接取映射。资源统一bundles/resources与module两层，父目录非Bundle，原包名与UUID保留；不重新增加模块资源清单或全量后台加载。
- 本阶段不集中构建；本批通用升级已完成正常主线/冷恢复/挂机及最终标题限定预览，证据见[升级记录](validation/role-upgrade-preview-20261116.json)。此前主线奖励预览已确认同步onOpen关闭保护编译为true，并实际执行正常/冷恢复结算关闭链，结果见[当前进度](development-progress.md#本批主线实际奖励明细)。该限定复验不代表前批全部长断线矩阵或发布包重跑。

## 从哪里改

以下客户端路径相对 `client/assets/scripts`。完整职责查架构，下面只列直接入口。

| 任务 | 直接入口 |
|---|---|
| 页面参数、模态、缓存、布局 | features/模块/ui/*View.ts的@UIRegistry.view；对应Prefab；framework/ui/UIManager.ts、BaseView.ts |
| 父子叠窗与关闭 | UIManager.openChild/closeChildren、BaseView.onViewClose；独立统计仍用open |
| 配置加载和查询 | app/remake/LoadingPlan.ts；config/RemakeConfigUtils.ts、GameConfig.ts；根tools/generate_config_package.cjs生成，不改产物 |
| 加载与资源持有 | app/remake/ApplicationResources.ts；framework/assets/ResManager.ts、ResourcePool.ts、PrefabLoader.ts |
| 切页准备提示 | app/remake/HomeFeatureNavigation.ts；同次准备超过350毫秒才toast，缓存瞬开不提示 |
| 身份与资产 | app/remake/AssetStateBinding.ts；features/account/AccountService.ts；platform/GameSocketClient.ts |
| 背包分类与详情 | features/bag/BagController.ts、BagModel.ts、ui/BagView.ts；BagInfoView、EquipmentInfoView、SpiritInfoView及其Utils |
| 英雄与布阵 | features/hero/HeroRosterController.ts、HeroRosterModel.ts、FormationController.ts、FormationSaveModel.ts；对应View |
| 里程碑下一目标只读 | MainChapterService.state及V27集合表 → MainChapterController.readState/唯一Model → ChapterMilestoneUtils → MainChapterBattleView参数 → ChapterEndView的NextTarget；配置为GConfig.ChapterExtraReward |
| 挑战、结算与历史恢复 | features/battle/MainChapterController.ts、MainChapterModel.ts；ui/MainChapterView.ts、MainChapterBattleView.ts、ChapterEndView.ts、BattleDetailLayer.ts |
| 主线目录与开放范围 | backend/campaign/MainChapterRules、MainChapterRewardService；hero/HeroBattleChapterScenario；application.yml的mxzg.main-chapter.challenge-limit（当前默认20）；敌人和奖励仍同源，不维护新关卡白名单 |
| 正式战斗出场 | features/battle/ui/BattleReplayPreview.ts：资源就绪前隐藏模型/HP，ZDKS后双方FX并行；真实第9/15帧完整结束后开始1秒fade，两路全完才HP/战报，.45秒仅名义时长；旧版FX/fade从起点并行，前批FX后fade也已成为历史。type8音效仍须预载 |
| 挂机原请求持久恢复 | app/remake/IdleClaimJournal.ts、IdleClaimBinding.ts；features/battle/MainChapterIdleClaimController.ts |
| 本机挂机启用与运行资料 | app/remake/RemakeApp.ts；backend的application-local.yml、dev.ps1、.local/idle-activity.yml；全局application.yml的idle-claim-enabled仍默认false |
| 通用发奖反馈/奖励窗 | app/remake/RewardBinding.ts；features/reward/RewardController.ts、RewardModel.ts、ui/RewardView.ts、RoleUpgradeView.ts；features/common/ui/ConfirmView.ts |
| 奖励与累计服务端 | backend/campaign的MainChapterIdleClaimService、MainChapterRewardService；reward/RewardGrantService及RewardFeedbackService；tavern/TavernPointService |
| 协议与生成 | protocol/game.proto、tools/generate_game_protocol.cjs；禁止手改生成文件 |

## 本机与独立验证

- Creator3.8.8打开 `client/assets/scenes/Remake.scene`，本机预览7456；先确认实际编译内容。不要把已构建旧包或某次刷新通知当作所有最终源码已编译。
- 日常后端使用 `scripts/start-remake-backend.bat` 或 `restart-remake-backend.bat`，端口18080。资产验证使用独立环境，不扩大已有日常数据库授权。
- 本批已按确认资料补齐两个本机服并正常重启。检查领取失败时先核实际local配置、开服资料、三活动控制及当前进程，不绕过校验或写假日期；不把未随Git推送的`.local`文件误当远程仓库已有配置。
- `SocketPreviewServer`使用回环随机端口和独立H2。读取 `client/temp/socket-preview.json` 后仍须核实例身份与存活；该文件可能指向已停止宿主。历史端口、PID和run不能复用为当前事实。
- 预览参数为 `?mxzgTestApi=经过URL编码的本地地址&mxzgTestRun=当前实例run`。测试账号通常chapter_review，按当前夹具确认；不把测试夹具当正常获取玩法。
- 如未来获准发布验证，使用统一 `client/build/remake-h5`，先核前端build/资源产物和独立后端kind/run；本地资源服务7460需单独启动，步骤见[本机工作流](local-remake-workflow.md)。
- 测试Java类复制到唯一backend/target目录再启动，避免编译覆盖运行类；后台进程隐藏窗口，结束前核完整命令行归属。不要沿用或停止其他Chat/日常进程。

最近恢复批次的自有测试进程、临时浏览器标签和故障探针均已清理。最近两次离线准确为118.0458秒、97.5371秒，另有9次主动重连；证据见[长断线记录](validation/overlay-lifecycle-preview-20261116.json)。引擎前后台事件、CDP断网、真实浏览器重载、优雅后端重启与OS后台/断电是不同验证范围，不混写。

## 常用检查

- 技能台不再手填演示清单：Creator扩展1.8.1随项目自动启动本机只读PB资源，按实际出手和当前解析识别精确技能等级；清理target后需重跑对应开发测试生成样本。新增main入口从旧版首次升级需完整重开项目一次。`skill-replay-server`、`skill-audit`、`skill-audit-view`、`skill-audit-preview`覆盖资源、目录和生命周期；实际F9播放、开始骨骼70%衔接及删除底栏动画见[最新记录](validation/skill-audit-opening-navigation-review-20261117.json)。出场帧60%后模型渐入保留，不能把两道进度门混为同一个动画。

- 根目录 `node client/tools/check-project.mjs --suite <名称>` 运行涉及专项；先查看该入口中的有效suite，不把暂停检查计为通过。
- 全套汇总写入 `client/temp/project-checks/results.json`，单项复查写入 `results.<名称>.json`；两者分开保存，不能把只跑文档的单项报告当作全套结果。对应 `.log` 是该项最近一次输出。
- 类型检查使用Creator3.8.8自带TypeScript，对 `client/tools/tsconfig.remake.json` 执行 `--noEmit`；不要用不匹配的旧编译器扩大通过结论。
- 协议漂移：`node tools/generate_game_protocol.cjs --check`。文档/资源等Python检查通过 `MXZG_PYTHON` 指向可用解释器，再运行统一入口。
- 主线范围专项为`main-chapter-scope`，本批动作专项为`battle-thorn-actions`，前批`battle-frost-winter-actions`和`battle-hunter-noah-actions`保留回归。完整依赖审计用`node tools/audit_main_chapter_dependencies.cjs --write`重新运行只读Java能力预检，当前结果进client/temp；保留批次显式加`--snapshot=YYYYMMDD`或`--snapshot=YYYYMMDD-小写批次标签`，再用`node tools/test_main_chapter_dependencies.cjs --snapshot=相同标识`核对。当前快照为`20261117-stage20`；新批次用独立标签，不覆盖旧快照。报告不是开放许可，不手改报告修复依赖；源摘要变化后不可复用旧Java能力证据。
- `battle-opening`直接执行真实Preview出场准备，只有此专项使用独立cc时钟；覆盖双边并行、真实9/15帧后渐入、额外逐帧调度延迟、完整FX/渐入双屏障及九阶段取消。其他专项仍保留原动画替身边界，不能当实际渲染通过。切页提示与挂机入口分别复用`feature-navigation`、`idle-claim-binding`等已有专项；最新画面范围见[显示调整](validation/battle-display-adjustment-review-20261117.json)。
- `battle-presentation`重扫113模板初始直接动作，输出client/temp/battle-presentation-coverage-current.json，并断言原历史可解析模板未倒退；不接受原--write覆盖历史参数。完整关卡的保留证据用上面的850关审计，不增加运行时清单。
- 后端先配置本机JDK21与Maven目录，再在backend运行 `mvnw.cmd -Dtest=相关类 test`；全量或目标MySQL按实际改动和环境授权执行，流程见本机指南。
- 专项、类型、本机预览、发布包、真实数据库分别记录结果；纯文档不需要启动测试服或构建。

## 下一步

第9关旧链已完成限定只读复验，见[前批记录](validation/chapter-stage9-review-20261117.json)。前批连续1～9、local正常领取、两服确认资料、350毫秒慢准备提示和正式出场顺序已接通，110项后端检查、相关客户端专项及严格类型通过。独立内存夹具以2级角色/100级英雄，经真实宝箱按钮得到一张494秒回执和7项通用奖励，再经布阵/出阵完成第2关胜利结算；原挂机回执仍一张。正式开场七项逐帧检查、缓存切页toast0通过，末次模态0/开窗中0/缓存1、无warn/error，见[检查记录](validation/chapter-player-entry-review-20261117.json)和[本机记录](validation/chapter-player-entry-preview-20261117.json)。

该次不是自然养成或1～9逐关通关；冒险点2000未满，满额取消保留专项，未在浏览器重做。type8音效预载已修，不据第2关样本声称全部技能音效已重播。观察器、toast临时替换和测试标签已移除，独立宿主按精确run停止，日常local仍保留；历史端口/PID不能作为下次启动身份。

本批10～20关已按旧动作/帧及必要控制机制接通，默认上限20；[最新审计](validation/main-chapter-dependencies-20261117-stage20.txt)静态闭合34关，前20全齐，其余816仍阻塞。完整850挂机投影和原map背景接线已补，后台目录不再硬停20；收益与挑战范围独立。后续从21关真实依赖开始，沿连续段核对，再决定下一批范围；后300关原定位、完整参战属性、新账号自然获取、真实CDN与目标平台仍分开推进。当前本机10～20自然播放、15关真实领奖/原回执光效重放、16关背景及冷重登已限定通过，见[本批记录](validation/chapter-stage10-20-preview-20261117.json)，不沿用历史阶段数作当前签收。

更早完整过程及证据都从[当前进度的索引](development-progress.md#既有证据索引)进入；不重新粘贴历史流水到本页。

本批日常local已由正常启动链更新为PID17148/V28，原数据库和两服活动配置保留；PID仅作本次记录，后续须重新核归属。Node只读握手已确认mxzg.protobuf.v2，PowerShell旧status探针的“未ready”不代替真实握手结果。临时独立Java与资源宿主、标签和运行态探针已收尾；后续开发仍在hao，未提交推送。
