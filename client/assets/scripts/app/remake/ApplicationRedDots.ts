/**
 * 用当前角色已提交的数据驱动游戏红点。启动装配负责订阅和清理，
 * 红点树只保存显隐，模块 Model 仍是玩法数据的唯一来源。
 */
import { CityNavigationUtils } from "../../config/CityNavigationUtils";
import { EntryGateUtils } from "../../config/EntryGateUtils";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import { ServerClock } from "../../core/ServerClock";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { RedDotManager } from "../../framework/ui/RedDotManager";
import type { AccountModel } from "../../features/account/AccountModel";
import { BagModel } from "../../features/bag/BagModel";
import { HeroPieceComposeUtils } from "../../features/bag/utils/HeroPieceComposeUtils";
import { MainChapterController } from "../../features/battle/MainChapterController";
import { MainChapterModel } from "../../features/battle/MainChapterModel";
import { MainChapterRedDotUtils } from "../../features/battle/utils/MainChapterRedDotUtils";
import { GameRedDotKey } from "../../features/common/utils/GameRedDotKey";
import { DAILY_DUNGEON_ENTRIES, DailyDungeonController } from "../../features/dungeon/DailyDungeonController";
import { DAILY_DUNGEON_KINDS, DailyDungeonModel, type DailyDungeonKind } from "../../features/dungeon/DailyDungeonModel";
import { FirstSummonData } from "../../features/hero/data/FirstSummonData";
import { HeroRosterModel } from "../../features/hero/HeroRosterModel";
import { HeroCreationUtils } from "../../features/hero/utils/HeroCreationUtils";
import { HeroRedDotUtils } from "../../features/hero/utils/HeroRedDotUtils";
import { QuestModel } from "../../features/quest/QuestModel";
import { RankingModel } from "../../features/ranking/RankingModel";
import { FriendModel } from "../../features/friend/FriendModel";
import { ChatModel } from "../../features/chat/ChatModel";
import { MailModel } from "../../features/mail/MailModel";
import { VipModel } from "../../features/vip/VipModel";

export class ApplicationRedDots {
    /** 主城就绪且配置可读取时才投影业务状态。 */
    private ready = false;
    /** 当前角色唯一的时间刷新任务，离开游戏根页时清理。 */
    private clockTask: ReturnType<typeof setInterval> | null = null;
    /** 副本列表影响资格的等级、阵容版本及上阵战力，供合并同一状态的后台查询。 */
    private dungeonInputs = "";
    /** 各副本下一次允许补读的服务器 Unix 秒，读取到有效状态后移除对应限制。 */
    private readonly nextDungeonRefresh = new Map<DailyDungeonKind, number>();
    /** 主线进度监听在应用退出时解除。 */
    private readonly unbindChapter: () => void;
    /** 任务快照变化后重算共用入口红点，随应用解除。 */
    private readonly unbindQuest: () => void;
    /** 排行总览变化后重算主城入口的点赞红点。 */
    private readonly unbindRanking: () => void;
    /** 好友通知和收件箱通知各有独立的解绑。 */
    private readonly unbindSocial: readonly (() => void)[];

    /**
     * 监听玩法及社交快照，等待场景装配完成后再读配置。
     * @param account 当前应用的角色快照，用于入口等级和升级金币。
     */
    public constructor(private readonly account: AccountModel) {
        this.unbindChapter = EventDispatcher.instance.on(MainChapterController.Updated, this, this.refreshChapter);
        this.unbindQuest = EventDispatcher.instance.on("quest.updated", this, this.refreshQuest);
        this.unbindRanking = EventDispatcher.instance.on("ranking.updated", this, this.refreshRanking);
        this.unbindSocial = [
            EventDispatcher.instance.on("friend.updated", this, this.refreshSocial),
            EventDispatcher.instance.on("mail.updated", this, this.refreshSocial),
            EventDispatcher.instance.on("chat.updated", this, this.refreshSocial),
        ];
    }

    /** 配置包和主城均可用后读取当前快照，启动召唤计时和副本资格补查。 */
    public setReady(ready: boolean): void {
        if (ready === this.ready) {
            return;
        }
        this.ready = ready;
        if (ready) {
            this.refreshSnapshot();
            this.refreshChapter();
            this.refreshQuest();
            this.refreshRanking();
            this.refreshSocial();
            this.clockTask = setInterval(() => {
                this.refreshSummon();
                this.refreshDungeonIfNeeded();
            }, 1_000);
        } else if (this.clockTask !== null) {
            clearInterval(this.clockTask);
            this.clockTask = null;
        }
    }

