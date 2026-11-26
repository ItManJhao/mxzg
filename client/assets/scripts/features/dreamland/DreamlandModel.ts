/** 永恒梦境当前角色的权威进度和冻结原战报。控制器提交快照，页面只读取展示。 */
import { BaseModel } from "../../framework/BaseModel";
import type { DreamlandStateData } from "../../platform/Protocol";

export class DreamlandModel extends BaseModel {
    /** 同一个应用和账号会话内的唯一梦境进度。 */
    public static readonly instance = new DreamlandModel();

    /** 原子保存最近一次服务器确认的进度与播放数据。 */
    private current: Readonly<{ state: DreamlandStateData; replay: Uint8Array | null }> | null = null;

    /** 未连接、未查询或换号时为空；查询结果同时携带可恢复的播放数据。 */
    public get snapshot(): typeof this.current {
        return this.current;
    }

    /** 提交已核验的完整状态，避免重连补读覆盖更高版本。 */
    public commit(state: DreamlandStateData, replay: Uint8Array | null): void {
        if (this.current && state.version < this.current.state.version) {
            return;
        }
        this.current = Object.freeze({ state, replay });
        this.incrementVersion();
    }

    /** 账号变化时丢弃旧角色的状态与战报。 */
    protected onReset(): void {
        this.current = null;
    }
}
