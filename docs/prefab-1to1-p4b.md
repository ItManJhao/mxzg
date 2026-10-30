# P4-b 英雄扩展 Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| HeroArriveItem | `prefabs/ui/hero/HeroArriveItem.prefab` | 7 |
| HeroArriveLayer | `prefabs/ui/hero/HeroArriveLayer.prefab` | 15 |
| HeroAstrolabeActiveLayer | `prefabs/ui/hero/HeroAstrolabeActiveLayer.prefab` | 18 |
| HeroAstrolabeLayer | `prefabs/ui/hero/HeroAstrolabeLayer.prefab` | 96 |
| HeroAstrolabeSelectSkillLayer | `prefabs/ui/hero/HeroAstrolabeSelectSkillLayer.prefab` | 37 |
| HeroAstrolabeUnlockLayer | `prefabs/ui/hero/HeroAstrolabeUnlockLayer.prefab` | 29 |
| HeroCommentCell | `prefabs/ui/hero/HeroCommentCell.prefab` | 14 |
| HeroCommentLayer | `prefabs/ui/hero/HeroCommentLayer.prefab` | 21 |
| HeroContractSelectCell | `prefabs/ui/hero/HeroContractSelectCell.prefab` | 12 |
| HeroContractSelectLayer | `prefabs/ui/hero/HeroContractSelectLayer.prefab` | 34 |
| HeroEvolutionAttrCell | `prefabs/ui/hero/HeroEvolutionAttrCell.prefab` | 5 |
| HeroEvolutionInfoLayer | `prefabs/ui/hero/HeroEvolutionInfoLayer.prefab` | 23 |
| HeroEvolutionLayer | `prefabs/ui/hero/HeroEvolutionLayer.prefab` | 36 |
| HeroEvolutionPreviewLayer | `prefabs/ui/hero/HeroEvolutionPreviewLayer.prefab` | 48 |
| HeroEvolutionSeat | `prefabs/ui/hero/HeroEvolutionSeat.prefab` | 9 |
| HeroEvolutionSelectLayer | `prefabs/ui/hero/HeroEvolutionSelectLayer.prefab` | 11 |
| HeroEvolutionSuccessLayer | `prefabs/ui/hero/HeroEvolutionSuccessLayer.prefab` | 12 |
| HeroEvolutionTreeLayer | `prefabs/ui/hero/HeroEvolutionTreeLayer.prefab` | 42 |
| HeroEvolveIllustratLayer | `prefabs/ui/hero/HeroEvolveIllustratLayer.prefab` | 15 |
| HeroGodEquipAttrLayer | `prefabs/ui/hero/HeroGodEquipAttrLayer.prefab` | 13 |
| HeroGodEquipOrderAttrLayer | `prefabs/ui/hero/HeroGodEquipOrderAttrLayer.prefab` | 5 |
| HeroGodEquipStateLayer | `prefabs/ui/hero/HeroGodEquipStateLayer.prefab` | 9 |
| HeroMatrixCell | `prefabs/ui/hero/HeroMatrixCell.prefab` | 11 |
| HeroMatrixLayer | `prefabs/ui/hero/HeroMatrixLayer.prefab` | 56 |
| HeroMaxSkinLayer | `prefabs/ui/hero/HeroMaxSkinLayer.prefab` | 28 |
| HeroPalaceLayer | `prefabs/ui/hero/HeroPalaceLayer.prefab` | 53 |
| HeroPalaceRewardCell | `prefabs/ui/hero/HeroPalaceRewardCell.prefab` | 6 |
| HeroPalaceRewardLayer | `prefabs/ui/hero/HeroPalaceRewardLayer.prefab` | 9 |
| HeroPernuteCell | `prefabs/ui/hero/HeroPernuteCell.prefab` | 25 |
| HeroPernuteLayer | `prefabs/ui/hero/HeroPernuteLayer.prefab` | 5 |
| HeroPernuteSelectLayer | `prefabs/ui/hero/HeroPernuteSelectLayer.prefab` | 8 |
| HeroRollBackLayer | `prefabs/ui/hero/HeroRollBackLayer.prefab` | 29 |
| HeroShareInfoContentLayer | `prefabs/ui/hero/HeroShareInfoContentLayer.prefab` | 33 |
| HeroShareInfoLayer | `prefabs/ui/hero/HeroShareInfoLayer.prefab` | 32 |
| HeroShareMenu | `prefabs/ui/hero/HeroShareMenu.prefab` | 7 |
| HeroSkinSettingLayer | `prefabs/ui/hero/HeroSkinSettingLayer.prefab` | 61 |
| HeroSoulLayer | `prefabs/ui/hero/HeroSoulLayer.prefab` | 49 |
| HeroSoulResultLayer | `prefabs/ui/hero/HeroSoulResultLayer.prefab` | 17 |
| HeroSoulShowCell | `prefabs/ui/hero/HeroSoulShowCell.prefab` | 9 |
| HeroSoulShowLayer | `prefabs/ui/hero/HeroSoulShowLayer.prefab` | 9 |
| HeroTalkTipsLayer | `prefabs/ui/hero/HeroTalkTipsLayer.prefab` | 3 |
| HeroUseSkinLayer | `prefabs/ui/hero/HeroUseSkinLayer.prefab` | 33 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/hero/hero-arrive_spr-shadow.png` | [10, 10, 1, 0] |
| `ui/common/win-bg_block-bg-23.png` | [3, 3, 0, 0] |
| `ui/maps/astrolabe_bg.png` | [78, 80, 100, 96] |
| `ui/astrolabe/astrolabe_spr_line2.png` | [0, 0, 10, 10] |
| `ui/misc/evolution_frame-1.png` | [100, 100, 50, 49] |
| `ui/common/win-bg_block-bg-7.png` | [19, 19, 19, 19] |
| `ui/common/other_spr-huitui-k2.png` | [89, 4, 79, 79] |
| `ui/city/main-altar_spr_back_2.png` | [100, 9, 10, 10] |
| `ui/common/win-bg_block-bg-notice.png` | [19, 9, 0, 8] |
| `ui/hero/hero-share_spr-menu-bg.png` | [10, 10, 10, 10] |
| `ui/common/win-bg_block-bg-30.png` | [9, 9, 0, 0] |
| `ui/common/win-bg_block-bg-26.png` | [9, 9, 9, 9] |
| `ui/common/win-bg_block-bg-9.png` | [19, 19, 19, 19] |
| `ui/hero/hero-soul_spr-soul-bg4.png` | [10, 10, 10, 10] |

由更早的 P4 PR 改（本 PR 不碰）：

- `ui/common/win-bg_cell-bg-11.png` → P4A

保留现值（P1/P2 改过的，或原本就有）：

- `ui/hero/hero-info_spr-hero-image-3.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）
- `ui/maps/map-bg-result-1.png` [150, 150, 10, 10]（edited by P3A）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/hero/hero-info_spr-bg-6.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_block-bg-20.png` [9, 9, 9, 9]（edited by P2A）
- `ui/misc/dungeon_spr-reward-cell-bg.png` [10, 10, 0, 0]（edited by P3A）
- `ui/hero/hero-info_spr-new-8.png` [40, 40, 60, 60]（edited by P3B1）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `HeroEvolveIllustratLayer:/HeroEvolveIllustratLayer/spr_box` |
| `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [70, 20, 20, 20] | `HeroPernuteCell:/HeroPernuteCell/spr_hero_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroAstrolabeLayer:/HeroAstrolabeLayer/CCNode_1/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroAstrolabeSelectSkillLayer:/HeroAstrolabeSelectSkillLayer/CCNode_1/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroCommentLayer:/HeroCommentLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroEvolutionPreviewLayer:/HeroEvolutionPreviewLayer/node_bottom/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroEvolveIllustratLayer:/HeroEvolveIllustratLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroGodEquipStateLayer:/HeroGodEquipStateLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroMatrixLayer:/HeroMatrixLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroPalaceRewardLayer:/HeroPalaceRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroShareInfoLayer:/HeroShareInfoLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroSoulLayer:/HeroSoulLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroSoulShowLayer:/HeroSoulShowLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroEvolutionLayer:/HeroEvolutionLayer/node_bottom/spr_desc_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroEvolutionLayer:/HeroEvolutionLayer/node_bottom/node_comsume/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroEvolutionPreviewLayer:/HeroEvolutionPreviewLayer/node_bottom/spr_desc_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroGodEquipStateLayer:/HeroGodEquipStateLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroMatrixLayer:/HeroMatrixLayer/node_pannel/spr_pannel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroPalaceRewardLayer:/HeroPalaceRewardLayer/spr_box` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `HeroEvolutionInfoLayer:/HeroEvolutionInfoLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [19, 19, 19, 19] | `HeroGodEquipAttrLayer:/HeroGodEquipAttrLayer/bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [19, 19, 19, 19] | `HeroGodEquipOrderAttrLayer:/HeroGodEquipOrderAttrLayer/bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [9, 9, 9, 9] | `HeroMaxSkinLayer:/HeroMaxSkinLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [9, 9, 9, 9] | `HeroUseSkinLayer:/HeroUseSkinLayer/CCScale9Sprite_1` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `HeroEvolutionSuccessLayer:/HeroEvolutionSuccessLayer/spr_bg` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [44, 9, 9, 9] | `HeroEvolutionLayer:/HeroEvolutionLayer/node_bottom/CCScale9Sprite_2` |
| `win-bg_block-bg-7.png` | [19, 19, 19, 19] | [9, 9, 9, 9] | `HeroPernuteCell:/HeroPernuteCell/spr_bg_backpack` |
| `win-bg_block-bg-7.png` | [19, 19, 19, 19] | [9, 9, 9, 9] | `HeroPernuteSelectLayer:/HeroPernuteSelectLayer/spr_bg_backpack` |
| `win-bg_block-bg-7.png` | [19, 19, 19, 19] | [9, 9, 9, 9] | `HeroRollBackLayer:/HeroRollBackLayer/msg_panel/spr_bg_backpack` |
| `hero-info_spr-new-8.png` | [40, 40, 60, 60] | [0, 0, 40, 40] | `HeroShareInfoLayer:/HeroShareInfoLayer/CCScale9Sprite_1` |

