# 游戏通信与统一状态契约

更新：2026-11-14。全部游戏业务只走 WS＋Protobuf。当前已接入登录、角色、背包、英雄只读状态、主线阵容保存、前三关挑战/结算及挂机演出；新挂机领取/status服务端事务已实现但默认关闭，客户端尚未接发包/持久待确认；升级、穿脱、宝箱按钮、快速战斗仍关闭。资源下载、WS握手及测试实例身份探针不属于游戏业务API。后文按日期记录字段演进，完整状态以[开发进度](development-progress.md)为准。

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
| session.authenticate | 请求/响应 | 有效令牌恢复连接；Accepted.initial 已包含统一状态，无额外同步请求 |
| session.heartbeat | 请求/响应 | 已鉴权连接保活，不更新资产，默认不打印 |
| session.kicked | 服务端事件 | 清理对应账号，停止自动重连，回登录 |
| state.changed | 服务端事件 | 事务提交后的完整 Snapshot；角色、库存、英雄、阵容、主线共用持久 revision |
| formation.save | 请求/响应 | 当前角色主线阵容保存；requestId 持久幂等，回执不代替统一快照 |
| chapter.challenge | 请求/响应 | 前三关主线挑战，服务端权威输入与持久战报 |
| chapter.claim | 请求/响应 | 指定主线战报的幂等结算；不是挂机宝箱领取 |
| chapter.replay | 请求/响应 | 恢复既有持久战报，不重新计算或发奖 |
| chapter.idle.encounter | 请求/响应 | 已通关主线的挂机遇敌演出战报，不结算资产 |
| chapter.idle.claim | 请求/响应 | requestId＋expectedOperationVersion → 冻结历史到账；服务端默认关闭，当前客户端无发包入口 |
| chapter.idle.claim.status | 请求/响应 | 只查指定requestId的COMMITTED/NOT_FOUND，不查库存、不抽样或创建计时；锁忙不能返回NOT_FOUND |
| battle.preview | 请求/响应 | 当前已保存阵容的开发只读试战，不推进通关或发奖 |
| gm.status、gm.grant | 请求/响应 | local按负责人要求默认开启，production不装配的开发数据准备；不等同玩法获取入口 |

inventory.list、session.sync 已删除业务处理，鉴权后请求返回 UNKNOWN_MESSAGE。未恢复玩法不得借旧 CampaignApi、IdleApi、HeroLevelApi 发请求或通过回调更新资产；这里只列 Protocol.ts 实际登记的消息。

## 信封和业务载荷

Frame 的 version=1，kind=request/response/event，name 是 Protocol.ts 统一登记的消息标识。id 关联单次请求，不是持久幂等键。成功响应含 ok=true/body，无 error；失败 ok=false/body=null/error。connectionId 标识当前连接，不是资产版本。令牌只在消息体，不放 URL、不打印。

Accepted={connectionId,roleId,serverTimeMs,initial,session?}。统一 Snapshot 包含 role、heroes、inventory、revision，并扩展 timedInventory、heroRoster、mainFormation、mainChapter、mainChapterIdle。协议字段名及是否可选以 game.proto 为准；Codec 向应用提供 camelCase，不把缺失可选状态当作全零或已同步。heroes 是真实名册，空数组表示没有英雄，不是预留字段。

role 包含身份、区服、等级、金币、钻石，以及基础资料 basics（经验、奖杯、头像/形象/头像框、语言、创建/登录秒和当前级经验门槛）；字段依据及缺口见[角色基础契约](role-data-contract.md)。inventory 为 Item{itemId,quantity,instanceId?}[]，数量是正整数绝对值，空数组表示已确认没有库存。期限物品使用独立 timedInventory；配置 ID 与持久实例 ID 不混用，实例 ID 保留字符串。revision 来自 game_role.state_revision（V6），是安全整数；不与 BagModel 本地界面 revision、阵容 version 或连接 connectionId 混用。

## 初始化与同步调用链

1. 选服目录走匿名 WS；登录在游戏连接发送 session.login，恢复发送 session.authenticate。
2. 服务端解析身份，持有角色串行锁完成接管；旧凭证撤销，旧连接收到 kicked。读取数据库一致快照，随成功响应一次返回。
3. GameSocketClient 校验关联、连接、角色与完整数据；AccountService 接纳账号时在同一通知批次调用 AssetStateBinding。
4. AssetStateBinding 在任何模块提交前校验完整角色、普通/期限库存、英雄、阵型、主线/挂机状态、持久版本与当前身份。通过后在同一通知批次把原始帧定向交给 RoleController、BagController、HeroRosterController、MainChapterController 的 onNotify；模块更新唯一 Model 后通知界面，非法整包不得先提交部分资产。
5. 背包打开、切页签、再次开始游戏均不查库存。断线保留已同步数据，重连鉴权首包整体恢复；登出或切服清理旧状态。重复/较旧版本被应用丢弃。

