/** 主线结算展示计算：只消费已校验战报统计与历史经验快照，不重算战斗或修改角色资产。 */
import { BattleReplayUnit } from "./BattleReplayUtils";
import { MainChapterExperience } from "../MainChapterModel";

export class ChapterSettlementUtils {
    /** 无状态工具，不保存页面或账号状态。 */
    private constructor() {}

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
