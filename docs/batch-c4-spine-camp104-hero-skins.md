# Batch C4 spine (camp104 hero skins)

68 Spine packs for camp 104 hero skins, imported under `client/assets/resources/spine/`. Each pack is `{stem}.json` + `{stem}.atlas` + `{stem}.png`, with a Creator 3.8.8 `.meta` beside each file. Existing spine files and their metas stay as they are. Prefabs are unchanged.

- Baseline: `99e1ab22` (Batch A/B merged)
- Source: `idle/res/hd/spine` (flat; old mxzg/mj), camp 104 (`104xxxxx`)
- Zip: `mxzg-mig-batch-c4-p1` (15,527,769 bytes)
- Packs: **68**; asset files: **204**; source bytes: **27,994,206**
- Single page per atlas. The page name is `{stem}.png` and that file is in the pack
- None of these 204 files were already in the repo, so nothing was overwritten

## Spine version

Every json in this batch has `skeleton.spine` **3.7.94**.

This project is Cocos Creator **3.8.8** with the built-in spine-3.8 runtime. A 3.7.94 skeleton can fail to import or play on that runtime (curves, constraints, clipping). Preview each pack in Creator before treating it as playable. This change copies the bytes as-is and does not re-export or convert json, atlas, or png.

## Hero groups

Stems are `104` + hero id + skin suffix. Counts and bytes are the manifest totals.

| hero id | packs | bytes |
| --- | ---: | ---: |
| 10403 | 1 | 110,419 |
| 10404 | 5 | 435,149 |
| 10405 | 17 | 6,038,190 |
| 10406 | 16 | 7,493,005 |
| 10410 | 15 | 8,595,939 |
| 10411 | 7 | 2,616,968 |
| 10412 | 7 | 2,704,536 |
| total | 68 | 27,994,206 |

## Stems

| stem | spine ver | bytes |
| --- | --- | ---: |
| 10403001 | 3.7.94 | 110,419 |
| 10404002 | 3.7.94 | 104,589 |
| 10404003 | 3.7.94 | 212,033 |
| 10404011 | 3.7.94 | 38,487 |
| 10404012 | 3.7.94 | 36,339 |
| 10404013 | 3.7.94 | 43,701 |
| 10405003 | 3.7.94 | 316,460 |
| 10405004 | 3.7.94 | 349,410 |
| 10405008 | 3.7.94 | 198,570 |
| 10405009 | 3.7.94 | 295,501 |
| 10405010 | 3.7.94 | 215,310 |
| 10405011 | 3.7.94 | 45,896 |
| 10405012 | 3.7.94 | 59,768 |
| 10405013 | 3.7.94 | 54,435 |
| 10405014 | 3.7.94 | 339,546 |
| 10405015 | 3.7.94 | 388,182 |
| 10405016 | 3.7.94 | 171,965 |
| 10405017 | 3.7.94 | 211,439 |
| 10405018 | 3.7.94 | 290,097 |
| 10405019 | 3.7.94 | 779,822 |
| 10405020 | 3.7.94 | 559,923 |
| 10405021 | 3.7.94 | 834,129 |
| 10405022 | 3.7.94 | 927,737 |
| 10406004 | 3.7.94 | 415,481 |
| 10406005 | 3.7.94 | 242,452 |
| 10406006 | 3.7.94 | 332,331 |
| 10406007 | 3.7.94 | 239,050 |
| 10406008 | 3.7.94 | 214,732 |
| 10406009 | 3.7.94 | 330,735 |
| 10406010 | 3.7.94 | 269,401 |
| 10406014 | 3.7.94 | 400,946 |
| 10406015 | 3.7.94 | 454,299 |
| 10406016 | 3.7.94 | 229,477 |
| 10406017 | 3.7.94 | 271,540 |
| 10406018 | 3.7.94 | 304,766 |
| 10406019 | 3.7.94 | 909,002 |
| 10406020 | 3.7.94 | 726,435 |
| 10406021 | 3.7.94 | 1,022,945 |
| 10406022 | 3.7.94 | 1,129,413 |
| 10410004 | 3.7.94 | 695,530 |
| 10410005 | 3.7.94 | 318,771 |
| 10410006 | 3.7.94 | 447,612 |
| 10410007 | 3.7.94 | 296,053 |
| 10410009 | 3.7.94 | 336,443 |
| 10410010 | 3.7.94 | 317,361 |
| 10410014 | 3.7.94 | 461,495 |
| 10410015 | 3.7.94 | 519,613 |
| 10410016 | 3.7.94 | 258,794 |
| 10410017 | 3.7.94 | 336,101 |
| 10410018 | 3.7.94 | 333,184 |
| 10410019 | 3.7.94 | 987,169 |
| 10410020 | 3.7.94 | 830,373 |
| 10410021 | 3.7.94 | 1,166,565 |
| 10410022 | 3.7.94 | 1,290,875 |
| 10411004 | 3.7.94 | 267,491 |
| 10411005 | 3.7.94 | 342,078 |
| 10411006 | 3.7.94 | 507,983 |
| 10411007 | 3.7.94 | 373,061 |
| 10411009 | 3.7.94 | 382,683 |
| 10411014 | 3.7.94 | 458,087 |
| 10411016 | 3.7.94 | 285,585 |
| 10412004 | 3.7.94 | 317,384 |
| 10412005 | 3.7.94 | 323,895 |
| 10412006 | 3.7.94 | 489,138 |
| 10412007 | 3.7.94 | 360,909 |
| 10412009 | 3.7.94 | 400,783 |
| 10412014 | 3.7.94 | 522,305 |
| 10412016 | 3.7.94 | 290,122 |

## Creator metas

Same shape as `client/assets/resources/spine/10101.*.meta`. UUIDs are new uuid4 values.

- `{stem}.atlas.meta`: `ver` `1.0.0`, `importer` `*`, `files` `.atlas` and `.json`
- `{stem}.json.meta`: `ver` `1.2.7`, `importer` `spine-data`, `userData.atlasUuid` set to that stem's atlas uuid
- `{stem}.png.meta`: `ver` `1.0.27`, `importer` `image`, `userData.type` `texture`, `hasAlpha` true, `redirect` `P@6c48a`. Sub-asset id `6c48a` is `importer` `texture` (`ver` `1.0.22`), `displayName` is the stem, uuid `P@6c48a`

Checked after import: each `atlasUuid` points at that stem's `.atlas.meta`; no uuid (including `P@6c48a`) collides with another meta in the repo; all 68 json files parse; every spine version is 3.7.94; on-disk bytes match the manifest and the zip CRCs.

## Siblings C1–C6

Camp spine imports are split into sibling batches **C1–C6**. This PR is **C4** only (camp 104 hero skins). C1, C2, C3, C5, and C6 are separate and are not in this PR. No ui, skill, font, or audio from other batches.

## Scope

New files under `client/assets/resources/spine/` (`10403001` through `10412016`) and this doc. No Prefab edits, no Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg`. Existing spine files and metas are untouched.
