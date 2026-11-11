# 背包列表：SuperScroll / SuperContent 维护入口

2026-11-02 起，业务滚动列表统一采用本规范，背包是维护样板。历史首批仅迁移背包；其他存量列表按已开放功能逐批整改，未开放窗口不因此接入玩法。日常使用 Creator 3.8.8 本机预览；批次集中构建按负责人授权进行。技术验证与用户亲手编辑体验分开，**人工体验仍待用户验收**。

## 文件与节点

英雄列表也采用同一规范：[HeroListView.prefab](../client/assets/bundles/module/hero/prefabs/HeroListView.prefab)内静态节点`Content/HeroBoard/spr_box/HeroScroll`的SuperScroll绑定`view/content`，view保存Mask，content保存SuperContent与HeroIconCellView Prefab。HeroBoard只保留静态容器和Widget；HeroListView直接读取唯一HeroRosterModel，默认四列、Cell自然尺寸96×104、间距12/8、左右边距60。普通刷新保留位置，元素筛选回到起点。[前批页面入口证据](validation/view-registration-list-review-20261111.json)属于虚拟化前的限定复验；本批51项、类型及三英雄/背包/850关/胜利奖励限定复验见[新证据](validation/virtual-list-resource-review-20261111.json)。

- 滚动组件：[SuperScroll.ts](../client/assets/scripts/framework/ui/SuperScroll.ts)，磁盘位置 `G:\work\FsGame\Project\mxzg\client\assets\scripts\framework\ui\SuperScroll.ts`。
- 内容组件：[SuperContent.ts](../client/assets/scripts/framework/ui/SuperContent.ts)，同目录。两个组件分别继承原生ScrollView、Layout；运行时虚拟模式由SuperContent按逻辑索引定位有限节点，手势、惯性和回弹继续用原生ScrollView，编辑器样板沿用原生Layout。
- 页面：[BagView.prefab](../client/assets/bundles/module/bag/prefabs/BagView.prefab)，磁盘位置 `G:\work\FsGame\Project\mxzg\client\assets\bundles\module\bag\prefabs\BagView.prefab`。
- Cell：[BagItemView.prefab](../client/assets/bundles/module/common/prefabs/BagItemView.prefab)，磁盘位置 `G:\work\FsGame\Project\mxzg\client\assets\bundles\module\common\prefabs\BagItemView.prefab`。
- 背包业务展示：[BagView.ts](../client/assets/scripts/features/bag/ui/BagView.ts)；格子展示：[BagItemView.ts](../client/assets/scripts/features/bag/ui/BagItemView.ts)；真实库存同步：[BagController.ts](../client/assets/scripts/features/bag/BagController.ts)、[BagModel.ts](../client/assets/scripts/features/bag/BagModel.ts)。当前通信模板见背包维护指南。

以下均相对BagView完整Prefab内的Content节点：

1. `spr_box/BagScroll`：SuperScroll，**Content 只需拖一次**，指向下面的 content。BagView.bagScroll 已绑定这个组件，不再重复填写 content、viewport 或 Cell Prefab。
2. `spr_box/BagScroll/view`：UITransform 与矩形 Mask，决定裁剪范围，配置保存在 Prefab。
3. `spr_box/BagScroll/view/content`：SuperContent。它本身就是原生 Layout 的子类，**不应再额外挂一份 Layout**；Cell Prefab 和全部排列参数在这里填。

层级迁移、Mask 移动和 ScrollView.content 已保存在源 Prefab，打开页面时不再改父子关系、补 Mask、关闭裁剪或生成替代界面。原页面和 Cell UUID 保留，资源仍按原有背包功能边界加载；图标仍按资源路径加载，没有直接引用全量道具图片。

页面固定布局在Prefab编辑Widget；外根fitVisibleRoot仅桥接LiveShell视口，ViewportScale绑定Content并按designWidth=640、maxScale=1等比缩放。ParchmentLayout、heroMount/heroChrome及旧页面壳已退役，不再按页面名覆盖纸面、页签或列表坐标。SuperContent仍独占动态Cell排列，不能在列表content加竞争位置/尺寸的Widget。

## 修改布局

双击页面 Prefab 进入编辑模式，选择 content 的 SuperContent：

