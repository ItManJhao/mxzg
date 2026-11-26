/**
 * 好友聊天侧栏的复用格。根据当前列表项绘制头像、等级与未读，或显示新增会话入口。
 * 关闭动作交由聊天窗口处理，格子不更改会话记录。
 */
import { _decorator, Button, Color, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";

/** 侧栏已打开会话所需的公开资料。 */
export interface ChatFriendItem {
    readonly roleId: string;
    readonly name: string;
    readonly level: number;
    readonly avatarId: number;
    readonly borderId: number;
    readonly unreadCount: number;
}

const { ccclass, property } = _decorator;
const selectedInk = new Color(117, 71, 43);
const idleInk = new Color(255, 239, 197);

@ccclass("ChatFriendCell")
export class ChatFriendCell extends Component {
    /** 将正在显示的角色标识交给列表关闭会话。 */
    public static readonly DISMISS = "chat-friend-dismiss";

    /** 原侧栏格的底图组件，选择会话后更换皮肤。 */
    @property(Sprite) private frame: Sprite | null = null;
    /** 当前选中会话及无会话时的高亮底图。 */
    @property(SpriteFrame) private selectedFrame: SpriteFrame | null = null;
    /** 其他会话及普通新增项的底图。 */
    @property(SpriteFrame) private idleFrame: SpriteFrame | null = null;
    /** 保存头像、名字和等级的整体容器。 */
    @property(Node) private detail: Node | null = null;
    /** 由角色画像工具加载头像的锚点。 */
    @property(Node) private portrait: Node | null = null;
    /** 由角色画像工具加载对应边框的锚点。 */
    @property(Node) private border: Node | null = null;
    /** 当前会话对象名字，选中时使用深色字。 */
    @property(Label) private playerName: Label | null = null;
    /** 当前会话对象的角色等级。 */
    @property(Label) private level: Label | null = null;
    /** 该会话还有未读消息时显示。 */
    @property(Node) private unread: Node | null = null;
    /** 好友列表的加号图片，只有新增项可见。 */
    @property(Node) private add: Node | null = null;
    /** 选中会话时显示的移出侧栏按钮。 */
    @property(Button) private closeButton: Button | null = null;

    /** 当前复用格的角色标识，加号项为 null。 */
    private roleId: string | null = null;

    /** 绑定一次关闭按钮，复用时只更新角色标识。 */
    protected onLoad(): void {
        this.closeButton!.node.on(Button.EventType.CLICK, this.dismiss, this);
    }

    /** 应用本轮会话资料，空条目由相同的点击区域显示加号。 */
    public paint(peer: ChatFriendItem | null, selected: boolean): void {
        this.roleId = peer?.roleId ?? null;
        this.frame!.spriteFrame = selected ? this.selectedFrame : this.idleFrame;
        this.detail!.active = peer !== null;
        this.add!.active = peer === null;
        this.unread!.active = (peer?.unreadCount ?? 0) > 0;
        this.closeButton!.node.active = peer !== null && selected;
        if (peer) {
            this.playerName!.string = peer.name;
            this.playerName!.color = selected ? selectedInk : idleInk;
            this.level!.string = String(peer.level);
            RolePortraitUtils.paint(this.portrait, this.border, peer.avatarId, peer.borderId);
        } else {
            ResManager.setSprite(this.portrait, null);
            ResManager.setSprite(this.border, null);
        }
    }

    /** 转交选中会话的关闭意图，复用格离屏时不处理点击。 */
    private dismiss(): void {
        if (this.roleId && this.node.activeInHierarchy) {
            this.node.parent?.emit(ChatFriendCell.DISMISS, this.roleId);
        }
    }

    /** 回收侧栏节点时释放头像持有；按钮组件可能已先随子节点销毁。 */
    protected onDestroy(): void {
        this.closeButton?.node?.off(Button.EventType.CLICK, this.dismiss, this);
        ResManager.setSprite(this.portrait, null);
        ResManager.setSprite(this.border, null);
    }
}
