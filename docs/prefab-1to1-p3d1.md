# P3-d 超级舞台（上） Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| SuperStageAccountLayer | `prefabs/ui/super-stage/SuperStageAccountLayer.prefab` | 52 |
| SuperStageBattleEndLayer | `prefabs/ui/super-stage/SuperStageBattleEndLayer.prefab` | 34 |
| SuperStageBattleInfoCell | `prefabs/ui/super-stage/SuperStageBattleInfoCell.prefab` | 55 |
| SuperStageHistoryCell | `prefabs/ui/super-stage/SuperStageHistoryCell.prefab` | 39 |
| SuperStageHistoryLayer | `prefabs/ui/super-stage/SuperStageHistoryLayer.prefab` | 14 |
| SuperStageHistoryVideoLayer | `prefabs/ui/super-stage/SuperStageHistoryVideoLayer.prefab` | 9 |
| SuperStageLegendLayer | `prefabs/ui/super-stage/SuperStageLegendLayer.prefab` | 12 |
| SuperStageLegendSeat | `prefabs/ui/super-stage/SuperStageLegendSeat.prefab` | 10 |
| SuperStageMainLadderLayer | `prefabs/ui/super-stage/SuperStageMainLadderLayer.prefab` | 38 |
| SuperStageMainLadderSeat | `prefabs/ui/super-stage/SuperStageMainLadderSeat.prefab` | 10 |
| SuperStageMainLayer | `prefabs/ui/super-stage/SuperStageMainLayer.prefab` | 10 |
| SuperStageMainRegularLayer | `prefabs/ui/super-stage/SuperStageMainRegularLayer.prefab` | 51 |
| SuperStageMainTopLayer | `prefabs/ui/super-stage/SuperStageMainTopLayer.prefab` | 56 |
| SuperStageMatchLayer | `prefabs/ui/super-stage/SuperStageMatchLayer.prefab` | 136 |
| SuperStageRankCell | `prefabs/ui/super-stage/SuperStageRankCell.prefab` | 19 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/misc/super-stage_spr-pattern-1.png` | [9, 9, 10, 10] |
| `ui/misc/super-stage_block-2.png` | [15, 15, 15, 15] |
| `ui/misc/super-stage_block-1.png` | [15, 15, 30, 30] |
| `ui/championship/championship_spr-bg-6.png` | [1, 1, 1, 0] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/maps/map-bg-result-1.png` → P3A
- `ui/misc/dungeon_spr-reward-cell-bg.png` → P3A
- `ui/misc/super-stage_block-3.png` → P3B1
- `ui/compare-share/compare-share_spr-line.png` → P3C

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageAccountLayer:/SuperStageAccountLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageHistoryLayer:/SuperStageHistoryLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageHistoryVideoLayer:/SuperStageHistoryVideoLayer/CCScale9Sprite_1` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `SuperStageBattleEndLayer:/SuperStageBattleEndLayer/CCScale9Sprite_1` |

## SuperStageAccountLayer（52）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageAccountLayer` | SuperStageAccountLayer | [0, 0] | [0, 0] | [620, 748] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 768] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageAccountLayer/node_title` | CCNode | [310.0, 748.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageAccountLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「个人战绩」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/SuperStageAccountLayer/CCMenu_1` | CCMenu | [310, 605] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/CCMenu_1/btn_tab_2` | UIMenuItemTab | [70, 0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「赛季战绩」40 [122, 71, 45, 255] |
| `/SuperStageAccountLayer/CCMenu_1/btn_tab_1` | UIMenuItemTab | [-70, 0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「总战绩」40 [122, 71, 45, 255] |
| `/SuperStageAccountLayer/spr_rank_bg` | CCScale9Sprite | [30, 120] | [0.5, 0.5] | [560, 490] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageAccountLayer/CCScale9Sprite_1` | CCScale9Sprite | [310, 570] | [0.5, 0.5] | [230, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-3.png` 40f0127f-a83e-453c-b858-6739f7a0c534 insets[15, 15, 15, 15] |
| `/SuperStageAccountLayer/CCScale9Sprite_2` | CCScale9Sprite | [310, 500] | [0.5, 0.5] | [560, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-3.png` 40f0127f-a83e-453c-b858-6739f7a0c534 insets[15, 15, 15, 15] |
| `/SuperStageAccountLayer/CCScale9Sprite_3` | CCScale9Sprite | [310, 420] | [0.5, 0.5] | [560, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-3.png` 40f0127f-a83e-453c-b858-6739f7a0c534 insets[15, 15, 15, 15] |
| `/SuperStageAccountLayer/CCScale9Sprite_4` | CCScale9Sprite | [310, 340] | [0.5, 0.5] | [560, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-3.png` 40f0127f-a83e-453c-b858-6739f7a0c534 insets[15, 15, 15, 15] |
| `/SuperStageAccountLayer/CCSprite_1` | CCSprite | [310, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/SuperStageAccountLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/menu/btn_close` | UIMenuItemImage | [555, 723] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageAccountLayer/menu/btn_share` | UIMenuItemLabel | [310, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「分 享」48 [255, 255, 255, 255] |
| `/SuperStageAccountLayer/lbl_stage` | UILabelTTF | [310, 568] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「第S7赛季」48 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/UILabelTTF_1` | UILabelTTF | [45, 500] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前段位:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_cur_rank` | UILabelTTF | [147, 500] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_2` | UILabelTTF | [45, 460] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「历史最高段位:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_top_rank` | UILabelTTF | [195, 460] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_3` | UILabelTTF | [350, 500] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前积分:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_cur_score` | UILabelTTF | [460, 500] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_4` | UILabelTTF | [350, 460] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「历史最高积分:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_top_score` | UILabelTTF | [505, 460] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_5` | UILabelTTF | [45, 420] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「常规赛胜场:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_win_num` | UILabelTTF | [170, 420] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_6` | UILabelTTF | [45, 380] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「常规赛胜率:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_win_rate` | UILabelTTF | [170, 380] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_7` | UILabelTTF | [45, 340] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「单场最高伤害:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_top_damage` | UILabelTTF | [190, 340] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/UILabelTTF_8` | UILabelTTF | [350, 340] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「最大连胜场数:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_top_win_num` | UILabelTTF | [495, 340] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[230, 131, 15] |
| `/SuperStageAccountLayer/lbl_hero_num` | UILabelTTF | [45, 300] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「mvp次数最多英雄:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_hero_name` | UILabelTTF | [145, 145] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_mvp_hero_tip` | UILabelTTF | [145, 215] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/UILabelTTF_9` | UILabelTTF | [350, 300] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「最强对手:」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/lbl_strongest_player_tip` | UILabelTTF | [475, 215] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/node_player_info` | CCNode | [590, 215] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/node_player_info/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [1, 0.5] | [224, 60] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-3.png` 40f0127f-a83e-453c-b858-6739f7a0c534 insets[15, 15, 15, 15] |
| `/SuperStageAccountLayer/node_player_info/spr_photo` | CCSprite | [-220, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageAccountLayer/node_player_info/spr_border` | CCSprite | [-220, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageAccountLayer/node_player_info/CCSprite_1` | CCSprite | [-220, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/SuperStageAccountLayer/node_player_info/lbl_level` | UILabelTTF | [-220, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageAccountLayer/node_player_info/lbl_player_name` | UILabelTTF | [-140, -70] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我是罗素」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/node_player_info/CCSprite_2` | CCSprite | [-165, 0] | [0.5, 0.5] | [42, 40] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_attack-1.png` a6a402a5-7abc-456d-8873-1542a96c0a0b |
| `/SuperStageAccountLayer/node_player_info/lbl_player_attack` | UILabelTTF | [-145, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「122345」40 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageAccountLayer/node_mvp_hero` | CCNode | [145, 215] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageAccountLayer/CCMenu_2/btn_left` | UIMenuItemImage | [195, 570] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-left.png` 96904555-954d-4de1-95f2-934005454836 |
| `/SuperStageAccountLayer/CCMenu_2/btn_right` | UIMenuItemImage | [415, 570] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-right.png` f8d85868-eef4-40db-a038-e9508daa8b85 |

## SuperStageBattleEndLayer（34）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageBattleEndLayer` | SuperStageBattleEndLayer | [0, 0] | [0, 0] | [640, 680] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleEndLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 32] | [0.5, 0.5] | [640, 586] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[130, 130, 0, 0] |
| `/SuperStageBattleEndLayer/spr_stage_icon` | CCSprite | [320, 406] | [0.5, 0.5] | [295, 334] | [0.62, 0.62] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-1-1.png` 9b1af1cc-b927-42bb-ab83-295cfac28d19 |
| `/SuperStageBattleEndLayer/spr_stage_icon/CCSprite_1` | CCSprite | [-0.5, -117.0] | [0.5, 0.5] | [188, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-stage-name-bg-1-1.png` c498d95d-3db5-41db-8a05-0e2948defef4 |
| `/SuperStageBattleEndLayer/spr_stage_icon/lbl_stage_name` | UILabelTTF | [-0.5, -117.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」48 CloudYuanCuGBK.ttf rgb[251, 245, 228] |
| `/SuperStageBattleEndLayer/spr_wing` | CCSprite | [320, 575] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/SuperStageBattleEndLayer/spr_result` | CCSprite | [320, 545] | [0.5, 0.5] | [297, 119] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-lang_lbl-challenge-2.png` 734cab49-50b1-4de5-bad9-cc4c87bfdfaa |
| `/SuperStageBattleEndLayer/CCSprite_1` | CCSprite | [320, 16] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/SuperStageBattleEndLayer/delta_stage_node` | CCNode | [320, 400] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_pre_stage_icon` | CCSprite | [-147, 7.802] | [0.5, 0.5] | [295, 334] | [0.62, 0.62] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-1-1.png` 9b1af1cc-b927-42bb-ab83-295cfac28d19 |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_pre_stage_icon/spr_old_stage_name_bg` | CCSprite | [-0.5, -117.0] | [0.5, 0.5] | [188, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-stage-name-bg-1-1.png` c498d95d-3db5-41db-8a05-0e2948defef4 |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_pre_stage_icon/lbl_old_stage_name` | UILabelTTF | [-0.5, -117.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」48 CloudYuanCuGBK.ttf rgb[251, 245, 228] |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_next_stage_icon` | CCSprite | [147, 7.802] | [0.5, 0.5] | [295, 334] | [0.62, 0.62] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-1-1.png` 9b1af1cc-b927-42bb-ab83-295cfac28d19 |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_next_stage_icon/spr_new_stage_name_bg` | CCSprite | [-0.5, -117.0] | [0.5, 0.5] | [188, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-stage-name-bg-1-1.png` c498d95d-3db5-41db-8a05-0e2948defef4 |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_next_stage_icon/lbl_new_stage_name` | UILabelTTF | [-0.5, -117.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」48 CloudYuanCuGBK.ttf rgb[251, 245, 228] |
| `/SuperStageBattleEndLayer/delta_stage_node/spr_arrow` | CCSprite | [-0.0, -23.885] | [0.5, 0.5] | [36, 30] | [1.5, 1.5] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-arrow.png` b0c177d8-d910-4666-b569-781172bfc596 |
| `/SuperStageBattleEndLayer/normal_detal_layout` | CCNode | [320, 234] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleEndLayer/normal_detal_layout/CCScale9Sprite_1` | CCScale9Sprite | [-255, -60] | [0.5, 0.5] | [510, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/SuperStageBattleEndLayer/normal_detal_layout/spr_progress_node` | CCNode | [-0.0, 38.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleEndLayer/normal_detal_layout/spr_progress_node/spr_progress_bg` | CCSprite | [0, -2] | [0.5, 0.5] | [229, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_progress-bg.png` 08a3142d-2779-493d-b2f3-590adcf1efb4 |
| `/SuperStageBattleEndLayer/normal_detal_layout/pregress_label` | UILabelTTF | [0, 39] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1/1」36 CloudYuanCuGBK.ttf rgb[255, 206, 170] |
| `/SuperStageBattleEndLayer/normal_detal_layout/UILabelTTF_1` | UILabelTTF | [-102, -2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「段位经验：」22 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/SuperStageBattleEndLayer/normal_detal_layout/exp_label` | UILabelTTF | [-47.5, -2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/SuperStageBattleEndLayer/normal_detal_layout/exp_delta_label` | UILabelTTF | [96, -2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「不变」22 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/SuperStageBattleEndLayer/normal_detal_layout/UILabelTTF_2` | UILabelTTF | [-102, -36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「精英积分：」22 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/SuperStageBattleEndLayer/normal_detal_layout/point_label` | UILabelTTF | [-47, -36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/SuperStageBattleEndLayer/normal_detal_layout/point_delta_label` | UILabelTTF | [96, -36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「不变」22 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/SuperStageBattleEndLayer/normal_detal_layout/exp_tab_icon` | CCSprite | [30, 2] | [0.5, 0.5] | [18, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_up.png` 35d895d5-5beb-4e9e-b587-4ec28aadd706 |
| `/SuperStageBattleEndLayer/normal_detal_layout/point_tab_icon` | CCSprite | [30, -38] | [0.5, 0.5] | [18, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_down.png` 3a5a2697-39e3-4136-af19-f62080543b08 |
| `/SuperStageBattleEndLayer/upstage_node` | CCNode | [320, 235] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/SuperStageBattleEndLayer/upstage_node/CCSprite_1` | CCSprite | [0, -55] | [0.5, 0.5] | [622, 4] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/SuperStageBattleEndLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleEndLayer/menu/btn_report` | CCMenuItemImage | [581, 519] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/SuperStageBattleEndLayer/lbl_hdwp` | UILabelTTF | [320, 149] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得物品」40 CloudYuanCuGBK.ttf rgb[255, 233, 149] |

## SuperStageBattleInfoCell（55）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageBattleInfoCell` | SuperStageBattleInfoCell | [0, 0] | [0, 0] | [600, 622] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1` | CCNode | [300.0, 313.006] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/CCSprite_1` | CCSprite | [-137, 20] | [0.5, 0.5] | [352, 580] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_bg-blue.png` 4e182d7c-fd54-465a-82b8-4eb1e5d1d52a |
| `/SuperStageBattleInfoCell/CCNode_1/CCSprite_2` | CCSprite | [140, -22] | [0.5, 0.5] | [359, 580] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_bg-red.png` 87a9eca1-94e0-418b-a508-c86998172d76 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_head_1` | CCNode | [-229.0, 257.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_power_1` | CCNode | [-124, 228] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_power_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_power_1/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_power_1/lbl_power_1` | CCLabelBMFont | [-30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/lbl_name_1` | UILabelTTF | [-188, 267.52] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/spr_win1` | CCSprite | [-284, 287] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_8` | CCSprite | [-252.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_7` | CCSprite | [-252.0, 41.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_6` | CCSprite | [-252.0, -47.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_5` | CCSprite | [-252.0, -135.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_4` | CCSprite | [-161.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_3` | CCSprite | [-161, 41] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_2` | CCSprite | [-161, -47] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_1` | CCSprite | [-161.0, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/spr_matrix_1` | CCSprite | [-44.0, 133.0] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_skill_1` | CCNode | [-174.0, -232.0] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_1` | CCSprite | [-120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_2` | CCSprite | [-40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_3` | CCSprite | [40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_4` | CCSprite | [120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_head_2` | CCNode | [58.0, -246.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_power_2` | CCNode | [163.0, -277.0] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_power_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_power_2/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_power_2/lbl_power_2` | CCLabelBMFont | [-30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/lbl_name_2` | UILabelTTF | [98.0, -237.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/spr_win2` | CCSprite | [284, -285.0] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_8` | CCSprite | [250.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_7` | CCSprite | [250.0, 41.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_6` | CCSprite | [250.0, -47.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_5` | CCSprite | [250.0, -135.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_4` | CCSprite | [159.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_3` | CCSprite | [159, 41] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_2` | CCSprite | [159, -47] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_1` | CCSprite | [159.0, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/spr_matrix_2` | CCSprite | [44, -138.0] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_skill_2` | CCNode | [174, 232] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_1` | CCSprite | [-120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_2` | CCSprite | [-40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_3` | CCSprite | [40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_4` | CCSprite | [120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/SuperStageBattleInfoCell/node_vs` | CCNode | [300.0, 313.006] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/node_vs/spr_magic` | CCSprite | [0, 0] | [0.5, 0.5] | [160, 160] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-gvg_spr-magic.png` be3e13ac-9db9-401a-bed0-50bf36e2fe5c |
| `/SuperStageBattleInfoCell/node_vs/spr_vs` | CCSprite | [0, 0] | [0.5, 0.5] | [78, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/SuperStageBattleInfoCell/menu_report` | UIMenu | [300.0, 321.032] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageBattleInfoCell/menu_report/btn_report` | UIMenuItemImage | [0, -11] | [0.5, 0.5] | [78, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-4.png` c2b18986-8b91-4490-9768-99ca36e7f2cc |

## SuperStageHistoryCell（39）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageHistoryCell` | SuperStageHistoryCell | [0, 0] | [0, 0] | [560, 280] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/CCScale9Sprite_1` | CCScale9Sprite | [280.0, 140.0] | [0.5, 0.5] | [540, 270] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-panel-bg.png` 82b6aaa4-0420-4e7b-a5e4-52e585f65f7d |
| `/SuperStageHistoryCell/CCNode_1` | CCNode | [57.96, 221.12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/CCNode_1/spr_photo1` | CCSprite | [0, -8] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageHistoryCell/CCNode_1/spr_frame1` | CCSprite | [0, -8] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageHistoryCell/CCNode_1/spr_win1` | CCSprite | [-36, 25] | [0.5, 0.5] | [40, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/compare-share-lang_spr-win.png` 9badd8ae-c81e-4689-9711-74440083e414 |
| `/SuperStageHistoryCell/CCNode_1/lbl_name1` | UILabelTTF | [66.0, 8.6] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」19 FZCSJW--GB1-0.ttf rgb[199, 90, 26] |
| `/SuperStageHistoryCell/CCNode_1/lbl_server1` | UILabelTTF | [66, -16] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「[s0]」16 FZCSJW--GB1-0.ttf rgb[0, 133, 0] |
| `/SuperStageHistoryCell/CCNode_2` | CCNode | [499, 221.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/CCNode_2/spr_photo2` | CCSprite | [0, -8] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageHistoryCell/CCNode_2/spr_frame2` | CCSprite | [0, -8] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageHistoryCell/CCNode_2/spr_win2` | CCSprite | [-36, 25] | [0.5, 0.5] | [40, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/compare-share-lang_spr-win.png` 9badd8ae-c81e-4689-9711-74440083e414 |
| `/SuperStageHistoryCell/CCNode_2/lbl_name2` | UILabelTTF | [-68.4, 8.6] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」19 FZCSJW--GB1-0.ttf rgb[199, 90, 26] |
| `/SuperStageHistoryCell/CCNode_2/lbl_server2` | UILabelTTF | [-68.4, -16] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「[s0]」16 FZCSJW--GB1-0.ttf rgb[0, 133, 0] |
| `/SuperStageHistoryCell/CCScale9Sprite_2` | CCScale9Sprite | [280.0, 152.0] | [0.5, 0.5] | [510, 12] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/compare-share/compare-share_spr-line.png` f58d94ba-bd56-4963-8549-ec04d0abbe48 insets[0, 0, 20, 20] |
| `/SuperStageHistoryCell/node_list_1` | CCNode | [103, 155] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/CCSprite_1` | CCSprite | [280, 177.8] | [0.5, 0.5] | [78, 94] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/SuperStageHistoryCell/lbl_time` | UILabelTTF | [279, 120.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「常规赛」19 FZCSJW--GB1-0.ttf rgb[73, 155, 207] |
| `/SuperStageHistoryCell/lbl_time` | UILabelTTF | [280, 22] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2000-00-31 00:00:00」18 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/SuperStageHistoryCell/btn_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/btn_menu/btn_data` | UIMenuItemImage | [280, 71] | [0.5, 0.5] | [52, 56] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-data.png` 931f7bb5-457c-4a32-8020-118f05150239 |
| `/SuperStageHistoryCell/CCNode_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/CCNode_3/spr_rank1` | CCSprite | [66, 88] | [0.5, 0.5] | [89, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-2-1.png` cb86e63f-a9b3-4014-a799-0b7d10a869f7 |
| `/SuperStageHistoryCell/CCNode_3/lbl_rank1` | UILabelTTF | [67, 54] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂无」16 CloudYuanCuGBK.ttf rgb[251, 245, 228] |
| `/SuperStageHistoryCell/CCNode_3/lbl_rank_text1` | UILabelTTF | [116, 107] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排行」19 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_3/lbl_level_text1` | UILabelTTF | [116, 64] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级」19 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_3/CCScale9Sprite_1` | CCScale9Sprite | [196, 107] | [0.5, 0.5] | [80, 27] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageHistoryCell/CCNode_3/lbl_rank_num1` | UILabelTTF | [197, 107] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂无」19 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_3/CCScale9Sprite_2` | CCScale9Sprite | [196, 64] | [0.5, 0.5] | [80, 27] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageHistoryCell/CCNode_3/lbl_level1` | UILabelTTF | [196, 64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」19 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_4` | CCNode | [560, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryCell/CCNode_4/spr_rank2` | CCSprite | [-65, 88] | [0.5, 0.5] | [89, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-2-1.png` cb86e63f-a9b3-4014-a799-0b7d10a869f7 |
| `/SuperStageHistoryCell/CCNode_4/lbl_rank2` | UILabelTTF | [-64, 54] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂无」16 CloudYuanCuGBK.ttf rgb[251, 245, 228] |
| `/SuperStageHistoryCell/CCNode_4/lbl_rank_text2` | UILabelTTF | [-115, 107] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排行」19 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_4/lbl_level_text2` | UILabelTTF | [-115, 64] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级」19 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_4/CCScale9Sprite_1` | CCScale9Sprite | [-198, 107] | [0.5, 0.5] | [80, 27] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageHistoryCell/CCNode_4/lbl_rank_num2` | UILabelTTF | [-198, 107] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂无」19 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryCell/CCNode_4/CCScale9Sprite_2` | CCScale9Sprite | [-198, 64] | [0.5, 0.5] | [80, 27] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageHistoryCell/CCNode_4/lbl_level2` | UILabelTTF | [-198, 64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」19 CloudYuanCuGBK.ttf rgb[141, 89, 58] |

## SuperStageHistoryLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageHistoryLayer` | SuperStageHistoryLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageHistoryLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageHistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「個人挑戰」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SuperStageHistoryLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageHistoryLayer/CCMenu_1/btn_tab_1` | UIMenuItemTab | [249, 791] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「我的錄像」40 [122, 71, 45, 255] |
| `/SuperStageHistoryLayer/CCMenu_1/btn_tab_2` | UIMenuItemTab | [396, 791] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「大神風采」40 [122, 71, 45, 255] |
| `/SuperStageHistoryLayer/spr_scroll_view_bg` | CCScale9Sprite | [35, 105] | [0.5, 0.5] | [570, 690] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageHistoryLayer/scroll_view` | UIScrollViewBackpack | [42, 110] | [0, 0] | [560, 680] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SuperStageHistoryLayer/lbl_my_stage_title` | UILabelTTF | [475, 80] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前你的段位为: 」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageHistoryLayer/lbl_my_stage` | UILabelTTF | [475, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」36 CloudYuanCuGBK.ttf rgb[225, 91, 255] |
| `/SuperStageHistoryLayer/CCSprite_1` | CCSprite | [310, 20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |

## SuperStageHistoryVideoLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageHistoryVideoLayer` | SuperStageHistoryVideoLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryVideoLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageHistoryVideoLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryVideoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageHistoryVideoLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「數據詳情」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SuperStageHistoryVideoLayer/spr_scroll_view_bg` | CCScale9Sprite | [35, 105] | [0.5, 0.5] | [570, 690] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageHistoryVideoLayer/scroll_view` | UIScrollViewBackpack | [42, 110] | [0, 0] | [560, 680] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SuperStageHistoryVideoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageHistoryVideoLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## SuperStageLegendLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageLegendLayer` | SuperStageLegendLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage.jpg` 27914e23-9760-423b-b0d3-f2627fc57396 |
| `/SuperStageLegendLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 140] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendLayer/node_top/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [0, -90.0] | [0.5, 0.5] | [332, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-title-1.png` 412aa638-3416-4429-92e5-725f2db81152 |
| `/SuperStageLegendLayer/node_top/CCNode_1/lbl_title` | UILabelTTF | [0, -90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「賽季傳奇」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageLegendLayer/node_top/CCNode_1/menu_btn` | UIMenu | [0, -90] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendLayer/node_top/CCNode_1/menu_btn/btn_left` | UIMenuItemImage | [-180, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/SuperStageLegendLayer/node_top/CCNode_1/menu_btn/btn_right` | UIMenuItemImage | [180, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |
| `/SuperStageLegendLayer/node_top/CCNode_2` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 140.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendLayer/node_top/CCNode_2/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendLayer/node_top/CCNode_2/UIMenu_1/btn_back` | UIMenuItemImage | [-71.435, -47.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |

## SuperStageLegendSeat（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageLegendSeat` | SuperStageLegendSeat | [0, 0] | [0, 0] | [210, 200] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendSeat/CCSprite_1` | CCSprite | [105.0, 0.0] | [0.5, 0] | [246, 140] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-base.png` af69cb75-3a92-47ae-8ea4-88633ef403ee |
| `/SuperStageLegendSeat/node_animator` | CCNode | [105, 79] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendSeat/spr_title` | CCSprite | [105, 200] | [0.5, 0.5] | [260, 113] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-title_title10.png` 870378aa-47eb-4a95-a1d3-b5db220f8003 |
| `/SuperStageLegendSeat/node_fighting` | CCNode | [110, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageLegendSeat/node_fighting/spr_battle_count_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageLegendSeat/node_fighting/CCSprite_1` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageLegendSeat/node_fighting/lbl_fighting` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageLegendSeat/CCSprite_2` | CCSprite | [95, 19] | [0.5, 0.5] | [184, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-22.png` 1e38ebac-3ccf-4b7b-8213-0de487f8501f |
| `/SuperStageLegendSeat/lbl_name` | UILabelTTF | [105, 18] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgb[255, 226, 56] |

## SuperStageMainLadderLayer（38）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageMainLadderLayer` | SuperStageMainLadderLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 919] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage-2.png` 2b831e8f-9783-46e6-83be-05f378c4ef23 |
| `/SuperStageMainLadderLayer/node_npc` | CCNode | [320.0, 480.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_top` | CCNode | [320.0, 768.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_top/CCSprite_1` | CCSprite | [0, 10] | [0.5, 0.5] | [174, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-lang_spr-tip-1.png` 9ac87ce7-ec6a-49ed-a284-95994f182309 |
| `/SuperStageMainLadderLayer/node_top/CCSprite_2` | CCSprite | [0, -30] | [0.5, 0.5] | [250, 34] | [1.2, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-19.png` 4f1f049c-06d7-4a37-9923-55bc3d4d4a38 |
| `/SuperStageMainLadderLayer/node_top/lbl_timing` | UILabelTTF | [0, -30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「周六00:00开启」44 CloudYuanCuGBK.ttf rgb[43, 249, 0] |
| `/SuperStageMainLadderLayer/node_rank` | CCNode | [0.0, 768.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_rank/bg_rank` | CCSprite | [0, -75] | [0, 0.5] | [178, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_bg-1.png` 572d2464-b624-43e7-9ab0-8ed185b6af4f |
| `/SuperStageMainLadderLayer/node_rank/lbl_in_rank` | UILabelTTF | [115, -75] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」60 STZhongsong.ttf rgbNone |
| `/SuperStageMainLadderLayer/node_rank/lbl_out_rank` | UILabelTTF | [115, -75] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未上榜」40 STZhongsong.ttf rgb[43, 249, 0] |
| `/SuperStageMainLadderLayer/node_center_btn_right` | CCNode | [640.0, 609.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_info` | UIMenuItemImage | [-60, 250] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_rank` | UIMenuItemLabel | [-60, 150] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-rank.png` f8f107db-9bd4-4417-a023-60141809a528 · Label「排行榜」44 [255, 235, 194, 255] |
| `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_history` | UIMenuItemLabel | [-60, 50] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-history.png` c7316687-b4fa-47c8-8e24-46084e95b4c3 · Label「挑战记录」32 [255, 255, 255, 255] |
| `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_lineup` | UIMenuItemLabel | [-60, -150] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-lineup.png` ec2266e1-21b7-48fb-a657-237772ad525a · Label「阵容调整」32 [255, 255, 255, 255] |
| `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_legend` | UIMenuItemLabel | [-60, -50] | [0.5, 0.5] | [65, 63] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-legend-2.png` b8ae565c-9f82-44e1-b335-a12e7d217c80 · Label「赛季传奇」32 [255, 255, 255, 255] |
| `/SuperStageMainLadderLayer/node_bottom` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 250] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [-3.0, 97] | [0.5, 0.5] | [646.4, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_spr-pattern-1.png` 988e028d-311b-4c54-8815-4fa535ee962f insets[10, 10, 10, 10] |
| `/SuperStageMainLadderLayer/node_bottom/menu_bottom` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_bottom/menu_bottom/btn_refresh` | UIMenuItemLabel | [0, 65] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「挑戰刷新」48 [255, 255, 255, 255] |
| `/SuperStageMainLadderLayer/node_bottom/menu_bottom/btn_reward_detail` | UIMenuItemImage | [220, 225] | [0, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1/UILabelTTF_1` | UILabelTTF | [-290, 225] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「當前排名可獲得以下賽季結算獎勵」44 CloudYuanCuGBK.ttf rgbNone |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_tip_no_reward` | UILabelTTF | [0, 165] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暫無獎勵」56 CloudYuanCuGBK.ttf rgbNone |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1/CCSprite_1` | CCSprite | [200, 225] | [0.5, 0.5] | [32, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-detail.png` 3017e3de-ade1-4ce7-9a86-9c359ad7ef15 |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_reward_detail` | UILabelTTF | [220, 225] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「獎勵預覽」36 CloudYuanCuGBK.ttf rgbNone |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_reward_detail_under` | UILabelTTF | [220, 215] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「—」36 CloudYuanCuGBK.ttf rgb[233, 232, 231] |
| `/SuperStageMainLadderLayer/node_bottom/CCNode_1/menu_reward` | UIMenu | [-250, 165] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_bottom/node_times` | CCNode | [640.0, 25.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_bottom/node_times/CCSprite_1` | CCSprite | [-80, 0] | [0.5, 0.5] | [101, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_block-4.png` 331393fe-3bdb-46e0-8ef0-1f8c352e00b5 |
| `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_title` | UILabelTTF | [-135, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「匹配次数:」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |
| `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_buy_title` | UILabelTTF | [-65, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「剩余购买次数:」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |
| `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_buy` | UILabelTTF | [-60, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/SuperStageMainLadderLayer/node_bottom/node_times/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderLayer/node_bottom/node_times/CCMenu_1/btn_add_times` | UIMenuItemImage | [-17, 0] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times` | UILabelTTF | [-80, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10/10」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |

## SuperStageMainLadderSeat（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageMainLadderSeat` | SuperStageMainLadderSeat | [0, 0] | [0, 0] | [210, 200] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderSeat/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [210.0, 200.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderSeat/UIMenu_1/btn_touch` | CCMenuItemImage | [105.0, 100.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/SuperStageMainLadderSeat/CCSprite_1` | CCSprite | [105, 50] | [0.5, 0.5] | [246, 140] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-base.png` af69cb75-3a92-47ae-8ea4-88633ef403ee |
| `/SuperStageMainLadderSeat/node_root` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderSeat/node_root/node_animator` | CCNode | [105, 90] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLadderSeat/node_root/CCSprite_1` | CCSprite | [105, 57] | [0.5, 0.5] | [82, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_bg-3.png` b2e3b262-635d-4110-86e1-991d18b25c6e |
| `/SuperStageMainLadderSeat/node_root/lbl_rank` | UILabelTTF | [105, 56] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SuperStageMainLadderSeat/node_root/CCSprite_2` | CCSprite | [95, 19] | [0.5, 0.5] | [184, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-22.png` 1e38ebac-3ccf-4b7b-8213-0de487f8501f |
| `/SuperStageMainLadderSeat/node_root/lbl_name` | UILabelTTF | [105, 18] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 CloudYuanCuGBK.ttf rgbNone |

## SuperStageMainLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageMainLayer` | SuperStageMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLayer/node_top` | CCNode | [320.0, 768.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLayer/node_top/node_tab` | CCNode | [0, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLayer/node_top/node_tab/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLayer/node_top/node_tab/CCMenu_1/btn_tab_1` | UIMenuItemTab | [0, 0] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「常規賽」48 [255, 255, 255, 255] |
| `/SuperStageMainLayer/node_top/node_tab/CCMenu_1/btn_tab_2` | UIMenuItemTab | [0, 0] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-25.png` f26c0a7a-f792-49e4-9c9d-b281fd019377 pressed `ui/common/button_btn-tab-26.png` f4644886-76ac-4064-8199-8e07ac10a29d · Label「巔峰賽」48 [255, 255, 255, 255] |
| `/SuperStageMainLayer/node_top/node_tab/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [82, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-icon-1.png` f06505c6-f7ca-45bd-b383-cc97baf4952e |
| `/SuperStageMainLayer/node_btn_back` | CCNode | [575.0, 930.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLayer/node_btn_back/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainLayer/node_btn_back/menu/btn_back` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |

## SuperStageMainRegularLayer（51）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageMainRegularLayer` | SuperStageMainRegularLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage.jpg` 27914e23-9760-423b-b0d3-f2627fc57396 |
| `/SuperStageMainRegularLayer/node_top` | CCNode | [320.0, 768.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_top/spr_time_tip_bg` | CCScale9Sprite | [0, -20] | [0.5, 0.5] | [428, 80] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-2.png` d7799fbb-1e31-478f-a5b2-d824556f7244 insets[15, 15, 15, 15] |
| `/SuperStageMainRegularLayer/node_top/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_top/menu/btn_info` | UIMenuItemImage | [-260, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SuperStageMainRegularLayer/node_center` | CCNode | [320.0, 576.0] | [0, 0] | [640.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_center/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [394, 394] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-bg-circle.png` 21f38ef6-6820-4327-81f4-0ba21820820f |
| `/SuperStageMainRegularLayer/node_center/spr_stage_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [295, 334] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-1-1.png` 9b1af1cc-b927-42bb-ab83-295cfac28d19 |
| `/SuperStageMainRegularLayer/node_center/CCSprite_2` | CCSprite | [0.0, -125.0] | [0.5, 0.5] | [188, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-stage-name-bg-1-1.png` c498d95d-3db5-41db-8a05-0e2948defef4 |
| `/SuperStageMainRegularLayer/node_center/lbl_stage_name` | UILabelTTF | [0.0, -125.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」44 CloudYuanCuGBK.ttf rgb[255, 197, 255] |
| `/SuperStageMainRegularLayer/node_center/lbl_tip_qualification` | UILabelTTF | [0.0, 160.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「您已獲得參與巔峰賽預賽資格」56 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/SuperStageMainRegularLayer/node_center_btn_left` | CCNode | [0.0, 576.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_legend` | UIMenuItemLabel | [60, 150] | [0.5, 0.5] | [65, 63] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-legend-2.png` b8ae565c-9f82-44e1-b335-a12e7d217c80 · Label「赛季传奇」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_lineup` | UIMenuItemLabel | [60, 50] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-lineup.png` ec2266e1-21b7-48fb-a657-237772ad525a · Label「阵容调整」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_rank_info` | UIMenuItemLabel | [60, -50] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-info.png` 94a78d17-d94c-4e2e-8cb7-aaf5895a0b35 · Label「段位说明」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_acount` | UIMenuItemLabel | [60, -150] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-acount.png` ddcf2533-2112-4572-8045-d0c8d37db389 · Label「个人记录」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_right` | CCNode | [640.0, 576.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_history` | UIMenuItemLabel | [-60, 150] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-history.png` c7316687-b4fa-47c8-8e24-46084e95b4c3 · Label「挑战记录」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_shop` | UIMenuItemLabel | [-60, 50] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-shop.png` ed835da0-9528-4a9e-9753-b3562fc92fad · Label「段位商店」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_reward` | UIMenuItemLabel | [-60, -50] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-reward.png` 58fde771-0a34-4d61-b28c-6947dca43fde · Label「奖励一览」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_activity` | UIMenuItemLabel | [-60, -150] | [0.5, 0.5] | [62, 72] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-activity.png` 964fc1fe-89b9-49b8-a09c-3a7da916cbac · Label「段位战令」32 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_bottom` | CCNode | [320.0, 288.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_result` | CCNode | [0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_result/lbl_next_rank` | UILabelTTF | [0, 70] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「下一段位: 白银先锋II」36 CloudYuanCuGBK.ttf rgb[255, 210, 173] |
| `/SuperStageMainRegularLayer/node_bottom/node_result/node_advance` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage/progress_stage_bg` | CCSprite | [0, 35] | [0.5, 0.5] | [229, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_progress-bg.png` 08a3142d-2779-493d-b2f3-590adcf1efb4 |
| `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage/lbl_stage_tip` | UILabelTTF | [0, 10] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「藍條部分為降級緩衝經驗」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage/progress_label` | UILabelTTF | [0, 39] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1/1」36 CloudYuanCuGBK.ttf rgb[255, 206, 170] |
| `/SuperStageMainRegularLayer/node_bottom/node_reward` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_reward/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [580, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-1.png` 29808f1c-da7a-4979-8a5e-9def93f4fcdc insets[15, 15, 30, 30] |
| `/SuperStageMainRegularLayer/node_bottom/node_reward/node_reward_tip` | CCNode | [-270, 45] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_reward/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_reward/CCMenu_1/btn_result_reward` | UIMenuItemLabel | [200, -20] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「领取」48 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_bottom/node_reward/menu_reward` | UIMenu | [-270, -20] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/lbl_my_rank` | UILabelTTF | [290, -90] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名: 未上榜」36 CloudYuanCuGBK.ttf rgb[255, 210, 173] |
| `/SuperStageMainRegularLayer/node_bottom/lbl_match_tip` | UILabelTTF | [0, -130] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「活動已結束」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SuperStageMainRegularLayer/node_bottom/CCMenu_1` | CCMenu | [0, -130] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/CCMenu_1/btn_match` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「进入匹配」56 [255, 255, 255, 255] |
| `/SuperStageMainRegularLayer/node_bottom/CCMenu_1/btn_rank` | UIMenuItemLabel | [-246, 0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-rank.png` f8f107db-9bd4-4417-a023-60141809a528 · Label「排行榜」44 [255, 235, 194, 255] |
| `/SuperStageMainRegularLayer/node_bottom/node_times` | CCNode | [290, -175] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_times/CCSprite_1` | CCSprite | [-80, 0] | [0.5, 0.5] | [101, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_block-4.png` 331393fe-3bdb-46e0-8ef0-1f8c352e00b5 |
| `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_title` | UILabelTTF | [-135, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「匹配次数:」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |
| `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_buy_title` | UILabelTTF | [-65, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「剩余购买次数:」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |
| `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_buy` | UILabelTTF | [-60, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/SuperStageMainRegularLayer/node_bottom/node_times/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainRegularLayer/node_bottom/node_times/CCMenu_1/btn_add_times` | UIMenuItemImage | [-17, 0] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times` | UILabelTTF | [-80, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10/10」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |

## SuperStageMainTopLayer（56）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageMainTopLayer` | SuperStageMainTopLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 919] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage-2.png` 2b831e8f-9783-46e6-83be-05f378c4ef23 |
| `/SuperStageMainTopLayer/node_top1` | CCNode | [640.0, 816.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_top1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_top1/CCMenu_1/btn_rank` | UIMenuItemLabel | [-60, -10] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-rank.png` f8f107db-9bd4-4417-a023-60141809a528 · Label「排行榜」44 [255, 235, 194, 255] |
| `/SuperStageMainTopLayer/node_top1/CCMenu_1/btn_history` | UIMenuItemLabel | [-60, -95] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-image.png` 42536253-b796-47f2-9efb-99c3470c1df1 · Label「形象設置」32 [255, 255, 255, 255] |
| `/SuperStageMainTopLayer/node_top2` | CCNode | [0.0, 768.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_top2/CCSprite_1` | CCSprite | [0, 0] | [0, 0.5] | [212, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-5.png` a13219e5-c2b1-4b7a-8560-2faa907c673a |
| `/SuperStageMainTopLayer/node_top2/UILabelTTF_1` | UILabelTTF | [65, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「被膜拜次数：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/SuperStageMainTopLayer/node_top2/lbl_worship_count` | UILabelTTF | [120, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/SuperStageMainTopLayer/CCNode_1` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_1` | UIMenuItemLabel | [-123.84, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」48 [255, 255, 255, 255] |
| `/SuperStageMainTopLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_2` | UIMenuItemLabel | [118.08, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「」48 [255, 255, 255, 255] |
| `/SuperStageMainTopLayer/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 237.155] | [0, 0.5] | [640.0, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/championship/championship_spr-bg-6.png` 1ee4345c-3932-4dc0-8de4-78896fd70d78 insets[1, 1, 1, 1] |
| `/SuperStageMainTopLayer/CCNode_2` | CCNode | [640.0, 237.72] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/CCNode_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/CCNode_2/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-61.2, 60.0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SuperStageMainTopLayer/CCNode_3` | CCNode | [0.0, 237.635] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_title` | UILabelTTF | [48, 60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前排名：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank` | UILabelTTF | [145.92, 60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999」22 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_max_title` | UILabelTTF | [48, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「历史最高排名：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_max` | UILabelTTF | [183.36, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999」22 FZCSJW--GB1-0.ttf rgb[255, 143, 65] |
| `/SuperStageMainTopLayer/CCNode_3/lbl_season_time_title` | UILabelTTF | [46.56, -60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「赛季时间：10.14-10.16」20 FZCSJW--GB1-0.ttf rgbNone |
| `/SuperStageMainTopLayer/CCNode_3/lbl_season_time2` | UILabelTTF | [262.56, -60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「(剩余时间：27小时46分)」18 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/SuperStageMainTopLayer/node_show_parent` | CCNode | [320.0, 480.0] | [0.5, 0.5] | [640.0, 288.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show3` | CCNode | [216.96, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/CCSprite_2` | CCSprite | [0, 225.793] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank3.png` 69422450-8daa-4591-8d9b-c48e87087d9a |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/CCSprite_3` | CCSprite | [0, 140] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_name3` | UILabelTTF | [-0.96, 106.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/CCMenu_1/btn_like3` | UIMenuItemImage | [-48.36, -167.433] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_like3` | UILabelTTF | [-0.96, -163.683] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_stage3` | UILabelTTF | [0.04, 140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[255, 193, 43] |
| `/SuperStageMainTopLayer/node_show_parent/node_show2` | CCNode | [-216.255, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/CCSprite_2` | CCSprite | [0, 225.793] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank2.png` a263d50a-0908-449b-8264-e5e309e97cad |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/CCSprite_3` | CCSprite | [0, 140] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_name2` | UILabelTTF | [-0.96, 106.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/CCMenu_1/btn_like2` | UIMenuItemImage | [-48.36, -167.433] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_like2` | UILabelTTF | [-0.96, -163.683] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_stage2` | UILabelTTF | [0.04, 140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[255, 193, 43] |
| `/SuperStageMainTopLayer/node_show_parent/node_show1` | CCNode | [0.0, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [230, 474] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-1.png` 237477ff-b2e7-41c4-bdef-c5810e15b575 |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/CCSprite_2` | CCSprite | [0, 264.96] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank1.png` 2b916702-c418-460f-a15e-6c295c2d79a5 |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/CCSprite_3` | CCSprite | [0, 170] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_name1` | UILabelTTF | [-0.96, 135.36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/CCMenu_1/btn_like1` | UIMenuItemImage | [-55.86, -201.6] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_like1` | UILabelTTF | [-0.96, -199.517] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_stage1` | UILabelTTF | [0.04, 170] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[255, 193, 43] |
| `/SuperStageMainTopLayer/node_show_parent/node_hero3` | CCNode | [216.96, 3.888] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_hero2` | CCNode | [-216.32, 3.9] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMainTopLayer/node_show_parent/node_hero1` | CCNode | [0.0, -12.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## SuperStageMatchLayer（136）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageMatchLayer` | SuperStageMatchLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage.jpg` 27914e23-9760-423b-b0d3-f2627fc57396 |
| `/SuperStageMatchLayer/node_btn_back` | CCNode | [575, 990] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/node_btn_back/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/node_btn_back/menu/btn_back` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/SuperStageMatchLayer/CCNode_1` | CCNode | [320.0, 528.0] | [0.5, 0.5] | [640.0, 860] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/spr_bg_self` | CCSprite | [0.0, 0.0] | [0.5, 0] | [640, 430] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-team-bg-1.png` 371b8b88-8588-4ec2-9203-27892417cbd5 |
| `/SuperStageMatchLayer/CCNode_1/spr_bg_enermy` | CCSprite | [0.0, 0.0] | [0.5, 1] | [640, 430] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-team-bg-2.png` 89f70bf2-d208-4340-aea0-54540c5964f4 |
| `/SuperStageMatchLayer/CCNode_1/spr_default_hero` | CCSprite | [0.0, -95.0] | [0.5, 1] | [402, 283] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-default-hero.png` 48ffd578-651d-4588-a616-a14c7a2d4c64 |
| `/SuperStageMatchLayer/CCNode_1/spr_vs` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [42, 58] | [2, 2] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/SuperStageMatchLayer/CCNode_1/node_self` | CCNode | [0.0, 0.0] | [0.5, 0] | [640.0, 430] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/CCSprite_1` | CCSprite | [-310.0, 400] | [0, 0.5] | [208, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-name-bg-1.png` 1f92f73c-f0e3-40dc-b770-90f8f3cd5b88 |
| `/SuperStageMatchLayer/CCNode_1/node_self/lbl_player_self` | UILabelTTF | [-295.0, 400] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「出战阵容」44 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_stage_self` | CCNode | [240.0, 400] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_stage_self/spr_stage_self` | CCSprite | [0, -5] | [0.5, 0.5] | [89, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-2-3.png` d1b9fa96-7a91-404d-9795-60883483ce9b |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_stage_self/CCSprite_1` | CCSprite | [0, -50] | [0.5, 0.5] | [118, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-stage-name-bg-2-1.png` 087fa86e-3e5f-42be-9835-a9712eb48aa2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_stage_self/lbl_stage_name_self` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「出战阵容」44 FZCSJW--GB1-0.ttf rgb[255, 195, 230] |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_show` | UIMenu | [128.0, 172.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list` | CCNode | [-300.0, 10] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/spr_matrix_self` | CCSprite | [200, 335] | [0.5, 0.5] | [72, 72] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-2.png` a8a11a0e-21b9-4afb-83ad-591f5cd1712e |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_attack_self` | CCNode | [85, 335] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_attack_self/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_attack_self/spr_attack` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_attack_self/lbl_battle_count_self` | CCLabelBMFont | [15, 3] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_1` | CCNode | [130, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_1/spr_lock_self_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_1/node_item_self_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_2` | CCNode | [130, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_2/spr_lock_self_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_2/node_item_self_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_3` | CCNode | [130, 200] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_3/spr_lock_self_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_3/node_item_self_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_4` | CCNode | [130, 280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_4/spr_lock_self_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_4/node_item_self_4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_5` | CCNode | [40, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_5/spr_lock_self_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_5/node_item_self_5` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_6` | CCNode | [40, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_6/spr_lock_self_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_6/node_item_self_6` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_7` | CCNode | [40, 200] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_7/spr_lock_self_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_7/node_item_self_7` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_8` | CCNode | [40, 280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_8/spr_lock_self_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_self/node_hero_self_list/node_icon_self_8/node_item_self_8` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy` | CCNode | [0.0, 0.0] | [0.5, 1] | [640.0, 430] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/CCSprite_1` | CCSprite | [310.0, -30] | [1, 0.5] | [205, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-name-bg-2.png` 1c0795c3-3a80-467b-ad28-2b6c72517c62 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/lbl_player_enermy` | UILabelTTF | [295.0, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「出战阵容」44 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_stage_enermy` | CCNode | [-240.0, -30] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_stage_enermy/spr_stage_enermy` | CCSprite | [0, -5] | [0.5, 0.5] | [89, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-2-3.png` d1b9fa96-7a91-404d-9795-60883483ce9b |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_stage_enermy/CCSprite_1` | CCSprite | [0, -50] | [0.5, 0.5] | [118, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-stage-name-bg-2-2.png` f5685ce6-d2b3-4da1-9057-572ed6f07981 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_stage_enermy/lbl_stage_name_enermy` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「出战阵容」36 FZCSJW--GB1-0.ttf rgb[255, 197, 255] |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_show` | UIMenu | [-128.0, -258.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list` | CCNode | [300.0, -420] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/spr_matrix_enermy` | CCSprite | [-200, 335] | [0.5, 0.5] | [72, 72] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-2.png` a8a11a0e-21b9-4afb-83ad-591f5cd1712e |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_attack_enermy` | CCNode | [-85, 335] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_attack_enermy/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_attack_enermy/spr_attack` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_attack_enermy/lbl_battle_count_enermy` | CCLabelBMFont | [15, 3] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_1` | CCNode | [-130, 280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_1/spr_lock_enermy_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_1/node_item_enermy_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_2` | CCNode | [-130, 200] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_2/spr_lock_enermy_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_2/node_item_enermy_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_3` | CCNode | [-130, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_3/spr_lock_enermy_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_3/node_item_enermy_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_4` | CCNode | [-130, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_4/spr_lock_enermy_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_4/node_item_enermy_4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_5` | CCNode | [-40, 280] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_5/spr_lock_enermy_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_5/node_item_enermy_5` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_6` | CCNode | [-40, 200] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_6/spr_lock_enermy_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_6/node_item_enermy_6` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_7` | CCNode | [-40, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_7/spr_lock_enermy_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_7/node_item_enermy_7` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_8` | CCNode | [-40, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_8/spr_lock_enermy_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/SuperStageMatchLayer/CCNode_1/node_enermy/node_hero_enermy_list/node_icon_enermy_8/node_item_enermy_8` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_bottom` | CCNode | [0.0, -430.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass` | CCNode | [0, -50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass/CCSprite_1` | CCSprite | [60, 0] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass/UILabelTTF_1` | UILabelTTF | [30, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跳過調整陣容」40 FZCSJW--GB1-0.ttf rgb[255, 228, 191] |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass/CCMenu_1/btn_lineup_pass` | UIMenuItemCheckBox | [60, 0] | [0.5, 0.5] | [41, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_lineup` | UIMenuItemLabel | [-210, -50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「陣容調整」48 [255, 255, 255, 255] |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_match` | UIMenuItemLabel | [210, -50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「匹配對手」48 [255, 255, 255, 255] |
| `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_start` | UIMenuItemLabel | [210, -50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「立即開始」48 [255, 255, 255, 255] |
| `/SuperStageMatchLayer/CCNode_1/node_times` | CCNode | [275.0, -530.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_times/CCSprite_1` | CCSprite | [-80, 0] | [0.5, 0.5] | [101, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_block-4.png` 331393fe-3bdb-46e0-8ef0-1f8c352e00b5 |
| `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_title` | UILabelTTF | [-135, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「匹配次数:」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |
| `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_buy_title` | UILabelTTF | [-65, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「剩余购买次数:」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |
| `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_buy` | UILabelTTF | [-60, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/SuperStageMatchLayer/CCNode_1/node_times/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageMatchLayer/CCNode_1/node_times/CCMenu_1/btn_add_times` | UIMenuItemImage | [-17, 0] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times` | UILabelTTF | [-80, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10/10」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |

## SuperStageRankCell（19）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageRankCell` | SuperStageRankCell | [0, 0] | [0, 0] | [540, 130] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/SuperStageRankCell/spr_rank` | CCSprite | [45, 95] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/SuperStageRankCell/lbl_rank` | UILabelTTF | [45, 65] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SuperStageRankCell/CCNode_1` | CCNode | [135, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankCell/CCNode_1/spr_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageRankCell/CCNode_1/spr_frame` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageRankCell/CCNode_1/CCSprite_1` | CCSprite | [0, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/SuperStageRankCell/CCNode_1/lbl_level` | UILabelTTF | [0, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageRankCell/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankCell/CCNode_1/menu/btn_photo` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal  |
| `/SuperStageRankCell/node_stage` | CCNode | [455, 90] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankCell/node_stage/spr_stage` | CCSprite | [0, -5] | [0.5, 0.5] | [89, 100] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-2-3.png` d1b9fa96-7a91-404d-9795-60883483ce9b |
| `/SuperStageRankCell/node_stage/lbl_stage_name` | UILabelTTF | [0, -32] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「青铜I」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageRankCell/lbl_name` | UILabelTTF | [240, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家六字名字」44 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/SuperStageRankCell/CCSprite_1` | CCSprite | [210, 45] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/SuperStageRankCell/lbl_fighting` | UILabelTTF | [225, 45] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageRankCell/lbl_server_name` | UILabelTTF | [200, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[S0]」36 CloudYuanCuGBK.ttf rgb[15, 159, 0] |
| `/SuperStageRankCell/lbl_score` | UILabelTTF | [455, 25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「精英积分: 9999」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |

## langKey / outline / shadow（只记录，不加组件）

ccbi 上的 `langKey`、`outline`、`shadow` 不挂 i18n / Label outline / Label shadow。字号未写的按钮文字按 24，颜色未写的按白色（`fontSizeDefaulted`）。

### langKey

| Prefab | 节点 | langKey | 文本 |
|---|---|---|---|
| SuperStageAccountLayer | `/SuperStageAccountLayer/node_title/lbl_title` | lang###74804 | 个人战绩 |
| SuperStageAccountLayer | `/SuperStageAccountLayer/menu/btn_share/Label` | lang###47361 | 分 享 |
| SuperStageAccountLayer | `/SuperStageAccountLayer/lbl_stage` | lang###74832 | 第S7赛季 |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_1` | lang###74835 | 当前段位: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_2` | lang###74836 | 历史最高段位: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_3` | lang###74837 | 当前积分: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_4` | lang###74838 | 历史最高积分: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_5` | lang###74839 | 常规赛胜场: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_6` | lang###74840 | 常规赛胜率: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_7` | lang###74841 | 单场最高伤害: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_8` | lang###74842 | 最大连胜场数: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/lbl_hero_num` | lang###74843 | mvp次数最多英雄: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/lbl_mvp_hero_tip` | lang###74845 | 暂无 |
| SuperStageAccountLayer | `/SuperStageAccountLayer/UILabelTTF_9` | lang###74844 | 最强对手: |
| SuperStageAccountLayer | `/SuperStageAccountLayer/lbl_strongest_player_tip` | lang###74845 | 暂无 |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/normal_detal_layout/UILabelTTF_1` | lang###74819 | 段位经验： |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/normal_detal_layout/UILabelTTF_2` | lang###74820 | 精英积分： |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/lbl_hdwp` | lang###74821 | 获得物品 |
| SuperStageHistoryCell | `/SuperStageHistoryCell/lbl_time` | lang###74941 | 常规赛 |
| SuperStageHistoryCell | `/SuperStageHistoryCell/CCNode_3/lbl_rank_text1` | lang###74409 | 排行 |
| SuperStageHistoryCell | `/SuperStageHistoryCell/CCNode_3/lbl_level_text1` | lang###5429 | 等级 |
| SuperStageHistoryCell | `/SuperStageHistoryCell/CCNode_4/lbl_rank_text2` | lang###74409 | 排行 |
| SuperStageHistoryCell | `/SuperStageHistoryCell/CCNode_4/lbl_level_text2` | lang###5429 | 等级 |
| SuperStageHistoryLayer | `/SuperStageHistoryLayer/node_title/lbl_title` | lang###74805 | 個人挑戰 |
| SuperStageHistoryLayer | `/SuperStageHistoryLayer/lbl_my_stage_title` | lang###74825 | 当前你的段位为:  |
| SuperStageHistoryVideoLayer | `/SuperStageHistoryVideoLayer/node_title/lbl_title` | lang###74943 | 數據詳情 |
| SuperStageLegendLayer | `/SuperStageLegendLayer/node_top/CCNode_1/lbl_title` | lang###74801 | 賽季傳奇 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_top/lbl_timing` | lang###5655 | 周六00:00开启 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_rank/lbl_out_rank` | lang###5652 | 未上榜 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_rank/Label` | lang###4320 | 排行榜 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_history/Label` | lang###74805 | 挑战记录 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_lineup/Label` | lang###74802 | 阵容调整 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_legend/Label` | lang###74801 | 赛季传奇 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/menu_bottom/btn_refresh/Label` | lang###75910 | 挑戰刷新 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/CCNode_1/UILabelTTF_1` | lang###76052 | 當前排名可獲得以下賽季結算獎勵 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_tip_no_reward` | lang###5031 | 暫無獎勵 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_reward_detail` | lang###5313 | 獎勵預覽 |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_title` | lang###74817 | 匹配次数: |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_buy_title` | lang###74818 | 剩余购买次数: |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center/lbl_tip_qualification` | lang###76056 | 您已獲得參與巔峰賽預賽資格 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_legend/Label` | lang###74801 | 赛季传奇 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_lineup/Label` | lang###74802 | 阵容调整 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_rank_info/Label` | lang###74803 | 段位说明 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_acount/Label` | lang###74804 | 个人记录 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_history/Label` | lang###74805 | 挑战记录 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_shop/Label` | lang###74806 | 段位商店 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_reward/Label` | lang###74807 | 奖励一览 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_activity/Label` | lang###74808 | 段位战令 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage/lbl_stage_tip` | lang###74936 | 藍條部分為降級緩衝經驗 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_reward/CCMenu_1/btn_result_reward/Label` | lang###5446 | 领取 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/CCMenu_1/btn_match/Label` | lang###74813 | 进入匹配 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/CCMenu_1/btn_rank/Label` | lang###4320 | 排行榜 |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_title` | lang###74817 | 匹配次数: |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_buy_title` | lang###74818 | 剩余购买次数: |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top1/CCMenu_1/btn_rank/Label` | lang###4320 | 排行榜 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top1/CCMenu_1/btn_history/Label` | lang###76064 | 形象設置 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top2/UILabelTTF_1` | lang###5467 | 被膜拜次数： |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_1/Label` | lang###5458 |  |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_2/Label` | lang###47288 |  |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_title` | lang###5322 | 当前排名： |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_max_title` | lang###5264 | 历史最高排名： |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_season_time_title` | lang###5434 | 赛季时间：10.14-10.16 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_name3` | lang###5500 | 王者 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_stage3` | lang###5500 | 王者 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_name2` | lang###5500 | 王者 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_stage2` | lang###5500 | 王者 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_name1` | lang###5500 | 王者 |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_stage1` | lang###5500 | 王者 |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass/UILabelTTF_1` | lang###74937 | 跳過調整陣容 |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_lineup/Label` | lang###74802 | 陣容調整 |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_match/Label` | lang###74933 | 匹配對手 |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_start/Label` | lang###74939 | 立即開始 |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_title` | lang###74817 | 匹配次数: |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_buy_title` | lang###74818 | 剩余购买次数: |
| SuperStageRankCell | `/SuperStageRankCell/lbl_server_name` | lang###5277 | [S0] |

### outline

| Prefab | 节点 | outline |
|---|---|---|
| SuperStageAccountLayer | `/SuperStageAccountLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| SuperStageAccountLayer | `/SuperStageAccountLayer/menu/btn_share/Label` | `{"color":[131,43,22,255],"size":4}` |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/spr_stage_icon/lbl_stage_name` | `{"color":[42,17,7,255],"size":4}` |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/delta_stage_node/spr_pre_stage_icon/lbl_old_stage_name` | `{"color":[42,17,7,255],"size":4}` |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/delta_stage_node/spr_next_stage_icon/lbl_new_stage_name` | `{"color":[42,17,7,255],"size":4}` |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/normal_detal_layout/pregress_label` | `{"color":[0,0,0,255],"size":4}` |
| SuperStageBattleEndLayer | `/SuperStageBattleEndLayer/lbl_hdwp` | `{"color":[130,44,27,255],"size":4}` |
| SuperStageHistoryCell | `/SuperStageHistoryCell/CCNode_3/lbl_rank1` | `{"color":[141,89,58,255],"size":1}` |
| SuperStageHistoryCell | `/SuperStageHistoryCell/CCNode_4/lbl_rank2` | `{"color":[141,89,58,255],"size":1}` |
| SuperStageHistoryLayer | `/SuperStageHistoryLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| SuperStageHistoryVideoLayer | `/SuperStageHistoryVideoLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| SuperStageLegendLayer | `/SuperStageLegendLayer/node_top/CCNode_1/lbl_title` | `{"color":[40,55,81,255],"size":3}` |
| SuperStageLegendSeat | `/SuperStageLegendSeat/lbl_name` | `{"color":[0,0,0,255],"size":2}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_top/lbl_timing` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_rank/lbl_in_rank` | `{"color":[122,71,45,255],"size":2}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_rank/lbl_out_rank` | `{"color":[0,0,0,255],"size":2}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_rank/Label` | `{"color":[76,41,33,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_history/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_lineup/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_center_btn_right/CCMenu_1/btn_legend/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/menu_bottom/btn_refresh/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_tip_no_reward` | `{"color":[0,96,162,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/CCNode_1/lbl_reward_detail` | `{"color":[43,3,3,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_title` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_buy_title` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times_buy` | `{"color":[144,52,20,255],"size":4}` |
| SuperStageMainLadderLayer | `/SuperStageMainLadderLayer/node_bottom/node_times/lbl_times` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainLadderSeat | `/SuperStageMainLadderSeat/node_root/lbl_name` | `{"color":[0,0,0,255],"size":2}` |
| SuperStageMainLayer | `/SuperStageMainLayer/node_top/node_tab/CCMenu_1/btn_tab_1/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainLayer | `/SuperStageMainLayer/node_top/node_tab/CCMenu_1/btn_tab_2/Label` | `{"color":[132,5,25,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center/lbl_stage_name` | `{"color":[42,17,7,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center/lbl_tip_qualification` | `{"color":[144,52,20,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_legend/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_lineup/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_rank_info/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_left/CCMenu_1/btn_acount/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_history/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_shop/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_reward/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_center_btn_right/CCMenu_1/btn_activity/Label` | `{"color":[204,84,4,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_result/lbl_next_rank` | `{"color":[0,0,0,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage/lbl_stage_tip` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_result/node_progress_stage/progress_label` | `{"color":[0,0,0,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_reward/CCMenu_1/btn_result_reward/Label` | `{"color":[131,43,22,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/lbl_my_rank` | `{"color":[0,0,0,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/lbl_match_tip` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/CCMenu_1/btn_match/Label` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/CCMenu_1/btn_rank/Label` | `{"color":[76,41,33,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_title` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_buy_title` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times_buy` | `{"color":[144,52,20,255],"size":4}` |
| SuperStageMainRegularLayer | `/SuperStageMainRegularLayer/node_bottom/node_times/lbl_times` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top1/CCMenu_1/btn_rank/Label` | `{"color":[76,41,33,255],"size":4}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top1/CCMenu_1/btn_history/Label` | `{"color":[0,75,129,255],"size":4}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top2/UILabelTTF_1` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_top2/lbl_worship_count` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_1/Label` | `{"color":[31, 86,167,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_2/Label` | `{"color":[70,6,255,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_title` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_max_title` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_my_rank_max` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_season_time_title` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/CCNode_3/lbl_season_time2` | `{"color":[0,0,0,255],"size":1}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_name3` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_like3` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show3/lbl_stage3` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_name2` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_like2` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show2/lbl_stage2` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_name1` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_like1` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMainTopLayer | `/SuperStageMainTopLayer/node_show_parent/node_show1/lbl_stage1` | `{"color":[74,41,33,255],"size":2}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_self/node_stage_self/lbl_stage_name_self` | `{"color":[42,17,7,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_enermy/node_stage_enermy/lbl_stage_name_enermy` | `{"color":[42,17,7,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/node_lineup_pass/UILabelTTF_1` | `{"color":[0,0,0,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_lineup/Label` | `{"color":[13,91,45,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_match/Label` | `{"color":[13,91,45,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_bottom/CCMenu_1/btn_start/Label` | `{"color":[13,91,45,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_title` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_buy_title` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times_buy` | `{"color":[144,52,20,255],"size":4}` |
| SuperStageMatchLayer | `/SuperStageMatchLayer/CCNode_1/node_times/lbl_times` | `{"color":[31,86,167,255],"size":4}` |
| SuperStageRankCell | `/SuperStageRankCell/lbl_rank` | `{"color":[77,37,31,255],"size":4}` |
| SuperStageRankCell | `/SuperStageRankCell/node_stage/lbl_stage_name` | `{"color":[74,41,33,255],"size":4}` |

### shadow

本批节点（含按钮子 Label）没有 shadow。

### fontSizeDefaulted（按钮文字，Prefab 里仍写 spec 的字号）

ccbi 没写字号的按钮文字按 24、没写颜色的按白色，spec 已标 `fontSizeDefaulted`。

本批没有 `fontSizeDefaulted` 节点。

### 缺图（spriteFrame 留空）

- SuperStageMainLadderLayer `/SuperStageMainLadderLayer/node_bottom/menu_bottom/btn_reward_detail`：ccbi 的 normal/pressed/disabled 帧都是空文件名，Sprite / Button 的帧留空。
- SuperStageMainLadderSeat `/SuperStageMainLadderSeat/UIMenu_1/btn_touch`：ccbi 的 normal/pressed/disabled 帧都是空文件名，Sprite / Button 的帧留空。
- SuperStageRankCell `/SuperStageRankCell/CCNode_1/menu/btn_photo`：ccbi 的 normal/pressed/disabled 帧都是空文件名，Sprite / Button 的帧留空。

### 同级重名

SuperStageHistoryCell 同级重名保留：SuperStageHistoryCell:lbl_time。
