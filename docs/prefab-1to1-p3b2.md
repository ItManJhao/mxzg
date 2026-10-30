# P3-b 爬塔/副本/试炼（下） Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| RainbowBattleEndLayer | `prefabs/ui/rainbow/RainbowBattleEndLayer.prefab` | 17 |
| RainbowChallengeLayer | `prefabs/ui/rainbow/RainbowChallengeLayer.prefab` | 57 |
| RainbowHistoryCell | `prefabs/ui/rainbow/RainbowHistoryCell.prefab` | 12 |
| RainbowHistoryLayer | `prefabs/ui/rainbow/RainbowHistoryLayer.prefab` | 10 |
| RainbowMainLayer | `prefabs/ui/rainbow/RainbowMainLayer.prefab` | 22 |
| RainbowSeat | `prefabs/ui/rainbow/RainbowSeat.prefab` | 8 |
| STMagicTowerBattleEndLayer | `prefabs/ui/st/STMagicTowerBattleEndLayer.prefab` | 13 |
| STMagicTowerEndLoseCell | `prefabs/ui/st/STMagicTowerEndLoseCell.prefab` | 2 |
| STMagicTowerJumpLayer | `prefabs/ui/st/STMagicTowerJumpLayer.prefab` | 6 |
| STMagicTowerMainLayer | `prefabs/ui/st/STMagicTowerMainLayer.prefab` | 22 |
| STMagicTowerMissionRewardCell | `prefabs/ui/st/STMagicTowerMissionRewardCell.prefab` | 4 |
| STMagicTowerMissionRewardLayer | `prefabs/ui/st/STMagicTowerMissionRewardLayer.prefab` | 7 |
| STMagicTowerRankCell | `prefabs/ui/st/STMagicTowerRankCell.prefab` | 11 |
| STMagicTowerRankLayer | `prefabs/ui/st/STMagicTowerRankLayer.prefab` | 15 |
| STMagicTowerRankRewardCell | `prefabs/ui/st/STMagicTowerRankRewardCell.prefab` | 6 |
| STMagicTowerRankRewardLayer | `prefabs/ui/st/STMagicTowerRankRewardLayer.prefab` | 13 |
| STMagicTowerSeat | `prefabs/ui/st/STMagicTowerSeat.prefab` | 11 |
| TrialBoxInfoLayer | `prefabs/ui/trial/TrialBoxInfoLayer.prefab` | 9 |
| TrialHelpCell | `prefabs/ui/trial/TrialHelpCell.prefab` | 9 |
| TrialHelpLayer | `prefabs/ui/trial/TrialHelpLayer.prefab` | 11 |
| TrialInfoLayer | `prefabs/ui/trial/TrialInfoLayer.prefab` | 59 |
| TrialLayer | `prefabs/ui/trial/TrialLayer.prefab` | 18 |
| TrialMapLayer | `prefabs/ui/trial/TrialMapLayer.prefab` | 2 |
| UnderworldPagodaBattleEndLayer | `prefabs/ui/underworld-pagoda/UnderworldPagodaBattleEndLayer.prefab` | 10 |
| UnderworldPagodaBossLayer | `prefabs/ui/underworld-pagoda/UnderworldPagodaBossLayer.prefab` | 58 |
| UnderworldPagodaLayer | `prefabs/ui/underworld-pagoda/UnderworldPagodaLayer.prefab` | 23 |
| UnderworldPagodaRankCell | `prefabs/ui/underworld-pagoda/UnderworldPagodaRankCell.prefab` | 18 |
| UnderworldPagodaRankLayer | `prefabs/ui/underworld-pagoda/UnderworldPagodaRankLayer.prefab` | 46 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/common/other_spr-circular-1.png` | [0, 0, 13, 13] |
| `ui/common/win-bg_text-bg-2.png` | [3, 3, 0, 0] |
| `ui/common/win-bg_cell-bg-10.png` | [39, 2, 0, 0] |
| `ui/common/win-bg_line-2.png` | [0, 0, 9, 9] |
| `ui/common/win-bg_cell-bg-9.png` | [49, 6, 9, 9] |
| `ui/misc/fantasy-land_bg-2.png` | [9, 101, 0, 0] |
| `ui/common/win-bg_text-bg.png` | [9, 9, 0, 0] |
| `ui/misc/trial_spr-reward-bg-1.png` | [30, 30, 30, 30] |
| `ui/misc/underworld-pagoda_spr-underworld-pagoda-jinengbg.png` | [22, 21, 22, 21] |
| `ui/city/main-city_spr-mian-storagebg.png` | [20, 20, 20, 20] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/maps/map-bg-result-1.png` → P3A
- `ui/battle/battle-end_spr-title.png` → P3A
- `ui/clan/clan_spr-bg-mission-rank.png` → P3B1

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/common/rank_spr-cell-bg-1.png` [30, 30, 30, 30]（edited by P2A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RainbowChallengeLayer:/RainbowChallengeLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RainbowHistoryLayer:/RainbowHistoryLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `STMagicTowerRankLayer:/STMagicTowerRankLayer/node_rank/spr__rank_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TrialHelpLayer:/TrialHelpLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TrialInfoLayer:/TrialInfoLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `UnderworldPagodaRankLayer:/UnderworldPagodaRankLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [74, 74, 74, 74] | `STMagicTowerRankRewardLayer:/STMagicTowerRankRewardLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `RainbowHistoryCell:/RainbowHistoryCell/node_item/item_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RainbowHistoryLayer:/RainbowHistoryLayer/CCNode_1/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `TrialInfoLayer:/TrialInfoLayer/node_pannel/spr_pannel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `UnderworldPagodaBossLayer:/UnderworldPagodaBossLayer/node_bottom/node_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerMissionRewardCell:/STMagicTowerMissionRewardCell/spr_cell_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerRankLayer:/STMagicTowerRankLayer/node_rank/spr_rank_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerRankRewardLayer:/STMagicTowerRankRewardLayer/spr_reward_scroll_view_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `STMagicTowerBattleEndLayer:/STMagicTowerBattleEndLayer/spr_bg` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `STMagicTowerJumpLayer:/STMagicTowerJumpLayer/spr_bg` |
| `win-bg_line-2.png` | [0, 0, 9, 9] | [0, 0, 2, 2] | `RainbowChallengeLayer:/RainbowChallengeLayer/CCNode_2/CCScale9Sprite_2` |
| `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `STMagicTowerRankRewardCell:/STMagicTowerRankRewardCell/CCScale9Sprite_1` |

## RainbowBattleEndLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RainbowBattleEndLayer` | RainbowBattleEndLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/RainbowBattleEndLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/RainbowBattleEndLayer/spr_wing` | CCSprite | [320, 375] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-1.png` 155643f6-e4d0-421f-b34a-1615d95a10d0 |
| `/RainbowBattleEndLayer/spr_result` | CCSprite | [320, 359] | [0.5, 0.5] | [178, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-1.png` a553aa8f-5f2f-4870-83b8-4e50763fb5c0 |
| `/RainbowBattleEndLayer/CCSprite_1` | CCSprite | [320, -15] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/RainbowBattleEndLayer/menu` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RainbowBattleEndLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RainbowBattleEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [590, 320] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/RainbowBattleEndLayer/spr_title` | CCSprite | [320.0, 246.0] | [0.5, 0.5] | [194, 86] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/rainbow/rainbow_title-1.png` 8dd1a26b-9944-4e18-b8d5-2d76db5549f5 |
| `/RainbowBattleEndLayer/node_attr_1` | CCNode | [320, 122] | [0.5, 0] | [510, 42] | [1, 1] | 0 | 是 |  |
| `/RainbowBattleEndLayer/node_attr_1/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [510, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[4, 4, 0, 0] |
| `/RainbowBattleEndLayer/node_attr_1/lbl_attr_name_1` | UILabelTTF | [0.0, 21.0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击：」48 STZhongsong.ttf rgbNone |
| `/RainbowBattleEndLayer/node_attr_1/lbl_attr_value_1` | UILabelTTF | [5.0, 21.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+100%」50 STZhongsong.ttf rgb[255, 228, 161] |
| `/RainbowBattleEndLayer/node_attr_2` | CCNode | [320, 62] | [0.5, 0] | [510, 42] | [1, 1] | 0 | 是 |  |
| `/RainbowBattleEndLayer/node_attr_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [510, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[4, 4, 0, 0] |
| `/RainbowBattleEndLayer/node_attr_2/lbl_attr_name_2` | UILabelTTF | [0.0, 21.0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击：」48 STZhongsong.ttf rgbNone |
| `/RainbowBattleEndLayer/node_attr_2/lbl_attr_value_2` | UILabelTTF | [5.0, 21.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+100%」50 STZhongsong.ttf rgb[255, 228, 161] |

## RainbowChallengeLayer（57）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RainbowChallengeLayer` | RainbowChallengeLayer | [0, 0] | [0, 0] | [640, 982] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640.0, 982.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RainbowChallengeLayer/node_title` | CCNode | [320.0, 974.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RainbowChallengeLayer/node_title/title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣殿挑战」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RainbowChallengeLayer/CCNode_1` | CCNode | [320.0, 860.0] | [0.5, 1] | [560, 320] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 1] | [560, 320] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/rainbow-bg-2.png` eeff20cf-242e-4248-b721-62705401e174 |
| `/RainbowChallengeLayer/CCNode_1/node_owner` | CCNode | [-280.0, 7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/node_owner/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/node_owner/UIMenu_1/btn_head` | UIMenuItemImage | [70, -75] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_10.png` b9442150-02a4-4f75-ab0f-bbdd38d9da8c |
| `/RainbowChallengeLayer/CCNode_1/node_owner/node_head` | CCNode | [70, -75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/node_owner/node_head/spr_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/RainbowChallengeLayer/CCNode_1/node_owner/node_head/CCScale9Sprite_1` | CCScale9Sprite | [-30, 11] | [0.5, 0] | [32, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-circular-1.png` bea85661-3c73-4593-98c2-a2650fa8f742 insets[0, 0, 14, 14] |
| `/RainbowChallengeLayer/CCNode_1/node_owner/node_head/lbl_level` | UILabelTTF | [-29, 28] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「990」36 STZhongsong.ttf rgbNone |
| `/RainbowChallengeLayer/CCNode_1/node_owner/CCNode_1` | CCNode | [69, 2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/node_owner/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, -17] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前占有者」44 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/CCNode_1/node_owner/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [0, -140] | [0.5, 0.5] | [150, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_text-bg-2.png` f18304f1-201d-4063-9905-0610378cc53f insets[4, 4, 0, 0] |
| `/RainbowChallengeLayer/CCNode_1/node_owner/CCNode_1/lbl_name` | UILabelTTF | [0, -140] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名」36 STZhongsong.ttf rgb[253, 229, 190] |
| `/RainbowChallengeLayer/CCNode_1/node_root` | CCNode | [0.0, -320.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/node_root/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0] | [208, 200] | [1.3, 1.3] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_base.png` 12defcca-64a9-4fa6-997d-abcf881d3a8a |
| `/RainbowChallengeLayer/CCNode_1/node_root/node_animator` | CCNode | [0, 97] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_1/node_root/spr_title` | CCSprite | [-0.6, 283.4] | [0.5, 0.5] | [194, 86] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/rainbow/rainbow_title-3.png` 9af0f8d8-d332-490f-8762-ebe0ab1d80f0 |
| `/RainbowChallengeLayer/CCNode_1/node_root/spr_evolution_bg` | CCSprite | [-1, 28] | [0.5, 0.5] | [250, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-19.png` 4f1f049c-06d7-4a37-9923-55bc3d4d4a38 |
| `/RainbowChallengeLayer/node_skill` | CCNode | [320, 532] | [0.5, 1] | [564, 174] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/node_skill/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 1] | [564.0, 174.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-10.png` cbca1b2b-ec55-4585-b570-b5d3c708dbd7 insets[40, 4, 0, 0] |
| `/RainbowChallengeLayer/node_skill/UILabelTTF_1` | UILabelTTF | [0.0, -20.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣殿英雄技能」44 STZhongsong.ttf rgb[253, 229, 190] |
| `/RainbowChallengeLayer/node_skill/UILabelTTF_2` | UILabelTTF | [-228.0, -60] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「主动技能」40 STZhongsong.ttf rgb[231, 117, 42] |
| `/RainbowChallengeLayer/node_skill/UILabelTTF_3` | UILabelTTF | [17.0, -60.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「被动技能」40 STZhongsong.ttf rgb[231, 117, 42] |
| `/RainbowChallengeLayer/node_skill/scroll_view_passive` | CCScrollView | [-24.8, -169.8] | [0, 0] | [300, 100] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/RainbowChallengeLayer/CCNode_2` | CCNode | [320, 353] | [0.5, 1] | [564, 140] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [564, 145] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-10.png` cbca1b2b-ec55-4585-b570-b5d3c708dbd7 insets[40, 4, 0, 0] |
| `/RainbowChallengeLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [0.0, -19.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣殿称号属性加成」44 STZhongsong.ttf rgb[253, 229, 190] |
| `/RainbowChallengeLayer/CCNode_2/CCScale9Sprite_2` | CCScale9Sprite | [0.0, -91.0] | [0.5, 0] | [541.44, 4.487] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e insets[0, 0, 3, 3] |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_1` | CCNode | [-213.0, -63] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_1/spr_attr_addition_1` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-1.png` acdedbc0-3822-47d2-90f3-0bfc6f0d74b4 |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_1/lbl_attr_addition_1` | UILabelTTF | [32, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命+99%」40 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_2` | CCNode | [93.0, -63] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_2/spr_attr_addition_2` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-1.png` acdedbc0-3822-47d2-90f3-0bfc6f0d74b4 |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_2/lbl_attr_addition_2` | UILabelTTF | [32, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命+99%」40 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_3` | CCNode | [-214.0, -114] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_3/spr_attr_addition_3` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-1.png` acdedbc0-3822-47d2-90f3-0bfc6f0d74b4 |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_3/lbl_attr_addition_3` | UILabelTTF | [32, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命+99%」40 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_4` | CCNode | [92.0, -114] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_4/spr_attr_addition_4` | CCSprite | [0, 0] | [0.5, 0.5] | [46, 46] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-attr-1.png` acdedbc0-3822-47d2-90f3-0bfc6f0d74b4 |
| `/RainbowChallengeLayer/CCNode_2/node_attr_addition_4/lbl_attr_addition_4` | UILabelTTF | [32, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命+99%」40 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/node_bottom` | CCNode | [321, 210] | [0.5, 1] | [560, 170] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/node_bottom/UILabelTTF_1` | UILabelTTF | [-227.0, -33] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「进化1次」44 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/node_bottom/UILabelTTF_2` | UILabelTTF | [-20.0, -33] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「进化5次」44 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/node_bottom/UILabelTTF_3` | UILabelTTF | [181.0, -33] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「进化10次」44 STZhongsong.ttf rgb[131, 98, 69] |
| `/RainbowChallengeLayer/node_bottom/UILabelTTF_4` | UILabelTTF | [168.0, -62] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「(难度大请谨慎)」32 STZhongsong.ttf rgb[239, 95, 71] |
| `/RainbowChallengeLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640.0, 982.0] | [1, 1] | 0 | 是 |  |
| `/RainbowChallengeLayer/menu/btn_close` | UIMenuItemImage | [576.0, 947.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RainbowChallengeLayer/menu/btn_battle` | UIMenuItemLabel | [320.0, 112.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「挑 战」40 [255, 255, 255, 255] |
| `/RainbowChallengeLayer/menu/btn_evolution_1` | UIMenuItemCheckBox | [63.0, 181.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/RainbowChallengeLayer/menu/btn_evolution_2` | UIMenuItemCheckBox | [270.0, 181.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/RainbowChallengeLayer/menu/btn_evolution_3` | UIMenuItemCheckBox | [471.0, 181.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/RainbowChallengeLayer/menu/btn_battle_record` | UIMenuItemImage | [546.0, 807.0] | [0.5, 0.5] | [86, 72] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-vs-report.png` 6af0580c-2345-406b-b062-e24a95b3883a |

## RainbowHistoryCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RainbowHistoryCell` | RainbowHistoryCell | [0, 0] | [0, 0] | [544, 186] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [544.0, 186.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-9.png` 3c615efb-80a1-422a-a6ee-d9e66895e82e insets[50, 8, 10, 10] |
| `/RainbowHistoryCell/lbl_name` | UILabelTTF | [16, 162] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 STZhongsong.ttf rgb[253, 251, 230] |
| `/RainbowHistoryCell/CCNode_1` | CCNode | [0, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryCell/CCNode_1/CCSprite_1` | CCSprite | [25, 0] | [0.5, 0.5] | [18, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-invitation-4.png` 5d706295-854a-4320-a89c-1da2dd92a320 |
| `/RainbowHistoryCell/CCNode_1/lbl_power` | UILabelTTF | [40, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」34 STZhongsong.ttf rgb[120, 65, 0] |
| `/RainbowHistoryCell/lbl_time` | UILabelTTF | [520, 164] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/RainbowHistoryCell/menu` | UIMenu | [0, 0] | [0, 0] | [544.0, 186.0] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryCell/menu/btn_replay` | UIMenuItemImage | [484.0, 57.0] | [0.5, 0.5] | [78, 78] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-5.png` 1c014ff0-226e-4d25-a48d-9750f07596fd |
| `/RainbowHistoryCell/node_item` | CCNode | [16, 57] | [0, 0.5] | [410, 80] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryCell/node_item/item_bg` | CCScale9Sprite | [0, -40.0] | [0.5, 0.5] | [410.0, 80.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[8, 8, 8, 8] |
| `/RainbowHistoryCell/node_item/menu` | UIMenu | [0, -40.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## RainbowHistoryLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RainbowHistoryLayer` | RainbowHistoryLayer | [0, 0] | [0, 0] | [640, 980] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640.0, 980.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RainbowHistoryLayer/node_title` | CCNode | [320.0, 972.016] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RainbowHistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战记录」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RainbowHistoryLayer/CCNode_1` | CCNode | [321.28, 853.0] | [0.5, 1] | [563.2, 793.8] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryLayer/CCNode_1/spr_scroll_bg` | CCScale9Sprite | [-281.6, -793.8] | [0.5, 0.5] | [563.2, 793.8] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RainbowHistoryLayer/CCNode_1/scroll_view` | CCScrollView | [0.0, -396.8] | [0.5, 0.5] | [552, 777.924] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/RainbowHistoryLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640.0, 980.0] | [1, 1] | 0 | 是 |  |
| `/RainbowHistoryLayer/CCMenu_1/btn_close` | UIMenuItemImage | [574.0, 946.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## RainbowMainLayer（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RainbowMainLayer` | RainbowMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/spr_bg` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/rainbow-bg.jpg` 766b0e9f-b09a-4e81-a472-3daae7391a7f |
| `/RainbowMainLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 140] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_top/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [0, -93.0] | [0.5, 0.5] | [332, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-title-1.png` 412aa638-3416-4429-92e5-725f2db81152 |
| `/RainbowMainLayer/node_top/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, -90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「彩虹圣殿」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/RainbowMainLayer/node_top/CCNode_2` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 140.0] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_top/CCNode_2/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_top/CCNode_2/UIMenu_1/btn_back` | UIMenuItemImage | [-71.435, -47.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/RainbowMainLayer/node_top/CCNode_2/UIMenu_1/btn_info` | UIMenuItemImage | [-48.074, -109.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/RainbowMainLayer/node_bottom` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 170] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [-2.0, 0] | [0.5, 0.5] | [640.0, 170.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_bg-2.png` 6060b283-2a73-435d-80bd-65b6b89dec5f insets[10, 102, 0, 0] |
| `/RainbowMainLayer/node_bottom/UILabelTTF_1` | UILabelTTF | [320.0, 138.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战条件」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/RainbowMainLayer/node_bottom/CCNode_1` | CCNode | [320.0, 97.92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_bottom/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「彩虹之主：竞技场排名前    名」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/RainbowMainLayer/node_bottom/CCNode_1/lbl_rank_1` | UILabelTTF | [101, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」40 STZhongsong.ttf rgb[0, 249, 0] |
| `/RainbowMainLayer/node_bottom/CCNode_2` | CCNode | [320.0, 66.98] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_bottom/CCNode_2/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「彩虹骑士：竞技场排名前    名」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/RainbowMainLayer/node_bottom/CCNode_2/lbl_rank_2` | UILabelTTF | [101, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」40 STZhongsong.ttf rgb[0, 249, 0] |
| `/RainbowMainLayer/node_bottom/CCNode_3` | CCNode | [320.0, 37.06] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowMainLayer/node_bottom/CCNode_3/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「彩虹护卫：竞技场排名前    名」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/RainbowMainLayer/node_bottom/CCNode_3/lbl_rank_3` | UILabelTTF | [101, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」40 STZhongsong.ttf rgb[0, 249, 0] |

## RainbowSeat（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RainbowSeat` | RainbowSeat | [0, 0] | [0, 0] | [210, 200] | [1, 1] | 0 | 是 |  |
| `/RainbowSeat/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [210.0, 200.0] | [1, 1] | 0 | 是 |  |
| `/RainbowSeat/UIMenu_1/btn_base` | UIMenuItemImage | [105.0, 100.0] | [0.5, 0.5] | [208, 200] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land_base.png` 12defcca-64a9-4fa6-997d-abcf881d3a8a |
| `/RainbowSeat/node_root` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowSeat/node_root/node_animator` | CCNode | [105, 79] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RainbowSeat/node_root/spr_title` | CCSprite | [105, 213] | [0.5, 0.5] | [194, 86] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/rainbow/rainbow_title-3.png` 9af0f8d8-d332-490f-8762-ebe0ab1d80f0 |
| `/RainbowSeat/node_root/CCSprite_1` | CCSprite | [95, 49] | [0.5, 0.5] | [184, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-22.png` 1e38ebac-3ccf-4b7b-8213-0de487f8501f |
| `/RainbowSeat/node_root/lbl_name` | UILabelTTF | [105, 48] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgb[254, 255, 255] |

## STMagicTowerBattleEndLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerBattleEndLayer` | STMagicTowerBattleEndLayer | [0, 0] | [0, 0] | [640, 596] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerBattleEndLayer/spr_bg` | CCScale9Sprite | [0, 32] | [0.5, 0.5] | [640, 502] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[130, 130, 0, 0] |
| `/STMagicTowerBattleEndLayer/spr_wing` | CCSprite | [320, 501] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/STMagicTowerBattleEndLayer/spr_result` | CCSprite | [320, 481] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/STMagicTowerBattleEndLayer/CCSprite_1` | CCSprite | [320, 16] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/STMagicTowerBattleEndLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerBattleEndLayer/menu/btn_report` | CCMenuItemImage | [581, 435] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/STMagicTowerBattleEndLayer/node_win` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/STMagicTowerBattleEndLayer/node_win/spr_top_bg` | CCScale9Sprite | [328, 389] | [0.5, 0.5] | [442, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f insets[10, 10, 0, 0] |
| `/STMagicTowerBattleEndLayer/node_win/spr_comment` | CCSprite | [144, 390] | [0.5, 0.5] | [92, 52] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/time-tower_word-sss.png` 9365410b-19c6-4e95-811d-5128cf2abb19 |
| `/STMagicTowerBattleEndLayer/node_win/lbl_hdwp` | UILabelTTF | [320, 341] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得物品」40 CloudYuanCuGBK.ttf rgb[255, 233, 149] |
| `/STMagicTowerBattleEndLayer/node_win/node_reward` | CCNode | [320, 260] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerBattleEndLayer/node_win/node_reward/win_menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## STMagicTowerEndLoseCell（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerEndLoseCell` | STMagicTowerEndLoseCell | [0, 0] | [0, 0] | [640, 380] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerEndLoseCell/spr_top_bg` | CCScale9Sprite | [320.0, 341.05] | [0.5, 0.5] | [512, 84] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f insets[10, 10, 0, 0] |

## STMagicTowerJumpLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerJumpLayer` | STMagicTowerBattleEndLayer | [0, 0] | [0, 0] | [640.0, 596] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerJumpLayer/spr_bg` | CCScale9Sprite | [320.0, 32.0] | [0.5, 0] | [640, 502] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[130, 130, 0, 0] |
| `/STMagicTowerJumpLayer/CCSprite_1` | CCSprite | [320.0, 527.0] | [0.5, 0.5] | [322, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/time-tower-lang_word-jump.png` 94b0f837-03ce-4f9a-8627-bdf7c9431dee |
| `/STMagicTowerJumpLayer/CCSprite_2` | CCSprite | [320.0, 16.0] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/STMagicTowerJumpLayer/lbl_hdwp` | UILabelTTF | [320.0, 341.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得物品」40 CloudYuanCuGBK.ttf rgb[255, 233, 149] |
| `/STMagicTowerJumpLayer/spr_top_bg` | CCScale9Sprite | [328.0, 419.0] | [0.5, 0.5] | [442, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f insets[10, 10, 0, 0] |

## STMagicTowerMainLayer（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerMainLayer` | STMagicTowerMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMainLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 250] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMainLayer/node_top/CCSprite_1` | CCSprite | [320.0, -23.0] | [0.5, 1] | [229, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/time-tower_title-bg.png` 12e1360e-d401-4071-aa9b-d87599fd97e4 |
| `/STMagicTowerMainLayer/node_top/top_menu` | CCMenu | [0.0, -250.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMainLayer/node_top/top_menu/btn_mission_reward` | UIMenuItemLabel | [61.667, -117.567] | [0.5, 0.5] | [63, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/time-tower_reward-icon.png` 13340213-dd5e-4fdb-a920-2c50045d52cd · Label「本层奖励」32 [255, 255, 255, 255] |
| `/STMagicTowerMainLayer/node_top/lbl_mission` | UILabelTTF | [320.0, -71.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」48 CloudYuanCuGBK.ttf rgb[238, 204, 170] |
| `/STMagicTowerMainLayer/node_top/spr_tip_bg` | CCSprite | [115.0, -228.0] | [0.5, 0.5] | [253, 243] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-bg-9.png` 26eceba2-67f3-40cc-a197-394fdb05710b |
| `/STMagicTowerMainLayer/node_top/spr_tip_bg/lbl_pass` | UILabelTTF | [-79.5, 35.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「本周累计通关：」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/STMagicTowerMainLayer/node_top/spr_tip_bg/lbl_max_record` | UILabelTTF | [-79.5, 10.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「最高纪录：」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/STMagicTowerMainLayer/node_top/spr_tip_bg/lbl_condition_title` | UILabelTTF | [-79.5, -11.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「特殊条件：」36 CloudYuanCuGBK.ttf rgb[255, 190, 55] |
| `/STMagicTowerMainLayer/node_top/spr_tip_bg/lbl_condition` | UILabelTTF | [-79.5, -33.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/STMagicTowerMainLayer/node_top/top_menu_2` | CCMenu | [575.0, -66.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMainLayer/node_top/top_menu_2/btn_back` | UIMenuItemImage | [-5, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/STMagicTowerMainLayer/node_top/top_menu_2/btn_info` | UIMenuItemImage | [26.926, -67.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/STMagicTowerMainLayer/node_bottom` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 120] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMainLayer/node_bottom/bottom_menu` | CCMenu | [0.0, 0.566] | [0, 0] | [640.0, 100] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMainLayer/node_bottom/bottom_menu/btn_challenge` | UIMenuItemLabel | [320.0, 30.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「開始挑戰」52 [255, 255, 255, 255] |
| `/STMagicTowerMainLayer/node_bottom/bottom_menu/btn_rank` | UIMenuItemLabel | [608.0, 30.0] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-rank.png` 3ec50aa3-85d4-4fa2-8ebc-b3521e7753c3 · Label「排行榜」32 [255, 255, 255, 255] |
| `/STMagicTowerMainLayer/node_bottom/bottom_menu/btn_reward` | UIMenuItemLabel | [531.2, 30.0] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-reward.png` 58fde771-0a34-4d61-b28c-6947dca43fde · Label「奖励一览」32 [255, 255, 255, 255] |
| `/STMagicTowerMainLayer/node_bottom/bottom_menu/btn_lineup` | UIMenuItemLabel | [32.0, 30.0] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-lineup.png` ec2266e1-21b7-48fb-a657-237772ad525a · Label「阵容调整」32 [255, 255, 255, 255] |
| `/STMagicTowerMainLayer/node_bottom/bottom_menu/btn_shop` | UIMenuItemLabel | [108.8, 30.0] | [0.5, 0.5] | [58, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-shop.png` 7021ad25-7b73-4f38-85d2-03ca78e48d6a · Label「魔塔商店」32 [255, 255, 255, 255] |
| `/STMagicTowerMainLayer/node_bottom/lbl_end_tip` | UILabelTTF | [320.0, 36.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「已達最高層數」50 CloudYuanCuGBK.ttf rgb[253, 246, 222] |

## STMagicTowerMissionRewardCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerMissionRewardCell` | STMagicTowerMissionRewardCell | [0, 0] | [0, 0] | [538, 174] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMissionRewardCell/spr_cell_bg` | CCScale9Sprite | [0.0, 174.0] | [0, 1] | [538, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[20, 20, 20, 20] |
| `/STMagicTowerMissionRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMissionRewardCell/lbl_mission_title` | UILabelTTF | [269, 156] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「第8888關通關獎勵」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |

## STMagicTowerMissionRewardLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerMissionRewardLayer` | STMagicTowerMissionRewardLayer | [0, 0] | [0, 0] | [630, 636] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMissionRewardLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630, 636] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/STMagicTowerMissionRewardLayer/node_title` | CCNode | [315.0, 636.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerMissionRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/STMagicTowerMissionRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「獎勵預覽」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/STMagicTowerMissionRewardLayer/CCSprite_1` | CCSprite | [320, -9] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/STMagicTowerMissionRewardLayer/scroll_view` | UIScrollViewBackpack | [315.0, 52.0] | [0.5, 0] | [550, 500] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## STMagicTowerRankCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerRankCell` | STMagicTowerRankCell | [0, 0] | [0, 0] | [540, 110] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankCell/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 108] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/STMagicTowerRankCell/spr_rank` | CCSprite | [45, 75] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/STMagicTowerRankCell/spr_head` | CCSprite | [117, 56] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/STMagicTowerRankCell/lbl_name` | UILabelTTF | [175, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六字真言真六」44 STZhongsong.ttf rgb[122, 71, 45] |
| `/STMagicTowerRankCell/lbl_power` | UILabelTTF | [175, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」44 STZhongsong.ttf rgb[189, 86, 23] |
| `/STMagicTowerRankCell/lbl_rank` | UILabelTTF | [45, 57] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/STMagicTowerRankCell/spr_frame` | CCSprite | [117, 56] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/STMagicTowerRankCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankCell/menu/btn_role` | UIMenuItemImage | [117, 56] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/STMagicTowerRankCell/lbl_pass_lv` | UILabelTTF | [352, 55] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「第8888层」22 CloudYuanCuGBK.ttf rgb[122, 71, 45] |

## STMagicTowerRankLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerRankLayer` | STMagicTowerRankLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankLayer/spr_bg` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage.jpg` 27914e23-9760-423b-b0d3-f2627fc57396 |
| `/STMagicTowerRankLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 140] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankLayer/node_top/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [0, -93.0] | [0.5, 0.5] | [332, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-title-1.png` 412aa638-3416-4429-92e5-725f2db81152 |
| `/STMagicTowerRankLayer/node_top/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, -90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跨服排行榜」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/STMagicTowerRankLayer/node_top/CCNode_2` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 140.0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankLayer/node_top/CCNode_2/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankLayer/node_top/CCNode_2/UIMenu_1/btn_back` | UIMenuItemImage | [-71.435, -47.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/STMagicTowerRankLayer/node_rank` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 460] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankLayer/node_rank/spr__rank_bg` | CCScale9Sprite | [10.0, 0] | [0.5, 0.5] | [620.0, 460.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/STMagicTowerRankLayer/node_rank/lbl_my_rank` | UILabelTTF | [82.0, 59.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名：未上榜」36 STZhongsong.ttf rgb[142, 90, 60] |
| `/STMagicTowerRankLayer/node_rank/lbl_my_mission` | UILabelTTF | [562.0, 59.0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的记录：第999关」36 STZhongsong.ttf rgb[142, 90, 60] |
| `/STMagicTowerRankLayer/node_rank/spr_rank_scroll_view_bg` | CCScale9Sprite | [320.0, 419.0] | [0.5, 1] | [540.0, 340.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[20, 20, 20, 20] |
| `/STMagicTowerRankLayer/node_rank/scroll_view` | UIScrollViewBackpack | [320.0, 88.0] | [0.5, 0] | [540.0, 320.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## STMagicTowerRankRewardCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerRankRewardCell` | STMagicTowerRankRewardCell | [0, 0] | [0, 0] | [550, 108] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 108] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[40, 40, 40, 40] |
| `/STMagicTowerRankRewardCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 108] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/STMagicTowerRankRewardCell/spr_rank` | CCSprite | [57, 70] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/STMagicTowerRankRewardCell/lbl_rank` | UILabelTTF | [28.0, 54.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0-0」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/STMagicTowerRankRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## STMagicTowerRankRewardLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerRankRewardLayer` | STMagicTowerRankRewardLayer | [0, 0] | [0, 0] | [630, 876] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankRewardLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630, 876] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[75, 75, 75, 75] |
| `/STMagicTowerRankRewardLayer/node_title` | CCNode | [315.0, 876.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerRankRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/STMagicTowerRankRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行奖励」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/STMagicTowerRankRewardLayer/CCSprite_1` | CCSprite | [320, -9] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/STMagicTowerRankRewardLayer/spr_reward_scroll_view_bg` | CCScale9Sprite | [315.0, 791.0] | [0.5, 1] | [560, 670] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[20, 20, 20, 20] |
| `/STMagicTowerRankRewardLayer/scroll_view` | UIScrollViewBackpack | [315.0, 130.0] | [0.5, 0] | [550, 650] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/STMagicTowerRankRewardLayer/lbl_my_rank` | UILabelTTF | [40, 102] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名：未上榜」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/STMagicTowerRankRewardLayer/UILabelTTF_1` | UILabelTTF | [40, 76] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「每周排名进入前100可获得奖励」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/STMagicTowerRankRewardLayer/lbl_my_record` | UILabelTTF | [418, 102] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的记录：第」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/STMagicTowerRankRewardLayer/UILabelTTF_2` | UILabelTTF | [571, 102] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「關」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/STMagicTowerRankRewardLayer/lbl_mission` | UILabelTTF | [549, 102] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |

## STMagicTowerSeat（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/STMagicTowerSeat` | STMagicTowerSeat | [0, 0] | [0, 0] | [248, 280] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerSeat/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [248.0, 280.0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerSeat/UIMenu_1/btn_base` | UIMenuItemImage | [124.0, 0.0] | [0.5, 0] | [246, 140] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/time-tower_rank-stage-icon.png` f4927637-cafa-43a2-8df5-ca10254d2fb1 |
| `/STMagicTowerSeat/node_root` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerSeat/node_root/node_animator` | CCNode | [124, 110] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/STMagicTowerSeat/node_root/CCSprite_1` | CCSprite | [124, 58] | [0.5, 0.5] | [184, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-22.png` 1e38ebac-3ccf-4b7b-8213-0de487f8501f |
| `/STMagicTowerSeat/node_root/lbl_name` | UILabelTTF | [124, 58] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgb[255, 226, 56] |
| `/STMagicTowerSeat/node_root/node_attack` | CCNode | [124, 23] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/STMagicTowerSeat/node_root/node_attack/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/STMagicTowerSeat/node_root/node_attack/spr_attack` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/STMagicTowerSeat/node_root/spr_rank` | CCSprite | [124, 100] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank1.png` 2b916702-c418-460f-a15e-6c295c2d79a5 |

## TrialBoxInfoLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TrialBoxInfoLayer` | TrialBoxInfoLayer | [0, 0] | [0, 0] | [464, 300] | [1, 1] | 0 | 是 |  |
| `/TrialBoxInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [464, 300] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/TrialBoxInfoLayer/node_title` | CCNode | [232.0, 292.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialBoxInfoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/TrialBoxInfoLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖 励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/TrialBoxInfoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialBoxInfoLayer/CCMenu_1/btn_close` | UIMenuItemImage | [410, 295] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TrialBoxInfoLayer/CCMenu_1/btn_start` | UIMenuItemImage | [232, 70] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 |
| `/TrialBoxInfoLayer/node_award` | CCNode | [0, 156] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## TrialHelpCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TrialHelpCell` | TrialHelpCell | [0, 0] | [0, 0] | [566, 152] | [1, 1] | 0 | 是 |  |
| `/TrialHelpCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [566, 152] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/TrialHelpCell/lbl_hero_name` | UILabelTTF | [179, 111] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「[我是渣渣辉]」22 STZhongsong.ttf rgb[213, 112, 31] |
| `/TrialHelpCell/CCSprite_1` | CCSprite | [188, 76] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TrialHelpCell/lbl_fight` | UILabelTTF | [202, 75] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/TrialHelpCell/lbl_friend_name` | UILabelTTF | [179, 44] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/TrialHelpCell/show_flight` | CCSprite | [472, 72] | [0.5, 0.5] | [112, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dream-lang/dream-lang_spr-zlgg.png` ead4512c-f4a8-4657-8e73-561d8250df00 |
| `/TrialHelpCell/hero_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialHelpCell/hero_menu/btn_enter` | UIMenuItemLabel | [472, 72] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」24 [255, 255, 255, 255] |

## TrialHelpLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TrialHelpLayer` | TrialHelpLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialHelpLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 980] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TrialHelpLayer/node_title` | CCNode | [320.0, 960.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialHelpLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TrialHelpLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「好友助战」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/TrialHelpLayer/my_hero_bg` | CCScale9Sprite | [35, 65] | [0.5, 0.5] | [570, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/TrialHelpLayer/lbl_tip` | UILabelTTF | [324, 45] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「好友助战好友助战好友助战好友助战好友助战好友助战好友助战」20 STZhongsong.ttf rgb[159, 108, 74] |
| `/TrialHelpLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialHelpLayer/menu/btn_close` | UIMenuItemImage | [580, 935] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TrialHelpLayer/menu/btn_friend` | UIMenuItemTab | [114, 814] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/TrialHelpLayer/menu/btn_reward` | UIMenuItemTab | [258, 814] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |

## TrialInfoLayer（59）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TrialInfoLayer` | TrialInfoLayer | [0, 0] | [0, 0] | [540, 680] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [560, 700] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TrialInfoLayer/node_title` | CCNode | [270.0, 680.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TrialInfoLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「试炼关卡」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TrialInfoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/CCMenu_1/btn_close` | UIMenuItemImage | [480, 680] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TrialInfoLayer/CCMenu_1/btn_start` | UIMenuItemImage | [270, 70] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 |
| `/TrialInfoLayer/node_award` | CCNode | [270, 170] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_award/menu_reward` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/CCNode_1` | CCNode | [0, 560] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/CCNode_1/spr_photo` | CCSprite | [90, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TrialInfoLayer/CCNode_1/spr_frame` | CCSprite | [90, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/TrialInfoLayer/CCNode_1/CCSprite_1` | CCSprite | [90, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TrialInfoLayer/CCNode_1/lbl_level` | UILabelTTF | [90, -35] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「101」18 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TrialInfoLayer/CCNode_1/lbl_name` | UILabelTTF | [150, 16] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今晚请吃饭」24 FZCSJW--GB1-0.ttf rgb[132, 85, 61] |
| `/TrialInfoLayer/CCNode_1/CCNode_1` | CCNode | [250, -30] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/CCNode_1/CCNode_1/spr_battle_count_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/TrialInfoLayer/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/TrialInfoLayer/CCNode_1/CCNode_1/lbl_bat` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/TrialInfoLayer/node_pannel` | CCNode | [270, 240] | [0.5, 0] | [480, 240] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/spr_pannel_bg` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [480, 240] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/TrialInfoLayer/node_pannel/menu_hero` | UIMenu | [-240.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/CCSprite_1` | CCSprite | [-200.0, 180] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/TrialInfoLayer/node_pannel/CCSprite_1/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「前排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TrialInfoLayer/node_pannel/CCSprite_2` | CCSprite | [-200.0, 70] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/TrialInfoLayer/node_pannel/CCSprite_2/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「后排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TrialInfoLayer/node_pannel/node_icon_4` | CCNode | [-120.0, 180] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_4/spr_lock_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_3` | CCNode | [-20.0, 180] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_3/spr_lock_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_2` | CCNode | [80.0, 180] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_2/spr_lock_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_1` | CCNode | [180.0, 180] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_1/spr_lock_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_8` | CCNode | [-120.0, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_8/spr_lock_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_7` | CCNode | [-20.0, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_7/spr_lock_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_6` | CCNode | [80.0, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_6/spr_lock_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TrialInfoLayer/node_pannel/node_icon_5` | CCNode | [180.0, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialInfoLayer/node_pannel/node_icon_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TrialInfoLayer/node_pannel/node_icon_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TrialInfoLayer/node_pannel/node_icon_5/spr_lock_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |

## TrialLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TrialLayer` | TrialLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/TrialLayer/scroll_view` | CCScrollView | [0.0, 0.0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/TrialLayer/node_top` | CCNode | [589.0, 840.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialLayer/node_top/menu_btn` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TrialLayer/node_top/menu_btn/CCMenuItemImage_1` | CCMenuItemImage | [-40, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/TrialLayer/node_top/menu_btn/CCMenuItemImage_2` | CCMenuItemImage | [-4, -150] | [0.5, 0.5] | [77, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/trial-lang_btn-shop.png` 06655732-3fd7-41b3-8b10-9d868f4f89b0 |
| `/TrialLayer/node_top/menu_btn/CCMenuItemImage_3` | CCMenuItemImage | [-4, -70] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/TrialLayer/node_top/menu_btn/btn_help` | UIMenuItemImage | [-4, -240] | [0.5, 0.5] | [77, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/trial-lang_btn-help.png` 7236cd17-e051-4d25-85bd-be7adb4a04f8 |
| `/TrialLayer/spr_title` | CCSprite | [360.0, 855.0] | [0.5, 0.5] | [320, 92] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/trial_spr-title-bg.png` c55b52fc-e3b2-4313-a26e-f0ed93844360 |
| `/TrialLayer/spr_title/lbl_title` | UILabelTTF | [0.0, -23.489] | [0.5, 0.5] | auto | [0.55, 0.55] | 0 | 是 | cc.Label「勇者试炼」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/TrialLayer/node_reward_info` | CCNode | [0.0, 806.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TrialLayer/node_reward_info/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0, 1] | [200, 148] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/trial_spr-reward-bg-1.png` 007789b9-b05c-4dbf-920d-c75611478639 insets[30, 30, 30, 30] |
| `/TrialLayer/node_reward_info/CCSprite_1` | CCSprite | [100, -22] | [0.5, 0.5] | [282, 52] | [0.7, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/trial_spr-reward-bg-2.png` 604663f5-2217-4634-b22f-e7bac6b373bb |
| `/TrialLayer/node_reward_info/UILabelTTF_1` | UILabelTTF | [100, -22] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今日已获得奖励」36 STZhongsong.ttf rgb[255, 240, 191] |
| `/TrialLayer/node_reward_info/CCSprite_2` | CCSprite | [40, -70] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/TrialLayer/node_reward_info/lbl_res_num_1` | UILabelTTF | [180, -70] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「—」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/TrialLayer/node_reward_info/CCSprite_3` | CCSprite | [40, -110] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901201.png` 1ae70da8-f142-4e57-b7f0-e09b00c3ed60 |
| `/TrialLayer/node_reward_info/lbl_res_num_2` | UILabelTTF | [180, -110] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「—」60 STZhongsong.ttf rgb[254, 255, 255] |

## TrialMapLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TrialMapLayer` | TrialMapLayer | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 |  |
| `/TrialMapLayer/spr_bg` | CCSprite | [0, 0] | [0, 0] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/idle/map-bg-trial-1.jpg` 6133c199-0cd4-43a7-9adc-cd29ea034905 |

## UnderworldPagodaBattleEndLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UnderworldPagodaBattleEndLayer` | UnderworldPagodaBattleEndLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBattleEndLayer/spr_bg` | CCScale9Sprite | [321, -12] | [0.5, 0] | [640, 450] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[150, 150, 10, 10] |
| `/UnderworldPagodaBattleEndLayer/spr_wing` | CCSprite | [331, 423] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/UnderworldPagodaBattleEndLayer/spr_result` | CCSprite | [337, 414] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/UnderworldPagodaBattleEndLayer/CCSprite_1` | CCSprite | [321, -28] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/UnderworldPagodaBattleEndLayer/lbl_faild` | UILabelTTF | [334, 296] | [0.5, 0.5] | [580, 140] | [0.5, 0.5] | 0 | 是 | cc.Label「失败，不要气馁，
可以通过以下方式提升实力！」44 CloudYuanCuGBK.ttf rgb[251, 241, 217] |
| `/UnderworldPagodaBattleEndLayer/CCMenu_1` | CCMenu | [1, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBattleEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [579, 361] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/UnderworldPagodaBattleEndLayer/CCMenu_1/btn_strong` | UIMenuItemLabel | [330, 125.544] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「变强小助手」45 [255, 255, 255, 255] |
| `/UnderworldPagodaBattleEndLayer/scroll_view` | UIScrollViewBackpack | [321.0, 39.0] | [0.5, 0] | [640, 180] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## UnderworldPagodaBossLayer（58）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UnderworldPagodaBossLayer` | UnderworldPagodaBossLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/underworld-pagoda-simple-1.jpg` e2d9735e-8a78-42fe-837e-ec7518f6e05d |
| `/UnderworldPagodaBossLayer/node_center` | CCNode | [320.0, 605.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1` | CCNode | [0, -68] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/spr_dizuo` | CCSprite | [0, -112.32] | [0.5, 0.5] | [640, 454] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-dizuo.png` d9b62016-1a7e-4f83-b71b-853a95458c65 |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/node_boss` | CCNode | [0, 76] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/spr_bg2` | CCScale9Sprite | [0, -192] | [0.5, 0.5] | [486, 94] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/underworld-pagoda_spr-underworld-pagoda-jinengbg.png` 73c88475-5c51-4073-8839-1706779120b5 insets[22, 22, 22, 22] |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/scroll_view_skill` | UIScrollViewBackpack | [1.44, -228.589] | [0.5, 0] | [360, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/CCSprite_1` | CCSprite | [145, -120] | [0.5, 0.5] | [122, 20] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-xian.png` 6c9c25dd-78b6-4d68-9cf7-a3a2bd5832cc |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/CCSprite_2` | CCSprite | [-145, -120] | [0.5, 0.5] | [122, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-xian.png` 6c9c25dd-78b6-4d68-9cf7-a3a2bd5832cc |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/lbl_skill_tip` | UILabelTTF | [0, -122] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「首领技能」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaBossLayer/node_center/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_boss_name` | CCNode | [320.0, 809.28] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_boss_name/spr_boss_name_bg` | CCSprite | [0, 55] | [0.5, 0.5] | [328, 116] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-biaotiban.png` 128ef08a-a941-4c09-a1bf-391b7eba9037 |
| `/UnderworldPagodaBossLayer/node_boss_name/lbl_boss_name` | UILabelTTF | [0, 35.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「超级大BOSS」64 FZCSJW--GB1-0.ttf rgb[224, 240, 255] |
| `/UnderworldPagodaBossLayer/node_boss_name/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_boss_name/CCMenu_1/btn_simple` | UIMenuItemTab | [-85.463, -25.056] | [0.5, 0.5] | [190, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/underworld-pagoda_btn-underworld-pagod-blue-1.png` ca79d36a-a8da-4d18-9e08-2e4235fdfdfb pressed `ui/misc/underworld-pagoda_btn-underworld-pagod-blue-2.png` af53d9f3-ee02-482d-b74b-98dfc50dc494 · Label「简单」48 [255, 255, 255, 255] |
| `/UnderworldPagodaBossLayer/node_boss_name/CCMenu_1/btn_difficult` | UIMenuItemTab | [85.337, -25.056] | [0.5, 0.5] | [187, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/underworld-pagoda_btn-underworld-pagod-red-1.png` 13e865d2-1a99-4133-9101-1006cae0f82e pressed `ui/misc/underworld-pagoda_btn-underworld-pagod-red-2.png` 97383798-e2af-4434-b268-d25afb5bcc18 · Label「困难」48 [255, 255, 255, 255] |
| `/UnderworldPagodaBossLayer/node_boss_name/CCSprite_1` | CCSprite | [142.056, -9.639] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaBossLayer/node_rank` | CCNode | [640.0, 778.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_rank/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_rank/CCMenu_1/btn_back` | UIMenuItemImage | [-77.67, 116.334] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/UnderworldPagodaBossLayer/node_rank/CCMenu_1/btn_info` | UIMenuItemImage | [-41.87, 50.134] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/UnderworldPagodaBossLayer/node_rank/CCMenu_1/btn_reward` | UIMenuItemLabel | [-48.5, -292] | [0.5, 0.5] | [58, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/floating-Islands/floating-Islands_spr-rank-1.png` 3a4904d7-34d3-403e-b7d7-f11ee3362639 · Label「排名奖励」32 [255, 255, 255, 255] |
| `/UnderworldPagodaBossLayer/node_rank/CCMenu_1/btn_shop` | UIMenuItemLabel | [-48.5, -389] | [0.5, 0.5] | [58, 58] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/floating-Islands/floating-Islands_spr-shop-1.png` 5445afad-ada8-46d6-b379-f717979e3d6c · Label「代币商店」32 [255, 255, 255, 255] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1` | CCNode | [-162.891, -232.791] | [0, 0] | [0, 0] | [0.9, 0.9] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [180, 258] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/clan/clan_spr-bg-mission-rank.png` 8bfcaaed-d964-42a1-8655-707663d36081 insets[10, 10, 10, 10] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_title` | UILabelTTF | [90, 232] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」36 FZCSJW--GB1-0.ttf rgb[245, 208, 130] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/CCMenu_1/btn_rank` | UIMenuItemImage | [90, 30] | [0.5, 0.5] | [123, 36] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/clan/clan-lang_btn-rank-detail.png` 3e73721b-ffc3-469c-ba7f-fd8bf5d5ce94 |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_1` | CCSprite | [25, 190] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-1.png` 1265e592-b04d-43b8-a16b-7c4d19d2f55b |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_2` | CCSprite | [25, 140] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-2.png` d43bc0ea-7802-460b-8830-ade683614456 |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_3` | CCSprite | [25, 90] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-3.png` 365cb8ab-6912-4bab-a6c7-c383d5987b90 |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_name_1` | UILabelTTF | [50, 200] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家第一名啊」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_damage_1` | UILabelTTF | [70, 178] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[6层]」36 FZCSJW--GB1-0.ttf rgb[255, 176, 52] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_name_2` | UILabelTTF | [50, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家第二名啊」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_damage_2` | UILabelTTF | [70, 128] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[6层]」36 FZCSJW--GB1-0.ttf rgb[255, 176, 52] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_name_3` | UILabelTTF | [50, 100] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家第三名啊」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/lbl_rank_damage_3` | UILabelTTF | [70, 78] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[6层]」36 FZCSJW--GB1-0.ttf rgb[255, 176, 52] |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_difficult_1` | CCSprite | [60.012, 178] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_difficult_2` | CCSprite | [60, 128] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaBossLayer/node_rank/CCNode_1/spr_rank_difficult_3` | CCSprite | [60, 78] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaBossLayer/spr_bottom_bg` | CCSprite | [320.0, 87.36] | [0.5, 0] | [626, 360] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-dikuang.png` b7d02161-fdac-4cde-825d-5c1d78a6e028 |
| `/UnderworldPagodaBossLayer/node_bottom` | CCNode | [320.0, 87.36] | [0.5, 0] | [640, 333] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_bottom/node_bg` | CCScale9Sprite | [0.0, 105.852] | [0.5, 0] | [540, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/UnderworldPagodaBossLayer/node_bottom/lbl_damage_tip1` | UILabelTTF | [0.0, 282] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「奖励预览」32 FZCSJW--GB1-0.ttf rgb[138, 95, 71] |
| `/UnderworldPagodaBossLayer/node_bottom/scroll_view_reward` | UIScrollViewBackpack | [1.0, 181.0] | [0.5, 0.5] | [530, 140] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/UnderworldPagodaBossLayer/node_bottom/CCMenu_1` | CCMenu | [-320.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_bottom/CCMenu_1/btn_fast_battle` | UIMenuItemLabel | [200.768, 68.256] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「扫荡」48 [255, 255, 255, 255] |
| `/UnderworldPagodaBossLayer/node_bottom/CCMenu_1/btn_battle` | UIMenuItemLabel | [453.056, 69.984] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「挑戰」48 [255, 255, 255, 255] |
| `/UnderworldPagodaBossLayer/node_bottom/node_battle_litem` | CCNode | [115.0, 30.666] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_bottom/node_fast_battle_litem` | CCNode | [-136.667, 30.666] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_level` | CCNode | [0.0, 1015.235] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_level/CCScale9Sprite_1` | CCScale9Sprite | [14.6, -288.0] | [0.5, 0.5] | [85, 302] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/city/main-city_spr-mian-storagebg.png` 6fe80999-00d6-44b4-b9fb-5e2b0271230a insets[20, 20, 20, 20] |
| `/UnderworldPagodaBossLayer/node_level/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaBossLayer/node_level/CCMenu_1/CCMenuItemImage_1` | CCMenuItemImage | [56.25, -229.167] | [0.5, 0.5] | [64, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-city_btn-mian-storage-lower.png` 02101279-a462-47d4-b865-883d80200362 |
| `/UnderworldPagodaBossLayer/node_level/CCMenu_1/CCMenuItemImage_2` | CCMenuItemImage | [57.639, 23.611] | [0.5, 0.5] | [64, 48] | [1, -1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/city/main-city_btn-mian-storage-lower.png` 02101279-a462-47d4-b865-883d80200362 |
| `/UnderworldPagodaBossLayer/node_level/scroll_view_tab` | UIScrollViewBackpack | [57.222, -102.15] | [0.5, 0.5] | [100, 220] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## UnderworldPagodaLayer（23）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UnderworldPagodaLayer` | UnderworldPagodaLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/spr_bg` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/league-portal-main-bg.png` 6d40b41f-fa9d-4b40-9e02-ba057dbd2397 |
| `/UnderworldPagodaLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 100] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_top/CCNode_1` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 100.0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_top/CCNode_1/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_top/CCNode_1/UIMenu_1/btn_back` | UIMenuItemImage | [-81.435, -40.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/UnderworldPagodaLayer/node_main_left` | CCNode | [0.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main_left/menu_info` | UIMenu | [0, 412.4] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main_left/menu_info/btn_info` | UIMenuItemImage | [46.237, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/UnderworldPagodaLayer/node_main_right` | CCNode | [640.0, 640.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main` | CCNode | [320.0, 480.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main/node_left` | CCNode | [-147, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main/node_left/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main/node_left/CCMenu_1/btn_entrance_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [296, 758] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/underworld-pagoda_underworld-pagoda-bg1.png` bebe9208-a51a-4ec3-b92d-839fdd3f3d81 |
| `/UnderworldPagodaLayer/node_main/node_left/CCSprite_1` | CCSprite | [0, -218] | [0.5, 0.5] | [288, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda-lang_underworld-pagoda-rukou1.png` 3b7987e9-b987-4f49-a652-29d70d51fd6b |
| `/UnderworldPagodaLayer/node_main/node_left/lbl_left_limit` | UILabelTTF | [-126.0, -246.6] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「开服第%s天,角色等级达到LV%s」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaLayer/node_main/node_left/lbl_left_go` | UILabelTTF | [0, -323.4] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「开启进入」68 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaLayer/node_main/node_right` | CCNode | [147, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main/node_right/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaLayer/node_main/node_right/CCMenu_1/btn_entrance_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [296, 758] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/underworld-pagoda_underworld-pagoda-bg2.png` c93ebf62-3f73-4c95-b0ba-03a5ad2ea373 |
| `/UnderworldPagodaLayer/node_main/node_right/CCSprite_1` | CCSprite | [0, -218] | [0.5, 0.5] | [288, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda-lang_underworld-pagoda-rukou2.png` 9e07dffe-4be1-4a3a-a0f1-212ddbaa2ff8 |
| `/UnderworldPagodaLayer/node_main/node_right/lbl_right_limit` | UILabelTTF | [-126.0, -246.6] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「开服第%s天,角色等级达到LV%s」36 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaLayer/node_main/node_right/lbl_right_go` | UILabelTTF | [0, -323.4] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「开启进入」68 CloudYuanCuGBK.ttf rgb[254, 255, 255] |

## UnderworldPagodaRankCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UnderworldPagodaRankCell` | UnderworldPagodaRankCell | [0, 0] | [0, 0] | [540, 130] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/UnderworldPagodaRankCell/spr_rank` | CCSprite | [45, 95] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/UnderworldPagodaRankCell/lbl_rank` | UILabelTTF | [45, 65] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaRankCell/CCNode_1` | CCNode | [135, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankCell/CCNode_1/spr_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/UnderworldPagodaRankCell/CCNode_1/spr_frame` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/UnderworldPagodaRankCell/CCNode_1/CCSprite_1` | CCSprite | [0, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/UnderworldPagodaRankCell/CCNode_1/lbl_level` | UILabelTTF | [0, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaRankCell/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankCell/CCNode_1/menu/btn_photo` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal  |
| `/UnderworldPagodaRankCell/node_stage` | CCNode | [470.046, 75.532] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankCell/node_stage/spr_rank_difficult` | CCSprite | [-25.417, -4.833] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaRankCell/node_stage/lbl_layers_nums` | UILabelTTF | [-19.204, -15.949] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「6层」60 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/UnderworldPagodaRankCell/lbl_name` | UILabelTTF | [240, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家六字名字」44 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/UnderworldPagodaRankCell/CCSprite_1` | CCSprite | [210, 45] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/UnderworldPagodaRankCell/lbl_fighting` | UILabelTTF | [225, 45] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/UnderworldPagodaRankCell/lbl_server_name` | UILabelTTF | [200, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[S0]」36 CloudYuanCuGBK.ttf rgb[15, 159, 0] |

## UnderworldPagodaRankLayer（46）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UnderworldPagodaRankLayer` | UnderworldPagodaRankLayer | [0, 0] | [0, 0] | [600, 980] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 1000] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/UnderworldPagodaRankLayer/CCSprite_1` | CCSprite | [300, 975] | [0.5, 0.5] | [399, 114] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-title-rank.png` a5d825d0-63c3-4d9e-b236-0e61231e3500 |
| `/UnderworldPagodaRankLayer/spr_rank_bg` | CCScale9Sprite | [25, 60] | [0.5, 0.5] | [550, 490] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/UnderworldPagodaRankLayer/scroll_view` | UIScrollViewBackpack | [300, 65] | [0.5, 0] | [540, 480] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/UnderworldPagodaRankLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/menu/btn_close` | UIMenuItemImage | [550, 955] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/UnderworldPagodaRankLayer/node_top_three` | CCNode | [300, 560] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_2` | CCNode | [-190, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [181, 321] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-bg-2.png` d9784b1f-be7f-476f-bc99-7f3594a99f7e |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/node_spine_2` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/CCSprite_2` | CCSprite | [0, -120] | [0.5, 0.5] | [48, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-2.png` d0ec0a85-9afe-4c2f-a6bd-1891ac98f1ac |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/spr_rank_difficult_2` | CCSprite | [-25.5, 120] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/lbl_stage_name_2` | UILabelTTF | [0, 115] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「6层」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/lbl_name_2` | UILabelTTF | [0, 90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/CCNode_1` | CCNode | [10, -150] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/CCNode_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/UnderworldPagodaRankLayer/node_top_three/node_2/CCNode_1/lbl_fighting_2` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/UnderworldPagodaRankLayer/node_top_three/node_3` | CCNode | [190, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/spr_top_3` | CCSprite | [0, 0] | [0.5, 0.5] | [182, 322] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-bg-3.png` dba2d45b-7d03-4770-935b-76f59153ed0f |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/node_spine_3` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/CCSprite_1` | CCSprite | [0, -120] | [0.5, 0.5] | [45, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-3.png` e2842f90-f083-465b-89e0-a3ea512f9294 |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/spr_rank_difficult_3` | CCSprite | [-26.111, 120] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/lbl_stage_name_3` | UILabelTTF | [0, 115] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「6层」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/lbl_name_3` | UILabelTTF | [0, 90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多负」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/CCNode_1` | CCNode | [10, -150] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/CCNode_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/UnderworldPagodaRankLayer/node_top_three/node_3/CCNode_1/lbl_fighting_3` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/UnderworldPagodaRankLayer/node_top_three/node_1` | CCNode | [0, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/spr_top_1` | CCSprite | [0, 0] | [0.5, 0.5] | [206, 373] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-bg-1.png` 0388bf1b-fc39-438a-9586-6ff0dc711556 |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/node_spine_1` | CCNode | [0, -100] | [0, 0] | [0, 0] | [1.2, 1.2] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/CCSprite_1` | CCSprite | [0, -135] | [0.5, 0.5] | [51, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-1.png` 4939cdf9-daf8-41fe-b743-ec8881a799d5 |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/spr_rank_difficult_1` | CCSprite | [-25.417, 141] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/lbl_stage_name_1` | UILabelTTF | [0, 135] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「6层」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/lbl_name_1` | UILabelTTF | [0, 110] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜按时是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/CCNode_1` | CCNode | [10, -170] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/CCNode_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/UnderworldPagodaRankLayer/node_top_three/node_1/CCNode_1/lbl_fighting_1` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/UnderworldPagodaRankLayer/lbl_rank_self` | UILabelTTF | [60, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名: 未上榜」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/UnderworldPagodaRankLayer/lbl_title_name` | UILabelTTF | [300, 972] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」52 FZCSJW--GB1-0.ttf rgb[255, 239, 93] |
| `/UnderworldPagodaRankLayer/lbl_rank_self_tongguan` | UILabelTTF | [513.267, 40] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前通关：」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/UnderworldPagodaRankLayer/lbl_rank_self_clearance` | UILabelTTF | [532, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「5层」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/UnderworldPagodaRankLayer/spr_rank_difficult_self` | CCSprite | [522.602, 47.579] | [0.5, 0.5] | [16, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/underworld-pagoda_spr-underworld-pagoda-h.png` 52c56858-20d2-4746-b326-52d109c5888e |
