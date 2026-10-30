import { Prefab } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { prepareInventoryConfig,prepareHeroConfig } from "../../config/RemakeConfig";
import { loadPrefab } from "../../ui/prefabLoad";
const groups = {
    bag: ["prefabs/ui/backpack/BackpackLayer", "prefabs/ui/backpack/BackpackItemCell", "prefabs/ui/backpack/BackpackTabButton",
        "prefabs/ui/backpack/BackpackInfoLayer", "prefabs/ui/common/DimSheet", "prefabs/ui/common/PagePrefabShell", "prefabs/ui/common/ListBackdrop"],
    campaign: ["prefabs/ui/battle/BattlePanelLayer", "prefabs/ui/battle/BattlePage", "prefabs/ui/battle/BattleEndLayer", "prefabs/ui/common/PagePrefabShell"],
    servers: ["prefabs/ui/login/ChooseServerLayer"],
    formation: ["prefabs/ui/hero/HeroSelectLayer","prefabs/ui/hero/HeroIconCell"],
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
