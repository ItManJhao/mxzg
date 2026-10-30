/** gm.json 里拿来放进调试面板的命令。道具页没有 gm_command，加道具另走 ADD_ITEM。 */
export const GM_PANEL_COMMANDS = ["ROLE_LV", "ALL_HERO", "ALL_EQUIP"];

/** 和 ADD_HERO 同一条 c2s 2015。gm.xlsx 道具页的命令列是空的，面板上写明这条名字。 */
export const GM_ITEM_COMMAND = "ADD_ITEM";

export interface GmTableOp {
  title: string;
  tab: string;
  command: string;
  params: string[];
}

/** 表没加载到时仍能点这几条。数字和 gm.json 里 ROLE_LV / ALL_HERO / ALL_EQUIP 一致。 */
export const GM_FALLBACK_OPS: GmTableOp[] = [
  { title: "等级+1", tab: "角色", command: "ROLE_LV", params: ["1"] },
  { title: "等级+10", tab: "角色", command: "ROLE_LV", params: ["10"] },
  { title: "等级+100", tab: "角色", command: "ROLE_LV", params: ["100"] },
  { title: "所有英雄", tab: "角色", command: "ALL_HERO", params: [] },
  { title: "所有装备", tab: "角色", command: "ALL_EQUIP", params: [] },
];

/** gm 表 param 列。`[1]` 拆成字符串参数。空着表示没有参数。解不开返回 null。 */
export function parseGmParams(raw: unknown): string[] | null {
  if (raw === undefined || raw === null || raw === "") return [];
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return [];
  if (text.charAt(0) !== "[") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (_err) {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out: string[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (typeof item === "number" && Number.isFinite(item)) out.push(String(item));
    else if (typeof item === "string" && item) out.push(item);
    else return null;
  }
  return out;
}

/** 只留下带 gm_command 的行。命令名不是大写标识、或 param 解不开的行丢掉。 */
export function readGmTableOps(rows: unknown): GmTableOp[] {
  if (!Array.isArray(rows)) return [];
  const out: GmTableOp[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { gm_command?: unknown; param?: unknown; title?: unknown; tab_title?: unknown };
    const command = typeof rec.gm_command === "string" ? rec.gm_command.trim() : "";
    if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(command)) continue;
    const params = parseGmParams(rec.param);
    if (!params) continue;
    const title = typeof rec.title === "string" && rec.title ? rec.title : command;
    const tab = typeof rec.tab_title === "string" ? rec.tab_title : "";
    out.push({ title, tab, command, params });
  }
  return out;
}

/** 面板上的等级、全体英雄、全体装备。表里有就用表，整表没有才用内置三档。 */
export function gmPanelOps(rows: unknown): GmTableOp[] {
  const fromTable = readGmTableOps(rows).filter((op) => GM_PANEL_COMMANDS.indexOf(op.command) >= 0);
  if (fromTable.length > 0) return fromTable;
  return GM_FALLBACK_OPS.slice();
}
