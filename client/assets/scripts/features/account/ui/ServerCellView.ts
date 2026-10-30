import { _decorator, Button, Component, Label, Node, UITransform } from "cc";
import type { GameServer } from "../ServerSelection";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
const { ccclass, property } = _decorator;
@ccclass("ServerCellView")
export class ServerCellView extends Component {
    @property(Button)
    button: Button | null = null;
    @property(Label)
    caption: Label | null = null;
    @property(Node)
    selected: Node | null = null;
    @property(Node)
    role: Node | null = null;
    @property(Node)
    status: Node | null = null;
    @property([Node])
    backgrounds: Node[] = [];
    private tap: (() => void) | null = null;
    show(server: GameServer, chosen: boolean, select: () => void, region = false): void {
        if (!this.button || !this.caption)
            throw new Error("ChooseServerCell 未绑定按钮或名称");
        this.button.interactable = server.enabled;
        this.caption.string = server.name;
        this.caption.fontSize = 24;
        this.caption.lineHeight = 30;
        this.caption.node.setScale(1, 1, 1);
        const width = region ? 176 : 360;
        this.node.getComponent(UITransform)?.setContentSize(width, 80);
        this.caption.node.getComponent(UITransform)?.setContentSize(width - (region ? 24 : 80), 56);
        this.caption.node.setPosition(region ? 12 : 65, 40, 0);
        for (const background of this.backgrounds) {
            background.getComponent(UITransform)?.setContentSize(width, 72);
            background.setPosition(width / 2, 40, 0);
        }
        if (this.selected) {
            this.selected.active = chosen && !region;
            this.selected.setPosition(width - 16, 72, 0);
        }
        if (this.role)
            this.role.active = false;
        if (this.status) {
            this.status.active = !region;
            if (!region)
                paintSpritePaths(this.status, ["ui/login/choose-server_spot-" + (server.enabled ? "normal" : "disabled")]);
        }
        if (this.tap)
            this.node.off(Button.EventType.CLICK, this.tap);
        this.tap = () => { if (server.enabled)
            select(); };
        this.node.on(Button.EventType.CLICK, this.tap);
    }
}
