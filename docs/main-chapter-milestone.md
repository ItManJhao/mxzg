# 主线里程碑领取与通用英雄获得反馈

更新：2026-11-17。负责人授权恢复完整第15关独立里程碑领取；它与逐关首通结算、挂机宝箱是三条不同业务，共用既有资产事务、统一快照和通用奖励队列。当前新挑战默认连续1～20关，完整850关目录及六项里程碑配置不表示后续关卡或其他玩法已开放。本批没有集中构建或提交推送，Creator已完成第15关真实领取、原回执只读重放及关闭/重登的限定复验，见[本机记录](validation/chapter-stage10-20-preview-20261117.json)；不代签所有星级和目标平台。

## 旧规则和本次保留的边界

旧服务端`BattleHandler.chapterExtraReward`（3008）按原配置idx判断目标已通关且未领，不要求先领更小idx，也不要求当前首通待结算为空。原`rewardIds`是配置ID集合，不能由最大已领ID、列表下标或通关数推导。正常旧客户端只展示最小未领配置项：未达标显示绝对关卡进度，达标按钮直接发送3008，没有另开确认或详情窗。

| 原配置ID / rewardId | 绝对通关目标 | 原配置奖励 |
|---|---:|---|
| 100 | 15 | 英雄10105007 ×1 |
| 150 | 30 | 900102 ×500 |
| 200 | 50 | 900102 ×800 |
| 300 | 80 | 1001012 ×1 |
| 400 | 110 | 英雄10205011 ×1 |
| 500 | 140 | 英雄10105007 ×1 |

六项都从同源`chapterextrareward`读取，不维护另一份奖励清单。当前常显卡可到达的第一项为15关；30及以后仍受实际挑战范围限制。旧3008使用`NoticeType.SLIENT`发奖，回复实际奖励和heroList，由回复驱动通用获得表现；因此新版不再额外发布一条竞争的`reward.granted`。旧链、配置及具体行号见[旧源码核对](validation/chapter-milestone-legacy-audit-20261116.json)，该历史证据中的“只读/入口关闭”只表示11-16当时范围。

## 服务端事务与持久回执

[MainChapterMilestoneRules](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterMilestoneRules.java)装配六项原配置，验证目标存在于全局主线目录，并保存`chapter-milestone-v1:<SHA-256>`内容版本。[MainChapterMilestoneService](../backend/src/main/java/com/funsgamex/mxzg/campaign/MainChapterMilestoneService.java)只受理认证角色和一个正`rewardId`，客户端不提交角色、奖励或是否达成。

一项里程碑每个角色只领取一次，因此**roleId＋rewardId本身就是稳定业务键**，无需额外随机requestId。`Frame.id`仍只是单次网络往返编号。新领取在原角色锁及READ_COMMITTED事务内完成：

1. 鉴权、锁角色后重新鉴权，先查同键成功回执。已有结果直接返回，不重新核当前资格、重新读奖励配置或创建英雄。
2. 读取唯一主线状态及V27真实已领集合。已有集合项但没有V28回执时明确返回`MILESTONE_ALREADY_CLAIMED`，不猜旧奖励、不补造成功历史。
3. 对新请求检查配置存在及`maxCleared >= targetChapter`，预检全部奖励的共享发放能力。允许其他已达成项乱序领取，不人为加入客户端排序限制。
4. 调用原`RewardGrantService`，同事务写资产、V27已领集合并通过`AssetSyncService`递增统一revision；任一写点失败全部回滚。
5. 冻结本次实际明细、历史主线状态、目标关卡和规则版本，校验非负安全整数及身份后保存[V28](../backend/src/main/resources/db/migration/V28__main_chapter_milestone_receipts.sql)成功回执。提交后沿原统一状态推送，不另发实时奖励通知。

