# P2-c 排行/成就/日常/通用奖励弹框 Prefab 1:1 节点表

- 基线 main@e4d604a6 (#199 merged)；设计分辨率 640x960；坐标为 Creator 本地坐标（相对父锚点），ignoreAnchor 节点锚点写 (0,0)；angle = -ccb rotation。
- 无 member 名节点命名 `<ccb类>_<同级序号>`；STZhongsong/FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf，CloudYuanCuGBK → font/CloudYuanCuGBK.ttf，Helvetica → 系统字体。

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| AchievementCell | `prefabs/ui/achievement/AchievementCell.prefab` | 8 |
| AchievementGetLayer | `prefabs/ui/achievement/AchievementGetLayer.prefab` | 8 |
| AchievementLayer | `prefabs/ui/achievement/AchievementLayer.prefab` | 8 |
| DailyCell | `prefabs/ui/daily/DailyCell.prefab` | 9 |
| DailyPanel | `prefabs/ui/daily/DailyPanel.prefab` | 43 |
| ItemBuyLayer | `prefabs/ui/item/ItemBuyLayer.prefab` | 14 |
| ItemExhibitionLayer | `prefabs/ui/item/ItemExhibitionLayer.prefab` | 10 |
| ItemRewardLayer | `prefabs/ui/item/ItemRewardLayer.prefab` | 5 |
| ItemScelectNumLayer | `prefabs/ui/item/ItemScelectNumLayer.prefab` | 8 |
| ItemSelectLayer | `prefabs/ui/item/ItemSelectLayer.prefab` | 25 |
| LuckRewardLayer | `prefabs/ui/reward/LuckRewardLayer.prefab` | 6 |
| OnlineRewardIcon | `prefabs/ui/reward/OnlineRewardIcon.prefab` | 5 |
| OnlineRewardLayer | `prefabs/ui/reward/OnlineRewardLayer.prefab` | 9 |
| RankLayer | `prefabs/ui/rank/RankLayer.prefab` | 13 |
| RankListCell | `prefabs/ui/rank/RankListCell.prefab` | 10 |
| RankListLayer | `prefabs/ui/rank/RankListLayer.prefab` | 12 |
| RankSingleLayer | `prefabs/ui/rank/RankSingleLayer.prefab` | 10 |
| RankTopThreeCell | `prefabs/ui/rank/RankTopThreeCell.prefab` | 15 |
| RankTopThreeLayer | `prefabs/ui/rank/RankTopThreeLayer.prefab` | 34 |
| RewardCell | `prefabs/ui/reward/RewardCell.prefab` | 21 |
| RewardPreviewLayer | `prefabs/ui/reward/RewardPreviewLayer.prefab` | 3 |
| UnlockCubeLayer | `prefabs/ui/reward/UnlockCubeLayer.prefab` | 18 |
| UpStarSuccessLayer | `prefabs/ui/reward/UpStarSuccessLayer.prefab` | 46 |
| UpgradeSuccessLayer | `prefabs/ui/reward/UpgradeSuccessLayer.prefab` | 55 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R | 其它节点要的值（不采用） |
|---|---|---|
| `ui/common/win-bg_block-bg-22.png.meta` | [9, 9, 9, 9] |  |
| `ui/achievement/achievement_total-progress-bg.png.meta` | [0, 0, 10, 10] |  |
| `ui/item-select/item-select_block-res.png.meta` | [15, 15, 15, 15] |  |
| `ui/common/rank_spr-cell-bg-2.png.meta` | [40, 40, 40, 40] |  |
| `ui/common/rank_spr-cell-bg.png.meta` | [12, 12, 12, 12] |  |
| `ui/maps/map-bg-result-2.png.meta` | [79, 80, 100, 100] |  |
| `ui/common/win-bg_block-bg-24.png.meta` | [12, 12, 12, 12] |  |
| `ui/misc/totem_totem-xiaohaok.png.meta` | [5, 5, 5, 5] |  |

由其它 PR 改（本 PR 不碰，只用 SLICED 引用）：

- `ui/common/win-bg_win-bg-14.png.meta` → P2A
- `ui/common/win-bg_block-bg-45.png.meta` → P2A
- `ui/common/win-bg_cell-bg-6.png.meta` → P2A
- `ui/common/rank_spr-cell-bg-1.png.meta` → P2A
- `ui/common/win-bg_cell-bg-1.png.meta` → P2B

## AchievementCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AchievementCell` | AchievementCell | [0, 0] | [0, 0] | [484, 150] | [1, 1] | 0 | 是 |  |
| `/AchievementCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [484, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-1.png` d414718f-712c-442a-876b-336f9006430d insets[10, 10, 10, 10] |
| `/AchievementCell/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AchievementCell/UIMenu_1/btn_goto` | UIMenuItemImage | [410, 60] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd |
| `/AchievementCell/UIMenu_1/btn_submit` | UIMenuItemImage | [410, 60] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 |
| `/AchievementCell/spr_progress_bg` | CCSprite | [412, 120] | [0.5, 0.5] | [90, 14] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-bg-1.png` 6d51db6c-0b62-42fa-81dd-9af2857b81c4 |
| `/AchievementCell/lbl_progress` | UILabelTTF | [412, 120] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1/4」32 STZhongsong.ttf rgbNone |
| `/AchievementCell/spr_geted` | CCSprite | [414, 75] | [0.5, 0.5] | [102, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-geted.png` 50e7ade3-afff-4b57-a9cf-892e23090d89 |

## AchievementGetLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AchievementGetLayer` | AchievementGetLayer | [0, 0] | [0, 0] | [342, 106] | [1, 1] | 0 | 是 |  |
| `/AchievementGetLayer/spr_bg` | CCSprite | [0, 0] | [0, 0] | [342, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_spr-bg-get.png` fcf0d329-2b62-4e95-bab0-070dca1f5de4 |
| `/AchievementGetLayer/CCSprite_1` | CCSprite | [60, 63] | [0.5, 0.5] | [97, 75] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_icon-achievement.png` e7c7a9d9-faa2-4ddb-8786-90bdb0ce8381 |
| `/AchievementGetLayer/lbl_task_type` | UILabelTTF | [120, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「日常任务完成」40 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/AchievementGetLayer/spr_arrow` | CCSprite | [280, 45] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_spr-arrow.png` 731525b3-e68b-4641-885b-3c56e656c894 |
| `/AchievementGetLayer/node_desc` | CCNode | [120, 45] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AchievementGetLayer/menu_go` | UIMenu | [171.0, 53.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AchievementGetLayer/menu_go/btn_go` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## AchievementLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AchievementLayer` | AchievementLayer | [0, 0] | [0, 0] | [632, 950] | [1, 1] | 0 | 是 |  |
| `/AchievementLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [632, 950] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/AchievementLayer/spr_panel_bg` | CCScale9Sprite | [36, 40] | [0.5, 0.5] | [560, 805] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/AchievementLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AchievementLayer/UIMenu_1/btn_daily` | UIMenuItemTab | [110, 843] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「日 常」48 [122, 71, 45, 255] |
| `/AchievementLayer/UIMenu_1/btn_achievement` | UIMenuItemTab | [250, 843] | [0.5, 0] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「成 就」48 [122, 71, 45, 255] |
| `/AchievementLayer/UIMenu_1/btn_close` | UIMenuItemImage | [570, 942] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/AchievementLayer/node_layer` | CCNode | [31, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## DailyCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DailyCell` | DailyCell | [0, 0] | [0, 0] | [540, 150] | [1, 1] | 0 | 是 |  |
| `/DailyCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[30, 30, 30, 30] |
| `/DailyCell/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DailyCell/UIMenu_1/btn_goto` | UIMenuItemImage | [450, 45] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 |
| `/DailyCell/UIMenu_1/btn_submit` | UIMenuItemImage | [450, 45] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c |
| `/DailyCell/spr_progress_bg` | CCSprite | [450, 90] | [0.5, 0.5] | [126, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_item-progress-bg.png` c0e675a4-ea00-4f14-82df-40541ac08ea1 |
| `/DailyCell/lbl_progress` | UILabelTTF | [450, 90] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1/4」20 STZhongsong.ttf rgbNone |
| `/DailyCell/spr_geted` | CCSprite | [454, 60] | [0.5, 0.5] | [102, 70] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/common/other_spr-geted.png` 50e7ade3-afff-4b57-a9cf-892e23090d89 |
| `/DailyCell/CCScale9Sprite_2` | CCScale9Sprite | [270.0, 109.0] | [0.5, 0] | [540, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_title-bar.png` 6ab8386e-0d30-405d-976e-5554dafb971d |

## DailyPanel（43）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DailyPanel` | DailyPanel | [0, 0] | [0, 0] | [552, 142] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_bg` | CCSprite | [276.0, 71.0] | [0.5, 0.5] | [552, 142] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_bg.png` 3c5bf3bb-9c79-402a-825d-09de0157746c |
| `/DailyPanel/spr_progress_bg` | CCScale9Sprite | [276.0, 49.7] | [0.5, 0.5] | [498, 22] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/achievement/achievement_total-progress-bg.png` 3196dd85-f607-474d-ba8e-c53bfbb4b1f2 insets[0, 0, 10, 10] |
| `/DailyPanel/_taskIcon` | CCSprite | [38.64, 49.7] | [0.5, 0.5] | [60, 59] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_task-icon.png` d1016d39-fa0d-4d54-91cc-6285aa82a002 |
| `/DailyPanel/_progTipsBg` | CCSprite | [38.64, 21.3] | [0.5, 0.5] | [51, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_progress-tips-bg.png` 318e16a1-ddcf-4970-9341-59774f16de2d |
| `/DailyPanel/_progTipsBg/lbl_act_point` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99」22 STZhongsong.ttf rgb[255, 208, 110] |
| `/DailyPanel/_iconContainer` | CCNode | [0, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_1` | CCNode | [125, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [69, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_icon-bg.png` 4a46d0c0-5a76-48fc-8266-9c50187ec57a |
| `/DailyPanel/_iconContainer/CCNode_1/_iconPointer1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_1/_iconNum1` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「x00」20 STZhongsong.ttf rgbNone |
| `/DailyPanel/_iconContainer/CCNode_2` | CCNode | [220, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [69, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_icon-bg.png` 4a46d0c0-5a76-48fc-8266-9c50187ec57a |
| `/DailyPanel/_iconContainer/CCNode_2/_iconPointer2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_2/_iconNum2` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「x00」20 STZhongsong.ttf rgbNone |
| `/DailyPanel/_iconContainer/CCNode_3` | CCNode | [315, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [69, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_icon-bg.png` 4a46d0c0-5a76-48fc-8266-9c50187ec57a |
| `/DailyPanel/_iconContainer/CCNode_3/_iconPointer3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_3/_iconNum3` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「x00」20 STZhongsong.ttf rgbNone |
| `/DailyPanel/_iconContainer/CCNode_4` | CCNode | [415, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [69, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_icon-bg.png` 4a46d0c0-5a76-48fc-8266-9c50187ec57a |
| `/DailyPanel/_iconContainer/CCNode_4/_iconPointer4` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_4/_iconNum4` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「x00」20 STZhongsong.ttf rgbNone |
| `/DailyPanel/_iconContainer/CCNode_5` | CCNode | [510, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [69, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_icon-bg.png` 4a46d0c0-5a76-48fc-8266-9c50187ec57a |
| `/DailyPanel/_iconContainer/CCNode_5/_iconPointer5` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_iconContainer/CCNode_5/_iconNum5` | UILabelTTF | [0, -25] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「x00」20 STZhongsong.ttf rgbNone |
| `/DailyPanel/_progTextContainer` | CCNode | [0, 20] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_progTextContainer/CCNode_1` | CCNode | [125, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_progTextContainer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [47, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_progress-chunk-bg.png` 9007d7f4-1dc8-4cb4-9ef1-2d5206dea1dd |
| `/DailyPanel/_progTextContainer/CCNode_1/CCLabelTTF_1` | CCLabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「20」20 STZhongsong.ttf rgb[255, 232, 202] |
| `/DailyPanel/_progTextContainer/CCNode_2` | CCNode | [220, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_progTextContainer/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [47, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_progress-chunk-bg.png` 9007d7f4-1dc8-4cb4-9ef1-2d5206dea1dd |
| `/DailyPanel/_progTextContainer/CCNode_2/CCLabelTTF_1` | CCLabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「40」20 STZhongsong.ttf rgb[255, 232, 202] |
| `/DailyPanel/_progTextContainer/CCNode_3` | CCNode | [315, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_progTextContainer/CCNode_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [47, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_progress-chunk-bg.png` 9007d7f4-1dc8-4cb4-9ef1-2d5206dea1dd |
| `/DailyPanel/_progTextContainer/CCNode_3/CCLabelTTF_1` | CCLabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「60」20 STZhongsong.ttf rgb[255, 232, 202] |
| `/DailyPanel/_progTextContainer/CCNode_4` | CCNode | [415, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_progTextContainer/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [47, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_progress-chunk-bg.png` 9007d7f4-1dc8-4cb4-9ef1-2d5206dea1dd |
| `/DailyPanel/_progTextContainer/CCNode_4/CCLabelTTF_1` | CCLabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「80」20 STZhongsong.ttf rgb[255, 232, 202] |
| `/DailyPanel/_progTextContainer/CCNode_5` | CCNode | [510, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DailyPanel/_progTextContainer/CCNode_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [47, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/achievement/achievement_progress-chunk-bg.png` 9007d7f4-1dc8-4cb4-9ef1-2d5206dea1dd |
| `/DailyPanel/_progTextContainer/CCNode_5/CCLabelTTF_1` | CCLabelTTF | [0, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100」20 STZhongsong.ttf rgb[255, 232, 202] |

## ItemBuyLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ItemBuyLayer` | ItemBuyLayer | [0, 0] | [0, 0] | [512, 390] | [1, 1] | 0 | 是 |  |
| `/ItemBuyLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [512, 390] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[10, 10, 10, 10] |
| `/ItemBuyLayer/lbl_title` | UILabelTTF | [256, 356] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「道具购买」30 STZhongsong.ttf rgb[85, 30, 20] |
| `/ItemBuyLayer/lbl_name` | UILabelTTF | [256, 300] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「道具名称」20 STZhongsong.ttf rgb[97, 60, 25] |
| `/ItemBuyLayer/CCSprite_1` | CCSprite | [257.44, 145] | [0.5, 0.5] | [162, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-11.png` dbdddf2a-ef28-45ec-982e-918c1021ea8e |
| `/ItemBuyLayer/CCSprite_2` | CCSprite | [251, 100] | [0.5, 0.5] | [134, 42] | [1, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg-1.png` 1c80673b-7365-4493-9430-39e3729969f0 |
| `/ItemBuyLayer/CCSprite_3` | CCSprite | [196, 101] | [0.4983, 0.5] | [100, 100] | [0.45, 0.45] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/ItemBuyLayer/lbl_buy_num` | UILabelTTF | [256, 145] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/ItemBuyLayer/lbl_need_num` | UILabelTTF | [256, 100] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/ItemBuyLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ItemBuyLayer/menu/btn_close` | UIMenuItemImage | [470, 365] | [0.5, 0.5] | [55, 58] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ItemBuyLayer/menu/btn_done` | UIMenuItemLabel | [256, 40] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」24 [255, 255, 255, 255] |
| `/ItemBuyLayer/menu/btn_sub` | UIMenuItemImage | [191, 145] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-10.png` 196d417f-2208-46b7-88f8-cf56dbf8fbfb |
| `/ItemBuyLayer/menu/btn_add` | UIMenuItemImage | [321, 145] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-10.png` 1f83c385-6f6e-4528-a891-9eecdd2614b6 |

## ItemExhibitionLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ItemExhibitionLayer` | ItemExhibitionLayer | [0, 0] | [0, 0] | [488, 322] | [1, 1] | 0 | 是 |  |
| `/ItemExhibitionLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [488, 322] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[15, 15, 15, 15] |
| `/ItemExhibitionLayer/CCSprite_1` | CCSprite | [116, 295] | [0.5, 0.5] | [222, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/sevenday/seven-day-target_spr-title-bg.png` bb8fef41-1d24-4f15-967e-04760432a017 |
| `/ItemExhibitionLayer/CCSprite_2` | CCSprite | [0, 294] | [0, 0] | [68, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/sevenday/seven-day-target_spr-border.png` 4515cd94-7d76-4afb-bea4-2351a8efd536 |
| `/ItemExhibitionLayer/lbl_title` | UILabelTTF | [103, 296] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「奖  励」24 CloudYuanCuGBK.ttf rgb[254, 224, 178] |
| `/ItemExhibitionLayer/node_item` | CCNode | [244, 158] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ItemExhibitionLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ItemExhibitionLayer/CCMenu_1/btn_close` | UIMenuItemImage | [440, 295] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ItemExhibitionLayer/CCMenu_1/btn_enter` | UIMenuItemLabel | [244, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「确 定」48 [255, 255, 255, 255] |
| `/ItemExhibitionLayer/menu` | CCMenu | [241, 178] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## ItemRewardLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ItemRewardLayer` | ItemRewardLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ItemRewardLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/ItemRewardLayer/spr_title` | CCSprite | [320, 395] | [0.5, 0.5] | [340, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/item-reward_spr-reward.png` 7832ffd1-1c05-4e36-86b9-7e40bc17b4f9 |
| `/ItemRewardLayer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/ItemRewardLayer/scroll_view` | UIScrollViewBackpack | [20, 20] | [0, 0] | [580, 250] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ItemScelectNumLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ItemScelectNumLayer` | ItemSelectNumLayer | [0, 0] | [0, 0] | [370, 70] | [1, 1] | 0 | 是 |  |
| `/ItemScelectNumLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ItemScelectNumLayer/menu/btn_sub` | UIMenuItemImage | [26, 44] | [0.5, 0.5] | [52, 52] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-1.png` c8b65c0e-4a7b-44cd-87a4-bb3df82b17c9 |
| `/ItemScelectNumLayer/menu/btn_add` | UIMenuItemImage | [286, 44] | [0.5, 0.5] | [52, 52] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-1.png` d4d720c4-db5a-496f-ada2-cffa91e5b8d0 |
| `/ItemScelectNumLayer/menu/btn_max` | UIMenuItemImage | [341, 44] | [0.5, 0.5] | [58, 36] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-max.png` 21c6f8f2-5081-4cd8-b183-b90e4a9ef1fa |
| `/ItemScelectNumLayer/prog_bg` | CCSprite | [156, 44] | [0.5, 0.5] | [202, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/item-select/item-select_progress-bg.png` 65822958-ede4-4d55-8ef3-a078f9c2bc10 |
| `/ItemScelectNumLayer/lbl_total_num_tip` | UILabelTTF | [60, 0] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「总价:」44 STZhongsong.ttf rgb[255, 227, 183] |
| `/ItemScelectNumLayer/lbl_total_num` | UILabelTTF | [120, 0] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」48 STZhongsong.ttf rgb[0, 235, 15] |

## ItemSelectLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ItemSelectLayer` | ItemSelectLayer | [0, 0] | [0, 0] | [520, 460] | [1, 1] | 0 | 是 |  |
| `/ItemSelectLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [520, 460] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ItemSelectLayer/node_title` | CCNode | [260.0, 460.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ItemSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ItemSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「购 买」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/ItemSelectLayer/lbl_item_name` | UILabelTTF | [151.0, 360.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「——」52 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ItemSelectLayer/spr_scroll_bg` | CCScale9Sprite | [30, 99] | [0.5, 0.5] | [460, 170] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ItemSelectLayer/lbl_select_num_tip` | UILabelTTF | [55, 220] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择数量：」44 FZCSJW--GB1-0.ttf rgb[142, 89, 55] |
| `/ItemSelectLayer/lbl_select_num` | UILabelTTF | [160, 220] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」48 FZCSJW--GB1-0.ttf rgb[126, 118, 76] |
| `/ItemSelectLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ItemSelectLayer/menu/btn_cancel` | UIMenuItemLabel | [160, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「取 消」48 [122, 71, 45, 255] |
| `/ItemSelectLayer/menu/btn_confirm` | UIMenuItemLabel | [360, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确 定」48 [122, 71, 45, 255] |
| `/ItemSelectLayer/menu/btn_sub` | UIMenuItemImage | [75, 185] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-sub-1.png` b7b37bfa-f87d-44b7-904d-6f7cd8baacda |
| `/ItemSelectLayer/menu/btn_add` | UIMenuItemImage | [345, 185] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-add-1.png` 55ea79d1-a919-4011-a3b6-c40c1738aba0 |
| `/ItemSelectLayer/menu/btn_max` | UIMenuItemImage | [405, 185] | [0.5, 0.5] | [58, 38] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-cast-soul_btn-max-1.png` 508d15ad-b1a1-427c-b4e6-5b8ffc841daa |
| `/ItemSelectLayer/menu/btn_close` | UIMenuItemImage | [480, 438] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ItemSelectLayer/prog_bg` | CCSprite | [210, 185] | [0.5, 0.5] | [202, 24] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/item-select/item-select_progress-bg.png` 65822958-ede4-4d55-8ef3-a078f9c2bc10 |
| `/ItemSelectLayer/lbl_total_num_tip` | UILabelTTF | [60, 120] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「总价:」44 FZCSJW--GB1-0.ttf rgb[143, 89, 51] |
| `/ItemSelectLayer/lbl_total_num` | UILabelTTF | [125, 120] | [0, 0] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」48 FZCSJW--GB1-0.ttf rgb[126, 118, 76] |
| `/ItemSelectLayer/node_item` | CCNode | [84, 331] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ItemSelectLayer/lbl_limit` | UILabelTTF | [305, 300] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「限购」44 FZCSJW--GB1-0.ttf rgb[213, 113, 70] |
| `/ItemSelectLayer/node_price` | CCNode | [145, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ItemSelectLayer/node_price/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [150, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/item-select/item-select_block-res.png` a27c42e7-79ce-4008-906c-ecbbe439bb60 insets[15, 15, 15, 15] |
| `/ItemSelectLayer/node_price/spr_res_need` | CCSprite | [15, 15] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/ItemSelectLayer/node_price/lbl_res_need` | UILabelTTF | [30, 15] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999999」44 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## LuckRewardLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/LuckRewardLayer` | LuckRewardLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/LuckRewardLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/LuckRewardLayer/spr_title` | CCSprite | [320, 395] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** reward-layer/spr-reward.png |
| `/LuckRewardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/LuckRewardLayer/menu/btn_again` | UIMenuItemImage | [220, 60] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 |
| `/LuckRewardLayer/menu/btn_confirm` | UIMenuItemLabel | [420, 60] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「」24 [255, 255, 255, 255] |

## OnlineRewardIcon（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/OnlineRewardIcon` | OnlineRewardIcon | [0, 0] | [0, 0] | [148, 155] | [1, 1] | 0 | 是 |  |
| `/OnlineRewardIcon/CCSprite_1` | CCSprite | [74, 93] | [0.5, 0.5] | [130, 126] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/online-reward_spr-act-icon.png` 9b776531-acdc-4427-8b93-2b070f3fddea |
| `/OnlineRewardIcon/lbl_time` | UILabelTTF | [74, 15] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下档奖励:」20 STZhongsong.ttf rgbNone |
| `/OnlineRewardIcon/lbl_get` | UILabelTTF | [74, 48] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可领取」20 STZhongsong.ttf rgbNone |
| `/OnlineRewardIcon/spr_icon` | CCSprite | [73, 98] | [0.5, 0.5] | [0, 0] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `spine/10206009.png` 48748578-fc02-4012-a046-3bd8c6cae128 |

## OnlineRewardLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/OnlineRewardLayer` | OnlineRewardLayer | [0, 0] | [0, 0] | [624, 490] | [1, 1] | 0 | 是 |  |
| `/OnlineRewardLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [624, 525] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[60, 60, 60, 60] |
| `/OnlineRewardLayer/CCSprite_1` | CCSprite | [313, 525] | [0.5, 0.5] | [504, 110] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/online-reward-lang_spr-title-bg.png` ebac97e3-3e36-41ec-abbe-ed6c22e8e013 |
| `/OnlineRewardLayer/scroll_view` | CCScrollView | [40, 73] | [0, 0] | [540, 350] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/OnlineRewardLayer/lbl_time_tips` | UILabelTTF | [374, 55] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下档奖励:」20 STZhongsong.ttf rgb[249, 183, 60] |
| `/OnlineRewardLayer/lbl_time` | UILabelTTF | [477, 55] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00:00:00」20 STZhongsong.ttf rgb[61, 239, 6] |
| `/OnlineRewardLayer/CCSprite_2` | CCSprite | [273, 445] | [0.5, 0.5] | [322, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/online-reward-lang_yuejiangli.png` 133938f1-72ab-4e33-bb70-6351b25146b4 |
| `/OnlineRewardLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/OnlineRewardLayer/UIMenu_1/btn_go` | UIMenuItemImage | [479, 445] | [0.5, 0.5] | [78, 36] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/online-reward-lang_congzhisong.png` d9b8b052-4157-43d5-af1d-3fbf53246043 |

## RankLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RankLayer` | RankLayer | [0, 0] | [0, 0] | [562, 706] | [1, 1] | 0 | 是 |  |
| `/RankLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 706] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RankLayer/node_title` | CCNode | [281.0, 696.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RankLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RankLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankLayer/menu/btn_close` | UIMenuItemImage | [505, 670.224] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RankLayer/CCScale9Sprite_1` | CCScale9Sprite | [30, 150] | [0.5, 0.5] | [500, 470] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/RankLayer/spr_my_bg` | CCScale9Sprite | [30, 35] | [0.5, 0.5] | [500, 110] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RankLayer/UILabelTTF_1` | UILabelTTF | [83, 592] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排名」22 STZhongsong.ttf rgb[85, 30, 20] |
| `/RankLayer/CCSprite_1` | CCSprite | [89, 122] | [0.5, 0.5] | [127, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paimingk-2.png` 361cac2b-4fde-4651-8da2-8d08d3d8dc22 |
| `/RankLayer/UILabelTTF_2` | UILabelTTF | [86, 125] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「我的排名」22 STZhongsong.ttf rgb[255, 227, 183] |
| `/RankLayer/UILabelTTF_3` | UILabelTTF | [444, 592] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「层数」22 STZhongsong.ttf rgb[85, 30, 20] |

## RankListCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RankListCell` | RankListCell | [0, 0] | [0, 0] | [480, 150] | [1, 1] | 0 | 是 |  |
| `/RankListCell/spr_cell_bg` | CCSprite | [0, 0] | [0, 0] | [572, 182] | [0.84, 0.82] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank-lang_spr-rank-chapter.png` 6e3870a0-42c2-4e92-9e60-93631efd56ec |
| `/RankListCell/spr_photo` | CCSprite | [90, 42] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/RankListCell/spr_frame` | CCSprite | [90, 42] | [0.5, 0.5] | [138, 138] | [0.95, 0.95] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/RankListCell/lbl_name` | UILabelTTF | [152, 55] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六字真言真六」42 STZhongsong.ttf rgb[254, 255, 255] |
| `/RankListCell/lbl_num` | UILabelTTF | [152, 15] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100级」42 STZhongsong.ttf rgb[255, 249, 197] |
| `/RankListCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankListCell/menu/btn_worship` | UIMenuItemImage | [309, 56] | [0.5, 0.5] | [60, 60] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/RankListCell/spr_reddot` | CCSprite | [327, 66] | [0.5, 0.5] | [28, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-reddot-1.png` e44d6939-5da6-4585-9fdc-7d2f474b5554 |
| `/RankListCell/lbl_server_name` | UILabelTTF | [152, 33] | [0, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「服务器名」36 STZhongsong.ttf rgb[61, 235, 28] |

## RankListLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RankListLayer` | RankListLayer | [0, 0] | [0, 0] | [560, 800] | [1, 1] | 0 | 是 |  |
| `/RankListLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [580, 820] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RankListLayer/node_title` | CCNode | [280.0, 800.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RankListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RankListLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankListLayer/menu/btn_close` | UIMenuItemImage | [520, 775] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RankListLayer/spr_rank_bg` | CCScale9Sprite | [30, 30] | [0.5, 0.5] | [500, 640] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/RankListLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankListLayer/menu/btn_tab_1` | UIMenuItemTab | [100, 691] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「本服排行」48 [122, 71, 45, 255] |
| `/RankListLayer/menu/btn_tab_2` | UIMenuItemTab | [240, 691] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 · Label「跨服排行」48 [122, 71, 45, 255] |
| `/RankListLayer/scroll_view` | UIScrollViewBackpack | [280, 35] | [0.5, 0] | [480, 630] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## RankSingleLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RankSingleLayer` | RankSingleLayer | [0, 0] | [0, 0] | [600, 840] | [1, 1] | 0 | 是 |  |
| `/RankSingleLayer/spr_bg` | CCScale9Sprite | [300.0, 0.0] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RankSingleLayer/node_title` | CCNode | [300.0, 831.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankSingleLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RankSingleLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/RankSingleLayer/spr_panel_bg` | CCScale9Sprite | [300.0, 75.0] | [0.5, 0] | [542.5, 645] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/RankSingleLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankSingleLayer/UIMenu_1/btn_close` | UIMenuItemImage | [525, 831] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RankSingleLayer/scroll_view` | UIScrollViewBackpack | [300.0, 77.0] | [0.5, 0] | [540, 640] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/RankSingleLayer/lbl_tip1` | UILabelTTF | [300.0, 56.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「———」20 STZhongsong.ttf rgb[120, 65, 0] |

## RankTopThreeCell（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RankTopThreeCell` | RankTopThreeCell | [0, 0] | [0, 0] | [544, 110] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [544, 108] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-1.png` 7ad9aabb-182b-4376-b0c0-160f6b10702a insets[40, 40, 40, 40] |
| `/RankTopThreeCell/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [544, 108] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/RankTopThreeCell/spr_rank` | CCSprite | [45, 75] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/RankTopThreeCell/spr_photo` | CCSprite | [147, 56] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/RankTopThreeCell/lbl_name` | UILabelTTF | [225, 75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六字真言真六」44 STZhongsong.ttf rgb[122, 71, 45] |
| `/RankTopThreeCell/lbl_lv` | UILabelTTF | [225, 32] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」44 STZhongsong.ttf rgb[189, 86, 23] |
| `/RankTopThreeCell/lbl_rank` | UILabelTTF | [45, 57] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/RankTopThreeCell/spr_frame` | CCSprite | [147, 56] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/RankTopThreeCell/lbl_num` | UILabelTTF | [450, 55] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1230」48 STZhongsong.ttf rgb[122, 71, 45] |
| `/RankTopThreeCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeCell/menu/btn_photo` | CCMenuItemImage | [147, 56] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/RankTopThreeCell/lbl_server_name` | UILabelTTF | [225, 58] | [0, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「服务器名」36 STZhongsong.ttf rgb[15, 159, 0] |
| `/RankTopThreeCell/lbl_total_dmg` | UILabelTTF | [379, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「总伤害：—」18 CloudYuanCuGBK.ttf rgb[122, 71, 45] |
| `/RankTopThreeCell/lbl_max_dmg` | UILabelTTF | [379, 37] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「最高伤害：—」18 CloudYuanCuGBK.ttf rgb[122, 71, 45] |

## RankTopThreeLayer（34）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RankTopThreeLayer` | RankTopThreeLayer | [0, 0] | [0, 0] | [600, 1050] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 1070] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/RankTopThreeLayer/node_title` | CCNode | [300.0, 1050.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/RankTopThreeLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/RankTopThreeLayer/spr_rank_bg` | CCScale9Sprite | [20, 155] | [0.5, 0.5] | [560, 658] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/RankTopThreeLayer/spr_rank_bg_self` | CCScale9Sprite | [20, 24] | [0.5, 0.5] | [560, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/RankTopThreeLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/menu/btn_close` | UIMenuItemImage | [550, 1023] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/RankTopThreeLayer/spr_top_bg` | CCSprite | [300, 889] | [0.5, 0.5] | [542, 126] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-top-bg.png` eb3de09f-c632-4cbd-8d99-5ba20abb4999 |
| `/RankTopThreeLayer/spr_top_bg/node_1` | CCNode | [-1.0, 35.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/spr_top_bg/node_1/spr_head_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/RankTopThreeLayer/spr_top_bg/node_1/spr_top_bg_1` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/RankTopThreeLayer/spr_top_bg/node_1/spr_top_1` | CCSprite | [0, 45] | [0.5, 0.5] | [70, 52] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-top-1.png` 055ca194-1027-42db-8c2a-6c436e9e09a5 |
| `/RankTopThreeLayer/spr_top_bg/node_1/lbl_name_1` | UILabelTTF | [2, -74] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜按时是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/RankTopThreeLayer/spr_top_bg/node_2` | CCNode | [-136.0, 22.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/spr_top_bg/node_2/spr_head_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/RankTopThreeLayer/spr_top_bg/node_2/spr_top_bg_2` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/RankTopThreeLayer/spr_top_bg/node_2/spr_top_2` | CCSprite | [0, 45] | [0.5, 0.5] | [76, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-top-2.png` e468f150-090b-4a02-85b9-0bf52c966f38 |
| `/RankTopThreeLayer/spr_top_bg/node_2/lbl_name_2` | UILabelTTF | [-3, -62] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多是」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/RankTopThreeLayer/spr_top_bg/node_3` | CCNode | [129.0, 22.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/spr_top_bg/node_3/spr_head_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/RankTopThreeLayer/spr_top_bg/node_3/spr_top_bg_3` | CCSprite | [0, 0] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/RankTopThreeLayer/spr_top_bg/node_3/spr_top_3` | CCSprite | [0, 45] | [0.5, 0.5] | [74, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-top-3.png` 0cc0a96e-9b98-400f-beff-366ee81e13f8 |
| `/RankTopThreeLayer/spr_top_bg/node_3/lbl_name_3` | UILabelTTF | [13, -62] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜胜多负」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/RankTopThreeLayer/node_rank_title` | CCNode | [300, 764] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RankTopThreeLayer/node_rank_title/spr_rank_title_bg` | CCScale9Sprite | [-270, 0] | [0.5, 0.5] | [540, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg.png` 27fd7cc6-1893-4173-9be3-0f5dfd7eccf0 insets[12, 12, 12, 12] |
| `/RankTopThreeLayer/node_rank_title/spr_line_1` | CCSprite | [-140, 20] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |
| `/RankTopThreeLayer/node_rank_title/spr_line_2` | CCSprite | [100, 20] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |
| `/RankTopThreeLayer/node_rank_title/lbl_title_1` | UILabelTTF | [-205, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名」48 FZCSJW--GB1-0.ttf rgb[138, 66, 0] |
| `/RankTopThreeLayer/node_rank_title/lbl_title_2` | UILabelTTF | [-25, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」48 FZCSJW--GB1-0.ttf rgb[120, 65, 0] |
| `/RankTopThreeLayer/node_rank_title/lbl_title_3` | UILabelTTF | [180, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「战斗力」48 FZCSJW--GB1-0.ttf rgb[120, 65, 0] |
| `/RankTopThreeLayer/spr_ribbon` | CCSprite | [300, 135] | [0.5, 0.5] | [226, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank-lang_spr-paimingk-3.png` 6dd14941-10db-4594-b9ca-8106425f7b1a |
| `/RankTopThreeLayer/scroll_view` | UIScrollViewBackpack | [300, 160] | [0.5, 0] | [544, 600] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## RewardCell（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RewardCell` | RewardCell | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/RewardCell/spr_bg` | CCScale9Sprite | [320, 345] | [0.5, 0.5] | [641, 732] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-2.png` 7571ea87-b93f-4d49-b952-f26335492326 insets[80, 80, 100, 100] |
| `/RewardCell/spr_title` | CCSprite | [320, 711] | [0.5, 0.5] | [600, 190] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_spr-gongxi.png` 0ce62b5c-8f4c-4873-ab76-b0dc79c50150 |
| `/RewardCell/show_hero` | CCNode | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RewardCell/show_hero/test_scale` | CCNode | [315.0, 286.0] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/RewardCell/show_hero/test_scale/CCNode_1` | CCNode | [-314, -284] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RewardCell/show_hero/test_scale/CCNode_1/CCSprite_1` | CCSprite | [131, 577] | [0.5, 0.5] | [169, 153] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_gq.png` f787093a-f81b-45d0-938b-e45061c47452 |
| `/RewardCell/show_hero/test_scale/CCNode_1/spr_light_bottom_right` | CCSprite | [320, 385] | [0.5, 0.5] | [198, 83] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_seat.png` ab222274-3d22-49f9-a926-f7fb57e0aed6 |
| `/RewardCell/show_hero/test_scale/CCNode_1/spr_light_left` | CCSprite | [323, 331] | [0.5, 0] | [176, 211] | [1.3, 1.4] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/prophet-tree_light.png` 3652b539-6280-4aae-9c2a-a545a1094e83 |
| `/RewardCell/show_hero/test_scale/CCNode_1/node_star` | CCNode | [320, 284] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RewardCell/show_hero/test_scale/CCNode_1/icon_occupat` | CCSprite | [130, 578] | [0.5, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-occup-1.png` ef613cb3-a154-4e42-afd1-b40577318d2a |
| `/RewardCell/show_hero/test_scale/CCNode_1/hero_skill` | CCNode | [317, 52] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RewardCell/show_hero/test_scale/CCNode_1/lbl_hero_name` | UILabelTTF | [317, 142.5] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 STZhongsong.ttf rgb[255, 244, 174] |
| `/RewardCell/show_hero/test_scale/CCNode_1/CCSprite_2` | CCSprite | [154.75, 142.5] | [0.5, 0.5] | [154, 28] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/RewardCell/show_hero/test_scale/CCNode_1/CCSprite_3` | CCSprite | [484, 142.5] | [0.5, 0.5] | [154, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-huawen13.png` c4f7820b-c024-4adc-9e84-9d153f5e4980 |
| `/RewardCell/show_hero/test_scale/CCNode_1/spr_name_bg` | CCSprite | [320, 208.5] | [0.5, 0.5] | [330, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer_spr-mingzixia.png` 89264c7d-92f4-48c8-a8fa-bcf610463607 |
| `/RewardCell/show_hero/test_scale/CCNode_1/hero` | CCNode | [320, 480] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/RewardCell/menu/btn_again` | UIMenuItemImage | [206, 5] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 |
| `/RewardCell/menu/btn_confirm` | UIMenuItemLabel | [437, 5] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-2.png` b9058bee-1e8e-4b2a-9cec-3747be265f79 · Label「」24 [255, 255, 255, 255] |
| `/RewardCell/menu/btn_share` | UIMenuItemLabel | [206, 5] | [0.5, 0.5] | [196, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-4.png` 93ba07c7-c22c-46b8-b745-e80eb28e79e9 · Label「」24 [255, 255, 255, 255] |

## RewardPreviewLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RewardPreviewLayer` | RewardPreviewLayer | [0, 0] | [0, 0] | [300, 108] | [1, 1] | 0 | 是 |  |
| `/RewardPreviewLayer/spr_bg` | CCScale9Sprite | [0, 108] | [0, 1] | [300, 108] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[13, 13, 13, 13] |
| `/RewardPreviewLayer/scroll_view` | UIScrollViewBackpack | [6, 104.528] | [0, 1] | [288, 100] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## UnlockCubeLayer（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UnlockCubeLayer` | UnlockCubeLayer | [0, 0] | [0, 0] | [640, 380] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 190] | [0.5, 0.5] | [640, 380] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/UnlockCubeLayer/node_title` | CCNode | [320.0, 376.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/UnlockCubeLayer/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择遗物」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/UnlockCubeLayer/node_desc` | CCNode | [90, 160] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/UIMenu_1/btn_cannel` | UIMenuItemLabel | [200, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「添 加」44 [255, 255, 255, 255] |
| `/UnlockCubeLayer/UIMenu_1/btn_enter` | UIMenuItemLabel | [430, 70] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「开始鉴定」44 [255, 255, 255, 255] |
| `/UnlockCubeLayer/UIMenu_2` | UIMenu | [584, 375] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/UIMenu_2/btn_close` | UIMenuItemImage | [0, 0] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/UnlockCubeLayer/CCScale9Sprite_2` | CCScale9Sprite | [313, 205] | [0.5, 0.5] | [480, 190] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-45.png` 3f91d702-2c6e-4b55-ae1d-cfe52210a84f insets[20, 20, 20, 20] |
| `/UnlockCubeLayer/node_rich` | CCNode | [320, 260] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/CCNode_1` | CCNode | [203, 150] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UnlockCubeLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [0, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「當前擁有：」22 FZCSJW--GB1-0.ttf rgb[121, 71, 44] |
| `/UnlockCubeLayer/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [100, -18] | [0.5, 0.5] | [150, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/totem_totem-xiaohaok.png` 6010759e-74a7-43b4-b410-c697f7b8065e insets[5, 5, 5, 5] |
| `/UnlockCubeLayer/CCNode_1/spr_icon` | CCSprite | [120, 0] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900002.png` 9d55c246-a3fb-4c20-90e2-cf2749517375 |
| `/UnlockCubeLayer/CCNode_1/lbl_num` | UILabelTTF | [137, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「當前擁有：」22 FZCSJW--GB1-0.ttf rgb[255, 228, 180] |

## UpStarSuccessLayer（46）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UpStarSuccessLayer` | UpStarSuccessLayer | [0, 0] | [0, 0] | [562, 706] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 706] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[22, 22, 22, 22] |
| `/UpStarSuccessLayer/spr_circle` | CCSprite | [281, 522.2] | [0.5, 0.5] | [290, 290] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle-1.png` f5ab1bb3-0592-49f5-bca7-b13bfac7efe9 |
| `/UpStarSuccessLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/menu/btn_enter` | UIMenuItemLabel | [281, 80] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |
| `/UpStarSuccessLayer/CCSprite_1` | CCSprite | [281, 520] | [0.5, 0.5] | [70, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-1.png` 6a81331a-054d-46d4-b4c9-b425097b6eea |
| `/UpStarSuccessLayer/node_effect` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/node_effect/spr_upstar_success_tip` | CCSprite | [281, 670] | [0.5, 0.5] | [226, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success-lang_up-star-success.png` 06b33426-0cac-4dae-9af2-0f2f0fee9bfb |
| `/UpStarSuccessLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_1/CCSprite_1` | CCSprite | [281, 450] | [0.5, 0.5] | [440, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_title-img.png` 2d5b1d22-1f33-4652-b066-841be9978c4c |
| `/UpStarSuccessLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [281, 452] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「属性提升」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_1` | CCNode | [281, 370] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_1/lbl_attr_2` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击力:」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_1/lbl_pre_2` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_1/lbl_cur_2` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_1/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_2` | CCNode | [281, 330] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_1/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_2/lbl_attr_3` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命值：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_2/lbl_pre_3` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_2/lbl_cur_3` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_2/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_3` | CCNode | [281, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_1/CCNode_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_3/lbl_attr_4` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_3/lbl_pre_4` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_3/lbl_cur_4` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_3/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_4` | CCNode | [281, 250] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_1/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_4/lbl_attr_5` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_4/lbl_pre_5` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_4/lbl_cur_5` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_4/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_5` | CCNode | [281, 410] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_1/CCNode_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpStarSuccessLayer/CCNode_1/CCNode_5/lbl_attr_1` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_5/lbl_pre_1` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_5/lbl_cur_1` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpStarSuccessLayer/CCNode_1/CCNode_5/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpStarSuccessLayer/CCNode_2` | CCNode | [0, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpStarSuccessLayer/CCNode_2/CCSprite_1` | CCSprite | [281, 150] | [0.5, 0.5] | [440, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_title-img.png` 2d5b1d22-1f33-4652-b066-841be9978c4c |
| `/UpStarSuccessLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [281, 152] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能提升」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpStarSuccessLayer/CCNode_2/spr_arrow` | CCSprite | [281, 95] | [0.5, 0.5] | [50, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_skill-arrow.png` 93accc90-1585-44a0-b8a1-57797ab417ef |
| `/UpStarSuccessLayer/CCMenu_1` | CCMenu | [0, 60] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |

## UpgradeSuccessLayer（55）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/UpgradeSuccessLayer` | UpgradeSuccessLayer | [0, 0] | [0, 0] | [562, 706] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [562, 706] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[22, 22, 22, 22] |
| `/UpgradeSuccessLayer/spr_circle` | CCSprite | [281, 522.2] | [0.5, 0.5] | [290, 290] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-circle-1.png` f5ab1bb3-0592-49f5-bca7-b13bfac7efe9 |
| `/UpgradeSuccessLayer/CCSprite_1` | CCSprite | [281, 460] | [0.5, 0.5] | [70, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-1.png` 6a81331a-054d-46d4-b4c9-b425097b6eea |
| `/UpgradeSuccessLayer/node_effect` | CCNode | [0, -5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/node_effect/spr_upgrade_success_tip` | CCSprite | [281, 670] | [0.5, 0.5] | [226, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success-lang_up-grade-success.png` f7d96247-7c15-4ba2-9757-de7311b13952 |
| `/UpgradeSuccessLayer/CCNode_1` | CCNode | [-50, -45] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCSprite_1` | CCSprite | [331, 450] | [0.5, 0.5] | [440, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_title-img.png` 2d5b1d22-1f33-4652-b066-841be9978c4c |
| `/UpgradeSuccessLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [331, 452] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「属性提升」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_1` | CCNode | [281, 370] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_1/lbl_attr_1` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_1/lbl_pre_1` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 254] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_1/lbl_cur_1` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_1/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_2` | CCNode | [281, 330] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_2/lbl_attr_2` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命值：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_2/lbl_pre_2` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_2/lbl_cur_2` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_2/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_3` | CCNode | [281, 290] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_3/lbl_attr_3` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_3/lbl_pre_3` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_3/lbl_cur_3` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_3/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_4` | CCNode | [281, 250] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_4/lbl_attr_4` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_4/lbl_pre_4` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_4/lbl_cur_4` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_4/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_5` | CCNode | [281, 410] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_5/lbl_level` | UILabelTTF | [-180, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「等级上限」20 STZhongsong.ttf rgb[247, 98, 37] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_5/lbl_pre_level` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_5/lbl_cur_level` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[250, 193, 37] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_5/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [60, 40] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-level.png` be6f4057-0edc-4e63-a313-e38efc0d3c76 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_6` | CCNode | [281, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [480, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_content-img.png` 90af056d-1925-4fd5-8a29-e06e2354e962 |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_6/lbl_attr_5` | UILabelTTF | [-160, 2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击力：」20 STZhongsong.ttf rgb[85, 30, 20] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_6/lbl_pre_5` | UILabelTTF | [-85, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 254] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_6/lbl_cur_5` | UILabelTTF | [70, 1] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1234567」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/UpgradeSuccessLayer/CCNode_1/CCNode_6/CCSprite_2` | CCSprite | [26, 0] | [0.5, 0.5] | [42, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-arrow-2.png` 7ee8235d-569d-4282-af31-0e750abf1769 |
| `/UpgradeSuccessLayer/node_pre_star` | CCNode | [225, 460] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/node_cur_star` | CCNode | [332, 460] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/menu/btn_enter` | UIMenuItemLabel | [281, 103] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |
| `/UpgradeSuccessLayer/skill_node` | CCNode | [469, 304] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/skill_node/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [148, 156] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-skill-bg.png` e1e05031-4bad-440e-8af0-acab610fc796 |
| `/UpgradeSuccessLayer/skill_node/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [148, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-up-success_spr-skill-bg1.png` e3656a59-0317-4178-af78-1b4ff2a35858 |
| `/UpgradeSuccessLayer/skill_node/skill_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/UpgradeSuccessLayer/skill_node/UILabelTTF_1` | UILabelTTF | [0, 65] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「解锁技能」20 STZhongsong.ttf rgb[106, 58, 47] |
| `/UpgradeSuccessLayer/skill_node/lbl_skill_name` | UILabelTTF | [0, -54] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名称」18 STZhongsong.ttf rgb[85, 30, 20] |

## 只记文档、不加组件

`langKey`、`outline`、`shadow` 按 brief 只记在这里，Prefab 上不加 LabelOutline / LabelShadow，`_enableOutline` / `_enableShadow` 保持 false。

### langKey

| Prefab | 路径 | langKey | 文案 |
|---|---|---|---|
| AchievementLayer | `/AchievementLayer/UIMenu_1/btn_daily/Label` | lang###5008 | 日 常 |
| AchievementLayer | `/AchievementLayer/UIMenu_1/btn_achievement/Label` | lang###5037 | 成 就 |
| ItemBuyLayer | `/ItemBuyLayer/lbl_title` | lang###5423 | 道具购买 |
| ItemBuyLayer | `/ItemBuyLayer/lbl_name` | lang###5138 | 道具名称 |
| ItemExhibitionLayer | `/ItemExhibitionLayer/lbl_title` | lang###5401 | 奖  励 |
| ItemExhibitionLayer | `/ItemExhibitionLayer/CCMenu_1/btn_enter/Label` | lang###5176 | 确 定 |
| ItemScelectNumLayer | `/ItemScelectNumLayer/lbl_total_num_tip` | lang###5013 | 总价: |
| ItemSelectLayer | `/ItemSelectLayer/node_title/lbl_title` | lang###41201 | 购 买 |
| ItemSelectLayer | `/ItemSelectLayer/lbl_select_num_tip` | lang###41230 | 选择数量： |
| ItemSelectLayer | `/ItemSelectLayer/menu/btn_cancel/Label` | lang###47703 | 取 消 |
| ItemSelectLayer | `/ItemSelectLayer/menu/btn_confirm/Label` | lang###72018 | 确 定 |
| ItemSelectLayer | `/ItemSelectLayer/lbl_total_num_tip` | lang###5013 | 总价: |
| ItemSelectLayer | `/ItemSelectLayer/lbl_limit` | lang###5166 | 限购 |
| OnlineRewardIcon | `/OnlineRewardIcon/lbl_time` | lang###5696 | 下档奖励: |
| OnlineRewardIcon | `/OnlineRewardIcon/lbl_get` | lang###5093 | 可领取 |
| OnlineRewardLayer | `/OnlineRewardLayer/lbl_time_tips` | lang###5696 | 下档奖励: |
| RankLayer | `/RankLayer/node_title/lbl_title` | lang###5649 | 排行榜 |
| RankLayer | `/RankLayer/UILabelTTF_1` | lang###5285 | 排名 |
| RankLayer | `/RankLayer/UILabelTTF_2` | lang###5315 | 我的排名 |
| RankLayer | `/RankLayer/UILabelTTF_3` | lang###5609 | 层数 |
| RankListCell | `/RankListCell/lbl_num` | lang###5305 | 100级 |
| RankListCell | `/RankListCell/lbl_server_name` | lang###5277 | 服务器名 |
| RankListLayer | `/RankListLayer/node_title/lbl_title` | lang###5649 | 排行榜 |
| RankSingleLayer | `/RankSingleLayer/node_title/lbl_title` | lang###5254 | 我的竞猜 |
| RankTopThreeCell | `/RankTopThreeCell/lbl_server_name` | lang###5277 | 服务器名 |
| RankTopThreeLayer | `/RankTopThreeLayer/node_title/lbl_title` | lang###5649 | 排行榜 |
| RankTopThreeLayer | `/RankTopThreeLayer/spr_top_bg/node_1/lbl_name_1` | lang###5678 | 排行榜按时是 |
| RankTopThreeLayer | `/RankTopThreeLayer/spr_top_bg/node_2/lbl_name_2` | lang###5439 | 排行榜胜多是 |
| RankTopThreeLayer | `/RankTopThreeLayer/spr_top_bg/node_3/lbl_name_3` | lang###5421 | 排行榜胜多负 |
| RankTopThreeLayer | `/RankTopThreeLayer/node_rank_title/lbl_title_1` | lang###5285 | 排名 |
| RankTopThreeLayer | `/RankTopThreeLayer/node_rank_title/lbl_title_2` | lang###5621 | 玩家名称 |
| RankTopThreeLayer | `/RankTopThreeLayer/node_rank_title/lbl_title_3` | lang###5395 | 战斗力 |
| RewardCell | `/RewardCell/show_hero/test_scale/CCNode_1/lbl_hero_name` | lang###5032 | 英 雄 |
| UnlockCubeLayer | `/UnlockCubeLayer/node_title/lbl_title` | lang###77313 | 选择遗物 |
| UnlockCubeLayer | `/UnlockCubeLayer/UIMenu_1/btn_cannel/Label` | lang###77308 | 添 加 |
| UnlockCubeLayer | `/UnlockCubeLayer/UIMenu_1/btn_enter/Label` | lang###77307 | 开始鉴定 |
| UnlockCubeLayer | `/UnlockCubeLayer/CCNode_1/UILabelTTF_1` | lang###77315 | 當前擁有： |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_1/UILabelTTF_1` | lang###5028 | 属性提升 |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_1/CCNode_1/lbl_attr_2` | lang###5554 | 攻击力: |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_1/CCNode_2/lbl_attr_3` | lang###5397 | 生命值： |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_1/CCNode_3/lbl_attr_4` | lang###5311 | 防御力： |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_1/CCNode_4/lbl_attr_5` | lang###5701 | 速度： |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_1/CCNode_5/lbl_attr_1` | lang###5247 | 战力： |
| UpStarSuccessLayer | `/UpStarSuccessLayer/CCNode_2/UILabelTTF_1` | lang###5433 | 技能提升 |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/UILabelTTF_1` | lang###5028 | 属性提升 |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/CCNode_1/lbl_attr_1` | lang###5300 | 攻击力： |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/CCNode_2/lbl_attr_2` | lang###5397 | 生命值： |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/CCNode_3/lbl_attr_3` | lang###5311 | 防御力： |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/CCNode_4/lbl_attr_4` | lang###5701 | 速度： |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/CCNode_5/lbl_level` | lang###5703 | 等级上限 |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/CCNode_1/CCNode_6/lbl_attr_5` | lang###5300 | 攻击力： |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/skill_node/UILabelTTF_1` | lang###5016 | 解锁技能 |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/skill_node/lbl_skill_name` | lang###5354 | 技能名称 |

### outline

| Prefab | 路径 | outline | 文案 |
|---|---|---|---|
| AchievementCell | `/AchievementCell/lbl_progress` | `{"color":[0,0,0,255],"size":4}` | 1/4 |
| DailyCell | `/DailyCell/lbl_progress` | `{"color":[0,0,0,255],"size":2}` | 1/4 |
| DailyPanel | `/DailyPanel/_iconContainer/CCNode_1/_iconNum1` | `{"color":[0,0,0,255],"size":1}` | x00 |
| DailyPanel | `/DailyPanel/_iconContainer/CCNode_2/_iconNum2` | `{"color":[0,0,0,255],"size":1}` | x00 |
| DailyPanel | `/DailyPanel/_iconContainer/CCNode_3/_iconNum3` | `{"color":[0,0,0,255],"size":1}` | x00 |
| DailyPanel | `/DailyPanel/_iconContainer/CCNode_4/_iconNum4` | `{"color":[0,0,0,255],"size":1}` | x00 |
| DailyPanel | `/DailyPanel/_iconContainer/CCNode_5/_iconNum5` | `{"color":[0,0,0,255],"size":1}` | x00 |
| ItemExhibitionLayer | `/ItemExhibitionLayer/CCMenu_1/btn_enter/Label` | `{"color":[122,71,45,255],"size":4}` | 确 定 |
| ItemSelectLayer | `/ItemSelectLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` | 购 买 |
| RankLayer | `/RankLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` | 排行榜 |
| RankListLayer | `/RankListLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` | 排行榜 |
| RankSingleLayer | `/RankSingleLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` | 我的竞猜 |
| RankTopThreeCell | `/RankTopThreeCell/lbl_rank` | `{"color":[77,37,31,255],"size":4}` | 1 |
| RankTopThreeLayer | `/RankTopThreeLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` | 排行榜 |
| RankTopThreeLayer | `/RankTopThreeLayer/spr_top_bg/node_1/lbl_name_1` | `{"color":[130,70,35,255],"size":4}` | 排行榜按时是 |
| RankTopThreeLayer | `/RankTopThreeLayer/spr_top_bg/node_2/lbl_name_2` | `{"color":[130,70,35,255],"size":4}` | 排行榜胜多是 |
| RankTopThreeLayer | `/RankTopThreeLayer/spr_top_bg/node_3/lbl_name_3` | `{"color":[130,70,35,255],"size":4}` | 排行榜胜多负 |
| UnlockCubeLayer | `/UnlockCubeLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` | 选择遗物 |
| UnlockCubeLayer | `/UnlockCubeLayer/UIMenu_1/btn_cannel/Label` | `{"color":[13,91,45,255],"size":4}` | 添 加 |
| UnlockCubeLayer | `/UnlockCubeLayer/UIMenu_1/btn_enter/Label` | `{"color":[131,43,22,255],"size":4}` | 开始鉴定 |

### shadow

本批节点（含按钮子 Label）没有 shadow。

### 按钮文字缺省字号

ccbi 没写字号的按钮文字按 24、没写颜色的按白色，spec 已标 `fontSizeDefaulted`。

| Prefab | 路径 | 字号 | 颜色 | 文案 |
|---|---|---:|---|---|
| ItemBuyLayer | `/ItemBuyLayer/menu/btn_done/Label` | 24 | [255, 255, 255, 255] |  |
| LuckRewardLayer | `/LuckRewardLayer/menu/btn_confirm/Label` | 24 | [255, 255, 255, 255] |  |
| RewardCell | `/RewardCell/menu/btn_confirm/Label` | 24 | [255, 255, 255, 255] |  |
| RewardCell | `/RewardCell/menu/btn_share/Label` | 24 | [255, 255, 255, 255] |  |
| UpStarSuccessLayer | `/UpStarSuccessLayer/menu/btn_enter/Label` | 24 | [255, 255, 255, 255] |  |
| UpgradeSuccessLayer | `/UpgradeSuccessLayer/menu/btn_enter/Label` | 24 | [255, 255, 255, 255] |  |

### 缺图（spriteFrame 留空）

- LuckRewardLayer `/LuckRewardLayer/spr_title`：`reward-layer/spr-reward.png` 在 resources 里没有。
- OnlineRewardIcon `/OnlineRewardIcon/spr_icon`：`hero-icon/10206009.png` 映射到 `spine/10206009.png`（uuid `48748578-fc02-4012-a046-3bd8c6cae128`），meta 类型是 texture，没有 `@f9941`。不改该 meta 的类型。

### 九宫格第二套边距

spec 里 8 张本 PR 负责的图 `alsoNeeded` 都是空的，没有被舍弃的第二套边距。其它 PR 负责的 5 张 `.meta` 本 PR 不改，节点仍用 SLICED。

### 同级重名

RankListLayer 有两个同级 `menu`（`duplicateSiblingNames`: `RankListLayer:menu`），都保留，子节点分别挂在各自的 menu 下。
