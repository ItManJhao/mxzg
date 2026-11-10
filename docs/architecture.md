# 项目架构与职责

更新：2026-11-10。当前范围与进度见[开发进度](development-progress.md)，字段与时序见[通信契约](network-contract.md)。

## 不随技术重构改变的目标

因旧技术版本老、难以人工维护而现代化；旧玩法、内容、规则、数值、界面和表现以 1:1 还原为目标。内容主要依据 mxzg 旧源码/配置，正式服是效果参考；游爱只参考代码写法与阅读路径。独立新版，不要求旧客户端兼容或迁移旧玩家。

## 客户端统一采用模块级 MVC

Model 保存唯一状态，Controller 明确处理业务协议并更新 Model，View 展示和转交操作。背包作为标准模块；账号、角色、背包先完善，其他玩法入口暂停，后续按原项目逐模块重做，不能把暂停解释为删减功能。

- BagController：初始化时登记三个实际消息，onNotify → onInventoryState → BagModel → BagEvent，不持有凭证、查询接口或资产写队列。
- BagModel：唯一角色库存，整批校验、冻结快照、计算界面差异；不联网、不依赖 View。
- RoleController：onNotify → onRoleState → 账号 Model 中唯一角色资料，不处理登录签发。
- AccountService：登录、凭证保存、恢复与失效处理，不拥有第二份角色资产。
- AssetStateBinding：应用层身份/持久版本校验、完整角色与库存批量提交，不保存第二份库存。
- Protocol / ProtocolRouter：消息目录、模块登记与按真实消息定向交付，不保存资产或伪造模块消息。

旧 BagApi、BagUpdateCoordinator、bindBagSession 与游戏 HTTP 传输已删除。暂停模块的 PausedFeatures 仅拒绝旧调用，绝不执行请求/资产提交回调，后续恢复对应模块时移除。

## 基类与监听归属

BaseModel 管角色会话和本地界面版本；BaseController 管显式模块初始化和模块监听；连接与旧回包隔离归 GameSocketClient 及应用认证交付。BaseView 负责页面开关清理。关页不销毁业务模块，应用销毁才解除模块协议登记。事件监听按目标或 EventScope 清理，避免重复绑定。

## 单一全局事件与数据顺序

使用同一 EventDispatcher。应用先校验完整角色、库存、身份和持久版本，再在 batchNotifications 中提交角色、背包和英雄 Model，最后交付界面通知。订阅者不按事件 delta 再次改资产；BagAdd 只表示新增条目，不能推断奖励或获得提示。

服务器 game_role.state_revision 是资产提交版本，与 BagModel/基类本地 revision、连接 connectionId、单次请求 id 均不同。重复/较旧持久版本不提交，旧连接回调由连接代次隔离。非法整包不允许先改钱包；回滚不发送成功状态。

## Prefab 与通用列表

Prefab 保存静态结构、布局、样式和绑定；业务列表使用 SuperScroll + SuperContent，View 绑定数据，不手排 Cell 坐标。保留资源 meta UUID 与人工编辑，不用运行时代码造替代界面。存量其他窗口与原生 ScrollView 仍待分类整改，不宣称已全部统一。

## 当前入口与职责

RemakeApp 装配选服、登录、角色、主城、背包和资源作用域。AccountApi 只调用 WS 登录/恢复；角色/背包初始化在接纳账号的同批通知中交付。背包打开、切分类、同角色再次开始不查询库存。英雄只读列表/详情、阵容编辑、前三关挑战与结算及挂机演出已按后续授权接入；升级、穿脱、宝箱领取和快速战斗仍关闭。资源采用可配置三段加载，实际范围以进度页为准。

背包地址与页面属性定义在BagView/BagInfoView的@view，ApplicationPages只注入开页前置条件。LoadingPlan是三个阶段唯一人工资源配置入口；第三阶段只准备显式常用目标，其余按需，不维护模块预加载清单或全目录队列。ApplicationResources调度，ResourceAssets/ResourcePool共享缓存、请求和引用；Prefab绑定依赖不抄写清单。

