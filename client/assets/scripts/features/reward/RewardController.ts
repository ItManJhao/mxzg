/**
 * 通用发奖反馈控制器：接纳实时通知和已确认的历史回执，向唯一 Model 提交奖励和快照版本。
 * Model 更新后通知展示端；实际开窗、关闭及重试由 RewardBinding 负责。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountController } from "../account/AccountController";
import type { RewardNotice } from "./data/RewardNoticeData";
import type { RewardModel } from "./RewardModel";

export class RewardController extends BaseController {
    /**
     * @param model 本应用唯一反馈队列，协议与展示共用回执记录。
     * @param account 用当前角色校验实时发奖通知的归属。
     */
    public constructor(
        private readonly model: RewardModel,
        private readonly account: Pick<AccountController, "requireRoleOwner">,
    ) {
        super();
    }

    /** 只登记真实通用发奖事件，初始化不会查询库存或补造通知。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.REWARD_GRANTED]));
    }

    /** 接收真实发奖事件，通过账号层确认归属，再交给本控制器的协议入口。 */
    public receive(frame: GameFrame): void {
        if (!this.isInitialized) {
            return;
        }
        if (frame.name !== Protocol.REWARD_GRANTED || frame.kind !== "event") {
            throw new Error("非通用发奖事件");
        }
        this.account.requireRoleOwner((frame.body as Partial<RewardNotice> | null)?.roleId);
        ProtocolRouter.instance.dispatch(this, frame);
    }

    /** 按真实消息标识分流；未登记消息不更新反馈队列。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.REWARD_GRANTED:
                this.restore(value);
                break;
            default:
                GameLog.shared.warnOnce("MODULE", "RewardController", "UNHANDLED_PROTOCOL:" + protocol,
                    "奖励反馈未登记协议：" + protocol + "；已忽略，未更新数据");
                break;
        }
    }

    /**
     * 应用已验证历史业务回执与原意图匹配后恢复反馈，与实时通知共用格式校验和编号去重。
     * @returns true表示本次首次接纳；false表示同内容通知已接纳，不会重复展示。
     */
    public restore(value: unknown): boolean {
        if (!this.isInitialized) {
            throw new Error("奖励反馈控制器尚未初始化");
        }
        const accepted = this.model.accept(value);
        if (accepted) {
            this.model.notify();
        }
        return accepted;
    }

    /** 应用提交完整快照后交付版本；通知先到时等待此版本，不用通知摘要修改资产。 */
    public observeRevision(revision: number): void {
        if (this.model.observeRevision(revision)) {
            this.model.notify();
        }
    }

    /** 主城宿主出现后设为true；暂时不可用时保留全部批次，等下次可用再继续。 */
    public setReady(ready: boolean): void {
        if (this.model.setReady(ready)) {
            this.model.notify();
        }
    }

    /** 显式重试失败反馈；只展示原结果，不联网、不重新创建发奖请求。 */
    public retry(): void {
        if (this.model.retry()) {
            this.model.notify();
        }
    }

    /** 应用重置时清空原队列、去重记录和展示许可，通知订阅者。 */
    protected onResetSession(): void {
        if (this.isInitialized) {
            this.model.reset();
        } else {
            this.model.dispose();
        }
        this.model.notify();
    }
}