    /**
     * 角色、库存、名册和契约任务提交后重算各功能和培养页签，首次等待配置包和主城就绪。
     * @param forceDungeon 同角色鉴权恢复后重新确认独立副本资格。
     */
    public refreshSnapshot(forceDungeon = false): void {
        const role = this.account.snapshot.role;
        if (!this.ready || !role || !GameConfig.instance.getPackageVersion()) {
            return;
        }
        const manager = RedDotManager.instance;
        const roster = HeroRosterModel.instance.snapshot;
        const bag = BagModel.instance;
        const hero = HeroRedDotUtils.project(roster, bag, role);
        const creationGate = GameConfig.instance.getConfig(GConfig.OpenCondition, "main_hero_make");
        const creationReady = !!creationGate && EntryGateUtils.isEntryOpen(creationGate, role.level, 0)
            && bag.snapshot.synced && HeroCreationUtils.options(roster.heroes, id => bag.quantity(id)).some(option => option.ready);
        const pieces: Record<string, boolean> = {};
        if (bag.snapshot.synced) {
            for (const item of bag.items) {
                const definition = HeroPieceComposeUtils.definition(item.itemId);
                if (definition && item.quantity >= definition.required) {
                    pieces[GameRedDotKey.bagPiece(item.itemId)] = true;
                }
            }
        }
        EventDispatcher.batchNotifications(() => {
            manager.replaceBranch(GameRedDotKey.HERO_DETAIL, hero.details);
            manager.replaceBranch(GameRedDotKey.HERO_GROWTH, hero.growth);
            manager.set(GameRedDotKey.HERO, hero.lineupReady);
            manager.set(GameRedDotKey.HERO_CREATION, creationReady);
            manager.replaceBranch(GameRedDotKey.BAG_PIECES, pieces);
            manager.set(GameRedDotKey.VIP_TASKS, VipModel.instance.state?.tasks.some(task =>
                !task.claimed && task.progress !== undefined && task.progress >= task.target) ?? false);
            this.refreshSummon();
        });
        const gate = CityNavigationUtils.bottomGate("dungeon");
        const dailyGate = GameConfig.instance.getConfig(GConfig.OpenCondition, "main_mission");
        if (!gate || !dailyGate || !EntryGateUtils.isEntryOpen(gate, role.level, 0)
            || !EntryGateUtils.isEntryOpen(dailyGate, role.level, 0)) {
            this.dungeonInputs = "";
            for (const kind of DAILY_DUNGEON_KINDS) {
                manager.set(DAILY_DUNGEON_ENTRIES[kind].reminder, false);
            }
            return;
        }
        const deployed = new Set(roster.mainFormation?.slots.map(slot => slot.heroId));
        const power = roster.heroes.filter(hero => deployed.has(hero.id)).map(hero => hero.panelStats?.power);
        const inputs = JSON.stringify([role.level, roster.mainFormation?.version, power]);
        if (forceDungeon || this.dungeonInputs !== inputs) {
            this.dungeonInputs = inputs;
            for (const kind of DAILY_DUNGEON_KINDS) {
                if (this.dungeonAvailable(kind, role.level)) {
                    DailyDungeonController.instance.refreshReminder(kind);
                } else {
                    manager.set(DAILY_DUNGEON_ENTRIES[kind].reminder, false);
                }
            }
        }
    }

    /** 先熄灭上一角色的所有分支，再等待新角色快照和页面就绪。 */
    public resetSession(): void {
        this.setReady(false);
        this.dungeonInputs = "";
        this.nextDungeonRefresh.clear();
        RedDotManager.instance.reset();
    }

    /** 释放应用的计时和主线通知，清空该应用显示状态。 */
    public dispose(): void {
        this.unbindChapter();
        this.unbindQuest();
        this.unbindRanking();
        this.unbindSocial.forEach(stop => stop());
        this.resetSession();
    }

    /** 主线独立回包更新奖励红点，也支持登录快照的同批通知。 */
    private refreshChapter(): void {
        if (this.ready && GameConfig.instance.getPackageVersion()) {
            RedDotManager.instance.setMany(MainChapterRedDotUtils.project(MainChapterModel.instance.state));
        }
    }

