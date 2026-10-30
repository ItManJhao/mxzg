# P4-f 羁绊/进化/图腾/宠物/其它（上） Prefab 1:1 节点表

- 基线 main@74ab23d3（P1–P3 和 #214 已合入；uuid、border、trim 都取自这个 tree）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P4 合并顺序：P4A → P4B → P4C → P4D → P4E → P4F1 → P4F2

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| AbilityInfoLayer | `prefabs/ui/ability/AbilityInfoLayer.prefab` | 12 |
| ActiveFetterLayer | `prefabs/ui/active/ActiveFetterLayer.prefab` | 15 |
| AliceAssistHeroShareInfoLayer | `prefabs/ui/alice/AliceAssistHeroShareInfoLayer.prefab` | 34 |
| AliceChangeLineupCell | `prefabs/ui/alice/AliceChangeLineupCell.prefab` | 82 |
| AliceChangeLineupLayer | `prefabs/ui/alice/AliceChangeLineupLayer.prefab` | 193 |
| DragonPrivilegeLayer | `prefabs/ui/dragon/DragonPrivilegeLayer.prefab` | 14 |
| DragonRoomLevelUpLayer | `prefabs/ui/dragon/DragonRoomLevelUpLayer.prefab` | 21 |
| DragonSkillLayer | `prefabs/ui/dragon/DragonSkillLayer.prefab` | 20 |
| EvolutionAttrCell | `prefabs/ui/evolution/EvolutionAttrCell.prefab` | 6 |
| EvolutionInfoLayer | `prefabs/ui/evolution/EvolutionInfoLayer.prefab` | 25 |
| EvolutionLayer | `prefabs/ui/evolution/EvolutionLayer.prefab` | 39 |
| EvolutionSeat | `prefabs/ui/evolution/EvolutionSeat.prefab` | 7 |
| EvolutionSuccessLayer | `prefabs/ui/evolution/EvolutionSuccessLayer.prefab` | 13 |
| EvolutionTreeLayer | `prefabs/ui/evolution/EvolutionTreeLayer.prefab` | 30 |
| FetterDescLayer | `prefabs/ui/fetter/FetterDescLayer.prefab` | 5 |
| FetterMainViewLayer | `prefabs/ui/fetter/FetterMainViewLayer.prefab` | 40 |
| FetterPreviewLayer | `prefabs/ui/fetter/FetterPreviewLayer.prefab` | 14 |
| FetterTaskItem | `prefabs/ui/fetter/FetterTaskItem.prefab` | 7 |
| FetterUnlockLayer | `prefabs/ui/fetter/FetterUnlockLayer.prefab` | 13 |
| FetterVipInfo | `prefabs/ui/fetter/FetterVipInfo.prefab` | 10 |
| FetterVipInfoLayer | `prefabs/ui/fetter/FetterVipInfoLayer.prefab` | 5 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/common/god-equip_spr_bg.png` | [10, 10, 10, 10] |
| `ui/misc/fetters_spr-vip-bg.png` | [59, 19, 64, 70] |
| `ui/misc/fetters_spr-mainview-scrollview-bg.png` | [10, 17, 15, 15] |
| `ui/misc/fetters_spr-mainview-title.png` | [0, 0, 50, 49] |
| `ui/misc/fetters_spr-jdt-bg.png` | [0, 0, 10, 10] |

由更早的 P4 PR 改（本 PR 不碰）：

- `ui/hero/hero-select_k1.png` → P4A
- `ui/common/win-bg_cell-bg-11.png` → P4A
- `ui/misc/evolution_frame-1.png` → P4B

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-3.png` [19, 19, 19, 19]（edited by P2A）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/win-bg_win-bg-12.png` [20, 20, 15, 18]（edited by P1）
- `ui/hero/hero-info_spr-hero-image-3.png` [60, 20, 20, 20]（edited by P3A）
- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_block-bg-24.png` [12, 12, 12, 12]（edited by P2C）
- `ui/maps/map-bg-result-1.png` [150, 150, 10, 10]（edited by P3A）
- `ui/misc/dungeon_spr-reward-cell-bg.png` [10, 10, 0, 0]（edited by P3A）
- `ui/hero/hero-info_spr-new-8.png` [40, 40, 60, 60]（edited by P3B1）
- `ui/common/win-bg_block-bg-44.png` [5, 5, 7, 7]（edited by P3F）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14] | `AliceAssistHeroShareInfoLayer:/AliceAssistHeroShareInfoLayer/lbl_attr_bg` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9] | `FetterPreviewLayer:/FetterPreviewLayer/CCScale9Sprite_1` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `AliceAssistHeroShareInfoLayer:/AliceAssistHeroShareInfoLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `AliceChangeLineupLayer:/AliceChangeLineupLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DragonSkillLayer:/DragonSkillLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DragonSkillLayer:/DragonSkillLayer/spr_scroll_view_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `EvolutionLayer:/EvolutionLayer/node_bottom/CCScale9Sprite_2` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `EvolutionLayer:/EvolutionLayer/node_bottom/node_comsume/CCScale9Sprite_1` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `AbilityInfoLayer:/AbilityInfoLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `EvolutionInfoLayer:/EvolutionInfoLayer/spr_bg` |
| `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [19, 19, 19, 19] | `FetterDescLayer:/FetterDescLayer/CCScale9Sprite_1` |
| `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `EvolutionSuccessLayer:/EvolutionSuccessLayer/spr_bg` |
| `win-bg_cell-bg-11.png` | [59, 9, 9, 9] | [44, 9, 9, 9] | `EvolutionLayer:/EvolutionLayer/node_bottom/CCScale9Sprite_3` |
| `hero-info_spr-new-8.png` | [40, 40, 60, 60] | [0, 0, 40, 40] | `AliceAssistHeroShareInfoLayer:/AliceAssistHeroShareInfoLayer/CCScale9Sprite_1` |
| `hero-info_spr-new-8.png` | [40, 40, 60, 60] | [0, 0, 40, 40] | `AliceAssistHeroShareInfoLayer:/AliceAssistHeroShareInfoLayer/CCScale9Sprite_2` |
| `win-bg_block-bg-44.png` | [5, 5, 7, 7] | [9, 9, 9, 9] | `AliceChangeLineupCell:/AliceChangeLineupCell/node_pannel_2/CCScale9Sprite_1` |
| `win-bg_block-bg-44.png` | [5, 5, 7, 7] | [9, 9, 9, 9] | `AliceChangeLineupCell:/AliceChangeLineupCell/node_pannel_2/CCScale9Sprite_1` |
| `win-bg_block-bg-44.png` | [5, 5, 7, 7] | [9, 9, 9, 9] | `AliceChangeLineupCell:/AliceChangeLineupCell/node_pannel_2/CCScale9Sprite_1` |
| `win-bg_block-bg-44.png` | [5, 5, 7, 7] | [9, 9, 9, 9] | `AliceChangeLineupLayer:/AliceChangeLineupLayer/team_all_node/team_node_1/CCScale9Sprite_1` |
| `win-bg_block-bg-44.png` | [5, 5, 7, 7] | [9, 9, 9, 9] | `AliceChangeLineupLayer:/AliceChangeLineupLayer/team_all_node/team_node_2/CCScale9Sprite_1` |
| `win-bg_block-bg-44.png` | [5, 5, 7, 7] | [9, 9, 9, 9] | `AliceChangeLineupLayer:/AliceChangeLineupLayer/team_all_node/team_node_3/CCScale9Sprite_1` |

## AbilityInfoLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AbilityInfoLayer` | AbilityInfoLayer | [0, 0] | [0, 0] | [390, 372] | [1, 1] | 0 | 是 |  |
| `/AbilityInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390, 372] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/AbilityInfoLayer/node` | CCNode | [195.0, 369.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AbilityInfoLayer/node/spr_rare` | CCSprite | [0, -65] | [0.5, 0.5] | [380, 127] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-banner-equip-1.png` 9bb90892-a88f-487a-b59d-00a8ebd79fb8 |
| `/AbilityInfoLayer/node/lbl_name` | UILabelTTF | [-55, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「装备更换」48 STZhongsong.ttf rgbNone |
| `/AbilityInfoLayer/node/lbl_type` | UILabelTTF | [-55, -75] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「类型：武器」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/AbilityInfoLayer/node/lbl_score_text` | UILabelTTF | [-55, -104] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「评分：」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/AbilityInfoLayer/node/lbl_score` | UILabelTTF | [6, -104] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999990000」44 STZhongsong.ttf rgb[255, 229, 191] |
| `/AbilityInfoLayer/node/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AbilityInfoLayer/node/menu/btn_close` | UIMenuItemImage | [160, -20] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/AbilityInfoLayer/node/menu/btn_src` | UIMenuItemImage | [140, -169] | [0.5, 0.5] | [67, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-src.png` fc1ffb2a-2d0e-4fd2-89fe-779b304fa5f3 |
| `/AbilityInfoLayer/node/menu/btn_type` | UIMenuItemImage | [127, -233] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal **缺图** god-equip/spr-lxyl.png |

## ActiveFetterLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ActiveFetterLayer` | ActiveFetterLayer | [0, 0] | [0, 0] | [640, 595] | [1, 1] | 0 | 是 |  |
| `/ActiveFetterLayer/CCSprite_1` | CCSprite | [320, 268] | [0.5, 0.5] | [466, 156] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_magic-circle.png` c205c71b-1c0c-4f05-838e-9da5457c0205 |
| `/ActiveFetterLayer/_skillDescLabel` | UILabelTTF | [320, 179] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「对全部英雄属性提升」22 FZCSJW--GB1-0.ttf rgb[255, 157, 59] |
| `/ActiveFetterLayer/CCNode_1` | CCNode | [320, 137] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ActiveFetterLayer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c |
| `/ActiveFetterLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [-120, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「生命：」22 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/ActiveFetterLayer/CCNode_1/UILabelTTF_2` | UILabelTTF | [60, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/ActiveFetterLayer/CCNode_1/_hpNumLabel` | UILabelTTF | [-70, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」22 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/ActiveFetterLayer/CCNode_1/_atkNumLabel` | UILabelTTF | [110, 0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「9999」22 FZCSJW--GB1-0.ttf rgb[255, 228, 161] |
| `/ActiveFetterLayer/CCNode_2` | CCNode | [192, 60] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ActiveFetterLayer/CCNode_2/_skillIconSprite` | CCSprite | [0, 0] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_skill_200010001.png` d8ff7c62-5466-434e-931b-4d3ceaf46052 |
| `/ActiveFetterLayer/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [170, 162] | [0.88, 0.88] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-skill-border.png` 86c57ddd-1a44-47ec-9044-075ffddeba74 |
| `/ActiveFetterLayer/_skillDescSprite` | CCSprite | [397, 60] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** fetters/spr-skill-10101.png |
| `/ActiveFetterLayer/_heroPointer` | CCNode | [320, 286] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ActiveFetterLayer/_heroNamePointer` | CCNode | [320, 640] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## AliceAssistHeroShareInfoLayer（34）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AliceAssistHeroShareInfoLayer` | AliceAssistHeroShareInfoLayer | [0, 0] | [0, 0] | [550, 812] | [1, 1] | 0 | 是 |  |
| `/AliceAssistHeroShareInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 887] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/AliceAssistHeroShareInfoLayer/menu_hero` | CCMenu | [127.728, 783.568] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceAssistHeroShareInfoLayer/lbl_hero_name` | UILabelTTF | [214.728, 811.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「英 雄」25 STZhongsong.ttf rgb[201, 91, 25] |
| `/AliceAssistHeroShareInfoLayer/CCSprite_1` | CCSprite | [214.728, 778.568] | [0, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/AliceAssistHeroShareInfoLayer/lbl_bat` | UILabelTTF | [239.728, 780.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999999」18 STZhongsong.ttf rgb[122, 71, 45] |
| `/AliceAssistHeroShareInfoLayer/CCNode_1` | CCNode | [1.728, 200.568] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceAssistHeroShareInfoLayer/CCNode_1/sp_grade1` | CCSprite | [223, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/AliceAssistHeroShareInfoLayer/CCNode_1/sp_grade2` | CCSprite | [250, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/AliceAssistHeroShareInfoLayer/CCNode_1/sp_grade3` | CCSprite | [277, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/AliceAssistHeroShareInfoLayer/CCNode_1/sp_grade4` | CCSprite | [304, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/AliceAssistHeroShareInfoLayer/CCNode_1/sp_grade5` | CCSprite | [331, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/AliceAssistHeroShareInfoLayer/CCNode_1/sp_grade6` | CCSprite | [358, 550] | [0.5, 0.5] | [24, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-quality-1.png` f265622d-73a5-400d-8b11-8c492240fba7 |
| `/AliceAssistHeroShareInfoLayer/CCLayerColor_1` | CCLayerColor | [76.728, 710.568] | [0, 0] | [400, 1] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[140, 109, 88] a255 |
| `/AliceAssistHeroShareInfoLayer/CCSprite_2` | CCSprite | [73.728, 652.568] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-attr.png` 7c0303d5-d19b-4580-8eee-1340695c6ef2 |
| `/AliceAssistHeroShareInfoLayer/CCSprite_3` | CCSprite | [101.728, 670.568] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-2.png` 559fac4a-ef6c-4e94-ba19-eb5aae67ac05 |
| `/AliceAssistHeroShareInfoLayer/CCSprite_4` | CCSprite | [311.728, 670.568] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-3.png` 4eddb3c5-bdac-4b67-a618-9cbe75c9a9aa |
| `/AliceAssistHeroShareInfoLayer/CCSprite_5` | CCSprite | [101.728, 620.568] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-11.png` 3e9c096f-512b-4bdd-887d-c42d64a2cc02 |
| `/AliceAssistHeroShareInfoLayer/CCSprite_6` | CCSprite | [311.728, 620.568] | [0, 0.5] | [200, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-4.png` 13ff4181-e422-4d01-8b8b-a69de849e668 |
| `/AliceAssistHeroShareInfoLayer/UILabelTTF_1` | UILabelTTF | [151.728, 670.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「攻击：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/lbl_attack` | UILabelTTF | [206.728, 670.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/UILabelTTF_2` | UILabelTTF | [361.728, 670.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「血量：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/lbl_hp` | UILabelTTF | [416.728, 670.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/UILabelTTF_3` | UILabelTTF | [151.728, 620.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「防御：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/lbl_defense` | UILabelTTF | [206.728, 620.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「000000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/UILabelTTF_4` | UILabelTTF | [361.728, 620.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「速度：」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/lbl_speed` | UILabelTTF | [416.728, 620.568] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00000」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/AliceAssistHeroShareInfoLayer/CCSprite_7` | CCSprite | [74, 543.901] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-skill.png` 0c828495-6e62-4a94-bfc9-a96e8413b4bb |
| `/AliceAssistHeroShareInfoLayer/CCScale9Sprite_1` | CCScale9Sprite | [101, 504.901] | [0.5, 0.5] | [390, 80] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-new-8.png` 7ca842a7-aafa-4322-91bc-113a22564392 insets[0, 0, 40, 40] |
| `/AliceAssistHeroShareInfoLayer/CCSprite_8` | CCSprite | [74.561, 457.501] | [0.5, 0.5] | [34, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-share_spr-talent.png` 973fb594-6303-4567-9d0a-8f2c3f818ec6 |
| `/AliceAssistHeroShareInfoLayer/CCScale9Sprite_2` | CCScale9Sprite | [101, 412.501] | [0.5, 0.5] | [390, 80] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-new-8.png` 7ca842a7-aafa-4322-91bc-113a22564392 insets[0, 0, 40, 40] |
| `/AliceAssistHeroShareInfoLayer/menu_skill` | CCMenu | [1.728, 128.568] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceAssistHeroShareInfoLayer/lbl_attr_bg` | CCScale9Sprite | [45, 220] | [0, 0.5] | [460, 360] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[15, 15, 15, 15] |
| `/AliceAssistHeroShareInfoLayer/scroll_view` | UIScrollViewBackpack | [45, 45] | [0, 0] | [462, 350] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## AliceChangeLineupCell（82）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AliceChangeLineupCell` | AliceChangeLineupCell | [0, 0] | [0, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2` | CCNode | [273, 220] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[10, 10, 10, 10] |
| `/AliceChangeLineupCell/node_pannel_2/CCSprite_1` | CCSprite | [-217.854, 74.074] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_lbl-team-bg.png` 772f5080-f2b1-4787-a0a5-ffefa73c69df |
| `/AliceChangeLineupCell/node_pannel_2/CCSprite_1/lbl_team_name` | UILabelTTF | [-49.5, 2.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队伍三」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node` | CCNode | [0.0, 49.0] | [0.5, 0.5] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/spr_elem` | CCSprite | [-158.0, 26.0] | [0.5, 0.5] | [74, 74] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/spr_matrix` | CCSprite | [-133.0, 26.0] | [0.5, 0.5] | [72, 72] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-4.png` 05af46ae-6e75-48c4-aa44-bc816f28c336 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/CCSprite_1` | CCSprite | [-192.738, -19.0] | [0.5, 0.5] | [155, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_spr_atk_bg.png` 0f6ac4ce-7d30-418c-82f8-7169e7ffb06d |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/CCSprite_1/lbl_fitting_bg` | UILabelTTF | [-45.5, -0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1` | CCNode | [-82.167, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2` | CCNode | [-21.84, -0.833] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3` | CCNode | [38.22, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4` | CCNode | [98.28, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15` | CCNode | [158.34, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6` | CCNode | [218.4, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2` | CCNode | [273, 110] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[10, 10, 10, 10] |
| `/AliceChangeLineupCell/node_pannel_2/CCSprite_1` | CCSprite | [-217.854, 74.074] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_lbl-team-bg.png` 772f5080-f2b1-4787-a0a5-ffefa73c69df |
| `/AliceChangeLineupCell/node_pannel_2/CCSprite_1/lbl_team_name` | UILabelTTF | [-49.5, 2.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队伍三」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node` | CCNode | [0.0, 49.0] | [0.5, 0.5] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/spr_elem` | CCSprite | [-158.0, 26.0] | [0.5, 0.5] | [74, 74] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/spr_matrix` | CCSprite | [-133.0, 26.0] | [0.5, 0.5] | [72, 72] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-4.png` 05af46ae-6e75-48c4-aa44-bc816f28c336 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/CCSprite_1` | CCSprite | [-192.738, -19.0] | [0.5, 0.5] | [155, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_spr_atk_bg.png` 0f6ac4ce-7d30-418c-82f8-7169e7ffb06d |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/CCSprite_1/lbl_fitting_bg` | UILabelTTF | [-45.5, -0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1` | CCNode | [-82.167, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2` | CCNode | [-21.84, -0.833] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3` | CCNode | [38.22, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4` | CCNode | [98.28, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15` | CCNode | [158.34, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6` | CCNode | [218.4, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2` | CCNode | [273, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[10, 10, 10, 10] |
| `/AliceChangeLineupCell/node_pannel_2/CCSprite_1` | CCSprite | [-217.854, 74.074] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_lbl-team-bg.png` 772f5080-f2b1-4787-a0a5-ffefa73c69df |
| `/AliceChangeLineupCell/node_pannel_2/CCSprite_1/lbl_team_name` | UILabelTTF | [-49.5, 2.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队伍三」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node` | CCNode | [0.0, 49.0] | [0.5, 0.5] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/spr_elem` | CCSprite | [-158.0, 26.0] | [0.5, 0.5] | [74, 74] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/spr_matrix` | CCSprite | [-133.0, 26.0] | [0.5, 0.5] | [72, 72] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-4.png` 05af46ae-6e75-48c4-aa44-bc816f28c336 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/CCSprite_1` | CCSprite | [-192.738, -19.0] | [0.5, 0.5] | [155, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_spr_atk_bg.png` 0f6ac4ce-7d30-418c-82f8-7169e7ffb06d |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/CCSprite_1/lbl_fitting_bg` | UILabelTTF | [-45.5, -0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1` | CCNode | [-82.167, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2` | CCNode | [-21.84, -0.833] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3` | CCNode | [38.22, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4` | CCNode | [98.28, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15` | CCNode | [158.34, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_15/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6` | CCNode | [218.4, 0.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupCell/node_pannel_2/team_menu_node/hero_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |

## AliceChangeLineupLayer（193）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/AliceChangeLineupLayer` | AliceChangeLineupLayer | [0, 0] | [0, 0] | [640, 1034] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/spr_bg` | CCScale9Sprite | [-1, -8] | [0.5, 0.5] | [640.0, 1034.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/AliceChangeLineupLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_title` | CCNode | [320.0, 1016.325] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/AliceChangeLineupLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挂机队伍」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/AliceChangeLineupLayer/spr_bg_backpack` | CCScale9Sprite | [320, 575] | [0.5, 0] | [580, 368] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[60, 20, 20, 20] |
| `/AliceChangeLineupLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/UIMenu_1/btn_elem0` | UIMenuItemImage | [91, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/AliceChangeLineupLayer/UIMenu_1/btn_elem1` | UIMenuItemImage | [181, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/AliceChangeLineupLayer/UIMenu_1/btn_elem2` | UIMenuItemImage | [273, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/AliceChangeLineupLayer/UIMenu_1/btn_elem3` | UIMenuItemImage | [365, 905] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/AliceChangeLineupLayer/UIMenu_1/btn_elem4` | UIMenuItemImage | [455, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/AliceChangeLineupLayer/UIMenu_1/btn_elem5` | UIMenuItemImage | [541, 905] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/AliceChangeLineupLayer/spr_select` | CCSprite | [91, 905] | [0.5, 0.5] | [92, 92] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-btn-select.png` 19bbb579-f958-44fd-972b-3d609aa2ea59 |
| `/AliceChangeLineupLayer/UILabelTTF_1` | UILabelTTF | [320.056, 855] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「长按英雄可查看英雄信息」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/AliceChangeLineupLayer/scroll_view_backpack` | UIScrollViewBackpack | [320, 580] | [0.5, 0] | [580, 250] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/AliceChangeLineupLayer/node_pannel_2` | CCNode | [320, 145] | [0.5, 0] | [566, 380] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [566, 380] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_k1.png` 8a6d8446-56b7-454e-b956-ab10decce786 insets[15, 15, 0, 0] |
| `/AliceChangeLineupLayer/node_pannel_2/spr_battle_count_bg` | CCSprite | [80.0, 322] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/AliceChangeLineupLayer/node_pannel_2/lbl_battle_count` | CCLabelBMFont | [109.0, 322] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「90000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |
| `/AliceChangeLineupLayer/node_pannel_2/CCSprite_1` | CCSprite | [5.0, 330] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/AliceChangeLineupLayer/node_pannel_2/CCSprite_2` | CCSprite | [-243.0, 210] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/AliceChangeLineupLayer/node_pannel_2/CCSprite_2/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「前排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/AliceChangeLineupLayer/node_pannel_2/CCSprite_3` | CCSprite | [-243.0, 80] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-bg-1.png` fe7e58b0-c2aa-4ebd-97c9-ed282f5ff6f0 |
| `/AliceChangeLineupLayer/node_pannel_2/CCSprite_3/UILabelTTF_1` | UILabelTTF | [0.0, 0.0] | [0.5, 0.5] | [34, 74] | [1, 1] | 0 | 是 | cc.Label「后排」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_4` | CCNode | [-163.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_4/spr_lock_4` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_4/lbl_attr_add_4` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_3` | CCNode | [-63.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_3/spr_lock_3` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_3/lbl_attr_add_3` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_2` | CCNode | [37.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_2/spr_lock_2` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_2/lbl_attr_add_2` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_1` | CCNode | [137.0, 210] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_1/spr_lock_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_1/lbl_attr_add_1` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_8` | CCNode | [-163.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_8/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_8/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_8/spr_lock_8` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_8/lbl_attr_add_8` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_7` | CCNode | [-63.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_7/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_7/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_7/spr_lock_7` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_7/lbl_attr_add_7` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_6` | CCNode | [37.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_6/spr_lock_6` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_6/lbl_attr_add_6` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_5` | CCNode | [137.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_5/spr_lock_5` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-lock.png` ad327311-a45d-44fe-920c-6f7dbad664e2 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_5/lbl_attr_add_5` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「—」16 FZCSJW--GB1-0.ttf rgb[159, 108, 74] |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_9` | CCNode | [227.0, 80] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_9/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_9/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_9/spr_lock_9` | CCSprite | [0, 0] | [0.5, 0.5] | [68, 57] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_spr-lock-2.png` 97e415bf-e144-4df0-8d49-b468a017a677 |
| `/AliceChangeLineupLayer/node_pannel_2/node_icon_9/lbl_attr_add_9` | UILabelTTF | [0, -50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「助阵」36 FZCSJW--GB1-0.ttf rgb[255, 235, 195] |
| `/AliceChangeLineupLayer/node_pannel_2/menu_assist` | UIMenu | [227.0, 80] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/menu_assist/btn_assist_tip` | CCMenuItemImage | [0, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/AliceChangeLineupLayer/node_pannel_2/menu_assist/btn_assist_info` | UIMenuItemImage | [-30, 30] | [0.5, 0.5] | [32, 31] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_spr-question.png` 39aaa420-ddef-4151-9282-eed3d05fd142 |
| `/AliceChangeLineupLayer/node_pannel_2/CCMenu_1` | CCMenu | [-283.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_pannel_2/CCMenu_1/btn_halo` | UIMenuItemImage | [510, 320] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupLayer/node_pannel_2/CCMenu_1/btn_matrix` | UIMenuItemLabel | [510, 210] | [0.5, 0.5] | [72, 72] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select_spr-matrix-2-1.png` 6ec76674-bd9d-4362-a0a3-67e321bb0bb2 · Label「更换」36 [255, 225, 178, 255] |
| `/AliceChangeLineupLayer/node_pannel_2/CCMenu_1/btn_contract` | UIMenuItemImage | [120, 325] | [0.5, 0.5] | [176, 71] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select-lang_zxtj.png` ecfbb893-fb6a-476b-bdd8-f34f1572a465 |
| `/AliceChangeLineupLayer/node_pannel_2/CCMenu_1/btn_switch` | UIMenuItemLabel | [510, 405] | [0.5, 0.5] | [50, 46] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-switch-3.png` 7aece60b-2a5d-49f0-9e57-89ee49a7a95e · Label「切换」36 [255, 233, 186, 255] |
| `/AliceChangeLineupLayer/lbl_tip` | UILabelTTF | [320, 127] | [0.5, 0.5] | auto | [0.4, 0.4] | 0 | 是 | cc.Label「上阵等级提示」36 FZCSJW--GB1-0.ttf rgb[120, 65, 0] |
| `/AliceChangeLineupLayer/node_change_road` | CCNode | [320, -42] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/AliceChangeLineupLayer/node_change_road/spr_change_road_bg` | CCScale9Sprite | [0, 25] | [0.5, 0] | [200, 136] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/AliceChangeLineupLayer/node_change_road/menu_change_road` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_change_road/menu_change_road/btn_road_2` | UIMenuItemLabel | [0, 60] | [0.5, 0.5] | [197, 60] | [0.88, 0.88] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「中路」64 [255, 255, 255, 255] |
| `/AliceChangeLineupLayer/node_change_road/menu_change_road/btn_road_1` | UIMenuItemLabel | [0, 120] | [0.5, 0.5] | [197, 60] | [0.88, 0.88] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「左 路」64 [255, 255, 255, 255] |
| `/AliceChangeLineupLayer/UIMenu_2` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/UIMenu_2/btn_close` | UIMenuItemImage | [571.48, 1019] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/AliceChangeLineupLayer/UIMenu_2/btn_confirm` | UIMenuItemLabel | [320, 84] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「确定」50 [255, 225, 178, 255] |
| `/AliceChangeLineupLayer/UIMenu_2/btn_fetter` | UIMenuItemImage | [522, 84] | [0.5, 0.5] | [93, 93] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-add.png` c1f32621-90fc-4267-9bfb-ccf59884ccda |
| `/AliceChangeLineupLayer/node_dragon_skill` | CCNode | [118, 86] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_dragon_skill/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/node_dragon_skill/CCMenu_1/btn_dragon_skill` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [97, 97] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-select_spr-dragon-skill-bg.png` 9a45ceef-20dd-4bfc-aa0f-d39cb1458403 |
| `/AliceChangeLineupLayer/node_dragon_skill/spr_dragon_skill_1` | CCSprite | [0, 25] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/skill-icon_400050001.png` 21991565-3a07-4724-bc3c-2381a1db6adc |
| `/AliceChangeLineupLayer/node_dragon_skill/spr_dragon_skill_2` | CCSprite | [-25, 0] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/skill-icon_400110001.png` f4632d93-5a03-4459-97db-cddc5c9dadba |
| `/AliceChangeLineupLayer/node_dragon_skill/spr_dragon_skill_3` | CCSprite | [25, 0] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/skill-icon_400100001.png` 6afd90e1-eca3-405c-8895-7e3c37bdf3fc |
| `/AliceChangeLineupLayer/node_dragon_skill/spr_dragon_skill_4` | CCSprite | [0, -25] | [0.5, 0.5] | [64, 64] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/skill-icon_400150001.png` 45cd2120-30a4-4c6b-be42-12d28a24eb8f |
| `/AliceChangeLineupLayer/node_dragon_skill/lbl_adjust` | CCSprite | [0, -40] | [0.5, 0.5] | [76, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_lbl-reload.png` d4bb1e67-8ef2-4d48-a3b7-9e2d816a3deb |
| `/AliceChangeLineupLayer/team_title_menu` | CCMenu | [111.0, 541.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_title_menu/team_0` | UIMenuItemTab | [0, 0] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 |
| `/AliceChangeLineupLayer/team_title_menu/team_1` | UIMenuItemTab | [140, 0] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 |
| `/AliceChangeLineupLayer/team_title_menu/team_2` | UIMenuItemTab | [280, 0] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 |
| `/AliceChangeLineupLayer/team_title_menu/team_3` | UIMenuItemTab | [420, 0] | [0.5, 0.5] | [138, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-3.png` 49714ec3-3de4-4845-9b0a-a25015babaeb pressed `ui/common/button_btn-tab-4.png` 15c3d82e-7742-4c38-98c1-7005f9cf6511 |
| `/AliceChangeLineupLayer/team_all_node` | CCNode | [320.0, 145.0] | [0.5, 0] | [566, 380] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [566, 380] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-select_k1.png` 8a6d8446-56b7-454e-b956-ab10decce786 insets[15, 15, 0, 0] |
| `/AliceChangeLineupLayer/team_all_node/team_node_1` | CCNode | [0.0, 258.0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[10, 10, 10, 10] |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/CCSprite_1` | CCSprite | [-217.854, 74.074] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_lbl-team-bg.png` 772f5080-f2b1-4787-a0a5-ffefa73c69df |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/CCSprite_1/lbl_team_name` | UILabelTTF | [-49.5, 2.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队伍三」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1` | CCNode | [0.0, 0.0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/spr_elem_1` | CCSprite | [-158.0, 75] | [0.5, 0.5] | [74, 74] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/spr_matrix_1` | CCSprite | [-133.0, 75] | [0.5, 0.5] | [72, 72] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-4.png` 05af46ae-6e75-48c4-aa44-bc816f28c336 |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/CCSprite_1` | CCSprite | [-192.738, 30.0] | [0.5, 0.5] | [155, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_spr_atk_bg.png` 0f6ac4ce-7d30-418c-82f8-7169e7ffb06d |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/CCSprite_1/lbl_fitting_bg_1` | UILabelTTF | [-45.5, -0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_1` | CCNode | [-82.0, 49] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_2` | CCNode | [-21.84, 48.167] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_3` | CCNode | [38.22, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_4` | CCNode | [98.28, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_5` | CCNode | [158.34, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_6` | CCNode | [218.4, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_1/team_hero_node_1/hero_icon_1_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2` | CCNode | [0.0, 144.4] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[10, 10, 10, 10] |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/CCSprite_1` | CCSprite | [-217.854, 74.074] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_lbl-team-bg.png` 772f5080-f2b1-4787-a0a5-ffefa73c69df |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/CCSprite_1/lbl_team_name_2` | UILabelTTF | [-49.5, 2.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队伍三」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2` | CCNode | [0.0, 0.0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/spr_elem_2` | CCSprite | [-158.0, 75] | [0.5, 0.5] | [74, 74] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/spr_matrix_2` | CCSprite | [-133.0, 75] | [0.5, 0.5] | [72, 72] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-4.png` 05af46ae-6e75-48c4-aa44-bc816f28c336 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/CCSprite_1` | CCSprite | [-192.738, 30.0] | [0.5, 0.5] | [155, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_spr_atk_bg.png` 0f6ac4ce-7d30-418c-82f8-7169e7ffb06d |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/CCSprite_1/lbl_fitting_bg_2` | UILabelTTF | [-45.5, -0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_1` | CCNode | [-82.167, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_2` | CCNode | [-21.84, 48.167] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_3` | CCNode | [38.22, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_4` | CCNode | [98.28, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_5` | CCNode | [158.34, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_6` | CCNode | [218.4, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_2/team_menu_node_2/hero_icon_2_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3` | CCNode | [0.0, 30.4] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-44.png` dcb1a60c-b4c3-4400-b7b3-ab0cd8443ae5 insets[10, 10, 10, 10] |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/CCSprite_1` | CCSprite | [-217.854, 74.074] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_lbl-team-bg.png` 772f5080-f2b1-4787-a0a5-ffefa73c69df |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/CCSprite_1/lbl_team_name_3` | UILabelTTF | [-49.5, 2.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「队伍三」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3` | CCNode | [0.0, 0.0] | [0.5, 0] | [546, 98] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/spr_elem_3` | CCSprite | [-158.0, 75] | [0.5, 0.5] | [74, 74] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_elem-10000.png` f4731809-b8ba-476f-a2c3-a6d642179fea |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/spr_matrix_3` | CCSprite | [-133.0, 75] | [0.5, 0.5] | [72, 72] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select_spr-matrix-2-4.png` 05af46ae-6e75-48c4-aa44-bc816f28c336 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/CCSprite_1` | CCSprite | [-192.738, 30.0] | [0.5, 0.5] | [155, 31] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/alice/alice_spr_atk_bg.png` 0f6ac4ce-7d30-418c-82f8-7169e7ffb06d |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/CCSprite_1/lbl_fitting_bg_3` | UILabelTTF | [-45.5, -0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999999999」40 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_1` | CCNode | [-82.167, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_2` | CCNode | [-21.84, 48.167] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_2/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_3` | CCNode | [38.22, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_3/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_4` | CCNode | [98.28, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_4/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_4/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_5` | CCNode | [158.34, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_5/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_5/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_6` | CCNode | [218.4, 49.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_6/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/team_menu_node_3/hero_icon_3_6/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |
| `/AliceChangeLineupLayer/team_all_node/team_node_3/lbl_no_team_tips` | CCLabelTTF | [0.0, 49.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「Sample Text」20 CloudYuanCuGBK.ttf rgb[187, 120, 82] |
| `/AliceChangeLineupLayer/team_all_node/CCNode_1` | CCNode | [-283.0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/CCMenu_1` | CCMenu | [272.0, 250.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/AliceChangeLineupLayer/team_all_node/CCMenu_1/btn_change_team_1_2` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [36, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/alice/alice_change-team.png` 3022f08f-438b-4f93-bc8c-83b5f9a54833 |
| `/AliceChangeLineupLayer/team_all_node/CCMenu_1/btn_change_team_2_3` | UIMenuItemImage | [0, -115] | [0.5, 0.5] | [36, 41] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/alice/alice_change-team.png` 3022f08f-438b-4f93-bc8c-83b5f9a54833 |
| `/AliceChangeLineupLayer/hero_icon_0` | CCNode | [784.0, 438.0] | [0, 0] | [0, 0] | [0.75, 0.75] | 0 | 是 |  |
| `/AliceChangeLineupLayer/hero_icon_0/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [76, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-bg-2.png` 1b2eb3bf-49ac-416a-8f76-9141e8601eab |
| `/AliceChangeLineupLayer/hero_icon_0/CCSprite_2` | CCSprite | [1.333, 0] | [0.5, 0.5] | [74, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-icon_icon-frame-1.png` 61002b49-930f-474b-bbc1-aa24acedde39 |

## DragonPrivilegeLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DragonPrivilegeLayer` | DragonPrivilegeLayer | [0, 0] | [0, 0] | [560, 556] | [1, 1] | 0 | 是 |  |
| `/DragonPrivilegeLayer/CCSprite_1` | CCSprite | [280, 278] | [0.5, 0.5] | [560, 556] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-privilege-bg.png` 327e15d8-f7d1-45bf-a39f-2633b176272c |
| `/DragonPrivilegeLayer/CCSprite_2` | CCSprite | [280, 480] | [0.5, 0.5] | [201, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon-lang/dragon-lang_lbl-privilege.png` cdbac977-a628-4874-bb85-6ba49c6eaaa7 |
| `/DragonPrivilegeLayer/CCNode_1` | CCNode | [120, 395] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DragonPrivilegeLayer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0, 0.5] | [324, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_lbl-privilege-tip-bg.png` dbc807c6-5d18-488a-b8e6-043f1f6246d5 |
| `/DragonPrivilegeLayer/CCNode_1/CCSprite_2` | CCSprite | [40, 0] | [0, 0.5] | [290, 25] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon-lang/dragon-lang_lbl-privilege-tip-1.png` 45464b27-d695-43e1-810e-acc31d3f7054 |
| `/DragonPrivilegeLayer/CCNode_1/CCSprite_3` | CCSprite | [5, 0] | [0.5, 0.5] | [68, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-privilege-icon-1.png` 6f56ad42-a25e-466b-967c-0743577d4fba |
| `/DragonPrivilegeLayer/CCNode_2` | CCNode | [120, 295] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DragonPrivilegeLayer/CCNode_2/CCSprite_1` | CCSprite | [0, 0] | [0, 0.5] | [324, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_lbl-privilege-tip-bg.png` dbc807c6-5d18-488a-b8e6-043f1f6246d5 |
| `/DragonPrivilegeLayer/CCNode_2/CCSprite_2` | CCSprite | [40, 0] | [0, 0.5] | [253, 25] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon-lang/dragon-lang_lbl-privilege-tip-2.png` b15f2d01-6729-4d77-a337-4a3f3baf2f70 |
| `/DragonPrivilegeLayer/CCNode_2/CCSprite_3` | CCSprite | [5, 0] | [0.5, 0.5] | [68, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-privilege-icon-2.png` 8f91a299-cee8-46ce-b801-f43e7ba85c2e |
| `/DragonPrivilegeLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DragonPrivilegeLayer/CCMenu_1/btn_go` | UIMenuItemLabel | [280, 190] | [0.5, 0.5] | [195, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「前往激活」48 [255, 255, 255, 255] |
| `/DragonPrivilegeLayer/CCSprite_3` | CCSprite | [280, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |

## DragonRoomLevelUpLayer（21）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DragonRoomLevelUpLayer` | DragonRoomLevelUpLayer | [0, 0] | [0, 0] | [532, 450] | [1, 1] | 0 | 是 |  |
| `/DragonRoomLevelUpLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [532, 450] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/DragonRoomLevelUpLayer/node_title` | CCNode | [266.0, 450.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DragonRoomLevelUpLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DragonRoomLevelUpLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「鉴定处升级」56 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/DragonRoomLevelUpLayer/CCNode_1` | CCNode | [266, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DragonRoomLevelUpLayer/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [474, 161] | [1, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-pannel-bg-3.png` 164aac3a-0ddb-4b9d-9b7e-508fe1117943 |
| `/DragonRoomLevelUpLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [-90, 35] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「等级:」52 FZCSJW--GB1-0.ttf rgb[255, 230, 191] |
| `/DragonRoomLevelUpLayer/CCNode_1/lbl_level_pre` | UILabelTTF | [20, 35] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「7」52 FZCSJW--GB1-0.ttf rgb[79, 51, 28] |
| `/DragonRoomLevelUpLayer/CCNode_1/CCSprite_2` | CCSprite | [60, 35] | [0.5, 0.5] | [32, 30] | [1, 1] | 90 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-arrow.png` cce94b9e-c52d-4a55-b50d-59a384616916 |
| `/DragonRoomLevelUpLayer/CCNode_1/lbl_level_after` | UILabelTTF | [100, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「8」52 FZCSJW--GB1-0.ttf rgb[79, 51, 28] |
| `/DragonRoomLevelUpLayer/CCNode_1/UILabelTTF_2` | UILabelTTF | [-90, -25] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「鉴定速度:」52 FZCSJW--GB1-0.ttf rgb[255, 230, 191] |
| `/DragonRoomLevelUpLayer/CCNode_1/CCSprite_3` | CCSprite | [60, -25] | [0.5, 0.5] | [32, 30] | [1, 1] | 90 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_spr-arrow.png` cce94b9e-c52d-4a55-b50d-59a384616916 |
| `/DragonRoomLevelUpLayer/CCNode_1/lbl_speed_pre` | UILabelTTF | [20, -25] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「20点/秒」52 FZCSJW--GB1-0.ttf rgb[79, 51, 28] |
| `/DragonRoomLevelUpLayer/CCNode_1/lbl_speed_after` | UILabelTTF | [100, -25] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「30点/秒」52 FZCSJW--GB1-0.ttf rgb[79, 51, 28] |
| `/DragonRoomLevelUpLayer/lbl_recharge_tip` | UILabelTTF | [266, 210] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「需要累充300解锁」40 FZCSJW--GB1-0.ttf rgb[229, 45, 26] |
| `/DragonRoomLevelUpLayer/CCNode_2` | CCNode | [266, 135] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DragonRoomLevelUpLayer/CCNode_2/menu_need` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DragonRoomLevelUpLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DragonRoomLevelUpLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [266, 50] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「升 级」48 [255, 255, 255, 255] |
| `/DragonRoomLevelUpLayer/UIMenu_1/btn_close` | UIMenuItemImage | [482, 450] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## DragonSkillLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DragonSkillLayer` | DragonSkillLayer | [0, 0] | [0, 0] | [640, 780] | [1, 1] | 0 | 是 |  |
| `/DragonSkillLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [660, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DragonSkillLayer/node_title` | CCNode | [320.0, 780.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DragonSkillLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DragonSkillLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「调整技能顺序」48 FZCSJW--GB1-0.ttf rgb[255, 227, 183] |
| `/DragonSkillLayer/spr_scroll_view_bg` | CCScale9Sprite | [320, 415] | [0.5, 0] | [540, 290] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DragonSkillLayer/scroll_view` | UIScrollViewBackpack | [320, 420] | [0.5, 0] | [530, 280] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/DragonSkillLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DragonSkillLayer/UIMenu_1/btn_confirm` | UIMenuItemLabel | [320, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「保 存」48 [255, 255, 255, 255] |
| `/DragonSkillLayer/UIMenu_1/btn_close` | UIMenuItemImage | [580, 780] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DragonSkillLayer/node_pannel` | CCNode | [320, 105] | [0.5, 0] | [540, 270] | [1, 1] | 0 | 是 |  |
| `/DragonSkillLayer/node_pannel/spr_pannel_bg` | CCScale9Sprite | [0.0, 0] | [0.5, 0] | [540, 270] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/god-equip_spr_bg.png` b9923116-fc57-48a2-a60d-bad19208fca8 insets[10, 10, 10, 10] |
| `/DragonSkillLayer/node_pannel/spr_skill_bg_1` | CCSprite | [-90.0, 195] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-bg-2.png` 88b0f934-0430-40d8-a204-0fb789dee7a0 |
| `/DragonSkillLayer/node_pannel/CCLabelTTF_1` | CCLabelTTF | [-90.0, 140] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/DragonSkillLayer/node_pannel/spr_skill_bg_2` | CCSprite | [70.0, 195] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-bg-2.png` 88b0f934-0430-40d8-a204-0fb789dee7a0 |
| `/DragonSkillLayer/node_pannel/CCLabelTTF_2` | CCLabelTTF | [70.0, 140] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「2」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/DragonSkillLayer/node_pannel/spr_skill_bg_3` | CCSprite | [-90.0, 75] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-bg-2.png` 88b0f934-0430-40d8-a204-0fb789dee7a0 |
| `/DragonSkillLayer/node_pannel/CCLabelTTF_3` | CCLabelTTF | [-90.0, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「3」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/DragonSkillLayer/node_pannel/spr_skill_bg_4` | CCSprite | [70.0, 75] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_spr-skill-bg-2.png` 88b0f934-0430-40d8-a204-0fb789dee7a0 |
| `/DragonSkillLayer/node_pannel/CCLabelTTF_4` | CCLabelTTF | [70.0, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「4」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |

## EvolutionAttrCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EvolutionAttrCell` | VideoStudioCell | [0, 0] | [0, 0] | [330, 42] | [1, 1] | 0 | 是 |  |
| `/EvolutionAttrCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [330, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/EvolutionAttrCell/CCSprite_1` | CCSprite | [202, 20] | [0.5, 0.5] | [42, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_spr-new-12.png` 7c35a6a0-9144-41da-8620-f14cdfa0a19e |
| `/EvolutionAttrCell/lpl_attr_name` | UILabelTTF | [81.0, 21.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命：」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/EvolutionAttrCell/lpl_attr_pre_value` | UILabelTTF | [102.528, 21.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/EvolutionAttrCell/lpl_attr_cur_value` | UILabelTTF | [232.0, 21.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」44 CloudYuanCuGBK.ttf rgb[255, 228, 161] |

## EvolutionInfoLayer（25）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EvolutionInfoLayer` | EvolutionInfoLayer | [0, 0] | [0, 0] | [390, 530] | [1, 1] | 0 | 是 |  |
| `/EvolutionInfoLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [390.0, 530.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[15, 15, 15, 15] |
| `/EvolutionInfoLayer/CCSprite_1` | CCSprite | [64, 479] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_spr-icon-bx.png` 249f4624-8ba4-41e6-b019-5e3d7f597343 |
| `/EvolutionInfoLayer/lpl_hero_name` | UILabelTTF | [96.0, 482.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「圣光古龙」56 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/EvolutionInfoLayer/spr_line` | CCSprite | [195.0, 440.0] | [0.5, 0.5] | [380, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-line.png` c6234db7-ebbd-43bb-863f-6c99505dbdc3 |
| `/EvolutionInfoLayer/UILabelTTF_1` | UILabelTTF | [48.0, 418.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「简介」44 CloudYuanCuGBK.ttf rgb[255, 207, 134] |
| `/EvolutionInfoLayer/lpl_desc` | UILabelTTF | [27.0, 402.8] | [0, 1] | [648, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」40 CloudYuanCuGBK.ttf rgb[161, 129, 89] |
| `/EvolutionInfoLayer/UILabelTTF_2` | UILabelTTF | [48.0, 304.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性」44 CloudYuanCuGBK.ttf rgb[255, 207, 134] |
| `/EvolutionInfoLayer/lpl_evolution_name` | UILabelTTF | [78.0, 303.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「输出 远程」40 CloudYuanCuGBK.ttf rgb[161, 129, 89] |
| `/EvolutionInfoLayer/node_attr_1` | CCNode | [72, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionInfoLayer/node_attr_1/spr_attr_icon` | CCSprite | [-2.635, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionInfoLayer/node_attr_1/lbl_attr_value` | UILabelTTF | [-23.133, -36.687] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/EvolutionInfoLayer/node_att_2` | CCNode | [157, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionInfoLayer/node_att_2/spr_attr_icon` | CCSprite | [-2.635, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionInfoLayer/node_att_2/lbl_attr_value` | UILabelTTF | [-23.133, -36.687] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/EvolutionInfoLayer/node_attr_3` | CCNode | [241, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionInfoLayer/node_attr_3/spr_attr_icon` | CCSprite | [-2.635, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionInfoLayer/node_attr_3/lbl_attr_value` | UILabelTTF | [-23.133, -36.687] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/EvolutionInfoLayer/node_attr_4` | CCNode | [325, 252] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionInfoLayer/node_attr_4/spr_attr_icon` | CCSprite | [-2.635, -1.694] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionInfoLayer/node_attr_4/lbl_attr_value` | UILabelTTF | [-23.133, -36.687] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「9999」36 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/EvolutionInfoLayer/UILabelTTF_3` | UILabelTTF | [48.0, 167.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能」44 CloudYuanCuGBK.ttf rgb[255, 207, 134] |
| `/EvolutionInfoLayer/node_skill` | CCNode | [65.586, 96.933] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/EvolutionInfoLayer/lpl_skill_name` | UILabelTTF | [126.0, 125.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「高级技能」44 CloudYuanCuGBK.ttf rgb[239, 117, 42] |
| `/EvolutionInfoLayer/lpl_skill_desc` | UILabelTTF | [129.0, 109.0] | [0, 1] | [460, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」36 CloudYuanCuGBK.ttf rgb[161, 129, 89] |

## EvolutionLayer（39）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EvolutionLayer` | EvolutionLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 250] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/node_top/top_menu` | CCMenu | [575.0, -66.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/node_top/top_menu/btn_back` | UIMenuItemImage | [-5, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/EvolutionLayer/node_evolution` | CCNode | [320.0, 563.0] | [0.5, 0] | [640.0, 430] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/node_evolution/CCSprite_1` | CCSprite | [0.0, 301.0] | [0.5, 0.5] | [498, 461] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_spr-decoration.png` d2d1fcc4-381e-4d20-a050-abcc3db296b3 |
| `/EvolutionLayer/node_evolution/spr_left_line` | CCSprite | [-51.2, 47.0] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_no-select-line.png` 9303595f-129f-4d05-acf8-106eac3f0d9a |
| `/EvolutionLayer/node_evolution/spr_right_line` | CCSprite | [51.2, 46.0] | [0.5, 0.5] | [100, 100] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_no-select-line.png` 9303595f-129f-4d05-acf8-106eac3f0d9a |
| `/EvolutionLayer/node_bottom` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 600] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [320.0, 0.0] | [0.5, 0] | [615, 598] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/evolution_frame-1.png` ec9b3dbe-44ce-44b6-bf91-f0f57802b175 insets[100, 100, 50, 50] |
| `/EvolutionLayer/node_bottom/lpl_pre_skill_name` | UILabelTTF | [199.2, 505.2] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能原名称」44 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/lpl_next_skill_name` | UILabelTTF | [438.0, 505.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能新名称」44 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/CCScale9Sprite_2` | CCScale9Sprite | [320.0, 380.0] | [0.5, 0] | [540, 100] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/EvolutionLayer/node_bottom/CCScale9Sprite_3` | CCScale9Sprite | [320.0, 230.0] | [0.5, 0] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-11.png` 425ad17f-5214-4446-9b9a-719c74ba485b insets[45, 10, 10, 10] |
| `/EvolutionLayer/node_bottom/UILabelTTF_1` | UILabelTTF | [320.0, 428.0] | [0.5, 0.5] | [940, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」36 Helvetica rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/UILabelTTF_2` | UILabelTTF | [119.0, 349.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性加成」44 Helvetica rgb[253, 232, 193] |
| `/EvolutionLayer/node_bottom/node_attr_addition_1` | CCNode | [139.0, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionLayer/node_bottom/node_attr_addition_1/spr_attr_icon` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionLayer/node_bottom/node_attr_addition_1/lbl_attr_name` | UILabelTTF | [16, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击」40 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/node_attr_addition_1/lbl_attr_value` | UILabelTTF | [57.8, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+12.3%」40 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/EvolutionLayer/node_bottom/node_attr_addition_2` | CCNode | [139.0, 258] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionLayer/node_bottom/node_attr_addition_2/spr_attr_icon` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionLayer/node_bottom/node_attr_addition_2/lbl_attr_name` | UILabelTTF | [16, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击」40 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/node_attr_addition_2/lbl_attr_value` | UILabelTTF | [57.8, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+12.3%」40 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/EvolutionLayer/node_bottom/node_attr_addition_3` | CCNode | [399.0, 300] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionLayer/node_bottom/node_attr_addition_3/spr_attr_icon` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionLayer/node_bottom/node_attr_addition_3/lbl_attr_name` | UILabelTTF | [16, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击」40 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/node_attr_addition_3/lbl_attr_value` | UILabelTTF | [57.8, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+12.3%」40 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/EvolutionLayer/node_bottom/node_attr_addition_4` | CCNode | [399.0, 258] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/EvolutionLayer/node_bottom/node_attr_addition_4/spr_attr_icon` | CCSprite | [-3.6, 1.2] | [0.5, 0.5] | [46, 46] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack-info_spr-attr-220.png` deae56dd-dfd2-479a-a0e9-d89b0cc41a14 |
| `/EvolutionLayer/node_bottom/node_attr_addition_4/lbl_attr_name` | UILabelTTF | [16, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击」40 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/node_bottom/node_attr_addition_4/lbl_attr_value` | UILabelTTF | [57.8, 0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「+12.3%」40 CloudYuanCuGBK.ttf rgb[32, 166, 0] |
| `/EvolutionLayer/node_bottom/node_comsume` | CCNode | [320.0, 100.2] | [0.5, 0] | [540, 120] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/node_bottom/node_comsume/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [540, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/EvolutionLayer/node_bottom/node_comsume/lbl_attr_name` | UILabelTTF | [-252.0, 59] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「进化消耗：」44 CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/EvolutionLayer/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/EvolutionLayer/CCMenu_1/btn_evolve` | UIMenuItemLabel | [320, 60] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「进 化」48 [255, 255, 255, 255] |
| `/EvolutionLayer/CCMenu_1/btn_evolution_tree` | UIMenuItemLabel | [548.938, 61.342] | [0.5, 0.5] | [60, 63] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/evolution_btn-evolition.png` df7202c9-a368-4b9e-bd58-1cfe28cef48a · Label「进化树」32 [255, 255, 255, 255] |
| `/EvolutionLayer/node_skill` | CCNode | [320.0, 545.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## EvolutionSeat（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EvolutionSeat` | STMagicTowerSeat | [0, 0] | [0, 0] | [248, 280] | [1, 1] | 0 | 是 |  |
| `/EvolutionSeat/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [248.0, 280.0] | [1, 1] | 0 | 是 |  |
| `/EvolutionSeat/UIMenu_1/btn_base` | UIMenuItemImage | [124.0, 7.0] | [0.5, 0] | [0, 0] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal **缺图** evolution/no-selet-stage.png |
| `/EvolutionSeat/node_root` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/EvolutionSeat/node_root/node_animator` | CCNode | [124, 94] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/EvolutionSeat/node_root/CCSprite_1` | CCSprite | [124, 39] | [0.5, 0.5] | [123, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_frame-type.png` 5340449d-8d32-470e-b0ac-2a8480ae508c |
| `/EvolutionSeat/node_root/lbl_name` | UILabelTTF | [134, 39] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」44 STZhongsong.ttf rgb[255, 231, 195] |

## EvolutionSuccessLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EvolutionSuccessLayer` | EvolutionSuccessLayer | [0, 0] | [0, 0] | [640, 610] | [1, 1] | 0 | 是 |  |
| `/EvolutionSuccessLayer/CCSprite_1` | CCSprite | [320, 322] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE **缺图** 1.png |
| `/EvolutionSuccessLayer/spr_bg` | CCScale9Sprite | [0, 32] | [0.5, 0.5] | [640, 540] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 insets[130, 130, 0, 0] |
| `/EvolutionSuccessLayer/spr_wing` | CCSprite | [309, 563] | [0.5, 0.5] | [322, 76] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_word-evolution-success.png` b05d7d05-fcb3-4740-a9d9-5643b9d2dfe1 |
| `/EvolutionSuccessLayer/lbl_hero_name` | UILabelTTF | [129.0, 416.56] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」48 CloudYuanCuGBK.ttf rgb[255, 229, 191] |
| `/EvolutionSuccessLayer/node_attr` | CCNode | [290, 447] | [0, 0] | [330, 42] | [1, 1] | 0 | 是 |  |
| `/EvolutionSuccessLayer/UILabelTTF_1` | UILabelTTF | [453.0, 233.356] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「获得新技能」48 CloudYuanCuGBK.ttf rgb[255, 228, 161] |
| `/EvolutionSuccessLayer/lpl_skill_name` | UILabelTTF | [447.0, 199.581] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「技能名称」44 CloudYuanCuGBK.ttf rgb[239, 117, 42] |
| `/EvolutionSuccessLayer/lpl_skill_desc` | UILabelTTF | [375.0, 162.735] | [0, 1] | [438, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」36 CloudYuanCuGBK.ttf rgb[161, 129, 89] |
| `/EvolutionSuccessLayer/node_skill` | CCNode | [325.0, 113.194] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/EvolutionSuccessLayer/CCSprite_2` | CCSprite | [151.695, 175.306] | [0.5, 0.5] | [466, 156] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_magic-circle.png` c205c71b-1c0c-4f05-838e-9da5457c0205 |
| `/EvolutionSuccessLayer/node_hero` | CCNode | [151.389, 186.111] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/EvolutionSuccessLayer/CCSprite_3` | CCSprite | [98.028, 406.778] | [0.5, 0.5] | [50, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution-lang_spr-icon-bx.png` 249f4624-8ba4-41e6-b019-5e3d7f597343 |

## EvolutionTreeLayer（30）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/EvolutionTreeLayer` | EvolutionTreeLayer | [0, 0] | [0, 0] | [450, 530] | [1, 1] | 0 | 是 |  |
| `/EvolutionTreeLayer/CCSprite_1` | CCSprite | [225.0, 265.0] | [0.5, 0.5] | [448, 628] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_evolution-bg.png` 1eddd7a2-a263-4872-b620-c9de2d2422b1 |
| `/EvolutionTreeLayer/CCSprite_2` | CCSprite | [277, 338] | [0.5, 0.5] | [115, 89] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-1.png` 19b35b35-dbc7-4ff6-95f3-a9050bc0524d |
| `/EvolutionTreeLayer/CCSprite_3` | CCSprite | [169, 339] | [0.5, 0.5] | [115, 89] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-1.png` 19b35b35-dbc7-4ff6-95f3-a9050bc0524d |
| `/EvolutionTreeLayer/CCSprite_4` | CCSprite | [114, 181] | [0.5, 0.5] | [6, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-2.png` d931404d-1bf4-441a-b7cb-4ff479dad09a |
| `/EvolutionTreeLayer/CCSprite_5` | CCSprite | [332, 181] | [0.5, 0.5] | [6, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/evolution_line-2.png` d931404d-1bf4-441a-b7cb-4ff479dad09a |
| `/EvolutionTreeLayer/node_top` | CCNode | [225, 413] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/EvolutionTreeLayer/node_top/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/EvolutionTreeLayer/node_top/spr_hero_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/EvolutionTreeLayer/node_top/spr_glow` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/EvolutionTreeLayer/node_1_1` | CCNode | [117, 258.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/EvolutionTreeLayer/node_1_1/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/EvolutionTreeLayer/node_1_1/spr_hero_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/EvolutionTreeLayer/node_1_1/spr_glow` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/EvolutionTreeLayer/node_1_1/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/EvolutionTreeLayer/node_1_2` | CCNode | [117, 103] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/EvolutionTreeLayer/node_1_2/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/EvolutionTreeLayer/node_1_2/spr_hero_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/EvolutionTreeLayer/node_1_2/spr_glow` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/EvolutionTreeLayer/node_1_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/EvolutionTreeLayer/node_2_2` | CCNode | [334, 103] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/EvolutionTreeLayer/node_2_2/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/EvolutionTreeLayer/node_2_2/spr_hero_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/EvolutionTreeLayer/node_2_2/spr_glow` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/EvolutionTreeLayer/node_2_2/CCSprite_2` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |
| `/EvolutionTreeLayer/node_2_1` | CCNode | [334, 258] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | 是 |  |
| `/EvolutionTreeLayer/node_2_1/CCSprite_1` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [106, 106] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_rare-0.png` 5e56f13c-937b-4e86-a0d7-b8abb2aa05fb |
| `/EvolutionTreeLayer/node_2_1/spr_hero_icon` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-icon_20103003.png` c50fc1ad-a7a2-483c-9017-5615a30dba6b |
| `/EvolutionTreeLayer/node_2_1/spr_glow` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [130, 130] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_select-glow.png` 12b9ba6c-0223-4439-89e3-48be229e7d5d |
| `/EvolutionTreeLayer/node_2_1/spr_question` | CCSprite | [0.0, 0.0] | [0.5, 0.5] | [56, 74] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/misc/evolution_spr-question.png` 80b480e0-cae1-4c93-9ade-31380fdb09c2 |

## FetterDescLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterDescLayer` | FetterDescLayer | [0, 0] | [0, 0] | [450, 200] | [1, 1] | 0 | 是 |  |
| `/FetterDescLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [450, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-24.png` 30f0b02c-bd19-4596-90db-f94739baf91b insets[20, 20, 20, 20] |
| `/FetterDescLayer/_skillNameLabel` | CCLabelTTF | [69, 163] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名称」22 STZhongsong.ttf rgb[231, 117, 42] |
| `/FetterDescLayer/CCScale9Sprite_2` | CCScale9Sprite | [0, 135] | [0.5, 0.5] | [450, 4] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line.png` c0c5afb1-919b-4604-84c7-99faa5c3f2c7 |
| `/FetterDescLayer/_skillDescLabel` | CCLabelTTF | [224, 70] | [0.5, 0.5] | [400, 120] | [1, 1] | 0 | 是 | cc.Label「技能描述」20 Helvetica rgb[255, 230, 191] |

## FetterMainViewLayer（40）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterMainViewLayer` | FetterMainViewLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 960] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-fetters-mainview-1.jpg` 9bc420be-f571-46b9-b6ce-827abd0b577f |
| `/FetterMainViewLayer/node_spine` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node` | CCNode | [320.0, 480.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node/spr_bg1` | CCScale9Sprite | [0, 140] | [0.5, 0.5] | [490, 640] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/misc/fetters_spr-vip-bg.png` 72cfe4bb-4ea9-4a77-b716-bd59351df6d5 insets[60, 20, 64, 70] |
| `/FetterMainViewLayer/node/CCScale9Sprite_1` | CCScale9Sprite | [-313.114, -514.253] | [0.5, 0.5] | [626, 350] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-mainview-scrollview-bg.png` 41d25a8e-499a-4a03-9f15-0ff5e1f63b95 insets[20, 20, 20, 20] |
| `/FetterMainViewLayer/node/CCSprite_1` | CCSprite | [0, -150] | [0.5, 0.5] | [320, 92] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-vip-bg0.png` 30edd14c-f315-4591-9988-7a7a669a4974 |
| `/FetterMainViewLayer/node/CCSprite_2` | CCSprite | [0, -9] | [0.5, 0.5] | [531, 163] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-skill-desc-bg.png` ad4c7812-7df2-4a6c-bf98-ad86279fc0e7 |
| `/FetterMainViewLayer/node/spr_skill_icon` | CCSprite | [-218.2, -12.4] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_skill_200010001.png` d8ff7c62-5466-434e-931b-4d3ceaf46052 |
| `/FetterMainViewLayer/node/CCSprite_3` | CCSprite | [-218.2, -17.36] | [0.5, 0.5] | [170, 162] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-skill-border.png` 86c57ddd-1a44-47ec-9044-075ffddeba74 |
| `/FetterMainViewLayer/node/spr_skill_desc` | CCSprite | [37.2, -4.8] | [0.5, 0.5] | [241, 113] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-skill-10101.png` f59cc935-f25f-4447-8984-18ed6b9e73b6 |
| `/FetterMainViewLayer/node/scroll_view` | CCScrollView | [-277.92, -484.9] | [0, 0] | [560, 245] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/FetterMainViewLayer/node/spr_tips` | CCScale9Sprite | [0, -90.72] | [0.5, 0.5] | [300, 62] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/misc/fetters_spr-mainview-title.png` cc2cee7a-9639-44a5-9c8f-76464ea797a2 insets[0, 0, 50, 50] |
| `/FetterMainViewLayer/node/CCSprite_4` | CCSprite | [-25, -172.811] | [0.5, 0.5] | [56, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_VIP.png` 22566cae-b050-4c89-b94e-3df3d1c1812a |
| `/FetterMainViewLayer/node/level_num_task_1` | CCSprite | [8, -172.8] | [0, 0.5] | [18, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_1.png` 96a892b1-4d2b-4e34-99fe-c28d29acfbd4 |
| `/FetterMainViewLayer/node/level_num_task_2` | CCSprite | [30, -172.8] | [0, 0.5] | [18, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_1.png` 96a892b1-4d2b-4e34-99fe-c28d29acfbd4 |
| `/FetterMainViewLayer/node/scroll_view1` | CCScrollView | [-239, -176] | [0, 0] | [478, 555] | [1, 1] | 0 | **否** | cc.ScrollView+cc.Mask VERTICAL |
| `/FetterMainViewLayer/node/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node/menu/btn_info` | UIMenuItemLabel | [228.6, 496.3] | [0.5, 0.5] | [149, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-info_btn-wear-1.png` 4b3c7910-1335-468a-97ad-626280579c6d · Label「」24 [255, 255, 255, 255] |
| `/FetterMainViewLayer/node/menu/btn_view` | UIMenuItemLabel | [248.48, -96.34] | [0.5, 0.5] | [78, 42] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/misc/fetters_spr-role-view-tille.png` 0987f91d-bef1-4c1b-ad08-20b6fd60f8c6 · Label「」24 [255, 255, 255, 255] |
| `/FetterMainViewLayer/node/menu/btn_left` | UIMenuItemLabel | [-272.3, 152] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e · Label「」24 [255, 255, 255, 255] |
| `/FetterMainViewLayer/node/menu/btn_right` | UIMenuItemLabel | [272, 152] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 · Label「」24 [255, 255, 255, 255] |
| `/FetterMainViewLayer/node/menu/btn_vipinfo` | UIMenuItemLabel | [-220.2, 383] | [0.5, 0.5] | [126, 44] | [0.8, 0.8] | 0 | **否** | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-mainview-vip.png` a0173f92-a713-469e-ba6f-9f0349a15e6d · Label「」24 [255, 255, 255, 255] |
| `/FetterMainViewLayer/node/menu/btn_vip_info` | UIMenuItemLabel | [248, -91.7] | [0.5, 0.5] | [113, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters-lang_btn-vip-info.png` 28268590-fdeb-4d89-9893-5b02ed60ccde · Label「」24 [255, 255, 255, 255] |
| `/FetterMainViewLayer/node/skill` | CCNode | [-249.1, -83.8] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node/vip_get` | CCNode | [-220, 455] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node/CCNode_1` | CCNode | [0, -10] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node/CCNode_1/spr_title` | CCSprite | [4, 458.1] | [0.5, 0.5] | [280, 154] | [1.1, 1.1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-mainview-viptitle.png` ba3dff9f-b169-4938-b404-0e1b19c453b2 |
| `/FetterMainViewLayer/node/CCNode_1/spr_vip_content` | CCSprite | [0, 442] | [0.5, 0.5] | [320, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_vip1.png` 1a0f2c0a-2c43-478a-a47f-48b8a981862e |
| `/FetterMainViewLayer/node/CCNode_1/CCSprite_1` | CCSprite | [-45, 478.3] | [0.5, 0.5] | [56, 26] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_VIP.png` 22566cae-b050-4c89-b94e-3df3d1c1812a |
| `/FetterMainViewLayer/node/CCNode_1/level_num_1` | CCSprite | [-20, 478.3] | [0, 0.5] | [18, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_1.png` 96a892b1-4d2b-4e34-99fe-c28d29acfbd4 |
| `/FetterMainViewLayer/node/CCNode_1/lbl_level` | UILabelTTF | [0, 515] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「下一级」54 STZhongsong.ttf rgb[254, 255, 255] |
| `/FetterMainViewLayer/node/CCNode_1/level_num_2` | CCSprite | [-5, 478.3] | [0, 0.5] | [18, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_1.png` 96a892b1-4d2b-4e34-99fe-c28d29acfbd4 |
| `/FetterMainViewLayer/node/CCNode_1/CCSprite_2` | CCSprite | [14, 478.3] | [0, 0.5] | [52, 29] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-unlock.png` 25f96b80-f10b-4675-b487-72a12f891d54 |
| `/FetterMainViewLayer/node/lbl_vip` | UILabelTTF | [239.352, -218] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FetterMainViewLayer/node/spr_progress_bg` | CCScale9Sprite | [0, -217.7] | [0.5, 0.5] | [360, 18] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-jdt-bg.png` 01dfa008-a853-41dd-a9d0-c87b079089e1 insets[0, 0, 10, 10] |
| `/FetterMainViewLayer/node/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterMainViewLayer/node/CCMenu_1/btn_left` | UIMenuItemImage | [-274.659, 135] | [0.5, 0.5] | [106, 129] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/FetterMainViewLayer/node/CCMenu_1/btn_right` | UIMenuItemImage | [269.936, 135] | [0.5, 0.5] | [106, 129] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d |
| `/FetterMainViewLayer/node/lbl_progress` | UILabelTTF | [-233.429, -218] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「进度」22 STZhongsong.ttf rgb[254, 255, 255] |

## FetterPreviewLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterPreviewLayer` | FetterPreviewLayer | [0, 0] | [0, 0] | [545, 650] | [1, 1] | 0 | 是 |  |
| `/FetterPreviewLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [545, 650] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[10, 10, 10, 10] |
| `/FetterPreviewLayer/CCSprite_1` | CCSprite | [272.5, 408.96] | [0.5, 0.5] | [540, 474] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-role-view-bg.png` a5e2f0a6-34e3-4769-8565-4df8568761c2 |
| `/FetterPreviewLayer/node_spine` | CCNode | [273, 275] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterPreviewLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterPreviewLayer/CCMenu_1/btn_close` | UIMenuItemImage | [495, 621] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FetterPreviewLayer/CCMenu_1/btn_left` | UIMenuItemLabel | [58.96, 338] | [0.5, 0.5] | [106, 129] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d · Label「」24 [255, 255, 255, 255] |
| `/FetterPreviewLayer/CCMenu_1/btn_right` | UIMenuItemLabel | [485, 338] | [0.5, 0.5] | [106, 129] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-arrow.png` 205e4e5d-dbb7-4c2d-ae4d-6144f2b86c3d · Label「」24 [255, 255, 255, 255] |
| `/FetterPreviewLayer/spr_title` | CCScale9Sprite | [272.5, 578.88] | [0.5, 0.5] | [300, 62] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-mainview-title.png` cc2cee7a-9639-44a5-9c8f-76464ea797a2 insets[0, 0, 50, 50] |
| `/FetterPreviewLayer/lbl_name` | UILabelTTF | [181.44, 170] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「技能名称」30 STZhongsong.ttf rgb[139, 71, 20] |
| `/FetterPreviewLayer/lbl_info` | UILabelTTF | [181.44, 140] | [0, 1] | [340, 150] | [1, 1] | 0 | 是 | cc.Label「技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称技能名称」22 STZhongsong.ttf rgb[139, 71, 20] |
| `/FetterPreviewLayer/lbl_unlock` | UILabelTTF | [170, 118] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「突破3级解锁羁绊形象」25 STZhongsong.ttf rgb[254, 255, 255] |
| `/FetterPreviewLayer/spr_unlock` | CCSprite | [146, 118] | [0.5, 0.5] | [34, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-unlockitem-lock.png` 1f586243-dddd-43a2-91a0-1f6e28e66286 |
| `/FetterPreviewLayer/spr_icon` | CCSprite | [115, 148] | [0.5, 0.5] | [78, 78] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/skill-icon_210010001.png` 1d452993-8008-4647-a19a-b0d4e44ca064 |

## FetterTaskItem（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterTaskItem` | FetterTaskItem | [0, 0] | [0, 0] | [266, 116] | [1, 1] | 0 | 是 |  |
| `/FetterTaskItem/CCSprite_1` | CCSprite | [0, 0] | [0, 0] | [266, 116] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_task-bg.png` 73538d9f-2d9c-4032-b035-c10fa4bdf421 |
| `/FetterTaskItem/item_node` | CCNode | [60, 46] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterTaskItem/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterTaskItem/menu/btn_submit` | UIMenuItemImage | [198, 45] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 |
| `/FetterTaskItem/menu/btn_goto` | UIMenuItemImage | [198, 45] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd |
| `/FetterTaskItem/spr_clear` | CCSprite | [199, 56] | [0.5, 0.5] | [78, 74] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-mainview-clear.png` 0f7d1572-23f8-4b81-b7df-4cb9132986c4 |

## FetterUnlockLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterUnlockLayer` | FetterUnlockLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 960] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-fetters-unlock-1.jpg` 079e285c-d1f2-4b76-b8ab-010f6a242ed8 |
| `/FetterUnlockLayer/menu_back` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/menu_back/btn_back` | UIMenuItemImage | [570, 779] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/FetterUnlockLayer/CCNode_1` | CCNode | [320.0, 480.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/CCNode_1/spr_info` | CCSprite | [0, -280] | [0.5, 0.5] | [476, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-unlock-tips.png` f6a7659e-fffa-4f37-bcd7-14599e47ebc4 |
| `/FetterUnlockLayer/CCNode_1/spr_title` | CCSprite | [0, 380] | [0.5, 0.5] | [220, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-unlock-title.png` ef821306-97bb-4c82-b6ee-6956800a57ab |
| `/FetterUnlockLayer/CCNode_1/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/CCNode_1/item_1` | CCNode | [0, 230] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/CCNode_1/item_2` | CCNode | [-182, 73] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/CCNode_1/item_3` | CCNode | [155, 73] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/CCNode_1/item_4` | CCNode | [-118, -135] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FetterUnlockLayer/CCNode_1/item_5` | CCNode | [100, -135] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## FetterVipInfo（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterVipInfo` | FetterVipInfo | [0, 0] | [0, 0] | [490, 615] | [1, 1] | 0 | 是 |  |
| `/FetterVipInfo/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [490, 615] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-vip-bg.png` 72cfe4bb-4ea9-4a77-b716-bd59351df6d5 insets[60, 20, 64, 70] |
| `/FetterVipInfo/spr_title` | CCSprite | [245, 610] | [0.5, 0.5] | [336, 184] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-info-title.png` 6dc1cee9-0317-4060-b79a-a5bdcd163792 |
| `/FetterVipInfo/spr_level` | CCSprite | [245, 635] | [0.5, 0.5] | [82, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_title-vip-0.png` da47a7aa-6cbc-4e1a-839f-229f348150ed |
| `/FetterVipInfo/spr_next_active` | CCSprite | [245, 589] | [0.5, 0.5] | [296, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_vip3.png` 3f76b7cf-103c-4969-aed8-1551a2558c60 |
| `/FetterVipInfo/lbl_next_level` | UILabelTTF | [245, 675] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下一级」28 STZhongsong.ttf rgb[254, 255, 255] |
| `/FetterVipInfo/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterVipInfo/menu/btn_left` | UIMenuItemLabel | [-25, 338] | [0.5, 0.5] | [48, 70] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e · Label「」24 [255, 255, 255, 255] |
| `/FetterVipInfo/menu/btn_right` | UIMenuItemLabel | [515, 338] | [0.5, 0.5] | [48, 70] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 · Label「」24 [255, 255, 255, 255] |
| `/FetterVipInfo/scroll_view` | CCScrollView | [6, 3] | [0, 0] | [478, 530] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## FetterVipInfoLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FetterVipInfoLayer` | FetterVipInfoLayer | [0, 0] | [0, 0] | [490, 800] | [1, 1] | 0 | 是 |  |
| `/FetterVipInfoLayer/spr_bg` | CCScale9Sprite | [245, 400] | [0.5, 0.5] | [490, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fetters_spr-vip-bg.png` 72cfe4bb-4ea9-4a77-b716-bd59351df6d5 insets[60, 20, 64, 70] |
| `/FetterVipInfoLayer/spr_title` | CCSprite | [245, 700] | [0.5, 0.5] | [260, 132] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters-lang_spr-vip-title.png` 91703776-9f57-4976-a6f6-efaf6bd462b2 |
| `/FetterVipInfoLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FetterVipInfoLayer/CCMenu_1/btn_back` | UIMenuItemImage | [422, 759] | [0.5, 0.5] | [62, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fetters_btn-close.png` 6641607d-90ba-4ec2-87bc-b23940c8e65f |
