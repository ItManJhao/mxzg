/**
 * 挂机领取恢复的应用装配：在统一快照提交后，按已认证区服和角色激活持久原请求。
 * 身份、存储作用域及回执角色归属只在此检查；模块不接触凭证，也不以历史回执更新资产。
 */
import { GameLog } from "../../core/GameLog";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountService } from "../../features/account/AccountService";
import { MainChapterIdleClaimController } from "../../features/battle/MainChapterIdleClaimController";
import { MainChapterModel } from "../../features/battle/MainChapterModel";
import type { RewardNotice } from "../../features/reward/data/RewardNoticeData";
import { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { GameSocketClient, SocketFailure } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";
import { IdleClaimJournal } from "./IdleClaimJournal";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import { IdleChestUtils } from "../../features/battle/utils/IdleChestUtils";
import { ConfirmView } from "../../features/common/ui/ConfirmView";
import type { ConfirmArgs } from "../../features/common/ui/ConfirmView";
import type { BaseView } from "../../framework/ui/BaseView";
import { UIManager } from "../../framework/ui/UIManager";

/** 新领取的应用策略；默认关闭入口，独立专项可明确启用并提供可控显示时钟。 */
export interface IdleClaimEntryOptions {
    /** true才允许创建新的玩家意图；不影响既有持久请求的鉴权恢复。 */
    readonly enabled?: boolean;
    /** 当前显示时钟毫秒，默认Date.now；不改变服务端计时或领取资格。 */
    readonly now?: () => number;
}

/** 一次点击期间的本地能力，换号/关闭后失效，不替代持久原请求或服务端幂等。 */
interface IdleClaimIntent {
    /** 创建意图时的应用激活代次；只由应用层隔离旧确认回调。 */
    readonly activation: number;
    /** 并发点击共享同一流程，结束后解除引用。 */
    promise: Promise<void>;
    /** 本流程已经打开的共享确认实例；取消时只关闭该实例。 */
    view: BaseView<ConfirmArgs> | null;
    /** 确认是否尚在准备，撤销时取消本流程的在途打开。 */
    opening: boolean;
    /** 确认等待的单次完成口，取消流程时以false结束，不创建领取意图。 */
    resolve: ((confirmed: boolean) => void) | null;
}

/** 应用身份绑定，不新增状态同步出口；只交付已经接受的统一快照和真实命令结果。 */
export class IdleClaimBinding {
    /** 当前应用创建的恢复控制器，唯一主线Model仍由原主线模块持有。 */
    private readonly controller: MainChapterIdleClaimController;
    /** 已激活或正在读取的区服/角色键；仅应用层保存，退出时清空。 */
    private identity: string | null = null;
    /** 身份绑定任务代次，阻止旧身份的存储打开任务激活新会话。 */
    private activation = 0;
    /** 存储激活失败后普通推送不重复尝试；下一次认证首包才允许显式恢复。 */
    private activationFailed = false;
    /** 当前身份持久端口激活及首次恢复已完成；准备中不能创建新的原请求。 */
    private activated = false;
    /** 本次玩家点击及确认，重复点击复用，身份变化时取消。 */
    private intent: IdleClaimIntent | null = null;
    /** 只检查现有认证连接，不发业务查询；旧身份的成功/失败仍由AccountService隔离。 */
    private readonly ensureReady: () => Promise<void>;
    /** 应用销毁后不再交付请求结果或激活存储。 */
    private disposed = false;
    /** 退出订阅的解除函数，不因页面开关而变化。 */
    private readonly stop: () => void;

    /**
     * 绑定应用唯一账号、长连接和持久记录；独立测试可注入隔离主线Model和存储。
     * @param journal 已经过独立测试作用域隔离的存储，不允许共享日常身份记录。
     * @param model 应用已有的唯一主线状态，默认使用原实例，不在绑定内复制资产。
     * @param onConfirmed 原意图及统一快照双确认后的通用反馈，由应用交给唯一奖励模块去重展示。
     */
    constructor(
        /** 统一账号状态只用于应用身份归属检查，不复制角色资产。 */
        private readonly account: AccountModel,
        /** 统一认证交付口，同时过滤旧身份的成功和失败。 */
        service: AccountService,
        /** 应用唯一连接，缺失状态时重新鉴权获取首包。 */
        socket: GameSocketClient,
        /** 应用持有存储句柄，销毁仅关闭连接，不删除原请求。 */
        private readonly journal: Pick<IdleClaimJournal, "forRole" | "dispose">,
        /** 应用原有主线数据；只读取时钟与操作版本，不保存另一份权威状态。 */
        private readonly model = MainChapterModel.instance,
        onConfirmed?: (notice: RewardNotice) => void,
        /** 玩家入口策略与显示时钟；正式装配明确关闭，不从URL或后端开关擅自开启。 */
        private readonly entry: IdleClaimEntryOptions = {},
    ) {
        this.ensureReady = () => service.authenticated(async token => { socket.assertReady(token); });
        this.controller = new MainChapterIdleClaimController(model);
        this.controller.configure((name, body, received, failed) => service.deliverAuthenticated(
            token => socket.chapter(token, name, body),
            frame => {
                if (!this.disposed) {
                    this.validateReceiptOwner(frame);
                    received(frame);
                }
            },
            error => {
                if (!this.disposed) {
                    failed(error);
                }
            },
        ), () => service.authenticated(token => socket.refreshSnapshot(token)), onConfirmed);
        this.controller.initialize();
        this.stop = account.subscribe(state => {
            if (!state.role) {
                this.deactivate();
            }
        });
    }

    /** 只在统一资产入口提交整包后调用；鉴权恢复原命令，普通推送只检查双确认。 */
    public afterSnapshot(protocol: string): void {
        if (this.disposed) {
            return;
        }
        const state = this.account.snapshot;
        const role = state.role;
        if (state.busy || !role) {
            return;
        }
        // 旧首包缺区服时保持只读，不能把记录写入一个猜测的默认区服。
        if (!role.serverId) {
            return;
        }
        const identity = JSON.stringify([role.serverId, role.id]);
        const authenticated = protocol === Protocol.SESSION_AUTHENTICATE || protocol === Protocol.SESSION_LOGIN;
        if (this.identity !== identity || (authenticated && this.activationFailed)) {
            this.deactivate();
            this.identity = identity;
            const activation = this.activation;
            void this.activate(role.serverId, role.id, activation);
            return;
        }
        if (authenticated) {
            // 两种流程互斥：本地确认先占用流程时，会吞掉本次鉴权对其他标签页新意图的恢复。
            void this.controller.recover().catch(error => this.report(error));
        } else {
            this.controller.observeSnapshot();
        }
    }

    /** 应用身份变化先撤销内存及在途存储激活；保留旧身份的持久原请求供以后重登恢复。 */
    public deactivate(): void {
        this.activation++;
        this.cancelIntent();
        this.identity = null;
        this.activationFailed = false;
        this.activated = false;
        this.controller.deactivate();
    }

    /**
     * 未来玩家领取意图的唯一应用入口：先检查显示门槛和真实冒险点，再复用通用确认。
     * 默认关闭；确认前不写journal、不发送领取。恢复旧请求不重问当前满额条件。
     */
    public begin(): Promise<void> {
        if (this.disposed) {
            return Promise.resolve();
        }
        if (!this.entry.enabled) {
            UIManager.instance.toast("挂机领取暂未开放");
            return Promise.resolve();
        }
        if (this.intent) {
            return this.intent.promise;
        }
        const intent: IdleClaimIntent = { activation: this.activation, promise: Promise.resolve(),
            view: null, opening: false, resolve: null };
        this.intent = intent;
        intent.promise = this.executeIntent(intent).catch(error => {
            if (this.currentIntent(intent) && !UIManager.isOpenCancelled(error)) {
                this.report(error);
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

    /** 从唯一当前状态判定新点击；任何缺失均明确停止，不从库存或历史回执推导余额。 */
    private async executeIntent(intent: IdleClaimIntent): Promise<void> {
        const role = this.account.snapshot.role;
        if (!this.activated || this.account.snapshot.busy || !role) {
            UIManager.instance.toast("角色状态正在准备，请稍后重试");
            return;
        }
        await this.ensureReady();
        if (!this.currentIntent(intent)) {
            return;
        }
        if (this.model.idleClaim.pending) {
            await this.controller.recover();
            return;
        }
        const idle = this.model.idle;
        const points = this.account.snapshot.role?.tavernPoints;
        if (!idle?.claimState || idle.claimState.requestMode !== "ENABLED") {
            UIManager.instance.toast("挂机领取暂未开放");
            return;
        }
        if (!points) {
            UIManager.instance.toast("冒险点状态尚未同步，请重新连接后重试");
            return;
        }
        const seconds = IdleChestUtils.elapsed(idle.serverTime, idle.startedAt, idle.maxSeconds,
            this.model.idleReceivedAt, this.entry.now?.() ?? Date.now());
        const wait = IdleChestUtils.claimWaitSeconds(seconds, idle.frequency, idle.maxSeconds);
        if (wait !== 0) {
            UIManager.instance.toast(wait === null ? "挂机状态尚未就绪" : "请再等待" + wait + "秒");
            return;
        }
        const operationVersion = idle.claimState.operationVersion;
        if (points.adventureCount >= points.limit && !await this.confirmCapacity(intent)) {
            return;
        }
        if (!this.currentIntent(intent)) {
            return;
        }
        // 用户可能在确认框停留时断网或切到后台；明确未连接时不先创建一笔新的持久意图。
        await this.ensureReady();
        if (!this.currentIntent(intent)) {
            return;
        }
        // 确认期间另一笔消费或重连可能改变操作版本，不能把旧点击顺势用于新的累计周期。
        const latest = this.model.idle?.claimState;
        if (!latest || latest.requestMode !== "ENABLED" || latest.operationVersion !== operationVersion) {
            UIManager.instance.toast("挂机状态已更新，请重新操作");
            return;
        }
        await this.controller.begin(operationVersion);
    }

    /** 已满才打开通用确认；已有其他确认时不顶替它，取消/空白关闭都不创建原请求。 */
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
                if (!this.currentIntent(intent)) {
                    ui.close(view);
                    this.resolveIntent(intent, false);
                } else {
                    intent.view = view;
                }
            }, error => {
                intent.opening = false;
                intent.resolve = null;
                reject(error);
            });
        });
    }

    /** 单次交付确认结果；旧窗口或重复回调不能继续当前身份的新领取。 */
    private resolveIntent(intent: IdleClaimIntent, confirmed: boolean): void {
        const resolve = intent.resolve;
        intent.resolve = null;
        resolve?.(confirmed && this.currentIntent(intent));
    }

    /** 当前应用激活与本地点击仍相同才可继续，不在模块/View比较角色或账号键。 */
    private currentIntent(intent: IdleClaimIntent): boolean {
        return !this.disposed && this.intent === intent && intent.activation === this.activation;
    }

    /** 身份变化结束未完成确认，关闭已持有实例或取消本次准备，不删除持久原请求。 */
    private cancelIntent(): void {
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

    /** 读取持久句柄后再次核对应用代次，旧身份的慢存储结果不进入新模块。 */
    private async activate(serverId: string, roleId: string, activation: number): Promise<void> {
        try {
            const port = await this.journal.forRole(serverId, roleId);
            if (this.disposed || activation !== this.activation) {
                return;
            }
            await this.controller.activate(port);
            if (!this.disposed && activation === this.activation) {
                this.activated = true;
            }
        } catch (error) {
            if (!this.disposed && activation === this.activation) {
                this.activationFailed = true;
                this.report(error);
            }
        }
    }

    /** 历史回执的资产归属在应用层检查；只交付当前角色的历史确认，绝不回写其中的余额。 */
    private validateReceiptOwner(frame: GameFrame): void {
        const body = frame.body as Record<string, unknown> | null;
        const receipt = frame.name === Protocol.CHAPTER_IDLE_CLAIM ? body
            : body?.status === "COMMITTED" ? body.receipt as Record<string, unknown> : null;
        if (!receipt) {
            return;
        }
        const actual = receipt.actual as Record<string, unknown> | null;
        const role = this.account.snapshot.role;
        if (!role || actual?.roleId !== role.id) {
            throw new SocketFailure("INVALID_MESSAGE", "挂机历史回执不属于当前角色");
        }
    }

    /** 存储失败不阻断已认证的只读游戏，也不发送无法持久恢复的领取命令。 */
    private report(error: unknown): void {
        GameLog.shared.classified("APP", "warn", "IdleClaimBinding", "挂机领取恢复暂停：" + String(error));
    }

    /** 应用结束解除身份监听和存储连接；不删除任何身份的待确认记录。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.stop();
        this.deactivate();
        this.controller.dispose();
        this.journal.dispose();
    }
}
