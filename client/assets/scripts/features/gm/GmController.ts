/**
 * 开发 GM 请求控制器：保存尚未确认请求的幂等键，负责校验开关和发放回执。
 * 应用注入请求能力，Controller 不持有凭证、不修改英雄/背包 Model；资产由统一推送更新。
 */
export interface GmGrant {
    /** 本次发放的持久幂等键；结果不明时沿用。 */
    requestId: string;
    /** 服务端登记的发放分类：英雄或道具。 */
    kind: string;
    /** 当前选择的真实配置 ID。 */
    configId: number;
    /** 发放数量，范围为 1～9999。 */
    quantity: number;
}

/** 组织开发发放请求；保留未确认请求，防止重试重复发放。 */
export class GmController {
    /** 当前角色未确认请求；断线/关窗保留，明确成功或换角色后清理。 */
    private pending: { role: string; body: GmGrant } | null = null;

    /** true 表示本控制器有发放正在进行，阻止并发提交。 */
    private busy = false;

    /**
     * 接收应用层注入的请求能力，控制器不参与登录或凭证管理。
     * @param statusRequest 查询服务器的开发开关。
     * @param send 发送携带幂等键的发放请求，返回服务器回执。
     */
    constructor(
        private readonly statusRequest: () => Promise<unknown>,
        private readonly send: (body: GmGrant) => Promise<unknown>,
    ) {}

    /** 查询真实服务端开关；非法回包拒绝展示为可用。 */
    public async enabled(): Promise<boolean> {
        const data = await this.statusRequest() as { enabled?: unknown };
        if (typeof data?.enabled !== "boolean") {
            throw new Error("GM 开关回包无效");
        }
        return data.enabled;
    }

    /** 应用层在角色切换时调用，丢弃旧角色尚未确认的请求。 */
    public reset(): void {
        this.pending = null;
    }

    /** 发放当前选择；结果不明时要求以原参数重试，保留原幂等键。 */
    public async grant(role: string, kind: string, configId: number, quantity: number): Promise<void> {
        if (this.busy) {
            throw new Error("正在发放，请等待");
        }
        if (!role || !Number.isSafeInteger(configId) || configId <= 0 ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9999) {
            throw new Error("请选择配置并输入 1～9999 的整数数量");
        }
        if (this.pending?.role !== role) {
            this.pending = null;
        }
        if (this.pending && (this.pending.body.kind !== kind ||
            this.pending.body.configId !== configId || this.pending.body.quantity !== quantity)) {
            throw new Error("上次发放结果未确认，请用原选择和数量重试");
        }
        if (!this.pending) {
            this.pending = {
                role,
                body: {
                    requestId: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                        const n = Math.floor(Math.random() * 16);
                        return (c === "x" ? n : (n & 3) | 8).toString(16);
                    }),
                    kind,
                    configId,
                    quantity,
                },
            };
        }
        const attempt = this.pending;
        this.busy = true;
        try {
            const data = await this.send(attempt.body) as GmGrant;
            if (!data || data.requestId !== attempt.body.requestId || data.kind !== kind ||
                data.configId !== configId || data.quantity !== quantity) {
                throw new Error("GM 回执不匹配");
            }
            if (this.pending === attempt) {
                this.pending = null;
            }
        } catch (error) {
            const code = (error as { code?: string }).code;
            if (code?.startsWith("GM_") && this.pending === attempt) {
                this.pending = null;
            }
            throw error;
        } finally {
            this.busy = false;
        }
    }
}
