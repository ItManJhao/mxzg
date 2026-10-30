# Batch B2c UI frames (countrywar / crusade-group)

ccbi-res atlas PNG frames for country war and crusade-group maps and effects, imported as loose PNGs under `client/assets/resources/ui/`. Every new PNG has a Creator 3.8.8 sprite-frame `.meta`. Prefabs are not rewired.

## Baseline

- Repo tip: `65717d37` (B1 #176 + #177)
- Source: ccbi-res atlas frames (same pipeline as B1)
- Tool: `extract_pvr_atlas.py --pad-source`
- Manifest: Batch B2c (`mxzg-mig-batch-b2c`). This PR is only the modules below.
- Zip: `mxzg-mig-batch-b2c-p1` (23387541 bytes), unpacked at `client/assets/resources/ui/<module>/`
- None of the 4409 PNGs were already in the repo

Sibling batches B2a, B2b, and B2d are separate PRs. They are not in this one.

## What landed

Manifest header: **4409** new frames, skipped **0** on every stem. Pixfmt is `0x12:32` (RGBA) for every stem. On-disk file counts and byte sizes match the manifest, including the three shared filename prefixes below.

| module | stems | png frames | bytes |
| --- | ---: | ---: | ---: |
| `ui/countrywar/` | 1 | 87 | 1247193 |
| `ui/countrywar-city-map/` | 4 | 1196 | 4532202 |
| `ui/countrywar-effect/` | 1 | 8 | 400461 |
| `ui/countrywar-effect-battle/` | 1 | 31 | 1042157 |
| `ui/countrywar-effect-flag-task/` | 1 | 30 | 449756 |
| `ui/countrywar-lang/` | 1 | 6 | 59893 |
| `ui/countrywar-map/` | 9 | 2800 | 7060573 |
| `ui/countrywar-map-architecture/` | 1 | 8 | 497569 |
| `ui/crusade-group/` | 2 | 149 | 4515878 |
| `ui/crusade-group-2/` | 1 | 11 | 214853 |
| `ui/crusade-group-effect/` | 1 | 21 | 390294 |
| `ui/crusade-group-map/` | 1 | 17 | 113771 |
| `ui/crusade-group-map-effect-1/` | 1 | 15 | 604003 |
| `ui/crusade-group-map-effect-2/` | 1 | 15 | 419844 |
| `ui/crusade-group-map-effect-3/` | 1 | 15 | 761329 |
| **B2c** | **27** | **4409** | **22309776** |

All 15 folders are new. Each has an `importer: directory` `.meta` (`ver` 1.2.0), same shape as `ui/city.meta`.

Every frame is RGBA. Largest edge is `crusade-group_spr-light.png` at 643×425.

### Stem counts

Counts are the manifest `new` column. On-disk count is files whose name starts with `{stem}_`. Three atlas groups share one prefix; they are called out under the table and again under Shared filename prefixes.

| stem | module | manifest new | bytes | on disk |
| --- | --- | ---: | ---: | ---: |
| `countrywar` | `ui/countrywar/` | 87 | 1247193 | 87 |
| `countrywar-city-map-1` | `ui/countrywar-city-map/` | 324 | 1087892 | — |
| `countrywar-city-map-2` | `ui/countrywar-city-map/` | 324 | 1270145 | — |
| `countrywar-city-map-3` | `ui/countrywar-city-map/` | 324 | 1276059 | — |
| `countrywar-city-map-4` | `ui/countrywar-city-map/` | 224 | 898106 | — |
| countrywar-city-map-1..4 | `ui/countrywar-city-map/` | 1196 | 4532202 | 1196 (`countrywar-city-map_*`) |
| `countrywar-effect` | `ui/countrywar-effect/` | 8 | 400461 | 8 |
| `countrywar-effect-battle` | `ui/countrywar-effect-battle/` | 31 | 1042157 | 31 |
| `countrywar-effect-flag-task` | `ui/countrywar-effect-flag-task/` | 30 | 449756 | 30 |
| `countrywar-lang` | `ui/countrywar-lang/` | 6 | 59893 | 6 |
| `countrywar-map-1` | `ui/countrywar-map/` | 324 | 634106 | — |
| `countrywar-map-2` | `ui/countrywar-map/` | 324 | 739496 | — |
| `countrywar-map-3` | `ui/countrywar-map/` | 324 | 840823 | — |
| `countrywar-map-4` | `ui/countrywar-map/` | 324 | 907262 | — |
| `countrywar-map-5` | `ui/countrywar-map/` | 324 | 875480 | — |
| `countrywar-map-6` | `ui/countrywar-map/` | 324 | 894112 | — |
| `countrywar-map-7` | `ui/countrywar-map/` | 324 | 897900 | — |
| `countrywar-map-8` | `ui/countrywar-map/` | 324 | 821902 | — |
| `countrywar-map-9` | `ui/countrywar-map/` | 208 | 449492 | — |
| countrywar-map-1..9 | `ui/countrywar-map/` | 2800 | 7060573 | 2800 (`countrywar-map_*`) |
| `countrywar-map-architecture` | `ui/countrywar-map-architecture/` | 8 | 497569 | 8 |
| `crusade-group` | `ui/crusade-group/` | 133 | 2299981 | — |
| `crusade-group-3` | `ui/crusade-group/` | 16 | 2215897 | — |
| crusade-group + crusade-group-3 | `ui/crusade-group/` | 149 | 4515878 | 149 (`crusade-group_*`) |
| `crusade-group-2` | `ui/crusade-group-2/` | 11 | 214853 | 11 |
| `crusade-group-effect` | `ui/crusade-group-effect/` | 21 | 390294 | 21 |
| `crusade-group-map` | `ui/crusade-group-map/` | 17 | 113771 | 17 |
| `crusade-group-map-effect-1` | `ui/crusade-group-map-effect-1/` | 15 | 604003 | 15 |
| `crusade-group-map-effect-2` | `ui/crusade-group-map-effect-2/` | 15 | 419844 | 15 |
| `crusade-group-map-effect-3` | `ui/crusade-group-map-effect-3/` | 15 | 761329 | 15 |

The manifest `skipped` column is 0 for every stem. There is no RGB565 (`0x10`) atlas in this batch.

## Shared filename prefixes

These source atlases extract into one folder under a single `{prefix}_` name. The atlas index is not in the filename, so the per-stem split is only in the manifest. Frame counts and bytes are the sums of those stems.

| module | on-disk prefix | frames | bytes | source stems |
| --- | --- | ---: | ---: | --- |
| `ui/countrywar-city-map/` | `countrywar-city-map_` | 1196 | 4532202 | `countrywar-city-map-1` (324), `countrywar-city-map-2` (324), `countrywar-city-map-3` (324), `countrywar-city-map-4` (224) |
| `ui/countrywar-map/` | `countrywar-map_` | 2800 | 7060573 | `countrywar-map-1` through `countrywar-map-8` (324 each), `countrywar-map-9` (208) |
| `ui/crusade-group/` | `crusade-group_` | 149 | 4515878 | `crusade-group` (133), `crusade-group-3` (16) |

Names:

- `countrywar-city-map_countrywar_map_city_1.png` through `countrywar-city-map_countrywar_map_city_1196.png` (no gaps)
- `countrywar-map_countrywar_map_1.png` through `countrywar-map_countrywar_map_2800.png` (no gaps)
- `crusade-group_{frame}.png` for both `crusade-group` and `crusade-group-3`

Every other stem in the table above is a 1:1 filename prefix (`{stem}_{frame}.png`), and its file count and byte size match the manifest.

## Sprite-frame meta

Each new PNG has `*.png.meta` in the same shape as existing `client/assets/resources/ui/` sprite frames (Creator 3.8.8):

- Image importer `ver` 1.0.27, `userData.type` `sprite-frame`
- Texture sub-meta `6c48a` (`ver` 1.0.22)
- Sprite-frame sub-meta `f9941` (`ver` 1.0.12)
- `trimType` `auto`, `trimThreshold` 1 (pixels with alpha below 1 are outside the trim rect)
- Quad vertices follow the same trim rect as the B1 frames: offset from the raw center, pixel UVs in top-left space, normalized UVs over the raw size
- Nine-slice borders are 0. No existing `.meta` was rewritten
- UUIDs are new

## Sibling batches

B2 ccbi-res UI frames are split into B2a, B2b, B2c, and B2d. This PR is B2c only: the `countrywar*` and `crusade-group*` modules listed above. B2a, B2b, and B2d land separately.

## Left untouched

No Prefab edits and no PNG references added to prefabs. No Boot, no `USE_*`, no protocol scripts, no spine, no full skill, no `mission-1`, no BattlePage `Bg`.
