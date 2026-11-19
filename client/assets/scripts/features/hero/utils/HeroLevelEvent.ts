/** 英雄升级视图事件，成功回包携带等级变化用于本次光效。 */
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        "hero.level.updated": { heroId?: string; fromLevel?: number; toLevel?: number };
    }
}

export class HeroLevelEvent {
    /** 请求忙态或收到成功回包时通知当前详情。 */
    public static readonly Updated = "hero.level.updated";

    /** 业务事件常量不需要实例。 */
    private constructor() {}
}
