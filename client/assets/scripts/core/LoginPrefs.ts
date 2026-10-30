import { findServer } from "./servers";

/** 上次账号 / 上次服务器。H5 用 localStorage，Creator 里优先 sys.localStorage。 */
export interface PrefStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 上次预览走 Mock 还是本机桥。不存密码。 */
export type TransportPref = "mock" | "ws";

export interface LoginPrefs {
  account: string;
  serverId: number;
  /** 没选过时没有这一项。查询参数优先于它。 */
  transport?: TransportPref;
}

const ACCOUNT_KEY = "mxzg.account";
const SERVER_KEY = "mxzg.serverId";
const TRANSPORT_KEY = "mxzg.transport";

export function loadLoginPrefs(store: PrefStore | null): LoginPrefs | null {
  if (!store) return null;
  let account = "";
  let serverRaw: string | null = null;
  try {
    account = (store.getItem(ACCOUNT_KEY) ?? "").trim();
    serverRaw = store.getItem(SERVER_KEY);
  } catch (_err) {
    return null;
  }
  const hasServer = serverRaw !== null && serverRaw !== "";
  let transportRaw: string | null = null;
  try {
    transportRaw = store.getItem(TRANSPORT_KEY);
  } catch (_err) {
    transportRaw = null;
  }
  const transport = parseTransportPref(transportRaw);
  if (!account && !hasServer && !transport) return null;
  const prefs: LoginPrefs = { account, serverId: findServer(parseServerId(serverRaw)).id };
  if (transport) prefs.transport = transport;
  return prefs;
}

export function saveLoginPrefs(prefs: LoginPrefs, store: PrefStore | null): void {
  if (!store) return;
  const account = prefs.account.trim();
  const serverId = findServer(prefs.serverId).id;
  try {
    if (account) store.setItem(ACCOUNT_KEY, account);
    store.setItem(SERVER_KEY, String(serverId));
    if (prefs.transport === "mock" || prefs.transport === "ws") store.setItem(TRANSPORT_KEY, prefs.transport);
  } catch (_err) {
    // 隐私模式或配额满时下次仍可手输。
  }
}

/** 浏览器预览。Creator 组件里先试 sys.localStorage，没有再落到这里。 */
export function browserPrefStore(): PrefStore | null {
  try {
    const store = (globalThis as { localStorage?: PrefStore }).localStorage;
    if (!store || typeof store.getItem !== "function" || typeof store.setItem !== "function") return null;
    return store;
  } catch (_err) {
    return null;
  }
}

/** 输入框优先，空则用检查器账号，再空则 mock。 */
export function resolveAccount(primary: string | undefined, fallback: string | undefined): string {
  const first = (primary ?? "").trim();
  if (first) return first;
  const second = (fallback ?? "").trim();
  if (second) return second;
  return "mock";
}

function parseTransportPref(raw: string | null): TransportPref | null {
  if (raw === "mock" || raw === "ws") return raw;
  return null;
}

function parseServerId(raw: string | null): number {
  if (!raw) return 1;
  const value = parseInt(raw, 10);
  if (!isFinite(value)) return 1;
  return value;
}
