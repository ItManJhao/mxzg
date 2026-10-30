/**
 * 道具图标。路径来自 item 表，贴图在 ui/bag。加载失败就把格子藏起来。
 */
import { Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { place, uiNode } from "./UiKit";

export function mountItemIcon(parent: Node, path: string | null, x: number, y: number): void {
  if (!path) return;
  const node = uiNode("ItemIcon");
  const ui = node.addComponent(UITransform);
  ui.setContentSize(40, 40);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(node, parent, x, y);
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (err || !asset || !node.isValid) {
        if (node.isValid) node.active = false;
        return;
      }
      sprite.spriteFrame = asset;
    });
  } catch (_err) {
    if (node.isValid) node.active = false;
  }
}
