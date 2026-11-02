/** 应用会话唯一英雄名册；关联资产事务提交后统一发布观察通知，窗口不持有另一份英雄状态。 */
import type { OwnedHero } from "./HeroApi";
import { publishNotification } from "../../framework/EventDispatcher";

export interface HeroRosterState {
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly heroes: readonly OwnedHero[];
  readonly error: string;
}

/** Empty ready roster is valid. Loading/error never falls back to the legacy mock roster. */
export class HeroRosterModel {
  private state: HeroRosterState = Object.freeze({ status: "idle", heroes: Object.freeze([]), error: "" });
  private readonly listeners = new Set<(state: HeroRosterState) => void>();
  get snapshot(): HeroRosterState { return this.state; }
  subscribe(listener: (state: HeroRosterState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  /** 替换权威名册，通知遵循全局批次，避免升级时英雄已变而库存尚未提交。 */
  replace(state: HeroRosterState): void {
    this.state = Object.freeze({ ...state, heroes: Object.freeze(state.heroes.map(hero => Object.freeze({ ...hero }))) });
    publishNotification(() => { for (const listener of this.listeners) listener(this.state); });
  }
}
