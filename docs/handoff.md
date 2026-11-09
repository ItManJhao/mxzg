# 新聊天交接文档

更新：2026-11-09。先读本文件、根目录AGENTS.md、docs/development-progress.md；不要从历史聊天猜当前进度。

## 项目与目标

- 新项目：G:/work/FsGame/Project/mxzg；客户端client，服务端backend；当前分支main，远端origin为https://github.com/ItManJhao/mxzg.git。
- 旧项目：G:/work/FsGame/Demo/mj/program，已恢复普通文件目录。客户端client/cocos_mxzg/client/idle/src；旧服务端server/mxzg-server、server/mxzg-common；协议mxzg-protofiles。
- 写法参考：G:/游爱/trunk，只参考SGModel/SGCtrl命名和阅读习惯。不要复制其玩法或网络框架。
- 目标：旧技术难以维护，因此现代化重做，玩法/内容/规则/UI以1:1还原为目标；独立新版，不兼容旧客户端、不迁移旧玩家。
- 正式服https://mxzg-test.funsgamex.com/jp/，授权参考账号hao1。正式服持续迭代，主要用于UI和流程参考；技能规则与资源以旧源码/配置为准，表现疑点记文档，不阻塞全部进度。

## 已确认边界

- 当前只推进主线战斗与挂机流程。宝箱领取、快速战斗、英雄升级、穿脱未开启；背包使用/分解仍关闭，其他玩法不顺带扩展。
- 保留清心概率待审和护盾疑点，详见battle-known-issues.md，不自行宣告旧规则完全一致。
- 验收使用独立测试环境，不修改日常玩家库。曾有历史数据库授权，不应据此扩大本批独立环境范围。
- 交接基线e182ff14已推送；其后本批用户明确要求等待通知才提交、推送，保留工作区新增改动。
- 本批已确认默认档先保留，后两档待权威VIP；旧胜利布局、最高伤害和经验动画已恢复，双方伤害/承伤/治疗统计及独立查看窗口已接通；不需要横屏。
- 负责人允许浏览器复验；不操作桌面及其他应用。Creator未刷新时请负责人刷新资源，不擅自操作编辑器。
- 用户不需要框架建议第5项（专门拆RemakeApp启动装配），不要重新安排。
- 中文文件头、函数和属性注释；节点英文名；功能目录小写；Utils/Helper静态方法；统一GameLog分层。合理保留协议/资产不变量异常，不机械删throw。
- MVC参考背包：协议集中Protocol，Controller.onNotify→唯一Model→事件刷新View。连接/旧回包隔离放通信及应用层，模块不持有账号/凭证。全部游戏业务走WebSocket＋Protobuf，无HTTP回退。
- 静态结构在Prefab；复用旧资源、九宫格，保留UUID；列表SuperScroll。不得用测试界面长期替代旧正式流程。

## 当前已通链路

主城战斗入口→MainChapterView挂机主页→布阵确认→服务端挑战→持久战报→页内MainChapterBattleView→ZDKS开场→双方出场→真实战报→幂等结算→ChapterEndView→回到挂机。

挂机：统一快照下发时钟/收益/持久最多三英雄选择→循环背景和跑步→chapter.idle.encounter真实普攻战报→敌方出场→击杀→继续跑步。旧规则敌方生命1，演出不发奖励。对话按角色等级开区间筛选，旧语言文案、20秒冷却/10秒停留，跨遇敌换宿主保持台词。

主线正常挑战目前限前三关。不是所有技能、关卡或完整挂机收益都已开放。

## 关键文件

- client/assets/scripts/features/battle/MainChapterController.ts、MainChapterModel.ts：挑战/战报/结算/挂机协议与状态。
- 同目录ui/MainChapterView.ts：主页、挂机/挑战切换；MainChapterIdleDisplay.ts：三英雄显示；MainChapterHeroTalk.ts及utils/HeroTalkUtils.ts：对话生命周期和规则。
- ui/MainChapterBattleView.ts：页内战场与结算；BattleReplayPreview.ts：实际表现、开场、伤害/特效、暂停取消；ChapterEndView.ts：结算。
- client/assets/prefabs/ui/battle/MainChapterView.prefab、MainChapterBattleView.prefab、BattlePage.prefab；prefabs/ui/chapter/ChapterEndView.prefab。
- BattlePage的ChapterMatchInfoAnchor/ChapterTopBarAnchor只供正常主线定位，不改技能台原布局。MainChapterView的HeroTalkTemplate保存气泡静态样式。
- backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterService.java、MainChapterRewardService.java、MainChapterIdleService.java、MainChapterIdleBattleService.java。
- hero/HeroBattleChapterScenario.java、HeroBattleInputService.java：真实引擎及共享输入；network/SessionSnapshotService.java统一快照。
- protocol/game.proto唯一协议源，生成器tools/generate_game_protocol.cjs；禁止手改生成文件。
- 数据迁移V16主线持久化、V17挂机时钟、V18挂机选择。不要删除迁移或重置日常库。

