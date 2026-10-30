# Batch C1 spine packs (camp101 hero skins)

71 Spine packs for camp 101 hero and skin stems (`101xxxxx`), each a single-page `{stem}.json` + `{stem}.atlas` + `{stem}.png` under `client/assets/resources/spine/`. Every new file has a Creator 3.8.8 `.meta`. Existing spine files and their metas are unchanged.

- Baseline: `99e1ab22` (Batch A/B merged)
- Source: `F:\源码\mj\program\client\cocos_mxzg\client\idle\res\hd\spine\` (flat)
- Zip: `mxzg-mig-batch-c1-p1` (7,275,064 bytes)
- Packs: **71**. Source bytes: **16,204,228**. Asset files added: **213** (71 × json/atlas/png). None of these paths already existed, so nothing was skipped or overwritten.
- Metas added: **213** (one `.atlas.meta`, `.json.meta`, and `.png.meta` per stem).

## Spine version

Every pack in this batch is Spine **3.7.94** (`skeleton.spine` in the json).

Creator **3.8.8** uses the spine-3.8 runtime. A 3.7.94 skeleton is not a guaranteed 3.8 load (curves, constraints, clipping). Preview each pack in Creator after import. This batch does not re-export or edit the json, atlas, or png bytes.

## Meta

Same shape as `client/assets/resources/spine/10101.*.meta`, with new uuid4 values:

- `{stem}.atlas.meta`: `ver` `1.0.0`, `importer` `*`, `files` `.atlas` + `.json`
- `{stem}.json.meta`: `ver` `1.2.7`, `importer` `spine-data`, `userData.atlasUuid` set to that stem's atlas uuid
- `{stem}.png.meta`: `ver` `1.0.27`, `importer` `image`, `userData.type` `texture`, `hasAlpha` true, subMeta id `6c48a` (`importer` `texture`, `name` `texture`), `displayName` = stem, `redirect` = `{pngUuid}@6c48a`

Each json meta's `atlasUuid` points at an atlas meta that exists. Top-level meta uuids do not repeat inside this batch or against metas already in `client/`. All 71 skeleton json files parse, and each atlas page name is `{stem}.png`.

## Stem list

Counts and byte sizes are the C1 manifest. Spine version is 3.7.94 on every row.

| stem | spine ver | bytes |
| --- | --- | ---: |
| 10101001 | 3.7.94 | 62,302 |
| 10102002 | 3.7.94 | 200,626 |
| 10103003 | 3.7.94 | 71,756 |
| 10104004 | 3.7.94 | 110,009 |
| 10104005 | 3.7.94 | 55,132 |
| 10104012 | 3.7.94 | 126,103 |
| 10104016 | 3.7.94 | 30,984 |
| 10104017 | 3.7.94 | 40,948 |
| 10104018 | 3.7.94 | 230,901 |
| 10104019 | 3.7.94 | 210,531 |
| 10105004 | 3.7.94 | 189,465 |
| 10105005 | 3.7.94 | 78,999 |
| 10105006 | 3.7.94 | 140,736 |
| 10105007 | 3.7.94 | 200,735 |
| 10105009 | 3.7.94 | 167,853 |
| 10105010 | 3.7.94 | 216,551 |
| 10105011 | 3.7.94 | 226,925 |
| 10105012 | 3.7.94 | 146,018 |
| 10105013 | 3.7.94 | 132,597 |
| 10105014 | 3.7.94 | 158,234 |
| 10105015 | 3.7.94 | 183,731 |
| 10105016 | 3.7.94 | 41,607 |
| 10105017 | 3.7.94 | 57,827 |
| 10105018 | 3.7.94 | 79,539 |
| 10105019 | 3.7.94 | 92,056 |
| 10105020 | 3.7.94 | 179,509 |
| 10105021 | 3.7.94 | 244,088 |
| 10105022 | 3.7.94 | 219,280 |
| 10105023 | 3.7.94 | 296,599 |
| 10106006 | 3.7.94 | 202,333 |
| 10106007 | 3.7.94 | 209,867 |
| 10106008 | 3.7.94 | 301,728 |
| 10106009 | 3.7.94 | 168,332 |
| 10106010 | 3.7.94 | 223,068 |
| 10106011 | 3.7.94 | 248,842 |
| 10106013 | 3.7.94 | 231,793 |
| 10106014 | 3.7.94 | 240,476 |
| 10106015 | 3.7.94 | 216,067 |
| 10106018 | 3.7.94 | 103,384 |
| 10106019 | 3.7.94 | 205,397 |
| 10106020 | 3.7.94 | 207,554 |
| 10106021 | 3.7.94 | 330,391 |
| 10106022 | 3.7.94 | 268,319 |
| 10106023 | 3.7.94 | 329,130 |
| 10110007 | 3.7.94 | 251,197 |
| 10110008 | 3.7.94 | 389,162 |
| 10110009 | 3.7.94 | 222,298 |
| 10110010 | 3.7.94 | 257,666 |
| 10110011 | 3.7.94 | 248,842 |
| 10110013 | 3.7.94 | 289,308 |
| 10110014 | 3.7.94 | 255,977 |
| 10110015 | 3.7.94 | 279,611 |
| 10110020 | 3.7.94 | 262,778 |
| 10110021 | 3.7.94 | 349,687 |
| 10110022 | 3.7.94 | 420,493 |
| 10110023 | 3.7.94 | 363,682 |
| 10111007 | 3.7.94 | 224,204 |
| 10111008 | 3.7.94 | 355,928 |
| 10111013 | 3.7.94 | 340,907 |
| 10111015 | 3.7.94 | 381,880 |
| 10111020 | 3.7.94 | 272,086 |
| 10111021 | 3.7.94 | 298,962 |
| 10111022 | 3.7.94 | 427,751 |
| 10112007 | 3.7.94 | 234,711 |
| 10112008 | 3.7.94 | 381,203 |
| 10112013 | 3.7.94 | 330,428 |
| 10112015 | 3.7.94 | 330,865 |
| 10112020 | 3.7.94 | 283,103 |
| 10112021 | 3.7.94 | 441,899 |
| 10112022 | 3.7.94 | 385,802 |
| 10120007 | 3.7.94 | 245,476 |

## Siblings C1–C6

Spine migration is split into six sibling batches, C1–C6. This PR is **C1** only (camp 101 hero/skin 8-digit stems). C2, C3, C4, C5, and C6 are separate and are not in this PR.

## Scope

New spine json/atlas/png files, their new metas, and this doc. No Prefab edits, no Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg`. No UI, skill, font, or audio from other batches. Existing spine assets and metas are untouched, and the imported json, atlas, and png bytes are the zip contents unchanged.
