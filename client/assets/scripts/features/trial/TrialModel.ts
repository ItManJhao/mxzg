/**
 * 勇者试炼的角色状态，保存服务端进度、好友支援和可恢复的末场战报。
 * 控制器原子提交快照，页面只读取展示；账号切换时清空该角色数据。
 */
import { ServerClock } from "../../core/ServerClock";
import { BaseModel } from "../../framework/BaseModel";
import type { TrialAssistance, TrialSettlement, TrialState } from "../../platform/Protocol";
import { RewardUtils } from "../reward/utils/RewardUtils";

export class TrialModel extends BaseModel {
    /** 当前应用唯一的试炼状态，与主线和梦境各自持有的数据隔离。 */
    public static readonly instance = new TrialModel();

    /** 最近一次服务端确认的玩法进度与通过校验的演出数据。 */
    private current: Readonly<{ state: TrialState; replay: Uint8Array | null }> | null = null;

    /** 同一自然日中最近确认的助战列表，打开或恢复时由服务端读取。 */
    private support: TrialAssistance | null = null;

    /** 最近一场已发放的奖励回执，供正式结算展示。 */
    private fightReward: TrialSettlement | null = null;

    /** 本会话中已确认关闭的最近战报，重进地图时避免重复播放。 */
    private closedBattleId: string | null = null;

    /** 返回最新状态，跨上海日界后暂不可用，等服务器确认新一天。 */
    public get snapshot(): typeof this.current {
        return this.current && this.isCurrentDay(this.current.state.resetAtSeconds) ? this.current : null;
    }

    /** 保留上次快照的日界秒，用于开页状态失效后发起一次补读。 */
    public get resetAtSeconds(): number {
        return this.current?.state.resetAtSeconds ?? 0;
    }

    /** 返回同日助战数据，过期状态不进入布阵候选。 */
    public get assistance(): TrialAssistance | null {
        return this.support && this.isCurrentDay(this.support.resetAtSeconds) ? this.support : null;
    }

    /** 提交原子状态，迟到的旧日或低版本回包不能覆盖新状态。 */
    public commit(state: TrialState, replay: Uint8Array | null): void {
        if (this.current && (state.resetAtSeconds < this.current.state.resetAtSeconds
            || (state.resetAtSeconds === this.current.state.resetAtSeconds && state.version < this.current.state.version))) {
            return;
        }
        this.current = Object.freeze({ state, replay });
        this.incrementVersion();
    }

    /** 提交与当前角色绑定的助战列表，忽略比已接收数据更早的回包。 */
    public commitAssistance(snapshot: TrialAssistance): void {
        if (this.support && (snapshot.resetAtSeconds < this.support.resetAtSeconds
            || (snapshot.resetAtSeconds === this.support.resetAtSeconds && snapshot.version < this.support.version))) {
            return;
        }
        this.support = snapshot;
    }

    /** 暂存战斗发奖回执，使结算展示跟在通用战报之后。 */
    public rememberFightReward(receipt: TrialSettlement): void {
        if (receipt.actual && receipt.state.battle) {
            this.fightReward = receipt;
        }
    }

    /** 将实际到账结果投影为本场结算的物品数量，缺回执的历史战报不补造奖品。 */
    public battleRewards(battleId: string): readonly { itemId: number; quantity: number }[] {
        const receipt = this.fightReward;
        if (receipt?.state.battle?.battleId !== battleId) {
            return [];
        }
        const notice = RewardUtils.fromActual(receipt.requestId, receipt.assetRevision, receipt.actual);
        return notice?.items.map(item => ({ itemId: item.itemId, quantity: item.credited })) ?? [];
    }

    /** 判断同一会话里是否已经看过这场战报。 */
    public hasClosedBattle(battleId: string): boolean {
        return this.closedBattleId === battleId;
    }

    /** 关掉结果后标记已看，移除本场已展示奖励。 */
    public closeBattle(battleId: string): void {
        if (this.fightReward?.state.battle?.battleId === battleId) {
            this.fightReward = null;
        }
        this.closedBattleId = battleId;
    }

    /** 切换账号时，战报、待展示反馈和借将全部失效。 */
    protected onReset(): void {
        this.current = null;
        this.support = null;
        this.fightReward = null;
        this.closedBattleId = null;
    }

    /** 只使用连接校准的当前时间；未校时时保留最近确认的数据。 */
    private isCurrentDay(boundary: number): boolean {
        const now = ServerClock.instance.nowSeconds();
        return now === null || now < boundary;
    }
}
