/** 挂机行军显示：复用BattlePage静态英雄槽与血条，仅读取服务端选人和唯一英雄名册，不生成伤害或发奖。 */
import { instantiate, Label, Node, Sprite, UITransform } from "cc";
import { createAssetScope, AssetScope } from "../../../framework/assets/ResourceAssets";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { MainChapterIdleState } from "../MainChapterModel";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { bindVisibleRefresh, readVisibleBox } from "../../../framework/ui/visibleFit";
import { BattleInfoUtils } from "../utils/BattleInfoUtils";

export class MainChapterIdleDisplay {
    /** 行军显示的预制体根节点，销毁时释放资源。 */
    private constructor(public readonly root: Node, private readonly actors: readonly SpineActor[]) {}

    /** 按权威选择顺序映射IdleLayout三英雄锚点并适配窄屏；不改变协议站位，缺英雄拒绝显示，关页解除监听。 */
    public static async open(parent: Node, state: MainChapterIdleState): Promise<MainChapterIdleDisplay> {
        const scope = createAssetScope();
        let root: Node | null = null;
        const actors: SpineActor[] = [];
        try {
            const prefab = await scope.load(ResourceCatalog.prefab_battle.BattlePage);
            const templates = await scope.loadPath("config/herotype", "JsonAsset");
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
            const elements = [ResourceCatalog.hero.hero_icon_elem_1, ResourceCatalog.hero.hero_icon_elem_2,
                ResourceCatalog.hero.hero_icon_elem_3, ResourceCatalog.hero.hero_icon_elem_4, ResourceCatalog.hero.hero_icon_elem_5];
            const rows = (templates.json as { rows: { type: number; elem: number }[] }).rows;
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
                const actor = mountBattleSpine(slot, String(hero.templateId), () => {}, { face: 1, scale: modelScale, seatY: 0 });
                actor.gesture("run");
                actors.push(actor);
                const hp = hud.getChildByPath("HpBars/AllyHp_" + (entry.position - 1))!;
                hp.active = true;
                hp.getChildByName("Label")!.getComponent(Label)!.string = String(hero.level);
                hp.getChildByName("Fill")!.getComponent(Sprite)!.fillRange = 1;
                const world = slot.worldPosition;
                const point = hp.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(world);
                hp.setPosition(point.x, point.y + hpOffset, 0);
                const elem = rows.find(row => row.type === hero.templateId)?.elem;
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
            bindVisibleRefresh(displayRoot, () => {
                const scale = BattleInfoUtils.contentScale(readVisibleBox().width);
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

    /** 临时将指定站位骨骼交给遇敌播放器；归还函数幂等，关页后不复活节点。 */
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
            if (released) return;
            released = true;
            if (home.isValid && actor.node.isValid) {
                actor.node.parent = home;
                actor.node.setPosition(origin);
            }
        } };
    }

    /** 关页或进入挑战销毁行军节点，迟到骨骼加载由节点作用域取消。 */
    public dispose(): void {
        if (this.root.isValid) {
            this.root.destroy();
        }
    }
}
