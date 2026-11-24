/** 阵容格位视图，显示草稿英雄、开放状态和当前阵型的格位属性。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
const { ccclass, property } = _decorator;

/** 格位的布局由预制体保存，出阵页传入本格的草稿状态。 */
@ccclass("FormationSlotView")
export class FormationSlotView extends Component {
    @property({ tooltip: "服务端站位编号 1–9，与节点在数组中的顺序无关", min: 1, max: 9, step: 1 })
    position = 1;
    @property(Button) button: Button | null = null;
    @property(Node) portrait: Node | null = null;
    @property(Node) lock: Node | null = null;
    /** 普通位显示属性加成，助阵位保留预制体文案。 */
    @property(Label) caption: Label | null = null;

    validateBindings(): void {
        const prefix = "assets/bundles/module/hero/prefabs/FormationView.prefab / " + this.node.name + " / FormationSlotView: ";
        for (const [field, value] of Object.entries({ button: this.button, portrait: this.portrait, lock: this.lock, caption: this.caption })) {
            if (!value) throw new Error(prefix + "缺失绑定 " + field);
        }
        if (!Number.isInteger(this.position) || this.position < 1 || this.position > 9) throw new Error(prefix + "position 必须为 1–9");
    }

    /** 开放格即使没有英雄也显示格位加成。bonus 为 null 时保留静态助阵文案。 */
    public show(allowed: boolean, busy: boolean, icon: string | null, bonus: string | null): void {
        this.button!.interactable = allowed && !busy;
        this.lock!.active = !allowed;
        this.portrait!.active = icon !== null;
        ResManager.setSprite(this.portrait, icon);
        if (bonus !== null) {
            this.caption!.string = bonus;
            this.caption!.node.active = allowed && bonus.length > 0;
        }
    }
}
