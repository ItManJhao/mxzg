/**
 * 英雄图鉴的进化目录，按旧配置展示五个元素的进化条目。
 * 滚动和选中样式由 Prefab 持有，选中后打开只读预览，不创建英雄实例。
 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { HeroIllustrationUtils, type HeroIllustrationEntry } from "../utils/HeroIllustrationUtils";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroIllustrationView } from "./HeroIllustrationView";
import { HeroListPresentation, type HeroIllustrationCellModel } from "./HeroListPresentation";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-evolution-catalog",
    prefab: "bundles/module/hero/prefabs/HeroEvolutionCatalogView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroEvolutionCatalogView")
export class HeroEvolutionCatalogView extends BaseView {
    /** 原尺寸面板用于整体等比适配。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭图鉴，保留背后的元素与滚动位置。 */
    @property(Button) private closeButton: Button | null = null;
    /** 图鉴五元素按钮，按火、水、风、光、暗绑定。 */
    @property([Button]) private elements: Button[] = [];
    /** 按同样顺序绑定按钮的亮色外框。 */
    @property([Node]) private selection: Node[] = [];
    /** 四列虚拟头像格，大小和间距由 Prefab 决定。 */
    @property(SuperScroll) private entries: SuperScroll | null = null;
    /** 当前元素确实没有配置时显示。 */
    @property(Label) private emptyLabel: Label | null = null;
    /** 本次窗口的当前数据，点击时传给详情用作翻页顺序。 */
    private rows: readonly HeroIllustrationEntry[] = [];

    /** 每次打开先展示火系，关闭时清理局部事件。 */
    public onOpen(): void {
        if (!this.panel || !this.closeButton || !this.entries || !this.emptyLabel
            || this.elements.length !== 5 || this.selection.length !== 5) {
            throw new Error("进化图鉴缺少面板、五元素或列表绑定");
        }
        this.entries.validateBindings();
        const closeNode = this.closeButton.node;
        closeNode.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (closeNode.isValid) {
                closeNode.off(Button.EventType.CLICK, this.close, this);
            }
        });
        this.elements.forEach((button, index) => {
            const select = () => this.showElement(index + 1);
            button.node.on(Button.EventType.CLICK, select);
            this.ownListener(() => {
                if (button.node.isValid) {
                    button.node.off(Button.EventType.CLICK, select);
                }
            });
        });
        const list = this.entries.list.node;
        list.on(SuperContent.RENDER_ITEM, this.showCell, this);
        list.on(SuperContent.SELECT_ITEM, this.openDetail, this);
        this.ownListener(() => {
            if (list.isValid) {
                list.targetOff(this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.resize()));
        this.showElement(1);
    }

    /** 元素变更后以配置数据重绘头像，回到所选元素的第一行。 */
    private showElement(element: number): void {
        this.rows = HeroIllustrationUtils.evolutions(element);
        this.selection.forEach((node, index) => { node.active = index + 1 === element; });
        this.emptyLabel!.node.active = !this.rows.length;
        this.entries!.list.setData(this.rows.map(entry => HeroListPresentation.illustrationCell(entry)));
        this.entries!.toStart();
    }

    /** 复用名册格的品质框、等级和高星徽章。 */
    private showCell(node: Node, entry: HeroIllustrationCellModel): void {
        node.getComponent(HeroIconCellView)!.show(entry);
    }

    /** 先沿页面导航打开预览，成功后关闭原图鉴弹层。 */
    private openDetail(cell: HeroIllustrationCellModel): void {
        const index = this.rows.indexOf(cell.illustration);
        if (index >= 0) {
            void UIManager.instance.open(HeroIllustrationView, { entries: this.rows, index, evolution: true })
                .then(() => {
                    if (this.node.isValid) {
                        this.close();
                    }
                }).catch(() => { /* 开窗失败由框架报告，保留当前目录。 */ });
        }
    }

    /** 整体缩放原尺寸边框，较窄或较矮的视口仍可操作。 */
    private resize(): void {
        const area = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, area.width * 0.97 / panel.width, area.height * 0.91 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
