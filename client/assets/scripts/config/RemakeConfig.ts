import { ConfigLoader } from "./ConfigLoader";
import { GroupedConfig } from "./GroupedConfig";
import type { ConfigTableFile, OpenConditionRow, SystemGateRow } from "./types";
import type { GateSnapshot } from "./nav";

/** Only current consumers belong here; future gameplay groups need explicit dependencies. */
export const REMAKE_CONFIG_GROUPS = {
  startup: ["config/language", "config/loadingtips"],
  city: ["config/opencondition", "config/system_gate", "config/maincity/maincitypos",
    "config/maincity/createmaincitybtn", "config/maincity/maincityeffect"],
  hero: ["config/herotype", "config/item"],
  inventory: ["config/item", "config/language"],
} as const;

export function validateRemakeConfig(path: string, value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置格式错误：" + path);
  const row = value as Record<string, unknown>;
  const field = path.endsWith("/maincitypos") ? "main" : path.endsWith("/maincityeffect") ? "maincityeffect" : "rows";
  if (path.endsWith("/createmaincitybtn")) {
    if (!row.act || typeof row.act !== "object" || Array.isArray(row.act)) throw new Error("配置缺少 act：" + path);
  } else if (!Array.isArray(row[field])) throw new Error("配置缺少 " + field + "：" + path);
}

export const remakeConfig = new GroupedConfig(path => ConfigLoader.loadJson(path), validateRemakeConfig);
export const prepareStartupConfig = (progress?: (done: number, total: number) => void) =>
  remakeConfig.prepare(REMAKE_CONFIG_GROUPS.startup, progress);
export const prepareCityConfig = () => remakeConfig.prepare(REMAKE_CONFIG_GROUPS.city);
export const prepareHeroConfig = () => remakeConfig.prepare(REMAKE_CONFIG_GROUPS.hero);
export const prepareInventoryConfig = () => remakeConfig.prepare(REMAKE_CONFIG_GROUPS.inventory);

export function readCityGates(): GateSnapshot | null {
  const open = remakeConfig.get<ConfigTableFile<OpenConditionRow>>("config/opencondition");
  const system = remakeConfig.get<ConfigTableFile<SystemGateRow>>("config/system_gate");
  return open && system ? { opencondition: open.rows, systemGate: system.rows } : null;
}
