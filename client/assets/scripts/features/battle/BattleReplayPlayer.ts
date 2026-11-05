/** 战报播放协调器：技能之间顺序执行，同技能效果按旧Promise.all并行启动；不请求协议、不修改业务Model或发奖。 */
import { BattleReplayStep, BattleReplayUtils } from "./utils/BattleReplayUtils";

/** 页面负责真实资源与动画完成通知；stop必须停止当前动画和释放本次挂点。 */
export interface BattleReplayPresentation {
    play(step: BattleReplayStep): Promise<void>;
    stop(): void;
}

export class BattleReplayPlayer {
    /** 仅用于本页动画播放取消；与账号会话/旧协议回包隔离无关。 */
    private generation = 0;
    /** 当前已结束或被取消的标记，初始没有播放。 */
    private active = false;

    /** 注入页面播放能力，不持有服务器业务状态。 */
    public constructor(private readonly presentation: BattleReplayPresentation) {}

    /** 先校验整包，技能内并行、技能间等待全部效果；返回false表示取消，异常停止所有分支后向页面边界传播。 */
    public async play(bytes: Uint8Array): Promise<boolean> {
        const steps = BattleReplayUtils.decode(bytes);
        this.stop();
        const generation = this.generation;
        this.active = true;
        try {
            for (let index = 0; index < steps.length; index++) {
                if (generation !== this.generation) return false;
                const step = steps[index];
                await this.presentation.play(step);
                if (step.kind !== "skill.begin") continue;
                if (generation !== this.generation) return false;
                const effects: BattleReplayStep[] = [];
                const removals: BattleReplayStep[] = [];
                while (++index < steps.length && steps[index].kind !== "skill.end") {
                    const effect = steps[index];
                    // 当前已核对场景只有死亡移除；等本技能伤害完成后清理，避免图标提前消失。
                    if (effect.kind === "buff.remove") removals.push(effect);
                    else effects.push(effect);
                }
                await Promise.all(effects.map(effect => this.presentation.play(effect)));
                if (generation !== this.generation) return false;
                for (const removal of removals) {
                    await this.presentation.play(removal);
                    if (generation !== this.generation) return false;
                }
                await this.presentation.play(steps[index]);
            }
            return generation === this.generation;
        } finally {
            if (generation === this.generation) {
                this.active = false;
                this.presentation.stop();
            }
        }
    }

    /** 关页或切换播放时取消后续步骤；页面stop负责取消当前动画并结束等待。 */
    public stop(): void {
        this.generation++;
        if (this.active) {
            this.active = false;
            this.presentation.stop();
        }
    }
}
