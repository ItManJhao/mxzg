# P3-e 冠军赛（上） Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| ChampionBattleInfoCell | `prefabs/ui/champion/ChampionBattleInfoCell.prefab` | 65 |
| ChampionBetLayer | `prefabs/ui/champion/ChampionBetLayer.prefab` | 25 |
| ChampionCrossBattleInfoCell | `prefabs/ui/champion/ChampionCrossBattleInfoCell.prefab` | 65 |
| ChampionCrossBetLayer | `prefabs/ui/champion/ChampionCrossBetLayer.prefab` | 25 |
| ChampionCrossEditBiuLayer | `prefabs/ui/champion/ChampionCrossEditBiuLayer.prefab` | 13 |
| ChampionCrossGuessLayer | `prefabs/ui/champion/ChampionCrossGuessLayer.prefab` | 20 |
| ChampionCrossGuessTipLayer | `prefabs/ui/champion/ChampionCrossGuessTipLayer.prefab` | 12 |
| ChampionCrossLayer | `prefabs/ui/champion/ChampionCrossLayer.prefab` | 26 |
| ChampionCrossListLayer | `prefabs/ui/champion/ChampionCrossListLayer.prefab` | 9 |
| ChampionCrossMyCompeteLayer | `prefabs/ui/champion/ChampionCrossMyCompeteLayer.prefab` | 8 |
| ChampionCrossMyGuessCell | `prefabs/ui/champion/ChampionCrossMyGuessCell.prefab` | 20 |
| ChampionCrossMyHistoryCell | `prefabs/ui/champion/ChampionCrossMyHistoryCell.prefab` | 17 |
| ChampionCrossPreRewardLayer | `prefabs/ui/champion/ChampionCrossPreRewardLayer.prefab` | 11 |
| ChampionCrossRankCell | `prefabs/ui/champion/ChampionCrossRankCell.prefab` | 18 |
| ChampionCrossRankLayer | `prefabs/ui/champion/ChampionCrossRankLayer.prefab` | 7 |
| ChampionCrossRewardLayer | `prefabs/ui/champion/ChampionCrossRewardLayer.prefab` | 5 |
| ChampionCrossShowLayer | `prefabs/ui/champion/ChampionCrossShowLayer.prefab` | 62 |
| ChampionCrossTop32Layer | `prefabs/ui/champion/ChampionCrossTop32Layer.prefab` | 14 |
| ChampionCrossTop3Layer | `prefabs/ui/champion/ChampionCrossTop3Layer.prefab` | 17 |
| ChampionCrossTop4Cell | `prefabs/ui/champion/ChampionCrossTop4Cell.prefab` | 42 |
| ChampionCrossTop8Cell | `prefabs/ui/champion/ChampionCrossTop8Cell.prefab` | 86 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/misc/fantasy-land_spr-cell-bg.png` → P3C
- `ui/championship/championship_spr-bg-6.png` → P3D1
- `ui/championship/championship_spr-bg-7.png` → P3D2

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/win-bg_block-bg-20.png` [9, 9, 9, 9]（edited by P2A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionCrossListLayer:/ChampionCrossListLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionBetLayer:/ChampionBetLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossBetLayer:/ChampionCrossBetLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossListLayer:/ChampionCrossListLayer/spr_panel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossRankLayer:/ChampionCrossRankLayer/node_bottom/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossRankLayer:/ChampionCrossRankLayer/node_top/spr_rank_bg` |

## ChampionBattleInfoCell（65）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionBattleInfoCell` | ChampionBattleInfoCell | [0, 0] | [0, 0] | [600, 622] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1` | CCNode | [300.0, 313.006] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/CCSprite_1` | CCSprite | [-137, 20] | [0.5, 0.5] | [352, 580] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_bg-blue.png` 4e182d7c-fd54-465a-82b8-4eb1e5d1d52a |
| `/ChampionBattleInfoCell/CCNode_1/CCSprite_2` | CCSprite | [140, -22] | [0.5, 0.5] | [359, 580] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_bg-red.png` 87a9eca1-94e0-418b-a508-c86998172d76 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_head_1` | CCNode | [-229.0, 257.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_power_1` | CCNode | [-124, 228] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_power_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_power_1/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_power_1/lbl_power_1` | CCLabelBMFont | [-30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/lbl_name_1` | UILabelTTF | [-188, 267.52] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/spr_win1` | CCSprite | [-284, 287] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_8` | CCSprite | [-252.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_7` | CCSprite | [-252.0, 41.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_6` | CCSprite | [-252.0, -47.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_5` | CCSprite | [-252.0, -135.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_4` | CCSprite | [-161.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_3` | CCSprite | [-161, 41] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_2` | CCSprite | [-161, -47] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_1` | CCSprite | [-161.0, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_9` | CCSprite | [-60, 129] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/spr_matrix_1` | CCSprite | [-60.0, -135] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9` | CCNode | [-60, 129] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9/spr_hero_left_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9/spr_hero_left_tip_9` | UILabelTTF | [30, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_skill_1` | CCNode | [-174.0, -232.0] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_1` | CCSprite | [-120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_2` | CCSprite | [-40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_3` | CCSprite | [40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_4` | CCSprite | [120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_head_2` | CCNode | [58.0, -246.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_power_2` | CCNode | [163.0, -277.0] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_power_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_power_2/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_power_2/lbl_power_2` | CCLabelBMFont | [-30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/lbl_name_2` | UILabelTTF | [98.0, -237.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/spr_win2` | CCSprite | [284, -285.0] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_8` | CCSprite | [250.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_7` | CCSprite | [250.0, 41.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_6` | CCSprite | [250.0, -47.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_5` | CCSprite | [250.0, -135.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_4` | CCSprite | [159.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_3` | CCSprite | [159, 41] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_2` | CCSprite | [159, -47] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_1` | CCSprite | [159.0, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_9` | CCSprite | [60, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/spr_matrix_2` | CCSprite | [60, 129] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9` | CCNode | [60, -135] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9/spr_hero_right_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9/spr_hero_right_tip_9` | UILabelTTF | [30, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_skill_2` | CCNode | [174, 232] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_1` | CCSprite | [-120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_2` | CCSprite | [-40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_3` | CCSprite | [40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_4` | CCSprite | [120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionBattleInfoCell/node_vs` | CCNode | [300.0, 313.006] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/node_vs/spr_magic` | CCSprite | [0, 0] | [0.5, 0.5] | [160, 160] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-gvg_spr-magic.png` be3e13ac-9db9-401a-bed0-50bf36e2fe5c |
| `/ChampionBattleInfoCell/node_vs/spr_vs` | CCSprite | [0, 0] | [0.5, 0.5] | [78, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/ChampionBattleInfoCell/menu_report` | UIMenu | [300.0, 321.032] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionBattleInfoCell/menu_report/btn_report` | UIMenuItemImage | [0, -11] | [0.5, 0.5] | [78, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-4.png` c2b18986-8b91-4490-9768-99ca36e7f2cc |

## ChampionBetLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionBetLayer` | ChampionBetLayer | [0, 0] | [0, 0] | [540, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionBetLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChampionBetLayer/node_title` | CCNode | [270.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionBetLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionBetLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「竞 猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionBetLayer/lbl_name` | UILabelTTF | [270.0, 320.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「此路是我开」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionBetLayer/spr_scroll_bg` | CCScale9Sprite | [25, 99] | [0.5, 0.5] | [490, 190] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionBetLayer/UILabelTTF_1` | UILabelTTF | [51.0, 260.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜数量：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionBetLayer/lbl_select_num` | UILabelTTF | [159.0, 260.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[0, 235, 15] |
| `/ChampionBetLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionBetLayer/menu/btn_cancel` | UIMenuItemLabel | [390, 56] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「取  消」48 [122, 71, 45, 255] |
| `/ChampionBetLayer/menu/btn_confirm` | UIMenuItemLabel | [160, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确  定」48 [122, 71, 45, 255] |
| `/ChampionBetLayer/menu/btn_sub` | UIMenuItemImage | [69, 210.8] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-sub-1.png` 8d0f508a-66e9-4623-8e13-f9950b12a20f |
| `/ChampionBetLayer/menu/btn_add` | UIMenuItemImage | [328, 210.8] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-add-1.png` c2633107-824c-486d-bd35-d1ad6c1d60e7 |
| `/ChampionBetLayer/menu/btn_max` | UIMenuItemImage | [382, 210.8] | [0.5, 0.5] | [56, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-max-1.png` 13bf8aea-38a8-4fc5-9fca-16a7792df916 |
| `/ChampionBetLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionBetLayer/prog_bg` | CCSprite | [199, 210.8] | [0.5, 0.5] | [202, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/buy/buy_prog-bg-1.png` 76d2b6c4-3f62-4c49-9089-5d420935e7f3 |
| `/ChampionBetLayer/UILabelTTF_2` | UILabelTTF | [51.0, 141.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可竞猜：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionBetLayer/CCSprite_1` | CCSprite | [200, 139.4] | [0.5, 0.5] | [178, 32] | [0.7, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChampionBetLayer/CCSprite_2` | CCSprite | [153.611, 139.4] | [0.5, 0.5] | [100, 100] | [0.27, 0.27] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionBetLayer/lbl_total_num` | UILabelTTF | [173.4, 139.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionBetLayer/UILabelTTF_3` | UILabelTTF | [286.2, 141.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可赢取：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionBetLayer/CCSprite_3` | CCSprite | [429.2, 139.4] | [0.5, 0.5] | [178, 32] | [0.7, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChampionBetLayer/CCSprite_4` | CCSprite | [382.811, 139.4] | [0.5, 0.5] | [100, 100] | [0.27, 0.27] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionBetLayer/lbl_win` | UILabelTTF | [402.6, 139.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[254, 255, 255] |

## ChampionCrossBattleInfoCell（65）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossBattleInfoCell` | ChampionCrossBattleInfoCell | [0, 0] | [0, 0] | [600, 622] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1` | CCNode | [300.0, 313.006] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/CCSprite_1` | CCSprite | [-137, 20] | [0.5, 0.5] | [352, 580] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_bg-blue.png` 4e182d7c-fd54-465a-82b8-4eb1e5d1d52a |
| `/ChampionCrossBattleInfoCell/CCNode_1/CCSprite_2` | CCSprite | [140, -22] | [0.5, 0.5] | [359, 580] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_bg-red.png` 87a9eca1-94e0-418b-a508-c86998172d76 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_head_1` | CCNode | [-229.0, 257.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_power_1` | CCNode | [-124, 228] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_power_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_power_1/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_power_1/lbl_power_1` | CCLabelBMFont | [-30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/lbl_name_1` | UILabelTTF | [-188, 267.52] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/spr_win1` | CCSprite | [-284, 287] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_8` | CCSprite | [-252.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_7` | CCSprite | [-252.0, 41.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_6` | CCSprite | [-252.0, -47.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_5` | CCSprite | [-252.0, -135.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_4` | CCSprite | [-161.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_3` | CCSprite | [-161, 41] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_2` | CCSprite | [-161, -47] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_1` | CCSprite | [-161.0, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_1/spr_hero_left_9` | CCSprite | [-60, 129] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/spr_matrix_1` | CCSprite | [-60.0, -135] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_skill_1` | CCNode | [-174.0, -232.0] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_1` | CCSprite | [-120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_2` | CCSprite | [-40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_3` | CCSprite | [40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_skill_1/spr_skill_null_left_4` | CCSprite | [120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9` | CCNode | [-60, 129] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9/spr_hero_left_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_1/node_hero_left_9/spr_hero_left_tip_9` | UILabelTTF | [30, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_head_2` | CCNode | [58.0, -246.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_power_2` | CCNode | [163.0, -277.0] | [0, 0] | [0, 0] | [0.5, 0.5] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_power_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_power_2/CCSprite_2` | CCSprite | [-90, 5] | [0.5, 0.5] | [78, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_power_2/lbl_power_2` | CCLabelBMFont | [-30, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/lbl_name_2` | UILabelTTF | [98.0, -237.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/spr_win2` | CCSprite | [284, -285.0] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_8` | CCSprite | [250.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_7` | CCSprite | [250.0, 41.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_6` | CCSprite | [250.0, -47.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_5` | CCSprite | [250.0, -135.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_4` | CCSprite | [159.0, 129.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_3` | CCSprite | [159, 41] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_2` | CCSprite | [159, -47] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_1` | CCSprite | [159.0, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_2/spr_hero_right_9` | CCSprite | [60, -135] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/spr_matrix_2` | CCSprite | [60, 130] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_skill_2` | CCNode | [174, 232] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_1` | CCSprite | [-120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_2` | CCSprite | [-40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_3` | CCSprite | [40, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_skill_2/spr_skill_null_right_4` | CCSprite | [120, 0] | [0.5, 0.5] | [62, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-skill-default.png` 918af44c-9f40-4ae7-bb10-6bea9223eb7e |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9` | CCNode | [60, -135] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9/spr_hero_right_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/ChampionCrossBattleInfoCell/CCNode_1/node_role_2/node_hero_right_9/spr_hero_right_tip_9` | UILabelTTF | [30, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/ChampionCrossBattleInfoCell/node_vs` | CCNode | [300.0, 313.006] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/node_vs/spr_magic` | CCSprite | [0, 0] | [0.5, 0.5] | [160, 160] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-gvg_spr-magic.png` be3e13ac-9db9-401a-bed0-50bf36e2fe5c |
| `/ChampionCrossBattleInfoCell/node_vs/spr_vs` | CCSprite | [0, 0] | [0.5, 0.5] | [78, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/ChampionCrossBattleInfoCell/menu_report` | UIMenu | [300.0, 321.032] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBattleInfoCell/menu_report/btn_report` | UIMenuItemImage | [0, -11] | [0.5, 0.5] | [78, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-4.png` c2b18986-8b91-4490-9768-99ca36e7f2cc |

## ChampionCrossBetLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossBetLayer` | ChampionCrossBetLayer | [0, 0] | [0, 0] | [540, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBetLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChampionCrossBetLayer/node_title` | CCNode | [270.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBetLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionCrossBetLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「竞 猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossBetLayer/lbl_name` | UILabelTTF | [270.0, 320.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「此路是我开」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionCrossBetLayer/spr_scroll_bg` | CCScale9Sprite | [25, 99] | [0.5, 0.5] | [490, 190] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionCrossBetLayer/UILabelTTF_1` | UILabelTTF | [51.0, 260.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜数量：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossBetLayer/lbl_select_num` | UILabelTTF | [159.0, 260.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[0, 235, 15] |
| `/ChampionCrossBetLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossBetLayer/menu/btn_cancel` | UIMenuItemLabel | [390, 56] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「取  消」48 [122, 71, 45, 255] |
| `/ChampionCrossBetLayer/menu/btn_confirm` | UIMenuItemLabel | [160, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确  定」48 [122, 71, 45, 255] |
| `/ChampionCrossBetLayer/menu/btn_sub` | UIMenuItemImage | [69, 210.8] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-sub-1.png` 8d0f508a-66e9-4623-8e13-f9950b12a20f |
| `/ChampionCrossBetLayer/menu/btn_add` | UIMenuItemImage | [328, 210.8] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-add-1.png` c2633107-824c-486d-bd35-d1ad6c1d60e7 |
| `/ChampionCrossBetLayer/menu/btn_max` | UIMenuItemImage | [382, 210.8] | [0.5, 0.5] | [56, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/buy/buy_btn-max-1.png` 13bf8aea-38a8-4fc5-9fca-16a7792df916 |
| `/ChampionCrossBetLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionCrossBetLayer/prog_bg` | CCSprite | [199, 210.8] | [0.5, 0.5] | [202, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/buy/buy_prog-bg-1.png` 76d2b6c4-3f62-4c49-9089-5d420935e7f3 |
| `/ChampionCrossBetLayer/UILabelTTF_2` | UILabelTTF | [51.0, 141.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可竞猜：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossBetLayer/CCSprite_1` | CCSprite | [200, 139.4] | [0.5, 0.5] | [178, 32] | [0.7, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChampionCrossBetLayer/CCSprite_2` | CCSprite | [153.611, 139.4] | [0.5, 0.5] | [100, 100] | [0.27, 0.27] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionCrossBetLayer/lbl_total_num` | UILabelTTF | [173.4, 139.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionCrossBetLayer/UILabelTTF_3` | UILabelTTF | [286.2, 141.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可赢取：」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossBetLayer/CCSprite_3` | CCSprite | [429.2, 139.4] | [0.5, 0.5] | [178, 32] | [0.7, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/ChampionCrossBetLayer/CCSprite_4` | CCSprite | [382.811, 139.4] | [0.5, 0.5] | [100, 100] | [0.27, 0.27] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionCrossBetLayer/lbl_win` | UILabelTTF | [402.6, 139.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[254, 255, 255] |

## ChampionCrossEditBiuLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossEditBiuLayer` | ChampionCrossEditBiuLayer | [0, 0] | [0, 0] | [540, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossEditBiuLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChampionCrossEditBiuLayer/node_title` | CCNode | [270.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossEditBiuLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionCrossEditBiuLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「发送弹幕」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossEditBiuLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossEditBiuLayer/menu/btn_confirm` | UIMenuItemLabel | [270, 100] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确定」36 [122, 71, 45, 255] |
| `/ChampionCrossEditBiuLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionCrossEditBiuLayer/lbl_title` | UILabelTTF | [215.0, 49.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗:」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionCrossEditBiuLayer/CCSprite_1` | CCSprite | [259, 48] | [0.5, 0.5] | [100, 100] | [0.35, 0.35] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/ChampionCrossEditBiuLayer/lbl_title` | UILabelTTF | [283.0, 49.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「500」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionCrossEditBiuLayer/lbl_tip` | UILabelTTF | [440.0, 131.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「限制40字以内」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionCrossEditBiuLayer/spr_input_bg` | CCScale9Sprite | [19, 327] | [0, 1] | [500, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |

## ChampionCrossGuessLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossGuessLayer` | ChampionCrossGuessLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessLayer/node_lineup` | CCNode | [320.0, 96.75] | [0.5, 0] | [640.0, -160.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessLayer/node_lineup/CCLayerColor_1` | CCLayerColor | [-320.0, 0.0] | [0, 0] | [640.0, -160.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a120 |
| `/ChampionCrossGuessLayer/node_lineup/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessLayer/node_lineup/CCMenu_1/onLineup` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「我的竞猜」48 [255, 255, 255, 255] |
| `/ChampionCrossGuessLayer/node_lineup/CCSprite_1` | CCSprite | [-320.0, -160.0] | [0, 1] | [198, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-8.png` c8f9f83b-4b15-49a8-8fb0-3465c8cb686f |
| `/ChampionCrossGuessLayer/node_lineup/CCSprite_1/UILabelTTF_1` | UILabelTTF | [7, -19.928] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可竞猜：」20 FZCSJW--GB1-0.ttf rgb[254, 223, 170] |
| `/ChampionCrossGuessLayer/node_lineup/CCSprite_1/CCSprite_1` | CCSprite | [92, -19] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionCrossGuessLayer/node_lineup/CCSprite_1/lbl_guess_coin` | UILabelTTF | [113, -19.928] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」22 FZCSJW--GB1-0.ttf rgb[254, 223, 170] |
| `/ChampionCrossGuessLayer/node_lineup/CCMenu_2` | CCMenu | [268.16, -70.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessLayer/node_lineup/CCMenu_2/UIMenuItemImage_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [58, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_spr-dice-2.png` 49c9bf3a-8652-4cfe-b63f-673a0284042a |
| `/ChampionCrossGuessLayer/node_lineup/lbl_dice2` | UILabelTTF | [268.16, -44.68] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossGuessLayer/node_lineup/CCMenu_3` | CCMenu | [-265.2, -70.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessLayer/node_lineup/CCMenu_3/UIMenuItemImage_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [58, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_spr-dice-1.png` 3893814a-45d1-4782-8855-9b6672ac2880 |
| `/ChampionCrossGuessLayer/node_lineup/lbl_dice1` | UILabelTTF | [-264.96, -44.64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossGuessLayer/node_lineup/node_guess` | CCNode | [0.0, -69.92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessLayer/node_lineup/node_guess/lbl_name1` | UILabelTTF | [-218, 31] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 FZCSJW--GB1-0.ttf rgb[117, 205, 255] |
| `/ChampionCrossGuessLayer/node_lineup/node_guess/lbl_odds1` | UILabelTTF | [-218, -31] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossGuessLayer/node_lineup/node_guess/lbl_name2` | UILabelTTF | [218, 31] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 FZCSJW--GB1-0.ttf rgb[251, 164, 109] |
| `/ChampionCrossGuessLayer/node_lineup/node_guess/lbl_odds2` | UILabelTTF | [218, -31] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## ChampionCrossGuessTipLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossGuessTipLayer` | ChampionCrossGuessTipLayer | [0, 0] | [0, 0] | [550, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessTipLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChampionCrossGuessTipLayer/node_title` | CCNode | [275.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessTipLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionCrossGuessTipLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「温馨提示」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossGuessTipLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossGuessTipLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionCrossGuessTipLayer/menu/btn_cancel` | UIMenuItemLabel | [165, 56.4] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd · Label「取消」38 [255, 255, 255, 255] |
| `/ChampionCrossGuessTipLayer/menu/UIMenuItemLabel_1` | UIMenuItemLabel | [385, 56.4] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「前往参与」38 [255, 255, 255, 255] |
| `/ChampionCrossGuessTipLayer/spr_scroll_bg` | CCScale9Sprite | [276, 153] | [0.5, 0.5] | [520, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/ChampionCrossGuessTipLayer/CCSprite_1` | CCSprite | [60, 158] | [0.5, 0.5] | [70, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-bg-2.png` 6e9db8e8-4a32-4dee-ae6c-ff2088232c96 |
| `/ChampionCrossGuessTipLayer/scroll_view` | UIScrollViewBackpack | [322, 99] | [0.5, 0] | [410, 110] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## ChampionCrossLayer（26）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossLayer` | ChampionCrossLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-champion-show.jpg` 064cee2a-39b6-4bfc-93c3-8b04df828141 |
| `/ChampionCrossLayer/node_top` | CCNode | [321.0, 806.4] | [0.5, 0.5] | [640.0, -270.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossLayer/node_top/spr_round_bg` | CCScale9Sprite | [0.0, 502.2] | [0.5, 0.5] | [512, 90] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f |
| `/ChampionCrossLayer/node_top/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, -270.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/championship/championship_spr-bg-7.png` 99e4e374-a60c-41bf-908e-859829e0917b insets[1, 1, 180, 180] |
| `/ChampionCrossLayer/node_top/spr_select` | CCSprite | [-197.0, 0.0] | [0.5, 0.5] | [136, 46] | [0.97, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-selected-1.png` 0e3bf499-e01a-49bf-893c-af8af783342b |
| `/ChampionCrossLayer/node_top/CCNode_1` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [-129.306, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/ChampionCrossLayer/node_top/CCNode_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/ChampionCrossLayer/node_top/CCNode_1/CCSprite_3` | CCSprite | [129.3, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/ChampionCrossLayer/node_top/CCMenu_1` | CCMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossLayer/node_top/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-74.2, 63.44] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/ChampionCrossLayer/node_top/CCMenu_1/UIMenuItemImage_2` | UIMenuItemImage | [-37, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/ChampionCrossLayer/node_top/CCMenu_1/btn_reward` | UIMenuItemImage | [-37, -64.16] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/clan/clan-boss-lang_btn-boss-reward.png` 54fd9d0e-54b0-4a82-a0d0-6d4670be2a7e |
| `/ChampionCrossLayer/node_top/CCMenu_1/btn_history` | UIMenuItemImage | [-37, -123.16] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/clan/clan-boss-lang_btn-clan-boss-history.png` 4628935d-dc54-46a8-8a36-ae9673d2fb06 |
| `/ChampionCrossLayer/node_top/CCMenu_2` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossLayer/node_top/CCMenu_2/btn_tab2` | UIMenuItemLabel | [-65, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionCrossLayer/node_top/CCMenu_2/btn_tab3` | UIMenuItemLabel | [65, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionCrossLayer/node_top/CCMenu_2/btn_tab1` | UIMenuItemLabel | [-195, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionCrossLayer/node_top/CCMenu_2/btn_tab4` | UIMenuItemLabel | [195, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionCrossLayer/node_top/CCMenu_3` | CCMenu | [-320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossLayer/node_top/CCMenu_3/btn_shop` | UIMenuItemImage | [99, 79] | [0.5, 0.5] | [80, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-shop.png` 62562a96-aefd-40fa-8b10-06c986f5addb |
| `/ChampionCrossLayer/node_top/CCMenu_3/btn_edit_biu` | UIMenuItemImage | [36, -63] | [0.5, 0.5] | [44, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-xdm-1.png` 9771bcb2-d3c4-4626-b54e-ba921586c85d |
| `/ChampionCrossLayer/node_top/CCMenu_3/btn_biu_visible` | UIMenuItemCheckBox | [36, -125] | [0.5, 0.5] | [44, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-dm-2.png` 815e9b78-8ca1-4113-bd1a-decc93bb5fa2 pressed `ui/championship/championship_btn-dm-1.png` df8c099c-f0f7-45f9-be02-5cec6014735a |
| `/ChampionCrossLayer/node_top/lbl_battle_round` | UILabelTTF | [0.0, 421.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冠军赛未开始」30 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionCrossLayer/node_top/lbl_battle_time` | UILabelTTF | [0.0, 637.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冠军赛未开始」20 STZhongsong.ttf rgb[43, 249, 0] |

## ChampionCrossListLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossListLayer` | ChampionCrossListLayer | [0, 0] | [0, 0] | [562, 840] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossListLayer/spr_bg` | CCScale9Sprite | [281.0, 0.0] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ChampionCrossListLayer/node_title` | CCNode | [281.0, 830.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionCrossListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionCrossListLayer/spr_panel_bg` | CCScale9Sprite | [281.0, 57.6] | [0.5, 0] | [542.5, 695] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionCrossListLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossListLayer/UIMenu_1/btn_close` | UIMenuItemImage | [525, 831] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionCrossListLayer/scroll_view` | UIScrollViewBackpack | [281.0, 60.0] | [0.5, 0] | [540, 690] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ChampionCrossMyCompeteLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossMyCompeteLayer` | ChampionCrossMyCompeteLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyCompeteLayer/node_lineup` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyCompeteLayer/node_lineup/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyCompeteLayer/node` | CCNode | [320.0, 432.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyCompeteLayer/node/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [492, 582] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-qi-1.png` 52795506-8c9a-47f0-b0ae-fb9fd052e8c0 |
| `/ChampionCrossMyCompeteLayer/node/lbl_title` | UILabelTTF | [0, -44.928] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「本次冠军赛未开始」24 STZhongsong.ttf rgbNone |
| `/ChampionCrossMyCompeteLayer/node/lbl_time_tip` | UILabelTTF | [-95.04, -84.672] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「开启倒计时：」20 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionCrossMyCompeteLayer/node/lbl_start_time` | UILabelTTF | [18.297, -84.672] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00:00:00」20 STZhongsong.ttf rgb[43, 249, 0] |

## ChampionCrossMyGuessCell（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossMyGuessCell` | ChampionCrossMyGuessCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyGuessCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/ChampionCrossMyGuessCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/ChampionCrossMyGuessCell/spr_head1` | CCSprite | [61, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossMyGuessCell/spr_border1` | CCSprite | [61, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionCrossMyGuessCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionCrossMyGuessCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyGuessCell/spr_head2` | CCSprite | [201, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossMyGuessCell/spr_border2` | CCSprite | [201, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionCrossMyGuessCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionCrossMyGuessCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyGuessCell/lbl_round` | UILabelTTF | [257, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyGuessCell/UILabelTTF_1` | UILabelTTF | [257, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「投注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyGuessCell/lbl_bet_name` | UILabelTTF | [308, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名称」18 FZCSJW--GB1-0.ttf rgb[213, 112, 31] |
| `/ChampionCrossMyGuessCell/lbl_bet_text` | UILabelTTF | [257, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyGuessCell/CCSprite_2` | CCSprite | [321, 35] | [0.5, 0.5] | [100, 100] | [0.25, 0.25] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionCrossMyGuessCell/lbl_bet_num` | UILabelTTF | [337, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/ChampionCrossMyGuessCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyGuessCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/ChampionCrossMyGuessCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |

## ChampionCrossMyHistoryCell（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossMyHistoryCell` | ChampionCrossMyHistoryCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyHistoryCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/ChampionCrossMyHistoryCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/ChampionCrossMyHistoryCell/spr_head1` | CCSprite | [61, 81.553] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossMyHistoryCell/spr_border1` | CCSprite | [61, 81.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionCrossMyHistoryCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyHistoryCell/spr_head2` | CCSprite | [201, 81.6] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossMyHistoryCell/spr_border2` | CCSprite | [201, 81.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionCrossMyHistoryCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyHistoryCell/lbl_round` | UILabelTTF | [257, 82] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyHistoryCell/lbl_point_tip` | UILabelTTF | [257, 49] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得积分：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionCrossMyHistoryCell/lbl_point` | UILabelTTF | [351, 49] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/ChampionCrossMyHistoryCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossMyHistoryCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/ChampionCrossMyHistoryCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |
| `/ChampionCrossMyHistoryCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionCrossMyHistoryCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |

## ChampionCrossPreRewardLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossPreRewardLayer` | ChampionCrossPreRewardLayer | [0, 0] | [0, 0] | [640, 582] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossPreRewardLayer/CCSprite_1` | CCSprite | [320.0, 291.0] | [0.5, 0.5] | [492, 582] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-bg-1.png` b6e96802-2fda-4ce4-8c03-a23bb601f7b5 |
| `/ChampionCrossPreRewardLayer/UILabelTTF_1` | UILabelTTF | [248.384, 432.771] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排名：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionCrossPreRewardLayer/UILabelTTF_2` | UILabelTTF | [248.4, 385.549] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「比赛场数：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionCrossPreRewardLayer/UILabelTTF_3` | UILabelTTF | [248.4, 328.605] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获胜场数：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionCrossPreRewardLayer/lbl_rank` | UILabelTTF | [307.906, 432.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionCrossPreRewardLayer/lbl_count` | UILabelTTF | [353.044, 385.539] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionCrossPreRewardLayer/lbl_win_count` | UILabelTTF | [353.044, 328.644] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionCrossPreRewardLayer/lbl_text1` | UILabelTTF | [235.2, 228.349] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionCrossPreRewardLayer/lbl_name` | UILabelTTF | [288.0, 228.349] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜」24 STZhongsong.ttf rgb[255, 213, 107] |
| `/ChampionCrossPreRewardLayer/lbl_bet_name` | UILabelTTF | [320.0, 185.149] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得以上成就」24 STZhongsong.ttf rgb[254, 255, 255] |

## ChampionCrossRankCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossRankCell` | ChampionCrossRankCell | [0, 0] | [0, 0] | [630, 130] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankCell/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/ChampionCrossRankCell/spr_rank` | CCSprite | [64, 97] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/ChampionCrossRankCell/lbl_name` | UILabelTTF | [189, 79] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「网络正在加载」44 STZhongsong.ttf rgb[85, 30, 20] |
| `/ChampionCrossRankCell/lbl_rank` | UILabelTTF | [64, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未上榜」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionCrossRankCell/CCSprite_1` | CCSprite | [202, 46] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/ChampionCrossRankCell/lbl_combat_num` | UILabelTTF | [217, 46] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 STZhongsong.ttf rgb[120, 65, 0] |
| `/ChampionCrossRankCell/spr_head` | CCSprite | [146, 64] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossRankCell/spr_frame` | CCSprite | [146, 64] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/ChampionCrossRankCell/node_right` | CCNode | [517, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankCell/node_right/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankCell/node_right/CCMenu_1/btn_like` | UIMenuItemImage | [-4.939, 2.443] | [0.5, 0.5] | [134, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-4.png` bb72e417-45f6-4e8b-ad88-67505f497167 |
| `/ChampionCrossRankCell/node_right/spr_like` | CCSprite | [-37.938, 2.553] | [0.5, 0.5] | [60, 60] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionCrossRankCell/node_right/lbl_like` | UILabelTTF | [13.502, 2.553] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」18 STZhongsong.ttf rgb[85, 30, 20] |
| `/ChampionCrossRankCell/node_right/UILabelTTF_1` | UILabelTTF | [-77.938, -37.947] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛分数：」16 STZhongsong.ttf rgb[85, 30, 20] |
| `/ChampionCrossRankCell/node_right/lbl_point` | UILabelTTF | [19.062, -37.947] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000」18 STZhongsong.ttf rgb[28, 150, 17] |
| `/ChampionCrossRankCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankCell/menu/btn_role` | UIMenuItemImage | [146, 64] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## ChampionCrossRankLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossRankLayer` | ChampionCrossRankLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankLayer/node_bottom` | CCNode | [320.0, 119.1] | [0.5, 0] | [640.0, -180.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [640.0, -180.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionCrossRankLayer/node_bottom/spr_ribbon` | CCSprite | [0.0, -176.143] | [0.5, 0.5] | [226, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank-lang_spr-paimingk-3.png` 6dd14941-10db-4594-b9ca-8106425f7b1a |
| `/ChampionCrossRankLayer/node_top` | CCNode | [320.0, 765.75] | [0.5, 1] | [640.0, 525.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRankLayer/node_top/spr_rank_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [640.0, 525.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionCrossRankLayer/node_top/scroll_view` | UIScrollViewBackpack | [0.0, 0.0] | [0.5, 1] | [640.0, 525.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ChampionCrossRewardLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossRewardLayer` | ChampionCrossRewardLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossRewardLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/ChampionCrossRewardLayer/spr_title` | CCSprite | [320, 395] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** reward-layer-lang/spr-reward.png |
| `/ChampionCrossRewardLayer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/ChampionCrossRewardLayer/lbl_title` | UILabelTTF | [320.0, 267.52] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜你在选拔赛第二回合竞猜中押注成功」20 STZhongsong.ttf rgb[255, 229, 191] |

## ChampionCrossShowLayer（62）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossShowLayer` | ChampionCrossShowLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-champion-show.jpg` 064cee2a-39b6-4bfc-93c3-8b04df828141 |
| `/ChampionCrossShowLayer/node_top1` | CCNode | [640.0, 864.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_top1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_top1/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-80.2, -10.56] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/ChampionCrossShowLayer/node_top1/CCMenu_1/UIMenuItemImage_2` | UIMenuItemImage | [-64.8, -77] | [0.5, 0.5] | [74, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-rank-1.png` e89724ce-6c19-48a9-9548-12d899765191 |
| `/ChampionCrossShowLayer/node_top1/CCMenu_1/UIMenuItemImage_3` | UIMenuItemImage | [-64.8, -158.16] | [0.5, 0.5] | [74, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-show-1.png` ca4c711f-fd17-4bca-b7de-f7a40942db04 |
| `/ChampionCrossShowLayer/node_top2` | CCNode | [0.0, 864.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_top2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_top2/CCSprite_1` | CCSprite | [106.56, -114.48] | [0.5, 0.5] | [212, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-5.png` a13219e5-c2b1-4b7a-8560-2faa907c673a |
| `/ChampionCrossShowLayer/node_top2/UILabelTTF_1` | UILabelTTF | [66.24, -114.48] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「被膜拜次数：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/node_top2/lbl_worship_count` | UILabelTTF | [119.52, -114.48] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/ChampionCrossShowLayer/CCNode_1` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_1` | UIMenuItemLabel | [-123.84, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」48 [255, 255, 255, 255] |
| `/ChampionCrossShowLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_2` | UIMenuItemLabel | [118.08, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「」48 [255, 255, 255, 255] |
| `/ChampionCrossShowLayer/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 237.155] | [0, 0.5] | [640.0, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/championship/championship_spr-bg-6.png` 1ee4345c-3932-4dc0-8de4-78896fd70d78 insets[1, 1, 1, 1] |
| `/ChampionCrossShowLayer/CCNode_2` | CCNode | [640.0, 237.72] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/CCNode_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/CCNode_2/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-61.2, 60.0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/ChampionCrossShowLayer/CCNode_3` | CCNode | [0.0, 237.635] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/CCNode_3/UILabelTTF_1` | UILabelTTF | [48, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前赛程：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/UILabelTTF_2` | UILabelTTF | [48, 35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前排名：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/UILabelTTF_3` | UILabelTTF | [48, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「历史最高排名：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/UILabelTTF_4` | UILabelTTF | [46.56, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「赛季时间：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/UILabelTTF_5` | UILabelTTF | [46.56, -70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「系统提示：赛季结束时将通过邮件发放排名奖励」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/lbl_season_status` | UILabelTTF | [147.36, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂未开启」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/lbl_my_rank` | UILabelTTF | [145.92, 35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999」22 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/ChampionCrossShowLayer/CCNode_3/lbl_my_rank_max` | UILabelTTF | [183.36, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999」22 FZCSJW--GB1-0.ttf rgb[255, 143, 65] |
| `/ChampionCrossShowLayer/CCNode_3/lbl_season_time1` | UILabelTTF | [143.04, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「10.14-10.16」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionCrossShowLayer/CCNode_3/lbl_season_time2` | UILabelTTF | [262.56, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「(剩余时间：27小时46分)」18 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/ChampionCrossShowLayer/node_show_parent` | CCNode | [320.0, 499.475] | [0.5, 0.5] | [640.0, 288.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show3` | CCNode | [216.96, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/CCSprite_2` | CCSprite | [0, 225.793] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank3.png` 69422450-8daa-4591-8d9b-c48e87087d9a |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/CCSprite_3` | CCSprite | [0, 136.433] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/CCSprite_4` | CCSprite | [0, 136.433] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-king-1.png` ad710f6d-7b7d-45aa-9759-77d4119fa603 |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/lbl_name3` | UILabelTTF | [-0.96, 106.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/CCMenu_1/btn_like3` | UIMenuItemImage | [-48.36, -167.433] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionCrossShowLayer/node_show_parent/node_show3/lbl_like3` | UILabelTTF | [-0.96, -163.683] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossShowLayer/node_show_parent/node_show2` | CCNode | [-216.255, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/CCSprite_2` | CCSprite | [0, 225.793] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank2.png` a263d50a-0908-449b-8264-e5e309e97cad |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/CCSprite_3` | CCSprite | [0, 136.433] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/CCSprite_4` | CCSprite | [0, 136.433] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-king-1.png` ad710f6d-7b7d-45aa-9759-77d4119fa603 |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/lbl_name2` | UILabelTTF | [-0.96, 106.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/CCMenu_1/btn_like2` | UIMenuItemImage | [-48.36, -167.433] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionCrossShowLayer/node_show_parent/node_show2/lbl_like2` | UILabelTTF | [-0.96, -163.683] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossShowLayer/node_show_parent/node_show1` | CCNode | [0.0, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [230, 474] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-1.png` 237477ff-b2e7-41c4-bdef-c5810e15b575 |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/CCSprite_2` | CCSprite | [0, 264.96] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank1.png` 2b916702-c418-460f-a15e-6c295c2d79a5 |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/CCSprite_3` | CCSprite | [0, 165.6] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/CCSprite_4` | CCSprite | [0, 165.6] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-king-1.png` ad710f6d-7b7d-45aa-9759-77d4119fa603 |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/lbl_name1` | UILabelTTF | [-0.96, 135.36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/CCMenu_1/btn_like1` | UIMenuItemImage | [-55.86, -201.6] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionCrossShowLayer/node_show_parent/node_show1/lbl_like1` | UILabelTTF | [-0.96, -199.517] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionCrossShowLayer/node_show_parent/node_hero3` | CCNode | [216.96, 3.888] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_hero2` | CCNode | [-216.32, 3.9] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossShowLayer/node_show_parent/node_hero1` | CCNode | [0.0, -12.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ChampionCrossTop32Layer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossTop32Layer` | ChampionCrossTop32Layer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/spr_bg` | CCLayerColor | [320.0, 960.0] | [0.5, 1] | [640.0, 960.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a125 |
| `/ChampionCrossTop32Layer/node_lineup` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/node_lineup/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/node_lineup/CCMenu_1/onLineup` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「我的竞猜」48 [255, 255, 255, 255] |
| `/ChampionCrossTop32Layer/node_top` | CCNode | [320.0, 765.75] | [0.5, 0] | [640.0, -240.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/node_top/CCMenu_1` | CCMenu | [-320.0, 0.0] | [0, 0] | [640.0, -240.0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/node_top/CCMenu_1/btn_top32` | UIMenuItemTab | [0.0, 0.0] | [0, 0] | [170, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-tab-1-2.png` f92ed9e4-656b-4553-ac11-686e8b6c0785 pressed `ui/championship/championship_btn-tab-1-1.png` 678e12de-4876-42f6-af1a-e36f8bc96a6b · Label「64强赛」44 [255, 255, 255, 255] |
| `/ChampionCrossTop32Layer/node_top/CCMenu_1/btn_top4` | UIMenuItemTab | [640.0, 0.0] | [1, 0] | [170, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-tab-2-2.png` b67f1038-f177-43ef-87fb-782eecc735ba pressed `ui/championship/championship_btn-tab-2-1.png` 2ba61247-baa9-4996-957b-98a594536b22 · Label「8强赛」44 [255, 255, 255, 255] |
| `/ChampionCrossTop32Layer/node_top/lbl_groud` | UILabelTTF | [0.0, -69.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「A组」26 STZhongsong.ttf rgb[255, 221, 119] |
| `/ChampionCrossTop32Layer/CCMenu_1` | CCMenu | [0.0, 480.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/CCMenu_1/btn_left` | UIMenuItemImage | [60, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/ChampionCrossTop32Layer/CCMenu_2` | CCMenu | [640.0, 480.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop32Layer/CCMenu_2/btn_right` | UIMenuItemImage | [-60, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |

## ChampionCrossTop3Layer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossTop3Layer` | ChampionCrossTop3Layer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop3Layer/spr_bg` | CCSprite | [320, 215] | [0.5, 0.5] | [640, 400] | [1, 1.12] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/ChampionCrossTop3Layer/spr_title` | CCSprite | [304, 425] | [0.5, 0.5] | [460, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top3-2.png` 39a4014a-0ec7-46ad-8ff9-bfa610022779 |
| `/ChampionCrossTop3Layer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/ChampionCrossTop3Layer/CCSprite_2` | CCSprite | [320, 226] | [0.5, 0.5] | [246, 340] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-1.png` 63e636bf-c67a-4835-b291-3906e6fc7abc |
| `/ChampionCrossTop3Layer/lbl_time` | UILabelTTF | [320.0, 31.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「比赛时间：00：00：00」20 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionCrossTop3Layer/CCSprite_3` | CCSprite | [531, 226] | [0.5, 0.5] | [200, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-2.png` b7676429-d4c2-4320-88bb-b9c570db2b10 |
| `/ChampionCrossTop3Layer/CCSprite_4` | CCSprite | [109, 226] | [0.5, 0.5] | [200, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-3.png` ed807480-6bdb-4c82-9bb1-d95bec8d9d70 |
| `/ChampionCrossTop3Layer/lbl_name1` | UILabelTTF | [320.0, 166.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionCrossTop3Layer/lbl_name2` | UILabelTTF | [109, 166] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「记忆进市区」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionCrossTop3Layer/lbl_name3` | UILabelTTF | [531, 166] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「芋圆珍珠」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionCrossTop3Layer/spr_head1` | CCSprite | [320, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossTop3Layer/spr_frame1` | CCSprite | [320, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/ChampionCrossTop3Layer/spr_head2` | CCSprite | [109, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossTop3Layer/spr_frame2` | CCSprite | [109, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/ChampionCrossTop3Layer/spr_head3` | CCSprite | [531, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossTop3Layer/spr_frame3` | CCSprite | [531, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |

## ChampionCrossTop4Cell（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossTop4Cell` | ChampionCrossTop4Cell | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop4Cell/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop4Cell/node_light/line_light_4_1_1` | CCSprite | [239.912, 602.928] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop4Cell/node_light/line_light_4_1_2` | CCSprite | [398.869, 603.039] | [0.5, 0.5] | [160, 62] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop4Cell/node_light/line_light_4_1_z` | CCSprite | [320, 553.868] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop4Cell/node_light/line_light_4_2_2` | CCSprite | [398.869, 96.272] | [0.5, 0.5] | [160, 62] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop4Cell/node_light/line_light_4_2_1` | CCSprite | [239.912, 96.161] | [0.5, 0.5] | [160, 62] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop4Cell/node_light/line_light_4_2_z` | CCSprite | [320, 145.219] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop4Cell/node_light/line_light_2_1_2` | CCSprite | [320, 252.658] | [0.5, 0.5] | [10, 56] | [-1, 2.2] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop4Cell/node_light/line_light_2_1_1` | CCSprite | [320, 466.008] | [0.5, 0.5] | [10, 56] | [-1, 1.9] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop4Cell/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_1_1_1` | CCSprite | [164.879, 625.229] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_1_1_2` | CCSprite | [162.803, 577.234] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_1_2_2` | CCSprite | [476.396, 577.234] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_1_2_1` | CCSprite | [475, 625.423] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_1_1_z` | CCSprite | [320, 578.972] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 519.029] | [0.5, 1] | [4, 50] | [1, 3.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_2_1_z` | CCSprite | [320, 197.326] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_2_2_2` | CCSprite | [475, 123.716] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_2_2_1` | CCSprite | [476.396, 121.643] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_2_1_1` | CCSprite | [162.803, 121.643] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_4_2_1_2` | CCSprite | [164.879, 122.685] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 194.332] | [0.5, 0] | [4, 50] | [1, 3.2] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop4Cell/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop4Cell/menu_player/btn_player_4_1_1` | UIMenuItemLabel | [165, 640] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop4Cell/menu_player/btn_player_4_1_2` | UIMenuItemLabel | [475, 640] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop4Cell/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 510] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop4Cell/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 190] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop4Cell/menu_player/btn_player_4_2_1` | UIMenuItemLabel | [165, 60] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop4Cell/menu_player/btn_player_4_2_2` | UIMenuItemLabel | [475, 60] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop4Cell/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop4Cell/menu_replay/btn_report_4_1` | UIMenuItemImage | [320, 575.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop4Cell/menu_replay/btn_report_4_2` | UIMenuItemImage | [320, 122.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop4Cell/menu_replay/btn_report_2_1` | UIMenuItemImage | [320, 255.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop4Cell/spr_head_bg` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [170, 172] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-gjtxk-1.png` 4a13f27d-5706-4286-941c-b3f1df402827 |
| `/ChampionCrossTop4Cell/spr_head` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [91, 91] | [0.95, 0.95] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossTop4Cell/spr_border` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [138, 138] | [1.2, 1.2] | 0 | **否** | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionCrossTop4Cell/spr_text` | CCSprite | [321.12, 321.408] | [0.5, 0.5] | [58, 30] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-gjwz-1.png` 8fc3337b-1d09-4da3-a06a-6147653e7774 |
| `/ChampionCrossTop4Cell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop4Cell/CCNode_1/spr_effect_4_1` | CCSprite | [320, 575.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop4Cell/CCNode_1/spr_effect_4_2` | CCSprite | [320, 122.2] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop4Cell/CCNode_1/spr_effect_2_1` | CCSprite | [320, 350] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |

## ChampionCrossTop8Cell（86）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossTop8Cell` | ChampionCrossTop8Cell | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8Cell/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8Cell/node_light/line_light_8_1_1` | CCSprite | [125.088, 623.585] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_1_2` | CCSprite | [205.199, 623.585] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_1_z` | CCSprite | [164.583, 574.368] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_8_2_1` | CCSprite | [433.928, 623.585] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_2_2` | CCSprite | [514.984, 623.585] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_2_z` | CCSprite | [474.19, 572.996] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_4_1_1` | CCSprite | [239.912, 495.503] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8Cell/node_light/line_light_4_1_2` | CCSprite | [398.869, 495.615] | [0.5, 0.5] | [160, 62] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8Cell/node_light/line_light_4_1_z` | CCSprite | [320, 446.443] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_4_2_2` | CCSprite | [398.869, 197.638] | [0.5, 0.5] | [160, 62] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8Cell/node_light/line_light_4_2_1` | CCSprite | [239.912, 197.527] | [0.5, 0.5] | [160, 62] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8Cell/node_light/line_light_4_2_z` | CCSprite | [320, 246.584] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_2_1_2` | CCSprite | [320, 305.728] | [0.5, 0.5] | [10, 56] | [-1, 1.5] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_2_1_1` | CCSprite | [320, 376.908] | [0.5, 0.5] | [10, 56] | [-1, 1.5] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_8_3_1` | CCSprite | [125.088, 67.335] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_3_2` | CCSprite | [205.199, 67.335] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_3_z` | CCSprite | [164.583, 117.424] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_light/line_light_8_4_1` | CCSprite | [434.811, 67.335] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_4_2` | CCSprite | [514.922, 67.335] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8Cell/node_light/line_light_8_4_z` | CCSprite | [474.306, 117.424] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8Cell/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_1_1_1` | CCSprite | [87.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_1_1_2` | CCSprite | [85.691, 597.115] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_1_2_1` | CCSprite | [242.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_1_2_2` | CCSprite | [244.111, 597.086] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_1_1_z` | CCSprite | [164.6, 599.355] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_2_1_1` | CCSprite | [397.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_2_1_2` | CCSprite | [395.971, 597.127] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_2_2_1` | CCSprite | [552.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_2_2_2` | CCSprite | [554.097, 597.043] | [0.5, 1] | [4, 50] | [1, 1.6] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_2_1_z` | CCSprite | [474.354, 599.161] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_1_1_1` | CCSprite | [164.879, 517.849] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_1_1_2` | CCSprite | [162.803, 469.853] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_1_2_2` | CCSprite | [476.396, 469.853] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_1_2_1` | CCSprite | [475, 518.043] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_1_1_z` | CCSprite | [320, 471.592] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 414.105] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_2_1_z` | CCSprite | [320, 299.845] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_2_2_2` | CCSprite | [475, 226.068] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_2_2_1` | CCSprite | [476.396, 224.161] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_2_1_1` | CCSprite | [162.803, 224.161] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_4_2_1_2` | CCSprite | [164.879, 225.204] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_3_1_2` | CCSprite | [87.5, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_3_1_1` | CCSprite | [85.691, 94.337] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_3_2_1` | CCSprite | [244.111, 94.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_3_2_2` | CCSprite | [242.5, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_3_1_z` | CCSprite | [164.6, 169.604] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_4_1_2` | CCSprite | [397.498, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_4_1_1` | CCSprite | [395.689, 94.337] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_4_2_1` | CCSprite | [554.109, 94.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_4_2_2` | CCSprite | [552.498, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_8_4_1_z` | CCSprite | [474.598, 169.604] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 345.818] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8Cell/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_1_1` | UIMenuItemLabel | [87.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_1_2` | UIMenuItemLabel | [242.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_2_1` | UIMenuItemLabel | [397.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_2_2` | UIMenuItemLabel | [552.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_4_1_1` | UIMenuItemLabel | [165, 534.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_4_1_2` | UIMenuItemLabel | [475, 534.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 404.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 284.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_4_2_1` | UIMenuItemLabel | [165, 154.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_4_2_2` | UIMenuItemLabel | [475, 154.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_3_1` | UIMenuItemLabel | [87.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_3_2` | UIMenuItemLabel | [242.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_4_1` | UIMenuItemLabel | [397.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_player/btn_player_8_4_2` | UIMenuItemLabel | [552.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8Cell/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_8_1` | UIMenuItemImage | [164.6, 597.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_8_2` | UIMenuItemImage | [474.4, 597.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_4_1` | UIMenuItemImage | [320, 469.9] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_4_2` | UIMenuItemImage | [320, 224.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_2_1` | UIMenuItemImage | [320, 344.376] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_8_3` | UIMenuItemImage | [164.6, 94.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/menu_replay/btn_report_8_4` | UIMenuItemImage | [474.6, 94.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8Cell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_8_1` | CCSprite | [164.6, 597.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_8_2` | CCSprite | [474.4, 597.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_4_1` | CCSprite | [320, 469.9] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_4_2` | CCSprite | [320, 224.2] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_2_1` | CCSprite | [320, 344.4] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_8_3` | CCSprite | [164.6, 94.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8Cell/CCNode_1/spr_effect_8_4` | CCSprite | [474.6, 94.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
