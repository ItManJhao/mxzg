/** 契约阵型选择窗：展示旧版阵型和普通站位配置，确认只向父页交付草稿意图。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { FormationMatrixUtils, type FormationMatrixEntry } from "../utils/FormationMatrixUtils";
import { FormationMatrixCellView } from "./FormationMatrixCellView";

const { ccclass, property } = _decorator;

/** 父页草稿和服务器解锁列表的显示参数，保存意图留给父页。 */
export interface FormationMatrixArgs {
    /** 父页当前草稿中的阵型 ID。 */
    readonly formationId: number;
    /** 当前角色由服务端确认的已解锁阵型。 */
    readonly unlockedIds: readonly number[];
    /** 确认时回传解锁的阵型 ID，由父页再次校验。 */
    readonly onConfirm: (formationId: number) => void;
}

@UIRegistry.view({
    id: "formation-matrix",
    prefab: "bundles/module/hero/prefabs/FormationMatrixView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("FormationMatrixView")
export class FormationMatrixView extends BaseView<FormationMatrixArgs> {
    /** 固定版式的内容面板，用于窄屏和短屏下整窗等比缩放。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 旧版横向阵型列表，格子与遮罩在预制体绑定。 */
    @property(SuperScroll) matrices: SuperScroll | null = null;
    /** 退出选择并丢弃正在预览的阵型。 */
    @property(Button) closeButton: Button | null = null;
    /** 确认已解锁的阵型，锁定时隐藏。 */
    @property(Button) confirmButton: Button | null = null;
    /** 锁定阵型的完整解锁要求。 */
    @property(Label) requirementLabel: Label | null = null;
    /** 按服务器阵位编号 1 至 8 排列的普通格关闭标记。 */
    @property([Node]) slotLocks: Node[] = [];
    /** 对应 1 至 8 号普通格的属性加成文本。 */
    @property([Label]) slotBonuses: Label[] = [];
    /** 当前被查看的阵型，关闭时清空，只有确认才传回父页。 */
    private selected: FormationMatrixEntry | null = null;

    /** 校验预制体并登记本窗的列表、按钮和视口监听。 */
    public onBind(): void {
        if (!this.panel || !this.matrices || !this.closeButton || !this.confirmButton || !this.requirementLabel
            || this.slotLocks.length !== 8 || this.slotBonuses.length !== 8
            || this.slotLocks.some(slot => !slot) || this.slotBonuses.some(label => !label)) {
            throw new Error("FormationMatrixView.prefab 缺少窗口或普通阵位绑定");
        }
        this.matrices.validateBindings();
        const list = this.matrices.list;
        const template = list.cellPrefab!.data as Node;
        const cell = template.getComponent(FormationMatrixCellView);
        if (!cell || !template.getComponent(Button)) {
            throw new Error("FormationMatrixCellView.prefab 缺少阵型格或按钮组件");
        }
        cell.validateBindings();
        list.node.on(SuperContent.RENDER_ITEM, this.renderCell, this);
        list.node.on(SuperContent.SELECT_ITEM, this.select, this);
        this.closeButton.node.on(Button.EventType.CLICK, this.close, this);
        this.confirmButton.node.on(Button.EventType.CLICK, this.confirm, this);
        this.ownListener(() => {
            if (list.node.isValid) {
                list.node.off(SuperContent.RENDER_ITEM, this.renderCell, this);
                list.node.off(SuperContent.SELECT_ITEM, this.select, this);
            }
            if (this.closeButton?.isValid) {
                this.closeButton.node.off(Button.EventType.CLICK, this.close, this);
            }
            if (this.confirmButton?.isValid) {
                this.confirmButton.node.off(Button.EventType.CLICK, this.confirm, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
    }

    /** 默认预览父页当前阵型，从已加载配置读取完整列表。 */
    public onOpen(args?: FormationMatrixArgs): void {
        if (!args || !args.unlockedIds.includes(args.formationId) || typeof args.onConfirm !== "function") {
            throw new Error("契约阵型窗口缺少当前阵型或解锁列表");
        }
        const entries = FormationMatrixUtils.list();
        const current = entries.find(entry => entry.id === args.formationId);
        if (!current) {
            throw new Error("契约阵型窗口缺少当前阵型配置 " + args.formationId);
        }
        this.args = args;
        this.selected = current;
        this.matrices!.list.setData(entries);
        this.matrices!.toStart();
        this.paintPreview(current);
    }

    /** 关闭即丢弃选择和父页回调，释放复用格和它持有的图片。 */
    public onClose(): void {
        this.selected = null;
        this.args = undefined;
        if (this.matrices?.isValid && this.matrices.content?.isValid) {
            this.matrices.list.setData([]);
        }
    }

    /** 保持预制体布局，只按当前可见区域统一缩放内容面板。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 用展开时的服务端解锁状态和当前选择重绘复用格。 */
    private renderCell(node: Node, entry: FormationMatrixEntry): void {
        const args = this.args;
        if (!args) {
            return;
        }
        node.getComponent(FormationMatrixCellView)!.show(entry, args.unlockedIds.includes(entry.id),
            args.formationId === entry.id, this.selected?.id === entry.id);
    }

    /** 锁定阵型也可预览，列表只刷新标记而不打断已滚动的位置。 */
    private select(entry: FormationMatrixEntry): void {
        if (!this.args || this.selected?.id === entry.id) {
            return;
        }
        this.selected = entry;
        this.paintPreview(entry);
        this.matrices!.list.refreshVisible(true);
    }

    /** 显示旧版八个普通站位；助战资格和活动阵容仍由服务器下发。 */
    private paintPreview(entry: FormationMatrixEntry): void {
        const unlocked = this.args!.unlockedIds.includes(entry.id);
        this.confirmButton!.node.active = unlocked;
        this.requirementLabel!.node.active = !unlocked;
        this.requirementLabel!.string = entry.requirement;
        for (const slot of entry.slots) {
            if (slot.position > this.slotLocks.length) {
                continue;
            }
            const index = slot.position - 1;
            this.slotLocks[index].active = !slot.open;
            this.slotBonuses[index].string = slot.open ? slot.bonus : "";
        }
    }

    /** 只有已解锁阵型可以确认。先结束选择意图，再同步交回一次给父页。 */
    private confirm(): void {
        const args = this.args;
        const selection = this.selected;
        if (!args || !selection || !args.unlockedIds.includes(selection.id)) {
            return;
        }
        this.args = undefined;
        this.close();
        args.onConfirm(selection.id);
    }
}