V28表`game_main_chapter_milestone_receipt`以`role_id/reward_id`为主键，原receiptId唯一，保存assetRevision、原JSON与SHA-256。读取同时核对摘要、列/载荷身份、版本及已领项。JSON只是内部持久格式，网络仍为强类型Protobuf二进制。旧结果不因新配置、英雄成长、缩小challengeLimit或当前资产变化而重算；没有成功回执的失败不占用领取ID。成功回执不设缓存TTL，不能通过删去重记录实现“重新领奖”。

## 唯一协议

契约为[protocol/game.proto](../protocol/game.proto)，沿现有WS子协议`mxzg.protobuf.v2`，没有业务HTTP或库存查询回退。

| 消息 | 请求 | 结果 |
|---|---|---|
| `chapter.milestone.claim` | `ChapterMilestoneClaim { rewardId }` | `ChapterMilestoneReceipt`，重复同键返回原结果 |
| `chapter.milestone.claim.status` | 同一个`ChapterMilestoneClaim { rewardId }` | `{ rewardId, found, receipt? }`，found=false不写资产或集合 |

Frame字段36/37/38分别承载请求、成功回执和查询结果。成功回执格式1包含`rewardId/receiptId/roleId/assetRevision/state/actual/targetChapter/rulesVersion`。`actual`复用原`RewardGrantResult`，不新造奖励计划或第二份资产。锁等待失败为`MILESTONE_BUSY`，资格/未知配置/历史已领分别为明确业务原因，不能把异常当found=false。协议登记与收包入口为[Protocol](../client/assets/scripts/platform/Protocol.ts)、[GameProtocolCodecUtils](../client/assets/scripts/platform/GameProtocolCodecUtils.ts)及[GameSocketHandler](../backend/src/main/java/com/funsgamex/mxzg/network/GameSocketHandler.java)。

V27的`MainChapterState.milestoneProgress`继续是唯一权威已领集合：显式空claimedIds表示真实未领，字段缺失/旧回执null表示未同步。历史receipt.state只用于说明当次提交，不回写最新MainChapterModel，也不用maxCleared补造集合。

## 客户端确认、恢复与常显卡

[MainChapterMilestoneController](../client/assets/scripts/features/battle/MainChapterMilestoneController.ts)登记两条实际协议，命令进度放原[MainChapterModel](../client/assets/scripts/features/battle/MainChapterModel.ts)，不增加角色Model或第二份已领集合。应用[MainChapterMilestoneBinding](../client/assets/scripts/app/remake/MainChapterMilestoneBinding.ts)负责身份隔离、发包及持久意图，View不持凭证或直接修改资产。

点击前通过[MilestoneClaimJournal](../client/assets/scripts/app/remake/MilestoneClaimJournal.ts)保存格式1及rewardId，按认证区服/角色和稳定客户端实例隔离；存储失败不发请求。它复用原生持久操作存储核心，但不改变挂机journal的格式或requestId语义。认证恢复只处理真实已有意图：先查询同rewardId，未找到才按原稳定键重发claim；不因为快照可领而自动创建领取。

成功展示需同时满足已校验原回执、最新统一快照revision至少为receipt.assetRevision，以及最新权威集合确含该rewardId。应用另核对回执角色，真实新英雄随原统一快照进入唯一HeroRosterModel，不能由奖励窗口补写。状态先到或回执先到均等待另一方，丢推送复用重新鉴权首包。模块回调允许Promise，同回执在途交付合并；反馈失败保留原结果，普通状态推送不无限循环重试，显式恢复才重试原反馈。

持久意图在共享队列最后一部分真正打开后才按原键条件删除，排队不算已经显示；展示已发生但删除失败只重试清理，不等待被去重的第二份奖励。换号先撤销旧异步引用、关闭旧反馈，再激活新身份；旧回调不清新记录。关闭主线页只清卡片监听和骨骼，不取消已发资产事务或删除持久意图。

