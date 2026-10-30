# P4-c 背包/装备/锻造 Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| BackpackInfoLayer | `prefabs/ui/backpack/BackpackInfoLayer.prefab` | 16 |
| BackpackLayer | `prefabs/ui/backpack/BackpackLayer.prefab` | 12 |
| BackpackSrcCell | `prefabs/ui/backpack/BackpackSrcCell.prefab` | 7 |
| BackpackSrcLayer | `prefabs/ui/backpack/BackpackSrcLayer.prefab` | 15 |
| BackpackUsePanel | `prefabs/ui/backpack/BackpackUsePanel.prefab` | 11 |
| DecomposeSelectLayer | `prefabs/ui/decompose/DecomposeSelectLayer.prefab` | 22 |
| EquipCell | `prefabs/ui/equip/EquipCell.prefab` | 8 |
| EquipChangeLayer | `prefabs/ui/equip/EquipChangeLayer.prefab` | 7 |
| MakeEquipCell | `prefabs/ui/make-equip/MakeEquipCell.prefab` | 15 |
| MakeEquipOneKeyTipsLayer | `prefabs/ui/make-equip/MakeEquipOneKeyTipsLayer.prefab` | 6 |
| MakeGemOneKeyTipsLayer | `prefabs/ui/make-gem/MakeGemOneKeyTipsLayer.prefab` | 6 |
| SmithArtifactLayer | `prefabs/ui/smith/SmithArtifactLayer.prefab` | 41 |
| SmithEquipLayer | `prefabs/ui/smith/SmithEquipLayer.prefab` | 13 |
| SmithGemLayer | `prefabs/ui/smith/SmithGemLayer.prefab` | 46 |
| SmithGodEquipLayer | `prefabs/ui/smith/SmithGodEquipLayer.prefab` | 53 |
| SmithLayer | `prefabs/ui/smith/SmithLayer.prefab` | 13 |
| SmithRingLayer | `prefabs/ui/smith/SmithRingLayer.prefab` | 42 |
| SmithRunesLayer | `prefabs/ui/smith/SmithRunesLayer.prefab` | 17 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/common/win-bg_block-gray-2.png` | [2, 2, 2, 2] |
| `ui/summon/main-summon_buy-num-bg-2.png` | [8, 8, 8, 8] |

由更早的 P4 PR 改（本 PR 不碰）：

- `ui/common/win-bg_block-bg-26.png` → P4B

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/other_kuang.png` [29, 49, 33, 39]（edited by P3A）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/hero/hero-info_spr-bg-6.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_block-bg-20.png` [9, 9, 9, 9]（edited by P2A）
- `ui/common/rank_spr-cell-bg-1.png` [30, 30, 30, 30]（edited by P2A）
- `ui/common/win-bg_block-bg-43.png` [9, 9, 9, 9]（edited by P3F）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `BackpackSrcLayer:/BackpackSrcLayer/spr_bg` |
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `SmithEquipLayer:/SmithEquipLayer/spr_bg` |
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `SmithGemLayer:/SmithGemLayer/node_content/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BackpackLayer:/BackpackLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `EquipChangeLayer:/EquipChangeLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BackpackLayer:/BackpackLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BackpackSrcLayer:/BackpackSrcLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DecomposeSelectLayer:/DecomposeSelectLayer/node_1/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DecomposeSelectLayer:/DecomposeSelectLayer/node_2/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `EquipChangeLayer:/EquipChangeLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SmithEquipLayer:/SmithEquipLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SmithRunesLayer:/SmithRunesLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [15, 15, 15, 15] | `SmithGodEquipLayer:/SmithGodEquipLayer/node_content/CCScale9Sprite_1` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `BackpackInfoLayer:/BackpackInfoLayer/spr_bg` |
| `win-bg_block-bg-26.png` | [9, 9, 9, 9] | [7, 7, 7, 7] | `SmithGemLayer:/SmithGemLayer/node_content/spr_scroll_view_bg` |

## BackpackInfoLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BackpackInfoLayer` | BackpackInfoLayer | [0, 0] | [0, 0] | [390, 300] | [1, 1] | 0 | 是 |  |
| `/BackpackInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/BackpackInfoLayer/node` | CCNode | [195.0, 297.581] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BackpackInfoLayer/node/spr_icon` | CCSprite | [-116, -62] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/BackpackInfoLayer/node/lbl_prop_name` | UILabelTTF | [-55, -40] | [0, 0.5] | [450, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「装备更换」48 STZhongsong.ttf rgb[134, 236, 149] |
| `/BackpackInfoLayer/node/lbl_prop_type` | UILabelTTF | [-55, -90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「类型：武器」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/BackpackInfoLayer/node/spr_line` | CCSprite | [0, -130] | [0.5, 0.5] | [380, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-line.png` c6234db7-ebbd-43bb-863f-6c99505dbdc3 |
| `/BackpackInfoLayer/node/lbl_desc` | UILabelTTF | [0, -140] | [0.5, 1] | [700, 180] | [0.5, 0.5] | 0 | **否** | cc.Label「获得途径:钻石抽卡,友情抽卡,钻石抽卡,友情抽卡,钻石抽卡」34 STZhongsong.ttf rgb[255, 249, 197] |
| `/BackpackInfoLayer/node/lbl_content_node` | CCNode | [0, -140] | [0.5, 1] | [350, 90] | [1, 1] | 0 | 是 |  |
| `/BackpackInfoLayer/node/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BackpackInfoLayer/node/menu/btn_src` | UIMenuItemImage | [139, -75] | [0.5, 0.5] | [67, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-src.png` fc1ffb2a-2d0e-4fd2-89fe-779b304fa5f3 |
| `/BackpackInfoLayer/node/menu/btn_detail` | UIMenuItemLabel | [-89, -260] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「详 情」48 [100, 50, 0, 255] |
| `/BackpackInfoLayer/node/menu/btn_enter` | UIMenuItemLabel | [91, -260] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「使 用」48 [100, 50, 0, 255] |
| `/BackpackInfoLayer/node/menu/btn_decompose` | UIMenuItemLabel | [-89, -260] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「详 情」48 [100, 50, 0, 255] |
| `/BackpackInfoLayer/node/menu_close` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BackpackInfoLayer/node/menu_close/btn_close` | UIMenuItemImage | [165, -20] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## BackpackLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BackpackLayer` | BackpackLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/BackpackLayer/spr_bg` | CCScale9Sprite | [320.0, 105.75] | [0.5, 0] | [640.0, 614.4] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/BackpackLayer/spr_box` | CCScale9Sprite | [320.0, 615.75] | [0.5, 1] | [560.0, 461.76] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/BackpackLayer/node_title` | CCNode | [320.0, 713.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BackpackLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BackpackLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「背  包」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/BackpackLayer/btn_scroll_view` | CCScrollView | [321.0, 615.0] | [0.5, 0] | [544.0, 48.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/BackpackLayer/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/BackpackLayer/UIMenu_1/btn_get` | UIMenuItemLabel | [372.0, 155.25] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「前往获取」44 [255, 255, 255, 255] |
| `/BackpackLayer/UIMenu_1/btn_sale` | UIMenuItemLabel | [511.0, 155.25] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「一键出售」44 [255, 255, 255, 255] |
| `/BackpackLayer/CCNode_1` | CCNode | [320.0, 713.28] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BackpackLayer/CCNode_1/spr_bubble_bg` | CCScale9Sprite | [0, 65] | [1, 0] | [300, 88] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_kuang.png` 983a72dd-8ad6-4489-83cc-eb82bf1e92f7 insets[30, 50, 35, 40] |

## BackpackSrcCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BackpackSrcCell` | BackpackSrcCell | [0, 0] | [0, 0] | [480, 120] | [1, 1] | 0 | 是 |  |
| `/BackpackSrcCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [480, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/BackpackSrcCell/lbl_title` | UILabelTTF | [40, 90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「来源途径」48 STZhongsong.ttf rgb[213, 116, 21] |
| `/BackpackSrcCell/lbl_content` | UILabelTTF | [40, 70] | [0, 1] | [640, 120] | [0.5, 0.5] | 0 | 是 | cc.Label「来源介绍会计师老大哥看路撒打算反击阿斯蒂芬案例」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/BackpackSrcCell/spr_suggest` | CCSprite | [20, 110] | [0.5, 0.5] | [57, 38] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_spr-suggest.png` 5369f30d-a642-4ce4-abec-7a3d97e0b586 |
| `/BackpackSrcCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BackpackSrcCell/menu/btn_go` | UIMenuItemLabel | [420, 60] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「前 往」48 [255, 250, 185, 255] |

## BackpackSrcLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BackpackSrcLayer` | BackpackSrcLayer | [0, 0] | [0, 0] | [520, 580] | [1, 1] | 0 | 是 |  |
| `/BackpackSrcLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [520, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[10, 10, 10, 10] |
| `/BackpackSrcLayer/node_title` | CCNode | [260.0, 580.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BackpackSrcLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BackpackSrcLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得来源」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/BackpackSrcLayer/spr_scroll_bg` | CCScale9Sprite | [10, 10] | [0.5, 0.5] | [500, 360] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/BackpackSrcLayer/spr_icon` | CCSprite | [85, 460] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/BackpackSrcLayer/lbl_prop_name` | UILabelTTF | [150, 475] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「阿克六四英雄碎片」52 STZhongsong.ttf rgb[141, 89, 58] |
| `/BackpackSrcLayer/line` | CCSprite | [290, 470] | [0.5, 0.5] | [1160, 8] | [0.3, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_line.png` b3dd6c4a-8ac9-474c-a65e-5f984fc4d4ca |
| `/BackpackSrcLayer/lbl_content_node` | CCNode | [37, 160] | [0, 1] | [510.0, 80] | [1, 1] | 0 | 是 |  |
| `/BackpackSrcLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BackpackSrcLayer/menu/btn_close` | UIMenuItemImage | [474, 556] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BackpackSrcLayer/lbl_prop_num` | UILabelTTF | [500, 475] | [1, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「拥有: 9999」48 STZhongsong.ttf rgb[231, 117, 42] |
| `/BackpackSrcLayer/scroll_view` | UIScrollViewBackpack | [20, 15] | [0, 0] | [480, 350] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/BackpackSrcLayer/scroll_view_content` | CCScrollView | [150, 460] | [0, 1] | [360, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## BackpackUsePanel（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BackpackUsePanel` | BackpackUsePanel | [0, 0] | [0, 0] | [460, 260] | [1, 1] | 0 | 是 |  |
| `/BackpackUsePanel/spr_bg` | CCScale9Sprite | [-9, -9] | [0.5, 0.5] | [476, 276] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/BackpackUsePanel/edit_box_bg` | CCScale9Sprite | [230, 97] | [0.5, 0.5] | [108, 24] | [1.2, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/common/make-equip_edit-box-bg.png` a64b669a-ad59-49f5-bb99-35b588ff0450 |
| `/BackpackUsePanel/node_need` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BackpackUsePanel/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BackpackUsePanel/menu/btn_sub` | UIMenuItemImage | [140, 97] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-10.png` 196d417f-2208-46b7-88f8-cf56dbf8fbfb |
| `/BackpackUsePanel/menu/btn_add` | UIMenuItemImage | [320, 97] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-10.png` 1f83c385-6f6e-4528-a891-9eecdd2614b6 |
| `/BackpackUsePanel/menu/btn_close` | UIMenuItemImage | [417, 240] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BackpackUsePanel/menu/btn_enter` | UIMenuItemLabel | [230, 53] | [0.5, 0.5] | [136, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「使  用」48 [122, 71, 45, 255] |
| `/BackpackUsePanel/node_item` | CCNode | [230, 157] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BackpackUsePanel/lbl_name` | UILabelTTF | [230, 217] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「——」18 STZhongsong.ttf rgb[85, 30, 20] |

## DecomposeSelectLayer（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DecomposeSelectLayer` | DecomposeSelectLayer | [0, 0] | [0, 0] | [528, 461] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [528, 461] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/DecomposeSelectLayer/node_title` | CCNode | [264.0, 461.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DecomposeSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「购 买」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/DecomposeSelectLayer/lbl_item_name` | UILabelTTF | [264, 361] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「分解道具XXXXX，将获得一下材料」22 FZCSJW--GB1-0.ttf rgb[121, 71, 44] |
| `/DecomposeSelectLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/menu/btn_close` | UIMenuItemImage | [480, 438] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DecomposeSelectLayer/menu/btn_submit` | UIMenuItemImage | [264, 46] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 |
| `/DecomposeSelectLayer/node_item` | CCNode | [84, 331] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/node_price` | CCNode | [145, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/edit_box_bg` | CCScale9Sprite | [200, 281] | [0.5, 0.5] | [128, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-gray-2.png` 00db9478-e696-404d-abd5-96379d7c07f9 insets[3, 3, 3, 3] |
| `/DecomposeSelectLayer/menu_operate` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/menu_operate/btn_sub` | UIMenuItemImage | [178, 297] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-sub-1.png` b7b37bfa-f87d-44b7-904d-6f7cd8baacda |
| `/DecomposeSelectLayer/menu_operate/btn_add` | UIMenuItemImage | [351, 297] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-add-1.png` 55ea79d1-a919-4011-a3b6-c40c1738aba0 |
| `/DecomposeSelectLayer/menu_operate/btn_max` | UIMenuItemImage | [403, 297] | [0.5, 0.5] | [58, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-max-1.png` 508d15ad-b1a1-427c-b4e6-5b8ffc841daa |
| `/DecomposeSelectLayer/node_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DecomposeSelectLayer/node_1/spr_scroll_bg` | CCScale9Sprite | [20, 80] | [0.5, 0.5] | [489, 188] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DecomposeSelectLayer/node_1/scroll_view_1` | CCScrollView | [22, 82] | [0, 0] | [485, 184] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/DecomposeSelectLayer/node_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/DecomposeSelectLayer/node_2/spr_scroll_bg` | CCScale9Sprite | [20, 80] | [0.5, 0.5] | [489, 250] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DecomposeSelectLayer/node_2/scroll_view_2` | CCScrollView | [22, 82] | [0, 0] | [485, 248] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## EquipCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EquipCell` | EquipCell | [0, 0] | [0, 0] | [550, 160] | [1, 1] | 0 | 是 |  |
| `/EquipCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/EquipCell/spr_select` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[30, 30, 30, 30] |
| `/EquipCell/menu` | CCMenu | [59, 59] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/EquipCell/menu/btn_up_change` | UIMenuItemLabel | [395, 20] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「卸下」48 [255, 255, 255, 255] |
| `/EquipCell/lbl_name` | UILabelTTF | [144, 117] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备更换」24 STZhongsong.ttf rgb[237, 137, 54] |
| `/EquipCell/show_attr_rich` | CCNode | [144, 106] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/EquipCell/lbl_score` | UILabelTTF | [270, 117] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9级别g宝石」44 STZhongsong.ttf rgb[32, 166, 0] |

## EquipChangeLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EquipChangeLayer` | EquipChangeLayer | [0, 0] | [0, 0] | [640, 748] | [1, 1] | 0 | 是 |  |
| `/EquipChangeLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 748] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/EquipChangeLayer/spr_title_bg` | CCScale9Sprite | [321, 737] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/EquipChangeLayer/lbl_name` | UILabelTTF | [320, 694] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备更换」26 STZhongsong.ttf rgb[255, 231, 195] |
| `/EquipChangeLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/EquipChangeLayer/CCMenu_1/btn_close` | UIMenuItemImage | [577, 710] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/EquipChangeLayer/spr_bg` | CCScale9Sprite | [40, 61] | [0.5, 0.5] | [560, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |

## MakeEquipCell（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MakeEquipCell` | MakeEquipCell | [0, 0] | [0, 0] | [480, 240] | [1, 1] | 0 | 是 |  |
| `/MakeEquipCell/CCSprite_1` | CCSprite | [240, 162] | [0.5, 0.5] | [522, 502] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/make-equip_smith-bg.png` 928af5ba-7ec5-4107-859a-fc082a8f0b31 |
| `/MakeEquipCell/edit_box_bg` | CCScale9Sprite | [240, 35] | [0.5, 0.5] | [108, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/make-equip_edit-box-bg.png` a64b669a-ad59-49f5-bb99-35b588ff0450 |
| `/MakeEquipCell/spr_item_bg_1` | CCSprite | [96, 192] | [0.5, 0.5] | [202, 202] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/make-equip_item-bg.png` aa20e92d-2b64-48d3-9508-688408b22640 |
| `/MakeEquipCell/spr_item_bg_2` | CCSprite | [385, 192] | [0.5, 0.5] | [202, 202] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/make-equip_item-bg.png` aa20e92d-2b64-48d3-9508-688408b22640 |
| `/MakeEquipCell/node_need` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MakeEquipCell/node_need/spr_tip_bg` | CCSprite | [240, 80] | [0.5, 0.5] | [248, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-boss_spr-boss-tip-bg.png` c6d196ba-02a3-4745-b4cd-14fb38a83943 |
| `/MakeEquipCell/node_need/spr_gold_need` | CCSprite | [180, 80] | [0.5, 0.5] | [100, 100] | [0.35, 0.35] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/MakeEquipCell/node_need/lbl_gold_need` | UILabelTTF | [240, 80] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/MakeEquipCell/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MakeEquipCell/menu/btn_sub` | UIMenuItemImage | [150, 35] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-10.png` 196d417f-2208-46b7-88f8-cf56dbf8fbfb |
| `/MakeEquipCell/menu/btn_add` | UIMenuItemImage | [330, 35] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-10.png` 1f83c385-6f6e-4528-a891-9eecdd2614b6 |
| `/MakeEquipCell/need_node` | CCNode | [96, 192] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MakeEquipCell/cur_node` | CCNode | [385, 192] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MakeEquipCell/node_compose` | CCNode | [240, 192] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## MakeEquipOneKeyTipsLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MakeEquipOneKeyTipsLayer` | MakeEquipOneKeyTipsLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/MakeEquipOneKeyTipsLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [600, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/MakeEquipOneKeyTipsLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/MakeEquipOneKeyTipsLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MakeEquipOneKeyTipsLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/MakeEquipOneKeyTipsLayer/lbl_select` | UILabelTTF | [55, 275] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选中英雄：0/0」22 STZhongsong.ttf rgb[89, 53, 15] |

## MakeGemOneKeyTipsLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MakeGemOneKeyTipsLayer` | MakeGemOneKeyTipsLayer | [0, 0] | [0, 0] | [580, 320] | [1, 1] | 0 | 是 |  |
| `/MakeGemOneKeyTipsLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [600, 340] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/MakeGemOneKeyTipsLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/MakeGemOneKeyTipsLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MakeGemOneKeyTipsLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 55.312] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/MakeGemOneKeyTipsLayer/UILabelTTF_1` | UILabelTTF | [55, 275] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「合成预览」22 STZhongsong.ttf rgb[89, 53, 15] |

## SmithArtifactLayer（41）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithArtifactLayer` | SmithArtifactLayer | [0, 0] | [0, 0] | [615, 881] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/CCSprite_1` | CCSprite | [0, 0] | [0, 0] | [613, 879] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_spr-ctr-bg.png` e4124908-459e-426e-b1ae-317bdcd68865 |
| `/SmithArtifactLayer/node_equip_panel` | CCNode | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1` | CCNode | [0.0, 0.0] | [0.5, 1] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCSprite_1` | CCSprite | [298.0, 595] | [0.5, 0.5] | [364, 365] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_spr-up-level-bg.png` 11cf4b66-6057-4e69-824e-58f0d264ac3a |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_1` | CCNode | [0.0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_1/menu_equip_1` | UIMenu | [300.0, 718.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_1/menu_equip_1/btn_add_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_2` | CCNode | [0.0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_2/menu_equip_2` | UIMenu | [172.0, 511.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_2/menu_equip_2/btn_add_2` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_3` | CCNode | [0.0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_3/menu_equip_3` | UIMenu | [422.0, 510.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_3/menu_equip_3/btn_add_3` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_4` | CCNode | [300.0, 590] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_4/menu_equip_0` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_equip_panel/CCNode_1/CCNode_4/menu_equip_0/btn_add_0` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [110, 110] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-10.png` cc7bfb1e-0bc9-45f0-bc04-827ee0ea5562 |
| `/SmithArtifactLayer/CCSprite_2` | CCSprite | [300, 499] | [0.5, 0.5] | [139, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/artifacts_spr-shadow.png` 09189dd3-c07f-4583-b23f-12f8e5ea1a0b |
| `/SmithArtifactLayer/lbl_ring_name` | UILabelTTF | [300, 499] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神化灵器」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/SmithArtifactLayer/node_content` | CCNode | [0, 0] | [0.5, 1] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_content/lbl_ring_1` | UILabelTTF | [318.0, 330] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神化灵器」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/SmithArtifactLayer/node_content/CCSprite_1` | CCSprite | [458.0, 330] | [0.5, 0.5] | [176, 11] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line1.png` f8df8825-1bda-4fc9-93ab-580cbcfce883 |
| `/SmithArtifactLayer/node_content/CCSprite_2` | CCSprite | [178.0, 330] | [0.5, 0.5] | [176, 11] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line1.png` f8df8825-1bda-4fc9-93ab-580cbcfce883 |
| `/SmithArtifactLayer/node_content/CCScale9Sprite_1` | CCScale9Sprite | [307.0, 210] | [0.5, 0.5] | [560, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-43.png` 4e6aa903-7fa8-4788-945b-31d250111897 insets[10, 10, 10, 10] |
| `/SmithArtifactLayer/node_content/UIMenu_1` | UIMenu | [0.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | **否** |  |
| `/SmithArtifactLayer/node_content/UIMenu_1/btn_info` | UIMenuItemImage | [-84.491, -20] | [0.5, 0.5] | [60, 61] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SmithArtifactLayer/node_content/CCLayerGradient_1` | CCLayerGradient | [315.0, 121] | [0, 0] | [2, 180] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_content/lbl_tips` | UILabelTTF | [173.0, 282] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「首饰路线选择」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/SmithArtifactLayer/node_content/menu_route` | UIMenu | [0.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/node_content/menu_route/btn_artifact_1` | UIMenuItemImage | [105, 211] | [0.5, 0.5] | [126, 126] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/SmithArtifactLayer/node_content/menu_route/btn_artifact_2` | UIMenuItemImage | [240, 211] | [0.5, 0.5] | [126, 126] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_spr-frame-artifact.png` eb494376-af7f-4c95-b787-135bfc7b8b52 |
| `/SmithArtifactLayer/node_content/lbl_ring_1` | UILabelTTF | [105.0, 140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击向」18 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/SmithArtifactLayer/node_content/lbl_ring_2` | UILabelTTF | [240.0, 140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御向」18 CloudYuanCuGBK.ttf rgb[116, 76, 38] |
| `/SmithArtifactLayer/node_content/scroll_view` | CCScrollView | [323.0, 116] | [0, 0] | [260, 186] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SmithArtifactLayer/node_content/skill_menu` | UIMenu | [362.0, 86] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/menu_compose` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/menu_compose/btn_compose` | UIMenuItemLabel | [319, 65] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「合  成」48 [255, 255, 255, 255] |
| `/SmithArtifactLayer/spr_title_bg` | CCScale9Sprite | [308, 880] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SmithArtifactLayer/lbl_name` | UILabelTTF | [308, 841] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「装备更换」26 STZhongsong.ttf rgb[255, 231, 195] |
| `/SmithArtifactLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithArtifactLayer/menu/btn_close` | UIMenuItemImage | [561, 857] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## SmithEquipLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithEquipLayer` | SmithEquipLayer | [0, 0] | [0, 0] | [562, 706] | [1, 1] | 0 | 是 |  |
| `/SmithEquipLayer/spr_bg` | CCScale9Sprite | [30, 35] | [0.5, 0.5] | [500, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[10, 10, 10, 10] |
| `/SmithEquipLayer/spr_scroll_view_bg` | CCScale9Sprite | [40, 45] | [0.5, 0.5] | [480, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/SmithEquipLayer/scrollView` | CCScrollView | [45, 50] | [0, 0] | [470, 170] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SmithEquipLayer/menu_tab` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithEquipLayer/menu_tab/btn_tab1` | UIMenuItemTab | [96, 235] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc |
| `/SmithEquipLayer/menu_tab/btn_tab2` | UIMenuItemTab | [220, 235] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc |
| `/SmithEquipLayer/menu_tab/btn_tab3` | UIMenuItemTab | [340, 235] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc |
| `/SmithEquipLayer/menu_tab/btn_tab4` | UIMenuItemTab | [460, 235] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc |
| `/SmithEquipLayer/menu_compose` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithEquipLayer/menu_compose/btn_one_key` | UIMenuItemLabel | [390, 320] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「一键合成」24 [255, 255, 255, 255] |
| `/SmithEquipLayer/menu_compose/btn_compose` | UIMenuItemLabel | [172, 320] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「合  成」24 [255, 255, 255, 255] |
| `/SmithEquipLayer/node_cell` | CCNode | [40, 360] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## SmithGemLayer（46）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithGemLayer` | SmithGemLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_content` | CCNode | [320.0, 349.5] | [0.5, 1] | [570, 350] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_content/menu_tab` | UIMenu | [-285.0, -350] | [0, 0] | [0.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_content/menu_tab/btn_tab1` | UIMenuItemTab | [81.0, 348.0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「攻击宝石」48 [122, 71, 45, 255] |
| `/SmithGemLayer/node_content/menu_tab/btn_tab2` | UIMenuItemTab | [223.0, 348.0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「生命宝石」48 [122, 71, 45, 255] |
| `/SmithGemLayer/node_content/menu_tab/btn_tab3` | UIMenuItemTab | [365.0, 348.0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「速度宝石」48 [122, 71, 45, 255] |
| `/SmithGemLayer/node_content/spr_bg` | CCScale9Sprite | [-285.0, -350] | [0.5, 0.5] | [570.0, 350.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[10, 10, 10, 10] |
| `/SmithGemLayer/node_content/spr_scroll_view_bg` | CCScale9Sprite | [0.0, -175.0] | [0.5, 0.5] | [547.2, 329.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-26.png` 283bf4bb-a51c-45ef-aa52-ef75cec591a5 insets[8, 8, 8, 8] |
| `/SmithGemLayer/node_content/scroll_view` | CCScrollView | [0.0, -175.0] | [0.5, 0.5] | [547.2, 318.5] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SmithGemLayer/menu_compose` | UIMenu | [0.0, 0.0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/menu_compose/btn_one_key` | UIMenuItemLabel | [430.0, 420.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「一键合成」24 [255, 255, 255, 255] |
| `/SmithGemLayer/menu_compose/btn_compose` | UIMenuItemLabel | [209.0, 420.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「合  成」24 [255, 255, 255, 255] |
| `/SmithGemLayer/node_gem_panel` | CCNode | [320.0, 603.75] | [0.5, 0.5] | [370, 400] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1` | CCNode | [0.0, 200.0] | [0.5, 1] | [370, 347] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCSprite_1` | CCSprite | [0.0, -193.0] | [0.5, 0.5] | [370, 347] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg.png` b27cb1eb-d0a3-471d-a82c-4a65cb458e49 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCSprite_2` | CCSprite | [0.0, -193.0] | [0.5, 0.5] | [276, 276] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_jdt2.png` 952425e6-89eb-4cdc-bc7a-defeb5369b37 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCSprite_3` | CCSprite | [0.0, -193.0] | [0.5, 0.5] | [174, 179] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-2.png` 5e5a5b3d-2a6a-48a8-a4de-fa4386566a17 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_1` | CCNode | [0.0, -63.0] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [149, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-6.png` bba72383-1cbf-4f11-9939-210bad180fea |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_1/UIMenu_1` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_1/UIMenu_1/btn_gem_1` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_1011001.png` c0b6cb46-b616-491a-a15b-08d3e28ee766 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_1/node_star_1` | CCNode | [0.0, -30.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_1/lbl_gem_num_1` | UILabelTTF | [30.0, 30.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0/3」40 STZhongsong.ttf rgbNone |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_2` | CCNode | [-105.0, -287.0] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_2/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [149, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-6.png` bba72383-1cbf-4f11-9939-210bad180fea |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_2/UIMenu_1` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_2/UIMenu_1/btn_gem_2` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_1011001.png` c0b6cb46-b616-491a-a15b-08d3e28ee766 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_2/node_star_2` | CCNode | [0.0, -30.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_2/lbl_gem_num_2` | UILabelTTF | [30.0, 30.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0/3」40 STZhongsong.ttf rgbNone |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_3` | CCNode | [105.0, -287.0] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_3/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [149, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-6.png` bba72383-1cbf-4f11-9939-210bad180fea |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_3/UIMenu_1` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_3/UIMenu_1/btn_gem_3` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_1011001.png` c0b6cb46-b616-491a-a15b-08d3e28ee766 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_3/node_star_3` | CCNode | [0.0, -30.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_3/lbl_gem_num_3` | UILabelTTF | [30.0, 30.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0/3」40 STZhongsong.ttf rgbNone |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_4` | CCNode | [0.0, -193.0] | [0.5, 0.5] | [150, 150] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_4/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [127, 126] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-7.png` a5fc4ac3-8f5b-444d-9883-94d0772b1d8a |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_4/UIMenu_1` | UIMenu | [-75.0, -75.0] | [0, 0] | [150.0, 150.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_4/UIMenu_1/btn_gem` | UIMenuItemImage | [75.0, 75.0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_1011001.png` c0b6cb46-b616-491a-a15b-08d3e28ee766 |
| `/SmithGemLayer/node_gem_panel/CCNode_1/CCNode_4/node_star` | CCNode | [0.0, -30.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_2` | CCNode | [0.0, -200.0] | [0.5, 0] | [370.0, 40.0] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_2/edit_box_bg` | CCScale9Sprite | [0.0, 20.0] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 insets[8, 8, 8, 8] |
| `/SmithGemLayer/node_gem_panel/CCNode_2/UIMenu_1` | UIMenu | [-185.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGemLayer/node_gem_panel/CCNode_2/UIMenu_1/btn_sub` | UIMenuItemImage | [102, 20] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-sub-1.png` b7b37bfa-f87d-44b7-904d-6f7cd8baacda |
| `/SmithGemLayer/node_gem_panel/CCNode_2/UIMenu_1/btn_add` | UIMenuItemImage | [268, 20] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-add-1.png` 55ea79d1-a919-4011-a3b6-c40c1738aba0 |
| `/SmithGemLayer/node_gem_panel/CCNode_2/lbl_compose_num` | UILabelTTF | [0.0, 20.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「99」44 STZhongsong.ttf rgbNone |

## SmithGodEquipLayer（53）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithGodEquipLayer` | SmithGodEquipLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel` | CCNode | [320.0, 850.0] | [0.5, 0.5] | [640.0, 380.0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1` | CCNode | [0.0, 190.0] | [0.5, 1] | [370, 347] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCSprite_1` | CCSprite | [0.0, -193.0] | [0.5, 0.5] | [640, 376] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-8.png` 39cdb717-267d-450e-9cd8-7740eb310468 |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_1` | CCNode | [0.0, -77] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_1/menu_equip_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_1/menu_equip_1/btn_add_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_2` | CCNode | [-124.0, -284] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_2/menu_equip_2` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_2/menu_equip_2/btn_add_2` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_3` | CCNode | [123.0, -282] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_3/menu_equip_3` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_3/menu_equip_3/btn_add_3` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_4` | CCNode | [0.0, -203] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_4/menu_equip_0` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_equip_panel/CCNode_1/CCNode_4/menu_equip_0/btn_add_0` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [110, 110] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-10.png` cc7bfb1e-0bc9-45f0-bc04-827ee0ea5562 |
| `/SmithGodEquipLayer/node_content` | CCNode | [320.0, 650.0] | [0.5, 1] | [636, 346] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/lbl_tip_1` | UILabelTTF | [-1.0, 12.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「———」40 CloudYuanCuGBK.ttf rgb[237, 222, 208] |
| `/SmithGodEquipLayer/node_content/CCSprite_1` | CCSprite | [0.0, -171.0] | [0.5, 0.5] | [636, 346] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-mainview-scrollview-bg.png` 41d25a8e-499a-4a03-9f15-0ff5e1f63b95 |
| `/SmithGodEquipLayer/node_content/lbl_tip_2` | UILabelTTF | [-0.291, -44.602] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 STZhongsong.ttf rgb[231, 117, 42] |
| `/SmithGodEquipLayer/node_content/UIMenu_1` | UIMenu | [318.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/UIMenu_1/btn_info` | UIMenuItemImage | [-84.491, -46.875] | [0.5, 0.5] | [60, 61] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SmithGodEquipLayer/node_content/CCScale9Sprite_1` | CCScale9Sprite | [0.0, -176.0] | [0.5, 0.5] | [560, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[16, 16, 16, 16] |
| `/SmithGodEquipLayer/node_content/node_null` | CCNode | [0.0, -176.114] | [0.5, 0.5] | [560, 200] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_null/CCSprite_1` | CCSprite | [4.0, -1.0] | [0.5, 0.5] | [278, 222] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-23.png` 4aa9b1ec-46e9-4b96-a9e0-a7dba44894b5 |
| `/SmithGodEquipLayer/node_content/node_null/UILabelTTF_1` | UILabelTTF | [0.0, -50.81] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无神装属性」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/SmithGodEquipLayer/node_content/node_no_null` | CCNode | [0.0, -176.114] | [0.5, 0.5] | [560, 200] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_1` | CCNode | [-152.0, 55.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_1/spr_attr_addition_1` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_2` | CCNode | [127.0, 55.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_2/spr_attr_addition_2` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_3` | CCNode | [-152.0, -2.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_3/spr_attr_addition_3` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_4` | CCNode | [127.0, -2.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_4/spr_attr_addition_4` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_5` | CCNode | [-152.0, -59.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_5/spr_attr_addition_5` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_6` | CCNode | [127.0, -59.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/node_attr_addition_6/spr_attr_addition_6` | CCSprite | [0, 0] | [0.5, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-elem-defence-bg.png` b1d53158-9e5d-42ee-9993-3932468aef4b |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1/btn_attr_addition_1` | UIMenuItemCheckBox | [-45.0, 58.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1/btn_attr_addition_2` | UIMenuItemCheckBox | [233, 58] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1/btn_attr_addition_3` | UIMenuItemCheckBox | [-45, 1] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1/btn_attr_addition_4` | UIMenuItemCheckBox | [233, 1] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1/btn_attr_addition_5` | UIMenuItemCheckBox | [-45, -56] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SmithGodEquipLayer/node_content/node_no_null/UIMenu_1/btn_attr_addition_6` | UIMenuItemCheckBox | [233, -56] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SmithGodEquipLayer/menu_compose` | UIMenu | [0, 0] | [0, 0] | [640.0, 1280.0] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/menu_compose/btn_one_key` | UIMenuItemLabel | [191.0, 208.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「一键添加」48 [255, 255, 255, 255] |
| `/SmithGodEquipLayer/menu_compose/btn_compose` | UIMenuItemLabel | [452.0, 207.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「合  成」48 [255, 255, 255, 255] |
| `/SmithGodEquipLayer/node_bottom` | CCNode | [320.0, 300.0] | [0.5, 1] | [640.0, 51.2] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_bottom/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithGodEquipLayer/node_bottom/UIMenu_1/btn_res_bg_1` | UIMenuItemImage | [-95, -25] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |
| `/SmithGodEquipLayer/node_bottom/UIMenu_1/btn_res_bg_2` | UIMenuItemImage | [95, -25] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |

## SmithLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithLayer` | SmithLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/SmithLayer/menu_top` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithLayer/menu_top/btn_back` | UIMenuItemImage | [532, 767] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/SmithLayer/menu_top/btn_info` | UIMenuItemImage | [567, 707] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SmithLayer/menu_top/btn_runes_preview` | UIMenuItemImage | [567, 647] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes-lang_btn-preview.png` 05a13132-0354-40c7-8200-125639d91d0e |
| `/SmithLayer/menu_top/btn_src` | UIMenuItemImage | [500, 630] | [0.5, 0.5] | [81, 24] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes-lang_btn-src.png` 6da39fa4-4f60-4707-a4ac-875d6e6ab4ae |
| `/SmithLayer/menu_top/btn_god_equip_book` | UIMenuItemImage | [560, 637] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic-lang_btn-image-1.png` 50efa6fc-009f-4f4d-95c9-641b10e0cc2e |
| `/SmithLayer/node_cell` | CCNode | [40, 360] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithLayer/menu_tab` | CCMenu | [300, 710] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithLayer/menu_tab/btn_equip` | UIMenuItemTab | [-103, 0] | [1, 0.5] | [134, 56] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-17.png` cf411808-6e90-4980-a5f3-f37df9b2a5eb pressed `ui/common/button_btn-tab-18.png` e779f392-0b39-4a1a-8065-05eaa6d72a7b · Label「装备」48 [255, 255, 255, 255] |
| `/SmithLayer/menu_tab/btn_runes` | UIMenuItemTab | [7, 0] | [1, 0.5] | [134, 56] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-19.png` 66292d70-21aa-4d02-af3b-c6922303c5f8 pressed `ui/common/button_btn-tab-20.png` d79055c9-b417-4ace-af7a-e2cfa1bc6baa · Label「精灵」48 [255, 255, 255, 255] |
| `/SmithLayer/menu_tab/btn_gem` | UIMenuItemTab | [-7, 0] | [0, 0.5] | [134, 56] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-19.png` 66292d70-21aa-4d02-af3b-c6922303c5f8 pressed `ui/common/button_btn-tab-20.png` d79055c9-b417-4ace-af7a-e2cfa1bc6baa · Label「宝石」48 [255, 255, 255, 255] |
| `/SmithLayer/menu_tab/btn_god_equip` | UIMenuItemTab | [103, 0] | [0, 0.5] | [134, 56] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-21.png` cf720145-2705-49d5-8a2e-bd068cfc8ed2 pressed `ui/common/button_btn-tab-22.png` 25ba8a65-b054-468b-b706-6b0152747c53 · Label「神装」48 [255, 255, 255, 255] |

## SmithRingLayer（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithRingLayer` | SmithRingLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/lbl_tip_1` | UILabelTTF | [320.0, 1043.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgb[253, 232, 193] |
| `/SmithRingLayer/node_equip_panel` | CCNode | [320.0, 977.92] | [0.5, 0.5] | [640.0, 380.0] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1` | CCNode | [0.0, 190.0] | [0.5, 1] | [370, 347] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCSprite_1` | CCSprite | [0.0, -193.0] | [0.5, 0.5] | [640, 376] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/runes_spr-bg-8.png` 39cdb717-267d-450e-9cd8-7740eb310468 |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_1` | CCNode | [0.0, -77] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_1/menu_equip_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_1/menu_equip_1/btn_add_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_2` | CCNode | [-124.0, -284] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_2/menu_equip_2` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_2/menu_equip_2/btn_add_2` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_3` | CCNode | [123.0, -282] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_3/menu_equip_3` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_3/menu_equip_3/btn_add_3` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-9.png` d3d7989b-a37b-4335-8057-cc2ea6ffe56f |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_4` | CCNode | [0.0, -203] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_4/menu_equip_0` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_equip_panel/CCNode_1/CCNode_4/menu_equip_0/btn_add_0` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [110, 110] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_spr-bg-10.png` cc7bfb1e-0bc9-45f0-bc04-827ee0ea5562 |
| `/SmithRingLayer/node_content` | CCNode | [320.0, 650.0] | [0.5, 1] | [636, 346] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_content/CCScale9Sprite_1` | CCScale9Sprite | [-318.0, -396] | [0.5, 0.5] | [626, 422] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-mainview-scrollview-bg.png` 41d25a8e-499a-4a03-9f15-0ff5e1f63b95 |
| `/SmithRingLayer/node_content/lbl_ring_1` | UILabelTTF | [-0.291, -13.84] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神化灵器」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/SmithRingLayer/node_content/lbl_ring_1` | UILabelTTF | [-0.291, -190.3] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「神化灵器」22 CloudYuanCuGBK.ttf rgb[231, 117, 42] |
| `/SmithRingLayer/node_content/CCSprite_1` | CCSprite | [140.0, -190.3] | [0.5, 0.5] | [176, 11] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line1.png` f8df8825-1bda-4fc9-93ab-580cbcfce883 |
| `/SmithRingLayer/node_content/CCSprite_2` | CCSprite | [140.0, -13.84] | [0.5, 0.5] | [176, 11] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line1.png` f8df8825-1bda-4fc9-93ab-580cbcfce883 |
| `/SmithRingLayer/node_content/CCSprite_3` | CCSprite | [-139.92, -190.3] | [0.5, 0.5] | [176, 11] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line1.png` f8df8825-1bda-4fc9-93ab-580cbcfce883 |
| `/SmithRingLayer/node_content/CCSprite_4` | CCSprite | [-139.92, -13.84] | [0.5, 0.5] | [176, 11] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line1.png` f8df8825-1bda-4fc9-93ab-580cbcfce883 |
| `/SmithRingLayer/node_content/CCScale9Sprite_2` | CCScale9Sprite | [-6.36, -103.454] | [0.5, 0.5] | [560, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-43.png` 4e6aa903-7fa8-4788-945b-31d250111897 insets[10, 10, 10, 10] |
| `/SmithRingLayer/node_content/CCScale9Sprite_3` | CCScale9Sprite | [-6.36, -276.8] | [0.5, 0.5] | [560, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-43.png` 4e6aa903-7fa8-4788-945b-31d250111897 insets[10, 10, 10, 10] |
| `/SmithRingLayer/node_content/CCSprite_5` | CCSprite | [-63.6, -92.0] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SmithRingLayer/node_content/CCSprite_6` | CCSprite | [63.6, -92.0] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SmithRingLayer/node_content/UIMenu_1` | UIMenu | [318.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_content/UIMenu_1/btn_info` | UIMenuItemImage | [-84.491, -20] | [0.5, 0.5] | [60, 61] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SmithRingLayer/node_content/CCSprite_7` | CCSprite | [-63.6, -266.42] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SmithRingLayer/node_content/CCSprite_8` | CCSprite | [63.6, -266.42] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SmithRingLayer/node_content/CCSprite_9` | CCSprite | [190.8, -266.42] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SmithRingLayer/node_content/CCSprite_10` | CCSprite | [-190.8, -266.42] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SmithRingLayer/menu_compose` | UIMenu | [0, 0] | [0, 0] | [640.0, 1280.0] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/menu_compose/btn_one_key` | UIMenuItemLabel | [191.0, 208.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「一键添加」48 [255, 255, 255, 255] |
| `/SmithRingLayer/menu_compose/btn_compose` | UIMenuItemLabel | [452.0, 207.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「合  成」48 [255, 255, 255, 255] |
| `/SmithRingLayer/node_bottom` | CCNode | [320.0, 300.0] | [0.5, 1] | [640.0, 51.2] | [1, 1] | 0 | **否** |  |
| `/SmithRingLayer/node_bottom/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRingLayer/node_bottom/UIMenu_1/btn_res_bg_1` | UIMenuItemImage | [-95, -25] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |
| `/SmithRingLayer/node_bottom/UIMenu_1/btn_res_bg_2` | UIMenuItemImage | [95, -25] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |

## SmithRunesLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SmithRunesLayer` | SmithRunesLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SmithRunesLayer/CCSprite_1` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [0, 0] | [1.3, 1.2] | 0 | 是 | cc.Sprite SIMPLE **缺图** runes/spr-bg-1.png |
| `/SmithRunesLayer/node_compose` | CCNode | [320.0, 779.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SmithRunesLayer/node_compose/menu_add` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRunesLayer/node_compose/menu_add/btn_add_1` | UIMenuItemImage | [-132, -109] | [0.5, 0.5] | [210, 208] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_btn-plus-bg.png` a7eb8b56-fdca-4945-9635-f811235e7863 |
| `/SmithRunesLayer/node_compose/menu_add/btn_add_2` | UIMenuItemImage | [145, -109] | [0.5, 0.5] | [210, 208] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/runes_btn-plus-bg.png` a7eb8b56-fdca-4945-9635-f811235e7863 |
| `/SmithRunesLayer/node_compose/CCSprite_1` | CCSprite | [0, -222] | [0.5, 0.5] | [250, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-19.png` 4f1f049c-06d7-4a37-9923-55bc3d4d4a38 |
| `/SmithRunesLayer/node_compose/UILabelTTF_1` | UILabelTTF | [-52, -222] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗」22 STZhongsong.ttf rgb[255, 249, 234] |
| `/SmithRunesLayer/node_compose/CCSprite_2` | CCSprite | [-15, -222] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/SmithRunesLayer/node_compose/lbl_gold` | UILabelTTF | [4, -222] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[255, 249, 234] |
| `/SmithRunesLayer/node_compose/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SmithRunesLayer/node_compose/CCMenu_1/btn_speed_add` | UIMenuItemLabel | [-116, -305] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/SmithRunesLayer/node_compose/CCMenu_1/btn_compose` | UIMenuItemLabel | [124, -305] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」24 [255, 255, 255, 255] |
| `/SmithRunesLayer/node_compose/prog_bg` | CCSprite | [0, -257] | [0.5, 0.5] | [360, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_prog-vip-bg.png` f0532350-08ad-4d7f-99e9-7c322e2986d5 |
| `/SmithRunesLayer/node_compose/lbl_exp` | UILabelTTF | [0, -257] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/0」18 STZhongsong.ttf rgb[255, 249, 234] |
| `/SmithRunesLayer/spr_box` | CCScale9Sprite | [320.0, 513.0] | [0.5, 1] | [595.169, 403.2] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/SmithRunesLayer/spr_scroll_view_bg` | CCScale9Sprite | [320.0, 503.25] | [0.5, 1] | [576.0, 384.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
