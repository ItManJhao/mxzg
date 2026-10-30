# Prefab / 资源目录约定（P0）

> 历史记录：客户端当前标准以 [architecture.md](architecture.md) 和 [背包标准模块样板](bag-mvc-maintenance.md) 为准。背包已迁入 features/Bag，采用完整名称、BaseModel/BaseController 和单一全局 EventDispatcher；下方旧目录/开关/分层不再作为现行要求。指定核心流程的正式服视觉、交互和规则对照目标继续有效。

- **素材**（图/音/字）：`client/assets/resources/`（`ui/`、`audio/`、`font/` 等）
- 全屏 `map-bg` / `promotion-bg` 批次的文件对照见 [`asset-batch-map-bg.md`](asset-batch-map-bg.md)。页面 `Bg` 已换成实图；哪些页仍用 win-bg 染色、哪些只是内卡染色，见 [`prefab-common-and-tidy.md`](prefab-common-and-tidy.md)。下文有的小节还停在旧的 win-bg 染色描述，以那份实扫为准。`battle-scene` 已在 `resources/ui/battle/`。战斗表现壳见 [`battle-prefab-layout.md`](battle-prefab-layout.md)。BattlePage 由 `USE_BATTLE_PREFAB` 挂进真服进战，不改 Boot。WireBattlePage 仍未接。
- **界面 Prefab**：`client/assets/prefabs/ui/`（与素材分目录，勿把 Prefab 和 PNG 放同一层）
- Prefab 内 SpriteFrame 仍通过 uuid 引用 `resources/` 下素材
- **CreateRole 已合**入 `client/assets/prefabs/ui/login/CreateRolePanel.prefab`
- `assets/prefabs` 是 Asset Bundle，名称 `prefabs`。运行时 `assetManager.loadBundle('prefabs')`，再 `bundle.load('ui/login/LoginPanel')`（无扩展名）。编辑器尚未刷出 bundle 时，用 `.prefab.meta` 的 uuid 走 `assetManager.loadAny`。**不要** `resources.load('ui/login/LoginPanel')`：Prefab 不在 `resources/`

| Prefab | 路径（相对 assets） | 挂载点 | Flag（默认 `true`） |
|--------|---------------------|--------|---------------------|
| LoginPanel | `prefabs/ui/legacy-login/LoginPanel` | `Boot.ts` 的 `buildLoginPanel(...)` | `USE_LOGIN_PREFAB` |
| CreateRolePanel | `prefabs/ui/login/CreateRolePanel` | `Boot.ts` 的 `buildCreateRolePanel(...)` | `USE_CREATE_ROLE_PREFAB` |
| CityChrome | `prefabs/ui/city/CityChrome` | `MainApp.ts` 的 `mountCityChrome(...)` | `USE_CITY_CHROME_PREFAB` |
| CityHub | `prefabs/ui/city/CityHub` | `MainApp.ts` 的 `buildCity()` | `USE_CITY_HUB_PREFAB` |
| HeroPage | `prefabs/ui/hero/HeroPage` | `MainApp.ts` 的底栏「英雄」（Mock） | `USE_HERO_PREFAB` |
| SummonPage | `prefabs/ui/summon/SummonPage` | 城内召唤法阵（Mock） | `USE_SUMMON_PREFAB` |

Login / CreateRole / CityChrome / CityHub 四个主路径 flag 默认 **true**。Mock 启动出 Login Prefab，创角出 CreateRole Prefab，进主城后顶栏底栏来自 CityChrome，中间是 CityHub。底栏「英雄」和城内召唤在 Mock 下再挂各自的 Prefab。真服只读页仍走原来的代码页。

冷启动要看 P1 的 1:1 登录（`UserLoginLayer` / `ChooseServerLayer`）以及主城建筑、主线上的 P2–P4 壳时，走 [`prefab-demo-path.md`](prefab-demo-path.md)。`USE_P1_LOGIN_PREFAB` 默认开，关掉仍回到上表的 LoginPanel。页面壳是 `USE_PAGE_PREFAB_SHELL`，不进 Boot。

## 回滚

把要退回的常量改成 `false`。`false` 时仍调用原来的 `buildLoginPanel` / `buildCreateRolePanel` / `mountCityChrome` / `mountCityMap`，代码搭 UI 没有删。CityHub 改 `false` 时主城中间回到代码地图。

加载失败会打日志（`login prefab …，改用代码 UI` / `create prefab` / `city chrome prefab` / `city hub prefab`）并退回对应的代码 UI，避免预览停在空画面。这不等于把 flag 改成 false。

## 节点

- Login：`Mask`、`Bg`、`Card/{CardBg,Title,Subtitle,AccountLabel,AccountField,PasswordLabel,PasswordField,ServerLabel,ServerRow/Btn_1|Btn_2|Btn_3,Picked,Status,Detail,BtnEnter,BtnCreate,BtnMock}`
- CreateRole：`Mask,Bg,Card/{CardBg,Title,Hint,Meta,NameLabel,NameField,Status,BtnConfirm,BtnBack}`
- CityChrome：`TopBar/{LblName,LblSub,CurrencyGold/Value,CurrencyGem/Value}`、`BottomBar/TabCity|TabHero|TabBag|TabBattle|TabDungeon|TabClan|TabFetter`（子节点 `Label`、`Lock`）。完整节点、贴图和与日文主城的差别见 [`city-chrome-nodes.md`](city-chrome-nodes.md)

适配只绑这些节点。Login 对外仍是 `setStatus` / `setDetail` / `setBusy` / `account` / `password` / `serverId`。CreateRole 仍是 `setStatus` / `setBusy` / `name`。CityChrome 仍是 `setIdentity` / `setCurrencies` / `setTabs`，底栏点击走原来的 `onTab`。

## CityHub（已接 MainApp）

- **路径**：`client/assets/prefabs/ui/city/CityHub.prefab`（bundle 内 `ui/city/CityHub`）
- **挂载**：`MainApp.buildCity()`，`USE_CITY_HUB_PREFAB` 默认 **true**。加载失败退回 `mountCityMap`。不改 Boot。开关放在 MainApp，和 `USE_CITY_CHROME_PREFAB` 一样。
- **对照**：`cityMapLayout.ts` 的方案 B，设计基准 **720×1280**。地图坐标是父节点左下角空间；`BtnMainline` 是画面中心系。
- 与 CityChrome 分开：本 Prefab **没有** `Top` / `Bottom` / `Tab_*`。顶栏底栏仍是 CityChrome。
- 不再是调试按钮矩阵。没有 `BtnIdle`、`BtnBag`、`BtnMail`、`BtnLogin7` 这一排矩形。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。缺图不补假按钮。
- 再生：`python3 client/tools/gen_cityhub_prefab.py`（从现有 `.meta` 读 `@f9941`，保留 Prefab uuid `118c08f7-43eb-477d-ab62-50f3ec65294f`）

| 节点 | 作用 |
|------|------|
| `CityParallax` | 可拖动的地图容器，初始滚到画面中心 |
| `spr_map_bg1` … `spr_map_bg4` | 四层视差。近景 `bg1` 含 `spr_map_bg1_1` / `spr_map_bg1_2` |
| `spr_map_bg*_1` | `ui/maps/map-bg-city-*-1` 底板 |
| `spot-<atom>` | 19 个建筑，图标 `ui/city/main-city_icon-<atom>.png`，点击走原来的 `onCityAtom` |
| `fx-<para>` | 有静帧的地图特效。`dx`、`chuanghu` 是脊柱，没有静帧，不放节点 |
| `BtnMainline` | 画面左下的任务剑图标。打开原来的主线页，挑战仍进已经接上的战斗 |

建筑名字写在图标横幅上，Prefab 不再加第二行字。`BtnMainline` 的 `Label` 运行时写成当前关，例如 `主线 · 第1关`。

### 缺口（不补假图）

- 脊柱 `dx`、`chuanghu` 没有位图。
- `createmaincitybtn` 的 33 个活动图标不铺在这张 Prefab 上，避免盖住建筑。右上仍是 CityChrome 的 `ActGroup`，「活动」列表仍是原来的入口。`btn-login-2..7`、`9..14` 仓内没有独立 PNG。
- 地图用 variant 1。`map-bg-city-*-2` 在仓里，这张 Prefab 不用。
- `ui/city/bg-main-scene.jpg` 不是这张可拖动的主城底板。
- 底栏「铁匠铺」和「玩法」目录没有对应 Prefab，仍是代码页。玩法里的主线不在底栏；主线从 `BtnMainline` 进。
- Mock 主线页本体仍是原来的代码页，这样挑战和战报不被这次改动拆开。真服挑战进战仍挂已有的 `BattlePage` Prefab。
- 真服英雄 / 召唤只读页不挂 Mock 的 HeroPage / SummonPage。

## Mainline（P1，未接线）

