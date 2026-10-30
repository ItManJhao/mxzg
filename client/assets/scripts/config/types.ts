/** 对齐 opencondition.xlsx 的精简行。condition_type=1 表示主线等级。 */
export interface OpenConditionRow {
  id: string;
  name: string;
  condition_type: number;
  level: number;
  /** 0 = 不按开服日卡。大于 0 时，开服自然日未到则不开（当天 = 第 1 天）。 */
  open_server_day: number;
}

/** 对齐 system.xlsx 里 *_open_day 的精简行。 */
export interface SystemGateRow {
  key: string;
  open_server_day: number;
  note?: string;
}

export interface ConfigTableFile<T> {
  table: string;
  note?: string;
  rows: T[];
}
