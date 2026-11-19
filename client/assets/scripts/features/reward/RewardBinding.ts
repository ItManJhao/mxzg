/**
 * 通用奖励的展示入口：按已接纳的快照版本排队，复用共享奖励窗和全局飘字。
 * 实时事务通知与已经双确认的历史回执进入同一队列；不发奖、不查询或保存另一份角色资产。
 */
import type { AccountController } from "../account/AccountController";
import { BagItemCatalog } from "../bag/utils/BagItemCatalog";
import { ConfirmView } from "../common/ui/ConfirmView";
import { RewardController } from "./RewardController";
import { RewardModel } from "./RewardModel";
import type { RewardArgs } from "./data/RewardData";
import type { RewardNotice } from "./data/RewardNoticeData";
import { RewardView } from "./ui/RewardView";
import { RoleUpgradeView } from "./ui/RoleUpgradeView";
import { HeroRewardView } from "./ui/HeroRewardView";
import type { HeroRewardArgs } from "./ui/HeroRewardView";
import { UIManager } from "../../framework/ui/UIManager";
import { GameLog } from "../../core/GameLog";
import type { BaseView } from "../../framework/ui/BaseView";
import type { ConfirmArgs } from "../common/ui/ConfirmView";
import { RewardUtils } from "./utils/RewardUtils";
import { EventDispatcher } from "../../framework/EventDispatcher";

/** 本次重试确认的窗口归属；只用于关闭本绑定创建的实例，不保存账号或业务资产。 */
interface RetryPrompt {
    /** 创建确认时的本地展示作用域，重置后旧确认不能重试新队列。 */
    readonly scope: object;
    /** 完成打开后的真实窗口；null表示尚在准备，可按已占有的confirm打开意图取消。 */
    view: BaseView<ConfirmArgs> | null;
}

export class RewardBinding {
    /** 当前角色正在等弹窗实际展示的操作；按回执定向通知，重置及销毁时一并撤销。 */
    private readonly waiting = new Map<string, (receiptId: string) => void>();
    /** 本应用唯一反馈进度，用于检查失败及宿主就绪；没有另一份奖励或资产状态。 */
    protected readonly model = new RewardModel();
    /** 本应用的奖励协议接收者，实时通知和历史回执都交给上述 Model。 */
    public readonly controller: RewardController;
    /** 应用销毁后拒绝通知和迟到历史结果，避免重新打开窗口。 */
    private disposed = false;
    /** 本地展示作用域；身份重置或销毁时替换对象，迟到失败和确认不再影响当前界面。 */
    private displayScope: object = {};
    /** 本绑定拥有的重试确认，完成或取消后清空；不接管其他业务的确认窗口。 */
    private retryPrompt: RetryPrompt | null = null;
    /** 队列状态变化时尝试展示队首，销毁时解除订阅。 */
    private readonly stopProgress: () => void;

    /**
     * 装配奖励队列、窗口及重试监听。各业务在交付自己的回执时登记实际展示通知。
     * @param account 账号服务负责判定回执归属，旧版仅含物品的结算也由它提供已就绪角色。
     */
    public constructor(private readonly account: Pick<AccountController, "currentRole" | "requireRoleOwner">) {
        this.controller = new RewardController(this.model, account);
        this.stopProgress = EventDispatcher.instance.on("reward.updated", this, this.showNext);
        this.controller.initialize();
    }

    /** 账号服务确认历史回执归属后，和实时通知共用展示队列。 */
    public restore(notice: RewardNotice, presented?: (receiptId: string) => void): void {
        if (this.disposed) {
            return;
        }
        this.account.requireRoleOwner(notice.roleId);
        this.enqueue(notice, presented);
    }

