/** 主线结算展示计算：只消费已校验战报统计与历史经验快照，不重算战斗或修改角色资产。 */
import { BattleReplayUnit } from "./BattleReplayUtils";
import { MainChapterExperience, MainChapterRewardActual } from "../MainChapterModel";
import { RewardUtils } from "../../reward/utils/RewardUtils";
import type { RewardExperienceGain } from "../../reward/data/RewardData";

export class ChapterSettlementUtils {
    /** 无状态工具，不保存页面或账号状态。 */
    private constructor() {}

    /**
     * 校验新回执实际明细与基础列表、历史经验和钱包的自洽关系，只冻结展示所需的来源与数量。
     * 缺失由调用方作为旧记录处理；存在但损坏必须拒绝整包，不能静默退回基础列表。
     */
    public static readActual(value: unknown, rewards: readonly { itemId: number; quantity: number }[],
        experience: MainChapterExperience | undefined): MainChapterRewardActual {
        const actual = ChapterSettlementUtils.object(value);
        if (typeof actual.roleId !== "string" || !actual.roleId || actual.roleId.length > 128
            || /[\u0000-\u001f\u007f]/.test(actual.roleId)
            || !Array.isArray(actual.items) || !Array.isArray(actual.bonuses)
            || !Array.isArray(actual.experience)) {
            throw new Error("主线实际奖励格式或归属无效");
        }
        const ids = new Set<number>();
        const items = actual.items.map(raw => {
            const row = ChapterSettlementUtils.object(raw);
            const itemId = ChapterSettlementUtils.amount(row.itemId, true);
            const requested = ChapterSettlementUtils.amount(row.requested, true);
            const credited = ChapterSettlementUtils.amount(row.credited);
            const ignored = ChapterSettlementUtils.amount(row.ignored);
            if (itemId > 0xffffffff || ids.has(itemId) || credited > requested || requested - credited !== ignored
                || !["NONE", "ROLE_MAX_LEVEL", "TAVERN_CAP"].includes(row.reason as string)
                || (ignored === 0) !== (row.reason === "NONE")
                || (row.reason === "ROLE_MAX_LEVEL" && itemId !== 900003)
                || (row.reason === "TAVERN_CAP" && itemId !== 900401)) {
                throw new Error("主线基础实际奖励与减少原因不一致");
            }
            ids.add(itemId);
            return Object.freeze({ itemId, requested, credited, ignored,
                reason: row.reason as MainChapterRewardActual["items"][number]["reason"] });
        });
        const positive = items.filter(item => item.credited > 0);
        if (positive.length !== rewards.length || positive.some((item, index) =>
            item.itemId !== rewards[index].itemId || item.credited !== rewards[index].quantity)) {
            throw new Error("主线基础列表与实际到账明细不一致");
        }
        const bonuses = actual.bonuses.map(raw => {
            const row = ChapterSettlementUtils.object(raw);
            if (row.source !== "ROLE_LEVEL_UP" || row.itemId !== 900002) {
                throw new Error("主线附赠奖励来源未支持");
            }
            return Object.freeze({ source: "ROLE_LEVEL_UP" as const, itemId: 900002,
                quantity: ChapterSettlementUtils.amount(row.quantity, true) });
        });
        const bonusDiamonds = ChapterSettlementUtils.total(bonuses.map(row => row.quantity));
        const gains = actual.experience.map(raw => ChapterSettlementUtils.object(raw));
        if (gains.length > 1) {
            throw new Error("主线经验实际明细重复");
        }
        const gainedDiamonds = ChapterSettlementUtils.total(gains.map(row => ChapterSettlementUtils.amount(row.diamonds)));
        if (bonusDiamonds !== gainedDiamonds) {
            throw new Error("主线升级附赠与经验明细不一致");
        }
        const experienceItem = items.find(row => row.itemId === 900003);
        if (!!experienceItem !== (gains.length === 1) || !experience) {
            throw new Error("主线实际奖励缺少历史经验明细");
        }
        if (gains.length) {
            const gain = gains[0];
            if (gain.beforeLevel !== experience.beforeLevel || gain.beforeExperience !== experience.beforeExp
                || gain.level !== experience.afterLevel || gain.experience !== experience.afterExp
                || gain.requested !== experienceItem!.requested || gain.accepted !== experienceItem!.credited
                || gain.ignored !== experienceItem!.ignored
                || (bonusDiamonds > 0 && experience.afterLevel <= experience.beforeLevel)) {
                throw new Error("主线实际发放与历史经验快照不一致");
            }
        }
        const wallet = ChapterSettlementUtils.object(actual.wallet);
        const goldBefore = ChapterSettlementUtils.amount(wallet.goldBefore);
        const goldAfter = ChapterSettlementUtils.amount(wallet.goldAfter);
        const diamondsBefore = ChapterSettlementUtils.amount(wallet.diamondsBefore);
        const diamondsAfter = ChapterSettlementUtils.amount(wallet.diamondsAfter);
        if (goldAfter - goldBefore !== (items.find(row => row.itemId === 900001)?.credited || 0)
            || diamondsAfter - diamondsBefore !== ChapterSettlementUtils.total([
                items.find(row => row.itemId === 900002)?.credited || 0, bonusDiamonds])) {
            throw new Error("主线实际奖励与冻结钱包明细不一致");
        }
        RewardUtils.roleUpgrade(actual.experience);
        const frozenExperience = gains.map(gain => Object.freeze({
            beforeLevel: gain.beforeLevel,
            beforeExperience: gain.beforeExperience,
            requested: gain.requested,
            accepted: gain.accepted,
            ignored: gain.ignored,
            level: gain.level,
            experience: gain.experience,
            diamonds: gain.diamonds,
        } as RewardExperienceGain));
        return Object.freeze({ roleId: actual.roleId, items: Object.freeze(items),
            bonuses: Object.freeze(bonuses), experience: Object.freeze(frozenExperience) });
    }

