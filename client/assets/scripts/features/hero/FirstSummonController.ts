/**
 * 普通首抽协议入口：用原请求编号获取事务回执，只有统一快照确认后才交付英雄获得反馈。
 * 账号隔离和原意图日志由应用装配负责，模块不写英雄名册或背包。
 */
import { BaseController } from "../../framework/BaseController";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import type { RewardNotice } from "../reward/data/RewardNoticeData";
import { RewardUtils } from "../reward/utils/RewardUtils";
import { FirstSummonData } from "./data/FirstSummonData";
import type { FirstSummonProtocol } from "./data/FirstSummonData";
import { FirstSummonModel } from "./FirstSummonModel";

/** 原事务结果；只有接纳的快照版本足够高才可展示。 */
export type FirstSummonResult = RewardNotice | "completed-elsewhere";

export class FirstSummonController extends BaseController {
    /** 旧召唤积分的唯一物品配置ID；展示时仅读取原背包Model。 */
    public static readonly POINT_ITEM_ID = 900302;
    /** 当前轮已验证的历史反馈；结束后清空，仍可用原请求键查服务端。 */
    private receipt: RewardNotice | null = null;

    /** 注入模块唯一状态、当前身份安全的真实请求与统一快照恢复入口。 */
    public constructor(
        /** 本模块唯一资格与进度。 */
        public readonly model: FirstSummonModel,
        /** 应用核对账号归属后才交回已关联原帧，旧身份请求不得交付。 */
        private readonly send: (name: FirstSummonProtocol, requestId: string) => Promise<GameFrame>,
        /** 已有回执但缺状态时重做统一鉴权；不发送库存查询。 */
        private readonly synchronize: () => Promise<void>,
    ) {
        super();
    }

    /** 登记协议真实名称，统一快照仍只由应用定向分发。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [...STATE_PROTOCOLS, Protocol.HERO_FIRST_SUMMON, Protocol.HERO_FIRST_SUMMON_STATUS]));
    }

    /** 换号时清资格及历史回执，使关闭后的迟到结果失效。 */
    protected onResetSession(): void {
        this.receipt = null;
        this.model.snapshot = Object.freeze({ state: null, revision: -1, requestId: null, busy: false });
        this.emit("first-summon.updated", this.model.snapshot);
    }

    /** 动作由应用协调持久日志；pending为原意图，busy仅表示该次恢复或提交在途。 */
    public setPending(requestId: string | null, busy: boolean): void {
        this.model.snapshot = Object.freeze({ ...this.model.snapshot, requestId, busy });
        this.emit("first-summon.updated", this.model.snapshot);
    }

    /** 按原键处理成功响应，或从统一登录/变更快照提交资格与版本。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.HERO_FIRST_SUMMON:
                this.acceptReceipt(payload);
                return;
            case Protocol.HERO_FIRST_SUMMON_STATUS: {
                const status = payload as { requestId?: unknown; found?: unknown; receipt?: unknown } | null;
                if (!status || status.requestId !== this.model.snapshot.requestId || typeof status.found !== "boolean"
                    || (status.found ? status.receipt === undefined : status.receipt !== undefined)) {
                    throw new Error("首抽查询和原请求不一致");
                }
                if (status.found) {
                    this.acceptReceipt(status.receipt);
                }
                return;
            }
            default: {
                const snapshot = ProtocolStateUtils.statePayload(protocol, payload);
                this.model.snapshot = Object.freeze({
                    ...this.model.snapshot,
                    state: FirstSummonData.readState(snapshot.heroSummon),
                    revision: Number(snapshot.revision),
                });
                this.emit("first-summon.updated", this.model.snapshot);
            }
        }
    }

    /**
     * 恢复时先查询。查询明确未找到且当前同步有资格才用原业务编号再请求。
     * 已有回执时至多刷新一次原快照；操作失败则保留日志由重连或玩家点击恢复。
     */
    public async run(requestId: string, recovery: boolean): Promise<FirstSummonResult> {
        this.assertPending(requestId);
        this.receipt = null;
        if (recovery) {
            await this.request(Protocol.HERO_FIRST_SUMMON_STATUS, requestId);
        }
        if (!this.receipt) {
            const state = this.model.snapshot.state;
            if (!state) {
                throw new Error("首抽资格等待服务器同步");
            }
            if (state.firstNormalCompleted && recovery) {
                return "completed-elsewhere";
            }
            try {
                await this.request(Protocol.HERO_FIRST_SUMMON, requestId);
            } catch (error) {
                if (!(error instanceof Error) || !("code" in error) || error.code !== "SUMMON_ALREADY_COMPLETED") {
                    throw error;
                }
                // 跨设备完成也可能先于本机状态推送，先核对原回执，再刷新权威快照。
                await this.request(Protocol.HERO_FIRST_SUMMON_STATUS, requestId);
                if (!this.receipt) {
                    await this.synchronize();
                    this.assertPending(requestId);
                    if (this.model.snapshot.state?.firstNormalCompleted) {
                        return "completed-elsewhere";
                    }
                    throw error;
                }
            }
        }
        const notice: RewardNotice | null = this.readReward();
        if (notice && !this.hasConfirmation(notice)) {
            await this.synchronize();
            this.assertPending(requestId);
        }
        if (!notice || !this.hasConfirmation(notice)) {
            throw new Error("已获取首抽回执，统一状态仍待确认");
        }
        return notice;
    }

