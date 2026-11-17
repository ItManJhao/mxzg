/**
 * 挂机领取原请求的持久格式和数据库边界；由应用按已认证区服和角色取得操作口。
 * 原数据库名、表和稳定实例标识保持不变，事务与迟到清理由通用持久日志复用；不保存凭证或资产。
 */
import type { IdleClaimJournalPort, IdleClaimPending } from "../../features/battle/data/MainChapterIdleClaimData";
import { PersistentOperationJournal } from "../../framework/PersistentOperationJournal";

export class IdleClaimJournal {
    /** 应用持有的原数据库连接及事务，销毁只关闭本实例、不删除已提交意图。 */
    private readonly journal: PersistentOperationJournal<IdleClaimPending>;

    /** 延用原数据库及版本；测试可注入同一原生存储能力，不降级为内存。 */
    public constructor(namespace: string, factory?: IDBFactory) {
        this.journal = new PersistentOperationJournal("mxzg.remake.idle-claims.v1." + namespace,
            IdleClaimJournal.validatePending,
            (current, expected) => current.schemaVersion === expected.schemaVersion
                && current.requestId === expected.requestId
                && current.expectedOperationVersion === expected.expectedOperationVersion,
            factory);
    }

    /** 为已认证区服/角色读取原意图；稳定实例ID仍由原数据库meta/client原子取得。 */
    public forRole(serverId: string, roleId: string): Promise<IdleClaimJournalPort> {
        return this.journal.forScope([serverId, roleId]);
    }

    /** 关闭本实例连接和在途事务，保留原角色的持久意图供下次认证恢复。 */
    public dispose(): void {
        this.journal.dispose();
    }

    /** 严格检查并冻结原字段；损坏记录保留并拒绝，不能静默清空或重造请求。 */
    private static validatePending(value: unknown): IdleClaimPending {
        const record = value as Record<string, unknown> | null;
        if (!record || typeof record !== "object" || Array.isArray(record) || record.schemaVersion !== 1
            || Object.keys(record).sort().join(",") !== "expectedOperationVersion,requestId,schemaVersion"
            || typeof record.requestId !== "string"
            || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(record.requestId)
            || typeof record.expectedOperationVersion !== "number"
            || !Number.isSafeInteger(record.expectedOperationVersion) || record.expectedOperationVersion <= 0) {
            throw new Error("挂机待确认记录损坏或格式未支持，已停止恢复");
        }
        return Object.freeze({ schemaVersion: 1, requestId: record.requestId,
            expectedOperationVersion: record.expectedOperationVersion });
    }
}
