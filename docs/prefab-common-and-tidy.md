# 通用 Prefab 与页面底图缺口

通用件在 `client/assets/prefabs/ui/common/`。素材只引用 `client/assets/resources/` 里已有的 spriteFrame（`@f9941`）。`prefabs/` 下没有 PNG。

这些 Prefab **未接** Boot、`prefabLoad` 和任何 `USE_*`。运行时仍走原来的代码 UI。壳脚本只声明节点，不加载、不发协议。

再生：`python3 client/tools/gen_common_prefab.py`。脚本只读 #66 那五份九宫格 `.meta`，不会改它们，也不会碰日文 `lbl` 位图。壳脚本 `.ts.meta` 的 uuid 也不重铸。

## 脚本类 id

Prefab `__type__` 与 Creator 3.8.8 `_RF.push` 必须是同一个 23 位字符串：壳脚本 uuid 走 `compressUuid(uuid, false)`，保留头 **5**。生成器 `compress_uuid` 的默认保留头就是 5。22 位 `compressUuid(uuid, true)`（保留头 2）对不上 chunk，检查器报 MissingScript。

| Prefab | 旧 22 位 | 现 23 位 |
|--------|----------|----------|
| `CommonBtnPrimary` | `26ahNMcGFOLIUtdNI4X+Ea` | `266a1NMcGFOLIUtdNI4X+Ea` |
| `CommonBtnSecondary` | `55JvyZLJ1IyYY2qlDC/aIj` | `5526fyZLJ1IyYY2qlDC/aIj` |
| `CommonListRow` | `74pCSdF/tMRZCzJZgB6COf` | `74a42SdF/tMRZCzJZgB6COf` |
| `CommonPanel` | `a3Yqy4t/9IUbZ5K1Y/9Dxu` | `a362ay4t/9IUbZ5K1Y/9Dxu` |
| `CommonRedDot` | `51/S1ndAFCyaS1miF0bTsq` | `51fd21ndAFCyaS1miF0bTsq` |

`CityChromeShell` 已在 #151 对齐到 `c4e8aHSe2NOkI8Vai2cC0fj`。`Boot.scene` 本来就是 23 位。不要把压缩串写回 `.meta`。

改完后清一次 `client/library` 和 `client/temp`，再打开工程。通用 Prefab 不应再显示 MissingScript。

自检：`python3 client/tools/check_script_type_ids.py`。

设计基准与现有界面 Prefab 相同：**720×1280**，坐标相对父节点中心。除红点外，锚点都是 `(0.5, 0.5)`。

## 命名

| 种类 | 路径 | 根节点 |
|------|------|--------|
| 通用壳 | `prefabs/ui/common/Common*.prefab` | 与文件名相同，例如 `CommonPanel` |
| 功能页（Mock） | `prefabs/ui/<feature>/<Feature>Page.prefab` | `BagPage`、`ShopPage` |
| 功能页（真服只读） | `prefabs/ui/<feature>/Wire<Feature>Page.prefab` | `WireMailPage` |
| 登录 / 主城 | `prefabs/ui/login/`、`prefabs/ui/city/` | `LoginPanel`、`CityChrome`、`CityHub` |

- 通用件用 `Common` 前缀，只放可复用的壳。具体玩法、协议字段、活动文案留在功能目录。
- 功能页不要再叫 `Common*`，也不要把 PNG 拷进 `prefabs/`。
- 节点名用现有页的 PascalCase：`Bg`、`Title`、`BtnClose`、`Label`、`Row_0`。不要用连字符或编辑器默认名 `Node`。
- 按钮文案放在子节点 `Label`。`clickEvents` 保持空数组，过渡用缩放（`_transition` 3，`zoomScale` 1.05），和现有页一致。

## 本刀新增的壳

占位文案只有「标题 / 副标题 / 确定 / 取消」。换字由调用方做。

### CommonPanel（640×880）

