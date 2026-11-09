/** 主线控制器：协议onNotify提交Model，负责挑战幂等、战报读取与结算，不持有View、token或账号。 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher, publishNotification } from "../../framework/EventDispatcher";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { STATE_PROTOCOLS, statePayload } from "../../platform/ProtocolState";
import { GameFrame } from "../../platform/GameProtocolCodec";
import { mxzg } from "../../platform/GameProtocol.generated";
import { MainChapterModel, MainChapterState, MainChapterReplay, MainChapterIdleState } from "./MainChapterModel";
import { BattleReplayUtils } from "./utils/BattleReplayUtils";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads { "main-chapter.updated": undefined; }
}

/** 唯一主线命令类型，不能透传任意暂停玩法。 */
export type ChapterCommand = typeof Protocol.CHAPTER_CHALLENGE | typeof Protocol.CHAPTER_CLAIM | typeof Protocol.CHAPTER_REPLAY | typeof Protocol.CHAPTER_IDLE_ENCOUNTER;
export class MainChapterController extends BaseController {
    /** 应用装配一次，页面只读Model并调用业务意图。 */
    public static readonly instance = new MainChapterController(MainChapterModel.instance);
    /** 数据或操作状态变化后刷新页面；监听由页面作用域清理。 */
    public static readonly Updated = "main-chapter.updated";
    /** 应用提供身份隔离后的交付口，模块不感知登录。 */
    private send: ((name: ChapterCommand, body: object, received: (frame: GameFrame) => void,
        failed: (error: unknown) => void) => Promise<void>) | null = null;

    /** 注入唯一数据所有者，独立测试可传入隔离Model。 */
    constructor(private readonly model: MainChapterModel) { super(); }

    /** 应用注入的权威角色等级只读入口，不持有账号或复制角色数据。 */
    public readRoleLevel: () => number = () => 0;

    /** 注入当前长连接和角色等级读取口，用于旧挂机对话筛选。 */
    public configure(send: NonNullable<MainChapterController["send"]>, readRoleLevel: () => number = () => 0): void {
        this.send = send;
        this.readRoleLevel = readRoleLevel;
    }

    /** 登记明确协议清单，页面打开不再查询主线状态。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [...STATE_PROTOCOLS,
            Protocol.CHAPTER_CHALLENGE, Protocol.CHAPTER_CLAIM, Protocol.CHAPTER_REPLAY, Protocol.CHAPTER_IDLE_ENCOUNTER]));
    }

    /** 校验进度字段和快照版本；缺失保持未同步，禁止伪造初始关卡。 */
    public static readState(value: unknown, revision?: number): MainChapterState | null {
        if (value === undefined) return null;
        const v = value as MainChapterState;
        if (!v || !Number.isInteger(v.maxCleared) || v.maxCleared < 0 || v.maxCleared > 3
            || !Number.isSafeInteger(v.assetRevision) || v.assetRevision < 0
            || (revision !== undefined && v.assetRevision !== revision)
            || (v.pendingBattleId != null && !this.validId(v.pendingBattleId))
            || (v.pendingBattleId && v.maxCleared === 0)) throw new Error("主线快照无效");
        return Object.freeze({ maxCleared: v.maxCleared, pendingBattleId: v.pendingBattleId || null,
            assetRevision: v.assetRevision });
    }

    /** 校验挂机时间与对应关卡，整包拒绝非法数据；空快照不代表零收益。 */
    public static readIdle(value: unknown, chapter: MainChapterState | null): MainChapterIdleState | null {
        if (value == null) {
            return null;
        }
        const v = value as MainChapterIdleState;
        if (!chapter || !Number.isSafeInteger(v.serverTime) || v.serverTime <= 0
            || !Number.isSafeInteger(v.startedAt) || v.startedAt < 0
            || !Number.isSafeInteger(v.maxSeconds) || v.maxSeconds <= 0
            || !Number.isSafeInteger(v.frequency) || v.frequency <= 0 || v.frequency > v.maxSeconds
            || v.rewardStage !== chapter.maxCleared || v.rewardStage <= 0
            || !Array.isArray(v.rates) || !v.rates.length
            || !v.rates.every(row => Number.isSafeInteger(row.itemId) && row.itemId > 0
                && Number.isSafeInteger(row.quantity) && row.quantity >= 0)
            || new Set(v.rates.map(row => row.itemId)).size !== v.rates.length) {
            throw new Error("主线挂机快照无效");
        }
        if (v.slots !== undefined && (!Array.isArray(v.slots) || v.slots.length > 3
            || !Number.isSafeInteger(v.lineupVersion) || v.lineupVersion! < 0
            || v.slots.some(slot => typeof slot.heroId !== "string" || !slot.heroId
                || !Number.isInteger(slot.position) || slot.position < 1 || slot.position > 8)
            || new Set(v.slots.map(slot => slot.heroId)).size !== v.slots.length
            || new Set(v.slots.map(slot => slot.position)).size !== v.slots.length)) {
            throw new Error("挂机阵容无效");
        }
        return Object.freeze({ ...v, rates: Object.freeze(v.rates.map(row => Object.freeze({ ...row }))),
            slots: v.slots ? Object.freeze(v.slots.map(row => Object.freeze({ ...row }))) : undefined });
    }

