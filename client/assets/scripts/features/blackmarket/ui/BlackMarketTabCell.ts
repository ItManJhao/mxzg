/**
 * 黑市货架页签。固定底图和文字由预制体提供，横向列表只传当前展示状态。
 * 点击由所属的 SuperContent 统一派发，页签本身不查询货架。
 */
import { _decorator, Color, Component, Label, Node } from "cc";

const { ccclass, property } = _decorator;
/** 选中标签和深蓝未选标签的原显示色。 */
const SELECTED_TEXT = new Color(255, 255, 255);
const NORMAL_TEXT = new Color(37, 54, 84);

@ccclass("BlackMarketTabCell")
export class BlackMarketTabCell extends Component {
    /** 策划配置中的货架名称。 */
    @property(Label) private _caption: Label | null = null;
    /** 盖在普通底图上的当前页签高亮。 */
    @property(Node) private _selected: Node | null = null;

    /** 将复用格绑定到当前货架名称及选中状态。 */
    public render(name: string, selected: boolean): void {
        if (!this._caption || !this._selected) {
            throw new Error("BlackMarketTabCell.prefab 缺少页签显示绑定");
        }
        this._caption.string = name;
        this._caption.color = selected ? SELECTED_TEXT : NORMAL_TEXT;
        this._selected.active = selected;
    }
}
