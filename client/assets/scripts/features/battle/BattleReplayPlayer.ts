/**
 * 战报播放协调器：技能间顺序执行，同技能不同目标保持并行，Buff按真实实例维护因果顺序。
 * 耗尽移除等待对应命中，格挡等扩展由显示能力显式确认，死亡/重施不被旧回调覆盖；不改业务Model或数值。
 */
import { BattleReplayStep, BattleReplayUtils, type ParsedBattleReplay } from "./utils/BattleReplayUtils";

/** 页面负责真实资源与动画完成通知；stop必须停止当前动画和释放本次挂点。 */
export interface BattleReplayPresentation {
    /** 正式战报在动作组起点等待本组素材，其他步骤同步放行。索引对应完整战报的步骤顺序。 */
    beforeStep?(index: number): Promise<void> | undefined;
    /** 开始播放单次技能前关联其中的动作与命中，只准备表现时序。 */
    prepareSkill?(steps: readonly BattleReplayStep[]): void;
    /** 同组表现只驱动一次施法；targets保留每个实际目标，不合并伤害或Buff实例。 */
    play(step: BattleReplayStep, targets?: readonly BattleReplayStep[]): Promise<void>;
    /** 定位前恢复真实战报快照，不播放动画、不重新计算伤害。 */
    restore?(step: BattleReplayStep): void;
    /** 已由显示配置确认需要等待后续同目标命中的状态耗尽；播放器不读取配置或猜Buff编号。 */
    waitForFollowingHit?(step: BattleReplayStep): boolean;
    /** 正常结束前等待视图的末次表现，关闭仍通过 stop 立即取消。 */
    finish?(): Promise<void>;
    /** 结束本次表现并释放等待；重复结束由页面自身保证安全。 */
    stop(): void;
}

export class BattleReplayPlayer {
    /** 仅用于本页动画播放取消；与账号会话/旧协议回包隔离无关。 */
    private generation = 0;
    /** 当前已结束或被取消的标记，初始没有播放。 */
    private active = false;

    /**
     * 注入页面播放能力，不持有服务器业务状态。
     * @param presentation 由View提供动画、定位和取消能力，不负责重新计算战报。
     */
    public constructor(private readonly presentation: BattleReplayPresentation) {}

    /**
     * 原始字节先校验整包；已由战场解析的报告直接使用同一组步骤。定位时恢复前置状态，再按技能与实例依赖播放。
     * 宿主可在一组动作开始前等待素材；同一技能仍并行，耗尽移除等待对应命中。false 表示播放取消。
     */
    public async play(report: Uint8Array | ParsedBattleReplay, focus?: { skillId: number; level: number }): Promise<boolean> {
        const steps = "steps" in report ? report.steps : BattleReplayUtils.decode(report);
        const start = focus ? steps.findIndex(step => step.kind === "skill.begin"
            && step.configId === focus.skillId && step.skillLevel === focus.level) : 0;
        if (start < 0) {
            throw new Error("战报中没有选定技能等级");
        }
        if (start > 0 && !this.presentation.restore) {
            throw new Error("播放宿主不支持状态定位");
        }
        this.stop();
        const generation = this.generation;
        this.active = true;
        try {
            // 回合流血也会先记耗尽移除再记damage，显示能力确认的额外耗尽同样不能跨阶段借命中。
            const roundRemovals: BattleReplayStep[] = [];
            for (let index = 0; index < start; index++) {
                if (generation !== this.generation) {
                    return false;
                }
                this.presentation.restore!(steps[index]);
            }
            for (let index = start; index < steps.length; index++) {
                if (generation !== this.generation) {
                    return false;
                }
                const step = steps[index];
                const ready = this.presentation.beforeStep?.(index);
                if (ready) {
                    await ready;
                    if (generation !== this.generation) {
                        return false;
                    }
                }
                if (this.requiresFollowingHit(step)) {
                    if (!this.hasRoundFollowingHit(steps, index)) {
                        throw new Error("状态耗尽缺少同阶段对应命中");
                    }
                    roundRemovals.push(step);
                    continue;
                }
                await this.presentation.play(step);
                if (generation !== this.generation) {
                    return false;
                }
                if (step.kind === "damage") {
                    for (let removalIndex = 0; removalIndex < roundRemovals.length;) {
                        const removal = roundRemovals[removalIndex];
                        if (removal.targetId !== step.targetId) {
                            removalIndex++;
                            continue;
                        }
                        roundRemovals.splice(removalIndex, 1);
                        await this.presentation.play(removal);
                        if (generation !== this.generation) {
                            return false;
                        }
                    }
                }
                if (step.kind !== "skill.begin") {
                    continue;
                }
                const effects: BattleReplayStep[] = [];
                while (++index < steps.length && steps[index].kind !== "skill.end") {
                    effects.push(steps[index]);
                }
                await this.playSkill(effects, generation);
                if (generation !== this.generation) {
                    return false;
                }
                await this.presentation.play(steps[index]);
            }
            if (generation === this.generation && this.presentation.finish) {
                await this.presentation.finish();
            }
            return generation === this.generation;
        } finally {
            if (generation === this.generation) {
                this.active = false;
                this.presentation.stop();
            }
        }
    }

