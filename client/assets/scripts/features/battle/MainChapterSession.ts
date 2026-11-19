/**
 * 主线模块装配入口。初始化控制器和宝箱确认，接入通用结算反馈。
 * 页面从这里读取当前角色外观。主线协议统一由控制器处理。
 */
import { UIManager } from "../../framework/ui/UIManager";
import type { AccountOperations } from "../account/AccountOperations";
import type { AccountController } from "../account/AccountController";
import type { RewardBinding } from "../reward/RewardBinding";
import { IdleClaimBinding } from "./IdleClaimBinding";
import { MainChapterController } from "./MainChapterController";
import { MainChapterModel } from "./MainChapterModel";
import type { MainChapterReceipt } from "./MainChapterModel";

/** 主线仅需向唯一反馈队列交付实际奖励、重试展示或恢复缺少明细的历史记录。 */
type ChapterRewards = Pick<RewardBinding, "restoreActual" | "restoreItems" | "retry">;

export class MainChapterSession {
    /** 当前场景的主线模块，页面在操作时读取；场景结束随模块释放。 */
    public static current: MainChapterSession | null = null;

    /** 主线页面显示等级和头像时读取账号模块的权威角色。 */
    public get currentRole(): AccountController["currentRole"] {
        return this.service.currentRole;
    }

    /** 统一快照提交给原主线控制器，该控制器随资产入口统一清理。 */
    public readonly controller = MainChapterController.instance;
    /** 宝箱点击和满额确认的展示入口，角色切换时取消当前确认。 */
    public readonly idleClaim: IdleClaimBinding;
    /** 本次模块初始化结束后拒绝向旧主线流程交付响应。 */
    private disposed = false;

    /**
     * 模块初始化时建立游戏操作与反馈交付。
     * @param service 共享登录服务，提供角色快照。
     * @param operations 通过当前认证连接提交主线业务请求。
     * @param rewards 通用奖励窗的实际发放展示及完成回调。
     */
    public constructor(
        private readonly service: AccountController,
        operations: AccountOperations,
        rewards: ChapterRewards,
    ) {
        this.controller.configure(operations, rewards);
        this.controller.initialize();
        this.controller.configureSettlementFeedback(
            (receipt, presentation) => this.showSettlement(rewards, receipt, presentation),
            () => rewards.retry(),
        );

        this.idleClaim = new IdleClaimBinding(service, MainChapterModel.instance, this.controller);
        MainChapterSession.current = this;
    }

    /** 正常结算仅补附赠，冷恢复展示完整实际量；老记录缺少明细时按原记录显示并提示。 */
    private showSettlement(
        rewards: ChapterRewards,
        receipt: MainChapterReceipt,
        presentation: "battle" | "reward",
    ): "queued" | "empty" {
        const shown = (id: string): void => {
            if (!this.disposed) {
                this.controller.markSettlementFeedbackPresented(id);
            }
        };
        if (receipt.actual) {
            return rewards.restoreActual(
                receipt.battleId, receipt.state.assetRevision, receipt.actual,
                presentation === "battle" ? "bonuses" : "all", shown,
            );
        }
        UIManager.instance.toast("历史结算未记录附赠明细，仅展示已保存奖励");
        return presentation === "reward"
            ? rewards.restoreItems(receipt.battleId, receipt.state.assetRevision, receipt.rewards, shown)
            : "empty";
    }

    /** 角色切换时取消未完成的宝箱确认。 */
    public resetSession(): void {
        if (this.disposed) {
            return;
        }
        this.idleClaim.deactivate();
    }

    /** 释放本入口的领取操作，主线控制器由统一资产入口销毁。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (MainChapterSession.current === this) {
            MainChapterSession.current = null;
        }
        this.idleClaim.deactivate();
    }
}
