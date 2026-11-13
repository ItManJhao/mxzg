/**
 * 协议接收者登记与定向分发：按真实回包 name 调用模块 onNotify，不保存资产、不负责鉴权。
 * 请求结果必须先通过网络关联、应用身份检查和模块时效检查，再进入本路由；不全局广播旧回包。
 */
import type { GameFrame } from "./GameProtocolCodecUtils";
import { Protocol } from "./Protocol";
import type { ProtocolName } from "./Protocol";

/** 模块公开的协议处理入口，具体字段在处理函数校验。 */
export interface ProtocolReceiver {
    /** 按协议标识分发数据，更新 Model 后再通知 View。 */
    onNotify(protocol: ProtocolName, data: unknown): void;
}
export class ProtocolRouter {
    /** 应用统一协议路由；界面事件仍使用 EventDispatcher，两者用途不同。 */
    static readonly instance = new ProtocolRouter();
    /** 模块接收者 → 其声明的协议集合，只存登记信息，不缓存回包。 */
    private readonly receivers = new Map<ProtocolReceiver, ReadonlySet<string>>();

    /** 模块初始化时登记所有可处理协议；返回只解除本次登记的函数，销毁时由 BaseController 清理。 */
    register(receiver: ProtocolReceiver, protocols: readonly ProtocolName[]): () => void {
        if (this.receivers.has(receiver)) throw new Error("协议接收者重复登记");
        if (!protocols.length || protocols.some(name => !Protocol.findProtocol(name))) throw new Error("协议未在 Protocol 中定义");
        const names = new Set(protocols);
        this.receivers.set(receiver, names);
        return () => { if (this.receivers.get(receiver) === names) this.receivers.delete(receiver); };
    }

    /** 将已确认有效的成功回包交给指定模块；按真实 name 分发，未知/未登记/失败帧不更新 Model。 */
    dispatch(receiver: ProtocolReceiver, frame: Readonly<GameFrame>): void {
        const definition = Protocol.findProtocol(frame.name);
        if ((frame.kind !== "event" && (frame.kind !== "response" || frame.ok !== true)) || frame.error !== undefined || !definition || !this.receivers.get(receiver)?.has(frame.name)) {
            throw new Error("回包不属于已登记的模块协议");
        }
        receiver.onNotify(definition.name, frame.body);
    }
}