Mock 关卡页和真服只读页各一份 Prefab。`MainlinePage.ts` 在同一页里换三个阶段（列表 / 战斗 / 结算）。`WireMainlinePage.ts` 只有标题、当前 idx、最高 idx、说明和返回，标题在 y=220，不是列表的 y=470。两页没有可以共用的内容根。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| MainlinePage | `prefabs/ui/mainline/MainlinePage` | **未接** |
| WireMainlinePage | `prefabs/ui/mainline/WireMainlinePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/mainline/MainlinePage.prefab`、`client/assets/prefabs/ui/mainline/WireMainlinePage.prefab`
- **状态**：**未接** Boot、`MainApp`、`MainlinePage.ts`、`WireMainlinePage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。没有主线专用底图：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；按钮用 `button_btn-blue-big` / `button_btn-orange-big`；战报底用 `win-bg_msg-bg`；单位卡用 `win-bg_block-bg-5`；血条用 `win-bg_num-bg`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 再生：`python3 client/tools/gen_mainline_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对页面脚本里的坐标和文案常量）

### MainlinePage（Mock，三面板）

根 `MainlinePage`。`Bg` 与三个面板同级，铺满 720×1280。代码里深蓝底画在页面根上，换阶段只清 `body`，所以底不放进 `PanelList`。面板自身也是 720×1280、放在 (0, 0)，子节点坐标就是 `place()` 的页面坐标。

| 节点 | 默认 | 对齐 |
|------|------|------|
| `PanelList` | 显示 | `showList()` |
| `PanelBattle` | `_active: false` | `showBattle()` |
| `PanelSettle` | `_active: false` | `showSettlement()` |

#### PanelList

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Title` | (0, 470) | 680×56 | `主线关卡` |
| `Progress` | (0, 410) | 640×36 | `已通关 0 关 · 当前第 1 关 · Lv1` |
| `StageRow_0` … `StageRow_5` | (0, 320 − i×68) | 560×52 | `第N关    挑战/未开启` |
| `Hint` | (0, -130) | 640×34 | `挑战当前关。战斗中可以跳过，撤退算失败` |
| `BtnPush` | (0, -200) | 420×52 | `推到第70关` |
| `PushHint` | (0, -258) | 640×32 | `一关关仍可打。调试按钮连推到第70关，每关金币 +10，不播战报` |
| `BtnBack` | (0, -330) | 240×52 | `返回主城` |

`StageRow_*` 共 6 行，等于 `listStages` 的默认窗口（`WINDOW = 6`）。占位按新号第 1 关：`StageRow_0` 为 `第1关    挑战`（蓝色按钮），`StageRow_1` … `StageRow_5` 为第 2–6 关 `未开启`（同一张按钮图，灰度）。`BtnPush` 的静态文案是规格里的 `推到第70关`；代码 `pushButtonText()` 运行时是 `推关到70（调试）`。`PushHint` 与 `pushHint()` 一致。

#### PanelBattle

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Title` | (0, 470) | 680×56 | `第1关` |
| `Round` | (0, 410) | 640×38 | `准备战斗` |
| `EnemyLabel` | (0, 355) | 680×34 | `敌方` |
| `EnemyRow` | (0, 270) | 660×108 | — |
| `AllyLabel` | (0, 165) | 680×34 | `我方` |
| `AllyRow` | (0, 70) | 660×108 | — |
| `LogBg` | (0, -80) | 660×110 | — |
| `Log` | (0, -80) | 620×96 | 两行战报占位，左对齐 |
| `BtnSkip` | (-140, -230) | 200×52 | `跳过` |
| `BtnRetreat` | (140, -230) | 200×52 | `撤退` |

`EnemyRow` / `AllyRow` 各有 `Unit_0` … `Unit_2`（180×108，x = -220 / 0 / 220）。单位卡上是染色底，加 `Name`、`Hp`、`Bar`。敌方占位 `前锋` / `守卫` / `术士`（120/120），我方占位 `勇者` / `护卫` / `术士`（100/100），与 `battle.ts` 的站位和名字一致。`Log` 占位为 `第1回合 · 我方突进` 与 `第2回合 · 集火前排`。

#### PanelSettle

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Result` | (0, 430) | 680×72 | `胜利` |
| `Sub` | (0, 350) | 640×38 | `第1关 · 通关` |
| `Rewards` | (0, 270) | 640×44 | `金币 +0` |
| `Meta` | (0, 120) | 640×36 | `Lv1 · 下一关 2 · 金币 0 · 钻石 0` |
| `BtnNext` | (0, 10) | 420×64 | `下一关` |
| `BtnList` | (0, -90) | 240×48 | `关卡列表` |
| `BtnBack` | (0, -170) | 240×48 | `返回主城` |

`Sub` 是规格里的静态占位。代码胜利时 `reasonText("clear")` 写出的是 `顺利通关`，接线后由逻辑改字。

### WireMainlinePage（真服只读，页内挑战）

根 `WireMainlinePage`。没有 `Panel*`。对齐 `WireMainlineController.showInfo()`。代码 UI，不接 Prefab Boot。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 360) | 680×56 | `主线（真服只读）` |
| `Now` | (0, 270) | 640×44 | `当前 idx 未同步` |
| `Max` | (0, 220) | 640×44 | `最高 idx 未同步` |
| `Fight` | (0, 170) | 640×40 | `进战 idx 未同步` |
| `Reward` | (0, 100) | 640×72 | `已领首通 真服未同步` |
| `Status` | (0, 40) | 640×40 | `点挑战发 3001` |
| `Note` | (0, -70) | 640×140 | 与 `WIRE_MAINLINE_READONLY_NOTE` 相同（页内挑战发 3001） |
| `BtnChallenge` | (0, -200) | 240×52 | `挑战` |
| `BtnBack` | (0, -280) | 240×48 | `返回` |

`Title` / `Note` 与 `WIRE_MAINLINE_READONLY_TITLE` / `WIRE_MAINLINE_READONLY_NOTE` 相同。`Now` / `Max` 是 `formatWireChapterIdx` 在 idx 还没同步时的句子（`当前 idx` / `最高 idx` + `未同步`）。`Reward` 是 `formatWireChapterReward`：还没收到 3010 写「已领首通 真服未同步」，空包体写「已领首通 已同步空表」。不往主屏再放矩形。

## Bag（P1，未接线）

真服只读页和 Mock 背包页各一份 Prefab。`WireBagPage.ts` 只展示已同步的格子，不使用、不写金币。`BagPage.ts` 是 Mock：点一行再使用。两页没有可以共用的内容根。规格里 Mock 页可以后做，这一份一起带上。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireBagPage | `prefabs/ui/bag/WireBagPage` | **未接** |
| BagPage | `prefabs/ui/bag/BagPage` | **未接** |

- **路径**：已移除/不存在（原 `client/assets/prefabs/ui/bag/WireBagPage.prefab`、`client/assets/prefabs/ui/bag/BagPage.prefab`）。
- **状态**：**未接** Boot、`MainApp`、`WireBagPage.ts`、`BagPage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。`ListHost`、`Rows`、`RowsHost`、`DetailHost`、`Detail` 都放在 (0, 0) 且铺满 720×1280，子节点的 y 就是代码里的页面坐标。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。没有背包专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；详情卡用 `win-bg_block-bg-5` 染成 `(16, 28, 48)`；返回和未选行用 `button_btn-blue-big`；已选行用 `button_btn-orange-big`；使用钮用 `button_btn-green-big`。后续可以再补 backpack 图集，本页不依赖它。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 运行时 `render()` 会拆掉并重建 `rows` / `detail`。Prefab 里的行和详情是编辑器预览，不是代码去克隆的模板。
- 再生：`python3 client/tools/gen_bag_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对页面脚本里的坐标和文案常量）

### WireBagPage（真服只读）

根 `WireBagPage`。对齐 `WireBagController.build()` / `render()`。默认只打开未同步占位，对应 `bagItems == null`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `背包（真服只读）` |
| `Note` | (0, 410) | 640×38 | `只读。不使用，不写金币` |
| `ListHost` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows/Empty` | (0, 280) | 640×44 | `空背包`（`_active: false`） |
| `ListHost/Rows/Unsynced` | (0, 280) | 640×44 | `真服背包未同步`（默认显示） |
| `ListHost/Rows/Row_0` … `Row_10` | (0, 340 − i×44) | 640×38 | `类型 1 · id 1001 ×1` 起，左对齐，`_active: false` |
| `ListHost/Rows/More` | (0, -144) | 640×36 | `还有 3 件`（`_active: false`） |
| `BtnBack` | (0, -460) | 240×48 | `返回` |

这份 Prefab 仍是未验收的预览，不接 `USE_*`。运行时 `WireBagPage.ts` 已经改成和后面的只读页一样：标题下写无写库和禁发号，行上写 `item_id` / `item_type` / `num`，未同步文案是 `真服未同步`。Prefab 里的旧文案（`只读。不使用，不写金币`、`真服背包未同步`、`类型 T · id N ×数量`）先留着，验收前不删。

### BagPage（Mock）

