/** 主城入口门槛的纯判断，由nav.entryAccess查询；表类型直接使用生成契约，不维护副本。 */
import type { OpenConditionRow, SystemGateRow } from "./GConfig";
/** 根据现有等级与开服自然日判断门槛，不改变服务器规则或入口范围。 */
export class EntryGateUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /**
     * 入口是否可进。
     * - condition_type=1：主线等级不够则关（opencondition）
     * - open_server_day>0：开服自然日未到则关（幻魔塔这类）
     * 未知 condition_type 只检查开服日，避免误关。
     */
    public static isEntryOpen(row: OpenConditionRow, level: number, openServerDay: number): boolean {
        if (row.condition_type === 1 && level < row.level) {
            return false;
        }
        if (row.open_server_day > 0 && openServerDay < row.open_server_day) {
            return false;
        }
        return true;
    }

    /** system.xlsx 的开服日门槛。open_server_day=0 表示开服即可。 */
    public static isServerGateOpen(row: SystemGateRow, openServerDay: number): boolean {
        return openServerDay >= row.open_server_day;
    }
}