## 最新验证与未验收项

2026-11-09最新：负责人已验收挂机出场连续性、攻击后待机、模型大小及独立站位。BattlePage/IdleLayout仅保存挂机显示锚点，正式战斗仍是8槽；挂机0.60为负责人确认的体验调整。不要重做已验收四项。

结算数据已补BattleReplayUnit.totalDamage/totalTakenDamage和ChapterReceipt.experience；按旧口径冻结伤害，经验在发奖事务前后取值并持久化到原回执。负责人确认abs(实际扣血变化＋护盾吸收)口径，BRULE-002继续待审。旧战报/回执缺失时不伪造统计。旧胜利布局、最高伤害和经验动画已接入，治疗量与历史星级已随战报冻结，双方三项统计已接通，见[统计复验](validation/battle-statistics-20261109.json)；最新浏览器复验见[胜利页记录](validation/victory-review-20261109.json)，不要沿用下方旧批次的缺口描述。

初始技能覆盖扫描加入统一检查入口battle-presentation，报告见[覆盖清单](validation/battle-presentation-coverage-20261109.json)。113模板中50个直接动作可解析，63个仍有缺口；这不代表全英雄已开放。反馈三英雄作为必须通过的回归，不扩展其他模块。

用户反馈后新增修复：挂机借用同一骨骼避免切换空帧；敌方1秒淡入；树精与布鲁按旧actions覆盖优先解析。独立一级10301001/10101001/10201001阵容已实际播放树精3011101与布鲁2011101并完成结算、返回挂机，见[本批实战记录](validation/idle-retained-fix-20261109.json)。复现启动参数为SocketPreviewServer --idle-loop-fixture --reported-lineup-fixture；不要使用日常player_1准备数据。旧图集178帧逐像素一致；保留Creator自动更新的裁切meta及原UUID。

本批检查：前端39/39有效检查通过（5组暂停未计入），TypeScript无输出通过；MainChapterIdleTest、MainChapterSocketTest、MainChapterRewardTest共9项通过；Java→TS三关战报/结算及挂机快照互通通过。日志分别在client/temp/battle-controls-final-checks.log和backend/target/battle-controls-tests-20261109.log。Prefab报告已重新生成，结构通过不等于完整视觉验收。

本批播放控制与结算：见[battle-controls.md](battle-controls.md)及[独立环境证据](validation/main-chapter-controls-20261109.json)。默认1.5倍、主线隐藏跳过、VIP条件提示；胜利确认/4秒倒计时/14帧光效/双音源及关闭清理已接入。393×852实际画布恢复同一战报，资产从0到4000金币/151钻石，再返回挂机。此段为此前批次记录；经验动画及三种手机竖屏已在后续胜利页批次复验，双方三项统计已在最新批次复验。以下318项与原视觉结果属于交接基线，不能当作本批重跑。

2026-11-09：后端默认318项测试通过，日志backend/target/handoff-20261109.log。前端全检查首跑38/39通过，唯一失败是BattlePage人工验收指纹过期；依据本批真实实测更新指纹并重新生成审查报告后，该项复核通过，39组有效检查均通过；类型检查与文档链接检查也通过。五组旧暂停入口测试仍标PAUSED，不能算已恢复。

上一轮实际预览已通过：第二和第三关、真实奖励同步、结算后恢复三英雄挂机、深色/彩色台词及遇敌续接、开场暂停/恢复/立即退出、同一待领奖战报恢复。退出时资产0，播放完整战报后到账4000金币/131钻石。证据docs/validation/main-chapter-talk-opening-20261109.json及关联截图。

局限：本批视觉393×852，未做全尺寸/真机/正式构建；本轮未重跑MySQL。对话密集站位避让、BattleInfo跳过/倍速条件、完整结算模板及宝箱领取仍待恢复。不要把历史验收算本轮结果。

## 本机启动与独立环境

