import { _decorator, CCObject, Enum, instantiate, Layout, Node, Prefab, Size, UITransform, Widget } from "cc";
import { EDITOR, PREVIEW } from "cc/env";

const { ccclass, property, executeInEditMode } = _decorator;
export enum SuperLayout { Vertical, Horizontal, Grid }
export enum SuperAxis { Vertical, Horizontal }

/** Equal-size cells. Native Layout places children; this component owns content size.
 * No inventory knowledge, async data loading or manual cell coordinates here.
 */
@ccclass("SuperContent")
@executeInEditMode
export class SuperContent extends Layout {
    static readonly BEFORE_LAYOUT = "super-content-before-layout";
    static readonly AFTER_LAYOUT = "super-content-after-layout";

    @property({ type: Enum(SuperLayout), displayName: "布局类型", group: "布局", tooltip: "竖向单列 / 横向单行 / 等尺寸网格" })
    layoutType = SuperLayout.Grid;
    @property({ type: Enum(SuperAxis), displayName: "网格滚动方向", group: "布局", visible(this: SuperContent) { return this.layoutType === SuperLayout.Grid; }, tooltip: "竖滚固定列数；横滚固定行数。SuperScroll 自动同步方向" })
    gridAxis = SuperAxis.Vertical;
    @property({ displayName: "列数", group: "布局", min: 1, step: 1, visible(this: SuperContent) { return this.layoutType === SuperLayout.Grid && this.gridAxis === SuperAxis.Vertical; } })
    columns = 4;
    @property({ displayName: "行数", group: "布局", min: 1, step: 1, visible(this: SuperContent) { return this.layoutType === SuperLayout.Grid && this.gridAxis === SuperAxis.Horizontal; } })
    rows = 2;

    // Re-label the native properties instead of keeping a second copy of spacing/padding.
    @property({ override: true, displayName: "横向间距", group: "间距与边距", min: 0 })
    get spacingX() { return super.spacingX; }
    set spacingX(value: number) { super.spacingX = value; }
    @property({ override: true, displayName: "纵向间距", group: "间距与边距", min: 0 })
    get spacingY() { return super.spacingY; }
    set spacingY(value: number) { super.spacingY = value; }
    @property({ override: true, displayName: "上边距", group: "间距与边距", min: 0 })
    get paddingTop() { return super.paddingTop; }
    set paddingTop(value: number) { super.paddingTop = value; }
    @property({ override: true, displayName: "下边距", group: "间距与边距", min: 0 })
    get paddingBottom() { return super.paddingBottom; }
    set paddingBottom(value: number) { super.paddingBottom = value; }
    @property({ override: true, displayName: "左边距", group: "间距与边距", min: 0 })
    get paddingLeft() { return super.paddingLeft; }
    set paddingLeft(value: number) { super.paddingLeft = value; }
    @property({ override: true, displayName: "右边距", group: "间距与边距", min: 0 })
    get paddingRight() { return super.paddingRight; }
    set paddingRight(value: number) { super.paddingRight = value; }

    @property({ type: Prefab, displayName: "Cell Prefab", group: "Cell", tooltip: "根节点必须有 UITransform；保留原始缩放，不自动压缩格子" })
    cellPrefab: Prefab | null = null;
    @property({ displayName: "覆盖 Cell 尺寸", group: "Cell", tooltip: "关闭时使用 Cell Prefab 根 UITransform；开启时只覆盖根尺寸，不缩放内部美术" })
    overrideCellSize = false;
    @property({ type: Size, displayName: "Cell 尺寸", group: "Cell", visible(this: SuperContent) { return this.overrideCellSize; } })
    explicitCellSize = new Size(96, 96);

    @property({ editorOnly: true, displayName: "编辑器预览数量", group: "编辑器预览", min: 0, max: 50, step: 1, tooltip: "仅编辑模式生成无业务数据的 Cell。设 0 清理；预览节点不保存、不进入运行/构建" })
    previewCount = 0;

    // These native implementation details are derived, never a second Inspector entry.
    @property({ override: true, visible: false })
    get type() { return super.type; }
    set type(value) { super.type = value; }
    @property({ override: true, visible: false })
    get resizeMode() { return super.resizeMode; }
    set resizeMode(value) { super.resizeMode = value; }
    @property({ override: true, visible: false })
    get startAxis() { return super.startAxis; }
    set startAxis(value) { super.startAxis = value; }
    @property({ override: true, visible: false })
    get constraint() { return super.constraint; }
    set constraint(value) { super.constraint = value; }
    @property({ override: true, visible: false })
    get constraintNum() { return super.constraintNum; }
    set constraintNum(value) { super.constraintNum = value; }
    @property({ override: true, visible: false })
    get cellSize() { return super.cellSize; }
    set cellSize(value) { super.cellSize = value; }
    @property({ override: true, visible: false })
    get affectedByScale() { return super.affectedByScale; }
    set affectedByScale(value) { super.affectedByScale = value; }
    @property({ override: true, visible: false })
    get horizontalDirection() { return super.horizontalDirection; }
    set horizontalDirection(value) { super.horizontalDirection = value; }
    @property({ override: true, visible: false })
    get verticalDirection() { return super.verticalDirection; }
    set verticalDirection(value) { super.verticalDirection = value; }

