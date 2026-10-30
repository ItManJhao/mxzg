# 登录 → 主城 → 主线（P1–P4 Prefab 壳）

冷启动用新的 1:1 Prefab 看登录、主城和主线。原来的代码页、协议探针和 `BattlePage` 都还在。本轮不建 P5 Prefab，不改战斗特效，也不再迁素材。

## 怎么跑

1. 用 Cocos Creator **3.8.8** 打开 `client/`。
2. 打开 `assets/scenes/legacy/Boot.scene`，Canvas 上挂 `Boot`（不要挂到 Camera）。启动场景保持 Boot。
3. 预览。默认连本机桥，不必加 `?transport=ws`（见 `docs/h5-websocket.md`）。Mock 只在 `?dev=mock`。真服探针（关-、请求战报、切磋）只在 `?dev=wire`，这个参数不改传输。浏览器预览刷新后会出现 **ccc-devtools** 节点树面板（`client/preview-template/`，无需 Chrome 插件）。本轮不建 P5。
4. 检查器勾选 `skipLogin` 只在 `?dev=mock` 时跳过登录壳。默认真服仍显示登录面板。

预览后的路径：

1. **NoticeLayer** 先盖在登录上。点「确定」或关闭回到登录。
2. **UserLoginLayer** 是登录屏。账号写在用户条上。点服务器条打开 **ChooseServerLayer**，三台 Mock 服用 **ChooseServerCell**。点「登录」走原来的 Mock / 1001。
3. 右上关闭打开 **LanguageSelectLayer**（只看，不改语言）。登录失败一类状态打开 **ErrorLayer**。
4. 没有角色，或点屏幕下方「创角」，仍进原来的 **CreateRolePanel**（`USE_CREATE_ROLE_PREFAB`）。
5. 进主城后中间是 **CityHub**（`USE_CITY_HUB_PREFAB`）：整屏城景（天空、广场、召唤圆台）和建筑标，顶栏底栏叠在上面。不是中间一块黑。左右拖地图，点建筑。底栏七项是 **主城 / 英雄 / 背包 / 战斗 / 副本 / 公会 / 羁绊**。底栏「战斗」进挂机站场，不是森林战报页。城景贴到屏幕底边，底栏盖在城景上并贴住屏幕底（含 home indicator）。召唤圆台停在底栏上方的空隙里，不跟右侧小圆钮叠在一起。
6. 底栏「战斗」（以及左下 **BtnMainline** /「更多」里的主线）打开挂机站场，不是探针页，也不是一点就进森林 `BattlePage`。站场是 `chapter/hang/map01` 的大理石殿，英雄站好就演武。站场优先 MAIN 阵容（3101 type=0 的 hero_id，经 4001 的 hero_type 对已有皮肤）；阵容是空的才用三套默认。底钮仍是 **BattlePanelLayer**（战力UP / 战斗 / 高速战斗）和收益条。顶栏战力、头像仍是主城壳上的 `hangHud`。「我要变强」打开已有 **HeroSuggestLayer**，「高速战斗」打开已有 **QuickBattleLayer** 并只读 3012（不发 3013）。点中间「战斗」才走原来的挑战：Mock 打当前关并播代码战报；真服发 3001，有战报时才在挂机壳上播（`USE_BATTLE_PREFAB`）。跳过、撤退、播完盖 `BattleEndLayer`，确定回到挂机。仓里没有把殿堂和三钮合成一张的挂机 Prefab，所以不把森林页当成挂机壳。大理石和演武在 BattlePanelLayer 加载之前就铺上，不会先闪出「关- / 请求战报 / 切磋」。
7. 真服路径的壳上没有「功能页」。这颗钮只在 `?dev=wire` 出现，点了才把壳藏起来。挂机壳一直没有这颗钮。真服探针只在地址带 `?dev=wire` 时作为底栏「战斗」打开，或在挂机画面左侧空地长按约 0.7 秒。两种都不把连接改成 Mock。

## 开关

