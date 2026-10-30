# P0 协议 stub（B5）

手写类型，不生成 Protobuf，不连真实服。调用仍走 `NetClient.request` → `MockTransport`。

旧 `.proto` 不在本仓库（`server/` 是本机 junction，未入库）。下面的数值 ID 是客户端占位，**不是**旧服消息号。阶段 D 对照旧协议时只改 ID 和编解码，尽量不动 `Proto.*` 的调用方。

D2 的 `?transport=ws` 会按 `docs/h5-websocket.md` 发送线上帧：心跳 **1004** 空体、登录 **1001**、创角 **1002**、进主城后的空 **2001**（拉角色资料：昵称、等级、金币、钻石）、空 **3007**（主线 idx）、空 **3004**（挂机时间）。挂机页领取再发空 **3005**。那是旧桥日志里的号，不是这张占位表。占位 `heartbeat` 仍是 **1002**，只给 Mock，不要改成 1004。线上创角也是 1002，两套不要混。占位 `tower.view` 仍是 **2001**，只给 Mock 的幻境之塔；线上 2001 是另一条角色资料，不要改这张表。占位 `idle.query` / `idle.claim` 仍是 **1301 / 1302**，只给 Mock 挂机；线上 3004 / 3005 是另一条，不要改这张表。占位 `bag.list` / `bag.use` 仍是 **1601 / 1602**，只给 Mock 背包；线上空 c2s 5001 和 s2c 5002 是另一条，不要改这张表。占位 `mail.list` 到 `mail.delete` 仍是 **1701–1705**，只给 Mock 邮件；线上空 c2s 15000 和带回标题、附件的 s2c 15000 是另一条，不要改这张表。占位 `hero.list` / `hero.upgrade` 仍是 **1401 / 1402**，只给 Mock 英雄；线上 c2s 4001（GReqHeroList.page=1）和 s2c 4001 的 GResHeroList 是另一条，不要改这张表。18001 是竞技场 GReqPvpData，不是英雄。占位 `login7.view` / `login7.claim` / `login7.advance` 仍是 **2201–2203**，只给 Mock 七日登录；线上空 c2s 17000（点金 GResBuyGoldLog）是另一条，不要改这张表。线上空 c2s 22000（七日登录 GReqSevenDayLoginData）也不是 2201。线上空 c2s 21010（七日目标 GReqSevenDayTargetList，整帧 `0400000012520000`）也不是 2301。线上空 c2s 12010（成就 GResAchievementList）也不在这张表里。占位 `summon.pull` 仍是 **1501**，只给 Mock 召唤；线上空 c2s 4004（GResHeroSummonCount，整帧 `04000000a40f0000`）是另一条，不要改这张表。英雄列表仍是 4001。不发 4002、4005。不做 58001、58007。线上空 c2s 13044（GReqProphetSummonInfo / GResProphetSummonInfo，整帧 `04000000f4320000`）也不是 1501，也不是 4004。不发 13041、13042、13043。不做 58007、4201。线上空 c2s 4101（GReqHeroJewel / GResHeroJewel，整帧 `0400000005100000`）也不是 4001，也不是 13044。不发 4102、4103、4104、4105、4106、4107。不做 9001。线上空 c2s 4013（GReqIllustratReward / GResIllustratReward，整帧 `04000000ad0f0000`）也不是 4001，也不是 4101。名字像领奖，实为查看。不发 4014。4014 仅 s2c 推送。线上空 c2s 74100（GReqPetInfoList / GResPetInfoList，整帧 `0400000074210100`）也不是 4001，也不是 4013。不发 74101、74102、74103。74105、74106 仅 s2c 推送，不主动发。D3 主城壳只在 s2c 1001 有角色 id 时进入，不把这张占位表改成 28000、50000 那些推送号。

## B4 已经有的，和谁在调

| cmd | MockTransport（B4） | 调用方 |
|-----|---------------------|--------|
| `login` | `ok` / `account` / `token` | Boot |
| `role.enter` | `roleId` / `name` / `level`（默认 MockHero） | Boot |
| `heartbeat` | `serverTime` | NetClient 定时发送，不走 `request` |
| 其它 cmd | `{ ok: true, echo }` | 自检里的 `echo.ping` |

B5 给 login 补了 `serverId`（缺省 1），给 `role.enter` 补了 `ok` / `hasRole`。原字段还在。C1 登录面板会把选中的服务器放进 `serverId`。B6 起，主城「主线」会发 `stage.enter` / `stage.result`。

## P0 清单

