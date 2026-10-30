# Batch B1a UI frames

ccbi-res atlas PNG frames for nine UI modules, each with a Creator 3.8.8 sprite-frame `.meta`. Prefabs are not rewired. Boot, `USE_*`, protocol scripts, spine, and skill are unchanged. `mission-1` and BattlePage `Bg` are unchanged.

## Baseline

- Repo tip: `6e99cd7` (Batch A #175)
- Source: `idle/res/hd/ccbi-res`
- Tool: `extract_pvr_atlas.py --pad-source`
- Manifest: Batch B1 (`mxzg-mig-batch-b1`). This PR is only the modules below.
- Zip parts: `mxzg-mig-batch-b1a-p1` + `mxzg-mig-batch-b1a-p2`, unpacked at `client/assets/resources/ui/<module>/`

Hero and misc are the B1b sibling PR, not this one.

## What landed

Manifest header: 4129 PNG paths in the full B1 entry list. Hero (1042) + misc (832) = 1874, so B1a entries are **2255**. The per-stem "new frames" column sums to 2256 for these modules; the extra 1 is the backpack family (see bag).

| module | stems | on disk | bytes | manifest new frames |
|--------|------:|--------:|------:|--------------------:|
| `ui/arena/` | 4 | 37 | 519,531 | 37 |
| `ui/bag/` | 6 | 911 | 10,854,030 | 912 |
| `ui/city/` | 4 | 66 | 889,553 | 66 |
| `ui/clan/` | 9 | 251 | 7,156,233 | 251 |
| `ui/common/` | 38 | 827 | 14,079,092 | 827 |
| `ui/mail/` | 1 | 6 | 54,184 | 6 |
| `ui/sevenday/` | 3 | 23 | 168,567 | 23 |
| `ui/shop/` | 3 | 43 | 1,373,767 | 43 |
| `ui/summon/` | 7 | 91 | 2,708,518 | 91 |
| **B1a** | **75** | **2255** | **37,803,475** | **2256** |

`ui/clan/` and `ui/mail/` are new folders. Each has an `importer: directory` `.meta` (`ver` 1.2.0), same shape as `ui/city.meta`.

### Stem counts

On-disk count is files whose name starts with `{stem}_`. Two atlases do not use that prefix; they are called out under the table.

| stem | module | manifest new | on disk |
|------|--------|-------------:|--------:|
| championship-lang | `ui/arena/` | 7 | 7 |
| pvp | `ui/arena/` | 15 | 15 |
| pvp-lang | `ui/arena/` | 3 | 3 |
| team-arena | `ui/arena/` | 12 | 12 |
| backpack | `ui/bag/` | 60 | — |
| backpack-4 | `ui/bag/` | 470 | — |
| backpack-5 | `ui/bag/` | 290 | — |
| backpack + backpack-4 + backpack-5 | `ui/bag/` | 820 | 819 (`backpack_*`) |
| backpack-effect | `ui/bag/` | 34 | 34 |
| backpack-info | `ui/bag/` | 52 | 52 |
| backpack-info-lang | `ui/bag/` | 6 | 6 |
| main-altar | `ui/city/` | 20 | 20 |
| main-scene-effect-2 | `ui/city/` | 10 | 10 |
| main-task | `ui/city/` | 27 | 27 |
| main-task-lang | `ui/city/` | 9 | 9 |
| clan | `ui/clan/` | 62 | 62 |
| clan-boss | `ui/clan/` | 6 | 6 |
| clan-boss-effect | `ui/clan/` | 20 | 20 |
| clan-boss-lang | `ui/clan/` | 7 | 7 |
| clan-gvg | `ui/clan/` | 37 | 37 |
| clan-gvg-effect | `ui/clan/` | 55 | 55 |
| clan-gvg-lang | `ui/clan/` | 6 | 6 |
| clan-lang | `ui/clan/` | 13 | 13 |
| clan-photo | `ui/clan/` | 45 | 45 |
| artifact | `ui/common/` | 16 | 16 |
| artifact-lang | `ui/common/` | 4 | 4 |
| artifacts | `ui/common/` | 17 | 17 |
| chat | `ui/common/` | 13 | 13 |
| common-ui-2 | `ui/common/` | 242 | 242 |
| daily-first-recharge | `ui/common/` | 6 | 6 |
| daily-first-recharge-lang | `ui/common/` | 4 | 4 |
| daily-tasks | `ui/common/` | 13 | 13 |
| emoji | `ui/common/` | 24 | 24 |
| friend | `ui/common/` | 6 | 6 |
| god-equip | `ui/common/` | 78 | 78 |
| god-equip-lang | `ui/common/` | 4 | 4 |
| guide | `ui/common/` | 35 | 35 |
| item-reward | `ui/common/` | 11 | 11 |
| item-reward-effect-1 | `ui/common/` | 10 | 10 |
| item-reward-effect-2 | `ui/common/` | 11 | 11 |
| lang-1 | `ui/common/` | 24 | 24 |
| loading | `ui/common/` | 8 | 8 |
| make-equip | `ui/common/` | 4 | 4 |
| notice | `ui/common/` | 1 | 1 |
| online-reward | `ui/common/` | 17 | 17 |
| online-reward-lang | `ui/common/` | 5 | 5 |
| pet | `ui/common/` | 6 | 6 |
| pet-icon | `ui/common/` | 30 | 30 |
| rank | `ui/common/` | 24 | 24 |
| rank-lang | `ui/common/` | 9 | 9 |
| rename | `ui/common/` | 2 | 2 |
| reward-layer | `ui/common/` | 34 | 34 |
| reward-layer-lang | `ui/common/` | 9 | 9 |
| role-info | `ui/common/` | 4 | 4 |
| role-title | `ui/common/` | 22 | 22 |
| runes | `ui/common/` | 38 | 38 |
| runes-effect | `ui/common/` | 49 | 49 |
| runes-lang | `ui/common/` | 5 | 5 |
| setting | `ui/common/` | 23 | 23 |
| setting-identification | `ui/common/` | 14 | 14 |
| setting-lang | `ui/common/` | 4 | 4 |
| talent | `ui/common/` | 1 | 1 |
| mail | `ui/mail/` | 6 | 6 |
| seven-day-gift | `ui/sevenday/` | 5 | 5 |
| seven-day-gift-lang | `ui/sevenday/` | 3 | 3 |
| seven-day-target | `ui/sevenday/` | 15 | 15 |
| buy-gold | `ui/shop/` | 3 | 3 |
| shop | `ui/shop/` | 35 | 35 |
| shop-lang | `ui/shop/` | 5 | 5 |
| main-summon | `ui/summon/` | 8 | 8 |
| main-summon-ball | `ui/summon/` | 10 | 10 |
| main-summon-lang | `ui/summon/` | 5 | 5 |
| summon-big-effect | `ui/summon/` | 34 | 34 |
| summon-effect | `ui/summon/` | 21 | 21 |
| summon-hero-prayer | `ui/summon/` | 7 | 7 |
| summon-hero-prayer-effect | `ui/summon/` | 6 | 6 |

Notes:

- **bag / backpack family.** `backpack`, `backpack-4`, and `backpack-5` all extract as `ui/bag/backpack_*.png`. Manifest new frames for the three stems add up to 820. The zip has 819 of those names, and none of them were already in the repo. That is the one-frame gap between the stem column (2256) and the entry list (2255). `backpack-effect`, `backpack-info`, and `backpack-info-lang` match the manifest.
- **city / main-scene-effect-2.** The 10 frames are named `ui/city/main-scene-effect_btn-scale-battle-0.png` through `main-scene-effect_btn-scale-battle-9.png`, not `main-scene-effect-2_*`.
- **common-ui-2.** 242 new frames (manifest extracted total 390; 148 were already in the repo). Filenames keep the frame prefix, not `common-ui-2_`: `button_*` 123, `other_*` 108, `hero-strong-icon_*` 7, `prog_*` 4.
- **buy-gold.** 3 new frames (manifest extracted total 5; 2 were already in the repo).

Every new file is RGBA. Largest edge is `role-info_line.png` at 1160 px.

## Sprite-frame meta

Each new PNG has `*.png.meta` in the same shape as existing `client/assets/resources/ui/` sprite frames (Creator 3.8.8):

- Image importer `ver` 1.0.27, `userData.type` `sprite-frame`
- Texture sub-meta `6c48a` (`ver` 1.0.22)
- Sprite-frame sub-meta `f9941` (`ver` 1.0.12)
- `trimType` `auto`, `trimThreshold` 1 (pixels with alpha below 1 are outside the trim rect)
- Quad vertices follow Creator 3.8 `SpriteFrame._initVertices`: trim rect in top-left pixels, UV Y flipped from the texture top
- Nine-slice borders are 0. No existing `.meta` was rewritten, including the protected button / `win-bg-12` borders
- UUIDs are new. Top-level `.meta` uuids do not collide with any other meta in `client/`

## B1b sibling

Not in this PR. Same B1 manifest, next batch:

| module | stems | manifest new frames | ~MB |
|--------|------:|--------------------:|----:|
| `ui/hero/` | 27 | 1042 | 20.14 |
| `ui/misc/` | 44 | 832 | 21.80 |

## Failed extracts (manifest, not in the zip)

`hero-info`, `hero-info-lang`, `hero-soul`, `astrolabe`, `astrolabe-lang`, `dragon`, `dragon-lang`, `dragon-relic` — PVR pixfmt `0x10` RGB565 (16bpp); the extractor does not support that format.

## Left untouched

No Prefab edits and no PNG references added to prefabs. No Boot, no `USE_*`, no protocol scripts, no spine, no skill, no `mission-1`, no BattlePage `Bg`.