都在代码常量里，默认 `true`。改成 `false` 即退回，不用改场景。

| 常量 | 文件 | 打开时 | 关掉时 |
|------|------|--------|--------|
| `USE_P1_LOGIN_PREFAB` | `Boot.ts` | UserLogin / ChooseServer / Notice / Language / Error | 交给下一行 |
| `USE_LOGIN_PREFAB` | `Boot.ts` | 旧 `LoginPanel.prefab`。P1 加载失败时也会落到这里 | `buildLoginPanel` |
| `USE_CREATE_ROLE_PREFAB` | `Boot.ts` | `CreateRolePanel.prefab` | `buildCreateRolePanel` |
| `USE_CITY_HUB_PREFAB` | `MainApp.ts` | CityHub 地图和建筑 | 代码地图 |
| `USE_CITY_CHROME_PREFAB` | `MainApp.ts` | 顶栏底栏 Prefab | 代码顶底栏 |
| `USE_PAGE_PREFAB_SHELL` | `prefabShellMap.ts` | 下表的 1:1 壳盖在已有页面上 | 只有原来的页面 |
| `USE_BATTLE_PREFAB` | `BattlePage.ts` | 真服回放挂 BattlePage | 代码战斗页。不改 Boot |

`USE_PAGE_PREFAB_SHELL` 不进 Boot。主城开关也不进 Boot。

## 建筑和页面壳

有协议或代码页的，壳盖在那一页上。没有路由的建筑仍是占位页（`cityAtomRoute` 不改），壳只负责能看见。

| 入口 | 页面 | 壳 |
|------|------|----|
| 底栏战斗 / 主线（BtnMainline / 更多） | 挂机站场（`idleHangView` + 演武）。`?dev=wire` 才是真服探针 | 大理石殿立刻铺上，底钮 `battle/BattlePanelLayer`，「战斗」= 原来的挑战。没有「功能页」 |
| 召唤法阵 | 城内建筑，不是底栏 | `summon/SummonLayer` |
| 铁匠铺 | 城内建筑，不是底栏 | `smith/SmithLayer` |
| 英雄 | 底栏英雄 | `hero/HeroListLayer` |
| 更多 → 英雄殿堂 | `heroPalace` | `hero/HeroPalaceLayer` |
| 英雄详情 | `hero-detail` | `hero/HeroInfoLayer` |
| 竞技场 | `arena` | `pvp/PvpLayer` |
| 幻境之塔 | `tower` | `fantasy-tower/FantasyTowerLayer` |
| 背包 | `bag` | `backpack/BackpackLayer` |
| 邮件（底栏邮件 / 更多） | `mail` | `mail/MailLayer` |
| 挂机 | `idle` | `quick-battle/QuickBattleLayer` |
| 成就 | `achieve` | `achievement/AchievementLayer` |
| 世界等级 | `world` | `role/WorldLevelLayer` |
| 宠物 | `pet` | `pet/PetInfoLayer` |
| 咖啡馆 | `cafe` | `main-task/MainTaskLayer` |
| 远古遗迹 | 占位 `main_ancient` | `ancient/AncientLayer` |
| 英雄合成 | 占位 `main_hero_make` | `hero-creat/HeroCreatLayer` |
| 酒馆任务 | 占位 `main_pub_task` | `main-task/MainTaskLayer`（标题是咖啡馆） |
| 祭坛 | 占位 `main_altar` | `altar/AltarLayer` |
| 幻境之地 | 占位 `main_fantasy_land` | `fantasy-land/FantasyLandMainLayer` |
| 英雄置换 | 占位 `main_hero_pernute` | `hero/HeroPernuteLayer` |
| 异域冒险 | 占位 `main_exotic_adventure` | `exotic-adventure/ExoticAdventureLayer` |
| 魔方 | 占位 `main_magic_cube` | `magic-cube/MagicCubeLayer` |

商店、祈福池、先知之树、黑市、远征、国战没有 P1–P4 的 1:1 Prefab，仍走原来的页面或占位，不在这轮做壳。

