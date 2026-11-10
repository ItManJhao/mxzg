# 新聊天交接文档

> 当前暂停：负责人于2026-11-10暂停挂机收益后续推进。纯加成工具及10项测试已完成但未提交；权威输入与领取未接入。本次仅检查预加载、图集和ApplicationPages，见[资源与页面检查](resource-loading-review-20261110.md)。保留5个资源框架本地修改，不覆盖、不提交推送。

更新：2026-11-10。先检查Git状态，再读AGENTS.md、[当前进度](development-progress.md)、[执行路线](restructuring-plan.md)和[问题清单](battle-known-issues.md)。保留本地新增修改，不从历史聊天推断现状。

## 项目与边界

- 新项目G:/work/FsGame/Project/mxzg，client为Creator客户端，backend为Java服务端；分支main，origin为https://github.com/ItManJhao/mxzg.git。
- 旧项目G:/work/FsGame/Demo/mj/program是正常工作目录，直接读取client/cocos_mxzg/client/idle及server源码；G:/游爱/trunk只参考人工阅读习惯，不引入玩法或框架。
- 目标是现代技术1:1恢复旧玩法、规则、内容和流程；独立新版，不兼容旧客户端或迁移旧玩家。正式服https://mxzg-test.funsgamex.com/jp/主要对照界面与交互，技能规则/资源以旧源码为依据。
- 当前主线挑战前三关；850关仅产物说明范围，20关是现有挂机规则投影。宝箱领取、快速战斗、英雄升级和穿脱仍关闭，其他模块不顺带恢复。
- 已推送基线3dbb33f7。本批纯加成计算与测试尚未提交，负责人要求先不提交推送；检查Git并保留本地修改。
- 浏览器复验允许；不操作桌面或Creator。需要编译刷新时请负责人刷新资源，相关Prefab若正在编辑先关闭且不保存旧内容。无需横屏，不再安排单独拆RemakeApp启动装配。
- WS＋Protobuf、服务端权威、持久幂等、Controller→唯一Model→事件刷新View保持。静态布局保存在Prefab，列表SuperScroll，保留资源UUID；中文文件头/方法/属性注释及模块目录规范见AGENTS.md。

## 接手时最重要的状态

主线与挂机演出、胜利页及统计、历史名称/外观、高星、冰晶女巫真实治疗、宝箱只读表现、完整产物说明、累计条与资源飞行已分批接入验证，不重复重做。IdleBonusUtils已实现已核实公式的纯计算（10项），与基础随机10项共同复验通过；未接任何生产调用。后续权威输入先确认范围和依据缺口；输入契约仍为[设计草案](idle-reward-input-contract.md)，没有新的领取协议或权威加成模块。

三项恢复前依据缺口和清心/护盾待审保持。当前VIP列已存在但未接入挂机权威收益；不得把缺依赖当0加成。全局当前状态及验证局限只在[进度页](development-progress.md)维护，不把归档的旧缺口作为新任务。

## 代码入口

| 流程 | 入口 |
|---|---|
| 主线联网与状态 | client/assets/scripts/features/battle/MainChapterController.ts、MainChapterModel.ts |
| 挂机页面与生命周期 | 同目录ui/MainChapterView.ts、MainChapterIdleDisplay.ts、MainChapterIdleResources.ts、MainChapterHeroTalk.ts |
| 战斗/胜利/统计 | ui/MainChapterBattleView.ts、BattleReplayPreview.ts、ChapterEndView.ts、BattleDetailLayer.ts、BattleDetailCell.ts、BattleHeroStarView.ts |
| 产物说明/宝箱规则 | ui/ChapterRewardInfoView.ts、ChapterRewardInfoCell.ts；utils/ChapterRewardInfoUtils.ts、IdleChestUtils.ts |
| 资产与战报 | backend/.../campaign/MainChapterService.java、MainChapterRewardService.java、MainChapterIdleService.java；hero/HeroBattleChapterScenario.java、HeroBattleAppearanceRules.java；network/SessionSnapshotService.java、AssetSyncService.java |
| 协议与持久化 | protocol/game.proto，生成工具tools/generate_game_protocol.cjs；V16主线、V17挂机起点、V18挂机选人。不得手改生成文件或重置日常库 |
| 纯规则 | campaign/IdleRules.java、IdleBonusUtils.java；测试IdleRulesBoundaryTest、IdleBonusUtilsTest。旧IdleService/IdleTest不是新主线完整领取实现 |

## 本机与独立验证

- Creator3.8.8打开client/assets/scenes/Remake.scene，预览7456；旧H5包不代表当前源码。刷新后核对实际编译内容，再做浏览器验收。
- 日常后端使用scripts/start-remake-backend.bat或restart-remake-backend.bat，日常端口18080；验证使用独立环境，不能以历史数据库授权扩大范围。
- 独立预览由测试类SocketPreviewServer启动，回环随机端口、独立内存H2。读取client/temp/socket-preview.json并核对实例归属/存活；历史端口、PID、run均不可复用为当前事实。
- 预览参数格式：http://localhost:7456/?mxzgTestApi=http%3A%2F%2F127.0.0.1%3A端口&mxzgTestRun=实例run。测试账号通常chapter_review，按实例隔离；不要默认player_1或把夹具当正常获取玩法。
- 预览Java类复制到唯一backend/target/idle-preview-*目录后启动，避免编译覆盖运行中的类。修改预览服务后核对新实例，不直接沿用旧进程。
- 后台启动隐藏窗口，停止前核对完整命令行归属。MySQL只按backend/test-mysql.ps1独立实例流程运行。

## 常用检查

根目录设置MXZG_PYTHON为本机可用Python，再运行node client/tools/check-project.mjs；5组旧暂停检查不计入通过数。类型检查使用Creator引擎内typescript/lib/tsc.js --project client/tsconfig.json --noEmit；协议检查node tools/generate_game_protocol.cjs --check。

backend内设置JAVA_HOME为.tools/jdk-21.0.13.0.2+1并加入PATH，MAVEN_USER_HOME为.tools/maven-user，再执行./mvnw.cmd test。专项纯规则用-Dtest=IdleRulesBoundaryTest。真实互通先运行相关MainChapter测试导出战报，再运行node client/temp/project-checks/main-chapter.cjs --wire。

上一推送检查见[发布记录](validation/release-review-20261109.json)。浏览器和资源像素证据按各自批次区分，结构检查不等于视觉验收。原交接与长批次过程保存在[历史归档](validation/main-chapter-history-20261109.md)和[更早历史](validation/development-history-20261109.md)。
