# Batch B2b UI frames (hero / astrolabe / dragon)

ccbi-res atlas frames for astrolabe, dragon, and the hero-info / hero-soul set, imported as loose PNGs under `client/assets/resources/ui/`. Every new PNG has a Creator 3.8.8 sprite-frame `.meta`. Existing hero frames, including the B1b `hero-icon_*` set and the hero-palace map backgrounds, stay as they are. Prefabs are unchanged.

- Baseline: `65717d37` (B1 #176 + #177)
- Source: `idle/res/hd/ccbi-res` (old mxzg/mj)
- Tool: `extract_pvr_atlas.py --pad-source`
- Zips: `mxzg-mig-batch-b2b-p1`, `mxzg-mig-batch-b2b-p2`
- Frame counts and byte sizes match the B2b manifest. None of these PNGs were already in the repo.

| module | source stems | png frames | bytes |
| --- | ---: | ---: | ---: |
| `ui/astrolabe/` | 1 | 41 | 1906032 |
| `ui/astrolabe-lang/` | 1 | 6 | 64711 |
| `ui/dragon/` | 1 | 55 | 1674983 |
| `ui/dragon-lang/` | 1 | 15 | 102357 |
| `ui/dragon-relic/` | 1 | 45 | 624861 |
| `ui/hero/` | 11 | 1003 | 23856629 |
| total | 16 | 1165 | 28229573 |

`ui/astrolabe/`, `ui/astrolabe-lang/`, `ui/dragon/`, `ui/dragon-lang/`, and `ui/dragon-relic/` are new folders. Each has an `importer: directory` `.meta` (`ver` 1.2.0), same shape as `ui/hero.meta`. `ui/hero/` already existed.

## Sprite-frame meta

Same image meta shape as the atlas frames in `ui/battle/` and the B1 imports:

- `ver` `1.0.27`, `importer` `image`, `userData.type` `sprite-frame`
- Sub-assets: texture id `6c48a` (`ver` `1.0.22`), sprite-frame id `f9941` (`ver` `1.0.12`)
- `trimType` `auto`, `trimThreshold` `1` (alpha `0` and `1` sit outside the trim rect)
- Trim rect is top-left pixels. Offset and mesh vertices (`rawPosition`, `uv`, `nuv`) follow that rect; nuv Y is flipped from the texture top, matching Creator 3.8 `SpriteFrame._initVertices`
- Nine-slice borders are 0. No existing `.meta` was rewritten
- UUIDs are new. Top-level `.meta` uuids do not collide with any other meta in `client/`
- All 1165 frames are RGBA (`hasAlpha` true). Largest edge is `hero-info_win-bg-24.png` at 916 px (635×916)

## Source atlases

| stem | module | pixfmt | frames | bytes |
| --- | --- | --- | ---: | ---: |
| `astrolabe` | `ui/astrolabe/` | 0x10:16 | 41 | 1906032 |
| `astrolabe-lang` | `ui/astrolabe-lang/` | 0x10:16 | 6 | 64711 |
| `dragon` | `ui/dragon/` | 0x10:16 | 55 | 1674983 |
| `dragon-lang` | `ui/dragon-lang/` | 0x10:16 | 15 | 102357 |
| `dragon-relic` | `ui/dragon-relic/` | 0x10:16 | 45 | 624861 |
| `hero-hexagram-effect-1` | `ui/hero/` | 0x12:32 | 24 | 2591118 |
| `hero-hexagram-effect-2` | `ui/hero/` | 0x12:32 | 24 | 2585065 |
| `hero-hexagram-effect-3` | `ui/hero/` | 0x12:32 | 24 | 2572824 |
| `hero-hexagram-effect-4` | `ui/hero/` | 0x12:32 | 24 | 2575043 |
| `hero-hexagram-effect-5` | `ui/hero/` | 0x12:32 | 24 | 2575640 |
| `hero-hexagram-effect-6` | `ui/hero/` | 0x12:32 | 24 | 2608594 |
| `hero-icon` | `ui/hero/` | 0x12:32 | 1 | 1933 |
| `hero-info` | `ui/hero/` | 0x10:16 | 105 | 2018349 |
| `hero-info-lang` | `ui/hero/` | 0x10:16 | 20 | 128294 |
| `hero-soul` | `ui/hero/` | 0x10:16 | 9 | 575884 |
| `skill-icon` | `ui/hero/` | 0x12:32 | 724 | 5623885 |

`hero-icon` adds one frame, `hero-icon_spr-default.png`, next to the B1b `hero-icon_*` frames. Those older files are untouched.

## Shared filename prefixes

| module | on-disk prefix | frames | source stems |
| --- | --- | ---: | --- |
| `ui/hero/` | `hero-hexagram-effect_` | 144 | `hero-hexagram-effect-1` (24), `hero-hexagram-effect-2` (24), `hero-hexagram-effect-3` (24), `hero-hexagram-effect-4` (24), `hero-hexagram-effect-5` (24), `hero-hexagram-effect-6` (24) |

Every other stem above is a 1:1 filename prefix (`{stem}_{frame}.png`).

## RGBA4444 (legacy pixfmt 0x10)

B1 listed these atlases as RGB565 and skipped them, because `extract_pvr_atlas.py` only unpacked pixfmt `0x12`. The manifest header still calls that skipped set the original "RGB565" group. Legacy PVR pixfmt `0x10` is RGBA4444 (16bpp with alpha), not RGB565. This batch decodes those atlases with alpha.

The eight `0x10:16` stems are `astrolabe`, `astrolabe-lang`, `dragon`, `dragon-lang`, `dragon-relic`, `hero-info`, `hero-info-lang`, and `hero-soul` (296 frames, 7095471 bytes). The other eight stems are pixfmt `0x12:32` (RGBA8888): `hero-hexagram-effect-1` through `hero-hexagram-effect-6`, `hero-icon`, and `skill-icon` (869 frames).

## Siblings B2a–B2d

B2 is split into four batches. This PR is **B2b** only (hero-info / hero-soul / astrolabe / dragon, plus the hero stems in the same manifest). B2a, B2c, and B2d are separate and are not in this PR.

## Scope

PNG frames and sprite-frame metas for `ui/astrolabe/`, `ui/astrolabe-lang/`, `ui/dragon/`, `ui/dragon-lang/`, `ui/dragon-relic/`, and the new files under `ui/hero/` only. No Prefab edits and no PNG references added to prefabs. No Boot, no `USE_*`, no protocol scripts, no spine, no full skill import, no `mission-1`, no BattlePage `Bg`.
