# 游戏通信与统一状态契约

更新于 2026-11-20。WS＋Protobuf 是游戏业务通信入口。模块 Controller 发送业务协议和接收回包，View 调 Controller。各入口的开放与验证范围见 [开发进度](development-progress.md)。

普通操作每次确认发送一次，资产以在线推送或正常重连鉴权首包为准。同步快照后刷新唯一 Model，成功回包仅用于本次反馈。布阵等服务器阵容版本后出战，战斗按原 battleId 回包和快照确认结算。冷重登首次进入主线才处理快照中的待结算战斗。详见 [断线恢复](reconnect-recovery.md)。

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
| session.heartbeat | 请求/响应 | 已鉴权连接保活，并用回包的 serverTimeMs 校准公共时钟。默认不打印 |
| session.kicked | 服务端事件 | 清理对应账号，停止自动重连，回登录 |
| state.changed | 服务端事件 | 事务提交后的完整 Snapshot；角色、库存、英雄、阵容、主线共用持久 revision |
| role.name.random | 请求/响应 | 获取当前区服可用的随机候选名，回包携带 `nickname` |
| role.name.set | 请求/响应 | 提交 `nickname` 首次命名，昵称与 `Role.first_named` 随统一角色快照更新 |
| role.welcome.claim | 请求/响应 | 空请求领取一次新手赠礼，回包与 `reward.granted` 共用同一奖励回执。领取状态和资产随统一快照更新 |
| reward.granted | 服务端事件 | 原发奖事务提交后的通用显示反馈；沿原业务receiptId去重，不是资产增量 |
| hero.summon | 请求/响应 | `requestId`、奖池 `pool`、次数 `count` 和已确认的最高钻石 `maxDiamonds`。服务端返回抽取顺序、实际英雄和消耗。积分兑换使用同一入口，次数为 1 |
| hero.summon.normal | 请求/响应 | 普通单抽按钮提交 `requestId`。到期优先免费，冷却中按配置扣券。服务端返回本次实际英雄、积分和资产版本，同一编号重放原结果 |
| hero.summon.first | 请求/响应 | 旧免费首抽指令，保留既有编号重试语义，只允许免费首抽 |
| hero.summon.first.status | 请求/响应 | 按同一角色和原 `requestId` 查询成功回执，供断线与重登恢复 |
| hero.level.upgrade | 请求/响应 | `requestId`、英雄实例 `heroId`、原等级 `expectedLevel` 与升级级数 `levels`；服务端计算成本，提交后返回原回执 |
| hero.level.upgrade.status | 请求/响应 | 同一角色按原 `requestId` 查原升级回执 |
| hero.stage.advance | 请求/响应 | `requestId`、英雄实例 `heroId` 和原阶 `expectedStage`。服务端按当前等级、星级和费用校验，返回原进阶回执，统一快照刷新阶级与库存 |
| hero.stage.advance.status | 请求/响应 | 同一角色按原 `requestId` 查进阶回执。重连首包仍直接提供当前成长状态 |
| hero.lock.set | 请求/响应 | `requestId`、实际英雄实例 `heroId` 和目标 `locked`。服务端按角色归属设值，重放返回原回执，新状态由统一快照交付 |
| hero.star.upgrade | 请求/响应 | `requestId`、英雄、原星级、各配方行的素材实例和替代选择。按旧配方结算，回复实际星级和已返还道具，完整资产以统一快照为准 |
| hero.jewel.change | 请求/响应 | 以操作枚举区分单槽、批量和合成，提交所见槽位与原项或目标配方；回执保留本次选择，统一快照携带英雄的已镶宝石 |
| hero.god-equipment.change | 请求/响应 | 真实神装实例和英雄部位；替换时带当前槽内实例，卸下仅传当前占槽实例 |
| hero.god-equipment.draw | 请求/响应 | 单次或十次与玩家确认的钻石上限。神装实例、宝箱进度和普通奖励由同版本快照交付 |
| hero.god-equipment.shop.buy | 请求/响应 | 商品编号、份数和当前上海日周期的结束时间。服务端复核价格、限购和门槛，扣碎片并发放石头或真实神装实例。购买次数随 `godEquipment.shop` 同步 |
| hero.artifact.change | 请求/响应 | 英雄部位、动作及必要的圣器实例或升星素材。激活槽位、持有与装备关系随 `artifacts` 同步。相同请求编号只返原结果 |
| hero.equipment.change | 请求/响应 | `requestId`、`heroId` 和 `action`。单穿使用背包堆叠字符串 ID。单脱使用槽位、穿戴实例 ID 和操作时的原配置 ID。批量穿脱由服务端按当前状态执行 |
| market.list | 请求/响应 | 空请求获取本角色的普通市场货架、刷新次数和成交价 |
| market.buy | 请求/响应 | `requestId`、`shelfVersion`、`productId` 和 `count`；服务端按当前货架结算 |
| market.refresh | 请求/响应 | `requestId` 和 `shelfVersion`；服务端按免费次数及付费配置刷新货架 |
| dungeon.{gold,experience,hero,fetter,spirit}.list | 请求/响应 | 空请求获取对应类型的关卡、每日胜次、下次报价、奖励预览和准入状态 |
| dungeon.{gold,experience,hero,fetter,spirit}.challenge | 请求/响应 | `requestId`、`stageId`、`sweep`、`maxDiamonds`，回包携带原战报或扫荡结果、实际发放及该类型最新次数 |
| formation.save | 请求/响应 | 当前角色主线阵容保存；requestId 持久幂等，回执不代替统一快照 |
| chapter.challenge | 请求/响应 | 按服务端当前开放范围挑战（默认连续第 1～550 关），权威输入与持久战报 |
| chapter.claim | 请求/响应 | 指定主线战报的幂等结算；不是挂机宝箱领取 |
| chapter.replay | 请求/响应 | 恢复既有持久战报，不重新计算或发奖 |
| chapter.milestone.claim | 请求/响应 | 以 rewardId 领取达成的里程碑，返回原持久回执和实际到账 |
| chapter.milestone.claim.status | 请求/响应 | 查询同一 rewardId 的原成功回执，冷恢复使用 |
| chapter.firstreward.claim | 请求/响应 | 以绝对关卡号 `chapter` 领取独立通关奖励，同一角色和关卡复用原成功回执 |
| chapter.firstreward.claim.status | 请求/响应 | 查同一绝对关卡号的独立领取回执，用于重登和断线恢复 |
| bag.fragment.combine | 请求/响应 | 每次确认发送一次，携带 `requestId`、`itemId` 和合成次数 `quantity`。服务端校验资格、扣除碎片并生成实例，即时成功回执交通用获得窗 |
| bag.fragment.combine.status | 请求/响应 | 服务端支持按同角色原 `requestId` 查询，供联调和幂等检查。当前玩家端断线后通过鉴权首包更新库存和名册 |
| chapter.idle.encounter | 请求/响应 | 已通关主线的挂机遇敌演出战报，不结算资产 |
| chapter.idle.claim | 请求/响应 | requestId＋expectedOperationVersion → 冻结历史到账；全局默认关闭、local默认开启，玩家按钮转原持久命令入口 |
| chapter.idle.claim.status | 请求/响应 | 只查指定requestId的COMMITTED/NOT_FOUND，不查库存、不抽样或创建计时；锁忙不能返回NOT_FOUND |
| battle.preview | 请求/响应 | 当前已保存阵容按全局关卡idx进行开发只读试战；未支持依赖拒绝，不推进通关或发奖 |
| gm.status、gm.grant | 请求/响应 | local按负责人要求默认开启，production不装配的开发数据准备；不等同玩法获取入口 |
| gm.level.set、gm.chapter.set | 请求/响应 | 使用持久请求编号设置当前角色等级或下一主线挑战关卡，提交后同步统一快照 |
| gm.time.get、gm.time.set | 请求/响应 | 查询或设置开发进程的游戏时间，设置参数为 Unix 秒，0 恢复系统时间，响应返回 Unix 毫秒和是否有偏移 |

