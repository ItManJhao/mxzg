# P1 登录 Prefab 1:1 节点表（ccbi → Creator 3.8.8）

- 基线 main@e8e461e2；设计分辨率 640x960（ccbi 百分比尺寸/位置按此换算）。
- 坐标已换算为 Creator 本地坐标（相对父节点锚点）。ccb `ignoreAnchorPointForPosition=1` 的节点锚点写成 (0,0)，和老引擎等效。
- 无 member 名的节点命名为 `<ccb类名>_<同级序号>`。
- 字体：STZhongsong → font/FZCSJW-GB1-0.ttf（替代）；CloudYuanCuGBK → font/CloudYuanCuGBK.ttf。
- btn-close-2 没有，用 btn-close-1 代替。

## UserLoginLayer（22 节点）→ `client/assets/prefabs/ui/legacy-login/UserLoginLayer.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/UserLoginLayer` | UserLoginLayer | [0, 0] | [0, 0] | [576.0, 576.0] | [1, 1] | 是 |  |
| `/layer/spr_bg` | CCScale9Sprite | [288.0, 1.029] | [0.5, 0] | [576.0, 576.0] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-12.png` af5cc1be-7c55-44d7-a53d-b6a229929802 insets TBLR [15, 15, 15, 15] |
| `/layer/node` | CCNode | [288.0, 556.894] | [0, 0] | [0, 0] | [1, 1] | 是 |  |
| `/layer/node/CCScale9Sprite_1` | CCScale9Sprite | [0, -8.4] | [0.5, 0.5] | [380, 42] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-15.png` d3b2040c-02fd-41b6-b3ae-f50d3d1dce87 insets TBLR [0, 0, 30, 30] |
| `/layer/node/UILabelTTF_1` | UILabelTTF | [0, -8.4] | [0.5, 0.5] | auto | [1, 1] | 是 | cc.Label「用户登录」22px STZhongsong.ttf rgb[255, 249, 197] lang###5248 |
| `/layer/node/UILabelTTF_2` | UILabelTTF | [104.4, -52.8] | [0, 0.5] | auto | [1, 1] | **否** | cc.Label「伤害+25%」22px STZhongsong.ttf rgb[0, 171, 0] lang###5101 |
| `/layer/scroll_view` | CCScrollView | [288.0, 13.269] | [0.5, 0] | [503.424, 60] | [1, 1] | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/layer/CCNode_1` | CCNode | [571.304, 574.5] | [0, 0] | [0, 0] | [1, 1] | 是 |  |
| `/layer/CCNode_1/menu` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/CCNode_1/menu/btn_close` | UIMenuItemImage | [-30, -25] | [0.5, 0.5] | [55, 58] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` pressed `ui/common/button_btn-close-1.png` |
| `/layer/UILabelTTF_1` | UILabelTTF | [66.473, 497.25] | [0, 0.5] | auto | [1, 1] | 是 | cc.Label「ID（user_id）」22px STZhongsong.ttf rgb[0, 19, 77] |
| `/layer/UILabelTTF_2` | UILabelTTF | [64.928, 409.2] | [0, 0.5] | auto | [1, 1] | 是 | cc.Label「平台ID（安卓：1，IOS：0）」22px STZhongsong.ttf rgb[0, 19, 77] |
| `/layer/UILabelTTF_3` | UILabelTTF | [64.928, 322.95] | [0, 0.5] | auto | [1, 1] | 是 | cc.Label「CHANNEL_ID」22px STZhongsong.ttf rgb[0, 19, 77] |
| `/layer/UILabelTTF_4` | UILabelTTF | [64.928, 241.2] | [0, 0.5] | auto | [1, 1] | 是 | cc.Label「PF_ID」22px STZhongsong.ttf rgb[0, 19, 77] |
| `/layer/CCMenu_1` | CCMenu | [288.0, 3.0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/CCMenu_1/btn_login` | UIMenuItemLabel | [0, 48] | [0.5, 0.5] | [195, 66] | [0.8, 0.8] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` pressed `ui/common/button_btn-buy-1.png` · Label「登  录」24 [255, 255, 255, 255] |
| `/layer/spr_user_bg` | CCScale9Sprite | [68.792, 456.0] | [0, 0.5] | [470, 60] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [12, 12, 12, 12] |
| `/layer/spr_platform_bg` | CCScale9Sprite | [68.792, 370.5] | [0, 0.5] | [470, 60] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [12, 12, 12, 12] |
| `/layer/spr_channel_bg` | CCScale9Sprite | [68.792, 285.0] | [0, 0.5] | [470, 60] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [12, 12, 12, 12] |
| `/layer/spr_pf_bg` | CCScale9Sprite | [68.792, 201.75] | [0, 0.5] | [470, 60] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [12, 12, 12, 12] |
| `/layer/spr_server_bg` | CCScale9Sprite | [68.792, 118.5] | [0, 0.5] | [470, 60] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [12, 12, 12, 12] |
| `/layer/UILabelTTF_5` | UILabelTTF | [64.928, 157.95] | [0, 0.5] | auto | [1, 1] | 是 | cc.Label「服务器地址」22px STZhongsong.ttf rgb[0, 19, 77] lang###5281 |

## ChooseServerLayer（16 节点）→ `client/assets/prefabs/ui/login/ChooseServerLayer.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/ChooseServerLayer` | ChooseServerLayer | [0, 0] | [0, 0] | [614, 798] | [1, 1] | 是 |  |
| `/layer/CCScale9Sprite_1` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [634, 818] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets TBLR [60, 60, 60, 60] |
| `/layer/node_title` | CCNode | [307.0, 798.0] | [0, 0] | [0, 0] | [1, 1] | 是 |  |
| `/layer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/layer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「选择服务器」56px STZhongsong.ttf rgb[255, 227, 183] lang###5233 |
| `/layer/spr_tab_bg` | CCScale9Sprite | [35, 100] | [0.5, 0.5] | [164, 612] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [10, 10, 10, 10] |
| `/layer/spr_scroll_bg` | CCScale9Sprite | [210, 100] | [0.5, 0.5] | [372, 612] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [10, 10, 10, 10] |
| `/layer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/UIMenu_1/btn_close` | UIMenuItemImage | [550, 770] | [0.5, 0.5] | [55, 58] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` pressed `ui/common/button_btn-close-1.png` |
| `/layer/spot_full` | CCSprite | [90, 60] | [0.5, 0.5] | [26, 26] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/login/choose-server_spot-full.png` 2b1a2e05-db2b-4218-a161-bfadda9b8ff4 |
| `/layer/spot_normal` | CCSprite | [285, 60] | [0.5, 0.5] | [26, 26] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/login/choose-server_spot-normal.png` 4472171a-45aa-4b08-a9c8-5a5673366b7d |
| `/layer/spot_disabled` | CCSprite | [480, 60] | [0.5, 0.5] | [26, 26] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/login/choose-server_spot-disabled.png` 8cba3e40-0dc3-4086-b71e-d80600a808ef |
| `/layer/lbl_full` | UILabelTTF | [115, 60] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「爆满」42px STZhongsong.ttf rgb[104, 57, 0] lang###5146 |
| `/layer/lbl_normal` | UILabelTTF | [310, 60] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「流畅」42px STZhongsong.ttf rgb[104, 57, 0] lang###5346 |
| `/layer/lbl_disabled` | UILabelTTF | [505, 60] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「维护」42px STZhongsong.ttf rgb[104, 57, 0] lang###5107 |
| `/layer/scroll_view` | UIScrollViewBackpack | [215, 105] | [0, 0] | [362, 602] | [1, 1] | 是 | cc.ScrollView+cc.Mask VERTICAL |

