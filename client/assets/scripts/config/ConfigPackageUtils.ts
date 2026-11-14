/**
 * 游戏配置包的纯解码与完整性检查：同一ZIP字节格式供预览和发布使用，不读取网络或玩家状态。
 * 生成器从源JSON及LoadingPlan自动生成manifest；本工具核对启动源、文件大小和CRC后逐表解析。
 * 解码器由同一生成工具预打包为TypeScript ESM，避免Creator将npm的.js入口误判为CommonJS。
 * 返回数据的所有权交给唯一GameConfig，临时压缩字节不保存在此处；CRC用于发现损坏，不是内容签名。
 */
import { strFromU8, strToU8, unzipSync } from "./ConfigZip.generated";

/** 应用阶段取消后停止解析，调用方须保留原配置并结束旧进度回调。 */
export class ConfigPackageCancelled extends Error {}

/** 一项自动生成的源文件完整性信息，不是人工维护的模块资源清单。 */
interface SourceEntry {
    /** 运行时包名/包内路径，无.json扩展名。 */
    readonly path: string;
    /** 规范JSON字节的CRC32，固定8位小写十六进制。 */
    readonly crc32: string;
    /** 规范JSON的UTF8字节数。 */
    readonly bytes: number;
}

/** 游戏包内文件与同一份源数据的对应关系，完全由生成器派生。 */
interface PackageEntry extends SourceEntry {
    /** ZIP内的安全相对路径，保留maincity等子目录。 */
    readonly file: string;
}

/** 明确版本的包目录，旧格式不得用空表兜底。 */
interface PackageManifest {
    /** 本工具支持的布局版本，当前为1。 */
    readonly format: number;
    /** 全部源配置及规范生成的内容版本，不包含时间戳。 */
    readonly version: string;
    /** 登录前已加载的源表，只校验同版，不重复放进ZIP。 */
    readonly startup: readonly SourceEntry[];
    /** 登录后统一加载的全部其余配置，包含暂未类型化的表。 */
    readonly files: readonly PackageEntry[];
}

/** 已校验但尚未提交到配置仓库的数据，不代表主城可以打开。 */
export interface DecodedConfigPackage {
    /** 与manifest一致的内容版本。 */
    readonly version: string;
    /** 运行时路径到解析结果；交给GameConfig后不再由调用方修改或持有。 */
    readonly files: Readonly<Record<string, unknown>>;
    /** 来自同一manifest的启动源路径，不在仓库维护第二份启动表清单。 */
    readonly startupPaths: readonly string[];
}

export class ConfigPackageUtils {
    /** 当前技术支持的包文件数量上限，异常包整次拒绝，不截取配置。 */
    private static readonly MAX_FILES = 512;
    /** 解压总量最多64MiB，防止坏目录导致无法控制的内存分配。 */
    private static readonly MAX_UNPACKED_BYTES = 64 * 1024 * 1024;
    /** 当前单个配置最多16MiB，超过时应先评估解析和内存预算。 */
    private static readonly MAX_FILE_BYTES = 16 * 1024 * 1024;
    /** CRC查表仅包含不可变数值，不缓存配置字节或角色数据。 */
    private static readonly CRC_TABLE = ConfigPackageUtils.createCrcTable();

    /** 无状态格式工具只通过静态方法调用。 */
    private constructor() {}

    /** 对源JSON规范序列化后的UTF8求CRC，和生成器JSON.parse/stringify顺序保持一致。 */
    public static sourceChecksum(value: unknown): string {
        const text = JSON.stringify(value);
        if (text === undefined) {
            throw new Error("配置源内容不能序列化");
        }
        return this.crc32(strToU8(text));
    }