inventory.list、session.sync 已删除业务处理，鉴权后请求返回 UNKNOWN_MESSAGE。未恢复玩法不得借旧 CampaignApi、IdleApi、HeroLevelApi 发请求或通过回调更新资产；这里只列 Protocol.ts 实际登记的消息。

## 信封和业务载荷

`Snapshot.hero_summon=12` 携带两种免费单抽的服务器 Unix 秒、积分兑换门槛和实际点数消耗，以及祈愿资格结束时间。客户端按公共服务器时钟和统一快照显示价格，按服务端回包展示实际获得的英雄。服务端重新核算费用，在同一事务内保存扣款、英雄、积分、保底进度和回执；相同编号及参数重放原结果，变更参数会被拒绝。断线后通过鉴权首包刷新资产。积分检查累计实付和神职等级，祈愿购买随支付接入。

`MainChapterState.firstRewardProgress` 提供独立通关奖励的 `claimedChapters` 与 `eligibleChapters`。服务端以绝对关卡号查表并下发当前可领集合。旧首包缺字段视为尚未同步。领取后同时检查原关卡回执、统一版本和已领集合，里程碑仍用自己的配置 ID 与已领状态。

`HeroFragmentCombineReceipt` 冻结合成次数、实际扣除量与创建的英雄实例。客户端核对原消费参数及统一资产版本后提交通用反馈，库存和名册由快照更新。两项业务都先保存原意图，恢复时查原回执，通用反馈实际展示后按原参数清理记录。

`HeroLevelUpgradeReceipt` 保存原请求、角色、英雄、起止等级、配置版本和提交后的资产版本。HeroLevelController 接回包后通知详情展示本次光效，等级、钱包和英雄经验由统一快照更新。

`HeroEquipmentChangeRequest` 的 `EQUIP` 使用背包堆叠的 `equipmentId`，装备部位读取策划配置。`UNEQUIP` 同时核对 `equipmentId`、`slot` 和 `expectedTemplateId`，防止槽位保留实例 ID 时卸下已经换上的装备。`EQUIP_ALL` 和 `UNEQUIP_ALL` 只携带英雄和动作。每笔事务提交背包扣还、槽位和原回执，重复相同请求参数返回原回执，复用请求号却修改参数会被拒绝。

`HeroEquipmentChangeReceipt` 保留原选择、`roleId`、`assetRevision` 和 `changed`。无变化时保留当时的版本。最新槽位与已恢复面板属性随 `Hero.equipment` 和 `Hero.panelStats` 下发。可选 `HeroPanelStats.power` 使用服务端针对当前面板的个人战力，旧快照缺字段时保留未同步状态。普通穿脱无须补查库存。

通用奖励事件为 Frame 字段35 reward_notice，携带 schemaVersion、receiptId、roleId、assetRevision、mode 和实际到账量。可选 request_id=7 关联原请求，role_upgrade=8 携带升级前后等级。GameSocketClient 校验认证连接，RewardController 接收通知，按已提交资产版本和 receiptId 交付共享队列。回执重放或 status 查询不重复发送奖励事件。见 [通用发奖反馈](reward-feedback.md)。

Frame 的 version=1，kind=request/response/event，name 是 Protocol.ts 统一登记的消息标识。id 关联单次请求，不是持久幂等键。成功响应含 ok=true/body，无 error；失败 ok=false/body=null/error。connectionId 标识当前连接，不是资产版本。令牌只在消息体，不放 URL、不打印。

