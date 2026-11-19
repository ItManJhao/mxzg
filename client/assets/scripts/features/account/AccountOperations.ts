/** 共用账号认证通道，发送当前角色的游戏请求并隔离旧会话回包。 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import type { GameSocketClient } from "../../platform/GameSocketClient";
import type { AuthenticatedGameProtocol } from "../../platform/Protocol";
import { ProtocolRouter, type ProtocolReceiver } from "../../platform/ProtocolRouter";
import type { AccountController } from "./AccountController";

export class AccountOperations {
    /**
     * @param service 当前应用的账号服务，负责身份有效性。
     * @param socket 当前应用的游戏连接。
     */
    public constructor(
        private readonly service: AccountController,
        private readonly socket: GameSocketClient,
    ) {
    }

    /** 单次认证请求直接返回真实信封；服务端拒绝交由当前操作处理。 */
    public request(name: AuthenticatedGameProtocol, body: unknown): Promise<GameFrame> {
        return this.service.authenticated(token => this.socket.requestFrame(token, name, body));
    }

    /**
     * 为本次点击生成请求编号，把匹配的成功回包交给模块 onNotify，失败交给发起模块。
     * @param validate 有额外对应字段的协议可核对本次选择，例如升级的英雄实例。
     */
    public send(
        receiver: ProtocolReceiver,
        name: AuthenticatedGameProtocol,
        fields: object,
        failed: (error: unknown) => void,
        validate?: (receipt: unknown) => void,
    ): void {
        let requestId: string;
        void this.service.deliverAuthenticated(token => {
            requestId = RequestIdUtils.create();
            return this.socket.requestFrame(token, name, { ...fields, requestId });
        }, frame => {
            if ((frame.body as { requestId?: string } | null)?.requestId !== requestId) {
                throw new Error("回包与本次请求不符");
            }
            validate?.(frame.body);
            ProtocolRouter.instance.dispatch(receiver, frame);
        }, failed);
    }

    /** 按协议请求后向原模块交付成功或失败；退出登录即结束此次交付。 */
    public deliver(
        name: AuthenticatedGameProtocol,
        body: unknown,
        received: (frame: GameFrame) => void,
        failed: (error: unknown) => void,
    ): Promise<void> {
        return this.service.deliverAuthenticated(token => this.socket.requestFrame(token, name, body), received, failed);
    }
}
