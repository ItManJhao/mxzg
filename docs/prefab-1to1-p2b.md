# P2-b 聊天/好友/邮件 Prefab 1:1 节点表

- 基线 main@e4d604a6 (#199 merged)；设计分辨率 640x960；坐标为 Creator 本地坐标（相对父锚点），ignoreAnchor 节点锚点写 (0,0)；angle = -ccb rotation。
- 无 member 名节点命名 `<ccb类>_<同级序号>`；STZhongsong/FZCSJW--GB1-0 → font/FZCSJW-GB1-0.ttf，CloudYuanCuGBK → font/CloudYuanCuGBK.ttf，Helvetica → 系统字体。

## 目录

| ccbi | Prefab | 节点 |
|---|---|--:|
| ChatCityLayer | `prefabs/ui/chat/ChatCityLayer.prefab` | 5 |
| ChatClanLayer | `prefabs/ui/chat/ChatClanLayer.prefab` | 2 |
| ChatCountryWarLayer | `prefabs/ui/chat/ChatCountryWarLayer.prefab` | 2 |
| ChatCrusadeLayer | `prefabs/ui/chat/ChatCrusadeLayer.prefab` | 2 |
| ChatFriendCell | `prefabs/ui/chat/ChatFriendCell.prefab` | 11 |
| ChatFriendLayer | `prefabs/ui/chat/ChatFriendLayer.prefab` | 3 |
| ChatLayer | `prefabs/ui/chat/ChatLayer.prefab` | 11 |
| ChatLeftCell | `prefabs/ui/chat/ChatLeftCell.prefab` | 11 |
| ChatRightCell | `prefabs/ui/chat/ChatRightCell.prefab` | 11 |
| ChatServerLayer | `prefabs/ui/chat/ChatServerLayer.prefab` | 2 |
| ChatSystemCell | `prefabs/ui/chat/ChatSystemCell.prefab` | 3 |
| ChatSystemLayer | `prefabs/ui/chat/ChatSystemLayer.prefab` | 3 |
| ChatWorldLayer | `prefabs/ui/chat/ChatWorldLayer.prefab` | 2 |
| FriendBlackListCell | `prefabs/ui/friend/FriendBlackListCell.prefab` | 12 |
| FriendBlackListLayer | `prefabs/ui/friend/FriendBlackListLayer.prefab` | 3 |
| FriendCell | `prefabs/ui/friend/FriendCell.prefab` | 15 |
| FriendGivedCell | `prefabs/ui/friend/FriendGivedCell.prefab` | 12 |
| FriendGivedLayer | `prefabs/ui/friend/FriendGivedLayer.prefab` | 9 |
| FriendLayer | `prefabs/ui/friend/FriendLayer.prefab` | 13 |
| FriendListLayer | `prefabs/ui/friend/FriendListLayer.prefab` | 11 |
| FriendRequestCell | `prefabs/ui/friend/FriendRequestCell.prefab` | 12 |
| FriendRequestLayer | `prefabs/ui/friend/FriendRequestLayer.prefab` | 4 |
| FriendRequestLayer_old | `prefabs/ui/friend/FriendRequestLayer_old.prefab` | 8 |
| FriendSearchCell | `prefabs/ui/friend/FriendSearchCell.prefab` | 12 |
| FriendSearchLayer | `prefabs/ui/friend/FriendSearchLayer.prefab` | 10 |
| MailCell | `prefabs/ui/mail/MailCell.prefab` | 6 |
| MailInfoLayer | `prefabs/ui/mail/MailInfoLayer.prefab` | 15 |
| MailLayer | `prefabs/ui/mail/MailLayer.prefab` | 11 |

## 九宫格 .meta

本 PR 负责改：

| meta | 设为 T/B/L/R | 其它节点要的值（不采用） |
|---|---|---|
| `ui/common/chat_spr-friend-layer-bg.png.meta` | [12, 12, 12, 12] | {'[10, 10, 10, 10]': 3} |
| `ui/common/chat_bg.png.meta` | [57, 58, 15, 15] |  |
| `ui/common/chat_bg-emoji.png.meta` | [11, 11, 18, 18] |  |
| `ui/common/chat_bg-emoji-choose.png.meta` | [11, 11, 20, 20] |  |
| `ui/common/chat_bg-friend-chat-1.png.meta` | [20, 9, 29, 9] |  |
| `ui/common/win-bg_cell-bg-1.png.meta` | [5, 5, 5, 5] | {'[9, 9, 9, 9]': 1} |
| `ui/common/friend_spr-cell-bg.png.meta` | [40, 39, 40, 40] |  |

由其它 PR 改（本 PR 不碰，只用 SLICED 引用）：

- `ui/common/win-bg_block-bg-20.png.meta` → P2A

## ChatCityLayer（5）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatCityLayer` | ChatCityLayer | [0, 0] | [0, 0] | [614, 1136] | [1, 1] | 0 | 是 |  |
| `/ChatCityLayer/spr_bg` | CCScale9Sprite | [22, 120] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[12, 12, 12, 12] |
| `/ChatCityLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChatCityLayer/CCMenu_1/btn_ignore` | UIMenuItemImage | [565, 774] | [0.5, 0.5] | [56, 56] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/lang-1_btn-chat-close.png` 5b252eca-9efc-4217-8c82-fd953db128e4 |
| `/ChatCityLayer/lbl_ignore_tip` | UILabelTTF | [535, 768] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「- -」40 CloudYuanCuGBK.ttf rgb[141, 89, 58] |

## ChatClanLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatClanLayer` | ChatClanLayer | [0, 0] | [0, 0] | [614, 1136] | [1, 1] | 0 | 是 |  |
| `/ChatClanLayer/spr_bg` | CCScale9Sprite | [22, 120] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[12, 12, 12, 12] |

## ChatCountryWarLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatCountryWarLayer` | ChatCountryWarLayer | [0, 0] | [0, 0] | [614, 1136] | [1, 1] | 0 | 是 |  |
| `/ChatCountryWarLayer/CCScale9Sprite_1` | CCScale9Sprite | [22, 120] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[10, 10, 10, 10] |

## ChatCrusadeLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatCrusadeLayer` | ChatCrusadeLayer | [0, 0] | [0, 0] | [614, 1136] | [1, 1] | 0 | 是 |  |
| `/ChatCrusadeLayer/CCScale9Sprite_1` | CCScale9Sprite | [22, 120] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[10, 10, 10, 10] |

## ChatFriendCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatFriendCell` | ChatFriendCell | [0, 0] | [0, 0] | [120, 125] | [1, 1] | 0 | 是 |  |
| `/ChatFriendCell/spr_bg` | CCSprite | [10, 0] | [0, 0] | [110, 120] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/chat_spr-friend-cell-1.png` 2c5d5545-aaff-4042-a142-bb4d81c19fdf |
| `/ChatFriendCell/lbl_name` | CCLabelTTF | [70, 25] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家昵称六字」32 STZhongsong.ttf rgb[239, 223, 199] |
| `/ChatFriendCell/spr_photo` | CCSprite | [70, 75] | [0.5, 0.5] | [91, 91] | [0.55, 0.55] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChatFriendCell/spr_photo_bg` | CCSprite | [70, 75] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/ChatFriendCell/spr_level_bg` | CCSprite | [40, 90] | [0.5, 0.5] | [32, 32] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-circular-1.png` bea85661-3c73-4593-98c2-a2650fa8f742 |
| `/ChatFriendCell/lbl_level` | UILabelTTF | [40, 90] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「990」28 STZhongsong.ttf rgbNone |
| `/ChatFriendCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChatFriendCell/CCMenu_1/btn_close` | UIMenuItemImage | [20, 105] | [0.5, 0.5] | [34, 34] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-4.png` b81c2cb1-88c6-4807-a88a-1b83dba288f2 |
| `/ChatFriendCell/spr_add` | CCSprite | [70, 65] | [0.5, 0.5] | [52, 54] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-add-1.png` b6d75542-c5fa-48f9-b187-bcc34a0ef5d1 |
| `/ChatFriendCell/spr_unread` | CCSprite | [95, 90] | [0.5, 0.5] | [32, 32] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-reddot-3.png` 53b6ac5e-a898-4796-a53a-c9f87ed94e82 |

## ChatFriendLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatFriendLayer` | ChatFriendLayer | [0, 0] | [0, 0] | [614, 800] | [1, 1] | 0 | 是 |  |
| `/ChatFriendLayer/lbl_name` | CCLabelTTF | [424.9, 722.353] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「昵称6.个字啊」50 STZhongsong.ttf rgbNone |
| `/ChatFriendLayer/spr_bg` | CCScale9Sprite | [135, 120] | [0.5, 0.5] | [460, 630] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 |

## ChatLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatLayer` | ChatLayer | [0, 0] | [0, 0] | [628, 860] | [1, 1] | 0 | 是 |  |
| `/ChatLayer/CCScale9Sprite_1` | CCScale9Sprite | [2, 0] | [0.5, 0.5] | [626, 820] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_bg.png` 68a6680f-7a4e-45bc-8d44-7057a83c5bcd insets[60, 60, 15, 15] |
| `/ChatLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChatLayer/menu/btn_draw` | UIMenuItemCheckBox | [627.264, 568.3] | [0.5, 0.5] | [0, 0] | [0.5, 0.5] | 0 | **否** | cc.Button+cc.Sprite normal **缺图** main-scene/btn-sidebar-1.png |
| `/ChatLayer/menu/btn_send` | UIMenuItemLabel | [510, 80] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」50 [255, 255, 255, 255] |
| `/ChatLayer/menu/btn_emoji` | UIMenuItemImage | [410, 80] | [0.5, 0.5] | [48, 49] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/chat_spr-emoji.png` d972291b-d2b6-4238-8329-4206c8427f21 |
| `/ChatLayer/spr_input_bg` | CCScale9Sprite | [60, 55] | [0.5, 0.5] | [320, 48] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/ChatLayer/emoji_layer` | CCLayer | [30, 115] | [0, 0] | [570, 278] | [1, 1] | 0 | **否** |  |
| `/ChatLayer/emoji_layer/CCScale9Sprite_1` | CCScale9Sprite | [285, 0] | [0.5, 0] | [570, 278] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_bg-emoji.png` 8b70a944-aefa-439a-9546-156806b10694 insets[11, 11, 18, 18] |
| `/ChatLayer/emoji_layer/emoji_layout` | CCScale9Sprite | [9, 139.0] | [0, 0.5] | [451, 260] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_bg-emoji-choose.png` e3db8c50-3981-414b-9923-1a9d6bc666a7 insets[11, 11, 20, 20] |
| `/ChatLayer/scroll_view_tab` | CCScrollView | [14, 806] | [0, 0] | [600, 50] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |

## ChatLeftCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatLeftCell` | ChatLeftCell | [0, 0] | [0, 0] | [446, 180] | [1, 1] | 0 | 是 |  |
| `/ChatLeftCell/spr_bg` | CCScale9Sprite | [71.56, 145] | [0, 1] | [370, 142] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_bg-friend-chat-1.png` 12da81f2-a942-40e9-ac8e-d2946380ecf6 insets[20, 10, 30, 10] |
| `/ChatLeftCell/node_parent` | CCNode | [0, 110] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChatLeftCell/node_parent/spr_photo` | CCSprite | [35, 30] | [0.5, 0.5] | [91, 91] | [0.65, 0.65] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChatLeftCell/node_parent/spr_border` | CCSprite | [35, 27] | [0.5, 0.5] | [138, 138] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005023.png` 06e29c6e-87a7-41a8-a572-d865b9c854ff |
| `/ChatLeftCell/node_parent/spr_peerage` | CCSprite | [100, 54] | [0.5, 0.5] | [48, 40] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-identification_spr-1-xiao.png` bee5a7ed-cbe7-425b-b0e6-985cb05bacc3 |
| `/ChatLeftCell/node_parent/spr_group_pos` | CCSprite | [100, 54] | [0.5, 0.5] | [85, 56] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-pos-1.png` dbba8132-7193-49f4-bee9-9d63c3178818 |
| `/ChatLeftCell/node_parent/lbl_name` | UILabelTTF | [100, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「法哈哈哈哈好」42 FZCSJW--GB1-0.ttf rgb[239, 223, 199] |
| `/ChatLeftCell/node_parent/lbl_prename` | UILabelTTF | [229, 50] | [0, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「S120」40 CloudYuanCuGBK.ttf rgb[66, 233, 35] |
| `/ChatLeftCell/node_parent/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChatLeftCell/node_parent/menu/btn_photo` | CCMenuItemImage | [34, 30] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |

## ChatRightCell（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatRightCell` | ChatRightCell | [0, 0] | [0, 0] | [446, 180] | [1, 1] | 0 | 是 |  |
| `/ChatRightCell/spr_bg` | CCScale9Sprite | [373.56, 145] | [0, 1] | [370, 142] | [-1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_bg-friend-chat-1.png` 12da81f2-a942-40e9-ac8e-d2946380ecf6 insets[20, 10, 30, 10] |
| `/ChatRightCell/node_parent` | CCNode | [0, 110] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/ChatRightCell/node_parent/spr_photo` | CCSprite | [410.843, 30] | [0.5, 0.5] | [91, 91] | [0.65, 0.65] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/ChatRightCell/node_parent/spr_peerage` | CCSprite | [343, 54] | [0.5, 0.5] | [48, 40] | [0.85, 0.85] | 0 | 是 | cc.Sprite SIMPLE `ui/common/setting-identification_spr-1-xiao.png` bee5a7ed-cbe7-425b-b0e6-985cb05bacc3 |
| `/ChatRightCell/node_parent/spr_group_pos` | CCSprite | [343, 54] | [0.5, 0.5] | [85, 56] | [0.5, 0.5] | 0 | **否** | cc.Sprite SIMPLE `ui/crusade-group/crusade-group_spr-pos-1.png` dbba8132-7193-49f4-bee9-9d63c3178818 |
| `/ChatRightCell/node_parent/spr_border` | CCSprite | [411, 27] | [0.5, 0.5] | [138, 138] | [0.9, 0.9] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_1005013.png` 56843125-c216-4de4-aa91-75139bd2f682 |
| `/ChatRightCell/node_parent/lbl_name` | UILabelTTF | [320, 50] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「反反复复方法」40 CloudYuanCuGBK.ttf rgb[235, 216, 187] |
| `/ChatRightCell/node_parent/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/ChatRightCell/node_parent/menu/btn_photo` | CCMenuItemImage | [411, 30] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  |
| `/ChatRightCell/node_parent/lbl_prename` | UILabelTTF | [199, 50] | [1, 0.5] | auto | [0.5, 0.5] | 0 | **否** | cc.Label「S120」40 CloudYuanCuGBK.ttf rgb[66, 233, 35] |

## ChatServerLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatServerLayer` | ChatServerLayer | [0, 0] | [0, 0] | [614, 1136] | [1, 1] | 0 | 是 |  |
| `/ChatServerLayer/CCScale9Sprite_1` | CCScale9Sprite | [22, 120] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[10, 10, 10, 10] |

## ChatSystemCell（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatSystemCell` | ChatSystemCell | [0, 0] | [0, 0] | [546, 70] | [1, 1] | 0 | 是 |  |
| `/ChatSystemCell/msg_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [546, 70] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_cell-bg-1.png` d414718f-712c-442a-876b-336f9006430d insets[6, 6, 6, 6] |
| `/ChatSystemCell/msg_flag` | CCSprite | [51, 48] | [0.5, 0.5] | [70, 30] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/lang-1_spr-system-flag.png` 4ea19f32-e08a-4c52-a5f2-7cd50ee0b08f |

## ChatSystemLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatSystemLayer` | ChatSystemLayer | [0, 0] | [0, 0] | [614, 780] | [1, 1] | 0 | 是 |  |
| `/ChatSystemLayer/UILabelTTF_1` | UILabelTTF | [127.6, 760] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「此频道不能发言,请切换到其他频道」50 Helvetica rgb[109, 110, 110] |
| `/ChatSystemLayer/spr_bg` | CCScale9Sprite | [22, 60] | [0.5, 0.5] | [570, 670] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[12, 12, 12, 12] |

## ChatWorldLayer（2）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/ChatWorldLayer` | ChatWorldLayer | [0, 0] | [0, 0] | [614, 1136] | [1, 1] | 0 | 是 |  |
| `/ChatWorldLayer/spr_bg` | CCScale9Sprite | [22, 120] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/chat_spr-friend-layer-bg.png` 546239bb-c91c-4b32-b958-26010e64d3f5 insets[12, 12, 12, 12] |

## FriendBlackListCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendBlackListCell` | FriendBlackListCell | [0, 0] | [0, 0] | [552, 110] | [1, 1] | 0 | 是 |  |
| `/FriendBlackListCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552, 110] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/friend_spr-cell-bg.png` 41107f0f-e256-4099-8bb8-1a81fca86760 insets[40, 40, 40, 40] |
| `/FriendBlackListCell/spr_photo` | CCSprite | [63, 56] | [0.5, 0.5] | [91, 91] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FriendBlackListCell/spr_frame` | CCSprite | [63, 56] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/FriendBlackListCell/lbl_name` | UILabelTTF | [115, 78] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「玩家名字7个字」44 FZCSJW--GB1-0.ttf rgb[108, 63, 38] |
| `/FriendBlackListCell/lbl_server_name` | UILabelTTF | [115, 58] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「服务器名」36 FZCSJW--GB1-0.ttf rgb[15, 159, 0] |
| `/FriendBlackListCell/CCSprite_1` | CCSprite | [128, 35] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/FriendBlackListCell/lbl_battle` | UILabelTTF | [145, 35] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「99999」44 FZCSJW--GB1-0.ttf rgb[110, 37, 0] |
| `/FriendBlackListCell/lbl_level` | UILabelTTF | [302, 75] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「100级」44 FZCSJW--GB1-0.ttf rgb[184, 83, 24] |
| `/FriendBlackListCell/lbl_statue` | UILabelTTF | [302, 36] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「在线」40 FZCSJW--GB1-0.ttf rgb[100, 0, 0] |
| `/FriendBlackListCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendBlackListCell/CCMenu_1/btn_remove` | UIMenuItemLabel | [465, 56] | [0.5, 0.5] | [136, 58] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「移 除」48 [178, 71, 45, 255] |

## FriendBlackListLayer（3）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendBlackListLayer` | FriendBlackListLayer | [0, 0] | [0, 0] | [642, 960] | [1, 1] | 0 | 是 |  |
| `/FriendBlackListLayer/spr_bg` | CCScale9Sprite | [37, 171] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendBlackListLayer/lbl_black_num` | UILabelTTF | [586, 122] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「黑名单数：0/0」24 STZhongsong.ttf rgb[81, 57, 43] |

## FriendCell（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendCell` | FriendCell | [0, 0] | [0, 0] | [552, 110] | [1, 1] | 0 | 是 |  |
| `/FriendCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552, 110] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/friend_spr-cell-bg.png` 41107f0f-e256-4099-8bb8-1a81fca86760 insets[40, 40, 40, 40] |
| `/FriendCell/lbl_name` | UILabelTTF | [88, 75] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」22 STZhongsong.ttf rgb[119, 70, 42] |
| `/FriendCell/lbl_battle` | UILabelTTF | [118, 38] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」24 STZhongsong.ttf rgb[110, 37, 0] |
| `/FriendCell/spr_photo` | CCSprite | [53, 56] | [0.5, 0.5] | [91, 91] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FriendCell/lbl_level` | UILabelTTF | [275, 75] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100级」22 STZhongsong.ttf rgb[199, 90, 26] |
| `/FriendCell/lbl_statue` | UILabelTTF | [275, 36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「在线」20 STZhongsong.ttf rgb[100, 0, 0] |
| `/FriendCell/CCSprite_1` | CCSprite | [101, 36] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/FriendCell/spr_frame` | CCSprite | [53, 56] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/FriendCell/firend_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendCell/firend_menu/btn_chat` | UIMenuItemLabel | [470, 56] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [67, 22, 17, 255] |
| `/FriendCell/firend_menu/btn_gift` | UIMenuItemLabel | [370, 56] | [0.5, 0.5] | [42, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_spr-shua.png` b94f6922-8730-4c0e-92d9-f13807214cf5 · Label「」24 [255, 255, 255, 255] |
| `/FriendCell/firend_menu/btn_info` | UIMenuItemLabel | [53, 56] | [0.5, 0.5] | [0, 0] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal  · Label「」24 [255, 255, 255, 255] |
| `/FriendCell/delete_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendCell/delete_menu/btn_delete` | UIMenuItemLabel | [470, 56] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [67, 22, 17, 255] |

## FriendGivedCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendGivedCell` | FriendGivedCell | [0, 0] | [0, 0] | [552, 110] | [1, 1] | 0 | 是 |  |
| `/FriendGivedCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552, 110] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/friend_spr-cell-bg.png` 41107f0f-e256-4099-8bb8-1a81fca86760 insets[40, 40, 40, 40] |
| `/FriendGivedCell/lbl_name` | UILabelTTF | [88, 75] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」22 STZhongsong.ttf rgb[121, 71, 43] |
| `/FriendGivedCell/CCSprite_1` | CCSprite | [101, 36] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/FriendGivedCell/lbl_battle` | UILabelTTF | [118, 38] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」24 STZhongsong.ttf rgb[110, 37, 0] |
| `/FriendGivedCell/spr_photo` | CCSprite | [53, 56] | [0.5, 0.5] | [91, 91] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FriendGivedCell/spr_frame` | CCSprite | [53, 56] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/FriendGivedCell/lbl_level` | UILabelTTF | [275, 75] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100级」22 STZhongsong.ttf rgb[196, 89, 25] |
| `/FriendGivedCell/lbl_statue` | UILabelTTF | [275, 36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「在线」20 STZhongsong.ttf rgb[100, 0, 0] |
| `/FriendGivedCell/give_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendGivedCell/give_menu/btn_to` | UIMenuItemLabel | [470, 56] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [67, 22, 17, 255] |
| `/FriendGivedCell/give_menu/btn_get` | UIMenuItemLabel | [370, 56] | [0.5, 0.5] | [40, 40] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_spr-hua.png` 7c5c2329-5688-4d43-be25-6658c2426994 · Label「」24 [255, 255, 255, 255] |

## FriendGivedLayer（9）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendGivedLayer` | FriendGivedLayer | [0, 0] | [0, 0] | [642, 960] | [1, 1] | 0 | 是 |  |
| `/FriendGivedLayer/spr_bg` | CCScale9Sprite | [37, 171] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendGivedLayer/CCSprite_1` | CCSprite | [116, 93] | [0.5, 0.5] | [169, 55] | [1, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg-2.png` 03fea1e2-65a6-4d26-8210-e2ab6a2df4f4 |
| `/FriendGivedLayer/CCSprite_2` | CCSprite | [52, 162] | [0.5, 0.5] | [42, 42] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FriendGivedLayer/CCSprite_3` | CCSprite | [52, 93] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900301.png` ceb3408e-0543-4098-9b5b-4abf93a1c9cd |
| `/FriendGivedLayer/lbl_num` | UILabelTTF | [119, 92] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「30」24 STZhongsong.ttf rgbNone |
| `/FriendGivedLayer/lbl_friend_num` | UILabelTTF | [344, 92] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「好友数：0/0」24 STZhongsong.ttf rgb[82, 58, 44] |
| `/FriendGivedLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendGivedLayer/menu/btn_one_key_gived` | UIMenuItemLabel | [520, 92] | [0.5, 0.5] | [154, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-rect-4.png` 35f1525f-45b5-493d-9e0a-626960fe8302 · Label「」50 [255, 255, 255, 255] |

## FriendLayer（13）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendLayer` | FriendLayer | [0, 0] | [0, 0] | [642, 960] | [1, 1] | 0 | 是 |  |
| `/FriendLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [642, 960] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FriendLayer/node_title` | CCNode | [320.983, 951.429] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FriendLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/FriendLayer/node_title/lbl_title` | UILabelTTF | [0, -40] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「好 友」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FriendLayer/spr_bg` | CCScale9Sprite | [37, 171] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendLayer/CCSprite_1` | CCSprite | [52, 162] | [0.5, 0.5] | [42, 42] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FriendLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendLayer/menu/btn_close` | UIMenuItemImage | [555, 920] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FriendLayer/menu/btn_friend` | UIMenuItemTab | [114, 800] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/FriendLayer/menu/btn_reward` | UIMenuItemTab | [253, 800] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/FriendLayer/menu/btn_request` | UIMenuItemTab | [393, 800] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/FriendLayer/menu/btn_black_list` | UIMenuItemTab | [533, 800] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-2.png` bee5c701-a94a-4ac0-a8f4-1916ef7635d8 pressed `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |

## FriendListLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendListLayer` | FriendListLayer | [0, 0] | [0, 0] | [642, 960] | [1, 1] | 0 | 是 |  |
| `/FriendListLayer/spr_bg` | CCScale9Sprite | [37, 171] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendListLayer/CCSprite_1` | CCSprite | [120, 140] | [0.5, 0.5] | [169, 55] | [1, 0.75] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_num-bg-2.png` 03fea1e2-65a6-4d26-8210-e2ab6a2df4f4 |
| `/FriendListLayer/CCSprite_2` | CCSprite | [52, 162] | [0.5, 0.5] | [42, 42] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FriendListLayer/CCSprite_3` | CCSprite | [50, 142] | [0.5, 0.5] | [100, 100] | [0.4, 0.4] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_900301.png` ceb3408e-0543-4098-9b5b-4abf93a1c9cd |
| `/FriendListLayer/lbl_num` | UILabelTTF | [115, 140] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「30」24 STZhongsong.ttf rgbNone |
| `/FriendListLayer/lbl_friend_num` | UILabelTTF | [595, 140] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「好友数：0/0」24 STZhongsong.ttf rgb[84, 59, 45] |
| `/FriendListLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendListLayer/menu/btn_delete` | UIMenuItemLabel | [120, 82] | [0.5, 0.5] | [154, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-rect-3.png` 8bbca0b0-e214-4256-9207-4b20c3587fda · Label「删除好友」48 [9, 30, 117, 255] |
| `/FriendListLayer/menu/btn_search` | UIMenuItemLabel | [320, 82] | [0.5, 0.5] | [154, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-rect-3.png` 8bbca0b0-e214-4256-9207-4b20c3587fda · Label「添加好友」48 [9, 30, 117, 255] |
| `/FriendListLayer/menu/btn_gift` | UIMenuItemLabel | [520, 82] | [0.5, 0.5] | [154, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-rect-4.png` 35f1525f-45b5-493d-9e0a-626960fe8302 · Label「一键赠送」50 [122, 71, 45, 255] |

## FriendRequestCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendRequestCell` | FriendRequestCell | [0, 0] | [0, 0] | [552, 110] | [1, 1] | 0 | 是 |  |
| `/FriendRequestCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552, 110] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/friend_spr-cell-bg.png` 41107f0f-e256-4099-8bb8-1a81fca86760 insets[40, 40, 40, 40] |
| `/FriendRequestCell/lbl_name` | UILabelTTF | [88, 75] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」22 STZhongsong.ttf rgb[108, 63, 38] |
| `/FriendRequestCell/CCSprite_1` | CCSprite | [101, 36] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/FriendRequestCell/lbl_battle` | UILabelTTF | [118, 38] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」24 STZhongsong.ttf rgb[110, 37, 0] |
| `/FriendRequestCell/spr_photo` | CCSprite | [53, 56] | [0.5, 0.5] | [91, 91] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FriendRequestCell/spr_frame` | CCSprite | [53, 56] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/FriendRequestCell/lbl_level` | UILabelTTF | [275, 75] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100级」22 STZhongsong.ttf rgb[184, 83, 24] |
| `/FriendRequestCell/lbl_statue` | UILabelTTF | [275, 36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「在线」20 STZhongsong.ttf rgb[100, 0, 0] |
| `/FriendRequestCell/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendRequestCell/CCMenu_1/btn_agree` | UIMenuItemLabel | [485, 56] | [0.5, 0.5] | [136, 58] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-big-1.png` 8fd6c4ac-2e76-4551-b366-e545d6110f60 · Label「」24 [255, 255, 255, 255] |
| `/FriendRequestCell/CCMenu_1/btn_refuse` | UIMenuItemLabel | [380, 56] | [0.5, 0.5] | [136, 58] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-big-1.png` 8ff1e662-8d03-4c62-afbc-c56f4719c77c · Label「」24 [255, 255, 255, 255] |

## FriendRequestLayer（4）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendRequestLayer` | FriendRequestLayer | [0, 0] | [0, 0] | [642, 960] | [1, 1] | 0 | 是 |  |
| `/FriendRequestLayer/spr_bg` | CCScale9Sprite | [37, 171] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | **否** | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendRequestLayer/CCSprite_1` | CCSprite | [52, 162] | [0.5, 0.5] | [42, 42] | [1, 1] | 0 | **否** | cc.Sprite SIMPLE `ui/hero/hero-info_spr-bg-icon.png` 2da63cea-8fcd-41cf-846e-5d01ec6f84d6 |
| `/FriendRequestLayer/lbl_friend_num` | UILabelTTF | [586, 122] | [1, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「好友数：0/0」24 STZhongsong.ttf rgb[81, 57, 43] |

## FriendRequestLayer_old（8）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendRequestLayer_old` | FriendRequestLayer | [0, 0] | [0, 0] | [530, 488] | [1, 1] | 0 | 是 |  |
| `/FriendRequestLayer_old/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [530, 488] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-24.png` a18e0448-2af3-4e0e-8170-9bfbe16a4daf insets[30, 30, 30, 30] |
| `/FriendRequestLayer_old/node_title` | CCNode | [265.0, 480.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/FriendRequestLayer_old/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [225, 72] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-4.png` 11e5513f-697a-4e59-8af4-76e01cc0ef72 |
| `/FriendRequestLayer_old/node_title/lbl_title` | UILabelTTF | [0, -44] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「申请信息」56 STZhongsong.ttf rgb[255, 227, 183] |
| `/FriendRequestLayer_old/spr_bg` | CCScale9Sprite | [30, 36] | [0.5, 0.5] | [470, 370] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendRequestLayer_old/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendRequestLayer_old/CCMenu_1/close` | UIMenuItemImage | [482, 462] | [0.5, 0.5] | [55, 58] | [0.7, 0.7] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |

## FriendSearchCell（12）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendSearchCell` | FriendSearchCell | [0, 0] | [0, 0] | [552, 115] | [1, 1] | 0 | 是 |  |
| `/FriendSearchCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [552, 110] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/friend_spr-cell-bg.png` 41107f0f-e256-4099-8bb8-1a81fca86760 insets[40, 40, 40, 40] |
| `/FriendSearchCell/lbl_tips` | UILabelTTF | [473, 55] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已是您的好友」40 STZhongsong.ttf rgb[85, 30, 20] |
| `/FriendSearchCell/lbl_name` | UILabelTTF | [88, 75] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「玩家名字7个字」22 STZhongsong.ttf rgb[85, 30, 20] |
| `/FriendSearchCell/CCSprite_1` | CCSprite | [101, 36] | [0.5, 0.5] | [20, 18] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_attack-1.png` 4442ac71-a919-422f-b809-12caecc832c2 |
| `/FriendSearchCell/lbl_battle` | UILabelTTF | [118, 38] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「99999」24 STZhongsong.ttf rgb[110, 37, 0] |
| `/FriendSearchCell/spr_photo` | CCSprite | [53, 56] | [0.5, 0.5] | [91, 91] | [0.5, 0.5] | 0 | 是 | cc.Sprite SIMPLE `ui/hero/head-icon_0.png` d26708bd-8d52-4347-bd52-2761a17087e6 |
| `/FriendSearchCell/spr_frame` | CCSprite | [53, 56] | [0.5, 0.5] | [138, 138] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/bag/backpack_border-default.png` d7dd0d2f-daf9-462f-b061-d5ac9e3646d6 |
| `/FriendSearchCell/lbl_level` | UILabelTTF | [275, 75] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「100级」22 STZhongsong.ttf rgb[201, 79, 0] |
| `/FriendSearchCell/lbl_statue` | UILabelTTF | [275, 36] | [0.5, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「在线」20 STZhongsong.ttf rgb[100, 0, 0] |
| `/FriendSearchCell/give_menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendSearchCell/give_menu/btn_request` | UIMenuItemLabel | [474, 56] | [0.5, 0.5] | [136, 58] | [0.8, 0.8] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [67, 22, 17, 255] |

## FriendSearchLayer（10）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/FriendSearchLayer` | FriendSearchLayer | [0, 0] | [0, 0] | [642, 960] | [1, 1] | 0 | 是 |  |
| `/FriendSearchLayer/spr_bg` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [642, 960] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/FriendSearchLayer/spr_bg` | CCScale9Sprite | [37, 171] | [0.5, 0.5] | [570, 630] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/FriendSearchLayer/CCMenu_1` | CCMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/FriendSearchLayer/CCMenu_1/btn_search` | UIMenuItemLabel | [450.648, 874] | [0.5, 0.5] | [136, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-old-1.png` 13632528-0f87-48d2-9ac7-71a27f92112a · Label「」24 [68, 22, 15, 255] |
| `/FriendSearchLayer/CCMenu_1/btn_close` | UIMenuItemImage | [555, 920] | [0.5, 0.5] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/FriendSearchLayer/CCMenu_1/btn_friend` | UIMenuItemTab | [114, 800] | [0.5, 0] | [136, 42] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/friend_btn-tab-1.png` 5bce6540-1b70-4305-bfa5-d8c46f0f2800 |
| `/FriendSearchLayer/CCMenu_1/btn_refresh` | UIMenuItemLabel | [520, 92] | [0.5, 0.5] | [154, 62] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-rect-4.png` 35f1525f-45b5-493d-9e0a-626960fe8302 · Label「」50 [255, 255, 255, 255] |
| `/FriendSearchLayer/spr_input_bg` | CCSprite | [46, 853.12] | [0, 0] | [436, 61] | [0.7, 0.7] | 0 | 是 | cc.Sprite SIMPLE `ui/common/other_spr-search-bg-1.png` ecda23c5-5d1e-48f7-bb87-c67373f95dbb |
| `/FriendSearchLayer/lbl_friend_num` | UILabelTTF | [46, 92] | [0, 0.5] | auto | [1, 1] | 0 | 是 | cc.Label「好友数：0/0」24 STZhongsong.ttf rgb[60, 15, 0] |

## MailCell（6）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MailCell` | MailCell | [0, 0] | [0, 0] | [540, 90] | [1, 1] | 0 | 是 |  |
| `/MailCell/CCScale9Sprite_1` | CCScale9Sprite | [0, 0] | [0.5, 0.5] | [540, 86] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-20.png` af67bdc0-8905-4521-b400-68b283b4d9f9 insets[10, 10, 10, 10] |
| `/MailCell/spr_mail_icon` | CCSprite | [60, 44] | [0.5, 0.5] | [80, 82] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/mail/mail_spr-mail-open.png` 7a39a737-7ac1-468f-ac2a-caa60b513f7f |
| `/MailCell/lbl_time` | UILabelTTF | [489, 30] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「邮件时间」36 STZhongsong.ttf rgb[141, 89, 58] |
| `/MailCell/lbl_title` | UILabelTTF | [129, 43] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「邮件标题」44 STZhongsong.ttf rgb[141, 89, 58] |
| `/MailCell/lbl_reward` | UILabelTTF | [489, 55] | [1, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「已读」36 STZhongsong.ttf rgb[32, 166, 0] |

## MailInfoLayer（15）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MailInfoLayer` | MailInfoLayer | [0, 0] | [0, 0] | [560, 730] | [1, 1] | 0 | 是 |  |
| `/MailInfoLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [580, 750] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MailInfoLayer/node_title` | CCNode | [280.0, 730.0] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MailInfoLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MailInfoLayer/node_title/lbl_title` | UILabelTTF | [0, -45] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「邮件」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/MailInfoLayer/lbl_title` | UILabelTTF | [112.2, 620.5] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「邮件标题」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/MailInfoLayer/CCScale9Sprite_1` | CCScale9Sprite | [31, 100] | [0.5, 0.5] | [500, 500] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/MailInfoLayer/lbl_mail_title` | UILabelTTF | [55.0, 533] | [0, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「亲爱的冒险者大人」40 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |
| `/MailInfoLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MailInfoLayer/menu/btn_close` | UIMenuItemImage | [500, 730] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/MailInfoLayer/menu/btn_reward` | UIMenuItemLabel | [280, 60] | [0.5, 0.5] | [102, 44] | [0.9, 0.9] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「」24 [255, 255, 255, 255] |
| `/MailInfoLayer/scroll_view` | UIScrollViewBackpack | [280, 390] | [0.5, 0.5] | [450, 80] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask HORIZONTAL |
| `/MailInfoLayer/scroll_view_text` | CCScrollView | [280, 520] | [0.5, 1] | [450, 90] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |
| `/MailInfoLayer/spr_mail_icon` | CCSprite | [76.56, 633] | [0.5, 0.5] | [80, 82] | [0.8, 0.8] | 0 | 是 | cc.Sprite SIMPLE `ui/mail/mail_spr-mail-reward-unopen.png` 1f167d7f-c8ef-4463-84c6-f9a2c16efcd2 |
| `/MailInfoLayer/lbl_day` | UILabelTTF | [485, 618] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「5天前」36 FZCSJW--GB1-0.ttf rgb[141, 89, 58] |

## MailLayer（11）

| 路径 | ccb 类 | 位置 | 锚点 | 尺寸 | 缩放 | angle | 显示 | 组件 |
|---|---|---|---|---|---|---|---|---|
| `/MailLayer` | MailLayer | [0, 0] | [0, 0] | [620, 860] | [1, 1] | 0 | 是 |  |
| `/MailLayer/spr_bg` | CCScale9Sprite | [-10, -10] | [0.5, 0.5] | [640, 880] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_win-bg-11.png` 062cd5cb-6ba6-42f3-a798-51003b1bc235 insets[80, 80, 80, 80] |
| `/MailLayer/node_title` | CCNode | [310.0, 859.936] | [0, 0] | [0, 0] | [1, 1] | 0 | 是 |  |
| `/MailLayer/node_title/spr_title_bg` | CCScale9Sprite | [0, 0] | [0.5, 1] | [184, 67] | [1, 1] | 0 | 是 | cc.Sprite SIMPLE `ui/common/win-bg_title-bar-3.png` 82836403-c259-4884-8c0a-73e4c45f1c79 |
| `/MailLayer/node_title/lbl_title` | UILabelTTF | [0, -45] | [0.5, 0.5] | auto | [0.5, 0.5] | 0 | 是 | cc.Label「邮 件」48 STZhongsong.ttf rgb[255, 227, 183] |
| `/MailLayer/spr_bg` | CCScale9Sprite | [30, 100] | [0.5, 0.5] | [560, 660] | [1, 1] | 0 | 是 | cc.Sprite SLICED `ui/common/win-bg_block-bg-5.png` b41f4934-f3ca-4c26-970f-2acca88e7a5c insets[12, 12, 12, 12] |
| `/MailLayer/menu` | UIMenu | [0, 0] | [0, 0] | [640, 960] | [1, 1] | 0 | 是 |  |
| `/MailLayer/menu/btn_close` | UIMenuItemImage | [553.84, 860] | [0.5, 1] | [55, 58] | [1, 1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-close-1.png` 545d3457-a753-4a14-a6a4-565b9c8ba9ef |
| `/MailLayer/menu/btn_reward_all` | UIMenuItemLabel | [420, 60] | [0.5, 0.5] | [102, 44] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-orange-1.png` aae384ae-d1c7-4e47-9c81-7ecf4c0de0e5 · Label「」40 [255, 255, 255, 255] |
| `/MailLayer/menu/btn_delete_read` | UIMenuItemLabel | [200, 60] | [0.5, 0.5] | [102, 44] | [1.1, 1.1] | 0 | 是 | cc.Button+cc.Sprite normal `ui/common/button_btn-green-1.png` 1dbedbc4-d550-4e2a-a4ee-4a634a8d3f4e · Label「」40 [255, 255, 255, 255] |
| `/MailLayer/scroll_view` | UIScrollViewBackpack | [30, 100] | [0, 0] | [560, 660] | [1, 1] | 0 | 是 | cc.ScrollView+cc.Mask VERTICAL |

## langKey / outline / shadow（只记录，不加组件）

ccbi 上的 `langKey`、`outline`、`shadow` 不挂 i18n / Label outline / Label shadow。字号未写的按钮文字按 24，颜色未写的按白色（`fontSizeDefaulted`）。

### langKey

| Prefab | 节点 | langKey | 文本 |
|---|---|---|---|
| ChatCityLayer | `/ChatCityLayer/lbl_ignore_tip` | lang###41356 | - - |
| ChatSystemLayer | `/ChatSystemLayer/UILabelTTF_1` | lang###5689 | 此频道不能发言,请切换到其他频道 |
| FriendCell | `/FriendCell/lbl_name` | lang###5133 | 玩家名字7个字 |
| FriendCell | `/FriendCell/lbl_level` | lang###5305 | 100级 |
| FriendCell | `/FriendCell/lbl_statue` | lang###5422 | 在线 |
| FriendGivedCell | `/FriendGivedCell/lbl_name` | lang###5133 | 玩家名字7个字 |
| FriendGivedCell | `/FriendGivedCell/lbl_level` | lang###5305 | 100级 |
| FriendGivedCell | `/FriendGivedCell/lbl_statue` | lang###5422 | 在线 |
| FriendLayer | `/FriendLayer/node_title/lbl_title` | lang###5111 | 好 友 |
| FriendListLayer | `/FriendListLayer/menu/btn_delete/Label` | lang###29 | 删除好友 |
| FriendListLayer | `/FriendListLayer/menu/btn_search/Label` | lang###30 | 添加好友 |
| FriendListLayer | `/FriendListLayer/menu/btn_gift/Label` | lang###4019 | 一键赠送 |
| FriendRequestCell | `/FriendRequestCell/lbl_name` | lang###5133 | 玩家名字7个字 |
| FriendRequestCell | `/FriendRequestCell/lbl_level` | lang###5305 | 100级 |
| FriendRequestCell | `/FriendRequestCell/lbl_statue` | lang###5422 | 在线 |
| FriendRequestLayer_old | `/FriendRequestLayer_old/node_title/lbl_title` | lang###5725 | 申请信息 |
| FriendSearchCell | `/FriendSearchCell/lbl_tips` | lang###5752 | 已是您的好友 |
| FriendSearchCell | `/FriendSearchCell/lbl_name` | lang###5133 | 玩家名字7个字 |
| FriendSearchCell | `/FriendSearchCell/lbl_level` | lang###5305 | 100级 |
| FriendSearchCell | `/FriendSearchCell/lbl_statue` | lang###5422 | 在线 |
| MailCell | `/MailCell/lbl_time` | lang###5480 | 邮件时间 |
| MailCell | `/MailCell/lbl_title` | lang###5156 | 邮件标题 |
| MailCell | `/MailCell/lbl_reward` | lang###5351 | 已读 |
| MailInfoLayer | `/MailInfoLayer/node_title/lbl_title` | lang###5503 | 邮件 |
| MailInfoLayer | `/MailInfoLayer/lbl_title` | lang###5156 | 邮件标题 |
| MailInfoLayer | `/MailInfoLayer/lbl_mail_title` | lang###5789 | 亲爱的冒险者大人 |
| MailLayer | `/MailLayer/node_title/lbl_title` | lang###5503 | 邮 件 |

### outline

| Prefab | 节点 | outline |
|---|---|---|
| ChatFriendCell | `/ChatFriendCell/lbl_level` | `{"color":[0,0,0,255],"size":1}` |
| FriendLayer | `/FriendLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| FriendRequestLayer_old | `/FriendRequestLayer_old/node_title/lbl_title` | `{"color":[87,56,29,255],"size":2}` |
| MailInfoLayer | `/MailInfoLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":4}` |
| MailInfoLayer | `/MailInfoLayer/menu/btn_reward/Label` | `{"color":[131,43,22,255],"size":2}` |
| MailLayer | `/MailLayer/node_title/lbl_title` | `{"color":[87,56,29,255],"size":4}` |
| MailLayer | `/MailLayer/menu/btn_reward_all/Label` | `{"color":[131,43,22,255],"size":2}` |
| MailLayer | `/MailLayer/menu/btn_delete_read/Label` | `{"color":[13,91,45,255],"size":2}` |

### shadow

| Prefab | 节点 | shadow |
|---|---|---|
| FriendGivedLayer | `/FriendGivedLayer/menu/btn_one_key_gived/Label` | `{"color ": [67,22,17, 255],"offset": [0, -1],"blur": 1}` |
| FriendSearchLayer | `/FriendSearchLayer/CCMenu_1/btn_refresh/Label` | `{"color ": [67,22,17, 255],"offset": [0, -1],"blur": 1}` |

### fontSizeDefaulted（按钮文字，Prefab 里仍写 spec 的字号）

| Prefab | 节点 | fontSize | 文本 |
|---|---|--:|---|
| FriendCell | `/FriendCell/firend_menu/btn_chat/Label` | 24 |  |
| FriendCell | `/FriendCell/firend_menu/btn_gift/Label` | 24 |  |
| FriendCell | `/FriendCell/firend_menu/btn_info/Label` | 24 |  |
| FriendCell | `/FriendCell/delete_menu/btn_delete/Label` | 24 |  |
| FriendGivedCell | `/FriendGivedCell/give_menu/btn_to/Label` | 24 |  |
| FriendGivedCell | `/FriendGivedCell/give_menu/btn_get/Label` | 24 |  |
| FriendRequestCell | `/FriendRequestCell/CCMenu_1/btn_agree/Label` | 24 |  |
| FriendRequestCell | `/FriendRequestCell/CCMenu_1/btn_refuse/Label` | 24 |  |
| FriendSearchCell | `/FriendSearchCell/give_menu/btn_request/Label` | 24 |  |
| FriendSearchLayer | `/FriendSearchLayer/CCMenu_1/btn_search/Label` | 24 |  |
| MailInfoLayer | `/MailInfoLayer/menu/btn_reward/Label` | 24 |  |

### 缺图

- `ChatLayer/menu/btn_draw`：`main-scene/btn-sidebar-1.png`（normal / disabled）与 `main-scene/btn-sidebar-2.png`（selected，checkmark）在 resources 中不存在。按钮照建，Sprite.spriteFrame 留空，checkmark 的 Sprite 同样留空且 active=false。
- `FriendRequestLayer_old/CCMenu_1/close` 的 btn-close-2 已在 spec 中替换为 `button_btn-close-1.png`。
- `ChatLeftCell` / `ChatRightCell` 的 `btn_photo`、`FriendCell` 的 `btn_info` 在 ccbi 里没有 normal 帧，Sprite 留空，不是缺文件。

### 九宫格未采用的另一套边距

同一张图被要求两套值时，meta 取用得多的那套（见上文「九宫格 .meta」的 alsoNeeded）。另一套只记在这里，不改 .meta：

- `client/assets/resources/ui/common/chat_spr-friend-layer-bg.png.meta` 采用 `[12, 12, 12, 12]`，未采用 `{'[10, 10, 10, 10]': 3}`
- `client/assets/resources/ui/common/win-bg_cell-bg-1.png.meta` 采用 `[5, 5, 5, 5]`，未采用 `{'[9, 9, 9, 9]': 1}`
- `ui/common/win-bg_block-bg-20.png.meta` 由 P2A 改，本批节点仍用 SLICED，不改该 .meta。
