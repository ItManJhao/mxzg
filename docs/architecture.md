# mxzg 重做版架构与维护指南

决定日期：2026-10-29；客户端架构基线于 2026-10-30 按用户要求替换。首要标准是人能阅读、在编辑器中修改界面、追踪一次操作并独立排查错误。采用按功能组织的轻量 MVC 客户端和模块化单体后端，职责清晰优先于抽象数量。本文记录统一标准及实际边界：背包已按本批切换，其他模块尚未完成。

## 客户端统一采用模块级 MVC

2026-10-30 最新用户基线：模块使用完整名称和固定目录，不再使用 BagC/BagM/BagV 缩写，也不再让业务 Controller 按页面开关生命周期工作。本文旧的强制 Service/Presenter 分层以及上一轮模块私有 TypedEvents 方案已被替代。当前只落实背包样板，不代表全项目完成。

`features/Bag/` 包含 `BagController.ts`、`BagModel.ts`、`BagEvent.ts`；`ui/` 是 BagView、BagItemView、BagInfoView、BagTabView，`data/` 是 BagItemData、BagState、BagChangeSet、BagEventData。已有必要手写请求适配保留为 BagApi，配置查询保留为 BagItemCatalog，页面挂载辅助为 ui/BagMount；这些有实际用途，不是额外业务层或状态副本。底层 HTTP 仍在 platform/http，既有生成协议不搬入 Model。

- BagController 继承 BaseController，处理请求、回包校验、失败、查询代数、库存写入顺序与响应去重；先更新 Model，再派发事件。请求队列和奖励边界是背包职责，不上提基类。
- BagModel 继承 BaseModel，保存当前角色唯一库存与同步/错误状态，提供冻结的只读查询、全量和必要增量更新。它不引用 Controller、View 或网络 API 文件；校验在 data/BagItemData，API 和 Model 共用。
- BagView 继承现有 BaseView，打开先监听全局事件再立即读 Model；输入调用 Controller 的明确方法，更新后读 Model 展示，关闭只清理本页监听。BagItemView/BagInfoView/BagTabView 对应既有 Cell/详情/页签，没有新增空类。
- Prefab 保存固定结构、布局、尺寸、字体、图片与组件参数。V 只更新数据、选中态、动态列表和明确的适配/动画，不再创建一套替代 UI。

固定入口为 `BagController.instance` 和 `BagModel.instance`。无反射、泛型单例框架、自动模块扫描或多层 BaseObject 继承。新增功能仍按需求 → 协议 → 接口/类型 → Prefab → View 绑定 → 业务推进；现有手写 DTO 尚未自动生成，不提前标记生成器完成。

## 基类与监听归属

`framework/BaseModel.ts` 只维护 roleKey、version、reset(roleKey)、dispose() 和受保护的 incrementVersion；模块数据由子类持有，不放全局字典，也不强加监听能力。BagState 的 revision 来自该 version，不另存第二个版本计数。

`framework/BaseController.ts` 提供显式 initialize、重复初始化保护、resetSession、会话代次与 isCurrent、重复安全 dispose、自有 EventScope 和统一 emit。没有节点/页面引用、业务协议字段、自动联网或统一奖励队列。应用在 RemakeApp 明确提供 BagController.initialize({account, authorization, api})，注册账号观察者后才随有效角色同步数据；构造函数和第一次访问单例不联网。

`framework/EventScope.ts` 只收集解除函数并清理，清理异常记录拥有者并继续处理其余函数。BaseController 持有模块生命周期的 Scope，BaseView 持有当前开页期间的 Scope；runClose 的 finally 保证清理，不要求业务调用 super.onClose。清理某页或某模块不影响其他拥有者。

UIRegistry.createController 和 BaseView.attachController 的 show/close 契约仅留给尚未迁移模块的页面适配器；BagView 没有 createController，BagController 没有 show/close，不可作为窗口 Controller。类型检查与运行时入口都防止误绑定。UIManager/BaseView 继续统一页面加载、开关、返回、缓存、取消和释放，不建立第二套窗口框架。

## 单一全局事件与数据顺序

`framework/EventDispatcher.ts` 由原 TypedEvents 改造，整个背包只用 EventDispatcher.instance。提供 on/once/emit，订阅返回可重复安全调用的解除函数；once 在回调前退订，支持提前取消。没有模块私有派发器或全局 clear。事件名在 BagEvent，类型在 data/BagEventData，通过 TypeScript interface augmentation 接入 EventPayloads，框架无需反向导入业务。其他功能直接监听 BagEvent.BagUpdate，不访问 Controller 内部事件对象。

背包一次有效库存提交：Controller 校验会话/响应和顺序 → Model 校验整批数据、计算差异并一次性提交 → 返回只读 BagChangeSet → Controller 按 Add、Remove、QuantityChanged 聚合派发（只发有变化的类型）→ 最后一次 BagUpdate。加载/失败/恢复另用 BagSyncStateChanged；普通 BagView 只监听汇总事件刷新列表，状态事件只更新提示，不同时订阅全部细分事件。

事件常量为 BagEvent.BagUpdate / BagAdd / BagRemove / BagQuantityChanged，字符串统一 bag 命名空间。只有原本不存在的新条目才是 Add；仍存在的条目数量加减都归 QuantityChanged；删除保留原条目数据。Model 无事件派发，也不逐条提交。当前协议及 game_inventory 主键是角色内 itemId 聚合库存；没有假设英雄/装备实例永远按模板区分，协议扩展实例时必须同步调整身份与差异比较。准确参数、语义与业务方法见 [库存事件说明](bag-inventory-events.md)。

