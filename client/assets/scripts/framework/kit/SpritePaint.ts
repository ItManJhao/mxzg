import { Node, resources, Sprite, SpriteFrame } from "cc";

/** 按 resources 路径刷一张图。失败就试下一张。不搜节点。 */
export function paintSpritePaths(node: Node | null, paths: string[], isCurrent: () => boolean = () => true): void {
  if (!node || !node.isValid) return;
  const image = node.getComponent(Sprite);
  if (!image) return;
  const loadAt = (index: number) => {
    if (!node.isValid || !isCurrent() || index >= paths.length) return;
    resources.load(paths[index] + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid || !isCurrent()) return;
      if (err || !asset) {
        loadAt(index + 1);
        return;
      }
      image.spriteFrame = asset;
    });
  };
  loadAt(0);
}
