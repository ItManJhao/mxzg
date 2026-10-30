# Batch E1 bitmap fonts (remaining fnt+png)

Old `hd/font` bitmap fonts that were not already on main. 21 fnt+png pairs land flat in `client/assets/resources/font/`, beside the bitmap fonts already there. Each new `.fnt` has a Creator 3.8.8 bitmap-font `.meta`. Each new `.png` has a sprite-frame `.meta` in the same shape as the font pngs already in the repo. Prefabs are not rewired.

## Baseline

- Repo tip: `6a7e235e` (Batch A–D merged, through D3 #193)
- Source: `hd/font`
- Manifest: Batch E1 (`mxzg-mig-batch-e1`). One zip: `mxzg-mig-batch-e1-p1` (548536 bytes, 42 files)
- Unpacked at the repo root. Paths inside the zip already start at `client/assets/resources/font/`
- None of the 42 content paths existed on the baseline. Nothing was overwritten. On-disk sizes match the manifest

| | pairs | content files | .fnt bytes | .png bytes | bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| E1 | 21 | 42 | 191900 | 534264 | 726164 |

`.fnt` 21, `.png` 21. `client/assets/resources/font/` already existed, so this batch adds no directory `.meta`. `font.meta` was not rewritten.

## Path mapping

Old path is under `hd/`. New path is in the repo. Bytes are the manifest figures and match the files in this PR.

| old path (hd/) | new path | bytes |
| --- | --- | ---: |
| font/20.fnt | client/assets/resources/font/20.fnt | 14698 |
| font/20.png | client/assets/resources/font/20.png | 9998 |
| font/22.fnt | client/assets/resources/font/22.fnt | 14702 |
| font/22.png | client/assets/resources/font/22.png | 11376 |
| font/24.fnt | client/assets/resources/font/24.fnt | 14700 |
| font/24.png | client/assets/resources/font/24.png | 12590 |
| font/26.fnt | client/assets/resources/font/26.fnt | 14687 |
| font/26.png | client/assets/resources/font/26.png | 20342 |
| font/28.fnt | client/assets/resources/font/28.fnt | 14722 |
| font/28.png | client/assets/resources/font/28.png | 21532 |
| font/32.fnt | client/assets/resources/font/32.fnt | 14785 |
| font/32.png | client/assets/resources/font/32.png | 20141 |
| font/36.fnt | client/assets/resources/font/36.fnt | 14758 |
| font/36.png | client/assets/resources/font/36.png | 24740 |
| font/40.fnt | client/assets/resources/font/40.fnt | 15021 |
| font/40.png | client/assets/resources/font/40.png | 27013 |
| font/44.fnt | client/assets/resources/font/44.fnt | 14909 |
| font/44.png | client/assets/resources/font/44.png | 29336 |
| font/48.fnt | client/assets/resources/font/48.fnt | 14915 |
| font/48.png | client/assets/resources/font/48.png | 32352 |
| font/56.fnt | client/assets/resources/font/56.fnt | 14827 |
| font/56.png | client/assets/resources/font/56.png | 38572 |
| font/60.fnt | client/assets/resources/font/60.fnt | 14951 |
| font/60.png | client/assets/resources/font/60.png | 41743 |
| font/blue-40.fnt | client/assets/resources/font/blue-40.fnt | 1429 |
| font/blue-40.png | client/assets/resources/font/blue-40.png | 10407 |
| font/green-116.fnt | client/assets/resources/font/green-116.fnt | 1547 |
| font/green-116.png | client/assets/resources/font/green-116.png | 78358 |
| font/green-26.fnt | client/assets/resources/font/green-26.fnt | 1653 |
| font/green-26.png | client/assets/resources/font/green-26.png | 3734 |
| font/purple-30.fnt | client/assets/resources/font/purple-30.fnt | 1659 |
| font/purple-30.png | client/assets/resources/font/purple-30.png | 10884 |
| font/purple-56.fnt | client/assets/resources/font/purple-56.fnt | 1431 |
| font/purple-56.png | client/assets/resources/font/purple-56.png | 24054 |
| font/purple-73.fnt | client/assets/resources/font/purple-73.fnt | 1654 |
| font/purple-73.png | client/assets/resources/font/purple-73.png | 28614 |
| font/red-116.fnt | client/assets/resources/font/red-116.fnt | 1545 |
| font/red-116.png | client/assets/resources/font/red-116.png | 70984 |
| font/red-26.fnt | client/assets/resources/font/red-26.fnt | 1651 |
| font/red-26.png | client/assets/resources/font/red-26.png | 8181 |
| font/red-40.fnt | client/assets/resources/font/red-40.fnt | 1656 |
| font/red-40.png | client/assets/resources/font/red-40.png | 9313 |

## Fonts

`fontSize` in the meta is the `.fnt` `info size`. `commonHeight` is `common lineHeight`. The filename often does not match that size. Existing `yellow-38.fnt` is the same kind of file (`info size=48`, `lineHeight=47`). Glyph counts below are `char` lines stored in `fontDefDictionary`.

| stem | info size | lineHeight | glyphs | png | .fnt bytes | .png bytes |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| `20` | 10 | 10 | 120 | 256x256 | 14698 | 9998 |
| `22` | 11 | 12 | 120 | 256x256 | 14702 | 11376 |
| `24` | 12 | 13 | 120 | 256x256 | 14700 | 12590 |
| `26` | 13 | 14 | 120 | 512x256 | 14687 | 20342 |
| `28` | 14 | 15 | 120 | 256x256 | 14722 | 21532 |
| `32` | 16 | 17 | 120 | 256x256 | 14785 | 20141 |
| `36` | 18 | 19 | 120 | 512x512 | 14758 | 24740 |
| `40` | 20 | 20 | 122 | 512x256 | 15021 | 27013 |
| `44` | 22 | 23 | 121 | 512x256 | 14909 | 29336 |
| `48` | 24 | 25 | 121 | 512x256 | 14915 | 32352 |
| `56` | 28 | 29 | 120 | 512x256 | 14827 | 38572 |
| `60` | 30 | 30 | 121 | 512x256 | 14951 | 41743 |
| `blue-40` | 40 | 40 | 10 | 256x256 | 1429 | 10407 |
| `green-116` | 100 | 100 | 11 | 800x800 | 1547 | 78358 |
| `green-26` | 30 | 28 | 12 | 128x128 | 1653 | 3734 |
| `purple-30` | 30 | 28 | 12 | 128x128 | 1659 | 10884 |
| `purple-56` | 46 | 45 | 10 | 256x256 | 1431 | 24054 |
| `purple-73` | 73 | 73 | 12 | 256x256 | 1654 | 28614 |
| `red-116` | 100 | 100 | 11 | 800x800 | 1545 | 70984 |
| `red-26` | 30 | 28 | 12 | 128x128 | 1651 | 8181 |
| `red-40` | 30 | 28 | 12 | 128x128 | 1656 | 9313 |
| **E1** | | | **1547** | | **191900** | **534264** |

Notes:

- **`chars count` header.** On `20` through `60` the header is one less than the number of `char` lines (`119` vs `120` on most of them; `40` is `121` vs `122`; `44`, `48`, and `60` are `120` vs `121`). The meta keeps every `char` line. The colored fonts' headers match their `char` lines.
- **Kerning.** Those same numeric fonts end with `kernings count=-1` and have no `kerning` lines. `kerningDict` is `{}`, same as the bitmap fonts already on main.
- **`green-26.png`.** Indexed PNG with a tRNS chunk. The sprite-frame meta still follows `red-30.png.meta`. `hasAlpha` is true.
- **Alpha 1 fringe.** `green-116.png` and `red-116.png` have pixels with alpha `1` outside the bounds of pixels with alpha above `1`. Those pixels sit outside the trim rect (`trimThreshold` 1), the same rule as the UI and skill frame metas. `green-116` trim is `1,3,700,229`. `red-116` trim is `2,3,699,229`.

## Meta

Repo references exist for both meta types. The checked-in files were copied. Their `ver` values match the batch brief, so the repo shape and the brief agree.

### Bitmap font `.fnt.meta`

Copied from `client/assets/resources/font/red-30.fnt.meta` (same shape as the other bitmap-font metas in that folder: `blue-73`, `green-30`, `green-73`, `red-50`, `red-73`, `red-78`, `yellow-30`, `yellow-38`, `yellow-40`, `yellow-73`).

- importer `bitmap-font`, `ver` `1.0.6`, `imported` true, `files` `[".json"]`, empty `subMetas`
- `userData._fntConfig` is parsed from that `.fnt` text, one `char` line at a time, in file order: `commonHeight` (`lineHeight`), `fontSize` (`info size`), `atlasName` (page `file`), `fontDefDictionary` (`rect` x/y/width/height, `xOffset`, `yOffset`, `xAdvance`), `kerningDict`
- `userData.fontSize` is the info size
- `userData.textureUuid` is the top-level uuid of the same-name `.png.meta`. Every page `file` in this batch is that same-name png

### PNG `.png.meta`

Copied from `client/assets/resources/font/red-30.png.meta`.

- image importer `ver` `1.0.27`, `userData.type` `sprite-frame`, `hasAlpha` true, `redirect` `<uuid>@6c48a`
- texture sub-meta `6c48a`, `ver` `1.0.22`, clamp-to-edge, linear, mipfilter none
- sprite-frame sub-meta `f9941`, `ver` `1.0.12`
- `trimType` `auto`, `trimThreshold` `1` (pixels with alpha `0` or `1` sit outside the trim rect)
- quad vertices match the existing font png metas: trim rect in top-left pixels; `uv` is the trim corners with image-bottom as the origin, ordered top-left, top-right, bottom-left, bottom-right; `nuv` is normalized bottom-left, bottom-right, top-left, top-right
- nine-slice borders are 0
- 42 new top-level uuids, all new UUID v4. They do not collide with each other or with any uuid already in `client/`. Sub-meta ids `6c48a` and `f9941` are the fixed sprite sub-ids used by every image meta in this folder
- No existing `.meta` was rewritten

### `red-40.png`

`red-40.png` is byte-identical to `red-30.png` already on main (9313 bytes, md5 `2ac21f93f5ce068f2b739319244068ec`). It is still its own file. Its `.meta` uuid is new and is not the uuid of `red-30.png.meta`. Trim values match because the pixels match. `red-40.fnt` is not byte-identical to `red-30.fnt`. `red-40.fnt.meta` `textureUuid` points at the new `red-40.png` meta.

## Sibling batches

Bitmap font migration is split across batches E1–E4. This PR is **E1** only.

| batch | in this PR |
| --- | --- |
| E1 | yes — remaining bitmap fnt+png, 21 pairs |
| E2 | no — sibling, separate PR |
| E3 | no — sibling, separate PR |
| E4 | no — sibling, separate PR |

## Skipped

These bitmap fonts are already on main at `6a7e235e`. They were not in the E1 zip. The files and their `.meta` files were not modified. They are the same-content files already on main that this batch does not import again.

| already on main | .fnt bytes | .png bytes |
| --- | ---: | ---: |
| `font/blue-73` | 1652 | 23137 |
| `font/green-30` | 1642 | 11023 |
| `font/green-73` | 1653 | 26683 |
| `font/red-30` | 1640 | 9313 |
| `font/red-50` | 1423 | 25944 |
| `font/red-73` | 1651 | 40748 |
| `font/red-78` | 1423 | 28073 |
| `font/yellow-30` | 1419 | 7357 |
| `font/yellow-38` | 1769 | 23929 |
| `font/yellow-40` | 1419 | 10362 |
| `font/yellow-73` | 1654 | 27490 |

`CloudYuanCuGBK.ttf` and `FZCSJW-GB1-0.ttf` are also already in `client/assets/resources/font/`. They are not bitmap fonts and are not part of this batch.

## Left untouched

No Prefab edits and no PNG copies added under prefabs. No Boot, no `USE_*`, no protocol scripts. No BattlePage `Bg` change. Existing font files and `.meta` files are unchanged.
