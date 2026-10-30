# Batch C5 spine (camp105-hero-skins)

Camp 105 hero-skin Spine packs (`105xxxxx`), imported as loose `{stem}.json` + `{stem}.atlas` + `{stem}.png` under `client/assets/resources/spine/`. Each new file has a Creator 3.8.8 `.meta`. Existing spine files and their metas are unchanged. Prefabs are unchanged.

- Baseline: `99e1ab22` (Batch A/B already on main)
- Source: `F:\源码\mj\program\client\cocos_mxzg\client\idle\res\hd\spine\` (flat)
- Zip: `mxzg-mig-batch-c5-p1` (13,290,874 bytes compressed)
- Packs: **69**. Source bytes: **26,359,540**. Asset files added: **207** (69 × json + atlas + png)
- None of these 207 paths already existed. Nothing was overwritten

## Spine version / Creator

Every pack in this batch is Spine **3.7.94** (`skeleton.spine` in the json). This project is Cocos Creator **3.8.8** with the built-in spine-3.8 runtime. 3.7 → 3.8 can fail on curves, constraints, or clipping. Preview these packs in Creator before treating them as playable. This import does not upgrade or rewrite the skeleton, atlas, or png bytes.

## Meta

Same shape as `client/assets/resources/spine/10101.*.meta`. New uuid4 values only.

- `{stem}.atlas.meta`: `ver` `1.0.0`, `importer` `*`, `files` `.atlas` + `.json`
- `{stem}.json.meta`: `ver` `1.2.7`, `importer` `spine-data`, `userData.atlasUuid` = that stem’s atlas uuid
- `{stem}.png.meta`: `ver` `1.0.27`, `importer` `image`, `userData.type` `texture`, `hasAlpha` true, texture sub-meta id `6c48a`, `redirect` `{pngUuid}@6c48a`, `displayName` = stem

Each json meta’s `atlasUuid` points at an atlas meta that exists. Uuid keys do not collide with each other or with metas already in `client/`. All 69 skeleton json files parse.

## Stems (69)

| stem | spine ver | bytes |
| --- | --- | ---: |
| 10503001 | 3.7.94 | 72,623 |
| 10504002 | 3.7.94 | 116,757 |
| 10504003 | 3.7.94 | 183,573 |
| 10504011 | 3.7.94 | 50,825 |
| 10504012 | 3.7.94 | 49,833 |
| 10504013 | 3.7.94 | 52,156 |
| 10505003 | 3.7.94 | 222,542 |
| 10505004 | 3.7.94 | 208,638 |
| 10505006 | 3.7.94 | 172,551 |
| 10505007 | 3.7.94 | 178,053 |
| 10505008 | 3.7.94 | 43,822 |
| 10505009 | 3.7.94 | 107,229 |
| 10505011 | 3.7.94 | 401,056 |
| 10505012 | 3.7.94 | 67,292 |
| 10505013 | 3.7.94 | 72,803 |
| 10505014 | 3.7.94 | 267,197 |
| 10505015 | 3.7.94 | 391,302 |
| 10505016 | 3.7.94 | 344,451 |
| 10505017 | 3.7.94 | 324,549 |
| 10505018 | 3.7.94 | 379,693 |
| 10505019 | 3.7.94 | 205,796 |
| 10505020 | 3.7.94 | 434,670 |
| 10505021 | 3.7.94 | 849,274 |
| 10506003 | 3.7.94 | 226,726 |
| 10506004 | 3.7.94 | 232,747 |
| 10506005 | 3.7.94 | 448,621 |
| 10506006 | 3.7.94 | 200,467 |
| 10506007 | 3.7.94 | 207,218 |
| 10506008 | 3.7.94 | 55,241 |
| 10506009 | 3.7.94 | 137,472 |
| 10506010 | 3.7.94 | 399,920 |
| 10506011 | 3.7.94 | 420,409 |
| 10506014 | 3.7.94 | 310,254 |
| 10506015 | 3.7.94 | 562,217 |
| 10506016 | 3.7.94 | 402,654 |
| 10506017 | 3.7.94 | 362,320 |
| 10506018 | 3.7.94 | 468,640 |
| 10506019 | 3.7.94 | 266,161 |
| 10506020 | 3.7.94 | 697,855 |
| 10506021 | 3.7.94 | 1,066,626 |
| 10510004 | 3.7.94 | 273,729 |
| 10510005 | 3.7.94 | 528,476 |
| 10510006 | 3.7.94 | 205,151 |
| 10510007 | 3.7.94 | 235,399 |
| 10510009 | 3.7.94 | 227,468 |
| 10510010 | 3.7.94 | 829,907 |
| 10510011 | 3.7.94 | 513,181 |
| 10510014 | 3.7.94 | 415,022 |
| 10510015 | 3.7.94 | 637,525 |
| 10510016 | 3.7.94 | 483,715 |
| 10510017 | 3.7.94 | 397,960 |
| 10510018 | 3.7.94 | 511,808 |
| 10510019 | 3.7.94 | 315,361 |
| 10510020 | 3.7.94 | 1,110,087 |
| 10510021 | 3.7.94 | 1,385,218 |
| 10511004 | 3.7.94 | 286,722 |
| 10511005 | 3.7.94 | 451,826 |
| 10511009 | 3.7.94 | 234,499 |
| 10511010 | 3.7.94 | 822,505 |
| 10511014 | 3.7.94 | 305,754 |
| 10511015 | 3.7.94 | 760,235 |
| 10511017 | 3.7.94 | 426,082 |
| 10512004 | 3.7.94 | 285,770 |
| 10512005 | 3.7.94 | 522,190 |
| 10512009 | 3.7.94 | 246,095 |
| 10512010 | 3.7.94 | 798,418 |
| 10512014 | 3.7.94 | 402,338 |
| 10512015 | 3.7.94 | 644,049 |
| 10512017 | 3.7.94 | 440,817 |

Bytes are the uncompressed json + atlas + png size for that stem. The column sums to 26,359,540.

## Siblings C1–C6

Spine hero-skin import is split into six sibling batches, **C1 through C6**. This PR is **C5** only (camp 105, stems above). C1, C2, C3, C4, and C6 are separate packs and are not in this PR.

## Scope

New files under `client/assets/resources/spine/` for the 69 stems above, plus this note. No Prefab edits, no Boot, no `USE_*`, no protocol scripts, no BattlePage `Bg`. No existing spine file or meta was rewritten. Json, atlas, and png bytes are the zip contents. No ui, skill, font, or audio from other batches.
