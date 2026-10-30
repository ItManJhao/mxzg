import type { HeroCellModel, HeroListModel } from "../../module/hero/heroList";
import type { HeroCatalog } from "./HeroCatalog";
import type { HeroRosterState } from "./HeroRosterModel";

/** Presentation seam for the retained list Prefab. No numeric legacy instance IDs. */
export interface HeroRosterSource {
  read(elem: number): HeroListModel;
  retry(): void;
  select(cell: HeroCellModel): void;
}
export interface HeroRosterView {
  useRoster(source: HeroRosterSource): void;
  refreshRoster(): void;
}

export function presentHeroRoster(state: HeroRosterState, catalog: HeroCatalog, elem: number): HeroListModel {
  const cells: HeroCellModel[] = [];
  if (state.status === "ready") {
    for (const hero of state.heroes) {
      const template = catalog.find(hero.templateId);
      if (elem && template?.elem !== elem) continue;
      cells.push({ kind: "owned", hero: null,
        name: template?.name || "未知英雄（模板 " + hero.templateId + "）", showName: true,
        face: template?.icon || null, elem: template?.elem || null,
        level: hero.level, stars: hero.star, locked: false, deployed: false });
    }
  }
  let emptyText = "";
  if (state.status === "idle" || state.status === "loading") emptyText = "正在加载英雄…";
  else if (state.status === "error") emptyText = state.error + "\n点击上方“英雄”重试";
  else if (!state.heroes.length) emptyText = "尚未获得英雄";
  else if (!cells.length) emptyText = "没有符合筛选条件的英雄";
  return { synced: state.status === "ready", mode: "roster", cells, emptyText, contentFloor: 400,
    capacityLine: state.status === "ready" ? "英雄：" + state.heroes.length : "英雄：—" };
}