    private cells: Node[] = [];
    private renderedPrefab: Prefab | null = null;
    private renderItem: ((node: Node, index: number) => void) | null = null;
    private count = 0;
    private previewNodes: Node[] = [];
    private previewSignature = "";

    get scrollAxis(): SuperAxis {
        return this.layoutType === SuperLayout.Horizontal ? SuperAxis.Horizontal
            : this.layoutType === SuperLayout.Vertical ? SuperAxis.Vertical : this.gridAxis;
    }
    get length(): number { return this.count; }

    validateBindings(): void {
        const fail = (field: string): never => { throw this.error(field); };
        const bounds = this.node.getComponent(UITransform);
        if (!bounds) fail("缺少 UITransform");
        if (!this.node.parent?.getComponent(UITransform)) fail("parent(view) 缺少 UITransform");
        if (this.node.getComponent(Widget)?.enabled) fail("content 的 Widget 必须移除或禁用，尺寸由 SuperContent、位置由 ScrollView 控制");
        if (!this.cellPrefab?.data) fail("cellPrefab 未绑定");
        const cell = this.cellPrefab!.data as Node;
        const ui = cell.getComponent(UITransform);
        if (!ui) fail("cellPrefab 根节点缺少 UITransform");
        if (cell.getComponent(Widget)?.enabled) fail("cellPrefab 根 Widget 会覆盖等尺寸布局，请移到内部节点");
        const layout = cell.getComponent(Layout);
        if (layout?.enabled && layout.resizeMode !== Layout.ResizeMode.NONE) fail("cellPrefab 根 Layout 不得调整 Cell 根尺寸");
        if (!cell.active || cell.eulerAngles.z !== 0 || cell.scale.x <= 0 || cell.scale.y <= 0) fail("cellPrefab 根需 active、正缩放且无旋转");
        const size = this.overrideCellSize ? this.explicitCellSize : ui!.contentSize;
        if (!(size.width > 0 && size.height > 0 && Number.isFinite(size.width + size.height))) fail("Cell 尺寸必须是有限正数");
        if (![SuperLayout.Vertical, SuperLayout.Horizontal, SuperLayout.Grid].includes(this.layoutType)) fail("layoutType 无效");
        if (![SuperAxis.Vertical, SuperAxis.Horizontal].includes(this.gridAxis)) fail("gridAxis 无效");
        if (!Number.isInteger(this.columns) || this.columns < 1 || !Number.isInteger(this.rows) || this.rows < 1) fail("columns/rows 必须为正整数");
        if ([this.spacingX, this.spacingY, this.paddingTop, this.paddingBottom, this.paddingLeft, this.paddingRight].some(value => !Number.isFinite(value) || value < 0)) fail("间距和边距必须为有限非负数");
        if (!this.enabled) fail("组件不能禁用");
        const foreign = this.node.children.find(child => !this.cells.includes(child) && !this.previewNodes.includes(child));
        if (foreign) fail("content 含非列表管理的节点 [" + foreign.name + "]；请移到 view 外，示例使用编辑器预览数量");
    }

    /** Data is deliberately not serialized. Existing nodes are reused by index. */
    setData<T>(items: readonly T[], render: (node: Node, item: T, index: number) => void): void {
        this.validateBindings();
        this.clearPreview();
        const data = items.slice();
        this.count = data.length;
        this.renderItem = (node, index) => render(node, data[index], index);
        if (this.renderedPrefab !== this.cellPrefab) {
            this.removeCells();
            this.renderedPrefab = this.cellPrefab;
        }
        while (this.cells.length > data.length) this.removeNode(this.cells.pop()!);
        while (this.cells.length < data.length) {
            const cell = instantiate(this.cellPrefab!);
            cell.parent = this.node;
            this.setLayer(cell, this.node.layer);
            this.cells.push(cell);
        }
        this.refresh();
    }

