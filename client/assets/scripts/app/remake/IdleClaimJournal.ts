/**
 * 挂机领取原请求的持久日志：应用按已认证区服、角色绑定，不保存凭证和资产。
 * 使用IndexedDB事务在多标签页间原子保留原意图、条件清理；不可用时拒绝领取，不降级为内存日志。
 */
import type { IdleClaimJournalPort, IdleClaimPending } from "../../features/battle/data/MainChapterIdleClaimData";

/** 应用持有的持久日志；登出不删除记录，销毁只关闭本实例连接。 */
export class IdleClaimJournal {
    /** 当前日志数据库名；独立测试run与日常空间严格分开。 */
    private readonly databaseName: string;
    /** 当前平台原生存储能力；undefined表示不可用，不允许发送新意图。 */
    private readonly factory: IDBFactory | undefined;
    /** 已打开的本实例连接；升级、销毁或打开失败后为null。 */
    private database: IDBDatabase | null = null;
    /** 复用正在打开的连接，失败后释放以便显式恢复。 */
    private opening: Promise<IDBDatabase> | null = null;
    /** 打开尚未返回时的取消入口；销毁后迟到成功仍立即关闭。 */
    private rejectOpening: ((reason: Error) => void) | null = null;
    /** 本实例尚未结束的事务；销毁或版本变化时中止，不能迟到写入。 */
    private readonly transactions = new Set<IDBTransaction>();
    /** true表示应用已销毁，此后不能重新打开连接或使用旧绑定口。 */
    private disposed = false;

    /**
     * 创建日志但暂不打开数据库；namespace只接受正常空间或已核实的独立测试run。
     * @param factory 测试可注入原生存储实例；未提供时使用当前平台IndexedDB。
     */
    public constructor(namespace: string, factory?: IDBFactory) {
        if (namespace !== "default" && !/^isolated:[a-f0-9-]{32,36}$/.test(namespace)) {
            throw new Error("挂机日志命名空间无效");
        }
        this.databaseName = "mxzg.remake.idle-claims.v1." + namespace;
        this.factory = factory ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
    }

    /**
     * 为已认证身份创建不可变操作口；同一浏览器空间原子取得同一稳定实例标识。
     * 不缓存角色状态，身份键不传入业务Controller；任何存储故障均拒绝Promise。
     */
    public async forRole(serverId: string, roleId: string): Promise<IdleClaimJournalPort> {
        IdleClaimJournal.validateIdentity(serverId);
        IdleClaimJournal.validateIdentity(roleId);
        const clientId = await this.transaction<string>("meta", "readwrite", (store, result, guard) => {
            const read = store.get("client");
            read.onsuccess = guard(() => {
                if (read.result === undefined) {
                    const value = IdleClaimJournal.createClientId();
                    store.add({ schemaVersion: 1, clientId: value }, "client");
                    result(value);
                    return;
                }
                const value = read.result as Record<string, unknown> | null;
                if (!value || typeof value !== "object" || Array.isArray(value)
                    || value.schemaVersion !== 1 || !IdleClaimJournal.isUuid(value.clientId)
                    || Object.keys(value).sort().join(",") !== "clientId,schemaVersion") {
                    throw new Error("挂机日志稳定实例记录损坏，已停止恢复");
                }
                result(value.clientId as string);
            });
        });
        const key: IDBValidKey = [serverId, roleId, clientId];
        return Object.freeze({
            read: () => this.read(key),
            create: (request: IdleClaimPending) => this.create(key, request),
            clear: (request: IdleClaimPending) => this.clear(key, request),
        });
    }

    /** 关闭本实例连接并中止在途事务；不删除任何已提交的待确认意图。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.rejectOpening?.(new Error("挂机日志已关闭"));
        this.stopTransactions();
        this.database?.close();
        this.database = null;
    }

    /** 从角色固定键读取原请求；损坏记录拒绝恢复且保留原内容。 */
    private read(key: IDBValidKey): Promise<IdleClaimPending | null> {
        return this.transaction("pending", "readonly", (store, result, guard) => {
            const read = store.get(key);
            read.onsuccess = guard(() => result(read.result === undefined ? null : IdleClaimJournal.validatePending(read.result)));
        });
    }

    /** 原子保存新意图；其他标签页已存在的意图优先，不能被新请求覆盖。 */
    private create(key: IDBValidKey, request: IdleClaimPending): Promise<IdleClaimPending> {
        const candidate = IdleClaimJournal.validatePending(request);
        return this.transaction("pending", "readwrite", (store, result, guard) => {
            const read = store.get(key);
            read.onsuccess = guard(() => {
                if (read.result !== undefined) {
                    result(IdleClaimJournal.validatePending(read.result));
                    return;
                }
                store.add(candidate, key);
                result(candidate);
            });
        });
    }

    /** 同一事务内核对原请求全部字段再删除，旧A确认不能清掉后来B。 */
    private clear(key: IDBValidKey, request: IdleClaimPending): Promise<boolean> {
        const expected = IdleClaimJournal.validatePending(request);
        return this.transaction("pending", "readwrite", (store, result, guard) => {
            const read = store.get(key);
            read.onsuccess = guard(() => {
                if (read.result === undefined) {
                    result(false);
                    return;
                }
                const current = IdleClaimJournal.validatePending(read.result);
                const matches = current.schemaVersion === expected.schemaVersion
                    && current.requestId === expected.requestId
                    && current.expectedOperationVersion === expected.expectedOperationVersion;
                if (matches) {
                    store.delete(key);
                }
                result(matches);
            });
        });
    }