## ChooseServerCell（7 节点）→ `client/assets/prefabs/ui/login/ChooseServerCell.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/ChooseServerCell` | ChooseServerCell | [0, 0] | [0, 0] | [360, 80] | [1, 1] | 是 |  |
| `/layer/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [360, 80] | [1, 1] | 是 | cc.Sprite SLICED `ui/login/choose-server_spr-cell-bg-1.png` 3260f4e4-0b40-4afa-b9d9-dd81ec61efad insets TBLR [20, 20, 20, 20] |
| `/layer/spr_cell_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [360, 80] | [1, 1] | 是 | cc.Sprite SLICED `ui/login/choose-server_spr-cell-bg-3.png` b3bf9511-f851-48ea-b2fc-79957095cd42 insets TBLR [20, 20, 20, 20] |
| `/layer/spr_best` | CCSprite | [360, 80] | [1, 1] | [66, 52] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/lang-1_icon-best.png` cb3f0492-5a7c-4484-a4f0-b0b802f45895 |
| `/layer/spr_server_statue` | CCSprite | [40, 40] | [0.5, 0.5] | [26, 26] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/login/choose-server_spot-full.png` 2b1a2e05-db2b-4218-a161-bfadda9b8ff4 |
| `/layer/lbl_server_name` | CCLabelTTF | [65, 40] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「S100水晶等他」44px CloudYuanCuGBK.ttf rgb[135, 95, 51] |
| `/layer/spr_role` | CCSprite | [310, 40] | [0.5, 0.5] | [24, 22] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/login/choose-server_spr-role.png` 6b092635-2edc-4426-9856-85b3f4bca6da |

## ChooseServerRoleCell（6 节点）→ `client/assets/prefabs/ui/login/ChooseServerRoleCell.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/ChooseServerRoleCell` | ChooseServerCell | [0, 0] | [0, 0] | [360, 80] | [1, 1] | 是 |  |
| `/layer/CCScale9Sprite_1` | CCScale9Sprite | [5, 0] | [0.5, 0.5] | [350, 80] | [1, 1] | 是 | cc.Sprite SLICED `ui/login/choose-server_spr-cell-bg-2.png` c246b4ca-6d5d-463d-9cfc-211c08785898 insets TBLR [20, 20, 20, 20] |
| `/layer/spr_photo` | CCSprite | [73, 40] | [0.5, 0.5] | [91, 91] | [0.6, 0.6] | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/layer/spr_border` | CCSprite | [73, 40] | [0.5, 0.5] | [138, 138] | [0.8, 0.8] | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/layer/lbl_name` | UILabelTTF | [120, 55] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「玩家昵称六字」44px STZhongsong.ttf rgb[255, 229, 191] |
| `/layer/lbl_level` | UILabelTTF | [120, 25] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「Lv.1」44px STZhongsong.ttf rgb[255, 229, 191] |

## NoticeLayer（12 节点）→ `client/assets/prefabs/ui/login/NoticeLayer.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/NoticeLayer` | NoticeLayer | [0, 0] | [0, 0] | [600, 860] | [1, 1] | 是 |  |
| `/layer/spr_bg` | CCScale9Sprite | [-8, -10] | [0.5, 0.5] | [616, 858] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets TBLR [80, 80, 80, 80] |
| `/layer/spr_gray_bg` | CCScale9Sprite | [38, 90] | [0.5, 0.5] | [526, 520] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [10, 10, 10, 10] |
| `/layer/CCScale9Sprite_1` | CCScale9Sprite | [300, 831] | [0.5, 0.5] | [344, 48] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-2.png` c7f43d22-d8a0-493c-88c2-17192ea937bd |
| `/layer/CCSprite_1` | CCSprite | [300, 710] | [0.5, 0.5] | [526, 182] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/notice_spr-notice-banner-1.png` 28f6f943-9345-4cdf-a3ae-56b3f55a4cc8 |
| `/layer/lbl_title` | UILabelTTF | [300, 833] | [0.5, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「公 告」56px STZhongsong.ttf rgb[254, 255, 255] lang###5065 |
| `/layer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/CCMenu_1/btn_close` | UIMenuItemImage | [563, 813] | [0.5, 0.5] | [55, 58] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` pressed `ui/common/button_btn-close-1.png` |
| `/layer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [300, 55] | [0.5, 0.5] | [136, 58] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` · Label「确 定」48 [100, 50, 0, 255] |
| `/layer/scroll_view_text` | CCScrollView | [300, 560] | [0.5, 1] | [500, 465] | [1, 1] | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/layer/spr_gray_bg` | CCScale9Sprite | [38, 564] | [0.5, 0.5] | [526, 46] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets TBLR [10, 10, 10, 10] |
| `/layer/lbl_pre` | UILabelTTF | [52, 587] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「亲爱的冒险者:」44px STZhongsong.ttf rgb[255, 249, 197] lang###5394 |

## LanguageSelectLayer（15 节点）→ `client/assets/prefabs/ui/login/LanguageSelectLayer.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/LanguageSelectLayer` | LanguageSelectLayer | [0, 0] | [0, 0] | [610, 380] | [1, 1] | 是 |  |
| `/layer/spr_bg` | CCScale9Sprite | [-10, -1] | [0.5, 0.5] | [630, 380] | [1, 1] | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets TBLR [30, 30, 30, 30] |
| `/layer/node_title` | CCNode | [305.0, 389.0] | [0, 0] | [0, 0] | [1, 1] | 是 |  |
| `/layer/node_title/spr_title_bg` | CCScale9Sprite | [0, -17] | [0.5, 1] | [225, 72] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/layer/node_title/lbl_title` | UILabelTTF | [0, -60] | [0.5, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「语言设置」56px STZhongsong.ttf rgb[255, 227, 183] |
| `/layer/lbl_language1` | UILabelTTF | [187, 245] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「中文简体」44px STZhongsong.ttf rgb[141, 89, 58] |
| `/layer/lbl_language2` | UILabelTTF | [430, 245] | [0, 0.5] | auto | [0.5, 0.5] | 是 | cc.Label「中文繁体」44px STZhongsong.ttf rgb[141, 89, 58] |
| `/layer/CCSprite_1` | CCSprite | [157, 245] | [0.5, 0.5] | [41, 41] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/layer/CCSprite_2` | CCSprite | [400, 245] | [0.5, 0.5] | [41, 41] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/common/setting_spr-bg-2.png` a1e98782-b3c7-486f-ab05-ffb6c668df35 |
| `/layer/UIMenu_1` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/UIMenu_1/btn_language1` | UIMenuItemTab | [157, 245] | [0.5, 0.5] | [41, 41] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` pressed `ui/common/setting_spr-check-1.png` |
| `/layer/UIMenu_1/btn_language2` | UIMenuItemTab | [400, 245] | [0.5, 0.5] | [41, 41] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/setting_spr-bg-2.png` pressed `ui/common/setting_spr-check-1.png` |
| `/layer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/CCMenu_1/btn_close` | UIMenuItemImage | [565, 345] | [0.5, 0.5] | [55, 58] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` pressed `ui/common/button_btn-close-1.png` |
| `/layer/CCMenu_1/btn_confirm` | UIMenuItemLabel | [305, 93] | [0.5, 0.5] | [195, 66] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-1.png` pressed `ui/common/button_btn-buy-1.png` · Label「」24 [255, 255, 255, 255] |

## ErrorLayer（5 节点）→ `client/assets/prefabs/ui/login/ErrorLayer.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/ErrorLayer` | ErrorLayer | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 是 |  |
| `/layer/CCNode_1` | CCNode | [575.0, 798.0] | [0, 0] | [0, 0] | [1, 1] | 是 |  |
| `/layer/CCNode_1/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 | none |
| `/layer/CCNode_1/CCMenu_1/btn_all_equip` | UIMenuItemLabel | [0, 0] | [0.5, 0.5] | [188, 68] | [0.7, 0.7] | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-buy-3.png` · Label「关闭」24 [255, 255, 255, 255] |
| `/layer/scroll_view` | CCScrollView | [0.0, 0.0] | [0, 0] | [640.0, 816.0] | [1, 1] | 是 | cc.ScrollView+cc.Mask VERTICAL |

## CreateNickRewardLayer（6 节点）→ `client/assets/prefabs/ui/login/CreateNickRewardLayer.prefab`

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | 显示 | 组件 / 素材 / 文本 |
|---|---|---|---|---|---|---|---|
| `/CreateNickRewardLayer` | CreateNickRewardLayer | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 是 |  |
| `/layer/CCSprite_1` | CCSprite | [320.0, 634.0] | [0.5, 0.5] | [640, 566] | [1, 1] | 是 | cc.Sprite SIMPLE `ui/login/spr-bg.png` 13ecd2f1-e967-499b-b217-12f4a889a9f9 |
| `/layer/menu` | UIMenu | [0, 0] | [0, 0] | [640.0, 960.0] | [1, 1] | 是 | none |
| `/layer/menu/btn_take` | UIMenuItemImage | [320.0, 381.0] | [0.5, 0.5] | [226, 104] | [1, 1] | 是 | cc.Button+cc.Sprite normal `ui/login/take-reward.png` |
| `/layer/scroll_view` | CCScrollView | [261.274, 479.456] | [0, 0] | [100, 100] | [1, 1] | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/layer/scroll_view_anchor` | CCNode | [320, 534] | [0, 0] | [0, 0] | [1, 1] | 是 |  |

## 九宫格边距（Creator 存在 spriteFrame .meta 里）

| meta | uuid | 现值 TBLR | ccbi 需要（已扣 trim） |
|---|---|---|---|
| `ui/common/win-bg_win-bg-12.png.meta` | af5cc1be-7c55-44d7-a53d-b6a229929802 | [20, 20, 15, 18] | [{'left': 14, 'right': 14, 'top': 14, 'bottom': 14}] |
| `ui/common/win-bg_block-bg-15.png.meta` | d3b2040c-02fd-41b6-b3ae-f50d3d1dce87 | [0, 0, 0, 0] | [{'left': 29, 'right': 29, 'top': 0, 'bottom': 0}] |
| `ui/common/win-bg_block-bg-5.png.meta` | b41f4934-f3ca-4c26-970f-2acca88e7a5c | [0, 0, 0, 0] | [{'left': 11, 'right': 11, 'top': 11, 'bottom': 11}, {'left': 9, 'right': 9, 'top': 9, 'bottom': 9}] |
| `ui/common/win-bg_win-bg-11.png.meta` | 062cd5cb-6ba6-42f3-a798-51003b1bc235 | [0, 0, 0, 0] | [{'left': 59, 'right': 59, 'top': 59, 'bottom': 59}, {'left': 79, 'right': 79, 'top': 79, 'bottom': 79}] |
| `ui/login/choose-server_spr-cell-bg-1.png.meta` | 3260f4e4-0b40-4afa-b9d9-dd81ec61efad | [0, 0, 0, 0] | [{'left': 20, 'right': 20, 'top': 20, 'bottom': 20}] |
| `ui/login/choose-server_spr-cell-bg-3.png.meta` | b3bf9511-f851-48ea-b2fc-79957095cd42 | [0, 0, 0, 0] | [{'left': 20, 'right': 20, 'top': 20, 'bottom': 20}] |
| `ui/login/choose-server_spr-cell-bg-2.png.meta` | c246b4ca-6d5d-463d-9cfc-211c08785898 | [0, 0, 0, 0] | [{'left': 20, 'right': 20, 'top': 20, 'bottom': 20}] |
| `ui/common/win-bg_win-bg-24.png.meta` | a18e0448-2af3-4e0e-8170-9bfbe16a4daf | [0, 0, 0, 0] | [{'left': 29, 'right': 29, 'top': 29, 'bottom': 29}] |

## UILabelTTF custom:outline

原样记录 ccbi `custom:outline`。Prefab 不加 LabelOutline，Label.`_enableOutline` 为 false。

| Prefab | 路径 | outline |
|---|---|---|
| ChooseServerLayer | `/layer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| ChooseServerRoleCell | `/layer/lbl_name` | `{"color":[74,41,33,255],"size":4}` |
| ChooseServerRoleCell | `/layer/lbl_level` | `{"color":[74,41,33,255],"size":4}` |
| LanguageSelectLayer | `/layer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |

## langKey

不写入 Prefab，只记在这里。节点表里已经出现的 lang### 与下表一致；下表补齐按钮子 Label。

| Prefab | 路径 | langKey |
|---|---|---|
| UserLoginLayer | `/layer/node/UILabelTTF_1` | `lang###5248` |
| UserLoginLayer | `/layer/node/UILabelTTF_2` | `lang###5101` |
| UserLoginLayer | `/layer/CCMenu_1/btn_login/Label` | `lang###5693` |
| UserLoginLayer | `/layer/UILabelTTF_5` | `lang###5281` |
| ChooseServerLayer | `/layer/node_title/lbl_title` | `lang###5233` |
| ChooseServerLayer | `/layer/lbl_full` | `lang###5146` |
| ChooseServerLayer | `/layer/lbl_normal` | `lang###5346` |
| ChooseServerLayer | `/layer/lbl_disabled` | `lang###5107` |
| NoticeLayer | `/layer/lbl_title` | `lang###5065` |
| NoticeLayer | `/layer/CCMenu_1/btn_confirm/Label` | `lang###5176` |
| NoticeLayer | `/layer/lbl_pre` | `lang###5394` |
| ErrorLayer | `/layer/CCNode_1/CCMenu_1/btn_all_equip/Label` | `lang###5406` |
