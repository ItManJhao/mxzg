# mxzg 重做版架构与维护指南

决定日期：2026-10-29；客户端架构基线于 2026-10-30 按用户要求替换。首要标准是人能阅读、在编辑器中修改界面、追踪一次操作并独立排查错误。采用按功能组织的轻量 MVC 客户端和模块化单体后端，职责清晰优先于抽象数量。本文记录统一标准；当前实现与未完成边界以开发进度为准。

## 不随技术重构改变的目标

旧项目版本老、难以人工维护是技术重做原因；玩法、内容、规则、数值、界面和表现均以 1:1 还原为目标。mxzg 原项目/配置是内容来源，正式服是效果基准；游爱只参考代码阅读方式，见 [开发约定](development-conventions.md)。技术结构、传输和存储可以变化，但不得擅自改变玩家可观察行为。当前基础普攻、一级升级和简化入口只表示分期实现，不能作为最终设计。

## 客户端统一采用模块级 MVC

2026-11-02 补充：用户要求所有模块以背包为样板，业务滚动列表统一采用 SuperScroll + SuperContent；固定布局与 Cell 资源在 Prefab 维护，View 仅 setData/绑定展示。此前文中的“其余模块保留适配器”是迁移现状，不是长期豁免。按实际职责分批改造，保留服务端权威、幂等和换号隔离；不为复制结构新增无用层级。

英雄名册迁移：HeroRosterModel.instance 继承 BaseModel，保存唯一只读名册和同步状态，不派发通知；HeroRosterController.instance 继承 BaseController，由 RemakeApp 显式 initialize，持有查询去重、角色/区服会话隔离和升级快照提交，应用销毁才 dispose。原 HeroRosterService 与页面 Controller 链已合并，不保留转发别名。HeroListView 挂载时 configureRoster，开页监听 HeroRosterEvent.Updated 并读取 Model，关页只清理本页监听；注册不再传 createController。普通升级继续经过 BagController 的资产事务，名册事件随全局事务通知延后。英雄列表随后专项改用 SuperScroll/SuperContent，固定布局和 Cell 资源保存在板子 Prefab，页面只 setData；具体参数与实际验收边界见 super-scroll-authoring.md 和 development-progress.md，不将组件迁移当作整个英雄界面正式服效果验收。

2026-10-30 最新用户基线：模块使用完整名称和固定目录，不再使用 BagC/BagM/BagV 缩写，也不再让业务 Controller 按页面开关生命周期工作。本文旧的强制 Service/Presenter 分层以及上一轮模块私有 TypedEvents 方案已被替代。Bag 是模块级 MVC 样板；其他功能保留必要服务与页面适配器，不强行增加同构层级。

`features/Bag/` 包含 `BagController.ts`、`BagModel.ts`、`BagEvent.ts`；`ui/` 是 BagView、BagItemView、BagInfoView、BagTabView，`data/` 是 BagItemData、BagState、BagChangeSet、BagEventData。已有必要手写请求适配保留为 BagApi，配置查询保留为 BagItemCatalog，页面挂载辅助为 ui/BagMount；这些有实际用途，不是额外业务层或状态副本。底层 HTTP 仍在 platform/http，既有生成协议不搬入 Model。

- BagController 继承 BaseController，处理请求、回包校验、失败、查询代数、库存写入顺序与响应去重；先更新 Model，再派发事件。请求队列和奖励边界是背包职责，不上提基类。
- BagModel 继承 BaseModel，保存当前角色唯一库存与同步/错误状态，提供冻结的只读查询、全量和必要增量更新。它不引用 Controller、View 或网络 API 文件；校验在 data/BagItemData，API 和 Model 共用。
- BagView 继承现有 BaseView，打开先监听全局事件再立即读 Model；输入调用 Controller 的明确方法，更新后读 Model 展示，关闭只清理本页监听。BagItemView/BagInfoView/BagTabView 对应既有 Cell/详情/页签，没有新增空类。
- Prefab 保存固定结构、布局、尺寸、字体、图片与组件参数。V 只更新数据、选中态、动态列表和明确的适配/动画，不再创建一套替代 UI。

