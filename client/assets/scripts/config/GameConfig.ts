/**
 * 当前客户端配置唯一存储与类型化查询入口。按组解析校验后原子提交，不拥有 UI 或角色状态。
 * 配置深复制并递归冻结；失败保留上次快照。版本切换只在完整新组成功后提交，迟到旧请求不能覆盖新版本。
 */
import { CONFIG_SCHEMA, ConfigFileMap, ConfigKeyMap, ConfigName, ConfigRowMap } from "./GConfig";

interface FieldRule { readonly type: string; readonly required?: boolean; readonly fields?: Readonly<Record<string, FieldRule>>; readonly items?: FieldRule; }
interface TableRule { readonly path: string; readonly container: string; readonly key: string; readonly fields: Readonly<Record<string, FieldRule>>; readonly ignoreKeys?: readonly string[]; }
interface TableData { readonly file: unknown; readonly rows: readonly unknown[]; readonly index: Readonly<Record<string, unknown>>; }
export class ConfigUnavailable extends Error {}
export class ConfigRowMissing extends Error {}
export class ConfigVersionSuperseded extends Error {}

/** 按规范验证所有字段；数组与对象不靠 TypeScript 声明代替运行时校验。 */
function validate(value: unknown, rule: FieldRule, at: string): void {
    if (rule.type === "array") {
        if (!Array.isArray(value) || !rule.items) throw new Error(at + "：需要数组及元素规范");
        value.forEach((item, i) => validate(item, rule.items!, at + "[" + i + "]"));
    } else if (rule.type === "object") {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(at + "：需要对象");
        const row = value as Record<string, unknown>, fields = rule.fields || {};
        for (const key of Object.keys(row)) if (!fields[key]) throw new Error(at + "." + key + "：未声明字段");
        for (const key of Object.keys(fields)) {
            if (!(key in row)) { if (fields[key].required) throw new Error(at + "." + key + "：缺少必需字段"); }
            else validate(row[key], fields[key], at + "." + key);
        }
    } else {
        const actual = value === null ? "null" : typeof value;
        if (!rule.type.split("|").includes(actual) || (actual === "number" && !Number.isFinite(value as number)))
            throw new Error(at + "：需要 " + rule.type + "，实际 " + actual);
    }
}

/** 深冻结新解析的 JSON，内部引用不会暴露为可写对象。 */
function freeze(value: unknown): unknown {
    if (value && typeof value === "object") {
        Object.keys(value).forEach(key => freeze((value as Record<string, unknown>)[key]));
        Object.freeze(value);
    }
    return value;
}

/** 校验表容器、每行和主键后建立稳定只读索引；仅跳过规范声明的注释行，所有重复主键均拒绝。 */
function parse(name: ConfigName, input: unknown): TableData {
    const rule: TableRule = CONFIG_SCHEMA[name];
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(name + "：配置格式错误");
    const file = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
    const container = file[rule.container];
    const dictionary = rule.container === "act";
    if (dictionary ? !container || typeof container !== "object" || Array.isArray(container) : !Array.isArray(container))
        throw new Error(name + "：配置缺少 " + rule.container);
    const source = dictionary ? Object.keys(container as object).map(key => (container as Record<string, unknown>)[key]) : container as unknown[];
    const rows: unknown[] = [], index: Record<string, unknown> = Object.create(null);
    source.forEach((row, i) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(name + ".rows[" + i + "]：无效行");
        const key = String((row as Record<string, unknown>)[rule.key]);
        if (rule.ignoreKeys?.includes(key)) return;
        validate(row, { type: "object", fields: rule.fields }, name + ".rows[" + i + "]");
        if (Object.prototype.hasOwnProperty.call(index, key)) {
            throw new Error(name + ".rows[" + i + "]：重复主键 " + key);
        } else index[key] = row;
        rows.push(row);
    });
    if (!dictionary) file[rule.container] = rows;
    freeze(file); freeze(rows); freeze(index);
    return Object.freeze({ file, rows, index });
}

export class GameConfig {
    static readonly instance = new GameConfig();
    private ready = new Map<ConfigName, TableData>();
    private requests = new Map<string, Promise<TableData>>();
    private errors = new Map<ConfigName, Error>();
    private version = "initial";
    private requestedVersion = "initial";
    private generation = 0;
    private fetch: ((path: string, version: string) => Promise<unknown>) | null;

