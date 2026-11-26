/** 神装选择窗的横向套装页签。由列表填充标题和当前选中态，点击由 SuperContent 负责。 */
import { _decorator, Component, Label, Node } from "cc";

const { ccclass, property } = _decorator;

@ccclass("SmithCategoryCell")
export class SmithCategoryCell extends Component {
    /** 对应原套装的名称或“全部”。 */
    @property(Label) private label: Label | null = null;
    /** 当前筛选条件的浅色选择图。 */
    @property(Node) private selection: Node | null = null;

    /** 设置复用页签的名称和状态。 */
    public show(title: string, selected: boolean): void {
        if (!this.label || !this.selection) {
            throw new Error("神装选择页签绑定不完整");
        }
        this.label.string = title;
        this.selection.active = selected;
    }
}
