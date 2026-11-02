/** 通用页面挂载与节点交互辅助：静态坐标由 Prefab 维护，仅保留可见窗口和导航留白适配。 */
import { Button, Label, Node, UITransform } from "cc";
import { seatParchmentList } from "./ParchmentLayout";
import { positiveUiSize } from "./visibleFit";
const PAGE_DESIGN_HEIGHT = 1280;
const PAGE_BOTTOM_INSET = 140;
/** 根坐标、九宫格与文本位置已写入 Prefab；这里只适配可见窗口和底部导航。 */
export function mountCcbiView(node: Node): void {
  seatAboveChrome(node);
  seatParchmentList(node);
}

/** 仅在页面下沿进入底部导航留白时上移页面。 */
export function seatAboveChrome(node: Node): void {
  const ui = node.getComponent(UITransform);
  const size = positiveUiSize(ui);
  if (!ui || !size) return;
  const height = size.height;
  const anchorY = typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
  const bottom = node.position.y - height * anchorY;
  const limit = -PAGE_DESIGN_HEIGHT / 2 + PAGE_BOTTOM_INSET;
  if (bottom >= limit) return;
  node.setPosition(node.position.x, node.position.y + (limit - bottom), node.position.z || 0);
}

/** 按名称查找显示子节点；不存在时返回 null，不创建替代节点。 */
export function findDescendant(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findDescendant(kids[i], name);
    if (found) return found;
  }
  return null;
}

/** 在显示节点上绑定点击回调；监听归属由调用方的节点生命周期负责。 */
export function bindTap(node: Node, fn: () => void): void {
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

/** 将按钮移到显示宿主并保持世界位置，避免导入菜单遮挡点击。 */
export function liftNode(node: Node, host: Node): void {
  const mark = node as Node & { mxzgRest?: { parent: Node; x: number; y: number; z: number } };
  if (!mark.mxzgRest && node.parent && node.parent !== host) {
    mark.mxzgRest = { parent: node.parent, x: node.position.x, y: node.position.y, z: node.position.z };
  }
  const rest = mark.mxzgRest;
  const from = rest && rest.parent.isValid ? rest.parent : node.parent;
  if (!from) return;
  if (from === host) {
    node.setSiblingIndex(Math.max(0, host.children.length - 1));
    return;
  }
  const pos =
    rest && from === rest.parent
      ? { x: rest.x, y: rest.y, z: rest.z }
      : { x: node.position.x, y: node.position.y, z: node.position.z };
  const fromUi = from.getComponent(UITransform);
  const hostUi = host.getComponent(UITransform);
  const fromConv = fromUi as UITransform & {
    convertToWorldSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  const hostConv = hostUi as UITransform & {
    convertToNodeSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  if (!fromConv || !fromConv.convertToWorldSpaceAR || !hostConv || !hostConv.convertToNodeSpaceAR) {
    node.setSiblingIndex(Math.max(0, from.children.length - 1));
    return;
  }
  try {
    const world = fromConv.convertToWorldSpaceAR(pos);
    if (!world || !isFinite(world.x) || !isFinite(world.y)) {
      node.setSiblingIndex(Math.max(0, from.children.length - 1));
      return;
    }
    if (node.parent !== host) node.parent = host;
    const local = hostConv.convertToNodeSpaceAR(world);
    if (!local || !isFinite(local.x) || !isFinite(local.y)) {
      node.setSiblingIndex(Math.max(0, host.children.length - 1));
      return;
    }
    node.setPosition(local.x, local.y, local.z || 0);
    node.setSiblingIndex(Math.max(0, host.children.length - 1));
  } catch (_err) {
    if (node.parent) node.setSiblingIndex(Math.max(0, node.parent.children.length - 1));
  }
}
