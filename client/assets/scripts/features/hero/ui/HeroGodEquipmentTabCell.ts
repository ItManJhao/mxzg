/** 图鉴和神装商城共用的旧样式页签。只显示名称及当前选中外观，点击由所在列表交给页面。 */
import { _decorator, Component, Label, Node } from "cc";

const { ccclass, property } = _decorator;

@ccclass("HeroGodEquipmentTabCell")
export class HeroGodEquipmentTabCell extends Component {
    /** 此格对应的星级或套装名称。 */
    @property(Label) private caption: Label | null = null;
    /** 亮色页签覆盖图，当前类别激活时显示。 */
    @property(Node) private checked: Node | null = null;

    /** 完整刷新虚拟格的文本与选中状态。 */
    public show(title: string, active: boolean): void {
        this.caption!.string = title;
        this.checked!.active = active;
    }
}
