/**
 * 彩虹圣殿当前角色的服务端状态。Controller 确认回执后提交，
 * 预制体只读取神位、独立阵容和公开挑战记录，切换角色统一清空。
 */
import { BaseModel } from "../../framework/BaseModel";
import type { RainbowHistory, RainbowLineup, RainbowState } from "../../platform/Protocol";

export class RainbowModel extends BaseModel {
    /** 应用拥有的当前会话唯一圣殿状态。 */
    public static readonly instance = new RainbowModel();

    /** 同服神位快照，关闭页面后保留供下次刷新。 */
    private snapshot: RainbowState | null = null;
    /** 最近确认的单神位历史，下一次读取或换号时替换。 */
    private history: RainbowHistory | null = null;

    /** 当前服务端视图。首次成功读取前返回空。 */
    public get state(): RainbowState | null {
        return this.snapshot;
    }

    /** 最近一次通过协议校验的神位记录。 */
    public get records(): RainbowHistory | null {
        return this.history;
    }

    /** 整包校验独立阵容和神位身份后提交。 */
    public commit(value: RainbowState): void {
        RainbowModel.requireLineup(value.lineup);
        if (value.seats.length !== 6 || value.arenaRank > 50 || value.serverTime < 1 || value.cooldownUntil < 0
            || value.seats.some((seat, index) => seat.id !== index + 1
                || seat.type !== (index === 0 ? 1 : index < 3 ? 2 : 3)
                || seat.heroTypeId < 1 || seat.heroStar < 1 || seat.evolution > 1000
                || Boolean(seat.owner) !== Boolean(seat.occupiedUntil)
                || (seat.occupiedUntil !== undefined && seat.occupiedUntil <= value.serverTime))) {
            throw new Error("彩虹圣殿状态无效");
        }
        if (this.snapshot && value.lineup.version < this.snapshot.lineup.version) {
            return;
        }
        this.snapshot = Object.freeze(value);
        this.incrementVersion();
    }

    /** 合入服务端已经确认的阵容，神位和排名继续沿用当前快照。 */
    public commitLineup(formation: RainbowLineup): void {
        RainbowModel.requireLineup(formation);
        if (this.snapshot && this.snapshot.lineup.version <= formation.version) {
            this.snapshot = Object.freeze({ ...this.snapshot, lineup: formation });
            this.incrementVersion();
        }
    }

    /** 保存神位公共胜场；记录排序及长度来自服务端。 */
    public commitHistory(history: RainbowHistory): void {
        this.history = Object.freeze(history);
        this.incrementVersion();
    }

    /** 账户切换后清空旧状态和记录。 */
    protected onReset(): void {
        this.snapshot = null;
        this.history = null;
    }

    /** 独立阵容允许空草稿，拒绝重复位置和重复英雄。 */
    private static requireLineup(lineup: RainbowLineup): void {
        if (lineup.version < 0 || lineup.formationId < 1 || lineup.slots.length > 9
            || new Set(lineup.slots.map(slot => slot.position)).size !== lineup.slots.length
            || new Set(lineup.slots.map(slot => slot.heroId)).size !== lineup.slots.length
            || lineup.slots.some(slot => slot.position < 1 || slot.position > 9 || !slot.heroId)) {
            throw new Error("彩虹圣殿阵容无效");
        }
    }
}
