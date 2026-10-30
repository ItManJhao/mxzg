# 主城地图配置（方案 B）

> 只迁配置 JSON + meta，不接 Boot / USE_*；不改 CityChrome、B1–B3 玩法 Prefab、#66 九宫格。
> 不含 Pilot 日文 lbl 位图。

## 方案说明

方案 B：用 CreatorPilot `MainCityPilot` 的 `maincity/config` 作为主城建筑落点与活动入口表，挂到 mxzg：

```
client/assets/resources/config/maincity/
  maincitypos.json(+.meta)
  createmaincitybtn.json(+.meta)
  maincityeffect.json(+.meta)   # 可选：地图特效挂点
client/assets/resources/config/maincity.meta   # 目录 meta（新 uuid，非 Pilot 原路径 uuid）
```

资源加载路径示例：`resources/config/maincity/maincitypos`（JsonAsset）。

## 源 → 目标

| Pilot | mxzg stage |
|-------|------------|
| `MainCityPilot/assets/resources/maincity/config/maincitypos.json` | `client/assets/resources/config/maincity/maincitypos.json` |
| `.../createmaincitybtn.json` | `.../createmaincitybtn.json` |
| `.../maincityeffect.json` | `.../maincityeffect.json` |
| 各 `*.json.meta` | **原样拷贝** Pilot meta（含 uuid） |
| `maincity/config.meta`（目录） | **未复用**；新建 `config/maincity.meta`（见下） |

### Meta 注意

- 三个 JsonAsset `.meta` 直接来自 Pilot，importer=`json`，ver=`2.0.1`，与仓内 `resources/config/opencondition.json.meta` 同型。
- 目录 `maincity.meta` 为新建：`importer=directory`，uuid=`b3e8c1a4-7f92-4d6e-9a15-2c0d8f4e6b71`（勿与 Pilot `config.meta` uuid `0d76dabc-...` 混用，路径不同）。
- 合入前若 Creator 已自动生成过同路径 meta，以编辑器为准，避免手搓撞 uuid。

## `maincitypos.json` — 地图建筑 atom → 入口

共 **19** 个 atom（落点 x/y + zorder + reddot）。中文名用 Label 即可，本包不强制 Prefab。

| atom | 中文名（建议 Label） | 期望 icon（plist 路径） | mxzg `ui/city` 文件 | 状态 |
|------|----------------------|-------------------------|---------------------|------|
| main_ancient | 远古遗迹 | main-city/icon-main_ancient.png | main-city_icon-main_ancient.png | OK |
| main_hero_make | 英雄合成 | main-city/icon-main_hero_make.png | main-city_icon-main_hero_make.png | OK |
| main_summon | 召唤 | main-city/icon-main_summon.png | main-city_icon-main_summon.png | OK |
| main_blessingpool | 祈福池 | main-city/icon-main_blessingpool.png | main-city_icon-main_blessingpool.png | OK |
| main_shop | 商店 | main-city/icon-main_shop.png | main-city_icon-main_shop.png | OK |
| main_smith_shop | 铁匠铺 | main-city/icon-main_smith_shop.png | main-city_icon-main_smith_shop.png | OK |
| main_pub_task | 酒馆任务 | main-city/icon-main_pub_task.png | main-city_icon-main_pub_task.png | OK |
| main_altar | 祭坛 | main-city/icon-main_altar.png | main-city_icon-main_altar.png | OK |
| main_prophet_tree | 先知之树 | main-city/icon-main_prophet_tree.png | main-city_icon-main_prophet_tree.png | OK |
| main_fantasy_land | 幻境之地 | main-city/icon-main_fantasy_land.png | main-city_icon-main_fantasy_land.png | OK |
| main_pvp | 竞技场 | main-city/icon-main_pvp.png | main-city_icon-main_pvp.png | OK |
| main_fantasy_tower | 幻境之塔 | main-city/icon-main_fantasy_tower.png | main-city_icon-main_fantasy_tower.png | OK |
| main_black_market | 黑市 | main-city/icon-main_black_market.png | main-city_icon-main_black_market.png | OK |
| main_hero_pernute | 英雄置换 | main-city/icon-main_hero_pernute.png | main-city_icon-main_hero_pernute.png | OK |
| main_hero_palace | 英雄殿堂 | main-city/icon-main_hero_palace.png | main-city_icon-main_hero_palace.png | OK |
| main_exotic_adventure | 异域冒险 | main-city/icon-main_exotic_adventure.png | main-city_icon-main_exotic_adventure.png | OK |
| main_magic_cube | 魔方 | main-city/icon-main_magic_cube.png | main-city_icon-main_magic_cube.png | OK |
| main_crusade_group | 远征团 | main-city/icon-main_crusade_group.png | main-city_icon-main_crusade_group.png | OK |
| main_country_war | 国战 | main-city/icon-main_country_war.png | main-city_icon-main_country_war.png | OK |

仓内另有未进 pos 表的建筑 icon（可后续挂）：`clan` / `dream` / `dungeon` / `fetter` / `mission` / `proving_lang` / `rank` / `champion` / `champion_cross`。

## `createmaincitybtn.json` — 活动/侧栏 atom → 入口

共 **33** 个 atom（`act` 段）。`path` 为老 plist 逻辑路径；解帧后文件名多为 `main-city_<basename>`。

