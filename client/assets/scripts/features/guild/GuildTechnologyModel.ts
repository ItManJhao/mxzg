/**
 * 公会科技的唯一客户端快照。由 Controller 提交整棵服务端科技树，
 * 钱包和贡献仍由现有统一角色及背包模型负责。
 */
import { BaseModel } from "../../framework/BaseModel";
import type { GuildTechnologyState } from "../../platform/Protocol";

export class GuildTechnologyModel extends BaseModel {
    /** 当前登录角色的个人公会科技模型。 */
    public static readonly instance = new GuildTechnologyModel();

    /** 最近一次服务端确认的整树，退出账号时清空。 */
    private snapshot: GuildTechnologyState | null = null;

    /** 开窗未收到合法服务端状态时没有报价和科技进度。 */
    public get state(): GuildTechnologyState | null {
        return this.snapshot;
    }

    /** 验证四职业六格和报价范围，再按独立科技版本提交。 */
    public commit(state: GuildTechnologyState): void {
        if (state.version < 0 || state.maxStage < 1 || state.stageGap < 0 || state.resetDiamonds <= 0
            || state.branches.length !== 4 || state.branches.some((branch, index) => {
                const { stage, step, next } = branch;
                const expectedStage = step === 6 ? stage + 1 : stage;
                const expectedSlot = step === 6 ? 1 : step + 1;
                return branch.profession !== index + 1 || stage < 1 || stage > state.maxStage
                    || step > 6 || (step === 0 && stage !== 1) || branch.refundGold < 0 || branch.refundMedals < 0
                    || (next ? next.stage !== expectedStage || next.slot !== expectedSlot || next.stage > state.maxStage
                        || next.gold <= 0 || next.medals <= 0 : stage !== state.maxStage || step !== 6)
                    || branch.nodes.length !== 6 || branch.nodes.some((node, slot) => node.slot !== slot + 1
                        || node.attributeId < 1 || node.increment <= 0 || node.level !== stage - (slot < step ? 0 : 1)
                        || node.total !== node.increment * node.level);
            })) {
            throw new Error("公会科技回包不完整");
        }
        if (!this.snapshot || this.snapshot.version <= state.version) {
            this.snapshot = Object.freeze(state);
            this.incrementVersion();
        }
    }

    /** 帐号切换后原成员资格、报价和进度全部失效。 */
    protected onReset(): void {
        this.snapshot = null;
    }
}
