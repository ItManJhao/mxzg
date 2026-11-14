# 新聊天交接文档

更新：2026-11-14。开发分支hao，最近已推送c23b53ed（含代码整理dd5822a8），两远端分支已同步。活动控制维护、完整纯装配、权益输入和同步/钱包修正仍留本地；此前已接通2000002真实精灵实例、精灵专用详情、GM分窗和全局飘字，普通装备只读详情已完成本机限定复验。前批普通道具/精英碎片已完成本机限定复验；共享可信发奖已保留；本批V24/V25累计/成功回执及服务端领取/status事务已接，日常开关和客户端按钮仍关闭，客户端持久待确认未接；未提交推送。接手先检查Git并保留现有修改；后续main合并须依当次授权。

最新批次是配置取用精简：BagItemCatalog/HeroCatalog只剩静态显示计算，页面不new或持有Catalog、不传整表建索引；简单字段直接getConfig。装备六表source、GM语言Map和结算门槛Map已删除，真实显示规则和运行状态保留。原路径/UUID/Prefab、配置包内容、三段和资源池不变。16套相关专项及严格类型通过，本机独立H2/WS已验背包四类、英雄/技能、产物两页首屏/说明、二三关结算战报返回和GM道具名称；6项配置请求不增、244日志无warn/error，测试服已停。见[本批记录](validation/config-direct-lookup-review-20261114.json)。本批未构建、未提交推送，上一批发布不能替代当前源码验证。

前批客户端统一配置包及实际发布验收已限定收口：LoadingPlan.login为启动表唯一配置入口，其余配置打包后在enterGame安装到唯一GameConfig，页面不再prepare配置或直接加载JSON；美术与装配prepare保留。源49份JSON/原UUID保留，目前2份启动、47份包内，一份bin为408,367字节；玩家文案去掉X/47，仍按内部真实任务推进。2026-11-14 19:54（上海）通过统一入口实际构建，18个输出Bundle中47份散JSON零副本，1.8.0三阶段钩子匹配。18081前端、7460本地资源与独立随机H2/WS真实运行通过首次登录、冷恢复点击开始、换号、背包四类、英雄/技能和二三关结算战报返回；配置请求始终6项，GameConfig49文件/20类型表，bin不驻留引擎资产缓存，无新warn/error。范围见[发布最终记录](validation/config-package-release-review-20261114.json)，此前本机预览记录仍保留在[前阶段证据](validation/config-package-review-20261114.json)。真实CDN、真机和完整经验动画边界未以该批替代；未提交推送。

最终20:14:38（上海）又补了普通JsonAsset与显式config完成状态隔离，实际下载仍共享资源池；先原始JSON再配置的单次下载/成功解析专项通过。该增量包重新构建并核对172份TS摘要，独立实例仅复验变化相关的登录、单bin安装、背包和装备详情/关闭，14条记录无warn/error。19:54完整英雄/二三关矩阵与20:14限定复验各自保留build和运行证据，不混为全部重跑；所有本批测试进程已停止。

前批已接MainChapterIdleStateRepository（V24）与MainChapterIdleClaimService/AuditV1（V25）：首次挑战前创建now-60，已有起点保留、已通关缺行拒绝；锁内先查原回执再判断新请求，完整输入/纯计算/真实发奖/累计消费/revision/回执同事务。Frame31～34及claim_state=9已生成双端协议并验证真实WS互通，日常新领取默认false。详情见[领取事务](main-chapter-idle-settlement.md)，验证见[本批证据](validation/main-chapter-idle-claim-review-20261114.json)。客户端仅接只读投影，无领取发包或持久journal；配置整理后再补应用层持久待确认/双向确认，按钮仍关。该服务端批次不需要Creator刷新或构建，未重启日常后端、未提交推送。共享发奖旧批结果另见[记录](validation/reward-grant-review-20261114.json)。

11-14专用详情已完成本机限定复验，见[11-14专用详情复验](validation/spirit-detail-review-20261114.json)；新增SpiritInfoView完整Prefab/脚本，当时33份Prefab、18个独立View、163份TS。实际13项Java与9套前端专项属于该精灵批次，前批88/32记录仍保留原日期。该批独立测试进程已停止，未连接日常库。