| 节点 | 位置 | 尺寸 | 图 | 模式 |
|------|------|------|----|------|
| `Frame` | (0, 0) | 640×880 | `win-bg_win-bg-12` | 九宫格，不染色 |
| `Content` | (0, -34) | 592×764 | 无 | 空锚点，功能节点只挂在这里 |
| `TitleBar` | (0, 392) | 322×55 | `win-bg_title-bar` | 简单模式，按裁切尺寸，不拉变形 |
| `Title` | (0, 392) | 260×40 | — | `标题`，28 号，金色 |
| `BtnClose` | (276, 394) | 53×56 | `button_btn-close-1` | 简单模式，按裁切尺寸；缩放按钮，没有隐藏 Label |

根上有 `cc.BlockInputEvents`，挡住点到壳后面的界面。壳脚本 `CommonPanelShell` 绑 `frame` / `titleBar` / `title` / `btnClose` / `content`。

`Content` 在标题栏下面，左右各留 24。标题栏和关闭钮画在 `Content` 之上。

### CommonBtnPrimary / CommonBtnSecondary（240×64）

| Prefab | 常态 | 按下图（只存着，缩放过渡不会换图） | 文案 |
|--------|------|-----------------------------------|------|
| `CommonBtnPrimary` | `button_btn-orange-big-1` 九宫格 | `button_btn-orange-big-2` | `确定` |
| `CommonBtnSecondary` | `button_btn-blue-big-1` 九宫格 | `button_btn-blue-big-2` | `取消` |

主按钮用橙色，对应现有页的购买 / 领取。次按钮用蓝色大按钮，对应返回。两张常态图都是 #66 九宫格：左右有边，上下边是 0，所以高度保持 64，接近橙钮原高 58，不要再拉得很高。按下图 `*-2` 的 border 仍是 0，因此继续用缩放过渡，不改成换图过渡。

壳脚本只绑子节点 `label`。

### CommonListRow（640×104）

| 节点 | 位置 | 尺寸 | 说明 |
|------|------|------|------|
| `Bg` | (0, 0) | 640×104 | `win-bg_win-bg-12` 九宫格，不染色 |
| `Icon` | (-268, 0) | 64×64 | `res-icon_res-bg` 简单模式，当图标槽。功能页换成自己的 spriteFrame |
| `Title` | (-46, 16) | 348×36 | `标题`，22 号，左对齐，深褐 |
| `Subtitle` | (-46, -18) | 348×28 | `副标题`，18 号，左对齐 |
| `Action` | (224, 0) | 168×64 | 空槽。右边的按钮挂在这里，壳上不放业务按钮 |

壳脚本绑 `icon` / `title` / `subtitle` / `action`。

### CommonRedDot（18×18）

根锚点 **`(1, 1)`**，这样根的位置就是要盖住的那个角。子节点 `Dot` 在 `(-9, -9)`，16×16，图是 `win-bg_spot-white` 染成 `(214, 40, 40)`。白点原图是 5×5 实心、四角透明，这里只做等比放大，不是九宫格。

没有计数，也没有显隐逻辑。调用方改根节点或 `Dot` 的 `active`。壳脚本只绑 `dot`。

挂到一个锚点在中心的按钮右上角时，把红点放在该按钮本地坐标 `(半宽, 半高)`。

## 九宫格 / 锚点清单

做新 Prefab 或改尺寸时按这个核对：

1. 设计分辨率 720×1280。页面和通用壳的锚点用 `(0.5, 0.5)`，坐标相对父节点中心。不要加 `cc.Widget`，现有 UI Prefab 也没有。
2. 先读 spriteFrame `.meta` 的 `borderTop/Bottom/Left/Right`。四边都是 0 就用简单模式（`_type` 0）。任一边非 0 才用九宫格（`_type` 1），`_sizeMode` 用 0（自定义尺寸）。
3. 仓库里 border 非 0 的通用图只有 #66 这五张，本刀不改它们的 `.meta` 和 PNG：
   - `button_btn-blue-big-1`：左 61 / 右 57，上下 0
   - `button_btn-blue`：左 97 / 右 97，上下 0
   - `button_btn-green-big-1`：左 63 / 右 57，上下 0
   - `button_btn-orange-big-1`：左 64 / 右 59，上下 0
   - `win-bg_win-bg-12`：上 20 / 下 20 / 左 15 / 右 18
