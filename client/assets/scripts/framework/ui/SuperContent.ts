/** 通用等尺寸列表：保留Layout的Inspector参数，运行时按逻辑总量布局并复用可见范围的有限格子。
 * 页面监听渲染和选择事件、提交展示数据；本组件管理节点及点击绑定，不读取业务状态。
 * 编辑器样板和明确关闭虚拟化时使用原生Layout；实际滚动只换绑，不重置惯性或发业务请求。
 */
import { _decorator, Button, CCObject, Enum, instantiate, Layout, Node, Prefab, Size, UITransform, Widget } from "cc";
import { EDITOR, PREVIEW } from "cc/env";

const { ccclass, property, executeInEditMode } = _decorator;
export enum SuperLayout { Vertical, Horizontal, Grid }
export enum SuperAxis { Vertical, Horizontal }

/** 一次几何测量；尺寸都在view/content局部坐标中，共同祖先的适配缩放不改变它。 */
interface ListGeometry {
    /** true按行向下滚动，false按列向右滚动。 */
    vertical: boolean;
    /** 每个滚动行/列容纳的格子数。 */
    across: number;
    /** Cell根未缩放宽度，供覆盖根尺寸，不能用于覆盖内部美术比例。 */
    cellWidth: number;
    /** Cell根未缩放高度，与原Prefab内部美术比例分开。 */
    cellHeight: number;
    /** Cell原缩放后的占用宽度。 */
    width: number;
    /** Cell原缩放后的占用高度。 */
    height: number;
    /** 同行相邻格子的横向步长，含间距。 */
    stepX: number;
    /** 相邻行的纵向步长，含间距。 */
    stepY: number;
    /** 根据逻辑总量计算的content宽度，不取真实池节点数。 */
    contentWidth: number;
    /** 根据逻辑总量计算的content高度。 */
    contentHeight: number;
    /** 当前视口局部宽度，窗口适配或嵌套行尺寸变化时重新测量。 */
    viewWidth: number;
    /** 当前视口局部高度。 */
    viewHeight: number;
}

/** 等尺寸单列、单行与网格的逻辑尺寸、可见格子池及当前条目事件；不保存业务状态。 */
@ccclass("SuperContent")
@executeInEditMode
export class SuperContent extends Layout {
    /** 数据或几何完整重排前通知SuperScroll保存当前位置，普通滚动换绑不派发。 */
    static readonly BEFORE_LAYOUT = "super-content-before-layout";
    /** 数据或几何完整重排后通知SuperScroll恢复并限制合法滚动位置。 */
    static readonly AFTER_LAYOUT = "super-content-after-layout";
    /** 页面渲染一格：参数依次为复用节点、当前条目、逻辑索引。 */
    static readonly RENDER_ITEM = "super-content-render-item";
    /** 页面选择一格：参数依次为当前条目、数据索引；关闭页面时须解除自己的监听。 */
    static readonly SELECT_ITEM = "super-content-select-item";

    @property({ type: Enum(SuperLayout), displayName: "布局类型", group: "布局", tooltip: "竖向单列 / 横向单行 / 等尺寸网格" })
    layoutType = SuperLayout.Grid;
    @property({ type: Enum(SuperAxis), displayName: "网格滚动方向", group: "布局", visible(this: SuperContent) { return this.layoutType === SuperLayout.Grid; }, tooltip: "竖滚固定列数；横滚固定行数。SuperScroll 自动同步方向" })
    gridAxis = SuperAxis.Vertical;
    @property({ displayName: "列数", group: "布局", min: 1, step: 1, visible(this: SuperContent) { return this.layoutType === SuperLayout.Grid && this.gridAxis === SuperAxis.Vertical; } })
    columns = 4;
    @property({ displayName: "行数", group: "布局", min: 1, step: 1, visible(this: SuperContent) { return this.layoutType === SuperLayout.Grid && this.gridAxis === SuperAxis.Horizontal; } })
    rows = 2;

    /** 默认只创建可见范围的格子；关闭后按全量节点布局，用于确需静态列表的页面。 */
    @property({ displayName: "虚拟列表", group: "虚拟列表" })
    virtual = true;

    /** 视口前后各保留的缓冲行/列数量；限制池量，不随数据总量增加。 */
    @property({ displayName: "缓冲行数", group: "虚拟列表", min: 0, max: 10, step: 1 })
    bufferLines = 1;

