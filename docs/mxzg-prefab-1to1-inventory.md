盘点基线 eda658a4，P1 起按 e8e461e2 执行

# mxzg Prefab 1:1 盘点：老 ccbi 对照新仓 prefabs/ui

- 生成：2026-10-23（Asia/Hong_Kong）。新仓基线 **main `eda658a4`**，只读取自 PC-202412251709 `F:\project\mxzg`（`git ls-tree`/`git show`/`git grep`，没动工作区）。老源 `F:\源码\mj\program\client\cocos_mxzg\client\idle\res\hd\ccbi\`
- 解析：自写 CCBI v5 解析器（`/workspace/pfinv/ccbi.py`），**966/966 全部解析成功，0 个失败**。`fileLookup.plist` 的 filenames 是空字典，没有名字映射可用。
- 逐个明细：`/workspace/mxzg-prefab-1to1-inventory.csv`。中间数据：`/workspace/pfinv/parsed3.json`、`rows.json`。

## 总览

| 项 | 数 |
|---|--:|
| ccbi 总数 | 966 |
| 已有（1:1 覆盖） | 0 |
| 部分（有同功能 Prefab，但布局/素材不是照 ccbi 做的） | 32 |
| 缺 | 934 |
| 子组件（cell/item/seat/弹框片段，或被 CCB_FILE 嵌入） | 313 |
| 节点总数 | 17461 |
| 现有 prefabs/ui/*.prefab | 29 |

**为什么"已有"是 0：**现有 29 个 Prefab 都是照新 TS 代码 UI（Wire*/Mock 页）搭的，不是照老 ccbi。用素材重合来核：例如 `UserLoginLayer` 和 `LoginPanel` 只共用 1 张图（win-bg-12），`PvpLayer` 和 `WireArenaPage` 共用 0 张，`BlessingPoolLayer`（44 节点/25 图）和 `WishPage` 共用 0 张，`SummonLayer` 和 `SummonPage` 共用 0 张。所以对得上功能的只能算"部分"。另外，老登录主屏（logo-scene 的开始游戏、换号、选服按钮）和老主城（main-scene/main-city）**根本不是 ccbi**，是老代码搭的。LoginPanel、CityChrome、CityHub 的素材来自这些图集，所以在 ccbi 表里没有对应行。

**"部分"的依据：**名字和功能对得上（同一功能页），且/或 docs/prefab-layout.md 写了对应关系。素材重合普遍只有 0–3 张，所以只算"部分"。

| ccbi | 对应 prefab | ccbi 节点 |
|---|---|--:|
| AchievementCell.ccbi | achievement/WireAchievementPage | 8 |
| AchievementLayer.ccbi | achievement/WireAchievementPage | 8 |
| BackpackLayer.ccbi | bag/BagPage + bag/WireBagPage | 12 |
| BattleInfoLayer.ccbi | battle/BattlePage | 18 |
| BattlePanelLayer.ccbi | battle/BattlePage | 28 |
| BlessingPoolLayer.ccbi | wish/WishPage | 44 |
| BuyGoldLayer.ccbi | buygold/WireBuyGoldPage | 32 |
| ChooseServerCell.ccbi | login/LoginPanel | 7 |
| ChooseServerLayer.ccbi | login/LoginPanel | 16 |
| ChooseServerRoleCell.ccbi | login/LoginPanel | 6 |
| ConfirmLayer.ccbi | common/CommonPanel | 9 |
| CreateNickRewardLayer.ccbi | login/CreateRolePanel | 6 |
| HeroInfoLayer.ccbi | hero/HeroPage | 43 |
| HeroListHeroLayer.ccbi | hero/HeroPage | 18 |
| HeroListLayer.ccbi | hero/HeroPage | 21 |
| HeroPalaceLayer.ccbi | hero/WireHeroPage | 53 |
| MailCell.ccbi | mail/MailPage | 6 |
| MailInfoLayer.ccbi | mail/MailPage | 15 |
| MailLayer.ccbi | mail/MailPage + mail/WireMailPage | 11 |
| MissionLayer.ccbi | mainline/MainlinePage + mainline/WireMainlinePage | 20 |
| NoticeLayer.ccbi | login/LoginPanel | 12 |
| PROMEveryDayLoginCell.ccbi | sevenday/Login7Page | 6 |
| PROMEveryDayLoginLayer.ccbi | sevenday/Login7Page | 2 |
| PvpLayer.ccbi | arena/WireArenaPage | 46 |
| PvpPlayerCell.ccbi | arena/WireArenaPage | 13 |
| QuickBattleLayer.ccbi | idle/IdlePage + idle/WireIdlePage | 21 |
| SevenDayTargetCell.ccbi | sevenday/WireSevenDayPage | 9 |
| SevenDayTargetLayer.ccbi | sevenday/WireSevenDayPage | 22 |
| ShopItemCell.ccbi | shop/ShopPage | 37 |
| ShopLayer.ccbi | shop/ShopPage | 14 |
| SummonLayer.ccbi | summon/SummonPage | 16 |
| UserLoginLayer.ccbi | login/LoginPanel | 22 |

## 分批计划（主路径优先）

| 批次 | ccbi | 已有 | 部分 | 缺 | 子组件 | 节点 | 建议 PR 数 |
|---|--:|--:|--:|--:|--:|--:|--:|
| P1 登录 | 8 | 0 | 6 | 2 | 2 | 89 | 1 |
| P2 主城/通用 | 76 | 0 | 6 | 70 | 21 | 949 | 3 |
| P3 主线/挑战 | 286 | 0 | 6 | 280 | 102 | 5834 | 8 |
| P4 英雄/背包 | 213 | 0 | 6 | 207 | 59 | 4718 | 6 |
| P5a 其余·活动/付费 | 266 | 0 | 6 | 260 | 90 | 3736 | 5 |
| P5b 其余·公会 | 45 | 0 | 0 | 45 | 16 | 737 | 1 |
| P5c 其余·国战/远征 | 58 | 0 | 0 | 58 | 19 | 1118 | 2 |
| P5d 其余·商店/杂项 | 14 | 0 | 2 | 12 | 4 | 280 | 1 |

### 各 PR 范围

| PR | ccbi | 部分 | 子组件 | 节点 | 模块（ccbi 数） |
|---|--:|--:|--:|--:|---|
| P1 登录/选服/公告/起名奖励 | 8 | 6 | 2 | 89 | ChooseServer(3)、CreateNick(1)、Error(1)、Language(1)、Notice(1)、User(1) |
| P2-a 角色信息/设置/通用确认 | 24 | 1 | 4 | 333 | Border(1)、C(2)、ChangeNick(1)、Confirm(1)、GM(1)、Info(1)、Input(1)、List(1)、Npc(1)、Popup(1)、Power(1)、Rename(1)、RoleInfo(1)、RoleUpgrade(1)、Setting(7)、Subtitle(1)、World(1) |
| P2-b 聊天/好友/邮件 | 28 | 3 | 10 | 221 | Chat(13)、Friend(12)、Mail(3) |
| P2-c 排行/成就/日常/通用奖励弹框 | 24 | 2 | 7 | 395 | Achievement(3)、Daily(2)、Item(5)、Luck(1)、OnlineReward(2)、Rank(6)、Reward(2)、Unlock(1)、Up(1)、Upgrade(1) |
| P3-a 主线/章节/战斗/挂机 | 36 | 4 | 13 | 517 | Adven(2)、Battle(7)、Chapter(10)、HardSelect(2)、IdleHero(1)、MainTask(4)、Mission(5)、PassChapter(1)、QuickBattle(3)、Strategy(1) |
| P3-b 爬塔/副本/试炼 | 64 | 0 | 24 | 1053 | Dungeon(12)、FantasyLand(2)、FantasyTower(9)、FloatingIslands(6)、PlaneWar(7)、Rainbow(6)、ST(11)、Trial(6)、UnderworldPagoda(5) |
| P3-c 竞技场/天梯/录像 | 28 | 2 | 11 | 509 | Bet(4)、Biu(1)、Ladder(8)、LadderWar(2)、LeaguePortal(2)、Pvp(7)、VideoStudio(4) |
| P3-d 超级舞台 | 40 | 0 | 13 | 1116 | SuperStage(40) |
| P3-e 冠军赛 | 40 | 0 | 13 | 1057 | Champion(40) |
| P3-f 组队竞技 | 29 | 0 | 13 | 792 | TeamArena(29) |
| P3-g 梦境/神遗/远古 | 27 | 0 | 12 | 394 | Ancient(2)、Dream(12)、GR(11)、RG(2) |
| P3-h 异域冒险 | 22 | 0 | 3 | 396 | ExoticAdventure(22) |
| P4-a 英雄主干 | 38 | 3 | 12 | 868 | Hero(38) |
| P4-b 英雄扩展 | 42 | 1 | 10 | 994 | Hero(42) |
| P4-c 背包/装备/锻造 | 18 | 1 | 4 | 350 | Backpack(5)、Decompose(1)、Equip(2)、MakeEquip(2)、MakeGem(1)、Smith(7) |
| P4-d 召唤/祭坛/契约 | 14 | 1 | 4 | 193 | Altar(4)、ContractSummon(3)、ShowContract(1)、Skin(1)、Summon(5) |
| P4-e 神器/神兵/圣物/符文 | 47 | 0 | 12 | 835 | Artifact(15)、GodArms(9)、GodEquip(6)、Hallows(8)、Runes(9) |
| P4-f 羁绊/进化/图腾/宠物/其它 | 54 | 0 | 17 | 1478 | Ability(1)、Active(1)、Alice(3)、Dragon(3)、Evolution(6)、Fetter(7)、Fetters(12)、Halo(2)、HeroCreat(2)、MagicCube(3)、Pet(5)、Remains(1)、Resonate(1)、Totem(7) |
| P5a-1 充值/礼包/通用活动框 | 86 | 4 | 34 | 1037 | Blessing(1)、BuyAdvanced(1)、BuyGold(1)、BuyLevel(1)、Common1(4)、Common2(2)、Common3(1)、Customized(4)、DGA(2)、DailyFirst(1)、Festival(1)、GrowUp(3)、LTA(14)、LimitShop(2)、LimitTime(2)、LineRevenue(1)、MagicButter(1)、MidAutumn(2)、MysteryBox(2)、NewFashion(1)、NewServer(1)、NewYear(5)、Prom(1)、Promotion(2)、RCG(12)、RankBuyGold(2)、Recharge(2)、SelfSelect(2)、Seven(1)、SevenDay(7)、Shen(1)、Slzm(2)、SuperGift(1) |
| P5a-2 PROM A–C | 50 | 0 | 14 | 817 | PROM(50) |
| P5a-3 PROM D–L | 45 | 2 | 15 | 699 | PROM(45) |
| P5a-4 PROM M–R | 20 | 0 | 7 | 126 | PROM(20) |
| P5a-5 PROM S–Z | 65 | 0 | 20 | 1057 | PROM(63)、PROMW(2) |
| P5b 公会 | 45 | 0 | 16 | 737 | Clan(45) |
| P5c-1 国战 | 20 | 0 | 8 | 460 | CountryWar(20) |
| P5c-2 远征 | 38 | 0 | 11 | 658 | CrusadeGroup(38) |
| P5d 商店/先知树/杂项 | 14 | 2 | 4 | 280 | BlackMarket(2)、Compare(1)、Discuss(1)、MarketShop(2)、ProphetTree(6)、Shop(2) |

共 27 个 PR。每个 PR 大约 15–65 个 ccbi、≤1.5k 节点；超过 1k 节点的（P3-b/d/e、P4-f、P5a-1/5）可以再对半拆。

## P1 登录：建议开刀方式

- `ChooseServerCell.ccbi`：根 ChooseServerCell，360x80，7 节点，5 图；状态 部分 login/LoginPanel；素材 是
- `ChooseServerLayer.ccbi`：根 ChooseServerLayer，614x798，16 节点，8 图；状态 部分 login/LoginPanel；素材 否(老包也无):button/btn-close-2.png
- `ChooseServerRoleCell.ccbi`：根 ChooseServerCell，360x80，6 节点，3 图；状态 部分 login/LoginPanel；素材 是
- `CreateNickRewardLayer.ccbi`：根 CreateNickRewardLayer，640x960，6 节点，2 图；状态 部分 login/CreateRolePanel；素材 是
- `ErrorLayer.ccbi`：根 ErrorLayer，100x100，5 节点，1 图；状态 缺 ；素材 是
- `LanguageSelectLayer.ccbi`：根 LanguageSelectLayer，610x380，15 节点，6 图；状态 缺 ；素材 是
- `NoticeLayer.ccbi`：根 NoticeLayer，600x860，12 节点，6 图；状态 部分 login/LoginPanel；素材 是
- `UserLoginLayer.ccbi`：根 UserLoginLayer，90x60，22 节点，5 图；状态 部分 login/LoginPanel；素材 是

建议**一个 PR** 做完 P1（8 个 ccbi / 89 节点，素材全在 resources；只有一处悬空引用 `button/btn-close-2.png`，老包也没有，改用 btn-close-1）：
1. 新建 `prefabs/ui/login/` 下的 1:1 Prefab：`UserLoginLayer`（SDK 账号框）、`ChooseServerLayer` + 子件 `ChooseServerCell` / `ChooseServerRoleCell`、`NoticeLayer`、`LanguageSelectLayer`、`ErrorLayer`、`CreateNickRewardLayer`。节点名直接用 ccbi 的 member 名（spr_bg、btn_close、scroll_view…），坐标和尺寸照 ccbi 原值，以 640 宽为设计基准。
2. 现有的 `LoginPanel` / `CreateRolePanel` 先不动。新 Prefab 并存，验收通过后再由 Manager 决定是替换还是嵌入（Boot/USE_* 不碰）。
3. 每个 Prefab 都附一份节点表 docs（`docs/prefab-1to1-p1-login.md`）。素材只引用 `resources/ui/{common,login,hero,bag}` 的 spriteFrame uuid，不复制 PNG。

## 素材缺口

- 共 55 个图片引用在新 resources 找不到，涉及 61 个 ccbi。**老 hd 里也没有这些文件**（不在任何 plist 帧里，也不在 hd 散图里），属于老 ccbi 的悬空引用，老游戏运行时也是靠代码换图或者直接不显示。所以不是迁移遗漏，重建时用代码动态图或近似图替代即可。
- 字体：`STZhongsong.ttf`（466 处）、`Helvetica`、`HYZhongJianHeiJ.ttf` 老 hd 里没有，属于系统字体或缺失字体。重建时统一改用 `font/FZCSJW-GB1-0.ttf`（老名 `FZCSJW--GB1-0.ttf`，已入仓）或系统默认字体。bmfont 7 种（blue-40/purple-56/red-26/red-50/red-78/yellow-38/yellow-40）都已在 font/。
- 匹配规则：帧名 `/`→`_` 对 resources 文件名；E 批去重改名的散图按 `/workspace/esrc/fate.json` 映射，例如 `chuangzaobg.jpg`→`ui/login/bg-create-role.jpg`。

| 悬空引用 | 引用它的 ccbi |
|---|---|
| `02.jpg` | PROMSummonWeekCardLayer.ccbi |
| `1.png` | EvolutionSuccessLayer.ccbi, HeroEvolutionSuccessLayer.ccbi |
| `backpack/item-bg-5.png` | HeroUpStarSelectItemCell.ccbi, HeroXSelectItemCell.ccbi |
| `battle-detail/talk-tips.png` | HeroTalkTipsLayer.ccbi |
| `battle-end/spr-limit-gift-1.png` | ChapterEndTowerCell1.ccbi |
| `button/btn-close-2.png` | ChooseServerLayer.ccbi, FriendRequestLayer_old.ccbi |
| `clan/btn-clan-apply.png` | ClanCell.ccbi |
| `clan/progress-hp-mask.png` | PROMPveMonster.ccbi |
| `crusade-group/spr-banner-1.png` | GodArmsCompose.ccbi, GodArmsComposeLayer.ccbi |
| `evolution/no-selet-stage.png` | EvolutionSeat.ccbi |
| `fetters/spr-skill-10101.png` | ActiveFetterLayer.ccbi |
| `god-equip/spr-lxyl.png` | AbilityInfoLayer.ccbi |
| `god-equip/spr-sztqicon.png` | HeroInfoGodEquipLayer.ccbi |
| `god-relic/lbl-value.png` | GRMissionGiftPageLayer.ccbi |
| `hero-list/elem-2.png` | AltarPanelLayer.ccbi, PROMBlackFridayHeroRankHeroChoicePanelLayer.ccbi |
| `hero-palace/lbl-border-tip.png` | HeroPalaceLayer.ccbi |
| `hero-select-lang/contract1.png` | HeroContractSelectLayer.ccbi |
| `hero-select/spr-cur.png` | HeroMatrixCell.ccbi |
| `hero-skill/spr-title.png` | HeroSkillOpenInfoLayer.ccbi |
| `line_revener_bg.png` | LineRevenueLayer.ccbi |
| `luck-fish-2.png` | PROMLuckFishPoolLayer.ccbi |
| `luck-fish.png` | PROMLuckFish.ccbi, PROMLuckFishBuyLayer.ccbi |
| `main-scene/btn-sidebar-1.png` | ChatLayer.ccbi |
| `main-scene/btn-sidebar-2.png` | ChatLayer.ccbi |
| `new-year/dltb.png` | NewYearHallLayer.ccbi |
| `other/spr-wenhao.png` | RunesRecastItem.ccbi |
| `promotion-bg-13.jpg` | PROMAstrologyTaskLayer.ccbi |
| `promotion-bg-15.jpg` | PROMStarHeroLightDarkLayer.ccbi |
| `promotion-bg-15.png` | PROMWeekendGiftLayer.ccbi |
| `promotion-bg-16.jpg` | PROMStarHeroThreeLayer.ccbi |
| `promotion-bg-17.png` | PROMMonthInvestLayer.ccbi |
| `promotion-bg-DragonBoat-1.jpg` | PROMDragonBoatGameLayer.ccbi |
| `promotion-bg-DragonBoat-2.jpg` | PROMDragonBoatGameLayer.ccbi |
| `promotion-bg-DragonBoat-3.jpg` | PROMDragonBoatGiftLayer.ccbi |
| `promotion-bg-christmas-5-1.png` | PROMChristmasGiftBoxLayer.ccbi, PROMSpringEggsLayer.ccbi |
| `promotion-bg-recruit-1.jpg` | PROMSpiritWeekCardLayer.ccbi |
| `promotion-secret-treasure/bg-3.png` | PROMSecretTreasureRewardCellccb.ccbi |
| `promotion-secret-treasure/bg-4.png` | PROMSecretTreasureRewardCellccb.ccbi |
| `promotion/privilege-gift-1.png` | RCGPrivilegeGiftCell.ccbi |
| `promotion/spr-bg-40101001.png` | PROMBuySkinLayer.ccbi |
| `promotion/spr-number-0.png` | Common3BannerLayer.ccbi |
| `prophet-tree/lbl-luck.png` | ProphetTreeSummonCell.ccbi |
| `prophet-tree/spr-tip-1.png` | ProphetTreeSummonCell.ccbi |
| `res-icon/sold_out.png` | LimitShopItemCell.ccbi |
| `reward-layer-lang/spr-reward.png` | ChampionCrossRewardLayer.ccbi, SuperStageTopRewardLayer.ccbi |
| `reward-layer/spr-reward.png` | ChampionRewardLayer.ccbi, LuckRewardLayer.ccbi, ProphetTreeRewardLayer.ccbi, SevenDayTargetRewardCell.ccbi |
| `runes/spr-bg-1.png` | SmithRunesLayer.ccbi |
| `setting/spr-bg-1.png` | CompareShareLayer.ccbi |
| `shop/spr-type-2.png` | MissionCell.ccbi |
| `team-arena/spr-battle-4.png` | TeamArenaLayer.ccbi |
| `totem/totem-diyus.png` | TotemInfoLayer.ccbi |
| `中秋特惠.png` | MidAutumnActivityLayer.ccbi |
| `先知之树奖励预览.png` | ProphetTreeRewardPreviewLayer.ccbi |
| `技能升级.png` | HeroTalentUpLevelLayer.ccbi |
| `技能升级满级.png` | HeroTalentUpLevelLayer.ccbi |

## 子组件与嵌入

- 真正 CCB_FILE 嵌入的只有 2 个：`ResonateLayer`（被 MagicCubeLayer.ccbi 嵌入）和 `SlzmContentLayer`（被 SlzmLayer.ccbi 嵌入）。其余 cell/item 都是代码 `CCBReader` 动态加载到列表里，按文件名后缀（Cell/Item/Seat/Panel/Banner/Icon/Tip…）标为子组件。建议做成独立 Prefab，放在父页同目录，由父页引用。

## 备注
- `HeroCreatLayer/Cell` 实为"英雄创造/合成"（btn_compose、元素页签、消耗金币），不是新号创角，所以归到 P4。现有 CreateRolePanel 只是复用了它的底图 `chuangzaobg`。
- 有 3 个疑似废稿：`FriendRequestLayer_old`、`PROMSecretTreasureRewardCellccb`、`PROMSecretTreasureRewardItem.ccb`。建议开刀前跟老代码核对一下是否还在用，没在用的就跳过。
- 未读老 Lua/JS 业务代码，所以子组件判断基于文件名和嵌入关系。