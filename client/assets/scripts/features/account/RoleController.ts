/** 角色协议控制器负责首次命名与新手赠礼的收发，将角色资料和冒险点写入唯一账号 Model。 */
import { GameLog } from "../../core/GameLog";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { AccountApi } from "./AccountApi";
import type { AccountModel } from "./AccountModel";
import type { AccountOperations } from "./AccountOperations";
import type { AuthenticatedGameProtocol, ProtocolName } from "../../platform/Protocol";
import { Protocol } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import type { RewardBinding } from "../reward/RewardBinding";
import type { RewardNotice } from "../reward/data/RewardNoticeData";

/** 仅通知命名窗口更新随机输入或恢复确认按钮，角色资料仍来自快照。 */
export const RoleNameEvent = {
    Suggested: "role-name:suggested",
    Submitted: "role-name:submitted",
} as const;

/** 新手赠礼回包处理结束，供领取窗口恢复按钮。 */
export const WelcomeGiftFinished = "role-welcome-gift:finished";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        [RoleNameEvent.Suggested]: string | null;
        [RoleNameEvent.Submitted]: void;
        [WelcomeGiftFinished]: void;
    }
}

export class RoleController {
    /** 模块的协议登记，销毁应用时释放。 */
    private readonly stop: () => void;

    /**
     * @param model 应用唯一角色资料来源，保存服务端快照。
     * @param operations 账号提供的认证通道，仅渲染角色快照时可省略。
     * @param rewards 当前应用通用发奖队列，接纳新手赠礼回包中的实际奖励。
     */
    constructor(
        private readonly model: AccountModel,
        private readonly operations?: Pick<AccountOperations, "deliver">,
        private readonly rewards?: Pick<RewardBinding, "restore">,
    ) {
        this.stop = ProtocolRouter.instance.register(this, [
            ...STATE_PROTOCOLS, Protocol.ROLE_NAME_RANDOM, Protocol.ROLE_NAME_SET, Protocol.ROLE_WELCOME_CLAIM,
        ]);
    }

    /** 向当前区服请求一个可用的随机昵称，结果由命名窗口处理。 */
    public randomName(): void {
        this.send(Protocol.ROLE_NAME_RANDOM, {}, () => EventDispatcher.instance.emit(RoleNameEvent.Suggested, null));
    }

    /** 提交玩家确认的第一次命名，顶栏随下一份权威快照刷新。 */
    public setFirstName(nickname: string): void {
        this.send(Protocol.ROLE_NAME_SET, { nickname }, () => EventDispatcher.instance.emit(RoleNameEvent.Submitted, undefined));
    }

    /** 申请领取当前角色的新手赠礼，奖励内容和领取状态由服务端决定。 */
    public claimWelcomeGift(): void {
        this.send(Protocol.ROLE_WELCOME_CLAIM, {}, () => EventDispatcher.instance.emit(WelcomeGiftFinished, undefined));
    }

    /** 通过账号通道交付本次回包，失败时恢复对应窗口按钮并显示原因。 */
    private send(name: AuthenticatedGameProtocol, body: object, onFailure: () => void): void {
        void this.operations?.deliver(name, body, frame => ProtocolRouter.instance.dispatch(this, frame), error => {
            onFailure();
            UIManager.instance.toast(error instanceof Error ? error.message : "操作失败，请重试");
        });
    }

    /** 提交角色快照，或将命名、领取结果交给各自窗口。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onRoleState(protocol, data);
                break;
            case Protocol.ROLE_NAME_RANDOM:
                EventDispatcher.instance.emit(RoleNameEvent.Suggested, (data as { nickname: string }).nickname);
                break;
            case Protocol.ROLE_NAME_SET:
                EventDispatcher.instance.emit(RoleNameEvent.Submitted, undefined);
                break;
            case Protocol.ROLE_WELCOME_CLAIM:
                this.rewards?.restore(data as RewardNotice);
                EventDispatcher.instance.emit(WelcomeGiftFinished, undefined);
                break;
            default:
                // 路由会拒绝非法回包；模块仅忽略不属于自身的通知，不触碰Model。
                GameLog.shared.warnOnce("MODULE", "RoleController", "UNHANDLED_PROTOCOL:" + protocol,
                    "角色未登记协议：" + protocol + "；已忽略，未更新数据");
                return;
        }
    }

    /** 一次提交经过整体校验的角色及独立冒险点，缺失扩展明确覆盖为未同步，账号Model统一通知。 */
    private onRoleState(protocol: ProtocolName, data: unknown): void {
        const role = AccountApi.readSnapshotRole(ProtocolStateUtils.statePayload(protocol, data));
        this.model.replace({ busy: false, role, error: "" });
    }

    /** 应用销毁时解除登记，关闭页面不调用。 */
    dispose(): void {
        this.stop();
    }
}
