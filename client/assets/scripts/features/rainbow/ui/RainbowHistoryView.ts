/**
 * 彩虹圣殿当前神位的历史弹窗。从控制器读取真实记录，
 * SuperScroll 管理滚动与回收，窗口关闭时拒绝迟到展示。
 */
import { _decorator, Button, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RainbowHistory } from "../../../platform/Protocol";
import { RainbowController } from "../RainbowController";
import { RainbowHistoryCell } from "./RainbowHistoryCell";
import { RainbowPresentationUtils } from "../utils/RainbowPresentationUtils";

const { ccclass, property } = _decorator;

/** 一个神位的只读记录，点击后让页面打开共同的回放宿主。 */
export interface RainbowHistoryArgs {
    /** 查询历史时使用的权威座次 ID。 */
    readonly seatId: number;
    /** 点击某一条实际场次后转交给主页。 */
    readonly replay: (battleId: string, stillOpen: () => boolean) => void;
}

@UIRegistry.view({
    id: "rainbow-history", prefab: "bundles/module/rainbow/prefabs/RainbowHistoryView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RainbowHistoryView")
export class RainbowHistoryView extends BaseView<RainbowHistoryArgs> {
    /** 记录窗口静态主体。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭记录而不变更下方神位。 */
    @property(Button) private closeButton: Button | null = null;
    /** 虚拟化旧挑战记录。 */
    @property(SuperScroll) private entries: SuperScroll | null = null;
    /** 关闭后不再处理已在途的历史返回。 */
    private openForHistory = false;

    /** 绑定本次窗口和关页生命周期，按当前神位请求历史记录。 */
    public onOpen(args?: RainbowHistoryArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.closeButton || !this.entries) {
            throw new Error("彩虹圣殿挑战记录绑定不完整");
        }
        this.openForHistory = true;
        this.entries.validateBindings();
        this.ownListener(RainbowPresentationUtils.bindButton(this.closeButton, () => this.close()));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => RainbowPresentationUtils.fitPanel(this.node, this.panel!)));
        RainbowController.instance.loadHistory(args.seatId, history => this.paint(history));
    }

    /** 关闭后停止显示网络返回，持久记录仍归模块。 */
    public onClose(): void {
        this.openForHistory = false;
    }

    /** 现实中未发生挑战的神位显示原版空白；记录点击只播放相应场次。 */
    private paint(history: RainbowHistory): void {
        if (!this.openForHistory || this.args?.seatId !== history.seatId) {
            return;
        }
        this.entries!.list.setData(history.records, (node, row) => {
            node.getComponent(RainbowHistoryCell)!.render(row, () => {
                if (this.openForHistory && !RainbowController.instance.busy) {
                    this.args?.replay(row.battleId, () => this.openForHistory);
                }
            });
        });
    }
}
