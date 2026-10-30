import { Prefab } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { prepareHeroConfig } from "../../config/RemakeConfig";
import { loadPrefab } from "../../ui/prefabLoad";

export const HERO_PAGE_RESOURCES = {
  list: "prefabs/ui/hero/HeroListLayer",
  board: "prefabs/ui/hero/HeroListHeroLayer",
  cell: "prefabs/ui/hero/HeroIconCell",
  shell: "prefabs/ui/common/PagePrefabShell",
  backdrop: "prefabs/ui/common/ListBackdrop",
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
