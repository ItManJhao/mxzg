/** 元素光环说明格，使用预制的五条档位行展示同组所有条件及命中档位。 */
import { _decorator, Component, Label, Node, RichText, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { FormationElementGroup } from "../utils/FormationElementUtils";

const { ccclass, property } = _decorator;

@ccclass("FormationElementCellView")
export class FormationElementCellView extends Component {
    /** 元素或混合光环图标，随该格重绑定。 */
    @property(Sprite) icon: Sprite | null = null;
    /** 该组的原语言名称。 */
    @property(Label) titleLabel: Label | null = null;
    /** 该组至少命中一个档位时显示的底板和激活条。 */
    @property(Node) activeGroup: Node | null = null;
    /** 由低到高排列的预制条件行，未使用的行隐藏。 */
    @property([RichText]) tierLabels: RichText[] = [];

    /** 核对虚拟列表实例所需的预制绑定。 */
    public validateBindings(): void {
        if (!this.icon || !this.titleLabel || !this.activeGroup
                || this.tierLabels.length !== 5 || this.tierLabels.some(label => !label)) {
            throw new Error("FormationElementCellView.prefab 缺少光环组绑定");
        }
    }

    /** 刷新该组所有行，按旧样式突出最高达标档及其属性。 */
    public show(group: FormationElementGroup): void {
        if (group.tiers.length > this.tierLabels.length) {
            throw new Error("元素档位超过预制体容量：" + group.type);
        }
        this.titleLabel!.string = group.name;
        this.activeGroup!.active = group.active;
        ResManager.setSprite(this.icon!.node, ResManager.ui("hero", "hero-icon_elem-" + group.type));
        for (const [index, label] of this.tierLabels.entries()) {
            const tier = group.tiers[index];
            label.node.active = !!tier;
            label.string = tier ? this.formatTier(tier.condition, tier.bonus, tier.active) : "";
        }
    }

    /** 将条件和属性输出为文本，只让实际命中的档位带高亮颜色。 */
    private formatTier(condition: string, bonus: string, active: boolean): string {
        const plainCondition = condition.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const plainBonus = bonus.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (active) {
            return `<color=#ffe5bf>${plainCondition}</color> <color=#76e452>${plainBonus}</color>`;
        }
        return `${plainCondition} ${plainBonus}`;
    }
}
