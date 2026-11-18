/**
 * 普通英雄升级操作：持久保存原意图，确认回执和统一资产版本后通知详情。
 * 英雄和余额仍由名册、角色及背包持有，页面关闭不打断升级确认。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { PersistentOperationJournal } from "../../framework/PersistentOperationJournal";
import type { OperationJournalPort } from "../../framework/PersistentOperationJournal";
import { UIManager } from "../../framework/ui/UIManager";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { HeroLevelData } from "./data/HeroLevelData";
import type { HeroLevelRequest, HeroLevelReceipt, HeroLevelStatus } from "./data/HeroLevelData";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroLevelEvent } from "./utils/HeroLevelEvent";
import { HeroLevelQuoteUtils } from "./utils/HeroLevelQuoteUtils";
import type { HeroLevelQuote } from "./utils/HeroLevelQuoteUtils";

type LevelMessage = typeof Protocol.HERO_LEVEL_UPGRADE | typeof Protocol.HERO_LEVEL_UPGRADE_STATUS;

/** 应用提供已认证请求和接受过的统一状态，控制器不直接访问账号。 */
interface HeroLevelPorts {
    /** 发送原请求或查询，返回当前身份的已校验响应。 */
    send: (name: LevelMessage, body: HeroLevelRequest | Pick<HeroLevelRequest, "requestId">) => Promise<GameFrame>;
    /** 回执已到而状态未到时，通过一次重新鉴权确认统一资产。 */
    refresh: () => Promise<void>;
    /** 统一入口最后接纳的服务端版本；未接纳时返回 -1。 */
    revision: () => number;
    /** 角色、背包完成同一首包提交后返回实时余额，尚未同步为 null。 */
    balances: () => { gold: number; heroExp: number } | null;
}

/** 当前应用身份下的请求进度。模块重置后旧任务不再发布结果。 */
interface HeroLevelScope {
    /** 当前已认证身份的操作日志口，打开失败时允许下次重试。 */
    openJournal: () => Promise<OperationJournalPort<HeroLevelRequest>>;
    /** 原日志已打开时复用。 */
    journal: OperationJournalPort<HeroLevelRequest> | null;
    /** 当前串行任务。重复点击共享这次提交或确认。 */
    task: Promise<void> | null;
    /** 已持久保留的原参数，收到确认或明确拒绝时才清理。 */
    pending: HeroLevelRequest | null;
    /** 当前原参数的临时回执；快照缺失后继续保留以免重新执行。 */
    receipt: HeroLevelReceipt | null;
    /** 每次统一鉴权首包获准后递增，供断线与旧任务交错时补恢复。 */
    authentication: number;
}

/** 处理普通升级及恢复，统一快照继续负责真实英雄和背包状态。 */
export class HeroLevelController extends BaseController {
    /** 应用唯一的升级入口，详情页之间共享原意图。 */
    public static readonly instance = new HeroLevelController(HeroRosterModel.instance);
    /** 这些错误明确拒绝本笔升级，允许开始新的操作。 */
    private static readonly rejectionCodes = new Set([
        "INVALID_UPGRADE_REQUEST", "HERO_NOT_FOUND", "HERO_LEVEL_CHANGED", "LEVEL_LIMIT",
        "INSUFFICIENT_GOLD", "INSUFFICIENT_HERO_EXP", "IDEMPOTENCY_CONFLICT",
    ]);
    /** 新鉴权完成可能早于这些在途错误，届时可恢复同一原键。 */
    private static readonly interruptCodes = new Set(["DISCONNECTED", "NOT_READY", "TIMEOUT", "SUSPENDED", "STATE_REFRESH"]);
    /** 应用装配的网络/快照能力，销毁后释放。 */
    private ports: HeroLevelPorts | null = null;
    /** 当前作用域，退出或应用销毁后置空。 */
    private scope: HeroLevelScope | null = null;

    /** 注入由名册拥有的状态，只读取当前英雄进行报价与确认。 */
    public constructor(private readonly roster: HeroRosterModel) {
        super();
    }

