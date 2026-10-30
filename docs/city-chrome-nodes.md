# 主城顶底栏节点（CityChrome）

设计画布 **720×1280**，原点在画面中心，和 `CityHub`、原来的 `CityChrome` 一样。底栏、顶栏原图大约 640 宽，Prefab 里拉到 720。运行时顶栏和底栏再按 `view.getVisibleSize()` 的宽左右拉开，不保持 720。`sealBottomBg` 垫住底栏贴图的左右透边。

再生：`python3 client/tools/gen_citychrome_prefab.py`。脚本从 chrome zip 覆盖同路径 PNG（有则写），给新图补 Creator 3.8 `.meta`，已有图只在裁切数字变化时改 `.meta`，**不改 uuid**。不写 #66 那五张九宫格，不引用日文 `lbl` 位图。

`CityChromeShell` 只有 `@property` 节点引用。不加载 Prefab，不发协议。`USE_CITY_CHROME_PREFAB` 仍是原来的开关，本刀不改它。`CityChrome.ts` 只把已有绑定改到下面这些路径，好让顶栏名字、货币和七个底栏继续能写、能点。

## 脚本类 id

稳定 chunk id、Prefab `__type__`、Creator 3.8.8 打包器写进 `_RF.push` 的 id，是同一个 23 位字符串：`c4e8aHSe2NOkI8Vai2cC0fj`。

它来自 `CityChromeShell.ts.meta` 的 uuid `c4e8a1d2-7b63-4e90-8f15-6a2d9c0b47e3`，走 `compressUuid(uuid, false)`（保留头 **5**，十六进制头是 `c4e8a`）。meta uuid 保持这 36 位，不要重铸，也不要把压缩串写回 `.meta`。

仓库里的对照是 `Boot.scene`。Boot 组件的 `__type__` 是 `7a774EzNstHxZ/KPGZkNwxs`，同样是 `Boot.ts.meta` 的 uuid `7a774133-36cb-47c5-9fca-3c6664370c6c` 走保留头 5 的 23 位形式。打包器 `_RF.push` 用的也是这一档。

旧的 22 位 `c46KHSe2NOkI8Vai2cC0fj` 是 `compressUuid(uuid, true)`（保留头 2）。Prefab 若仍用它，就和 `_RF.push` 的 23 位对不上，检查器显示 MissingScript / 「脚本编译失败」。#150 里「删掉 temp、只接受 `c46…`」已经过时，不要再按那个恢复。

改完 `__type__` 之后清一次 `client/library` 和 `client/temp`，再打开工程让脚本重编。新 chunk 里应是 `_RF.push({}, "c4e8aHSe2NOkI8Vai2cC0fj", "CityChromeShell")`，并且和 Prefab `__type__` 相同。

自检：`python3 client/tools/check_citychrome_shell_id.py`。全仓 Prefab / scene 另跑 `python3 client/tools/check_script_type_ids.py`，22 位脚本 `__type__` 会失败。

## 节点

坐标是画面中心系。父节点不是根时，表里写的是换算后的画面位置。

