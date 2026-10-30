# 战斗表现 Prefab

主线战斗的表现壳，和一份更薄的真服接线占位。两页没有共用的根。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| BattlePage | `prefabs/ui/battle/BattlePage` | **已接** 真服进战 |
| WireBattlePage | `prefabs/ui/battle/WireBattlePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/battle/BattlePage.prefab`、`client/assets/prefabs/ui/battle/WireBattlePage.prefab`
- **开关**：`client/assets/scripts/ui/BattlePage.ts` 的 `USE_BATTLE_PREFAB`，默认 `true`，和登录、主城壳一样。改成 `false` 再预览，真服进战回到 `WireMainlinePage` 里原来的代码 UI。代码 UI 不删。不改 `Boot.ts`，不改 `USE_CITY_CHROME_PREFAB`，不改 CityChrome / 通用 Prefab 的 `__type__`。
- **怎么打开**：预览加 `?transport=ws` 进真服主城，打开「更多」里的主线。页内仍用已经接好的按钮发 **3001**（挑战）、**3030**（切磋）或 **3102**（请求战报）。有 report 才进战斗表现，这时挂 BattlePage。**3006** 挂机战报本来就走同一套回放，所以也会看到这张壳。不新开 c2s。3103、3101、3099 仍不进这页。Mock 关卡页（`MainlinePage.ts`）仍是代码色块，不挂这张壳。
- **吃哪些已有数据**：`planWireSpineReplay` 的 slots / beats，外加同一份 report 上已经解开的命中和英雄。站位进 `Slot_E0`–`E2`、`Slot_A0`–`A2`（后排 `E3`–`E5`、`A3`–`A5` 留着壳上的占位）。血量写 `EnemyHp_*` / `AllyHp_*` 的 `Label`，两边都有数时才改 `Fill` 宽度；缺一边不写成 0，空着的三格血条保持 Prefab 里的 `120/120`、`100/100`。回合行写 `TopBar/RoundLabel`，同一行再写 `Log`。技能特效挂 `LayerVfx/VfxSkill`，受击挂 `LayerVfx/VfxHit`，无锚点时就停在文档里的 (0, 180) / (0, 120)。`VfxScreen` 保持空挂点，现有拍没有全屏角色。技能条 `Label` 在有技能拍时写成 batch2 的 stem；填充保持 Prefab 占位，因为 3001 / 3030 / 3102 不带技能槽能量。战剑、战旗没有对应槽，挂在 `LayerField` 上，坐标仍是原来的代码回放。套是 `battle-sword`（stand）和 `zhandoujijian`（idle），走内存里的 3.7→运行时升级；加载失败只把格子藏起来，不印「战旗」「战剑」。飘字写 `LayerFloat/FloatDamageRoot/FloatDmg_0`–`FloatDmg_3`，暴击写 `LayerFloat/FloatCrit`，技能名写 `SkillNameBanner/SkillNameLabel`，前排头顶写 `HeadAnchor/LevelLabel` 和 `HeadAnchor/BuffRow`。`hurt` 缺失不画，不写成 0。`crit`、`level`、`buffs` 只有报告上已经带了才显示；没有就藏起，不写成 0，也不把 `marks` 里的号猜成暴击、等级或 buff。不另建同名代码节点。
- **按钮**：`BtnSkip` 把本地回放快进到最后一拍，页留着，然后盖 `BattleEndLayer`。`BtnSpeed` 在顶栏左侧，只在 ×1、×2、×3 之间换，缩短每一拍的等待，不跳过，也不拆页。`BtnRetreat` 同样先画完最后一拍再盖结算，不发 3002 / 3005 / 3020 / 3100 / 3098。战斗里的 `BtnClose` 和结算「确定」都回挂机站场，不关主线页。回放自己走完也不拆 BattlePage：`play` 以前在 `playback` 之后立刻 `showDone` → `clearBody`，最后一拍只等 260ms，没有行动的战报就会闪一下关掉。现在停在壳上并盖结算，确定才回挂机。可见节奏改走 `battleCastWait`，不再用 260ms 收尾。没有恭喜获得层，不拿 3002 当自动关。`BattleEndLayer` 加载失败才用代码「回挂机」。
- **WireBattlePage**：没有站位和特效挂点。探针按钮仍在原来的真服主线页上，所以这张占位不挂。
- **状态**：不删代码 UI。加载失败时 Toast「战斗 Prefab 未加载，改用代码 UI」，同一页继续播。`hero_id` 对得上 `resources/spine` 的套就用那套，`skill_id` 对得上 `resources/battle/skill` 的套就播那套帧。解码字段没加。