固定入口为 `BagController.instance` 和 `BagModel.instance`。无反射、泛型单例框架、自动模块扫描或多层 BaseObject 继承。新增功能仍按需求 → 协议 → 接口/类型 → Prefab → View 绑定 → 业务推进；现有手写 DTO 尚未自动生成，不提前标记生成器完成。

## 基类与监听归属

`framework/BaseModel.ts` 只维护 roleKey、version、reset(roleKey)、dispose() 和受保护的 incrementVersion；模块数据由子类持有，不放全局字典，也不强加监听能力。BagState 的 revision 来自该 version，不另存第二个版本计数。

`framework/BaseController.ts` 提供显式 initialize、重复初始化保护、resetSession、会话代次与 isCurrent、重复安全 dispose、自有 EventScope 和统一 emit。没有节点/页面引用、业务协议字段、自动联网或统一奖励队列。应用在 RemakeApp 明确提供 BagController.initialize({account, authorization, api})，注册账号观察者后才随有效角色同步数据；构造函数和第一次访问单例不联网。

`framework/EventScope.ts` 只收集解除函数并清理，清理异常记录拥有者并继续处理其余函数。BaseController 持有模块生命周期的 Scope，BaseView 持有当前开页期间的 Scope；runClose、打开失败与销毁的 finally 保证按目标解除全局事件并清理其他订阅，不要求业务调用 super.onClose。清理某页或某模块不影响其他拥有者。

UIRegistry.createController 和 BaseView.attachController 的 show/close 契约用于应用提供的页面适配器，不代表模块生命周期；BagView 没有 createController，BagController 没有 show/close，不可作为窗口 Controller。类型检查与运行时入口都防止误绑定。UIManager/BaseView 继续统一页面加载、开关、返回、缓存、取消和释放，不建立第二套窗口框架。

## 单一全局事件与数据顺序

`framework/EventDispatcher.ts` 由原 TypedEvents 改造，整个背包只用 EventDispatcher.instance。提供 on/once/emit、off 和 offTarget。业务界面采用 `(事件, 目标, 原函数)`，按三元组去重、自动绑定 this；订阅仍可返回重复安全的解除函数供独立观察者使用；once 在回调前退订，支持提前取消。没有模块私有派发器或全局 clear。事件名在 BagEvent，类型在 data/BagEventData，通过 TypeScript interface augmentation 接入 EventPayloads，框架无需反向导入业务。其他功能直接监听 BagEvent.BagUpdate，不访问 Controller 内部事件对象。

背包一次有效库存提交：Controller 校验会话/响应和顺序 → Model 校验整批数据、计算差异并一次性提交 → 返回只读 BagChangeSet → Controller 按 Add、Remove、QuantityChanged 聚合派发（只发有变化的类型）→ 最后一次 BagUpdate。加载/失败/恢复另用 BagSyncStateChanged；普通 BagView 只监听汇总事件刷新列表，状态事件只更新提示，不同时订阅全部细分事件。

事件常量为 BagEvent.BagUpdate / BagAdd / BagRemove / BagQuantityChanged，字符串统一 bag 命名空间。只有原本不存在的新条目才是 Add；仍存在的条目数量加减都归 QuantityChanged；删除保留原条目数据。Model 无事件派发，也不逐条提交。当前协议及 game_inventory 主键是角色内 itemId 聚合库存；没有假设英雄/装备实例永远按模板区分，协议扩展实例时必须同步调整身份与差异比较。准确参数、语义与业务方法见 [库存事件说明](bag-inventory-events.md)。

首次同步只发一个原因 initial-sync 的 BagUpdate，变化数组为空，不把初始快照当获得；会话 reset 清库后只发原因 session-reset 的汇总，不当消耗。已同步的相同库存无增删改或汇总事件，加载/恢复通过状态通知表达。查询有差异时原因 query；战斗领取明确传 reward；未明确来源默认 unknown，不推断正数就是奖励。

