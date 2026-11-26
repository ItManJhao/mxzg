/**
 * 勇者试炼兑换协议入口。维护一次在途报价或购买、恢复原购买编号并通知界面。
 * 物品与余额由统一资产快照更新，实发资料交应用奖励绑定。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName, type TrialShopBuy, type TrialShopReceipt, type TrialShopState } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import type { RewardBinding } from "../reward/RewardBinding";
import { TrialShopModel } from "./TrialShopModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "trial.shop.updated": void;
    }
}

export class TrialShopController extends BaseController {
    /** 应用统一装配的试炼商店模块实例，独立于地图窗口生命周期。 */
    public static readonly instance = new TrialShopController();
    /** 真实认证请求入口，模块销毁后为空。 */
    private operations: AccountOperations | null = null;
    /** 统一实发提示入口，等对应资产版本提交后再展示。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;
    /** 是否有当前角色的商店窗口，仅用于决定何时读货架。 */
    private visible = false;
    /** 当前连接已有一笔读或写等待结果，完成后释放。 */
    private inFlight = false;
    /** 待确认的原订单。断线保留，成功、明确拒绝或换号后清空。 */
    private pending: TrialShopBuy | null = null;
    /** 原订单中断时设为真，补到历史回执后还需读取当期货架。 */
    private reloadAfterReplay = false;

    /** 购买确认窗在通道繁忙或原订单待恢复期间禁用再次提交。 */
    public get busy(): boolean {
        return this.inFlight || this.pending !== null;
    }

    /** 由应用接入认证通道与统一奖励队列。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 开窗读货架，关窗只停止主动查询。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 认证恢复后补读原订单，即使确认窗已关闭，未结订单也须恢复。 */
    public refreshVisible(): void {
        if (this.visible || this.pending) {
            this.send();
        }
    }

    /** 提交玩家确认的同周货位和份数，定价和余额校验留给服务端。 */
    public buy(offerId: number, count: number, refreshAt: number): void {
        const state = TrialShopModel.instance.snapshot;
        if (!this.isInitialized || this.busy || state?.refreshAt !== refreshAt
                || !state.offers.some(offer => offer.id === offerId) || !Number.isSafeInteger(count) || count <= 0) {
            return;
        }
        this.pending = { requestId: RequestIdUtils.create(), offerId, count, refreshAt };
        this.send();
    }

    /** 真实读写回包提交唯一货架；成交按原回执恢复奖励。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        const model = TrialShopModel.instance;
        const reload = protocol === Protocol.TRIAL_SHOP_BUY && this.reloadAfterReplay;
        switch (protocol) {
            case Protocol.TRIAL_SHOP:
                model.commit(data as TrialShopState);
                break;
            case Protocol.TRIAL_SHOP_BUY: {
                const receipt = data as TrialShopReceipt;
                this.pending = null;
                this.reloadAfterReplay = false;
                model.commit(receipt.state);
                this.rewards?.restoreActual(receipt.requestId, receipt.assetRevision, receipt.actual);
                break;
            }
            default:
                return;
        }
        this.inFlight = false;
        this.emit("trial.shop.updated", undefined);
        if (reload && this.visible) {
            this.refreshVisible();
        }
    }

    /** 在模块初始化时登记只读及购买回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.TRIAL_SHOP, Protocol.TRIAL_SHOP_BUY]));
    }

    /** 应用换号清空旧购物请求、页面可见性和货架。 */
    protected onResetSession(): void {
        this.visible = false;
        this.inFlight = false;
        this.pending = null;
        this.reloadAfterReplay = false;
        TrialShopModel.instance.reset();
    }

    /** 模块终止后释放应用能力。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 发送认证读取或原兑换请求，核对回执编号和报价周期后交给模块。 */
    private send(): void {
        if (!this.isInitialized || !this.operations || this.inFlight) {
            return;
        }
        const command = this.pending;
        this.inFlight = true;
        this.emit("trial.shop.updated", undefined);
        void this.operations.deliver(command ? Protocol.TRIAL_SHOP_BUY : Protocol.TRIAL_SHOP, command ?? {},
            frame => {
                if (command) {
                    const receipt = frame.body as TrialShopReceipt;
                    if (receipt.requestId !== command.requestId || receipt.state.refreshAt !== command.refreshAt
                            || !receipt.state.offers.some(offer => offer.id === command.offerId)) {
                        throw new Error("试炼商店购买回包与本次确认不符");
                    }
                }
                ProtocolRouter.instance.dispatch(this, frame);
            }, error => this.failed(command, error));
    }

    /** 明确拒绝时清除订单并补读新报价，断线则由恢复鉴权重发原编号。 */
    private failed(command: TrialShopBuy | null, error: unknown): void {
        const interrupted = error instanceof SocketFailure && error.interrupted;
        this.inFlight = false;
        if (!interrupted) {
            this.pending = null;
            this.reloadAfterReplay = false;
        } else if (command) {
            this.reloadAfterReplay = true;
        }
        this.emit("trial.shop.updated", undefined);
        if (!interrupted && (this.visible || command)) {
            UIManager.instance.toast(error instanceof Error ? error.message : "试炼商店请求失败");
            if (command && this.visible) {
                this.refreshVisible();
            }
        }
    }
}