Accepted={connectionId,roleId,serverTimeMs,initial,session?}。统一 Snapshot 包含 role、heroes、inventory、revision，并扩展 timedInventory、heroRoster、mainFormation、mainChapter、mainChapterIdle。协议字段名及是否可选以 game.proto 为准；Codec 向应用提供 camelCase，不把缺失可选状态当作全零或已同步。heroes 是真实名册，空数组表示没有英雄，不是预留字段。

Snapshot字段11为可选TavernPointState tavern_points，解码为tavernPoints={schemaVersion:1,adventureCount,limit}；两数均为非负安全整数，合法超关卡上限不裁回。服务端同一角色锁中读取当前独立余额及已通关上限，初始化/变更后统一推进revision；不能用900401普通库存或reward.granted实际增量当当前点数。客户端缺字段清为未同步，已提供但坏格式拒绝整包；新格式快照同时携带900401库存也拒绝。旧成功回执保持原冻结内容，包括旧actual.stacks中的900401，不能因此回写当前资产。未新增酒馆请求或HTTP查询。

role 包含身份、区服、等级、金币、钻石，以及基础资料 basics（经验、奖杯、头像/形象/头像框、语言、创建/登录秒和当前级经验门槛）；字段依据及缺口见[角色基础契约](role-data-contract.md)。inventory 为 Item{itemId,quantity,instanceId?}[]，数量是正整数绝对值，空数组表示已确认没有库存。期限物品使用独立 timedInventory；配置 ID 与持久实例 ID 不混用，实例 ID 保留字符串。revision 来自 game_role.state_revision（V6），是安全整数；不与 BagModel 本地界面 revision、阵容 version 或连接 connectionId 混用。

## 初始化与同步调用链

1. ServerSelectionController 请求匿名区服目录，AccountController 通过账号网关发起登录或恢复。GameSocketClient 统一发送 session.login 和 session.authenticate。
2. 服务端解析身份，持有角色串行锁完成接管；旧凭证撤销，旧连接收到 kicked。读取数据库一致快照，随成功响应一次返回。
3. GameSocketClient 校验请求、连接、角色与完整数据。AccountController 接纳账号时在同一通知批次调用 AssetStateBinding。
4. AssetStateBinding 在任何模块提交前校验完整角色、普通/期限库存、英雄、阵型、主线/挂机状态、持久版本与当前身份。通过后在同一通知批次把原始帧定向交给 RoleController、BagController、HeroRosterController、MainChapterController 的 onNotify；模块更新唯一 Model 后通知界面，非法整包不得先提交部分资产。
5. 背包打开、切页签、再次开始游戏均不查库存。断线保留已同步数据，重连鉴权首包整体恢复；登出或切服清理旧状态。重复/较旧版本被应用丢弃。

## 公共服务器时间

游戏应用向 GameSocketClient 注入 [ServerClock](../client/assets/scripts/core/ServerClock.ts)。连接校验通过后，登录、鉴权和心跳回包的 `serverTimeMs` 校准同一份时钟。两次回包之间用单调时钟计算经过的毫秒，缺少单调计时器的平台累积引擎帧时间。连接结束后，`nowSeconds()` 返回 `null`，直到新连接完成鉴权。连接代次和请求编号校验同样适用于心跳。

背包期限展示与挂机累计读取 `nowSeconds()`，统一使用 Unix 秒。快照自己的时间字段用于校验同包的期限和累计起点，业务结算以服务端事务时间为准。

## 服务端提交边界

业务用例持有角色行锁，在同一事务修改钱包/库存。RoleRepository、InventoryService 通过 AssetSyncService.changed 同事务递增版本；一事务同角色只递增一次。提交成功才发布 Changed，处理器读取已提交完整状态并发送 state.changed。回滚不会留版本或推送，发送失败不重做业务，重连读数据库恢复。

当前只支持单进程在线表；离线不积压资产事件，完整快照恢复不依赖内存历史。尚无多实例消息协调、生产渠道登录、生产 WSS 发布验收；不得描述为已可上线。任何新增资产写入必须接入此事务出口，不得直接 SQL 改资产绕过版本同步。

## 普通市场

打开市场或连接恢复后，通过认证连接请求 `market.list` 取得权威货架。货架返回原商品配置 ID、实际成交价、奖励数量、已购数量和限购。免费次数、当日已用付费次数、各自上限及两个恢复时刻也由服务端下发。时间为 Unix 秒，免费次数已满时下次恢复时间为 0。

购买和手动刷新核对当前角色与货架版本，使用 `requestId` 保存成功回执。相同编号和参数重试返回原结果，货架变化后按新货架决定下一次操作。回包的 `state` 用于刷新货架，`assetRevision` 对应当时的资产提交。免费刷新沿用当前资产版本。购买和付费刷新后的钱包及库存使用 `state.changed` 或重连首包，成功购买由原事务发送一次 `reward.granted` 打开通用奖励窗。

## 日常副本

金币、经验、英雄、羁绊和精灵共用一组 Protobuf 消息。各自的 `.list` 返回该类型第 1～9 关、当日胜次、上限、下次价格和角色最高历史战力。各关共用所属类型的次数。每行包含原语言键、等级和战力门槛、奖励、通关与准入状态。服务端要求先通过前一关，历史最高主阵容战力严格高于配置门槛。

| 类型 | 开启等级 | 原战场 | 基础产物 | 第 3、4 次 |
|---|---:|---|---|---:|
| 金币 | 15 | `map31` | 金币、英雄进阶石 | 50 钻 |
| 经验 | 17 | `map32` | 英雄经验 | 50 钻 |
| 英雄 | 18 | `map36` | 3～5 星随机英雄碎片道具，依关卡变化 | 50 钻 |
| 羁绊 | 22 | `map38` | 羁绊资源 | 50 钻 |
| 精灵 | 60 | `map39` | 精灵魔力 | 100 钻 |

