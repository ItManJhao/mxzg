/** 竞技场 Model，保存当前对手、积分、次数和服务端冻结的历史记录。 */
import type { SettledBattle } from "../battle/ui/SettledBattlePlayback";

/** 新手段中服务端选定的原版对手概况。 */
export interface ArenaOpponent {
    readonly id: number;
    readonly name: string;
    readonly level: number;
    readonly score: number;
    readonly power: number;
    readonly avatarId: number;
}

/** 已结算挑战的冻结历史，点击后按 battleId 请求原战报。 */
export interface ArenaHistory {
    readonly battleId: string;
    readonly opponentId: number;
    readonly opponentName: string;
    readonly won: boolean;
    readonly scoreDelta: number;
    readonly settledAtSeconds: number;
}

/** 竞技场权威状态。胜场计数只控制新手段，参与次数包含失败。 */
export interface ArenaState {
    readonly score: number;
    readonly freeRemaining: number;
    readonly ticketBalance: number;
    readonly ticketPriceDiamonds: number;
    readonly robotWins: number;
    readonly settledChallenges: number;
    readonly resetAtSeconds: number;
    readonly newcomerActive: boolean;
    readonly opponents: readonly ArenaOpponent[];
    readonly history: readonly ArenaHistory[];
}

export class ArenaModel {
    /** 当前应用的唯一竞技场状态。 */
    public static readonly instance = new ArenaModel();
    /** 上次服务器交付的对手和历史，换号时清空。 */
    public state: ArenaState | null = null;
    /** 本次结算或点选历史交给当前竞技场页播放，取走或换号后清空。 */
    private battle: SettledBattle | null = null;

    /** 接收已冻结的原战报和对应展示参数。 */
    public setBattle(battle: SettledBattle): void {
        this.battle = battle;
    }

    /** 取走一次待展示战报，不改变服务器结果。 */
    public takeBattle(): SettledBattle | null {
        const battle = this.battle;
        this.battle = null;
        return battle;
    }

    /** 当前角色离开时释放竞技场状态和残留演出。 */
    public reset(): void {
        this.state = null;
        this.battle = null;
    }
}
