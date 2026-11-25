/** 原版邮件列表的一行，绘制信封、标题、阅读状态和相对时间。 */
import { _decorator, Color, Component, Label, Sprite, SpriteFrame } from "cc";
import type { MailEntry } from "../data/MailData";
import { MailDisplayUtils } from "./MailDisplayUtils";

const { ccclass, property } = _decorator;

@ccclass("MailCell")
export class MailCell extends Component {
    /** 静态序列化的四张原信封图。 */
    @property([SpriteFrame]) private envelopes: SpriteFrame[] = [];
    /** 根据读和领取状态切换信封图案。 */
    @property(Sprite) private envelope: Sprite | null = null;
    /** 邮件标题，长标题在行的宽度内缩放。 */
    @property(Label) private subject: Label | null = null;
    /** 原版右下角的相对送达时间。 */
    @property(Label) private age: Label | null = null;
    /** 阅读状态文字颜色由实际已读状态决定。 */
    @property(Label) private readStatus: Label | null = null;

    /** 将服务器索引绘制到复用行，不读取正文或变更已读状态。 */
    public paint(entry: MailEntry): void {
        this.envelope!.spriteFrame = this.envelopes[MailDisplayUtils.frameIndex(entry)];
        this.subject!.string = entry.title;
        this.age!.string = MailDisplayUtils.age(entry.createdAt);
        this.readStatus!.string = entry.read ? "已读" : "未读";
        this.readStatus!.color = entry.read ? new Color(26, 94, 16) : new Color(158, 28, 14);
    }
}
