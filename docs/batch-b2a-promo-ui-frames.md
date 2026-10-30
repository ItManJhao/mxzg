# Batch B2a UI frames (promo)

ccbi-res atlas frames for the promo module, imported as loose PNGs under `client/assets/resources/ui/promo/`. Every new PNG has a Creator 3.8.8 sprite-frame `.meta`. Existing promo backgrounds stay as they are. Prefabs are unchanged.

- Baseline: `65717d37` (B1 #176 + #177)
- Source: `idle/res/hd/ccbi-res` (old mxzg/mj)
- Tool: `extract_pvr_atlas.py --pad-source`
- Manifest: `mxzg-mig-batch-b2a` (promotion / seasonal)
- Zips: `mxzg-mig-batch-b2a-p1` (23549216 B) + `mxzg-mig-batch-b2a-p2` (17134580 B)
- New frames: **1072**. None of these paths existed in the repo before unpack

## Modules

This PR is **B2a** only. Sibling batches **B2b**, **B2c**, and **B2d** are separate ccbi-res UI-frame imports and are not in this PR.

| module | source stems | png frames | bytes |
| --- | ---: | ---: | ---: |
| `ui/promo/` | 45 | 1072 | 40569354 |

`ui/promo/` already had a directory `.meta`. No new folder was added. 46 stems are listed in the manifest; `prom-dragonboat-trad` contributes 0 new frames (see Skipped).

Frame counts and byte sizes below are the manifest figures. On-disk PNG bytes match those figures for every 1:1 stem, and the shared `promotion_` group matches the sum of its stems.

## Sprite-frame meta

Same image meta shape as the atlas frames in `ui/hero/` (B1b):

- `ver` `1.0.27`, `importer` `image`, `userData.type` `sprite-frame`
- Sub-assets: texture id `6c48a` (`ver` `1.0.22`), sprite-frame id `f9941` (`ver` `1.0.12`)
- `trimType` `auto`, `trimThreshold` `1` (alpha `0` and `1` sit outside the trim rect)
- Offset and mesh vertices (`rawPosition`, `uv`, `nuv`) follow that trim rect. `uv` is top-left pixel space; `nuv` Y is flipped relative to `uv`
- Nine-slice borders are 0. UUIDs are new and do not collide with other metas under `client/`
- All 1072 PNGs are 8-bit RGBA

Largest edge is `prom-warorder-lang_spr-main-bg.png` at 600×1107.

## Source atlases

| stem | pixfmt | new | skipped | bytes |
| --- | --- | ---: | ---: | ---: |
| `prom-blackfriday` | 0x12:32 | 39 | 0 | 1334215 |
| `prom-blackfriday-effect` | 0x12:32 | 8 | 0 | 73941 |
| `prom-blackfriday-lang` | 0x12:32 | 1 | 0 | 62973 |
| `prom-christmas` | 0x12:32 | 43 | 0 | 2671644 |
| `prom-christmas-effect-xin` | 0x12:32 | 30 | 0 | 273168 |
| `prom-christmas-lang` | 0x12:32 | 4 | 0 | 244848 |
| `prom-dragonboat` | 0x12:32 | 14 | 0 | 215702 |
| `prom-dragonboat-trad` | 0x12:32 | 0 | 14 | 0 |
| `prom-five_one` | 0x12:32 | 9 | 0 | 203142 |
| `prom-five_one-lang` | 0x12:32 | 1 | 0 | 8088 |
| `prom-new-server` | 0x12:32 | 3 | 0 | 8014 |
| `promotion` | 0x12:32 | 166 | 0 | 3140164 |
| `promotion-2` | 0x12:32 | 4 | 0 | 20534 |
| `promotion-3` | 0x12:32 | 43 | 0 | 891167 |
| `promotion-71` | 0x12:32 | 11 | 0 | 1038596 |
| `promotion-71-lang` | 0x10:16 | 1 | 0 | 80138 |
| `promotion-78` | 0x12:32 | 9 | 0 | 1120648 |
| `promotion-78-effect` | 0x12:32 | 22 | 0 | 471019 |
| `promotion-79` | 0x12:32 | 10 | 0 | 979751 |
| `promotion-79-lang` | 0x10:16 | 1 | 0 | 123479 |
| `promotion-banner-1` | 0x12:32 | 15 | 0 | 1287535 |
| `promotion-banner-2` | 0x12:32 | 8 | 0 | 926216 |
| `promotion-banner-3` | 0x12:32 | 9 | 0 | 1251906 |
| `promotion-banner-4` | 0x12:32 | 9 | 0 | 1154424 |
| `promotion-banner-5` | 0x12:32 | 11 | 0 | 1156410 |
| `promotion-effect` | 0x12:32 | 113 | 0 | 623092 |
| `promotion-effect-2` | 0x12:32 | 30 | 0 | 401703 |
| `promotion-lang` | 0x12:32 | 6 | 0 | 894602 |
| `promotion-luck-fish` | 0x12:32 | 17 | 0 | 815947 |
| `promotion-secret-treasure` | 0x12:32 | 7 | 0 | 30337 |
| `promotion-secret-treasure-2` | 0x12:32 | 7 | 0 | 30337 |
| `promotion-secret-treasure-lang` | 0x12:32 | 16 | 0 | 2061795 |
| `promotion-skin` | 0x12:32 | 25 | 0 | 645364 |
| `promotion-tab-icon-1` | 0x12:32 | 122 | 0 | 3792345 |
| `promotion-tab-icon-2` | 0x12:32 | 128 | 2 | 3692472 |
| `prom-recharge-first` | 0x12:32 | 4 | 0 | 51672 |
| `prom-recharge-first-lang` | 0x12:32 | 5 | 0 | 85098 |
| `prom-spring-lang` | 0x12:32 | 2 | 0 | 137029 |
| `prom-spring-outing` | 0x12:32 | 39 | 0 | 609582 |
| `prom-threedaysrecharge` | 0x12:32 | 10 | 0 | 658784 |
| `prom-threedaysrecharge-lang` | 0x12:32 | 2 | 0 | 73585 |
| `prom-warorder` | 0x12:32 | 15 | 0 | 296754 |
| `prom-warorder-lang` | 0x12:32 | 2 | 0 | 612804 |
| `prom-zhongqiu` | 0x12:32 | 11 | 0 | 1937188 |
| `prom-zhongqiu-2` | 0x12:32 | 24 | 0 | 3098389 |
| `prom-zhongqiu-lang` | 0x12:32 | 16 | 0 | 1282753 |
| total |  | 1072 | 16 | 40569354 |

`promotion-71-lang` and `promotion-79-lang` are source pixfmt `0x10:16` (RGB565). The zip still has one PNG each (`promotion-71-lang_spr-tips.png`, `promotion-79-lang_spr-tips.png`), and both files are 8-bit RGBA, so they use the same sprite-frame meta as the `0x12:32` frames.

## Shared filename prefix

These nine stems extract as `ui/promo/promotion_{frame}.png`. Filenames do not include `promotion-2`, `promotion-banner-*`, or `promotion-tab-icon-*`, so per-stem files cannot be split apart by prefix. The group total matches the manifest.

| on-disk prefix | frames | bytes | source stems |
| --- | ---: | ---: | --- |
| `promotion_` | 472 | 16422006 | `promotion` (166), `promotion-2` (4), `promotion-banner-1` (15), `promotion-banner-2` (8), `promotion-banner-3` (9), `promotion-banner-4` (9), `promotion-banner-5` (11), `promotion-tab-icon-1` (122), `promotion-tab-icon-2` (128) |

Every other stem with new frames is a 1:1 filename prefix (`{stem}_{frame}.png`), and that prefix's file count and byte size match the manifest row.

One frame name keeps a space from the atlas: `prom-threedaysrecharge_spr- 84-xian.png`.

## Skipped (manifest, not in the zip)

| stem | skipped | new |
| --- | ---: | ---: |
| `prom-dragonboat-trad` | 14 | 0 |
| `promotion-tab-icon-2` | 2 | 128 |

`prom-dragonboat-trad` has no files in this zip. The 128 new `promotion-tab-icon-2` frames are inside the shared `promotion_` group above; the 2 skipped names are not in the zip.

## Fully transparent frames

Six PNGs have no pixel with alpha above 1, so the auto trim rect is 0×0 (raw size is unchanged):

| file | raw size | max alpha |
| --- | --- | ---: |
| `promotion-effect-2_3-0.png` | 189×109 | 1 |
| `promotion-effect_2-0.png` | 256×114 | 0 |
| `promotion-effect_2-22.png` | 256×114 | 0 |
| `promotion-effect_6-8.png` | 149×140 | 1 |
| `promotion-effect_6-9.png` | 149×140 | 0 |
| `promotion-secret-treasure-lang_bottom-bg.png` | 640×230 | 0 |

## Scope

PNG frames and sprite-frame metas for `ui/promo/` only. Sibling batches B2b, B2c, and B2d are not included. Spine, skill, and BattlePage backgrounds are untouched, `mission-1` is untouched, and no frame is wired into a prefab. No Boot, `USE_*`, or protocol edits.
