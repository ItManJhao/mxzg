# 背包列表：SuperScroll / SuperContent 维护入口

本批只接入背包，不迁移英雄、邮件或商店列表。日常使用 Creator 3.8.8 本机预览；按用户要求不构建 H5、App、微信或其他包。技术验证与用户亲手编辑体验分开，**人工体验仍待用户验收**。

## 文件与节点

- 滚动组件：[SuperScroll.ts](../client/assets/scripts/framework/ui/SuperScroll.ts)，磁盘位置 `F:\project\mxzg\client\assets\scripts\framework\ui\SuperScroll.ts`。
- 内容组件：[SuperContent.ts](../client/assets/scripts/framework/ui/SuperContent.ts)，同目录。两个组件分别继承原生 ScrollView、Layout，没有另建拖动/惯性/回弹或列表框架。
- 页面：[BackpackLayer.prefab](../client/assets/prefabs/ui/backpack/BackpackLayer.prefab)，磁盘位置 `F:\project\mxzg\client\assets\prefabs\ui\backpack\BackpackLayer.prefab`。
- Cell：[BackpackItemCell.prefab](../client/assets/prefabs/ui/backpack/BackpackItemCell.prefab)，磁盘位置 `F:\project\mxzg\client\assets\prefabs\ui\backpack\BackpackItemCell.prefab`。
- 背包业务展示：[BagView.ts](../client/assets/scripts/features/Bag/ui/BagView.ts)；格子展示：[BagItemView.ts](../client/assets/scripts/features/Bag/ui/BagItemView.ts)；真实库存及请求：[BagController.ts](../client/assets/scripts/features/Bag/BagController.ts)、[BagModel.ts](../client/assets/scripts/features/Bag/BagModel.ts)、[BagApi.ts](../client/assets/scripts/features/Bag/BagApi.ts)。本批没有改后端协议。

以下均相对 BackpackLayer 根节点：

1. `spr_box/BagScroll`：SuperScroll，**Content 只需拖一次**，指向下面的 content。BagView.bagScroll 已绑定这个组件，不再重复填写 content、viewport 或 Cell Prefab。
2. `spr_box/BagScroll/view`：UITransform 与矩形 Mask，决定裁剪范围，配置保存在 Prefab。
3. `spr_box/BagScroll/view/content`：SuperContent。它本身就是原生 Layout 的子类，**不应再额外挂一份 Layout**；Cell Prefab 和全部排列参数在这里填。

层级迁移、Mask 移动和 ScrollView.content 已保存在源 Prefab，打开页面时不再改父子关系、补 Mask、关闭裁剪或生成替代界面。原页面和 Cell UUID 保留，资源仍按原有背包功能边界加载；图标仍按资源路径加载，没有直接引用全量道具图片。

## 修改布局

双击页面 Prefab 进入编辑模式，选择 content 的 SuperContent：

- **布局**：`布局类型 / layoutType` 为 Vertical（单列竖向）、Horizontal（单行横向）或 Grid。单列和单行由布局决定滚动方向；网格使用 `网格滚动方向 / gridAxis`。
- 网格竖滚只显示 `列数 / columns`；横滚只显示 `行数 / rows`。另一个参数保留在序列化中，但不控制当前排布。
- **间距与边距**：`spacingX/spacingY` 为格子外缘之间的空隙；`paddingLeft/Right/Top/Bottom` 为内容四边留白。它们直接使用原生 Layout 的同一份属性，不另存一套同名参数。
- **Cell**：拖 `Cell Prefab / cellPrefab`。默认读取其根 UITransform 的尺寸，保留原始缩放，不自动把格子挤小。开启 `覆盖 Cell 尺寸 / overrideCellSize` 后，才使用 `explicitCellSize` 覆盖实例的根尺寸；内部图片、字体和位置仍由 Cell Prefab 决定。

交付默认：Grid、竖滚、4 列；横纵间距均 22；左/右/上/下边距为 **35/35/8/38**；Cell 自然尺寸为 **96×96**，覆盖开关关闭。因此相邻格子中心距离为 118。这都是可编辑的默认值，没有保存在 BagView 的坐标公式里。

切换方向时，不要再找原生 Horizontal/Vertical 开关：SuperScroll 已隐藏这些派生设置并统一从 SuperContent 同步。原生惯性、回弹、刹车与回弹时长仍可在 SuperScroll Inspector 调整。拖动取消子节点点击始终启用，以避免滑动时弹详情。

