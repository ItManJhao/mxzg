# Batch B1b UI frames (hero / misc)

ccbi-res atlas frames for the hero and misc modules, imported as loose PNGs under `client/assets/resources/ui/`. Every new PNG has a Creator 3.8.8 sprite-frame `.meta`. Existing hero map backgrounds stay as they are. Prefabs are unchanged.

- Baseline: `6e99cd7`
- Source: `idle/res/hd/ccbi-res` (old mxzg/mj)
- Tool: `extract_pvr_atlas.py --pad-source`
- Frame counts and byte sizes match the B1 manifest for these two modules

| module | source stems | png frames | bytes |
| --- | ---: | ---: | ---: |
| `ui/hero/` | 27 | 1042 | 21117659 |
| `ui/misc/` | 44 | 832 | 22853794 |
| total | 71 | 1874 | 43971453 |

`ui/misc/` is a new folder (`ui/misc.meta`). Frames are stored as `{prefix}_{frame}.png`. Where several source atlases share one prefix, the groups are listed under Shared filename prefixes. Sums still match the manifest.

## Sprite-frame meta

Same image meta shape as the atlas frames in `ui/battle/`:

- `ver` `1.0.27`, `importer` `image`, `userData.type` `sprite-frame`
- Sub-assets: texture id `6c48a` (`ver` `1.0.22`), sprite-frame id `f9941` (`ver` `1.0.12`)
- `trimType` `auto`, `trimThreshold` `1` (alpha `0` and `1` sit outside the trim rect)
- Offset and mesh vertices (`rawPosition`, `uv`, `nuv`) follow that trim rect
- All 1874 frames are RGBA

## Hero source atlases

| stem | frames | bytes |
| --- | ---: | ---: |
| `head-icon` | 1 | 11674 |
| `head-icon-1` | 289 | 4523664 |
| `head-icon-lang` | 2 | 5702 |
| `hero-arrive` | 5 | 59890 |
| `hero-arrive-lang` | 6 | 396114 |
| `hero-attack-effect` | 21 | 586008 |
| `hero-creat` | 7 | 23449 |
| `hero-hexagram` | 17 | 340128 |
| `hero-icon-1` | 73 | 1536403 |
| `hero-icon-2` | 68 | 1462669 |
| `hero-icon-3` | 65 | 1357695 |
| `hero-icon-4` | 78 | 1707085 |
| `hero-icon-5` | 85 | 1825124 |
| `hero-icon-lang` | 2 | 7447 |
| `hero-icon-other` | 64 | 614934 |
| `hero-info-2` | 39 | 77177 |
| `hero-info-effect` | 70 | 3191198 |
| `hero-magic` | 27 | 1382953 |
| `hero-magic-wand` | 5 | 181445 |
| `hero-palace` | 15 | 230926 |
| `hero-palace-lang` | 15 | 429125 |
| `hero-select` | 53 | 894420 |
| `hero-select-lang` | 8 | 72219 |
| `hero-share` | 13 | 41611 |
| `hero-skill` | 2 | 70094 |
| `hero-up-success` | 8 | 45964 |
| `hero-up-success-lang` | 4 | 42541 |

## Misc source atlases

