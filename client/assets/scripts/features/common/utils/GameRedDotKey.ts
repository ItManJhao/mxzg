/** 当前已接入的游戏红点路径。父级由通用管理器按点分路径汇总。 */
export class GameRedDotKey {
    /** 主城底栏入口。 */
    public static readonly CITY = "city";
    /** 英雄底栏入口，汇总主线阵容。 */
    public static readonly HERO = "hero";
    /** 英雄详情分支，按英雄实例和槽位显示。 */
    public static readonly HERO_DETAIL = "heroDetail";
    /** 宝石和神装仅汇总到各自详情页签，独立于名册提示。 */
    public static readonly HERO_GROWTH = "heroGrowth";
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
    /** 两处任务入口汇总可领取的每日、活跃或成就奖励。 */
    public static readonly QUEST = "quest";
    /** 召唤法阵入口。 */
    public static readonly SUMMON = "city.summon";
    /** 创造法阵至少有一项配方的本体、素材和费用准备齐全。 */
    public static readonly HERO_CREATION = "city.heroCreation";
    /** 普通单抽免费。 */
    public static readonly SUMMON_NORMAL = "city.summon.normal";
    /** 高级单抽免费。 */
    public static readonly SUMMON_ADVANCED = "city.summon.advanced";
    /** 召唤积分可以兑换。 */
    public static readonly SUMMON_POINTS = "city.summon.points";
    /** 日常副本底栏入口。 */
    public static readonly DUNGEON = "dungeon";
    /** 日常副本大厅汇总所有已接通的副本类型。 */
    public static readonly DAILY_DUNGEON = "dungeon.daily";
    /** 金币副本仍有可用的免费挑战或扫荡。 */
    public static readonly GOLD_DUNGEON = "dungeon.daily.gold";
    /** 经验副本仍有可用的免费挑战或扫荡。 */
    public static readonly EXPERIENCE_DUNGEON = "dungeon.daily.experience";
    /** 英雄副本仍有可用的免费挑战或扫荡。 */
    public static readonly HERO_DUNGEON = "dungeon.daily.hero";
    /** 羁绊副本仍有可用的免费挑战或扫荡。 */
    public static readonly FETTER_DUNGEON = "dungeon.daily.fetter";
    /** 精灵副本仍有可用的免费挑战或扫荡。 */
    public static readonly SPIRIT_DUNGEON = "dungeon.daily.spirit";
    /** 公会底栏入口，汇总当前角色可处理的公会提醒。 */
    public static readonly GUILD = "guild";
    /** 会长有尚未处理的入会申请。 */
    public static readonly GUILD_APPLICATIONS = "guild.applications";
    /** 今日尚可捐献或全会贡献已解锁本人可领宝箱。 */
    public static readonly GUILD_DONATION = "guild.donation";
    /** VIP 底栏入口，汇总本档任务提醒。 */
    public static readonly VIP = "vip";
    /** 当前档位至少一项任务已达且未领。 */
    public static readonly VIP_TASKS = "vip.tasks";

    /** 键表通过静态字段读取。 */
    private constructor() {}

    /** 返回指定英雄实例的升级和强化进阶共用红点。 */
    public static heroUpgrade(heroId: string): string {
        return `${GameRedDotKey.heroDetail(heroId)}.upgrade`;
    }

    /** 返回升星页签、名册格和底栏共用的升星红点来源。 */
    public static heroStar(heroId: string): string {
        return `${GameRedDotKey.heroDetail(heroId)}.star`;
    }

    /** 返回指定英雄装备分支，或 1 至 4 号普通槽位的红点。 */
    public static heroEquipment(heroId: string, slot?: number): string {
        const parent = `${GameRedDotKey.heroDetail(heroId)}.equipment`;
        return slot === undefined ? parent : `${parent}.${slot}`;
    }

    /** 返回宝石页签或指定宝石槽位的红点路径。 */
    public static heroJewel(heroId: string, slot?: number): string {
        const parent = `${GameRedDotKey.HERO_GROWTH}.${GameRedDotKey.heroKey(heroId)}.jewel`;
        return slot === undefined ? parent : `${parent}.${slot}`;
    }

    /** 返回神装页签或指定神装槽位的红点路径。 */
    public static heroGodEquipment(heroId: string, slot?: number): string {
        const parent = `${GameRedDotKey.HERO_GROWTH}.${GameRedDotKey.heroKey(heroId)}.godEquipment`;
        return slot === undefined ? parent : `${parent}.${slot}`;
    }

    /** 返回可合成碎片配置的红点路径。 */
    public static bagPiece(itemId: number): string {
        return `${GameRedDotKey.BAG_PIECES}.${itemId}`;
    }

    /** 返回当前英雄的详情汇总路径，转义实例 ID 中的字面点。 */
    public static heroDetail(heroId: string): string {
        return `${GameRedDotKey.HERO_DETAIL}.${GameRedDotKey.heroKey(heroId)}`;
    }

    /** 实例 ID 中的字面点不参与红点路径分层。 */
    private static heroKey(heroId: string): string {
        return encodeURIComponent(heroId).replace(/\./g, "%2E");
    }
}
