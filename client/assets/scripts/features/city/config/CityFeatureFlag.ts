/**
 * 主城走 CityHubView + CityChromeView。
 * 关掉之后，MainApp 仍用 mountCityHubPrefab / mountCityChromePrefab。
 * 预览地址 ?city=old 从旧实现开。不写这个参数时走新视图。
 * 已经挂上的那一城不会中途换实现。
 */
let enabled = cityViewFromSearch(currentSearch());

export function useCityView(): boolean {
  return enabled;
}

export function setUseCityView(on: boolean): void {
  enabled = on;
}

/** 地址里 city=old / 0 / false 才关。别的值，包括空串，都开着。 */
export function cityViewFromSearch(search: string): boolean {
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  if (!query) return true;
  const parts = query.split("&");
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i].split("=");
    let key = "";
    let value = "";
    try {
      key = decodeURIComponent(pair[0] || "");
      value = decodeURIComponent(pair[1] || "");
    } catch (_err) {
      continue;
    }
    if (key !== "city") continue;
    if (value === "old" || value === "0" || value === "false") return false;
  }
  return true;
}

function currentSearch(): string {
  try {
    const loc = (globalThis as { location?: { search?: string } }).location;
    return loc && typeof loc.search === "string" ? loc.search : "";
  } catch (_err) {
    return "";
  }
}
