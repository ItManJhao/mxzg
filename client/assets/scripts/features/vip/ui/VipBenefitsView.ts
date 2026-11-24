/**
 * 由契约 VIP 页打开的特权预览。默认查看下一档，按旧配置浏览各档权益说明。
 * 翻页和滚动仅改变本窗的展示；不发协议，也不激活预览中的权益。
 */
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
import { ItemDetailUtils } from "../../bag/utils/ItemDetailUtils";
import { VipModel } from "../VipModel";
import { VipBenefitCell, type VipBenefitDisplay } from "./VipBenefitCell";

const { ccclass, property } = _decorator;

/** 沿用旧版横向指数缓出的进入时长，单位为秒。 */
const FLIP_SECONDS = 0.5;

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
    /** 绶带上方始终显示下一级，服务端达到最高档时显示已满级。 */
    @property(Label) private currentLabel: Label | null = null;
    /** 绶带内只显示正在浏览的 VIP 配置档位。 */
    @property(Label) private levelLabel: Label | null = null;
    /** 前一档浏览按钮，最低档时隐藏。 */
    @property(Button) private previous: Button | null = null;
    /** 后一档浏览按钮，最高档时隐藏。 */
    @property(Button) private next: Button | null = null;
    /** 权益纵向列表，固定的父裁剪层限制翻页时的横向移动。 */
    @property(SuperScroll) private benefitList: SuperScroll | null = null;

    /** 当前浏览档位，重新打开时定位下一可解锁档。 */
    private selectedLevel = 1;
    /** 横滑中的起始位置（逻辑像素）和累计时长（秒），结束或关窗时清空。 */
    private slide: { readonly fromX: number; elapsed: number } | null = null;

    /** 按当前已确认的契约状态初始化，左右翻档不写入角色数据。 */
    public onOpen(): void {
        const current = VipModel.instance.state?.level;
        if (current === undefined || !this.panel || !this.currentLabel || !this.levelLabel
            || !this.previous || !this.next || !this.benefitList) {
            throw new Error("VIP 权益窗缺少角色状态或预制体绑定");
        }

        const config = GameConfig.instance;
        const levels = config.getConfig(GConfig.VipLevel);
        if (!levels.length) {
            throw new Error("VIP 权益档位配置为空");
        }
        const lastTier = levels[levels.length - 1].vip_level;
        this.selectedLevel = Math.min(lastTier, current + 1);
        this.benefitList.node.setPosition(0, 0, 0);
        const content = this.benefitList.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderRow, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.renderRow, this);
            }
        });
        this.bindButton(this.previous, () => this.flip(-1));
        this.bindButton(this.next, () => this.flip(1));
        this.ownListener(EventDispatcher.instance.on(VipModel.Updated, this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fit));
        this.render();
        this.benefitList.toStart();
    }

    /** 只允许在档位范围内翻页，换档后从头浏览并从固定裁剪区边缘滑入。 */
    private flip(direction: -1 | 1): void {
        const level = this.selectedLevel + direction;
        if (this.slide || !GameConfig.instance.getConfig(GConfig.VipLevel, level) || level < 1) {
            return;
        }

        const scroll = this.benefitList!;
        this.selectedLevel = level;
        const fromX = -direction * scroll.node.getComponent(UITransform)!.width;
        this.slide = { fromX, elapsed: 0 };
        scroll.node.setPosition(fromX, 0, 0);
        this.render();
        scroll.toStart();
    }

    /** 在固定遮罩内推动权益内容，结束时归位，避免快速连点重叠切页。 */
    public update(deltaTime: number): void {
        const slide = this.slide;
        if (!slide) {
            return;
        }
        slide.elapsed += deltaTime;
        if (slide.elapsed >= FLIP_SECONDS) {
            this.benefitList!.node.setPosition(0, 0, 0);
            this.slide = null;
        } else {
            const remaining = Math.pow(2, -10 * slide.elapsed / FLIP_SECONDS);
            this.benefitList!.node.setPosition(slide.fromX * remaining, 0, 0);
        }
    }

    /** 关窗终止过渡；列表监听和按钮事件由基类统一解除。 */
    public onClose(): void {
        this.slide = null;
    }

    /** 按旧配置分组显示解锁和数值权益，保留高亮，秒数按小时显示。 */
    private render = (): void => {
        const current = VipModel.instance.state;
        if (!current) {
            this.close();
            return;
        }

        const config = GameConfig.instance;
        const levels = config.getConfig(GConfig.VipLevel);
        const values = config.requireConfig(GConfig.VipLevel, this.selectedLevel);
        const rows = config.getConfig(GConfig.VipBenefitText)
            .filter(row => (values[row.key as keyof typeof values] ?? 0) > 0)
            .sort((a, b) => Number(a.type !== 1) - Number(b.type !== 1) || a.index - b.index);
        const descriptions: VipBenefitDisplay[] = rows.map((row, index) => {
            const amount = values[row.key as keyof typeof values]!;
            const value = row.type === 3 ? amount / 3600 : amount;
            const template = config.requireConfig(GConfig.Language, row.text).value ?? "";
            const text = template.replace(/%[dg]/g, String(value)).replace(/%%/g, "%");
            const next = rows[index + 1];
            return {
                text: ItemDetailUtils.richText(text),
                groupSeparator: row.type === 1 && !!next && next.type !== 1,
            };
        });
        const maxLevel = levels[levels.length - 1].vip_level;
        this.currentLabel!.string = config.requireConfig(GConfig.Language, current.level >= maxLevel ? 47635 : 47058).value ?? "";
        this.levelLabel!.string = `VIP${this.selectedLevel}`;
        this.previous!.node.active = this.selectedLevel > 1;
        this.next!.node.active = this.selectedLevel < maxLevel;
        this.benefitList!.list.setData(descriptions);
    };

    /** 把配置文案与分组标记交给复用中的行。 */
    private renderRow(node: Node, value: VipBenefitDisplay): void {
        node.getComponent(VipBenefitCell)!.render(value);
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
