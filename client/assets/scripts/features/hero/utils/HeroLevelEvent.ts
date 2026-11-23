/** 英雄成长视图事件，成功回包携带实际等级或阶级变化用于本次光效。 */
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        "hero.level.updated": {
            heroId?: string;
            fromLevel?: number;
            toLevel?: number;
            fromStage?: number;
            toStage?: number;
        };
    }
}

export class HeroLevelEvent {
    /** 普通升级或强化进阶改变忙态和收到成功回包时通知详情。 */
    public static readonly Updated = "hero.level.updated";

    /** 业务事件常量不需要实例。 */
    private constructor() {}
}
