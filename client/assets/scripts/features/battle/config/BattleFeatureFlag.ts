/**
 * 挂机战斗主面板走 BattleHangView。
 * 关掉之后，底栏「战斗」仍由 mountHangBattleShell 铺 BattlePanelLayer。
 * 已经打开的那一页不会中途换实现，下次再开才看这个开关。
 * 预览地址 ?battle=old 从旧实现开。不写这个参数时走新视图。
 * 每次打开都重新读地址。模块装载那一刻 location 可能还是空的，不能把第一次读到的结果冻住。
 * setUseBattleView 只给检查覆盖，盖过地址。
 */
let forced: boolean | null = null;

export function useBattleView(): boolean {
  if (forced !== null) return forced;
  return battleViewFromSearch(currentSearch());
}

export function setUseBattleView(on: boolean): void {
  forced = on;
}

/**
 * 地址里 battle=old / 0 / false 才关。别的值，包括空串，都开着。
 * battle 可以夹在别的参数中间，例如 ?dev=wire&battle=old。
 * 同一串里只要有一次 battle=old / 0 / false，就走旧页。
 */
export function battleViewFromSearch(search: string): boolean {
  const query = queryText(search);
  if (!query) return true;
  const parts = query.split("&");
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    if (!raw) continue;
    const cut = raw.indexOf("=");
    const keyRaw = cut < 0 ? raw : raw.slice(0, cut);
    const valueRaw = cut < 0 ? "" : raw.slice(cut + 1);
    let key = "";
    let value = "";
    try {
      key = decodeURIComponent(keyRaw.replace(/\+/g, " "));
      value = decodeURIComponent(valueRaw.replace(/\+/g, " "));
    } catch (_err) {
      continue;
    }
    if (key !== "battle") continue;
    if (value === "old" || value === "0" || value === "false") return false;
  }
  return true;
}

function queryText(search: string): string {
  const text = search || "";
  const q = text.indexOf("?");
  const body = q >= 0 ? text.slice(q + 1) : text.charAt(0) === "?" ? text.slice(1) : text;
  const hash = body.indexOf("#");
  return hash >= 0 ? body.slice(0, hash) : body;
}

function currentSearch(): string {
  try {
    const loc = (globalThis as { location?: { search?: string; href?: string } }).location;
    if (!loc) return "";
    if (typeof loc.search === "string" && loc.search.length > 1) return loc.search;
    return typeof loc.href === "string" ? loc.href : "";
  } catch (_err) {
    return "";
  }
}