    // 保留中文检查器属性并显式指定访问器接收者，避免发布版 loose 编译将 super 属性错误绑定到原型。
    @property({ override: true, displayName: "横向间距", group: "间距与边距", min: 0 })
    /** 读取当前组件的横向间距，单位为设计像素，沿用原生 Layout 状态。 */
    get spacingX(): number {
        return Reflect.get(Layout.prototype, "spacingX", this);
    }

    /** 写入横向间距并执行原生布局失效通知，不产生第二份状态。 */
    set spacingX(value: number) {
        Reflect.set(Layout.prototype, "spacingX", value, this);
    }
    @property({ override: true, displayName: "纵向间距", group: "间距与边距", min: 0 })
    /** 读取当前组件的纵向间距，单位为设计像素，沿用原生 Layout 状态。 */
    get spacingY(): number {
        return Reflect.get(Layout.prototype, "spacingY", this);
    }

    /** 写入纵向间距并执行原生布局失效通知，不产生第二份状态。 */
    set spacingY(value: number) {
        Reflect.set(Layout.prototype, "spacingY", value, this);
    }
    @property({ override: true, displayName: "上边距", group: "间距与边距", min: 0 })
    /** 读取当前组件的上边距，单位为设计像素，沿用原生 Layout 状态。 */
    get paddingTop(): number {
        return Reflect.get(Layout.prototype, "paddingTop", this);
    }

    /** 写入上边距并执行原生布局失效通知，不产生第二份状态。 */
    set paddingTop(value: number) {
        Reflect.set(Layout.prototype, "paddingTop", value, this);
    }
    @property({ override: true, displayName: "下边距", group: "间距与边距", min: 0 })
    /** 读取当前组件的下边距，单位为设计像素，沿用原生 Layout 状态。 */
    get paddingBottom(): number {
        return Reflect.get(Layout.prototype, "paddingBottom", this);
    }

    /** 写入下边距并执行原生布局失效通知，不产生第二份状态。 */
    set paddingBottom(value: number) {
        Reflect.set(Layout.prototype, "paddingBottom", value, this);
    }
    @property({ override: true, displayName: "左边距", group: "间距与边距", min: 0 })
    /** 读取当前组件的左边距，单位为设计像素，沿用原生 Layout 状态。 */
    get paddingLeft(): number {
        return Reflect.get(Layout.prototype, "paddingLeft", this);
    }

    /** 写入左边距并执行原生布局失效通知，不产生第二份状态。 */
    set paddingLeft(value: number) {
        Reflect.set(Layout.prototype, "paddingLeft", value, this);
    }
    @property({ override: true, displayName: "右边距", group: "间距与边距", min: 0 })
    /** 读取当前组件的右边距，单位为设计像素，沿用原生 Layout 状态。 */
    get paddingRight(): number {
        return Reflect.get(Layout.prototype, "paddingRight", this);
    }

    /** 写入右边距并执行原生布局失效通知，不产生第二份状态。 */
    set paddingRight(value: number) {
        Reflect.set(Layout.prototype, "paddingRight", value, this);
    }

    @property({ type: Prefab, displayName: "Cell Prefab", group: "Cell", tooltip: "根节点必须有 UITransform；保留原始缩放，不自动压缩格子" })
    cellPrefab: Prefab | null = null;
    @property({ displayName: "覆盖 Cell 尺寸", group: "Cell", tooltip: "关闭时使用 Cell Prefab 根 UITransform；开启时只覆盖根尺寸，不缩放内部美术" })
    overrideCellSize = false;
    @property({ type: Size, displayName: "Cell 尺寸", group: "Cell", visible(this: SuperContent) { return this.overrideCellSize; } })
    explicitCellSize = new Size(96, 96);

    @property({ editorOnly: true, displayName: "编辑器预览数量", group: "编辑器预览", min: 0, max: 50, step: 1, tooltip: "仅编辑模式生成无业务数据的 Cell。设 0 清理；预览节点不保存、不进入运行/构建" })
    previewCount = 0;

    // 原生布局参数由列表计算，隐藏重复的检查器入口；读写仍作用于当前组件。
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 type，不访问父类原型上的默认值。 */
    get type(): Layout["type"] {
        return Reflect.get(Layout.prototype, "type", this);
    }

