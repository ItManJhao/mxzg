/** 黑市协议的货架、页签及购买回执，由 Controller 校验对应请求，Model 保存当前货架。 */
import type { MarketOffer } from "../../market/MarketModel";

/** 主城入口和黑市日常任务进入的原摊位类型。 */
export const BLACK_MARKET_STALL = 100800;

/** 黑市与普通市场使用相同的单件展示结构，黑市限购为 0 时表示不限量。 */
export type BlackMarketOffer = MarketOffer;

/** 原策划页签及当前服务开放状态，未开放的页签仍可展示已有商品。 */
export interface BlackMarketTab {
    /** 选择页签和匹配货架时使用的策划商店类型。 */
    readonly shopType: number;
    /** 服务端配置提供的页签显示名。 */
    readonly name: string;
    /** 可查看该策划页签的最低角色等级。 */
    readonly minimumLevel: number;
    /** true 表示可参与交易，单个商品仍可能受条件限制。 */
    readonly available: boolean;
}

/** 服务器生成的当前货架；下次刷新为 Unix 秒，0 代表该店没有定时刷新。 */
export interface BlackMarketState {
    /** 当前货架对应的页签类型。 */
    readonly shopType: number;
    /** 服务端签发的货架周期，用于拒绝过期购买。 */
    readonly shelfVersion: number;
    /** 自动刷新边界，Unix 秒；0 表示无定时刷新。 */
    readonly nextRefreshAt: number;
    /** 页首余额默认显示的货币配置 ID；单品价格仍依据各自报价。 */
    readonly currencyItemId: number;
    /** 当前角色已达查看条件的页签，保持原配置顺序。 */
    readonly tabs: readonly BlackMarketTab[];
    /** 当前货架按展示顺序的商品。 */
    readonly offers: readonly BlackMarketOffer[];
}

/** 只提交已看到的货架、商品和选择次数，服务端决定价格及资格。 */
export interface BlackMarketPurchase {
    /** 单次购买的稳定 UUID，结果未知时复用以免再次扣费。 */
    readonly requestId: string;
    /** 确认时所选的商店类型。 */
    readonly shopType: number;
    /** 确认时可见的货架周期。 */
    readonly shelfVersion: number;
    /** 当前货架内单个商品的配置 ID，不是物品 ID。 */
    readonly productId: number;
    /** 购买份数，到账件数由服务端按每份商品量计算。 */
    readonly count: number;
}

/** 成功购买回执，实际获得和余额仍由统一资产及奖励通知交付。 */
export interface BlackMarketReceipt {
    /** 原始购买编号，用于对应等待结算的操作。 */
    readonly requestId: string;
    /** 购买所属角色的字符串 ID，由认证通道校验。 */
    readonly roleId: string;
    /** 本次购买提交的统一资产版本，仅用于结算识别。 */
    readonly assetRevision: number;
    /** 成交时的完整页签和货架，重放时仍是原周期。 */
    readonly state: BlackMarketState;
}
