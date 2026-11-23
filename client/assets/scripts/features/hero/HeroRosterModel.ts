/** 英雄模块的唯一名册快照，保存服务端同步的英雄、阵容、召唤资格与独立装备。 */
import { HeroSnapshotUtils, type OwnedHero, type HeroRosterInfo, type MainFormation } from "./data/HeroSnapshotUtils";
import { FirstSummonData, type SummonDetails } from "./data/FirstSummonData";
import { BaseModel } from "../../framework/BaseModel";
import { ServerClock } from "../../core/ServerClock";
import { HeroGodEquipmentUtils, type HeroGodEquipmentState } from "./utils/HeroGodEquipmentUtils";
import { HeroArtifactUtils, type HeroArtifactState } from "./utils/HeroArtifactUtils";

export interface HeroRosterState {
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly heroes: readonly OwnedHero[];
    readonly error: string;
    /** 同一快照下发的总容量；缺失时显示未同步，不使用本地默认上限。 */
    readonly rosterInfo?: HeroRosterInfo;
    /** 同一统一快照的主线阵型；换号时一起清空。 */
    readonly mainFormation?: MainFormation;
    /** 服务端下发的下次普通免费召唤时间（Unix 秒），未同步时等待快照。 */
    readonly normalFreeAtSeconds?: number | null;
    /** 服务器提供的高级冷却、积分与祈愿资格。 */
    readonly summonDetails?: SummonDetails | null;
    /** 当前账号全部独立神装及解锁门槛，与钱包和名册同版本。 */
    readonly godEquipment?: HeroGodEquipmentState;
    /** 圣器持有实例、佩戴关系和已激活格位，与名册同版本。 */
    readonly artifacts?: HeroArtifactState;
}

export class HeroRosterModel extends BaseModel {
    static readonly instance = new HeroRosterModel();
    private state: HeroRosterState = Object.freeze({ status: "idle", heroes: Object.freeze([]), error: "" });

    /** 返回当前角色只读状态与基类版本，不另存版本计数。 */
    get snapshot(): HeroRosterState & { readonly revision: number } {
        return Object.freeze({ ...this.state, revision: this.version });
    }

    /** 当前普通单抽是否免费。冷却到期当秒即可免费，等待资格或服务器时间时返回 null。 */
    public get normalSummonFree(): boolean | null {
        const remaining = this.summonCooldown("NORMAL");
        return remaining === null ? null : remaining === 0;
    }

    /** 返回单抽距下次免费剩余秒数，旧快照缺字段时保持未知。 */
    public summonCooldown(pool: "NORMAL" | "ADVANCED"): number | null {
        const freeAt = pool === "NORMAL" ? this.state.normalFreeAtSeconds : this.state.summonDetails?.advancedFreeAtSeconds;
        if (freeAt == null || freeAt === 0) {
            return freeAt ?? null;
        }
        const now = ServerClock.instance.nowSeconds();
        return now === null ? null : Math.max(0, freeAt - now);
    }

    /** 从同一份资产快照读取英雄、阵容、召唤、神装和圣器，提交前一次校验。 */
    public static readSnapshot(state: Record<string, unknown>): HeroRosterState {
        const heroes = HeroSnapshotUtils.readOwnedHeroes(state.heroes);
        const heroIds = new Set(heroes.map(hero => hero.id));
        return {
            status: "ready",
            heroes,
            rosterInfo: HeroSnapshotUtils.readHeroRosterInfo(state.heroRoster),
            mainFormation: HeroSnapshotUtils.readMainFormation(state.mainFormation, heroes),
            normalFreeAtSeconds: FirstSummonData.readFreeAt(state.heroSummon),
            summonDetails: FirstSummonData.readDetails(state.heroSummon),
            godEquipment: HeroGodEquipmentUtils.read(state.godEquipment, heroIds),
            artifacts: HeroArtifactUtils.read(state.artifacts, heroIds),
            error: "",
        };
    }

    /** 提交整批状态，复制英雄避免外部后续修改。 */
    replace(state: HeroRosterState): void {
        this.state = Object.freeze({
            ...state,
            rosterInfo: state.rosterInfo ? Object.freeze({ ...state.rosterInfo }) : undefined,
            heroes: Object.freeze(state.heroes.map(hero => Object.freeze({ ...hero })))
        });
        this.incrementVersion();
    }

    /** 会话重置时清空名册；通知由 Controller 统一发布。 */
    protected onReset(): void {
        this.state = Object.freeze({ status: "idle", heroes: Object.freeze([]), error: "" });
    }
}