目录：app 负责装配，features 负责功能 Model/Controller/View，framework 负责通用事件/页面/资源，platform 负责 WS/Protobuf/协议路由，config 负责生成配置。通用层不得反向依赖具体业务 UI。

## 后端决定

保留 Java 21、Spring Boot、显式 SQL/JDBC 与版本化迁移。数据库持久化是资产事实来源，内存在线表不保存资产；本机 H2 与独立 MySQL 验证分别记录。不能把技术栈更新解释为改玩法规则。

## 后端一条业务链只有清晰的几层

GameSocketHandler 验证信封、身份、请求阶段并调用服务；Service 组织事务和业务规则；Rules 表达旧规则；Repository 负责明确查询/锁/写入。钱包、库存修改显式接入 AssetSyncService，在同一资产事务内递增版本，提交后通知不决定发奖结果。

SessionSnapshotService 在数据库角色锁内读取完整钱包、背包和版本。AssetSyncService 在写入前要求事务，一事务同角色只递增一次；提交后 GameSocketHandler 读取已落库状态并发送 state.changed。失败不重做资产事务，断线通过新首包恢复。

## 接口与数据

全部游戏业务走 WS＋Protobuf，唯一契约 protocol/game.proto，子协议 mxzg.protobuf.v2。匿名 servers.list、开发 session.login、恢复 session.authenticate、心跳与顶号已接入。登录/恢复回包同时返回角色/库存/版本；没有 session.sync 或 inventory.list 处理，不保留业务 HTTP 回退。

资源下载、WS 的 HTTP 握手与测试上下文的实例身份探针不属于游戏业务 API。测试目标必须匹配独立实例标识和存储前缀，失败禁止回退日常服。

整数、安全范围、空列表/未同步/零/错误必须区分。关键写操作后续恢复时继续保留服务端权威、角色锁、持久幂等与事务，不能靠客户端排队/去重代替服务端正确性。当前同步采用带持久版本的完整快照；旧 5002 提示类型与完整角色字段仍待恢复。

## 旧服取舍与证据

旧版先登录确认，再由客户端请求角色和背包完成加载；后续通过 5002 主动同步增减。新版合并初始化请求，保留服务端变化同步语义。原客户端、服务端、协议路径见通信契约，下方保留最初只读架构核查，不能把当时 HTTP 基线当作当前实现。

## 人如何接手修改

先读[开发约定](development-conventions.md)、[背包模板](bag-mvc-maintenance.md#固定通信与状态模板)，再查 Protocol/.proto 与所属 onNotify、Model、View。中文文件头、属性和函数注释说明具体用途与生命周期；变更时同步更新，不用空注释或大段注释掩盖职责混乱。

## 落地边界

当前支持单进程本机会话与资产同步。正式渠道登录、多实例在线所有权/同步、生产 WSS、三端真机、完整字段/操作及正式服视觉验收尚未完成。暂停模块的领域服务和历史测试不代表玩家入口可用。实现和验收必须分开记录。

## 配置、资源与静态布局

配置以生成 GConfig 与 GameConfig 查询，资源通过统一目录与作用域管理；界面布局以 Prefab 和 SuperScroll Inspector 为准，不用字符串散落或运行时兜底掩盖缺资源。

## 原项目架构核查（2026-11-02）

本节为当时只读核查与差异快照，包含已退役的 HTTP 基线及当时建议；当前实现与优先级以本文前部、通信契约和进度为准。

以下核查记录保留当时源码快照与迁移建议；后续用户已指定先登录/背包模板、再英雄。最新实施结果和顺序以 [开发进度](development-progress.md) 与 [通信契约](network-contract.md) 为准，不把历史差距重复判定为当前未实现。

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
- 首个验证链现已采用 Protobuf 强类型信封和载荷；操作名、协议版本、传输 requestId、业务 operationId、错误码、会话代次、状态 revision 分开定义。命名/字段以契约阶段最终落定为准。Protobuf 编码迁移已落实登录与背包；不因此重做数据库事务、库存 MVC 或其他玩法。
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
