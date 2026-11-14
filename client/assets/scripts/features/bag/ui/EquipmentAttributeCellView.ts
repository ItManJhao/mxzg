/**
 * 普通装备详情中的静态属性槽：显示原属性图标、名称、数值及可选套装件数条件。
 * 槽位和尺寸由完整Prefab保存，EquipmentInfoView只传入配置投影，不动态排列节点或保存资产。
 * 重新绘制或关闭时撤回本槽赋图，防止上一件装备的异步图片迟到覆盖。
 */
import { _decorator, Component, Label, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { EquipmentDetailAttribute } from "../utils/EquipmentDetailUtils";

const { ccclass, property } = _decorator;

@ccclass("EquipmentAttributeCellView")
export class EquipmentAttributeCellView extends Component {
    /** 槽位自己的原属性图标，跟随当前配置按需取图。 */
    @property(Sprite) icon: Sprite | null = null;
    /** 本地化属性名称；颜色和文本区域保存在Prefab。 */
    @property(Label) nameLabel: Label | null = null;
    /** 已按旧属性格式处理的数值，不在视图内重算加成。 */
    @property(Label) valueLabel: Label | null = null;
    /** 套装件数条件；基础属性槽隐藏此节点。 */
    @property(Label) conditionLabel: Label | null = null;
    /** 每次重画或清空递增，用于拒绝旧配置的迟到赋图。 */
    private paintVersion = 0;

    /** 核对完整Prefab的静态槽绑定，缺少节点时由开窗边界报告资源问题。 */
    public validateBindings(): void {
        for (const [field, value] of Object.entries({
            icon: this.icon,
            nameLabel: this.nameLabel,
            valueLabel: this.valueLabel,
            conditionLabel: this.conditionLabel,
        })) {
            if (!value) {
                throw new Error("EquipmentAttributeCellView缺少绑定：" + field);
            }
        }
    }

    /** 显示一条只读属性，套装条件为空时隐藏条件文字，不改变其他槽的位置。 */
    public show(attribute: EquipmentDetailAttribute, condition = ""): void {
        this.validateBindings();
        this.node.active = true;
        this.nameLabel!.string = attribute.name + "：";
        this.valueLabel!.string = attribute.value;
        this.conditionLabel!.string = condition;
        this.conditionLabel!.node.active = condition.length > 0;
        const version = ++this.paintVersion;
        ResManager.setSprite(this.icon!.node, attribute.icon,
            () => this.node.isValid && version === this.paintVersion);
    }

    /** 结束当前属性显示并撤回赋图；由所属窗口关闭或下一次绘制复用时调用。 */
    public clear(): void {
        this.paintVersion++;
        ResManager.setSprite(this.icon?.node || null, null);
        if (this.nameLabel?.isValid) {
            this.nameLabel.string = "";
        }
        if (this.valueLabel?.isValid) {
            this.valueLabel.string = "";
        }
        if (this.conditionLabel?.isValid) {
            this.conditionLabel.string = "";
        }
    }

    /** 静态节点被引擎直接销毁时同样撤回本槽图片，不影响其他窗口。 */
    public onDestroy(): void {
        this.clear();
    }
}
