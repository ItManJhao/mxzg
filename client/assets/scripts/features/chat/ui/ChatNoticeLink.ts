/** 将 RichText 中的受信公告跳转交给聊天窗口。玩家正文不会生成可点击标签。 */
import { _decorator, Component, EventTouch } from "cc";

const { ccclass } = _decorator;

@ccclass("ChatNoticeLink")
export class ChatNoticeLink extends Component {
    /** 消息列表订阅的公告跳转事件，携带原配置公告编号。 */
    public static readonly OPEN = "chat-notice-open";

    /** RichText 命中某个公告链接时沿消息行向所属列表转交配置编号。 */
    public openNotice(_event: EventTouch, noticeId: string): void {
        const list = this.node.parent?.parent?.parent;
        list?.emit(ChatNoticeLink.OPEN, Number(noticeId));
    }
}
