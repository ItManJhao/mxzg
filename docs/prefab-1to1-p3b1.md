# P3-b 爬塔/副本/试炼（上） Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| DungeonBoxUseLayer | `prefabs/ui/dungeon/DungeonBoxUseLayer.prefab` | 15 |
| DungeonBuffListLayer | `prefabs/ui/dungeon/DungeonBuffListLayer.prefab` | 16 |
| DungeonHeroAttackLayer | `prefabs/ui/dungeon/DungeonHeroAttackLayer.prefab` | 20 |
| DungeonHeroSelectLayer | `prefabs/ui/dungeon/DungeonHeroSelectLayer.prefab` | 27 |
| DungeonKillRewardCell | `prefabs/ui/dungeon/DungeonKillRewardCell.prefab` | 6 |
| DungeonKillRewardLayer | `prefabs/ui/dungeon/DungeonKillRewardLayer.prefab` | 8 |
| DungeonLayer | `prefabs/ui/dungeon/DungeonLayer.prefab` | 15 |
| DungeonPotionUseLayer | `prefabs/ui/dungeon/DungeonPotionUseLayer.prefab` | 10 |
| DungeonShopLayer | `prefabs/ui/dungeon/DungeonShopLayer.prefab` | 11 |
| DungeonShopListLayer | `prefabs/ui/dungeon/DungeonShopListLayer.prefab` | 8 |
| DungeonStageEndCell | `prefabs/ui/dungeon/DungeonStageEndCell.prefab` | 5 |
| DungeonStageEndLayer | `prefabs/ui/dungeon/DungeonStageEndLayer.prefab` | 4 |
| FantasyLandMainLayer | `prefabs/ui/fantasy-land/FantasyLandMainLayer.prefab` | 29 |
| FantasyLandSeat | `prefabs/ui/fantasy-land/FantasyLandSeat.prefab` | 7 |
| FantasyTowerBuyLayer | `prefabs/ui/fantasy-tower/FantasyTowerBuyLayer.prefab` | 31 |
| FantasyTowerCell | `prefabs/ui/fantasy-tower/FantasyTowerCell.prefab` | 16 |
| FantasyTowerLayer | `prefabs/ui/fantasy-tower/FantasyTowerLayer.prefab` | 36 |
| FantasyTowerLogCell | `prefabs/ui/fantasy-tower/FantasyTowerLogCell.prefab` | 12 |
| FantasyTowerLogLayer | `prefabs/ui/fantasy-tower/FantasyTowerLogLayer.prefab` | 9 |
| FantasyTowerPreviewLayer | `prefabs/ui/fantasy-tower/FantasyTowerPreviewLayer.prefab` | 23 |
| FantasyTowerRankCell | `prefabs/ui/fantasy-tower/FantasyTowerRankCell.prefab` | 8 |
| FantasyTowerRewardCell | `prefabs/ui/fantasy-tower/FantasyTowerRewardCell.prefab` | 5 |
| FantasyTowerTipRewardCell | `prefabs/ui/fantasy-tower/FantasyTowerTipRewardCell.prefab` | 9 |
| FloatingIslandsBossLayer | `prefabs/ui/floating-islands/FloatingIslandsBossLayer.prefab` | 60 |
| FloatingIslandsDamageCell | `prefabs/ui/floating-islands/FloatingIslandsDamageCell.prefab` | 5 |
| FloatingIslandsDamageLayer | `prefabs/ui/floating-islands/FloatingIslandsDamageLayer.prefab` | 11 |
| FloatingIslandsEndCell | `prefabs/ui/floating-islands/FloatingIslandsEndCell.prefab` | 5 |
| FloatingIslandsRewardCell | `prefabs/ui/floating-islands/FloatingIslandsRewardCell.prefab` | 8 |
| FloatingIslandsRewardLayer | `prefabs/ui/floating-islands/FloatingIslandsRewardLayer.prefab` | 14 |
| PlaneWarInstance | `prefabs/ui/plane-war/PlaneWarInstance.prefab` | 8 |
| PlaneWarMainLayer | `prefabs/ui/plane-war/PlaneWarMainLayer.prefab` | 26 |
| PlaneWarMissionCell | `prefabs/ui/plane-war/PlaneWarMissionCell.prefab` | 8 |
| PlaneWarMissionLayer | `prefabs/ui/plane-war/PlaneWarMissionLayer.prefab` | 30 |
| PlaneWarRankCell | `prefabs/ui/plane-war/PlaneWarRankCell.prefab` | 12 |
| PlaneWarRankLayer | `prefabs/ui/plane-war/PlaneWarRankLayer.prefab` | 30 |
| PlaneWarRewardCell | `prefabs/ui/plane-war/PlaneWarRewardCell.prefab` | 7 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/clan/clan_spr-block-introduce.png` | [10, 10, 10, 10] |
| `ui/misc/dungeon_spr-bubble.png` | [10, 44, 9, 38] |
| `ui/misc/fantasy-tower_spr-bg-10.png` | [26, 40, 26, 35] |
| `ui/common/other_spr-res-bg-1.png` | [19, 19, 19, 19] |
| `ui/promo/promotion_spr-task-bg.png` | [10, 10, 10, 10] |
| `ui/common/win-bg_cell-bg-8.png` | [19, 19, 19, 19] |
| `ui/hero/hero-info_spr-new-8.png` | [40, 40, 60, 60] |
| `ui/clan/clan_spr-bg-mission-rank.png` | [9, 10, 10, 10] |
| `ui/common/win-bg_block-bg-41.png` | [4, 4, 4, 4] |
| `ui/floating-Islands/floating-Islands_spr-bg-1.png` | [25, 25, 10, 10] |
| `ui/misc/super-stage_block-3.png` | [15, 15, 15, 15] |

由更早的 P3 PR 改（本 PR 不碰）：

- `ui/common/win-bg_block-bg-10.png` → P3A
- `ui/misc/dungeon_spr-reward-cell-bg.png` → P3A
- `ui/hero/hero-info_spr-hero-image-3.png` → P3A
- `ui/common/rank_spr-paimingk-1.png` → P3A

保留现值（P1/P2 改过的，或原本就有）：

- `ui/common/win-bg_win-bg-11.png` [59, 59, 59, 59]（edited by P1）
- `ui/common/win-bg_block-bg-5.png` [11, 11, 11, 11]（edited by P1）
- `ui/common/win-bg_cell-bg-6.png` [29, 28, 29, 29]（edited by P2A）
- `ui/common/win-bg_win-bg-3.png` [19, 19, 19, 19]（edited by P2A）
- `ui/common/win-bg_win-bg-14.png` [14, 14, 14, 14]（edited by P2A）
- `ui/common/win-bg_win-bg-12.png` [20, 20, 15, 18]（edited by P1）
- `ui/common/rank_spr-cell-bg-2.png` [40, 40, 40, 40]（edited by P2C）
- `ui/common/rank_spr-cell-bg.png` [12, 12, 12, 12]（edited by P2C）

## 偏差（节点要求值 ≠ 采用值，保留采用值）

| meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonBoxUseLayer:/DungeonBoxUseLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonHeroAttackLayer:/DungeonHeroAttackLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonKillRewardLayer:/DungeonKillRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonLayer:/DungeonLayer/spr_hero_list_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonShopLayer:/DungeonShopLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonShopListLayer:/DungeonShopListLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FantasyTowerPreviewLayer:/FantasyTowerPreviewLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FloatingIslandsDamageLayer:/FloatingIslandsDamageLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PlaneWarMissionLayer:/PlaneWarMissionLayer/node_mission/spr_mission_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PlaneWarRankLayer:/PlaneWarRankLayer/spr_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_lineup_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonKillRewardLayer:/DungeonKillRewardLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonShopLayer:/DungeonShopLayer/spr_reward_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonShopListLayer:/DungeonShopListLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FantasyTowerLogLayer:/FantasyTowerLogLayer/spr_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsBossLayer:/FloatingIslandsBossLayer/node_bottom/node_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsDamageLayer:/FloatingIslandsDamageLayer/spr_panel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_my_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/rank/rank_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/rank/spr_self_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/reward/reward_scroll_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `PlaneWarMissionLayer:/PlaneWarMissionLayer/node_mission/scroll_view_bg` |
| `win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39] | `PlaneWarMissionCell:/PlaneWarMissionCell/spr_bg` |
| `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_hero_bg` |
| `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `FloatingIslandsBossLayer:/FloatingIslandsBossLayer/node_center/CCNode_1/spr_bg2` |
| `super-stage_block-3.png` | [15, 15, 15, 15] | [12, 12, 12, 12] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_rank_title_bg` |

## DungeonBoxUseLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonBoxUseLayer` | DungeonBoxUseLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/DungeonBoxUseLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 820] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonBoxUseLayer/node_title` | CCNode | [300.0, 800.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonBoxUseLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DungeonBoxUseLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「宝 箱」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonBoxUseLayer/spr_reward_bg` | CCScale9Sprite | [300, 280] | [0.5, 0.5] | [500, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/clan/clan_spr-block-introduce.png` 3a4a7533-e9a6-47cc-9ae7-61f5da70601b insets[10, 10, 10, 10] |
| `/DungeonBoxUseLayer/lbl_notice_title` | UILabelTTF | [300, 450] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「远古秘宝？！！这都能给我遇到，今天走大运了」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/DungeonBoxUseLayer/lbl_notice_title` | UILabelTTF | [300, 380] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「随机奖励预览」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/DungeonBoxUseLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonBoxUseLayer/menu/btn_close` | UIMenuItemImage | [560, 775] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DungeonBoxUseLayer/menu/btn_confirm` | UIMenuItemLabel | [300, 50] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/DungeonBoxUseLayer/CCSprite_1` | CCSprite | [300, 600] | [0.5, 0.5] | [284, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-magic.png` 43245ba5-7c2f-4488-9b07-01c6182a3d4d |
| `/DungeonBoxUseLayer/box` | CCSprite | [300, 600] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_event-105.png` ea464cbe-2259-49b3-90cd-1645c4da50ed |
| `/DungeonBoxUseLayer/CCSprite_2` | CCSprite | [360, 380] | [0, 0.5] | [172, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-line-1.png` d1dd9d24-5212-45cb-9250-8b3bcf3b0e71 |
| `/DungeonBoxUseLayer/CCSprite_3` | CCSprite | [240, 380] | [1, 0.5] | [172, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-line-1.png` d1dd9d24-5212-45cb-9250-8b3bcf3b0e71 |

## DungeonBuffListLayer（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonBuffListLayer` | DungeonBuffListLayer | [0, 0] | [0, 0] | [420, 210] | [1, 1] | 0 | 是 |  |
| `/DungeonBuffListLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [420, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[20, 20, 20, 20] |
| `/DungeonBuffListLayer/CCSprite_1` | CCSprite | [210, 50] | [0.5, 0.5] | [40, 1] | [10, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-line.png` ce6ea06b-92f9-4b70-975e-0c30f61f5208 |
| `/DungeonBuffListLayer/lbl_tip` | UILabelTTF | [210, 25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「该属性仅本轮冒险生效」36 STZhongsong.ttf rgb[138, 138, 138] |
| `/DungeonBuffListLayer/spr_buff_201` | CCSprite | [50, 170] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_buff-201.png` e95ecc35-a511-4211-a446-b2dcf55a4bfb |
| `/DungeonBuffListLayer/lbl_buff_num_201` | UILabelTTF | [70, 170] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「攻击提升0%」36 STZhongsong.ttf rgb[255, 226, 179] |
| `/DungeonBuffListLayer/spr_buff_202` | CCSprite | [50, 130] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_buff-202.png` 2bcbf117-39cd-4ce6-a78a-1dc102896886 |
| `/DungeonBuffListLayer/lbl_buff_num_202` | UILabelTTF | [70, 130] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「防御提升0%」36 STZhongsong.ttf rgb[255, 226, 179] |
| `/DungeonBuffListLayer/spr_buff_102` | CCSprite | [50, 90] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_buff-102.png` 4852e1bb-4026-4352-9f06-d65952e244dc |
| `/DungeonBuffListLayer/lbl_buff_num_102` | UILabelTTF | [70, 90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「生命提升0%」36 STZhongsong.ttf rgb[255, 226, 179] |
| `/DungeonBuffListLayer/spr_buff_291` | CCSprite | [220, 170] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_buff-291.png` 9d08ff49-f2fd-459a-8cb9-132d5415e343 |
| `/DungeonBuffListLayer/lbl_buff_num_291` | UILabelTTF | [240, 170] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「免伤提升0%」36 STZhongsong.ttf rgb[255, 226, 179] |
| `/DungeonBuffListLayer/spr_buff_270` | CCSprite | [220, 130] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_buff-270.png` a8ac8fea-ca38-41b8-8589-a4ba8a0eacf6 |
| `/DungeonBuffListLayer/lbl_buff_num_270` | UILabelTTF | [240, 130] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「伤害加成提升0%」36 STZhongsong.ttf rgb[255, 226, 179] |
| `/DungeonBuffListLayer/spr_buff_207` | CCSprite | [220, 90] | [0.5, 0.5] | [30, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_buff-207.png` fa29068b-73b6-4b3c-806f-850c38aa2484 |
| `/DungeonBuffListLayer/lbl_buff_num_207` | UILabelTTF | [240, 90] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「暴击率提升0%」36 STZhongsong.ttf rgb[255, 226, 179] |

## DungeonHeroAttackLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonHeroAttackLayer` | DungeonHeroAttackLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroAttackLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 820] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonHeroAttackLayer/node_title` | CCNode | [300.0, 800.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroAttackLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DungeonHeroAttackLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战祭祀」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonHeroAttackLayer/spr_notice_bg` | CCScale9Sprite | [300, 250] | [0.5, 0.5] | [560, 170] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/clan/clan_spr-block-introduce.png` 3a4a7533-e9a6-47cc-9ae7-61f5da70601b insets[10, 10, 10, 10] |
| `/DungeonHeroAttackLayer/lbl_notice_title` | UILabelTTF | [300, 355] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择英雄」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/DungeonHeroAttackLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroAttackLayer/menu/btn_close` | UIMenuItemImage | [560, 775] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DungeonHeroAttackLayer/menu/btn_confirm` | UIMenuItemLabel | [300, 61] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「」24 [255, 255, 255, 255] |
| `/DungeonHeroAttackLayer/menu/btn_speed_check` | UIMenuItemTab | [250, 420] | [0.5, 0.5] | [42, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-check-1.png` 2fa8e300-52c6-4e4d-acc5-7ebbab24439f pressed `ui/common/button_btn-check-2.png` 55415b57-1240-496b-b1ea-e4934566c85d |
| `/DungeonHeroAttackLayer/CCSprite_1` | CCSprite | [360, 355] | [0, 0.5] | [172, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-line-1.png` d1dd9d24-5212-45cb-9250-8b3bcf3b0e71 |
| `/DungeonHeroAttackLayer/CCSprite_2` | CCSprite | [240, 355] | [1, 0.5] | [172, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-line-1.png` d1dd9d24-5212-45cb-9250-8b3bcf3b0e71 |
| `/DungeonHeroAttackLayer/spr_vs` | CCSprite | [300, 560] | [0.5, 0.5] | [110, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-vs.png` cc952e22-a0d6-49f0-adfc-b37c9807a983 |
| `/DungeonHeroAttackLayer/lbl_notice_title` | UILabelTTF | [297.12, 414.88] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「跳过战斗」36 STZhongsong.ttf rgb[120, 65, 0] |
| `/DungeonHeroAttackLayer/scroll_view_selected` | CCScrollView | [30, 170] | [0, 0] | [540, 160] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/DungeonHeroAttackLayer/CCNode_1` | CCNode | [300, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroAttackLayer/CCNode_1/spr_battle_count_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/DungeonHeroAttackLayer/CCNode_1/CCSprite_1` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/DungeonHeroAttackLayer/CCNode_1/lbl_battle_count` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |

## DungeonHeroSelectLayer（27）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonHeroSelectLayer` | DungeonHeroSelectLayer | [0, 0] | [0, 0] | [600, 800] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroSelectLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 820] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonHeroSelectLayer/node_title` | CCNode | [300.0, 800.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroSelectLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DungeonHeroSelectLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「冒险出战」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonHeroSelectLayer/spr_hero_bg` | CCScale9Sprite | [20, 360] | [0.5, 0.5] | [560, 345] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-hero-image-3.png` 5c7106c3-ccd1-4430-9c9e-5f6f231c6ad3 insets[80, 50, 20, 20] |
| `/DungeonHeroSelectLayer/spr_lineup_bg` | CCScale9Sprite | [300, 230] | [0.5, 0.5] | [560, 170] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DungeonHeroSelectLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroSelectLayer/menu/btn_close` | UIMenuItemImage | [560, 775] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DungeonHeroSelectLayer/menu/btn_confirm` | UIMenuItemLabel | [420, 62] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「进入冒险」48 [255, 255, 255, 255] |
| `/DungeonHeroSelectLayer/menu/btn_speed` | UIMenuItemLabel | [181, 62] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-4.png` 54a02a9a-5d70-4ac7-be15-9590d8db8527 · Label「一键布阵」48 [255, 255, 255, 255] |
| `/DungeonHeroSelectLayer/menu_elem` | UIMenu | [300, 660] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroSelectLayer/menu_elem/btn_elem0` | UIMenuItemImage | [-200, 0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-0.png` e0c24160-8ef5-494b-8c78-3f3eb4ec8aab |
| `/DungeonHeroSelectLayer/menu_elem/btn_elem1` | UIMenuItemImage | [-120, 0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-1.png` 6ac7088f-b451-4ee3-9253-283893c8b43a |
| `/DungeonHeroSelectLayer/menu_elem/btn_elem2` | UIMenuItemImage | [-40, 0] | [0.499, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-2.png` 9c200838-2dd8-48d2-8ac9-8a3ce9670524 |
| `/DungeonHeroSelectLayer/menu_elem/btn_elem3` | UIMenuItemImage | [40, 0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-3.png` 791a3ba0-4e08-4821-b91b-4dcd6dd70d2c |
| `/DungeonHeroSelectLayer/menu_elem/btn_elem4` | UIMenuItemImage | [120, 0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-4.png` 5d293b9c-1579-426e-8c84-845139ebb9b6 |
| `/DungeonHeroSelectLayer/menu_elem/btn_elem5` | UIMenuItemImage | [200, 0] | [0.5, 0.5] | [74, 74] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-icon_elem-5.png` ecc58c96-900b-4477-baad-6adb270bc1d8 |
| `/DungeonHeroSelectLayer/lbl_tips` | UILabelTTF | [300, 340] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「选择英雄」48 STZhongsong.ttf rgb[120, 65, 0] |
| `/DungeonHeroSelectLayer/CCSprite_1` | CCSprite | [360, 335] | [0, 0.5] | [172, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-line-1.png` d1dd9d24-5212-45cb-9250-8b3bcf3b0e71 |
| `/DungeonHeroSelectLayer/CCSprite_2` | CCSprite | [240, 335] | [1, 0.5] | [172, 2] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/role-info_spr-line-1.png` d1dd9d24-5212-45cb-9250-8b3bcf3b0e71 |
| `/DungeonHeroSelectLayer/scroll_view_selected` | CCScrollView | [30, 150] | [0, 0] | [540, 160] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/DungeonHeroSelectLayer/spr_select` | CCSprite | [104, 658] | [0.5, 0.5] | [92, 92] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-btn-select.png` 19bbb579-f958-44fd-972b-3d609aa2ea59 |
| `/DungeonHeroSelectLayer/CCNode_1` | CCNode | [300, 120] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonHeroSelectLayer/CCNode_1/spr_battle_count_bg` | CCSprite | [0, 0] | [0.5, 0.5] | [378, 84] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-info_zhanbei.png` ea02e779-2058-4bcd-b279-2a18d43529e0 |
| `/DungeonHeroSelectLayer/CCNode_1/CCSprite_1` | CCSprite | [-75, 8] | [0.5, 0.5] | [78, 44] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-select-lang_zhanli.png` 5496d211-013c-4711-8450-04645af5389d |
| `/DungeonHeroSelectLayer/CCNode_1/lbl_battle_count` | CCLabelBMFont | [20, 0] | [0.5, 0.5] | auto | [0.7926, 0.7926] | 0 | 是 | cc.Label「1000000」BMFont red-26.fnt 75293080-cb1d-4202-bab3-d91bbcd0073a |

## DungeonKillRewardCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonKillRewardCell` | DungeonKillRewardCell | [0, 0] | [0, 0] | [480, 150] | [1, 1] | 0 | 是 |  |
| `/DungeonKillRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [480, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[10, 10, 10, 10] |
| `/DungeonKillRewardCell/lbl_title` | UILabelTTF | [15, 125] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「击杀    个祭祀(5/31)」56 STZhongsong.ttf rgb[120, 65, 0] |
| `/DungeonKillRewardCell/lbl_num` | UILabelTTF | [89, 125] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「33」56 STZhongsong.ttf rgb[21, 148, 0] |
| `/DungeonKillRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonKillRewardCell/menu/btn_done` | UIMenuItemLabel | [400, 55] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「」24 [255, 255, 255, 255] |

## DungeonKillRewardLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonKillRewardLayer` | DungeonKillRewardLayer | [0, 0] | [0, 0] | [560, 720] | [1, 1] | 0 | 是 |  |
| `/DungeonKillRewardLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [580, 740] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonKillRewardLayer/node_title` | CCNode | [280.0, 720.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonKillRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DungeonKillRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「目标奖励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonKillRewardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonKillRewardLayer/menu/btn_close` | UIMenuItemImage | [520, 695] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DungeonKillRewardLayer/spr_scroll_bg` | CCScale9Sprite | [280, 330] | [0.5, 0.5] | [500, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |

## DungeonLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonLayer` | DungeonLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonLayer/spr_bg` | CCLayerColor | [320.0, 480.0] | [0.5, 0.5] | [640, 960] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[57, 39, 27] a255 |
| `/DungeonLayer/spr_bg_top` | CCSprite | [299, 716] | [0.5, 0] | [744, 385] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon-grid_map-frame-top.png` f6d72641-b643-461a-b748-3774b850f427 |
| `/DungeonLayer/spr_bg_bottom` | CCSprite | [343, 349] | [0.5, 1] | [744, 385] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon-grid_map-frame-bottom.png` f81ea759-0b86-451e-bd10-f2807cfa9307 |
| `/DungeonLayer/lbl_left_time_bg` | CCScale9Sprite | [320.0, 110.0] | [0.5, 0.5] | [400, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_block-bg-18.png` 3197362f-fd14-4cc9-bef0-873a0ec104d4 |
| `/DungeonLayer/lbl_left_time` | UILabelTTF | [320.0, 110.4] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonLayer/menu/btn_rank` | UIMenuItemImage | [504, 830] | [0.5, 0.5] | [58, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-rank-1.png` 57d0b535-98ab-4df3-8aa7-527c1dfc4081 |
| `/DungeonLayer/menu/btn_info` | UIMenuItemImage | [593, 830] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/DungeonLayer/menu/btn_back` | UIMenuItemImage | [80, 830] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/DungeonLayer/menu/btn_buff_list` | UIMenuItemLabel | [570, 110] | [0.5, 0.5] | [100, 30] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/dungeon_spr-btn-bg-1.png` 97641618-3fe4-4fe3-9d3b-e85dd73a5c36 · Label「」24 [255, 255, 255, 255] |
| `/DungeonLayer/spr_title_bg` | CCScale9Sprite | [320.0, 821.0] | [0.5, 0.5] | [299, 47] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar.png` b54e8cdd-24ba-4a35-80bf-dd8dbfbbe9cf |
| `/DungeonLayer/lbl_title` | UILabelTTF | [312.0, 822.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「地  牢」32 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonLayer/spr_hero_list_bg` | CCScale9Sprite | [320, 210] | [0.5, 0.5] | [620, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonLayer/layer_hero_list` | CCLayer | [320, 210] | [0.5, 0.5] | [560, 120] | [1, 1] | 0 | 是 |  |

## DungeonPotionUseLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonPotionUseLayer` | DungeonPotionUseLayer | [0, 0] | [0, 0] | [560, 420] | [1, 1] | 0 | 是 |  |
| `/DungeonPotionUseLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [560, 420] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-3.png` 578dbf56-e182-4f7a-b94c-c34a6ea734b6 insets[20, 20, 20, 20] |
| `/DungeonPotionUseLayer/lbl_name` | UILabelTTF | [127, 381] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「药剂使用」48 STZhongsong.ttf rgb[255, 150, 0] |
| `/DungeonPotionUseLayer/lbl_intro` | UILabelTTF | [126, 313] | [0, 0.5] | [800, 160] | [0.5, 0.5] | 0 | 是 | cc.Label「远古秘宝？！！这都能给我遇到，今天走大运了」36 STZhongsong.ttf rgb[254, 235, 186] |
| `/DungeonPotionUseLayer/lbl_notice_title` | UILabelTTF | [25, 264] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「请选择使用目标」36 STZhongsong.ttf rgb[255, 226, 179] |
| `/DungeonPotionUseLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonPotionUseLayer/menu/btn_confirm` | UIMenuItemLabel | [170, 40] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [255, 255, 255, 255] |
| `/DungeonPotionUseLayer/menu/btn_cancel` | UIMenuItemLabel | [400, 40] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [255, 255, 255, 255] |
| `/DungeonPotionUseLayer/CCSprite_1` | CCSprite | [280, 288] | [0.5, 0.5] | [40, 1] | [13, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-line.png` ce6ea06b-92f9-4b70-975e-0c30f61f5208 |
| `/DungeonPotionUseLayer/spr_potion` | CCSprite | [62, 357] | [0.5, 0.5] | [120, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_btn-potion-hp.png` 913d566c-29ad-482e-82a4-76ce21ca39f6 |

## DungeonShopLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonShopLayer` | DungeonShopLayer | [0, 0] | [0, 0] | [600, 560] | [1, 1] | 0 | 是 |  |
| `/DungeonShopLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 580] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonShopLayer/node_title` | CCNode | [300.0, 560.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonShopLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DungeonShopLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「神秘商店」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonShopLayer/CCSprite_1` | CCSprite | [471.76, 399.32] | [0.5, 0.5] | [260, 330] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/dungeon_spr-girl.png` 2e0c06ea-0d5e-42f7-913c-84445440362d |
| `/DungeonShopLayer/spr_bg` | CCScale9Sprite | [18, 316] | [0.5, 0.5] | [350, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-bubble.png` fb82a387-c827-4c1d-9286-f09639478aed insets[10, 45, 10, 40] |
| `/DungeonShopLayer/spr_reward_bg` | CCScale9Sprite | [300, 130] | [0.5, 0.5] | [560, 210] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DungeonShopLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonShopLayer/menu/btn_close` | UIMenuItemImage | [560, 535] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/DungeonShopLayer/lbl_intro` | UILabelTTF | [180, 380] | [0.5, 0.5] | [600, 300] | [0.5, 0.5] | 0 | 是 | cc.Label「看来你的运气不错，居然遇上了我。我包里可都是好东西，过了这个镇就只能去我的冒险商店里买啦！」48 STZhongsong.ttf rgb[120, 65, 0] |

## DungeonShopListLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonShopListLayer` | DungeonShopListLayer | [0, 0] | [0, 0] | [560, 720] | [1, 1] | 0 | 是 |  |
| `/DungeonShopListLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [580, 740] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/DungeonShopListLayer/spr_scroll_bg` | CCScale9Sprite | [20, 30] | [0.5, 0.5] | [520, 600] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/DungeonShopListLayer/node_title` | CCNode | [280.0, 720.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/DungeonShopListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/DungeonShopListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「冒险商店」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/DungeonShopListLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/DungeonShopListLayer/menu/btn_close` | UIMenuItemImage | [520, 695] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## DungeonStageEndCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonStageEndCell` | DungeonStageEndCell | [0, 0] | [0, 0] | [510, 36] | [1, 1] | 0 | 是 |  |
| `/DungeonStageEndCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/dungeon_spr-reward-cell-bg.png` d86e67cd-f647-4e27-b1cc-efd453c893e3 insets[10, 10, 10, 10] |
| `/DungeonStageEndCell/spr_res` | CCSprite | [95, 18] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/DungeonStageEndCell/lbl_name` | UILabelTTF | [180, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「金币阿卡丽的」48 STZhongsong.ttf rgb[254, 255, 255] |
| `/DungeonStageEndCell/lbl_num` | UILabelTTF | [360, 18] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「888888」48 STZhongsong.ttf rgb[255, 249, 197] |

## DungeonStageEndLayer（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/DungeonStageEndLayer` | DungeonStageEndLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/DungeonStageEndLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/DungeonStageEndLayer/spr_title` | CCSprite | [303, 395] | [0.5, 0.5] | [422, 80] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/reward-layer-lang_lbl-total-reward.png` 321723d7-5b5d-4774-84b3-831199079eb4 |
| `/DungeonStageEndLayer/CCSprite_1` | CCSprite | [320, -5] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |

## FantasyLandMainLayer（29）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyLandMainLayer` | FantasyLandMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCSprite_1` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/fantasy-land-main-bg.png` 2605df44-92c0-45a2-814b-b1ae3ecb5849 |
| `/FantasyLandMainLayer/CCNode_1` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 316] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_1` | CCNode | [320.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 1] | [176, 124] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_title.png` 7f287c45-5039-4f06-89d6-cd748529e09f |
| `/FantasyLandMainLayer/CCNode_1/CCNode_1/CCSprite_2` | CCSprite | [0, -123.0] | [0.5, 0.5] | [250, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-19.png` 4f1f049c-06d7-4a37-9923-55bc3d4d4a38 |
| `/FantasyLandMainLayer/CCNode_1/CCNode_1/lbl_timing` | UILabelTTF | [0, -123] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「周六00:00开启」44 STZhongsong.ttf rgb[43, 249, 0] |
| `/FantasyLandMainLayer/CCNode_1/CCNode_2` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 316.0] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_2/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_2/UIMenu_1/btn_back` | UIMenuItemImage | [-71.435, -47.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/FantasyLandMainLayer/CCNode_1/CCNode_2/UIMenu_1/btn_info` | UIMenuItemImage | [-48.074, -109.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3` | CCNode | [0.0, -143] | [0, 1] | [640.0, 118] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/CCScale9Sprite_1` | CCScale9Sprite | [0.0, -118.0] | [0.5, 0.5] | [640.0, 118.0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_bg-2.png` 6060b283-2a73-435d-80bd-65b6b89dec5f |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/UIMenu_1` | UIMenu | [0.0, -118] | [0, 0] | [640.0, 118.0] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/UIMenu_1/btn_hero_temple` | UIMenuItemImage | [81.0, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_temple-btn.png` 4378ba37-f520-4050-81c3-524418808c52 |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/UIMenu_1/btn_report` | UIMenuItemImage | [203.0, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_report-btn.png` e9500541-cddf-468e-8855-6860fca2f30c |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/UIMenu_1/btn_reward` | UIMenuItemImage | [320.0, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_reward-btn.png` 58c9ddcc-bffc-4245-b662-f0bac6c2297f |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/UIMenu_1/btn_shop` | UIMenuItemImage | [437.12, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_shop-btn.png` 7f7c6477-94bc-4f20-b432-5b31a413cd1f |
| `/FantasyLandMainLayer/CCNode_1/CCNode_3/UIMenu_1/btn_rank` | UIMenuItemImage | [558.72, 59.0] | [0.5, 0.5] | [102, 102] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-land-lang_rank-btn.png` 3baed6c4-7377-4698-a2f1-d67d686d094f |
| `/FantasyLandMainLayer/CCNode_1/CCNode_4` | CCNode | [640.0, -294] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_1/CCNode_4/bg_rank` | CCSprite | [1, 0] | [1, 0.5] | [178, 60] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land-lang_bg-1.png` 572d2464-b624-43e7-9ab0-8ed185b6af4f |
| `/FantasyLandMainLayer/CCNode_2` | CCNode | [0.0, 0.0] | [0, 0] | [640.0, 184] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [442.0, 20] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「一键挑战排名不变」40 STZhongsong.ttf rgbNone |
| `/FantasyLandMainLayer/CCNode_2/CCLayerColor_1` | CCLayerColor | [0.0, 104] | [0, 0] | [640.0, 80] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a125 |
| `/FantasyLandMainLayer/CCNode_2/CCMenu_1` | CCMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyLandMainLayer/CCNode_2/CCMenu_1/btn_defense_team` | UIMenuItemLabel | [-118, 65] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「防守阵容」40 [255, 255, 255, 255] |
| `/FantasyLandMainLayer/CCNode_2/CCMenu_1/btn_one_key` | UIMenuItemLabel | [118, 65] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「一键挑战」40 [255, 255, 255, 255] |
| `/FantasyLandMainLayer/CCNode_2/CCMenu_1/btn_refresh` | UIMenuItemLabel | [206.667, 144] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-small-1.png` 9c168225-3682-4865-bfbe-acf350e4e993 · Label「刷新」48 [122, 71, 45, 255] |
| `/FantasyLandMainLayer/CCNode_2/node_times` | CCNode | [40.0, 145] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## FantasyLandSeat（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyLandSeat` | FantasyLandSeat | [0, 0] | [0, 0] | [210, 200] | [1, 1] | 0 | 是 |  |
| `/FantasyLandSeat/CCSprite_1` | CCSprite | [105, 53] | [0.5, 0.5] | [208, 200] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_base.png` 12defcca-64a9-4fa6-997d-abcf881d3a8a |
| `/FantasyLandSeat/node_animator` | CCNode | [105, 79] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyLandSeat/CCSprite_2` | CCSprite | [105, 57] | [0.5, 0.5] | [82, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_bg-3.png` b2e3b262-635d-4110-86e1-991d18b25c6e |
| `/FantasyLandSeat/lbl_rank` | UILabelTTF | [105, 57] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyLandSeat/CCSprite_3` | CCSprite | [105, 19] | [0.5, 0.5] | [184, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-22.png` 1e38ebac-3ccf-4b7b-8213-0de487f8501f |
| `/FantasyLandSeat/lbl_name` | UILabelTTF | [105, 18] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「-」40 STZhongsong.ttf rgbNone |

## FantasyTowerBuyLayer（31）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerBuyLayer` | FantasyTowerBuyLayer | [0, 0] | [0, 0] | [536, 638] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerBuyLayer/spr_bg` | CCLayerColor | [268.0, 319.0] | [0.5, 0.5] | [536, 638] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a125 |
| `/FantasyTowerBuyLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [536, 638] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-bg.png` 7323ec7e-2893-4a68-b965-181d0aff3cd8 |
| `/FantasyTowerBuyLayer/node_title` | CCNode | [268.0, 638.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerBuyLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FantasyTowerBuyLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「购 买」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FantasyTowerBuyLayer/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerBuyLayer/CCNode_1/CCSprite_1` | CCSprite | [268, 498] | [0.5, 0.5] | [178, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FantasyTowerBuyLayer/CCNode_1/CCSprite_2` | CCSprite | [268, 453] | [0.5, 0.5] | [178, 32] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-1.png` ebd7a31b-c738-4e18-817c-305f6ad1ea21 |
| `/FantasyTowerBuyLayer/CCNode_1/CCSprite_3` | CCSprite | [196, 498] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/FantasyTowerBuyLayer/CCNode_1/spr_gem` | CCSprite | [196, 498] | [0.5, 0.5] | [36, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-2.png` ae311eaa-8e5f-4b7f-b0a3-91396268e138 |
| `/FantasyTowerBuyLayer/CCNode_1/CCSprite_4` | CCSprite | [196, 453] | [0.5, 0.5] | [36, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-bg.png` 963bd6fc-3ab4-4aba-a42c-7bd9ce3c8e6a |
| `/FantasyTowerBuyLayer/CCNode_1/CCSprite_5` | CCSprite | [196, 453] | [0.5, 0.5] | [100, 100] | [0.54, 0.54] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901001.png` 7d086307-5909-4fe3-9a5a-505e4a79c1af |
| `/FantasyTowerBuyLayer/CCNode_1/lbl_gem_num` | UILabelTTF | [268, 499] | [0.5, 0.5] | auto | [0.6, 0.6] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgbNone |
| `/FantasyTowerBuyLayer/CCNode_1/lbl_energy_num` | UILabelTTF | [268, 452] | [0.5, 0.5] | auto | [0.6, 0.6] | 0 | 是 | cc.Label「999999」40 STZhongsong.ttf rgbNone |
| `/FantasyTowerBuyLayer/CCNode_2` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerBuyLayer/CCNode_2/CCScale9Sprite_1` | CCScale9Sprite | [46, 149] | [0.5, 0.5] | [444, 250] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_win-bg-15.png` e8c7c4ae-b048-45b0-9299-9929f32e0fbc |
| `/FantasyTowerBuyLayer/CCNode_2/CCSprite_1` | CCSprite | [130, 310] | [0.5, 0.5] | [104, 104] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_rare-0.png` 21266d8d-a166-49c4-ac20-218406c3a3d9 |
| `/FantasyTowerBuyLayer/CCNode_2/CCSprite_2` | CCSprite | [130, 310] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901001.png` 7d086307-5909-4fe3-9a5a-505e4a79c1af |
| `/FantasyTowerBuyLayer/CCNode_2/UILabelTTF_1` | UILabelTTF | [152, 287] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「x1」40 STZhongsong.ttf rgb[236, 172, 14] |
| `/FantasyTowerBuyLayer/CCNode_2/CCSprite_3` | CCSprite | [310, 330] | [0.5, 0.5] | [114, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-2.png` 8f615fc7-a26b-4f99-815b-e037b7506167 |
| `/FantasyTowerBuyLayer/CCNode_2/lbl_buy_num` | UILabelTTF | [310, 330] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/FantasyTowerBuyLayer/CCNode_2/CCSprite_4` | CCSprite | [309, 275] | [0.5, 0.5] | [110, 26] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/summon/main-summon_buy-num-bg-3.png` a75eeeee-f9ec-4f4c-9bb4-1ecc6d047000 |
| `/FantasyTowerBuyLayer/CCNode_2/spr_icon` | CCSprite | [259, 275] | [0.5, 0.5] | [36, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/res-icon_res-2.png` ae311eaa-8e5f-4b7f-b0a3-91396268e138 |
| `/FantasyTowerBuyLayer/CCNode_2/lbl_need_gem` | UILabelTTF | [309, 275] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99」40 STZhongsong.ttf rgbNone |
| `/FantasyTowerBuyLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerBuyLayer/UIMenu_1/btn_buy_gem` | UIMenuItemImage | [341, 535] | [0.5, 0.5] | [32, 32] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/summon/main-summon_btn-add.png` 00f99e53-45bd-4736-ab31-d267503d5ac2 |
| `/FantasyTowerBuyLayer/UIMenu_1/btn_sub1` | UIMenuItemImage | [233, 331] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-sub-10.png` 196d417f-2208-46b7-88f8-cf56dbf8fbfb |
| `/FantasyTowerBuyLayer/UIMenu_1/btn_add1` | UIMenuItemImage | [387, 331] | [0.5, 0.5] | [34, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-10.png` 1f83c385-6f6e-4528-a891-9eecdd2614b6 |
| `/FantasyTowerBuyLayer/UIMenu_1/btn_buy` | UIMenuItemLabel | [268, 203] | [0.5, 0.5] | [195, 66] | [0.76, 0.76] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` 32d3f17e-ed91-4ee9-a4e6-e2624249bd73 · Label「」24 [255, 255, 255, 255] |
| `/FantasyTowerBuyLayer/UIMenu_1/btn_close` | UIMenuItemImage | [486.432, 586.864] | [0.5, 0.5] | [64, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/summon/main-summon_btn-close.png` 54a102fe-f369-47c3-b94f-adfe4f89a08c |

## FantasyTowerCell（16）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerCell` | FantasyTowerCell | [0, 0] | [0, 0] | [640, 168] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerCell/spr_bg` | CCSprite | [0, 0] | [0, 0] | [640, 168] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-bg-1.png` eaedc323-7714-4f10-833c-f38d039af492 |
| `/FantasyTowerCell/spr_stage_bg` | CCSprite | [461, 168] | [0.5, 0.5] | [141, 49] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-bg-6.png` 7ae583c4-0285-4bc7-8bbe-3e40be470981 |
| `/FantasyTowerCell/lbl_stage` | UILabelTTF | [461, 166] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「第一关」45 STZhongsong.ttf rgb[85, 30, 20] |
| `/FantasyTowerCell/spr_status` | CCSprite | [463.0, 83.0] | [0.5, 0.5] | [248, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower-lang_spr-status-0.png` 2677af78-7d23-4402-ac76-85f37558193a |
| `/FantasyTowerCell/lbl_battle` | CCSprite | [461, 49] | [0.5, 0.5] | [77, 39] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower-lang_lbl-battle-1.png` 8d275368-d2df-49c4-843b-94b17e958a4d |
| `/FantasyTowerCell/node_first_ward` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerCell/node_first_ward/spr_reward_bg` | CCScale9Sprite | [632, 5] | [0.5, 0.5] | [104, 138] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-tower_spr-bg-10.png` 7442a7cb-5b20-4109-a590-40a7d7ce560d insets[26, 42, 26, 35] |
| `/FantasyTowerCell/node_first_ward/scroll_view_reward1` | UIScrollViewBackpack | [583, 65.49] | [0.5, 0.5] | [80, 65] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/FantasyTowerCell/node_first_ward/lbl_tip4` | UILabelTTF | [604, 89] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「首通」16 STZhongsong.ttf rgb[0, 249, 0] |
| `/FantasyTowerCell/node_first_ward/lbl_tip1` | UILabelTTF | [583, 129] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「层数越高」16 STZhongsong.ttf rgb[255, 234, 190] |
| `/FantasyTowerCell/node_first_ward/lbl_tip2` | UILabelTTF | [566, 110] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「进阶石」16 STZhongsong.ttf rgb[255, 244, 100] |
| `/FantasyTowerCell/node_first_ward/lbl_tip3` | UILabelTTF | [607, 110] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「越多」16 STZhongsong.ttf rgb[255, 234, 190] |
| `/FantasyTowerCell/node_sweep` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerCell/node_sweep/CCSprite_1` | CCSprite | [462, 45] | [0.5, 0.5] | [240, 40] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-shadow.png` 03f50dff-cafe-42f5-b828-452d1d7e4090 |
| `/FantasyTowerCell/node_sweep/CCSprite_2` | CCSprite | [460, 99] | [0.5, 0.5] | [66, 66] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower-lang_btn-sweep-1.png` 01445532-1342-429f-ad16-5f3612e8611a |

## FantasyTowerLayer（36）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerLayer` | FantasyTowerLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/node_btn` | CCNode | [551.0, 813.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/node_btn/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/node_btn/CCMenu_1/btn_back` | UIMenuItemImage | [0, -10] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/FantasyTowerLayer/CCNode_1` | CCNode | [5.0, 760.0] | [0, 1] | [320, 580] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/CCNode_1/CCSprite_1` | CCSprite | [137.0, -290.0] | [0.5, 0.5] | [270, 592] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-bg-7.png` 86ee6e2b-f9a5-4c61-b6b1-56c574c892b1 |
| `/FantasyTowerLayer/CCNode_1/scroll_view_reward1` | UIScrollViewBackpack | [137, -289.51] | [0.5, 0.5] | [230, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/FantasyTowerLayer/CCNode_1/UILabelTTF_1` | UILabelTTF | [137.0, -18.76] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「闯关排行榜」20 STZhongsong.ttf rgb[255, 240, 191] |
| `/FantasyTowerLayer/CCNode_1/CCSprite_2` | CCSprite | [32.2, -55.84] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-1.png` 1265e592-b04d-43b8-a16b-7c4d19d2f55b |
| `/FantasyTowerLayer/CCNode_1/CCSprite_3` | CCSprite | [30.76, -94.72] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-2.png` d43bc0ea-7802-460b-8830-ade683614456 |
| `/FantasyTowerLayer/CCNode_1/CCSprite_4` | CCSprite | [30.76, -137.92] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-3.png` 365cb8ab-6912-4bab-a6c7-c383d5987b90 |
| `/FantasyTowerLayer/CCNode_1/lbl_rank_name1` | UILabelTTF | [58.52, -57.64] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_rank_name2` | UILabelTTF | [58.52, -96.14] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_rank_name3` | UILabelTTF | [58.52, -137.9] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_rank_stage1` | UILabelTTF | [253.52, -56.2] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_rank_stage2` | UILabelTTF | [253.52, -96.1] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_rank_stage3` | UILabelTTF | [253.52, -137.9] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_now_reward` | UILabelTTF | [137.0, -220.36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「第1关奖励」20 STZhongsong.ttf rgb[255, 240, 191] |
| `/FantasyTowerLayer/CCNode_1/UILabelTTF_2` | UILabelTTF | [18.2, -175.34] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「我的排名：」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/lbl_self_rank` | UILabelTTF | [116.12, -175.34] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未上榜」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/spr_tip_bg` | CCSprite | [136.0, -450.423] | [0.5, 0.5] | [253, 243] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-bg-9.png` 26eceba2-67f3-40cc-a197-394fdb05710b |
| `/FantasyTowerLayer/CCNode_1/scroll_view_reward2` | UIScrollViewBackpack | [136.129, -503.127] | [0.5, 0.5] | [90, 100] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/FantasyTowerLayer/CCNode_1/lbl_stage_tip` | UILabelTTF | [136.0, -414.14] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关第-关」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLayer/CCNode_1/UIMenu_1` | UIMenu | [-23, -580] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/CCNode_1/UIMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [244.56, 404.7] | [0.5, 0.5] | [85, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-tower-lang_btn-rank-2.png` ab7562ed-c13f-403b-a028-f89b78cb4314 |
| `/FantasyTowerLayer/CCNode_1/UIMenu_1/btn_reward` | UIMenuItemImage | [249.48, 35.2] | [0.5, 0.5] | [74, 66] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/promo/promotion_spr-gift-show.png` dee1b0c9-1dba-47eb-bc83-b9a9afbab37d |
| `/FantasyTowerLayer/CCNode_1/UIMenu_1/btn_info` | UIMenuItemImage | [67.977, 624.73] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/FantasyTowerLayer/node_energy` | CCNode | [0.0, 115.2] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/node_energy/spr_res_bg` | CCScale9Sprite | [116.951, 65.623] | [0.5, 0.5] | [160, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/other_spr-res-bg-1.png` 9e0821d8-aa54-4268-b04a-7362699ae052 insets[20, 20, 20, 20] |
| `/FantasyTowerLayer/node_energy/spr_res` | CCSprite | [55.193, 64.196] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901001.png` 7d086307-5909-4fe3-9a5a-505e4a79c1af |
| `/FantasyTowerLayer/node_energy/lbl_res` | UILabelTTF | [114.031, 64.175] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「200」60 STZhongsong.ttf rgbNone |
| `/FantasyTowerLayer/node_energy/lbl_time` | UILabelTTF | [64.7, 30.5] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「200」20 STZhongsong.ttf rgb[0, 249, 0] |
| `/FantasyTowerLayer/node_energy/CCMenu_1` | CCMenu | [17.418, -37.325] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLayer/node_energy/CCMenu_1/btn_add` | UIMenuItemImage | [153.264, 100] | [0.5, 0.5] | [38, 38] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-4.png` dc7cf03f-2de3-4d1d-953e-ff6dd51ef5c3 |
| `/FantasyTowerLayer/node_energy/CCMenu_1/btn_magic_tower` | UIMenuItemLabel | [125, 250] | [0.5, 0.5] | [206, 160] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/misc/fantasy-tower_btn-magic-tower.png` da2b5279-f4d1-4556-a2a8-733957beca5f · Label「幻魔塔」24 [255, 229, 138, 255] |
| `/FantasyTowerLayer/node_energy/lbl_time_text` | UILabelTTF | [161.02, 31.5] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「后恢复一次」20 STZhongsong.ttf rgb[255, 250, 255] |

## FantasyTowerLogCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerLogCell` | FantasyTowerLogCell | [0, 0] | [0, 0] | [540, 130] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLogCell/spr_bg10` | CCScale9Sprite | [0, 2.5] | [0.5, 0.5] | [540, 120] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/promo/promotion_spr-task-bg.png` 0dae8095-7dfd-4cc4-9fdb-99c94084418f insets[10, 10, 10, 10] |
| `/FantasyTowerLogCell/spr_head` | CCSprite | [57, 60.553] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FantasyTowerLogCell/spr_border` | CCSprite | [57, 60.6] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/FantasyTowerLogCell/spr_ribbon` | CCSprite | [50, 105] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mission-cell-bg/mission-cell-bg_bg5.png` 980751f1-4782-49cb-b9e4-41241f3286b3 |
| `/FantasyTowerLogCell/lbl_name` | UILabelTTF | [108, 82] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「——」20 STZhongsong.ttf rgb[122, 71, 45] |
| `/FantasyTowerLogCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLogCell/menu/btn_battle` | UIMenuItemLabel | [459.6, 62.5] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「查看」48 [255, 255, 255, 255] |
| `/FantasyTowerLogCell/menu/btn_share` | UIMenuItemImage | [343.895, 62.5] | [0.5, 0.5] | [78, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/hero/hero-share_spr-share.png` 6a5ee855-143c-47c1-a15c-c09fc7406f39 |
| `/FantasyTowerLogCell/lbl_title` | UILabelTTF | [26, 106] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「最快」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerLogCell/lbl_type` | UILabelTTF | [108, 48] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关时间:」20 STZhongsong.ttf rgb[231, 117, 42] |
| `/FantasyTowerLogCell/lbl_num` | UILabelTTF | [197, 48] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「———」20 STZhongsong.ttf rgb[231, 117, 42] |

## FantasyTowerLogLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerLogLayer` | FantasyTowerLogLayer | [0, 0] | [0, 0] | [600, 500] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLogLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [600.0, 500.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/FantasyTowerLogLayer/node_title` | CCNode | [300.0, 500.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLogLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FantasyTowerLogLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「通关战报」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FantasyTowerLogLayer/spr_scroll_bg` | CCScale9Sprite | [300.0, 219.889] | [0.5, 0.5] | [560, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FantasyTowerLogLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerLogLayer/menu/btn_close` | UIMenuItemImage | [564, 478.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FantasyTowerLogLayer/scroll_view` | UIScrollViewBackpack | [300.0, 220.472] | [0.5, 0.5] | [560, 390] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## FantasyTowerPreviewLayer（23）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerPreviewLayer` | FantasyTowerPreviewLayer | [0, 0] | [0, 0] | [622, 876] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerPreviewLayer/spr_bg` | CCScale9Sprite | [311.0, 438.0] | [0.5, 0.5] | [634.44, 893.52] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FantasyTowerPreviewLayer/CCSprite_1` | CCSprite | [311.0, 671.0] | [0.5, 0.5] | [540, 330] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-preview-bg.png` 9cbf8cdb-59f9-44f0-b3ba-15466c22aae2 |
| `/FantasyTowerPreviewLayer/node_title` | CCNode | [311.0, 876.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerPreviewLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FantasyTowerPreviewLayer/node_title/lbl_satge` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「第 xx 层」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FantasyTowerPreviewLayer/spr_box` | CCScale9Sprite | [311.0, 220.0] | [0.5, 0.5] | [540, 165] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-8.png` 96206ea9-3949-4721-8b3a-77405a465e9a insets[20, 20, 20, 20] |
| `/FantasyTowerPreviewLayer/lbl_battle` | UILabelTTF | [158, 417] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」22 STZhongsong.ttf rgb[32, 166, 0] |
| `/FantasyTowerPreviewLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerPreviewLayer/CCMenu_1/btn_close` | UIMenuItemImage | [557.723, 877.976] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FantasyTowerPreviewLayer/CCMenu_1/btn_sweep` | UIMenuItemLabel | [400, 91] | [0.5, 0.5] | [197, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」24 [255, 255, 255, 255] |
| `/FantasyTowerPreviewLayer/CCMenu_1/btn_report` | UIMenuItemImage | [536, 377] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail.png` ca1667e4-28c9-4a59-a214-d62c9f6bfaba |
| `/FantasyTowerPreviewLayer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [180, 91] | [0.5, 0.5] | [197, 60] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」24 [255, 255, 255, 255] |
| `/FantasyTowerPreviewLayer/scroll_view_reward` | CCScrollView | [311.0, 199.04] | [0.5, 0.5] | [520, 110] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/FantasyTowerPreviewLayer/lbl_sweep_times` | UILabelTTF | [311, 45] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「已扫荡: 3/10」42 STZhongsong.ttf rgb[120, 65, 0] |
| `/FantasyTowerPreviewLayer/CCLayerColor_1` | CCLayerColor | [311.0, 441.0] | [0.5, 0.5] | [520, 1.2] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[141, 89, 58] a255 |
| `/FantasyTowerPreviewLayer/UILabelTTF_1` | UILabelTTF | [51, 417] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「推荐战力:」22 STZhongsong.ttf rgb[120, 65, 0] |
| `/FantasyTowerPreviewLayer/UILabelTTF_2` | UILabelTTF | [51, 377] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「最快通关:」22 STZhongsong.ttf rgb[120, 65, 0] |
| `/FantasyTowerPreviewLayer/UILabelTTF_3` | UILabelTTF | [51, 337] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「最低战力:」22 STZhongsong.ttf rgb[120, 65, 0] |
| `/FantasyTowerPreviewLayer/lbl_name_quick` | UILabelTTF | [158, 377] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「虚位以待」22 STZhongsong.ttf rgb[231, 117, 42] |
| `/FantasyTowerPreviewLayer/lbl_name_low` | UILabelTTF | [158, 337] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「虚位以待」22 STZhongsong.ttf rgb[231, 117, 42] |
| `/FantasyTowerPreviewLayer/UILabelTTF_4` | UILabelTTF | [57, 281] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「挑战奖励」22 STZhongsong.ttf rgb[253, 251, 230] |
| `/FantasyTowerPreviewLayer/lbl_battle_tip` | UILabelTTF | [561, 41] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「挑战成功后可进行扫荡」20 STZhongsong.ttf rgb[109, 48, 0] |

## FantasyTowerRankCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerRankCell` | FantasyTowerRankCell | [0, 0] | [0, 0] | [480, 105] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerRankCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [480, 100] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-paimingk-1.png` da39b30c-711a-4b1f-9916-8d6f44421495 insets[10, 10, 10, 10] |
| `/FantasyTowerRankCell/spr_rank` | CCSprite | [44, 65] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/FantasyTowerRankCell/spr_head` | CCSprite | [120, 50] | [0.5, 0.5] | [91, 91] | [0.75, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FantasyTowerRankCell/lbl_name` | UILabelTTF | [165, 70] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「六字真言真六」56 STZhongsong.ttf rgb[85, 30, 20] |
| `/FantasyTowerRankCell/lbl_level` | UILabelTTF | [165, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100级」48 STZhongsong.ttf rgb[148, 107, 80] |
| `/FantasyTowerRankCell/lbl_rank` | UILabelTTF | [44, 50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/FantasyTowerRankCell/lbl_num` | UILabelTTF | [403, 50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」48 STZhongsong.ttf rgb[148, 107, 80] |

## FantasyTowerRewardCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerRewardCell` | FantasyTowerRewardCell | [0, 0] | [0, 0] | [570, 160] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 2] | [0.5, 0.5] | [570, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-10.png` 79ef5d57-5675-42b8-abd0-18a1af735679 insets[10, 10, 10, 10] |
| `/FantasyTowerRewardCell/lbl_title` | UILabelTTF | [20, 135] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关100关(0/100)」20 STZhongsong.ttf rgb[122, 71, 45] |
| `/FantasyTowerRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerRewardCell/menu/btn_battle` | UIMenuItemLabel | [493.6, 60] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「前 往」40 [255, 255, 255, 255] |

## FantasyTowerTipRewardCell（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FantasyTowerTipRewardCell` | FantasyTowerTipRewardCell | [0, 0] | [0, 0] | [150, 180] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerTipRewardCell/spr_reward_bg` | CCSprite | [75, 99] | [0.5, 0.5] | [150, 150] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/chapter-reward/chapter-reward_spr-item-bg-1.png` 58f18b57-09c0-4696-b8a5-cd4016e0eec2 |
| `/FantasyTowerTipRewardCell/scroll_view_reward1` | UIScrollViewBackpack | [75, 92.49] | [0.5, 0.5] | [100, 100] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/FantasyTowerTipRewardCell/menu` | CCMenu | [75.0, 20.52] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FantasyTowerTipRewardCell/menu/btn_touch` | UIMenuItemImage | [0, 74] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/FantasyTowerTipRewardCell/CCSprite_1` | CCSprite | [75.0, 49.0] | [0.5, 0.5] | [240, 40] | [0.5, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/hero-arrive_spr-shadow.png` 03f50dff-cafe-42f5-b828-452d1d7e4090 |
| `/FantasyTowerTipRewardCell/lbl_mission` | UILabelTTF | [75.0, 49.08] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「——」20 STZhongsong.ttf rgb[0, 249, 0] |
| `/FantasyTowerTipRewardCell/CCSprite_2` | CCSprite | [113, 124] | [0.5, 0.5] | [53, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-tower_spr-bg-11.png` 31f2c3fe-da0d-481c-8bcd-e4d02502c1e0 |
| `/FantasyTowerTipRewardCell/lbl_tip` | UILabelTTF | [113, 124] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「——」20 STZhongsong.ttf rgb[254, 255, 255] |

## FloatingIslandsBossLayer（60）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FloatingIslandsBossLayer` | FloatingIslandsBossLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-clan-boss-1.jpg` 3d30ea0b-479e-4d24-bbfc-3d0df596520c |
| `/FloatingIslandsBossLayer/CCLayerColor_1` | CCLayerColor | [0.0, 0.0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a170 |
| `/FloatingIslandsBossLayer/node_center` | CCNode | [320.0, 605.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_center/CCNode_1` | CCNode | [0, -35] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/node_boss` | CCNode | [0, 59] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/spr_bg2` | CCScale9Sprite | [0, -192] | [0.5, 0.5] | [430, 160] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets[22, 22, 22, 22] |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [0, -216] | [0.5, 0.5] | [400, 82] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/hero/hero-info_spr-new-8.png` 7ca842a7-aafa-4322-91bc-113a22564392 insets[40, 40, 60, 60] |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/scroll_view_skill` | UIScrollViewBackpack | [0, -255.949] | [0.5, 0] | [360, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/CCSprite_1` | CCSprite | [145, -142] | [0.5, 0.5] | [119, 18] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line3.png` af771a34-21c6-45e4-ab37-64ba2873147d |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/CCSprite_2` | CCSprite | [-145, -142] | [0.5, 0.5] | [119, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line3.png` af771a34-21c6-45e4-ab37-64ba2873147d |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/lbl_skill_tip` | UILabelTTF | [0, -144] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「首领技能」32 FZCSJW--GB1-0.ttf rgb[138, 95, 71] |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/CCSprite_3` | CCSprite | [-204, 117] | [0.5, 0.5] | [52, 209] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/dragon/dragon_identify-result_spr-name-bg.png` 03dd3612-d676-44ff-9aea-0634c1717859 |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/lbl_boss_name2` | UILabelTTF | [-204, 223] | [0.5, 1] | [80, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「上古遗物◆优秀」48 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_center/CCNode_1/CCMenu_1/btn_anecdotes` | UIMenuItemImage | [-204, -20] | [0.5, 0.5] | [66, 71] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/lang-1_spr-anecdotes-1.png` ff6d1841-0c9b-4979-ac69-bcc1329adc1c |
| `/FloatingIslandsBossLayer/node_boss_name` | CCNode | [320.0, 809.25] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_boss_name/spr_boss_name_bg` | CCSprite | [0, 55] | [0.5, 0.5] | [328, 116] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/clan/clan-boss_spr-boss-name-bg.png` 280bbddb-249c-42fd-a1f6-25e8affdb531 |
| `/FloatingIslandsBossLayer/node_boss_name/lbl_boss_name` | UILabelTTF | [0, 35.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「超级大BOSS」64 FZCSJW--GB1-0.ttf rgb[224, 240, 255] |
| `/FloatingIslandsBossLayer/node_rank` | CCNode | [640.0, 778.5] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_rank/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_rank/CCMenu_1/btn_back` | UIMenuItemImage | [-77.67, 116.334] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/FloatingIslandsBossLayer/node_rank/CCMenu_1/btn_info` | UIMenuItemImage | [-41.87, 50.134] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/FloatingIslandsBossLayer/node_rank/CCMenu_1/btn_reward` | UIMenuItemLabel | [-48.5, -292] | [0.5, 0.5] | [58, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/floating-Islands/floating-Islands_spr-rank-1.png` 3a4904d7-34d3-403e-b7d7-f11ee3362639 · Label「排名奖励」32 [255, 255, 255, 255] |
| `/FloatingIslandsBossLayer/node_rank/CCMenu_1/btn_shop` | UIMenuItemLabel | [-48.5, -389] | [0.5, 0.5] | [58, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/floating-Islands/floating-Islands_spr-shop-1.png` 5445afad-ada8-46d6-b379-f717979e3d6c · Label「代币商店」32 [255, 255, 255, 255] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1` | CCNode | [-162.891, -232.791] | [0, 0] | [0, 0] | [0.9, 0.9] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/spr_rank_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [180, 258] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/clan/clan_spr-bg-mission-rank.png` 8bfcaaed-d964-42a1-8655-707663d36081 insets[10, 10, 10, 10] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_title` | UILabelTTF | [90, 232] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「伤害排行前三」36 FZCSJW--GB1-0.ttf rgb[245, 208, 130] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/CCMenu_1/btn_rank` | UIMenuItemImage | [90, 30] | [0.5, 0.5] | [123, 36] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/clan/clan-lang_btn-rank-detail.png` 3e73721b-ffc3-469c-ba7f-fd8bf5d5ce94 |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/spr_rank_1` | CCSprite | [25, 190] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-1.png` 1265e592-b04d-43b8-a16b-7c4d19d2f55b |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/spr_rank_2` | CCSprite | [25, 140] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-2.png` d43bc0ea-7802-460b-8830-ade683614456 |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/spr_rank_3` | CCSprite | [25, 90] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-rank-3.png` 365cb8ab-6912-4bab-a6c7-c383d5987b90 |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_name_1` | UILabelTTF | [50, 200] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家第一名啊」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_damage_1` | UILabelTTF | [50, 180] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[1000万伤害]」36 FZCSJW--GB1-0.ttf rgb[255, 176, 52] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_name_2` | UILabelTTF | [50, 150] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家第二名啊」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_damage_2` | UILabelTTF | [50, 130] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[2000万伤害]」36 FZCSJW--GB1-0.ttf rgb[255, 176, 52] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_name_3` | UILabelTTF | [50, 100] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家第三名啊」36 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/FloatingIslandsBossLayer/node_rank/CCNode_1/lbl_rank_damage_3` | UILabelTTF | [50, 80] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「[3000万伤害]」36 FZCSJW--GB1-0.ttf rgb[255, 176, 52] |
| `/FloatingIslandsBossLayer/spr_bottom_bg` | CCScale9Sprite | [320.0, 87.36] | [0.5, 0] | [640, 333] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fetters_spr-mainview-scrollview-bg.png` 41d25a8e-499a-4a03-9f15-0ff5e1f63b95 |
| `/FloatingIslandsBossLayer/node_bottom` | CCNode | [320.0, 87.36] | [0.5, 0] | [640, 333] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_bottom/node_bg` | CCScale9Sprite | [0.0, 105.852] | [0.5, 0] | [540, 150] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FloatingIslandsBossLayer/node_bottom/CCSprite_1` | CCSprite | [-175.0, 283] | [0.5, 0.5] | [119, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line3.png` af771a34-21c6-45e4-ab37-64ba2873147d |
| `/FloatingIslandsBossLayer/node_bottom/CCSprite_2` | CCSprite | [175.0, 283] | [0.5, 0.5] | [119, 18] | [-1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-line3.png` af771a34-21c6-45e4-ab37-64ba2873147d |
| `/FloatingIslandsBossLayer/node_bottom/lbl_damage_tip1` | UILabelTTF | [0.0, 282] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「全服累计伤害」32 FZCSJW--GB1-0.ttf rgb[138, 95, 71] |
| `/FloatingIslandsBossLayer/node_bottom/lbl_damage_tip2` | UILabelTTF | [-254.0, 222] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前服累计伤害活动结束玩家可领取」24 FZCSJW--GB1-0.ttf rgb[138, 95, 71] |
| `/FloatingIslandsBossLayer/node_bottom/spr_hp_bg` | CCSprite | [0.0, 170.3] | [0.5, 0.5] | [512, 22] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/prog_jdt1-3.png` bf56cd1b-1405-4afd-a22c-95b7c3e4fc41 |
| `/FloatingIslandsBossLayer/node_bottom/lbl_hp` | UILabelTTF | [0.0, 170.3] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「30/1000」20 FZCSJW--GB1-0.ttf rgbNone |
| `/FloatingIslandsBossLayer/node_bottom/lbl_damage` | UILabelTTF | [0.0, 128] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前服累计伤害活动结束玩家可领取」19 FZCSJW--GB1-0.ttf rgb[138, 95, 71] |
| `/FloatingIslandsBossLayer/node_bottom/CCMenu_1` | CCMenu | [-320.0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_bottom/CCMenu_1/CCMenuItemImage_1` | CCMenuItemImage | [517, 222] | [0.5, 0.5] | [114, 35] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/lang-1_spr-reward-2.png` 0b8c4dc9-936f-4332-a42d-7e279d3f8437 |
| `/FloatingIslandsBossLayer/node_bottom/CCMenu_1/btn_battle` | UIMenuItemLabel | [320, 64.8] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-4.png` 0bddc3ab-272f-44ad-a4af-c6fcae85a74c · Label「开始讨伐」48 [255, 255, 255, 255] |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1` | CCNode | [309.0, 93] | [0, 0] | [0.0, 0.0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/lbl_challenge_count_text` | UILabelTTF | [-104.0, -16.0] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「挑战次数：」18 CloudYuanCuGBK.ttf rgb[142, 90, 60] |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/lbl_buy_count_text` | UILabelTTF | [-43.0, -51.0] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「剩余购买次数：」19 CloudYuanCuGBK.ttf rgb[142, 90, 60] |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/lbl_buy_count` | UILabelTTF | [-24.0, -49.0] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」20 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [-103.0, -32.0] | [0.5, 0.5] | [59, 30] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-41.png` 4231f6d4-4d92-4525-99a4-78a8c7019934 insets[5, 5, 5, 5] |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-32, -18] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/FloatingIslandsBossLayer/node_bottom/CCNode_1/lbl_challenge_count` | UILabelTTF | [-71.0, -19.32] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0/2」18 CloudYuanCuGBK.ttf rgb[255, 247, 239] |

## FloatingIslandsDamageCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FloatingIslandsDamageCell` | FloatingIslandsDamageCell | [0, 0] | [0, 0] | [540, 110] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsDamageCell/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [537, 104] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/floating-Islands/floating-Islands_spr-bg-1.png` 76182562-92b4-408f-aab8-f26819f511ea insets[25, 25, 10, 10] |
| `/FloatingIslandsDamageCell/spr_unit` | CCSprite | [168, 51] | [0.5, 0.5] | [55, 55] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_spr-billion-1.png` 79e95835-f9df-4926-84e0-477541df845f |
| `/FloatingIslandsDamageCell/lbl_damage` | CCLabelBMFont | [132, 49] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「30」BMFont red-50.fnt e2e367cf-65b6-4ef6-91f3-f4544a33877c |
| `/FloatingIslandsDamageCell/scroll_view` | UIScrollViewBackpack | [527.0, 4.75] | [1, 0] | [310, 90] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## FloatingIslandsDamageLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FloatingIslandsDamageLayer` | FloatingIslandsDamageLayer | [0, 0] | [0, 0] | [600, 840] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsDamageLayer/spr_bg` | CCScale9Sprite | [300.0, 0.0] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FloatingIslandsDamageLayer/node_title` | CCNode | [300.0, 831.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsDamageLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FloatingIslandsDamageLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FloatingIslandsDamageLayer/spr_panel_bg` | CCScale9Sprite | [300.0, 95.0] | [0.5, 0] | [542.5, 660] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FloatingIslandsDamageLayer/scroll_view` | UIScrollViewBackpack | [300.0, 105.0] | [0.5, 0] | [540, 640] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/FloatingIslandsDamageLayer/lbl_tip1` | UILabelTTF | [300.0, 56.0] | [0.5, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「———」20 STZhongsong.ttf rgb[120, 65, 0] |
| `/FloatingIslandsDamageLayer/CCSprite_1` | CCSprite | [300.0, -20.0] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/FloatingIslandsDamageLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsDamageLayer/UIMenu_1/btn_close` | UIMenuItemImage | [525, 831] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## FloatingIslandsEndCell（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FloatingIslandsEndCell` | FloatingIslandsEndCell | [0, 0] | [0, 0] | [640, 370] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsEndCell/CCSprite_1` | CCSprite | [320, 214] | [0.5, 0.5] | [510, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/battle/battle-end_spr-title.png` 6cd712d2-1ae7-4ac2-97de-4626cac1eb6c |
| `/FloatingIslandsEndCell/lbl_attr_1` | UILabelTTF | [214, 214] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「伤害：」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/FloatingIslandsEndCell/lbl_damage` | UILabelTTF | [279, 214] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[254, 222, 145] |
| `/FloatingIslandsEndCell/scroll_view` | UIScrollViewBackpack | [320, 38] | [0.5, 0] | [640, 140] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## FloatingIslandsRewardCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FloatingIslandsRewardCell` | FloatingIslandsRewardCell | [0, 0] | [0, 0] | [540, 110] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [5, 0] | [0.5, 0.5] | [530, 100] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/FloatingIslandsRewardCell/spr_rank` | CCSprite | [40, 65] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/FloatingIslandsRewardCell/lbl_rank` | UILabelTTF | [32, 48] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/FloatingIslandsRewardCell/menu` | UIMenu | [5, -5] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsRewardCell/lbl_my_rank` | UILabelTTF | [40, 68] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/FloatingIslandsRewardCell/lbl_my_rank_tip` | UILabelTTF | [40, 33] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[213, 112, 31] |
| `/FloatingIslandsRewardCell/scroll_view` | UIScrollViewBackpack | [183, 10] | [0, 0] | [320, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## FloatingIslandsRewardLayer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FloatingIslandsRewardLayer` | FloatingIslandsRewardLayer | [0, 0] | [0, 0] | [600, 880] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsRewardLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 900] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FloatingIslandsRewardLayer/node_title` | CCNode | [300.0, 880.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsRewardLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FloatingIslandsRewardLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名奖励」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FloatingIslandsRewardLayer/spr_rank_bg` | CCScale9Sprite | [30, 212.0] | [0.5, 0.5] | [540, 585] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FloatingIslandsRewardLayer/spr_my_bg` | CCScale9Sprite | [30, 81.833] | [0.5, 0.5] | [540, 115] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/FloatingIslandsRewardLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FloatingIslandsRewardLayer/menu/btn_close` | UIMenuItemImage | [550, 855] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FloatingIslandsRewardLayer/spr_rank_title_bg` | CCScale9Sprite | [35, 749] | [0.5, 0.5] | [530, 41] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/super-stage_block-3.png` 40f0127f-a83e-453c-b858-6739f7a0c534 insets[12, 12, 12, 12] |
| `/FloatingIslandsRewardLayer/lbl_title_1` | UILabelTTF | [131.96, 767.8] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排名」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/FloatingIslandsRewardLayer/lbl_title_1` | UILabelTTF | [430.04, 767.84] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「獎勵」22 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/FloatingIslandsRewardLayer/lbl_title_1` | UILabelTTF | [542.36, 55.847] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「獎勵每日22:00通過郵件發放」18 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/FloatingIslandsRewardLayer/spr_line_1` | CCSprite | [196.454, 769] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |

## PlaneWarInstance（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarInstance` | PlaneWarInstance | [0, 0] | [0, 0] | [270, 70] | [1, 1] | 0 | 是 |  |
| `/PlaneWarInstance/bg` | CCSprite | [154.0, 35.0] | [0.5, 0.5] | [242, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_instance-bg.png` 2f46f7b8-a63e-4772-8463-e7b8ac7f543d |
| `/PlaneWarInstance/bg/spr_icon` | CCSprite | [-121.0, 0.0] | [0.5, 0.5] | [46, 46] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_instance-none-icon.png` 0953e5b0-ab96-4908-bae4-9abc62bc6382 |
| `/PlaneWarInstance/bg/spr_boss_icon` | CCSprite | [-121.0, 0.0] | [0.5, 0.5] | [0, 0] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE  |
| `/PlaneWarInstance/bg/CCSprite_1` | CCSprite | [-121.0, 0.0] | [0.5, 0.5] | [68, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_instance-border.png` af3a44c8-7920-4e6c-8b65-c4e4abdda52e |
| `/PlaneWarInstance/bg/lbl_name` | UILabelTTF | [-85.0, 11.2] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「火之城」40 CloudYuanCuGBK.ttf rgb[222, 222, 230] |
| `/PlaneWarInstance/bg/lbl_open_day` | UILabelTTF | [-85.0, -11.8] | [0, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「周二，周末开发」36 CloudYuanCuGBK.ttf rgb[255, 101, 72] |
| `/PlaneWarInstance/bg/lbl_time` | UILabelTTF | [-85.0, -11.8] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」36 CloudYuanCuGBK.ttf rgb[0, 249, 1] |

## PlaneWarMainLayer（26）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarMainLayer` | PlaneWarMainLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_plane-war-bg.png` f70eae38-2297-4cbc-b121-bda8e545ed4b |
| `/PlaneWarMainLayer/node_map` | CCNode | [0.986, 69.453] | [0, 0] | [640.0, 850] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_map/spr_instance_bg` | CCSprite | [320.0, 425.0] | [0.5, 0.5] | [640, 1070] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_plane-war-top-bg.png` dd8a65f2-ffac-4958-8c05-0bfae170c207 |
| `/PlaneWarMainLayer/node_map/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640.0, 850.0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_map/CCMenu_1/btn_elem_1` | UIMenuItemImage | [450.714, 115.98] | [0.5, 0.5] | [321, 188] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/plane-war/plane-war_elem-1-icon.png` 2036698d-e4a1-4ea9-acdc-ee00df24a7e9 |
| `/PlaneWarMainLayer/node_map/CCMenu_1/btn_elem_2` | UIMenuItemImage | [470.0, 419.0] | [0.5, 0.5] | [259, 243] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/plane-war/plane-war_elem-2-icon.png` 50629a0e-c7ef-44d5-91f6-3a83883e8471 |
| `/PlaneWarMainLayer/node_map/CCMenu_1/btn_elem_3` | UIMenuItemImage | [160.72, 269.24] | [0.5, 0.5] | [290, 271] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/plane-war/plane-war_elem-3-icon.png` d4fed0d9-bae6-40de-9d23-91c30af4bb72 |
| `/PlaneWarMainLayer/node_map/CCMenu_1/btn_elem_4` | UIMenuItemImage | [377.0, 723.0] | [0.5, 0.5] | [335, 315] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/plane-war/plane-war_elem-4-icon.png` 2b441906-483b-46c8-9ff5-059b9c5f5072 |
| `/PlaneWarMainLayer/node_map/CCMenu_1/btn_elem_5` | UIMenuItemImage | [154.52, 528.72] | [0.5, 0.5] | [282, 266] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/plane-war/plane-war_elem-5-icon.png` 5e1bdcb5-0e58-4742-a8ad-03629dfbef30 |
| `/PlaneWarMainLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 250] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_top/CCSprite_1` | CCSprite | [320.0, -3.0] | [0.5, 1] | [332, 88] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-title-1.png` 412aa638-3416-4429-92e5-725f2db81152 |
| `/PlaneWarMainLayer/node_top/UILabelTTF_1` | UILabelTTF | [320.0, -46.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「位面之战」60 STZhongsong.ttf rgb[254, 255, 255] |
| `/PlaneWarMainLayer/node_top/top_menu_2` | CCMenu | [575.0, -66.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_top/top_menu_2/btn_back` | UIMenuItemImage | [-5, 0] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/PlaneWarMainLayer/node_top/top_menu_2/btn_info` | UIMenuItemImage | [26.926, -66.204] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/PlaneWarMainLayer/node_top/top_menu_2/btn_rank` | UIMenuItemLabel | [26.04, -134.48] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-new-rank.png` 3ec50aa3-85d4-4fa2-8ebc-b3521e7753c3 · Label「排行榜」32 [255, 255, 255, 255] |
| `/PlaneWarMainLayer/node_bottom` | CCNode | [0.0, -158.4] | [0, 0] | [640.0, 65] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_bottom/node_times` | CCNode | [627.2, 48.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_bottom/node_times/CCSprite_1` | CCSprite | [-80, 0] | [0.5, 0.5] | [101, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_block-4.png` 331393fe-3bdb-46e0-8ef0-1f8c352e00b5 |
| `/PlaneWarMainLayer/node_bottom/node_times/lbl_times_title` | UILabelTTF | [-135, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战次数:」36 CloudYuanCuGBK.ttf rgb[253, 224, 177] |
| `/PlaneWarMainLayer/node_bottom/node_times/lbl_times_buy_title` | UILabelTTF | [-100, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「剩余购买次数:」36 CloudYuanCuGBK.ttf rgb[253, 229, 190] |
| `/PlaneWarMainLayer/node_bottom/node_times/lbl_times_buy` | UILabelTTF | [-94, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/PlaneWarMainLayer/node_bottom/node_times/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMainLayer/node_bottom/node_times/CCMenu_1/btn_add_times` | UIMenuItemImage | [-17, 0] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/PlaneWarMainLayer/node_bottom/node_times/lbl_times` | UILabelTTF | [-80, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0/10」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |

## PlaneWarMissionCell（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarMissionCell` | PlaneWarMissionCell | [0, 0] | [0, 0] | [570, 120] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionCell/spr_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [570.0, 120.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-6.png` 980100d4-181c-4200-859e-393b942db870 insets[40, 40, 40, 40] |
| `/PlaneWarMissionCell/spr_ribbon` | CCSprite | [50.0, 97.0] | [0.5, 0.5] | [109, 43] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/mission-cell-bg/mission-cell-bg_bg1.png` 6f3b8893-2d08-4618-9b91-4e743b250184 |
| `/PlaneWarMissionCell/lbl_title` | UILabelTTF | [20.685, 99.0] | [0, 0.5] | auto | [1, 1] | 0 | **否** | cc.Label「地狱一」18 STZhongsong.ttf rgb[254, 255, 254] |
| `/PlaneWarMissionCell/menu` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionCell/menu/btn_battle` | UIMenuItemLabel | [484.6, 60] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「」40 [255, 255, 255, 255] |
| `/PlaneWarMissionCell/menu/btn_clean` | UIMenuItemLabel | [484.6, 60] | [0.5, 0.5] | [102, 44] | [1.2, 1.2] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「」40 [255, 255, 255, 255] |
| `/PlaneWarMissionCell/lbl_mission` | UILabelTTF | [45.0, 57.0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1」60 STZhongsong.ttf rgb[254, 255, 255] |

## PlaneWarMissionLayer（30）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarMissionLayer` | PlaneWarMissionLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/spr_bg` | CCSprite | [0.0, 1280.0] | [0, 1] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_boss-bg.png` f9511a57-4f91-43c6-a5b7-eb091f80c776 |
| `/PlaneWarMissionLayer/node_top` | CCNode | [0.0, 960.0] | [0, 1] | [640.0, 140] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_top/CCNode_1` | CCNode | [640.0, 0.0] | [1, 1] | [640.0, 140.0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_top/CCNode_1/UIMenu_1` | UIMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_top/CCNode_1/UIMenu_1/btn_back` | UIMenuItemImage | [-71.435, -47.079] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/PlaneWarMissionLayer/node_middle` | CCNode | [0.0, 576.0] | [0, 0] | [640.0, 346] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_middle/CCSprite_1` | CCSprite | [178.8, 173.0] | [0.5, 0.5] | [356, 346] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_boss-glow.png` 31bc85a9-bbd4-40cc-af72-a0c1122840e4 |
| `/PlaneWarMissionLayer/node_middle/node_boss` | CCNode | [184.0, 63.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_middle/CCSprite_2` | CCSprite | [506.0, 281.0] | [0.5, 0.5] | [209, 52] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_boss-name-bg.png` f08a3b9d-dca3-4000-8d7b-6b2f0d9b20eb |
| `/PlaneWarMissionLayer/node_middle/lbl_boss_name` | UILabelTTF | [425.401, 283.07] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我叫Boss」48 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/PlaneWarMissionLayer/node_middle/CCSprite_3` | CCSprite | [499.471, 226.556] | [0.5, 0.5] | [163, 35] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_boss-desc-bg.png` 3fea7b98-ac21-48df-8d84-3ede6f7054a4 |
| `/PlaneWarMissionLayer/node_middle/CCSprite_3/UILabelTTF_1` | UILabelTTF | [-70.09, 0.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性克制」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/PlaneWarMissionLayer/node_middle/lbl_desc` | UILabelTTF | [431.0, 208.0] | [0, 1] | [360, 0] | [0.5, 0.5] | 0 | 是 | cc.Label「」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/PlaneWarMissionLayer/node_middle/CCSprite_4` | CCSprite | [499.471, 96.88] | [0.5, 0.5] | [163, 35] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/plane-war/plane-war_boss-desc-bg.png` 3fea7b98-ac21-48df-8d84-3ede6f7054a4 |
| `/PlaneWarMissionLayer/node_middle/CCSprite_4/UILabelTTF_1` | UILabelTTF | [-70.09, 0.0] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「属性克制」40 CloudYuanCuGBK.ttf rgb[254, 255, 255] |
| `/PlaneWarMissionLayer/node_middle/spr_skill` | CCSprite | [498.56, 38.06] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE  |
| `/PlaneWarMissionLayer/node_mission` | CCNode | [0.0, 96.0] | [0, 0] | [640.0, 500] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_mission/spr_mission_bg` | CCScale9Sprite | [10.0, 0] | [0.5, 0.5] | [620.0, 500.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/PlaneWarMissionLayer/node_mission/scroll_view_bg` | CCScale9Sprite | [320.0, 250.0] | [0.5, 0.5] | [569.6, 430.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[8, 8, 8, 8] |
| `/PlaneWarMissionLayer/node_mission/scroll_view` | UIScrollViewBackpack | [320.0, 44.565] | [0.5, 0] | [560.0, 410.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/PlaneWarMissionLayer/node_bottom` | CCNode | [0.0, 48.0] | [0, 0] | [640.0, 65] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_bottom/node_times` | CCNode | [608.0, 48.75] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_bottom/node_times/CCSprite_1` | CCSprite | [-80, 0] | [0.5, 0.5] | [101, 27] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/super-stage_block-4.png` 331393fe-3bdb-46e0-8ef0-1f8c352e00b5 |
| `/PlaneWarMissionLayer/node_bottom/node_times/lbl_times_title` | UILabelTTF | [-135, 0] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「挑战次数:」36 CloudYuanCuGBK.ttf rgb[253, 224, 177] |
| `/PlaneWarMissionLayer/node_bottom/node_times/lbl_times_buy_title` | UILabelTTF | [-100, -30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「剩余购买次数:」36 CloudYuanCuGBK.ttf rgb[253, 229, 190] |
| `/PlaneWarMissionLayer/node_bottom/node_times/lbl_times_buy` | UILabelTTF | [-94, -30] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」36 CloudYuanCuGBK.ttf rgb[133, 226, 75] |
| `/PlaneWarMissionLayer/node_bottom/node_times/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarMissionLayer/node_bottom/node_times/CCMenu_1/btn_add_times` | UIMenuItemImage | [-17, 0] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-add-2.png` 5cf601c5-02ae-46fe-a60e-862a4b2f21bb |
| `/PlaneWarMissionLayer/node_bottom/node_times/lbl_times` | UILabelTTF | [-80, 0] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0/10」36 CloudYuanCuGBK.ttf rgb[255, 247, 239] |

## PlaneWarRankCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarRankCell` | PlaneWarRankCell | [0, 0] | [0, 0] | [540, 106] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/PlaneWarRankCell/firend_menu` | UIMenu | [19, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankCell/firend_menu/spr_photo_btn` | CCMenuItemImage | [105, 57] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PlaneWarRankCell/spr_rank` | CCSprite | [45, 105] | [0.5, 1] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/PlaneWarRankCell/lbl_rank` | UILabelTTF | [50, 50] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「1000」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/PlaneWarRankCell/CCSprite_1` | CCSprite | [196, 39] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/PlaneWarRankCell/lbl_name` | UILabelTTF | [185, 71] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[119, 70, 42] |
| `/PlaneWarRankCell/spr_photo` | CCSprite | [125, 57] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PlaneWarRankCell/spr_frame` | CCSprite | [126, 56] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PlaneWarRankCell/lbl_max` | UILabelTTF | [507, 55] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/PlaneWarRankCell/lbl_fight` | UILabelTTF | [209, 39] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」20 STZhongsong.ttf rgb[119, 70, 42] |

## PlaneWarRankLayer（30）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarRankLayer` | PlaneWarRankLayer | [0, 0] | [0, 0] | [600, 830] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [620, 850] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/PlaneWarRankLayer/node_title` | CCNode | [300.0, 830.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/PlaneWarRankLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排行榜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/PlaneWarRankLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankLayer/CCMenu_1/btn_close` | UIMenuItemImage | [548, 807] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/PlaneWarRankLayer/CCMenu_1/btn_right` | UIMenuItemTab | [292, 702] | [0, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-7.png` 8a3c8429-0946-4341-8fe0-bc3c6237a448 pressed `ui/common/button_btn-tab-8.png` aac0291d-cbbf-48cb-9486-944e18e9e5cd · Label「奖励一览」40 [255, 255, 255, 255] |
| `/PlaneWarRankLayer/CCMenu_1/btn_left` | UIMenuItemTab | [307, 702] | [1, 0.5] | [182, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-tab-5.png` cb1763a1-1c5e-4bbb-917b-60ce5d2a0a29 pressed `ui/common/button_btn-tab-6.png` afc83047-64f9-4849-ada1-664a37bb42de · Label「排行榜」40 [255, 255, 255, 255] |
| `/PlaneWarRankLayer/rank` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankLayer/rank/rank_scroll_bg` | CCScale9Sprite | [25, 150] | [0.5, 0.5] | [550, 520] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/PlaneWarRankLayer/rank/spr_self_bg` | CCScale9Sprite | [25, 25] | [0.5, 0.5] | [550, 116] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/PlaneWarRankLayer/rank/CCNode_1` | CCNode | [25, 24] | [0, 0] | [550, 116] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankLayer/rank/CCNode_1/CCScale9Sprite_1` | CCScale9Sprite | [6, 6] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/PlaneWarRankLayer/rank/CCNode_1/spr_photo` | CCSprite | [132, 61] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PlaneWarRankLayer/rank/CCNode_1/spr_frame` | CCSprite | [132, 61] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/PlaneWarRankLayer/rank/CCNode_1/firend_menu` | UIMenu | [28, 2] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRankLayer/rank/CCNode_1/firend_menu/spr_photo1` | CCMenuItemImage | [104, 57] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/PlaneWarRankLayer/rank/CCNode_1/lbl_rank` | UILabelTTF | [29, 58] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「未上榜」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/PlaneWarRankLayer/rank/CCNode_1/lbl_name` | UILabelTTF | [187, 73] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」20 STZhongsong.ttf rgb[119, 70, 42] |
| `/PlaneWarRankLayer/rank/CCNode_1/lbl_fight` | UILabelTTF | [212, 41] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100000000」20 STZhongsong.ttf rgb[119, 70, 42] |
| `/PlaneWarRankLayer/rank/CCNode_1/CCSprite_1` | CCSprite | [197, 39] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/PlaneWarRankLayer/rank/CCNode_1/lbl_max` | UILabelTTF | [521, 57] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「通关奖励」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/PlaneWarRankLayer/reward` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | **否** |  |
| `/PlaneWarRankLayer/reward/reward_scroll_bg` | CCScale9Sprite | [27, 47] | [0.5, 0.5] | [550, 621] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/PlaneWarRankLayer/reward/spr_rank_title_bg` | CCScale9Sprite | [31, 620] | [0.5, 0.5] | [540, 42] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg.png` 27fd7cc6-1893-4173-9be3-0f5dfd7eccf0 insets[12, 12, 12, 12] |
| `/PlaneWarRankLayer/reward/lbl_title_2` | CCLabelTTF | [363, 640] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「奖励」48 STZhongsong.ttf rgb[113, 75, 39] |
| `/PlaneWarRankLayer/reward/lbl_title_1` | CCLabelTTF | [100, 643] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「排名」48 STZhongsong.ttf rgb[113, 75, 39] |
| `/PlaneWarRankLayer/reward/spr_line_1` | CCSprite | [170, 640] | [0.5, 0.5] | [2, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-line.png` 1c6b68cd-2e4a-4481-9b25-4d408c9f2e8b |
| `/PlaneWarRankLayer/reward/lbl_title_2` | UILabelTTF | [555.098, 29.585] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「」36 STZhongsong.ttf rgb[141, 89, 58] |

## PlaneWarRewardCell（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/PlaneWarRewardCell` | PlaneWarRewardCell | [0, 0] | [0, 0] | [540, 106] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRewardCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 106] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/PlaneWarRewardCell/spr_rank` | CCSprite | [52, 105] | [0.5, 1] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/PlaneWarRewardCell/lbl_rank` | UILabelTTF | [20, 60] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「201-999」56 STZhongsong.ttf rgb[254, 255, 255] |
| `/PlaneWarRewardCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/PlaneWarRewardCell/lbl_my_rank_tip` | UILabelTTF | [35, 38] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「保持排名可获得」40 STZhongsong.ttf rgb[213, 112, 31] |
| `/PlaneWarRewardCell/lbl_my_rank` | UILabelTTF | [35, 73] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「00」40 STZhongsong.ttf rgb[254, 255, 255] |
