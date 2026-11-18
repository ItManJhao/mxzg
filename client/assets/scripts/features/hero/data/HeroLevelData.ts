/**
 * 普通升级的原意图与协议边界。回执只确认消费和等级已提交，
 * 英雄等级与余额始终来自统一资产快照。
 */
import { Protocol } from "../../../platform/Protocol";
import type { GameFrame } from "../../../platform/GameProtocolCodecUtils";

/** 服务器绑定同一原编号的实例、原等级和升级级数。 */
export interface HeroLevelRequest {
    readonly requestId: string;
    readonly heroId: string;
    readonly expectedLevel: number;
    readonly levels: number;
}

/** 冻结的成功回执，assetRevision 对应事务提交后的统一版本。 */
export interface HeroLevelReceipt {
    readonly requestId: string;
    readonly heroId: string;
    readonly roleId: string;
    readonly fromLevel: number;
    readonly toLevel: number;
    readonly configVersion: string;
    readonly assetRevision: number;
}

/** 原记录存在时返回同一收据，缺失时允许按原意图重试。 */
export interface HeroLevelStatus {
    readonly requestId: string;
    readonly found: boolean;
    readonly receipt?: HeroLevelReceipt;
}

/** 普通升级的协议和持久日志使用相同的原请求格式。 */
export class HeroLevelData {
    /** 仅通过静态方法校验，不保存连接或角色状态。 */
    private constructor() {}

    /** 拒绝额外字段与损坏的操作记录，保持原参数可安全复用。 */
    public static readRequest(value: unknown): HeroLevelRequest {
        const row = HeroLevelData.readObject(value);
        if (Object.keys(row).length !== 4 || !HeroLevelData.isId(row.requestId)
                || !HeroLevelData.isId(row.heroId) || !HeroLevelData.isPositive(row.expectedLevel)
                || !HeroLevelData.isPositive(row.levels)) {
            throw new Error("普通升级原参数无效");
        }
        return Object.freeze({
            requestId: row.requestId, heroId: row.heroId, expectedLevel: row.expectedLevel, levels: row.levels,
        });
    }

    /** 原编号和全部消费参数一致时，才允许持久日志被这次确认清除。 */
    public static sameRequest(left: HeroLevelRequest, right: HeroLevelRequest): boolean {
        return left.requestId === right.requestId && left.heroId === right.heroId
            && left.expectedLevel === right.expectedLevel && left.levels === right.levels;
    }

    /** 比对原起始等级与目标级数，避免将其他升级的回执交给当前操作。 */
    public static matches(request: HeroLevelRequest, receipt: HeroLevelReceipt): boolean {
        return request.requestId === receipt.requestId && request.heroId === receipt.heroId
            && request.expectedLevel === receipt.fromLevel && request.levels === receipt.toLevel - receipt.fromLevel;
    }

    /** 校验升级 oneof 投影、原键以及历史回执允许的 revision=0。 */
    public static validateFrame(frame: GameFrame): void {
        const status = frame.name === Protocol.HERO_LEVEL_UPGRADE_STATUS;
        if ((!status && frame.name !== Protocol.HERO_LEVEL_UPGRADE) || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        if (frame.kind === "request" && !status) {
            HeroLevelData.readRequest(frame.body);
            return;
        }
        const body = HeroLevelData.readObject(frame.body);
        if (!HeroLevelData.isId(body.requestId)) {
            throw new Error("普通升级请求编号无效");
        }
        if (status && frame.kind === "request") {
            if (Object.keys(body).length !== 1) {
                throw new Error("普通升级状态查询仅接受原编号");
            }
            return;
        }
        if (status && (typeof body.found !== "boolean" || body.found !== (body.receipt !== undefined))) {
            throw new Error("普通升级状态与回执不一致");
        }
        if (status && !body.found) {
            return;
        }
        const receipt = status ? HeroLevelData.readObject(body.receipt) : body;
        if (receipt.requestId !== body.requestId || !HeroLevelData.isId(receipt.heroId)
                || !HeroLevelData.isId(receipt.roleId) || !HeroLevelData.isPositive(receipt.fromLevel)
                || !HeroLevelData.isPositive(receipt.toLevel) || receipt.toLevel <= receipt.fromLevel
                || typeof receipt.configVersion !== "string" || receipt.configVersion.length === 0
                || receipt.configVersion.length > 128
                || typeof receipt.assetRevision !== "number" || !Number.isSafeInteger(receipt.assetRevision)
                || receipt.assetRevision < 0) {
            throw new Error("普通升级回执无效");
        }
    }

    /** 载荷必须是普通消息对象；空载荷不能代表 NOT_FOUND。 */
    private static readObject(value: unknown): Record<string, unknown> {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            throw new Error("普通升级载荷无效");
        }
        return value as Record<string, unknown>;
    }

    /** 协议的正 uint32 字段，包括等级与本笔升级级数。 */
    private static isPositive(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 0xffffffff;
    }

    /** UUID 以原字符串比较，沿用服务端持久 ID 形态。 */
    private static isId(value: unknown): value is string {
        return typeof value === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
    }
}
