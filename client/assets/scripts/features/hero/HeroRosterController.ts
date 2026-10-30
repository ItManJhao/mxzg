import type { HeroCatalog } from "./HeroCatalog";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroRosterService } from "./HeroRosterService";
import { presentHeroRoster } from "./HeroRosterPresentation";
import type { HeroRosterView } from "./HeroRosterPresentation";

/** Prepare the injected source before BaseView.onOpen; UIManager owns show/close. */
export class HeroRosterController {
  private off: (() => void) | null = null;
  private closed = false;
  constructor(private readonly model: HeroRosterModel, private readonly service: HeroRosterService,
    catalog: HeroCatalog, private readonly view: HeroRosterView, notice: (text: string) => void) {
    view.useRoster({
      read: elem => presentHeroRoster(model.snapshot, catalog, elem),
      retry: () => { if (this.off && !this.closed) { notice(""); void service.refresh(); } },
      select: cell => { if (this.off && !this.closed) notice(cell.name + " Lv" + cell.level + "，详情暂未开放"); },
    });
  }
  show(): void {
    if (this.off || this.closed) return;
    this.off = this.model.subscribe(() => this.view.refreshRoster());
    try { this.view.refreshRoster(); void this.service.refresh(); }
    catch (error) { this.close(); throw error; }
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.off?.(); this.off = null;
    this.service.dispose();
  }
}
