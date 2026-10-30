# P4-f 羁绊/进化/图腾/宠物/其它（下） Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| FettersCastSoulLayer | `prefabs/ui/fetters/FettersCastSoulLayer.prefab` | 27 |
| FettersIllusionLayer | `prefabs/ui/fetters/FettersIllusionLayer.prefab` | 50 |
| FettersIllusionSmeltingLayer | `prefabs/ui/fetters/FettersIllusionSmeltingLayer.prefab` | 23 |
| FettersInfoBaptismCell | `prefabs/ui/fetters/FettersInfoBaptismCell.prefab` | 34 |
| FettersInfoLayer | `prefabs/ui/fetters/FettersInfoLayer.prefab` | 74 |
| FettersInfoLevelCell | `prefabs/ui/fetters/FettersInfoLevelCell.prefab` | 28 |
| FettersInfoRefineCell | `prefabs/ui/fetters/FettersInfoRefineCell.prefab` | 38 |
| FettersInfoSkillCell | `prefabs/ui/fetters/FettersInfoSkillCell.prefab` | 21 |
| FettersInfoUplimitCell | `prefabs/ui/fetters/FettersInfoUplimitCell.prefab` | 35 |
| FettersResultLayer | `prefabs/ui/fetters/FettersResultLayer.prefab` | 21 |
| FettersSelectCell | `prefabs/ui/fetters/FettersSelectCell.prefab` | 18 |
| FettersSelectLayer | `prefabs/ui/fetters/FettersSelectLayer.prefab` | 10 |
| HaloCell | `prefabs/ui/halo/HaloCell.prefab` | 5 |
| HaloLayer | `prefabs/ui/halo/HaloLayer.prefab` | 26 |
| HeroCreatCell | `prefabs/ui/hero-creat/HeroCreatCell.prefab` | 14 |
| HeroCreatLayer | `prefabs/ui/hero-creat/HeroCreatLayer.prefab` | 39 |
| MagicCubeDisboardLayer | `prefabs/ui/magic-cube/MagicCubeDisboardLayer.prefab` | 18 |
| MagicCubeLayer | `prefabs/ui/magic-cube/MagicCubeLayer.prefab` | 8 |
| MagicCubeSelectHeroLayer | `prefabs/ui/magic-cube/MagicCubeSelectHeroLayer.prefab` | 20 |
| PetIllustratLayer | `prefabs/ui/pet/PetIllustratLayer.prefab` | 15 |
| PetInfoIllustratLayer | `prefabs/ui/pet/PetInfoIllustratLayer.prefab` | 30 |
| PetInfoLayer | `prefabs/ui/pet/PetInfoLayer.prefab` | 60 |
| PetInfoTipsLayer | `prefabs/ui/pet/PetInfoTipsLayer.prefab` | 33 |
| PetSelectLayer | `prefabs/ui/pet/PetSelectLayer.prefab` | 12 |
| RemainsSelectLayer | `prefabs/ui/remains/RemainsSelectLayer.prefab` | 12 |
| ResonateLayer | `prefabs/ui/resonate/ResonateLayer.prefab` | 44 |
| TotemActiveCell | `prefabs/ui/totem/TotemActiveCell.prefab` | 10 |
| TotemInfoLayer | `prefabs/ui/totem/TotemInfoLayer.prefab` | 79 |
| TotemListLayer | `prefabs/ui/totem/TotemListLayer.prefab` | 14 |
| TotemNotActiveCell | `prefabs/ui/totem/TotemNotActiveCell.prefab` | 6 |
| TotemResetReViewLayer | `prefabs/ui/totem/TotemResetReViewLayer.prefab` | 13 |
| TotemSkillInfo | `prefabs/ui/totem/TotemSkillInfo.prefab` | 3 |
| TotemTipsLayer | `prefabs/ui/totem/TotemTipsLayer.prefab` | 33 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/misc/fetters_spr-Illusion-jdt1.png` | [0, 0, 10, 10] |
| `ui/misc/fetters_spr-bg-1.png` | [10, 10, 10, 10] |
| `ui/misc/fetters_spr-bg-2.png` | [10, 10, 10, 10] |
| `ui/common/win-bg_block-bg-25.png` | [13, 13, 13, 13] |
| `ui/common/win-bg_block-bg-12.png` | [9, 8, 29, 28] |

由更早的 P4 PR 改（本 PR 不碰）：

- `ui/dragon/dragon_block-1.png` → P4A
- `ui/common/win-bg_cell-bg-11.png` → P4A
- `ui/common/win-bg_block-bg-26.png` → P4B
- `ui/misc/fetters_spr-mainview-title.png` → P4F1

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/hero/hero-info_spr-hero-image-3.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）
- `ui/maps/map-bg-result-1.png` [150, 150, 10, 10]（edited by P3A）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/common/win-bg_cell-bg-1.png` [5, 5, 5, 5]（edited by P2B）
- `ui/common/rank_spr-paimingk-1.png` [10, 10, 10, 10]（edited by P3A）
- `ui/hero/hero-select_xian.png` [0, 0, 45, 3]（edited by P3A）
- `ui/common/win-bg_block-bg-15.png` [0, 0, 29, 29]（edited by P1）
- `ui/common/win-bg_win-bg-15.png` [9, 9, 9, 9]（edited by P3C）
- `ui/misc/totem_totem-xiaohaok.png` [5, 5, 5, 5]（edited by P2C）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `MagicCubeSelectHeroLayer:/MagicCubeSelectHeroLayer/spr_box` |
| `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `PetIllustratLayer:/PetIllustratLayer/spr_box` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FettersIllusionLayer:/FettersIllusionLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FettersSelectLayer:/FettersSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroCreatLayer:/HeroCreatLayer/node_layer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MagicCubeSelectHeroLayer:/MagicCubeSelectHeroLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PetIllustratLayer:/PetIllustratLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PetInfoLayer:/PetInfoLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ResonateLayer:/ResonateLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TotemInfoLayer:/TotemInfoLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TotemListLayer:/TotemListLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersCastSoulLayer:/FettersCastSoulLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersIllusionLayer:/FettersIllusionLayer/node_title/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersInfoBaptismCell:/FettersInfoBaptismCell/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersInfoLayer:/FettersInfoLayer/node_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersInfoLevelCell:/FettersInfoLevelCell/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersInfoRefineCell:/FettersInfoRefineCell/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersInfoSkillCell:/FettersInfoSkillCell/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersInfoUplimitCell:/FettersInfoUplimitCell/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FettersSelectLayer:/FettersSelectLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroCreatLayer:/HeroCreatLayer/node_layer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MagicCubeDisboardLayer:/MagicCubeDisboardLayer/CCScale9Sprite_2` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PetInfoLayer:/PetInfoLayer/not_pet/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PetSelectLayer:/PetSelectLayer/CCScale9Sprite_2` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RemainsSelectLayer:/RemainsSelectLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ResonateLayer:/ResonateLayer/CCScale9Sprite_2` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `TotemListLayer:/TotemListLayer/spr_panel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `TotemResetReViewLayer:/TotemResetReViewLayer/CCScale9Sprite_2` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [11, 11, 11, 11] | `FettersInfoLayer:/FettersInfoLayer/node_skill_info/spr_info` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [11, 11, 11, 11] | `FettersInfoLayer:/FettersInfoLayer/node_baptism_info/CCScale9Sprite_1` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `HaloLayer:/HaloLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `PetInfoIllustratLayer:/PetInfoIllustratLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `PetInfoTipsLayer:/PetInfoTipsLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `TotemTipsLayer:/TotemTipsLayer/spr_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [200, 50, 100, 100] | `FettersResultLayer:/FettersResultLayer/spr_bg` |
| `win-bg_cell-bg-1.png` | [5, 5, 5, 5] | [9, 9, 9, 9] | `TotemActiveCell:/TotemActiveCell/CCScale9Sprite_1` |
| `win-bg_cell-bg-1.png` | [5, 5, 5, 5] | [9, 9, 9, 9] | `TotemNotActiveCell:/TotemNotActiveCell/CCScale9Sprite_1` |
| `fetters_spr-mainview-title.png` | [0, 0, 50, 49] | [0, 0, 52, 51] | `FettersInfoLayer:/FettersInfoLayer/spr_name_bg` |
| `hero-select_xian.png` | [0, 0, 45, 3] | [0, 0, 45, 4] | `FettersCastSoulLayer:/FettersCastSoulLayer/CCScale9Sprite_2` |
| `hero-select_xian.png` | [0, 0, 45, 3] | [0, 0, 45, 4] | `FettersCastSoulLayer:/FettersCastSoulLayer/CCScale9Sprite_3` |
| `hero-select_xian.png` | [0, 0, 45, 3] | [0, 0, 45, 4] | `FettersIllusionLayer:/FettersIllusionLayer/node_view2/CCScale9Sprite_1` |
| `hero-select_xian.png` | [0, 0, 45, 3] | [0, 0, 45, 4] | `FettersIllusionLayer:/FettersIllusionLayer/node_view2/CCScale9Sprite_2` |
| `hero-select_xian.png` | [0, 0, 45, 3] | [0, 0, 45, 4] | `FettersIllusionLayer:/FettersIllusionLayer/node_view3/CCScale9Sprite_1` |
| `hero-select_xian.png` | [0, 0, 45, 3] | [0, 0, 45, 4] | `FettersIllusionLayer:/FettersIllusionLayer/node_view3/CCScale9Sprite_2` |
| `win-bg_win-bg-15.png` | [9, 9, 9, 9] | [19, 19, 59, 59] | `HeroCreatCell:/HeroCreatCell/CCScale9Sprite_1` |
| `totem_totem-xiaohaok.png` | [5, 5, 5, 5] | [10, 10, 10, 10] | `ResonateLayer:/ResonateLayer/CCScale9Sprite_3` |
| `totem_totem-xiaohaok.png` | [5, 5, 5, 5] | [10, 10, 10, 10] | `TotemInfoLayer:/TotemInfoLayer/node_cost/CCScale9Sprite_1` |
| `totem_totem-xiaohaok.png` | [5, 5, 5, 5] | [10, 10, 10, 10] | `TotemInfoLayer:/TotemInfoLayer/node_cost/CCScale9Sprite_2` |

## FettersCastSoulLayer（27）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersCastSoulLayer` | FettersCastSoulLayer | [0, 0] | [0, 0] | [522, 594] | [1, 1] | 0 | 是 |  |
| `/FettersCastSoulLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [522.0, 594.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/FettersCastSoulLayer/node_title` | CCNode | [261.0, 594.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersCastSoulLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FettersCastSoulLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「铸 魂」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FettersCastSoulLayer/UILabelTTF_1` | UILabelTTF | [261.0, 500.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前属性」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/FettersCastSoulLayer/spr_scroll_bg` | CCScale9Sprite | [261.0, 165.0] | [0.5, 0.5] | [489, 272] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersCastSoulLayer/UILabelTTF_2` | UILabelTTF | [168.0, 322.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前已使用：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/FettersCastSoulLayer/lbl_select_num` | UILabelTTF | [295.7, 321.958] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/0」24 STZhongsong.ttf rgb[141, 89, 58] |
| `/FettersCastSoulLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersCastSoulLayer/menu/btn_confirm` | UIMenuItemLabel | [261, 66] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「使 用」48 [255, 255, 255, 255] |
| `/FettersCastSoulLayer/menu/btn_sub` | UIMenuItemImage | [102, 147.56] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-sub-1.png` b7b37bfa-f87d-44b7-904d-6f7cd8baacda |
| `/FettersCastSoulLayer/menu/btn_add` | UIMenuItemImage | [368, 147.56] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-add-1.png` 55ea79d1-a919-4011-a3b6-c40c1738aba0 |
| `/FettersCastSoulLayer/menu/btn_max` | UIMenuItemImage | [423, 147.56] | [0.5, 0.5] | [58, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-max-1.png` 508d15ad-b1a1-427c-b4e6-5b8ffc841daa |
| `/FettersCastSoulLayer/menu/btn_close` | UIMenuItemImage | [473, 572.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FettersCastSoulLayer/prog_bg` | CCSprite | [236, 145.6] | [0.5, 0.5] | [202, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/buy/buy_prog-bg-1.png` 76d2b6c4-3f62-4c49-9089-5d420935e7f3 |
| `/FettersCastSoulLayer/CCScale9Sprite_2` | CCScale9Sprite | [130.5, 497.889] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/FettersCastSoulLayer/CCScale9Sprite_3` | CCScale9Sprite | [391.5, 496.889] | [0.5, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/FettersCastSoulLayer/CCSprite_1` | CCSprite | [255, 417.411] | [0.5, 0.5] | [622, 4] | [0.35, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/FettersCastSoulLayer/CCSprite_2` | CCSprite | [255, 359.954] | [0.5, 0.5] | [622, 4] | [0.35, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/FettersCastSoulLayer/UILabelTTF_3` | UILabelTTF | [261.0, 110.66] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「来源：充值活动」18 STZhongsong.ttf rgb[141, 89, 58] |
| `/FettersCastSoulLayer/UILabelTTF_4` | UILabelTTF | [202.54, 446.351] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」24 STZhongsong.ttf rgb[197, 113, 86] |
| `/FettersCastSoulLayer/UILabelTTF_5` | UILabelTTF | [202.54, 387.58] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」24 STZhongsong.ttf rgb[197, 113, 86] |
| `/FettersCastSoulLayer/lbl_attr_220` | UILabelTTF | [270.22, 446.351] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+0」24 HYZhongJianHeiJ.ttf rgb[197, 113, 86] |
| `/FettersCastSoulLayer/lbl_attr_223` | UILabelTTF | [270.22, 387.536] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+0」24 HYZhongJianHeiJ.ttf rgb[197, 113, 86] |
| `/FettersCastSoulLayer/CCSprite_3` | CCSprite | [173, 444] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-4.png` ec5db45d-a43e-41c3-ada2-53fe40ef452c |
| `/FettersCastSoulLayer/CCSprite_4` | CCSprite | [173, 386.6] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-3.png` 50f266f7-bc47-4b62-8151-1de58dee67f0 |

## FettersIllusionLayer（50）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersIllusionLayer` | FettersIllusionLayer | [0, 0] | [0, 0] | [640, 832] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/spr_bg` | CCScale9Sprite | [320.0, 416.0] | [0.5, 0.5] | [640, 832] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FettersIllusionLayer/node_title` | CCNode | [320.0, 824.512] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/node_title/spr_title_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FettersIllusionLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「羁绊幻化」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/FettersIllusionLayer/node_title/CCSprite_1` | CCSprite | [0, -273.6] | [0.5, 0.5] | [560, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-Illusion-2.png` 0494779b-1ffa-4873-93cd-ce317878d589 |
| `/FettersIllusionLayer/node_title/CCScale9Sprite_1` | CCScale9Sprite | [-282.77, -774.581] | [0.5, 0.5] | [567, 251] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersIllusionLayer/node_title/node_spin` | CCNode | [0, -416] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/node_title/CCSprite_2` | CCSprite | [0, -109.92] | [0.5, 0.5] | [229, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-Illusion-4.png` d0836019-e5b2-48dd-a4c8-f65caf59c12f |
| `/FettersIllusionLayer/node_title/lbl_name` | UILabelTTF | [-1.44, -113.12] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「羁绊幻化1」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/FettersIllusionLayer/node_title/CCSprite_3` | CCSprite | [0, -413.28] | [0.5, 0.5] | [442, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-Illusion-3.png` cce13271-804a-42f6-a165-ba79fc4a9241 |
| `/FettersIllusionLayer/node_title/UILabelTTF_1` | UILabelTTF | [-125.28, -391] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「解锁效果」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/FettersIllusionLayer/node_title/UILabelTTF_2` | UILabelTTF | [-125.28, -440] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「有效时间」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/FettersIllusionLayer/node_title/lbl_unlock_effect` | UILabelTTF | [-64, -391] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「有效时间3333」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/FettersIllusionLayer/node_title/lbl_time` | UILabelTTF | [-64, -440] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「有效时间111113333」44 CloudYuanCuGBK.ttf rgb[28, 158, 0] |
| `/FettersIllusionLayer/CCNode_1` | CCNode | [578.0, 824.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FettersIllusionLayer/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/CCMenu_1/btn_left` | UIMenuItemImage | [76.0, 555] | [0.5, 0.5] | [106, 129] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/FettersIllusionLayer/CCMenu_1/btn_right` | UIMenuItemImage | [564, 558] | [0.5, 0.5] | [106, 129] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/FettersIllusionLayer/CCMenu_1/btn_Illusion` | UIMenuItemLabel | [559, 397] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-Illusion-2.png` 3cf04914-d2d5-45a2-9f88-09e94014157c · Label「熔炼池」40 [255, 255, 255, 255] |
| `/FettersIllusionLayer/node_view1` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersIllusionLayer/node_view1/scroll_view` | CCScrollView | [41.6, 53.8] | [0, 0] | [560, 245] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/FettersIllusionLayer/node_view1/UILabelTTF_1` | UILabelTTF | [101.952, 323.048] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前进度」24 CloudYuanCuGBK.ttf rgb[141, 89, 46] |
| `/FettersIllusionLayer/node_view1/spr_view1_progress_bg` | CCScale9Sprite | [345.136, 324.12] | [0.5, 0.5] | [360, 18] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-Illusion-jdt1.png` 0397067e-33d4-4410-9b7a-992ab3884a4a insets[0, 0, 10, 10] |
| `/FettersIllusionLayer/node_view1/lbl_view1_progress` | UILabelTTF | [341.12, 323.32] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999/999」18 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/FettersIllusionLayer/node_view1/node_view1_btn` | CCMenu | [324.0, 95.04] | [0, 0] | [640, 960] | [1, 1] | 0 | **否** |  |
| `/FettersIllusionLayer/node_view1/node_view1_btn/btn_view1_activation` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「激活」48 [255, 255, 255, 255] |
| `/FettersIllusionLayer/node_view2` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersIllusionLayer/node_view2/node_progress` | CCNode | [338.195, 177.083] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/node_view2/node_progress/spr_view2_progress_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [406, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_progress-bg.png` c43c79e0-30f2-4560-972f-02f1673f58a4 |
| `/FettersIllusionLayer/node_view2/lbl_view2_progress` | UILabelTTF | [333, 177] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/1」20 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/FettersIllusionLayer/node_view2/node_view2_btn` | CCMenu | [331.667, 82.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/node_view2/node_view2_btn/btn_view2_activation` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「激活」48 [255, 255, 255, 255] |
| `/FettersIllusionLayer/node_view2/lbl_vip` | UILabelTTF | [328.0, 324] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「羁绊灵力进度」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/FettersIllusionLayer/node_view2/CCScale9Sprite_1` | CCScale9Sprite | [116, 322] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/FettersIllusionLayer/node_view2/CCScale9Sprite_2` | CCScale9Sprite | [451, 322] | [0, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/FettersIllusionLayer/node_view3` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersIllusionLayer/node_view3/CCScale9Sprite_1` | CCScale9Sprite | [116, 322] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/FettersIllusionLayer/node_view3/CCScale9Sprite_2` | CCScale9Sprite | [451, 322] | [0, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/FettersIllusionLayer/node_view3/lbl_vip` | UILabelTTF | [328.0, 324] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全隊基礎屬性」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/FettersIllusionLayer/node_view3/CCMenu_1` | CCMenu | [328, 116.4] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionLayer/node_view3/CCMenu_1/btn_cancelwear` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「取消幻化」40 [255, 255, 255, 255] |
| `/FettersIllusionLayer/node_view3/CCMenu_1/btn_wear` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「幻化」40 [255, 255, 255, 255] |
| `/FettersIllusionLayer/node_view3/CCSprite_1` | CCSprite | [84, 227] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/FettersIllusionLayer/node_view3/CCSprite_2` | CCSprite | [359, 227] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/FettersIllusionLayer/node_view3/lbl_attack` | UILabelTTF | [131, 225] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队攻击：ggg」20 CloudYuanCuGBK.ttf rgb[138, 85, 51] |
| `/FettersIllusionLayer/node_view3/lbl_hp` | UILabelTTF | [414, 225] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队攻击：」20 CloudYuanCuGBK.ttf rgb[138, 85, 51] |
| `/FettersIllusionLayer/node_view3/lbl_wear_name` | UILabelTTF | [319, 70] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已经幻化：xxxxx」20 CloudYuanCuGBK.ttf rgb[138, 85, 51] |

## FettersIllusionSmeltingLayer（23）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersIllusionSmeltingLayer` | FettersIllusionLayer | [0, 0] | [0, 0] | [640, 544] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/spr_bg` | CCScale9Sprite | [320.0, 272.0] | [0.5, 0.5] | [640, 544] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/FettersIllusionSmeltingLayer/node_title` | CCNode | [320.0, 539.104] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/node_title/spr_title_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/FettersIllusionSmeltingLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「熔炼池」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/FettersIllusionSmeltingLayer/node_title/CCSprite_1` | CCSprite | [8, -239] | [0.5, 0.5] | [542, 324] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-Illusion-1.png` 01e70797-1de5-4a6e-9ec0-220aaa6a3d43 |
| `/FettersIllusionSmeltingLayer/node_title/UILabelTTF_1` | UILabelTTF | [0, -488.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「羈絆幻化公用羈絆靈力，羈絆靈力可啟動羈絆永久幻化」20 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/FettersIllusionSmeltingLayer/node_title/UILabelTTF_2` | UILabelTTF | [0, -95.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可以把羈絆之心等提煉成羈絆靈力」22 CloudYuanCuGBK.ttf rgb[255, 232, 193] |
| `/FettersIllusionSmeltingLayer/node_title/CCSprite_2` | CCSprite | [-118, -229] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/FettersIllusionSmeltingLayer/node_title/CCSprite_3` | CCSprite | [134, -229] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/FettersIllusionSmeltingLayer/CCNode_1` | CCNode | [579.0, 535.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [7, 5] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FettersIllusionSmeltingLayer/CCMenu_1` | CCMenu | [320.0, 99.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/CCMenu_1/btn_add` | UIMenuItemLabel | [-111.792, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「快速添加」40 [255, 255, 255, 255] |
| `/FettersIllusionSmeltingLayer/CCMenu_1/btn_sure` | UIMenuItemLabel | [143.04, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「熔炼」40 [255, 255, 255, 255] |
| `/FettersIllusionSmeltingLayer/CCNode_2` | CCNode | [267.0, 169.0] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/CCNode_2/CCSprite_1` | CCSprite | [61.0, 0.0] | [0.5, 0.5] | [122, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_k.png` f55134e3-ae76-4395-9051-a90f32c28ebe |
| `/FettersIllusionSmeltingLayer/CCNode_2/lbl_num` | UILabelTTF | [68, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 CloudYuanCuGBK.ttf rgbNone |
| `/FettersIllusionSmeltingLayer/CCNode_2/spr_icon` | CCSprite | [7.0, 1.0] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900601.png` 4fc7144a-58ee-4df1-8dbb-eacc447f3d8b |
| `/FettersIllusionSmeltingLayer/CCNode_2/CCMenu_1` | CCMenu | [-1, 6.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersIllusionSmeltingLayer/CCNode_2/CCMenu_1/btn_iteminfo` | UIMenuItemLabel | [7, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersIllusionSmeltingLayer/menu_item` | CCMenu | [320.0, 310.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## FettersInfoBaptismCell（34）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersInfoBaptismCell` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 166.08] | [0.5, 0] | [540.0, -120.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersInfoBaptismCell/node_lower` | CCNode | [320.0, 168.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_lower/node_up` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_lower/node_up/CCSprite_1` | CCSprite | [-125, 34.2] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoBaptismCell/node_lower/node_up/spr_battle_count_icon_bg` | CCSprite | [-191, 33.2] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoBaptismCell/node_lower/node_up/spr_material1` | CCSprite | [-191, 33.2] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901501.png` 06f8e68c-4cb5-45c7-bd35-097f6e63350c |
| `/FettersInfoBaptismCell/node_lower/node_up/lbl_material1` | UILabelTTF | [-119, 34.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/FettersInfoBaptismCell/node_lower/node_up/CCSprite_2` | CCSprite | [136, 34.2] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoBaptismCell/node_lower/node_up/spr_battle_count_icon_bg` | CCSprite | [68, 33.2] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoBaptismCell/node_lower/node_up/spr_material2` | CCSprite | [68, 33.2] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/FettersInfoBaptismCell/node_lower/node_up/lbl_material2` | UILabelTTF | [140, 34.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/FettersInfoBaptismCell/node_lower/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_lower/CCMenu_1/btn_level` | UIMenuItemLabel | [0, -41] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-7.png` dc102352-b445-4518-872a-edd8fe0c63c9 · Label「洗 炼」60 [255, 255, 255, 255] |
| `/FettersInfoBaptismCell/node_lower/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_lower/CCMenu_2/btn_iteminfo1` | UIMenuItemLabel | [-192, 35] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoBaptismCell/node_lower/CCMenu_2/btn_iteminfo2` | UIMenuItemLabel | [67, 35] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoBaptismCell/node_up` | CCNode | [320.0, 216.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_up/spr_greenarrow` | CCSprite | [0, 99] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/FettersInfoBaptismCell/node_up/spr_yellowarrow` | CCSprite | [0, 30.741] | [0.5, 0.5] | [50, 28] | [0.6, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_skill-arrow.png` 93accc90-1585-44a0-b8a1-57797ab417ef |
| `/FettersInfoBaptismCell/node_up/lbl_text1` | UILabelTTF | [-173.957, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「洗炼等级：」22 FZCSJW--GB1-0.ttf rgb[223, 95, 30] |
| `/FettersInfoBaptismCell/node_up/lbl_now_level` | UILabelTTF | [-69.093, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」22 FZCSJW--GB1-0.ttf rgb[223, 95, 30] |
| `/FettersInfoBaptismCell/node_up/lbl_text2` | UILabelTTF | [36.589, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「洗炼等级：」22 FZCSJW--GB1-0.ttf rgb[223, 95, 30] |
| `/FettersInfoBaptismCell/node_up/lbl_next_level` | UILabelTTF | [142.367, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」22 FZCSJW--GB1-0.ttf rgb[223, 95, 30] |
| `/FettersInfoBaptismCell/node_up/node_attr1` | CCNode | [-219.733, 29.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_up/node_attr1/lbl_attr1` | UILabelTTF | [185.333, 3] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 FZCSJW--GB1-0.ttf rgb[0, 142, 0] |
| `/FettersInfoBaptismCell/node_up/node_attr3` | CCNode | [16.2, 29.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_up/node_attr3/lbl_attr3` | UILabelTTF | [21.5, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 FZCSJW--GB1-0.ttf rgb[0, 142, 0] |
| `/FettersInfoBaptismCell/node_maxlevel` | CCNode | [320.0, 240.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoBaptismCell/node_maxlevel/lbl_maxtext1` | UILabelTTF | [-73.957, 42] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「洗炼等级：」22 FZCSJW--GB1-0.ttf rgb[223, 95, 30] |
| `/FettersInfoBaptismCell/node_maxlevel/lbl_max_level` | UILabelTTF | [30.907, 42] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「120」22 FZCSJW--GB1-0.ttf rgb[223, 95, 30] |
| `/FettersInfoBaptismCell/node_maxlevel/lbl_tip` | UILabelTTF | [0.6, -18.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已达到最大等级」30 FZCSJW--GB1-0.ttf rgb[118, 60, 24] |
| `/FettersInfoBaptismCell/node_gradelimit` | CCNode | [320.0, 240.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoBaptismCell/node_gradelimit/lbl_limit` | UILabelTTF | [0, -61] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「羁绊4级可以继续升级」20 FZCSJW--GB1-0.ttf rgb[162, 0, 0] |

## FettersInfoLayer（74）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersInfoLayer` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 960] | [1.35, 1.35] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-fetters-mainview-1.jpg` 9bc420be-f571-46b9-b6ce-827abd0b577f |
| `/FettersInfoLayer/node_up` | CCNode | [3.092, 331.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_up/UIMenu_1` | UIMenu | [0, 20] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_up/UIMenu_1/btn_level` | UIMenuItemTab | [78, 15] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「升级」40 [109, 75, 48, 255] |
| `/FettersInfoLayer/node_up/UIMenu_1/btn_skill` | UIMenuItemTab | [219, 15] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「技能」40 [109, 75, 48, 255] |
| `/FettersInfoLayer/node_up/UIMenu_1/btn_uplimit` | UIMenuItemTab | [361, 15] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「突破」40 [109, 75, 48, 255] |
| `/FettersInfoLayer/node_up/UIMenu_1/btn_baptism` | UIMenuItemTab | [503, 15] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「洗炼」40 [109, 75, 48, 255] |
| `/FettersInfoLayer/node_up/UIMenu_1/btn_refine` | UIMenuItemTab | [522, 15] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「精炼」40 [109, 75, 48, 255] |
| `/FettersInfoLayer/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/CCMenu_1/btn_left` | UIMenuItemImage | [82, 834.72] | [0.5, 0.5] | [106, 129] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/FettersInfoLayer/CCMenu_1/btn_right` | UIMenuItemImage | [725, 835.72] | [0.5, 0.5] | [106, 129] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/FettersInfoLayer/spr_name_bg` | CCScale9Sprite | [320.0, 803.85] | [0.5, 0.5] | [430, 62] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-mainview-title.png` cc2cee7a-9639-44a5-9c8f-76464ea797a2 insets[0, 0, 52, 52] |
| `/FettersInfoLayer/lbl_name` | UILabelTTF | [323.865, 805.35] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「羁绊的昵称+2 「精炼+2」」30 STZhongsong.ttf rgbNone |
| `/FettersInfoLayer/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 87.0] | [0.5, 0] | [640.0, 26.0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-mainview-scrollview-bg.png` 41d25a8e-499a-4a03-9f15-0ff5e1f63b95 |
| `/FettersInfoLayer/node_bg` | CCScale9Sprite | [320.0, 114.75] | [0.5, 0] | [570.0, -90.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersInfoLayer/node_skill_info` | CCNode | [320.0, 384.96] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_skill_info/spr_info` | CCScale9Sprite | [0, 0] | [0.5, 0] | [300, 146] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[12, 12, 12, 12] |
| `/FettersInfoLayer/node_skill_info/lbl_info_text` | UILabelTTF | [0, 115] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能加成」20 FZCSJW--GB1-0.ttf rgb[255, 134, 0] |
| `/FettersInfoLayer/node_skill_info/lbl_skill1` | UILabelTTF | [-117, 85] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能加成1」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_skill_info/lbl_skill2` | UILabelTTF | [-117, 60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能加成2」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_skill_info/lbl_skill3` | UILabelTTF | [-117, 35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能加成3」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_skill_info/lbl_skill4` | UILabelTTF | [-135, 21] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能加成4」18 FZCSJW--GB1-0.ttf rgbNone |
| `/FettersInfoLayer/node_baptism_info` | CCNode | [320.0, 384.0] | [0.5, 0] | [640.0, -174.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_baptism_info/CCScale9Sprite_1` | CCScale9Sprite | [-320.0, 0.0] | [0.5, 0.5] | [640.0, -174.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[12, 12, 12, 12] |
| `/FettersInfoLayer/node_baptism_info/CCNode_1` | CCNode | [0.0, -146.589] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_baptism_info/CCNode_1/CCSprite_1` | CCSprite | [55.676, -16.5] | [0, 0] | [154, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/FettersInfoLayer/node_baptism_info/CCNode_1/CCSprite_2` | CCSprite | [-56.234, -16.512] | [0, 0] | [154, 28] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/FettersInfoLayer/node_baptism_info/CCNode_1/lbl_baptism_info_text` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「洗炼加成」20 FZCSJW--GB1-0.ttf rgb[255, 134, 0] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism1` | UILabelTTF | [-276.893, -113.219] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism2` | UILabelTTF | [-108.926, -113.219] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism3` | UILabelTTF | [62.014, -113.219] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism4` | UILabelTTF | [215.86, -113.219] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism5` | UILabelTTF | [-276.893, -71.507] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism6` | UILabelTTF | [-108.926, -71.507] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 STZhongsong.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism7` | UILabelTTF | [62.014, -71.507] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 STZhongsong.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism8` | UILabelTTF | [215.86, -71.507] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 STZhongsong.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism9` | UILabelTTF | [-276.893, -29.795] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 STZhongsong.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_baptism_info/lbl_baptism10` | UILabelTTF | [-108.926, -29.795] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击:0.0%」18 STZhongsong.ttf rgb[255, 229, 191] |
| `/FettersInfoLayer/node_view` | CCNode | [14.173, 379.71] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_view/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_view/CCMenu_1/btn_view` | UIMenuItemLabel | [50, 41.1] | [0.5, 0.5] | [78, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_spr-role-view-tille.png` 0987f91d-bef1-4c1b-ad08-20b6fd60f8c6 · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_view/CCMenu_1/btn_reset` | UIMenuItemLabel | [50, 108.1] | [0.5, 0.5] | [78, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_spr-role-view-tille.png` 0987f91d-bef1-4c1b-ad08-20b6fd60f8c6 · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_view/CCMenu_1/btn_soul` | UIMenuItemLabel | [50, 195.667] | [0.5, 0.5] | [66, 75] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-lang_btn-soul-1.png` 8efef8db-a23e-46f1-a1d8-f1faf1551c18 · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_view/CCMenu_1/btn_Illusion` | UIMenuItemLabel | [137.5, 195.7] | [0.5, 0.5] | [66, 75] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-Illusion-1.png` 359b5800-4efe-4e79-94cf-2f656089e9bf · Label「幻 化」40 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_vip` | CCNode | [600.58, 384.96] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_vip/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_vip/CCMenu_1/btn_all` | UIMenuItemLabel | [-48.955, 41.122] | [0.5, 0.5] | [149, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-wear-1.png` 4b3c7910-1335-468a-97ad-626280579c6d · Label「羁绊之力」24 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_vip/CCMenu_1/btn_vip` | UIMenuItemLabel | [-49, 108.1] | [0.5, 0.5] | [126, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-mainview-vip.png` a0173f92-a713-469e-ba6f-9f0349a15e6d · Label「VIP权益」24 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_skill` | CCNode | [320.0, 345.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_skill/CCSprite_1` | CCSprite | [0, 57] | [0.5, 0.5] | [626, 114] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-skill-info.png` 2f6ad10c-4ccf-4d57-a8ae-3a6bc07f5721 |
| `/FettersInfoLayer/node_skill/CCSprite_2` | CCSprite | [-251, 57] | [0.5, 0.5] | [78, 78] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_210010001.png` 1d452993-8008-4647-a19a-b0d4e44ca064 |
| `/FettersInfoLayer/node_skill/lbl_skill_name` | UILabelTTF | [-205, 83] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名称」20 STZhongsong.ttf rgb[139, 71, 21] |
| `/FettersInfoLayer/node_skill/lbl_des` | UILabelTTF | [-205, 67] | [0, 1] | [500, 70] | [1, 1] | 0 | 是 | cc.Label「技能名称」15 STZhongsong.ttf rgb[74, 40, 4] |
| `/FettersInfoLayer/node_unlock` | CCNode | [320.0, 207.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_unlock/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [189, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-unlock-1.png` 653bd118-3ba1-4211-8128-518fda219e54 |
| `/FettersInfoLayer/node_attr` | CCNode | [320.0, 195.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_attr/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_attr/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_attr/CCNode_1/CCMenu_1/UIMenuItemLabel_1` | UIMenuItemLabel | [0, -58] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「去探险」60 [255, 255, 255, 255] |
| `/FettersInfoLayer/node_attr/CCScale9Sprite_1` | CCScale9Sprite | [-248, 50] | [0.5, 0.5] | [230, 38] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-bg-1.png` 36e25261-08ae-417d-86d3-961009ddc4d0 insets[10, 10, 10, 10] |
| `/FettersInfoLayer/node_attr/CCSprite_1` | CCSprite | [-219, 68] | [0.5, 0.5] | [23, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-hp-1.png` 2d7feb28-6f6e-4d0e-8a16-1954cb7b8150 |
| `/FettersInfoLayer/node_attr/UILabelTTF_1` | UILabelTTF | [-202, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队生命：」20 STZhongsong.ttf rgb[117, 60, 29] |
| `/FettersInfoLayer/node_attr/lbl_hp` | UILabelTTF | [-108, 68] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[117, 60, 29] |
| `/FettersInfoLayer/node_attr/CCScale9Sprite_2` | CCScale9Sprite | [21, 50] | [0.5, 0.5] | [230, 38] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-bg-1.png` 36e25261-08ae-417d-86d3-961009ddc4d0 insets[10, 10, 10, 10] |
| `/FettersInfoLayer/node_attr/CCSprite_2` | CCSprite | [50, 70] | [0.5, 0.5] | [20, 25] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-attack-1.png` 1da7c302-f8be-4e1c-844e-f1fb6e62a411 |
| `/FettersInfoLayer/node_attr/UILabelTTF_2` | UILabelTTF | [67, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队攻击：」20 STZhongsong.ttf rgb[117, 60, 29] |
| `/FettersInfoLayer/node_attr/lbl_attack` | UILabelTTF | [161, 68] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[117, 60, 29] |
| `/FettersInfoLayer/node_attr/UILabelTTF_3` | UILabelTTF | [0, 11] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「出战界面选择穿戴激活神奇技能和主属性」20 STZhongsong.ttf rgb[73, 37, 3] |
| `/FettersInfoLayer/node_attr/CCSprite_3` | CCSprite | [0, 151] | [0.5, 0.5] | [476, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-unlock-tips.png` f6a7659e-fffa-4f37-bcd7-14599e47ebc4 |
| `/FettersInfoLayer/menu_back` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/menu_back/btn_back` | UIMenuItemImage | [1395, 2190.88] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/FettersInfoLayer/node_soul` | CCNode | [640.0, 805.44] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLayer/node_soul/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## FettersInfoLevelCell（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersInfoLevelCell` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLevelCell/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 169.56] | [0.5, 0] | [570.0, -152.5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersInfoLevelCell/lbl_name` | UILabelTTF | [320.0, 314.64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队基础属性」25 STZhongsong.ttf rgb[119, 67, 39] |
| `/FettersInfoLevelCell/CCNode_1` | CCNode | [320.0, 168.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLevelCell/CCNode_1/node_up` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLevelCell/CCNode_1/node_up/spr_exp_bg` | CCSprite | [0, 79.3] | [0.5, 0.5] | [496, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-jdt1.png` 9088f9dc-15b8-4e89-9111-3ff02ede10b2 |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCSprite_1` | CCSprite | [-125, 34.2] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoLevelCell/CCNode_1/node_up/spr_battle_count_icon_bg` | CCSprite | [-190, 33.2] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoLevelCell/CCNode_1/node_up/spr_material1` | CCSprite | [-190, 33.2] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901501.png` 06f8e68c-4cb5-45c7-bd35-097f6e63350c |
| `/FettersInfoLevelCell/CCNode_1/node_up/lbl_material1` | UILabelTTF | [-119, 34.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCSprite_2` | CCSprite | [136, 34.2] | [0.5, 0.5] | [178, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoLevelCell/CCNode_1/node_up/spr_battle_count_icon_bg` | CCSprite | [60, 33.2] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoLevelCell/CCNode_1/node_up/spr_material2` | CCSprite | [60, 33.2] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/FettersInfoLevelCell/CCNode_1/node_up/lbl_material2` | UILabelTTF | [145, 33.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FettersInfoLevelCell/CCNode_1/node_up/lbl_exp` | UILabelTTF | [0, 79.3] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「30/1000」20 STZhongsong.ttf rgbNone |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCMenu_1/btn_level` | UIMenuItemLabel | [-129, -41.2] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「升级」48 [255, 255, 255, 255] |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCMenu_1/btn_auto` | UIMenuItemLabel | [134, -41.2] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「一键升级」48 [255, 255, 255, 255] |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCMenu_2/btn_iteminfo1` | UIMenuItemLabel | [-192, 35] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoLevelCell/CCNode_1/node_up/CCMenu_2/btn_iteminfo2` | UIMenuItemLabel | [67, 35] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoLevelCell/CCNode_1/CCSprite_1` | CCSprite | [-248.28, 125.16] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/FettersInfoLevelCell/CCNode_1/UILabelTTF_1` | UILabelTTF | [-200.56, 124.28] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队攻击：」20 STZhongsong.ttf rgb[138, 85, 51] |
| `/FettersInfoLevelCell/CCNode_1/lbl_attack` | UILabelTTF | [-106.56, 124.28] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[138, 85, 51] |
| `/FettersInfoLevelCell/CCNode_1/CCSprite_2` | CCSprite | [33.76, 123.72] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/FettersInfoLevelCell/CCNode_1/UILabelTTF_2` | UILabelTTF | [79.96, 124.28] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全队生命：」20 STZhongsong.ttf rgb[138, 85, 51] |
| `/FettersInfoLevelCell/CCNode_1/lbl_hp` | UILabelTTF | [173.96, 124.28] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[138, 85, 51] |
| `/FettersInfoLevelCell/CCNode_1/lbl_tip` | UILabelTTF | [0, 35.28] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已达到最大等级」25 STZhongsong.ttf rgb[118, 60, 24] |

## FettersInfoRefineCell（38）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersInfoRefineCell` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 108.0] | [0.5, 0] | [570.0, -185.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersInfoRefineCell/lbl_tip` | UILabelTTF | [320.0, 160.5] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已达到最大等级」25 STZhongsong.ttf rgb[118, 60, 24] |
| `/FettersInfoRefineCell/node_up` | CCNode | [320.0, 168.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/node_up/CCSprite_1` | CCSprite | [-141, 21] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoRefineCell/node_up/CCSprite_2` | CCSprite | [164, 21] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoRefineCell/node_up/spr_battle_count_icon_bg` | CCSprite | [-211, 20] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoRefineCell/node_up/spr_material1` | CCSprite | [-211, 20] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901502.png` b52f085d-b035-458d-a1f5-9f38961dd023 |
| `/FettersInfoRefineCell/node_up/lbl_material1` | UILabelTTF | [-137, 21] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 STZhongsong.ttf rgbNone |
| `/FettersInfoRefineCell/node_up/spr_battle_count_icon_bg` | CCSprite | [95, 20] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoRefineCell/node_up/spr_material2` | CCSprite | [95, 20] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/FettersInfoRefineCell/node_up/lbl_material2` | UILabelTTF | [169, 21] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FettersInfoRefineCell/node_up/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/node_up/CCMenu_1/UIMenuItemLabel_1` | UIMenuItemLabel | [0, -34] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「精  炼」60 [255, 255, 255, 255] |
| `/FettersInfoRefineCell/node_up/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/node_up/CCMenu_2/btn_iteminfo1` | UIMenuItemLabel | [-214, 19.6] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoRefineCell/node_up/CCMenu_2/btn_iteminfo2` | UIMenuItemLabel | [94, 22] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoRefineCell/CCNode_1` | CCNode | [320.0, 216.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/CCNode_1/UILabelTTF_1` | UILabelTTF | [-262, 105] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「精炼等级：」22 STZhongsong.ttf rgb[139, 71, 21] |
| `/FettersInfoRefineCell/CCNode_1/lbl_now_level` | UILabelTTF | [-162, 105] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[139, 71, 21] |
| `/FettersInfoRefineCell/CCNode_1/lbl_text2` | UILabelTTF | [32, 105] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「精炼等级：」22 STZhongsong.ttf rgb[139, 71, 21] |
| `/FettersInfoRefineCell/CCNode_1/lbl_next_level` | UILabelTTF | [135, 105] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[139, 71, 21] |
| `/FettersInfoRefineCell/CCNode_1/node_attr1` | CCNode | [-263, 61] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/CCNode_1/node_attr1/CCScale9Sprite_1` | CCScale9Sprite | [1, -12] | [0.5, 0.5] | [240, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-bg-2.png` 230b11fd-638e-408c-a01a-5ab0e1eddda8 insets[10, 10, 10, 10] |
| `/FettersInfoRefineCell/CCNode_1/node_attr1/UILabelTTF_1` | UILabelTTF | [8, 4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能伤害增加：」20 STZhongsong.ttf rgb[66, 15, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr1/lbl_attr1` | UILabelTTF | [144, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[0, 142, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr2` | CCNode | [-263, 18] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoRefineCell/CCNode_1/node_attr2/CCScale9Sprite_1` | CCScale9Sprite | [1, -12] | [0.5, 0.5] | [240, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-bg-2.png` 230b11fd-638e-408c-a01a-5ab0e1eddda8 insets[10, 10, 10, 10] |
| `/FettersInfoRefineCell/CCNode_1/node_attr2/UILabelTTF_1` | UILabelTTF | [8, 4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能伤害增加：」20 STZhongsong.ttf rgb[66, 15, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr2/lbl_attr2` | UILabelTTF | [144, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[0, 142, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr3` | CCNode | [30, 61] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoRefineCell/CCNode_1/node_attr3/CCScale9Sprite_1` | CCScale9Sprite | [1, -12] | [0.5, 0.5] | [240, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-bg-2.png` 230b11fd-638e-408c-a01a-5ab0e1eddda8 insets[10, 10, 10, 10] |
| `/FettersInfoRefineCell/CCNode_1/node_attr3/UILabelTTF_1` | UILabelTTF | [8, 4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能伤害增加：」20 STZhongsong.ttf rgb[66, 15, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr3/lbl_attr3` | UILabelTTF | [144, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[0, 142, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr4` | CCNode | [30, 18] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoRefineCell/CCNode_1/node_attr4/CCScale9Sprite_1` | CCScale9Sprite | [1, -12] | [0.5, 0.5] | [240, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-bg-2.png` 230b11fd-638e-408c-a01a-5ab0e1eddda8 insets[10, 10, 10, 10] |
| `/FettersInfoRefineCell/CCNode_1/node_attr4/UILabelTTF_1` | UILabelTTF | [8, 4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能伤害增加：」20 STZhongsong.ttf rgb[66, 15, 0] |
| `/FettersInfoRefineCell/CCNode_1/node_attr4/lbl_attr4` | UILabelTTF | [144, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[0, 142, 0] |

## FettersInfoSkillCell（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersInfoSkillCell` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoSkillCell/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 168.0] | [0.5, 0] | [540.0, -120.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersInfoSkillCell/lbl_name` | UILabelTTF | [157.681, 294.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名称」22 STZhongsong.ttf rgb[231, 117, 42] |
| `/FettersInfoSkillCell/lbl_des` | UILabelTTF | [157.681, 279.0] | [0, 1] | [389.6, -210.0] | [1, 1] | 0 | 是 | cc.Label「————————————————————————————————————————
」19 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/FettersInfoSkillCell/spr_icon` | CCSprite | [107.44, 272.25] | [0.5, 0.5] | [78, 78] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_210010001.png` 1d452993-8008-4647-a19a-b0d4e44ca064 |
| `/FettersInfoSkillCell/CCNode_1` | CCNode | [320.0, 168.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoSkillCell/CCNode_1/node_res` | CCNode | [0, 6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoSkillCell/CCNode_1/node_res/CCSprite_1` | CCSprite | [-128, 27] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoSkillCell/CCNode_1/node_res/CCSprite_2` | CCSprite | [146, 27] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoSkillCell/CCNode_1/node_res/spr_battle_count_icon_bg` | CCSprite | [-194, 26] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoSkillCell/CCNode_1/node_res/spr_material1` | CCSprite | [-194, 26] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901503.png` a8de30fc-9717-4222-91c7-b90f57e4382d |
| `/FettersInfoSkillCell/CCNode_1/node_res/lbl_material1` | UILabelTTF | [-121, 26] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FettersInfoSkillCell/CCNode_1/node_res/spr_material2` | CCSprite | [77, 26] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoSkillCell/CCNode_1/node_res/spr_material2` | CCSprite | [77, 26] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/FettersInfoSkillCell/CCNode_1/node_res/lbl_material2` | UILabelTTF | [150, 26] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FettersInfoSkillCell/CCNode_1/node_res/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoSkillCell/CCNode_1/node_res/CCMenu_1/btn_iteminfo1` | UIMenuItemLabel | [-196, 30] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoSkillCell/CCNode_1/node_res/CCMenu_1/btn_iteminfo2` | UIMenuItemLabel | [77, 30] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoSkillCell/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoSkillCell/CCNode_1/CCMenu_1/btn_level` | UIMenuItemLabel | [0, -41] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「升  级」60 [255, 255, 255, 255] |
| `/FettersInfoSkillCell/CCNode_1/lbl_tip` | UILabelTTF | [0, 33] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「羁绊4级可以继续升级」20 STZhongsong.ttf rgb[162, 0, 0] |

## FettersInfoUplimitCell（35）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersInfoUplimitCell` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoUplimitCell/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 165.75] | [0.5, 0] | [540.0, -120.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersInfoUplimitCell/node_up` | CCNode | [320.0, 168.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoUplimitCell/node_up/CCSprite_1` | CCSprite | [-141, 28] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoUplimitCell/node_up/CCSprite_2` | CCSprite | [164, 28] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FettersInfoUplimitCell/node_up/spr_battle_count_icon_bg` | CCSprite | [-211, 27] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoUplimitCell/node_up/spr_material1` | CCSprite | [-211, 27] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901502.png` b52f085d-b035-458d-a1f5-9f38961dd023 |
| `/FettersInfoUplimitCell/node_up/lbl_material1` | UILabelTTF | [-137, 27] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 CloudYuanCuGBK.ttf rgbNone |
| `/FettersInfoUplimitCell/node_up/spr_battle_count_icon_bg` | CCSprite | [95, 27] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FettersInfoUplimitCell/node_up/spr_material2` | CCSprite | [95, 27] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/FettersInfoUplimitCell/node_up/lbl_material2` | UILabelTTF | [169, 27] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/9999」22 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/FettersInfoUplimitCell/node_up/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoUplimitCell/node_up/CCMenu_1/btn_level` | UIMenuItemLabel | [0, -41] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「升  级」60 [255, 255, 255, 255] |
| `/FettersInfoUplimitCell/node_up/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersInfoUplimitCell/node_up/CCMenu_2/btn_iteminfo1` | UIMenuItemLabel | [-211, 30] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoUplimitCell/node_up/CCMenu_2/btn_iteminfo2` | UIMenuItemLabel | [95, 30] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FettersInfoUplimitCell/node_in` | CCNode | [320.0, 216.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoUplimitCell/node_in/CCSprite_1` | CCSprite | [0, 99] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/FettersInfoUplimitCell/node_in/lbl_now_level` | UILabelTTF | [-32, 99] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 CloudYuanCuGBK.ttf rgb[222, 95, 32] |
| `/FettersInfoUplimitCell/node_in/lbl_next_level` | UILabelTTF | [32, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 CloudYuanCuGBK.ttf rgb[223, 92, 21] |
| `/FettersInfoUplimitCell/node_in/spr_arrow` | CCSprite | [0, 56] | [0.5, 0.5] | [50, 28] | [0.6, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_skill-arrow.png` 93accc90-1585-44a0-b8a1-57797ab417ef |
| `/FettersInfoUplimitCell/node_in/spr_arrow` | CCSprite | [0, 12] | [0.5, 0.5] | [50, 28] | [0.6, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_skill-arrow.png` 93accc90-1585-44a0-b8a1-57797ab417ef |
| `/FettersInfoUplimitCell/node_in/node_attr1` | CCNode | [0, 53] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoUplimitCell/node_in/node_attr1/lbl_attr1` | UILabelTTF | [-32, 3] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 CloudYuanCuGBK.ttf rgb[0, 142, 0] |
| `/FettersInfoUplimitCell/node_in/node_attr2` | CCNode | [0, 9] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoUplimitCell/node_in/node_attr2/lbl_attr2` | UILabelTTF | [-32, 3] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[0, 142, 0] |
| `/FettersInfoUplimitCell/node_in/node_attr3` | CCNode | [0, 53] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoUplimitCell/node_in/node_attr3/lbl_attr3` | UILabelTTF | [32, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 CloudYuanCuGBK.ttf rgb[0, 142, 0] |
| `/FettersInfoUplimitCell/node_in/node_attr4` | CCNode | [0, 9] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersInfoUplimitCell/node_in/node_attr4/lbl_attr4` | UILabelTTF | [32, 3] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[0, 142, 0] |
| `/FettersInfoUplimitCell/node_lower` | CCNode | [320.0, 216.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersInfoUplimitCell/node_lower/lbl_now_level_max` | UILabelTTF | [0, 96] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「突破等級：30」22 CloudYuanCuGBK.ttf rgb[222, 95, 32] |
| `/FettersInfoUplimitCell/node_lower/lbl_attr2_max` | UILabelTTF | [0, 13] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「突破生命：305%」20 CloudYuanCuGBK.ttf rgb[0, 142, 0] |
| `/FettersInfoUplimitCell/node_lower/lbl_attr1_max` | UILabelTTF | [0, 58] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「突破生命：305%」20 CloudYuanCuGBK.ttf rgb[0, 142, 0] |
| `/FettersInfoUplimitCell/node_lower/lbl_tip` | UILabelTTF | [0, -37] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已达到最大等级」25 CloudYuanCuGBK.ttf rgb[118, 60, 24] |

## FettersResultLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersResultLayer` | FettersInfoLayer | [0, 0] | [0, 0] | [640.0, 288.0] | [1, 1] | 0 | 是 |  |
| `/FettersResultLayer/spr_bg` | CCScale9Sprite | [320.0, 144.0] | [0.5, 0.5] | [640.0, 288.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[200, 50, 100, 100] |
| `/FettersResultLayer/node_text` | CCNode | [320.0, 144.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersResultLayer/node_text/spr_title` | CCSprite | [0, 158.976] | [0.5, 0] | [422, 96] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-uplevel-1.png` e1e26145-4eed-4cb7-8dbc-be787192917a |
| `/FettersResultLayer/node_text/lbl_name` | UILabelTTF | [0, -2.064] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「腥红之月」30 STZhongsong.ttf rgb[234, 165, 40] |
| `/FettersResultLayer/node_text/node_attr1` | CCNode | [0, -101] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersResultLayer/node_text/node_attr1/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 |
| `/FettersResultLayer/node_text/node_attr1/lbl_name1` | UILabelTTF | [-107.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击」23 STZhongsong.ttf rgb[253, 254, 253] |
| `/FettersResultLayer/node_text/node_attr1/lbl_left1` | UILabelTTF | [15, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000」23 STZhongsong.ttf rgb[255, 227, 148] |
| `/FettersResultLayer/node_text/node_attr1/lbl_right1` | UILabelTTF | [142.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2000」23 STZhongsong.ttf rgb[255, 227, 148] |
| `/FettersResultLayer/node_text/node_attr1/CCSprite_1` | CCSprite | [80, 0] | [0.5, 0.5] | [32, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-arrow.png` 46b71f80-6dba-4896-a4c2-29b60b112b96 |
| `/FettersResultLayer/node_text/node_attr2` | CCNode | [0, -151] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersResultLayer/node_text/node_attr2/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 |
| `/FettersResultLayer/node_text/node_attr2/lbl_name2` | UILabelTTF | [-107.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命」23 STZhongsong.ttf rgb[253, 254, 253] |
| `/FettersResultLayer/node_text/node_attr2/lbl_left2` | UILabelTTF | [15, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000」23 STZhongsong.ttf rgb[255, 227, 148] |
| `/FettersResultLayer/node_text/node_attr2/lbl_right2` | UILabelTTF | [142.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2000」23 STZhongsong.ttf rgb[255, 227, 148] |
| `/FettersResultLayer/node_text/node_attr2/CCSprite_1` | CCSprite | [80, 0] | [0.5, 0.5] | [32, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-arrow.png` 46b71f80-6dba-4896-a4c2-29b60b112b96 |
| `/FettersResultLayer/node_text/node_level` | CCNode | [0, -48] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersResultLayer/node_text/node_level/lbl_pre_level` | UILabelTTF | [-51.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1级」23 STZhongsong.ttf rgb[238, 216, 170] |
| `/FettersResultLayer/node_text/node_level/CCSprite_1` | CCSprite | [0, -5] | [0.5, 0.5] | [30, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-arrow-2.png` 62896c8c-ee2e-43f5-956c-959ae500bba3 |
| `/FettersResultLayer/node_text/node_level/lbl_now_level` | UILabelTTF | [45.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1级」23 STZhongsong.ttf rgb[21, 215, 43] |

## FettersSelectCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersSelectCell` | FettersSelectCell | [0, 0] | [0, 0] | [670, 180] | [1, 1] | 0 | 是 |  |
| `/FettersSelectCell/CCScale9Sprite_1` | CCScale9Sprite | [-1, 1] | [0.5, 0.5] | [670.04, 180] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/rank_spr-paimingk-1.png` da39b30c-711a-4b1f-9916-8d6f44421495 insets[10, 10, 10, 10] |
| `/FettersSelectCell/CCSprite_1` | CCSprite | [335.0, 90.0] | [0.5, 0.5] | [556, 157] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/fetters-lang_10101.png` feebbf47-c64a-427b-a41b-ba5d7b0e8ae6 |
| `/FettersSelectCell/spr_image` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersSelectCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersSelectCell/CCMenu_1/btn_select` | UIMenuItemLabel | [575, 55] | [0.5, 0.5] | [136, 58] | [1.3, 1.3] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「装配」24 [100, 38, 7, 255] |
| `/FettersSelectCell/CCSprite_2` | CCSprite | [74, 110.2] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/bag/backpack_rare-5.png` 4917f933-7162-4e88-b31b-92b3b4fb0324 |
| `/FettersSelectCell/spr_icon` | CCSprite | [74, 110.2] | [0.5, 0.5] | [94, 94] | [0.95, 0.95] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_10101.png` 289a3059-5dca-4feb-ad47-8e06c500ebdd |
| `/FettersSelectCell/_descViewContainer` | CCNode | [595, 150] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersSelectCell/_descViewContainer/CCMenu_1` | CCMenu | [30, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersSelectCell/_descViewContainer/CCMenu_1/_viewDescBtn` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [32, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_view.png` 1eacc005-1271-4974-93ec-64195f59d847 |
| `/FettersSelectCell/_descViewContainer/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [28, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_level.png` 299d5771-fccc-4fc6-9cb1-3325f3ba73a4 |
| `/FettersSelectCell/_descViewContainer/_levelStartPointer` | CCNode | [-23, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersSelectCell/_unlockVipTips` | CCNode | [575, 30] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/FettersSelectCell/_unlockVipTips/_vipLabel` | CCSprite | [-15, 0] | [1, 0.5] | [56, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_VIP.png` 22566cae-b050-4c89-b94e-3df3d1c1812a |
| `/FettersSelectCell/_unlockVipTips/_vipNum1` | CCSprite | [0, 0] | [0.5, 0.5] | [23, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_0.png` dbf514a0-4a12-4e8f-85f7-3468467d5535 |
| `/FettersSelectCell/_unlockVipTips/_vipNum2` | CCSprite | [0, 0] | [0.5, 0.5] | [23, 30] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/fetters_0.png` dbf514a0-4a12-4e8f-85f7-3468467d5535 |
| `/FettersSelectCell/_unlockVipTips/CCSprite_1` | CCSprite | [40, 0] | [0.5, 0.5] | [52, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-unlock.png` 25f96b80-f10b-4675-b487-72a12f891d54 |

## FettersSelectLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FettersSelectLayer` | FettersSelectLayer | [0, 0] | [0, 0] | [595.2, 672.0] | [1, 1] | 0 | 是 |  |
| `/FettersSelectLayer/spr_bg` | CCScale9Sprite | [297.6, 336.0] | [0.5, 0.5] | [615.2, 672.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FettersSelectLayer/node_title` | CCNode | [297.585, 666.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FettersSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「羁绊选择」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FettersSelectLayer/spr_bg` | CCScale9Sprite | [297.6, 604.8] | [0.5, 1] | [545.2, 542.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FettersSelectLayer/scroll_view` | CCScrollView | [297.6, 604.8] | [0.5, 1] | [545.2, 542.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/FettersSelectLayer/CCNode_1` | CCNode | [549.565, 665.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FettersSelectLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FettersSelectLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## HaloCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HaloCell` | HaloCell | [0, 0] | [0, 0] | [540, 163] | [1, 1] | 0 | 是 |  |
| `/HaloCell/spr_effect_bg` | CCScale9Sprite | [-2, 1.5] | [0.5, 0.5] | [542, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-25.png` d71a6c34-2c3e-4178-ad08-e5cc7d5bda7a insets[14, 14, 14, 14] |
| `/HaloCell/spr_effect` | CCSprite | [63.36, 81.5] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/HaloCell/spr_activate` | CCSprite | [39, 129] | [0.5, 0.5] | [84, 66] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_lbl-activate-1.png` 719906ee-4092-4e45-a913-f368eb1775a2 |
| `/HaloCell/lbl_name` | UILabelTTF | [270.0, 138.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「燃烧之力」22 FZCSJW--GB1-0.ttf rgb[255, 207, 134] |

## HaloLayer（26）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HaloLayer` | HaloLayer | [0, 0] | [0, 0] | [540, 750] | [1, 1] | 0 | 是 |  |
| `/HaloLayer/spr_bg` | CCScale9Sprite | [268.777, 1.339] | [0.5, 0] | [548.1, 750.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/HaloLayer/node` | CCNode | [270.0, 725.123] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HaloLayer/node/CCScale9Sprite_1` | CCScale9Sprite | [0, -14.4] | [0.5, 0.5] | [450, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-15.png` d3b2040c-02fd-41b6-b3ae-f50d3d1dce87 insets[0, 0, 30, 30] |
| `/HaloLayer/node/UILabelTTF_1` | UILabelTTF | [0, -15] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「达成条件」24 FZCSJW--GB1-0.ttf rgb[255, 207, 134] |
| `/HaloLayer/node/UILabelTTF_2` | UILabelTTF | [-194.4, -63.6] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「种族克制效果:」22 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/HaloLayer/node/lbl_mul` | UILabelTTF | [-46.4, -63.6] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「伤害+20%」22 FZCSJW--GB1-0.ttf rgb[77, 208, 40] |
| `/HaloLayer/node/UILabelTTF_3` | UILabelTTF | [104.4, -52.8] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「伤害+25%」22 FZCSJW--GB1-0.ttf rgb[0, 171, 0] |
| `/HaloLayer/node/CCSprite_1` | CCSprite | [-33.6, -214.8] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HaloLayer/node/CCSprite_2` | CCSprite | [-105.6, -122.4] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HaloLayer/node/CCSprite_3` | CCSprite | [-176.4, -214.8] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HaloLayer/node/CCSprite_4` | CCSprite | [126.0, -122.4] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HaloLayer/node/CCSprite_5` | CCSprite | [128.4, -214.8] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HaloLayer/node/CCSprite_6` | CCSprite | [-104.4, -212.4] | [0.5, 0.5] | [52, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-arrow-3.png` c0ae9b13-682a-4757-ab35-257b18be6c22 |
| `/HaloLayer/node/CCSprite_7` | CCSprite | [-46.8, -150.0] | [0.5, 0.5] | [39, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-arrow-4.png` 75fed396-c814-4e39-a245-a9dcc1303648 |
| `/HaloLayer/node/CCSprite_8` | CCSprite | [-160.8, -151.2] | [0.5, 0.5] | [31, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-arrow-5.png` 318f1db2-f01e-4835-8b36-ced602380cd5 |
| `/HaloLayer/node/CCSprite_9` | CCSprite | [80.4, -166.8] | [0.5, 0.5] | [34, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-arrow-6.png` a2dd3e47-8caa-487d-972c-92efe8b64115 |
| `/HaloLayer/node/CCSprite_10` | CCSprite | [178.8, -166.8] | [0.5, 0.5] | [34, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-arrow-7.png` 68586b11-aba0-43e8-a616-cf25d9a9c715 |
| `/HaloLayer/node/UILabelTTF_4` | UILabelTTF | [-105.6, -168.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「水」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HaloLayer/node/UILabelTTF_5` | UILabelTTF | [-177.6, -256.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「木」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HaloLayer/node/UILabelTTF_6` | UILabelTTF | [-33.6, -256.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「火」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HaloLayer/node/UILabelTTF_7` | UILabelTTF | [126, -168.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「光」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HaloLayer/node/UILabelTTF_8` | UILabelTTF | [128.4, -256.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暗」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HaloLayer/scroll_view` | UIScrollViewBackpack | [270.0, 17.277] | [0.5, 0] | [540.4, 390] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HaloLayer/CCNode_1` | CCNode | [535.598, 748.047] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HaloLayer/CCNode_1/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## HeroCreatCell（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroCreatCell` | HeroCreatCell | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatCell/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [500, 120] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/win-bg_win-bg-15.png` e8c7c4ae-b048-45b0-9299-9929f32e0fbc insets[20, 20, 60, 60] |
| `/HeroCreatCell/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCreatCell/UIMenu_1/btn_compose` | UIMenuItemImage | [510, -85] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/HeroCreatCell/lbl_comsume` | UILabelTTF | [250.0, 98.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 STZhongsong.ttf rgbNone |
| `/HeroCreatCell/menu` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCreatCell/node_need` | CCNode | [231.0, -200.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroCreatCell/node_need/CCSprite_1` | CCSprite | [197, 233] | [0.5, 0.5] | [100, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/HeroCreatCell/node_need/spr_gold_need` | CCSprite | [149, 233] | [0.5, 0.5] | [38, 37] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-1.png` a16f05a7-99da-4b8d-a908-9ca7c6adade8 |
| `/HeroCreatCell/node_need/lbl_gold_need` | UILabelTTF | [180, 232] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroCreatCell/spr_1` | CCSprite | [45.0, 150.0] | [0.5, 0.5] | [168, 168] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-creat_1.png` 6215eca6-cb53-49bb-9b56-2e0d9586276c |
| `/HeroCreatCell/spr_2` | CCSprite | [153.0, 12.0] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-creat_2.png` 9baed7d0-14ba-4901-9510-181366033a3a |
| `/HeroCreatCell/spr_3` | CCSprite | [390.0, 12.0] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-creat_2.png` 9baed7d0-14ba-4901-9510-181366033a3a |
| `/HeroCreatCell/spr_4` | CCSprite | [500.0, 149.0] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-creat_2.png` 9baed7d0-14ba-4901-9510-181366033a3a |

## HeroCreatLayer（39）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroCreatLayer` | HeroCreatLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/spr_bg_all` | CCSprite | [320.0, 640.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/login/bg-create-role.jpg` 73dc5bfb-9f9d-4397-96d0-56e89f869a8a |
| `/HeroCreatLayer/node_layer` | CCNode | [320.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/spr_bg` | CCScale9Sprite | [-315, -518.4] | [0.5, 0.5] | [632, 429] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroCreatLayer/node_layer/spr_scroll_view_bg` | CCScale9Sprite | [-283, -420] | [0.5, 0.5] | [569, 249] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroCreatLayer/node_layer/scrollView` | CCScrollView | [-277.04, -413.6] | [0, 0] | [559, 239] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroCreatLayer/node_layer/menu_elem` | UIMenu | [-285.12, -612] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/menu_elem/btn_elem0` | UIMenuItemCheckBox | [85, 160] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/HeroCreatLayer/node_layer/menu_elem/btn_elem1` | UIMenuItemCheckBox | [168, 160] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroCreatLayer/node_layer/menu_elem/btn_elem2` | UIMenuItemCheckBox | [248, 160] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroCreatLayer/node_layer/menu_elem/btn_elem3` | UIMenuItemCheckBox | [329, 160] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroCreatLayer/node_layer/menu_elem/btn_elem4` | UIMenuItemCheckBox | [408, 160] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroCreatLayer/node_layer/menu_elem/btn_elem5` | UIMenuItemCheckBox | [486, 160] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroCreatLayer/node_layer/node` | CCNode | [-266.4, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/spr_circle` | CCNode | [-2.88, 259.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/node_title` | CCNode | [-2.88, 259.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/node_title/spr_name_bg` | CCSprite | [3.08, -160] | [0.5, 0.5] | [282, 84] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-creat_dahongdi.png` ed5db2aa-39f2-4966-a847-f6b0b9e76a90 |
| `/HeroCreatLayer/node_layer/node_title/lbl_hero_name` | UILabelTTF | [3.1, -140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄英雄英雄」24 STZhongsong.ttf rgb[255, 227, 183] |
| `/HeroCreatLayer/node_layer/node_title/spr_elem` | CCSprite | [-100, -142] | [0.5, 0.5] | [74, 74] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroCreatLayer/node_layer/node_title/node_star` | CCNode | [5, -175] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/menu/btn_info` | UIMenuItemImage | [234.72, -146.88] | [0.5, 0.5] | [40, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-creat_gantan.png` e94a36b7-acc6-4e93-88ef-ee3baa88ffd0 |
| `/HeroCreatLayer/node_layer/lbl_tips` | UILabelTTF | [-248.9, -146] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄英雄」22 STZhongsong.ttf rgb[122, 70, 42] |
| `/HeroCreatLayer/node_layer/node_detail` | CCNode | [-300, 540] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/node_detail/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0, 1] | [180, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-26.png` 283bf4bb-a51c-45ef-aa52-ef75cec591a5 insets[10, 10, 10, 10] |
| `/HeroCreatLayer/node_layer/node_detail/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0, 1] | [180, 50] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-26.png` 283bf4bb-a51c-45ef-aa52-ef75cec591a5 insets[10, 10, 10, 10] |
| `/HeroCreatLayer/node_layer/node_detail/lbl_level` | UILabelTTF | [10, -25] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级：999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroCreatLayer/node_layer/node_detail/CCSprite_1` | CCSprite | [30, -70] | [0.5, 0.5] | [46, 46] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-4.png` ec5db45d-a43e-41c3-ada2-53fe40ef452c |
| `/HeroCreatLayer/node_layer/node_detail/CCSprite_2` | CCSprite | [30, -105] | [0.5, 0.5] | [46, 46] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-3.png` 50f266f7-bc47-4b62-8151-1de58dee67f0 |
| `/HeroCreatLayer/node_layer/node_detail/CCSprite_3` | CCSprite | [30, -140] | [0.5, 0.5] | [46, 46] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-2.png` 87bb3852-c049-43c2-a553-cfe950b44bd6 |
| `/HeroCreatLayer/node_layer/node_detail/CCSprite_4` | CCSprite | [30, -175] | [0.5, 0.5] | [46, 46] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-1.png` acdedbc0-3822-47d2-90f3-0bfc6f0d74b4 |
| `/HeroCreatLayer/node_layer/node_detail/lbl_attr_atk` | UILabelTTF | [56, -70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级：999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroCreatLayer/node_layer/node_detail/lbl_attr_hp` | UILabelTTF | [56, -105] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级：999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroCreatLayer/node_layer/node_detail/lbl_attr_def` | UILabelTTF | [56, -140] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级：999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroCreatLayer/node_layer/node_detail/lbl_attr_spd` | UILabelTTF | [56, -175] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级：999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroCreatLayer/node_layer/node_detail/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/node_layer/node_detail/CCMenu_1/btn_hero_info` | UIMenuItemImage | [150, -25] | [0.5, 0.5] | [29, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-fdj.png` f5dc241b-e516-4ef6-abc1-b072a9cfa981 |
| `/HeroCreatLayer/menu_back` | CCMenu | [570, 1155] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCreatLayer/menu_back/btn_back` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |

## MagicCubeDisboardLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MagicCubeDisboardLayer` | MagicCubeDisboardLayer | [0, 0] | [0, 0] | [640, 520] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 260] | [0.5, 0.5] | [640, 520] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/MagicCubeDisboardLayer/node_title` | CCNode | [320.0, 514.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/MagicCubeDisboardLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择遗物」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/MagicCubeDisboardLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/UIMenu_1/btn_cannel` | UIMenuItemLabel | [200, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「添 加」44 [255, 255, 255, 255] |
| `/MagicCubeDisboardLayer/UIMenu_1/btn_enter` | UIMenuItemLabel | [440, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「开始鉴定」44 [255, 255, 255, 255] |
| `/MagicCubeDisboardLayer/UIMenu_2` | UIMenu | [583, 515] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/UIMenu_2/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/MagicCubeDisboardLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 312] | [0.5, 0.5] | [550, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MagicCubeDisboardLayer/node_rich` | CCNode | [320, 180] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/node_rich1` | CCNode | [320, 150] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/CCSprite_1` | CCSprite | [320, 300] | [0.5, 0.5] | [60, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-arrow.png` 970a83d4-c2d6-4731-9c9e-ff51a4a6f982 |
| `/MagicCubeDisboardLayer/lbl_title` | UILabelTTF | [320, 350] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选择遗物」24 FZCSJW--GB1-0.ttf rgb[121, 71, 44] |
| `/MagicCubeDisboardLayer/item_node_1` | CCNode | [172, 320] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/item_node_2` | CCNode | [460, 320] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeDisboardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## MagicCubeLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MagicCubeLayer` | MagicCubeLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/MagicCubeLayer/spr_bg` | CCSprite | [320.0, 640.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/mf_bg.png` e58d1221-9130-4e5a-9e11-4a214cf2ec26 |
| `/MagicCubeLayer/main_node` | CCNode | [320.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeLayer/main_node/CCBFile_1` | CCBFile | [-320, -640] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/MagicCubeLayer/main_node/menu_root` | UIMenu | [0, 420] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MagicCubeLayer/main_node/menu_root/btn_back` | UIMenuItemImage | [220, 47] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/MagicCubeLayer/main_node/menu_root/btn_2` | UIMenuItemTab | [-8, 0] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-7.png` 8a3c8429-0946-4341-8fe0-bc3c6237a448 pressed `ui/common/button_btn-tab-8.png` aac0291d-cbbf-48cb-9486-944e18e9e5cd · Label「回 退」40 [255, 255, 255, 255] |
| `/MagicCubeLayer/main_node/menu_root/btn_1` | UIMenuItemTab | [8, 0] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「置 换」40 [255, 255, 255, 255] |

## MagicCubeSelectHeroLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MagicCubeSelectHeroLayer` | MagicCubeSelectHeroLayer | [0, 0] | [0, 0] | [640, 576] | [1, 1] | 0 | 是 |  |
| `/MagicCubeSelectHeroLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 288] | [0.5, 0.5] | [640, 576] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MagicCubeSelectHeroLayer/node_title` | CCNode | [320.0, 570.24] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeSelectHeroLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MagicCubeSelectHeroLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择遗物」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/MagicCubeSelectHeroLayer/node_desc` | CCNode | [90, 160] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MagicCubeSelectHeroLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MagicCubeSelectHeroLayer/UIMenu_1/btn_cannel` | UIMenuItemLabel | [200, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「添 加」44 [255, 255, 255, 255] |
| `/MagicCubeSelectHeroLayer/UIMenu_1/btn_enter` | UIMenuItemLabel | [440, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「开始鉴定」44 [255, 255, 255, 255] |
| `/MagicCubeSelectHeroLayer/spr_box` | CCScale9Sprite | [320.0, 495.36] | [0.5, 1] | [558, 380] | [0.9968, 1.0054] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[80, 50, 20, 20] |
| `/MagicCubeSelectHeroLayer/elem_menu` | CCMenu | [320.0, 486.72] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MagicCubeSelectHeroLayer/elem_menu/btn_elem0` | UIMenuItemImage | [-210, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/MagicCubeSelectHeroLayer/elem_menu/btn_elem1` | UIMenuItemImage | [-126, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/MagicCubeSelectHeroLayer/elem_menu/btn_elem2` | UIMenuItemImage | [-42, -34] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/MagicCubeSelectHeroLayer/elem_menu/btn_elem3` | UIMenuItemImage | [42, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/MagicCubeSelectHeroLayer/elem_menu/btn_elem4` | UIMenuItemImage | [126, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/MagicCubeSelectHeroLayer/elem_menu/btn_elem5` | UIMenuItemImage | [210, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/MagicCubeSelectHeroLayer/scroll_view` | CCScrollView | [50, 125] | [0, 0] | [540, 280] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/MagicCubeSelectHeroLayer/UIMenu_2` | UIMenu | [577, 570] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MagicCubeSelectHeroLayer/UIMenu_2/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## PetIllustratLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PetIllustratLayer` | PetIllustratLayer | [0, 0] | [0, 0] | [640, 756] | [1, 1] | 0 | 是 |  |
| `/PetIllustratLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 756] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/PetIllustratLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetIllustratLayer/UIMenu_1/btn_close` | UIMenuItemImage | [570, 747] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PetIllustratLayer/node_title` | CCNode | [320, 746] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetIllustratLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/PetIllustratLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/PetIllustratLayer/spr_box` | CCScale9Sprite | [40, 70] | [0.5, 0.5] | [560, 590] | [0.9968, 1.0054] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[80, 50, 20, 20] |
| `/PetIllustratLayer/elem_menu` | CCMenu | [320, 652] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetIllustratLayer/elem_menu/btn_elem1` | UIMenuItemImage | [-209, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/PetIllustratLayer/elem_menu/btn_elem2` | UIMenuItemImage | [-103, -34] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/PetIllustratLayer/elem_menu/btn_elem3` | UIMenuItemImage | [2, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/PetIllustratLayer/elem_menu/btn_elem4` | UIMenuItemImage | [108, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/PetIllustratLayer/elem_menu/btn_elem5` | UIMenuItemImage | [210, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/PetIllustratLayer/scroll_view` | CCScrollView | [49, 81] | [0, 0] | [540, 490] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask BOTH |

## PetInfoIllustratLayer（30）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PetInfoIllustratLayer` | PetInfoIllustratLayer | [0, 0] | [0, 0] | [450, 420] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [450, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/PetInfoIllustratLayer/menu_close` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/menu_close/btn_close` | UIMenuItemImage | [392, 396] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PetInfoIllustratLayer/menu_icon` | UIMenu | [95, 347] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/spr_line` | CCSprite | [225, 280] | [0.5, 0.5] | [380, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-line.png` c6234db7-ebbd-43bb-863f-6c99505dbdc3 |
| `/PetInfoIllustratLayer/UILabelTTF_1` | UILabelTTF | [31, 247] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/PetInfoIllustratLayer/UILabelTTF_2` | UILabelTTF | [29, 158] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/PetInfoIllustratLayer/node_attr` | CCNode | [0, 12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/node_attr/node_attr_1` | CCNode | [43, 207] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/node_attr/node_attr_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoIllustratLayer/node_attr/node_attr_1/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoIllustratLayer/node_attr/node_attr_1/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoIllustratLayer/node_attr/node_attr_2` | CCNode | [259, 207] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/node_attr/node_attr_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoIllustratLayer/node_attr/node_attr_2/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoIllustratLayer/node_attr/node_attr_2/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoIllustratLayer/node_attr/node_attr_3` | CCNode | [43, 176] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/node_attr/node_attr_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoIllustratLayer/node_attr/node_attr_3/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoIllustratLayer/node_attr/node_attr_3/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoIllustratLayer/node_attr/node_attr_4` | CCNode | [259, 174] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoIllustratLayer/node_attr/node_attr_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoIllustratLayer/node_attr/node_attr_4/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoIllustratLayer/node_attr/node_attr_4/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoIllustratLayer/lbl_skill_desc` | UILabelTTF | [225, 85] | [0, 0] | [390, 0] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊111111111111111111111111111222222222」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoIllustratLayer/lbl_skill_tips` | UILabelTTF | [225, 85] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoIllustratLayer/scroll_view` | CCScrollView | [30, 21] | [0, 0] | [390, 120] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/PetInfoIllustratLayer/lbl_name` | UILabelTTF | [158, 380] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」24 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/PetInfoIllustratLayer/lbl_type` | UILabelTTF | [158, 330] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |

## PetInfoLayer（60）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PetInfoLayer` | PetInfoLayer | [0, 0] | [0, 0] | [640, 870] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 862] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/PetInfoLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/UIMenu_1/btn_close` | UIMenuItemImage | [566, 854] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PetInfoLayer/node_title` | CCNode | [320, 854] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/PetInfoLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/PetInfoLayer/CCSprite_1` | CCSprite | [320, 600] | [0.5, 0.5] | [500, 372] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/pet_spr-bg.png` 9a9f5de3-1135-4cd1-9617-24fdf6ff8289 |
| `/PetInfoLayer/CCMenu_1` | CCMenu | [98, 772] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/CCMenu_1/btn_get` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [109, 26] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/lang-1_spr-get-pet.png` 3798b9db-e384-46e9-8dd0-bb3ab3752d66 |
| `/PetInfoLayer/not_pet` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/PetInfoLayer/not_pet/CCScale9Sprite_1` | CCScale9Sprite | [320, 250] | [0.5, 0.5] | [547, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/PetInfoLayer/not_pet/CCSprite_1` | CCSprite | [320, 274] | [0.5, 0.5] | [162, 130] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/pet_spr-fox.png` 61f1270a-3738-4e2c-b685-ca2752960407 |
| `/PetInfoLayer/not_pet/UILabelTTF_1` | UILabelTTF | [320, 187] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物」22 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/not_pet/CCMenu_1` | CCMenu | [528, 761] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/not_pet/CCMenu_1/btn_ill1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/pet_btn-illustrat.png` 0f9087db-054c-4f76-a217-e63cd0f38d49 |
| `/PetInfoLayer/not_pet/CCMenu_1/btn_icon` | UIMenuItemImage | [-210, -130] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/PetInfoLayer/has_pet` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/lbl_pet_name` | UILabelTTF | [320, 552] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/PetInfoLayer/has_pet/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/CCMenu_1/btn_max` | UIMenuItemImage | [517, 775] | [0.5, 0.5] | [123, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/pet_spr-max.png` 418d02e6-1ef4-4dd6-b522-3eb240e56e08 |
| `/PetInfoLayer/has_pet/CCMenu_1/btn_ill2` | UIMenuItemImage | [528, 716] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/pet_btn-illustrat.png` 0f9087db-054c-4f76-a217-e63cd0f38d49 |
| `/PetInfoLayer/has_pet/menu_operate` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/menu_operate/btn_disboard` | UIMenuItemImage | [176, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/PetInfoLayer/has_pet/menu_operate/btn_up_level` | UIMenuItemImage | [467, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/PetInfoLayer/has_pet/node_attr` | CCNode | [0, 12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/node_attr/CCScale9Sprite_1` | CCScale9Sprite | [316, 320] | [0.5, 0.5] | [540, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[60, 10, 10, 10] |
| `/PetInfoLayer/has_pet/node_attr/UILabelTTF_1` | UILabelTTF | [65, 377] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_1` | CCNode | [107, 325] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/node_attr/node_attr_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoLayer/has_pet/node_attr/node_attr_1/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_1/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_2` | CCNode | [407, 325] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/node_attr/node_attr_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoLayer/has_pet/node_attr/node_attr_2/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_2/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_3` | CCNode | [107, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/node_attr/node_attr_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoLayer/has_pet/node_attr/node_attr_3/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_3/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_4` | CCNode | [407, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/node_attr/node_attr_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoLayer/has_pet/node_attr/node_attr_4/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/node_attr/node_attr_4/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/PetInfoLayer/has_pet/node_skill` | CCNode | [0, -148] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/node_skill/CCScale9Sprite_1` | CCScale9Sprite | [316, 320] | [0.5, 0.5] | [540, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[60, 10, 10, 10] |
| `/PetInfoLayer/has_pet/node_skill/UILabelTTF_1` | UILabelTTF | [65, 377] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/PetInfoLayer/has_pet/node_skill/lbl_skill_desc` | UILabelTTF | [320, 300] | [0, 0] | [500, 0] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊11111111111111111111111111122222211111111111111111111111111111111222」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/PetInfoLayer/has_pet/node_skill/lbl_skill_tips` | UILabelTTF | [320, 300] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/PetInfoLayer/has_pet/node_skill/scroll_view` | CCScrollView | [65, 252] | [0, 0] | [500, 100] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/PetInfoLayer/has_pet/menu_icon` | CCMenu | [320, 632] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/lbl_max_tips` | UILabelTTF | [320, 480] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」22 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/item_node_1` | CCNode | [200.4, 485.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/item_node_2` | CCNode | [323.1, 485.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/item_node_3` | CCNode | [446, 485.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/menu_item` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/item_name_node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoLayer/has_pet/item_name_node/lbl_name_1` | UILabelTTF | [200.4, 429.888] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」18 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/item_name_node/lbl_name_2` | UILabelTTF | [323.1, 429.888] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」18 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/PetInfoLayer/has_pet/item_name_node/lbl_name_3` | UILabelTTF | [446, 429.888] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」18 CloudYuanCuGBK.ttf rgb[115, 76, 38] |

## PetInfoTipsLayer（33）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PetInfoTipsLayer` | PetInfoTipsLayer | [0, 0] | [0, 0] | [450, 520] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [450, 520] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/PetInfoTipsLayer/menu_close` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/menu_close/btn_close` | UIMenuItemImage | [392, 496] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PetInfoTipsLayer/menu_icon` | UIMenu | [95, 447] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/spr_line` | CCSprite | [225, 380] | [0.5, 0.5] | [380, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-line.png` c6234db7-ebbd-43bb-863f-6c99505dbdc3 |
| `/PetInfoTipsLayer/UILabelTTF_1` | UILabelTTF | [31, 347] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/PetInfoTipsLayer/UILabelTTF_2` | UILabelTTF | [29, 258] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/PetInfoTipsLayer/node_attr` | CCNode | [0, 12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/node_attr/node_attr_1` | CCNode | [43, 307] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/node_attr/node_attr_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoTipsLayer/node_attr/node_attr_1/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoTipsLayer/node_attr/node_attr_1/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoTipsLayer/node_attr/node_attr_2` | CCNode | [259, 307] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/node_attr/node_attr_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoTipsLayer/node_attr/node_attr_2/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoTipsLayer/node_attr/node_attr_2/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoTipsLayer/node_attr/node_attr_3` | CCNode | [43, 276] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/node_attr/node_attr_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoTipsLayer/node_attr/node_attr_3/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoTipsLayer/node_attr/node_attr_3/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoTipsLayer/node_attr/node_attr_4` | CCNode | [259, 274] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/node_attr/node_attr_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/PetInfoTipsLayer/node_attr/node_attr_4/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoTipsLayer/node_attr/node_attr_4/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/PetInfoTipsLayer/lbl_skill_desc` | UILabelTTF | [225, 185] | [0, 0] | [390, 0] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊111111111111111111111111111222222222」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoTipsLayer/lbl_skill_tips` | UILabelTTF | [225, 185] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/PetInfoTipsLayer/scroll_view` | CCScrollView | [30, 121] | [0, 0] | [390, 120] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/PetInfoTipsLayer/lbl_name` | UILabelTTF | [158, 480] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」24 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/PetInfoTipsLayer/lbl_type` | UILabelTTF | [158, 430] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/PetInfoTipsLayer/menu_info` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetInfoTipsLayer/menu_info/btn_use` | UIMenuItemImage | [96, 71] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a |
| `/PetInfoTipsLayer/menu_info/btn_src` | UIMenuItemImage | [351, 71] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a |

## PetSelectLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PetSelectLayer` | PetSelectLayer | [0, 0] | [0, 0] | [640, 420] | [1, 1] | 0 | 是 |  |
| `/PetSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/PetSelectLayer/node_title` | CCNode | [320, 411] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PetSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/PetSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/PetSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PetSelectLayer/UIMenu_1/btn_close` | UIMenuItemImage | [585, 414] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PetSelectLayer/UIMenu_1/btn_goto` | UIMenuItemImage | [320, 64] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd |
| `/PetSelectLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 202] | [0.5, 0.5] | [547, 223] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/PetSelectLayer/lbl_select` | UILabelTTF | [55, 328] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」20 CloudYuanCuGBK.ttf rgb[89, 53, 15] |
| `/PetSelectLayer/lbl_tips` | UILabelTTF | [587, 327] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」20 CloudYuanCuGBK.ttf rgb[89, 53, 15] |
| `/PetSelectLayer/scroll_view` | CCScrollView | [50, 93] | [0, 0] | [540, 218] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## RemainsSelectLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RemainsSelectLayer` | RemainsSelectLayer | [0, 0] | [0, 0] | [640, 452] | [1, 1] | 0 | 是 |  |
| `/RemainsSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 472] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/RemainsSelectLayer/node_title` | CCNode | [320.0, 452.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RemainsSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/RemainsSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择遗物」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/RemainsSelectLayer/spr_scroll_view_bg` | CCScale9Sprite | [320, 110] | [0.5, 0] | [540, 260] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RemainsSelectLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 160] | [0.5, 0.5] | [500, 64] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_block-1.png` 75965438-ee88-4025-9a4a-1e08d5fa1b88 insets[10, 10, 10, 10] |
| `/RemainsSelectLayer/node_desc` | CCNode | [90, 160] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RemainsSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RemainsSelectLayer/UIMenu_1/btn_src` | UIMenuItemLabel | [200, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「添 加」44 [255, 255, 255, 255] |
| `/RemainsSelectLayer/UIMenu_1/btn_identify` | UIMenuItemLabel | [440, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「开始鉴定」44 [255, 255, 255, 255] |
| `/RemainsSelectLayer/menu_item` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## ResonateLayer（44）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ResonateLayer` | ResonateLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/spr_bg` | CCSprite | [320, 640] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/mf_bg.png` e58d1221-9130-4e5a-9e11-4a214cf2ec26 |
| `/ResonateLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 300] | [0.5, 0.5] | [624, 380] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ResonateLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 300] | [0.5, 0.5] | [560, 240] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ResonateLayer/CCScale9Sprite_3` | CCScale9Sprite | [491, 422] | [0.5, 0.5] | [106, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/totem_totem-xiaohaok.png` 6010759e-74a7-43b4-b410-c697f7b8065e insets[10, 10, 10, 10] |
| `/ResonateLayer/CCScale9Sprite_4` | CCScale9Sprite | [431, 143] | [0.5, 0.5] | [150, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/totem_totem-xiaohaok.png` 6010759e-74a7-43b4-b410-c697f7b8065e insets[5, 5, 5, 5] |
| `/ResonateLayer/scroll_view` | CCScrollView | [45, 185] | [0, 0] | [550, 230] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ResonateLayer/CCSprite_1` | CCSprite | [508, 439] | [0.5, 0.5] | [20, 23] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_mficon.png` 4ee5eaee-21cd-4d27-8a2b-1acd59fc4ce9 |
| `/ResonateLayer/spr_icon` | CCSprite | [448, 159] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900302.png` 226a9023-8f11-4978-960f-665f20e26e0f |
| `/ResonateLayer/menu_root` | UIMenu | [565, 159] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/menu_root/btn_src` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [34, 34] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb · Label「」24 [255, 255, 255, 255] |
| `/ResonateLayer/lbl_cube_num` | UILabelTTF | [528, 436] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/ResonateLayer/lbl_item_num` | UILabelTTF | [470, 157] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/ResonateLayer/UILabelTTF_1` | UILabelTTF | [320, 445] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[121, 71, 44] |
| `/ResonateLayer/node_cube` | CCNode | [320.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_5` | CCNode | [85, 870] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_5/CCNode_1` | CCNode | [0, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_5/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [102, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_yxdjk.png` c40d96c0-074d-4305-b833-0f0143bb6859 |
| `/ResonateLayer/hero_node_5/CCNode_1/lbl_hero_level_5` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ResonateLayer/hero_node_6` | CCNode | [560, 870] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_6/CCNode_1` | CCNode | [0, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_6/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [102, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_yxdjk.png` c40d96c0-074d-4305-b833-0f0143bb6859 |
| `/ResonateLayer/hero_node_6/CCNode_1/lbl_hero_level_6` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ResonateLayer/hero_node_3` | CCNode | [97, 714] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_3/CCNode_1` | CCNode | [0, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_3/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [102, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_yxdjk.png` c40d96c0-074d-4305-b833-0f0143bb6859 |
| `/ResonateLayer/hero_node_3/CCNode_1/lbl_hero_level_3` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ResonateLayer/hero_node_4` | CCNode | [535, 714] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_4/CCNode_1` | CCNode | [0, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_4/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [102, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_yxdjk.png` c40d96c0-074d-4305-b833-0f0143bb6859 |
| `/ResonateLayer/hero_node_4/CCNode_1/lbl_hero_level_4` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ResonateLayer/hero_node_2` | CCNode | [399, 651] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_2/CCNode_1` | CCNode | [0, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_2/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [102, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_yxdjk.png` c40d96c0-074d-4305-b833-0f0143bb6859 |
| `/ResonateLayer/hero_node_2/CCNode_1/lbl_hero_level_2` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ResonateLayer/hero_node_1` | CCNode | [244, 651] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_1/CCNode_1` | CCNode | [0, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/hero_node_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [102, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_yxdjk.png` c40d96c0-074d-4305-b833-0f0143bb6859 |
| `/ResonateLayer/hero_node_1/CCNode_1/lbl_hero_level_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ResonateLayer/CCNode_1` | CCNode | [320.0, 1011.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [311, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/magic-cube/magic-cube_mf_djk.png` 2c3a27b3-1eed-4d01-9014-0136216953f9 |
| `/ResonateLayer/CCNode_1/lbl_cube_min_level` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」20 CloudYuanCuGBK.ttf rgb[254, 255, 254] |
| `/ResonateLayer/UIMenu_1` | UIMenu | [577, 952] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ResonateLayer/UIMenu_1/btn_info` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [60, 61] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d · Label「」24 [255, 255, 255, 255] |

## TotemActiveCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemActiveCell` | TotemActiveCell | [0, 0] | [0, 0] | [540, 150] | [1, 1] | 0 | 是 |  |
| `/TotemActiveCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [538, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-1.png` d414718f-712c-442a-876b-336f9006430d insets[10, 10, 10, 10] |
| `/TotemActiveCell/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemActiveCell/UIMenu_1/btn_submit` | UIMenuItemImage | [470, 43] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd |
| `/TotemActiveCell/lbl_name` | UILabelTTF | [146, 106] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/4」22 CloudYuanCuGBK.ttf rgb[121, 71, 44] |
| `/TotemActiveCell/lbl_desc` | UILabelTTF | [146, 50] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/4」22 CloudYuanCuGBK.ttf rgb[223, 96, 33] |
| `/TotemActiveCell/menu_icon` | UIMenu | [80, 75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemActiveCell/active_node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemActiveCell/active_node/lbl_equip` | UILabelTTF | [459, 104] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备中：」20 CloudYuanCuGBK.ttf rgb[121, 71, 44] |
| `/TotemActiveCell/active_node/menu_hero` | UIMenu | [486, 104] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## TotemInfoLayer（79）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemInfoLayer` | TotemInfoLayer | [0, 0] | [0, 0] | [640, 870] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 896] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TotemInfoLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/UIMenu_1/btn_close` | UIMenuItemImage | [566, 894] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TotemInfoLayer/CCSprite_1` | CCSprite | [320, 574] | [0.5, 0.5] | [420, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-pinzhik.png` e642a35b-91dd-4070-b6e4-fd85d6c31450 |
| `/TotemInfoLayer/node_title` | CCNode | [320, 892] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TotemInfoLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/TotemInfoLayer/node_grade` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/CCSprite_1` | CCSprite | [169.664, 720] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** totem/totem-diyus.png |
| `/TotemInfoLayer/node_grade/CCSprite_2` | CCSprite | [463.424, 720] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** totem/totem-diyus.png |
| `/TotemInfoLayer/node_grade/CCSprite_3` | CCSprite | [320, 720] | [0.5, 0.5] | [183, 111] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-jiantou.png` 11b352fb-286e-4163-b976-d7204069cb61 |
| `/TotemInfoLayer/node_grade/menu_grade` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/cur_node` | CCNode | [169, 709.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/next_node` | CCNode | [462.8, 709.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/node_name` | CCNode | [173.12, 625] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/node_name/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [200, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-12.png` 7f8ea80c-39c0-4121-89bf-67b32480f701 insets[10, 10, 30, 30] |
| `/TotemInfoLayer/node_grade/node_name/lbl_cur_name` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemInfoLayer/node_grade/node_name` | CCNode | [462.8, 625] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/node_name/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [200, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-12.png` 7f8ea80c-39c0-4121-89bf-67b32480f701 insets[10, 10, 30, 30] |
| `/TotemInfoLayer/node_grade/node_name/lbl_next_name` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemInfoLayer/node_grade/none_quality` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_grade/none_quality/UILabelTTF_1` | UILabelTTF | [233.28, 575.424] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/TotemInfoLayer/node_grade/none_quality/CCSprite_1` | CCSprite | [338.688, 571.968] | [0.5, 0.5] | [52, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-arrow-1.png` 97fae41c-3a09-44a5-8772-72eac527011c |
| `/TotemInfoLayer/node_grade/none_quality/lbl_cur_quality` | UILabelTTF | [273.3, 575.4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/TotemInfoLayer/node_grade/none_quality/lbl_next_quality` | UILabelTTF | [409.8, 575.4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/TotemInfoLayer/node_level` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TotemInfoLayer/node_level/CCSprite_1` | CCSprite | [320, 697] | [0.5, 0.5] | [395, 245] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-ditu.png` a2474f7b-fddf-49bf-a837-3b8bee0367d5 |
| `/TotemInfoLayer/node_level/CCSprite_2` | CCSprite | [320, 697] | [0.5, 0.5] | [395, 245] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-ditu.png` a2474f7b-fddf-49bf-a837-3b8bee0367d5 |
| `/TotemInfoLayer/node_level/node_name` | CCNode | [320, 617] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_level/node_name/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [200, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-12.png` 7f8ea80c-39c0-4121-89bf-67b32480f701 insets[10, 10, 30, 30] |
| `/TotemInfoLayer/node_level/node_name/lbl_name` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemInfoLayer/node_level/menu_level_icon` | UIMenu | [320, 695] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_level/UILabelTTF_1` | UILabelTTF | [255.744, 573.696] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/TotemInfoLayer/node_level/UILabelTTF_2` | UILabelTTF | [405.7, 573.696] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/TotemInfoLayer/node_level/lbl_level_quality` | UILabelTTF | [265, 573.696] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[223, 96, 33] |
| `/TotemInfoLayer/node_level/lbl_level` | UILabelTTF | [415, 573.696] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物啊」20 CloudYuanCuGBK.ttf rgb[223, 96, 33] |
| `/TotemInfoLayer/node_level/max_level` | CCSprite | [502, 573.7] | [0.5, 0.5] | [63, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem-lang_totem-lang-yimanji.png` ad850401-da07-4261-b02a-4842ede3ff2e |
| `/TotemInfoLayer/has_pet` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/node_attr` | CCNode | [0, 162] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/node_attr/CCScale9Sprite_1` | CCScale9Sprite | [316, 320] | [0.5, 0.5] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[60, 10, 10, 10] |
| `/TotemInfoLayer/has_pet/node_attr/UILabelTTF_1` | UILabelTTF | [65, 362] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_1` | CCNode | [87, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_1/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_1/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_1/CCSprite_2` | CCSprite | [145.152, 0] | [0.5, 0.5] | [42, 22] | [0.8, 0.8] | -270 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_1/UILabelTTF_3` | UILabelTTF | [160, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[76, 254, 98] |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_2` | CCNode | [340, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_2/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[115, 76, 38] |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_2/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_2/CCSprite_2` | CCSprite | [145.152, 0] | [0.5, 0.5] | [42, 22] | [0.8, 0.8] | -270 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/TotemInfoLayer/has_pet/node_attr/node_attr_2/UILabelTTF_3` | UILabelTTF | [160, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[76, 254, 98] |
| `/TotemInfoLayer/has_pet/node_skill` | CCNode | [0, -48] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/node_skill/CCScale9Sprite_1` | CCScale9Sprite | [316, 320] | [0.5, 0.5] | [540, 270] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[60, 10, 10, 10] |
| `/TotemInfoLayer/has_pet/node_skill/UILabelTTF_1` | UILabelTTF | [59, 431] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemInfoLayer/has_pet/menu_icon` | CCMenu | [320, 632] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/item_node_1` | CCNode | [200.4, 485.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/item_node_3` | CCNode | [446, 485.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/has_pet/menu_item` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_cost` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_cost/UILabelTTF_1` | UILabelTTF | [165, 113] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携：」22 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/TotemInfoLayer/node_cost/CCScale9Sprite_1` | CCScale9Sprite | [155, 95] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/totem_totem-xiaohaok.png` 6010759e-74a7-43b4-b410-c697f7b8065e insets[10, 10, 10, 10] |
| `/TotemInfoLayer/node_cost/CCScale9Sprite_2` | CCScale9Sprite | [380, 95] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/totem_totem-xiaohaok.png` 6010759e-74a7-43b4-b410-c697f7b8065e insets[10, 10, 10, 10] |
| `/TotemInfoLayer/node_cost/cost_lbl_2` | UILabelTTF | [538, 113] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携：」22 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/TotemInfoLayer/node_cost/cost_lbl_1` | UILabelTTF | [312, 113] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携：」22 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/TotemInfoLayer/node_cost/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/node_cost/UIMenu_1/cost_icon_1` | UIMenuItemImage | [173, 112] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/TotemInfoLayer/node_cost/UIMenu_1/cost_icon_2` | UIMenuItemImage | [398, 112] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/TotemInfoLayer/menu_operate` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemInfoLayer/menu_operate/btn_disboard` | UIMenuItemImage | [140, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/TotemInfoLayer/menu_operate/btn_up_level` | UIMenuItemImage | [500, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/TotemInfoLayer/menu_operate/btn_reset` | UIMenuItemImage | [320, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/TotemInfoLayer/menu_operate/btn_up_grade` | UIMenuItemImage | [500, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/TotemInfoLayer/menu_operate/btn_change` | UIMenuItemImage | [320, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/TotemInfoLayer/menu_operate/btn_reset_max` | UIMenuItemImage | [500, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/TotemInfoLayer/menu_operate/btn_cannel` | UIMenuItemImage | [140, 62] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/TotemInfoLayer/srcoll_view` | CCScrollView | [56, 146] | [0, 0] | [520, 210] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## TotemListLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemListLayer` | TotemListLayer | [0, 0] | [0, 0] | [640, 864] | [1, 1] | 0 | 是 |  |
| `/TotemListLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 864] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TotemListLayer/spr_panel_bg` | CCScale9Sprite | [320, 441] | [0.5, 0.5] | [560, 610] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/TotemListLayer/UIMenu_1` | UIMenu | [0, -100] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemListLayer/UIMenu_1/btn_1` | UIMenuItemTab | [110, 843] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 |
| `/TotemListLayer/UIMenu_1/btn_2` | UIMenuItemTab | [250, 843] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 |
| `/TotemListLayer/UIMenu_1/btn_close` | UIMenuItemImage | [570, 965.04] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TotemListLayer/UIMenu_1/btn_get` | UIMenuItemImage | [320, 162] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/TotemListLayer/node_layer` | CCNode | [31, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemListLayer/node_title` | CCNode | [320, 864] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TotemListLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/TotemListLayer/UILabelTTF_1` | UILabelTTF | [320, 112] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神装图鉴」22 CloudYuanCuGBK.ttf rgb[121, 71, 44] |
| `/TotemListLayer/lbl_max` | UILabelTTF | [320, 482] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「神装图鉴」22 CloudYuanCuGBK.ttf rgb[121, 71, 44] |

## TotemNotActiveCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemNotActiveCell` | TotemNotActiveCell | [0, 0] | [0, 0] | [540, 150] | [1, 1] | 0 | 是 |  |
| `/TotemNotActiveCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [538, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-1.png` d414718f-712c-442a-876b-336f9006430d insets[10, 10, 10, 10] |
| `/TotemNotActiveCell/lbl_name` | UILabelTTF | [146, 106] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/4」22 CloudYuanCuGBK.ttf rgb[121, 71, 44] |
| `/TotemNotActiveCell/lbl_desc` | UILabelTTF | [146, 80] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/4」22 CloudYuanCuGBK.ttf rgb[223, 96, 33] |
| `/TotemNotActiveCell/menu_icon` | UIMenu | [80, 75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemNotActiveCell/lbl_info` | UILabelTTF | [146, 50] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备中：」18 CloudYuanCuGBK.ttf rgb[122, 71, 44] |

## TotemResetReViewLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemResetReViewLayer` | TotemResetReViewLayer | [0, 0] | [0, 0] | [640, 446] | [1, 1] | 0 | 是 |  |
| `/TotemResetReViewLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 446] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/TotemResetReViewLayer/node_title` | CCNode | [320, 446] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemResetReViewLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/TotemResetReViewLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/TotemResetReViewLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemResetReViewLayer/UIMenu_1/btn_close` | UIMenuItemImage | [585, 442] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TotemResetReViewLayer/UIMenu_1/btn_cannel` | UIMenuItemImage | [185, 71] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/TotemResetReViewLayer/UIMenu_1/btn_reset` | UIMenuItemImage | [468, 71] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/TotemResetReViewLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 202] | [0.5, 0.5] | [500, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/TotemResetReViewLayer/lbl_select` | UILabelTTF | [71, 339] | [0, 0.5] | [500, 0] | [1, 1] | 0 | 是 | cc.Label「图腾重置可100%返还图腾的培养材料。本次重置可获得以下：」20 CloudYuanCuGBK.ttf rgb[89, 53, 15] |
| `/TotemResetReViewLayer/lbl_tips` | UILabelTTF | [587, 327] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」20 CloudYuanCuGBK.ttf rgb[89, 53, 15] |
| `/TotemResetReViewLayer/scroll_view` | CCScrollView | [76, 117] | [0, 0] | [490, 170] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## TotemSkillInfo（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemSkillInfo` | TotemSkillInfo | [0, 0] | [0, 0] | [470, 75] | [1, 1] | 0 | 是 |  |
| `/TotemSkillInfo/CCSprite_1` | CCSprite | [8, 60] | [0.5, 0.5] | [15, 15] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-huangdian.png` 9345b628-58dc-480e-9458-516060fe5c87 |
| `/TotemSkillInfo/UILabelTTF_1` | UILabelTTF | [20, 75] | [0, 1] | [440, 75] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊未携带宠物啊未携带宠物啊带宠未携带宠物啊未携带宠物啊未携带宠物啊带宠带宠带宠带宠带宠带宠带宠」22 CloudYuanCuGBK.ttf rgb[32, 154, 0] |

## TotemTipsLayer（33）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TotemTipsLayer` | TotemTipsLayer | [0, 0] | [0, 0] | [390, 540] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 540] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/TotemTipsLayer/spr_rare` | CCSprite | [195, 471] | [0.5, 0.5] | [380, 127] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-banner-backpack-1.png` d53c7eef-8fc6-4dc2-8eb1-46727b30e850 |
| `/TotemTipsLayer/menu_close` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/menu_close/btn_close` | UIMenuItemImage | [350, 516] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TotemTipsLayer/menu_icon` | UIMenu | [95, 447] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/UILabelTTF_1` | UILabelTTF | [16, 383] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/TotemTipsLayer/UILabelTTF_2` | UILabelTTF | [16, 306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」22 CloudYuanCuGBK.ttf rgb[255, 197, 116] |
| `/TotemTipsLayer/node_attr` | CCNode | [0, 12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/node_attr/node_attr_1` | CCNode | [27, 335] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/node_attr/node_attr_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/TotemTipsLayer/node_attr/node_attr_1/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/TotemTipsLayer/node_attr/node_attr_1/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/TotemTipsLayer/node_attr/node_attr_2` | CCNode | [221, 335] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/node_attr/node_attr_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/TotemTipsLayer/node_attr/node_attr_2/UILabelTTF_1` | UILabelTTF | [20, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宠物」20 CloudYuanCuGBK.ttf rgb[144, 110, 72] |
| `/TotemTipsLayer/node_attr/node_attr_2/UILabelTTF_2` | UILabelTTF | [65, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+12.3%」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/TotemTipsLayer/lbl_name` | UILabelTTF | [128, 511] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊」24 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/TotemTipsLayer/UILabelTTF_3` | UILabelTTF | [127, 438] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携：」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemTipsLayer/skill_1` | CCNode | [22, 272] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/skill_1/CCSprite_1` | CCSprite | [0, 5] | [0.5, 0.5] | [15, 15] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-huangdian.png` 9345b628-58dc-480e-9458-516060fe5c87 |
| `/TotemTipsLayer/skill_1/UILabelTTF_1` | UILabelTTF | [12, 15] | [0, 1] | [340, 80] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊未携带宠物啊未携带宠物啊带宠未携带宠物啊未携带宠物啊未携带宠物啊带宠」18 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/TotemTipsLayer/skill_2` | CCNode | [22, 195] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/skill_2/CCSprite_1` | CCSprite | [0, 5] | [0.5, 0.5] | [15, 15] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-huangdian.png` 9345b628-58dc-480e-9458-516060fe5c87 |
| `/TotemTipsLayer/skill_2/UILabelTTF_1` | UILabelTTF | [12, 15] | [0, 1] | [340, 80] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊未携带宠物啊未携带宠物啊带宠未携带宠物啊未携带宠物啊未携带宠物啊带宠」18 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/TotemTipsLayer/skill_3` | CCNode | [22, 115] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/skill_3/CCSprite_1` | CCSprite | [0, 5] | [0.5, 0.5] | [15, 15] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem_totem-huangdian.png` 9345b628-58dc-480e-9458-516060fe5c87 |
| `/TotemTipsLayer/skill_3/UILabelTTF_1` | UILabelTTF | [12, 15] | [0, 1] | [340, 80] | [1, 1] | 0 | 是 | cc.Label「未携带宠物啊未携带宠物啊未携带宠物啊带宠未携带宠物啊未携带宠物啊未携带宠物啊带宠」18 CloudYuanCuGBK.ttf rgb[32, 154, 0] |
| `/TotemTipsLayer/menu` | UIMenu | [68, 474] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TotemTipsLayer/lbl_prop_type` | UILabelTTF | [128, 471] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「类型：武器」22 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/TotemTipsLayer/lbl_quality` | UILabelTTF | [187, 438] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemTipsLayer/UILabelTTF_4` | UILabelTTF | [250, 438] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携：」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
| `/TotemTipsLayer/lbl_level` | UILabelTTF | [308, 438] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未携：」22 CloudYuanCuGBK.ttf rgb[252, 227, 180] |
