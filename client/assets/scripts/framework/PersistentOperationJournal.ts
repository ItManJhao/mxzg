/**
 * 原操作的通用持久日志：应用传入隔离数据库名、身份键和业务格式校验，不保存凭证或资产。
 * 使用IndexedDB事务在多标签页间原子保留原意图、条件清理；不可用时拒绝新操作，不降级为内存日志。
 */
/** 一种原操作的不可变持久口；create不覆盖已有意图，clear仅删除完全匹配的原记录。 */
export interface OperationJournalPort<T> {
    /** 读取原意图，记录损坏时明确拒绝而不删除。 */
    read(): Promise<T | null>;
    /** 原子取得已有意图或保存候选，跨标签页只保留一个。 */
    create(candidate: T): Promise<T>;
    /** 比较原字段后删除，旧确认不能清除后来意图。 */
    clear(expected: T): Promise<boolean>;
}

/** 应用持有的持久日志；登出不删除记录，销毁只关闭本实例连接。 */
export class PersistentOperationJournal<T> {
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
     * 创建日志但暂不打开数据库；数据库名只接受应用明确隔离的正常空间或独立测试run。
     * @param factory 测试可注入原生存储实例；未提供时使用当前平台IndexedDB。
     */
    public constructor(
        databaseName: string,
        /** 业务严格解析并冻结原记录；损坏或额外字段必须拒绝，不能悄悄丢失意图。 */
        private readonly validate: (value: unknown) => T,
        /** 核对原记录的全部业务字段，用于条件删除，不使用引用相等。 */
        private readonly matches: (current: T, expected: T) => boolean,
        factory?: IDBFactory,
    ) {
        if (!/^mxzg\.remake\.[a-z-]+\.v1\.(default|isolated:[a-f0-9-]{32,36})$/.test(databaseName)) {
            throw new Error("操作日志数据库名无效");
        }
        this.databaseName = databaseName;
        this.factory = factory ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
    }

    /**
     * 为应用给定的已认证身份键创建不可变操作口；同一浏览器空间原子取得同一稳定实例标识。
     * 不缓存角色状态，身份键不传入业务Controller；任何存储故障均拒绝Promise。
     */
    public async forScope(identity: readonly string[]): Promise<OperationJournalPort<T>> {
        if (!Array.isArray(identity) || !identity.length) {
            throw new Error("操作日志身份键为空");
        }
        identity.forEach(value => PersistentOperationJournal.validateIdentity(value));
        const clientId = await this.transaction<string>("meta", "readwrite", (store, result, guard) => {
            const read = store.get("client");
            read.onsuccess = guard(() => {
                if (read.result === undefined) {
                    const value = PersistentOperationJournal.createId();
                    store.add({ schemaVersion: 1, clientId: value }, "client");
                    result(value);
                    return;
                }
                const value = read.result as Record<string, unknown> | null;
                if (!value || typeof value !== "object" || Array.isArray(value)
                    || value.schemaVersion !== 1 || !PersistentOperationJournal.isUuid(value.clientId)
                    || Object.keys(value).sort().join(",") !== "clientId,schemaVersion") {
                    throw new Error("操作日志稳定实例记录损坏，已停止恢复");
                }
                result(value.clientId as string);
            });
        });
        const key: IDBValidKey = [...identity, clientId];
        return Object.freeze({
            read: () => this.read(key),
            create: (request: T) => this.create(key, request),
            clear: (request: T) => this.clear(key, request),
        });
    }

    /** 关闭本实例连接并中止在途事务；不删除任何已提交的待确认意图。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.rejectOpening?.(new Error("操作日志已关闭"));
        this.stopTransactions();
        this.database?.close();
        this.database = null;
    }

    /** 从应用身份固定键读取原请求；损坏记录拒绝恢复且保留原内容。 */
    private read(key: IDBValidKey): Promise<T | null> {
        return this.transaction("pending", "readonly", (store, result, guard) => {
            const read = store.get(key);
            read.onsuccess = guard(() => result(read.result === undefined ? null : this.validate(read.result)));
        });
    }

    /** 原子保存新意图；其他标签页已存在的意图优先，不能被新请求覆盖。 */
    private create(key: IDBValidKey, request: T): Promise<T> {
        const candidate = this.validate(request);
        return this.transaction("pending", "readwrite", (store, result, guard) => {
            const read = store.get(key);
            read.onsuccess = guard(() => {
                if (read.result !== undefined) {
                    result(this.validate(read.result));
                    return;
                }
                store.add(candidate, key);
                result(candidate);
            });
        });
    }

    /** 同一事务内核对原请求全部字段再删除，旧A确认不能清掉后来B。 */
    private clear(key: IDBValidKey, request: T): Promise<boolean> {
        const expected = this.validate(request);
        return this.transaction("pending", "readwrite", (store, result, guard) => {
            const read = store.get(key);
            read.onsuccess = guard(() => {
                if (read.result === undefined) {
                    result(false);
                    return;
                }
                const current = this.validate(read.result);
                const matches = this.matches(current, expected);
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
            throw new Error("操作日志连接已失效");
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
                    reject(new Error("操作日志事务未返回结果"));
                }
            };
            transaction.onabort = () => {
                this.transactions.delete(transaction);
                reject(failure || transaction.error || new Error("操作日志事务已中止"));
            };
            transaction.onerror = event => {
                const target = event.target as IDBRequest | null;
                failure = failure || target?.error || transaction.error || new Error("操作日志读写失败");
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
            return Promise.reject(new Error("操作日志已关闭"));
        }
        if (this.database) {
            return Promise.resolve(this.database);
        }
        if (this.opening) {
            return this.opening;
        }
        const factory = this.factory;
        if (!factory) {
            return Promise.reject(new Error("当前平台不支持持久操作日志，操作恢复已停止"));
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
                fail(error instanceof Error ? error : new Error("操作日志无法打开"));
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
                    fail(error instanceof Error ? error : new Error("操作日志结构初始化失败"));
                    request.transaction?.abort();
                }
            };
            request.onerror = () => fail(request.error || new Error("操作日志打开失败"));
            request.onblocked = () => fail(new Error("操作日志升级被其他窗口阻塞，已停止恢复"));
            request.onsuccess = () => {
                const database = request.result;
                if (settled || this.disposed) {
                    database.close();
                    fail(new Error("操作日志已关闭"));
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
            throw new Error("操作日志身份无效");
        }
    }

    /** 业务和稳定实例标识均使用完整UUID，不能以普通临时字符串代替。 */
    public static isUuid(value: unknown): value is string {
        return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
    }

    /** 持久实例和业务原意图共用安全随机UUID；无可靠随机源即拒绝写入。 */
    public static createId(): string {
        if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
            throw new Error("当前平台缺少安全随机源，操作日志实例不能初始化");
        }
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
    }
}
