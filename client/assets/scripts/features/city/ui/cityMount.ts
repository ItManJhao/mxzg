import { Node, Prefab } from "cc";
import { takeStagedChrome, takeStagedHub } from "../../../ui/cityStage";
import { spawnPrefab } from "../../../ui/prefabLoad";

/** 开机加载条里实例化过的主城直接换父节点，避免再解一遍大图。 */
export function mountCityHubView(parent: Node, prefab: Prefab): Node {
  return mountStaged(parent, prefab, takeStagedHub());
}

/** 顶底栏同样吃开机阶段留下来的那份。 */
export function mountCityChromeView(parent: Node, prefab: Prefab): Node {
  return mountStaged(parent, prefab, takeStagedChrome());
}

function mountStaged(parent: Node, prefab: Prefab, staged: Node | null): Node {
  if (!parent.isValid) {
    if (staged && staged.isValid) staged.destroy();
    throw new Error("页面已关");
  }
  const root = staged ?? spawnPrefab(prefab, parent);
  if (staged) root.parent = parent;
  root.active = true;
  return root;
}
