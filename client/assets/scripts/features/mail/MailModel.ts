/** 保存当前角色信箱索引与最后打开的详情，由 MailController 更新。 */
import type { MailboxState, MailDetail, MailEntry } from "./data/MailData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "mail.updated": undefined;
    }
}

export class MailModel {
    /** 当前角色场景的唯一信箱模型。 */
    public static readonly instance = new MailModel();
    /** 最近一次读取的权威索引，换号后恢复为 null。 */
    private mailbox: MailboxState | null = null;
    /** 最近打开的现存邮件正文与附件，删除或换号时清除。 */
    private opened: MailDetail | null = null;

    /** 列表页与主城红点共用的信箱索引。 */
    public get state(): MailboxState | null {
        return this.mailbox;
    }

    /** 查询邮件标识对应的真实列表行。 */
    public entryFor(id: string): MailEntry | undefined {
        return this.mailbox?.entries.find(entry => entry.id === id);
    }

    /** 同 ID 才返回已缓存详情，避免快速切换时显示其他邮件。 */
    public detailFor(id: string): MailDetail | null {
        return this.opened?.id === id ? this.opened : null;
    }

    /** 用权威列表覆盖当前索引，已删除的详情同步释放。 */
    public update(state: MailboxState, detail?: MailDetail): void {
        this.mailbox = state;
        if (detail) {
            this.opened = detail;
        }
        if (this.opened && !this.entryFor(this.opened.id)) {
            this.opened = null;
        }
    }

    /** 角色变化时释放索引和正文。 */
    public reset(): void {
        this.mailbox = null;
        this.opened = null;
    }
}
