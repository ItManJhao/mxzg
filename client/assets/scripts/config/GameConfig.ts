/**
 * 客户端配置唯一存储与查询入口，由启动读取器和完整配置包安装流程写入。
 * 启动表复制隔离，配置包接收解析对象所有权并深冻结；类型索引与路径查询共用同一份表。
 * 分组与整包均校验完成后原子提交，失败、取消或迟到安装保留上次可用快照。
 */
import { CONFIG_SCHEMA, ConfigFileMap, ConfigKeyMap, ConfigName, ConfigRowMap } from "./GConfig";
import { ConfigPackageCancelled, ConfigPackageUtils } from "./ConfigPackageUtils";

interface FieldRule {
    /** 字段允许的 JSON 类型，联合类型使用竖线分隔。 */
    readonly type: string;
    /** true 表示字段必须存在，省略时允许缺少。 */
    readonly required?: boolean;
    /** 对象子字段的规范，键为字段名。 */
    readonly fields?: Readonly<Record<string, FieldRule>>;
    /** 数组内每个元素共同使用的规范。 */
    readonly items?: FieldRule;
}

interface TableRule {
    /** 表的完整运行时路径，包含 config 前缀且没有扩展名。 */
    readonly path: string;
    /** 源 JSON 中保存配置行的字段名。 */
    readonly container: string;
    /** 每行用于建立唯一索引的主键字段。 */
    readonly key: string;
    /** 配置行允许的字段与运行时类型。 */
    readonly fields: Readonly<Record<string, FieldRule>>;
    /** 允许跳过的策划说明行主键，不参与类型化查询。 */
    readonly ignoreKeys?: readonly string[];
}

interface TableData {
    /** 校验并深冻结后的源文件，与按路径查询返回同一引用。 */
    readonly file: unknown;
    /** 已校验的数据行，保留源顺序并排除说明行。 */
    readonly rows: readonly unknown[];
    /** 主键文本到源数据行的只读索引，不复制行对象。 */
    readonly index: Readonly<Record<string, unknown>>;
    /** 过滤说明行之前的源 CRC32，不保留第二份原表。 */
    readonly sourceChecksum: string;
}

/** 请求了尚未完成加载的配置表或路径。 */
export class ConfigUnavailable extends Error {}

/** 必须存在的配置行缺失，调用方不能安全继续。 */
export class ConfigRowMissing extends Error {}

/** 当前加载被新版本请求替代，不再允许提交。 */
export class ConfigVersionSuperseded extends Error {}

export class GameConfig {
    /** 应用共用的唯一配置仓库，import 时不触发读取。 */
    public static readonly instance = new GameConfig();

    /** 已原子提交的类型化表，失败或迟到请求不能写入。 */
    private ready = new Map<ConfigName, TableData>();

    /** 完整路径到只读 JSON 的唯一文件索引，类型化表直接引用 ready 内的 file。 */
    private raw = new Map<string, unknown>();

    /** 已提交文件的源 CRC32，键为完整路径；版本成功切换时整体替换。 */
    private sourceChecksums = new Map<string, string>();

    /** 版本与表名到在途或待重试复用结果的映射，成功提交后清除对应 Promise。 */
    private requests = new Map<string, Promise<TableData>>();

    /** 最近分组加载失败，键为表名；有效旧表仍保持 ready。 */
    private errors = new Map<ConfigName, Error>();

    /** 当前已提交快照版本，只在成功提交时改变。 */
    private version = "initial";

    /** 最新请求的目标版本，作为后续分组加载的默认值。 */
    private requestedVersion = "initial";

    /** 加载代次；请求目标版本改变时递增，拒绝之前的迟到提交。 */
    private generation = 0;

    /** true 表示当前版本已完成整包安装，同版本再次安装可直接复用。 */
    private packageInstalled = false;

    /** 应用注入的启动 JSON 读取器；null 表示尚未装配，不参与整包解码。 */
    private fetch: ((path: string, version: string) => Promise<unknown>) | null;

    /** 注入资源读取能力供启动和独立验证使用；构造不触发加载。 */
    public constructor(fetch?: (path: string, version: string) => Promise<unknown>) {
        this.fetch = fetch || null;
    }

    /** 应用装配启动读取器；禁止更换已装配来源，避免同版本混用文件。 */
    public initialize(fetch: (path: string, version: string) => Promise<unknown>): void {
        if (this.fetch && this.fetch !== fetch) {
            throw new Error("配置读取器已初始化");
        }
        this.fetch = fetch;
    }