    /** 装配现有连接与统一状态查询能力。 */
    public configure(ports: HeroLevelPorts): void {
        this.ports = ports;
    }

    /** 模块开启时登记固定升级/状态协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.HERO_LEVEL_UPGRADE, Protocol.HERO_LEVEL_UPGRADE_STATUS]));
    }

    /** 当前登录或重连首包已提交，尝试按角色原键恢复。 */
    public afterAuthentication(openJournal: HeroLevelScope["openJournal"]): void {
        if (!this.isInitialized || !this.ports) {
            return;
        }
        const scope = this.scope ??= {
            openJournal, journal: null, task: null, pending: null, receipt: null, authentication: 0,
        };
        scope.authentication++;
        void this.start(scope, null);
    }

    /** 读取当前英雄的同一份升等级报价，已有原任务时提供恢复入口。 */
    public describe(heroId: string): HeroLevelQuote {
        const hero = this.roster.snapshot.heroes.find(row => row.id === heroId);
        const balances = this.ports?.balances();
        const quote = HeroLevelQuoteUtils.describe(hero, this.scope ? balances?.gold ?? -1 : -1, balances?.heroExp ?? -1);
        if (hero && (this.scope?.task || this.scope?.pending)) {
            return { ...quote, status: "pending" };
        }
        return quote;
    }

    /** 一键升级选择最新可负担的级数，已有任务时优先恢复原操作。 */
    public upgrade(heroId: string): Promise<void> {
        const scope = this.scope;
        const quote = this.describe(heroId);
        if (!scope || quote.status === "unavailable") {
            UIManager.instance.toast("升级条件待同步");
            return Promise.resolve();
        }
        if (quote.status === "pending") {
            return this.start(scope, null, true);
        }
        if (quote.status !== "ready" || !quote.levels || quote.fromLevel === null) {
            UIManager.instance.toast(quote.status === "max" ? "已达到当前强化阶段的等级上限"
                : !quote.goldEnough ? "金币不足" : "英雄经验不足");
            return Promise.resolve();
        }
        return this.start(scope, {
            requestId: PersistentOperationJournal.createId(), heroId, expectedLevel: quote.fromLevel, levels: quote.levels,
        }, true);
    }

    /** 协议层已验证格式，这里只接纳当前原编号及原参数匹配的回执。 */
    public onNotify(name: ProtocolName, body: unknown): void {
        switch (name) {
            case Protocol.HERO_LEVEL_UPGRADE:
                this.acceptReceipt(body as HeroLevelReceipt);
                break;
            case Protocol.HERO_LEVEL_UPGRADE_STATUS: {
                const status = body as HeroLevelStatus;
                if (status.requestId !== this.scope?.pending?.requestId) {
                    throw new Error("升级查询结果与原编号不符");
                }
                if (status.receipt) {
                    this.acceptReceipt(status.receipt);
                }
                break;
            }
            default:
                GameLog.shared.warnOnce("MODULE", "HeroLevelController", "UNHANDLED:" + name, "忽略非升级协议：" + name);
        }
    }

    /** 应用退出或换号时撤销旧交付，日志内原请求为旧角色保留。 */
    protected onResetSession(): void {
        this.scope = null;
        this.emit(HeroLevelEvent.Updated, {});
    }

    /** 销毁后关闭已注入入口。操作日志连接由应用负责。 */
    protected onDispose(): void {
        this.ports = null;
    }

    /** 只保留匹配当前意图的 ACK，权威等级继续等待统一版本。 */
    private acceptReceipt(receipt: HeroLevelReceipt): void {
        const scope = this.scope;
        if (!scope?.pending || !HeroLevelData.matches(scope.pending, receipt)) {
            throw new Error("升级回执与原操作不符");
        }
        scope.receipt = receipt;
    }

