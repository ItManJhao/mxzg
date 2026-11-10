/** 独立验收的目标与存储隔离：支持本机 Creator 预览及其托管的 Web 构建。
 * 随机实例身份核验通过前不登录，不允许测试参数回退到日常服。
 * HTTP 仅访问测试 classpath 的实例身份探针，游戏业务仍全部使用 WS＋Protobuf。
 */
import { PREVIEW } from "cc/env";

/** 启动需要的存储操作；测试会话采用独立 run 前缀，不读取日常凭证。 */
interface PreviewStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** 核验本机测试地址与实例身份；无测试参数时保留正常连接，任何核验失败均拒绝登录。 */
export async function isolatedSocketPreview(
    socketUrl: string,
    storage: PreviewStorage,
): Promise<{ socketUrl: string; storage: PreviewStorage }> {
    const href = typeof location !== "undefined" ? location.href : "";
    const page = href ? new URL(href) : null;
    const query = page?.searchParams;
    if (!query?.has("mxzgTestApi") && !query?.has("mxzgTestRun")) {
        return { socketUrl, storage };
    }
    // 发布包只允许 Creator 托管的本机 Web 输出路径，不开放公网或任意站点切换后端。
    const localPage = page?.protocol === "http:"
        && ["localhost", "127.0.0.1"].includes(page.hostname)
        && page.port === "7456" && !page.username && !page.password;
    const localBuild = /^\/web-(mobile|desktop)\/[A-Za-z0-9_-]+\/index\.html$/.test(page?.pathname || "");
    if (!localPage || (!PREVIEW && !localBuild)) {
        throw new Error("测试目标只允许本机 Creator 预览或 Web 构建验收页");
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
    let identity: { kind?: string; run?: string } | null;
    try {
        // 身份响应内容也受超时控制；禁止重定向将核验请求带到其他地址。
        const response = await fetch(target + "/api/v1/test-identity", {
            signal: abort.signal, redirect: "error", credentials: "omit",
        });
        if (!response.ok) {
            throw new Error("独立测试后端不可用，禁止回退日常服");
        }
        identity = await response.json();
    } finally {
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
