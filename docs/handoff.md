# 新聊天交接文档

更新：2026-11-12。负责人已授权将本轮成果推送hao并合入main，提交与远端同步结果以Git记录为准；后续开发仍在hao、跟踪origin/hao，8cb60507为本轮之前的基线。本轮15个Bundle归档到resources/module两个普通父目录，26,410份原资源/meta在Creator重新导入后仍逐字节保留；52/52项有效检查、类型和全库绑定通过。新目录393×852独立环境完成登录、三段配置、背包四类详情、三英雄及详情、850关与真实第二关结算返回，无新警告/错误；本轮不签缓存TTL或立即重开同实例。扩展1.6.3隔离钩子已验，真实发布构建尚未进行。见[当前目录记录](validation/bundle-directory-groups-20261111.json)和[资源维护入口](staged-resource-loading.md)。

上一批统一列表事件、资源清理和虚拟列表的51项、类型及本机限定复验见[前批证据](validation/virtual-list-resource-review-20261111.json)，不能当作本次新目录路径的验收。当前资源在bundles/resources/{audio,config,font,icons,maps,spine}和bundles/module/{bag,battle,bootstrap,chapter,common,gm,hero,home,login}；父层不是Bundle，原15个包名与CDN remote/<包名>不变，bootstrap仍本地，自动图集全部保留。

先看[当前进度](development-progress.md)，这里仅保留接手入口。各View的@view统一静态定义与prepare；ApplicationPages只装配登录/主城Controller及宿主，bindViewRuntime只注入createController/动态hostId，ApplicationResources只调度三段。LoadingPlan页面目标改用`{page:BagView}`类引用，预载只读取Prefab、不执行prepare或创建页面，其余图片/骨骼/配置继续显式配置。

英雄、背包、产物说明外层/内层及胜利奖励统一监听RENDER_ITEM/SELECT_ITEM，Cell只绘制，选择归所属页面；名册/库存仍归唯一Model。SuperContent默认virtual=true、bufferLines=1，逻辑总量与节点量分开，仅建立视口及缓冲行有限池；原锚点/Cell正缩放保留，view/content局部缩放须1，祖先适配可用。滚动不停止惯性，几何/数据改变完整保位，离屏refresh延迟渲染。

本批千/万条六布局、锚点/缩放、resize、惯性和单图拥有者专项通过；当前51项全量、180脚本/33份PrefabScene/71绑定通过。本机850关首屏5节点，多次拖动/跳转后池保持7，末关点击正确；背包四分类及详情数量保持，最终资源重载后三英雄列表和真实第二关结算返回通过。ResManager.setSprite只保留当前/在途作用域，同图复用，新图接替后撤回旧图；getSpriteFrame(owner)显式持有及TTL不变。本轮不签TTL、GPU或真机，前批48项与旧数量见[历史入口证据](validation/view-registration-list-review-20261111.json)。

8cb60507基线的48项与共享层限定预览见[上一批证据](validation/shared-modal-widget-20261111.json)，不能冒充本批新入口结果。[前次框架审计](validation/framework-cleanup-20261111.json)和[旧模态证据](validation/modal-layer-20261111.json)保留历史依据，旧逐窗蒙版已被共享方案取代。尚未重建对应发布包，也未代签负责人Inspector或全页面验收。

更早46项统一检查、Python17组以及加载/缓存自然回收已通过，见[工具证据](validation/migration-tools-review-20261111.json)和[加载与缓存证据](validation/loading-cache-review-20261111.json)。各批证据分别记录，不代表真实CDN、真机、长期内存或完整玩法新验收。

资源统一到assets/bundles，本批保留15包、32份Prefab、31张实际依赖表；清理90未实现包、64旧Prefab及未使用配置，源资源减少约203.30MiB，详见[清理记录](validation/current-resource-scope-cleanup-20261111.json)。buffart遗漏已原字节恢复并补闭包反例；三份主城现用表与XLSX差异另存[生成输入说明](../config/client-maincity/README.md)，后续核对，不在清理时改规则。原105包/96Prefab与21,902个UUID是历史基线；源目录减少不是新发布/下载包体。三段显式配置、其余按需与缓存规则保持，暂停领域代码不接回导航。

背包、英雄列表和详情均是完整Prefab；固定布局归Widget，ViewportScale仅统一缩放，fitVisibleRoot只桥接LiveShell视口。旧羊皮纸/英雄组装链、页面壳及独立列表板已退役，本批继续删除旧Campaign四份UI、PrefabLayout及Common*Shell样板链；不因保留暂停领域代码重建旧入口。

模态只在ViewSpec配置`{mask,closeOnOutside}`，两个开关独立；省略则不拦截。多个弹窗共用一个动态节点，Prefab仅保留实际内容背景的BlockInputEvents。普通弹窗及原有布阵/结算沿用各自关闭流程，GM/技能台mask=true、closeOnOutside=false；前批限定复验不自动覆盖本批新入口。真实CDN/平台/长期内存仍列计划，不恢复暂停玩法。

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

人工入口和资源生命周期见[加载与远程资源](staged-resource-loading.md)。此前Bundle整合、自动构建及工具/加载/缓存实测保留各自批次结论；耗时及适用边界统一见进度页，不将历史结果作为本批页面入口与列表事件的新验收。

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