列数、间距和 Cell 尺寸超出 viewport 时，Mask 会裁掉超出的部分；组件不暗中缩放美术或打开另一个滚动方向。此时请减小列数/间距/边距，调整可视范围，或明确开启 Cell 尺寸覆盖。Cell 根使用常见的中心锚点最容易维护，内部美术可自行调整。

## 尺寸和位置由谁控制

- **你调整**：BagScroll 的 UITransform 是滚动输入区域；view 的 UITransform 是裁剪区域，当前均为 520×555。它们是不同用途的区域，通常保持一致；viewport 可以在输入区域内缩小。扩展 view 超出输入范围时，也相应扩大 BagScroll 的输入区域。Mask 的类型/范围承载节点都在 view 可见。
- **SuperContent 自动计算**：content 宽高取“排列所需范围”和“viewport 尺寸”的较大值，空列表也不会产生负尺寸。当前默认 20 个槽的 content 为 520×614。Cell 根尺寸来自自然尺寸或显式覆盖。
- **原生 Layout 控制**：每个动态 Cell 的 Position。SuperContent 内部将单行/单列也表达成原生固定行/列网格，保证四边距一致；底层 Type、Start Axis、Constraint、Resize Mode 等为派生值，不提供第二个 Inspector 维护入口。
- **原生 ScrollView 控制**：content 的滚动 Position、拖动、惯性、回弹。不要用 content.position 当成列表内边距。
- **你调整 Cell Prefab**：`spr_frame`、`spr_icon`、`lbl_count`、`spr_select` 的图片、字体、局部尺寸、位置和样式；动态代码只更新对应数据/可见状态与点击回调。

content 不要挂启用的 Widget，也不要另挂 Layout；Cell 根 Widget 或会调整根尺寸的 Layout 也会与等尺寸布局冲突，组件会明确报错。Widget 可以用于 Cell 内部。不要把手工样例 Cell 保存为 content 的静态子节点；请使用下面的编辑器预览。

横滚网格通过转置动态 Cell 的兄弟顺序实现按列向下填充，位置仍完全交给原生 Layout 的同一排列路径，从而让不同 Cell 根锚点使用一致的边距。业务刷新索引始终是数据索引，不应通过 content.children 的兄弟索引反查物品。分类按钮条保留原有实现，本批 SuperContent 仅管理物品区。

## 不启动游戏也能看排列

1. 在 Creator 中打开 BackpackLayer.prefab，选中 content。
2. 展开 SuperContent 的 **编辑器预览**，将 `编辑器预览数量 / previewCount` 改为 8，查看 Cell 静态外观及间距；改成 24，或缩小 view 高度，查看裁剪。
3. 改列数、方向、间距、边距或 Cell Prefab，预览会按新配置重排。预览不请求服务器，不调用 BagItemView.show，不生成物品 ID、数量或奖励。
4. 将数量改回 **0** 清理，并恢复空内容的最小范围。禁用/离开组件时也会清理生成节点；正式运行需要组件启用。

修改 Cell 原文件后若编辑器仍显示旧样例，可将数量设 0 后再设回以重建；游戏预览也应等资源导入完成后刷新。

预览节点名为 `__SuperContentPreview__N`，带引擎的 DontSave 与 EditorOnly 标记，不保存进 Prefab，也不进入玩家运行；previewCount 本身是 editorOnly 字段，浏览器/正式运行的代码还有 EDITOR/PREVIEW 条件限制。生成物与运行数据数组完全分开。Cell 上默认静态文字属于其美术模板，不是测试库存。

这个编辑器体验仍需你亲手确认。自动化已分别检查预览生成、清理、标记和运行模式不生成示例，但这不等于已经代你操作并验收 Creator Inspector。

## 业务接口

泛型数据与回调仅由 TypeScript 传入，不序列化到 Prefab：

```ts
const list = this.bagScroll.list;
list.setData(entries, (node, entry, index) => {
    const cell = node.getComponent(BagItemView)!;
    cell.show(entry.item, entry.selected, entry.onTap, entry.face);
});
list.refresh(3); // 重新渲染第 4 条；越界会明确报错
list.refresh();  // 刷新全部，复用已有节点
list.clear();

this.bagScroll.toStart();
const position = this.bagScroll.readPosition();
this.bagScroll.restorePosition(position);
```

