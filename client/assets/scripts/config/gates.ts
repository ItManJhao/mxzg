import { OpenConditionRow, SystemGateRow } from "./types";

/**
 * 入口是否可进。
 * - condition_type=1：主线等级不够则关（opencondition）
 * - open_server_day>0：开服自然日未到则关（幻魔塔这类）
 * 未知 condition_type 只检查开服日，避免误关。
 */
export function isEntryOpen(row: OpenConditionRow, level: number, openServerDay: number): boolean {
  if (row.condition_type === 1 && level < row.level) return false;
  if (row.open_server_day > 0 && openServerDay < row.open_server_day) return false;
  return true;
}

/** system.xlsx 的开服日门槛。open_server_day=0 表示开服即可。 */
export function isServerGateOpen(row: SystemGateRow, openServerDay: number): boolean {
  return openServerDay >= row.open_server_day;
}

export function listOpenEntries(
  rows: OpenConditionRow[],
  level: number,
  openServerDay: number
): OpenConditionRow[] {
  return rows.filter((row) => isEntryOpen(row, level, openServerDay));
}

export function listOpenGates(rows: SystemGateRow[], openServerDay: number): SystemGateRow[] {
  return rows.filter((row) => isServerGateOpen(row, openServerDay));
}