    /** 注入资源读取能力，独立实例用于验证；构造与 import 均不触发加载。 */
    constructor(fetch?: (path: string, version: string) => Promise<unknown>) { this.fetch = fetch || null; }

    /** 应用装配读取器；已开始加载后禁止替换，避免同版本混用来源。 */
    initialize(fetch: (path: string, version: string) => Promise<unknown>): void {
        if (this.fetch && this.fetch !== fetch) throw new Error("配置读取器已初始化");
        this.fetch = fetch;
    }

    /** 返回状态与最近失败，已有有效表在重试失败后仍为 ready；空表也为 ready。 */
    status(name: ConfigName): { state: "ready" | "failed" | "unloaded"; error?: Error; version: string } {
        return { state: this.ready.has(name) ? "ready" : this.errors.has(name) ? "failed" : "unloaded", error: this.errors.get(name), version: this.version };
    }

    /** 按组去重加载并原子提交；失败可重试，成功的同版本请求复用。新版本成功后清除旧版本其余表。 */
    async prepare(names: readonly ConfigName[], progress?: (done: number, total: number) => void, version = this.requestedVersion): Promise<void> {
        if (!this.fetch) throw new Error("配置读取器尚未初始化");
        if (version !== this.requestedVersion) { this.requestedVersion = version; this.generation++; }
        const generation = this.generation, unique = Array.from(new Set(names));
        let done = 0, accepting = true;
        progress?.(0, unique.length);
        try {
            const entries = await Promise.all(unique.map(async name => {
                const key = version + ":" + name;
                let promise = this.requests.get(key);
                if (!promise) {
                    const created = Promise.resolve().then(() => this.fetch!(CONFIG_SCHEMA[name].path, version)).then(value => parse(name, value)).catch(error => {
                        if (this.requests.get(key) === created) this.requests.delete(key);
                        if (generation === this.generation) this.errors.set(name, error instanceof Error ? error : new Error(String(error)));
                        throw error;
                    });
                    promise = created; this.requests.set(key, created);
                }
                const data = await promise;
                if (accepting && generation === this.generation) progress?.(++done, unique.length);
                return { name, data };
            }));
            if (generation !== this.generation) throw new ConfigVersionSuperseded("配置版本已切换，拒绝迟到提交");
            if (this.version !== version) { this.ready = new Map(); this.errors.clear(); this.version = version; }
            for (const { name, data } of entries) { this.ready.set(name, data); this.errors.delete(name); }
        } finally { accepting = false; }
    }

    /** 整表返回稳定只读数组；按键查询缺行返回 undefined，表未加载或失败则明确抛错。 */
    getConfig<N extends ConfigName>(name: N): readonly ConfigRowMap[N][];
    getConfig<N extends ConfigName>(name: N, key: ConfigKeyMap[N]): ConfigRowMap[N] | undefined;
    getConfig<N extends ConfigName>(name: N, key?: ConfigKeyMap[N]): readonly ConfigRowMap[N][] | ConfigRowMap[N] | undefined {
        const data = this.table(name);
        return (key === undefined ? data.rows : data.index[String(key)]) as readonly ConfigRowMap[N][] | ConfigRowMap[N] | undefined;
    }

    /** 必需行查询将缺行作为可定位错误，不使用非空断言掩盖数据缺口。 */
    requireConfig<N extends ConfigName>(name: N, key: ConfigKeyMap[N]): ConfigRowMap[N] {
        const row = this.getConfig(name, key);
        if (!row) throw new ConfigRowMissing(name + "：缺少配置行 " + key);
        return row;
    }

    /** 返回同一只读源文件供现有展示投影使用；调用方类型由表名推导。 */
    getFile<N extends ConfigName>(name: N): ConfigFileMap[N] { return this.table(name).file as ConfigFileMap[N]; }

    /** 返回已提交表或抛出包含最近加载失败原因的错误。 */
    private table(name: ConfigName): TableData {
        const data = this.ready.get(name);
        if (!data) throw new ConfigUnavailable(name + "：" + (this.errors.get(name)?.message || "配置尚未加载"));
        return data;
    }
}