`setData<T>(readonly T[], render)` 保存数组的浅拷贝；`refresh` 使用上次数据和回调，替换数据请再次 setData。滚动位置为距左上起点的正数设计单位，不是百分比；横向符号已适配原生 getScrollOffset 与 scrollToOffset 的差别。普通刷新默认保留位置，内容缩短后自动限制到合法范围，不要求业务手动保存/恢复坐标。

背包最少 20 个槽、超出后每 4 个补齐，是 [bagBoard.ts](../client/assets/scripts/module/bag/bagBoard.ts) 的展示条目规则，与列数独立。修改为三列后，20 个槽可以留下不满的一行，不会为凑行数修改玩家库存。SuperContent 不知道这些空槽规则、物品 ID、分类、协议或奖励。

背包分类切换回到起点，同分类刷新保留位置。库存请求期间保留上次已接受的真实数据；失败时明确提示显示上次库存，换号/退出/关闭立即清空，迟到回包不会恢复前一角色的数据。

Cell 按索引复用，换 Prefab 时重建。BagItemView 每次 show 先解绑上次点击，空槽也会正确清除回调；图标/边框加载带展示版本，旧请求的迟到结果不能盖回新物品或重新亮起空槽。

## 换一个兼容的 Cell

通用组件仅要求等尺寸、active、有根 UITransform、正缩放且无旋转的 Cell，根不使用竞争尺寸/位置的 Widget。它不要求业务组件。

接到**背包**时，还必须保留 BagItemView 及 `button/frame/icon/count/selectMark` 绑定，frame/icon 有 Sprite。可以复制现有 Cell 制作变体再拖到 SuperContent.cellPrefab；不需要改背包列表逻辑。缺字段会报具体节点/字段，不能用普通图片 Prefab 冒充已兼容的背包 Cell。

2026-10-30 MVC 迁移后旧 `?bag=old`/Main 背包入口已退役，只提示使用 Remake；BagView 不再读取 GameStore/WireSession。运行数据只有 BagModel，业务入口只有 BagController，见 [MVC 维护指南](bag-mvc-maintenance.md)。旧生成器 `gen_backpack_cells.py` 检测到已人工维护的 SuperContent 页面会拒绝覆盖；日常应编辑 Prefab，不再运行这个历史生成器重建样式。

## 本机验收与边界

启动本机后端，在 Creator 打开 `assets/scenes/Remake.scene` 预览；加载 → 登录/选服 → 明确开始 → 底栏背包。编辑源 Prefab 后 Ctrl+S，等待导入再刷新预览。外部工具修改源码时，Creator 尚未导入会继续显示旧资源，本批曾因此读到旧列数，不能据此声称新配置已运行。

技术结果与截图见 [开发进度](development-progress.md)，原生引擎和 Node 检查分开记录。真实流程包含分类、库存、拖动抑制详情、重复刷新、选中与详情、切页重开；独立夹具覆盖横向、竖向、网格竖滚/横滚，以及 0/1/3/18 条、缩短和兼容 Cell 替换。夹具仅存在于独立测试浏览器，不写入玩家数据或项目资产。

第一版只支持等尺寸列表，不含不等高、无限循环或虚拟列表。目前验证的是新账号少量真实道具、20 个背包展示槽和最多 18 条的通用夹具；节点按索引复用已有实测，不将这些结果当成大库存帧率或内存预算。将来有实际大列表数据和性能证据后再决定虚拟化。

本批按指示未构建任何包，不能以本机结果代替最新独立 H5/App/小游戏验收。18081 仍是上一批旧产物，与本批 SuperScroll 源码不对应；这是用户暂停构建，不是本批确认了新的 H5 阻塞。

交付后请你亲手修改三列/间距/边距、打开/清理编辑器样例、换兼容 Cell，再保存预览、切页重开，确认字段易找且修改不被恢复。收到你的确认前，“人工维护体验”保持待验收。

## 实际截图

默认四列、真实新账号库存，页面重开后：

![背包默认四列](images/backpack-super-scroll.png)

源 Prefab 临时三列、30/18 间距、24/24/18/26 边距，切页重开后（已恢复默认，仅作维护能力证据）：

![源 Inspector 参数修改验证](images/backpack-super-scroll-probe.png)

独立浏览器的无业务数据夹具：编号卡片在 240×120 的 viewport 中排列，底部被 Mask 裁剪；这是运行技术夹具截图，不冒称为操作用户 Creator 编辑窗口的截图：

![通用编号卡片与裁剪](images/super-content-neutral-grid.png)
