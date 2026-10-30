import { AccountModel } from "../account/AccountModel";
import type { AccountAuthorization } from "../account/AccountService";
import { SessionChanged } from "../account/AccountService";
import { readOwnedHeroes } from "./HeroApi";
import type { HeroGateway } from "./HeroApi";
import { HeroRosterModel } from "./HeroRosterModel";

/** Owns only roster read state. No starter grant, growth, lineup or wire-store writes. */
export class HeroRosterService {
  private epoch = 0;
  private pending: Promise<boolean> | null = null;
  private disposed = false;
  private readonly offAccount: () => void;

  constructor(private readonly model: HeroRosterModel, private readonly account: AccountModel,
    private readonly authorization: AccountAuthorization, private readonly api: HeroGateway) {
    let roleId = account.snapshot.role?.id;
    this.offAccount = account.subscribe(state => {
      if (state.busy || !state.role || state.role.id !== roleId) this.clear();
      roleId = state.role?.id;
    });
  }

  refresh(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    if (this.pending) return this.pending;
    if (this.account.snapshot.busy || !this.account.snapshot.role) { this.clear(); return Promise.resolve(false); }
    const epoch = ++this.epoch;
    this.model.replace({ status: "loading", heroes: [], error: "" });
    const request = this.load(epoch);
    this.pending = request;
    void request.then(() => { if (this.pending === request) this.pending = null; });
    return request;
  }

  /** Page close and account changes invalidate outstanding results without retaining old heroes. */
  clear(): void {
    this.epoch++;
    this.pending = null;
    this.model.replace({ status: "idle", heroes: [], error: "" });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.offAccount();
    this.clear();
  }
  private async load(epoch: number): Promise<boolean> {
    try {
      const heroes = await this.authorization.authenticated(token => this.api.list(token));
      if (this.disposed || epoch !== this.epoch) return false;
      this.model.replace({ status: "ready", heroes: readOwnedHeroes(heroes), error: "" });
      return true;
    } catch (error) {
      if (this.disposed || epoch !== this.epoch || error instanceof SessionChanged) return false;
      this.model.replace({ status: "error", heroes: [], error: error instanceof Error ? error.message : "英雄列表加载失败，请重试" });
      return false;
    }
  }
}
