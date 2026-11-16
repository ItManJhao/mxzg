/**
 * 通用发奖反馈控制器：接纳真实通知或已确认历史回执，等待统一快照后按顺序展示。
 * 应用注入奖励窗及全局飘字能力；窗口关闭才消费当前批次，模块不发奖、不查询或修改资产。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { GameProtocolCodecUtils } from "../../platform/GameProtocolCodecUtils";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { RewardArgs } from "./data/RewardData";
import type { RewardNotice, RewardNoticeMode, RewardProgress } from "./data/RewardNoticeData";
import { RewardModel } from "./RewardModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 通用奖励队列已提交后的只读展示进度，不代表资产变化。 */
        "reward.updated": RewardProgress;
    }
}

export class RewardController extends BaseController {
    /** 应用提供的通用窗口入口，Promise必须等待窗口关闭；销毁后解除引用。 */
    private showPopup: ((args: RewardArgs) => Promise<void>) | null = null;
    /** 应用提供的全局飘字入口，只提交实际到账提示，不在页面另建反馈层。 */
    private showTips: ((notice: RewardNotice) => void) | null = null;
    /** 当前本地展示任务的不透明标记；重置解除引用后，旧窗口完成不能消费新队列。 */
    private displayTask: object | null = null;

    /** @param model 当前应用持有的唯一反馈队列，默认独立创建，不持有角色资产。 */
    public constructor(private readonly model: RewardModel = new RewardModel()) {
        super();
    }

    /** 注入通用展示能力；仅重新装配不会自动重试先前失败的批次。 */
    public configure(
        showPopup: (args: RewardArgs) => Promise<void>,
        showTips: (notice: RewardNotice) => void,
    ): void {
        this.showPopup = showPopup;
        this.showTips = showTips;
        this.pump();
    }

    /** 只登记真实通用发奖事件，初始化不会查询库存或补造通知。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.REWARD_GRANTED]));
        this.pump();
    }

    /** 按真实消息标识分流；未登记消息不更新反馈队列。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.REWARD_GRANTED:
                this.onRewardGranted(value);
                break;
            default:
                GameLog.shared.warnOnce("MODULE", "RewardController", "UNHANDLED_PROTOCOL:" + protocol,
                    "奖励反馈未登记协议：" + protocol + "；已忽略，未更新数据");
                break;
        }
    }

    /**
     * 应用已验证历史业务回执与原意图匹配后恢复反馈，与实时通知共用格式校验和编号去重。
     * @returns true表示本次首次接纳；false表示同内容通知已接纳，不会重复展示。
     */
    public restore(value: unknown): boolean {
        if (!this.isInitialized) {
            throw new Error("奖励反馈控制器尚未初始化");
        }
        const notice = this.readNotice(value);
        const accepted = this.model.accept(notice);
        if (accepted) {
            this.notify();
        }
        this.pump();
        return accepted;
    }

    /** 应用提交完整快照后交付版本；通知先到时等待此版本，不用通知摘要修改资产。 */
    public observeRevision(revision: number): void {
        if (this.model.observeRevision(revision)) {
            this.notify();
        }
        this.pump();
    }

    /** 主城宿主出现后设为true；暂时不可用时保留全部批次，等下次可用再继续。 */
    public setReady(ready: boolean): void {
        if (this.model.setReady(ready)) {
            this.notify();
        }
        this.pump();
    }

    /** 显式重试失败反馈；只展示原结果，不联网、不重新创建发奖请求。 */
    public retry(): void {
        if (this.model.retry()) {
            this.notify();
            this.pump();
        }
    }

    /** 应用换号统一清理展示、去重及就绪状态；旧窗口完成随后会被本地任务标记丢弃。 */
    protected onResetSession(): void {
        this.displayTask = null;
        if (this.isInitialized) {
            this.model.reset();
        } else {
            this.model.dispose();
        }
        this.notify();
    }

    /** 应用销毁解除所有展示能力，迟到完成不再唤起后续窗口。 */
    protected onDispose(): void {
        this.showPopup = null;
        this.showTips = null;
    }

    /** 真实服务端事件与历史恢复共用同一接纳入口，不伪造其他模块协议。 */
    private onRewardGranted(value: unknown): void {
        this.restore(value);
    }

    /** 复用协议唯一校验口，再冻结最小展示字段，避免外部后续修改已去重的内容。 */
    private readNotice(value: unknown): RewardNotice {
        const notice = GameProtocolCodecUtils.validateRewardNotice(value);
        const items = notice.items as readonly { itemId: number; credited: number }[];
        return Object.freeze({
            schemaVersion: 1,
            receiptId: notice.receiptId as string,
            roleId: notice.roleId as string,
            assetRevision: notice.assetRevision as number,
            mode: notice.mode as RewardNoticeMode,
            items: Object.freeze(items.map(item => Object.freeze({
                itemId: item.itemId,
                credited: item.credited,
            }))),
        });
    }

    /** 有且只有一笔在途反馈；失败暂停保留队首，后续通知和快照不会造成自动循环。 */
    private pump(): void {
        if (!this.isInitialized || this.displayTask) {
            return;
        }
        const notice = this.model.beginDisplay();
        if (!notice) {
            return;
        }
        const task = {};
        this.displayTask = task;
        this.notify();
        void this.display(notice, task);
    }

    /** 等待真实展示完成后推进下一笔；重置后的成功或失败均不能接触新队列。 */
    private async display(notice: RewardNotice, task: object): Promise<void> {
        try {
            if (notice.mode === "POPUP") {
                if (!this.showPopup) {
                    throw new Error("通用奖励窗口尚未装配");
                }
                await this.showPopup(Object.freeze({ receiptId: notice.receiptId, items: notice.items }));
            } else {
                if (!this.showTips) {
                    throw new Error("通用奖励飘字尚未装配");
                }
                await this.showTips(notice);
            }
            if (this.displayTask !== task || !this.isInitialized) {
                return;
            }
            this.model.completeDisplay(notice.receiptId);
            this.displayTask = null;
            this.notify();
            this.pump();
        } catch (error) {
            if (this.displayTask !== task || !this.isInitialized) {
                return;
            }
            const reason = error instanceof Error ? error.message : String(error);
            this.model.failDisplay(notice.receiptId, reason);
            this.displayTask = null;
            this.notify();
            const detail = error instanceof Error ? error.stack || error.message : String(error);
            GameLog.shared.classified("MODULE", "warn", "RewardController",
                "奖励反馈展示失败，已保留原批次等待显式重试：" + notice.receiptId + "\n" + detail);
        }
    }

    /** Model提交后通知展示进度；监听者不根据此事件写角色或库存。 */
    private notify(): void {
        this.emit("reward.updated", this.model.snapshot);
    }
}