    /**
     * 解压并逐表校验/解析，期间让出执行以刷新真实读取进度；失败不返回部分结果。
     * @param readStartupChecksum 唯一GameConfig已经准备的启动源校验值，未准备返回undefined
     * @param progress 已完整解析的包内文件数/总数，不伪装为网络字节进度
     * @param active 当前应用阶段仍有效；false时停止交付，不影响已安装配置
     */
    public static async decode(bytes: Uint8Array, readStartupChecksum: (path: string) => string | undefined,
        progress: (done: number, total: number) => void = () => {}, active: () => boolean = () => true): Promise<DecodedConfigPackage> {
        this.requireActive(active);
        if (!bytes.byteLength || bytes.byteLength > this.MAX_UNPACKED_BYTES) {
            throw new Error("配置压缩包为空或超出支持范围");
        }
        let unpackedBytes = 0;
        const seenFiles = new Set<string>();
        const unpacked = unzipSync(bytes, { filter: file => {
            if (!this.validFile(file.name) || seenFiles.has(file.name) || seenFiles.size >= this.MAX_FILES
                || !Number.isSafeInteger(file.originalSize) || file.originalSize < 0
                || file.originalSize > this.MAX_FILE_BYTES) {
                throw new Error("配置压缩包文件目录无效：" + file.name);
            }
            seenFiles.add(file.name);
            unpackedBytes += file.originalSize;
            if (unpackedBytes > this.MAX_UNPACKED_BYTES) {
                throw new Error("配置压缩包解压总量超限");
            }
            return true;
        } });
        const manifestBytes = unpacked["manifest.json"];
        if (!manifestBytes) {
            throw new Error("配置压缩包缺少manifest");
        }
        const manifest = JSON.parse(strFromU8(manifestBytes)) as PackageManifest;
        if (!manifest || manifest.format !== 1 || !/^config-v1:[0-9a-f]{64}$/.test(manifest.version)
            || !Array.isArray(manifest.startup) || !manifest.startup.length
            || !Array.isArray(manifest.files) || !manifest.files.length
            || manifest.files.length + 1 !== seenFiles.size) {
            throw new Error("配置压缩包格式、版本或文件数量不一致");
        }
        const paths = new Set<string>();
        for (const entry of manifest.startup) {
            this.requireEntry(entry, paths);
            if (readStartupChecksum(entry.path) !== entry.crc32) {
                throw new Error("启动配置与游戏配置包不同版：" + entry.path);
            }
        }
        delete unpacked["manifest.json"];
        const files: Record<string, unknown> = Object.create(null);
        progress(0, manifest.files.length);
        for (const entry of manifest.files) {
            this.requireActive(active);
            this.requireEntry(entry, paths);
            if (!this.validFile(entry.file) || entry.file === "manifest.json"
                || entry.path !== "config/" + entry.file.slice(0, -5)) {
                throw new Error("配置压缩包路径映射不一致：" + entry.path);
            }
            const data = unpacked[entry.file];
            if (!data || data.byteLength !== entry.bytes || this.crc32(data) !== entry.crc32) {
                throw new Error("配置压缩包内容校验失败：" + entry.path);
            }
            const parsed = JSON.parse(strFromU8(data));
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("配置压缩包表结构无效：" + entry.path);
            }
            files[entry.path] = parsed;
            delete unpacked[entry.file];
            progress(Object.keys(files).length, manifest.files.length);
            await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        this.requireActive(active);
        if (Object.keys(unpacked).length) {
            throw new Error("配置压缩包包含未声明文件");
        }
        return { version: manifest.version, files, startupPaths: manifest.startup.map(entry => entry.path) };
    }

    /** 源入口和包入口共用严格路径/校验字段检查，不能用重复键覆盖已就绪的启动表。 */
    private static requireEntry(entry: SourceEntry, paths: Set<string>): void {
        if (!entry || typeof entry.path !== "string" || !/^config\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/.test(entry.path)
            || paths.has(entry.path) || !/^[0-9a-f]{8}$/.test(entry.crc32)
            || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > this.MAX_FILE_BYTES) {
            throw new Error("配置压缩包源信息无效");
        }
        paths.add(entry.path);
    }

    /** 只接受配置JSON的相对文件名，拒绝绝对路径、反斜杠和目录穿越。 */
    private static validFile(name: unknown): name is string {
        return typeof name === "string" && /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.json$/.test(name);
    }

    /** 取消只抛明确的阶段异常，不把旧阶段失败显示为当前页面加载失败。 */
    private static requireActive(active: () => boolean): void {
        if (!active()) {
            throw new ConfigPackageCancelled("配置加载阶段已取消");
        }
    }

    /** 生成标准IEEE CRC32查表，和ZIP生成器的规范字节校验保持一致。 */
    private static createCrcTable(): readonly number[] {
        const table: number[] = [];
        for (let value = 0; value < 256; value++) {
            let crc = value;
            for (let bit = 0; bit < 8; bit++) {
                crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
            }
            table.push(crc >>> 0);
        }
        return Object.freeze(table);
    }

    /** 返回字节内容的8位CRC32；用于检测下载/生成损坏，不能作为抗篡改签名。 */
    private static crc32(bytes: Uint8Array): string {
        let crc = 0xffffffff;
        for (const value of bytes) {
            crc = (crc >>> 8) ^ this.CRC_TABLE[(crc ^ value) & 0xff];
        }
        return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
    }
}
