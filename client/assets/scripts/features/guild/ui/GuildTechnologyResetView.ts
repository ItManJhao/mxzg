/**
 * 公会科技重置确认。展示打开时的职业、服务器费用及原资源返还。
 * 确认前检查同一个科技版本，操作由公会科技控制器执行并统一同步角色资产。
 */
import { _decorator, Button, Color, Label, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { GuildTechnologyBranch } from "../../../platform/Protocol";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { GuildModel } from "../GuildModel";
import { GuildTechnologyController } from "../GuildTechnologyController";
import { GuildTechnologyModel } from "../GuildTechnologyModel";
import type { GuildTechnologyArgs } from "./GuildTechnologyView";

const { ccclass, property } = _decorator;

/** 重置确认仅在原公会与原科技版本下有效。 */
interface GuildTechnologyResetArgs extends GuildTechnologyArgs {
    /** 只重置玩家选中的一系。 */
    readonly profession: number;
    /** 打开确认窗时服务器给出的进度版本。 */
    readonly version: number;
}

/** 返还项按旧确认窗顺序显示公会勋章和金币。 */
const REFUND_IDS = [901301, 900001] as const;

@UIRegistry.view({
    id: "guild-technology-reset",
    prefab: "bundles/module/guild/prefabs/GuildTechnologyResetView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildTechnologyResetView")
export class GuildTechnologyResetView extends BaseView<GuildTechnologyResetArgs> {
    /** 静态确认框，用于窄屏等比缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 右上关闭键；不发送写请求。 */
    @property(Button) private closeButton: Button | null = null;
    /** 提交原职业的重置报价，重试时继续恢复原请求。 */
    @property(Button) private confirmButton: Button | null = null;
    /** 操作按钮中显示确认或恢复。 */
    @property(Label) private confirmLabel: Label | null = null;
    /** 结合原职业名提示具体重置范围。 */
    @property(Label) private description: Label | null = null;
    /** 服务端当前重置所需钻石。 */
    @property(Label) private diamondLabel: Label | null = null;
    /** 两类返还物可打开同源道具信息。 */
    @property([Button]) private refundButtons: Button[] = [];
    /** 背包格式的返还数量显示，按原消耗比例由服务端计算。 */
    @property([Label]) private refundLabels: Label[] = [];

    /** 绑定本次报价和钱包状态，在其他页更新科技后自动结束旧报价。 */
    public onOpen(args?: GuildTechnologyResetArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.closeButton || !this.confirmButton || !this.confirmLabel
            || !this.description || !this.diamondLabel || this.refundButtons.length !== 2 || this.refundLabels.length !== 2) {
            throw new Error("公会科技重置缺少报价或窗口绑定");
        }
        const profession = GameConfig.instance.getConfig(GConfig.Language, 111000 + args.profession)?.value ?? "该职业";
        this.description.string = `重置${profession}科技，所有技能将恢复至未点亮状态。\n消耗钻石，并返还以下资源。`;
        this.onClick(this.closeButton, () => this.close());
        this.onClick(this.confirmButton, () => this.confirm());
        this.refundButtons.forEach((button, index) => this.onClick(button, () => this.describeRefund(index)));
        this.ownListener(EventDispatcher.instance.on("guild.technology.updated", this, this.paint));
        this.ownListener(EventDispatcher.instance.on("guild.updated", this, this.paint));
        this.ownListener(args.account.subscribe(() => this.paint()));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.paint();
    }

    /** 以完整纸面大小适配可见区，保留原窗口构图。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 开窗绑定的按钮在本次显示结束后解除。 */
    private onClick(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 当前公会和原科技版本仍相同且该职业有进度时，返回实际返还。 */
    private currentBranch(): GuildTechnologyBranch | undefined {
        const state = GuildTechnologyModel.instance.state;
        if (!state?.member || state.version !== this.args?.version
            || GuildModel.instance.snapshot?.guild?.id !== this.args.guildId) {
            return undefined;
        }
        return state.branches.find(branch => branch.profession === this.args?.profession && branch.step > 0);
    }

    /** 同步余额与按钮；重置落地或被其他请求更新后关闭过期确认页。 */
    private paint(): void {
        const branch = this.currentBranch();
        const state = GuildTechnologyModel.instance.state;
        if (!branch || !state) {
            this.close();
            return;
        }
        const controller = GuildTechnologyController.instance;
        const balance = this.args?.account.snapshot.role?.diamonds ?? 0;
        this.diamondLabel!.string = String(state.resetDiamonds);
        this.diamondLabel!.color = balance < state.resetDiamonds ? new Color(233, 91, 72) : new Color(255, 246, 221);
        const amounts = [branch.refundMedals, branch.refundGold];
        this.refundLabels.forEach((label, index) => {
            label.string = String(amounts[index]);
            this.refundButtons[index].node.active = amounts[index] > 0;
        });
        this.confirmButton!.interactable = !controller.busy || controller.needsRetry;
        this.confirmLabel!.string = controller.needsRetry ? "重试" : "确定";
    }

    /** 余额和报价均在点击时读取；服务端提交时再次校验同一版本。 */
    private confirm(): void {
        const controller = GuildTechnologyController.instance;
        if (controller.needsRetry) {
            controller.refreshVisible();
            return;
        }
        const branch = this.currentBranch();
        const state = GuildTechnologyModel.instance.state;
        if (!branch || !state || controller.busy) {
            return;
        }
        if ((this.args?.account.snapshot.role?.diamonds ?? 0) < state.resetDiamonds) {
            UIManager.instance.toast("钻石不足");
            return;
        }
        controller.reset(branch.profession, state.version);
    }

    /** 返还图标沿用已有物品说明窗。 */
    private describeRefund(index: number): void {
        const branch = this.currentBranch();
        if (!branch) {
            return;
        }
        const quantity = index === 0 ? branch.refundMedals : branch.refundGold;
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description", face: BagItemCatalog.face(REFUND_IDS[index], quantity),
        }).catch(() => { /* UIManager 负责反馈开窗失败。 */ });
    }
}
