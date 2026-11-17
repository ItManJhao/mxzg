# 新聊天交接文档

更新：2026-11-17。此页只保留接手步骤、改动入口和注意事项；当前状态见[项目进度](development-progress.md)，下一批顺序见[实施路线](restructuring-plan.md)，不用本页再复制整段批次日志。

## 先读什么

1. 根目录[AGENTS.md](../AGENTS.md)：目标、职责、中文注释、目录、分支及网络约束。
2. [当前进度](development-progress.md)：已实现、未开放、证据及未验证范围。
3. [实施路线](restructuring-plan.md#接下来的执行顺序)：有界的下一批任务及完成条件。
4. [架构](architecture.md)、[开发约定](development-conventions.md)，再按涉及领域读[文档索引](README.md)。

开始修改前检查分支和工作区，开发统一在hao，保留用户及其他Chat编辑。前批曾按授权推送并合并main；当前主线奖励、挂机收取、通用升级及里程碑只读批次明确不提交推送。实际提交、远程状态及当前分支必须读取Git，不从旧文档的hash/“未提交”推断，也不将前次授权视为持续推送授权。

## 接手要保留的边界

- 新项目 `G:/work/FsGame/Project/mxzg`；旧项目 `G:/work/FsGame/Demo/mj/program` 已是正常工作目录。旧源码/配置是主要规则依据，正式服用于可观察效果，游爱只参考阅读习惯。
- 完整主线目录及只读产物说明为850关，挂机奖励规则投影20关；新挑战上限由服务端challenge-limit单独控制，默认3，通过可选challengeLimit随快照同步。缺字段等待同步，不能猜为3或0；历史pending/回执优先恢复。领取、快速战斗、升级、穿脱及其他未恢复玩法继续关闭；GM测试发放不代表玩法开放。
- 挂机领取服务端V24/V25、客户端原请求持久恢复、共享奖励反馈/确认框、冒险点依赖及现场宝箱收取已接通。`RemakeApp`的领取策略为false，玩家宝箱仍只提示，服务端新请求默认false。`chapter.claim`是挑战结算，不能误认为已开放宝箱领取。
- V27的milestoneProgress是权威已领集合，空集与旧快照缺失不同。正常后端启动由Flyway创建表；本批只运行自有隔离服，未重启日常服。旧服务端缺扩展时目标明确不可用，不能默认未领；里程碑3008没有新写入口。
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
| 身份与资产 | app/remake/AssetStateBinding.ts；features/account/AccountService.ts；platform/GameSocketClient.ts |
| 背包分类与详情 | features/bag/BagController.ts、BagModel.ts、ui/BagView.ts；BagInfoView、EquipmentInfoView、SpiritInfoView及其Utils |
| 英雄与布阵 | features/hero/HeroRosterController.ts、HeroRosterModel.ts、FormationController.ts、FormationSaveModel.ts；对应View |
| 里程碑下一目标只读 | MainChapterService.state及V27集合表 → MainChapterController.readState/唯一Model → ChapterMilestoneUtils → MainChapterBattleView参数 → ChapterEndView的NextTarget；配置为GConfig.ChapterExtraReward |
| 挑战、结算与历史恢复 | features/battle/MainChapterController.ts、MainChapterModel.ts；ui/MainChapterView.ts、MainChapterBattleView.ts、ChapterEndView.ts、BattleDetailLayer.ts |
| 主线目录与开放范围 | backend/campaign/MainChapterRules、MainChapterRewardService；hero/HeroBattleChapterScenario；application.yml的mxzg.main-chapter.challenge-limit（默认3）；敌人和奖励仍来自同源配置，不维护新关卡白名单 |
| 挂机原请求持久恢复 | app/remake/IdleClaimJournal.ts、IdleClaimBinding.ts；features/battle/MainChapterIdleClaimController.ts |
| 通用发奖反馈/奖励窗 | app/remake/RewardBinding.ts；features/reward/RewardController.ts、RewardModel.ts、ui/RewardView.ts、RoleUpgradeView.ts；features/common/ui/ConfirmView.ts |
| 奖励与累计服务端 | backend/campaign的MainChapterIdleClaimService、MainChapterRewardService；reward/RewardGrantService及RewardFeedbackService；tavern/TavernPointService |
| 协议与生成 | protocol/game.proto、tools/generate_game_protocol.cjs；禁止手改生成文件 |

## 本机与独立验证

- Creator3.8.8打开 `client/assets/scenes/Remake.scene`，本机预览7456；先确认实际编译内容。不要把已构建旧包或某次刷新通知当作所有最终源码已编译。
- 日常后端使用 `scripts/start-remake-backend.bat` 或 `restart-remake-backend.bat`，端口18080。资产验证使用独立环境，不扩大已有日常数据库授权。
- `SocketPreviewServer`使用回环随机端口和独立H2。读取 `client/temp/socket-preview.json` 后仍须核实例身份与存活；该文件可能指向已停止宿主。历史端口、PID和run不能复用为当前事实。
- 预览参数为 `?mxzgTestApi=经过URL编码的本地地址&mxzgTestRun=当前实例run`。测试账号通常chapter_review，按当前夹具确认；不把测试夹具当正常获取玩法。
- 如未来获准发布验证，使用统一 `client/build/remake-h5`，先核前端build/资源产物和独立后端kind/run；本地资源服务7460需单独启动，步骤见[本机工作流](local-remake-workflow.md)。
- 测试Java类复制到唯一backend/target目录再启动，避免编译覆盖运行类；后台进程隐藏窗口，结束前核完整命令行归属。不要沿用或停止其他Chat/日常进程。

最近恢复批次的自有测试进程、临时浏览器标签和故障探针均已清理。最近两次离线准确为118.0458秒、97.5371秒，另有9次主动重连；证据见[长断线记录](validation/overlay-lifecycle-preview-20261116.json)。引擎前后台事件、CDP断网、真实浏览器重载、优雅后端重启与OS后台/断电是不同验证范围，不混写。

## 常用检查

- 根目录 `node client/tools/check-project.mjs --suite <名称>` 运行涉及专项；先查看该入口中的有效suite，不把暂停检查计为通过。
- 全套汇总写入 `client/temp/project-checks/results.json`，单项复查写入 `results.<名称>.json`；两者分开保存，不能把只跑文档的单项报告当作全套结果。对应 `.log` 是该项最近一次输出。
- 类型检查使用Creator3.8.8自带TypeScript，对 `client/tools/tsconfig.remake.json` 执行 `--noEmit`；不要用不匹配的旧编译器扩大通过结论。
- 协议漂移：`node tools/generate_game_protocol.cjs --check`。文档/资源等Python检查通过 `MXZG_PYTHON` 指向可用解释器，再运行统一入口。
- 主线范围专项为`main-chapter-scope`，本批动作专项为`battle-thorn-actions`，前批`battle-frost-winter-actions`和`battle-hunter-noah-actions`保留回归。完整依赖审计用`node tools/audit_main_chapter_dependencies.cjs --write`重新运行只读Java能力预检，当前结果进client/temp；保留批次显式加`--snapshot=YYYYMMDD`或`--snapshot=YYYYMMDD-小写批次标签`，再用`node tools/test_main_chapter_dependencies.cjs --snapshot=相同标识`核对。当前快照为`20261117-stage9`；新批次用独立标签，不覆盖旧快照。报告不是开放许可，不手改报告修复依赖；源摘要变化后不可复用旧Java能力证据。
- `battle-presentation`重扫113模板初始直接动作，输出client/temp/battle-presentation-coverage-current.json，并断言原历史可解析模板未倒退；不接受原--write覆盖历史参数。完整关卡的保留证据用上面的850关审计，不增加运行时清单。
- 后端先配置本机JDK21与Maven目录，再在backend运行 `mvnw.cmd -Dtest=相关类 test`；全量或目标MySQL按实际改动和环境授权执行，流程见本机指南。
- 专项、类型、本机预览、发布包、真实数据库分别记录结果；纯文档不需要启动测试服或构建。

## 下一步

第9关所需type8场地移动、固定207暴击属性降低和旧覆盖已接通，并完成自然播放、原冻结统计、受控技能/投射截图及飞行中关闭的限定本机检查，见[本批记录](validation/chapter-stage9-review-20261117.json)和[预览记录](validation/chapter-stage9-preview-20261117.json)。本批未操作日常后端或数据库，测试不申请挑战或发奖。

优先按[实施路线](restructuring-plan.md#接下来的执行顺序)从第10关3031101未核帧、4011101近身/附加帧及4010100未支持参数补齐下一段通用链。当前静态闭合13关（1～9、14、15、19、20）不等于850关表现等价，不据此提高默认3关上限。审计未逐项对照全部旧`G_BATTLE_ACTIONS`覆盖；type5已按旧角色完成边界修正，跨槽组Y绘制深度仍见[BFX-008](battle-known-issues.md#当前未解决)。前批第4关“伤害→表现”是新版保留的raw/wire顺序，旧Java会先排列非逻辑表现，详见[第5关源码证据](validation/chapter-stage5-legacy-audit-20261117.json)。后300关映射歧义保留待确认。领取/养成仍关闭，不继续无边界增加重复重连用例。跨重启已清pending历史定位、目标数据库、真实CDN、真机和App/微信按具体交付目标单列，不伪称已经完成。

更早完整过程及证据都从[当前进度的索引](development-progress.md#既有证据索引)进入；不重新粘贴历史流水到本页。
