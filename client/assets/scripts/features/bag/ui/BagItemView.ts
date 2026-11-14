/** 背包物品格子：由所属页面传入条目、显示配置和可选状态，不拥有库存或页面点击回调。 */
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import type { BagItemData, BagListItem } from "../data/BagItemDataUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import type { BagFace } from "../data/BagItemDataUtils";
import { ItemDetailUtils } from "../utils/ItemDetailUtils";

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

    /** 精英碎片独立的大图标槽，尺寸保存在Prefab，普通图标尺寸不随类别改变。 */
    @property(Node)
    shardIcon: Node | null = null;

    /** 精英碎片右上角拼图标记，英雄材料和空槽隐藏。 */
    @property(Node)
    shardCorner: Node | null = null;

    /** 旧精英碎片最多五颗黄星，位置和原图由Prefab保存。 */
    @property([Node])
    shardStars: Node[] = [];

    /** 仅背包库存启用的完成度区域；奖励与产物格不显示此区域。 */
    @property(Node)
    shardProgress: Node | null = null;

    /** 完成度的水平填充图，按当前持有量显示0至1，不修改库存。 */
    @property(Sprite)
    shardProgressFill: Sprite | null = null;

    /** 当前持有数/真实合成所需数，不以截顶比例替换实际数量。 */
    @property(Label)
    shardProgressLabel: Label | null = null;

    /** 普通数量标签，精灵、空槽及背包精英碎片进度模式隐藏；奖励格仍显示本次数量。 */
    @property(Label)
    count: Label | null = null;

    /** 格子选中标记，由页面传入选中态。 */
    @property(Node)
    selectMark: Node | null = null;

    /** 格子绘制代次，show 和销毁时递增，使异步旧图片失效；与库存版本无关。 */
    private revision = 0;

    /** 检查物品格子必需绑定，缺失时报告具体字段。 */
    public validateBindings(): void {
        for (const [field, value] of Object.entries({
            button: this.button,
            frame: this.frame,
            icon: this.icon,
            count: this.count,
            selectMark: this.selectMark,
            emptyFrame: this.emptyFrame,
            shardIcon: this.shardIcon,
            shardCorner: this.shardCorner,
            shardProgress: this.shardProgress,
            shardProgressFill: this.shardProgressFill,
            shardProgressLabel: this.shardProgressLabel
        })) {
            if (!value) {
                throw new Error("BagItemView.prefab [" + this.node.name + "]: 缺失绑定 " + field);
            }
        }
        if (!this.frame!.getComponent(Sprite) || !this.icon!.getComponent(Sprite)
            || !this.shardIcon!.getComponent(Sprite) || this.shardStars.length !== 5 || this.shardStars.some(star => !star)) {
            throw new Error("BagItemView.prefab [" + this.node.name + "]: frame/icon 缺少 Sprite");
        }
    }

    /**
     * 绘制当前条目并保护异步贴图；选择交给列表，完成度只由背包显式启用。
     * @param showShardProgress true使用库存持有数显示碎片完成度；奖励和候选产物保持false。
     */
    public show(item: Readonly<BagItemData | BagListItem> | null, selected: boolean, face?: BagFace,
        selectable = item !== null, showShardProgress = false): void {
        this.validateBindings();
        if (item && !face) {
            throw new Error("BagItemView: 有物品时必须提供配置展示数据 face");
        }
        const revision = ++this.revision;
        const current = () => this.isValid && this.revision === revision;
        this.button!.interactable = selectable;
        this.selectMark!.active = selected;
        const shard = item && face?.shard;
        const progress = shard && showShardProgress ? ItemDetailUtils.progress(shard, item!.quantity) : null;
        if (shard && showShardProgress && !progress) {
            throw new Error("BagItemView碎片持有数或需求无效");
        }
        this.shardCorner!.active = !!shard;
        this.shardStars.forEach((star, index) => { star.active = !!shard && index < shard.star; });
        this.shardProgress!.active = !!progress;
        this.shardProgressFill!.fillRange = progress?.ratio || 0;
        this.shardProgressLabel!.string = progress?.text || "";
        this.shardIcon!.active = !!shard;
        ResManager.setSprite(shard ? this.icon : this.shardIcon, null);
        if (!item) {
            ResManager.setSprite(this.frame, null);
            ResManager.setSprite(this.icon, null);
            this.frame!.active = true;
            this.frame!.getComponent(Sprite)!.spriteFrame = this.emptyFrame;
            this.icon!.active = false;
            this.count!.node.active = false;
            this.count!.string = "";
        } else {
            ResManager.setSprite(this.frame, [face!.frame], current);
            this.icon!.active = !shard;
            const target = shard ? this.shardIcon! : this.icon!;
            target.getComponent(Sprite)!.spriteFrame = null;
            ResManager.setSprite(target, [face!.icon, face!.fallback], current);
            const text = ("spirit" in item && item.spirit) || progress || item.quantity <= 0 ? "" : String(item.quantity);
            this.count!.string = text;
            this.count!.node.active = text.length > 0;
        }
    }

    /** 销毁时使未完成贴图失效并撤回本格赋图；列表选择监听由所属列表解除。 */
    public onDestroy(): void {
        this.revision++;
        ResManager.setSprite(this.frame, null);
        ResManager.setSprite(this.icon, null);
        ResManager.setSprite(this.shardIcon, null);
    }
}