根 `BagPage`。对齐 `BagController` 的列表和详情。短列表样例 3 行，`detailAnchor()` 停在 -40，所以详情卡在 (0, -60)。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `背包` |
| `Count` | (0, 418) | 640×36 | `3 种道具 · 点一项再使用` |
| `RowsHost` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_0` | (0, 350) | 640×46 | `已选 小金币袋 ×10 · 可使用` |
| `RowsHost/Rows/Row_1` | (0, 298) | 640×46 | `经验药水 ×2 · 可使用` |
| `RowsHost/Rows/Row_2` | (0, 246) | 640×46 | `许愿符 ×1 · 材料` |
| `DetailHost` | (0, 0) | 720×1280 | 容器 |
| `DetailHost/Detail` | (0, 0) | 720×1280 | 容器 |
| `DetailHost/Detail/Card` | (0, -60) | 640×150 | — |
| `DetailHost/Detail/Name` | (0, -24) | 600×42 | `小金币袋 ×10` |
| `DetailHost/Detail/Desc` | (0, -68) | 600×48 | `使用后获得 50 金币` |
| `DetailHost/Detail/BtnUse` | (0, -170) | 420×56 | `使用` |
| `BtnBack` | (0, -430) | 240×48 | `返回` |

行文案是 `bagRowText`（名字、数量、`可使用` / `材料`）。`Row_0` 带代码里的 `已选 ` 前缀，底图用橙色按钮，对应 `SELECT_FILL`。其余行用蓝色按钮。名字用目录里的 `小金币袋`，不是缩短的「金币袋」。数量 ×10 是预览占位，不是新号初始持有。`Count` 在 `list()` 返回前代码写的是 `读取背包…`；预制展示的是已经读到 3 行之后的句子。`Name` 是 `名字 ×数量`。`Desc` 顶对齐、可换行。`BtnUse` 因为这一行可用，文案是 `使用`（`useButtonText(true)`）；不可使用时代码会写成 `不可使用`。列表变长时 `detailAnchor()` 会把详情往下放到不盖住格子的位置，最低 -210。这份预制只放 3 行短列表。

## Mail（未接线）

真服只读页和 Mock 邮件页各一份 Prefab。`WireMailPage.ts` 只展示已同步的标题和有无附件，不领取、不删除、不写金币。`MailPage.ts` 是 Mock：列表加详情（领取 / 全部领取 / 删除）。两页没有可以共用的内容根。规格里 Mock 页可以后做，这一份一起带上。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireMailPage | `prefabs/ui/mail/WireMailPage` | **未接** |
| MailPage | `prefabs/ui/mail/MailPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/mail/WireMailPage.prefab`、`client/assets/prefabs/ui/mail/MailPage.prefab`
- **状态**：**未接** Boot、`MainApp`、`WireMailPage.ts`、`MailPage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。`ListHost`、`Rows`、`RowsHost`、`DetailHost`、`Detail` 都放在 (0, 0) 且铺满 720×1280，子节点的 y 就是代码里的页面坐标。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。没有邮件专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；详情卡用 `win-bg_block-bg-5` 染成 `(16, 28, 48)`；返回和未选行用 `button_btn-blue-big`；已选行用 `button_btn-orange-big`；领取钮用 `button_btn-green-big`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 运行时 `render()` 会拆掉并重建 `rows` / `detail`。Prefab 里的行和详情是编辑器预览，不是代码去克隆的模板。代码里的容器名是小写 `list-host` / `rows` / `rows-host` / `detail-host` / `detail`；预制用下面表里的 PascalCase，方便在编辑器里对位置。
- 再生：`python3 client/tools/gen_mail_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对页面脚本和 `wireMail.ts` / `inbox.ts` 里的坐标和文案）

### WireMailPage（真服只读）

根 `WireMailPage`。对齐 `WireMailController.build()` / `render()` 和 `wireMail.ts` 的常量。默认只打开未同步占位，对应 `mailEntries == null`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `邮件（真服只读）` |
| `Note` | (0, 420) | 640×38 | `只读。不领取，不删除，不写金币` |
| `Status` | (0, 380) | 640×36 | `已读未读未解。字段 3、字段 4 只记日志` |
| `ListHost` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows/Empty` | (0, 280) | 640×44 | `空邮箱`（`_active: false`） |
| `ListHost/Rows/Unsynced` | (0, 280) | 640×44 | `真服邮件未同步`（默认显示） |
| `ListHost/Rows/Row_0` … `Row_9` | (0, 320 − i×44) | 640×38 | `Hadiah Reservasi Peristiwa · 有附件`，左对齐，`_active: false` |
| `ListHost/Rows/More` | (0, -120) | 640×36 | `还有 3 封`（`_active: false`） |
| `BtnBack` | (0, -460) | 240×48 | `返回` |

`Title` / `Note` / `Status` / `Empty` / `Unsynced` 与 `WIRE_MAIL_READONLY_TITLE` / `WIRE_MAIL_READONLY_NOTE` / `WIRE_MAIL_STATUS_NOTE` / `WIRE_MAIL_EMPTY` / `WIRE_MAIL_UNSYNCED_TOAST` 相同。行文案是 `formatWireMailLine`：有标题时 `标题 · 有附件|无附件|附件未解`，没有标题时 `无标题 · id N · …` 或 `无标题 · …`。十行预览都用日志样本标题加上 ` · 有附件`。`Row_i` 共 10 行（`VISIBLE_ROWS`）。节点锚点在中心、放在 x=0，Label 水平对齐为左，宽 640，和 `align: "left"` 一致。`More` 的 y 是 `320 − 10×44`。运行时溢出文案是 `还有 N 封`；预制里的 `还有 3 封` 只是占位。`Empty` 与 `Unsynced` 同一位置，默认只显示未同步，避免和空邮箱叠字。

### MailPage（Mock）

根 `MailPage`。对齐 `MailController` 的列表和详情。短列表样例 2 封（选中的开服补给 + 已读的维护公告），`detailAnchor()` = `298 − 120 = 178`，所以详情按这个锚点摆。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `邮件` |
| `Summary` | (0, 418) | 640×36 | `2 封 · 未读 1 · 可领 1` |
| `RowsHost` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_0` | (0, 350) | 640×46 | `已选 未读 · 开服补给 · 有附件` |
| `RowsHost/Rows/Row_1` | (0, 298) | 640×46 | `已读 · 维护公告` |
| `DetailHost` | (0, 0) | 720×1280 | 容器 |
| `DetailHost/Detail` | (0, 0) | 720×1280 | 容器 |
| `DetailHost/Detail/Card` | (0, 162) | 640×168 | — |
| `DetailHost/Detail/FromTitle` | (0, 214) | 600×38 | `系统 · 开服补给` |
| `DetailHost/Detail/Body` | (0, 170) | 600×64 | 开服补给正文，左对齐、顶对齐 |
| `DetailHost/Detail/Attach` | (0, 108) | 600×40 | `附件：金币 ×80、强化石 ×3、小金币袋 ×1` |
| `DetailHost/Detail/BtnClaim` | (-160, 10) | 280×52 | `领取` |
| `DetailHost/Detail/BtnClaimAll` | (160, 10) | 280×52 | `全部领取（1）` |
| `DetailHost/Detail/BtnDelete` | (-160, -54) | 280×48 | `删除` |
| `BtnBack` | (0, -430) | 240×48 | `返回` |

行文案是 `mailRowText`（未读/已读、标题、有附件时才加后缀），再加代码里的 `已选 ` 前缀。行上没有发件人。`Row_0` 底图用橙色按钮，对应 `SELECT_FILL`。`Row_1` 用蓝色按钮。无附件不加后缀，所以维护公告只到标题。`Summary` 是 `mailSummaryText(2, 1, 1)`。`list()` 返回前代码写的是 `读取邮件…`；预制展示的是已经读到这 2 封之后的句子。`FromTitle` 是 `from + " · " + title`。正文是 `starterMails` 里开服补给那一段，左对齐。附件是 `attachmentText`：金币 ×80（`MAIL_REWARD_GOLD`）、强化石 ×3（`IDLE_ITEM_NAME` / `MAIL_REWARD_STONE`）、小金币袋 ×1（`MAIL_REWARD_GOLD_BAG`）。`BtnClaim` 因为这封可领，文案是 `领取`（`claimButtonText`），绿色按钮。`BtnClaimAll` 是 `claimAllButtonText(1)`，全角括号，也是绿色。`BtnDelete` 在附件还没领时不能删，贴蓝色按钮并染成 `LOCKED_FILL` `(78, 84, 98)`，同时开灰度。列表变长时 `detailAnchor()` 会把详情往下放到不盖住最后一行的位置，最低 -140。这份预制只放 2 行短列表。默认这些预览节点都是显示的；没有单独的空邮箱占位。

## Hero（未接线）

真服只读页和 Mock 英雄页各一份 Prefab。`HeroPage.ts` 是 Mock：列表加详情。`WireHeroPage.ts` 是只读页。两页没有可以共用的内容根。

**Prefab 按 4001 / GResHeroList，不跟 #50 的 s2c 18001 名字方案。** `wireHero.ts` 已是 4001。只读页文案跟 `WIRE_HERO_FIELD_NOTE`、`formatWireHeroLine`、`formatWireHeroDetail`。没有名字字段：类型对不上表就写类型号。详情用中文标签（类型、id、等级、阶段、星级、元素、职业、锁定、战力），不写 `hero_id` / `hero_type` 这种原始键。协议脚本和页面 TS 都不改，所以运行时仍是代码 UI。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireHeroPage | `prefabs/ui/hero/WireHeroPage` | **未接** |
| HeroPage | `prefabs/ui/hero/HeroPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/hero/WireHeroPage.prefab`、`client/assets/prefabs/ui/hero/HeroPage.prefab`
- **状态**：**未接** Boot、`MainApp`、`WireHeroPage.ts`、`HeroPage.ts`，以及任何 `USE_*_PREFAB`。不改协议。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。`ListHost`、`Rows`、`RowsHost`、`Detail`、`PanelList`、`PanelDetail` 都放在 (0, 0) 且铺满 720×1280，子节点的 y 就是代码里的页面坐标。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid（`@f9941`）。Prefab 目录里没有 PNG。页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；详情卡用 `win-bg_block-bg-5` 染成 `(16, 28, 48)`；返回和列表行用 `button_btn-blue-big`；升级钮用 `button_btn-orange-big`。生成器的素材表与背包/邮件相同，也读了 `button_btn-green-big`，本页没有绿色按钮。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 运行时 `render()` 会拆掉并重建 `rows`。Prefab 里的行和详情是编辑器预览，不是代码去克隆的模板。代码里的容器名是小写 `list-host` / `rows` / `rows-host`；预制用下面表里的 PascalCase。
- 再生：`python3 client/tools/gen_hero_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `WireHeroPage.ts` / `HeroPage.ts` 的坐标，以及 `wireHero.ts` 的 4001 常量和 `formatWireHeroLine` / `formatWireHeroDetail`）

