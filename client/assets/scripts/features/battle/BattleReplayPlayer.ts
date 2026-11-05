/** 战报顺序播放协调器：完整校验后逐步交给页面；不请求协议、不修改业务Model或发奖。 */
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

    /** 先校验整包，再开始播放；返回false表示被页面关闭/新播放取消，异常向页面边界传播。 */
    public async play(bytes: Uint8Array): Promise<boolean> {
        const steps = BattleReplayUtils.decode(bytes);
        this.stop();
        const generation = this.generation;
        this.active = true;
        try {
            for (const step of steps) {
                if (generation !== this.generation) return false;
                await this.presentation.play(step);
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
