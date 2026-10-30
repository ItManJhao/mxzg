# Batch D5 skill PVR frames (skill-105xxx and skill_105)

Old `hd/skill` PVR atlas frames, already decoded to PNG, for the `skill-105xxx` and `skill_105` set. Each frame is RGBA8888 padded to its sourceSize, same as #170. Files land at `client/assets/resources/battle/skill/<stem>/<frame>.png`. This PR adds those 78 stem folders, a Creator 3.8.8 `.meta` for every new PNG, a folder `.meta` for every new stem, and this note.

## Baseline

- Repo tip: `ddcf9b6e` (Batch A/B/C merged).
- Manifest: Batch D5 (`mxzg-mig-batch-d5`). 78 stems, 1336 frames, 27896893 PNG bytes.
- Zip parts, unpacked at the repo root. Paths inside the zips already start at `client/assets/resources/battle/skill/`.
  - `mxzg-mig-batch-d5-p1.zip`: 22806493 bytes, 61 stems, 1050 frames (22698910 PNG bytes). Stems `skill-105030011` through `skill-105050203`.
  - `mxzg-mig-batch-d5-p2.zip`: 5232960 bytes, 17 stems, 286 frames (5197983 PNG bytes). Stems `skill-105050203_1` through `skill_105050194`.
- None of the 1336 PNG paths or 78 stem folders existed on the baseline. On-disk frame counts and PNG byte sizes match the manifest.

Sibling batches D1–D6 are the skill PVR frame series. This PR is D5 only (`skill-105xxx` and `skill_105`).

49 stems (534 frames) were already on main from #170 and were skipped. They are not in these zips. The list is in [Already on main](#already-on-main-170) and in [`battle-asset-migration.md`](battle-asset-migration.md).

## Stems

Frame counts, PNG bytes, and atlas size are the manifest values. Atlas size is the source atlas. Each frame PNG is that frame's sourceSize, so a frame can be a different size from the atlas.

| stem | frames | PNG bytes | atlas |
| --- | ---: | ---: | --- |
| `skill-105030011` | 6 | 14130 | 253x61 |
| `skill-105040021` | 18 | 251561 | 511x449 |
| `skill-105040030` | 9 | 59936 | 242x170 |
| `skill-105040031` | 8 | 252614 | 467x470 |
| `skill-105050040` | 10 | 103534 | 501x287 |
| `skill-105050041` | 18 | 809543 | 937x885 |
| `skill-105050041-1` | 57 | 1038888 | 2047x1108 |
| `skill-105050050` | 12 | 94570 | 305x244 |
| `skill-105050051` | 19 | 625317 | 1010x552 |
| `skill-105050051-1` | 8 | 104816 | 460x221 |
| `skill-105050053` | 20 | 663082 | 1035x1003 |
| `skill-105050060` | 8 | 269870 | 509x451 |
| `skill-105050061` | 9 | 358562 | 893x873 |
| `skill-105050061-1` | 24 | 983653 | 1181x1007 |
| `skill-105050063` | 11 | 104900 | 475x229 |
| `skill-105050070` | 7 | 38887 | 283x223 |
| `skill-105050071` | 11 | 169316 | 397x499 |
| `skill-105050080` | 10 | 148077 | 401x248 |
| `skill-105050081` | 17 | 334998 | 1011x321 |
| `skill-105050090-1` | 3 | 45398 | 730x114 |
| `skill-105050090-2` | 4 | 110589 | 202x966 |
| `skill-105050091-1` | 34 | 482338 | 957x453 |
| `skill-105050091-2` | 14 | 519291 | 1448x1020 |
| `skill-105050093` | 10 | 84180 | 327x235 |
| `skill-105050100` | 10 | 78149 | 468x155 |
| `skill-105050101` | 26 | 1543946 | 1574x997 |
| `skill-105050101-1` | 63 | 1569018 | 2047x801 |
| `skill-105050103` | 17 | 783433 | 1635x1022 |
| `skill-105050110` | 9 | 72721 | 788x174 |
| `skill-105050111` | 27 | 388848 | 254x966 |
| `skill-105050111-1` | 47 | 510474 | 1024x1650 |
| `skill-105050113` | 12 | 211862 | 1197x505 |
| `skill-105050113-1` | 12 | 211862 | 1197x505 |
| `skill-105050113-2` | 11 | 216441 | 1199x505 |
| `skill-105050140` | 9 | 85298 | 118x968 |
| `skill-105050141` | 18 | 267414 | 256x1182 |
| `skill-105050143` | 13 | 318233 | 241x2012 |
| `skill-105050150-1` | 14 | 208769 | 243x1148 |
| `skill-105050151-1` | 14 | 413479 | 496x1467 |
| `skill-105050151-2` | 14 | 115219 | 501x1021 |
| `skill-105050160` | 13 | 84508 | 505x274 |
| `skill-105050161` | 20 | 646415 | 506x1552 |
| `skill-105050161-1` | 14 | 148239 | 824x252 |
| `skill-105050161-2` | 14 | 148239 | 824x252 |
| `skill-105050163` | 19 | 776377 | 507x1604 |
| `skill-105050171` | 27 | 610099 | 966x556 |
| `skill-105050173` | 24 | 438225 | 511x598 |
| `skill-105050173-1` | 29 | 155571 | 308x506 |
| `skill-105050180` | 9 | 177397 | 170x1020 |
| `skill-105050181` | 26 | 1080607 | 960x1018 |
| `skill-105050181-1` | 12 | 145536 | 241x511 |
| `skill-105050183` | 24 | 679796 | 602x1022 |
| `skill-105050190` | 13 | 102518 | 463x247 |
| `skill-105050191` | 19 | 476662 | 972x398 |
| `skill-105050191_1` | 15 | 159786 | 94x1270 |
| `skill-105050193` | 15 | 217564 | 119x1799 |
| `skill-105050193_1` | 14 | 154869 | 128x1600 |
| `skill-105050194` | 21 | 379653 | 134x1980 |
| `skill-105050200` | 11 | 119093 | 162x442 |
| `skill-105050201` | 26 | 423167 | 506x752 |
| `skill-105050203` | 22 | 911373 | 901x1019 |
| `skill-105050203_1` | 20 | 575862 | 988x513 |
| `skill-105050210` | 12 | 115030 | 1024x128 |
| `skill-105050211` | 16 | 280555 | 242x1018 |
| `skill-105050213` | 19 | 117251 | 126x902 |
| `skill-105050213-1` | 15 | 630044 | 1006x632 |
| `skill-105050215` | 21 | 264900 | 218x1018 |
| `skill-105050216` | 10 | 141846 | 574x252 |
| `skill-105050217` | 16 | 280555 | 242x1018 |
| `skill-105050218` | 19 | 117251 | 126x902 |
| `skill-105050218-1` | 15 | 630044 | 1006x632 |
| `skill-105100141-1` | 26 | 553593 | 2028x582 |
| `skill_105050190` | 13 | 102518 | 463x247 |
| `skill_105050191` | 19 | 476662 | 972x398 |
| `skill_105050191_1` | 15 | 159786 | 94x1270 |
| `skill_105050193` | 15 | 217564 | 119x1799 |
| `skill_105050193_1` | 14 | 154869 | 128x1600 |
| `skill_105050194` | 21 | 379653 | 134x1980 |
| **total** | **1336** | **27896893** | |