BagController 的通知保护持续到所有已排入全局派发器的本批回调完成，再执行回调中排队的下一次库存/状态更新。包括外层 batchNotifications 已在投递的情形，不只包住 emit 调用。全量/增量/会话清理均走同一个保护；applyDelta 返回 Promise<boolean>，调用方须 await，进行中写入结束后再应用，旧会话/重复标识返回 false。

BagModel 区分 idle、loading、ready（允许空）和 error；失败保留上次有效库存。返回条目、变化数组及数量变化对象冻结。BagUpdate 的 revision 与回调读取的当前 Model 版本一致；版本沿用 BaseModel，状态提交也推进版本，并非每次库存事件只加一。V 打开先监听再主动读 Model，事件不是历史仓库。单个监听异常由全局派发器记录，不阻断其他监听；不为展示事件能力新增效果。

全量 replaceAll 与带唯一响应标识的 applyDelta 分开；不按收到事件累加资产。旧会话读写、旧账号 401、同角色查询乱序、串行写入及重复响应保护保留。战斗领奖由 CampaignController.claim 把原 HTTP 请求交给 BagController.runInventoryUpdate(..., "reward")；校验后先在 batchNotifications 中提交账号/库存，再通知，页面关闭仍处理有效结果。奖励弹窗/演出沿用真实战报和领奖结果，不由 BagAdd 推断。批处理只延后通知，不提供回滚；服务器事务、鉴权、阵容 409、幂等和持久化不变。

## Prefab 与通用列表

本批保留 BagView/Cell 及移动脚本的 UUID、现有资源路径和按需加载，不把全部图标改成直接引用。SuperScroll/SuperContent 继续负责通用滚动/布局，不认识协议或奖励。SuperContent 计算范围与 Cell 根尺寸，原生 Layout 维护 Cell 位置，ScrollView 维护滚动位置；背包只提供条目和渲染回调。

缺少必要绑定必须指出 Prefab/节点/字段，不静默生成替代页面。本批只同步背包 Prefab 的资源名与根节点名，保留人工布局与绑定。共享根/背景适配、动态页签排列及详情居中仍沿用旧辅助代码，具体控制范围见 [背包维护指南](bag-mvc-maintenance.md)，不宣称整页静态布局全部整改。列表 Inspector 步骤见 [SuperScroll 指南](super-scroll-authoring.md)，出阵指南仍见 [出阵页维护入口](formation-ui-authoring.md)。人工阅读和编辑体验由用户确认，自动化不代签。

## 当前入口与职责

唯一启动入口为 Remake.scene / app/remake/RemakeApp。module、旧 net、Boot/Main、GameStore/WireSession 和旧 Mock 业务均已删除。共享显示代码已按职责提取到 framework 和功能 UI，没有整体搬迁旧目录。历史清理证据见 validation；当前边界由统一检查中的 architecture/retirement 验证。

应用持有唯一账号、英雄名册和背包模块。HeroRosterController/HeroRosterModel 与 BagController/BagModel 均独立于窗口，应用显式初始化和销毁；页面只清理自己的监听。FormationController 管理出阵编辑草稿与服务端 expectedVersion，CampaignController 处理当前挑战/领奖工作流，不新增平行资产状态。

普通挂机由应用持有 IdleController，保留本会话未确认的领取请求；CampaignController 只保存页面计时快照和显示流程。IdleApi 校验服务器时间和收据，资产通过同一个 BagController.runInventoryUpdate 提交。页面关闭不取消已经提交的领取，切换账号清理旧请求；本地计时只驱动显示，不决定奖励。后端 IdleService 在角色锁内事务保存资产、计时、保底和随机收据，查询不抽奖。

通用 PrefabLoader 只加载资源，资源 UUID 登记在 config/PrefabCatalog；PrefabLayout 和 ParchmentLayout 只适配现有界面。战斗显示只消费新接口战报和单位，不回退本地 Mock 或旧协议。

## 后端决定

采用新的 Java/Spring Boot 模块化单体工程，按验证结果提取旧规则。新工程已位于仓库 `backend/`；本工程不再使用旧 `server/` 目录联接，旧项目在仓库外独立参考。

