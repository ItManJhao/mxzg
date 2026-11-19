# 新主线挂机累计与领取事务

更新：2026-11-19。创角即开始累计。本机 local 宝箱领取已接通，客户端65秒可点，冒险点满额先确认，服务端从60秒起受理。通用服务配置默认关闭。玩家确认后，主线控制器只提交一次领取。服务端保留持久幂等及真实发奖记录，累计和资产随状态推送或重连首包更新。

前端持久原单、查询回执和自动重发已退役。11-14、11-16的历史证据见[持久基础](validation/idle-claim-client-recovery-review-20261114.json)及[原恢复联调](validation/idle-claim-live-recovery-review-20261116.json)。11-17本机玩家入口见[入口检查](validation/chapter-player-entry-review-20261117.json)。

## 当前关卡目录、收益投影与开放范围

主线配置目录与挂机基础收益投影现均覆盖原表全局idx 1～850，不能再将`idle-rules.json`理解为仅20关的清单。[export_idle_rules.py](../tools/export_idle_rules.py)按原`chapterreward.reward_base/drop_group`逐行导出全部难度，拒绝重复、断档及非法奖励；[IdleRules](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleRules.java)仍只做纯计算，不持有玩家进度。第21关使用自己的基础收益（首项270，20关为260），不沿用第20关封顶量；这些数值是一次基础周期的配置量，不是每秒量或全部权益后的到账承诺。

实际新挑战独立由`mxzg.main-chapter.challenge-limit`限制，当前默认连续1～20关，通过`MainChapterState.challengeLimit`同步。850行可查询不等于开放850关，也不等于所有关卡战斗或发奖依赖已验收。[MainChapterRewardService](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterRewardService.java)只对真正开放范围启动预检战斗敌方、首通奖励及后续挂机投影；未知依赖明确拒绝。旧pending和成功回执仍可在缩小新挑战范围后恢复，旧快照缺challengeLimit表示未同步，不能默认0或猜成全开。551～850的原奖励/敌方三维映射歧义仍待确认，不能用note擅自修正；最新静态闭包范围见[关卡依赖审计](validation/main-chapter-dependencies-20261117-stage20.json)。

挂机实际领取仍按锁内最高已通关全局idx读取该关收益，未通关不旁路领取。全目录导出会改变普通规则及组合输入的内容版本；**已提交V25回执只校验原审计自身、摘要和列，不要求等于当前规则版本，也不重新抽样或发奖**。新领取才冻结当前规则。第15关里程碑使用独立稳定配置键和V28回执，不与挂机requestId、累计版本或首通结算混用，见[里程碑完整链](main-chapter-milestone.md)。

本轮`MainChapterConfigurationTest`9项（含连续1～20真实挑战/结算及各关配置敌方技能导出）、`IdleCatalogTest`3项、里程碑事务9项及真实WS1项共22项通过。挂机目录检查逐行覆盖850配置、跨20关的独立基础量和其他难度；它不证明未开放关卡的玩家挑战、实际收益全类型发放或本机画面通过。本批Creator实测由统一验收记录另行给出，不在此提前签收。

## 当前基础和本批决定

目前新主线沿用唯一`game_main_chapter_idle`计时表，V24增加随机累计/保底计数/操作版本，V25保存成功领取回执；独立挂机选人记录继续保留。`IdleRewardUtils.Result`是纯候选，不是到账证明；旧简化`game_idle/game_idle_receipt/IdleService`不能复用为新领取链。`chapter.claim`仍只负责挑战结算。

负责人本批确认：

- **创角即开始挂机。** 2026-11-19 按负责人观察到的正式服新号流程调整。计时起点取服务端角色创建时间减去旧配置的初始 60 秒。首次挑战、首胜、结算和重登均保留这段累计。
- 保留两个门槛：**客户端65秒才允许点击，服务端60秒起接受**。客户端门槛不能代替服务端校验，也不把65秒写进收益公式。

