/** 阵容保存进度Model：只保存请求、回执等待和提示；权威阵容仍唯一保存在HeroRosterModel。 */
import { BaseModel } from "../../framework/BaseModel";
import type { FormationSaveRequest } from "./data/FormationData";

/** 过程状态不是服务器资产，不含View或草稿。 */
export interface FormationSaveState {
    /** 正在发送或等待权威状态时为true。 */
    readonly busy: boolean;
    /** 结果未确认的完整请求，关窗后保留，换号清空。 */
    readonly pending: FormationSaveRequest | null;
    /** 已收到成功回执，等待统一快照达到的阵容版本。 */
    readonly acknowledged: number | null;
    /** 本次保存成功回执的请求编号；busy为false且acknowledged为空时表示权威阵容也已确认。新请求或失败清空。 */
    readonly confirmedRequestId?: string;
    /** 保存、重试或拒绝原因，供页面读取。 */
    readonly message: string;
}

export class FormationSaveModel extends BaseModel {
    /** 应用唯一保存进度，独立于窗口生命周期。 */
    public static readonly instance = new FormationSaveModel();
    /** 当前过程状态；角色重置时整体清空。 */
    private state: FormationSaveState = Object.freeze({ busy: false, pending: null, acknowledged: null, message: "" });

    /** 读取冻结状态；不复制服务器阵容。 */
    public get snapshot(): FormationSaveState { return this.state; }

    /** Controller提交过程状态；冻结请求参数，保证重试不被页面修改。 */
    public replace(state: FormationSaveState): void {
        const pending = state.pending ? Object.freeze({ ...state.pending,
            slots: Object.freeze(state.pending.slots.map(slot => Object.freeze({ ...slot }))) }) : null;
        this.state = Object.freeze({ ...state, pending });
        this.incrementVersion();
    }

    /** 角色变化或应用销毁时丢弃旧请求，页面关闭不调用。 */
    protected onReset(): void {
        this.state = Object.freeze({ busy: false, pending: null, acknowledged: null, message: "" });
    }
}
