/** 背包物品格子：由所属页面传入条目、显示配置和可选状态，不拥有库存或页面点击回调。 */
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import type { BagItemData } from "../data/BagItemDataUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import type { BagFace } from "../data/BagItemDataUtils";

const { ccclass, property } = _decorator;

/**
 * BagItemCell 上的格子。框、图标、数量、选中都是预制里绑好的。
 */
@ccclass("BagItemView")
export class BagItemView extends Component {
    /** 空槽底图由预制体绑定，格子复用为空槽时恢复，不再单独加载。 */
    @property(SpriteFrame)
    emptyFrame: SpriteFrame | null = null;
    /** Prefab 绑定的点击按钮，未绑定时为 null。 */
    @property(Button)
    button: Button | null = null;
    /** 稀有度底框或空槽节点，由 Prefab 绑定。 */
    @property(Node)
    frame: Node | null = null;

    /** Prefab 绑定的图标节点，未绑定时为 null。 */
    @property(Node)
    icon: Node | null = null;

    /** 库存数量标签，空槽时隐藏并清空。 */
    @property(Label)
    count: Label | null = null;

    /** 格子选中标记，由页面传入选中态。 */
    @property(Node)
    selectMark: Node | null = null;

    /** 格子绘制代次，show 和销毁时递增，使异步旧图片失效；与库存版本无关。 */
    private revision = 0;

    /** 检查物品格子必需绑定，缺失时报告具体字段。 */
    validateBindings(): void {
        for (const [field, value] of Object.entries({
            button: this.button,
            frame: this.frame,
            icon: this.icon,
            count: this.count,
            selectMark: this.selectMark,
            emptyFrame: this.emptyFrame
        })) {
            if (!value) throw new Error("BagItemView.prefab [" + this.node.name + "]: 缺失绑定 " + field);
        }
        if (!this.frame!.getComponent(Sprite) || !this.icon!.getComponent(Sprite))
            throw new Error("BagItemView.prefab [" + this.node.name + "]: frame/icon 缺少 Sprite");
    }

    /** 绘制物品或空槽并保护异步贴图；选择统一交给列表，有物品时必须提供face。 */
    show(item: Readonly<BagItemData> | null, selected: boolean, face?: BagFace, selectable = item !== null): void {
        this.validateBindings();
        if (item && !face) throw new Error("BagItemView: 有物品时必须提供配置展示数据 face");
        const revision = ++this.revision;
        const current = () => this.isValid && this.revision === revision;
        this.button!.interactable = selectable;
        if (this.selectMark) this.selectMark.active = selected;
        if (!item) {
            if (this.frame) {
                this.frame.active = true;
                this.frame.getComponent(Sprite)!.spriteFrame = this.emptyFrame;
            }
            if (this.icon) this.icon.active = false;
            if (this.count) {
                this.count.node.active = false;
                this.count.string = "";
            }
        } else {
            if (this.frame) ResManager.setSprite(this.frame, [face!.frame], current);
            if (this.icon) {
                this.icon.active = true;
                this.icon.getComponent(Sprite)!.spriteFrame = null;
                ResManager.setSprite(this.icon, [face!.icon, face!.fallback], current);
            }
            if (this.count) {
                const text = String(item.quantity);
                this.count.string = text;
                this.count.node.active = text.length > 0;
            }
        }
    }

    /** 销毁时使未完成贴图失效；列表选择监听由所属列表解除。 */
    onDestroy(): void {
        this.revision++;
    }
}
