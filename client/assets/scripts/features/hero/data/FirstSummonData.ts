/** 普通首抽的协议契约：校验唯一资格及原回执编号，不保存本地余量或发奖结果。 */
import type { Protocol } from "../../../platform/Protocol";

/** 服务器给出的普通首抽资格；未同步由Model保存为null。 */
export interface FirstSummonState {
    /** 当前可识别的资格格式。 */
    readonly schemaVersion: 1;
    /** 当前角色是否已经用过免费首抽。 */
    readonly firstNormalCompleted: boolean;
    /** 首抽提交后的原普通免费时间（Unix秒）；本批只用来识别真实首抽状态。 */
    readonly normalFreeAtSeconds: number;
}

/** 原首抽在持久日志中只保留请求编号，回执和资格每次从服务器确认。 */
export interface FirstSummonIntent {
    /** 当前可识别的持久格式。 */
    readonly schemaVersion: 1;
    /** 业务幂等键，不是网络信封ID或当前角色编号。 */
    readonly requestId: string;
}

/** 执行与查询均经同一已鉴权的连接。 */
export type FirstSummonProtocol = typeof Protocol.HERO_FIRST_SUMMON | typeof Protocol.HERO_FIRST_SUMMON_STATUS;

/** 无状态首抽协议校验；由应用统一资产入口和首抽回执入口使用。 */
export class FirstSummonData {
    /** 只提供静态契约校验。 */
    private constructor() {
    }

    /** 读取服务端资格；旧快照缺字段表示未同步，完整字段不接受矛盾的资格与时间。 */
    public static readState(value: unknown): FirstSummonState | null {
        if (value === undefined) {
            return null;
        }
        const data = value as Partial<FirstSummonState> | null;
        if (!data || typeof data !== "object" || Array.isArray(data) || data.schemaVersion !== 1
            || typeof data.firstNormalCompleted !== "boolean" || typeof data.normalFreeAtSeconds !== "number"
            || !Number.isSafeInteger(data.normalFreeAtSeconds)
            || (data.firstNormalCompleted ? data.normalFreeAtSeconds <= 0 : data.normalFreeAtSeconds !== 0)) {
            throw new Error("首抽资格与免费时间无效");
        }
        return Object.freeze({
            schemaVersion: 1,
            firstNormalCompleted: data.firstNormalCompleted,
            normalFreeAtSeconds: data.normalFreeAtSeconds,
        });
    }

    /** 检查请求或成功回执使用的原小写UUID。 */
    public static isId(value: unknown): value is string {
        return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
    }
}
