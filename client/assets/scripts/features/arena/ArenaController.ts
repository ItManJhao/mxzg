/** 竞技场的认证协议入口。服务器决定选敌、积分及发奖，页面只使用冻结的结算和战报。 */
import { sys } from "cc";
import { GameConfig } from "../../config/GameConfig";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { ServerClock } from "../../core/ServerClock";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { FormationSaveRequest } from "../hero/data/FormationData";
import type { RewardBinding } from "../reward/RewardBinding";
import type { RewardNotice } from "../reward/data/RewardNoticeData";
import { RewardUtils } from "../reward/utils/RewardUtils";
import {
    ArenaModel, type ArenaDefense, type ArenaHistory, type ArenaRankings, type ArenaSeason,
    type ArenaShopState, type ArenaState,
} from "./ArenaModel";

/** 客户端只暂存同角色结果未知的写请求，重连沿用原编号。 */
interface ArenaCommand {
    readonly protocol: AuthenticatedGameProtocol;
    readonly body: { requestId: string } & Partial<Omit<FormationSaveRequest, "requestId">> & {
        opponentId?: number; opponentRoleId?: string; quantity?: number; chestId?: number;
        targetRoleId?: string; dailyEndsAt?: number; seasonEndsAt?: number; offerId?: number; refreshAt?: number;
    };
}

/** 赛季、排名和商店写入共用奖励通知身份。 */
interface ArenaRewardReceipt {
    readonly requestId: string;
    readonly notice: RewardNotice;
}

/** 服务器冻结的本次挑战记录、实际奖励及提交后的积分状态。 */
interface ArenaReceipt {
    readonly requestId: string;
    readonly assetRevision: number;
    readonly record: ArenaHistory;
    readonly replay: object;
    readonly state: ArenaState;
    readonly actual?: unknown;
}

/** 服务器确认购买的票数及真实到账。 */
interface ArenaTicketReceipt {
    readonly requestId: string;
    readonly assetRevision: number;
    readonly quantity: number;
    readonly actual: unknown;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "arena.updated": void;
    }
}

export class ArenaController extends BaseController {
    /** 当前应用的唯一竞技场控制器。 */
    public static readonly instance = new ArenaController();
    /** 应用注入的账号认证发包通道。 */
    private operations: AccountOperations | null = null;
    /** 供应统一通用反馈，避免背包重复提示。 */
    private rewards: Pick<RewardBinding, "restoreActual" | "restore"> | null = null;
    /** 竞技场显示时才能主动查询并接管战报。 */
    private visible = false;
    /** 任一本玩法请求在途期间为 true。 */
    public busy = false;
    /** 结果未知的原写请求，明确回复或账号重置后清空。 */
    private command: ArenaCommand | null = null;
    /** 本次查看的冻结历史条目，只持续到原战报查询完成。 */
    private replaying: ArenaHistory | null = null;
    /** 换对手的旧版界面冷却截止秒；换号重置，不决定服务端对手资格。 */
    private refreshAvailableAt = 0;
    /** 页签切换和战后刷新请求合并，写操作后依序读取。 */
    private readonly reads = new Set<AuthenticatedGameProtocol>();
    /** 读取防守阵容的界面确认，完成、关窗和换号时释放。 */
    private onDefenseLoaded: ((loaded: boolean) => void) | null = null;
    /** 等待保存完成的阵容编辑回调；收到确认或明确拒绝时释放。 */
    private onDefenseSaved: ((saved: boolean) => void) | null = null;

    /** 装配共享认证请求及通用发奖展示途径。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual" | "restore">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 打开竞技场时读权威状态，离开后不弹本页战报。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        } else {
            this.reads.clear();
            this.finishDefenseLoad(false);
        }
    }

    /** 打开、跨日及重连后的状态刷新；先解决未确认的原写请求。 */
    public refreshVisible(): void {
        if (this.visible) {
            this.reads.add(Protocol.ARENA_STATE);
            this.reads.add(Protocol.ARENA_SEASON);
            this.reads.add(Protocol.ARENA_RANKING);
            this.pump();
        }
    }