[MainChapterMilestoneCard](../client/assets/scripts/features/battle/ui/MainChapterMilestoneCard.ts)直接绑定在原[MainChapterView.prefab](../client/assets/bundles/module/battle/prefabs/MainChapterView.prefab)：保留常显目标，按最小未领配置ID显示原模型、名字、原框和进度；英雄模型使用原10105007骨骼，按旧原生Hero加载比例0.5再乘Cell比例`0.67×0.8×1.42`。达标按钮直接转交MainChapterController.requestMilestoneClaim，不新建里程碑详情/确认弹窗。未同步不能当全领完，全部已领才撤卡；战斗期间沿主线原显示期隐藏，事务继续由应用恢复。

## 共享英雄发奖和反馈

第一项奖励是真实item.type=7英雄，不能放进普通背包堆叠。[HeroGrantService](../backend/src/main/java/com/funsgamex/mxzg/hero/HeroGrantService.java)在外层角色锁事务创建独立game_hero：UUID、原模板、等级1、模板原星级、阶段0，并刷新原永久阵容及统一版本。第15关10105007原星级5。旧HeroProcessor奖励链不做召唤入口的容量检查，新版同样允许奖励超过名册显示容量；单笔至多1000实例是整单拒绝的技术保护，不截奖、不自动开放召唤玩法。

`RewardHeroGrant`固定`instanceId/templateId/level/star/stage`。真实新实例列表保存在`RewardGrantResult.heroes=10`及原成功回执，通用`RewardNotice.heroes=9`可复用同类型。解析校验实例ID唯一、成长值合法且同模板实例数量与实际credited对应；回执/通知内容指纹包含这些冻结实例。历史非英雄结果缺该重复字段规范化为空，不能据当前名册猜本次新增。

双确认后应用调用原`RewardBinding.restoreActual`投影，沿**同一个RewardModel队列、原receiptId**显示。队列按旧高星优先逐个打开通用[HeroRewardView](../client/assets/scripts/features/reward/ui/HeroRewardView.ts)（此处的英雄获得反馈窗口，不是新发奖服务），再显示剩余物品或RoleUpgradeView；已展示的英雄不再在普通RewardView重复算一格。高星页使用原揭幕、英雄/光柱/光环、名字/技能及获得音效，低星走原单格形式；页面只读冻结实例，关闭停止音效、骨骼、帧与迟到加载，不负责召唤或资产写入。

这补齐的是通用英雄获得反馈，里程碑复用它，不另造里程碑专用奖励窗、专用奖队列或toast代替完整获得表现。普通RewardView、RoleUpgradeView及SILENT/TIPS既有契约保留：里程碑事务自身静默，成功原回执经已确认的恢复入口显式投影POPUP。普通主线正常bonus-only、冷all和挂机的原反馈仍复用原链，不能顺带重发奖励。

## 本批验证与未签收范围

本轮[MainChapterMilestoneServiceTest](../backend/src/test/java/com/funsgamex/mxzg/MainChapterMilestoneServiceTest.java)9项与[MainChapterMilestoneSocketTest](../backend/src/test/java/com/funsgamex/mxzg/MainChapterMilestoneSocketTest.java)1项通过：资格/未知ID、真实英雄一次入库、乱序资格、原回执冻结、历史集合缺回执、跨角色、同键并发、容量语义、回执写失败与协议安全整数失败均验证原子性；真实WS覆盖状态通知、断线重新鉴权、status及重复同键不二次发奖。与主线配置9项、挂机目录3项合计本轮22项，不将此前回归数重复相加。

客户端`chapter-milestone-claim`6组与`chapter-milestone-card`专项通过，覆盖真实Java PB互通、状态/回执双确认、冷恢复同键、坏英雄明细、展示失败重试、换号迟到和常显卡资源/进度/清理；严格类型检查通过。Java独立H2样本仅输出到忽略目录`backend/target/chapter-milestone-review.json`及claimed/status/snapshot三份PB，不是生产账号资产或可移植测试凭据。实际Creator领取、通用高星画面、完整20关自然成长及目标平台尚不能由这些结果代签；本批不做发布构建，也不修改日常角色资产。
