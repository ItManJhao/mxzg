# Prefab 1:1 九宫格偏差清单（P1 + P2 + P3）

Manager 裁定：一张图的 .meta 已有边距（P1/P2 改过的，或原本就有）而某些节点按 ccbi insets 换算出的值不同时，**保留现有 .meta 值**，不改。这些节点会按现值 SLICED 显示，与老版可能有几像素的差别，统一在这里列出。P3 内部同一张图要两套值时，取用得多的那套，其余节点也列在这里。

基线 main@c3e81f83（P1 #199、P2 #201/#200/#202 已合）。T/B/L/R = top/bottom/left/right。

## 汇总

| meta | .meta 现值/采用值 T/B/L/R | 节点要求值 → 节点数（按批次） |
|---|---|---|
| `ui/common/win-bg_win-bg-11.png` | [59, 59, 59, 59] | [74, 74, 74, 74]→1 (P3B2); [79, 79, 79, 79]→1 (P1); [79, 79, 79, 79]→3 (P2A); [79, 79, 79, 79]→4 (P2B); [79, 79, 79, 79]→5 (P2C); [79, 79, 79, 79]→12 (P3A); [79, 79, 79, 79]→12 (P3B1); [79, 79, 79, 79]→6 (P3B2); [79, 79, 79, 79]→10 (P3C); [79, 79, 79, 79]→3 (P3D1); [79, 79, 79, 79]→7 (P3D2); [79, 79, 79, 79]→1 (P3E1); [79, 79, 79, 79]→2 (P3E2); [79, 79, 79, 79]→9 (P3F); [79, 79, 79, 79]→6 (P3G); [79, 79, 79, 79]→4 (P3H) |
| `ui/common/win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7]→1 (P3A); [7, 7, 7, 7]→1 (P3B1); [7, 7, 7, 7]→1 (P3B2); [9, 9, 9, 9]→4 (P1); [9, 9, 9, 9]→13 (P2A); [9, 9, 9, 9]→3 (P2C); [9, 9, 9, 9]→11 (P3A); [9, 9, 9, 9]→11 (P3B1); [9, 9, 9, 9]→3 (P3B2); [9, 9, 9, 9]→6 (P3C); [9, 9, 9, 9]→2 (P3D2); [9, 9, 9, 9]→5 (P3E1); [9, 9, 9, 9]→3 (P3E2); [9, 9, 9, 9]→7 (P3G); [9, 9, 9, 9]→9 (P3H); [19, 19, 19, 19]→3 (P3B2) |
| `ui/maps/map-bg-result-1.png` | [150, 150, 10, 10] | [50, 50, 50, 50]→1 (P3H); [80, 80, 100, 100]→1 (P3A); [100, 100, 0, 0]→1 (P3C); [130, 130, 0, 0]→2 (P3B2); [130, 130, 0, 0]→1 (P3D1); [150, 150, 0, 0]→1 (P3A); [150, 150, 0, 0]→1 (P3F) |
| `ui/common/win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9]→1 (P2C); [14, 14, 14, 14]→1 (P1); [14, 14, 14, 14]→1 (P2C); [21, 21, 21, 21]→2 (P2C); [21, 21, 21, 21]→1 (P3B1) |
| `ui/common/rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40]→1 (P2C); [40, 40, 40, 40]→1 (P3B2); [40, 40, 40, 40]→2 (P3C); [40, 40, 40, 40]→2 (P3D2) |
| `ui/common/win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 9, 9, 9]→1 (P3F); [39, 11, 11, 11]→1 (P3F); [49, 9, 9, 9]→1 (P3G) |
| `ui/battle/battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0]→2 (P3A) |
| `ui/common/win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39]→1 (P3A); [39, 38, 39, 39]→1 (P3B1) |
| `ui/misc/fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10]→1 (P3C); [0, 0, 10, 10]→1 (P3D2) |
| `ui/common/win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14]→2 (P3H) |
| `ui/common/win-bg_block-bg-15.png` | [0, 0, 29, 29] | [9, 9, 29, 29]→2 (P2A) |
| `ui/hero/hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20]→1 (P3B1) |
| `ui/common/win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14]→1 (P3A) |
| `ui/common/win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9]→1 (P3A) |
| `ui/misc/super-stage_block-3.png` | [15, 15, 15, 15] | [12, 12, 12, 12]→1 (P3B1) |
| `ui/common/win-bg_line-2.png` | [0, 0, 9, 9] | [0, 0, 2, 2]→1 (P3B2) |
| `ui/common/win-bg_block-bg-40.png` | [12, 12, 12, 12] | [9, 9, 9, 9]→1 (P3G) |
| `ui/common/win-bg_block-bg-20.png` | [9, 9, 9, 9] | [11, 11, 11, 11]→1 (P2A) |

重点：`win-bg_win-bg-11`（P1 设 59，P2/P3 很多节点要 79）、`win-bg_block-bg-5`（P1 设 11，多处要 9）、`win-bg_win-bg-12`（原有 20/20/15/18，节点要 14 或 9）、`win-bg_block-bg-15`（P1 设 0/0/29/29，P2 节点要 9/9/29/29）。

## 逐节点

| 批次 | meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|---|
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChooseServerLayer:/layer/spr_scroll_bg` |
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChooseServerLayer:/layer/spr_tab_bg` |
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `NoticeLayer:/layer/spr_gray_bg` |
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `NoticeLayer:/layer/spr_gray_bg` |
| P1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `NoticeLayer:/layer/spr_bg` |
| P1 | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [14, 14, 14, 14] | `UserLoginLayer:/layer/spr_bg` |
| P2A | `win-bg_block-bg-15.png` | [0, 0, 29, 29] | [9, 9, 29, 29] | `RoleUpgradeLayer:/RoleUpgradeLayer/CCScale9Sprite_1` |
| P2A | `win-bg_block-bg-15.png` | [0, 0, 29, 29] | [9, 9, 29, 29] | `RoleUpgradeLayer:/RoleUpgradeLayer/CCScale9Sprite_2` |
| P2A | `win-bg_block-bg-20.png` | [9, 9, 9, 9] | [11, 11, 11, 11] | `ChangeNickLayer:/ChangeNickLayer/spr_input_bg` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite1` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite2` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite3` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite4` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_send1` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_send2` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_send3` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/spr_bg_battle` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/spr_gm_f` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/spr_search` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ListLayer:/ListLayer/spr_panel_bg` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RoleInfoLayer:/RoleInfoLayer/node_pannel/spr_pannel_bg` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SettingChooseLayer:/SettingChooseLayer/spr_bg` |
| P2A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GMLayer:/GMLayer/spr_bg` |
| P2A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ListLayer:/ListLayer/spr_bg` |
| P2A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SettingChooseLayer:/SettingChooseLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FriendLayer:/FriendLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FriendSearchLayer:/FriendSearchLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MailInfoLayer:/MailInfoLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MailLayer:/MailLayer/spr_bg` |
| P2C | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `RankTopThreeCell:/RankTopThreeCell/CCScale9Sprite_1` |
| P2C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ItemSelectLayer:/ItemSelectLayer/spr_scroll_bg` |
| P2C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RankLayer:/RankLayer/spr_my_bg` |
| P2C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RankSingleLayer:/RankSingleLayer/spr_panel_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `AchievementLayer:/AchievementLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankLayer:/RankLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankListLayer:/RankListLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankSingleLayer:/RankSingleLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankTopThreeLayer:/RankTopThreeLayer/spr_bg` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9] | `ItemBuyLayer:/ItemBuyLayer/CCScale9Sprite_1` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [14, 14, 14, 14] | `ItemExhibitionLayer:/ItemExhibitionLayer/spr_bg` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `UpStarSuccessLayer:/UpStarSuccessLayer/spr_bg` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `UpgradeSuccessLayer:/UpgradeSuccessLayer/spr_bg` |
| P3A | `battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0] | `BattleEndLayer:/BattleEndLayer/CCScale9Sprite_1` |
| P3A | `battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0] | `QuickBattleEndLayer:/QuickBattleEndLayer/node_role/CCScale9Sprite_1` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BattleEditLayer:/BattleEditLayer/CCSprite_1/spr_send1` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChapterPreviewLayer:/ChapterPreviewLayer/spr_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChapterRewardLayer:/ChapterRewardLayer/spr_box` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `IdleHeroSelectLayer:/IdleHeroSelectLayer/spr_bg_battle` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskLayer:/MainTaskLayer/spr_list_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskLayer:/MainTaskLayer/spr_select_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `MissionLayer:/MissionLayer/node_content/scroll_view_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MissionRewardInfoLayer:/MissionRewardInfoLayer/spr_scroll_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MissionRewardLayer:/MissionRewardLayer/spr_box` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `QuickBattleLayer:/QuickBattleLayer/CCScale9Sprite_3` |
| P3A | `win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39] | `MissionCell:/MissionCell/CCScale9Sprite_1` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BattleDetailLayer:/BattleDetailLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BattleEditLayer:/BattleEditLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChapterPreviewLayer:/ChapterPreviewLayer/CCScale9Sprite_1` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChapterRewardLayer:/ChapterRewardLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HardSelectLayer:/HardSelectLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `IdleHeroSelectLayer:/IdleHeroSelectLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MainTaskLayer:/MainTaskLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionLayer:/MissionLayer/node_content/content_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionRewardInfoLayer:/MissionRewardInfoLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionRewardLayer:/MissionRewardLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `QuickBattleLayer:/QuickBattleLayer/CCScale9Sprite_1` |
| P3A | `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `QuickBattleTipLayer:/QuickBattleTipLayer/spr_bg` |
| P3A | `win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14] | `MainTaskPowerLayer:/MainTaskPowerLayer/spr_bg` |
| P3A | `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 0, 0] | `ChapterEndLayer:/ChapterEndLayer/spr_bg` |
| P3A | `map-bg-result-1.png` | [150, 150, 10, 10] | [80, 80, 100, 100] | `QuickBattleEndLayer:/QuickBattleEndLayer/spr_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_lineup_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonKillRewardLayer:/DungeonKillRewardLayer/spr_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonShopLayer:/DungeonShopLayer/spr_reward_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonShopListLayer:/DungeonShopListLayer/spr_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FantasyTowerLogLayer:/FantasyTowerLogLayer/spr_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsBossLayer:/FloatingIslandsBossLayer/node_bottom/node_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsDamageLayer:/FloatingIslandsDamageLayer/spr_panel_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_my_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `PlaneWarMissionLayer:/PlaneWarMissionLayer/node_mission/scroll_view_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/rank/rank_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/rank/spr_self_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/reward/reward_scroll_bg` |
| P3B1 | `win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39] | `PlaneWarMissionCell:/PlaneWarMissionCell/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonBoxUseLayer:/DungeonBoxUseLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonHeroAttackLayer:/DungeonHeroAttackLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonKillRewardLayer:/DungeonKillRewardLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonLayer:/DungeonLayer/spr_hero_list_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonShopLayer:/DungeonShopLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonShopListLayer:/DungeonShopListLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FantasyTowerPreviewLayer:/FantasyTowerPreviewLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FloatingIslandsDamageLayer:/FloatingIslandsDamageLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PlaneWarMissionLayer:/PlaneWarMissionLayer/node_mission/spr_mission_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PlaneWarRankLayer:/PlaneWarRankLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `FloatingIslandsBossLayer:/FloatingIslandsBossLayer/node_center/CCNode_1/spr_bg2` |
| P3B1 | `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_hero_bg` |
| P3B1 | `super-stage_block-3.png` | [15, 15, 15, 15] | [12, 12, 12, 12] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_rank_title_bg` |
| P3B2 | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `STMagicTowerRankRewardCell:/STMagicTowerRankRewardCell/CCScale9Sprite_1` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `RainbowHistoryCell:/RainbowHistoryCell/node_item/item_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RainbowHistoryLayer:/RainbowHistoryLayer/CCNode_1/spr_scroll_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerMissionRewardCell:/STMagicTowerMissionRewardCell/spr_cell_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerRankLayer:/STMagicTowerRankLayer/node_rank/spr_rank_scroll_view_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerRankRewardLayer:/STMagicTowerRankRewardLayer/spr_reward_scroll_view_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `TrialInfoLayer:/TrialInfoLayer/node_pannel/spr_pannel_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `UnderworldPagodaBossLayer:/UnderworldPagodaBossLayer/node_bottom/node_bg` |
| P3B2 | `win-bg_line-2.png` | [0, 0, 9, 9] | [0, 0, 2, 2] | `RainbowChallengeLayer:/RainbowChallengeLayer/CCNode_2/CCScale9Sprite_2` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RainbowChallengeLayer:/RainbowChallengeLayer/CCScale9Sprite_1` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RainbowHistoryLayer:/RainbowHistoryLayer/spr_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `STMagicTowerRankLayer:/STMagicTowerRankLayer/node_rank/spr__rank_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [74, 74, 74, 74] | `STMagicTowerRankRewardLayer:/STMagicTowerRankRewardLayer/CCScale9Sprite_1` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TrialHelpLayer:/TrialHelpLayer/spr_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TrialInfoLayer:/TrialInfoLayer/spr_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `UnderworldPagodaRankLayer:/UnderworldPagodaRankLayer/spr_bg` |
| P3B2 | `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `STMagicTowerBattleEndLayer:/STMagicTowerBattleEndLayer/spr_bg` |
| P3B2 | `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `STMagicTowerJumpLayer:/STMagicTowerJumpLayer/spr_bg` |
| P3C | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `PvpRankCell:/PvpRankCell/CCScale9Sprite_1` |
| P3C | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `PvpRewardCell:/PvpRewardCell/CCScale9Sprite_1` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BetLayer:/BetLayer/spr_scroll_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BetListLayer:/BetListLayer/spr_panel_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderChallengeLayer:/LadderChallengeLayer/CCNode_2/spr_bg_battle` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderHistoryLayer:/LadderHistoryLayer/spr_scroll_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderRewardLayer:/LadderRewardLayer/spr_my_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PvpLayer:/PvpLayer/layer_rank/spr_my_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BetListLayer:/BetListLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderChallengeLayer:/LadderChallengeLayer/CCScale9Sprite_1` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderHeroTempleLayer:/LadderHeroTempleLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderHistoryLayer:/LadderHistoryLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderRewardLayer:/LadderRewardLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PvpHistoryLayer:/PvpHistoryLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PvpLayer:/PvpLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioLayer:/VideoStudioLayer/CCScale9Sprite_1` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioRecordLayer:/VideoStudioRecordLayer/CCScale9Sprite_1` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioSaveLayer:/VideoStudioSaveLayer/CCScale9Sprite_1` |
| P3C | `map-bg-result-1.png` | [150, 150, 10, 10] | [100, 100, 0, 0] | `PvpEndLayer:/PvpEndLayer/spr_bg` |
| P3C | `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `LadderHistoryHighCell:/LadderHistoryHighCell/spr_cell_bg` |
| P3D1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageAccountLayer:/SuperStageAccountLayer/spr_bg` |
| P3D1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageHistoryLayer:/SuperStageHistoryLayer/CCScale9Sprite_1` |
| P3D1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageHistoryVideoLayer:/SuperStageHistoryVideoLayer/CCScale9Sprite_1` |
| P3D1 | `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `SuperStageBattleEndLayer:/SuperStageBattleEndLayer/CCScale9Sprite_1` |
| P3D2 | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `SuperStageRewardCell:/SuperStageRewardCell/CCScale9Sprite_1` |
| P3D2 | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `SuperStageTokenCell:/SuperStageTokenCell/CCScale9Sprite_1` |
| P3D2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SuperStageTop2HistoryLayer:/SuperStageTop2HistoryLayer/spr_panel_bg` |
| P3D2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SuperStageTopChallengeLayer:/SuperStageTopChallengeLayer/CCNode_2/spr_bg_battle` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageRankLayer:/SuperStageRankLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageRewardLayer:/SuperStageRewardLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTop2HistoryLayer:/SuperStageTop2HistoryLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopChallengeLayer:/SuperStageTopChallengeLayer/CCScale9Sprite_1` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopHistoryLayer:/SuperStageTopHistoryLayer/CCScale9Sprite_1` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopLegendLayer:/SuperStageTopLegendLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopRankLayer:/SuperStageTopRankLayer/spr_bg` |
| P3D2 | `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `SuperStageTopHistoryHighCell:/SuperStageTopHistoryHighCell/spr_cell_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionBetLayer:/ChampionBetLayer/spr_scroll_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossBetLayer:/ChampionCrossBetLayer/spr_scroll_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossListLayer:/ChampionCrossListLayer/spr_panel_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossRankLayer:/ChampionCrossRankLayer/node_bottom/CCScale9Sprite_1` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossRankLayer:/ChampionCrossRankLayer/node_top/spr_rank_bg` |
| P3E1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionCrossListLayer:/ChampionCrossListLayer/spr_bg` |
| P3E2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionListLayer:/ChampionListLayer/spr_panel_bg` |
| P3E2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionRankLayer:/ChampionRankLayer/node_bottom/CCScale9Sprite_1` |
| P3E2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionRankLayer:/ChampionRankLayer/node_top/spr_rank_bg` |
| P3E2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionListLayer:/ChampionListLayer/spr_bg` |
| P3E2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionShopLayer:/ChampionShopLayer/CCScale9Sprite_1` |
| P3F | `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 9, 9, 9] | `TeamArenaBattleLogCell:/TeamArenaBattleLogCell/node/CCScale9Sprite_1` |
| P3F | `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 11, 11, 11] | `TeamArenaLineupCell:/TeamArenaLineupCell/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaBattleLayer:/TeamArenaBattleLayer/panel/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaBattleLogLayer:/TeamArenaBattleLogLayer/CCScale9Sprite_1` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaLayer:/TeamArenaLayer/panel/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaLineupLayer:/TeamArenaLineupLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaNewTeam:/TeamArenaNewTeam/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaRewardLayer:/TeamArenaRewardLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaTeamAddMainLayer:/TeamArenaTeamAddMainLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaTeamMainLayer:/TeamArenaTeamMainLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaVideoLayer:/TeamArenaVideoLayer/CCScale9Sprite_1` |
| P3F | `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 0, 0] | `TeamArenaEndLayer:/TeamArenaEndLayer/spr_bg` |
| P3G | `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [49, 9, 9, 9] | `GRMissionStarRewardCell:/GRMissionStarRewardCell/CCScale9Sprite_1` |
| P3G | `win-bg_block-bg-40.png` | [12, 12, 12, 12] | [9, 9, 9, 9] | `GRMissionCastleCell:/GRMissionCastleCell/spr_chapter_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamFirstLayer:/DreamFirstLayer/show/item_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/rank/rank_scroll_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/rank/spr_self_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/reward/reward_scroll_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRewardLayer:/DreamRewardLayer/spr_scroll_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamSelectLayer:/DreamSelectLayer/buff_list` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GRMissionStarRewardLayer:/GRMissionStarRewardLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamFriendLayer:/DreamFriendLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamLayer:/DreamLayer/message/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamRankLayer:/DreamRankLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamRewardLayer:/DreamRewardLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamSelectLayer:/DreamSelectLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GRMissionStarRewardLayer:/GRMissionStarRewardLayer/spr_bg` |
| P3H | `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ExoticAdventureBackpackInfoLayer:/ExoticAdventureBackpackInfoLayer/spr_bg` |
| P3H | `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ExoticAdventureUpgradeLayer:/ExoticAdventureUpgradeLayer/spr_bg` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureBackpackLayer:/ExoticAdventureBackpackLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureGetItemsLayer:/ExoticAdventureGetItemsLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureIllustratedBooksLayer:/ExoticAdventureIllustratedBooksLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_1` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_2` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureShioInfoCtr:/ExoticAdventureShioInfoCtr/node_title/spr_content` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureShioInfoLayer:/ExoticAdventureShioInfoLayer/node_bg/spr_content` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureTeamLayer:/ExoticAdventureTeamLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureTeamLayer:/ExoticAdventureTeamLayer/spr_box` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureBackpackLayer:/ExoticAdventureBackpackLayer/spr_bg` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureIllustratedBooksLayer:/ExoticAdventureIllustratedBooksLayer/spr_bg` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/spr_bg` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureShioInfoCtr:/ExoticAdventureShioInfoCtr/spr_bg` |
| P3H | `map-bg-result-1.png` | [150, 150, 10, 10] | [50, 50, 50, 50] | `ExoticAdventureRandomEventsLayer:/ExoticAdventureRandomEventsLayer/spr_bg` |

## 功能偏差（英雄 / 背包 / 挂机）

这一节不是九宫格边距。旧 Lua 不在仓库里。下面是对照 ccbi、`client/assets/resources/config/` 和现有壳之后，仍和旧版不一样、或只能猜的地方。

| 项 | 现在怎么做 | 依据 / 还差什么 |
|---|---|---|
| 英雄列表、背包滚动 | 运行时加竖向 ScrollView。壳上没有这个节点。空位只补满最后一行，并且至少 4 行，不是 300 个空格 | s2c 4001 带了 `hero_capacity` 就写「空间 n/该数」。这包没带才用 `system.hero_space_initial`（300）。0 仍写成 0 |
| 出阵列表 | 用已有 `scroll_view_backpack`。前排 4–1 写「前」，后排 8–5 写「后」，第 9 格锁着。确认发 c2s 3100，空的 s2c 3100 之后再等 3101，然后才进战 | 脸画在编码站位的 `node_icon_` 上：第 1 人在格子 2，接着 3、5、6、7、8，第 7 人在格子 9。格子 1 和 4 留空。打开时按站位排序。不按列表下标去填 4、3、2、1 |
| 挂机四格 | 宝箱条按已挂机 / 封顶铺 `main-scene_progress-AFK`，字是短时钟。金币 `lbl_gold`、英雄经验 `lbl_souls`（月牙 900101）、角色经验 `lbl_exp`（900003）写成「N/m」，分别铺 `progress-hangs`、`progress-exp`、`progress-role-exp`。填充宽 158（AFK 原图宽，槽是 166×36）。高度跟原图：AFK 28、金币和英雄经验 24、角色经验 4。不再把 4 像素的角色经验拉成 18 高的色带。字原来是 0×0 再 SHRINK，所以槽是空的 | 和底栏三个图标一致。真服表没绑上时三格写「—/m」且不铺色。Mock 仍退回 `goldPerMin` |
| Mock 领取 | 金币、角色经验、英雄经验走 `chapterreward.reward_base`，当前关 = 已通关 + 1。封顶用 `system.idle_max_time`（21600 秒）。挂机壳宝箱和 Mock 挂机页都走这一套 | 强化石仍是旧节奏：未通关每 30 秒 1 个，每通关缩短 1 秒，最短 10 秒，不在 `reward_base` 里。表没绑上时金币退回每分钟 6、每关 +4，封顶 8 小时。角色经验 900003、英雄经验 900101 作为背包道具发放。VIP 加成仍不加 |
| 怒气条 | 挂机战斗条上的蓝条按战报里的回合号 / `battletype.round_max` 填充。行是「回合 N」时牌上写「N/15」（表没读到上限时分母仍是 15）。站场没有回合号时先停在 1 | 战报没有怒气字段，只标位置。不再用拍子下标当回合 |
| 暴击飘字 | 掉血数字用 `font/yellow-73`，治疗用 `font/green-73`，暴击用更大的 `font/red-73`。这三套只有加号、减号和数字，「暴击」仍是旁边的系统字。字库没挂上时退回红字、绿字和更大的金字。命中的 `hurt` 是伤害大小，正数是掉血，不再当成治疗。血量上升才是绿字。Mock 简化战报没有 crit，回合行里有「溃败」时敌方伤害按暴击画 | 不是表里的暴击率。`blue-73` 也只有数字，技能名仍是系统字 |
| 结算星 | 胜利在 `show_hero` 下画 3 颗 `hero-info_spr-star-1`，失败不画 | `chapterreward` 没有星级列。不另排一行星星 |
| 结算横幅 | 胜利把 `spr_result` 换成 `battle-end-lang_lbl-result-1`。失败仍是 `result-0`。对不上就藏横幅，`lbl_faild` 写「胜负未带」。失败句留着壳上的两行。`lbl_hero_name`、`UILabelTTF_1`（总伤害量）、`lbl_hero_nums`、`lbl_role_exp_num`（9999）藏起来。`lbl_role_lv` 只有等级已同步才写「Lv N」 | 壳上的 `spr_result` 默认是失败图。`result-2` / `result-3` 是更长的「战斗失败 / 战斗胜利」，盒子是 174×118，不用。`spr_result2` 仍按 ccbi 隐藏。没有角色经验字段，不编一个数 |
| 结算奖励 | 胜利读这一关 `chapterreward.first_reward`，图标落在 `show_rich` 原点，最多 6 个，数量写在图标里 | 失败不发这列。不把名字写进 `lbl_hero_nums`。确定钮写成「回挂机」，不发 3002 |
| 下一关 | 胜利时把已有 `btn_report` 改成「下一关」，字缩进 66×74。Mock 再进当前关，真服先回挂机再走原来的 3001 | 不新开协议。失败不显示这颗钮。`battle-end_spr-next` 没有挂到结算节点，不另摆 |
| 快速战斗 | `QuickBattleLayer` 用 `idle_speed_up`（7200 秒）预览两小时 `reward_base`，并读已有 3012 | 不发 3013，不发奖励。说明和跳转只改提示字 |
| 我要变强 | 打开已有 `HeroSuggestLayer`。四个页签只切换 `node_strong` / `resource` / `hero` / `lineup` | 不发协议。名字最多写名册前三名 |
| VIP | 没有角色 VIP 等级时挂机条不写字，不再把「VIP未同步」画在战斗钮下面。`vipIdleLine(level)` 仍能按 `vip` 表写出百分比和 `extra_idle_time`。三格和封顶仍是 `reward_base` + `idle_max_time`，不乘某一档 | s2c 2001 已核对的字段没有 `vip_level`。字段 15 按旧说明不读。不能在客户端加 VIP% / 3013 / GM。没有等级就不把表里的 10% 或 0% 当成这名角色的加成 |
| 掉落堆 | 不再把 `main-scene_spr-drop-1` 放在场地中央。那张是空的蓝金匾，不是金币堆。有当前关 `reward_base` 或 `drop_group` 时，仍用已有 `res-icon_res-1`、`res-icon_res-2`、`main-scene_spr-box-2`、`backpack_900101`、`backpack_900003` 和掉落物品图标叠一堆。堆和计时泡原来压在金环上。底栏上移之后环顶大约在 y=-240，`res-block` 骨架高 202.48、缩放 0.42，中心再抬 16，图标仍比骨架高 28，计时泡仍比骨架高 80、横着偏 48。没有这些数据时场地留空。堆上按数量播 `spine/res-block` 的 `normal-0`…`normal-4`。点底栏宝箱播对应的 `collect-1`…`collect-4`（没有 `collect-0`），播完回到 normal；数量已经是 0 就藏起来。套没挂上时图标还在，并打一次「挂机掉落堆 spine/res-block 没有挂上，仍用图标堆」 | 领取仍是原来的空 c2s 3005 / Mock `idle.claim`，不新发协议。不掷随机数，不写进三格。进度光是 `jindutiao` 的 `stand`，铺在 `spr_progress_AFK_bg` 的遮罩里，宽度跟已挂机比例走。底下的 `progress-AFK` 填充还在 |
| 待命气泡 | 不再给每个站位写「待命」。场上计时泡仍是 Prefab 里那一个 `node_bubble`，在掉落堆上沿。另外在左英雄头顶挂一句对白：`herotalk` 按等级筛，对上 language，去掉 font 标签，大约 8 秒换一句。气泡是 `other_spr-bubble-5`（224×74，拉到 320×112）。进真战报时藏起来。不编新句子，不掷随机数 | `other_spr-bubble-1` 只有 54×44，装不下一句。等级没同步时按 1 级，只出 `level_min` ≤ 1 的句子 |
| 底栏金环 | 奶油板中间的 `main-scene_spr-map-frame-1` 留着，盖住空板。环心透明，后面垫一块奶油色 `HangCrystalFill`，底板那两颗黑圆不从洞里透出来。殿堂缩略图 `spr_world`、「地图」、宝石标和任务名「999」仍藏。计时泡的占位「999」改成时钟，并收回掉落堆上，不再飘在演武场中间。挂机壳同样抵消 SafeFrame 缩小，大理石铺满可见宽。掉落堆改到环顶上面，环露出来。面板已经挂上时不另铺三颗扁平蓝钮。侧钮缩放 0.8，字号按这一档折算，字仍是战力UP / 战斗 / 高速战斗 | 正式服底栏中间是金环水晶，不是一块空白奶油，也不是黑圆墨镜。不把缩略地图放回来。`btn-scale-battle` 蓝核没有挂点，不放进环里 |
| 战斗钮光 | 中间 `btn_battle` 上循环 `main-scene-effect_btn-battle-0`…`9`。节奏用 effect2 `eff_battle_layer_battle` 的 speed 24，和开战帧一样按 0.01 秒，一帧 240ms。原图尺寸，锚在钮心，字画在光上面。十张都没有才打「挂机战斗钮光 main-scene-effect_btn-battle 没有挂上，紫底仍在」 | 不改点击，不发协议。主城云、`main-city-effect_6`、`main-city-effect_15` 仍没有锚点 |
| 挂机演武 | 阵容站在棕色地砖上，不站到柱廊。我方三格大约 (-150,-30)、 (10,-120)、 (150,-10)，都朝右。怪在右侧地砖 (230,-20)、 (300,36)、 (260,84)，都朝左，仍低于 y=120。在场的我方（最多三格：MAIN 有几只站几只，空阵容才是三套默认）留在地砖上播 `run`（没有就 `walk`），人不挪位。`IdleSky` 和大理石 `IdleFloor` 只在行军这一段水平循环，天更慢；遇到怪就改站立，背景停。怪从右侧滑进右侧格子，不落到我方阵上。到位并且骨架出来之后才出刀。我方朝敌方，怪朝我方。收掉的是怪，不把我方拆掉重刷。受击帧只打在被打的那只怪上。奇数刀播 `attack2`。皮肤套名对得上 `skill-<id>` 时（先看套名本身，8 位套名再补一个 0；还没有帧就用 herotype 的技能号、`skin.json` 的本体、或 `herofashion` 的 `hero_type`），在怪身上同时播主套、其余层和 `_arrow`；对不上仍挂 `hero-skill`。381 套能攻击的皮肤里 226 套对得上。不把 skill-effect 取模里的立绘套到演武上。每刀挂 `hero-beattack` 和已有 `yanwu`。真战报同一套分套和箭矢挂在大理石上的技能锚点。对不上 stand 就用 `10405006` / `10405007` / `10505010`。没有 die 的套打完收掉。飘字是 yellow-73 的数字，在怪头顶。点「战斗」会暂停，真战报结束再继续。不发协议，不改钱包 | 有表里的 hp 就按刀数分完，最后一刀是击杀。没有 hp 时演出数字是 48、64…。不掷随机数。伤害不进三格，也不进 3004。套没有 `run` 或 `attack2` 时退回 stand / attack，并打 `clip miss` |
| 时钟 | 真服只按 s2c 3004 的 `reward_time` 计一次。大于等于 10 亿才当时间戳，10^12 以上当毫秒，否则当 unix 秒。更小的数写「未同步」，不再从打开面板的时刻往上加。`max_reward_time` 小于 10 亿时按秒封顶（0 也封在 00:00）。像时间戳时退回 `system.idle_max_time`。挂机泡和宝箱条满 1 小时写成 `hh:mm`（封顶 21600 秒是 `06:00`），不满 1 小时是 `mm:ss`。`formatDuration` 仍是 `hh:mm:ss`，挂机页句子不用它。领取成功后第二行时钟不再停在「已发领取」 | 没读到表、也没有可用的 `max_reward_time` 时不封顶 |
| 顶栏战力 | `PowerSlot/Value` 用名册 `fighting` 之和。优先 MAIN，对不上再加全名册里已经带数字的英雄。一个都没有就留空，不写 Prefab 默认的 0。3103 空探针的 fighting=0 不进顶栏 | s2c 2001 没有战力字段 |
| 顶栏头像 | 有名册时用出阵或第一名英雄的 `hero-icon` 盖住 `main-scene_spr-head-frame-1` 的褐心。没有头像路径就关掉 `Avatar`。等级徽用已同步等级，未同步不显示占位 `1` | s2c 2001 没有 head_id。34001 是已解锁列表，不是当前头 |
| 关卡条 | 不把 `ChapterPreviewLayer`、`ChapterRewardLayer` 或 `ChapterExtraRewardCell` 铺在场地中间。language 没有「戦闘中」。`main-scene-lang_lbl-battle` 是「战斗」。挂机金环缩略图仍藏 | 挂机左上角一颗 `main-city_icon-main_mission`，字是 `chapter` 的「第 N 章 · 第 M 关」，没同步写「主线未同步」，不写第 0 章。点开当前关 `ui/chapter/{map}.jpg`（640×1280）。标题是章关加上 `chapterreward.name` 的地名，并按 `lbl_name` 的 0.5 缩放收进 `spr_title_bg`。关卡是底下列表。关闭沿用 `ChapterPreviewLayer` 关闭钮的边距，奖励钮在对称一侧，打开已有 `ChapterRewardLayer`。列表里点一关打开 `ChapterPreviewLayer`：三格是这一关 `reward_base`，掉落是 `drop_group` 并套稀有框，点掉落只看说明。没有表写「这一关没有掉落表」。当前关的钮是「出战」，先关地图，再走底栏「战斗」同一条。其它关的钮是「查看」，提示「不发跳关」。通关奖励用 `ChapterExtraRewardCell` 和 `ChapterRewardCell`。进度是已通关数/门槛，没同步写「—/N」。领取钮只提示「不发领取协议」，不发 3011。前往只打开那一关的预览。`first_reward` 仍只在胜利结算。图没挂上时列表仍在。`chapter.pos` 是阵位号，不拿来钉点 |
| 挂机殿堂 | 天和地按当前关 `chapterreward.map` 换 `mapXX_B` / `mapXX_F`。号对不上 `map`+两位数字，或那张图没挂上，仍用 map01，并打一次「挂机地图 … 没有挂上，仍用 map01」 | 站位仍是 map01 地砖。其它图没有站位表，不重排 |
| 英雄职业 | 育成 `lbl_profession` 写「职业: 」加 language 111001–111005。`icon_occupat` 换 `hero-info_icon-occup-1`…`5`。对不上写「职业: 未知」并藏图标 | 4001 的职业字段不进 `StoreHero`。职业只读 `herotype.occupation` |
| 技能说明 | 点育成条或星UP技能图标挂 `HeroSkillInfoLayer`。`lbl_name` / `lbl_info_1` 用 `heroskill` 的 `lan_name` / `lan_describe`，等级取不超过当前的最高一档，下一档写在 `lbl_next_level_des`。没有下一档就藏 `node_level_tip`。名字正好是「普攻」时 `lbl_active_type` 写「普攻」，否则留壳上的「技能类型」。育成图标上的等级标用 `hero-info_spr-skill-level-bg`，相对图标中心 (-20, 20)，和星UP那颗 20×20 的底同一处。没有技能时留着 `node_nil_skill`。Prefab 失败退回说明卡 | `active_type` 0/1/2/3 没有 language。不编主动 / 被动。技能条中心是 `hero-info_spr-new-8` 在 (0, 86) 的锚点，间距仍是原来的 70 |
| 详情返回和装备 | `btn_back` 关掉 BattleSheet，并藏掉合成的「关闭」。左右在 `GameStore.heroes()` 里换人。装备圈、符文、神器点了提示「不发穿戴协议」，不涂灰、不塞图标。穿上 / 卸下留着绿钮和橙钮，字仍是空的，同样不发。设置 / 展开 / 只显示涂灰并提示「不发协议」。升级、升星留着日服按钮图，不涂灰，只记日志。立绘挂在 `node_equip` 圆心，座位 Y 是 0，装备菜单盖在骨架上面。`btn_attr_detail` 打开 `HeroInfoAttrLayer`，点暗处收起 | `btn_right` 和 `btn_left` 都是 `hero-info_btn-left`，缩放 1。没有向右的图，不翻转。不发穿戴写协议。属性窗没有关闭钮 |
| 头像 | `ui/hero/hero-icon_<item_id>`。`item_id` 为 0 时用 `item.idx` = 英雄类型号上的 `hero-icon/` 路径 | 雷顿、赫卡忒·幽魂、撒旦·赫莱、深渊终结者的图是 `hero-icon_20701001` / `20701003` / `20701004` / `20701006` |
| 图鉴顺序 | `herotype` 表的顺序。同类型多只英雄打开名册里的第一只 | 旧排序没对上 |
| 元素名 | 1 火、2 水、3 木、4 光、5 暗 | 对 language 2101–2105。不是 Lua 实证 |
| 星UP | 详情页按 `herostar` 画等级上限、攻击 / 生命展示、技能槽等级（`skill1`…`skill4`）和 `upstar_cost` / `need_item` 图标，再加上 `to_N_star`。升星钮只记日志 | 不发升级协议。满星写「已满星」。表上没有速度展示列，这一行不写速度 |
| 宝石 / 神装 | 按部位筛，图标 `backpack_<id>`，持有数是背包里 `itemType` 或 `itemId` 等于这条 idx 的数量。0 就灰掉加锁 | `StoreHero` 没有已穿装备。这是图鉴，不是「这名英雄身上穿着什么」 |
| 稀有框 | 只有 2 / 3 / 4 用 `backpack_spr-rare-*` | 没有 `spr-rare-1` 或 `spr-rare-5`，其余用 `backpack_item-frame-1` |
| 圣龙立绘 | 四个名字仍按 `dragonlevel` 第一次出现：斯摩格、迪斯莱尔、雷博尔、英菲尼迪。格子用同一张 `dragon_btn-illustration`，写「图鉴」，不再把 `dragon_identify-1`…`4` 安到这四条上。标题在 s2c 59001 有 `attr_level` 时写「圣龙等级 N」 | `dragon_identify-0`…`11` 是鉴定光效，不是物种立绘。表上没有立绘列。不发 59007 升等级 |
| 圣物 | 每种 `kind` 用 1 星那条的名字、图标和特性。任一星的 id 在背包里就算持有 | 不发升星 |
| 说明卡 | 点背包格子挂 `BackpackInfoLayer`。底板挪到内容中间。灰「使用」只记日志，不发 5004–5009。来源钮灰掉，不跳转。Prefab 加载失败才退回运行时 390×300 卡 | 关闭只关这张卡 |
| 空名册 / 空背包 | 4001 还没到：英雄页写「真服英雄未同步」，格子改画 `herotype` 图鉴（灰、锁），不造英雄。4001 是空数组：写「空名册」，同样改画图鉴。有英雄仍只画名册。背包没到写「真服未同步」，空表写「空背包」，格子仍是空框。出阵没有英雄写「空名册，没有可上阵的英雄」。收到后续 s2c 会重画 | 图鉴不是角色进度。不把配置表行写进 `GameStore` |
| 主城特效 | `maincityeffect` 的 5 条 anim 按 `main-city-effect_<名>-0` 起往下播，缺一张就停。节点挂到中景父节点的最后，用中景本地坐标换算，避免被近景板和后挂的建筑图标盖住。`dx` 播 `stand`；播失败改播 `main-city-effect_portrait`（和 `spine/dx` 图集里的光球同是 96×90）。`chuanghu` 仍是 spine `stand` | `main-city-effect_spr-cloud-1`…`4`、`main-city-effect_6-*`、`main-city-effect_15-*` 有帧，但 `maincityeffect` 没有对应行，ccbi 和 Prefab 里也没有锚点。本轮仍不猜坐标，不新画 |
| 开战出场 | 挂机大理石上，开战各播一遍 `battle-appear-left_0`…`14` 和 `battle-appear-right_0`…`14`。锚点是 LayerAppear 的 (-180, 0) / (180, 0)，原图尺寸。播完，或第一下受击，就藏。旁边仍是 `spine/ZDKS` 和「战斗开始」。帧没挂上只打一次日志 | 不把 LayerAppear 整层抬上来，森林底会盖住大理石。不把 15 帧收成一张 |
| 战斗缺帧 | 技能 / 受击帧全空时，对应 batch2 骨架还在就留骨架。骨架也没有时，在同一 Vfx 锚点播已有 `yanwu`（`act1`） | 不新做技能套。3013 / 升级 / 使用道具仍不发 |

## 启动加载 / 热更

清单和 `docs/mxzg-prefab-1to1-inventory.md` 里没有 Loading、Update、logo 的 ccbi。logo 和主城原先是代码搭的。`LoadingLayer` / `UpdateLayer` 因此按资源裁切摆在 720×1280 上，不是 ccbi 坐标换算。两套 Prefab 节点相同，只引用 `resources` 的 sprite-frame（`@f9941`）。生成脚本是 `client/tools/gen_loading_prefab.py`。

| 项 | 现在怎么做 | 依据 / 还差什么 |
|---|---|---|
| logo 图 | 节点名仍是 `logo-scene_spr-logo`。字标大于 8×8 时按原始尺寸叠在加载底图上。现在这张还是 3×3，开机不显示它。底图是 `ui/login/bg-loading`，cover 和 LoadingLayer 一样。不再使用 `logo-scene_spr-parttern-l` / `parttern-r` | 字标文件仍是 69 字节的失败抽出，没有新画字。饰纹还在资源里，开机不用。淡出时加载层已经在下面，不闪黑 |
| logo 时间 | 淡入 1 秒、停 1 秒、淡出 0.5 秒。点一下跳过停留和淡出 | 旧 lua 不在仓库。常量在 `logoSplash.ts` |
| logo 音乐 | `resources/audio/bgm-logo.mp3` 从淡入循环到进 Main | |
| 背景 | `ui/login/bg-loading.jpg` 768×1300。加载层抵消 SafeFrame 缩小后，按可见尺寸 cover：scale = max(可见宽/768, 可见高/1300)。设计 720×1280 时大约 0.9846，画出 756×1280 | 窄屏（可见宽约 590）不再因为整层缩到 0.82 而在上下留黑边。多出来的边裁掉 |
| 进度框 | `loading_spr-bg-2` 用裁切 617×37（原图 638×37，offsetX -1.5），y = -500 | 没有 ccbi 的条位置 |
| 进度槽 / 填充 | 槽 532×32，填充 524×24，都在 y = -500 | 静态图垫在 spine 下面 |
| 进度头 | `loading_spr-progress-1` 裁切 18×27，从 x = -262 跟着填充走 | |
| spine | `spine/jindutiao` 动画 `stand`。原生宽 275，scaleX = 524/275 ≈ 1.9055，放在遮罩里。遮罩锚点在左，宽度从 0 长到 524 | Spine 3.7.94，播放前走 `runtimeSpineData`。播不了时仍能看见底下的填充图 |
| 中间人物 | `spine/jiemian` 的 `stand`。节点 `BootCast`，720×972，位置 (0, 36)，缩放 0.7，紧挨在 `Bg` 上面 | 正式服加载画面中间的人物特效。底图 jpg 没有这组。套没挂上打「loading cast miss spine/jiemian」，进度条仍走 |
| 百分比 | `loading_text-bg` 84×84，字在 y = -448，格式 `N%` | |
| 提示 | y = -580，宽 660。`loadingtips` 3701–3705 对 language，去掉 font 标签，约 3.5 秒随机换，不重复上一条 | 字色 `#ffeeb2`（`BOOT_TIP_COLOR`）。运行时再涂一次，不跟 Prefab 漂 |
| 阶段字 | y = -390。检查版本 / 更新资源 / 加载资源 / 读取配置 / 登录 / 同步角色 | 字色 `#fff4dc`（`BOOT_STAGE_COLOR`）。百分比 `#fff8e6` |
| 重试 | 默认隐藏，y = -280。图是 `button_btn-orange-big-1`，按下 `orange-big-2`，九宫边距沿用 meta（左 64、右 59） | 热更确认时把字改成「下载」 |
| 热更层 | 和加载层同一棵节点。H5 只走界面和进度。其它平台下载 `version.manifest`，不改搜索路径 | 没有热更 ccbi，也没有 AssetsManager |
