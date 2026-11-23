/** 当前已接入的游戏红点路径。父级由通用管理器按点分路径汇总。 */
export class GameRedDotKey {
    /** 主城底栏入口。 */
    public static readonly CITY = "city";
    /** 英雄底栏入口，汇总主线阵容。 */
    public static readonly HERO = "hero";
    /** 英雄详情分支，按英雄实例和槽位显示。 */
    public static readonly HERO_DETAIL = "heroDetail";
    /** 背包底栏入口。 */
    public static readonly BAG = "bag";
    /** 碎片分类及其可合成格子。 */
    public static readonly BAG_PIECES = "bag.pieces";
    /** 战斗入口及可领取奖励。 */
    public static readonly BATTLE = "battle";
    /** 通关奖励按钮。 */
    public static readonly CHAPTER_CLEAR = "battle.clearReward";
    /** 里程碑领奖按钮。 */
    public static readonly CHAPTER_MILESTONE = "battle.milestone";
    /** 召唤法阵入口。 */
    public static readonly SUMMON = "city.summon";
    /** 普通单抽免费。 */
    public static readonly SUMMON_NORMAL = "city.summon.normal";
    /** 高级单抽免费。 */
    public static readonly SUMMON_ADVANCED = "city.summon.advanced";
    /** 召唤积分可以兑换。 */
    public static readonly SUMMON_POINTS = "city.summon.points";
    /** 日常副本底栏入口。 */
    public static readonly DUNGEON = "dungeon";
    /** 日常副本大厅的金币副本。 */
    public static readonly GOLD_DUNGEON = "dungeon.gold";

    /** 键表通过静态字段读取。 */
    private constructor() {}

    /** 返回指定英雄实例的升级和强化进阶共用红点。 */
    public static heroUpgrade(heroId: string): string {
        return `${GameRedDotKey.heroDetail(heroId)}.upgrade`;
    }

    /** 返回指定英雄装备分支，或 1 至 4 号普通槽位的红点。 */
    public static heroEquipment(heroId: string, slot?: number): string {
        const parent = `${GameRedDotKey.heroDetail(heroId)}.equipment`;
        return slot === undefined ? parent : `${parent}.${slot}`;
    }

    /** 返回可合成碎片配置的红点路径。 */
    public static bagPiece(itemId: number): string {
        return `${GameRedDotKey.BAG_PIECES}.${itemId}`;
    }

    /** 返回当前英雄的详情汇总路径，转义实例 ID 中的字面点。 */
    public static heroDetail(heroId: string): string {
        return `${GameRedDotKey.HERO_DETAIL}.${encodeURIComponent(heroId).replace(/\./g, "%2E")}`;
    }
}