| 占位 ID | cmd | 请求 | 响应 | 留给 |
|---------|-----|------|------|------|
| 1001 | `login` | `LoginReq` | `LoginResp` | Boot 登录，带上选中的 `serverId` |
| 1002 | `heartbeat` | `HeartbeatReq` | `HeartbeatResp` | NetClient |
| 1101 | `role.enter` | `RoleEnterReq` | `RoleEnterResp` | Boot；账号 `mock` 默认已有角色，其它账号 `hasRole` 为 false |
| 1102 | `role.create` | `RoleCreateReq` | `RoleCreateResp` | 登录面板「创角」 |
| 1201 | `stage.enter` | `StageEnterReq` | `StageEnterResp` | 主线战报（C3）。界面只打下一关。快速作战也走这条 |
| 1202 | `stage.result` | `StageResultReq` | `StageResultResp` | 主线结算（C3）。撤退传 `win: false`。快速作战传 `win: true` |
| 1203 | `stage.push` | `StagePushReq` | `StagePushResp` | Mock 调试（C15）。从下一关连胜推到 `target`（缺省 70，含本关，最大 200）。每关金币 +10。已经到达则不加金币。关卡号无效是 `STAGE_ID_INVALID` |
| 1301 | `idle.query` | `IdleQueryReq` | `IdleQueryResp` | 挂机预览（C4）。不改钱包 |
| 1302 | `idle.claim` | `IdleClaimReq` | `IdleClaimResp` | 领取挂机（C4）。太短则 `IDLE_EMPTY` |
| 1401 | `hero.list` | `HeroListReq` | `HeroListResp` | 英雄名册（C5）。空名册先种下起步三名。不改钱包 |
| 1402 | `hero.upgrade` | `HeroUpgradeReq` | `HeroUpgradeResp` | 英雄升级（C5）。扣金币。不足 `HERO_GOLD_SHORT`，满级 `HERO_LEVEL_MAX`，没有这名英雄 `HERO_NOT_FOUND` |
| 1501 | `summon.pull` | `SummonPullReq` | `SummonPullResp` | 召唤（C6）。`count` 为 1 或 10。扣钻石。不足 `SUMMON_DIAMOND_SHORT`，次数不对 `SUMMON_COUNT_INVALID` |
| 1601 | `bag.list` | `BagListReq` | `BagListResp` | 背包（C7）。只列数量大于 0 的道具。不改钱包 |
| 1602 | `bag.use` | `BagUseReq` | `BagUseResp` | 使用道具（C7）。默认 1 个。金币袋加金币，经验药水给领队加经验。不可使用、数量不足、空背包会拒绝 |
| 1701 | `mail.list` | `MailListReq` | `MailListResp` | 邮件列表（C8）。不改已读。新号三封：欢迎、开服补给、维护公告 |
| 1702 | `mail.read` | `MailReadReq` | `MailReadResp` | 标成已读（C8）。没有这封是 `MAIL_NOT_FOUND`。不发附件 |
| 1703 | `mail.claim` | `MailClaimReq` | `MailClaimResp` | 领取一封（C8）。金币钻石进钱包，道具进背包。没有附件 `MAIL_NO_ATTACHMENT`，领过 `MAIL_ALREADY_CLAIMED` |
| 1704 | `mail.claimAll` | `MailClaimAllReq` | `MailClaimAllResp` | 领取全部未领附件（C8）。一封都没有是 `MAIL_NOTHING` |
| 1705 | `mail.delete` | `MailDeleteReq` | `MailDeleteResp` | 删除（C8）。未领附件 `MAIL_DELETE_BLOCKED` |
| 1801 | `smith.view` | `SmithViewReq` | `SmithViewResp` | 铁匠铺（C9）。列出每名英雄的新手短剑。没有武器时补 Lv1，不扣费 |
| 1802 | `smith.strengthen` | `SmithStrengthenReq` | `SmithStrengthenResp` | 强化 1 级（C9）。扣金币和 1 个强化石。不足 `SMITH_GOLD_SHORT` / `SMITH_STONE_SHORT`，满级 `SMITH_LEVEL_MAX`，没有英雄 `HERO_NOT_FOUND` |
| 1901 | `arena.view` | `ArenaViewReq` | `ArenaViewResp` | 竞技场（C10）。积分、约占位名次、战力和固定对手。按开服天刷新今日次数。不改钱包 |
| 1902 | `arena.challenge` | `ArenaChallengeReq` | `ArenaChallengeResp` | 一键挑战（C10）。战力不低于对手则胜，加积分和金币；否则扣积分。每天 5 次。没有对手 `ARENA_NOT_FOUND`，次数用完 `ARENA_NO_CHANCE` |
| 2001 | `tower.view` | `TowerViewReq` | `TowerViewResp` | 幻境之塔（C11）。当前层、守关战力和今日次数。按开服天刷新次数。不改钱包。不是幻魔塔 |
| 2002 | `tower.challenge` | `TowerChallengeReq` | `TowerChallengeResp` | 一键挑战当前层（C11）。战力不低于守关则胜，层数 +1，加金币和强化石；否则层数不变。每天 10 次。已到塔顶 `TOWER_CLEARED`，次数用完 `TOWER_NO_CHANCE` |
| 2101 | `daily.view` | `DailyViewReq` | `DailyViewResp` | 日常金币副本（C12）。今日次数和三档难度的金币预览。按开服天刷新次数。不改钱包。不是经验或英雄副本 |
| 2102 | `daily.challenge` | `DailyChallengeReq` | `DailyChallengeResp` | 一键挑战所选难度（C12）。战力够则发该档金币，普通和困难再加强化石；否则不发奖励。每天 2 次。没有难度 `DAILY_NOT_FOUND`，次数用完 `DAILY_NO_CHANCE` |
| 2201 | `login7.view` | `Login7ViewReq` | `Login7ViewResp` | 七日登录（C13）。角色登录天和七格奖励。不改钱包。不看开服天 |
| 2202 | `login7.claim` | `Login7ClaimReq` | `Login7ClaimResp` | 领取某一天（C13）。已到达且未领才发。未到 `LOGIN7_LOCKED`，领过 `LOGIN7_CLAIMED`，没有这一天 `LOGIN7_NOT_FOUND` |
| 2203 | `login7.advance` | `Login7AdvanceReq` | `Login7AdvanceResp` | Mock 调试（C13）。角色登录天 +1，最多第 7 天。不改开服天，不自动领取。已是第 7 天 `LOGIN7_MAX` |
| 2301 | `goal7.view` | `Goal7ViewReq` | `Goal7ViewResp` | 七日目标（C14）。按当前通关、召唤、升级和挂机领取列出任务。不改钱包 |
| 2302 | `goal7.claim` | `Goal7ClaimReq` | `Goal7ClaimResp` | 领取一个已完成的目标（C14）。未开启 `GOAL7_LOCKED`，未完成 `GOAL7_INCOMPLETE`，领过 `GOAL7_CLAIMED`，没有这个 id `GOAL7_NOT_FOUND` |
| 2401 | `shop.view` | `ShopViewReq` | `ShopViewResp` | 基础商店。今日限购和三样商品。按开服天刷新已购次数。不改钱包 |
| 2402 | `shop.buy` | `ShopBuyReq` | `ShopBuyResp` | 购买一件（基础商店）。扣金币或钻石，道具进背包。没有商品 `SHOP_NOT_FOUND`，售罄 `SHOP_SOLD_OUT`，金币不足 `SHOP_GOLD_SHORT`，钻石不足 `SHOP_DIAMOND_SHORT` |
| 2801 | `limited.view` | `LimitedViewReq` | `LimitedViewResp` | 限时活动。兑换项、点石次数和限时礼包。按开服天刷新兑换和点石。不改钱包 |
| 2802 | `limited.exchange` | `LimitedExchangeReq` | `LimitedExchangeResp` | 兑换一次。咖啡豆或金币换道具。没有这项 `LIMITED_EX_NOT_FOUND`，兑完 `LIMITED_EX_SOLD_OUT`，金币不足 `LIMITED_EX_GOLD_SHORT`，材料不足 `LIMITED_EX_ITEM_SHORT` |
| 2803 | `limited.alchemy` | `LimitedAlchemyReq` | `LimitedAlchemyResp` | 点石一次。今日第一次免费，之后钻石换金币。次数用完 `LIMITED_STONE_NO_CHANCE`，钻石不足 `LIMITED_STONE_SHORT` |
| 2804 | `limited.buy` | `LimitedBuyReq` | `LimitedBuyResp` | 买一个限时礼包。库存 1。模拟购买不扣钻石。买过 `LIMITED_PACK_BOUGHT`，本轮结束 `LIMITED_PACK_ENDED`，钻石不足 `LIMITED_PACK_SHORT`，没有这个 id `LIMITED_PACK_NOT_FOUND` |