首次同步只发一个原因 initial-sync 的 BagUpdate，变化数组为空，不把初始快照当获得；会话 reset 清库后只发原因 session-reset 的汇总，不当消耗。已同步的相同库存无增删改或汇总事件，加载/恢复通过状态通知表达。查询有差异时原因 query；战斗领取明确传 reward；未明确来源默认 unknown，不推断正数就是奖励。

BagController 的通知保护持续到所有已排入全局派发器的本批回调完成，再执行回调中排队的下一次库存/状态更新。包括外层 batchNotifications 已在投递的情形，不只包住 emit 调用。全量/增量/会话清理均走同一个保护；applyDelta 返回 Promise<boolean>，调用方须 await，进行中写入结束后再应用，旧会话/重复标识返回 false。

BagModel 区分 idle、loading、ready（允许空）和 error；失败保留上次有效库存。返回条目、变化数组及数量变化对象冻结。BagUpdate 的 revision 与回调读取的当前 Model 版本一致；版本沿用 BaseModel，状态提交也推进版本，并非每次库存事件只加一。V 打开先监听再主动读 Model，事件不是历史仓库。单个监听异常由全局派发器记录，不阻断其他监听；不为展示事件能力新增效果。

全量 replaceAll 与带唯一响应标识的 applyDelta 分开；不按收到事件累加资产。旧会话读写、旧账号 401、同角色查询乱序、串行写入及重复响应保护保留。战斗领奖由 CampaignController.claim 把原 HTTP 请求交给 BagController.runInventoryUpdate(..., "reward")；校验后先在 batchNotifications 中提交账号/库存，再通知，页面关闭仍处理有效结果。奖励弹窗/演出沿用真实战报和领奖结果，不由 BagAdd 推断。批处理只延后通知，不提供回滚；服务器事务、鉴权、阵容 409、幂等和持久化不变。

## Prefab 与通用列表

本批保留 BackpackLayer/Cell 及移动脚本的 UUID、现有资源路径和按需加载，不把全部图标改成直接引用。SuperScroll/SuperContent 继续负责通用滚动/布局，不认识协议或奖励。SuperContent 计算范围与 Cell 根尺寸，原生 Layout 维护 Cell 位置，ScrollView 维护滚动位置；背包只提供条目和渲染回调。

缺少必要绑定必须指出 Prefab/节点/字段，不静默生成替代页面。本批未改人工 Prefab 配置。共享根/背景适配、动态页签排列及详情居中仍沿用旧辅助代码，具体控制范围见 [背包维护指南](bag-mvc-maintenance.md)，不宣称整页静态布局全部整改。列表 Inspector 步骤见 [SuperScroll 指南](super-scroll-authoring.md)，出阵指南仍见 [出阵页维护入口](formation-ui-authoring.md)。人工阅读和编辑体验由用户确认，自动化不代签。

## 当前入口与未迁移边界

当前开发入口为 Remake.scene。旧 Main/screenFill 的背包入口已退役并提示使用 Remake，不再条件切换 GameStore/WireSession 或接收新库存。旧 InventoryController、背包开关、BagC/BagM/BagV 缩写脚本及 TypedEvents 文件均已被替代，未留转发别名。

账号仍为 AccountModel/AccountService，英雄仍有 HeroRoster 的 Model/Controller/Service/Presentation，阵容仍为 FormationController，主线与挂机仍为 CampaignController/既有页面状态。本批只修改必要的账号通知和战斗领奖边界。Boot → Main 仍依赖旧登录、WireSession、GameStore、英雄和战斗等，隔离为历史对照入口；不把背包完成称为全项目统一完成。用户确认样板后再逐批迁移、验证、查引用清理，不保留两套长期标准。

## 后端决定

采用新的 Java/Spring Boot 模块化单体工程，按验证结果提取旧规则。新工程计划位于仓库 `backend/`；现有 `server/` 是外部目录联接，继续仅作对照，不在其中直接重建新后端。

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

新业务优先 HTTPS JSON `/api/v1` 接口，维护 OpenAPI 契约并生成客户端类型；服务端主动推送确有需要时使用 WSS。战报若测得体积与解析成本构成瓶颈，再选择二进制编码，不把旧 opcode 和字段号作为新接口。

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

本批先交付背包标准模块样板，等待用户检查代码阅读方式与 Prefab 修改体验，再扩大模块迁移。已有登录、主城和基础战斗保留；不在没有具体功能时增加基类、Manager 和空目录。

以下是尚未迁移的英雄历史实现，不是新架构标准：英雄列表采用已有 View 的数据源注入作为兼容接缝：HeroRosterController 在 UIManager 开页前注入 HeroRosterPresentation，展示读取独立 Model，Service 通过 AccountService 的会话能力访问新 API。旧 Boot 不注入时仍使用原路径；新增功能不继续写 GameStore/WireSession。列表和格子 Prefab 保持原 UUID，重做分支隐藏未接入的详情/养成入口。

会话根与玩法页分开管理：RemakeNavigation 保留主城根和共享顶底栏，玩法内容由统一 UIManager 创建、关闭和退订；退出会话时关闭玩法和根。HomeFeatureNavigation 只处理功能打开/取消/返回意图，LoginEntry 继续负责“资源就绪后停登录，点击开始才进主城”。

新后端已在 backend 建立首个开发登录与角色资料切片，包含 JDBC 持久化、Flyway 迁移和独立测试。开发及当前集成测试使用隔离 H2，MySQL 8.4、正式渠道身份与新客户端 MVC 接入尚待验证；旧服与原数据库未切换。实际运行方法见 backend/README.md。旧工程检查结果保留为现状记录，与新后端测试分开报告。
