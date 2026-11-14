# 新主线挂机累计与领取事务

更新：2026-11-14。**V24累计状态、V25成功回执及服务端领取/status事务与强类型协议已实现；日常开关和客户端按钮仍关闭，客户端持久待确认尚未接入。** 通用同步/钱包前置已修正；负责人随后授权的2000002最小精灵领域现已实现生成、持久化、统一快照及背包只读详情。V23精灵表和Snapshot实例集合继续保留；本批在其上接真实发奖事务，领取和养成仍未向玩家开放；2000002开发GM按11-14后续授权接入真实实例服务，未提交推送。现有纯计算与活动维护事实见[输入契约](idle-reward-input-contract.md)，后续顺序见[实施路线](restructuring-plan.md)。

## 当前基础和本批决定

目前新主线沿用唯一`game_main_chapter_idle`计时表，V24增加随机累计/保底计数/操作版本，V25保存成功领取回执；独立挂机选人记录继续保留。`IdleRewardUtils.Result`是纯候选，不是到账证明；旧简化`game_idle/game_idle_receipt/IdleService`不能复用为新领取链。`chapter.claim`仍只负责挑战结算。

负责人本批确认：

- 恢复旧版首次计时：**首次挑战前**建立`started_at = frozenNow - 60`，之后挑战失败、首次胜利、结算及重登不重置。已在首次真正受理挑战的同一角色锁事务中实施，失败战斗正常提交也保留起点。
- 保留两个门槛：**客户端65秒才允许点击，服务端60秒起接受**。客户端门槛不能代替服务端校验，也不把65秒写进收益公式。

首次挑战前建时钟不等于允许未通关领取。当前新版未通关无挂机快照，旧客户端也因无已通关配置而不进入挂机；旧服务端却存在回退第1关的分支。方案保持现有玩法入口范围：未通关不开放领取，不借这次计时修正开放旧服务端旁路。若未来要恢复该旁路，须另行确认，不能称当前已完全等价。

## 当前实现入口与开放边界

- `MainChapterIdleStateRepository`是累计唯一持久入口；`MainChapterService`只在首次挑战创建，领取由`MainChapterIdleClaimService`在READ_COMMITTED事务中消费。
- 服务器开关为`mxzg.main-chapter.idle-claim-enabled`，可由`MXZG_MAIN_CHAPTER_IDLE_CLAIM_ENABLED`配置，默认false；只有独立测试显式开启。本批不要求负责人开启日常环境或重启后端。
- 新请求关闭时返回IDLE_CLOSED；命中历史成功回执及status查询先于开关、当前权益、时长和版本判断。锁等待失败返回IDLE_BUSY，不能伪装NOT_FOUND。
- `AuditV1`固定请求/归属、累计前后、完整计算Input/分窗/加成/理论量及真实结果，并保存SHA-256摘要和关键列交叉校验。未知格式或损坏拒绝，不重新计算。返回回执全部数值在提交前校验JS安全整数。
- 客户端目前仅登记协议/编解码及只读claimState投影；没有新增领取发包、持久journal或按钮交互。当前挑战/布阵pending仍只有内存，后文客户端恢复方案仍待实现。

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

新主线首次挑战的角色锁事务在冻结战斗输入前保证计时行存在，并同事务登记资产版本；已有通关角色只读取并校验原累计，缺行明确拒绝，不借挑战补免费起点。它不依赖完整活动输入，不发奖。挑战事务整体失败则初始化也回滚，后续成功受理挑战再建立；战斗失败结果正常提交则保留起点。

已有V17计时行保留原`started_at`，不能重新写成`now-60`或倒推未记录的首次挑战时间。未通过任何新领取事务的旧计时行，其新累计秒/计数初始化为0、空，操作版本从1开始：这是“新链未结算”的明确初值，不是旧玩家迁移或无活动兜底。缺行角色不能在领取请求中临时创建一份可领时长；有通关记录却无计时行时明确拒绝并排查。

新协议上线后，普通快照读取不再悄悄补建领取状态。登录只投影已有状态；创建、消费、修正由明确写事务负责。`MainChapterIdleService.snapshot`现已改为只读原累计，不再补建；因此独立测试中人工准备已通关进度时，也必须显式准备真实计时行。

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

`Frame.id`只关联一次网络往返，重发可变化；业务`request_id`代表一次领取意图，跨超时/重连不变化。`asset revision`是统一状态版本，`operation_version`只说明挂机消费状态，二者不得互相替代。请求指纹固定编码请求格式、消息名及expected版本；同一个已提交请求键异内容拒绝，并先于当前权益/版本判断。

