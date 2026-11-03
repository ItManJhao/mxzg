/**
 * 把当前角色名册投影为列表展示数据；只读 Model 和配置，不回退旧名册或生成账号英雄。
 */
import type { HeroCellModel, HeroListModel } from "./ui/HeroListPresentation";
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

/** 按元素投影只读名册，并保留真实实例 UUID 供普通升级定位，模板只负责显示。 */
export function presentHeroRoster(state: HeroRosterState, catalog: HeroCatalog, elem: number): HeroListModel {
  const cells: HeroCellModel[] = [];
  if (state.status === "ready") {
    // 旧 HeroListHeroLayer.editHeroData：上阵、星级、等级、配置 ID 依次降序；复制排序不改 Model。
    for (const hero of state.heroes.slice().sort((a,b) =>
      Number(b.deployed === true) - Number(a.deployed === true) || b.star-a.star || b.level-a.level || b.templateId-a.templateId)) {
      const template = catalog.find(hero.templateId);
      if (elem && template?.elem !== elem) continue;
      cells.push({ kind: "owned", instanceId:hero.id,
        name: template?.name || "未知英雄（模板 " + hero.templateId + "）", showName: false,
        face: template?.icon || null, elem: template?.elem || null,
        level: hero.level, stars: hero.star, locked: hero.locked === true, deployed: hero.deployed === true });
    }
  }
  let emptyText = "";
  if (state.status === "idle" || state.status === "loading") emptyText = "正在加载英雄…";
  else if (state.status === "error") emptyText = state.error + "\n等待连接恢复后同步";
  else if (!state.heroes.length) emptyText = "尚未获得英雄";
  else if (!cells.length) emptyText = "没有符合筛选条件的英雄";
  return { synced: state.status === "ready", mode: "roster", cells, emptyText,
    capacityLine: state.status === "ready" ? "英雄：" + state.heroes.length + "/" + (state.rosterInfo ? state.rosterInfo.capacity : "—") : "英雄：—" };
}