## 验收预览

Creator 3.8.8 打开 `client`。要看这张战斗页，预览地址加 `?transport=ws`（`http://127.0.0.1:7456/?transport=ws`），本机桥 `ws://127.0.0.1:13111/game` 转到 TCP 9902。游戏服要开着。`USE_BATTLE_PREFAB` 在 `BattlePage.ts`，默认 `true`。改成 `false` 就回到代码战斗页。不改 Boot。

1. 登录进主城。底栏「战斗」，或左下 BtnMainline，或「更多」里的主线，打开主线页。
2. 壳上的「战斗」或页内「挑战」发 3001。有 report 才挂 BattlePage。底是 `ui/maps/map-bg-mission-1`（648×1152，拉到 720×1280），不是 `battle-scene_spr-bg-1`。
3. 空名册不必手点 GM。挑战会先发 2015 ADD_HERO（默认类型 10505010、星 9），再 3100 上 MAIN，然后才 3001。`gm.cmd.open` 没开时停在「GM 未开」，看不到战报。
4. 不加 `?transport=ws` 的 Mock 主线仍是代码色块，不挂这张壳。
5. 跳过、撤退、播完都盖 BattleEndLayer，确定和关闭回挂机，不关主线页。顶栏加速在 ×1、×2、×3 之间换。血条跟这一拍的头顶。两边同一位置时，行动带了阵营 1/2 才把受击、飘字和血量记到对面。战旗、战剑在播；加载失败只藏格子。

3006、3030、3102 有 report 时走同一套。3103、3101、3099 不进这页。

## 已知缺口

- 英雄套磁盘仍是 Spine 3.7.94，进内存后升到运行时版本，不改磁盘 json。加载失败该格藏起来，并 Toast「spine 未加载」。战旗、战剑走同一套升级，失败只藏格子，不印套名。
- 这些英雄套没有 die。hp 到 0 之后停在 hit。只有 `crusade_boss_die` 播 die。
- 只上场上前 3 人。后排槽留着，第 4 人起不补。
- `skill_id` 对上 `skill-<id>` 就播那套帧，并同时播下一层、其余层和 `_arrow`。没有底套时主套用 `-1`。`skill-<id>_1` 这种下划线分套也算进顺序。对不上仍按原来 49 套和 skill-effect 取模。英雄套没有 Skill / Skill2 剪辑，技能不走缺的剪辑，走技能帧和 skill-effect。帧按原图尺寸播，分套和箭矢跟主套同一个锚点。没有 `skill_id` 不播技能帧、不写技能名，也不编造。
- 3001 解开的行动没有每拍时长。`system.csv` 的 `time_diff=25` 不是拍表，客户端不读。`battlepre.txt` 里的 `battle_duration` 是旧 JSON 样本，没有接进这条回放。×1 可见节奏是 `battleCastWait`：普通拍至少 1400ms，最后一拍至少 1000ms；这一拍带了 `skill_id` 时再取技能帧张数 × 70ms。×2、×3 把这段收成一半、三分之一，最短 80ms。`battleBeatWait` 的 700/260 还在，不是现在的可见节奏。
- 3001 命中只解开 def_pos、hurt、hp。报告上没有 crit、level、buffs 时，暴击气泡、等级和 buff 藏起。有这些字段才会画。
- 不播技能音效。WireBattlePage 仍不挂。

