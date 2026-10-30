# Batch C2 spine (camp102-hero-skins)

Camp 102 hero and skin Spine packs, copied as-is into `client/assets/resources/spine/`. Each pack is `{stem}.json` + `{stem}.atlas` + `{stem}.png`, plus Creator 3.8.8 `.meta` files. Prefabs are unchanged.

- Baseline: `99e1ab22` (Batch A/B already on main; B2b #181)
- Source: `idle/res/hd/spine/` (old mxzg/mj, flat directory; bytes copied, not converted or re-exported)
- Zip: `mxzg-mig-batch-c2-p1` (8,564,108 bytes compressed)
- Packs: **68**. Asset files: **204**. Uncompressed source bytes: **17,186,724**
- Counts and byte sizes match the C2 manifest. None of these stems were already in the repo (no overwrites)

| stem | spine ver | bytes |
| --- | --- | ---: |
| `10201001` | 3.7.94 | 59114 |
| `10202002` | 3.7.94 | 37784 |
| `10203001` | 3.5.35 | 239353 |
| `10203003` | 3.7.94 | 190867 |
| `10204001` | 3.5.35 | 282476 |
| `10204004` | 3.7.94 | 149845 |
| `10204005` | 3.7.94 | 88120 |
| `10204012` | 3.7.94 | 104463 |
| `10204013` | 3.7.94 | 176472 |
| `10204016` | 3.7.94 | 33385 |
| `10204017` | 3.7.94 | 23855 |
| `10204018` | 3.7.94 | 234260 |
| `10204019` | 3.7.94 | 421135 |
| `10205005` | 3.7.94 | 79073 |
| `10205006` | 3.7.94 | 67380 |
| `10205007` | 3.7.94 | 178966 |
| `10205008` | 3.7.94 | 153155 |
| `10205009` | 3.7.94 | 173213 |
| `10205010` | 3.7.94 | 101683 |
| `10205011` | 3.7.94 | 219670 |
| `10205012` | 3.7.94 | 123636 |
| `10205013` | 3.7.94 | 185894 |
| `10205014` | 3.7.94 | 248833 |
| `10205015` | 3.7.94 | 141926 |
| `10205016` | 3.7.94 | 57477 |
| `10205017` | 3.7.94 | 29958 |
| `10205018` | 3.7.94 | 115782 |
| `10205019` | 3.7.94 | 209719 |
| `10205020` | 3.7.94 | 146959 |
| `10205021` | 3.7.94 | 244660 |
| `10205022` | 3.7.94 | 232889 |
| `10205023` | 3.7.94 | 905900 |
| `10206006` | 3.7.94 | 79881 |
| `10206007` | 3.7.94 | 215703 |
| `10206008` | 3.7.94 | 181912 |
| `10206009` | 3.7.94 | 185684 |
| `10206010` | 3.7.94 | 126295 |
| `10206011` | 3.7.94 | 268502 |
| `10206013` | 3.7.94 | 169838 |
| `10206014` | 3.7.94 | 311378 |
| `10206015` | 3.7.94 | 174314 |
| `10206018` | 3.7.94 | 146235 |
| `10206019` | 3.7.94 | 209721 |
| `10206020` | 3.7.94 | 205806 |
| `10206021` | 3.7.94 | 277181 |
| `10206022` | 3.7.94 | 278920 |
| `10206023` | 3.7.94 | 1033955 |
| `10210007` | 3.7.94 | 215236 |
| `10210008` | 3.7.94 | 239080 |
| `10210009` | 3.7.94 | 245034 |
| `10210010` | 3.7.94 | 150161 |
| `10210011` | 3.7.94 | 275504 |
| `10210014` | 3.7.94 | 380626 |
| `10210015` | 3.7.94 | 219090 |
| `10210020` | 3.7.94 | 214349 |
| `10210021` | 3.7.94 | 327025 |
| `10210022` | 3.7.94 | 432836 |
| `10210023` | 3.7.94 | 1378007 |
| `10211009` | 3.7.94 | 251385 |
| `10211011` | 3.7.94 | 359841 |
| `10211020` | 3.7.94 | 369899 |
| `10211021` | 3.7.94 | 396398 |
| `10211022` | 3.7.94 | 398865 |
| `10212009` | 3.7.94 | 251407 |
| `10212011` | 3.7.94 | 347004 |
| `10212020` | 3.7.94 | 377208 |
| `10212021` | 3.7.94 | 405499 |
| `10212022` | 3.7.94 | 429043 |
| total | 68 packs | 17186724 |

## Creator meta

Same spine meta shape as `client/assets/resources/spine/10101.*.meta`. New uuid4 values. No existing spine file or `.meta` was rewritten.

- `{stem}.atlas.meta`: `ver` `1.0.0`, `importer` `*`, `files` `.atlas` + `.json`
- `{stem}.json.meta`: `ver` `1.2.7`, `importer` `spine-data`, `userData.atlasUuid` = that pack's atlas uuid
- `{stem}.png.meta`: `ver` `1.0.27`, `importer` `image`, `userData.type` `texture` (not a sprite-frame). Texture sub-asset id `6c48a` (`ver` `1.0.22`), uuid `{pngUuid}@6c48a`, `displayName` = stem, `redirect` to that sub-uuid, `hasAlpha` true

Checked: every new `json.meta` `atlasUuid` points at the sibling `atlas.meta`; identity uuids (meta uuid and texture sub-uuid) do not collide with any other `.meta` in the repo; every pack JSON parses; each atlas page name is `{stem}.png`; PNG signatures match; on-disk bytes match the zip.

## Spine version / Creator compatibility

- **66** packs are Spine **3.7.94** (`skeleton.spine` in the json).
- **10203001** and **10204001** are Spine **3.5.35**. They are copied as-is. The Creator 3.8 runtime may not load them. Pending preview / re-export. Do not treat them as 3.7 packs.
- This project is Cocos Creator **3.8.8** with the built-in spine-3.8 runtime. 3.7.94 → 3.8 can fail on curves, constraints, or clipping. Preview these packs in Creator before wiring them up. This change does not re-export the skeleton data.

## Siblings C1–C6

Spine camp/hero migration is split into batches **C1–C6**. This PR is **C2** only (camp102 hero/skins, stems `102xxxxx` in the table above). C1, C3, C4, C5, and C6 are separate and are not in this PR.

## Scope

`client/assets/resources/spine/` files for the 68 stems above, their new `.meta` files, and this doc. No Prefab edits, no Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg`. No ui / skill / font / audio from other batches. Existing spine assets and their metas stay as they are. json, atlas, and png bytes are unchanged.
