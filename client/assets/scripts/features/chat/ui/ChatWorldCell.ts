/**
 * 聊天频道共用的复用消息行。公开、私聊的不同宽度以及系统提示底板由 Prefab 控制。
 * 页面传入安全正文和测量结果，格子仅绑定显示内容及冻结的发送者资料。
 */
import { _decorator, Component, Label, Node, RichText, SpriteAtlas, UITransform } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import type { ChatMessage } from "../data/ChatData";

/** 单个可展示行的测量结果。宽高均为当前预制体上的设计像素。 */
export interface ChatMessageLine {
    readonly message: ChatMessage;
    readonly text: string;
    readonly width: number;
    readonly height: number;
    readonly own: boolean;
    readonly notice: boolean;
}

const { ccclass, property } = _decorator;
/** 原表情图集的第一组共 24 个图标。 */
const LEGACY_EMOJI_TOKEN = /#([1-9]|1[0-9]|2[0-4])#/g;

@ccclass("ChatWorldCell")
export class ChatWorldCell extends Component {
    /** 对方的消息组，内容和头像靠左。 */
    @property(Node) private incoming: Node | null = null;
    /** 本人的消息组，内容和头像靠右。 */
    @property(Node) private outgoing: Node | null = null;
    /** 由统一角色画像入口挂载头像，顺序是对方、本人。 */
    @property([Node]) private faces: Node[] = [];
    /** 与头像同序的角色边框。 */
    @property([Node]) private borders: Node[] = [];
    /** 发送者名称，左右各一份，按当前行方向显示。 */
    @property([Label]) private headers: Label[] = [];
    /** 气泡九宫图的真实大小随这一条消息宽高变化。 */
    @property([UITransform]) private balloons: UITransform[] = [];
    /** 与左右气泡同序的安全正文。 */
    @property([RichText]) private bodies: RichText[] = [];
    /** 系统页米色公告行，聊天气泡隐藏时显示。 */
    @property(Node) private notice: Node | null = null;
    /** 公告行九宫背景，绑定正文测量后的行高。 */
    @property(UITransform) private noticeFrame: UITransform | null = null;
    /** 系统标签旁的公告正文。 */
    @property(RichText) private noticeBody: RichText | null = null;

    /** 转义玩家输入，仅将固定数字表情码变成预制图集标签。 */
    public static messageText(text: string): string {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(LEGACY_EMOJI_TOKEN, (_token: string, index: string) => `<img src="emoji${index}" width=25 height=25/>`);
    }

    /** 绑定当前消息。列表可能在节点激活前换绑，所以气泡使用已计算的宽高。 */
    public paint(line: ChatMessageLine, emojiAtlas: SpriteAtlas): void {
        const { message, own, notice } = line;
        this.incoming!.active = !notice && !own;
        this.outgoing!.active = !notice && own;
        if (this.notice) {
            this.notice.active = notice;
        }
        if (notice && this.noticeBody && this.noticeFrame) {
            this.clearPortraits(0);
            this.clearPortraits(1);
            this.noticeFrame.setContentSize(this.noticeFrame.width, line.height - 4);
            this.paintText(this.noticeBody, line, emojiAtlas);
            return;
        }
        const side = own ? 1 : 0;
        this.clearPortraits(1 - side);
        RolePortraitUtils.paint(this.faces[side], this.borders[side], message.avatarId, message.borderId);
        this.headers[side].string = this.senderLabel(message);
        this.balloons[side].setContentSize(Math.max(63, line.width + 32), line.height - 37);
        this.paintText(this.bodies[side], line, emojiAtlas);
    }

    /** 跨服与全服标题保留区服前缀，公告行使用固定的系统名称。 */
    private senderLabel(message: ChatMessage): string {
        if (!message.roleId) {
            return "系统消息";
        }
        const server = message.serverId;
        if (server && (message.channel === "cross" || message.channel === "global")) {
            const tag = /^\d+$/.test(server) ? `S${server}` : server;
            return `[${tag}] ${message.name}`;
        }
        return message.name;
    }

    /** 复用行重设断行宽度，文字靠近气泡尖端一侧排版。 */
    private paintText(body: RichText, line: ChatMessageLine, emojiAtlas: SpriteAtlas): void {
        if (body.imageAtlas !== emojiAtlas) {
            body.imageAtlas = emojiAtlas;
        }
        body.maxWidth = line.width;
        body.string = line.text;
    }

    /** 隐藏的一侧释放原头像和框，避免复用时保留其他行的图。 */
    private clearPortraits(side: number): void {
        ResManager.setSprite(this.faces[side], null);
        ResManager.setSprite(this.borders[side], null);
    }

    /** 虚拟格销毁时交还头像和边框的资源持有。 */
    protected onDestroy(): void {
        this.clearPortraits(0);
        this.clearPortraits(1);
    }
}
