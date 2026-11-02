/**
 * 英雄页资源作用域：准备名册配置和列表 Prefab，不在登录前预载，也不持有角色状态。
 */
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { Prefab } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { prepareHeroConfig } from "../../config/RemakeConfig";
import { loadPrefab } from "../../framework/assets/PrefabLoader";

export const HERO_PAGE_RESOURCES = {
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

/** Shared prefabs/resources bundles have already been opened by the home entry. */
export async function loadHeroPage(scope: ResourceScope<Prefab>): Promise<Prefab> {
  await prepareHeroConfig();
  await Promise.all(Object.keys(HERO_PAGE_RESOURCES).map(key => scope.load(key)));
  return scope.load("list");
}
