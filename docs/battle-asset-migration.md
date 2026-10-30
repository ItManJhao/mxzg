# 战斗素材迁移（2026-10-22）

资源进仓，给 Creator 看真战斗 UI 和受击 / 技能帧。不接 Boot，不加 `USE_*`，不改协议 TS，不改战斗回放脚本。

**`battle-scene_spr-bg-1` 不是全屏战场底。** 原图 112×64，裁切 111×63，是边角 chrome。#170 把它拉到 720×1280 当 `Bg` 是错的。BattlePage / WireBattlePage 的 `Bg` 现为 `ui/maps/map-bg-mission-1.jpg`（648×1152）。这一刀的帧和挂点见 [`battle-ui2-migration.md`](battle-ui2-migration.md)。

每张新 PNG 带 Creator 3.8 image `.meta`（`6c48a` 贴图 + `f9941` spriteFrame，形状与 `client/assets/resources/ui/` 下现有 PNG 一致）。每个新目录带 `importer: directory` 的 folder `.meta`。uuid 是新生成的，已和仓内已有 `.meta` uuid 对过，没有撞车。

## 落了什么

| 路径 | PNG | 字节 |
|------|----:|-----:|
| `client/assets/resources/ui/battle/` | 10 | 66,996 |
| `client/assets/resources/battle/hero-beattack/` | 26 | 327,232 |
| `client/assets/resources/battle/skill-effect/` | 104 | 4,275,236 |
| `client/assets/resources/battle/skill/<stem>/` | 534 | 8,536,496 |
| 合计 | 674 | 13,205,960（约 12.6 MB） |

源 zip 合计约 13.3 MB。

### ui/battle（10，跳过 battle-kor）

- `battle-scene_btn-close-1.png`
- `battle-scene_btn-speed-1.png`
- `battle-scene_btn-speed-2.png`
- `battle-scene_btn-speed-3.png`
- `battle-scene_btn-speed-10.png`
- `battle-scene_btn-speed-11.png`
- `battle-scene_prog-1.png`
- `battle-scene_prog-bg-1.png`
- `battle-scene_prog-frame-1.png`
- `battle-scene_spr-bg-1.png`（原图 112×64，裁切 111×63）。**不是全屏底**，Prefab `Bg` 不再引用 `b117e1f3-0253-4616-95db-bed6a5007adb@f9941`。

`BattlePage.prefab` 和 `WireBattlePage.prefab` 的 `Bg` 用 `ui/maps/map-bg-mission-1.jpg`，拉到 720×1280。`LayerFloat`、`SkillNameBanner`、`HeadAnchor` 不动。表现接线挂上 `BtnSpeed`，血条和技能条用 `battle-scene_prog-bg-1` / `battle-scene_prog-1`，回放把帧序列挂到 `VfxHit` / `VfxSkill`。`BtnClose` 仍用通用关闭钮，不用 `battle-scene_btn-close-1`。Prefab 上这三个特效挂点仍不写 sprite uuid。

### hero-beattack（26）

`client/assets/resources/battle/hero-beattack/hero-beattack_*.png`

### skill-effect（7 stems / 104）

| stem | 帧 |
|------|---:|
| `duola-skill-effect-parry` | 24 |
| `skill-effect-contract` | 20 |
| `skill-effect-parry` | 10 |
| `skill-effect-revive` | 11 |
| `skill-effect-shield` | 10 |
| `skill-effect-slient` | 8 |
| `titan-skill-effect-contract` | 21 |

### skill 子集（49 stems / 534）

hero-skill，加上 101 / 102 / 103 / 104 里中小图，以及 PNG 图集 `skill-101050201-2`、`skill-101050201-3`。全量 skill 对是 353，这一刀是其中 49 个。

| stem | 帧 |
|------|---:|
| `hero-skill` | 10 |
| `skill-101010011` | 9 |
| `skill-101020021` | 11 |
| `skill-101030030` | 6 |
| `skill-101040050` | 7 |
| `skill-101040051` | 6 |
| `skill-101040120-1` | 8 |
| `skill-101040120-2` | 14 |
| `skill-101050060` | 11 |
| `skill-101050070` | 8 |
| `skill-101050073` | 19 |
| `skill-101050080` | 11 |
| `skill-101050080-1` | 6 |
| `skill-101050080-2` | 12 |
| `skill-101050083` | 11 |
| `skill-101050085` | 7 |
| `skill-101050090` | 18 |
| `skill-101050100` | 23 |
| `skill-101050101` | 21 |
| `skill-101050110` | 10 |
| `skill-101050130` | 8 |
| `skill-101050201-2` | 23 |
| `skill-101050201-3` | 12 |
| `skill-102010011` | 4 |
| `skill-102020021` | 14 |
| `skill-102030031` | 8 |
| `skill-102040040` | 14 |
| `skill-102040050` | 11 |
| `skill-102050060` | 8 |
| `skill-102050070` | 7 |
| `skill-102050080` | 7 |
| `skill-102050100` | 18 |
| `skill-103010011` | 7 |
| `skill-103020021` | 15 |
| `skill-103030030` | 12 |
| `skill-103030031` | 9 |
| `skill-103040041` | 11 |
| `skill-103040050` | 8 |
| `skill-103040051` | 10 |
| `skill-103040120` | 11 |
| `skill-103050060` | 18 |
| `skill-104030011` | 6 |
| `skill-104040020` | 9 |
| `skill-104040021` | 9 |
| `skill-104040031` | 9 |
| `skill-104050040` | 6 |
| `skill-104050041` | 11 |
| `skill-104050050` | 7 |
| `skill-104050060` | 14 |

## 本刀没迁

- 剩下约 300 个 skill 图集（353 里的其余部分）
- 大于约 3MB 的大图集
- 大部分 `skill_*` 下划线变体
- `battle-kor`
- audio
- 主城 zip

## 主城

没有 city zip。旧 `main-city` 图集里的 `btn-login` 只有 `btn-login-1` 和 `btn-login-8` 两个号，不是 1–8 一整套。这两张已经在 main 的 `client/assets/resources/ui/city/`（`main-city_btn-login-1.png`、`main-city_btn-login-8.png`）。