| stem | frames | bytes |
| --- | ---: | ---: |
| `adven-note` | 5 | 23398 |
| `blessing-pool` | 16 | 880159 |
| `blessing-pool-effect-1` | 25 | 1870754 |
| `blessing-pool-effect-2` | 18 | 451367 |
| `compare-share-lang` | 13 | 84837 |
| `contract` | 3 | 20582 |
| `dungeon` | 48 | 570081 |
| `dungeon-anim-1` | 40 | 891815 |
| `dungeon-grid` | 23 | 1005935 |
| `evolution` | 14 | 469813 |
| `evolution-effect` | 37 | 801895 |
| `evolution-lang` | 3 | 44749 |
| `fantasy-land` | 9 | 123747 |
| `fantasy-land-lang` | 20 | 1245798 |
| `fantasy-tower` | 18 | 647971 |
| `fantasy-tower-lang` | 6 | 50881 |
| `fantasyland` | 11 | 326686 |
| `fetters` | 71 | 1447568 |
| `fetters-cast-soul` | 7 | 7695 |
| `fetters-effect-2` | 92 | 828986 |
| `fetters-lang` | 45 | 547220 |
| `fetters-select` | 11 | 10409 |
| `fetters-select-lang` | 6 | 575949 |
| `fetters-up` | 2 | 1715 |
| `fetters-up-lang` | 4 | 126174 |
| `god-relic` | 54 | 2691924 |
| `god-relic-lang` | 9 | 92579 |
| `magic-tower` | 16 | 1070977 |
| `magic-tower-lang` | 1 | 99074 |
| `mystery-box` | 6 | 59348 |
| `prophet-effect` | 10 | 113276 |
| `prophet-tree` | 37 | 1247767 |
| `prophet-tree-lang` | 3 | 68601 |
| `super-stage` | 49 | 834692 |
| `super-stage-icon` | 16 | 921931 |
| `super-stage-lang` | 6 | 332331 |
| `time-tower` | 22 | 348835 |
| `time-tower-lang` | 1 | 27334 |
| `totem` | 10 | 103076 |
| `totem-lang` | 5 | 36549 |
| `trial` | 17 | 166997 |
| `trial-lang` | 6 | 500185 |
| `underworld-pagoda` | 14 | 1043708 |
| `underworld-pagoda-lang` | 3 | 38426 |

## Shared filename prefixes

| module | on-disk prefix | frames | source stems |
| --- | --- | ---: | --- |
| `ui/hero/` | `head-icon_` | 292 | `head-icon` (1), `head-icon-1` (289), `head-icon-lang` (2) |
| `ui/hero/` | `hero-icon_` | 435 | `hero-icon-1` (73), `hero-icon-2` (68), `hero-icon-3` (65), `hero-icon-4` (78), `hero-icon-5` (85), `hero-icon-lang` (2), `hero-icon-other` (64) |
| `ui/misc/` | `blessing-pool-effect_` | 43 | `blessing-pool-effect-1` (25), `blessing-pool-effect-2` (18) |
| `ui/misc/` | `dungeon-anim_` | 40 | `dungeon-anim-1` (40) |
| `ui/misc/` | `fantasy-land_` | 20 | `fantasy-land` (9), `fantasyland` (11) |
| `ui/misc/` | `fetters_` | 84 | `fetters` (71), `fetters-select` (11), `fetters-up` (2) |
| `ui/misc/` | `fetters-lang_` | 55 | `fetters-lang` (45), `fetters-select-lang` (6), `fetters-up-lang` (4) |
| `ui/misc/` | `magic-tower_` | 17 | `magic-tower` (16), `magic-tower-lang` (1) |

Every other stem in the tables above is a 1:1 filename prefix (`{stem}_{frame}.png`).

## RGB565 atlases skipped

These ccbi-res atlases were skipped. PVR pixfmt `0x10` is RGB565 (16bpp), which `extract_pvr_atlas.py` does not unpack. Shorthand from the batch brief: `hero-info*`, `hero-soul`, `astrolabe*`, `dragon*`.

| stem |
| --- |
| `hero-info` |
| `hero-info-lang` |
| `hero-soul` |
| `astrolabe` |
| `astrolabe-lang` |
| `dragon` |
| `dragon-lang` |
| `dragon-relic` |

`hero-info-2` (39 frames) and `hero-info-effect` (70 frames) use a supported pixfmt and are in the hero table. The skipped `hero-info*` stems are `hero-info` and `hero-info-lang`.

## Scope

PNG frames and sprite-frame metas for `ui/hero/` and `ui/misc/` only. Arena, bag, city, clan, common, mail, sevenday, shop, and summon from the same B1 manifest are a separate batch. Spine, skill, and BattlePage backgrounds are untouched, and no frame is wired into a prefab.
