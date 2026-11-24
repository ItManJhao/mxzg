/** 幻境之塔层数奖励窗：根据服务端状态列出各档奖励，将领取操作交给塔控制器。 */
import { _decorator, Button, Label, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { TowerController } from "../TowerController";
import { TowerModel, type TowerReward } from "../TowerModel";
import { TowerMilestoneCell } from "./TowerMilestoneCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "tower-milestone",
    prefab: "bundles/module/tower/prefabs/TowerMilestoneView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("TowerMilestoneView")
export class TowerMilestoneView extends BaseView {
    /** 窄屏整体缩放的领奖面板。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 当前服务端确认的最高层数。 */
    @property(Label) private progressLabel: Label | null = null;
    /** 返回塔层列表。 */
    @property(Button) private closeButton: Button | null = null;
    /** 按各档独立渲染并复用格子的奖励列表。 */
    @property(SuperScroll) private milestones: SuperScroll | null = null;

    /** 绑定本次打开期的关闭按钮、最新塔状态与视口变化。 */
    public onOpen(): void {
        if (!this.panel || !this.progressLabel || !this.closeButton || !this.milestones) {
            throw new Error("幻境之塔层数奖励窗绑定不完整");
        }
        const button = this.closeButton.node;
        const close = (): void => this.close();
        button.on(Button.EventType.CLICK, close);
        this.ownListener(() => {
            if (button.isValid) {
                button.off(Button.EventType.CLICK, close);
            }
        });
        this.ownListener(EventDispatcher.instance.on("tower.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fit));
        this.render();
    }

    /** 从服务器状态刷新进度与每档按钮，重试期间由控制器统一禁用领取。 */
    private render = (): void => {
        const model = TowerModel.instance;
        const state = model.state;
        if (!state) {
            this.close();
            return;
        }
        const controller = TowerController.instance;
        this.progressLabel!.string = `最高通关第 ${state.highestCleared} 层`;
        this.milestones!.list.setData(state.milestones, (node, row) => {
            node.getComponent(TowerMilestoneCell)!.render(row, state.highestCleared, controller.busy,
                () => controller.claimMilestone(row.id), reward => this.inspectReward(reward));
        });
    };

    /** 物品图标复用背包描述窗，随本奖励窗一起关闭。 */
    private inspectReward(reward: TowerReward): void {
        const face = BagItemCatalog.face(reward.itemId, reward.quantity);
        void UIManager.instance.openChild(this, BagInfoView, { source: "description", face })
            .catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 让奖品列表和按钮整体保持在可见画布内。 */
    private fit = (): void => {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    };
}