- 设计基准 **720×1280**，坐标相对父节点中心。`LayerField`、`LayerVfx`、`LayerAppear`、`LayerHud`、`LayerFloat`、`EnemySlots`、`AllySlots`、`HpBars`、`SkillBars` 都是铺满页面的 (0, 0) 容器，所以它们的直接子节点就是页面坐标。`TopBar` 例外，它自己在页面上，子节点是它的本地坐标。`SkillNameBanner`、`FloatDamageRoot`、`HeadAnchor`、`BuffRow` 也不是铺满容器，子节点用它们自己的本地坐标。
- 不挂脚本组件。Prefab 里的 `__type__` 只有 `cc.*`。现有通用壳的脚本 id 仍是 23 位 packer（保留头 5）。这一刀没有新的类 id，生成器会拒绝非 `cc.*` 组件，也会拒绝 22 位脚本 id，避免退回 `compressUuid(uuid, true)`。
- 不嵌 Spine。`VfxSkill` / `VfxHit` / `VfxScreen` 只有 `cc.UITransform`。Spine 仍在 `client/assets/resources/spine/`。hero-beattack、skill-effect、skill 子集的帧在 `client/assets/resources/battle/`（见 `docs/battle-asset-migration.md`）。Prefab 上这三个挂点仍是空节点，不写 sprite uuid。回放把 `hero-beattack` 帧挂到 `VfxHit`，把 `skill` 和 `skill-effect` 帧挂到 `VfxSkill`。`skill_id` 对得上 resources 里的套时用那套，对不上仍用原来的 49 套取模。
- 素材只引用 `client/assets/resources/` 的 spriteFrame `@f9941`。`prefabs/ui/battle/` 下没有 PNG。
- 再生：`python3 client/tools/gen_battle_prefab.py`。从现有 `.meta` 读 uuid，再跑一次会覆写同一份 Prefab，并保留已有 `.meta` uuid。

## 用了哪些图

`client/assets/resources/ui/battle/` 里的 `battle-scene` 帧仍在。**`battle-scene_spr-bg-1` 不是全屏底**（112×64，裁切 111×63，边角 chrome），页面 `Bg` 不用它。全屏底是 `ui/maps/map-bg-mission-1.jpg`（648×1152，与旧 `hd/ccbi-res/map-bg-mission-1.jpg` 同一张；`ui/mainline/` 里还有一份相同字节，战斗页引用 `ui/maps/` 这一份）。加速钮和进度条仍挂 `battle-scene` 的 speed / prog。关闭钮仍用通用图，不用 `battle-scene_btn-close-1`。`battle-scene_prog-frame-1` 中间是实心的，不叠在填充上。

| 用途 | 资源 | 模式 |
|------|------|------|
| 页面 `Bg` | `ui/maps/map-bg-mission-1.jpg` | 简单，白色，拉到 720×1280。spriteFrame `26aac3a3-2eeb-4fc3-99a1-fb5c2782be7b@f9941`。原图 648×1152。不要用 `battle-scene_spr-bg-1` |
| 站位色块 | `ui/common/win-bg_block-bg-5.png` | 简单。敌 `(96, 40, 44, 168)`，我 `(28, 58, 96, 168)` |
| 血条 / 技能条 | `ui/battle/battle-scene_prog-bg-1.png` 底，`battle-scene_prog-1.png` 填充 | 简单，不染色。不用 `battle-scene_prog-frame-1` |
| 战报底 | `ui/common/win-bg_msg-bg.png` | 简单，`(10, 18, 32, 230)` |
| `BannerBg` | 同上 `win-bg_msg-bg.png` | 简单，`(28, 16, 48, 210)` |
| `FloatCrit` 底、`Buff_*` | 同上站位 `win-bg_block-bg-5.png` | 简单。暴击底 `(196, 78, 24, 230)`。buff 绿 `(88, 214, 120, 230)`、紫 `(176, 104, 255, 230)`、金 `(255, 196, 72, 230)` |
| `BtnSkip` / `BtnBack` | `ui/common/button_btn-blue-big-1.png`（按下 `button_btn-blue-big-2`） | 九宫格，不染色 |
| `BtnRetreat` | `ui/common/button_btn-orange-big-1.png`（按下 `button_btn-orange-big-2`） | 九宫格，不染色 |
| `BtnClose` | `ui/common/button_btn-close-1.png` | 简单，裁切 **53×56**，不染色。没有按下图，缩放过渡，没有 Label |
| 字 | `font/FZCSJW-GB1-0.ttf` | 与其他页相同 |

