# P4-d 召唤/祭坛/契约 Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| AltarConfirmLayer | `prefabs/ui/altar/AltarConfirmLayer.prefab` | 7 |
| AltarLayer | `prefabs/ui/altar/AltarLayer.prefab` | 7 |
| AltarPanelLayer | `prefabs/ui/altar/AltarPanelLayer.prefab` | 17 |
| AltarReirthLayer | `prefabs/ui/altar/AltarReirthLayer.prefab` | 22 |
| ContractSummonCell | `prefabs/ui/contract-summon/ContractSummonCell.prefab` | 3 |
| ContractSummonLayer | `prefabs/ui/contract-summon/ContractSummonLayer.prefab` | 5 |
| ContractSummonTip | `prefabs/ui/contract-summon/ContractSummonTip.prefab` | 9 |
| ShowContractImageLayer | `prefabs/ui/show-contract/ShowContractImageLayer.prefab` | 3 |
| SkinSelectGiftLayer | `prefabs/ui/skin/SkinSelectGiftLayer.prefab` | 10 |
| SummonCell | `prefabs/ui/summon/SummonCell.prefab` | 14 |
| SummonHeroPrayerLayer | `prefabs/ui/summon/SummonHeroPrayerLayer.prefab` | 21 |
| SummonJFCell | `prefabs/ui/summon/SummonJFCell.prefab` | 15 |
| SummonLayer | `prefabs/ui/summon/SummonLayer.prefab` | 16 |
| SummonShopLayer | `prefabs/ui/summon/SummonShopLayer.prefab` | 44 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/common/other_spr-tiao.png` | [9, 9, 9, 9] |
| `ui/misc/contract_spr-itemb.png` | [0, 0, 10, 10] |

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/win-bg_win-bg-12.png` [20, 20, 15, 18]（edited by P1）
- `ui/hero/hero-info_spr-hero-image-3.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [19, 19, 19, 19] | `SummonLayer:/SummonLayer/spr_box` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9] | `AltarConfirmLayer:/AltarConfirmLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9] | `SummonJFCell:/SummonJFCell/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `AltarPanelLayer:/AltarPanelLayer/spr_bg_2` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `AltarReirthLayer:/AltarReirthLayer/spr_bg_2` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SkinSelectGiftLayer:/SkinSelectGiftLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `AltarConfirmLayer:/AltarConfirmLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `AltarPanelLayer:/AltarPanelLayer/spr_hero_num_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SkinSelectGiftLayer:/SkinSelectGiftLayer/table_view_bg` |

## AltarConfirmLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AltarConfirmLayer` | AltarConfirmLayer | [0, 0] | [0, 0] | [530, 410] | [1, 1] | 0 | 是 |  |
| `/AltarConfirmLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [530, 410] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[10, 10, 10, 10] |
| `/AltarConfirmLayer/spr_bg` | CCScale9Sprite | [25, 75] | [0.5, 0.5] | [480, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/AltarConfirmLayer/lbl_title` | UILabelTTF | [265, 376] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「许愿」30 STZhongsong.ttf rgb[85, 30, 20] |
| `/AltarConfirmLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AltarConfirmLayer/menu/btn_close` | UIMenuItemImage | [482, 385] | [0.5, 0.5] | [55, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/AltarConfirmLayer/menu/btn_done` | UIMenuItemLabel | [265, 40] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「确定」48 [122, 71, 45, 255] |

## AltarLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AltarLayer` | AltarLayer | [0, 0] | [0, 0] | [614, 730] | [1, 1] | 0 | 是 |  |
| `/AltarLayer/spr_box_bg` | CCSprite | [299, 450] | [0.5, 0.5] | [310, 299] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-altar_spr_altar.png` 19f962b8-ce7f-474f-a138-0b1636fcbf34 |
| `/AltarLayer/spr_box_bg/spr_box` | CCSprite | [0.0, 40.5] | [0.5, 0.5] | [81, 79] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-altar_spr-box.png` 93d1d8b8-d064-427f-8465-28bbd4afb1e3 |
| `/AltarLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AltarLayer/UIMenu_1/btn_back` | UIMenuItemImage | [570, 865] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/AltarLayer/UIMenu_1/btn_2` | UIMenuItemTab | [291, 666] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-7.png` 8a3c8429-0946-4341-8fe0-bc3c6237a448 pressed `ui/common/button_btn-tab-8.png` aac0291d-cbbf-48cb-9486-944e18e9e5cd · Label「重 生」48 [255, 255, 255, 255] |
| `/AltarLayer/UIMenu_1/btn_1` | UIMenuItemTab | [308, 666] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「献 祭」48 [255, 255, 255, 255] |

## AltarPanelLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AltarPanelLayer` | AltarPanelLayer | [0, 0] | [0, 0] | [640, 730] | [1, 1] | 0 | 是 |  |
| `/AltarPanelLayer/spr_bg_2` | CCScale9Sprite | [0, 75] | [0.5, 0.5] | [640, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/AltarPanelLayer/spr_hero_bg` | CCScale9Sprite | [42, 240] | [0.5, 0.5] | [560, 380] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[60, 20, 20, 20] |
| `/AltarPanelLayer/spr_hero_num_bg` | CCScale9Sprite | [461, 136.6] | [0.5, 0.5] | [160, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/AltarPanelLayer/lbl_select_num` | UILabelTTF | [461, 136] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已选中英雄: 0/10」36 STZhongsong.ttf rgb[255, 229, 191] |
| `/AltarPanelLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AltarPanelLayer/UIMenu_1/btn_auto` | UIMenuItemLabel | [177, 190] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「快速选择」52 [255, 255, 255, 255] |
| `/AltarPanelLayer/UIMenu_1/btn_done` | UIMenuItemLabel | [461, 190] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「献祭」52 [255, 255, 255, 255] |
| `/AltarPanelLayer/UIMenu_1/btn_elem0` | UIMenuItemImage | [102, 580] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/AltarPanelLayer/UIMenu_1/btn_elem1` | UIMenuItemImage | [185, 580] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/AltarPanelLayer/UIMenu_1/btn_elem2` | UIMenuItemImage | [269, 580] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 pressed **缺图** hero-list/elem-2.png |
| `/AltarPanelLayer/UIMenu_1/btn_elem3` | UIMenuItemImage | [352, 580] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/AltarPanelLayer/UIMenu_1/btn_elem4` | UIMenuItemImage | [435, 580] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/AltarPanelLayer/UIMenu_1/btn_elem5` | UIMenuItemImage | [518, 580] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/AltarPanelLayer/UIMenu_1/btn_info` | UIMenuItemImage | [505, 604] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/AltarPanelLayer/UIMenu_1/btn_shop` | UIMenuItemImage | [505, 532] | [0.5, 0.5] | [66, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-shop.png` cd3f7542-06ef-4fb7-9197-057911ec9a61 |
| `/AltarPanelLayer/lbl_hero_num` | UILabelTTF | [67, 532] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已选中英雄: 0/10」40 STZhongsong.ttf rgb[141, 89, 58] |

## AltarReirthLayer（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AltarReirthLayer` | AltarReirthLayer | [0, 0] | [0, 0] | [640, 730] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/spr_bg_2` | CCScale9Sprite | [0, 75] | [0.5, 0.5] | [640, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/AltarReirthLayer/image_bg` | CCSprite | [75, 695] | [0.5, 0.5] | [134, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg-1.png` 1c80673b-7365-4493-9430-39e3729969f0 |
| `/AltarReirthLayer/lbl_select_num` | UILabelTTF | [53, 696] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」44 STZhongsong.ttf rgb[254, 255, 255] |
| `/AltarReirthLayer/msg_panel` | CCNode | [5, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/msg_panel/spr_bg_50` | CCScale9Sprite | [14, 605] | [0.5, 0.5] | [605, 52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-tiao.png` 10e06c47-00f4-4adc-947a-9c26161e85ac insets[10, 10, 10, 10] |
| `/AltarReirthLayer/msg_panel/spr_bg_51` | CCSprite | [34, 372] | [0, 0] | [564, 224] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/talent_spr-k.png` f0fac33d-7853-4b0b-883d-4e981af6da14 |
| `/AltarReirthLayer/msg_panel/spr_bg_52` | CCSprite | [320, 566] | [0.5, 0.5] | [130, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-aaa.png` b65c1953-5910-46ac-901f-7f83527ff772 |
| `/AltarReirthLayer/msg_panel/show_msg` | CCNode | [320, 627] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/msg_panel/lab_1` | UILabelTTF | [188, 409] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「本体英雄」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/AltarReirthLayer/msg_panel/lab_2` | UILabelTTF | [440, 409] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「随机英雄碎片」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/AltarReirthLayer/msg_panel/hero_1_node` | CCNode | [197, 489] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/msg_panel/hero_2_node` | CCNode | [441, 489] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/msg_panel/hero_select_node` | CCNode | [320, 293] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/msg_panel/lab_3` | UILabelTTF | [320, 214] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择要重生的英雄」48 STZhongsong.ttf rgb[213, 112, 31] |
| `/AltarReirthLayer/msg_panel/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/msg_panel/UIMenu_1/btn_auto` | UIMenuItemLabel | [320, 160] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/AltarReirthLayer/msg_panel/need_cost` | CCNode | [451, 206] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/image_bg_icno` | CCSprite | [36, 698] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901804.png` 9f238716-60ea-43bb-8dff-88ba41f1fae4 |
| `/AltarReirthLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AltarReirthLayer/UIMenu_1/btn_add` | UIMenuItemImage | [112, 695] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-4.png` dc7cf03f-2de3-4d1d-953e-ff6dd51ef5c3 |
| `/AltarReirthLayer/UIMenu_1/btn_info` | UIMenuItemImage | [505, 604] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |

## ContractSummonCell（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ContractSummonCell` | ContractSummonCell | [0, 0] | [0, 0] | [571, 111] | [1, 1] | 0 | 是 |  |
| `/ContractSummonCell/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ContractSummonCell/UIMenu_1/btn_submit` | UIMenuItemImage | [285, 55] | [0.5, 0.5] | [569, 109] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/contract-lang/contract-lang_spr-d1.png` ee9ecf21-77cf-48c7-8c12-6e1e7b3f5b10 |

## ContractSummonLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ContractSummonLayer` | ContractSummonLayer | [0, 0] | [0, 0] | [642, 1032] | [1, 1] | 0 | 是 |  |
| `/ContractSummonLayer/CCSprite_1` | CCSprite | [0, 0] | [0, 0] | [640, 566] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/login/spr-bg.png` 13ecd2f1-e967-499b-b217-12f4a889a9f9 |
| `/ContractSummonLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ContractSummonLayer/UIMenu_1/btn_close` | UIMenuItemImage | [554, 925] | [0.5, 1] | [92, 90] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/contract_spr-close.png` 25af20fe-879e-4f0c-bcfb-6c7750be5504 |
| `/ContractSummonLayer/show_list` | CCNode | [321, 616] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ContractSummonTip（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ContractSummonTip` | ContractSummonTip | [0, 0] | [0, 0] | [540, 176] | [1, 1] | 0 | 是 |  |
| `/ContractSummonTip/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 176] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/contract_spr-itemb.png` 47a13880-0c6d-4dcd-b7d9-36139fe88756 insets[0, 0, 10, 10] |
| `/ContractSummonTip/CCSprite_1` | CCSprite | [68, 139] | [0.5, 0.5] | [105, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/contract-lang/contract-lang_spr-jstj.png` 8e0941aa-8e53-402e-9d5c-54597e821b02 |
| `/ContractSummonTip/show_girl_list` | CCNode | [270, 88] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ContractSummonTip/_contract2CondLabel` | UILabelTTF | [50, 88] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Sample Text」20 STZhongsong.ttf rgbNone |
| `/ContractSummonTip/show_num` | UILabelTTF | [15, 25] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「撒的撒方式」20 STZhongsong.ttf rgb[255, 214, 93] |
| `/ContractSummonTip/show_rich` | CCNode | [460, 25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ContractSummonTip/click` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ContractSummonTip/click/btn_enter` | UIMenuItemImage | [463.48, 46] | [0.5, 1] | [112, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/contract-lang/contract-lang_spr-jiesuo.png` 6cbd9fda-eba8-46f3-86fb-bc18e83d36d4 |

## ShowContractImageLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ShowContractImageLayer` | ShowContractImageLayer | [0, 0] | [0, 0] | [298, 81] | [1, 1] | 0 | 是 |  |
| `/ShowContractImageLayer/show_image` | CCSprite | [0, 0] | [0, 0] | [296, 79] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/contract-lang/contract-lang_spr-qyjs.png` fd500bdf-7064-431f-ab24-0ca9f089c2da |
| `/ShowContractImageLayer/show_spine` | CCNode | [149, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## SkinSelectGiftLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SkinSelectGiftLayer` | SkinSelectGiftLayer | [0, 0] | [0, 0] | [640, 780] | [1, 1] | 0 | 是 |  |
| `/SkinSelectGiftLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640.0, 780.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SkinSelectGiftLayer/node_title` | CCNode | [320.0, 772.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SkinSelectGiftLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SkinSelectGiftLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「自选秘籍」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/SkinSelectGiftLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SkinSelectGiftLayer/menu/btn_do` | UIMenuItemLabel | [323.432, 73.864] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-7.png` dc102352-b445-4518-872a-edd8fe0c63c9 · Label「」52 [255, 255, 255, 255] |
| `/SkinSelectGiftLayer/menu/btn_close` | UIMenuItemImage | [568.4, 742.2] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SkinSelectGiftLayer/UILabelTTF_1` | UILabelTTF | [317.4, 658.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「请从以下奖励中选择一个」24 CloudYuanCuGBK.ttf rgb[125, 71, 33] |
| `/SkinSelectGiftLayer/table_view_bg` | CCScale9Sprite | [40.8, 109.2] | [0.5, 0.5] | [560, 530] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |

## SummonCell（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SummonCell` | SummonCell | [0, 0] | [0, 0] | [586, 188] | [1, 1] | 0 | 是 |  |
| `/SummonCell/spr_bg` | CCSprite | [293, 94] | [0.5, 0.5] | [586, 188] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon-lang_bg-1.png` 1505fb3c-10ea-465e-ac01-9470cb788ce8 |
| `/SummonCell/CCSprite_1` | CCSprite | [456, 150] | [0, 0.5] | [123, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg.png` 259ca395-de2a-4c89-99f4-0d5b85a72502 |
| `/SummonCell/CCSprite_2` | CCSprite | [451, 150] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/SummonCell/spr_icon` | CCSprite | [451, 150] | [0.5, 0.5] | [100, 100] | [0.38, 0.38] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900201.png` 0edcb029-2a94-4250-ab84-2a342ed5e9af |
| `/SummonCell/lbl_num` | UILabelTTF | [477, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgbNone |
| `/SummonCell/lbl_desc` | UILabelTTF | [160, 108] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「随机召唤1-10个1~5星英雄」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/SummonCell/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SummonCell/UIMenu_1/btn_one` | UIMenuItemImage | [110, 40] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 |
| `/SummonCell/UIMenu_1/btn_ten` | UIMenuItemImage | [340, 40] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 |
| `/SummonCell/UIMenu_1/btn_prayer` | UIMenuItemLabel | [279, 152.333] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/summon-hero-prayer_btn-prayer-1.png` 78abac9a-9a18-4374-8694-e3f4ab11185f · Label「」24 [255, 255, 255, 255] |
| `/SummonCell/lbl_free` | UILabelTTF | [109, 81] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99:99:99免费」32 STZhongsong.ttf rgb[0, 249, 0] |
| `/SummonCell/iszhe` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SummonCell/iszhe/spr_bcwx` | CCSprite | [369, 92] | [0.5, 0.5] | [166, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_spr-bcwx.png` 41ff9a3f-291b-4ade-836c-a111400af80f |

## SummonHeroPrayerLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SummonHeroPrayerLayer` | SummonHeroPrayerLayer | [0, 0] | [0, 0] | [610, 524] | [1, 1] | 0 | 是 |  |
| `/SummonHeroPrayerLayer/spr_bg` | CCScale9Sprite | [305.0, 262.0] | [0.5, 0.5] | [622.0, 534.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/SummonHeroPrayerLayer/node_title` | CCNode | [305.0, 520.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SummonHeroPrayerLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/SummonHeroPrayerLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「祈 愿」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SummonHeroPrayerLayer/CCSprite_1` | CCSprite | [305.0, 283.0] | [0.5, 0.5] | [522, 272] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/summon-hero-prayer_bg-1.png` 799e43e2-5992-4b5f-98be-6ef3e094ce2e |
| `/SummonHeroPrayerLayer/spr_prog_bg` | CCSprite | [305.0, 365.0] | [0.5, 0.5] | [306, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/summon-hero-prayer_prog-1.png` 8cfb347f-ab47-477c-b17f-84a57a739fd7 |
| `/SummonHeroPrayerLayer/CCSprite_2` | CCSprite | [305, 215] | [0.5, 0.5] | [306, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/summon-hero-prayer_bg-2.png` a4d42ab3-63ea-48c4-b983-702b58d3702e |
| `/SummonHeroPrayerLayer/spr_tip` | CCSprite | [305.0, 295.0] | [0.5, 0.5] | [531, 53] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/summon-hero-prayer_lbl-1.png` 182989e9-6c99-4f02-9aba-a826f38124c6 |
| `/SummonHeroPrayerLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SummonHeroPrayerLayer/menu/btn_close` | UIMenuItemImage | [565, 497] | [0.5, 0.5] | [55, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SummonHeroPrayerLayer/menu/btn_info` | UIMenuItemImage | [83, 458] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SummonHeroPrayerLayer/menu/btn_buy` | UIMenuItemLabel | [305, 90] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」48 [255, 255, 255, 255] |
| `/SummonHeroPrayerLayer/menu/btn_summon` | UIMenuItemLabel | [305, 100] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「召唤」24 [255, 255, 255, 255] |
| `/SummonHeroPrayerLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SummonHeroPrayerLayer/UIMenu_1/btn_elem1` | UIMenuItemImage | [210, 215] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/SummonHeroPrayerLayer/UIMenu_1/btn_elem2` | UIMenuItemImage | [400, 215] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/SummonHeroPrayerLayer/UIMenu_1/btn_elem3` | UIMenuItemImage | [305, 215] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/SummonHeroPrayerLayer/spr_select` | CCSprite | [210, 215] | [0.5, 0.5] | [92, 92] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-btn-select.png` 19bbb579-f958-44fd-972b-3d609aa2ea59 |
| `/SummonHeroPrayerLayer/lbl_num` | UILabelTTF | [305.0, 365.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/20」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/SummonHeroPrayerLayer/spr_buy_tip` | CCSprite | [387, 110] | [0.5, 0.5] | [90, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-txt-18.png` 262e6262-6f7b-48b5-9170-fec59ab3f0cd |

## SummonJFCell（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SummonJFCell` | SummonJFCell | [0, 0] | [0, 0] | [512, 280] | [1, 1] | 0 | 是 |  |
| `/SummonJFCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [512, 280] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[10, 10, 10, 10] |
| `/SummonJFCell/CCSprite_1` | CCSprite | [256, 128] | [0.5, 0.5] | [104, 104] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SummonJFCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SummonJFCell/menu/btn_close` | UIMenuItemImage | [478, 260] | [0.5, 0.5] | [55, 58] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SummonJFCell/menu/btn_done` | UIMenuItemImage | [256, 40] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 |
| `/SummonJFCell/lbl_title` | UILabelTTF | [256, 238] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「积分召唤」30 STZhongsong.ttf rgb[85, 30, 20] |
| `/SummonJFCell/lbl_desc` | UILabelTTF | [256, 194] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「消耗1000点积分可进行积分召唤，必出5星英雄。」36 STZhongsong.ttf rgb[97, 60, 25] |
| `/SummonJFCell/lbl_vip` | UILabelTTF | [256, 75] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「（贵族3以上方可召唤）」30 STZhongsong.ttf rgb[97, 60, 25] |
| `/SummonJFCell/UILabelTTF_1` | UILabelTTF | [256, 142] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「?」90 STZhongsong.ttf rgb[242, 192, 134] |
| `/SummonJFCell/CCSprite_2` | CCSprite | [236, 104] | [0.5, 0.5] | [25, 24] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-star-2.png` 17012a0a-df22-41df-8223-5be9d9d4894f |
| `/SummonJFCell/CCSprite_3` | CCSprite | [246, 104] | [0.5, 0.5] | [25, 24] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-star-2.png` 17012a0a-df22-41df-8223-5be9d9d4894f |
| `/SummonJFCell/CCSprite_4` | CCSprite | [256, 104] | [0.5, 0.5] | [25, 24] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-star-2.png` 17012a0a-df22-41df-8223-5be9d9d4894f |
| `/SummonJFCell/CCSprite_5` | CCSprite | [266, 104] | [0.5, 0.5] | [25, 24] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-star-2.png` 17012a0a-df22-41df-8223-5be9d9d4894f |
| `/SummonJFCell/CCSprite_6` | CCSprite | [276, 104] | [0.5, 0.5] | [25, 24] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-star-2.png` 17012a0a-df22-41df-8223-5be9d9d4894f |

## SummonLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SummonLayer` | SummonLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SummonLayer/spr_box` | CCScale9Sprite | [10, 150] | [0.5, 0.5] | [620, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[20, 20, 20, 20] |
| `/SummonLayer/spr_bar0` | CCSprite | [490, 755] | [0.5, 0.5] | [226, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_bar-0.png` bec84e9e-06f3-4e63-84ea-cc6ace03c9f3 |
| `/SummonLayer/menu_main` | UIMenu | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SummonLayer/menu_main/btn_info` | UIMenuItemImage | [50.0, 940.0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SummonLayer/menu_main/btn_back` | UIMenuItemImage | [570.0, 870.0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/SummonLayer/menu_main/btn_hero` | UIMenuItemImage | [500.0, 817.0] | [0.5, 0.5] | [82, 82] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-city_btn-hero-recommend-1.png` bb6576f8-0b75-4cbf-97da-782cde8b574f |
| `/SummonLayer/menu_main/btn_award2` | UIMenuItemImage | [604.0, 756.0] | [0.5, 0.5] | [38, 38] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-4.png` dc7cf03f-2de3-4d1d-953e-ff6dd51ef5c3 |
| `/SummonLayer/menu_main/btn_award` | UIMenuItemImage | [604.0, 756.0] | [0.5, 0.5] | [47, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-award.png` b2876be3-8e87-46c3-99fc-7cf28b8852e4 |
| `/SummonLayer/spr_tip` | CCSprite | [398, 905] | [0.5, 0.5] | [476, 148] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon-lang_lbl-tip.png` 3da92d00-69d5-41fe-975d-7221fc7c3cff |
| `/SummonLayer/node_tip2` | CCNode | [0, 0] | [0, 0] | [640.0, 130] | [1, 1] | 0 | 是 |  |
| `/SummonLayer/node_tip2/spr_tip2` | CCSprite | [385.0, 92.0] | [0.5, 0.5] | [470, 75] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon-lang_lbl-tip2.png` 050bf226-cc7d-4919-830a-98d89c5b1027 |
| `/SummonLayer/node_tip2/CCSprite_1` | CCSprite | [500.0, 31.0] | [0.5, 0.5] | [240, 40] | [1, 0.65] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-shadow.png` 03f50dff-cafe-42f5-b828-452d1d7e4090 |
| `/SummonLayer/node_tip2/lbl_time_tips` | UILabelTTF | [425.0, 31.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「剩余时间:」18 STZhongsong.ttf rgbNone |
| `/SummonLayer/node_tip2/lbl_time` | UILabelTTF | [503.0, 31.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「5天」18 STZhongsong.ttf rgb[0, 249, 0] |
| `/SummonLayer/node_red` | CCNode | [631, 780] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## SummonShopLayer（44）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SummonShopLayer` | SummonShopLayer | [0, 0] | [0, 0] | [536, 638] | [1, 1] | 0 | 是 |  |
| `/SummonShopLayer/spr_color_bg` | CCLayerColor | [268.0, 319.0] | [0.5, 0.5] | [536, 638] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a125 |
| `/SummonShopLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [536, 638] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-bg.png` 7323ec7e-2893-4a68-b965-181d0aff3cd8 |
| `/SummonShopLayer/node_title` | CCNode | [268.0, 638.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SummonShopLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SummonShopLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「购 买」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SummonShopLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SummonShopLayer/CCNode_1/CCSprite_1` | CCSprite | [268, 535] | [0.5, 0.5] | [178, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/SummonShopLayer/CCNode_1/CCSprite_2` | CCSprite | [268, 490] | [0.5, 0.5] | [178, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/SummonShopLayer/CCNode_1/CCSprite_3` | CCSprite | [196, 535] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/SummonShopLayer/CCNode_1/CCSprite_4` | CCSprite | [196, 535] | [0.5, 0.5] | [100, 100] | [0.38, 0.38] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/SummonShopLayer/CCNode_1/CCSprite_5` | CCSprite | [196, 490] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/SummonShopLayer/CCNode_1/CCSprite_6` | CCSprite | [196, 490] | [0.5, 0.5] | [100, 100] | [0.38, 0.38] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900202.png` 73c910d8-1f1a-41bc-a2f9-945c7f10a236 |
| `/SummonShopLayer/CCNode_1/lbl_gem_num` | UILabelTTF | [268, 536] | [0.5, 0.5] | auto | [0.6, 0.6] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgbNone |
| `/SummonShopLayer/CCNode_1/lbl_ticket_num` | UILabelTTF | [268, 490] | [0.5, 0.5] | auto | [0.6, 0.6] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgbNone |
| `/SummonShopLayer/CCNode_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SummonShopLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [46, 280] | [0.5, 0.5] | [444, 181] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-15.png` e8c7c4ae-b048-45b0-9299-9929f32e0fbc |
| `/SummonShopLayer/CCNode_2/CCSprite_1` | CCSprite | [130, 380] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SummonShopLayer/CCNode_2/CCSprite_2` | CCSprite | [130, 380] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900202.png` 73c910d8-1f1a-41bc-a2f9-945c7f10a236 |
| `/SummonShopLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [158, 345] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「x1」40 STZhongsong.ttf rgb[236, 172, 14] |
| `/SummonShopLayer/CCNode_2/CCSprite_3` | CCSprite | [310, 410] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |
| `/SummonShopLayer/CCNode_2/lbl_num1` | UILabelTTF | [310, 410] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/SummonShopLayer/CCNode_2/CCSprite_4` | CCSprite | [316, 370] | [0.5, 0.5] | [110, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-3.png` a75eeeee-f9ec-4f4c-9bb4-1ecc6d047000 |
| `/SummonShopLayer/CCNode_2/CCSprite_5` | CCSprite | [266, 370] | [0.5, 0.5] | [100, 100] | [0.38, 0.38] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/SummonShopLayer/CCNode_2/lbl_need_gem1` | UILabelTTF | [316, 370] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/SummonShopLayer/CCNode_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SummonShopLayer/CCNode_3/CCScale9Sprite_1` | CCScale9Sprite | [46, 93] | [0.5, 0.5] | [444, 181] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-15.png` e8c7c4ae-b048-45b0-9299-9929f32e0fbc |
| `/SummonShopLayer/CCNode_3/CCSprite_1` | CCSprite | [130, 193] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/SummonShopLayer/CCNode_3/CCSprite_2` | CCSprite | [130, 193] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900202.png` 73c910d8-1f1a-41bc-a2f9-945c7f10a236 |
| `/SummonShopLayer/CCNode_3/UILabelTTF_1` | UILabelTTF | [154, 158] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「x10」40 STZhongsong.ttf rgb[236, 172, 14] |
| `/SummonShopLayer/CCNode_3/CCSprite_3` | CCSprite | [310, 223] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |
| `/SummonShopLayer/CCNode_3/lbl_num2` | UILabelTTF | [310, 223] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/SummonShopLayer/CCNode_3/CCSprite_4` | CCSprite | [316, 183] | [0.5, 0.5] | [110, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-3.png` a75eeeee-f9ec-4f4c-9bb4-1ecc6d047000 |
| `/SummonShopLayer/CCNode_3/CCSprite_5` | CCSprite | [266, 183] | [0.5, 0.5] | [100, 100] | [0.38, 0.38] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/SummonShopLayer/CCNode_3/lbl_need_gem2` | UILabelTTF | [316, 183] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/SummonShopLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SummonShopLayer/UIMenu_1/btn_buy_gem` | UIMenuItemImage | [341, 535] | [0.5, 0.5] | [32, 32] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_btn-add.png` 00f99e53-45bd-4736-ab31-d267503d5ac2 |
| `/SummonShopLayer/UIMenu_1/btn_sub1` | UIMenuItemImage | [233, 410] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-10.png` 196d417f-2208-46b7-88f8-cf56dbf8fbfb |
| `/SummonShopLayer/UIMenu_1/btn_add1` | UIMenuItemImage | [387, 410] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-10.png` 1f83c385-6f6e-4528-a891-9eecdd2614b6 |
| `/SummonShopLayer/UIMenu_1/btn_buy_one` | UIMenuItemImage | [286, 320] | [0.5, 0.5] | [195, 66] | [0.76, 0.76] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 |
| `/SummonShopLayer/UIMenu_1/btn_sub2` | UIMenuItemImage | [233, 223] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-10.png` 196d417f-2208-46b7-88f8-cf56dbf8fbfb |
| `/SummonShopLayer/UIMenu_1/btn_add2` | UIMenuItemImage | [387, 223] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-10.png` 1f83c385-6f6e-4528-a891-9eecdd2614b6 |
| `/SummonShopLayer/UIMenu_1/btn_buy_ten` | UIMenuItemImage | [286, 133] | [0.5, 0.5] | [195, 66] | [0.76, 0.76] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 |
| `/SummonShopLayer/UIMenu_1/btn_close` | UIMenuItemImage | [486.432, 586.864] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_btn-close.png` 54a102fe-f369-47c3-b94f-adfe4f89a08c |
