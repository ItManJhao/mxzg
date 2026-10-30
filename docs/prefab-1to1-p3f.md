# P3-f 组队竞技 Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| TeamArenaBattleCell | `prefabs/ui/team-arena/TeamArenaBattleCell.prefab` | 41 |
| TeamArenaBattleLayer | `prefabs/ui/team-arena/TeamArenaBattleLayer.prefab` | 10 |
| TeamArenaBattleLogCell | `prefabs/ui/team-arena/TeamArenaBattleLogCell.prefab` | 100 |
| TeamArenaBattleLogLayer | `prefabs/ui/team-arena/TeamArenaBattleLogLayer.prefab` | 10 |
| TeamArenaConditionLayer | `prefabs/ui/team-arena/TeamArenaConditionLayer.prefab` | 17 |
| TeamArenaEndLayer | `prefabs/ui/team-arena/TeamArenaEndLayer.prefab` | 80 |
| TeamArenaLayer | `prefabs/ui/team-arena/TeamArenaLayer.prefab` | 33 |
| TeamArenaLineupCell | `prefabs/ui/team-arena/TeamArenaLineupCell.prefab` | 49 |
| TeamArenaLineupLayer | `prefabs/ui/team-arena/TeamArenaLineupLayer.prefab` | 13 |
| TeamArenaMyTeamAddCell | `prefabs/ui/team-arena/TeamArenaMyTeamAddCell.prefab` | 5 |
| TeamArenaMyTeamCell | `prefabs/ui/team-arena/TeamArenaMyTeamCell.prefab` | 36 |
| TeamArenaMyTeamLayer | `prefabs/ui/team-arena/TeamArenaMyTeamLayer.prefab` | 25 |
| TeamArenaNewTeam | `prefabs/ui/team-arena/TeamArenaNewTeam.prefab` | 10 |
| TeamArenaNewTeamLayer | `prefabs/ui/team-arena/TeamArenaNewTeamLayer.prefab` | 20 |
| TeamArenaRankCell | `prefabs/ui/team-arena/TeamArenaRankCell.prefab` | 42 |
| TeamArenaRecvInviteCell | `prefabs/ui/team-arena/TeamArenaRecvInviteCell.prefab` | 40 |
| TeamArenaRecvInviteLayer | `prefabs/ui/team-arena/TeamArenaRecvInviteLayer.prefab` | 9 |
| TeamArenaRewardCell | `prefabs/ui/team-arena/TeamArenaRewardCell.prefab` | 7 |
| TeamArenaRewardLayer | `prefabs/ui/team-arena/TeamArenaRewardLayer.prefab` | 9 |
| TeamArenaTeamAddInviteCell | `prefabs/ui/team-arena/TeamArenaTeamAddInviteCell.prefab` | 35 |
| TeamArenaTeamAddInviteLayer | `prefabs/ui/team-arena/TeamArenaTeamAddInviteLayer.prefab` | 16 |
| TeamArenaTeamAddMainLayer | `prefabs/ui/team-arena/TeamArenaTeamAddMainLayer.prefab` | 10 |
| TeamArenaTeamAddReqCell | `prefabs/ui/team-arena/TeamArenaTeamAddReqCell.prefab` | 35 |
| TeamArenaTeamAddReqLayer | `prefabs/ui/team-arena/TeamArenaTeamAddReqLayer.prefab` | 20 |
| TeamArenaTeamCell | `prefabs/ui/team-arena/TeamArenaTeamCell.prefab` | 41 |
| TeamArenaTeamLayer | `prefabs/ui/team-arena/TeamArenaTeamLayer.prefab` | 17 |
| TeamArenaTeamMainLayer | `prefabs/ui/team-arena/TeamArenaTeamMainLayer.prefab` | 11 |
| TeamArenaVideoCell | `prefabs/ui/team-arena/TeamArenaVideoCell.prefab` | 38 |
| TeamArenaVideoLayer | `prefabs/ui/team-arena/TeamArenaVideoLayer.prefab` | 13 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/arena/team-arena_spr-ditu.png` | [5, 5, 5, 5] |
| `ui/arena/team-arena_spr-log-k1.png` | [5, 5, 5, 5] |
| `ui/common/win-bg_block-bg-43.png` | [9, 9, 9, 9] |
| `ui/common/win-bg_block-bg-44.png` | [5, 5, 7, 7] |
| `ui/common/win-bg_cell-bg-13.png` | [49, 19, 11, 11] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/common/win-bg_block-bg-10.png` → P3A
- `ui/maps/map-bg-result-1.png` → P3A
- `ui/hero/hero-select_xian.png` → P3A
- `ui/common/rank_spr-paimingk-1.png` → P3A
- `ui/common/win-bg_line-2.png` → P3B2
- `ui/common/win-bg_text-bg.png` → P3B2
- `ui/compare-share/compare-share_spr-bg.png` → P3C
- `ui/common/win-bg_block-bg-4.png` → P3C

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_win-bg-24.png` [29, 29, 29, 29]（edited by P1）
- `ui/common/win-bg_block-bg-20.png` [9, 9, 9, 9]（edited by P2A）
- `ui/common/win-bg_block-bg-22.png` [9, 9, 9, 9]（edited by P2C）
- `ui/common/setting_spr-block-2.png` [10, 10, 10, 10]（edited by P2A）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 9, 9, 9] | `TeamArenaBattleLogCell:/TeamArenaBattleLogCell/node/CCScale9Sprite_1` |
| `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 11, 11, 11] | `TeamArenaLineupCell:/TeamArenaLineupCell/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaBattleLayer:/TeamArenaBattleLayer/panel/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaBattleLogLayer:/TeamArenaBattleLogLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaLayer:/TeamArenaLayer/panel/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaLineupLayer:/TeamArenaLineupLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaNewTeam:/TeamArenaNewTeam/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaRewardLayer:/TeamArenaRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaTeamAddMainLayer:/TeamArenaTeamAddMainLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaTeamMainLayer:/TeamArenaTeamMainLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaVideoLayer:/TeamArenaVideoLayer/CCScale9Sprite_1` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 0, 0] | `TeamArenaEndLayer:/TeamArenaEndLayer/spr_bg` |