| atom | 中文名（建议） | config path | mxzg 对应 | 状态 |
|------|----------------|-------------|-----------|------|
| act_privilege | 特权 | btn-login-3.png | 建议用 icon-act_privilege | path 缺；有 act icon |
| act_welfare | 福利 | btn-login-2.png | icon-act_welfare | path 缺；有 act icon |
| act_limit_time_activity | 限时活动 | btn-login-5.png | icon-act_limit_time_activity | path 缺；有 act icon |
| act_month_invest | 月投资 | btn-login-11.png | icon-act_month_invest | path 缺；有 act icon |
| act_recharge_first | 首充 | btn-login-4.png | icon-act_recharge_first | path 缺；有 act icon |
| act_sevent_day_target | 七日目标 | btn-login-6.png | icon-act_sevent_day_target | path 缺；有 act icon |
| act_sevent_day_gift | 七日礼包 | btn-login-10.png | icon-act_sevent_day_gift | path 缺；有 act icon |
| act_new_server_limit_activity | 新服限时 | btn-login-12.png | icon-act_new_server_limit_activity | path 缺；有 act icon |
| act_day_first_recharge | 每日首充 | btn-login-7.png | icon-act_day_first_recharge | path 缺；有 act icon |
| act_hero_arrive | 英雄降临 | hero-arrive.png | icon-act_hero_arrive | path 缺；有 act icon |
| act_limit_gift | 限时礼包 | btn-login-9.png | icon-act_limit_gift | path 缺；有 act icon |
| act_mid_autumn | 中秋 | btn-login-14.png | icon-act_mid_autumn | path 缺；有 act icon |
| act_happy_month | 欢乐月 | btn-login-13.png | icon-act_happy_month | path 缺；有 act icon |
| act_clan_gvg | 公会 GvG | icon-act_clan_gvg.png | main-city_icon-act_clan_gvg.png | OK |
| act_clan_boss | 公会 Boss | icon-act_clan_boss.png | main-city_icon-act_clan_boss.png | OK |
| act_festival_gift | 节日礼包 | icon-act_clan_gvg.png（复用） | 有 icon-act_festival_gift | path 复用；建议改指向 festival |
| act_sevent_day_christmass_gift | 圣诞七日礼 | icon-act_clan_gvg.png（复用） | 有 icon-act_sevent_day_christmass_gift | path 复用；建议改指向自有 icon |
| act_develop_gift_activity | 养成礼包 | icon-act_develop_gift_activity.png | OK | OK |
| main_champion | 冠军赛 | icon-main_champion.png | OK | OK |
| act_new_year | 新年 | icon-act_new_year.png | OK | OK |
| act_limit_time_server | 限时开服 | icon-act_limit_time_server.png | OK | OK |
| main_champion_cross | 跨服冠军 | icon-main_champion_cross.png | OK | OK |
| act_mystery_box | 神秘宝箱 | icon-act_mystery_box.png | OK | OK |
| act_adven_note | 冒险笔记 | icon-act_adven_note.png | OK | OK |
| act_secret_treasure | 秘宝 | icon-act_secret_treasure.png | OK | OK |
| act_seven_artifact | 七神器 | icon-act_seven_artifact.png | OK | OK |
| act_supre_gift | 至尊礼包 | icon-act_supre_gift.png | OK | OK |
| act_appreciate_moon | 赏月 | icon-act_appreciate_moon.png | OK | OK |
| act_halloween | 万圣节 | icon-act_halloween.png | OK | OK |
| act_black_friday | 黑五 | icon-act_black_friday.png | OK | OK |
| act_christmas | 圣诞 | icon-act_christmas.png | OK | OK |
| act_war_order | 战令 | icon-act_war_order.png | OK | OK |
| act_spring | 春节 | icon-act_spring.png | OK | OK |

仓内仅有 `btn-login-1` / `btn-login-8`，图集键也只有这两个。config 引用的 2–7、9–14 没有独立 PNG。`CityMap` 的 `activityIconCandidates` 先找 `ui/city/main-city_<文件名>`，找不到就用 `ui/city/main-city_icon-<atom>`（即已有的 `main-city_icon-act_*`）。缺的登录钮保持这条回退，不另画按钮，也不搬日文 lbl。

## `maincityeffect.json` — 地图特效挂点

7 条：`eff_main_city_summon` / `rivers1` / `rivers2` / `photosphere` / spine `dx` / `crack` / spine `chuanghu`，parent 多为 `spr_map_bg2`。仓内 `ui/city` 已有 `main-city-effect_*` 帧图（photosphere / crack 等）；spine 资源是否齐需另核。

## 已有 map-bg-city 底板

`client/assets/resources/ui/maps/`：

- map-bg-city-1-1-1.png / 1-1-2.png
- map-bg-city-1-2-1.png / 1-2-2.png
- map-bg-city-2-1-1.png / 2-1-2.png
- map-bg-city-2-2-1.png / 2-2-2.png
- map-bg-city-3-1-1.png / 3-1-2.png
- map-bg-city-4-1-1.jpg / 4-1-2.jpg

共 **12** 张（6 对）。方案 B 拼图用这些板即可，本包不改地图图。

## 缺口清单

1. **建筑 icon**：`main-city_icon-main_country_war.png` 已入库（spriteFrame `3e507128-946f-56a8-ace2-852b82b1145d@f9941`）。
2. **活动 btn-login**：`btn-login-2..7,9..14` 与 `hero-arrive.png` 仍缺。`CityMap` 继续用 `main-city_icon-act_*` 回退，不补假图。
3. **path 命名**：config 写 `main-city/foo.png`，解帧文件是 `main-city_foo.png` — 加载层需做映射。
4. **日文 lbl**：明确不迁。

## 范围外

- 不接 Boot / USE_*
- 不改 CityChrome / CityHub Prefab
- 不改 B1–B3 玩法 Prefab、#66 九宫格
- 不 git commit / push（由 parent CloudAgent 开 draft）