    /** 串行执行升级；重连已完成时补处理被断线打断的原任务。 */
    private start(scope: HeroLevelScope, candidate: HeroLevelRequest | null, manual = false): Promise<void> {
        if (scope.task) {
            return scope.task;
        }
        const authentication = scope.authentication;
        const task = this.run(scope, candidate, manual).catch(error => {
            if (this.scope !== scope) {
                return;
            }
            const code = error instanceof SocketFailure ? error.code : "";
            GameLog.shared.classified("MODULE", "warn", "HeroLevelController", "普通升级确认：" + String(error));
            if (manual) {
                UIManager.instance.toast(HeroLevelController.rejectionCodes.has(code)
                    ? (error as SocketFailure).message : "升级结果尚待确认，请稍后重试");
            }
            if (HeroLevelController.interruptCodes.has(code) && scope.authentication > authentication) {
                scope.task = null;
                void this.start(scope, null);
            }
        }).then(() => {
            if (this.scope === scope && scope.task === task) {
                scope.task = null;
                this.emit(HeroLevelEvent.Updated, {});
            }
        });
        scope.task = task;
        this.emit(HeroLevelEvent.Updated, {});
        return task;
    }

    /** 先保存原操作，恢复时先查回执；确认真实等级后清除原日志。 */
    private async run(scope: HeroLevelScope, candidate: HeroLevelRequest | null, manual: boolean): Promise<void> {
        const ports = this.ports!;
        const journal = scope.journal ??= await scope.openJournal();
        const stored = await journal.read();
        if (this.scope !== scope) {
            return;
        }
        const pending = stored ?? scope.pending ?? (candidate === null ? null : await journal.create(candidate));
        if (this.scope !== scope || !pending) {
            return;
        }
        scope.pending = pending;
        try {
            const receipt = await this.confirm(scope, ports, pending, candidate);
            if (this.scope !== scope || !receipt) {
                return;
            }
            // 另一个标签页可能先清除了相同日志；只接受当前快照并结束本地状态。
            const cleared = await journal.clear(pending);
            if (this.scope === scope) {
                scope.pending = null;
                scope.receipt = null;
                if (manual && cleared) {
                    this.emit(HeroLevelEvent.Updated, {
                        heroId: receipt.heroId, fromLevel: receipt.fromLevel, toLevel: receipt.toLevel,
                    });
                }
            }
        } catch (error) {
            if (this.scope === scope && !scope.receipt && error instanceof SocketFailure
                    && HeroLevelController.rejectionCodes.has(error.code)) {
                await journal.clear(pending);
                if (this.scope === scope) {
                    scope.pending = null;
                    if (error.code === "HERO_LEVEL_CHANGED") {
                        await ports.refresh();
                    }
                }
            }
            throw error;
        }
    }

    /** 收据未到时按原编号恢复，收据已到时只刷新统一状态，不重复消费。 */
    private async confirm(scope: HeroLevelScope, ports: HeroLevelPorts, pending: HeroLevelRequest,
        candidate: HeroLevelRequest | null): Promise<HeroLevelReceipt | null> {
        if (scope.receipt && !HeroLevelData.matches(pending, scope.receipt)) {
            scope.receipt = null;
        }
        if (!scope.receipt && candidate?.requestId !== pending.requestId) {
            const frame = await ports.send(Protocol.HERO_LEVEL_UPGRADE_STATUS, { requestId: pending.requestId });
            if (this.scope !== scope) {
                return null;
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }
        if (!scope.receipt) {
            const frame = await ports.send(Protocol.HERO_LEVEL_UPGRADE, pending);
            if (this.scope !== scope) {
                return null;
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }
        const receipt = scope.receipt;
        if (!receipt) {
            throw new Error("缺少普通升级的原回执");
        }
        if (ports.revision() < receipt.assetRevision) {
            await ports.refresh();
        }
        if (this.scope !== scope) {
            return null;
        }
        const hero = this.roster.snapshot.heroes.find(row => row.id === receipt.heroId);
        if (ports.revision() < receipt.assetRevision || !hero || hero.level < receipt.toLevel) {
            throw new Error("升级回执已返回，真实英雄状态待同步");
        }
        return receipt;
    }
}