    /** 返回本机普通竞技场的跳过演出偏好，历史回放仍可完整观看。 */
    public get skipBattle(): boolean {
        const required = this.skipUnlockCount();
        return required !== null && (ArenaModel.instance.season?.seasonChallenges ?? 0) >= required
            && sys.localStorage.getItem("mxzg.arena.skipBattle") === "1";
    }

    /** 记住现行设置并刷新勾选状态，服务端仍按真实战报结算。 */
    public setSkipBattle(skip: boolean): void {
        const required = this.skipUnlockCount();
        if (skip && (required === null || (ArenaModel.instance.season?.seasonChallenges ?? 0) < required)) {
            UIManager.instance.toast(required === null ? "等待竞技场赛季同步" : `本赛季挑战 ${required} 次后可跳过战斗`);
            return;
        }
        sys.localStorage.setItem("mxzg.arena.skipBattle", skip ? "1" : "0");
        this.emit("arena.updated", undefined);
    }

    /** 进入排行榜或奖励预览时排队刷新真实个人名次。 */
    public openRanking(): void {
        this.read(Protocol.ARENA_RANKING);
    }

    /** 打开攻防记录时补读他人最近提交的战报。 */
    public refreshHistory(): void {
        this.read(Protocol.ARENA_STATE);
    }

    /** 读取赛季、宝箱和名次奖励配置。 */
    public openSeason(): void {
        this.read(Protocol.ARENA_SEASON);
    }

    /** 打开商店时读取当周有效报价。 */
    public openShop(): void {
        this.read(Protocol.ARENA_SHOP);
    }

    /** 读取防守草稿所需的服务端阵容，父窗口可在同步成功后进入编辑。 */
    public fetchDefense(): Promise<boolean> {
        return new Promise(resolve => {
            this.finishDefenseLoad(false);
            this.onDefenseLoaded = resolve;
            if (!this.read(Protocol.ARENA_DEFENSE)) {
                this.finishDefenseLoad(false);
            }
        });
    }

    /** 专用防守阵容使用自己的版本和业务编号保存。 */
    public saveDefense(draft: Omit<FormationSaveRequest, "requestId">, done: (saved: boolean) => void): void {
        this.onDefenseSaved = done;
        if (!this.execute(Protocol.ARENA_DEFENSE_SAVE, draft)) {
            this.finishDefenseSave(false);
        }
    }

    /** 提交玩家当前看到的赛季期次，防止晚到请求误领下一期。 */
    public claimChest(chestId: number): void {
        const season = ArenaModel.instance.season;
        if (season?.seasonEndsAt) {
            this.execute(Protocol.ARENA_CHEST_CLAIM, { chestId, seasonEndsAt: season.seasonEndsAt });
        }
    }

    /** 提交本人看到的榜单期次及选中角色。 */
    public like(targetRoleId: string): void {
        const ranking = ArenaModel.instance.ranking;
        if (ranking) {
            this.execute(Protocol.ARENA_LIKE, { targetRoleId, dailyEndsAt: ranking.dailyEndsAt });
        }
    }

    /** 兑换时携带弹窗确认的原周刷新时间，过期报价由服务端拒绝。 */
    public buyOffer(offerId: number, quantity: number, refreshAt: number): void {
        this.execute(Protocol.ARENA_SHOP_BUY, { offerId, quantity, refreshAt });
    }

    /** 刷新服务端为当前角色选出的旧版对手。 */
    public refreshOpponents(): void {
        if (this.command) {
            this.refreshVisible();
        } else if (!this.busy && this.refreshCooldown() === 0) {
            const now = ServerClock.instance.nowSeconds();
            const system = GameConfig.instance.getFileByPath("config/system") as { rows: readonly { key: string; value: unknown }[] };
            const seconds = system.rows.find(row => row.key === "pvp_refresh_time")?.value;
            if (now !== null && typeof seconds === "number") {
                this.refreshAvailableAt = now + seconds;
            }
            this.send(Protocol.ARENA_REFRESH, {});
        }
    }

