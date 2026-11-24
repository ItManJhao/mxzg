/**
 * 开发 GM 请求控制器：收发开关、资产、角色进度和测试时间协议，校验服务端回执。
 * 未确认的发放保留原幂等键；角色和资产由统一推送更新，时间回包直接校准公共时钟。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { ServerClock } from "../../core/ServerClock";
import { Protocol } from "../../platform/Protocol";
import type { AccountOperations } from "../account/AccountOperations";

export interface GmGrant {
    /** 本次发放的持久幂等键；结果不明时沿用。 */
    requestId: string;
    /** 服务端登记的发放分类：英雄或道具。 */
    kind: "hero" | "item";
    /** 当前选择的真实配置 ID。 */
    configId: number;
    /** 发放数量；金币和钻石允许超过普通道具的每次上限。 */
    quantity: number;
}

/** 服务端返回的当前游戏时间。 */
interface GmServerTime {
    /** 游戏时间的 Unix 毫秒。 */
    serverTimeMs: number;
    /** true 表示当前测试实例使用 GM 设置的时间。 */
    overridden: boolean;
}

/** 收发开发 GM 协议；保留未确认请求，防止重试重复发放。 */
export class GmController {
    /** 原发放参数与发送状态。结果待确认时保留原单，重置后下一次发放使用新单。 */
    private pending: { body: GmGrant; sending: boolean } | null = null;

    /** 从预览应用取得当前会话的认证请求通道，所有 GM 请求共用此连接。 */
    constructor(private readonly operations: Pick<AccountOperations, "request">) {}

    /** 查询真实服务端开关；非法回包拒绝展示为可用。 */
    public async enabled(): Promise<boolean> {
        const frame = await this.operations.request(Protocol.GM_STATUS, {});
        const data = frame.body as { enabled?: unknown };
        if (typeof data?.enabled !== "boolean") {
            throw new Error("GM 开关回包无效");
        }
        return data.enabled;
    }

    /** 应用结束本次测试会话时清空原单，下一次发放可以立即开始。 */
    public reset(): void {
        this.pending = null;
    }

    /** 发放当前选择，金币、钻石和英雄经验可大额发放。结果不明时要求以原参数重试。 */
    public async grant(kind: GmGrant["kind"], configId: number, quantity: number): Promise<void> {
        if (this.pending?.sending) {
            throw new Error("正在发放，请等待");
        }
        const largeGrant = kind === "item" && (configId === 900001 || configId === 900002 || configId === 900101);
        const maximum = largeGrant ? 2_147_483_647 : 9999;
        if (!Number.isSafeInteger(configId) || configId <= 0 ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > maximum) {
            throw new Error("请选择配置并输入 1～" + maximum + " 的整数数量");
        }
        if (this.pending && (this.pending.body.kind !== kind ||
            this.pending.body.configId !== configId || this.pending.body.quantity !== quantity)) {
            throw new Error("上次发放结果未确认，请用原选择和数量重试");
        }
        if (!this.pending) {
            this.pending = {
                body: {requestId: RequestIdUtils.create(), kind, configId, quantity},
                sending: false,
            };
        }
        const attempt = this.pending;
        attempt.sending = true;
        try {
            const frame = await this.operations.request(Protocol.GM_GRANT, attempt.body);
            const data = frame.body as GmGrant;
            if (!data || data.requestId !== attempt.body.requestId || data.kind !== kind ||
                data.configId !== configId || data.quantity !== quantity) {
                throw new Error("GM 回执不匹配");
            }
            if (this.pending === attempt) {
                this.pending = null;
            }
        } catch (error) {
            const code = (error as { code?: string } | null)?.code;
            if (code?.startsWith("GM_") && this.pending === attempt) {
                this.pending = null;
            }
            throw error;
        } finally {
            attempt.sending = false;
        }
    }

    /** 提交角色目标等级，确认后由服务端快照更新角色。 */
    public async setLevel(level: number): Promise<void> {
        const requestId = RequestIdUtils.create();
        const frame = await this.operations.request(Protocol.GM_LEVEL_SET, { requestId, level });
        const data = frame.body as { requestId?: unknown; level?: unknown };
        if (data?.requestId !== requestId || data.level !== level) {
            throw new Error("GM 等级回执不匹配");
        }
    }

    /** 提交目标挑战关卡，确认后界面读取服务端同步的主线进度。 */
    public async setChapter(mission: number): Promise<void> {
        const requestId = RequestIdUtils.create();
        const frame = await this.operations.request(Protocol.GM_CHAPTER_SET, { requestId, mission });
        const data = frame.body as { requestId?: unknown; mission?: unknown };
        if (data?.requestId !== requestId || data.mission !== mission) {
            throw new Error("GM 关卡回执不匹配");
        }
    }

    /** 向服务端查询当前游戏时间，使用收到的时间校准公共时钟。 */
    public async getServerTime(): Promise<GmServerTime> {
        const frame = await this.operations.request(Protocol.GM_TIME_GET, {});
        return this.acceptServerTime(frame.body);
    }

    /** 设置当前测试实例的时间，Unix 秒为 0 时恢复实际时间。 */
    public async setServerTime(unixSeconds: number): Promise<GmServerTime> {
        const frame = await this.operations.request(Protocol.GM_TIME_SET, { unixSeconds });
        return this.acceptServerTime(frame.body);
    }

    /** 校验时间回包及覆盖状态，连接层已经校验当前请求的归属。 */
    private acceptServerTime(body: unknown): GmServerTime {
        const data = body as Partial<GmServerTime> | null;
        const serverTimeMs = data?.serverTimeMs;
        const overridden = data?.overridden;
        if (typeof serverTimeMs !== "number" || !Number.isSafeInteger(serverTimeMs) || serverTimeMs <= 0
            || typeof overridden !== "boolean") {
            throw new Error("GM 时间回包无效");
        }
        ServerClock.instance.synchronize(serverTimeMs);
        return { serverTimeMs, overridden };
    }
}
