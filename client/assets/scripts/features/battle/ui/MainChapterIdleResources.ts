/** 挂机阵亡后的资源飞行表现，由主线页面持有；克隆静态模板并在1秒后释放。
 * 不读取库存、不发送请求、不解释为实际掉落；挑战、适配重排和关闭时统一清理。 */
import { instantiate, Node, Sprite, SpriteFrame, Tween, tween, UITransform, Vec3 } from "cc";
import { IdleChestUtils } from "../utils/IdleChestUtils";

export class MainChapterIdleResources {
    /** 当前未结束图标及其随机遮挡顺序，播放结束或clear时移除。 */
    private readonly active = new Map<Node, number>();

    /** 持有Prefab绑定节点和四种图片，不创建第二套静态布局。
     * @param host 页面飞行层，作为所有临时图标的父节点
     * @param template 预制体内隐藏的Sprite模板，仅用于克隆
     * @param target 旧版收集终点的静态挂点
     * @param frames 顺序为金币、钻石、角色经验、英雄经验，均为展示资源
     */
    public constructor(
        private readonly host: Node,
        private readonly template: Node,
        private readonly target: Node,
        private readonly frames: readonly SpriteFrame[],
    ) {
        if (frames.length !== 4 || frames.some(frame => !frame) || !template.getComponent(Sprite)) {
            throw new Error("挂机资源飞行静态绑定缺失");
        }
    }

    /** 将战场世界坐标转换到飞行层；关闭后的迟到回调不产生节点，不修改任何资产。 */
    public play(world: Readonly<Vec3>): void {
        if (!this.host.isValid || !this.target.isValid) {
            return;
        }
        const ui = this.host.getComponent(UITransform)!;
        const start = ui.convertToNodeSpaceAR(new Vec3(world.x, world.y, world.z));
        const destination = ui.convertToNodeSpaceAR(this.target.worldPosition);
        for (const spec of IdleChestUtils.flights()) {
            const icon = instantiate(this.template);
            icon.name = "FlyingResource";
            icon.parent = this.host;
            icon.active = true;
            icon.getComponent(Sprite)!.spriteFrame = this.frames[spec.icon];
            icon.setPosition(start.x + spec.x, start.y + spec.y, 0);
            icon.setScale(spec.scale, spec.scale, 1);
            this.active.set(icon, spec.order);
            tween(icon).to(spec.scaleSeconds, { scale: new Vec3(0.6, 0.6, 1) }).start();
            tween(icon).to(1, { position: destination }).call(() => this.remove(icon)).start();
        }
        Array.from(this.active.entries()).sort((a, b) => a[1] - b[1])
            .forEach(([node], index) => node.setSiblingIndex(index));
    }

    /** 停止图标所有补间并销毁，重复调用安全。 */
    private remove(node: Node): void {
        this.active.delete(node);
        Tween.stopAllByTarget(node);
        if (node.isValid) {
            node.destroy();
        }
    }

    /** 挑战/关闭/尺寸变化时清空仍在飞行的图标，不等待回调访问已释放节点。 */
    public clear(): void {
        for (const node of Array.from(this.active.keys())) {
            this.remove(node);
        }
    }
}