| 节点 | 画面位置 | 尺寸 | 作用 |
| --- | --- | --- | --- |
| `TopBar` | (0, 568) | 720×160 | 顶栏组，挡点击 |
| `TopBar/Bg` | (0, 567) | 720×146 | 金边顶条 |
| `TopBar/Avatar` | (-304, 588) | 104×104 | 头像金圈 |
| `TopBar/LevelBg` | (-304, 546) | 60×22 | 等级底，压在头像下沿 |
| `TopBar/LblLevel` | (-304, 546) | 52×20 | 等级，默认 `1` |
| `TopBar/NameBg` | (-150, 602) | 176×34 | 名字底 |
| `TopBar/LblName` | (-150, 602) | 160×28 | 名字。绑定写 `formatNameLine()` |
| `TopBar/LblSub` | (-150, 574) | 200×18 | 区服行。绑定写 `formatSubLine()` |
| `TopBar/PowerSlot` | (22, 602) | 112×30 | 战力槽 |
| `TopBar/PowerSlot/Value` | (38, 602) | 52×24 | 战力数字。Prefab 默认 `0`。`refreshChrome` 写成名册 `fighting` 之和，一个都没有就留空 |
| `TopBar/CurrencyGold` | (154, 602) | 136×30 | 金币槽 |
| `TopBar/CurrencyGold/Value` | (150, 602) | 68×24 | 绑定写 `formatGoldLine()`，过长会缩小 |
| `TopBar/CurrencyGold/BtnAddGold` | (206, 602) | 24×24 | 蓝色加号。`clickEvents` 空 |
| `TopBar/CurrencyGem` | (292, 602) | 124×30 | 钻石槽 |
| `TopBar/CurrencyGem/Value` | (290, 602) | 62×24 | 绑定写 `formatDiamondLine()` |
| `TopBar/CurrencyGem/BtnAddGem` | (340, 602) | 22×22 | 蓝色加号。`clickEvents` 空 |
| `ActGroup` | (210, 424) | 280×116 | 右上活动组，不是通栏 |
| `ActGroup/ActRecommend` | (98, 450) | 50×50 | 英雄推荐 |
| `ActGroup/ActSevenDay` | (154, 450) | 50×50 | 七日目标 |
| `ActGroup/ActHeroArrive` | (210, 450) | 50×50 | 英雄降临 |
| `ActGroup/ActPrivilege` | (266, 450) | 50×50 | 特权 |
| `ActGroup/ActWelfare` | (322, 450) | 50×50 | 福利 |
| `ActGroup/BtnActExpand` | (210, 394) | 36×28 | 展开箭头 |
| `ActGroup/ActLimitGift` | (266, 394) | 50×50 | 限时礼包 |
| `ActGroup/ActLimitTime` | (322, 394) | 50×50 | 限时活动 |
| `MonthCard` | (-330, 300) | 44×168 | 左侧月卡条空桩，无贴图 |
| `UtilityRow` | (208, -468) | 300×52 | 底栏上方右侧小圆钮 |
| `UtilityRow/BtnReplay` | (96, -468) | 48×48 | 录像 |
| `UtilityRow/BtnFriend` | (152, -468) | 48×48 | 好友 |
| `UtilityRow/BtnMail` | (208, -468) | 48×48 | 邮件 |
| `UtilityRow/BtnRank` | (264, -468) | 48×48 | 排行 |
| `UtilityRow/BtnMore` | (320, -468) | 48×48 | 更多（蓝圆加号） |
| `BottomBar` | (0, -575) | 720×140 | 底栏组，挡点击 |
| `BottomBar/Bg` | (0, -575.5) | 720×129 | 金边底框 |
| `BottomBar/TabCity` | (-300, -562) | 78×78 | 主城。子节点 `Icon` `Label` `Lock` |
| `BottomBar/TabHero` | (-200, -562) | 78×78 | 英雄 |
| `BottomBar/TabBag` | (-100, -562) | 78×78 | 背包 |
| `BottomBar/TabBattle` | (0, -548) | 96×96 | 战斗。正中，圆底更大、位置略高。打开主线 |
| `BottomBar/TabDungeon` | (100, -562) | 78×78 | 副本。图标文件名是 `spr-skin`，国服字是副本 |
| `BottomBar/TabClan` | (200, -562) | 78×78 | 公会 |
| `BottomBar/TabFetter` | (300, -562) | 78×78 | 羁绊 |
| `BtnActivity` | (-160, -470) | 168×48 | **未激活**。对齐 `CITY_SCREEN_ACTIVITY` |
| `BtnMorePanel` | (160, -470) | 168×48 | **未激活**。对齐 `CITY_SCREEN_MORE` |

底栏七个钮都有 `cc.Button`（缩放，`clickEvents` 为空）。选中时现有逻辑染的是圆底，不染 `Icon`。`Lock` 默认隐藏，锁定时由绑定打开。`Label` 文案仍走原来的 `setTabs`。

`BtnActivity` / `BtnMorePanel` 仍不激活，没有可见底图，避免盖住 `UtilityRow`。主屏不再画红「活动」、蓝「更多」矩形。`ActGroup` 上每个钮打开原来的活动列表，`UtilityRow/BtnMore` 以及录像、好友、排行打开原来的更多列表。`UtilityRow/BtnMail` 打开原来的邮件页。离开主城页时这两块先隐藏，免得压住面板。底栏七个钮仍走原来的 `onTab`。战斗进主线，副本进日常副本。

## 贴图