## 验收

预览进主城后应看到：

- 中间是城景（欧式建筑、广场、天空），召唤圆台在画面中下，建筑标可点。顶栏和底栏叠在城景上。底栏贴屏幕底边，下面没有黑条。
- 底栏从左到右：主城、英雄、背包、战斗、副本、公会、羁绊。字是国服字图。未开启的副本只显示锁图标，字仍是「副本」，不是「锁·副本」。战斗在正中，略大。
- 圆台在底栏上方，不跟邮件那排小圆钮重叠。点底栏战斗先看到大理石挂机站场、站着的英雄、后侧演武，以及底栏三钮。画面上没有「关-」「请求战报」「切磋」「再拉 3102」。有 MAIN 阵容时站的是这几只英雄，空阵容才是三套默认。点中间「战斗」才进战报。点「高速战斗」「战力UP」打开已有壳，关掉回到挂机。点英雄进英雄列表。
- 公告是一整扇窗：标题、插图、米色正文板和「确定」都在窗框里。登录账号、状态字和「111」被不透明遮罩挡住。
- 英雄列表的羊皮纸贴在顶栏和底栏之间，后面是岩洞底，不是一块黑。「英雄 / 图鉴 / 圣龙」落在各自的页签上，不叠字。英雄页左下是永久皮肤，图鉴页才是进化图鉴。背包用店内底，同一套壳层挂载。真服路径没有「功能页」和绿色调试气泡。

主城页不挂 `USE_PAGE_PREFAB_SHELL`。`?dev=wire` 时壳的左上才有「功能页」，不压 1:1 画面中间。真服路径不画这颗钮。

## 编辑器里看壳有没有偏

项目设计分辨率是 720×1280。Canvas 在 (360, 640)，白框左下角是世界原点 (0, 0)，右上角是 (720, 1280)。

底左排布的壳，根锚点在 (0, 0)。子节点按老坐标写在 0..宽 里时，根若停在 (0, 0)，锚点就落在画面中心，整块壳偏到白框右侧（战斗结算以前大约在 x=750）。这类壳的根位置已经改成和运行时 `centerInParent` 相同的偏移。`BattleEndLayer` 是 (-320, -365)：打开 Prefab，翅膀、头像、确定按钮应落在白框内，水平中心靠近 x=360。

底板中心本来就在根锚点上的壳（公告、选服、英雄列表、邮件、挂机结算等）没有改根位置。运行时仍先把九宫格底板挪进盒子，再居中。混排壳（全屏底旁边还有一块贴在锚点上的大卡片）和工具标成 unsure 的壳也没改。

同类偏右的壳已经按这个规则改完。再跑 `python3 client/tools/fix_ccbi_root_place.py --all` 不应再出现 `SHIFT`。

## 已知缺口

- **空图**：老 ccbi 有的图在资源和旧包里都没有（例如 `button/btn-close-2.png`，选服关闭改用 `btn-close-1`）。这种格子会空着。
- **九宫格**：一批切片和 ccbi 要求不一致，采用值记在各批节点表和 `docs/prefab-1to1-deviations.md`。Prefab 不再改 `.meta`。
- **只是壳**：LanguageSelect 不改语言。没有路由的建筑没有协议，功能页上是占位和返回。
- **挂机两侧**：快速战斗只读 3012 次数。3013 开战仍硬禁，不新造 opcode。我要变强没有独立协议，打开的是已有「英雄变强」壳，不改战力，也不是整张英雄列表。
- **CreateNickRewardLayer** 不在这条路径上。创角仍用 `CreateRolePanel`，不是起名领奖层。
- **UserLoginLayer** 没有密码框。Mock 不校验密码。`password()` 返回空字符串。
- **MissionLayer** 是日常副本，不是主线挑战，所以主线壳用 BattlePanelLayer。主线关卡是挂机左上角的任务标，先打开当前关的章节地图，再打开已有 `ChapterPreviewLayer`。不把咖啡馆 `MainTaskLayer` 当成这一关。