- 日常后端：scripts/start-remake-backend.bat；修改后端后使用scripts/restart-remake-backend.bat，start可能复用旧进程。日常端口18080。
- Creator 3.8.8打开client，assets/scenes/Remake.scene，预览7456。独立H5旧包不是当前源码，未要求不要构建。
- 最新独立预览：backend测试类SocketPreviewServer --idle-loop-fixture，只绑定回环随机端口、随机内存H2，测试账号chapter_review、角色2级、三英雄100级。进程可能随电脑/聊天结束失效，不能写死PID或端口。
- 读取client/temp/socket-preview.json取得port/run/pid后先核对归属与存活。最新地址格式：http://localhost:7456/?mxzgTestApi=http%3A%2F%2F127.0.0.1%3A端口&mxzgTestRun=实例run。
- 最新统计页独立复验实例端口62740、PID31408、run=1be2cd46290f41be922d6a057d9d19f0，仅作定位线索；该角色第二关已结算，第三关尚可挑战。测试身份按实例隔离，新实例须从开发账号菜单选择chapter_review，不默认player_1。
- 预览Java类务必复制到唯一backend/target/idle-preview-*目录再启动；直接用target/classes会被并行编译替换，曾导致NoClassDefFoundError。构建副本目录忽略且不提交。
- Creator刷新后核对temp/programming/packer-driver/targets/preview/chunks实际内容，再刷新浏览器。曾发生部分新旧脚本混用；不能只看工具通过就声称画面已更新。
- 编辑器无法自动刷新时请用户关闭正在编辑的相关Prefab且不要保存旧内容，再刷新资源，避免覆盖磁盘更新。不要擅自重建UUID或全删library。

## 检查命令

在仓库根目录执行：

```powershell
$env:MXZG_PYTHON='C:/Users/HelloWorld/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
node client/tools/check-project.mjs
node 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine/node_modules/typescript/lib/tsc.js' --project client/tsconfig.json --noEmit
node tools/generate_game_protocol.cjs --check
```

backend内设置JAVA_HOME为.tools/jdk-21.0.13.0.2+1、加入PATH，MAVEN_USER_HOME为.tools/maven-user，再执行./mvnw.cmd test。真实互通检查先跑MainChapterIdleTest、MainChapterSocketTest等导出战报，再执行node client/temp/project-checks/main-chapter.cjs --wire。临时工具目录不入库。

MySQL只用backend/test-mysql.ps1独立实例流程，详见local-remake-workflow.md；不要拿日常库代替验证。后台进程使用隐藏窗口，停止前核对完整命令行归属。

## 下一步建议

1. 新聊天先核对git状态和本次推送，阅读进度与问题清单，不重做已完成对话/开场。
2. BattleInfo规则、旧胜利模板、最高伤害展示和经验动画已接入并复验，不重做；双方三项统计已接通并复验，保留历史姓名/皮肤外观缺口。三种手机竖屏已复验，平板/真机及密集气泡仍待验；横屏明确不需要。
3. 宝箱先核对旧动画/收益说明/领取规则，当前不得直接开启领取。完成UI流程收口后再按用户下一步授权推进领取事务。
4. 遇到未覆盖的技能/关卡按旧源码补齐；其他模块、升级和穿脱继续保持关闭。

## 文档整理约定

当前状态唯一入口development-progress.md；本交接文档提供接手导航；稳定规则放架构/协议/规范文档；历史结果在validation/。已将过期restoration-checklist合并删除，原批次长日志归档为validation/development-history-20261109.md。JSON资源来源/Prefab审查清单由工具使用，保留。不要反复把旧“当前状态”复制到多个文档。

## 2026-11-09 双方战斗统计复验

主线胜利页的战报按钮已接入双方伤害、承伤、治疗统计；按旧源码共享双方同项最大值，保留名册顺序与重复模板，治疗量包含溢出且保留正负。历史字段缺失显示“—”，不伪造零值。界面仅消费已冻结战报，不追加结算或资产请求。独立窗口不阻止原胜利页倒计时；关闭后返回挂机。

独立H2真实第二关通过：我方三英雄/敌方一英雄、伤害199/承伤199、治疗0；393×852、360×720、360×840竖屏及关闭返回通过，资产保持4000金币/151钻石。服务端相关测试去重52项、前端40项通过；5项既有暂停检查不计入。非零治疗及负值由规则/协议测试验证，未扩大治疗技能实机覆盖；平板、真机、8人滚动及历史姓名/皮肤外观仍待验或待恢复。清心与护盾待审不关闭，未提交推送。详见[统计规则](battle-statistics.md)和[本批证据](validation/battle-statistics-20261109.json)。
