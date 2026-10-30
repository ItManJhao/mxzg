import { AccountModel } from "./AccountModel";
import type { AccountState } from "./AccountModel";
import { AccountService, SessionChanged } from "./AccountService";
import type { ServerSelection, GameServer } from "./ServerSelection";

export interface AccountActions { login(account: string): void; restore(): void; logout(): void; chooseServer?(): void; }
export interface AccountView {
  bind(actions: AccountActions): () => void;
  render(state: AccountState): void;
  renderServer?(server: GameServer | null): void;
  prepareAccount?(account: string): void;
}

/** UI lifetime only. Network state continues in the feature when a view is closed. */
export class AccountController {
  private disposers: Array<() => void> = [];
  private open = false;
  private entering = false;
  constructor(private readonly model: AccountModel, private readonly service: AccountService,
    private readonly view: AccountView, private readonly enterGame: () => void = () => {},
    private readonly worlds?: { selection: ServerSelection; openPicker(): void },
    private readonly initialize: () => Promise<void> = async () => {}) {}

  show(): void {
    if (this.open) return;
    const unbind = this.view.bind({
      login: account => {
        if (this.model.snapshot.busy || this.entering) return;
        void this.startGame(account);
      },
      restore: () => { if (!this.model.snapshot.busy) void this.service.restore(); },
      logout: () => this.service.logout(),
      chooseServer: () => { if (!this.model.snapshot.busy) this.worlds?.openPicker(); },
    });
    this.disposers = [unbind, this.model.subscribe(state => this.paint(state))];
    this.open = true;
    if (this.worlds) this.disposers.push(this.worlds.selection.subscribe(() => this.view.renderServer?.(this.worlds!.selection.selected)));
    this.view.renderServer?.(this.worlds?.selection.selected || null);
    try { this.paint(this.model.snapshot); }
    catch (error) { this.close(); throw error; }
  }
  close(): void {
    this.open = false;
    for (const dispose of this.disposers.splice(0)) dispose();
  }

  private async startGame(account: string): Promise<void> {
    // A prepared session is revalidated on the explicit Start click. Switching
    // accounts first clears the prepared session through the existing logout action.
    this.entering = true;
    this.paint(this.model.snapshot);
    try {
      const selected = this.worlds?.selection.selected;
      const role = this.model.snapshot.role;
      const sameWorld = !selected || (role?.serverId || "local-1") === selected.id;
      const identity = role ? this.service.accountName : account;
      let success = role && sameWorld ? await this.service.restore() : await this.service.login(identity, selected?.id);
      if (!success && role && sameWorld && !this.service.hasSession && this.open)
        success = await this.service.login(identity,selected?.id);
      if (!success || !this.open) return;
      await this.initialize();
      if (this.open) this.enterGame();
    } catch (error) {
      if (!(error instanceof SessionChanged) && this.open && this.model.snapshot.role) this.model.replace({ ...this.model.snapshot,
        error: error instanceof Error ? error.message : "角色初始化失败，请重试" });
    } finally {
      this.entering = false;
      if (this.open) this.paint(this.model.snapshot);
    }
  }
  private paint(state: AccountState): void {
    if (state.role) this.view.prepareAccount?.(this.service.accountName);
    this.view.render({ ...state, busy: state.busy || this.entering });
  }
}