现有`MainChapterIdleState`时间、rates、slots、lineup_version保留；已新增可选claim_state=9嵌套领取状态，包含格式版本、持久operation_version和明确的只读/允许请求模式。字段缺失、未知格式或默认0均不代表可领；当前request_mode为READ_ONLY/ENABLED。客户端对未知schema仅丢弃这项可选能力并限频记录，继续旧挂机演出。服务器开关保持关闭时，即使内部状态已建也不开放按钮；“允许请求”只表明协议及入口启用，不承诺本次完整权益输入一定可用。

只读快照不为计算“ready”而查询世界/礼包/三活动整套输入，避免未初始化活动阻断现有登录与挂机演出。只读rates也不升级为完整收益预报。客户端不需要窗口/保底的第二份权威副本。

普通业务失败沿现有Failure回包；后续为版本冲突、未到最低周期、前置未知、未开放、忙/锁超时、请求冲突明确分类。status与claim一样，在数据库事务内通过RoleRepository锁角色并重新鉴权，再查回执；不能只拿进程内锁或先查再锁。status不创建状态、不装配权益、不改revision。没有持久处理中记录时不虚构`PENDING`；锁超时返回BUSY，不能当成NOT_FOUND。`NOT_FOUND`只表示查询这一刻尚无已提交回执，不能证明原网络包以后不会到达。

### 最新状态与历史展示分开

`Snapshot`和`state.changed`已包含`main_chapter_idle`，继续复用。收到receipt只更新命令确认/历史展示，不能拿历史余额、旧起点、旧等级覆盖当前Model。统一快照仍经`AssetStateBinding`校验整包，再由模块Controller.onNotify提交唯一Model、最后通知View。

成功消耗挂机状态时，无论资产最终是否有正增量，都调用同事务`AssetSyncService.changed`一次；现实现同事务同角色去重递增统一revision。否则新的起点/operation_version会被GameSocketClient与AssetStateBinding的旧/同版过滤丢弃。回执重放/status查询不增加revision。

完成状态确认条件为已收到匹配receipt，且**统一快照revision至少为receipt提交revision、operation_version至少为receipt.after**；相等不是必需，其他合法操作可能已推进。不能仅看金币是否增加。快照先到则等回执，回执先到则等快照；丢通知时通过现有重新鉴权首包恢复，不重建inventory.list/session.sync。

## 单次领取事务

新领取服务使用现有角色锁和同库事务，不把纯候选放入一个事务、资产放另一个事务。采用READ_COMMITTED，保持角色行锁作为本角色资产写入的串行边界。

1. 校验信封/请求形状，取得认证角色；锁`game_role`后重新鉴权，防止等锁期间会话撤销。按角色和request_id查询成功回执，核对指纹后直接返回；**这一步先于当前开关、权益可用性、expected版本和时长检查**，已提交结果不因当前活动失效或暂时关闭入口变成未领。
2. 仅对新请求检查入口开关、当前玩法资格、计时/累计格式及expected版本；不从缺行补免费起点，不因按钮禁用而省略后端校验。相同版本的两个不同请求只允许一个提交，后者明确版本冲突，不能悄悄按新起点再领。
3. 在锁内捕获一次`frozenNow`，从本次发奖前主线、角色及累计状态装配完整Input。先使用同次VIP上限截时并校验最低周期，再取得完整权益与适用结果；规则/输入无法确定整次拒绝，起点和计数不变。
4. 输入冻结后不再刷新权益。先预检**全部可能奖励**的类型、发放配置及支持能力，再调用现有纯装配一次；不能等概率抽到未支持类型才随机失败。候选生成后的倍乘/余额/合并数值仍须检查，失败回滚但不声称随机源倒退。符文等实例生成属于后续真实发放计划，需冻结其新增随机结果。
5. 在同一事务通过实际类型发放入口写钱包、角色经验/升级附赠、库存或实例；任何配置、容量、实例或SQL失败均回滚。禁止部分奖入账后跳过错误项，也不在提交后异步补发剩余奖。
6. 保存纯候选的窗口秒/计数，写`started_at=frozenNow`和`operation_version=before+1`，带旧版本条件更新必须恰好影响1行。调用AssetSync.changed（内部资产服务重复调用仍同角色去重），读出提交revision，保存完整实际结果和成功回执。回执写入或摘要校验失败同样回滚全部资产与状态。
7. 数据库提交成功后才返回成功、发统一状态通知。提交后通知/回包失败不补发；重连通过原请求键取原回执。快照读取可能清理期限物品或刷新阵容，返回revision可高于领取revision，不能把这份后来状态改写进历史回执。

