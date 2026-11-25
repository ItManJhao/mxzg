/** 每日、活跃度和成就的唯一客户端快照。由任务控制器提交，供界面和红点读取。 */
import type { QuestCompletion, QuestSnapshot } from "./data/QuestState";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "quest.updated": undefined;
        "quest.completed": readonly QuestCompletion[];
    }
}

export class QuestModel {
    /** 应用内唯一任务快照，供多处窗口共享。 */
    public static readonly instance = new QuestModel();

    /** 最近一次校验成功的完整快照，未加载或换号时为 null。 */
    private state: QuestSnapshot | null = null;

    /** 返回当前任务快照，页面重新打开可直接读取。 */
    public get snapshot(): QuestSnapshot | null {
        return this.state;
    }

    /** 一次替换整份角色任务快照，调用者负责发布事件。 */
    public update(snapshot: QuestSnapshot | null): void {
        this.state = snapshot;
    }
}
