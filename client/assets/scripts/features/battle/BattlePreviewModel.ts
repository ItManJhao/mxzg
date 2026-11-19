/** 只读试战的最近一次已校验结果，不保存或修改角色资产。 */
import { BattleReplayUtils } from "./utils/BattleReplayUtils";

export interface BattlePreviewResult {
    /** 同源关卡表全局idx；读取时的持久版本仅用于展示来源，不作为通关或开放凭据。 */
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

    /** 校验回包归属与试战数据，编译出可播放的战报后再更新当前结果。 */
    public applyResponse(mission: number, value: unknown): void {
        const body = value as Partial<BattlePreviewResult> & { replay?: { scenario?: string } };
        if (!body || body.mission !== mission
                || !Number.isSafeInteger(body.assetRevision) || Number(body.assetRevision) < 0
                || !Number.isSafeInteger(body.lineupVersion) || Number(body.lineupVersion) < 0
                || !Number.isSafeInteger(body.formationId) || Number(body.formationId) <= 0
                || !Array.isArray(body.pending) || !body.pending.every(item => typeof item === "string")
                || !body.replay || typeof body.replay !== "object") {
            throw new Error("试战回包无效");
        }
        if (body.replay.scenario !== "audit:lineup:" + mission) {
            throw new Error("试战关卡不匹配");
        }
        this.result = Object.freeze({
            mission,
            assetRevision: Number(body.assetRevision),
            lineupVersion: Number(body.lineupVersion),
            formationId: Number(body.formationId),
            pending: Object.freeze(body.pending.slice()),
            bytes: BattleReplayUtils.encodeVerified(body.replay),
        });
    }
}