各类独立拥有两次免费额度，女神 VIP 档位可增加各类付费次数。神职在对应类型的原配置门槛触发增产。金币第 10 关没有奖励行。源表第六类没有旧版服务端枚举和日常副本页签。

各自的 `.challenge` 由服务端锁定角色后完成模拟、扣费、结算、发奖和回执写入。`stageId` 选择要挑战或扫荡的关卡，省略时沿用第 1 关。`maxDiamonds` 限制本次扣除的钻石。战败保留战报，付费场照扣，胜利或成功扫荡才增加该类型胜次并发奖。已通过的关卡才可扫荡，扫荡回包无战报。相同业务编号、类型、关卡和参数返回原回执，切换类型或关卡复用编号会拒绝。查询顶层保留首关字段，结算顶层对应本次关卡。页面打开或重连后确认进度，未确认的操作沿原类型、关卡和编号重试。

`resetAtSeconds` 是上海零点的 Unix 秒，过零点第一秒刷新各类型胜次，最高通关保留。V54 将旧金币首关布尔标记迁成最高通关 0 或 1。V55 将金币的次数、日期、通关和原回执归入 `gold` 类型，经验副本自首次操作单独记录。

战报复用 `BattleReplay`，场景为 `dungeon:<类型>:<关卡号>`。客户端按类型和关卡校验真实守军。扫荡使用通用奖励窗，资产使用 `state.changed` 与鉴权快照。战报播放和关闭结算都无需重复发奖。

## 幻境之塔

主城入口在角色 16 级开放。V56 保存幻境专用阵容、精力、扫荡次数、最高通关层和里程碑。首次编辑从主阵容取得草稿，`tower.formation.save` 保存独立阵容并检查预期版本。打开页面或认证恢复后通过 `tower.state` 读取权威进度、相应楼层守军、奖励、上海零点时间和扫荡报价。

`tower.challenge` 挑战下一层，当前实现覆盖第 1～10 层。战败消耗一点精力，满额 20 点，每经过 1800 秒恢复一点。获胜后最高层推进并自动发放该层首通奖励。战报场景为 `tower:<层数>`，采用原地图 `map37` 与 15 回合规则。

`tower.sweep` 扫荡已通关的最高层，同一天的报价依次为 0、0、10、20、40 钻。请求提交目标层及确认的最高费用。`tower.milestone.claim` 单独领取第 10 层的里程碑。挑战、扫荡、里程碑共用角色范围内的原请求编号，重试返回冻结结果。主阵容和背包使用原快照，VIP 从已提交的最高层读取。

## 新手竞技场

主城入口在角色 8 级开放。`arena.state` 初次从旧表生成 3 个机器人对手，重连沿用候选名单。`arena.refresh` 重新抽取对手并保留场次。`arena.challenge` 提交请求编号和候选编号，每日三次免费，用完消耗挑战券。`arena.ticket.buy` 按原价每张 20 钻购买。

机器人战斗用权威主阵容，地图为 `map54`，最多 20 回合，按原表从第 7 回合起每回合叠加攻击倍率。胜利增加积分和新手胜场，败场积分保持，胜负均按原奖励表发放。V57 持久化候选、每日及永久累计场次、回执和历史。`arena.replay` 只返回该角色原场次的冻结战报。达到 5 胜退出机器人段，真人匹配、排行榜与赛季待恢复。

消费、发奖、战报与参与数同一事务提交。相同业务请求编号可取回原结果，重复提交不会增加 VIP 场次。胜负均在提交后触发包含 VIP 进度的快照。

## 公会成员与申请

`guild.list` 使用当前登录角色的区服。查询可传名称片段和页码，响应包含建会费用、名称长度、申请冷却和成员状态。有审批权限时才附带本公会的待审申请。

`guild.change` 使用持久业务编号提交 CREATE、APPLY、APPROVE、REJECT、LEAVE。服务端从鉴权连接取得操作者，统一检查资格、权限和区服。重复提交同一编号和参数返回当前公会状态，写入和扣费只发生一次。编号已用于其他参数时拒绝。

CREATE 可传 0 至 43 的 `badgeId`。旧请求省略该字段时沿用原版 00 徽章与原幂等摘要。公会摘要返回已保存的徽章，成员与待审申请返回角色的头像和头像框字段。

公会成功变更后，相关在线角色收到 `guild.updated`。公会页收到后查询。已入会角色首次进主城、重连或公会状态变化时也用 `guild.list` 确认审批提醒，会长有待审申请时点亮公会底栏。钱包与个人空间公会名继续使用 `state.changed` 和鉴权快照。加入和离开由服务端更新角色资料。

## VIP 契约任务

底栏 VIP 读取 `Snapshot.vip`，随登录、鉴权恢复和 `state.changed` 交付。`level` 是角色持久女神 VIP，`tasks` 是本档任务，每项有原 `id`、`target`、`progress` 与 `claimed`。未接入进度的任务省略 `progress`，已同步且无进度下发 `0`。服务端使用当前角色等级、最高通关、实时英雄名册及已提交高级召唤回执。高级单抽计 1，十连含保底计 10，失败与普通、友情召唤均不计入。

`vip.claim` 请求只提交 `requestId` 与 `taskId`。V53 用角色和任务保证只领一次，原请求重试返回冻结回执。校验资格、发奖、推进统一资产版本、插入领取记录及本档领齐后更新 `goddess_vip` 处于同一角色锁事务。客户端以新快照刷新等级、进度和红点。成功回包的 `notice` 和原 `reward.granted` 服务端通知使用同一回执身份，通用奖励队列只展示一次。