    /** 返回当前状态及最近失败；有效旧表与已加载空表都保持 ready。 */
    public status(name: ConfigName): { state: "ready" | "failed" | "unloaded"; error?: Error; version: string } {
        return {
            state: this.ready.has(name) ? "ready" : this.errors.has(name) ? "failed" : "unloaded",
            error: this.errors.get(name),
            version: this.version,
        };
    }

    /**
     * 按组去重读取并原子提交，主要供登录前启动表使用，独立验证仍可加载任意已声明表。
     * 同版本已提交表不会再次读取；失败组内的成功结果可供重试复用，成功后释放请求缓存。
     */
    public async prepare(
        names: readonly ConfigName[],
        progress?: (done: number, total: number) => void,
        version = this.requestedVersion,
    ): Promise<void> {
        if (!this.fetch) {
            throw new Error("配置读取器尚未初始化");
        }
        this.requestVersion(version);
        const generation = this.generation;
        const unique = Array.from(new Set(names));
        let done = 0;
        let accepting = true;
        progress?.(0, unique.length);
        try {
            const entries = await Promise.all(unique.map(async name => {
                const key = version + ":" + name;
                const committed = version === this.version ? this.ready.get(name) : undefined;
                let promise = this.requests.get(key);
                if (!committed && !promise) {
                    const created = Promise.resolve()
                        .then(() => this.fetch!(CONFIG_SCHEMA[name].path, version))
                        .then(value => GameConfig.parse(name, value, true))
                        .catch(error => {
                            if (this.requests.get(key) === created) {
                                this.requests.delete(key);
                            }
                            if (generation === this.generation) {
                                this.errors.set(name, error instanceof Error ? error : new Error(String(error)));
                            }
                            throw error;
                        });
                    promise = created;
                    this.requests.set(key, created);
                }
                const data = committed || await promise!;
                if (accepting && generation === this.generation) {
                    progress?.(++done, unique.length);
                }
                return { name, data, key, promise };
            }));
            this.assertActive(generation);
            if (this.version !== version) {
                this.ready = new Map();
                this.raw = new Map();
                this.sourceChecksums = new Map();
                this.errors.clear();
                this.version = version;
                this.packageInstalled = false;
            }
            for (const { name, data, key, promise } of entries) {
                const path = CONFIG_SCHEMA[name].path;
                // 同版本包可能已在等待期间完整提交，保留包拥有的唯一文件引用。
                const accepted = this.packageInstalled ? this.ready.get(name) || data : data;
                this.ready.set(name, accepted);
                this.raw.set(path, accepted.file);
                this.sourceChecksums.set(path, accepted.sourceChecksum);
                this.errors.delete(name);
                if (promise && this.requests.get(key) === promise) {
                    this.requests.delete(key);
                }
            }
        } finally {
            accepting = false;
        }
    }

