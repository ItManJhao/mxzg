/** 普通市场的货架与刷新次数，由 MarketController 接收服务端数据后整份替换。 */

/** 货架上的一档交易，数量和价格均为每次购买的实际值。 */
export interface MarketOffer {
    readonly productId: number;
    readonly itemId: number;
    readonly quantity: number;
    readonly costItemId: number;
    readonly costQuantity: number;
    readonly purchaseLimit: number;
    readonly purchased: number;
    readonly discount: number;
    readonly purchasable: boolean;
}

/** 服务器当前货架及刷新资格，时间均为 Unix 秒，0 表示未安排对应刷新。 */
export interface MarketState {
    readonly shelfVersion: number;
    readonly offers: readonly MarketOffer[];
    readonly freeRefreshes: number;
    readonly paidRefreshes: number;
    readonly freeRefreshLimit: number;
    readonly paidRefreshLimit: number;
    readonly nextFreeRefreshAt: number;
    readonly nextPaidResetAt: number;
    readonly refreshCostItemId: number;
    readonly refreshCostQuantity: number;
}

/** 模块唯一的货架数据，角色离开时清空，钱包仍由统一角色状态持有。 */
export class MarketModel {
    /** 应用内共用的普通市场货架。 */
    public static readonly instance = new MarketModel();

    /** 最近一次服务端确认的货架，当前角色尚未查过时为 null。 */
    private state: MarketState | null = null;

    /** 读取当前货架供页面渲染及提交订单。 */
    public get snapshot(): MarketState | null {
        return this.state;
    }

    /** 整体提交经过协议校验的货架，或在角色离开时将其清空。 */
    public replace(state: MarketState | null): void {
        this.state = state;
    }
}