负责人确认新号走日服源码的 VIP0 起步。首档任务为通关主线 3、角色 5 级、拥有一名至少 20 级的英雄、高级召唤 2 次。日服的任务、等级权益、权益文案和女神解锁表与当前四份 Excel 逐字节相同，客户端从登录后的单一配置包读取。VIP1 已有市场额外付费刷新 5 次和英雄名册容量 25 格生效。契约和倍率可预览，参战与倍速入口待接。

VIP1 档的四项任务是主线 20 关、角色 15 级、竞技场已结算 3 场和幻境之塔最高通关 10 层，每项 30 钻，领齐升 VIP2。竞技场胜负均计，塔的里程碑独立于最高通关。

VIP2 档的四项任务是主线 70 关、角色 25 级、累计参与日常副本 1 次和累计获得五星英雄 3 次，每项 30 钻，领齐升 VIP3。五类日常副本共用累计参与进度。已结算的胜局、败局和扫荡各计一次，跨日保留，重复请求和事务回滚均不增加。失败且未扣费的挑战也会发布提交后的快照。任务的「前往」直达日常副本关卡页，五星获得任务前往召唤页。

五星获得按创建时恰为五星的实际发放实例和成功升到五星的回执累计。英雄后来被消耗不会减进度，预言替换不计。V58 和 V58.1 补算原发奖回执及开发发放中的可核实记录，同一实例只补一次。缺少发放证据的历史数据保留原状，不按当前名册或图鉴推算。VIP3 档的下一批进度接入仍待完成。

隔离 H2 领域检查覆盖首档领齐升档、金额、十连计数与事务回滚。真实 WebSocket 检查覆盖未达成拒领、回包与通知共用奖励、重试和重登。Java 回执及快照二进制已用客户端解码。独立 MySQL 8.4 通过 V53 升级、应用重启后的已领恢复及同请求无重复发放。Creator 独立 H2 用 VIP0 测试角色实测首次命名与赠礼、主线第 3 关结算及两次真实高级单抽。角色等级、英雄等级和前两关为隔离测试前置数据。四项任务通过页面共领取 80 钻，升 VIP1 后底栏红点熄灭，冷重登保留等级与到账结果，另抽查 VIP13 契约概览。

## 日志与验证

Creator PREVIEW 的 WS接收日志显示协议中文说明、物品种类、itemId/quantity 含义及完整角色/背包实际数据；默认隐藏心跳、关联噪声及凭证，限制长度。日志不参与状态更新。

