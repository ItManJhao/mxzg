/**
 * 预览选传输。默认连本机游戏服，不必加 ?transport=ws。
 * 地址是本机桥 ws://127.0.0.1:13111/game ，由 scripts/start-ws-bridge.bat 转到 TCP 9902。
 * 游戏服自带的 13101 能完成握手，但不回这套帧。不要把它当默认地址。
 * ?dev=mock / ?transport=mock 不再离线。预览始终走这条桥。
 * 查询和安全区的 ?safe= 可以同时放在地址上。
 */

export type TransportKind = "mock" | "ws" | "auto";

export interface TransportChoice {
  kind: TransportKind;
  wsUrl: string;
  /** 地址上写了 transport=、dev=mock，或 ws=ws(s):// 才是 true。没写时不因上次记住的 mock 改回离线。 */
  explicit: boolean;
}

/** 本机桥。先双击 start-ws-bridge.bat。不是游戏服自带的 13101。 */
export const DEFAULT_WS_URL = "ws://127.0.0.1:13111/game";

/** 安全默认是真服 WebSocket。Mock 必须地址显式打开，不跟上次记住的键走。 */
export const TransportConfig = {
  defaultKind: "ws" as TransportKind,
  wsUrl: DEFAULT_WS_URL,
};

/** 运行时是否允许 MockTransport 把会话种进 GameStore。Boot 只在 ?dev=mock 时打开。 */
let mockRuntime = false;

/**
 * 真服主线探针（关卡加减、请求战报、切磋、GM）。
 * 只认地址上的 ?dev=wire。不改传输：默认仍是 ws://127.0.0.1:13111/game。
 * ?dev=mock 仍只开 Mock，不会顺带打开这页。
 */
export function wireDebugFromSearch(search: string): boolean {
  return queryParam(search, "dev") === "wire";
}

/** 调试 GM 面板。只认 ?gm=1。不改传输，也不改 ?dev=wire 的探针开关。 */
export function gmDebugFromSearch(search: string): boolean {
  return queryParam(search, "gm") === "1";
}

export function gmDebugEnabled(): boolean {
  return gmDebugFromSearch(readPreviewSearch());
}

export function wireDebugEnabled(): boolean {
  return wireDebugFromSearch(readPreviewSearch());
}

export function mockRuntimeEnabled(): boolean {
  return mockRuntime;
}

export function setMockRuntime(on: boolean): void {
  mockRuntime = on;
}

/** 登录页状态一行放得下。长说明写在 GameLog。 */
export const WS_DOWN_STATUS = "服未启动，请检查启动 bat";
export const WS_DOWN_DETAIL =
  "ws://127.0.0.1:13111/game 指的是正在跑 Creator 预览的这台电脑。请在这台电脑上双击 scripts/start-local-all.bat，确认 9902 和 13111 都在听。用别的浏览器或另一台机器打开预览时，127.0.0.1 不是桥所在的机器，桥在听也会连不上。不要直连 13101。";
export const WS_DOWN_LOG =
  "服或桥没接上。请先双击 scripts/start-local-all.bat，或分拆双击 scripts/start-local-server.bat，确认 TCP 9902 在听，再双击 scripts/start-ws-bridge.bat，确认 ws://127.0.0.1:13111/game 在听。127.0.0.1 是正在预览的这台电脑，不是另一台机器上的浏览器。不要直连 13101。";
export const WS_OPEN_STATUS = "已打开，心跳 1004 已发送";
export const WS_OPEN_TOAST = "心跳 1004 已发送";
export const WS_CLOSE_STATUS = "连接已关闭";
export const WS_MOCK_STATUS = "已改走 Mock";

/** wss 且不是 127.0.0.1 / localhost 时，断开文案要写明查询参数 ws= 上的隧道。 */
export function wsDownDetail(wsUrl: string): string {
  if (!isTunnelWsUrl(wsUrl)) return WS_DOWN_DETAIL;
  return (
    "没连上查询参数 ws= 里的隧道 " +
    wsUrl.trim() +
    "。请核对预览地址栏的 ws= 仍是这条 wss，并且隧道还在听。这不是只在 127.0.0.1 上双击 start-local-all.bat 就能连上的地址。"
  );
}

export function wsDownLog(wsUrl: string): string {
  if (!isTunnelWsUrl(wsUrl)) return WS_DOWN_LOG;
  return (
    "服或桥没接上。这次地址是查询参数 ws= 的隧道 " +
    wsUrl.trim() +
    "，不是 ws://127.0.0.1:13111/game。请确认地址栏里的 ws= 就是这条 wss，隧道要在听。不要只看 start-local-all.bat。不要直连 13101。"
  );
}

