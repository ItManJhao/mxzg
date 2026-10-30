import { Node, Prefab } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { bindHangProbe, mountCcbiView } from "../../../ui/pagePrefabShell";
import { mountIdleHang } from "../../../ui/idleHangView";

const PAGE_SHELL = "prefabs/ui/common/PagePrefabShell";

/**
 * 把挂机壳和 BattlePanelLayer 盖进页面宿主。
 * 殿堂先铺，底栏面板后挂，所以三钮在上面。
 * 这里只认壳的直接子节点，不在 BattleHangView 里搜整棵树。
 */
export async function mountBattleHang(host: Node, layer: Prefab): Promise<Node> {
  const shellPrefab = await loadPrefab(PAGE_SHELL);
  if (!host.isValid) throw new Error("页面已关");
  const shell = spawnPrefab(shellPrefab, host);
  shell.name = "PagePrefabShell";
  mountIdleHang(shell);
  bindHangProbe(shell, host);
  const view = spawnPrefab(layer, shell);
  try {
    mountCcbiView(view);
  } catch (err) {
    GameLog.shared.warn("Mainline", "战斗面板位置 " + messageOf(err));
  }
  return view;
}

/** 关卡标放在壳上，和旧挂机同一处。探针留在最上面。 */
export function seatHangChip(chip: Node): void {
  const shell = chip.parent;
  if (!shell || !shell.isValid) return;
  chip.setPosition(-240, 220, 0);
  chip.setSiblingIndex(Math.max(0, shell.children.length - 1));
  const spot = shell.getChildByName("HangProbeHotspot");
  if (spot) spot.setSiblingIndex(Math.max(0, shell.children.length - 1));
}
