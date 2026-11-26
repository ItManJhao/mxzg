/** 永恒梦境当前角色的权威进度和冻结原战报。控制器提交快照，页面只读取展示。 */
import { BaseModel } from "../../framework/BaseModel";
import type { DreamlandAssistanceData, DreamlandRankingData, DreamlandStateData } from "../../platform/Protocol";

export class DreamlandModel extends BaseModel {
    /** 同一个应用和账号会话内的唯一梦境进度。 */
    public static readonly instance = new DreamlandModel();

    /** 原子保存最近一次服务器确认的进度与播放数据。 */
    private current: Readonly<{ state: DreamlandStateData; replay: Uint8Array | null }> | null = null;
    /** 最近一次同服排行查询，换号时清空。 */
    public ranking: DreamlandRankingData | null = null;
    /** 当日好友支援查询；查到更新的期次或版本时整体替换。 */
    private currentAssistance: DreamlandAssistanceData | null = null;

    /** 未连接、未查询或换号时为空；查询结果同时携带可恢复的播放数据。 */
    public get snapshot(): typeof this.current {
        return this.current;
    }

    /** 当前已读取的日内助战状态，没有打开过窗口时为空。 */
    public get assistance(): DreamlandAssistanceData | null {
        return this.currentAssistance;
    }

    /** 保留同一天的最高版本，迟到的查询不会覆盖本次派遣或借用。 */
    public commitAssistance(snapshot: DreamlandAssistanceData): void {
        if (this.currentAssistance && (snapshot.resetAtSeconds < this.currentAssistance.resetAtSeconds
            || (snapshot.resetAtSeconds === this.currentAssistance.resetAtSeconds
                && snapshot.version < this.currentAssistance.version))) {
            return;
        }
        this.currentAssistance = snapshot;
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
        this.ranking = null;
        this.currentAssistance = null;
    }
}
