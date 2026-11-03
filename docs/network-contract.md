# 登录、角色与背包通信契约

更新：2026-11-03。本批范围经用户确认：去掉全部游戏业务 HTTP，先完善登录、角色、背包；其他玩法入口暂停，后续依旧项目重做。资源下载、WS 握手及测试实例身份探针不属于游戏业务 API。

## 原项目初始化依据

旧源码根目录：G:/work/FsGame/Demo/mj/program。

- mxzg-protofiles/protofiles/game/Login.proto 的 1001 仅返回 rid/time/status 等登录确认，不含完整背包。
- client/cocos_mxzg/client/idle/src/net/RoleResponse.lua 的 login 先请求 GReqRoleInfo（2001）；roleInfo 接收并写角色，再发送 GReqBackPackList（5001）。LoadingSceneCtr 等待角色、英雄、背包初始化完成。
- server 的 module/backpack/handler/BackPackHandler.getBackPack 返回完整库存 5001；module/backpack/observer/ThingObserver 监听增加/消耗，在变化时主动发送 GResBackpackGain（5002）。旧 BackpackResponse.backpackGain 更新 Player 与界面。
- 5001 是全量，5002 的 num 是有正负的变化量，并含提示类型（0 静默、1 弹窗、2 文字）。不能把旧版说成完全不发请求的登录首包，也不能把所有变化都交由客户端主动查。

新版把旧版分散初始化请求合并为登录成功的同一条回包；后续仍由服务端主动同步。当前同步采用带持久版本的完整状态，而非无版本增量。获得提示类型和全部角色字段尚须依原项目逐项恢复，当前不宣称表现完整等价。

## 唯一协议与入口

[game.proto](../protocol/game.proto) 是唯一字段契约，proto2 + 强类型 oneof。入口 /api/v1/game/socket，子协议 mxzg.protobuf.v2；文本、错载荷和超限帧拒绝，不提供 JSON/Base64 回退。生成：node tools/generate_game_protocol.cjs；校验追加 --check；Java 由 Maven 自动生成。

| name | 方向 | 数据与作用 |
|---|---|---|
| servers.list | 请求/响应 | 匿名读取 Servers.items 开放区服，读取后关闭目录连接 |
| session.login | 请求/响应 | local 开发身份交换；account/serverId/clientInstanceId → Accepted，其中 session 是凭证、initial 是统一状态 |
| session.authenticate | 请求/响应 | 有效令牌恢复连接；Accepted.initial 已包含完整角色与背包，无额外同步请求 |
| session.heartbeat | 请求/响应 | 已鉴权连接保活，不更新资产，默认不打印 |
| session.kicked | 服务端事件 | 清理对应账号，停止自动重连，回登录 |
| state.changed | 服务端事件 | 事务提交后的完整 Snapshot，角色和背包共用 revision |

inventory.list、session.sync 已删除业务处理，鉴权后请求返回 UNKNOWN_MESSAGE；英雄升级/阵容/战斗/挂机尚无新网络协议或入口。

## 信封和业务载荷

Frame 的 version=1，kind=request/response/event，name 是 Protocol.ts 统一登记的消息标识。id 关联单次请求，不是持久幂等键。成功响应含 ok=true/body，无 error；失败 ok=false/body=null/error。connectionId 标识当前连接，不是资产版本。令牌只在消息体，不放 URL、不打印。

Accepted={connectionId,roleId,serverTimeMs,initial,session?}。Snapshot={role,inventory,revision,heroes:[]}；heroes 字段暂留字段号，不在当前范围加载英雄。role 包含身份、区服、等级、金币、钻石，以及基础资料 basics（经验、奖杯、头像/形象/头像框、语言、创建/登录秒和当前级经验门槛）；字段依据及缺口见[角色基础契约](role-data-contract.md)。inventory 为 Item{itemId,quantity}[]，数量是正整数绝对值，空数组表示已确认没有库存。revision 来自 game_role.state_revision（V6），是安全整数；不与 BagModel 本地界面 revision 混用。

## 初始化与同步调用链

1. 选服目录走匿名 WS；登录在游戏连接发送 session.login，恢复发送 session.authenticate。
2. 服务端解析身份，持有角色串行锁完成接管；旧凭证撤销，旧连接收到 kicked。读取数据库一致快照，随成功响应一次返回。
3. GameSocketClient 校验关联、连接、角色与完整数据；AccountService 接纳账号时在同一通知批次调用 AssetStateBinding。
4. 应用先校验角色、库存、持久版本与当前身份，再将原始帧定向交给 RoleController 和 BagController 的 onNotify。二者更新唯一 Model 后通知界面。
5. 背包打开、切页签、再次开始游戏均不查库存。断线保留已同步数据，重连鉴权首包整体恢复；登出或切服清理旧状态。重复/较旧版本被应用丢弃。

## 服务端提交边界

业务用例持有角色行锁，在同一事务修改钱包/库存。RoleRepository、InventoryService 通过 AssetSyncService.changed 同事务递增版本；一事务同角色只递增一次。提交成功才发布 Changed，处理器读取已提交完整状态并发送 state.changed。回滚不会留版本或推送，发送失败不重做业务，重连读数据库恢复。

当前只支持单进程在线表；离线不积压资产事件，完整快照恢复不依赖内存历史。尚无多实例消息协调、生产渠道登录、生产 WSS 发布验收；不得描述为已可上线。任何新增资产写入必须接入此事务出口，不得直接 SQL 改资产绕过版本同步。

## 日志与验证

Creator PREVIEW 的 WS接收日志显示协议中文说明、物品种类、itemId/quantity 含义及完整角色/背包实际数据；默认隐藏心跳、关联噪声及凭证，限制长度。日志不参与状态更新。

当前验证与剩余项见[进度](development-progress.md)，模块职责与开发模板见[背包维护指南](bag-mvc-maintenance.md#固定通信与状态模板)。小游戏/原生二进制适配、获得提示表现及正式服逐项对照仍待验收。

## 背包数据身份扩展

Item 增加可选字符串 instance_id=3，item_id=1 仍为配置 ID；不得把二者混用。Snapshot 增加可选 timed_inventory=5，内含逐件 TimedItem 和服务器 Unix 秒。旧协议字段号保持不变；两个方向都使用原 WS+Protobuf v2，未引入新查询。期限清理和身份规则见[背包说明](bag-mvc-maintenance.md#配置-id记录-id-与期限基础2026-11-03)。
