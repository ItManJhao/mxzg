/**
 * 通用发奖反馈状态：保存当前会话的展示队列、编号去重和已同步资产版本。
 * 由RewardController提交，通知与历史恢复共用同一入口；不联网、不修改角色或背包资产。
 */
import { BaseModel } from "../../framework/BaseModel";
import type { RewardNotice, RewardPhase, RewardProgress } from "./data/RewardNoticeData";

export class RewardModel extends BaseModel {
    /** 已接纳回执编号到完整指纹；换号清空，防止同一成功结果重复播放或被冲突内容覆盖。 */
    private readonly accepted = new Map<string, string>();
    /** 按到达顺序等待展示的不可变通知；队首完成之前不丢弃任何后续批次。 */
    private readonly queue: RewardNotice[] = [];
    /** 应用已接纳的最高资产版本，重置为0后等待下一份统一快照。 */
    private observedRevision = 0;
    /** 主城宿主可用时为true，关闭入口或重置后为false。 */
    private ready = false;
    /** 正在展示的队首编号；窗口真正关闭后清空。 */
    private activeReceiptId: string | null = null;
    /** 队首失败说明；非空时阻止自动重试，不影响已经提交的资产。 */
    private failureMessage = "";

    /** 返回冻结的展示快照；通知内容在控制器接纳前已经完整校验与冻结。 */
    public get snapshot(): RewardProgress {
        return Object.freeze({
            phase: this.phase,
            ready: this.ready,
            assetRevision: this.observedRevision,
            pending: Object.freeze(this.queue.slice()),
            activeReceiptId: this.activeReceiptId,
            message: this.failureMessage,
            acceptedCount: this.accepted.size,
        });
    }

    /** 接纳已验证的通知；同编号同内容返回false，冲突内容拒绝且不覆盖已有队列。 */
    public accept(notice: RewardNotice): boolean {
        const fingerprint = this.fingerprint(notice);
        const previous = this.accepted.get(notice.receiptId);
        if (previous !== undefined) {
            if (previous !== fingerprint) {
                throw new Error("发奖反馈回执编号对应的内容不一致：" + notice.receiptId);
            }
            return false;
        }
        this.accepted.set(notice.receiptId, fingerprint);
        if (notice.mode !== "SILENT") {
            this.queue.push(notice);
        }
        this.incrementVersion();
        return true;
    }

    /** 记录应用已提交的统一快照版本；旧版本不降低展示门槛。 */
    public observeRevision(revision: number): boolean {
        if (!Number.isSafeInteger(revision) || revision < 0) {
            throw new Error("发奖反馈的已同步资产版本无效");
        }
        if (revision <= this.observedRevision) {
            return false;
        }
        this.observedRevision = revision;
        this.incrementVersion();
        return true;
    }

    /** 设置展示宿主可用状态，不中途完成当前窗口或清掉排队结果。 */
    public setReady(ready: boolean): boolean {
        if (this.ready === ready) {
            return false;
        }
        this.ready = ready;
        this.incrementVersion();
        return true;
    }

    /** 仅在宿主、资产快照及失败状态均允许时占用队首，保证一笔反馈等待关闭后才开始下一笔。 */
    public beginDisplay(): RewardNotice | null {
        if (this.phase !== "queued") {
            return null;
        }
        const notice = this.queue[0];
        this.activeReceiptId = notice.receiptId;
        this.incrementVersion();
        return notice;
    }

    /** 当前批次展示完成才移除队首；重复完成或其他编号不能消费排队结果。 */
    public completeDisplay(receiptId: string): void {
        this.requireActive(receiptId);
        this.queue.shift();
        this.activeReceiptId = null;
        this.failureMessage = "";
        this.incrementVersion();
    }

    /** 保留失败队首并解除展示占用；后续状态同步或新通知不会自动再次打开失败窗口。 */
    public failDisplay(receiptId: string, message: string): void {
        this.requireActive(receiptId);
        this.activeReceiptId = null;
        this.failureMessage = message || "奖励反馈展示失败";
        this.incrementVersion();
    }

    /** 显式解除失败暂停，仍复用原队首与原编号，不重新发奖。 */
    public retry(): boolean {
        if (!this.failureMessage) {
            return false;
        }
        this.failureMessage = "";
        this.incrementVersion();
        return true;
    }

    /** 换号或应用销毁清空所有展示状态；不承担角色归属或通信连接校验。 */
    protected onReset(): void {
        this.accepted.clear();
        this.queue.length = 0;
        this.observedRevision = 0;
        this.ready = false;
        this.activeReceiptId = null;
        this.failureMessage = "";
    }

    /** 根据队首、宿主和快照计算阶段，不保存另一套可能失真的状态字段。 */
    private get phase(): RewardPhase {
        if (!this.queue.length) {
            return "idle";
        }
        if (this.failureMessage) {
            return "failed";
        }
        if (this.activeReceiptId) {
            return "showing";
        }
        if (!this.ready) {
            return "waiting-ready";
        }
        if (this.queue[0].assetRevision > this.observedRevision) {
            return "waiting-state";
        }
        return "queued";
    }

    /** 在消费或暂停前核对当前批次，避免错误完成调用移除另一笔奖励。 */
    private requireActive(receiptId: string): void {
        if (this.activeReceiptId !== receiptId || this.queue[0]?.receiptId !== receiptId) {
            throw new Error("发奖反馈完成的批次与当前队首不一致");
        }
    }

    /** 以稳定字段和物品ID排序比较同笔结果，物品排列变化不导致重复展示或误报冲突。 */
    private fingerprint(notice: RewardNotice): string {
        return JSON.stringify([
            notice.schemaVersion,
            notice.receiptId,
            notice.roleId,
            notice.assetRevision,
            notice.mode,
            notice.items.map(item => [item.itemId, item.credited]).sort((left, right) => left[0] - right[0]),
        ]);
    }
}
