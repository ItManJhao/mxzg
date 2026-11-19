/** 只读试战控制器：发送关卡意图，将本次请求的回包交给结果 Model，不持有账号或View。 */
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattlePreviewModel, BattlePreviewResult } from "./BattlePreviewModel";

export class BattlePreviewController {
    /** 使用账号通道发送试战请求，应用退出时解除本控制器的回包登记。 */
    constructor(private readonly operations: Pick<AccountOperations, "deliver">) {}
    /** 最近一次已验证结果，不写入HeroRosterModel。 */
    private readonly model = new BattlePreviewModel();
    /** 正在请求的关卡编号；空闲时为 null，同一时刻只允许一次试战。 */
    private mission: number | null = null;
    /** 本控制器拥有的协议登记，应用销毁时解除。 */
    private readonly unregister = ProtocolRouter.instance.register(this, [Protocol.BATTLE_PREVIEW]);

    /** 请求指定关卡的只读战报并接收结果，退出或销毁导致未交付时返回 null。 */
    public async preview(mission: number): Promise<BattlePreviewResult | null> {
        if (this.mission !== null) {
            throw new Error("试战正在准备，请稍候");
        }
        if (!Number.isInteger(mission) || mission <= 0 || mission > 0xffffffff) {
            throw new Error("试战关卡无效");
        }
        this.mission = mission;
        this.model.result = null;
        try {
            await this.operations.deliver(Protocol.BATTLE_PREVIEW, { mission }, frame => {
                if (this.mission === mission) {
                    ProtocolRouter.instance.dispatch(this, frame);
                }
            }, error => {
                throw error;
            });
            return this.model.result;
        } finally {
            this.mission = null;
        }
    }

    /** 只接收试战协议；完整回包和战报校验通过后一次性提交Model。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        if (protocol !== Protocol.BATTLE_PREVIEW || this.mission === null) {
            throw new Error("没有匹配的试战请求");
        }
        this.model.applyResponse(this.mission, value);
    }

    /** 应用关闭解除协议登记及结果引用。 */
    public dispose(): void {
        this.unregister();
        this.mission = null;
        this.model.result = null;
    }
}