代码在 `client/assets/scripts/net/protocol/`：`cmds.ts`（名字和 ID）、`types.ts`（字段）、`codec.ts`（现在是明文对象）、`Proto.ts`（`Proto.login` 等）。

```typescript
const login = await Proto.login({ account: "mock" });
const role = await Proto.roleEnter({ account: login.account });
```

不传第二个参数时用 `NetClient.shared`。自检要传入自己 new 的 `NetClient`。

Mock 约定（给 C1 / C6 直接用，不用再改传输层）：

- 每个 MockTransport 带一份 `MockGameSession`。一开始就有角色 `1001 / MockHero / Lv1`，属于账号 `mock`，下一关 1、开服第 1 天。还没 `login`，或登录的就是 `mock` 时，只 `role.enter` 也能进主城。登录别的账号则 `hasRole` 为 false，直到 `role.create`。同一局里进度会留下来。细节和录包见 `docs/mock-replay.md`。
- `role.enter` 额外带 `openDay`、`stageId`、`gold`、`diamond`（真服可以不带）。Boot 写进 `Session`。没有角色时金币钻石回 0。
- `role.create` 名字去空白后为空则 `ok: false`，不改当前角色；成功则改名，`roleId` 仍是 1001，并重置等级、主线、开服天、钱包（金币 100、钻石 20）、挂机（时长、强化石、领取次数）、召唤碎片和英雄名册（回到起步三名 Lv1，每人新手短剑 Lv1）。背包重新放上小金币袋 ×2、经验药水 ×2、许愿符 ×2。邮箱回到起步三封。竞技场积分回到 1000，今日次数清零。幻境之塔回到第 1 层，今日次数清零。金币副本今日次数清零。七日登录回到第 1 天，已领记录清掉。七日目标已领记录清掉。商店今日已购清掉。许愿次数和奖池游标清掉。咖啡馆次数和未领取的招待清掉。礼包的升级领取、每日已购、首充和累充清掉。限时兑换今日次数、点石次数和限时礼包已购清掉。
- `stage.enter` 的 `stageId < 1` 失败；成功回 `battleId`，形如 `mock-battle-<关卡>-<序号>`。Mock 允许跳关。主线列表只放行下一关，高于等级的战报判负。
- `stage.result` 新通关后 `nextStageId = clearedStage + 1`，`level = 1 + clearedStage`，奖励占位 `{ id: 1, count: 10 }`（id 1 加金币，id 2 加钻石）。失败停在本关，奖励空，钱包不变。回包可带 `openDay` / `level` / `gold` / `diamond`。快速作战和主线战报共用这条，不另开消息。单次跳关只发这一关的 10 金币。
- `stage.push` 只给 Mock 预览。缺省目标第 70 关。从已通关的下一关起，每一关都按 `stage.result` 胜利结算，所以金币、等级、开服天和一关关打相同。已经到达目标时 `already: true`，金币不加。`target` 小于 1、不是数字、或大于 200 时 `STAGE_ID_INVALID`，进度不动。不改挂机起算、角色登录天、英雄和已领记录。默认录包没有这条。
- `idle.query` 只读。时长 = 现在 − 起算时刻，上限 8 小时。金币、强化石（id 101）按当前已通关关数计算。回包带可领数量、挂满 8 小时的预览、已有强化石和钱包。
- `idle.claim` 把可领的金币和强化石计入钱包，然后重新起算。一个都不够时 `ok: false`，`code` 为 `IDLE_EMPTY`（「挂机时间太短，暂无收益」），钱包和起算时刻不动。创角会把时长和强化石清掉。
- `hero.list` 只读。名册为空时种下光耀骑士（id 10001，3星）、林间游侠（10002，2星）、星辉法师（10003，1星），都是 Lv1，并各带新手短剑 Lv1。回包带每名英雄的等级、星级、占位属性（攻击 / 生命 / 防御）、武器等级和武器攻击、下一级金币消耗，以及当前钱包。剑是 Lv1 时攻击加成为 0。
- `hero.upgrade` 把指定英雄升 1 级并扣除金币。Lv1→2 花 30，之后每级再多 20，最高 Lv10。星级和武器等级不变。成功回包带新等级、新属性、本次花费和扣完后的钱包。金币不够时 `HERO_GOLD_SHORT`（「金币不足，无法升级」），并带 `needGold`；已满级 `HERO_LEVEL_MAX`；id 不存在 `HERO_NOT_FOUND`。这三种失败都不改等级和钱包，也不动挂机计时和主线进度。
- `summon.pull` 的 `count` 只能是 1（10 钻石）或 10（90 钻石）。不够时 `SUMMON_DIAMOND_SHORT`（「钻石不足，无法召唤」），并带 `needDiamond`；其它次数 `SUMMON_COUNT_INVALID`。失败不改钻石、名册和召唤游标。成功按固定卡池顺序抽出：不在名册里的英雄追加到末尾（Lv1，星级按卡池），已拥有的不改等级星级，改为该英雄碎片 +10。碎片道具 id = `40000 + heroId`。回包带本次掉落、新英雄人数、碎片次数和扣完后的钱包。不改金币、挂机计时和主线。创角把游标和碎片清掉。
- `bag.list` 只读。数量大于 0 才出现。顺序是小金币袋（id 201）、经验药水（id 202）、许愿符（id 203）、咖啡豆（id 204）、强化石（id 101），然后英雄碎片和其它材料。金币 id 1、钻石 id 2 不进背包。新号没有另填道具时，自带小金币袋 ×2、经验药水 ×2、许愿符 ×2。许愿符和咖啡豆不能直接使用。咖啡豆新号没有，招待领取后才出现。
- `bag.use` 的 `count` 缺省 1，小于 1 为 `BAG_COUNT_INVALID`。小金币袋每个 +50 金币。经验药水每个给名册第一名 +100 经验，满 100 升 1 级；领队已满级为 `BAG_HERO_MAX`，不扣药水。强化石和碎片为 `BAG_NOT_USABLE`，数量不动。背包没有任何道具时 `BAG_EMPTY`；有别的道具但没有这一个时 `BAG_NOT_FOUND`；持有不够 `BAG_NOT_ENOUGH`。失败不改金币、英雄、挂机和主线。成功回包带剩余数量、扣完后的钱包，经验药水再带英雄名和等级。
- `mail.list` 只读。新号三封：未读的「欢迎来到梦想之光」（无附件）、未读的「开服补给」（金币 80、强化石 ×3、小金币袋 ×1）、已读的「维护公告」（无附件）。不改已读和钱包。
- `mail.read` 把指定信标成已读。已经读过也成功。没有这封是 `MAIL_NOT_FOUND`。不发附件，不改钱包。
- `mail.claim` 领取一封附件。id 1 加金币，id 2 加钻石，其它 id 进背包。成功后标成已领取和已读。没有这封 `MAIL_NOT_FOUND`，没有附件 `MAIL_NO_ATTACHMENT`（「这封邮件没有附件」），已经领过 `MAIL_ALREADY_CLAIMED`（「附件已经领取过了」）。失败不改钱包、背包、英雄、挂机和主线。
- `mail.claimAll` 把每封还没领的附件都领掉，奖励按道具 id 合并。没有可领的是 `MAIL_NOTHING`（「没有可领取的附件」）。没有附件的信保持原样，不会被标成已读。
- `mail.delete` 删一封。还有未领附件时 `MAIL_DELETE_BLOCKED`（「请先领取附件再删除」）。没有附件或已经领过可以删。没有这封是 `MAIL_NOT_FOUND`。
- `smith.view` 只读武器，并给还没有剑的英雄补 Lv1 新手短剑。补武器不扣金币和强化石。回包带每名英雄的剑等级、当前攻击、下一次消耗、背包里的强化石和钱包。名册第一名是 `leadId`。
- `smith.strengthen` 把指定英雄的新手短剑升 1 级。Lv1→2 花 20 金币和 1 个强化石，之后每级金币再多 10，最高 Lv10。每级攻击 +8，Lv1 加成为 0。金币不够 `SMITH_GOLD_SHORT`（「金币不足，无法强化」），并带 `needGold`；强化石不够 `SMITH_STONE_SHORT`（「强化石不足」），并带 `needStone`；已满级 `SMITH_LEVEL_MAX`；没有这名英雄 `HERO_NOT_FOUND`。失败不扣金币和强化石，也不提升已有等级。不改英雄等级、星级、钻石、挂机计时和主线。创角把剑重置回 Lv1。
- `arena.view` 只读。新号积分 1000，约第 41 名。战力是名册攻击之和（含武器）。对手固定五名。`used` / `limit` 是今日次数，上限 5。开服天和上次挑战不是同一天时，次数清零，积分不动。不改钱包。入口仍由客户端 `opencondition` 的 `main_pvp`（主线 Lv8）上锁，Mock 不重复拦等级。
- `arena.challenge` 按 `opponentId` 一键结算，不播战报。玩家战力不低于对手战力则胜：积分 +24、金币 +20。否则积分 -12，金币不变。积分限制在 800 到 2000，到边界时实际增减可以更少，到下限再输则变化为 0。胜负都占 1 次今日次数。没有这位对手 `ARENA_NOT_FOUND`（「没有这位对手」），次数用完 `ARENA_NO_CHANCE`（「今日挑战次数已用完」）。失败不改积分、金币和次数。不改英雄、武器、钻石、挂机计时和主线。创角把积分重置回 1000、次数清零。
- `tower.view` 只读。新号在第 1 层，共 20 层。守关战力从 100 起，每层 +20。我方战力是名册攻击之和（含武器）。`used` / `limit` 是今日次数，上限 10。开服天和上次挑战不是同一天时，次数清零，层数不动。不改钱包。入口仍由客户端 `opencondition` 的 `main_fantasy_tower`（主线 Lv16，不看开服天）上锁，Mock 不重复拦等级。幻魔塔不走这两条消息。
- `tower.challenge` 只打当前层，一键结算，不播战报。玩家战力不低于守关则胜：层数 +1，金币为 `20 + 层数 × 10`（第 1 层 30），强化石（id 101）+1。否则层数不变，金币和强化石不加。胜负都占 1 次今日次数。已到塔顶 `TOWER_CLEARED`（「已到达塔顶」），次数用完 `TOWER_NO_CHANCE`（「今日挑战次数已用完」）。这两种失败不改层数、金币、道具和次数。不改英雄、武器、钻石、挂机计时、主线和竞技场。创角把层数重置回 1、次数清零。
- `daily.view` 只读金币副本。三档：简单（战力 120，金币 120）、普通（战力 160，金币 200，强化石 ×1）、困难（战力 240，金币 320，强化石 ×2）。我方战力是名册攻击之和（含武器）。`used` / `limit` 是今日次数，上限 2。开服天和上次挑战不是同一天时，次数清零。不改钱包。入口仍由客户端 `opencondition` 的 `main_mission`（主线 Lv15，不看开服天）上锁，Mock 不重复拦等级。经验副本和英雄副本不走这两条消息。
- `daily.challenge` 按 `tierId` 一键结算，不播战报。玩家战力不低于该档建议战力则胜，发放该档金币；普通和困难再发强化石（id 101）。否则不发金币和道具。胜负都占 1 次今日次数。没有这个难度 `DAILY_NOT_FOUND`（「没有这个难度」），次数用完 `DAILY_NO_CHANCE`（「今日金币副本次数已用完」）。这两种失败不改金币、道具和次数。不改英雄、武器、钻石、挂机计时、主线、竞技场和幻境之塔。创角把次数清零。
- `login7.view` 只读。新号角色登录第 1 天。七格：第 1 天金币 80，第 2 天钻石 15，第 3 天强化石 ×3，第 4 天金币 120 和小金币袋 ×1，第 5 天钻石 30 和经验药水 ×1，第 6 天金币 200 和强化石 ×5，第 7 天金币 300、钻石 50、小金币袋 ×2。回包另带当前开服天，只供对照。不改钱包。入口不设等级锁，主城和玩法都能进。
- `login7.claim` 按 `day` 领一格。这一天小于等于角色登录天、并且还没领过，才发放。金币钻石进钱包，其它道具进背包。已经领过 `LOGIN7_CLAIMED`（「第N天奖励已经领取」），还没到 `LOGIN7_LOCKED`（「第N天尚未到达」），没有这一天 `LOGIN7_NOT_FOUND`（「没有这一天」）。失败不改钱包、背包和已领记录。不改开服天、主线、英雄和各玩法次数。已到达但更早没领的天可以补领。
- `login7.advance` 只给 Mock 预览。角色登录天 +1，最多第 7 天。不改开服天，不自动领取，不动钱包。已经是第 7 天 `LOGIN7_MAX`（「已经是第7天」）。主线胜利不会调用它。创角把登录天和已领记录清掉。
- `goal7.view` 只读。任务按当前会话列出：通关第 1/3/5 关、召唤 1 次、升级英雄 1 次、领取挂机 1 次，以及第 7 日通关第 70 关。第 5、6 天没有任务。第 70 关在 `clearedStage` 到 70 之前是 `locked`，进度仍带回当前/70。不改钱包。入口不设等级锁，主城和玩法都能进。天数只分组，不按登录天上锁。
- `goal7.claim` 按 `id` 领一个已完成且未领的目标。金币钻石进钱包，其它道具进背包。还没完成 `GOAL7_INCOMPLETE`（「通关主线第1关尚未完成（0/1）」），第 70 关没到 `GOAL7_LOCKED`（「通关第70关后才能领取」），已经领过 `GOAL7_CLAIMED`，没有这个 id `GOAL7_NOT_FOUND`（「没有这个目标」）。失败不改钱包、背包和已领记录。不改主线、英雄、召唤次数、挂机次数和角色登录天。创角把已领记录和挂机领取次数清掉。
- `shop.view` 只读。三样：强化石 ×5（金币 40，每日 3 次）、小金币袋 ×1（钻石 8，每日 2 次）、经验药水 ×1（金币 50，每日 2 次）。回包带今日已购、背包已有数量、开服天和钱包。开服天和上次购买不是同一天时，已购次数清零，背包不收回。不改钱包。样例 `opencondition` 没有商店行，入口不设等级锁，主城和玩法都能进。
- `shop.buy` 按商品 `id`（不是道具 id）买一次。金币商品扣金币，钻石商品扣钻石，道具进背包。没有这个商品 `SHOP_NOT_FOUND`（「没有这个商品」），达到今日限购 `SHOP_SOLD_OUT`（「小金币袋今日已售罄」），金币不够 `SHOP_GOLD_SHORT`（「金币不足，购买需要 50」），钻石不够 `SHOP_DIAMOND_SHORT`（「钻石不足，购买需要 8」）。失败不改钱包、背包和已购次数。不改英雄、主线、召唤和各玩法次数。创角把已购次数清掉。
- `wish.view` 只读低级许愿池。今日次数上限 5。金币许愿花 30，许愿符许愿花 1 个（id 203），钻石许愿花 5。回包带次数、奖池游标、三种价格、许愿符数量和钱包。开服天和上次许愿不是同一天时，次数清零，游标不动。不改钱包。入口仍由客户端 `opencondition` 的 `main_blessingpool`（主线 Lv10，不看开服天）上锁，Mock 不重复拦等级。高级许愿池不走这两条消息。
- `wish.draw` 按 `pay` 许愿一次：`gold`、`item` 或 `diamond`。先扣对应花费，再按游标发一格。10 格固定循环：金币 40、强化石 ×2、经验药水 ×1、金币 60、强化石 ×1、金币 40、经验药水 ×1、强化石 ×3、金币 80、钻石 8。成功后游标 +1，三种方式共用今日 5 次。方式不对 `WISH_PAY_INVALID`（「请选择许愿方式」），次数用完 `WISH_NO_CHANCE`（「今日许愿次数已用完」），金币不够 `WISH_GOLD_SHORT`（「金币不足，许愿需要 30」），钻石不够 `WISH_DIAMOND_SHORT`（「钻石不足，许愿需要 5」），许愿符不够 `WISH_ITEM_SHORT`（「许愿符不足，许愿需要 1」）。失败不改钱包、背包、次数和游标。不改英雄、主线、召唤、商店和其它玩法次数。创角把次数和游标清掉，许愿符回到 ×2。
- `cafe.view` 只读咖啡馆招待。今日次数上限 3。回包带次数、名册、谁正在招待、1 人 / 2 人的金币和咖啡豆预览，以及背包里的咖啡豆。开服天和上次招待不是同一天时，次数清零，还没领取的招待留下。不改钱包。入口仍由客户端 `opencondition` 的 `main_cafe`（主线 Lv12，不看开服天）上锁，Mock 不重复拦等级。MVP 派出后立刻可领，不走墙钟。
- `cafe.send` 按 `heroIds` 派出 1 到 2 名已拥有的英雄。成功占 1 次今日次数，不发奖励。没选 `CAFE_NO_HERO`（「请先选择招待的英雄」），超过 2 人 `CAFE_TOO_MANY`（「一次最多派出 2 名英雄」），同一人出现两次 `CAFE_DUPLICATE`（「请选择不同的英雄」），名册没有 `CAFE_HERO_MISSING`（「没有这名英雄」），已经派出还没领 `CAFE_BUSY`（「英雄正在招待，请先领取」），次数用完 `CAFE_NO_CHANCE`（「今日招待次数已用完」）。失败不改次数、钱包和背包。不改英雄等级和其它玩法。
- `cafe.claim` 领取当前招待。1 人给金币 60 和咖啡豆 ×1（id 204），2 人给金币 100 和咖啡豆 ×2。没有派出 `CAFE_NOTHING`（「还没有可领取的招待」）。失败不改钱包和背包，次数不退。成功清掉本次派出。咖啡豆不能在背包里直接使用。创角把次数、未领取的招待和咖啡豆清掉。
- `gift.view` 只读礼包骨架。回包带主线等级、开服天、升级有礼三档（Lv5/10/15）、每日礼包价格和是否已买、首充是否完成、累充金额和三档（6/30/68）。不改钱包。入口不设等级锁，主城和玩法都能进。每日已购跟着开服天清掉，升级领取、首充和累充留下。
- `gift.claimLevel` 按门槛 `level` 领一档升级有礼。主线等级达到且还没领过才发。没有这一档 `GIFT_LEVEL_NOT_FOUND`（「没有这一档升级奖励」），等级不够 `GIFT_LEVEL_LOCKED`（「主线达到 Lv5 后才能领取」），领过 `GIFT_LEVEL_CLAIMED`（「Lv5 奖励已经领取」）。失败不改钱包和背包。
- `gift.buyDaily` 花 10 钻石买今日礼包，得金币 80 和强化石 ×2。今天买过 `GIFT_DAILY_BOUGHT`（「今日礼包已购买」），钻石不够 `GIFT_DAILY_SHORT`（「钻石不足，每日礼包需要 10」）。失败不改钱包和已购。不计入累充。
- `gift.recharge` 模拟充值，不走真实支付。`kind` 为 `first` 时只完成一次：累充 +6，钻石 +60，经验药水 ×1，并记下 `firstChargeDone`。已经完成 `GIFT_FIRST_DONE`（「首充已完成」）。`kind` 为 `acc` 时每次累充 +30，并另发钻石 +30，不重复发首充礼包。方式不对 `GIFT_RECHARGE_INVALID`（「请选择充值方式」）。失败不改累充、钱包和背包。
- `gift.claimAcc` 按金额门槛领一档累充。累计达到且还没领过才发。没有这一档 `GIFT_ACC_NOT_FOUND`（「没有这一档累充」），金额不够 `GIFT_ACC_LOCKED`（「累充未达到 30」），领过 `GIFT_ACC_CLAIMED`（「累充 6 奖励已经领取」）。失败不改钱包、背包和累充金额。创角把升级领取、每日已购、首充和累充清掉。
- `limited.view` 只读限时活动。回包带开服天、两档兑换、点石已用次数和是否免费、两档限时礼包，以及倒计时。不改钱包。入口不设等级锁，主城和玩法都能进。兑换次数和点石次数跟着开服天清掉。限时礼包已购留下，直到创角。
- `limited.exchange` 按兑换项 `id` 兑一次。咖啡豆 ×2 换经验药水 ×1，今日 2 次。金币 50 换强化石 ×4，今日 3 次。没有这项 `LIMITED_EX_NOT_FOUND`（「没有这个兑换」），兑完 `LIMITED_EX_SOLD_OUT`（「经验药水今日已兑完」），金币不够 `LIMITED_EX_GOLD_SHORT`（「金币不足，兑换需要 50」），咖啡豆不够 `LIMITED_EX_ITEM_SHORT`（「咖啡豆不足，兑换需要 2」）。失败不改钱包、背包和今日次数。
- `limited.alchemy` 点石一次。每天 3 次。第一次不扣钻石，获得金币 100。之后每次钻石 5 换金币 100。次数用完 `LIMITED_STONE_NO_CHANCE`（「今日点石次数已用完」），钻石不够 `LIMITED_STONE_SHORT`（「钻石不足，点石需要 5」）。失败不改钱包和次数。
- `limited.buy` 按礼包 `id` 买一次。开服礼包花钻石 15，得金币 180 和强化石 ×3。限时补给是模拟购买，不扣钻石，得钻石 30 和经验药水 ×1。两种都只在开服第 1 天到第 7 天可买，库存 1。买过 `LIMITED_PACK_BOUGHT`（「开服礼包已经购买」），超过第 7 天且还没买 `LIMITED_PACK_ENDED`（「限时礼包已结束」），钻石不够 `LIMITED_PACK_SHORT`（「钻石不足，开服礼包需要 15」），没有这个 id `LIMITED_PACK_NOT_FOUND`（「没有这个礼包」）。已经买过优先于已结束。失败不改钱包和已购。不计入礼包页的累充。创角把兑换次数、点石次数和限时礼包已购清掉。

