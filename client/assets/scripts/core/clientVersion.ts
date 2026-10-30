/**
 * 客户端版本来自 config/version，不再写死 0.1.0-mock。
 * 远程版本从平台地址和下载地址上的 version.json / version.manifest 里取整数版本号，和表里的 version 比大小。
 * 地址为空，或请求失败（网络、超时、404、CORS、解析不出版本号）时返回 null，不抛「校验版本失败」。
 * 调用方把 null 当成本地已是最新并跳过热更。H5 / Creator 浏览器预览到不了 CDN 时走这条。
 */
import { sys } from "cc";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "./GameLog";

export interface ClientVersion {
  version: number;
  platformUrl: string;
  downloadUrl: string;
}

export function isH5Client(): boolean {
  if (sys.isBrowser) return true;
  const platform = sys.platform;
  return platform === sys.Platform.MOBILE_BROWSER || platform === sys.Platform.DESKTOP_BROWSER;
}

/**
 * 浏览器 / H5 / http(s) 预览。cc.sys.isBrowser 在个别预览里会是 false，
 * 这时仍看本页、父页、最外层页的 http: / https:，避免去请求表里的 http 版本主机。
 */
export function browserSkipsRemoteVersion(): boolean {
  if (isH5Client()) return true;
  const protocol = pageProtocol();
  return protocol === "https:" || protocol === "http:";
}

function pageProtocol(): string {
  const self = globalThis as {
    location?: { protocol?: string };
    parent?: { location?: { protocol?: string } };
    top?: { location?: { protocol?: string } };
  };
  const hosts: Array<{ location?: { protocol?: string } } | null | undefined> = [self];
  try {
    if (self.parent && self.parent !== (self as unknown)) hosts.push(self.parent);
  } catch (_err) {
    // 父页跨域。
  }
  try {
    if (self.top && self.top !== (self as unknown) && self.top !== self.parent) hosts.push(self.top);
  } catch (_err) {
    // 最外层跨域。
  }
  for (let i = 0; i < hosts.length; i++) {
    try {
      const protocol = hosts[i] && hosts[i]!.location && hosts[i]!.location!.protocol;
      if (protocol === "https:" || protocol === "http:") return protocol;
    } catch (_err) {
      // 这一层读不到。
    }
  }
  return "";
}

export function parseVersionPayload(text: string): number | null {
  const trimmed = text.trim();
  if (/^\d{5,}$/.test(trimmed)) return Number(trimmed);
  let data: unknown = null;
  try {
    data = JSON.parse(trimmed);
  } catch (_err) {
    return null;
  }
  return versionFromJson(data);
}

export function versionNeedsUpdate(local: number, remote: number): boolean {
  return remote > local;
}

export function versionUrls(version: ClientVersion): string[] {
  const roots = [version.platformUrl, version.downloadUrl];
  const out: string[] = [];
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (!root) continue;
    const base = root.charAt(root.length - 1) === "/" ? root : root + "/";
    out.push(base + "version.json");
    out.push(base + "version.manifest");
    out.push(base + "version");
    out.push(base);
  }
  return out;
}

export function hotUpdateUrl(version: ClientVersion): string {
  const root = version.downloadUrl || version.platformUrl;
  if (!root) return "";
  const base = root.charAt(root.length - 1) === "/" ? root : root + "/";
  return base + "version.manifest";
}

export async function readClientVersion(): Promise<ClientVersion> {
  const file = await ConfigLoader.loadJson<{ rows?: unknown }>("config/version");
  const rows = Array.isArray(file.rows) ? file.rows : [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { version?: unknown; platform_urls?: unknown; download_urls?: unknown };
    const version = numericVersion(rec.version);
    if (version === null) continue;
    return {
      version,
      platformUrl: typeof rec.platform_urls === "string" ? rec.platform_urls : "",
      downloadUrl: typeof rec.download_urls === "string" ? rec.download_urls : "",
    };
  }
  throw new Error("版本表没有可用的 version");
}

/**
 * Creator / 浏览器预览不向表里的 http 地址发请求。
 * 那些地址是 http://106.52.67.63:2011 和 http://cdn-mxzg.anyaojs.com/release/qyzh/chn/。
 * 预览页若是 https，浏览器会把它们当成混合内容拦住。配置改读本地 resources，真服只走 ws 桥。
 */
export function remoteVersionUrls(version: ClientVersion, browser: boolean): string[] {
  if (browser) return [];
  return versionUrls(version);
}

/** 浏览器预览跳过远程版本时打一行，QA 能在控制台对上混合内容是否还在请求。 */
export function noteSkippedRemoteVersion(): void {
  GameLog.shared.info(
    "Boot",
    "stage=version 跳过远程版本，因为浏览器/预览。不请求 http://106.52.67.63:2011/ 和 http://cdn-mxzg.anyaojs.com/release/qyzh/chn/"
  );
}

/**
 * 读到远程整数版本就返回它。
 * 浏览器 / H5 / https 预览走 remoteVersionUrls 的空列表，不向表里的 http 主机发请求。
 * 没有平台地址和下载地址，或每个地址都失败时返回 null。不抛「校验版本失败」。
 */
export async function fetchRemoteVersion(version: ClientVersion, timeoutMs = 4000): Promise<number | null> {
  const browser = browserSkipsRemoteVersion();
  const urls = remoteVersionUrls(version, browser);
  if (urls.length === 0) {
    if (browser) noteSkippedRemoteVersion();
    return null;
  }
  const found = await Promise.all(
    urls.map((url) =>
      fetchText(url, timeoutMs).then(
        (text) => parseVersionPayload(text),
        () => null
      )
    )
  );
  for (let i = 0; i < found.length; i++) {
    if (found[i] !== null) return found[i] as number;
  }
  return null;
}

export function downloadWithProgress(
  url: string,
  onRatio: (ratio: number) => void,
  timeoutMs = 20000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error("下载超时"));
    }, timeoutMs);
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) onRatio(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        onRatio(1);
        resolve();
        return;
      }
      reject(new Error("HTTP " + xhr.status));
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error("下载失败"));
    };
    xhr.send();
  });
}

function versionFromJson(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as { [key: string]: unknown };
  const direct =
    numericVersion(rec.version) ?? numericVersion(rec.remoteVersion) ?? numericVersion(rec.clientVersion);
  if (direct !== null) return direct;
  if (Array.isArray(rec.rows) && rec.rows.length > 0) {
    const row = rec.rows[0];
    if (row && typeof row === "object") return numericVersion((row as { version?: unknown }).version);
  }
  return null;
}

function numericVersion(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value) && value >= 10000) return Math.floor(value);
  if (typeof value === "string" && /^\d{5,}$/.test(value.trim())) return Number(value.trim());
  return null;
}

function fetchText(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error("超时"));
    }, timeoutMs);
    xhr.open("GET", url, true);
    xhr.responseType = "text";
    xhr.onload = () => {
      clearTimeout(timer);
      // status 0 是 CORS 或被浏览器拦住的跨域，不当成读到了版本。
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(typeof xhr.response === "string" ? xhr.response : "");
        return;
      }
      reject(new Error("HTTP " + xhr.status));
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error("网络错误"));
    };
    xhr.send();
  });
}