首期一个游戏应用加 MySQL，由功能模块划分账号、角色、英雄、物品、战斗、主线/挂机、邮件和订单。定时任务先在应用内执行，并具备持久状态与幂等。跨服、独立战斗进程和消息中间件等在功能、容量与隔离需求明确后再拆。

初始技术基线：Java 21、Spring Boot 4.1 维护分支、MySQL 8.4 LTS、Maven Wrapper。具体补丁版本在新工程建立时锁定并验证，现有机器的 Java 8/MySQL 环境不在本轮升级。首期使用 Spring JDBC 和显式 SQL，数据库变更采用版本化迁移；Redis 仅在会话共享、缓存或限流需要时引入，不作为核心资产的唯一持久存储。

选择 Java 是为了可读的业务实现和旧规则的提取成本，不代表继续引入旧版 Spring、Netty、Akka、自建命令总线和自建持久化框架。新应用不直接依赖整套旧 common/agent JAR。

官方依据：[Spring Boot 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)目前列出的 4.1.2 支持 Java 21；[MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/faqs-general.html)属于 LTS 系列。按业务模块而非立即拆进程的组织方式参考 [Spring 模块化应用说明](https://docs.spring.io/spring-modulith/reference/fundamentals.html)，不因此默认引入所有相关扩展。

## 后端一条业务链只有清晰的几层

- Controller：鉴权后的身份、参数验证、调用用例和映射响应；不计算奖励或直接写数据库。
- Service：组织一次业务操作、事务和跨模块协作。
- Rules：需要独立表达的战斗、掉落和养成规则，尽量无框架依赖；简单功能不强制再建一层。
- Repository：明确的查询、锁和持久化，不触发隐藏业务副作用。

例如升级英雄从 `hero/HeroController` 到 `HeroService`，读取规则、验证条件、在事务中扣除消耗与更新英雄，再返回新状态。角色身份来自服务端会话，不信任客户端传入的角色所属关系。

首期按功能包组织，保留单一启动入口。模块间通过明确 Service API 协作，不直接操作彼此的数据表和内部 Repository；需要跨模块扣费和发奖时由同一事务内的用例协调，不把一致性寄托在异步事件上。

## 接口与数据

当前实现是 HTTP JSON `/api/v1`，并非完整通信目标；OpenAPI 与客户端类型生成也尚未完成。2026-11-02 核查后，长连接、主动推送、在线会话与恢复同步被列为必须补齐的基础能力。建议新游戏业务逐批迁入统一 WSS 通道，平台登录/公告/资源与运维保留适当的 HTTPS 接口；具体迁移契约须先完成下方核查出口，不把建议当成已实现。独立新版不要求旧 opcode/字段号兼容；先采用可生成类型和校验的明确消息契约，首个验证链建议 JSON，二进制选型独立依据战报/聊天负载与三端测量。

返回数据明确区分未同步、空集合、零和错误。请求具有可追踪标识；关键写操作有业务幂等键，重复请求返回同一操作结果。超过 JavaScript 安全整数范围的 id 用字符串跨端传输，货币采用整数最小单位，服务端统一定义时间口径。

同一角色的并发写入通过数据库事务及明确的锁/版本规则控制。扣费、发奖、关卡推进和订单发货必须原子或具有可恢复的持久状态。支付回调经服务端验证且订单唯一约束防重复发货，通知在提交后执行；失败要可查询和重试。

战斗由服务端权威结算，客户端负责交互和表现。战斗运算使用有界执行资源，避免无界计算阻塞登录与资料请求。挂机以服务端时间和持久记录计算，恢复后不能重复领取。

数据库建表与变更写入版本化迁移。配置、账号与业务数据分开；生产数据修改具有审计与恢复办法。首期先在独立开发数据上验证新结构，不将现有数据库直接改为新模型。

## 旧服取舍与证据

旧仓库 POM 声明 Java 8、Spring Boot 2.1.9、Protobuf 2.6.1，common 还声明 Akka 2.3.3；父工程有 gameserver、center、cross 等多个模块，构建声明旧内网 Maven 仓库且默认跳过测试。这些是源码中的配置事实，未核定实际运行依赖或进行漏洞结论。

旧业务已经存在 HeroHandler、HeroService、HeroDao 及独立 battle 模块，但 HeroService 依赖多个高级养成系统与命令/事件基础设施，battle 依赖旧 common、config 和 protocol。因此复用规则需要提取和对照验证，不能假设复制一段代码或引用 battle JAR 即可独立运行。

优先提取经新策划确认的战斗公式、技能/状态规则、掉落和养成计算及数值配置；旧登录、网络接入、全局分发、持久化、构建与部署重新建立。确需过渡使用旧服时加适配器，客户端仍依赖新接口；旧服不得凭同一请求号或客户端超时而盲目重试扣费。

以固定输入、规则版本和可控随机源建立对照；无法控制旧随机源时先建立规则不变量与可观察用例，不宣称输出完全一致。玩法有意改变时更新新规则与验收。新实现通过核心操作与持久化验证后才切换入口，再删除不再使用的旧路径。

## 人如何接手修改

- 排版、图片、按钮、列表参数：对应 Prefab 与 Cell Prefab。
- 客户端协议处理和业务动作：功能 Controller；HTTP 路径在该功能 API，共用数据校验在 data。
- 当前数据与查询规则：功能 Model；展示/点击/分类和详情在 View。
- 开关、返回、释放：UIManager、BaseView；角色会话装配在 RemakeApp。
- 服务端操作：原有 Controller、Service、Rules、Repository 与迁移 SQL，本次未更换后端分层。

以实际文件和方法追踪一次查询/一次领奖，不以凑齐目录和文件数作为完成标准。背包文件表、调用链、退役边界、运行证据与用户待验收项见 [维护指南](bag-mvc-maintenance.md)。

## 落地边界

资源底座第一批已接入 `framework/assets/ResourcePool.ts` 与 `app/remake/StartupResources.ts`。前者只处理请求去重、作用域持有、失败重试及关闭后拒绝迟到结果；后者登记四项启动资源并适配 Creator，RemakeApp 持有作用域并在销毁时关闭。新资源先登记用途与生命周期，页面布局仍由 Prefab 维护。

当前退出作用域只撤销自身 addRef，并以 decRef(false) 保留引擎缓存；旧页面尚未全部迁移，不主动释放共享纹理/Spine。Bundle 归属、配置按需加载、主动淘汰及内存预算对应主计划 P2-04–P2-09，不能因 ResourcePool 存在就视为全部完成。后续进度以 restructuring-plan.md 与 development-progress.md 顶部快照为准。

当前已移除 module 和旧启动/网络/业务入口。英雄列表必须注入当前角色名册，不存在未注入时的旧路径；名册由应用会话持有，HeroListView 只负责展示观察。背包、主城与战斗保持既有 Prefab 和新接口，模块生命周期与窗口生命周期分开。

检查结果仅在开发进度和历史证据中记录，不在架构文档滚动复制测试次数。独立 MySQL 与普通挂机已具备历史验证，正式身份、三端、完整养成/战斗/社交和生产能力仍有缺口；具体完成边界见 [开发进度](development-progress.md)。

## 配置、资源与静态布局

配置唯一仓库为 GameConfig，GConfig/运行时校验来自显式规范，禁止恢复 ConfigDb 或全量首屏加载。资源入口由 meta 生成 ResourceCatalog/独立 IconCatalog，加载复用 ResourcePool。Prefab 与实际界面类同名，布局源文件优先，通用适配不再运行时修复静态锚点或文字位置。使用方法见 [配置与资源](config-pipeline.md)、[Prefab 维护](prefab-layout.md)。


## 普通升级状态归属（2026-11-02）

HeroLevelController 由 RemakeApp 会话持有，只保存待确认逻辑请求和在途状态；HeroRosterController/HeroRosterModel 维护唯一英雄名册，AccountModel 是钱包，BagModel 是库存。升级经原 Bag 串行资产协调提交关联快照，全部状态就绪后统一通知，页面关闭不取消资产结果，换号拒绝迟到回包。HeroInfoUpLevelLayer 只保存当前页的条件预览，不增加一套持久英雄/库存缓存。服务端 HeroGrowthRules 统一预览与战斗四属性，V4 保存幂等收据；详细规则和接口见英雄契约。

## 原项目架构核查（2026-11-02）

### 结论与适用范围

用户确认完整重做原游戏，分批恢复玩法与社交；独立新版，不要求旧客户端连接或迁移旧玩家。因此保留玩法/规则/交互语义，允许重新定义协议和数据结构。现有 HTTP 闭环可以作为迁移基线，不能作为完整游戏通信验收。此前把社交/推送当作将来可选项、未明确在线会话/重连/公会共享状态，是前期架构覆盖不足。

本次只读源码，未运行旧服务、抓取正式服业务流量或操作任何数据库。旧服支持哪些入口与正式服当前部署哪条入口是不同事实；下面证明源码能力，不推断 mxzg-test.funsgamex.com 的网关部署。G:/游爱/trunk 是另一个参考项目，其 Sproto 不能作为 mxzg 的协议结论。

### 可复核的原项目证据

版本、80 个旧服一级模块和当前 16 个 HTTP 操作的完整枚举见 [源码核查索引](validation/architecture-source-index-20261102.json)。它是此次只读快照，不是已完成的逐玩法规则清单。

原仓库根：`G:/work/FsGame/Demo/mj/program`。目录是 Git 裸仓库，不能按普通工作树打开文件。固定版本：

| 代号 | 裸仓库相对路径 | 本次读取提交 |
|---|---|---|
| C | client/cocos_mxzg.git | 6276cbe47b939ce161aaefaa93bb6f83a0a253af |
| S | server/mxzg-server.git | 672293145b4da0f87b87bad9826432e04d6402c0 |
| N | server/mxzg-common.git | 8cc02a32cea66df6296eb89b4d2d1b1715e507e7 |
| P | mxzg-protofiles.git | cb410068f579dad2d97e08b45ac008387f946bed |

S 下 `mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/` 简写为 `GS/`；N 下 `src/main/java/com/ayjs/mxzg/common/` 简写为 `COMMON/`。以下行号属于上述提交，不是生成文件或在线站点：

| 证据 | 路径/入口 | 核实内容 |
|---|---|---|
| 原生网络 | C: client/idle/frameworks/runtime-src/Classes/Net/SocketClient.cpp，connect（76 行起） | SOCK_STREAM、connect/send/recv；原生业务是 TCP |
| 原生消息 | C: client/idle/src/autorun/NetManager.lua:91 | sendMessage 写协议编号、序列化消息，交 C++ sendByteArray |
| 平台接口 | C: client/idle/src/net/PlatformApi.lua:47 | luaSendGet/luaSendPost 走平台 HTTP，不等于全部游戏业务走 HTTP |
| 服务启动 | S: GS/infrastructure/netty/SocketServerLifecycle.java:45 | 启动 TCP；配置 WebSocket 端口时额外启用 WS，可配置 TLS，共用 NettyHandler |
| 实际 WS 管线 | N: COMMON/netty/websocket/WebSocketServerInitializer.java:34 | HTTP Upgrade、空闲检测、WebSocketCodec、下游业务 Handler；不是仅凭 WebSocketHttpHandler 文件名推断 |
| 消息编码 | N: COMMON/netty/websocket/WebSocketCodec.java:21 | BinaryWebSocketFrame：4 字节长度 + 4 字节协议号 + Protobuf 包体 |
| 收包分发 | S: GS/infrastructure/netty/PlayerActor.java:38 | 协议号查 HandlerExecutor、登录/开放条件校验、Protobuf parseFrom，再执行处理器 |
| 在线上下文 | S: GS/infrastructure/netty/PlayerContext.java / ContextManager.java | 上下文创建 Akka typed actor 串行处理；在线角色查找、定向/群体广播、离线处理 |
| 登录 | S: GS/module/role/handler/LoginHandler.java:81 | 1001 登录、旧连接下线通知、注册在线角色；1004 心跳/时间同步 |
| 英雄升级 | S: GS/module/hero/handler/HeroHandler.java:365 | 4018 校验拥有权、升级级数与上限，消耗资源并返回等级；支持配置范围内多级，新版当前只做一级 |
| 聊天 | S: GS/module/chat/handler/ChatHandler.java:73 | 6001 发送；频道、等级、禁言和频率条件；6003/6007 历史、6009 未读 |
| 公会聊天 | S: GS/module/chat/executor/ClanSendExecutor.java:71 | 服务端确定公会，按成员/黑名单向在线上下文发送 6001；内存维护最多 100 条记录，不代表可靠离线消息存储 |
| 公会状态 | S: GS/module/clan/service/ClanService.java:569 | 成员集合 writeSome 广播；申请列表向有管理权限成员推送；ClanHandler 有创建/申请/审批/退出/职务/捐献 |
| 主线 | S: GS/module/battle/handler/BattleHandler.java:253 | 3001 校验关卡和条件、服务端 invokePVEBattle、返回 report；3002 领奖、3005 普通挂机领取 |
| 客户端更新 | C: client/idle/src/net/ChatResponse.lua、ClanResponse.lua | 更新聊天/未读/公会数据，再发事件或重新拉取公会快照 |
| 协议源 | P: protofiles/game/{Login,Hero,Chat,Clan,Battle,BackPack}.proto | 旧协议源可作为规则和字段核对材料，不直接假设与每一份生成文件完全一致 |

复核示例（PowerShell，只读）：

```powershell
git --git-dir='G:/work/FsGame/Demo/mj/program/server/mxzg-server.git' show '672293145b4da0f87b87bad9826432e04d6402c0:mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/infrastructure/netty/SocketServerLifecycle.java'
```

旧服 POM 的 Spring Boot 2.1.9 / Protobuf 2.6.1、gameserver/center/cross/large-cross 模块和 common 的 Akka 是源码构建事实，不代表本次已验证线上依赖、吞吐或安全状态。HeroDao 继承旧 BaseRepository；单线程 actor 不等于已证明跨实体资产事务和宕机恢复，不能照搬其一致性假设。

### 当前实现的差距与保留判断

| 能力 | 当前新项目 | 处理结论 |
|---|---|---|
| 请求入口 | JsonClient/XhrAdapter，后端 9 组路由、16 个 GET/POST/PUT 操作 | 暂保留可运行基线；建议逐批迁入统一游戏消息入口 |
| 会话 | SessionService 签发一小时令牌、保存哈希、每次请求鉴权 | 可复用身份验证基础；缺在线连接绑定、撤销/顶号、重连认证和会话恢复 |
| 状态 | Bag 和英雄名册已有唯一 Model、全局通知、旧响应隔离 | 保留；新增推送必须进入同一个 Controller/Model |
| 资产 | 升级/挂机/领奖有事务、锁及持久操作记录；阵容有版本校验 | 保留并重验；业务 requestId 与传输请求序号分离，不能迁移后丢掉重复保护 |
| 业务与传输耦合 | Service 接受 Bearer 字符串，抛 ResponseStatusException | 并非完全独立于 HTTP；迁移时统一身份上下文/业务错误映射，避免 WS 分发再复制一套规则 |
| 主动消息 | 无游戏推送通道，无聊天/公会服务 | 必须补齐，不再作为可选技术增强 |
| 并发 | 单角色写操作使用数据库行锁/版本 | 不能直接推导公会多成员操作安全；需共享实体版本/锁、固定锁顺序和事务后通知 |
| 战斗 | 基础普攻、前 20 关；服务器生成战报 | 结算模式可保留；完整技能、状态、成长与开放条件恢复是独立任务，不能靠换传输解决 |
| 调度/跨服 | 当前没有完整活动调度、跨服服务和社交路由 | 建立可恢复调度、区服/公会域、广播边界；先模块化，不因旧仓库多进程就立即拆服务 |
| 类型契约 | 当前 DTO/运行时校验手写 | 在新消息契约中落实生成和漂移检查；不能继续写成已完成的 OpenAPI 能力 |
| 平台与容量 | Creator 本机验证为主；无完整三端长连接/负载证据 | H5、App、小游戏适配分别验收；单体容量、编码成本和网关部署均不得凭框架名称承诺 |

Java 21 / Spring Boot / JDBC / Flyway 不因需要 WebSocket 就必须推倒。Spring 本身支持 WebSocket Handler；原始 WebSocket 会话并发发送需要序列化与限界处理，不能多线程随意 write。参考 [Spring 官方 API 说明](https://docs.spring.io/spring-framework/reference/web/websocket/server.html)。本次建议保留技术底座，是基于已有业务可复用和可渐进验证，不是已完成生产选型压测。

### 推荐调整方案（待实施，不是完成状态）

- 游戏会话内的请求、回包、推送走同一 WSS 通道；平台身份交换、公告/资源下载、支付回调及管理接口按职责保留 HTTPS。不恢复开发 PowerShell 桥，不为长连接立即引入第二个框架或独立网关集群。
- 首个验证链使用明确的 JSON 消息模型与可生成的类型/校验；操作名、协议版本、传输 requestId、业务 operationId、错误码、会话代次、状态 revision 分开定义。命名/字段以契约阶段最终落定为准。Protobuf 可后续单独评估，不能把编码选型和传输迁移混成一次大重写。
- 连接状态明确为未连接、连接中、鉴权中、同步中、可操作、重连等待、退出/被踢。鉴权完成前不接收游戏写操作；重连只有恢复快照后才重新允许操作。顶号或令牌撤销不能触发无限自动重连争抢。
- 浏览器连接鉴权不能假设可设置任意 Authorization 握手头；选择短期一次性票据或连接建立后的限时鉴权消息，并限制未鉴权连接数量/时间，禁止把长期令牌放 URL/日志。具体方式在三端适配小样确定。
- 读取可以重新查询；提交结果不明的写操作沿用原业务幂等键确认，不自动补发新的操作。原阵容 expectedVersion、升级收据、挂机随机结果和战报领奖身份必须保持。
- 区分可补拉的状态通知与需要历史记录的消息。重连先取权威快照/游标，按 revision 丢弃重复/迟到更新；聊天使用有界历史和消息标识。需要保证投递的关键业务采用事务内持久事件/可查询状态与事务后发送，禁止在数据库未提交时对外宣布成功；不承诺仅靠内存队列零丢失。
- 有界输入/输出队列、消息大小/频率、待回包数量、发送超时、心跳和重连退避必须定义。慢连接不拖住所有玩家；长计算与数据库访问不能无限占用收包线程。指标包含连接数、队列、错误、操作耗时和恢复失败，不记录敏感令牌。

### 实施顺序与出口

1. **契约与身份设计**：盘点当前 16 个操作，定义请求/响应/推送和错误、幂等、状态版本；确定生成方式及平台适配。补登录、踢线、重连、权限变更时序，明确消息恢复策略。此阶段不删除 HTTP 入口。
2. **英雄升级小链路**：新通道调用现有升级事务与 Bag 状态入口；覆盖正常升级、提交前/后断线、重复请求/响应、回包迟到、换号/换服、服务器重启、两端顶号。确认金币/经验/等级/收据一致，不仅测试能收到一条消息。
3. **其他核心业务迁移**：名册/背包/阵容/主线/挂机逐项迁移。短期双入口只能共用同一用例与幂等记录，客户端每项写操作只能选一个入口；通过对应恢复测试后删除被替代的业务入口和兼容配置。
4. **社交闭环**：两名测试玩家验证世界/私聊/公会消息、申请审批与权限变更、退会后的订阅隔离、断线历史补拉和未读；其他玩家不需要刷新页面就看到有效变化。
5. **三端与生产验收**：实际 H5/App/小游戏网络切换、后台恢复、协议/资源版本切换、连接压力/慢客户端、维护停服和恢复。构建仍按用户届时授权执行；没有设备/部署证据的项目保持未完成。

协议不兼容和旧玩家迁移已由用户明确排除为当前要求，不再反复询问。仍待相应阶段确认：首发平台顺序/渠道、预期同时在线与广播规模、聊天保留期与跨服分组。此前不据未知规模承诺单体容量，也不为等待这些数字停止可独立完成的契约和小链路设计。
