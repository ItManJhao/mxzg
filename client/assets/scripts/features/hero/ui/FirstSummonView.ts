/** 普通免费首抽窗口：显示服务器资格、待确认状态和背包积分，只将点击意图交给应用。 */
import { _decorator, Button, Label, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { FirstSummonController } from "../FirstSummonController";
import type { FirstSummonModel } from "../FirstSummonModel";

const { ccclass, property } = _decorator;

/** 应用提供的只读资格与原请求动作。 */
export interface FirstSummonArgs {
    /** 当前角色权威资格与操作进度的唯一来源。 */
    readonly model: FirstSummonModel;
    /** 由应用登记或恢复原免抽请求，关闭窗口不取消。 */
    requestSummon(): void;
}

@UIRegistry.view({
    id: "first-summon",
    prefab: "bundles/module/hero/prefabs/FirstSummonView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("FirstSummonView")
export class FirstSummonView extends BaseView<FirstSummonArgs> {
    /** 预制体面板尺寸，用于统一等比适配。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 关闭当前召唤窗口，不修改待确认请求。 */
    @property(Button) closeButton: Button | null = null;
    /** 只允许首抽或恢复原结果。 */
    @property(Button) summonButton: Button | null = null;
    /** 根据同步状态显示本次提交或恢复动作。 */
    @property(Label) summonLabel: Label | null = null;
    /** 显示首次免费资格或当前确认进度。 */
    @property(Label) stateLabel: Label | null = null;
    /** 显示统一背包Model已同步的积分余量。 */
    @property(Label) pointsLabel: Label | null = null;

    /** 校验静态布局并登记关闭、点击及可见区域监听。 */
    public onBind(): void {
        if (!this.panel || !this.closeButton || !this.summonButton || !this.summonLabel || !this.stateLabel || !this.pointsLabel) {
            throw new Error("FirstSummonView.prefab 缺少普通首抽界面绑定");
        }
        const close = this.closeButton.node;
        const summon = this.summonButton.node;
        close.on(Button.EventType.CLICK, this.close, this);
        summon.on(Button.EventType.CLICK, this.summon, this);
        this.ownListener(() => {
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
            if (summon.isValid) {
                summon.off(Button.EventType.CLICK, this.summon, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
    }

    /** 打开时读取已接纳的Model并监听同帧资格、积分变化，不查询库存。 */
    public onOpen(args?: FirstSummonArgs): void {
        if (!args?.model || typeof args.requestSummon !== "function") {
            throw new Error("普通召唤缺少状态或操作入口");
        }
        this.args = args;
        this.ownListener(EventDispatcher.instance.on("first-summon.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.render));
        this.render();
    }

    /** 放开本窗对模块的引用；BaseView负责释放显示期监听。 */
    public onClose(): void {
        this.args = undefined;
    }

    /** 使用统一可见区域工具适配窗体，保持预制体内部节点位置。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 权威资格与原意图独立显示；已用过免费资格仍可恢复同一请求的原结果。 */
    private render(): void {
        const data = this.args?.model.snapshot;
        if (!data) {
            return;
        }
        const eligible = data.state?.firstNormalCompleted === false;
        const canRestore = data.requestId !== null;
        this.summonButton!.node.active = canRestore || eligible;
        this.summonButton!.interactable = !data.busy && (canRestore || eligible);
        this.summonLabel!.string = canRestore ? "恢复结果" : "免费召唤";
        if (data.busy) {
            this.stateLabel!.string = "正在确认召唤状态";
        } else if (canRestore) {
            this.stateLabel!.string = "有一份召唤结果待确认";
        } else if (!data.state) {
            this.stateLabel!.string = "等待服务器同步免费资格";
        } else {
            this.stateLabel!.string = eligible ? "首次普通召唤免费" : "首次普通召唤已完成";
        }
        const bag = BagModel.instance;
        this.pointsLabel!.string = "召唤积分 " + (bag.snapshot.synced ? String(bag.quantity(FirstSummonController.POINT_ITEM_ID)) : "—");
    }

    /** 只转交已启用的按钮意图，应用及服务器仍会核对原请求及资格。 */
    private summon(): void {
        if (this.summonButton?.interactable) {
            this.args?.requestSummon();
        }
    }
}
