# P3-d 超级舞台（下） Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| SuperStageRankLayer | `prefabs/ui/super-stage/SuperStageRankLayer.prefab` | 42 |
| SuperStageRewardCell | `prefabs/ui/super-stage/SuperStageRewardCell.prefab` | 5 |
| SuperStageRewardLayer | `prefabs/ui/super-stage/SuperStageRewardLayer.prefab` | 21 |
| SuperStageTokenBuyLayer | `prefabs/ui/super-stage/SuperStageTokenBuyLayer.prefab` | 6 |
| SuperStageTokenCell | `prefabs/ui/super-stage/SuperStageTokenCell.prefab` | 13 |
| SuperStageTokenLayer | `prefabs/ui/super-stage/SuperStageTokenLayer.prefab` | 20 |
| SuperStageTop2HistoryCell | `prefabs/ui/super-stage/SuperStageTop2HistoryCell.prefab` | 17 |
| SuperStageTop2HistoryLayer | `prefabs/ui/super-stage/SuperStageTop2HistoryLayer.prefab` | 9 |
| SuperStageTop2Layer | `prefabs/ui/super-stage/SuperStageTop2Layer.prefab` | 18 |
| SuperStageTop32Layer | `prefabs/ui/super-stage/SuperStageTop32Layer.prefab` | 14 |
| SuperStageTop3Layer | `prefabs/ui/super-stage/SuperStageTop3Layer.prefab` | 17 |
| SuperStageTop8Cell | `prefabs/ui/super-stage/SuperStageTop8Cell.prefab` | 86 |
| SuperStageTopBattleEndLayer | `prefabs/ui/super-stage/SuperStageTopBattleEndLayer.prefab` | 24 |
| SuperStageTopChallengeLayer | `prefabs/ui/super-stage/SuperStageTopChallengeLayer.prefab` | 28 |
| SuperStageTopGuessCell | `prefabs/ui/super-stage/SuperStageTopGuessCell.prefab` | 20 |
| SuperStageTopGuessLayer | `prefabs/ui/super-stage/SuperStageTopGuessLayer.prefab` | 20 |
| SuperStageTopHistoryHighCell | `prefabs/ui/super-stage/SuperStageTopHistoryHighCell.prefab` | 22 |
| SuperStageTopHistoryLayer | `prefabs/ui/super-stage/SuperStageTopHistoryLayer.prefab` | 14 |
| SuperStageTopHistoryMyCell | `prefabs/ui/super-stage/SuperStageTopHistoryMyCell.prefab` | 18 |
| SuperStageTopLayer | `prefabs/ui/super-stage/SuperStageTopLayer.prefab` | 26 |
| SuperStageTopLegendLayer | `prefabs/ui/super-stage/SuperStageTopLegendLayer.prefab` | 38 |
| SuperStageTopPreRewardLayer | `prefabs/ui/super-stage/SuperStageTopPreRewardLayer.prefab` | 12 |
| SuperStageTopRankCell | `prefabs/ui/super-stage/SuperStageTopRankCell.prefab` | 22 |
| SuperStageTopRankLayer | `prefabs/ui/super-stage/SuperStageTopRankLayer.prefab` | 54 |
| SuperStageTopRewardLayer | `prefabs/ui/super-stage/SuperStageTopRewardLayer.prefab` | 5 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/misc/super-stage_block-5.png` | [5, 5, 5, 5] |
| `ui/championship/championship_spr-bg-7.png` | [1, 1, 180, 180] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/battle/battle-end_spr-title.png` → P3A
- `ui/common/other_spr-circular-1.png` → P3B2
- `ui/misc/fantasy-land_spr-cell-bg.png` → P3C
- `ui/clan/clan-boss_spr-his-cell-bg-1.png` → P3C
- `ui/misc/super-stage_block-2.png` → P3D1

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/rank_spr-cell-bg.png` [12, 12, 12, 12]（edited by P2C）
- `ui/common/rank_spr-cell-bg-1.png` [30, 30, 30, 30]（edited by P2A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageRankLayer:/SuperStageRankLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageRewardLayer:/SuperStageRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTop2HistoryLayer:/SuperStageTop2HistoryLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopChallengeLayer:/SuperStageTopChallengeLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopHistoryLayer:/SuperStageTopHistoryLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopLegendLayer:/SuperStageTopLegendLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopRankLayer:/SuperStageTopRankLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SuperStageTop2HistoryLayer:/SuperStageTop2HistoryLayer/spr_panel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SuperStageTopChallengeLayer:/SuperStageTopChallengeLayer/CCNode_2/spr_bg_battle` |
| `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `SuperStageRewardCell:/SuperStageRewardCell/CCScale9Sprite_1` |
| `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `SuperStageTokenCell:/SuperStageTokenCell/CCScale9Sprite_1` |
| `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `SuperStageTopHistoryHighCell:/SuperStageTopHistoryHighCell/spr_cell_bg` |

## SuperStageRankLayer（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageRankLayer` | SuperStageRankLayer | [0, 0] | [0, 0] | [600, 980] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 1000] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageRankLayer/CCSprite_1` | CCSprite | [300, 975] | [0.5, 0.5] | [399, 114] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-title-rank.png` a5d825d0-63c3-4d9e-b236-0e61231e3500 |
| `/SuperStageRankLayer/spr_rank_bg` | CCScale9Sprite | [25, 60] | [0.5, 0.5] | [550, 490] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageRankLayer/scroll_view` | UIScrollViewBackpack | [300, 65] | [0.5, 0] | [540, 480] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SuperStageRankLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/menu/btn_close` | UIMenuItemImage | [550, 955] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageRankLayer/node_top_three` | CCNode | [300, 560] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_2` | CCNode | [-190, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [181, 321] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-bg-2.png` d9784b1f-be7f-476f-bc99-7f3594a99f7e |
| `/SuperStageRankLayer/node_top_three/node_2/node_spine_2` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_2/CCSprite_2` | CCSprite | [0, -120] | [0.5, 0.5] | [48, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-2.png` d0ec0a85-9afe-4c2f-a6bd-1891ac98f1ac |
| `/SuperStageRankLayer/node_top_three/node_2/lbl_stage_name_2` | UILabelTTF | [0, 115] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多是」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/SuperStageRankLayer/node_top_three/node_2/lbl_name_2` | UILabelTTF | [0, 90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageRankLayer/node_top_three/node_2/CCNode_1` | CCNode | [10, -150] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_2/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageRankLayer/node_top_three/node_2/CCNode_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageRankLayer/node_top_three/node_2/CCNode_1/lbl_fighting_2` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageRankLayer/node_top_three/node_3` | CCNode | [190, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_3/spr_top_3` | CCSprite | [0, 0] | [0.5, 0.5] | [182, 322] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-bg-3.png` dba2d45b-7d03-4770-935b-76f59153ed0f |
| `/SuperStageRankLayer/node_top_three/node_3/node_spine_3` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_3/CCSprite_1` | CCSprite | [0, -120] | [0.5, 0.5] | [45, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-3.png` e2842f90-f083-465b-89e0-a3ea512f9294 |
| `/SuperStageRankLayer/node_top_three/node_3/lbl_stage_name_3` | UILabelTTF | [0, 115] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多负」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/SuperStageRankLayer/node_top_three/node_3/lbl_name_3` | UILabelTTF | [0, 90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多负」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageRankLayer/node_top_three/node_3/CCNode_1` | CCNode | [10, -150] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_3/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageRankLayer/node_top_three/node_3/CCNode_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageRankLayer/node_top_three/node_3/CCNode_1/lbl_fighting_3` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageRankLayer/node_top_three/node_1` | CCNode | [0, 190] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_1/spr_top_1` | CCSprite | [0, 0] | [0.5, 0.5] | [206, 373] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-bg-1.png` 0388bf1b-fc39-438a-9586-6ff0dc711556 |
| `/SuperStageRankLayer/node_top_three/node_1/node_spine_1` | CCNode | [0, -100] | [0, 0] | [0, 0] | [1.2, 1.2] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_1/CCSprite_1` | CCSprite | [0, -135] | [0.5, 0.5] | [51, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-1.png` 4939cdf9-daf8-41fe-b743-ec8881a799d5 |
| `/SuperStageRankLayer/node_top_three/node_1/lbl_stage_name_1` | UILabelTTF | [0, 135] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜按时是」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/SuperStageRankLayer/node_top_three/node_1/lbl_name_1` | UILabelTTF | [0, 110] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜按时是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageRankLayer/node_top_three/node_1/CCNode_1` | CCNode | [10, -170] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRankLayer/node_top_three/node_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageRankLayer/node_top_three/node_1/CCNode_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageRankLayer/node_top_three/node_1/CCNode_1/lbl_fighting_1` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageRankLayer/lbl_rank_self` | UILabelTTF | [60, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名: 未上榜」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/SuperStageRankLayer/lbl_stage_title_self` | UILabelTTF | [490, 40] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的段位: 」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/SuperStageRankLayer/lbl_stage_self` | UILabelTTF | [495, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未上榜」32 CloudYuanCuGBK.ttf rgb[255, 219, 63] |
| `/SuperStageRankLayer/UILabelTTF_1` | UILabelTTF | [300, 972] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」52 FZCSJW--GB1-0.ttf rgb[255, 239, 93] |

## SuperStageRewardCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageRewardCell` | SuperStageRewardCell | [0, 0] | [0, 0] | [550, 136] | [1, 1] | 0 | 是 |  |
| `/SuperStageRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 136] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[40, 40, 40, 40] |
| `/SuperStageRewardCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 136] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/SuperStageRewardCell/spr_stage_icon` | CCSprite | [100, 75] | [0.5, 0.5] | [89, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-icon_rank-2-3.png` d1b9fa96-7a91-404d-9795-60883483ce9b |
| `/SuperStageRewardCell/lbl_stage_name` | UILabelTTF | [100, 40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「黑铁菜鸡II」36 CloudYuanCuGBK.ttf rgb[251, 245, 228] |

## SuperStageRewardLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageRewardLayer` | SuperStageRewardLayer | [0, 0] | [0, 0] | [620, 872] | [1, 1] | 0 | 是 |  |
| `/SuperStageRewardLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 892] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageRewardLayer/node_title` | CCNode | [310.0, 872.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励预览」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/SuperStageRewardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageRewardLayer/menu/btn_close` | UIMenuItemImage | [555, 845] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageRewardLayer/CCMenu_1` | CCMenu | [310, 725] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageRewardLayer/CCMenu_1/btn_tab_1` | UIMenuItemTab | [-70, 0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「首达奖励」40 [122, 71, 45, 255] |
| `/SuperStageRewardLayer/CCMenu_1/btn_tab_2` | UIMenuItemTab | [70, 0] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「段位奖励」40 [122, 71, 45, 255] |
| `/SuperStageRewardLayer/spr_rank_bg` | CCScale9Sprite | [30, 60] | [0.5, 0.5] | [560, 668] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageRewardLayer/lbl_my_stage_title` | UILabelTTF | [475, 40] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前你的段位为: 」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageRewardLayer/lbl_my_stage` | UILabelTTF | [475, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」36 CloudYuanCuGBK.ttf rgb[225, 91, 255] |
| `/SuperStageRewardLayer/lbl_tip` | UILabelTTF | [310, 790] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「每个赛季首次提升对应段位可手动领取」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageRewardLayer/node_rank_title` | CCNode | [310, 675] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageRewardLayer/node_rank_title/spr_rank_title_bg` | CCScale9Sprite | [-270, 0] | [0.5, 0.5] | [540, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg.png` 27fd7cc6-1893-4173-9be3-0f5dfd7eccf0 insets[12, 12, 12, 12] |
| `/SuperStageRewardLayer/node_rank_title/spr_line_1` | CCSprite | [-90, 20] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |
| `/SuperStageRewardLayer/node_rank_title/lbl_title_1` | UILabelTTF | [-175, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「段位」48 FZCSJW--GB1-0.ttf rgb[138, 66, 0] |
| `/SuperStageRewardLayer/node_rank_title/lbl_title_3` | UILabelTTF | [100, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励」48 FZCSJW--GB1-0.ttf rgb[120, 65, 0] |
| `/SuperStageRewardLayer/scroll_view` | UIScrollViewBackpack | [310, 65] | [0.5, 0] | [540, 600] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SuperStageRewardLayer/CCSprite_1` | CCSprite | [310, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |

## SuperStageTokenBuyLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTokenBuyLayer` | SuperStageTokenLayer | [0, 0] | [0, 0] | [580, 700] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenBuyLayer/CCSprite_1` | CCSprite | [290, 362] | [0.5, 0.5] | [639, 725] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-lang_spr-activity-bg.png` f022b1b7-218b-44db-ba05-558e839f6450 |
| `/SuperStageTokenBuyLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenBuyLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [290, 60] | [0.5, 0.5] | [188, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-peach-2.png` 54766497-0db5-4e62-9d95-6377c447fda8 · Label「￥98购买」48 [122, 71, 45, 255] |
| `/SuperStageTokenBuyLayer/menu_reward_1` | UIMenu | [290, 385] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenBuyLayer/menu_reward_2` | UIMenu | [290, 230] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## SuperStageTokenCell（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTokenCell` | SuperStageTokenCell | [0, 0] | [0, 0] | [600, 136] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 136] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[40, 40, 40, 40] |
| `/SuperStageTokenCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600, 136] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/SuperStageTokenCell/progress_bg` | CCSprite | [75, 70] | [0.5, 0] | [15, 112] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_progress-2-1.png` 48cab2fc-a1eb-43c7-a328-10c0fcc3858e |
| `/SuperStageTokenCell/spr_rank_bg` | CCSprite | [75, 68] | [0.5, 0.5] | [56, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-activity-rank-bg-2.png` 4eafa618-0554-4c70-8da0-5871937467ee |
| `/SuperStageTokenCell/spr_rank_bg_2` | CCSprite | [75, 68] | [0.5, 0.5] | [56, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-activity-rank-bg.png` 052a3e17-a633-4275-a962-d8427d793b3c |
| `/SuperStageTokenCell/spr_rank_bg_2` | CCSprite | [75, 68] | [0.5, 0.5] | [56, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-activity-rank-bg-2.png` 4eafa618-0554-4c70-8da0-5871937467ee |
| `/SuperStageTokenCell/lbl_win_count` | UILabelTTF | [75, 50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「25」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SuperStageTokenCell/spr_line` | CCSprite | [140, 68] | [0.5, 0.5] | [2, 30] | [1, 3] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |
| `/SuperStageTokenCell/menu_reward` | UIMenu | [150, 68] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenCell/menu_reward_token` | UIMenu | [250, 68] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenCell/menu/btn_reward` | UIMenuItemLabel | [510, 68] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「領 取」48 [255, 255, 255, 255] |

## SuperStageTokenLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTokenLayer` | SuperStageTokenLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mainline/map-bg-super-stage.jpg` 27914e23-9760-423b-b0d3-f2627fc57396 |
| `/SuperStageTokenLayer/node_btn_back` | CCNode | [575, 900] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/node_btn_back/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/node_btn_back/menu/btn_back` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/SuperStageTokenLayer/node_btn_back/menu/btn_info` | UIMenuItemImage | [35, -60] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SuperStageTokenLayer/node_times` | CCNode | [404.0, 806.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/node_times/CCScale9Sprite_1` | CCScale9Sprite | [0, 25] | [0.5, 0.5] | [224, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-2.png` d7799fbb-1e31-478f-a5b2-d824556f7244 insets[15, 15, 15, 15] |
| `/SuperStageTokenLayer/node_times/UILabelTTF_1` | UILabelTTF | [-100, 25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前胜场:」36 CloudYuanCuGBK.ttf rgb[255, 210, 173] |
| `/SuperStageTokenLayer/node_times/lbl_win_times` | UILabelTTF | [-10, 25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/SuperStageTokenLayer/node_times/CCScale9Sprite_2` | CCScale9Sprite | [0, -25] | [0.5, 0.5] | [224, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-2.png` d7799fbb-1e31-478f-a5b2-d824556f7244 insets[15, 15, 15, 15] |
| `/SuperStageTokenLayer/node_times/UILabelTTF_2` | UILabelTTF | [-100, -25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「重置时间:」36 CloudYuanCuGBK.ttf rgb[255, 210, 173] |
| `/SuperStageTokenLayer/node_times/lbl_cd` | UILabelTTF | [-10, -25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「10天」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/SuperStageTokenLayer/CCNode_1` | CCNode | [125.0, 840.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [152, 180] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-icon-activity.png` a0013d40-5fb5-4de2-a4a8-f472c8d44ff8 |
| `/SuperStageTokenLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/CCNode_1/CCMenu_1/btn_buy` | UIMenuItemLabel | [0, -60] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「解锁王之战令」48 [255, 255, 255, 255] |
| `/SuperStageTokenLayer/CCNode_2` | CCNode | [320.0, 384.0] | [0.5, 0.5] | [640.0, 672.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTokenLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [-320.0, -336.0] | [0.5, 0.5] | [640.0, 672.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-5.png` e82007fb-93ad-41b2-9c56-a0938123568c insets[5, 5, 5, 5] |
| `/SuperStageTokenLayer/CCNode_2/scroll_view` | UIScrollViewBackpack | [0.0, 0.0] | [0.5, 0.5] | [640.0, 662.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## SuperStageTop2HistoryCell（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTop2HistoryCell` | SuperStageTop2HistoryCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2HistoryCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/SuperStageTop2HistoryCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/SuperStageTop2HistoryCell/spr_head1` | CCSprite | [61, 81.553] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTop2HistoryCell/spr_border1` | CCSprite | [61, 81.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTop2HistoryCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTop2HistoryCell/spr_head2` | CCSprite | [201, 81.6] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTop2HistoryCell/spr_border2` | CCSprite | [201, 81.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTop2HistoryCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTop2HistoryCell/lbl_round` | UILabelTTF | [257, 82] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTop2HistoryCell/lbl_point_tip` | UILabelTTF | [257, 49] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得积分：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTop2HistoryCell/lbl_point` | UILabelTTF | [351, 49] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/SuperStageTop2HistoryCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2HistoryCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/SuperStageTop2HistoryCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |
| `/SuperStageTop2HistoryCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/SuperStageTop2HistoryCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |

## SuperStageTop2HistoryLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTop2HistoryLayer` | SuperStageTop2HistoryLayer | [0, 0] | [0, 0] | [562, 840] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2HistoryLayer/spr_bg` | CCScale9Sprite | [281.0, 0.0] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageTop2HistoryLayer/node_title` | CCNode | [281.0, 830.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2HistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageTop2HistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SuperStageTop2HistoryLayer/spr_panel_bg` | CCScale9Sprite | [281.0, 57.6] | [0.5, 0] | [542.5, 695] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/SuperStageTop2HistoryLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2HistoryLayer/UIMenu_1/btn_close` | UIMenuItemImage | [525, 831] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageTop2HistoryLayer/scroll_view` | UIScrollViewBackpack | [281.0, 60.0] | [0.5, 0] | [540, 690] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## SuperStageTop2Layer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTop2Layer` | SuperStageTop2Layer | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2Layer/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2Layer/node_light/line_light_2_1_2` | CCSprite | [320, 252.658] | [0.5, 0.5] | [10, 56] | [-1, 2.2] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop2Layer/node_light/line_light_2_1_1` | CCSprite | [320, 466.008] | [0.5, 0.5] | [10, 56] | [-1, 1.9] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop2Layer/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2Layer/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 519.029] | [0.5, 1] | [4, 50] | [1, 3.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop2Layer/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 194.332] | [0.5, 0] | [4, 50] | [1, 3.2] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop2Layer/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2Layer/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 510] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop2Layer/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 190] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop2Layer/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2Layer/menu_replay/btn_report_2_1` | UIMenuItemImage | [320, 255.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop2Layer/spr_head_bg` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [170, 172] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-gjtxk-1.png` 4a13f27d-5706-4286-941c-b3f1df402827 |
| `/SuperStageTop2Layer/spr_head` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [91, 91] | [0.95, 0.95] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTop2Layer/spr_border` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [138, 138] | [1.2, 1.2] | 0 | **否** | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTop2Layer/spr_text` | CCSprite | [321.12, 321.408] | [0.5, 0.5] | [58, 30] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-gjwz-1.png` 8fc3337b-1d09-4da3-a06a-6147653e7774 |
| `/SuperStageTop2Layer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop2Layer/CCNode_1/spr_effect_2_1` | CCSprite | [320, 350] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |

## SuperStageTop32Layer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTop32Layer` | SuperStageTop32Layer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/spr_bg` | CCLayerColor | [320.0, 960.0] | [0.5, 1] | [640.0, 960.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a125 |
| `/SuperStageTop32Layer/node_lineup` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/node_lineup/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/node_lineup/CCMenu_1/onLineup` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「我的竞猜」48 [255, 255, 255, 255] |
| `/SuperStageTop32Layer/node_top` | CCNode | [320.0, 765.75] | [0.5, 0] | [640.0, -240.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/node_top/CCMenu_1` | CCMenu | [-320.0, 0.0] | [0, 0] | [640.0, -240.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/node_top/CCMenu_1/btn_top32` | UIMenuItemTab | [0.0, 0.0] | [0, 0] | [170, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-tab-1-2.png` f92ed9e4-656b-4553-ac11-686e8b6c0785 pressed `ui/championship/championship_btn-tab-1-1.png` 678e12de-4876-42f6-af1a-e36f8bc96a6b · Label「128强赛」44 [255, 255, 255, 255] |
| `/SuperStageTop32Layer/node_top/CCMenu_1/btn_top4` | UIMenuItemTab | [640.0, 0.0] | [1, 0] | [170, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-tab-2-2.png` b67f1038-f177-43ef-87fb-782eecc735ba pressed `ui/championship/championship_btn-tab-2-1.png` 2ba61247-baa9-4996-957b-98a594536b22 · Label「16强赛」44 [255, 255, 255, 255] |
| `/SuperStageTop32Layer/node_top/lbl_groud` | UILabelTTF | [0.0, -69.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「A组」26 STZhongsong.ttf rgb[255, 221, 119] |
| `/SuperStageTop32Layer/CCMenu_1` | CCMenu | [0.0, 480.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/CCMenu_1/btn_left` | UIMenuItemImage | [60, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/SuperStageTop32Layer/CCMenu_2` | CCMenu | [640.0, 480.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop32Layer/CCMenu_2/btn_right` | UIMenuItemImage | [-60, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |

## SuperStageTop3Layer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTop3Layer` | SuperStageTop3Layer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop3Layer/spr_bg` | CCSprite | [320, 215] | [0.5, 0.5] | [640, 400] | [1, 1.12] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/SuperStageTop3Layer/spr_title` | CCSprite | [320, 425] | [0.5, 0.5] | [434, 116] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-lang_spr-title-top-3.png` 50ec03c3-2ccb-44d0-be58-844f26786138 |
| `/SuperStageTop3Layer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/SuperStageTop3Layer/CCSprite_2` | CCSprite | [320, 226] | [0.5, 0.5] | [246, 340] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-1.png` 63e636bf-c67a-4835-b291-3906e6fc7abc |
| `/SuperStageTop3Layer/lbl_time` | UILabelTTF | [320.0, 31.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「比赛时间：00：00：00」20 STZhongsong.ttf rgb[43, 249, 0] |
| `/SuperStageTop3Layer/CCSprite_3` | CCSprite | [531, 226] | [0.5, 0.5] | [200, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-2.png` b7676429-d4c2-4320-88bb-b9c570db2b10 |
| `/SuperStageTop3Layer/CCSprite_4` | CCSprite | [109, 226] | [0.5, 0.5] | [200, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-3.png` ed807480-6bdb-4c82-9bb1-d95bec8d9d70 |
| `/SuperStageTop3Layer/lbl_name1` | UILabelTTF | [320.0, 166.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTop3Layer/lbl_name2` | UILabelTTF | [109, 166] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「记忆进市区」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTop3Layer/lbl_name3` | UILabelTTF | [531, 166] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「芋圆珍珠」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTop3Layer/spr_head1` | CCSprite | [320, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTop3Layer/spr_frame1` | CCSprite | [320, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/SuperStageTop3Layer/spr_head2` | CCSprite | [109, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTop3Layer/spr_frame2` | CCSprite | [109, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/SuperStageTop3Layer/spr_head3` | CCSprite | [531, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTop3Layer/spr_frame3` | CCSprite | [531, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |

## SuperStageTop8Cell（86）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTop8Cell` | SuperStageTop8Cell | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop8Cell/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop8Cell/node_light/line_light_8_1_1` | CCSprite | [125.088, 623.585] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_1_2` | CCSprite | [205.199, 623.585] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_1_z` | CCSprite | [164.583, 574.368] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_8_2_1` | CCSprite | [433.928, 623.585] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_2_2` | CCSprite | [514.984, 623.585] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_2_z` | CCSprite | [474.19, 572.996] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_4_1_1` | CCSprite | [239.912, 495.503] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/SuperStageTop8Cell/node_light/line_light_4_1_2` | CCSprite | [398.869, 495.615] | [0.5, 0.5] | [160, 62] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/SuperStageTop8Cell/node_light/line_light_4_1_z` | CCSprite | [320, 446.443] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_4_2_2` | CCSprite | [398.869, 197.638] | [0.5, 0.5] | [160, 62] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/SuperStageTop8Cell/node_light/line_light_4_2_1` | CCSprite | [239.912, 197.527] | [0.5, 0.5] | [160, 62] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/SuperStageTop8Cell/node_light/line_light_4_2_z` | CCSprite | [320, 246.584] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_2_1_2` | CCSprite | [320, 305.728] | [0.5, 0.5] | [10, 56] | [-1, 1.5] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_2_1_1` | CCSprite | [320, 376.908] | [0.5, 0.5] | [10, 56] | [-1, 1.5] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_8_3_1` | CCSprite | [125.088, 67.335] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_3_2` | CCSprite | [205.199, 67.335] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_3_z` | CCSprite | [164.583, 117.424] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_light/line_light_8_4_1` | CCSprite | [434.811, 67.335] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_4_2` | CCSprite | [514.922, 67.335] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/SuperStageTop8Cell/node_light/line_light_8_4_z` | CCSprite | [474.306, 117.424] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/SuperStageTop8Cell/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop8Cell/node_gray/line_gray_8_1_1_1` | CCSprite | [87.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_1_1_2` | CCSprite | [85.691, 597.115] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_1_2_1` | CCSprite | [242.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_1_2_2` | CCSprite | [244.111, 597.086] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_1_1_z` | CCSprite | [164.6, 599.355] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_2_1_1` | CCSprite | [397.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_2_1_2` | CCSprite | [395.971, 597.127] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_2_2_1` | CCSprite | [552.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_2_2_2` | CCSprite | [554.097, 597.043] | [0.5, 1] | [4, 50] | [1, 1.6] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_2_1_z` | CCSprite | [474.354, 599.161] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_1_1_1` | CCSprite | [164.879, 517.849] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_1_1_2` | CCSprite | [162.803, 469.853] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_1_2_2` | CCSprite | [476.396, 469.853] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_1_2_1` | CCSprite | [475, 518.043] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_1_1_z` | CCSprite | [320, 471.592] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 414.105] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_2_1_z` | CCSprite | [320, 299.845] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_2_2_2` | CCSprite | [475, 226.068] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_2_2_1` | CCSprite | [476.396, 224.161] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_2_1_1` | CCSprite | [162.803, 224.161] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_4_2_1_2` | CCSprite | [164.879, 225.204] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_3_1_2` | CCSprite | [87.5, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_3_1_1` | CCSprite | [85.691, 94.337] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_3_2_1` | CCSprite | [244.111, 94.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_3_2_2` | CCSprite | [242.5, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_3_1_z` | CCSprite | [164.6, 169.604] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_4_1_2` | CCSprite | [397.498, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_4_1_1` | CCSprite | [395.689, 94.337] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_4_2_1` | CCSprite | [554.109, 94.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_4_2_2` | CCSprite | [552.498, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_8_4_1_z` | CCSprite | [474.598, 169.604] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 345.818] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/SuperStageTop8Cell/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop8Cell/menu_player/btn_player_8_1_1` | UIMenuItemLabel | [87.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_1_2` | UIMenuItemLabel | [242.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_2_1` | UIMenuItemLabel | [397.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_2_2` | UIMenuItemLabel | [552.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_4_1_1` | UIMenuItemLabel | [165, 534.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_4_1_2` | UIMenuItemLabel | [475, 534.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 404.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 284.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_4_2_1` | UIMenuItemLabel | [165, 154.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_4_2_2` | UIMenuItemLabel | [475, 154.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_3_1` | UIMenuItemLabel | [87.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_3_2` | UIMenuItemLabel | [242.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_4_1` | UIMenuItemLabel | [397.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_player/btn_player_8_4_2` | UIMenuItemLabel | [552.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/SuperStageTop8Cell/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop8Cell/menu_replay/btn_report_8_1` | UIMenuItemImage | [164.6, 597.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/menu_replay/btn_report_8_2` | UIMenuItemImage | [474.4, 597.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/menu_replay/btn_report_4_1` | UIMenuItemImage | [320, 469.9] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/menu_replay/btn_report_4_2` | UIMenuItemImage | [320, 224.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/menu_replay/btn_report_2_1` | UIMenuItemImage | [320, 344.376] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/menu_replay/btn_report_8_3` | UIMenuItemImage | [164.6, 94.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/menu_replay/btn_report_8_4` | UIMenuItemImage | [474.6, 94.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/SuperStageTop8Cell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_8_1` | CCSprite | [164.6, 597.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_8_2` | CCSprite | [474.4, 597.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_4_1` | CCSprite | [320, 469.9] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_4_2` | CCSprite | [320, 224.2] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_2_1` | CCSprite | [320, 344.4] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_8_3` | CCSprite | [164.6, 94.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/SuperStageTop8Cell/CCNode_1/spr_effect_8_4` | CCSprite | [474.6, 94.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |

## SuperStageTopBattleEndLayer（24）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopBattleEndLayer` | SuperStageTopBattleEndLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/SuperStageTopBattleEndLayer/spr_wing` | CCSprite | [320, 375] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/SuperStageTopBattleEndLayer/spr_result` | CCSprite | [320, 359] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/SuperStageTopBattleEndLayer/CCSprite_1` | CCSprite | [320, -15] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/SuperStageTopBattleEndLayer/menu` | UIMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/CCMenu_1/btn_report` | CCMenuItemImage | [590, 320] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/SuperStageTopBattleEndLayer/node_up` | CCNode | [320, 212] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/node_up/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0] | [510, 86] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[4, 4, 0, 0] |
| `/SuperStageTopBattleEndLayer/node_up/CCNode_1` | CCNode | [-150, 44] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/node_up/CCNode_1/spr_up_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopBattleEndLayer/node_up/CCNode_1/spr_up_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopBattleEndLayer/node_up/lbl_up_name` | UILabelTTF | [-97, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六个字六个字」44 STZhongsong.ttf rgbNone |
| `/SuperStageTopBattleEndLayer/node_up/lbl_up_rank` | UILabelTTF | [60, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名：9999」44 STZhongsong.ttf rgb[255, 228, 161] |
| `/SuperStageTopBattleEndLayer/node_up/spr_up_rank` | CCSprite | [200, 43] | [0.5, 0.5] | [18, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_up.png` 35d895d5-5beb-4e9e-b587-4ec28aadd706 |
| `/SuperStageTopBattleEndLayer/node_down` | CCNode | [320, 117] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/node_down/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0] | [510, 86] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c insets[4, 4, 0, 0] |
| `/SuperStageTopBattleEndLayer/node_down/CCNode_1` | CCNode | [-150, 44] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopBattleEndLayer/node_down/CCNode_1/spr_down_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopBattleEndLayer/node_down/CCNode_1/spr_down_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopBattleEndLayer/node_down/lbl_down_name` | UILabelTTF | [-97, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六个字六个字」44 STZhongsong.ttf rgbNone |
| `/SuperStageTopBattleEndLayer/node_down/lbl_down_rank` | UILabelTTF | [60, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名：9999」44 STZhongsong.ttf rgb[255, 228, 161] |
| `/SuperStageTopBattleEndLayer/node_down/spr_down_rank` | CCSprite | [200, 43] | [0.5, 0.5] | [18, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_up.png` 35d895d5-5beb-4e9e-b587-4ec28aadd706 |

## SuperStageTopChallengeLayer（28）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopChallengeLayer` | SuperStageTopChallengeLayer | [0, 0] | [0, 0] | [540, 670] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540.0, 670.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageTopChallengeLayer/node_title` | CCNode | [270.0, 661.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageTopChallengeLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战对手」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/SuperStageTopChallengeLayer/menu` | UIMenu | [0, 0] | [0, 0] | [540.0, 670.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/menu/btn_close` | UIMenuItemImage | [477.0, 634.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageTopChallengeLayer/menu/btn_battle` | UIMenuItemLabel | [270.0, 90.0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「挑 战」40 [255, 255, 255, 255] |
| `/SuperStageTopChallengeLayer/menu/btn_pass_team` | UIMenuItemCheckBox | [220.0, 151.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/SuperStageTopChallengeLayer/lbl_name` | UILabelTTF | [248, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跳过布阵」44 FZCSJW--GB1-0.ttf rgb[85, 30, 20] |
| `/SuperStageTopChallengeLayer/CCNode_1` | CCNode | [270, 510] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_1` | CCNode | [-130, 2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_1/spr_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_1/spr_photo_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [0, -49] | [0.5, 0] | [70, 32] | [0.7, 0.7] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-circular-1.png` bea85661-3c73-4593-98c2-a2650fa8f742 insets[0, 0, 14, 14] |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_1/lbl_level` | UILabelTTF | [1, -38] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「990」36 FZCSJW--GB1-0.ttf rgbNone |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_2` | CCNode | [-64, 2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_2/lbl_name` | UILabelTTF | [0, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[S0]玩家名」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_2/lbl_rank` | UILabelTTF | [58, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「000」44 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/SuperStageTopChallengeLayer/CCNode_1/CCNode_2/lbl_clan_name` | UILabelTTF | [0, -35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「公会」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopChallengeLayer/CCNode_2` | CCNode | [270, 175] | [0.5, 0] | [460, 220] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCNode_2/spr_bg_battle` | CCScale9Sprite | [-230.0, 0] | [0, 0] | [460.0, 220.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/SuperStageTopChallengeLayer/CCNode_2/node_hero` | CCNode | [-230.0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCNode_3` | CCNode | [305, 425] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopChallengeLayer/CCNode_3/spr_battle_count_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageTopChallengeLayer/CCNode_3/CCSprite_1` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageTopChallengeLayer/CCNode_3/lbl_battle_count` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |

## SuperStageTopGuessCell（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopGuessCell` | SuperStageTopGuessCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/SuperStageTopGuessCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/SuperStageTopGuessCell/spr_head1` | CCSprite | [61, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopGuessCell/spr_border1` | CCSprite | [61, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopGuessCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/SuperStageTopGuessCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopGuessCell/spr_head2` | CCSprite | [201, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopGuessCell/spr_border2` | CCSprite | [201, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopGuessCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/SuperStageTopGuessCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopGuessCell/lbl_round` | UILabelTTF | [257, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopGuessCell/UILabelTTF_1` | UILabelTTF | [257, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「投注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopGuessCell/lbl_bet_name` | UILabelTTF | [308, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名称」18 FZCSJW--GB1-0.ttf rgb[213, 112, 31] |
| `/SuperStageTopGuessCell/lbl_bet_text` | UILabelTTF | [257, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopGuessCell/CCSprite_2` | CCSprite | [321, 35] | [0.5, 0.5] | [100, 100] | [0.25, 0.25] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/SuperStageTopGuessCell/lbl_bet_num` | UILabelTTF | [337, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/SuperStageTopGuessCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/SuperStageTopGuessCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |

## SuperStageTopGuessLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopGuessLayer` | SuperStageTopGuessLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessLayer/node_lineup` | CCNode | [320.0, 96.75] | [0.5, 0] | [640.0, -160.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessLayer/node_lineup/CCLayerColor_1` | CCLayerColor | [-320.0, 0.0] | [0, 0] | [640.0, -160.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a120 |
| `/SuperStageTopGuessLayer/node_lineup/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessLayer/node_lineup/CCMenu_1/onLineup` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「我的竞猜」48 [255, 255, 255, 255] |
| `/SuperStageTopGuessLayer/node_lineup/CCSprite_1` | CCSprite | [-320.0, -160.0] | [0, 1] | [198, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-8.png` c8f9f83b-4b15-49a8-8fb0-3465c8cb686f |
| `/SuperStageTopGuessLayer/node_lineup/CCSprite_1/UILabelTTF_1` | UILabelTTF | [7, -19.928] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可竞猜：」20 FZCSJW--GB1-0.ttf rgb[254, 223, 170] |
| `/SuperStageTopGuessLayer/node_lineup/CCSprite_1/CCSprite_1` | CCSprite | [92, -19] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/SuperStageTopGuessLayer/node_lineup/CCSprite_1/lbl_guess_coin` | UILabelTTF | [113, -19.928] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」22 FZCSJW--GB1-0.ttf rgb[254, 223, 170] |
| `/SuperStageTopGuessLayer/node_lineup/CCMenu_2` | CCMenu | [268.16, -70.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessLayer/node_lineup/CCMenu_2/UIMenuItemImage_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [58, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_spr-dice-2.png` 49c9bf3a-8652-4cfe-b63f-673a0284042a |
| `/SuperStageTopGuessLayer/node_lineup/lbl_dice2` | UILabelTTF | [268.16, -44.68] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopGuessLayer/node_lineup/CCMenu_3` | CCMenu | [-265.2, -70.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessLayer/node_lineup/CCMenu_3/UIMenuItemImage_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [58, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_spr-dice-1.png` 3893814a-45d1-4782-8855-9b6672ac2880 |
| `/SuperStageTopGuessLayer/node_lineup/lbl_dice1` | UILabelTTF | [-264.96, -44.64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopGuessLayer/node_lineup/node_guess` | CCNode | [0.0, -69.92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopGuessLayer/node_lineup/node_guess/lbl_name1` | UILabelTTF | [-218, 31] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 FZCSJW--GB1-0.ttf rgb[117, 205, 255] |
| `/SuperStageTopGuessLayer/node_lineup/node_guess/lbl_odds1` | UILabelTTF | [-218, -31] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopGuessLayer/node_lineup/node_guess/lbl_name2` | UILabelTTF | [218, 31] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 FZCSJW--GB1-0.ttf rgb[251, 164, 109] |
| `/SuperStageTopGuessLayer/node_lineup/node_guess/lbl_odds2` | UILabelTTF | [218, -31] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## SuperStageTopHistoryHighCell（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopHistoryHighCell` | SuperStageTopHistoryHighCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryHighCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[0, 0, 10, 10] |
| `/SuperStageTopHistoryHighCell/spr_photo_1` | CCSprite | [60, 80] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopHistoryHighCell/spr_frame_1` | CCSprite | [60, 80] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopHistoryHighCell/lbl_name_1` | UILabelTTF | [110, 95] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今天也不想活」44 STZhongsong.ttf rgb[202, 95, 23] |
| `/SuperStageTopHistoryHighCell/lbl_rank_tip_1` | UILabelTTF | [110, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名:」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SuperStageTopHistoryHighCell/lbl_rank_1` | UILabelTTF | [155, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」40 STZhongsong.ttf rgb[15, 159, 0] |
| `/SuperStageTopHistoryHighCell/lbl_server_name_1` | UILabelTTF | [110, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SuperStageTopHistoryHighCell/lbl_time` | UILabelTTF | [275, 130] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2019-12-31 23:59:59」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/SuperStageTopHistoryHighCell/spr_photo_2` | CCSprite | [350, 77] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopHistoryHighCell/spr_frame_2` | CCSprite | [350, 79] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopHistoryHighCell/lbl_name_2` | UILabelTTF | [400, 95] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今天也不想活」44 STZhongsong.ttf rgb[202, 95, 23] |
| `/SuperStageTopHistoryHighCell/lbl_rank_tip_2` | UILabelTTF | [400, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名:」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SuperStageTopHistoryHighCell/lbl_rank_2` | UILabelTTF | [445, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」40 STZhongsong.ttf rgb[15, 159, 0] |
| `/SuperStageTopHistoryHighCell/lbl_server_name_2` | UILabelTTF | [400, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/SuperStageTopHistoryHighCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryHighCell/menu/btn_report` | UIMenuItemImage | [275, 35] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/SuperStageTopHistoryHighCell/menu/btn_photo_1` | CCMenuItemImage | [60, 80] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/SuperStageTopHistoryHighCell/menu/btn_photo_2` | CCMenuItemImage | [350, 80] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/SuperStageTopHistoryHighCell/spr_vs` | CCSprite | [275, 90] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/SuperStageTopHistoryHighCell/spr_win_1` | CCSprite | [30, 105] | [0.5, 0.5] | [53, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_spr-win.png` 3c242692-702d-4437-b1f7-01cf4a7f7b83 |
| `/SuperStageTopHistoryHighCell/spr_win_2` | CCSprite | [320, 105] | [0.5, 0.5] | [53, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_spr-win.png` 3c242692-702d-4437-b1f7-01cf4a7f7b83 |

## SuperStageTopHistoryLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopHistoryLayer` | SuperStageTopHistoryLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageTopHistoryLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageTopHistoryLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「個人挑戰」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SuperStageTopHistoryLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageTopHistoryLayer/CCMenu_1/btn_tab_1` | UIMenuItemTab | [249, 791] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「我的錄像」40 [122, 71, 45, 255] |
| `/SuperStageTopHistoryLayer/CCMenu_1/btn_tab_2` | UIMenuItemTab | [396, 791] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「大神風采」40 [122, 71, 45, 255] |
| `/SuperStageTopHistoryLayer/spr_scroll_view_bg` | CCScale9Sprite | [35, 105] | [0.5, 0.5] | [570, 690] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageTopHistoryLayer/scroll_view` | UIScrollViewBackpack | [42, 110] | [0, 0] | [560, 680] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SuperStageTopHistoryLayer/lbl_my_stage_title` | UILabelTTF | [475, 80] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「当前你的段位为: 」36 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageTopHistoryLayer/lbl_my_stage` | UILabelTTF | [475, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「白银先锋II」36 CloudYuanCuGBK.ttf rgb[225, 91, 255] |
| `/SuperStageTopHistoryLayer/CCSprite_1` | CCSprite | [310, 20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |

## SuperStageTopHistoryMyCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopHistoryMyCell` | SuperStageTopHistoryMyCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryMyCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-boss_spr-his-cell-bg-2.png` 620aa939-4ff6-4541-99c4-60271e48f295 |
| `/SuperStageTopHistoryMyCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/clan/clan-boss_spr-his-cell-bg-1.png` 381bb53f-8c7f-4761-a0c9-c10d74092cee insets[0, 0, 10, 10] |
| `/SuperStageTopHistoryMyCell/spr_photo` | CCSprite | [60, 80] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopHistoryMyCell/spr_frame` | CCSprite | [60, 80] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopHistoryMyCell/spr_level_bg` | CCSprite | [60, 40] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan_spr-level-bg.png` 6bea7811-87b0-4e87-9135-db33ac1250b3 |
| `/SuperStageTopHistoryMyCell/lbl_level` | UILabelTTF | [60, 40] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」18 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopHistoryMyCell/lbl_name` | UILabelTTF | [110, 95] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「今天也不想活了」44 STZhongsong.ttf rgb[202, 95, 23] |
| `/SuperStageTopHistoryMyCell/CCSprite_1` | CCSprite | [120, 50] | [0.5, 0.5] | [18, 16] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-invitation-4.png` 5d706295-854a-4320-a89c-1da2dd92a320 |
| `/SuperStageTopHistoryMyCell/lbl_fighting` | UILabelTTF | [135, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」48 STZhongsong.ttf rgb[120, 65, 0] |
| `/SuperStageTopHistoryMyCell/lbl_time` | UILabelTTF | [280, 65] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2019-12-31 23:59:59」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/SuperStageTopHistoryMyCell/lbl_point` | UILabelTTF | [280, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「积分: +99999」40 STZhongsong.ttf rgb[120, 65, 0] |
| `/SuperStageTopHistoryMyCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopHistoryMyCell/menu/btn_report` | UIMenuItemImage | [507, 75] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/SuperStageTopHistoryMyCell/menu/btn_photo` | CCMenuItemImage | [60, 80] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/SuperStageTopHistoryMyCell/menu/btn_share` | UIMenuItemImage | [507, 21] | [0.5, 0.5] | [78, 40] | [0.75, 0.75] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-share_spr-share.png` 6a5ee855-143c-47c1-a15c-c09fc7406f39 |
| `/SuperStageTopHistoryMyCell/spr_result` | CCSprite | [325, 100] | [0.5, 0.5] | [111, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-boss-lang_spr-rob-1.png` 918be0ea-00bb-413e-96af-34f940d5321e |
| `/SuperStageTopHistoryMyCell/lbl_server_name` | UILabelTTF | [110, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」36 STZhongsong.ttf rgb[120, 65, 0] |

## SuperStageTopLayer（26）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopLayer` | SuperStageTopLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-champion-show.jpg` 064cee2a-39b6-4bfc-93c3-8b04df828141 |
| `/SuperStageTopLayer/node_top` | CCNode | [321.0, 806.4] | [0.5, 0.5] | [640.0, -270.0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLayer/node_top/spr_round_bg` | CCScale9Sprite | [0.0, 502.2] | [0.5, 0.5] | [512, 90] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f |
| `/SuperStageTopLayer/node_top/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, -270.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/championship/championship_spr-bg-7.png` 99e4e374-a60c-41bf-908e-859829e0917b insets[1, 1, 180, 180] |
| `/SuperStageTopLayer/node_top/spr_select` | CCSprite | [-197.0, 0.0] | [0.5, 0.5] | [136, 46] | [0.97, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-selected-1.png` 0e3bf499-e01a-49bf-893c-af8af783342b |
| `/SuperStageTopLayer/node_top/CCNode_1` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [-129.306, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/SuperStageTopLayer/node_top/CCNode_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/SuperStageTopLayer/node_top/CCNode_1/CCSprite_3` | CCSprite | [129.3, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/SuperStageTopLayer/node_top/CCMenu_1` | CCMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLayer/node_top/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-74.2, 63.44] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/SuperStageTopLayer/node_top/CCMenu_1/UIMenuItemImage_2` | UIMenuItemImage | [-37, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/SuperStageTopLayer/node_top/CCMenu_1/btn_reward` | UIMenuItemLabel | [-37, -50] | [0.5, 0.5] | [47, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-reward-2.png` 42b13978-8d95-40aa-8cd0-9cc8f8c31989 · Label「奖励」36 [255, 255, 255, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_1/btn_history` | UIMenuItemLabel | [-37, -105] | [0.5, 0.5] | [47, 52] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-report-2.png` 597f7271-a0fa-4792-a623-72fb55288927 · Label「奖励」36 [255, 255, 255, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_2` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLayer/node_top/CCMenu_2/btn_rank` | UIMenuItemLabel | [-230, 65] | [0.5, 0.5] | [100, 100] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/super-stage_btn-rank.png` f8f107db-9bd4-4417-a023-60141809a528 · Label「排行榜」44 [255, 235, 194, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_2/btn_tab1` | UIMenuItemLabel | [-195, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_2/btn_tab2` | UIMenuItemLabel | [-65, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_2/btn_tab3` | UIMenuItemLabel | [65, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_2/btn_tab4` | UIMenuItemLabel | [195, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/SuperStageTopLayer/node_top/CCMenu_3` | CCMenu | [-320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLayer/node_top/CCMenu_3/btn_edit_biu` | UIMenuItemImage | [36, -63] | [0.5, 0.5] | [44, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-xdm-1.png` 9771bcb2-d3c4-4626-b54e-ba921586c85d |
| `/SuperStageTopLayer/node_top/CCMenu_3/btn_biu_visible` | UIMenuItemCheckBox | [36, -125] | [0.5, 0.5] | [44, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-dm-2.png` 815e9b78-8ca1-4113-bd1a-decc93bb5fa2 pressed `ui/championship/championship_btn-dm-1.png` df8c099c-f0f7-45f9-be02-5cec6014735a |
| `/SuperStageTopLayer/node_top/lbl_battle_round` | UILabelTTF | [0.0, 421.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冠军赛未开始」30 STZhongsong.ttf rgb[254, 223, 170] |
| `/SuperStageTopLayer/node_top/lbl_battle_time` | UILabelTTF | [0.0, 637.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冠军赛未开始」20 STZhongsong.ttf rgb[43, 249, 0] |

## SuperStageTopLegendLayer（38）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopLegendLayer` | SuperStageTopLegendLayer | [0, 0] | [0, 0] | [600, 856] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/spr_bg` | CCScale9Sprite | [300.0, 428.0] | [0.5, 0.5] | [624.0, 856.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageTopLegendLayer/node_title` | CCNode | [300.0, 848.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/SuperStageTopLegendLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「巔峰傳奇」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/SuperStageTopLegendLayer/spr_bg` | CCSprite | [300.0, 408.0] | [0.5, 0.5] | [560, 680] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/fantasy-land-hero-temple-bg.png` 3811add6-2d5d-439f-b562-8d3251398f04 |
| `/SuperStageTopLegendLayer/CCNode_1` | CCNode | [0.0, 211.891] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/UILabelTTF_1` | UILabelTTF | [300.0, 93.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「每日膜拜可获天梯积分奖励」20 STZhongsong.ttf rgbNone |
| `/SuperStageTopLegendLayer/UIMenu_1` | UIMenu | [555.0, 846.4] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/UIMenu_1/btn_close` | UIMenuItemImage | [0, 3] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageTopLegendLayer/node_show_parent` | CCNode | [300.0, 391.365] | [0.5, 0.5] | [600.0, 256.8] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3` | CCNode | [186.0, 12.84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/CCSprite_2` | CCSprite | [0, 200] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank3.png` 69422450-8daa-4591-8d9b-c48e87087d9a |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/lbl_stage3` | UILabelTTF | [-0.96, 115.4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」18 STZhongsong.ttf rgb[255, 223, 78] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/lbl_name3` | UILabelTTF | [-0.96, 92.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/CCMenu_1/btn_like3` | UIMenuItemImage | [-40, -145] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopLegendLayer/node_show_parent/node_show3/lbl_like3` | UILabelTTF | [0, -145] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2` | CCNode | [-186.0, 12.84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/CCSprite_2` | CCSprite | [0, 200] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank2.png` a263d50a-0908-449b-8264-e5e309e97cad |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/lbl_stage2` | UILabelTTF | [-0.96, 115.4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」18 STZhongsong.ttf rgb[255, 223, 78] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/lbl_name2` | UILabelTTF | [-0.96, 92.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/CCMenu_1/btn_like2` | UIMenuItemImage | [-40, -145] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopLegendLayer/node_show_parent/node_show2/lbl_like2` | UILabelTTF | [0, -145] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1` | CCNode | [0.0, 12.84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [230, 474] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-1.png` 237477ff-b2e7-41c4-bdef-c5810e15b575 |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/CCSprite_2` | CCSprite | [0, 243.96] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank1.png` 2b916702-c418-460f-a15e-6c295c2d79a5 |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/lbl_name1` | UILabelTTF | [-0.96, 121.36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」16 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/lbl_stage1` | UILabelTTF | [-0.96, 144.6] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」18 STZhongsong.ttf rgb[255, 223, 78] |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/CCMenu_1/btn_like1` | UIMenuItemImage | [-50, -175] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopLegendLayer/node_show_parent/node_show1/lbl_like1` | UILabelTTF | [0.04, -175] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopLegendLayer/node_show_parent/node_hero3` | CCNode | [186.0, 13.417] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_hero2` | CCNode | [-186.0, 13.428] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopLegendLayer/node_show_parent/node_hero1` | CCNode | [0.0, -6.769] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## SuperStageTopPreRewardLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopPreRewardLayer` | SuperStageTopPreRewardLayer | [0, 0] | [0, 0] | [640, 582] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopPreRewardLayer/CCSprite_1` | CCSprite | [320.0, 291.0] | [0.5, 0.5] | [491, 581] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-bg-top-prereward.png` 0027c5c6-7c75-43ba-b98d-4095b5349eda |
| `/SuperStageTopPreRewardLayer/CCSprite_2` | CCSprite | [320, 505] | [0.5, 0.5] | [146, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage-lang_spr-title-prereward.png` 0056193d-4a31-420a-854a-d5276410f98f |
| `/SuperStageTopPreRewardLayer/UILabelTTF_1` | UILabelTTF | [248.384, 432.771] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排名：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/SuperStageTopPreRewardLayer/UILabelTTF_2` | UILabelTTF | [248.4, 385.549] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「比赛场数：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/SuperStageTopPreRewardLayer/UILabelTTF_3` | UILabelTTF | [248.4, 328.605] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获胜场数：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/SuperStageTopPreRewardLayer/lbl_rank` | UILabelTTF | [307.906, 432.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/SuperStageTopPreRewardLayer/lbl_count` | UILabelTTF | [353.044, 385.539] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/SuperStageTopPreRewardLayer/lbl_win_count` | UILabelTTF | [353.044, 328.644] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/SuperStageTopPreRewardLayer/lbl_text1` | UILabelTTF | [235.2, 228.349] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopPreRewardLayer/lbl_name` | UILabelTTF | [288.0, 228.349] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜」24 STZhongsong.ttf rgb[255, 213, 107] |
| `/SuperStageTopPreRewardLayer/lbl_bet_name` | UILabelTTF | [320.0, 185.149] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得以上成就」24 STZhongsong.ttf rgb[254, 255, 255] |

## SuperStageTopRankCell（22）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopRankCell` | SuperStageTopRankCell | [0, 0] | [0, 0] | [540, 130] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/SuperStageTopRankCell/spr_rank` | CCSprite | [45, 95] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/SuperStageTopRankCell/lbl_rank` | UILabelTTF | [45, 65] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankCell/CCNode_1` | CCNode | [135, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankCell/CCNode_1/spr_photo` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/SuperStageTopRankCell/CCNode_1/spr_frame` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/SuperStageTopRankCell/CCNode_1/CCSprite_1` | CCSprite | [0, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/SuperStageTopRankCell/CCNode_1/lbl_level` | UILabelTTF | [0, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankCell/CCNode_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankCell/CCNode_1/menu/btn_photo` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal  |
| `/SuperStageTopRankCell/node_stage` | CCNode | [455, 90] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankCell/lbl_name` | UILabelTTF | [240, 90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家六字名字」44 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/SuperStageTopRankCell/CCSprite_1` | CCSprite | [210, 65] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/SuperStageTopRankCell/lbl_fighting` | UILabelTTF | [225, 65] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」44 CloudYuanCuGBK.ttf rgb[141, 89, 58] |
| `/SuperStageTopRankCell/lbl_server_name` | UILabelTTF | [200, 90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[S0]」36 CloudYuanCuGBK.ttf rgb[15, 159, 0] |
| `/SuperStageTopRankCell/lbl_stage_name` | UILabelTTF | [200, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「青铜I」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/SuperStageTopRankCell/node_right` | CCNode | [460, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankCell/node_right/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankCell/node_right/CCMenu_1/btn_like` | UIMenuItemImage | [-4.939, 2.443] | [0.5, 0.5] | [134, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-4.png` bb72e417-45f6-4e8b-ad88-67505f497167 |
| `/SuperStageTopRankCell/node_right/spr_like` | CCSprite | [-37.938, 2.553] | [0.5, 0.5] | [60, 60] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopRankCell/node_right/lbl_like` | UILabelTTF | [13.502, 2.553] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」18 STZhongsong.ttf rgb[85, 30, 20] |

## SuperStageTopRankLayer（54）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopRankLayer` | SuperStageTopRankLayer | [0, 0] | [0, 0] | [640, 980] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 980] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/SuperStageTopRankLayer/CCSprite_1` | CCSprite | [320, 975] | [0.5, 0.5] | [399, 114] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-title-rank.png` a5d825d0-63c3-4d9e-b236-0e61231e3500 |
| `/SuperStageTopRankLayer/spr_rank_bg` | CCScale9Sprite | [25, 60] | [0.5, 0.5] | [590, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/SuperStageTopRankLayer/scroll_view` | UIScrollViewBackpack | [320, 65] | [0.5, 0] | [580, 410] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/SuperStageTopRankLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/menu/btn_close` | UIMenuItemImage | [580, 950] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/SuperStageTopRankLayer/node_top_three` | CCNode | [320, 560] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_2` | CCNode | [-200, 160] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-3.png` a80f0de3-9669-48cd-baef-89594d23f8fa |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_spine_2` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_2/CCSprite_2` | CCSprite | [0, 130] | [0.5, 0.5] | [48, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-2.png` d0ec0a85-9afe-4c2f-a6bd-1891ac98f1ac |
| `/SuperStageTopRankLayer/node_top_three/node_2/lbl_stage_name_2` | UILabelTTF | [0, 100] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多是」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/SuperStageTopRankLayer/node_top_three/node_2/lbl_name_2` | UILabelTTF | [0, 75] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_fighting_2` | CCNode | [10, -185] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_fighting_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_fighting_2/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_fighting_2/lbl_fighting_2` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_like_2` | CCNode | [0, -155] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_like_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_like_2/CCMenu_1/btn_like2` | UIMenuItemImage | [-50, 0] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopRankLayer/node_top_three/node_2/node_like_2/lbl_like2` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankLayer/node_top_three/node_3` | CCNode | [200, 160] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_3/spr_top_3` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_spine_3` | CCNode | [0, -95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_3/CCSprite_1` | CCSprite | [0, 130] | [0.5, 0.5] | [45, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-3.png` e2842f90-f083-465b-89e0-a3ea512f9294 |
| `/SuperStageTopRankLayer/node_top_three/node_3/lbl_stage_name_3` | UILabelTTF | [0, 100] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多负」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/SuperStageTopRankLayer/node_top_three/node_3/lbl_name_3` | UILabelTTF | [0, 75] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多负」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_fighting_3` | CCNode | [10, -185] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_fighting_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_fighting_3/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_fighting_3/lbl_fighting_3` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_like_3` | CCNode | [0, -155] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_like_3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_like_3/CCMenu_1/btn_like3` | UIMenuItemImage | [-50, 0] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopRankLayer/node_top_three/node_3/node_like_3/lbl_like3` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankLayer/node_top_three/node_1` | CCNode | [0, 160] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_1/spr_top_1` | CCSprite | [0, 0] | [0.5, 0.5] | [230, 474] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-1.png` 237477ff-b2e7-41c4-bdef-c5810e15b575 |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_spine_1` | CCNode | [0, -100] | [0, 0] | [0, 0] | [1.2, 1.2] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_1/CCSprite_1` | CCSprite | [0, 155] | [0.5, 0.5] | [51, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_spr-rank-1.png` 4939cdf9-daf8-41fe-b743-ec8881a799d5 |
| `/SuperStageTopRankLayer/node_top_three/node_1/lbl_stage_name_1` | UILabelTTF | [0, 120] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜按时是」40 FZCSJW--GB1-0.ttf rgb[255, 219, 63] |
| `/SuperStageTopRankLayer/node_top_three/node_1/lbl_name_1` | UILabelTTF | [0, 95] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜按时是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_fighting_1` | CCNode | [10, -220] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_fighting_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_fighting_1/CCSprite_2` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_fighting_1/lbl_fighting_1` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.8, 0.8] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_like_1` | CCNode | [0, -185] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_like_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_like_1/CCMenu_1/btn_like1` | UIMenuItemImage | [-50, 0] | [0.5, 0.5] | [60, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/SuperStageTopRankLayer/node_top_three/node_1/node_like_1/lbl_like1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/SuperStageTopRankLayer/lbl_rank_self` | UILabelTTF | [60, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的排名: 未上榜」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/SuperStageTopRankLayer/lbl_stage_title_self` | UILabelTTF | [490, 40] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的段位: 」32 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/SuperStageTopRankLayer/lbl_stage_self` | UILabelTTF | [495, 40] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未上榜」32 CloudYuanCuGBK.ttf rgb[255, 219, 63] |
| `/SuperStageTopRankLayer/UILabelTTF_1` | UILabelTTF | [320, 972] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」52 FZCSJW--GB1-0.ttf rgb[255, 239, 93] |

## SuperStageTopRewardLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/SuperStageTopRewardLayer` | SuperStageTopRewardLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/SuperStageTopRewardLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/SuperStageTopRewardLayer/spr_title` | CCSprite | [320, 395] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** reward-layer-lang/spr-reward.png |
| `/SuperStageTopRewardLayer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/SuperStageTopRewardLayer/lbl_title` | UILabelTTF | [320.0, 267.52] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜你在选拔赛第二回合竞猜中押注成功」20 STZhongsong.ttf rgb[255, 229, 191] |