4. 上下边为 0 的按钮可以加宽，高度保持接近原图（橙钮约 58，蓝大钮原高约 83，通用钮统一 64）。
5. 边为 0 的装饰（标题栏、关闭钮）按裁切宽高摆，不拉。图标槽和红点只做等比放大。
6. 页面底已经有 map-bg / 登录底 / 主城底时，不要再用 `win-bg_win-bg-12` 染成深蓝冒充底图。`win-bg-12` 留给面板、列表行、输入遮罩这类可拉伸壳，并且保持白色，让图自己的米色金边出来。
7. 红点是例外：锚点 `(1, 1)`，方便扣在宿主角上。

## 页面 Bg：谁还在用 win-bg 染色

按当前 Prefab JSON 实扫（spriteFrame uuid 对回 `resources/`）。**登录、主城、玩法页的页面 `Bg` 都已经不是染色的 `win-bg_win-bg-12`。** 这一档的缺口是空的。

| Prefab | 页面 `Bg` | 染色 |
|--------|-----------|------|
| `login/LoginPanel` | `ui/login/bg-loading.jpg` | 白 |
| `login/CreateRolePanel` | `ui/login/bg-create-role.jpg` | 白 |
| `city/CityHub` | `ui/maps/map-bg-city-*` 视差板，不是全屏 `Bg` | 白 |
| `city/CityChrome` | 顶 `main-scene_spr-up-bg`，底 `main-scene_spr-bottom-bg`（不是全屏地图） | 白 |
| `bag/BagPage`、`bag/WireBagPage` | `ui/bag/map-bg-backpack-1.jpg` | 白 |
| `hero/HeroPage`、`hero/WireHeroPage` | `ui/hero/map-bg-hero-palace-1.jpg` | 白 |
| `idle/IdlePage`、`idle/WireIdlePage` | `ui/idle/map-bg-dungeon-1.jpg` | 白 |
| `mainline/MainlinePage`、`mainline/WireMainlinePage` | `ui/mainline/map-bg-mission-1.jpg` | 白 |
| `shop/ShopPage` | `ui/shop/map-bg-pub-1.jpg` | 白 |
| `summon/SummonPage` | `ui/summon/map-bg-summon-2.jpg` | 白 |
| `wish/WishPage` | `ui/wish/map-bg-blessing-pool-2.jpg` | 白 |
| `sevenday/Login7Page`、`sevenday/WireSevenDayPage` | `ui/sevenday/map-bg-seven-day-target-1.jpg` | 白 |
| `arena/WireArenaPage` | `ui/arena/map-bg-team-arena-bg.jpg` | 白 |

没有专用 map-bg、页面底用了别的实图（仍然不是 win-bg 染色）：

| Prefab | 现在的 `Bg` | 说明 |
|--------|-------------|------|
| `mail/MailPage`、`mail/WireMailPage` | `ui/promo/promotion-bg-1.jpg` | `resources/` 里没有邮件 map-bg |
| `buygold/WireBuyGoldPage` | `ui/promo/promotion-bg-raretreasures.jpg` | 没有点金全屏底。`buy-gold_block-bg-13` 只是小块，不是地图 |
| `achievement/WireAchievementPage` | `ui/sevenday/map-bg-seven-day-target-1.jpg` | 与七日页共用，没有成就专用底 |

`docs/prefab-layout.md` 若干小节仍写着页面底用 `win-bg_win-bg-12` 染成 `(8, 16, 32)` 或暖棕。那是换图之前的说法。上面这张表以 Prefab 为准。本刀不改写那些长小节，也不改登录 / 主城 1:1 Prefab。

## 仍在染色的 win-bg（不是页面 Bg）

