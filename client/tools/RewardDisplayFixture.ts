/**
 * 通信和队列专项共用的奖励展示夹具。只替换实际窗口和飘字，
 * 开窗顺序、回执去重、失败及迟到关闭全部执行生产 RewardBinding 代码。
 */
import { RewardBinding } from "../assets/scripts/features/reward/RewardBinding";
import type { RewardArgs } from "../assets/scripts/features/reward/data/RewardData";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";

export class RewardDisplayFixture extends RewardBinding {
    /** 协议专项可单独投递已校验的真实信封。 */
    public readonly receiver = this.controller;
    /** 供断言读取生产队列进度。 */
    public readonly queue = this.model;
    /** 案例控制窗口成功关闭、挂起或打开失败。 */
    public popup: (args: RewardArgs) => Promise<void> = async () => {};
    /** 案例收集实际投递到飘字的批次。 */
    public tips: (notice: RewardNotice) => void = () => {};

    /** 交付窗口参数，原队列等待用例完成这次展示。 */
    protected showPopup(args: RewardArgs): Promise<void> {
        return this.popup(args);
    }

    /** 交付飘字内容，队列按实际展示顺序继续。 */
    protected showTips(notice: RewardNotice): void {
        this.tips(notice);
    }
}
