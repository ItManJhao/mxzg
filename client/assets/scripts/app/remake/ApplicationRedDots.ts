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
import { DailyDungeonController } from "../../features/dungeon/DailyDungeonController";
import { DailyDungeonModel } from "../../features/dungeon/DailyDungeonModel";
import { FirstSummonData } from "../../features/hero/data/FirstSummonData";
import { HeroRosterModel } from "../../features/hero/HeroRosterModel";
import { HeroRedDotUtils } from "../../features/hero/utils/HeroRedDotUtils";

export class ApplicationRedDots {
    /** 主城就绪且配置可读取时才投影业务状态。 */
    private ready = false;
    /** 当前角色唯一的时间刷新任务，离开游戏根页时清理。 */
    private clockTask: ReturnType<typeof setInterval> | null = null;
    /** 副本列表影响资格的等级、阵容版本及上阵战力，供合并同一状态的后台查询。 */
    private dungeonInputs = "";
    /** 下一次允许尝试读取过期副本状态的服务器 Unix 秒，避免失败时逐秒发包。 */
    private nextDungeonRefresh = 0;
    /** 主线进度监听在应用退出时解除。 */
    private readonly unbindChapter: () => void;

    /**
     * 接入独立主线回包，等待场景装配完成后再读配置。
     * @param account 当前应用的角色快照，用于入口等级和升级金币。
     */
    public constructor(private readonly account: AccountModel) {
        this.unbindChapter = EventDispatcher.instance.on(MainChapterController.Updated, this, this.refreshChapter);
    }

    /** 配置包和主城均可用后读取当前快照，启动免费次数计时。 */
    public setReady(ready: boolean): void {
        if (ready === this.ready) {
            return;
        }
        this.ready = ready;
        if (ready) {
            this.refreshSnapshot();
            this.refreshChapter();
            this.clockTask = setInterval(() => this.refreshTimed(), 1_000);
        } else if (this.clockTask !== null) {
            clearInterval(this.clockTask);
            this.clockTask = null;
        }
    }

    /**
     * 角色、库存和名册在同一批次提交后重算，首次等待配置包和主城就绪。
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
        const hero = HeroRedDotUtils.project(roster, bag, role.gold);
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
            manager.set(GameRedDotKey.HERO, hero.lineupReady);
            manager.replaceBranch(GameRedDotKey.BAG_PIECES, pieces);
            this.refreshTimed();
        });
        const gate = CityNavigationUtils.bottomGate("dungeon");
        const goldGate = GameConfig.instance.getConfig(GConfig.OpenCondition, "main_mission");
        if (!gate || !goldGate || !EntryGateUtils.isEntryOpen(gate, role.level, 0)
            || !EntryGateUtils.isEntryOpen(goldGate, role.level, 0)) {
            this.dungeonInputs = "";
            manager.set(GameRedDotKey.GOLD_DUNGEON, false);
            return;
        }
        const deployed = new Set(roster.mainFormation?.slots.map(slot => slot.heroId));
        const power = roster.heroes.filter(hero => deployed.has(hero.id)).map(hero => hero.panelStats?.power);
        const inputs = JSON.stringify([role.level, roster.mainFormation?.version, power]);
        if (forceDungeon || this.dungeonInputs !== inputs) {
            this.dungeonInputs = inputs;
            this.refreshDungeon();
        }
    }

    /** 在副本入口已开放时读取现有服务端列表，供首次、重连和跨日共用。 */
    private refreshDungeon(): void {
        if (this.ready && this.dungeonInputs) {
            DailyDungeonController.instance.refreshReminder();
        }
    }

    /** 先熄灭上一角色的所有分支，再等待新角色快照和页面就绪。 */
    public resetSession(): void {
        this.setReady(false);
        this.dungeonInputs = "";
        this.nextDungeonRefresh = 0;
        RedDotManager.instance.reset();
    }

    /** 释放应用的计时和主线通知，清空该应用显示状态。 */
    public dispose(): void {
        this.unbindChapter();
        this.resetSession();
    }

    /** 主线独立回包更新奖励红点，也支持登录快照的同批通知。 */
    private refreshChapter(): void {
        if (this.ready && GameConfig.instance.getPackageVersion()) {
            RedDotManager.instance.setMany(MainChapterRedDotUtils.project(MainChapterModel.instance.state));
        }
    }

    /** 用公共服务器时钟处理免费召唤和金币副本跨日，不改变任何库存或次数。 */
    private refreshTimed(): void {
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
        const now = ServerClock.instance.nowSeconds();
        const dungeon = DailyDungeonModel.instance.state;
        if (now !== null && dungeon && now > dungeon.resetAtSeconds && now >= this.nextDungeonRefresh) {
            manager.set(GameRedDotKey.GOLD_DUNGEON, false);
            this.nextDungeonRefresh = now + 60;
            this.refreshDungeon();
        }
    }
}