export function parseTransportSearch(search: string, config: { defaultKind: TransportKind; wsUrl: string } = TransportConfig): TransportChoice {
  const kindRaw = queryParam(search, "transport");
  const wsRaw = queryParam(search, "ws");
  const devRaw = queryParam(search, "dev");
  const wsUrlGiven = isAbsoluteWsUrl(wsRaw);
  let kind: TransportKind = config.defaultKind === "auto" ? "mock" : config.defaultKind;
  let explicit = false;
  // 显式 Mock 优先。除此之外，transport=ws|websocket|wss 或 ws=ws(s):// 都强制真桥。
  if (kindRaw === "mock" || devRaw === "mock") {
    kind = "mock";
    explicit = true;
  } else if (kindRaw === "ws" || kindRaw === "websocket" || kindRaw === "wss" || wsUrlGiven) {
    kind = "ws";
    explicit = true;
  } else if (kindRaw === "auto") {
    kind = "auto";
    explicit = true;
  }
  let wsUrl = config.wsUrl;
  if (wsUrlGiven && wsRaw) wsUrl = wsRaw.trim();
  return { kind, wsUrl, explicit };
}

/**
 * 预览始终走桥。?dev=mock / ?transport=mock 被忽略，不离线。
 * auto 仍先短连；失败停在「服未启动」，不改走别的传输。
 */
export function resolveBootTransport(
  choice: TransportChoice,
  _saved: "mock" | "ws" | null | undefined
): { useWs: boolean; autoFallback: boolean } {
  if (choice.kind === "auto") return { useWs: true, autoFallback: true };
  return { useWs: true, autoFallback: false };
}

/** 先看本页查询，再看父页面、最外层页面和 referrer。Creator 预览若把参数放在外层地址上，这里也能读到。 */
export function readPreviewTransport(): TransportChoice {
  return parseTransportSearch(readPreviewSearch());
}

export function readPreviewSearch(): string {
  const parts: string[] = [];
  const self = globalThis as unknown;
  collectHost(parts, globalThis as LocationHost);
  try {
    const parent = (globalThis as { parent?: LocationHost }).parent;
    if (parent && parent !== self) collectHost(parts, parent);
  } catch (_err) {
    // 父页面跨域时读不到，继续看最外层和 referrer。
  }
  try {
    const top = (globalThis as { top?: LocationHost }).top;
    const parent = (globalThis as { parent?: unknown }).parent;
    if (top && top !== self && top !== parent) collectHost(parts, top);
  } catch (_err) {
    // 最外层跨域时读不到。
  }
  try {
    const referrer = (globalThis as { document?: { referrer?: string } }).document?.referrer;
    if (typeof referrer === "string" && referrer) pushSearch(parts, queryFromUrl(referrer));
  } catch (_err) {
    // 没有 document 时跳过。
  }
  return parts.join("&");
}

interface LocationHost {
  location?: { search?: string; href?: string };
  search?: string;
  href?: string;
}

function collectHost(parts: string[], host: LocationHost | null | undefined): void {
  try {
    if (!host) return;
    pushSearch(parts, readSearchOf(host));
    const href = hrefOf(host);
    if (href) pushSearch(parts, queryFromUrl(href));
  } catch (_err) {
    // 跨域 location 读不到这一层。
  }
}

function pushSearch(parts: string[], search: string): void {
  if (!search) return;
  parts.push(search);
}

function readSearchOf(host: LocationHost | null | undefined): string {
  if (!host) return "";
  const fromLoc = host.location && typeof host.location.search === "string" ? host.location.search : "";
  const direct = typeof host.search === "string" ? host.search : "";
  const raw = fromLoc || direct;
  if (!raw || raw === "?") return "";
  return raw.charAt(0) === "?" ? raw.slice(1) : raw;
}

function hrefOf(host: LocationHost): string {
  const fromLoc = host.location && typeof host.location.href === "string" ? host.location.href : "";
  if (fromLoc) return fromLoc;
  return typeof host.href === "string" ? host.href : "";
}

/** 从整段 URL 里取出查询。也认 hash 上的 ?transport= / ws=，隧道预览有时把参数放在 hash。 */
function queryFromUrl(url: string): string {
  if (!url) return "";
  const hashAt = url.indexOf("#");
  const before = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt + 1) : "";
  const q = before.indexOf("?");
  const search = q >= 0 ? before.slice(q + 1) : "";
  let hashQuery = "";
  if (hash) {
    const hq = hash.indexOf("?");
    if (hq >= 0) hashQuery = hash.slice(hq + 1);
    else if (hash.indexOf("=") >= 0) hashQuery = hash;
  }
  if (search && hashQuery) return search + "&" + hashQuery;
  return search || hashQuery;
}