    /**
     * 启动单技能的表现依赖：相同实例按事件顺序，不同目标保留并行。
     * 护盾和显示能力明确声明的格挡耗尽在damage前记录，等待后续同目标命中；其他Buff等此前命中。
     * 普通死亡清理在技能结束执行。同技能还有复活的目标先完成受击和该次死亡清理，再显示复活。
     * 依赖和Promise只活在本技能中，取消后不再启动迟到任务，也不另存一份战斗状态。
     */
    private async playSkill(effects: readonly BattleReplayStep[], generation: number): Promise<void> {
        this.presentation.prepareSkill?.(effects);
        const groups: BattleReplayStep[][] = [];
        const deathRemovals: BattleReplayStep[] = [];
        const lastRevival = new Map<number, number>();
        for (const [index, effect] of effects.entries()) {
            if (effect.kind === "revival") {
                lastRevival.set(effect.targetId, index);
            }
        }
        for (const [index, effect] of effects.entries()) {
            if (effect.kind === "buff.remove" && effect.removalReason === "death"
                && (lastRevival.get(effect.targetId) ?? -1) <= index) {
                deathRemovals.push(effect);
                continue;
            }
            const previous = groups[groups.length - 1];
            if (effect.kind === "presentation" && previous && previous[0].kind === "presentation"
                && previous[0].configId === effect.configId && previous[0].sourceId === effect.sourceId) {
                previous.push(effect);
            } else {
                groups.push([effect]);
            }
        }
        const dependencies = groups.map(() => new Set<number>());
        const lastBuff = new Map<string, number>();
        const lastHit = new Map<number, number>();
        const lastDeathRemoval = new Map<number, number>();
        let lethalHit: number | undefined;
        let deathBonus: number | undefined;
        for (let index = 0; index < groups.length; index++) {
            const effect = groups[index][0];
            const previousHit = lastHit.get(effect.targetId);
            if (effect.kind === "damage" || effect.kind === "recovery" || effect.kind === "revival") {
                if (previousHit !== undefined) {
                    dependencies[index].add(previousHit);
                }
                lastHit.set(effect.targetId, index);
            }
            const previousDeathRemoval = lastDeathRemoval.get(effect.targetId);
            if (effect.kind === "revival" && previousDeathRemoval !== undefined) {
                dependencies[index].add(previousDeathRemoval);
            }
            if (effect.kind === "buff.upsert" || effect.kind === "buff.remove") {
                const key = effect.targetId + ":" + effect.buffInstanceId;
                const previousBuff = lastBuff.get(key);
                if (previousBuff !== undefined) {
                    dependencies[index].add(previousBuff);
                }
                lastBuff.set(key, index);
                if (this.requiresFollowingHit(effect)) {
                    const hit = groups.findIndex((group, next) => next > index
                        && group[0].kind === "damage" && group[0].targetId === effect.targetId);
                    // 整包解析已校验此关联；若调用链破坏它也必须停止，而非把耗尽当普通驱散。
                    if (hit < 0) {
                        throw new Error(effect.removalReason === "shield-depleted"
                            ? "护盾耗尽缺少对应命中" : "状态耗尽缺少对应命中");
                    }
                    dependencies[index].add(hit);
                } else if (previousHit !== undefined) {
                    dependencies[index].add(previousHit);
                }
                if (effect.kind === "buff.remove" && effect.removalReason === "death") {
                    if (previousDeathRemoval !== undefined) {
                        dependencies[index].add(previousDeathRemoval);
                    }
                    lastDeathRemoval.set(effect.targetId, index);
                }
                // 保留恶魔魅影的致死增益顺序；该因果属于前一个致死目标，不一定是增益目标。
                if (lethalHit !== undefined && effect.kind === "buff.upsert"
                    && effect.configId >= 1113201 && effect.configId <= 1113203) {
                    dependencies[index].add(lethalHit);
                    if (deathBonus !== undefined) {
                        dependencies[index].add(deathBonus);
                    }
                    deathBonus = index;
                }
            }
            if (effect.kind === "damage" && effect.dead) {
                lethalHit = index;
            }
        }
        const tasks = new Map<number, Promise<void>>();
        /** 惰性启动合法依赖；耗尽允许指向后续damage，其他依赖均指向已出现的事件。 */
        const playGroup = (index: number): Promise<void> => {
            const existing = tasks.get(index);
            if (existing) {
                return existing;
            }
            const ready = Array.from(dependencies[index], dependency => playGroup(dependency));
            const task = Promise.all(ready).then(async () => {
                if (generation === this.generation && this.active) {
                    await this.presentation.play(groups[index][0], Object.freeze(groups[index]));
                }
            });
            tasks.set(index, task);
            return task;
        };
        await Promise.all(groups.map((_, index) => playGroup(index)));
        for (const removal of deathRemovals) {
            if (generation !== this.generation || !this.active) {
                return;
            }
            await this.presentation.play(removal);
        }
    }

    /** 护盾耗尽沿原规则；其他状态仅由已核实的显示能力明确提供，未知原因不在这里放行协议。 */
    private requiresFollowingHit(step: BattleReplayStep): boolean {
        return step.kind === "buff.remove" && (step.removalReason === "shield-depleted"
            || this.presentation.waitForFollowingHit?.(step) === true);
    }

    /** 技能外耗尽也必须在当前回合阶段找到后续同目标damage，不跨回合或技能边界借命中。 */
    private hasRoundFollowingHit(steps: readonly BattleReplayStep[], start: number): boolean {
        for (let index = start + 1; index < steps.length; index++) {
            const step = steps[index];
            if (step.round !== steps[start].round || step.kind === "round.ready"
                || step.kind === "skill.begin" || step.kind === "skill.end") return false;
            if (step.kind === "damage" && step.targetId === steps[start].targetId) return true;
        }
        return false;
    }

    /** 关页或切换播放时取消后续步骤；页面stop负责取消当前动画并结束等待。 */
    public stop(): void {
        this.generation++;
        if (this.active) {
            this.active = false;
            this.presentation.stop();
        }
    }
}
