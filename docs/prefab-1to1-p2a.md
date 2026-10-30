# P2-a 角色信息/设置/通用确认 Prefab 1:1 节点表

- 基线 main@e4d604a6 (#199 merged)；设计分辨率 640x960；坐标为 Creator 本地坐标（相对父锚点），ignoreAnchor 节点锚点写 (0,0)；angle = -ccb rotation。
- 无 member 名节点命名 `<ccb类>_<同级序号>`；STZhongsong/FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf，CloudYuanCuGBK → font/CloudYuanCuGBK.ttf，Helvetica → 系统字体。

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| BorderIcon | `prefabs/ui/role/BorderIcon.prefab` | 7 |
| CConfirmLayer | `prefabs/ui/common/CConfirmLayer.prefab` | 7 |
| CPopupMenuLayer | `prefabs/ui/common/CPopupMenuLayer.prefab` | 5 |
| ChangeNickLayer | `prefabs/ui/role/ChangeNickLayer.prefab` | 10 |
| ConfirmLayer | `prefabs/ui/common/ConfirmLayer.prefab` | 9 |
| GMLayer | `prefabs/ui/setting/GMLayer.prefab` | 35 |
| InfoLayer | `prefabs/ui/role/InfoLayer.prefab` | 6 |
| InputCodeLayer | `prefabs/ui/setting/InputCodeLayer.prefab` | 11 |
| ListLayer | `prefabs/ui/common/ListLayer.prefab` | 9 |
| NpcTalkLayer | `prefabs/ui/common/NpcTalkLayer.prefab` | 6 |
| PopupMenuLayer | `prefabs/ui/common/PopupMenuLayer.prefab` | 5 |
| PowerLayer | `prefabs/ui/role/PowerLayer.prefab` | 3 |
| RenameLayer | `prefabs/ui/role/RenameLayer.prefab` | 6 |
| RoleInfoLayer | `prefabs/ui/role/RoleInfoLayer.prefab` | 70 |
| RoleUpgradeLayer | `prefabs/ui/role/RoleUpgradeLayer.prefab` | 17 |
| SettingChooseLayer | `prefabs/ui/setting/SettingChooseLayer.prefab` | 15 |
| SettingIdentificationCell | `prefabs/ui/setting/SettingIdentificationCell.prefab` | 11 |
| SettingIdentificationRewardCell | `prefabs/ui/setting/SettingIdentificationRewardCell.prefab` | 11 |
| SettingImageLayer | `prefabs/ui/setting/SettingImageLayer.prefab` | 15 |
| SettingLayer | `prefabs/ui/setting/SettingLayer.prefab` | 24 |
| SettingSuperLayer | `prefabs/ui/setting/SettingSuperLayer.prefab` | 24 |
| SettingTitleCell | `prefabs/ui/setting/SettingTitleCell.prefab` | 16 |
| SubtitleLayer | `prefabs/ui/common/SubtitleLayer.prefab` | 5 |
| WorldLevelLayer | `prefabs/ui/role/WorldLevelLayer.prefab` | 6 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R | 其它节点要的值（不采用） |
|---|---|---|
| `ui/common/win-bg_win-bg-3.png.meta` | [19, 19, 19, 19] |  |
| `ui/common/win-bg_win-bg-14.png.meta` | [14, 14, 14, 14] |  |
| `ui/common/win-bg_block-bg-20.png.meta` | [9, 9, 9, 9] | {'[11, 11, 11, 11]': 1} |
| `ui/common/win-bg_block-bg-45.png.meta` | [19, 19, 19, 19] |  |
| `ui/common/chat_spr-input-bg-2.png.meta` | [9, 8, 8, 9] |  |
| `ui/common/guide_spr-bg-1.png.meta` | [25, 5, 20, 20] |  |
| `ui/common/guide_spr-bg-2.png.meta` | [65, 60, 199, 60] |  |
| `ui/common/rename_spr-bg-2.png.meta` | [10, 10, 10, 10] |  |
| `ui/common/win-bg_cell-bg-6.png.meta` | [29, 28, 29, 29] |  |
| `ui/common/rank_spr-cell-bg-1.png.meta` | [30, 30, 30, 30] | {'[40, 40, 40, 40]': 1} |
| `ui/common/setting_spr-cell-bg.png.meta` | [40, 40, 35, 35] |  |
| `ui/common/setting_spr-block-1.png.meta` | [10, 10, 10, 10] |  |
| `ui/common/setting_spr-block-2.png.meta` | [10, 10, 10, 10] |  |

## BorderIcon（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BorderIcon` | BorderIcon | [0, 0] | [0, 0] | [100, 130] | [1, 1] | 0 | 是 |  |
| `/BorderIcon/spr_border` | CCSprite | [50, 90] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/BorderIcon/spr_name_bg` | CCSprite | [50, 15] | [0.5, 0.5] | [111, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-name-bg-2.png` 6a79770f-bf88-4bfc-a1c1-6ff55042ecf2 |
| `/BorderIcon/lbl_name` | UILabelTTF | [50, 15] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「至高神[SSS]」17 STZhongsong.ttf rgb[254, 226, 179] |
| `/BorderIcon/spr_use` | CCSprite | [67, 50] | [0.5, 0.5] | [74, 28] | [0.8, 0.8] | 8 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-used.png` 4936b669-20b6-4c7b-8642-cee2e3208ab8 |
| `/BorderIcon/spr_activate` | CCSprite | [67, 50] | [0.5, 0.5] | [74, 28] | [0.8, 0.8] | 8 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-activate.png` 72c75886-7546-4291-9589-1b6ca9d5e278 |
| `/BorderIcon/spr_selected` | CCSprite | [50, 90] | [0.5, 0.5] | [67, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-lang_spr-selecting.png` 5b679f60-0e0e-4ec8-af74-27126cc9c776 |

## CConfirmLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/CConfirmLayer` | CConfirmLayer | [0, 0] | [0, 0] | [585, 326] | [1, 1] | 0 | 是 |  |
| `/CConfirmLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [585, 326] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/CConfirmLayer/lbl_title` | UILabelTTF | [292.5, 249.716] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「确  认」36 STZhongsong.ttf rgb[85, 30, 20] |
| `/CConfirmLayer/lbl_content` | UILabelTTF | [292.5, 207.988] | [0.5, 1] | [800, 210] | [0.5, 0.5] | 0 | 是 | cc.Label「此路是我开」48 STZhongsong.ttf rgb[85, 30, 20] |
| `/CConfirmLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/CConfirmLayer/menu/btn_cancel` | UIMenuItemLabel | [414, 83] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「」24 [255, 255, 255, 255] |
| `/CConfirmLayer/menu/btn_confirm` | UIMenuItemLabel | [172, 83] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |

## CPopupMenuLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/CPopupMenuLayer` | CPopupMenuLayer | [0, 0] | [0, 0] | [220, 180] | [1, 1] | 0 | 是 |  |
| `/CPopupMenuLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [220, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[20, 20, 20, 20] |
| `/CPopupMenuLayer/spr_photo` | CCSprite | [26.157, 149] | [0.5, 0.5] | [91, 91] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/CPopupMenuLayer/lbl_name` | UILabelTTF | [49.157, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字7个字」40 STZhongsong.ttf rgb[255, 227, 177] |
| `/CPopupMenuLayer/spr_line` | CCSprite | [110, 120.071] | [0.5, 0.5] | [40, 1] | [5, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-line.png` ce6ea06b-92f9-4b70-975e-0c30f61f5208 |

## ChangeNickLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChangeNickLayer` | ChangeNickLayer | [0, 0] | [0, 0] | [436, 300] | [1, 1] | 0 | 是 |  |
| `/ChangeNickLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [436, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChangeNickLayer/spr_scroll_bg` | CCScale9Sprite | [218, 165] | [0.5, 0.5] | [400, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/ChangeNickLayer/lbl_title` | UILabelTTF | [218, 265] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「修改昵称」60 STZhongsong.ttf rgb[97, 61, 28] |
| `/ChangeNickLayer/spr_res` | CCSprite | [180, 70] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/ChangeNickLayer/lbl_res` | UILabelTTF | [210, 70] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」48 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChangeNickLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChangeNickLayer/menu/btn_confirm` | UIMenuItemLabel | [215, 30] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「修 改」48 [122, 71, 38, 255] |
| `/ChangeNickLayer/menu/btn_close` | UIMenuItemImage | [390, 270] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChangeNickLayer/spr_input_bg` | CCScale9Sprite | [218, 171] | [0.5, 0.5] | [356, 38] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[12, 12, 12, 12] |

## ConfirmLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ConfirmLayer` | ConfirmLayer | [0, 0] | [0, 0] | [585, 326] | [1, 1] | 0 | 是 |  |
| `/ConfirmLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [585, 326] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/ConfirmLayer/node_title` | CCNode | [293.0, 318.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ConfirmLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/ConfirmLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「确 认」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ConfirmLayer/CCScale9Sprite_1` | CCScale9Sprite | [293, 180] | [0.5, 0.5] | [480, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-45.png` 3f91d702-2c6e-4b55-ae1d-cfe52210a84f insets[20, 20, 20, 20] |
| `/ConfirmLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ConfirmLayer/menu/btn_cancel` | UIMenuItemLabel | [172, 70] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「」24 [255, 255, 255, 255] |
| `/ConfirmLayer/menu/btn_confirm` | UIMenuItemLabel | [414, 70] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |

## GMLayer（35）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GMLayer` | GMLayer | [0, 0] | [0, 0] | [640, 1024] | [1, 1] | 0 | 是 |  |
| `/GMLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640.0, 1024.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GMLayer/spr_circle` | CCSprite | [320.0, 418.8] | [0.5, 0.5] | [290, 290] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle-1.png` f5ab1bb3-0592-49f5-bca7-b13bfac7efe9 |
| `/GMLayer/spr_bg_battle` | CCScale9Sprite | [34, 35] | [0.5, 0.5] | [576.0, 430] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/scroll_view_item` | UIScrollViewBackpack | [40, 44] | [0, 0] | [563.2, 410] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/GMLayer/lbl_hero_name` | UILabelTTF | [38, 486] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「藏宝阁」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/GMLayer/CCSprite_1` | CCSprite | [320.0, 1024.0] | [0.5, 0.5] | [79, 79] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-null.png` 970be76e-0576-414e-97f4-edd2bda8bb6a |
| `/GMLayer/CCSprite_1/CCLabelTTF_1` | CCLabelTTF | [-263.5, -265.5] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「部分文件无法清除(协议.Data.MainSceneCtr)」17 STZhongsong.ttf rgb[0, 0, 0] |
| `/GMLayer/CCSprite_1/menu` | CCMenu | [-39.5, -39.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GMLayer/CCSprite_1/menu/btn_commit` | UIMenuItemLabel | [900.2, -404.4] | [0.5, 0.5] | [149, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-wear-1.png` 4b3c7910-1335-468a-97ad-626280579c6d · Label「」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_clear_file` | UIMenuItemLabel | [-179.8, -84.4] | [0.5, 0.5] | [188, 68] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「清除引用」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_clear_file` | UIMenuItemLabel | [87.2, -84.4] | [0.5, 0.5] | [188, 68] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「清除引用」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_clear_file` | UIMenuItemLabel | [-179.8, -124.4] | [0.5, 0.5] | [188, 68] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「清除引用」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_clear_file` | UIMenuItemLabel | [87.2, -124.4] | [0.5, 0.5] | [188, 68] | [0.5, 0.5] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「清除引用」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_clear_error` | UIMenuItemLabel | [-134.8, -187.4] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「清除报错」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_error_status` | UIMenuItemLabel | [32.2, -187.4] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「报错」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_open_error` | UIMenuItemLabel | [194.2, -187.4] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「查看报错」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_send` | UIMenuItemLabel | [-179.8, -266.4] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「发  送」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_send` | UIMenuItemLabel | [-179.8, -325.4] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「发  送」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_send` | UIMenuItemLabel | [-179.8, -388.4] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「发  送」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/menu/btn_close_gm` | UIMenuItemLabel | [-181.348, -458.0] | [0.5, 0.5] | [188, 68] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「隐藏/显示」24 [255, 255, 255, 255] |
| `/GMLayer/CCSprite_1/spr_cite1` | CCScale9Sprite | [-169.5, -137.5] | [0.5, 0.5] | [160, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/spr_cite2` | CCScale9Sprite | [97.5, -137.5] | [0.5, 0.5] | [160, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/spr_cite3` | CCScale9Sprite | [-169.5, -175.5] | [0.5, 0.5] | [160, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/spr_cite4` | CCScale9Sprite | [97.5, -175.5] | [0.5, 0.5] | [160, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/spr_send1` | CCScale9Sprite | [-140.5, -329.5] | [0.5, 0.5] | [400, 52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/spr_send2` | CCScale9Sprite | [-140.5, -388.5] | [0.5, 0.5] | [400, 52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/spr_send3` | CCScale9Sprite | [-140.5, -451.5] | [0.5, 0.5] | [400, 52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCSprite_1/CCLabelTTF_2` | CCLabelTTF | [-273.3, -462.1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「按钮隐藏后，再次点击原来按钮位置可打开gm界面」15 STZhongsong.ttf rgb[0, 0, 0] |
| `/GMLayer/spr_gm_f` | CCScale9Sprite | [951, 506] | [0.5, 0.5] | [100, 120] | [1.0016, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GMLayer/CCNode_1` | CCNode | [640.0, 1024.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GMLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GMLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [-79, -38] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GMLayer/lbl_hero_name` | UILabelTTF | [206.792, 495.167] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「搜索」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/GMLayer/spr_search` | CCScale9Sprite | [283.894, 470.292] | [0.5, 0.5] | [320, 50] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |

## InfoLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/InfoLayer` | InfoLayer | [0, 0] | [0, 0] | [560, 370] | [1, 1] | 0 | 是 |  |
| `/InfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [560, 370] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/InfoLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/InfoLayer/menu/btn_close` | UIMenuItemImage | [500, 342] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/InfoLayer/lbl_title` | UILabelTTF | [280.0, 320.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「确  认」40 STZhongsong.ttf rgb[85, 30, 20] |
| `/InfoLayer/scrollBg` | CCScale9Sprite | [280, 155] | [0.5, 0.5] | [82, 82] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-45.png` 3f91d702-2c6e-4b55-ae1d-cfe52210a84f insets[20, 20, 20, 20] |

## InputCodeLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/InputCodeLayer` | InputCodeLayer | [0, 0] | [0, 0] | [562, 330] | [1, 1] | 0 | 是 |  |
| `/InputCodeLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 330] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/InputCodeLayer/node_title` | CCNode | [281.0, 321.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/InputCodeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/InputCodeLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「礼包兑换」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/InputCodeLayer/CCSprite_1` | CCSprite | [281, 240] | [0.5, 0.5] | [1160, 8] | [0.48, 0.48] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_line.png` b3dd6c4a-8ac9-474c-a65e-5f984fc4d4ca |
| `/InputCodeLayer/spr_input_bg` | CCScale9Sprite | [281, 188] | [0.5, 0.5] | [915, 98] | [0.5, 0.5] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-input-bg-2.png` 799f2d1c-6914-43a0-9cfb-02c1de1927c1 insets[10, 10, 10, 10] |
| `/InputCodeLayer/UILabelTTF_1` | UILabelTTF | [281, 137] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「最多50个字符或数字」40 STZhongsong.ttf rgb[138, 138, 138] |
| `/InputCodeLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/InputCodeLayer/CCMenu_1/btn_close` | UIMenuItemImage | [510, 302] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/InputCodeLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [281, 70] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |

## ListLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ListLayer` | ListLayer | [0, 0] | [0, 0] | [562, 840] | [1, 1] | 0 | 是 |  |
| `/ListLayer/spr_bg` | CCScale9Sprite | [281.0, 0.0] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ListLayer/node_title` | CCNode | [281.0, 830.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ListLayer/spr_panel_bg` | CCScale9Sprite | [281.0, 57.6] | [0.5, 0] | [542.5, 695] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ListLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ListLayer/UIMenu_1/btn_close` | UIMenuItemImage | [525, 831] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ListLayer/scroll_view` | UIScrollViewBackpack | [281.0, 60.0] | [0.5, 0] | [540, 690] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## NpcTalkLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/NpcTalkLayer` | NpcTalkLayer | [0, 0] | [0, 0] | [980, 560] | [1, 1] | 0 | 是 |  |
| `/NpcTalkLayer/spr_content_bg` | CCScale9Sprite | [-10, -2.147] | [0.5, 0.5] | [1000, 320] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/guide_spr-bg-1.png` 7d6ffb3a-df9c-4e06-ad37-f3a734c75fca insets[25, 5, 20, 20] |
| `/NpcTalkLayer/spr_text_bg` | CCScale9Sprite | [203, 278] | [0, 1] | [700, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/guide_spr-bg-2.png` 19195067-c166-4c49-9c7b-103b48f60e73 insets[65, 60, 200, 60] |
| `/NpcTalkLayer/lbl_npc_name` | UILabelTTF | [221.395, 285.52] | [0, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「Npc名字」39 STZhongsong.ttf rgb[55, 239, 244] |
| `/NpcTalkLayer/lbl_auto_content` | UILabelTTF | [865, 120.736] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「点击继续」18 STZhongsong.ttf rgb[143, 95, 64] |
| `/NpcTalkLayer/lbl_cv_tip` | UILabelTTF | [260, 110.736] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「ＣＶ：小倉唯」16 STZhongsong.ttf rgb[143, 95, 64] |

## PopupMenuLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PopupMenuLayer` | PopupMenuLayer | [0, 0] | [0, 0] | [220, 180] | [1, 1] | 0 | 是 |  |
| `/PopupMenuLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [220, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[20, 20, 20, 20] |
| `/PopupMenuLayer/spr_photo` | CCSprite | [26.157, 149] | [0.5, 0.5] | [91, 91] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/PopupMenuLayer/lbl_name` | UILabelTTF | [50.157, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字7个字」40 STZhongsong.ttf rgb[255, 227, 180] |
| `/PopupMenuLayer/spr_line` | CCSprite | [110, 120.071] | [0.5, 0.5] | [40, 1] | [5, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-line.png` ce6ea06b-92f9-4b70-975e-0c30f61f5208 |

## PowerLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PowerLayer` | PowerLayer | [0, 0] | [0, 0] | [369, 34] | [1, 1] | 0 | 是 |  |
| `/PowerLayer/CCSprite_1` | CCSprite | [0, 0] | [0, 0] | [369, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/power_spr-power-bg.png` ee9a29b3-0dea-4eb5-8989-64fa7073334b |
| `/PowerLayer/CCSprite_2` | CCSprite | [103, 16] | [0.5, 0.5] | [99, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/power_spr-power-title.png` 15421ee4-3d29-422c-a2e8-2c249bedefb8 |

## RenameLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RenameLayer` | RenameLayer | [0, 0] | [0, 0] | [596, 746] | [1, 1] | 0 | 是 |  |
| `/RenameLayer/spr_bg` | CCScale9Sprite | [0, 143] | [0.5, 0.5] | [596, 746] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-rename-1.png` e116fce5-8d73-43ee-830f-38ef842ead2d |
| `/RenameLayer/spr_input_bg` | CCScale9Sprite | [284, 361] | [0.5, 0.5] | [360, 56] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rename_spr-bg-2.png` 8c99fdd0-843f-4c0f-8995-a303d8ea4c29 insets[10, 10, 10, 10] |
| `/RenameLayer/CCMenu_1` | CCMenu | [0, 150] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RenameLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [304, 106] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「提交」50 [255, 255, 255, 255] |
| `/RenameLayer/CCMenu_1/btn_rand` | UIMenuItemLabel | [470.4, 211.936] | [0.5, 0.5] | [70, 68] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/rename_spr-dice-1.png` c2da9584-c188-4d74-95cb-2890ffff1691 · Label「」50 [67, 22, 17, 255] |

## RoleInfoLayer（70）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RoleInfoLayer` | RoleInfoLayer | [0, 0] | [0, 0] | [540, 540] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 540] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/RoleInfoLayer/node_title` | CCNode | [0, 540] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_title/CCSprite_1` | CCSprite | [5, -5] | [0, 1] | [222, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-bg-1.png` 3b8feadc-21d4-47a0-85ea-4ce7163fd2f4 |
| `/RoleInfoLayer/node_title/CCSprite_2` | CCSprite | [0, 0] | [0, 1] | [68, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-bg-2.png` 73462ac1-b0a1-49b5-a66e-8b5264ea182e |
| `/RoleInfoLayer/node_title/lbl_name` | UILabelTTF | [110, -28] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「个人信息」52 FZCSJW--GB1-0.ttf rgb[254, 227, 179] |
| `/RoleInfoLayer/node_photo` | CCNode | [66, 424] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_photo/spr_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_2.png` 289628e0-48a9-4c98-af85-a394d661dce9 |
| `/RoleInfoLayer/node_photo/spr_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1.2, 1.2] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/RoleInfoLayer/node_photo/CCSprite_1` | CCSprite | [0, -40] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/RoleInfoLayer/node_photo/lbl_level` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/RoleInfoLayer/node_info` | CCNode | [160, 479] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_info/lbl_name` | UILabelTTF | [0, 0] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[S1000]玩家名字」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/RoleInfoLayer/node_info/lbl_rank` | UILabelTTF | [0, -38] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「积分: 3000」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/RoleInfoLayer/node_info/UILabelTTF_1` | UILabelTTF | [0, -70] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「公会:」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/RoleInfoLayer/node_info/lbl_clan` | UILabelTTF | [60, -70] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「无」48 FZCSJW--GB1-0.ttf rgb[218, 101, 22] |
| `/RoleInfoLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/menu/btn_compare` | UIMenuItemLabel | [120, 60] | [0.4993, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「切  磋」48 [255, 255, 255, 255] |
| `/RoleInfoLayer/menu/btn_add_friend` | UIMenuItemLabel | [275, 60] | [0.4993, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「加为好友」48 [255, 255, 255, 255] |
| `/RoleInfoLayer/menu/btn_chat` | UIMenuItemLabel | [275, 60] | [0.4993, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「私  聊」48 [255, 255, 255, 255] |
| `/RoleInfoLayer/menu/btn_black_list` | UIMenuItemLabel | [430, 61] | [0.4993, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「拉  黑」48 [255, 255, 255, 255] |
| `/RoleInfoLayer/node_pannel` | CCNode | [270, 110] | [0.5, 0] | [500, 250] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/spr_pannel_bg` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [500, 250] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RoleInfoLayer/node_pannel/UILabelTTF_1` | UILabelTTF | [-225.0, 210] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「出战阵容」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/RoleInfoLayer/node_pannel/menu_hero` | UIMenu | [-250.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_attack` | CCNode | [135.0, 210] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_attack/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/RoleInfoLayer/node_pannel/node_attack/spr_attack` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/RoleInfoLayer/node_pannel/CCSprite_1` | CCSprite | [-210.0, 140] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/RoleInfoLayer/node_pannel/CCSprite_1/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「前排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/RoleInfoLayer/node_pannel/CCSprite_2` | CCSprite | [-210.0, 50] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/RoleInfoLayer/node_pannel/CCSprite_2/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「后排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/RoleInfoLayer/node_pannel/node_icon_4` | CCNode | [-150.0, 140] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_4/spr_lock_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_3` | CCNode | [-70.0, 140] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_3/spr_lock_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_2` | CCNode | [10.0, 140] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_2/spr_lock_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_1` | CCNode | [90.0, 140] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_1/spr_lock_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_8` | CCNode | [-150.0, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_8/spr_lock_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_7` | CCNode | [-70.0, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_7/spr_lock_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_6` | CCNode | [10.0, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_6/spr_lock_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_5` | CCNode | [90.0, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_5/spr_lock_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/RoleInfoLayer/node_pannel/node_icon_9` | CCNode | [190.0, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RoleInfoLayer/node_pannel/node_icon_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/RoleInfoLayer/node_pannel/node_icon_9/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/RoleInfoLayer/node_pannel/node_icon_9/spr_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/RoleInfoLayer/node_pannel/spr_assist_tip_9` | UILabelTTF | [220.0, 50] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/RoleInfoLayer/spr_matrix` | CCSprite | [460, 250] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |

## RoleUpgradeLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RoleUpgradeLayer` | RoleUpgradeLayer | [0, 0] | [0, 0] | [640, 550] | [1, 1] | 0 | 是 |  |
| `/RoleUpgradeLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 500] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/RoleUpgradeLayer/CCSprite_1` | CCSprite | [320, 506] | [0.5, 0.5] | [440, 96] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_spr-upgrade.png` 00a32d15-8424-4a5a-a9fe-6a75a3be69ed |
| `/RoleUpgradeLayer/CCSprite_2` | CCSprite | [320, 420] | [0.5, 0.5] | [512, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f |
| `/RoleUpgradeLayer/lbl_level` | UILabelTTF | [210, 420] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冒险者等级」26 STZhongsong.ttf rgb[254, 255, 255] |
| `/RoleUpgradeLayer/lbl_level1` | UILabelTTF | [338, 420] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」32 STZhongsong.ttf rgb[255, 227, 183] |
| `/RoleUpgradeLayer/lbl_level2` | UILabelTTF | [410, 420] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」32 STZhongsong.ttf rgb[65, 254, 5] |
| `/RoleUpgradeLayer/CCSprite_3` | CCSprite | [372, 420] | [0.5, 0.5] | [32, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-arrow.png` 46b71f80-6dba-4896-a4c2-29b60b112b96 |
| `/RoleUpgradeLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 360] | [0.5, 0.5] | [444, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-15.png` d3b2040c-02fd-41b6-b3ae-f50d3d1dce87 insets[10, 10, 30, 30] |
| `/RoleUpgradeLayer/UILabelTTF_1` | UILabelTTF | [320, 360] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「升级奖励」22 STZhongsong.ttf rgb[249, 177, 43] |
| `/RoleUpgradeLayer/CCSprite_4` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/RoleUpgradeLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 170] | [0.5, 0.5] | [444, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-15.png` d3b2040c-02fd-41b6-b3ae-f50d3d1dce87 insets[10, 10, 30, 30] |
| `/RoleUpgradeLayer/UILabelTTF_2` | UILabelTTF | [320, 170] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「功能预告」22 STZhongsong.ttf rgb[252, 175, 43] |
| `/RoleUpgradeLayer/lbl_atom` | UILabelTTF | [242, 117] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「日常任务」22 STZhongsong.ttf rgb[254, 255, 254] |
| `/RoleUpgradeLayer/spr_icon` | CCSprite | [172, 98] | [0.5, 0.5] | [92, 92] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-city_btn-login-8.png` 1626b777-c685-49a1-b044-221761848397 |
| `/RoleUpgradeLayer/lbl_desc` | UILabelTTF | [242, 78] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「日常任务」18 STZhongsong.ttf rgb[218, 203, 173] |
| `/RoleUpgradeLayer/lbl_open` | UILabelTTF | [405, 115] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「日常任务」18 STZhongsong.ttf rgb[218, 203, 173] |

## SettingChooseLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingChooseLayer` | SettingChooseLayer | [0, 0] | [0, 0] | [610, 780] | [1, 1] | 0 | 是 |  |
| `/SettingChooseLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [630, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SettingChooseLayer/node_title` | CCNode | [305.0, 780.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SettingChooseLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SettingChooseLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「更换装饰」56 CloudYuanCuGBK.ttf rgb[255, 227, 183] |
| `/SettingChooseLayer/spr_bg` | CCScale9Sprite | [305.0, 122.0] | [0.5, 0] | [560, 530] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/SettingChooseLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingChooseLayer/UIMenu_1/btn_close` | UIMenuItemImage | [553, 753] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SettingChooseLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [305, 75] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「更 换」48 [122, 71, 45, 255] |
| `/SettingChooseLayer/btn_scroll_view` | CCScrollView | [305.259, 651.143] | [0.5, 0] | [549.0, 62.4] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/SettingChooseLayer/node_identification` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/SettingChooseLayer/node_identification/UILabelTTF_1` | UILabelTTF | [100.667, 68.667] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「顯示聊天標識」40 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SettingChooseLayer/node_identification/CCSprite_1` | CCSprite | [73.5, 70.5] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/SettingChooseLayer/node_identification/CCMenu_1` | CCMenu | [73.5, 70.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingChooseLayer/node_identification/CCMenu_1/btn_identification_chat` | UIMenuItemCheckBox | [0, 0] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |

## SettingIdentificationCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingIdentificationCell` | SettingIdentificationCell | [0, 0] | [0, 0] | [550, 126] | [1, 1] | 0 | 是 |  |
| `/SettingIdentificationCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingIdentificationCell/menu/btn_go` | CCMenuItemImage | [272, 63] | [0.5, 0.5] | [196, 66] | [2.5, 1.4] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 pressed `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd |
| `/SettingIdentificationCell/spr_bg_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/SettingIdentificationCell/spr_bg_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[30, 30, 30, 30] |
| `/SettingIdentificationCell/image` | CCSprite | [102, 70] | [0.5, 0.5] | [200, 200] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-identification_spr-1-da.png` 84113796-9999-4518-9c83-64f16a671c08 |
| `/SettingIdentificationCell/lbl_status` | UILabelTTF | [103, 19] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未激活」16 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SettingIdentificationCell/lbl_ability` | UILabelTTF | [171, 72] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：2500 生命：2500」18 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SettingIdentificationCell/lbl_recharge` | UILabelTTF | [171, 42] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「累積充值滿」18 CloudYuanCuGBK.ttf rgb[213, 112, 31] |
| `/SettingIdentificationCell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SettingIdentificationCell/CCNode_1/show_image_type` | CCSprite | [477, 57] | [0.5, 0.5] | [90, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-title_spr-yjch.png` 70e41d56-324a-4afc-8361-df9fc7db8f26 |

## SettingIdentificationRewardCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingIdentificationRewardCell` | SettingIdentificationRewardCell | [0, 0] | [0, 0] | [640, 650] | [1, 1] | 0 | 是 |  |
| `/SettingIdentificationRewardCell/spr_bg` | CCSprite | [322.0, 358.0] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/SettingIdentificationRewardCell/spr_title` | CCSprite | [323.456, 557.553] | [0.5, 0.5] | [600, 190] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_spr-gongxi.png` 0ce62b5c-8f4c-4873-ab76-b0dc79c50150 |
| `/SettingIdentificationRewardCell/menu` | CCMenu | [316.544, 376.604] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingIdentificationRewardCell/CCSprite_1` | CCSprite | [320.0, 200.0] | [0.5, 0.5] | [512, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f |
| `/SettingIdentificationRewardCell/CCSprite_2` | CCSprite | [320.0, 370.322] | [0.5, 0.5] | [284, 284] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-huode.png` d6cae053-2bc2-4a75-a26d-90a59ceffeeb |
| `/SettingIdentificationRewardCell/image` | CCSprite | [320.0, 357.0] | [0.5, 0.5] | [200, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-identification_spr-1-da.png` 84113796-9999-4518-9c83-64f16a671c08 |
| `/SettingIdentificationRewardCell/lbl_ability` | UILabelTTF | [106.0, 200.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「屬性加成：」25 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SettingIdentificationRewardCell/lbl_ability` | UILabelTTF | [229.0, 200.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：20%    生命：20%」25 CloudYuanCuGBK.ttf rgb[253, 223, 146] |
| `/SettingIdentificationRewardCell/UIMenu_1` | UIMenu | [320.0, 58.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingIdentificationRewardCell/UIMenu_1/btn_go` | UIMenuItemLabel | [0.0, 0.0] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「」24 [255, 255, 255, 255] |

## SettingImageLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingImageLayer` | SettingImageLayer | [0, 0] | [0, 0] | [610, 780] | [1, 1] | 0 | 是 |  |
| `/SettingImageLayer/spr_magic` | CCSprite | [197, 403] | [0.5, 0.5] | [230, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-magic.png` ae89b32b-9ab7-4ea9-a492-ecdfea219161 |
| `/SettingImageLayer/spr_cell_bg` | CCScale9Sprite | [475, 345] | [0.5, 0] | [200, 290] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-cell-bg.png` 060da575-e8eb-48a7-8c7b-c343162c2db8 insets[40, 40, 35, 35] |
| `/SettingImageLayer/spr_scroll_bg` | CCScale9Sprite | [305, 130] | [0.5, 0] | [540, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-1.png` c70727e8-0b68-4bb8-83ba-eac2f1c276cc insets[10, 10, 10, 10] |
| `/SettingImageLayer/menu_tab` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingImageLayer/menu_tab/btn_tab1` | UIMenuItemTab | [95, 330] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc · Label「1-5星」48 [122, 71, 45, 255] |
| `/SettingImageLayer/menu_tab/btn_tab2` | UIMenuItemTab | [205, 330] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc · Label「6星」48 [122, 71, 45, 255] |
| `/SettingImageLayer/menu_tab/btn_tab3` | UIMenuItemTab | [315, 330] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc · Label「10星」48 [122, 71, 45, 255] |
| `/SettingImageLayer/menu_tab/btn_tab4` | UIMenuItemTab | [423, 330] | [0.5, 0] | [108, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-1.png` 78c45dca-5fe2-4a1d-824a-a2eaf406d209 pressed `ui/common/button_btn-tab-2.png` c54296cb-df7b-45d8-b4eb-c21b2ae2e7dc · Label「皮肤」48 [122, 71, 45, 255] |
| `/SettingImageLayer/CCSprite_1` | CCSprite | [474, 605] | [0.5, 0.5] | [111, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-name-bg-2.png` 6a79770f-bf88-4bfc-a1c1-6ff55042ecf2 |
| `/SettingImageLayer/lbl_elem_add_title` | UILabelTTF | [474, 605] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「形象属性」36 STZhongsong.ttf rgb[255, 227, 183] |
| `/SettingImageLayer/lbl_elem_add` | UILabelTTF | [474, 581] | [0.5, 1] | [360, 180] | [0.5, 0.5] | 0 | 是 | cc.Label「当前形象属性加成」36 STZhongsong.ttf rgb[231, 117, 42] |
| `/SettingImageLayer/CCSprite_2` | CCSprite | [474, 470] | [0.5, 0.5] | [111, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-name-bg-2.png` 6a79770f-bf88-4bfc-a1c1-6ff55042ecf2 |
| `/SettingImageLayer/lbl_unlock_condition_title` | UILabelTTF | [474, 470] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「解锁条件」36 STZhongsong.ttf rgb[255, 227, 183] |
| `/SettingImageLayer/lbl_unlock_condition` | UILabelTTF | [474, 440] | [0.5, 1] | [360, 150] | [0.5, 0.5] | 0 | 是 | cc.Label「当前形象已解锁」36 STZhongsong.ttf rgb[32, 166, 0] |

## SettingLayer（24）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingLayer` | SettingLayer | [0, 0] | [0, 0] | [610, 780] | [1, 1] | 0 | 是 |  |
| `/SettingLayer/CCSprite_1` | CCSprite | [305.0, 390.0] | [0.5, 0.5] | [623, 787] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg.png` 4be336f0-c193-4de1-9b9a-45cacee2bec7 |
| `/SettingLayer/spr_photo` | CCSprite | [305, 562] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_6.png` 1072544f-ae7d-40c0-814a-6dfd074116a5 |
| `/SettingLayer/lbl_role_name` | UILabelTTF | [300, 493] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家昵称六字」48 STZhongsong.ttf rgb[225, 95, 12] |
| `/SettingLayer/lbl_role_id` | UILabelTTF | [300, 460] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「id: - -」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_role_level_title` | UILabelTTF | [89, 534] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「等级:」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_role_level` | UILabelTTF | [169, 532] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「200」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_clan_name_title` | UILabelTTF | [404, 534] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「公会:」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_clan_name` | UILabelTTF | [488, 532] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「公会昵称七个字」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_province` | UILabelTTF | [60, 422] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「省市:」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_city` | UILabelTTF | [312, 422] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「地区:」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingLayer/UIMenu_1/btn_close` | UIMenuItemImage | [554, 753] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SettingLayer/UIMenu_1/btn_head` | UIMenuItemImage | [305, 562] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SettingLayer/UIMenu_1/btn_edit_nick` | CCMenuItemImage | [393, 490] | [0.5, 0.5] | [24, 24] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-edit.png` 3b2a6eea-23aa-4495-96e9-b883e7d6d771 |
| `/SettingLayer/UIMenu_1/btn_image` | UIMenuItemImage | [168, 342] | [0.5, 0.5] | [90, 90] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-image.png` e89939f0-ce46-4787-a7ad-756da2151065 |
| `/SettingLayer/UIMenu_1/btn_title` | UIMenuItemImage | [305, 342] | [0.5, 0.5] | [90, 90] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-title.png` ca12306e-d492-47a4-8654-6ee8d9fdea20 |
| `/SettingLayer/UIMenu_1/btn_setting` | UIMenuItemImage | [440, 342] | [0.5, 0.5] | [90, 90] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-setting.png` 7707e991-7af9-4b5c-8324-a4e6ba785d38 |
| `/SettingLayer/lbl_image` | UILabelTTF | [167, 281] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「冒险形象」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_title` | UILabelTTF | [304, 281] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「称号」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_setting` | UILabelTTF | [439, 281] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「系统设置」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/lbl_hero_list_title` | UILabelTTF | [302, 233] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄展示」48 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingLayer/menu_hero` | UIMenu | [305, 150] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingLayer/CCSprite_2` | CCSprite | [80, 709] | [0.5, 0.5] | [175, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-lang_spr-space.png` d70a5932-3ded-4b49-964b-df2f6b069ce4 |

## SettingSuperLayer（24）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingSuperLayer` | SettingSuperLayer | [0, 0] | [0, 0] | [610, 468] | [1, 1] | 0 | 是 |  |
| `/SettingSuperLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [630, 488] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/SettingSuperLayer/node_title` | CCNode | [305.0, 468.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SettingSuperLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/SettingSuperLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「系统设置」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SettingSuperLayer/spr_setting_bg` | CCScale9Sprite | [305, 351] | [0.5, 0] | [500, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-2.png` e3dc4c54-0198-414a-9405-be119c449086 insets[10, 10, 10, 10] |
| `/SettingSuperLayer/lbl_setting` | UILabelTTF | [305, 369] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「声音设置」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingSuperLayer/CCSprite_1` | CCSprite | [157, 306] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/SettingSuperLayer/lbl_music_title` | UILabelTTF | [187, 306] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「音乐」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingSuperLayer/CCSprite_2` | CCSprite | [400, 306] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/SettingSuperLayer/lbl_effect_title` | UILabelTTF | [430, 306] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「音效」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingSuperLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingSuperLayer/UIMenu_1/btn_close` | UIMenuItemImage | [565, 443] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SettingSuperLayer/UIMenu_1/btn_exchange` | UIMenuItemLabel | [351, 94] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「切换账号」48 [122, 71, 45, 255] |
| `/SettingSuperLayer/UIMenu_1/btn_notice` | UIMenuItemImage | [180, 238] | [0.5, 0.5] | [156, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting-lang_btn-notice.png` 7b28584d-222e-4f16-a550-7927554b71a8 |
| `/SettingSuperLayer/UIMenu_1/btn_cdk` | UIMenuItemImage | [425, 240] | [0.5, 0.5] | [156, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting-lang_btn-cdk.png` a9289a68-1ff7-4275-a390-1e6d7f24dca8 |
| `/SettingSuperLayer/UIMenu_1/btn_music` | UIMenuItemCheckBox | [157, 307] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |
| `/SettingSuperLayer/UIMenu_1/btn_effect` | UIMenuItemCheckBox | [400, 307] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |
| `/SettingSuperLayer/UIMenu_1/btn_language` | UIMenuItemLabel | [502, 94] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「切换语言」48 [122, 71, 45, 255] |
| `/SettingSuperLayer/UIMenu_1/btn_user` | UIMenuItemLabel | [180, 165] | [0.5, 0.5] | [156, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-user.png` e8116f80-2619-49e9-924f-571cbf50bcad · Label「」24 [141, 89, 58, 255] |
| `/SettingSuperLayer/UIMenu_1/btn_service` | UIMenuItemLabel | [425, 165] | [0.5, 0.5] | [156, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-service.png` 405fa3b1-9b32-49f4-8aec-b7c11b8d4e7b · Label「」24 [141, 89, 58, 255] |
| `/SettingSuperLayer/lbl_server_name_title` | UILabelTTF | [164, 95] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前区服:」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingSuperLayer/spr_server_name_bg` | CCScale9Sprite | [219, 95] | [0.5, 0.5] | [100, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-2.png` e3dc4c54-0198-414a-9405-be119c449086 insets[10, 10, 10, 10] |
| `/SettingSuperLayer/lbl_server_name` | UILabelTTF | [219, 95] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「S251」44 STZhongsong.ttf rgb[141, 89, 58] |

## SettingTitleCell（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SettingTitleCell` | SettingTitleCell | [0, 0] | [0, 0] | [550, 126] | [1, 1] | 0 | 是 |  |
| `/SettingTitleCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SettingTitleCell/menu/btn_go` | CCMenuItemImage | [272, 63] | [0.5, 0.5] | [196, 66] | [2.5, 1.4] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 pressed `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd |
| `/SettingTitleCell/spr_bg_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/SettingTitleCell/spr_bg_2` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[30, 30, 30, 30] |
| `/SettingTitleCell/image` | CCSprite | [132, 84] | [0.5, 0.5] | [186, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-title_spr-zqwz.png` ca757aa1-d298-46c0-98a7-8df2637f9f89 |
| `/SettingTitleCell/lbl_status_2` | UILabelTTF | [133, 29] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「未激活」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingTitleCell/lbl_attr_1` | UILabelTTF | [265, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：2500」18 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingTitleCell/lbl_attr_2` | UILabelTTF | [408, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：2500」18 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingTitleCell/lbl_msg` | UILabelTTF | [265, 35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：2500生命：2500生命：2500」18 STZhongsong.ttf rgb[213, 112, 31] |
| `/SettingTitleCell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SettingTitleCell/CCNode_1/show_image_type_1` | CCSprite | [455, 100] | [0.5, 0.5] | [90, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-title_spr-xsch.png` 38e37e6b-b7b2-4845-83da-44a1d4e38865 |
| `/SettingTitleCell/CCNode_1/show_image_type_2` | CCSprite | [455, 100] | [0.5, 0.5] | [90, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-title_spr-yjch.png` 70e41d56-324a-4afc-8361-df9fc7db8f26 |
| `/SettingTitleCell/time_node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SettingTitleCell/time_node/lbl_time` | UILabelTTF | [118, 26] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「时间多少」18 STZhongsong.ttf rgb[141, 89, 58] |
| `/SettingTitleCell/time_node/CCSprite_1` | CCSprite | [73, 28] | [0.5, 0.5] | [108, 27] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-title_lbl-left-time-1.png` e4bfc5db-9128-45d7-94e5-10b4b78a4b09 |

## SubtitleLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SubtitleLayer` | SubtitleLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SubtitleLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1.35, 1.35] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-guide-1.jpg` 8f994cc7-d752-4bc4-93ce-40de571faafe |
| `/SubtitleLayer/CCNode_1` | CCNode | [512.0, 864.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SubtitleLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SubtitleLayer/CCNode_1/CCMenu_1/btn_close` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [131, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/guide_btn-1.png` cb2c635d-c5b3-4692-925f-860962d3919e |

## WorldLevelLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/WorldLevelLayer` | WorldLevelLayer | [0, 0] | [0, 0] | [320, 160] | [1, 1] | 0 | 是 |  |
| `/WorldLevelLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [320, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[20, 20, 20, 20] |
| `/WorldLevelLayer/lbl_title` | UILabelTTF | [60, 135] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「世界等级」40 STZhongsong.ttf rgb[255, 229, 190] |
| `/WorldLevelLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/WorldLevelLayer/spr_icon` | CCSprite | [40, 135] | [0.5, 0.5] | [50, 50] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-world-level.png` 4457a617-ecee-437c-b7b5-4ab41aa9bc4e |
| `/WorldLevelLayer/CCSprite_1` | CCSprite | [150, 115] | [0.5, 0.5] | [622, 4] | [0.4, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |

## langKey

不写入 Prefab，只记在这里。

| Prefab | 路径 | langKey |
|---|---|---|
| BorderIcon | `/BorderIcon/lbl_name` | `lang###5493` |
| CConfirmLayer | `/CConfirmLayer/lbl_title` | `lang###5110` |
| CConfirmLayer | `/CConfirmLayer/lbl_content` | `lang###5048` |
| CPopupMenuLayer | `/CPopupMenuLayer/lbl_name` | `lang###5133` |
| ChangeNickLayer | `/ChangeNickLayer/lbl_title` | `lang###5570` |
| ChangeNickLayer | `/ChangeNickLayer/menu/btn_confirm/Label` | `lang###5122` |
| ConfirmLayer | `/ConfirmLayer/node_title/lbl_title` | `lang###5151` |
| GMLayer | `/GMLayer/lbl_hero_name` | `lang###5608` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `lang###5173` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `lang###5173` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `lang###5173` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `lang###5173` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_error/Label` | `lang###5316` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_error_status/Label` | `lang###5027` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_open_error/Label` | `lang###5384` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_send/Label` | `lang###5714` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_send/Label` | `lang###5714` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_send/Label` | `lang###5714` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_close_gm/Label` | `lang###5188` |
| GMLayer | `/GMLayer/lbl_hero_name` | `lang###5479` |
| InfoLayer | `/InfoLayer/lbl_title` | `lang###5110` |
| InputCodeLayer | `/InputCodeLayer/node_title/lbl_title` | `lang###5445` |
| InputCodeLayer | `/InputCodeLayer/UILabelTTF_1` | `lang###5665` |
| ListLayer | `/ListLayer/node_title/lbl_title` | `lang###5254` |
| NpcTalkLayer | `/NpcTalkLayer/lbl_npc_name` | `lang###5729` |
| NpcTalkLayer | `/NpcTalkLayer/lbl_auto_content` | `lang###5061` |
| NpcTalkLayer | `/NpcTalkLayer/lbl_cv_tip` | `lang###5806` |
| PopupMenuLayer | `/PopupMenuLayer/lbl_name` | `lang###5133` |
| RenameLayer | `/RenameLayer/CCMenu_1/btn_confirm/Label` | `lang###5675` |
| RoleInfoLayer | `/RoleInfoLayer/node_title/lbl_name` | `lang###5291` |
| RoleInfoLayer | `/RoleInfoLayer/node_info/UILabelTTF_1` | `lang###4301` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_compare/Label` | `lang###5660` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_add_friend/Label` | `lang###5432` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_chat/Label` | `lang###5525` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_black_list/Label` | `lang###47408` |
| RoleInfoLayer | `/RoleInfoLayer/node_pannel/UILabelTTF_1` | `lang###5475` |
| RoleInfoLayer | `/RoleInfoLayer/node_pannel/CCSprite_1/UILabelTTF_1` | `lang###74705` |
| RoleInfoLayer | `/RoleInfoLayer/node_pannel/CCSprite_2/UILabelTTF_1` | `lang###74706` |
| RoleInfoLayer | `/RoleInfoLayer/node_pannel/spr_assist_tip_9` | `lang###77204` |
| RoleUpgradeLayer | `/RoleUpgradeLayer/lbl_level` | `lang###5244` |
| RoleUpgradeLayer | `/RoleUpgradeLayer/UILabelTTF_1` | `lang###5278` |
| RoleUpgradeLayer | `/RoleUpgradeLayer/UILabelTTF_2` | `lang###5718` |
| RoleUpgradeLayer | `/RoleUpgradeLayer/lbl_atom` | `lang###5403` |
| RoleUpgradeLayer | `/RoleUpgradeLayer/lbl_desc` | `lang###5403` |
| RoleUpgradeLayer | `/RoleUpgradeLayer/lbl_open` | `lang###5403` |
| SettingChooseLayer | `/SettingChooseLayer/node_title/lbl_title` | `lang###5302` |
| SettingChooseLayer | `/SettingChooseLayer/UIMenu_1/btn_confirm/Label` | `lang###5466` |
| SettingChooseLayer | `/SettingChooseLayer/node_identification/UILabelTTF_1` | `lang###4703` |
| SettingIdentificationCell | `/SettingIdentificationCell/lbl_status` | `lang###4702` |
| SettingIdentificationRewardCell | `/SettingIdentificationRewardCell/lbl_ability` | `lang###5136` |
| SettingIdentificationRewardCell | `/SettingIdentificationRewardCell/UIMenu_1/btn_go/Label` | `lang###74538` |
| SettingImageLayer | `/SettingImageLayer/lbl_elem_add_title` | `lang###5103` |
| SettingImageLayer | `/SettingImageLayer/lbl_elem_add` | `lang###5736` |
| SettingImageLayer | `/SettingImageLayer/lbl_unlock_condition_title` | `lang###5692` |
| SettingImageLayer | `/SettingImageLayer/lbl_unlock_condition` | `lang###5237` |
| SettingLayer | `/SettingLayer/lbl_role_id` | `lang###5453` |
| SettingLayer | `/SettingLayer/lbl_role_level_title` | `lang###74209` |
| SettingLayer | `/SettingLayer/lbl_clan_name_title` | `lang###5082` |
| SettingLayer | `/SettingLayer/lbl_clan_name` | `lang###5047` |
| SettingLayer | `/SettingLayer/lbl_province` | `lang###5010` |
| SettingLayer | `/SettingLayer/lbl_city` | `lang###5713` |
| SettingLayer | `/SettingLayer/lbl_image` | `lang###5180` |
| SettingLayer | `/SettingLayer/lbl_title` | `lang###5680` |
| SettingLayer | `/SettingLayer/lbl_setting` | `lang###5704` |
| SettingLayer | `/SettingLayer/lbl_hero_list_title` | `lang###5324` |
| SettingSuperLayer | `/SettingSuperLayer/node_title/lbl_title` | `lang###5704` |
| SettingSuperLayer | `/SettingSuperLayer/lbl_setting` | `lang###5005` |
| SettingSuperLayer | `/SettingSuperLayer/lbl_music_title` | `lang###5723` |
| SettingSuperLayer | `/SettingSuperLayer/lbl_effect_title` | `lang###5109` |
| SettingSuperLayer | `/SettingSuperLayer/UIMenu_1/btn_exchange/Label` | `lang###5153` |
| SettingSuperLayer | `/SettingSuperLayer/lbl_server_name_title` | `lang###5131` |
| SettingTitleCell | `/SettingTitleCell/lbl_status_2` | `lang###5219` |
| SettingTitleCell | `/SettingTitleCell/time_node/lbl_time` | `lang###5194` |
| WorldLevelLayer | `/WorldLevelLayer/lbl_title` | `lang###5084` |

## outline

原样记录。Prefab 不加 LabelOutline，Label.`_enableOutline` 为 false。

| Prefab | 路径 | outline |
|---|---|---|
| ChangeNickLayer | `/ChangeNickLayer/lbl_res` | `{"color":[103,56,14,255],"size":4}` |
| ConfirmLayer | `/ConfirmLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| InputCodeLayer | `/InputCodeLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| ListLayer | `/ListLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| RenameLayer | `/RenameLayer/CCMenu_1/btn_confirm/Label` | `{"color":[0,0,255,255],"size":1}` |
| RoleInfoLayer | `/RoleInfoLayer/node_info/lbl_rank` | `{"color":[0,0,0,255],1}` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_compare/Label` | `{"color":[131,43,43,255],"size":4}` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_add_friend/Label` | `{"color":[13,91,45,255],"size":4}` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_chat/Label` | `{"color":[13,91,45,255],"size":4}` |
| RoleInfoLayer | `/RoleInfoLayer/menu/btn_black_list/Label` | `{"color":[131,43,43,255],"size":4}` |
| RoleInfoLayer | `/RoleInfoLayer/node_pannel/spr_assist_tip_9` | `{"color":[127,75,34,255],"size":4}` |
| SettingChooseLayer | `/SettingChooseLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| SettingIdentificationRewardCell | `/SettingIdentificationRewardCell/lbl_ability` | `{"color":[0,0,0,255],"size":1}` |
| SettingIdentificationRewardCell | `/SettingIdentificationRewardCell/lbl_ability` | `{"color":[0,0,0,255],"size":1}` |
| SettingImageLayer | `/SettingImageLayer/lbl_elem_add_title` | `{"color":[112,82,68,255],"size":2}` |
| SettingImageLayer | `/SettingImageLayer/lbl_unlock_condition_title` | `{"color":[112,82,68,255],"size":2}` |
| SettingSuperLayer | `/SettingSuperLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |

## shadow

Prefab 不加阴影，Label.`_enableShadow` 为 false。

| Prefab | 路径 | shadow |
|---|---|---|
| （无） |  | 本批 shadow 均为 null |

## skew

Creator 3.8 节点没有 skew，未写入 Prefab。

| Prefab | 路径 | skew | angle（已写入） |
|---|---|---|---|
| BorderIcon | `/BorderIcon/spr_name_bg` | `[10, 0]` | 0 |
| BorderIcon | `/BorderIcon/spr_use` | `[10, 0]` | 8 |
| BorderIcon | `/BorderIcon/spr_activate` | `[10, 0]` | 8 |
| BorderIcon | `/BorderIcon/spr_selected` | `[10, 0]` | 0 |

## fontSizeDefaulted

ccbi 没写字号的按钮文字用 24，没写颜色的用白色。

| Prefab | 路径 | string | fontSize | color |
|---|---|---|---|---|
| CConfirmLayer | `/CConfirmLayer/menu/btn_cancel/Label` | `` | 24 | `[255, 255, 255, 255]` |
| CConfirmLayer | `/CConfirmLayer/menu/btn_confirm/Label` | `` | 24 | `[255, 255, 255, 255]` |
| ConfirmLayer | `/ConfirmLayer/menu/btn_cancel/Label` | `` | 24 | `[255, 255, 255, 255]` |
| ConfirmLayer | `/ConfirmLayer/menu/btn_confirm/Label` | `` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_commit/Label` | `` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `清除引用` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `清除引用` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `清除引用` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_file/Label` | `清除引用` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_clear_error/Label` | `清除报错` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_error_status/Label` | `报错` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_open_error/Label` | `查看报错` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_send/Label` | `发  送` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_send/Label` | `发  送` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_send/Label` | `发  送` | 24 | `[255, 255, 255, 255]` |
| GMLayer | `/GMLayer/CCSprite_1/menu/btn_close_gm/Label` | `隐藏/显示` | 24 | `[255, 255, 255, 255]` |
| InputCodeLayer | `/InputCodeLayer/CCMenu_1/btn_confirm/Label` | `` | 24 | `[255, 255, 255, 255]` |
| SettingIdentificationRewardCell | `/SettingIdentificationRewardCell/UIMenu_1/btn_go/Label` | `` | 24 | `[255, 255, 255, 255]` |
| SettingSuperLayer | `/SettingSuperLayer/UIMenu_1/btn_user/Label` | `` | 24 | `[141, 89, 58, 255]` |
| SettingSuperLayer | `/SettingSuperLayer/UIMenu_1/btn_service/Label` | `` | 24 | `[141, 89, 58, 255]` |