    /** 转交原生 type 写入及失效通知，避免发布编译产生自递归赋值。 */
    set type(value: Layout["type"]) {
        Reflect.set(Layout.prototype, "type", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 resizeMode，不访问父类原型上的默认值。 */
    get resizeMode(): Layout["resizeMode"] {
        return Reflect.get(Layout.prototype, "resizeMode", this);
    }

    /** 转交原生 resizeMode 写入及失效通知，避免发布编译产生自递归赋值。 */
    set resizeMode(value: Layout["resizeMode"]) {
        Reflect.set(Layout.prototype, "resizeMode", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 startAxis，不访问父类原型上的默认值。 */
    get startAxis(): Layout["startAxis"] {
        return Reflect.get(Layout.prototype, "startAxis", this);
    }

    /** 转交原生 startAxis 写入及失效通知，避免发布编译产生自递归赋值。 */
    set startAxis(value: Layout["startAxis"]) {
        Reflect.set(Layout.prototype, "startAxis", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 constraint，不访问父类原型上的默认值。 */
    get constraint(): Layout["constraint"] {
        return Reflect.get(Layout.prototype, "constraint", this);
    }

    /** 转交原生 constraint 写入及失效通知，避免发布编译产生自递归赋值。 */
    set constraint(value: Layout["constraint"]) {
        Reflect.set(Layout.prototype, "constraint", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 constraintNum，不访问父类原型上的默认值。 */
    get constraintNum(): Layout["constraintNum"] {
        return Reflect.get(Layout.prototype, "constraintNum", this);
    }

    /** 转交原生 constraintNum 写入及失效通知，避免发布编译产生自递归赋值。 */
    set constraintNum(value: Layout["constraintNum"]) {
        Reflect.set(Layout.prototype, "constraintNum", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 cellSize，不访问父类原型上的默认值。 */
    get cellSize(): Layout["cellSize"] {
        return Reflect.get(Layout.prototype, "cellSize", this);
    }

    /** 转交原生 cellSize 写入及失效通知，避免发布编译产生自递归赋值。 */
    set cellSize(value: Layout["cellSize"]) {
        Reflect.set(Layout.prototype, "cellSize", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 affectedByScale，不访问父类原型上的默认值。 */
    get affectedByScale(): Layout["affectedByScale"] {
        return Reflect.get(Layout.prototype, "affectedByScale", this);
    }

    /** 转交原生 affectedByScale 写入及失效通知，避免发布编译产生自递归赋值。 */
    set affectedByScale(value: Layout["affectedByScale"]) {
        Reflect.set(Layout.prototype, "affectedByScale", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 horizontalDirection，不访问父类原型上的默认值。 */
    get horizontalDirection(): Layout["horizontalDirection"] {
        return Reflect.get(Layout.prototype, "horizontalDirection", this);
    }

    /** 转交原生 horizontalDirection 写入及失效通知，避免发布编译产生自递归赋值。 */
    set horizontalDirection(value: Layout["horizontalDirection"]) {
        Reflect.set(Layout.prototype, "horizontalDirection", value, this);
    }
    @property({ override: true, visible: false })
    /** 读取当前组件的原生 verticalDirection，不访问父类原型上的默认值。 */
    get verticalDirection(): Layout["verticalDirection"] {
        return Reflect.get(Layout.prototype, "verticalDirection", this);
    }

    /** 转交原生 verticalDirection 写入及失效通知，避免发布编译产生自递归赋值。 */
    set verticalDirection(value: Layout["verticalDirection"]) {
        Reflect.set(Layout.prototype, "verticalDirection", value, this);
    }

    /** 当前视口容量允许的格子池；数组下标不是数据索引，缩小视口或数据时释放多余节点。 */
    private cells: Node[] = [];
    /** 真实格子到当前逻辑索引；换绑或隐藏时更新，点击只读取这里的当前条目。 */
    private readonly indices = new Map<Node, number>();
    /** 当前节点使用的模板，模板变化时重建格子，避免复用错误组件绑定。 */
    private renderedPrefab: Prefab | null = null;
    /** 当前数据的渲染动作，setData替换、组件销毁时清空，不持有另一份业务Model。 */
    private renderItem: ((node: Node, index: number) => void) | null = null;
    /** 本轮只读展示数据副本，点击按当前索引读取；重排、缩短或清空后不再回调旧条目。 */
    private items: readonly unknown[] = [];
    /** 格子到唯一点击函数的映射；移除格子或销毁组件时解绑，不在每次渲染重复登记。 */
    private readonly selectHandlers = new Map<Node, () => void>();
    /** 当前逻辑数据量，setData更新；虚拟模式下通常大于实际节点量。 */
    private count = 0;
    /** 仅编辑器存在的样板格子，不进入运行数据和选择事件。 */
    private previewNodes: Node[] = [];
    /** 上次编辑器参数签名，避免未修改时重复生成样板。 */
    private previewSignature = "";
    /** 上次数据及Inspector/视口几何签名；子格子移动不应导致滚动惯性被重置。 */
    private geometrySignature = "";
    /** 最新逻辑几何，首次提交或视口重排后更新。 */
    private geometry: ListGeometry | null = null;
    /** 完整重排或换绑时阻止尺寸/位置事件重入，避免ScrollView边界计算递归。 */
    private arranging = false;

    /** 返回当前是否采用有限池；编辑器静态样板继续由原生Layout显示。 */
    private get virtualized(): boolean {
        return this.virtual && (!EDITOR || PREVIEW);
    }

    /** 返回实际持有的格子数，供检查有限池，不等同逻辑数据量或资源内存。 */
    public get pooledCount(): number {
        return this.cells.length;
    }

    get scrollAxis(): SuperAxis {
        return this.layoutType === SuperLayout.Horizontal ? SuperAxis.Horizontal
            : this.layoutType === SuperLayout.Vertical ? SuperAxis.Vertical : this.gridAxis;
    }
    /** 返回逻辑数据量，不能据此推断真实池节点数。 */
    get length(): number { return this.count; }

    /** 检查等尺寸模板、层级与局部变换，失败时拒绝创建可能错位或越界的列表。 */
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
        if (!Number.isInteger(this.bufferLines) || this.bufferLines < 0 || this.bufferLines > 10) fail("bufferLines 必须是0至10的整数");
        if ([this.spacingX, this.spacingY, this.paddingTop, this.paddingBottom, this.paddingLeft, this.paddingRight].some(value => !Number.isFinite(value) || value < 0)) fail("间距和边距必须为有限非负数");
        if (this.virtualized && [this.node, this.node.parent!].some(node => node.scale.x !== 1 || node.scale.y !== 1 || node.eulerAngles.z !== 0)) {
            fail("虚拟列表的view/content局部缩放须为1且无旋转；适配比例请放在共同祖先");
        }
        if (!this.enabled) fail("组件不能禁用");
        const foreign = this.node.children.find(child => !this.cells.includes(child) && !this.previewNodes.includes(child));
        if (foreign) fail("content 含非列表管理的节点 [" + foreign.name + "]；请移到 view 外，示例使用编辑器预览数量");
    }

    /**
     * 提交展示数据并刷新可见格子，节点按视口容量复用；不会请求业务数据或执行页面导航。
     * 页面可在onOpen监听RENDER_ITEM/SELECT_ITEM，再仅调用setData(items)。
     * @param render 已有页面使用的直接渲染回调；省略时仍派发RENDER_ITEM，不必重复维护回调。
     */
    setData<T>(items: readonly T[], render?: (node: Node, item: T, index: number) => void): void {
        this.validateBindings();
        this.clearPreview();
        const data = items.slice();
        this.items = data;
        this.count = data.length;
        this.renderItem = (node, index) => {
            render?.(node, data[index], index);
            this.node.emit(SuperContent.RENDER_ITEM, node, data[index], index);
        };
        if (this.renderedPrefab !== this.cellPrefab) {
            this.removeCells();
            this.renderedPrefab = this.cellPrefab;
        }
        this.refresh();
    }

    /** 刷新可见条目并保留合法滚动位；指定离屏索引只保留数据，进入视口时再绘制。 */
    refresh(index?: number): void {
        if (index !== undefined && (!Number.isInteger(index) || index < 0 || index >= this.count)) {
            throw this.error("refresh(index) 超出条目范围: " + index);
        }
        this.reflow(index === undefined);
        if (index !== undefined) {
            for (const [cell, current] of this.indices) {
                if (current === index) {
                    this.renderItem?.(cell, index);
                    break;
                }
            }
        }
    }
    /** 清空展示条目和节点；页面自己的渲染/选择监听仍由页面关闭流程解除。 */
    clear(): void {
        this.setData([]);
    }

    /** 每个新格子只登记一次原生Button点击；拖动取消仍由SuperScroll和Button处理。 */
    private bindSelection(cell: Node): void {
        const select = () => this.selectCell(cell);
        this.selectHandlers.set(cell, select);
        cell.on(Button.EventType.CLICK, select);
    }

    /** 从仍有效的格子读取本轮条目；隐藏、禁用或已删除的格子不再向页面派发选择。 */
    private selectCell(cell: Node): void {
        if (!this.enabled || !this.node.activeInHierarchy || !cell.isValid || !cell.activeInHierarchy
            || cell.getComponent(Button)?.interactable === false) {
            return;
        }
        const index = this.indices.get(cell);
        if (index !== undefined && index >= 0 && index < this.items.length) {
            this.node.emit(SuperContent.SELECT_ITEM, this.items[index], index);
        }
    }

    /** 根据逻辑条目量测出完整滚动尺寸，保留Cell原缩放和所有Inspector间距。 */
    private measure(): ListGeometry {
        const template = this.cellPrefab!.data as Node;
        const size = this.overrideCellSize ? this.explicitCellSize : template.getComponent(UITransform)!.contentSize;
        const port = this.node.parent!.getComponent(UITransform)!;
        const vertical = this.scrollAxis === SuperAxis.Vertical;
        const across = this.layoutType === SuperLayout.Grid ? (vertical ? this.columns : this.rows) : 1;
        const lines = Math.ceil(this.count / across);
        const short = Math.min(across, this.count);
        const columns = vertical ? short : lines;
        const rows = vertical ? lines : short;
        const width = size.width * template.scale.x;
        const height = size.height * template.scale.y;
        return {
            vertical, across, cellWidth: size.width, cellHeight: size.height, width, height,
            stepX: width + this.spacingX, stepY: height + this.spacingY,
            contentWidth: Math.max(port.width, this.paddingLeft + this.paddingRight
                + columns * width + Math.max(0, columns - 1) * this.spacingX),
            contentHeight: Math.max(port.height, this.paddingTop + this.paddingBottom
                + rows * height + Math.max(0, rows - 1) * this.spacingY),
            viewWidth: port.width, viewHeight: port.height,
        };
    }

    /** 判断需要完整重排的配置变化；不包含滚动位置或池中子节点位置。 */
    private geometryKey(): string {
        const port = this.node.parent?.getComponent(UITransform);
        const content = this.node.getComponent(UITransform);
        const template = this.cellPrefab?.data as Node | undefined;
        const size = template?.getComponent(UITransform);
        return JSON.stringify([this.count, this.virtualized, this.bufferLines, this.layoutType, this.gridAxis,
            this.columns, this.rows, this.paddingLeft, this.paddingRight, this.paddingTop, this.paddingBottom,
            this.spacingX, this.spacingY, this.overrideCellSize, this.explicitCellSize.width, this.explicitCellSize.height,
            size?.width, size?.height, size?.anchorX, size?.anchorY, template?.scale.x, template?.scale.y,
            content?.anchorX, content?.anchorY, port?.width, port?.height]);
    }

    /** 创建一个暂不显示的池节点，先赋当前数据再激活，避免闪出Prefab或上一条目的内容。 */
    private createCell(): Node {
        const cell = instantiate(this.cellPrefab!);
        cell.active = false;
        cell.parent = this.node;
        this.setLayer(cell, this.node.layer);
        this.cells.push(cell);
        this.bindSelection(cell);
        return cell;
    }

    /** 非虚拟模式按逻辑量同步全部节点，编辑器样板仍独立管理。 */
    private syncAllCells(): void {
        while (this.cells.length > this.count) {
            this.removeNode(this.cells.pop()!);
        }
        while (this.cells.length < this.count) {
            this.createCell();
        }
        this.indices.clear();
        this.cells.forEach((cell, index) => {
            this.indices.set(cell, index);
            cell.active = true;
        });
    }

    /** 换绑前清除旧手势的按压态；抬起旧格子时不能误选复用后的另一条数据。 */
    private resetPress(cell: Node): void {
        const button = cell.getComponent(Button);
        if (button) {
            const enabled = button.interactable;
            button.interactable = false;
            button.interactable = enabled;
        }
    }

    /** 依据逻辑索引和原始锚点定位池节点，不在业务View中手算坐标。 */
    private positionCell(cell: Node, index: number, geometry: ListGeometry): void {
        const bounds = this.node.getComponent(UITransform)!;
        const ui = cell.getComponent(UITransform)!;
        ui.setContentSize(geometry.cellWidth, geometry.cellHeight);
        const column = geometry.vertical ? index % geometry.across : Math.floor(index / geometry.across);
        const row = geometry.vertical ? Math.floor(index / geometry.across) : index % geometry.across;
        cell.setPosition(-bounds.anchorX * geometry.contentWidth + this.paddingLeft + column * geometry.stepX + ui.anchorX * geometry.width,
            (1 - bounds.anchorY) * geometry.contentHeight - this.paddingTop - row * geometry.stepY - (1 - ui.anchorY) * geometry.height, 0);
    }

    /**
     * 只处理视口及缓冲行：交集节点保留，新进入的条目才重绑和派发渲染。
     * content位置变化会调用此方法，包含惯性、拖动与零时长程序跳转，不发完整重排事件。
     */
    public refreshVisible(forceRender = false): void {
        const geometry = this.geometry;
        if (this.arranging || !this.node?.isValid || !this.virtualized || !geometry) {
            return;
        }
        this.arranging = true;
        try {
            const content = this.node.getComponent(UITransform)!;
            const port = this.node.parent!.getComponent(UITransform)!;
            const raw = geometry.vertical
                ? this.node.position.y + geometry.contentHeight * (1 - content.anchorY) - port.height * (1 - port.anchorY)
                : -this.node.position.x + geometry.contentWidth * content.anchorX - port.width * port.anchorX;
            const span = geometry.vertical ? geometry.viewHeight : geometry.viewWidth;
            const extent = geometry.vertical ? geometry.contentHeight : geometry.contentWidth;
            const offset = Math.max(0, Math.min(Math.max(0, extent - span), raw));
            const step = geometry.vertical ? geometry.stepY : geometry.stepX;
            const padding = geometry.vertical ? this.paddingTop : this.paddingLeft;
            const first = Math.min(this.count, Math.max(0, Math.floor((offset - padding) / step) - this.bufferLines) * geometry.across);
            const end = Math.min(this.count, Math.max(first, (Math.ceil((offset + span - padding) / step) + this.bufferLines) * geometry.across));
            const limit = Math.min(this.count, (Math.ceil(span / step) + 1 + 2 * this.bufferLines) * geometry.across);
            const occupied = new Map<number, Node>();
            this.cells = this.cells.filter(cell => {
                if (cell.isValid) {
                    return true;
                }
                this.indices.delete(cell);
                this.selectHandlers.delete(cell);
                return false;
            });
            for (const [cell, index] of this.indices) {
                if (index >= first && index < end) {
                    occupied.set(index, cell);
                } else {
                    this.indices.delete(cell);
                    this.resetPress(cell);
                    cell.active = false;
                }
            }
            const free = this.cells.filter(cell => !this.indices.has(cell));
            for (let index = first; index < end; index++) {
                const kept = occupied.get(index);
                const cell = kept || free.pop() || this.createCell();
                this.indices.set(cell, index);
                this.positionCell(cell, index, geometry);
                if (!kept || forceRender) {
                    this.resetPress(cell);
                    this.renderItem?.(cell, index);
                }
                cell.active = true;
            }
            while (this.cells.length > limit && free.length) {
                const cell = free.pop()!;
                this.cells.splice(this.cells.indexOf(cell), 1);
                this.removeNode(cell);
            }
        } finally {
            this.arranging = false;
        }
    }

    /** 完整重排只在数据、几何或视口变化时执行；滚动期间只换绑可见范围，不停惯性。 */
    reflow(forceRender = true): void {
        if (this.arranging) {
            return;
        }
        this.validateBindings();
        this.arranging = true;
        try {
            this.node.emit(SuperContent.BEFORE_LAYOUT);
            if (this.virtualized) {
                this.type = Layout.Type.NONE;
                this.resizeMode = Layout.ResizeMode.NONE;
                this.geometry = this.measure();
                this.node.getComponent(UITransform)!.setContentSize(this.geometry.contentWidth, this.geometry.contentHeight);
            } else {
                this.syncAllCells();
                this.reflowNative();
            }
            this.geometrySignature = this.geometryKey();
            this.node.emit(SuperContent.AFTER_LAYOUT);
        } finally {
            this.arranging = false;
            this._layoutDirty = false;
        }
        if (this.virtualized) {
            this.refreshVisible(forceRender);
        } else if (forceRender) {
            this.cells.forEach((cell, index) => this.renderItem?.(cell, index));
        }
    }

    /** 原生Layout的帧和ScrollView边界回调也进入这里，不能把有限池误排到第0行。 */
    public updateLayout(force = false): void {
        if (!this.virtualized) {
            if (!this.arranging && this.renderItem && this.geometrySignature !== this.geometryKey()) {
                this.reflow();
            } else {
                super.updateLayout(force);
            }
            return;
        }
        if (this.arranging || !this.cellPrefab || !this.node.parent) {
            return;
        }
        if (this.geometrySignature !== this.geometryKey()) {
            this.reflow();
        } else {
            this._layoutDirty = false;
            this.refreshVisible();
        }
    }

    /** 编辑器样板和关闭虚拟化时沿用原布局，不把池节点当逻辑数据总量。 */
    private reflowNative(): void {
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
        // 单行和单列也使用原生网格定位，让四边留白使用同一规则。
        this.type = Layout.Type.GRID;
        this.resizeMode = Layout.ResizeMode.NONE;
        this.affectedByScale = true;
        this.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
        this.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
        // 横向网格按列填充，转置兄弟顺序后交给原生定位，保留非居中锚点的留白。
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
    }

    /** 显示时恢复几何/位置监听并重新测量视口；不增加另一份滚动器。 */
    protected onEnable(): void {
        super.onEnable();
        this.node.parent?.on(Node.EventType.SIZE_CHANGED, this.onViewportResize, this);
        this.node.on(Node.EventType.TRANSFORM_CHANGED, this.onContentMoved, this);
        if (this.cellPrefab) {
            this.reflow(false);
        }
    }
    /** 停用只解除几何监听，缓存页仍保留有限池与当前数据，重开按最新视口刷新。 */
    protected onDisable(): void {
        if (this.node.parent?.isValid) {
            this.node.parent.off(Node.EventType.SIZE_CHANGED, this.onViewportResize, this);
        }
        this.node.off(Node.EventType.TRANSFORM_CHANGED, this.onContentMoved, this);
        this.clearPreview();
        super.onDisable();
    }
    /** 视口尺寸变化重新计算逻辑尺寸和池容量，不沿用旧机型或旧嵌套行的范围。 */
    private onViewportResize(): void {
        if (this.renderItem || this.previewNodes.length) this.reflow();
    }
    /** 原生滚动与程序跳转均改变content位置，此处只换可见范围，不停止惯性。 */
    private onContentMoved(): void {
        this.refreshVisible();
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
    /** 模板变化或清空时解除所有数据映射并释放池，不保留上一批逻辑索引。 */
    private removeCells(): void {
        this.cells.splice(0).forEach(node => this.removeNode(node));
        this.indices.clear();
    }
    /** 释放本列表拥有的格子点击监听及节点，不移除Cell组件自己的其他交互。 */
    private removeNode(node: Node): void {
        this.indices.delete(node);
        const select = this.selectHandlers.get(node);
        if (select) {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, select);
            }
            this.selectHandlers.delete(node);
        }
        if (node.isValid) {
            node.removeFromParent();
            node.destroy();
        }
    }

    /** 销毁时清空数据和仍有效的格子点击；引擎可能先销毁子节点，不能再访问其输入处理器。 */
    protected onDestroy(): void {
        for (const [cell, select] of this.selectHandlers) {
            if (cell.isValid) {
                cell.off(Button.EventType.CLICK, select);
            }
        }
        this.selectHandlers.clear();
        this.indices.clear();
        this.items = [];
        this.renderItem = null;
        this.geometry = null;
    }
    private setLayer(node: Node, layer: number): void { node.layer = layer; node.children.forEach(child => this.setLayer(child, layer)); }
    private error(field: string): Error { return new Error("SuperContent [" + this.node.getPathInHierarchy() + "]: " + field); }
}
