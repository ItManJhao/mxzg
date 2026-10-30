# Batch C3 spine (camp103 hero skins)

62 camp-103 hero Spine packs under `client/assets/resources/spine/`. Each pack is `{stem}.json`, `{stem}.atlas`, and `{stem}.png`, plus a Creator 3.8.8 `.meta`. Bytes below are the unpacked source sizes from the C3 manifest (json + atlas + png). They match the files in this PR.

- Baseline: `99e1ab22` (Batch A/B merged)
- Source: `idle/res/hd/spine` (old mxzg/mj, flat directory)
- Zip: `mxzg-mig-batch-c3-p1.zip` (6,438,656 bytes)
- Packs: **62**. Asset files: **186**. Source bytes: **13,603,326**. None of these paths existed on main.

| stem | spine | bytes |
| --- | --- | ---: |
| 10301001 | 3.7.94 | 72503 |
| 10302002 | 3.7.94 | 113337 |
| 10303003 | 3.7.94 | 55143 |
| 10304004 | 3.7.94 | 108566 |
| 10304005 | 3.7.94 | 74571 |
| 10304012 | 3.7.94 | 98651 |
| 10304016 | 3.7.94 | 39388 |
| 10304017 | 3.7.94 | 28503 |
| 10304018 | 3.7.94 | 265591 |
| 10304019 | 3.7.94 | 224653 |
| 10305005 | 3.7.94 | 105197 |
| 10305006 | 3.7.94 | 141873 |
| 10305007 | 3.7.94 | 300155 |
| 10305008 | 3.7.94 | 218273 |
| 10305009 | 3.7.94 | 201434 |
| 10305010 | 3.7.94 | 261024 |
| 10305011 | 3.7.94 | 173637 |
| 10305012 | 3.7.94 | 170298 |
| 10305013 | 3.7.94 | 164356 |
| 10305014 | 3.7.94 | 209121 |
| 10305015 | 3.7.94 | 204155 |
| 10305016 | 3.7.94 | 67862 |
| 10305017 | 3.7.94 | 47338 |
| 10305018 | 3.7.94 | 106770 |
| 10305019 | 3.7.94 | 64770 |
| 10305020 | 3.7.94 | 154398 |
| 10305021 | 3.7.94 | 187563 |
| 10305022 | 3.7.94 | 199151 |
| 10305023 | 3.7.94 | 176920 |
| 10306006 | 3.7.94 | 164675 |
| 10306007 | 3.7.94 | 311097 |
| 10306008 | 3.7.94 | 264148 |
| 10306009 | 3.7.94 | 246187 |
| 10306010 | 3.7.94 | 343078 |
| 10306011 | 3.7.94 | 192188 |
| 10306013 | 3.7.94 | 209187 |
| 10306014 | 3.7.94 | 213587 |
| 10306015 | 3.7.94 | 250446 |
| 10306018 | 3.7.94 | 131620 |
| 10306019 | 3.7.94 | 81661 |
| 10306020 | 3.7.94 | 214003 |
| 10306021 | 3.7.94 | 275553 |
| 10306022 | 3.7.94 | 232213 |
| 10306023 | 3.7.94 | 246134 |
| 10310007 | 3.7.94 | 382937 |
| 10310008 | 3.7.94 | 336626 |
| 10310009 | 3.7.94 | 381365 |
| 10310010 | 3.7.94 | 411042 |
| 10310011 | 3.7.94 | 192189 |
| 10310013 | 3.7.94 | 209187 |
| 10310014 | 3.7.94 | 259583 |
| 10310015 | 3.7.94 | 369058 |
| 10310020 | 3.7.94 | 273419 |
| 10310021 | 3.7.94 | 280325 |
| 10310022 | 3.7.94 | 320595 |
| 10310023 | 3.7.94 | 297555 |
| 10311008 | 3.7.94 | 382422 |
| 10311010 | 3.7.94 | 377589 |
| 10311015 | 3.7.94 | 367901 |
| 10312008 | 3.7.94 | 407995 |
| 10312010 | 3.7.94 | 410587 |
| 10312015 | 3.7.94 | 331973 |
| total |  | 13603326 |

## Spine version

Every json has `skeleton.spine` **3.7.94**. The project is Cocos Creator **3.8.8** with the spine-3.8 runtime. 3.7.94 → 3.8 can fail on curves, constraints, or clipping, so these packs need a preview in Creator before they are treated as playable. This import does not convert or re-export the json, atlas, or png.

Each atlas is a single page named `{stem}.png` (`format: RGBA8888`). All 62 skeletons parse as JSON. Clips are the hero set: every pack has `attack`, `hit`, and `stand`; 60 also have `run`; 48 have `attack2`; 22 have `attack3`.

## Creator metas

New `.meta` files follow `client/assets/resources/spine/10101.*.meta`. UUIDs are new uuid4 values. No uuid collides with another file under `client/`, including metas already on main.

- `{stem}.atlas.meta`: importer `*`, `ver` `1.0.0`, `files` `.atlas` + `.json`
- `{stem}.json.meta`: importer `spine-data`, `ver` `1.2.7`, `userData.atlasUuid` set to that pack’s atlas uuid
- `{stem}.png.meta`: importer `image`, `ver` `1.0.27`, `userData.type` `texture`, `hasAlpha` true, texture sub-meta id `6c48a`, `displayName` = stem, `redirect` = `{pngUuid}@6c48a`

`resources/spine.meta` and every spine file that was already on main are unchanged.

## Siblings C1–C6

Batch C is six sibling imports, C1 through C6. This PR is **C3** only (camp 103 hero skins, stems `103xxxxx`). C1, C2, C4, C5, and C6 are separate and are not in this PR.

## Scope

Spine packs and their new metas only. No Prefab edits, no Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg`. No json, atlas, or png bytes were rewritten. UI, skill, font, and audio batches are not included.