### WireHeroPage（真服只读）

根 `WireHeroPage`。坐标对齐 `WireHeroController.build()` / `render()`（`VISIBLE_ROWS = 8`，列表按钮 y=`300 − i×52`，详情行 y=`300 − i×40`）。默认只打开未同步占位，对应 `heroes == null`。列表行和详情容器都是 inactive。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `英雄（真服只读）` |
| `Note` | (0, 420) | 640×38 | `只读。不升级，不写金币` |
| `Status` | (0, 380) | 640×36 | `没有名字。类型对不上就写类型号` |
| `ListHost` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows/Unsynced` | (0, 280) | 640×44 | `真服英雄未同步`（默认显示） |
| `ListHost/Rows/Empty` | (0, 280) | 640×44 | `空名册`（`_active: false`） |
| `ListHost/Rows/Row_0` … `Row_7` | (0, 300 − i×52) | 640×44 | `类型 101 · id 10001 · Lv1 · 3星 · 战力 1200`（蓝底按钮，`_active: false`） |
| `ListHost/Rows/More` | (0, -116) | 640×36 | `还有 2 名`（`_active: false`） |
| `ListHost/Rows/Detail` | (0, 0) | 720×1280 | 详情容器（默认 **inactive**） |
| `Detail/Line_0` … `Line_8` | (0, 300 − i×40) | 640×40 | `类型 101`、`id 10001`、`等级 1`、`阶段 2`、`星级 3`、`元素 1`、`职业 2`、`锁定 0`、`战力 1200`（左对齐） |
| `Detail/BtnBackList` | (0, -84) | 240×48 | `返回列表` |
| `BtnBack` | (0, -460) | 240×48 | `返回` |

`Title` / `Note` / `Status` / `Empty` / `Unsynced` 与 `WIRE_HERO_READONLY_TITLE` / `WIRE_HERO_READONLY_NOTE` / `WIRE_HERO_FIELD_NOTE` / `WIRE_HERO_EMPTY` / `WIRE_HERO_UNSYNCED_TOAST` 相同。行文案是 `formatWireHeroLine` 在没有类型备注时的句子：`类型 101 · id 10001 · Lv1 · 3星 · 战力 1200`。阶段、元素、职业、锁定不进列表行。八行用同一句占位，默认隐藏。详情九行是 `formatWireHeroDetail` 对同一条样本（阶段 2、元素 1、职业 2、锁定 0）的输出，左对齐。`More` 的 y 是 `300 − 8×52`。`BtnBackList` 的 y 是 `300 − 9×40 − 24`（九行详情之下，与 `renderDetail` 的算法一致）。`Detail` 默认 inactive。`Empty` 与 `Unsynced` 同一位置，默认只显示未同步。

### HeroPage（Mock）

根 `HeroPage`。代码是两页（`HeroListPage` / `HeroDetailPage`），预制用双面板，习惯同 Mainline：`Bg` 与面板同级，面板自身 720×1280、放在 (0, 0)。`PanelList` 默认显示，对齐 `HeroListController`。`PanelDetail` 默认 `_active: false`，对齐 `HeroDetailController`。升级钮留在树上，`clickEvents` 为空，不接线。

#### PanelList

三行是 `growth.ts` 的 `starterRoster()`。行文案是 `heroRowText` 再加 ` · 武器Lv` 和 `weaponLevel`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Title` | (0, 470) | 680×56 | `英雄` |
| `Count` | (0, 410) | 640×36 | `3 名英雄 · 点名字查看详情` |
| `RowsHost` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_0` | (0, 300) | 600×76 | `光耀骑士  Lv1 · 3星 · 武器Lv1` |
| `RowsHost/Rows/Row_1` | (0, 200) | 600×76 | `林间游侠  Lv1 · 2星 · 武器Lv1` |
| `RowsHost/Rows/Row_2` | (0, 100) | 600×76 | `星辉法师  Lv1 · 1星 · 武器Lv1` |
| `BtnBack` | (0, -420) | 240×48 | `返回` |

`Count` 在 `list()` 返回前代码写的是 `读取英雄…`；预制展示的是已经读到 3 名之后的句子。行 y 是 `300 − i×100`，蓝底按钮。名字和 `Lv` 之间是两个空格，与 `heroRowText` 一致。

#### PanelDetail

第一名起步英雄。属性是 `heroStats(1, 3)` 再加武器加成。Lv1 新手短剑加成为 0，所以攻击 70、生命 320、防御 20。`Level` 是 `heroLevelText`。`Weapon` 是 `weaponLineText`。`Gold` 是 `ownedGoldText(MOCK_STARTER_GOLD)`。升级钮是 `upgradeButtonText(1)`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Title` | (0, 470) | 680×56 | `英雄详情` |
| `Name` | (0, 390) | 640×52 | `光耀骑士` |
| `Level` | (0, 330) | 640×40 | `Lv1 · 3星` |
| `Card` | (0, 170) | 640×220 | — |
| `Atk` | (0, 230) | 560×42 | `攻击 70` |
| `Hp` | (0, 170) | 560×42 | `生命 320` |
| `Def` | (0, 120) | 560×42 | `防御 20` |
| `Weapon` | (0, 70) | 560×38 | `武器 新手短剑 Lv1 · 攻击 +0` |
| `Gold` | (0, 0) | 640×38 | `持有金币 100` |
| `BtnUpgrade` | (0, -80) | 460×68 | `升级（金币 30）`（橙） |
| `Hint` | (0, -160) | 640×34 | `属性为占位。升级不改武器，武器到铁匠铺强化` |
| `BtnBack` | (0, -250) | 240×48 | `返回` |

## Idle（未接线）

真服挂机页和 Mock 挂机页各一份 Prefab。`WireIdlePage.ts` 只展示 s2c 3004 的时间，领取只发空的 c2s 3005，不写金币。`IdlePage.ts` 是 Mock：领取、快速作战、推关。两页没有可以共用的内容根。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireIdlePage | `prefabs/ui/idle/WireIdlePage` | **未接** |
| IdlePage | `prefabs/ui/idle/IdlePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/idle/WireIdlePage.prefab`、`client/assets/prefabs/ui/idle/IdlePage.prefab`
- **状态**：**未接** Boot、`MainApp`、`WireIdlePage.ts`、`IdlePage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。没有挂机专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；详情卡用 `win-bg_block-bg-5` 染成 `(16, 28, 48)`；返回和快速作战用 `button_btn-blue-big`；领取用 `button_btn-orange-big`；推关调试用 `button_btn-green-big`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 再生：`python3 client/tools/gen_idle_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对页面脚本、`wireIdle.ts`、`rewards.ts` 里的坐标和文案）

### WireIdlePage（真服 3004 / 3005）

