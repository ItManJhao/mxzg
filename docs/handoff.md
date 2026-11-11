# 新聊天交接文档

更新：2026-11-11。先检查Git并保留本地修改，再读[当前进度](development-progress.md)、[执行路线](restructuring-plan.md)、[资源入口](staged-resource-loading.md)与[战斗问题](battle-known-issues.md)。

资源入口现为LoadingPlan、ResManager、ResourceAssets/ResourcePool；旧资源清单及旧LineupApi已删除。登录使用指定静态背景，CompatibleSpine的真实绑定已移除。日常使用本机预览；本批15:23新发布包已集中验收，详见发布记录。背包缓存已通过本机复验，资源闲置清理仍待实施；先不提交推送。

## 预制体闲置回收当前实现（2026-11-11）

PrefabLoader按路径分别持有资源池作用域，成功缓存另持有一份引用。spawnPrefab由实例节点持有依赖，UIManager保护异步页面挂载与弹窗实例；节点销毁时撤回自身引用。最后一个实例退出后开始闲置计时，初始120秒；RemakeApp每30秒检查一次，因此前台运行通常在120–150秒内撤回加载器缓存。后台暂停会推迟检查，重回前台后继续，不承诺后台精确计时。

LoadingPlan不变：显式目标继续由ApplicationResources持有。背包详情在第三阶段内，清理加载器缓存不等于卸载预加载资源。页面实例缓存与资源缓存计时分开：背包实例先保留120秒，节点销毁后才开始其预制体的闲置计时。普通动态资源仍按现有ResourcePool拥有者归零释放，本批没有新增第二套图片缓存或通用闲置纹理池。

自动专项已覆盖共享池复用、在途请求保护、实例持有、重复绑定不加引用、预加载独立持有、无预加载资源归零、重新加载及应用关闭后的迟到回包。本机预览已通过：详情显示引用3，关闭后2，关闭113秒观察尚未回收，169秒观察加载器缓存3→2、详情引用2→1，预加载资源仍有效；重开详情引用恢复3、画面正常、无警告错误。观察时间不是精确触发时间。未预加载资源归零及重新请求由自动专项覆盖，本轮没有移除LoadingPlan目标。见[验收记录](validation/prefab-cache-20261111.json)。真机/GPU内存、长期压力及容量策略仍待验。未提交推送。

## 背包界面缓存当前状态（2026-11-11）

背包已启用有界实例缓存：关闭后保留120秒，全局最多2个闲置页面；参数在UIManager集中定义。重开读取最新Model，无参数默认道具分类，重新适配屏幕。定时检查只处理闲置实例，当前显示与在途打开不参与淘汰；根页面替换和卸载清空缓存。

Creator本机独立环境复验通过：连续切换10次复用同一实例，关闭后业务监听归零；真实等待120秒后缓存归零且计时器停止，重新打开创建新实例；注销后旧缓存清空。首次及淘汰后打开约6ms，缓存重开日志为0ms（整数精度，不是绝对零耗时）。专项测试覆盖最新库存重读、容量上限、活动实例保护、取消和注销清理。

资源边界：阶段预加载由ApplicationResources持有，预制体由PrefabLoader应用缓存持有，本轮不清理这些基础资源。到期前后预制体缓存均2份，资源池作用域25→22、条目85→82。CDP JavaScript堆快照约74.5MB→69.5MB，未强制GC，不能据此认定下降全部来自背包，也不代表GPU纹理或进程总内存；真机和长时间趋势待验。按需Prefab长期持有已在后续本轮收敛，见预制体闲置回收章节；通用资源容量策略仍待实施。见[缓存验收记录](validation/bag-cache-20261111.json)。未提交推送。

## 2026-11-11 发布包集中复验

15:23生成的bag-atlas-review已在独立内存测试服完成393×852竖屏检查：静态登录、主城、后台4/4、背包四分类与详情、第二和第三关布阵→挑战→结算→战报→返回挂机通过。最终maxCleared=3、pendingBattleId=null、assetRevision=6，回执SETTLED，经验由2级200变为3级40。构建扩展自动清理bag/common共9张原图副本、35481字节，复查无待去重文件。正确验收入口未记录警告/错误；首次临时端口被隔离保护拒绝，未放宽保护。此次不替代真机、并发幂等或全英雄验收。当时尚未实施缓存，最新状态见本页缓存章节。见[发布记录](validation/resource-release-closeout-20261111.json)。

## 项目与边界

- 新项目G:/work/FsGame/Project/mxzg，client为Creator客户端，backend为Java服务端；分支main，origin为https://github.com/ItManJhao/mxzg.git。
- 旧项目G:/work/FsGame/Demo/mj/program是正常工作目录，直接读取client/cocos_mxzg/client/idle及server源码；G:/游爱/trunk只参考人工阅读习惯，不引入玩法或框架。
- 目标是现代技术1:1恢复旧玩法、规则、内容和流程；独立新版，不兼容旧客户端或迁移旧玩家。正式服https://mxzg-test.funsgamex.com/jp/主要对照界面与交互，技能规则/资源以旧源码为依据。
- 当前主线挑战前三关；850关仅产物说明范围，20关是现有挂机规则投影。宝箱领取、快速战斗、英雄升级和穿脱仍关闭，其他模块不顺带恢复。
- 已推送基线ca39f9ba，包含三段加载、背包资源入口、图集工具与验收记录。2026-11-11英雄/技能/战报取图收敛修改尚未提交，负责人要求先不提交推送；检查Git并保留本地修改。
- 浏览器复验允许；不操作桌面或Creator。需要编译刷新时请负责人刷新资源，相关Prefab若正在编辑先关闭且不保存旧内容。无需横屏，不再安排单独拆RemakeApp启动装配。
- WS＋Protobuf、服务端权威、持久幂等、Controller→唯一Model→事件刷新View保持。静态布局保存在Prefab，列表SuperScroll，保留资源UUID；中文文件头/方法/属性注释及模块目录规范见AGENTS.md。

## 接手时最重要的状态

主线与挂机演出、胜利页及统计、历史名称/外观、高星、冰晶女巫真实治疗、宝箱只读表现、完整产物说明、累计条与资源飞行已分批接入验证，不重复重做。IdleBonusUtils已实现已核实公式的纯计算（10项），与基础随机10项共同复验通过；未接任何生产调用。后续权威输入先确认范围和依据缺口；输入契约仍为[设计草案](idle-reward-input-contract.md)，没有新的领取协议或权威加成模块。

三项恢复前依据缺口和清心/护盾待审保持。当前VIP列已存在但未接入挂机权威收益；不得把缺依赖当0加成。全局当前状态及验证局限只在[进度页](development-progress.md)维护，不把归档的旧缺口作为新任务。

负责人已取消全量加载：LoadingPlan统一配置三个阶段，第三段仅显式常用目标，其余按需。全目录索引和构建前检查已删除。2026-11-10旧发布包曾验证后台4/4；2026-11-11当前修改已完成本机复验，新发布包验收也已通过；基础引用释放存在，闲置清理/容量上限仍缺失。

## 代码入口

人工资源入口见[分阶段加载](staged-resource-loading.md)：ResManager直接生成动态路径并取图，不维护ID可用性索引；底层复用ResourcePool。2026-11-11完整主线闭环本机复验已通过，新发布包集中验收已通过。页面缓存和定时清理仍仅计划。

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