这些是内卡、单位条、按钮染色。本刀没有改它们：颜色跟对应页面脚本里的填充色一致，而且玩法 Prefab 由 `client/tools/gen_*_prefab.py` 生成，只改 JSON 会在下次再生时丢。

| 节点 | 图 | 染色 | 所在 Prefab |
|------|----|------|-------------|
| `Card` / `ResultCard` | `win-bg_block-bg-5` | `(16, 28, 48)` | Bag 详情、Hero 详情、Idle、WireIdle、Mail 详情、Summon 结果 |
| 战斗单位底 | `win-bg_block-bg-5` | 敌 `(96, 40, 44)` / 我 `(28, 58, 96)` | `MainlinePage` |
| 血条 | `win-bg_num-bg` | 敌红 / 我绿 | `MainlinePage` |
| `LogBg` | `win-bg_msg-bg` | `(10, 18, 32)` | `MainlinePage` |
| `BtnTen` | `button_btn-blue-big-1` | `(120, 72, 168)` | Summon |
| 四个许愿钮 | `button_btn-blue-big-1` | 金 / 紫 / 蓝 / 返回蓝 | Wish |
| `BtnDelete` | `button_btn-blue-big-1` | `(78, 84, 98)` | Mail |
| `Mask` | `win-bg_win-bg-12` | 透明 `(0,0,0,0)` | Login、CreateRole。挡点击，不是可见底图 |
| `CardBg` | `win-bg_win-bg-12` | 白 | Login、CreateRole。卡片壳，和 `CommonPanel/Frame` 同一张图 |

登录、主城 Prefab 的页面底不再用 win-bg 染色，所以没有在那两套上做节点清理。

## 节点整理

本刀 **没有改** 已有 Prefab 的节点名，也没有删节点。

看过的情况：

- 没有编辑器默认名 `Node`，也没有「只有 UITransform、没有子节点」的废节点。
- 重复的 `Label`、`Bg`、`BtnBack` 都在各自按钮或分页下面，不是多余副本。
- Wire 页里关掉的 `Row_*` / `Empty` / `More` 是未同步时的预览，生成器会核对它们。删了会和 `gen_*_prefab.py` 冲突。
- 玩法页的页面 `Bg` 已经是实图，没有一页还用 win-bg 染色底可以顺手换掉。

若下一刀要清内卡染色，应改对应生成器和页面脚本里的填充色，而不是只改 Prefab。

## 国战图标

`main_country_war` 的建筑图已入库：

`client/assets/resources/ui/city/main-city_icon-main_country_war.png`

SpriteFrame uuid 是 `3e507128-946f-56a8-ace2-852b82b1145d@f9941`，158×88，未与仓内其他 uuid 冲突。`.meta` 沿用随图带来的 Creator 3.8 结构（`6c48a` 贴图 + `f9941` spriteFrame），`displayName` 改成和同目录 `main-city_icon-*` 一样的文件名。`buildingIconCandidates("main_country_war")` 本来就指向 `ui/city/main-city_icon-main_country_war`，所以这份图能被主城建筑图标候选命中。国战仍然没有独立页面路由，只保留「国战」标签。

日文 `lbl` 位图（`main-scene-lang_lbl-*`、`other_lbl-dead`）没有改。

## 仍缺的 btn-login

活动入口钮解出来的 PNG 只有这两张，图集键也只有这两个：

- `client/assets/resources/ui/city/main-city_btn-login-1.png`
- `client/assets/resources/ui/city/main-city_btn-login-8.png`

没有 `btn-login-2` … `btn-login-7`，也没有 `btn-login-9` … `btn-login-14` 的独立图。`hero-arrive.png` 同样没有。本刀不补假图。

`CityMap` 继续走 `activityIconCandidates`：先试 `ui/city/main-city_<config 文件名>`（例如 `main-city_btn-login-3`），文件不在就落到 `ui/city/main-city_icon-<atom>`，也就是已有的 `main-city_icon-act_*`。缺的登录钮保持这条回退，不要改成新画的按钮。
