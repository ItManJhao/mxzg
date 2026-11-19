/** 英雄名册与召唤按钮的刷新信号；监听者读取模块当前数据，事件不携带第二份名册。 */
export const HeroRosterEvent = {
    Updated: "hero-roster:updated",
    SummonProgress: "hero-roster:summon-progress",
} as const;
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        [HeroRosterEvent.Updated]: { readonly revision: number };
        [HeroRosterEvent.SummonProgress]: void;
    }
}
