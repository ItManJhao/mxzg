/**
 * 通用奖励的应用装配：核对当前认证归属、交付已接纳快照版本，并复用共享奖励窗和全局飘字。
 * 实时事务通知与已经双确认的历史回执进入同一队列；不发奖、不查询或保存另一份角色资产。
 */
import { AccountModel } from "../../features/account/AccountModel";
import { BagItemCatalog } from "../../features/bag/utils/BagItemCatalog";
import { ConfirmView } from "../../features/common/ui/ConfirmView";
import { RewardController } from "../../features/reward/RewardController";
import { RewardModel } from "../../features/reward/RewardModel";
import type { RewardArgs } from "../../features/reward/data/RewardData";
import type { RewardNotice } from "../../features/reward/data/RewardNoticeData";
import { RewardView } from "../../features/reward/ui/RewardView";
import { RoleUpgradeView } from "../../features/reward/ui/RoleUpgradeView";
import { UIManager } from "../../framework/ui/UIManager";
import { GameProtocolCodecUtils } from "../../platform/GameProtocolCodecUtils";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils } from "../../platform/ProtocolStateUtils";
import { GameLog } from "../../core/GameLog";
import type { BaseView } from "../../framework/ui/BaseView";
import type { ConfirmArgs } from "../../features/common/ui/ConfirmView";
import { RewardUtils } from "../../features/reward/utils/RewardUtils";

/** 本次重试确认的窗口归属；只用于关闭本绑定创建的实例，不保存账号或业务资产。 */
interface RetryPrompt {
    /** 创建确认时的本地展示作用域，重置后旧确认不能重试新队列。 */
    readonly scope: object;
    /** 完成打开后的真实窗口；null表示尚在准备，可按已占有的confirm打开意图取消。 */
    view: BaseView<ConfirmArgs> | null;
}

export class RewardBinding {
    /** 本应用唯一反馈进度，用于检查失败及宿主就绪；没有另一份奖励或资产状态。 */
    private readonly model = new RewardModel();
    /** 本应用唯一反馈队列及去重状态；换号清空，弹窗关闭不销毁。 */
    private readonly controller = new RewardController(this.model);
    /** 应用销毁后拒绝通知和迟到历史结果，避免重新打开窗口。 */
    private disposed = false;
    /** 本地展示作用域；身份重置或销毁时替换对象，迟到失败和确认不再影响当前界面。 */
    private displayScope: object = {};
    /** 本绑定拥有的重试确认，完成或取消后清空；不接管其他业务的确认窗口。 */
    private retryPrompt: RetryPrompt | null = null;

    /**
     * @param account 应用唯一认证角色，只检查归属，不复制钱包或库存。
     * @param onPresented 通用奖励窗真实打开后的展示通知；业务可据此完成原反馈归属，不代表发奖。
     */
    public constructor(
        private readonly account: AccountModel,
        private readonly onPresented?: (receiptId: string) => void,
    ) {
        this.controller.configure(args => this.showPopup(args), notice => this.showTips(notice));
        this.controller.initialize();
    }

    /** 当前连接真实事件经归属检查后定向交模块，不把状态推送或RPC回包伪造为发奖通知。 */
    public receive(frame: GameFrame): void {
        if (this.disposed) {
            return;
        }
        if (frame.name !== Protocol.REWARD_GRANTED || frame.kind !== "event") {
            throw new Error("非通用发奖事件");
        }
        this.validateOwner(frame.body);
        ProtocolRouter.instance.dispatch(this.controller, frame);
    }

    /** 只能由唯一资产入口成功提交后调用，反馈在达到提交版本之前不会出现。 */
    public afterSnapshot(frame: GameFrame): void {
        if (!this.disposed) {
            const state = ProtocolStateUtils.statePayload(frame.name as ProtocolName, frame.body);
            this.controller.observeRevision(state.revision as number);
        }
    }

    /** 原业务双确认后恢复丢失反馈，与实时通知按同一持久回执编号去重。 */
    public restore(notice: RewardNotice): void {
        if (!this.disposed) {
            this.validateOwner(notice);
            this.controller.restore(notice);
        }
    }

