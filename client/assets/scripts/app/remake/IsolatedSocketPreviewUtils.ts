/** 独立验收的目标与存储隔离：支持Creator预览、托管Web包及固定18081的独立H5验收入口。
 * 独立H5先核对同源构建身份，再核对随机后端实例；通过前不登录，不回退到日常服。
 * HTTP仅访问只读构建/测试实例身份探针，游戏业务仍全部使用WS＋Protobuf。
 */
import { PREVIEW } from "cc/env";
/** 启动需要的存储操作；测试会话采用独立 run 前缀，不读取日常凭证。 */
interface PreviewStorage {
    /** 从当前实例命名空间读取一个值；未写入时返回null。 */
    getItem(key: string): string | null;
    /** 只写入当前实例命名空间，不覆盖日常登录凭证。 */
    setItem(key: string, value: string): void;
    /** 只删除当前实例的对应键。 */
    removeItem(key: string): void;
}
/** 独立验收工具：显式核验测试实例并返回隔离连接配置，不持有正常账号状态。 */
export class IsolatedSocketPreviewUtils {
    /** 仅提供静态入口，禁止创建工具实例。 */
    private constructor() {
    }

    /** 核验本机测试地址与实例身份；无测试参数时保留正常连接，任何核验失败均拒绝登录。 */
    public static async isolatedSocketPreview(socketUrl: string, storage: PreviewStorage): Promise<{
        socketUrl: string;
        storage: PreviewStorage;
    }> {
        const href = typeof location !== "undefined" ? location.href : "";
        const page = href ? new URL(href) : null;
        const query = page?.searchParams;
        if (!query?.has("mxzgTestApi") && !query?.has("mxzgTestRun")) {
            return { socketUrl, storage };
        }
        // 端口与路径明确限定；独立入口还须证明自己服务的是本项目实际验收包。
        const loopbackPage = page?.protocol === "http:"
            && ["localhost", "127.0.0.1"].includes(page.hostname)
            && !page.username && !page.password;
        const creatorPage = loopbackPage && page.port === "7456";
        const standalonePage = loopbackPage && page.port === "18081"
            && ["/", "/index.html"].includes(page.pathname);
        const localBuild = /^\/web-(mobile|desktop)\/[A-Za-z0-9_-]+\/index\.html$/.test(page?.pathname || "");
        if (!(creatorPage && (PREVIEW || localBuild)) && !standalonePage) {
            throw new Error("测试目标只允许本机Creator验收页或固定端口的独立H5验收页");
        }
        const target = query?.get("mxzgTestApi") || "";
        const run = query?.get("mxzgTestRun") || "";
        if (!/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(target) || !/^[a-f0-9-]{32,36}$/.test(run)) {
            throw new Error("独立验收参数不完整或无效，禁止连接日常服");
        }
        const port = Number(new URL(target).port);
        if ([18080, 18081, 3306].includes(port) || port > 65535) {
            throw new Error("测试验收不能连接日常端口");
        }
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 15000);
        let identity: {
            kind?: string;
            run?: string;
        } | null;
        try {
            if (standalonePage) {
                const frontend = await this.readIdentity(page.origin + "/__mxzg_preview__", abort.signal,
                    "独立H5前端不可用，禁止连接测试后端");
                this.requireStandaloneBuild(frontend);
            }
            identity = await this.readIdentity(target + "/api/v1/test-identity", abort.signal,
                "独立测试后端不可用，禁止回退日常服") as typeof identity;
        }
        finally {
            clearTimeout(timer);
        }
        if (!identity || !["mxzg-owned-socket-it", "mxzg-owned-mysql-it"].includes(identity.kind || "") || identity.run !== run) {
            throw new Error("测试实例身份不匹配，禁止登录");
        }
        const prefix = "mxzg.test." + run + ".";
        return {
            socketUrl: target.replace(/^http/, "ws") + "/api/v1/game/socket",
            storage: {
                getItem: key => storage.getItem(prefix + key),
                setItem: (key, value) => storage.setItem(prefix + key, value),
                removeItem: key => storage.removeItem(prefix + key),
            },
        };
    }

    /** 两个只读探针共用整次核验超时；拒绝重定向和凭证传输，失败不尝试日常服。 */
    private static async readIdentity(url: string, signal: AbortSignal, unavailable: string): Promise<unknown> {
        const response = await fetch(url, { signal, redirect: "error", credentials: "omit" });
        if (!response.ok) {
            throw new Error(unavailable);
        }
        return response.json();
    }

    /** 核对独立H5宿主的真实构建记录；缺证据、混版、散表残留或非单包产物都不接纳。 */
    private static requireStandaloneBuild(value: unknown): void {
        const identity = value as Record<string, unknown> | null;
        const build = identity?.build as Record<string, unknown> | undefined;
        const config = build?.configPackage as Record<string, unknown> | undefined;
        const artifact = build?.configArtifact as Record<string, unknown> | undefined;
        if (!identity || identity.application !== "mxzg-remake-preview" || !build
            || build.application !== "mxzg-remake-h5" || build.entryScene !== "db://assets/scenes/Remake.scene"
            || !config || !artifact || config.format !== 1
            || typeof config.version !== "string" || !/^config-v1:[0-9a-f]{64}$/.test(config.version)
            || artifact.version !== config.version
            || !Number.isSafeInteger(config.startup) || (config.startup as number) <= 0
            || !Number.isSafeInteger(config.packed) || (config.packed as number) <= 0
            || !Number.isSafeInteger(config.packageBytes) || (config.packageBytes as number) <= 0
            || artifact.startup !== config.startup || artifact.excluded !== config.packed
            || artifact.packageBytes !== config.packageBytes
            || artifact.binaryFiles !== 1 || artifact.packedSourceCopies !== 0
            || artifact.codecStaticRegistration !== true || artifact.codecStaticDependency !== true) {
            throw new Error("独立H5前端身份或配置包验收记录不匹配，禁止连接测试后端");
        }
    }
}
