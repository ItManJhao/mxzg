# P3-e 冠军赛（下） Prefab 1:1 节点表

- 基线 main@c3e81f83（P2 的九宫格 .meta 改动已合入）。设计分辨率 640x960。坐标是 Creator 本地坐标（相对父节点锚点）。ignoreAnchor 节点锚点写 (0,0)，angle = -ccb rotation。
- 没有 member 名的节点命名为 `<ccb类>_<同级序号>`。字体映射：STZhongsong、FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf；red-26/red-50/purple-56.fnt → font/ 下同名 BMFont；Helvetica → 系统字体。
- P3 合并顺序：P3A → P3B1 → P3B2 → P3C → P3D1 → P3D2 → P3E1 → P3E2 → P3F → P3G → P3H

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| ChampionCrossTop8FinalsCell | `prefabs/ui/champion/ChampionCrossTop8FinalsCell.prefab` | 90 |
| ChampionEditBiuLayer | `prefabs/ui/champion/ChampionEditBiuLayer.prefab` | 13 |
| ChampionGuessLayer | `prefabs/ui/champion/ChampionGuessLayer.prefab` | 20 |
| ChampionGuessTipLayer | `prefabs/ui/champion/ChampionGuessTipLayer.prefab` | 12 |
| ChampionLayer | `prefabs/ui/champion/ChampionLayer.prefab` | 26 |
| ChampionListLayer | `prefabs/ui/champion/ChampionListLayer.prefab` | 9 |
| ChampionMyCompeteLayer | `prefabs/ui/champion/ChampionMyCompeteLayer.prefab` | 8 |
| ChampionMyGuessCell | `prefabs/ui/champion/ChampionMyGuessCell.prefab` | 20 |
| ChampionMyHistoryCell | `prefabs/ui/champion/ChampionMyHistoryCell.prefab` | 17 |
| ChampionPreRewardLayer | `prefabs/ui/champion/ChampionPreRewardLayer.prefab` | 11 |
| ChampionRankCell | `prefabs/ui/champion/ChampionRankCell.prefab` | 18 |
| ChampionRankLayer | `prefabs/ui/champion/ChampionRankLayer.prefab` | 7 |
| ChampionRewardLayer | `prefabs/ui/champion/ChampionRewardLayer.prefab` | 5 |
| ChampionShopLayer | `prefabs/ui/champion/ChampionShopLayer.prefab` | 12 |
| ChampionShowLayer | `prefabs/ui/champion/ChampionShowLayer.prefab` | 63 |
| ChampionTop32Layer | `prefabs/ui/champion/ChampionTop32Layer.prefab` | 14 |
| ChampionTop3Layer | `prefabs/ui/champion/ChampionTop3Layer.prefab` | 17 |
| ChampionTop4Cell | `prefabs/ui/champion/ChampionTop4Cell.prefab` | 42 |
| ChampionTop8Cell | `prefabs/ui/champion/ChampionTop8Cell.prefab` | 86 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R |
|---|---|
| `ui/shop/shop_shop_8.png` | [0, 0, 15, 15] |

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
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionListLayer:/ChampionListLayer/spr_bg` |
| `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionShopLayer:/ChampionShopLayer/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionListLayer:/ChampionListLayer/spr_panel_bg` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionRankLayer:/ChampionRankLayer/node_bottom/CCScale9Sprite_1` |
| `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionRankLayer:/ChampionRankLayer/node_top/spr_rank_bg` |

