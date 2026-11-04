/**
 * 功能页面资源作用域：按需加载背包、出阵、选服与主线 Prefab，由 RemakeApp 持有并释放。
 */
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { Prefab } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { prepareInventoryConfig,prepareHeroConfig } from "../../config/RemakeConfig";
import { loadPrefab } from "../../framework/assets/PrefabLoader";
const groups = {
    bag: [ResourceCatalog.prefab_bag.BagView.assetPath, ResourceCatalog.prefab_bag.BagItemView.assetPath, ResourceCatalog.prefab_bag.BagTabView.assetPath,
        ResourceCatalog.prefab_bag.BagInfoView.assetPath, ResourceCatalog.prefab_common.DimSheet.assetPath, ResourceCatalog.prefab_common.PagePrefabShell.assetPath, ResourceCatalog.prefab_common.ListBackdrop.assetPath],
    campaign: [ResourceCatalog.prefab_battle.CampaignView.assetPath, ResourceCatalog.prefab_battle.BattlePage.assetPath, ResourceCatalog.prefab_battle.BattleEndLayer.assetPath, ResourceCatalog.prefab_common.PagePrefabShell.assetPath],
    servers: [ResourceCatalog.prefab_login.ServerPickerView.assetPath],
    formation: [ResourceCatalog.prefab_hero.FormationView.assetPath,ResourceCatalog.prefab_hero.FormationHeroCellView.assetPath],
} as const;
const allowed = new Set<string>([...groups.bag, ...groups.campaign, ...groups.servers, ...groups.formation]);
const pool = new ResourcePool<Prefab>({
    load: path => allowed.has(path) ? loadPrefab(path) : Promise.reject(new Error("未登记的功能资源：" + path)),
    retain: asset => { asset.addRef(); }, release: asset => { asset.decRef(false); },
});
export const createFeatureResourceScope = () => pool.createScope();
export async function loadFeaturePage(scope: ResourceScope<Prefab>, group: keyof typeof groups): Promise<Prefab> {
    if (group !== "servers")
        await prepareInventoryConfig();
    if (group === "formation") await prepareHeroConfig();
    await Promise.all(groups[group].map(path => scope.load(path)));
    return scope.load(groups[group][0]);
}
