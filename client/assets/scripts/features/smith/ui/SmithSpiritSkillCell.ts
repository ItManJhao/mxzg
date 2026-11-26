/** 精灵图鉴中的虚拟格子。绑定当前技能图案、名称和旧图鉴的品质绶带，不保存点击数据。 */
import { _decorator, Component, Label, Node, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { SmithSpiritSkillFace } from "../utils/SmithSpiritSkillUtils";

const { ccclass, property } = _decorator;

@ccclass("SmithSpiritSkillCell")
export class SmithSpiritSkillCell extends Component {
    /** 圆框内展示技能等级图标，格子复用时清除旧显示。 */
    @property(Sprite) private icon: Sprite | null = null;

    /** 展示原语言表中的技能简称。 */
    @property(Label) private title: Label | null = null;

    /** 旧目录品质 1 的角标，与品质 2 互斥。 */
    @property(Node) private rareRibbon: Node | null = null;

    /** 旧目录品质 2 的角标，与品质 1 互斥。 */
    @property(Node) private epicRibbon: Node | null = null;

    /** 更新当前虚拟行，点击由滚动宿主交给图鉴窗口。 */
    public show(skill: SmithSpiritSkillFace): void {
        if (!this.icon || !this.title || !this.rareRibbon || !this.epicRibbon) {
            throw new Error("精灵技能格缺少图标或品质角标绑定");
        }
        this.title.string = skill.name;
        this.rareRibbon.active = skill.tag === 1;
        this.epicRibbon.active = skill.tag === 2;
        this.icon.spriteFrame = null;
        ResManager.setSprite(this.icon.node, skill.icon);
    }
}