    /** 任一任务或活跃档位可领时，点亮主城及战斗页上的任务入口。 */
    private refreshQuest(): void {
        if (!this.ready) {
            return;
        }
        const snapshot = QuestModel.instance.snapshot;
        const claimable = snapshot && (snapshot.daily.some(row => !row.claimed && row.current >= row.target)
            || snapshot.achievements.some(row => !row.claimed && row.current >= row.target)
            || snapshot.milestones.some(row => !row.claimed && snapshot.activityPoints >= row.points));
        RedDotManager.instance.set(GameRedDotKey.QUEST, !!claimable);
    }

    /** 本服或已开放的跨服榜有可点赞榜首时点亮主城按钮。 */
    private refreshRanking(): void {
        if (this.ready) {
            const boards = RankingModel.instance.state?.boards ?? [];
            RedDotManager.instance.set(GameRedDotKey.RANKING, boards.some(board => !!board.leader && !board.liked));
        }
    }

    /** 将服务端收件箱、好友状态及所有可访问频道的未读投影为红点。 */
    private refreshSocial(): void {
        if (!this.ready) {
            return;
        }
        const friends = FriendModel.instance.state;
        RedDotManager.instance.setMany({
            [GameRedDotKey.MAIL]: MailModel.instance.state?.entries.some(entry => !entry.read) ?? false,
            [GameRedDotKey.CHAT]: ChatModel.instance.unread() > 0,
            [GameRedDotKey.FRIEND]: !!friends && (friends.applications.length > 0
                || friends.gifts.some(gift => gift.giftState === 1)),
        });
    }

    /** 免费召唤冷却读取公共服务器时钟，积分提醒读取已同步库存。 */
    private refreshSummon(): void {
        const role = this.account.snapshot.role;
        if (!this.ready || !role || !GameConfig.instance.getPackageVersion()) {
            return;
        }
        const roster = HeroRosterModel.instance;
        const bag = BagModel.instance;
        const details = roster.snapshot.summonDetails;
        const summonGate = GameConfig.instance.getConfig(GConfig.OpenCondition, "main_summon");
        const summonOpen = !!summonGate && EntryGateUtils.isEntryOpen(summonGate, role.level, 0);
        const manager = RedDotManager.instance;
        manager.setMany({
            [GameRedDotKey.SUMMON_NORMAL]: summonOpen && roster.summonCooldown("NORMAL") === 0,
            [GameRedDotKey.SUMMON_ADVANCED]: summonOpen && roster.summonCooldown("ADVANCED") === 0,
            [GameRedDotKey.SUMMON_POINTS]: summonOpen && bag.snapshot.synced && !!details?.pointsExchangeAvailable
                && bag.quantity(FirstSummonData.POINT_ITEM_ID) >= (details.pointsCost ?? FirstSummonData.cost("POINTS", 1).item_num),
        });
    }

    /** 仅对已开放类型补读缺失或已跨日的资格，独立限频且不抢占在途读取。 */
    private refreshDungeonIfNeeded(): void {
        const now = ServerClock.instance.nowSeconds();
        const role = this.account.snapshot.role;
        if (!this.dungeonInputs || now === null || !role) {
            return;
        }
        for (const kind of DAILY_DUNGEON_KINDS) {
            if (!this.dungeonAvailable(kind, role.level)) {
                continue;
            }
            const dungeon = DailyDungeonModel.instance.stateFor(kind);
            if (dungeon && now <= dungeon.resetAtSeconds) {
                this.nextDungeonRefresh.delete(kind);
                continue;
            }
            RedDotManager.instance.set(DAILY_DUNGEON_ENTRIES[kind].reminder, false);
            if (now >= (this.nextDungeonRefresh.get(kind) ?? 0) && DailyDungeonController.instance.refreshReminder(kind, false)) {
                this.nextDungeonRefresh.set(kind, now + 60);
            }
        }
    }

    /** 只查询当前角色已满足原等级门槛的副本类型。 */
    private dungeonAvailable(kind: DailyDungeonKind, level: number): boolean {
        const gate = GameConfig.instance.getConfig(GConfig.OpenCondition, DAILY_DUNGEON_ENTRIES[kind].gate);
        return !!gate && EntryGateUtils.isEntryOpen(gate, level, 0);
    }
}
