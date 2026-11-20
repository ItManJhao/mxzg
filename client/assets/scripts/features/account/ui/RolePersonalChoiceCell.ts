/** 个人空间装饰格和展示行，滚动复用时由装饰窗提供完整显示数据。 */
import { _decorator, Color, Component, Label, Node, Sprite, Tween, tween, UIOpacity, UITransform } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePersonalChoiceUtils, type DecorationTab } from "../utils/RolePersonalChoiceUtils";

const { ccclass, property } = _decorator;

/** 旧版形象选中时头像叠加的半亮度颜色。 */
const SELECTED_IMAGE_TINT = new Color(127, 127, 127);

/** 预制体复用格的渲染输入，图片与文案均已由父窗口投影。 */
export interface RoleChoiceCellData {
    readonly id: number;
    readonly name: string;
    readonly icon: string | readonly string[];
    readonly detail: string;
    readonly status: string;
    readonly dim: boolean;
    readonly selected: boolean;
    readonly tab: DecorationTab;
    readonly star?: number;
    readonly tag?: string;
    readonly condition?: string;
}

@ccclass("RolePersonalChoiceCell")
export class RolePersonalChoiceCell extends Component {
    /** 形象头像或称号原图。 */
    @property(Sprite) icon: Sprite | null = null;
    /** 头像框图片保留原图留白，与裁切留白的头像分开渲染。 */
    @property(Sprite) borderArtwork: Sprite | null = null;
    /** 头像页选中环的透明度，头像框页只显示居中文字。 */
    @property(UIOpacity) headSelectionOpacity: UIOpacity | null = null;
    /** 英雄、皮肤或称号名称。 */
    @property(Label) nameLabel: Label | null = null;
    /** 该项星级，或称号原条件与加成。 */
    @property(Label) detailLabel: Label | null = null;
    /** 当前候选的解锁或有效期。 */
    @property(Label) statusLabel: Label | null = null;
    /** 当前选择由父页控制，回收格不会继续沿用上次高亮。 */
    @property(Node) selected: Node | null = null;
    /** 头像页专用的圆形金边，头像框页直接显示框本体。 */
    @property(Node) portraitFrame: Node | null = null;
    /** 头像框页名称底牌。 */
    @property(Node) namePlate: Node | null = null;
    /** 头像框选中提示，头像选中沿圆框和高亮表示。 */
    @property(Label) selectionLabel: Label | null = null;
    /** 形象格的品质框。 */
    @property(Sprite) frame: Sprite | null = null;
    /** 形象格的低星徽记，复用时重新绑定星型。 */
    @property([Node]) stars: Node[] = [];
    /** 称号行的限时或永久标签。 */
    @property(Label) tagLabel: Label | null = null;
    /** 称号来源或者贵重标记的累计充值条件。 */
    @property(Label) conditionLabel: Label | null = null;
    /** 称号图片可显示的固定区域，由预制体预留。 */
    @property(UITransform) titleArtworkBounds: UITransform | null = null;
    /** 当前格正在显示的装饰键，复用到另一类或另一项时先清除旧图。 */
    private artwork = "";
    /** 当前可见选中环的渐隐循环，取消选中或格子回收时停止。 */
    private headSelectionFade: Tween<UIOpacity> | null = null;

    /** 恢复可见格的选中动画，并按当前称号图的原始尺寸适配。 */
    protected onEnable(): void {
        if (this.titleArtworkBounds) {
            this.icon!.node.on(Node.EventType.SIZE_CHANGED, this.fitTitleArtwork, this);
            this.fitTitleArtwork();
        }
        this.updateHeadSelection();
    }

    /** 回收格子时移除尺寸监听并停止选中动画。 */
    protected onDisable(): void {
        if (this.titleArtworkBounds) {
            this.icon!.node.off(Node.EventType.SIZE_CHANGED, this.fitTitleArtwork, this);
        }
        this.stopHeadSelectionFade();
    }

    /** 将虚拟列表的新数据完整应用到原预制节点。 */
    public render(data: RoleChoiceCellData): void {
        this.nameLabel!.string = data.name;
        this.detailLabel!.string = data.detail;
        this.statusLabel!.string = data.status;
        this.selected!.active = data.selected && data.tab !== "border";
        const icon = this.borderArtwork && data.tab === "border" ? this.borderArtwork : this.icon!;
        if (this.borderArtwork) {
            const hiddenIcon = icon === this.icon ? this.borderArtwork : this.icon!;
            if (hiddenIcon.node.active) {
                hiddenIcon.node.active = false;
                ResManager.setSprite(hiddenIcon.node, null);
            }
            icon.node.active = true;
        }
        icon.grayscale = data.dim;
        icon.color = data.tab === "image" && data.selected ? SELECTED_IMAGE_TINT : Color.WHITE;
        const artwork = data.tab + ":" + data.id;
        if (artwork !== this.artwork) {
            this.artwork = artwork;
            icon.spriteFrame = null;
        }
        ResManager.setSprite(icon.node, data.icon);
        if (this.portraitFrame) {
            this.portraitFrame.active = data.tab === "head";
        }
        if (this.namePlate) {
            this.namePlate.active = data.tab === "border";
        }
        if (this.selectionLabel) {
            this.selectionLabel.node.active = data.tab === "border" && data.selected;
            this.selectionLabel.string = "选中";
        }
        if (this.tagLabel) {
            this.tagLabel.string = data.tag ?? "";
        }
        if (this.conditionLabel) {
            this.conditionLabel.string = data.condition ?? "";
        }
        if (this.frame) {
            this.paintStars(data.star ?? 0);
        }
        this.updateHeadSelection();
    }

    /** 可见头像环按旧版节奏渐隐一秒，再用 0.4 秒渐显。 */
    private updateHeadSelection(): void {
        const opacity = this.headSelectionOpacity;
        if (!opacity) {
            return;
        }
        if (!this.enabledInHierarchy || !this.selected!.active) {
            this.stopHeadSelectionFade();
        } else if (!this.headSelectionFade) {
            this.headSelectionFade = tween(opacity)
                .repeatForever(tween<UIOpacity>().to(1, { opacity: 0 }).to(0.4, { opacity: 255 }))
                .start();
        }
    }

    /** 停止当前格的渐隐，使下次选中时从完整亮度开始。 */
    private stopHeadSelectionFade(): void {
        if (this.headSelectionFade) {
            this.headSelectionFade.stop();
            this.headSelectionFade = null;
            this.headSelectionOpacity!.opacity = 255;
        }
    }

    /** 图片加载后保持裁切区域的原比例，并限制在称号图预留区域内。 */
    private fitTitleArtwork(): void {
        const icon = this.icon!.node;
        const image = icon.getComponent(UITransform)!;
        const bounds = this.titleArtworkBounds!;
        const scale = Math.min(bounds.width / image.width, bounds.height / image.height);
        icon.setScale(scale, scale, 1);
    }

    /** 沿用旧星型分段和品质色，十星以上显示实际星数。 */
    private paintStars(star: number): void {
        ResManager.setSprite(this.frame!.node, RolePersonalChoiceUtils.heroFrame(star));
        const marker = RolePersonalChoiceUtils.heroStarMarkers(star);
        this.detailLabel!.node.active = star >= 10;
        this.stars.forEach((node, index) => {
            node.active = star < 10 && index < marker.count;
            if (node.active) {
                ResManager.setSprite(node, marker.icon);
            }
        });
    }
}
