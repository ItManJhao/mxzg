# P3-a 主线/章节/战斗/挂机 Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| AdvenNoteCell | `prefabs/ui/adven/AdvenNoteCell.prefab` | 11 |
| AdvenNoteLayer | `prefabs/ui/adven/AdvenNoteLayer.prefab` | 20 |
| BattleDetailCell | `prefabs/ui/battle/BattleDetailCell.prefab` | 8 |
| BattleDetailLayer | `prefabs/ui/battle/BattleDetailLayer.prefab` | 29 |
| BattleEditLayer | `prefabs/ui/battle/BattleEditLayer.prefab` | 11 |
| BattleEndLayer | `prefabs/ui/battle/BattleEndLayer.prefab` | 25 |
| BattleInfoLayer | `prefabs/ui/battle/BattleInfoLayer.prefab` | 18 |
| BattlePanelLayer | `prefabs/ui/battle/BattlePanelLayer.prefab` | 28 |
| BattleReportLayer | `prefabs/ui/battle/BattleReportLayer.prefab` | 1 |
| ChapterEndLayer | `prefabs/ui/chapter/ChapterEndLayer.prefab` | 8 |
| ChapterEndLoseCell | `prefabs/ui/chapter/ChapterEndLoseCell.prefab` | 17 |
| ChapterEndTowerCell1 | `prefabs/ui/chapter/ChapterEndTowerCell1.prefab` | 5 |
| ChapterEndTowerCell2 | `prefabs/ui/chapter/ChapterEndTowerCell2.prefab` | 7 |
| ChapterEndTowerLoseCell | `prefabs/ui/chapter/ChapterEndTowerLoseCell.prefab` | 5 |
| ChapterEndTowerWinCell | `prefabs/ui/chapter/ChapterEndTowerWinCell.prefab` | 7 |
| ChapterExtraRewardCell | `prefabs/ui/chapter/ChapterExtraRewardCell.prefab` | 11 |
| ChapterPreviewLayer | `prefabs/ui/chapter/ChapterPreviewLayer.prefab` | 28 |
| ChapterRewardCell | `prefabs/ui/chapter/ChapterRewardCell.prefab` | 5 |
| ChapterRewardLayer | `prefabs/ui/chapter/ChapterRewardLayer.prefab` | 9 |
| HardSelectCell | `prefabs/ui/hard-select/HardSelectCell.prefab` | 10 |
| HardSelectLayer | `prefabs/ui/hard-select/HardSelectLayer.prefab` | 9 |
| IdleHeroSelectLayer | `prefabs/ui/idle-hero/IdleHeroSelectLayer.prefab` | 23 |
| MainTaskCell | `prefabs/ui/main-task/MainTaskCell.prefab` | 17 |
| MainTaskChooseHeroLayer | `prefabs/ui/main-task/MainTaskChooseHeroLayer.prefab` | 29 |
| MainTaskLayer | `prefabs/ui/main-task/MainTaskLayer.prefab` | 21 |
| MainTaskPowerLayer | `prefabs/ui/main-task/MainTaskPowerLayer.prefab` | 6 |
| MissionCell | `prefabs/ui/mission/MissionCell.prefab` | 10 |
| MissionLayer | `prefabs/ui/mission/MissionLayer.prefab` | 20 |
| MissionRewardInfoCell | `prefabs/ui/mission/MissionRewardInfoCell.prefab` | 4 |
| MissionRewardInfoLayer | `prefabs/ui/mission/MissionRewardInfoLayer.prefab` | 12 |
| MissionRewardLayer | `prefabs/ui/mission/MissionRewardLayer.prefab` | 8 |
| PassChapterTipsLayer | `prefabs/ui/pass-chapter/PassChapterTipsLayer.prefab` | 18 |
| QuickBattleEndLayer | `prefabs/ui/quick-battle/QuickBattleEndLayer.prefab` | 41 |
| QuickBattleLayer | `prefabs/ui/quick-battle/QuickBattleLayer.prefab` | 21 |
| QuickBattleTipLayer | `prefabs/ui/quick-battle/QuickBattleTipLayer.prefab` | 11 |
| StrategyLayer | `prefabs/ui/strategy/StrategyLayer.prefab` | 4 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/common/win-bg_block-bg-10.png` | [9, 9, 9, 9] |
| `ui/maps/map-bg-result-1.png` | [150, 150, 10, 10] |
| `ui/battle/battle-end_spr-title.png` | [4, 4, 0, 0] |
| `ui/battle/battle-end_spr-jdt1.png` | [0, 0, 10, 10] |
| `ui/misc/dungeon_spr-reward-cell-bg.png` | [10, 10, 0, 0] |
| `ui/common/other_kuang.png` | [29, 49, 33, 39] |
| `ui/hero/hero-info_spr-bg-6.png` | [60, 20, 20, 20] |
| `ui/hero/hero-select_xian.png` | [0, 0, 45, 3] |
| `ui/hero/hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] |
| `ui/common/rank_spr-paimingk-1.png` | [10, 10, 10, 10] |

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_cell-bg-6.png` [29, 28, 29, 29]（edited by P2A）
- `ui/common/win-bg_win-bg-3.png` [19, 19, 19, 19]（edited by P2A）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BattleDetailLayer:/BattleDetailLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BattleEditLayer:/BattleEditLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChapterPreviewLayer:/ChapterPreviewLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChapterRewardLayer:/ChapterRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HardSelectLayer:/HardSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `IdleHeroSelectLayer:/IdleHeroSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MainTaskLayer:/MainTaskLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionLayer:/MissionLayer/node_content/content_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionRewardInfoLayer:/MissionRewardInfoLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionRewardLayer:/MissionRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `QuickBattleLayer:/QuickBattleLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BattleEditLayer:/BattleEditLayer/CCSprite_1/spr_send1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChapterPreviewLayer:/ChapterPreviewLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChapterRewardLayer:/ChapterRewardLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `IdleHeroSelectLayer:/IdleHeroSelectLayer/spr_bg_battle` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskLayer:/MainTaskLayer/spr_list_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskLayer:/MainTaskLayer/spr_select_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MissionRewardInfoLayer:/MissionRewardInfoLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MissionRewardLayer:/MissionRewardLayer/spr_box` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `QuickBattleLayer:/QuickBattleLayer/CCScale9Sprite_3` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `MissionLayer:/MissionLayer/node_content/scroll_view_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 0, 0] | `ChapterEndLayer:/ChapterEndLayer/spr_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [80, 80, 100, 100] | `QuickBattleEndLayer:/QuickBattleEndLayer/spr_bg` |
| `battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0] | `BattleEndLayer:/BattleEndLayer/CCScale9Sprite_1` |
| `battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0] | `QuickBattleEndLayer:/QuickBattleEndLayer/node_role/CCScale9Sprite_1` |
| `win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39] | `MissionCell:/MissionCell/CCScale9Sprite_1` |
| `win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14] | `MainTaskPowerLayer:/MainTaskPowerLayer/spr_bg` |
| `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `QuickBattleTipLayer:/QuickBattleTipLayer/spr_bg` |

## AdvenNoteCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AdvenNoteCell` | AdvenNoteCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[10, 10, 10, 10] |
| `/AdvenNoteCell/num_lab` | UILabelTTF | [451, 127] | [0.5008, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「(0/0)」46 FZCSJW--GB1-0.ttf rgb[97, 60, 25] |
| `/AdvenNoteCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteCell/menu/btn_go` | UIMenuItemLabel | [450, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「前往」48 [255, 255, 255, 255] |
| `/AdvenNoteCell/menu/btn_reward` | UIMenuItemLabel | [450, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「领取」48 [255, 255, 255, 255] |
| `/AdvenNoteCell/spr_got` | CCSprite | [450, 55] | [0.5, 0.5] | [102, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-geted.png` 50e7ade3-afff-4b57-a9cf-892e23090d89 |
| `/AdvenNoteCell/CCNode_1` | CCNode | [72, 54] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteCell/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [104, 104] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/AdvenNoteCell/CCNode_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/adven-note_spr-exp-1.png` b3c4a088-16e6-4a37-ab12-422cb8f1ada0 |
| `/AdvenNoteCell/CCNode_1/lbl_reward` | UILabelTTF | [38, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10K」34 FZCSJW--GB1-0.ttf rgbNone |

## AdvenNoteLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AdvenNoteLayer` | AdvenNoteLayer | [0, 0] | [0, 0] | [600, 860] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/spr_banner` | CCSprite | [304, 444] | [0.5, 0.5] | [619, 937] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/idle/map-bg-adven-note.png` 4c921de6-62db-41a5-9cab-df4d771d88c1 |
| `/AdvenNoteLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/UIMenu_1/btn_close` | UIMenuItemImage | [580, 870] | [0.5, 0.5] | [65, 71] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/adven-note_btn-close.png` 670950ce-6c78-4076-abf3-14f4f9bde833 |
| `/AdvenNoteLayer/node_level` | CCNode | [20, 640] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/node_level/spr_level` | CCLabelBMFont | [65, 90] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1」BMFont purple-56.fnt 48f2196d-0688-4315-aebf-233921e5cd96 |
| `/AdvenNoteLayer/node_level/spr_progress_bg` | CCSprite | [290, 40] | [0.5, 0.5] | [306, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-progress-bg1.png` f189e0bf-80ee-4690-9d9b-7d42cea9cad2 |
| `/AdvenNoteLayer/node_level/CCSprite_1` | CCSprite | [140, 42] | [0.5, 0.5] | [44, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-icon-1.png` 2626bd15-5354-4a72-88e5-92b3e0bf3bdb |
| `/AdvenNoteLayer/node_level/lbl_progress` | UILabelTTF | [290, 40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999/999」28 FZCSJW--GB1-0.ttf rgbNone |
| `/AdvenNoteLayer/node_level/menu_reward_next` | UIMenu | [220, 96] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/node_level/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/node_level/UIMenu_1/btn_level_reward` | UIMenuItemImage | [515, 45] | [0.5, 0.5] | [76, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/promo/promotion_btn-reward-1.png` d35ca281-a675-4020-b6b0-9455978827f4 |
| `/AdvenNoteLayer/node_charge` | CCNode | [20, 470] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/node_charge/lbl_total_charge` | UILabelTTF | [10, 140] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「累计充值9999元」44 FZCSJW--GB1-0.ttf rgb[253, 251, 230] |
| `/AdvenNoteLayer/node_charge/spr_got` | CCSprite | [455, 55] | [0.5, 0.5] | [102, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-geted.png` 50e7ade3-afff-4b57-a9cf-892e23090d89 |
| `/AdvenNoteLayer/node_charge/menu_reward` | UIMenu | [30, 55] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/node_charge/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AdvenNoteLayer/node_charge/UIMenu_1/btn_reward` | UIMenuItemLabel | [455, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「领取」48 [122, 71, 45, 255] |
| `/AdvenNoteLayer/node_charge/UIMenu_1/btn_more` | UIMenuItemImage | [480, 140] | [0.5, 0.5] | [105, 23] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/lang-1_lbl-reward.png` c6f7dc33-1825-4dd8-8732-eca8c329f49c |
| `/AdvenNoteLayer/scroll_view` | UIScrollViewBackpack | [300, 40] | [0.5, 0] | [550, 410] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## BattleDetailCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattleDetailCell` | BattleDetailCell | [0, 0] | [0, 0] | [90, 160] | [1, 1] | 0 | 是 |  |
| `/BattleDetailCell/CCSprite_1` | CCSprite | [45.0, 80.0] | [0.5, 0.5] | [88, 160] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_spr-cell-bg-4.png` dd90fd22-d9f8-403f-bca4-23c2ab10beb0 |
| `/BattleDetailCell/spr_progress_bg_1` | CCSprite | [45, 55] | [0.5, 0.5] | [84, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_progress-bg.png` 8715b72e-8fb9-4f3f-b97e-b8d6969df1e9 |
| `/BattleDetailCell/spr_progress_bg_2` | CCSprite | [45, 33] | [0.5, 0.5] | [84, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_progress-bg.png` 8715b72e-8fb9-4f3f-b97e-b8d6969df1e9 |
| `/BattleDetailCell/spr_progress_bg_3` | CCSprite | [45, 11] | [0.5, 0.5] | [84, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_progress-bg.png` 8715b72e-8fb9-4f3f-b97e-b8d6969df1e9 |
| `/BattleDetailCell/lbl_progress_1` | UILabelTTF | [45, 60] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「123456789」28 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattleDetailCell/lbl_progress_2` | UILabelTTF | [45, 38] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「123456789」28 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattleDetailCell/lbl_progress_3` | UILabelTTF | [45, 16] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「123456789」28 STZhongsong.ttf rgb[254, 255, 255] |

## BattleDetailLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattleDetailLayer` | BattleDetailLayer | [0, 0] | [0, 0] | [600, 750] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/BattleDetailLayer/node_title` | CCNode | [300.0, 741.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BattleDetailLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「战 报」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/BattleDetailLayer/lbl_attack_1` | UILabelTTF | [210, 165] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999999」48 FZCSJW--GB1-0.ttf rgbNone |
| `/BattleDetailLayer/CCNode_1` | CCNode | [300, 605] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/CCNode_1/lbl_tip_1` | UILabelTTF | [-190, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「伤害:」48 FZCSJW--GB1-0.ttf rgb[141, 89, 50] |
| `/BattleDetailLayer/CCNode_1/spr_tip_1` | CCSprite | [-160, 0] | [0.5, 0.5] | [48, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_progress-red-tip.png` e34a8e79-3dbb-4f70-add8-d6c07a088c8e |
| `/BattleDetailLayer/CCNode_1/lbl_tip_2` | UILabelTTF | [25, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「承受伤害:」48 FZCSJW--GB1-0.ttf rgb[141, 89, 50] |
| `/BattleDetailLayer/CCNode_1/spr_tip_2` | CCSprite | [55, 0] | [0.5, 0.5] | [48, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_progress-yellow-tip.png` 79d7afb3-c30e-43f7-b19b-132d627c55d9 |
| `/BattleDetailLayer/CCNode_1/lbl_tip_3` | UILabelTTF | [180, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「治疗:」48 FZCSJW--GB1-0.ttf rgb[141, 89, 50] |
| `/BattleDetailLayer/CCNode_1/spr_tip_3` | CCSprite | [210, 0] | [0.5, 0.5] | [48, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_progress-green-tip.png` f185269f-9e58-4071-a85c-572dcc1e79e6 |
| `/BattleDetailLayer/node_role_1` | CCNode | [300, 335] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/node_role_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0] | [546, 242] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_spr-cell-bg.png` d056587b-51b3-44a9-98aa-00d4fcf22789 |
| `/BattleDetailLayer/node_role_1/spr_result_1` | CCSprite | [-270, 213] | [0, 0.5] | [127, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail-lang_spr-result-win.png` 5f0ef8fa-52e0-4e5d-a32f-43bb8d501d44 |
| `/BattleDetailLayer/node_role_1/lbl_name_1` | UILabelTTF | [0, 213] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字六字」52 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/BattleDetailLayer/node_role_1/scroll_view_1` | UIScrollViewBackpack | [0, 15] | [0.5, 0] | [530, 160] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/BattleDetailLayer/node_role_2` | CCNode | [300, 75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/node_role_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0] | [546, 242] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail_spr-cell-bg.png` d056587b-51b3-44a9-98aa-00d4fcf22789 |
| `/BattleDetailLayer/node_role_2/spr_result_2` | CCSprite | [-270, 213] | [0, 0.5] | [127, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-detail-lang_spr-result-win.png` 5f0ef8fa-52e0-4e5d-a32f-43bb8d501d44 |
| `/BattleDetailLayer/node_role_2/lbl_name_2` | UILabelTTF | [0, 213] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字六字」52 FZCSJW--GB1-0.ttf rgbNone |
| `/BattleDetailLayer/node_role_2/scroll_view_2` | UIScrollViewBackpack | [0, 15] | [0.5, 0] | [530, 160] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/BattleDetailLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/UIMenu_1/btn_close` | UIMenuItemImage | [545, 715] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BattleDetailLayer/alice_report_menu` | CCMenu | [300.0, 645.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattleDetailLayer/alice_report_menu/btn_report_1` | UIMenuItemLabel | [-190, 0] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「确定」48 [122, 71, 45, 255] |
| `/BattleDetailLayer/alice_report_menu/btn_report_2` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「确定」48 [122, 71, 45, 255] |
| `/BattleDetailLayer/alice_report_menu/btn_report_3` | UIMenuItemLabel | [190, 0] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「确定」48 [122, 71, 45, 255] |

## BattleEditLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattleEditLayer` | BattleEditLayer | [0, 0] | [0, 0] | [640.0, 768.0] | [1, 1] | 0 | 是 |  |
| `/BattleEditLayer/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, 768.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/BattleEditLayer/spr_circle` | CCSprite | [320.0, 314.1] | [0.5, 0.5] | [290, 290] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle-1.png` f5ab1bb3-0592-49f5-bca7-b13bfac7efe9 |
| `/BattleEditLayer/CCSprite_1` | CCSprite | [320.0, 768.0] | [0.5, 0.5] | [79, 79] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-null.png` 970be76e-0576-414e-97f4-edd2bda8bb6a |
| `/BattleEditLayer/CCSprite_1/menu` | CCMenu | [-39.5, -39.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattleEditLayer/CCSprite_1/menu/btn_send` | UIMenuItemLabel | [42.075, -847.008] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「发  送」24 [255, 255, 255, 255] |
| `/BattleEditLayer/CCSprite_1/menu/UIMenuItemLabel_1` | UIMenuItemLabel | [258.075, -847.008] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` b9567aa5-5c96-48f9-950f-103e7f95ec25 · Label「清  除」24 [255, 255, 255, 255] |
| `/BattleEditLayer/CCSprite_1/spr_send1` | CCScale9Sprite | [-296.02, -829.238] | [0.5, 0.5] | [600, 700] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/BattleEditLayer/CCNode_1` | CCNode | [640.0, 768.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleEditLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattleEditLayer/CCNode_1/CCMenu_1/btn_close` | UIMenuItemImage | [-79, -38] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## BattleEndLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattleEndLayer` | BattleEndLayer | [0, 0] | [0, 0] | [640, 730] | [1, 1] | 0 | 是 |  |
| `/BattleEndLayer/spr_bg` | CCScale9Sprite | [320, -44] | [0.5, 0] | [640, 650] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[150, 150, 10, 10] |
| `/BattleEndLayer/spr_wing` | CCSprite | [330, 567] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/BattleEndLayer/show_hero` | CCNode | [110, 735] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleEndLayer/spr_result` | CCSprite | [336, 558] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/BattleEndLayer/spr_result2` | CCSprite | [305.0, 219.95] | [0.5, 0.5] | [378, 195] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/battle/battle-end_spr-result-0.png` e2539eea-b259-414a-a0fe-60ed0188daf3 |
| `/BattleEndLayer/lbl_faild` | UILabelTTF | [321, 93] | [0.5, 0.5] | [580, 140] | [0.5, 0.5] | 0 | 是 | cc.Label「失败，不要气馁，
可以通过以下方式提升实力！」44 STZhongsong.ttf rgb[251, 241, 217] |
| `/BattleEndLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattleEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [579, 493] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/BattleEndLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [320, -89] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「确定」56 [255, 255, 255, 255] |
| `/BattleEndLayer/lbl_time` | UILabelTTF | [320, -133] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「5秒后关闭」18 STZhongsong.ttf rgb[0, 249, 0] |
| `/BattleEndLayer/CCSprite_1` | CCSprite | [320, 282] | [0.5, 0.5] | [112, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_spr-hdwp.png` 6aa1cf34-13c9-4bee-bd1b-fe6ac72a3c39 |
| `/BattleEndLayer/show_rich` | CCNode | [324, 467] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleEndLayer/CCSprite_2` | CCSprite | [487, 708] | [0.5, 0.5] | [309, 154] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-k1.png` f034ab78-d1e8-4a31-85d6-3dfa34a9a551 |
| `/BattleEndLayer/CCSprite_3` | CCSprite | [414, 805] | [0.5, 0.5] | [459, 180] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_spr-zjms.png` 9fa6bc10-5bb3-4826-aab5-12abd604e5d3 |
| `/BattleEndLayer/lbl_hero_name` | UILabelTTF | [534, 728] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1111111111111」28 STZhongsong.ttf rgb[255, 241, 224] |
| `/BattleEndLayer/UILabelTTF_1` | UILabelTTF | [537, 688] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「总伤害量」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattleEndLayer/lbl_hero_nums` | UILabelTTF | [533, 650] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1111111111111」22 STZhongsong.ttf rgb[255, 196, 79] |
| `/BattleEndLayer/CCScale9Sprite_1` | CCScale9Sprite | [324, 374] | [0.5, 0.5] | [510, 100] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[10, 10, 20, 20] |
| `/BattleEndLayer/spr_photo` | CCSprite | [190, 377] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_2.png` 289628e0-48a9-4c98-af85-a394d661dce9 |
| `/BattleEndLayer/spr_photo_bg` | CCSprite | [189, 374] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/BattleEndLayer/lbl_role_lv` | UILabelTTF | [255, 395] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Lv 1」22 STZhongsong.ttf rgb[252, 227, 161] |
| `/BattleEndLayer/role_exp` | CCScale9Sprite | [395, 352] | [0.5, 0.5] | [280, 24] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-jdt1.png` 0b14d126-1bca-41fe-b9ed-7700f0e0f357 insets[0, 0, 10, 10] |
| `/BattleEndLayer/lbl_role_exp_num` | UILabelTTF | [391, 352] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattleEndLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## BattleInfoLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattleInfoLayer` | BattleInfoLayer | [0, 0] | [0, 0] | [640.0, 108] | [1, 1] | 0 | 是 |  |
| `/BattleInfoLayer/spr_name_bg1` | CCScale9Sprite | [50.0, 11] | [0.5, 0.5] | [220.0, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-battle-2.png` 60a6a538-0704-4a57-980d-1eea5526cce6 |
| `/BattleInfoLayer/spr_my_elem` | CCSprite | [35.0, 36] | [0.5, 0.5] | [74, 74] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/BattleInfoLayer/CCSprite_1` | CCSprite | [320.0, 35.0] | [0.5, 0.5] | [80, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-vs.png` 456deb3a-395d-4198-b4b0-392905533433 |
| `/BattleInfoLayer/spr_name_bg2` | CCScale9Sprite | [592.0, 11] | [1, 0] | [220.0, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-battle-1.png` b7488d5e-1837-4346-81e7-23c790691280 |
| `/BattleInfoLayer/spr_enemy_elem` | CCSprite | [605.0, 36] | [0.5, 0.5] | [74, 74] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/BattleInfoLayer/lbl_name1` | UILabelTTF | [134.4, 36.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/BattleInfoLayer/lbl_name2` | UILabelTTF | [512.0, 36.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/BattleInfoLayer/CCNode_1` | CCNode | [640.0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattleInfoLayer/CCNode_1/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattleInfoLayer/CCNode_1/UIMenu_1/btn_speed` | UIMenuItemImage | [-50, 120] | [0.5, 0.5] | [76, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/battle/battle-scene_btn-speed-1.png` 58dc9d7e-5824-4c50-9022-ab446b38375d |
| `/BattleInfoLayer/CCNode_1/UIMenu_1/btn_skip` | UIMenuItemImage | [-50, 211] | [0.5, 0.5] | [74, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/battle/battle-scene_btn-speed-11.png` d94bc367-ea9c-4de1-8f94-039b0fea59e5 |
| `/BattleInfoLayer/CCNode_1/UIMenu_1/btn_close` | UIMenuItemImage | [-50, 685] | [0.5, 0.5] | [80, 74] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/battle/battle-scene_btn-close-1.png` c737a389-7ee3-4161-a29e-db0b35682323 |
| `/BattleInfoLayer/CCNode_2` | CCNode | [320.0, 87.048] | [0.5, 0] | [640.0, 1] | [1, 1] | 0 | 是 |  |
| `/BattleInfoLayer/CCNode_2/spr_bg` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [160, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-round-bg.png` d5081199-0b7c-43ca-b0a4-92d13e067c22 |
| `/BattleInfoLayer/CCNode_2/lbl_round` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「第1/15回合」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/BattleInfoLayer/CCNode_2/spr_contract1` | CCSprite | [-100.0, -52.5] | [0.5, 0.5] | [72, 72] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-2.png` a8a11a0e-21b9-4afb-83ad-591f5cd1712e |
| `/BattleInfoLayer/CCNode_2/spr_contract2` | CCSprite | [100.0, -52.5] | [0.5, 0.5] | [72, 72] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-2.png` a8a11a0e-21b9-4afb-83ad-591f5cd1712e |

## BattlePanelLayer（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattlePanelLayer` | BattlePanelLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/BattlePanelLayer/CCSprite_1` | CCSprite | [320, 91] | [0.5, 0.5] | [640, 369] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-battle-bottom.png` 16e187cb-cd7f-407a-88a3-df38783a8cd9 |
| `/BattlePanelLayer/CCSprite_1/spr_world` | CCSprite | [2.0, 68.5] | [0.5, 0.5] | [128, 128] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/chapter/chapter-world/map01.png` 5b0349a8-1cf2-48e8-865d-3532945e0e4a |
| `/BattlePanelLayer/CCSprite_1/CCSprite_1` | CCSprite | [1.0, 87.5] | [0.5, 0.5] | [162, 162] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-map-frame-1.png` 9e229a8c-fca7-46f5-a069-f2badc663a68 |
| `/BattlePanelLayer/CCSprite_1/lbl_map` | UILabelTTF | [1.0, 152.5] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「地.  图」22 STZhongsong.ttf rgb[255, 244, 163] |
| `/BattlePanelLayer/CCSprite_1/spr_world_icon` | CCSprite | [2.0, 34.5] | [0.5, 0.5] | [58, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_gem-1.png` 53dd9c05-9702-481d-a6b2-6711944fe54d |
| `/BattlePanelLayer/CCSprite_1/menu` | UIMenu | [-320.0, -99.5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BattlePanelLayer/CCSprite_1/menu/btn_battle` | UIMenuItemLabel | [321, 70] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「战  斗」24 [255, 255, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/menu/btn_lineup` | UIMenuItemLabel | [130, 70] | [0.5, 0.5] | [197, 60] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-7.png` dc102352-b445-4518-872a-edd8fe0c63c9 · Label「我要变强」54 [255, 255, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/menu/btn_speed_battle` | UIMenuItemLabel | [511, 70] | [0.5, 0.5] | [197, 60] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-7.png` dc102352-b445-4518-872a-edd8fe0c63c9 · Label「快速战斗」54 [255, 255, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/menu/btn_map` | UIMenuItemImage | [321, 164] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/BattlePanelLayer/CCSprite_1/menu/btn_icon` | UIMenuItemImage | [321, 134] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/BattlePanelLayer/CCSprite_1/lbl_mission_name` | UILabelTTF | [1.0, 86.5] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「999」45 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/spr_progress_AFK_bg` | CCSprite | [-180.0, 75.5] | [0.5, 0.5] | [166, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_progress-AFK-bg.png` b369cd64-f3e6-4eea-bc3c-4ad764bae5e9 |
| `/BattlePanelLayer/CCSprite_1/spr_box` | CCSprite | [-253.0, 75.5] | [0.5, 0.5] | [44, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-box-2.png` c7f42933-ac63-4c5c-853c-700b2cc44404 |
| `/BattlePanelLayer/CCSprite_1/CCSprite_2` | CCSprite | [-180.0, 29.5] | [0.5, 0.5] | [166, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_progress-AFK-bg.png` b369cd64-f3e6-4eea-bc3c-4ad764bae5e9 |
| `/BattlePanelLayer/CCSprite_1/CCSprite_3` | CCSprite | [182.0, 29.5] | [0.5, 0.5] | [166, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_progress-AFK-bg.png` b369cd64-f3e6-4eea-bc3c-4ad764bae5e9 |
| `/BattlePanelLayer/CCSprite_1/CCSprite_4` | CCSprite | [182.0, 75.5] | [0.5, 0.5] | [166, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_progress-AFK-bg.png` b369cd64-f3e6-4eea-bc3c-4ad764bae5e9 |
| `/BattlePanelLayer/CCSprite_1/CCSprite_5` | CCSprite | [118.0, 29.5] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900101.png` bc998bee-4638-4a64-a7f0-1249cd4b4d19 |
| `/BattlePanelLayer/CCSprite_1/CCSprite_6` | CCSprite | [117.0, 75.5] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/BattlePanelLayer/CCSprite_1/CCSprite_7` | CCSprite | [-253.0, 29.5] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900003.png` 92622b20-5a2e-45d4-aec7-e4c8f091bd11 |
| `/BattlePanelLayer/CCSprite_1/lbl_progress_time` | UILabelTTF | [-116.0, 75.5] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 254] |
| `/BattlePanelLayer/CCSprite_1/lbl_gold` | UILabelTTF | [248.0, 75.5] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/lbl_souls` | UILabelTTF | [248.0, 29.5] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/lbl_exp` | UILabelTTF | [-116.0, 29.5] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/BattlePanelLayer/CCSprite_1/node_bubble` | CCNode | [-320.0, -184.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BattlePanelLayer/CCSprite_1/node_bubble/spr_bubble` | CCSprite | [170.8, 396.8] | [0.5, 0.5] | [75, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-bubble.png` e3c47147-51b2-496f-b9b5-0c20a0da5491 |
| `/BattlePanelLayer/CCSprite_1/node_bubble/lbl_progress_time2` | UILabelTTF | [170, 404.8] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」24 STZhongsong.ttf rgb[141, 89, 58] |

## BattleReportLayer（1）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BattleReportLayer` | BattleReportLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |

## ChapterEndLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterEndLayer` | ChapterEndLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChapterEndLayer/spr_bg` | CCScale9Sprite | [320, 0] | [0.5, 0] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[150, 150, 0, 0] |
| `/ChapterEndLayer/spr_wing` | CCSprite | [320, 375] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/ChapterEndLayer/spr_result` | CCSprite | [320, 359] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/ChapterEndLayer/CCSprite_1` | CCSprite | [320, -15] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/ChapterEndLayer/menu_main` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterEndLayer/menu_main/btn_report` | UIMenuItemImage | [600, 320] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/ChapterEndLayer/scroll_view` | UIScrollViewBackpack | [320, 78] | [0.5, 0] | [640, 180] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ChapterEndLoseCell（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterEndLoseCell` | ChapterEndLoseCell | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChapterEndLoseCell/CCSprite_1` | CCSprite | [150, 180] | [0.5, 0.5] | [68, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_btn-bg.png` e6ff3d88-81a0-4632-a3f2-135842a7d34a |
| `/ChapterEndLoseCell/CCSprite_2` | CCSprite | [265, 180] | [0.5, 0.5] | [68, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_btn-bg.png` e6ff3d88-81a0-4632-a3f2-135842a7d34a |
| `/ChapterEndLoseCell/CCSprite_3` | CCSprite | [385, 180] | [0.5, 0.5] | [68, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_btn-bg.png` e6ff3d88-81a0-4632-a3f2-135842a7d34a |
| `/ChapterEndLoseCell/CCSprite_4` | CCSprite | [500, 180] | [0.5, 0.5] | [68, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_btn-bg.png` e6ff3d88-81a0-4632-a3f2-135842a7d34a |
| `/ChapterEndLoseCell/lbl_battle_time` | UILabelTTF | [150, 123.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄召唤」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChapterEndLoseCell/lbl_battle_time` | UILabelTTF | [265, 123.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄培养」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChapterEndLoseCell/lbl_battle_time` | UILabelTTF | [385, 123.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「更换装备」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChapterEndLoseCell/lbl_battle_time` | UILabelTTF | [500, 123.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「提升羁绊」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChapterEndLoseCell/menu_main` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterEndLoseCell/menu_main/btn_summon` | UIMenuItemImage | [149.8, 180.304] | [0.5, 0.5] | [85, 90] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-city_up-main_summon.png` 44394e59-49f2-4d82-ac1d-c0557f15e964 |
| `/ChapterEndLoseCell/menu_main/btn_up` | UIMenuItemImage | [264.8, 186.304] | [0.5, 0.5] | [81, 80] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-scene-lang_spr-hero.png` df93e3a7-c17e-475c-be18-818f26a1b5e5 |
| `/ChapterEndLoseCell/menu_main/btn_equip` | UIMenuItemImage | [384.8, 184.304] | [0.5, 0.5] | [113, 105] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-city_up-main_smith_shop.png` 25547448-de14-4697-80c5-cd1231e0112c |
| `/ChapterEndLoseCell/menu_main/btn_fetter` | UIMenuItemImage | [500, 184.304] | [0.5, 0.5] | [81, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-scene_spr-fetter.png` 071be665-4e92-45bc-9a1d-e375f3118f4f |
| `/ChapterEndLoseCell/menu_main/btn_strong` | UIMenuItemLabel | [320, 53.544] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「变强小助手」45 [255, 255, 255, 255] |
| `/ChapterEndLoseCell/lbl_faild` | UILabelTTF | [320, 280] | [0.5, 0.5] | [580, 140] | [0.5, 0.5] | 0 | 是 | cc.Label「失败，不要气馁，
可以通过以下方式提升实力！」44 STZhongsong.ttf rgb[251, 241, 217] |
| `/ChapterEndLoseCell/lbl_close_time` | UILabelTTF | [598.0, 55.0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「5秒后关闭」34 STZhongsong.ttf rgb[254, 255, 255] |

## ChapterEndTowerCell1（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterEndTowerCell1` | ChapterEndTowerLoseCell | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerCell1/menu_main` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerCell1/menu_main/btn_limit_gift` | UIMenuItemImage | [320, 217.544] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal **缺图** battle-end/spr-limit-gift-1.png |
| `/ChapterEndTowerCell1/menu_main/btn_strong` | UIMenuItemLabel | [220, 109.544] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「变强小助手」45 [255, 255, 255, 255] |
| `/ChapterEndTowerCell1/menu_main/btn_buy_gift` | UIMenuItemLabel | [420, 109.544] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「立即抢购」45 [255, 255, 255, 255] |

## ChapterEndTowerCell2（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterEndTowerCell2` | ChapterEndTowerCell2 | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerCell2/node_tower_next_stage` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerCell2/node_tower_next_stage/CCScale9Sprite_1` | CCScale9Sprite | [320, 280] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/ChapterEndTowerCell2/node_tower_next_stage/lbl_battle_time` | UILabelTTF | [320, 280] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「通关时间: 00:00:31」44 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/ChapterEndTowerCell2/node_tower_next_stage/menu_tower` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerCell2/node_tower_next_stage/menu_tower/btn_next_stage_done` | UIMenuItemLabel | [219, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「确 定」48 [255, 255, 255, 255] |
| `/ChapterEndTowerCell2/node_tower_next_stage/menu_tower/btn_next_stage` | UIMenuItemLabel | [420, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「挑战下层」48 [255, 255, 255, 255] |

## ChapterEndTowerLoseCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterEndTowerLoseCell` | ChapterEndTowerLoseCell | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerLoseCell/menu_main` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerLoseCell/menu_main/btn_limit_gift` | UIMenuItemImage | [320, 217.544] | [0.5, 0.5] | [259, 90] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/battle/battle-end-lang_spr-limit-gift-1.png` dff964f5-edc2-4bfe-9799-9caae4675fb0 |
| `/ChapterEndTowerLoseCell/menu_main/btn_strong` | UIMenuItemLabel | [220, 109.544] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「变强小助手」45 [255, 255, 255, 255] |
| `/ChapterEndTowerLoseCell/menu_main/btn_buy_gift` | UIMenuItemLabel | [420, 109.544] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「立即抢购」45 [255, 255, 255, 255] |

## ChapterEndTowerWinCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterEndTowerWinCell` | ChapterEndTowerWinCell | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerWinCell/node_tower_next_stage` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerWinCell/node_tower_next_stage/CCScale9Sprite_1` | CCScale9Sprite | [320, 280] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/ChapterEndTowerWinCell/node_tower_next_stage/lbl_battle_time` | UILabelTTF | [320, 280] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「通关时间: 00:00:31」44 STZhongsong.ttf rgb[255, 228, 161] |
| `/ChapterEndTowerWinCell/node_tower_next_stage/menu_tower` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterEndTowerWinCell/node_tower_next_stage/menu_tower/btn_next_stage_done` | UIMenuItemLabel | [219, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「确 定」48 [255, 255, 255, 255] |
| `/ChapterEndTowerWinCell/node_tower_next_stage/menu_tower/btn_next_stage` | UIMenuItemLabel | [420, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「挑战下层」48 [255, 255, 255, 255] |

## ChapterExtraRewardCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterExtraRewardCell` | ChapterExtraRewardCell | [0, 0] | [0, 0] | [150, 180] | [1, 1] | 0 | 是 |  |
| `/ChapterExtraRewardCell/spr_reward_bg` | CCSprite | [75, 99] | [0.5, 0.5] | [150, 150] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/chapter-reward/chapter-reward_spr-item-bg-1.png` 58f18b57-09c0-4696-b8a5-cd4016e0eec2 |
| `/ChapterExtraRewardCell/spr_text_bg` | CCSprite | [75, 23] | [0.5, 0.5] | [148, 20] | [1.3, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/chapter-reward/chapter-reward_spr-bg-1.png` 7983f342-99c0-4600-9b09-92143489839c |
| `/ChapterExtraRewardCell/node_prog` | CCNode | [75, 46] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChapterExtraRewardCell/node_prog/spr_prog_bg` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [126, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/chapter-reward/chapter-reward_spr-prog-1.png` 8c052778-75f1-42a2-b0a9-d9fb18d640ab |
| `/ChapterExtraRewardCell/node_prog/lbl_mission` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/0」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChapterExtraRewardCell/CCNode_1` | CCNode | [134, 98] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChapterExtraRewardCell/CCNode_1/spr_content_bg` | CCScale9Sprite | [13, -6] | [1, 0] | [224, 108] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_kuang.png` 983a72dd-8ad6-4489-83cc-eb82bf1e92f7 insets[30, 50, 35, 40] |
| `/ChapterExtraRewardCell/menu` | CCMenu | [75.0, 20.52] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterExtraRewardCell/menu/btn_reward` | UIMenuItemLabel | [0, 4] | [0.5, 0.5] | [136, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/chapter-reward-lang/chapter-reward-lang_btn-reward-1.png` c1e749f0-5615-49da-a2ea-679afcef09cf · Label「」24 [255, 255, 255, 255] |
| `/ChapterExtraRewardCell/spr_top_tip` | CCSprite | [75, 174] | [0.5, 0.5] | [117, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/chapter-reward-lang/chapter-reward-lang_1.png` 7b538294-4d3f-4fec-b64c-88e83b6c2de6 |

## ChapterPreviewLayer（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterPreviewLayer` | ChapterPreviewLayer | [0, 0] | [0, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/ChapterPreviewLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ChapterPreviewLayer/node_title` | CCNode | [320.0, 592.857] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChapterPreviewLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChapterPreviewLayer/node_title/lbl_name` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「关卡1-3」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChapterPreviewLayer/spr_bg` | CCScale9Sprite | [30.4, 99.937] | [0.5, 0.5] | [580, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChapterPreviewLayer/scroll_view` | CCScrollView | [36, 104.4] | [0, 0] | [570, 190] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/ChapterPreviewLayer/CCSprite_1` | CCSprite | [474.974, 450.785] | [0.5, 0.5] | [140, 4] | [1.5, 1.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-3.png` b88f88ed-6f42-4c03-bba5-e33992630450 |
| `/ChapterPreviewLayer/UILabelTTF_1` | UILabelTTF | [320, 453.174] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「关卡产出」22 STZhongsong.ttf rgb[86, 40, 0] |
| `/ChapterPreviewLayer/CCSprite_2` | CCSprite | [161.882, 450.785] | [0.5, 0.5] | [140, 4] | [-1.5, 1.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-3.png` b88f88ed-6f42-4c03-bba5-e33992630450 |
| `/ChapterPreviewLayer/UILabelTTF_2` | UILabelTTF | [320, 339.174] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「关卡掉落」22 STZhongsong.ttf rgb[86, 40, 0] |
| `/ChapterPreviewLayer/CCSprite_3` | CCSprite | [161.882, 339.2] | [0.5, 0.5] | [140, 4] | [-1.5, 1.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-3.png` b88f88ed-6f42-4c03-bba5-e33992630450 |
| `/ChapterPreviewLayer/CCSprite_4` | CCSprite | [474.974, 339.2] | [0.5, 0.5] | [140, 4] | [1.5, 1.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-3.png` b88f88ed-6f42-4c03-bba5-e33992630450 |
| `/ChapterPreviewLayer/CCSprite_5` | CCSprite | [148, 397] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChapterPreviewLayer/CCSprite_6` | CCSprite | [85, 396] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/ChapterPreviewLayer/CCSprite_7` | CCSprite | [85, 396] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/ChapterPreviewLayer/CCSprite_8` | CCSprite | [331, 397] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChapterPreviewLayer/CCSprite_9` | CCSprite | [263, 396] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/ChapterPreviewLayer/CCSprite_10` | CCSprite | [262, 397] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900101.png` bc998bee-4638-4a64-a7f0-1249cd4b4d19 |
| `/ChapterPreviewLayer/CCSprite_11` | CCSprite | [499, 397] | [0.5, 0.5] | [178, 32] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChapterPreviewLayer/CCSprite_12` | CCSprite | [440, 396] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/ChapterPreviewLayer/CCSprite_13` | CCSprite | [440, 397] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900003.png` 92622b20-5a2e-45d4-aec7-e4c8f091bd11 |
| `/ChapterPreviewLayer/lbl_res1` | UILabelTTF | [152, 397.174] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234551」22 STZhongsong.ttf rgb[254, 255, 254] |
| `/ChapterPreviewLayer/lbl_res2` | UILabelTTF | [336, 397.174] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234551」22 STZhongsong.ttf rgb[254, 255, 254] |
| `/ChapterPreviewLayer/lbl_res3` | UILabelTTF | [510, 397.174] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234551」22 STZhongsong.ttf rgb[254, 255, 254] |
| `/ChapterPreviewLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterPreviewLayer/UIMenu_1/btn_close` | UIMenuItemImage | [566.111, 564.53] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChapterPreviewLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [320, 60] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「前  往」48 [255, 255, 255, 255] |

## ChapterRewardCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterRewardCell` | ChapterRewardCell | [0, 0] | [0, 0] | [570, 160] | [1, 1] | 0 | 是 |  |
| `/ChapterRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 2] | [0.5, 0.5] | [570, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[10, 10, 10, 10] |
| `/ChapterRewardCell/lbl_title` | UILabelTTF | [20, 135] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关100关(0/100)」20 STZhongsong.ttf rgb[122, 71, 45] |
| `/ChapterRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterRewardCell/menu/btn_battle` | UIMenuItemLabel | [493.6, 60] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「前 往」40 [255, 255, 255, 255] |

## ChapterRewardLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChapterRewardLayer` | ChapterRewardLayer | [0, 0] | [0, 0] | [640, 1040] | [1, 1] | 0 | 是 |  |
| `/ChapterRewardLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 1040] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ChapterRewardLayer/node_title` | CCNode | [320.0, 1032.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChapterRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChapterRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「通关奖励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChapterRewardLayer/spr_box` | CCScale9Sprite | [35, 61] | [0.5, 0.5] | [570, 720] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChapterRewardLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChapterRewardLayer/UIMenu_1/btn_close` | UIMenuItemImage | [571.96, 1003.2] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChapterRewardLayer/CCSprite_1` | CCSprite | [320, 861.795] | [0.5, 0.5] | [568, 154] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_banner.png` 0bf769a6-2bb7-4cd8-82ef-53d1cc7713a6 |

## HardSelectCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HardSelectCell` | HardSelectCell | [0, 0] | [0, 0] | [554, 198] | [1, 1] | 0 | 是 |  |
| `/HardSelectCell/spr_cell_bg` | CCSprite | [0, 0] | [0, 0] | [552, 196] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/trial-lang_spr-level-1.png` 58287df0-9c00-43b7-bc5e-9c1eeb1d0ae4 |
| `/HardSelectCell/node_limit` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HardSelectCell/node_limit/lbl_tip` | UILabelTTF | [350, 145] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「一般难度通关后开启」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/HardSelectCell/node_limit/CCSprite_1` | CCSprite | [450, 70] | [0.5, 0.5] | [141, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/trial_spr-attack-need-bg.png` 84c33d75-2464-4c4b-89ff-7654ad8a9d79 |
| `/HardSelectCell/node_limit/CCSprite_2` | CCSprite | [405, 70] | [0.5, 0.5] | [42, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_attack-1.png` a6a402a5-7abc-456d-8873-1542a96c0a0b |
| `/HardSelectCell/node_limit/lbl_combat_num` | UILabelTTF | [425, 70] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1234567」44 STZhongsong.ttf rgb[255, 184, 79] |
| `/HardSelectCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HardSelectCell/menu/btn_confirm` | UIMenuItemLabel | [450, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「选 择」40 [112, 71, 45, 255] |
| `/HardSelectCell/menu_reward` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## HardSelectLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/HardSelectLayer` | PvpLayer | [0, 0] | [0, 0] | [620, 760] | [1, 1] | 0 | 是 |  |
| `/HardSelectLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 780] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/HardSelectLayer/node_title` | CCNode | [310.0, 760.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/HardSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/HardSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择难度」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/HardSelectLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/HardSelectLayer/menu/btn_close` | UIMenuItemImage | [560, 735] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/HardSelectLayer/lbl_tip` | UILabelTTF | [310, 40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择难度后，本轮无法更改难度」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/HardSelectLayer/scroll_view` | CCScrollView | [30, 55] | [0, 0] | [560, 600] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## IdleHeroSelectLayer（23）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/IdleHeroSelectLayer` | IdleHeroSelectLayer | [0, 0] | [0, 0] | [580, 710] | [1, 1] | 0 | 是 |  |
| `/IdleHeroSelectLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [580, 710] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/IdleHeroSelectLayer/node_title` | CCNode | [290.0, 702.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/IdleHeroSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/IdleHeroSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挂机队伍」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/IdleHeroSelectLayer/CCSprite_1` | CCSprite | [290, 614] | [0.5, 0.5] | [182, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-battle.png` 1e61e330-0437-43a3-a5c5-2884c38b6be6 |
| `/IdleHeroSelectLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/IdleHeroSelectLayer/UIMenu_1/btn_close` | UIMenuItemImage | [513.48, 674.8] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/IdleHeroSelectLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [289.8, 47.312] | [0.5, 0.5] | [197, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「」24 [255, 255, 255, 255] |
| `/IdleHeroSelectLayer/spr_bg_backpack` | CCScale9Sprite | [291, 87.0] | [0.5, 0] | [500, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-bg-6.png` e6933ade-8fa4-41eb-857f-a1ecc307020e insets[60, 20, 20, 20] |
| `/IdleHeroSelectLayer/spr_bg_battle` | CCScale9Sprite | [291, 325] | [0.5, 0] | [500, 250] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/IdleHeroSelectLayer/lbl_battle_count` | UILabelTTF | [290, 614] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10000000」60 STZhongsong.ttf rgb[253, 224, 177] |
| `/IdleHeroSelectLayer/CCSprite_2` | CCSprite | [201, 613] | [0.5, 0.5] | [42, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/IdleHeroSelectLayer/CCSprite_3` | CCSprite | [200, 613] | [0.5, 0.5] | [42, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_attack-1.png` a6a402a5-7abc-456d-8873-1542a96c0a0b |
| `/IdleHeroSelectLayer/UIMenu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/IdleHeroSelectLayer/UIMenu_2/btn_elem0` | UIMenuItemImage | [91, 285] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/IdleHeroSelectLayer/UIMenu_2/btn_elem1` | UIMenuItemImage | [171, 285] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/IdleHeroSelectLayer/UIMenu_2/btn_elem2` | UIMenuItemImage | [331, 285] | [0.499, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/IdleHeroSelectLayer/UIMenu_2/btn_elem3` | UIMenuItemImage | [251, 285] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/IdleHeroSelectLayer/UIMenu_2/btn_elem4` | UIMenuItemImage | [411, 285] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/IdleHeroSelectLayer/UIMenu_2/btn_elem5` | UIMenuItemImage | [491, 285] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/IdleHeroSelectLayer/scroll_view_selected` | CCScrollView | [50, 325] | [0, 0] | [480, 249] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/IdleHeroSelectLayer/scroll_view_backpack` | CCScrollView | [49, 92] | [0, 0] | [480, 160] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## MainTaskCell（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MainTaskCell` | MainTaskCell | [0, 0] | [0, 0] | [550, 155] | [1, 1] | 0 | 是 |  |
| `/MainTaskCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MainTaskCell/menu/btn_get` | UIMenuItemImage | [445, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/MainTaskCell/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 159] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/MainTaskCell/spr_star_bg` | CCSprite | [106, 135] | [0.5, 0.5] | [216, 47] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-task-lang_spr-star3.png` af68a11c-9bd8-498d-acfa-6cd601ff4180 |
| `/MainTaskCell/lbl_name` | UILabelTTF | [72, 136] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「任务名称」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/MainTaskCell/spr_clock` | CCSprite | [327, 124] | [0.5, 0.5] | [24, 25] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/city/main-task_clock.png` 67e67634-ab38-4991-afe7-a61e46b4c888 |
| `/MainTaskCell/shadow` | CCLayerColor | [2, 5] | [0, 0] | [550, 148] | [1, 1] | 0 | **否** | cc.Graphics fill rgb[0, 0, 0] a100 |
| `/MainTaskCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MainTaskCell/menu/btn_get` | UIMenuItemImage | [445, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/MainTaskCell/menu/btn_jiasu` | UIMenuItemImage | [445, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/MainTaskCell/menu/btn_end` | UIMenuItemImage | [445, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/MainTaskCell/menu/btn_lock` | UIMenuItemImage | [514, 123] | [0.5, 0.5] | [20, 24] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/city/main-task_spr-lock.png` 1e8f4bce-717f-4a72-a2af-c41a8c31670e |
| `/MainTaskCell/menu/btn_unlock` | UIMenuItemImage | [514, 123] | [0.5, 0.5] | [20, 24] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/city/main-task_spr-unlock.png` e0732cde-9fdc-4b5f-abaf-93e738073f2d |
| `/MainTaskCell/time_node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MainTaskCell/time_node/spr_slider_bg` | CCSprite | [445, 100] | [0.5, 0.5] | [134, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-task_spr-xjdt2.png` 4202f3dc-6332-4ddf-891c-2f66071be400 |
| `/MainTaskCell/time_node/lbl_time` | UILabelTTF | [445, 100] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「12:00:00」32 STZhongsong.ttf rgb[254, 255, 255] |

## MainTaskChooseHeroLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MainTaskChooseHeroLayer` | MainTaskChooseHeroLayer | [0, 0] | [0, 0] | [640, 936] | [1, 1] | 0 | 是 |  |
| `/MainTaskChooseHeroLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 936] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MainTaskChooseHeroLayer/node_title` | CCNode | [320.0, 925.394] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MainTaskChooseHeroLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MainTaskChooseHeroLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「派遣英雄」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/MainTaskChooseHeroLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` | CCScale9Sprite | [462, 385] | [0.5, 0.5] | [140, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MainTaskChooseHeroLayer/CCNode_1/spr_need_bg` | CCSprite | [320, 254] | [0.5, 0.5] | [566, 233] | [1.025, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_k1.png` 8a6d8446-56b7-454e-b956-ab10decce786 |
| `/MainTaskChooseHeroLayer/CCNode_1/lbl_need` | UILabelTTF | [320, 225] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「需求条件」20 STZhongsong.ttf rgb[239, 117, 42] |
| `/MainTaskChooseHeroLayer/CCNode_1/CCSprite_1` | CCSprite | [485, 402] | [0.5, 0.5] | [24, 25] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-task_clock.png` 67e67634-ab38-4991-afe7-a61e46b4c888 |
| `/MainTaskChooseHeroLayer/CCNode_1/lbl_time` | UILabelTTF | [547, 400] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0:00:00」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` | CCScale9Sprite | [43, 385] | [0.5, 0.5] | [140, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MainTaskChooseHeroLayer/CCNode_1/show_image` | CCSprite | [57, 405] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900401.png` b9b3db44-eb8d-4a3a-ac32-edfce70b4891 |
| `/MainTaskChooseHeroLayer/CCNode_1/lbl_items_num` | UILabelTTF | [127, 400] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0:00:00」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/MainTaskChooseHeroLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [440.278, 222.889] | [0.5, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/MainTaskChooseHeroLayer/CCNode_1/CCScale9Sprite_2` | CCScale9Sprite | [199.639, 222.9] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/MainTaskChooseHeroLayer/spr_hero_bg` | CCScale9Sprite | [29, 435] | [0.5, 0.5] | [580, 368] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[60, 20, 20, 20] |
| `/MainTaskChooseHeroLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_close` | UIMenuItemImage | [579, 897] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_elem0` | UIMenuItemImage | [90, 767] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_elem1` | UIMenuItemImage | [181, 767] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_elem2` | UIMenuItemImage | [273, 767] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_elem3` | UIMenuItemImage | [365, 767] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_elem4` | UIMenuItemImage | [455, 767] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_elem5` | UIMenuItemImage | [541, 767] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_auto` | UIMenuItemLabel | [209, 79] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「」24 [255, 255, 255, 255] |
| `/MainTaskChooseHeroLayer/UIMenu_1/btn_start` | UIMenuItemLabel | [429, 79] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「」24 [255, 255, 255, 255] |
| `/MainTaskChooseHeroLayer/UILabelTTF_1` | UILabelTTF | [320.056, 711.778] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「长按英雄可查看英雄信息」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/MainTaskChooseHeroLayer/select_hero_scroll_view` | UIScrollViewBackpack | [320, 444.472] | [0.5, 0] | [580, 250] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## MainTaskLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MainTaskLayer` | MainTaskLayer | [0, 0] | [0, 0] | [622, 1000] | [1, 1] | 0 | 是 |  |
| `/MainTaskLayer/show_model` | CCNode | [133, 939] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MainTaskLayer/spr_bg` | CCScale9Sprite | [-7, 60] | [0.5, 0.5] | [637, 830] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MainTaskLayer/spr_list_bg` | CCScale9Sprite | [31, 163] | [0.5, 0.5] | [560, 530] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MainTaskLayer/CCSprite_1` | CCSprite | [312, 774] | [0.5, 0.5] | [562, 142] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-task_spr-banner.png` ba425430-fedc-487b-9e4e-a7aa1e1863ef |
| `/MainTaskLayer/node_title` | CCNode | [311.0, 881.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MainTaskLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MainTaskLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「咖啡馆」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/MainTaskLayer/show_log` | CCSprite | [375, 969] | [0.5, 0.5] | [299, 129] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-task-lang_spr-2.png` 8372b925-0ed8-4f4f-acaf-98e69f345334 |
| `/MainTaskLayer/spr_select_bg` | CCScale9Sprite | [33, 113] | [0.5, 0.5] | [120, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MainTaskLayer/node_view` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MainTaskLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MainTaskLayer/UIMenu_1/btn_info` | UIMenuItemImage | [554, 806] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/MainTaskLayer/UIMenu_1/btn_power` | UIMenuItemImage | [86, 745] | [0.5, 0.5] | [76, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-task-lang_spr-1.png` 28702078-e394-439d-aa4e-36629acad103 |
| `/MainTaskLayer/UIMenu_1/btn_close` | UIMenuItemImage | [589, 883] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/MainTaskLayer/UIMenu_1/btn_enter` | UIMenuItemImage | [312, 128] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/MainTaskLayer/UIMenu_1/btn_fast_gain` | UIMenuItemImage | [517, 128] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/MainTaskLayer/image_bg_icno` | CCSprite | [44, 132] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900402.png` a3ab4451-a9e0-4695-ab89-6a4fca162805 |
| `/MainTaskLayer/lbl_select_num` | UILabelTTF | [73, 128] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」44 STZhongsong.ttf rgb[254, 255, 255] |
| `/MainTaskLayer/time_muns` | CCSprite | [465, 726] | [0.5, 0.5] | [226, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-task_spr-jdt2.png` 91b14cd2-259b-4eac-a8e6-8bcadc933b16 |
| `/MainTaskLayer/times_image_bg` | CCSprite | [367, 732] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900401.png` b9b3db44-eb8d-4a3a-ac32-edfce70b4891 |

## MainTaskPowerLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MainTaskPowerLayer` | MainTaskPowerLayer | [0, 0] | [0, 0] | [300, 220] | [1, 1] | 0 | 是 |  |
| `/MainTaskPowerLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [300, 220] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[15, 15, 15, 15] |
| `/MainTaskPowerLayer/label_1` | UILabelTTF | [16, 190] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「jiuguan 」18 STZhongsong.ttf rgb[255, 191, 0] |
| `/MainTaskPowerLayer/label_2` | UILabelTTF | [16, 170] | [0, 1] | [270, 0] | [1, 1] | 0 | 是 | cc.Label「jiuguan 213234235234534444444」18 STZhongsong.ttf rgb[255, 229, 191] |
| `/MainTaskPowerLayer/label_3` | UILabelTTF | [16, 94] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「jiuguan 」18 STZhongsong.ttf rgb[255, 191, 0] |
| `/MainTaskPowerLayer/label_4` | UILabelTTF | [16, 75] | [0, 1] | [270, 0] | [1, 1] | 0 | 是 | cc.Label「jiuguan 」18 STZhongsong.ttf rgb[255, 229, 191] |

## MissionCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MissionCell` | MissionCell | [0, 0] | [0, 0] | [570, 120] | [1, 1] | 0 | 是 |  |
| `/MissionCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [570.0, 120.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[40, 40, 40, 40] |
| `/MissionCell/spr_ribbon` | CCSprite | [50, 97] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mission-cell-bg/mission-cell-bg_bg1.png` 6f3b8893-2d08-4618-9b91-4e743b250184 |
| `/MissionCell/lbl_title` | UILabelTTF | [20.685, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「地狱一」18 STZhongsong.ttf rgb[254, 255, 254] |
| `/MissionCell/spr_gem` | CCSprite | [459.8, 92.2] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/MissionCell/lbl_num` | UILabelTTF | [497.885, 92.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「50」25 STZhongsong.ttf rgb[152, 109, 85] |
| `/MissionCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MissionCell/menu/btn_battle` | UIMenuItemLabel | [484.6, 48] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「」40 [255, 255, 255, 255] |
| `/MissionCell/spr_ribbon2` | CCSprite | [550.071, 98] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** shop/spr-type-2.png |
| `/MissionCell/lbl_battle` | UILabelTTF | [483.685, 91] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」18 STZhongsong.ttf rgb[209, 124, 76] |

## MissionLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MissionLayer` | MissionLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/MissionLayer/spr_bg` | CCSprite | [0.0, 960.0] | [0, 1] | [648, 1152] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-mission-1.jpg` 2de46307-6f48-4be7-ae7f-d6f629aef140 |
| `/MissionLayer/node_title` | CCNode | [320.0, 960.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MissionLayer/node_title/CCSprite_1` | CCSprite | [0, -162] | [0.5, 0.5] | [274, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/slzm/slzm_slzmtitlek.png` 2ee8ea1d-c220-45a9-ae91-d7c139ceb7fc |
| `/MissionLayer/node_title/UILabelTTF_1` | UILabelTTF | [0, -161] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「日常副本」64 STZhongsong.ttf rgbNone |
| `/MissionLayer/node_content` | CCNode | [0.0, 629.0] | [0, 1] | [640.0, 700] | [1, 1] | 0 | 是 |  |
| `/MissionLayer/node_content/content_bg` | CCScale9Sprite | [0.0, -700] | [0.5, 0.5] | [640.0, 700.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MissionLayer/node_content/spr_banner` | CCSprite | [320.0, -35] | [0.5, 1] | [562, 142] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mission-cell-bg-lang/mission-cell-bg-lang_banner-1.png` ab28ecd0-ef4c-4f14-9710-4764dcd19d70 |
| `/MissionLayer/node_content/lbl_num` | UILabelTTF | [551.0, -198.0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2」40 STZhongsong.ttf rgb[134, 90, 68] |
| `/MissionLayer/node_content/scroll_view_bg` | CCScale9Sprite | [320.0, -652.0] | [0.5, 0] | [569.6, 430] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[8, 8, 8, 8] |
| `/MissionLayer/node_content/scroll_view` | CCScrollView | [321.0, -647.0] | [0.5, 0] | [569.6, 450] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/MissionLayer/spr_bar_bg` | CCScale9Sprite | [320.0, 682.0] | [0.5, 0.5] | [592.0, 92] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mission-cell-bg/mission-cell-bg_bar_bg.png` f30be624-18cf-43dd-825f-a60e26648a60 |
| `/MissionLayer/menu` | UIMenu | [0.0, 0.0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/MissionLayer/menu/btn_info` | UIMenuItemImage | [577.0, 429.0] | [0.5, 0.5] | [42, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-4.png` 0644c42c-a1fe-4ba0-aabe-527bb357f8d5 |
| `/MissionLayer/menu/btn_close` | UIMenuItemImage | [554.0, 810.0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/MissionLayer/menu/btn_gold` | UIMenuItemTab | [95.0, 611.368] | [0.5, 0.5] | [110, 110] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/mission-cell-bg-lang/mission-cell-bg-lang_icon-1.png` 35e4b4cb-8ff4-44f6-b113-23c72d0fa1af |
| `/MissionLayer/menu/btn_exp` | UIMenuItemTab | [206.0, 611.368] | [0.5, 0.5] | [110, 110] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/mission-cell-bg-lang/mission-cell-bg-lang_icon-2.png` 0036cf07-29d1-412b-9948-5432ad5cbfbc |
| `/MissionLayer/menu/btn_hero` | UIMenuItemTab | [320.0, 611.368] | [0.5, 0.5] | [110, 110] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/mission-cell-bg-lang/mission-cell-bg-lang_icon-3.png` c9d3444f-4506-40f4-bf8b-51704f2dbc90 |
| `/MissionLayer/menu/btn_fetter` | UIMenuItemTab | [434.0, 611.368] | [0.5, 0.5] | [110, 110] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/mission-cell-bg-lang/mission-cell-bg-lang_icon-4.png` 29d34e5d-0131-4ffd-878a-43d2b323e746 |
| `/MissionLayer/menu/btn_runes` | UIMenuItemTab | [548.0, 611.368] | [0.5, 0.5] | [110, 110] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/mission-cell-bg-lang/mission-cell-bg-lang_icon-5.png` d4af0244-2ef9-403c-be0c-8e0eaca76ff3 |

## MissionRewardInfoCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MissionRewardInfoCell` | MissionRewardInfoCell | [0, 0] | [0, 0] | [480, 150] | [1, 1] | 0 | 是 |  |
| `/MissionRewardInfoCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [480, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-paimingk-1.png` da39b30c-711a-4b1f-9916-8d6f44421495 insets[10, 10, 10, 10] |
| `/MissionRewardInfoCell/spr_rank` | CCSprite | [100, 130] | [0.5, 0.5] | [204, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-cell-title.png` 9f3ea337-44da-41cb-8331-164e9a6a6ad2 |
| `/MissionRewardInfoCell/lbl_title` | UILabelTTF | [95, 135] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「关卡6-7」56 STZhongsong.ttf rgb[255, 227, 183] |

## MissionRewardInfoLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MissionRewardInfoLayer` | MissionRewardInfoLayer | [0, 0] | [0, 0] | [560, 700] | [1, 1] | 0 | 是 |  |
| `/MissionRewardInfoLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [580, 720] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MissionRewardInfoLayer/node_title` | CCNode | [280.0, 700.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MissionRewardInfoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MissionRewardInfoLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「掉落信息」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/MissionRewardInfoLayer/spr_scroll_bg` | CCScale9Sprite | [30, 30] | [0.5, 0.5] | [500, 500] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MissionRewardInfoLayer/scroll_view` | UIScrollViewBackpack | [280, 35] | [0.5, 0] | [480, 490] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/MissionRewardInfoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MissionRewardInfoLayer/CCMenu_1/btn_close` | UIMenuItemImage | [520, 675] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/MissionRewardInfoLayer/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MissionRewardInfoLayer/CCMenu_2/btn_right` | UIMenuItemTab | [274, 565] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-7.png` 8a3c8429-0946-4341-8fe0-bc3c6237a448 pressed `ui/common/button_btn-tab-8.png` aac0291d-cbbf-48cb-9486-944e18e9e5cd · Label「挂机掉落」40 [255, 255, 255, 255] |
| `/MissionRewardInfoLayer/CCMenu_2/btn_left` | UIMenuItemTab | [286, 565] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「BOSS掉落」40 [255, 255, 255, 255] |

## MissionRewardLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MissionRewardLayer` | MissionRewardLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MissionRewardLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 960] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MissionRewardLayer/node_title` | CCNode | [320.0, 951.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MissionRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MissionRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「通关奖励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/MissionRewardLayer/spr_box` | CCScale9Sprite | [30, 60] | [0.5, 0.5] | [580, 770] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/MissionRewardLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MissionRewardLayer/UIMenu_1/btn_close` | UIMenuItemImage | [595, 924] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## PassChapterTipsLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PassChapterTipsLayer` | PassChapterTipsLayer | [0, 0] | [0, 0] | [640, 300] | [1, 1] | 0 | 是 |  |
| `/PassChapterTipsLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, -1] | [0.5, 0.5] | [640, 300] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/PassChapterTipsLayer/spr_icon1` | CCSprite | [115, 76] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900004.png` ce7adb27-3c94-4c6b-8558-5fa1958be976 |
| `/PassChapterTipsLayer/spr_icon3` | CCSprite | [115, 170] | [0.5, 0.5] | [100, 100] | [0.44, 0.44] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/PassChapterTipsLayer/spr_icon2` | CCSprite | [115, 124] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900003.png` 92622b20-5a2e-45d4-aec7-e4c8f091bd11 |
| `/PassChapterTipsLayer/lbl_tips1` | UILabelTTF | [155, 76] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下一关卡名字」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/PassChapterTipsLayer/lbl_pre1` | UILabelTTF | [323, 76] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1300」24 STZhongsong.ttf rgb[251, 235, 173] |
| `/PassChapterTipsLayer/lbl_tips2` | UILabelTTF | [155, 124] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下一关卡名字」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/PassChapterTipsLayer/lbl_tips3` | UILabelTTF | [155, 170] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下一关卡名字」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/PassChapterTipsLayer/lbl_pre2` | UILabelTTF | [323, 124] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1300」24 STZhongsong.ttf rgb[251, 235, 173] |
| `/PassChapterTipsLayer/lbl_pre3` | UILabelTTF | [323, 170] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1300」24 STZhongsong.ttf rgb[251, 235, 173] |
| `/PassChapterTipsLayer/CCSprite_1` | CCSprite | [361, 76] | [0.5, 0.5] | [32, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-arrow.png` 46b71f80-6dba-4896-a4c2-29b60b112b96 |
| `/PassChapterTipsLayer/CCSprite_2` | CCSprite | [361, 124] | [0.5, 0.5] | [32, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-arrow.png` 46b71f80-6dba-4896-a4c2-29b60b112b96 |
| `/PassChapterTipsLayer/CCSprite_3` | CCSprite | [361, 170] | [0.5, 0.5] | [32, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-arrow.png` 46b71f80-6dba-4896-a4c2-29b60b112b96 |
| `/PassChapterTipsLayer/lbl_cur2` | UILabelTTF | [400, 124] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1300」24 STZhongsong.ttf rgb[251, 235, 173] |
| `/PassChapterTipsLayer/lbl_cur3` | UILabelTTF | [400, 170] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1300」24 STZhongsong.ttf rgb[251, 235, 173] |
| `/PassChapterTipsLayer/lbl_cur1` | UILabelTTF | [400, 76] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1300」24 STZhongsong.ttf rgb[251, 235, 173] |
| `/PassChapterTipsLayer/CCSprite_4` | CCSprite | [320, 224] | [0.5, 0.5] | [127, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-profit-1.png` 083ef7bd-624e-4193-a0ae-7af29b888c0e |

## QuickBattleEndLayer（41）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/QuickBattleEndLayer` | QuickBattleEndLayer | [0, 0] | [0, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/spr_bg` | CCScale9Sprite | [0, -12] | [0.5, 0.5] | [640, 650] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[80, 80, 100, 100] |
| `/QuickBattleEndLayer/node_role` | CCNode | [320, 522] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_role/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [510, 90] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[10, 10, 20, 20] |
| `/QuickBattleEndLayer/node_role/spr_photo` | CCSprite | [-150, 0] | [0.5, 0.5] | [120, 120] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_34.png` 3ae48fe0-7ff6-4f6c-9116-73b0a505bce1 |
| `/QuickBattleEndLayer/node_role/spr_frame` | CCSprite | [-150, 0] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005004.png` 96bf34ee-e46d-4b5c-91e5-549286901a44 |
| `/QuickBattleEndLayer/node_role/lbl_level` | UILabelTTF | [-110, 15] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「Lv.20」44 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/node_role/role_exp` | CCScale9Sprite | [40, -15] | [0.5, 0.5] | [300, 24] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-jdt1.png` 0b14d126-1bca-41fe-b9ed-7700f0e0f357 insets[0, 0, 10, 10] |
| `/QuickBattleEndLayer/node_role/lbl_role_exp_num` | UILabelTTF | [40, -15] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Lv 1」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/QuickBattleEndLayer/node_time` | CCNode | [320, 420] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_time/spr_clock` | CCSprite | [-120, 0] | [0.5, 0.5] | [38, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-clock.png` 97dc7111-d32b-45b8-bb9a-c57a50911d5d |
| `/QuickBattleEndLayer/node_time/lbl_time_tip` | UILabelTTF | [-90, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「快速作战时间:」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/QuickBattleEndLayer/node_time/lbl_time` | UILabelTTF | [50, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「02: 00: 00」40 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/node_get_reward_tip` | CCNode | [320, 370] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_get_reward_tip/CCSprite_1` | CCSprite | [60, 0] | [0, 0.5] | [342, 5] | [0.5, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e |
| `/QuickBattleEndLayer/node_get_reward_tip/CCSprite_2` | CCSprite | [-60, 0] | [0, 0.5] | [342, 5] | [-0.5, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e |
| `/QuickBattleEndLayer/node_get_reward_tip/CCSprite_3` | CCSprite | [0, 0] | [0.5, 0.5] | [112, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_lbl-get-reward.png` 85590be5-d46b-47de-bc7a-49947654cf62 |
| `/QuickBattleEndLayer/node_res_1` | CCNode | [320, 320] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_res_1/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [420, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/QuickBattleEndLayer/node_res_1/spr_amount` | CCSprite | [210, 0] | [0.5, 0.5] | [87, 69] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_spr-amount.png` 2ec25d95-ef69-4a6d-b880-6037609c2b0d |
| `/QuickBattleEndLayer/node_res_1/spr_res_1` | CCSprite | [-160, 0] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900003.png` 92622b20-5a2e-45d4-aec7-e4c8f091bd11 |
| `/QuickBattleEndLayer/node_res_1/lbl_res_name_1` | UILabelTTF | [-140, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「角色经验:」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/QuickBattleEndLayer/node_res_1/lbl_res_num_1` | UILabelTTF | [160, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/node_res_2` | CCNode | [320, 280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_res_2/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [420, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/QuickBattleEndLayer/node_res_2/spr_res_2` | CCSprite | [-160, 0] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900101.png` bc998bee-4638-4a64-a7f0-1249cd4b4d19 |
| `/QuickBattleEndLayer/node_res_2/lbl_res_name_2` | UILabelTTF | [-140, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄经验:」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/QuickBattleEndLayer/node_res_2/lbl_res_num_2` | UILabelTTF | [160, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/node_res_3` | CCNode | [320, 240] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_res_3/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [420, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/QuickBattleEndLayer/node_res_3/spr_res_3` | CCSprite | [-160, 0] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900102.png` 0aa99264-c493-4fba-b1c2-ea9e623dd56e |
| `/QuickBattleEndLayer/node_res_3/lbl_res_name_3` | UILabelTTF | [-140, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄进阶石:」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/QuickBattleEndLayer/node_res_3/lbl_res_num_3` | UILabelTTF | [160, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/scroll_view` | UIScrollViewBackpack | [70, 20] | [0, 0] | [500, 180] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/QuickBattleEndLayer/node_tip` | CCNode | [320, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_tip/spr_tip_line_right` | CCSprite | [120, -25] | [0, 0.5] | [342, 5] | [0.5, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e |
| `/QuickBattleEndLayer/node_tip/spr_tip_line_left` | CCSprite | [-120, -25] | [0, 0.5] | [342, 5] | [-0.5, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e |
| `/QuickBattleEndLayer/node_tip/lbl_tip_1` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「VIP可获得额外收益加成」40 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/node_tip/lbl_tip_2` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「离线也可获得收益」40 STZhongsong.ttf rgb[255, 244, 174] |
| `/QuickBattleEndLayer/node_tip/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/QuickBattleEndLayer/node_tip/UIMenu_1/btn_confirm` | UIMenuItemLabel | [0, -100] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「确 定」48 [255, 250, 185, 255] |

## QuickBattleLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/QuickBattleLayer` | QuickBattleLayer | [0, 0] | [0, 0] | [620, 640] | [1, 1] | 0 | 是 |  |
| `/QuickBattleLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 660] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/QuickBattleLayer/CCScale9Sprite_2` | CCScale9Sprite | [309, 630] | [0.5, 0.5] | [344, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-2.png` c7f43d22-d8a0-493c-88c2-17192ea937bd |
| `/QuickBattleLayer/spr_title` | CCSprite | [310, 632] | [0.5, 0.5] | [184, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-quick-lang_lbl-privilege.png` e1a50c1b-4341-43e5-b666-d3010f82ab04 |
| `/QuickBattleLayer/spr_banner` | CCSprite | [310, 475] | [0.5, 0.5] | [543, 219] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-quick-lang_spr-banner.png` f567e091-f7c5-4b43-8d13-05a073d32175 |
| `/QuickBattleLayer/spr_levelup_need` | CCSprite | [60, 630] | [0.5, 0.5] | [298, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-quick-lang_spr-levelup-need.png` fc32e254-d306-4ad6-bcb5-2c17187638cd |
| `/QuickBattleLayer/spr_activate` | CCSprite | [525, 390] | [0.5, 0.5] | [108, 92] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-quick-lang_spr-activate.png` 35d340d7-3de5-4f81-a956-e468d7890897 |
| `/QuickBattleLayer/CCScale9Sprite_3` | CCScale9Sprite | [40, 125] | [0.5, 0.5] | [540, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/QuickBattleLayer/scrollView` | CCScrollView | [40, 125] | [0, 0] | [540, 200] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/QuickBattleLayer/UILabelTTF_1` | UILabelTTF | [310, 345] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「关卡掉落」22 STZhongsong.ttf rgb[131, 98, 69] |
| `/QuickBattleLayer/CCScale9Sprite_4` | CCScale9Sprite | [370, 345] | [0.5, 0.5] | [130, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-3.png` b88f88ed-6f42-4c03-bba5-e33992630450 |
| `/QuickBattleLayer/CCScale9Sprite_5` | CCScale9Sprite | [250, 345] | [0.5, 0.5] | [130, 2] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-3.png` b88f88ed-6f42-4c03-bba5-e33992630450 |
| `/QuickBattleLayer/spr_tip` | CCSprite | [310, 105] | [0.5, 0.5] | [467, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-quick-lang_lbl-tip.png` 57af28c0-3ef5-4062-ae22-2e3697f24ead |
| `/QuickBattleLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/QuickBattleLayer/UIMenu_1/btn_close` | UIMenuItemImage | [556, 614] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/QuickBattleLayer/UIMenu_1/btn_quick` | UIMenuItemLabel | [310, 55] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」24 [255, 255, 255, 255] |
| `/QuickBattleLayer/UIMenu_1/btn_jump` | UIMenuItemImage | [525, 390] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/QuickBattleLayer/UIMenu_1/btn_info` | UIMenuItemImage | [560, 565] | [0.5, 0.5] | [60, 61] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/QuickBattleLayer/lbl_tip_1` | UILabelTTF | [180, -25] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「20级」44 STZhongsong.ttf rgb[253, 180, 56] |
| `/QuickBattleLayer/lbl_tip_2` | UILabelTTF | [185, -25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「后使用快速战斗收益最大」44 STZhongsong.ttf rgb[85, 217, 255] |
| `/QuickBattleLayer/spr_suggest` | CCSprite | [435, -27] | [0, 0.5] | [48, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-quick-lang_spr-suggest.png` 395f029c-f6ad-4086-8922-b7d9ff585859 |

## QuickBattleTipLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/QuickBattleTipLayer` | QuickBattleTipLayer | [0, 0] | [0, 0] | [420, 320] | [1, 1] | 0 | 是 |  |
| `/QuickBattleTipLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [420, 320] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[10, 10, 10, 10] |
| `/QuickBattleTipLayer/node_title` | CCNode | [210.0, 320.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/QuickBattleTipLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/QuickBattleTipLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「提 示」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/QuickBattleTipLayer/CCScale9Sprite_1` | CCScale9Sprite | [210, 165] | [0.5, 0.5] | [372, 164] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/QuickBattleTipLayer/scroll_view` | UIScrollViewBackpack | [25, 85] | [0, 0] | [370, 160] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/QuickBattleTipLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/QuickBattleTipLayer/menu/btn_close` | UIMenuItemImage | [385, 298] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/QuickBattleTipLayer/menu/btn_confirm` | UIMenuItemLabel | [110, 50] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「使 用」48 [255, 255, 255, 255] |
| `/QuickBattleTipLayer/menu/btn_cancel` | UIMenuItemLabel | [310, 50] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 pressed `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「取 消」48 [100, 50, 0, 255] |

## StrategyLayer（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/StrategyLayer` | StrategyLayer | [0, 0] | [0, 0] | [486, 726] | [1, 1] | 0 | 是 |  |
| `/StrategyLayer/CCSprite_1` | CCSprite | [0, 0] | [0, 0] | [486, 726] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-strategy-1.png` 71b6d496-be6d-4505-a330-a944883488a4 |
| `/StrategyLayer/CCSprite_2` | CCSprite | [243, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/StrategyLayer/scroll_view` | CCScrollView | [50, 62] | [0, 0] | [386, 600] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
