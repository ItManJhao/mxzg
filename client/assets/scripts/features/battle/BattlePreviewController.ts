/** 只读试战控制器：发送关卡意图，经onNotify校验后更新结果Model，不持有账号或View。 */
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { mxzg } from "../../platform/GameProtocol.generated";
import { BattleReplayUtils } from "./utils/BattleReplayUtils";
import { BattlePreviewModel, BattlePreviewResult } from "./BattlePreviewModel";

export class BattlePreviewController {
    /** 应用提供当前身份的请求交付口；身份隔离由应用和通信层承担。 */
    constructor(private readonly send: (mission: number, received: (frame: GameFrame) => void) => Promise<void>) {}
    /** 最近一次已验证结果，不写入HeroRosterModel。 */
    private readonly model = new BattlePreviewModel();
    /** 同时只允许一次试战请求，避免连续点击重复计算。 */
    private busy = false;
    /** 本次请求关卡，用于检查回包没有串关。 */
    private mission = 0;
    /** 本控制器拥有的协议登记，应用销毁时解除。 */
    private readonly unregister = ProtocolRouter.instance.register(this, [Protocol.BATTLE_PREVIEW]);

    /** 请求当前已保存阵容；过期身份未交付时返回null，不打开旧角色画面。 */
    public async preview(mission: number): Promise<BattlePreviewResult | null> {
        if (this.busy) throw new Error("试战正在准备，请稍候");
        if (![1, 2, 3].includes(mission)) throw new Error("试战关卡无效");
        this.busy = true;
        this.mission = mission;
        this.model.result = null;
        try {
            await this.send(mission, frame => ProtocolRouter.instance.dispatch(this, frame));
            return this.model.result;
        } finally {
            this.busy = false;
        }
    }

    /** 只接收试战协议；完整回包和战报校验通过后一次性提交Model。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        if (protocol !== Protocol.BATTLE_PREVIEW) throw new Error("非试战协议");
        const body = value as Record<string, unknown>;
        if (!body || body.mission !== this.mission || !this.busy
            || !Number.isSafeInteger(body.assetRevision) || Number(body.assetRevision) < 0
            || !Number.isSafeInteger(body.lineupVersion) || Number(body.lineupVersion) < 0
            || !Number.isSafeInteger(body.formationId) || Number(body.formationId) <= 0
            || !Array.isArray(body.pending) || !body.pending.every(item => typeof item === "string")
            || !body.replay || typeof body.replay !== "object") throw new Error("试战回包无效");
        const replay = body.replay as { scenario?: string };
        if (replay.scenario !== "audit:lineup:" + this.mission) throw new Error("试战关卡不匹配");
        const codec = (mxzg as unknown as { game: { BattleReplay: {
            verify(value: object): string | null;
            encode(value: object): { finish(): Uint8Array };
        } } }).game.BattleReplay;
        const error = codec.verify(replay);
        if (error) throw new Error("试战协议字段无效：" + error);
        const bytes = codec.encode(replay).finish();
        BattleReplayUtils.decode(bytes);
        this.model.result = Object.freeze({ mission: this.mission, assetRevision: Number(body.assetRevision),
            lineupVersion: Number(body.lineupVersion), formationId: Number(body.formationId),
            pending: Object.freeze(body.pending.slice()) as readonly string[], bytes });
    }

    /** 应用关闭解除协议登记及结果引用。 */
    public dispose(): void {
        this.unregister();
        this.model.result = null;
    }
}
