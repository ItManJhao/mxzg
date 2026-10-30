# Batch E3 loose ccbi-res backgrounds and waft particle

Old `hd/ccbi-res` loose images that were never packed into an atlas (large backgrounds, activity backgrounds, chapter map tiles) plus the `waft` particle. Files are copied as-is into `ui/chapter/`, `ui/chapter_exoticadventure/` (old subdirectories kept), `ui/maps/`, `ui/promo/`, and `ui/particle/`. Each new png/jpg has a Creator 3.8.8 sprite-frame `.meta`. `waft.plist` has a particle `.meta`. New folders have directory `.meta` files. Prefabs are not rewired.

## Baseline

- Repo tip: `6a7e235e` (Batch A–D merged, through D3 #193)
- Source: `hd/ccbi-res` loose files, listed in the Batch E3 manifest (`mxzg-mig-batch-e3`)
- Zip: `mxzg-mig-batch-e3-p1` (17,789,987 bytes). Unpacked at the repo root. Paths inside the zip already start at `client/assets/resources/...`
- None of the 133 content paths existed on the baseline. Nothing was overwritten

| | files | jpg | png | plist | bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| E3 | 133 | 55 | 77 | 1 | 17,882,289 |

On-disk file counts and byte sizes match the manifest. Largest edge is 1280 (`ui/chapter/hang/map01_B.jpg`, 1280×450). `ui/maps/reload.png` is 1×1.

| folder | files | jpg | png | plist | bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ui/chapter/` | 27 | 27 | 0 | 0 | 3,172,001 |
| `ui/chapter/chapter-world/` | 37 | 0 | 37 | 0 | 293,647 |
| `ui/chapter/hang/` | 26 | 13 | 13 | 0 | 4,151,695 |
| `ui/chapter_exoticadventure/` | 1 | 1 | 0 | 0 | 388,999 |
| `ui/chapter_exoticadventure/hang/` | 2 | 2 | 0 | 0 | 504,657 |
| `ui/maps/` | 25 | 12 | 13 | 0 | 6,738,072 |
| `ui/particle/` | 2 | 0 | 1 | 1 | 17,422 |
| `ui/promo/` | 13 | 0 | 13 | 0 | 2,615,796 |
| **E3** | **133** | **55** | **77** | **1** | **17,882,289** |

`ui/chapter_exoticadventure/hang/map01_F.jpg` and `ui/chapter_exoticadventure/map01.jpg` are the same bytes (388,999). Both paths are in the manifest, so both are imported.

## Path mapping

Old path is relative to `hd/`. New path is relative to the repo root. Byte sizes are the manifest figures and match the files in this PR.

| old path (`hd/`) | new path | bytes |
| --- | --- | ---: |
| `ccbi-res/chapter/chapter-world/map01.png` | `client/assets/resources/ui/chapter/chapter-world/map01.png` | 8,853 |
| `ccbi-res/chapter/chapter-world/map02.png` | `client/assets/resources/ui/chapter/chapter-world/map02.png` | 7,910 |
| `ccbi-res/chapter/chapter-world/map03.png` | `client/assets/resources/ui/chapter/chapter-world/map03.png` | 8,377 |
| `ccbi-res/chapter/chapter-world/map04.png` | `client/assets/resources/ui/chapter/chapter-world/map04.png` | 5,844 |
| `ccbi-res/chapter/chapter-world/map05.png` | `client/assets/resources/ui/chapter/chapter-world/map05.png` | 7,555 |
| `ccbi-res/chapter/chapter-world/map06.png` | `client/assets/resources/ui/chapter/chapter-world/map06.png` | 9,414 |
| `ccbi-res/chapter/chapter-world/map07.png` | `client/assets/resources/ui/chapter/chapter-world/map07.png` | 5,424 |
| `ccbi-res/chapter/chapter-world/map08.png` | `client/assets/resources/ui/chapter/chapter-world/map08.png` | 6,138 |
| `ccbi-res/chapter/chapter-world/map09.png` | `client/assets/resources/ui/chapter/chapter-world/map09.png` | 5,773 |
| `ccbi-res/chapter/chapter-world/map10.png` | `client/assets/resources/ui/chapter/chapter-world/map10.png` | 10,134 |
| `ccbi-res/chapter/chapter-world/map11.png` | `client/assets/resources/ui/chapter/chapter-world/map11.png` | 10,845 |
| `ccbi-res/chapter/chapter-world/map12.png` | `client/assets/resources/ui/chapter/chapter-world/map12.png` | 9,535 |
| `ccbi-res/chapter/chapter-world/map13.png` | `client/assets/resources/ui/chapter/chapter-world/map13.png` | 9,857 |
| `ccbi-res/chapter/chapter-world/map14.png` | `client/assets/resources/ui/chapter/chapter-world/map14.png` | 9,698 |
| `ccbi-res/chapter/chapter-world/map15.png` | `client/assets/resources/ui/chapter/chapter-world/map15.png` | 6,166 |
| `ccbi-res/chapter/chapter-world/map16.png` | `client/assets/resources/ui/chapter/chapter-world/map16.png` | 6,015 |
| `ccbi-res/chapter/chapter-world/map17.png` | `client/assets/resources/ui/chapter/chapter-world/map17.png` | 9,652 |
| `ccbi-res/chapter/chapter-world/map18.png` | `client/assets/resources/ui/chapter/chapter-world/map18.png` | 10,251 |
| `ccbi-res/chapter/chapter-world/map19.png` | `client/assets/resources/ui/chapter/chapter-world/map19.png` | 8,048 |
| `ccbi-res/chapter/chapter-world/map20.png` | `client/assets/resources/ui/chapter/chapter-world/map20.png` | 8,543 |
| `ccbi-res/chapter/chapter-world/map21.png` | `client/assets/resources/ui/chapter/chapter-world/map21.png` | 6,827 |
| `ccbi-res/chapter/chapter-world/map22.png` | `client/assets/resources/ui/chapter/chapter-world/map22.png` | 8,108 |
| `ccbi-res/chapter/chapter-world/map23.png` | `client/assets/resources/ui/chapter/chapter-world/map23.png` | 8,077 |
| `ccbi-res/chapter/chapter-world/map24.png` | `client/assets/resources/ui/chapter/chapter-world/map24.png` | 8,012 |
| `ccbi-res/chapter/chapter-world/map25.png` | `client/assets/resources/ui/chapter/chapter-world/map25.png` | 7,838 |
| `ccbi-res/chapter/chapter-world/map26.png` | `client/assets/resources/ui/chapter/chapter-world/map26.png` | 8,862 |
| `ccbi-res/chapter/chapter-world/map27.png` | `client/assets/resources/ui/chapter/chapter-world/map27.png` | 6,761 |
| `ccbi-res/chapter/chapter-world/map28.png` | `client/assets/resources/ui/chapter/chapter-world/map28.png` | 5,967 |
| `ccbi-res/chapter/chapter-world/map31.png` | `client/assets/resources/ui/chapter/chapter-world/map31.png` | 8,928 |
| `ccbi-res/chapter/chapter-world/map32.png` | `client/assets/resources/ui/chapter/chapter-world/map32.png` | 6,685 |
| `ccbi-res/chapter/chapter-world/map33.png` | `client/assets/resources/ui/chapter/chapter-world/map33.png` | 6,378 |
| `ccbi-res/chapter/chapter-world/map34.png` | `client/assets/resources/ui/chapter/chapter-world/map34.png` | 7,195 |
| `ccbi-res/chapter/chapter-world/map35.png` | `client/assets/resources/ui/chapter/chapter-world/map35.png` | 10,247 |
| `ccbi-res/chapter/chapter-world/map36.png` | `client/assets/resources/ui/chapter/chapter-world/map36.png` | 7,134 |
| `ccbi-res/chapter/chapter-world/map37.png` | `client/assets/resources/ui/chapter/chapter-world/map37.png` | 10,190 |
| `ccbi-res/chapter/chapter-world/map38.png` | `client/assets/resources/ui/chapter/chapter-world/map38.png` | 7,465 |
| `ccbi-res/chapter/chapter-world/map39.png` | `client/assets/resources/ui/chapter/chapter-world/map39.png` | 4,941 |
| `ccbi-res/chapter/hang/map01_B.jpg` | `client/assets/resources/ui/chapter/hang/map01_B.jpg` | 78,868 |
| `ccbi-res/chapter/hang/map01_F.png` | `client/assets/resources/ui/chapter/hang/map01_F.png` | 627,110 |
| `ccbi-res/chapter/hang/map02_B.jpg` | `client/assets/resources/ui/chapter/hang/map02_B.jpg` | 117,980 |
| `ccbi-res/chapter/hang/map02_F.png` | `client/assets/resources/ui/chapter/hang/map02_F.png` | 241,698 |
| `ccbi-res/chapter/hang/map03_B.jpg` | `client/assets/resources/ui/chapter/hang/map03_B.jpg` | 156,692 |
| `ccbi-res/chapter/hang/map03_F.png` | `client/assets/resources/ui/chapter/hang/map03_F.png` | 179,587 |
| `ccbi-res/chapter/hang/map04_B.jpg` | `client/assets/resources/ui/chapter/hang/map04_B.jpg` | 97,794 |
| `ccbi-res/chapter/hang/map04_F.png` | `client/assets/resources/ui/chapter/hang/map04_F.png` | 63,833 |
| `ccbi-res/chapter/hang/map05_B.jpg` | `client/assets/resources/ui/chapter/hang/map05_B.jpg` | 101,869 |
| `ccbi-res/chapter/hang/map05_F.png` | `client/assets/resources/ui/chapter/hang/map05_F.png` | 132,812 |
| `ccbi-res/chapter/hang/map07_B.jpg` | `client/assets/resources/ui/chapter/hang/map07_B.jpg` | 91,891 |
| `ccbi-res/chapter/hang/map07_F.png` | `client/assets/resources/ui/chapter/hang/map07_F.png` | 125,776 |
| `ccbi-res/chapter/hang/map08_B.jpg` | `client/assets/resources/ui/chapter/hang/map08_B.jpg` | 87,756 |
| `ccbi-res/chapter/hang/map08_F.png` | `client/assets/resources/ui/chapter/hang/map08_F.png` | 100,585 |
| `ccbi-res/chapter/hang/map10_B.jpg` | `client/assets/resources/ui/chapter/hang/map10_B.jpg` | 123,406 |
| `ccbi-res/chapter/hang/map10_F.png` | `client/assets/resources/ui/chapter/hang/map10_F.png` | 238,980 |
| `ccbi-res/chapter/hang/map11_B.jpg` | `client/assets/resources/ui/chapter/hang/map11_B.jpg` | 201,390 |
| `ccbi-res/chapter/hang/map11_F.png` | `client/assets/resources/ui/chapter/hang/map11_F.png` | 236,793 |
| `ccbi-res/chapter/hang/map17_B.jpg` | `client/assets/resources/ui/chapter/hang/map17_B.jpg` | 180,169 |
| `ccbi-res/chapter/hang/map17_F.png` | `client/assets/resources/ui/chapter/hang/map17_F.png` | 233,985 |
| `ccbi-res/chapter/hang/map20_B.jpg` | `client/assets/resources/ui/chapter/hang/map20_B.jpg` | 92,097 |
| `ccbi-res/chapter/hang/map20_F.png` | `client/assets/resources/ui/chapter/hang/map20_F.png` | 190,876 |
| `ccbi-res/chapter/hang/map23_B.jpg` | `client/assets/resources/ui/chapter/hang/map23_B.jpg` | 63,855 |
| `ccbi-res/chapter/hang/map23_F.png` | `client/assets/resources/ui/chapter/hang/map23_F.png` | 187,837 |
| `ccbi-res/chapter/hang/map25_B.jpg` | `client/assets/resources/ui/chapter/hang/map25_B.jpg` | 117,282 |
| `ccbi-res/chapter/hang/map25_F.png` | `client/assets/resources/ui/chapter/hang/map25_F.png` | 80,774 |
| `ccbi-res/chapter/map01.jpg` | `client/assets/resources/ui/chapter/map01.jpg` | 342,520 |
| `ccbi-res/chapter/map02.jpg` | `client/assets/resources/ui/chapter/map02.jpg` | 84,970 |
| `ccbi-res/chapter/map03.jpg` | `client/assets/resources/ui/chapter/map03.jpg` | 116,206 |
| `ccbi-res/chapter/map04.jpg` | `client/assets/resources/ui/chapter/map04.jpg` | 43,686 |
| `ccbi-res/chapter/map05.jpg` | `client/assets/resources/ui/chapter/map05.jpg` | 50,531 |
| `ccbi-res/chapter/map07.jpg` | `client/assets/resources/ui/chapter/map07.jpg` | 49,690 |
| `ccbi-res/chapter/map08.jpg` | `client/assets/resources/ui/chapter/map08.jpg` | 60,847 |
| `ccbi-res/chapter/map10.jpg` | `client/assets/resources/ui/chapter/map10.jpg` | 98,176 |
| `ccbi-res/chapter/map11.jpg` | `client/assets/resources/ui/chapter/map11.jpg` | 117,335 |
| `ccbi-res/chapter/map17.jpg` | `client/assets/resources/ui/chapter/map17.jpg` | 106,219 |
| `ccbi-res/chapter/map20.jpg` | `client/assets/resources/ui/chapter/map20.jpg` | 73,606 |
| `ccbi-res/chapter/map23.jpg` | `client/assets/resources/ui/chapter/map23.jpg` | 77,401 |
| `ccbi-res/chapter/map25.jpg` | `client/assets/resources/ui/chapter/map25.jpg` | 64,783 |
| `ccbi-res/chapter/map31.jpg` | `client/assets/resources/ui/chapter/map31.jpg` | 56,934 |
| `ccbi-res/chapter/map32.jpg` | `client/assets/resources/ui/chapter/map32.jpg` | 40,911 |
| `ccbi-res/chapter/map33.jpg` | `client/assets/resources/ui/chapter/map33.jpg` | 114,070 |
| `ccbi-res/chapter/map35.jpg` | `client/assets/resources/ui/chapter/map35.jpg` | 82,743 |
| `ccbi-res/chapter/map36.jpg` | `client/assets/resources/ui/chapter/map36.jpg` | 49,362 |
| `ccbi-res/chapter/map37.jpg` | `client/assets/resources/ui/chapter/map37.jpg` | 289,008 |
| `ccbi-res/chapter/map38.jpg` | `client/assets/resources/ui/chapter/map38.jpg` | 53,256 |
| `ccbi-res/chapter/map39.jpg` | `client/assets/resources/ui/chapter/map39.jpg` | 30,727 |
| `ccbi-res/chapter/map40.jpg` | `client/assets/resources/ui/chapter/map40.jpg` | 52,665 |
| `ccbi-res/chapter/map41.jpg` | `client/assets/resources/ui/chapter/map41.jpg` | 185,525 |
| `ccbi-res/chapter/map54.jpg` | `client/assets/resources/ui/chapter/map54.jpg` | 165,722 |
| `ccbi-res/chapter/map55.jpg` | `client/assets/resources/ui/chapter/map55.jpg` | 161,877 |
| `ccbi-res/chapter/map70.jpg` | `client/assets/resources/ui/chapter/map70.jpg` | 340,897 |
| `ccbi-res/chapter/map71.jpg` | `client/assets/resources/ui/chapter/map71.jpg` | 262,334 |
| `ccbi-res/chapter_exoticadventure/hang/map01_B.jpg` | `client/assets/resources/ui/chapter_exoticadventure/hang/map01_B.jpg` | 115,658 |
| `ccbi-res/chapter_exoticadventure/hang/map01_F.jpg` | `client/assets/resources/ui/chapter_exoticadventure/hang/map01_F.jpg` | 388,999 |
| `ccbi-res/chapter_exoticadventure/map01.jpg` | `client/assets/resources/ui/chapter_exoticadventure/map01.jpg` | 388,999 |
| `ccbi-res/anti-addiction.jpg` | `client/assets/resources/ui/maps/anti-addiction.jpg` | 25,023 |
| `ccbi-res/astrolabe_bg.png` | `client/assets/resources/ui/maps/astrolabe_bg.png` | 217,696 |
| `ccbi-res/astrolabe_bg_2.png` | `client/assets/resources/ui/maps/astrolabe_bg_2.png` | 161,887 |
| `ccbi-res/astrolabe_bg_3.png` | `client/assets/resources/ui/maps/astrolabe_bg_3.png` | 148,125 |
| `ccbi-res/clergy-bg.jpg` | `client/assets/resources/ui/maps/clergy-bg.jpg` | 105,753 |
| `ccbi-res/exotic-adventure.jpg` | `client/assets/resources/ui/maps/exotic-adventure.jpg` | 108,564 |
| `ccbi-res/fantasy-land-hero-temple-bg.png` | `client/assets/resources/ui/maps/fantasy-land-hero-temple-bg.png` | 182,907 |
| `ccbi-res/fantasy-land-main-bg.png` | `client/assets/resources/ui/maps/fantasy-land-main-bg.png` | 384,252 |
| `ccbi-res/fashion-bg.png` | `client/assets/resources/ui/maps/fashion-bg.png` | 130,734 |
| `ccbi-res/league-portal-main-bg.png` | `client/assets/resources/ui/maps/league-portal-main-bg.png` | 1,256,422 |
| `ccbi-res/map-slzmbg.jpg` | `client/assets/resources/ui/maps/map-slzmbg.jpg` | 251,581 |
| `ccbi-res/mf_bg.png` | `client/assets/resources/ui/maps/mf_bg.png` | 245,887 |
| `ccbi-res/permanent-skin-main-bg.png` | `client/assets/resources/ui/maps/permanent-skin-main-bg.png` | 169,505 |
| `ccbi-res/pve_portal_bg.jpg` | `client/assets/resources/ui/maps/pve_portal_bg.jpg` | 163,494 |
| `ccbi-res/rainbow-bg.jpg` | `client/assets/resources/ui/maps/rainbow-bg.jpg` | 398,815 |
| `ccbi-res/reload.png` | `client/assets/resources/ui/maps/reload.png` | 944 |
| `ccbi-res/shenbing-main-bg.png` | `client/assets/resources/ui/maps/shenbing-main-bg.png` | 857,609 |
| `ccbi-res/shop_bg_1.png` | `client/assets/resources/ui/maps/shop_bg_1.png` | 468,162 |
| `ccbi-res/shop_bg_2.jpg` | `client/assets/resources/ui/maps/shop_bg_2.jpg` | 610,855 |
| `ccbi-res/shop_bg_3.jpg` | `client/assets/resources/ui/maps/shop_bg_3.jpg` | 105,873 |
| `ccbi-res/tile.png` | `client/assets/resources/ui/maps/tile.png` | 397,476 |
| `ccbi-res/underworld-pagoda-difficulty-1.jpg` | `client/assets/resources/ui/maps/underworld-pagoda-difficulty-1.jpg` | 90,623 |
| `ccbi-res/underworld-pagoda-difficulty-2.jpg` | `client/assets/resources/ui/maps/underworld-pagoda-difficulty-2.jpg` | 85,513 |
| `ccbi-res/underworld-pagoda-simple-1.jpg` | `client/assets/resources/ui/maps/underworld-pagoda-simple-1.jpg` | 86,328 |
| `ccbi-res/underworld-pagoda-simple-2.jpg` | `client/assets/resources/ui/maps/underworld-pagoda-simple-2.jpg` | 84,044 |
| `ccbi-res/star.png` | `client/assets/resources/ui/particle/star.png` | 12,900 |
| `ccbi-res/waft.plist` | `client/assets/resources/ui/particle/waft.plist` | 4,522 |
| `ccbi-res/five_one_rewardBg.png` | `client/assets/resources/ui/promo/five_one_rewardBg.png` | 175,073 |
| `ccbi-res/mp-festivanew-bg.png` | `client/assets/resources/ui/promo/mp-festivanew-bg.png` | 159,403 |
| `ccbi-res/promotion-66-01.png` | `client/assets/resources/ui/promo/promotion-66-01.png` | 283,055 |
| `ccbi-res/promotion-66-02.png` | `client/assets/resources/ui/promo/promotion-66-02.png` | 250,621 |
| `ccbi-res/promotion-halloween-bg.png` | `client/assets/resources/ui/promo/promotion-halloween-bg.png` | 243,615 |
| `ccbi-res/promtion-login-gift-bg.png` | `client/assets/resources/ui/promo/promtion-login-gift-bg.png` | 298,537 |
| `ccbi-res/spr-blackfriday-1.png` | `client/assets/resources/ui/promo/spr-blackfriday-1.png` | 95,549 |
| `ccbi-res/spr-luck-fish-big-reward.png` | `client/assets/resources/ui/promo/spr-luck-fish-big-reward.png` | 118,059 |
| `ccbi-res/spr-zhongqiu-jiayao.png` | `client/assets/resources/ui/promo/spr-zhongqiu-jiayao.png` | 206,327 |
| `ccbi-res/spr-zhongqiu-slot.png` | `client/assets/resources/ui/promo/spr-zhongqiu-slot.png` | 199,542 |
| `ccbi-res/summon_week_card_bg.png` | `client/assets/resources/ui/promo/summon_week_card_bg.png` | 228,348 |
| `ccbi-res/super-gift-bg.png` | `client/assets/resources/ui/promo/super-gift-bg.png` | 140,632 |
| `ccbi-res/super_summon_week_card_bg.png` | `client/assets/resources/ui/promo/super_summon_week_card_bg.png` | 217,035 |

## Meta

Image `.meta` files copy the shape and `ver` of the existing jpg/png metas in `client/assets/resources/ui/maps/` (65 files: 40 jpg, 25 png):

- Image importer `ver` `1.0.27`, `userData.type` `sprite-frame`
- `files` are `[".jpg", ".json"]` for jpg and `[".json", ".png"]` for png, same as `ui/maps`
- Texture sub-meta `6c48a` (`ver` `1.0.22`), clamp-to-edge, linear, mipfilter none
- Sprite-frame sub-meta `f9941` (`ver` `1.0.12`)
- `hasAlpha` is false for every jpg. For png it is true only when the file has an alpha channel or palette transparency. That is the same check as all 65 `ui/maps` image metas (12 of the new pngs are opaque and have `hasAlpha` false)
- `trimType` `auto`, `trimThreshold` `1` (pixels with alpha 0 or 1 sit outside the trim rect). Jpg has no alpha, so the trim rect is the full image. 49 pngs are trimmed; the other 28 pngs and all 55 jpgs use the full frame
- Quad vertices use the trim rect in top-left pixels, same layout as the sprite-frame metas under `ui/hero/`, `ui/battle/`, `ui/promo/`, and `battle/skill/`: `uv` is bottom-left, bottom-right, top-left, top-right; `nuv` is top-left, top-right, bottom-left, bottom-right
- Nine-slice borders are 0
- UUIDs are new v4. The 139 new uuids (132 images + 1 particle + 6 folders) do not collide with each other or with any uuid already in `client/`

`ui/particle/waft.plist` has no particle `.meta` anywhere else in the repo (no `.plist.meta` of any importer). It is written to the Creator 3.8.8 particle shape: importer `particle`, `ver` `1.0.1`, `imported` true, `files` `[".json", ".plist"]`, empty `subMetas` and `userData`. There is no in-repo version to copy. Creator may bump that `ver` the first time it opens the file. The plist itself is unchanged: `textureFileName` is `star.png` (the sibling `ui/particle/star.png`) and `textureImageData` is still embedded.

New folders each have a directory `.meta` copied from the existing directory metas under `client/assets/resources/ui/` (all 89 share one shape, including `ui/maps.meta`): importer `directory`, `ver` `1.2.0`, `imported` true, empty `files` / `subMetas` / `userData`, plus a new uuid.

| new folder meta |
| --- |
| `client/assets/resources/ui/chapter.meta` |
| `client/assets/resources/ui/chapter/hang.meta` |
| `client/assets/resources/ui/chapter/chapter-world.meta` |
| `client/assets/resources/ui/chapter_exoticadventure.meta` |
| `client/assets/resources/ui/chapter_exoticadventure/hang.meta` |
| `client/assets/resources/ui/particle.meta` |

`ui/maps` and `ui/promo` already had directory metas. Those files were not rewritten. No existing `.meta` was changed.

## Sibling batches

Loose-asset import is split across batches E1–E4. This PR is **E3** only (ccbi-res loose backgrounds and the waft particle).

| batch | in this PR |
| --- | --- |
| E1 | no — sibling, separate PR |
| E2 | no — sibling, separate PR |
| E3 | yes — 133 loose backgrounds and `waft.plist` |
| E4 | no — sibling, separate PR |

## Skipped (same content already on main)

Nothing was skipped. The manifest lists 133 paths, and every one of them was absent on `6a7e235e`. SHA-256 of those 133 files against existing `client/` png, jpg, and plist files of the same size found no byte-identical copy already on main. No basename under `client/` matches these filenames.

## Left untouched

No Prefab edits and no PNG copies added under prefabs. No Boot, no `USE_*`, no protocol scripts. No BattlePage `Bg` change. Existing resources and their `.meta` files are unchanged.
