/** 英雄升级视图事件。只有已经双确认的手动升级携带等级变化，用于播本次特效。 */
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        "hero.level.updated": { heroId?: string; fromLevel?: number; toLevel?: number };
    }
}

export class HeroLevelEvent {
    /** 请求进度、可用余额或确认结果变化时通知当前详情。 */
    public static readonly Updated = "hero.level.updated";

    /** 业务事件常量不需要实例。 */
    private constructor() {}
}