`BtnSpeed` 在 `TopBar` 里，本地 x=-308，图是 `battle-scene_btn-speed-1`（73×78）。点一下在 speed-1 / speed-2 / speed-3 之间换，等待收成 1 倍、2 倍、3 倍（`battleBeatWait`，最短 80ms）。不跳过拍子，也不拆页。`battle-scene_btn-speed-10`、`battle-scene_btn-speed-11` 不用。`跳过` 仍是 `BtnSkip`。`BtnClose` 仍是通用 `button_btn-close-1`（53×56），在 (308, 0)。Prefab 上没有 `BtnSpeed` 时，代码仍在顶栏左侧放一枚 `×1`。血条和技能条用 `battle-scene_prog-bg-1` 和 `battle-scene_prog-1`，不染色。`LayerFloat`、`SkillNameBanner`、`HeadAnchor` 的坐标和子节点保持原样。

按钮是 `cc.Sprite` + `cc.Button`（缩放，`zoomScale` 1.05，`clickEvents` 为空）。文案在子节点 `Label`。`BtnClose` 没有 `Label`。

## BattlePage

根 `BattlePage`。绘制顺序：`Bg`、`LayerField`、`LayerVfx`、`LayerAppear`、`SkillNameBanner`、`LayerHud`、`LayerFloat`。HUD 盖在战场和开战挂点上面，飘字层再盖在 HUD 上面。飘字和技能名都在场中，不压顶栏和底栏。

站位是左敌右我，和 `battleSlotPage` 同一套坐标。前排靠中线，后排靠外侧，三行自上而下（y = 140 / -36 / -212）。敌方 x 为 -158（前）和 -300（后），我方为 158 和 300。空着的格子进战后关掉，沙地上只留报告里的人；报告没有英雄时仍补一格站场。`VfxSkill` / `VfxHit` 的默认点仍是技能 (0, 180)、受击 (0, 120)，本地坐标从这里减。`BtnSkip` / `BtnRetreat` 放在底栏。

血条预览数字跟 Mock 战报的敌 120、我 100 一致，只是编辑器里能看见的占位。

### 战场

| 节点 | 位置 (x, y) | 尺寸 | 说明 |
|------|-------------|------|------|
| `Bg` | (0, 0) | 720×1280 | `ui/maps/map-bg-mission-1.jpg`。不是 `battle-scene_spr-bg-1` |
| `LayerField` | (0, 0) | 720×1280 | 容器 |
| `EnemySlots` | (0, 0) | 720×1280 | 容器 |
| `Slot_E0` `Slot_E1` `Slot_E2` | (-158, 140 / -36 / -212) | 108×120 | 敌前排，靠中线。子节点 `Placeholder`、`Label`（`E0`…）、`HeadAnchor` |
| `Slot_E3` `Slot_E4` `Slot_E5` | (-300, 140 / -36 / -212) | 108×120 | 敌后排，靠左外 |
| `AllySlots` | (0, 0) | 720×1280 | 容器 |
| `Slot_A0` `Slot_A1` `Slot_A2` | (158, 140 / -36 / -212) | 108×120 | 我前排，靠中线。`Label` 为 `A0`…，另有 `HeadAnchor` |
| `Slot_A3` `Slot_A4` `Slot_A5` | (300, 140 / -36 / -212) | 108×120 | 我后排，靠右外 |

`Placeholder` 和 `Label` 都在槽的 (0, 0)。`Label` 96×36，字号 22，白字描边。前排 `Slot_E0`–`E2`、`Slot_A0`–`A2` 在这两个子节点后面再挂 `HeadAnchor`。后排没有。

### 特效挂点

都在 `LayerVfx` 下。Prefab 里是空节点，没有子节点，也没有 Sprite。回放开始后，`VfxHit` 下挂 `hero-beattack` 帧，`VfxSkill` 下挂 `skill` 帧和一张更小的 `skill-effect` 帧。没加载到就继续用 batch2 的 spine 特效。

| 节点 | 位置 (x, y) | 尺寸 |
|------|-------------|------|
| `VfxSkill` | (0, 180) | 48×48 |
| `VfxHit` | (0, 120) | 48×48 |
| `VfxScreen` | (0, 0) | 720×1280 |

`VfxScreen` 铺满是为了全屏特效有一个页面大小的父节点。它不挡按钮：节点上没有点击组件。

### 开战挂点

`LayerAppear` 在 `LayerVfx` 和 `SkillNameBanner` 之间。左右擦除是空挂点，不把 15 帧收成一张图。`VsBar` 用 `battle-end_spr-vs`（80×46）。不接 Boot，不改协议。`spine/dwvs` 在 resources 里，Prefab 不嵌 Spine。

