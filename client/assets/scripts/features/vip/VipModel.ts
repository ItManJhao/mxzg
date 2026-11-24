/** 契约任务模块的唯一数据。保存当前角色的权威快照，供 VIP 页面和底栏红点读取。 */
import { BaseModel } from "../../framework/BaseModel";
import type { VipState } from "./data/VipData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "vip.updated": undefined;
    }
}

export class VipModel extends BaseModel {
    /** 由应用装配的当前角色数据入口。 */
    public static readonly instance = new VipModel();
    /** 当前快照或领奖进度变化后通知本模块界面。 */
    public static readonly Updated = "vip.updated";
    /** 最近接纳的 VIP 快照，登出和旧版服务未提供时为空。 */
    private value: VipState | null = null;

    /** 返回只读 VIP 等级及本档任务。 */
    public get state(): VipState | null {
        return this.value;
    }

    /** 保存统一快照中的 VIP 状态，等值更新不触发任务列表重画。 */
    public update(value: VipState | null): boolean {
        if (value === this.value || (value && this.value?.level === value.level
            && this.value.tasks.length === value.tasks.length && this.value.tasks.every((previous, index) => {
                const task = value.tasks[index];
                return task.id === previous.id && task.progress === previous.progress
                    && task.target === previous.target && task.claimed === previous.claimed;
            }))) {
            return false;
        }
        this.value = value && Object.freeze({ level: value.level,
            tasks: Object.freeze(value.tasks.map(task => Object.freeze({ ...task }))) });
        this.incrementVersion();
        return true;
    }

    /** 账号重置时清空旧状态。 */
    protected onReset(): void {
        this.value = null;
    }
}
