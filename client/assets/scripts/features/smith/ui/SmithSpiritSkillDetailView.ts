/** 精灵图鉴的只读技能说明。由图鉴持有子窗，显示所点档位的技能效果与冷却，关窗释放赋图。 */
import { _decorator, Button, Label, Sprite, UITransform } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { SmithSpiritSkillFace } from "../utils/SmithSpiritSkillUtils";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "smith-spirit-skill-detail",
    prefab: "bundles/module/smith/prefabs/SmithSpiritSkillDetailView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("SmithSpiritSkillDetailView")
export class SmithSpiritSkillDetailView extends BaseView<SmithSpiritSkillFace> {
    /** 深色技能说明框的固定布局根，用于适配不同大小的可见区。 */
    @property(UITransform) private panel: UITransform | null = null;

    /** 详情左上角的技能图标，以所选等级加载。 */
    @property(Sprite) private icon: Sprite | null = null;

    /** 技能名称与 Lv. 等级。 */
    @property(Label) private title: Label | null = null;

    /** 展示技能的主动或被动类型文案。 */
    @property(Label) private skillType: Label | null = null;

    /** 当前等级的完整技能效果。 */
    @property(Label) private effect: Label | null = null;

    /** 按配置回合渲染冷却规则。 */
    @property(Label) private cooldown: Label | null = null;

    /** 仅关闭技能详情并露出原图鉴的按钮。 */
    @property(Button) private closeButton: Button | null = null;

    /** 应用只读技能展示，关闭前按钮和视口更新都归窗口显示期。 */
    public onOpen(skill?: SmithSpiritSkillFace): void {
        if (!skill || !this.panel || !this.icon || !this.title || !this.skillType || !this.effect || !this.cooldown
                || !this.closeButton) {
            throw new Error("精灵技能说明缺少技能或预制体绑定");
        }
        super.onOpen(skill);
        this.title.string = `${skill.name} Lv.${skill.level}`;
        this.skillType.string = skill.type;
        this.effect.string = skill.description;
        this.cooldown.string = skill.cooldown;
        ResManager.setSprite(this.icon.node, skill.icon);
        const button = this.closeButton.node;
        button.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (button.isValid) {
                button.off(Button.EventType.CLICK, this.close, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel.bind(this)));
    }

    /** 清理所点技能投影和图标，迟到资源不会影响后续窗口。 */
    public onClose(): void {
        ResManager.setSprite(this.icon?.node ?? null, null);
        this.args = undefined;
    }

    /** 根对齐实际视口，说明框保持预制体宽高比。 */
    private fitPanel(): void {
        const visible = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, visible.width * 0.9 / panel.width, visible.height * 0.8 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
