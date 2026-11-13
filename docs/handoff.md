# 新聊天交接文档

更新：2026-11-13。开发分支 hao，跟踪 origin/hao。代码整理 dd5822a8 已推送 hao、合并并推送 main；本轮文档整理单独提交同步。接手先检查 Git，保留未提交修改，不能从历史验收记录推断当前分支状态。后续 main 合并仍需负责人明确授权。

## 先读什么

1. 根目录 AGENTS.md：目标、职责、中文注释、目录、分支及网络约束。
2. [当前进度](development-progress.md)：唯一当前状态、最新证据及验证限制。
3. [实施路线](restructuring-plan.md)：下一步顺序和完成条件；不按旧 P0–P10 状态继续开发。
4. [架构](architecture.md)与[战斗待复验问题](battle-known-issues.md)：按涉及职责查阅，不重复已完成链。

## 接手要保留的边界

- 新项目 G:/work/FsGame/Project/mxzg，旧项目 G:/work/FsGame/Demo/mj/program 为正常工作目录；旧源码/配置是主要规则依据，正式服用于可观察效果对照，G:/游爱/trunk 只参考阅读习惯。
- 当前实际挑战前三关；850 关仅产物说明，20 关是奖励规则投影。宝箱领取、快速战斗、升级和穿脱仍关闭，其他玩法逐模块恢复。
- IdleBonusUtils 纯计算已有测试但无生产调用；完整挂机权威输入和领取事务尚未实现。chapter.claim 是挑战结算，不能当成宝箱领取。
- WS＋Protobuf、服务端权威、持久幂等、Controller 提交唯一 Model 后通知 View 保持；账号与连接隔离归应用/平台层，页面只保护自身关闭与异步绘制生命周期。
- 布局归完整 Prefab、Widget 与统一缩放，列表用 SuperScroll；页面自行 @UIRegistry.view 定义，资源经 ResManager/原资源池。LoadingPlan 三段显式配置，其余按需，不新增模块资源清单。
- resources/module 两层只是源目录分类；保留 Bundle 名及原 UUID。effects 新包已经整理，源码/工具检查通过，但最新发布包未验证。
- 负责人已验收此前功能，并要求停止本轮重复浏览器/Creator 验收；文档任务不另起测试服或构建。下一次集中发布验证按后续授权执行。只做竖屏，不安排专门拆 RemakeApp。

## 从哪里改

下列源码路径相对 client/assets/scripts；完整职责和其余入口见架构，不在本页重复整个文件清单。

| 任务 | 直接入口 |
|---|---|
| 页面地址、模态、缓存、配置前置 | 对应 features/模块/ui/*View.ts 的 @UIRegistry.view；实际布局修改其 Prefab |
| 加载阶段、资源下载与持有 | app/remake/LoadingPlan.ts、ApplicationResources.ts；framework/assets/ResManager.ts、ResourcePool.ts、PrefabLoader.ts |
| 账号、资产与换号 | app/remake/AssetStateBinding.ts；features/account/AccountService.ts；platform/GameSocketClient.ts |
| 背包 | features/bag/BagController.ts、BagModel.ts、ui/BagView.ts、ui/BagInfoView.ts |
| 英雄与布阵 | features/hero/HeroRosterController.ts、HeroRosterModel.ts、FormationController.ts；ui/HeroListView.ts、HeroInfoView.ts、FormationView.ts |
| 主线、挂机、结算与统计 | features/battle/MainChapterController.ts、MainChapterModel.ts；ui/MainChapterView.ts、BattleReplayPreview.ts、ChapterEndView.ts、BattleDetailLayer.ts |
| 挂机后续规则 | backend 的 campaign/IdleRules.java、IdleBonusUtils.java；[输入契约草案](idle-reward-input-contract.md) |
| 协议与生成 | protocol/game.proto、tools/generate_game_protocol.cjs；禁止手改生成文件 |

资源迁移、三段配置与缓存边界见[资源维护](staged-resource-loading.md)，手写模块/通信样板见[背包维护](bag-mvc-maintenance.md)，全部文档按[索引](README.md)查阅。

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

## 下一步

先按后续授权集中验证新包迁移风险，再回到挂机权威输入核对；输入完整且领取获授权后才接事务和按钮。具体完成条件统一见[实施路线](restructuring-plan.md#接下来的执行顺序)。本轮代码整理的 52 项与类型检查属于对应源码证据，不将旧发布包、历史截图或本次文档链接检查当作新发布验收。

历史过程保存在[11-13 收口快照](validation/development-history-20261113.md)及[更早主线记录](validation/main-chapter-history-20261109.md)。
