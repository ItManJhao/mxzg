/**
 * 每日任务、活跃奖励和成就的协议入口。服务器持有进度和领取状态，
 * 本模块合并任务刷新、接收成就完成事件，并由应用统一管理换号和重连。
 */
import { ErrorUtils } from "../../core/ErrorUtils";
import { GameLog } from "../../core/GameLog";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { ServerClock } from "../../core/ServerClock";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import type { RewardNotice } from "../reward/data/RewardNoticeData";
import { QuestModel } from "./QuestModel";
import type { QuestCompletion, QuestSnapshot, QuestTab } from "./data/QuestState";

/** 领取回执与独立的权威快照，奖励通知依通用回执编号去重。 */
interface QuestClaimReceipt {
    readonly requestId: string;
    readonly snapshot: QuestSnapshot;
    readonly notice?: RewardNotice;
}

export class QuestController extends BaseController {
    /** 当前任务模块实例，由应用注入公共通信和奖励展示。 */
    public static readonly instance = new QuestController();
    /** 已认证请求入口，应用结束后清空。 */
    private operations: AccountOperations | null = null;
    /** 消费服务端原始奖励通知，复用通用奖励队列。 */
    private restoreReward: ((notice: RewardNotice) => void) | null = null;
    /** 主城显示后允许主动查询和安排跨天刷新。 */
    private ready = false;
    /** 任务窗口打开时，读取失败以玩家提示方式反馈。 */
    private visible = false;
    /** 查询需要再读一遍时置位，合并同次玩法动作产生的多条失效通知。 */
    private dirty = false;
    /** 当前在途查询，由发起回调持有同一引用，换号时清除。 */
    private loading: object | null = null;
    /** 当前在途领取的业务编号，成功、失败或换号后清除。 */
    private pendingClaim: string | null = null;
    /** 当日任务刷新定时器，任务状态变化或离开角色后撤销。 */
    private resetTimer: ReturnType<typeof setTimeout> | null = null;

    /** 注入同一账号连接与通用奖励入口。 */
    public configure(operations: AccountOperations, restoreReward: (notice: RewardNotice) => void): void {
        this.operations = operations;
        this.restoreReward = restoreReward;
    }

    /** 当前存在领取请求，供窗口禁用重复点击。 */
    public get busy(): boolean {
        return this.pendingClaim !== null;
    }

    /** 主城准备好后获取红点所需状态；退出时结束当日定时器。 */
    public setHomeReady(ready: boolean): void {
        this.ready = ready;
        if (ready) {
            this.refresh();
        } else {
            this.clearResetTimer();
        }
    }

    /** 窗口首次打开和重新打开时校准当前状态。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refresh();
        }
    }

    /** 重连、跨天及玩法提交后读取任务。已有查询或领取时只标记待刷新。 */
    public refresh(): void {
        this.dirty = true;
        this.loadIfNeeded();
    }

    /** 领取一条已达标任务；页面收到回执后从 Model 读取后继档位。 */
    public claimTask(tab: QuestTab, id: number): Promise<boolean> {
        return this.claim(tab === "daily" ? "DAILY" : "ACHIEVEMENT", id);
    }

    /** 领取已达标的当日活跃度奖励。 */
    public claimMilestone(id: number): Promise<boolean> {
        return this.claim("MILESTONE", id);
    }

    /** 接纳当前会话的成功回执和通知，展示进度由 Model 唯一持有。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.QUEST_LIST:
                this.acceptSnapshot(payload as QuestSnapshot);
                break;
            case Protocol.QUEST_CLAIM: {
                const receipt = payload as QuestClaimReceipt;
                this.acceptSnapshot(receipt.snapshot);
                if (receipt.notice) {
                    this.restoreReward?.(receipt.notice);
                }
                break;
            }
            case Protocol.QUEST_CHANGED: {
                const { completed } = payload as { completed: readonly QuestCompletion[] };
                if (completed.length) {
                    this.emit("quest.completed", completed);
                }
                this.refresh();
                break;
            }
        }
    }

    /** 登记任务查询、领取回执和成就推送。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.QUEST_LIST, Protocol.QUEST_CLAIM, Protocol.QUEST_CHANGED]));
    }

    /** 清除离开角色的任务状态和在途刷新。 */
    protected onResetSession(): void {
        this.visible = false;
        this.dirty = false;
        this.loading = null;
        this.pendingClaim = null;
        this.clearResetTimer();
        QuestModel.instance.update(null);
        this.emit("quest.updated", undefined);
    }

    /** 场景结束后释放通信和奖励依赖。 */
    protected onDispose(): void {
        this.ready = false;
        this.operations = null;
        this.restoreReward = null;
    }

    /** 查询回包属于当前操作才提交；领取中收到的较早列表由领取回执覆盖。 */
    private loadIfNeeded(): void {
        if (!this.ready || !this.dirty || this.loading || this.pendingClaim || !this.operations) {
            return;
        }
        this.dirty = false;
        const operation = {};
        this.loading = operation;
        const finish = (): void => {
            if (this.loading === operation) {
                this.loading = null;
                this.loadIfNeeded();
            }
        };
        void this.operations.deliver(Protocol.QUEST_LIST, {}, frame => {
            if (this.loading === operation && !this.pendingClaim) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => {
            if (this.loading === operation) {
                if (this.visible) {
                    UIManager.instance.toast(ErrorUtils.messageOf(error));
                } else {
                    GameLog.shared.classified("MODULE", "warn", "QuestController", ErrorUtils.messageOf(error));
                }
            }
        }).then(finish, finish);
    }

    /** 执行一次服务端领取，回执与本次编号匹配才刷新任务和通用奖励。 */
    private async claim(kind: "DAILY" | "ACHIEVEMENT" | "MILESTONE", id: number): Promise<boolean> {
        const snapshot = QuestModel.instance.snapshot;
        if (!this.ready || !this.operations || this.pendingClaim || !snapshot) {
            return false;
        }
        const requestId = RequestIdUtils.create();
        this.pendingClaim = requestId;
        this.emit("quest.updated", undefined);
        let completed = false;
        try {
            await this.operations.deliver(Protocol.QUEST_CLAIM, { requestId, kind, id, resetAt: snapshot.resetAt }, frame => {
                if (this.pendingClaim === requestId) {
                    if ((frame.body as QuestClaimReceipt).requestId !== requestId) {
                        throw new Error("任务领取回执与本次请求不符");
                    }
                    ProtocolRouter.instance.dispatch(this, frame);
                    completed = true;
                }
            }, error => {
                if (this.pendingClaim === requestId) {
                    UIManager.instance.toast(ErrorUtils.messageOf(error));
                    this.dirty = true;
                }
            });
        } finally {
            if (this.pendingClaim === requestId) {
                this.pendingClaim = null;
                this.emit("quest.updated", undefined);
                this.loadIfNeeded();
            }
        }
        return completed;
    }

    /** 提交权威状态并以服务器时钟安排每日重置。 */
    private acceptSnapshot(snapshot: QuestSnapshot): void {
        QuestModel.instance.update(snapshot);
        this.emit("quest.updated", undefined);
        this.clearResetTimer();
        const now = ServerClock.instance.nowSeconds();
        if (this.ready && now !== null && snapshot.resetAt > now) {
            this.resetTimer = setTimeout(() => {
                this.resetTimer = null;
                this.refresh();
            }, (snapshot.resetAt - now) * 1000 + 100);
        }
    }

    /** 撤销上一次快照或上一个角色的重置计划。 */
    private clearResetTimer(): void {
        if (this.resetTimer !== null) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }
}
