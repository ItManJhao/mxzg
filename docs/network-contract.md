# 首批长连接契约与接入顺序

更新：2026-11-02。状态：设计草案，只有首批 DTO 和生成检查已落地，WebSocket 服务端、客户端和运行时校验均未接入。现有 HTTP 闭环继续工作。原项目通信证据见 [架构核查](architecture.md#原项目架构核查2026-11-02)。本文定义新版技术契约，不改变旧游戏规则。

## 首批范围

采用 JSON 文本消息验证 WSS 会话、同步和一级英雄升级；不兼容旧 TCP/Protobuf 客户端。正式渠道身份认证另行接入，本机仍用开发登录换取访问令牌。HTTP 保留选服、身份交换与非游戏业务，其他已有接口在逐项验收后迁移，不一次删除。

DTO 唯一字段定义在 [session-contract.json](../protocol/session-contract.json)，生成命令为 `node tools/generate_session_contract.cjs`；`--check` 检查生成漂移。当前覆盖鉴权请求、鉴权确认、心跳响应、英雄升级请求，尚未覆盖统一信封、升级结果、快照和推送。生成类型不等于入站校验；接入前必须验证字符串长度、UUID、整数范围、必填字段及方向。

## 消息信封（待实现）

统一字段：`version: 1`、`kind: request | response | event`、`name`、`body`。请求和响应额外有 `id`（一次传输的 UUID）；响应必须回显请求 id 和 name，并带 `ok`。失败响应 `ok:false`、`body:null`、`error:{code,message,retryable}`；成功响应无 error。鉴权前不接受业务消息。

鉴权成功后所有消息额外携带服务端分配的 `connectionId`；客户端拒绝旧连接回包。客户端还维护本地登录代次，用于丢弃账号切换前启动的任务。id 只关联一次网络往返，不能用于替代业务幂等键。

`hero.level.upgrade` 的 body 使用 `HeroLevelCommand`。其中 `requestId` 是现有持久化业务幂等键，保持旧服务参数名称，避免迁移时混淆。断线恢复可以换信封 id，不能换 body.requestId、heroId 或 expectedLevel。成功结果复用现有 receipt + preview + heroes + role + inventory 语义；重复请求允许返回原收据与最新完整资产快照。

| 消息 | 方向 | 作用与准入 |
|---|---|---|
| session.authenticate | 请求/响应 | 建连后唯一允许的首个业务请求；令牌在 body，禁止放 URL 或日志 |
| session.sync | 请求/响应 | 鉴权后恢复角色、英雄、背包；返回一致快照，完成前禁用资产写入 |
| session.heartbeat | 请求/响应 | 已鉴权连接保活，响应含服务端毫秒时间 |
| session.kicked | 服务端事件 | 同角色新会话替换或管理员踢出；清理本地会话，不自动抢回登录 |
| hero.level.preview | 请求/响应 | ready 状态读取英雄升级预览，规则仍由服务端判定 |
| hero.level.upgrade | 请求/响应 | ready 状态提交一级升级；复用原事务服务 |

错误码须区分 `UNAUTHENTICATED`、`SESSION_REPLACED`、`NOT_READY`、`INVALID_MESSAGE`、`UNSUPPORTED_VERSION`、`RATE_LIMITED`、`INTERNAL_ERROR` 和现有业务失败原因。不能把所有 HTTP 409 都翻译成同一个失败；网络超时也不能伪装成业务拒绝。`retryable` 仅表示允许恢复后重试，不授权客户端生成新的扣费请求。

## 登录与重连时序

1. HTTP 身份交换取得令牌 → 建立 WSS → 发送 authenticate。正式环境使用加密连接；仅本机开发允许 ws。
2. 服务端验证令牌有效期和角色归属，原子登记当前连接。返回 connectionId 后进入 syncing。顶号同时使旧会话失效，旧令牌不能自动重连顶掉新登录；这一能力当前 SessionService 尚未实现。
3. 客户端请求 sync，服务端在一致读边界中返回角色、英雄、背包完整快照。客户端通过现有模块入口批量提交成功后进入 ready，再允许升级。后续扩展阵容/战斗/挂机时需扩展同步范围，不以这三个模块冒充全量恢复。
4. 断线立即禁用写按钮，保留当前业务未决请求。带随机抖动退避重连（初始建议 1/2/4/8 秒，最高 15 秒），重新鉴权、同步。未过期令牌可复用；过期回登录。登出、切服、顶号立即取消重连。
5. 对未决升级，使用同一业务键查询结果（首批可重发原升级命令，现有幂等收据提供结果），确认后更新快照。读请求可以重新发起；其他写请求不能通用自动重放。即使最新等级高于原收据的 toLevel，也不能据此判失败或再扣费。

同一角色的连接替换与资产写入需定义串行边界：替换前已进入事务的请求可能成功；替换后的旧连接请求必须拒绝。新连接同步要包含已提交变更，仍未确定的操作依靠持久收据核实，不能仅靠关闭 socket 保证事务被取消。多实例部署前必须替换进程内在线表为可协调的会话所有权机制。

## 消息顺序、资源与安全边界

- 首批不引入资产增量推送；完整快照与升级响应通过角色级串行调度保持提交/发送顺序，同一连接发送也必须串行。后续加入多来源推送时先实现持久版本/事件游标，不能把 connectionId 当资产版本。
- 原数据库事务、角色锁、持久幂等收据保留。网络层不得提前派发成功；仅在提交成功后响应。不能创建另一套升级业务或同时用 HTTP/WSS 发起同一次写操作。
- 客户端保持 Bag 更新协调器、英雄名册读失效、Account 登录代次与模块事件。关闭页面不丢失在途资产操作；同一请求迟到/重复结果不能重复提示或覆盖较新状态。
- 起步参数建议：首帧鉴权 5 秒、请求超时 15 秒、心跳 20 秒、60 秒无有效心跳断开；单帧上限 64 KiB、单连接待发送上限 256 KiB、未完成请求上限 16。它们是试点保护值，不是旧玩法规则或容量结论。后续全量快照超过限制时应分页/分片，不静默丢数据。
- 超限明确拒绝或关闭慢连接；禁止无限队列。鉴权前更严格限流，限制来源与连接数；令牌、聊天正文和玩家私密数据不写原始包日志。
- JSON 整数限制在 JavaScript 安全整数范围；Java long 不代表前端可接受任意 64 位数。接入层按业务约束验证正整数、时间和金额，禁止 NaN/无穷/小数等级。

## 现有 HTTP 操作迁移表

| 当前操作 | 计划消息/去向 | 批次 |
|---|---|---|
| GET servers；POST development/login | HTTP 保留；开发登录日后换正式身份适配 | 基础 |
| GET roles/me；GET heroes；GET inventory | session.sync 首批三模块；独立刷新按需保留 | 会话试点 |
| GET heroes/{heroId} | hero.detail | 后续 |
| GET heroes/{heroId}/level-up | hero.level.preview | 首个业务试点 |
| POST heroes/{heroId}/level-up | hero.level.upgrade | 首个业务试点 |
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

本批未通过这些长连接门槛，不能宣称已完成迁移。下一批先实现服务端会话与隔离测试，再接入客户端升级；不同时展开其他窗口巡检。
