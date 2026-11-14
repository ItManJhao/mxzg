/** 挂机行军显示：复用BattlePage静态英雄槽与血条，仅读取服务端选人和唯一英雄名册，不生成伤害或发奖。 */
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { instantiate, Label, Node, Sprite, UITransform } from "cc";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { MainChapterIdleState } from "../MainChapterModel";
import { BattleSpineService, SpineActor } from "./BattleSpineService";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BattleInfoUtils } from "../utils/BattleInfoUtils";

export class MainChapterIdleDisplay {
    /** dispose调用时立即置为true；引擎延迟销毁期间也禁止归还英雄到旧站位。 */
    private disposed = false;

    /** 行军显示的预制体根节点，销毁时释放资源。 */
    private constructor(public readonly root: Node, private readonly actors: readonly SpineActor[]) {}

    /** 按当前英雄主键查询GameConfig并依权威顺序映射挂机锚点；不重建模板索引，缺英雄拒绝显示。 */
    public static async open(parent: Node, state: MainChapterIdleState): Promise<MainChapterIdleDisplay> {
        const scope = ResourceAssetsUtils.createAssetScope();
        let root: Node | null = null;
        const actors: SpineActor[] = [];
        try {
            const prefab = await scope.load(ResourceAssetsUtils.describe("battle", "prefabs/BattlePage", "Prefab"));
            if (!parent.isValid) {
                throw new Error("挂机页面已关闭");
            }
            root = instantiate(prefab);
            root.name = "MainChapterIdleDisplay";
            root.parent = parent;
            root.once(Node.EventType.NODE_DESTROYED, () => scope.dispose());
            for (const child of root.children) {
                child.active = child.name === "LayerField" || child.name === "LayerHud";
            }
            const hud = root.getChildByName("LayerHud")!;
            for (const child of hud.children) {
                child.active = child.name === "HpBars";
            }
            for (const side of ["AllySlots", "EnemySlots"]) {
                for (const slot of root.getChildByPath("LayerField/" + side)!.children) {
                    slot.active = false;
                }
            }
            for (const hp of hud.getChildByName("HpBars")!.children) {
                hp.active = false;
            }
            const elements = [ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-1", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-2", "SpriteFrame"),
                ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-3", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-4", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-5", "SpriteFrame")];
            const layout = root.getChildByName("IdleLayout")!;
            const modelScale = layout.getChildByName("ModelScale")!.scale.x;
            const hpOffset = layout.getChildByName("HpOffset")!.position.y;
            for (const [order, entry] of (state.slots || []).entries()) {
                const hero = HeroRosterModel.instance.snapshot.heroes.find(row => row.id === entry.heroId);
                if (!hero) {
                    throw new Error("挂机英雄不在当前名册：" + entry.heroId);
                }
                const slot = root.getChildByPath("LayerField/AllySlots/Slot_A" + (entry.position - 1))!;
                // 旧挂机按报告数组序号重新排布，不能直接用正式阵容站位号显示。
                slot.setPosition(layout.getChildByName("Ally" + (order + 1))!.position);
                slot.active = true;
                for (const child of slot.children) {
                    child.active = false;
                }
                const actor = BattleSpineService.instance.mountBattleSpine(slot, String(hero.templateId), () => {}, { face: 1, scale: modelScale, seatY: 0 });
                actor.gesture("run");
                actors.push(actor);
                const hp = hud.getChildByPath("HpBars/AllyHp_" + (entry.position - 1))!;
                hp.active = true;
                hp.getChildByName("Label")!.getComponent(Label)!.string = String(hero.level);
                hp.getChildByName("Fill")!.getComponent(Sprite)!.fillRange = 1;
                const world = slot.worldPosition;
                const point = hp.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(world);
                hp.setPosition(point.x, point.y + hpOffset, 0);
                const elem = GameConfig.instance.getConfig(GConfig.HeroType, hero.templateId)?.elem;
                const descriptor = elem ? elements[elem - 1] : undefined;
                const icon = hp.getChildByName("ElementIcon")!;
                icon.active = !!descriptor;
                if (descriptor) {
                    const frame = await scope.load(descriptor);
                    if (icon.isValid) {
                        icon.getComponent(Sprite)!.spriteFrame = frame;
                    }
                }
            }
            const displayRoot = root;
            ViewportLayoutUtils.bindVisibleRefresh(displayRoot, () => {
                const scale = BattleInfoUtils.contentScale(ViewportLayoutUtils.readVisibleBox().width);
                displayRoot.setScale(scale, scale, 1);
            });
            return new MainChapterIdleDisplay(root, actors);
        } catch (error) {
            if (root?.isValid) {
                root.destroy();
            } else {
                scope.dispose();
            }
            throw error;
        }
    }

    /** 到达遇敌点先停止跑步，等待服务端战报，不在客户端模拟攻击。 */
    public stand(): void {
        for (const actor of this.actors) actor.gesture("stand");
    }

    /** 遇敌结束恢复同一批骨骼跑步，保留节点与已加载资源，不重新请求数据。 */
    public resume(): void {
        this.root.active = true;
        for (const actor of this.actors) {
            actor.node.active = true;
            actor.gesture("run");
        }
    }

    /** 临时将指定站位骨骼交给遇敌播放器；归还函数幂等，释放中的行军显示不再接回节点。 */
    public borrow(position: number, target: Node): { actor: SpineActor; release: () => void } {
        const home = this.root.getChildByPath("LayerField/AllySlots/Slot_A" + (position - 1));
        const actor = this.actors.find(value => value.node.parent === home);
        if (!home || !actor) {
            throw new Error("挂机遇敌保留英雄站位不一致：" + position);
        }
        const origin = actor.node.position.clone();
        // 临时战场接续挂机独立站位；不改战报中的权威position字段。
        target.setPosition(home.position);
        actor.node.parent = target;
        let released = false;
        return { actor, release: () => {
            if (released) {
                return;
            }
            released = true;
            // destroy延迟到帧末执行，不能仅靠isValid判断站位是否仍可接收节点。
            if (!this.disposed && home.isValid && actor.node.isValid) {
                actor.node.parent = home;
                actor.node.setPosition(origin);
            }
        } };
    }

    /** 关页或进入挑战先禁止英雄归还，再销毁行军节点；仍借出的英雄随遇敌战场销毁。 */
    public dispose(): void {
        this.disposed = true;
        if (this.root.isValid) {
            this.root.destroy();
        }
    }
}
