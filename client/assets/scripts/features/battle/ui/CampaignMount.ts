import { Node, Prefab } from "cc";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { mountCcbiView } from "../../../ui/pagePrefabShell";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../ui/visibleFit";
export async function mountCampaignPage(host: Node, prefab: Prefab): Promise<Node> {
    const shellPrefab = await loadPrefab("prefabs/ui/common/PagePrefabShell");
    if (!host.isValid)
        throw new Error("战斗页面已关闭");
    const shell = spawnPrefab(shellPrefab, host);
    shell.name = "PagePrefabShell";
    bindVisibleRefresh(shell, () => { if (shell.isValid)
        fitVisibleRoot(shell); });
    const panel = spawnPrefab(prefab, shell);
    mountCcbiView(panel);
    return panel;
}
