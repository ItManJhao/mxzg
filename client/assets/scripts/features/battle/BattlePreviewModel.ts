/** 只读试战的最近一次已校验结果，不保存或修改角色资产。 */
export interface BattlePreviewResult {
    /** 关卡及读取时的持久版本，用于展示来源，不作为通关凭据。 */
    readonly mission: number;
    readonly assetRevision: number;
    readonly lineupVersion: number;
    readonly formationId: number;
    /** 未恢复来源，必须保留，不能把审计结果宣传为完整属性。 */
    readonly pending: readonly string[];
    /** 从强类型消息重新编码的完整战报，供现有播放器使用。 */
    readonly bytes: Uint8Array;
}
export class BattlePreviewModel {
    /** 只保留本次请求结果；下一次请求及应用关闭清空。 */
    public result: BattlePreviewResult | null = null;
}
