/**
 * 英雄页面适配器：把应用会话中的名册投影到当前 View，转交查询与选择操作。
 * 页面关闭仅解除观察；名册服务由 RemakeApp 管理，换号由服务清理。
 */
import type { HeroCatalog } from "./HeroCatalog";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroRosterService } from "./HeroRosterService";
import { presentHeroRoster } from "./HeroRosterPresentation";
import type { HeroRosterView } from "./HeroRosterPresentation";

export class HeroRosterController {
  private off: (() => void) | null = null;
  private closed = false;
  /** 注入唯一名册展示源，点击拥有的实例交给应用打开普通升级，不复制英雄状态。 */
  constructor(private readonly model: HeroRosterModel, private readonly service: HeroRosterService,
    catalog: HeroCatalog, private readonly view: HeroRosterView, notice: (text: string) => void, openHero?: (heroId:string)=>void) {
    view.useRoster({
      read: elem => presentHeroRoster(model.snapshot, catalog, elem),
      retry: () => { if (this.off && !this.closed) { notice(""); void service.refresh(); } },
      select: cell => { if (this.off && !this.closed) {
        if(openHero && cell.instanceId)openHero(cell.instanceId);
        else notice(cell.name + " Lv" + cell.level + "，详情暂未开放");
      } },
    });
  }
  /** 订阅当前页面刷新并查询角色名册；重复显示不叠加观察者。 */
  show(): void {
    if (this.off || this.closed) return;
    this.off = this.model.subscribe(() => this.view.refreshRoster());
    try { this.view.refreshRoster(); void this.service.refresh(); }
    catch (error) { this.close(); throw error; }
  }
  /** 关闭页面观察；在途有效查询仍更新应用持有的当前角色名册。 */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.off?.(); this.off = null;
  }
}
