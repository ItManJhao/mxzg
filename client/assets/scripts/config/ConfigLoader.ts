import { JsonAsset, resources } from "cc";
import { bindConfigTables } from "./bindTables";
import { ConfigTableFile, OpenConditionRow, SystemGateRow } from "./types";

/**
 * 读 assets/resources/config 下的 JSON。
 * 路径相对 resources，不带扩展名。源表在仓库 config/gameconfig，见同目录 README.md。
 * 运行时不读 xlsx。
 */
export const CONFIG_PATHS = {
  manifest: "config/manifest",
  opencondition: "config/opencondition",
  systemGate: "config/system_gate",
};

const LOAD_BATCH = 24;

/** 缺任何一张就整次 loadAll 失败，不把半套表交给后面的界面。 */
export const CORE_CONFIG_TABLES = ["opencondition", "system_gate", "language", "chapter", "version", "loadingtips"];

export type ConfigLoadProgress = (loaded: number, total: number) => void;

export class ConfigDb {
  static current: ConfigDb | null = null;
  opencondition: OpenConditionRow[] = [];
  systemGate: SystemGateRow[] = [];
  tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tableCount = 0;
  rowCount = 0;
}

export class ConfigLoader {
  static loadJson<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      resources.load(path, JsonAsset, (err, asset) => {
        if (err || !asset || asset.json == null) {
          reject(err ?? new Error("missing json " + path));
          return;
        }
        resolve(asset.json as T);
      });
    });
  }

  static async loadAll(onProgress?: ConfigLoadProgress): Promise<ConfigDb> {
    const manifest = await ConfigLoader.loadJson<{ tables?: unknown }>(CONFIG_PATHS.manifest);
    const names = Array.isArray(manifest.tables)
      ? manifest.tables.filter((name): name is string => typeof name === "string" && name.length > 0)
      : [];
    const db = new ConfigDb();
    const coreFailed: string[] = [];
    let failed = 0;
    let finished = 0;
    const total = names.length;
    if (onProgress) onProgress(0, total);
    for (let i = 0; i < CORE_CONFIG_TABLES.length; i++) {
      if (names.indexOf(CORE_CONFIG_TABLES[i]) < 0) coreFailed.push(CORE_CONFIG_TABLES[i]);
    }
    for (let i = 0; i < names.length; i += LOAD_BATCH) {
      const slice = names.slice(i, i + LOAD_BATCH);
      const loaded = await Promise.all(
        slice.map(async (name) => {
          try {
            const file = await ConfigLoader.loadJson<ConfigTableFile<Record<string, unknown>>>("config/" + name);
            return { name, file };
          } catch (err) {
            failed += 1;
            if (CORE_CONFIG_TABLES.indexOf(name) >= 0) coreFailed.push(name);
            else console.warn("[Config] skip " + name);
            return null;
          } finally {
            finished += 1;
            if (onProgress) onProgress(finished, total);
          }
        })
      );
      for (let n = 0; n < loaded.length; n++) {
        const item = loaded[n];
        if (!item) continue;
        db.tables.set(item.name, item.file);
        db.rowCount += Array.isArray(item.file.rows) ? item.file.rows.length : 0;
      }
    }
    if (coreFailed.length > 0) {
      throw new Error("核心配置读取失败：" + coreFailed.join("、"));
    }
    const opencondition = db.tables.get("opencondition");
    const systemGate = db.tables.get("system_gate");
    if (!opencondition || !systemGate) {
      throw new Error("核心配置读取失败：opencondition、system_gate");
    }
    db.opencondition = Array.isArray(opencondition.rows) ? (opencondition.rows as unknown as OpenConditionRow[]) : [];
    db.systemGate = Array.isArray(systemGate.rows) ? (systemGate.rows as unknown as SystemGateRow[]) : [];
    db.tableCount = db.tables.size;
    bindConfigTables(db.tables);
    ConfigDb.current = db;
    console.log(
      "[Config] loaded tables=" +
        db.tableCount +
        " rows=" +
        db.rowCount +
        " opencondition=" +
        db.opencondition.length +
        " system_gate=" +
        db.systemGate.length +
        " failed=" +
        failed
    );
    return db;
  }
}
