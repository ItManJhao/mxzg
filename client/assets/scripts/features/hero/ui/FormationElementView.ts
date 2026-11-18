/** 出阵元素抑制窗，展示草稿对应的克制图和队伍光环，跟随父出阵页关闭。 */
import { _decorator, Label, Node, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { FormationElementGroup, FormationElementPreview } from "../utils/FormationElementUtils";
import { FormationElementCellView } from "./FormationElementCellView";

const { ccclass, property } = _decorator;

/** 预制体克制箭头依次表示火克木、水克火、木克水、暗克光、光克暗。 */
const ARROW_RELATIONS = [[1, 3], [2, 1], [3, 2], [5, 4], [4, 5]] as const;

/** 父页每次更新草稿后提供最新的只读展示数据。 */
export interface FormationElementArgs {
    /** 读取父页已经计算好的克制、档位及总加成。 */
    readonly readPreview: () => FormationElementPreview;
}

@UIRegistry.view({
    id: "formation-element",
    prefab: "bundles/module/hero/prefabs/FormationElementView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("FormationElementView")
export class FormationElementView extends BaseView<FormationElementArgs> {
    /** 内容面板尺寸，短屏只对面板整体缩放。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 各元素档位的纵向列表，布局和裁剪保存在预制体。 */
    @property(SuperScroll) groups: SuperScroll | null = null;
    /** 从元素克制配置得到的命中和伤害说明。 */
    @property(Label) restraintLabel: Label | null = null;
    /** 队伍当前启用的加成汇总；空结果隐藏。 */
    @property(Label) summaryLabel: Label | null = null;
    /** 克制图中的五个方向，根据实际配置结果显隐。 */
    @property([Node]) restraintArrows: Node[] = [];

    /** 校验静态绑定并建立列表和视口监听。 */
    public onBind(): void {
        if (!this.panel || !this.groups || !this.restraintLabel || !this.summaryLabel
                || this.restraintArrows.length !== ARROW_RELATIONS.length
                || this.restraintArrows.some(arrow => !arrow)) {
            throw new Error("FormationElementView.prefab 缺少装配绑定");
        }
        this.groups.validateBindings();
        const list = this.groups.list;
        const template = list.cellPrefab!.data as Node;
        const cell = template.getComponent(FormationElementCellView);
        if (!cell) {
            throw new Error("FormationElementCellView.prefab 缺少档位组组件");
        }
        cell.validateBindings();
        list.node.on(SuperContent.RENDER_ITEM, this.renderGroup, this);
        this.ownListener(() => {
            if (list.node.isValid) {
                list.node.off(SuperContent.RENDER_ITEM, this.renderGroup, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
    }

    /** 首次显示时读取当前草稿，列表从第一条激活组开始展示。 */
    public onOpen(args?: FormationElementArgs): void {
        if (!args || typeof args.readPreview !== "function") {
            throw new Error("元素抑制窗口缺少草稿数据");
        }
        this.args = args;
        this.refresh();
        this.groups!.toStart();
    }

    /** 父页草稿变化时更新同一窗口，列表保留合法的滚动位置。 */
    public refresh(): void {
        const preview = this.args?.readPreview();
        if (!preview) {
            return;
        }
        this.restraintLabel!.string = preview.restraint;
        this.summaryLabel!.string = preview.summary;
        this.summaryLabel!.node.active = !!preview.summary;
        for (const [index, [attacker, defender]] of ARROW_RELATIONS.entries()) {
            this.restraintArrows[index].active = preview.relations.some(rule =>
                rule.attacker === attacker && rule.defender === defender);
        }
        this.groups!.list.setData(preview.groups);
    }

    /** 关闭时释放父页读取回调，清空列表格子的当前数据。 */
    public onClose(): void {
        this.args = undefined;
        if (this.groups?.isValid && this.groups.content?.isValid) {
            this.groups.list.setData([]);
        }
    }

    /** 保留预制体位置关系，让面板适应窄屏和短屏。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 虚拟列表重用一个格子时，完整覆盖该组的标题、档位和激活状态。 */
    private renderGroup(node: Node, group: FormationElementGroup): void {
        node.getComponent(FormationElementCellView)!.show(group);
    }
}
