/**
 * 主线里程碑原领取意图的持久格式；只保存稳定rewardId，原成功结果仍由服务端回执提供。
 * 应用按认证身份激活，事务、跨标签页原子创建和销毁清理复用通用日志，不另存资产或凭证。
 */
import { PersistentOperationJournal } from "../../framework/PersistentOperationJournal";
import type { OperationJournalPort } from "../../framework/PersistentOperationJournal";

/** 一项尚未完成通用反馈的原稳定领取意图，登录恢复不能换成下一个目标。 */
export interface MilestoneClaimPending {
    /** 固定格式1，未知格式保留并拒绝。 */
    readonly schemaVersion: 1;
    /** 原chapterextrareward配置ID，不使用临时请求编号。 */
    readonly rewardId: number;
}

export class MilestoneClaimJournal {
    /** 本应用的原日志连接，销毁关闭连接但保留已提交意图。 */
    private readonly journal: PersistentOperationJournal<MilestoneClaimPending>;

    /** 延迟打开独立命名空间，不与挂机原数据库或日常测试角色串用。 */
    public constructor(namespace: string, factory?: IDBFactory) {
        this.journal = new PersistentOperationJournal("mxzg.remake.milestone-claims.v1." + namespace,
            MilestoneClaimJournal.validate,
            (current, expected) => current.schemaVersion === expected.schemaVersion
                && current.rewardId === expected.rewardId,
            factory);
    }

    /** 身份键仅由应用传入，不向模块Controller暴露或比较账号键。 */
    public forRole(serverId: string, roleId: string): Promise<OperationJournalPort<MilestoneClaimPending>> {
        return this.journal.forScope([serverId, roleId]);
    }

    /** 应用销毁时撤销在途事务，不删除旧角色的原意图。 */
    public dispose(): void {
        this.journal.dispose();
    }

    /** 严格复制冻结稳定业务键；额外字段与损坏内容拒绝，不静默降级或删除。 */
    private static validate(value: unknown): MilestoneClaimPending {
        const record = value as Record<string, unknown> | null;
        if (!record || typeof record !== "object" || Array.isArray(record)
            || record.schemaVersion !== 1 || Object.keys(record).sort().join(",") !== "rewardId,schemaVersion"
            || typeof record.rewardId !== "number" || !Number.isSafeInteger(record.rewardId)
            || record.rewardId <= 0 || record.rewardId > 0xffffffff) {
            throw new Error("主线通关奖励原意图损坏或格式未支持，已停止恢复");
        }
        return Object.freeze({ schemaVersion: 1, rewardId: record.rewardId });
    }
}