根 `WireIdlePage`。对齐 `WireIdleController.build()`。默认文案是还没同步到 3004 时间时的句子，和打开后第一次 `formatWireIdle` 一致。没有快速作战，没有推关。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `挂机` |
| `Last` | (0, 400) | 640×36 | `上次领取 未同步` |
| `Duration` | (0, 340) | 640×44 | `已挂机 未同步` |
| `Status` | (0, 285) | 640×34 | `时长只按 3004 的时间推。不按 Mock 的每分钟金币计算` |
| `Card` | (0, 150) | 640×180 | — |
| `PreviewTitle` | (0, 210) | 680×34 | `当前可领` |
| `Preview` | (0, 150) | 600×80 | `这一包没有奖励清单。不写金币，不写强化石` |
| `Cap` | (0, 80) | 600×34 | `最大挂机 未同步` |
| `BtnClaim` | (0, -40) | 420×64 | `领取` |
| `Hint` | (0, -140) | 640×64 | `领取只发空的 3005 并记下回包。没有奖励清单，不改金币。快速作战仍是 Mock，这一页不放` |
| `BtnBack` | (0, -230) | 240×48 | `返回` |

`Last` / `Duration` / `Cap` 与 `formatWireIdle` 在 `rewardTime`、`maxRewardTime` 都缺时的句子相同。`Preview` 是 `formatWireIdle` 固定的 `preview`，顶对齐。`Status` 是未封顶那句；封顶后代码写成 `已达上限。奖励清单仍不在这包里`。`Hint` 顶对齐，可换行。`BtnClaim` 用橙色按钮，`BtnBack` 用蓝色按钮。

### IdlePage（Mock）

根 `IdlePage`。坐标对齐 `IdleController.build()`。文案是新号查询回来之后 `render()` 写出的句子：已通关 0、已挂机 0、持有 0、当前第 1 关。`build()` 在查询返回前写的是 `读取进度…`、`已挂机 --:--:-- / 08:00:00`、`金币 +0`、`IDLE_ITEM_NAME + " +0"`，状态、上限和持有是空串。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `挂机` |
| `Progress` | (0, 415) | 640×36 | `已通关 0 关 · 当前第 1 关` |
| `Duration` | (0, 360) | 640×44 | `已挂机 00:00:00 / 08:00:00` |
| `Status` | (0, 315) | 640×34 | `未到上限。整段时长按当前已通关关数计算` |
| `Card` | (0, 150) | 640×250 | — |
| `PreviewTitle` | (0, 245) | 680×34 | `当前可领` |
| `Gold` | (0, 195) | 600×42 | `金币 +0（每分钟 6）` |
| `Item` | (0, 145) | 600×42 | `强化石 +0（每 30 秒 1 个）` |
| `Cap` | (0, 90) | 600×34 | `挂满 8 小时约可领 金币 2880、强化石 960` |
| `Owned` | (0, -10) | 640×34 | `已有强化石 0（可在背包查看）` |
| `BtnClaim` | (0, -80) | 420×64 | `领取` |
| `BtnQuick` | (0, -165) | 420×64 | `快速作战 · 第1关` |
| `BtnPush` | (0, -245) | 420×52 | `推关到70（调试）` |
| `Hint` | (0, -310) | 640×32 | `快速作战结算当前关。调试按钮连推到第70关，每关金币相同，不播战报` |
| `BtnBack` | (0, -375) | 240×48 | `返回` |

`Gold` 用 `goldPerMin(0)`，未通关是 6。`Item` 的名字是 `IDLE_ITEM_NAME`（`强化石`），后面的间隔是 `formatItemEvery(30000)`（`每 30 秒 1 个`）。`Cap` 是 `capPreviewLine(2880, 960)`，也就是未通关挂满 8 小时的那句。`Owned` 是 `已有` + 道具名 + ` 0（可在背包查看）`。`BtnQuick` 是 `quickLabel(1)`；`QUICK_BATTLE_COUNT` 为 1 时不带「起 N 关」。`BtnPush` 是 `pushButtonText()`，字号 22。`BtnClaim` 橙色，`BtnQuick` 和 `BtnBack` 蓝色，`BtnPush` 绿色（代码填充是 `DEBUG_FILL`，素材里没有紫色按钮）。封顶后 `Status` 会写成 `已达 8 小时上限，请领取`。

## Summon（未接线）

只有 Mock 召唤页一份 Prefab。仓内没有 `WireSummonPage`，也没有真服只读入口，所以这一波不写 Wire。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| SummonPage | `prefabs/ui/summon/SummonPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/summon/SummonPage.prefab`
- **状态**：**未接** Boot、`MainApp`、`SummonPage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。代码把标题等挂在 `body` 下、底画在页面根上。Prefab 习惯同 Idle：`Bg` 与内容节点同级，子节点坐标即页面坐标。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。没有召唤专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；结果底用 `win-bg_block-bg-5` 染成 `(16, 28, 48)`；单抽用 `button_btn-orange-big`；返回用 `button_btn-blue-big`。没有紫色按钮图，十连用 `button_btn-blue-big` 再染 `TEN_FILL` `(120, 72, 168)`。生成器也读了 `button_btn-green-big`，本页没有绿色按钮。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 文案节点的高是 `createLabel` 的默认（字号 + 16），宽是传入值，没传则是 680。`Result` 例外，代码写了高 270。
- 再生：`python3 client/tools/gen_summon_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `SummonPage.ts` 的坐标和 `pull.ts` 的 `singleButtonText` / `tenButtonText` / `ownedDiamondText` / `summonResultText([])`）

### SummonPage（Mock）

根 `SummonPage`。对齐 `SummonController.build()`。默认是空结果态。钻石是规格里的占位 `持有钻石 0`，运行时由 `ownedDiamondText(host.diamond())` 覆盖。Mock 新号钱包是 `MOCK_STARTER_DIAMOND`（20），那一数不写进预制。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 470) | 680×56 | `召唤` |
| `Hint` | (0, 410) | 640×36 | `单抽 10 钻石，十连 90 钻石。重复英雄转为碎片` |
| `Diamond` | (0, 350) | 640×40 | `持有钻石 0` |
| `BtnSingle` | (0, 260) | 460×68 | `召唤一次（钻石 10）` |
| `BtnTen` | (0, 170) | 460×68 | `召唤十次（钻石 90）` |
| `ResultTitle` | (0, 90) | 680×38 | `本次结果` |
| `ResultCard` | (0, -90) | 640×300 | — |
| `Result` | (0, -90) | 600×270 | `还没有召唤。新英雄会进入英雄列表` |
| `Footer` | (0, -280) | 640×34 | `新英雄出现在底栏「英雄」。碎片可在背包查看` |
| `BtnBack` | (0, -360) | 240×48 | `返回` |

`Title` 字号 40，颜色 `TITLE` `(255, 228, 170)`。`Hint` 字号 20，颜色 `MUTED`。`Diamond` 字号 24，颜色 `TITLE`，句子是 `ownedDiamondText(0)`。`BtnSingle` 是 `singleButtonText()`（`SUMMON_SINGLE_COST = 10`），橙色按钮，不另染色。`BtnTen` 是 `tenButtonText()`（`SUMMON_TEN_COST = 90`），蓝底再染 `TEN_FILL`。`ResultTitle` 字号 22，代码没传宽，所以是默认 680，高是 22 + 16。`ResultCard` 对应代码里的 `result-bg`。`Result` 是 `summonResultText([])`，左对齐、顶对齐、可换行，颜色 `RESULT` `(214, 224, 236)`。`Footer` 字号 18，颜色 `MUTED`。`BtnBack` 蓝色按钮。三个按钮的 `clickEvents` 都是空的。

## Shop（未接线）

