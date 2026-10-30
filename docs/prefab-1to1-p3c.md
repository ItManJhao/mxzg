# P3-c 竞技场/天梯/录像 Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| BetLayer | `prefabs/ui/bet/BetLayer.prefab` | 25 |
| BetListCell | `prefabs/ui/bet/BetListCell.prefab` | 20 |
| BetListLayer | `prefabs/ui/bet/BetListLayer.prefab` | 9 |
| BetTipLayer | `prefabs/ui/bet/BetTipLayer.prefab` | 12 |
| BiuEditLayer | `prefabs/ui/biu/BiuEditLayer.prefab` | 13 |
| LadderBattleEndLayer | `prefabs/ui/ladder/LadderBattleEndLayer.prefab` | 24 |
| LadderChallengeLayer | `prefabs/ui/ladder/LadderChallengeLayer.prefab` | 28 |
| LadderHeroTempleLayer | `prefabs/ui/ladder/LadderHeroTempleLayer.prefab` | 38 |
| LadderHistoryHighCell | `prefabs/ui/ladder/LadderHistoryHighCell.prefab` | 22 |
| LadderHistoryLayer | `prefabs/ui/ladder/LadderHistoryLayer.prefab` | 16 |
| LadderHistoryMyCell | `prefabs/ui/ladder/LadderHistoryMyCell.prefab` | 18 |
| LadderRewardCell | `prefabs/ui/ladder/LadderRewardCell.prefab` | 7 |
| LadderRewardLayer | `prefabs/ui/ladder/LadderRewardLayer.prefab` | 10 |
| LadderWarMainLayer | `prefabs/ui/ladder-war/LadderWarMainLayer.prefab` | 35 |
| LadderWarSeat | `prefabs/ui/ladder-war/LadderWarSeat.prefab` | 9 |
| LeaguePortalMainCell | `prefabs/ui/league-portal/LeaguePortalMainCell.prefab` | 3 |
| LeaguePortalMainLayer | `prefabs/ui/league-portal/LeaguePortalMainLayer.prefab` | 9 |
| PvpEndLayer | `prefabs/ui/pvp/PvpEndLayer.prefab` | 27 |
| PvpHistoryCell | `prefabs/ui/pvp/PvpHistoryCell.prefab` | 18 |
| PvpHistoryLayer | `prefabs/ui/pvp/PvpHistoryLayer.prefab` | 9 |
| PvpLayer | `prefabs/ui/pvp/PvpLayer.prefab` | 46 |
| PvpPlayerCell | `prefabs/ui/pvp/PvpPlayerCell.prefab` | 13 |
| PvpRankCell | `prefabs/ui/pvp/PvpRankCell.prefab` | 18 |
| PvpRewardCell | `prefabs/ui/pvp/PvpRewardCell.prefab` | 9 |
| VideoStudioCell | `prefabs/ui/video-studio/VideoStudioCell.prefab` | 40 |
| VideoStudioLayer | `prefabs/ui/video-studio/VideoStudioLayer.prefab` | 13 |
| VideoStudioRecordLayer | `prefabs/ui/video-studio/VideoStudioRecordLayer.prefab` | 9 |
| VideoStudioSaveLayer | `prefabs/ui/video-studio/VideoStudioSaveLayer.prefab` | 9 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/misc/fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] |
| `ui/clan/clan-boss_spr-his-cell-bg-1.png` | [0, 0, 10, 10] |
| `ui/common/win-bg_win-bg-15.png` | [9, 9, 9, 9] |
| `ui/city/main-scene_spr-level-bg.png` | [10, 10, 10, 10] |
| `ui/compare-share/compare-share_spr-line.png` | [0, 0, 20, 20] |
| `ui/compare-share/compare-share_spr-bg.png` | [5, 5, 5, 5] |
| `ui/common/win-bg_block-bg-4.png` | [9, 9, 9, 9] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/maps/map-bg-result-1.png` → P3A
- `ui/battle/battle-end_spr-title.png` → P3A
- `ui/misc/dungeon_spr-reward-cell-bg.png` → P3A
- `ui/common/other_spr-circular-1.png` → P3B2

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/rank_spr-cell-bg-1.png` [30, 30, 30, 30]（edited by P2A）
- `ui/common/win-bg_block-bg-20.png` [9, 9, 9, 9]（edited by P2A）
- `ui/common/win-bg_block-bg-22.png` [9, 9, 9, 9]（edited by P2C）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BetListLayer:/BetListLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderChallengeLayer:/LadderChallengeLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderHeroTempleLayer:/LadderHeroTempleLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderHistoryLayer:/LadderHistoryLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderRewardLayer:/LadderRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PvpHistoryLayer:/PvpHistoryLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PvpLayer:/PvpLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioLayer:/VideoStudioLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioRecordLayer:/VideoStudioRecordLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioSaveLayer:/VideoStudioSaveLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BetLayer:/BetLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BetListLayer:/BetListLayer/spr_panel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderChallengeLayer:/LadderChallengeLayer/CCNode_2/spr_bg_battle` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderHistoryLayer:/LadderHistoryLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderRewardLayer:/LadderRewardLayer/spr_my_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PvpLayer:/PvpLayer/layer_rank/spr_my_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [100, 100, 0, 0] | `PvpEndLayer:/PvpEndLayer/spr_bg` |
| `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `PvpRankCell:/PvpRankCell/CCScale9Sprite_1` |
| `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `PvpRewardCell:/PvpRewardCell/CCScale9Sprite_1` |
| `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `LadderHistoryHighCell:/LadderHistoryHighCell/spr_cell_bg` |

## BetLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BetLayer` | BetLayer | [0, 0] | [0, 0] | [540, 400] | [1, 1] | 0 | 是 |  |
| `/BetLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/BetLayer/node_title` | CCNode | [270.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BetLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BetLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「竞 猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/BetLayer/lbl_name` | UILabelTTF | [270.0, 320.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「此路是我开」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/BetLayer/spr_scroll_bg` | CCScale9Sprite | [25, 99] | [0.5, 0.5] | [490, 190] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/BetLayer/UILabelTTF_1` | UILabelTTF | [51.0, 260.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜数量：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/BetLayer/lbl_select_num` | UILabelTTF | [159.0, 260.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[0, 235, 15] |
| `/BetLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BetLayer/menu/btn_cancel` | UIMenuItemLabel | [390, 56] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「取  消」48 [122, 71, 45, 255] |
| `/BetLayer/menu/btn_confirm` | UIMenuItemLabel | [160, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确  定」48 [122, 71, 45, 255] |
| `/BetLayer/menu/btn_sub` | UIMenuItemImage | [69, 210.8] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-sub-1.png` 8d0f508a-66e9-4623-8e13-f9950b12a20f |
| `/BetLayer/menu/btn_add` | UIMenuItemImage | [328, 210.8] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-add-1.png` c2633107-824c-486d-bd35-d1ad6c1d60e7 |
| `/BetLayer/menu/btn_max` | UIMenuItemImage | [382, 210.8] | [0.5, 0.5] | [56, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-max-1.png` 13bf8aea-38a8-4fc5-9fca-16a7792df916 |
| `/BetLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BetLayer/prog_bg` | CCSprite | [199, 210.8] | [0.5, 0.5] | [202, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/buy/buy_prog-bg-1.png` 76d2b6c4-3f62-4c49-9089-5d420935e7f3 |
| `/BetLayer/UILabelTTF_2` | UILabelTTF | [51.0, 141.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可竞猜：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/BetLayer/CCSprite_1` | CCSprite | [200, 139.4] | [0.5, 0.5] | [178, 32] | [0.7, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/BetLayer/CCSprite_2` | CCSprite | [153.611, 139.4] | [0.5, 0.5] | [100, 100] | [0.27, 0.27] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/BetLayer/lbl_total_num` | UILabelTTF | [173.4, 139.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/BetLayer/UILabelTTF_3` | UILabelTTF | [286.2, 141.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可赢取：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/BetLayer/CCSprite_3` | CCSprite | [429.2, 139.4] | [0.5, 0.5] | [178, 32] | [0.7, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/BetLayer/CCSprite_4` | CCSprite | [382.811, 139.4] | [0.5, 0.5] | [100, 100] | [0.27, 0.27] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/BetLayer/lbl_win` | UILabelTTF | [402.6, 139.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[254, 255, 255] |

## BetListCell（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BetListCell` | BetListCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/BetListCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/BetListCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/BetListCell/spr_head1` | CCSprite | [61, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/BetListCell/spr_border1` | CCSprite | [61, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/BetListCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/BetListCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/BetListCell/spr_head2` | CCSprite | [201, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/BetListCell/spr_border2` | CCSprite | [201, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/BetListCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/BetListCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/BetListCell/lbl_round` | UILabelTTF | [257, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/BetListCell/UILabelTTF_1` | UILabelTTF | [257, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「投注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/BetListCell/lbl_bet_name` | UILabelTTF | [308, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名称」18 FZCSJW--GB1-0.ttf rgb[213, 112, 31] |
| `/BetListCell/lbl_bet_text` | UILabelTTF | [257, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/BetListCell/CCSprite_2` | CCSprite | [321, 35] | [0.5, 0.5] | [100, 100] | [0.25, 0.25] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/BetListCell/lbl_bet_num` | UILabelTTF | [337, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/BetListCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BetListCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/BetListCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |

## BetListLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BetListLayer` | BetListLayer | [0, 0] | [0, 0] | [590, 820] | [1, 1] | 0 | 是 |  |
| `/BetListLayer/spr_bg` | CCScale9Sprite | [295, -10] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/BetListLayer/node_title` | CCNode | [295.0, 820.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BetListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BetListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/BetListLayer/spr_panel_bg` | CCScale9Sprite | [295, 50] | [0.5, 0] | [540, 690] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/BetListLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BetListLayer/UIMenu_1/btn_close` | UIMenuItemImage | [530, 820] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BetListLayer/scroll_view` | UIScrollViewBackpack | [295, 55] | [0.5, 0] | [540, 680] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## BetTipLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BetTipLayer` | BetTipLayer | [0, 0] | [0, 0] | [550, 400] | [1, 1] | 0 | 是 |  |
| `/BetTipLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/BetTipLayer/node_title` | CCNode | [275.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BetTipLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BetTipLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「温馨提示」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/BetTipLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BetTipLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BetTipLayer/menu/btn_cancel` | UIMenuItemLabel | [165, 56.4] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd · Label「取消」38 [255, 255, 255, 255] |
| `/BetTipLayer/menu/btn_jump` | UIMenuItemLabel | [385, 56.4] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「前往参与」38 [255, 255, 255, 255] |
| `/BetTipLayer/spr_scroll_bg` | CCScale9Sprite | [276, 153] | [0.5, 0.5] | [520, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/BetTipLayer/CCSprite_1` | CCSprite | [60, 158] | [0.5, 0.5] | [70, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-bg-2.png` 6e9db8e8-4a32-4dee-ae6c-ff2088232c96 |
| `/BetTipLayer/scroll_view` | UIScrollViewBackpack | [322, 99] | [0.5, 0] | [410, 110] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## BiuEditLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/BiuEditLayer` | BiuEditLayer | [0, 0] | [0, 0] | [540, 400] | [1, 1] | 0 | 是 |  |
| `/BiuEditLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/BiuEditLayer/node_title` | CCNode | [270.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/BiuEditLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/BiuEditLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「发送弹幕」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/BiuEditLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/BiuEditLayer/menu/btn_confirm` | UIMenuItemLabel | [270, 100] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确定」48 [122, 71, 45, 255] |
| `/BiuEditLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/BiuEditLayer/lbl_title` | UILabelTTF | [243.0, 49.0] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗:」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/BiuEditLayer/spr_res` | CCSprite | [259, 50] | [0.5, 0.5] | [100, 100] | [0.35, 0.35] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/BiuEditLayer/lbl_res` | UILabelTTF | [283.0, 49.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「500」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/BiuEditLayer/lbl_tip` | UILabelTTF | [440.0, 131.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「限制40字以内」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/BiuEditLayer/spr_input_bg` | CCScale9Sprite | [19, 327] | [0, 1] | [500, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |

## LadderBattleEndLayer（24）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderBattleEndLayer` | LadderBattleEndLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/LadderBattleEndLayer/spr_wing` | CCSprite | [320, 375] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/LadderBattleEndLayer/spr_result` | CCSprite | [320, 359] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/LadderBattleEndLayer/CCSprite_1` | CCSprite | [320, -15] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/LadderBattleEndLayer/menu` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [590, 320] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/LadderBattleEndLayer/node_up` | CCNode | [320, 212] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/node_up/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0] | [510, 86] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[4, 4, 0, 0] |
| `/LadderBattleEndLayer/node_up/CCNode_1` | CCNode | [-150, 44] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/node_up/CCNode_1/spr_up_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/LadderBattleEndLayer/node_up/CCNode_1/spr_up_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/LadderBattleEndLayer/node_up/lbl_up_name` | UILabelTTF | [-97, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六个字六个字」44 STZhongsong.ttf rgbNone |
| `/LadderBattleEndLayer/node_up/lbl_up_rank` | UILabelTTF | [60, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名：9999」44 STZhongsong.ttf rgb[255, 228, 161] |
| `/LadderBattleEndLayer/node_up/spr_up_rank` | CCSprite | [200, 43] | [0.5, 0.5] | [18, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_up.png` 35d895d5-5beb-4e9e-b587-4ec28aadd706 |
| `/LadderBattleEndLayer/node_down` | CCNode | [320, 117] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/node_down/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0] | [510, 86] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[4, 4, 0, 0] |
| `/LadderBattleEndLayer/node_down/CCNode_1` | CCNode | [-150, 44] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderBattleEndLayer/node_down/CCNode_1/spr_down_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/LadderBattleEndLayer/node_down/CCNode_1/spr_down_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/LadderBattleEndLayer/node_down/lbl_down_name` | UILabelTTF | [-97, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六个字六个字」44 STZhongsong.ttf rgbNone |
| `/LadderBattleEndLayer/node_down/lbl_down_rank` | UILabelTTF | [60, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名：9999」44 STZhongsong.ttf rgb[255, 228, 161] |
| `/LadderBattleEndLayer/node_down/spr_down_rank` | CCSprite | [200, 43] | [0.5, 0.5] | [18, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_up.png` 35d895d5-5beb-4e9e-b587-4ec28aadd706 |

## LadderChallengeLayer（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderChallengeLayer` | LadderChallengeLayer | [0, 0] | [0, 0] | [540, 670] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540.0, 670.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/LadderChallengeLayer/node_title` | CCNode | [270.0, 661.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/LadderChallengeLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战对手」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/LadderChallengeLayer/menu` | UIMenu | [0, 0] | [0, 0] | [540.0, 670.0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/menu/btn_close` | UIMenuItemImage | [477.0, 634.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/LadderChallengeLayer/menu/btn_battle` | UIMenuItemLabel | [270.0, 90.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「挑 战」40 [255, 255, 255, 255] |
| `/LadderChallengeLayer/menu/btn_pass_team` | UIMenuItemCheckBox | [220.0, 151.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/LadderChallengeLayer/lbl_name` | UILabelTTF | [248, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跳过布阵」44 FZCSJW--GB1-0.ttf rgb[85, 30, 20] |
| `/LadderChallengeLayer/CCNode_1` | CCNode | [270, 510] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCNode_1/CCNode_1` | CCNode | [-130, 2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCNode_1/CCNode_1/spr_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/LadderChallengeLayer/CCNode_1/CCNode_1/spr_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/LadderChallengeLayer/CCNode_1/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [0, -49] | [0.5, 0] | [70, 32] | [0.7, 0.7] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-circular-1.png` bea85661-3c73-4593-98c2-a2650fa8f742 insets[0, 0, 14, 14] |
| `/LadderChallengeLayer/CCNode_1/CCNode_1/lbl_level` | UILabelTTF | [1, -38] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「990」36 FZCSJW--GB1-0.ttf rgbNone |
| `/LadderChallengeLayer/CCNode_1/CCNode_2` | CCNode | [-64, 2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCNode_1/CCNode_2/lbl_name` | UILabelTTF | [0, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[S0]玩家名」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/LadderChallengeLayer/CCNode_1/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/LadderChallengeLayer/CCNode_1/CCNode_2/lbl_rank` | UILabelTTF | [58, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「000」44 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/LadderChallengeLayer/CCNode_1/CCNode_2/lbl_clan_name` | UILabelTTF | [0, -35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「公会」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/LadderChallengeLayer/CCNode_2` | CCNode | [270, 175] | [0.5, 0] | [460, 220] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCNode_2/spr_bg_battle` | CCScale9Sprite | [-230.0, 0] | [0, 0] | [460.0, 220.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/LadderChallengeLayer/CCNode_2/node_hero` | CCNode | [-230.0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCNode_3` | CCNode | [305, 425] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderChallengeLayer/CCNode_3/spr_battle_count_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/LadderChallengeLayer/CCNode_3/CCSprite_1` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/LadderChallengeLayer/CCNode_3/lbl_battle_count` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |

## LadderHeroTempleLayer（38）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderHeroTempleLayer` | LadderHeroTempleLayer | [0, 0] | [0, 0] | [600, 856] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/spr_bg` | CCScale9Sprite | [300.0, 428.0] | [0.5, 0.5] | [624.0, 856.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/LadderHeroTempleLayer/node_title` | CCNode | [300.0, 848.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/LadderHeroTempleLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「英雄圣殿」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/LadderHeroTempleLayer/spr_bg` | CCSprite | [300.0, 408.0] | [0.5, 0.5] | [560, 680] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/fantasy-land-hero-temple-bg.png` 3811add6-2d5d-439f-b562-8d3251398f04 |
| `/LadderHeroTempleLayer/CCNode_1` | CCNode | [0.0, 211.891] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/UILabelTTF_1` | UILabelTTF | [300.0, 93.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「每日膜拜可获天梯积分奖励」20 STZhongsong.ttf rgbNone |
| `/LadderHeroTempleLayer/UIMenu_1` | UIMenu | [555.0, 846.4] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/UIMenu_1/btn_close` | UIMenuItemImage | [0, 3] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/LadderHeroTempleLayer/node_show_parent` | CCNode | [300.0, 391.365] | [0.5, 0.5] | [600.0, 256.8] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show3` | CCNode | [186.0, 12.84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/CCSprite_2` | CCSprite | [0, 200] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank3.png` 69422450-8daa-4591-8d9b-c48e87087d9a |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/lbl_name3` | UILabelTTF | [-0.96, 115.4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/lbl_clan3` | UILabelTTF | [-0.96, 92.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/CCMenu_1/btn_like3` | UIMenuItemImage | [-42, -144.4] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/LadderHeroTempleLayer/node_show_parent/node_show3/lbl_like3` | UILabelTTF | [0, -140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show2` | CCNode | [-186.0, 12.84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/CCSprite_2` | CCSprite | [0, 200] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank2.png` a263d50a-0908-449b-8264-e5e309e97cad |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/lbl_name2` | UILabelTTF | [-0.96, 115.4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/lbl_clan2` | UILabelTTF | [-0.96, 92.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/CCMenu_1/btn_like2` | UIMenuItemImage | [-40, -144.433] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/LadderHeroTempleLayer/node_show_parent/node_show2/lbl_like2` | UILabelTTF | [0, -140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show1` | CCNode | [0.0, 12.84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [230, 474] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-1.png` 237477ff-b2e7-41c4-bdef-c5810e15b575 |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/CCSprite_2` | CCSprite | [0, 243.96] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank1.png` 2b916702-c418-460f-a15e-6c295c2d79a5 |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/lbl_clan1` | UILabelTTF | [-0.96, 121.36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/lbl_name1` | UILabelTTF | [-0.96, 144.6] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/CCMenu_1/btn_like1` | UIMenuItemImage | [-49.86, -172.6] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/LadderHeroTempleLayer/node_show_parent/node_show1/lbl_like1` | UILabelTTF | [-0.96, -168.517] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHeroTempleLayer/node_show_parent/node_hero3` | CCNode | [186.0, 13.417] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_hero2` | CCNode | [-186.0, 13.428] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHeroTempleLayer/node_show_parent/node_hero1` | CCNode | [0.0, -6.769] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## LadderHistoryHighCell（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderHistoryHighCell` | LadderHistoryHighCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryHighCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[0, 0, 10, 10] |
| `/LadderHistoryHighCell/spr_photo_1` | CCSprite | [60, 80] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/LadderHistoryHighCell/spr_frame_1` | CCSprite | [60, 80] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/LadderHistoryHighCell/lbl_name_1` | UILabelTTF | [110, 95] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今天也不想活」44 STZhongsong.ttf rgb[202, 95, 23] |
| `/LadderHistoryHighCell/lbl_rank_tip_1` | UILabelTTF | [110, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名:」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/LadderHistoryHighCell/lbl_rank_1` | UILabelTTF | [155, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」40 STZhongsong.ttf rgb[15, 159, 0] |
| `/LadderHistoryHighCell/lbl_server_name_1` | UILabelTTF | [110, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/LadderHistoryHighCell/lbl_time` | UILabelTTF | [275, 130] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2019-12-31 23:59:59」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/LadderHistoryHighCell/spr_photo_2` | CCSprite | [350, 77] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/LadderHistoryHighCell/spr_frame_2` | CCSprite | [350, 79] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/LadderHistoryHighCell/lbl_name_2` | UILabelTTF | [400, 95] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今天也不想活」44 STZhongsong.ttf rgb[202, 95, 23] |
| `/LadderHistoryHighCell/lbl_rank_tip_2` | UILabelTTF | [400, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名:」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/LadderHistoryHighCell/lbl_rank_2` | UILabelTTF | [445, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」40 STZhongsong.ttf rgb[15, 159, 0] |
| `/LadderHistoryHighCell/lbl_server_name_2` | UILabelTTF | [400, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/LadderHistoryHighCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryHighCell/menu/btn_report` | UIMenuItemImage | [275, 35] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/LadderHistoryHighCell/menu/btn_photo_1` | CCMenuItemImage | [60, 80] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/LadderHistoryHighCell/menu/btn_photo_2` | CCMenuItemImage | [350, 80] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/LadderHistoryHighCell/spr_vs` | CCSprite | [275, 90] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/LadderHistoryHighCell/spr_win_1` | CCSprite | [30, 105] | [0.5, 0.5] | [53, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_spr-win.png` 3c242692-702d-4437-b1f7-01cf4a7f7b83 |
| `/LadderHistoryHighCell/spr_win_2` | CCSprite | [320, 105] | [0.5, 0.5] | [53, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_spr-win.png` 3c242692-702d-4437-b1f7-01cf4a7f7b83 |

## LadderHistoryLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderHistoryLayer` | LadderHistoryLayer | [0, 0] | [0, 0] | [600, 820] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/LadderHistoryLayer/node_title` | CCNode | [300.0, 820.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/LadderHistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「抢夺记录」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/LadderHistoryLayer/spr_scroll_bg` | CCScale9Sprite | [20, 30] | [0.5, 0.5] | [560, 660] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/LadderHistoryLayer/node_title` | CCNode | [300, 660] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryLayer/node_title/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [542, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-title-1.png` 9dcfb063-03dc-488f-ad05-62295623f0db |
| `/LadderHistoryLayer/node_title/lbl_title_1` | UILabelTTF | [-160, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「对手」48 STZhongsong.ttf rgb[141, 89, 58] |
| `/LadderHistoryLayer/node_title/lbl_title_2` | UILabelTTF | [120, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「详细」48 STZhongsong.ttf rgb[141, 89, 58] |
| `/LadderHistoryLayer/menu_tab` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryLayer/menu_tab/btn_tab_1` | UIMenuItemTab | [100, 688] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 · Label「我的记录」42 [122, 71, 45, 255] |
| `/LadderHistoryLayer/menu_tab/btn_tab_2` | UIMenuItemTab | [240, 688] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 · Label「大神风采」42 [122, 71, 45, 255] |
| `/LadderHistoryLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryLayer/CCMenu_1/btn_close` | UIMenuItemImage | [559, 793] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/LadderHistoryLayer/scroll_view` | UIScrollViewBackpack | [25, 35] | [0, 0] | [550, 600] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## LadderHistoryMyCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderHistoryMyCell` | LadderHistoryMyCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryMyCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-boss_spr-his-cell-bg-2.png` 620aa939-4ff6-4541-99c4-60271e48f295 |
| `/LadderHistoryMyCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/clan/clan-boss_spr-his-cell-bg-1.png` 381bb53f-8c7f-4761-a0c9-c10d74092cee insets[0, 0, 10, 10] |
| `/LadderHistoryMyCell/spr_photo` | CCSprite | [60, 80] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/LadderHistoryMyCell/spr_frame` | CCSprite | [60, 80] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/LadderHistoryMyCell/spr_level_bg` | CCSprite | [60, 40] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan_spr-level-bg.png` 6bea7811-87b0-4e87-9135-db33ac1250b3 |
| `/LadderHistoryMyCell/lbl_level` | UILabelTTF | [60, 40] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderHistoryMyCell/lbl_name` | UILabelTTF | [110, 95] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今天也不想活了」44 STZhongsong.ttf rgb[202, 95, 23] |
| `/LadderHistoryMyCell/CCSprite_1` | CCSprite | [120, 50] | [0.5, 0.5] | [18, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-invitation-4.png` 5d706295-854a-4320-a89c-1da2dd92a320 |
| `/LadderHistoryMyCell/lbl_fighting` | UILabelTTF | [135, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」48 STZhongsong.ttf rgb[120, 65, 0] |
| `/LadderHistoryMyCell/lbl_time` | UILabelTTF | [280, 65] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2019-12-31 23:59:59」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/LadderHistoryMyCell/lbl_point` | UILabelTTF | [280, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「积分: +99999」40 STZhongsong.ttf rgb[120, 65, 0] |
| `/LadderHistoryMyCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderHistoryMyCell/menu/btn_report` | UIMenuItemImage | [507, 75] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/LadderHistoryMyCell/menu/btn_photo` | CCMenuItemImage | [60, 80] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/LadderHistoryMyCell/menu/btn_share` | UIMenuItemImage | [507, 21] | [0.5, 0.5] | [78, 40] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-share_spr-share.png` 6a5ee855-143c-47c1-a15c-c09fc7406f39 |
| `/LadderHistoryMyCell/spr_result` | CCSprite | [325, 100] | [0.5, 0.5] | [111, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-boss-lang_spr-rob-1.png` 918be0ea-00bb-413e-96af-34f940d5321e |
| `/LadderHistoryMyCell/lbl_server_name` | UILabelTTF | [110, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」36 STZhongsong.ttf rgb[120, 65, 0] |

## LadderRewardCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderRewardCell` | LadderRewardCell | [0, 0] | [0, 0] | [540, 110] | [1, 1] | 0 | 是 |  |
| `/LadderRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/LadderRewardCell/spr_rank` | CCSprite | [35, 70] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/LadderRewardCell/lbl_rank` | UILabelTTF | [27, 53] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderRewardCell/lbl_my_rank` | UILabelTTF | [35, 73] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderRewardCell/lbl_my_rank_tip` | UILabelTTF | [35, 38] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[213, 112, 31] |

## LadderRewardLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderRewardLayer` | LadderRewardLayer | [0, 0] | [0, 0] | [600, 880] | [1, 1] | 0 | 是 |  |
| `/LadderRewardLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/LadderRewardLayer/node_title` | CCNode | [300.0, 880.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/LadderRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名奖励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/LadderRewardLayer/spr_rank_bg` | CCScale9Sprite | [20, 161] | [0.5, 0.5] | [560, 605] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/LadderRewardLayer/spr_my_bg` | CCScale9Sprite | [20, 30] | [0.5, 0.5] | [560, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/LadderRewardLayer/spr_ribbon` | CCSprite | [300, 135] | [0.5, 0.5] | [226, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank-lang_spr-paimingk-3.png` 6dd14941-10db-4594-b9ca-8106425f7b1a |
| `/LadderRewardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderRewardLayer/menu/btn_close` | UIMenuItemImage | [550, 855] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## LadderWarMainLayer（35）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderWarMainLayer` | LadderWarMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/spr_bg` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/fantasy-land-main-bg.png` 2605df44-92c0-45a2-814b-b1ae3ecb5849 |
| `/LadderWarMainLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 316] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 1] | [176, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_title.png` 7f287c45-5039-4f06-89d6-cd748529e09f |
| `/LadderWarMainLayer/node_top/CCNode_1/CCSprite_2` | CCSprite | [0, -123.0] | [0.5, 0.5] | [250, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-19.png` 4f1f049c-06d7-4a37-9923-55bc3d4d4a38 |
| `/LadderWarMainLayer/node_top/CCNode_1/lbl_timing` | UILabelTTF | [0, -123] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「周六00:00开启」44 STZhongsong.ttf rgb[43, 249, 0] |
| `/LadderWarMainLayer/node_top/CCNode_2` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 316.0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_2/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_2/UIMenu_1/btn_back` | UIMenuItemImage | [-71.435, -47.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/LadderWarMainLayer/node_top/CCNode_2/UIMenu_1/btn_info` | UIMenuItemImage | [-48.074, -109.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/LadderWarMainLayer/node_top/CCNode_3` | CCNode | [0.0, -143] | [0, 1] | [640.0, 118] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_3/CCScale9Sprite_1` | CCScale9Sprite | [0.0, -118.0] | [0.5, 0.5] | [640.0, 118.0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_bg-2.png` 6060b283-2a73-435d-80bd-65b6b89dec5f |
| `/LadderWarMainLayer/node_top/CCNode_3/UIMenu_1` | UIMenu | [0.0, -118] | [0, 0] | [640.0, 118.0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_3/UIMenu_1/btn_hero_temple` | UIMenuItemImage | [81.0, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_temple-btn.png` 4378ba37-f520-4050-81c3-524418808c52 |
| `/LadderWarMainLayer/node_top/CCNode_3/UIMenu_1/btn_report` | UIMenuItemImage | [203.0, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_report-btn.png` e9500541-cddf-468e-8855-6860fca2f30c |
| `/LadderWarMainLayer/node_top/CCNode_3/UIMenu_1/btn_reward` | UIMenuItemImage | [320.0, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_reward-btn.png` 58c9ddcc-bffc-4245-b662-f0bac6c2297f |
| `/LadderWarMainLayer/node_top/CCNode_3/UIMenu_1/btn_shop` | UIMenuItemImage | [437.12, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_shop-btn.png` 7f7c6477-94bc-4f20-b432-5b31a413cd1f |
| `/LadderWarMainLayer/node_top/CCNode_3/UIMenu_1/btn_rank` | UIMenuItemImage | [558.72, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_rank-btn.png` 3baed6c4-7377-4698-a2f1-d67d686d094f |
| `/LadderWarMainLayer/node_top/CCNode_4` | CCNode | [640.0, -294] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_top/CCNode_4/bg_rank` | CCSprite | [1, 0] | [1, 0.5] | [178, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_bg-1.png` 572d2464-b624-43e7-9ab0-8ed185b6af4f |
| `/LadderWarMainLayer/node_top/CCNode_4/lbl_in_rank` | UILabelTTF | [-63, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」60 STZhongsong.ttf rgbNone |
| `/LadderWarMainLayer/node_top/CCNode_4/lbl_out_rank` | UILabelTTF | [-63, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未上榜」40 STZhongsong.ttf rgb[43, 249, 0] |
| `/LadderWarMainLayer/node_bottom` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 184] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [-3.0, 97] | [0.5, 0.5] | [646.4, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_bg-4.png` 6a6f75f2-47d5-44b7-8ec7-b1ef23cd2624 |
| `/LadderWarMainLayer/node_bottom/menu_bottom` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_bottom/menu_bottom/btn_defense_team` | UIMenuItemLabel | [-118, 65] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「防守阵容」40 [255, 255, 255, 255] |
| `/LadderWarMainLayer/node_bottom/menu_bottom/btn_one_key` | UIMenuItemLabel | [118, 65] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「一键挑战」40 [255, 255, 255, 255] |
| `/LadderWarMainLayer/node_bottom/menu_bottom/btn_refresh` | UIMenuItemImage | [246.667, 143] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_refresh.png` f1c3a1a8-4883-46d3-a6c2-0a185cadcc17 |
| `/LadderWarMainLayer/node_bottom/menu_bottom/btn_add` | UIMenuItemImage | [86, 159] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land_add.png` 79104b58-25f9-48e8-acea-48800d004378 |
| `/LadderWarMainLayer/node_bottom/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_bottom/CCNode_1/UILabelTTF_1` | UILabelTTF | [122, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「一键挑战排名不变」40 STZhongsong.ttf rgbNone |
| `/LadderWarMainLayer/node_bottom/CCNode_1/node_times` | CCNode | [35, 159] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderWarMainLayer/node_bottom/CCNode_1/CCSprite_1` | CCSprite | [-60, 160] | [0.5, 0.5] | [132, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_spr_lbl_vs_times.png` c066a91b-7b43-483c-92d2-27356091134a |
| `/LadderWarMainLayer/node_bottom/CCNode_1/node_buy_times` | CCNode | [0, 126] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## LadderWarSeat（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LadderWarSeat` | LadderWarSeat | [0, 0] | [0, 0] | [210, 200] | [1, 1] | 0 | 是 |  |
| `/LadderWarSeat/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [210.0, 200.0] | [1, 1] | 0 | 是 |  |
| `/LadderWarSeat/UIMenu_1/btn_base` | UIMenuItemImage | [105.0, 100.0] | [0.5, 0.5] | [208, 200] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land_base.png` 12defcca-64a9-4fa6-997d-abcf881d3a8a |
| `/LadderWarSeat/node_root` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderWarSeat/node_root/node_animator` | CCNode | [105, 79] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LadderWarSeat/node_root/CCSprite_1` | CCSprite | [105, 57] | [0.5, 0.5] | [82, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_bg-3.png` b2e3b262-635d-4110-86e1-991d18b25c6e |
| `/LadderWarSeat/node_root/lbl_rank` | UILabelTTF | [105, 56] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 STZhongsong.ttf rgb[254, 255, 255] |
| `/LadderWarSeat/node_root/CCSprite_2` | CCSprite | [95, 19] | [0.5, 0.5] | [184, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-22.png` 1e38ebac-3ccf-4b7b-8213-0de487f8501f |
| `/LadderWarSeat/node_root/lbl_name` | UILabelTTF | [105, 18] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgbNone |

## LeaguePortalMainCell（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LeaguePortalMainCell` | LeaguePortalMainCell | [0, 0] | [0, 0] | [552, 212] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainCell/menu` | UIMenu | [0, 0] | [0, 0] | [552.0, 212.0] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainCell/menu/bg` | UIMenuItemImage | [276.0, 106.0] | [0.5, 0.5] | [554, 214] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_fantasy-land-1.png` 9fe31c6c-3541-4c33-b6e6-7c7460ea5c9d |

## LeaguePortalMainLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LeaguePortalMainLayer` | LeaguePortalMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainLayer/spr_bg` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/league-portal-main-bg.png` 6d40b41f-fa9d-4b40-9e02-ba057dbd2397 |
| `/LeaguePortalMainLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 100] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainLayer/node_top/CCNode_1` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 100.0] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainLayer/node_top/CCNode_1/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainLayer/node_top/CCNode_1/UIMenu_1/btn_back` | UIMenuItemImage | [-81.435, -40.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/LeaguePortalMainLayer/node_top/CCNode_2` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/LeaguePortalMainLayer/node_top/CCNode_2/CCSprite_1` | CCSprite | [0, -72] | [0.5, 0.5] | [274, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/slzm/slzm_slzmtitlek.png` 2ee8ea1d-c220-45a9-ae91-d7c139ceb7fc |
| `/LeaguePortalMainLayer/node_top/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, -71] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跨服时空」64 STZhongsong.ttf rgbNone |

## PvpEndLayer（27）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpEndLayer` | PvpEndLayer | [0, 0] | [0, 0] | [640, 450] | [1, 1] | 0 | 是 |  |
| `/PvpEndLayer/spr_bg` | CCScale9Sprite | [320, -2] | [0.5, 0] | [640, 490] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[100, 100, 0, 0] |
| `/PvpEndLayer/spr_wing` | CCSprite | [320, 475] | [0.5, 0.5] | [600, 190] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-3.png` 3678b33b-74c6-491c-af70-242792c29b25 |
| `/PvpEndLayer/spr_result` | CCSprite | [320, 475] | [0.5, 0.5] | [320, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-3.png` 315ff116-6beb-41bf-8218-afc80a1a5064 |
| `/PvpEndLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 291] | [0.5, 0.5] | [640, 190] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/PvpEndLayer/spr_reward_tip` | CCSprite | [122, 122] | [0.5, 0.5] | [72, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/pvp-lang_spr-reward-tip.png` 08a569d8-7d0b-4ed2-96c3-a611f29dccac |
| `/PvpEndLayer/CCSprite_1` | CCSprite | [323, 296.8] | [0.5, 0.5] | [78, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/PvpEndLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpEndLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [170, -47] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 pressed `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「确 定」52 [255, 255, 255, 255] |
| `/PvpEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [593, 363] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/PvpEndLayer/CCMenu_1/btn_back` | UIMenuItemLabel | [470, -47] | [0.5, 0.5] | [196, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「返回竞技场」52 [255, 255, 255, 255] |
| `/PvpEndLayer/node_hero_1` | CCNode | [150, 305] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PvpEndLayer/node_hero_1/spr_head1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_1.png` 611ac9d1-345c-40df-b539-98cb5d0dedc4 |
| `/PvpEndLayer/node_hero_1/spr_border1` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PvpEndLayer/node_hero_1/lbl_name1` | UILabelTTF | [0, 57] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字」40 STZhongsong.ttf rgb[254, 237, 62] |
| `/PvpEndLayer/node_hero_1/CCSprite_1` | CCSprite | [-73, -75] | [0.5, 0.5] | [58, 54] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_crown.png` 1240a534-225a-4e9d-b3b5-bc46397e8ad2 |
| `/PvpEndLayer/node_hero_1/lbl_score1` | UILabelTTF | [-53, -78] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10000」44 STZhongsong.ttf rgb[255, 227, 183] |
| `/PvpEndLayer/node_hero_1/spr_up_down_1` | CCSprite | [20, -78] | [0.5, 0.5] | [21, 26] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/pvp_spr-up.png` 85df2b5e-7093-420c-9be9-202b005f5624 |
| `/PvpEndLayer/node_hero_1/lbl_add_score1` | UILabelTTF | [34, -78] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「20」44 STZhongsong.ttf rgb[255, 235, 195] |
| `/PvpEndLayer/node_hero_2` | CCNode | [480, 305] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PvpEndLayer/node_hero_2/spr_head2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_1.png` 611ac9d1-345c-40df-b539-98cb5d0dedc4 |
| `/PvpEndLayer/node_hero_2/spr_border2` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PvpEndLayer/node_hero_2/lbl_name2` | UILabelTTF | [0, 57] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字」40 STZhongsong.ttf rgb[255, 231, 183] |
| `/PvpEndLayer/node_hero_2/CCSprite_1` | CCSprite | [-73, -75] | [0.5, 0.5] | [58, 54] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_crown.png` 1240a534-225a-4e9d-b3b5-bc46397e8ad2 |
| `/PvpEndLayer/node_hero_2/lbl_score2` | UILabelTTF | [-53, -78] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10000」44 STZhongsong.ttf rgb[255, 235, 195] |
| `/PvpEndLayer/node_hero_2/spr_up_down_2` | CCSprite | [20, -78] | [0.5, 0.5] | [21, 26] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/pvp_spr-down.png` 72229361-1ca6-4b1a-85ac-11cb228cd184 |
| `/PvpEndLayer/node_hero_2/lbl_add_score2` | UILabelTTF | [34, -78] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「20」24 STZhongsong.ttf rgb[247, 42, 14] |

## PvpHistoryCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpHistoryCell` | PvpHistoryCell | [0, 0] | [0, 0] | [540, 120] | [1, 1] | 0 | 是 |  |
| `/PvpHistoryCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-15.png` e8c7c4ae-b048-45b0-9299-9929f32e0fbc insets[10, 10, 10, 10] |
| `/PvpHistoryCell/lbl_name_self` | UILabelTTF | [80, 21] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」32 FZCSJW--GB1-0.ttf rgb[243, 218, 172] |
| `/PvpHistoryCell/lbl_score` | UILabelTTF | [335, 28] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-5」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/PvpHistoryCell/spr_head_self` | CCSprite | [80, 66.553] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/PvpHistoryCell/spr_clan_photo` | CCSprite | [80, 66.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PvpHistoryCell/CCSprite_1` | CCSprite | [80, 40] | [0.5, 0.5] | [56, 22] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/PvpHistoryCell/lbl_level_self` | UILabelTTF | [80, 39.8] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」30 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/PvpHistoryCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpHistoryCell/CCMenu_1/btn_battle` | UIMenuItemLabel | [460, 60] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「回 放」40 [255, 255, 255, 255] |
| `/PvpHistoryCell/UILabelTTF_1` | UILabelTTF | [150, 62] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「VS」64 FZCSJW--GB1-0.ttf rgb[243, 218, 172] |
| `/PvpHistoryCell/spr_head_enemy` | CCSprite | [220, 66.553] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/PvpHistoryCell/spr_border_enemy` | CCSprite | [220, 66.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PvpHistoryCell/CCSprite_2` | CCSprite | [220, 40] | [0.5, 0.5] | [56, 22] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/PvpHistoryCell/lbl_level_enemy` | UILabelTTF | [220, 39.8] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」30 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/PvpHistoryCell/lbl_name_enemy` | UILabelTTF | [220, 21] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」32 FZCSJW--GB1-0.ttf rgb[243, 218, 172] |
| `/PvpHistoryCell/lbl_battle_status` | UILabelTTF | [300, 65] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「防守成功」42 FZCSJW--GB1-0.ttf rgb[243, 218, 172] |
| `/PvpHistoryCell/CCSprite_3` | CCSprite | [315, 28] | [0.5, 0.5] | [58, 54] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_crown.png` 1240a534-225a-4e9d-b3b5-bc46397e8ad2 |

## PvpHistoryLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpHistoryLayer` | PvpHistoryLayer | [0, 0] | [0, 0] | [600, 880] | [1, 1] | 0 | 是 |  |
| `/PvpHistoryLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/PvpHistoryLayer/node_title` | CCNode | [300.0, 880.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PvpHistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/PvpHistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战记录」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/PvpHistoryLayer/spr_bg` | CCScale9Sprite | [20, 44] | [0.5, 0.5] | [560, 720] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/PvpHistoryLayer/scroll_view` | CCScrollView | [25, 48] | [0, 0] | [550, 710] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/PvpHistoryLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpHistoryLayer/menu/btn_close` | UIMenuItemImage | [550, 855] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## PvpLayer（46）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpLayer` | PvpLayer | [0, 0] | [0, 0] | [600, 860] | [1, 1] | 0 | 是 |  |
| `/PvpLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 880] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/PvpLayer/spr_champions_bg` | CCSprite | [300, 918] | [0.5, 0.5] | [640, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/pvp-lang_spr-banner.png` 0c1df0b9-1880-4fb9-af21-331595e9a997 |
| `/PvpLayer/node_title` | CCNode | [300.0, 860.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PvpLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/PvpLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「竞技场」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/PvpLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpLayer/menu/btn_close` | UIMenuItemImage | [550, 835] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PvpLayer/menu/btn_battle_list` | UIMenuItemTab | [90, 725] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「挑 战」48 [122, 71, 45, 255] |
| `/PvpLayer/menu/btn_rank` | UIMenuItemTab | [230, 725] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「排 名」48 [122, 71, 45, 255] |
| `/PvpLayer/menu/btn_daily_reward` | UIMenuItemTab | [370, 725] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「日常奖励」48 [122, 71, 45, 255] |
| `/PvpLayer/menu/btn_season_reward` | UIMenuItemTab | [510, 725] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「赛季奖励」48 [122, 71, 45, 255] |
| `/PvpLayer/menu/btn_champion` | UIMenuItemImage | [68, 916] | [0.5, 0.5] | [112, 94] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/pvp-lang_btn-champion.png` 32255b09-7aa5-47bc-858c-7246c59dd82d |
| `/PvpLayer/layer_battle_list` | CCLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpLayer/layer_battle_list/spr_area_bg` | CCScale9Sprite | [20, 267] | [0.5, 0.5] | [560, 460] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/PvpLayer/layer_battle_list/spr_point_bg` | CCScale9Sprite | [0, 20] | [0.5, 0.5] | [600, 140] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/pvp_spr-point-bg.png` cfd3ffcf-071f-4486-9da0-10328db53110 |
| `/PvpLayer/layer_battle_list/progress_point_bg` | CCSprite | [250, 85] | [0.5, 0.5] | [476, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/pvp_progress-point-bg.png` f43be855-212a-4b2d-bbec-5497ec4fc14a |
| `/PvpLayer/layer_battle_list/spr_my_rank_num_bg` | CCScale9Sprite | [30, 683] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/PvpLayer/layer_battle_list/spr_my_score_num_bg` | CCScale9Sprite | [200, 683] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/PvpLayer/layer_battle_list/CCSprite_1` | CCSprite | [440, 170] | [0.5, 0.5] | [41, 41] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/PvpLayer/layer_battle_list/spr_res_bg` | CCSprite | [501, 700] | [0.5, 0.5] | [100, 24] | [1.3, 1.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-res-bg-1.png` 6a51d6da-8248-4ecc-b08a-13448d7d7223 |
| `/PvpLayer/layer_battle_list/spr_res_icon` | CCSprite | [444, 700] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900501.png` 005b4f86-f97d-4324-a43b-955ac1e91e2b |
| `/PvpLayer/layer_battle_list/lbl_my_rank_num` | UILabelTTF | [110, 700] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名: 1000」40 STZhongsong.ttf rgb[255, 249, 197] |
| `/PvpLayer/layer_battle_list/lbl_my_score_num` | UILabelTTF | [281, 700] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的积分: 1000」40 STZhongsong.ttf rgb[255, 249, 197] |
| `/PvpLayer/layer_battle_list/lbl_num` | UILabelTTF | [498, 700] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「30」40 STZhongsong.ttf rgb[254, 255, 254] |
| `/PvpLayer/layer_battle_list/scroll_view_battle` | CCScrollView | [25, 270] | [0, 0] | [550, 405] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/PvpLayer/layer_battle_list/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpLayer/layer_battle_list/CCMenu_1/btn_request` | UIMenuItemLabel | [90, 230] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「防守阵容」44 [255, 255, 255, 255] |
| `/PvpLayer/layer_battle_list/CCMenu_1/btn_history` | UIMenuItemLabel | [300, 230] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「挑战记录」44 [255, 255, 255, 255] |
| `/PvpLayer/layer_battle_list/CCMenu_1/btn_refresh` | UIMenuItemLabel | [510, 230] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「刷新对手」44 [255, 255, 255, 255] |
| `/PvpLayer/layer_battle_list/CCMenu_1/btn_add` | UIMenuItemImage | [550, 700] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/PvpLayer/layer_battle_list/CCMenu_1/btn_shop` | UIMenuItemImage | [550, 80] | [0.5, 0.5] | [66, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-shop.png` cd3f7542-06ef-4fb7-9197-057911ec9a61 |
| `/PvpLayer/layer_battle_list/CCMenu_1/btn_cross_battle` | UIMenuItemCheckBox | [440, 170] | [0.5, 0.5] | [41, 41] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 pressed `ui/common/setting_spr-check-1.png` f07f0ab2-9843-4f68-b841-8c72a2de07c6 |
| `/PvpLayer/layer_battle_list/lbl_time` | UILabelTTF | [510, 230] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「12:12:12」20 STZhongsong.ttf rgbNone |
| `/PvpLayer/layer_battle_list/lbl_end_time_title` | UILabelTTF | [25, 180] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「距离结束: 」44 STZhongsong.ttf rgb[131, 98, 69] |
| `/PvpLayer/layer_battle_list/lbl_season_end_time` | UILabelTTF | [125, 180] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2天04:06:00」44 STZhongsong.ttf rgb[32, 166, 0] |
| `/PvpLayer/layer_battle_list/lbl_point_title` | UILabelTTF | [25, 140] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「每周宝箱」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/PvpLayer/layer_battle_list/lbl_point_num` | UILabelTTF | [135, 140] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已挑战9次」36 STZhongsong.ttf rgb[255, 208, 110] |
| `/PvpLayer/layer_battle_list/lbl_cross_battle` | UILabelTTF | [470, 170] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跳过战斗」44 STZhongsong.ttf rgb[131, 98, 69] |
| `/PvpLayer/layer_battle_list/menu_point` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpLayer/layer_rank` | CCLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | **否** |  |
| `/PvpLayer/layer_rank/spr_rank_bg` | CCScale9Sprite | [20, 181] | [0.5, 0.5] | [560, 546] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/PvpLayer/layer_rank/spr_my_bg` | CCScale9Sprite | [20, 35] | [0.5, 0.5] | [560, 135] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/PvpLayer/layer_rank/lbl_cd_day` | UILabelTTF | [580, 35] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「下次结算：11小时11分11秒」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/PvpLayer/layer_rank/lbl_cd_week` | UILabelTTF | [580, 35] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「下次结算：1天」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/PvpLayer/layer_rank/spr_ribbon` | CCSprite | [300, 160] | [0.5, 0.5] | [226, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank-lang_spr-paimingk-3.png` 6dd14941-10db-4594-b9ca-8106425f7b1a |

## PvpPlayerCell（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpPlayerCell` | PvpPlayerCell | [0, 0] | [0, 0] | [550, 128] | [1, 1] | 0 | 是 |  |
| `/PvpPlayerCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 128] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/PvpPlayerCell/lbl_name` | UILabelTTF | [120, 90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」52 STZhongsong.ttf rgb[141, 89, 58] |
| `/PvpPlayerCell/lbl_score` | UILabelTTF | [120, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「积分: 5」40 STZhongsong.ttf rgb[231, 117, 42] |
| `/PvpPlayerCell/lbl_combat_num` | UILabelTTF | [240, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「战力: 10000」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/PvpPlayerCell/CCSprite_1` | CCSprite | [240, 65] | [0.5, 0.5] | [342, 5] | [0.7, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e |
| `/PvpPlayerCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpPlayerCell/menu/btn_battle` | UIMenuItemLabel | [470, 64] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「挑  战」40 [255, 255, 255, 255] |
| `/PvpPlayerCell/menu/btn_photo` | CCMenuItemImage | [70, 75] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/PvpPlayerCell/spr_head` | CCSprite | [70, 70] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/PvpPlayerCell/spr_clan_photo` | CCSprite | [70, 70] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005010.png` 46fe8eb0-d2bc-41f7-a1bd-659fc3d2a23c |
| `/PvpPlayerCell/CCSprite_2` | CCSprite | [70, 30] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/PvpPlayerCell/lbl_level` | UILabelTTF | [70, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」42 STZhongsong.ttf rgb[254, 255, 255] |

## PvpRankCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpRankCell` | PvpRankCell | [0, 0] | [0, 0] | [540, 110] | [1, 1] | 0 | 是 |  |
| `/PvpRankCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 128] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[40, 40, 40, 40] |
| `/PvpRankCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 128] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/PvpRankCell/spr_rank` | CCSprite | [35, 92] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/PvpRankCell/spr_head` | CCSprite | [100, 70] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/PvpRankCell/spr_frame` | CCSprite | [100, 70] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005012.png` f5a469e7-95d7-4367-a548-b5215b3b5a6e |
| `/PvpRankCell/CCSprite_1` | CCSprite | [100, 35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/PvpRankCell/CCSprite_2` | CCSprite | [245, 60] | [0.5, 0.5] | [342, 5] | [0.6, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e |
| `/PvpRankCell/lbl_level` | UILabelTTF | [100, 35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」42 STZhongsong.ttf rgb[254, 255, 255] |
| `/PvpRankCell/lbl_name` | UILabelTTF | [140, 85] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六字真言真六」52 STZhongsong.ttf rgb[159, 108, 74] |
| `/PvpRankCell/lbl_type` | UILabelTTF | [400, 30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「积分」40 STZhongsong.ttf rgb[175, 127, 92] |
| `/PvpRankCell/lbl_num` | UILabelTTF | [450, 30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」40 STZhongsong.ttf rgb[237, 137, 54] |
| `/PvpRankCell/lbl_rank` | UILabelTTF | [35, 60] | [0.5, 0.5] | auto | [0.25, 0.25] | 0 | 是 | cc.Label「未上榜」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/PvpRankCell/lbl_combat_num` | UILabelTTF | [165, 38] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1234567」40 STZhongsong.ttf rgb[159, 108, 74] |
| `/PvpRankCell/CCSprite_3` | CCSprite | [150, 38] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/PvpRankCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpRankCell/menu/btn_photo` | CCMenuItemImage | [100, 70] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/PvpRankCell/menu/btn_like` | UIMenuItemLabel | [451, 75] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「赞:0」40 [255, 255, 255, 255] |

## PvpRewardCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PvpRewardCell` | PvpRewardCell | [0, 0] | [0, 0] | [540, 110] | [1, 1] | 0 | 是 |  |
| `/PvpRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[40, 40, 40, 40] |
| `/PvpRewardCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/PvpRewardCell/spr_rank` | CCSprite | [35, 70] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/PvpRewardCell/lbl_rank` | UILabelTTF | [27, 53] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/PvpRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PvpRewardCell/lbl_my_rank` | UILabelTTF | [35, 73] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」52 STZhongsong.ttf rgb[254, 255, 255] |
| `/PvpRewardCell/lbl_my_rank_tip` | UILabelTTF | [35, 38] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[213, 112, 31] |
| `/PvpRewardCell/lbl_unrank_tip` | UILabelTTF | [335, 55] | [0, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「保持排名可获得」52 STZhongsong.ttf rgb[254, 255, 255] |

## VideoStudioCell（40）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/VideoStudioCell` | VideoStudioCell | [0, 0] | [0, 0] | [560, 480] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node` | CCNode | [10, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 480] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-panel-bg.png` 82b6aaa4-0420-4e7b-a5e4-52e585f65f7d |
| `/VideoStudioCell/node/CCNode_1` | CCNode | [48.96, 429.12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node/CCNode_1/spr_photo1` | CCSprite | [0, -8] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/VideoStudioCell/node/CCNode_1/spr_frame1` | CCSprite | [0, -8] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/VideoStudioCell/node/CCNode_1/spr_win1` | CCSprite | [-36, 25] | [0.5, 0.5] | [40, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/compare-share-lang_spr-win.png` 9badd8ae-c81e-4689-9711-74440083e414 |
| `/VideoStudioCell/node/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [-27.36, -70] | [0.5, 0.5] | [58, 24] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef insets[10, 10, 10, 10] |
| `/VideoStudioCell/node/CCNode_1/lbl_level1` | UILabelTTF | [2.84, -58] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」18 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/VideoStudioCell/node/CCNode_1/lbl_name1` | UILabelTTF | [66.0, 8.6] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」22 FZCSJW--GB1-0.ttf rgb[199, 90, 26] |
| `/VideoStudioCell/node/CCNode_1/lbl_clan1` | UILabelTTF | [66, -19.56] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」18 FZCSJW--GB1-0.ttf rgb[39, 138, 34] |
| `/VideoStudioCell/node/CCNode_1/CCSprite_1` | CCSprite | [66, -48.2] | [0, 0.5] | [20, 18] | [1, 0.9454] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/VideoStudioCell/node/CCNode_1/lbl_battle1` | UILabelTTF | [92.8, -46.2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」24 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/VideoStudioCell/node/CCNode_2` | CCNode | [490, 429.12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node/CCNode_2/spr_photo2` | CCSprite | [0, -8] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/VideoStudioCell/node/CCNode_2/spr_frame2` | CCSprite | [0, -8] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/VideoStudioCell/node/CCNode_2/spr_win2` | CCSprite | [-36, 25] | [0.5, 0.5] | [40, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/compare-share-lang_spr-win.png` 9badd8ae-c81e-4689-9711-74440083e414 |
| `/VideoStudioCell/node/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [-27.36, -70] | [0.5, 0.5] | [58, 24] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef insets[10, 10, 10, 10] |
| `/VideoStudioCell/node/CCNode_2/lbl_level2` | UILabelTTF | [2.84, -58] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」18 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/VideoStudioCell/node/CCNode_2/lbl_name2` | UILabelTTF | [-68.4, 8.6] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」22 FZCSJW--GB1-0.ttf rgb[199, 90, 26] |
| `/VideoStudioCell/node/CCNode_2/CCSprite_1` | CCSprite | [-68.4, -47] | [1, 0.5] | [20, 18] | [1, 0.9454] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/VideoStudioCell/node/CCNode_2/lbl_battle2` | UILabelTTF | [-95, -45] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」24 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/VideoStudioCell/node/CCNode_2/lbl_clan2` | UILabelTTF | [-68.4, -18.36] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」18 FZCSJW--GB1-0.ttf rgb[39, 138, 34] |
| `/VideoStudioCell/node/CCScale9Sprite_2` | CCScale9Sprite | [17.0, 341.28] | [0.5, 0.5] | [510, 12] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/compare-share/compare-share_spr-line.png` f58d94ba-bd56-4963-8549-ec04d0abbe48 insets[0, 0, 20, 20] |
| `/VideoStudioCell/node/CCSprite_1` | CCSprite | [63.456, 319.152] | [0.5, 0.5] | [80, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/compare-share-lang_spr-challenge.png` adb938fa-a451-4fc8-8def-74b51c1fe348 |
| `/VideoStudioCell/node/CCSprite_2` | CCSprite | [482.7, 319.2] | [0.5, 0.5] | [80, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/compare-share-lang_spr-defender.png` 40ee26b0-0826-4c99-af1f-93351fec4062 |
| `/VideoStudioCell/node/CCScale9Sprite_3` | CCScale9Sprite | [22, 13] | [0.5, 0.5] | [144, 284] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/compare-share/compare-share_spr-bg.png` efbadf6e-4db8-45a3-8802-dbcb74f3da0f insets[5, 5, 5, 5] |
| `/VideoStudioCell/node/node_list_1` | CCNode | [94, 155] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node/CCScale9Sprite_4` | CCScale9Sprite | [380, 13] | [0.5, 0.5] | [144, 284] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/compare-share/compare-share_spr-bg.png` efbadf6e-4db8-45a3-8802-dbcb74f3da0f insets[5, 5, 5, 5] |
| `/VideoStudioCell/node/node_list_2` | CCNode | [452, 155] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node/CCSprite_3` | CCSprite | [270, 250.8] | [0.5, 0.5] | [190, 125] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-lightning.png` a6f7a913-82b1-4281-9ad5-b459acff5b0f |
| `/VideoStudioCell/node/CCSprite_4` | CCSprite | [270, 250.8] | [0.5, 0.5] | [78, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/VideoStudioCell/node/lbl_time` | UILabelTTF | [270, 112.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」18 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/VideoStudioCell/node/lbl_type` | UILabelTTF | [270, 90] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「自由切磋」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/VideoStudioCell/node/btn_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioCell/node/btn_menu/btn_playback` | UIMenuItemImage | [270, 160] | [0.5, 0.5] | [46, 56] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-playback.png` a0040334-118e-43b6-8ff5-3aa5014ff1c6 |
| `/VideoStudioCell/node/btn_menu/btn_share` | UIMenuItemImage | [211.2, 40] | [0.5, 0.5] | [52, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-share.png` 8e631488-988a-4c8d-bcef-7c83ecfc27c2 |
| `/VideoStudioCell/node/btn_menu/btn_data` | UIMenuItemImage | [274, 40] | [0.5, 0.5] | [52, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-data.png` 931f7bb5-457c-4a32-8020-118f05150239 |
| `/VideoStudioCell/node/btn_menu/btn_saved` | UIMenuItemImage | [338.4, 40] | [0.5, 0.5] | [52, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-collect1.png` f56a6ced-7c73-4b59-9fc9-422ff5772dea |
| `/VideoStudioCell/node/btn_menu/btn_cannel` | UIMenuItemImage | [338.4, 40] | [0.5, 0.5] | [63, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-cannel.png` 67479b8c-91b6-466d-9de9-f4f33ae6baca |

## VideoStudioLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/VideoStudioLayer` | VideoStudioLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/VideoStudioLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/VideoStudioLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「录像馆」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/VideoStudioLayer/spr_bg` | CCScale9Sprite | [36.6, 105] | [0.5, 0.5] | [568, 691] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-4.png` 40b17191-9807-4ed6-b2ff-341e633aaddc insets[10, 10, 10, 10] |
| `/VideoStudioLayer/lbl_tips` | UILabelTTF | [320, 80] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」22 STZhongsong.ttf rgb[122, 71, 45] |
| `/VideoStudioLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/VideoStudioLayer/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioLayer/CCMenu_2/btn_saved` | UIMenuItemImage | [490, -12] | [0.5, 0.5] | [78, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-collect.png` 9f5f9621-e468-41de-8e44-6be8ae58559a |
| `/VideoStudioLayer/CCMenu_2/btn_record` | UIMenuItemImage | [583, -12.0] | [0.5, 0.5] | [76, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-record.png` 91ba3fde-e239-4b3a-9812-480e0533b21b |
| `/VideoStudioLayer/scroll_view_tab` | CCScrollView | [320, 792] | [0.5, 0] | [550, 50] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## VideoStudioRecordLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/VideoStudioRecordLayer` | VideoStudioRecordLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioRecordLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/VideoStudioRecordLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioRecordLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/VideoStudioRecordLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「个人记录」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/VideoStudioRecordLayer/spr_bg` | CCScale9Sprite | [36.6, 105] | [0.5, 0.5] | [568, 720] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-4.png` 40b17191-9807-4ed6-b2ff-341e633aaddc insets[10, 10, 10, 10] |
| `/VideoStudioRecordLayer/lbl_tips` | UILabelTTF | [320, 80] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」22 STZhongsong.ttf rgb[122, 71, 45] |
| `/VideoStudioRecordLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioRecordLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## VideoStudioSaveLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/VideoStudioSaveLayer` | VideoStudioSaveLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioSaveLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/VideoStudioSaveLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/VideoStudioSaveLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/VideoStudioSaveLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的收藏」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/VideoStudioSaveLayer/spr_bg` | CCScale9Sprite | [36.6, 105] | [0.5, 0.5] | [568, 720] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-4.png` 40b17191-9807-4ed6-b2ff-341e633aaddc insets[10, 10, 10, 10] |
| `/VideoStudioSaveLayer/lbl_tips` | UILabelTTF | [320, 80] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「英雄列表」22 STZhongsong.ttf rgb[122, 71, 45] |
| `/VideoStudioSaveLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/VideoStudioSaveLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
