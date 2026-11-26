/**
 * 铁匠铺装备合成状态。保存当前角色最近一次服务端预演，供确认窗口显示。
 * 金币、道具和实际入账仍由统一资产及奖励模块持有。
 */

/** 一件实际可得的配方产物；数量按配置堆叠。 */
export interface SmithProduct {
    readonly itemId: number;
    readonly quantity: number;
}

/** 服务端按当前资产计算的同部位连续合成预演。 */
export interface SmithPreview {
    readonly slot: number;
    readonly assetRevision: number;
    readonly goldCost: number;
    readonly rewards: readonly SmithProduct[];
}

/** 带持久资产版本的成功合成记录，单次记录目标装备和份数。 */
export interface SmithReceipt extends SmithPreview {
    readonly requestId: string;
    readonly roleId: string;
    readonly itemId: number;
    readonly count: number;
}

export class SmithModel {
    /** 同会话各铁匠铺窗口共用的预演状态。 */
    public static readonly instance = new SmithModel();

    /** 上一次通过校验的预演；再次预演、提交结算或切换身份时清空。 */
    private currentPreview: SmithPreview | null = null;

    /** 返回当前可供界面确认的服务端预演。 */
    public get preview(): SmithPreview | null {
        return this.currentPreview;
    }

    /** 只接受控制器已核对本次请求后提交的预演，空值表示原预演已经失效。 */
    public replacePreview(preview: SmithPreview | null): void {
        this.currentPreview = preview;
    }
}