    /** 返回旧版界面换对手的剩余冷却秒，连接尚未校准时等待状态查询。 */
    public refreshCooldown(): number {
        const now = ServerClock.instance.nowSeconds();
        return this.command || now === null ? 0 : Math.max(0, this.refreshAvailableAt - now);
    }

    /** 选定一个当前对手发起挑战，服务端判断免费次数或消耗门票。 */
    public challenge(opponentId: number, opponentRoleId?: string): void {
        this.execute(Protocol.ARENA_CHALLENGE, { opponentId, ...(opponentRoleId ? { opponentRoleId } : {}) });
    }

    /** 提交明确确认过的门票数量。 */
    public buyTicket(quantity: number): void {
        this.execute(Protocol.ARENA_TICKET_BUY, { quantity });
    }

    /** 读取历史中的同一份战报；播放不发生新扣费或领奖。 */
    public replay(record: ArenaHistory): void {
        if (this.busy || this.command) {
            return;
        }
        this.replaying = record;
        this.send(Protocol.ARENA_REPLAY, { battleId: record.battleId });
    }

    /** 消费原竞技场回复，更新本模块 Model 后再发页面事件。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        const model = ArenaModel.instance;
        switch (protocol) {
            case Protocol.ARENA_STATE:
            case Protocol.ARENA_REFRESH:
                model.state = data as ArenaState;
                break;
            case Protocol.ARENA_CHALLENGE:
                this.acceptChallenge(data as ArenaReceipt);
                if (this.visible) {
                    this.reads.add(Protocol.ARENA_STATE);
                    this.reads.add(Protocol.ARENA_SEASON);
                    this.reads.add(Protocol.ARENA_RANKING);
                }
                break;
            case Protocol.ARENA_REPLAY: {
                const record = this.replaying;
                if (this.visible && record) {
                    this.verifyReplay(record, data);
                    model.setBattle({ bytes: BattleReplayUtils.encodeVerified(data as object), won: record.won,
                        notice: `历史战报 · 积分 ${ArenaController.scoreDelta(record.scoreDelta)}`, rewards: [] });
                }
                this.replaying = null;
                break;
            }
            case Protocol.ARENA_RANKING:
                model.ranking = data as ArenaRankings;
                break;
            case Protocol.ARENA_SEASON:
                model.season = data as ArenaSeason;
                break;
            case Protocol.ARENA_DEFENSE:
                model.defense = data as ArenaDefense;
                this.finishDefenseLoad(true);
                break;
            case Protocol.ARENA_DEFENSE_SAVE:
                model.defense = (data as { defense: ArenaDefense }).defense;
                this.finishDefenseSave(true);
                break;
            case Protocol.ARENA_CHEST_CLAIM: {
                const receipt = data as ArenaRewardReceipt & { state: ArenaSeason };
                model.season = receipt.state;
                this.rewards?.restore(receipt.notice);
                break;
            }
            case Protocol.ARENA_LIKE: {
                const receipt = data as ArenaRewardReceipt & { ranking: ArenaRankings };
                model.ranking = receipt.ranking;
                this.rewards?.restore(receipt.notice);
                break;
            }
            case Protocol.ARENA_SHOP:
                model.shop = data as ArenaShopState;
                break;
            case Protocol.ARENA_SHOP_BUY: {
                const receipt = data as ArenaRewardReceipt & { state: ArenaShopState };
                model.shop = receipt.state;
                this.rewards?.restore(receipt.notice);
                break;
            }
            case Protocol.ARENA_TICKET_BUY: {
                const result = data as ArenaTicketReceipt;
                this.rewards?.restoreActual(result.requestId, result.assetRevision, result.actual);
                break;
            }
        }
        this.busy = false;
        this.command = null;
        this.emit("arena.updated", undefined);
        if (protocol === Protocol.ARENA_TICKET_BUY) {
            this.reads.add(Protocol.ARENA_STATE);
        }
        this.pump();
    }

    /** 格式化服务端已冻结的本场积分增减。 */
    public static scoreDelta(points: number): string {
        return points >= 0 ? `+${points}` : String(points);
    }