1301 / 1302 / 1401 / 1402 / 1501 / 1601 / 1602 / 1701–1705 / 1801 / 1802 / 1901 / 1902 / 2001 / 2002 / 2101 / 2102 / 2201 / 2202 / 2203 / 2301 / 2302 / 2401 / 2402 / 2501 / 2502 / 2601 / 2602 / 2603 / 2701 / 2702 / 2703 / 2704 / 2705 / 2801 / 2802 / 2803 / 2804 仍是客户端占位号，不是旧服消息号。线上主线进度是 Battle.proto 的 **3007**（空的 `GReqChapterData` / `GResChapterData`），不在这张表里。Mock 的 `stage.enter` 仍是 1201。占位 `tower.view` 仍是 2001，和线上拉角色资料的空 c2s 2001 不是同一张表。占位 `mail.list` 到 `mail.delete` 仍是 1701–1705，和线上邮件列表的空 c2s 15000 不是同一张表。占位 `hero.list` / `hero.upgrade` 仍是 1401 / 1402，和线上英雄列表的 c2s 4001 不是同一张表。占位 `login7.view` / `login7.claim` / `login7.advance` 仍是 2201–2203，和线上点金的空 c2s 17000 不是同一张表。线上成就列表的空 c2s 12010 也不在这张表里。线上竞技场的空 c2s 18001（GResPvpData）也不在这张表里。占位 `arena.view` / `arena.challenge` 仍是 1901 / 1902。线上七日登录的空 c2s 22000（GReqSevenDayLoginData / GResSevenDayLoginData）也不在这张表里。不发 22001。22002 是隔天推送，不是这张表的 2202。线上七日目标的空 c2s 21010（GReqSevenDayTargetList / GResSevenDayTargetList，整帧 `0400000012520000`）也不在这张表里。不发 21011、21012。21013 只收。旧号 21000 / 21001 不用。占位 `goal7.view` / `goal7.claim` 仍是 2301 / 2302。线上许愿池的空 c2s 27001（GResBlessingPoolList，整帧 `0400000079690000`）也不在这张表里。不发 27002、27003、27004。备选 4201 本刀不发。占位 `wish.view` / `wish.draw` 仍是 2501 / 2502。线上召唤次数的空 c2s 4004（GResHeroSummonCount，整帧 `04000000a40f0000`）也不在这张表里。不是英雄列表 4001。不发 4002、4005。不做 58001、58007、4201。占位 `summon.pull` 仍是 1501。线上先知召唤的空 c2s 13044（GReqProphetSummonInfo / GResProphetSummonInfo，整帧 `04000000f4320000`）也不在这张表里。不是召唤次数 4004。不发 13041、13042、13043。不做 58007、4201。线上英雄宝石的空 c2s 4101（GReqHeroJewel / GResHeroJewel，整帧 `0400000005100000`）也不在这张表里。不是英雄列表 4001，也不是 13044。不发 4102、4103、4104、4105、4106、4107。不做 9001。线上英雄图鉴的空 c2s 4013（GReqIllustratReward / GResIllustratReward，整帧 `04000000ad0f0000`）也不在这张表里。不是英雄列表 4001，也不是 4101。不发 4014。4014 仅 s2c 推送。线上宠物信息的空 c2s 74100（GReqPetInfoList / GResPetInfoList，整帧 `0400000074210100`）也不在这张表里。不是英雄列表 4001，也不是 4013。不发 74101、74102、74103。74105、74106 仅 s2c 推送，不主动发。

## 以后换成真 Protobuf

1. 只生成上表这些消息（或当时的 P0 白名单），不要一次生成全量。
2. 用生成类替换 `types.ts` 里的 interface。`Cmd` / `CmdId` 改成与服一致的名字和编号。
3. 只改 `codec.ts`：`encodeRequest` 把对象编成字节，`decodeResponse` 解回同一套字段。`Proto.login` 的函数签名保持不变。
4. `mock://` 继续走 MockTransport 的明文对象。真 WebSocket（阶段 D）在传输层发送 `encodeRequest` 的结果。
5. Boot、以及之后的 C1，继续调 `Proto.*`，不要改回散落的 cmd 字符串。
