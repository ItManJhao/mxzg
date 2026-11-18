/** 契约阵型列表格：由 SuperContent 复用，展示阵型名称、解锁条件和标记。 */
import { _decorator, Component, Label, Node, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { FormationMatrixEntry } from "../utils/FormationMatrixUtils";

const { ccclass, property } = _decorator;

@ccclass("FormationMatrixCellView")
export class FormationMatrixCellView extends Component {
    /** 根据当前阵型 ID 加载的旧版阵型图。 */
    @property(Sprite) icon: Sprite | null = null;
    /** 配置指定的阵型名称。 */
    @property(Label) nameLabel: Label | null = null;
    /** 配置指定的阵型加成类型。 */
    @property(Label) kindLabel: Label | null = null;
    /** 锁定图标和简短解锁条件的整体容器。 */
    @property(Node) lock: Node | null = null;
    /** 位于锁定图标下的简短解锁条件。 */
    @property(Label) lockLabel: Label | null = null;
    /** 父页当前草稿的阵型标记。 */
    @property(Node) current: Node | null = null;
    /** 选择窗正在查看的阵型描边。 */
    @property(Node) selected: Node | null = null;

    /** 核对静态绑定，防止虚拟列表中损坏的格子继续绘制。 */
    public validateBindings(): void {
        if (!this.icon || !this.nameLabel || !this.kindLabel || !this.lock || !this.lockLabel
            || !this.current || !this.selected) {
            throw new Error("FormationMatrixCellView.prefab 缺少阵型格绑定");
        }
    }

    /** 完整重绘当前数据。锁定项也可点击，确认资格由选择窗判断。 */
    public show(entry: FormationMatrixEntry, unlocked: boolean, current: boolean, selected: boolean): void {
        this.nameLabel!.string = entry.name;
        this.kindLabel!.string = entry.kind;
        this.lockLabel!.string = entry.shortRequirement;
        this.lock!.active = !unlocked;
        this.current!.active = current;
        this.selected!.active = selected;
        ResManager.setSprite(this.icon!.node, ResManager.ui("hero", "hero-select_spr-matrix-1-" + entry.id));
    }
}