function isAbsoluteWsUrl(value: string | null): boolean {
  if (!value) return false;
  const scheme = value.trim().toLowerCase();
  return scheme.indexOf("ws://") === 0 || scheme.indexOf("wss://") === 0;
}

function isTunnelWsUrl(wsUrl: string): boolean {
  const lower = (wsUrl || "").trim().toLowerCase();
  if (lower.indexOf("wss://") !== 0) return false;
  const host = lower.slice("wss://".length);
  if (host.indexOf("127.0.0.1") === 0 || host.indexOf("localhost") === 0) return false;
  return true;
}

export interface WireTimeoutReport {
  /** 面板一行：有没有任意 s2c、心跳 1004 回包、登录 1001 回包。 */
  detail: string;
  /** 写进 GameLog 的整句。 */
  summary: string;
  /** 最近几条 Ws 原文。调用方逐条再记一行，避免和面板挤在一起。 */
  tail: string[];
}

const WIRE_TIMEOUT_TAIL = 6;

/**
 * 登录或创角在 5 秒内没有对上的回包时用。
 * 只看已经写进 GameLog 的 Ws 行，不自己去猜服务器。
 * 登录前单独的心跳经常没有 s2c 1004，这句会写明，不把它当成桥已经坏了的唯一证据。
 */
export function explainWireTimeout(wsMessages: string[] | null | undefined): WireTimeoutReport {
  const messages = wsMessages && wsMessages.length ? wsMessages : [];
  let any = false;
  let beat = false;
  let login = false;
  let sentBeat = false;
  let sentLogin = false;
  for (let i = 0; i < messages.length; i++) {
    const text = messages[i] || "";
    if (text.indexOf("收到 s2c ") >= 0) any = true;
    if (text.indexOf("收到 s2c 1004 ") >= 0) beat = true;
    if (text.indexOf("收到 s2c 1001 ") >= 0) login = true;
    if (text.indexOf("发送 c2s 1004 ") >= 0) sentBeat = true;
    if (text.indexOf("发送 c2s 1001 ") >= 0) sentLogin = true;
  }
  const start = messages.length > WIRE_TIMEOUT_TAIL ? messages.length - WIRE_TIMEOUT_TAIL : 0;
  const tail: string[] = [];
  for (let i = start; i < messages.length; i++) tail.push(messages[i]);
  const detail =
    "s2c=" + (any ? "有" : "无") + " 心跳1004回包=" + (beat ? "有" : "无") + " 登录1001回包=" + (login ? "有" : "无");
  let hint: string;
  if (!sentLogin) {
    hint = "这次等待前没有发出登录 1001。";
  } else if (!any) {
    hint = sentBeat
      ? "登录已发出，没有任何 s2c。登录前的心跳 1004 经常没有回包。请确认 start-ws-bridge.bat 在听 13111，TCP 9902 在听。不要直连 13101。"
      : "没有发出心跳，也没有任何 s2c。请确认 start-ws-bridge.bat 在听 13111。";
  } else if (!login && beat) {
    hint = "心跳 1004 有回包，登录 1001 没有回包。";
  } else if (!login) {
    hint = "有别的 s2c，没有登录 1001，心跳 1004 也没有回包。";
  } else if (!beat) {
    hint = "登录 1001 有回包。心跳 1004 没有回包。";
  } else {
    hint = "心跳 1004 和登录 1001 都有过回包，这次仍超时。";
  }
  return { detail, summary: detail + "。" + hint, tail };
}

function queryParam(search: string, key: string): string | null {
  if (!search) return null;
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  const parts = query.split("&");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const eq = part.indexOf("=");
    const rawKey = eq >= 0 ? part.slice(0, eq) : part;
    const rawVal = eq >= 0 ? part.slice(eq + 1) : "";
    let name = rawKey;
    let value = rawVal;
    try {
      name = decodeURIComponent(rawKey);
      value = decodeURIComponent(rawVal.replace(/\+/g, " "));
    } catch (_err) {
      name = rawKey;
      value = rawVal;
    }
    if (name !== key) continue;
    const trimmed = value.trim().toLowerCase();
    if (key === "ws") return value.trim();
    return trimmed;
  }
  return null;
}
