/** 角色协议控制器：按统一快照更新唯一AccountModel中的角色及冒险点，不处理登录或签发凭证。 */
import { GameLog } from "../../core/GameLog";
import { AccountApi } from "./AccountApi";
import type { RoleProfile } from "./AccountModel";
import type { ProtocolName } from "../../platform/Protocol";
import { Protocol } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";

export class RoleController {
    /** 模块的协议登记，销毁应用时释放。 */
    private readonly stop: () => void;

    /** 应用注入唯一角色提交口，Controller 不复制 Model。 */
    constructor(private readonly accept: (role: RoleProfile) => void) {
        this.stop = ProtocolRouter.instance.register(this, STATE_PROTOCOLS);
    }

    /** 登录初始化、恢复和资产变化均走明确的角色处理函数。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onRoleState(protocol, data);
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
        this.accept(AccountApi.readSnapshotRole(ProtocolStateUtils.statePayload(protocol, data)));
    }

    /** 应用销毁时解除登记，关闭页面不调用。 */
    dispose(): void {
        this.stop();
    }
}