当前验证与剩余项见[进度](development-progress.md)，模块职责与开发模板见[背包维护指南](bag-mvc-maintenance.md#固定通信与状态模板)。小游戏/原生二进制适配、获得提示表现及正式服逐项对照仍待验收。

## 背包数据身份扩展

Item 增加可选字符串 instance_id=3，item_id=1 仍为配置 ID；不得把二者混用。Snapshot 增加可选 timed_inventory=5，内含逐件 TimedItem 和服务器 Unix 秒。旧协议字段号保持不变；两个方向都使用原 WS+Protobuf v2，未引入新查询。期限清理和身份规则见[背包说明](bag-mvc-maintenance.md#配置-id记录-id-与期限基础2026-11-03)。

单帧限制为256KB（262144字节），前后端编解码和服务端接收统一约束。300名英雄带四槽、面板与个人战力的真实 WS 容量回归通过。面板的已纳入来源与剩余来源由 `included_sources` 和 `pending_sources` 标注，详情直接显示服务端面板数值。

## 主线完整目录与新挑战范围（2026-11-17）

`MainChapterState`追加可选`uint32 challenge_limit=5`，解码为正整数`challengeLimit`。当前真实状态来自服务端可信`mxzg.main-chapter.challenge-limit`，环境变量`MXZG_MAIN_CHAPTER_CHALLENGE_LIMIT`默认 550。850 个关卡配置通过开放范围限制新挑战。登录、state.changed和重新鉴权沿原Snapshot下发，SessionSnapshotService重建最终revision时保留范围与原里程碑集合，不增加请求或第二份主线状态。

缺字段表示范围未同步/历史未记录，不能把Protobuf默认0解释为当前上限，也不能在客户端补9。当前范围缺失时禁全新挑战；已经收到的值必须为正uint32。maxCleared允许高于当前范围，缩限不删除旧进度。客户端发起新挑战使用最新权威Model，服务端只在新挑战分支校验当前配置；原requestId回执先查、pending先结算、原battleId的claim/replay继续恢复，不受新上限阻断。旧持久回执JSON缺challengeLimit保持null，新回执冻结当时状态；历史范围不能覆盖最新已接纳状态。

MainChapterRules按全局idx装配850关；mode/chapter/mission只作旧敌方配置定位，不是进度身份。MainChapterService传给战场、进度和持久Details.mission的值统一为全局idx，历史字段名不变。`battle.preview`请求/响应中的mission同样表示全局idx；场景`audit:lineup:<idx>`、`chapter:lineup:<idx>`与`idle:chapter:<idx>`使用严格正十进制索引，保留站位/阵营身份、HP及完整事件校验，不再把三个固定敌方模板当作通用战报契约。挂机仍为最多三名我方、单名怪物初始HP1及仅普攻的既有只读演出，不结算资产。

服务端按实际开放段预检敌方配置、战斗、首通发奖和后续挂机快照。挂机收益配置已覆盖850关，新挑战默认连续第 1～550 关。提高上限前核对连续依赖，玩家资格仍由权威主线状态校验。

第551～850关的三维定位存在源表差异，保留待确认标记。服务端遇到不唯一的敌方定位时拒绝构建战场。各关覆盖与阻塞见 [最新依赖审计](validation/main-chapter-dependencies-20261117-stage20.json)。

### 第5关纯表现与显示完成边界

服务端仅通用接纳原动画/资源/声音皆空、无震屏或遮罩的type1，保留必中且无下游动作的预检；非空type1与未知分支仍拒绝。它继续发送原presentation，不生成额外damage、逻辑Buff或新协议字段。客户端真正空type1本体不启动角色动作、帧或声音，delay为0时立即完成，非零delay仍等待配置；不能因该本体为空而丢弃旧覆盖的其他子动作。2050100在旧actions中展开为[空type1、真实type3]，原buffart还保留独立2050300表现，两路均应消费，不能合并成一次或删除其中之一。

旧Java的CBuffArt.setBuffs在Cache装配时将非逻辑Buff前置；新版既有PB保留原表声明顺序，包括寒冬普攻2050100→2050200伤害→2050300。本批不改该wire顺序、伤害或统计，不能把新版声明顺序称作旧服务端实际执行顺序。同技能纯表现按配置delay并行；type3/5/6/7/9独立帧按attack_time启动、到原寿命自行释放，与角色动作完成分开。第9关接线同时纠正type5完成边界：原投射帧数、飞行时间和节点归属保留，角色不等待投射/帧全部完成；停止、迟到和独立帧错误仍沿同一战场清理。该修正不修改PB顺序或伤害，也不据此宣称全类型等价。

第5关历史批次的三怪完整技能、空动作及资源核对当时不扩大cap3或开放领取；浏览器关闭、迟到和故障注入的实际结果应另有本机证据，不能由上述契约提前签收。

正式挑战开场只调整客户端演出，不新增Frame字段或重算战报：先准备真实资源并将模型opacity设0，ZDKS 2.5秒后双方出场帧并行0.75秒，全部结束再并行淡入模型1秒，最后显示HP、消费原战报。旧版淡入与出场帧并行，本次改为顺序属于负责人新授权；idleEncounter时序不变。此前异步加载时可见场地中的模型闪现已从资源/隐藏边界修正，type8原音效也纳入预载；本轮独立64008角色实际布阵后挑战第2关并胜利结算，最终cleared=2、pending=null、真实战斗数1；两个FX期间模型opacity为0且HP隐藏，FX后渐入1秒，七阶段观察断言通过。该观察不改变协议或证明全1～9关视觉已验，见[本批记录](validation/chapter-player-entry-preview-20261117.json)。

### 第9关场地移动与固定暴击属性依赖

type8沿原ClientBuffHandler纯表现链及既有presentation事件传递，服务端保留必中、无下游动作的预检，不借角色移动生成额外damage。客户端1051101按旧actions拆为type8和延迟15帧的type6，两路保留原音效、时长和资源。`moveOffset`仅是客户端播放计划的角色坐标比例，不是协议字段；双轴必须显式为0..1，敌方X按1−x镜像，与type9的`battlefieldOffset`及type2/11目标近身分别处理。比例缺失明确拒绝，不猜0或某个目标点；特效按生成时施法者当前坐标定位，不持续跟随返回中的角色。

本关固定暴击增减仍复用原属性Buff实例链，不新增协议或修改统计。服务端只接type160、attach_percent=10000、无子动作、`207|整数|0|0`且非负整数期限的已核实形式，保持原整数加减与负值，不把固定-1250改成乘区或夹零；其他属性、概率或条件形式继续拒绝。这里的207是属性编号，不表示泛化接通所有同名事件或其他玩法。

实际本关只核101040051:1/1051101及三怪六技能；通用parser没有自动逐一对照所有旧覆盖，1051102及后续等级仍待审核。第9关历史批次维持cap3和领取关闭，详见[该批检查](validation/chapter-stage9-review-20261117.json)及[画面记录](validation/chapter-stage9-preview-20261117.json)。本次连续1～9关与local领取是后续明确授权，WS＋Protobuf无新字段；[原帧证据](validation/chapter-stage9-assets-20261117.json)不代替新入口、开场、发布包或真机验收。

## 主线里程碑权威进度与下一目标（2026-11-16）

`MainChapterState`追加可选`milestone_progress=4`，解码为`milestoneProgress={schemaVersion:1,claimedIds:[]}`。claimedIds是旧chapterextrareward配置idx的真实已领集合，采用正整数、唯一ID并排序冻结；旧3008允许乱序领取，因此不能改成lastId、最大已领ID、顺序计数，也不能从maxCleared推断。

V27建立`game_main_chapter_milestone(role_id,reward_id)`，复合主键、角色外键及正数约束保存唯一事实。当前没有3008写入口，独立新版不迁移旧玩家，角色锁内查表为空就是真实未领；读取不插入占位行、不补默认进度、不递增revision。MainChapterService.current与现有挑战/结算共用角色锁；SessionSnapshotService为对齐最终assetRevision重建子状态时透传同一milestoneProgress，登录、state.changed及重新鉴权继续走原Snapshot，不增加查询请求或Model。

显式schema1且claimedIds空数组表示已同步未领取；可选字段缺失表示该领域尚未同步，不能补为空集合或显示默认第一项。存在但未知格式、重复或非法ID拒绝整包。旧持久回执JSON缺字段保持null，不反查新集合改写历史；新回执State自然冻结当时集合，也不能回写当前状态。胜利页showResult只读取最新已接纳的MainChapterModel.state，与登录配置包内的ChapterExtraReward及语言投影下一目标，不使用历史receipt.state覆盖最新已领集合。

ChapterMilestoneUtils按配置idx升序选择最小未领项，以绝对目标关卡减当前maxCleared得到非负差值；已达成未领仍停在该项，全部已领清空提示。配置、语言或权威集合缺失时明确显示不可用，不猜奖励。ChapterEndView的完整Prefab已在旧show_rich挂点绑定独立静态RichText；本次获得区域、升级附赠和下一目标分别显示，不把目标当作本次到账。第15关是首个可到达的目标。达标后可在主线常显卡使用独立领取，资格、快照确认与反馈见 [里程碑](main-chapter-milestone.md)。

本轮后端持久化16项、真实WS3项共19项通过，4份Java→TS真实帧互通通过，覆盖空集合、非连续集合、主键/正数/归属约束、只读版本、旧回执缺失和登录/提交事件/重新鉴权保留扩展。限定Creator闭环中，真实通关1/2后下一目标分别为再通14/13关。同一第2关原回执/战报的只读显示重放中，结果页约4.03秒关闭后统计窗仍保留，资产不变；冷第3关首次进主线仅交一次通用升级反馈，未额外打开胜利页。显示重放不算新战斗或再次发奖，以上不扩大为里程碑实际领取、后续关卡、真机或发布包验收。见[本批检查](validation/chapter-milestone-review-20261116.json)、[本机记录](validation/chapter-milestone-preview-20261116.json)及[旧源码审计](validation/chapter-milestone-legacy-audit-20261116.json)。

## 主线挂机只读快照（2026-11-06）

Snapshot.main_chapter_idle（字段9）随登录/鉴权恢复和state.changed统一下发，没有开页查询。MainChapterIdleState提供server_time、started_at（Unix秒）、max_seconds、frequency、reward_stage及rates。rates为每frequency秒的同源基础资源量，前端仅换算每分钟，不是已到账资产。

11-14已替换早期“首次胜利/快照补建”生命周期：首次真正受理主线挑战在角色锁和同一事务中初始化game_main_chapter_idle起点为now-initialSeconds，失败战斗正常提交也保留；已有起点、重连、挑战胜利与结算均不重置。已通关却缺累计明确拒绝，不由快照补免费起点。新表与已暂停的game_idle/game_campaign隔离；旧IdleService.claim不得接回。服务端新领取能力及local/全局开关边界见下节。

### 新挂机领取与持久回执（2026-11-14）

Frame oneof新增31～34，MainChapterIdleState新增可选claim_state=9；不复用已有字段号。领取请求只收规范UUID request_id与显式正expected_operation_version；操作版本沿int64安全整数，实例ID继续字符串。request_id跨超时/重连不变，Frame.id仍只关联一次传输。

Receipt schema1带请求/回执ID、消费版本前后、统一计算秒/原起点/实际秒数/VIP上限/关卡、提交asset_revision、理论量、完整强类型实际到账及经验动画。实际结果明确分开满级/封顶忽略、升级附赠、钱包/库存前后、酒馆上限及真实期限/精灵实例；不塞JSON载荷或当前Snapshot。数据库另存AuditV1完整输入/候选/累计及摘要，未知格式或损坏不重算。

claim_state提供schema_version、operation_version和READ_ONLY/ENABLED，由当前可信领取开关决定；它不是完整收益ready预报，不因登录展示而读取全部权益。缺字段/未知schema不能允许领取；客户端未知schema仅丢弃这项能力并限频记录，旧挂机演出继续。开关`mxzg.main-chapter.idle-claim-enabled`全局默认false，application-local.yml默认true，可用MXZG_MAIN_CHAPTER_IDLE_CLAIM_ENABLED显式覆盖。玩家通过 MainChapterSession.claimIdle 发起收取，主线模块将页面显示期交给 IdleClaimBinding.begin，不新增协议、队列或资产写入口。点击仍要求已同步ENABLED、旧65秒门槛及真实冒险点状态；满冒险点复用ConfirmView，取消不建journal，确认后再核连接/操作版本。服务端保留60秒受理门槛，不把按钮可点击当作服务端免校验。

服务器在角色锁内再次鉴权，先识别已完成的请求，再检查新请求的开关、版本和输入。服务端保留持久回执和幂等，查询与重放不抽样、不推进版本。玩家确认后 MainChapterController 只提交一次 requestId 和 expectedOperationVersion；普通掉线由重连快照更新资产与累计。成功回包供仍打开的原页面按实际秒数播放收取，实际量与实时奖励事件使用同一 receiptId。活动控制缺失时拒绝计算；本机两服的开服资料及044未发布状态由外部配置提供。详见 [领取事务](main-chapter-idle-settlement.md)。

AssetStateBinding提交任何模块前校验主线与挂机快照；MainChapterController.onNotify校验后提交Model。客户端经过时间只用于显示且封顶，领取实际量始终由服务器在原事务中重新计算。关卡收益使用maxCleared而非下一关，也不使用最近一次通关奖励。


### 挂机选人快照补充（2026-11-06）

MainChapterIdleState新增slots（字段7）与lineup_version（字段8）。slots最多三项，复用FormationSlot的hero_id与position；必须是同一统一快照mainFormation的子集，版本必须相同。服务端在角色锁内按主阵容版本持久化随机选择，客户端不得重新抽人或自行改站位。该快照只支持显示，不表示已下发挂机战报或允许领取收益。


## 主线挂机演出协议（2026-11-06）

### 护盾耗尽移除贯通（2026-11-17）

本批复用既有`BattleReplayEvent.removal_reason=13`，没有新增协议字段、请求或计算。服务端已输出的九种原因是`expire`、`death`、`replace`、`dispel`、`trigger-limit`、`shield-depleted`、`break-ice`、`pure-heart`、`counter-crit`；客户端只接纳这份真实白名单，未知原因继续拒绝整份战报。`shield-depleted`还必须在同一phase后续找到同targetId的damage，不能跨技能开始/结束边界借用命中；规则同时覆盖技能内伤害和回合开始流血。不把Buff移除当成额外伤害或治疗。

原始PB顺序保持耗尽移除在对应damage之前，致死时随后才有其他尚存实例的death清理；耗尽事件携带原实例ID、期限及吸收前最后的buffValue，不能要求该值为0。播放器只安排显示依赖：等待对应目标该次命中完成后，移除耗尽实例；同一实例的重施/移除按顺序，不同目标保留并行，death仍等该技能表现完成。实际血条用actualHpChange，飘字用reportedHpChange，统计读取战报冻结值；不修改PB事件顺序，不用当前属性重算。关页/停止使在途旧回调失效，不能在重开后移除新实例。

两个样本由真实执行器和生产PB映射器生成，使用已支持的`audit:lineup:1`名册，属性明确为边界夹具，不冒充玩家持久阵容或自然关卡。存活样本中盾实例1耗尽后重新生成实例3，真实输出统计1300、敌方承伤1500，攻方报告治疗1000、敌方输出100；致死样本的命中实际-400、报告-900，显示后依次移除耗尽实例1和独立死亡实例2，真实输出300、承伤400、攻方报告治疗500。这些反直觉数值沿原计算保留，不能将耗尽事件中的盾值100再加一次；护盾数值语义仍归[BRULE-002](battle-known-issues.md)。

31项后端相关检查及两份Java→TS真实PB互通通过，限定本机开发独立入口已检查图标、重施、致死和统计。统计复用同一真实`ChapterEndView.openStatistics`方法调用，只读底板没有可见战报按钮，未将其记为点击按钮。全程不连接账号、不发奖；仅存活首盾为截图等待控制时序，后续自然播放，致死样本无门闩。取消样本在真实盾显示时以可控Promise停住，关页再释放后事件数保持4→4、completed=false，roots/residents/opening/intents/modalActive均为0。此历史结论不覆盖所有护盾技能、正式服、真机或发布包；该护盾批次当时仍关闭领取。见[本批检查](validation/shield-depleted-review-20261117.json)和[本机记录](validation/shield-depleted-preview-20261117.json)。

### 结算展示数据补充（2026-11-09）

BattleReplayUnit新增可选total_damage=9、total_taken_damage=10，随不可变战报冻结。输出伤害沿旧HeroFightLog累计abs(actualHpChange+absorbed)，承伤累计实际扣血绝对值。负责人确认沿用该口径，护盾规则疑点继续保留。旧战报缺失统计时显示为缺失，禁止从飘字或当前英雄属性反推。

ChapterReceipt新增可选experience=5，包含发奖事务前后的等级、等级内经验与升级门槛。成功发奖时与settlement_json同事务持久化，重复领取返回原值；历史回执缺失时不补造。客户端先校验整包再提交MainChapterModel，该快照只供结算展示，不能覆盖角色/资产Model。

统计页补充可选total_recovery=11和star=12。治疗沿旧BattleContext.replenish→HeroFightLog.addRecovery，把修正后治疗量记给施法者，包含溢出治疗、保留负号，不能按实际回血或飘字另算。星级来自该场输入，不从当前名册补历史。新战报明确写入0治疗，旧战报缺字段返回null并显示—；双方任一单位缺某项时该项进度条不显示比例，已知数字仍保留。统计页没有新增业务请求，也不触发再次结算。

治疗顺序事件kind=recovery复用actual_hp_change/reported_hp_change/dead字段，不新增字段号。服务端在治疗发生处同时记录累计量与顺序事件，事务失败一并回滚；双方均按原事件顺序验证生命。actual为实际变化，reported为含溢出的旧报告量，dead固定false；拒绝复活、越过死亡边界、超过最大生命或实际量与溢出上限不符的记录。客户端血条使用actual，飘字和统计使用reported，不重算或请求奖励。2026-11-09真实主线只增加冰晶女巫2031301至2031303直接治疗覆盖，不能解释为全部治疗技能开放。

- `chapter.idle.encounter`：鉴权后空请求，返回 `IdleEncounter`（Frame字段30），包含stage、assetRevision、lineupVersion、强类型BattleReplay。沿用WS＋Protobuf，无HTTP或JSON回退。协议名遵守小写分段规则。
- 服务端在角色锁内读取当前已通关关卡与持久挂机选择，随机取该关卡一条非空怪物配置，首行动序号按0..2抽取后对英雄数量取模。双方只用普攻，怪物初始HP=1；挂机使用旧独立阵型1，保留原站位和元素加成。常规玩家来源随当前连续第 1～550 关进度，挂机仍仅消费原普攻配置；缺配置或未支持分支明确拒绝。
- 场景标识 `idle:chapter:N` 与 `chapter:lineup:N` 挑战战报分开。演出不写主线战报、不领奖、不推进关卡、不增加资产版本。客户端校验完整生命事件链、最多三名我方和一名敌方、普攻类型，以及当前关卡/阵容/资产版本后才播放。
- 此请求只在行军路程到达遇敌点后发出，不查询角色/背包。失败不伪造击杀；下一次行军到遇敌点才重试。页面关闭或进入挑战取消本页演出，连接切换仍由通信和应用层隔离。

战报外观快照（2026-11-09负责人确认）：BattleReplayUnit.portrait_icon_id=13为可选正整数资源ID；服务端在开战构建时按历史星级/进化状态解析并随原战报字节持久化，回看不重算。旧战报缺字段或客户端尚未收录该资源时，统计页显示基础模板头像并明确提示降级，不查询当前名册。该差异是负责人确认的历史一致性选择，未开放进化/皮肤操作，也未完成所有历史皮肤资源还原。

### 主线历史双方名称

BattleReplay追加可选attacker_name=7、defender_name=8，不复用字段号。主线挑战在同一角色锁内读取昵称与同源language章节名，按旧BattleHandler的43100+chapter及全局关卡idx组合敌方名，随战报二进制一次持久化。回看与领奖不重查名称；角色改名不影响历史。旧字段缺失返回null，统计页显示“历史名称未记录”；明确记录的空字符串保留为空。客户端拒绝超过128字符或含控制字符的名称，避免异常协议破坏标签布局。当前只接主线统计入口，挂机与只读演示不伪造双方名称。
