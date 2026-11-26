/**
 * 黑市协议入口。管理当前页签和待确认的购买，按原请求号恢复断线操作。
 * 货架由本模块的 Model 持有，资产与通用发奖由应用统一同步。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { BagModel } from "../bag/BagModel";
import { BlackMarketModel } from "./BlackMarketModel";
import {
    BLACK_MARKET_STALL,
    type BlackMarketOffer,
    type BlackMarketPurchase,
    type BlackMarketReceipt,
    type BlackMarketState,
} from "./data/BlackMarketData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "blackMarket.updated": undefined;
    }
}

/** 当前请求的方向、页签及用途。重发原购买回执后重新读取当前货架。 */
type PendingBlackMarketOperation =
    | { readonly name: typeof Protocol.BLACK_MARKET_LIST; readonly shopType: number }
    | { readonly name: typeof Protocol.BLACK_MARKET_BUY; readonly shopType: number; readonly replay: boolean };

export class BlackMarketController extends BaseController {
    /** 主城黑市页面共用的操作入口。 */
    public static readonly instance = new BlackMarketController();

    /** 应用注入的认证发包通道；应用销毁时释放。 */
    private operations: Pick<AccountOperations, "deliver"> | null = null;
    /** 统一金币与钻石的读取口，不保存另一份余额。 */
    private account: AccountModel | null = null;
    /** 玩家当前选中的策划商店类型；关窗后为空。 */
    private visibleShopType: number | null = null;
    /** 已发出、尚未交付结果的唯一请求；完成、失败或重置时清空。 */
    private pending: PendingBlackMarketOperation | null = null;
    /** 未得到结算的订单，断线恢复时复用请求编号，确定完成或拒绝后清空。 */
    private command: BlackMarketPurchase | null = null;

    /** 注入统一发包和钱包查询。背包货币读取现有 BagModel。 */
    public configure(operations: Pick<AccountOperations, "deliver">, account: AccountModel): void {
        this.operations = operations;
        this.account = account;
    }

    /** 返回页面当前选择，供货架加载期间保留正确页签高亮。 */
    public get selectedShopType(): number | null {
        return this.visibleShopType;
    }

    /** 查询、购买及结果未知期间禁止下新订单。 */
    public get busy(): boolean {
        return this.pending !== null || this.command !== null;
    }

    /** 进入指定页签并读取服务器货架；关闭只停止可见货架更新。 */
    public setVisible(visible: boolean, shopType = BLACK_MARKET_STALL): void {
        this.visibleShopType = visible ? shopType : null;
        if (visible) {
            this.reloadVisible();
        }
    }

    /** 切换服务端已返回的页签；在途请求结束后按最后一次选择查询。 */
    public selectShop(shopType: number): void {
        const state = BlackMarketModel.instance.snapshot;
        if (this.visibleShopType === null || shopType === this.visibleShopType
                || !state?.tabs.some(tab => tab.shopType === shopType)) {
            return;
        }
        this.visibleShopType = shopType;
        if (this.pending) {
            this.emit("blackMarket.updated", undefined);
        }
        this.reloadVisible();
    }

    /** 进页、到期或恢复连接时读取真实货架；有未知结算时先恢复原请求。 */
    public reloadVisible(): void {
        if (!this.operations || this.pending) {
            return;
        }
        if (this.command) {
            this.sendPurchase(this.command, true);
        } else if (this.visibleShopType !== null) {
            this.sendList(this.visibleShopType);
        }
    }

    /** 读取统一角色钱包及背包的实际货币，货架不可修改余额。 */
    public balance(itemId: number): number {
        const role = this.account?.snapshot.role;
        if (itemId === 900001) {
            return role?.gold ?? 0;
        }
        if (itemId === 900002) {
            return role?.diamonds ?? 0;
        }
        return BagModel.instance.quantity(itemId);
    }

    /** 计算数量窗当前可选次数；购买时由服务端复核钱包和剩余限购。 */
    public maximum(offer: BlackMarketOffer): number {
        if (!offer.purchasable || offer.costQuantity <= 0) {
            return 0;
        }
        const affordable = Math.floor(this.balance(offer.costItemId) / offer.costQuantity);
        const remaining = offer.purchaseLimit ? offer.purchaseLimit - offer.purchased : 0x7fffffff;
        return Math.max(0, Math.min(affordable, remaining));
    }

