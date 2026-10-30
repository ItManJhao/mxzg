import { _decorator, Button, Label, Mask, Node, Prefab, ScrollView, UITransform, Vec2, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { ancestorScale } from "../../../ui/visibleFit";
import { spawnPrefab } from "../../../ui/prefabLoad";
import { HeroIconCellView } from "./HeroIconCellView";
import { FormationSlotView } from "./FormationSlotView";
import { HeroCatalog } from "../HeroCatalog";
import { MAIN_POSITIONS } from "../LineupApi";
import type { FormationState, FormationScreen, FormationActions } from "../FormationController";

const { ccclass, property } = _decorator;
const PREFAB = "assets/prefabs/ui/hero/HeroSelectLayer.prefab";
export interface FormationRequest { complete(confirmed: boolean): void; }

/** Static authoring belongs to HeroSelectLayer; this View renders data and fits the popup. */
@ccclass("FormationView")
export class FormationView extends BaseView<FormationRequest> implements FormationScreen {
    @property(Button) closeButton: Button | null = null;
    @property(Button) confirmButton: Button | null = null;
    @property(Label) titleLabel: Label | null = null;
    @property(Label) tipLabel: Label | null = null;
    @property(Label) countLabel: Label | null = null;
    @property(Node) grid: Node | null = null;
    @property(Node) scrollContent: Node | null = null;
    @property(Node) scrollPort: Node | null = null;
    @property(ScrollView) scrollView: ScrollView | null = null;
    @property(Node) filterMark: Node | null = null;
    @property([Button]) elementButtons: Button[] = [];
    @property([FormationSlotView]) slots: FormationSlotView[] = [];
    @property(Prefab) cellPrefab: Prefab | null = null;
    @property(UITransform) panelBounds: UITransform | null = null;
    @property(Button) backdropButton: Button | null = null;
    @property(UITransform) backdropBounds: UITransform | null = null;

    @property({ tooltip: "动态英雄列表每行列数；只控制生成的 Cell，不改静态节点", min: 1, step: 1 })
    columns = 5;
    @property({ type: Vec2, tooltip: "动态 Cell 的列距与行距，单位为 Grid 的本地坐标" })
    cellStep = new Vec2(112, 130);
    @property({ type: Vec2, tooltip: "首个动态 Cell 中心，相对 FormGrid；Grid 本身的位置由 Prefab 决定" })
    firstCellPosition = new Vec2(60, -65);
    @property({ tooltip: "动态 Cell 缩放乘子，保留 Cell Prefab 原有缩放；内部图片/字体/尺寸在 HeroIconCell 编辑", min: 0.1 })
    cellScale = 0.85;
    @property({ tooltip: "动态滚动内容底部留白；代码只更新 Content 高度，不覆盖其宽度和锚点", min: 0 })
    contentPaddingBottom = 16;
    @property({ tooltip: "弹窗最大屏宽占比；适配仅控制根节点缩放/位置及 Backdrop 位置/尺寸", range: [0.1, 1] })
    maxWidthRatio = 0.94;
    @property({ tooltip: "弹窗最大屏高占比；设计尺寸读取根节点 UITransform", range: [0.1, 1] })
    maxHeightRatio = 0.80;

    private actions: FormationActions | null = null;
    private catalog: HeroCatalog | null = null;
    private state: FormationState | null = null;
    private elem = 0;
    private done = false;
    private presented = false;

    onOpen(args?: FormationRequest): void {
        this.args = args;
        this.presented = false;
        if (!args) throw new Error(PREFAB + " / FormationView: 缺少打开参数 FormationRequest");
        this.validateBindings();
        this.done = false;
        this.elem = 0;
        this.state = null;
        view.on("canvas-resize", this.fit, this);
        this.fit();
        this.presented = true;
    }

    private validateBindings(): void {
        const fields = { closeButton: this.closeButton, confirmButton: this.confirmButton, titleLabel: this.titleLabel,
            tipLabel: this.tipLabel, countLabel: this.countLabel, grid: this.grid, scrollContent: this.scrollContent,
            scrollPort: this.scrollPort, scrollView: this.scrollView, filterMark: this.filterMark, cellPrefab: this.cellPrefab,
            panelBounds: this.panelBounds, backdropButton: this.backdropButton, backdropBounds: this.backdropBounds };
        for (const [field, value] of Object.entries(fields)) {
            if (!value) throw new Error(PREFAB + " / FormationView: 缺失绑定 " + field);
        }
        if (this.elementButtons.length !== 6 || this.elementButtons.some(button => !button))
            throw new Error(PREFAB + " / FormationView: elementButtons 必须绑定全部六个元素按钮");
        if (this.slots.length !== 9 || this.slots.some(slot => !slot))
            throw new Error(PREFAB + " / FormationView: slots 必须绑定九个 FormationSlotView");
        this.slots.forEach(slot => slot.validateBindings());
        const cellData = this.cellPrefab!.data as Node | null;
        const cellView = cellData?.getComponent(HeroIconCellView);
        if (!cellView || !cellData?.getComponent(UITransform))
            throw new Error("assets/prefabs/ui/hero/HeroIconCell.prefab: 缺少 HeroIconCellView 或 UITransform");
        cellView.validateBindings();
        if (new Set(this.slots.map(slot => slot.position)).size !== 9)
            throw new Error(PREFAB + " / FormationView: slots 的 position 必须为不重复的 1–9");
        if (this.scrollContent!.parent !== this.scrollPort || this.grid!.parent !== this.scrollContent || this.scrollView!.content !== this.scrollContent)
            throw new Error(PREFAB + " / FormationView: 需要 scroll_view_backpack/view/content/FormGrid 层级及对应 ScrollView.content");
        if (!this.scrollContent!.getComponent(UITransform) || !this.scrollPort!.getComponent(UITransform))
            throw new Error(PREFAB + " / FormationView: scrollContent/scrollPort 缺少 UITransform");
        if (!this.scrollPort!.getComponent(Mask))
            throw new Error(PREFAB + " / FormationView: scrollPort 缺少 Prefab 中的 Mask");
        if (this.panelBounds!.node !== this.node || this.backdropBounds!.node !== this.backdropButton!.node)
            throw new Error(PREFAB + " / FormationView: panelBounds 或 backdropBounds 绑定到错误节点");
        if (this.filterMark!.parent !== this.elementButtons[0].node.parent)
            throw new Error(PREFAB + " / FormationView: filterMark 与元素按钮必须同属一个父节点");
        if (!(Number.isInteger(this.columns) && this.columns > 0 && this.cellStep.x > 0 && this.cellStep.y > 0 && this.cellScale > 0 && this.contentPaddingBottom >= 0))
            throw new Error(PREFAB + " / FormationView: Inspector 列数、间距或 Cell 缩放参数无效");
        if (!(this.panelBounds!.width > 0 && this.panelBounds!.height > 0 && this.maxWidthRatio > 0 && this.maxWidthRatio <= 1 && this.maxHeightRatio > 0 && this.maxHeightRatio <= 1))
            throw new Error(PREFAB + " / FormationView: Inspector 设计尺寸或适配占比无效");
    }

    /** The only screen adapter. Static child transforms, labels, Mask and ScrollView are untouched. */
    private fit(): void {
        const visible = view.getVisibleSize();
        const panel = this.panelBounds!;
        const scale = Math.min(visible.width * this.maxWidthRatio / panel.width, visible.height * this.maxHeightRatio / panel.height);
        const localScale = scale / ancestorScale(this.node);
        this.node.setScale(localScale, localScale, 1);
        this.node.setPosition((panel.anchorX - 0.5) * panel.width * localScale, (panel.anchorY - 0.5) * panel.height * localScale, 0);
        this.backdropBounds!.node.setPosition((0.5 - panel.anchorX) * panel.width, (0.5 - panel.anchorY) * panel.height, 0);
        this.backdropBounds!.setContentSize(visible.width / scale, visible.height / scale);
    }

    bind(actions: FormationActions, catalog: HeroCatalog): () => void {
        this.actions = actions;
        this.catalog = catalog;
        const off: Array<() => void> = [];
        const bind = (button: Button, run: () => void) => {
            button.node.on(Button.EventType.CLICK, run);
            off.push(() => button.node.off(Button.EventType.CLICK, run));
        };
        bind(this.closeButton!, () => actions.cancel());
        bind(this.backdropButton!, () => actions.cancel());
        bind(this.confirmButton!, () => actions.confirm());
        this.elementButtons.forEach((button, index) => bind(button, () => {
            this.elem = index;
            if (this.state) this.render(this.state);
            this.scrollView!.scrollToTop(0);
        }));
        this.slots.forEach(slot => bind(slot.button!, () => actions.remove(slot.position)));
        return () => { off.forEach(dispose => dispose()); this.actions = null; };
    }

    render(state: FormationState): void {
        this.state = state;
        this.tipLabel!.string = state.message;
        this.countLabel!.string = "已上阵 " + state.lineup.slots.length + " / 7";
        this.confirmButton!.interactable = !state.busy;
        const selected = this.elementButtons[this.elem].node;
        this.filterMark!.setPosition(selected.position.x, selected.position.y, 0);
        this.elementButtons.forEach(button => { button.interactable = !state.busy; });
        for (const child of this.grid!.children.slice()) {
            child.removeFromParent();
            child.destroy();
        }
        const heroes = state.heroes.filter(hero => !this.elem || this.catalog!.find(hero.templateId)?.elem === this.elem);
        let cellHeight = 0;
        heroes.forEach((hero, index) => {
            const face = this.catalog!.find(hero.templateId);
            const cell = spawnPrefab(this.cellPrefab!, this.grid!);
            cell.setPosition(this.firstCellPosition.x + index % this.columns * this.cellStep.x,
                this.firstCellPosition.y - Math.floor(index / this.columns) * this.cellStep.y, 0);
            cell.setScale(cell.scale.x * this.cellScale, cell.scale.y * this.cellScale, cell.scale.z);
            const component = cell.getComponent(HeroIconCellView);
            const bounds = cell.getComponent(UITransform);
            if (!component || !bounds) throw new Error("assets/prefabs/ui/hero/HeroIconCell.prefab: 缺少 HeroIconCellView 或 UITransform");
            cellHeight = Math.max(cellHeight, bounds.height * Math.abs(cell.scale.y));
            component.show({ kind: "owned", hero: null, name: face?.name || String(hero.templateId), showName: true,
                face: face?.icon || null, elem: face?.elem || null, level: hero.level, stars: hero.star, locked: false,
                deployed: state.lineup.slots.some(slot => slot.heroId === hero.id) }, state.busy ? null : () => this.actions?.toggle(hero.id));
        });
        const content = this.scrollContent!.getComponent(UITransform)!;
        const port = this.scrollPort!.getComponent(UITransform)!;
        const rows = Math.ceil(heroes.length / this.columns);
        const height = rows ? -this.grid!.position.y - this.firstCellPosition.y + (rows - 1) * this.cellStep.y + cellHeight / 2 + this.contentPaddingBottom : 0;
        content.setContentSize(content.width, Math.max(port.height, height));
        this.slots.forEach(slotView => {
            const slot = state.lineup.slots.find(row => row.position === slotView.position);
            const hero = state.heroes.find(row => row.id === slot?.heroId);
            const face = hero ? this.catalog!.find(hero.templateId) : null;
            slotView.show(MAIN_POSITIONS.includes(slotView.position as any), state.busy, hero ? face?.name || String(hero.templateId) : null, face?.icon || null);
        });
    }

    complete(confirmed: boolean): void {
        if (this.done) return;
        this.done = true;
        this.args?.complete(confirmed);
        this.close();
    }

    onClose(): void {
        view.off("canvas-resize", this.fit, this);
        if (this.presented && !this.done) { this.done = true; this.args?.complete(false); }
        this.presented = false;
        this.state = null;
    }
}