- **布局**：`布局类型 / layoutType` 为 Vertical（单列竖向）、Horizontal（单行横向）或 Grid。单列和单行由布局决定滚动方向；网格使用 `网格滚动方向 / gridAxis`。
- 网格竖滚只显示 `列数 / columns`；横滚只显示 `行数 / rows`。另一个参数保留在序列化中，但不控制当前排布。
- **间距与边距**：`spacingX/spacingY` 为格子外缘之间的空隙；`paddingLeft/Right/Top/Bottom` 为内容四边留白。它们直接使用原生 Layout 的同一份属性，不另存一套同名参数。
- **Cell**：拖`Cell Prefab / cellPrefab`。默认读取根UITransform尺寸并保留正缩放；开启overrideCellSize才使用explicitCellSize覆盖根尺寸，不缩放内部美术。
- **虚拟列表**：virtual默认true，bufferLines默认1、范围0–10；竖滚按行、横滚按列缓冲。关闭virtual时按全部条目创建节点；编辑器样板始终使用原生布局。

交付默认：Grid、竖滚、4 列；横纵间距均 22；左/右/上/下边距为 **35/35/8/38**；Cell 自然尺寸为 **96×96**，覆盖开关关闭。因此相邻格子中心距离为 118。这都是可编辑的默认值，没有保存在 BagView 的坐标公式里。

切换方向时，不要再找原生 Horizontal/Vertical 开关：SuperScroll 已隐藏这些派生设置并统一从 SuperContent 同步。原生惯性、回弹、刹车与回弹时长仍可在 SuperScroll Inspector 调整。拖动取消子节点点击始终启用，以避免滑动时弹详情。

列数、间距和 Cell 尺寸超出 viewport 时，Mask 会裁掉超出的部分；组件不暗中缩放美术或打开另一个滚动方向。此时请减小列数/间距/边距，调整可视范围，或明确开启 Cell 尺寸覆盖。Cell 根使用常见的中心锚点最容易维护，内部美术可自行调整。

## 尺寸和位置由谁控制

- **你调整**：BagScroll 的 UITransform 是滚动输入区域；view 的 UITransform 是裁剪区域，当前均为 520×555。它们是不同用途的区域，通常保持一致；viewport 可以在输入区域内缩小。扩展 view 超出输入范围时，也相应扩大 BagScroll 的输入区域。Mask 的类型/范围承载节点都在 view 可见。
- **SuperContent 自动计算**：content 宽高取“排列所需范围”和“viewport 尺寸”的较大值，空列表也不会产生负尺寸。当前默认 20 个槽的 content 为 520×614。Cell 根尺寸来自自然尺寸或显式覆盖。
- **SuperContent控制运行时Cell位置**：根据完整逻辑条目、原锚点和Cell正缩放计算格子位置，只给视口及缓冲行分配节点；逻辑content尺寸不随池节点数缩短。关闭virtual或编辑器样板时才由原生Layout排列。底层Type、Start Axis、Constraint、Resize Mode仍是派生值，不提供第二个Inspector入口。
- **原生 ScrollView 控制**：content 的滚动 Position、拖动、惯性、回弹。不要用 content.position 当成列表内边距。
- **你调整 Cell Prefab**：`spr_frame`、`spr_icon`、`lbl_count`、`spr_select` 的图片、字体、局部尺寸、位置和样式；动态代码只更新对应数据/可见状态与点击回调。

content不要挂启用的Widget，也不要另挂Layout；Cell根Widget或会调整根尺寸的Layout会与等尺寸布局冲突，组件会明确报错。虚拟模式下view/content的局部X/Y缩放须为1且无旋转；共同祖先的ViewportScale适配仍可使用，Cell自身的正缩放和原锚点保留。Widget可用于Cell内部。不要把手工样例Cell保存为content静态子节点，请使用编辑器预览。

虚拟竖滚网格按行填充、横滚网格按列向下填充。Node到当前数据索引的映射由SuperContent持有，不能用content.children或池节点下标反查业务条目。content位置变化（含惯性和零时长程序跳转）只更新范围和重绑，不触发完整重排或停止惯性；数据、视口、模板和几何参数改变才完整重排并恢复合法滚动位。分类按钮条保留独立实现。

## 不启动游戏也能看排列