    /** 登记本玩法已实现的配对、历史和结算协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.ARENA_STATE, Protocol.ARENA_REFRESH, Protocol.ARENA_CHALLENGE,
            Protocol.ARENA_REPLAY, Protocol.ARENA_TICKET_BUY,
            Protocol.ARENA_RANKING, Protocol.ARENA_SEASON, Protocol.ARENA_CHEST_CLAIM, Protocol.ARENA_LIKE,
            Protocol.ARENA_DEFENSE, Protocol.ARENA_DEFENSE_SAVE, Protocol.ARENA_SHOP, Protocol.ARENA_SHOP_BUY,
        ]));
    }

    /** 账号退出后撤销旧页面关联，只保留服务端已经提交的记录。 */
    protected onResetSession(): void {
        this.visible = false;
        this.busy = false;
        this.command = null;
        this.replaying = null;
        this.refreshAvailableAt = 0;
        this.reads.clear();
        this.finishDefenseLoad(false);
        this.finishDefenseSave(false);
        ArenaModel.instance.reset();
    }

    /** 随应用退出释放认证入口和奖励队列。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 竞技场写请求统一生成并保留原编号。 */
    private execute(protocol: AuthenticatedGameProtocol, fields: Omit<ArenaCommand["body"], "requestId">): boolean {
        if (!this.operations || this.busy || this.command) {
            return false;
        }
        const body = { ...fields, requestId: RequestIdUtils.create() };
        this.command = { protocol, body };
        this.send(protocol, body);
        return true;
    }

    /** 可见页面的只读请求去重，当前操作释放后发出。 */
    private read(protocol: AuthenticatedGameProtocol): boolean {
        if (!this.operations || !this.visible) {
            return false;
        }
        this.reads.add(protocol);
        this.pump();
        return true;
    }

    /** 优先恢复断线前的原写请求，其次处理等待中的页签。 */
    private pump(): void {
        if (this.busy || !this.visible) {
            return;
        }
        if (this.command) {
            this.send(this.command.protocol, this.command.body);
            return;
        }
        const next = this.reads.values().next().value;
        if (next) {
            this.reads.delete(next);
            this.send(next, {});
        }
    }

    /** 解开尚在等待的防守阵容读取，保证回调只走一次。 */
    private finishDefenseLoad(success: boolean): void {
        const complete = this.onDefenseLoaded;
        this.onDefenseLoaded = null;
        complete?.(success);
    }

    /** 回调后允许布阵窗口恢复保存按钮或显示服务器新版本。 */
    private finishDefenseSave(success: boolean): void {
        const complete = this.onDefenseSaved;
        this.onDefenseSaved = null;
        complete?.(success);
    }

    /** 跳过演出门槛从原配置读取，随赛季计数变化即时生效。 */
    private skipUnlockCount(): number | null {
        const config = GameConfig.instance.getFileByPath("config/system") as
            { rows: readonly { key: string; value: unknown }[] } | undefined;
        const required = config?.rows.find(row => row.key === "pvp_jump_times_season")?.value;
        return typeof required === "number" && Number.isSafeInteger(required) && required >= 0 ? required : null;
    }

