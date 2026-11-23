/**
 * 英雄升级和进阶的协议结构及回执校验。回执通知界面播放反馈，
 * 英雄成长状态与余额来自统一资产快照。
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

/** 冻结的进阶成功回执，提交版本用于和统一快照对应。 */
export interface HeroStageReceipt {
    readonly requestId: string;
    readonly heroId: string;
    readonly roleId: string;
    readonly fromStage: number;
    readonly toStage: number;
    readonly configVersion: string;
    readonly assetRevision: number;
}

/** 使用统一格式校验英雄成长消息。 */
export class HeroLevelData {
    /** 仅通过静态方法校验，不保存连接或角色状态。 */
    private constructor() {}

    /** 验证升级请求的四个字段和取值范围。 */
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

    /** 核对本次选择的英雄、起始等级和实际提升的级数。 */
    public static matches(request: Omit<HeroLevelRequest, "requestId">, receipt: HeroLevelReceipt): boolean {
        return request.heroId === receipt.heroId && request.expectedLevel === receipt.fromLevel
            && request.levels === receipt.toLevel - receipt.fromLevel;
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

    /** 校验进阶请求、成功回执和按原编号查询的结果。 */
    public static validateStageFrame(frame: GameFrame): void {
        const status = frame.name === Protocol.HERO_STAGE_ADVANCE_STATUS;
        if ((!status && frame.name !== Protocol.HERO_STAGE_ADVANCE)
            || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        const body = HeroLevelData.readObject(frame.body);
        if (!HeroLevelData.isId(body.requestId)) {
            throw new Error("进阶请求编号无效");
        }
        if (frame.kind === "request") {
            if (status && Object.keys(body).length !== 1) {
                throw new Error("进阶查询只接受原请求编号");
            }
            if (!status && (Object.keys(body).length !== 3 || !HeroLevelData.isId(body.heroId)
                || !HeroLevelData.isStage(body.expectedStage))) {
                throw new Error("进阶请求字段无效");
            }
            return;
        }
        if (status && (typeof body.found !== "boolean" || body.found !== (body.receipt !== undefined))) {
            throw new Error("进阶查询状态与回执不一致");
        }
        if (status && !body.found) {
            return;
        }
        const receipt = status ? HeroLevelData.readObject(body.receipt) : body;
        if (receipt.requestId !== body.requestId || !HeroLevelData.isId(receipt.heroId)
            || !HeroLevelData.isId(receipt.roleId) || !HeroLevelData.isStage(receipt.fromStage)
            || !HeroLevelData.isStage(receipt.toStage) || receipt.toStage !== receipt.fromStage + 1
            || typeof receipt.configVersion !== "string" || receipt.configVersion.length === 0
            || receipt.configVersion.length > 128 || !Number.isSafeInteger(receipt.assetRevision)
            || (receipt.assetRevision as number) <= 0) {
            throw new Error("进阶回执无效");
        }
    }

    /** 载荷必须是普通消息对象；空载荷不能代表没有原收据。 */
    private static readObject(value: unknown): Record<string, unknown> {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            throw new Error("英雄成长载荷无效");
        }
        return value as Record<string, unknown>;
    }

    /** 允许初始阶 0，服务端使用有符号整数存储阶级。 */
    private static isStage(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0x7fffffff;
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