1. 在 Creator 中打开 BagView.prefab，选中 content。
2. 展开 SuperContent 的 **编辑器预览**，将 `编辑器预览数量 / previewCount` 改为 8，查看 Cell 静态外观及间距；改成 24，或缩小 view 高度，查看裁剪。
3. 改列数、方向、间距、边距或 Cell Prefab，预览会按新配置重排。预览不请求服务器，不调用 BagItemView.show，不生成物品 ID、数量或奖励。
4. 将数量改回 **0** 清理，并恢复空内容的最小范围。禁用/离开组件时也会清理生成节点；正式运行需要组件启用。

修改 Cell 原文件后若编辑器仍显示旧样例，可将数量设 0 后再设回以重建；游戏预览也应等资源导入完成后刷新。

预览节点名为 `__SuperContentPreview__N`，带引擎的 DontSave 与 EditorOnly 标记，不保存进 Prefab，也不进入玩家运行；previewCount 本身是 editorOnly 字段，浏览器/正式运行的代码还有 EDITOR/PREVIEW 条件限制。生成物与运行数据数组完全分开。Cell 上默认静态文字属于其美术模板，不是测试库存。

这个编辑器体验仍需你亲手确认。自动化已分别检查预览生成、清理、标记和运行模式不生成示例，但这不等于已经代你操作并验收 Creator Inspector。

## 业务接口

业务数据只由TypeScript传入，不序列化到Prefab。英雄、背包、产物说明外层/内层及胜利奖励均由页面或所属展示组件监听列表事件；在onOpen等显示入口绑定并登记关闭清理，再提交数据：

```ts
const list = this.heroScroll.list;
list.node.on(SuperContent.RENDER_ITEM, this.onRender, this);
list.node.on(SuperContent.SELECT_ITEM, this.onSelect, this);
this.ownListener(() => {
    list.node.off(SuperContent.RENDER_ITEM, this.onRender, this);
    list.node.off(SuperContent.SELECT_ITEM, this.onSelect, this);
});
list.setData(entries);
```

RENDER_ITEM参数依次是Cell节点、当前条目、数据索引；onRender只调用Cell.show绘制。SELECT_ITEM参数依次是当前条目、数据索引；页面处理导航，例如按英雄实例ID打开HeroInfoView，背包空槽不打开详情，产物说明只打开只读说明。Cell不保存选择回调或页面导航。节点重绑先重置旧按压状态，拖动取消点击继续沿用SuperScroll和Button。

事件绑定后只提交数据；可选第二渲染参数仍供未迁移调用使用，但当前页面不同时用回调和事件重复画同一格：

```ts
const list = this.bagScroll.list;
list.setData(entries);
list.refresh(3); // 第4条可见时刷新，离屏时延迟到进入视口；越界报错
list.refresh();  // 刷新当前可见条目并复用节点
list.clear();

this.bagScroll.toStart();
const position = this.bagScroll.readPosition();
this.bagScroll.restorePosition(position);
```

`setData<T>(readonly T[], render?)`保存数组浅拷贝；refresh使用上次数据及显示入口，替换数据请再次setData。页面关闭解除自己的RENDER_ITEM/SELECT_ITEM监听，不解除其他页面的监听。滚动位置为距左上起点的正数设计单位，不是百分比；横向符号适配原生getScrollOffset与scrollToOffset差别。普通刷新默认保留位置，内容缩短后限制到合法范围，不要求业务手动保存/恢复坐标。

背包最少 20 个槽、超出后每 4 个补齐，是 [BagUtils.ts](../client/assets/scripts/features/bag/utils/BagUtils.ts) 的展示条目规则，与列数独立。修改为三列后，20 个槽可以留下不满的一行，不会为凑行数修改玩家库存。SuperContent 不知道这些空槽规则、物品 ID、分类、协议或奖励。

背包分类切换回到起点，同分类刷新保留位置。库存请求期间保留上次已接受的真实数据；失败时明确提示显示上次库存，换号/退出/关闭立即清空，迟到回包不会恢复前一角色的数据。

Cell在有限池内重绑到当前数据索引，换Prefab时重建。BagItemView.show只更新物品、选中态、图片和可选状态，选择由列表转交页面；异步图片保留展示代次，旧请求不得盖回新条目或亮起空槽。ResManager.setSprite只持有当前图与本次在途候选，新图赋值后撤回旧拥有者；同图和相同在途请求复用，不随Cell滚动积累历史图片。