    /** 同一时刻只发送一个操作，校验本次回包对应所选对手或数量。 */
    private send(protocol: AuthenticatedGameProtocol, body: object): void {
        const operations = this.operations;
        if (!operations || this.busy) {
            return;
        }
        this.busy = true;
        this.emit("arena.updated", undefined);
        void operations.deliver(protocol, body, frame => {
            if (this.command) {
                this.verifyCommand(this.command, frame.body);
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failed(protocol, error));
    }

    /** 关联认证回包和原操作，防止防守保存、购买或挑战错位。 */
    private verifyCommand(command: ArenaCommand, value: unknown): void {
        const receipt = value as { requestId: string };
        if (receipt.requestId !== command.body.requestId) {
            throw new Error("竞技场回包与原操作不符");
        }
        if (command.protocol === Protocol.ARENA_CHALLENGE) {
            const record = (value as ArenaReceipt).record;
            if (record.opponentId !== command.body.opponentId || record.opponentRoleId !== command.body.opponentRoleId) {
                throw new Error("竞技场战斗回包与本次挑战不符");
            }
        }
        if (command.protocol === Protocol.ARENA_TICKET_BUY
                && (value as ArenaTicketReceipt).quantity !== command.body.quantity) {
            throw new Error("竞技场门票回包与本次购买不符");
        }
        if (command.protocol === Protocol.ARENA_DEFENSE_SAVE) {
            const defense = (value as { defense: ArenaDefense }).defense;
            const expected = command.body.slots ?? [];
            const version = command.body.expectedVersion ?? 0;
            const returned = new Map(defense.slots.map(slot => [slot.position, slot.heroId]));
            if (defense.fallback || defense.formationId !== command.body.formationId
                    || defense.version < Math.max(1, version) || defense.version > version + 1
                    || expected.length !== returned.size || expected.some(slot => returned.get(slot.position) !== slot.heroId)) {
                throw new Error("竞技场防守阵容回包与保存草稿不符");
            }
        }
    }

    /** 由攻防历史的本人视角核对冻结战报，避免把守方结果按攻方解释。 */
    private verifyReplay(record: ArenaHistory, value: unknown): void {
        const replay = value as { scenario: string; outcome: string; attackerName?: string; defenderName?: string };
        const enemy = record.defense ? replay.attackerName : replay.defenderName;
        const attackerWon = record.defense ? !record.won : record.won;
        const scenario = record.opponentRoleId ? `arena:pvp:${record.opponentRoleId}` : `arena:${record.opponentId}`;
        if ((!record.defense && replay.scenario !== scenario) || (record.defense && !replay.scenario.startsWith("arena:pvp:"))
                || enemy !== record.opponentName || replay.outcome !== (attackerWon ? "ATTACKER_WIN" : "DEFENDER_WIN")) {
            throw new Error("竞技场战报与所选攻防记录不符");
        }
    }

    /** 竞技场页播放当前结算；离开原页则只反馈实际奖励。 */
    private acceptChallenge(result: ArenaReceipt): void {
        const model = ArenaModel.instance;
        if (this.visible) {
            const bytes = BattleReplayUtils.encodeVerified(result.replay);
            const rewards = result.actual
                ? RewardUtils.fromActual(result.requestId, result.assetRevision, result.actual)?.items ?? [] : [];
            model.setBattle({ bytes, won: result.record.won,
                notice: `竞技场积分 ${ArenaController.scoreDelta(result.record.scoreDelta)}`,
                rewards: rewards.map(item => ({ itemId: item.itemId, quantity: item.credited })),
                skipPlayback: this.skipBattle });
        } else if (result.actual) {
            this.rewards?.restoreActual(result.requestId, result.assetRevision, result.actual);
        }
        model.state = result.state;
    }

    /** 已拒绝的操作刷新权威状态，模糊结果保持原请求等待重连。 */
    private failed(protocol: AuthenticatedGameProtocol, error: unknown): void {
        const interrupted = error instanceof SocketFailure && error.interrupted;
        if (!interrupted) {
            this.command = null;
            if (protocol === Protocol.ARENA_DEFENSE_SAVE) {
                this.finishDefenseSave(false);
            }
        }
        if (protocol === Protocol.ARENA_DEFENSE) {
            this.finishDefenseLoad(false);
        }
        this.replaying = null;
        this.busy = false;
        this.emit("arena.updated", undefined);
        if (!this.visible) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "竞技场请求失败");
        if (!interrupted) {
            this.pump();
        }
    }
}
