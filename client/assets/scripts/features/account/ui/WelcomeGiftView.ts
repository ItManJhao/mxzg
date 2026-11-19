/**
 * 主城新手赠礼窗口，按策划配置预览奖励，领取提交给 RoleController。
 * 领取资格和实际到账由服务器确认，到账反馈使用通用奖励窗。
 */
import { _decorator, Button, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { RewardRow } from "../../reward/data/RewardData";
import type { AccountModel } from "../AccountModel";
import { RoleController, WelcomeGiftFinished } from "../RoleController";

const { ccclass, property } = _decorator;

/** 主城传入角色快照和发包入口。 */
interface WelcomeGiftArgs {
    /** 唯一角色快照，资格变化时决定是否关闭。 */
    readonly model: AccountModel;
    /** 向当前角色提交一次领取指令。 */
    readonly controller: RoleController;
}

@UIRegistry.view({
    id: "welcome-gift",
    prefab: "bundles/module/login/prefabs/WelcomeGiftView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("WelcomeGiftView")
export class WelcomeGiftView extends BaseView<WelcomeGiftArgs> {
    /** 预制体中的面板尺寸，用于窄屏等比缩放。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 横向展示策划表中的原始条目。 */
    @property(SuperScroll) rewards: SuperScroll | null = null;
    /** 领取按钮，收到响应前保持禁用。 */
    @property(Button) claimButton: Button | null = null;

    /** 主城收到可领状态时打开子窗口，随主城关闭。 */
    public static openFor(owner: BaseView<unknown>, model: AccountModel, controller: RoleController): void {
        const ui = UIManager.instance;
        void ui.openChild(owner, WelcomeGiftView, { model, controller }).then(view => {
            if (ui.ownsChild(owner, view) && model.snapshot.role?.welcomeGiftAvailable !== true) {
                view.close();
            }
        }).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                ui.toast("新手赠礼窗口打开失败");
            }
        });
    }

    /** 填充只读奖励列表，领取成功后按权威快照关闭窗口。 */
    public onOpen(args?: WelcomeGiftArgs): void {
        const { panel, rewards, claimButton } = this;
        if (!args || !panel || !rewards || !claimButton) {
            throw new Error("新手赠礼窗口缺少预制体绑定");
        }
        if (args.model.snapshot.role?.welcomeGiftAvailable !== true) {
            return;
        }
        const list = rewards.list;
        list.node.on(SuperContent.RENDER_ITEM, this.renderReward, this);
        claimButton.node.on(Button.EventType.CLICK, this.claim, this);
        this.ownListener(() => {
            list.node.off(SuperContent.RENDER_ITEM, this.renderReward, this);
            claimButton.node.off(Button.EventType.CLICK, this.claim, this);
        });
        this.ownListener(EventDispatcher.instance.on(WelcomeGiftFinished, this, () => {
            claimButton.interactable = true;
        }));
        this.ownListener(args.model.subscribe(state => {
            if (state.role?.welcomeGiftAvailable !== true) {
                this.close();
            }
        }));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        claimButton.interactable = true;
        list.setData(this.readRewards());
        rewards.toStart();
    }

    /** 同一份配置保留四笔钻石的原始显示顺序，实际到账由服务器汇总。 */
    private readRewards(): RewardRow[] {
        const { rows } = GameConfig.instance.getFileByPath("config/system") as {
            rows: readonly { key: string; value: unknown }[];
        };
        const value = rows.find(row => row.key === "guide_initial_reward")?.value;
        if (typeof value !== "string") {
            throw new Error("缺少新手赠礼配置 guide_initial_reward");
        }
        const items = JSON.parse(value) as { item_type: number; item_num: number }[];
        return items.map(item => ({ itemId: item.item_type, quantity: item.item_num }));
    }

    /** 复用通用背包格子显示本次预览数量。 */
    private renderReward(node: Node, item: RewardRow): void {
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("新手赠礼格子缺少 BagItemView");
        }
        cell.show(item, false, BagItemCatalog.face(item.itemId, item.quantity), false);
    }

    /** 在手机可见区内等比调整面板，维持列表宽度和内部布局。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 当前角色仍可领取时才提交，等待回包期间忽略连点。 */
    private claim(): void {
        if (!this.claimButton!.interactable || this.args?.model.snapshot.role?.welcomeGiftAvailable !== true) {
            return;
        }
        this.claimButton!.interactable = false;
        this.args.controller.claimWelcomeGift();
    }
}