    /** 收到原请求真实回包再走已登记协议路由，拒绝关闭应用后的续段。 */
    private async request(name: FirstSummonProtocol, requestId: string): Promise<void> {
        this.assertPending(requestId);
        const frame = await this.send(name, requestId);
        this.assertPending(requestId);
        ProtocolRouter.instance.dispatch(this, frame);
    }

    /** 只保留可展示的真实新英雄，验证原归属、历史状态、已到账英雄和静默积分。 */
    private acceptReceipt(data: unknown): void {
        const value = data as {
            schemaVersion?: unknown; requestId?: unknown; receiptId?: unknown; roleId?: unknown;
            assetRevision?: unknown; state?: unknown; actual?: unknown;
        } | null;
        const requestId = this.model.snapshot.requestId;
        if (!value || value.schemaVersion !== 1 || !requestId || value.requestId !== requestId
            || !FirstSummonData.isId(value.receiptId) || typeof value.assetRevision !== "number"
            || !FirstSummonData.readState(value.state)?.firstNormalCompleted) {
            throw new Error("首抽回执与原请求或历史资格不一致");
        }
        const notice = RewardUtils.fromActual(value.receiptId, value.assetRevision, value.actual);
        const hero = notice?.heroes?.[0];
        if (!notice || notice.roleId !== value.roleId || notice.roleUpgrade || notice.heroes?.length !== 1 || !hero
            || notice.items.length !== 2 || !notice.items.some(item => item.itemId === hero.templateId && item.credited === 1)
            || !notice.items.some(item => item.itemId === FirstSummonController.POINT_ITEM_ID && item.credited > 0)) {
            throw new Error("首抽回执缺少真实英雄或召唤积分到账");
        }
        this.receipt = Object.freeze({
            ...notice, requestId,
            items: Object.freeze(notice.items.filter(item => item.itemId !== FirstSummonController.POINT_ITEM_ID)),
        });
    }

    /** 返回由协议路由接纳的回执投影。 */
    private readReward(): RewardNotice | null {
        return this.receipt;
    }

    /** 状态和原回执必须同时确认；回执历史状态永远不覆盖当前Model。 */
    private hasConfirmation(notice: RewardNotice): boolean {
        return this.model.snapshot.revision >= notice.assetRevision
            && this.model.snapshot.state?.firstNormalCompleted === true;
    }

    /** 重置后旧请求不能继续处理；账号及角色归属由应用交付入口负责。 */
    private assertPending(requestId: string): void {
        if (!this.isInitialized || this.model.snapshot.requestId !== requestId || !this.model.snapshot.busy) {
            throw new Error("原首抽已脱离当前操作");
        }
    }
}