实际SQL语句顺序可为约束/外键微调，但不能改变“同一原子提交”的边界。资产服务不得开独立REQUIRES_NEW发奖或写外部不可回滚存储。服务器故障若无法确定事务提交结果，客户端保留原请求，由持久回执解决，不凭异常文字判断未领。

### 与其他维护事务的锁关系

领取先锁角色，再读取主线、累计和资产记录；重复获得同一角色锁不另建并行事务。活动维护目前锁区服及控制，领取只读其一次完整已提交投影，不持有区服/控制写锁，不能增加“角色→区服”和“区服→角色”的反向等待。世界快照使用已提交采样，不是全服锁；礼包等角色权益写入若后续恢复，必须遵守角色锁。

活动在读取后发布新revision，不追溯重算已冻结Input；这是一份已提交控制快照的领取，不承诺全服同一物理瞬间的跨表快照。回执保存确实使用的控制和世界信息，便于追溯。实例发放不能在角色锁内跨服务网络调用。

## 真实发奖能力与阻塞项

不能直接调用旧`IdleService.claim`：它仍写简化`game_campaign`经验，不是新版角色经验。`MainChapterRewardService.Plan`仍只表示持久战报冻结的前三关首通内容，字段与历史摘要不变；内部已委托`RewardGrantService`，不能将首通奖励内容当作挂机计划。

| 结果类型 | 可复用能力或实际缺口 |
|---|---|
| 金币/钻石 | 已修正RoleRepository.creditCurrency：事务内FOR UPDATE读取两余额，分别Math.addExact全部校验后一次写入；不把两币种相加判断奖励有效性。任一溢出不写另一币种，也不推进revision |
| 角色经验900003 | 复用RoleExperienceService.credit及RoleRules真实升级规则，冻结前后经验与升级钻石；满级忽略须记录，不能写game_campaign.role_exp |
| 英雄经验900101、普通装备/碎片等 | 复用InventoryService中确已支持的类型入口；余额存储不等于开放英雄升级或穿脱 |
| 酒馆点900401 | 按领取时最高已通关关卡冻结chapterreward.tavern_point_max，当前前三关均11000；与首通Plan的上限同源，但不复用首通奖励内容。先合并同物品理论量，再按正剩余额度截取，已超上限不倒扣；冻结实际量及原因，不能任意inventory.credit |
| **月兔精灵·蓝2000002（旧RUNE/item.type=8）** | 普通group1001的掉落表10013会产生，前三关同样可能命中。SpiritRules/SpiritInventoryService在可信外层事务中逐件生成并保存真实实例；已接共享发奖并直接返回真实UUID、能力与技能，未接新领取回执，不能把内部服务当成已开放领取 |
| 期限物品 | 当前普通＋三活动奖励ID未命中期限配置；若规则扩大到该类型，复用TimedInventoryService及已确认上海自然日规则，不降格普通库存 |

实际普通＋三活动奖励ID并集15项，各自生成/分发能力不能以“纯计算全通”代替整次原子发奖。本批已收敛共享发奖及实际结果，后续将真实结果与新领取回执同事务冻结；资格和幂等仍各归业务。不扩展养成/穿脱入口。旧内部RUNE/符文与背包显示“精灵”指同类实例，下面按实际中文名称描述。

### 已实现的共享发奖与实际明细（11-14）

入口是`reward/RewardGrantService`，只接受服务端可信最终理论量、同一次业务冻结的服务器秒/酒馆上限及随机源。加成逐条取整归现有纯规则，最终同ID用精确加法合并后才分发。`requireSupported`已由MainChapterIdleClaimService在抽奖前调用：按本关基础资源、当前group全部正权重掉落及冻结适用活动行导出候选，不手写15ID清单；缺正权重表或总权重溢出也在抽样前拒绝。

明确支持真实item.type的1/2/3/5/6/11、已恢复的2000002精灵及三种已有期限配置（type16，mode17）；特殊类型核对实际ID，其他类型拒绝，无默认堆叠分支。普通装备/碎片仍按配置堆叠，不新建装备实例。合并后精灵及期限实例单次各至多1000件，为整单拒绝的技术保护，不是持有容量，不裁剪奖励；当前15ID没有期限物品。

`RewardGrantResult`保留每项requested/credited/ignored及减少原因，包括满级经验与零到账酒馆点；另保存经验前后、实际接纳/忽略量、升级附赠钻石、钱包前后、普通库存稳定身份/余额、酒馆冻结上限及期限/精灵真实实例。普通库存保留历史`stack:`字符串ID，不能统一改成UUID。实例明细直接来自写入口，不调用会清理过期项的完整快照来猜测到账。

