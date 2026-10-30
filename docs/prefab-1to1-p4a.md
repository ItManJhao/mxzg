# P4-a 英雄主干 Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| HeroIllustratInfoLayer | `prefabs/ui/hero/HeroIllustratInfoLayer.prefab` | 44 |
| HeroInfoAttrLayer | `prefabs/ui/hero/HeroInfoAttrLayer.prefab` | 3 |
| HeroInfoAwakenCell | `prefabs/ui/hero/HeroInfoAwakenCell.prefab` | 7 |
| HeroInfoAwakenLayer | `prefabs/ui/hero/HeroInfoAwakenLayer.prefab` | 18 |
| HeroInfoGodEquipLayer | `prefabs/ui/hero/HeroInfoGodEquipLayer.prefab` | 28 |
| HeroInfoLayer | `prefabs/ui/hero/HeroInfoLayer.prefab` | 43 |
| HeroInfoTalentLayer | `prefabs/ui/hero/HeroInfoTalentLayer.prefab` | 16 |
| HeroInfoTipsLayer | `prefabs/ui/hero/HeroInfoTipsLayer.prefab` | 30 |
| HeroInfoUpLevelLayer | `prefabs/ui/hero/HeroInfoUpLevelLayer.prefab` | 40 |
| HeroInfoUpStarLayer | `prefabs/ui/hero/HeroInfoUpStarLayer.prefab` | 44 |
| HeroInfoUpStoneAttrCell | `prefabs/ui/hero/HeroInfoUpStoneAttrCell.prefab` | 4 |
| HeroInfoUpStoneLayer | `prefabs/ui/hero/HeroInfoUpStoneLayer.prefab` | 38 |
| HeroInfoUpgradeLayer | `prefabs/ui/hero/HeroInfoUpgradeLayer.prefab` | 62 |
| HeroListDragonLayer | `prefabs/ui/hero/HeroListDragonLayer.prefab` | 8 |
| HeroListDragonRoomLayer | `prefabs/ui/hero/HeroListDragonRoomLayer.prefab` | 37 |
| HeroListDragonWearLayer | `prefabs/ui/hero/HeroListDragonWearLayer.prefab` | 45 |
| HeroListHeroLayer | `prefabs/ui/hero/HeroListHeroLayer.prefab` | 18 |
| HeroListItemCell | `prefabs/ui/hero/HeroListItemCell.prefab` | 3 |
| HeroListLayer | `prefabs/ui/hero/HeroListLayer.prefab` | 21 |
| HeroRecommendItem | `prefabs/ui/hero/HeroRecommendItem.prefab` | 12 |
| HeroRecommendItemCell | `prefabs/ui/hero/HeroRecommendItemCell.prefab` | 4 |
| HeroSelectLayer | `prefabs/ui/hero/HeroSelectLayer.prefab` | 102 |
| HeroSkillInfoLayer | `prefabs/ui/hero/HeroSkillInfoLayer.prefab` | 15 |
| HeroSkillOpenInfoLayer | `prefabs/ui/hero/HeroSkillOpenInfoLayer.prefab` | 9 |
| HeroStoneStateCell | `prefabs/ui/hero/HeroStoneStateCell.prefab` | 9 |
| HeroStoneStateLayer | `prefabs/ui/hero/HeroStoneStateLayer.prefab` | 8 |
| HeroStrongInfoCell | `prefabs/ui/hero/HeroStrongInfoCell.prefab` | 9 |
| HeroStrongResourceMainCell | `prefabs/ui/hero/HeroStrongResourceMainCell.prefab` | 9 |
| HeroStrongResourceSubCell | `prefabs/ui/hero/HeroStrongResourceSubCell.prefab` | 8 |
| HeroSuggestCell | `prefabs/ui/hero/HeroSuggestCell.prefab` | 5 |
| HeroSuggestLayer | `prefabs/ui/hero/HeroSuggestLayer.prefab` | 64 |
| HeroTalentLearnLayer | `prefabs/ui/hero/HeroTalentLearnLayer.prefab` | 16 |
| HeroTalentShopLayer | `prefabs/ui/hero/HeroTalentShopLayer.prefab` | 14 |
| HeroTalentUpLevelLayer | `prefabs/ui/hero/HeroTalentUpLevelLayer.prefab` | 42 |
| HeroUpStarSelectItemCell | `prefabs/ui/hero/HeroUpStarSelectItemCell.prefab` | 8 |
| HeroUpStarSelectLayer | `prefabs/ui/hero/HeroUpStarSelectLayer.prefab` | 11 |
| HeroXSelectItemCell | `prefabs/ui/hero/HeroXSelectItemCell.prefab` | 8 |
| HeroXSelectLayer | `prefabs/ui/hero/HeroXSelectLayer.prefab` | 6 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/hero/hero-info_spr-sxjx-k.png` | [10, 10, 10, 10] |
| `ui/hero/hero-info_spr-bg-battle.png` | [1, 1, 1, 0] |
| `ui/dragon/dragon_block-bg.png` | [10, 10, 10, 10] |
| `ui/dragon/dragon_block-1.png` | [10, 10, 10, 10] |
| `ui/promo/promotion_spr-inviation-bg.png` | [10, 10, 10, 10] |
| `ui/shop/shop_shop-item-bg.png` | [30, 30, 40, 40] |
| `ui/hero/hero-select_k1.png` | [15, 15, 0, 0] |
| `ui/common/other_spr-bg-3.png` | [7, 7, 9, 9] |
| `ui/common/win-bg_block-bg-21.png` | [17, 17, 17, 17] |
| `ui/battle/battle-detail_spr-cell-bg-3.png` | [50, 100, 0, 0] |
| `ui/battle/battle-detail_spr-cell-bg-2.png` | [42, 0, 0, 0] |
| `ui/common/win-bg_cell-bg-11.png` | [59, 9, 9, 9] |
| `ui/common/win-bg_cell-bg-12.png` | [9, 9, 9, 9] |
| `ui/common/win-bg_block-bg-checkbox-2.png` | [7, 7, 7, 7] |

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-3.png` [19, 19, 19, 19]（edited by P2A）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/win-bg_win-bg-12.png` [20, 20, 15, 18]（edited by P1）
- `ui/hero/hero-info_spr-hero-image-3.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/other_kuang.png` [29, 49, 33, 39]（edited by P3A）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）
- `ui/maps/map-bg-result-1.png` [150, 150, 10, 10]（edited by P3A）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/win-bg_cell-bg-6.png` [29, 28, 29, 29]（edited by P2A）
- `ui/misc/fantasy-land_spr-cell-bg.png` [10, 10, 10, 10]（edited by P3C）
- `ui/shop/shop_shop_8.png` [0, 0, 15, 15]（edited by P3E2）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/hero/hero-info_spr-bg-6.png` [60, 20, 20, 20]（edited by P3A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14] | `HeroInfoAttrLayer:/HeroInfoAttrLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `HeroInfoUpgradeLayer:/HeroInfoUpgradeLayer/spr_bg` |
| `dragon_block-1.png` | [10, 10, 10, 10] | [20, 20, 20, 20] | `HeroListDragonWearLayer:/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCScale9Sprite_1` |
| `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `HeroListHeroLayer:/HeroListHeroLayer/spr_box` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroListLayer:/HeroListLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroSelectLayer:/HeroSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroStoneStateLayer:/HeroStoneStateLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroSuggestLayer:/HeroSuggestLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroTalentLearnLayer:/HeroTalentLearnLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroTalentShopLayer:/HeroTalentShopLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HeroTalentUpLevelLayer:/HeroTalentUpLevelLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroStoneStateLayer:/HeroStoneStateLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroSuggestLayer:/HeroSuggestLayer/node_strong/spr_strong_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroSuggestLayer:/HeroSuggestLayer/node_resource/spr_resource_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroSuggestLayer:/HeroSuggestLayer/node_lineup/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroTalentLearnLayer:/HeroTalentLearnLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HeroTalentLearnLayer:/HeroTalentLearnLayer/CCScale9Sprite_2` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `HeroSkillInfoLayer:/HeroSkillInfoLayer/spr_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 300, 300] | `HeroSkillOpenInfoLayer:/HeroSkillOpenInfoLayer/bg_node/spr_result_bg` |
| `other_spr-bg-3.png` | [7, 7, 9, 9] | [7, 7, 19, 19] | `HeroSuggestLayer:/HeroSuggestLayer/node_strong/_heroStrongScoreBg` |
| `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `HeroTalentLearnLayer:/HeroTalentLearnLayer/spr_cell_bg` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [49, 9, 9, 9] | `HeroTalentUpLevelLayer:/HeroTalentUpLevelLayer/node_content/node_max_bg/CCScale9Sprite_1` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [49, 9, 9, 9] | `HeroTalentUpLevelLayer:/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCScale9Sprite_1` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [49, 9, 9, 9] | `HeroTalentUpLevelLayer:/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/CCScale9Sprite_1` |