## ChampionCrossTop8FinalsCell（90）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionCrossTop8FinalsCell` | ChampionCrossTop8Cell | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8FinalsCell/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_1_1` | CCSprite | [125.088, 644.322] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_1_2` | CCSprite | [204.717, 644.804] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_1_z` | CCSprite | [164.799, 590.3] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_2_1` | CCSprite | [431.641, 645.111] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_2_2` | CCSprite | [516.205, 645.1] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_2_z` | CCSprite | [474.19, 590.276] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_4_1_1` | CCSprite | [239.912, 536.782] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_4_1_2` | CCSprite | [399.625, 536.8] | [0.5, 0.5] | [160, 62] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_4_1_z` | CCSprite | [320, 483.484] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_4_2_2` | CCSprite | [400.316, 159.3] | [0.5, 0.5] | [160, 62] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_4_2_1` | CCSprite | [239.912, 159.297] | [0.5, 0.5] | [160, 62] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_4_2_z` | CCSprite | [319.974, 212.902] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_2_1_2` | CCSprite | [320, 303.227] | [0.5, 0.5] | [10, 56] | [-1, 1.7] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_2_1_1` | CCSprite | [320, 389.833] | [0.5, 0.5] | [10, 56] | [-1, 1.7] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_3_1` | CCSprite | [124.155, 47.594] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_3_2` | CCSprite | [204.482, 47.6] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_3_z` | CCSprite | [164.583, 104.524] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_4_1` | CCSprite | [433.877, 47.6] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_4_2` | CCSprite | [514.922, 47.6] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionCrossTop8FinalsCell/node_light/line_light_8_4_z` | CCSprite | [474.754, 104.5] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionCrossTop8FinalsCell/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_1_1_1` | CCSprite | [87.5, 645.187] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_1_1_2` | CCSprite | [84.691, 618] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_1_2_1` | CCSprite | [241.716, 645.187] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_1_2_2` | CCSprite | [244.111, 618] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_1_1_z` | CCSprite | [164.6, 616.355] | [0.5, 1] | [4, 50] | [1, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_2_1_1` | CCSprite | [393.5, 645.187] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_2_1_2` | CCSprite | [391.808, 618] | [0.5, 1] | [4, 50] | [1, 1.75] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_2_2_1` | CCSprite | [553.636, 645.187] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_2_2_2` | CCSprite | [555.701, 618] | [0.5, 1] | [4, 50] | [1, 1.66] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_2_1_z` | CCSprite | [474.354, 616.161] | [0.5, 1] | [4, 50] | [1, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_1_1_1` | CCSprite | [164.879, 532.849] | [0.5, 1] | [4, 50] | [1, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_1_1_2` | CCSprite | [162.803, 510.853] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_1_2_2` | CCSprite | [476.396, 510.9] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_1_2_1` | CCSprite | [474.4, 532.8] | [0.5, 1] | [4, 50] | [1, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_1_1_z` | CCSprite | [320, 508.592] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 431.105] | [0.5, 1] | [4, 50] | [1, 1.7] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_2_1_z` | CCSprite | [320, 236.845] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_2_2_2` | CCSprite | [475, 183.1] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_2_2_1` | CCSprite | [477.396, 185.2] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_2_1_1` | CCSprite | [162.803, 185.161] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_4_2_1_2` | CCSprite | [164.879, 183.1] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_3_1_2` | CCSprite | [86.5, 71.9] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_3_1_1` | CCSprite | [84.691, 74.3] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_3_2_1` | CCSprite | [244.111, 74.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_3_2_2` | CCSprite | [241.716, 71.9] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_3_1_z` | CCSprite | [164.6, 115.604] | [0.5, 1] | [4, 50] | [1, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_4_1_2` | CCSprite | [396.498, 71.9] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_4_1_1` | CCSprite | [394.689, 74.3] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_4_2_1` | CCSprite | [554.109, 74.3] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_4_2_2` | CCSprite | [552.498, 71.9] | [0.5, 1] | [4, 50] | [1, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_8_4_1_z` | CCSprite | [474.598, 115.6] | [0.5, 1] | [4, 50] | [1, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 345.818] | [0.5, 1] | [4, 50] | [1, 1.7] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionCrossTop8FinalsCell/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_1_1` | UIMenuItemLabel | [87.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_1_2` | UIMenuItemLabel | [242.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_2_1` | UIMenuItemLabel | [397.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_2_2` | UIMenuItemLabel | [552.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_4_1_1` | UIMenuItemLabel | [165, 555.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_4_1_2` | UIMenuItemLabel | [475, 555] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 454.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 240.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_4_2_1` | UIMenuItemLabel | [165, 139] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_4_2_2` | UIMenuItemLabel | [475, 139.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_3_1` | UIMenuItemLabel | [87.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_3_2` | UIMenuItemLabel | [242.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_4_1` | UIMenuItemLabel | [397.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_player/btn_player_8_4_2` | UIMenuItemLabel | [552.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionCrossTop8FinalsCell/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_8_1` | UIMenuItemImage | [164.6, 615.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_8_2` | UIMenuItemImage | [474.4, 615.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_4_1` | UIMenuItemImage | [320.518, 510.38] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_4_2` | UIMenuItemImage | [320.5, 184.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_2_1` | UIMenuItemImage | [320.5, 290.007] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_8_3` | UIMenuItemImage | [164.6, 78.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/menu_replay/btn_report_8_4` | UIMenuItemImage | [474.6, 78.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionCrossTop8FinalsCell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_8_1` | CCSprite | [163.671, 611.031] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_8_2` | CCSprite | [474.4, 611] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_4_1` | CCSprite | [320, 509.837] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_4_2` | CCSprite | [319.071, 182.406] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_2_1` | CCSprite | [320, 352.759] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_8_3` | CCSprite | [164.6, 81.297] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/CCNode_1/spr_effect_8_4` | CCSprite | [474.6, 81.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionCrossTop8FinalsCell/spr_head_bg` | CCSprite | [320.921, 378.34] | [0.5, 0.5] | [170, 172] | [0.6, 0.6] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-gjtxk-1.png` 4a13f27d-5706-4286-941c-b3f1df402827 |
| `/ChampionCrossTop8FinalsCell/spr_head` | CCSprite | [319.539, 377.043] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionCrossTop8FinalsCell/spr_border` | CCSprite | [321.8, 376.197] | [0.5, 0.5] | [138, 138] | [0.75, 0.75] | 0 | **否** | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionCrossTop8FinalsCell/spr_text` | CCSprite | [322.744, 331.558] | [0.5, 0.5] | [58, 30] | [0.8, 0.8] | 0 | **否** | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-gjwz-1.png` 8fc3337b-1d09-4da3-a06a-6147653e7774 |

## ChampionEditBiuLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionEditBiuLayer` | ChampionEditBiuLayer | [0, 0] | [0, 0] | [540, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionEditBiuLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChampionEditBiuLayer/node_title` | CCNode | [270.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionEditBiuLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionEditBiuLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「发送弹幕」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionEditBiuLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionEditBiuLayer/menu/btn_confirm` | UIMenuItemLabel | [270, 100] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「确定」24 [122, 71, 45, 255] |
| `/ChampionEditBiuLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionEditBiuLayer/lbl_title` | UILabelTTF | [215.0, 49.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「消耗:」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionEditBiuLayer/CCSprite_1` | CCSprite | [259, 48] | [0.5, 0.5] | [100, 100] | [0.35, 0.35] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900001.png` 8622cfac-731d-4f79-9965-5ae8484dd6a1 |
| `/ChampionEditBiuLayer/lbl_title` | UILabelTTF | [283.0, 49.0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「500」22 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionEditBiuLayer/lbl_title` | UILabelTTF | [440.0, 131.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「限制40字以内」20 STZhongsong.ttf rgb[141, 89, 58] |
| `/ChampionEditBiuLayer/spr_input_bg` | CCScale9Sprite | [19, 327] | [0, 1] | [500, 180] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |

## ChampionGuessLayer（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionGuessLayer` | ChampionGuessLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessLayer/node_lineup` | CCNode | [320.0, 96.75] | [0.5, 0] | [640.0, -160.0] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessLayer/node_lineup/CCLayerColor_1` | CCLayerColor | [-320.0, 0.0] | [0, 0] | [640.0, -160.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a120 |
| `/ChampionGuessLayer/node_lineup/CCMenu_1` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessLayer/node_lineup/CCMenu_1/onLineup` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「我的竞猜」48 [255, 255, 255, 255] |
| `/ChampionGuessLayer/node_lineup/CCSprite_1` | CCSprite | [-320.0, -160.0] | [0, 1] | [198, 36] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-8.png` c8f9f83b-4b15-49a8-8fb0-3465c8cb686f |
| `/ChampionGuessLayer/node_lineup/CCSprite_1/UILabelTTF_1` | UILabelTTF | [7, -19.928] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「可竞猜：」20 FZCSJW--GB1-0.ttf rgb[254, 223, 170] |
| `/ChampionGuessLayer/node_lineup/CCSprite_1/CCSprite_1` | CCSprite | [92, -19] | [0.5, 0.5] | [100, 100] | [0.3, 0.3] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionGuessLayer/node_lineup/CCSprite_1/lbl_guess_coin` | UILabelTTF | [113, -19.928] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999」22 FZCSJW--GB1-0.ttf rgb[254, 223, 170] |
| `/ChampionGuessLayer/node_lineup/CCMenu_2` | CCMenu | [268.16, -70.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessLayer/node_lineup/CCMenu_2/UIMenuItemImage_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [58, 64] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_spr-dice-2.png` 49c9bf3a-8652-4cfe-b63f-673a0284042a |
| `/ChampionGuessLayer/node_lineup/lbl_dice2` | UILabelTTF | [268.16, -44.68] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionGuessLayer/node_lineup/CCMenu_3` | CCMenu | [-265.2, -70.08] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessLayer/node_lineup/CCMenu_3/UIMenuItemImage_1` | UIMenuItemImage | [0, 0] | [0.5, 0.5] | [58, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_spr-dice-1.png` 3893814a-45d1-4782-8855-9b6672ac2880 |
| `/ChampionGuessLayer/node_lineup/lbl_dice1` | UILabelTTF | [-264.96, -44.64] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「竞猜」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionGuessLayer/node_lineup/node_guess` | CCNode | [0.0, -69.92] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessLayer/node_lineup/node_guess/lbl_name1` | UILabelTTF | [-218, 31] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 FZCSJW--GB1-0.ttf rgb[117, 205, 255] |
| `/ChampionGuessLayer/node_lineup/node_guess/lbl_odds1` | UILabelTTF | [-218, -31] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionGuessLayer/node_lineup/node_guess/lbl_name2` | UILabelTTF | [218, 31] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」22 FZCSJW--GB1-0.ttf rgb[251, 164, 109] |
| `/ChampionGuessLayer/node_lineup/node_guess/lbl_odds2` | UILabelTTF | [218, -31] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「—」20 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |

## ChampionGuessTipLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionGuessTipLayer` | ChampionGuessTipLayer | [0, 0] | [0, 0] | [550, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessTipLayer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [550, 400] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-14.png` 51e2505a-e684-400e-b2cc-86f9c004fb34 insets[15, 15, 15, 15] |
| `/ChampionGuessTipLayer/node_title` | CCNode | [275.0, 400.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessTipLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionGuessTipLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「温馨提示」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionGuessTipLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionGuessTipLayer/menu/btn_close` | UIMenuItemImage | [501, 377.4] | [0.5, 0.5] | [55, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionGuessTipLayer/menu/btn_cancel` | UIMenuItemLabel | [165, 56.4] | [0.5, 0.5] | [100, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-6.png` 1c63a943-d917-4960-b1a9-00b20e9a7afd · Label「取消」38 [255, 255, 255, 255] |
| `/ChampionGuessTipLayer/menu/UIMenuItemLabel_1` | UIMenuItemLabel | [385, 56.4] | [0.5, 0.5] | [102, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「前往参与」38 [255, 255, 255, 255] |
| `/ChampionGuessTipLayer/spr_scroll_bg` | CCScale9Sprite | [276, 153] | [0.5, 0.5] | [520, 126] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/ChampionGuessTipLayer/CCSprite_1` | CCSprite | [60, 158] | [0.5, 0.5] | [70, 118] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-bg-2.png` 6e9db8e8-4a32-4dee-ae6c-ff2088232c96 |
| `/ChampionGuessTipLayer/scroll_view` | UIScrollViewBackpack | [322, 99] | [0.5, 0] | [410, 110] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## ChampionLayer（26）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionLayer` | ChampionLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-champion-show.jpg` 064cee2a-39b6-4bfc-93c3-8b04df828141 |
| `/ChampionLayer/node_top` | CCNode | [321.0, 806.4] | [0.5, 0.5] | [640.0, -270.0] | [1, 1] | 0 | 是 |  |
| `/ChampionLayer/node_top/spr_round_bg` | CCScale9Sprite | [0.0, 502.2] | [0.5, 0.5] | [512, 90] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_text-bg.png` 84e94b58-4de9-4d72-bd7c-2451c92b780f |
| `/ChampionLayer/node_top/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0.5] | [640.0, -270.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/championship/championship_spr-bg-7.png` 99e4e374-a60c-41bf-908e-859829e0917b insets[1, 1, 180, 180] |
| `/ChampionLayer/node_top/spr_select` | CCSprite | [-197.0, 0.0] | [0.5, 0.5] | [136, 46] | [0.97, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-selected-1.png` 0e3bf499-e01a-49bf-893c-af8af783342b |
| `/ChampionLayer/node_top/CCNode_1` | CCNode | [0.0, 0.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionLayer/node_top/CCNode_1/CCSprite_1` | CCSprite | [-129.306, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/ChampionLayer/node_top/CCNode_1/CCSprite_2` | CCSprite | [0, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/ChampionLayer/node_top/CCNode_1/CCSprite_3` | CCSprite | [129.3, 0] | [0.5, 0.5] | [2, 45] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-100.png` b560bcd0-289f-4bd3-ac58-65d22eb2770a |
| `/ChampionLayer/node_top/CCMenu_1` | CCMenu | [320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionLayer/node_top/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-74.2, 63.44] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/ChampionLayer/node_top/CCMenu_1/UIMenuItemImage_2` | UIMenuItemImage | [-37, 0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/ChampionLayer/node_top/CCMenu_1/btn_reward` | UIMenuItemImage | [-37, -64.16] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/clan/clan-boss-lang_btn-boss-reward.png` 54fd9d0e-54b0-4a82-a0d0-6d4670be2a7e |
| `/ChampionLayer/node_top/CCMenu_1/btn_history` | UIMenuItemImage | [-37, -123.16] | [0.5, 0.5] | [66, 74] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/clan/clan-boss-lang_btn-clan-boss-history.png` 4628935d-dc54-46a8-8a36-ae9673d2fb06 |
| `/ChampionLayer/node_top/CCMenu_2` | CCMenu | [0.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionLayer/node_top/CCMenu_2/btn_tab2` | UIMenuItemLabel | [-65, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionLayer/node_top/CCMenu_2/btn_tab3` | UIMenuItemLabel | [65, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionLayer/node_top/CCMenu_2/btn_tab1` | UIMenuItemLabel | [-195, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionLayer/node_top/CCMenu_2/btn_tab4` | UIMenuItemLabel | [195, 0] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/ChampionLayer/node_top/CCMenu_3` | CCMenu | [-320.0, 0.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionLayer/node_top/CCMenu_3/btn_shop` | UIMenuItemImage | [99, 79] | [0.5, 0.5] | [80, 86] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-shop.png` 62562a96-aefd-40fa-8b10-06c986f5addb |
| `/ChampionLayer/node_top/CCMenu_3/btn_edit_biu` | UIMenuItemImage | [36, -63] | [0.5, 0.5] | [44, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-xdm-1.png` 9771bcb2-d3c4-4626-b54e-ba921586c85d |
| `/ChampionLayer/node_top/CCMenu_3/btn_biu_visible` | UIMenuItemCheckBox | [36, -125] | [0.5, 0.5] | [44, 48] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-dm-2.png` 815e9b78-8ca1-4113-bd1a-decc93bb5fa2 pressed `ui/championship/championship_btn-dm-1.png` df8c099c-f0f7-45f9-be02-5cec6014735a |
| `/ChampionLayer/node_top/lbl_battle_round` | UILabelTTF | [0.0, 421.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冠军赛未开始」30 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionLayer/node_top/lbl_battle_time` | UILabelTTF | [0.0, 637.2] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「冠军赛未开始」20 STZhongsong.ttf rgb[43, 249, 0] |

## ChampionListLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionListLayer` | ChampionListLayer | [0, 0] | [0, 0] | [562, 840] | [1, 1] | 0 | 是 |  |
| `/ChampionListLayer/spr_bg` | CCScale9Sprite | [281.0, 0.0] | [0.5, 0] | [610, 840] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ChampionListLayer/node_title` | CCNode | [281.0, 830.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionListLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/ChampionListLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「我的竞猜」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/ChampionListLayer/spr_panel_bg` | CCScale9Sprite | [281.0, 57.6] | [0.5, 0] | [542.5, 695] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionListLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionListLayer/UIMenu_1/btn_close` | UIMenuItemImage | [525, 831] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionListLayer/scroll_view` | UIScrollViewBackpack | [281.0, 60.0] | [0.5, 0] | [540, 690] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ChampionMyCompeteLayer（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionMyCompeteLayer` | ChampionMyCompeteLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionMyCompeteLayer/node_lineup` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionMyCompeteLayer/node_lineup/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionMyCompeteLayer/node` | CCNode | [320.0, 432.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionMyCompeteLayer/node/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [492, 582] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-qi-1.png` 52795506-8c9a-47f0-b0ae-fb9fd052e8c0 |
| `/ChampionMyCompeteLayer/node/lbl_title` | UILabelTTF | [0, -44.928] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「本次冠军赛未开始」24 STZhongsong.ttf rgbNone |
| `/ChampionMyCompeteLayer/node/lbl_time_tip` | UILabelTTF | [-95.04, -84.672] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「开启倒计时：」20 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionMyCompeteLayer/node/lbl_start_time` | UILabelTTF | [18.297, -84.672] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「00:00:00」20 STZhongsong.ttf rgb[43, 249, 0] |

## ChampionMyGuessCell（20）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionMyGuessCell` | ChampionMyGuessCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/ChampionMyGuessCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/ChampionMyGuessCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/ChampionMyGuessCell/spr_head1` | CCSprite | [61, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionMyGuessCell/spr_border1` | CCSprite | [61, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionMyGuessCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionMyGuessCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyGuessCell/spr_head2` | CCSprite | [201, 83] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionMyGuessCell/spr_border2` | CCSprite | [201, 83] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionMyGuessCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionMyGuessCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyGuessCell/lbl_round` | UILabelTTF | [257, 99] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyGuessCell/UILabelTTF_1` | UILabelTTF | [257, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「投注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyGuessCell/lbl_bet_name` | UILabelTTF | [308, 67] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名称」18 FZCSJW--GB1-0.ttf rgb[213, 112, 31] |
| `/ChampionMyGuessCell/lbl_bet_text` | UILabelTTF | [257, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「下注：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyGuessCell/CCSprite_2` | CCSprite | [321, 35] | [0.5, 0.5] | [100, 100] | [0.25, 0.25] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_901302.png` 0595ee9a-92ec-4d40-8c18-8f2bc2a4b133 |
| `/ChampionMyGuessCell/lbl_bet_num` | UILabelTTF | [337, 36] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/ChampionMyGuessCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionMyGuessCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/ChampionMyGuessCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |

## ChampionMyHistoryCell（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionMyHistoryCell` | ChampionMyHistoryCell | [0, 0] | [0, 0] | [540, 140] | [1, 1] | 0 | 是 |  |
| `/ChampionMyHistoryCell/spr_cell_bg` | CCScale9Sprite | [0, 1] | [0.5, 0.5] | [540, 140] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/misc/fantasy-land_spr-cell-bg.png` cc2f3fd9-228c-460e-8b99-1d69ec446938 insets[10, 10, 10, 10] |
| `/ChampionMyHistoryCell/CCSprite_1` | CCSprite | [132, 71] | [0.5, 0.5] | [42, 58] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/misc/fantasy-land_spr-vs.png` 8190a75e-5793-4fec-91bf-be44d92ad5c5 |
| `/ChampionMyHistoryCell/spr_head1` | CCSprite | [61, 81.553] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionMyHistoryCell/spr_border1` | CCSprite | [61, 81.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionMyHistoryCell/lbl_name1` | UILabelTTF | [61, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyHistoryCell/spr_head2` | CCSprite | [201, 81.6] | [0.5, 0.5] | [91, 91] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionMyHistoryCell/spr_border2` | CCSprite | [201, 81.6] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionMyHistoryCell/lbl_name2` | UILabelTTF | [201, 30] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名称」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyHistoryCell/lbl_round` | UILabelTTF | [257, 82] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛第一回合」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyHistoryCell/lbl_point_tip` | UILabelTTF | [257, 49] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得积分：」20 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/ChampionMyHistoryCell/lbl_point` | UILabelTTF | [351, 49] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/ChampionMyHistoryCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionMyHistoryCell/CCMenu_1/btn_replay` | UIMenuItemImage | [503.4, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-3.png` 9bea7712-2fd4-425e-9159-6b28baea01b0 |
| `/ChampionMyHistoryCell/CCMenu_1/btn_report` | UIMenuItemImage | [444.608, 70] | [0.5, 0.5] | [46, 56] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-battle-detail-2.png` c2ea8cca-f6ea-4453-af3f-e3a55cbfc8e4 |
| `/ChampionMyHistoryCell/spr_win1` | CCSprite | [37.493, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |
| `/ChampionMyHistoryCell/spr_win2` | CCSprite | [173.604, 102.909] | [0.5, 0.5] | [51, 44] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_spr-win-1.png` ea212618-7b81-4094-88bc-44c5475d1a4c |

## ChampionPreRewardLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionPreRewardLayer` | ChampionPreRewardLayer | [0, 0] | [0, 0] | [640, 582] | [1, 1] | 0 | 是 |  |
| `/ChampionPreRewardLayer/CCSprite_1` | CCSprite | [320.0, 291.0] | [0.5, 0.5] | [492, 582] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-bg-1.png` b6e96802-2fda-4ce4-8c03-a23bb601f7b5 |
| `/ChampionPreRewardLayer/UILabelTTF_1` | UILabelTTF | [248.384, 432.771] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「排名:」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionPreRewardLayer/UILabelTTF_2` | UILabelTTF | [248.4, 385.549] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「比赛场数：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionPreRewardLayer/UILabelTTF_3` | UILabelTTF | [248.4, 328.605] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获胜场数：」22 STZhongsong.ttf rgb[254, 223, 170] |
| `/ChampionPreRewardLayer/lbl_rank` | UILabelTTF | [307.906, 432.8] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionPreRewardLayer/lbl_count` | UILabelTTF | [353.044, 385.539] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionPreRewardLayer/lbl_win_count` | UILabelTTF | [353.044, 328.644] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionPreRewardLayer/lbl_text1` | UILabelTTF | [235.2, 228.349] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜」24 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionPreRewardLayer/lbl_name` | UILabelTTF | [288.0, 228.349] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜」24 STZhongsong.ttf rgb[255, 213, 107] |
| `/ChampionPreRewardLayer/lbl_bet_name` | UILabelTTF | [320.0, 185.149] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「获得以上成就」24 STZhongsong.ttf rgb[254, 255, 255] |

## ChampionRankCell（18）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionRankCell` | ChampionRankCell | [0, 0] | [0, 0] | [630, 130] | [1, 1] | 0 | 是 |  |
| `/ChampionRankCell/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [630, 130] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/rank_spr-cell-bg-2.png` 63838f2e-a52b-49a5-bbaf-7938180555a9 insets[40, 40, 40, 40] |
| `/ChampionRankCell/spr_rank` | CCSprite | [64, 97] | [0.5, 0.5] | [58, 71] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank_spr-paihang-1.png` ad9398c9-a56f-4c50-a778-4dc2a4c61403 |
| `/ChampionRankCell/lbl_name` | UILabelTTF | [189, 79] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「网络正在加载」44 STZhongsong.ttf rgb[85, 30, 20] |
| `/ChampionRankCell/lbl_rank` | UILabelTTF | [64, 60] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「未上榜」22 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionRankCell/CCSprite_1` | CCSprite | [202, 46] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/ChampionRankCell/lbl_combat_num` | UILabelTTF | [217, 46] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「0」44 STZhongsong.ttf rgb[120, 65, 0] |
| `/ChampionRankCell/spr_head` | CCSprite | [146, 64] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionRankCell/spr_frame` | CCSprite | [146, 64] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/ChampionRankCell/node_right` | CCNode | [517, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionRankCell/node_right/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionRankCell/node_right/CCMenu_1/btn_like` | UIMenuItemImage | [-4.939, 2.443] | [0.5, 0.5] | [134, 44] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-4.png` bb72e417-45f6-4e8b-ad88-67505f497167 |
| `/ChampionRankCell/node_right/spr_like` | CCSprite | [-37.938, 2.553] | [0.5, 0.5] | [60, 60] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionRankCell/node_right/lbl_like` | UILabelTTF | [13.502, 2.553] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」18 STZhongsong.ttf rgb[85, 30, 20] |
| `/ChampionRankCell/node_right/UILabelTTF_1` | UILabelTTF | [-77.938, -37.947] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「选拔赛分数：」16 STZhongsong.ttf rgb[85, 30, 20] |
| `/ChampionRankCell/node_right/lbl_point` | UILabelTTF | [19.062, -37.947] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「1000」18 STZhongsong.ttf rgb[28, 150, 17] |
| `/ChampionRankCell/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionRankCell/menu/btn_role` | UIMenuItemImage | [146, 64] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## ChampionRankLayer（7）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionRankLayer` | ChampionRankLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionRankLayer/node_bottom` | CCNode | [320.0, 119.1] | [0.5, 0] | [640.0, -180.0] | [1, 1] | 0 | 是 |  |
| `/ChampionRankLayer/node_bottom/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 0.0] | [0.5, 0] | [640.0, -180.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionRankLayer/node_bottom/spr_ribbon` | CCSprite | [0.0, -176.143] | [0.5, 0.5] | [226, 42] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/rank-lang_spr-paimingk-3.png` 6dd14941-10db-4594-b9ca-8106425f7b1a |
| `/ChampionRankLayer/node_top` | CCNode | [320.0, 765.75] | [0.5, 1] | [640.0, 525.0] | [1, 1] | 0 | 是 |  |
| `/ChampionRankLayer/node_top/spr_rank_bg` | CCScale9Sprite | [0.0, 0.0] | [0.5, 1] | [640.0, 525.0] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[10, 10, 10, 10] |
| `/ChampionRankLayer/node_top/scroll_view` | UIScrollViewBackpack | [0.0, 0.0] | [0.5, 1] | [640.0, 525.0] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ChampionRewardLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionRewardLayer` | ChampionRewardLayer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionRewardLayer/spr_bg` | CCSprite | [320, 200] | [0.5, 0.5] | [640, 400] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/ChampionRewardLayer/spr_title` | CCSprite | [320, 395] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE **缺图** reward-layer/spr-reward.png |
| `/ChampionRewardLayer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/ChampionRewardLayer/lbl_title` | UILabelTTF | [320.0, 267.52] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「恭喜你在选拔赛第二回合竞猜中押注成功」20 STZhongsong.ttf rgb[255, 229, 191] |

## ChampionShopLayer（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionShopLayer` | ChampionShopLayer | [0, 0] | [0, 0] | [620, 780] | [1, 1] | 0 | 是 |  |
| `/ChampionShopLayer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 800] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/ChampionShopLayer/spr_bg` | CCNode | [20, 130] | [0, 0] | [580, 580] | [1, 1] | 0 | 是 |  |
| `/ChampionShopLayer/CCSprite_1` | CCSprite | [310, 796] | [0.5, 0.5] | [424, 68] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/shop/shop_shop_1.png` 1d6eb9e5-f7b9-4582-9237-d28f1ea51bd5 |
| `/ChampionShopLayer/lbl_name` | UILabelTTF | [313, 782] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「冠军商城」56 STZhongsong.ttf rgb[253, 229, 190] |
| `/ChampionShopLayer/res_node` | CCNode | [15, 70] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShopLayer/res_node/CCScale9Sprite_1` | CCScale9Sprite | [90, 8] | [0.5, 0.5] | [134, 40] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/shop/shop_shop_8.png` 9138e906-fa3b-43ae-8d75-2c0074857c63 insets[0, 0, 15, 15] |
| `/ChampionShopLayer/res_node/spr_icon` | CCSprite | [46, 9] | [0.5, 0.5] | [100, 100] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900201.png` 0edcb029-2a94-4250-ab84-2a342ed5e9af |
| `/ChampionShopLayer/res_node/lbl_num` | UILabelTTF | [75, 7] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「999」40 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionShopLayer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShopLayer/UIMenu_1/btn_close` | UIMenuItemImage | [558, 752] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/ChampionShopLayer/lbl_time` | UILabelTTF | [410, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「免费刷新 06:06:06」20 STZhongsong.ttf rgb[141, 89, 58] |

## ChampionShowLayer（63）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionShowLayer` | ChampionShowLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/spr_bg` | CCSprite | [320.0, 480.0] | [0.5, 0.5] | [640, 1280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-champion-show.jpg` 064cee2a-39b6-4bfc-93c3-8b04df828141 |
| `/ChampionShowLayer/node_top1` | CCNode | [640.0, 864.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_top1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_top1/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-80.2, -10.56] | [0.5, 0.5] | [119, 55] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-back-1.png` 627c36cc-c74d-4119-ae02-3071a3fc92b0 |
| `/ChampionShowLayer/node_top1/CCMenu_1/UIMenuItemImage_2` | UIMenuItemImage | [-64.8, -77] | [0.5, 0.5] | [74, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-rank-1.png` e89724ce-6c19-48a9-9548-12d899765191 |
| `/ChampionShowLayer/node_top1/CCMenu_1/UIMenuItemImage_3` | UIMenuItemImage | [-64.8, -158.16] | [0.5, 0.5] | [74, 76] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-show-1.png` ca4c711f-fd17-4bca-b7de-f7a40942db04 |
| `/ChampionShowLayer/node_top2` | CCNode | [0.0, 864.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_top2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_top2/CCMenu_1/btn_pvp` | UIMenuItemImage | [73.44, -34.56] | [0.5, 0.5] | [112, 94] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/arena/championship-lang_btn-rank-battle-2.png` 54854bfb-a883-4c4a-a7c0-d63e28324067 |
| `/ChampionShowLayer/node_top2/CCSprite_1` | CCSprite | [106.56, -114.48] | [0.5, 0.5] | [212, 48] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-5.png` a13219e5-c2b1-4b7a-8560-2faa907c673a |
| `/ChampionShowLayer/node_top2/UILabelTTF_1` | UILabelTTF | [66.24, -114.48] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「被膜拜次数：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/node_top2/lbl_worship_count` | UILabelTTF | [119.52, -114.48] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」24 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/ChampionShowLayer/CCNode_1` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_1` | UIMenuItemLabel | [-123.84, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-blue-5.png` f299f719-c6f0-4365-a780-3ac666a22030 · Label「」48 [255, 255, 255, 255] |
| `/ChampionShowLayer/CCNode_1/CCMenu_1/UIMenuItemLabel_2` | UIMenuItemLabel | [118.08, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「」48 [255, 255, 255, 255] |
| `/ChampionShowLayer/CCScale9Sprite_1` | CCScale9Sprite | [0.0, 237.155] | [0, 0.5] | [640.0, 200] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/championship/championship_spr-bg-6.png` 1ee4345c-3932-4dc0-8de4-78896fd70d78 insets[1, 1, 1, 1] |
| `/ChampionShowLayer/CCNode_2` | CCNode | [640.0, 237.72] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/CCNode_2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/CCNode_2/CCMenu_1/UIMenuItemImage_1` | UIMenuItemImage | [-61.2, 60.0] | [0.5, 0.5] | [60, 61] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-info-2.png` 95a88386-1b3d-4b5e-9b71-0674f7593b8d |
| `/ChampionShowLayer/CCNode_3` | CCNode | [0.0, 237.635] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/CCNode_3/UILabelTTF_1` | UILabelTTF | [48, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前赛程：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/UILabelTTF_2` | UILabelTTF | [48, 35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「当前排名：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/UILabelTTF_3` | UILabelTTF | [48, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「历史最高排名：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/UILabelTTF_4` | UILabelTTF | [46.56, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「赛季时间：」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/UILabelTTF_5` | UILabelTTF | [46.56, -70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「系统提示：赛季结束时将通过邮件发放排名奖励」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/lbl_season_status` | UILabelTTF | [147.36, 70] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「暂未开启」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/lbl_my_rank` | UILabelTTF | [145.92, 35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999」22 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/ChampionShowLayer/CCNode_3/lbl_my_rank_max` | UILabelTTF | [183.36, 0] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「999999」22 FZCSJW--GB1-0.ttf rgb[255, 143, 65] |
| `/ChampionShowLayer/CCNode_3/lbl_season_time1` | UILabelTTF | [143.04, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「10.14-10.16」20 FZCSJW--GB1-0.ttf rgbNone |
| `/ChampionShowLayer/CCNode_3/lbl_season_time2` | UILabelTTF | [262.56, -35] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「(剩余时间：27小时46分)」18 FZCSJW--GB1-0.ttf rgb[43, 249, 0] |
| `/ChampionShowLayer/node_show_parent` | CCNode | [320.0, 499.475] | [0.5, 0.5] | [640.0, 288.0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show3` | CCNode | [216.96, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show3/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/ChampionShowLayer/node_show_parent/node_show3/CCSprite_2` | CCSprite | [0, 225.793] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank3.png` 69422450-8daa-4591-8d9b-c48e87087d9a |
| `/ChampionShowLayer/node_show_parent/node_show3/CCSprite_3` | CCSprite | [0, 136.433] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/ChampionShowLayer/node_show_parent/node_show3/CCSprite_4` | CCSprite | [0, 136.433] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-king-1.png` ad710f6d-7b7d-45aa-9759-77d4119fa603 |
| `/ChampionShowLayer/node_show_parent/node_show3/lbl_name3` | UILabelTTF | [-0.96, 106.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionShowLayer/node_show_parent/node_show3/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show3/CCMenu_1/btn_like3` | UIMenuItemImage | [-48.36, -167.433] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionShowLayer/node_show_parent/node_show3/lbl_like3` | UILabelTTF | [-0.96, -163.683] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionShowLayer/node_show_parent/node_show2` | CCNode | [-216.255, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show2/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [202, 398] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-2.png` 14e251d6-0f4b-4a58-a27f-5706ff8d6518 |
| `/ChampionShowLayer/node_show_parent/node_show2/CCSprite_2` | CCSprite | [0, 225.793] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank2.png` a263d50a-0908-449b-8264-e5e309e97cad |
| `/ChampionShowLayer/node_show_parent/node_show2/CCSprite_3` | CCSprite | [0, 136.433] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/ChampionShowLayer/node_show_parent/node_show2/CCSprite_4` | CCSprite | [0, 136.433] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-king-1.png` ad710f6d-7b7d-45aa-9759-77d4119fa603 |
| `/ChampionShowLayer/node_show_parent/node_show2/lbl_name2` | UILabelTTF | [-0.96, 106.193] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionShowLayer/node_show_parent/node_show2/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show2/CCMenu_1/btn_like2` | UIMenuItemImage | [-48.36, -167.433] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionShowLayer/node_show_parent/node_show2/lbl_like2` | UILabelTTF | [-0.96, -163.683] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionShowLayer/node_show_parent/node_show1` | CCNode | [0.0, 14.4] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show1/CCSprite_1` | CCSprite | [0, 0] | [0.5, 0.5] | [230, 474] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-1.png` 237477ff-b2e7-41c4-bdef-c5810e15b575 |
| `/ChampionShowLayer/node_show_parent/node_show1/CCSprite_2` | CCSprite | [0, 264.96] | [0.5, 0.5] | [68, 56] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_lbl-rank1.png` 2b916702-c418-460f-a15e-6c295c2d79a5 |
| `/ChampionShowLayer/node_show_parent/node_show1/CCSprite_3` | CCSprite | [0, 165.6] | [0.5, 0.5] | [160, 34] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-bg-4.png` 6c1d2c4a-cf89-4faa-8b21-80c0d7587e5a |
| `/ChampionShowLayer/node_show_parent/node_show1/CCSprite_4` | CCSprite | [0, 165.6] | [0.5, 0.5] | [102, 28] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-king-1.png` ad710f6d-7b7d-45aa-9759-77d4119fa603 |
| `/ChampionShowLayer/node_show_parent/node_show1/lbl_name1` | UILabelTTF | [-0.96, 135.36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「王者」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionShowLayer/node_show_parent/node_show1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_show1/CCMenu_1/btn_like1` | UIMenuItemImage | [-55.86, -201.6] | [0.5, 0.5] | [60, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-like-1.png` f417f0a0-1110-4d27-9714-69958f3b9f2c |
| `/ChampionShowLayer/node_show_parent/node_show1/lbl_like1` | UILabelTTF | [-0.96, -199.517] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「0」22 FZCSJW--GB1-0.ttf rgb[254, 255, 255] |
| `/ChampionShowLayer/node_show_parent/node_hero3` | CCNode | [216.96, 3.888] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_hero2` | CCNode | [-216.32, 3.9] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionShowLayer/node_show_parent/node_hero1` | CCNode | [0.0, -12.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |

## ChampionTop32Layer（14）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionTop32Layer` | ChampionTop32Layer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/spr_bg` | CCLayerColor | [320.0, 960.0] | [0.5, 1] | [640.0, 960.0] | [1, 1] | 0 | 是 | cc.Graphics fill rgb[0, 0, 0] a125 |
| `/ChampionTop32Layer/node_lineup` | CCNode | [320.0, 119.1] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/node_lineup/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/node_lineup/CCMenu_1/onLineup` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [197, 60] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-5.png` efc1fc5d-cf25-40b2-a9c4-dc70a83805fd · Label「我的竞猜」48 [255, 255, 255, 255] |
| `/ChampionTop32Layer/node_top` | CCNode | [320.0, 765.75] | [0.5, 0] | [640.0, -240.0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/node_top/CCMenu_1` | CCMenu | [-320.0, 0.0] | [0, 0] | [640.0, -240.0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/node_top/CCMenu_1/btn_top32` | UIMenuItemTab | [0.0, 0.0] | [0, 0] | [170, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-tab-1-2.png` f92ed9e4-656b-4553-ac11-686e8b6c0785 pressed `ui/championship/championship_btn-tab-1-1.png` 678e12de-4876-42f6-af1a-e36f8bc96a6b |
| `/ChampionTop32Layer/node_top/CCMenu_1/btn_top4` | UIMenuItemTab | [640.0, 0.0] | [1, 0] | [170, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-tab-2-2.png` b67f1038-f177-43ef-87fb-782eecc735ba pressed `ui/championship/championship_btn-tab-2-1.png` 2ba61247-baa9-4996-957b-98a594536b22 |
| `/ChampionTop32Layer/node_top/lbl_groud` | UILabelTTF | [0.0, -69.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「A组」26 STZhongsong.ttf rgb[255, 221, 119] |
| `/ChampionTop32Layer/CCMenu_1` | CCMenu | [0.0, 480.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/CCMenu_1/btn_left` | UIMenuItemImage | [60, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-left.png` 70f4e648-889b-4654-a3f5-8014db0ec43e |
| `/ChampionTop32Layer/CCMenu_2` | CCMenu | [640.0, 480.0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop32Layer/CCMenu_2/btn_right` | UIMenuItemImage | [-60, 0] | [0.5, 0.5] | [48, 70] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-right.png` 6fce60e7-46cd-421b-9b35-ab0517502645 |

## ChampionTop3Layer（17）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionTop3Layer` | ChampionTop3Layer | [0, 0] | [0, 0] | [640, 400] | [1, 1] | 0 | 是 |  |
| `/ChampionTop3Layer/spr_bg` | CCSprite | [320, 215] | [0.5, 0.5] | [640, 400] | [1, 1.12] | 0 | 是 | cc.Sprite SIMPLE `ui/maps/map-bg-result-1.png` ec14e804-0bfd-45e8-a35d-6e5e4c7fe3b1 |
| `/ChampionTop3Layer/spr_title` | CCSprite | [320, 425] | [0.5, 0.5] | [450, 66] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top3-1.png` 0d20431b-c168-44db-b2e2-1c2899ff5a5b |
| `/ChampionTop3Layer/CCSprite_1` | CCSprite | [320, -20] | [0.5, 0.5] | [218, 38] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_close-tips.png` 2cd6354b-c486-4f54-b21b-2bcd0373ea79 |
| `/ChampionTop3Layer/CCSprite_2` | CCSprite | [320, 226] | [0.5, 0.5] | [246, 340] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-1.png` 63e636bf-c67a-4835-b291-3906e6fc7abc |
| `/ChampionTop3Layer/lbl_time` | UILabelTTF | [320.0, 31.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「比赛时间：00：00：00」20 STZhongsong.ttf rgb[43, 249, 0] |
| `/ChampionTop3Layer/CCSprite_3` | CCSprite | [531, 226] | [0.5, 0.5] | [200, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-2.png` b7676429-d4c2-4320-88bb-b9c570db2b10 |
| `/ChampionTop3Layer/CCSprite_4` | CCSprite | [109, 226] | [0.5, 0.5] | [200, 280] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship-2-lang/championship-2-lang_spr-top-3.png` ed807480-6bdb-4c82-9bb1-d95bec8d9d70 |
| `/ChampionTop3Layer/lbl_name1` | UILabelTTF | [320.0, 166.0] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「-」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionTop3Layer/lbl_name2` | UILabelTTF | [109, 166] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「记忆进市区」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionTop3Layer/lbl_name3` | UILabelTTF | [531, 166] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「芋圆珍珠」20 STZhongsong.ttf rgb[254, 255, 255] |
| `/ChampionTop3Layer/spr_head1` | CCSprite | [320, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionTop3Layer/spr_frame1` | CCSprite | [320, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/ChampionTop3Layer/spr_head2` | CCSprite | [109, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionTop3Layer/spr_frame2` | CCSprite | [109, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |
| `/ChampionTop3Layer/spr_head3` | CCSprite | [531, 235] | [0.5, 0.5] | [91, 91] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionTop3Layer/spr_frame3` | CCSprite | [531, 235] | [0.5, 0.5] | [138, 138] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005001.png` c628863a-ca16-4096-be03-4acb496fad97 |

## ChampionTop4Cell（42）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionTop4Cell` | ChampionTop4Cell | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/ChampionTop4Cell/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop4Cell/node_light/line_light_4_1_1` | CCSprite | [239.912, 602.928] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop4Cell/node_light/line_light_4_1_2` | CCSprite | [398.869, 603.039] | [0.5, 0.5] | [160, 62] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop4Cell/node_light/line_light_4_1_z` | CCSprite | [320, 553.868] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop4Cell/node_light/line_light_4_2_2` | CCSprite | [398.869, 96.272] | [0.5, 0.5] | [160, 62] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop4Cell/node_light/line_light_4_2_1` | CCSprite | [239.912, 96.161] | [0.5, 0.5] | [160, 62] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop4Cell/node_light/line_light_4_2_z` | CCSprite | [320, 145.219] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop4Cell/node_light/line_light_2_1_2` | CCSprite | [320, 252.658] | [0.5, 0.5] | [10, 56] | [-1, 2.2] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop4Cell/node_light/line_light_2_1_1` | CCSprite | [320, 466.008] | [0.5, 0.5] | [10, 56] | [-1, 1.9] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop4Cell/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop4Cell/node_gray/line_gray_4_1_1_1` | CCSprite | [164.879, 625.229] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_1_1_2` | CCSprite | [162.803, 577.234] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_1_2_2` | CCSprite | [476.396, 577.234] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_1_2_1` | CCSprite | [475, 625.423] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_1_1_z` | CCSprite | [320, 578.972] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 519.029] | [0.5, 1] | [4, 50] | [1, 3.5] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_2_1_z` | CCSprite | [320, 197.326] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_2_2_2` | CCSprite | [475, 123.716] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_2_2_1` | CCSprite | [476.396, 121.643] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_2_1_1` | CCSprite | [162.803, 121.643] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_4_2_1_2` | CCSprite | [164.879, 122.685] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 194.332] | [0.5, 0] | [4, 50] | [1, 3.2] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop4Cell/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop4Cell/menu_player/btn_player_4_1_1` | UIMenuItemLabel | [165, 640] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop4Cell/menu_player/btn_player_4_1_2` | UIMenuItemLabel | [475, 640] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop4Cell/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 510] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop4Cell/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 190] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop4Cell/menu_player/btn_player_4_2_1` | UIMenuItemLabel | [165, 60] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop4Cell/menu_player/btn_player_4_2_2` | UIMenuItemLabel | [475, 60] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop4Cell/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop4Cell/menu_replay/btn_report_4_1` | UIMenuItemImage | [320, 575.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop4Cell/menu_replay/btn_report_4_2` | UIMenuItemImage | [320, 122.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop4Cell/menu_replay/btn_report_2_1` | UIMenuItemImage | [320, 255.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop4Cell/spr_head_bg` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [170, 172] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-gjtxk-1.png` 4a13f27d-5706-4286-941c-b3f1df402827 |
| `/ChampionTop4Cell/spr_head` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [91, 91] | [0.95, 0.95] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChampionTop4Cell/spr_border` | CCSprite | [320.0, 376.208] | [0.5, 0.5] | [138, 138] | [1.2, 1.2] | 0 | **否** | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChampionTop4Cell/spr_text` | CCSprite | [321.12, 321.408] | [0.5, 0.5] | [58, 30] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/arena/championship-lang_lbl-gjwz-1.png` 8fc3337b-1d09-4da3-a06a-6147653e7774 |
| `/ChampionTop4Cell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop4Cell/CCNode_1/spr_effect_4_1` | CCSprite | [320, 575.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop4Cell/CCNode_1/spr_effect_4_2` | CCSprite | [320, 122.2] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop4Cell/CCNode_1/spr_effect_2_1` | CCSprite | [320, 350] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |

## ChampionTop8Cell（86）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChampionTop8Cell` | ChampionTop8Cell | [0, 0] | [0, 0] | [640, 700] | [1, 1] | 0 | 是 |  |
| `/ChampionTop8Cell/node_light` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop8Cell/node_light/line_light_8_1_1` | CCSprite | [125.088, 623.585] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_1_2` | CCSprite | [205.199, 623.585] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_1_z` | CCSprite | [164.583, 574.368] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_8_2_1` | CCSprite | [433.928, 623.585] | [0.5, 0.5] | [85, 66] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_2_2` | CCSprite | [514.984, 623.585] | [0.5, 0.5] | [85, 66] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_2_z` | CCSprite | [474.19, 572.996] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_4_1_1` | CCSprite | [239.912, 495.503] | [0.5, 0.5] | [160, 62] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop8Cell/node_light/line_light_4_1_2` | CCSprite | [398.869, 495.615] | [0.5, 0.5] | [160, 62] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop8Cell/node_light/line_light_4_1_z` | CCSprite | [320, 446.443] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_4_2_2` | CCSprite | [398.869, 197.638] | [0.5, 0.5] | [160, 62] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop8Cell/node_light/line_light_4_2_1` | CCSprite | [239.912, 197.527] | [0.5, 0.5] | [160, 62] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-2.png` 0c1edfb9-7186-4280-8644-65ee6ae814eb |
| `/ChampionTop8Cell/node_light/line_light_4_2_z` | CCSprite | [320, 246.584] | [0.5, 0.5] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_2_1_2` | CCSprite | [320, 305.728] | [0.5, 0.5] | [10, 56] | [-1, 1.5] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_2_1_1` | CCSprite | [320, 376.908] | [0.5, 0.5] | [10, 56] | [-1, 1.5] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_8_3_1` | CCSprite | [125.088, 67.335] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_3_2` | CCSprite | [205.199, 67.335] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_3_z` | CCSprite | [164.583, 117.424] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_light/line_light_8_4_1` | CCSprite | [434.811, 67.335] | [0.5, 0.5] | [85, 66] | [1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_4_2` | CCSprite | [514.922, 67.335] | [0.5, 0.5] | [85, 66] | [-1, -1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-corner-1.png` a77b08c1-872e-4578-8d23-ebb57409d8a4 |
| `/ChampionTop8Cell/node_light/line_light_8_4_z` | CCSprite | [474.306, 117.424] | [0.5, 0.4989] | [10, 56] | [-1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/championship/championship_spr-line-2.png` 3ffb7686-b6fd-4d6b-b7aa-0f8c5414297a |
| `/ChampionTop8Cell/node_gray` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop8Cell/node_gray/line_gray_8_1_1_1` | CCSprite | [87.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_1_1_2` | CCSprite | [85.691, 597.115] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_1_2_1` | CCSprite | [242.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_1_2_2` | CCSprite | [244.111, 597.086] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_1_1_z` | CCSprite | [164.6, 599.355] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_2_1_1` | CCSprite | [397.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_2_1_2` | CCSprite | [395.971, 597.127] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_2_2_1` | CCSprite | [552.5, 645.187] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_2_2_2` | CCSprite | [554.097, 597.043] | [0.5, 1] | [4, 50] | [1, 1.6] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_2_1_z` | CCSprite | [474.354, 599.161] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_1_1_1` | CCSprite | [164.879, 517.849] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_1_1_2` | CCSprite | [162.803, 469.853] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_1_2_2` | CCSprite | [476.396, 469.853] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_1_2_1` | CCSprite | [475, 518.043] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_1_1_z` | CCSprite | [320, 471.592] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_2_1_1_1` | CCSprite | [320, 414.105] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_2_1_z` | CCSprite | [320, 299.845] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_2_2_2` | CCSprite | [475, 226.068] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_2_2_1` | CCSprite | [476.396, 224.161] | [0.5, 1] | [4, 50] | [1, 3.14] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_2_1_1` | CCSprite | [162.803, 224.161] | [0.5, 1] | [4, 50] | [1, 3.14] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_4_2_1_2` | CCSprite | [164.879, 225.204] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_3_1_2` | CCSprite | [87.5, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_3_1_1` | CCSprite | [85.691, 94.337] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_3_2_1` | CCSprite | [244.111, 94.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_3_2_2` | CCSprite | [242.5, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_3_1_z` | CCSprite | [164.6, 169.604] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_4_1_2` | CCSprite | [397.498, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_4_1_1` | CCSprite | [395.689, 94.337] | [0.5, 1] | [4, 50] | [1, 1.6] | 90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_4_2_1` | CCSprite | [554.109, 94.309] | [0.5, 1] | [4, 50] | [1, 1.75] | -90 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_4_2_2` | CCSprite | [552.498, 95.858] | [0.5, 1] | [4, 50] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_8_4_1_z` | CCSprite | [474.598, 169.604] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/node_gray/line_gray_2_1_2_1` | CCSprite | [320, 345.818] | [0.5, 1] | [4, 50] | [1, 1.55] | 0 | 是 | cc.Sprite SIMPLE `ui/championship/championship_spr-line-0.png` 21143c20-4520-47da-8051-21c81e002d13 |
| `/ChampionTop8Cell/menu_player` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop8Cell/menu_player/btn_player_8_1_1` | UIMenuItemLabel | [87.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_1_2` | UIMenuItemLabel | [242.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_2_1` | UIMenuItemLabel | [397.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_2_2` | UIMenuItemLabel | [552.5, 664.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_4_1_1` | UIMenuItemLabel | [165, 534.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_4_1_2` | UIMenuItemLabel | [475, 534.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_2_1_1` | UIMenuItemLabel | [320, 404.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_2_1_2` | UIMenuItemLabel | [320, 284.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_4_2_1` | UIMenuItemLabel | [165, 154.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_4_2_2` | UIMenuItemLabel | [475, 154.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_3_1` | UIMenuItemLabel | [87.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_3_2` | UIMenuItemLabel | [242.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_4_1` | UIMenuItemLabel | [397.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_player/btn_player_8_4_2` | UIMenuItemLabel | [552.5, 24.0] | [0.5, 0.5] | [136, 46] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/championship/championship_btn-player-1.png` dcf399de-da63-410c-b88f-07d94ede1f82 · Label「」36 [128, 61, 20, 255] |
| `/ChampionTop8Cell/menu_replay` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChampionTop8Cell/menu_replay/btn_report_8_1` | UIMenuItemImage | [164.6, 597.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/menu_replay/btn_report_8_2` | UIMenuItemImage | [474.4, 597.1] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/menu_replay/btn_report_4_1` | UIMenuItemImage | [320, 469.9] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/menu_replay/btn_report_4_2` | UIMenuItemImage | [320, 224.2] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/menu_replay/btn_report_2_1` | UIMenuItemImage | [320, 344.376] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/menu_replay/btn_report_8_3` | UIMenuItemImage | [164.6, 94.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/menu_replay/btn_report_8_4` | UIMenuItemImage | [474.6, 94.3] | [0.5, 0.5] | [48, 50] | [1, 1] | 0 | **否** | cc.Button+cc.Sprite normal `ui/common/button_btn-replay-2.png` e7684c90-57be-4920-a523-98fa030e2e5c |
| `/ChampionTop8Cell/CCNode_1` | CCNode | [0, 0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_8_1` | CCSprite | [164.6, 597.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_8_2` | CCSprite | [474.4, 597.1] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_4_1` | CCSprite | [320, 469.9] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_4_2` | CCSprite | [320, 224.2] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_2_1` | CCSprite | [320, 344.4] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_8_3` | CCSprite | [164.6, 94.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
| `/ChampionTop8Cell/CCNode_1/spr_effect_8_4` | CCSprite | [474.6, 94.3] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE  |
