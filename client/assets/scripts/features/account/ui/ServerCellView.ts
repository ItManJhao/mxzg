/** 选服列表单元格：由 SuperContent 复用，只显示区服数据和转交点击，不管理列表位置。 */
import { _decorator, Button, Component, Label, Node, UITransform } from "cc";
import type { GameServer } from "../ServerSelection";
import { ResManager } from "../../../framework/assets/ResManager";
const { ccclass, property } = _decorator;
@ccclass("ServerCellView")
export class ServerCellView extends Component {
    /** 格子选择按钮，关闭区服不可点击。 */
    @property(Button)
    button: Button | null = null;
    /** 区服或区域名称。 */
    @property(Label)
    caption: Label | null = null;
    /** 当前选择的标记。 */
    @property(Node)
    selected: Node | null = null;
    /** 旧角色标记，未接入时隐藏。 */
    @property(Node)
    role: Node | null = null;
    /** 服务器开放状态图片。 */
    @property(Node)
    status: Node | null = null;
    /** 格子内部背景，按两列宽度适配。 */
    @property([Node])
    backgrounds: Node[] = [];
    /** 当前格子的选择回调，复用前解绑，销毁时释放。 */
    private tap: (() => void) | null = null;
    /** 刷新区服文字、标记和点击回调；根尺寸由 SuperContent 设置。 */
    show(server: GameServer, chosen: boolean, select: () => void, region = false): void {
        if (!this.button || !this.caption)
            throw new Error("ChooseServerCell 未绑定按钮或名称");
        this.button.interactable = server.enabled;
        this.caption.string = server.name;
        this.caption.fontSize = 24;
        this.caption.lineHeight = 30;
        this.caption.node.setScale(1, 1, 1);
        const width = region ? 176 : 360;

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
                ResManager.setSprite(this.status, ["ui/login/choose-server_spot-" + (server.enabled ? "normal" : "disabled")]);
        }
        if (this.tap)
            this.node.off(Button.EventType.CLICK, this.tap);
        this.tap = () => {
            if (server.enabled)
                select();
        };
        this.node.on(Button.EventType.CLICK, this.tap);
    }
    /** 销毁格子时解除本实例的按钮监听。 */
    onDestroy(): void {
        if (this.tap) this.node.off(Button.EventType.CLICK, this.tap);
        this.tap = null;
    }
}
