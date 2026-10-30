import type { OwnedHero } from "./HeroApi";

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
  replace(state: HeroRosterState): void {
    this.state = Object.freeze({ ...state, heroes: Object.freeze(state.heroes.map(hero => Object.freeze({ ...hero }))) });
    for (const listener of this.listeners) listener(this.state);
  }
}
