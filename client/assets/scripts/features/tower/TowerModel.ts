/** 幻境之塔 Model，保存服务端确认的层数、体力、专用阵容和待播放战报。 */
import type { SettledBattle } from "../battle/ui/SettledBattlePlayback";
import type { MainFormation } from "../hero/data/HeroSnapshotUtils";

/** 物品预览只显示旧配置的数量，实际到账来自原结算回执。 */
export interface TowerReward {
    readonly itemId: number;
    readonly quantity: number;
}

/** 每层的守军和两种奖励均由服务端按旧配置提供。 */
export interface TowerFloor {
    readonly floor: number;
    readonly recommendedPower: number;
    readonly enemies: readonly {
        position: number;
        templateId: number;
        level: number;
        star: number;
    }[];
    readonly firstRewards: readonly TowerReward[];
    readonly sweepRewards: readonly TowerReward[];
}

/** 单次塔状态回包，时间字段以服务器 Unix 秒为准。 */
export interface TowerState {
    readonly minimumLevel: number;
    readonly highestCleared: number;
    readonly maxFloor: number;
    readonly energy: number;
    readonly maxEnergy: number;
    readonly nextEnergyAtSeconds: number;
    readonly rechargeSeconds: number;
    readonly sweeps: number;
    readonly sweepLimit: number;
    readonly nextSweepCostDiamonds: number;
    readonly sweepResetAtSeconds: number;
    readonly formationVersion: number;
    readonly formationId: number;
    readonly slots: MainFormation["slots"];
    readonly floors: readonly TowerFloor[];
    readonly milestone: {
        readonly id: number;
        readonly floor: number;
        readonly claimed: boolean;
        readonly rewards: readonly TowerReward[];
    };
}

export class TowerModel {
    /** 当前应用的唯一幻境之塔状态。 */
    public static readonly instance = new TowerModel();
    /** 进入页面查询成功后置入，身份重置时移除。 */
    public state: TowerState | null = null;
    /** 最新结算等待原塔界面播放，取走或退出时清空。 */
    private battle: SettledBattle | null = null;

    /** 接收一次已结算的塔层战斗；领取与扫荡没有战报。 */
    public setBattle(battle: SettledBattle): void {
        this.battle = battle;
    }

    /** 消费一次播放意图，播放本身不影响层数或奖励。 */
    public takeBattle(): SettledBattle | null {
        const battle = this.battle;
        this.battle = null;
        return battle;
    }

    /** 当前角色离开时释放塔状态和残留演出。 */
    public reset(): void {
        this.state = null;
        this.battle = null;
    }
}
