/**
 * 战报播放协调器：技能间顺序执行，同技能不同目标保持并行，Buff按真实实例维护因果顺序。
 * 耗尽移除等待对应命中，死亡/重施不被旧回调覆盖；不请求协议、修改业务Model或重算数值。
 */
import { BattleReplayStep, BattleReplayUtils } from "./utils/BattleReplayUtils";

/** 页面负责真实资源与动画完成通知；stop必须停止当前动画和释放本次挂点。 */
export interface BattleReplayPresentation {
    /** 同组表现只驱动一次施法；targets保留每个实际目标，不合并伤害或Buff实例。 */
    play(step: BattleReplayStep, targets?: readonly BattleReplayStep[]): Promise<void>;
    /** 定位前恢复真实战报快照，不播放动画、不重新计算伤害。 */
    restore?(step: BattleReplayStep): void;
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
     * 先校验整包；定位时恢复前置状态，再按技能与实例依赖播放。
     * 不同目标仍并行，耗尽移除等待对应命中，死亡清理保持既有技能屏障；false表示取消。
     */
    public async play(bytes: Uint8Array, focus?: { skillId: number; level: number }): Promise<boolean> {
        const steps = BattleReplayUtils.decode(bytes);
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
            // 回合流血也会先记耗尽移除再记damage，不能只修技能内的耗尽事件。
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
                if (step.kind === "buff.remove" && step.removalReason === "shield-depleted") {
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
     * 后端在damage前记录护盾耗尽，故该移除需等待后续同目标命中；其他Buff等待此前同目标命中。
     * 死亡清理仍在全技能表现完成后执行，不改已有多目标致死/增益表现；当前未开放复活链。
     * 依赖和Promise只活在本技能中，取消后不再启动迟到任务，也不另存一份战斗状态。
     */
    private async playSkill(effects: readonly BattleReplayStep[], generation: number): Promise<void> {
        const groups: BattleReplayStep[][] = [];
        const deathRemovals: BattleReplayStep[] = [];
        for (const effect of effects) {
            if (effect.kind === "buff.remove" && effect.removalReason === "death") {
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
        let lethalHit: number | undefined;
        let deathBonus: number | undefined;
        for (let index = 0; index < groups.length; index++) {
            const effect = groups[index][0];
            const previousHit = lastHit.get(effect.targetId);
            if (effect.kind === "damage" || effect.kind === "recovery") {
                if (previousHit !== undefined) {
                    dependencies[index].add(previousHit);
                }
                lastHit.set(effect.targetId, index);
            }
            if (effect.kind === "buff.upsert" || effect.kind === "buff.remove") {
                const key = effect.targetId + ":" + effect.buffInstanceId;
                const previousBuff = lastBuff.get(key);
                if (previousBuff !== undefined) {
                    dependencies[index].add(previousBuff);
                }
                lastBuff.set(key, index);
                if (effect.kind === "buff.remove" && effect.removalReason === "shield-depleted") {
                    const hit = groups.findIndex((group, next) => next > index
                        && group[0].kind === "damage" && group[0].targetId === effect.targetId);
                    // 整包解析已校验此关联；若调用链破坏它也必须停止，而非把耗尽当普通驱散。
                    if (hit < 0) {
                        throw new Error("护盾耗尽缺少对应命中");
                    }
                    dependencies[index].add(hit);
                } else if (previousHit !== undefined) {
                    dependencies[index].add(previousHit);
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

    /** 关页或切换播放时取消后续步骤；页面stop负责取消当前动画并结束等待。 */
    public stop(): void {
        this.generation++;
        if (this.active) {
            this.active = false;
            this.presentation.stop();
        }
    }
}
