import { _decorator, Button, Component, Label, Node } from "cc";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
const { ccclass, property } = _decorator;

/** One authored slot: only data, lock visibility and interaction change at runtime. */
@ccclass("FormationSlotView")
export class FormationSlotView extends Component {
    @property({ tooltip: "服务端站位编号 1–9，与节点在数组中的顺序无关", min: 1, max: 9, step: 1 })
    position = 1;
    @property(Button) button: Button | null = null;
    @property(Node) portrait: Node | null = null;
    @property(Node) lock: Node | null = null;
    @property(Label) caption: Label | null = null;

    validateBindings(): void {
        const prefix = "assets/prefabs/ui/hero/HeroSelectLayer.prefab / " + this.node.name + " / FormationSlotView: ";
        for (const [field, value] of Object.entries({ button: this.button, portrait: this.portrait, lock: this.lock, caption: this.caption })) {
            if (!value) throw new Error(prefix + "缺失绑定 " + field);
        }
        if (!Number.isInteger(this.position) || this.position < 1 || this.position > 9) throw new Error(prefix + "position 必须为 1–9");
    }

    show(allowed: boolean, busy: boolean, name: string | null, icon: string | null): void {
        this.button!.interactable = allowed && !busy;
        this.lock!.active = !allowed;
        this.portrait!.active = name !== null;
        if (name && icon) paintSpritePaths(this.portrait, [icon]);
        this.caption!.string = allowed ? name || "空位" : "未开放";
    }
}
