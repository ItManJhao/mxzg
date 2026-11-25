/** 原竞技场战报弹窗。列表来自当前已认证竞技场状态，重播只读取冻结结果。 */
import { _decorator, Button, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ArenaController } from "../ArenaController";
import { ArenaModel, type ArenaHistory } from "../ArenaModel";
import { ArenaEntryCell } from "./ArenaEntryCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "arena-history",
    prefab: "bundles/module/arena/prefabs/ArenaHistoryView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ArenaHistoryView")
export class ArenaHistoryView extends BaseView {
    /** 旧色卡整体随视口缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭记录并回到竞技场。 */
    @property(Button) private closeButton: Button | null = null;
    /** 重用竞技场列表项，数据只取真实场次。 */
    @property(SuperScroll) private entries: SuperScroll | null = null;

    /** 当前窗口绑定返回键、视口与最新战报索引。 */
    public onOpen(): void {
        this.entries!.validateBindings();
        const closeNode = this.closeButton!.node;
        closeNode.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (closeNode.isValid) {
                closeNode.off(Button.EventType.CLICK, this.close, this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("arena.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fit.bind(this)));
        this.paint();
    }

    /** 固定窗框比例，宽度不足时把整窗收进安全区域。 */
    private fit(): void {
        const visible = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, visible.width / panel.width, visible.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 历史行选择后关闭此窗，保持下方竞技场负责播放。 */
    private paint(): void {
        const records = ArenaModel.instance.state?.history ?? [];
        this.entries!.list.setData<ArenaHistory>(records, (node, record) => {
            node.getComponent(ArenaEntryCell)!.render(record, !ArenaController.instance.busy, () => {
                if (!ArenaController.instance.busy) {
                    this.close();
                    ArenaController.instance.replay(record);
                }
            });
        });
    }
}