    /**
     * 接收已解码的完整配置包并移交所有权，逐表校验、建立索引、深冻结后一次性替换快照。
     * files 使用无扩展名的完整路径且不包含启动表；启动表必须已准备，并由应用核对同源版本。
     * @param version 已校验配置包的内容版本，成功前不改变当前快照版本。
     * @param startupPaths 已校验 manifest 派生的启动表完整路径，仓库不维护另一份启动清单。
     * @param progress 每完成一表报告真实完成数，同版本已安装时直接报告已有完成数。
     * @param active 返回 false 表示所属加载取消，取消及新版本替代均拒绝整包提交。
     */
    public async installPackage(
        version: string,
        files: Readonly<Record<string, unknown>>,
        startupPaths: readonly string[],
        progress?: (done: number, total: number) => void,
        active?: () => boolean,
    ): Promise<void> {
        if (!version.trim()) {
            throw new Error("配置包版本不能为空");
        }
        this.assertActive(this.generation, active);
        this.requestVersion(version);
        const generation = this.generation;
        this.assertActive(generation, active);
        const paths = Object.keys(files);
        progress?.(0, paths.length);
        this.assertActive(generation, active);
        const nextReady = new Map<ConfigName, TableData>();
        const nextRaw = new Map<string, unknown>();
        const nextChecksums = new Map<string, string>();
        const namesByPath = new Map<string, ConfigName>();
        for (const name of Object.keys(CONFIG_SCHEMA) as ConfigName[]) {
            namesByPath.set(CONFIG_SCHEMA[name].path, name);
        }
        const startupSeen = new Set<string>();
        for (const path of startupPaths) {
            GameConfig.validatePackagePath(path);
            if (startupSeen.has(path)) {
                throw new Error(path + "：启动表路径重复");
            }
            startupSeen.add(path);
            const name = namesByPath.get(path);
            if (!name) {
                throw new ConfigUnavailable(path + "：启动表缺少类型规范");
            }
            const data = this.ready.get(name);
            if (!data) {
                throw new ConfigUnavailable(name + "：安装配置包前必须完成启动表加载");
            }
            if (Object.prototype.hasOwnProperty.call(files, path)) {
                throw new Error(path + "：启动表不得重复放入配置包");
            }
            nextReady.set(name, data);
            nextRaw.set(path, data.file);
            nextChecksums.set(path, data.sourceChecksum);
        }
        for (const name of Object.keys(CONFIG_SCHEMA) as ConfigName[]) {
            if (!nextReady.has(name) && !Object.prototype.hasOwnProperty.call(files, CONFIG_SCHEMA[name].path)) {
                throw new ConfigUnavailable(name + "：配置包缺少 " + CONFIG_SCHEMA[name].path);
            }
        }
        for (const path of paths) {
            GameConfig.validatePackagePath(path);
        }
        if (this.packageInstalled && this.version === version) {
            progress?.(paths.length, paths.length);
            this.assertActive(generation, active);
            return;
        }

        let done = 0;
        for (const path of paths) {
            this.assertActive(generation, active);
            const name = namesByPath.get(path);
            if (name) {
                const data = GameConfig.parse(name, files[path], false);
                nextReady.set(name, data);
                nextRaw.set(path, data.file);
                nextChecksums.set(path, data.sourceChecksum);
            } else {
                const file = files[path];
                nextChecksums.set(path, ConfigPackageUtils.sourceChecksum(file));
                GameConfig.freeze(file);
                nextRaw.set(path, file);
            }
            this.assertActive(generation, active);
            progress?.(++done, paths.length);
            this.assertActive(generation, active);
            // 索引建立也可能耗时，逐表归还事件循环让进度与取消得到处理。
            await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        this.assertActive(generation, active);
        // 同版本重入互不取消；另一调用先提交时复用其快照，保持所有查询引用稳定。
        if (this.packageInstalled && this.version === version) {
            return;
        }
        this.ready = nextReady;
        this.raw = nextRaw;
        this.sourceChecksums = nextChecksums;
        this.version = version;
        this.packageInstalled = true;
        this.requests.clear();
        this.errors.clear();
    }

    /** 返回已完整安装的配置包版本；只有启动表或新版本分组加载成功时返回 null。 */
    public getPackageVersion(): string | null {
        return this.packageInstalled ? this.version : null;
    }

    /** 整表返回稳定只读数组；按键缺行返回 undefined，表未加载时明确抛错。 */
    public getConfig<N extends ConfigName>(name: N): readonly ConfigRowMap[N][];
    public getConfig<N extends ConfigName>(name: N, key: ConfigKeyMap[N]): ConfigRowMap[N] | undefined;
    public getConfig<N extends ConfigName>(name: N, key?: ConfigKeyMap[N]): readonly ConfigRowMap[N][] | ConfigRowMap[N] | undefined {
        const data = this.table(name);
        return (key === undefined ? data.rows : data.index[String(key)]) as readonly ConfigRowMap[N][] | ConfigRowMap[N] | undefined;
    }

    /** 必需行缺失时抛出可定位错误，调用方不能以非空断言掩盖配置缺口。 */
    public requireConfig<N extends ConfigName>(name: N, key: ConfigKeyMap[N]): ConfigRowMap[N] {
        const row = this.getConfig(name, key);
        if (!row) {
            throw new ConfigRowMissing(name + "：缺少配置行 " + key);
        }
        return row;
    }

    /** 返回同一只读文件供类型化展示投影使用，不复制也不触发加载。 */
    public getFile<N extends ConfigName>(name: N): ConfigFileMap[N] {
        return this.table(name).file as ConfigFileMap[N];
    }

    /** 按完整运行时路径同步读取唯一已提交文件；不存在时抛错，绝不补发资源请求。 */
    public getFileByPath(path: string): unknown {
        if (!this.raw.has(path)) {
            throw new ConfigUnavailable(path + "：配置尚未加载");
        }
        return this.raw.get(path);
    }

    /** 读取原始源 JSON 的 CRC32；未提交路径返回 undefined，不保留源文件副本。 */
    public getSourceChecksum(path: string): string | undefined {
        return this.sourceChecksums.get(path);
    }

    /** 返回已提交表，未就绪时携带最近失败原因供调用边界报告。 */
    private table(name: ConfigName): TableData {
        const data = this.ready.get(name);
        if (!data) {
            throw new ConfigUnavailable(name + "：" + (this.errors.get(name)?.message || "配置尚未加载"));
        }
        return data;
    }

    /** 切换目标版本并失效旧在途请求；同版本重入共享代次，取消只作用于所属调用。 */
    private requestVersion(version: string): void {
        if (version !== this.requestedVersion) {
            this.requestedVersion = version;
            this.generation++;
            this.requests.clear();
        }
    }

    /** 在异步让帧、进度回调及提交边界拒绝已取消或被新版本替代的安装。 */
    private assertActive(generation: number, active?: () => boolean): void {
        if (generation !== this.generation) {
            throw new ConfigVersionSuperseded("配置版本已切换，拒绝迟到提交");
        }
        if (active && !active()) {
            throw new ConfigPackageCancelled("配置包安装已取消");
        }
    }

    /** 拒绝扩展名、空段与越界路径，保证查询键和资源运行时路径一致。 */
    private static validatePackagePath(path: string): void {
        const parts = path.split("/");
        if (
            parts.length < 2 || parts[0] !== "config" || path.endsWith(".json") ||
            parts.some(part => !part || part === "." || part === ".." || /[\\:]/.test(part))
        ) {
            throw new Error("配置包路径非法：" + path);
        }
    }

    /** 按规范递归验证所有字段，数组和对象不依赖 TypeScript 声明代替运行时校验。 */
    private static validate(value: unknown, rule: FieldRule, at: string): void {
        if (rule.type === "array") {
            if (!Array.isArray(value) || !rule.items) {
                throw new Error(at + "：需要数组及元素规范");
            }
            value.forEach((item, i) => GameConfig.validate(item, rule.items!, at + "[" + i + "]"));
        } else if (rule.type === "object") {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                throw new Error(at + "：需要对象");
            }
            const row = value as Record<string, unknown>;
            const fields = rule.fields || {};
            for (const key of Object.keys(row)) {
                if (!fields[key]) {
                    throw new Error(at + "." + key + "：未声明字段");
                }
            }
            for (const key of Object.keys(fields)) {
                if (!(key in row)) {
                    if (fields[key].required) {
                        throw new Error(at + "." + key + "：缺少必需字段");
                    }
                } else {
                    GameConfig.validate(row[key], fields[key], at + "." + key);
                }
            }
        } else {
            const actual = value === null ? "null" : typeof value;
            if (!rule.type.split("|").includes(actual) || (actual === "number" && !Number.isFinite(value as number))) {
                throw new Error(at + "：需要 " + rule.type + "，实际 " + actual);
            }
        }
    }

