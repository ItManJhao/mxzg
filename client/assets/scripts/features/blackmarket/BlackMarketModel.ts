/** 黑市唯一的货架状态，由黑市 Controller 在认证回包校验后保存；不缓存钱包与库存。 */
import { BaseModel } from "../../framework/BaseModel";
import type { BlackMarketState } from "./data/BlackMarketData";

export class BlackMarketModel extends BaseModel {
    /** 应用内共用的黑市状态，关闭页面时保留，换号由模块重置。 */
    public static readonly instance = new BlackMarketModel();

    /** 最新一次提交的完整货架与页签；当前角色尚未读取时为 null。 */
    private state: BlackMarketState | null = null;

    /** 供界面读取当前货架快照。 */
    public get snapshot(): BlackMarketState | null {
        return this.state;
    }

    /** 提交完整货架，在同页货架刷新后拒绝回放旧版本；返回是否实际更新。 */
    public replace(state: BlackMarketState): boolean {
        if (this.state?.shopType === state.shopType && this.state.shelfVersion > state.shelfVersion) {
            return false;
        }
        this.state = Object.freeze({
            ...state,
            tabs: Object.freeze(state.tabs.map(tab => Object.freeze({ ...tab }))),
            offers: Object.freeze(state.offers.map(offer => Object.freeze({ ...offer }))),
        });
        this.incrementVersion();
        return true;
    }

    /** 当前角色离开时清空货架和页签，不清理其他商店状态。 */
    protected onReset(): void {
        this.state = null;
    }
}