    /** 统一初始化、操作回执、战报各自有清晰入口；历史回执绝不覆盖最新进度。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED: {
                const state = statePayload(protocol, value);
                const chapter = MainChapterController.readState(state.mainChapter, Number(state.revision));
                const idle = MainChapterController.readIdle(state.mainChapterIdle, chapter);
                this.model.state = chapter;
                this.model.idle = idle;
                this.model.idleReceivedAt = Date.now();
                break;
            }
            case Protocol.CHAPTER_CHALLENGE:
            case Protocol.CHAPTER_CLAIM: this.onReceipt(protocol, value); break;
            case Protocol.CHAPTER_REPLAY: this.onReplay(value); break;
            case Protocol.CHAPTER_IDLE_ENCOUNTER: this.onIdleEncounter(value); break;
            default: throw new Error("非主线协议");
        }
        this.notify();
    }

    /** 到达遇敌点时读取旧3006演出战报；不查询库存，不占用挑战忙状态，不自动重发失败请求。 */
    public async encounter(): Promise<Uint8Array | null> {
        if (!this.send || this.model.idleLoading || !this.model.idle?.slots?.length) return null;
        this.model.idleLoading = true;
        this.model.idleReplay = null;
        let failure: unknown = null;
        await this.send(Protocol.CHAPTER_IDLE_ENCOUNTER, {}, frame => {
            ProtocolRouter.instance.dispatch(this, frame);
            this.model.idleLoading = false;
        }, error => {
            this.model.idleLoading = false;
            failure = error;
        });
        if (failure) throw failure;
        const replay = this.model.idleReplay as MainChapterModel["idleReplay"];
        return replay && replay.lineupVersion === this.model.idle?.lineupVersion
            && replay.stage === this.model.idle?.rewardStage
            && replay.assetRevision === this.model.state?.assetRevision ? replay.bytes : null;
    }

    /** 校验只读挂机场景和完整事件链，旧阵容版本只丢弃演出，不覆盖权威快照。 */
    private onIdleEncounter(value: unknown): void {
        const v = value as { stage: number; assetRevision: number; lineupVersion: number; replay: { scenario: string } };
        if (!v || ![1, 2, 3].includes(v.stage) || !Number.isSafeInteger(v.assetRevision) || v.assetRevision < 0
            || !Number.isSafeInteger(v.lineupVersion) || v.lineupVersion < 0
            || v.replay?.scenario !== "idle:chapter:" + v.stage) throw new Error("挂机战报无效");
        const codec = (mxzg as any).game.BattleReplay;
        if (codec.verify(v.replay)) throw new Error("挂机战报字段无效");
        const bytes: Uint8Array = codec.encode(v.replay).finish();
        BattleReplayUtils.decode(bytes);
        if (v.stage !== this.model.idle?.rewardStage || v.lineupVersion !== this.model.idle?.lineupVersion
            || v.assetRevision !== this.model.state?.assetRevision) return;
        this.model.idleReplay = Object.freeze({ stage: v.stage, assetRevision: v.assetRevision,
            lineupVersion: v.lineupVersion, bytes });
    }

