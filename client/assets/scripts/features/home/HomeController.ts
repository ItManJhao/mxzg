import { AccountModel } from "../account/AccountModel";
import type { AccountState } from "../account/AccountModel";
import { AccountService } from "../account/AccountService";

export interface HomeActions { logout(): void; openFeature(id: string): void; heroAvailable?: boolean; availableFeatures?: readonly string[]; }
export interface HomeView {
  bind(actions: HomeActions): () => void;
  render(state: AccountState): void;
  showNotice(text: string): void;
}

/** Home reads the account Model; it never copies profile data into another store. */
export class HomeController {
  private disposers: Array<() => void> = [];
  constructor(private readonly account: AccountModel, private readonly service: AccountService,
    private readonly view: HomeView, private readonly openFeature?: (id: string) => boolean) {}

  show(): void {
    if (this.disposers.length) return;
    const unbind = this.view.bind({ logout: () => this.service.logout(), heroAvailable: !!this.openFeature,
      availableFeatures: this.openFeature ? ["hero","bag","battle"] : [], openFeature: id => {
      if (this.openFeature?.(id)) return;
      this.view.showNotice(id === "city" ? "" : "该功能暂未开放");
    } });
    this.disposers = [unbind, this.account.subscribe(state => this.view.render(state))];
    try { this.view.render(this.account.snapshot); }
    catch (error) { this.close(); throw error; }
  }
  close(): void { for (const dispose of this.disposers.splice(0)) dispose(); }
}
