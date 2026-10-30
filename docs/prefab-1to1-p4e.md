# P4-e 神器/神兵/圣物/符文 Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| ArtifactActiveLayer | `prefabs/ui/artifact/ArtifactActiveLayer.prefab` | 12 |
| ArtifactIllustrationCell | `prefabs/ui/artifact/ArtifactIllustrationCell.prefab` | 10 |
| ArtifactIllustrationLayer | `prefabs/ui/artifact/ArtifactIllustrationLayer.prefab` | 11 |
| ArtifactItemSelectLayer | `prefabs/ui/artifact/ArtifactItemSelectLayer.prefab` | 11 |
| ArtifactRingLayer | `prefabs/ui/artifact/ArtifactRingLayer.prefab` | 5 |
| ArtifactSelectCell | `prefabs/ui/artifact/ArtifactSelectCell.prefab` | 8 |
| ArtifactSelectLayer | `prefabs/ui/artifact/ArtifactSelectLayer.prefab` | 7 |
| ArtifactSkillPanel | `prefabs/ui/artifact/ArtifactSkillPanel.prefab` | 4 |
| ArtifactSummonHistoryLayer | `prefabs/ui/artifact/ArtifactSummonHistoryLayer.prefab` | 12 |
| ArtifactSummonLayer | `prefabs/ui/artifact/ArtifactSummonLayer.prefab` | 42 |
| ArtifactTipsCell | `prefabs/ui/artifact/ArtifactTipsCell.prefab` | 7 |
| ArtifactTipsLayer | `prefabs/ui/artifact/ArtifactTipsLayer.prefab` | 11 |
| ArtifactTransformItem | `prefabs/ui/artifact/ArtifactTransformItem.prefab` | 3 |
| ArtifactTransformLayer | `prefabs/ui/artifact/ArtifactTransformLayer.prefab` | 22 |
| ArtifactTransformSkill | `prefabs/ui/artifact/ArtifactTransformSkill.prefab` | 6 |
| GodArmsAttrLayer | `prefabs/ui/god-arms/GodArmsAttrLayer.prefab` | 2 |
| GodArmsBackpackLayer | `prefabs/ui/god-arms/GodArmsBackpackLayer.prefab` | 9 |
| GodArmsCompose | `prefabs/ui/god-arms/GodArmsCompose.prefab` | 21 |
| GodArmsComposeLayer | `prefabs/ui/god-arms/GodArmsComposeLayer.prefab` | 29 |
| GodArmsEquipTipsLayer | `prefabs/ui/god-arms/GodArmsEquipTipsLayer.prefab` | 13 |
| GodArmsFightingLayer | `prefabs/ui/god-arms/GodArmsFightingLayer.prefab` | 9 |
| GodArmsLayer | `prefabs/ui/god-arms/GodArmsLayer.prefab` | 111 |
| GodArmsOneKeyComposeLayer | `prefabs/ui/god-arms/GodArmsOneKeyComposeLayer.prefab` | 55 |
| GodArmsOneKeyComposeTipsLayer | `prefabs/ui/god-arms/GodArmsOneKeyComposeTipsLayer.prefab` | 13 |
| GodEquipPromotionLayer | `prefabs/ui/god-equip/GodEquipPromotionLayer.prefab` | 16 |
| GodEquipRareLayer | `prefabs/ui/god-equip/GodEquipRareLayer.prefab` | 74 |
| GodEquipSaleLayer | `prefabs/ui/god-equip/GodEquipSaleLayer.prefab` | 12 |
| GodEquipSelectLayer | `prefabs/ui/god-equip/GodEquipSelectLayer.prefab` | 11 |
| GodEquipSelectSaleLayer | `prefabs/ui/god-equip/GodEquipSelectSaleLayer.prefab` | 27 |
| GodEquipShopLayer | `prefabs/ui/god-equip/GodEquipShopLayer.prefab` | 18 |
| HallowsIdentifyLayer | `prefabs/ui/hallows/HallowsIdentifyLayer.prefab` | 6 |
| HallowsIdentifyResultLayer | `prefabs/ui/hallows/HallowsIdentifyResultLayer.prefab` | 13 |
| HallowsIllustrationLayer | `prefabs/ui/hallows/HallowsIllustrationLayer.prefab` | 11 |
| HallowsInfoCell | `prefabs/ui/hallows/HallowsInfoCell.prefab` | 6 |
| HallowsInfoLayer | `prefabs/ui/hallows/HallowsInfoLayer.prefab` | 8 |
| HallowsResolveLayer | `prefabs/ui/hallows/HallowsResolveLayer.prefab` | 16 |
| HallowsSelectLayer | `prefabs/ui/hallows/HallowsSelectLayer.prefab` | 21 |
| HallowsUpStarLayer | `prefabs/ui/hallows/HallowsUpStarLayer.prefab` | 60 |
| RunesRecastItem | `prefabs/ui/runes/RunesRecastItem.prefab` | 19 |
| RunesRecastLayer | `prefabs/ui/runes/RunesRecastLayer.prefab` | 27 |
| RunesSelect2Cell | `prefabs/ui/runes/RunesSelect2Cell.prefab` | 2 |
| RunesSelect2Layer | `prefabs/ui/runes/RunesSelect2Layer.prefab` | 10 |
| RunesSelectCell | `prefabs/ui/runes/RunesSelectCell.prefab` | 8 |
| RunesSelectLayer | `prefabs/ui/runes/RunesSelectLayer.prefab` | 9 |
| RunesSkillLayer | `prefabs/ui/runes/RunesSkillLayer.prefab` | 12 |
| RunesTipsCell | `prefabs/ui/runes/RunesTipsCell.prefab` | 6 |
| RunesTipsLayer | `prefabs/ui/runes/RunesTipsLayer.prefab` | 10 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/common/win-bg_block-bg-16.png` | [9, 9, 9, 9] |
| `ui/common/artifact_spr-bg-2.png` | [10, 10, 10, 10] |
| `ui/common/artifacts_scroll-bg.png` | [10, 10, 10, 10] |
| `ui/common/other_spr-jdt1.png` | [0, 0, 0, 0] |
| `ui/common/win-bg_win-bg-17.png` | [9, 9, 8, 8] |
| `ui/bag/backpack-info_spr-banner-backpack-1.png` | [0, 0, 180, 0] |
| `ui/common/other_progressbar-bg.png` | [4, 4, 9, 9] |
| `ui/hero/hero-info_spr-new-7.png` | [10, 10, 10, 10] |
| `ui/common/win-bg_block-bg-17.png` | [9, 9, 9, 9] |
| `ui/common/win-bg_spot-white.png` | [1, 1, 1, 1] |
| `ui/dragon/dragon_spr-attr-bg.png` | [10, 10, 10, 10] |
| `ui/common/runes_spr-recast-bg.png` | [150, 5, 5, 5] |

由更早的 P4 PR 改（本 PR 不碰）：

- `ui/common/win-bg_cell-bg-11.png` → P4A

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-3.png` [19, 19, 19, 19]（edited by P2A）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/win-bg_win-bg-12.png` [20, 20, 15, 18]（edited by P1）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/other_kuang.png` [29, 49, 33, 39]（edited by P3A）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/shop/shop_shop_8.png` [0, 0, 15, 15]（edited by P3E2）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/hero/hero-info_spr-bg-6.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/rank_spr-cell-bg-1.png` [30, 30, 30, 30]（edited by P2A）
- `ui/common/win-bg_cell-bg-1.png` [5, 5, 5, 5]（edited by P2B）
- `ui/common/win-bg_block-bg-45.png` [19, 19, 19, 19]（edited by P2A）
- `ui/item-select/item-select_block-res.png` [15, 15, 15, 15]（edited by P2C）
- `ui/common/rank_spr-paimingk-1.png` [10, 10, 10, 10]（edited by P3A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14] | `GodArmsAttrLayer:/GodArmsAttrLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [17, 17, 17, 17] | `GodEquipSaleLayer:/GodEquipSaleLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [17, 17, 17, 17] | `GodEquipSelectSaleLayer:/GodEquipSelectSaleLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `RunesSelect2Layer:/RunesSelect2Layer/CCScale9Sprite_1` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [11, 11, 11, 11] | `GodArmsOneKeyComposeLayer:/GodArmsOneKeyComposeLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [11, 11, 11, 11] | `GodArmsOneKeyComposeTipsLayer:/GodArmsOneKeyComposeTipsLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [14, 14, 14, 14] | `RunesRecastLayer:/RunesRecastLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ArtifactSelectLayer:/ArtifactSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ArtifactTransformLayer:/ArtifactTransformLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GodArmsBackpackLayer:/GodArmsBackpackLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GodArmsCompose:/GodArmsCompose/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GodArmsComposeLayer:/GodArmsComposeLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GodEquipRareLayer:/GodEquipRareLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GodEquipSelectLayer:/GodEquipSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GodEquipShopLayer:/GodEquipShopLayer/CCNode_1/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HallowsIdentifyLayer:/HallowsIdentifyLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HallowsIllustrationLayer:/HallowsIllustrationLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HallowsSelectLayer:/HallowsSelectLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HallowsUpStarLayer:/HallowsUpStarLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RunesSkillLayer:/RunesSkillLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [74, 74, 74, 74] | `RunesSelectLayer:/RunesSelectLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ArtifactIllustrationLayer:/ArtifactIllustrationLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ArtifactSelectLayer:/ArtifactSelectLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GodArmsBackpackLayer:/GodArmsBackpackLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GodEquipSelectLayer:/GodEquipSelectLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GodEquipShopLayer:/GodEquipShopLayer/CCNode_1/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HallowsIllustrationLayer:/HallowsIllustrationLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HallowsSelectLayer:/HallowsSelectLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HallowsSelectLayer:/HallowsSelectLayer/spr_pannel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HallowsUpStarLayer:/HallowsUpStarLayer/node_info_pre/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HallowsUpStarLayer:/HallowsUpStarLayer/node_info_after/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `HallowsUpStarLayer:/HallowsUpStarLayer/node_res_need/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RunesSelect2Layer:/RunesSelect2Layer/spr_tableview_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RunesSelectLayer:/RunesSelectLayer/spr_tableview_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ArtifactTipsLayer:/ArtifactTipsLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `HallowsInfoLayer:/HallowsInfoLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `HallowsResolveLayer:/HallowsResolveLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `RunesTipsLayer:/RunesTipsLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [9, 9, 9, 9] | `GodArmsFightingLayer:/GodArmsFightingLayer/node_banner2/CCScale9Sprite_1` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [49, 9, 9, 19] | `GodEquipRareLayer:/GodEquipRareLayer/show_rare1/CCScale9Sprite_1` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [49, 9, 9, 19] | `GodEquipRareLayer:/GodEquipRareLayer/show_rare2/CCScale9Sprite_1` |
| `hero-info_spr-bg-6.png` | [60, 20, 20, 20] | [10, 10, 10, 10] | `GodArmsOneKeyComposeLayer:/GodArmsOneKeyComposeLayer/btn_content/CCScale9Sprite_1` |
| `hero-info_spr-bg-6.png` | [60, 20, 20, 20] | [10, 10, 10, 10] | `GodArmsOneKeyComposeTipsLayer:/GodArmsOneKeyComposeTipsLayer/reward_bg` |
| `win-bg_cell-bg-1.png` | [5, 5, 5, 5] | [9, 9, 9, 9] | `ArtifactIllustrationCell:/ArtifactIllustrationCell/CCScale9Sprite_1` |
| `win-bg_block-bg-45.png` | [19, 19, 19, 19] | [59, 19, 19, 19] | `ArtifactItemSelectLayer:/ArtifactItemSelectLayer/spr_bg_backpack` |
| `other_spr-jdt1.png` | [0, 0, 0, 0] | [9, 9, 9, 9] | `ArtifactTransformLayer:/ArtifactTransformLayer/node_need/res_bg_1` |
| `other_progressbar-bg.png` | [4, 4, 9, 9] | [0, 0, 9, 9] | `GodArmsComposeLayer:/GodArmsComposeLayer/resolve_node/CCScale9Sprite_1` |

## ArtifactActiveLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactActiveLayer` | ArtifactActiveLayer | [0, 0] | [0, 0] | [642, 474] | [1, 1] | 0 | 是 |  |
| `/ArtifactActiveLayer/spr_bg` | CCSprite | [321, 237] | [0.5, 0.5] | [640, 501] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_bg1.png` a85d6942-8a92-4e04-aa35-f44377c7e4d0 |
| `/ArtifactActiveLayer/CCSprite_1` | CCSprite | [319, 245] | [0.5, 0.5] | [271, 240] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_bg2.png` bff8bed8-c95b-42b1-8291-90747f335272 |
| `/ArtifactActiveLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactActiveLayer/UIMenu_1/btn_active` | UIMenuItemImage | [323, 40] | [0.5, 0.5] | [163, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/artifacts_btn-active.png` 3cf37958-2070-414a-aaab-bd017bad9f5e |
| `/ArtifactActiveLayer/UIMenu_1/btn_item` | UIMenuItemImage | [319, 231] | [0.5, 0.5] | [126, 126] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/ArtifactActiveLayer/CCScale9Sprite_1` | CCScale9Sprite | [322, 147] | [0.5, 0.5] | [240, 40] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-shadow.png` 03f50dff-cafe-42f5-b828-452d1d7e4090 |
| `/ArtifactActiveLayer/lbl_name` | UILabelTTF | [322, 147] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「x1」20 CloudYuanCuGBK.ttf rgb[250, 224, 178] |
| `/ArtifactActiveLayer/spr_res_need` | CCSprite | [386, 97] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900102.png` 0aa99264-c493-4fba-b1c2-ea9e623dd56e |
| `/ArtifactActiveLayer/lbl_res_need` | UILabelTTF | [358, 97] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」20 CloudYuanCuGBK.ttf rgb[253, 227, 180] |
| `/ArtifactActiveLayer/title` | CCSprite | [144, 403] | [0.5, 0.5] | [289, 139] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_jihuo1.png` ed580918-e8af-4dfa-8fbf-9a95523c3492 |
| `/ArtifactActiveLayer/tips` | CCSprite | [528, 402] | [0.5, 0.5] | [193, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_tips1.png` bb07ba74-764c-48a8-9c74-68266df74904 |

## ArtifactIllustrationCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactIllustrationCell` | ArtifactIllustrationCell | [0, 0] | [0, 0] | [256, 128] | [1, 1] | 0 | 是 |  |
| `/ArtifactIllustrationCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [256, 128] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-1.png` d414718f-712c-442a-876b-336f9006430d insets[10, 10, 10, 10] |
| `/ArtifactIllustrationCell/CCSprite_1` | CCSprite | [60, 64] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifact_spr-item-bg.png` 5262ff9d-71b8-45e8-bed1-ddfd2fc18762 |
| `/ArtifactIllustrationCell/spr_item_icon` | CCSprite | [60, 64] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901503.png` a8de30fc-9717-4222-91c7-b90f57e4382d |
| `/ArtifactIllustrationCell/spr_rare` | CCSprite | [32, 100] | [0.5, 0.5] | [40, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_spr-rare-4.png` def3a96a-7f6a-4378-a0dc-8539c92d1838 |
| `/ArtifactIllustrationCell/CCSprite_2` | CCSprite | [60, 25] | [0.5, 0.5] | [104, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_spr-star-bg.png` 06e96c40-0077-4e11-8c10-58d3d0fc1e9f |
| `/ArtifactIllustrationCell/spr_star_num` | CCSprite | [60, 25] | [0.5, 0.5] | [20, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_lbl-star-3.png` 129a9377-89de-42c8-9427-89367a90f687 |
| `/ArtifactIllustrationCell/lbl_name` | UILabelTTF | [120, 118] | [0, 1] | [240, 140] | [0.5, 0.5] | 0 | 是 | cc.Label「[稀有]1星防御护符」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/ArtifactIllustrationCell/spr_suit_icon` | CCSprite | [135, 25] | [0.5, 0.5] | [34, 34] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifact_spr-suit-type-1.png` 79afb657-5eed-432e-b0c7-79978d22de23 |
| `/ArtifactIllustrationCell/lbl_suit_name` | UILabelTTF | [155, 25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「防御套装」40 STZhongsong.ttf rgb[231, 117, 42] |

## ArtifactIllustrationLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactIllustrationLayer` | ArtifactIllustrationLayer | [0, 0] | [0, 0] | [620, 796] | [1, 1] | 0 | 是 |  |
| `/ArtifactIllustrationLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 816] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ArtifactIllustrationLayer/node_title` | CCNode | [310.0, 796.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactIllustrationLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ArtifactIllustrationLayer/node_title/lbl_title` | UILabelTTF | [0, -45] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装图鉴」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/ArtifactIllustrationLayer/spr_scroll_view_bg` | CCScale9Sprite | [310, 40] | [0.5, 0] | [560, 620] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ArtifactIllustrationLayer/spr_scroll_view_bg` | CCScale9Sprite | [310, 40] | [0.5, 0] | [560, 620] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-16.png` 206eb822-ff6b-4910-b380-05193b52804a insets[10, 10, 10, 10] |
| `/ArtifactIllustrationLayer/scroll_view_tab` | CCScrollView | [310, 660] | [0.5, 0] | [550, 50] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/ArtifactIllustrationLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactIllustrationLayer/CCMenu_1/btn_close` | UIMenuItemImage | [575, 770] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ArtifactIllustrationLayer/scroll_view` | UIScrollViewBackpack | [310, 50] | [0.5, 0] | [550, 600] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ArtifactItemSelectLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactItemSelectLayer` | ArtifactItemSelectLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/ArtifactItemSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, -10] | [0.5, 0.5] | [580, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ArtifactItemSelectLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-45.png` 3f91d702-2c6e-4b55-ae1d-cfe52210a84f insets[60, 20, 20, 20] |
| `/ArtifactItemSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactItemSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/ArtifactItemSelectLayer/lbl_select` | UILabelTTF | [56, 273] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」20 STZhongsong.ttf rgb[89, 53, 15] |
| `/ArtifactItemSelectLayer/node_bubble` | CCNode | [290, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactItemSelectLayer/node_bubble/lbl_go_under` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 0.5] | 0 | 是 | cc.Label「————」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/ArtifactItemSelectLayer/node_bubble/lbl_go` | UILabelTTF | [0, 12] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「快速获得」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/ArtifactItemSelectLayer/node_bubble/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactItemSelectLayer/node_bubble/CCMenu_1/btn_go` | UIMenuItemImage | [0, 12] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## ArtifactRingLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactRingLayer` | CCLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ArtifactRingLayer/CCSprite_1` | CCSprite | [0.0, 0.0] | [0, 0] | [640, 566] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/login/spr-bg.png` 13ecd2f1-e967-499b-b217-12f4a889a9f9 |
| `/ArtifactRingLayer/menu` | UIMenu | [318.0, 223.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactRingLayer/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactRingLayer/UIMenu_1/btn_active` | UIMenuItemImage | [323, 94] | [0.5, 0.5] | [163, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/artifacts_btn-active.png` 3cf37958-2070-414a-aaab-bd017bad9f5e |

## ArtifactSelectCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactSelectCell` | ArtifactSelectCell | [0, 0] | [0, 0] | [550, 160] | [1, 1] | 0 | 是 |  |
| `/ArtifactSelectCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/ArtifactSelectCell/spr_select` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[30, 30, 30, 30] |
| `/ArtifactSelectCell/menu` | CCMenu | [59, 59] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSelectCell/menu/btn_up_change` | UIMenuItemLabel | [395, 20] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「卸下」48 [255, 255, 255, 255] |
| `/ArtifactSelectCell/lbl_name` | UILabelTTF | [144, 117] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备更换」24 CloudYuanCuGBK.ttf rgb[237, 137, 54] |
| `/ArtifactSelectCell/show_attr_rich` | CCNode | [144, 106] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSelectCell/lbl_score` | UILabelTTF | [144, 77] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9级别g宝石」44 CloudYuanCuGBK.ttf rgb[32, 166, 0] |

## ArtifactSelectLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactSelectLayer` | ArtifactSelectLayer | [0, 0] | [0, 0] | [640, 748] | [1, 1] | 0 | 是 |  |
| `/ArtifactSelectLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 748] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ArtifactSelectLayer/spr_title_bg` | CCScale9Sprite | [321, 737] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ArtifactSelectLayer/lbl_name` | UILabelTTF | [320, 694] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备更换」26 STZhongsong.ttf rgb[255, 231, 195] |
| `/ArtifactSelectLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSelectLayer/CCMenu_1/btn_close` | UIMenuItemImage | [577, 710] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ArtifactSelectLayer/spr_bg` | CCScale9Sprite | [40, 61] | [0.5, 0.5] | [560, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |

## ArtifactSkillPanel（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactSkillPanel` | ArtifactSkillPanel | [0, 0] | [0, 0] | [260, 140] | [1, 1] | 0 | 是 |  |
| `/ArtifactSkillPanel/lbl_skill_name` | UILabelTTF | [83, 130] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御向」18 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/ArtifactSkillPanel/lbl_skill_desc` | UILabelTTF | [83, 119] | [0, 1] | [178, 120] | [1, 1] | 0 | 是 | cc.Label「黑暗切割者對前方單體連續攻擊3次，共造成360%物理」18 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/ArtifactSkillPanel/node` | CCNode | [40, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ArtifactSummonHistoryLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactSummonHistoryLayer` | ArtifactSummonHistoryLayer | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonHistoryLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 720] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ArtifactSummonHistoryLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 50] | [0.5, 0] | [580, 565] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/artifact_spr-bg-2.png` 8f7da894-376d-437f-9eab-9339d8a27e38 insets[10, 10, 10, 10] |
| `/ArtifactSummonHistoryLayer/node_title` | CCNode | [320.0, 700.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonHistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ArtifactSummonHistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「探宝记录」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ArtifactSummonHistoryLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonHistoryLayer/CCMenu_1/btn_close` | UIMenuItemImage | [595, 675] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ArtifactSummonHistoryLayer/lbl_tip_1` | UILabelTTF | [60, 592] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「个人记录」48 STZhongsong.ttf rgb[253, 232, 193] |
| `/ArtifactSummonHistoryLayer/lbl_tip_2` | UILabelTTF | [60, 316] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「全服记录」48 STZhongsong.ttf rgb[253, 232, 193] |
| `/ArtifactSummonHistoryLayer/scroll_view_1` | UIScrollViewBackpack | [320, 340] | [0.5, 0] | [560, 225] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ArtifactSummonHistoryLayer/scroll_view_2` | UIScrollViewBackpack | [320, 55] | [0.5, 0] | [560, 235] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ArtifactSummonLayer（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactSummonLayer` | ArtifactSummonLayer | [0, 0] | [0, 0] | [640, 910] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 930] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ArtifactSummonLayer/CCSprite_1` | CCSprite | [320, 60] | [0.5, 0] | [569, 785] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifact_spr-bg-1.png` dba6264e-31c4-47f9-938d-91b69f21ecac |
| `/ArtifactSummonLayer/node_title` | CCNode | [320.0, 910.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ArtifactSummonLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装探宝」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ArtifactSummonLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/CCMenu_1/btn_close` | UIMenuItemImage | [595, 885] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ArtifactSummonLayer/lbl_tip` | UILabelTTF | [314, 43] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「探宝提示」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/ArtifactSummonLayer/node_jump` | CCNode | [470, 760] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_jump/lbl_go_under` | UILabelTTF | [0, -12] | [0.5, 0.5] | auto | [4, 0.5] | 0 | 是 | cc.Label「——」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/ArtifactSummonLayer/node_jump/lbl_go` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「点击查看详细记录」20 STZhongsong.ttf rgb[65, 249, 46] |
| `/ArtifactSummonLayer/node_jump/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_jump/CCMenu_1/btn_go` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/ArtifactSummonLayer/node_bubble` | CCNode | [286, 585] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_bubble/spr_bubble_bg` | CCScale9Sprite | [0, 0] | [1, 0] | [300, 88] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_kuang.png` 983a72dd-8ad6-4489-83cc-eb82bf1e92f7 insets[30, 50, 35, 40] |
| `/ArtifactSummonLayer/node_bubble/CCSprite_1` | CCSprite | [156, 56] | [0.5, 0.5] | [241, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifact-lang_lbl-tip-1.png` 9a74994e-fea4-45d9-a004-5d41c8bf7789 |
| `/ArtifactSummonLayer/node_bubble/lbl_bubble_times` | UILabelTTF | [95, 53] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「8」48 STZhongsong.ttf rgb[0, 249, 0] |
| `/ArtifactSummonLayer/node_res` | CCNode | [520, 340] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_res/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_shop_3.png` e6391a62-570f-41b9-b3e3-aafbf1d08243 |
| `/ArtifactSummonLayer/node_res/spr_icon` | CCSprite | [-60, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901815.png` 926d21a9-b003-42f7-9ad2-eb9e65230eef |
| `/ArtifactSummonLayer/node_res/lbl_num` | UILabelTTF | [-13, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/ArtifactSummonLayer/node_res/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_res/CCMenu_1/btn_add` | UIMenuItemImage | [60, 0] | [0.5, 0.5] | [52, 52] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-1.png` d4d720c4-db5a-496f-ada2-cffa91e5b8d0 |
| `/ArtifactSummonLayer/node_reward` | CCNode | [320, 230] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_reward/CCSprite_1` | CCSprite | [-220, 18] | [0.5, 0.5] | [63, 134] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifact-lang_spr-reward.png` 6e83d989-86b7-481c-a64b-84b69952b4e2 |
| `/ArtifactSummonLayer/node_reward/scroll_view` | UIScrollViewBackpack | [0, -45] | [0.5, 0] | [360, 120] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/ArtifactSummonLayer/node_reward/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_reward/CCMenu_1/btn_reward_detail` | UIMenuItemImage | [220, 10] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/artifact-lang_btn-detail.png` fca9b69e-bbe4-4294-81c4-c2f35ad07d30 |
| `/ArtifactSummonLayer/node_reward/CCMenu_1/btn_summon_one` | UIMenuItemLabel | [-125, -95] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「探宝一次」44 [255, 255, 255, 255] |
| `/ArtifactSummonLayer/node_reward/CCMenu_1/btn_summon_ten` | UIMenuItemLabel | [125, -95] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「探宝十次」44 [255, 255, 255, 255] |
| `/ArtifactSummonLayer/node_reward/lbl_tip_summon_one` | UILabelTTF | [-125, -135] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「本次免费」40 STZhongsong.ttf rgb[253, 232, 193] |
| `/ArtifactSummonLayer/node_reward/lbl_tip_summon_ten_title` | UILabelTTF | [110, -135] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「消耗」40 STZhongsong.ttf rgb[253, 232, 193] |
| `/ArtifactSummonLayer/node_reward/spr_summon_ten_icon` | CCSprite | [130, -135] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/ArtifactSummonLayer/node_reward/lbl_summon_ten_num` | UILabelTTF | [146, -135] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「900」40 STZhongsong.ttf rgb[253, 232, 193] |
| `/ArtifactSummonLayer/node_reward/node_discount` | CCNode | [185, -71] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactSummonLayer/node_reward/node_discount/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [62, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-discount-bg.png` 956fc6a0-fd50-4eac-b5ca-5e51d3dc015e |
| `/ArtifactSummonLayer/node_reward/node_discount/UILabelTTF_1` | UILabelTTF | [-9, 11] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9」48 STZhongsong.ttf rgbNone |
| `/ArtifactSummonLayer/node_reward/node_discount/UILabelTTF_2` | UILabelTTF | [7, -3] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「折」40 STZhongsong.ttf rgbNone |
| `/ArtifactSummonLayer/node_reward/lbl_tip_summon_one_title` | UILabelTTF | [-140, -135] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「消耗」40 STZhongsong.ttf rgb[253, 232, 193] |
| `/ArtifactSummonLayer/node_reward/spr_summon_one_icon` | CCSprite | [-120, -135] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/ArtifactSummonLayer/node_reward/lbl_summon_one_num` | UILabelTTF | [-104, -135] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「900」40 STZhongsong.ttf rgb[253, 232, 193] |

## ArtifactTipsCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactTipsCell` | ArtifactTipsCell | [0, 0] | [0, 0] | [390, 110] | [1, 1] | 0 | 是 |  |
| `/ArtifactTipsCell/CCSprite_1` | CCSprite | [50, 55] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-runes-bg-1.png` 1e2130a2-263c-4fc6-b57e-a18c6096c15a |
| `/ArtifactTipsCell/lbl_info` | UILabelTTF | [105, 75] | [0, 1] | [480, 180] | [0.5, 0.5] | 0 | 是 | cc.Label「生命：9999
2222
2222」40 STZhongsong.ttf rgb[161, 129, 89] |
| `/ArtifactTipsCell/lbl_name` | UILabelTTF | [105, 100] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：9999」44 STZhongsong.ttf rgb[231, 117, 42] |
| `/ArtifactTipsCell/node_1` | CCNode | [50, 55] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactTipsCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactTipsCell/lbl_active` | UILabelTTF | [340, 100] | [1, 1] | auto | [1, 1] | 0 | 是 | cc.Label「生命：9999」20 CloudYuanCuGBK.ttf rgb[231, 117, 42] |

## ArtifactTipsLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactTipsLayer` | ArtifactTipsLayer | [0, 0] | [0, 0] | [390, 372] | [1, 1] | 0 | 是 |  |
| `/ArtifactTipsLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 372] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/ArtifactTipsLayer/node` | CCNode | [195.0, 369.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactTipsLayer/node/spr_rare` | CCSprite | [0, -65] | [0.5, 0.5] | [380, 127] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-banner-backpack-1.png` d53c7eef-8fc6-4dc2-8eb1-46727b30e850 |
| `/ArtifactTipsLayer/node/lbl_prop_type` | UILabelTTF | [-55, -90] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「类型：精灵」22 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/ArtifactTipsLayer/node/lbl_name` | UILabelTTF | [-55, -30] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备更换」24 CloudYuanCuGBK.ttf rgbNone |
| `/ArtifactTipsLayer/node/spr_rare1` | CCSprite | [-125, -65] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_2000001.png` 667c685c-8f73-499e-ae32-46b0491ab418 |
| `/ArtifactTipsLayer/node/spr_icon` | CCSprite | [-125, -65] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_2000001.png` 667c685c-8f73-499e-ae32-46b0491ab418 |
| `/ArtifactTipsLayer/node/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactTipsLayer/node/menu/btn_close` | UIMenuItemImage | [160, -20] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ArtifactTipsLayer/node/menu/btn_src` | UIMenuItemImage | [135, -170] | [0.5, 0.5] | [67, 55] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-src.png` fc1ffb2a-2d0e-4fd2-89fe-779b304fa5f3 |

## ArtifactTransformItem（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactTransformItem` | ArtifactTransformItem | [0, 0] | [0, 0] | [254, 405] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformItem/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [252, 405] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/artifacts_scroll-bg.png` eb25d4da-9246-4311-b891-7d1c1744ea4a insets[10, 10, 10, 10] |
| `/ArtifactTransformItem/scroll_view` | CCScrollView | [0, 0] | [0, 0] | [254, 405] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ArtifactTransformLayer（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactTransformLayer` | ArtifactTransformLayer | [0, 0] | [0, 0] | [600, 880] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 880] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ArtifactTransformLayer/node_title` | CCNode | [300, 870] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ArtifactTransformLayer/node_title/lbl_title` | UILabelTTF | [0, -43] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「精灵重生」28 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ArtifactTransformLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/menu/btn_close` | UIMenuItemImage | [531, 870] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ArtifactTransformLayer/menu/btn_transform` | UIMenuItemLabel | [300, 80] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「」24 [255, 255, 255, 255] |
| `/ArtifactTransformLayer/node_need` | CCNode | [500, 148.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/node_need/res_bg_1` | CCScale9Sprite | [-235, 0] | [0, 0.5] | [160, 35] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[10, 10, 10, 10] |
| `/ArtifactTransformLayer/node_need/spr_res_1` | CCSprite | [-235, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900102.png` 0aa99264-c493-4fba-b1c2-ea9e623dd56e |
| `/ArtifactTransformLayer/node_need/lbl_res_1` | UILabelTTF | [-210, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999/999999」22 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ArtifactTransformLayer/node_need/UILabelTTF_1` | UILabelTTF | [-320, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗」24 STZhongsong.ttf rgb[255, 227, 183] |
| `/ArtifactTransformLayer/CCSprite_1` | CCSprite | [300, 724] | [0.5, 0.5] | [85, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_spr-arrow-1.png` f1395360-7b8f-4ee0-b3cd-882a96885426 |
| `/ArtifactTransformLayer/CCSprite_2` | CCSprite | [299, 408] | [0.5, 0.5] | [31, 30] | [1, 1] | 90 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_arrow-1.png` d6b7f44e-40df-45f6-9209-96a8855bc9b4 |
| `/ArtifactTransformLayer/node_cur` | CCNode | [30, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/node_next` | CCNode | [315, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformLayer/UIMenu_1/btn_artifact_1` | UIMenuItemImage | [149, 724] | [0.5, 0.5] | [126, 126] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/ArtifactTransformLayer/UIMenu_1/btn_artifact_2` | UIMenuItemImage | [453, 724] | [0.5, 0.5] | [126, 126] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/ArtifactTransformLayer/lbl_artifact_1` | UILabelTTF | [151, 628] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「精灵重生」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/ArtifactTransformLayer/lbl_artifact_2` | UILabelTTF | [454, 628] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「精灵重生」20 CloudYuanCuGBK.ttf rgb[116, 76, 38] |

## ArtifactTransformSkill（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ArtifactTransformSkill` | ArtifactTransformSkill | [0, 0] | [0, 0] | [252, 174] | [1, 1] | 0 | 是 |  |
| `/ArtifactTransformSkill/CCSprite_1` | CCSprite | [0, 157] | [0, 0.5] | [250, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_spr-title-bg.png` 746f7b74-031f-4134-8b8e-5d4d6bcb63bc |
| `/ArtifactTransformSkill/lbl_title` | UILabelTTF | [5, 157] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999/999999」20 CloudYuanCuGBK.ttf rgb[255, 224, 178] |
| `/ArtifactTransformSkill/spr_icon` | CCSprite | [34, 75] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101050093.png` d44cd8ac-1354-4f09-bb75-7a8e8e40c271 |
| `/ArtifactTransformSkill/lbl_skill_desc` | UILabelTTF | [72, 108] | [0, 1] | [178, 120] | [1, 1] | 0 | 是 | cc.Label「黑暗切割者對前方單體連續攻擊3次，共造成360%物理」18 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/ArtifactTransformSkill/lbl_skill_name` | UILabelTTF | [72, 125] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御向」18 CloudYuanCuGBK.ttf rgb[237, 137, 49] |

## GodArmsAttrLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsAttrLayer` | GodArmsAttrLayer | [0, 0] | [0, 0] | [380, 480] | [1, 1] | 0 | 是 |  |
| `/GodArmsAttrLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [380, 480] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[15, 15, 15, 15] |

## GodArmsBackpackLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsBackpackLayer` | GodArmsBackpackLayer | [0, 0] | [0, 0] | [640, 819] | [1, 1] | 0 | 是 |  |
| `/GodArmsBackpackLayer/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, 819.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GodArmsBackpackLayer/spr_box` | CCScale9Sprite | [320.0, 691.0] | [0.5, 1] | [560, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GodArmsBackpackLayer/node_title` | CCNode | [322.0, 817.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsBackpackLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodArmsBackpackLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神兵」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/GodArmsBackpackLayer/CCNode_1` | CCNode | [578.0, 819.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsBackpackLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsBackpackLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## GodArmsCompose（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsCompose` | GodArmsComposeLayer | [0, 0] | [0, 0] | [610, 700] | [1, 1] | 0 | 是 |  |
| `/GodArmsCompose/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [610, 700] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GodArmsCompose/bg` | CCNode | [305.0, 455.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsCompose/bg/spr_scroll_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [546, 365] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-17.png` aef93588-9927-4538-b634-59beaf3f2a7d insets[10, 10, 10, 10] |
| `/GodArmsCompose/bg/CCSprite_1` | CCSprite | [0.0, 102.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** crusade-group/spr-banner-1.png |
| `/GodArmsCompose/bg/CCSprite_2` | CCSprite | [0.0, -226.023] | [0.5, 0.5] | [411, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-bg-title.png` 2de97cba-b9e9-48ec-986d-5ac4fc1d0577 |
| `/GodArmsCompose/bg/lbl_attribute` | UILabelTTF | [-192.845, -15.117] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/bg/lbl_attribute` | UILabelTTF | [-192.845, -56.589] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/bg/lbl_attribute` | UILabelTTF | [-192.845, -95.987] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/bg/lbl_attribute` | UILabelTTF | [-190.771, -143.68] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/bg/lbl_attribute` | UILabelTTF | [4.147, -282.611] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「大师傅大u发放让司法考试地方·」20 CloudYuanCuGBK.ttf rgb[113, 78, 45] |
| `/GodArmsCompose/bg/lbl_attribute` | UILabelTTF | [6.221, -224.551] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神兵描述」20 CloudYuanCuGBK.ttf rgb[113, 78, 45] |
| `/GodArmsCompose/bg/CCSprite_3` | CCSprite | [-175.0, 100.0] | [0.5, 0.5] | [132, 132] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsCompose/bg/CCScale9Sprite_1` | CCScale9Sprite | [-175.0, 100.0] | [0.5, 0.5] | [106, 106] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/GodArmsCompose/bg/lbl_quality` | UILabelTTF | [89.165, 84.416] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「品质蓝」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/bg/equip_num` | UILabelTTF | [91.238, 47.091] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「背包有是一件」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/bg/lbl_title` | UILabelTTF | [82.944, 138.33] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Name」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsCompose/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsCompose/CCMenu_1/btn_close` | UIMenuItemImage | [545, 668] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodArmsCompose/CCMenu_1/CCMenuItemLabel_1` | CCMenuItemLabel | [305, 100] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsCompose/CCSprite_1` | CCSprite | [380, 590] | [0.5, 0.5] | [324, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar.png` b54e8cdd-24ba-4a35-80bf-dd8dbfbbe9cf |

## GodArmsComposeLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsComposeLayer` | GodArmsComposeLayer | [0, 0] | [0, 0] | [610, 700] | [1, 1] | 0 | 是 |  |
| `/GodArmsComposeLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [610, 700] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GodArmsComposeLayer/bg` | CCNode | [305.0, 455.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsComposeLayer/bg/spr_scroll_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [546, 365] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-17.png` aef93588-9927-4538-b634-59beaf3f2a7d insets[10, 10, 10, 10] |
| `/GodArmsComposeLayer/bg/CCSprite_1` | CCSprite | [0.0, 102.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE **缺图** crusade-group/spr-banner-1.png |
| `/GodArmsComposeLayer/bg/spr_quality` | CCScale9Sprite | [1.0, 103.0] | [0.5, 0.5] | [537, 152] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/bag/backpack-info_spr-banner-backpack-1.png` d53c7eef-8fc6-4dc2-8eb1-46727b30e850 insets[0, 0, 180, 0] |
| `/GodArmsComposeLayer/bg/CCSprite_2` | CCSprite | [0.0, -226.023] | [0.5, 0.5] | [411, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-bg-title.png` 2de97cba-b9e9-48ec-986d-5ac4fc1d0577 |
| `/GodArmsComposeLayer/bg/lbl_attribute_1` | UILabelTTF | [-175.0, -15.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/lbl_attribute_2` | UILabelTTF | [95.0, -15.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/lbl_attribute_3` | UILabelTTF | [-175.0, -55.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/lbl_attribute_4` | UILabelTTF | [95.0, -55.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/lbl_attribute_5` | UILabelTTF | [-175.0, -95.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/lbl_attribute_6` | UILabelTTF | [95.0, -95.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「宝石镶嵌」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/lbl_describe` | UILabelTTF | [4.147, -282.611] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「大师傅大u发放让司法考试地方·」20 CloudYuanCuGBK.ttf rgb[113, 78, 45] |
| `/GodArmsComposeLayer/bg/lbl_describe_title` | UILabelTTF | [6.0, -225.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神兵描述」20 CloudYuanCuGBK.ttf rgb[113, 78, 45] |
| `/GodArmsComposeLayer/bg/CCSprite_3` | CCSprite | [-175.0, 100.0] | [0.5, 0.5] | [132, 132] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsComposeLayer/bg/lbl_quality` | UILabelTTF | [89.165, 84.416] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「品质蓝」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/equip_num` | UILabelTTF | [91.238, 47.091] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「背包有是一件」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/CCSprite_4` | CCSprite | [84.0, 137.0] | [0.5, 0.5] | [324, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar.png` b54e8cdd-24ba-4a35-80bf-dd8dbfbbe9cf |
| `/GodArmsComposeLayer/bg/lbl_title` | UILabelTTF | [82.944, 138.33] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Name」20 CloudYuanCuGBK.ttf rgb[216, 195, 152] |
| `/GodArmsComposeLayer/bg/spr_node` | CCNode | [-175.0, 100.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsComposeLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsComposeLayer/CCMenu_1/btn_close` | UIMenuItemImage | [545, 668] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodArmsComposeLayer/CCMenu_1/btn_compose` | UIMenuItemLabel | [306, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「合成方式」48 [255, 255, 255, 255] |
| `/GodArmsComposeLayer/resolve_node` | CCNode | [37, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsComposeLayer/resolve_node/lbl_resolve_name` | CCLabelTTF | [168, 105] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「分解获得:」16 CloudYuanCuGBK.ttf rgb[132, 96, 58] |
| `/GodArmsComposeLayer/resolve_node/CCScale9Sprite_1` | CCScale9Sprite | [248, 105] | [0, 0.5] | [116, 20] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[0, 0, 10, 10] |
| `/GodArmsComposeLayer/resolve_node/CCSprite_1` | CCSprite | [248, 105] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsComposeLayer/resolve_node/lbl_resolve_num` | CCLabelTTF | [306, 105] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」14 CloudYuanCuGBK.ttf rgbNone |

## GodArmsEquipTipsLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsEquipTipsLayer` | GodArmsEquipTipsLayer | [0, 0] | [0, 0] | [530, 340] | [1, 1] | 0 | 是 |  |
| `/GodArmsEquipTipsLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [530, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/GodArmsEquipTipsLayer/lbl_content` | CCLabelTTF | [265.0, 221.104] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Sample Text」24 CloudYuanCuGBK.ttf rgb[123, 27, 4] |
| `/GodArmsEquipTipsLayer/node_title` | CCNode | [265.453, 331.656] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsEquipTipsLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/GodArmsEquipTipsLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「确 认」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodArmsEquipTipsLayer/menu` | UIMenu | [265.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsEquipTipsLayer/menu/btn_confirm` | UIMenuItemLabel | [0, 65] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |
| `/GodArmsEquipTipsLayer/node_skip` | CCNode | [265.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsEquipTipsLayer/node_skip/CCSprite_1` | CCSprite | [-72, 138] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/GodArmsEquipTipsLayer/node_skip/lbl_skip` | UILabelTTF | [-40, 140] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Sample Text」24 CloudYuanCuGBK.ttf rgb[112, 36, 17] |
| `/GodArmsEquipTipsLayer/node_skip/CCMenu_1` | CCMenu | [-72, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsEquipTipsLayer/node_skip/CCMenu_1/btn_skip` | UIMenuItemCheckBox | [0, 138] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |

## GodArmsFightingLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsFightingLayer` | GodArmsFightingLayer | [0, 0] | [0, 0] | [350, 160] | [1, 1] | 0 | 是 |  |
| `/GodArmsFightingLayer/node_banner2` | CCNode | [0.0, 0.0] | [0, 0] | [350, 160] | [1, 1] | 0 | 是 |  |
| `/GodArmsFightingLayer/node_banner2/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [350, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[10, 10, 10, 10] |
| `/GodArmsFightingLayer/node_banner2/lbl_name_1` | UILabelTTF | [30, 130] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础总战力：」24 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GodArmsFightingLayer/node_banner2/lbl_name_2` | UILabelTTF | [32.12, 80] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「圣物加成总战力：」24 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GodArmsFightingLayer/node_banner2/lbl_name_3` | UILabelTTF | [32.12, 30] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「提升百分比：」24 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GodArmsFightingLayer/node_banner2/lbl_num_1` | UILabelTTF | [230, 130] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1」24 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GodArmsFightingLayer/node_banner2/lbl_num_2` | UILabelTTF | [230, 80] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2」24 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GodArmsFightingLayer/node_banner2/lbl_num_3` | UILabelTTF | [230, 30] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「3」24 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## GodArmsLayer（111）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsLayer` | GodArmsLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/spr_bg` | CCSprite | [320, 640] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/shenbing-main-bg.png` b6e03b2c-3340-4b18-9218-7420f721d96d |
| `/GodArmsLayer/job_bg` | CCSprite | [321.44, 888] | [0.5, 0.5] | [442, 302] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-shade-3.png` 530a799c-0720-4779-9df8-2773d61f56be |
| `/GodArmsLayer/top` | CCNode | [320.0, 1160.0] | [0.5, 1] | [640.0, 80] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/top/job_title` | CCSprite | [0.0, -40.0] | [0.5, 0.5] | [276, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-blue-8.png` 692fa226-f6fa-4d16-871f-6d2adec4cbd5 |
| `/GodArmsLayer/top/lbl_title` | UILabelTTF | [0.0, -40.0] | [0.5, 0.5] | auto | [1.1485, 1] | 0 | 是 | cc.Label「战士-哎呀的勇气」22 FZCSJW--GB1-0.ttf rgbNone |
| `/GodArmsLayer/top/node_back` | CCNode | [224.0, -40.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/top/node_back/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/top/node_back/CCMenu_1/btn_back` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/GodArmsLayer/top/item_num_node` | CCNode | [0.0, -96.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/top/item_num_node/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/top/item_num_node/material_num` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/GodArmsLayer/top/item_num_node/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/top/item_num_node/CCMenu_1/btn_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/content` | CCNode | [320.0, 858.0] | [0.5, 0.5] | [640.0, 384.0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg` | CCNode | [0.0, -219.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/effect_node` | CCNode | [0, 225] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/equip_bg_1` | CCSprite | [-185, 360] | [0.5, 0.5] | [132, 132] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/equip_bg_2` | CCSprite | [-230, 225] | [0.5, 0.5] | [132, 132] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/equip_bg_3` | CCSprite | [-185, 75] | [0.5, 0.5] | [132, 132] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/equip_bg_4` | CCSprite | [185, 360] | [0.5, 0.5] | [132, 132] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/equip_bg_5` | CCSprite | [231.2, 225] | [0.5, 0.5] | [132, 132] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/equip_bg_6` | CCSprite | [185, 75] | [0.5, 0.5] | [132, 132] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/CCSprite_1` | CCSprite | [0, 225] | [0.5, 0.5] | [132, 132] | [1.05, 1.05] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-equip-bg.png` 4200a568-6f55-4809-8608-fdc0cc57aec9 |
| `/GodArmsLayer/content/node_bg/bg/equip_node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/btn_equip_1` | CCMenu | [-185, 360] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/btn_equip_2` | CCMenu | [-230, 225] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/btn_equip_3` | CCMenu | [-185, 75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/btn_equip_4` | CCMenu | [185, 360] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/btn_equip_5` | CCMenu | [230, 225] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/bg/btn_equip_6` | CCMenu | [185, 75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/lbl_lv` | UILabelTTF | [0, 150] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「4级」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/node_bg/menu_checkpoint` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/node_bg/menu_checkpoint/btn_job_icon` | UIMenuItemLabel | [0, 225] | [0.5, 0.5] | [65, 65] | [1.3, 1.3] | 0 | 是 | cc.Button+cc.Sprite normal `ui/crusade-group/crusade-group_job-1-5.png` 22c61465-bae4-4f0e-a6a6-a53083410944 · Label「」24 [122, 71, 45, 255] |
| `/GodArmsLayer/content/node_bg/menu_checkpoint/btn_up` | UIMenuItemLabel | [0, 60] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「升级」48 [255, 255, 255, 255] |
| `/GodArmsLayer/content/node_bg/lbl_compose_1` | UILabelTTF | [-185, 360] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「可合成」19 CloudYuanCuGBK.ttf rgb[86, 232, 34] |
| `/GodArmsLayer/content/node_bg/lbl_compose_2` | UILabelTTF | [-230, 225] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「可合成」19 CloudYuanCuGBK.ttf rgb[86, 232, 34] |
| `/GodArmsLayer/content/node_bg/lbl_compose_3` | UILabelTTF | [-185, 75] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「可合成」19 CloudYuanCuGBK.ttf rgb[86, 232, 34] |
| `/GodArmsLayer/content/node_bg/lbl_compose_4` | UILabelTTF | [185, 360] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「可合成」19 CloudYuanCuGBK.ttf rgb[86, 232, 34] |
| `/GodArmsLayer/content/node_bg/lbl_compose_5` | UILabelTTF | [230, 225] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「可合成」19 CloudYuanCuGBK.ttf rgb[86, 232, 34] |
| `/GodArmsLayer/content/node_bg/lbl_compose_6` | UILabelTTF | [185, 75] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「可合成」19 CloudYuanCuGBK.ttf rgb[86, 232, 34] |
| `/GodArmsLayer/content/item_node` | CCNode | [0.0, -192.0] | [0, 0] | [640, 0.0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_1` | CCNode | [-185, 267.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_1/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/content/item_node/item_need_num_node_1/item_need_num_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/item_node/item_need_num_node_1/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_1/CCMenu_1/spr_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/content/item_node/item_need_num_node_2` | CCNode | [-230, 132.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_2/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/content/item_node/item_need_num_node_2/item_need_num_2` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/item_node/item_need_num_node_2/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_2/CCMenu_1/spr_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/content/item_node/item_need_num_node_3` | CCNode | [-185, -18.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_3/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/content/item_node/item_need_num_node_3/item_need_num_3` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/item_node/item_need_num_node_3/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_3/CCMenu_1/spr_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/content/item_node/item_need_num_node_4` | CCNode | [185, 267.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_4/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/content/item_node/item_need_num_node_4/item_need_num_4` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/item_node/item_need_num_node_4/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_4/CCMenu_1/spr_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/content/item_node/item_need_num_node_5` | CCNode | [230, 132.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_5/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/content/item_node/item_need_num_node_5/item_need_num_5` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/item_node/item_need_num_node_5/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_5/CCMenu_1/spr_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/content/item_node/item_need_num_node_6` | CCNode | [185, -18.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_6/item_num_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [116, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsLayer/content/item_node/item_need_num_node_6/item_need_num_6` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」20 Helvetica rgb[254, 255, 255] |
| `/GodArmsLayer/content/item_node/item_need_num_node_6/CCMenu_1` | CCMenu | [-60, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/content/item_node/item_need_num_node_6/CCMenu_1/spr_item` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsLayer/bottom` | CCNode | [320.0, 320.0] | [0.5, 0.5] | [640.0, 620] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/atk_node` | CCNode | [0.0, 280.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/atk_node/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [379, 85] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-power-bg.png` 03ac255c-8b8e-4bb6-a99f-241d8d70eae4 |
| `/GodArmsLayer/bottom/atk_node/CCSprite_2` | CCSprite | [133.0, 1.0] | [0.5, 0.5] | [22, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_levelup-zhanli.png` 6b0515f6-433a-4a8b-963a-a8672082523e |
| `/GodArmsLayer/bottom/atk_node/att_percentage` | UILabelTTF | [20, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」22 CloudYuanCuGBK.ttf rgbNone |
| `/GodArmsLayer/bottom/atk_node/CCMenu_1` | CCMenu | [-100, 9] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/atk_node/CCMenu_1/btn_att` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/GodArmsLayer/bottom/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 245.0] | [0.5, 0.5] | [500, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/GodArmsLayer/bottom/CCScale9Sprite_2` | CCScale9Sprite | [0.0, 112.0] | [0.5, 0.5] | [500, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/GodArmsLayer/bottom/scrollview` | UIScrollViewBackpack | [-225.0, 114.0] | [0, 0] | [450, 130] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/GodArmsLayer/bottom/job_node` | CCMenu | [-320.0, -310.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/job_node/job_1` | UIMenuItemTab | [80, 395] | [0.5, 0.5] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「战士」48 [122, 71, 45, 255] |
| `/GodArmsLayer/bottom/job_node/job_2` | UIMenuItemTab | [210, 395] | [0.5, 0.5] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「法师」48 [122, 71, 45, 255] |
| `/GodArmsLayer/bottom/job_node/job_3` | UIMenuItemTab | [340, 395] | [0.5, 0.5] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「牧师」48 [122, 71, 45, 255] |
| `/GodArmsLayer/bottom/job_node/job_4` | UIMenuItemTab | [470, 395] | [0.5, 0.5] | [111, 43] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-23.png` 43e87ffb-d7f8-435e-be92-3db6f918d938 pressed `ui/common/button_btn-tab-24.png` 7c4a7018-cbbf-4184-8927-4037564d6c79 · Label「坦克」48 [122, 71, 45, 255] |
| `/GodArmsLayer/bottom/job_node/btn_backpack` | UIMenuItemLabel | [583.568, 440.56] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/crusade-group/crusade-group_btn-bag.png` d4a81317-e370-4be1-a377-1b6571d92e22 · Label「神兵背」40 [255, 255, 255, 255] |
| `/GodArmsLayer/bottom/attribute` | CCNode | [0.0, -310.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/attribute/CCScale9Sprite_1` | CCScale9Sprite | [0, 250] | [0.5, 0.5] | [620, 250] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-new-7.png` 9e279cb8-a44a-48b9-9a67-34c7fd9ec97b insets[10, 10, 10, 10] |
| `/GodArmsLayer/bottom/attribute/CCSprite_1` | CCSprite | [-83.0, 330] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-attack-bg.png` befbe4d4-c9b7-4a0e-a20d-c214a0b3115d |
| `/GodArmsLayer/bottom/attribute/CCSprite_1/lbl_atk` | UILabelTTF | [-55.0, 1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击」22 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsLayer/bottom/attribute/CCSprite_1/atk_num` | UILabelTTF | [5.0, 1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」22 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsLayer/bottom/attribute/CCSprite_2` | CCSprite | [180, 330] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-hp-bg.png` 25385ad4-99bb-4379-a9db-9bff61705baf |
| `/GodArmsLayer/bottom/attribute/CCSprite_2/lbl_hp` | UILabelTTF | [-55.0, 1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「shen」22 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsLayer/bottom/attribute/CCSprite_2/hp_num` | UILabelTTF | [3.8, 1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000」22 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsLayer/bottom/attribute/CCSprite_3` | CCSprite | [-83, 270.0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/GodArmsLayer/bottom/attribute/CCSprite_3/lbl_defence` | UILabelTTF | [-55.0, 1.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsLayer/bottom/attribute/CCSprite_3/defence_num` | UILabelTTF | [2.6, -0.2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」22 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsLayer/bottom/attribute/CCScale9Sprite_2` | CCScale9Sprite | [0, 187.0] | [0.5, 0.5] | [480, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-bg.png` 4e76d360-17a5-43d4-9ecb-717740fa8d49 |
| `/GodArmsLayer/bottom/attribute/CCSprite_4` | CCSprite | [-100, 187] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |
| `/GodArmsLayer/bottom/attribute/spr_job` | CCSprite | [-160, 187] | [0.5, 0.5] | [65, 65] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_job-1-5.png` 22c61465-bae4-4f0e-a6a6-a53083410944 |
| `/GodArmsLayer/bottom/attribute/CCMenu_1` | CCMenu | [-320, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/attribute/CCMenu_1/btn_attribute` | UIMenuItemLabel | [100, 323] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-share_spr-attr.png` 7c0303d5-d19b-4580-8eee-1340695c6ef2 · Label「」24 [255, 255, 255, 255] |
| `/GodArmsLayer/bottom/attribute/skill_1` | CCMenu | [-35, 187] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/attribute/skill_2` | CCMenu | [57, 187] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/attribute/skill_3` | CCMenu | [155, 187] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsLayer/bottom/attribute/spr_lock_1` | CCSprite | [-35, 188] | [0.5, 0.5] | [30, 36] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/common/other_spr-lock.png` b884e855-a007-4db0-bccf-6749fa9f5fe6 |
| `/GodArmsLayer/bottom/attribute/spr_lock_2` | CCSprite | [57, 188] | [0.5, 0.5] | [30, 36] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/common/other_spr-lock.png` b884e855-a007-4db0-bccf-6749fa9f5fe6 |
| `/GodArmsLayer/bottom/attribute/spr_lock_3` | CCSprite | [155, 188] | [0.5, 0.5] | [30, 36] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/common/other_spr-lock.png` b884e855-a007-4db0-bccf-6749fa9f5fe6 |

## GodArmsOneKeyComposeLayer（55）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsOneKeyComposeLayer` | GodArmsOneKeyComposeLayer | [0, 0] | [0, 0] | [528, 592] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/CCScale9Sprite_1` | CCScale9Sprite | [264.0, 296.0] | [0.5, 0.5] | [528, 590] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[12, 12, 12, 12] |
| `/GodArmsOneKeyComposeLayer/node_title` | CCNode | [264, 592] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodArmsOneKeyComposeLayer/node_title/lbl_title` | UILabelTTF | [0, -39] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「合成方式」24 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodArmsOneKeyComposeLayer/btn_node` | CCNode | [264.0, 592.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_node/btn_1` | CCMenu | [-200, -115] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_node/btn_2` | CCMenu | [-100, -115] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_node/btn_3` | CCMenu | [0, -115] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_node/btn_4` | CCMenu | [100, -115] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_node/btn_5` | CCMenu | [200, -115] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_node/spr_seleted` | CCSprite | [-200, -115] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-seleted.png` 0793107a-44d0-4a2f-8349-2f8e6ef113e0 |
| `/GodArmsOneKeyComposeLayer/btn_content` | CCNode | [264.0, 268.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [480, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[10, 10, 10, 10] |
| `/GodArmsOneKeyComposeLayer/btn_content/lbl_bg` | CCSprite | [0, 113.0] | [0.5, 0.5] | [324, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar.png` b54e8cdd-24ba-4a35-80bf-dd8dbfbbe9cf |
| `/GodArmsOneKeyComposeLayer/btn_content/lbl_name` | CCLabelTTF | [0, 113] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「刚毅之心」24 CloudYuanCuGBK.ttf rgbNone |
| `/GodArmsOneKeyComposeLayer/btn_content/CCSprite_1` | CCSprite | [0, 32.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-seleted.png` 0793107a-44d0-4a2f-8349-2f8e6ef113e0 |
| `/GodArmsOneKeyComposeLayer/btn_content/line_2` | CCScale9Sprite | [0, -15.802] | [0, 0.5] | [20, 5] | [1, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/line_width` | CCScale9Sprite | [0, -35] | [0.5, 0.5] | [5, 5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/btn_compose_equip` | CCMenu | [0, 32] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_1_1` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_2_1` | CCNode | [-50, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_2_2` | CCNode | [50, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_3_1` | CCNode | [-100, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_3_2` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_3_3` | CCNode | [100, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_4_1` | CCNode | [-150, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_4_2` | CCNode | [-50, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_4_3` | CCNode | [50, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_pos_4_4` | CCNode | [150, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_1/line_2` | CCScale9Sprite | [0, -35] | [0, 0.5] | [20, 5] | [1, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_2/line_1` | CCScale9Sprite | [-50, -35] | [0, 0.5] | [20, 5] | [1.2298, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_2/line_1` | CCScale9Sprite | [50, -35] | [0, 0.5] | [20, 5] | [1.2298, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_3/line_1` | CCScale9Sprite | [100, -35] | [0, 0.5] | [20, 5] | [1.2298, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_3/line_1` | CCScale9Sprite | [-100, -35] | [0, 0.5] | [20, 5] | [1.2298, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_3/line_2` | CCScale9Sprite | [0, -35] | [0, 0.5] | [20, 5] | [1, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_4/line_1` | CCScale9Sprite | [150, -35] | [0, 0.5] | [20, 5] | [1.2298, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_4/line_1` | CCScale9Sprite | [-150, -35] | [0, 0.5] | [20, 5] | [1.2298, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_4/line_2` | CCScale9Sprite | [-50, -35] | [0, 0.5] | [20, 5] | [1, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/node_line_4/line_2` | CCScale9Sprite | [50, -35] | [0, 0.5] | [20, 5] | [1, 1] | -90 | 是 | cc.Sprite SLICED `ui/common/other_spr-jdt1.png` 17e9baef-e446-43c8-943f-3f3a373b8427 insets[1, 1, 1, 1] |
| `/GodArmsOneKeyComposeLayer/btn_content/btn_material_show_1` | CCMenu | [-100, -75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/btn_material_show_2` | CCMenu | [0, -75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/btn_material_show_3` | CCMenu | [100, -75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/btn_content/btn_material_show_4` | CCMenu | [100, -75] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/CCNode_1` | CCNode | [264.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeLayer/CCNode_1/menu/btn_close` | UIMenuItemImage | [219, 592] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodArmsOneKeyComposeLayer/CCNode_1/menu/btn_one_key` | UIMenuItemLabel | [0, 40] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「合成神兵」48 [255, 255, 255, 255] |
| `/GodArmsOneKeyComposeLayer/CCNode_1/spr_compose_need_num` | CCScale9Sprite | [0, 86] | [0.5, 0.5] | [150, 25] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_progressbar-bg.png` a50b3b20-80ff-4a6c-9763-809445b7fed7 insets[5, 5, 10, 10] |
| `/GodArmsOneKeyComposeLayer/CCNode_1/CCSprite_1` | CCSprite | [-80, 88] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_902048.png` 787111d8-12e4-4d15-8050-fe9010381644 |
| `/GodArmsOneKeyComposeLayer/CCNode_1/compose_need_num` | CCLabelTTF | [0, 86] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000/100」20 CloudYuanCuGBK.ttf rgbNone |

## GodArmsOneKeyComposeTipsLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodArmsOneKeyComposeTipsLayer` | GodArmsOneKeyComposeTipsLayer | [0, 0] | [0, 0] | [530, 410] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeTipsLayer/CCScale9Sprite_1` | CCScale9Sprite | [265.0, 205.0] | [0.5, 0.5] | [530, 410] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[12, 12, 12, 12] |
| `/GodArmsOneKeyComposeTipsLayer/node_title` | CCNode | [265.0, 410.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeTipsLayer/node_title/spr_title_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodArmsOneKeyComposeTipsLayer/node_title/lbl_title` | UILabelTTF | [0.0, -39.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「一键合成」24 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodArmsOneKeyComposeTipsLayer/reward_bg` | CCScale9Sprite | [265.0, 234.0] | [0.5, 0.5] | [450, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[10, 10, 10, 10] |
| `/GodArmsOneKeyComposeTipsLayer/CCNode_1` | CCNode | [265.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeTipsLayer/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodArmsOneKeyComposeTipsLayer/CCNode_1/menu/btn_close` | UIMenuItemImage | [189, 410] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodArmsOneKeyComposeTipsLayer/CCNode_1/menu/btn_confirm` | UIMenuItemLabel | [100, 40] | [0.5, 0.5] | [136, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确定」48 [255, 255, 255, 255] |
| `/GodArmsOneKeyComposeTipsLayer/CCNode_1/menu/btn_remove` | UIMenuItemLabel | [-106, 40] | [0.5, 0.5] | [136, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「取消」48 [255, 255, 255, 255] |
| `/GodArmsOneKeyComposeTipsLayer/CCNode_1/lbl_show` | UILabelTTF | [0, 87] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「合成需要消耗以上资源，是否确定合成？」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/GodArmsOneKeyComposeTipsLayer/CCScrollView_1` | CCScrollView | [65, 157] | [0, 0] | [400, 150] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask BOTH |

## GodEquipPromotionLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodEquipPromotionLayer` | GodEquipPromotionLayer | [0, 0] | [0, 0] | [600, 540] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 540] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/GodEquipPromotionLayer/CCSprite_1` | CCSprite | [300, 290] | [0.5, 0.5] | [542, 322] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-bg.png` 0852ef98-bc35-48e3-9f29-df1c1167aefe |
| `/GodEquipPromotionLayer/node_title` | CCNode | [299.984, 534.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/GodEquipPromotionLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「羁绊选择」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodEquipPromotionLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/CCMenu_1/btn_close` | UIMenuItemImage | [545, 505] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodEquipPromotionLayer/CCMenu_1/btn_1` | UIMenuItemLabel | [300, 80] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「已激活」50 [255, 255, 255, 255] |
| `/GodEquipPromotionLayer/CCMenu_1/btn_2` | UIMenuItemLabel | [300, 80] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「前往激活」50 [255, 255, 255, 255] |
| `/GodEquipPromotionLayer/show_node_1` | CCNode | [155, 222] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/show_node_1/show_node_menu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/show_node_2` | CCNode | [306, 270] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/show_node_2/show_node_menu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/show_node_3` | CCNode | [446, 238] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipPromotionLayer/show_node_3/show_node_menu_3` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## GodEquipRareLayer（74）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodEquipRareLayer` | GodEquipRareLayer | [0, 0] | [0, 0] | [640, 900] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/spr_bg` | CCScale9Sprite | [321, 0] | [0.5, 0] | [640, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GodEquipRareLayer/node_title` | CCNode | [320, 882] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodEquipRareLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装洗练」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodEquipRareLayer/show_ori_attr` | CCNode | [320, 717] | [0.5, 0.5] | [600, 200] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_ori_attr/CCSprite_1` | CCSprite | [0.0, 8.0] | [0.5, 0.5] | [324, 185] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-tu.png` 34c17533-c1e6-404f-ab8e-dfe088845ed3 |
| `/GodEquipRareLayer/show_ori_attr/show_item` | CCNode | [0.0, 18.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_ori_attr/show_name` | CCSprite | [0.0, -64.0] | [0.5, 0.5] | [223, 39] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-btk.png` 6723067e-85c2-431d-ac7c-6d72c46eef6b |
| `/GodEquipRareLayer/show_ori_attr/ori_name` | CCLabelTTF | [0.0, -63.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Sample Text575676586」22 STZhongsong.ttf rgb[255, 232, 193] |
| `/GodEquipRareLayer/show_ori_attr/CCLabelTTF_1` | CCLabelTTF | [-227.0, -117.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_ori_attr/show_attr_text` | CCLabelTTF | [-83.0, -117.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_ori_attr/show_attr_image` | CCSprite | [-104.0, -119.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/GodEquipRareLayer/show_rare1` | CCNode | [320, 470] | [0.5, 0.5] | [600, 160] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/CCScale9Sprite_1` | CCScale9Sprite | [0.0, -50.0] | [0.5, 0] | [560, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[50, 10, 10, 20] |
| `/GodEquipRareLayer/show_rare1/show_text1` | CCLabelTTF | [-266.0, 86.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「随机属性[洗练前]」22 STZhongsong.ttf rgb[255, 232, 193] |
| `/GodEquipRareLayer/show_rare1/show_rich` | CCNode | [255.0, 86.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_attr_1` | CCNode | [-246.0, 39.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_attr_1/show_attr_now_image_1` | CCSprite | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/GodEquipRareLayer/show_rare1/show_attr_1/show_attr_now_name_1` | CCLabelTTF | [61, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_attr_1/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_attr_1/UIMenu_1/show_attr_now_lock_1` | UIMenuItemCheckBox | [387, 0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/GodEquipRareLayer/show_rare1/show_attr_1/CCLabelTTF_1` | CCLabelTTF | [413, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「锁定属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_attr_1/show_attr_now_pro_1` | CCSprite | [213, 0] | [0.5, 0.5] | [185, 19] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-jdt1.png` 65d41551-bc36-476d-af5d-42fcabe5fd57 |
| `/GodEquipRareLayer/show_rare1/show_attr_1/show_now_text_1` | CCLabelTTF | [206, 1] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「锁定属性」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/GodEquipRareLayer/show_rare1/show_attr_2` | CCNode | [-246.0, -15.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_attr_2/show_attr_now_image_2` | CCSprite | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/GodEquipRareLayer/show_rare1/show_attr_2/show_attr_now_name_2` | CCLabelTTF | [61, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_attr_2/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_attr_2/UIMenu_1/show_attr_now_lock_2` | UIMenuItemCheckBox | [387, 0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/GodEquipRareLayer/show_rare1/show_attr_2/CCLabelTTF_1` | CCLabelTTF | [413, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「锁定属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_attr_2/show_attr_now_pro_2` | CCSprite | [213, 0] | [0.5, 0.5] | [185, 19] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-jdt1.png` 65d41551-bc36-476d-af5d-42fcabe5fd57 |
| `/GodEquipRareLayer/show_rare1/show_attr_2/show_now_text_2` | CCLabelTTF | [206, 1] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「锁定属性」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/GodEquipRareLayer/show_rare1/show_1` | CCNode | [-246.0, 39.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_1/CCLabelTTF_1` | CCLabelTTF | [-8, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_1/CCLabelTTF_2` | CCLabelTTF | [413, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_1/CCLabelTTF_3` | CCLabelTTF | [182, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_2` | CCNode | [-246.0, -15.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare1/show_2/CCLabelTTF_1` | CCLabelTTF | [-8, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_2/CCLabelTTF_2` | CCLabelTTF | [413, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare1/show_2/CCLabelTTF_3` | CCLabelTTF | [182, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/CCSprite_1` | CCSprite | [320, 396] | [0.5, 0.5] | [32, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-dx.png` 67106820-25f8-4c26-88b5-cc4c9fb2915d |
| `/GodEquipRareLayer/show_rare2` | CCNode | [320, 253] | [0.5, 0.5] | [600, 160] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, -41.0] | [0.5, 0] | [560, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[50, 10, 10, 20] |
| `/GodEquipRareLayer/show_rare2/show_text1` | CCLabelTTF | [-266.0, 96.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「随机属性[洗练后]」22 STZhongsong.ttf rgb[255, 232, 193] |
| `/GodEquipRareLayer/show_rare2/show_attr_new_1` | CCNode | [-246.0, 39.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare2/show_attr_new_1/show_attr_new_image_1` | CCSprite | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/GodEquipRareLayer/show_rare2/show_attr_new_1/show_attr_new_name_1` | CCLabelTTF | [61, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_attr_new_1/show_attr_new_pro_1` | CCSprite | [213, 0] | [0.5, 0.5] | [185, 19] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-jdt1.png` 65d41551-bc36-476d-af5d-42fcabe5fd57 |
| `/GodEquipRareLayer/show_rare2/show_attr_new_1/show_new_text_1` | CCLabelTTF | [206, 1] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「锁定属性」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/GodEquipRareLayer/show_rare2/show_attr_new_2` | CCNode | [-246.0, -15.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare2/show_attr_new_2/show_attr_new_image_2` | CCSprite | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/GodEquipRareLayer/show_rare2/show_attr_new_2/show_attr_new_name_2` | CCLabelTTF | [61, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「基础属性」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_attr_new_2/show_attr_new_pro_2` | CCSprite | [213, 0] | [0.5, 0.5] | [185, 19] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/god-equip_spr-jdt1.png` 65d41551-bc36-476d-af5d-42fcabe5fd57 |
| `/GodEquipRareLayer/show_rare2/show_attr_new_2/show_new_text_2` | CCLabelTTF | [206, 1] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「锁定属性」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/GodEquipRareLayer/show_rare2/show_new_1` | CCNode | [-246.0, 39.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare2/show_new_1/CCLabelTTF_1` | CCLabelTTF | [-8, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_new_1/CCLabelTTF_2` | CCLabelTTF | [413, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_new_1/CCLabelTTF_3` | CCLabelTTF | [182, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_new_2` | CCNode | [-246.0, -15.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/show_rare2/show_new_2/CCLabelTTF_1` | CCLabelTTF | [-8, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_new_2/CCLabelTTF_2` | CCLabelTTF | [413, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/show_rare2/show_new_2/CCLabelTTF_3` | CCLabelTTF | [182, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-----」22 STZhongsong.ttf rgb[135, 95, 51] |
| `/GodEquipRareLayer/end` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/end/show_text10` | CCLabelTTF | [320, 191] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「(已洗脸)(已洗脸)(已洗脸)(已洗脸)(已洗脸)(已洗脸)」20 STZhongsong.ttf rgb[227, 115, 23] |
| `/GodEquipRareLayer/end/CCLabelTTF_1` | CCLabelTTF | [59, 152] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗:」22 STZhongsong.ttf rgb[135, 89, 51] |
| `/GodEquipRareLayer/end/show_cost_rich1` | CCScale9Sprite | [206, 150] | [0.5, 0.5] | [170, 35] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-17.png` d3cf6006-6beb-42f9-ad46-9b3914240366 insets[10, 10, 10, 10] |
| `/GodEquipRareLayer/end/show_cost_rich2` | CCScale9Sprite | [400, 150] | [0.5, 0.5] | [170, 35] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-17.png` d3cf6006-6beb-42f9-ad46-9b3914240366 insets[10, 10, 10, 10] |
| `/GodEquipRareLayer/end/show_text11` | CCLabelTTF | [203, 55] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「111 111 111 111」20 STZhongsong.ttf rgb[227, 115, 23] |
| `/GodEquipRareLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipRareLayer/UIMenu_1/btn_close` | UIMenuItemImage | [578, 893] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodEquipRareLayer/UIMenu_1/btn_info` | UIMenuItemImage | [577, 797] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/GodEquipRareLayer/UIMenu_1/btn_stone_up` | UIMenuItemLabel | [439, 95] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「保存」24 [255, 255, 255, 255] |
| `/GodEquipRareLayer/UIMenu_1/btn_stone_down` | UIMenuItemLabel | [203, 95] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「洗练」24 [255, 255, 255, 255] |

## GodEquipSaleLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodEquipSaleLayer` | GodEquipSaleLayer | [0, 0] | [0, 0] | [458, 328] | [1, 1] | 0 | 是 |  |
| `/GodEquipSaleLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [458.0, 328.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[18, 18, 18, 18] |
| `/GodEquipSaleLayer/node_title` | CCNode | [229.0, 333.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSaleLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodEquipSaleLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装出售」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodEquipSaleLayer/node_desc` | CCNode | [229.0, 234.0] | [0.5, 0.5] | [410, 60] | [1, 1] | 0 | 是 |  |
| `/GodEquipSaleLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipSaleLayer/menu/btn_cancel` | UIMenuItemLabel | [140, 39] | [0.5, 0.5] | [102, 44] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「取消」44 [122, 71, 45, 255] |
| `/GodEquipSaleLayer/menu/btn_ok` | UIMenuItemLabel | [321, 39] | [0.5, 0.5] | [136, 58] | [0.83, 0.83] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确认」44 [255, 255, 255, 255] |
| `/GodEquipSaleLayer/CCNode_1` | CCNode | [229.0, 138.0] | [0.5, 0.5] | [418, 130] | [1, 1] | 0 | 是 |  |
| `/GodEquipSaleLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [-209.0, -65.0] | [0.5, 0.5] | [418.0, 130.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/GodEquipSaleLayer/CCNode_1/scroll_view` | CCScrollView | [0.0, 0.0] | [0.5, 0.5] | [401.28, 117.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## GodEquipSelectLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodEquipSelectLayer` | GodEquipSelectLayer | [0, 0] | [0, 0] | [640, 726] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectLayer/spr_bg` | CCScale9Sprite | [320, 363] | [0.5, 0.5] | [640.0, 726.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GodEquipSelectLayer/btn_scroll_view` | CCScrollView | [320, 591] | [0.5, 0] | [520, 60] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/GodEquipSelectLayer/spr_box` | CCScale9Sprite | [320, 591] | [0.5, 1] | [540, 476] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GodEquipSelectLayer/node_title` | CCNode | [320, 722] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodEquipSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神装选择」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodEquipSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640.0, 726.0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectLayer/UIMenu_1/btn_ok` | UIMenuItemLabel | [320.0, 72.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确定」44 [255, 255, 255, 255] |
| `/GodEquipSelectLayer/UIMenu_1/btn_close` | UIMenuItemImage | [572.0, 694.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodEquipSelectLayer/lbl_selected` | UILabelTTF | [597.579, 71.486] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgb[141, 89, 58] |

## GodEquipSelectSaleLayer（27）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodEquipSelectSaleLayer` | GodEquipSelectSaleLayer | [0, 0] | [0, 0] | [490, 328] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [490.0, 328.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[18, 18, 18, 18] |
| `/GodEquipSelectSaleLayer/node_title` | CCNode | [245.0, 333.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GodEquipSelectSaleLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「出 售」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/GodEquipSelectSaleLayer/UILabelTTF_1` | UILabelTTF | [126, 241] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请选择一键出售条件」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [490.0, 328.0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_1/btn_star_1` | UIMenuItemRadio | [55, 193] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_1/btn_star_2` | UIMenuItemRadio | [171, 193] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_1/btn_star_3` | UIMenuItemRadio | [284, 193] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_1/btn_star_4` | UIMenuItemRadio | [390, 193] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_2` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_2/btn_rare_1` | UIMenuItemRadio | [55, 118] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_2/btn_rare_2` | UIMenuItemRadio | [171, 118] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/menu_filter_2/btn_rare_3` | UIMenuItemRadio | [284, 118] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_1` | UILabelTTF | [101, 193] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1星」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_2` | UILabelTTF | [218, 193] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2星」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_3` | UILabelTTF | [329, 193] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「3星」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_4` | UILabelTTF | [434, 193] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「4星」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_5` | UILabelTTF | [101, 118] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「普通」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_6` | UILabelTTF | [218, 118] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「极品」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/CCNode_1/CCNode_1/UILabelTTF_7` | UILabelTTF | [329, 118] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「稀有」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/GodEquipSelectSaleLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipSelectSaleLayer/menu/btn_cancel` | UIMenuItemLabel | [158, 44] | [0.5, 0.5] | [102, 44] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「取消」44 [122, 71, 45, 255] |
| `/GodEquipSelectSaleLayer/menu/btn_ok` | UIMenuItemLabel | [340, 44] | [0.5, 0.5] | [136, 58] | [0.83, 0.83] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确认」44 [255, 255, 255, 255] |

## GodEquipShopLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GodEquipShopLayer` | GodEquipShopLayer | [0, 0] | [0, 0] | [620, 776] | [1, 1] | 0 | 是 |  |
| `/GodEquipShopLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipShopLayer/CCNode_1/lbl_time` | UILabelTTF | [560, 45] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「每天0点刷新购买次数」40 STZhongsong.ttf rgb[215, 87, 44] |
| `/GodEquipShopLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 796] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GodEquipShopLayer/CCNode_1/CCSprite_1` | CCSprite | [310, 793] | [0.5, 0.5] | [424, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_shop_1.png` 1d6eb9e5-f7b9-4582-9237-d28f1ea51bd5 |
| `/GodEquipShopLayer/CCNode_1/spr_scroll_view_bg` | CCScale9Sprite | [310, 70] | [0.5, 0] | [560, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GodEquipShopLayer/CCNode_1/spr_scroll_view_bg` | CCScale9Sprite | [310, 70] | [0.5, 0] | [560, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-16.png` 206eb822-ff6b-4910-b380-05193b52804a insets[10, 10, 10, 10] |
| `/GodEquipShopLayer/CCNode_1/lbl_name` | UILabelTTF | [310, 780] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「商  城」64 STZhongsong.ttf rgb[253, 229, 190] |
| `/GodEquipShopLayer/CCNode_1/scroll_view_tab` | CCScrollView | [310, 670] | [0.5, 0] | [550, 50] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/GodEquipShopLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GodEquipShopLayer/CCMenu_1/btn_refresh` | UIMenuItemLabel | [289, 77] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/shop/shop_shop_2.png` dc912cfa-6541-46f0-b904-701c37d10111 · Label「」24 [255, 255, 255, 255] |
| `/GodEquipShopLayer/CCMenu_1/btn_close` | UIMenuItemImage | [560, 750] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GodEquipShopLayer/spr_bg` | CCNode | [310, 75] | [0.5, 0] | [550, 590] | [1, 1] | 0 | 是 |  |
| `/GodEquipShopLayer/res_node` | CCNode | [38, 48] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GodEquipShopLayer/res_node/CCScale9Sprite_1` | CCScale9Sprite | [90, 0] | [0.5, 0.5] | [134, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/shop/shop_shop_8.png` 9138e906-fa3b-43ae-8d75-2c0074857c63 insets[0, 0, 15, 15] |
| `/GodEquipShopLayer/res_node/spr_icon` | CCSprite | [43, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900201.png` 0edcb029-2a94-4250-ab84-2a342ed5e9af |
| `/GodEquipShopLayer/res_node/lbl_num` | UILabelTTF | [74, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」44 STZhongsong.ttf rgb[254, 255, 255] |
| `/GodEquipShopLayer/lbl_tip` | UILabelTTF | [560, 45] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「每天0点刷新购买次数」40 STZhongsong.ttf rgb[215, 87, 44] |

## HallowsIdentifyLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsIdentifyLayer` | HallowsIdentifyLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/HallowsIdentifyLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, -10] | [0.5, 0.5] | [580, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HallowsIdentifyLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/HallowsIdentifyLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsIdentifyLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/HallowsIdentifyLayer/lbl_select` | UILabelTTF | [56, 275] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」16 STZhongsong.ttf rgb[89, 53, 15] |

## HallowsIdentifyResultLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsIdentifyResultLayer` | HallowsIdentifyResultLayer | [0, 0] | [0, 0] | [640, 350] | [1, 1] | 0 | 是 |  |
| `/HallowsIdentifyResultLayer/spr_bg` | CCSprite | [320, 189] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/HallowsIdentifyResultLayer/CCSprite_1` | CCSprite | [320, 335] | [0.5, 0] | [451, 115] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon-lang/dragon-lang_identify-result_spr-title.png` a099fd1a-57b5-4fee-916e-f19bfe79be70 |
| `/HallowsIdentifyResultLayer/CCSprite_2` | CCSprite | [320, 50] | [0.5, 0] | [300, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_identify-result_spr-magic.png` 07ca14e3-76bc-4146-8c07-ab8dbabc1791 |
| `/HallowsIdentifyResultLayer/spr_item_icon` | CCSprite | [319, 186] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901001.png` 7d086307-5909-4fe3-9a5a-505e4a79c1af |
| `/HallowsIdentifyResultLayer/spr_light` | CCSprite | [320, 300] | [0.5, 0.5] | [452, 438] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_identify-result_spr-light-1.png` 4737078e-9ae4-4a8a-be64-b33ed55b6a6e |
| `/HallowsIdentifyResultLayer/CCSprite_3` | CCSprite | [90, 170] | [0.5, 0.5] | [52, 209] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_identify-result_spr-name-bg.png` 03dd3612-d676-44ff-9aea-0634c1717859 |
| `/HallowsIdentifyResultLayer/lbl_item_name` | UILabelTTF | [90, 170] | [0.5, 0.5] | [80, 600] | [0.5, 0.5] | 0 | 是 | cc.Label「上古遗物◆优秀」48 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsIdentifyResultLayer/lbl_item_desc` | UILabelTTF | [320, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「特性: 单攻致昏」40 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/HallowsIdentifyResultLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsIdentifyResultLayer/CCMenu_2` | CCMenu | [320, -40] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsIdentifyResultLayer/CCMenu_2/btn_close` | UIMenuItemLabel | [-160, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「关 闭」48 [255, 255, 255, 255] |
| `/HallowsIdentifyResultLayer/CCMenu_2/btn_go` | UIMenuItemLabel | [160, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「前往查看」48 [255, 255, 255, 255] |

## HallowsIllustrationLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsIllustrationLayer` | HallowsIllustrationLayer | [0, 0] | [0, 0] | [640, 720] | [1, 1] | 0 | 是 |  |
| `/HallowsIllustrationLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 740] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HallowsIllustrationLayer/node_title` | CCNode | [320.0, 720.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsIllustrationLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HallowsIllustrationLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣物图鉴」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HallowsIllustrationLayer/spr_scroll_view_bg` | CCScale9Sprite | [320, 80] | [0.5, 0] | [540, 510] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HallowsIllustrationLayer/scroll_view_tab` | CCScrollView | [320, 590] | [0.5, 0] | [540, 50] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/HallowsIllustrationLayer/scroll_view` | UIScrollViewBackpack | [320, 85] | [0.5, 0] | [530, 500] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HallowsIllustrationLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsIllustrationLayer/CCMenu_1/btn_close` | UIMenuItemImage | [570, 720] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HallowsIllustrationLayer/lbl_num` | UILabelTTF | [585, 55] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「收集进度：100/100」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |

## HallowsInfoCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsInfoCell` | HallowsInfoCell | [0, 0] | [0, 0] | [390, 110] | [1, 1] | 0 | 是 |  |
| `/HallowsInfoCell/CCSprite_1` | CCSprite | [50, 55] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-runes-bg-1.png` 1e2130a2-263c-4fc6-b57e-a18c6096c15a |
| `/HallowsInfoCell/lbl_skill_name` | UILabelTTF | [110, 70] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：9999」44 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HallowsInfoCell/node_1` | CCNode | [50, 55] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsInfoCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsInfoCell/lbl_skill_type` | UILabelTTF | [110, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：9999」40 FZCSJW--GB1-0.ttf rgb[161, 129, 89] |

## HallowsInfoLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsInfoLayer` | HallowsInfoLayer | [0, 0] | [0, 0] | [390, 372] | [1, 1] | 0 | 是 |  |
| `/HallowsInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 372] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/HallowsInfoLayer/node` | CCNode | [195.0, 369.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsInfoLayer/node/spr_rare` | CCSprite | [0, -65] | [0.5, 0.5] | [380, 127] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-banner-backpack-1.png` d53c7eef-8fc6-4dc2-8eb1-46727b30e850 |
| `/HallowsInfoLayer/node/lbl_item_name` | UILabelTTF | [-50, -65] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「治愈圣物」44 FZCSJW--GB1-0.ttf rgb[255, 229, 191] |
| `/HallowsInfoLayer/node/spr_item_icon` | CCSprite | [-125, -65] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_2000001.png` 667c685c-8f73-499e-ae32-46b0491ab418 |
| `/HallowsInfoLayer/node/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsInfoLayer/node/menu/btn_close` | UIMenuItemImage | [160, -20] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## HallowsResolveLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsResolveLayer` | HallowsResolveLayer | [0, 0] | [0, 0] | [450, 420] | [1, 1] | 0 | 是 |  |
| `/HallowsResolveLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [450, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/HallowsResolveLayer/lbl_item_name` | UILabelTTF | [155, 365] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「此路是我开」52 FZCSJW--GB1-0.ttf rgb[134, 237, 149] |
| `/HallowsResolveLayer/lbl_prop_type` | UILabelTTF | [155, 320] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「类型: 圣物」44 FZCSJW--GB1-0.ttf rgb[255, 230, 191] |
| `/HallowsResolveLayer/lbl_tip` | UILabelTTF | [225, 240] | [0.5, 0.5] | [800, 150] | [0.5, 0.5] | 0 | 是 | cc.Label「」40 FZCSJW--GB1-0.ttf rgb[142, 89, 55] |
| `/HallowsResolveLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsResolveLayer/menu/btn_confirm` | UIMenuItemLabel | [225, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「分 解」48 [122, 71, 45, 255] |
| `/HallowsResolveLayer/menu/btn_sub` | UIMenuItemImage | [140, 185] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-sub-1.png` b7b37bfa-f87d-44b7-904d-6f7cd8baacda |
| `/HallowsResolveLayer/menu/btn_add` | UIMenuItemImage | [310, 185] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-add-1.png` 55ea79d1-a919-4011-a3b6-c40c1738aba0 |
| `/HallowsResolveLayer/menu/btn_close` | UIMenuItemImage | [405, 420] | [0.5, 1] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HallowsResolveLayer/edit_box_bg` | CCScale9Sprite | [225, 185] | [0.5, 0.5] | [108, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/make-equip_edit-box-bg.png` a64b669a-ad59-49f5-bb99-35b588ff0450 |
| `/HallowsResolveLayer/node_res_get` | CCNode | [225, 125] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsResolveLayer/node_res_get/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [150, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/item-select/item-select_block-res.png` a27c42e7-79ce-4008-906c-ecbbe439bb60 insets[15, 15, 15, 15] |
| `/HallowsResolveLayer/node_res_get/spr_res_get` | CCSprite | [-70, 0] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/HallowsResolveLayer/node_res_get/lbl_res_get` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/HallowsResolveLayer/node_price` | CCNode | [145, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## HallowsSelectLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsSelectLayer` | HallowsSelectLayer | [0, 0] | [0, 0] | [640, 740] | [1, 1] | 0 | 是 |  |
| `/HallowsSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 760] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HallowsSelectLayer/node_title` | CCNode | [320.0, 740.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HallowsSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣物选择」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HallowsSelectLayer/spr_scroll_view_bg` | CCScale9Sprite | [320, 320] | [0.5, 0] | [540, 320] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HallowsSelectLayer/spr_pannel_bg` | CCScale9Sprite | [320, 105] | [0.5, 0] | [540, 168] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HallowsSelectLayer/lbl_tips` | UILabelTTF | [320, 180] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请先选择圣物」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HallowsSelectLayer/node_pannel` | CCNode | [320, 105] | [0.5, 0] | [540, 168] | [1, 1] | 0 | 是 |  |
| `/HallowsSelectLayer/node_pannel/CCSprite_1` | CCSprite | [-70.0, 130] | [0.5, 0.5] | [54, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-bg-1.png` 8f460ed2-58dc-41ee-bb18-51f6e71bd78c |
| `/HallowsSelectLayer/node_pannel/spr_skill_icon` | CCSprite | [-70.0, 130] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_101050092.png` 7ab2d787-f5ca-40a6-aee8-174e9d595e6d |
| `/HallowsSelectLayer/node_pannel/lbl_skill_name` | UILabelTTF | [-30.0, 145] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称 Lv.5」44 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HallowsSelectLayer/node_pannel/lbl_skill_type` | UILabelTTF | [-30.0, 113] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「类型: 主动技能」40 FZCSJW--GB1-0.ttf rgb[231, 117, 42] |
| `/HallowsSelectLayer/node_pannel/lbl_skill_desc` | UILabelTTF | [-100.0, 95] | [0, 1] | [720, 180] | [0.5, 0.5] | 0 | 是 | cc.Label「技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明技能说明」32 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HallowsSelectLayer/node_pannel/CCScale9Sprite_1` | CCScale9Sprite | [-190.0, 25] | [0.5, 0.5] | [100, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_spot-white.png` 185e8e16-a724-49f6-9e82-809d8cff1651 insets[2, 2, 2, 2] |
| `/HallowsSelectLayer/node_pannel/lbl_item_name` | UILabelTTF | [-190.0, 25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「珍贵遗物」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/HallowsSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [320, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「选择」48 [255, 255, 255, 255] |
| `/HallowsSelectLayer/UIMenu_1/btn_close` | UIMenuItemImage | [580, 740] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HallowsSelectLayer/scroll_view` | UIScrollViewBackpack | [320, 325] | [0.5, 0] | [530, 310] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/HallowsSelectLayer/spr_arrow` | CCSprite | [320, 295] | [0.5, 0.5] | [32, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-arrow.png` cce94b9e-c52d-4a55-b50d-59a384616916 |

## HallowsUpStarLayer（60）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HallowsUpStarLayer` | HallowsUpStarLayer | [0, 0] | [0, 0] | [640, 880] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HallowsUpStarLayer/lbl_tip` | UILabelTTF | [320, 360] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已达最高星级」70 FZCSJW--GB1-0.ttf rgb[120, 89, 63] |
| `/HallowsUpStarLayer/node_title` | CCNode | [320.0, 880.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HallowsUpStarLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣物升星」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/HallowsUpStarLayer/spr_arrow` | CCSprite | [320, 560] | [0.5, 0.5] | [32, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-arrow.png` cce94b9e-c52d-4a55-b50d-59a384616916 |
| `/HallowsUpStarLayer/node_info_pre` | CCNode | [320, 590] | [0.5, 0] | [540, 210] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/node_info_pre/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [540, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_1` | CCSprite | [-195.0, 45] | [0.5, 0.5] | [139, 39] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-name-bg-2.png` 767e2799-cc9a-4e68-95c0-85b4b5c251d3 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_1/lbl_item_name_pre` | UILabelTTF | [0.5, 1.5] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「毒液宝珠」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/HallowsUpStarLayer/node_info_pre/UILabelTTF_1` | UILabelTTF | [-120.0, 190] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性」44 FZCSJW--GB1-0.ttf rgb[120, 89, 63] |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_2` | CCSprite | [-120.0, 155] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_2/spr_attr_1_pre` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_2/lbl_attr_1_pre` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_3` | CCSprite | [75.0, 155] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_3/spr_attr_2_pre` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_3/lbl_attr_2_pre` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_4` | CCSprite | [-120.0, 120] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_4/spr_attr_3_pre` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_4/lbl_attr_3_pre` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_5` | CCSprite | [75.0, 120] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_5/spr_attr_4_pre` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_pre/CCSprite_5/lbl_attr_4_pre` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_pre/UILabelTTF_2` | UILabelTTF | [-120.0, 85] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能描述」44 FZCSJW--GB1-0.ttf rgb[120, 89, 63] |
| `/HallowsUpStarLayer/node_info_pre/spr_desc_bg_pre` | CCScale9Sprite | [-120.0, 65] | [0, 1] | [380, 60] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 insets[10, 10, 10, 10] |
| `/HallowsUpStarLayer/node_info_after` | CCNode | [320, 320] | [0.5, 0] | [540, 210] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/node_info_after/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [540, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HallowsUpStarLayer/node_info_after/CCSprite_1` | CCSprite | [-195.0, 45] | [0.5, 0.5] | [139, 39] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-name-bg-2.png` 767e2799-cc9a-4e68-95c0-85b4b5c251d3 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_1/lbl_item_name_after` | UILabelTTF | [0.5, 1.5] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「毒液宝珠」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/HallowsUpStarLayer/node_info_after/UILabelTTF_1` | UILabelTTF | [-120.0, 190] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性」44 FZCSJW--GB1-0.ttf rgb[120, 89, 63] |
| `/HallowsUpStarLayer/node_info_after/CCSprite_2` | CCSprite | [-120.0, 155] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_2/spr_attr_1_after` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_2/lbl_attr_1_after` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_after/CCSprite_3` | CCSprite | [75.0, 155] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_3/spr_attr_2_after` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_3/lbl_attr_2_after` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_after/CCSprite_4` | CCSprite | [-120.0, 120] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_4/spr_attr_3_after` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_4/lbl_attr_3_after` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_after/CCSprite_5` | CCSprite | [75.0, 120] | [0, 0.5] | [183, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_5/spr_attr_4_after` | CCSprite | [16, 1.5] | [0.5, 0.5] | [46, 46] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-101.png` 1775ba05-9826-455e-a182-1c046105be63 |
| `/HallowsUpStarLayer/node_info_after/CCSprite_5/lbl_attr_4_after` | UILabelTTF | [40, 1.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgbNone |
| `/HallowsUpStarLayer/node_info_after/UILabelTTF_2` | UILabelTTF | [-120.0, 85] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能描述」44 FZCSJW--GB1-0.ttf rgb[120, 89, 63] |
| `/HallowsUpStarLayer/node_info_after/spr_desc_bg_after` | CCScale9Sprite | [-119.0, 65] | [0, 1] | [380, 60] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 insets[10, 10, 10, 10] |
| `/HallowsUpStarLayer/node_res_need` | CCNode | [320, 150] | [0.5, 0] | [540, 160] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/node_res_need/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [540, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/HallowsUpStarLayer/node_res_need/UILabelTTF_1` | UILabelTTF | [-250.0, 135] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「升级消耗」44 FZCSJW--GB1-0.ttf rgb[120, 89, 63] |
| `/HallowsUpStarLayer/node_res_need/node_res_need_1` | CCNode | [-195.0, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/node_res_need/node_res_need_1/spr_res_need_name_1` | UILabelTTF | [45, 25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「毒液宝珠」44 FZCSJW--GB1-0.ttf rgb[0, 107, 255] |
| `/HallowsUpStarLayer/node_res_need/node_res_need_1/CCSprite_1` | CCSprite | [45, -15] | [0, 0.5] | [183, 29] | [0.7, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_res_need/node_res_need_1/spr_res_need_num_1` | UILabelTTF | [110, -15] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgb[255, 230, 198] |
| `/HallowsUpStarLayer/node_res_need/node_res_need_2` | CCNode | [80.0, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/node_res_need/node_res_need_2/spr_res_need_name_2` | UILabelTTF | [45, 25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「龙之精华」44 FZCSJW--GB1-0.ttf rgb[196, 87, 255] |
| `/HallowsUpStarLayer/node_res_need/node_res_need_2/CCSprite_1` | CCSprite | [45, -15] | [0, 0.5] | [183, 29] | [0.7, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-attr-bg.png` 2a9a4122-42ed-4578-8b0b-10b56f994004 |
| `/HallowsUpStarLayer/node_res_need/node_res_need_2/spr_res_need_num_2` | UILabelTTF | [110, -15] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击: 5000」36 FZCSJW--GB1-0.ttf rgb[255, 230, 198] |
| `/HallowsUpStarLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HallowsUpStarLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [460, 90] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「升 级」48 [255, 255, 255, 255] |
| `/HallowsUpStarLayer/UIMenu_1/btn_close` | UIMenuItemImage | [580, 880] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HallowsUpStarLayer/UIMenu_1/btn_replace` | UIMenuItemLabel | [180, 90] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「替 换」48 [255, 255, 255, 255] |

## RunesRecastItem（19）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesRecastItem` | RunesRecastItem | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastItem/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [280, 360] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/runes_spr-recast-bg.png` 4dca8f5e-9e6c-4b85-a6a3-f01913101087 insets[150, 5, 5, 5] |
| `/RunesRecastItem/lbl_attr_tips` | UILabelTTF | [16.0, 344.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「穿戴符文」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_skill_tips` | UILabelTTF | [16.0, 232.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「穿戴符文」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_skill_1` | UILabelTTF | [111.0, 190.0] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「穿戴符文」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_skill_info_1` | UILabelTTF | [85.0, 165.0] | [0, 0.5] | [190, 100] | [1, 1] | 0 | **否** | cc.Label「穿戴符文穿戴符文穿戴符文穿戴符文穿戴符文穿戴符文」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_skill_2` | UILabelTTF | [111.0, 88.0] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「穿戴符文」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_skill_info_2` | UILabelTTF | [85.0, 60.0] | [0, 0.5] | [190, 100] | [1, 1] | 0 | **否** | cc.Label「穿戴符文穿戴符文穿戴符文穿戴符文穿戴符文穿戴符文」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_attr` | UILabelTTF | [69.0, 295.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：9999」20 STZhongsong.ttf rgb[120, 65, 0] |
| `/RunesRecastItem/spr_attr` | CCSprite | [45.0, 295.0] | [0.5, 0.5] | [28, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_elem-223.png` aeda9d96-1a6c-4085-b83c-033aa71cec15 |
| `/RunesRecastItem/menu` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesRecastItem/node_1` | CCNode | [45.0, 170.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastItem/node_2` | CCNode | [45.0, 65.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastItem/lbl_random_1` | UILabelTTF | [133.0, 170.0] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「随机技能」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/lbl_random_2` | UILabelTTF | [133.0, 68.0] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「随机技能」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastItem/spr_random_2` | CCSprite | [60.0, 59.0] | [0.5, 0.5] | [0, 0] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE **缺图** other/spr-wenhao.png |
| `/RunesRecastItem/spr_random_1` | CCSprite | [60.0, 161.0] | [0.5, 0.5] | [0, 0] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE **缺图** other/spr-wenhao.png |
| `/RunesRecastItem/random_1` | CCNode | [60.0, 170.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastItem/random_2` | CCNode | [60.0, 68.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## RunesRecastLayer（27）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesRecastLayer` | RunesRecastLayer | [0, 0] | [0, 0] | [600, 785] | [1, 1] | 0 | 是 |  |
| `/RunesRecastLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 785] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[15, 15, 15, 15] |
| `/RunesRecastLayer/node_title` | CCNode | [300.0, 785.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RunesRecastLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「精灵重生」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RunesRecastLayer/CCSprite_1` | CCSprite | [300, 650] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/RunesRecastLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesRecastLayer/menu/btn_close` | UIMenuItemImage | [550, 785] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RunesRecastLayer/menu/btn_recast` | UIMenuItemLabel | [300, 70] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/RunesRecastLayer/menu/btn_recast1` | UIMenuItemLabel | [150, 70] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/RunesRecastLayer/menu/btn_save` | UIMenuItemLabel | [450, 70] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」24 [255, 255, 255, 255] |
| `/RunesRecastLayer/node_need` | CCNode | [355.296, 128.088] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastLayer/node_need/CCScale9Sprite_1` | CCScale9Sprite | [-235, 0] | [0, 0.5] | [165, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/RunesRecastLayer/node_need/spr_soul_need` | CCSprite | [-235, 0] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900102.png` 0aa99264-c493-4fba-b1c2-ea9e623dd56e |
| `/RunesRecastLayer/node_need/lbl_soul_need` | UILabelTTF | [-210, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999/999999」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastLayer/node_need/CCScale9Sprite_2` | CCScale9Sprite | [-30, 0] | [0, 0.5] | [165, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/RunesRecastLayer/node_need/spr_gold_need` | CCSprite | [-30, 1] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/RunesRecastLayer/node_need/lbl_gold_need` | UILabelTTF | [-5, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999/999999」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/RunesRecastLayer/node_need/UILabelTTF_1` | UILabelTTF | [-320, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗」24 STZhongsong.ttf rgb[255, 227, 183] |
| `/RunesRecastLayer/lbl_attr` | UILabelTTF | [132, 561] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「重生前」22 STZhongsong.ttf rgb[120, 65, 0] |
| `/RunesRecastLayer/lbl_attr` | UILabelTTF | [399, 561] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「重生后」22 STZhongsong.ttf rgb[120, 65, 0] |
| `/RunesRecastLayer/lbl_runes_name` | UILabelTTF | [300, 561] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「重生前」22 STZhongsong.ttf rgb[120, 65, 0] |
| `/RunesRecastLayer/CCSprite_2` | CCSprite | [435, 650] | [0.5, 0.5] | [170, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-recast-pattern.png` 8b0a940a-7dc3-4aeb-a9e8-9370ec8bf092 |
| `/RunesRecastLayer/CCSprite_3` | CCSprite | [164, 650] | [0.5, 0.5] | [170, 88] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-recast-pattern.png` 8b0a940a-7dc3-4aeb-a9e8-9370ec8bf092 |
| `/RunesRecastLayer/node_pre` | CCNode | [15, 164] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastLayer/node_next` | CCNode | [304, 164] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesRecastLayer/node` | CCNode | [300, 650] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## RunesSelect2Cell（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesSelect2Cell` | RunesSelect2Cell | [0, 0] | [0, 0] | [480, 105] | [1, 1] | 0 | 是 |  |
| `/RunesSelect2Cell/menu_item` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## RunesSelect2Layer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesSelect2Layer` | RunesSelect2Layer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/RunesSelect2Layer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[10, 10, 10, 10] |
| `/RunesSelect2Layer/node_title` | CCNode | [300.0, 800.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesSelect2Layer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RunesSelect2Layer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「精灵选择」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RunesSelect2Layer/spr_tableview_bg` | CCScale9Sprite | [15, 70] | [0.5, 0.5] | [570, 640] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RunesSelect2Layer/menu_close` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesSelect2Layer/menu_close/btn_close` | UIMenuItemImage | [555, 770] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RunesSelect2Layer/menu_close/btn_done` | UIMenuItemLabel | [300, 40] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「确 定」48 [100, 50, 0, 255] |
| `/RunesSelect2Layer/lbl_num` | UILabelTTF | [585, 40] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已选择(2 / 5)」44 STZhongsong.ttf rgb[120, 65, 0] |

## RunesSelectCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesSelectCell` | RunesSelectCell | [0, 0] | [0, 0] | [500, 120] | [1, 1] | 0 | 是 |  |
| `/RunesSelectCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [500, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-paimingk-1.png` da39b30c-711a-4b1f-9916-8d6f44421495 insets[10, 10, 10, 10] |
| `/RunesSelectCell/spr_frame` | CCSprite | [65, 60] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/RunesSelectCell/spr_attr` | CCSprite | [135, 80] | [0.5, 0.5] | [28, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_elem-101.png` 39243fde-6582-45c6-bb72-d3a44c27bcf7 |
| `/RunesSelectCell/lbl_attr` | UILabelTTF | [155, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：9999」40 STZhongsong.ttf rgb[120, 65, 0] |
| `/RunesSelectCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesSelectCell/menu/btn_select` | UIMenuItemLabel | [440, 60] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-circle-blue-1.png` 06042871-02ad-497c-b8ea-980ebad979db pressed `ui/common/button_btn-circle-blue-2.png` 8a2afe57-320a-467c-a172-361026f05e1b · Label「」24 [255, 255, 255, 255] |
| `/RunesSelectCell/menu/btn_runes` | UIMenuItemImage | [65, 60] | [0.5, 0.5] | [100, 100] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_2000003.png` 19d720c5-070f-4714-9c3d-4b5b218382f2 |

## RunesSelectLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesSelectLayer` | RunesSelectLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/RunesSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[75, 75, 75, 75] |
| `/RunesSelectLayer/node_title` | CCNode | [300.0, 792.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RunesSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「精灵列表」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RunesSelectLayer/spr_tableview_bg` | CCScale9Sprite | [40, 60] | [0.5, 0.5] | [520, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RunesSelectLayer/menu_close` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesSelectLayer/menu_close/btn_close` | UIMenuItemImage | [545, 765] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RunesSelectLayer/lbl_tip` | UILabelTTF | [300, 685] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「穿戴精灵后英雄可获得精灵携带的被动技能」42 STZhongsong.ttf rgb[120, 65, 0] |

## RunesSkillLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesSkillLayer` | RunesSkillLayer | [0, 0] | [0, 0] | [562, 706] | [1, 1] | 0 | 是 |  |
| `/RunesSkillLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 706] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RunesSkillLayer/node_title` | CCNode | [281.0, 698.94] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesSkillLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RunesSkillLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「精灵技能」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RunesSkillLayer/spr_bg` | CCScale9Sprite | [31, 50] | [0.5, 0.5] | [500, 500] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/RunesSkillLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesSkillLayer/menu/btn_close` | UIMenuItemImage | [505, 670.224] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RunesSkillLayer/menu/btn_skill_1` | UIMenuItemTab | [100, 565] | [0.5, 0] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-17.png` cf411808-6e90-4980-a5f3-f37df9b2a5eb pressed `ui/common/button_btn-tab-18.png` e779f392-0b39-4a1a-8065-05eaa6d72a7b · Label「低 级」40 [255, 255, 255, 255] |
| `/RunesSkillLayer/menu/btn_skill_2` | UIMenuItemTab | [220, 565] | [0.5, 0] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-19.png` 66292d70-21aa-4d02-af3b-c6922303c5f8 pressed `ui/common/button_btn-tab-20.png` d79055c9-b417-4ace-af7a-e2cfa1bc6baa · Label「中 级」40 [255, 255, 255, 255] |
| `/RunesSkillLayer/menu/btn_skill_4` | UIMenuItemTab | [464, 565] | [0.5, 0] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-21.png` cf720145-2705-49d5-8a2e-bd068cfc8ed2 pressed `ui/common/button_btn-tab-22.png` 25ba8a65-b054-468b-b706-6b0152747c53 · Label「高 级」40 [255, 255, 255, 255] |
| `/RunesSkillLayer/menu/btn_skill_3` | UIMenuItemTab | [340, 565] | [0.5, 0] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-19.png` 66292d70-21aa-4d02-af3b-c6922303c5f8 pressed `ui/common/button_btn-tab-20.png` d79055c9-b417-4ace-af7a-e2cfa1bc6baa · Label「中 级」40 [255, 255, 255, 255] |

## RunesTipsCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesTipsCell` | RunesTipsCell | [0, 0] | [0, 0] | [390, 110] | [1, 1] | 0 | 是 |  |
| `/RunesTipsCell/CCSprite_1` | CCSprite | [50, 55] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-runes-bg-1.png` 1e2130a2-263c-4fc6-b57e-a18c6096c15a |
| `/RunesTipsCell/lbl_name` | UILabelTTF | [105, 100] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：9999」44 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/RunesTipsCell/node_1` | CCNode | [50, 55] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesTipsCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesTipsCell/node_info` | CCNode | [105, 75] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |

## RunesTipsLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RunesTipsLayer` | RunesTipsLayer | [0, 0] | [0, 0] | [390, 372] | [1, 1] | 0 | 是 |  |
| `/RunesTipsLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 372] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/RunesTipsLayer/node` | CCNode | [195.0, 369.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RunesTipsLayer/node/spr_rare` | CCSprite | [0, -65] | [0.5, 0.5] | [380, 127] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-banner-backpack-1.png` d53c7eef-8fc6-4dc2-8eb1-46727b30e850 |
| `/RunesTipsLayer/node/lbl_name` | CCSprite | [-50, -50] | [0, 0.5] | [98, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info-lang_lbl-runes-2000001.png` d043f5e0-72d5-4cd0-914f-d26a707d90da |
| `/RunesTipsLayer/node/lbl_prop_type` | UILabelTTF | [-50, -90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「类型：精灵」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/RunesTipsLayer/node/spr_icon` | CCSprite | [-125, -65] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_2000001.png` 667c685c-8f73-499e-ae32-46b0491ab418 |
| `/RunesTipsLayer/node/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RunesTipsLayer/node/menu/btn_close` | UIMenuItemImage | [160, -20] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RunesTipsLayer/node/menu/btn_src` | UIMenuItemImage | [135, -170] | [0.5, 0.5] | [67, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-src.png` fc1ffb2a-2d0e-4fd2-89fe-779b304fa5f3 |
