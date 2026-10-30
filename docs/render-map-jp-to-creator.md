# 日服 H5 → Creator 渲染映射（背包 / 羊皮纸列表）

状态：**待复验**。本文只记录根因和改法，不宣告 ACC-BAG-001～003 或 ACC-COM-001 通过。

对照：日服 H5 `https://mxzg-test.funsgamex.com/jp/`（只读，本分支不改日服仓）。  
被测：本仓 Cocos Creator 3.8.8，设计分辨率 **640×1280、只 Fit Height**。

## 设计宽

| | 日服 H5 | Creator |
| --- | --- | --- |
| 设计分辨率 | 640×1280，`FIXED_HEIGHT` | 640×1280，`fitHeight: true`，`fitWidth: false` |
| 整屏缩放 | `ex.s.global_scale = winW / 640` | 分辨率策略只 Fit Height。可视宽 = 屏宽 × 1280 / 屏高，设计宽不参与 |
| 背包 / 英雄 ccbi | 640×960，锚点左下，**窗本身不再乘** `(720-36)/640` | 同左。全屏店景、岩洞由 `PagePrefabShell` 底图单独铺满 |
| 羊皮纸九宫 | 按 ccbi 尺寸，不把整页拉到顶栏和底栏之间 | 同左。可视宽 ≥ 640 时 `scale` 为 1；更窄时 `parchmentFitScale = visibleW / 640`。`extraTop` / `extraBottom` 为 0 |

`LIST_WINDOW_TOP = 470`、`LIST_WINDOW_BOTTOM = -480`、`LIST_WINDOW_SIDE = 18` 只保留为顶栏 / 底栏设计带的记录。铺窗不再用它们改缩放或拉高九宫。

以前的公式 `scale = (720 - 18×2) / 640 = 1.06875` 就是 Inspector 里 `BackpackLayer`（以及同一条路径上的 `HeroListLayer`）的 **Scale 1.069**，位置约 `(-342, -513)`。日服背包只把全屏底图拉到 `winSize`，不把 640×960 的 ccbi 窗再整页放大。放大之后再把 `spr_bg` / `spr_box` 拉高约 200+75，羊皮纸中心被撑成大块空壳，店员节点也被顶上去。

可视宽 ≥ 640 时根节点为 **scale 1**，底左角锚点落在 **(-320, -480)**（640×960 在设计框里居中）。iPhone 14 Pro 可视宽约 590，根节点 scale 约为 590/640，否则 640 羊皮纸左右被裁。全屏店景、岩洞仍铺满可见框。旧公式 `(720-36)/640` 即使还在某个缓存模块里，也不再写成 Inspector 的 Scale 1.069 / Pos (-342, -513)。

## 背包格子

空账号没有道具是预期，不是缺陷。空槽仍要画出来。

格子预制是 `BackpackItemCell`。空槽把 `spr_frame` 换成 `ui/common/other_spr-null`（深色菱格），不造第二套滚动壳。滚动节点仍是预制里的 `spr_box/BagScroll`。

预制原来把 `content` 和空的 `view` 并列，遮罩挂在 `BagScroll` 上。Creator 3.8 的 ScrollView 用 **content 的父节点** 当视口。运行时把 `content` 放进已有的 `view`，本地坐标钉在 `(0, 0)`。首格本地坐标 `(-168, -56)`、96×96，落在 view 的矩形里面（view 顶锚点、高约 438），不是摆出视口。

`BackpackItemCell/spr_frame` 预制上已有 `backpack_item-frame-1`（不透明圆角方框），空槽再异步换成 `ui/common/other_spr-null`。格子 `_layer` 是 UI_2D（33554432），没有 UIOpacity。画面中央仍是纯米色，是因为格子被裁掉，不是贴图没挂上。米色是 `spr_box` 的九宫（`win-bg_block-bg-5`），它在 `BagScroll` 外面，所以遮罩裁不到它。

宿主 Mask 若只在进场景前 `enabled = false`，`onDisable` 不会跑。进场景后 `Mask.onLoad` 仍会 `addComponent(Graphics)` 并把 `stencilStage` 设为进入模板，矩形要等 `onEnable` 才画。组件是关的，`onEnable` 不跑，模板是空的，`BagScroll` 下的 16 个格子全部不可见。修法是 `removeComponent` 卸掉宿主 Mask，只留 `view` 上那块会在 `onEnable` 里画出的矩形遮罩。视口高度仍跟 `spr_box`，空账号留 4 行。不 `uiNode` 新的 `BagScroll`。

## 已知限制（不是本分支用代码补的画）

- 上半区店员是预制 `node_portrait` 上的 spine `shangcheng`，对白是 `lbl_talk`（language 5788）。立绘缺了要在 Creator 里补资源或预制，不在代码里画人。
- 外框是预制九宫 `win-bg_win-bg-11`，内底是 `spr_box` 的 `win-bg_block-bg-5`。`ParchmentPlate` 是铺在 `spr_bg` 后面的奶油色垫，九宫画出来就盖住它。九宫角花若和日服仍不一致，是预制美术，要在 Creator 里改，不用代码画框。
- 底栏最右 VIP / 羁绊（ACC-COM-002）本分支不动。

## 复验

Creator 预览真桥进背包（不要用 mock）。合入后本机必须 `git pull --ff-only`，并且 **关掉再开 Creator 预览**（硬刷新隧道），否则运行时仍是旧 bundle：Scale 1.069、Pos (-342, -513)，英雄 Tab 也会在旧 `MainApp` 上抛 `CITY_HUB_MORE_ID is not defined`。看 `BackpackLayer` 的 Scale 是否仍为 1、Pos 是否约 (-320, -480)，中央 4 列空槽是否画出来（不再是纯米色）。格子仍在 `BagScroll/view/content/BackpackItemCell`。本环境没有 Creator，不能代替这次复验。