    /** 首次生成业务编号，失败保留原编号供显式重试；不自动跨关。 */
    public async challenge(): Promise<void> {
        if (this.model.busy || !this.model.state) return;
        if (!this.model.requestId) this.model.requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,
            ch => { const n = Math.floor(Math.random() * 16); return (ch === "x" ? n : (n & 3) | 8).toString(16); });
        await this.execute(Protocol.CHAPTER_CHALLENGE, { requestId: this.model.requestId });
    }

    /** 结算显式指定服务器战报；重复点击由服务端战报ID保证只发一次。 */
    public async claim(battleId: string): Promise<void> {
        if (!MainChapterController.validId(battleId)) throw new Error("结算战报编号无效");
        await this.execute(Protocol.CHAPTER_CLAIM, { battleId });
    }

    /** 读取持久战报供玩家继续观看；读取失败不重新挑战。 */
    public async replay(battleId: string): Promise<MainChapterReplay | null> {
        if (this.model.busy) return null;
        if (!MainChapterController.validId(battleId)) throw new Error("战报编号无效");
        this.model.replay = null;
        await this.execute(Protocol.CHAPTER_REPLAY, { battleId });
        const result = this.model.replay as MainChapterReplay | null;
        if (result && result.battleId !== battleId) throw new Error("战报编号不匹配");
        return result;
    }

    /** 应用交付成功/失败回调才结束业务请求，换号后的旧Promise不修改新Model。 */
    private async execute(name: ChapterCommand, body: object): Promise<void> {
        if (this.model.busy || !this.send) return;
        this.model.busy = true;
        this.model.message = "正在处理…";
        this.notify();
        await this.send(name, body, frame => {
            ProtocolRouter.instance.dispatch(this, frame);
            this.model.busy = false;
            this.notify();
        }, error => {
            this.model.busy = false;
            this.model.message = String(error);
            this.notify();
        });
    }

    /** 校验完整奖励回执再提交；仅挑战成功清空挑战编号，结算不改变资产Model。 */
    private onReceipt(protocol: ProtocolName, value: unknown): void {
        const v = value as { action: string; battleId: string; state: unknown; rewards: { itemId: number; quantity: number }[] };
        const state = MainChapterController.readState(v?.state);
        if (!v || !state || (v.action !== "BATTLE" && v.action !== "SETTLED")
            || (protocol === Protocol.CHAPTER_CLAIM && v.action !== "SETTLED")
            || !MainChapterController.validId(v.battleId) || !Array.isArray(v.rewards)
            || !v.rewards.every(row => Number.isInteger(row.itemId) && row.itemId > 0
                && Number.isSafeInteger(row.quantity) && row.quantity >= 0)) throw new Error("主线回执无效");
        this.model.receipt = Object.freeze({ action: v.action, battleId: v.battleId, state,
            rewards: Object.freeze(v.rewards.map(row => Object.freeze({ ...row }))) });
        if (protocol === Protocol.CHAPTER_CHALLENGE) this.model.requestId = null;
        this.model.message = v.action === "BATTLE" ? "战报已保存，可观看" : "结算已确认，资产以服务器同步为准";
    }

    /** 强类型战报先校验场景及完整事件链，之后才交付播放器。 */
    private onReplay(value: unknown): void {
        const v = value as { battleId: string; mission: number; pending: string[]; replay: { scenario: string } };
        if (!v || !MainChapterController.validId(v.battleId) || ![1, 2, 3].includes(v.mission)
            || !Array.isArray(v.pending) || !v.pending.every(item => typeof item === "string")
            || v.replay?.scenario !== "chapter:lineup:" + v.mission) throw new Error("主线战报无效");
        const codec = (mxzg as any).game.BattleReplay;
        if (codec.verify(v.replay)) throw new Error("主线战报字段无效");
        const bytes: Uint8Array = codec.encode(v.replay).finish();
        BattleReplayUtils.decode(bytes);
        this.model.replay = Object.freeze({ battleId: v.battleId, mission: v.mission,
            pending: Object.freeze(v.pending.slice()), bytes });
        this.model.message = "战报已恢复";
    }

    /** 应用销毁解除通信注入，避免保留失效服务闭包。 */
    protected onDispose(): void { this.send = null; }

    /** 持久编号必须为UUID字符串，不接受数值或任意路径。 */
    private static validId(value: unknown): value is string {
        return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
    }

    /** 仅应用身份协调调用，页面关闭不丢失待确认请求。 */
    protected onResetSession(key: string | null): void { this.model.reset(key); this.notify(); }

    /** 通知页面读取唯一Model，不把状态副本塞入事件。 */
    private notify(): void { publishNotification(() => EventDispatcher.instance.emit(MainChapterController.Updated, undefined)); }
}
