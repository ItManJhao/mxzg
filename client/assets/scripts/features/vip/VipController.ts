/** 契约任务的协议入口。只发送当前任务编号，状态交给 Model，实际到账交给通用奖励。 */
import { ErrorUtils } from "../../core/ErrorUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import type { AccountOperations } from "../account/AccountOperations";
import type { RewardBinding } from "../reward/RewardBinding";
import type { RewardNotice } from "../reward/data/RewardNoticeData";
import type { VipState } from "./data/VipData";
import { VipModel } from "./VipModel";

export class VipController extends BaseController {
    /** 页面转交领取指令时使用的唯一模块实例。 */
    public static readonly instance = new VipController();
    /** 共享认证通道，场景卸载后解除注入。 */
    private operations: AccountOperations | null = null;
    /** 使用应用共用的通用奖励反馈，按既有回执身份去重。 */
    private rewards: Pick<RewardBinding, "restore"> | null = null;
    /** 领取请求在途时为 true，成功、失败或换号时清除。 */
    private pending = false;

    /** 注入认证通道和奖励展示。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restore">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 当前是否正在领取，供界面控制按钮响应。 */
    public get busy(): boolean {
        return this.pending;
    }

    /** 发送一次领取，等待原服务端操作回包。资产和进度由统一快照提交。 */
    public claim(taskId: number): void {
        if (!this.operations || this.pending) {
            return;
        }
        this.pending = true;
        this.emit(VipModel.Updated, undefined);
        this.operations.send(this, Protocol.VIP_CLAIM, { taskId }, error => {
            this.pending = false;
            this.emit(VipModel.Updated, undefined);
            UIManager.instance.toast(ErrorUtils.messageOf(error));
        }, receipt => {
            if ((receipt as { taskId: number }).taskId !== taskId) {
                throw new Error("VIP 任务回包与当前操作不符");
            }
        });
    }

    /** 登录、重连和资产推送提交任务。领取回包复用同一笔奖励展示。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED: {
                const snapshot = ProtocolStateUtils.statePayload(protocol, payload);
                if (VipModel.instance.update((snapshot.vip as VipState | undefined) ?? null)) {
                    this.emit(VipModel.Updated, undefined);
                }
                break;
            }
            case Protocol.VIP_CLAIM:
                this.pending = false;
                this.rewards?.restore((payload as { notice: RewardNotice }).notice);
                this.emit(VipModel.Updated, undefined);
                break;
        }
    }

    /** 登记快照及领取回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [...STATE_PROTOCOLS, Protocol.VIP_CLAIM]));
    }

    /** 由应用统一清除旧角色的数据和在途状态。 */
    protected onResetSession(): void {
        this.pending = false;
        VipModel.instance.reset();
    }

    /** 场景结束时解除共享服务引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }
}
