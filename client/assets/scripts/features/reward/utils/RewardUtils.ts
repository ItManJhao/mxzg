/**
 * 通用实际奖励明细的显示投影：只校验并保留正实际到账，保持服务端条目顺序。
 * 奖励窗调用此工具，不查询库存、不合并独立实例、不计算或补发奖励。
 */
import type { RewardArgs, RewardRow, RoleUpgradeData } from "../data/RewardData";
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
     * 默认累计items.credited及另列升级附赠；bonuses范围用于基础奖励已在原业务页展示后的独立附赠反馈。
     * 不用余额差计算，也不把理论量或实例重复计入。
     */
    public static fromActual(receiptId: string, assetRevision: number, value: unknown,
        mode: RewardNoticeMode = "POPUP", part: "all" | "bonuses" = "all"): RewardNotice | null {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("奖励回执实际结果无效");
        }
        const actual = value as Record<string, unknown>;
        if (!Array.isArray(actual.items) || !Array.isArray(actual.bonuses)) {
            throw new Error("奖励回执缺少实际明细或附赠明细");
        }
        const quantities = new Map<number, number>();
        const baseQuantities = part === "all" ? quantities : new Map<number, number>();
        if (part !== "all" && part !== "bonuses") {
            throw new Error("奖励回执显示范围无效");
        }
        for (const raw of actual.items) {
            // 即使基础量已在胜利页显示，仍验证其格式；附赠范围不重复加入基础奖励。
            RewardUtils.mergeActual(baseQuantities, raw, "credited");
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
        const roleUpgrade = RewardUtils.roleUpgrade(actual.experience);
        if (quantities.size === 0 && !roleUpgrade) {
            return null;
        }
        const notice = {
            schemaVersion: 1 as const,
            receiptId,
            roleId: actual.roleId as string,
            assetRevision,
            mode,
            items: Object.freeze(Array.from(quantities, ([itemId, credited]) => Object.freeze({ itemId, credited }))),
            ...(roleUpgrade ? { roleUpgrade } : {}),
        };
        GameProtocolCodecUtils.validateRewardNotice(notice);
        return Object.freeze(notice);
    }

    /**
     * 将真实经验明细的连续历史链投影为前后等级；未升级或旧结果没有经验字段返回undefined。
     * 存在的明细必须完整、自洽并前后连续，不能以钻石附赠或当前快照猜测升级。
     */
    public static roleUpgrade(value: unknown): RoleUpgradeData | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (!Array.isArray(value)) {
            throw new Error("奖励历史经验明细无效");
        }
        let firstLevel = 0;
        let previousLevel = 0;
        let previousExperience = 0;
        for (const raw of value) {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
                throw new Error("奖励历史经验条目无效");
            }
            const gain = raw as Record<string, number>;
            if (![gain.beforeLevel, gain.level].every(level => Number.isSafeInteger(level)
                && level > 0 && level <= 0xffffffff)
                || ![gain.beforeExperience, gain.requested, gain.accepted, gain.ignored, gain.experience, gain.diamonds]
                    .every(amount => Number.isSafeInteger(amount) && amount >= 0)
                || gain.requested <= 0 || gain.accepted > gain.requested
                || gain.requested - gain.accepted !== gain.ignored || gain.level < gain.beforeLevel
                || (gain.level === gain.beforeLevel && gain.diamonds !== 0)
                || (gain.level > gain.beforeLevel && gain.accepted === 0)
                || (previousLevel !== 0
                    && (gain.beforeLevel !== previousLevel || gain.beforeExperience !== previousExperience))) {
                throw new Error("奖励历史经验链或实际数量不一致");
            }
            if (firstLevel === 0) {
                firstLevel = gain.beforeLevel;
            }
            previousLevel = gain.level;
            previousExperience = gain.experience;
        }
        return previousLevel > firstLevel
            ? Object.freeze({ beforeLevel: firstLevel, afterLevel: previousLevel }) : undefined;
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
