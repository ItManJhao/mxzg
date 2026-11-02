/** 英雄名册全局通知：只标识状态已提交，监听者读取唯一 Model，不通过事件累加英雄。 */
export const HeroRosterEvent = { Updated: "hero-roster:updated" } as const;
declare module "../../framework/EventDispatcher" {
 interface EventPayloads {
  [HeroRosterEvent.Updated]: {readonly roleKey:string|null;readonly revision:number};
 }
}