## HeroIllustratInfoLayer（44）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroIllustratInfoLayer` | HeroIllustratInfoLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/spr_bg` | CCSprite | [320.0, 640.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-role-1.jpg` 4e49da4f-d5e5-4340-b7ce-22256ee81e7c |
| `/HeroIllustratInfoLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/menu/btn_back` | UIMenuItemImage | [509, 835] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/HeroIllustratInfoLayer/menu_skill` | CCMenu | [-2, -52] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/icon_occupat` | CCSprite | [419, 191] | [0, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-occup-1.png` ef613cb3-a154-4e42-afd1-b40577318d2a |
| `/HeroIllustratInfoLayer/node_equip` | CCNode | [320.0, 860.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_equip/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [520, 520] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle.png` c70f3f6e-fde3-4924-9821-0db68071497e |
| `/HeroIllustratInfoLayer/node_equip/CCSprite_2` | CCSprite | [0, -135] | [0.5, 0.5] | [365, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-magic.png` b32adef7-1063-48bd-88d2-a2c35402bb47 |
| `/HeroIllustratInfoLayer/node_equip/menu_hero` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_name` | CCNode | [320.0, 1060.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_name/spr_name_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [282, 87] | [1, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-name-bg-1.png` 31834a17-4e93-4fac-8dd6-74cff10c6fbd |
| `/HeroIllustratInfoLayer/node_name/icon_elem` | CCSprite | [-50, 20] | [0.5, 0.5] | [74, 74] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-42.png` f0b1a70e-70a0-4cf9-886d-5ab63d86985e |
| `/HeroIllustratInfoLayer/node_name/lbl_hero_name` | UILabelTTF | [2, 21] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroIllustratInfoLayer/node_name/node_star` | CCNode | [0, -20] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_btn` | CCNode | [320.0, 600.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_btn/menu_btn` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_btn/menu_btn/btn_left` | UIMenuItemImage | [-290, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/HeroIllustratInfoLayer/node_btn/menu_btn/btn_right` | UIMenuItemImage | [290, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |
| `/HeroIllustratInfoLayer/node_bottom` | CCNode | [320.0, 150.0] | [0.5, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_bottom/spr_pannel_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [640, 390] | [1.0004, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-7.png` 9e279cb8-a44a-48b9-9a67-34c7fd9ec97b |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1` | CCSprite | [-285.0, 317] | [0, 0.5] | [409, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-10.png` 4d27c4b1-0aa2-4b49-9547-a978a9718c40 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/UILabelTTF_1` | UILabelTTF | [30, 0.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「进阶：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/sp_grade1` | CCSprite | [160, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/sp_grade2` | CCSprite | [190, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/sp_grade3` | CCSprite | [220, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/sp_grade4` | CCSprite | [250, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/sp_grade5` | CCSprite | [280, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_1/sp_grade6` | CCSprite | [310, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_2` | CCSprite | [-195.0, 215] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_2/lbl_attack` | UILabelTTF | [50, -1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_3` | CCSprite | [20.0, 215] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_3/lbl_hp` | UILabelTTF | [50, -1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_4` | CCSprite | [-195.0, 163] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-11.png` 3e9c096f-512b-4bdd-887d-c42d64a2cc02 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_4/lbl_defense` | UILabelTTF | [50, -1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_5` | CCSprite | [20.0, 163] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-4.png` 13ff4181-e422-4d01-8b8b-a69de849e668 |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_5/lbl_speed` | UILabelTTF | [50, -1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/CCSprite_6` | CCSprite | [0.0, 86] | [0.5, 0.5] | [480, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-8.png` 7ca842a7-aafa-4322-91bc-113a22564392 |
| `/HeroIllustratInfoLayer/node_bottom/lbl_level` | UILabelTTF | [-255.0, 355] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级：1/30」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/lbl_profession` | UILabelTTF | [150.0, 355] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「职业：未知」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroIllustratInfoLayer/node_bottom/lbl_max_tips` | UILabelTTF | [0.0, 270] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「已达最大等级」20 FZCSJW--GB1-0.ttf rgb[117, 75, 23] |
| `/HeroIllustratInfoLayer/node_bottom/icon_occupat` | CCSprite | [130.0, 355] | [1, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_icon-occup-3.png` 810701a4-26ea-45c9-b659-23eaf96711f3 |
| `/HeroIllustratInfoLayer/node_bottom/menu_skill` | UIMenu | [0.0, 86] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroIllustratInfoLayer/node_bottom/node_nil_skill` | CCNode | [0.0, 86] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroInfoAttrLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoAttrLayer` | HeroInfoAttrLayer | [0, 0] | [0, 0] | [380, 480] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAttrLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [380, 480] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[15, 15, 15, 15] |
| `/HeroInfoAttrLayer/scroll_view` | UIScrollViewBackpack | [190.0, 465.0] | [0.5, 1] | [370, 450] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## HeroInfoAwakenCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoAwakenCell` | HeroInfoAwakenCell | [0, 0] | [0, 0] | [294, 50] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAwakenCell/spr-bg` | CCSprite | [148.556, 23.917] | [0.5, 0.5] | [288, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-kuang.png` 94a0b6a4-c6a4-4b20-bf13-64365bb15087 |
| `/HeroInfoAwakenCell/spr_info_icon` | CCSprite | [23.688, 24.338] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HeroInfoAwakenCell/lbl_attr_addition` | UILabelTTF | [47.721, 22.496] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：9999」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoAwakenCell/menu_tab` | UIMenu | [219.699, 25.778] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAwakenCell/menu_tab/btn_choice` | UIMenuItemCheckBox | [0, 0] | [0.5, 0.5] | [42, 48] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/HeroInfoAwakenCell/spr_using` | CCSprite | [263.565, 23.438] | [0.5, 0.5] | [68, 26] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_spr-using.png` 0d494f77-522b-4e0c-95b7-7e2e4cddfd29 |

## HeroInfoAwakenLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoAwakenLayer` | HeroInfoAwakenLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAwakenLayer/node_all` | CCNode | [320.0, 108.75] | [0.5, 0] | [640, 390] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAwakenLayer/node_all/spr_bg_backpack` | CCScale9Sprite | [-160.0, 378.3] | [0.5, 1] | [294, 298] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-sxjx-k.png` ef0a0641-d675-4fa5-9947-124beec33dc1 insets[10, 10, 10, 10] |
| `/HeroInfoAwakenLayer/node_all/spr_bg_backpack` | CCScale9Sprite | [161.0, 378.3] | [0.5, 1] | [294, 298] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-sxjx-k.png` ef0a0641-d675-4fa5-9947-124beec33dc1 insets[10, 10, 10, 10] |
| `/HeroInfoAwakenLayer/node_all/CCSprite_1` | CCSprite | [-160.0, 358] | [0.5, 0.5] | [266, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-jx-title.png` ccfb412c-a4df-41ff-9522-b8c64a90731e |
| `/HeroInfoAwakenLayer/node_all/CCSprite_2` | CCSprite | [162.0, 358] | [0.5, 0.5] | [266, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-jx-title.png` ccfb412c-a4df-41ff-9522-b8c64a90731e |
| `/HeroInfoAwakenLayer/node_all/lbl_jichushuxing` | UILabelTTF | [-157.0, 358.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」18 CloudYuanCuGBK.ttf rgb[253, 229, 190] |
| `/HeroInfoAwakenLayer/node_all/lbl_teshushuxing` | UILabelTTF | [164.0, 358.02] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「特殊屬性」18 CloudYuanCuGBK.ttf rgb[253, 229, 190] |
| `/HeroInfoAwakenLayer/node_all/scroll_view_1` | UIScrollViewBackpack | [-160.0, 340.0] | [0.5, 1] | [290, 225] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroInfoAwakenLayer/node_all/scroll_view_2` | UIScrollViewBackpack | [161.0, 340.0] | [0.5, 1] | [290, 225] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroInfoAwakenLayer/node_all/CCMenu_1` | CCMenu | [0.0, 45.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAwakenLayer/node_all/CCMenu_1/btn_enter` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确定」44 [255, 255, 255, 255] |
| `/HeroInfoAwakenLayer/node_all/CCMenu_1/btn_info` | UIMenuItemImage | [275.0, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroInfoAwakenLayer/node_all/node_cost` | CCNode | [-283.0, 49.0] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/HeroInfoAwakenLayer/node_all/node_cost/CCSprite_1` | CCSprite | [61.0, 1.0] | [0.5, 0.5] | [122, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_k.png` f55134e3-ae76-4395-9051-a90f32c28ebe |
| `/HeroInfoAwakenLayer/node_all/node_cost/spr_icon` | CCSprite | [8.0, 2.0] | [0.5, 0.5] | [100, 100] | [0.45, 0.45] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900301.png` ceb3408e-0543-4098-9b5b-4abf93a1c9cd |
| `/HeroInfoAwakenLayer/node_all/node_cost/lbl_num` | UILabelTTF | [60.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroInfoAwakenLayer/node_all/lbl_free` | UILabelTTF | [-225.106, 50.736] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「免费」60 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## HeroInfoGodEquipLayer（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoGodEquipLayer` | HeroInfoGodEquipLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all` | CCNode | [320.0, 129.6] | [0.5, 0] | [640, 390] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/CCSprite_1` | CCSprite | [0.0, 195.0] | [0.5, 0.5] | [582, 302] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr_bg.png` b9923116-fc57-48a2-a60d-bad19208fca8 |
| `/HeroInfoGodEquipLayer/node_all/image_rate_1` | CCNode | [0.0, 195.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/image_rate_1/image_rate_image_1` | CCSprite | [0, 0] | [0.5, 0.5] | [170, 170] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-rare-5-1.png` 1a4957fb-a104-4a15-b18f-d353a21d4cd7 |
| `/HeroInfoGodEquipLayer/node_all/image_rate_1/image_rate_image_2` | CCSprite | [0, 0] | [0.5, 0.5] | [170, 170] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-rare-5-2.png` e586e3b5-1df9-479a-b953-3a5e21ec65d4 |
| `/HeroInfoGodEquipLayer/node_all/image_rate_1/image_rate_image_3` | CCSprite | [0, 0] | [0.5, 0.5] | [170, 170] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-rare-5-3.png` ad2948c1-8865-409d-938c-4de48835ad5b |
| `/HeroInfoGodEquipLayer/node_all/image_rate_1/image_rate_image_4` | CCSprite | [0, 0] | [0.5, 0.5] | [170, 170] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-rare-5-4.png` c92d81fa-f798-49c2-82af-e1c7de309e9b |
| `/HeroInfoGodEquipLayer/node_all/CCMenu_1` | CCMenu | [-320.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/CCMenu_1/btn_enter` | UIMenuItemLabel | [567.8, 85] | [0.5, 0.5] | [77, 75] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/lang-1_spr-szgl.png` 7e5f7c73-b22f-45da-a6c8-ea4279d09430 · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoGodEquipLayer/node_all/CCMenu_1/btn_info` | UIMenuItemImage | [578, 314] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroInfoGodEquipLayer/node_all/CCMenu_1/btn_promotion` | UIMenuItemImage | [70, 307] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal **缺图** god-equip/spr-sztqicon.png |
| `/HeroInfoGodEquipLayer/node_all/equip_item_1` | CCNode | [-150.0, 284] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_1/equip_item_menu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_1/equip_item_star_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_2` | CCNode | [-150.0, 121] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_2/equip_item_menu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_2/equip_item_star_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_3` | CCNode | [140.0, 284] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_3/equip_item_menu_3` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_3/equip_item_star_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_4` | CCNode | [140.0, 121] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_4/equip_item_menu_4` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/node_all/equip_item_4/equip_item_star_4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/rich_1` | CCNode | [57.6, 144.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/rich_2` | CCNode | [160.0, 144.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/rich_3` | CCNode | [262.4, 144.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoGodEquipLayer/rich_4` | CCNode | [499.0, 144.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroInfoLayer（43）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoLayer` | HeroInfoLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-role-1.jpg` 4e49da4f-d5e5-4340-b7ce-22256ee81e7c |
| `/HeroInfoLayer/node_name` | CCNode | [320.0, 807.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_name/spr_name_bg` | CCSprite | [0, -1.0] | [0.5, 0.5] | [282, 87] | [1, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-name-bg-1.png` 31834a17-4e93-4fac-8dd6-74cff10c6fbd |
| `/HeroInfoLayer/node_name/icon_elem` | CCSprite | [-50, 20] | [0.5, 0.5] | [74, 74] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-42.png` f0b1a70e-70a0-4cf9-886d-5ab63d86985e |
| `/HeroInfoLayer/node_name/lbl_hero_name` | UILabelTTF | [2, 21] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroInfoLayer/node_name/node_star` | CCNode | [0, -20] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_equip` | CCNode | [320.0, 674.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_equip/spr_circle` | CCSprite | [0, 0] | [0.5, 0.5] | [520, 520] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle.png` c70f3f6e-fde3-4924-9821-0db68071497e |
| `/HeroInfoLayer/node_equip/CCSprite_1` | CCSprite | [0, -150] | [0.5, 0.5] | [365, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-magic.png` b32adef7-1063-48bd-88d2-a2c35402bb47 |
| `/HeroInfoLayer/node_equip/menu_hero` | UIMenu | [0, -15] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_equip/menu_equip` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_equip/menu_equip/btn_equip_1` | UIMenuItemImage | [-248, 170] | [0.5, 0.5] | [106, 106] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_equip_3` | UIMenuItemImage | [248, 170] | [0.5, 0.5] | [106, 106] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_equip_4` | UIMenuItemImage | [-248, 60] | [0.5, 0.5] | [106, 106] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_equip_2` | UIMenuItemImage | [248, 60] | [0.5, 0.5] | [106, 106] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-equip-bg-1.png` 15607bc9-086d-4f27-a41d-0dff7d898922 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_runes_1` | UIMenuItemImage | [-248, -50] | [0.5, 0.5] | [108, 118] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-runes.png` d686a6cf-8a52-47fb-914d-95c94cdfae81 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_runes_2` | UIMenuItemImage | [248, -50] | [0.5, 0.5] | [108, 118] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-runes.png` d686a6cf-8a52-47fb-914d-95c94cdfae81 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_artifact_2` | UIMenuItemImage | [248, -160] | [0.5, 0.5] | [126, 126] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/HeroInfoLayer/node_equip/menu_equip/btn_artifact_1` | UIMenuItemImage | [-248, -160] | [0.5, 0.5] | [126, 126] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/HeroInfoLayer/node_equip/menu_pet` | UIMenu | [100, 100] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_equip/menu_totem` | UIMenu | [-114, 160] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/bat_node` | CCNode | [320.0, 526.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/bat_node/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/HeroInfoLayer/bat_node/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/HeroInfoLayer/node_panel` | CCNode | [320.0, 91.2] | [0, 0] | [320, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_panel/spr_pannel_bg` | CCScale9Sprite | [0, 0] | [0.5, 0] | [640, 390] | [1.0004, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-7.png` 9e279cb8-a44a-48b9-9a67-34c7fd9ec97b |
| `/HeroInfoLayer/node_panel/scroll_view_tab` | CCScrollView | [0, 381] | [0.5, 0] | [550, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/HeroInfoLayer/node_btn` | CCNode | [320.0, 480.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_btn/menu_btn` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_btn/menu_btn/btn_left` | UIMenuItemImage | [-290, -55] | [0.5, 0.5] | [40, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-left.png` f2ced75b-1ad6-4ac1-ae86-7213d9b14540 |
| `/HeroInfoLayer/node_btn/menu_btn/btn_right` | UIMenuItemImage | [290, -55] | [0.5, 0.5] | [40, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-left.png` f2ced75b-1ad6-4ac1-ae86-7213d9b14540 |
| `/HeroInfoLayer/node_btn/menu_btn/btn_wear` | UIMenuItemLabel | [0, -55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoLayer/node_btn/menu_btn/btn_disboard` | UIMenuItemLabel | [0, -55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoLayer/node_btn/menu_btn/btn_evolution` | UIMenuItemLabel | [0, 5] | [0.5, 0.5] | [150, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-blue-8.png` b38e7576-89a7-40aa-8dd1-57e032fdf8d5 · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoLayer/node_btn/menu_btn/btn_setting` | UIMenuItemLabel | [-115, -55] | [0.5, 0.5] | [52, 52] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-shezhi.png` 26ccc317-3977-4641-87aa-973412328c0c · Label「」44 [255, 255, 255, 255] |
| `/HeroInfoLayer/node_btn/menu_btn/btn_unfold` | UIMenuItemLabel | [115, -55] | [0.5, 0.5] | [52, 52] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-zhankai.png` 4d2f87da-5065-41a2-8eae-f5da6232e6d1 · Label「」44 [255, 255, 255, 255] |
| `/HeroInfoLayer/node_btn/menu_btn/btn_only_show` | UIMenuItemLabel | [115, -55] | [0.5, 0.5] | [54, 54] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-2_btn_reset.png` bf1172ae-91bf-45fc-ac5c-615994a5d7d0 · Label「」44 [255, 255, 255, 255] |
| `/HeroInfoLayer/menu_back` | CCMenu | [570.0, 835.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/menu_back/btn_back` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/HeroInfoLayer/node_evolve` | CCNode | [320.0, 859.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoLayer/node_evolve/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [194, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_spr-tag-evolution.png` 13ea8715-86b5-41e3-ab45-1e561648cd9a |
| `/HeroInfoLayer/node_evolve/lbl_evolution_lv` | UILabelTTF | [32.0, -4] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+1」44 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## HeroInfoTalentLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoTalentLayer` | HeroInfoTalentLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTalentLayer/node_all` | CCNode | [0.0, 112.5] | [0, 0] | [640.0, 390] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTalentLayer/node_all/CCSprite_1` | CCSprite | [318.945, 243.861] | [0.5, 0.5] | [564, 224] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/talent_spr-k.png` f0fac33d-7853-4b0b-883d-4e981af6da14 |
| `/HeroInfoTalentLayer/node_all/CCNode_1` | CCNode | [319.0, 244.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTalentLayer/node_all/CCNode_1/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTalentLayer/node_all/CCNode_1/UIMenu_1/btn_info` | UIMenuItemImage | [251, 80] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroInfoTalentLayer/node_all/CCNode_1/UIMenu_1/btn_skill_1` | UIMenuItemImage | [-125, 2] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-bg-11.png` 617991eb-0390-4f73-aea0-efa907c00768 |
| `/HeroInfoTalentLayer/node_all/CCNode_1/UIMenu_1/btn_skill_2` | UIMenuItemImage | [127, 2] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-bg-11.png` 617991eb-0390-4f73-aea0-efa907c00768 |
| `/HeroInfoTalentLayer/node_all/CCNode_1/UIMenu_1/btn_skill_preview` | UIMenuItemLabel | [-129.333, -169.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「技能预览」44 [255, 255, 255, 255] |
| `/HeroInfoTalentLayer/node_all/CCNode_1/UIMenu_1/btn_skill_shop` | UIMenuItemLabel | [129.0, -169] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「技能商店」44 [255, 255, 255, 255] |
| `/HeroInfoTalentLayer/node_all/CCNode_1/node_skill_1` | CCNode | [-123, -77] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTalentLayer/node_all/CCNode_1/node_skill_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [144, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-12.png` 7f8ea80c-39c0-4121-89bf-67b32480f701 |
| `/HeroInfoTalentLayer/node_all/CCNode_1/node_skill_1/lbl_skill_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」36 STZhongsong.ttf rgb[253, 229, 190] |
| `/HeroInfoTalentLayer/node_all/CCNode_1/node_skill_2` | CCNode | [123, -77] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTalentLayer/node_all/CCNode_1/node_skill_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [144, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-12.png` 7f8ea80c-39c0-4121-89bf-67b32480f701 |
| `/HeroInfoTalentLayer/node_all/CCNode_1/node_skill_2/lbl_skill_2` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」36 STZhongsong.ttf rgb[253, 229, 190] |

## HeroInfoTipsLayer（30）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoTipsLayer` | HeroInfoTipsLayer | [0, 0] | [0, 0] | [498, 350] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTipsLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [498, 360] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/HeroInfoTipsLayer/menu` | CCMenu | [-10, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTipsLayer/menu/btn_close` | UIMenuItemImage | [457, 330] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroInfoTipsLayer/CCScale9Sprite_2` | CCScale9Sprite | [249.0, 93.0] | [0.5, 0] | [325, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_cell-bg-4.png` 5d3d2388-66de-47ec-b7c4-82b0247dbad8 |
| `/HeroInfoTipsLayer/lbl_name` | UILabelTTF | [248, 310] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄名英雄名」22 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoTipsLayer/CCNode_1` | CCNode | [57, 15] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTipsLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [207, 240] | [0.5, 0.5] | [180, 40] | [0.75, 0.75] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-battle.png` 1e61e330-0437-43a3-a5c5-2884c38b6be6 insets[1, 1, 1, 1] |
| `/HeroInfoTipsLayer/CCNode_1/CCSprite_1` | CCSprite | [204, 254] | [0.5, 0.5] | [42, 42] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/HeroInfoTipsLayer/CCNode_1/CCSprite_2` | CCSprite | [203, 255] | [0.5, 0.5] | [30, 32] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_icon-battle.png` e4939337-5856-49fb-a87d-b47f232b1f0e |
| `/HeroInfoTipsLayer/CCNode_1/lbl_bat` | UILabelTTF | [229, 256] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「123456789」20 STZhongsong.ttf rgb[229, 210, 191] |
| `/HeroInfoTipsLayer/lbl_stage` | UILabelTTF | [124, 219] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「品阶:」18 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoTipsLayer/UILabelTTF_1` | UILabelTTF | [124, 189] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「职业:」18 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoTipsLayer/lbl_profession` | UILabelTTF | [174, 189] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「职业:」18 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoTipsLayer/CCNode_2` | CCNode | [15, -42] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoTipsLayer/CCNode_2/sp_grade1` | CCSprite | [171, 258] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoTipsLayer/CCNode_2/sp_grade2` | CCSprite | [201, 258] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoTipsLayer/CCNode_2/sp_grade3` | CCSprite | [230, 258] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoTipsLayer/CCNode_2/sp_grade4` | CCSprite | [258, 258] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoTipsLayer/CCNode_2/sp_grade5` | CCSprite | [287, 258] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoTipsLayer/CCNode_2/sp_grade6` | CCSprite | [317, 258] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoTipsLayer/UILabelTTF_2` | UILabelTTF | [124, 148] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/UILabelTTF_3` | UILabelTTF | [280, 148] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/UILabelTTF_4` | UILabelTTF | [124, 120] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/UILabelTTF_5` | UILabelTTF | [280, 120] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/lbl_attack` | UILabelTTF | [180, 148] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/lbl_hp` | UILabelTTF | [335, 148] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/lbl_defense` | UILabelTTF | [180, 120] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/lbl_speed` | UILabelTTF | [335, 120] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[98, 59, 19] |
| `/HeroInfoTipsLayer/node_hero` | CCNode | [178, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroInfoUpLevelLayer（40）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoUpLevelLayer` | HeroInfoUpLevelLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpLevelLayer/node_all` | CCNode | [318.0, 150.0] | [0, 0] | [640.0, 390.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_1` | CCSprite | [0.0, 86.0] | [0.5, 0.5] | [480, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-8.png` 7ca842a7-aafa-4322-91bc-113a22564392 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2` | CCSprite | [-290.0, 317.0] | [0, 0.5] | [409, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-10.png` 4d27c4b1-0aa2-4b49-9547-a978a9718c40 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/UILabelTTF_1` | UILabelTTF | [30, 0.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「进阶：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/sp_grade1` | CCSprite | [160, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/sp_grade2` | CCSprite | [190, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/sp_grade3` | CCSprite | [220, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/sp_grade4` | CCSprite | [250, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/sp_grade5` | CCSprite | [280, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/sp_grade6` | CCSprite | [310, 0.0] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_2/lbl_cube_tips` | UILabelTTF | [480, -69.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「进阶：」18 FZCSJW--GB1-0.ttf rgb[78, 254, 248] |
| `/HeroInfoUpLevelLayer/node_all/node_need` | CCNode | [-290.0, 274.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpLevelLayer/node_all/node_need/CCSprite_1` | CCSprite | [0, 0] | [0, 0.5] | [409, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-10.png` 4d27c4b1-0aa2-4b49-9547-a978a9718c40 |
| `/HeroInfoUpLevelLayer/node_all/node_need/UILabelTTF_1` | UILabelTTF | [30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「升级：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/node_need/CCSprite_2` | CCSprite | [205, 0] | [0.5, 0.5] | [100, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/HeroInfoUpLevelLayer/node_all/node_need/spr_gold_need` | CCSprite | [160, 0] | [0.5, 0.5] | [38, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-1.png` a16f05a7-99da-4b8d-a908-9ca7c6adade8 |
| `/HeroInfoUpLevelLayer/node_all/node_need/lbl_gold_need` | UILabelTTF | [210, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」21 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroInfoUpLevelLayer/node_all/node_need/CCSprite_3` | CCSprite | [335, 0] | [0.5, 0.5] | [100, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/HeroInfoUpLevelLayer/node_all/node_need/spr_exp_need` | CCSprite | [285, 0] | [0.5, 0.5] | [38, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-1.png` a16f05a7-99da-4b8d-a908-9ca7c6adade8 |
| `/HeroInfoUpLevelLayer/node_all/node_need/lbl_exp_need` | UILabelTTF | [340, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」21 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HeroInfoUpLevelLayer/node_all/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpLevelLayer/node_all/CCMenu_1/btn_up_level` | UIMenuItemLabel | [210, 290] | [0.5, 0.5] | [197, 60] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「升 级」48 [255, 255, 255, 255] |
| `/HeroInfoUpLevelLayer/node_all/CCMenu_1/btn_up_grade` | UIMenuItemLabel | [211, 290] | [0.5, 0.5] | [197, 60] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「升 阶」48 [255, 255, 255, 255] |
| `/HeroInfoUpLevelLayer/node_all/CCMenu_1/btn_attr_detail` | UIMenuItemImage | [-235, 215] | [0.5, 0.5] | [64, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-lang_lbl-attr.png` eb02a67b-9ccc-47de-9fa3-f5b1f66dd15d |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_3` | CCSprite | [-195.0, 213.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_3/lbl_attack` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_4` | CCSprite | [28.0, 213.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_4/lbl_hp` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_5` | CCSprite | [-195.0, 163.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-11.png` 3e9c096f-512b-4bdd-887d-c42d64a2cc02 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_5/lbl_defense` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_6` | CCSprite | [28.0, 163.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-4.png` 13ff4181-e422-4d01-8b8b-a69de849e668 |
| `/HeroInfoUpLevelLayer/node_all/CCSprite_6/lbl_speed` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/lbl_level_title` | UILabelTTF | [-255.0, 355.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级:」22 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HeroInfoUpLevelLayer/node_all/lbl_level` | UILabelTTF | [-200.0, 355.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/30」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroInfoUpLevelLayer/node_all/lbl_profession` | UILabelTTF | [168.0, 355.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「职业: 未知」22 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HeroInfoUpLevelLayer/node_all/lbl_max_tips` | UILabelTTF | [0.0, 270.0] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「已达最大等级」20 FZCSJW--GB1-0.ttf rgb[117, 75, 23] |
| `/HeroInfoUpLevelLayer/node_all/icon_occupat` | CCSprite | [158.0, 355.0] | [1, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_icon-occup-3.png` 810701a4-26ea-45c9-b659-23eaf96711f3 |
| `/HeroInfoUpLevelLayer/node_all/skill_menu` | UIMenu | [0.0, 86.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpLevelLayer/node_all/node_nil_skill` | CCNode | [0.0, 86.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroInfoUpStarLayer（44）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoUpStarLayer` | HeroInfoUpStarLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1` | CCNode | [320.0, 112.5] | [0, 0] | [640, 390] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_star` | CCNode | [0, 346] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_star/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [608, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-star-bg-1.png` d7e9df59-c41b-482c-81bf-d78106f0fb90 |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_star/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_star/node_cur_star` | CCNode | [-50, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_star/node_next_star` | CCNode | [50, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_level` | CCNode | [-265, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_level/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级上限：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_level/lbl_now_max_level` | UILabelTTF | [120, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「200」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_level/CCSprite_1` | CCSprite | [160, 0] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_level/lbl_now_next_level` | UILabelTTF | [200, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「300」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_attack` | CCNode | [10, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_attack/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻/血提升：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_attack/lbl_upgrade_attack` | UILabelTTF | [110, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「50%/40%」22 STZhongsong.ttf rgb[32, 166, 0] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_speed` | CCNode | [-265, 270] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_speed/lbl_upgrade_speed` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度提升10」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill_all` | CCNode | [10, 270] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill_all/lbl_upgrade_skill_all_title` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「所有技能：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill_all/lbl_upgrade_skill_all_1` | UILabelTTF | [120, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1级」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill_all/CCSprite_1` | CCSprite | [160, 0] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill_all/lbl_upgrade_skill_all_2` | UILabelTTF | [200, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2级」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill` | CCNode | [0, 280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/spr_skill_icon_1` | CCSprite | [-70, 0] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101050093.png` d44cd8ac-1354-4f09-bb75-7a8e8e40c271 |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/CCSprite_2` | CCSprite | [-90, 20] | [0.5, 0.5] | [20, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-level-bg.png` b25b07eb-5375-4cc2-baf1-a79bdb848e4b |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/spr_skill_icon_2` | CCSprite | [76, 0] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101050085.png` 177faf69-9914-44f7-8caa-a92128c4ddb9 |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/CCSprite_3` | CCSprite | [55, 20] | [0.5, 0.5] | [20, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-level-bg.png` b25b07eb-5375-4cc2-baf1-a79bdb848e4b |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/lbl_skill_level_1` | UILabelTTF | [-90, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」36 STZhongsong.ttf rgb[0, 0, 0] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/lbl_skill_level_2` | UILabelTTF | [55, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2」36 STZhongsong.ttf rgb[0, 0, 0] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/CCMenu_1/btn_skill_1` | CCMenuItemImage | [-66, 1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_skill/CCMenu_1/btn_skill_2` | CCMenuItemImage | [76, 2] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip` | CCNode | [0, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-6.png` e27f2163-8709-4db1-b9d3-512b7e2b1f16 |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/lbl_tips` | UILabelTTF | [0, -20] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「返还素材升级、升阶所消耗的所有资源」18 STZhongsong.ttf rgb[231, 117, 42] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/lbl_jump` | UILabelTTF | [195, 105] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「前往创造法阵」18 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/node_need` | CCNode | [205, 105] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/node_need/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [100, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/node_need/spr_gold_need` | CCSprite | [-55, 0] | [0.5, 0.5] | [38, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-1.png` a16f05a7-99da-4b8d-a908-9ca7c6adade8 |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/node_need/lbl_gold_need` | UILabelTTF | [-35, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/menu/btn_up_star` | UIMenuItemLabel | [195, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 pressed `ui/common/button_btn-green-big-2.png` ec004cfa-d9af-4381-917b-c66af7c13a33 · Label「升 星」48 [255, 255, 255, 255] |
| `/HeroInfoUpStarLayer/CCNode_1/node_upgrade_tip/scroll_view` | UIScrollViewBackpack | [-265, -5] | [0, 0] | [390, 140] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## HeroInfoUpStoneAttrCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoUpStoneAttrCell` | HeroInfoUpStoneAttrCell | [0, 0] | [0, 0] | [294, 100] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneAttrCell/CCSprite_1` | CCSprite | [35, 78] | [0.5, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-5.png` f5a7d38d-147f-418b-be8a-2fcae4900f9c |
| `/HeroInfoUpStoneAttrCell/show_rich` | CCNode | [64, 86] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneAttrCell/show_item_image` | CCSprite | [35, 78] | [0.5, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-5.png` f5a7d38d-147f-418b-be8a-2fcae4900f9c |

## HeroInfoUpStoneLayer（38）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoUpStoneLayer` | HeroInfoUpStoneLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all` | CCNode | [320.0, 112.5] | [0.5, 0] | [640, 390] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel` | CCNode | [-140.8, 192.873] | [0.5, 0.5] | [370, 400] | [0.8, 0.8] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1` | CCNode | [-6.0, 201.0] | [0.5, 1] | [370, 347] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCSprite_1` | CCSprite | [0.0, -173.5] | [0.5, 0.5] | [370, 347] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg.png` b27cb1eb-d0a3-471d-a82c-4a65cb458e49 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/wai_yuan` | CCSprite | [0.0, -173.5] | [0.5, 0.5] | [280, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_jdt1.png` 2273c6fd-35ee-421d-9b22-e6c631d03127 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/ori_image` | CCSprite | [0.0, -173.5] | [0.5, 0.5] | [174, 179] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-2.png` 5e5a5b3d-2a6a-48a8-a4de-fa4386566a17 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/waiyuan2` | CCSprite | [0.0, -172] | [0.5, 0.5] | [280, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-jdt2-2.png` 8614051c-ba2c-4c67-90e8-322e20da8085 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/waiyuan2/play_effect_2` | CCNode | [71.2, -46.2] | [0, 0] | [0, 0] | [1.2, 1.2] | -240 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/waiyuan1` | CCSprite | [0.0, -172] | [0.5, 0.5] | [280, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-jdt2-1.png` 2d6b64ba-2c47-482f-9607-c52b3b90bd74 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/waiyuan1/play_effect_1` | CCNode | [-72.5, -38.8] | [0, 0] | [0, 0] | [1.2, 1.2] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/waiyuan3` | CCSprite | [0.5, -173] | [0.5, 0.5] | [280, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-jdt2-3.png` 1baaf285-a4f8-4ea4-9795-10376087e6bc |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/waiyuan3/play_effect_3` | CCNode | [3.8, 85.0] | [0, 0] | [0, 0] | [1.2, 1.2] | -120 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_1` | CCNode | [0.0, -43.0] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_1/image-yuan-3` | CCSprite | [0.0, -129.6] | [0.5, 0.5] | [180, 180] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-image-3.png` 7a28f9d8-0a57-43e5-902e-043bee0cd625 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_1/menu_add_gem_1` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_1/menu_add_gem_1/btn_add_3` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [149, 150] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-6.png` bba72383-1cbf-4f11-9939-210bad180fea |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_1/item_image_3` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-5.png` f5a7d38d-147f-418b-be8a-2fcae4900f9c |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_1/spr_star_node_3` | CCNode | [0.0, -46.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_2` | CCNode | [-105.0, -267.0] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_2/image-yuan-1` | CCSprite | [105.0, 94.4] | [0.5, 0.5] | [180, 180] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-image-1.png` f6126af0-b3fb-449d-b512-8f16ea37de48 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_2/menu_add_gem_2` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_2/menu_add_gem_2/btn_add_1` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [149, 150] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-6.png` bba72383-1cbf-4f11-9939-210bad180fea |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_2/item_image_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [39, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_btn-add-2.png` a7ee8667-860f-40cb-925c-e79aa6d7df53 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_2/spr_star_node_1` | CCNode | [0.0, -46.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_3` | CCNode | [105.08, -266.843] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_3/image-yuan-2` | CCSprite | [-105.0, 94.4] | [0.5, 0.5] | [180, 180] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-image-2.png` 4c4c5951-8b03-4960-b6d8-e4fb6550a6f2 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_3/menu_add_gem_3` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_3/menu_add_gem_3/btn_add_2` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [149, 150] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-6.png` bba72383-1cbf-4f11-9939-210bad180fea |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_3/item_image_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [39, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_btn-add-2.png` a7ee8667-860f-40cb-925c-e79aa6d7df53 |
| `/HeroInfoUpStoneLayer/node_all/node_gem_panel/CCNode_1/CCNode_3/spr_star_node_2` | CCNode | [0.0, -46.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/CCNode_1` | CCNode | [-320.0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/CCNode_1/attr_list` | CCSprite | [324, 74] | [0, 0] | [294, 303] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-4.png` 59ffcffd-17e5-4ca6-aca9-a01c89352526 |
| `/HeroInfoUpStoneLayer/node_all/show_rich_tao` | CCNode | [-294.75, 52.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/CCMenu_1` | CCMenu | [-320.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpStoneLayer/node_all/CCMenu_1/btn_enter` | UIMenuItemLabel | [475.8, 42] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoUpStoneLayer/node_all/CCMenu_1/btn_info` | UIMenuItemImage | [33, 345] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroInfoUpStoneLayer/node_all/CCMenu_1/btn_go` | UIMenuItemImage | [273, 353] | [0.5, 0.5] | [81, 24] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes-lang_btn-src.png` 6da39fa4-4f60-4707-a4ac-875d6e6ab4ae |

## HeroInfoUpgradeLayer（62）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroInfoUpgradeLayer` | HeroInfoUpgradeLayer | [0, 0] | [0, 0] | [562, 702] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 706] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[22, 22, 22, 22] |
| `/HeroInfoUpgradeLayer/spr_circle` | CCSprite | [281, 522.2] | [0.5, 0.5] | [290, 290] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle-1.png` f5ab1bb3-0592-49f5-bca7-b13bfac7efe9 |
| `/HeroInfoUpgradeLayer/CCSprite_1` | CCSprite | [281, 460] | [0.5, 0.5] | [70, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-1.png` 6a81331a-054d-46d4-b4c9-b425097b6eea |
| `/HeroInfoUpgradeLayer/node_need` | CCNode | [300, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/node_need/CCScale9Sprite_1` | CCScale9Sprite | [-190, -12] | [0.5, 0.5] | [150, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/HeroInfoUpgradeLayer/node_need/lbl_gold_need` | UILabelTTF | [-170, -1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/node_need/spr_gold_need` | CCSprite | [-200, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/HeroInfoUpgradeLayer/node_need/CCScale9Sprite_2` | CCScale9Sprite | [24, -12] | [0.5, 0.5] | [150, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/HeroInfoUpgradeLayer/node_need/spr_soul_need` | CCSprite | [20, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900102.png` 0aa99264-c493-4fba-b1c2-ea9e623dd56e |
| `/HeroInfoUpgradeLayer/node_need/lbl_soul_need` | UILabelTTF | [50, -1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/menu/btn_up_grade` | UIMenuItemLabel | [281, 64] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoUpgradeLayer/menu/btn_get` | UIMenuItemLabel | [500, 120] | [0.5, 0.5] | [50, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-up-success-lang_btn-get.png` 6ea982de-0959-4f1c-a4c3-99bbdc3dd47d · Label「」24 [255, 255, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1` | CCNode | [-50, -45] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCSprite_1` | CCSprite | [331, 450] | [0.5, 0.5] | [440, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_title-img.png` 2d5b1d22-1f33-4652-b066-841be9978c4c |
| `/HeroInfoUpgradeLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [331, 452] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「属性提升」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_1` | CCNode | [281, 370] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_1/lbl_attr_1` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_1/lbl_pre_1` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 254] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_1/lbl_cur_1` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_1/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_2` | CCNode | [281, 330] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_2/lbl_attr_2` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命值：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_2/lbl_pre_2` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_2/lbl_cur_2` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_2/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_3` | CCNode | [281, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_3/lbl_attr_3` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_3/lbl_pre_3` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_3/lbl_cur_3` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_3/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_4` | CCNode | [281, 250] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_4/lbl_attr_4` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_4/lbl_pre_4` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_4/lbl_cur_4` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_4/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5` | CCNode | [281, 410] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5/lbl_level` | UILabelTTF | [-180, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级上限」20 STZhongsong.ttf rgb[247, 98, 37] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5/lbl_pre_level` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5/lbl_cur_level` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」24 STZhongsong.ttf rgb[250, 193, 37] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [60, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-level.png` be6f4057-0edc-4e63-a313-e38efc0d3c76 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_5/spr_up` | CCSprite | [237, 4] | [0.5, 0.5] | [164, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success-lang_title.png` 4a09d4f1-9dec-454c-bf2c-07a58e4c90ce |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_6` | CCNode | [281, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_6/lbl_attr_5` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_6/lbl_pre_5` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 254] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_6/lbl_cur_5` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroInfoUpgradeLayer/CCNode_1/CCNode_6/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/HeroInfoUpgradeLayer/node_pre_star` | CCNode | [225, 460] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/node_cur_star` | CCNode | [332, 460] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/skill_node` | CCNode | [469, 304] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/skill_node/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [148, 156] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-skill-bg.png` e1e05031-4bad-440e-8af0-acab610fc796 |
| `/HeroInfoUpgradeLayer/skill_node/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [148, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-skill-bg1.png` e3656a59-0317-4178-af78-1b4ff2a35858 |
| `/HeroInfoUpgradeLayer/skill_node/skill_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroInfoUpgradeLayer/skill_node/UILabelTTF_1` | UILabelTTF | [0, 65] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「解锁技能」20 STZhongsong.ttf rgb[106, 58, 47] |
| `/HeroInfoUpgradeLayer/skill_node/lbl_skill_name` | UILabelTTF | [0, -54] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名称」18 STZhongsong.ttf rgb[85, 30, 20] |

## HeroListDragonLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroListDragonLayer` | HeroListDragonLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonLayer/node_all` | CCNode | [320.0, 669.12] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonLayer/node_all/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [560.0, 543.36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_block-bg.png` 83c422dd-2bd6-4788-9cdc-957674c5de41 insets[10, 10, 10, 10] |
| `/HeroListDragonLayer/node_all/node_pannel` | CCNode | [0.0, -385.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonLayer/node_all/node_pannel/CCSprite_1` | CCSprite | [0, 0] | [0.5, 1] | [550, 330] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-pannel-bg.png` 04f75eb9-8108-4524-8958-1dbfe9eea14f |
| `/HeroListDragonLayer/node_all/CCMenu_1` | CCMenu | [0.0, -385.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonLayer/node_all/CCMenu_1/btn_tab_1` | UIMenuItemTab | [-210, -2] | [0.5, 0] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「鉴定」48 [122, 71, 45, 255] |
| `/HeroListDragonLayer/node_all/CCMenu_1/btn_tab_2` | UIMenuItemTab | [-90, -2] | [0.5, 0] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「圣龙」48 [122, 71, 45, 255] |

## HeroListDragonRoomLayer（37）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroListDragonRoomLayer` | HeroListDragonRoomLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all` | CCNode | [320.0, 669.12] | [0.5, 1] | [560.0, 543.36] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room` | CCNode | [0.0, -24.36] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room/node_privilege` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room/spr_room_bg` | CCSprite | [0, 0] | [0.5, 1] | [550, 300] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-bg-1.png` 658bb36a-42e0-487b-914b-b194ce61ecaf |
| `/HeroListDragonRoomLayer/node_all/node_room/menu_room` | UIMenu | [0, -180] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room/CCNode_1` | CCNode | [0, -30] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [274, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-name-bg.png` 9cdb28dc-b373-434a-8a03-f33db9fd9aeb |
| `/HeroListDragonRoomLayer/node_all/node_room/CCNode_1/spr_room_name` | CCSprite | [0, 0] | [0.5, 0.5] | [92, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon-lang/dragon-lang_spr-name-1.png` e2723d55-73d6-4c14-a20b-54e356c0acb2 |
| `/HeroListDragonRoomLayer/node_all/node_room/CCNode_2` | CCNode | [0, -280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [299, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-point-bg.png` 2061fa5f-077f-4543-bca7-82e84e2282ab |
| `/HeroListDragonRoomLayer/node_all/node_room/CCNode_2/lbl_point` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「111/111」40 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/HeroListDragonRoomLayer/node_all/node_room/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_room/CCMenu_1/btn_info` | UIMenuItemImage | [250, -28] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroListDragonRoomLayer/node_all/node_room/CCMenu_1/btn_illustration` | UIMenuItemLabel | [235, -255] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dragon/dragon_btn-illustration.png` 5058879f-c02a-4696-93c1-34f5b7f3b839 · Label「圣物图鉴」36 [255, 255, 255, 255] |
| `/HeroListDragonRoomLayer/node_all/node_room/CCMenu_1/btn_privilege` | UIMenuItemImage | [110, 23] | [1, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroListDragonRoomLayer/node_all/node_identify` | CCNode | [0.0, -539.61] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroListDragonRoomLayer/node_all/node_identify/node_identify_info` | CCNode | [0, 250] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_identify/node_identify_info/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [500, 50] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_block-1.png` 75965438-ee88-4025-9a4a-1e08d5fa1b88 insets[10, 10, 10, 10] |
| `/HeroListDragonRoomLayer/node_all/node_identify/node_progress` | CCNode | [0, 150] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_identify/node_progress/spr_progress_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [406, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_progress-bg.png` c43c79e0-30f2-4560-972f-02f1673f58a4 |
| `/HeroListDragonRoomLayer/node_all/node_identify/CCMenu_1` | CCMenu | [0, 53] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_identify/CCMenu_1/btn_uplevel` | UIMenuItemLabel | [-150, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「升 级」44 [255, 255, 255, 255] |
| `/HeroListDragonRoomLayer/node_all/node_identify/CCMenu_1/btn_speed_enter` | UIMenuItemLabel | [150, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「加速鉴定」44 [255, 255, 255, 255] |
| `/HeroListDragonRoomLayer/node_all/node_speedup` | CCNode | [0.0, -539.61] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_speedup/node_left_point` | CCNode | [-270, 310] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_speedup/node_left_point/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0, 0.5] | [250, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_block-1.png` 75965438-ee88-4025-9a4a-1e08d5fa1b88 insets[10, 10, 10, 10] |
| `/HeroListDragonRoomLayer/node_all/node_speedup/menu_item` | UIMenu | [0, 235] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_speedup/node_item_info` | CCNode | [0, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_speedup/node_item_info/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [500, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_block-1.png` 75965438-ee88-4025-9a4a-1e08d5fa1b88 insets[10, 10, 10, 10] |
| `/HeroListDragonRoomLayer/node_all/node_speedup/node_item_info/lbl_identify_item_name` | UILabelTTF | [-150, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「鉴定符」40 FZCSJW--GB1-0.ttf rgb[174, 94, 45] |
| `/HeroListDragonRoomLayer/node_all/node_speedup/CCSprite_1` | CCSprite | [-40, 70] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/HeroListDragonRoomLayer/node_all/node_speedup/UILabelTTF_1` | UILabelTTF | [-15, 70] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「自动购买」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonRoomLayer/node_all/node_speedup/CCMenu_1` | CCMenu | [0, 50] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonRoomLayer/node_all/node_speedup/CCMenu_1/btn_speed_quit` | UIMenuItemLabel | [-150, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「退 出」44 [255, 255, 255, 255] |
| `/HeroListDragonRoomLayer/node_all/node_speedup/CCMenu_1/btn_speedup` | UIMenuItemLabel | [150, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「加 速」44 [255, 255, 255, 255] |
| `/HeroListDragonRoomLayer/node_all/node_speedup/CCMenu_1/btn_auto_buy` | UIMenuItemCheckBox | [-40, 20] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |

## HeroListDragonWearLayer（45）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroListDragonWearLayer` | HeroListDragonWearLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all` | CCNode | [320.0, 669.12] | [0.5, 1] | [560.0, 543.36] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_dragon` | CCNode | [0.0, -24.36] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_dragon/spr_room_bg` | CCSprite | [0, 0] | [0.5, 1] | [550, 300] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-bg-1.png` 658bb36a-42e0-487b-914b-b194ce61ecaf |
| `/HeroListDragonWearLayer/node_all/node_dragon/node_spine_dragon` | CCNode | [0, -302] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCSprite_1` | CCSprite | [-225, -150] | [0.5, 0.5] | [60, 282] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-dragon-name-bg.png` 49d00bf1-b32f-4fd1-b933-d320aaa4f507 |
| `/HeroListDragonWearLayer/node_all/node_dragon/lbl_dragon_name` | UILabelTTF | [-225, -150] | [0.5, 0.5] | [60, 400] | [0.5, 0.5] | 0 | 是 | cc.Label「神圣之龙」48 FZCSJW--GB1-0.ttf rgbNone |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCMenu_1/btn_info` | UIMenuItemImage | [250, -28] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCMenu_1/btn_hallows_1` | UIMenuItemImage | [-110, -100] | [0.5, 0.5] | [86, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dragon/dragon_spr-hallows-bg.png` 8a7e04fe-2db4-49f4-8461-db754950f1eb |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCMenu_1/btn_hallows_3` | UIMenuItemImage | [-75, -248] | [0.5, 0.5] | [86, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dragon/dragon_spr-hallows-bg.png` 8a7e04fe-2db4-49f4-8461-db754950f1eb |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCMenu_1/btn_hallows_4` | UIMenuItemImage | [140, -240] | [0.5, 0.5] | [86, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dragon/dragon_spr-hallows-bg.png` 8a7e04fe-2db4-49f4-8461-db754950f1eb |
| `/HeroListDragonWearLayer/node_all/node_dragon/CCMenu_1/btn_hallows_2` | UIMenuItemImage | [140, -100] | [0.5, 0.5] | [86, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dragon/dragon_spr-hallows-bg.png` 8a7e04fe-2db4-49f4-8461-db754950f1eb |
| `/HeroListDragonWearLayer/node_all/node_pannel` | CCNode | [0.0, -539.61] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_skill` | CCNode | [0, 275] | [0.5, 0.5] | [530, 100] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_skill/CCSprite_1` | CCSprite | [-240.0, 0.0] | [0.5, 0.5] | [32, 90] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon-lang/dragon-lang_lbl-skill-sort.png` da3f5c1a-327c-490b-8bb5-41f450fccc58 |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_skill/menu_skill` | UIMenu | [-210.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_skill/CCMenu_1` | CCMenu | [-265.0, -50.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_skill/CCMenu_1/btn_replace` | UIMenuItemLabel | [455, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「替 换」48 [255, 255, 255, 255] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr` | CCNode | [0, 150] | [0.5, 0.5] | [530, 150] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCScale9Sprite_1` | CCScale9Sprite | [-265.0, -75.0] | [0, 0] | [530, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_block-1.png` 75965438-ee88-4025-9a4a-1e08d5fa1b88 insets[20, 20, 20, 20] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_1` | CCSprite | [-215.0, 5.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_1/UILabelTTF_1` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_1/lbl_attack` | UILabelTTF | [115, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00000000」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_2` | CCSprite | [15.0, 5.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_2/UILabelTTF_1` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_2/lbl_hp` | UILabelTTF | [115, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0000」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_3` | CCSprite | [-215.0, -45.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-11.png` 3e9c096f-512b-4bdd-887d-c42d64a2cc02 |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_3/UILabelTTF_1` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_3/lbl_defense` | UILabelTTF | [115, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「000000」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_4` | CCSprite | [15.0, -45.0] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-4.png` 13ff4181-e422-4d01-8b8b-a69de849e668 |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_4/UILabelTTF_1` | UILabelTTF | [50, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/node_attr/CCSprite_4/lbl_speed` | UILabelTTF | [115, 2.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00000」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1` | CCNode | [0, 40] | [0.5, 0.5] | [530, 50] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/lbl_level_max_tip` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「圣龙已满级」44 FZCSJW--GB1-0.ttf rgb[141, 109, 58] |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_1` | CCNode | [-165.0, 0.0] | [0.5, 0.5] | [120, 40] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_1/CCSprite_1` | CCSprite | [-60.0, 0.0] | [0, 0.5] | [239, 114] | [0.6, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-17.png` aef93588-9927-4538-b634-59beaf3f2a7d |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_1/spr_res_need_1` | CCSprite | [-60.0, 0.0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_1/lbl_res_need_1` | UILabelTTF | [-40.0, 0.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999」44 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_2` | CCNode | [5.0, 0.0] | [0.5, 0.5] | [120, 40] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_2/CCSprite_1` | CCSprite | [-60.0, 0.0] | [0, 0.5] | [239, 114] | [0.6, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-17.png` aef93588-9927-4538-b634-59beaf3f2a7d |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_2/spr_res_need_2` | CCSprite | [-60.0, 0.0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/node_res_need_2/lbl_res_need_2` | UILabelTTF | [-40.0, 0.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999」44 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/CCMenu_1` | CCMenu | [-265.0, -25.0] | [0.5, 0.5] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListDragonWearLayer/node_all/node_pannel/CCNode_1/CCMenu_1/btn_levelup` | UIMenuItemLabel | [135.0, -455.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「升 级」48 [255, 255, 255, 255] |

## HeroListHeroLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroListHeroLayer` | HeroListHeroLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListHeroLayer/spr_box` | CCScale9Sprite | [320.0, 669.0] | [0.5, 1] | [580.0, 450.0] | [0.9968, 1.0054] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[80, 50, 20, 20] |
| `/HeroListHeroLayer/CCSprite_1` | CCSprite | [320.0, 145.5] | [0.5, 0.5] | [449, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_spr-pattern-bottom.png` 5ffa5057-f43e-4f77-8628-698c5a758f32 |
| `/HeroListHeroLayer/node_elem` | CCNode | [320.0, 659.25] | [0, 0] | [640.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/HeroListHeroLayer/node_elem/elem_menu` | CCMenu | [0.0, 0.0] | [0, 0] | [640.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/HeroListHeroLayer/node_elem/elem_menu/btn_elem0` | UIMenuItemImage | [-210.0, -34.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/HeroListHeroLayer/node_elem/elem_menu/btn_elem1` | UIMenuItemImage | [-126.0, -34.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroListHeroLayer/node_elem/elem_menu/btn_elem2` | UIMenuItemImage | [-42.0, -34.0] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroListHeroLayer/node_elem/elem_menu/btn_elem3` | UIMenuItemImage | [42.0, -34.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroListHeroLayer/node_elem/elem_menu/btn_elem4` | UIMenuItemImage | [126.0, -34.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroListHeroLayer/node_elem/elem_menu/btn_elem5` | UIMenuItemImage | [210.0, -34.0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroListHeroLayer/node_capacity` | CCNode | [605.0, 169.889] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListHeroLayer/node_capacity/CCSprite_1` | CCSprite | [-92, -15] | [0.5, 0.5] | [161, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-27.png` 9567e7f9-12f1-4bbc-9a0a-487c0c6ad110 |
| `/HeroListHeroLayer/node_capacity/lbl_capacity` | UILabelTTF | [-92, -17] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「空间：20/40」20 FZCSJW--GB1-0.ttf rgb[255, 230, 182] |
| `/HeroListHeroLayer/node_capacity/UIMenu_1` | UIMenu | [0, -9] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListHeroLayer/node_capacity/UIMenu_1/btn_permanent_skin` | UIMenuItemLabel | [-463, 3] | [0.5, 0.5] | [175, 75] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/permanent-skin/permanent-skin_btn-permanent-shop.png` 6ca415af-9e40-45f3-bd7c-b7edce17097b · Label「」44 [255, 255, 255, 255] |
| `/HeroListHeroLayer/bottom_menu` | CCMenu | [0.0, 129.6] | [0, 0] | [640.0, 100] | [1, 1] | 0 | 是 |  |
| `/HeroListHeroLayer/bottom_menu/btn_evolve` | UIMenuItemImage | [134.4, 50.0] | [0.5, 0.5] | [182, 69] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-lang_spr-evolve.png` 7b349315-4cb4-4654-b817-51c47b328df8 |

## HeroListItemCell（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroListItemCell` | HeroListItemCell | [0, 0] | [0, 0] | [570, 110] | [1, 1] | 0 | 是 |  |
| `/HeroListItemCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [570.0, 110.0] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/promo/promotion_spr-inviation-bg.png` 7c9610b5-efe1-4c8e-80c1-b527ddaed640 insets[10, 10, 10, 10] |
| `/HeroListItemCell/item` | CCNode | [27, 85] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HeroListLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroListLayer` | HeroListLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListLayer/spr_bg` | CCScale9Sprite | [0.0, 105.75] | [0.5, 0.5] | [640.0, 672.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroListLayer/node_title` | CCNode | [320.0, 770.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄列表」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroListLayer/UIMenu_1` | UIMenu | [0.0, 668.16] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListLayer/UIMenu_1/btn_hero` | UIMenuItemTab | [115, 0] | [0.5, 0] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「英  雄」48 [122, 71, 45, 255] |
| `/HeroListLayer/UIMenu_1/btn_illustrat` | UIMenuItemTab | [230, 0] | [0.5, 0] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「图  鉴」48 [122, 71, 45, 255] |
| `/HeroListLayer/UIMenu_1/btn_dragon` | UIMenuItemTab | [345, 0] | [0.5, 0] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「圣 龙」48 [122, 71, 45, 255] |
| `/HeroListLayer/UIMenu_2` | UIMenu | [0.0, 0.0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/HeroListLayer/UIMenu_2/btn_lineup` | UIMenuItemLabel | [567.0, 705.75] | [0.5, 0.5] | [84, 91] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-lang_spr-hero-image-1.png` 8ce0ab1b-e4a8-4df9-bfd9-e9d996ec0fca · Label「」24 [255, 255, 255, 255] |
| `/HeroListLayer/UIMenu_2/btn_astrolabe` | UIMenuItemLabel | [481.0, 705.75] | [0.5, 0.5] | [84, 91] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info-lang_btn-astrolabe.png` f9462bfb-bb65-4d44-8fec-da042b1b0cd4 · Label「」24 [255, 255, 255, 255] |
| `/HeroListLayer/node_capacity` | CCNode | [605.0, 169.889] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroListLayer/node_capacity/CCSprite_1` | CCSprite | [-92, -15] | [0.5, 0.5] | [161, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-27.png` 9567e7f9-12f1-4bbc-9a0a-487c0c6ad110 |
| `/HeroListLayer/node_capacity/lbl_capacity` | UILabelTTF | [-92, -17] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「空间：20/40」20 FZCSJW--GB1-0.ttf rgb[255, 230, 182] |
| `/HeroListLayer/node_bubble` | CCNode | [256.0, 769.92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroListLayer/node_bubble/spr_bubble_bg` | CCScale9Sprite | [0, 0] | [1, 0] | [330, 108] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_kuang.png` 983a72dd-8ad6-4489-83cc-eb82bf1e92f7 insets[30, 50, 35, 40] |
| `/HeroListLayer/node_bubble/lbl_go_under` | UILabelTTF | [280, 33] | [0.5, 0.5] | auto | [1, 0.5] | 0 | 是 | cc.Label「——」20 FZCSJW--GB1-0.ttf rgb[65, 249, 46] |
| `/HeroListLayer/node_bubble/lbl_go` | UILabelTTF | [280, 47] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「前往」20 FZCSJW--GB1-0.ttf rgb[65, 249, 46] |
| `/HeroListLayer/node_bubble/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroListLayer/node_bubble/CCMenu_1/btn_go` | UIMenuItemImage | [280, 43] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## HeroRecommendItem（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroRecommendItem` | HeroRecommendItem | [0, 0] | [0, 0] | [170, 230] | [1, 1] | 0 | 是 |  |
| `/HeroRecommendItem/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [170.0, 230.0] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/promo/promotion_spr-inviation-bg.png` 7c9610b5-efe1-4c8e-80c1-b527ddaed640 insets[10, 10, 10, 10] |
| `/HeroRecommendItem/item` | CCNode | [27, 85] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRecommendItem/CCScale9Sprite_2` | CCScale9Sprite | [5, 6] | [0.5, 0.5] | [161.5, 218.5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/shop/shop_shop-item-bg.png` 27258be6-0836-43a7-9551-b68ca5cab670 insets[30, 30, 40, 40] |
| `/HeroRecommendItem/lbl_name` | UILabelTTF | [85.0, 199.991] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」16 FZCSJW--GB1-0.ttf rgb[255, 230, 191] |
| `/HeroRecommendItem/CCSprite_1` | CCSprite | [85.0, 48.0] | [0.5, 0.5] | [163, 51] | [0.96, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-notes-1.png` fdd5d17d-bd52-4a1d-ad0e-059432506d97 |
| `/HeroRecommendItem/lbl_desc1` | UILabelTTF | [85.0, 61.991] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄简介1」16 FZCSJW--GB1-0.ttf rgb[81, 72, 50] |
| `/HeroRecommendItem/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroRecommendItem/menu/btn_cell` | CCMenuItemImage | [87, 132] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroRecommendItem/lbl_desc2` | UILabelTTF | [85.0, 39.991] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄简介2」16 FZCSJW--GB1-0.ttf rgb[64, 57, 38] |
| `/HeroRecommendItem/spr_rare` | CCSprite | [130, 92] | [0.5, 0.5] | [80, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_spr-rare.png` a8225805-fbdf-41ad-a92d-e9ce52c20c18 |
| `/HeroRecommendItem/spr_strongest` | CCSprite | [130, 180] | [0.5, 0.5] | [80, 61] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info-lang_spr-strongest.png` 6ed28af0-d1d8-4af5-ac0c-33786b28958d |

## HeroRecommendItemCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroRecommendItemCell` | HeroRecommendItemCell | [0, 0] | [0, 0] | [572, 50] | [1, 1] | 0 | 是 |  |
| `/HeroRecommendItemCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [572, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_hero-recommend-bar.png` a4cb9adf-eed6-4ce6-9ef6-2cf129ebbb64 |
| `/HeroRecommendItemCell/node_item` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroRecommendItemCell/_ratingSprite` | CCSprite | [80, 26] | [0.5, 0.5] | [109, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_hero-recommend-t0.png` db9fe4b8-aa3d-4c2d-9e85-9c7296de809c |

## HeroSelectLayer（102）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSelectLayer` | HeroSelectLayer | [0, 0] | [0, 0] | [640, 1034] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/spr_bg` | CCScale9Sprite | [-1, -8] | [0.5, 0.5] | [640.0, 1034.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroSelectLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_title` | CCNode | [320.0, 1016.325] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挂机队伍」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroSelectLayer/spr_bg_backpack` | CCScale9Sprite | [320, 575] | [0.5, 0] | [580, 368] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[60, 20, 20, 20] |
| `/HeroSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/UIMenu_1/btn_elem0` | UIMenuItemImage | [91, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/HeroSelectLayer/UIMenu_1/btn_elem1` | UIMenuItemImage | [181, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroSelectLayer/UIMenu_1/btn_elem2` | UIMenuItemImage | [273, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroSelectLayer/UIMenu_1/btn_elem3` | UIMenuItemImage | [365, 905] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroSelectLayer/UIMenu_1/btn_elem4` | UIMenuItemImage | [455, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroSelectLayer/UIMenu_1/btn_elem5` | UIMenuItemImage | [541, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroSelectLayer/spr_select` | CCSprite | [91, 905] | [0.5, 0.5] | [92, 92] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-btn-select.png` 19bbb579-f958-44fd-972b-3d609aa2ea59 |
| `/HeroSelectLayer/UILabelTTF_1` | UILabelTTF | [320.056, 855] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「长按英雄可查看英雄信息」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroSelectLayer/scroll_view_backpack` | UIScrollViewBackpack | [320, 580] | [0.5, 0] | [580, 250] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroSelectLayer/node_pannel_2` | CCNode | [320, 145] | [0.5, 0] | [566, 380] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [566, 380] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_k1.png` 8a6d8446-56b7-454e-b956-ab10decce786 insets[15, 15, 0, 0] |
| `/HeroSelectLayer/node_pannel_2/spr_battle_count_bg` | CCSprite | [80.0, 322] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/HeroSelectLayer/node_pannel_2/lbl_battle_count` | CCLabelBMFont | [109.0, 322] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「90000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/HeroSelectLayer/node_pannel_2/CCSprite_1` | CCSprite | [5.0, 330] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/HeroSelectLayer/node_pannel_2/CCSprite_2` | CCSprite | [-243.0, 210] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/HeroSelectLayer/node_pannel_2/CCSprite_2/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「前排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroSelectLayer/node_pannel_2/CCSprite_3` | CCSprite | [-243.0, 80] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/HeroSelectLayer/node_pannel_2/CCSprite_3/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「后排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HeroSelectLayer/node_pannel_2/node_icon_4` | CCNode | [-163.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_4/spr_lock_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_4/lbl_attr_add_4` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_3` | CCNode | [-63.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_3/spr_lock_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_3/lbl_attr_add_3` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_2` | CCNode | [37.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_2/spr_lock_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_2/lbl_attr_add_2` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_1` | CCNode | [137.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_1/spr_lock_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_1/lbl_attr_add_1` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_8` | CCNode | [-163.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_8/spr_lock_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_8/lbl_attr_add_8` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_7` | CCNode | [-63.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_7/spr_lock_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_7/lbl_attr_add_7` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_6` | CCNode | [37.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_6/spr_lock_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_6/lbl_attr_add_6` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_5` | CCNode | [137.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_5/spr_lock_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/HeroSelectLayer/node_pannel_2/node_icon_5/lbl_attr_add_5` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/HeroSelectLayer/node_pannel_2/node_icon_9` | CCNode | [227.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/node_icon_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSelectLayer/node_pannel_2/node_icon_9/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSelectLayer/node_pannel_2/node_icon_9/spr_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/HeroSelectLayer/node_pannel_2/node_icon_9/lbl_attr_add_9` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助阵」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/HeroSelectLayer/node_pannel_2/menu_assist` | UIMenu | [227.0, 80] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/menu_assist/btn_assist_tip` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroSelectLayer/node_pannel_2/menu_assist/btn_assist_info` | UIMenuItemImage | [-30, 30] | [0.5, 0.5] | [32, 31] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_spr-question.png` 39aaa420-ddef-4151-9282-eed3d05fd142 |
| `/HeroSelectLayer/node_pannel_2/CCMenu_1` | CCMenu | [-283.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_pannel_2/CCMenu_1/btn_halo` | UIMenuItemImage | [510, 320] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/HeroSelectLayer/node_pannel_2/CCMenu_1/btn_matrix` | UIMenuItemLabel | [510, 210] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 · Label「更换」36 [255, 225, 178, 255] |
| `/HeroSelectLayer/node_pannel_2/CCMenu_1/btn_contract` | UIMenuItemImage | [120, 325] | [0.5, 0.5] | [176, 71] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select-lang_zxtj.png` ecfbb893-fb6a-476b-bdd8-f34f1572a465 |
| `/HeroSelectLayer/node_pannel_2/CCMenu_1/btn_switch` | UIMenuItemLabel | [510, 405] | [0.5, 0.5] | [50, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-switch-3.png` 7aece60b-2a5d-49f0-9e57-89ee49a7a95e · Label「切换」36 [255, 233, 186, 255] |
| `/HeroSelectLayer/spr_fetter_bg` | CCSprite | [522, 84] | [0.5, 0.5] | [93, 93] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_btn-add.png` c1f32621-90fc-4267-9bfb-ccf59884ccda |
| `/HeroSelectLayer/lbl_tip` | UILabelTTF | [320, 127] | [0.5, 0.5] | auto | [0.4, 0.4] | 0 | 是 | cc.Label「上阵等级提示」36 FZCSJW--GB1-0.ttf rgb[120, 65, 0] |
| `/HeroSelectLayer/node_change_road` | CCNode | [320, -42] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroSelectLayer/node_change_road/spr_change_road_bg` | CCScale9Sprite | [0, 25] | [0.5, 0] | [200, 136] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/HeroSelectLayer/node_change_road/menu_change_road` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_change_road/menu_change_road/btn_road_2` | UIMenuItemLabel | [0, 60] | [0.5, 0.5] | [197, 60] | [0.88, 0.88] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「中路」64 [255, 255, 255, 255] |
| `/HeroSelectLayer/node_change_road/menu_change_road/btn_road_1` | UIMenuItemLabel | [0, 120] | [0.5, 0.5] | [197, 60] | [0.88, 0.88] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「左 路」64 [255, 255, 255, 255] |
| `/HeroSelectLayer/lbl_change_road_tip` | UILabelTTF | [320, 44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「工会战换路提示」36 FZCSJW--GB1-0.ttf rgb[120, 65, 0] |
| `/HeroSelectLayer/lbl_change_road_tip_2` | UILabelTTF | [320, -7] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「工会战开始时间」36 FZCSJW--GB1-0.ttf rgb[95, 255, 0] |
| `/HeroSelectLayer/UIMenu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/UIMenu_2/btn_close` | UIMenuItemImage | [571.48, 1019] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroSelectLayer/UIMenu_2/btn_confirm` | UIMenuItemLabel | [320, 84] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「确定」50 [255, 225, 178, 255] |
| `/HeroSelectLayer/UIMenu_2/btn_fetter` | UIMenuItemImage | [522, 84] | [0.5, 0.5] | [93, 93] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-add.png` c1f32621-90fc-4267-9bfb-ccf59884ccda |
| `/HeroSelectLayer/UIMenu_2/btn_change_road` | UIMenuItemLabel | [320, -45] | [0.5, 0.5] | [197, 60] | [0.88, 0.88] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「换 路」64 [255, 255, 255, 255] |
| `/HeroSelectLayer/node_dragon_skill` | CCNode | [118, 86] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_dragon_skill/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSelectLayer/node_dragon_skill/CCMenu_1/btn_dragon_skill` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [97, 97] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select_spr-dragon-skill-bg.png` 9a45ceef-20dd-4bfc-aa0f-d39cb1458403 |
| `/HeroSelectLayer/node_dragon_skill/spr_dragon_skill_1` | CCSprite | [0, 25] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_400050001.png` 21991565-3a07-4724-bc3c-2381a1db6adc |
| `/HeroSelectLayer/node_dragon_skill/spr_dragon_skill_2` | CCSprite | [-25, 0] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_400110001.png` f4632d93-5a03-4459-97db-cddc5c9dadba |
| `/HeroSelectLayer/node_dragon_skill/spr_dragon_skill_3` | CCSprite | [25, 0] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_400100001.png` 6afd90e1-eca3-405c-8895-7e3c37bdf3fc |
| `/HeroSelectLayer/node_dragon_skill/spr_dragon_skill_4` | CCSprite | [0, -25] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_400150001.png` 45cd2120-30a4-4c6b-be42-12d28a24eb8f |
| `/HeroSelectLayer/node_dragon_skill/CCSprite_1` | CCSprite | [0, -40] | [0.5, 0.5] | [76, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_lbl-reload.png` d4bb1e67-8ef2-4d48-a3b7-9e2d816a3deb |
| `/HeroSelectLayer/scroll_view_team_title` | UIScrollViewBackpack | [49, 525] | [0, 0] | [545, 45] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## HeroSkillInfoLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSkillInfoLayer` | HeroSkillInfoLayer | [0, 0] | [0, 0] | [400, 500] | [1, 1] | 0 | 是 |  |
| `/HeroSkillInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [400, 500] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/HeroSkillInfoLayer/node_skill_info` | CCNode | [0, 250] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkillInfoLayer/node_skill_info/spr_icon` | CCSprite | [80, 190] | [0.5, 0.5] | [54, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_0.png` 11c1a2df-9e7f-49cc-ae02-bfbf8b5c6df3 |
| `/HeroSkillInfoLayer/node_skill_info/lbl_name` | UILabelTTF | [140, 205] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」48 FZCSJW--GB1-0.ttf rgb[255, 229, 202] |
| `/HeroSkillInfoLayer/node_skill_info/lbl_active_type` | UILabelTTF | [140, 175] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能类型」40 FZCSJW--GB1-0.ttf rgb[255, 229, 202] |
| `/HeroSkillInfoLayer/node_skill_info/spr_line_1` | CCSprite | [195, 140] | [0.5, 0.5] | [1162, 10] | [0.3, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line.png` a55e1c16-e390-432e-a407-fbf040689681 |
| `/HeroSkillInfoLayer/node_skill_info/lbl_info_1` | UILabelTTF | [200, 10] | [0.5, 0] | [720, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」40 FZCSJW--GB1-0.ttf rgb[160, 129, 89] |
| `/HeroSkillInfoLayer/node_buff` | CCNode | [0, 150] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkillInfoLayer/node_buff/spr_line_2` | CCSprite | [195, 90] | [0.5, 0.5] | [1162, 10] | [0.3, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line.png` a55e1c16-e390-432e-a407-fbf040689681 |
| `/HeroSkillInfoLayer/node_level_tip` | CCNode | [0, 10] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkillInfoLayer/node_level_tip/spr_line_3` | CCSprite | [195, 90] | [0.5, 0.5] | [1162, 10] | [0.3, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line.png` a55e1c16-e390-432e-a407-fbf040689681 |
| `/HeroSkillInfoLayer/node_level_tip/lbl_next_level_des` | UILabelTTF | [200, 0] | [0.5, 0] | [720, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」40 FZCSJW--GB1-0.ttf rgb[250, 222, 175] |
| `/HeroSkillInfoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSkillInfoLayer/CCMenu_1/btn_close` | UIMenuItemImage | [355, 475] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## HeroSkillOpenInfoLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSkillOpenInfoLayer` | HeroSkillOpenInfoLayer | [0, 0] | [0, 0] | [640, 460] | [1, 1] | 0 | 是 |  |
| `/HeroSkillOpenInfoLayer/bg_node` | CCNode | [320.0, 460.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkillOpenInfoLayer/bg_node/spr_result_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[150, 150, 300, 300] |
| `/HeroSkillOpenInfoLayer/node` | CCNode | [320.0, 276.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSkillOpenInfoLayer/node/spr_title` | CCSprite | [0, 195] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** hero-skill/spr-title.png |
| `/HeroSkillOpenInfoLayer/node/spr_eff` | CCSprite | [0, 1.8] | [0.5, 0.5] | [284, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-skill_spr-eff.png` 457cace1-6f42-47f3-87e0-a2afab2e79e8 |
| `/HeroSkillOpenInfoLayer/node/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSkillOpenInfoLayer/node/lbl_name` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」32 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroSkillOpenInfoLayer/node/lbl_tips` | UILabelTTF | [0, -100] | [0.5, 1] | [360, 100] | [1, 1] | 0 | 是 | cc.Label「」20 STZhongsong.ttf rgb[240, 219, 168] |

## HeroStoneStateCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroStoneStateCell` | HeroStoneStateCell | [0, 0] | [0, 0] | [550, 160] | [1, 1] | 0 | 是 |  |
| `/HeroStoneStateCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/HeroStoneStateCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroStoneStateCell/menu/btn_enter` | UIMenuItemLabel | [460, 80] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「镶嵌」24 [255, 255, 255, 255] |
| `/HeroStoneStateCell/menu/btn_stone_down` | UIMenuItemLabel | [458, 48] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「卸下」24 [255, 255, 255, 255] |
| `/HeroStoneStateCell/menu/btn_stone_up` | UIMenuItemLabel | [461, 108] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「升级」24 [255, 255, 255, 255] |
| `/HeroStoneStateCell/lbl_name` | UILabelTTF | [144, 117] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9级攻击宝石」44 STZhongsong.ttf rgb[231, 117, 42] |
| `/HeroStoneStateCell/show_attr_rich` | CCNode | [144, 106] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroStoneStateCell/lbl_score` | UILabelTTF | [270, 117] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9级别g宝石」44 STZhongsong.ttf rgb[32, 166, 0] |

## HeroStoneStateLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroStoneStateLayer` | HeroStoneStateLayer | [0, 0] | [0, 0] | [640, 748] | [1, 1] | 0 | 是 |  |
| `/HeroStoneStateLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 748] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroStoneStateLayer/node_title` | CCNode | [320.0, 740.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroStoneStateLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroStoneStateLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「宝石镶嵌」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/HeroStoneStateLayer/spr_scroll_bg` | CCScale9Sprite | [40, 58] | [0.5, 0.5] | [560, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroStoneStateLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroStoneStateLayer/CCMenu_1/btn_close` | UIMenuItemImage | [577, 710] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## HeroStrongInfoCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroStrongInfoCell` | HeroStrongInfoCell | [0, 0] | [0, 0] | [562, 150] | [1, 1] | 0 | 是 |  |
| `/HeroStrongInfoCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [564, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/HeroStrongInfoCell/_iconPointer` | CCNode | [56.2, 75.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroStrongInfoCell/_titleText` | CCLabelTTF | [112.4, 102.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 Helvetica rgb[141, 89, 58] |
| `/HeroStrongInfoCell/_descText` | CCLabelTTF | [112.4, 73.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」20 Helvetica rgb[213, 116, 21] |
| `/HeroStrongInfoCell/UILabelTTF_1` | UILabelTTF | [112.4, 43.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「评分/本服最高」20 Helvetica rgb[213, 116, 21] |
| `/HeroStrongInfoCell/_progressBg` | CCScale9Sprite | [325.96, 42.95] | [0.5, 0.5] | [160, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-bg-3.png` 4da20283-846a-4618-8f53-2b948c16cd92 insets[8, 8, 10, 10] |
| `/HeroStrongInfoCell/CCMenu_1` | CCMenu | [483.32, 75.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroStrongInfoCell/CCMenu_1/_gotoBtn` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「前 往」42 [255, 255, 255, 255] |

## HeroStrongResourceMainCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroStrongResourceMainCell` | HeroStrongResourceMainCell | [0, 0] | [0, 0] | [562, 150] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceMainCell/_subContainer` | CCNode | [0, 0] | [0, 0] | [562, 0] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceMainCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/HeroStrongResourceMainCell/_iconPointer` | CCNode | [86.44, 75.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceMainCell/_iconPointer/_iconBg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-21.png` 69eb52eb-3cf3-4b4e-829d-c36431204523 |
| `/HeroStrongResourceMainCell/_titleText` | CCLabelTTF | [151.74, 92.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Asdfasdf」22 Helvetica rgb[213, 116, 21] |
| `/HeroStrongResourceMainCell/_descText` | CCLabelTTF | [151.74, 45.0] | [0, 0.5] | [275, 60] | [1, 1] | 0 | 是 | cc.Label「Asdfasdf」20 Helvetica rgb[141, 89, 58] |
| `/HeroStrongResourceMainCell/CCMenu_1` | CCMenu | [483.32, 75.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceMainCell/CCMenu_1/_expandBtn` | UIMenuItemLabel | [1, 0] | [0.5, 0.5] | [136, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「展 开」50 [255, 255, 255, 255] |

## HeroStrongResourceSubCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroStrongResourceSubCell` | HeroStrongResourceSubCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceSubCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-21.png` 7d4f4d73-b343-492c-869f-e767db216b0b insets[18, 18, 18, 18] |
| `/HeroStrongResourceSubCell/_iconPointer` | CCNode | [80.0, 75.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceSubCell/_iconPointer/_iconBg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-21.png` 69eb52eb-3cf3-4b4e-829d-c36431204523 |
| `/HeroStrongResourceSubCell/_titleText` | CCLabelTTF | [143.0, 92.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Asdfasdf」22 Helvetica rgb[213, 116, 21] |
| `/HeroStrongResourceSubCell/_descText` | CCLabelTTF | [143.0, 45.0] | [0, 0.5] | [270, 60] | [1, 1] | 0 | 是 | cc.Label「Asdfasdf」20 Helvetica rgb[141, 89, 58] |
| `/HeroStrongResourceSubCell/CCMenu_1` | CCMenu | [473.0, 75.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroStrongResourceSubCell/CCMenu_1/_gotoBtn` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「前 往」50 [255, 255, 255, 255] |

## HeroSuggestCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSuggestCell` | HeroSuggestCell | [0, 0] | [0, 0] | [562, 224] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [564, 224] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-detail_spr-cell-bg-3.png` 8e6b6d2a-3a9c-4c55-a487-28bccf8dedc4 insets[50, 100, 0, 0] |
| `/HeroSuggestCell/CCScale9Sprite_2` | CCScale9Sprite | [5, 75] | [0.5, 0.5] | [552, 90] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/HeroSuggestCell/lbl_title` | UILabelTTF | [281, 205] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「123456789」48 FZCSJW--GB1-0.ttf rgb[253, 229, 190] |
| `/HeroSuggestCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## HeroSuggestLayer（64）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroSuggestLayer` | HeroSuggestLayer | [0, 0] | [0, 0] | [620, 1024] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/spr_bg` | CCScale9Sprite | [-8, 0] | [0.5, 0.5] | [632.4, 1024] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroSuggestLayer/node_title` | CCNode | [320, 1015] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroSuggestLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄变强」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HeroSuggestLayer/CCNode_1` | CCNode | [787, 1024] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/CCNode_1/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/CCNode_1/menu/btn_close` | UIMenuItemImage | [-232, -37] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroSuggestLayer/CCNode_2` | CCNode | [120, 949] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/CCNode_2/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/CCNode_2/menu/btn_strategy` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-strategy.png` cd09e264-0ae6-4dd9-9c84-0333d1ce3bd5 |
| `/HeroSuggestLayer/node_strong` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroSuggestLayer/node_strong/CCScale9Sprite_1` | CCScale9Sprite | [40, 643] | [0.5, 0.5] | [538, 226] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-detail_spr-cell-bg-2.png` ae0efb41-f2df-44a8-b096-f942d2aa1ee9 insets[42, 0, 0, 0] |
| `/HeroSuggestLayer/node_strong/spr_strong_scroll_bg` | CCScale9Sprite | [39, 61] | [0.5, 0.5] | [538, 586.752] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroSuggestLayer/node_strong/CCScale9Sprite_2` | CCScale9Sprite | [40, 712] | [0.5, 0.5] | [538, 114] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_hero-strong-banner.png` 0a487269-88c4-43eb-a484-94a35d060cee |
| `/HeroSuggestLayer/node_strong/_heroStrongScoreBg` | CCScale9Sprite | [471, 680] | [0.5, 0.5] | [186, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-bg-3.png` 4da20283-846a-4618-8f53-2b948c16cd92 insets[8, 8, 20, 20] |
| `/HeroSuggestLayer/node_strong/UILabelTTF_1` | UILabelTTF | [313, 850] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「我的英雄」24 FZCSJW--GB1-0.ttf rgb[253, 233, 201] |
| `/HeroSuggestLayer/node_strong/_heroStrongName` | CCLabelTTF | [73, 681] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」24 Helvetica-Bold rgb[141, 89, 58] |
| `/HeroSuggestLayer/node_strong/UILabelTTF_2` | UILabelTTF | [312, 680] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「评分/本服最高」20 Helvetica rgb[213, 116, 21] |
| `/HeroSuggestLayer/node_strong/CCNode_1` | CCNode | [0, 771] | [0, 0] | [0.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroStrongMenu` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem1` | CCNode | [95.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem1/_heroItemBg1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem1/_heroItemBg1/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem1/_heroItemBg1/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [85, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem2` | CCNode | [181.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem2/_heroItemBg2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem2/_heroItemBg2/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem2/_heroItemBg2/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [85, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem3` | CCNode | [267.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem3/_heroItemBg3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem3/_heroItemBg3/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem3/_heroItemBg3/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [85, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem4` | CCNode | [353.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem4/_heroItemBg4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem4/_heroItemBg4/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem4/_heroItemBg4/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [85, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem5` | CCNode | [439.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem5/_heroItemBg5` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem5/_heroItemBg5/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem5/_heroItemBg5/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [85, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem6` | CCNode | [525.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem6/_heroItemBg6` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem6/_heroItemBg6/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/HeroSuggestLayer/node_strong/CCNode_1/_heroItem6/_heroItemBg6/CCScale9Sprite_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [85, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/HeroSuggestLayer/node_strong/_heroStrongSelected` | CCSprite | [95, 763] | [0.5, 0.5] | [98, 115] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_hero-strong-selected.png` 5a945279-79ba-4d7c-871a-7b042e27d776 |
| `/HeroSuggestLayer/node_resource` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroSuggestLayer/node_resource/spr_resource_scroll_bg` | CCScale9Sprite | [39, 61] | [0.5, 0.5] | [538, 808.96] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroSuggestLayer/node_lineup` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/HeroSuggestLayer/node_lineup/spr_scroll_bg` | CCScale9Sprite | [39, 61] | [0.5, 0.5] | [538, 808.96] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroSuggestLayer/node_hero` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_hero/spr_box` | CCScale9Sprite | [39, 61] | [0.5, 0.5] | [538, 808.96] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[60, 20, 20, 20] |
| `/HeroSuggestLayer/node_hero/menu_elem` | UIMenu | [393, 860] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/node_hero/menu_elem/btn_elem1` | UIMenuItemCheckBox | [-256, -36] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/HeroSuggestLayer/node_hero/menu_elem/btn_elem2` | UIMenuItemCheckBox | [-166, -37] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/HeroSuggestLayer/node_hero/menu_elem/btn_elem3` | UIMenuItemCheckBox | [-76, -37] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/HeroSuggestLayer/node_hero/menu_elem/btn_elem4` | UIMenuItemCheckBox | [14, -37] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/HeroSuggestLayer/node_hero/menu_elem/btn_elem5` | UIMenuItemCheckBox | [104, -37] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/HeroSuggestLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroSuggestLayer/CCMenu_1/btn_strong` | UIMenuItemTab | [110, 869] | [0.5, 0] | [138, 44] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「英雄变强」48 [141, 103, 74, 255] |
| `/HeroSuggestLayer/CCMenu_1/btn_resource` | UIMenuItemTab | [240, 869] | [0.5, 0] | [138, 44] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「获取资源」48 [141, 103, 74, 255] |
| `/HeroSuggestLayer/CCMenu_1/btn_hero` | UIMenuItemTab | [370, 869] | [0.5, 0] | [138, 44] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「英雄推荐」48 [141, 103, 74, 255] |
| `/HeroSuggestLayer/CCMenu_1/btn_lineup` | UIMenuItemTab | [501, 869] | [0.5, 0] | [138, 44] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「阵容推荐」48 [141, 103, 74, 255] |
| `/HeroSuggestLayer/CCSprite_1` | CCSprite | [401, 911] | [0.5, 0.5] | [55, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_strong-important.png` 299259cc-5b43-47b0-80f0-01837c1f325d |

## HeroTalentLearnLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroTalentLearnLayer` | HeroTalentLearnLayer | [0, 0] | [0, 0] | [614, 760] | [1, 1] | 0 | 是 |  |
| `/HeroTalentLearnLayer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/HeroTalentLearnLayer/spr_bg` | CCScale9Sprite | [-4.14, 0.0] | [0.5, 0.5] | [626.28, 775.2] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroTalentLearnLayer/CCScale9Sprite_1` | CCScale9Sprite | [41, 630] | [0, 0.5] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroTalentLearnLayer/spr_title_bg` | CCScale9Sprite | [307.0, 735.229] | [0.5, 0.5] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroTalentLearnLayer/spr_cell_bg` | CCScale9Sprite | [312, 629] | [0.5, 0.5] | [520, 115] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[0, 0, 10, 10] |
| `/HeroTalentLearnLayer/UILabelTTF_1` | UILabelTTF | [306.766, 725.208] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「天赋领悟」28 STZhongsong.ttf rgb[253, 229, 190] |
| `/HeroTalentLearnLayer/lbl_skill_name` | UILabelTTF | [163, 660] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/HeroTalentLearnLayer/CCScale9Sprite_2` | CCScale9Sprite | [41.442, 185.324] | [0.5, 0.5] | [540, 376] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HeroTalentLearnLayer/scroll_view` | UIScrollViewBackpack | [311.333, 186.639] | [0.5, 0] | [540, 370] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HeroTalentLearnLayer/lbl_cost_text` | UILabelTTF | [125, 120] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗：」22 STZhongsong.ttf rgb[136, 83, 48] |
| `/HeroTalentLearnLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroTalentLearnLayer/menu/btn_confirm` | UIMenuItemLabel | [475.833, 114.333] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「领悟」60 [255, 255, 255, 255] |
| `/HeroTalentLearnLayer/menu/btn_close` | UIMenuItemImage | [556, 743.0] | [0.5, 0.5] | [55, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroTalentLearnLayer/lbl_item_name` | UILabelTTF | [205, 58] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「物品名称」18 STZhongsong.ttf rgb[144, 80, 39] |
| `/HeroTalentLearnLayer/lbl_skill_desc` | UILabelTTF | [163, 639] | [0, 1] | [400, 70] | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[144, 80, 39] |

## HeroTalentShopLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroTalentShopLayer` | HeroTalentShopLayer | [0, 0] | [0, 0] | [620, 780] | [1, 1] | 0 | 是 |  |
| `/HeroTalentShopLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroTalentShopLayer/spr_bg` | CCNode | [20, 130] | [0, 0] | [580, 580] | [1, 1] | 0 | 是 |  |
| `/HeroTalentShopLayer/CCSprite_1` | CCSprite | [310, 796] | [0.5, 0.5] | [424, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_shop_1.png` 1d6eb9e5-f7b9-4582-9237-d28f1ea51bd5 |
| `/HeroTalentShopLayer/lbl_name` | UILabelTTF | [313, 782] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能商城」56 STZhongsong.ttf rgb[253, 229, 190] |
| `/HeroTalentShopLayer/lbl_limit_time` | UILabelTTF | [410, 60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「免费刷新次数 00/20」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/HeroTalentShopLayer/res_node` | CCNode | [15, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroTalentShopLayer/res_node/CCScale9Sprite_1` | CCScale9Sprite | [90, 8] | [0.5, 0.5] | [134, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/shop/shop_shop_8.png` 9138e906-fa3b-43ae-8d75-2c0074857c63 insets[0, 0, 15, 15] |
| `/HeroTalentShopLayer/res_node/spr_icon` | CCSprite | [46, 9] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900201.png` 0edcb029-2a94-4250-ab84-2a342ed5e9af |
| `/HeroTalentShopLayer/res_node/lbl_num` | UILabelTTF | [75, 7] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/HeroTalentShopLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroTalentShopLayer/UIMenu_1/btn_close` | UIMenuItemImage | [558, 752] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroTalentShopLayer/UIMenu_1/btn_refresh` | UIMenuItemLabel | [310, 77] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/shop/shop_shop_2.png` dc912cfa-6541-46f0-b904-701c37d10111 · Label「」24 [255, 255, 255, 255] |
| `/HeroTalentShopLayer/lbl_time` | UILabelTTF | [410, 95] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「免费刷新 06:06:06」20 STZhongsong.ttf rgb[141, 89, 58] |

## HeroTalentUpLevelLayer（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroTalentUpLevelLayer` | HeroTalentUpLevelLayer | [0, 0] | [0, 0] | [640, 776] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/CCSprite_1` | CCSprite | [321, 378] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE **缺图** 技能升级.png |
| `/HeroTalentUpLevelLayer/CCSprite_2` | CCSprite | [321, 378] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE **缺图** 技能升级满级.png |
| `/HeroTalentUpLevelLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 776] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HeroTalentUpLevelLayer/node_title` | CCNode | [320.0, 776.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_title/spr_title_bg` | CCScale9Sprite | [1, -12] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HeroTalentUpLevelLayer/node_title/lbl_title` | UILabelTTF | [1, -52] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能升级」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/HeroTalentUpLevelLayer/menu` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/menu/btn_remove` | UIMenuItemLabel | [-128, 83] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「遗忘技能」48 [255, 255, 255, 255] |
| `/HeroTalentUpLevelLayer/menu/btn_uplevel` | UIMenuItemLabel | [128, 83] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「升级」48 [255, 255, 255, 255] |
| `/HeroTalentUpLevelLayer/menu/btn_close` | UIMenuItemImage | [257.136, 741.872] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HeroTalentUpLevelLayer/node_content` | CCNode | [320.0, 409.0] | [0.5, 0.5] | [544, 550.96] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_max_bg` | CCNode | [-272.0, -275.48] | [0, 0] | [544.0, 550.96] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_max_bg/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [544.0, 550.96] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[50, 10, 10, 10] |
| `/HeroTalentUpLevelLayer/node_content/node_max_bg/CCSprite_1` | CCSprite | [285.0, 180.0] | [0.5, 0.5] | [278, 222] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-23.png` 4aa9b1ec-46e9-4b96-a9e0-a7dba44894b5 |
| `/HeroTalentUpLevelLayer/node_content/node_max_bg/lbl_next_skill_name` | UILabelTTF | [273.0, 169.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「该技能已满级」44 STZhongsong.ttf rgb[135, 95, 51] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg` | CCNode | [-272.0, -275.48] | [0, 0] | [544.0, 550.96] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1` | CCNode | [0.0, 550.96] | [0, 1] | [544.0, 360] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [0.0, -360] | [0.5, 0.5] | [544.0, 360.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[50, 10, 10, 10] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCNode_1` | CCNode | [273.0, -176] | [0.5, 1] | [514, 170] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [0.0, -18] | [0.5, 0.5] | [33, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_arrow-1.png` 33d6b9c7-376b-45be-8f1b-323f348d11c8 |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCNode_1/node_next_skill` | CCNode | [0.0, -45] | [0.5, 1] | [514, 114] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCNode_1/node_next_skill/CCScale9Sprite_1` | CCScale9Sprite | [-257.0, -114] | [0.5, 0.5] | [514.0, 114.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-12.png` e5e6c5b1-0c18-4a70-b61a-b9c9547348ba insets[10, 10, 10, 10] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCNode_1/node_next_skill/spr_next_skill_icon` | CCSprite | [-202.0, -58] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101020021.png` 481713a3-dec9-4033-8815-e037181c26d8 |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/CCNode_1/CCNode_1/node_next_skill/lbl_next_skill_name` | UILabelTTF | [-144.0, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」44 STZhongsong.ttf rgb[135, 95, 51] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res` | CCNode | [0.0, 0.0] | [0, 0] | [544.0, 180] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0.5] | [544.0, 180.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[50, 10, 10, 10] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/UILabelTTF_1` | UILabelTTF | [74.0, 157] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「升级消耗」48 STZhongsong.ttf rgb[253, 232, 193] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_1` | CCNode | [65.0, 65.833] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_1/lbl_res_name_1` | UILabelTTF | [59, 22] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「物品名称」44 STZhongsong.ttf rgb[135, 95, 51] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_1/CCScale9Sprite_1` | CCScale9Sprite | [56.333, -36.333] | [0.5, 0.5] | [142, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-checkbox-2.png` ecd95a78-519b-40db-967b-f46a09c41f80 insets[8, 8, 8, 8] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_1/lbl_res_num_1` | UILabelTTF | [66, -18] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「5/10」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_2` | CCNode | [332.0, 65.833] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_2/lbl_res_name_2` | UILabelTTF | [59, 22] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「物品名称」44 STZhongsong.ttf rgb[135, 95, 51] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_2/CCScale9Sprite_1` | CCScale9Sprite | [56.333, -36.333] | [0.5, 0.5] | [142, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-checkbox-2.png` ecd95a78-519b-40db-967b-f46a09c41f80 insets[8, 8, 8, 8] |
| `/HeroTalentUpLevelLayer/node_content/node_not_max_bg/node_up_level_res/node_res_2/lbl_res_num_2` | UILabelTTF | [66, -18] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「5/10」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/HeroTalentUpLevelLayer/node_content/CCNode_1` | CCNode | [-272.0, 275.48] | [0, 1] | [544.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/CCNode_1/UILabelTTF_1` | UILabelTTF | [74.0, -23.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能升级」48 STZhongsong.ttf rgb[253, 232, 193] |
| `/HeroTalentUpLevelLayer/node_content/CCNode_1/node_cur_skill` | CCNode | [272.0, -55.0] | [0.5, 1] | [514, 114] | [1, 1] | 0 | 是 |  |
| `/HeroTalentUpLevelLayer/node_content/CCNode_1/node_cur_skill/CCScale9Sprite_1` | CCScale9Sprite | [-257.0, -114] | [0.5, 0.5] | [514.0, 114.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-12.png` e5e6c5b1-0c18-4a70-b61a-b9c9547348ba insets[10, 10, 10, 10] |
| `/HeroTalentUpLevelLayer/node_content/CCNode_1/node_cur_skill/spr_cur_skill_icon` | CCSprite | [-202.0, -58] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101020021.png` 481713a3-dec9-4033-8815-e037181c26d8 |
| `/HeroTalentUpLevelLayer/node_content/CCNode_1/node_cur_skill/lbl_cur_skill_name` | UILabelTTF | [-144.0, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」44 STZhongsong.ttf rgb[135, 95, 51] |

## HeroUpStarSelectItemCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroUpStarSelectItemCell` | HeroUpStarSelectItemCell | [0, 0] | [0, 0] | [77, 77] | [1, 1] | 0 | 是 |  |
| `/HeroUpStarSelectItemCell/menu` | UIMenu | [0, 0] | [0, 0] | [77, 77] | [1, 1] | 0 | 是 |  |
| `/HeroUpStarSelectItemCell/menu/btn_cell` | UIMenuItemImage | [38.5, 38.5] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroUpStarSelectItemCell/spr_bg` | CCSprite | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** backpack/item-bg-5.png |
| `/HeroUpStarSelectItemCell/spr_hero_icon` | CCSprite | [38.5, 38.5] | [0.5, 0.5] | [44, 72] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_item-default-2.png` b189a84a-36c2-4d1f-8a24-8f385a8239bf |
| `/HeroUpStarSelectItemCell/spr_elem` | CCSprite | [13, 64] | [0.5, 0.5] | [26, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_item-elem-bg.png` 8d188d27-c98b-4b28-ac0e-a0c11a1f2c4a |
| `/HeroUpStarSelectItemCell/spr_select` | CCSprite | [38.5, 38.5] | [0.5, 0.5] | [48, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-selected.png` 76d907ee-3865-4abe-837b-83ca0bd3ccec |
| `/HeroUpStarSelectItemCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## HeroUpStarSelectLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroUpStarSelectLayer` | HeroUpStarSelectLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/HeroUpStarSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, -10] | [0.5, 0.5] | [580, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/HeroUpStarSelectLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/HeroUpStarSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroUpStarSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/HeroUpStarSelectLayer/lbl_select` | UILabelTTF | [56, 273] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」20 STZhongsong.ttf rgb[89, 53, 15] |
| `/HeroUpStarSelectLayer/node_bubble` | CCNode | [485, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HeroUpStarSelectLayer/node_bubble/lbl_go_under` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 0.5] | 0 | 是 | cc.Label「————」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/HeroUpStarSelectLayer/node_bubble/lbl_go` | UILabelTTF | [0, 12] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「快速获得」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/HeroUpStarSelectLayer/node_bubble/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroUpStarSelectLayer/node_bubble/CCMenu_1/btn_go` | UIMenuItemImage | [0, 12] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## HeroXSelectItemCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroXSelectItemCell` | HeroXSelectItemCell | [0, 0] | [0, 0] | [77, 77] | [1, 1] | 0 | 是 |  |
| `/HeroXSelectItemCell/menu` | UIMenu | [0, 0] | [0, 0] | [77, 77] | [1, 1] | 0 | 是 |  |
| `/HeroXSelectItemCell/menu/btn_cell` | UIMenuItemImage | [38.5, 38.5] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/HeroXSelectItemCell/spr_bg` | CCSprite | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** backpack/item-bg-5.png |
| `/HeroXSelectItemCell/spr_hero_icon` | CCSprite | [38.5, 38.5] | [0.5, 0.5] | [44, 72] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_item-default-2.png` b189a84a-36c2-4d1f-8a24-8f385a8239bf |
| `/HeroXSelectItemCell/spr_elem` | CCSprite | [13, 64] | [0.5, 0.5] | [26, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_item-elem-bg.png` 8d188d27-c98b-4b28-ac0e-a0c11a1f2c4a |
| `/HeroXSelectItemCell/spr_select` | CCSprite | [38.5, 38.5] | [0.5, 0.5] | [48, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-selected.png` 76d907ee-3865-4abe-837b-83ca0bd3ccec |
| `/HeroXSelectItemCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## HeroXSelectLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HeroXSelectLayer` | HeroXSelectLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/HeroXSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, -10] | [0.5, 0.5] | [580, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/HeroXSelectLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/HeroXSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HeroXSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/HeroXSelectLayer/lbl_select` | UILabelTTF | [56, 275] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」16 STZhongsong.ttf rgb[89, 53, 15] |
