# Batch D4 skill frames (skill-104xxx)

Old `hd/skill` PVR atlas frames, already decoded to PNG, imported under `client/assets/resources/battle/skill/<stem>/`. Each new PNG has a Creator 3.8.8 sprite-frame `.meta`. Each new stem folder has a directory `.meta`.

- Baseline: main `ddcf9b6e` (Batch A/B/C merged, through C6 #187)
- Source: RGBA8888 `pvr.ccz`, padded to `sourceSize` with transparent edges, same as #170
- Zips unpacked at the repo root. Members were already rooted at `client/assets/resources/battle/skill/<stem>/*.png`
- `mxzg-mig-batch-d4-p1.zip`: 20,014,846 B, 46 stems, 839 frames
- `mxzg-mig-batch-d4-p2.zip`: 7,713,333 B, 5 stems, 113 frames (`skill-104050203`, `skill-104050203-1`, `skill-104050210`, `skill-104050211`, `skill-104050213`)
- **51 new stem folders, 952 PNG frames, 27,820,636 B.** On-disk frame counts and PNG bytes match the manifest for every stem
- None of these paths existed on the baseline. Nothing was overwritten. Existing `battle/skill/*` and `battle/skill-effect/*` files were not modified

## Stems

Manifest order. Frame counts and PNG bytes are the manifest columns, and they match the files on disk.

| stem | frames | PNG bytes | atlas |
| --- | ---: | ---: | --- |
| `skill-104050041-1` | 13 | 314247 | 1013x569 |
| `skill-104050051` | 11 | 295196 | 508x1017 |
| `skill-104050051-1` | 45 | 550261 | 1385x1915 |
| `skill-104050053` | 10 | 375932 | 898x968 |
| `skill-104050061` | 18 | 830573 | 1098x1011 |
| `skill-104050061-1` | 42 | 505683 | 577x1011 |
| `skill-104050063` | 11 | 373882 | 1003x655 |
| `skill-104050070` | 11 | 168412 | 1012x235 |
| `skill-104050071` | 6 | 151933 | 983x451 |
| `skill-104050071-1` | 20 | 513726 | 1101x1017 |
| `skill-104050073` | 12 | 248870 | 530x936 |
| `skill-104050080` | 8 | 211495 | 936x277 |
| `skill-104050081` | 10 | 399888 | 935x838 |
| `skill-104050090` | 6 | 52060 | 688x252 |
| `skill-104050091` | 25 | 179444 | 127x1830 |
| `skill-104050091-1` | 16 | 346894 | 1392x512 |
| `skill-104050100` | 15 | 64354 | 1059x246 |
| `skill-104050101` | 26 | 722679 | 1562x1000 |
| `skill-104050101-1` | 26 | 380096 | 499x1231 |
| `skill-104050103` | 18 | 647982 | 1960x534 |
| `skill-104050140` | 11 | 137760 | 711x252 |
| `skill-104050141` | 23 | 871518 | 2028x1262 |
| `skill-104050141-1` | 45 | 1794723 | 2010x1781 |
| `skill-104050143` | 10 | 251467 | 461x498 |
| `skill-104050150-1` | 8 | 145813 | 501x361 |
| `skill-104050151-1` | 24 | 588353 | 2045x764 |
| `skill-104050151-2` | 9 | 242728 | 933x409 |
| `skill-104050153` | 21 | 673182 | 505x990 |
| `skill-104050160` | 11 | 70373 | 300x249 |
| `skill-104050161` | 19 | 233388 | 445x428 |
| `skill-104050161-1` | 10 | 26275 | 194x97 |
| `skill-104050163` | 20 | 759430 | 713x1007 |
| `skill-104050170` | 15 | 72387 | 511x147 |
| `skill-104050171` | 20 | 322308 | 692x481 |
| `skill-104050171-1` | 19 | 133036 | 498x272 |
| `skill-104050173` | 24 | 350838 | 1023x427 |
| `skill-104050180` | 17 | 135976 | 360x238 |
| `skill-104050181` | 15 | 356620 | 983x362 |
| `skill-104050183` | 18 | 287070 | 555x512 |
| `skill-104050183-1` | 20 | 526918 | 703x932 |
| `skill-104050184` | 23 | 247071 | 501x369 |
| `skill-104050190` | 12 | 69618 | 78x894 |
| `skill-104050191` | 25 | 313146 | 490x572 |
| `skill-104050193` | 26 | 2093547 | 1188x1952 |
| `skill-104050200` | 20 | 884614 | 500x1436 |
| `skill-104050201` | 25 | 1085016 | 498x2042 |
| `skill-104050203` | 31 | 5059807 | 2048x3690 |
| `skill-104050203-1` | 38 | 499985 | 1002x1284 |
| `skill-104050210` | 12 | 324816 | 1002x503 |
| `skill-104050211` | 21 | 1145276 | 2033x1026 |
| `skill-104050213` | 11 | 783970 | 1017x1240 |
| **total** | **952** | **27820636** | |

## Sprite-frame meta

Same image meta shape as `client/assets/resources/battle/skill/skill-101010011/skill-101010011_0.png.meta`. Regenerating that neighbor from its PNG reproduces the file.

- `ver` `1.0.27`, `importer` `image`, `userData.type` `sprite-frame`, `hasAlpha` true
- Sub-assets: texture id `6c48a` (`ver` `1.0.22`, clamp-to-edge, linear) and sprite-frame id `f9941` (`ver` `1.0.12`)
- `redirect` is `<uuid>@6c48a`
- `trimType` `auto`, `trimThreshold` `1` (pixels with alpha `0` or `1` sit outside the trim rect)
- Trim rect, offset, and mesh vertices (`rawPosition`, `uv`, `nuv`) come from that alpha bounds. `uv` is top-left pixel space; `nuv` uses the same top-left Y divided by the raw height
- All 952 frames are RGBA. Fourteen frames have no pixel with alpha above 1, so the trim rect is the full source size, the same fallback already used on the #170 skill frames: `skill-104050051-1_0` through `_3`, `skill-104050061-1_20` through `_23` and `_41`, `skill-104050071-1_0`, `skill-104050073_11`, `skill-104050091_24`, `skill-104050100_14`, `skill-104050151-2_8`
- UUIDs are new v4 values. The 952 image uuids and 51 folder uuids do not collide with each other or with any uuid already in a repo `.meta`

## Folder meta

Each new stem folder has `<stem>.meta` beside the folder. Shape and `ver` are copied from the existing sibling directory metas in `client/assets/resources/battle/skill/` (all 49 of them are the same shape): `ver` `1.2.0`, `importer` `directory`, `imported` true, empty `files`, `subMetas`, and `userData`, plus a fresh uuid. That sibling shape is what landed in this batch.

## Already on main (#170), skipped

#170 already imported 49 skill stems (534 frames) under `client/assets/resources/battle/skill/`. Those stems were not in the D4 zips and were left untouched:

`hero-skill`, `skill-101010011`, `skill-101020021`, `skill-101030030`, `skill-101040050`, `skill-101040051`, `skill-101040120-1`, `skill-101040120-2`, `skill-101050060`, `skill-101050070`, `skill-101050073`, `skill-101050080`, `skill-101050080-1`, `skill-101050080-2`, `skill-101050083`, `skill-101050085`, `skill-101050090`, `skill-101050100`, `skill-101050101`, `skill-101050110`, `skill-101050130`, `skill-101050201-2`, `skill-101050201-3`, `skill-102010011`, `skill-102020021`, `skill-102030031`, `skill-102040040`, `skill-102040050`, `skill-102050060`, `skill-102050070`, `skill-102050080`, `skill-102050100`, `skill-103010011`, `skill-103020021`, `skill-103030030`, `skill-103030031`, `skill-103040041`, `skill-103040050`, `skill-103040051`, `skill-103040120`, `skill-103050060`, `skill-104030011`, `skill-104040020`, `skill-104040021`, `skill-104040031`, `skill-104050040`, `skill-104050041`, `skill-104050050`, `skill-104050060`.

## Siblings D1–D6

D4 is one of the sibling skill-frame batches D1–D6. This PR is **D4 only** (`skill-104xxx`, 51 stems, 952 frames). D1, D2, D3, D5, and D6 are separate and are not in this PR.

## Scope

PNG frames and `.meta` files for the 51 new stems, plus this doc. No Prefab edits, no PNG references added to prefabs, no Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg` change, no edits under existing `battle/skill/*` or `battle/skill-effect/*`.