只有 Mock 商店页。仓内没有 `WireShopPage`，本波不做真服只读 Prefab。`ShopPage.ts` 的 `ShopController` 画出限购货架：开服天、钱包、三行 SKU、购买结果和返回。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| ShopPage | `prefabs/ui/shop/ShopPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/shop/ShopPage.prefab`
- **状态**：**未接** Boot、`MainApp`、`ShopPage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` / `render()` 一致）。`RowsHost`、`Rows`、`Row_0`、`Row_1`、`Row_2` 都放在 (0, 0) 且铺满 720×1280，所以 `Line` 和 `BtnBuy` 的 y 就是页面坐标。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。页面底用 `win-bg_win-bg-12` 染成暖棕 `(22, 16, 10)`（`PAGE_BG`），不是挂机或邮件那种深蓝 `(8, 16, 32)`。购买钮用 `button_btn-orange-big`，对应 `BUY_FILL` `(168, 112, 36)`。返回用 `button_btn-blue-big`，对应 `BACK_FILL` `(36, 72, 120)`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 代码把底画在页面根上，其余放进 `body`，`render()` 会拆掉并重建 `rows`。Prefab 里 `Bg` 与内容同级，不放 `body`。三行是编辑器预览，不是代码去克隆的模板。代码容器名是小写 `rows-host` / `rows`；预制用下面表里的 PascalCase。
- 再生：`python3 client/tools/gen_shop_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `ShopPage.ts`、`catalog.ts`、`rewards.ts` 的 `IDLE_ITEM_NAME`，以及 `MockGameSession.ts` 的起步金币和钻石）

### ShopPage（Mock）

根 `ShopPage`。对齐 `ShopController` 构造和 `render()`。默认态是已经读到开服第 1 天、三件都没买、背包持有按干净货架写成 0。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 暖棕 `(22, 16, 10)` |
| `Title` | (0, 460) | 680×56 | `基础商店` |
| `Hint` | (0, 408) | 640×34 | `新号可买。召唤仍直接花钻石` |
| `Refresh` | (0, 352) | 640×38 | `限购随开服天刷新 · 当前开服第 1 天` |
| `Wallet` | (0, 308) | 640×38 | `持有金币 100 · 钻石 20` |
| `RowsHost` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_0` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_0/Line` | (0, 210) | 640×36 | `强化石 ×5 · 金币 40 · 今日 0/3 · 背包 ×0` |
| `RowsHost/Rows/Row_0/BtnBuy` | (0, 162) | 280×48 | `购买` |
| `RowsHost/Rows/Row_1` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_1/Line` | (0, 90) | 640×36 | `小金币袋 ×1 · 钻石 8 · 今日 0/2 · 背包 ×0` |
| `RowsHost/Rows/Row_1/BtnBuy` | (0, 42) | 280×48 | `购买` |
| `RowsHost/Rows/Row_2` | (0, 0) | 720×1280 | 容器 |
| `RowsHost/Rows/Row_2/Line` | (0, -30) | 640×36 | `经验药水 ×1 · 金币 50 · 今日 0/2 · 背包 ×0` |
| `RowsHost/Rows/Row_2/BtnBuy` | (0, -78) | 280×48 | `购买` |
| `Result` | (0, -250) | 640×56 | `点购买。金币或钻石不够、今日卖完都会提示` |
| `BtnBack` | (0, -330) | 240×48 | `返回` |

`Refresh` 是 `shopRefreshLine(1)`。`view()` 返回前代码写的是 `读取中…`；预制展示的是已经读到开服第 1 天之后的句子。`Wallet` 是 `shopWalletLine(MOCK_STARTER_GOLD, MOCK_STARTER_DIAMOND)`。仓内这两个常量是 `100` 和 `20`，所以句子是 `持有金币 100 · 钻石 20`。打开时代码先放空字符串，预制不留那一帧。

三行来自 `SHOP_OFFERS`，名字以仓内为准：强化石是 `IDLE_ITEM_NAME`（`强化石`），另外两件是目录里的 `小金币袋`、`经验药水`。数量和价格是 `SHOP_STONE_COUNT` 5、`SHOP_STONE_PRICE` 40、限购 3；小金币袋 ×1、`SHOP_BAG_PRICE` 8 钻、限购 2；经验药水 ×1、`SHOP_POTION_PRICE` 50 金、限购 2。行文案是 `shopSkuLine`，钮文案是 `shopBuyButton`。未售罄是 `购买`。`top = 210`，`step = 120`，按钮在该行 `y - 48`。

背包 ×0 是这份干净预览（已购 0、持有 0）。Mock 新号 `grantStarterItems()` 会另发小金币袋 ×2（`STARTER_GOLD_BAG`）和经验药水 ×2（`STARTER_EXP_POTION`），强化石起步仍是 0。预制不把那两份起步消耗品写进货架行。

`Result` 是构造时的 `lastReport`。它指定了高度 56，所以纵向顶对齐。购买钮字号是调用里的 22，橙色按钮底。返回没传字号，走 `createButton` 默认 24，蓝色按钮底。售罄时代码会把钮写成 `已售罄` 并改用 `SOLD_FILL` `(78, 84, 98)`；默认三行都可买，不另放第四行。空货架的 `商店暂时没有商品` 也不放进这份预制。

## BuyGold / 点金（未接线）

只有真服只读页一份 Prefab。对齐 `WireActivityPage.ts` 的 `WireActivityController.build()` / `render()`，以及 `wireActivity.ts` 的 s2c **17000** / `GResBuyGoldLog`（`WIRE_ACTIVITY_CMD = "wire.17000"`）。点金只读：不点金，不写金币。仓内没有独立的 Mock 点金页。`DailyGoldPage.ts` 是日常金币副本，不是这一页，不要混。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireBuyGoldPage | `prefabs/ui/buygold/WireBuyGoldPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/buygold/WireBuyGoldPage.prefab`（目录 `buygold/`）
- **状态**：**未接** Boot、`MainApp`、`WireActivityPage.ts`，以及任何 `USE_*_PREFAB`。不改协议。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` / `render()` 一致）。`ListHost`、`Rows` 都放在 (0, 0) 且铺满 720×1280，子节点的 y 就是代码里的页面坐标。
- 代码根节点名是 `WireActivityPage`，容器是小写 `list-host` / `rows`。预制根叫 `WireBuyGoldPage`，容器用下面表里的 PascalCase，方便在编辑器里对位置。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid（`@f9941`）。Prefab 目录里没有 PNG。没有点金专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；返回用 `button_btn-blue-big`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 运行时 `render()` 会拆掉并重建 `rows`。Prefab 里的 Stamp、空表、行和溢出是编辑器预览，不是代码去克隆的模板。
- 再生：`python3 client/tools/gen_buygold_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `WireActivityPage.ts` 的坐标和 `wireActivity.ts` 的文案、`formatWireActivityLine`、`formatWireActivityStamp`）

### WireBuyGoldPage（真服只读，17000）

根 `WireBuyGoldPage`。`VISIBLE_ROWS = 10`。默认是未同步占位，对应 `WireSession.activity == null`：只显示 `Unsynced`，Stamp、空表、十行和溢出都是 `_active: false`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 深蓝 `(8, 16, 32)` |
| `Title` | (0, 470) | 680×56 | `点金（真服只读）` |
| `Note` | (0, 420) | 640×38 | `只读。不点金，不写金币` |
| `Status` | (0, 380) | 640×36 | `status、time 写原数。行上写 idx / num` |
| `ListHost` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows/Unsynced` | (0, 280) | 640×44 | `真服未同步`（默认显示） |
| `ListHost/Rows/Stamp` | (0, 320) | 640×38 | `status=1 / time=无`（`_active: false`） |
| `ListHost/Rows/Empty` | (0, 320) | 640×44 | `已同步空表`（`_active: false`） |
| `ListHost/Rows/Row_0` … `Row_9` | (0, 320 − i×44) | 640×38 | `idx=1 / num=0` 起，左对齐，`_active: false` |
| `ListHost/Rows/More` | (0, -120) | 640×36 | `还有 2 条`（`_active: false`） |
| `BtnBack` | (0, -460) | 240×48 | `返回`（蓝） |

`Title` / `Note` / `Status` / `Empty` / `Unsynced` 与 `WIRE_ACTIVITY_READONLY_TITLE` / `WIRE_ACTIVITY_READONLY_NOTE` / `WIRE_ACTIVITY_FIELD_NOTE` / `WIRE_ACTIVITY_EMPTY` / `WIRE_ACTIVITY_UNSYNCED_TOAST` 相同。`Stamp` 是 `formatWireActivityStamp` 在 status 为 1、time 缺失时的句子（`time` 写成 `无`，不补 0）。行文案是 `formatWireActivityLine`。日志三例是 idx 1 / 2 / 3、num 都是 0，所以 `Row_0` … `Row_2` 为 `idx=1 / num=0`、`idx=2 / num=0`、`idx=3 / num=0`。后面七行按同一句式续到 `idx=10 / num=0`，把 `VISIBLE_ROWS` 的窗口填满。节点锚点在中心、放在 x=0，行 Label 水平对齐为左，宽 640，和 `align: "left"` 一致。

没有 stamp 时 `render()` 的 `top` 是 320，行在 `320 − i×44`，空表也在 320。这份预制按这个坐标摆 `Row_*`、`Empty` 和 `More`（`More` 的 y 是 `320 − 10×44 = -120`）。已同步而且 `formatWireActivityStamp` 有字时，Stamp 占 y=320，然后 `top -= 44`，空表和行从 276 起，每行仍隔 44。运行时溢出文案是 `还有 N 条`；预制里的 `还有 2 条` 只是占位。`BtnBack` 用蓝色按钮，字号走 `createButton` 默认 24。

## Achievement / 成就（未接线）

只有真服只读页一份 Prefab。对齐 `WireAchievementPage.ts` 的 `WireAchievementController.build()` / `render()`，以及 `wireAchievement.ts` 的 s2c **12010** / `GResAchievementList`（`WIRE_ACHIEVEMENT_CMD = "wire.12010"`）。成就只读：不领奖，不改 state，不写金币。仓内没有 Mock 成就页，这一份不另造。

打开或同步会在服上懒建未接取的首链成就。页上必须带着侧效提示 `WIRE_ACHIEVEMENT_SIDE_EFFECT`（`打开/同步可能在服上补成就`），节点 `SideEffect`，默认显示。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireAchievementPage | `prefabs/ui/achievement/WireAchievementPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/achievement/WireAchievementPage.prefab`（目录 `achievement/`）
- **状态**：**未接** Boot、`MainApp`、`WireAchievementPage.ts`，以及任何 `USE_*_PREFAB`。不改协议。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` / `render()` 一致）。`ListHost`、`Rows` 都放在 (0, 0) 且铺满 720×1280，子节点的 y 就是代码里的页面坐标。
- 代码根节点名是 `WireAchievementPage`，容器是小写 `list-host` / `rows`。预制根同名，容器用下面表里的 PascalCase，方便在编辑器里对位置。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid（`@f9941`）。Prefab 目录里没有 PNG。没有成就专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；返回用 `button_btn-blue-big`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 运行时 `render()` 会拆掉并重建 `rows`。Prefab 里的空表、行和溢出是编辑器预览，不是代码去克隆的模板。`SideEffect`、`Title`、`Note`、`FieldNote` 是 `build()` 层，不随列表隐藏。
- 再生：`python3 client/tools/gen_achievement_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `WireAchievementPage.ts` 的坐标和 `wireAchievement.ts` 的文案、`formatWireAchievementLine`）

### WireAchievementPage（真服只读，12010）

根 `WireAchievementPage`。`VISIBLE_ROWS = 22`。默认是未同步占位，对应 `WireSession.achievements == null`：只显示 `Unsynced`，空表、二十二行和溢出都是 `_active: false`。`SideEffect` 始终显示。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 深蓝 `(8, 16, 32)` |
| `Title` | (0, 520) | 680×48 | `成就记录（真服只读）` |
| `SideEffect` | (0, 470) | 640×36 | `打开/同步可能在服上补成就`（默认显示，TITLE 色） |
| `Note` | (0, 430) | 640×32 | `只读。不领奖，不改 state，不写金币` |
| `FieldNote` | (0, 396) | 640×28 | `idx 任务号，process 进度，state 即 hadReward` |
| `ListHost` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows/Unsynced` | (0, 320) | 640×44 | `真服未同步`（默认显示） |
| `ListHost/Rows/Empty` | (0, 320) | 640×44 | `空成就表`（`_active: false`） |
| `ListHost/Rows/Row_0` … `Row_21` | (0, 340 − i×28) | 640×26 | `idx=1 / process=0 / state=0` 起，左对齐，`_active: false` |
| `ListHost/Rows/More` | (0, -276) | 640×28 | `还有 3 条`（`_active: false`） |
| `BtnBack` | (0, -520) | 240×48 | `返回`（蓝） |

