/**
 * 帧动画的基础间隔，由battleFramePlay读取，保持现有70毫秒播放节奏。
 * BattleInfo的倍速/跳过规则由实际战斗页面处理，这里不保存未接入的解锁等级或回合上限。
 */
/** 现有资源帧动画的基础间隔，单位毫秒。 */
const FRAME_STEP_MS = 70;
/** 现有帧动画基础间隔查询，不保存战斗倍速或跳过解锁状态。 */
export class BattleTimingUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 返回当前基础帧间隔；表现层再按实际播放步数细分，不修改战报规则。 */
    public static battleFrameStepMs(): number {
        return FRAME_STEP_MS;
    }
}
