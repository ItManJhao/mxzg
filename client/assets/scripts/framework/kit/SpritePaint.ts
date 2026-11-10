/** 图片赋值适配：所有取图交给ResourceAssetsUtils.getSpriteFrame，不建立第二份资源池。
 * 此处仅负责回退顺序与刷新代次；节点销毁、列表复用或页面关闭后拒绝旧结果。
 */
import { GameLog } from "../../core/GameLog";
import { Node, Sprite } from "cc";
import { ResourceAssetsUtils } from "../assets/ResourceAssets";
import type { ResourceDescriptor } from "../assets/ResourceCatalog";

/** 每个图片节点最后一次赋图代次；弱引用不延长节点生命周期。 */
const revisions = new WeakMap<Node, number>();

/** 按顺序取第一张可用图片；失败保留信息，旧轮次不得赋图或继续请求占位。 */
function paintSources(
    node: Node | null,
    sources: readonly (string | ResourceDescriptor<"SpriteFrame">)[],
    isCurrent: () => boolean,
): void {
    if (!node?.isValid) {
        return;
    }
    const image = node.getComponent(Sprite);
    if (!image) {
        return;
    }
    const revision = (revisions.get(node) || 0) + 1;
    revisions.set(node, revision);
    const current = () => node.isValid && image.isValid && revisions.get(node) === revision && isCurrent();
    const load = async () => {
        let failure: unknown;
        for (const source of sources) {
            if (!current()) {
                return;
            }
            try {
                const frame = await ResourceAssetsUtils.getSpriteFrame(node, source);
                if (current()) {
                    image.spriteFrame = frame;
                }
                return;
            } catch (error) {
                failure = error;
            }
        }
        if (current() && failure) {
            GameLog.shared.classified("FRAMEWORK", "warn", "SpritePaint", "资源显示失败：" + String(failure));
        }
    };
    void load();
}

/** 通过统一取图入口显示资源描述，支持Bundle和UUID；重复调用只接受最新结果。 */
export function paintSpriteResources(node: Node | null, descriptors: readonly ResourceDescriptor<"SpriteFrame">[]): void {
    paintSources(node, descriptors, () => true);
}

/** 通过统一入口显示resources图片路径；isCurrent由页面关闭或列表复用代次决定。 */
export function paintSpritePaths(node: Node | null, paths: string[], isCurrent: () => boolean = () => true): void {
    paintSources(node, paths, isCurrent);
}
