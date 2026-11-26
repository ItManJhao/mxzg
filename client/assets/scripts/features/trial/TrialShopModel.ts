/**
 * 试炼商店展示数据，只保存当前周的服务端报价与成交计数。
 * 商店控制器提交回包，界面另从唯一背包读取试炼之血余额。
 */
import { BaseModel } from "../../framework/BaseModel";
import type { TrialShopState } from "../../platform/Protocol";

export class TrialShopModel extends BaseModel {
    /** 试炼商店模块唯一报价来源，随角色会话一起重置。 */
    public static readonly instance = new TrialShopModel();
    /** 当前已同步的货架，首次打开或更换角色前为空。 */
    private state: TrialShopState | null = null;

    /** 供页面读取最近同周或更新周期的货架。 */
    public get snapshot(): TrialShopState | null {
        return this.state;
    }

    /** 提交新报价，同周持久限购进度只增加，避免旧回执覆盖更新的交易数据。 */
    public commit(next: TrialShopState): void {
        const previous = this.state;
        if (previous && previous.refreshAt > next.refreshAt) {
            return;
        }
        const counts = new Map(previous?.refreshAt === next.refreshAt
            ? previous.offers.map(offer => [offer.id, offer.purchased])
            : []);
        this.state = {
            refreshAt: next.refreshAt,
            offers: next.offers.map(offer => ({
                ...offer, reward: { ...offer.reward },
                purchased: Math.max(offer.purchased, counts.get(offer.id) ?? 0),
            })),
        };
        this.incrementVersion();
    }

    /** 换号后清空原角色的周期和购买记录。 */
    protected onReset(): void {
        this.state = null;
    }
}
