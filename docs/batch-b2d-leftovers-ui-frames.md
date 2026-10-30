# Batch B2D UI frames (leftovers)

ccbi-res atlas PNG frames for the leftover B2 modules (alice, dungeon-anim, plane-war, shenyu, championship, magic-cube, and the rest of the list below). Each new PNG has a Creator 3.8.8 sprite-frame `.meta`. Prefabs are not rewired. Boot, `USE_*`, protocol scripts, spine, and skill are unchanged. `mission-1` and BattlePage `Bg` are unchanged.

## Baseline

- Repo tip: `65717d37` (B1a #176 + B1b #177)
- Source: `idle/res/hd/ccbi-res`
- Tool: `extract_pvr_atlas.py --pad-source`
- Manifest: Batch B2D (`mxzg-mig-batch-b2d`). This PR is only that leftover set.
- Zip parts: `mxzg-mig-batch-b2d-p1` (23659845 bytes, 917 PNGs) + `mxzg-mig-batch-b2d-p2` (17033969 bytes, 279 PNGs), unpacked at `client/assets/resources/ui/<module>/`
- None of the 1196 PNG paths existed on the baseline. On-disk frame counts and byte sizes match the manifest (skipped column is 0 for every stem).

| | stems | modules | png frames | bytes |
| --- | ---: | ---: | ---: | ---: |
| B2D | 52 | 51 | 1196 | 40535364 |

`ui/battle/` already existed (`skill-before` only is new there). The other 50 modules are new folders. Each new folder has an `importer: directory` `.meta` (`ver` 1.2.0), same shape as `ui/misc.meta`. `ui/battle.meta` was not rewritten.

## Modules

| module | stems | frames | bytes |
| --- | ---: | ---: | ---: |
| `ui/achievement/` | 1 | 13 | 163291 |
| `ui/active-reiki/` | 1 | 19 | 232620 |
| `ui/alice/` | 2 | 69 | 3923310 |
| `ui/alice-effect/` | 1 | 20 | 828930 |
| `ui/ancient-lang/` | 1 | 3 | 576156 |
| `ui/battle/` | 1 | 112 | 3016950 |
| `ui/box-effect/` | 1 | 20 | 69416 |
| `ui/buy/` | 1 | 6 | 8525 |
| `ui/championship/` | 1 | 40 | 849647 |
| `ui/championship-2/` | 1 | 7 | 490894 |
| `ui/championship-2-lang/` | 1 | 7 | 490894 |
| `ui/chapter-reward/` | 1 | 5 | 44048 |
| `ui/chapter-reward-lang/` | 1 | 6 | 66663 |
| `ui/cloud-1/` | 1 | 2 | 480620 |
| `ui/compare-share/` | 1 | 5 | 221245 |
| `ui/contract-lang/` | 1 | 8 | 1052572 |
| `ui/customized/` | 1 | 9 | 32534 |
| `ui/daily-reward-effect/` | 1 | 10 | 18911 |
| `ui/discuss/` | 1 | 7 | 908686 |
| `ui/dream/` | 1 | 15 | 235060 |
| `ui/dream-lang/` | 1 | 5 | 512128 |
| `ui/dungeon-anim/` | 1 | 426 | 4906842 |
| `ui/exotic-adventure/` | 1 | 92 | 3734433 |
| `ui/exotic-adventure-lang/` | 1 | 2 | 41461 |
| `ui/festival-gift/` | 1 | 1 | 16843 |
| `ui/festival-gift-lang/` | 1 | 6 | 576051 |
| `ui/floating-Islands/` | 1 | 4 | 13699 |
| `ui/item-select/` | 1 | 4 | 4784 |
| `ui/magic-butterfly/` | 1 | 9 | 27234 |
| `ui/magic-cube/` | 1 | 6 | 14575 |
| `ui/mid-autumn-gift/` | 1 | 4 | 387854 |
| `ui/mission-cell-bg/` | 1 | 8 | 93640 |
| `ui/mission-cell-bg-lang/` | 1 | 11 | 760486 |
| `ui/new-year/` | 1 | 14 | 337098 |
| `ui/new-year-lang/` | 1 | 8 | 1111351 |
| `ui/permanent-skin/` | 1 | 36 | 2146345 |
| `ui/plane-war/` | 1 | 14 | 3387469 |
| `ui/pub-effect-1/` | 1 | 15 | 605835 |
| `ui/rainbow/` | 1 | 3 | 60202 |
| `ui/reward-effect/` | 1 | 12 | 423986 |
| `ui/reward-effect2/` | 1 | 20 | 780441 |
| `ui/shenyu/` | 1 | 10 | 819643 |
| `ui/shenyu-effet/` | 1 | 21 | 2883944 |
| `ui/shenyu-lang/` | 1 | 1 | 3728 |
| `ui/slzm/` | 1 | 10 | 1305043 |
| `ui/team-arena-lang/` | 1 | 12 | 361508 |
| `ui/three-day/` | 1 | 3 | 166487 |
| `ui/tile-building/` | 1 | 9 | 561277 |
| `ui/title/` | 1 | 6 | 55099 |
| `ui/touch-effect/` | 1 | 15 | 79466 |
| `ui/weather/` | 1 | 26 | 645440 |
| **B2D** | **52** | **1196** | **40535364** |

## Stem counts

On-disk count is files under that module. Two stems do not use a 1:1 `{stem}_` filename prefix; they are called out under the table.

| stem | module | pixfmt | frames | bytes |
| --- | --- | --- | ---: | ---: |
| `achievement` | `ui/achievement/` | 0x12:32 | 13 | 163291 |
| `active-reiki` | `ui/active-reiki/` | 0x12:32 | 19 | 232620 |
| `alice` | `ui/alice/` | 0x12:32 | 54 | 2669941 |
| `alice-2` | `ui/alice/` | 0x12:32 | 15 | 1253369 |
| `alice-effect` | `ui/alice-effect/` | 0x12:32 | 20 | 828930 |
| `ancient-lang` | `ui/ancient-lang/` | 0x12:32 | 3 | 576156 |
| `box-effect` | `ui/box-effect/` | 0x12:32 | 20 | 69416 |
| `buy` | `ui/buy/` | 0x12:32 | 6 | 8525 |
| `championship` | `ui/championship/` | 0x12:32 | 40 | 849647 |
| `championship-2` | `ui/championship-2/` | 0x12:32 | 7 | 490894 |
| `championship-2-lang` | `ui/championship-2-lang/` | 0x12:32 | 7 | 490894 |
| `chapter-reward` | `ui/chapter-reward/` | 0x12:32 | 5 | 44048 |
| `chapter-reward-lang` | `ui/chapter-reward-lang/` | 0x12:32 | 6 | 66663 |
| `cloud-1` | `ui/cloud-1/` | 0x12:32 | 2 | 480620 |
| `compare-share` | `ui/compare-share/` | 0x12:32 | 5 | 221245 |
| `contract-lang` | `ui/contract-lang/` | 0x12:32 | 8 | 1052572 |
| `customized` | `ui/customized/` | 0x12:32 | 9 | 32534 |
| `daily-reward-effect` | `ui/daily-reward-effect/` | 0x12:32 | 10 | 18911 |
| `discuss` | `ui/discuss/` | 0x12:32 | 7 | 908686 |
| `dream` | `ui/dream/` | 0x12:32 | 15 | 235060 |
| `dream-lang` | `ui/dream-lang/` | 0x12:32 | 5 | 512128 |
| `dungeon-anim-2` | `ui/dungeon-anim/` | 0x12:32 | 426 | 4906842 |
| `exotic-adventure` | `ui/exotic-adventure/` | 0x12:32 | 92 | 3734433 |
| `exotic-adventure-lang` | `ui/exotic-adventure-lang/` | 0x12:32 | 2 | 41461 |
| `festival-gift` | `ui/festival-gift/` | 0x12:32 | 1 | 16843 |
| `festival-gift-lang` | `ui/festival-gift-lang/` | 0x12:32 | 6 | 576051 |
| `floating-Islands` | `ui/floating-Islands/` | 0x12:32 | 4 | 13699 |
| `item-select` | `ui/item-select/` | 0x12:32 | 4 | 4784 |
| `magic-butterfly` | `ui/magic-butterfly/` | 0x12:32 | 9 | 27234 |
| `magic-cube` | `ui/magic-cube/` | 0x0:311 | 6 | 14575 |
| `mid-autumn-gift` | `ui/mid-autumn-gift/` | 0x12:32 | 4 | 387854 |
| `mission-cell-bg` | `ui/mission-cell-bg/` | 0x12:32 | 8 | 93640 |
| `mission-cell-bg-lang` | `ui/mission-cell-bg-lang/` | 0x12:32 | 11 | 760486 |
| `new-year` | `ui/new-year/` | 0x12:32 | 14 | 337098 |
| `new-year-lang` | `ui/new-year-lang/` | 0x12:32 | 8 | 1111351 |
| `permanent-skin` | `ui/permanent-skin/` | 0x12:32 | 36 | 2146345 |
| `plane-war` | `ui/plane-war/` | 0x12:32 | 14 | 3387469 |
| `pub-effect-1` | `ui/pub-effect-1/` | 0x12:32 | 15 | 605835 |
| `rainbow` | `ui/rainbow/` | 0x12:32 | 3 | 60202 |
| `reward-effect` | `ui/reward-effect/` | 0x12:32 | 12 | 423986 |
| `reward-effect2` | `ui/reward-effect2/` | 0x12:32 | 20 | 780441 |
| `shenyu` | `ui/shenyu/` | 0x12:32 | 10 | 819643 |
| `shenyu-effet` | `ui/shenyu-effet/` | 0x12:32 | 21 | 2883944 |
| `shenyu-lang` | `ui/shenyu-lang/` | 0x12:32 | 1 | 3728 |
| `skill-before` | `ui/battle/` | 0x12:32 | 112 | 3016950 |
| `slzm` | `ui/slzm/` | 0x12:32 | 10 | 1305043 |
| `team-arena-lang` | `ui/team-arena-lang/` | 0x12:32 | 12 | 361508 |
| `three-day` | `ui/three-day/` | 0x12:32 | 3 | 166487 |
| `tile-building` | `ui/tile-building/` | 0x12:32 | 9 | 561277 |
| `title` | `ui/title/` | 0x12:32 | 6 | 55099 |
| `touch-effect` | `ui/touch-effect/` | 0x12:32 | 15 | 79466 |
| `weather` | `ui/weather/` | 0x12:32 | 26 | 645440 |

Notes:

- **alice / alice-2.** Both stems land in `ui/alice/` and both use the filename prefix `alice_`. Manifest frames are 54 + 15. The folder has 69 `alice_*.png` files and the byte total matches 2669941 + 1253369. The two stems are not separable by filename.
- **dungeon-anim-2.** All 426 frames are named `ui/dungeon-anim/dungeon-anim_*.png`, not `dungeon-anim-2_*`.
- **skill-before.** All 112 frames are `ui/battle/skill-before_*.png` inside the existing battle folder. No `battle-scene_*` file was added or replaced.
- **plane-war names.** Two source frame names already ended in `.jpg`, so they were first stored as `plane-war_boss-bg.jpg.png` and `plane-war_plane-war-bg.jpg.png`. Both are PNG (RGBA), not JPEG, and are now `plane-war_boss-bg.png` and `plane-war_plane-war-bg.png`.
- **magic-cube.** Only stem whose manifest pixfmt is `0x0:311` (every other stem is `0x12:32`). The six extracted PNGs are still RGBA and use the same sprite-frame meta. Largest edge in that folder is 311 (`magic-cube_mf_djk.png`).
- **spellings kept.** Folder `ui/shenyu-effet/` and `ui/floating-Islands/` match the manifest, including `effet` and the capital `I`.

Every new file is RGBA. Largest edge is 1280 (`cloud-1_cloud-1-y-1.png` and `plane-war_boss-bg.png`).

## Shared filename prefixes

| module | on-disk prefix | frames | source stems |
| --- | --- | ---: | --- |
| `ui/alice/` | `alice_` | 69 | `alice` (54), `alice-2` (15) |

Every other stem is a 1:1 filename prefix (`{stem}_*.png`), except `dungeon-anim-2`, whose on-disk prefix is `dungeon-anim_` (426).

## Sprite-frame meta

Each new PNG has `*.png.meta` in the same shape as existing `client/assets/resources/ui/` sprite frames (Creator 3.8.8):

- Image importer `ver` 1.0.27, `userData.type` `sprite-frame`
- Texture sub-meta `6c48a` (`ver` 1.0.22)
- Sprite-frame sub-meta `f9941` (`ver` 1.0.12)
- `trimType` `auto`, `trimThreshold` 1 (pixels with alpha 0 or 1 sit outside the trim rect)
- Quad vertices match the existing `ui/battle/` and `ui/hero/` metas: trim rect in top-left pixels; `uv` is bottom-left, bottom-right, top-left, top-right; `nuv` is top-left, top-right, bottom-left, bottom-right
- Nine-slice borders are 0. No existing `.meta` was rewritten
- UUIDs are new. Top-level `.meta` uuids do not collide with any other meta in `client/`

## Sibling batches

B2 ccbi-res UI frames are split across four batches. This PR is **B2d** (leftovers) only.

| batch | in this PR |
| --- | --- |
| B2a | no — sibling, separate PR |
| B2b | no — sibling, separate PR |
| B2c | no — sibling, separate PR |
| B2d | yes — modules and stem counts above |

B1a (#176) and B1b (#177) are already merged on `65717d37`. They are the previous import, not part of B2.

## Left untouched

No Prefab edits and no PNG references added to prefabs. No Boot, no `USE_*`, no protocol scripts, no spine, no skill, no `mission-1`, no BattlePage `Bg`. Existing `ui/battle/` frames and `ui/battle.meta` are unchanged.