    /** 非空普通对象才可作为可信回执结构，数组与null均明确拒绝。 */
    private static object(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("主线实际奖励对象无效");
        }
        return value as Record<string, unknown>;
    }

    /** 校验回执的非负安全整数；positive为true时要求严格大于0。 */
    private static amount(value: unknown, positive = false): number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
            throw new Error("主线实际奖励数量无效");
        }
        return value;
    }

    /** 合计真实明细并拒绝超出JS精确范围；不通过钱包差反推奖励。 */
    private static total(values: readonly number[]): number {
        return values.reduce((sum, value) => {
            const next = sum + value;
            if (!Number.isSafeInteger(next)) {
                throw new Error("主线实际奖励合计超出安全范围");
            }
            return next;
        }, 0);
    }

    /** 按同源配置将冻结头像映射到开战骨骼；进化使用显式fashion字段，不按当前名册或星级反推。缺失返回null。 */
    public static historicalSpine(portrait: number | null,
        skins: readonly { skin: string }[],
        evolutions: readonly { evolve_icon_id: number; evolve_fashion_id: number }[]): string | null {
        if (portrait == null) {
            return null;
        }
        const evolution = evolutions.find(row => row.evolve_icon_id === portrait);
        if (evolution) {
            if (!Number.isSafeInteger(evolution.evolve_fashion_id) || evolution.evolve_fashion_id <= 0) {
                throw new Error("历史进化骨骼配置无效");
            }
            return String(evolution.evolve_fashion_id);
        }
        for (const row of skins) {
            const values: unknown = JSON.parse(row.skin);
            if (!Array.isArray(values) || !values.every(value => Number.isSafeInteger(value) && value > 0)) {
                throw new Error("历史星级骨骼配置无效");
            }
            const skin = values.find(value => value + 10000000 === portrait);
            if (skin !== undefined) {
                return String(skin);
            }
        }
        return null;
    }

    /** 沿旧版只比较攻方且严格大于才替换；全部为0选择首人，任一统计缺失则不伪造排名。 */
    public static highestDamage(units: readonly BattleReplayUnit[]): BattleReplayUnit | null {
        const allies = units.filter(unit => unit.faction === 1);
        if (!allies.length || allies.some(unit => unit.totalDamage == null)) {
            return null;
        }
        return allies.reduce((best, unit) => unit.totalDamage! > best.totalDamage! ? unit : best);
    }

    /**
     * 将发奖前后快照映射为1秒经验动画；跨多级时从同源门槛表读取中间等级，不反推当前角色状态。
     * progress为0到1，结束严格使用回执终值；最高级门槛为0时进度显示满。
     */
    public static experienceFrame(snapshot: MainChapterExperience, progress: number,
        threshold: (level: number) => number): { level: number; exp: number; threshold: number; ratio: number } {
        const frame = (level: number, exp: number, limit: number) => ({
            level, exp, threshold: limit, ratio: limit === 0 ? 1 : Math.min(1, exp / limit),
        });
        if (progress >= 1) {
            return frame(snapshot.afterLevel, snapshot.afterExp, snapshot.afterThreshold);
        }
        const limits: number[] = [];
        for (let level = snapshot.beforeLevel; level < snapshot.afterLevel; level++) {
            const limit = level === snapshot.beforeLevel ? snapshot.beforeThreshold : threshold(level);
            if (!Number.isSafeInteger(limit) || limit <= 0) {
                throw new Error("结算经验中间等级门槛缺失：" + level);
            }
            limits.push(limit);
        }
        const gained = limits.reduce((sum, limit) => sum + limit, 0) + snapshot.afterExp - snapshot.beforeExp;
        if (!Number.isSafeInteger(gained) || gained < 0) {
            throw new Error("结算经验前后值不连续");
        }
        let exp = snapshot.beforeExp + Math.floor(gained * Math.max(0, progress));
        let level = snapshot.beforeLevel;
        for (const limit of limits) {
            if (exp < limit) {
                return frame(level, exp, limit);
            }
            exp -= limit;
            level++;
        }
        return frame(level, exp, snapshot.afterThreshold);
    }
}
