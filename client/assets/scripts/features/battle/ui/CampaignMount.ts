/**
 * 主线页面挂载：在现有页面容器中实例化 BattlePanelLayer 并适配视口，不创建旧业务入口。
 */
import { Node, Prefab } from "cc";
import { loadPrefab, spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { mountCcbiView } from "../../../framework/ui/PrefabLayout";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
/** 将已有战斗预制体挂载到共享页面壳，保持静态布局与业务逻辑分离。 */
export async function mountCampaignPage(host: Node, prefab: Prefab): Promise<Node> {
    const shellPrefab = await loadPrefab("bundles/common/prefabs/PagePrefabShell");
    if (!host.isValid)
        throw new Error("战斗页面已关闭");
    const shell = spawnPrefab(shellPrefab, host);
    shell.name = "PagePrefabShell";
    bindVisibleRefresh(shell, () => {
        if (shell.isValid)
            fitVisibleRoot(shell);
    });
    const panel = spawnPrefab(prefab, shell);
    mountCcbiView(panel);
    return panel;
}
