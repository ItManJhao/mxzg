/** 邮件相对时间和信封状态图，供列表与详情使用同一规则。 */
import { ServerClock } from "../../../core/ServerClock";
import type { MailEntry } from "../data/MailData";

export class MailDisplayUtils {
    /** 保持邮件展示格式无状态。 */
    private constructor() {
    }

    /** 顺序对应预制体中的未读、已读、未读带附件、已读带附件图。 */
    public static frameIndex(entry: MailEntry): number {
        return (entry.hasAttachments && !entry.claimed ? 2 : 0) + (entry.read ? 1 : 0);
    }

    /** 按服务端相对时间显示来信时间；同步前不猜测客户端时间。 */
    public static age(createdAt: number): string {
        const now = ServerClock.instance.nowSeconds();
        if (now === null) {
            return "";
        }
        const seconds = Math.max(0, now - createdAt);
        if (seconds >= 86400) {
            return Math.floor(seconds / 86400) + "天前";
        }
        if (seconds >= 3600) {
            return Math.floor(seconds / 3600) + "小时前";
        }
        if (seconds >= 60) {
            return Math.floor(seconds / 60) + "分钟前";
        }
        return seconds + "秒前";
    }
}