| 节点 | 位置 (x, y) | 尺寸 | 说明 |
|------|-------------|------|------|
| `LayerAppear` | (0, 0) | 720×1280 | 容器，只有 `cc.UITransform` |
| `AppearLeft` | (-180, 0) | 360×1280 | 空挂点。帧在 `ui/battle/battle-appear-left_0`–`14` |
| `AppearRight` | (180, 0) | 360×1280 | 空挂点。帧在 `ui/battle/battle-appear-right_0`–`14` |
| `VsBar` | (0, 240) | 80×46 | `battle-end_spr-vs`，白色，简单模式 |

飘字数字挂已入库的 BMFont：掉血 `font/yellow-73`，暴击 `font/red-73`，治疗 `font/green-73`。这三套只有加号、减号和数字，「暴击」两个字仍是旁边的系统字。`font/blue-73` 同样只有数字，技能名继续用系统字。字库没挂上时退回红字、绿字和金字。

### 场内表现挂点

进战回放写这些节点，不另建同名代码节点。缺字段就藏起，清掉编辑器占位（`-12345`、`圣光打击`、`Lv.1`、三色 buff），不写成 0。飘字在有受击者时挪到那个人头顶，没有锚点就留在预览位置。站位是左敌右我，见上表。

`SkillNameBanner` 是根的直接子节点，水平居中，放在两侧站位上方（y=300）。`LayerFloat` 的四条伤害预览也在这上面，可以互相叠，不和槽、血条、技能名、暴击标抢 8px 空隙。`FloatCrit` 在飘字左侧。进战后飘字会跟到受击者头顶。

```
BattlePage
  SkillNameBanner
    BannerBg
    SkillNameLabel
  LayerFloat
    FloatDamageRoot
      FloatDmg_0 … FloatDmg_3
    FloatCrit
Slot_E0–E2 / Slot_A0–A2
  HeadAnchor
    LevelLabel
    BuffRow
      Buff_0  Buff_1  Buff_2
```

后排 `Slot_E3`–`E5`、`Slot_A3`–`A5` 没有 `HeadAnchor`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `SkillNameBanner` | (0, 300) | 248×36 | 容器 |
| `SkillNameBanner/BannerBg` | (0, 0) | 248×36 | 无字。`win-bg_msg-bg` 紫灰染色 |
| `SkillNameBanner/SkillNameLabel` | (0, 0) | 224×30 | `圣光打击`，字号 20，浅金描边 |
| `LayerFloat` | (0, 0) | 720×1280 | 容器，只有 `cc.UITransform` |
| `LayerFloat/FloatDamageRoot` | (0, 450) | 260×110 | 容器，只有 `cc.UITransform` |
| `FloatDmg_0` | (0, 28) | 220×36 | `-12345`，字号 34，橙，框不够时缩小字号 |
| `FloatDmg_1` | (16, -8) | 220×40 | `-439057`，字号 32，青 |
| `FloatDmg_2` | (-12, -32) | 180×32 | `-40604`，字号 26，青 |
| `FloatDmg_3` | (6, 0) | 190×34 | `-41418`，字号 26，青 |
| `LayerFloat/FloatCrit` | (-220, 470) | 84×36 | `暴击`，字号 20。节点自己带染色底和 Label |

`FloatDmg_*` 的坐标相对 `FloatDamageRoot`。`FloatCrit` 的父节点铺满页面，所以那一行是页面坐标。四条飘字的预览页面 y 分别是 478、442、418、450。有受击者时，这四个节点会挪到那个人头顶。

前排头顶。`HeadAnchor` 是槽的本地坐标，六个前排槽各一份，后排不挂。槽高 120，本地顶在 y=60，挂点中心 y=48、高 22，还在槽盒子里，贴着上沿。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `HeadAnchor` | (0, 48) | 104×22 | 容器 |
| `HeadAnchor/LevelLabel` | (-30, 0) | 40×18 | `Lv.1`，字号 12，浅金描边 |
| `HeadAnchor/BuffRow` | (22, 0) | 48×14 | 容器 |
| `Buff_0` `Buff_1` `Buff_2` | (-16 / 0 / 16, 0) | 12×12 | 无字。`block-bg-5` 染成绿、紫、金 |