## TeamArenaBattleCell（41）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaBattleCell` | TeamArenaBattleCell | [0, 0] | [0, 0] | [540, 120] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel` | CCNode | [0, 0] | [0, 0] | [540, 120] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [542, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-paimingk-1.png` da39b30c-711a-4b1f-9916-8d6f44421495 insets[10, 10, 10, 10] |
| `/TeamArenaBattleCell/panel/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/UIMenu_1/btn_battle` | UIMenuItemLabel | [462, 58] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「」48 [255, 255, 255, 255] |
| `/TeamArenaBattleCell/panel/no_start` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_1` | CCNode | [53, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1/spr_photo_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1/spr_frame_1` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1/menu/btn_photo_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_has_role_1/lbl_role_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_no_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_1/shoe_no_role_1/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleCell/panel/no_start/show_role_2` | CCNode | [136, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2/spr_photo_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2/spr_frame_2` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2/menu/btn_photo_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_has_role_2/lbl_role_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_no_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_2/shoe_no_role_2/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleCell/panel/no_start/show_role_3` | CCNode | [218, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3/spr_photo_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3/spr_frame_3` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3/menu/btn_photo_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_has_role_3/lbl_role_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_no_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleCell/panel/no_start/show_role_3/shoe_no_role_3/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleCell/panel/no_start/lbl_sorce_bg` | UILabelTTF | [301, 63] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「sssss」40 STZhongsong.ttf rgb[122, 71, 45] |
| `/TeamArenaBattleCell/panel/no_start/lbl_sorce` | UILabelTTF | [328.4, 64] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1111111」40 STZhongsong.ttf rgb[32, 166, 0] |
| `/TeamArenaBattleCell/panel/no_start/lbl_teamname` | UILabelTTF | [276, 92] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「name」40 STZhongsong.ttf rgb[205, 98, 41] |
| `/TeamArenaBattleCell/panel/no_start/lbl_fight` | UILabelTTF | [299, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00909090909」40 STZhongsong.ttf rgb[122, 71, 45] |
| `/TeamArenaBattleCell/panel/no_start/CCSprite_1` | CCSprite | [288, 34] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |

## TeamArenaBattleLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaBattleLayer` | TeamArenaBattleLayer | [0, 0] | [0, 0] | [630, 600] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLayer/panel` | CCNode | [0, 0] | [0, 0] | [630, 600] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLayer/panel/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaBattleLayer/panel/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLayer/panel/UIMenu_1/btn_close` | UIMenuItemImage | [570, 567] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaBattleLayer/panel/UIMenu_1/btn_done` | UIMenuItemLabel | [320, 76] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [255, 255, 255, 255] |
| `/TeamArenaBattleLayer/panel/spr_list_bg` | CCScale9Sprite | [36, 125] | [0.5, 0.5] | [560, 390] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-ditu.png` 330d0332-aec3-41ec-b8bc-6633fddb2329 insets[5, 5, 5, 5] |
| `/TeamArenaBattleLayer/panel/node_title` | CCNode | [315.0, 594.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLayer/panel/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaBattleLayer/panel/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「好友助战」56 STZhongsong.ttf rgb[255, 227, 183] |

## TeamArenaBattleLogCell（100）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaBattleLogCell` | TeamArenaBattleLogCell | [0, 0] | [0, 0] | [540, 260] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 260] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[40, 10, 10, 10] |
| `/TeamArenaBattleLogCell/node/lbl_result` | UILabelTTF | [19, 239.44] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」20 FZCSJW--GB1-0.ttf rgb[39, 138, 34] |
| `/TeamArenaBattleLogCell/node/lbl_time` | UILabelTTF | [518.8, 239.4] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCSprite_1` | CCSprite | [270, 206] | [0.5, 0.5] | [186, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-log-vs.png` 9019f8fd-1c4f-46c6-a3f6-e111e04bbfbf |
| `/TeamArenaBattleLogCell/node/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/lbl_name1` | UILabelTTF | [41.0, 205] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start` | CCNode | [4, 84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1` | CCNode | [43, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1/spr_photo_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1/spr_frame_1` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1/menu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1/menu_1/btn_photo_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_has_role_1/lbl_role_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_no_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_1/shoe_no_role_1/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2` | CCNode | [125, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2/spr_photo_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2/spr_frame_2` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2/menu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2/menu_2/btn_photo_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_has_role_2/lbl_role_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_no_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_2/shoe_no_role_2/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3` | CCNode | [204, 66] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3/spr_photo_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3/spr_frame_3` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3/menu_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3/menu_3/btn_photo_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_has_role_3/lbl_role_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_no_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/no_start/show_role_3/shoe_no_role_3/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1` | CCNode | [57, 69] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/CCScale9Sprite_1` | CCScale9Sprite | [7, 0] | [0.5, 0.5] | [160, 26] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-log-k1.png` 2d83b19f-1245-4257-867a-c3713b3f09eb insets[5, 5, 5, 5] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/lbl_battlebg1` | UILabelTTF | [2.8, 13.8] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/lbl_battle1` | UILabelTTF | [17.8, 13.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1` | CCNode | [56, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/CCScale9Sprite_1` | CCScale9Sprite | [7, 0] | [0.5, 0.5] | [160, 26] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-log-k1.png` 2d83b19f-1245-4257-867a-c3713b3f09eb insets[5, 5, 5, 5] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/lbl_scorebg1` | UILabelTTF | [2.8, 13.8] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/lbl_score1` | UILabelTTF | [17.8, 13.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1` | CCNode | [56, 12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/CCScale9Sprite_1` | CCScale9Sprite | [7, 0] | [0.5, 0.5] | [160, 26] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-log-k1.png` 2d83b19f-1245-4257-867a-c3713b3f09eb insets[5, 5, 5, 5] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/lbl_rankbg1` | UILabelTTF | [2.8, 13.8] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_1/attr_1/lbl_rank1` | UILabelTTF | [17.8, 13.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_1/team_result_1` | CCSprite | [22, 205] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/TeamArenaBattleLogCell/node/CCNode_2` | CCNode | [270, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/lbl_name2` | UILabelTTF | [220.6, 206] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start` | CCNode | [4, 84] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1` | CCNode | [59, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1/b_spr_photo_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1/b_spr_frame_1` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1/b_menu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1/b_menu_1/b_btn_photo_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_has_role_1/b_lbl_role_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_no_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_1/b_shoe_no_role_1/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2` | CCNode | [140, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2/b_spr_photo_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2/b_spr_frame_2` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2/b_menu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2/b_menu_2/b_btn_photo_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_has_role_2/b_lbl_role_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_no_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_2/b_shoe_no_role_2/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3` | CCNode | [220, 66] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3/b_spr_photo_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3/b_spr_frame_3` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3/b_menu_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3/b_menu_3/b_btn_photo_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_has_role_3/b_lbl_role_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_no_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/no_start/b_show_role_3/b_shoe_no_role_3/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1` | CCNode | [89, 69] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/CCScale9Sprite_1` | CCScale9Sprite | [7, 0] | [0.5, 0.5] | [160, 26] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-log-k1.png` 2d83b19f-1245-4257-867a-c3713b3f09eb insets[5, 5, 5, 5] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/lbl_battlebg2` | UILabelTTF | [2.8, 13.8] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/lbl_battle2` | UILabelTTF | [17.8, 13.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1` | CCNode | [88, 40] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/CCScale9Sprite_1` | CCScale9Sprite | [7, 0] | [0.5, 0.5] | [160, 26] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-log-k1.png` 2d83b19f-1245-4257-867a-c3713b3f09eb insets[5, 5, 5, 5] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/lbl_scorebg2` | UILabelTTF | [2.8, 13.8] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/lbl_score2` | UILabelTTF | [17.8, 13.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1` | CCNode | [88, 12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/CCScale9Sprite_1` | CCScale9Sprite | [7, 0] | [0.5, 0.5] | [160, 26] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-log-k1.png` 2d83b19f-1245-4257-867a-c3713b3f09eb insets[5, 5, 5, 5] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/lbl_rankbg2` | UILabelTTF | [2.8, 13.8] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_2/attr_1/lbl_rank2` | UILabelTTF | [17.8, 13.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaBattleLogCell/node/CCNode_2/team_result_2` | CCSprite | [243, 205] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/TeamArenaBattleLogCell/node/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogCell/node/CCMenu_1/btn_message` | UIMenuItemImage | [270, 54.12] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_spr-log-xiangxi.png` 731a3c0c-fde7-4e42-ae2f-d9e915b6071f |

## TeamArenaBattleLogLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaBattleLogLayer` | TeamArenaBattleLogLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaBattleLogLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaBattleLogLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「录像馆」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/TeamArenaBattleLogLayer/spr_bg` | CCScale9Sprite | [36.6, 77] | [0.5, 0.5] | [568, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-4.png` 40b17191-9807-4ed6-b2ff-341e633aaddc insets[10, 10, 10, 10] |
| `/TeamArenaBattleLogLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaBattleLogLayer/CCMenu_1/btn_close` | UIMenuItemImage | [556.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaBattleLogLayer/scroll_view_tab` | CCScrollView | [318, 765] | [0.5, 0] | [550, 50] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/TeamArenaBattleLogLayer/lbl_tips` | UILabelTTF | [320, 842] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「345353」18 STZhongsong.ttf rgb[122, 71, 45] |

## TeamArenaConditionLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaConditionLayer` | TeamArenaConditionLayer | [0, 0] | [0, 0] | [630, 472] | [1, 1] | 0 | 是 |  |
| `/TeamArenaConditionLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630.0, 472.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/TeamArenaConditionLayer/node_title` | CCNode | [315.0, 472.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaConditionLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, -9] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/TeamArenaConditionLayer/node_title/lbl_title` | UILabelTTF | [0, -53] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「申请条件」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaConditionLayer/node_min_level` | CCNode | [315, 321] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaConditionLayer/node_min_level/UILabelTTF_1` | UILabelTTF | [-57, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「入队最低等级:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaConditionLayer/node_min_power` | CCNode | [315, 257] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaConditionLayer/node_min_power/UILabelTTF_1` | UILabelTTF | [-57, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「入队最低战力:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaConditionLayer/CCNode_1` | CCNode | [315, 182] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaConditionLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [-64, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「是否需要审核」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaConditionLayer/CCScale9Sprite_1` | CCScale9Sprite | [315.0, 129.0] | [0.5, 0] | [500, 5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e insets[0, 0, 10, 10] |
| `/TeamArenaConditionLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [630.0, 472.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaConditionLayer/UIMenu_1/btn_close` | UIMenuItemImage | [575.0, 437.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaConditionLayer/UIMenu_1/btn_cancel` | UIMenuItemLabel | [188.0, 85.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「取消」44 [255, 255, 255, 255] |
| `/TeamArenaConditionLayer/UIMenu_1/btn_ok` | UIMenuItemLabel | [442.0, 85.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「确定」44 [255, 255, 255, 255] |
| `/TeamArenaConditionLayer/UIMenu_1/btn_check` | UIMenuItemCheckBox | [291.0, 184.0] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |

## TeamArenaEndLayer（80）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaEndLayer` | TeamArenaEndLayer | [0, 0] | [0, 0] | [640, 480] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/spr_bg` | CCScale9Sprite | [320, 0] | [0.5, 0] | [640, 480] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[150, 150, 0, 0] |
| `/TeamArenaEndLayer/spr_wing` | CCSprite | [312, 454] | [0.5, 0.5] | [360, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-wing-0.png` 631699e5-abed-46c6-8e62-7db778c3eb15 |
| `/TeamArenaEndLayer/spr_result` | CCSprite | [317, 443] | [0.5, 0.5] | [174, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end-lang_lbl-result-0.png` 7622a5f2-d788-4b75-bc8d-92896fd6e478 |
| `/TeamArenaEndLayer/CCSprite_1` | CCSprite | [320, -15] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/TeamArenaEndLayer/lbl_fight` | UILabelTTF | [320, 362] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00909090909」40 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/TeamArenaEndLayer/menu_main` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/menu_main/btn_report` | UIMenuItemImage | [591, 398] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/TeamArenaEndLayer/menu_main/btn_battle` | UIMenuItemLabel | [163, -72] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「」40 [255, 255, 255, 255] |
| `/TeamArenaEndLayer/menu_main/btn_battle2` | UIMenuItemLabel | [466, -75] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c pressed `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「」40 [255, 255, 255, 255] |
| `/TeamArenaEndLayer/CCScale9Sprite_1` | CCScale9Sprite | [320, 268] | [0.5, 0.5] | [512, 132] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f insets[10, 10, 0, 0] |
| `/TeamArenaEndLayer/CCScale9Sprite_2` | CCScale9Sprite | [320, 114] | [0.5, 0.5] | [512, 132] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f insets[10, 10, 0, 0] |
| `/TeamArenaEndLayer/lbl_teamname1` | UILabelTTF | [111, 318] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「name」40 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaEndLayer/lbl_teamname2` | UILabelTTF | [111, 160] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「name」40 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaEndLayer/no_start` | CCNode | [95, 197] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_1` | CCNode | [43, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1/spr_photo_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1/spr_frame_1` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1/menu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1/menu_1/btn_photo_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_has_role_1/lbl_role_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_no_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaEndLayer/no_start/show_role_1/shoe_no_role_1/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaEndLayer/no_start/show_role_2` | CCNode | [125, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2/spr_photo_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2/spr_frame_2` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2/menu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2/menu_2/btn_photo_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_has_role_2/lbl_role_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_no_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaEndLayer/no_start/show_role_2/shoe_no_role_2/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaEndLayer/no_start/show_role_3` | CCNode | [204, 66] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3/spr_photo_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3/spr_frame_3` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3/menu_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3/menu_3/btn_photo_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_has_role_3/lbl_role_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_no_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaEndLayer/no_start/show_role_3/shoe_no_role_3/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaEndLayer/no_start` | CCNode | [80, 38] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_1` | CCNode | [59, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1/b_spr_photo_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1/b_spr_frame_1` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1/b_menu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1/b_menu_1/b_btn_photo_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_has_role_1/b_lbl_role_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_no_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaEndLayer/no_start/b_show_role_1/b_shoe_no_role_1/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaEndLayer/no_start/b_show_role_2` | CCNode | [140, 65] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2/b_spr_photo_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2/b_spr_frame_2` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2/b_menu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2/b_menu_2/b_btn_photo_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_has_role_2/b_lbl_role_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_no_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaEndLayer/no_start/b_show_role_2/b_shoe_no_role_2/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaEndLayer/no_start/b_show_role_3` | CCNode | [220, 66] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3/b_spr_photo_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3/b_spr_frame_3` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3/b_menu_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3/b_menu_3/b_btn_photo_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_has_role_3/b_lbl_role_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_no_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaEndLayer/no_start/b_show_role_3/b_shoe_no_role_3/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaEndLayer/lbl_rank1` | UILabelTTF | [368, 236] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「name」20 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/TeamArenaEndLayer/lbl_rank2` | UILabelTTF | [368, 80] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「name」20 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/TeamArenaEndLayer/rich1` | CCNode | [369, 271] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaEndLayer/rich2` | CCNode | [369, 114] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## TeamArenaLayer（33）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaLayer` | TeamArenaLayer | [0, 0] | [0, 0] | [640, 1000] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLayer/panel` | CCNode | [0, 0] | [0, 0] | [640, 1000] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLayer/panel/spr_bg` | CCScale9Sprite | [1, 71] | [0.5, 0.5] | [640, 690] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaLayer/panel/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLayer/panel/UIMenu_1/btn_back` | UIMenuItemImage | [572, 1012] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/TeamArenaLayer/panel/UIMenu_1/btn_battle` | UIMenuItemLabel | [320, 45] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」52 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/UIMenu_1/btn_battle_log` | UIMenuItemLabel | [44, 37] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba · Label「」24 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/UIMenu_1/btn_team` | UIMenuItemLabel | [127, 37] | [0.5, 0.5] | [67, 75] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_spr-bzicon.png` 33bd20ae-5f51-45e3-997a-b7b1078d8110 · Label「」24 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/UIMenu_1/btn_info` | UIMenuItemImage | [592, 953] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/TeamArenaLayer/panel/UIMenu_1/btn_team` | UIMenuItemLabel | [50, 977] | [0.5, 0.5] | [66, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-shop.png` cd3f7542-06ef-4fb7-9197-057911ec9a61 · Label「」24 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/UIMenu_1/btn_team` | UIMenuItemLabel | [140, 977] | [0.5, 0.5] | [67, 75] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_spr-jlicon.png` cabc9cc7-13e4-45fb-bc6e-dbe8bd5d398c · Label「」24 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/UIMenu_1/btn_battle_reward` | UIMenuItemLabel | [590, 42] | [0.5, 0.5] | [67, 67] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/team-arena_spr-tzjlicon.png` e3959412-a307-4e51-82a0-464cf543efb7 · Label「」24 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/UIMenu_1/btn_team_hall` | UIMenuItemLabel | [320, 45] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」52 [255, 255, 255, 255] |
| `/TeamArenaLayer/panel/CCSprite_1` | CCSprite | [322, 866] | [0.5, 0.5] | [610, 182] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/team-arena-lang/team-arena-lang_spr-bamner.png` 775e7d39-cdab-461a-a69c-fac4c48e3931 |
| `/TeamArenaLayer/panel/CCSprite_1/is_status` | CCSprite | [6.0, -32.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** team-arena/spr-battle-4.png |
| `/TeamArenaLayer/panel/CCSprite_1/lbl_time` | UILabelTTF | [6.0, -63.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」36 FZCSJW--GB1-0.ttf rgb[133, 228, 75] |
| `/TeamArenaLayer/panel/CCSprite_1/CCSprite_1` | CCSprite | [-243.0, -101.0] | [0.5, 0.5] | [24, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-lianjie.png` 11b2ac82-f3f7-4b29-aafb-e8135533e604 |
| `/TeamArenaLayer/panel/CCSprite_1/CCSprite_2` | CCSprite | [230.0, -101.0] | [0.5, 0.5] | [24, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-lianjie.png` 11b2ac82-f3f7-4b29-aafb-e8135533e604 |
| `/TeamArenaLayer/panel/spr_bg_1` | CCScale9Sprite | [42, 279] | [0.5, 0.5] | [560, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-ditu.png` 330d0332-aec3-41ec-b8bc-6633fddb2329 insets[5, 5, 5, 5] |
| `/TeamArenaLayer/panel/spr_bg_2` | CCScale9Sprite | [42, 126] | [0.5, 0.5] | [560, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-ditu.png` 330d0332-aec3-41ec-b8bc-6633fddb2329 insets[5, 5, 5, 5] |
| `/TeamArenaLayer/panel/show_my_team_panel` | CCNode | [320, 196] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLayer/panel/spr_ribbon` | CCSprite | [320.0, 264.0] | [0.5, 0.5] | [226, 41] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paimingk-4.png` a77818fd-ae19-4f5d-ab40-98240984255a |
| `/TeamArenaLayer/panel/spr_ribbon/show_team_name` | UILabelTTF | [0.0, 5.5] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「mmmmmmmm」48 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaLayer/panel/CCSprite_2` | CCSprite | [320, 744] | [0.5, 0.5] | [245, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-btk.png` dee74345-2b71-4a23-8052-90670e8a5c3e |
| `/TeamArenaLayer/panel/CCSprite_2/lbl_title` | UILabelTTF | [0.5, -2.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「000000」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaLayer/panel/show_nums_panel` | CCNode | [332, 19] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLayer/panel/CCSprite_3` | CCSprite | [586, 1] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-pubtask-k.png` fd8721ba-4630-444c-801d-9bf5a7a1ab7e |
| `/TeamArenaLayer/panel/CCSprite_3/lbl_reward1` | UILabelTTF | [4.0, -5.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「000000」36 FZCSJW--GB1-0.ttf rgb[133, 226, 75] |
| `/TeamArenaLayer/panel/CCSprite_3/lbl_reward2` | UILabelTTF | [4.0, 16.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「000000」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaLayer/panel/node_null` | CCNode | [322, 701] | [0.5, 1] | [560, 420] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLayer/panel/node_null/UILabelTTF_1` | UILabelTTF | [2.0, -270] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无队伍信息」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaLayer/panel/node_null/CCSprite_1` | CCSprite | [0.692, -183.424] | [0.5, 0.5] | [130, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-girl-1.png` 2a4f5520-2a76-437c-a185-da5781023b4f |
| `/TeamArenaLayer/panel/lbl_message` | UILabelTTF | [320, 195] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」40 FZCSJW--GB1-0.ttf rgb[122, 71, 45] |

## TeamArenaLineupCell（49）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaLineupCell` | TeamArenaLineupCell | [0, 0] | [0, 0] | [560, 234] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [560.0, 234.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[40, 12, 12, 12] |
| `/TeamArenaLineupCell/lbl_name` | UILabelTTF | [26, 230] | [0, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaLineupCell/CCNode_1` | CCNode | [560, 234] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/CCNode_1/CCSprite_1` | CCSprite | [-120, -20] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TeamArenaLineupCell/CCNode_1/lbl_power` | UILabelTTF | [-108, -20] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaLineupCell/node_fetters` | CCNode | [401, 151] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_fetters/spr_fetters_border` | CCSprite | [0, 0] | [0.5, 0.5] | [93, 93] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_btn-add.png` 46727145-d73f-4336-9862-3f0f7d1a1205 |
| `/TeamArenaLineupCell/node_fetters/spr_fetters` | CCSprite | [0, 0] | [0.5, 0.5] | [94, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_10101.png` 289a3059-5dca-4feb-ad47-8e06c500ebdd |
| `/TeamArenaLineupCell/node_contract` | CCNode | [403, 58] | [0, 0] | [0, 0] | [0.8, 0.8] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_contract/spr_contract` | CCSprite | [0, 0] | [0.5, 0.5] | [84, 84] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-1-1.png` 25dc12e6-91a5-462b-b5c6-127d4c23ebeb |
| `/TeamArenaLineupCell/node_contract/lbl_contract` | UILabelTTF | [0, -42] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「平衡型」50 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaLineupCell/UILabelTTF_1` | UILabelTTF | [500, 100] | [0.5, 1] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「隐藏队伍」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaLineupCell/node_hero` | CCNode | [10, 10] | [0, 0] | [330, 180] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [330.0, 180.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-43.png` 4e6aa903-7fa8-4788-945b-31d250111897 insets[10, 10, 10, 10] |
| `/TeamArenaLineupCell/node_hero/node_pos_4` | CCNode | [45, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_4/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_4/spr_lock_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_3` | CCNode | [125, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_3/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_3/spr_lock_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_2` | CCNode | [205, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_2/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_2/spr_lock_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_1` | CCNode | [285, 130] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_1/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_1/spr_lock_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_8` | CCNode | [45, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_8/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_8/spr_lock_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_7` | CCNode | [125, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_7/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_7/spr_lock_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_6` | CCNode | [205, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_6/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_6/spr_lock_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/node_hero/node_pos_5` | CCNode | [285, 50] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/node_hero/node_pos_5/CCSprite_1` | CCSprite | [0, -2] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaLineupCell/node_hero/node_pos_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaLineupCell/node_hero/node_pos_5/spr_lock_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/TeamArenaLineupCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupCell/menu/btn_hide` | UIMenuItemCheckBox | [500, 124] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |

## TeamArenaLineupLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaLineupLayer` | TeamArenaLineupLayer | [0, 0] | [0, 0] | [640, 930] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640.0, 930.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaLineupLayer/node_title` | CCNode | [320.0, 930.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, -9] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaLineupLayer/node_title/lbl_title` | UILabelTTF | [0, -49] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「组队布阵」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaLineupLayer/lbl_title` | UILabelTTF | [320, 836] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队长可以在改界面调整玩家出战顺序」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaLineupLayer/CCNode_1` | CCNode | [320.0, 819.33] | [0.5, 1] | [570, 700] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupLayer/CCNode_1/spr_box` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [570.0, 700.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/TeamArenaLineupLayer/CCNode_1/scroll_view` | CCScrollView | [0.0, -350.0] | [0.5, 0.5] | [570.0, 686.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/TeamArenaLineupLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640.0, 930.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaLineupLayer/UIMenu_1/btn_close` | UIMenuItemImage | [573.0, 893.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaLineupLayer/UIMenu_1/btn_person` | UIMenuItemLabel | [167.0, 83.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「个人布阵」44 [255, 255, 255, 255] |
| `/TeamArenaLineupLayer/UIMenu_1/btn_save` | UIMenuItemLabel | [473.0, 83.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「保存调整」44 [255, 255, 255, 255] |

## TeamArenaMyTeamAddCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaMyTeamAddCell` | TeamArenaMyTeamAddCell | [0, 0] | [0, 0] | [554, 142] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamAddCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [554.0, 142.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[6, 6, 8, 8] |
| `/TeamArenaMyTeamAddCell/UILabelTTF_1` | UILabelTTF | [277, 25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「点击可查看申请列表或邀请玩家加入队伍」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaMyTeamAddCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamAddCell/menu/btn_add` | UIMenuItemImage | [276.694, 83.722] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |

## TeamArenaMyTeamCell（36）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaMyTeamCell` | TeamArenaMyTeamCell | [0, 0] | [0, 0] | [554, 182] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [554.0, 182.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[6, 6, 8, 8] |
| `/TeamArenaMyTeamCell/node_role` | CCNode | [56, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_role/menu_head` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_role/menu_head/btn_head` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaMyTeamCell/node_role/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaMyTeamCell/node_role/lbl_level` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaMyTeamCell/CCNode_1` | CCNode | [102, 158] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/CCNode_1/lbl_name` | UILabelTTF | [0, 1] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaMyTeamCell/CCNode_1/lbl_pos` | UILabelTTF | [140, 1] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaMyTeamCell/CCNode_2` | CCNode | [180, 119] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [161, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr_power_bg.png` 252fd04e-288a-4209-8641-cb346cc55a61 |
| `/TeamArenaMyTeamCell/CCNode_2/lbl_power` | UILabelTTF | [10, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaMyTeamCell/CCScale9Sprite_2` | CCScale9Sprite | [277.0, 93.0] | [0.5, 0] | [500, 5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e insets[0, 0, 10, 10] |
| `/TeamArenaMyTeamCell/node_hero` | CCNode | [23.727, 51.241] | [0, 0.5] | [505, 84] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_1` | CCNode | [41, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_1/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaMyTeamCell/node_hero/node_pos_1/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaMyTeamCell/node_hero/node_pos_2` | CCNode | [125, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_2/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaMyTeamCell/node_hero/node_pos_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaMyTeamCell/node_hero/node_pos_3` | CCNode | [210, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_3/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaMyTeamCell/node_hero/node_pos_3/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaMyTeamCell/node_hero/node_pos_4` | CCNode | [294, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_4/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaMyTeamCell/node_hero/node_pos_4/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaMyTeamCell/node_hero/node_pos_5` | CCNode | [379, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_5/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaMyTeamCell/node_hero/node_pos_5/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaMyTeamCell/node_hero/node_pos_6` | CCNode | [463, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/node_hero/node_pos_6/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaMyTeamCell/node_hero/node_pos_6/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaMyTeamCell/menu` | UIMenu | [554, 182] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamCell/menu/btn_give` | UIMenuItemImage | [-164.194, -45] | [0.5, 0.5] | [77, 68] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_btn_give.png` f56d246d-799f-4bd0-ab65-631a543e7709 |
| `/TeamArenaMyTeamCell/menu/btn_remove` | UIMenuItemImage | [-62.5, -45] | [0.5, 0.5] | [77, 68] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_btn_remove.png` b9fbb7f6-51aa-4130-9e75-9ea134ef4af9 |

## TeamArenaMyTeamLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaMyTeamLayer` | TeamArenaTeamLayer | [0, 0] | [0, 0] | [568, 754] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_1` | CCNode | [284, 682] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [161, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr_power_bg.png` 252fd04e-288a-4209-8641-cb346cc55a61 |
| `/TeamArenaMyTeamLayer/CCNode_1/lbl_power` | UILabelTTF | [10, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaMyTeamLayer/CCNode_2` | CCNode | [284, 631] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [-218, 1] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「申请条件：」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaMyTeamLayer/CCNode_2/spr_input_name_bg` | CCScale9Sprite | [42, 0] | [0.5, 0.5] | [420, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-2.png` e3dc4c54-0198-414a-9405-be119c449086 insets[10, 10, 10, 10] |
| `/TeamArenaMyTeamLayer/CCNode_2/lbl_min_level` | UILabelTTF | [-87, -1] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「不限制」44 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaMyTeamLayer/CCNode_2/lbl_min_power` | UILabelTTF | [83, -1] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「不限制」44 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaMyTeamLayer/CCNode_3` | CCNode | [284, 605] | [0.5, 1] | [562, 520] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_3/spr_box` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [562.0, 520.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/TeamArenaMyTeamLayer/CCNode_3/node_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 520.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_3/node_null/UILabelTTF_1` | UILabelTTF | [1.0, -302.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无队伍信息」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaMyTeamLayer/CCNode_3/node_null/CCSprite_1` | CCSprite | [0.694, -227.097] | [0.5, 0.5] | [130, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-girl-1.png` 2a4f5520-2a76-437c-a185-da5781023b4f |
| `/TeamArenaMyTeamLayer/CCNode_3/node_null/UILabelTTF_2` | UILabelTTF | [0.0, 117.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未加入队伍」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 520.0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/lbl_name` | UILabelTTF | [0.0, 117.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/node_input` | CCNode | [0.0, 116.0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/node_input/spr_input_name_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [210, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-2.png` e3dc4c54-0198-414a-9405-be119c449086 insets[10, 10, 10, 10] |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/node_input/node_input_rect` | CCNode | [-16, 0] | [0.5, 0.5] | [180, 32] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/UIMenu_1` | UIMenu | [-281.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/UIMenu_1/btn_edit` | UIMenuItemImage | [370.222, 115.861] | [0.5, 0.5] | [24, 24] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/setting_btn-edit.png` 3b2a6eea-23aa-4495-96e9-b883e7d6d771 |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/UIMenu_1/btn_adjust` | UIMenuItemImage | [501, 27] | [0.5, 0.5] | [72, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_btn_tz.png` 5ccd58ee-8cb5-47e8-bade-7e0ffeb9747e |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/UIMenu_1/btn_out` | UIMenuItemLabel | [132, -556] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「退出队伍」44 [255, 255, 255, 255] |
| `/TeamArenaMyTeamLayer/CCNode_3/node_not_null/UIMenu_1/btn_join` | UIMenuItemLabel | [430, -556] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「报名参赛」44 [255, 255, 255, 255] |

## TeamArenaNewTeam（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaNewTeam` | TeamArenaNewTeamLayer | [0, 0] | [0, 0] | [630, 928] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeam/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630.0, 928.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaNewTeam/node_title` | CCNode | [315.0, 928.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeam/node_title/spr_title_bg` | CCScale9Sprite | [0, -9] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaNewTeam/node_title/lbl_title` | UILabelTTF | [0, -49] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「组队大厅」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaNewTeam/menu_tab` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeam/menu_tab/btn_equip` | UIMenuItemTab | [259, 812] | [1, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-17.png` cf411808-6e90-4980-a5f3-f37df9b2a5eb pressed `ui/common/button_btn-tab-18.png` e779f392-0b39-4a1a-8065-05eaa6d72a7b · Label「组队」48 [255, 255, 255, 255] |
| `/TeamArenaNewTeam/menu_tab/btn_runes` | UIMenuItemTab | [382, 812] | [1, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-19.png` 66292d70-21aa-4d02-af3b-c6922303c5f8 pressed `ui/common/button_btn-tab-20.png` d79055c9-b417-4ace-af7a-e2cfa1bc6baa · Label「收到邀请」48 [255, 255, 255, 255] |
| `/TeamArenaNewTeam/menu_tab/btn_god_equip` | UIMenuItemTab | [373, 812] | [0, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-21.png` cf720145-2705-49d5-8a2e-bd068cfc8ed2 pressed `ui/common/button_btn-tab-22.png` 25ba8a65-b054-468b-b706-6b0152747c53 · Label「我的队伍」48 [255, 255, 255, 255] |
| `/TeamArenaNewTeam/node_layer_parent` | CCNode | [315, 789] | [0.5, 1] | [568, 754] | [1, 1] | 0 | 是 |  |

## TeamArenaNewTeamLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaNewTeamLayer` | TeamArenaNewTeamLayer | [0, 0] | [0, 0] | [630, 528] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630.0, 528.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/TeamArenaNewTeamLayer/node_title` | CCNode | [315.0, 528.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, -9] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/TeamArenaNewTeamLayer/node_title/lbl_title` | UILabelTTF | [0, -53] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「创建队伍」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaNewTeamLayer/CCNode_1` | CCNode | [315, 379] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [-57, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「创建队伍名字:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaNewTeamLayer/CCNode_1/spr_input_name_bg` | CCScale9Sprite | [-44, 0] | [0, 0.5] | [240, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-2.png` e3dc4c54-0198-414a-9405-be119c449086 insets[10, 10, 10, 10] |
| `/TeamArenaNewTeamLayer/node_min_level` | CCNode | [315, 316] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/node_min_level/UILabelTTF_1` | UILabelTTF | [-57, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「入队最低等级:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaNewTeamLayer/node_min_power` | CCNode | [315, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/node_min_power/UILabelTTF_1` | UILabelTTF | [-57, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「入队最低战力:」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaNewTeamLayer/CCNode_2` | CCNode | [315, 175] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [-64, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「是否需要审核」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaNewTeamLayer/CCScale9Sprite_1` | CCScale9Sprite | [315.0, 132.0] | [0.5, 0] | [500, 5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e insets[0, 0, 10, 10] |
| `/TeamArenaNewTeamLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [630.0, 528.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaNewTeamLayer/UIMenu_1/btn_close` | UIMenuItemImage | [575.0, 493.0] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaNewTeamLayer/UIMenu_1/btn_cancel` | UIMenuItemLabel | [188.0, 85.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「取消」44 [255, 255, 255, 255] |
| `/TeamArenaNewTeamLayer/UIMenu_1/btn_ok` | UIMenuItemLabel | [442.0, 85.0] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「确定」44 [255, 255, 255, 255] |
| `/TeamArenaNewTeamLayer/UIMenu_1/btn_check` | UIMenuItemCheckBox | [283.333, 177.833] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |

## TeamArenaRankCell（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaRankCell` | TeamArenaRankCell | [0, 0] | [0, 0] | [542, 120] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [542, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-paimingk-1.png` da39b30c-711a-4b1f-9916-8d6f44421495 insets[10, 10, 10, 10] |
| `/TeamArenaRankCell/no_start` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/spr_rank` | CCSprite | [49, 85] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/TeamArenaRankCell/no_start/lbl_rank` | UILabelTTF | [50, 57] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaRankCell/no_start/show_role_1` | CCNode | [133, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1/spr_photo_1` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1/spr_frame_1` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1/menu/btn_photo_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_has_role_1/lbl_role_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_no_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaRankCell/no_start/show_role_1/shoe_no_role_1/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaRankCell/no_start/show_role_2` | CCNode | [222, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2/spr_photo_2` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2/spr_frame_2` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2/menu/btn_photo_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_has_role_2/lbl_role_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_no_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaRankCell/no_start/show_role_2/shoe_no_role_2/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaRankCell/no_start/show_role_3` | CCNode | [313, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3/spr_photo_3` | CCSprite | [0, 0] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3/spr_frame_3` | CCSprite | [-1, -2] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3/menu/btn_photo_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_has_role_3/lbl_role_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 STZhongsong.ttf rgb[254, 255, 255] |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_no_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/TeamArenaRankCell/no_start/show_role_3/shoe_no_role_3/role_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaRankCell/no_start/lbl_sorce_bg` | UILabelTTF | [410, 63] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「sssss」40 STZhongsong.ttf rgb[122, 71, 45] |
| `/TeamArenaRankCell/no_start/CCSprite_1` | CCSprite | [446, 102] | [0.5, 0.5] | [190, 37] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-tipbg.png` 65f9a999-44f0-48db-a61f-aecc383704d3 |
| `/TeamArenaRankCell/no_start/lbl_sorce` | UILabelTTF | [435.4, 63] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1111111」40 STZhongsong.ttf rgb[32, 166, 0] |
| `/TeamArenaRankCell/no_start/lbl_teamname` | UILabelTTF | [453, 102] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「name」40 STZhongsong.ttf rgb[205, 98, 41] |
| `/TeamArenaRankCell/no_start/lbl_fight` | UILabelTTF | [411, 34] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00909090909」40 STZhongsong.ttf rgb[122, 71, 45] |
| `/TeamArenaRankCell/no_start/CCSprite_2` | CCSprite | [394, 32] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TeamArenaRankCell/lbl_message` | UILabelTTF | [271, 60] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」40 STZhongsong.ttf rgb[122, 71, 45] |

## TeamArenaRecvInviteCell（40）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaRecvInviteCell` | TeamArenaRecvInviteCell | [0, 0] | [0, 0] | [552, 152] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552.0, 152.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-13.png` 29b74f99-8782-456c-9a8e-a7d36677f074 insets[50, 20, 12, 12] |
| `/TeamArenaRecvInviteCell/CCNode_1` | CCNode | [0, 152] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_1/spr_ribbon` | CCSprite | [79, -24] | [0.5, 0.5] | [160, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-ribbon-5.png` b2cf0379-c631-4741-a8d0-40c0d5ab112f |
| `/TeamArenaRecvInviteCell/CCNode_1/lbl_name` | UILabelTTF | [13, -23] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 FZCSJW--GB1-0.ttf rgbNone |
| `/TeamArenaRecvInviteCell/CCNode_2` | CCNode | [552, 152] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_2/CCSprite_1` | CCSprite | [-127, -25] | [0.5, 0.5] | [20, 18] | [1.3, 1.3] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TeamArenaRecvInviteCell/CCNode_2/lbl_power` | UILabelTTF | [-105, -25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaRecvInviteCell/CCNode_3` | CCNode | [56, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_3/node_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_3/node_role_1/menu_role_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_3/node_role_1/menu_role_1/btn_head_1` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaRecvInviteCell/CCNode_3/node_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaRecvInviteCell/CCNode_3/node_role_1/lbl_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaRecvInviteCell/CCNode_3/node_not_role_1` | CCNode | [0, -7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_3/node_not_role_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaRecvInviteCell/CCNode_3/node_not_role_1/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「待加入」36 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaRecvInviteCell/CCNode_4` | CCNode | [141, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_4/node_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_4/node_role_2/menu_role_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_4/node_role_2/menu_role_2/btn_head_2` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaRecvInviteCell/CCNode_4/node_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaRecvInviteCell/CCNode_4/node_role_2/lbl_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaRecvInviteCell/CCNode_4/node_not_role_2` | CCNode | [0, -7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_4/node_not_role_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaRecvInviteCell/CCNode_4/node_not_role_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「待加入」36 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaRecvInviteCell/CCNode_5` | CCNode | [226, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_5/node_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_5/node_role_3/menu_role_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_5/node_role_3/menu_role_3/btn_head_3` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaRecvInviteCell/CCNode_5/node_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaRecvInviteCell/CCNode_5/node_role_3/lbl_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaRecvInviteCell/CCNode_5/node_not_role_3` | CCNode | [0, -7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_5/node_not_role_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaRecvInviteCell/CCNode_5/node_not_role_3/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「待加入」36 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaRecvInviteCell/CCNode_6` | CCNode | [275, 59] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/CCNode_6/lbl_req_level` | UILabelTTF | [0, 14] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaRecvInviteCell/CCNode_6/lbl_req_power` | UILabelTTF | [0, -14] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaRecvInviteCell/menu` | UIMenu | [552, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteCell/menu/btn_join` | UIMenuItemLabel | [-79, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「 」44 [255, 255, 255, 255] |

## TeamArenaRecvInviteLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaRecvInviteLayer` | TeamArenaRecvInviteLayer | [0, 0] | [0, 0] | [568, 754] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteLayer/CCNode_1` | CCNode | [284, 734] | [0.5, 1] | [562, 650] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteLayer/CCNode_1/spr_box` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [562.0, 650.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/TeamArenaRecvInviteLayer/CCNode_1/node_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 650.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteLayer/CCNode_1/node_null/UILabelTTF_1` | UILabelTTF | [1.0, -381.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无队伍信息」40 STZhongsong.ttf rgb[141, 89, 58] |
| `/TeamArenaRecvInviteLayer/CCNode_1/node_null/CCSprite_1` | CCSprite | [1.0, -297.0] | [0.5, 0.5] | [130, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-girl-1.png` 2a4f5520-2a76-437c-a185-da5781023b4f |
| `/TeamArenaRecvInviteLayer/CCNode_1/node_not_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 650.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteLayer/UIMenu_1` | UIMenu | [0, 754] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRecvInviteLayer/UIMenu_1/btn_clear` | UIMenuItemLabel | [284, -708] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「一键清除」44 [255, 255, 255, 255] |

## TeamArenaRewardCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaRewardCell` | TeamArenaRewardCell | [0, 0] | [0, 0] | [550, 150] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[10, 10, 10, 10] |
| `/TeamArenaRewardCell/num_lab` | UILabelTTF | [478, 125] | [0.5008, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「345346」44 STZhongsong.ttf rgb[139, 81, 3] |
| `/TeamArenaRewardCell/top_lab` | UILabelTTF | [27, 125] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「23534645」44 STZhongsong.ttf rgb[139, 81, 3] |
| `/TeamArenaRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRewardCell/menu/btn_go` | UIMenuItemLabel | [466, 79] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「」48 [255, 255, 255, 255] |
| `/TeamArenaRewardCell/menu/btn_submit` | UIMenuItemLabel | [466, 52] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「」24 [255, 255, 255, 255] |

## TeamArenaRewardLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaRewardLayer` | TeamArenaRewardLayer | [0, 0] | [0, 0] | [640, 900] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRewardLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [640, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaRewardLayer/node_title` | CCNode | [320.0, 900.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/TeamArenaRewardLayer/node_title/CCSprite_1` | CCSprite | [1, -162] | [0.5, 0.5] | [568, 176] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/team-arena-lang/team-arena-lang_spr-reward-banner.png` 420c5314-ad66-47e7-bb6b-7d88a0124f00 |
| `/TeamArenaRewardLayer/spr_rank_bg` | CCScale9Sprite | [40, 66] | [0.5, 0.5] | [560, 570] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/arena/team-arena_spr-ditu.png` 330d0332-aec3-41ec-b8bc-6633fddb2329 insets[5, 5, 5, 5] |
| `/TeamArenaRewardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaRewardLayer/menu/btn_close` | UIMenuItemImage | [574, 865] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## TeamArenaTeamAddInviteCell（35）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamAddInviteCell` | TeamArenaTeamAddInviteCell | [0, 0] | [0, 0] | [554, 182] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [554.0, 182.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[6, 6, 8, 8] |
| `/TeamArenaTeamAddInviteCell/node_role` | CCNode | [56, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_role/menu_head` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_role/menu_head/btn_head` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaTeamAddInviteCell/node_role/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaTeamAddInviteCell/node_role/lbl_level` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamAddInviteCell/CCNode_1` | CCNode | [102, 158] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/CCNode_1/lbl_name` | UILabelTTF | [0, 1] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddInviteCell/CCNode_2` | CCNode | [180, 119] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [161, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr_power_bg.png` 252fd04e-288a-4209-8641-cb346cc55a61 |
| `/TeamArenaTeamAddInviteCell/CCNode_2/lbl_power` | UILabelTTF | [10, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaTeamAddInviteCell/CCScale9Sprite_2` | CCScale9Sprite | [277.0, 93.0] | [0.5, 0] | [500, 5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e insets[0, 0, 10, 10] |
| `/TeamArenaTeamAddInviteCell/node_hero` | CCNode | [23.727, 51.241] | [0, 0.5] | [505, 84] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_1` | CCNode | [41, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_1/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_1/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_2` | CCNode | [125, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_2/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_3` | CCNode | [210, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_3/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_3/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_4` | CCNode | [294, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_4/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_4/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_5` | CCNode | [379, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_5/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_5/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_6` | CCNode | [463, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_6/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddInviteCell/node_hero/node_pos_6/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddInviteCell/menu` | UIMenu | [554, 182] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteCell/menu/btn_invite` | UIMenuItemLabel | [-80, -57] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「 」44 [255, 255, 255, 255] |
| `/TeamArenaTeamAddInviteCell/menu/btn_invited` | UIMenuItemLabel | [-80, -57] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「 」44 [255, 255, 255, 255] |

## TeamArenaTeamAddInviteLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamAddInviteLayer` | TeamArenaTeamAddInviteLayer | [0, 0] | [0, 0] | [568, 754] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteLayer/CCNode_1` | CCNode | [284, 707] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteLayer/CCNode_1/spr_input_bg` | CCScale9Sprite | [-256.6, 0] | [0, 0.5] | [360, 52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/TeamArenaTeamAddInviteLayer/CCNode_2` | CCNode | [284, 645] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「推荐玩家」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddInviteLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [-139, 0] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/TeamArenaTeamAddInviteLayer/CCNode_2/CCScale9Sprite_2` | CCScale9Sprite | [139, 0] | [0.5, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/TeamArenaTeamAddInviteLayer/UIMenu_1` | UIMenu | [0, 754] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteLayer/UIMenu_1/btn_find` | UIMenuItemLabel | [471.222, -45.139] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「查找」44 [255, 255, 255, 255] |
| `/TeamArenaTeamAddInviteLayer/UIMenu_1/btn_refresh` | UIMenuItemLabel | [284, -706] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「刷新」44 [255, 255, 255, 255] |
| `/TeamArenaTeamAddInviteLayer/CCNode_3` | CCNode | [284, 615] | [0.5, 1] | [562, 530] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteLayer/CCNode_3/spr_box` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [562.0, 530.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/TeamArenaTeamAddInviteLayer/CCNode_3/node_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 530.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddInviteLayer/CCNode_3/node_null/UILabelTTF_1` | UILabelTTF | [1.0, -312.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无队伍信息」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddInviteLayer/CCNode_3/node_null/CCSprite_1` | CCSprite | [0.694, -231.464] | [0.5, 0.5] | [130, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-girl-1.png` 2a4f5520-2a76-437c-a185-da5781023b4f |
| `/TeamArenaTeamAddInviteLayer/CCNode_3/node_not_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562, 530] | [1, 1] | 0 | 是 |  |

## TeamArenaTeamAddMainLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamAddMainLayer` | TeamArenaTeamAddMainLayer | [0, 0] | [0, 0] | [630, 928] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddMainLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630.0, 928.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaTeamAddMainLayer/node_title` | CCNode | [315.0, 928.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddMainLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, -9] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaTeamAddMainLayer/node_title/lbl_title` | UILabelTTF | [0, -49] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「添加玩家」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaTeamAddMainLayer/menu_tab` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddMainLayer/menu_tab/btn_close` | UIMenuItemImage | [1207, 1852] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaTeamAddMainLayer/menu_tab/btn_request_list` | UIMenuItemTab | [319, 812] | [1, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-17.png` cf411808-6e90-4980-a5f3-f37df9b2a5eb pressed `ui/common/button_btn-tab-18.png` e779f392-0b39-4a1a-8065-05eaa6d72a7b · Label「申请列表」48 [255, 255, 255, 255] |
| `/TeamArenaTeamAddMainLayer/menu_tab/btn_invite_player` | UIMenuItemTab | [311, 812] | [0, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-21.png` cf720145-2705-49d5-8a2e-bd068cfc8ed2 pressed `ui/common/button_btn-tab-22.png` 25ba8a65-b054-468b-b706-6b0152747c53 · Label「邀请玩家」48 [255, 255, 255, 255] |
| `/TeamArenaTeamAddMainLayer/node_layer_parent` | CCNode | [315, 789] | [0.5, 1] | [568, 754] | [1, 1] | 0 | 是 |  |

## TeamArenaTeamAddReqCell（35）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamAddReqCell` | TeamArenaTeamAddReqCell | [0, 0] | [0, 0] | [554, 182] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [554.0, 182.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[6, 6, 8, 8] |
| `/TeamArenaTeamAddReqCell/node_role` | CCNode | [56, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_role/menu_head` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_role/menu_head/btn_head` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.6, 0.6] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaTeamAddReqCell/node_role/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaTeamAddReqCell/node_role/lbl_level` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamAddReqCell/CCNode_1` | CCNode | [102, 158] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/CCNode_1/lbl_name` | UILabelTTF | [0, 1] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddReqCell/CCNode_2` | CCNode | [180, 119] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [161, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr_power_bg.png` 252fd04e-288a-4209-8641-cb346cc55a61 |
| `/TeamArenaTeamAddReqCell/CCNode_2/lbl_power` | UILabelTTF | [10, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaTeamAddReqCell/CCScale9Sprite_2` | CCScale9Sprite | [277.0, 93.0] | [0.5, 0] | [500, 5] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_line-2.png` 98c523de-5894-459b-90d2-e2817377675e insets[0, 0, 10, 10] |
| `/TeamArenaTeamAddReqCell/node_hero` | CCNode | [23.727, 51.241] | [0, 0.5] | [505, 84] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_1` | CCNode | [41, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_1/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_1/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_2` | CCNode | [125, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_2/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_3` | CCNode | [210, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_3/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_3/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_4` | CCNode | [294, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_4/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_4/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_5` | CCNode | [379, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_5/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_5/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_6` | CCNode | [463, 0.0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_6/CCSprite_1` | CCSprite | [0.0, -2.0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/TeamArenaTeamAddReqCell/node_hero/node_pos_6/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/TeamArenaTeamAddReqCell/menu` | UIMenu | [554, 182] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqCell/menu/btn_refuse` | UIMenuItemLabel | [-190, -58] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「拒绝」44 [255, 255, 255, 255] |
| `/TeamArenaTeamAddReqCell/menu/btn_pass` | UIMenuItemLabel | [-80, -57] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「通过」44 [255, 255, 255, 255] |

## TeamArenaTeamAddReqLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamAddReqLayer` | TeamArenaTeamAddReqLayer | [0, 0] | [0, 0] | [568, 754] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_1` | CCNode | [284, 703] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [-218, 1] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「申请条件：」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddReqLayer/CCNode_1/spr_input_name_bg` | CCScale9Sprite | [42, 0] | [0.5, 0.5] | [420, 32] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/setting_spr-block-2.png` e3dc4c54-0198-414a-9405-be119c449086 insets[10, 10, 10, 10] |
| `/TeamArenaTeamAddReqLayer/CCNode_1/UIMenu_1` | UIMenu | [0, 1] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_1/UIMenu_1/btn_adjust` | UIMenuItemImage | [220, 0] | [0.5, 0.5] | [72, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/team-arena-lang/team-arena-lang_btn_tz.png` 5ccd58ee-8cb5-47e8-bade-7e0ffeb9747e |
| `/TeamArenaTeamAddReqLayer/CCNode_1/lbl_min_level` | UILabelTTF | [-87, -1] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「不限制」44 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaTeamAddReqLayer/CCNode_1/lbl_min_power` | UILabelTTF | [83, -1] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「不限制」44 FZCSJW--GB1-0.ttf rgb[205, 98, 41] |
| `/TeamArenaTeamAddReqLayer/CCNode_2` | CCNode | [284, 645] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「申请玩家」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddReqLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [-139, 0] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/TeamArenaTeamAddReqLayer/CCNode_2/CCScale9Sprite_2` | CCScale9Sprite | [139, 0] | [0.5, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/TeamArenaTeamAddReqLayer/CCNode_3` | CCNode | [284, 605] | [0.5, 1] | [562, 520] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_3/UIMenu_1` | UIMenu | [-281.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_3/UIMenu_1/btn_refresh` | UIMenuItemLabel | [281, -556] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「刷新」44 [255, 255, 255, 255] |
| `/TeamArenaTeamAddReqLayer/CCNode_3/spr_box` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [562.0, 520.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/TeamArenaTeamAddReqLayer/CCNode_3/node_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 520.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamAddReqLayer/CCNode_3/node_null/UILabelTTF_1` | UILabelTTF | [1.0, -302.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无队伍信息」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamAddReqLayer/CCNode_3/node_null/CCSprite_1` | CCSprite | [0.694, -227.097] | [0.5, 0.5] | [130, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-girl-1.png` 2a4f5520-2a76-437c-a185-da5781023b4f |
| `/TeamArenaTeamAddReqLayer/CCNode_3/node_not_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 520.0] | [1, 1] | 0 | 是 |  |

## TeamArenaTeamCell（41）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamCell` | TeamArenaTeamCell | [0, 0] | [0, 0] | [552, 152] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552.0, 152.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-13.png` 29b74f99-8782-456c-9a8e-a7d36677f074 insets[50, 20, 12, 12] |
| `/TeamArenaTeamCell/CCNode_1` | CCNode | [0, 152] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_1/spr_ribbon` | CCSprite | [79, -24] | [0.5, 0.5] | [160, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/promo/promotion_spr-ribbon-5.png` b2cf0379-c631-4741-a8d0-40c0d5ab112f |
| `/TeamArenaTeamCell/CCNode_1/lbl_name` | UILabelTTF | [13, -23] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 FZCSJW--GB1-0.ttf rgbNone |
| `/TeamArenaTeamCell/CCNode_2` | CCNode | [552, 152] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_2/CCSprite_1` | CCSprite | [-127, -25] | [0.5, 0.5] | [20, 18] | [1.3, 1.3] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TeamArenaTeamCell/CCNode_2/lbl_power` | UILabelTTF | [-105, -25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamCell/CCNode_3` | CCNode | [56, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_3/node_role_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_3/node_role_1/menu_role_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_3/node_role_1/menu_role_1/btn_head_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaTeamCell/CCNode_3/node_role_1/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaTeamCell/CCNode_3/node_role_1/lbl_level_1` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamCell/CCNode_3/node_not_role_1` | CCNode | [0, -7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_3/node_not_role_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaTeamCell/CCNode_3/node_not_role_1/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「待加入」36 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaTeamCell/CCNode_4` | CCNode | [141, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_4/node_role_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_4/node_role_2/menu_role_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_4/node_role_2/menu_role_2/btn_head_2` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaTeamCell/CCNode_4/node_role_2/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaTeamCell/CCNode_4/node_role_2/lbl_level_2` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamCell/CCNode_4/node_not_role_2` | CCNode | [0, -7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_4/node_not_role_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaTeamCell/CCNode_4/node_not_role_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「待加入」36 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaTeamCell/CCNode_5` | CCNode | [226, 62] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_5/node_role_3` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_5/node_role_3/menu_role_3` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_5/node_role_3/menu_role_3/btn_head_3` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [120, 120] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/head-icon_30.png` ef0f3b94-d67b-49b5-8210-e44e136cbbf6 |
| `/TeamArenaTeamCell/CCNode_5/node_role_3/CCSprite_1` | CCSprite | [-1, -35] | [0.5, 0.5] | [56, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/city/main-scene_spr-level-bg.png` 4b76cda2-1ea6-4cba-bf8c-252db800a6ef |
| `/TeamArenaTeamCell/CCNode_5/node_role_3/lbl_level_3` | UILabelTTF | [-1, -35] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamCell/CCNode_5/node_not_role_3` | CCNode | [0, -7] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_5/node_not_role_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [80, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/team-arena_spr-kong.png` 8b2d22fa-68a7-44d5-8e60-08b870243913 |
| `/TeamArenaTeamCell/CCNode_5/node_not_role_3/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「待加入」36 FZCSJW--GB1-0.ttf rgb[253, 232, 193] |
| `/TeamArenaTeamCell/CCNode_6` | CCNode | [275, 59] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/CCNode_6/lbl_req_level` | UILabelTTF | [0, 14] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamCell/CCNode_6/lbl_req_power` | UILabelTTF | [0, -14] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/TeamArenaTeamCell/menu` | UIMenu | [552, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamCell/menu/btn_request` | UIMenuItemLabel | [-79, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「-」44 [255, 255, 255, 255] |
| `/TeamArenaTeamCell/menu/btn_requested` | UIMenuItemLabel | [-79, 57] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「-」44 [255, 255, 255, 255] |

## TeamArenaTeamLayer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamLayer` | TeamArenaTeamLayer | [0, 0] | [0, 0] | [568, 754] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamLayer/CCNode_1` | CCNode | [284, 707] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamLayer/CCNode_1/spr_input_bg` | CCScale9Sprite | [-256.6, 0] | [0, 0.5] | [360, 52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/TeamArenaTeamLayer/CCNode_2` | CCNode | [284, 645] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [0, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「推荐队伍」48 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [-139, 0] | [0.5, 0.5] | [150, 16] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/TeamArenaTeamLayer/CCNode_2/CCScale9Sprite_2` | CCScale9Sprite | [139, 0] | [0.5, 0.5] | [150, 16] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_xian.png` 6b747918-0cb9-438f-bfc2-adc7cd5f619f insets[0, 0, 45, 6] |
| `/TeamArenaTeamLayer/UIMenu_1` | UIMenu | [0, 754] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamLayer/UIMenu_1/btn_find` | UIMenuItemLabel | [471.222, -45.139] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「查找」44 [255, 255, 255, 255] |
| `/TeamArenaTeamLayer/UIMenu_1/btn_create` | UIMenuItemLabel | [132, -706] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「创建队伍」44 [255, 255, 255, 255] |
| `/TeamArenaTeamLayer/UIMenu_1/btn_refresh` | UIMenuItemLabel | [436, -706] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「刷新」44 [255, 255, 255, 255] |
| `/TeamArenaTeamLayer/CCNode_3` | CCNode | [284, 615] | [0.5, 1] | [562, 530] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamLayer/CCNode_3/spr_box` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [562.0, 530.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-22.png` 9cd9728e-d557-464d-8cae-baabc075b675 insets[10, 10, 10, 10] |
| `/TeamArenaTeamLayer/CCNode_3/node_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562.0, 530.0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamLayer/CCNode_3/node_null/UILabelTTF_1` | UILabelTTF | [1.0, -312.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暂无队伍信息」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaTeamLayer/CCNode_3/node_null/CCSprite_1` | CCSprite | [0.694, -231.464] | [0.5, 0.5] | [130, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-girl-1.png` 2a4f5520-2a76-437c-a185-da5781023b4f |
| `/TeamArenaTeamLayer/CCNode_3/node_not_null` | CCNode | [0.0, 0.0] | [0.5, 1] | [562, 530] | [1, 1] | 0 | 是 |  |

## TeamArenaTeamMainLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaTeamMainLayer` | TeamArenaTeamMainLayer | [0, 0] | [0, 0] | [630, 928] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamMainLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630.0, 928.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaTeamMainLayer/node_title` | CCNode | [315.0, 928.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamMainLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, -9] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaTeamMainLayer/node_title/lbl_title` | UILabelTTF | [0, -49] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「组队大厅」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaTeamMainLayer/menu_tab` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaTeamMainLayer/menu_tab/btn_close` | UIMenuItemImage | [1207, 1852] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaTeamMainLayer/menu_tab/btn_team` | UIMenuItemTab | [259, 812] | [1, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-17.png` cf411808-6e90-4980-a5f3-f37df9b2a5eb pressed `ui/common/button_btn-tab-18.png` e779f392-0b39-4a1a-8065-05eaa6d72a7b · Label「组队」48 [255, 255, 255, 255] |
| `/TeamArenaTeamMainLayer/menu_tab/btn_recv_invite` | UIMenuItemTab | [382, 812] | [1, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-19.png` 66292d70-21aa-4d02-af3b-c6922303c5f8 pressed `ui/common/button_btn-tab-20.png` d79055c9-b417-4ace-af7a-e2cfa1bc6baa · Label「收到邀请」48 [255, 255, 255, 255] |
| `/TeamArenaTeamMainLayer/menu_tab/btn_my_team` | UIMenuItemTab | [373, 812] | [0, 0.5] | [134, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-21.png` cf720145-2705-49d5-8a2e-bd068cfc8ed2 pressed `ui/common/button_btn-tab-22.png` 25ba8a65-b054-468b-b706-6b0152747c53 · Label「我的队伍」48 [255, 255, 255, 255] |
| `/TeamArenaTeamMainLayer/node_layer_parent` | CCNode | [315, 789] | [0.5, 1] | [568, 754] | [1, 1] | 0 | 是 |  |

## TeamArenaVideoCell（38）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaVideoCell` | TeamArenaVideoCell | [0, 0] | [0, 0] | [540, 370] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 370] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-panel-bg.png` 82b6aaa4-0420-4e7b-a5e4-52e585f65f7d |
| `/TeamArenaVideoCell/node/CCScale9Sprite_2` | CCScale9Sprite | [20, 40] | [0.5, 0.5] | [150, 283] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/compare-share/compare-share_spr-bg.png` efbadf6e-4db8-45a3-8802-dbcb74f3da0f insets[5, 5, 5, 5] |
| `/TeamArenaVideoCell/node/CCScale9Sprite_3` | CCScale9Sprite | [370, 40] | [0.5, 0.5] | [150, 283] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/compare-share/compare-share_spr-bg.png` efbadf6e-4db8-45a3-8802-dbcb74f3da0f insets[5, 5, 5, 5] |
| `/TeamArenaVideoCell/node/CCNode_1` | CCNode | [48.96, 429.12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/CCNode_1/lbl_name1` | UILabelTTF | [-27.0, -83.4] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaVideoCell/node/CCNode_1/CCSprite_1` | CCSprite | [-29, -406.2] | [0, 0.5] | [20, 18] | [1, 0.9454] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TeamArenaVideoCell/node/CCNode_1/lbl_battle1` | UILabelTTF | [-1.2, -405.2] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」22 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaVideoCell/node/CCNode_1/team_result_1` | CCSprite | [118, -108] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/TeamArenaVideoCell/node/CCNode_2` | CCNode | [490, 429.12] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/CCNode_2/lbl_name2` | UILabelTTF | [25.6, -82.4] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「今日的不想活」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/TeamArenaVideoCell/node/CCNode_2/CCSprite_1` | CCSprite | [29.6, -406.2] | [1, 0.5] | [20, 18] | [1, 0.9454] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/TeamArenaVideoCell/node/CCNode_2/lbl_battle2` | UILabelTTF | [6, -405] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」22 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaVideoCell/node/CCNode_2/team_result_2` | CCSprite | [-120, -108] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/TeamArenaVideoCell/node/CCSprite_1` | CCSprite | [269, 271.8] | [0.5, 0.5] | [190, 125] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-lightning.png` a6f7a913-82b1-4281-9ad5-b459acff5b0f |
| `/TeamArenaVideoCell/node/CCSprite_2` | CCSprite | [270, 276.8] | [0.5, 0.5] | [78, 94] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/compare-share/compare-share_spr-vs.png` 3b2ad923-71d7-481f-bc12-1e30ee6638dd |
| `/TeamArenaVideoCell/node/lbl_time` | UILabelTTF | [270, 65.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaVideoCell/node/lbl_type` | UILabelTTF | [270, 182] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「自由切磋」20 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/TeamArenaVideoCell/node/btn_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/btn_menu/btn_playback` | UIMenuItemImage | [222, 128] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-playback.png` a0040334-118e-43b6-8ff5-3aa5014ff1c6 |
| `/TeamArenaVideoCell/node/btn_menu/btn_data` | UIMenuItemImage | [306, 128] | [0.5, 0.5] | [52, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/compare-share-lang_spr-btn-data.png` 931f7bb5-457c-4a32-8020-118f05150239 |
| `/TeamArenaVideoCell/node/node_list1_1` | CCNode | [129, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_2` | CCNode | [129, 215] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_3` | CCNode | [129, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_4` | CCNode | [129, 75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_5` | CCNode | [59, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_6` | CCNode | [59, 215] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_7` | CCNode | [59, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list1_8` | CCNode | [59, 75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_1` | CCNode | [410, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_2` | CCNode | [410, 215] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_3` | CCNode | [410, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_4` | CCNode | [410, 75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_5` | CCNode | [480, 285] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_6` | CCNode | [480, 215] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_7` | CCNode | [480, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoCell/node/node_list2_8` | CCNode | [480, 75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## TeamArenaVideoLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/TeamArenaVideoLayer` | TeamArenaVideoLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 23.5] | [0.5, 0.5] | [640, 913] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/TeamArenaVideoLayer/node_title` | CCNode | [320.0, 929.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/TeamArenaVideoLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「录像馆」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/TeamArenaVideoLayer/spr_bg` | CCScale9Sprite | [36.6, 80] | [0.5, 0.5] | [568, 688] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-4.png` 40b17191-9807-4ed6-b2ff-341e633aaddc insets[10, 10, 10, 10] |
| `/TeamArenaVideoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/TeamArenaVideoLayer/CCMenu_1/btn_close` | UIMenuItemImage | [575.68, 903.12] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/TeamArenaVideoLayer/lbl_b_namebg` | UILabelTTF | [592, 829] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」22 FZCSJW--GB1-0.ttf rgb[122, 71, 45] |
| `/TeamArenaVideoLayer/lbl_a_name` | UILabelTTF | [45, 796] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」22 FZCSJW--GB1-0.ttf rgb[122, 71, 45] |
| `/TeamArenaVideoLayer/lbl_score` | UILabelTTF | [320, 810] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「3:0」22 FZCSJW--GB1-0.ttf rgb[122, 71, 45] |
| `/TeamArenaVideoLayer/lbl_a_namebg` | UILabelTTF | [45, 829] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」22 FZCSJW--GB1-0.ttf rgb[122, 71, 45] |
| `/TeamArenaVideoLayer/lbl_b_name` | UILabelTTF | [592, 796] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英雄列表」22 FZCSJW--GB1-0.ttf rgb[122, 71, 45] |
