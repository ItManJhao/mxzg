/**
 * 挂机宝箱的点击和确认窗口。读取当前累计和冒险点展示等待时间或满额确认，
 * 确认后把累计版本和显示期交给主线控制器。
 */
import { GameLog } from "../../core/GameLog";
import { ServerClock } from "../../core/ServerClock";
import { UIManager } from "../../framework/ui/UIManager";
import type { BaseView } from "../../framework/ui/BaseView";
import type { AccountController } from "../account/AccountController";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import { ConfirmView } from "../common/ui/ConfirmView";
import type { ConfirmArgs } from "../common/ui/ConfirmView";
import type { MainChapterController } from "./MainChapterController";
import type { MainChapterModel } from "./MainChapterModel";
import { IdleChestUtils } from "./utils/IdleChestUtils";

/** 当前点击及其确认窗，切换角色时取消未确认的操作。 */
interface IdleClaimIntent {
    /** 原页面显示期，领取成功后只在该页面仍打开时播放。 */
    readonly presentationContext: object | null;
    /** 等待确认或本次请求，重复点击共用。 */
    promise: Promise<void>;
    /** 当前操作打开的确认窗，取消时仅关闭这一个实例。 */
    view: BaseView<ConfirmArgs> | null;
    /** 确认窗正在准备时，用于取消本次打开。 */
    opening: boolean;
    /** 完成确认的回调，确认、取消或切换角色时释放。 */
    resolve: ((confirmed: boolean) => void) | null;
}

export class IdleClaimBinding {
    /** 当前一次点击，处理结束或身份变化后释放。 */
    private intent: IdleClaimIntent | null = null;

    /**
     * 装配宝箱点击和确认，复用账号和主线状态。
     * @param service 提供当前角色的冒险点。
     * @param model 提供服务器下发的累计与版本。
     * @param controller 接收确认后的领取操作。
     */
    public constructor(
        private readonly service: Pick<AccountController, "currentRole">,
        private readonly model: MainChapterModel,
        private readonly controller: Pick<MainChapterController, "claimIdle">,
    ) {
    }

    /** 处理一次宝箱点击，满额时先等玩家确认。 */
    public begin(presentationContext: object | null = null): Promise<void> {
        if (this.intent) {
            return this.intent.promise;
        }
        const intent: IdleClaimIntent = {
            presentationContext,
            promise: Promise.resolve(),
            view: null,
            opening: false,
            resolve: null,
        };
        this.intent = intent;
        intent.promise = this.submit(intent).catch(error => {
            if (this.intent === intent && !UIManager.isOpenCancelled(error)) {
                GameLog.shared.classified("MODULE", "warn", "IdleClaimBinding", String(error));
                if (!UIManager.isFailureReported(error)) {
                    UIManager.instance.toast("挂机领取未开始，请稍后重试");
                }
            }
        }).then(() => {
            if (this.intent === intent) {
                this.intent = null;
            }
        });
        return intent.promise;
    }

    /** 使用当前快照展示等待和满额确认，将点击时的累计版本交给主线控制器。 */
    private async submit(intent: IdleClaimIntent): Promise<void> {
        const idle = this.model.idle;
        if (!idle?.claimState || idle.claimState.requestMode !== "ENABLED") {
            UIManager.instance.toast(idle?.rewardStage === 0 ? "通关第1关后可领取挂机奖励" : "挂机领取暂未开放");
            return;
        }
        const points = this.service.currentRole?.tavernPoints;
        const now = ServerClock.instance.nowSeconds();
        if (!points || now === null) {
            UIManager.instance.toast("挂机状态尚未就绪");
            return;
        }
        const wait = IdleChestUtils.claimWaitSeconds(
            IdleChestUtils.elapsed(now, idle.startedAt, idle.maxSeconds), idle.frequency, idle.maxSeconds,
        );
        if (wait !== 0) {
            UIManager.instance.toast(wait === null ? "挂机状态尚未就绪" : "请再等待" + wait + "秒");
            return;
        }

        if (points.adventureCount >= points.limit && !await this.confirmCapacity(intent)) {
            return;
        }
        if (this.intent !== intent) {
            return;
        }

        await this.controller.claimIdle(idle.claimState.operationVersion, intent.presentationContext);
    }

    /** 冒险点达到上限时询问玩家，取消时结束当前点击。 */
    private confirmCapacity(intent: IdleClaimIntent): Promise<boolean> {
        const ui = UIManager.instance;
        if (ui.isOpen("confirm") || ui.snapshot().opening > 0) {
            ui.toast("请先完成当前操作");
            return Promise.resolve(false);
        }
        const text = (id: number): string => {
            const value = GameConfig.instance.getConfig(GConfig.Language, id)?.value;
            if (!value) {
                throw new Error("挂机满额确认缺少语言配置：" + id);
            }
            return value;
        };
        const args = { title: text(3500), message: text(2220), confirmText: text(47589), cancelText: text(47703) };
        return new Promise<boolean>((resolve, reject) => {
            intent.resolve = resolve;
            intent.opening = true;
            void ui.open(ConfirmView, {
                ...args,
                onConfirm: () => this.resolveIntent(intent, true),
                onCancel: () => this.resolveIntent(intent, false),
            }).then(view => {
                intent.opening = false;
                if (this.intent === intent) {
                    intent.view = view;
                } else {
                    ui.close(view);
                    this.resolveIntent(intent, false);
                }
            }, error => {
                intent.opening = false;
                intent.resolve = null;
                reject(error);
            });
        });
    }

    /** 解除确认回调，只有当前点击能提交。 */
    private resolveIntent(intent: IdleClaimIntent, confirmed: boolean): void {
        const resolve = intent.resolve;
        intent.resolve = null;
        resolve?.(confirmed && this.intent === intent);
    }

    /** 结束旧点击，关掉它持有的确认窗或取消正在准备的窗口。 */
    public deactivate(): void {
        const intent = this.intent;
        this.intent = null;
        if (!intent) {
            return;
        }
        this.resolveIntent(intent, false);
        if (intent.view) {
            UIManager.instance.close(intent.view);
        } else if (intent.opening) {
            UIManager.instance.closeById("confirm");
        }
    }
}
