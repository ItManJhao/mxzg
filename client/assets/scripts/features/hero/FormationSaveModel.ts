/** 阵容保存按钮状态。服务端的阵容本身统一保存在英雄名册。 */
import { BaseModel } from "../../framework/BaseModel";

export interface FormationSaveState {
    /** 等待回包或服务端阵容推送时禁用确认。 */
    readonly busy: boolean;
    /** 服务端回包确认的阵容版本，发送新请求或失败时清空。 */
    readonly savedVersion: number | null;
}

export class FormationSaveModel extends BaseModel {
    /** 应用唯一的阵容保存进度。 */
    public static readonly instance = new FormationSaveModel();
    /** 当前保存进度，换号时清空。 */
    private state: FormationSaveState = Object.freeze({ busy: false, savedVersion: null });

    /** 返回当前只读保存进度。 */
    public get snapshot(): FormationSaveState {
        return this.state;
    }

    /** 提交按钮状态和服务端回包版本，更新本地通知序号。 */
    public replace(state: FormationSaveState): void {
        this.state = Object.freeze({ ...state });
        this.incrementVersion();
    }

    /** 切换角色后清空旧按钮状态。 */
    protected onReset(): void {
        this.state = Object.freeze({ busy: false, savedVersion: null });
    }
}
