/** 普通市场的协议入口，读取货架、提交购买与刷新，把服务端货架交给唯一 Model。 */
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { MarketModel, type MarketOffer, type MarketState } from "./MarketModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "market.updated": undefined;
    }
}

export class MarketController extends BaseController {
    /** 页面共用的发包入口，由应用在登录前装配。 */
    public static readonly instance = new MarketController();

    /** 当前会话的认证操作，应用卸载时清空。 */
    private operations: AccountOperations | null = null;
    /** 读取统一角色快照中的真实钱包，场景卸载时释放。 */
    private account: AccountModel | null = null;
    /** 市场主页面可见时为 true，重连成功后才需要主动补查货架。 */
    private visible = false;
    /** 一次查货架、购买或刷新尚未回包时为 true，防止同页重复提交。 */
    private pending = false;

    /** 绑定共用发包能力及钱包读取口，市场只保存自己的货架。 */
    public configure(operations: AccountOperations, account: AccountModel): void {
        this.operations = operations;
        this.account = account;
    }

    /** 请求期间禁用货架操作，面板仍可返回主城。 */
    public get busy(): boolean {
        return this.pending;
    }

    /** 进入市场取得服务器货架，返回主城只停止主动更新。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.reloadVisible();
        }
    }

    /** 页面打开、刷新资格到期或鉴权恢复后重新读取货架。 */
    public reloadVisible(): void {
        if (!this.visible || !this.beginRequest()) {
            return;
        }
        void this.operations!.deliver(Protocol.MARKET_LIST, {},
            frame => ProtocolRouter.instance.dispatch(this, frame), this.onFailed);
    }

    /** 计算当前能选的购买次数；真实购买仍需服务端校验货架、余额和限购。 */
    public maximum(offer: MarketOffer): number {
        const affordable = Math.floor(this.balance(offer.costItemId) / offer.costQuantity);
        const remaining = offer.purchaseLimit ? offer.purchaseLimit - offer.purchased : 9999;
        return Math.min(affordable, remaining);
    }

    /** 从当前角色快照读取普通市场使用的金币或钻石。 */
    public balance(itemId: number): number {
        const role = this.account?.snapshot.role;
        return (itemId === 900001 ? role?.gold : role?.diamonds) ?? 0;
    }

    /** 用数量窗所属货架版本提交订单，旧货架不转成当前订单。 */
    public buy(shelfVersion: number, productId: number, count: number): void {
        if (!this.beginRequest()) {
            return;
        }
        this.operations!.send(this, Protocol.MARKET_BUY, { shelfVersion, productId, count }, this.onFailed);
    }

    /** 按当前货架请求刷新，服务端决定免费资格与扣费。 */
    public refresh(shelfVersion: number): void {
        if (!this.beginRequest()) {
            return;
        }
        this.operations!.send(this, Protocol.MARKET_REFRESH, { shelfVersion }, this.onFailed);
    }

    /** 已校验的市场回包只更新货架，余额和发奖继续由统一状态与奖励通知处理。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        let state: MarketState;
        switch (protocol) {
            case Protocol.MARKET_LIST:
                state = data as MarketState;
                break;
            case Protocol.MARKET_BUY:
            case Protocol.MARKET_REFRESH:
                state = (data as { state: MarketState }).state;
                break;
            default:
                return;
        }
        this.pending = false;
        MarketModel.instance.replace(state);
        this.emit("market.updated", undefined);
    }

    /** 初始化只登记协议，不随登录下载货架。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.MARKET_LIST, Protocol.MARKET_BUY, Protocol.MARKET_REFRESH]));
    }

    /** 应用关闭旧角色页面后清空货架及请求状态。 */
    protected onResetSession(): void {
        this.visible = false;
        this.pending = false;
        MarketModel.instance.replace(null);
    }

    /** 应用卸载时释放认证操作引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.account = null;
    }

    /** 让一次操作独占市场请求入口，通知页面禁用重复操作。 */
    private beginRequest(): boolean {
        if (!this.operations || this.pending) {
            return false;
        }
        this.pending = true;
        this.emit("market.updated", undefined);
        return true;
    }

    /** 失败释放按钮；货架变化时补查服务器，断线时由重连鉴权触发补查。 */
    private readonly onFailed = (error: unknown): void => {
        this.pending = false;
        this.emit("market.updated", undefined);
        if (!this.visible) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "市场请求失败");
        if (error instanceof SocketFailure && error.code === "MARKET_SHELF_CHANGED") {
            this.reloadVisible();
        }
    };
}
