/** 为列表回归提供公共红点预制体替身，生产绑定和实例持有逻辑照常执行。 */
import { Node, Prefab, UITransform } from "cc";
import { PrefabLoader } from "../assets/scripts/framework/assets/PrefabLoader";

export class RedDotFixture {
    /** 测试工具仅使用静态入口。 */
    private constructor() {}

    /** 返回与公共预制体相同的根节点初始尺寸和相对位置。 */
    public static template(): Prefab {
        return Object.assign(new Prefab(), { _instantiate: () => {
            const node = new Node("RedDot");
            node.addComponent(UITransform).setContentSize(28, 28);
            node.setPosition(28, 28, 0);
            node.active = false;
            return node;
        } });
    }

    /** 只拦截公共红点资源，其他资源继续使用原加载器；返回恢复方法。 */
    public static stubLoad(): () => void {
        const original = PrefabLoader.loadPrefab;
        const prefab = RedDotFixture.template();
        PrefabLoader.loadPrefab = path => path === "bundles/module/common/prefabs/RedDot"
            ? Promise.resolve(prefab) : original(path);
        return () => { PrefabLoader.loadPrefab = original; };
    }
}
