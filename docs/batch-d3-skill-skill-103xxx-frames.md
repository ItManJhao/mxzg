# Batch D3 skill frames (skill-103xxx)

Old `hd/skill` PVR atlas frames, already decoded to PNG, for the `skill-103xxx` stems that were not in #170. Each new PNG has a Creator 3.8.8 sprite-frame `.meta`. Each new stem folder has a directory `.meta` in the same shape as the existing `battle/skill/` folder metas. Prefabs are not rewired.

## Baseline

- Repo tip: `ddcf9b6e` (Batch A/B/C merged, through C6 #187)
- Source: `hd/skill` RGBA8888 PVR atlases, decoded to PNG and padded to sourceSize, same as #170
- Manifest: Batch D3 (`mxzg-mig-batch-d3`). One zip part: `mxzg-mig-batch-d3-p1` (19,504,485 bytes, 47 stems, 733 frames)
- Unpacked at `client/assets/resources/battle/skill/<stem>/`
- None of the 733 PNG paths or 47 stem folders existed on the baseline. Nothing was overwritten. On-disk frame counts and byte sizes match the manifest.

| | stems | png frames | bytes |
| --- | ---: | ---: | ---: |
| D3 | 47 | 733 | 19,561,848 |

49 stems were already on main (#170) and were skipped. They are listed in [`battle-asset-migration.md`](battle-asset-migration.md). This PR does not modify those folders or `battle/skill-effect/`.

## Stems

Frame counts and byte sizes are the manifest figures. They match the files in this PR. Atlas size is the source atlas, not the padded frame size. Largest imported frame edge is 900 (`skill-103050070_0.png`).

| stem | frames | bytes | atlas |
| --- | ---: | ---: | --- |
| `skill-103040121` | 21 | 316,936 | 509x615 |
| `skill-103050061` | 10 | 570,531 | 1019x884 |
| `skill-103050061-1` | 14 | 374,707 | 1019x619 |
| `skill-103050070` | 16 | 1,925,844 | 1487x2005 |
| `skill-103050071` | 14 | 367,834 | 607x1023 |
| `skill-103050071-1` | 20 | 435,602 | 609x1019 |
| `skill-103050073` | 17 | 220,427 | 414x510 |
| `skill-103050080` | 10 | 69,118 | 253x251 |
| `skill-103050081` | 14 | 207,264 | 301x497 |
| `skill-103050081-1` | 9 | 86,506 | 474x195 |
| `skill-103050083` | 8 | 75,361 | 475x201 |
| `skill-103050090` | 12 | 88,759 | 289x220 |
| `skill-103050091` | 9 | 184,762 | 711x364 |
| `skill-103050091-1` | 20 | 177,454 | 381x470 |
| `skill-103050100` | 10 | 171,350 | 408x473 |
| `skill-103050101` | 13 | 1,897,357 | 1871x1232 |
| `skill-103050101-1` | 20 | 626,887 | 2001x595 |
| `skill-103050103` | 14 | 226,902 | 327x508 |
| `skill-103050110` | 14 | 598,060 | 941x859 |
| `skill-103050111` | 11 | 842,809 | 2039x1193 |
| `skill-103050130` | 14 | 165,972 | 493x402 |
| `skill-103050131` | 12 | 225,623 | 1005x366 |
| `skill-103050140` | 10 | 614,185 | 1012x736 |
| `skill-103050141` | 17 | 1,873,195 | 1107x2040 |
| `skill-103050141-1` | 23 | 149,296 | 237x255 |
| `skill-103050150` | 7 | 72,499 | 252x213 |
| `skill-103050151` | 23 | 164,434 | 507x261 |
| `skill-103050151-1` | 36 | 170,716 | 494x321 |
| `skill-103050181` | 11 | 277,353 | 256x1350 |
| `skill-103050191-1` | 7 | 83,023 | 960x83 |
| `skill-103050191-2` | 10 | 314,461 | 256x1746 |
| `skill-103050200-1` | 7 | 29,460 | 105x583 |
| `skill-103050200-2` | 9 | 429,049 | 980x996 |
| `skill-103050201` | 21 | 691,390 | 2028x586 |
| `skill-103050201-1` | 18 | 655,080 | 492x1678 |
| `skill-103050203` | 10 | 142,662 | 1003x488 |
| `skill-103050210-1` | 7 | 60,948 | 121x499 |
| `skill-103050210-2` | 22 | 254,675 | 252x1246 |
| `skill-103050211` | 17 | 524,440 | 510x1264 |
| `skill-103050211-1` | 52 | 1,175,145 | 1354x2035 |
| `skill-103050220` | 9 | 141,928 | 191x1597 |
| `skill-103050221` | 18 | 408,907 | 1018x508 |
| `skill-103050221-1` | 55 | 606,981 | 1013x1077 |
| `skill-103050230` | 11 | 281,905 | 1965x160 |
| `skill-103050231-1` | 9 | 152,625 | 1010x365 |
| `skill-103050231-2` | 9 | 175,666 | 802x590 |
| `skill-103050231-3` | 13 | 255,760 | 2022x509 |
| **D3** | **733** | **19,561,848** | |

Notes:

- **`skill-103050210-2` filenames.** Seventeen frames in that stem are stored in the zip as `.PNG` (frames 5 and 10–21). They were unpacked under that name. The other five frames in the stem, and every other stem, use `.png`. All 22 are RGBA PNGs. Sprite-frame `displayName` omits the extension.
- **Fully transparent frames.** 31 frames have no pixel with alpha above 1. Their trim rect is the full image, same as the empty frames already imported in #170.

## Sprite-frame meta

Each new PNG has `*.png.meta` (or `*.PNG.meta` for the seventeen names above) in the same shape as existing `client/assets/resources/battle/skill/` sprite frames (Creator 3.8.8):

- Image importer `ver` 1.0.27, `userData.type` `sprite-frame`, `hasAlpha` true, `redirect` to `<uuid>@6c48a`
- Texture sub-meta `6c48a` (`ver` 1.0.22), clamp-to-edge, linear, mipfilter none
- Sprite-frame sub-meta `f9941` (`ver` 1.0.12)
- `trimType` `auto`, `trimThreshold` 1 (pixels with alpha 0 or 1 sit outside the trim rect)
- Quad vertices match the existing skill metas: trim rect in top-left pixels; `uv` is bottom-left, bottom-right, top-left, top-right; `nuv` is top-left, top-right, bottom-left, bottom-right
- Nine-slice borders are 0
- UUIDs are new v4. The 780 new uuids (733 images + 47 folders) do not collide with each other or with any uuid already in `client/`

Each new stem folder has `<stem>.meta` copied from the sibling directory metas under `battle/skill/` (for example `skill-101010011.meta`): importer `directory`, `ver` `1.2.0`, `imported` true, empty `files` / `subMetas` / `userData`, and a new uuid. No existing `.meta` was rewritten.

## Sibling batches

Skill PVR frames are split across batches D1–D6. This PR is **D3** only.

| batch | in this PR |
| --- | --- |
| D1 | no — sibling, separate PR |
| D2 | no — sibling, separate PR |
| D3 | yes — `skill-103xxx`, 47 stems, 733 frames |
| D4 | no — sibling, separate PR |
| D5 | no — sibling, separate PR |
| D6 | no — sibling, separate PR |

## Left untouched

No Prefab edits and no PNG references added to prefabs. No Boot, no `USE_*`, no protocol scripts. No BattlePage `Bg` change. Existing `battle/skill/*` files from #170 and `battle/skill-effect/*` are unchanged.