    refresh(index?: number): void {
        if (index !== undefined) {
            if (!Number.isInteger(index) || index < 0 || index >= this.count) throw this.error("refresh(index) 超出条目范围: " + index);
            this.renderItem?.(this.cells[index], index);
        } else this.cells.forEach((node, i) => this.renderItem?.(node, i));
        this.reflow();
    }
    clear(): void { this.setData([], () => {}); }

    /** Native Layout owns every Cell position; only content dimensions are calculated here. */
    reflow(): void {
        this.validateBindings();
        this.node.emit(SuperContent.BEFORE_LAYOUT);
        const template = this.cellPrefab!.data as Node;
        const size = this.overrideCellSize ? this.explicitCellSize : template.getComponent(UITransform)!.contentSize;
        const children = this.previewNodes.length ? this.previewNodes : this.cells;
        for (const child of children) {
            const ui = child.getComponent(UITransform)!;
            ui.setContentSize(size);
        }
        const vertical = this.scrollAxis === SuperAxis.Vertical;
        const fixed = this.layoutType === SuperLayout.Grid ? (vertical ? this.columns : this.rows) : 1;
        const across = children.length ? Math.min(fixed, children.length) : 0;
        const along = Math.ceil(children.length / fixed);
        const cols = vertical ? across : along, rows = vertical ? along : across;
        const width = this.paddingLeft + this.paddingRight + cols * size.width * template.scale.x + Math.max(0, cols - 1) * this.spacingX;
        const height = this.paddingTop + this.paddingBottom + rows * size.height * template.scale.y + Math.max(0, rows - 1) * this.spacingY;
        const port = this.node.parent!.getComponent(UITransform)!;
        this.node.getComponent(UITransform)!.setContentSize(Math.max(port.width, width), Math.max(port.height, height));
        // One-row/column lists also use native grid positioning, so padding applies on both axes.
        this.type = Layout.Type.GRID;
        this.resizeMode = Layout.ResizeMode.NONE;
        this.affectedByScale = true;
        this.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
        this.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
        // Use one native positioning pass for consistent padding at non-centred anchors.
        // Horizontal grids fill down a column: transpose sibling order, not coordinates.
        const order: Node[] = [];
        if (vertical) order.push(...children);
        else for (let row = 0; row < rows; row++) {
            for (let index = row; index < children.length; index += fixed) order.push(children[index]);
        }
        order.forEach((child, index) => { if (child.getSiblingIndex() !== index) child.setSiblingIndex(index); });
        this.startAxis = Layout.AxisDirection.HORIZONTAL;
        this.constraint = Layout.Constraint.FIXED_COL;
        this.constraintNum = vertical ? fixed : Math.max(1, cols);
        this.updateLayout(true);
        this.node.emit(SuperContent.AFTER_LAYOUT);
    }

    protected onEnable(): void {
        super.onEnable();
        this.node.parent?.on(Node.EventType.SIZE_CHANGED, this.onViewportResize, this);
    }
    protected onDisable(): void {
        this.node.parent?.off(Node.EventType.SIZE_CHANGED, this.onViewportResize, this);
        this.clearPreview();
        super.onDisable();
    }
    private onViewportResize(): void {
        if (this.renderItem || this.previewNodes.length) this.reflow();
    }
    protected update(): void {
        if (!EDITOR || PREVIEW) return;
        const signature = JSON.stringify([this.previewCount, this.cellPrefab?.uuid, this.layoutType, this.gridAxis, this.columns, this.rows,
            this.spacingX, this.spacingY, this.paddingTop, this.paddingBottom, this.paddingLeft, this.paddingRight,
            this.overrideCellSize, this.explicitCellSize]);
        if (signature === this.previewSignature) return;
        this.previewSignature = signature;
        this.clearPreview();
        if (!this.previewCount) {
            if (this.cellPrefab && this.node.parent?.getComponent(UITransform)) this.reflow();
            return;
        }
        this.validateBindings();
        for (let i = 0; i < Math.min(50, this.previewCount); i++) {
            const cell = instantiate(this.cellPrefab!);
            cell.name = "__SuperContentPreview__" + (i + 1);
            cell.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.EditorOnly;
            cell.parent = this.node;
            this.setLayer(cell, this.node.layer);
            this.previewNodes.push(cell);
        }
        this.reflow();
    }
    private clearPreview(): void { this.previewNodes.splice(0).forEach(node => this.removeNode(node)); }
    private removeCells(): void { this.cells.splice(0).forEach(node => this.removeNode(node)); }
    private removeNode(node: Node): void { node.removeFromParent(); node.destroy(); }
    private setLayer(node: Node, layer: number): void { node.layer = layer; node.children.forEach(child => this.setLayer(child, layer)); }
    private error(field: string): Error { return new Error("SuperContent [" + this.node.getPathInHierarchy() + "]: " + field); }
}