`Title` / `SideEffect` / `Note` / `FieldNote` / `Empty` / `Unsynced` 与 `WIRE_ACHIEVEMENT_READONLY_TITLE` / `WIRE_ACHIEVEMENT_SIDE_EFFECT` / `WIRE_ACHIEVEMENT_READONLY_NOTE` / `WIRE_ACHIEVEMENT_FIELD_NOTE` / `WIRE_ACHIEVEMENT_EMPTY` / `WIRE_ACHIEVEMENT_UNSYNCED_TOAST` 相同。行文案是 `formatWireAchievementLine`。预览从 `idx=1 / process=0 / state=0` 续到 `idx=22 / process=0 / state=0`，把 `VISIBLE_ROWS` 的窗口填满。缺字段时 `numText` 写 `无`，不补 0；这二十二行是有数的样例。节点锚点在中心、放在 x=0，行 Label 水平对齐为左，宽 640，和 `align: "left"` 一致。

未同步时 `render()` 只放 `Unsynced`（y=320）就返回，不画空表和行。已同步且任务表为空时，在同一位置放 `空成就表`。有任务时 `top = 340`、`step = 28`，行在 `340 − i×28`，最多 22 行。`More` 的 y 是 `340 − 22×28 = -276`。运行时溢出文案是 `还有 N 条`；预制里的 `还有 3 条` 只是占位。`BtnBack` 用蓝色按钮，字号走 `createButton` 默认 24。字号：标题 36，侧效 22，说明 20，字段说明 18，未同步和空表 28，行 20，溢出 18。

## Arena / 竞技场（未接线）

只有真服只读页一份 Prefab。对齐 `WirePvpPage.ts` 的 `WirePvpController.build()` / `render()`，以及 `wirePvp.ts` 的 s2c **18001** / `GResPvpData`（`WIRE_PVP_CMD = "wire.18001"`）。竞技场只读：不挑战，不匹配，不扣次，不写积分，不写金币。不接开战 18002，不接刷新 18003。

代码根节点名是 `WirePvpPage`。预制根叫 `WireArenaPage`（manager 点名），目录 `arena/`。`ArenaPage.ts` 是另一份 Mock 挑战页，这一刀不造它的 Prefab，也不改那份脚本。

同步时若对手名单为空，服可能补名单。日切或赛季切时服也可能写库。页上必须带着这两句，默认都显示：

- `SideEffect`：`WIRE_PVP_SIDE_EFFECT`（`同步时若对手为空服可能补名单`），位置 (0, 510)
- `SeasonNote`：`WIRE_PVP_SEASON_NOTE`（`日切或赛季切时服可能写库`），位置 (0, 476)

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WireArenaPage | `prefabs/ui/arena/WireArenaPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/arena/WireArenaPage.prefab`（目录 `arena/`）
- **状态**：**未接** Boot、`MainApp`、`WirePvpPage.ts`，以及任何 `USE_*_PREFAB`。不改协议，不接 18002 / 18003。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` / `render()` 一致）。`ListHost`、`Rows` 都放在 (0, 0) 且铺满 720×1280，子节点的 y 就是代码里的页面坐标。
- 代码根节点名是 `WirePvpPage`，容器是小写 `list-host` / `rows`。预制根是 `WireArenaPage`，容器用下面表里的 PascalCase，方便在编辑器里对位置。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid（`@f9941`）。Prefab 目录里没有 PNG。没有竞技场专用图集：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；返回用 `button_btn-blue-big`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 运行时 `render()` 会拆掉并重建 `rows`。Prefab 里的自身行、空表、对手行和溢出是编辑器预览，不是代码去克隆的模板。`SideEffect`、`SeasonNote`、`Title`、`Note`、`FieldNote` 是 `build()` 层，不随列表隐藏。
- 再生：`python3 client/tools/gen_arena_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `WirePvpPage.ts` 的坐标和 `wirePvp.ts` 的文案、`formatWirePvpSelfLines`、`formatWirePvpLine`）

### WireArenaPage（真服只读，18001）

