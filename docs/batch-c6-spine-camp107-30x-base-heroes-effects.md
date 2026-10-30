# Batch C6 spine (camp107-30x-base-heroes-effects)

89 old Spine packs (`json` + `atlas` + `png`) plus 13 atlas-less PNGs, imported under `client/assets/resources/spine/`. Each new file has a Creator 3.8.8 `.meta`. Bytes were copied as-is. Nothing was re-exported or rewritten.

- Baseline: main `99e1ab22` (Batch A/B already merged)
- Source: `F:\源码\mj\program\client\cocos_mxzg\client\idle\res\hd\spine\` (flat)
- Zip: `mxzg-mig-batch-c6-p1.zip` (24771317 bytes), unpacked at the repo root. Members were already rooted at `client/assets/resources/spine/`
- Manifest: 89 packs, source bytes 34044842. On-disk `json`+`atlas`+`png` size matches that column for every stem
- None of the 280 zip members existed on the baseline. No existing spine file or `.meta` was overwritten

| | packs | asset files | bytes |
| --- | ---: | ---: | ---: |
| Complete packs (`json`+`atlas`+`png`) | 89 | 267 | 34044842 |
| Orphan PNGs (`spine/_unreferenced/`) | — | 13 | 1437168 |
| **C6** | **89** | **280** | **35482010** |

Groups inside the 89, using the manifest's own split (107xxxxx, 30xxxxxx monsters/bosses, 5-digit base heroes, named effect/UI clips). `10201001-1` is the one stem that is not 5-digit, not `107…`, and not `30…`; it stays in the named remainder so the four groups sum to 89.

| group | packs |
| --- | ---: |
| 5-digit base heroes | 12 |
| camp `107xxxxx` | 6 |
| monster/boss `30xxxxxx` | 31 |
| named effects / UI (includes `10201001-1`) | 40 |
| **packs** | **89** |

## Stems

Manifest order. Byte column is `json` + `atlas` + `png` on disk, and it matches the manifest for every stem. Spine version is 3.7.94 on every row.

| stem | spine ver | bytes |
| --- | --- | ---: |
| `10102` | 3.7.94 | 224571 |
| `10103` | 3.7.94 | 267691 |
| `10201001-1` | 3.7.94 | 90176 |
| `10202` | 3.7.94 | 200917 |
| `10203` | 3.7.94 | 278206 |
| `10302` | 3.7.94 | 226566 |
| `10303` | 3.7.94 | 285855 |
| `10402` | 3.7.94 | 177374 |
| `10403` | 3.7.94 | 238715 |
| `10502` | 3.7.94 | 194770 |
| `10503` | 3.7.94 | 212848 |
| `10601` | 3.7.94 | 295113 |
| `10701001` | 3.7.94 | 315062 |
| `10701002` | 3.7.94 | 421726 |
| `10701003` | 3.7.94 | 248976 |
| `10701004` | 3.7.94 | 157918 |
| `10701005` | 3.7.94 | 449614 |
| `10701006` | 3.7.94 | 213314 |
| `10801` | 3.7.94 | 218366 |
| `30101001` | 3.7.94 | 437911 |
| `30101002` | 3.7.94 | 1493043 |
| `30201211` | 3.7.94 | 336582 |
| `30205001` | 3.7.94 | 391901 |
| `30205111` | 3.7.94 | 1007947 |
| `30205201` | 3.7.94 | 1341498 |
| `30205221` | 3.7.94 | 406361 |
| `30305001` | 3.7.94 | 516645 |
| `30305151` | 3.7.94 | 308838 |
| `30305152` | 3.7.94 | 461460 |
| `30405051` | 3.7.94 | 355225 |
| `30405061` | 3.7.94 | 406361 |
| `30405071` | 3.7.94 | 418277 |
| `30405141` | 3.7.94 | 443051 |
| `30405151` | 3.7.94 | 632108 |
| `30405161` | 3.7.94 | 766210 |
| `30405171` | 3.7.94 | 975500 |
| `30405181` | 3.7.94 | 1484156 |
| `30501001` | 3.7.94 | 455777 |
| `30501002` | 3.7.94 | 482201 |
| `30505041` | 3.7.94 | 479405 |
| `30505101` | 3.7.94 | 491689 |
| `30505102` | 3.7.94 | 1034227 |
| `30505141` | 3.7.94 | 413827 |
| `30505142` | 3.7.94 | 2720329 |
| `30505151` | 3.7.94 | 628892 |
| `30505161` | 3.7.94 | 821557 |
| `30505171` | 3.7.94 | 581877 |
| `30505181` | 3.7.94 | 602711 |
| `30505201` | 3.7.94 | 1312115 |
| `30505231` | 3.7.94 | 965799 |
| `chaojidajiang` | 3.7.94 | 577260 |
| `chibang` | 3.7.94 | 160498 |
| `chuan` | 3.7.94 | 241443 |
| `chuanghu` | 3.7.94 | 4496 |
| `crtq_touzi` | 3.7.94 | 123640 |
| `djjs` | 3.7.94 | 6129 |
| `g` | 3.7.94 | 9608 |
| `heishi` | 3.7.94 | 310266 |
| `hudie` | 3.7.94 | 18755 |
| `jiemian` | 3.7.94 | 1431710 |
| `jindutiao` | 3.7.94 | 2879 |
| `jldj` | 3.7.94 | 74568 |
| `liushui` | 3.7.94 | 23674 |
| `mofang` | 3.7.94 | 94290 |
| `new` | 3.7.94 | 261491 |
| `penquan` | 3.7.94 | 126111 |
| `qyjs` | 3.7.94 | 15304 |
| `res-block` | 3.7.94 | 248543 |
| `shangcheng` | 3.7.94 | 1011009 |
| `sqbx` | 3.7.94 | 23628 |
| `t1` | 3.7.94 | 10082 |
| `t2` | 3.7.94 | 15027 |
| `t3` | 3.7.94 | 13407 |
| `t4` | 3.7.94 | 9242 |
| `t5` | 3.7.94 | 7258 |
| `tiejiangguang` | 3.7.94 | 33889 |
| `windmill` | 3.7.94 | 9811 |
| `x_1` | 3.7.94 | 212357 |
| `x_2` | 3.7.94 | 187679 |
| `x_3` | 3.7.94 | 149014 |
| `x_4` | 3.7.94 | 161153 |
| `x_5` | 3.7.94 | 170150 |
| `x_6` | 3.7.94 | 205615 |
| `yingxiongtiao` | 3.7.94 | 25388 |
| `yjyx` | 3.7.94 | 8954 |
| `yxsc` | 3.7.94 | 26395 |
| `zhaohuanlibao` | 3.7.94 | 9837 |
| `znz` | 3.7.94 | 24772 |
| `zuanshi02` | 3.7.94 | 108252 |
| **89** | **3.7.94** | **34044842** |

## Spine version

Every pack's skeleton JSON has `"spine": "3.7.94"` (89/89). This project is Cocos Creator **3.8.8** with the built-in **spine-3.8** runtime. 3.7.94 data is not the 3.8 line Creator ships, so curves, constraints, and clipping can fail import or playback. Preview these packs in Creator after merge. This change does not convert the JSON, atlas, or PNG. If a pack will not play, fix it with an official 3.7→3.8 export or a spine-3.7 runtime plugin, not by editing these files in git.

## Creator meta

New UUIDs are uuid4. Shapes follow `client/assets/resources/spine/10101.*.meta`. `spine.meta` and every pre-existing spine `.meta` are unchanged.

- `{stem}.atlas.meta`: `ver` `1.0.0`, `importer` `*`, `files` `[".atlas", ".json"]`
- `{stem}.json.meta`: `ver` `1.2.7`, `importer` `spine-data`, `userData.atlasUuid` = that stem's atlas uuid
- `{stem}.png.meta`: `ver` `1.0.27`, `importer` `image`, `userData.type` `texture`, `hasAlpha` true, `redirect` `P@6c48a`. Sub-meta id `6c48a` is `texture` (`ver` `1.0.22`), uuid `P@6c48a`, `displayName` = stem. Not a sprite-frame

`spine/_unreferenced/` is a new folder. `spine/_unreferenced.meta` is `importer: directory`, `ver` `1.2.0`, same shape as `spine/dwvs.meta`.

Checked:

- Each `json.meta` `atlasUuid` is the uuid of the sibling `atlas.meta`, and that file exists
- Own uuids (top-level and sub-meta) do not repeat inside this batch or against any other `.meta` in the repo
- All 89 skeleton JSON files parse. All 89 atlas page names are `{stem}.png`

## Orphan PNGs

These 13 PNGs have no atlas or JSON reference. They are kept 1:1 under `client/assets/resources/spine/_unreferenced/`. They do not get an atlas or spine-data meta. Each `.png.meta` is the same texture image meta as the pack pages (`hasAlpha` true, `displayName` = filename stem).

101022.png, 101032.png, 101100212.png, 101100222.png, 102022.png, 102032.png, 103032.png, 104022.png, 104032.png, 104100142.png, 105032.png, 105100092.png, 105100102.png

## Sibling batches

Spine import is split across sibling batches **C1–C6**. This PR is **C6** only (`camp107-30x-base-heroes-effects`). C1, C2, C3, C4, and C5 are not in this branch. ui, skill, font, and audio batches are not included.

## Out of scope

No Prefab edits. No Boot, `USE_*`, or protocol edits. BattlePage `Bg` is unchanged. Existing spine files and their metas are unchanged. JSON, atlas, and PNG bytes are the zip bytes.