| 用途 | 路径 |
| --- | --- |
| 顶条 | `ui/city/main-scene_spr-up-bg.png` |
| 底框 | `ui/city/main-scene_spr-bottom-bg.png`（zip 垫边覆盖，uuid 不变） |
| 头像框 | `ui/city/main-scene_spr-head-frame-1.png` |
| 名字底 | `ui/city/main-scene_spr-name-bg-1.png` |
| 等级底 | `ui/city/main-scene_spr-level-bg.png` |
| 货币 / 战力槽 | `ui/city/main-scene_spr-res-bg.png` |
| 战力字 | `ui/common/other_spr-power.png` |
| 金币、钻石 | `ui/common/res-icon_res-1.png`、`res-icon_res-2.png` |
| 蓝色加号 | `ui/common/button_btn-add-4.png` |
| 底栏圆底 | `ui/common/button_btn-circle-blue-1.png`；玩法用 `button_btn-circle-blue-2.png` |
| 主城 / 英雄 / 背包 / 战斗 | `ui/city/main-scene-lang_spr-city.png`、`spr-hero.png`、`spr-backpack.png`、`spr-battle.png` |
| 副本 / 公会 / 羁绊 | `main-scene-lang_spr-skin.png`（字是副本）、`spr-clan.png`、`main-scene_spr-fetter.png` |
| 锁 | `ui/city/main-scene_spr-lock.png` |
| 活动图标 | `main-city_btn-hero-recommend-1`、`icon-act_sevent_day_target`、`icon-act_hero_arrive`、`icon-act_privilege`、`icon-act_welfare`、`icon-act_limit_gift`、`icon-act_limit_time_activity` |
| 展开 | `ui/common/button_btn-down.png` |
| 工具圆钮 | `main-city_btn-main-video-studio`、`btn-friend-1`、`btn-mail-1`、`btn-rank-1`、`btn-unfold-1` |

字用 `font/FZCSJW-GB1-0.ttf`。没有把日文 `main-scene-lang_lbl-*` 放进 Prefab。

zip 里另外盖上、本 Prefab 没用的图：`main-scene_spr-battle-bottom`（640×369 的面板框，不是底栏）、`spr-backpack`、`main-scene-lang_spr-backpack/clan/skin`、`button_btn-add-1/2/10/11`、`button_btn-info*`、`button_btn-left*`、`other_spr-power-bg`、`power_spr-power-bg`、`power_spr-power-title`。uuid 已有的保持不变。

## 和日文主城的差别

日文参考是白金顶条、右上小叠活动圆、底栏上方一排工具圆、底栏 7 个大圆标。国服字图是主城 / 英雄 / 背包 / 战斗 / 副本 / 公会 / 羁绊，战斗在正中略突出。副本图的文件名是 `spr-skin`，不要按日文 VIP 或「皮肤」来标。

本刀：

- 底栏是这 **7** 格。召唤和铁匠铺留在城内建筑上，不占底栏。玩法列表仍在，不占底栏。公会只开占位页。
- 顶条是现有 `spr-up-bg`（蓝底金边），图集里没有另一张纯白顶条。
- 加号是蓝色菱形 `btn-add-4`，不是圆角小蓝钮。
- 召唤、铁匠铺没有独立圆标，用的是地图建筑牌（自带「召唤法阵」「铁匠铺」横幅），再加中文 `Label`。
- 活动只放了 7 个占位，叠成两排靠右。`CityMap` 不再把配置里的活动图标铺成通栏，避免和 `ActGroup` 叠在一起。地图拖动和建筑点不动。`placeActivities` 仍算出那 33 个点，只给布局自检，不往画面上挂。
- 月卡条只有空节点 `MonthCard`。
- 战力数字和等级徽章还是占位。现有绑定只写名字（名字串里仍带 `Lv`）、区服、金币、钻石。
- 红「活动」、蓝「更多」矩形已停。入口改挂 Prefab：`ActGroup` 进活动列表，`UtilityRow/BtnMore` 进更多列表。同坐标的 `BtnActivity`、`BtnMorePanel` 继续关着。

## 预览

不改 `Boot.ts`，也不改 `USE_CITY_CHROME_PREFAB`。这个开关在主线上已经是 `true`，本刀保持原值。进主城走 `mountCityChromePrefab`，能看到金边顶底栏、右上 `ActGroup`、底栏上方 `UtilityRow`。代码通栏和红蓝矩形不再出现。

Creator 里直接打开 `assets/prefabs/ui/city/CityChrome.prefab`。`BtnActivity`、`BtnMorePanel` 在层级里是关着的。

要把壳退回纯代码顶底栏，把 `USE_CITY_CHROME_PREFAB` 临时改成 `false` 再预览。那只用于看旧壳，不要当成默认提交。
