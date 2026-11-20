/**
 * 个人空间的二次改名窗口。读取同源改名费用和当前库存，
 * 将玩家确认的名字与支付类型交给 RoleController，昵称随服务器快照更新。
 */
import { _decorator, Button, EditBox, Label, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { AccountModel } from "../AccountModel";
import { RoleController, RoleProfileEvent } from "../RoleController";

const { ccclass, property } = _decorator;

/** 改名窗由个人空间持有，显示与顶栏共用的角色资料。 */
interface RoleRenameArgs {
    readonly model: AccountModel;
    readonly controller: RoleController;
}

/** 策划表中的单项消耗，支付类型与角色改名协议一致。 */
interface RenameCost {
    readonly paymentType: 1 | 2;
    readonly item_type: number;
    readonly item_num: number;
}

@UIRegistry.view({
    id: "role-rename",
    prefab: "bundles/module/login/prefabs/RoleRenameView",
    hostId: "remake-modal",
    layer: UILayer.Dialog,
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RoleRenameView")
export class RoleRenameView extends BaseView<RoleRenameArgs> {
    /** 等比适配的改名窗内容，经预制体绑定。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 二次改名的单行输入。 */
    @property(EditBox) input: EditBox | null = null;
    /** 当前选定支付项的道具图标。 */
    @property(Node) costIcon: Node | null = null;
    /** 当前支付项名称及数量。 */
    @property(Label) costLabel: Label | null = null;
    /** 确认显示的费用并提交。 */
    @property(Button) confirmButton: Button | null = null;
    /** 取消改名，返回个人空间。 */
    @property(Button) closeButton: Button | null = null;
    /** 当前已显示并供确认的费用，显示期随库存更新。 */
    private cost: RenameCost | null = null;
    /** 仅在当前窗口提交后阻止重复确认，回包或关闭时清理。 */
    private submitting = false;

    /** 初始化费用和输入，绑定本次窗口的操作、库存更新及回包。 */
    public onOpen(args?: RoleRenameArgs): void {
        if (!args?.model.snapshot.role || !this.panel || !this.input || !this.costIcon
            || !this.costLabel || !this.confirmButton || !this.closeButton) {
            throw new Error("改名窗口缺少角色资料或预制体绑定");
        }
        const confirm = this.confirmButton.node;
        const close = this.closeButton.node;
        confirm.on(Button.EventType.CLICK, this.submit, this);
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            confirm.off(Button.EventType.CLICK, this.submit, this);
            close.off(Button.EventType.CLICK, this.close, this);
        });
        const events = EventDispatcher.instance;
        this.ownListener(events.on(BagEvent.BagUpdate, this, this.renderCost));
        this.ownListener(events.on(RoleProfileEvent.Renamed, this, this.finish));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        this.input.string = "";
        this.renderCost();
    }

    /** 关闭时释放本轮申请状态，按钮和事件由 BaseView 解除。 */
    public onClose(): void {
        this.cost = null;
        this.submitting = false;
    }

    /** 读取同源 system 配置的单条费用，缺失时阻止提交，避免显示错误价格。 */
    private readCost(key: string, paymentType: 1 | 2): RenameCost {
        const table = GameConfig.instance.getFileByPath("config/system") as
            { readonly rows: readonly { readonly key: string; readonly value: unknown }[] };
        const value = table.rows.find(row => row.key === key)?.value;
        if (typeof value !== "string") {
            throw new Error("改名消耗配置缺失");
        }
        const [cost] = JSON.parse(value) as { item_type: number; item_num: number }[];
        if (!cost || !Number.isSafeInteger(cost.item_type) || cost.item_type <= 0
            || !Number.isSafeInteger(cost.item_num) || cost.item_num <= 0) {
            throw new Error("改名消耗配置无效");
        }
        return { ...cost, paymentType };
    }

    /** 有改名卡时优先展示卡，数量不足时展示同源钻石费用。 */
    private renderCost(): void {
        const card = this.readCost("consumption_props", 2);
        const cost = BagModel.instance.quantity(card.item_type) >= card.item_num
            ? card
            : this.readCost("nick_change_cost", 1);
        this.cost = cost;
        const item = GameConfig.instance.requireConfig(GConfig.Item, cost.item_type);
        const icon = BagItemCatalog.iconSource(item);
        if (icon) {
            ResManager.setSprite(this.costIcon!, icon, () => this.cost === cost);
        }
        this.costLabel!.string = (cost.paymentType === 2 ? "改名卡" : "钻石") + " ×" + cost.item_num;
    }

    /** 交付本次已展示的费用类型，最终扣除、重名和长度由服务端判断。 */
    private submit(): void {
        if (this.submitting || !this.cost || !this.args) {
            return;
        }
        const nickname = this.input!.string.trim();
        if (!nickname) {
            UIManager.instance.toast("请输入新名字");
            return;
        }
        if (nickname === this.args.model.snapshot.role?.nickname) {
            UIManager.instance.toast("新名字与当前名字相同");
            return;
        }
        this.submitting = true;
        this.confirmButton!.interactable = false;
        this.args.controller.rename(nickname, this.cost.paymentType);
    }

    /** 成功时返回资料窗；失败保留输入，允许按最新费用重试。 */
    private finish(success: boolean): void {
        if (!this.submitting) {
            return;
        }
        this.submitting = false;
        this.confirmButton!.interactable = true;
        if (success) {
            this.close();
        }
    }

    /** 固定内容使用预制体尺寸，小屏等比适配。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
