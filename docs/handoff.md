# 新聊天交接文档

更新：2026-11-11。已推送基线hao/f3cd64a3，main未合并。上一批加载与缓存已通过；本批共享模态、完整英雄Prefab与布局清理已完成专项和本机限定预览，修改暂留本地，未提交推送。

先看[当前进度](development-progress.md)，这里仅保留接手入口。本批48/48项有效检查及类型检查通过，5组旧检查暂停；共享层三模式/叠窗、英雄和背包相关竖屏、真实挑战结算返回的限定结果见[本批证据](validation/shared-modal-widget-20261111.json)。[前次框架审计](validation/framework-cleanup-20261111.json)和[旧模态证据](validation/modal-layer-20261111.json)保留历史依据；旧逐窗蒙版已被共享方案取代。本批未重新构建发布包，也未代签负责人Inspector或全页面验收。

上一批46项统一检查、Python17组以及加载/缓存自然回收已通过，见[工具证据](validation/migration-tools-review-20261111.json)和[加载与缓存证据](validation/loading-cache-review-20261111.json)。这和本批共享模态/布局复验分开，不代表真实CDN、真机、长期内存或完整玩法新验收。

顶层资源已归入assets/bundles，104远程包及本地bootstrap自动构建已收口。21,902个非目录UUID全部保留是f3cd64a3目录迁移时的历史基线；本批主动退役旧壳、蒙版片段及独立英雄列表板后，当前96份Prefab（含场景共97份），仍用资源UUID不变。三段显式配置与其余按需保持；预加载Prefab不会因背包实例到期而失效，迟到角色骨骼等按需资源重开仍可能下载。

背包、英雄列表和详情已是完整Prefab；固定布局归Widget，ViewportScale只对target按designWidth/maxScale等比缩放，外根fitVisibleRoot仅桥接LiveShell视口。ParchmentLayout、ccbiPlace、heroMount、heroChrome及PagePrefabShell/ListBackdrop/DimSheet、独立HeroListBoardView Prefab已退役；列表板直接保存于HeroListView，HeroRosterModel仍是唯一名册状态。PrefabLayout仅留旧战斗结果显示的实际辅助。

模态只在ViewSpec配置`{mask,closeOnOutside}`，两个开关独立；省略则不拦截。多个弹窗只共用一个动态节点，Prefab仅保留实际内容背景的BlockInputEvents。普通弹窗及原有布阵/结算沿用各自关闭流程，GM/技能台mask=true、closeOnOutside=false。本机限定复验已完成，下一步按负责人节奏集中构建，检查新Prefab、共享层和当前编译结果；真实CDN/平台/长期内存仍列计划，不恢复暂停玩法。

## 项目与边界

- 新项目G:/work/FsGame/Project/mxzg，client为Creator客户端，backend为Java服务端；开发分支hao，origin为https://github.com/ItManJhao/mxzg.git。
- 旧项目G:/work/FsGame/Demo/mj/program是正常工作目录，直接读取client/cocos_mxzg/client/idle及server源码；G:/游爱/trunk只参考人工阅读习惯，不引入玩法或框架。
- 目标是现代技术1:1恢复旧玩法、规则、内容和流程；独立新版，不兼容旧客户端或迁移旧玩家。正式服https://mxzg-test.funsgamex.com/jp/主要对照界面与交互，技能规则/资源以旧源码为依据。
- 当前主线挑战前三关；850关仅产物说明范围，20关是现有挂机规则投影。宝箱领取、快速战斗、英雄升级和穿脱仍关闭，其他模块不顺带恢复。
- 当前保存点见页首；接手检查Git并保留本地修改，不以历史记录推断提交状态。
- 浏览器复验允许；不操作桌面或Creator。需要编译刷新时请负责人刷新资源，相关Prefab若正在编辑先关闭且不保存旧内容。无需横屏，不再安排单独拆RemakeApp启动装配。
- WS＋Protobuf、服务端权威、持久幂等、Controller→唯一Model→事件刷新View保持。静态布局保存在Prefab，列表SuperScroll，保留资源UUID；中文文件头/方法/属性注释及模块目录规范见AGENTS.md。

## 接手时最重要的状态

主线与挂机演出、胜利页及统计、历史名称/外观、高星、冰晶女巫真实治疗、宝箱只读表现、完整产物说明、累计条与资源飞行已分批接入验证，不重复重做。IdleBonusUtils已实现已核实公式的纯计算（10项），与基础随机10项共同复验通过；未接任何生产调用。后续权威输入先确认范围和依据缺口；输入契约仍为[设计草案](idle-reward-input-contract.md)，没有新的领取协议或权威加成模块。

三项恢复前依据缺口和清心/护盾待审保持。当前VIP列已存在但未接入挂机权威收益；不得把缺依赖当0加成。全局当前状态及验证局限只在[进度页](development-progress.md)维护，不把归档的旧缺口作为新任务。

三段显式配置、其余按需保持；远程样板状态以页首为准。

## 代码入口

人工入口和资源生命周期见[加载与远程资源](staged-resource-loading.md)。当前Bundle整合与自动构建已验收，本轮工具、加载和缓存实测也已完成；耗时及适用边界统一见进度页，不将历史玩法视觉记录作为本批新验收。

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
