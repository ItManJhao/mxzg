# 主线里程碑领取与通用英雄获得反馈

更新于 2026-11-20。独立里程碑、逐关首通和挂机宝箱共用资产事务、统一快照和通用奖励队列。新挑战默认连续第 1～550 关。第 15 关的英雄奖励已用 Creator 本机复验领取、关闭和重登。第 30 关复用里程碑 ID `150`，在独立 H2 验证 `900102 ×500` 强化石到账和原回执幂等。[第 15 关本机记录](validation/chapter-stage10-20-preview-20261117.json)

独立测试服和 Creator 本机预览均确认第 50 关实际发放 800 强化石，第 80 关实际发放装备 `1001012 ×1`。测试服重复请求返回原回执，本机领取后常显卡切到下一里程碑。第 100 关的独立通关奖励实领 `20005000 ×50` 和 50 钻石。第 110 关使用两个领取入口，里程碑获得章鱼公主 `10205011 ×1`，独立通关奖励获得装备 `1003005 ×1` 和 `1004005 ×1`。原回执幂等和重登恢复由独立测试服覆盖。[当前进度](development-progress.md#当前验证与边界)

第 111～300 关通过独立测试服复验。第 140 关里程碑（ID `500`）发放烈焰骑士 `10105007 ×1`，该关独立通关奖励发放装备 `1001007 ×1` 和 `1002007 ×1`。第 300 关的独立通关奖励发放 `20005000 ×50` 和 50 钻石。Creator 实领第 140 关烈焰骑士及第 300 关碎片与钻石，原回执幂等和重登由独立测试服验证。[当前进度](development-progress.md#当前验证与边界)

独立测试服复验第 310、320、325、330、340、350、360 关独立通关奖励。Creator 本机实领第 360 关的装备 `1001011 ×1` 和 `1002011 ×1`。第 330 关的挂机掉落组切换和宝箱到账走原挂机领取流程。[挂机领取](main-chapter-idle-settlement.md)

独立测试服复验第 370、375、380、390、400 关独立通关奖励。Creator 本机实领第 400 关的 `20005000 ×50` 碎片和 50 钻石。第 390 关挂机宝箱沿用掉落组 `1015`，独立测试服确认到账及重试回执。[挂机领取](main-chapter-idle-settlement.md)

独立测试服复验第 410、420、425、430、440 关独立通关奖励。Creator 本机实领第 440 关的装备 `1003012 ×1` 和 `1004012 ×1`。本段挂机延续掉落组 `1015`，独立服核对第 425 关宝箱实领与重试回执。[挂机领取](main-chapter-idle-settlement.md)

独立测试服复验第 441～550 关的 13 档独立通关奖励。Creator 本机实领第 550 关 `20005000 ×50` 碎片和 50 钻石。本段沿用挂机掉落组 `1015`。[挂机领取](main-chapter-idle-settlement.md)

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

六项都从同源 `chapterextrareward` 读取。当前默认挑战范围可达第 15、30、50、80、110、140 关的全部六项里程碑。旧 3008 使用 `NoticeType.SLIENT` 发奖，回包的实际奖励和英雄列表驱动通用获得表现。新版沿用回包触发的方式。旧链、配置及具体行号见 [旧源码核对](validation/chapter-milestone-legacy-audit-20261116.json)，其中的“只读/入口关闭”描述的是 11 月 16 日的范围。

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

[MainChapterController](../client/assets/scripts/features/battle/MainChapterController.ts) 接收卡片传入的奖励配置 ID，发送一次领取请求，并把本次成功回包的实际奖励交给通用队列。

服务器在事务内校验资格、记录领取和实际奖励。已领集合及英雄名册由统一快照更新，断线后由正常重连鉴权同步。

奖励队列等待服务端资产版本达到回包版本，再展示本次实际获得的物品及英雄。页面打开时只读当前进度。

普通领取没有客户端持久原单、回执补查或自动重发。若提交成功后丢失直接回包，已领状态以重连后的快照为准。

[MainChapterMilestoneCard](../client/assets/scripts/features/battle/ui/MainChapterMilestoneCard.ts) 按最小未领配置 ID 显示目标模型、名字和进度。达标按钮调用 MainChapterController.claimMilestone，已同步且全部领完后撤卡。战斗期间沿用原显示期隐藏卡片。

## 共享英雄发奖和反馈

第一项奖励是真实item.type=7英雄，不能放进普通背包堆叠。[HeroGrantService](../backend/src/main/java/com/funsgamex/mxzg/hero/HeroGrantService.java)在外层角色锁事务创建独立game_hero：UUID、原模板、等级1、模板原星级、阶段0，并刷新原永久阵容及统一版本。第15关10105007原星级5。旧HeroProcessor奖励链不做召唤入口的容量检查，新版同样允许奖励超过名册显示容量；单笔至多1000实例是整单拒绝的技术保护，不截奖、不自动开放召唤玩法。

`RewardHeroGrant`固定`instanceId/templateId/level/star/stage`。真实新实例列表保存在`RewardGrantResult.heroes=10`及原成功回执，通用`RewardNotice.heroes=9`可复用同类型。解析校验实例ID唯一、成长值合法且同模板实例数量与实际credited对应；回执/通知内容指纹包含这些冻结实例。历史非英雄结果缺该重复字段规范化为空，不能据当前名册猜本次新增。

成功回包由 RewardBinding.restoreActual 投影。共享队列按原 receiptId 去重，优先显示通用 [HeroRewardView](../client/assets/scripts/features/reward/ui/HeroRewardView.ts)，再显示剩余物品或角色升级。高星和低星保留原获得表现，关窗清理音效、骨骼和迟到加载。

里程碑事务静默，控制器用本次成功回包交付通用获得展示。普通战斗胜利后的附赠、冷重登待结算和挂机的实时奖励复用同一展示队列。

## 本批验证与未签收范围

本轮[MainChapterMilestoneServiceTest](../backend/src/test/java/com/funsgamex/mxzg/MainChapterMilestoneServiceTest.java)9项与[MainChapterMilestoneSocketTest](../backend/src/test/java/com/funsgamex/mxzg/MainChapterMilestoneSocketTest.java)1项通过：资格/未知ID、真实英雄一次入库、乱序资格、原回执冻结、历史集合缺回执、跨角色、同键并发、容量语义、回执写失败与协议安全整数失败均验证原子性；真实WS覆盖状态通知、断线重新鉴权、status及重复同键不二次发奖。与主线配置9项、挂机目录3项合计本轮22项，不将此前回归数重复相加。

客户端`chapter-milestone-claim`6组与`chapter-milestone-card`专项通过，覆盖真实Java PB互通、状态/回执双确认、冷恢复同键、坏英雄明细、展示失败重试、换号迟到和常显卡资源/进度/清理；严格类型检查通过。Java独立H2样本仅输出到忽略目录`backend/target/chapter-milestone-review.json`及claimed/status/snapshot三份PB，不是生产账号资产或可移植测试凭据。实际Creator领取、通用高星画面、完整20关自然成长及目标平台尚不能由这些结果代签；本批不做发布构建，也不修改日常角色资产。
