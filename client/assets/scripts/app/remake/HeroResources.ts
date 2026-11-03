/**
 * 英雄页资源作用域：准备名册配置和列表 Prefab，不在登录前预载，也不持有角色状态。
 */
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { Prefab } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { prepareHeroConfig, prepareHeroLevelConfig } from "../../config/RemakeConfig";
import { loadPrefab } from "../../framework/assets/PrefabLoader";

export const HERO_PAGE_RESOURCES = {
  info: ResourceCatalog.prefab_hero.HeroInfoView.assetPath,
  level: ResourceCatalog.prefab_hero.HeroInfoUpLevelLayer.assetPath,
  list: ResourceCatalog.prefab_hero.HeroListView.assetPath,
  board: ResourceCatalog.prefab_hero.HeroListBoardView.assetPath,
  cell: ResourceCatalog.prefab_hero.HeroIconCellView.assetPath,
  shell: ResourceCatalog.prefab_common.PagePrefabShell.assetPath,
  backdrop: ResourceCatalog.prefab_common.ListBackdrop.assetPath,
} as const;
const pool = new ResourcePool<Prefab>({
  load: key => {
    const path = HERO_PAGE_RESOURCES[key as keyof typeof HERO_PAGE_RESOURCES];
    if (!path) return Promise.reject(new Error("未登记的英雄资源：" + key));
    return loadPrefab(path);
  },
  retain: asset => { asset.addRef(); },
  release: asset => { asset.decRef(false); },
});
export const createHeroResourceScope = () => pool.createScope();

/** 主页已打开共享 Bundle；只准备名册资源，普通升级窗口留到实际打开时加载。 */
export async function loadHeroPage(scope: ResourceScope<Prefab>): Promise<Prefab> {
  await prepareHeroConfig();
  await Promise.all(Object.keys(HERO_PAGE_RESOURCES).filter(key=>key!=="level"&&key!=="info").map(key => scope.load(key)));
  return scope.load("list");
}

/** 仅打开普通升级时持有该组合 Prefab，并复用当前配置仓库与资源作用域。 */
export async function loadHeroLevelPage(scope:ResourceScope<Prefab>):Promise<Prefab> {
  await prepareHeroLevelConfig();return scope.load("level");
}
