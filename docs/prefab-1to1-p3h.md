# P3-h 异域冒险 Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| ExoticAdventureBackpackInfoLayer | `prefabs/ui/exotic-adventure/ExoticAdventureBackpackInfoLayer.prefab` | 6 |
| ExoticAdventureBackpackLayer | `prefabs/ui/exotic-adventure/ExoticAdventureBackpackLayer.prefab` | 10 |
| ExoticAdventureBattleEndLayer | `prefabs/ui/exotic-adventure/ExoticAdventureBattleEndLayer.prefab` | 10 |
| ExoticAdventureChangeNickLayer | `prefabs/ui/exotic-adventure/ExoticAdventureChangeNickLayer.prefab` | 10 |
| ExoticAdventureCheckpointLayer | `prefabs/ui/exotic-adventure/ExoticAdventureCheckpointLayer.prefab` | 31 |
| ExoticAdventureGetItemsLayer | `prefabs/ui/exotic-adventure/ExoticAdventureGetItemsLayer.prefab` | 12 |
| ExoticAdventureGiftPageLayer | `prefabs/ui/exotic-adventure/ExoticAdventureGiftPageLayer.prefab` | 11 |
| ExoticAdventureIllustratedBooksCell | `prefabs/ui/exotic-adventure/ExoticAdventureIllustratedBooksCell.prefab` | 5 |
| ExoticAdventureIllustratedBooksLayer | `prefabs/ui/exotic-adventure/ExoticAdventureIllustratedBooksLayer.prefab` | 10 |
| ExoticAdventureLayer | `prefabs/ui/exotic-adventure/ExoticAdventureLayer.prefab` | 23 |
| ExoticAdventurePlunderLayer | `prefabs/ui/exotic-adventure/ExoticAdventurePlunderLayer.prefab` | 17 |
| ExoticAdventureRandomEventsLayer | `prefabs/ui/exotic-adventure/ExoticAdventureRandomEventsLayer.prefab` | 16 |
| ExoticAdventureReportLayer | `prefabs/ui/exotic-adventure/ExoticAdventureReportLayer.prefab` | 26 |
| ExoticAdventureSailingLayer | `prefabs/ui/exotic-adventure/ExoticAdventureSailingLayer.prefab` | 29 |
| ExoticAdventureSearchLayer | `prefabs/ui/exotic-adventure/ExoticAdventureSearchLayer.prefab` | 3 |
| ExoticAdventureShioInfoCtr | `prefabs/ui/exotic-adventure/ExoticAdventureShioInfoCtr.prefab` | 22 |
| ExoticAdventureShioInfoLayer | `prefabs/ui/exotic-adventure/ExoticAdventureShioInfoLayer.prefab` | 25 |
| ExoticAdventureShopCell | `prefabs/ui/exotic-adventure/ExoticAdventureShopCell.prefab` | 35 |
| ExoticAdventureShopLayer | `prefabs/ui/exotic-adventure/ExoticAdventureShopLayer.prefab` | 7 |
| ExoticAdventureSummaryLayer | `prefabs/ui/exotic-adventure/ExoticAdventureSummaryLayer.prefab` | 11 |
| ExoticAdventureTeamLayer | `prefabs/ui/exotic-adventure/ExoticAdventureTeamLayer.prefab` | 62 |
| ExoticAdventureUpgradeLayer | `prefabs/ui/exotic-adventure/ExoticAdventureUpgradeLayer.prefab` | 15 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-lueduobg.png` | [10, 10, 10, 10] |
| `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-lvduokuang.png` | [7, 7, 10, 10] |
| `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-daohangbg.png` | [19, 20, 19, 19] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/maps/map-bg-result-1.png` → P3A

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_cell-bg-6.png` [29, 28, 29, 29]（edited by P2A）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/common/win-bg_block-bg-20.png` [9, 9, 9, 9]（edited by P2A）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureBackpackLayer:/ExoticAdventureBackpackLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureIllustratedBooksLayer:/ExoticAdventureIllustratedBooksLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureShioInfoCtr:/ExoticAdventureShioInfoCtr/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureBackpackLayer:/ExoticAdventureBackpackLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureGetItemsLayer:/ExoticAdventureGetItemsLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureIllustratedBooksLayer:/ExoticAdventureIllustratedBooksLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_2` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureShioInfoCtr:/ExoticAdventureShioInfoCtr/node_title/spr_content` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureShioInfoLayer:/ExoticAdventureShioInfoLayer/node_bg/spr_content` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureTeamLayer:/ExoticAdventureTeamLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureTeamLayer:/ExoticAdventureTeamLayer/spr_box` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [50, 50, 50, 50] | `ExoticAdventureRandomEventsLayer:/ExoticAdventureRandomEventsLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ExoticAdventureBackpackInfoLayer:/ExoticAdventureBackpackInfoLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ExoticAdventureUpgradeLayer:/ExoticAdventureUpgradeLayer/spr_bg` |

## ExoticAdventureBackpackInfoLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureBackpackInfoLayer` | ExoticAdventureBackpackInfoLayer | [0, 0] | [0, 0] | [390, 300] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBackpackInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/ExoticAdventureBackpackInfoLayer/node` | CCNode | [195.0, 297.581] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBackpackInfoLayer/node/UILabelTTF_1` | UILabelTTF | [-56, -79] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励预览」44 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/ExoticAdventureBackpackInfoLayer/node/spr_line` | CCSprite | [0, -130] | [0.5, 0.5] | [380, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-line.png` c6234db7-ebbd-43bb-863f-6c99505dbdc3 |
| `/ExoticAdventureBackpackInfoLayer/node/menu` | CCMenu | [-13, -200] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## ExoticAdventureBackpackLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureBackpackLayer` | ExoticAdventureBackpackLayer | [0, 0] | [0, 0] | [640, 819] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBackpackLayer/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, 819.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ExoticAdventureBackpackLayer/spr_box` | CCScale9Sprite | [320.0, 691.0] | [0.5, 1] | [560, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureBackpackLayer/node_title` | CCNode | [322.0, 817.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBackpackLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ExoticAdventureBackpackLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「船仓」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureBackpackLayer/btn_scroll_view` | CCScrollView | [321.0, 690.0] | [0.5, 0] | [544.0, 40.95] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/ExoticAdventureBackpackLayer/CCNode_1` | CCNode | [578.0, 819.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBackpackLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBackpackLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## ExoticAdventureBattleEndLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureBattleEndLayer` | ExoticAdventureBattleEndLayer | [0, 0] | [0, 0] | [640, 630] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBattleEndLayer/spr_bg` | CCScale9Sprite | [320, 96] | [0.5, 0] | [640, 450] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[150, 150, 10, 10] |
| `/ExoticAdventureBattleEndLayer/spr_wing` | CCSprite | [330, 531] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/ExoticAdventureBattleEndLayer/spr_result` | CCSprite | [336, 522] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/ExoticAdventureBattleEndLayer/lbl_faild` | UILabelTTF | [328.32, 341.56] | [0.5, 0.5] | [580, 140] | [0.5, 0.5] | 0 | 是 | cc.Label「耐久+1」44 CloudYuanCuGBK.ttf rgb[251, 241, 217] |
| `/ExoticAdventureBattleEndLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureBattleEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [579, 453] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/ExoticAdventureBattleEndLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [330, 50.4] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「确定」56 [255, 255, 255, 255] |
| `/ExoticAdventureBattleEndLayer/spr_get` | CCSprite | [320, 270.48] | [0.5, 0.5] | [112, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_spr-hdwp.png` 6aa1cf34-13c9-4bee-bd1b-fe6ac72a3c39 |
| `/ExoticAdventureBattleEndLayer/menu` | CCMenu | [319.0, 187.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## ExoticAdventureChangeNickLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureChangeNickLayer` | ExoticAdventureChangeNickLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureChangeNickLayer/spr_bg` | CCScale9Sprite | [320.0, 200.0] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ExoticAdventureChangeNickLayer/node_bg` | CCNode | [578.0, 396.154] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureChangeNickLayer/node_bg/spr_title_bg` | CCScale9Sprite | [-250, -1.2] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ExoticAdventureChangeNickLayer/node_bg/spr_input_bg` | CCScale9Sprite | [-259.2, -199.2] | [0.5, 0.5] | [300, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/ExoticAdventureChangeNickLayer/node_bg/lbl_title` | UILabelTTF | [-249.6, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「修改名称」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureChangeNickLayer/node_bg/lbl_title` | UILabelTTF | [-253.2, -130.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请输入你想修改的名字」56 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureChangeNickLayer/node_bg/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureChangeNickLayer/node_bg/CCMenu_1/btn_close` | UIMenuItemImage | [7, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureChangeNickLayer/node_bg/CCMenu_1/bnt_sure` | UIMenuItemLabel | [-256.8, -327.6] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确定」40 [255, 255, 255, 255] |

## ExoticAdventureCheckpointLayer（31）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureCheckpointLayer` | ExoticAdventureCheckpointLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper` | CCNode | [320.0, 960.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper/CCMenu_1` | CCMenu | [247.5, -49.167] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper/CCMenu_1/btn_back` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/ExoticAdventureCheckpointLayer/node_upper/CCMenu_1/btn_info` | CCMenuItemImage | [8, -75] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/ExoticAdventureCheckpointLayer/node_upper/CCMenu_1/btn_books` | CCMenuItemImage | [9.167, -152.5] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-shijian.png` 3aea17c5-d824-4113-ab8c-a1c1e643165d |
| `/ExoticAdventureCheckpointLayer/node_upper/CCSprite_1` | CCSprite | [-215.0, -143.333] | [0.5, 0.5] | [196, 158] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-map3.png` bf230ffa-d5f5-426a-b0b9-ff5719f0d198 |
| `/ExoticAdventureCheckpointLayer/node_upper/spr_progress_bg` | CCSprite | [-204.167, -143.333] | [0.5, 0.5] | [136, 115] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdbg.png` f44d0ae9-2f7e-4b99-a46d-6b57ed2ffe3d |
| `/ExoticAdventureCheckpointLayer/node_upper/spr_mao` | CCSprite | [-252.5, -201.667] | [0.5, 0.5] | [28, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-mao.png` 72b9aeee-b80b-4573-9401-8456b5c409b1 |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_1` | CCNode | [-104.167, -62.5] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_1/CCSprite_1` | CCSprite | [61.0, 0.0] | [0.5, 0.5] | [122, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_k.png` f55134e3-ae76-4395-9051-a90f32c28ebe |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_1/lbl_num_1` | UILabelTTF | [68, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 CloudYuanCuGBK.ttf rgbNone |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_1/spr_icon_1` | CCSprite | [7.0, 1.0] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900601.png` 4fc7144a-58ee-4df1-8dbb-eacc447f3d8b |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_1/CCMenu_1` | CCMenu | [-1, 6.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_1/CCMenu_1/btn_iteminfo` | UIMenuItemLabel | [7, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_2` | CCNode | [51.667, -61.667] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_2/CCSprite_1` | CCSprite | [61.0, 0.0] | [0.5, 0.5] | [122, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_k.png` f55134e3-ae76-4395-9051-a90f32c28ebe |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_2/lbl_num_2` | UILabelTTF | [68, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 CloudYuanCuGBK.ttf rgbNone |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_2/spr_icon_2` | CCSprite | [7.0, 1.0] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900601.png` 4fc7144a-58ee-4df1-8dbb-eacc447f3d8b |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_2/CCMenu_1` | CCMenu | [-1, 6.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_upper/CCNode_2/CCMenu_1/btn_iteminfo` | UIMenuItemLabel | [7, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ExoticAdventureCheckpointLayer/node_upper/UILabelTTF_1` | UILabelTTF | [-282.24, -276.48] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「航行进度」44 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureCheckpointLayer/node_upper/lbl_sailing_progress` | UILabelTTF | [-184.32, -276.48] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「30%」44 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureCheckpointLayer/node_upper/CCSprite_2` | CCSprite | [-239.04, -318.24] | [0.5, 0.5] | [28, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-time.png` c592aa02-775b-4243-9be4-b5fa26c93740 |
| `/ExoticAdventureCheckpointLayer/node_upper/lbl_sailing_time` | UILabelTTF | [-207.36, -317.8] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「预计%s天」44 CloudYuanCuGBK.ttf rgb[0, 184, 62] |
| `/ExoticAdventureCheckpointLayer/node_lower` | CCNode | [320.0, 53.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_lower/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [640, 140] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dibu.png` 9e49c793-a298-486a-b1a3-d9762ac646b9 |
| `/ExoticAdventureCheckpointLayer/node_lower/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureCheckpointLayer/node_lower/CCMenu_1/btn_knapsack` | UIMenuItemLabel | [-172.8, -17.28] | [0.5, 0.5] | [77, 77] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dikuang.png` dfb1be4c-b180-4ea2-a295-d33f678e7bfd · Label「货仓」40 [255, 255, 255, 255] |
| `/ExoticAdventureCheckpointLayer/node_lower/CCMenu_1/btn_Illusion` | UIMenuItemLabel | [160.704, -10.912] | [0.5, 0.5] | [77, 77] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dikuang.png` dfb1be4c-b180-4ea2-a295-d33f678e7bfd · Label「舰长室」40 [255, 255, 255, 255] |
| `/ExoticAdventureCheckpointLayer/node_lower/CCMenu_1/btn_Illusion` | UIMenuItemLabel | [-0.129, -7.412] | [0.5, 0.5] | [158, 157] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-tansuo.png` 3d013090-3440-4f06-9f22-4b68320667fe · Label「探索」40 [255, 255, 255, 255] |

## ExoticAdventureGetItemsLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureGetItemsLayer` | ExoticAdventureGetItemsLayer | [0, 0] | [0, 0] | [640, 452] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGetItemsLayer/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, 452.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ExoticAdventureGetItemsLayer/spr_box` | CCScale9Sprite | [321.0, 281.0] | [0.5, 1] | [570, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureGetItemsLayer/node_title` | CCNode | [322.0, 442.96] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGetItemsLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ExoticAdventureGetItemsLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得物品」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureGetItemsLayer/node_title/scroll_view` | UIScrollViewBackpack | [-282.128, -318.056] | [0, 0] | [565, 150] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ExoticAdventureGetItemsLayer/node_title/lbl_title` | UILabelTTF | [-9.0, -148.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「转来一圈什么都没发现，获得以下物品」40 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureGetItemsLayer/CCNode_1` | CCNode | [578.0, 452.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGetItemsLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGetItemsLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [7, -5] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureGetItemsLayer/CCNode_1/CCMenu_1/btn_sure` | UIMenuItemLabel | [-252, -381] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「确定」40 [255, 255, 255, 255] |

## ExoticAdventureGiftPageLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureGiftPageLayer` | ExoticAdventureGiftPageLayer | [0, 0] | [0, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGiftPageLayer/spr_bg` | CCSprite | [320.728, 24.112] | [0.5, 0] | [640, 496] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-shop.png` f2eb7ea7-001e-4020-9204-3c9e55cc354e |
| `/ExoticAdventureGiftPageLayer/CCSprite_1` | CCSprite | [359.0, 400.0] | [0.5, 0.5] | [375, 77] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure-lang/exotic-adventure-lang_exotic-adventure-spr-shop.png` 8ba4afb9-7a88-4ef4-821f-b6b157f0c5a0 |
| `/ExoticAdventureGiftPageLayer/CCSprite_2` | CCSprite | [311.0, 483.0] | [0.5, 0.5] | [190, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure-lang/exotic-adventure-lang_exotic-adventure-spr-shopgife.png` 44de2d31-17e3-45ed-ac22-3a76b875d7b3 |
| `/ExoticAdventureGiftPageLayer/CCSprite_3` | CCSprite | [510.0, 346.0] | [0.5, 0.5] | [225, 33] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-gift-timebg.png` 3d55d935-f3ff-4870-b63e-e54e848535f8 |
| `/ExoticAdventureGiftPageLayer/menu` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGiftPageLayer/menu/btn_buy` | UIMenuItemLabel | [440, 168] | [0.5, 0.5] | [202, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-yellow-3.png` 594e3215-b639-43cf-8651-2d429e5a4ce5 · Label「30元」56 [112, 71, 0, 255] |
| `/ExoticAdventureGiftPageLayer/menu/btn_close` | UIMenuItemImage | [605.184, 478.712] | [0.5, 0.5] | [61, 59] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-shopclose.png` 05195e54-6998-4e20-86fe-e6a9ae5d6dd4 |
| `/ExoticAdventureGiftPageLayer/menu_reward` | UIMenu | [440.0, 270.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureGiftPageLayer/lbl_cd_tip` | UILabelTTF | [612.0, 346.0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「后礼包消失」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ExoticAdventureGiftPageLayer/node_time` | CCNode | [388.0, 345.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ExoticAdventureIllustratedBooksCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureIllustratedBooksCell` | ExoticAdventureIllustratedBooksCell | [0, 0] | [0, 0] | [550, 126] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureIllustratedBooksCell/spr_bg_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/ExoticAdventureIllustratedBooksCell/image` | CCSprite | [96, 64] | [0.5, 0.5] | [200, 200] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-identification_spr-1-da.png` 84113796-9999-4518-9c83-64f16a671c08 |
| `/ExoticAdventureIllustratedBooksCell/lbl_describe` | UILabelTTF | [168, 50] | [0, 0.5] | [360, 75] | [1, 1] | 0 | 是 | cc.Label「事件名字事件名字事件名字事件名字事件名字事件名字事件名字事件名字事件名字事件名事件名字事」18 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureIllustratedBooksCell/lbl_name` | UILabelTTF | [169, 100] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「事件名字」18 CloudYuanCuGBK.ttf rgb[213, 112, 31] |

## ExoticAdventureIllustratedBooksLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureIllustratedBooksLayer` | ExoticAdventureIllustratedBooksLayer | [0, 0] | [0, 0] | [640, 819] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureIllustratedBooksLayer/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, 819.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ExoticAdventureIllustratedBooksLayer/spr_box` | CCScale9Sprite | [323.456, 718.672] | [0.5, 1] | [563.2, 655.2] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureIllustratedBooksLayer/node_title` | CCNode | [322.0, 817.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureIllustratedBooksLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ExoticAdventureIllustratedBooksLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「事件图鉴」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureIllustratedBooksLayer/node_title/scroll_view` | UIScrollViewBackpack | [-277.6, -747.064] | [0, 0] | [560, 645] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ExoticAdventureIllustratedBooksLayer/CCNode_1` | CCNode | [578.0, 819.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureIllustratedBooksLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureIllustratedBooksLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## ExoticAdventureLayer（23）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureLayer` | ExoticAdventureLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/exotic-adventure.jpg` b77f4e61-4f3f-4619-82f4-16c9909faff0 |
| `/ExoticAdventureLayer/node_bg` | CCNode | [320.0, 461.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureLayer/node_bg/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [639, 1000] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-map.png` d1ad0a30-ccf7-4cf7-b05a-2c4a282e52a5 |
| `/ExoticAdventureLayer/node_bg/CCMenu_1` | CCMenu | [275.0, -448.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureLayer/node_bg/CCMenu_1/btn_Illusion` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [85, 87] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-captain-room.png` 23b6ef2e-960e-421f-a8aa-e8b255d47305 · Label「舰长室」40 [255, 255, 255, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_1` | UIMenuItemLabel | [13.824, 17.28] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_2` | UIMenuItemLabel | [-145.152, 51.84] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_3` | UIMenuItemLabel | [5.184, 207.36] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_4` | UIMenuItemLabel | [153.792, 127.872] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_5` | UIMenuItemLabel | [205.632, 276.48] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_6` | UIMenuItemLabel | [86.4, 357.696] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_7` | UIMenuItemLabel | [-114.048, 345.6] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_8` | UIMenuItemLabel | [-202.176, 212.544] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_9` | UIMenuItemLabel | [-165.888, -129.6] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_10` | UIMenuItemLabel | [-51.84, -229.824] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_11` | UIMenuItemLabel | [105.408, -340.416] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_12` | UIMenuItemLabel | [207.36, -243.648] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_bg/menu_checkpoint/bnt_checkpoint_13` | UIMenuItemLabel | [172.8, -91.584] | [0.5, 0.5] | [125, 125] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_Checkpoint-1-1.png` d54a8d46-54a7-4f03-a858-0400ff9f5c19 · Label「关卡名字」30 [122, 71, 45, 255] |
| `/ExoticAdventureLayer/node_back` | CCNode | [547.0, 854.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureLayer/node_back/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureLayer/node_back/CCMenu_1/btn_back` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |

## ExoticAdventurePlunderLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventurePlunderLayer` | ExoticAdventurePlunderLayer | [0, 0] | [0, 0] | [640, 520] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventurePlunderLayer/spr_bg` | CCScale9Sprite | [320.0, 260.0] | [0.5, 0.5] | [640, 520] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ExoticAdventurePlunderLayer/spr_content` | CCScale9Sprite | [320.0, 270.0] | [0.5, 0.5] | [544, 324] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-lueduobg.png` f7369088-0842-4947-9d9a-a9b6c80d4c6f insets[10, 10, 10, 10] |
| `/ExoticAdventurePlunderLayer/node_bg` | CCNode | [578.0, 515.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventurePlunderLayer/node_bg/spr_title_bg` | CCScale9Sprite | [-250, -1.2] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ExoticAdventurePlunderLayer/node_bg/spr_input_bg` | CCScale9Sprite | [-250.8, -114.0] | [0.5, 0.5] | [194, 54] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-lvduokuang.png` a43f3208-9132-4a33-b64b-bc2e394c60db insets[10, 10, 10, 10] |
| `/ExoticAdventurePlunderLayer/node_bg/lbl_title` | UILabelTTF | [-249.6, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「掠夺」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventurePlunderLayer/node_bg/lbl_server` | UILabelTTF | [-280.371, -115.647] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[120]」36 CloudYuanCuGBK.ttf rgb[26, 224, 50] |
| `/ExoticAdventurePlunderLayer/node_bg/lbl_name` | UILabelTTF | [-277.097, -114.482] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「秋天的皮卡丘」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventurePlunderLayer/node_bg/UILabelTTF_1` | UILabelTTF | [-250, -380.8] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请选择你想要掠夺的部位」36 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1/btn_close` | UIMenuItemImage | [7, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1/bnt_out` | UIMenuItemLabel | [-384, -450] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「逃跑」40 [255, 255, 255, 255] |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1/bnt_sure` | UIMenuItemLabel | [-134, -450] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「战斗」40 [255, 255, 255, 255] |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1/btn_power` | UIMenuItemLabel | [-350, -343] | [0.5, 0.5] | [140, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-29.png` 9c815cd3-084f-4ae3-85e0-b240c9923639 pressed `ui/common/button_btn-tab-30.png` 3334dcb0-535d-4776-93ea-02b13e326a53 · Label「动力系统」40 [255, 255, 255, 255] |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1/btn_arms` | UIMenuItemLabel | [-168, -343] | [0.5, 0.5] | [140, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-29.png` 9c815cd3-084f-4ae3-85e0-b240c9923639 pressed `ui/common/button_btn-tab-30.png` 3334dcb0-535d-4776-93ea-02b13e326a53 · Label「武器系统」40 [255, 255, 255, 255] |
| `/ExoticAdventurePlunderLayer/node_bg/CCMenu_1/bnt_ranks` | UIMenuItemLabel | [-27.2, -122.4] | [0.5, 0.5] | [67, 68] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-duiwu.png` bac2f574-92fb-43b7-ab05-e2d939b7806a · Label「我的队伍」40 [255, 255, 255, 255] |

## ExoticAdventureRandomEventsLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureRandomEventsLayer` | ExoticAdventureRandomEventsLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureRandomEventsLayer/spr_bg` | CCScale9Sprite | [1, 311.951] | [0.5, 0.5] | [640, 712] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[50, 50, 50, 50] |
| `/ExoticAdventureRandomEventsLayer/menu` | CCMenu | [320.0, 607.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureRandomEventsLayer/lbl_details` | UILabelTTF | [614.233, 484.047] | [1, 0.5] | [566, 160] | [1, 1] | 0 | 是 | cc.Label「发现舰队残骸，搜寻-番过后，」22 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureRandomEventsLayer/lbl_name` | UILabelTTF | [321, 588.487] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「舰队残骸」28 CloudYuanCuGBK.ttf rgb[252, 232, 193] |
| `/ExoticAdventureRandomEventsLayer/spr_icon` | CCSprite | [321.878, 782.942] | [0.5, 0.5] | [300, 300] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-shijian-101.png` e139a360-b389-4909-bc64-4a6c19d8ac90 |
| `/ExoticAdventureRandomEventsLayer/menu_type2` | UIMenu | [316.8, 375.16] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureRandomEventsLayer/menu_type2/btn_type2_out` | UIMenuItemLabel | [-105, 3] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「离开」40 [255, 255, 255, 255] |
| `/ExoticAdventureRandomEventsLayer/menu_type2/btn_type2_sure` | UIMenuItemLabel | [109, 3] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「查看」40 [255, 255, 255, 255] |
| `/ExoticAdventureRandomEventsLayer/menu_type1` | UIMenu | [317.0, 378.0] | [0, 0] | [640, 960] | [1, 1] | 0 | **否** |  |
| `/ExoticAdventureRandomEventsLayer/menu_type1/btn_type1_sure` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「确定」40 [255, 255, 255, 255] |
| `/ExoticAdventureRandomEventsLayer/node_consume` | CCNode | [426.667, 339.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureRandomEventsLayer/node_consume/lbl_tip_summon_one_title` | UILabelTTF | [-15.833, 0.833] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「消耗」40 CloudYuanCuGBK.ttf rgb[253, 232, 193] |
| `/ExoticAdventureRandomEventsLayer/node_consume/spr_summon_one_icon` | CCSprite | [4.167, 0.833] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/ExoticAdventureRandomEventsLayer/node_consume/lbl_summon_one_num` | UILabelTTF | [20.167, 0.833] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「900」40 CloudYuanCuGBK.ttf rgb[253, 232, 193] |
| `/ExoticAdventureRandomEventsLayer/node_spin` | CCNode | [320.0, 998.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ExoticAdventureReportLayer（26）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureReportLayer` | ExoticAdventureReportLayer | [0, 0] | [0, 0] | [640, 900] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/spr_bg` | CCScale9Sprite | [320.0, 450.0] | [0.5, 0.5] | [640, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ExoticAdventureReportLayer/node_title` | CCNode | [320.0, 891.9] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/node_title/spr_title_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [344, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-2.png` c7f43d22-d8a0-493c-88c2-17192ea937bd |
| `/ExoticAdventureReportLayer/node_title/lbl_title` | UILabelTTF | [0, -22] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「冒险侦察报告」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureReportLayer/node_title/CCSprite_1` | CCSprite | [0, -247.68] | [0.5, 0.5] | [558, 371] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-map-2.png` 6addf478-596b-422d-8616-18164210a4a7 |
| `/ExoticAdventureReportLayer/node_title/CCSprite_2` | CCSprite | [-3.456, -237.792] | [0.5, 0.5] | [219, 53] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-namebg.png` 58bf343d-fa6d-4f66-9b68-5e060f7c7611 |
| `/ExoticAdventureReportLayer/node_title/lbl_name` | UILabelTTF | [-6.24, -229.52] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「羁绊幻化1」40 CloudYuanCuGBK.ttf rgb[253, 232, 193] |
| `/ExoticAdventureReportLayer/node_title/spr_icon` | CCSprite | [-5.632, -148.456] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_2000001.png` 667c685c-8f73-499e-ae32-46b0491ab418 |
| `/ExoticAdventureReportLayer/node_title/lbl_describe` | UILabelTTF | [-223.6, -321.0] | [0, 0.5] | [450, 120] | [1, 1] | 0 | 是 | cc.Label「描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述」20 CloudYuanCuGBK.ttf rgb[130, 67, 38] |
| `/ExoticAdventureReportLayer/CCNode_1` | CCNode | [578.0, 891.346] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureReportLayer/CCNode_2` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [0, 332] | [0.5, 0.5] | [567, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_2` | CCScale9Sprite | [2.88, 163.12] | [0.5, 0.5] | [567, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureReportLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [-265, 450] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「总路程」44 CloudYuanCuGBK.ttf rgb[130, 67, 38] |
| `/ExoticAdventureReportLayer/CCNode_2/UILabelTTF_2` | UILabelTTF | [-265, 410] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「固定奖励」44 CloudYuanCuGBK.ttf rgb[130, 67, 38] |
| `/ExoticAdventureReportLayer/CCNode_2/UILabelTTF_3` | UILabelTTF | [-265, 255.08] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「概率获得」44 CloudYuanCuGBK.ttf rgb[130, 67, 38] |
| `/ExoticAdventureReportLayer/CCNode_2/menu_fixed` | CCMenu | [0, 329.76] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/CCNode_2/scroll_view` | UIScrollViewBackpack | [-277, 93] | [0, 0] | [560, 140] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ExoticAdventureReportLayer/CCNode_2/lbl_distance` | UILabelTTF | [-193, 450] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999999」44 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureReportLayer/CCNode_2/CCMenu_1` | CCMenu | [0, 57.36] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureReportLayer/CCNode_2/CCMenu_1/btn_sure` | UIMenuItemLabel | [0, 1] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「開始」40 [255, 255, 255, 255] |
| `/ExoticAdventureReportLayer/CCNode_2/CCSprite_1` | CCSprite | [-33, 450] | [0.5, 0.5] | [28, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-time.png` c592aa02-775b-4243-9be4-b5fa26c93740 |
| `/ExoticAdventureReportLayer/CCNode_2/lbl_time` | UILabelTTF | [-7.1, 450] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「预计%s天」44 CloudYuanCuGBK.ttf rgb[231, 117, 42] |

## ExoticAdventureSailingLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureSailingLayer` | ExoticAdventureSailingLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_upper` | CCNode | [0.0, 873.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_upper/node_left` | CCNode | [640, -77] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1` | CCMenu | [-76.657, -1.736] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1/btn_back` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1/btn_info` | CCMenuItemImage | [8, -75] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1/btn_shop` | CCMenuItemImage | [0.989, -796.65] | [0.5, 0.5] | [100, 97] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-suijishijian.png` 39dec725-49e5-4f5a-842d-2ed434dd2810 |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1/btn_books` | UIMenuItemLabel | [7, -224] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-shijian.png` 3aea17c5-d824-4113-ab8c-a1c1e643165d · Label「事件图鉴」40 [255, 255, 255, 255] |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1/btn_black_shop` | UIMenuItemImage | [7, -144] | [0.5, 0.5] | [66, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-shop.png` cd3f7542-06ef-4fb7-9197-057911ec9a61 |
| `/ExoticAdventureSailingLayer/node_upper/node_left/CCMenu_1/btn_gift` | CCMenuItemImage | [1, -670.45] | [0.5, 0.5] | [100, 97] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-gife.png` 240fad9d-13ca-419c-89eb-9ff543f05af6 |
| `/ExoticAdventureSailingLayer/node_upper/node_right` | CCNode | [0, -77] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_upper/node_right/CCScale9Sprite_1` | CCScale9Sprite | [2, -199] | [0.5, 0.5] | [235, 235] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-daohangbg.png` 7e30e35a-81db-4ded-ac91-4e54763e19e0 insets[25, 25, 25, 25] |
| `/ExoticAdventureSailingLayer/node_upper/node_right/spr_progress_bg1` | CCSprite | [119.929, 7.284] | [0.5, 0.5] | [217, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdt-bg.png` 44167170-27c7-4cd6-a5e0-a7188434099a |
| `/ExoticAdventureSailingLayer/node_upper/node_right/CCSprite_1` | CCSprite | [117.48, -87.173] | [0.5, 0.5] | [196, 158] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-map3.png` bf230ffa-d5f5-426a-b0b9-ff5719f0d198 |
| `/ExoticAdventureSailingLayer/node_upper/node_right/spr_progress_bg` | CCSprite | [128.313, -87.173] | [0.5, 0.5] | [136, 115] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdbg.png` f44d0ae9-2f7e-4b99-a46d-6b57ed2ffe3d |
| `/ExoticAdventureSailingLayer/node_upper/node_right/spr_mao` | CCSprite | [65.98, -146.507] | [0.5, 0] | [28, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-mao.png` 72b9aeee-b80b-4573-9401-8456b5c409b1 |
| `/ExoticAdventureSailingLayer/node_upper/node_right/UILabelTTF_1` | UILabelTTF | [34.311, 8.964] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「航行进度」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureSailingLayer/node_upper/node_right/lbl_sailing_progress` | UILabelTTF | [121.678, 8.481] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「30%」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureSailingLayer/node_upper/node_right/CCSprite_2` | CCSprite | [39.44, -178.08] | [0.5, 0.5] | [28, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-time.png` c592aa02-775b-4243-9be4-b5fa26c93740 |
| `/ExoticAdventureSailingLayer/node_upper/node_right/node_time` | CCNode | [-0.08, -177.24] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_lower` | CCNode | [320.0, 127.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_lower/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [640, 140] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dibu.png` 9e49c793-a298-486a-b1a3-d9762ac646b9 |
| `/ExoticAdventureSailingLayer/node_lower/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_lower/CCMenu_1/btn_backpack` | UIMenuItemLabel | [-172.8, -3] | [0.5, 0.5] | [77, 77] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-05.png` bf3f5df2-0302-4318-81c5-5d2ecdfd0ed2 · Label「货仓」40 [255, 255, 255, 255] |
| `/ExoticAdventureSailingLayer/node_lower/CCMenu_1/UIMenuItemLabel_1` | UIMenuItemLabel | [161, -3] | [0.5, 0.5] | [77, 77] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-06.png` bb56d812-6fba-4f40-a627-b466558be236 · Label「舰长室」40 [255, 255, 255, 255] |
| `/ExoticAdventureSailingLayer/node_lower/CCMenu_1/btn_explore` | UIMenuItemLabel | [0.607, -22.616] | [0.5, 0.5] | [158, 157] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-tansuo.png` 3d013090-3440-4f06-9f22-4b68320667fe · Label「探索」45 [255, 255, 255, 255] |
| `/ExoticAdventureSailingLayer/node_lower/CCNode_1` | CCNode | [-58.752, 22.464] | [0, 0.5] | [122, 32] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSailingLayer/node_lower/CCNode_1/lbl_num_1` | UILabelTTF | [61.0, -42.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9」70 CloudYuanCuGBK.ttf rgb[151, 85, 51] |
| `/ExoticAdventureSailingLayer/node_lower/CCNode_1/spr_icon_1` | CCSprite | [61.0, 1.579] | [0.5, 0.5] | [100, 100] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-physicalstrength.png` efaf36b8-41f5-448b-8e78-6707185c3182 |

## ExoticAdventureSearchLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureSearchLayer` | ExoticAdventureSearchLayer | [0, 0] | [0, 0] | [720, 1280] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSearchLayer/node_bg` | CCNode | [374.333, 727.684] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSearchLayer/node_bg/UILabelTTF_1` | UILabelTTF | [0, -80] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「努力搜索中…」30 CloudYuanCuGBK.ttf rgb[216, 216, 216] |

## ExoticAdventureShioInfoCtr（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureShioInfoCtr` | ExoticAdventureShioInfoLayer | [0, 0] | [0, 0] | [640, 544] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoCtr/spr_bg` | CCScale9Sprite | [320.0, 272.0] | [0.5, 0.5] | [640, 544] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ExoticAdventureShioInfoCtr/node_title` | CCNode | [320.0, 539.104] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoCtr/node_title/spr_title_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ExoticAdventureShioInfoCtr/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「舰队信息」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureShioInfoCtr/node_title/spr_content` | CCScale9Sprite | [0, -210] | [0.5, 0.5] | [540, 270] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureShioInfoCtr/node_title/spr_input_bg` | CCScale9Sprite | [-45, -124] | [0.5, 0.5] | [300, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/ExoticAdventureShioInfoCtr/node_title/spr_progress_bg1` | CCSprite | [-45, -200.0] | [0.5, 0.5] | [306, 20] | [0.95, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdt1-1.png` 96cd5575-8f5c-4ba5-bc23-caa3aa2fc6f5 |
| `/ExoticAdventureShioInfoCtr/node_title/spr_progress_bg2` | CCSprite | [-45, -294.0] | [0.5, 0.5] | [306, 20] | [0.95, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdt1-1.png` 96cd5575-8f5c-4ba5-bc23-caa3aa2fc6f5 |
| `/ExoticAdventureShioInfoCtr/node_title/UILabelTTF_1` | UILabelTTF | [-122, -268] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「耐久度」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoCtr/node_title/UILabelTTF_2` | UILabelTTF | [-162, -174] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「lv.」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoCtr/node_title/lbl_skillpoints` | UILabelTTF | [0, -376.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「剩余科技点数：」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoCtr/CCNode_1` | CCNode | [579.0, 535.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoCtr/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoCtr/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureShioInfoCtr/CCMenu_1` | CCMenu | [320.0, 99.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoCtr/CCMenu_1/btn_add` | UIMenuItemLabel | [-182, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-upgrade.png` 100d2d5e-8d93-4279-be68-d8fe06492da3 · Label「快速添加」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoCtr/CCMenu_1/btn_sure` | UIMenuItemLabel | [53.04, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-upgrade.png` 100d2d5e-8d93-4279-be68-d8fe06492da3 · Label「熔炼」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoCtr/CCMenu_1/btn_name` | UIMenuItemLabel | [179.04, 317.0] | [0.5, 0.5] | [48, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-name.png` 7993a161-3822-4e31-8b1f-de4edbc7c10e · Label「熔炼」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoCtr/CCMenu_1/btn_repair` | UIMenuItemLabel | [179, 156.2] | [0.5, 0.5] | [48, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-repair.png` 35ee889f-fd19-4eb0-b8f2-33029690ec26 · Label「熔炼」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoCtr/CCMenu_1/btn_add` | UIMenuItemLabel | [-64.992, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-upgrade.png` 100d2d5e-8d93-4279-be68-d8fe06492da3 · Label「快速添加」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoCtr/CCMenu_1/btn_add` | UIMenuItemLabel | [181.008, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-upgrade.png` 100d2d5e-8d93-4279-be68-d8fe06492da3 · Label「快速添加」40 [255, 255, 255, 255] |

## ExoticAdventureShioInfoLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureShioInfoLayer` | ExoticAdventureShioInfoLayer | [0, 0] | [0, 0] | [640, 544] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoLayer/spr_bg` | CCScale9Sprite | [320.0, 272.0] | [0.5, 0.5] | [640, 544] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ExoticAdventureShioInfoLayer/node_bg` | CCNode | [320.0, 539.104] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoLayer/node_bg/spr_title_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ExoticAdventureShioInfoLayer/node_bg/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「舰队信息」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureShioInfoLayer/node_bg/spr_content` | CCScale9Sprite | [0, -210] | [0.5, 0.5] | [540, 270] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureShioInfoLayer/node_bg/spr_input_bg` | CCScale9Sprite | [-45, -124] | [0.5, 0.5] | [300, 46] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/ExoticAdventureShioInfoLayer/node_bg/spr_progress_bg1` | CCSprite | [-45, -200.0] | [0.5, 0.5] | [306, 20] | [0.95, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdt1-1.png` 96cd5575-8f5c-4ba5-bc23-caa3aa2fc6f5 |
| `/ExoticAdventureShioInfoLayer/node_bg/spr_progress_bg2` | CCSprite | [-45, -294.0] | [0.5, 0.5] | [306, 20] | [0.95, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdt1-1.png` 96cd5575-8f5c-4ba5-bc23-caa3aa2fc6f5 |
| `/ExoticAdventureShioInfoLayer/node_bg/UILabelTTF_1` | UILabelTTF | [-182, -268] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「耐久度」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoLayer/node_bg/lbl_level` | UILabelTTF | [-182, -174] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「lv.」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoLayer/node_bg/lbl_skillpoints` | UILabelTTF | [0, -376.8] | [0.5, 0.5] | [585, 29] | [1, 1] | 0 | 是 | cc.Label「剩余科技点数」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoLayer/node_bg/lbl_nick` | UILabelTTF | [-185, -124] | [0, 0.5] | [280, 29] | [1, 1] | 0 | 是 | cc.Label「」20 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/ExoticAdventureShioInfoLayer/node_bg/lbl_durability` | UILabelTTF | [-37, -294] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000/1000」18 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureShioInfoLayer/node_bg/lbl_lv` | UILabelTTF | [-37, -200] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000/1000」18 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureShioInfoLayer/CCNode_1` | CCNode | [579.0, 535.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [7, 5] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureShioInfoLayer/CCMenu_1` | CCMenu | [320.0, 99.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShioInfoLayer/CCMenu_1/btn_skill1` | UIMenuItemLabel | [-182, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-01.png` be24023b-6c56-4dc5-84f9-6735579565c7 · Label「装甲」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoLayer/CCMenu_1/btn_skill3` | UIMenuItemLabel | [53.04, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-03.png` 280c78c2-09c9-43aa-a17e-acbc092f3f16 · Label「船仓」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoLayer/CCMenu_1/btn_name` | UIMenuItemImage | [179.04, 317.0] | [0.5, 0.5] | [48, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-name.png` 7993a161-3822-4e31-8b1f-de4edbc7c10e |
| `/ExoticAdventureShioInfoLayer/CCMenu_1/btn_repair` | UIMenuItemImage | [179, 156.2] | [0.5, 0.5] | [48, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-repair.png` 35ee889f-fd19-4eb0-b8f2-33029690ec26 |
| `/ExoticAdventureShioInfoLayer/CCMenu_1/btn_skill2` | UIMenuItemLabel | [-64.992, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-02.png` efec328b-0919-4587-87f0-d4cf0d7af8d5 · Label「动力炉」40 [255, 255, 255, 255] |
| `/ExoticAdventureShioInfoLayer/CCMenu_1/btn_skill4` | UIMenuItemLabel | [181.008, -5] | [0.5, 0.5] | [71, 73] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/exotic-adventure/exotic-adventure_exotic-adventure-btn-04.png` 37bab075-e10f-4bfd-b02e-fbe2bb4bed2b · Label「武器库」40 [255, 255, 255, 255] |

## ExoticAdventureShopCell（35）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureShopCell` | ExoticAdventureShopCell | [0, 0] | [0, 0] | [590, 242] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/CCSprite_1` | CCSprite | [299, 31] | [0.5, 0.5] | [610, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_spr-heroshop-2.png` eec4e93a-22f9-42ae-b57e-f947f04d23a9 |
| `/ExoticAdventureShopCell/node_1` | CCNode | [3, 7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_1/lbl_item_name_1` | UILabelTTF | [96, 206] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「物品名称」22 FZCSJW--GB1-0.ttf rgb[255, 226, 179] |
| `/ExoticAdventureShopCell/node_1/lbl_count_1` | UILabelTTF | [94, 30] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「购买 1/1」20 FZCSJW--GB1-0.ttf rgb[129, 239, 255] |
| `/ExoticAdventureShopCell/node_1/node_item_1` | CCNode | [90, 144] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_1/menu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_1/sp_price_1` | CCSprite | [55, 57] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/ExoticAdventureShopCell/node_1/lbl_price_1` | UILabelTTF | [105, 54] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「60000」26 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ExoticAdventureShopCell/node_1/spr_sold_out_1` | CCSprite | [90, 136] | [0.5, 0.5] | [69, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_spr-duihao.png` ca2d1420-d337-4fb7-9414-b5c93331b575 |
| `/ExoticAdventureShopCell/node_1/is_time_1` | CCNode | [-47, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_1/is_time_1/CCSprite_1` | CCSprite | [145.095, -104.465] | [0.5, 0.5] | [149, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dk.png` 02e6259d-be4a-42ce-9f7e-a1507ebee769 |
| `/ExoticAdventureShopCell/node_1/is_time_1/lbl_limit_1` | UILabelTTF | [137.797, -102.835] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「限購：1/1」20 CloudYuanCuGBK.ttf rgbNone |
| `/ExoticAdventureShopCell/node_2` | CCNode | [200, 7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_2/lbl_item_name_2` | UILabelTTF | [96, 206] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「物品名称」22 FZCSJW--GB1-0.ttf rgb[255, 226, 179] |
| `/ExoticAdventureShopCell/node_2/lbl_count_2` | UILabelTTF | [94, 30] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「购买 1/1」20 FZCSJW--GB1-0.ttf rgb[129, 239, 255] |
| `/ExoticAdventureShopCell/node_2/node_item_2` | CCNode | [90, 144] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_2/menu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_2/sp_price_2` | CCSprite | [57, 57] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/ExoticAdventureShopCell/node_2/lbl_price_2` | UILabelTTF | [107, 54] | [0.5, 0.5] | [75, 39] | [1, 1] | 0 | 是 | cc.Label「60000」26 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ExoticAdventureShopCell/node_2/spr_sold_out_2` | CCSprite | [90, 136] | [0.5, 0.5] | [69, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_spr-duihao.png` ca2d1420-d337-4fb7-9414-b5c93331b575 |
| `/ExoticAdventureShopCell/node_2/is_time_2` | CCNode | [-47, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_2/is_time_2/CCSprite_1` | CCSprite | [145.095, -104.465] | [0.5, 0.5] | [149, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dk.png` 02e6259d-be4a-42ce-9f7e-a1507ebee769 |
| `/ExoticAdventureShopCell/node_2/is_time_2/lbl_limit_2` | UILabelTTF | [138.797, -102.835] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「限購：1/1」20 CloudYuanCuGBK.ttf rgbNone |
| `/ExoticAdventureShopCell/node_3` | CCNode | [397, 8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_3/lbl_item_name_3` | UILabelTTF | [96, 206] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「物品名称」22 FZCSJW--GB1-0.ttf rgb[255, 226, 179] |
| `/ExoticAdventureShopCell/node_3/lbl_count_3` | UILabelTTF | [94, 30] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「购买 1/1」20 FZCSJW--GB1-0.ttf rgb[129, 239, 255] |
| `/ExoticAdventureShopCell/node_3/node_item_3` | CCNode | [90, 144] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_3/menu_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_3/sp_price_3` | CCSprite | [56, 57] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/ExoticAdventureShopCell/node_3/lbl_price_3` | UILabelTTF | [107, 54] | [0.5, 0.5] | [75, 39] | [1, 1] | 0 | 是 | cc.Label「60000
」26 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ExoticAdventureShopCell/node_3/spr_sold_out_3` | CCSprite | [90, 136] | [0.5, 0.5] | [69, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_spr-duihao.png` ca2d1420-d337-4fb7-9414-b5c93331b575 |
| `/ExoticAdventureShopCell/node_3/is_time_3` | CCNode | [-47, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopCell/node_3/is_time_3/CCSprite_1` | CCSprite | [145.095, -104.465] | [0.5, 0.5] | [149, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-dk.png` 02e6259d-be4a-42ce-9f7e-a1507ebee769 |
| `/ExoticAdventureShopCell/node_3/is_time_3/lbl_limit_3` | UILabelTTF | [139.797, -102.835] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「限購：1/1」20 CloudYuanCuGBK.ttf rgbNone |

## ExoticAdventureShopLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureShopLayer` | ExoticAdventureShopLayer | [0, 0] | [0, 0] | [642, 952] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopLayer/spr_bg` | CCSprite | [321.0, 476.0] | [0.5, 0.5] | [640, 950] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-shopbg.png` fbcc0dad-903c-4203-be03-74f7d12919a5 |
| `/ExoticAdventureShopLayer/spr_kuang` | CCSprite | [322.0, 418.6] | [0.5, 0.5] | [640, 770] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_spr-heroshop-1.png` acca55ed-ff99-494f-a75a-f51ffe74a4f2 |
| `/ExoticAdventureShopLayer/scroll_view` | UIScrollViewBackpack | [45.28, 97.007] | [0, 0] | [550, 550] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ExoticAdventureShopLayer/CCMenu_1` | CCMenu | [607.313, 864.214] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureShopLayer/CCMenu_1/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureShopLayer/time_node` | CCNode | [321.0, 77.92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ExoticAdventureSummaryLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureSummaryLayer` | ExoticAdventureSummaryLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSummaryLayer/spr_bg` | CCSprite | [320.0, 599.0] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/ExoticAdventureSummaryLayer/spr_title` | CCSprite | [305.184, 817.496] | [0.5, 0.5] | [451, 151] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-hangxing.png` c4d3b2ed-2ee7-4c4b-b4d0-0a11b1e08c6e |
| `/ExoticAdventureSummaryLayer/menu` | CCMenu | [320.0, 607.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSummaryLayer/lbl_level` | UILabelTTF | [167.833, 697.167] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「lv.2」30 CloudYuanCuGBK.ttf rgb[230, 227, 161] |
| `/ExoticAdventureSummaryLayer/spr_progress_bg1` | CCSprite | [317.0, 695] | [0.5, 0.5] | [306, 20] | [0.95, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_exotic-adventure-spr-jdt1-1.png` 96cd5575-8f5c-4ba5-bc23-caa3aa2fc6f5 |
| `/ExoticAdventureSummaryLayer/lbl_lv` | UILabelTTF | [315.0, 696.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「10/10」18 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/ExoticAdventureSummaryLayer/UILabelTTF_1` | UILabelTTF | [364.833, 652.167] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「结算奖励」24 CloudYuanCuGBK.ttf rgb[230, 227, 161] |
| `/ExoticAdventureSummaryLayer/scroll_view` | UIScrollViewBackpack | [0.0, 427.0] | [0, 0] | [640, 200] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ExoticAdventureSummaryLayer/UIMenu_1` | UIMenu | [320.0, 350.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureSummaryLayer/UIMenu_1/btn_close` | UIMenuItemLabel | [0.0, 0.0] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「」24 [255, 255, 255, 255] |

## ExoticAdventureTeamLayer（62）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureTeamLayer` | ExoticAdventureTeamLayer | [0, 0] | [0, 0] | [640, 452] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, 452.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ExoticAdventureTeamLayer/spr_box` | CCScale9Sprite | [320.0, 169.36] | [0.5, 1] | [570, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureTeamLayer/spr_box` | CCScale9Sprite | [320.0, 343.52] | [0.5, 1] | [570, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ExoticAdventureTeamLayer/node_title` | CCNode | [322.0, 442.96] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ExoticAdventureTeamLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的队伍」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/ExoticAdventureTeamLayer/node_title/lbl_title` | UILabelTTF | [0, -83] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「动力系统」44 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/ExoticAdventureTeamLayer/node_title/lbl_title` | UILabelTTF | [0, -256] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「武器系统」44 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/ExoticAdventureTeamLayer/node_title/CCSprite_1` | CCSprite | [-73, -98] | [0, 0] | [154, 28] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/ExoticAdventureTeamLayer/node_title/CCSprite_2` | CCSprite | [73, -98] | [0, 0] | [154, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/ExoticAdventureTeamLayer/node_title/CCSprite_3` | CCSprite | [-73, -271] | [0, 0] | [154, 28] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/ExoticAdventureTeamLayer/node_title/CCSprite_4` | CCSprite | [73, -271] | [0, 0] | [154, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/ExoticAdventureTeamLayer/node_title/CCNode_1` | CCNode | [-252, -170] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/CCNode_2` | CCNode | [-252, -346] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/CCNode_3` | CCNode | [-171, -127] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/ExoticAdventureTeamLayer/node_title/CCNode_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [161, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr_power_bg.png` 252fd04e-288a-4209-8641-cb346cc55a61 |
| `/ExoticAdventureTeamLayer/node_title/CCNode_3/lbl_power_1` | UILabelTTF | [10, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1` | CCNode | [-253, -167] | [0, 0.5] | [505, 84] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_1` | CCNode | [41, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_1/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_1/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_2` | CCNode | [125, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_2/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_3` | CCNode | [210, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_3/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_3/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_4` | CCNode | [294, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_4/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_4/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_5` | CCNode | [379, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_5/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_5/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_6` | CCNode | [463, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_6/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_1/node_pos_1_6/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2` | CCNode | [-253, -345.759] | [0, 0.5] | [505, 84] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_1` | CCNode | [40, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_1/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_1/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_2` | CCNode | [125, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_2/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_3` | CCNode | [210, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_3/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_3/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_4` | CCNode | [294, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_4/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_4/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_5` | CCNode | [379, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_5/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_5/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_6` | CCNode | [463, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_6/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ExoticAdventureTeamLayer/node_title/node_hero_2/node_pos_2_6/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ExoticAdventureTeamLayer/node_title/CCNode_4` | CCNode | [-171, -302] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/ExoticAdventureTeamLayer/node_title/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [161, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr_power_bg.png` 252fd04e-288a-4209-8641-cb346cc55a61 |
| `/ExoticAdventureTeamLayer/node_title/CCNode_4/lbl_power_2` | UILabelTTF | [10, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/ExoticAdventureTeamLayer/CCNode_1` | CCNode | [578.0, 452.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureTeamLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [7, -5] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## ExoticAdventureUpgradeLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ExoticAdventureUpgradeLayer` | ExoticAdventureUpgradeLayer | [0, 0] | [0, 0] | [450, 600] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureUpgradeLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [450, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/ExoticAdventureUpgradeLayer/node` | CCNode | [225.0, 595.161] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureUpgradeLayer/node/lbl_name` | UILabelTTF | [-67.6, -77.6] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「装备更换」48 CloudYuanCuGBK.ttf rgb[255, 163, 78] |
| `/ExoticAdventureUpgradeLayer/node/spr_icon` | CCSprite | [-135.64, -79.16] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/exotic-adventure/exotic-adventure_spr-upgrade-1.png` 46e6e9d7-7d05-49ff-a205-8544ba50918e |
| `/ExoticAdventureUpgradeLayer/node/CCSprite_1` | CCSprite | [0, -162.0] | [0.5, 0.5] | [1162, 10] | [0.4, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line.png` a55e1c16-e390-432e-a407-fbf040689681 |
| `/ExoticAdventureUpgradeLayer/node/lbl_describe` | UILabelTTF | [-190, -217.4] | [0, 0.5] | [405, 100] | [1, 1] | 0 | 是 | cc.Label「描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述描述」20 CloudYuanCuGBK.ttf rgb[254, 253, 191] |
| `/ExoticAdventureUpgradeLayer/node/UILabelTTF_1` | UILabelTTF | [-191, -273] | [0, 1] | auto | [1, 1] | 0 | 是 | cc.Label「当前等级加成: 」20 CloudYuanCuGBK.ttf rgb[254, 253, 191] |
| `/ExoticAdventureUpgradeLayer/node/UILabelTTF_2` | UILabelTTF | [-191, -389.6] | [0, 1] | auto | [1, 1] | 0 | 是 | cc.Label「下一级加成：」20 CloudYuanCuGBK.ttf rgb[254, 253, 191] |
| `/ExoticAdventureUpgradeLayer/node/lbl_next_markup` | UILabelTTF | [-191, -420.2] | [0, 1] | auto | [1, 1] | 0 | 是 | cc.Label「」20 CloudYuanCuGBK.ttf rgb[0, 219, 48] |
| `/ExoticAdventureUpgradeLayer/node/lbl_markup` | UILabelTTF | [-191, -304.4] | [0, 1] | auto | [1, 1] | 0 | 是 | cc.Label「下一级加成：」20 CloudYuanCuGBK.ttf rgb[254, 253, 191] |
| `/ExoticAdventureUpgradeLayer/node/lbl_skill_num` | UILabelTTF | [-217.8, -478.4] | [0, 1] | [437, 29] | [1, 1] | 0 | 是 | cc.Label「剩余科技点数：hhhhh」20 CloudYuanCuGBK.ttf rgb[254, 253, 191] |
| `/ExoticAdventureUpgradeLayer/node/menu` | UIMenu | [27.6, 3.6] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ExoticAdventureUpgradeLayer/node/menu/btn_close` | UIMenuItemImage | [160, -20] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ExoticAdventureUpgradeLayer/node/menu/btn_updata` | UIMenuItemLabel | [-33, -543] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「升级」48 [122, 71, 45, 255] |
