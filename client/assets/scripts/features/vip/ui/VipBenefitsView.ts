/** 契约 VIP 权益窗，按旧配置次序查看当前及各档权益，随发起页面关闭。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { VipModel } from "../VipModel";
import { VipBenefitCell } from "./VipBenefitCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "vip-benefits",
    prefab: "bundles/module/vip/prefabs/VipBenefitsView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("VipBenefitsView")
export class VipBenefitsView extends BaseView {
    /** 居中权益面板，窄屏缩放保留原边距。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 服务端当前契约 VIP 等级。 */
    @property(Label) private currentLabel: Label | null = null;
    /** 当前正在浏览的配置档位。 */
    @property(Label) private levelLabel: Label | null = null;
    /** 前一档浏览按钮，最低档时隐藏。 */
    @property(Button) private previous: Button | null = null;
    /** 后一档浏览按钮，最高档时隐藏。 */
    @property(Button) private next: Button | null = null;
    /** 关闭当前权益窗。 */
    @property(Button) private closeButton: Button | null = null;
    /** 权益纵向列表，行模板与间距由预制体定义。 */
    @property(SuperScroll) private benefitList: SuperScroll | null = null;

    /** 当前浏览档位，重新打开时定位下一可解锁档。 */
    private selectedLevel = 1;

    /** 按当前已确认的契约状态初始化，左右翻档不写入角色数据。 */
    public onOpen(): void {
        const current = VipModel.instance.state?.level;
        if (current === undefined || !this.panel || !this.currentLabel || !this.levelLabel
            || !this.previous || !this.next || !this.closeButton || !this.benefitList) {
            throw new Error("VIP 权益窗缺少角色状态或预制体绑定");
        }

        const config = GameConfig.instance;
        const levels = config.getConfig(GConfig.VipLevel);
        if (!levels.length) {
            throw new Error("VIP 权益档位配置为空");
        }
        const lastTier = levels[levels.length - 1].vip_level;
        this.selectedLevel = Math.min(lastTier, current + 1);
        const content = this.benefitList.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderRow, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.renderRow, this);
            }
        });
        this.bindButton(this.previous, () => this.select(this.selectedLevel - 1));
        this.bindButton(this.next, () => this.select(this.selectedLevel + 1));
        this.bindButton(this.closeButton, () => this.close());
        this.ownListener(EventDispatcher.instance.on(VipModel.Updated, this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fit));
        this.select(this.selectedLevel);
    }

    /** 切换展示档位，从新列表的顶部开始看。 */
    private select(level: number): void {
        this.selectedLevel = level;
        this.render();
        this.benefitList!.toStart();
    }

    /** 按旧顺序展示解锁和数值权益，更高档位标为预览，时长换算为小时。 */
    private render = (): void => {
        const current = VipModel.instance.state;
        if (!current) {
            this.close();
            return;
        }

        const config = GameConfig.instance;
        const levels = config.getConfig(GConfig.VipLevel);
        const values = config.requireConfig(GConfig.VipLevel, this.selectedLevel);
        const descriptions = config.getConfig(GConfig.VipBenefitText)
            .filter(row => (values[row.key as keyof typeof values] ?? 0) > 0)
            .sort((a, b) => Number(a.type !== 1) - Number(b.type !== 1) || a.index - b.index)
            .map(row => {
                const amount = values[row.key as keyof typeof values]!;
                const value = row.type === 3 ? amount / 3600 : amount;
                const template = config.requireConfig(GConfig.Language, row.text).value ?? "";
                const text = template.replace(/<[^>]*>/g, "").replace(/%[dg]/g, String(value)).replace(/%%/g, "%");
                if (row.key === "battle_speed_2x" || row.key === "battle_speed_3x") {
                    return text + "（播放待接入）";
                }
                return row.key.startsWith("unlock_goddess_") ? text + "（出战待接入）" : text;
            });
        this.currentLabel!.string = `当前 VIP ${current.level}`;
        this.levelLabel!.string = `VIP ${this.selectedLevel} 权益${this.selectedLevel > current.level ? "预览" : ""}`;
        this.previous!.node.active = this.selectedLevel > 1;
        this.next!.node.active = this.selectedLevel < levels[levels.length - 1].vip_level;
        this.benefitList!.list.setData(descriptions);
    };

    /** 把配置文案交给当前滚动行。 */
    private renderRow(node: Node, text: string): void {
        node.getComponent(VipBenefitCell)!.render(text);
    }

    /** 按钮释放时检查原节点，兼容引擎先销毁子节点的顺序。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 使弹窗按可见画布等比排列。 */
    private fit = (): void => {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    };
}
