/** VIP 权益窗滚动格子，按策划顺序显示当前档位的一项权益。 */
import { _decorator, Component, Label } from "cc";

const { ccclass, property } = _decorator;

@ccclass("VipBenefitCell")
export class VipBenefitCell extends Component {
    /** 由预制体绑定的权益内容。 */
    @property(Label) private text: Label | null = null;

    /** 更新这一行的配置权益描述。 */
    public render(value: string): void {
        this.text!.string = value;
    }
}