追加[GM/背包/第三关检查](validation/gm-bag-battle-review-20261114.json)：当时GM断点false、默认关闭；独立开启实发与29项Java回归通过；该批独立测试进程已停止。第三关待挑战可点，三关全通明确显示“已通关”。该次装备/道具/碎片差异只完成审计；之后普通装备已完成限定复验，本批道具/碎片已实现、本机限定复验已完成，灵器仍是缺口，见[清单](bag-resource-inventory.md#详情还原差异)。

负责人随后确认本机GM默认开启，application-local.yml现为`${MXZG_GM_ENABLED:true}`，重启保留；可显式false关闭，production不装配。旧记录中的GM默认关闭只代表变更前。直接双击restart-remake-backend.bat重启一次生效，避免直接ps1遇到系统执行策略限制；不修改系统策略。31项回归及范围见[默认设置记录](validation/gm-local-default-20261114.json)，尚未替负责人重启日常后端。

前批追加GM修复及第4项反馈要求：F9预览入口，GmView四类总菜单、独立发放和试战窗，2000002走真实实例链且最多1000只，业务拒绝显示具体中文原因。统一ToastManager复用原场景提示节点，UIManager.toast承接操作结果；换号clear、销毁dispose及窗口迟到均受保护。该GM批次48项Java检查及相关前端检查通过，独立浏览器已完成上述入口/发放/反馈及第三关结算返回；测试进程已停止，见[本轮证据](validation/gm-toast-review-20261114.json)，以最终记录为准。该GM批次16包/35份Prefab/20独立View/166份脚本，未提交推送；日常后端需负责人重启一次新服务生效。

前批按负责人要求恢复普通mode=1装备专用只读详情：BagView→EquipmentInfoView→EquipmentDetailUtils，稳定库存key重读BagModel；旧品质/星级、评分、基础属性、空穿戴套装0/4与说明已接入。来源/装备只提示未开放，mode=18灵器不套用，不新增实例或写协议。三张显示类型接入后，共享JSON49份/类型20表/Maven32表；当时16包/36Prefab/21View/169TS，37份Prefab/Scene共85处绑定。装备24张图核对、17张修正原RGBA并保留UUID，见[资源记录](validation/equipment-detail-assets-20261114.json)。本机限定复验通过：绿1星1001001评分33/攻击33，紫3星1001007评分276/套装0/4，红6星1001017评分4137/攻击3780/暴伤510及一颗红星；X/空白关闭、面板收缩、英雄往返、注销及只读飘字通过。设备选项393×852、浏览器1280×720，不代表真机；权威revision5、三库存各1，只读阶段无新state.changed，刷新后15:50（上海，07:50Z）无新warn/error，保留历史旧编译错误。PID9080已核身份停止；正式服只对照银剑，未新构建、新Java或MySQL，见[该批记录](validation/equipment-detail-review-20261114.json)。

本批复用BagInfoView和BagItemView，新增无状态ItemDetailUtils，不新增View、Prefab或Bundle。mode2/8/9/17共584条配置纯投影专项通过；mode8恢复星级/拼图角标，只有背包显式开启持有数/需求数进度，奖励保留本次数量、产物候选数量0隐藏，详情无进度。mode9不套用碎片样式，23条缺正文保留明确提示并限频记录。类型与来源/使用/分解/指定英雄图鉴按钮依旧配置显示，操作仅全局飘字，未开放任何写业务。说明高度60～300由Prefab参数维护，长文用ScrollView、布局用Layout/Widget；LoadingPlan三段、ResManager及原资源池不变，不加模块清单。3张旧图已恢复原RGBA、保留UUID，见[资源证据](validation/item-shard-assets-20261114.json)。当前170TS、36Prefab、21View，37份Prefab/Scene共86处绑定；49JSON/20类型/Maven32不变。本机限定复验已完成，最终记录见[本批复验](validation/item-shard-review-20261114.json)，不能引用前批装备画面替代。

本批正文最终使用cc.RichText，统一由ItemDetailUtils.richText保留旧br/字面量`\n`换行与合法font颜色，再给普通库存、奖励和产物Face的richBody，不再仅剥标签显示；584条纯投影及文字等值专项通过，不新增配置清单。富文本追加已在新的item_rich_review独立环境复验900504的11行/10橙色项、900505的3行/2橙色项、553字长文首末、随机3星28/20及关闭/注销；准备版本4、08:47:24.375Z初始化5之后无新state.changed/warn/error。第一阶段完整UI矩阵与准备13/鉴权14记录仍独立保留，不声称富文本修正后全场景重跑，完整限制见同一[最终证据](validation/item-shard-review-20261114.json)。

## 先读什么

1. 根目录 AGENTS.md：目标、职责、中文注释、目录、分支及网络约束。
2. [当前进度](development-progress.md)：唯一当前状态、最新证据及验证限制。
3. [实施路线](restructuring-plan.md)：下一步顺序和完成条件；不按旧 P0–P10 状态继续开发。
4. [架构](architecture.md)与[战斗待复验问题](battle-known-issues.md)：按涉及职责查阅，不重复已完成链。

## 接手要保留的边界

- 新项目 G:/work/FsGame/Project/mxzg，旧项目 G:/work/FsGame/Demo/mj/program 为正常工作目录；旧源码/配置是主要规则依据，正式服用于可观察效果对照，G:/游爱/trunk 只参考阅读习惯。
- 当前实际挑战前三关；850 关仅产物说明，20 关是奖励规则投影。宝箱领取、快速战斗、升级和穿脱仍关闭，其他玩法逐模块恢复。
- IdleRewardUtils已串联各来源纯计算，活动控制初始化/发布/周期维护已接真实入口但默认关闭；新主线服务端领取/status事务已接入但默认关闭，客户端持久待确认和按钮仍未接。chapter.claim是挑战结算，不能当成宝箱领取。
- [新领取方案](main-chapter-idle-settlement.md)已整理。负责人确认的首次挑战前now-60起点及服务端60秒门槛已在V24/V25和新协议事务中实施；客户端65秒按钮、持久待确认和确认闭环尚未接入。2000002月兔精灵·蓝的[最小领域已实现](main-chapter-idle-settlement.md#精灵最小范围已实现)：V23独立实例、真实属性/技能、统一快照及背包实例key已接通；2000002的开发GM真实生成已授权补齐，领取、玩家养成穿脱和洗练合成仍关。
- WS＋Protobuf、服务端权威、持久幂等、Controller 提交唯一 Model 后通知 View 保持；账号与连接隔离归应用/平台层，页面只保护自身关闭与异步绘制生命周期。
- 布局归完整 Prefab、Widget 与统一缩放，列表用 SuperScroll；页面自行 @UIRegistry.view 定义，资源经 ResManager/原资源池。LoadingPlan 三段显式配置，其余按需，不新增模块资源清单。
- resources/module两层只是源目录分类，保留Bundle名及原UUID。effects等现有Bundle已纳入本批统一构建与限定运行，18个输出Bundle含引擎包，不等于新增18个业务模块；真实CDN及目标设备验证仍待后续。
- 此前已验收的主线表现不重复重做。本批393×852本机预览/独立H2已验精灵8实例8格、两只真实属性/技能详情、空白/确认关闭及返回主城，warn/error为空；392种全文组合检查通过，这是11-13通用详情的历史实测；11-14已接入精灵专用Prefab和原技能图，不等于98技能逐项画面。文档任务不另起测试服或构建，下一次集中发布按后续授权执行。只做竖屏，不安排专门拆RemakeApp。

## 从哪里改

下列源码路径相对 client/assets/scripts；完整职责和其余入口见架构，不在本页重复整个文件清单。

| 任务 | 直接入口 |
|---|---|
| 页面地址、模态、缓存、页面装配 | 对应 features/模块/ui/*View.ts 的 @UIRegistry.view；实际布局修改其 Prefab；配置不再由页面准备 |
| 静态配置加载与查询 | app/remake/LoadingPlan.ts声明启动表和整包阶段；config/RemakeConfigUtils.ts解码安装，GameConfig.ts唯一查询；tools/generate_config_package.cjs生成，不手改产物 |
| 加载阶段、资源下载与持有 | app/remake/LoadingPlan.ts、ApplicationResources.ts；framework/assets/ResManager.ts、ResourcePool.ts、PrefabLoader.ts |
| 账号、资产与换号 | app/remake/AssetStateBinding.ts；features/account/AccountService.ts；platform/GameSocketClient.ts |
| 背包 | features/bag/BagController.ts、BagModel.ts、ui/BagView.ts、ui/BagInfoView.ts、utils/ItemDetailUtils.ts；普通装备另看ui/EquipmentInfoView.ts、utils/EquipmentDetailUtils.ts |
| 英雄与布阵 | features/hero/HeroRosterController.ts、HeroRosterModel.ts、FormationController.ts；ui/HeroListView.ts、HeroInfoView.ts、FormationView.ts |
| 主线、挂机、结算与统计 | features/battle/MainChapterController.ts、MainChapterModel.ts；ui/MainChapterView.ts、BattleReplayPreview.ts、ChapterEndView.ts、BattleDetailLayer.ts |
| 挂机后续规则与事务 | backend 的 campaign/IdleRules.java、IdleBonusUtils.java、IdleRewardUtils.java；[输入契约](idle-reward-input-contract.md)、[累计与回执方案](main-chapter-idle-settlement.md) |
| 精灵实例及只读展示 | backend 的 spirit/SpiritRules.java、SpiritInventoryService.java、V23；客户端BagModel、BagItemCatalog.spiritFace及GConfig.SpiritDisplay；不新增写协议 |
| 协议与生成 | protocol/game.proto、tools/generate_game_protocol.cjs；禁止手改生成文件 |

资源迁移、三段配置与缓存边界见[资源维护](staged-resource-loading.md)，手写模块/通信样板见[背包维护](bag-mvc-maintenance.md)，全部文档按[索引](README.md)查阅。

## 本机与独立验证


- Creator3.8.8打开client/assets/scenes/Remake.scene，预览7456；旧H5包不代表当前源码。刷新后核对实际编译内容，再做浏览器验收。
- 日常后端使用scripts/start-remake-backend.bat或restart-remake-backend.bat，日常端口18080；验证使用独立环境，不能以历史数据库授权扩大范围。
- 独立预览由测试类SocketPreviewServer启动，回环随机端口、独立内存H2。读取client/temp/socket-preview.json并核对实例归属/存活；历史端口、PID、run均不可复用为当前事实。
- 预览参数格式：http://localhost:7456/?mxzgTestApi=http%3A%2F%2F127.0.0.1%3A端口&mxzgTestRun=实例run。测试账号通常chapter_review，按实例隔离；不要默认player_1或把夹具当正常获取玩法。
- 独立发布包使用统一client/build/remake-h5输出，18081先核验前端build与配置产物，再核验随机测试后端kind/run，参数仍为mxzgTestApi/mxzgTestRun。默认7460资源服务须另行启动，具体命令与Python入口区别见[本机工作流](local-remake-workflow.md)。本次历史61639及run不能复用为下一次存活事实。
- 预览Java类复制到唯一backend/target/idle-preview-*目录后启动，避免编译覆盖运行中的类。修改预览服务后核对新实例，不直接沿用旧进程。
- 后台启动隐藏窗口，停止前核对完整命令行归属。MySQL只按backend/test-mysql.ps1独立实例流程运行。

## 常用检查

前批[精灵证据](validation/spirit-instance-review-20261113.json)：真实13类88项Java、32项合并Python、真实WS事件/重连帧Java→TS互通通过；前端五套检查及Creator项目tsc通过。工具tsconfig与旧Creator编译器不兼容，未通过，不能合称全部类型检查通过。当批为16包、33份Prefab、163份脚本（18个独立View）；共享目录JSON48份、类型化17表、Maven共享32表，配置范围仍仅增加一份spirit-display派生展示；本批专用View及资源见[详情资源证据](validation/spirit-detail-assets-20261114.json)。

根目录设置MXZG_PYTHON为本机可用Python，再运行node client/tools/check-project.mjs；5组旧暂停检查不计入通过数。类型检查使用Creator引擎内typescript/lib/tsc.js --project client/tsconfig.json --noEmit；协议检查node tools/generate_game_protocol.cjs --check。

backend内设置JAVA_HOME为.tools/jdk-21.0.13.0.2+1并加入PATH，MAVEN_USER_HOME为.tools/maven-user，再执行./mvnw.cmd test。专项纯规则用-Dtest=IdleRulesBoundaryTest。真实互通先运行相关MainChapter测试导出战报，再运行node client/temp/project-checks/main-chapter.cjs --wire。

## 下一步

配置包、统一构建及现有范围的独立发布运行已收口，下一批优先补客户端领取持久journal和双向确认，先保持按钮关闭验证；持久意图、历史回执与最新快照分别确认，不能因发放领域已具备就开放领取。普通道具/碎片的此前长文、留白及注销记录保留，本批发布抽查1001001评分/攻击33、900102、950001、2000002攻击146/低级生机；英雄100级详情/170%技能、挂机对话、布阵、二三关结算与双方战报通过。灵器专页、图鉴、使用/分解等仍按后续授权恢复。同步/钱包及最小精灵领域不重复列为未开始。活动维护保持默认关闭，日常服须明确真实开服日期；V22不回填未知next，前批维护边界见[记录](validation/idle-activity-maintenance-review-20261113.json)与[人工配置说明](idle-activity-maintenance.md)。真实CDN、真机、弱网与完整经验动画边界仍待对应验证，不将本地发布结论扩为完整旧游戏验收；完成条件见[实施路线](restructuring-plan.md#接下来的执行顺序)。

历史过程保存在[11-13 收口快照](validation/development-history-20261113.md)及[更早主线记录](validation/main-chapter-history-20261109.md)。