## 服务端提交边界

业务用例持有角色行锁，在同一事务修改钱包/库存。RoleRepository、InventoryService 通过 AssetSyncService.changed 同事务递增版本；一事务同角色只递增一次。提交成功才发布 Changed，处理器读取已提交完整状态并发送 state.changed。回滚不会留版本或推送，发送失败不重做业务，重连读数据库恢复。

当前只支持单进程在线表；离线不积压资产事件，完整快照恢复不依赖内存历史。尚无多实例消息协调、生产渠道登录、生产 WSS 发布验收；不得描述为已可上线。任何新增资产写入必须接入此事务出口，不得直接 SQL 改资产绕过版本同步。

## 日志与验证

Creator PREVIEW 的 WS接收日志显示协议中文说明、物品种类、itemId/quantity 含义及完整角色/背包实际数据；默认隐藏心跳、关联噪声及凭证，限制长度。日志不参与状态更新。

当前验证与剩余项见[进度](development-progress.md)，模块职责与开发模板见[背包维护指南](bag-mvc-maintenance.md#固定通信与状态模板)。小游戏/原生二进制适配、获得提示表现及正式服逐项对照仍待验收。

## 背包数据身份扩展

Item 增加可选字符串 instance_id=3，item_id=1 仍为配置 ID；不得把二者混用。Snapshot 增加可选 timed_inventory=5，内含逐件 TimedItem 和服务器 Unix 秒。旧协议字段号保持不变；两个方向都使用原 WS+Protobuf v2，未引入新查询。期限清理和身份规则见[背包说明](bag-mvc-maintenance.md#配置-id记录-id-与期限基础2026-11-03)。

单帧限制为256KB（262144字节），前后端编解码和服务端接收统一约束；300名英雄带四槽与当前面板数据的真实WS容量测试通过。面板目前只覆盖基础、装备与累计套装，其余旧加成通过pending_sources明确声明；详情不在前端叠加数值。

## 主线挂机只读快照（2026-11-06）

Snapshot.main_chapter_idle（字段9）随登录/鉴权恢复和state.changed统一下发，没有开页查询。MainChapterIdleState提供server_time、started_at（Unix秒）、max_seconds、frequency、reward_stage及rates。rates为每frequency秒的同源基础资源量，前端仅换算每分钟，不是已到账资产。

11-14已替换早期“首次胜利/快照补建”生命周期：首次真正受理主线挑战在角色锁和同一事务中初始化game_main_chapter_idle起点为now-initialSeconds，失败战斗正常提交也保留；已有起点、重连、挑战胜利与结算均不重置。已通关却缺累计明确拒绝，不由快照补免费起点。新表与已暂停的game_idle/game_campaign隔离；旧IdleService.claim不得接回。服务端新领取能力及关闭边界见下节。

### 新挂机领取与持久回执（2026-11-14）

Frame oneof新增31～34，MainChapterIdleState新增可选claim_state=9；不复用已有字段号。领取请求只收规范UUID request_id与显式正expected_operation_version；操作版本沿int64安全整数，实例ID继续字符串。request_id跨超时/重连不变，Frame.id仍只关联一次传输。

Receipt schema1带请求/回执ID、消费版本前后、统一计算秒/原起点/实际秒数/VIP上限/关卡、提交asset_revision、理论量、完整强类型实际到账及经验动画。实际结果明确分开满级/封顶忽略、升级附赠、钱包/库存前后、酒馆上限及真实期限/精灵实例；不塞JSON载荷或当前Snapshot。数据库另存AuditV1完整输入/候选/累计及摘要，未知格式或损坏不重算。

claim_state提供schema_version、operation_version和READ_ONLY/ENABLED，默认只读；它不是完整收益ready预报，不因登录展示而读取全部权益。缺字段/未知schema不能允许领取；客户端未知schema仅丢弃这项能力并限频记录，旧挂机演出继续。日常开关`mxzg.main-chapter.idle-claim-enabled`默认false，仅独立测试开启；当前没有新增客户端发包、journal或按钮交互。

服务器在角色锁内再次鉴权，先恢复成功回执再判断新请求开关、版本和输入；指定status查询与重放不抽样、不推进任何版本。历史receipt只用于命令确认/展示；最新资产及累计仍由统一Snapshot提交Model，确认应满足snapshot.revision≥receipt.assetRevision且operationVersion≥after。客户端持久待确认和双向确认尚未实现，详细依据见[领取事务](main-chapter-idle-settlement.md)。

AssetStateBinding提交任何模块前校验主线与挂机快照；MainChapterController.onNotify校验后提交Model。客户端经过时间只用于显示且封顶，领奖必须以后由服务器重新计算。关卡收益使用maxCleared而非下一关，也不使用最近一次通关奖励。


### 挂机选人快照补充（2026-11-06）

MainChapterIdleState新增slots（字段7）与lineup_version（字段8）。slots最多三项，复用FormationSlot的hero_id与position；必须是同一统一快照mainFormation的子集，版本必须相同。服务端在角色锁内按主阵容版本持久化随机选择，客户端不得重新抽人或自行改站位。该快照只支持显示，不表示已下发挂机战报或允许领取收益。


## 主线挂机演出协议（2026-11-06）

### 结算展示数据补充（2026-11-09）

BattleReplayUnit新增可选total_damage=9、total_taken_damage=10，随不可变战报冻结。输出伤害沿旧HeroFightLog累计abs(actualHpChange+absorbed)，承伤累计实际扣血绝对值。负责人确认沿用该口径，护盾规则疑点继续保留。旧战报缺失统计时显示为缺失，禁止从飘字或当前英雄属性反推。

ChapterReceipt新增可选experience=5，包含发奖事务前后的等级、等级内经验与升级门槛。成功发奖时与settlement_json同事务持久化，重复领取返回原值；历史回执缺失时不补造。客户端先校验整包再提交MainChapterModel，该快照只供结算展示，不能覆盖角色/资产Model。

统计页补充可选total_recovery=11和star=12。治疗沿旧BattleContext.replenish→HeroFightLog.addRecovery，把修正后治疗量记给施法者，包含溢出治疗、保留负号，不能按实际回血或飘字另算。星级来自该场输入，不从当前名册补历史。新战报明确写入0治疗，旧战报缺字段返回null并显示—；双方任一单位缺某项时该项进度条不显示比例，已知数字仍保留。统计页没有新增业务请求，也不触发再次结算。

治疗顺序事件kind=recovery复用actual_hp_change/reported_hp_change/dead字段，不新增字段号。服务端在治疗发生处同时记录累计量与顺序事件，事务失败一并回滚；双方均按原事件顺序验证生命。actual为实际变化，reported为含溢出的旧报告量，dead固定false；拒绝复活、越过死亡边界、超过最大生命或实际量与溢出上限不符的记录。客户端血条使用actual，飘字和统计使用reported，不重算或请求奖励。2026-11-09真实主线只增加冰晶女巫2031301至2031303直接治疗覆盖，不能解释为全部治疗技能开放。

- `chapter.idle.encounter`：鉴权后空请求，返回 `IdleEncounter`（Frame字段30），包含stage、assetRevision、lineupVersion、强类型BattleReplay。沿用WS＋Protobuf，无HTTP或JSON回退。协议名遵守小写分段规则。
- 服务端在角色锁内读取当前已通关关卡与持久挂机选择，随机取该关卡一条非空怪物配置，首行动序号按0..2抽取后对英雄数量取模。双方只用普攻，怪物初始HP=1；挂机使用旧独立阵型1，保留原站位和元素加成。现阶段仍只支持已接入的前三关/普攻配置。
- 场景标识 `idle:chapter:N` 与 `chapter:lineup:N` 挑战战报分开。演出不写主线战报、不领奖、不推进关卡、不增加资产版本。客户端校验完整生命事件链、最多三名我方和一名敌方、普攻类型，以及当前关卡/阵容/资产版本后才播放。
- 此请求只在行军路程到达遇敌点后发出，不查询角色/背包。失败不伪造击杀；下一次行军到遇敌点才重试。页面关闭或进入挑战取消本页演出，连接切换仍由通信和应用层隔离。

战报外观快照（2026-11-09负责人确认）：BattleReplayUnit.portrait_icon_id=13为可选正整数资源ID；服务端在开战构建时按历史星级/进化状态解析并随原战报字节持久化，回看不重算。旧战报缺字段或客户端尚未收录该资源时，统计页显示基础模板头像并明确提示降级，不查询当前名册。该差异是负责人确认的历史一致性选择，未开放进化/皮肤操作，也未完成所有历史皮肤资源还原。

### 主线历史双方名称

BattleReplay追加可选attacker_name=7、defender_name=8，不复用字段号。主线挑战在同一角色锁内读取昵称与同源language章节名，按旧BattleHandler的43100+chapter及全局关卡idx组合敌方名，随战报二进制一次持久化。回看与领奖不重查名称；角色改名不影响历史。旧字段缺失返回null，统计页显示“历史名称未记录”；明确记录的空字符串保留为空。客户端拒绝超过128字符或含控制字符的名称，避免异常协议破坏标签布局。当前只接主线统计入口，挂机与只读演示不伪造双方名称。