    /** 深冻结移交给仓库的 JSON；对象和数组的每个嵌套值都不可再写。 */
    private static freeze(value: unknown): void {
        if (value && typeof value === "object") {
            Object.keys(value).forEach(key => GameConfig.freeze((value as Record<string, unknown>)[key]));
            Object.freeze(value);
        }
    }

    /**
     * 校验容器、字段和唯一主键后建立只读索引；仅排除规范声明的说明行。
     * copyInput 为 true 时隔离启动资源对象；false 时直接接管包对象，避免第二份大表。
     */
    private static parse(name: ConfigName, input: unknown, copyInput: boolean): TableData {
        const rule: TableRule = CONFIG_SCHEMA[name];
        if (!input || typeof input !== "object" || Array.isArray(input)) {
            throw new Error(name + "：配置格式错误");
        }
        const sourceChecksum = ConfigPackageUtils.sourceChecksum(input);
        const file = (copyInput ? JSON.parse(JSON.stringify(input)) : input) as Record<string, unknown>;
        const container = file[rule.container];
        const dictionary = rule.container === "act";
        if (dictionary ? !container || typeof container !== "object" || Array.isArray(container) : !Array.isArray(container)) {
            throw new Error(name + "：配置缺少 " + rule.container);
        }
        const source = dictionary
            ? Object.keys(container as object).map(key => (container as Record<string, unknown>)[key])
            : container as unknown[];
        const rows: unknown[] = [];
        const index: Record<string, unknown> = Object.create(null);
        source.forEach((row, i) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) {
                throw new Error(name + ".rows[" + i + "]：无效行");
            }
            const key = String((row as Record<string, unknown>)[rule.key]);
            if (rule.ignoreKeys?.includes(key)) {
                return;
            }
            GameConfig.validate(row, { type: "object", fields: rule.fields }, name + ".rows[" + i + "]");
            if (Object.prototype.hasOwnProperty.call(index, key)) {
                throw new Error(name + ".rows[" + i + "]：重复主键 " + key);
            }
            index[key] = row;
            rows.push(row);
        });
        if (!dictionary && source.length !== rows.length) {
            file[rule.container] = rows;
        }
        const stableRows = !dictionary && source.length === rows.length ? source : rows;
        GameConfig.freeze(file);
        // 行对象已随 file 深冻结；派生数组与索引只冻结容器，避免反复遍历同一大表。
        Object.freeze(stableRows);
        Object.freeze(index);
        return Object.freeze({ file, rows: stableRows, index, sourceChecksum });
    }
}
