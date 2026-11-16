/**
 * 通用实际奖励明细的显示投影：只校验并保留正实际到账，保持服务端条目顺序。
 * 奖励窗调用此工具，不查询库存、不合并独立实例、不计算或补发奖励。
 */
import type { RewardArgs, RewardRow } from "../data/RewardData";
import type { RewardNotice, RewardNoticeMode } from "../data/RewardNoticeData";
import { GameProtocolCodecUtils } from "../../../platform/GameProtocolCodecUtils";

export class RewardUtils {
    /** 无状态显示工具不能实例化。 */
    private constructor() {
    }

    /** 校验原请求和实际明细；零到账明确不显示，重复配置或坏数量拒绝整批。 */
    public static rows(args: RewardArgs): readonly RewardRow[] {
        if (!args || typeof args.receiptId !== "string"
            || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.receiptId)
            || !Array.isArray(args.items)) {
            throw new Error("奖励展示参数无效");
        }
        const seen = new Set<number>();
        const rows: RewardRow[] = [];
        for (const item of args.items) {
            if (!item || !Number.isSafeInteger(item.itemId) || item.itemId <= 0
                || !Number.isSafeInteger(item.credited) || item.credited < 0 || seen.has(item.itemId)) {
                throw new Error("实际到账展示明细无效");
            }
            seen.add(item.itemId);
            if (item.credited > 0) {
                rows.push(Object.freeze({ itemId: item.itemId, quantity: item.credited }));
            }
        }
        return Object.freeze(rows);
    }

    /**
     * 已匹配原请求的持久实际回执投影为共享反馈；完成回执和统一状态双确认后才可交付展示。
     * 只累计items.credited及另列的升级附赠，不用余额差计算，也不把理论量或实例重复计入。
     */
    public static fromActual(receiptId: string, assetRevision: number, value: unknown,
        mode: RewardNoticeMode = "POPUP"): RewardNotice | null {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("奖励回执实际结果无效");
        }
        const actual = value as Record<string, unknown>;
        if (!Array.isArray(actual.items) || !Array.isArray(actual.bonuses)) {
            throw new Error("奖励回执缺少实际明细或附赠明细");
        }
        const quantities = new Map<number, number>();
        for (const raw of actual.items) {
            RewardUtils.mergeActual(quantities, raw, "credited");
        }
        for (const raw of actual.bonuses) {
            RewardUtils.mergeActual(quantities, raw, "quantity");
        }
        if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(receiptId)
            || !Number.isSafeInteger(assetRevision) || assetRevision <= 0
            || typeof actual.roleId !== "string" || !actual.roleId || actual.roleId.length > 128
            || /[\u0000-\u001f\u007f]/.test(actual.roleId)
            || !["SILENT", "POPUP", "TIPS"].includes(mode)) {
            throw new Error("奖励回执编号、归属或版本无效");
        }
        if (quantities.size === 0) {
            return null;
        }
        const notice = {
            schemaVersion: 1 as const,
            receiptId,
            roleId: actual.roleId as string,
            assetRevision,
            mode,
            items: Object.freeze(Array.from(quantities, ([itemId, credited]) => Object.freeze({ itemId, credited }))),
        };
        GameProtocolCodecUtils.validateRewardNotice(notice);
        return Object.freeze(notice);
    }

    /** 按服务端实际字段精确累加同配置奖励，零到账跳过，溢出或坏记录拒绝整批。 */
    private static mergeActual(quantities: Map<number, number>, raw: unknown, field: "credited" | "quantity"): void {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            throw new Error("奖励实际明细对象无效");
        }
        const item = raw as Record<string, unknown>;
        const itemId = item.itemId as number;
        const quantity = item[field] as number;
        if (!Number.isSafeInteger(itemId) || itemId <= 0 || itemId > 0xffffffff
            || !Number.isSafeInteger(quantity) || quantity < 0) {
            throw new Error("奖励实际数量无效");
        }
        if (quantity === 0) {
            return;
        }
        const total = (quantities.get(itemId) || 0) + quantity;
        if (!Number.isSafeInteger(total)) {
            throw new Error("奖励实际数量合计超出安全范围");
        }
        quantities.set(itemId, total);
    }
}
