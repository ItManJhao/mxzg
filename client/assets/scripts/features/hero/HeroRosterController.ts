/**
 * 英雄名册控制器接收统一资产快照，提交英雄、阵容和召唤资格。
 * 普通召唤由此发送并接收协议，成功回包中的实际英雄用于通用获得窗。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import type { AccountOperations } from "../account/AccountOperations";
import type { AccountModel } from "../account/AccountModel";
import { BagModel } from "../bag/BagModel";
import type { RewardBinding } from "../reward/RewardBinding";
import { FirstSummonData, type SummonCount, type SummonPool, type SummonQuote } from "./data/FirstSummonData";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroRosterEvent } from "./utils/HeroRosterEvent";

export class HeroRosterController extends BaseController {
    /** 应用唯一模块，独立于窗口开关。 */
    static readonly instance = new HeroRosterController(HeroRosterModel.instance);

    /** 应用提供的账号操作入口，模块销毁时释放。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 应用共用的获得反馈，回包成功后交给它展示实际所得。 */
    private rewards: Pick<RewardBinding, "restore"> | null = null;
    /** 当前角色钻石余额沿用统一快照。 */
    private account: AccountModel | null = null;
    /** 等待当前抽取回包时锁住按钮，成功、失败或模块重置后恢复。 */
    private waitingForSummon = false;

    /**
     * @param model 当前英雄名册，提供服务端免费时间。
     * @param bag 当前背包，提供已同步的召唤券余量。
     */
    constructor(private readonly model: HeroRosterModel, private readonly bag = BagModel.instance) {
        super();
    }

    /** 注入账号请求、统一角色资料及通用获得反馈。 */
    public configure(operations: Pick<AccountOperations, "send">, rewards: Pick<RewardBinding, "restore">,
        account?: AccountModel): void {
        this.operations = operations;
        this.rewards = rewards;
        this.account = account ?? null;
    }

    /** 在一次召唤结束前，窗口禁用再次点击。 */
    public get summoning(): boolean {
        return this.waitingForSummon;
    }

    /** 登记统一资产状态及普通召唤回包，身份协调由应用层处理。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [...STATE_PROTOCOLS, Protocol.HERO_NORMAL_SUMMON, Protocol.HERO_SUMMON]));
        this.resetSession();
    }

    /** 应用重置时清空名册、免费资格和召唤进度。 */
    protected onResetSession(): void {
        this.waitingForSummon = false;
        this.model.reset();
        this.notify();
    }

    /** 根据当前名册冷却、账户和背包快照显示本次价格。 */
    public quote(pool: SummonPool, count: SummonCount): SummonQuote | null {
        const state = this.model.snapshot;
        const legacySingle = pool === "NORMAL" && count === 1;
        if (!legacySingle && !state.summonDetails) {
            return null;
        }
        const remaining = count === 1 && (pool === "ADVANCED" || pool === "NORMAL")
            ? this.model.summonCooldown(pool) : -1;
        if (remaining === null) {
            return null;
        }
        const cost = FirstSummonData.cost(pool, count);
        const quote = FirstSummonData.quote(pool, count, remaining === 0, this.bag.quantity(cost.item_type));
        return pool === "POINTS" && state.summonDetails?.pointsCost
            ? { ...quote, items: state.summonDetails.pointsCost } : quote;
    }

    /** 按可见价格检查余额，钻石扣款不会超过此次点击确认的金额。 */
    public summon(pool: SummonPool = "NORMAL", count: SummonCount = 1, maxDiamonds = 0): void {
        const operations = this.operations;
        if (this.summoning || !operations) {
            return;
        }
        const quote = this.quote(pool, count);
        if (!quote) {
            UIManager.instance.toast("召唤数据同步中");
            return;
        }
        if (pool === "POINTS" && !this.model.snapshot.summonDetails?.pointsExchangeAvailable) {
            UIManager.instance.toast("尚未满足积分召唤的累计充值条件");
            return;
        }
        if (this.bag.quantity(quote.itemId) < quote.items) {
            UIManager.instance.toast({
                NORMAL: "普通召唤券不足", FRIENDSHIP: "友情点不足", ADVANCED: "高级召唤券不足", POINTS: "召唤积分不足",
            }[pool]);
            return;
        }
        if (quote.diamonds > (this.account?.snapshot.role?.diamonds ?? 0)) {
            UIManager.instance.toast("钻石不足");
            return;
        }
        if (quote.diamonds > maxDiamonds) {
            UIManager.instance.toast("召唤价格已变化，请重试");
            return;
        }
        this.setSummoning(true);
        if (pool === "NORMAL" && count === 1) {
            operations.send(this, Protocol.HERO_NORMAL_SUMMON, {}, error => this.onSummonFailed(error));
        } else {
            operations.send(this, Protocol.HERO_SUMMON, { pool, count, maxDiamonds }, error => this.onSummonFailed(error), value => {
                const receipt = value as { pool: SummonPool; count: SummonCount };
                if (receipt.pool !== pool || receipt.count !== count) {
                    throw new Error("召唤回包与当前召唤池或次数不一致");
                }
            });
        }
    }

    /** 按协议交付统一快照或本次召唤结果。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onHeroState(protocol, data);
                break;
            case Protocol.HERO_NORMAL_SUMMON:
            case Protocol.HERO_SUMMON:
                this.onSummoned(data);
                break;
            default:
                // 路由会拒绝非法回包；模块仅忽略不属于自身的通知，不触碰Model。
                GameLog.shared.warnOnce("MODULE", "HeroRosterController", "UNHANDLED_PROTOCOL:" + protocol,
                    "英雄名册未登记协议：" + protocol + "；已忽略，未更新数据");
                return;
        }
    }

    /** 从同一份统一快照提交名册、阵容和召唤资格，奖励回执不会再次修改英雄。 */
    private onHeroState(protocol: ProtocolName, data: unknown): void {
        const state = ProtocolStateUtils.statePayload(protocol, data);
        this.model.replace(HeroRosterModel.readSnapshot(state));
        this.notify();
    }

    /** 把本次实际获得的英雄交给通用获得窗，名册由统一快照更新。 */
    private onSummoned(data: unknown): void {
        this.rewards?.restore(FirstSummonData.reward(data));
        this.setSummoning(false);
    }

    /** 释放按钮并飘字说明失败；断线后的资产由服务端快照同步。 */
    private onSummonFailed(error: unknown): void {
        this.setSummoning(false);
        const message = error instanceof SocketFailure && error.interrupted
            ? "召唤结果待同步，恢复连接后请查看英雄名册"
            : error instanceof Error ? error.message : "召唤失败";
        UIManager.instance.toast(message);
    }

    /** 延后通知，确保同一快照的角色、背包和名册已全部提交。 */
    private notify(): void {
        EventDispatcher.publishNotification(() => this.emit(HeroRosterEvent.Updated, {
            revision: this.model.version,
        }));
    }

    /** 更新召唤等待状态，操作结束后刷新所有按钮。 */
    private setSummoning(waiting: boolean): void {
        this.waitingForSummon = waiting;
        EventDispatcher.publishNotification(() => this.emit(HeroRosterEvent.SummonProgress, undefined));
    }

    /** 应用结束时释放账号通道和获得反馈。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
        this.account = null;
    }
}