## 从底栏「战斗」走通一局

Creator 3.8.8 打开 `client/`，预览 Boot。桥是 `ws://127.0.0.1:13111/game`。不要加 `?dev=mock`，也不要加 `?dev=wire`（后者会改成探针页）。空号若服上 `gm.cmd.open=false`，挑战会停在「GM 未开」，没有战报。

1. 登录进主城。底栏点「战斗」。应立刻看到大理石殿（`map01_B` + `map01_F`）、站着的英雄，以及底栏「战力UP / 战斗 / 高速战斗」。画面上没有「关-」「请求战报」「切磋」。
2. 三格是当前关「N/m」。宝箱条时钟大约每秒走 1 秒。有掉落表时场地上是一堆图标，计时泡在堆上；`spine/res-block` 挂不上时图标还在，日志有「挂机掉落堆 spine/res-block 没有挂上，仍用图标堆」。点宝箱发空 c2s 3005，并播 collect。不发 3013。
3. 左上角任务标写「第 N 章 · 第 M 关」或「主线未同步」。点开是当前关的章节地图（`ui/chapter/mapXX.jpg`）和底下列表，不是整窗铺在地上。点一关才是关卡预览。三格产出和掉落来自这一关的表。当前关「出战」关掉地图后，和点底栏「战斗」一样。其它关是「查看」。奖励钮打开通关奖励，领取不发 3011。
4. MAIN 没有英雄时，点「战斗」先出出阵。前排写「前」，后排写「后」，格子 1 和 4 是空的，点上的脸落在 2、3、5、6、7、8、9。满员写「上阵 7/7」。点「出阵」发 c2s 3100。空的 s2c 3100 之后再等 3101 才进战。8 秒没有回包就停在出阵，可以再点。再打开时脸还在原来的格子。
5. MAIN 已经有英雄时，点「战斗」不藏挂机壳。按钮变成「战斗中」，中间写「战斗开始」，并播一次 `spine/ZDKS`。战报到了之后，人站在地砖上（和演武同一组点），技能和受击在这些人身上（`LayerVfx` 抬上来了）。回合牌是 `n/15`。加速在 ×1 / ×2 / ×3 之间换图。跳过停在最后一拍。伤害红字，治疗绿字，暴击是更大的金字。
6. 播完盖 `BattleEndLayer`。胜利有 3 颗星和最多 6 个首通图标，以及「下一关」。失败没有星，也没有「下一关」。胜负对不上写「胜负未带」。
7. 「回挂机」不发 3002。回到大理石，演武继续，并再拉 2001、5001、3004、3007。胜利的「下一关」先回挂机，再发原来的空 c2s 3001。
8. 「高速战斗」仍是 `QuickBattleLayer` 的两小时预览加只读 3012，按钮不发 3013。英雄升级钮停用。背包使用只看说明。
- 全屏 CCMenu 会挡住后面的按钮。登录和壳会把关闭 / 登录 / 战斗抬到最上层。`?dev=wire` 时还能用「功能页」进原来的页面。真服路径没有这颗钮。
- 英雄和背包在壳加载前先藏只读页，并铺上全屏底（英雄 `map-bg-role-1`，背包 `map-bg-backpack-1`），来回切不再闪「真服只读」。其它壳仍是异步盖上去的，第一下可能先闪原来的页面。加载失败打日志并留原来的页面。底栏「战斗」的大理石站场不等这张 Prefab；面板加载失败时站场还在，并补三颗代码钮。
- **GM 未开**：空号挑战要先 2015。`gm.cmd.open` 没开时停在「GM 未开」，没有 3001 战报，也就看不到森林战斗和结算。
- 战斗回放按 3001 的行动播攻击、受击、技能帧、飘字和头顶血条。两边同一位置、行动又没带阵营 1/2 时仍写「阵营未带」，不猜攻击者。`WireBattlePage` 仍不挂。
