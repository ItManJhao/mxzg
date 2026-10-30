# Batch D6 skill PVR frames (skill-107 / skill-200 / skill-400)

765 old `hd/skill` PVR atlas frames, already decoded to PNG, imported under `client/assets/resources/battle/skill/<stem>/`. Every new PNG has a Creator 3.8.8 sprite-frame `.meta`. Each new stem folder has a directory `.meta` in the same shape as the existing `battle/skill` folder metas.

- Baseline: main `ddcf9b6e` (Batch A/B/C merged)
- Source: `hd/skill` PVR atlases, RGBA8888 `pvr.ccz` decoded to PNG and padded to `sourceSize` (same rule as #170)
- Zips, unpacked at the repo root. Members were already rooted at `client/assets/resources/battle/skill/<stem>/*.png`
  - `mxzg-mig-batch-d6-p1.zip` — 23043500 bytes, 32 stems, 643 frames (`skill-107010010` through `skill-400080001`)
  - `mxzg-mig-batch-d6-p2.zip` — 2353526 bytes, 7 stems, 122 frames (`skill-400090001` through `skill-400150001`)
- Manifest: 39 stems, 765 frames, 25326028 PNG bytes. On-disk size and frame count match that row for every stem. Frame files are `<stem>_0.png` … `<stem>_<n-1>.png`
- None of the 39 stem folders or 765 PNGs existed on the baseline. No existing `battle/skill` or `battle/skill-effect` file was overwritten

| | stems | frames | PNG bytes |
| --- | ---: | ---: | ---: |
| p1 | 32 | 643 | 23043500 zip |
| p2 | 7 | 122 | 2353526 zip |
| **D6** | **39** | **765** | **25326028** |

## Stems

Manifest order. Frame count and PNG bytes are the on-disk files, and both match the manifest. Atlas size is the source sheet from the manifest, not the padded frame size.

| stem | frames | PNG bytes | atlas |
| --- | ---: | ---: | --- |
| `skill-107010010` | 20 | 501980 | 512x845 |
| `skill-107010011` | 24 | 699930 | 503x1485 |
| `skill-107010013` | 19 | 625256 | 2047x390 |
| `skill-107010020` | 19 | 593728 | 971x506 |
| `skill-107010021` | 12 | 211207 | 482x590 |
| `skill-107010023` | 37 | 1271629 | 1020x1188 |
| `skill-107010025` | 29 | 1010488 | 1011x1013 |
| `skill-107010030` | 16 | 89027 | 262x253 |
| `skill-107010031` | 20 | 339265 | 998x261 |
| `skill-107010033` | 23 | 356813 | 1018x334 |
| `skill-107010040` | 8 | 162360 | 546x475 |
| `skill-107010041` | 14 | 1924670 | 926x1826 |
| `skill-107010043` | 20 | 1230760 | 990x1570 |
| `skill-107010050` | 13 | 326674 | 449x506 |
| `skill-107010051` | 31 | 1371421 | 1194x1024 |
| `skill-107010053` | 24 | 864861 | 2008x572 |
| `skill-107010060` | 28 | 509719 | 2004x266 |
| `skill-107010061` | 53 | 4169056 | 1830x2030 |
| `skill-107010063` | 39 | 2167136 | 979x1981 |
| `skill-200010001` | 16 | 396161 | 643x509 |
| `skill-200020001` | 20 | 1259443 | 993x896 |
| `skill-200030001` | 18 | 251653 | 492x486 |
| `skill-200040001` | 20 | 250145 | 335x509 |
| `skill-200050001` | 15 | 518111 | 906x524 |
| `skill-400010001` | 13 | 220401 | 491x496 |
| `skill-400020001` | 10 | 184114 | 368x407 |
| `skill-400030001` | 11 | 200774 | 368x501 |
| `skill-400040001` | 13 | 267143 | 494x389 |
| `skill-400050001` | 13 | 228905 | 491x459 |
| `skill-400060001` | 14 | 255382 | 614x491 |
| `skill-400070001` | 16 | 254078 | 479x453 |
| `skill-400080001` | 15 | 278526 | 256x1017 |
| `skill-400090001` | 16 | 304252 | 833x402 |
| `skill-400100001` | 17 | 304103 | 928x391 |
| `skill-400110001` | 18 | 472519 | 998x405 |
| `skill-400120001` | 16 | 236052 | 492x503 |
| `skill-400130001` | 19 | 305294 | 979x331 |
| `skill-400140001` | 19 | 444788 | 989x377 |
| `skill-400150001` | 17 | 268204 | 492x504 |
| **D6** | **765** | **25326028** | |

## Sprite-frame meta

Each new PNG has `<name>.png.meta` in the same shape as `client/assets/resources/battle/skill/skill-101010011/skill-101010011_0.png.meta`:

- Image importer `ver` `1.0.27`, `userData.type` `sprite-frame`, `hasAlpha` true, `redirect` `<uuid>@6c48a`
- Texture sub-meta `6c48a` (`ver` `1.0.22`): clamp-to-edge, linear min/mag, mipfilter none
- Sprite-frame sub-meta `f9941` (`ver` `1.0.12`): `trimType` `auto`, `trimThreshold` `1` (alpha `0` and `1` sit outside the trim rect)
- Trim rect is top-left pixels from the PNG alpha bounds. Offset and mesh vertices (`rawPosition`, `uv`, `nuv`) follow that rect; `nuv` Y is flipped from the texture top, matching Creator 3.8 `SpriteFrame._initVertices`
- Nine-slice borders are 0. All 765 frames are RGBA

Three frames have no pixel with alpha above 1, so the trim rect is the full raw frame (same empty-bounds rule as the existing skill metas):

- `skill-107010030_15.png` — alpha 0–1, 83×83
- `skill-107010053_0.png` — fully transparent, 266×300
- `skill-400050001_12.png` — fully transparent, 122×227

UUIDs are new uuid4 values, one per PNG. Top-level uuids in this batch do not collide with each other or with any other `.meta` in `client/`.

## Folder meta

Each new stem folder has `battle/skill/<stem>.meta`. Shape and `ver` are copied from the existing sibling directory metas (all 49 on this baseline, including `skill-101010011.meta`):

- `ver` `1.2.0`, `importer` `directory`, `imported` true
- `files` `[]`, `subMetas` `{}`, `userData` `{}`
- Fresh uuid4 per folder

## Already on main (#170)

49 stems (534 frames) were already under `client/assets/resources/battle/skill/` from #170 (`hero-skill` plus the 101 / 102 / 103 / 104 subset). They are not part of D6 and were skipped. Those folders and their metas are unchanged.

## Sibling batches

Skill PVR frame import is split across sibling batches **D1–D6**. This PR is **D6** only (`skill-107` / `skill-200` / `skill-400`, 39 stems, 765 frames). D1, D2, D3, D4, and D5 are not in this branch.

## Out of scope

No Prefab edits and no PNG references added to prefabs. No Boot, `USE_*`, or protocol edits. BattlePage `Bg` is unchanged. Existing `battle/skill/*` and `battle/skill-effect/*` files are unchanged.
