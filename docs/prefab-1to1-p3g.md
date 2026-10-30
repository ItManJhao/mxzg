# P3-g 梦境/神遗/远古 Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| AncientCell | `prefabs/ui/ancient/AncientCell.prefab` | 4 |
| AncientLayer | `prefabs/ui/ancient/AncientLayer.prefab` | 10 |
| DreamFirstLayer | `prefabs/ui/dream/DreamFirstLayer.prefab` | 11 |
| DreamFriendCell | `prefabs/ui/dream/DreamFriendCell.prefab` | 10 |
| DreamFriendLayer | `prefabs/ui/dream/DreamFriendLayer.prefab` | 44 |
| DreamLayer | `prefabs/ui/dream/DreamLayer.prefab` | 43 |
| DreamMainRankCell | `prefabs/ui/dream/DreamMainRankCell.prefab` | 4 |
| DreamRankCell | `prefabs/ui/dream/DreamRankCell.prefab` | 12 |
| DreamRankLayer | `prefabs/ui/dream/DreamRankLayer.prefab` | 29 |
| DreamRewardCell | `prefabs/ui/dream/DreamRewardCell.prefab` | 7 |
| DreamRewardLayer | `prefabs/ui/dream/DreamRewardLayer.prefab` | 8 |
| DreamSelectCell | `prefabs/ui/dream/DreamSelectCell.prefab` | 7 |
| DreamSelectLayer | `prefabs/ui/dream/DreamSelectLayer.prefab` | 11 |
| DreamShowRewardCell | `prefabs/ui/dream/DreamShowRewardCell.prefab` | 4 |
| GRConditionCell | `prefabs/ui/gr/GRConditionCell.prefab` | 8 |
| GRConditionLayer | `prefabs/ui/gr/GRConditionLayer.prefab` | 8 |
| GREndCell | `prefabs/ui/gr/GREndCell.prefab` | 11 |
| GRMissionCastleCell | `prefabs/ui/gr/GRMissionCastleCell.prefab` | 10 |
| GRMissionGiftLayer | `prefabs/ui/gr/GRMissionGiftLayer.prefab` | 5 |
| GRMissionGiftPageLayer | `prefabs/ui/gr/GRMissionGiftPageLayer.prefab` | 13 |
| GRMissionLayer | `prefabs/ui/gr/GRMissionLayer.prefab` | 74 |
| GRMissionListCell | `prefabs/ui/gr/GRMissionListCell.prefab` | 9 |
| GRMissionListLayer | `prefabs/ui/gr/GRMissionListLayer.prefab` | 24 |
| GRMissionStarRewardCell | `prefabs/ui/gr/GRMissionStarRewardCell.prefab` | 8 |
| GRMissionStarRewardLayer | `prefabs/ui/gr/GRMissionStarRewardLayer.prefab` | 8 |
| RGMissionLayer | `prefabs/ui/rg/RGMissionLayer.prefab` | 6 |
| RGMissionListLayer | `prefabs/ui/rg/RGMissionListLayer.prefab` | 6 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/dream/dream_spr-bg-1.png` | [10, 10, 10, 10] |
| `ui/dream/dream_spr-bg-2.png` | [15, 15, 15, 14] |
| `ui/dream/dream_spr-2.png` | [10, 10, 10, 9] |
| `ui/dream/dream_spr_item_bg.png` | [100, 40, 100, 100] |
| `ui/common/win-bg_block-bg-40.png` | [12, 12, 12, 12] |
| `ui/misc/god-relic_spr-bg-3.png` | [0, 0, 330, 150] |
| `ui/misc/god-relic_spr-under-1.png` | [1, 1, 3, 3] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/common/win-bg_block-bg-10.png` → P3A
- `ui/misc/dungeon_spr-reward-cell-bg.png` → P3A
- `ui/common/win-bg_block-bg-41.png` → P3B1

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/rank_spr-cell-bg.png` [12, 12, 12, 12]（edited by P2C）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [49, 9, 9, 9] | `GRMissionStarRewardCell:/GRMissionStarRewardCell/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamFriendLayer:/DreamFriendLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamLayer:/DreamLayer/message/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamRankLayer:/DreamRankLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamRewardLayer:/DreamRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamSelectLayer:/DreamSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GRMissionStarRewardLayer:/GRMissionStarRewardLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamFirstLayer:/DreamFirstLayer/show/item_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/rank/rank_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/rank/spr_self_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/reward/reward_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRewardLayer:/DreamRewardLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamSelectLayer:/DreamSelectLayer/buff_list` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GRMissionStarRewardLayer:/GRMissionStarRewardLayer/spr_bg` |
| `win-bg_block-bg-40.png` | [12, 12, 12, 12] | [9, 9, 9, 9] | `GRMissionCastleCell:/GRMissionCastleCell/spr_chapter_bg` |

## AncientCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AncientCell` | AncientCell | [0, 0] | [0, 0] | [570, 220] | [1, 1] | 0 | 是 |  |
| `/AncientCell/spr_bg` | CCSprite | [286, 110] | [0.5, 0.5] | [552, 211] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/ancient-lang/ancient-lang_cell-1.png` f8749e58-603a-40c7-87a5-1eab11862aa1 |
| `/AncientCell/lbl_tip` | UILabelTTF | [377.0, 40.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「远古战场」18 STZhongsong.ttf rgb[253, 232, 193] |
| `/AncientCell/scroll_view` | UIScrollViewBackpack | [380.0, 59.04] | [0.5, 0] | [340, 85] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## AncientLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AncientLayer` | AncientLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/AncientLayer/spr_bg` | CCSprite | [0.0, 960.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-ancient-1.png` 36cd47bd-48df-48e0-a321-02d22dbf8881 |
| `/AncientLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 100] | [1, 1] | 0 | 是 |  |
| `/AncientLayer/node_top/CCNode_1` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 100.0] | [1, 1] | 0 | 是 |  |
| `/AncientLayer/node_top/CCNode_1/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AncientLayer/node_top/CCNode_1/CCMenu_1/btn_back` | UIMenuItemImage | [-81, -40] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/AncientLayer/node_top/CCNode_2` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AncientLayer/node_top/CCNode_2/top` | CCSprite | [0, -72] | [0.5, 0.5] | [274, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/slzm/slzm_slzmtitlek.png` 2ee8ea1d-c220-45a9-ae91-d7c139ceb7fc |
| `/AncientLayer/node_top/CCNode_2/lbl_prop_type` | UILabelTTF | [0, -72] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「远古战场」32 STZhongsong.ttf rgb[254, 255, 255] |
| `/AncientLayer/scroll_view` | UIScrollViewBackpack | [320.0, 109.265] | [0.5, 0] | [640.0, 614.4] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## DreamFirstLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamFirstLayer` | DreamFirstLayer | [0, 0] | [0, 0] | [620, 330] | [1, 1] | 0 | 是 |  |
| `/DreamFirstLayer/show` | CCNode | [0, 0] | [0, 0] | [620, 330] | [1, 1] | 0 | 是 |  |
| `/DreamFirstLayer/show/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [620, 330] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/DreamFirstLayer/show/node_title` | CCNode | [311.0, 323.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamFirstLayer/show/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/DreamFirstLayer/show/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖 励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DreamFirstLayer/show/item_bg` | CCScale9Sprite | [317.0, 111.925] | [0.5, 0] | [520, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DreamFirstLayer/show/lab1` | UILabelTTF | [313, 70] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未满足条件」48 STZhongsong.ttf rgb[136, 94, 42] |
| `/DreamFirstLayer/show/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamFirstLayer/show/CCMenu_1/btn_close` | UIMenuItemImage | [565, 295] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DreamFirstLayer/show/CCMenu_1/btn_get` | UIMenuItemLabel | [314, 68] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「领取」48 [109, 64, 18, 255] |

## DreamFriendCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamFriendCell` | DreamFriendCell | [0, 0] | [0, 0] | [566, 152] | [1, 1] | 0 | 是 |  |
| `/DreamFriendCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [566, 152] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamFriendCell/CCSprite_1` | CCSprite | [188, 76] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/DreamFriendCell/lbl_friend_name` | UILabelTTF | [179, 44] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/DreamFriendCell/hero_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamFriendCell/hero_menu/btn_enter` | UIMenuItemLabel | [472, 72] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」24 [255, 255, 255, 255] |
| `/DreamFriendCell/lbl_fight` | UILabelTTF | [202, 78] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/DreamFriendCell/lbl_hero_name` | UILabelTTF | [179, 111] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「[我是渣渣辉]」22 STZhongsong.ttf rgb[213, 112, 31] |
| `/DreamFriendCell/lbl_select` | UILabelTTF | [472, 72] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已选择」22 STZhongsong.ttf rgb[15, 159, 0] |
| `/DreamFriendCell/show_flight` | CCSprite | [472, 72] | [0.5, 0.5] | [112, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dream-lang/dream-lang_spr-zlgg.png` ead4512c-f4a8-4657-8e73-561d8250df00 |

## DreamFriendLayer（44）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamFriendLayer` | DreamFriendLayer | [0, 0] | [0, 0] | [642, 980] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [642, 980] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DreamFriendLayer/node_title` | CCNode | [322.0, 980.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DreamFriendLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「好友助战」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DreamFriendLayer/my_hero_bg` | CCScale9Sprite | [37, 81] | [0.5, 0.5] | [570, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/DreamFriendLayer/CCSprite_1` | CCSprite | [58, 162] | [0.5, 0.5] | [42, 42] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/DreamFriendLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/menu/btn_close` | UIMenuItemImage | [578, 943] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DreamFriendLayer/menu/btn_friend` | UIMenuItemTab | [114, 828] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/DreamFriendLayer/menu/btn_reward` | UIMenuItemTab | [258, 828] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/DreamFriendLayer/friend_hero` | CCNode | [40, 71] | [0, 0] | [570, 750] | [1, 1] | 0 | **否** |  |
| `/DreamFriendLayer/friend_hero/now_friend_select` | CCNode | [-1, 11] | [0, 0] | [566, 500] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/friend_hero/UILabelTTF_1` | UILabelTTF | [9, 535] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可选已选：」24 STZhongsong.ttf rgb[253, 229, 190] |
| `/DreamFriendLayer/friend_hero/friend_select_list` | CCNode | [-2, 553] | [0, 0] | [566, 152] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/friend_hero/friend_select_list/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [566, 152] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamFriendLayer/friend_hero/friend_select_list/CCSprite_1` | CCSprite | [188, 76] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/DreamFriendLayer/friend_hero/friend_select_list/friend_lbl_friend_name` | UILabelTTF | [179, 44] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/DreamFriendLayer/friend_hero/friend_select_list/friend_hero_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/friend_hero/friend_select_list/friend_hero_menu/my_btn_ente` | UIMenuItemLabel | [472, 72] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」24 [255, 255, 255, 255] |
| `/DreamFriendLayer/friend_hero/friend_select_list/friend_lbl_fight` | UILabelTTF | [202, 78] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/DreamFriendLayer/friend_hero/friend_select_list/friend_hero_name` | UILabelTTF | [179, 111] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「[我是渣渣辉]」22 STZhongsong.ttf rgb[213, 112, 31] |
| `/DreamFriendLayer/friend_hero/friend_select_list/friend_select_str` | UILabelTTF | [475, 77] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已选择」22 STZhongsong.ttf rgb[15, 159, 0] |
| `/DreamFriendLayer/friend_hero/no_select_friend_hero` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/DreamFriendLayer/friend_hero/no_select_friend_hero/CCScale9Sprite_1` | CCScale9Sprite | [2, 552] | [0.5, 0.5] | [560, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dream/dream_spr-bg-1.png` 5c629990-6e6e-44fc-bee5-514fa7d48b79 insets[10, 10, 10, 10] |
| `/DreamFriendLayer/friend_hero/no_select_friend_hero/my_lbl_friend_name` | UILabelTTF | [279, 627] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前未选择英雄」22 STZhongsong.ttf rgb[208, 186, 156] |
| `/DreamFriendLayer/friend_hero/UILabelTTF_2` | UILabelTTF | [9, 725] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前已选：」24 STZhongsong.ttf rgb[253, 229, 190] |
| `/DreamFriendLayer/my_hero` | CCNode | [40, 71] | [0, 0] | [570, 750] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/my_hero/UILabelTTF_1` | UILabelTTF | [9, 725] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前已选：」24 STZhongsong.ttf rgb[253, 229, 190] |
| `/DreamFriendLayer/my_hero/no_select_my_hero` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/my_hero/no_select_my_hero/CCScale9Sprite_1` | CCScale9Sprite | [2, 552] | [0.5, 0.5] | [560, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dream/dream_spr-bg-1.png` 5c629990-6e6e-44fc-bee5-514fa7d48b79 insets[10, 10, 10, 10] |
| `/DreamFriendLayer/my_hero/no_select_my_hero/my_lbl_friend_name` | UILabelTTF | [279, 627] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前未选择英雄」22 STZhongsong.ttf rgb[208, 186, 156] |
| `/DreamFriendLayer/my_hero/select_list` | CCNode | [-2, 553] | [0, 0] | [566, 152] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/my_hero/select_list/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [566, 152] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamFriendLayer/my_hero/select_list/CCSprite_1` | CCSprite | [188, 76] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/DreamFriendLayer/my_hero/select_list/my_lbl_friend_name` | UILabelTTF | [179, 44] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/DreamFriendLayer/my_hero/select_list/my_hero_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/my_hero/select_list/my_hero_menu/my_btn_ente` | UIMenuItemLabel | [472, 72] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」24 [255, 255, 255, 255] |
| `/DreamFriendLayer/my_hero/select_list/my_lbl_fight` | UILabelTTF | [202, 78] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/DreamFriendLayer/my_hero/select_list/lbl_hero_name` | UILabelTTF | [179, 111] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「[我是渣渣辉]」22 STZhongsong.ttf rgb[213, 112, 31] |
| `/DreamFriendLayer/my_hero/select_list/my_select_str` | UILabelTTF | [475, 77] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已选择」22 STZhongsong.ttf rgb[15, 159, 0] |
| `/DreamFriendLayer/my_hero/UILabelTTF_2` | UILabelTTF | [9, 535] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可选已选：」24 STZhongsong.ttf rgb[253, 229, 190] |
| `/DreamFriendLayer/my_hero/now_select` | CCNode | [-1, 11] | [0, 0] | [566, 500] | [1, 1] | 0 | 是 |  |
| `/DreamFriendLayer/message_tip` | UILabelTTF | [324, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「好友助战好友助战好友助战好友助战好友助战好友助战好友助战」20 STZhongsong.ttf rgb[159, 108, 74] |

## DreamLayer（43）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamLayer` | DreamLayer | [0, 0] | [0, 0] | [640, 1000] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message` | CCNode | [0, 0] | [0, 0] | [640.0, 1000.0] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/spr_bg` | CCScale9Sprite | [0.0, -61.0] | [0.5, 0.5] | [640, 1000] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DreamLayer/message/node_title` | CCNode | [320.0, 930.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DreamLayer/message/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「永恒梦境」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DreamLayer/message/layer_bg` | CCSprite | [321.0, 496.0] | [0.5, 0.5] | [570, 688] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dream-lang/dream-lang_spr-4.png` 6b3e5d21-a589-4c95-b1da-b1c080a70ebc |
| `/DreamLayer/message/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/CCMenu_1/btn_battle` | UIMenuItemLabel | [466, 58] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「开始挑战」45 [255, 255, 255, 255] |
| `/DreamLayer/message/CCMenu_1/btn_show_rank` | UIMenuItemLabel | [198, 331] | [0.5, 0.5] | [122, 36] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dream-lang/dream-lang_spr-1.png` 99d246cc-6257-4b42-93d5-5c30d1ea9b41 · Label「」24 [255, 255, 255, 255] |
| `/DreamLayer/message/CCMenu_1/btn_reward_msg` | UIMenuItemLabel | [532, 777] | [0.5, 0.5] | [78, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dream-lang/dream-lang_spr-3.png` b24602c4-cb39-4784-ae27-56c42b3eddcd · Label「」24 [255, 255, 255, 255] |
| `/DreamLayer/message/CCMenu_1/btn_get` | UIMenuItemLabel | [531, 226] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「领取」48 [109, 64, 18, 255] |
| `/DreamLayer/message/CCMenu_1/btn_close` | UIMenuItemImage | [554, 1000] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/DreamLayer/message/CCMenu_1/btn_select_friend` | UIMenuItemLabel | [157, 59] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c pressed `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「好友助阵」45 [255, 255, 255, 255] |
| `/DreamLayer/message/CCMenu_1/btn_info` | UIMenuItemImage | [549, 694] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/DreamLayer/message/start_lab` | UILabelTTF | [468.0, 108.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「lalalal」22 STZhongsong.ttf rgb[117, 76, 32] |
| `/DreamLayer/message/now_lab` | UILabelTTF | [471.0, 11.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「永恒梦境」22 STZhongsong.ttf rgb[117, 76, 32] |
| `/DreamLayer/message/UILabelTTF_1` | UILabelTTF | [190.0, 484.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「闯关排行榜」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/message/UILabelTTF_2` | UILabelTTF | [483.0, 481.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排行奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/message/play_reward` | CCNode | [183.0, 781.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/lank_reward` | CCNode | [390.0, 401.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/pro_reward` | CCNode | [177.0, 222.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/lank_num` | UILabelTTF | [116.0, 224.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」20 STZhongsong.ttf rgb[136, 94, 42] |
| `/DreamLayer/message/reward_lab` | UILabelTTF | [173.0, 275.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排行奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/message/my_lank` | UILabelTTF | [485.0, 332.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排行奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/message/rank_scroll_view` | CCNode | [48.0, 342.0] | [0, 0] | [300, 120] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/message/shuiming` | UILabelTTF | [158.0, 14.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选择一位好友英雄助阵」20 STZhongsong.ttf rgb[117, 76, 32] |
| `/DreamLayer/message/lab_no_reward` | UILabelTTF | [485.0, 401.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂无奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/message/lab_need` | UILabelTTF | [566.0, 226.0] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「达到%s」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/message/lab_no_rank` | UILabelTTF | [190.0, 401.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂无排名」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamLayer/show_rewards` | CCNode | [0, 872] | [1, 1] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/show_rewards/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [322, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dream/dream_spr-bg-2.png` faecbb2c-b444-4912-8695-d0a4eb815864 insets[15, 15, 15, 15] |
| `/DreamLayer/show_rewards/UILabelTTF_1` | UILabelTTF | [73, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「已累计奖励:」18 STZhongsong.ttf rgb[255, 231, 195] |
| `/DreamLayer/show_rewards/now_level` | UILabelTTF | [52, 103] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99关」18 STZhongsong.ttf rgb[255, 231, 195] |
| `/DreamLayer/show_rewards/now_buff` | UILabelTTF | [109, 102] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99关2133423432423」18 STZhongsong.ttf rgb[255, 231, 195] |
| `/DreamLayer/show_rewards/img_2` | CCSprite | [153, 25] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900101.png` bc998bee-4638-4a64-a7f0-1249cd4b4d19 |
| `/DreamLayer/show_rewards/img_1` | CCSprite | [152, 59] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/DreamLayer/show_rewards/lab_2` | UILabelTTF | [172, 26] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99关」18 STZhongsong.ttf rgb[255, 231, 195] |
| `/DreamLayer/show_rewards/lab_1` | UILabelTTF | [172, 60] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99关」18 STZhongsong.ttf rgb[255, 231, 195] |
| `/DreamLayer/show_rewards/first_btn` | CCMenu | [0, 120] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/show_rewards/back_menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamLayer/show_rewards/back_menu/btn_exit` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [80, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/dream-lang/dream-lang_spr-tuichu.png` 11c4279a-2ee1-4756-9486-e56e0b0afb73 |
| `/DreamLayer/show_rewards/show_reward_msg` | UILabelTTF | [140, 70] | [0, 1] | auto | [1, 1] | 0 | 是 | cc.Label「99关00000」18 STZhongsong.ttf rgb[255, 231, 195] |

## DreamMainRankCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamMainRankCell` | DreamMainRankCell | [0, 0] | [0, 0] | [300, 30] | [1, 1] | 0 | 是 |  |
| `/DreamMainRankCell/lbl_level` | UILabelTTF | [294, 14] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「多少关」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamMainRankCell/lbl_name` | UILabelTTF | [144, 14] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「名字」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamMainRankCell/image` | CCSprite | [37, 15] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-1.png` 1265e592-b04d-43b8-a16b-7c4d19d2f55b |

## DreamRankCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamRankCell` | DreamRankCell | [0, 0] | [0, 0] | [540, 106] | [1, 1] | 0 | 是 |  |
| `/DreamRankCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamRankCell/firend_menu` | UIMenu | [19, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamRankCell/firend_menu/spr_photo_btn` | CCMenuItemImage | [105, 57] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/DreamRankCell/spr_rank` | CCSprite | [45, 105] | [0.5, 1] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/DreamRankCell/lbl_rank` | UILabelTTF | [50, 50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1000」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamRankCell/CCSprite_1` | CCSprite | [196, 39] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/DreamRankCell/lbl_name` | UILabelTTF | [185, 71] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[119, 70, 42] |
| `/DreamRankCell/spr_photo` | CCSprite | [125, 57] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/DreamRankCell/spr_frame` | CCSprite | [126, 56] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/DreamRankCell/lbl_max` | UILabelTTF | [507, 55] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamRankCell/lbl_fight` | UILabelTTF | [209, 39] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」20 STZhongsong.ttf rgb[119, 70, 42] |

## DreamRankLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamRankLayer` | DreamRankLayer | [0, 0] | [0, 0] | [600, 830] | [1, 1] | 0 | 是 |  |
| `/DreamRankLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 850] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DreamRankLayer/node_title` | CCNode | [300.0, 830.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamRankLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DreamRankLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DreamRankLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamRankLayer/CCMenu_1/btn_close` | UIMenuItemImage | [548, 807] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DreamRankLayer/CCMenu_1/btn_right` | UIMenuItemTab | [292, 702] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-7.png` 8a3c8429-0946-4341-8fe0-bc3c6237a448 pressed `ui/common/button_btn-tab-8.png` aac0291d-cbbf-48cb-9486-944e18e9e5cd · Label「奖励一览」40 [255, 255, 255, 255] |
| `/DreamRankLayer/CCMenu_1/btn_left` | UIMenuItemTab | [307, 702] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「排行榜」40 [255, 255, 255, 255] |
| `/DreamRankLayer/rank` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamRankLayer/rank/rank_scroll_bg` | CCScale9Sprite | [25, 150] | [0.5, 0.5] | [550, 520] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DreamRankLayer/rank/spr_self_bg` | CCScale9Sprite | [25, 25] | [0.5, 0.5] | [550, 116] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DreamRankLayer/rank/CCNode_1` | CCNode | [25, 24] | [0, 0] | [550, 116] | [1, 1] | 0 | 是 |  |
| `/DreamRankLayer/rank/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [6, 6] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamRankLayer/rank/CCNode_1/spr_photo` | CCSprite | [132, 61] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/DreamRankLayer/rank/CCNode_1/spr_frame` | CCSprite | [132, 61] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/DreamRankLayer/rank/CCNode_1/firend_menu` | UIMenu | [28, 2] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamRankLayer/rank/CCNode_1/firend_menu/spr_photo1` | CCMenuItemImage | [104, 57] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/DreamRankLayer/rank/CCNode_1/lbl_rank` | UILabelTTF | [29, 58] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未上榜」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamRankLayer/rank/CCNode_1/lbl_name` | UILabelTTF | [187, 73] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[119, 70, 42] |
| `/DreamRankLayer/rank/CCNode_1/lbl_fight` | UILabelTTF | [212, 41] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」20 STZhongsong.ttf rgb[119, 70, 42] |
| `/DreamRankLayer/rank/CCNode_1/CCSprite_1` | CCSprite | [197, 39] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/DreamRankLayer/rank/CCNode_1/lbl_max` | UILabelTTF | [521, 57] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamRankLayer/reward` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/DreamRankLayer/reward/reward_scroll_bg` | CCScale9Sprite | [27, 47] | [0.5, 0.5] | [550, 621] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DreamRankLayer/reward/spr_rank_title_bg` | CCScale9Sprite | [31, 620] | [0.5, 0.5] | [540, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg.png` 27fd7cc6-1893-4173-9be3-0f5dfd7eccf0 insets[12, 12, 12, 12] |
| `/DreamRankLayer/reward/lbl_title_2` | CCLabelTTF | [363, 640] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励」48 STZhongsong.ttf rgb[113, 75, 39] |
| `/DreamRankLayer/reward/lbl_title_1` | CCLabelTTF | [100, 643] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名」48 STZhongsong.ttf rgb[113, 75, 39] |
| `/DreamRankLayer/reward/spr_line_1` | CCSprite | [170, 640] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |

## DreamRewardCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamRewardCell` | DreamRewardCell | [0, 0] | [0, 0] | [540, 106] | [1, 1] | 0 | 是 |  |
| `/DreamRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamRewardCell/spr_rank` | CCSprite | [52, 105] | [0.5, 1] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/DreamRewardCell/lbl_rank` | UILabelTTF | [20, 60] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「201-999」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamRewardCell/lbl_my_rank_tip` | UILabelTTF | [35, 38] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[213, 112, 31] |
| `/DreamRewardCell/lbl_my_rank` | UILabelTTF | [35, 73] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」40 STZhongsong.ttf rgb[254, 255, 255] |

## DreamRewardLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamRewardLayer` | DreamRewardLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/DreamRewardLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DreamRewardLayer/node_title` | CCNode | [300.0, 732.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DreamRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励一览」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DreamRewardLayer/spr_scroll_bg` | CCScale9Sprite | [25, 40] | [0.5, 0.5] | [550, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DreamRewardLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamRewardLayer/CCMenu_1/btn_close` | UIMenuItemImage | [543, 702] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## DreamSelectCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamSelectCell` | DreamSelectCell | [0, 0] | [0, 0] | [540, 120] | [1, 1] | 0 | 是 |  |
| `/DreamSelectCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/DreamSelectCell/show_msg` | UILabelTTF | [135, 60] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[138, 88, 55] |
| `/DreamSelectCell/icno` | CCNode | [69, 58] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamSelectCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamSelectCell/CCMenu_1/btn_open` | UIMenuItemLabel | [462, 60] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「」24 [255, 255, 255, 255] |
| `/DreamSelectCell/buff_image` | CCSprite | [80, 58] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |

## DreamSelectLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamSelectLayer` | DreamSelectLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/DreamSelectLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DreamSelectLayer/node_title` | CCNode | [300.0, 732.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DreamSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DreamSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「增益选择」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DreamSelectLayer/buff_list` | CCScale9Sprite | [25, 40] | [0.5, 0.5] | [550, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DreamSelectLayer/hero_list` | CCScale9Sprite | [25, 466] | [0.5, 0.5] | [550, 175] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dream/dream_spr-2.png` eb36e5f9-74d0-4dc5-859b-dbba6962fac0 insets[10, 10, 10, 10] |
| `/DreamSelectLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamSelectLayer/lbl_1` | UILabelTTF | [39, 613] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「我的阵型」20 STZhongsong.ttf rgb[253, 251, 230] |
| `/DreamSelectLayer/lbl_2` | UILabelTTF | [559, 613] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「我的阵型45756765867」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/DreamSelectLayer/CCNode_1` | CCNode | [51, 519] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## DreamShowRewardCell（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DreamShowRewardCell` | DreamShowRewardCell | [0, 0] | [0, 0] | [540, 150] | [1, 1] | 0 | 是 |  |
| `/DreamShowRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/dream/dream_spr_item_bg.png` c81e0d62-b79a-458c-9c49-ff24fe2fb0a0 insets[100, 40, 100, 100] |
| `/DreamShowRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DreamShowRewardCell/lbl_my_rank_tip` | UILabelTTF | [17, 126] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[253, 251, 230] |

## GRConditionCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRConditionCell` | GRConditionCell | [0, 0] | [0, 0] | [380, 126] | [1, 1] | 0 | 是 |  |
| `/GRConditionCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [380, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-40.png` 813525d5-6fb6-4ea5-b61d-1df80666268a insets[13, 13, 13, 13] |
| `/GRConditionCell/spr_star1` | CCSprite | [38.334, 99.306] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRConditionCell/spr_star2` | CCSprite | [38.334, 64.306] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRConditionCell/spr_star3` | CCSprite | [38.334, 29.306] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRConditionCell/lbl_condition1` | UILabelTTF | [69.217, 99.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRConditionCell/lbl_condition2` | UILabelTTF | [69.217, 64.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRConditionCell/lbl_condition3` | UILabelTTF | [69.217, 29.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[254, 255, 255] |

## GRConditionLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRConditionLayer` | GRConditionCell | [0, 0] | [0, 0] | [380, 126] | [1, 1] | 0 | 是 |  |
| `/GRConditionLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [380, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-40.png` 813525d5-6fb6-4ea5-b61d-1df80666268a insets[13, 13, 13, 13] |
| `/GRConditionLayer/spr_star1` | CCSprite | [38.334, 99.306] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRConditionLayer/spr_star2` | CCSprite | [38.334, 64.306] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRConditionLayer/spr_star3` | CCSprite | [38.334, 29.306] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRConditionLayer/lbl_condition1` | UILabelTTF | [69.217, 99.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GRConditionLayer/lbl_condition2` | UILabelTTF | [69.217, 64.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/GRConditionLayer/lbl_condition3` | UILabelTTF | [69.217, 29.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## GREndCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GREndCell` | GRConditionCell | [0, 0] | [0, 0] | [640, 370] | [1, 1] | 0 | 是 |  |
| `/GREndCell/CCScale9Sprite_1` | CCScale9Sprite | [321, 351] | [0.5, 0.5] | [640, 40] | [0.8, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/GREndCell/CCScale9Sprite_2` | CCScale9Sprite | [321, 298] | [0.5, 0.5] | [640, 40] | [0.8, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/GREndCell/CCScale9Sprite_3` | CCScale9Sprite | [321, 246] | [0.5, 0.5] | [640, 40] | [0.8, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/GREndCell/spr_star1` | CCSprite | [487.334, 351.3] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GREndCell/spr_star2` | CCSprite | [487.334, 298] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GREndCell/spr_star3` | CCSprite | [487.334, 246] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GREndCell/lbl_condition1` | UILabelTTF | [165.217, 350.306] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GREndCell/lbl_condition2` | UILabelTTF | [164.217, 298] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GREndCell/lbl_condition3` | UILabelTTF | [164.217, 246] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GREndCell/lbl_condition1` | UILabelTTF | [320, 167.306] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得物品」25 STZhongsong.ttf rgb[255, 230, 132] |

## GRMissionCastleCell（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionCastleCell` | GRMissionCastleCell | [0, 0] | [0, 0] | [104, 165] | [1, 1] | 0 | 是 |  |
| `/GRMissionCastleCell/node_act` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionCastleCell/node_act/spr_relic` | CCSprite | [54, 44] | [0.5, 0.15] | [82, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-relic-1.png` 95cd376a-9cce-4c34-b7e3-e3d72d575970 |
| `/GRMissionCastleCell/node_act/node_star` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionCastleCell/node_act/node_star/spr_star1` | CCSprite | [15, 118] | [0.5, 0.5] | [38, 38] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_star-0.png` ec98ecb3-9e40-4d17-bd7d-b5c42a67e731 |
| `/GRMissionCastleCell/node_act/node_star/spr_star2` | CCSprite | [52, 133] | [0.5, 0.5] | [38, 38] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_star-0.png` ec98ecb3-9e40-4d17-bd7d-b5c42a67e731 |
| `/GRMissionCastleCell/node_act/node_star/spr_star3` | CCSprite | [89, 118] | [0.5, 0.5] | [38, 38] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_star-0.png` ec98ecb3-9e40-4d17-bd7d-b5c42a67e731 |
| `/GRMissionCastleCell/spr_chapter_bg` | CCScale9Sprite | [51, 17] | [0.5, 0.5] | [104, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-40.png` 813525d5-6fb6-4ea5-b61d-1df80666268a insets[10, 10, 10, 10] |
| `/GRMissionCastleCell/lbl_chapter` | UILabelTTF | [50, 16] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「10-0」20 STZhongsong.ttf rgb[232, 212, 173] |
| `/GRMissionCastleCell/spr_main` | CCSprite | [51, 17] | [0.5, 0.5] | [82, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic-lang_spr-main-1.png` 202aa33e-3aa7-4176-b13a-f0e848d23f20 |

## GRMissionGiftLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionGiftLayer` | GRMissionGiftLayer | [0, 0] | [0, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/GRMissionGiftLayer/menu_btn` | UIMenu | [320, 100] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionGiftLayer/menu_btn/btn_left` | UIMenuItemImage | [-120, 0] | [1, 0.5] | [67, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic_btn-left-1.png` f971d084-8e94-4674-b58c-05ece3342348 |
| `/GRMissionGiftLayer/menu_btn/btn_right` | UIMenuItemImage | [120, 0] | [0, 0.5] | [67, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic_btn-right-1.png` 968b2df5-6771-4389-b03d-e7a05b52daff |
| `/GRMissionGiftLayer/node_spot` | CCNode | [320, 100] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## GRMissionGiftPageLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionGiftPageLayer` | GRMissionGiftPageLayer | [0, 0] | [0, 0] | [640, 600] | [1, 1] | 0 | 是 |  |
| `/GRMissionGiftPageLayer/spr_bg` | CCSprite | [320, -100] | [0.5, 0] | [668, 826] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion-bg-god-relic-gift.png` 890a05cc-96de-4323-b9c0-ca353625735f |
| `/GRMissionGiftPageLayer/spr_tip_bg` | CCSprite | [320, 540] | [0.5, 0.5] | [470, 77] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-tip-bg.png` f22f84c5-ad0b-4139-8567-d1a1a29c6634 |
| `/GRMissionGiftPageLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionGiftPageLayer/menu/btn_buy` | UIMenuItemLabel | [440, 190] | [0.5, 0.5] | [202, 100] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-yellow-3.png` 594e3215-b639-43cf-8651-2d429e5a4ce5 · Label「30元」56 [112, 71, 0, 255] |
| `/GRMissionGiftPageLayer/menu/btn_close` | UIMenuItemImage | [600, 515] | [0.5, 0.5] | [63, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic_btn-close-1.png` 8946bc81-bb69-476a-8b37-b783a5c986f1 |
| `/GRMissionGiftPageLayer/menu_reward` | UIMenu | [440, 270] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionGiftPageLayer/lbl_tip` | UILabelTTF | [320, 540] | [0.5, 0.5] | [840, 120] | [0.5, 0.5] | 0 | 是 | cc.Label「恭喜您获得了5星强力英雄，我们为您准备了超值礼包，帮助您战力提升」36 STZhongsong.ttf rgb[251, 243, 184] |
| `/GRMissionGiftPageLayer/lbl_limit` | UILabelTTF | [440, 245] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「限购: 1/2」36 STZhongsong.ttf rgb[147, 58, 201] |
| `/GRMissionGiftPageLayer/lbl_cd_tip` | UILabelTTF | [620, 380] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「后礼包消失」40 STZhongsong.ttf rgb[147, 58, 201] |
| `/GRMissionGiftPageLayer/lbl_cd` | UILabelTTF | [515, 380] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「后礼包消失」44 STZhongsong.ttf rgb[123, 250, 128] |
| `/GRMissionGiftPageLayer/node_discount` | CCNode | [450, 440] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionGiftPageLayer/node_discount/lbl_discount_title` | CCSprite | [-20, 0] | [1, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** god-relic/lbl-value.png |

## GRMissionLayer（74）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionLayer` | GRMissionLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-god-relic-2.jpg` 7bab3adb-9a72-4ca7-b043-b1d437ff86a3 |
| `/GRMissionLayer/CCNode_1` | CCNode | [0.0, 142.95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_1/spr_info_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [642, 284] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/god-relic_spr-bg-3.png` 7efe657d-85a2-4a43-b945-ac978e906f67 insets[0, 0, 330, 150] |
| `/GRMissionLayer/CCNode_1/CCSprite_1` | CCSprite | [275.0, 243.333] | [0.5, 0.5] | [131, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-bg-4.png` cf5ea082-6d52-42ef-b469-f64cd47042db |
| `/GRMissionLayer/CCNode_1/lbl_level` | UILabelTTF | [275, 241.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」24 STZhongsong.ttf rgb[157, 75, 50] |
| `/GRMissionLayer/CCNode_1/lbl_condition1` | UILabelTTF | [231.667, 197.963] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/GRMissionLayer/CCNode_1/lbl_condition2` | UILabelTTF | [231.667, 163.584] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/GRMissionLayer/CCNode_1/lbl_condition3` | UILabelTTF | [231.667, 129.336] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「战斗胜利」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/GRMissionLayer/CCNode_1/spr_info_line1` | CCScale9Sprite | [232, 181.617] | [0, 0.5] | [390, 3] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/god-relic_spr-under-1.png` 0fa2c849-a344-4bfa-892d-bb0ab885c177 insets[1, 1, 3, 3] |
| `/GRMissionLayer/CCNode_1/spr_info_line2` | CCScale9Sprite | [231.964, 147.473] | [0, 0.5] | [390, 3] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/god-relic_spr-under-1.png` 0fa2c849-a344-4bfa-892d-bb0ab885c177 insets[1, 1, 3, 3] |
| `/GRMissionLayer/CCNode_1/spr_info_line3` | CCScale9Sprite | [231.964, 113.33] | [0, 0.5] | [390, 3] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/god-relic_spr-under-1.png` 0fa2c849-a344-4bfa-892d-bb0ab885c177 insets[1, 1, 3, 3] |
| `/GRMissionLayer/CCNode_1/CCSprite_2` | CCSprite | [201.914, 61.246] | [0.5, 0.5] | [32, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic-lang_spr-reward-1.png` bd6e1f6d-c519-4ecc-97a2-b5cf6e052de9 |
| `/GRMissionLayer/CCNode_1/scroll_view` | UIScrollViewBackpack | [221.0, 21.0] | [0, 0] | [270, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/GRMissionLayer/CCNode_2` | CCNode | [640.0, 142.95] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_2/lbl_chapter` | UILabelTTF | [-163.333, 245.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「推荐战力：」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/GRMissionLayer/CCNode_2/lbl_fight` | UILabelTTF | [-117.5, 245.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「10000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/GRMissionLayer/CCNode_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_2/CCMenu_1/btn_battle` | UIMenuItemLabel | [-80.0, 56.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「挑战」44 [255, 255, 255, 255] |
| `/GRMissionLayer/CCNode_2/spr_star1` | CCSprite | [-51.0, 198.63] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRMissionLayer/CCNode_2/spr_star2` | CCSprite | [-51.0, 163.315] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRMissionLayer/CCNode_2/spr_star3` | CCSprite | [-51.0, 128.0] | [0.5, 0.5] | [36, 36] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_xxwx.png` 2a769a53-16fa-429b-81b4-9aa3682ddc03 |
| `/GRMissionLayer/CCNode_3` | CCNode | [640.0, 143.25] | [0, 0] | [0.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_3/UILabelTTF_1` | UILabelTTF | [-238.0, -16.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「挑战次数：」20 STZhongsong.ttf rgb[253, 229, 190] |
| `/GRMissionLayer/CCNode_3/UILabelTTF_2` | UILabelTTF | [-238.0, -56.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「剩余购买次数：」20 STZhongsong.ttf rgb[253, 229, 190] |
| `/GRMissionLayer/CCNode_3/lbl_buy_count` | UILabelTTF | [-104.0, -56.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2」20 STZhongsong.ttf rgb[0, 249, 1] |
| `/GRMissionLayer/CCNode_3/CCScale9Sprite_1` | CCScale9Sprite | [-143.0, -32.0] | [0.5, 0.5] | [120, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-41.png` 4231f6d4-4d92-4525-99a4-78a8c7019934 insets[5, 5, 5, 5] |
| `/GRMissionLayer/CCNode_3/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_3/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-32, -18] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/GRMissionLayer/CCNode_3/lbl_challenge_count` | UILabelTTF | [-84.0, -19.32] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/2」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionLayer/node_top1` | CCNode | [0.0, 795.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_top1/lbl_star_count` | UILabelTTF | [29, -37] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/30」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionLayer/node_top1/CCSprite_1` | CCSprite | [31.0, 0] | [0.5, 0.5] | [38, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_star-0.png` ec98ecb3-9e40-4d17-bd7d-b5c42a67e731 |
| `/GRMissionLayer/node_top1/spr_prog_bg` | CCSprite | [196, 0] | [0.5, 0.5] | [266, 20] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_prog-1.png` f89b07a6-27b6-43c0-a01a-ee11dbba552c |
| `/GRMissionLayer/node_top1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_top1/CCMenu_1/btn_star10` | UIMenuItemImage | [160, 0] | [0.5, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-box-1.png` 34651ffb-9879-4a5c-9ddb-7be8a8c3ffa4 |
| `/GRMissionLayer/node_top1/CCMenu_1/btn_star20` | UIMenuItemImage | [250, 0] | [0.5, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-box-2.png` a6f03018-c70b-4bf0-94b1-814b0f0940d0 |
| `/GRMissionLayer/node_top1/CCMenu_1/btn_star30` | UIMenuItemImage | [340, 0] | [0.5, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/other_spr-box-4.png` 8ba39f1b-7eb3-4888-a5fc-21210eda9c24 |
| `/GRMissionLayer/node_top1/UILabelTTF_1` | UILabelTTF | [160, -37] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「10」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionLayer/node_top1/UILabelTTF_2` | UILabelTTF | [250, -37] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「20」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionLayer/node_top1/UILabelTTF_3` | UILabelTTF | [340, -37] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「30」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionLayer/node_top2` | CCNode | [640.0, 796.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_top2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_top2/CCMenu_1/btn_info` | UIMenuItemImage | [-56.223, -5.137] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/GRMissionLayer/node_top2/CCMenu_1/btn_back` | UIMenuItemImage | [-86.223, 64.863] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/GRMissionLayer/CCNode_4` | CCNode | [320.0, 849.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [333, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-bg-1.png` 5a93c6f4-8e31-4b5e-9f12-af776665e0e3 |
| `/GRMissionLayer/CCNode_4/lbl_chapter` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/GRMissionLayer/CCNode_4/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_4/CCMenu_1/btn_left` | UIMenuItemImage | [-147, 1] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic_btn-arrow-1.png` 11d60106-73dd-4358-8dd4-56142da0a58b |
| `/GRMissionLayer/CCNode_4/CCMenu_2` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [-1, 1] | 0 | 是 |  |
| `/GRMissionLayer/CCNode_4/CCMenu_2/btn_right` | UIMenuItemImage | [-147, 1] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic_btn-arrow-1.png` 11d60106-73dd-4358-8dd4-56142da0a58b |
| `/GRMissionLayer/node_line` | CCNode | [320.0, 351.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line1` | CCNode | [-209.6, 91.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line2` | CCNode | [-36.2, 59.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line2/line1` | CCSprite | [8, 10.0] | [1, 0.5] | [161, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-1.png` ad761495-3685-4f82-b06b-b4aaa3113996 |
| `/GRMissionLayer/node_line/node_line3` | CCNode | [142.6, 104.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line3/line2` | CCSprite | [0, -20.4] | [1, 0.5] | [170, 51] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-2.png` 4d57ce22-687d-4142-bdbd-4bb373897e08 |
| `/GRMissionLayer/node_line/node_line4` | CCNode | [244.2, 246.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line4/line3` | CCSprite | [3.8, -72.0] | [1, 0.5] | [121, 133] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-3.png` 3fad3e39-4ae1-4bf3-93a9-25624b87d2c2 |
| `/GRMissionLayer/node_line/node_line5` | CCNode | [44.8, 244.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line5/line4` | CCSprite | [2.4, 9.6] | [0, 0.5] | [172, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-4.png` 4e34f43f-9a04-486d-bc62-abc16811bb28 |
| `/GRMissionLayer/node_line/node_line6` | CCNode | [-125.2, 225.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line6/line5` | CCSprite | [2.4, 6.0] | [0, 0.5] | [150, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-5.png` 0678da56-f256-4029-8ee3-9b1e111fda27 |
| `/GRMissionLayer/node_line/node_line7` | CCNode | [-246.2, 319.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line7/line6` | CCSprite | [-4.6, -52.2] | [0, 0.5] | [110, 95] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-6.png` 3b1f0483-a648-4110-b983-df7b79ff8002 |
| `/GRMissionLayer/node_line/node_line8` | CCNode | [-113.4, 398.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line8/line7` | CCSprite | [3.4, -40.4] | [1, 0.5] | [126, 87] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-7.png` ffc5e61f-46f1-44cb-b138-ebe660628e40 |
| `/GRMissionLayer/node_line/node_line9` | CCNode | [42.2, 437.6] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line9/line8` | CCSprite | [-3.6, -22.6] | [1, 0.5] | [145, 53] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-8.png` 623835b7-831d-4ace-82ab-8bf319851941 |
| `/GRMissionLayer/node_line/node_line10` | CCNode | [192.2, 449.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_line10/line9` | CCSprite | [-7.2, -3.8] | [1, 0.5] | [135, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-line-9.png` 09b7aaf7-2a76-493c-a91a-ebe9bca9342a |
| `/GRMissionLayer/node_line/node_selected` | CCNode | [-190, 169] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionLayer/node_line/node_selected/spr_selected` | CCSprite | [0, 0] | [0.5, 0.5] | [52, 53] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-selected-1.png` dfc67976-c707-4b17-8b22-11de6adce540 |

## GRMissionListCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionListCell` | GRMissionListCell | [0, 0] | [0, 0] | [600, 165] | [1, 1] | 0 | 是 |  |
| `/GRMissionListCell/spr_bg` | CCSprite | [299, 79] | [0.5, 0.5] | [590, 150] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_cell-1.png` 8d4605f9-7722-4320-8842-a6078a461ac6 |
| `/GRMissionListCell/spr_tip_bg` | CCSprite | [391, 33] | [0.5, 0.5] | [240, 40] | [1.7, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-shadow.png` 03f50dff-cafe-42f5-b828-452d1d7e4090 |
| `/GRMissionListCell/lbl_tip` | UILabelTTF | [400, 32] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「需要%s个星星解锁（当前：40）」24 STZhongsong.ttf rgb[252, 147, 82] |
| `/GRMissionListCell/CCSprite_1` | CCSprite | [82, 132] | [0.5, 0.5] | [160, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-ribbon-6.png` a8c37e9a-c678-4518-8b3e-0e5e5bf39b73 |
| `/GRMissionListCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionListCell/CCMenu_1/btn_reward` | UIMenuItemImage | [579, 135] | [0.5, 0.5] | [58, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic_btn-reward-1.png` 15ae7b26-f491-4373-8df2-a1ccfa385afa |
| `/GRMissionListCell/lbl_chapter` | UILabelTTF | [29.474, 134.5] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「第n章」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionListCell/spr_perfect` | CCSprite | [466, 65] | [0.5, 0.5] | [174, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic-lang_spr-pass-1.png` 4e98826d-3f6a-42ba-a457-6b6024e45dc7 |

## GRMissionListLayer（24）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionListLayer` | GRMissionListLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/spr_bg` | CCSprite | [0.0, 960.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-god-relic-1.png` 85256980-52a6-4a70-84b6-8c1bcdb54a62 |
| `/GRMissionListLayer/CCNode_1` | CCNode | [320.0, 844.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/CCNode_1/top` | CCSprite | [0, 0] | [0.5, 0.5] | [328, 86] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/god-relic_spr-bg-2.png` 0b5b370d-4476-4157-a0f5-3db45ce3d7f8 |
| `/GRMissionListLayer/CCNode_1/lbl_prop_type` | UILabelTTF | [0, -4] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「诸神遗迹」32 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionListLayer/scroll_view` | UIScrollViewBackpack | [320.0, 240.0] | [0.5, 0] | [640.0, 552.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/GRMissionListLayer/CCNode_2` | CCNode | [640.0, 177.0] | [0, 0] | [0.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [-265.0, -30.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「挑战次数：」20 STZhongsong.ttf rgb[253, 229, 190] |
| `/GRMissionListLayer/CCNode_2/UILabelTTF_2` | UILabelTTF | [-265.0, -70.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「剩余购买次数：」20 STZhongsong.ttf rgb[253, 229, 190] |
| `/GRMissionListLayer/CCNode_2/lbl_buy_count` | UILabelTTF | [-131.0, -70.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「2」20 STZhongsong.ttf rgb[0, 249, 1] |
| `/GRMissionListLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [-170.0, -46.0] | [0.5, 0.5] | [120, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-41.png` 4231f6d4-4d92-4525-99a4-78a8c7019934 insets[5, 5, 5, 5] |
| `/GRMissionListLayer/CCNode_2/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/CCNode_2/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-343, 42] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic-lang_btn-image-1.png` 50efa6fc-009f-4f4d-95c9-641b10e0cc2e |
| `/GRMissionListLayer/CCNode_2/CCMenu_1/UIMenuItemImage_2` | UIMenuItemImage | [-73, 42] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic-lang_btn-rank-1.png` f113e800-5075-4668-af5c-0a6dea8332b0 |
| `/GRMissionListLayer/CCNode_2/CCMenu_1/UIMenuItemImage_3` | UIMenuItemImage | [-253, 42] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic-lang_btn-shop-1.png` a2fbd34f-3697-43ab-9cf8-e45ff89ceaf6 |
| `/GRMissionListLayer/CCNode_2/CCMenu_1/btn_summon` | UIMenuItemImage | [-163, 42] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic-lang_btn-summon-1.png` c4556ec2-59a7-4370-b123-bdf3812ea5f2 |
| `/GRMissionListLayer/CCNode_2/CCMenu_1/UIMenuItemImage_4` | UIMenuItemImage | [-58, -31] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/GRMissionListLayer/CCNode_2/lbl_challenge_count` | UILabelTTF | [-115.0, -32.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/2」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/GRMissionListLayer/node_top2` | CCNode | [640.0, 796.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/node_top2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/node_top2/CCMenu_1/btn_back` | UIMenuItemImage | [-86, 60] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/GRMissionListLayer/node_top3` | CCNode | [0.0, 796.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/node_top3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionListLayer/node_top3/CCMenu_1/btn_gift` | UIMenuItemImage | [86, 60] | [0.5, 0.5] | [85, 91] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/god-relic-lang_btn-gift-1.png` affd1f64-3313-4a23-ac4f-ed49c39cbc5d |

## GRMissionStarRewardCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionStarRewardCell` | GRMissionStarRewardCell | [0, 0] | [0, 0] | [560, 155] | [1, 1] | 0 | 是 |  |
| `/GRMissionStarRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [5, 2.5] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[50, 10, 10, 10] |
| `/GRMissionStarRewardCell/lbl_text` | UILabelTTF | [35, 132] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 STZhongsong.ttf rgb[122, 71, 45] |
| `/GRMissionStarRewardCell/scroll_view` | UIScrollViewBackpack | [32, 11] | [0, 0] | [360, 100] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/GRMissionStarRewardCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionStarRewardCell/CCMenu_1/btn_reward` | UIMenuItemLabel | [472, 64] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「领  取」48 [255, 255, 255, 255] |
| `/GRMissionStarRewardCell/CCMenu_1/btn_go` | UIMenuItemLabel | [472, 64] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「前  往」48 [255, 255, 255, 255] |
| `/GRMissionStarRewardCell/spr_geted` | CCSprite | [472, 65] | [0.5, 0.5] | [102, 70] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-geted.png` 50e7ade3-afff-4b57-a9cf-892e23090d89 |

## GRMissionStarRewardLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/GRMissionStarRewardLayer` | GRMissionStarRewardLayer | [0, 0] | [0, 0] | [640, 640] | [1, 1] | 0 | 是 |  |
| `/GRMissionStarRewardLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 650] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/GRMissionStarRewardLayer/spr_title_bg` | CCScale9Sprite | [320, 640.56] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/GRMissionStarRewardLayer/lbl_name` | UILabelTTF | [320, 597.56] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「目标奖励」26 STZhongsong.ttf rgb[255, 231, 195] |
| `/GRMissionStarRewardLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/GRMissionStarRewardLayer/CCMenu_1/btn_close` | UIMenuItemImage | [570, 615] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/GRMissionStarRewardLayer/spr_bg` | CCScale9Sprite | [40, 61] | [0.5, 0.5] | [560, 500] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/GRMissionStarRewardLayer/scroll_view` | UIScrollViewBackpack | [320, 64] | [0.5, 0] | [555, 490] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## RGMissionLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RGMissionLayer` | AncientLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/RGMissionLayer/spr_bg` | CCSprite | [0.0, 960.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-ancient-1.png` 36cd47bd-48df-48e0-a321-02d22dbf8881 |
| `/RGMissionLayer/CCNode_1` | CCNode | [320.0, 826.315] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RGMissionLayer/CCNode_1/top` | CCSprite | [0, 0] | [0.5, 0.5] | [274, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/slzm/slzm_slzmtitlek.png` 2ee8ea1d-c220-45a9-ae91-d7c139ceb7fc |
| `/RGMissionLayer/CCNode_1/lbl_prop_type` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「远古战场」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/RGMissionLayer/scroll_view` | UIScrollViewBackpack | [320.0, 109.265] | [0.5, 0] | [640.0, 614.4] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## RGMissionListLayer（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/RGMissionListLayer` | AncientLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/RGMissionListLayer/spr_bg` | CCSprite | [0.0, 960.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-ancient-1.png` 36cd47bd-48df-48e0-a321-02d22dbf8881 |
| `/RGMissionListLayer/CCNode_1` | CCNode | [320.0, 826.315] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/RGMissionListLayer/CCNode_1/top` | CCSprite | [0, 0] | [0.5, 0.5] | [274, 62] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/slzm/slzm_slzmtitlek.png` 2ee8ea1d-c220-45a9-ae91-d7c139ceb7fc |
| `/RGMissionListLayer/CCNode_1/lbl_prop_type` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「远古战场」32 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/RGMissionListLayer/scroll_view` | UIScrollViewBackpack | [320.0, 109.265] | [0.5, 0] | [640.0, 614.4] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
