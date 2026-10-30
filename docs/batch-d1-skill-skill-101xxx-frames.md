# Batch D1 skill frames (skill-101xxx)

Old `hd/skill` PVR atlas frames, already decoded to PNG, for the `skill-101xxx` stems in this batch. Each PNG lives at `client/assets/resources/battle/skill/<stem>/<frame>.png` with a Creator 3.8.8 sprite-frame `.meta`. Each new stem folder has a directory `.meta`. Prefabs are not rewired.

## Baseline

- Repo tip: `ddcf9b6e` (Batch A/B/C merged, through C6 #187)
- Source zip: `mxzg-mig-batch-d1-p1.zip` (19,889,719 bytes), unpacked at the repo root
- Zip paths already start at `client/assets/resources/battle/skill/<stem>/*.png`
- 45 new stems, 963 frames, 20,003,589 PNG bytes
- None of those PNG paths or stem folders existed on the baseline. On-disk frame counts and byte sizes match the manifest below.
- Every PNG is RGBA. The largest atlas in the manifest is `skill-101050181-1` at 2256×4054.

49 stems were already on main in #170 and were skipped. They are not in this zip. The stem list is in [`battle-asset-migration.md`](battle-asset-migration.md).

## Stems

Frame counts and byte sizes are from the Batch D1 manifest.

| stem | frames | PNG bytes | atlas |
| --- | ---: | ---: | --- |
| `skill-101040121` | 21 | 551,321 | 510x1651 |
| `skill-101050061` | 23 | 1,521,952 | 1480x1019 |
| `skill-101050071` | 26 | 595,813 | 479x1018 |
| `skill-101050075` | 9 | 181,102 | 608x488 |
| `skill-101050081` | 25 | 968,140 | 2026x882 |
| `skill-101050081-1` | 29 | 494,699 | 1017x623 |
| `skill-101050091` | 24 | 638,997 | 1021x621 |
| `skill-101050091-1` | 22 | 155,215 | 385x498 |
| `skill-101050111` | 10 | 318,289 | 868x333 |
| `skill-101050111-1` | 28 | 222,553 | 627x501 |
| `skill-101050131` | 22 | 547,720 | 990x423 |
| `skill-101050131-1` | 66 | 171,675 | 500x192 |
| `skill-101050140` | 11 | 234,291 | 687x473 |
| `skill-101050141` | 12 | 70,474 | 195x221 |
| `skill-101050141-1` | 48 | 169,989 | 479x251 |
| `skill-101050150` | 9 | 82,016 | 371x230 |
| `skill-101050151` | 28 | 877,734 | 1014x547 |
| `skill-101050151-1` | 48 | 1,085,460 | 1873x575 |
| `skill-101050153` | 13 | 222,822 | 504x1212 |
| `skill-101050181` | 13 | 437,719 | 1588x506 |
| `skill-101050181-1` | 40 | 2,337,011 | 2256x4054 |
| `skill-101050190` | 8 | 341,095 | 1916x394 |
| `skill-101050191` | 12 | 310,279 | 474x990 |
| `skill-101050191-1` | 30 | 1,060,405 | 1943x1223 |
| `skill-101050200-1` | 8 | 58,426 | 962x59 |
| `skill-101050200-2` | 8 | 273,270 | 256x1632 |
| `skill-101050200-3` | 11 | 234,086 | 1247x250 |
| `skill-101050201-1` | 10 | 62,048 | 107x432 |
| `skill-101050203` | 21 | 235,709 | 107x1598 |
| `skill-101050210-1` | 6 | 84,753 | 906x176 |
| `skill-101050210-2` | 4 | 110,589 | 202x966 |
| `skill-101050211` | 14 | 519,291 | 1448x1020 |
| `skill-101050211-1` | 11 | 115,914 | 128x1644 |
| `skill-101050211-2` | 5 | 39,184 | 1008x232 |
| `skill-101050213` | 17 | 456,877 | 510x1661 |
| `skill-101050220-1` | 4 | 24,496 | 352x59 |
| `skill-101050220-2` | 16 | 813,319 | 486x1604 |
| `skill-101050220-3` | 68 | 482,030 | 1284x995 |
| `skill-101050221` | 15 | 506,094 | 471x1237 |
| `skill-101050221-1` | 68 | 482,030 | 1284x995 |
| `skill-101050223` | 12 | 539,419 | 567x949 |
| `skill-101050230` | 16 | 94,288 | 317x251 |
| `skill-101050231` | 20 | 456,751 | 1014x431 |
| `skill-101050231-1` | 29 | 131,188 | 429x249 |
| `skill-101050233` | 23 | 687,056 | 657x997 |
| **D1** | **963** | **20,003,589** | 45 stems |

## Sprite-frame meta

Each new PNG has `*.png.meta` in the same shape as `client/assets/resources/battle/skill/skill-101010011/skill-101010011_0.png.meta` (Creator 3.8.8):

- Image importer `ver` 1.0.27, `userData.type` `sprite-frame`, `hasAlpha` true
- Texture sub-meta `6c48a` (`ver` 1.0.22), wrap clamp-to-edge, min/mag filter linear
- Sprite-frame sub-meta `f9941` (`ver` 1.0.12)
- `trimType` `auto`, `trimThreshold` 1 (pixels with alpha 0 or 1 sit outside the trim rect)
- Trim rect, offsets, and quad vertices come from that alpha bound: `uv` is bottom-left, bottom-right, top-left, top-right; `nuv` is top-left, top-right, bottom-left, bottom-right
- `redirect` points at `<uuid>@6c48a`
- Nine-slice borders are 0
- UUIDs are new v4 values. The 1,008 new top-level meta uuids do not collide with each other or with uuids already present in `client/`

Frames whose alpha never rises above 1 keep the full source size as the trim rect, same as existing blank skill frames such as `skill-101050090_17`.

## Folder meta

Each new stem folder has `<stem>.meta` in the shape of the existing sibling directory metas under `client/assets/resources/battle/skill/`. All 49 siblings share one shape: importer `directory`, `ver` `1.2.0`, empty `files`, `subMetas`, and `userData`, plus a fresh uuid. Existing `battle/skill/*` and `battle/skill-effect/*` files were left as they were.

## Sibling batches

Skill PVR frames after #170 are split across D1–D6. This PR is **D1** (`skill-101xxx`) only.

| batch | in this PR |
| --- | --- |
| D1 | yes — 45 stems, 963 frames above |
| D2 | no — sibling, separate PR |
| D3 | no — sibling, separate PR |
| D4 | no — sibling, separate PR |
| D5 | no — sibling, separate PR |
| D6 | no — sibling, separate PR |

## Left untouched

No Prefab edits, and no PNG uuid was written into a prefab. No Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg`. Existing `battle/skill/*` and `battle/skill-effect/*` files are unchanged.