    /**
     * 打开单库单表事务；只有complete后才交付结果，单个请求success不代表已持久化。
     * 事件中的校验异常显式中止事务并保留原因，调用方收到失败，不清理坏记录。
     */
    private async transaction<T>(
        storeName: "meta" | "pending",
        mode: IDBTransactionMode,
        operation: (store: IDBObjectStore, result: (value: T) => void, guard: (action: () => void) => () => void) => void,
    ): Promise<T> {
        const database = await this.open();
        if (this.disposed || this.database !== database) {
            throw new Error("挂机日志连接已失效");
        }
        return new Promise<T>((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            this.transactions.add(transaction);
            let available = false;
            let value: T;
            let failure: unknown;
            transaction.oncomplete = () => {
                this.transactions.delete(transaction);
                if (available) {
                    resolve(value);
                } else {
                    reject(new Error("挂机日志事务未返回结果"));
                }
            };
            transaction.onabort = () => {
                this.transactions.delete(transaction);
                reject(failure || transaction.error || new Error("挂机日志事务已中止"));
            };
            transaction.onerror = event => {
                const target = event.target as IDBRequest | null;
                failure = failure || target?.error || transaction.error || new Error("挂机日志读写失败");
            };
            const guard = (action: () => void) => () => {
                try {
                    action();
                } catch (error) {
                    failure = error;
                    transaction.abort();
                }
            };
            guard(() => operation(transaction.objectStore(storeName), result => {
                value = result;
                available = true;
            }, guard))();
        });
    }

    /** 复用本实例打开请求；阻塞、升级错误或平台不支持时明确拒绝，不回退到内存。 */
    private open(): Promise<IDBDatabase> {
        if (this.disposed) {
            return Promise.reject(new Error("挂机日志已关闭"));
        }
        if (this.database) {
            return Promise.resolve(this.database);
        }
        if (this.opening) {
            return this.opening;
        }
        const factory = this.factory;
        if (!factory) {
            return Promise.reject(new Error("当前平台不支持持久挂机日志，领取恢复已停止"));
        }
        const opening = new Promise<IDBDatabase>((resolve, reject) => {
            let settled = false;
            const fail = (reason: Error) => {
                if (!settled) {
                    settled = true;
                    this.rejectOpening = null;
                    reject(reason);
                }
            };
            this.rejectOpening = fail;
            let request: IDBOpenDBRequest;
            try {
                request = factory.open(this.databaseName, 1);
            } catch (error) {
                fail(error instanceof Error ? error : new Error("挂机日志无法打开"));
                return;
            }
            request.onupgradeneeded = () => {
                if (settled || this.disposed) {
                    request.transaction?.abort();
                    return;
                }
                try {
                    const database = request.result;
                    database.createObjectStore("meta");
                    database.createObjectStore("pending");
                } catch (error) {
                    fail(error instanceof Error ? error : new Error("挂机日志结构初始化失败"));
                    request.transaction?.abort();
                }
            };
            request.onerror = () => fail(request.error || new Error("挂机日志打开失败"));
            request.onblocked = () => fail(new Error("挂机日志升级被其他窗口阻塞，已停止恢复"));
            request.onsuccess = () => {
                const database = request.result;
                if (settled || this.disposed) {
                    database.close();
                    fail(new Error("挂机日志已关闭"));
                    return;
                }
                settled = true;
                this.rejectOpening = null;
                this.database = database;
                database.onversionchange = () => {
                    this.stopTransactions();
                    database.close();
                    if (this.database === database) {
                        this.database = null;
                        this.opening = null;
                    }
                };
                resolve(database);
            };
        });
        this.opening = opening;
        void opening.catch(() => {
            if (this.opening === opening) {
                this.opening = null;
            }
        });
        return opening;
    }

    /** 销毁或数据库升级时停止本实例事务，不干预其他标签页的连接。 */
    private stopTransactions(): void {
        for (const transaction of this.transactions) {
            try {
                transaction.abort();
            } catch {
                // 已完成事务无需再中止，complete/abort仍负责释放集合引用。
            }
        }
    }

    /** 身份只用作数据库键，不允许空值、控制字符或无限长度内容。 */
    private static validateIdentity(value: string): void {
        if (typeof value !== "string" || !value.length || value.length > 160 || /[\x00-\x1f\x7f]/.test(value)) {
            throw new Error("挂机日志身份无效");
        }
    }

    /** 严格检查持久格式并复制冻结；额外字段同样拒绝，避免把凭证或未知未来请求静默降级。 */
    private static validatePending(value: unknown): IdleClaimPending {
        const record = value as Record<string, unknown> | null;
        if (!record || typeof record !== "object" || Array.isArray(record) || record.schemaVersion !== 1
            || Object.keys(record).sort().join(",") !== "expectedOperationVersion,requestId,schemaVersion"
            || !IdleClaimJournal.isUuid(record.requestId)
            || typeof record.expectedOperationVersion !== "number"
            || !Number.isSafeInteger(record.expectedOperationVersion) || record.expectedOperationVersion <= 0) {
            throw new Error("挂机待确认记录损坏或格式未支持，已停止恢复");
        }
        return Object.freeze({ schemaVersion: 1, requestId: record.requestId as string,
            expectedOperationVersion: record.expectedOperationVersion });
    }

    /** 业务和稳定实例标识均使用完整UUID，不能以普通临时字符串代替。 */
    private static isUuid(value: unknown): value is string {
        return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
    }

    /** 用平台安全随机源创建稳定实例UUID；能力不足时拒绝，不使用可能冲突的时间戳。 */
    private static createClientId(): string {
        if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
            throw new Error("当前平台缺少安全随机源，挂机日志实例不能初始化");
        }
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
    }
}
