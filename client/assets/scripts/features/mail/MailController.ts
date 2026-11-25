/** 邮件业务入口，沿角色认证通道读取索引、标记阅读、领取和删除。 */
import { ErrorUtils } from "../../core/ErrorUtils";
import { GameLog } from "../../core/GameLog";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import type { RewardNotice } from "../reward/data/RewardNoticeData";
import type { MailAction, MailboxReceipt, MailboxState } from "./data/MailData";
import { MailModel } from "./MailModel";

/** 回包未到时保留领取参数，重连后按原编号恢复奖励。 */
interface MailRequest {
    readonly requestId: string;
    readonly action: MailAction;
    readonly mailId?: string;
}

export class MailController extends BaseController {
    /** 当前场景共用的邮件控制器。 */
    public static readonly instance = new MailController();
    /** 由应用合成注入的当前角色通道。 */
    private operations: AccountOperations | null = null;
    /** 复用统一奖励显示与回执去重。 */
    private restoreReward: ((notice: RewardNotice) => void) | null = null;
    /** 主城就绪后再读取信箱。 */
    private ready = false;
    /** 当前信箱页面正在显示，读取错误可以直接反馈给玩家。 */
    private visible = false;
    /** 在途邮件动作的真实请求号；换号后拒绝迟到回调。 */
    private active: string | null = null;
    /** 断线后尚需确认的领奖，恢复或换号即清空。 */
    private interruptedClaim: MailRequest | null = null;
    /** 当前在途的信箱查询；同一时间只有一份。 */
    private querying: object | null = null;
    /** 新来信、重连和开窗合并为下一次索引读取。 */
    private refreshPending = false;

    /** 注入已认证请求入口及共享奖励恢复。 */
    public configure(operations: AccountOperations, restoreReward: (notice: RewardNotice) => void): void {
        this.operations = operations;
        this.restoreReward = restoreReward;
    }

    /** 告知窗口本角色当前是否有邮件动作等待回包。 */
    public get busy(): boolean {
        return this.active !== null;
    }

    /** 入场静默预读列表供红点使用，退出主城后暂停刷新。 */
    public setHomeReady(ready: boolean): void {
        this.ready = ready;
        if (ready) {
            this.refreshVisible();
        }
    }

    /** 打开信箱时重新同步，关闭不取消已经提交的真实操作。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 主城、到账通知与重连共用信箱索引刷新。 */
    public refreshVisible(): void {
        this.refreshPending = true;
        if (this.interruptedClaim && this.ready && !this.active) {
            void this.submit(this.interruptedClaim.action, this.interruptedClaim.mailId);
        } else {
            this.refreshIfNeeded();
        }
    }

    /** 阅读指定邮件并返回实际正文。 */
    public open(id: string): Promise<boolean> {
        return this.submit("OPEN", id);
    }

    /** 领取指定邮件中的全部附件。 */
    public claim(id: string): Promise<boolean> {
        return this.submit("CLAIM", id);
    }

    /** 删除已读且附件领取完的邮件。 */
    public delete(id: string): Promise<boolean> {
        return this.submit("DELETE", id);
    }

    /** 领取全部可领附件，并显示一份服务端合并的实际奖励。 */
    public claimAll(): Promise<boolean> {
        return this.submit("CLAIM_ALL");
    }

    /** 删除本角色所有具备删除资格的邮件。 */
    public deleteRead(): Promise<boolean> {
        return this.submit("DELETE_READ");
    }