    /** 按数量窗确认的页签和货架下单，拒绝关窗、切页、已售罄或旧报价的点击。 */
    public buy(shopType: number, shelfVersion: number, productId: number, count: number): void {
        if (!this.operations || this.busy || this.visibleShopType !== shopType) {
            return;
        }
        const state = BlackMarketModel.instance.snapshot;
        if (state?.shopType !== shopType || state.shelfVersion !== shelfVersion) {
            this.reloadVisible();
            return;
        }
        const offer = state.offers.find(row => row.productId === productId);
        if (!offer || !Number.isInteger(count) || count <= 0 || count > this.maximum(offer)) {
            return;
        }
        const command: BlackMarketPurchase = { requestId: RequestIdUtils.create(), shopType, shelfVersion, productId, count };
        this.command = command;
        this.sendPurchase(command, false);
    }

    /** 分发已经认证并匹配原请求的回包，回执只更新黑市货架。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.BLACK_MARKET_LIST:
                this.onList(data as BlackMarketState);
                break;
            case Protocol.BLACK_MARKET_BUY:
                this.onBuy(data as BlackMarketReceipt);
                break;
        }
    }

    /** 初始化只登记协议，由实际页面查询货架。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.BLACK_MARKET_LIST, Protocol.BLACK_MARKET_BUY]));
    }

    /** 角色切换由应用协调，清空选择、未完成操作和货架。 */
    protected onResetSession(): void {
        this.visibleShopType = null;
        this.pending = null;
        this.command = null;
        BlackMarketModel.instance.reset();
    }

    /** 释放装配时注入的认证及角色引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.account = null;
    }

    /** 发出选中页签的查询，验明响应仍属于在途请求的货架。 */
    private sendList(shopType: number): void {
        const operation = { name: Protocol.BLACK_MARKET_LIST, shopType } as const;
        this.pending = operation;
        this.emit("blackMarket.updated", undefined);
        void this.operations!.deliver(operation.name, { shopType }, frame => {
            if (this.pending !== operation) {
                return;
            }
            const state = frame.body as BlackMarketState;
            if (state.shopType !== shopType) {
                throw new SocketFailure("INVALID_MESSAGE", "黑市回包页签与请求不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.onFailed(operation, error));
    }

    /** 发送首次或重试购买，只有仍在途订单原编号、原货架的成功回执才可提交。 */
    private sendPurchase(command: BlackMarketPurchase, replay: boolean): void {
        const operation = { name: Protocol.BLACK_MARKET_BUY, shopType: command.shopType, replay } as const;
        this.pending = operation;
        this.emit("blackMarket.updated", undefined);
        void this.operations!.deliver(operation.name, command, frame => {
            if (this.pending !== operation) {
                return;
            }
            const receipt = frame.body as BlackMarketReceipt;
            if (receipt.requestId !== command.requestId || receipt.state.shopType !== command.shopType
                    || receipt.state.shelfVersion !== command.shelfVersion) {
                throw new SocketFailure("INVALID_MESSAGE", "黑市购买回包与原订单不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.onFailed(operation, error));
    }

    /** 查询成功时保持最后一次点击的页签，必要时继续读取所选货架。 */
    private onList(state: BlackMarketState): void {
        this.acceptState(state);
    }

    /** 确认原购买结算；断线重试的回放可能是历史货架，随后补查当前页。 */
    private onBuy(receipt: BlackMarketReceipt): void {
        const replay = this.pending?.name === Protocol.BLACK_MARKET_BUY && this.pending.replay;
        this.command = null;
        this.acceptState(receipt.state, replay);
    }

    /** 更新唯一 Model 并发布事件，已切换的页签不短暂回退到旧货架。 */
    private acceptState(state: BlackMarketState, confirmCurrent = false): void {
        this.pending = null;
        const target = this.visibleShopType;
        if (!confirmCurrent && (target === null || target === state.shopType)) {
            BlackMarketModel.instance.replace(state);
        }
        this.emit("blackMarket.updated", undefined);
        if (target !== null && (confirmCurrent || target !== state.shopType)) {
            this.reloadVisible();
        }
    }

    /** 确定拒绝时清理订单并补查变化的货架，断线时保留订单等待重新鉴权。 */
    private onFailed(operation: PendingBlackMarketOperation, error: unknown): void {
        if (this.pending !== operation) {
            return;
        }
        const interrupted = error instanceof SocketFailure && (error.interrupted
            || (operation.name === Protocol.BLACK_MARKET_BUY && error.code === "INVALID_MESSAGE"));
        this.pending = null;
        if (!interrupted) {
            this.command = null;
        }
        this.emit("blackMarket.updated", undefined);
        if (this.visibleShopType === null) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "黑市请求失败");
        if (!interrupted && (operation.name === Protocol.BLACK_MARKET_BUY || this.visibleShopType !== operation.shopType)) {
            this.reloadVisible();
        }
    }
}
