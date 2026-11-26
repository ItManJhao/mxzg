/** 精灵技能图鉴。铁匠铺按原四档浏览配置技能，列表和说明窗口都从同一只读目录读取。 */
import { _decorator, Button, Node, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { SmithSpiritSkillUtils, type SmithSpiritSkillFace } from "../utils/SmithSpiritSkillUtils";
import { SmithSpiritSkillCell } from "./SmithSpiritSkillCell";
import { SmithSpiritSkillDetailView } from "./SmithSpiritSkillDetailView";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "smith-spirit-skills",
    prefab: "bundles/module/smith/prefabs/SmithSpiritSkillView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("SmithSpiritSkillView")
export class SmithSpiritSkillView extends BaseView {
    /** 主面板设计尺寸随窗口等比适配，内部布局由 Prefab 保存。 */
    @property(UITransform) private panel: UITransform | null = null;

    /** 从低级到超级的四个固定页签按钮。 */
    @property([Button]) private tierButtons: Button[] = [];

    /** 对应四档的已选样式，切换时只启用当前档。 */
    @property([Node]) private tierHighlights: Node[] = [];

    /** 当前档位的四列虚拟滚动技能列表。 */
    @property(SuperScroll) private skills: SuperScroll | null = null;

    /** 返回精灵合成主页面的关闭按钮。 */
    @property(Button) private closeButton: Button | null = null;

    /** 当前展示档位，初次打开前及关闭后为 0；有效档位为 1～4。 */
    private level = 0;

    /** 打开后显示低级技能并绑定四档切换及统一列表点击。 */
    public onOpen(): void {
        super.onOpen();
        if (!this.panel || !this.skills || !this.closeButton || this.tierButtons.length !== 4
                || this.tierHighlights.length !== 4) {
            throw new Error("精灵技能图鉴缺少预制体绑定");
        }
        this.tierButtons.forEach((button, index) => this.bindButton(button, () => this.selectTier(index + 1)));
        this.bindButton(this.closeButton, () => this.close());
        const content = this.skills.list.node;
        content.on(SuperContent.SELECT_ITEM, this.openDetail, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.SELECT_ITEM, this.openDetail, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel.bind(this)));
        this.selectTier(1);
    }

    /** 关闭后下次打开从第一档开始，子窗归属及监听由框架清理。 */
    public onClose(): void {
        this.level = 0;
    }

    /** 绑定本次窗口的固定按钮，销毁后的节点无需解绑。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 保持当前档点击无副作用，真正换档时重绑四列技能并返回顶部。 */
    private selectTier(level: number): void {
        if (level === this.level) {
            return;
        }
        this.level = level;
        this.tierHighlights.forEach((node, index) => { node.active = index + 1 === level; });
        const rows = SmithSpiritSkillUtils.list(level);
        this.skills!.list.setData(rows, (node, skill) => node.getComponent(SmithSpiritSkillCell)!.show(skill));
        this.skills!.toStart();
    }

    /** 通用子窗生命周期保证关图鉴后迟到的技能详情不会再上屏。 */
    private openDetail(skill: SmithSpiritSkillFace): void {
        void UIManager.instance.openChild(this, SmithSpiritSkillDetailView, skill).catch(() => {
            // 加载失败反馈由 UIManager 统一处理。
        });
    }

    /** 适配可见范围，并保留面板内的静态遮罩与关闭按钮布局。 */
    private fitPanel(): void {
        const visible = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, visible.width * 0.96 / panel.width, visible.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