`skill-105050091-2` has 14 frames and no `_3` file (indices 0–2 and 4–14). The manifest count is 14.

## Meta

PNG `.meta` files match the existing neighbor `client/assets/resources/battle/skill/skill-101010011/skill-101010011_0.png.meta`:

- importer `image`, ver `1.0.27`, `userData.type` `sprite-frame`, `hasAlpha` true
- subMetas `6c48a` (texture, ver `1.0.22`, clamp-to-edge, linear) and `f9941` (sprite-frame, ver `1.0.12`)
- `trimType` `auto`, `trimThreshold` 1 (alpha 0 and 1 sit outside the trim rect)
- `trimX` / `trimY` / `width` / `height` / `rawWidth` / `rawHeight` / `offsetX` / `offsetY` and mesh vertices (`rawPosition`, `uv`, `nuv`) are computed from that PNG's alpha bounds
- `redirect` is `<uuid>@6c48a`
- fresh UUID v4 per PNG

12 frames have no pixel with alpha above 1. Their trim rect is the full sourceSize and the offset is 0:

- `skill-105040021_0`
- `skill-105040030_0`
- `skill-105050041-1_0`
- `skill-105050053_0`
- `skill-105050101-1_0`
- `skill-105050151-2_0`
- `skill-105050161-1_0`
- `skill-105050161-2_0`
- `skill-105050173_0`
- `skill-105050173-1_16`
- `skill-105050173-1_17`
- `skill-105050183_0`

Each new stem folder has `<stem>.meta`. Shape and ver are copied from the existing sibling directory metas in `battle/skill/` (all 49 share it; `skill-101010011.meta` is the template): importer `directory`, ver `1.2.0`, `imported` true, empty `files` / `subMetas` / `userData`, plus a fresh uuid. That on-disk sibling shape is what was written.

1414 new uuids (1336 images + 78 folders) are UUID v4 and do not collide with each other or with the uuids already in the repo.

## Already on main (#170)

These 49 stems were already on main from #170 and were skipped:

`hero-skill`, `skill-101010011`, `skill-101020021`, `skill-101030030`, `skill-101040050`, `skill-101040051`, `skill-101040120-1`, `skill-101040120-2`, `skill-101050060`, `skill-101050070`, `skill-101050073`, `skill-101050080`, `skill-101050080-1`, `skill-101050080-2`, `skill-101050083`, `skill-101050085`, `skill-101050090`, `skill-101050100`, `skill-101050101`, `skill-101050110`, `skill-101050130`, `skill-101050201-2`, `skill-101050201-3`, `skill-102010011`, `skill-102020021`, `skill-102030031`, `skill-102040040`, `skill-102040050`, `skill-102050060`, `skill-102050070`, `skill-102050080`, `skill-102050100`, `skill-103010011`, `skill-103020021`, `skill-103030030`, `skill-103030031`, `skill-103040041`, `skill-103040050`, `skill-103040051`, `skill-103040120`, `skill-103050060`, `skill-104030011`, `skill-104040020`, `skill-104040021`, `skill-104040031`, `skill-104050040`, `skill-104050041`, `skill-104050050`, `skill-104050060`.