共享入口加入外层事务，不拥有业务请求ID或持久幂等；直接重复调用仍会再次发放。调用方须先查成功回执，发奖后在同一事务保存结果；失败整体回滚，提交后由既有AssetSyncService统一推送。历史结果与当前资产快照分离，后续改资产或清理过期项不能改写回执。前三关首通已复用此分发，当前协议仅返回实际基础量和原经验动画，挑战协议仍未新增该详细结果；本批独立的挂机领取协议及V25回执已完整携带和保存它。

酒馆新角色缺记录时仍从新版既有0余额计算；旧TavernInfoService按system.tavern_initial_item初始化（当前共享表为2000，旧常量默认3000但会被配置覆盖）。这一初始化差异保留为后续酒馆恢复缺口，不在共享发奖时悄悄补发。

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

当前挑战/布阵pending只有内存状态，不能照搬后宣称跨应用重启可靠。拟在应用层增加最小持久待确认记录，复用现有请求/状态通路，不保存第二份资产：

1. 发包前先持久保存原请求格式、request_id和expected版本；按已认证区服/角色及稳定客户端实例分命名空间，不存token。存储失败则不发送，否则无法保证跨重启恢复；不同标签页/实例不能相互覆盖待确认记录。
2. 应用层负责按认证身份激活记录，并通过既有AccountService认证交付隔离旧连接。Controller/View不比较角色键，不复制owner方案。换号清内存，原身份持久记录保留；切回后才继续原意图。
3. 超时、掉线、服务端未知错误都保留原请求。重新鉴权统一首包后查指定status：COMMITTED恢复历史回执；NOT_FOUND仍只重发原body、原request_id，不能换编号或自动修改expected版本。
4. 明确版本冲突说明旧expected已不能消费，先核对统一快照及请求结果后结束该旧意图；下一次用户操作才能建立新编号。请求指纹冲突、损坏journal或不认识的格式停止自动重试并明确记录，不静默丢弃后再领。
5. 前置暂不可用/未到最低周期不保存成功回执、不推进状态；保留原意图并提示失败原因，后续重试仍用原请求。不能仅凭Failure.retryable=false就判定所有同编号在途副本均不会提交。以后若要“取消待确认操作”，须单独设计服务端持久取消边界，本批不虚构取消成功。
6. 收到并校验匹配回执且统一快照达到确认条件后，仅在命名空间、request_id和原请求指纹均匹配时条件清理该待确认记录；不能按身份整项删除，避免同身份旧请求A删掉后来请求B。历史receipt可供当前展示，不能重新提交资产；旧身份迟到回调也不能清理新身份记录。

持久回执只保证**已提交**请求的结果稳定；未提交且回滚的请求不产生成功记录，可以用原内容重试，并使用重试受理时一次冻结的服务器时间/权益。不能描述成“第一次失败也永久冻结收益”。客户端有待确认操作时不并行创建第二个新领取意图。

## 分步实施与验证条件

通用同步/钱包、最小精灵领域及共享可信发奖/实际明细已实现。新累计状态、回执和服务端协议事务已实现并消费真实发奖；下一步补应用层持久待确认及双向状态确认，再按单独授权连接按钮。以下仍是**完整领取完成条件**，本批已覆盖部分见[事务证据](validation/main-chapter-idle-claim-review-20261114.json)，不能把服务端/H2/WS结果推定为客户端恢复、MySQL、发布包或真机已验收。

| 类别 | 必须验证 |
|---|---|
| 初始化/迁移 | 首次挑战前仅建一次；失败战斗保留；胜利不重置；旧started_at保留；未通关不旁路领取；缺行/未知格式明确拒绝 |
| 时间/累计 | 0/59/60/64/65/119秒；VIP上下界、超限丢弃、负时钟；43199→43200整窗和跨多窗；基本尾数与随机累计分别核对 |
| 关卡/权益 | 挑战待结算时按最新通关关；升级使用发奖前Input；礼包到期秒、活动边界/缺行、世界失效；换关保底延续 |
| 幂等/并发 | 同ID同内容重放；同ID异内容；两个ID同expected只有一个成功；角色锁超时；提交后服务端重启；旧回执在权益失效/入口关闭后仍可恢复 |
| 原子性 | 每个资产/计数/回执写点注入失败；零正奖励仍消费版本；升级、截顶、实例生成中途失败无部分资产；回执损坏不重算 |
| 发放范围 | 枚举当前全部可能奖励类型；符文真实实例及随机属性/实例ID重放不变；酒馆满额/部分截顶；满级角色经验、升级附赠分别追溯 |
| 协议/恢复 | proto生成无漂移及TS/Java互通；新增字段缺失仍只读；回执/通知任一丢失、顺序颠倒、journal写失败/损坏、同身份A/B确认交错、多实例存储隔离、重登换号及旧连接迟到 |
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
