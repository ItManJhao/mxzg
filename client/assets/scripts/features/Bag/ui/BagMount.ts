import { Button, BlockInputEvents, Node, Prefab, Sprite, UITransform } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BagFace } from "../data/BagItemData";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { mountCcbiView } from "../../../ui/pagePrefabShell";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot, positiveUiSize } from "../../../ui/visibleFit";
import { BagInfoView } from "./BagInfoView";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";

const PAGE_SHELL = "prefabs/ui/common/PagePrefabShell";
const LIST_BACKDROP = "prefabs/ui/common/ListBackdrop";
const BAG_BACKDROP = ["ui/bag/map-bg-backpack-1", "ui/maps/map-bg-backpack-1"];

/**
 * 把背包 Prefab 盖进页面宿主。店内底和羊皮纸跟原来的壳一样。
 * 这里只认已知预制的直接子节点，不在 BagView 里搜整棵树。
 */
export async function mountBackpackPage(host: Node, layer: Prefab): Promise<Node> {
  let shell: Node | null = null;
  try {
    const shellPrefab = await loadPrefab(PAGE_SHELL);
    const backdropPrefab = await loadPrefab(LIST_BACKDROP);
    if (!host.isValid) throw new Error("页面已关");
    const pack = spawnPrefab(backdropPrefab, host);
    pack.name = "ListBackdrop";
    paintBackdrop(pack);
    shell = spawnPrefab(shellPrefab, host);
    shell.name = "PagePrefabShell";
    const backdrop = host.getChildByName("ListBackdrop");
    if (backdrop && backdrop.parent !== shell) {
      backdrop.parent = shell;
      backdrop.setSiblingIndex(0);
    }
    bindVisibleRefresh(shell, () => {
      if (!shell || !shell.isValid) return;
      const box = fitVisibleRoot(shell);
      stretchBackdrop(shell, box.width, box.height);
    });
  } catch (err) {
    GameLog.shared.warn("Bag", "背包底图没有挂上 " + messageOf(err));
  }
  if (!host.isValid) throw new Error("页面已关");
  const parent = shell && shell.isValid ? shell : host;
  const view = spawnPrefab(layer, parent);
  mountCcbiView(view);
  return view;
}

/** 详情盖在背包上。DimSheet 的 dim、InfoCard 都是这一层的直接子节点。 */
export function openBagInfo(host: Node, dimPrefab: Prefab, infoPrefab: Prefab, face: BagFace, toast: (text: string) => void, readOnly = false): Node | null {
  if (!host.isValid) return null;
  const old = host.getChildByName("InfoCard");
  if (old) old.destroy();
  const sheet = spawnPrefab(dimPrefab, host);
  sheet.name = "InfoCard";
  sheet.setSiblingIndex(Math.max(0, host.children.length - 1));
  const close = () => {
    if (sheet.isValid) sheet.destroy();
  };
  const dim = sheet.getChildByName("dim");
  if (dim) {
    if (!dim.getComponent(Button)) dim.addComponent(Button);
    dim.on(Button.EventType.CLICK, close);
    seatCenter(dim, host);
  } else {
    GameLog.shared.warn("Bag", "DimSheet 下没有 dim");
  }
  const card = spawnPrefab(infoPrefab, sheet);
  seatCenter(card, host);
  if (!card.getComponent(BlockInputEvents)) card.addComponent(BlockInputEvents);
  const info = card.getComponent(BagInfoView);
  if (!info) {
    GameLog.shared.warn("Bag", "BackpackInfoLayer 上没有 BagInfoView");
    return sheet;
  }
  info.show(face, close, toast);
  info.setReadOnly(readOnly);
  return sheet;
}

/**
 * 把节点中心放到宿主中心。位置用两边预制上的尺寸和锚点算，不写死坐标。
 * 尺寸还没挂上就留着预制自己的落点。
 */
function seatCenter(node: Node, host: Node): void {
  const hostUi = host.getComponent(UITransform);
  const hostSize = positiveUiSize(hostUi);
  if (!hostUi || !hostSize) {
    GameLog.shared.warn("Bag", "详情宿主没有尺寸，留在预制落点");
    return;
  }
  const nodeUi = node.getComponent(UITransform);
  const nodeSize = positiveUiSize(nodeUi);
  if (!nodeUi || !nodeSize) {
    GameLog.shared.warn("Bag", node.name + " 没有尺寸，留在预制落点");
    return;
  }
  const hostAx = typeof hostUi.anchorX === "number" ? hostUi.anchorX : 0.5;
  const hostAy = typeof hostUi.anchorY === "number" ? hostUi.anchorY : 0.5;
  const nodeAx = typeof nodeUi.anchorX === "number" ? nodeUi.anchorX : 0.5;
  const nodeAy = typeof nodeUi.anchorY === "number" ? nodeUi.anchorY : 0.5;
  const midX = (0.5 - hostAx) * hostSize.width;
  const midY = (0.5 - hostAy) * hostSize.height;
  node.setPosition(midX - (0.5 - nodeAx) * nodeSize.width, midY - (0.5 - nodeAy) * nodeSize.height, 0);
}

function paintBackdrop(pack: Node): void {
  const art = pack.getChildByName("ShellBackdrop");
  if (!art) {
    GameLog.shared.warn("Bag", "ListBackdrop 下没有 ShellBackdrop");
    return;
  }
  const sprite = art.getComponent(Sprite);
  if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  paintSpritePaths(art, BAG_BACKDROP);
}

function stretchBackdrop(root: Node, width: number, height: number): void {
  if (!(width > 1) || !(height > 1)) return;
  const pack = root.getChildByName("ListBackdrop");
  if (!pack) return;
  assignContentSize(pack.getComponent(UITransform), width, height);
  const ui = pack.getComponent(UITransform);
  if (ui) ui.setAnchorPoint(0.5, 0.5);
  pack.setPosition(0, 0, 0);
  const names = ["ShellBackdropDim", "ShellBackdrop"];
  for (let i = 0; i < names.length; i++) {
    const node = pack.getChildByName(names[i]);
    if (!node) continue;
    assignContentSize(node.getComponent(UITransform), width, height);
    const childUi = node.getComponent(UITransform);
    if (childUi) childUi.setAnchorPoint(0.5, 0.5);
    node.setPosition(0, 0, 0);
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  }
}
