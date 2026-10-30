# Batch E2 audio (hd/music remainder)

Old `hd/music` mp3 files, kept under their original filenames, flat in `client/assets/resources/audio/`. Each new mp3 has a Creator 3.8.8 audio-clip `.meta`. Prefabs are not rewired. Boot, `USE_*`, protocol scripts, and BattlePage `Bg` are unchanged.

## Baseline

- Repo tip: `6a7e235e` (Batch A–D merged, through D3 #193)
- Source: `hd/music`
- Manifest: Batch E2 (`mxzg-mig-batch-e2`). One zip: `mxzg-mig-batch-e2-p1` (18,695,674 bytes compressed, 415 mp3, 19,728,083 bytes uncompressed)
- Unpacked at the repo root. Paths inside the zip already start at `client/assets/resources/...`
- None of the 415 mp3 paths existed on the baseline. Nothing was overwritten. On-disk file count and byte sizes match the manifest.
- `client/assets/resources/audio/` already existed. Its directory `.meta` was not rewritten.

| | mp3 | bytes |
| --- | ---: | ---: |
| E2 | 415 | 19,728,083 |

## Path map

Old path is under `hd/`. New path is the file added in this PR. Byte sizes are the manifest figures and match the files on disk. The full list is the Batch E2 manifest (`mxzg-mig-batch-e2`).

| old path (`hd/`) | new path | bytes |
| --- | --- | ---: |
| `music/audio-ready.mp3` | `client/assets/resources/audio/audio-ready.mp3` | 2,268 |
| `music/battle-0.mp3` | `client/assets/resources/audio/battle-0.mp3` | 528,576 |
| `music/battle-1.mp3` | `client/assets/resources/audio/battle-1.mp3` | 512,832 |
| `music/battle-adventure-1.mp3` | `client/assets/resources/audio/battle-adventure-1.mp3` | 512,832 |
| `music/battle-clan-boss.mp3` | `client/assets/resources/audio/battle-clan-boss.mp3` | 512,832 |
| `music/battle-daily-1.mp3` | `client/assets/resources/audio/battle-daily-1.mp3` | 512,832 |
| `music/battle-dungeon-1.mp3` | `client/assets/resources/audio/battle-dungeon-1.mp3` | 512,832 |
| `music/battle-end-0.mp3` | `client/assets/resources/audio/battle-end-0.mp3` | 63,683 |
| `music/battle-end-1.mp3` | `client/assets/resources/audio/battle-end-1.mp3` | 84,581 |
| `music/battle-fantasy-tower.mp3` | `client/assets/resources/audio/battle-fantasy-tower.mp3` | 538,176 |
| `music/battle-godrelic-1.mp3` | `client/assets/resources/audio/battle-godrelic-1.mp3` | 512,832 |
| `music/battle-main-end-0.mp3` | `client/assets/resources/audio/battle-main-end-0.mp3` | 210,470 |
| `music/battle-main-end-1.mp3` | `client/assets/resources/audio/battle-main-end-1.mp3` | 138,470 |
| `music/battle-pvp-1.mp3` | `client/assets/resources/audio/battle-pvp-1.mp3` | 538,176 |
| `music/beattack.mp3` | `client/assets/resources/audio/beattack.mp3` | 2,342 |
| `music/bless-run.mp3` | `client/assets/resources/audio/bless-run.mp3` | 1,314 |
| `music/bless-start.mp3` | `client/assets/resources/audio/bless-start.mp3` | 12,164 |
| `music/bless-stop.mp3` | `client/assets/resources/audio/bless-stop.mp3` | 6,104 |
| `music/champion.mp3` | `client/assets/resources/audio/champion.mp3` | 609,413 |
| `music/clan-1.mp3` | `client/assets/resources/audio/clan-1.mp3` | 585,306 |
| `music/clan-tec.mp3` | `client/assets/resources/audio/clan-tec.mp3` | 7,567 |
| `music/dragon-atk.mp3` | `client/assets/resources/audio/dragon-atk.mp3` | 34,189 |
| `music/dragon-fly.mp3` | `client/assets/resources/audio/dragon-fly.mp3` | 38,059 |
| `music/dungeon-1.mp3` | `client/assets/resources/audio/dungeon-1.mp3` | 954,200 |
| `music/equip-wear-1.mp3` | `client/assets/resources/audio/equip-wear-1.mp3` | 6,784 |
| `music/fantasy-tower.mp3` | `client/assets/resources/audio/fantasy-tower.mp3` | 954,200 |
| `music/fetter-1.mp3` | `client/assets/resources/audio/fetter-1.mp3` | 954,200 |
| `music/fetter-10101.mp3` | `client/assets/resources/audio/fetter-10101.mp3` | 2,268 |
| `music/fetter-10201.mp3` | `client/assets/resources/audio/fetter-10201.mp3` | 2,268 |
| `music/fetter-10301.mp3` | `client/assets/resources/audio/fetter-10301.mp3` | 2,268 |
| `music/fetter-10401.mp3` | `client/assets/resources/audio/fetter-10401.mp3` | 2,268 |
| `music/fetter-10501.mp3` | `client/assets/resources/audio/fetter-10501.mp3` | 2,268 |
| `music/god01.mp3` | `client/assets/resources/audio/god01.mp3` | 38,626 |
| `music/god02.mp3` | `client/assets/resources/audio/god02.mp3` | 38,626 |
| `music/god03.mp3` | `client/assets/resources/audio/god03.mp3` | 38,626 |
| `music/god04.mp3` | `client/assets/resources/audio/god04.mp3` | 38,626 |
| `music/god05.mp3` | `client/assets/resources/audio/god05.mp3` | 38,626 |
| `music/goddessactivate.mp3` | `client/assets/resources/audio/goddessactivate.mp3` | 5,686 |
| `music/guide-930030001.mp3` | `client/assets/resources/audio/guide-930030001.mp3` | 32,751 |
| `music/guide-930030002.mp3` | `client/assets/resources/audio/guide-930030002.mp3` | 17,600 |
| `music/guide-930030003.mp3` | `client/assets/resources/audio/guide-930030003.mp3` | 9,554 |
| `music/guide-930030004.mp3` | `client/assets/resources/audio/guide-930030004.mp3` | 13,420 |
| `music/guide-930030005.mp3` | `client/assets/resources/audio/guide-930030005.mp3` | 32,228 |
| `music/guide-930030006.mp3` | `client/assets/resources/audio/guide-930030006.mp3` | 27,422 |
| `music/guide-930030007.mp3` | `client/assets/resources/audio/guide-930030007.mp3` | 34,632 |
| `music/guide-930030008.mp3` | `client/assets/resources/audio/guide-930030008.mp3` | 20,943 |
| `music/guide-930030009.mp3` | `client/assets/resources/audio/guide-930030009.mp3` | 24,601 |
| `music/guide-930030010.mp3` | `client/assets/resources/audio/guide-930030010.mp3` | 19,063 |
| `music/guide-930030011.mp3` | `client/assets/resources/audio/guide-930030011.mp3` | 21,988 |
| `music/guide-930030012.mp3` | `client/assets/resources/audio/guide-930030012.mp3` | 55,948 |
| `music/guide-930030013.mp3` | `client/assets/resources/audio/guide-930030013.mp3` | 23,033 |
| `music/guide-930030014.mp3` | `client/assets/resources/audio/guide-930030014.mp3` | 16,659 |
| `music/guide-930030015.mp3` | `client/assets/resources/audio/guide-930030015.mp3` | 10,703 |
| `music/guide-930030016.mp3` | `client/assets/resources/audio/guide-930030016.mp3` | 24,496 |
| `music/guide-930030017.mp3` | `client/assets/resources/audio/guide-930030017.mp3` | 24,496 |
| `music/guide-930030018.mp3` | `client/assets/resources/audio/guide-930030018.mp3` | 25,228 |
| `music/guide-930030019.mp3` | `client/assets/resources/audio/guide-930030019.mp3` | 23,242 |
| `music/guide-930030020.mp3` | `client/assets/resources/audio/guide-930030020.mp3` | 14,465 |
| `music/guide-930030021.mp3` | `client/assets/resources/audio/guide-930030021.mp3` | 14,779 |
| `music/guide-930030022.mp3` | `client/assets/resources/audio/guide-930030022.mp3` | 16,137 |
| `music/guide-930030023.mp3` | `client/assets/resources/audio/guide-930030023.mp3` | 12,375 |
| `music/guide-930030024.mp3` | `client/assets/resources/audio/guide-930030024.mp3` | 33,796 |
| `music/guide-930030025.mp3` | `client/assets/resources/audio/guide-930030025.mp3` | 17,704 |
| `music/guide-930030026.mp3` | `client/assets/resources/audio/guide-930030026.mp3` | 6,837 |
| `music/guide-930030027.mp3` | `client/assets/resources/audio/guide-930030027.mp3` | 17,809 |
| `music/guide-930030028.mp3` | `client/assets/resources/audio/guide-930030028.mp3` | 20,630 |
| `music/guide-930030029.mp3` | `client/assets/resources/audio/guide-930030029.mp3` | 7,464 |
| `music/guide-930030030.mp3` | `client/assets/resources/audio/guide-930030030.mp3` | 17,913 |
| `music/guide-930030031.mp3` | `client/assets/resources/audio/guide-930030031.mp3` | 19,794 |
| `music/guide-930030032.mp3` | `client/assets/resources/audio/guide-930030032.mp3` | 16,555 |
| `music/guide-930030033.mp3` | `client/assets/resources/audio/guide-930030033.mp3` | 14,988 |
| `music/guide-930030034.mp3` | `client/assets/resources/audio/guide-930030034.mp3` | 5,688 |
| `music/guide-930030035.mp3` | `client/assets/resources/audio/guide-930030035.mp3` | 5,688 |
| `music/guide-930030036.mp3` | `client/assets/resources/audio/guide-930030036.mp3` | 13,734 |
| `music/guide-930030037.mp3` | `client/assets/resources/audio/guide-930030037.mp3` | 17,913 |
| `music/guide-930030038.mp3` | `client/assets/resources/audio/guide-930030038.mp3` | 13,838 |
| `music/guide-930030039.mp3` | `client/assets/resources/audio/guide-930030039.mp3` | 22,511 |
| `music/guide-930030040.mp3` | `client/assets/resources/audio/guide-930030040.mp3` | 25,541 |
| `music/guide-930030041.mp3` | `client/assets/resources/audio/guide-930030041.mp3` | 30,348 |
| `music/guide-930030042.mp3` | `client/assets/resources/audio/guide-930030042.mp3` | 29,616 |
| `music/guide-930030043.mp3` | `client/assets/resources/audio/guide-930030043.mp3` | 24,287 |
| `music/guide-930030044.mp3` | `client/assets/resources/audio/guide-930030044.mp3` | 10,286 |
| `music/guide-930030045.mp3` | `client/assets/resources/audio/guide-930030045.mp3` | 20,526 |
| `music/guide-930030046.mp3` | `client/assets/resources/audio/guide-930030046.mp3` | 12,793 |
| `music/guide-930030047.mp3` | `client/assets/resources/audio/guide-930030047.mp3` | 10,599 |
| `music/guide-930030048.mp3` | `client/assets/resources/audio/guide-930030048.mp3` | 12,584 |
| `music/guide-930030049.mp3` | `client/assets/resources/audio/guide-930030049.mp3` | 26,481 |
| `music/guide-930030050.mp3` | `client/assets/resources/audio/guide-930030050.mp3` | 30,661 |
| `music/guide001.mp3` | `client/assets/resources/audio/guide001.mp3` | 6,751 |
| `music/guide002.mp3` | `client/assets/resources/audio/guide002.mp3` | 4,661 |
| `music/guide003.mp3` | `client/assets/resources/audio/guide003.mp3` | 5,079 |
| `music/guide004.mp3` | `client/assets/resources/audio/guide004.mp3` | 4,243 |
| `music/guide005.mp3` | `client/assets/resources/audio/guide005.mp3` | 3,198 |
| `music/guide006.mp3` | `client/assets/resources/audio/guide006.mp3` | 8,632 |
| `music/guide007.mp3` | `client/assets/resources/audio/guide007.mp3` | 2,989 |
| `music/guide008.mp3` | `client/assets/resources/audio/guide008.mp3` | 8,005 |
| `music/guide009.mp3` | `client/assets/resources/audio/guide009.mp3` | 4,870 |
| `music/guide010.mp3` | `client/assets/resources/audio/guide010.mp3` | 4,243 |
| `music/guide011.mp3` | `client/assets/resources/audio/guide011.mp3` | 5,079 |
| `music/guide012.mp3` | `client/assets/resources/audio/guide012.mp3` | 7,796 |
| `music/heishi-1.mp3` | `client/assets/resources/audio/heishi-1.mp3` | 168,230 |
| `music/heishi-2.mp3` | `client/assets/resources/audio/heishi-2.mp3` | 200,870 |
| `music/heishi-3.mp3` | `client/assets/resources/audio/heishi-3.mp3` | 166,310 |
| `music/heishi-4.mp3` | `client/assets/resources/audio/heishi-4.mp3` | 167,270 |
| `music/heishi-5.mp3` | `client/assets/resources/audio/heishi-5.mp3` | 152,870 |
| `music/hero-up-level.mp3` | `client/assets/resources/audio/hero-up-level.mp3` | 10,701 |
| `music/hero-up-star.mp3` | `client/assets/resources/audio/hero-up-star.mp3` | 8,821 |
| `music/item-get.mp3` | `client/assets/resources/audio/item-get.mp3` | 39,859 |
| `music/jitan-1.mp3` | `client/assets/resources/audio/jitan-1.mp3` | 197,990 |
| `music/jitan-2.mp3` | `client/assets/resources/audio/jitan-2.mp3` | 296,870 |
| `music/jitan-3.mp3` | `client/assets/resources/audio/jitan-3.mp3` | 333,350 |
| `music/kafeiguan-1.mp3` | `client/assets/resources/audio/kafeiguan-1.mp3` | 285,350 |
| `music/kafeiguan-2.mp3` | `client/assets/resources/audio/kafeiguan-2.mp3` | 179,750 |
| `music/kafeiguan-3.mp3` | `client/assets/resources/audio/kafeiguan-3.mp3` | 126,950 |
| `music/mission-1.mp3` | `client/assets/resources/audio/mission-1.mp3` | 537,625 |
| `music/shelter-lose.mp3` | `client/assets/resources/audio/shelter-lose.mp3` | 4,223 |
| `music/shelter-stone.mp3` | `client/assets/resources/audio/shelter-stone.mp3` | 2,133 |
| `music/shelter-win.mp3` | `client/assets/resources/audio/shelter-win.mp3` | 84,581 |
| `music/shelter101.mp3` | `client/assets/resources/audio/shelter101.mp3` | 3,596 |
| `music/shelter102.mp3` | `client/assets/resources/audio/shelter102.mp3` | 8,194 |
| `music/shelter103.mp3` | `client/assets/resources/audio/shelter103.mp3` | 5,477 |
| `music/shelter104.mp3` | `client/assets/resources/audio/shelter104.mp3` | 11,746 |
| `music/shelter105.mp3` | `client/assets/resources/audio/shelter105.mp3` | 10,284 |
| `music/shelter106.mp3` | `client/assets/resources/audio/shelter106.mp3` | 18,852 |
| `music/shelter107.mp3` | `client/assets/resources/audio/shelter107.mp3` | 2,760 |
| `music/shelter108.mp3` | `client/assets/resources/audio/shelter108.mp3` | 2,133 |
| `music/shelter109.mp3` | `client/assets/resources/audio/shelter109.mp3` | 1,924 |
| `music/shelter110.mp3` | `client/assets/resources/audio/shelter110.mp3` | 5,477 |
| `music/shelter111.mp3` | `client/assets/resources/audio/shelter111.mp3` | 5,477 |
| `music/shelter112.mp3` | `client/assets/resources/audio/shelter112.mp3` | 5,477 |
| `music/shelter113.mp3` | `client/assets/resources/audio/shelter113.mp3` | 5,477 |
| `music/shelter114.mp3` | `client/assets/resources/audio/shelter114.mp3` | 5,477 |
| `music/shelter115.mp3` | `client/assets/resources/audio/shelter115.mp3` | 2,760 |
| `music/shop-1.mp3` | `client/assets/resources/audio/shop-1.mp3` | 154,790 |
| `music/shop-2.mp3` | `client/assets/resources/audio/shop-2.mp3` | 102,950 |
| `music/shop-3.mp3` | `client/assets/resources/audio/shop-3.mp3` | 279,590 |
| `music/shop.mp3` | `client/assets/resources/audio/shop.mp3` | 537,625 |
| `music/skill-10101.mp3` | `client/assets/resources/audio/skill-10101.mp3` | 11,328 |
| `music/skill-101010011.mp3` | `client/assets/resources/audio/skill-101010011.mp3` | 3,387 |
| `music/skill-101020021.mp3` | `client/assets/resources/audio/skill-101020021.mp3` | 5,477 |
| `music/skill-101030030.mp3` | `client/assets/resources/audio/skill-101030030.mp3` | 2,133 |
| `music/skill-101030031.mp3` | `client/assets/resources/audio/skill-101030031.mp3` | 6,522 |
| `music/skill-101040041.mp3` | `client/assets/resources/audio/skill-101040041.mp3` | 8,420 |
| `music/skill-101040050.mp3` | `client/assets/resources/audio/skill-101040050.mp3` | 6,748 |
| `music/skill-101040051.mp3` | `client/assets/resources/audio/skill-101040051.mp3` | 16,779 |
| `music/skill-101040120-3.mp3` | `client/assets/resources/audio/skill-101040120-3.mp3` | 6,748 |
| `music/skill-101040121.mp3` | `client/assets/resources/audio/skill-101040121.mp3` | 14,881 |
| `music/skill-101050060.mp3` | `client/assets/resources/audio/skill-101050060.mp3` | 4,240 |
| `music/skill-101050061.mp3` | `client/assets/resources/audio/skill-101050061.mp3` | 9,047 |
| `music/skill-101050070.mp3` | `client/assets/resources/audio/skill-101050070.mp3` | 8,420 |
| `music/skill-101050071.mp3` | `client/assets/resources/audio/skill-101050071.mp3` | 9,883 |
| `music/skill-101050073.mp3` | `client/assets/resources/audio/skill-101050073.mp3` | 7,375 |
| `music/skill-101050075.mp3` | `client/assets/resources/audio/skill-101050075.mp3` | 11,746 |
| `music/skill-101050080.mp3` | `client/assets/resources/audio/skill-101050080.mp3` | 4,223 |
| `music/skill-1010500805.mp3` | `client/assets/resources/audio/skill-1010500805.mp3` | 7,018 |
| `music/skill-101050081.mp3` | `client/assets/resources/audio/skill-101050081.mp3` | 7,793 |
| `music/skill-101050083.mp3` | `client/assets/resources/audio/skill-101050083.mp3` | 7,793 |
| `music/skill-101050085.mp3` | `client/assets/resources/audio/skill-101050085.mp3` | 18,869 |
| `music/skill-101050090.mp3` | `client/assets/resources/audio/skill-101050090.mp3` | 5,718 |
| `music/skill-101050091.mp3` | `client/assets/resources/audio/skill-101050091.mp3` | 11,345 |
| `music/skill-101050100.mp3` | `client/assets/resources/audio/skill-101050100.mp3` | 10,092 |
| `music/skill-101050101.mp3` | `client/assets/resources/audio/skill-101050101.mp3` | 13,644 |
| `music/skill-101050110.mp3` | `client/assets/resources/audio/skill-101050110.mp3` | 6,313 |
| `music/skill-101050111.mp3` | `client/assets/resources/audio/skill-101050111.mp3` | 10,284 |
| `music/skill-101050130.mp3` | `client/assets/resources/audio/skill-101050130.mp3` | 5,268 |
| `music/skill-101050131.mp3` | `client/assets/resources/audio/skill-101050131.mp3` | 5,268 |
| `music/skill-101050140.mp3` | `client/assets/resources/audio/skill-101050140.mp3` | 4,223 |
| `music/skill-101050141.mp3` | `client/assets/resources/audio/skill-101050141.mp3` | 6,104 |
| `music/skill-101050150.mp3` | `client/assets/resources/audio/skill-101050150.mp3` | 9,030 |
| `music/skill-101050151.mp3` | `client/assets/resources/audio/skill-101050151.mp3` | 8,612 |
| `music/skill-101050153.mp3` | `client/assets/resources/audio/skill-101050153.mp3` | 5,268 |
| `music/skill-101050181.mp3` | `client/assets/resources/audio/skill-101050181.mp3` | 8,403 |
| `music/skill-101050190.mp3` | `client/assets/resources/audio/skill-101050190.mp3` | 4,432 |
| `music/skill-101050191.mp3` | `client/assets/resources/audio/skill-101050191.mp3` | 10,075 |
| `music/skill-101050200-1.mp3` | `client/assets/resources/audio/skill-101050200-1.mp3` | 8,403 |
| `music/skill-101050201-1.mp3` | `client/assets/resources/audio/skill-101050201-1.mp3` | 5,059 |
| `music/skill-101050203.mp3` | `client/assets/resources/audio/skill-101050203.mp3` | 11,763 |
| `music/skill-101050210-1.mp3` | `client/assets/resources/audio/skill-101050210-1.mp3` | 8,403 |
| `music/skill-101050210-2.mp3` | `client/assets/resources/audio/skill-101050210-2.mp3` | 7,149 |
| `music/skill-101050211.mp3` | `client/assets/resources/audio/skill-101050211.mp3` | 7,149 |
| `music/skill-101050213.mp3` | `client/assets/resources/audio/skill-101050213.mp3` | 7,584 |
| `music/skill-101050220-1.mp3` | `client/assets/resources/audio/skill-101050220-1.mp3` | 3,805 |
| `music/skill-101050220-2.mp3` | `client/assets/resources/audio/skill-101050220-2.mp3` | 7,375 |
| `music/skill-101050221.mp3` | `client/assets/resources/audio/skill-101050221.mp3` | 12,164 |
| `music/skill-101050223.mp3` | `client/assets/resources/audio/skill-101050223.mp3` | 8,403 |
| `music/skill-101050230.mp3` | `client/assets/resources/audio/skill-101050230.mp3` | 4,223 |
| `music/skill-101050231.mp3` | `client/assets/resources/audio/skill-101050231.mp3` | 9,557 |
| `music/skill-101050233.mp3` | `client/assets/resources/audio/skill-101050233.mp3` | 8,328 |
| `music/skill-10201.mp3` | `client/assets/resources/audio/skill-10201.mp3` | 10,075 |
| `music/skill-102010011.mp3` | `client/assets/resources/audio/skill-102010011.mp3` | 7,018 |
| `music/skill-102020021.mp3` | `client/assets/resources/audio/skill-102020021.mp3` | 6,957 |
| `music/skill-102030031.mp3` | `client/assets/resources/audio/skill-102030031.mp3` | 4,031 |
| `music/skill-102040040.mp3` | `client/assets/resources/audio/skill-102040040.mp3` | 7,793 |
| `music/skill-102040041.mp3` | `client/assets/resources/audio/skill-102040041.mp3` | 8,435 |
| `music/skill-102040050.mp3` | `client/assets/resources/audio/skill-102040050.mp3` | 5,703 |
| `music/skill-102040051.mp3` | `client/assets/resources/audio/skill-102040051.mp3` | 13,226 |
| `music/skill-102040130.mp3` | `client/assets/resources/audio/skill-102040130.mp3` | 6,731 |
| `music/skill-102040131.mp3` | `client/assets/resources/audio/skill-102040131.mp3` | 8,612 |
| `music/skill-102050060.mp3` | `client/assets/resources/audio/skill-102050060.mp3` | 4,106 |
| `music/skill-102050061.mp3` | `client/assets/resources/audio/skill-102050061.mp3` | 11,763 |
| `music/skill-102050071.mp3` | `client/assets/resources/audio/skill-102050071.mp3` | 15,943 |
| `music/skill-102050080.mp3` | `client/assets/resources/audio/skill-102050080.mp3` | 7,375 |
| `music/skill-102050081.mp3` | `client/assets/resources/audio/skill-102050081.mp3` | 16,152 |
| `music/skill-102050090.mp3` | `client/assets/resources/audio/skill-102050090.mp3` | 7,776 |
| `music/skill-102050091.mp3` | `client/assets/resources/audio/skill-102050091.mp3` | 8,821 |
| `music/skill-102050093.mp3` | `client/assets/resources/audio/skill-102050093.mp3` | 9,657 |
| `music/skill-102050100.mp3` | `client/assets/resources/audio/skill-102050100.mp3` | 6,104 |
| `music/skill-102050101.mp3` | `client/assets/resources/audio/skill-102050101.mp3` | 10,075 |
| `music/skill-102050110.mp3` | `client/assets/resources/audio/skill-102050110.mp3` | 7,375 |
| `music/skill-102050111.mp3` | `client/assets/resources/audio/skill-102050111.mp3` | 13,644 |
| `music/skill-102050113.mp3` | `client/assets/resources/audio/skill-102050113.mp3` | 6,522 |
| `music/skill-102050140.mp3` | `client/assets/resources/audio/skill-102050140.mp3` | 9,030 |
| `music/skill-102050141.mp3` | `client/assets/resources/audio/skill-102050141.mp3` | 7,149 |
| `music/skill-102050143.mp3` | `client/assets/resources/audio/skill-102050143.mp3` | 5,477 |
| `music/skill-102050150.mp3` | `client/assets/resources/audio/skill-102050150.mp3` | 7,567 |
| `music/skill-102050151.mp3` | `client/assets/resources/audio/skill-102050151.mp3` | 9,657 |
| `music/skill-102050181.mp3` | `client/assets/resources/audio/skill-102050181.mp3` | 3,805 |
| `music/skill-102050191.mp3` | `client/assets/resources/audio/skill-102050191.mp3` | 2,551 |
| `music/skill-102050200.mp3` | `client/assets/resources/audio/skill-102050200.mp3` | 8,403 |
| `music/skill-102050201-1.mp3` | `client/assets/resources/audio/skill-102050201-1.mp3` | 5,686 |
| `music/skill-102050203.mp3` | `client/assets/resources/audio/skill-102050203.mp3` | 8,821 |
| `music/skill-102050210.mp3` | `client/assets/resources/audio/skill-102050210.mp3` | 8,194 |
| `music/skill-102050211.mp3` | `client/assets/resources/audio/skill-102050211.mp3` | 6,313 |
| `music/skill-102050213.mp3` | `client/assets/resources/audio/skill-102050213.mp3` | 12,164 |
| `music/skill-102050220.mp3` | `client/assets/resources/audio/skill-102050220.mp3` | 4,850 |
| `music/skill-102050221.mp3` | `client/assets/resources/audio/skill-102050221.mp3` | 7,776 |
| `music/skill-102050223.mp3` | `client/assets/resources/audio/skill-102050223.mp3` | 7,776 |
| `music/skill-102050230.mp3` | `client/assets/resources/audio/skill-102050230.mp3` | 8,403 |
| `music/skill-102050231.mp3` | `client/assets/resources/audio/skill-102050231.mp3` | 7,776 |
| `music/skill-102050233.mp3` | `client/assets/resources/audio/skill-102050233.mp3` | 11,937 |
| `music/skill-10301.mp3` | `client/assets/resources/audio/skill-10301.mp3` | 16,971 |
| `music/skill-103010011.mp3` | `client/assets/resources/audio/skill-103010011.mp3` | 2,986 |
| `music/skill-103020021.mp3` | `client/assets/resources/audio/skill-103020021.mp3` | 7,793 |
| `music/skill-103030030.mp3` | `client/assets/resources/audio/skill-103030030.mp3` | 12,791 |
| `music/skill-103030031.mp3` | `client/assets/resources/audio/skill-103030031.mp3` | 5,477 |
| `music/skill-103040041.mp3` | `client/assets/resources/audio/skill-103040041.mp3` | 7,149 |
| `music/skill-103040050.mp3` | `client/assets/resources/audio/skill-103040050.mp3` | 5,686 |
| `music/skill-103040051.mp3` | `client/assets/resources/audio/skill-103040051.mp3` | 5,686 |
| `music/skill-103050060.mp3` | `client/assets/resources/audio/skill-103050060.mp3` | 10,701 |
| `music/skill-103050061.mp3` | `client/assets/resources/audio/skill-103050061.mp3` | 12,164 |
| `music/skill-103050070.mp3` | `client/assets/resources/audio/skill-103050070.mp3` | 10,075 |
| `music/skill-103050071.mp3` | `client/assets/resources/audio/skill-103050071.mp3` | 19,688 |
| `music/skill-103050073.mp3` | `client/assets/resources/audio/skill-103050073.mp3` | 5,686 |
| `music/skill-103050080.mp3` | `client/assets/resources/audio/skill-103050080.mp3` | 6,763 |
| `music/skill-103050081.mp3` | `client/assets/resources/audio/skill-103050081.mp3` | 6,313 |
| `music/skill-103050083.mp3` | `client/assets/resources/audio/skill-103050083.mp3` | 9,657 |
| `music/skill-103050090.mp3` | `client/assets/resources/audio/skill-103050090.mp3` | 6,731 |
| `music/skill-103050091.mp3` | `client/assets/resources/audio/skill-103050091.mp3` | 12,582 |
| `music/skill-103050100.mp3` | `client/assets/resources/audio/skill-103050100.mp3` | 6,731 |
| `music/skill-103050101.mp3` | `client/assets/resources/audio/skill-103050101.mp3` | 11,972 |
| `music/skill-103050103.mp3` | `client/assets/resources/audio/skill-103050103.mp3` | 4,223 |
| `music/skill-103050110.mp3` | `client/assets/resources/audio/skill-103050110.mp3` | 6,313 |
| `music/skill-103050111.mp3` | `client/assets/resources/audio/skill-103050111.mp3` | 7,793 |
| `music/skill-103050130.mp3` | `client/assets/resources/audio/skill-103050130.mp3` | 4,658 |
| `music/skill-103050131.mp3` | `client/assets/resources/audio/skill-103050131.mp3` | 7,793 |
| `music/skill-103050140.mp3` | `client/assets/resources/audio/skill-103050140.mp3` | 8,612 |
| `music/skill-103050141.mp3` | `client/assets/resources/audio/skill-103050141.mp3` | 11,955 |
| `music/skill-103050143.mp3` | `client/assets/resources/audio/skill-103050143.mp3` | 7,793 |
| `music/skill-103050150.mp3` | `client/assets/resources/audio/skill-103050150.mp3` | 9,030 |
| `music/skill-103050151.mp3` | `client/assets/resources/audio/skill-103050151.mp3` | 7,358 |
| `music/skill-103050181.mp3` | `client/assets/resources/audio/skill-103050181.mp3` | 4,641 |
| `music/skill-103050191-1.mp3` | `client/assets/resources/audio/skill-103050191-1.mp3` | 7,985 |
| `music/skill-103050200-1.mp3` | `client/assets/resources/audio/skill-103050200-1.mp3` | 7,358 |
| `music/skill-103050201.mp3` | `client/assets/resources/audio/skill-103050201.mp3` | 4,223 |
| `music/skill-103050203.mp3` | `client/assets/resources/audio/skill-103050203.mp3` | 16,762 |
| `music/skill-103050210-1.mp3` | `client/assets/resources/audio/skill-103050210-1.mp3` | 7,358 |
| `music/skill-103050211.mp3` | `client/assets/resources/audio/skill-103050211.mp3` | 6,522 |
| `music/skill-103050220.mp3` | `client/assets/resources/audio/skill-103050220.mp3` | 3,387 |
| `music/skill-103050221.mp3` | `client/assets/resources/audio/skill-103050221.mp3` | 6,522 |
| `music/skill-103050231-1.mp3` | `client/assets/resources/audio/skill-103050231-1.mp3` | 5,703 |
| `music/skill-103050231-2.mp3` | `client/assets/resources/audio/skill-103050231-2.mp3` | 5,703 |
| `music/skill-10401.mp3` | `client/assets/resources/audio/skill-10401.mp3` | 12,791 |
| `music/skill-104030011.mp3` | `client/assets/resources/audio/skill-104030011.mp3` | 7,149 |
| `music/skill-104040020.mp3` | `client/assets/resources/audio/skill-104040020.mp3` | 7,793 |
| `music/skill-104040021.mp3` | `client/assets/resources/audio/skill-104040021.mp3` | 13,418 |
| `music/skill-104040031.mp3` | `client/assets/resources/audio/skill-104040031.mp3` | 13,226 |
| `music/skill-104050040.mp3` | `client/assets/resources/audio/skill-104050040.mp3` | 8,194 |
| `music/skill-104050041.mp3` | `client/assets/resources/audio/skill-104050041.mp3` | 15,316 |
| `music/skill-104050050.mp3` | `client/assets/resources/audio/skill-104050050.mp3` | 2,760 |
| `music/skill-104050051.mp3` | `client/assets/resources/audio/skill-104050051.mp3` | 23,240 |
| `music/skill-104050053.mp3` | `client/assets/resources/audio/skill-104050053.mp3` | 12,582 |
| `music/skill-104050060.mp3` | `client/assets/resources/audio/skill-104050060.mp3` | 5,268 |
| `music/skill-104050061.mp3` | `client/assets/resources/audio/skill-104050061.mp3` | 16,762 |
| `music/skill-104050063.mp3` | `client/assets/resources/audio/skill-104050063.mp3` | 16,762 |
| `music/skill-104050070.mp3` | `client/assets/resources/audio/skill-104050070.mp3` | 8,403 |
| `music/skill-104050071.mp3` | `client/assets/resources/audio/skill-104050071.mp3` | 11,746 |
| `music/skill-104050073.mp3` | `client/assets/resources/audio/skill-104050073.mp3` | 6,522 |
| `music/skill-104050080.mp3` | `client/assets/resources/audio/skill-104050080.mp3` | 4,641 |
| `music/skill-104050081.mp3` | `client/assets/resources/audio/skill-104050081.mp3` | 11,746 |
| `music/skill-104050090.mp3` | `client/assets/resources/audio/skill-104050090.mp3` | 3,178 |
| `music/skill-104050091.mp3` | `client/assets/resources/audio/skill-104050091.mp3` | 4,223 |
| `music/skill-104050100.mp3` | `client/assets/resources/audio/skill-104050100.mp3` | 8,612 |
| `music/skill-104050101.mp3` | `client/assets/resources/audio/skill-104050101.mp3` | 5,268 |
| `music/skill-104050103.mp3` | `client/assets/resources/audio/skill-104050103.mp3` | 6,763 |
| `music/skill-104050140.mp3` | `client/assets/resources/audio/skill-104050140.mp3` | 3,805 |
| `music/skill-104050141.mp3` | `client/assets/resources/audio/skill-104050141.mp3` | 6,522 |
| `music/skill-104050143.mp3` | `client/assets/resources/audio/skill-104050143.mp3` | 6,522 |
| `music/skill-104050153.mp3` | `client/assets/resources/audio/skill-104050153.mp3` | 12,164 |
| `music/skill-104050160.mp3` | `client/assets/resources/audio/skill-104050160.mp3` | 4,223 |
| `music/skill-104050161.mp3` | `client/assets/resources/audio/skill-104050161.mp3` | 6,763 |
| `music/skill-104050163.mp3` | `client/assets/resources/audio/skill-104050163.mp3` | 11,937 |
| `music/skill-104050170.mp3` | `client/assets/resources/audio/skill-104050170.mp3` | 3,805 |
| `music/skill-104050171.mp3` | `client/assets/resources/audio/skill-104050171.mp3` | 7,776 |
| `music/skill-104050173.mp3` | `client/assets/resources/audio/skill-104050173.mp3` | 24,002 |
| `music/skill-104050180.mp3` | `client/assets/resources/audio/skill-104050180.mp3` | 7,793 |
| `music/skill-104050181.mp3` | `client/assets/resources/audio/skill-104050181.mp3` | 5,268 |
| `music/skill-104050185.mp3` | `client/assets/resources/audio/skill-104050185.mp3` | 6,104 |
| `music/skill-104050186.mp3` | `client/assets/resources/audio/skill-104050186.mp3` | 29,765 |
| `music/skill-104050190.mp3` | `client/assets/resources/audio/skill-104050190.mp3` | 4,850 |
| `music/skill-104050191.mp3` | `client/assets/resources/audio/skill-104050191.mp3` | 7,793 |
| `music/skill-104050193.mp3` | `client/assets/resources/audio/skill-104050193.mp3` | 5,268 |
| `music/skill-104050200.mp3` | `client/assets/resources/audio/skill-104050200.mp3` | 8,403 |
| `music/skill-104050201.mp3` | `client/assets/resources/audio/skill-104050201.mp3` | 8,802 |
| `music/skill-104050203.mp3` | `client/assets/resources/audio/skill-104050203.mp3` | 10,892 |
| `music/skill-104050210.mp3` | `client/assets/resources/audio/skill-104050210.mp3` | 10,815 |
| `music/skill-104050211.mp3` | `client/assets/resources/audio/skill-104050211.mp3` | 13,349 |
| `music/skill-104050213.mp3` | `client/assets/resources/audio/skill-104050213.mp3` | 14,143 |
| `music/skill-10501.mp3` | `client/assets/resources/audio/skill-10501.mp3` | 8,821 |
| `music/skill-105030011.mp3` | `client/assets/resources/audio/skill-105030011.mp3` | 3,596 |
| `music/skill-105040021.mp3` | `client/assets/resources/audio/skill-105040021.mp3` | 19,688 |
| `music/skill-105040030.mp3` | `client/assets/resources/audio/skill-105040030.mp3` | 8,821 |
| `music/skill-105040031.mp3` | `client/assets/resources/audio/skill-105040031.mp3` | 8,483 |
| `music/skill-105050040.mp3` | `client/assets/resources/audio/skill-105050040.mp3` | 25,330 |
| `music/skill-105050041.mp3` | `client/assets/resources/audio/skill-105050041.mp3` | 10,284 |
| `music/skill-105050050.mp3` | `client/assets/resources/audio/skill-105050050.mp3` | 4,223 |
| `music/skill-105050051.mp3` | `client/assets/resources/audio/skill-105050051.mp3` | 4,223 |
| `music/skill-105050053.mp3` | `client/assets/resources/audio/skill-105050053.mp3` | 6,748 |
| `music/skill-105050060.mp3` | `client/assets/resources/audio/skill-105050060.mp3` | 23,240 |
| `music/skill-105050061.mp3` | `client/assets/resources/audio/skill-105050061.mp3` | 13,627 |
| `music/skill-105050063.mp3` | `client/assets/resources/audio/skill-105050063.mp3` | 7,375 |
| `music/skill-105050070.mp3` | `client/assets/resources/audio/skill-105050070.mp3` | 7,018 |
| `music/skill-105050071.mp3` | `client/assets/resources/audio/skill-105050071.mp3` | 15,316 |
| `music/skill-105050080.mp3` | `client/assets/resources/audio/skill-105050080.mp3` | 7,018 |
| `music/skill-105050081.mp3` | `client/assets/resources/audio/skill-105050081.mp3` | 7,584 |
| `music/skill-105050093.mp3` | `client/assets/resources/audio/skill-105050093.mp3` | 10,075 |
| `music/skill-105050100.mp3` | `client/assets/resources/audio/skill-105050100.mp3` | 12,791 |
| `music/skill-105050101.mp3` | `client/assets/resources/audio/skill-105050101.mp3` | 23,031 |
| `music/skill-105050103.mp3` | `client/assets/resources/audio/skill-105050103.mp3` | 9,030 |
| `music/skill-105050110.mp3` | `client/assets/resources/audio/skill-105050110.mp3` | 6,522 |
| `music/skill-105050111.mp3` | `client/assets/resources/audio/skill-105050111.mp3` | 6,940 |
| `music/skill-105050140.mp3` | `client/assets/resources/audio/skill-105050140.mp3` | 4,850 |
| `music/skill-105050141.mp3` | `client/assets/resources/audio/skill-105050141.mp3` | 6,940 |
| `music/skill-105050143.mp3` | `client/assets/resources/audio/skill-105050143.mp3` | 7,358 |
| `music/skill-105050160.mp3` | `client/assets/resources/audio/skill-105050160.mp3` | 11,746 |
| `music/skill-105050161.mp3` | `client/assets/resources/audio/skill-105050161.mp3` | 16,534 |
| `music/skill-105050163.mp3` | `client/assets/resources/audio/skill-105050163.mp3` | 12,773 |
| `music/skill-105050170.mp3` | `client/assets/resources/audio/skill-105050170.mp3` | 3,805 |
| `music/skill-105050171.mp3` | `client/assets/resources/audio/skill-105050171.mp3` | 7,584 |
| `music/skill-105050173-1.mp3` | `client/assets/resources/audio/skill-105050173-1.mp3` | 83,591 |
| `music/skill-105050173.mp3` | `client/assets/resources/audio/skill-105050173.mp3` | 23,240 |
| `music/skill-105050180.mp3` | `client/assets/resources/audio/skill-105050180.mp3` | 4,432 |
| `music/skill-105050181.mp3` | `client/assets/resources/audio/skill-105050181.mp3` | 8,119 |
| `music/skill-105050183.mp3` | `client/assets/resources/audio/skill-105050183.mp3` | 7,793 |
| `music/skill-105050190.mp3` | `client/assets/resources/audio/skill-105050190.mp3` | 4,432 |
| `music/skill-105050191.mp3` | `client/assets/resources/audio/skill-105050191.mp3` | 14,881 |
| `music/skill-105050193.mp3` | `client/assets/resources/audio/skill-105050193.mp3` | 8,721 |
| `music/skill-105050200.mp3` | `client/assets/resources/audio/skill-105050200.mp3` | 6,731 |
| `music/skill-105050201.mp3` | `client/assets/resources/audio/skill-105050201.mp3` | 7,793 |
| `music/skill-105050203.mp3` | `client/assets/resources/audio/skill-105050203.mp3` | 6,763 |
| `music/skill-105050210.mp3` | `client/assets/resources/audio/skill-105050210.mp3` | 3,805 |
| `music/skill-105050211.mp3` | `client/assets/resources/audio/skill-105050211.mp3` | 12,582 |
| `music/skill-105050213-1.mp3` | `client/assets/resources/audio/skill-105050213-1.mp3` | 16,762 |
| `music/skill-105050213-2.mp3` | `client/assets/resources/audio/skill-105050213-2.mp3` | 5,477 |
| `music/skill-107010010.mp3` | `client/assets/resources/audio/skill-107010010.mp3` | 6,522 |
| `music/skill-107010011.mp3` | `client/assets/resources/audio/skill-107010011.mp3` | 9,822 |
| `music/skill-107010013.mp3` | `client/assets/resources/audio/skill-107010013.mp3` | 7,584 |
| `music/skill-107010030.mp3` | `client/assets/resources/audio/skill-107010030.mp3` | 8,821 |
| `music/skill-107010031.mp3` | `client/assets/resources/audio/skill-107010031.mp3` | 16,762 |
| `music/skill-107010033.mp3` | `client/assets/resources/audio/skill-107010033.mp3` | 4,223 |
| `music/skill-107010040.mp3` | `client/assets/resources/audio/skill-107010040.mp3` | 4,223 |
| `music/skill-107010041.mp3` | `client/assets/resources/audio/skill-107010041.mp3` | 5,703 |
| `music/skill-107010043.mp3` | `client/assets/resources/audio/skill-107010043.mp3` | 16,762 |
| `music/skill-107010060.mp3` | `client/assets/resources/audio/skill-107010060.mp3` | 5,268 |
| `music/skill-107010061.mp3` | `client/assets/resources/audio/skill-107010061.mp3` | 16,762 |
| `music/skill-107010063.mp3` | `client/assets/resources/audio/skill-107010063.mp3` | 8,328 |
| `music/skill-2.mp3` | `client/assets/resources/audio/skill-2.mp3` | 7,985 |
| `music/skill-200010001.mp3` | `client/assets/resources/audio/skill-200010001.mp3` | 7,149 |
| `music/skill-200020001.mp3` | `client/assets/resources/audio/skill-200020001.mp3` | 9,448 |
| `music/skill-200030001.mp3` | `client/assets/resources/audio/skill-200030001.mp3` | 16,135 |
| `music/skill-200040001.mp3` | `client/assets/resources/audio/skill-200040001.mp3` | 5,268 |
| `music/skill-200050001.mp3` | `client/assets/resources/audio/skill-200050001.mp3` | 7,358 |
| `music/skill-400010001.mp3` | `client/assets/resources/audio/skill-400010001.mp3` | 5,718 |
| `music/skill-400020001.mp3` | `client/assets/resources/audio/skill-400020001.mp3` | 5,718 |
| `music/skill-400030001.mp3` | `client/assets/resources/audio/skill-400030001.mp3` | 6,522 |
| `music/skill-400040001.mp3` | `client/assets/resources/audio/skill-400040001.mp3` | 5,718 |
| `music/skill-400050001.mp3` | `client/assets/resources/audio/skill-400050001.mp3` | 5,718 |
| `music/skill-400060001.mp3` | `client/assets/resources/audio/skill-400060001.mp3` | 6,748 |
| `music/skill-400070001.mp3` | `client/assets/resources/audio/skill-400070001.mp3` | 6,522 |
| `music/skill-400080001.mp3` | `client/assets/resources/audio/skill-400080001.mp3` | 16,135 |
| `music/skill-400090001.mp3` | `client/assets/resources/audio/skill-400090001.mp3` | 6,748 |
| `music/skill-400100001.mp3` | `client/assets/resources/audio/skill-400100001.mp3` | 16,135 |
| `music/skill-400110001.mp3` | `client/assets/resources/audio/skill-400110001.mp3` | 5,718 |
| `music/skill-400120001.mp3` | `client/assets/resources/audio/skill-400120001.mp3` | 6,522 |
| `music/skill-400130001.mp3` | `client/assets/resources/audio/skill-400130001.mp3` | 6,522 |
| `music/skill-400140001.mp3` | `client/assets/resources/audio/skill-400140001.mp3` | 16,135 |
| `music/skill-400150001.mp3` | `client/assets/resources/audio/skill-400150001.mp3` | 16,135 |
| `music/slay.mp3` | `client/assets/resources/audio/slay.mp3` | 4,850 |
| `music/summon-anime.mp3` | `client/assets/resources/audio/summon-anime.mp3` | 43,430 |
| `music/summon-begin.mp3` | `client/assets/resources/audio/summon-begin.mp3` | 16,971 |
| `music/summon-show.mp3` | `client/assets/resources/audio/summon-show.mp3` | 16,971 |
| `music/summon4.mp3` | `client/assets/resources/audio/summon4.mp3` | 10,898 |
| `music/summon5.mp3` | `client/assets/resources/audio/summon5.mp3` | 17,727 |
| `music/summonlist.mp3` | `client/assets/resources/audio/summonlist.mp3` | 20,513 |
| `music/thunder-1.mp3` | `client/assets/resources/audio/thunder-1.mp3` | 15,072 |
| `music/thunder-2.mp3` | `client/assets/resources/audio/thunder-2.mp3` | 8,512 |
| `music/xuyuanchi-1.mp3` | `client/assets/resources/audio/xuyuanchi-1.mp3` | 251,750 |
| `music/xuyuanchi-2.mp3` | `client/assets/resources/audio/xuyuanchi-2.mp3` | 220,070 |
| `music/xuyuanchi-3.mp3` | `client/assets/resources/audio/xuyuanchi-3.mp3` | 493,670 |
| `music/xuyuanchi-4.mp3` | `client/assets/resources/audio/xuyuanchi-4.mp3` | 209,510 |
| `music/xuyuanchi-5.mp3` | `client/assets/resources/audio/xuyuanchi-5.mp3` | 297,830 |
| `music/zhandoushengli.mp3` | `client/assets/resources/audio/zhandoushengli.mp3` | 138,470 |
| `music/zhandoushibai.mp3` | `client/assets/resources/audio/zhandoushibai.mp3` | 210,470 |
| `music/zhaohuan-1.mp3` | `client/assets/resources/audio/zhaohuan-1.mp3` | 199,910 |
| `music/zhaohuan-2.mp3` | `client/assets/resources/audio/zhaohuan-2.mp3` | 229,670 |
| `music/zhaohuan-3.mp3` | `client/assets/resources/audio/zhaohuan-3.mp3` | 187,430 |

## Audio-clip meta

Repo reference: yes. Every existing mp3 meta under `client/assets/resources/audio/` is the same shape (`bgm-logo.mp3.meta`, `bgm-main-city.mp3.meta`, `bgm-scene.mp3.meta`, `sfx-button-click.mp3.meta`, `sfx-start-game.mp3.meta`). New metas are that file with a new uuid. The brief's `audio-clip` / `1.0.0` / `files: [".json", ".mp3"]` / `downloadMode: 0` matches those files, so the repo copy is what was written.

- `ver` `1.0.0`
- `importer` `audio-clip`
- `imported` true
- `files`: `.json`, `.mp3`
- `subMetas`: `{}`
- `userData.downloadMode`: `0`
- UUIDs are new v4. The 415 new uuids do not collide with each other or with any uuid already in `client/`
- No existing `.meta` was rewritten. No new directory `.meta` (`audio.meta` is already `importer: directory`, `ver` `1.2.0`)

## Same content already on main

This batch adds every manifest path. The five clips already in `audio/` stay as they are, including their `.meta` files. SHA-256 against those five clips:

| already on main | bytes | sha256 | same bytes in this batch |
| --- | ---: | --- | --- |
| `bgm-main-city.mp3` | 537,625 | `b0f3e808779f95ed4fb9ead97da0eea2154fb6c633b8677c1e7513b2f18becb6` | `mission-1.mp3`, `shop.mp3` (also identical to `bgm-scene.mp3`) |
| `bgm-scene.mp3` | 537,625 | `b0f3e808779f95ed4fb9ead97da0eea2154fb6c633b8677c1e7513b2f18becb6` | `mission-1.mp3`, `shop.mp3` |
| `sfx-start-game.mp3` | 2,268 | `e4c2dd8115b4f1744bdfc2479780f1afb586caa2e92c47fb00398771ca0a398c` | `audio-ready.mp3`, `fetter-10101.mp3`, `fetter-10201.mp3`, `fetter-10301.mp3`, `fetter-10401.mp3`, `fetter-10501.mp3` |
| `bgm-logo.mp3` | 604,608 | `823372829947b2b76c1e372542008572a1d9ff314a175b37461e2c8292df3e4c` | none in this batch |
| `sfx-button-click.mp3` | 3,178 | `3639452c020ab956671e10467b5bfd54ffbcc7165a298729d253e259be897016` | none in this batch. `skill-104050090.mp3` is 3,178 bytes and a different hash |

Those original names are still added. The paths were absent on main. Some new files also share bytes with each other (distinct original names, one file each). Examples: `battle-1.mp3`, `battle-adventure-1.mp3`, `battle-clan-boss.mp3`, `battle-daily-1.mp3`, `battle-dungeon-1.mp3`, and `battle-godrelic-1.mp3` (512,832 bytes); `dungeon-1.mp3`, `fantasy-tower.mp3`, and `fetter-1.mp3` (954,200 bytes); `god01.mp3` through `god05.mp3` (38,626 bytes).

## Sibling batches

Audio migration is split across batches E1–E4. This PR is **E2** only. E1, E3, and E4 are not in this manifest.

| batch | in this PR |
| --- | --- |
| E1 | no — sibling, separate PR |
| E2 | yes — remaining `hd/music` mp3, 415 files, original filenames, flat under `audio/` |
| E3 | no — sibling, separate PR |
| E4 | no — sibling, separate PR |

## Left untouched

No Prefab edits and no audio references added to prefabs. No Boot, no `USE_*`, no protocol scripts. No BattlePage `Bg` change. The five clips already in `client/assets/resources/audio/` and `audio.meta` are unchanged.