## 换一个兼容的 Cell

通用组件仅要求等尺寸、active、有根 UITransform、正缩放且无旋转的 Cell，根不使用竞争尺寸/位置的 Widget。它不要求业务组件。

接到**背包**时，还必须保留 BagItemView 及 `button/frame/icon/count/selectMark` 绑定，frame/icon 有 Sprite。可以复制现有 Cell 制作变体再拖到 SuperContent.cellPrefab；不需要改背包列表逻辑。缺字段会报具体节点/字段，不能用普通图片 Prefab 冒充已兼容的背包 Cell。

2026-10-30 MVC 迁移后旧 `?bag=old`/Main 背包入口已退役，只提示使用 Remake；BagView 不再读取 GameStore/WireSession。运行数据只有 BagModel，业务入口只有 BagController，见 [MVC 维护指南](bag-mvc-maintenance.md)。旧生成器 `gen_backpack_cells.py` 检测到已人工维护的 SuperContent 页面会拒绝覆盖；日常应编辑 Prefab，不再运行这个历史生成器重建样式。

## 本机验收与边界

启动本机后端，在 Creator 打开 `assets/scenes/Remake.scene` 预览；加载 → 登录/选服 → 明确开始 → 底栏背包。编辑源 Prefab 后 Ctrl+S，等待导入再刷新预览。外部工具修改源码时，Creator 尚未导入会继续显示旧资源，本批曾因此读到旧列数，不能据此声称新配置已运行。

各批结果统一见[开发进度](development-progress.md)，原生引擎、Node专项与浏览器分开记录。早期分类/库存/拖动/详情/切页及0/1/3/18条夹具属于虚拟化前证据；本批千/万条有限池专项与850关真实配置另记。数据准备仅使用独立内存测试服，不写日常数据库或项目资产。

当前已实现等尺寸虚拟列表，默认启用；不含不等高或无限循环。Mask仍只是裁剪，实际节点减少来自可见范围与有限节点池；逻辑数据和content总尺寸保持完整。关闭virtual时仍按总条目创建节点。

嵌套列表继续沿用Creator原生ScrollView手势处理；本批分别实测纵向行区拖动与横向产物区拖动。由横向图标区域起手竖拖时，父子列表是否按角度接管尚未签收，当前未实现额外角度仲裁；后续触摸/真机检查需覆盖，不把两条独立拖动结果算作完整嵌套手势验收。

本批1000/10000条六种布局、锚点/Cell缩放、视口resize及滚动不重置惯性的专项和51项全量通过。本机850关首屏5个外层节点，真实纵向拖动、8次大跨度跳转后池保持7；横向拖动不误开，末关复用格选中正确物品，两页签重绑、关页正常；最终资源重载后再次到达850。背包四分类及独立详情、三英雄列表、真实第二关7项胜利奖励返回通过。后续集中验发布包；节点数约束不代表真机帧率或GPU内存结论，不恢复任何玩法。

本节下方截图及[页面事件证据](validation/view-registration-list-review-20261111.json)、[8cb60507共享层证据](validation/shared-modal-widget-20261111.json)均属于本批虚拟化前的实现，保留历史范围，不作新节点池画面验收。当前结果与集中构建安排以[进度](development-progress.md)为准。

交付后请你亲手修改三列/间距/边距、打开/清理编辑器样例、换兼容 Cell，再保存预览、切页重开，确认字段易找且修改不被恢复。收到你的确认前，“人工维护体验”保持待验收。

## 实际截图

默认四列、真实新账号库存，页面重开后：

![背包默认四列](images/backpack-super-scroll.png)

源 Prefab 临时三列、30/18 间距、24/24/18/26 边距，切页重开后（已恢复默认，仅作维护能力证据）：

![源 Inspector 参数修改验证](images/backpack-super-scroll-probe.png)

独立浏览器的无业务数据夹具：编号卡片在 240×120 的 viewport 中排列，底部被 Mask 裁剪；这是运行技术夹具截图，不冒称为操作用户 Creator 编辑窗口的截图：

![通用编号卡片与裁剪](images/super-content-neutral-grid.png)