根 `WireArenaPage`。`VISIBLE_ROWS = 8`。默认是未同步占位，对应 `WireSession.pvp == null`：只显示 `Unsynced`，自身六行、空表、八名对手和溢出都是 `_active: false`。`SideEffect` 和 `SeasonNote` 始终显示。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 深蓝 `(8, 16, 32)` |
| `Title` | (0, 560) | 680×48 | `竞技场（真服只读）` |
| `SideEffect` | (0, 510) | 640×36 | `同步时若对手为空服可能补名单`（默认显示，TITLE 色） |
| `SeasonNote` | (0, 476) | 640×32 | `日切或赛季切时服可能写库`（默认显示，MUTED） |
| `Note` | (0, 442) | 640×32 | `只读。不挑战，不匹配，不扣次，不写积分，不写金币` |
| `FieldNote` | (0, 400) | 640×48 | `free_count、score、season_end_time、like_rids、season_count、season_reward。对手写 player_id、name` |
| `ListHost` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows` | (0, 0) | 720×1280 | 容器 |
| `ListHost/Rows/Unsynced` | (0, 340) | 640×44 | `真服未同步`（默认显示） |
| `ListHost/Rows/Self_0` … `Self_5` | (0, 350 − i×28) | 640×26 | `free_count=无` 起，左对齐，`_active: false` |
| `ListHost/Rows/Empty` | (0, 154) | 640×44 | `空对手表`（`_active: false`） |
| `ListHost/Rows/Opp_0` … `Opp_7` | (0, 174 − i×36) | 640×32 | `样例甲 · player_id=1001` 起，左对齐，`_active: false` |
| `ListHost/Rows/More` | (0, -114) | 640×28 | `还有 1 名`（`_active: false`） |
| `BtnBack` | (0, -560) | 240×48 | `返回`（蓝） |

`Title` / `SideEffect` / `SeasonNote` / `Note` / `FieldNote` / `Empty` / `Unsynced` 与 `WIRE_PVP_READONLY_TITLE` / `WIRE_PVP_SIDE_EFFECT` / `WIRE_PVP_SEASON_NOTE` / `WIRE_PVP_READONLY_NOTE` / `WIRE_PVP_FIELD_NOTE` / `WIRE_PVP_EMPTY` / `WIRE_PVP_UNSYNCED_TOAST` 相同。自身六行是 `formatWirePvpSelfLines` 在字段都缺时的句子（`无`，不补 0）：`free_count=无`、`score=无`、`season_end_time=无`、`like_rids=无`、`season_count=无`、`season_reward=无`。对手行是 `formatWirePvpLine` 的样例，不是真服数据：`样例甲 · player_id=1001` 到 `样例辛 · player_id=1008`。节点锚点在中心、放在 x=0，自身行和对手行的 Label 水平对齐为左，宽 640，和 `align: "left"` 一致。

未同步时 `render()` 只放 `Unsynced`（y=340）就返回，不画自身行。已同步时自身行从 `top = 350` 起，step 28，六行占到 y=210。`listTop = 350 − 6×28 − 8 = 174`。空表在 `listTop − 20 = 154`。对手从 `listTop` 起，step 36，最多 8 行（`Opp_7` 在 y=−78）。`More` 的 y 是 `174 − 8×36 = -114`，落在第 8 行下面。运行时溢出文案是 `还有 N 名`；预制里的 `还有 1 名` 只是占位。`BtnBack` 用蓝色按钮，字号走 `createButton` 默认 24。字号：标题 36，侧效 22，赛季说明 20，只读说明 20，字段说明 18，未同步和空表 28，自身行 22，对手行 18，溢出 18。`FieldNote` 比一行宽，在 48px 高的框里换行。

## Wish / 许愿（未接线）

只有 Mock 低级许愿池一份 Prefab。对齐 `WishPage.ts` 的 `WishController` 构造器，以及 `module/wish/pool.ts` 的 `wishAttemptsLine` / `wishWalletLine` / `wishNextLine` / `wishPoolLine` / `wishPayButton`。仓内没有 `WireWish`，不造真服只读 Prefab，也不改页面脚本。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| WishPage | `prefabs/ui/wish/WishPage` | **未接** |

- **路径**：`client/assets/prefabs/ui/wish/WishPage.prefab`（目录 `wish/`）
- **状态**：**未接** Boot、`MainApp`、`WishPage.ts`，以及任何 `USE_*_PREFAB`。不改协议。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。代码把紫深蓝底画在页面根上，其余放进 `body`。Prefab 里 `Bg` 与内容同级，不放 `body`。子节点坐标就是 `place()` 的页面坐标。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid（`@f9941`）。Prefab 目录里没有 PNG。没有许愿专用图集：页面底用 `win-bg_win-bg-12` 染成 `PAGE_BG` `(18, 16, 36)`。四个按钮都用 `button_btn-blue-big`，再按 `WishPage.ts` 的 fill 染色。没有紫色按钮图，许愿符钮靠 `ITEM_FILL` `(96, 72, 168)` 染出来。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。代码里的按钮是 `createButton` 的 Graphics 色块；预制改成按钮图加 tint，色值仍是那四个 fill。
- 再生：`python3 client/tools/gen_wish_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对 `WishPage.ts` 的坐标、`pool.ts` 的五句文案，以及 `items.ts` 的 `WISH_TOKEN_NAME`）。再跑一次会覆写同一份 Prefab，并保留已有 `.meta` uuid。

### WishPage（Mock 低级许愿池）

根 `WishPage`，与 `uiNode("WishPage")` 一致。默认文案按还没许过的样例：`used = 0`、`limit = WISH_DAILY_LIMIT`（5）、金币 0、钻石 0、许愿符 0、游标 0。这是 `view()` 读到之后 `render()` 会写上的句子，不是构造瞬间的 `读取中…`、空钱包和短按钮（`金币许愿` / `许愿符许愿` / `钻石许愿`）。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 紫深蓝 `(18, 16, 36)` |
| `Title` | (0, 460) | 680×56 | `许愿池 · 低级` |
| `Subtitle` | (0, 408) | 640×32 | `主线 Lv10 开启。每天 5 次，三种方式任选` |
| `Attempts` | (0, 352) | 640×36 | `今日剩余 5/5` |
| `Wallet` | (0, 304) | 640×32 | `持有金币 0 · 钻石 0 · 许愿符 ×0` |
| `Next` | (0, 256) | 640×32 | `下一次：金币 40` |
| `Pool` | (0, 208) | 640×36 | `奖池固定循环 10 次：金币、强化石、经验药水，第 10 次是钻石` |
| `BtnGold` | (0, 120) | 560×56 | `金币许愿（30）`（金 `(168, 112, 36)`） |
| `BtnItem` | (0, 48) | 560×56 | `许愿符许愿（×1）`（紫 `(96, 72, 168)`） |
| `BtnDiamond` | (0, -24) | 560×56 | `钻石许愿（5）`（蓝 `(46, 110, 190)`） |
| `Result` | (0, -120) | 640×72 | `选一种方式许愿一次。次数用完、货币或许愿符不够都会提示` |
| `BtnBack` | (0, -210) | 240×48 | `返回`（`(36, 72, 120)`） |

`Title` 字号 40，颜色 `TITLE` `(220, 196, 255)`。代码没传宽，`createLabel` 默认宽 680、高 40 + 16 = 56，和规格一致。`Subtitle` 字号 18，颜色 `MUTED` `(196, 186, 220)`。`Attempts` 是 `wishAttemptsLine(0, 5)`，字号 26，颜色 `STAT` `(255, 228, 170)`。`Wallet` 是 `wishWalletLine(0, 0, 0)`，字号 22，颜色 `MUTED`。道具名读 `items.ts` 的 `WISH_TOKEN_NAME`（`pool.ts` 从这里引入，当前是 `许愿符`），不是另起的名字。样例钱包是 0，不是 `MOCK_STARTER_GOLD` / `MOCK_STARTER_DIAMOND`，也不把 `STARTER_WISH_TOKEN` 写进去。`Next` 是 `wishNextLine(0)`，字号 22，颜色 `STAT`。游标 0 取 `WISH_DROPS` 首格（金币 40），`wishDropText` 写成 `金币 40`。`Pool` 是 `wishPoolLine()`，字号 18，颜色 `MUTED`。句子里的强化石与 `IDLE_ITEM_NAME` 相同。

`Subtitle` / `Attempts` / `Wallet` / `Next` / `Pool` 的框高是规格表里的 32 / 36 / 32 / 32 / 36。`createLabel` 在没传 height 时会用字号 + 16，那五格没有跟这个默认值。`Result` 例外：代码传了高 72，所以顶对齐、可换行，字号 18，颜色 `MUTED`，宽 640。它是构造时的 `lastReport`。

`BtnGold` / `BtnItem` / `BtnDiamond` 是 `wishPayButton("gold" | "item" | "diamond", 0, 5)`，字号 22。次数还没用完，所以不是 `今日已用完`。金币花费是 `WISH_GOLD_COST` 30，钻石是 `WISH_DIAMOND_COST` 5，许愿符是 `WISH_ITEM_COST` 1，钮上的道具名同样来自 `WISH_TOKEN_NAME`。三钮和 `BtnBack` 的 Sprite 都是 `button_btn-blue-big`，tint 分别是 `GOLD_FILL`、`ITEM_FILL`、`DIAMOND_FILL`、`BACK_FILL`。`BtnBack` 文案是 `返回`，没传字号，走 `createButton` 默认 24。四个按钮的 `clickEvents` 都是空的，子节点只有 `Label`。

## Battle / 战斗表现

主线战斗表现壳和真服接线占位各一份 Prefab。节点约定、坐标和实际引用的图见 [`battle-prefab-layout.md`](battle-prefab-layout.md)。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| BattlePage | `prefabs/ui/battle/BattlePage` | **已接** 真服进战（`USE_BATTLE_PREFAB`，默认开） |
| WireBattlePage | `prefabs/ui/battle/WireBattlePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/battle/BattlePage.prefab`、`client/assets/prefabs/ui/battle/WireBattlePage.prefab`
- **状态**：BattlePage 挂在 `WireMainlinePage` 的进战回放上，吃已经接好的 3001 / 3030 / 3102（3006 走同一套回放）。同一份回放写 `LayerFloat` 的 `FloatDmg_0`–`3` 和 `FloatCrit`、`SkillNameBanner`、前排 `HeadAnchor`。缺字段藏起，不写成 0，不另建挂点。不改 Boot，不改协议，不删代码 UI。`USE_BATTLE_PREFAB` 在 `BattlePage.ts`，改成 `false` 就回到代码战斗页。WireBattlePage 仍不挂。
- 页面 `Bg` 用 `ui/maps/map-bg-mission-1.jpg`（648×1152，白，简单模式，拉到 720×1280）。**`battle-scene_spr-bg-1` 是 112×64 边角，不是全屏底。** 顶栏有 `BtnSpeed`（`battle-scene_btn-speed-1/2/3`）。血条和技能条用 `battle-scene_prog-bg-1` 和 `battle-scene_prog-1`。`BtnClose` 仍是通用关闭钮。帧清单见 [`battle-ui2-migration.md`](battle-ui2-migration.md)。
- 不挂脚本组件，所以没有壳 `__type__`。以后若加壳，必须是 23 位 packer id，不要退回 22 位。
- 再生：`python3 client/tools/gen_battle_prefab.py`