### HUD

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `TopBar` | (0, 592) | 720×64 | 容器 |
| `TopBar/RoundLabel` | (0, 0) | 400×40 | `第1回合`，字号 28 |
| `TopBar/BtnSpeed` | (-308, 0) | 73×78 | 无文案。`battle-scene_btn-speed-1`，按下图是 speed-2。运行时换成 speed-1 / 2 / 3 |
| `TopBar/BtnClose` | (308, 0) | 53×56 | 无文案 |
| `HpBars` | (0, 0) | 720×1280 | 容器 |
| `EnemyHp_0`…`EnemyHp_2` | (-158, 220 / 44 / -132) | 160×24 | `120/120`。在对应敌前排头顶 |
| `AllyHp_0`…`AllyHp_2` | (158, 220 / 44 / -132) | 160×24 | `100/100`。在对应我前排头顶 |
| `SkillBars` | (0, 0) | 720×1280 | 容器 |
| `SkillBar_0`…`SkillBar_2` | (-220 / 0 / 220, -360) | 180×36 | `Label` 为空字符串 |
| `LogBg` | (0, -456) | 660×64 | — |
| `Log` | (0, -456) | 620×48 | `第1回合 · 我方突进`，左对齐，字号 18 |
| `BtnSkip` | (-140, -568) | 200×52 | `跳过` |
| `BtnRetreat` | (140, -568) | 200×52 | `撤退` |

血条和技能条的 `Fill` 是左对齐的窄条（锚点仍在中心，所以 x 为负）：血条填充 112×14，本地 x=-24；技能填充 72×16，本地 x=-54。只有三格血条和三格技能条，对应现在代码里的三人横排。后排三个站位没有条。

场内挂点怎么填，仍走 **3001 / 3030 / 3102 / 3006** 的 `planWireSpineReplay`，不新开 c2s。

- **大数字**：行动拍上每条命中的 `hurt`，按顺序写 `FloatDmg_0`–`FloatDmg_3`。`hurt` 缺失不占一条，不写成 0。出现的 0 仍写 `0`。超过四条不另建节点。不用到的格子藏起，并清掉 `-12345` 这类占位。
- **「暴击」**：这四条里有一条命中的 `crit` 为 true 或非 0 数字时，打开 `FloatCrit`，文案保持 `暴击`。没有这个字段不打开，也不把 `marks` 的某个号猜成暴击。`crit` 为 0 或 false 同样不打开。
- **技能名**：这一拍 `skill_id` 有值才打开 `SkillNameBanner`。resources 里有 `skill-<id>` 时写那套目录名。对不上再用 `wireSpineSkillStem` 的现成 stem。表对不上就写 `技能 ` 加 id，不编造技能名，也不留 `圣光打击`。没有 `skill_id` 就关掉条。底栏 `SkillBar_*` 仍是原来的能量占位。
- **头顶等级 / buff**：只写前排、而且是报告里真正带上的英雄（每人最多前三个，不含补位）。`level` 缺失就藏起 `LevelLabel` 并清掉 `Lv.1`，不写 0。出现的 0 仍写 `Lv.0`。`buffs` 缺失或为空就藏起 `BuffRow`，不把三颗染色块当成 buff。有 id 时按顺序亮 `Buff_0`–`Buff_2`，多出来的不另建，不编 buff 名。后排没有 `HeadAnchor`，不补。

## WireBattlePage

根 `WireBattlePage`。没有站位，没有 VFX。`#159` 已经把 c2s 3101 阵容探针合进 main，所以状态句不再写「等 Client 3101」。这页仍然不接线。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 与 BattlePage 同一张 `ui/maps/map-bg-mission-1.jpg`。不是 `battle-scene_spr-bg-1` |
| `Title` | (0, 260) | 680×52 | `战斗（真服接线占位）`，字号 36 |
| `Status` | (0, 170) | 640×38 | `未同步 · 等切 Prefab`，字号 22 |
| `FieldHint` | (0, 40) | 640×112 | 站位与特效挂点见 BattlePage，并带一句 `LayerFloat`、`SkillNameBanner`、`HeadAnchor`。顶对齐，可换行，字号 20 |
| `BtnBack` | (0, -160) | 240×48 | `返回` |