    /**
     * 将已确认业务回执的实际数量交同一奖励队列；归属读取应用当前角色，不从库存差量推导。
     * @returns queued表示原编号已交付（含同内容去重），不是窗口已显示；empty表示没有正奖励，不造空通知。
     */
    public restoreItems(
        receiptId: string,
        assetRevision: number,
        rows: readonly { itemId: number; quantity: number }[],
        presented?: (receiptId: string) => void,
    ): "queued" | "empty" {
        const role = this.account.currentRole;
        if (this.disposed || !role) {
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
        this.enqueue({
            schemaVersion: 1,
            receiptId,
            roleId: role.id,
            assetRevision,
            mode: "POPUP",
            items: Array.from(credited, ([itemId, amount]) => ({ itemId, credited: amount })),
        }, presented);
        return "queued";
    }

    /**
     * 将双确认的真实发放投影交既有队列；正常主线只交升级附赠，冷恢复及其他业务可交完整实际量。
     * 先确认历史明细的角色归属，包括零到账记录。没有升级和正到账量时返回 empty。
     */
    public restoreActual(receiptId: string, assetRevision: number, actual: unknown,
        part: "all" | "bonuses" = "all", presented?: (receiptId: string) => void): "queued" | "empty" {
        if (this.disposed) {
            throw new Error("奖励展示已结束");
        }
        this.account.requireRoleOwner((actual as { roleId?: unknown } | null)?.roleId);
        const notice = RewardUtils.fromActual(receiptId, assetRevision, actual, "POPUP", part);
        if (!notice) {
            return "empty";
        }
        this.enqueue(notice, presented);
        return "queued";
    }

    /** 主城已显示且配置包已安装才允许开窗；等待期间保留反馈，不强行加载配置。 */
    public setReady(ready: boolean): void {
        if (!this.disposed) {
            this.controller.setReady(ready);
        }
    }

    /** 角色已就绪时重试自己的失败批次，沿用原回执与展示队列。 */
    public retry(): void {
        if (!this.disposed && this.account.currentRole) {
            this.closeRetryPrompt();
            this.controller.retry();
        }
    }

    /** 身份变化先使展示作用域和队列失效，再关本绑定旧窗；迟到确认不会重试新角色。 */
    public resetSession(): void {
        this.displayScope = {};
        this.waiting.clear();
        this.controller.resetSession();
        UIManager.instance.closeById("reward");
        UIManager.instance.closeById("role-upgrade");
        UIManager.instance.closeById("hero-reward");
        this.closeRetryPrompt();
    }

    /** 关联本笔回执与真实开窗结果；已展示的回执立即确认，其余等待原队列。 */
    private enqueue(notice: RewardNotice, presented?: (receiptId: string) => void): void {
        const scope = this.displayScope;
        this.controller.restore(notice);
        if (!presented || notice.mode !== "POPUP" || !this.isCurrentScope(scope)) {
            return;
        }
        if (this.model.wasPresented(notice.receiptId)) {
            this.deliverPresented(notice.receiptId, presented);
        } else {
            this.waiting.set(notice.receiptId, presented);
        }
    }

    /** Model 在主城就绪且资产版本到达后占用队首，正在展示时不能重复取出。 */
    private showNext(): void {
        if (this.disposed) {
            return;
        }
        const notice = this.model.beginDisplay();
        if (notice) {
            const scope = this.displayScope;
            this.model.notify();
            if (this.isCurrentScope(scope)) {
                void this.display(notice, scope);
            }
        }
    }

    /** 弹窗关闭或飘字发出后推进队列；展示失败只询问一次，保留原批次供重试。 */
    private async display(notice: RewardNotice, scope: object): Promise<void> {
        try {
            if (notice.mode === "POPUP") {
                const { receiptId, items, heroes, roleUpgrade, summonBatch, repeatSummon } = notice;
                await this.showPopup(Object.freeze({
                    receiptId,
                    items,
                    ...(heroes && { heroes }),
                    ...(roleUpgrade && { roleUpgrade }),
                    ...(summonBatch && { summonBatch }),
                    ...(repeatSummon && { repeatSummon }),
                }));
            } else {
                await this.showTips(notice);
            }
        } catch (error) {
            if (this.isCurrentScope(scope)) {
                const reason = error instanceof Error ? error.message : String(error);
                this.model.failDisplay(notice.receiptId, reason);
                this.model.notify();
                const detail = error instanceof Error ? error.stack || error.message : String(error);
                GameLog.shared.classified("MODULE", "warn", "RewardBinding",
                    "奖励反馈展示失败，已保留原批次等待显式重试：" + notice.receiptId + "\n" + detail);
                this.offerRetry(scope);
            }
            return;
        }
        if (this.isCurrentScope(scope)) {
            this.model.completeDisplay(notice.receiptId);
            this.model.notify();
        }
    }

    /** 召唤按旧版播放开场、揭示四五星并汇总；其他奖励保留逐个获得及升级表现。 */
    protected async showPopup(args: RewardArgs): Promise<void> {
        const scope = this.displayScope;
        const allHeroes = args.heroes || [];
        const summonResults = !!(args.summonBatch || args.repeatSummon);
        const heroes = allHeroes
            .filter(hero => !summonResults || hero.star >= 4)
            .sort((left, right) => right.star - left.star);
        const heroTypes = new Set(allHeroes.map(hero => hero.templateId));
        const items = args.items.filter(item => !heroTypes.has(item.itemId));
        const hasOtherRewards = items.some(item => item.credited > 0) || !!args.roleUpgrade;
        if (args.repeatSummon) {
            await this.showWindow(RewardView, { ...args, summonIntro: true }, scope, false);
        }
        for (let index = 0; index < heroes.length; index++) {
            if (!this.isCurrentScope(scope)) {
                return;
            }
            await this.showWindow(HeroRewardView, {
                receiptId: args.receiptId,
                hero: heroes[index],
            }, scope, index === heroes.length - 1 && !hasOtherRewards && !summonResults);
        }
        if (!this.isCurrentScope(scope)) {
            return;
        }
        if (summonResults) {
            await this.showWindow(RewardView, args, scope, true);
        } else if (!heroes.length || hasOtherRewards) {
            await this.showWindow(args.roleUpgrade ? RoleUpgradeView : RewardView,
                { ...args, heroes: [], items }, scope, true);
        }
    }

    /** 等待一个静态通用窗口真实打开并关闭；任一准备失败保持原队首，换号不继续下一段。 */
    private showWindow(ctor: typeof HeroRewardView | typeof RewardView | typeof RoleUpgradeView,
        args: RewardArgs | HeroRewardArgs, scope: object, last: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let opened = false;
            let closed = false;
            void UIManager.instance.open<RewardArgs | HeroRewardArgs>(ctor, {
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
                if (last) {
                    this.notifyPresented(args.receiptId);
                }
                if (closed) {
                    resolve();
                }
            }, reject);
        });
    }

    /** 最后一段窗口真实打开后登记已展示，取出且移除这笔回执的业务监听。 */
    private notifyPresented(receiptId: string): void {
        this.model.markPresented(receiptId);
        const callback = this.waiting.get(receiptId);
        this.waiting.delete(receiptId);
        if (callback) {
            this.deliverPresented(receiptId, callback);
        }
    }

    /** 只通知该回执的发起方；其处理失败记录一次，不改变窗口已成功展示的事实。 */
    private deliverPresented(receiptId: string, callback: (receiptId: string) => void): void {
        try {
            callback(receiptId);
        } catch (error) {
            GameLog.shared.warnOnce("MODULE", "RewardBinding", "PRESENTED_CALLBACK:" + receiptId,
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
                GameLog.shared.classified("MODULE", "warn", "RewardBinding",
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
    protected showTips(notice: RewardNotice): void {
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
        this.waiting.clear();
        this.stopProgress();
        this.controller.dispose();
        UIManager.instance.closeById("reward");
        UIManager.instance.closeById("role-upgrade");
        UIManager.instance.closeById("hero-reward");
        this.closeRetryPrompt();
    }
}
