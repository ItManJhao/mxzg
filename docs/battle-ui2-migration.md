# 战斗 UI 帧补刀（battle-ui2）

资源进仓。不接 Boot，不加 `USE_*`，不改协议 TS。Prefab 只加开战挂点，并把全屏 `Bg` 从错误的边角图换成战场大厅图。

每张新 PNG 带 Creator 3.8 image `.meta`（`6c48a` 贴图 + `f9941` spriteFrame，形状与 `ui/` 下现有 PNG 一致）。BMFont 的 `.fnt` 对标 `font/yellow-30.fnt.meta`，贴图对标现有 font PNG。`spine/dwvs` 对标现有 spine：png 只做 texture，atlas 是 `importer: "*"`，json 是 `spine-data` 并指向 atlas uuid。新目录 `spine/dwvs` 带 `importer: directory` 的 folder `.meta`。uuid 是新生成的，已和仓内已有 `.meta` uuid 对过，没有撞车。

## Bg 更正

**`battle-scene_spr-bg-1` 不是全屏战场底。** 原图 112×64，裁切 111×63，是边角 chrome。#170 把它拉到 720×1280 当 `Bg` 是错的。

真战场底是旧 `hd/ccbi-res/map-bg-mission-1.jpg`（648×1152 JPEG）。`ui/mainline/map-bg-mission-1.jpg` 与它字节相同。这一刀按 Manager 要求另放一份：

- `client/assets/resources/ui/maps/map-bg-mission-1.jpg`
- spriteFrame `26aac3a3-2eeb-4fc3-99a1-fb5c2782be7b@f9941`

`BattlePage.prefab` 和 `WireBattlePage.prefab` 的 `Bg` 都引用这一张，拉到 720×1280。运行时 `paintBattleScene` 也只换这张，不再去加载 `battle-scene_spr-bg-1`。主线页仍用 `ui/mainline/` 那一份，没有改它的 uuid。

## FOUND

| 组 | 文件数 | 落点 |
|----|------:|------|
| appear-left | 15 | `ui/battle/battle-appear-left_0`–`14` |
| appear-right | 15 | `ui/battle/battle-appear-right_0`–`14` |
| battle-detail | 11 | `ui/battle/battle-detail_*` |
| battle-detail-lang | 1 | `ui/battle/battle-detail-lang_spr-result-win` |
| battle-end | 32 | `ui/battle/battle-end_*`（含 `spr-vs`、round、wing、effect） |
| battle-end-lang | 13 | `ui/battle/battle-end-lang_*` |
| battle-quick-lang | 7 | `ui/battle/battle-quick-lang_*` |
| font | 14 | `font/yellow-73`、`red-73`、`blue-73`、`green-73`、`yellow-38`、`red-50`、`red-78`（各 `.fnt` + `.png`） |
| hero | 14 | `ui/battle/hero_*`（含 `progress-hp-bg/green/blue/red`） |
| quick-battle-effect | 10 | `ui/battle/quick-battle-effect_0`–`9` |
| spine-dwvs | 3 | `spine/dwvs/dwvs.{png,atlas,json}` |

合计 135 个资源文件，约 2.8 MB。另加上面的大厅 jpg。

飘字 BMFont 路径（`ActionNodeFactory`）：伤害 `font/yellow-73`，暴击 `font/red-73`，技能名 `font/blue-73`，治疗 `font/green-73`。Prefab 上的 Label 仍是 `font/FZCSJW-GB1-0.ttf`，这一刀不把 BMFont 挂上去。

`BattlePage` 增加挂点，不改 HUD 按钮：

- `LayerAppear` / `AppearLeft` / `AppearRight`：空节点。左右擦除帧在 resources，不收成一张 sprite。
- `VsBar`：引用 `battle-end_spr-vs`（80×46），位置 (0, 240)。

`spine/dwvs` 只入库，不嵌进 Prefab。

## STILL MISSING

1. **`battle-end-2` / `battle-end/start-*`「战斗开始」字动画** — `cfg.effect2.eff_battle_start` 指向 `battle-end-2.plist` 和 `battle-end/start-%d.png`，旧 `hd/ccbi-res` 里没有这份图集（只有 `battle-end-1` 和 lang）。左右擦除可以当 wipe，标题字动画不在这批盘上。
2. **头顶等级框** — 旧战斗等级是描边 TTF，hero / battle 图集里没有 level-frame PNG。
3. **单独的 x1 / x2 / x3 文字帧** — 没找到。速度字已经画在 main 上的 `battle-scene_btn-speed-*` 里。
4. **日文「戦闘中」单独图** — 中文 `button_btn-battle-1/2` 已在 main 的 `ui/common/`。没有另找一份日文中钮。
5. **姓名板立绘 / 光环**（`hero-icon/elem-*`、`hero-select/spr-matrix-*`）— 大图标集，这一刀不迁。
6. **全量 skill PVR** — 不在这刀。#170 的子集不动。

## 故意没迁

- #170 的 10 张 `battle-scene` 帧（含错误当过全屏底的 `spr-bg-1`，文件留着，只是不再当 `Bg`）
- `power_spr-*`、`button_btn-battle-*`（已在 `ui/common/`）
- hero-icon 大图集、全量 skill、audio
- Boot、`USE_*`、协议 TS