角色尚未首胜时，统一快照下发累计起点和 VIP 时长上限，收益关卡为 0，速率和遇敌阵容为空。首胜后按已通关关卡计算收益并下发领取能力。客户端使用公共 ServerClock 的当前时间减去累计起点，并按上限截断。新领取需要当前时钟有效，服务端仍在受理事务中核算真实时长。[公共服务器时间](network-contract.md#公共服务器时间)

## 当前实现入口与开放边界

- `MainChapterIdleStateRepository` 读取创角时间或已有累计。`MainChapterService` 在首次受理挑战时将同一起点写入累计表，之后由 `MainChapterIdleClaimService` 在 READ_COMMITTED 事务中消费。
- 服务器开关为`mxzg.main-chapter.idle-claim-enabled`，可由`MXZG_MAIN_CHAPTER_IDLE_CLAIM_ENABLED`配置；通用配置默认false，local默认true，可显式关闭。2026-11-17已按授权更新本仓本机服务，生产配置未自动开放。
- 新请求关闭时返回IDLE_CLOSED；命中历史成功回执及status查询先于开关、当前权益、时长和版本判断。锁等待失败返回IDLE_BUSY，不能伪装NOT_FOUND。
- `AuditV1`固定请求/归属、累计前后、完整计算Input/分窗/加成/理论量及真实结果，并保存SHA-256摘要和关键列交叉校验。未知格式或损坏拒绝，不重新计算。返回回执全部数值在提交前校验JS安全整数。
- 宝箱点击交给 `IdleClaimBinding.begin`。满冒险点时打开通用确认框，确认后由 `MainChapterController.claimIdle` 发送命令、接收回包、通知原页面播放及交通用奖励。

本机开服资料与三活动控制曾实际缺失，不能只打开按钮。负责人已确认local-1、local-2优先沿用原值，缺失时使用上海时间2026-11-17零点，044明确未发布。只读核对两服原值均空后，配置保存在忽略提交的`backend/.local/idle-activity.yml`，由原维护服务初始化和周期维护；`dev.ps1 run`自动载入既有文件，不替其他区服猜日期。维护方法和上线前资料边界见[活动控制](idle-activity-maintenance.md)。

## 旧规则如何进入新事务

以下时间均为Unix秒；计算时间从服务器捕获一次，礼包、活动、VIP和实际发放共用这次时刻，不重复读取客户端时间。旧入口先后读两次时钟的微小差异不复制。

| 项目 | 当前事务语义及旧依据 |
|---|---|
| 时长 | `elapsed = frozenNow - startedAt`；负数作为状态/时钟异常拒绝，不能改成免费初始时长。`seconds = min(elapsed, 本次领取前VIP上限)` |
| 最低领取 | 服务端要求`seconds / frequency > 0`，当前frequency=60；0～59秒不改起点、不抽样、不存成功回执 |
| 基础奖励 | 使用`floor(seconds/60)`；成功后起点直接写`frozenNow`。例如119秒只结1次基础奖励，59秒不留待下次；超出VIP上限的时间也不保留 |
| 随机累计 | 将**截顶后的完整seconds**交给现有纯计算，包含基础奖励舍弃的尾数。例如119秒会累计119秒，不能只累计60秒 |
| 重置窗口 | 保存的是已结算秒数在43200秒窗口中的位置，不是现实世界每12小时定时清理，也不是可补发基础奖励的余数。刚好满窗先结旧窗，再清空该窗数量/未中计数 |
| 保底 | 按`item_group_type`保存原始掉落数量与连续未中次数，换关不清零。先检查类别上限，再保底/概率；一次数量允许越过上限，不能裁成上限后写回 |
| 收益关卡 | 在锁内按本次最高已通关关卡计算整段时间，不逐关分摊。挑战胜利已更新最高关，挑战奖励尚未领取不阻止使用新关卡 |
| 权益与等级 | 使用本次发奖前冻结的VIP、等级、世界、神职、礼包及三活动；本次经验升级不能反过来提高同次活动资格或重新计算收益 |
| 计算顺序 | 直接复用`IdleRewardUtils`：三活动016→034→044抽样，普通随机，神职；神职分项仍按基础→普通分窗→三活动，保留各自取整粒度 |

例如旧窗已累计43170秒，本次可领90秒：先对旧窗30秒按旧`round(30/60)`结算，再清计数，再算新窗60秒；最终窗口秒数60。不能先把90秒合并成一个随机片段，或只因真实时间跨了零点就清保底。

### 计时初始化与已有数据

新角色从 `game_role.created_at_seconds` 开始累计。首次挑战前的登录、重登和状态推送均从该时间推得同一起点，展示无需写库。首次受理挑战时在角色锁内落库并登记资产版本。事务回滚后重试仍从创角时间起算。已有通关记录时必须读取既有累计，缺失即拒绝。

已有V17计时行保留原`started_at`，不能重新写成`now-60`或倒推未记录的首次挑战时间。未通过任何新领取事务的旧计时行，其新累计秒/计数初始化为0、空，操作版本从1开始：这是“新链未结算”的明确初值，不是旧玩家迁移或无活动兜底。缺行角色不能在领取请求中临时创建一份可领时长；有通关记录却无计时行时明确拒绝并排查。

历史角色若创角时间为 0 且没有任何累计记录，首胜前的快照省略时钟，首次受理挑战时沿用当时的服务器时间。尚无累计记录时，未来的创角时间会导致快照和初始化失败，避免写入错误起点。已有时钟始终沿用原值，服务器时间若早于该值，领取返回 `IDLE_CLOCK_INVALID`。人工准备已通关的测试角色时，必须同时准备真实累计行。

## 持久状态与回执

以下字段已由V24/V25实现。扩展现有唯一计时表，不另建一份角色挂机状态；计数单独按类别存储，便于人工查阅。

| 存储 | 当前字段和约束 | 所有者/更新条件 |
|---|---|---|
| `game_main_chapter_idle` | 原`role_id`主键、`started_at`；新增`operation_version`（持久正整数）、`drop_seconds`（0～43199）、schema_version/semantics_version及frequency_seconds/reset_seconds | 新主线挂机服务；成功消费或明确修正才递增operation_version，不因读快照、背包变化、选人或时间自然流逝递增 |
| `game_main_chapter_idle_counter` | `role_id + group_type`主键、`quantity`、`misses`，均非负；角色外键 | 同次纯候选返回后整组替换/删除，跟随计时行同事务提交；不能以关卡或掉落表ID代替旧类别键 |
| `game_main_chapter_idle_receipt` | `role_id + request_id`唯一；`receipt_id`唯一、请求格式版本/内容指纹、before/after操作版本、提交秒、提交资产revision、版本化结果与摘要 | 只保存成功提交的领取；角色与before操作版本再设唯一约束，防止不同request_id消费同一版本 |

`quantity`统计普通原始掉落，不含VIP/神职/活动加成；`misses`记录该类别连续未中。缺类别可表示尚未触发的0，但持久非法类别/负数不能当空；保留跨关类别，不能只加载当前关卡使用的类别后丢弃其他项。窗口格式或重置规则不兼容时停止新领取，不能用当前配置自动取模并清空计数。

选人仍归现有`game_main_chapter_idle_lineup`和阵容版本；遇敌战报不消耗累计状态。挑战结算、普通库存变化可能推进资产revision，但不推进挂机操作版本。技术修正若消费/改写累计状态，也必须增加操作版本并记录依据，不能让旧expected版本继续有效。

### 成功回执冻结什么

服务端存储版本化审计结果，不能把Java当前类的隐式序列化布局当永久格式：

- 请求名、请求格式、原`request_id`、`expected_operation_version`及规范内容指纹；指纹不含token、连接ID、Frame.id或客户端时间。
- 认证角色/区服、receipt_id、统一计算秒、旧起点、实际seconds、当时VIP上限、奖励关卡、操作版本前后及提交资产revision。
- 完整冻结Input和规则内容版本：世界实际采样值及时间、礼包原记录、三活动控制/期次/revision/适用原因/Drop，不能只存进程generation或配置文件名。
- 计算前后窗口/计数、普通分窗与三活动原始结果、各加成分项、最终理论奖励；继续保留既有Result的粒度。
- **真实发放结果**：酒馆截顶/满级忽略等处理原因、实际钱包/库存变化、独立实例ID与属性、经验前后和升级附赠。理论奖励、实际到账和升级附赠分开，不能据前端背包差值猜奖励。

历史重放直接读取并校验存储格式/摘要、归属和原请求指纹；不重读当前权益，不重新计算，不重新生成符文，不再次推进任何版本。存储损坏或未知格式明确拒绝，不能以重算补回执。

本方案不设成功回执自动TTL；以后若归档，原请求键、指纹、版本与可恢复结果必须仍可定位。删除去重记录后重新抽样不是“清缓存”。客户端页面/资源缓存策略与回执持久化无关。

## 协议与状态归属

消息已写入唯一契约`protocol/game.proto`：Frame新增31～34，分别是领取请求、指定回执查询、历史领取回执和查询结果；已生成TS/Java并验证互通，不新增业务HTTP、JSON或Base64回退。

| 已实现消息 | 客户端可提交 | 服务端成功结果 |
|---|---|---|
| `chapter.idle.claim` | `request_id`、`expected_operation_version` | 冻结领取receipt：请求/回执ID、计算时刻/秒数/关卡、操作版本前后、提交资产revision、理论与实际奖励的必要展示数据及经验展示 |
| `chapter.idle.claim.status` | 指定`request_id` | `COMMITTED`及原receipt，或角色锁内确认的`NOT_FOUND`；只查指定业务操作，不查询库存或重新计算 |

角色来自认证上下文，不接收客户端角色、收益列表、关卡、时长、加成、随机种子或保底。操作版本须为显式存在的正整数；跟随当前int64安全整数校验，超过JS安全范围必须拒绝，不能静默舍入。持久实例ID仍以字符串传输。

`Frame.id` 关联网络往返，业务 `request_id` 由主线控制器为本次确认生成，服务端据此识别重复提交。`asset revision` 排序统一快照，`operation_version` 校验本次累计是否仍可消费。相同请求键携带不同内容会被拒绝。

通用 `RewardNotice` 保留可选的 `request_id=7` 作为请求关联。实时 `reward.granted` 与即时回包的实际量经同一奖励队列按 `receipt_id` 去重，资产版本达到要求且界面就绪后展示。

同一通知追加可选`role_upgrade=8`（RewardRoleUpgrade），运行时为`roleUpgrade:{beforeLevel,afterLevel}`，afterLevel须严格更高。摘要只从原actual.experience连续链的首尾等级提取并冻结，不读取最新角色等级或由升级赠钻反推。服务端及客户端校验安全整数、requested＝accepted＋ignored、等级不倒退、同级无升级赠钻、升级有实际接纳量，以及相邻前后等级/本级经验连续。原回执身份不变，通知和历史恢复的内容指纹均包括升级等级；不得为升级另建一笔反馈身份或队列。

现有`MainChapterIdleState`时间、rates、slots、lineup_version保留；已新增可选claim_state=9嵌套领取状态，包含格式版本、持久operation_version和明确的只读/允许请求模式。字段缺失、未知格式或默认0均不代表可领；当前request_mode为READ_ONLY/ENABLED。客户端对未知schema仅丢弃这项可选能力并限频记录，继续旧挂机演出。服务器开关保持关闭时，即使内部状态已建也不开放按钮；“允许请求”只表明协议及入口启用，不承诺本次完整权益输入一定可用。

只读快照不为计算“ready”而查询世界/礼包/三活动整套输入，避免未初始化活动阻断现有登录与挂机演出。只读rates也不升级为完整收益预报。客户端不需要窗口/保底的第二份权威副本。

普通业务失败沿现有Failure回包；后续为版本冲突、未到最低周期、前置未知、未开放、忙/锁超时、请求冲突明确分类。status与claim一样，在数据库事务内通过RoleRepository锁角色并重新鉴权，再查回执；不能只拿进程内锁或先查再锁。status不创建状态、不装配权益、不改revision。没有持久处理中记录时不虚构`PENDING`；锁超时返回BUSY，不能当成NOT_FOUND。`NOT_FOUND`只表示查询这一刻尚无已提交回执，不能证明原网络包以后不会到达。

### 最新状态与历史展示分开

`Snapshot`和`state.changed`已包含`main_chapter_idle`，继续复用。收到receipt只更新命令确认/历史展示，不能拿历史余额、旧起点、旧等级覆盖当前Model。统一快照仍经`AssetStateBinding`校验整包，再由模块Controller.onNotify提交唯一Model、最后通知View。

成功消耗挂机状态时，无论资产最终是否有正增量，都调用同事务`AssetSyncService.changed`一次；现实现同事务同角色去重递增统一revision。否则新的起点/operation_version会被GameSocketClient与AssetStateBinding的旧/同版过滤丢弃。回执重放/status查询不增加revision。

权威状态通过正常 `state.changed` 或重连鉴权首包提交。即时成功回包触发收取演出。通用奖励队列仍以 `assetRevision` 等待对应资产版本。

## 单次领取事务

新领取服务使用现有角色锁和同库事务，不把纯候选放入一个事务、资产放另一个事务。采用READ_COMMITTED，保持角色行锁作为本角色资产写入的串行边界。

1. 校验信封/请求形状，取得认证角色；锁`game_role`后重新鉴权，防止等锁期间会话撤销。按角色和request_id查询成功回执，核对指纹后直接返回；**这一步先于当前开关、权益可用性、expected版本和时长检查**，已提交结果不因当前活动失效或暂时关闭入口变成未领。
2. 仅对新请求检查入口开关、当前玩法资格、计时/累计格式及expected版本；不从缺行补免费起点，不因按钮禁用而省略后端校验。相同版本的两个不同请求只允许一个提交，后者明确版本冲突，不能悄悄按新起点再领。
3. 在锁内捕获一次`frozenNow`，从本次发奖前主线、角色及累计状态装配完整Input。先使用同次VIP上限截时并校验最低周期，再取得完整权益与适用结果；规则/输入无法确定整次拒绝，起点和计数不变。
4. 输入冻结后不再刷新权益。先预检**全部可能奖励**的类型、发放配置及支持能力，再调用现有纯装配一次；不能等概率抽到未支持类型才随机失败。候选生成后的倍乘/余额/合并数值仍须检查，失败回滚但不声称随机源倒退。符文等实例生成属于后续真实发放计划，需冻结其新增随机结果。
5. 在同一事务通过实际类型发放入口写钱包、角色经验/升级附赠、库存或实例；任何配置、容量、实例或SQL失败均回滚。禁止部分奖入账后跳过错误项，也不在提交后异步补发剩余奖。
6. 保存纯候选的窗口秒/计数，写`started_at=frozenNow`和`operation_version=before+1`，带旧版本条件更新必须恰好影响1行。调用AssetSync.changed（内部资产服务重复调用仍同角色去重），读出提交revision，保存完整实际结果和成功回执。回执写入或摘要校验失败同样回滚全部资产与状态。
7. 数据库提交成功后返回成功并发送统一状态通知。通知或回包缺失时，重连鉴权首包恢复已提交状态。后来快照的 revision 可以更高，历史回执保存提交时结果。

资产、累计和回执始终在同一原子提交内。客户端遇到未知结果时提示查看同步后的挂机状态。

### 与其他维护事务的锁关系

领取先锁角色，再读取主线、累计和资产记录；重复获得同一角色锁不另建并行事务。活动维护目前锁区服及控制，领取只读其一次完整已提交投影，不持有区服/控制写锁，不能增加“角色→区服”和“区服→角色”的反向等待。世界快照使用已提交采样，不是全服锁；礼包等角色权益写入若后续恢复，必须遵守角色锁。

活动在读取后发布新revision，不追溯重算已冻结Input；这是一份已提交控制快照的领取，不承诺全服同一物理瞬间的跨表快照。回执保存确实使用的控制和世界信息，便于追溯。实例发放不能在角色锁内跨服务网络调用。

## 真实发奖能力与阻塞项

不能直接调用旧`IdleService.claim`：它仍写简化`game_campaign`经验，不是新版角色经验。`MainChapterRewardService.Plan`表示生成权威战报时冻结的该关首通内容，已接配置目录及独立开放范围，不再固定前三关；原计划字段与历史摘要不变。内部已委托`RewardGrantService`，不能将首通奖励内容当作挂机计划。

| 结果类型 | 可复用能力或实际缺口 |
|---|---|
| 金币/钻石 | 已修正RoleRepository.creditCurrency：事务内FOR UPDATE读取两余额，分别Math.addExact全部校验后一次写入；不把两币种相加判断奖励有效性。任一溢出不写另一币种，也不推进revision |
| 角色经验900003 | 复用RoleExperienceService.credit及RoleRules真实升级规则，冻结前后经验与升级钻石；满级忽略须记录，不能写game_campaign.role_exp |
| 英雄经验900101、普通装备/碎片等 | 复用InventoryService中确已支持的类型入口；余额存储不等于开放英雄升级或穿脱 |
| 酒馆点900401 | 按领取时最高已通关关卡冻结chapterreward.tavern_point_max，当前前三关均11000；与首通Plan的上限同源，但不复用首通奖励内容。先合并同物品理论量，再按正剩余额度截取，已超上限不倒扣；冻结实际量及原因，不能任意inventory.credit |
| **月兔精灵·蓝2000002（旧RUNE/item.type=8）** | 普通group1001的掉落表10013会产生，前三关同样可能命中。SpiritRules/SpiritInventoryService在可信外层事务中逐件生成并保存真实实例；已接共享发奖并在新领取成功回执冻结真实UUID、能力与技能，不能把内部领域及关闭入口的恢复机制当成已开放领取 |
| 期限物品 | 当前普通＋三活动奖励ID未命中期限配置；若规则扩大到该类型，复用TimedInventoryService及已确认上海自然日规则，不降格普通库存 |

实际普通＋三活动奖励ID并集15项，各自生成/分发能力不能以“纯计算全通”代替整次原子发奖。共享发奖及实际结果已收敛，MainChapterIdleClaimService已将真实结果与V25成功回执同事务冻结；资格和幂等仍各归业务。不扩展养成/穿脱入口。旧内部RUNE/符文与背包显示“精灵”指同类实例，下面按实际中文名称描述。

### 已实现的共享发奖与实际明细（11-14）

入口是`reward/RewardGrantService`，只接受服务端可信最终理论量、同一次业务冻结的服务器秒/酒馆上限及随机源。加成逐条取整归现有纯规则，最终同ID用精确加法合并后才分发。`requireSupported`已由MainChapterIdleClaimService在抽奖前调用：按本关基础资源、当前group全部正权重掉落及冻结适用活动行导出候选，不手写15ID清单；缺正权重表或总权重溢出也在抽样前拒绝。

11-14该批已支持真实item.type的1/2/3/5/6/11、已恢复的2000002精灵及三种已有期限配置（type16，mode17）；特殊类型核对实际ID，其他类型拒绝，无默认堆叠分支。11-17因第15关里程碑完整接线，共享入口另接type7真实英雄实例创建，详见[里程碑与英雄反馈](main-chapter-milestone.md#共享英雄发奖和反馈)。普通装备/碎片仍按配置堆叠，不新建装备实例。合并后精灵、期限及英雄实例单次各至多1000件，为整单拒绝的技术保护，不是持有容量，不裁剪奖励；11-14列举的15ID没有期限物品，不能将这份历史并集当作850关全量白名单。

`RewardGrantResult`保留每项requested/credited/ignored及减少原因，包括满级经验与零到账酒馆点；另保存经验前后、实际接纳/忽略量、升级附赠钻石、钱包前后、普通库存稳定身份/余额、酒馆冻结上限及期限/精灵真实实例。普通库存保留历史`stack:`字符串ID，不能统一改成UUID。实例明细直接来自写入口，不调用会清理过期项的完整快照来猜测到账。

共享入口加入外层事务，不拥有业务请求ID或持久幂等；直接重复调用仍会再次发放。调用方须先查成功回执，发奖后在同一事务保存结果；失败整体回滚，提交后由既有AssetSyncService统一推送。历史结果与当前资产快照分离，后续改资产或清理过期项不能改写回执。前三关首通也已复用此分发；11-16本地主线增量在原ChapterReceipt追加actual=6，基础rewards和升级bonuses分别保留，正常/冷恢复复用同一明细，见[本批主线记录](validation/chapter-reward-review-20261116.json)。挂机领取协议及V25回执已完整携带和保存真实结果；两条业务的回执身份及资格仍各自管理。

11-14共享发奖批曾保留“缺900401按0”的初始化差异；11-16已由独立TavernPointService/V26恢复旧规则。迁移已有900401记录时按原量保存，合法0和超额都不补差；真正无持久记录才按同源system.tavern_initial_item=2000懒建一次，旧常量3000不作兜底。共享发奖/GM/快照复用唯一领域，不把初值伪装成本次奖励，不改旧成功AuditV1的JSON或hash。旧证据见[初始化与同步核对](validation/tavern-point-legacy-audit-20261116.json)。

Snapshot 字段11 tavernPoints 携带 schemaVersion、adventureCount 和 limit。limit 取同次最高通关关卡，未通关时取第一关。当前值由 AccountModel 保存，历史回执中的冒险点只供展示。满额确认用当前 `adventureCount >= limit`，达到客户端等待门槛并有 ENABLED 能力后才弹出。取消、空白关闭或换号均结束确认，提交的累计版本由服务器校验。酒馆任务及扣点协议暂未开放。

### 已修正的通用事务前置

原AssetSync自定义去重集合没有随REQUIRES_NEW挂起，真实独立H2已复现：提交后期限实例删除成功，内层revision仍被当成外层重复登记而跳过；外层A/内层B的通知也会混批。现已在TransactionSynchronization.suspend/resume中隔离和恢复集合，afterCompletion仅解除同一对象的绑定。普通嵌套、提交后回收、内/外回滚和后续新事务均有专项覆盖。

提交后的通知异常现按角色隔离并记录，不让已提交业务因通知失败报作资产失败，也不跳过同事务其他角色；日志故障同样不改变提交结果。最新快照仍可能因回收/阵容刷新推进独立revision，不因此改写历史回执或省略新领取外层幂等。最初3项定向复现失败，修复后9项同步专项通过；13类75项关联回归通过，最终日志隔离收口后16项同步/钱包复验通过，见[本批证据](validation/idle-settlement-prerequisites-review-20261113.json)。不是75＋16个不同用例，也不替代未来领取事务验证。

### 精灵最小范围已实现

负责人已确认恢复此最小范围：2000002真实生成、持久保存、统一快照及背包精灵分类的只读展示/详情。现在由SpiritInventoryService加入调用方事务并取得真实角色锁；普通InventoryService按item.type=8拒绝堆叠读写，GM旧通用item路径已按11-14后续授权仅为2000002分流至真实实例服务，其余未恢复精灵拒绝；不制造无属性的假精灵。发现既有错误堆叠时拒绝整包，不猜补随机属性或自动迁移。

V23的game_spirit每件保存独立UUID、角色归属、能力/技能及未开放默认字段。Snapshot可选字段10的SpiritInventory显式schemaVersion=1，真实无持有返回空items；老协议缺字段在BagModel保留spiritSynced=false，不能冒充已同步空集合。初始化/推送/重连通过原AssetStateBinding、BagController提交唯一BagModel，不增加库存查询或发放请求。

同一角色单次grant至多1000只是内部技术批量保护，超限在抽样前拒绝，不截奖；不是持有容量。跨调用可持有1001及更多合法实例，专项已验证。外层必须把返回的真实实例结果与将来的业务回执同事务保存；本服务不独立提供操作幂等，重放不得再调用grant。

| 内容 | 当前实际依据及拟定边界 |
|---|---|
| 实例身份 | 持久字符串instanceId、角色归属、item/typeId、单abilityId、技能sort/skillId/level；同配置同属性的两件也独立，不能按itemId去重 |
| 旧新建默认值 | 未穿戴、位置0、经验0、洗练能力0、洗练技能空；保留事实不表示开放这些行为 |
| 容量 | 已核真实发放链无容量限制；分页大小不是容量，不另设本地格子上限或静默丢奖 |
| 随机顺序 | 每件先能力类型，再技能数量，再技能等级，最后技能ID；固定数量单项仍抽样，不因结果确定跳过随机 |
| 2000002技能 | 固定1技能；等级1/2权重8000/2000，各有49个不同技能ID；技能ID权重分别含1/3和1/5，不能均匀抽取。第二技能数组空，不扩大到高稀有双技能的重抽链 |
| 能力 | 4种类型均匀抽，稀有度2对应生命1476、攻击146、防御21、速度5；持久单能力ID，展示按稀有度＋能力ID读配置 |
| 配置闭包 | export_spirit_rules.py定向读三张精灵表及实际item/heroskill/language，保留未标记随机列；输出服务端spirit-rules.json和客户端spirit-display.json，默认检查、--write更新。统一export_gameconfig派生分支复用同一函数，不新增模块资源清单 |
| 幂等与同步 | 同事务插入实例并推进统一revision，读取/重连不重抽；独立实例集合经统一资产入口交唯一BagModel，不在页面维护另一份资产。本批新挂机事务已用V25成功回执冻结结果，开发GM仍保留其自身回执边界 |

旧源码存在描述符与展示类型不一致：真实Java生成/持久/回包始终只有一个能力，另一份proto及Lua描述符却写repeated；单个未packed整数在wire上兼容，但Lua转换保留数组，而RunesTipsCtr按标量查询，可能缺失基础属性展示。这不是“应生成多能力”的证据；新版独立协议应保持真实单abilityId，不引入多能力玩法。旧实际画面未核，保留显示差异记录，不称已经验收。

11-14按正式服将精灵格改为不显示数量，并由BagView打开专用SpiritInfoView。基础属性、数值、技能图标/名称/全文分区读取真实实例；4种能力×98项技能的392组组合继续检查精确特性、技能等级及全文。完整静态Prefab、Widget/统一比例和共享模态负责布局，不运行时拼装。98张原技能图及圆框直接复用并修正历史透明边缘，原UUID保留，见[资源证据](validation/spirit-detail-assets-20261114.json)；养成四按钮只显示未开放说明。前批领域/WS证据仍见[实例记录](validation/spirit-instance-review-20261113.json)，不把这些检查扩称98技能逐项画面或新发布包验收。

## 断线、重启和换号恢复

1. 每次玩家确认提交一笔领取。客户端不写 IndexedDB 原单，不调 `chapter.idle.claim.status`，也不主动重新鉴权或补发。状态查询保留在服务端协议，供原回执验证使用。
2. 状态推送先到就按快照更新累计、冒险点、钱包和库存。回包先到仍等统一快照交付资产。只丢领取回包时可能仍收到通用奖励通知。回包与通知都丢失时，普通重连或冷重登恢复真实到账，旧现场动画不补播。
3. 换号时由 `AccountController` 结束旧请求交付，应用清理确认窗和反馈。现场动画只交给发起时的页面显示期。

服务端按请求键返回已提交结果，并用操作版本保证同一份累计只消费一次。

### 独立真实领取联调

[IdleClaimRecoveryPreview](../backend/src/test/java/com/funsgamex/mxzg/IdleClaimRecoveryPreview.java) 只在测试类路径使用回环地址、随机端口和独立 H2。[idle-claim-live-review.cjs](../client/tools/idle-claim-live-review.cjs) 提供「运行领取检查」按钮，验证正常领取、丢领取回包和丢状态推送。工具复用真实主线控制器、WebSocket 和资产入口。

本批独立 H2 与真实 WebSocket 检查通过，覆盖正常、丢回包与通知、丢状态推送。每次领取只消费一次，重连仅重新鉴权。11-16带原生 IndexedDB 的五组联调使用的是已退役的客户端方案。[11-16历史联调证据](validation/idle-claim-live-recovery-review-20261116.json)

## 现场收取与通用反馈（11-16）

旧版点击满足65秒门槛后，在`BattlePanelLayer.onIdleReward`按点击前时长计算四档，本地重置计时、发送3005并立即播放收取，不等待领取成功回包。5002由`BackpackResponse`直接打开共用奖励窗，3005回复本身不负责弹奖；动画与奖励窗独立进行。`collect-N`之后延迟1.5秒排入`normal-0`，两秒守卫阻止普通刷新覆盖动作，**两个时间都不是弹奖延迟**。源码与精确定位见[收取时序审计](validation/idle-collect-legacy-audit-20261116.json)。

当前主线控制器收到匹配本次点击的成功回包后，发出 `main-chapter.idle-collection`，并把实际发放交给通用奖励队列。收取使用回包的 `seconds/maxSeconds` 选择旧四档，通用奖励随资产版本和界面就绪条件显示。

| 场景 | 当前行为 |
|---|---|
| 原主线页仍打开 | 成功回包后按原档位演出，之后显示最新累计 |
| 成功消费且实际到账为零 | 可以播放现场收取，有实际物品或真实升级时才展示通用反馈 |
| 原页已关、冷重登或回包缺失 | 快照恢复权威数据，原现场动画不补播 |
| 战斗中、正在收取或节点未就绪 | 本次收取画面跳过，通用奖励独立展示 |
| 退出或换号 | 账号层结束旧结果交付，应用关闭旧确认及展示 |

此前现场收取接线的`RewardFeedbackServiceTest`13项与`MainChapterIdleClaimSocketTest`5项共18项通过，验证可选请求关联保留、通用通知无关联、非法关联回滚、同回执异请求冲突、嵌套事务去重及真实WS。协议生成检查及实际Java/TS字节互通通过。另有15套客户端专项及类型检查；Creator现场、重复通知、实际关页与冷恢复已限定复验，详见[本批检查](validation/idle-collect-review-20261116.json)及[本机证据](validation/idle-collect-preview-20261116.json)，不扩大为真机或全档位画面。

### 同一回执的通用升级反馈（11-16新增）

挂机成功通知和即时回包都保留从真实经验提取的升级信息，按原 receiptId 进入同一队列。有真实升级时用 RoleUpgradeView，其余用共用 RewardView。主线正常获胜反馈升级附赠，冷恢复反馈基础量与附赠，角色资产采用权威快照。

正常主线结算由原战斗的展示归属决定反馈。挂机通知和即时回包共用回执编号。第15关里程碑通过即时回包接入同一队列。SILENT 保持静默，TIPS 复用全局飘字。旧 RoleService 对经验升级另发2014，其他经验来源仍需按各自旧流程核对。[通用反馈](reward-feedback.md#升级信息与只读功能预告)及[旧升级审计](validation/role-upgrade-legacy-audit-20261116.json)

升级页下一功能采用负责人确认的旧Lua候选，由现有导出流程生成只读RoleUpgradeFeature并纳入登录配置包；不改OpenCondition实际门槛，不开放或跳转功能。同门槛在旧pairs排序中未规定次序，新版仅稳定保留源表顺序。完整预制体的奖励视口固定134设计单位，冷恢复all多行滚动在此裁剪，不遮住下方预告；普通RewardView保持原表现。

11-16升级反馈批后端`RewardFeedbackServiceTest`17项、`MainChapterIdleClaimSocketTest`5项及客户端`reward-controller`15组、`reward-binding`31组通过；覆盖真实升级PB、空items升级、坏链回滚、同回执内容冲突、等待统一版本、失败重试及身份切换迟到。协议生成无漂移，Java通知分别输出`backend/target/reward-notice.pb`及`backend/target/reward-notice-upgrade-empty.pb`。该批当时的Creator实测及入口关闭边界属于历史记录，后续限定画面见本页顶部的升级证据；11-17的local玩家领取授权不扩大为其他环境或全关卡验收。

## 分步实施与验证条件

MainChapterIdleClaimService 首次提交后发布 `reward.granted`，历史回执查询不发布新奖励。客户端复用通用奖励窗、升级页和确认框，冒险点读取 V26 领域下发的权威数据。开发预览 `previewIdleChest` 只用于演示动画。

以下分别核对服务端事务和客户端同步。11-14服务端证据和历史客户端恢复证据各自保留，本批未做 MySQL、真机、APP、小游戏、崩溃断电或发布构建验收。[服务端事务证据](validation/main-chapter-idle-claim-review-20261114.json)及[历史客户端恢复证据](validation/idle-claim-client-recovery-review-20261114.json)

| 类别 | 必须验证 |
|---|---|
| 初始化/迁移 | 创角开始计时，挑战前重登可见同一起点，失败和首胜保留，既有 started_at 优先，未通关只计时，已通关缺行或格式损坏明确拒绝 |
| 时间/累计 | 0/59/60/64/65/119秒；VIP上下界、超限丢弃、负时钟；43199→43200整窗和跨多窗；基本尾数与随机累计分别核对 |
| 关卡/权益 | 挑战待结算时按最新通关关；升级使用发奖前Input；礼包到期秒、活动边界/缺行、世界失效；换关保底延续 |
| 幂等/并发 | 同ID同内容重放；同ID异内容；两个ID同expected只有一个成功；角色锁超时；提交后服务端重启；旧回执在权益失效/入口关闭后仍可恢复 |
| 原子性 | 每个资产/计数/回执写点注入失败；零正奖励仍消费版本；升级、截顶、实例生成中途失败无部分资产；回执损坏不重算 |
| 发放范围 | 枚举当前全部可能奖励类型；符文真实实例及随机属性/实例ID重放不变；酒馆满额/部分截顶；满级角色经验、升级附赠分别追溯 |
| 协议/恢复 | 生成无漂移及 TS/Java 互通，能力字段缺失保持只读，丢回包或推送后用常规鉴权快照恢复，重连无重复领取，换号隔离旧连接结果 |
| 同步/事务 | 提交后快照恰好回收期限物品或刷新阵容的嵌套事务；每笔真实写入推进正确revision，无重复或漏通知；历史receipt与最新快照分离 |
| 独立数据库 | 独立H2及独立MySQL复验锁、唯一约束、回滚和并发；不能用纯规则测试代替真实事务 |

历史方案批、75/16项同步钱包前置和221/27项活动维护只证明各自范围。11-13精灵批跑过13类88项Java、32项配置/路径/活动/精灵导出、五套相关前端专项、Creator工程类型及Java→TS实际WS帧互通；当时没有新领取事务测试，浏览器详情见[精灵批记录](validation/spirit-instance-review-20261113.json)。本批累计/回执、真实WS与双端检查另见[新事务证据](validation/main-chapter-idle-claim-review-20261114.json)，没有用历史结果代替；仍未运行本批MySQL、日常库或新发布构建。

## 源码阅读入口

新版路径相对仓库；旧版根为`G:/work/FsGame/Demo/mj/program`。下列是本批核对时的定位，行号会随以后实施变化。

| 主题 | 实际入口 |
|---|---|
| 现有时钟/选人 | [MainChapterIdleService](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterIdleService.java)、[V17](../backend/src/main/resources/db/migration/V17__main_chapter_idle_clock.sql)、[V18](../backend/src/main/resources/db/migration/V18__main_chapter_idle_lineup.sql) |
| 累计/成功回执 | [MainChapterIdleStateRepository](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterIdleStateRepository.java)、[MainChapterIdleClaimService](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterIdleClaimService.java)、[V24](../backend/src/main/resources/db/migration/V24__main_chapter_idle_accumulation.sql)、[V25](../backend/src/main/resources/db/migration/V25__main_chapter_idle_receipt.sql) |
| 挑战/结算回执 | [MainChapterService](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterService.java)；challenge/settle/authorizedRole，不复用其历史state更新当前Model |
| 纯候选/输入 | [IdleRewardUtils](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleRewardUtils.java)、[IdleRules](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleRules.java)、[IdleRewardInputService](../backend/src/main/java/com/funsgamex/mxzg/campaign/IdleRewardInputService.java) |
| 发放/经验 | [MainChapterRewardService](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterRewardService.java)、[RoleExperienceService](../backend/src/main/java/com/funsgamex/mxzg/role/RoleExperienceService.java) |
| 精灵真实实例 | [SpiritRules](../backend/src/main/java/com/funsgamex/mxzg/spirit/SpiritRules.java)、[SpiritInventoryService](../backend/src/main/java/com/funsgamex/mxzg/spirit/SpiritInventoryService.java)、[V23](../backend/src/main/resources/db/migration/V23__spirit_instances.sql)、[同源导出](../tools/export_spirit_rules.py) |
| 版本与最新状态 | [AssetSyncService](../backend/src/main/java/com/funsgamex/mxzg/network/AssetSyncService.java)、[SessionSnapshotService](../backend/src/main/java/com/funsgamex/mxzg/network/SessionSnapshotService.java)、[GameSocketHandler](../backend/src/main/java/com/funsgamex/mxzg/network/GameSocketHandler.java) |
| 客户端边界 | [Protocol](../client/assets/scripts/platform/Protocol.ts)、[GameSocketClient](../client/assets/scripts/platform/GameSocketClient.ts)、[AssetStateBinding](../client/assets/scripts/app/remake/AssetStateBinding.ts)、[MainChapterController](../client/assets/scripts/features/battle/MainChapterController.ts) |
| 唯一协议 | [game.proto](../protocol/game.proto)：Frame、Snapshot、MainChapterIdleState，本批已实现本方案两条领取消息 |
| 旧服务端 | `server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/battle/handler/BattleHandler.java:253–280、328–387`；同模块`service/RoleMissionService.java:90–103、155–188、238–257、277–294` |
| 旧按钮/计时 | `client/cocos_mxzg/client/idle/src/layer/battle/BattlePanelLayer.lua:110–115`；同客户端goCoffeeCtr的挂机配置判断 |
| 旧符文实例/酒馆 | `server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/backpack/service/processor/ThingType.java:45`、`RuneProcessor.java:54–79`、`TavernProcessor.java:59–78`；`server/mxzg-server/mxzg-config/src/main/java/com/ayjs/mxzg/config/excel/cache/RunesTypeSysCache.java:46–78` |

本方案不调整已验收的挂机循环、对话、挑战开场、胜利/战报表现，也不开放快速战斗、英雄升级、穿脱或其他玩法。清心概率与护盾疑点继续保留，不因收益方案完成而关闭。