    /**
     * 将已确认业务回执的实际数量交同一奖励队列；归属读取应用当前角色，不从库存差量推导。
     * @returns queued表示原编号已交付（含同内容去重），不是窗口已显示；empty表示没有正奖励，不造空通知。
     */
    public restoreItems(
        receiptId: string,
        assetRevision: number,
        rows: readonly { itemId: number; quantity: number }[],
    ): "queued" | "empty" {
        const state = this.account.snapshot;
        if (this.disposed || state.busy || !state.role) {
            throw new Error("当前身份不能接纳奖励恢复反馈");
        }
        if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(receiptId)
            || !Number.isSafeInteger(assetRevision) || assetRevision <= 0 || !Array.isArray(rows)) {
            throw new Error("奖励恢复编号、版本或明细无效");
        }
        const credited = new Map<number, number>();
        for (const row of rows) {
            if (!row || !Number.isSafeInteger(row.itemId) || row.itemId <= 0 || row.itemId > 0xffffffff
                || !Number.isSafeInteger(row.quantity) || row.quantity < 0) {
                throw new Error("奖励恢复实际数量无效");
            }
            if (row.quantity === 0) {
                continue;
            }
            const total = (credited.get(row.itemId) || 0) + row.quantity;
            if (!Number.isSafeInteger(total)) {
                throw new Error("奖励恢复合并数量超出安全范围");
            }
            credited.set(row.itemId, total);
        }
        if (!credited.size) {
            return "empty";
        }
        this.restore({
            schemaVersion: 1,
            receiptId,
            roleId: state.role.id,
            assetRevision,
            mode: "POPUP",
            items: Array.from(credited, ([itemId, amount]) => ({ itemId, credited: amount })),
        });
        return "queued";
    }

    /**
     * 将双确认的真实发放投影交既有队列；正常主线只交升级附赠，冷恢复及其他业务可交完整实际量。
     * 归属始终在应用层校验，既无升级也无正量才不展示；part不改变服务端结果或历史经验。
     */
    public restoreActual(receiptId: string, assetRevision: number, actual: unknown,
        part: "all" | "bonuses" = "all"): "queued" | "empty" {
        const state = this.account.snapshot;
        if (this.disposed || state.busy || !state.role || !actual || typeof actual !== "object"
            || (actual as { roleId?: unknown }).roleId !== state.role.id) {
            throw new Error("实际奖励不属于当前可接纳反馈的角色");
        }
        const notice = RewardUtils.fromActual(receiptId, assetRevision, actual, "POPUP", part);
        if (!notice) {
            return "empty";
        }
        this.restore(notice);
        return "queued";
    }

    /** 主城已显示且配置包已安装才允许开窗；等待期间保留反馈，不强行加载配置。 */
    public setReady(ready: boolean): void {
        if (!this.disposed) {
            this.controller.setReady(ready);
        }
    }

    /** 显式重试原失败批次；取消确认后也可由应用调用，不发奖、不改编号或自动循环。 */
    public retry(): void {
        if (!this.disposed && !this.account.snapshot.busy && this.account.snapshot.role) {
            this.closeRetryPrompt();
            this.controller.retry();
        }
    }

    /** 身份变化先使展示作用域和队列失效，再关本绑定旧窗；迟到确认不会重试新角色。 */
    public resetSession(): void {
        this.displayScope = {};
        this.controller.resetSession();
        UIManager.instance.closeById("reward");
        UIManager.instance.closeById("role-upgrade");
        this.closeRetryPrompt();
    }

    /** 当前已认证角色的通知才能进入队列；身份判断集中在应用层。 */
    private validateOwner(value: unknown): void {
        const notice = GameProtocolCodecUtils.validateRewardNotice(value);
        const state = this.account.snapshot;
        if (state.busy || !state.role || notice.roleId !== state.role.id) {
            throw new Error("奖励反馈不属于当前认证角色");
        }
    }

    /** 同队列按真实升级信息选择通用升级或奖励窗；关闭才推进，失败不能伪装为已显示。 */
    private showPopup(args: RewardArgs): Promise<void> {
        const scope = this.displayScope;
        return new Promise<void>((resolve, reject) => {
            let opened = false;
            let closed = false;
            void UIManager.instance.open<RewardArgs>(args.roleUpgrade ? RoleUpgradeView : RewardView, {
                ...args,
                onClosed: () => {
                    closed = true;
                    if (opened) {
                        resolve();
                    }
                },
            }).then(view => {
                if (!this.isCurrentScope(scope)) {
                    UIManager.instance.close(view);
                    resolve();
                    return;
                }
                opened = true;
                this.notifyPresented(args.receiptId);
                if (closed) {
                    resolve();
                }
            }, error => {
                reject(error);
                // 先让Controller保留failed队首，再询问是否重试；关闭清理不能把准备失败当成成功。
                void Promise.resolve().then(() => this.offerRetry(scope));
            });
        });
    }

    /** 只报告真实打开的同作用域窗口；监听异常记录一次，不改变已经成功显示的结果。 */
    private notifyPresented(receiptId: string): void {
        try {
            this.onPresented?.(receiptId);
        } catch (error) {
            GameLog.shared.warnOnce("APP", "RewardBinding", "PRESENTED_CALLBACK:" + receiptId,
                "奖励窗口已显示，展示通知处理失败：" + receiptId + "；" + String(error));
        }
    }

    /** 失败只询问一次；已有确认或其他窗口正在准备时保留失败，不替换其他业务操作意图。 */
    private offerRetry(scope: object): void {
        const progress = this.model.snapshot;
        const ui = UIManager.instance;
        if (!this.isCurrentScope(scope) || !progress.ready || progress.phase !== "failed"
            || this.retryPrompt || ui.isOpen("confirm") || ui.snapshot().opening > 0) {
            return;
        }
        const prompt: RetryPrompt = { scope, view: null };
        this.retryPrompt = prompt;
        void ui.open(ConfirmView, {
            title: "奖励提示",
            message: "奖励已到账，显示未完成。是否重试？",
            confirmText: "重试",
            cancelText: "暂不重试",
            onConfirm: () => this.finishRetryPrompt(prompt, true),
            onCancel: () => this.finishRetryPrompt(prompt, false),
        }).then(view => {
            if (this.retryPrompt !== prompt || !this.isCurrentScope(scope)) {
                ui.close(view);
                return;
            }
            prompt.view = view;
        }, error => {
            if (this.retryPrompt === prompt) {
                this.retryPrompt = null;
            }
            if (this.isCurrentScope(scope) && !UIManager.isOpenCancelled(error)
                && !UIManager.isFailureReported(error)) {
                const detail = error instanceof Error ? error.stack || error.message : String(error);
                GameLog.shared.classified("APP", "warn", "RewardBinding",
                    "奖励重试确认未能打开，原反馈仍保留，可显式重试：\n" + detail);
            }
        });
    }

    /** 确认完成后先解除窗口归属；取消只保留队列，同作用域的明确确认才触发重试。 */
    private finishRetryPrompt(prompt: RetryPrompt, confirmed: boolean): void {
        if (this.retryPrompt !== prompt) {
            return;
        }
        this.retryPrompt = null;
        if (confirmed && this.isCurrentScope(prompt.scope)) {
            this.retry();
        }
    }

    /** 取消本绑定拥有的确认或在途打开，不关闭其他业务后来创建的确认窗口。 */
    private closeRetryPrompt(): void {
        const prompt = this.retryPrompt;
        this.retryPrompt = null;
        if (prompt?.view) {
            UIManager.instance.close(prompt.view);
        } else if (prompt) {
            UIManager.instance.closeById("confirm");
        }
    }

    /** 只隔离本绑定异步展示任务，角色归属仍由应用统一身份入口负责。 */
    private isCurrentScope(scope: object): boolean {
        return !this.disposed && this.displayScope === scope;
    }

    /** 旧TIPS模式复用全局飘字，按实际到账逐条提示；名称只从已安装的GameConfig投影。 */
    private showTips(notice: RewardNotice): void {
        if (notice.roleUpgrade) {
            UIManager.instance.toast("角色等级 " + notice.roleUpgrade.beforeLevel + " → " + notice.roleUpgrade.afterLevel);
        }
        for (const item of notice.items) {
            const title = BagItemCatalog.face(item.itemId, item.credited).title;
            UIManager.instance.toast("获得 " + title + " ×" + item.credited);
        }
    }

    /** 应用销毁先撤队列再关窗，取消所有迟到交付，不释放其他模块持有的资源。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.displayScope = {};
        this.controller.dispose();
        UIManager.instance.closeById("reward");
        UIManager.instance.closeById("role-upgrade");
        this.closeRetryPrompt();
    }
}
