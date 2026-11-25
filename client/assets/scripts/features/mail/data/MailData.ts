/** 信箱协议投影，正文与附件独立于列表索引，只读本角色邮件。 */
import type { RewardNotice } from "../../reward/data/RewardNoticeData";

/** 由服务端支持的邮件动作。 */
export type MailAction = "OPEN" | "CLAIM" | "CLAIM_ALL" | "DELETE" | "DELETE_READ";

/** 时间是服务端 Unix 秒；有附件且未领取的邮件不可删除。 */
export interface MailEntry {
    readonly id: string;
    readonly title: string;
    readonly createdAt: number;
    readonly read: boolean;
    readonly claimed: boolean;
    readonly hasAttachments: boolean;
}

/** 领取资格由信箱索引提供，附件仍展示原发信数量。 */
export interface MailAttachment {
    readonly itemId: number;
    readonly quantity: number;
}

/** 打开详情时独立返回正文和冻结附件。 */
export interface MailDetail {
    readonly id: string;
    readonly content: string;
    readonly attachments: readonly MailAttachment[];
}

/** 信箱先返回轻量索引，正文不参与预读。 */
export interface MailboxState {
    readonly entries: readonly MailEntry[];
}

/** 领取后通过统一奖励回执反馈实际到账，其他动作没有奖励。 */
export interface MailboxReceipt {
    readonly requestId: string;
    readonly state: MailboxState;
    readonly detail?: MailDetail;
    readonly notice?: RewardNotice;
}