    /** 只使用当前认证通道已校验的回包更新唯一信箱模型。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.MAIL_LIST:
                MailModel.instance.update(payload as MailboxState);
                this.emit("mail.updated", undefined);
                break;
            case Protocol.MAIL_CHANGE: {
                const receipt = payload as MailboxReceipt;
                MailModel.instance.update(receipt.state, receipt.detail);
                this.emit("mail.updated", undefined);
                if (receipt.notice) {
                    this.restoreReward?.(receipt.notice);
                }
                break;
            }
            case Protocol.MAIL_CHANGED:
                this.refreshVisible();
                break;
        }
    }

    /** 在模块生命周期注册信箱索引、动作回包与新邮件通知。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.MAIL_LIST, Protocol.MAIL_CHANGE, Protocol.MAIL_CHANGED]));
    }

    /** 角色变化时废弃所有尚可能返回的旧邮件请求。 */
    protected onResetSession(): void {
        this.visible = false;
        this.querying = null;
        this.refreshPending = false;
        this.active = null;
        this.interruptedClaim = null;
        MailModel.instance.reset();
        this.emit("mail.updated", undefined);
    }

    /** 场景回收时解除连接和统一奖励引用。 */
    protected onDispose(): void {
        this.ready = false;
        this.operations = null;
        this.restoreReward = null;
    }

    /** 在途写操作完成前不启动新列表，避免较早的快照覆盖已读和领奖状态。 */
    private refreshIfNeeded(): void {
        if (!this.operations || !this.ready || this.active || this.querying || !this.refreshPending) {
            return;
        }
        this.refreshPending = false;
        const operation = this.querying = {};
        const finish = (): void => {
            if (this.querying === operation) {
                this.querying = null;
                this.refreshIfNeeded();
            }
        };
        void this.operations.deliver(Protocol.MAIL_LIST, {}, frame => {
            if (this.querying === operation && !this.active) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => {
            if (this.querying === operation) {
                if (this.visible) {
                    UIManager.instance.toast(ErrorUtils.messageOf(error));
                } else {
                    GameLog.shared.classified("MODULE", "warn", "MailController", ErrorUtils.messageOf(error));
                }
            }
        }).then(finish, finish);
    }

    /** 提交一次真实邮件动作，只有请求身份和正文身份都符合才更新信箱。 */
    private async submit(action: MailAction, mailId?: string): Promise<boolean> {
        if (!this.operations || !this.ready || this.active) {
            return false;
        }
        const previous = this.interruptedClaim;
        if (previous && (previous.action !== action || previous.mailId !== mailId)) {
            void this.submit(previous.action, previous.mailId);
            return false;
        }
        const requestId = previous?.requestId ?? RequestIdUtils.create();
        const request: MailRequest = previous ?? (mailId ? { requestId, action, mailId } : { requestId, action });
        if (this.querying) {
            // 这次查询可能早于已读或领取，迟到时不能覆盖动作回包。
            this.querying = null;
            this.refreshPending = true;
        }
        this.active = requestId;
        let accepted = false;
        this.emit("mail.updated", undefined);
        try {
            await this.operations.deliver(Protocol.MAIL_CHANGE, request, frame => {
                if (this.active !== requestId) {
                    return;
                }
                const receipt = frame.body as MailboxReceipt;
                if (receipt.requestId !== requestId
                    || (action === "OPEN" && (!receipt.detail || receipt.detail.id !== mailId))
                    || (action !== "OPEN" && receipt.detail)
                    || (receipt.notice && action !== "CLAIM" && action !== "CLAIM_ALL")) {
                    throw new Error("邮件回包与本次操作不符");
                }
                this.interruptedClaim = null;
                ProtocolRouter.instance.dispatch(this, frame);
                accepted = true;
            }, error => {
                if (this.active === requestId) {
                    const claim = action === "CLAIM" || action === "CLAIM_ALL";
                    this.interruptedClaim = claim && error instanceof SocketFailure && error.interrupted ? request : null;
                    this.refreshPending = true;
                    if (this.visible && !previous) {
                        UIManager.instance.toast(ErrorUtils.messageOf(error));
                    }
                }
            });
        } finally {
            if (this.active === requestId) {
                this.active = null;
                this.emit("mail.updated", undefined);
                this.refreshIfNeeded();
            }
        }
        return accepted;
    }
}
