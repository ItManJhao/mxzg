# Batch D2 skill PVR frames (skill-102xxx)

Old `hd/skill` PVR atlas frames, already decoded to PNG, imported under `client/assets/resources/battle/skill/<stem>/`. Each new PNG has a Creator 3.8.8 sprite-frame `.meta`. Each new stem folder has a directory `.meta`. Prefabs, Boot, `USE_*`, protocol scripts, and BattlePage `Bg` are unchanged. Existing `battle/skill/*` and `battle/skill-effect/*` files were not modified.

## Baseline

- Repo tip: `ddcf9b6e` (Batch A/B/C merged)
- Source: `idle/res/hd/skill` RGBA8888 `pvr.ccz`, decoded to PNG and padded with transparent pixels out to `sourceSize` (same as #170)
- Zip: `mxzg-mig-batch-d2-p1.zip` (18269061 bytes), one part, unpacked at the repo root. Members were already rooted at `client/assets/resources/battle/skill/<stem>/`
- Manifest: 46 stems, 824 frames, 18261172 PNG bytes
- None of the 824 PNG paths or 46 stem folders existed on the baseline. Nothing was overwritten
- On-disk frame counts and PNG byte sizes match the manifest for every stem. All 824 frames are RGBA

| | stems | png frames | bytes |
| --- | ---: | ---: | ---: |
| D2 `skill-102xxx` | 46 | 824 | 18261172 |

Sibling batches D1–D6 are the rest of this skill-frame import. This PR is only D2 (`skill-102xxx`).

49 stems (534 frames) were already on main from #170 and were skipped. They are not in this zip, and their folders were not touched. The list is in [`battle-asset-migration.md`](battle-asset-migration.md) under the skill subset. Nine of those 49 are other `skill-102*` stems (`skill-102010011`, `skill-102020021`, `skill-102030031`, `skill-102040040`, `skill-102040050`, `skill-102050060`, `skill-102050070`, `skill-102050080`, `skill-102050100`).

## Meta

PNG metas match `client/assets/resources/battle/skill/skill-101010011/skill-101010011_0.png.meta`:

- `importer` `image`, `ver` `1.0.27`, `userData.type` `sprite-frame`, `hasAlpha` true
- Sub-assets: texture id `6c48a` (`ver` `1.0.22`, clamp-to-edge, linear) and sprite-frame id `f9941` (`ver` `1.0.12`)
- `trimType` `auto`, `trimThreshold` `1` (alpha `0` and `1` sit outside the trim rect)
- `trimX` / `trimY` / `width` / `height` / `rawWidth` / `rawHeight` / `offsetX` / `offsetY` and mesh vertices (`rawPosition`, `uv`, `nuv`) come from that alpha bounds rect
- `redirect` is `<uuid>@6c48a`
- Fresh UUID v4 per PNG. Checked against existing `.meta` uuids; no collisions

Folder metas copy the shape and `ver` of the sibling stem metas already in `battle/skill/` (for example `skill-101010011.meta`). All 49 siblings share one shape: `importer` `directory`, `ver` `1.2.0`, empty `files` / `subMetas` / `userData`, plus a fresh uuid. That sibling shape is what these 46 new folder metas use.

## Stems

Manifest order. Frame counts and PNG bytes are the manifest columns, and they match the files on disk. Atlas size is the source atlas from the manifest.

| stem | frames | bytes | atlas |
| --- | ---: | ---: | --- |
| `skill-102040041` | 13 | 102009 | 1016x305 |
| `skill-102040051` | 10 | 164284 | 450x319 |
| `skill-102040130` | 9 | 82016 | 371x230 |
| `skill-102040131` | 28 | 877734 | 1014x547 |
| `skill-102050061` | 11 | 205522 | 500x247 |
| `skill-102050061-1` | 15 | 370036 | 984x508 |
| `skill-102050071` | 17 | 355473 | 959x445 |
| `skill-102050081` | 18 | 463084 | 999x429 |
| `skill-102050081-1` | 44 | 671731 | 1961x1042 |
| `skill-102050090` | 11 | 530665 | 1455x881 |
| `skill-102050091` | 15 | 241322 | 464x510 |
| `skill-102050091-1` | 33 | 471436 | 1007x457 |
| `skill-102050093` | 11 | 100297 | 485x209 |
| `skill-102050101` | 14 | 123317 | 495x205 |
| `skill-102050101-1` | 16 | 193096 | 296x505 |
| `skill-102050110` | 18 | 184839 | 311x469 |
| `skill-102050111` | 20 | 250285 | 505x325 |
| `skill-102050111-1` | 41 | 586751 | 1131x905 |
| `skill-102050113` | 20 | 191549 | 482x265 |
| `skill-102050140` | 15 | 147398 | 495x255 |
| `skill-102050141` | 22 | 298274 | 511x497 |
| `skill-102050141-1` | 53 | 554637 | 554x1016 |
| `skill-102050143` | 20 | 389775 | 679x487 |
| `skill-102050150` | 14 | 336227 | 984x307 |
| `skill-102050151` | 15 | 120860 | 417x241 |
| `skill-102050151-1` | 20 | 62792 | 495x151 |
| `skill-102050181` | 12 | 340474 | 1358x507 |
| `skill-102050191` | 7 | 350254 | 280x1786 |
| `skill-102050200` | 7 | 124154 | 174x970 |
| `skill-102050201-1` | 5 | 270880 | 256x917 |
| `skill-102050201-2` | 10 | 318404 | 862x984 |
| `skill-102050201-3` | 39 | 321954 | 648x2016 |
| `skill-102050203` | 9 | 127133 | 1883x219 |
| `skill-102050210` | 11 | 229822 | 254x628 |
| `skill-102050211` | 13 | 244510 | 1772x256 |
| `skill-102050211-1` | 22 | 771654 | 1024x1464 |
| `skill-102050213` | 20 | 451026 | 256x1850 |
| `skill-102050220` | 11 | 205895 | 1118x493 |
| `skill-102050221` | 23 | 745981 | 596x2038 |
| `skill-102050221-1` | 19 | 789955 | 438x1987 |
| `skill-102050223` | 15 | 313192 | 1861x579 |
| `skill-102050230` | 8 | 81683 | 361x507 |
| `skill-102050231` | 17 | 1000697 | 1219x1007 |
| `skill-102050233` | 22 | 1110131 | 1059x1015 |
| `skill-102050233_1` | 22 | 2075678 | 1397x2023 |
| `skill-102100071-1` | 9 | 312286 | 434x1969 |
| **D2** | **824** | **18261172** | |
