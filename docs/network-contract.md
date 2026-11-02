# 首批长连接契约与接入顺序

更新：2026-11-02。状态：服务端会话及客户端登录/背包查询试点已接通，默认关闭；其他玩法仍走 HTTP。隔离联调及登录/背包/顶号真实页面已复验，不代表全量迁移、三端或正式服 1:1 验收完成。原项目通信证据见 [架构核查](architecture.md#原项目架构核查2026-11-02)。本文定义新版技术契约，不改变旧游戏规则。

## 首批范围

用户已调整优先级：长连接基础 → 登录与重连 → 背包作为标准模块 → 英雄等其他模块。采用 JSON 文本消息；首批只接会话与背包查询，不接英雄升级写操作，不兼容旧 TCP/Protobuf 客户端。正式渠道身份认证另行接入，本机仍用开发登录换取访问令牌。HTTP 保留选服、身份交换与非游戏业务，其他已有接口在逐项验收后迁移，不一次删除。

试点入口 `/api/v1/game/socket`，仅 `local & !production` 且 `mxzg.websocket.enabled=true` 时注册；默认没有该端点。当前验证使用随机端口和独立内存 H2。不要直接在日常玩家实例开启试点做顶号测试：接管会撤销同角色其他令牌，影响 HTTP 和 WS 两条链路。正式 WSS/TLS、正式来源与三端适配尚未验收。

独立预览运行 [start-socket-preview.ps1](../scripts/start-socket-preview.ps1)：先跑真实 TS 客户端联调，再启动强制内存 H2 的测试宿主，输出带随机端口和实例标识的 Creator 地址。Creator 需已导入最新脚本；访问输出的完整地址才启用 `mxzgSocket=1`，核对实例身份并隔离浏览器存储。仅传开关、身份不匹配或指向保留端口均停止连接，不回退日常后端。场景中的 `useGameSocket` 默认 false，此批没有改场景默认值。关闭测试进程后测试数据消失；测试宿主不进入后端正式包。

DTO 唯一字段定义在 [session-contract.json](../protocol/session-contract.json)，生成命令为 `node tools/generate_session_contract.cjs`；`--check` 检查生成漂移。当前覆盖鉴权请求、鉴权确认、心跳响应、英雄升级请求，尚未覆盖统一信封、升级结果、快照和推送。生成类型不等于入站校验；接入前必须验证字符串长度、UUID、整数范围、必填字段及方向。

## 消息信封（服务端试点已实现）

统一字段：`version: 1`、`kind: request | response | event`、`name`、`body`。请求和响应额外有 `id`（一次传输的 UUID）；响应必须回显请求 id 和 name，并带 `ok`。失败响应 `ok:false`、`body:null`、`error:{code,message,retryable}`；成功响应无 error。鉴权前不接受业务消息。

鉴权成功后所有消息额外携带服务端分配的 `connectionId`；客户端拒绝旧连接回包。客户端还维护本地登录代次，用于丢弃账号切换前启动的任务。id 只关联一次网络往返，不能用于替代业务幂等键。

`hero.level.upgrade` 的 body 使用 `HeroLevelCommand`。其中 `requestId` 是现有持久化业务幂等键，保持旧服务参数名称，避免迁移时混淆。断线恢复可以换信封 id，不能换 body.requestId、heroId 或 expectedLevel。成功结果复用现有 receipt + preview + heroes + role + inventory 语义；重复请求允许返回原收据与最新完整资产快照。

| 消息 | 方向 | 作用与准入 |
|---|---|---|
| session.authenticate | 请求/响应 | 建连后唯一允许的首个业务请求；令牌在 body，禁止放 URL 或日志 |
| session.sync | 请求/响应 | 鉴权后恢复角色、英雄、背包；返回一致快照，完成前禁用资产写入 |
| session.heartbeat | 请求/响应 | 已鉴权连接保活，响应含服务端毫秒时间 |
| session.kicked | 服务端事件 | 两端已实现：撤销旧会话、清理模块、回登录并停止重连；管理员入口待实现 |
| inventory.list | 请求/响应 | 两端已实现；sync 完成后由 BagController 查询并校验完整背包，body 为 `{}` |
| hero.level.preview | 请求/响应 | 预留，当前会返回 UNKNOWN_MESSAGE；背包模板验收后再接入 |
| hero.level.upgrade | 请求/响应 | 预留，当前会返回 UNKNOWN_MESSAGE；后续复用原事务服务 |

错误码须区分 `UNAUTHENTICATED`、`SESSION_REPLACED`、`NOT_READY`、`INVALID_MESSAGE`、`UNSUPPORTED_VERSION`、`RATE_LIMITED`、`INTERNAL_ERROR` 和现有业务失败原因。不能把所有 HTTP 409 都翻译成同一个失败；网络超时也不能伪装成业务拒绝。`retryable` 仅表示允许恢复后重试，不授权客户端生成新的扣费请求。

## 登录与重连时序

1. HTTP 身份交换取得令牌 → 建立 WSS → 发送 authenticate。正式环境使用加密连接；仅本机开发允许 ws。
2. 服务端验证令牌有效期和角色归属，原子登记当前连接。返回 connectionId 后进入 syncing。已实现：角色锁内再次校验并删除其他令牌，旧令牌不能自动重连顶掉新登录；同一个有效令牌允许普通重连替换残留连接。clientInstanceId 只做格式校验，暂不作为设备身份或防令牌复制机制。
3. 客户端请求 sync，服务端在一致读边界中返回角色、英雄、背包完整快照。当前实现先校验完整快照及角色归属，再开放传输；握手快照不直接写 Model。登录由 AccountApi 再读角色，背包由原 BagController 查询；重连查询需等待其在途库存写操作结束，读代次屏蔽旧结果，钱包沿用 profileRevision 防止迟到读取覆盖消费。其他 HTTP 业务也先检查传输就绪，不在断线时排队发送。后续扩展阵容/战斗/挂机时需扩展恢复范围，不以这三个模块冒充全量恢复。
4. 断线立即禁用写按钮，保留当前业务未决请求。带随机抖动退避重连（初始建议 1/2/4/8 秒，最高 15 秒），重新鉴权、同步。未过期令牌可复用；过期回登录。登出、切服、顶号立即取消重连。
5. 对未决升级，使用同一业务键查询结果（首批可重发原升级命令，现有幂等收据提供结果），确认后更新快照。读请求可以重新发起；其他写请求不能通用自动重放。即使最新等级高于原收据的 toLevel，也不能据此判失败或再扣费。

同一角色的连接替换与资产写入需定义串行边界：替换前已进入事务的请求可能成功；替换后的旧连接请求必须拒绝。新连接同步要包含已提交变更，仍未确定的操作依靠持久收据核实，不能仅靠关闭 socket 保证事务被取消。多实例部署前必须替换进程内在线表为可协调的会话所有权机制。

## 消息顺序、资源与安全边界

- 首批不引入资产增量推送；完整快照与升级响应通过角色级串行调度保持提交/发送顺序，同一连接发送也必须串行。后续加入多来源推送时先实现持久版本/事件游标，不能把 connectionId 当资产版本。
- 原数据库事务、角色锁、持久幂等收据保留。网络层不得提前派发成功；仅在提交成功后响应。不能创建另一套升级业务或同时用 HTTP/WSS 发起同一次写操作。
- 客户端保持 Bag 更新协调器、英雄名册读失效、Account 登录代次与模块事件。关闭页面不丢失在途资产操作；同一请求迟到/重复结果不能重复提示或覆盖较新状态。
- 服务端已实现：首帧鉴权 5 秒、60 秒无有效请求断开；单帧上限 64 KiB、发送缓冲上限 256 KiB、总连接 128、每连接每秒最多 32 次请求；每连接即时串行处理，不建立请求任务队列；角色调度繁忙返回 BUSY。客户端已实现请求超时 15 秒、心跳 20 秒、最多 16 个未完成请求、带抖动且最高 15 秒的退避重连；只重建鉴权/同步，不重放业务。这些是试点保护值，不是旧玩法规则或容量结论。后续全量快照超过限制时应分页/分片，不静默丢数据。
- 超限明确拒绝或关闭慢连接；禁止无限队列。鉴权前更严格限流，限制来源与连接数；令牌、聊天正文和玩家私密数据不写原始包日志。
- JSON 整数限制在 JavaScript 安全整数范围；Java long 不代表前端可接受任意 64 位数。接入层按业务约束验证正整数、时间和金额，禁止 NaN/无穷/小数等级。

服务端入站校验已拒绝重复 JSON 字段、过深嵌套、超长字符串、未知字段和非法标识。客户端关联 id/name/connectionId，拒绝畸形信封及非法快照；使用连接代次隔离旧回调，重复结果不重复提交。发送使用 Spring 并发会话包装器，依据 [Spring WebSocket API](https://docs.spring.io/spring-framework/reference/web/websocket/server.html) 的发送串行要求；单次底层阻塞写、慢连接持续压力、来源级限流与多实例协调仍需专项验证。管理端踢出与可靠事件游标尚未实现。

## 现有 HTTP 操作迁移表

| 当前操作 | 计划消息/去向 | 批次 |
|---|---|---|
| GET servers；POST development/login | HTTP 保留；开发登录日后换正式身份适配 | 基础 |
| GET roles/me；GET heroes；GET inventory | session.sync 首批三模块；背包另有 inventory.list | 优先登录/背包试点 |
| GET heroes/{heroId} | hero.detail | 后续 |
| GET heroes/{heroId}/level-up | hero.level.preview | 背包之后 |
| POST heroes/{heroId}/level-up | hero.level.upgrade | 背包之后 |
| GET/PUT lineups/main | lineup.read / lineup.save | 后续 |
| GET campaign；POST campaign/initialize | campaign.read / campaign.initialize；初始化规则另对照原版 | 后续 |
| POST campaign/battles；POST campaign/battles/{id}/claim | campaign.challenge / campaign.claim | 后续 |
| GET idle；POST idle/claim | idle.read / idle.claim | 后续 |

上述对应当前 16 个操作。完整聊天、公会与其他玩法尚未定义在本契约中，必须依原协议补充，不能视作已覆盖。

## 接入验收门槛

先完成隔离测试，再接入页面，最后进行实际窗口及正式服效果对照：

1. 未鉴权业务拒绝、令牌过期、顶号后旧令牌重连拒绝；非法消息、超限帧与慢连接不拖垮服务。
2. 提交前断线、提交后回包前断线，重连以原业务键确认；数据库只升级一次，金币与经验只扣一次。
3. 同键不同参数拒绝、重复回包不重复应用、后续升级后重试旧收据仍返回一致最新快照。
4. 关闭/重开升级页、升级中换号/切服、旧连接迟到回包，不污染新角色状态。
5. 默认独立内存 H2 测试；MySQL 并发补验使用独立测试库。现有账号仅在真实界面验收需要时正常操作，不用改库制造通过结果。

登录/背包试点已通过受控竞态测试和真实两端联调；Creator 已复验登录→主城→背包→详情→顶号回登录→手动重登→背包数量一致。普通断线自动恢复目前有真实客户端联调证据，尚未完成浏览器断网画面复验。下一批先补断网提示、换号/切服真实体验及登录/背包正式服交互差异，再迁移英雄升级。上述写操作门槛仍未完成，不同时展开其他窗口巡检。
