/** 初始化/推送共用载荷边界：只拆协议信封，具体角色和物品由所属模块校验。 */
import { Protocol } from "./Protocol";
import type { ProtocolName } from "./Protocol";
/** 角色和背包共同声明的实际服务端消息，不在客户端伪造子协议。 */
export const STATE_PROTOCOLS = [Protocol.SESSION_LOGIN, Protocol.SESSION_AUTHENTICATE, Protocol.STATE_CHANGED] as const;
/** 无状态协议转换工具；不会持有会话、角色或网络连接。 */
export class ProtocolStateUtils {
    /** 仅通过静态方法使用，禁止创建实例。 */
    private constructor() { }

    /** 取出初始化或提交后同步的状态；拒绝任意其他消息进入资产链。 */
    public static statePayload(protocol: ProtocolName, data: unknown): Record<string, unknown> {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("状态载荷无效");
        }
        let state = data as Record<string, unknown>;
        if (protocol === Protocol.SESSION_LOGIN || protocol === Protocol.SESSION_AUTHENTICATE) {
            state = state.initial as Record<string, unknown>;
        }
        else if (protocol !== Protocol.STATE_CHANGED) {
            throw new Error("不是资产状态协议");
        }
        if (!state || typeof state !== "object" || Array.isArray(state) || !Number.isSafeInteger(state.revision) || Number(state.revision) < 0) {
            throw new Error("状态版本无效");
        }
        return state;
    }
}