## HeroArriveItem（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroArriveItem` | HeroArriveItem | [0, 0] | [0, 0] | [210, 250] | [1, 1] | 0 | 是 |  |
| `/HeroArriveItem/CCSprite_1` | CCSprite | [0, 0] | [0, 0] | [210, 250] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-item-bg.png` 2de39efc-296b-4fa3-ab08-b85f3837cfb0 |
| `/HeroArriveItem/menu` | CCMenu | [103, 128] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroArriveItem/menu/btn_goto` | UIMenuItemImage | [1, -83] | [0.5, 0.5] | [132, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-arrive-lang_btn-yellow-small.png` 6a25cea0-a150-448e-b3a9-86a58829fa00 |
| `/HeroArriveItem/menu/btn_get` | UIMenuItemImage | [1, -83] | [0.5, 0.5] | [132, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-arrive-lang_btn-green.png` be83d9bc-607b-49d9-a4c8-798b0ce0dded |
| `/HeroArriveItem/lbl_progress` | UILabelTTF | [98, 200] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「完成进度：2/3」22 STZhongsong.ttf rgb[255, 224, 242] |
| `/HeroArriveItem/spr_geted` | CCSprite | [135, 58] | [0.5, 0.5] | [68, 68] | [1.2, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-geted.png` 71677482-55d2-49ea-bda1-3139c6fef927 |

## HeroArriveLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroArriveLayer` | HeroArriveLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroArriveLayer/node` | CCNode | [320.0, 480.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroArriveLayer/node/CCSprite_1` | CCSprite | [-12, 112] | [0.5, 0.5] | [634, 504] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive-lang_spr-hero-icon.png` 9ae7218a-3fec-440c-99ac-f907dd49e7ff |
| `/HeroArriveLayer/node/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroArriveLayer/node/CCMenu_1/btn_goto` | UIMenuItemImage | [-7, -114] | [0.5, 0.5] | [132, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-arrive-lang_btn-yellow-big.png` c12497f2-44db-4709-a184-b197f9d88f8c |
| `/HeroArriveLayer/node/CCMenu_1/btn_info` | UIMenuItemImage | [224, -114] | [0.5, 0.5] | [124, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-arrive-lang_spr-look-info.png` 155221ed-25a5-4c43-9dab-fa480cfdfc8c |
| `/HeroArriveLayer/node/CCMenu_1/btn_get` | UIMenuItemImage | [-7, -114] | [0.5, 0.5] | [132, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-arrive-lang_btn-green.png` be83d9bc-607b-49d9-a4c8-798b0ce0dded |
| `/HeroArriveLayer/node/CCSprite_2` | CCSprite | [-8, -71] | [0.5, 0.5] | [216, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-pink.png` b59f2ab6-1eaf-4a75-8682-001f8113f43e |
| `/HeroArriveLayer/node/lbl_progress` | UILabelTTF | [-8, -71] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「完成进度：2/3」22 STZhongsong.ttf rgbNone |
| `/HeroArriveLayer/node/menu_items` | CCMenu | [0, -265] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroArriveLayer/node/CCMenu_2` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroArriveLayer/node/CCMenu_2/btn_close` | UIMenuItemImage | [226, 328] | [0.5, 0.5] | [62, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-arrive_btn-close.png` e1a7ce3f-558e-4e0a-acb1-3726b72aa3a0 |
| `/HeroArriveLayer/node/CCScale9Sprite_1` | CCScale9Sprite | [-298, -122] | [0.5, 0.5] | [200, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-arrive_spr-shadow.png` 03f50dff-cafe-42f5-b828-452d1d7e4090 insets[10, 10, 10, 10] |
| `/HeroArriveLayer/node/lbl_time_tips` | UILabelTTF | [-298, -108] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「活动时间:」18 STZhongsong.ttf rgbNone |
| `/HeroArriveLayer/node/lbl_time` | UILabelTTF | [-215, -108] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「活动时间:」18 STZhongsong.ttf rgb[0, 249, 0] |

## HeroAstrolabeActiveLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroAstrolabeActiveLayer` | HeroAstrolabeActiveLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeActiveLayer/spr_bg` | CCSprite | [320.0, 200.0] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/HeroAstrolabeActiveLayer/spr_title` | CCSprite | [364.0, 402.0] | [0.5, 0.5] | [422, 96] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe-lang/astrolabe-lang_spr-uplimit-1.png` 2cbdce82-55c4-4927-ae98-31a2aada79e6 |
| `/HeroAstrolabeActiveLayer/CCNode_1` | CCNode | [320.0, 310.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeActiveLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [512, 38] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f |
| `/HeroAstrolabeActiveLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「上阵英雄累计    星启动」52 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroAstrolabeActiveLayer/CCNode_1/lbl_star` | UILabelTTF | [40, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」52 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeActiveLayer/CCNode_2` | CCNode | [320.0, 259.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeActiveLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [-40, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前累计星级等级」44 FZCSJW--GB1-0.ttf rgb[255, 190, 55] |
| `/HeroAstrolabeActiveLayer/CCNode_2/lbl_star_rate` | UILabelTTF | [100, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」44 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeActiveLayer/CCNode_3` | CCNode | [320.0, 173.0] | [0.5, 0.5] | [500, 110] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeActiveLayer/CCNode_3/lbl_property_1` | UILabelTTF | [0.0, 38.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」44 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeActiveLayer/CCNode_3/lbl_property_2` | UILabelTTF | [0.0, 3.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」44 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeActiveLayer/CCNode_3/lbl_property_3` | UILabelTTF | [0.0, -32.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」44 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeActiveLayer/menu` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeActiveLayer/menu/btn_active` | UIMenuItemLabel | [0, 82] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「激 活」48 [255, 255, 255, 255] |
| `/HeroAstrolabeActiveLayer/CCSprite_1` | CCSprite | [320.0, -20.0] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/HeroAstrolabeActiveLayer/no_active` | UILabelTTF | [320.0, 84.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「上一级未激活」54 FZCSJW--GB1-0.ttf rgb[255, 190, 55] |

## HeroAstrolabeLayer（96）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroAstrolabeLayer` | HeroAstrolabeLayer | [0, 0] | [0, 0] | [640, 900] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [640, 900] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 450.0] | [0.5, 0.5] | [633.6, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroAstrolabeLayer/CCNode_1/spr_bg` | CCSprite | [321, 439] | [0.5, 0.5] | [559, 714] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/astrolabe_bg_2.png` 742fb124-7d5c-4881-b9b2-69e4edc70865 |
| `/HeroAstrolabeLayer/CCNode_1/node_title` | CCNode | [320.0, 900.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_title/spr_title_bg` | CCScale9Sprite | [0, -10] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroAstrolabeLayer/CCNode_1/node_title/title` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel` | CCNode | [322.222, 505.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_2` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_1.png` 23dbc55f-0dfd-4959-8077-cc5cd9d38b56 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_3` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_2.png` 912b0fb8-77e3-459d-b250-188942a89d73 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_4` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_3.png` af0f3a0b-0138-44db-993e-de932ee11924 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_5` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_4.png` 1cbe9ba0-2747-4a0f-8f87-1a6c63a1bb7a |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_6` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_5.png` 3b64c40f-cdb0-4a1f-aecd-70da19888276 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_7` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_6.png` 20327fc5-d7a3-46e2-958f-1450375c83ee |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_8` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_7.png` a05ee0ac-e54f-43b1-8c8b-b39ba75b4852 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_9` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_8.png` 8980ea7b-6d5d-428b-a562-d8128a7a1da9 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_10` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_9.png` 31c5cd7f-9116-4041-89fb-e8693f2f574f |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_11` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_10.png` eb4be1de-3117-4a7d-b992-2aaec4eb687e |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_12` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_11.png` 990352e6-2ec2-42fb-82a6-4c05294f3aee |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_13` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_12.png` efb4629d-88c3-4ed2-90c1-c4b6450e8bc1 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_14` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_13.png` b28dfa1f-294d-4910-9ec2-138d73a1ad26 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_line/spr_line_15` | CCSprite | [0, 0] | [0.5, 0.5] | [370, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_path_14.png` f8c5e928-eb27-45d0-9374-07cb299fbe17 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_1` | UIMenuItemImage | [154, 91.5] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_2` | UIMenuItemImage | [106, 145] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_3` | UIMenuItemImage | [-1, 175] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_4` | UIMenuItemImage | [-109.278, 145] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_5` | UIMenuItemImage | [-156.5, 92.611] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_6` | UIMenuItemImage | [-176, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_7` | UIMenuItemImage | [-157.195, -87.639] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_8` | UIMenuItemImage | [-109.972, -141.111] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_9` | UIMenuItemImage | [-1, -172] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_10` | UIMenuItemImage | [107.389, -141.111] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_11` | UIMenuItemImage | [153.611, -87.333] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_12` | UIMenuItemImage | [174.083, -0.083] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_13` | UIMenuItemImage | [93.111, -13.333] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_14` | UIMenuItemImage | [67.111, 60.278] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/menu_star_pos/btn_star_pos_15` | UIMenuItemImage | [-1, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_1` | CCNode | [154.111, 59.083] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_1/lbl_star_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_2` | CCNode | [104.68, 113.337] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_2/lbl_star_2` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_3` | CCNode | [-1.616, 126.733] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_3/lbl_star_3` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_4` | CCNode | [-109.109, 113.337] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_4/lbl_star_4` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_5` | CCNode | [-155.611, 59.083] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_5/lbl_star_5` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_6` | CCNode | [-175.429, -46.41] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_6/lbl_star_6` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_7` | CCNode | [-155.67, -119.752] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_7/lbl_star_7` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_8` | CCNode | [-109.119, -173.671] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_8/lbl_star_8` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_9` | CCNode | [0.728, -220.222] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_9/lbl_star_9` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_10` | CCNode | [106.556, -173.671] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_10/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_10/lbl_star_10` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_11` | CCNode | [154.121, -119.417] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_11/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_11/lbl_star_11` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_12` | CCNode | [175.88, -47.079] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_12/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_12/lbl_star_12` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_13` | CCNode | [93.495, -45.405] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_13/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_13/lbl_star_13` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_14` | CCNode | [67.373, 28.943] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_14/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_14/lbl_star_14` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_15` | CCNode | [-1.616, -48.754] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_15/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 42] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/HeroAstrolabeLayer/CCNode_1/node_star_panel/node_star_pos/node_star_label_15/lbl_star_15` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「星盘」32 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/node_cur_star` | CCNode | [315.528, 235.028] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/node_cur_star/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [221, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-23.png` 036f5f7d-dcd3-45f8-8771-2f545f62ce40 insets[4, 4, 0, 0] |
| `/HeroAstrolabeLayer/CCNode_1/node_cur_star/UILabelTTF_1` | UILabelTTF | [-18, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「上阵累计最高星级:」44 FZCSJW--GB1-0.ttf rgb[252, 232, 191] |
| `/HeroAstrolabeLayer/CCNode_1/node_cur_star/lbl_max_star` | UILabelTTF | [79, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[140, 250, 87] |
| `/HeroAstrolabeLayer/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640.0, 900.0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeLayer/CCNode_1/menu/btn_close` | UIMenuItemImage | [566.0, 863.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroAstrolabeLayer/CCNode_1/menu/btn_elem` | UIMenuItemImage | [544.028, 742.0] | [0.5, 0.5] | [77, 77] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/astrolabe-lang/astrolabe-lang_btn_elem.png` 34c81039-4bd1-4694-8080-c418bdb323cd |
| `/HeroAstrolabeLayer/CCNode_1/menu/btn_reset` | UIMenuItemImage | [102.0, 742.0] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/astrolabe-lang/astrolabe-lang_btn_reset.png` 0f415a96-c9a5-4a3b-8829-a32d7ef12865 |
| `/HeroAstrolabeLayer/CCNode_1/menu/btn_active` | UIMenuItemLabel | [320.0, 171.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「点 亮」40 [255, 255, 255, 255] |
| `/HeroAstrolabeLayer/CCNode_1/menu/btn_left` | UIMenuItemImage | [102.0, 236.0] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/astrolabe/astrolabe_btn_left.png` cb69ad4a-56cf-4290-9e0f-ca1343f7da2e |
| `/HeroAstrolabeLayer/CCNode_1/menu/btn_right` | UIMenuItemImage | [544.0, 236.0] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/astrolabe/astrolabe_btn_right.png` 8231b10e-212e-471b-85ed-0b0a7638e36b |

## HeroAstrolabeSelectSkillLayer（37）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroAstrolabeSelectSkillLayer` | HeroAstrolabeSelectSkillLayer | [0, 0] | [0, 0] | [640, 640] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [640, 640] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 320.0] | [0.5, 0.5] | [640.0, 640.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_title` | CCNode | [320.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_title/spr_title_bg` | CCScale9Sprite | [0, -10] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_title/title` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能选择」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel` | CCNode | [320, 385.25] | [0.5, 0.5] | [554, 326] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [554.0, 326.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/UILabelTTF_1` | UILabelTTF | [0.0, 136.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请为您的角色选择技能偏向」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/menu_star_pos` | UIMenu | [-277.0, -163.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/menu_star_pos/btn_skill_1` | UIMenuItemImage | [90.111, 227] | [0.5, 0.5] | [64, 64] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101010011.png` d46c4986-e0dd-44e1-8002-1746b1f4477a |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/menu_star_pos/btn_skill_2` | UIMenuItemImage | [277.833, 227] | [0.5, 0.5] | [64, 64] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101010011.png` d46c4986-e0dd-44e1-8002-1746b1f4477a |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/menu_star_pos/btn_skill_3` | UIMenuItemImage | [462, 227] | [0.5, 0.5] | [64, 64] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101010011.png` d46c4986-e0dd-44e1-8002-1746b1f4477a |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/menu_star_pos/btn_skill_4` | UIMenuItemImage | [176, 90] | [0.5, 0.5] | [64, 64] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101010011.png` d46c4986-e0dd-44e1-8002-1746b1f4477a |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/menu_star_pos/btn_skill_5` | UIMenuItemImage | [382, 90] | [0.5, 0.5] | [64, 64] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101010011.png` d46c4986-e0dd-44e1-8002-1746b1f4477a |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_1` | CCNode | [-186.778, 11.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_1/lbl_desc_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_1/lbl_value_1` | UILabelTTF | [0, -20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_2` | CCNode | [1.222, 11.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_2/lbl_desc_2` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_2/lbl_value_2` | UILabelTTF | [0, -20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_3` | CCNode | [184.222, 11.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_3/lbl_desc_3` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_3/lbl_value_3` | UILabelTTF | [0, -20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_4` | CCNode | [-99.778, -125.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_4/lbl_desc_4` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_4/lbl_value_4` | UILabelTTF | [0, -20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_5` | CCNode | [106.222, -125.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_5/lbl_desc_5` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_star_panel/node_label_5/lbl_value_5` | UILabelTTF | [0, -20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」39 FZCSJW--GB1-0.ttf rgb[0, 249, 0] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_item` | CCNode | [320, 172] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_item/UILabelTTF_1` | UILabelTTF | [-133.167, -0.292] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「消耗启动试剂:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/node_item/lbl_num` | UILabelTTF | [62.833, -0.292] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」44 FZCSJW--GB1-0.ttf rgb[255, 38, 0] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640.0, 640.0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/menu/btn_close` | UIMenuItemImage | [566.0, 603.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/menu/btn_active` | UIMenuItemLabel | [320.0, 95.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「升 级」40 [255, 255, 255, 255] |
| `/HeroAstrolabeSelectSkillLayer/CCNode_1/lbl_actived` | UILabelTTF | [318.222, 95.375] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已激活」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |

## HeroAstrolabeUnlockLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroAstrolabeUnlockLayer` | HeroAstrolabeUnlockLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/spr_bg_inner` | CCScale9Sprite | [318, 641] | [0.5, 0.5] | [593, 1022] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/astrolabe_bg.png` 873cbab9-65cb-460c-9e0b-e201c9263462 insets[80, 80, 100, 100] |
| `/HeroAstrolabeUnlockLayer/CCNode_1` | CCNode | [320, 640] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock` | CCNode | [0, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/node_line` | CCNode | [0, -13] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/node_line/spr_line_1` | CCSprite | [-57, 98] | [0.5, 0.5] | [121, 161] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_spr_line.png` a2aeefda-abde-4129-b532-eb867825d2a8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/node_line/spr_line_2` | CCSprite | [77.958, 84.042] | [0.5, 0.5] | [121, 161] | [1, 1] | -80 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_spr_line.png` a2aeefda-abde-4129-b532-eb867825d2a8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/node_line/spr_line_3` | CCSprite | [91.708, -29.667] | [0.5, 0.5] | [121, 161] | [1, 1] | -154 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_spr_line.png` a2aeefda-abde-4129-b532-eb867825d2a8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/node_line/spr_line_4` | CCSprite | [-11.458, -86.417] | [0.5, 0.5] | [121, 161] | [1, 1] | -220 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_spr_line.png` a2aeefda-abde-4129-b532-eb867825d2a8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/node_line/spr_line_5` | CCSprite | [-94.667, 1.833] | [0.5, 0.5] | [121, 161] | [1, 1] | -294 | 是 | cc.Sprite SIMPLE `ui/astrolabe/astrolabe_spr_line.png` a2aeefda-abde-4129-b532-eb867825d2a8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/CCNode_1/spr_path_1` | CCScale9Sprite | [0, 147] | [0.5, 0.5] | [210, 24] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/astrolabe/astrolabe_spr_line2.png` e8bb71a4-26d1-4a82-af8d-0451ee2c0547 insets[0, 0, 10, 10] |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/CCNode_1/spr_path_2` | CCScale9Sprite | [136.833, 53.083] | [0.5, 0.5] | [210, 24] | [1, 1] | -70 | 是 | cc.Sprite SLICED `ui/astrolabe/astrolabe_spr_line2.png` e8bb71a4-26d1-4a82-af8d-0451ee2c0547 insets[0, 0, 10, 10] |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/CCNode_1/spr_path_3` | CCScale9Sprite | [91.542, -108.583] | [0.5, 0.5] | [210, 24] | [1, 1] | -144 | 是 | cc.Sprite SLICED `ui/astrolabe/astrolabe_spr_line2.png` e8bb71a4-26d1-4a82-af8d-0451ee2c0547 insets[0, 0, 10, 10] |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/CCNode_1/spr_path_4` | CCScale9Sprite | [-87.208, -111.917] | [0.5, 0.5] | [210, 24] | [1, 1] | -36 | 是 | cc.Sprite SLICED `ui/astrolabe/astrolabe_spr_line2.png` e8bb71a4-26d1-4a82-af8d-0451ee2c0547 insets[0, 0, 10, 10] |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/CCNode_1/spr_path_5` | CCScale9Sprite | [-136.792, 49.542] | [0.5, 0.5] | [210, 24] | [1, 1] | -110 | 是 | cc.Sprite SLICED `ui/astrolabe/astrolabe_spr_line2.png` e8bb71a4-26d1-4a82-af8d-0451ee2c0547 insets[0, 0, 10, 10] |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/menu_elem` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/menu_elem/btn_elem_5` | UIMenuItemImage | [106, 147] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/menu_elem/btn_elem_4` | UIMenuItemImage | [-106, 147] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/menu_elem/btn_elem_3` | UIMenuItemImage | [-171, -52] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/menu_elem/btn_elem_2` | UIMenuItemImage | [168, -52] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_unlock/menu_elem/btn_elem_1` | UIMenuItemImage | [3, -170] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_property` | CCNode | [0, -227] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_property/scroll_view` | CCScrollView | [0, 0] | [0.5, 0.5] | [500, 90] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_item` | CCNode | [1.042, -333.583] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/node_item/UILabelTTF_1` | UILabelTTF | [-123.167, 4.708] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「消耗星盘石:」44 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroAstrolabeUnlockLayer/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroAstrolabeUnlockLayer/CCNode_1/menu/btn_close` | UIMenuItemImage | [249.5, 457.292] | [0.5, 0.5] | [91, 90] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-5.png` faf9593e-e1ac-4d78-ad1d-d691a9f519e8 |
| `/HeroAstrolabeUnlockLayer/CCNode_1/menu/btn_active` | UIMenuItemLabel | [0, -410] | [0.5, 0.5] | [182, 57] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/astrolabe-lang/astrolabe-lang_btn_active.png` beb2939a-3de3-4601-8bdb-85b0b51a64b5 · Label「」24 [255, 255, 255, 255] |

## HeroCommentCell（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroCommentCell` | HeroCommentCell | [0, 0] | [0, 0] | [540, 122] | [1, 1] | 0 | 是 |  |
| `/HeroCommentCell/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [542, 122] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/HeroCommentCell/spr_mail_icon` | CCSprite | [38.009, 92.611] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_spr-hot.png` d4c7a750-0edc-4201-9306-0907b2a9535a |
| `/HeroCommentCell/lbl_comment_name` | UILabelTTF | [64.629, 92.343] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「名字」48 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/HeroCommentCell/spr_likebg` | CCSprite | [306, 94] | [0.5, 0.5] | [120, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-huikuang.png` ea587c6a-1583-4e50-bb7e-b170397f2ff5 |
| `/HeroCommentCell/spr_hatebg` | CCSprite | [448, 94] | [0.5, 0.5] | [120, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-huikuang.png` ea587c6a-1583-4e50-bb7e-b170397f2ff5 |
| `/HeroCommentCell/CCSprite_1` | CCSprite | [266, 93] | [0.5, 0.5] | [22, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_btn-fabulous.png` 44581a39-281a-41c7-836b-ad9294afe659 |
| `/HeroCommentCell/CCSprite_2` | CCSprite | [408, 93] | [0.5, 0.5] | [22, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_btn-difference.png` 935b53a3-10cf-408f-9135-152d77985b5b |
| `/HeroCommentCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCommentCell/CCMenu_1/btn_fabulous` | UIMenuItemImage | [312.114, 87.352] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroCommentCell/CCMenu_1/btn_difference` | UIMenuItemImage | [460.439, 93.059] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroCommentCell/lbl_fabulous_num` | UILabelTTF | [285.222, 91.367] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/HeroCommentCell/lbl_difference_num` | UILabelTTF | [427.161, 91.4] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/HeroCommentCell/lbl_comment_context` | UILabelTTF | [56.527, 38.838] | [0, 0.5] | [950, 145] | [0.5, 0.5] | 0 | 是 | cc.Label「
」40 CloudYuanCuGBK.ttf rgb[130, 67, 38] |

## HeroCommentLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroCommentLayer` | HeroCommentLayer | [0, 0] | [0, 0] | [620, 860] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 880] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroCommentLayer/node_title` | CCNode | [310.0, 859.936] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroCommentLayer/node_title/lbl_title` | UILabelTTF | [0, -41] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「评论」48 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/HeroCommentLayer/spr_bg` | CCScale9Sprite | [30, 112] | [0.5, 0.5] | [560, 510] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/HeroCommentLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/menu/btn_close` | UIMenuItemImage | [553.84, 860] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroCommentLayer/scroll_view` | UIScrollViewBackpack | [30, 112] | [0, 0] | [560, 510] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroCommentLayer/node_upper` | CCNode | [0.0, 860.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/node_upper/node_hero` | CCNode | [91.944, -163.336] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/node_upper/node_hero/lbl_hero_name` | UILabelTTF | [79.24, 38.912] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄名字」48 CloudYuanCuGBK.ttf rgb[130, 67, 38] |
| `/HeroCommentLayer/node_upper/node_hero/CCSprite_1` | CCSprite | [90.312, -10.552] | [0.5, 0.5] | [28, 25] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-xin.png` 3874bb52-c01d-43b4-9e94-279fc848f5bd |
| `/HeroCommentLayer/node_upper/node_hero/lbl_like_num` | UILabelTTF | [113.24, -10.088] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「12231」48 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/HeroCommentLayer/node_upper/CCMenu_1` | CCMenu | [483.0, -132.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/node_upper/CCMenu_1/btn_like` | UIMenuItemLabel | [75.0, -6.0] | [0.5, 0.5] | [56, 59] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-like.png` e3f241d5-6859-429f-a0a7-06452f6bd6bb · Label「喜欢」36 [255, 255, 255, 255] |
| `/HeroCommentLayer/node_upper/lbl_comment_num` | UILabelTTF | [587.68, -207.008] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「评论数：111111322」48 CloudYuanCuGBK.ttf rgb[130, 67, 38] |
| `/HeroCommentLayer/node_lower` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/node_lower/spr_input_bg` | CCScale9Sprite | [238.0, 80.0] | [0.5, 0.5] | [415, 48] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/HeroCommentLayer/node_lower/CCMenu_1` | CCMenu | [524.16, 78.64] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroCommentLayer/node_lower/CCMenu_1/btn_delete_read` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [102, 44] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」48 [122, 71, 45, 255] |

## HeroContractSelectCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroContractSelectCell` | HeroContractSelectCell | [0, 0] | [0, 0] | [165, 88] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectCell/_menu` | UIMenu | [0, 0] | [0, 0] | [165.0, 88.0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectCell/_menu/_selectBtn` | UIMenuItemImage | [82.5, 44.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroContractSelectCell/_bgNode` | CCNode | [82.5, 44.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectCell/_bgNode/_lockedFlagSprite` | CCSprite | [0, 0] | [0.5, 0.5] | [144, 81] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-select_contract-cell-flag-lock.png` 9f93e582-19ba-4862-b72a-d57b2e4ebb18 |
| `/HeroContractSelectCell/_bgNode/_unlockFlagSprite` | CCSprite | [0, 0] | [0.5, 0.5] | [144, 81] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-select_contract-cell-flag.png` a5ba7961-549b-4e68-8ef2-c815b80c26b1 |
| `/HeroContractSelectCell/_bgNode/_selectedSprite` | CCSprite | [0, 0] | [0.5, 0.5] | [165, 102] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-select_contract-cell-selected.png` 631406ad-2c9e-45c1-81fa-1e925355ec99 |
| `/HeroContractSelectCell/_bgNode/_riderIconSprite` | CCSprite | [10, 0] | [0.5, 0.5] | [70, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_contract-rider-1.png` fac70ea6-d0d4-45d0-867a-910ec61f1e1f |
| `/HeroContractSelectCell/_bgNode/_unlockTag` | CCSprite | [-47, 0] | [0.5, 0.5] | [41, 40] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock.png` 3ca42ae6-2503-459c-af7c-04b9a8c65e46 |
| `/HeroContractSelectCell/_typeLabel` | UILabelTTF | [136.95, 44.0] | [0.5, 0.5] | [20, 105] | [1, 1] | 0 | 是 | cc.Label「输出型」18 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/HeroContractSelectCell/_redPointer` | CCNode | [151, 89] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectCell/_usingSprite` | CCSprite | [47, 75] | [0.5, 0.5] | [68, 26] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-info-lang_spr-using.png` 0d494f77-522b-4e0c-95b7-7e2e4cddfd29 |

## HeroContractSelectLayer（34）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroContractSelectLayer` | HeroContractSelectLayer | [0, 0] | [0, 0] | [640, 893] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1` | CCNode | [320.0, 446.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCSprite_1` | CCSprite | [-29, 0] | [0.5, 0.5] | [582, 865] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_contract-bg.png` 4ae08539-1370-49d1-aae0-104c036cc67c |
| `/HeroContractSelectLayer/CCNode_1/CCSprite_2` | CCSprite | [-120, 420] | [0.5, 0.5] | [356, 83] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_lbl-title.png` 630e8106-ed9d-495d-8bdd-3e664444f98b |
| `/HeroContractSelectLayer/CCNode_1/_scrollView` | CCScrollView | [240, -24.32] | [0.5, 0.5] | [165, 810] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroContractSelectLayer/CCNode_1/CCNode_1` | CCNode | [-62, 302.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_1/_selectedTitleSprite` | CCSprite | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** hero-select-lang/contract1.png |
| `/HeroContractSelectLayer/CCNode_1/_activeCondStaticText` | CCSprite | [-165.12, 245.04] | [0.5, 0.5] | [141, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_active-text.png` 9fd97192-d7b5-4074-b85d-9f00c1707e52 |
| `/HeroContractSelectLayer/CCNode_1/_btnActiveCondText` | UILabelTTF | [-201.04, 200] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「这里是激活条件文本」24 FZCSJW--GB1-0.ttf rgb[241, 250, 130] |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2` | CCNode | [-75, -55.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_1` | CCNode | [-68, 122] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_1/_heroIconPointer1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_1/_buffLabel1` | UILabelTTF | [0, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+免疫控制」18 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_2` | CCNode | [83, 122] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_2/_heroIconPointer2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_2/_buffLabel2` | UILabelTTF | [0, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+免疫控制」18 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_3` | CCNode | [-172, -30] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_3/_heroIconPointer3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_3/_buffLabel3` | UILabelTTF | [0, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+免疫控制」18 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_4` | CCNode | [-64.8, -80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_4/_heroIconPointer4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_4/_buffLabel4` | UILabelTTF | [0, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+免疫控制」18 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_5` | CCNode | [66.0, -80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_5/_heroIconPointer5` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_5/_buffLabel5` | UILabelTTF | [0, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+免疫控制」18 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_6` | CCNode | [178, -30] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_6/_heroIconPointer6` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_1/CCNode_2/CCNode_6/_buffLabel6` | UILabelTTF | [0, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「+免疫控制」18 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroContractSelectLayer/CCMenu_1` | CCMenu | [578.64, 861.6] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCMenu_1/_btnClose` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [63, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select_contract-close.png` 7655bdd3-dd23-413f-86de-1728349b120c · Label「」24 [255, 255, 255, 255] |
| `/HeroContractSelectLayer/CCNode_2` | CCNode | [247.4, 142] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroContractSelectLayer/CCNode_2/CCMenu_1/_btnUnlock` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [214, 81] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/hero/hero-select-lang_btn-unlock-contract.png` cc9a0b59-048c-4e79-af09-9cc638350e61 · Label「」24 [255, 255, 255, 255] |
| `/HeroContractSelectLayer/CCNode_2/CCMenu_1/_btnEnsure` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [214, 81] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select-lang_btn-sign-contract.png` 75d9e709-65d9-4f41-8fe4-629437efd2b5 · Label「」24 [255, 255, 255, 255] |

## HeroEvolutionAttrCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionAttrCell` | HeroEvolutionAttrCell | [0, 0] | [0, 0] | [330, 42] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionAttrCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [330, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/HeroEvolutionAttrCell/CCSprite_1` | CCSprite | [202, 20] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroEvolutionAttrCell/lbl_attr_pre` | UILabelTTF | [37, 21] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/HeroEvolutionAttrCell/lbl_attr_cur_value` | UILabelTTF | [232.0, 21.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |

## HeroEvolutionInfoLayer（23）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionInfoLayer` | HeroEvolutionInfoLayer | [0, 0] | [0, 0] | [390, 530] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390.0, 530.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/HeroEvolutionInfoLayer/CCSprite_1` | CCSprite | [64, 479] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_spr-icon-bx.png` 249f4624-8ba4-41e6-b019-5e3d7f597343 |
| `/HeroEvolutionInfoLayer/lbl_evolution_name` | UILabelTTF | [96.0, 482.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣光古龙」56 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/HeroEvolutionInfoLayer/spr_line` | CCSprite | [195.0, 440.0] | [0.5, 0.5] | [380, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-line.png` c6234db7-ebbd-43bb-863f-6c99505dbdc3 |
| `/HeroEvolutionInfoLayer/UILabelTTF_1` | UILabelTTF | [48.0, 418.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「简介」44 CloudYuanCuGBK.ttf rgb[255, 207, 134] |
| `/HeroEvolutionInfoLayer/lbl_desc` | UILabelTTF | [27.0, 402.8] | [0, 1] | [648, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」40 CloudYuanCuGBK.ttf rgb[161, 129, 89] |
| `/HeroEvolutionInfoLayer/UILabelTTF_2` | UILabelTTF | [48.0, 304.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性」44 CloudYuanCuGBK.ttf rgb[255, 207, 134] |
| `/HeroEvolutionInfoLayer/node_attr_1` | CCNode | [72, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionInfoLayer/node_attr_1/spr_attr_icon_1` | CCSprite | [0, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionInfoLayer/node_attr_1/lbl_attr_value_1` | UILabelTTF | [0, -36.687] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/HeroEvolutionInfoLayer/node_attr_2` | CCNode | [157, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionInfoLayer/node_attr_2/spr_attr_icon_2` | CCSprite | [0, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionInfoLayer/node_attr_2/lbl_attr_value_2` | UILabelTTF | [0, -36.687] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/HeroEvolutionInfoLayer/node_attr_3` | CCNode | [241, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionInfoLayer/node_attr_3/spr_attr_icon_3` | CCSprite | [0, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionInfoLayer/node_attr_3/lbl_attr_value_3` | UILabelTTF | [0, -36.687] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/HeroEvolutionInfoLayer/node_attr_4` | CCNode | [325, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionInfoLayer/node_attr_4/spr_attr_icon_4` | CCSprite | [0, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionInfoLayer/node_attr_4/lbl_attr_value_4` | UILabelTTF | [0, -36.687] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/HeroEvolutionInfoLayer/UILabelTTF_3` | UILabelTTF | [48.0, 167.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能」44 CloudYuanCuGBK.ttf rgb[255, 207, 134] |
| `/HeroEvolutionInfoLayer/node_skill` | CCNode | [65.586, 96.933] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionInfoLayer/lpl_skill_name` | UILabelTTF | [126.0, 125.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「高级技能」44 CloudYuanCuGBK.ttf rgb[239, 117, 42] |

## HeroEvolutionLayer（36）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionLayer` | HeroEvolutionLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-evolution.jpg` b3595e0c-2406-4a56-9eec-23b748d928ae |
| `/HeroEvolutionLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 250] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_top/top_menu` | CCMenu | [575.0, -66.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_top/top_menu/btn_back` | UIMenuItemImage | [-5, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/HeroEvolutionLayer/node_top/top_menu/btn_info` | UIMenuItemImage | [26.926, -67.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroEvolutionLayer/node_evolution` | CCNode | [320.0, 563.0] | [0.5, 0] | [640, 430] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_evolution/spr_glow_bg` | CCSprite | [0.0, 301.0] | [0.5, 0.5] | [498, 461] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_spr-decoration.png` d2d1fcc4-381e-4d20-a050-abcc3db296b3 |
| `/HeroEvolutionLayer/node_evolution/spr_left_line` | CCSprite | [-51.0, 50.0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_no-select-line.png` 9303595f-129f-4d05-acf8-106eac3f0d9a |
| `/HeroEvolutionLayer/node_evolution/spr_right_line` | CCSprite | [51.2, 49.88] | [0.5, 0.5] | [100, 100] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_no-select-line.png` 9303595f-129f-4d05-acf8-106eac3f0d9a |
| `/HeroEvolutionLayer/node_bottom` | CCNode | [320.0, 0.0] | [0.5, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [615, 598] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/evolution_frame-1.png` ec9b3dbe-44ce-44b6-bf91-f0f57802b175 insets[100, 100, 50, 50] |
| `/HeroEvolutionLayer/node_bottom/spr_desc_bg` | CCScale9Sprite | [0.0, 380.0] | [0.5, 0] | [540, 100] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroEvolutionLayer/node_bottom/CCScale9Sprite_2` | CCScale9Sprite | [0.0, 230.0] | [0.5, 0] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[45, 10, 10, 10] |
| `/HeroEvolutionLayer/node_bottom/UILabelTTF_1` | UILabelTTF | [-201.0, 349] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性加成」44 Helvetica rgb[253, 232, 193] |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_1` | CCNode | [-181.0, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_1/spr_attr_icon_1` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_3` | CCNode | [-181.0, 258] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_3/spr_attr_icon_3` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_2` | CCNode | [79.0, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_2/spr_attr_icon_2` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_4` | CCNode | [79.0, 258] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionLayer/node_bottom/node_attr_addition_4/spr_attr_icon_4` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroEvolutionLayer/node_bottom/node_comsume` | CCNode | [0.0, 100.0] | [0.5, 0] | [540, 120] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_bottom/node_comsume/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [540, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroEvolutionLayer/node_bottom/node_comsume/lbl_attr_name` | UILabelTTF | [-252.0, 59] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「进化消耗：」44 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/HeroEvolutionLayer/node_bottom/node_comsume/node_items` | CCNode | [-147.0, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_bottom/node_max` | CCNode | [0.0, 75.0] | [0.5, 0] | [540, 120] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionLayer/node_bottom/node_max/lbl_attr_name` | UILabelTTF | [0.0, 60.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已进化到最大等级」44 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/HeroEvolutionLayer/node_bottom/node_max/left-tip-line` | CCLayerColor | [-270.0, 59] | [0, 0] | [163, 2] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[191, 169, 143] a255 |
| `/HeroEvolutionLayer/node_bottom/node_max/left-right-line` | CCLayerColor | [107.0, 59] | [0, 0] | [163, 2] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[191, 169, 143] a255 |
| `/HeroEvolutionLayer/node_bottom/CCMenu_1` | CCMenu | [-320.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionLayer/node_bottom/CCMenu_1/btn_evolve` | UIMenuItemLabel | [320, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「进 化」48 [255, 255, 255, 255] |
| `/HeroEvolutionLayer/node_bottom/CCMenu_1/btn_exit` | UIMenuItemLabel | [160, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「回退」48 [255, 255, 255, 255] |
| `/HeroEvolutionLayer/node_bottom/CCMenu_1/btn_evolution_tree` | UIMenuItemLabel | [548.938, 61.342] | [0.5, 0.5] | [60, 63] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/evolution_btn-evolition.png` df7202c9-a368-4b9e-bd58-1cfe28cef48a · Label「进化树」32 [255, 255, 255, 255] |
| `/HeroEvolutionLayer/node_bottom/node_skill` | CCNode | [-1.0, 552.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroEvolutionPreviewLayer（48）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionPreviewLayer` | HeroEvolutionPreviewLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-evolution.jpg` b3595e0c-2406-4a56-9eec-23b748d928ae |
| `/HeroEvolutionPreviewLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 250] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_top/top_menu` | CCMenu | [575.0, -66.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_top/top_menu/btn_back` | UIMenuItemImage | [-5, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/HeroEvolutionPreviewLayer/node_top/top_menu/btn_info` | UIMenuItemImage | [26.926, -67.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroEvolutionPreviewLayer/node_evolution` | CCNode | [320.0, 563.0] | [0.5, 0] | [640, 430] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_evolution/spr_glow_bg` | CCSprite | [0.0, 301.0] | [0.5, 0.5] | [498, 461] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_spr-decoration.png` d2d1fcc4-381e-4d20-a050-abcc3db296b3 |
| `/HeroEvolutionPreviewLayer/node_evolution/CCSprite_1` | CCSprite | [0.0, 425.0] | [0.5, 0.5] | [319, 75] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-name-bg.png` 9800f273-304e-4222-8adf-aebd42265866 |
| `/HeroEvolutionPreviewLayer/node_evolution/CCSprite_1/icon_elem` | CCSprite | [-34.5, -1.5] | [0.5, 0.5] | [74, 74] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-42.png` f0b1a70e-70a0-4cf9-886d-5ab63d86985e |
| `/HeroEvolutionPreviewLayer/node_evolution/CCSprite_1/lbl_hero_name` | UILabelTTF | [17.5, -1.5] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroEvolutionPreviewLayer/node_bottom` | CCNode | [320.0, 0.0] | [0.5, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 26.0] | [0.5, 0] | [640.0, 590.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroEvolutionPreviewLayer/node_bottom/CCLayerColor_1` | CCLayerColor | [-280.0, 555] | [0, 0] | [560, 1] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[212, 205, 193] a255 |
| `/HeroEvolutionPreviewLayer/node_bottom/spr_desc_bg` | CCScale9Sprite | [0.0, 345.0] | [0.5, 0] | [566.0, 102.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroEvolutionPreviewLayer/node_bottom/menu_pre_skill` | CCMenu | [-99.84, 499.8] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_bottom/menu_next_skill` | CCMenu | [108.16, 499.8] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_bottom/node_evolve_name` | CCNode | [0.0, 570.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all` | CCNode | [-2.0, 70.312] | [0.5, 0] | [560, 282.8] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1` | CCSprite | [-276.2, 195.8] | [0, 0.5] | [409, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-10.png` 4d27c4b1-0aa2-4b49-9547-a978a9718c40 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/UILabelTTF_1` | UILabelTTF | [30, 0.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「进阶：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/sp_grade1` | CCSprite | [160, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/sp_grade2` | CCSprite | [190, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/sp_grade3` | CCSprite | [220, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/sp_grade4` | CCSprite | [250, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/sp_grade5` | CCSprite | [280, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_1/sp_grade6` | CCSprite | [310, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_2` | CCSprite | [-183.6, 75.4] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_2/lbl_attack` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_3` | CCSprite | [39.4, 75.4] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_3/lbl_hp` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_4` | CCSprite | [-183.6, 25.4] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-11.png` 3e9c096f-512b-4bdd-887d-c42d64a2cc02 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_4/lbl_defense` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_5` | CCSprite | [39.4, 25.4] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-4.png` 13ff4181-e422-4d01-8b8b-a69de849e668 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_5/lbl_speed` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/lbl_level_title` | UILabelTTF | [-247.6, 241.2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级:」23 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/lbl_level` | UILabelTTF | [-189.6, 239.2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/30」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/lbl_profession` | UILabelTTF | [141.4, 240.2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「职业: 未知」23 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/lbl_max_tips` | UILabelTTF | [0.0, 139.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已达到最大等级，英雄属性」21 FZCSJW--GB1-0.ttf rgb[117, 75, 23] |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/CCSprite_6` | CCSprite | [-223.52, 80.216] | [0.5, 0.5] | [64, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_lbl-attr.png` eb02a67b-9ccc-47de-9fa3-f5b1f66dd15d |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/icon_occupat` | CCSprite | [135.15, 241.117] | [1, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_icon-occup-3.png` 810701a4-26ea-45c9-b659-23eaf96711f3 |
| `/HeroEvolutionPreviewLayer/node_bottom/node_all/node_nil_skill` | CCNode | [-280.0, 86.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_bottom/CCSprite_1` | CCSprite | [0.0, 499.664] | [0.5, 0.5] | [118, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-arrow-1.png` e98f8126-6998-4e6f-b90e-4466d1e03927 |
| `/HeroEvolutionPreviewLayer/node_bottom/CCLayerColor_2` | CCLayerColor | [-280.0, 331] | [0, 0] | [560, 1] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[212, 205, 193] a255 |
| `/HeroEvolutionPreviewLayer/node_btn` | CCNode | [320.0, 672.0] | [0.5, 0.5] | [640.0, 100] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_btn/menu_btn` | UIMenu | [-320.0, -50.0] | [0, 0] | [640.0, 100.0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionPreviewLayer/node_btn/menu_btn/btn_left` | UIMenuItemImage | [32.0, 50.0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/HeroEvolutionPreviewLayer/node_btn/menu_btn/btn_right` | UIMenuItemImage | [608.0, 50.0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |

## HeroEvolutionSeat（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionSeat` | HeroEvolutionSeat | [0, 0] | [0, 0] | [248, 300] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSeat/node_root` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSeat/node_root/spr_stage` | CCSprite | [124, 5] | [0.5, 0] | [288, 156] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_no-select-stage.png` 237fb2ea-7d59-4e3a-a4db-e842ca303280 |
| `/HeroEvolutionSeat/node_root/node_animator` | CCNode | [123, 101] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSeat/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSeat/CCMenu_1/btn_info` | CCMenuItemImage | [124, 39] | [0.5, 0.5] | [123, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/evolution_frame-type.png` 5340449d-8d32-470e-b0ac-2a8480ae508c |
| `/HeroEvolutionSeat/node_evolve_level` | CCNode | [124, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroEvolutionSeat/node_evolve_level/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [194, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_spr-tag-evolution.png` 13ea8715-86b5-41e3-ab45-1e561648cd9a |
| `/HeroEvolutionSeat/node_evolve_level/lbl_evolution_lv` | UILabelTTF | [32.0, -4] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+1」44 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## HeroEvolutionSelectLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionSelectLayer` | HeroEvolutionSelectLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, -10] | [0.5, 0.5] | [580, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/HeroEvolutionSelectLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/HeroEvolutionSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/HeroEvolutionSelectLayer/lbl_select` | UILabelTTF | [56, 275] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」16 STZhongsong.ttf rgb[89, 53, 15] |
| `/HeroEvolutionSelectLayer/node_bubble` | CCNode | [290, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSelectLayer/node_bubble/lbl_go_under` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 0.5] | 0 | 是 | cc.Label「————」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/HeroEvolutionSelectLayer/node_bubble/lbl_go` | UILabelTTF | [0, 12] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「快速获得」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/HeroEvolutionSelectLayer/node_bubble/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSelectLayer/node_bubble/CCMenu_1/btn_go` | UIMenuItemImage | [0, 12] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## HeroEvolutionSuccessLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionSuccessLayer` | HeroEvolutionSuccessLayer | [0, 0] | [0, 0] | [640, 610] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSuccessLayer/CCSprite_1` | CCSprite | [320, 322] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE **缺图** 1.png |
| `/HeroEvolutionSuccessLayer/spr_bg` | CCScale9Sprite | [0, 32] | [0.5, 0.5] | [640, 540] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[130, 130, 0, 0] |
| `/HeroEvolutionSuccessLayer/spr_wing` | CCSprite | [309, 563] | [0.5, 0.5] | [322, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_word-evolution-success.png` b05d7d05-fcb3-4740-a9d9-5643b9d2dfe1 |
| `/HeroEvolutionSuccessLayer/lbl_hero_name` | UILabelTTF | [129.0, 406.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」48 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/HeroEvolutionSuccessLayer/node_attr` | CCNode | [290, 447] | [0, 0] | [330, 42] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSuccessLayer/UILabelTTF_1` | UILabelTTF | [453.0, 233.356] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得新技能」48 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/HeroEvolutionSuccessLayer/lpl_skill_name` | UILabelTTF | [447.0, 199.581] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」44 CloudYuanCuGBK.ttf rgb[239, 117, 42] |
| `/HeroEvolutionSuccessLayer/node_skill` | CCNode | [325.0, 113.194] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSuccessLayer/CCSprite_2` | CCSprite | [151.695, 175.306] | [0.5, 0.5] | [466, 156] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_magic-circle.png` c205c71b-1c0c-4f05-838e-9da5457c0205 |
| `/HeroEvolutionSuccessLayer/node_hero` | CCNode | [151.389, 186.111] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionSuccessLayer/CCSprite_3` | CCSprite | [98.028, 406.778] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_spr-icon-bx.png` 249f4624-8ba4-41e6-b019-5e3d7f597343 |

## HeroEvolutionTreeLayer（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolutionTreeLayer` | HeroEvolutionTreeLayer | [0, 0] | [0, 0] | [450, 530] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/CCSprite_1` | CCSprite | [225.0, 265.0] | [0.5, 0.5] | [448, 628] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_evolution-bg.png` 1eddd7a2-a263-4872-b620-c9de2d2422b1 |
| `/HeroEvolutionTreeLayer/spr_line_2_1` | CCSprite | [219.5, 428] | [0, 0.5] | [115, 89] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-1.png` 19b35b35-dbc7-4ff6-95f3-a9050bc0524d |
| `/HeroEvolutionTreeLayer/spr_line_1_1` | CCSprite | [110.5, 429] | [1, 0.5] | [115, 89] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-1.png` 19b35b35-dbc7-4ff6-95f3-a9050bc0524d |
| `/HeroEvolutionTreeLayer/spr_line_1_2` | CCSprite | [114, 271] | [0.5, 0.5] | [6, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-2.png` d931404d-1bf4-441a-b7cb-4ff479dad09a |
| `/HeroEvolutionTreeLayer/spr_line_2_2` | CCSprite | [332, 271] | [0.5, 0.5] | [6, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-2.png` d931404d-1bf4-441a-b7cb-4ff479dad09a |
| `/HeroEvolutionTreeLayer/spr_line_1_3` | CCSprite | [114, 113] | [0.5, 0.5] | [6, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-2.png` d931404d-1bf4-441a-b7cb-4ff479dad09a |
| `/HeroEvolutionTreeLayer/spr_line_2_3` | CCSprite | [332, 113] | [0.5, 0.5] | [6, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-2.png` d931404d-1bf4-441a-b7cb-4ff479dad09a |
| `/HeroEvolutionTreeLayer/node_top` | CCNode | [225, 503] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_top/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_top/spr_hero_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_top/spr_glow` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_1_1` | CCNode | [117, 348] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_1_1/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_1_1/spr_hero_icon_1_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_1_1/spr_glow_1_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_1_1/spr_question_1_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/HeroEvolutionTreeLayer/node_2_1` | CCNode | [334, 348] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_2_1/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_2_1/spr_hero_icon_2_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_2_1/spr_glow_2_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_2_1/spr_question_2_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/HeroEvolutionTreeLayer/node_1_2` | CCNode | [117, 193] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_1_2/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_1_2/spr_hero_icon_1_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_1_2/spr_glow_1_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_1_2/spr_question_1_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/HeroEvolutionTreeLayer/node_2_2` | CCNode | [334, 193] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_2_2/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_2_2/spr_hero_icon_2_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_2_2/spr_glow_2_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_2_2/spr_question_2_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/HeroEvolutionTreeLayer/node_1_3` | CCNode | [117, 38] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_1_3/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_1_3/spr_hero_icon_1_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_1_3/spr_glow_1_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_1_3/spr_question_1_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/HeroEvolutionTreeLayer/node_2_3` | CCNode | [334, 38] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/HeroEvolutionTreeLayer/node_2_3/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/HeroEvolutionTreeLayer/node_2_3/spr_hero_icon_2_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/HeroEvolutionTreeLayer/node_2_3/spr_glow_2_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/HeroEvolutionTreeLayer/node_2_3/spr_question_2_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |

## HeroEvolveIllustratLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroEvolveIllustratLayer` | HeroEvolveIllustratLayer | [0, 0] | [0, 0] | [640, 756] | [1, 1] | 0 | 是 |  |
| `/HeroEvolveIllustratLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 756] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroEvolveIllustratLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolveIllustratLayer/UIMenu_1/btn_close` | UIMenuItemImage | [570, 747] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroEvolveIllustratLayer/node_title` | CCNode | [320, 746] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroEvolveIllustratLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, -33] | [0.5, 0.5] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroEvolveIllustratLayer/node_title/title` | UILabelTTF | [0, -38] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「进化图鉴」48 FZCSJW--GB1-0.ttf rgb[255, 232, 193] |
| `/HeroEvolveIllustratLayer/spr_box` | CCScale9Sprite | [40, 70] | [0.5, 0.5] | [560, 590] | [0.9968, 1.0054] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[80, 50, 20, 20] |
| `/HeroEvolveIllustratLayer/elem_menu` | CCMenu | [320, 652] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroEvolveIllustratLayer/elem_menu/btn_elem1` | UIMenuItemImage | [-209, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroEvolveIllustratLayer/elem_menu/btn_elem2` | UIMenuItemImage | [-103, -34] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroEvolveIllustratLayer/elem_menu/btn_elem3` | UIMenuItemImage | [2, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroEvolveIllustratLayer/elem_menu/btn_elem4` | UIMenuItemImage | [108, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroEvolveIllustratLayer/elem_menu/btn_elem5` | UIMenuItemImage | [210, -34] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroEvolveIllustratLayer/scroll_view` | UIScrollViewBackpack | [49, 81] | [0, 0] | [540, 490] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask BOTH |

## HeroGodEquipAttrLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroGodEquipAttrLayer` | HeroGodEquipAttrLayer | [0, 0] | [0, 0] | [486, 426] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipAttrLayer/bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [486, 426] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[20, 20, 20, 20] |
| `/HeroGodEquipAttrLayer/show_message` | CCNode | [243.0, 426.0] | [0.5, 1] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipAttrLayer/show_message/name` | CCLabelTTF | [0.0, -29] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神装总加成」24 STZhongsong.ttf rgb[255, 230, 191] |
| `/HeroGodEquipAttrLayer/show_message/CCSprite_1` | CCSprite | [0.0, -84] | [0.5, 0.5] | [622, 4] | [0.7, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/HeroGodEquipAttrLayer/show_message/score` | CCLabelTTF | [0.0, -64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神装总加成」20 STZhongsong.ttf rgb[230, 145, 42] |
| `/HeroGodEquipAttrLayer/show_message/UILabelTTF_1` | UILabelTTF | [-164.0, -110] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「属性加成：」22 STZhongsong.ttf rgb[255, 207, 134] |
| `/HeroGodEquipAttrLayer/show_message/show_attr` | CCNode | [-199.0, -141] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipAttrLayer/show_message/is_skill` | CCNode | [0.0, -285] | [0.5, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipAttrLayer/show_message/is_skill/UILabelTTF_1` | UILabelTTF | [-164.0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「特殊效果：」22 STZhongsong.ttf rgb[255, 207, 134] |
| `/HeroGodEquipAttrLayer/show_message/is_skill/skill_name` | CCLabelTTF | [-196.0, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神装总加成」20 STZhongsong.ttf rgb[230, 145, 42] |
| `/HeroGodEquipAttrLayer/show_message/is_skill/skill_msg` | CCLabelTTF | [-115.0, -57] | [0, 1] | [350, 100] | [1, 1] | 0 | 是 | cc.Label「神装总加成神装总加成神装总加成神装总神装总加成神装总加成神装总加成神装总」18 STZhongsong.ttf rgb[230, 145, 42] |
| `/HeroGodEquipAttrLayer/show_message/is_skill/skill_node` | CCNode | [-165.0, -89] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroGodEquipOrderAttrLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroGodEquipOrderAttrLayer` | HeroGodEquipOrderAttrLayer | [0, 0] | [0, 0] | [300, 426] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipOrderAttrLayer/bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [300, 426] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[20, 20, 20, 20] |
| `/HeroGodEquipOrderAttrLayer/show_message` | CCNode | [150.0, 426.0] | [0.5, 1] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipOrderAttrLayer/show_message/name` | CCLabelTTF | [-134.0, -27] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「随机属性范围：」18 STZhongsong.ttf rgb[255, 230, 191] |
| `/HeroGodEquipOrderAttrLayer/show_message/show_text` | CCNode | [-126.0, -52] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroGodEquipStateLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroGodEquipStateLayer` | HeroGodEquipStateLayer | [0, 0] | [0, 0] | [640, 748] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipStateLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 748] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroGodEquipStateLayer/node_title` | CCNode | [320.0, 740.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipStateLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroGodEquipStateLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「宝石镶嵌」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroGodEquipStateLayer/CCScale9Sprite_1` | CCScale9Sprite | [40, 58] | [0.5, 0.5] | [560, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroGodEquipStateLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroGodEquipStateLayer/CCMenu_1/btn_close` | UIMenuItemImage | [577, 710] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroGodEquipStateLayer/god_equip_scroll_view` | UIScrollViewBackpack | [319, 55.472] | [0.5, 0] | [560, 580] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## HeroMatrixCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroMatrixCell` | HeroMatrixCell | [0, 0] | [0, 0] | [90, 140] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixCell/spr_icon` | CCSprite | [45, 100] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/HeroMatrixCell/node_limit` | CCNode | [45, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixCell/node_limit/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-limit-bg.png` e405f820-0f55-40c9-94c5-77b14493e13b |
| `/HeroMatrixCell/node_limit/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [49, 61] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock-2.png` eb6cef18-a5d8-495f-b437-b93e5cf6f897 |
| `/HeroMatrixCell/node_limit/lbl_limit_tip` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「矩阵型」32 FZCSJW--GB1-0.ttf rgb[255, 230, 191] |
| `/HeroMatrixCell/spr_cur` | CCSprite | [30, 115] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** hero-select/spr-cur.png |
| `/HeroMatrixCell/CCSprite_1` | CCSprite | [45, 35] | [0.5, 0.5] | [89, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-name-bg.png` be965046-2eb5-4c26-9984-c23dfa8e35fd |
| `/HeroMatrixCell/lbl_name` | UILabelTTF | [45, 35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「矩阵型」32 FZCSJW--GB1-0.ttf rgb[255, 230, 191] |
| `/HeroMatrixCell/lbl_type` | UILabelTTF | [47, 12] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「平衡型」32 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroMatrixCell/spr_select` | CCSprite | [45, 100] | [0.5, 0.5] | [110, 110] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-select.png` 335b1bdc-718d-4a51-88a5-f5e2343d6d60 |

## HeroMatrixLayer（56）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroMatrixLayer` | HeroMatrixLayer | [0, 0] | [0, 0] | [560, 640] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [580, 660] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroMatrixLayer/node_title` | CCNode | [280.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroMatrixLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「契约矩阵」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroMatrixLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/UIMenu_1/btn_close` | UIMenuItemImage | [500, 640] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroMatrixLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [280, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确定」48 [255, 255, 255, 255] |
| `/HeroMatrixLayer/UILabelTTF_1` | UILabelTTF | [280, 560] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「点击图标选择矩阵」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroMatrixLayer/scroll_view` | UIScrollViewBackpack | [280, 390] | [0.5, 0] | [500, 150] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/HeroMatrixLayer/node_pannel` | CCNode | [280, 100] | [0.5, 0] | [500, 280] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/spr_pannel_bg` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [500, 280] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroMatrixLayer/node_pannel/CCSprite_1` | CCSprite | [-210.0, 210] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/HeroMatrixLayer/node_pannel/CCSprite_1/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「前排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroMatrixLayer/node_pannel/CCSprite_2` | CCSprite | [-210.0, 80] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/HeroMatrixLayer/node_pannel/CCSprite_2/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「后排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroMatrixLayer/node_pannel/node_icon_4` | CCNode | [-130.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_4/spr_lock_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_4/lbl_attr_add_4` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_3` | CCNode | [-30.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_3/spr_lock_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_3/lbl_attr_add_3` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_2` | CCNode | [70.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_2/spr_lock_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_2/lbl_attr_add_2` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_1` | CCNode | [170.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_1/spr_lock_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_1/lbl_attr_add_1` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_8` | CCNode | [-130.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_8/spr_lock_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_8/lbl_attr_add_8` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_7` | CCNode | [-30.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_7/spr_lock_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_7/lbl_attr_add_7` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_6` | CCNode | [70.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_6/spr_lock_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_6/lbl_attr_add_6` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroMatrixLayer/node_pannel/node_icon_5` | CCNode | [170.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMatrixLayer/node_pannel/node_icon_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroMatrixLayer/node_pannel/node_icon_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroMatrixLayer/node_pannel/node_icon_5/spr_lock_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroMatrixLayer/node_pannel/node_icon_5/lbl_attr_add_5` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「- -」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |

## HeroMaxSkinLayer（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroMaxSkinLayer` | HeroMaxSkinLayer | [0, 0] | [0, 0] | [559, 770] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCScale9Sprite_1` | CCScale9Sprite | [1, -4] | [0.5, 0.5] | [559, 770] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[10, 10, 10, 10] |
| `/HeroMaxSkinLayer/CCNode_1` | CCNode | [279.5, 674.338] | [0.5, 1] | [560, 320] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_1/node_root` | CCNode | [0.0, -350.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_1/node_root/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0] | [308, 146] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-base.png` ec382703-0cdf-4bf4-89c2-dfd21abb4abc |
| `/HeroMaxSkinLayer/CCNode_1/node_root/node_animator` | CCNode | [0, 92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_2` | CCNode | [277, 328] | [0.5, 1] | [559, 194] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_2/lbl_skin_name` | UILabelTTF | [0.0, -30.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」52 STZhongsong.ttf rgb[255, 179, 45] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_1` | CCNode | [-244.5, -114] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_1/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_1/CCSprite_1` | CCSprite | [26, 23] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_1/lbl_attr_1` | UILabelTTF | [60, 23] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[255, 236, 191] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_2` | CCNode | [19.5, -114] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_2/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_2/CCSprite_1` | CCSprite | [26, 23] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-223.png` ff125a68-1ad2-49a6-8188-8ce1a9b7edc7 |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_2/lbl_attr_2` | UILabelTTF | [60, 23] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[255, 236, 191] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_3` | CCNode | [-244.5, -169] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_3/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_3/CCSprite_1` | CCSprite | [26, 23] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-224.png` 174d3d74-7504-48f2-9db5-4f5aebc5de3c |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_3/lbl_attr_3` | UILabelTTF | [60, 23] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[255, 236, 191] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_4` | CCNode | [19.5, -169] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_4/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_4/CCSprite_1` | CCSprite | [26, 23] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HeroMaxSkinLayer/CCNode_2/node_attr_addition_4/lbl_attr_4` | UILabelTTF | [60, 23] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[255, 236, 191] |
| `/HeroMaxSkinLayer/CCNode_2/lbl_skin_desc` | UILabelTTF | [-243.5, -197] | [0, 1] | [985, 150] | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgb[255, 179, 45] |
| `/HeroMaxSkinLayer/CCNode_2/CCSprite_1` | CCSprite | [-3.5, -184] | [0.5, 0.5] | [466, 6] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-5.png` e4ba636e-095e-4c7f-b1eb-25e1bf436420 |
| `/HeroMaxSkinLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroMaxSkinLayer/menu/btn_close` | UIMenuItemImage | [510, 740] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## HeroPalaceLayer（53）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroPalaceLayer` | HeroPalaceLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/map-bg-hero-palace-1.jpg` 970f20b2-a22d-4851-8dc2-0685b23db3d9 |
| `/HeroPalaceLayer/node_upper` | CCNode | [320.0, 837.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_upper/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [332, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-title-1.png` 412aa638-3416-4429-92e5-725f2db81152 |
| `/HeroPalaceLayer/node_upper/lbl_title` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「S10」60 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/HeroPalaceLayer/node_upper/menu_btn` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_upper/menu_btn/btn_left` | UIMenuItemImage | [-180, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/HeroPalaceLayer/node_upper/menu_btn/btn_right` | UIMenuItemImage | [180, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |
| `/HeroPalaceLayer/node_top` | CCNode | [589.0, 753.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top/menu_btn` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top/menu_btn/CCMenuItemImage_1` | CCMenuItemImage | [-40, -19] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/HeroPalaceLayer/node_reward` | CCNode | [38.0, 804.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_reward/menu_reward` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_reward/menu_reward/btn_reward` | CCMenuItemImage | [30, -20] | [0.5, 0.5] | [49, 49] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace_spr-border-bg.png` b3315d04-096e-42f7-b684-1642941ba3fa |
| `/HeroPalaceLayer/node_reward/menu_reward/btn_info` | CCMenuItemImage | [30, -100] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroPalaceLayer/node_reward/spr_reward` | CCSprite | [30, -20] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005003.png` d1be8f74-f16c-4537-b9de-4a8dc38f4d11 |
| `/HeroPalaceLayer/node_reward/spr_border_tip` | CCSprite | [30, -50] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** hero-palace/lbl-border-tip.png |
| `/HeroPalaceLayer/node_top_three` | CCNode | [320.0, 536.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_1` | CCNode | [0, 32] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_1/CCSprite_1` | CCSprite | [0, -40] | [0.5, 0] | [414, 386] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_btn-desk-1.png` aa408954-9280-45bd-aebc-ec9fd546cbe4 |
| `/HeroPalaceLayer/node_top_three/node_top_1/node_animator_1` | CCNode | [0, 55] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_1/CCSprite_2` | CCSprite | [0, -5] | [0.5, 0.5] | [178, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_spr-name-bg.png` 96c5a831-2aa8-460c-8550-b2e8e41e5cfb |
| `/HeroPalaceLayer/node_top_three/node_top_1/lbl_name_1` | UILabelTTF | [0, -5] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgbNone |
| `/HeroPalaceLayer/node_top_three/node_top_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_1/CCMenu_1/btn_player_info_1` | UIMenuItemImage | [80, -15] | [0.5, 0.5] | [42, 58] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-detail.png` ae78c0d1-c081-47a9-a262-8d2f4c6c4f67 |
| `/HeroPalaceLayer/node_top_three/node_top_2` | CCNode | [-150, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0] | [275, 123] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_btn-desk-2.png` 89d3cb40-c7ac-49b4-85fa-f554e25cf2f7 |
| `/HeroPalaceLayer/node_top_three/node_top_2/node_animator_2` | CCNode | [0, 55] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_2/CCSprite_2` | CCSprite | [0, -5] | [0.5, 0.5] | [178, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_spr-name-bg.png` 96c5a831-2aa8-460c-8550-b2e8e41e5cfb |
| `/HeroPalaceLayer/node_top_three/node_top_2/lbl_name_2` | UILabelTTF | [0, -5] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgbNone |
| `/HeroPalaceLayer/node_top_three/node_top_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_2/CCMenu_1/btn_player_info_2` | UIMenuItemImage | [80, -15] | [0.5, 0.5] | [42, 58] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-detail.png` ae78c0d1-c081-47a9-a262-8d2f4c6c4f67 |
| `/HeroPalaceLayer/node_top_three/node_top_3` | CCNode | [150, -120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0] | [275, 123] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_btn-desk-2.png` 89d3cb40-c7ac-49b4-85fa-f554e25cf2f7 |
| `/HeroPalaceLayer/node_top_three/node_top_3/node_animator_3` | CCNode | [0, 55] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_3/CCSprite_2` | CCSprite | [0, -5] | [0.5, 0.5] | [178, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_spr-name-bg.png` 96c5a831-2aa8-460c-8550-b2e8e41e5cfb |
| `/HeroPalaceLayer/node_top_three/node_top_3/lbl_name_3` | UILabelTTF | [0, -5] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgbNone |
| `/HeroPalaceLayer/node_top_three/node_top_3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_top_three/node_top_3/CCMenu_1/btn_player_info_3` | UIMenuItemImage | [80, -15] | [0.5, 0.5] | [42, 58] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-detail.png` ae78c0d1-c081-47a9-a262-8d2f4c6c4f67 |
| `/HeroPalaceLayer/node_like` | CCNode | [320.0, 392.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_like/spr_tip_1` | CCSprite | [0, 8] | [0.5, 0.5] | [542, 55] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace-lang_lbl-tip-elem-1.png` 5bffdbd3-afeb-4536-9241-dba8a17c13df |
| `/HeroPalaceLayer/node_like/spr_tip_2` | CCSprite | [0, -40] | [0.5, 0.5] | [499, 53] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace-lang_lbl-tip-3.png` ea811585-aef0-40d6-b562-bbaafa9a6929 |
| `/HeroPalaceLayer/node_like/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_like/CCMenu_1/btn_like` | UIMenuItemLabel | [0, -100] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「膜  拜」56 [255, 255, 255, 255] |
| `/HeroPalaceLayer/node_tab` | CCNode | [320.0, 309.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_tab/spr_selected` | CCSprite | [250, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-palace_spr-selected.png` 114a46a7-a4d2-4272-8c13-0056e75423f1 |
| `/HeroPalaceLayer/node_tab/menu_tab` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceLayer/node_tab/menu_tab/btn_tab_1` | UIMenuItemTab | [-250, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-tab-1.png` 72c51399-254a-4509-8929-24df6415ec66 |
| `/HeroPalaceLayer/node_tab/menu_tab/btn_tab_2` | UIMenuItemTab | [-150, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-tab-2.png` af812131-11b0-4a4f-8e9c-57ed19ac2612 |
| `/HeroPalaceLayer/node_tab/menu_tab/btn_tab_3` | UIMenuItemTab | [-50, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-tab-3.png` 684c3735-2116-4f4b-8b56-1b4bb2d3cdcc |
| `/HeroPalaceLayer/node_tab/menu_tab/btn_tab_4` | UIMenuItemTab | [50, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-tab-4.png` 41448b05-b95e-41c3-9b0c-9cf5ae9b639a |
| `/HeroPalaceLayer/node_tab/menu_tab/btn_tab_5` | UIMenuItemTab | [150, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-tab-5.png` 2f4eb659-27bf-4e9a-9dbd-9f780e6fb0a7 |
| `/HeroPalaceLayer/node_tab/menu_tab/btn_tab_6` | UIMenuItemTab | [250, 0] | [0.5, 1] | [120, 300] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-palace-lang_btn-tab-6.png` 6a40f58c-9ff3-4a44-a7bd-1293d638967c |

## HeroPalaceRewardCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroPalaceRewardCell` | HeroPalaceRewardCell | [0, 0] | [0, 0] | [540, 150] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/HeroPalaceRewardCell/lbl_name` | UILabelTTF | [145, 110] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[我是渣渣辉]」52 STZhongsong.ttf rgb[213, 112, 31] |
| `/HeroPalaceRewardCell/lbl_desc` | UILabelTTF | [145, 45] | [0, 0.5] | [480, 160] | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字十个字十个字」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/HeroPalaceRewardCell/hero_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceRewardCell/hero_menu/btn_reward` | UIMenuItemLabel | [450, 75] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「领  取」48 [255, 255, 255, 255] |

## HeroPalaceRewardLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroPalaceRewardLayer` | HeroPalaceRewardLayer | [0, 0] | [0, 0] | [640, 624] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceRewardLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 644] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroPalaceRewardLayer/spr_box` | CCScale9Sprite | [320, 50] | [0.5, 0] | [560, 490] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroPalaceRewardLayer/node_title` | CCNode | [320.0, 624.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroPalaceRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「专属头像」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/HeroPalaceRewardLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPalaceRewardLayer/CCMenu_1/btn_close` | UIMenuItemImage | [580, 624] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroPalaceRewardLayer/scroll_view` | UIScrollViewBackpack | [320, 55] | [0.5, 0] | [540, 480] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## HeroPernuteCell（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroPernuteCell` | HeroPernuteCell | [0, 0] | [0, 0] | [640, 601] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteCell/spr_hero_bg` | CCScale9Sprite | [35, 0] | [0.5, 0.5] | [570, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[70, 20, 20, 20] |
| `/HeroPernuteCell/spr_light_bottom_left` | CCSprite | [143, 403] | [0.5, 0.5] | [216, 98] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_spr-seat2.png` f5379593-b993-4d31-b8fa-7f71b437ace0 |
| `/HeroPernuteCell/spr_light_bottom_right` | CCSprite | [495, 403] | [0.5, 0.5] | [216, 98] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_spr-seat2.png` f5379593-b993-4d31-b8fa-7f71b437ace0 |
| `/HeroPernuteCell/spr_light_left` | CCSprite | [142, 390] | [0.5, 0] | [176, 211] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_light.png` 3652b539-6280-4aae-9c2a-a545a1094e83 |
| `/HeroPernuteCell/spr_light_right` | CCSprite | [494, 390] | [0.5, 0] | [176, 211] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_light.png` 3652b539-6280-4aae-9c2a-a545a1094e83 |
| `/HeroPernuteCell/image_bg` | CCSprite | [536, 334] | [0.5, 0.5] | [134, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg-1.png` 1c80673b-7365-4493-9430-39e3729969f0 |
| `/HeroPernuteCell/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640.0, 601.0] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteCell/UIMenu_1/btn_elem0` | UIMenuItemImage | [101.0, 258.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/HeroPernuteCell/UIMenu_1/btn_elem1` | UIMenuItemImage | [190.0, 258.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroPernuteCell/UIMenu_1/btn_elem2` | UIMenuItemImage | [280.0, 258.0] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroPernuteCell/UIMenu_1/btn_elem3` | UIMenuItemImage | [370.0, 258.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroPernuteCell/UIMenu_1/btn_elem4` | UIMenuItemImage | [460.0, 258.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroPernuteCell/UIMenu_1/btn_elem5` | UIMenuItemImage | [540.0, 258.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroPernuteCell/UIMenu_1/btn_info` | UIMenuItemImage | [505.0, 604.0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroPernuteCell/UIMenu_1/btn_add` | UIMenuItemImage | [589.0, 333.0] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-4.png` dc7cf03f-2de3-4d1d-953e-ff6dd51ef5c3 |
| `/HeroPernuteCell/UIMenu_1/btn_enter` | UIMenuItemLabel | [320.0, 371.864] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」40 [255, 255, 255, 255] |
| `/HeroPernuteCell/node_name_1` | CCNode | [141, 542] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteCell/node_name_2` | CCNode | [502, 542] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteCell/node_change_hero` | CCNode | [311, 508] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteCell/node_change_hero/CCSprite_1` | CCSprite | [0, -116] | [0.5, 0.5] | [106, 129] | [-0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/HeroPernuteCell/image_bg_icno` | CCSprite | [489, 334] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901807.png` 5af88da4-bdcc-4904-b9b3-0373ec8f2e00 |
| `/HeroPernuteCell/lbl_select_num` | UILabelTTF | [509, 333] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroPernuteCell/lbl_show_msg` | UILabelTTF | [321, 198] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「可参与置换的英雄」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroPernuteCell/spr_bg_backpack` | CCScale9Sprite | [321, 35.0] | [0.5, 0] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[10, 10, 10, 10] |

## HeroPernuteLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroPernuteLayer` | HeroPernuteLayer | [0, 0] | [0, 0] | [614, 730] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteLayer/menu_root` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteLayer/menu_root/btn_back` | UIMenuItemImage | [570, 870] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/HeroPernuteLayer/menu_root/btn_2` | UIMenuItemTab | [301, 666] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-7.png` 8a3c8429-0946-4341-8fe0-bc3c6237a448 pressed `ui/common/button_btn-tab-8.png` aac0291d-cbbf-48cb-9486-944e18e9e5cd · Label「回 退」40 [255, 255, 255, 255] |
| `/HeroPernuteLayer/menu_root/btn_1` | UIMenuItemTab | [317, 666] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「置 换」40 [255, 255, 255, 255] |

## HeroPernuteSelectLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroPernuteSelectLayer` | HeroPernuteSelectLayer | [0, 0] | [0, 0] | [560, 450] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [560, 450] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-huitui-k2.png` 2941666e-35bc-41e3-9ad6-016214bfc56e insets[90, 5, 80, 80] |
| `/HeroPernuteSelectLayer/spr_bg_backpack` | CCScale9Sprite | [281, 92.0] | [0.5, 0] | [530, 240] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[10, 10, 10, 10] |
| `/HeroPernuteSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroPernuteSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [283.8, 47.312] | [0.5, 0.5] | [136, 58] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「」24 [255, 255, 255, 255] |
| `/HeroPernuteSelectLayer/lbl_select` | UILabelTTF | [21, 386] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」20 STZhongsong.ttf rgb[89, 53, 15] |
| `/HeroPernuteSelectLayer/lbl_name` | UILabelTTF | [283, 429] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Name」24 STZhongsong.ttf rgb[253, 229, 190] |
| `/HeroPernuteSelectLayer/lbl_msg` | UILabelTTF | [283, 356] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Gang mga gaGang mga gaGang mga gaGang mga ga」20 STZhongsong.ttf rgb[239, 56, 14] |

## HeroRollBackLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroRollBackLayer` | HeroRollBackLayer | [0, 0] | [0, 0] | [640, 601] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/msg_panel` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/msg_panel/spr_list_bg` | CCScale9Sprite | [37, 113] | [0.5, 0.5] | [560, 240] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/city/main-altar_spr_back_2.png` eaf7eb3b-77d5-430f-9626-5863e3255261 insets[100, 10, 10, 10] |
| `/HeroRollBackLayer/msg_panel/spr_bg_backpack` | CCScale9Sprite | [319, 132] | [0.5, 0] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[10, 10, 10, 10] |
| `/HeroRollBackLayer/msg_panel/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/msg_panel/lbl_tip_text` | UILabelTTF | [320, 334] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10星以上英雄可回退到9星，并返回所有升星材料」40 STZhongsong.ttf rgb[118, 59, 222] |
| `/HeroRollBackLayer/msg_panel/CCSprite_1` | CCSprite | [320, 289] | [0.5, 0.5] | [129, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-huitui-k3.png` d9db686a-3278-48cf-b26a-18a9ace15bad |
| `/HeroRollBackLayer/select_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/select_1/spr_bg_msg_bg` | CCScale9Sprite | [322, 494] | [0.5, 0.5] | [300, 30] | [1.3, 1.3] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-notice.png` e5910f4a-e5ef-4c83-936f-f7ad231f15d2 insets[20, 10, 1, 10] |
| `/HeroRollBackLayer/select_1/lbl_tip_text_20` | UILabelTTF | [322, 494] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请选择要回退的英雄」40 STZhongsong.ttf rgb[43, 249, 0] |
| `/HeroRollBackLayer/select_1/select_hero_btn` | CCNode | [322, 646] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/select_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/select_2/CCScale9Sprite_1` | CCScale9Sprite | [116, 509] | [0.5, 0.5] | [408, 160] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-name-bg-1.png` 31834a17-4e93-4fac-8dd6-74cff10c6fbd |
| `/HeroRollBackLayer/select_2/lbl_name` | UILabelTTF | [320, 627] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄名称」44 STZhongsong.ttf rgb[254, 223, 170] |
| `/HeroRollBackLayer/select_2/CCSprite_1` | CCSprite | [320, 587] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroRollBackLayer/select_2/CCSprite_2` | CCSprite | [320, 552] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroRollBackLayer/select_2/lbl_now_level` | UILabelTTF | [297, 554] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0111」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroRollBackLayer/select_2/lbl_now_to_level` | UILabelTTF | [346, 554] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0111」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroRollBackLayer/select_2/now_star` | CCNode | [278, 592] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/select_2/to_star` | CCNode | [365, 592] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/select_2/now_hero` | CCNode | [322, 104] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/select_2/icon_occupat` | CCSprite | [217, 619] | [0.5, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-occup-1.png` ef613cb3-a154-4e42-afd1-b40577318d2a |
| `/HeroRollBackLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroRollBackLayer/UIMenu_1/btn_add` | UIMenuItemImage | [589, 400] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-4.png` dc7cf03f-2de3-4d1d-953e-ff6dd51ef5c3 |
| `/HeroRollBackLayer/UIMenu_1/btn_info` | UIMenuItemImage | [505, 604] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroRollBackLayer/UIMenu_1/btn_enter` | UIMenuItemImage | [320, 64] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd |
| `/HeroRollBackLayer/image_bg` | CCSprite | [536, 400] | [0.5, 0.5] | [134, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg-1.png` 1c80673b-7365-4493-9430-39e3729969f0 |
| `/HeroRollBackLayer/lbl_select_num` | UILabelTTF | [508, 400] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroRollBackLayer/image_bg_icno` | CCSprite | [489, 400] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901807.png` 5af88da4-bdcc-4904-b9b3-0373ec8f2e00 |

## HeroShareInfoContentLayer（33）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroShareInfoContentLayer` | HeroShareInfoContentLayer | [0, 0] | [0, 0] | [462, 580] | [1, 1] | 0 | 是 |  |
| `/HeroShareInfoContentLayer/CCSprite_1` | CCSprite | [32, 537] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-equip.png` 668d4109-715f-4caa-b4d2-3de39772a585 |
| `/HeroShareInfoContentLayer/CCSprite_2` | CCSprite | [32, 440] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-runes.png` 6a948ff3-18d3-4358-a42f-26fd92f2f7b7 |
| `/HeroShareInfoContentLayer/CCSprite_3` | CCSprite | [259, 440] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-talent.png` 973fb594-6303-4567-9d0a-8f2c3f818ec6 |
| `/HeroShareInfoContentLayer/CCSprite_4` | CCSprite | [32, 340] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-lingjie.png` 9a804a7d-f94c-43f3-ab11-4db3d06e8f0d |
| `/HeroShareInfoContentLayer/spr_totem_tag` | CCSprite | [259, 340] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/totem-lang_spr-totem.png` 3b85f2ee-4aa6-4956-abc5-2503cd2b6156 |
| `/HeroShareInfoContentLayer/spr_jewl_tag` | CCSprite | [32, 240] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-gem.png` a167b251-9f90-454c-931f-5765f4f69423 |
| `/HeroShareInfoContentLayer/spr_god_equip_tag` | CCSprite | [32, 150] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-god-equip.png` 0555f26d-a5d3-4978-93f2-f1d149d110b4 |
| `/HeroShareInfoContentLayer/spr_pet_tag` | CCSprite | [32, 50] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-pet.png` 0cf27b4e-5706-4d81-adc7-612f7e3235ba |
| `/HeroShareInfoContentLayer/spr_magic_wand_tag` | CCSprite | [182, 50] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-magic-wand.png` 6e3d1f0d-1529-4a67-a75f-7ebcf49e1bf7 |
| `/HeroShareInfoContentLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroShareInfoContentLayer/menu/btn_equip_1` | UIMenuItemImage | [102, 537] | [0.5, 0.5] | [106, 106] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroShareInfoContentLayer/menu/btn_equip_4` | UIMenuItemImage | [190, 537] | [0.5, 0.5] | [106, 106] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroShareInfoContentLayer/menu/btn_equip_2` | UIMenuItemImage | [366, 537] | [0.5, 0.5] | [106, 106] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroShareInfoContentLayer/menu/btn_equip_3` | UIMenuItemImage | [278, 537] | [0.5, 0.5] | [106, 106] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroShareInfoContentLayer/menu/btn_runes_1` | UIMenuItemImage | [102, 440] | [0.5, 0.5] | [108, 118] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-runes.png` d686a6cf-8a52-47fb-914d-95c94cdfae81 |
| `/HeroShareInfoContentLayer/menu/btn_runes_2` | UIMenuItemImage | [192, 440] | [0.5, 0.5] | [108, 118] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-runes.png` d686a6cf-8a52-47fb-914d-95c94cdfae81 |
| `/HeroShareInfoContentLayer/menu/btn_talent_1` | UIMenuItemImage | [328, 440] | [0.5, 0.5] | [104, 104] | [0.65, 0.65] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-bg-11.png` 617991eb-0390-4f73-aea0-efa907c00768 |
| `/HeroShareInfoContentLayer/menu/btn_talent_2` | UIMenuItemImage | [412, 440] | [0.5, 0.5] | [104, 104] | [0.65, 0.65] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-bg-11.png` 617991eb-0390-4f73-aea0-efa907c00768 |
| `/HeroShareInfoContentLayer/menu/btn_artifact_1` | UIMenuItemImage | [102, 340] | [0.5, 0.5] | [126, 126] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/HeroShareInfoContentLayer/menu/btn_artifact_2` | UIMenuItemImage | [192, 340] | [0.5, 0.5] | [126, 126] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/HeroShareInfoContentLayer/menu/btn_totem` | UIMenuItemImage | [328, 340] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_gem_1` | UIMenuItemImage | [102, 240] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_gem_2` | UIMenuItemImage | [190, 240] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_gem_3` | UIMenuItemImage | [278, 240] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_god_equip_1` | UIMenuItemImage | [102, 150] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_god_equip_2` | UIMenuItemImage | [190, 150] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_god_equip_3` | UIMenuItemImage | [278, 150] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_god_equip_4` | UIMenuItemImage | [366, 150] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_pet` | UIMenuItemImage | [102, 50] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_magic_wand` | UIMenuItemImage | [252, 50] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/menu/btn_unicorn` | UIMenuItemImage | [402, 50] | [0.5, 0.5] | [104, 104] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/HeroShareInfoContentLayer/spr_unicorn_tag` | CCSprite | [332, 50] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-unicorn.png` 51292425-2248-4f20-b943-786e864367f8 |

## HeroShareInfoLayer（32）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroShareInfoLayer` | HeroShareInfoLayer | [0, 0] | [0, 0] | [550, 812] | [1, 1] | 0 | 是 |  |
| `/HeroShareInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 837] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroShareInfoLayer/menu_hero` | CCMenu | [126, 730] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroShareInfoLayer/lbl_hero_name` | UILabelTTF | [213, 758] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 STZhongsong.ttf rgb[201, 91, 25] |
| `/HeroShareInfoLayer/CCSprite_1` | CCSprite | [213, 725] | [0, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/HeroShareInfoLayer/lbl_bat` | UILabelTTF | [238, 727] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999999」18 STZhongsong.ttf rgb[122, 71, 45] |
| `/HeroShareInfoLayer/CCNode_1` | CCNode | [0, 147] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroShareInfoLayer/CCNode_1/sp_grade1` | CCSprite | [223, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroShareInfoLayer/CCNode_1/sp_grade2` | CCSprite | [250, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroShareInfoLayer/CCNode_1/sp_grade3` | CCSprite | [277, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroShareInfoLayer/CCNode_1/sp_grade4` | CCSprite | [304, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroShareInfoLayer/CCNode_1/sp_grade5` | CCSprite | [331, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroShareInfoLayer/CCNode_1/sp_grade6` | CCSprite | [358, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroShareInfoLayer/CCLayerColor_1` | CCLayerColor | [75, 657] | [0, 0] | [400, 1] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[140, 109, 88] a255 |
| `/HeroShareInfoLayer/CCSprite_2` | CCSprite | [72, 599] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-attr.png` 7c0303d5-d19b-4580-8eee-1340695c6ef2 |
| `/HeroShareInfoLayer/CCSprite_3` | CCSprite | [100, 617] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/HeroShareInfoLayer/CCSprite_4` | CCSprite | [310, 617] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/HeroShareInfoLayer/CCSprite_5` | CCSprite | [100, 567] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-11.png` 3e9c096f-512b-4bdd-887d-c42d64a2cc02 |
| `/HeroShareInfoLayer/CCSprite_6` | CCSprite | [310, 567] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-4.png` 13ff4181-e422-4d01-8b8b-a69de849e668 |
| `/HeroShareInfoLayer/UILabelTTF_1` | UILabelTTF | [150, 617] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/lbl_attack` | UILabelTTF | [205, 617] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/UILabelTTF_2` | UILabelTTF | [360, 617] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/lbl_hp` | UILabelTTF | [415, 617] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/UILabelTTF_3` | UILabelTTF | [150, 567] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/lbl_defense` | UILabelTTF | [205, 567] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/UILabelTTF_4` | UILabelTTF | [360, 567] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/lbl_speed` | UILabelTTF | [415, 567] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroShareInfoLayer/CCSprite_7` | CCSprite | [72, 487] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-skill.png` 0c828495-6e62-4a94-bfc9-a96e8413b4bb |
| `/HeroShareInfoLayer/CCScale9Sprite_1` | CCScale9Sprite | [99, 448] | [0.5, 0.5] | [390, 80] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-new-8.png` 7ca842a7-aafa-4322-91bc-113a22564392 insets[0, 0, 40, 40] |
| `/HeroShareInfoLayer/CCLayerColor_2` | CCLayerColor | [75, 427] | [0, 0] | [400, 1] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[140, 109, 88] a255 |
| `/HeroShareInfoLayer/menu_skill` | CCMenu | [0, 75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroShareInfoLayer/scroll_view` | CCScrollView | [45, 36] | [0, 0] | [462, 390] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## HeroShareMenu（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroShareMenu` | HeroShareMenu | [0, 0] | [0, 0] | [196, 198] | [1, 1] | 0 | 是 |  |
| `/HeroShareMenu/node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroShareMenu/node/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [196, 198] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-share_spr-menu-bg.png` 29f4e4bb-ca17-4a6d-9def-c5b6749e814b insets[10, 10, 10, 10] |
| `/HeroShareMenu/node/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroShareMenu/node/CCMenu_1/btn_1` | UIMenuItemLabel | [97, 160] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「」48 [255, 255, 255, 255] |
| `/HeroShareMenu/node/CCMenu_1/btn_2` | UIMenuItemLabel | [97, 97] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「」48 [255, 255, 255, 255] |
| `/HeroShareMenu/node/CCMenu_1/btn_3` | UIMenuItemLabel | [98, 34] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「」48 [255, 255, 255, 255] |

## HeroSkinSettingLayer（61）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSkinSettingLayer` | HeroSkinSettingLayer | [0, 0] | [0, 0] | [640, 890] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/CCSprite_1` | CCSprite | [320.0, 432.0] | [0.5, 0.5] | [635, 916] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_win-bg-24.png` 41744728-96aa-4fa3-a555-34a1b91b7656 |
| `/HeroSkinSettingLayer/CCSprite_2` | CCSprite | [319.928, 621.712] | [0.5, 0.5] | [561, 420] | [1.01, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/fashion-bg.png` 9ef81da8-6472-4c9b-92ef-cc23a104431b |
| `/HeroSkinSettingLayer/CCNode_1` | CCNode | [320.0, 779.43] | [0.5, 1] | [560, 320] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/CCNode_1/node_root` | CCNode | [0.0, -320.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/CCNode_1/node_root/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0] | [365, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-magic.png` b32adef7-1063-48bd-88d2-a2c35402bb47 |
| `/HeroSkinSettingLayer/CCNode_1/node_root/node_animator` | CCNode | [0, 43] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_skill_extra` | CCNode | [90, 780] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_skill_extra/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [108, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-icon-bg.png` 7ebc084b-edaa-443d-b4f3-54a925650785 |
| `/HeroSkinSettingLayer/node_skill_extra/spr_skill_icon` | CCSprite | [0, 0] | [0.5, 0.5] | [64, 64] | [1.2, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101050102.png` 4fcea056-1b7d-462a-9fb0-2e7e5b1fa0b0 |
| `/HeroSkinSettingLayer/node_skill_extra/spr_skill_mask` | CCSprite | [0, 0] | [0.5, 0.5] | [84, 83] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-icon-mask.png` 82978ffa-21ee-4d0e-b2dd-316d58c62466 |
| `/HeroSkinSettingLayer/node_skill_extra/lbl_skill_unlock_tip` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「激活解锁」36 CloudYuanCuGBK.ttf rgb[141, 249, 55] |
| `/HeroSkinSettingLayer/node_skill_extra/lbl_skill_name` | UILabelTTF | [0, -60] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名字」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/HeroSkinSettingLayer/node_skill_extra/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_skill_extra/CCMenu_1/btn_skill_info` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroSkinSettingLayer/CCNode_2` | CCNode | [320, 412] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/CCNode_2/lbl_skin_name` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」52 FZCSJW--GB1-0.ttf rgb[226, 117, 72] |
| `/HeroSkinSettingLayer/CCNode_2/CCSprite_1` | CCSprite | [166, 0] | [0.5, 0.5] | [157, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_xian.png` 048772a8-9e92-48c2-829e-6eab55217408 |
| `/HeroSkinSettingLayer/CCNode_2/CCSprite_2` | CCSprite | [-166, 0] | [0.5, 0.5] | [157, 26] | [1, 1] | -180 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_xian.png` 048772a8-9e92-48c2-829e-6eab55217408 |
| `/HeroSkinSettingLayer/node_attr` | CCNode | [320, 431] | [0.5, 1] | [564, 194] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/CCNode_1` | CCNode | [-261.0, -62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「有效时间：」40 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HeroSkinSettingLayer/node_attr/CCNode_1/lbl_skin_time` | UILabelTTF | [95, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「永 久」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_attr/CCNode_2` | CCNode | [101.0, -63] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「等级：」40 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HeroSkinSettingLayer/node_attr/CCNode_2/lbl_skin_level` | UILabelTTF | [63, 1] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「120/120」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_attr/CCSprite_1` | CCSprite | [-233.0, -108] | [0.5, 0.5] | [64, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_lbl-attr.png` eb02a67b-9ccc-47de-9fa3-f5b1f66dd15d |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_1` | CCNode | [-92.0, -110] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_1/spr_attr_addition_1` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-attack-bg.png` befbe4d4-c9b7-4a0e-a20d-c214a0b3115d |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_1/lbl_attr_1` | UILabelTTF | [-50, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_1/lbl_attr_extra_1` | UILabelTTF | [-9, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+2%」44 STZhongsong.ttf rgb[0, 137, 75] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_2` | CCNode | [138.0, -111] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_2/spr_attr_addition_2` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-hp-bg.png` 25385ad4-99bb-4379-a9db-9bff61705baf |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_2/lbl_attr_2` | UILabelTTF | [-50, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_2/lbl_attr_extra_2` | UILabelTTF | [-9, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+2%」44 STZhongsong.ttf rgb[0, 137, 75] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_3` | CCNode | [-92.0, -162] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_3/spr_attr_addition_3` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_3/lbl_attr_3` | UILabelTTF | [-50, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_3/lbl_attr_extra_3` | UILabelTTF | [-9, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+2%」44 STZhongsong.ttf rgb[0, 137, 75] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_4` | CCNode | [139.0, -162] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_4/spr_attr_addition_4` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-speed-bg.png` 4efc63f2-f7b6-4e51-9703-8c48d2bc3bbe |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_4/lbl_attr_4` | UILabelTTF | [-50, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击+2%」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_attr/node_attr_addition_4/lbl_attr_extra_4` | UILabelTTF | [-9, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+2%」44 STZhongsong.ttf rgb[0, 137, 75] |
| `/HeroSkinSettingLayer/node_default` | CCNode | [320, 431] | [0.5, 1] | [564, 194] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_default/UILabelTTF_1` | UILabelTTF | [0.0, -97.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「无属性加成」52 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroSkinSettingLayer/node_skill` | CCNode | [320, 238] | [0.5, 1] | [570, 99] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_skill/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [570.0, 99.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-30.png` 25a83568-2f24-4036-b401-a75c63296195 insets[10, 10, 0, 0] |
| `/HeroSkinSettingLayer/node_skill/scroll_view` | CCScrollView | [-57.0, -49.5] | [0.5, 0.5] | [427.5, 99.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/HeroSkinSettingLayer/node_skill/CCSprite_1` | CCSprite | [159.6, -49.5] | [0.5, 0.5] | [10, 99] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/permanent-skin/permanent-skin_spr_line.png` e759f5a6-7461-47f0-af05-b5c618a09542 |
| `/HeroSkinSettingLayer/node_skill/CCMenu_1` | CCMenu | [217.0, -41.58] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_skill/CCMenu_1/btn_skin_shop` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/permanent-skin/permanent-skin_btn-skin-shop.png` d5c4a3db-6c10-4b61-9ef1-1b49e3aa1bf8 · Label「」36 [255, 255, 255, 255] |
| `/HeroSkinSettingLayer/node_need` | CCNode | [321, 138] | [0.5, 1] | [579, 110] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/node_need/CCScale9Sprite_1` | CCScale9Sprite | [75.5, -98] | [0.5, 0.5] | [125, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-26.png` 283bf4bb-a51c-45ef-aa52-ef75cec591a5 insets[10, 10, 10, 10] |
| `/HeroSkinSettingLayer/node_need/spr_need_res` | CCSprite | [92.5, -80] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_906201.png` 28471eb6-24e3-4d5d-babe-bf6e073a1ae8 |
| `/HeroSkinSettingLayer/node_need/lbl_need_res` | UILabelTTF | [152.5, -82] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10/10」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroSkinSettingLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640.0, 890.0] | [1, 1] | 0 | 是 |  |
| `/HeroSkinSettingLayer/menu/btn_close` | UIMenuItemImage | [576.0, 866.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroSkinSettingLayer/menu/btn_max_preview` | UIMenuItemImage | [535.0, 805.0] | [0.5, 0.5] | [113, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-lang_btn-preview.png` dc92b08d-d474-4784-a6f3-d666d7a34806 |
| `/HeroSkinSettingLayer/menu/btn_wear` | UIMenuItemLabel | [182.0, 104.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「替 换」44 [255, 255, 255, 255] |
| `/HeroSkinSettingLayer/menu/btn_upgrade` | UIMenuItemLabel | [458.0, 104.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「升 级」44 [255, 255, 255, 255] |
| `/HeroSkinSettingLayer/menu/btn_active` | UIMenuItemLabel | [320.0, 104.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「激 活」44 [255, 255, 255, 255] |

## HeroSoulLayer（49）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSoulLayer` | HeroSoulLayer | [0, 0] | [0, 0] | [640, 884] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 884] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroSoulLayer/CCNode_1` | CCNode | [320.0, 883.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_1/node_title` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_1/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroSoulLayer/CCNode_1/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「装备附魂」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroSoulLayer/CCNode_1/UIMenu_1` | UIMenu | [266.667, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_1/UIMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroSoulLayer/CCNode_2` | CCNode | [321.0, 488.0] | [0.5, 0.5] | [564, 638] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [562, 636] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-soul_spr-soul-bg3.png` f5f5a69a-f859-429c-aba0-414e42cca790 |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/CCSprite_1` | CCSprite | [1.0, 129.4] | [0.5, 0.5] | [532, 348] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-soul_spr-soul-bg.png` a8dd0ff3-0d70-42ed-be85-40b544359110 |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/spr_skill_di_bg_1` | CCSprite | [1.0, -197.0] | [0.5, 0.5] | [534, 210] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-soul_spr-soul-bg2.png` 2fe3a2bf-7a31-4902-b541-42c67376b56c |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/spr_desc_bg` | CCScale9Sprite | [0.0, -70.762] | [0.5, 0.5] | [220, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-9.png` 7cafdc41-29c5-4bce-bb1a-50cc09229ae3 insets[20, 20, 20, 20] |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/lbl_grade` | UILabelTTF | [-68.755, -70.777] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「附魂等级：」48 FZCSJW--GB1-0.ttf rgb[112, 75, 42] |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/lbl_soul_level` | UILabelTTF | [36.869, -70.777] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0级」48 FZCSJW--GB1-0.ttf rgb[112, 75, 42] |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/spr_skill_di_bg_4` | CCSprite | [1.0, -197.0] | [0.5, 0.5] | [534, 210] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-soul_spr-soul-bg4.png` 913837a4-f654-4164-bc95-cdab940966a2 |
| `/HeroSoulLayer/CCNode_2/spr_soul_bg/spr_skill_di_bg_5` | CCSprite | [0.0, -194.389] | [0.5, 0.5] | [210, 190] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-soul_spr-soul-bg5.png` 444154e9-1607-419b-984c-d9aeae779d0e |
| `/HeroSoulLayer/CCNode_2/menu_hero` | UIMenu | [-2.4, 126.8] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/menu_equip` | UIMenu | [0.0, 55.4] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/menu_equip/btn_equip_1` | UIMenuItemImage | [-206, 187] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroSoulLayer/CCNode_2/menu_equip/btn_equip_3` | UIMenuItemImage | [205, 187] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroSoulLayer/CCNode_2/menu_equip/btn_equip_4` | UIMenuItemImage | [-206, -40] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroSoulLayer/CCNode_2/menu_equip/btn_equip_2` | UIMenuItemImage | [205, -40] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroSoulLayer/CCNode_2/node_name` | CCNode | [0.0, 258.137] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_name/spr_name_bg` | CCSprite | [0, -1.0] | [0.5, 0.5] | [282, 87] | [1, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-name-bg-1.png` 31834a17-4e93-4fac-8dd6-74cff10c6fbd |
| `/HeroSoulLayer/CCNode_2/node_name/icon_elem` | CCSprite | [-50, 20] | [0.5, 0.5] | [74, 74] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-42.png` f0b1a70e-70a0-4cf9-886d-5ab63d86985e |
| `/HeroSoulLayer/CCNode_2/node_name/lbl_hero_name` | UILabelTTF | [2, 21] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroSoulLayer/CCNode_2/node_name/node_star` | CCNode | [0, -20] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview` | CCNode | [-287.833, -68.167] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview/CCMenu_1/btn_info` | UIMenuItemImage | [45.133, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroSoulLayer/CCNode_2/node_preview/CCMenu_1/btn_skill_preview` | UIMenuItemImage | [415.133, -1.667] | [0.5, 0.5] | [29, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-fdj.png` f5dc241b-e516-4ef6-abc1-b072a9cfa981 |
| `/HeroSoulLayer/CCNode_2/node_preview/CCMenu_1/btn_sure` | UIMenuItemLabel | [290, -350.834] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「附魂」40 [255, 255, 255, 255] |
| `/HeroSoulLayer/CCNode_2/node_preview/CCMenu_1/btn_reset` | UIMenuItemLabel | [408.086, 72.149] | [0.5, 0.5] | [70, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-soul_btn-soul-cz.png` 2a1d355c-c251-4ec5-9ead-fb7e12aa8ce9 · Label「重置」40 [255, 255, 255, 255] |
| `/HeroSoulLayer/CCNode_2/node_preview/skill_node_1` | CCNode | [163.24, -128] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview/skill_node_2` | CCNode | [411.48, -128] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview/skill_node_3` | CCNode | [287.0, -128] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview/skill_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/node_preview/lbl_warning` | UILabelTTF | [293.76, -221.68] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「穿戴红色6星装备，开启附魂」45 FZCSJW--GB1-0.ttf rgb[148, 17, 0] |
| `/HeroSoulLayer/CCNode_2/CCNode_1` | CCNode | [-181.8, -353.0] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/CCNode_1/CCSprite_1` | CCSprite | [61.0, 0.0] | [0.5, 0.5] | [122, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_k.png` f55134e3-ae76-4395-9051-a90f32c28ebe |
| `/HeroSoulLayer/CCNode_2/CCNode_1/lbl_num_1` | UILabelTTF | [68.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroSoulLayer/CCNode_2/CCNode_1/CCMenu_1` | CCMenu | [2, 2.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/CCNode_1/CCMenu_1/btn_item_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_900301.png` ceb3408e-0543-4098-9b5b-4abf93a1c9cd |
| `/HeroSoulLayer/CCNode_2/CCNode_2` | CCNode | [76.2, -355.0] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/CCNode_2/CCSprite_1` | CCSprite | [61.0, 0.0] | [0.5, 0.5] | [122, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_k.png` f55134e3-ae76-4395-9051-a90f32c28ebe |
| `/HeroSoulLayer/CCNode_2/CCNode_2/lbl_num_2` | UILabelTTF | [68.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroSoulLayer/CCNode_2/CCNode_2/CCMenu_1` | CCMenu | [2, 2.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulLayer/CCNode_2/CCNode_2/CCMenu_1/btn_item_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_900301.png` ceb3408e-0543-4098-9b5b-4abf93a1c9cd |

## HeroSoulResultLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSoulResultLayer` | HeroSoulResultLayer | [0, 0] | [0, 0] | [640, 460] | [1, 1] | 0 | 是 |  |
| `/HeroSoulResultLayer/CCNode_1` | CCNode | [320.0, 230.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulResultLayer/CCNode_1/spr_result_bg` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/HeroSoulResultLayer/node` | CCNode | [320.0, 230.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulResultLayer/node/spr_title` | CCSprite | [0, 195] | [0.5, 0.5] | [322, 77] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_spr-soul-jinghua.png` 8e69146c-4dec-4c8c-aba1-e733597e706d |
| `/HeroSoulResultLayer/node/menu` | UIMenu | [0, 88.8] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulResultLayer/node/menu/btn_equip` | UIMenuItemImage | [0, -7] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroSoulResultLayer/node/lbl_title_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能升級」24 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/HeroSoulResultLayer/node/CCSprite_1` | CCSprite | [161, 1] | [0.5, 0.5] | [154, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/HeroSoulResultLayer/node/CCSprite_2` | CCSprite | [-157, 1] | [0.5, 0.5] | [154, 28] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/HeroSoulResultLayer/node/lbl_skill_name` | UILabelTTF | [-53.2, -66] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名字」40 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/HeroSoulResultLayer/node/lbl_skill_level` | UILabelTTF | [36.8, -66] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「等級+1」40 CloudYuanCuGBK.ttf rgb[104, 224, 42] |
| `/HeroSoulResultLayer/node/UIMenu_1` | UIMenu | [-117, -106] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulResultLayer/node/UIMenu_1/skill_icon` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [64, 64] | [1.3, 1.3] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101050081.png` b403f3a9-7f88-4aaa-b910-6e8f8d936b91 |
| `/HeroSoulResultLayer/node/node_skill_info` | CCNode | [-53, -81] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulResultLayer/node/CCSprite_3` | CCSprite | [-144.611, -81.778] | [0.5, 0.5] | [20, 20] | [1.2, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-level-bg.png` b25b07eb-5375-4cc2-baf1-a79bdb848e4b |
| `/HeroSoulResultLayer/node/lbl_level` | UILabelTTF | [-145.718, -81.42] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「5」36 CloudYuanCuGBK.ttf rgb[115, 75, 18] |

## HeroSoulShowCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSoulShowCell` | HeroSoulShowCell | [0, 0] | [0, 0] | [440, 130] | [1, 1] | 0 | 是 |  |
| `/HeroSoulShowCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [440, 100] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-soul_spr-soul-bg4.png` 913837a4-f654-4164-bc95-cdab940966a2 insets[10, 10, 10, 10] |
| `/HeroSoulShowCell/lbl_soul_lv` | UILabelTTF | [0, 114] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「附魂等級：1級」22 CloudYuanCuGBK.ttf rgb[115, 75, 18] |
| `/HeroSoulShowCell/menu` | UIMenu | [50, 63] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulShowCell/menu/skill_icon` | UIMenuItemImage | [0, -12] | [0.5, 0.5] | [64, 64] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/skill-icon_101050081.png` b403f3a9-7f88-4aaa-b910-6e8f8d936b91 |
| `/HeroSoulShowCell/skill_name` | UILabelTTF | [93, 83] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名字」18 CloudYuanCuGBK.ttf rgb[250, 221, 175] |
| `/HeroSoulShowCell/CCSprite_1` | CCSprite | [26.389, 72.222] | [0.5, 0.5] | [20, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-level-bg.png` b25b07eb-5375-4cc2-baf1-a79bdb848e4b |
| `/HeroSoulShowCell/lbl_level` | UILabelTTF | [26, 70.972] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「5」16 CloudYuanCuGBK.ttf rgb[115, 75, 18] |
| `/HeroSoulShowCell/node_skill_info` | CCNode | [92.989, 69.87] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroSoulShowLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSoulShowLayer` | HeroSoulShowLayer | [0, 0] | [0, 0] | [500, 572] | [1, 1] | 0 | 是 |  |
| `/HeroSoulShowLayer/spr_bg` | CCScale9Sprite | [1, 0] | [0.5, 0.5] | [500, 572] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroSoulShowLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSoulShowLayer/UIMenu_1/btn_close` | UIMenuItemImage | [443, 565] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroSoulShowLayer/CCNode_1` | CCNode | [250.0, 503.36] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSoulShowLayer/CCNode_1/lbl_little` | UILabelTTF | [0, 0] | [0.55, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「附魂总览」22 CloudYuanCuGBK.ttf rgb[115, 75, 18] |
| `/HeroSoulShowLayer/CCNode_1/CCSprite_1` | CCSprite | [135, 0] | [0.5, 0.5] | [154, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/HeroSoulShowLayer/CCNode_1/CCSprite_2` | CCSprite | [-140, 0] | [0.5, 0.5] | [154, 28] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/HeroSoulShowLayer/CCNode_1/scroll_view` | UIScrollViewBackpack | [1, -19] | [0.5, 1] | [450, 430] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## HeroTalkTipsLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroTalkTipsLayer` | CCLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroTalkTipsLayer/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [124, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** battle-detail/talk-tips.png |
| `/HeroTalkTipsLayer/pointer` | CCNode | [54.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroUseSkinLayer（33）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroUseSkinLayer` | HeroUseSkinLayer | [0, 0] | [0, 0] | [559, 770] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/map_bg` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCScale9Sprite_1` | CCScale9Sprite | [1, -4] | [0.5, 0.5] | [559, 770] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[10, 10, 10, 10] |
| `/HeroUseSkinLayer/CCNode_1` | CCNode | [279.5, 674.338] | [0.5, 1] | [560, 320] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_1/node_root` | CCNode | [0.0, -320.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_1/node_root/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0] | [365, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-magic.png` b32adef7-1063-48bd-88d2-a2c35402bb47 |
| `/HeroUseSkinLayer/CCNode_1/node_root/node_animator` | CCNode | [0, 72] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_2` | CCNode | [277, 328] | [0.5, 1] | [559, 194] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_2/lbl_skin_tip` | UILabelTTF | [0.0, -30.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性加成」52 FZCSJW--GB1-0.ttf rgb[255, 179, 45] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_1` | CCNode | [-62.5, -110] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_1/CCScale9Sprite_1` | CCScale9Sprite | [-182, -4] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_1/lbl_attr_addition_1` | UILabelTTF | [-128, 19] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击：9999」44 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_1/CCSprite_1` | CCSprite | [-157, 19] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_2` | CCNode | [157.5, -111] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_2/CCScale9Sprite_1` | CCScale9Sprite | [-139, -4] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_2/lbl_attr_addition_2` | UILabelTTF | [-81, 18] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：999」44 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_2/CCSprite_1` | CCSprite | [-110, 18] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-223.png` ff125a68-1ad2-49a6-8188-8ce1a9b7edc7 |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_3` | CCNode | [-61.5, -162] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_3/CCScale9Sprite_1` | CCScale9Sprite | [-182, -8] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_3/lbl_attr_addition_3` | UILabelTTF | [-127, 13] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「防御：999」44 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_3/CCSprite_1` | CCSprite | [-157, 14] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-224.png` 174d3d74-7504-48f2-9db5-4f5aebc5de3c |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_4` | CCNode | [158.5, -162] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_4/CCScale9Sprite_1` | CCScale9Sprite | [-141, -8] | [0.5, 0.5] | [240, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-7.png` a632162a-d2b0-4b41-b1a2-72bfd4a6a539 insets[20, 20, 20, 20] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_4/lbl_attr_addition_4` | UILabelTTF | [-83, 13] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「速度：」44 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/HeroUseSkinLayer/CCNode_2/node_attr_addition_4/CCSprite_1` | CCSprite | [-112, 14] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HeroUseSkinLayer/CCNode_2/lbl_skin_desc` | UILabelTTF | [-243.5, -197] | [0, 1] | [985, 150] | [0.5, 0.5] | 0 | 是 | cc.Label「123222212322221232222123222212322221232222123222212322221232222123222212322221232222」40 FZCSJW--GB1-0.ttf rgb[255, 179, 45] |
| `/HeroUseSkinLayer/CCNode_2/lbl_skin_name` | UILabelTTF | [0.0, 397.7] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑 拨 加 防」48 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroUseSkinLayer/CCNode_2/CCSprite_1` | CCSprite | [-3.5, -184] | [0.5, 0.5] | [622, 4] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/HeroUseSkinLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroUseSkinLayer/menu/btn_close` | UIMenuItemImage | [510, 740] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroUseSkinLayer/menu/btn_battle_record` | UIMenuItemImage | [483, 693] | [0.5, 0.5] | [113, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-lang_btn-preview.png` dc92b08d-d474-4784-a6f3-d666d7a34806 |
| `/HeroUseSkinLayer/menu/btn_up_grade` | UIMenuItemLabel | [280, 40] | [0.5, 0.5] | [197, 60] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「使 用」48 [255, 255, 255, 255] |
| `/HeroUseSkinLayer/menu/btn_decompose` | UIMenuItemLabel | [280, 40] | [0.5, 0.5] | [197, 60] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「分解」48 [255, 255, 255, 255] |
