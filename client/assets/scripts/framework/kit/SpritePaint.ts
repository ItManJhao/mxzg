/** 图片显示适配：类型化资源使用共享作用域；旧动态显示路径保留原失败回退语义。 */
import { Node, resources, Sprite, SpriteFrame } from "cc";
import { createAssetScope, AssetScope } from "../assets/ResourceAssets";
import type { ResourceDescriptor } from "../assets/ResourceCatalog";

const scopes = new WeakMap<Node, AssetScope>();
const revisions = new WeakMap<Node, number>();

/** 在节点作用域加载已登记 SpriteFrame；重复刷新拒绝旧结果，销毁释放持有且不污染新节点。 */
export function paintSpriteResources(node: Node | null, descriptors: readonly ResourceDescriptor<"SpriteFrame">[]): void {
  if (!node?.isValid || !node.getComponent(Sprite)) return;
  let scope = scopes.get(node);
  if (!scope) {
    scope = createAssetScope(); scopes.set(node, scope);
    const owned = scope;
    node.once(Node.EventType.NODE_DESTROYED, () => { owned.dispose(); scopes.delete(node); revisions.delete(node); });
  }
  const revision = (revisions.get(node) || 0) + 1;
  revisions.set(node, revision);
  const load = async () => {
    let failure: unknown;
    for (const descriptor of descriptors) {
      try {
        const frame = await scope!.load(descriptor);
        if (node.isValid && revisions.get(node) === revision) node.getComponent(Sprite)!.spriteFrame = frame;
        return;
      } catch (error) { failure = error; }
    }
    if (node.isValid && revisions.get(node) === revision && failure) console.warn("资源显示失败", failure);
  };
  void load();
}

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
