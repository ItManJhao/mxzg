/**
 * 圣器快照、激活配置及无状态显示规则。
 * 英雄详情和圣器弹窗共用配置；实际持有、套装和消耗仍以服务端为准。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { OwnedHero } from "../data/HeroSnapshotUtils";

/** 圣器独立身份与佩戴关系；闲置实例没有 heroId。 */
export interface HeroArtifactItem {
    readonly instanceId: string;
    readonly templateId: number;
    readonly slot: number;
    readonly heroId?: string;
}

/** 服务器随名册交付的独立圣器与英雄槽位。 */
export interface HeroArtifactState {
    readonly items: readonly HeroArtifactItem[];
    readonly slots: readonly { heroId: string; slot: number }[];
}

/** 激活或培养所需的真实普通物品及数量。 */
export interface HeroArtifactCost {
    readonly itemId: number;
    readonly quantity: number;
}

/** 槽位的英雄等级、星级门槛和激活赠品。 */
export interface HeroArtifactSlot {
    readonly slot: number;
    readonly level: number;
    readonly star: number;
    readonly costs: readonly HeroArtifactCost[];
    readonly rewardTemplateId: number;
}

/** 只读属性值，百分比仍保留策划的万分数。 */
interface HeroArtifactAttribute {
    readonly type: number;
    readonly value: number;
}

/** 允许使用的素材英雄条件与明确的傀儡替代道具。 */
export interface HeroArtifactMaterial {
    readonly templateId: number;
    readonly element: number;
    readonly star: number;
    readonly count: number;
    readonly replacementItemId: number;
}

/** 培养、转换和详情使用原八种模板配置。 */
export interface HeroArtifactDefinition {
    readonly templateId: number;
    readonly slot: number;
    readonly rarity: number;
    readonly setId: number;
    readonly heroMaterials: readonly HeroArtifactMaterial[];
    readonly upgradeCosts: readonly HeroArtifactCost[];
    readonly upgradeTargets: readonly number[];
    readonly transformCosts: readonly HeroArtifactCost[];
    readonly transformTarget: number;
    readonly attributes: readonly HeroArtifactAttribute[];
    readonly specialAttributes: readonly HeroArtifactAttribute[];
    readonly score: number;
}

/** 旧件数和品质规则显示实际激活的套装。 */
interface HeroArtifactSet {
    readonly setId: number;
    readonly count: number;
    readonly attributes: readonly HeroArtifactAttribute[];
    readonly skillId: number;
    readonly skillLevel: number;
    readonly name: number;
}

/** 配置只由登录加载统一配置包。 */
interface HeroArtifactConfig {
    readonly items: readonly HeroArtifactDefinition[];
    readonly slots: readonly HeroArtifactSlot[];
    readonly sets: readonly HeroArtifactSet[];
}

export class HeroArtifactUtils {
    /** 对应圣器配置包中的一份完整同源投影。 */
    public static readonly configPath = "config/hero-artifacts";
    /** 统一验证稳定实例身份，此处不转换角色或装备 ID。 */
    private static readonly uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

    /** 无状态展示 helper 不创建实例。 */
    private constructor() {}

    /** 整包验证独立实例和已激活格位，保留闲置圣器及旧快照缺少整个模块的状态。 */
    public static read(value: unknown, heroes: ReadonlySet<string>): HeroArtifactState | undefined {
        if (value === undefined) {
            return undefined;
        }
        const raw = this.object(value);
        if (!Array.isArray(raw.items) || !Array.isArray(raw.slots)) {
            throw new Error("圣器快照缺少资产或格位");
        }
        const active = new Set<string>();
        const slots = raw.slots.map((row: unknown) => {
            const { heroId, slot } = this.object(row);
            if (typeof heroId !== "string" || !heroes.has(heroId) || !this.isSlot(slot)) {
                throw new Error("圣器格位引用无效");
            }
            const identity = heroId + ":" + slot;
            if (active.has(identity)) {
                throw new Error("圣器激活格位重复");
            }
            active.add(identity);
            return Object.freeze({ heroId, slot });
        });
        const instances = new Set<string>();
        const equipped = new Set<string>();
        const items = raw.items.map((row: unknown) => {
            const { instanceId, templateId, slot, heroId } = this.object(row);
            if (typeof instanceId !== "string" || !this.uuid.test(instanceId) || instances.has(instanceId)
                || typeof templateId !== "number" || !Number.isSafeInteger(templateId) || templateId <= 0 || !this.isSlot(slot)) {
                throw new Error("圣器实例数据无效");
            }
            instances.add(instanceId);
            if (heroId === undefined) {
                return Object.freeze({ instanceId, templateId, slot });
            }
            if (typeof heroId !== "string") {
                throw new Error("圣器佩戴关系无效");
            }
            const key = heroId + ":" + slot;
            if (!active.has(key) || equipped.has(key)) {
                throw new Error("圣器佩戴关系无效");
            }
            equipped.add(key);
            return Object.freeze({ instanceId, templateId, slot, heroId });
        });
        return Object.freeze({ items: Object.freeze(items), slots: Object.freeze(slots) });
    }

    /** 从实际配置包读取槽位激活门槛。 */
    public static slot(slot: number): HeroArtifactSlot | undefined {
        return this.config()?.slots.find(row => row.slot === slot);
    }

    /** 从实际配置包读取圣器详情和候选培养目标。 */
    public static definition(templateId: number): HeroArtifactDefinition | undefined {
        return this.config()?.items.find(row => row.templateId === templateId);
    }

    /** 返回已激活，卸下后仍保持 true。 */
    public static active(state: HeroArtifactState | undefined, heroId: string, slot: number): boolean {
        return state?.slots.some(row => row.heroId === heroId && row.slot === slot) ?? false;
    }

    /** 返回当前权威佩戴关系，空槽为 undefined。 */
    public static worn(state: HeroArtifactState | undefined, heroId: string, slot: number): HeroArtifactItem | undefined {
        return state?.items.find(item => item.heroId === heroId && item.slot === slot);
    }

    /** 提供当前部位可穿戴的真实闲置实例，先显示高品质。 */
    public static available(state: HeroArtifactState | undefined, slot: number): readonly HeroArtifactItem[] {
        return state?.items.filter(item => item.heroId === undefined && item.slot === slot)
            .sort((left, right) => right.templateId - left.templateId || left.instanceId.localeCompare(right.instanceId)) ?? [];
    }

    /** 检查玩家能否激活、穿戴或按至少一个原配方升级，界面红点只表示可操作。 */
    public static reminder(hero: OwnedHero, slot: number, state: HeroArtifactState | undefined,
        balance: (itemId: number) => number = () => 0, roster: readonly OwnedHero[] = []): boolean {
        const rule = this.slot(slot);
        if (!rule || !state || hero.star < rule.star) {
            return false;
        }
        if (!this.active(state, hero.id, slot)) {
            return hero.level >= rule.level && rule.costs.every(cost => balance(cost.itemId) >= cost.quantity);
        }
        const item = this.worn(state, hero.id, slot);
        if (!item) {
            return this.available(state, slot).length > 0;
        }
        return this.definition(item.templateId)?.upgradeTargets.some(target => {
            const next = this.definition(target);
            return !!next && next.upgradeCosts.every(cost => balance(cost.itemId) >= cost.quantity)
                && next.heroMaterials.every(row =>
                    this.candidates(hero, row, roster).length + balance(row.replacementItemId) >= row.count);
        }) ?? false;
    }

    /** 原配方只允许对应星级及符合模板、元素条件的空闲英雄。 */
    public static candidates(hero: OwnedHero, row: HeroArtifactMaterial, roster: readonly OwnedHero[]): readonly OwnedHero[] {
        return roster.filter(candidate => candidate.id !== hero.id && candidate.locked === false && candidate.deployed === false
            && candidate.star === row.star && (row.templateId === 0 || row.templateId === candidate.templateId)
            && (row.element === 0 || GameConfig.instance.getConfig(GConfig.HeroType, candidate.templateId)?.elem === row.element));
    }

    /** 显示基础、特殊属性及当前混搭/同组套装的件数和数值。 */
    public static description(template: HeroArtifactDefinition, equipped: readonly HeroArtifactItem[]): string {
        const set = this.config()?.sets.find(entry => entry.setId === template.setId);
        const names = GameConfig.instance;
        const count = equipped.filter(item => {
            const definition = this.definition(item.templateId);
            return definition && (definition.setId === template.setId || definition.rarity > template.rarity);
        }).length;
        return [
            `评分 ${template.score}`,
            `基础属性　${this.attributeText(template.attributes)}`,
            `特殊属性　${this.attributeText(template.specialAttributes)}`,
            set ? `${names.getConfig(GConfig.Language, set.name)?.value ?? "套装"} ${count}/${set.count}　${this.attributeText(set.attributes)}` : "",
            set?.skillId ? this.skillText(set.skillId, set.skillLevel) : "",
        ].filter(Boolean).join("\n");
    }

    /** 取物品配置现有中文名和确切费用。 */
    public static costText(costs: readonly HeroArtifactCost[]): string {
        return costs.map(cost => `${BagItemCatalog.face(cost.itemId, 1).title} ×${cost.quantity}`).join("、");
    }

    /** 沿用已有属性文案及单位，缺描述时保留真实原始值。 */
    private static attributeText(attributes: readonly HeroArtifactAttribute[]): string {
        return attributes.map(attribute => {
            const config = GameConfig.instance;
            const name = config.getConfig(GConfig.Language, 2150000 + attribute.type)?.value ?? String(attribute.type);
            const template = config.getConfig(GConfig.Language, 2160000 + attribute.type)?.value;
            const value = template?.includes("##p##") ? `${attribute.value / 100}%` : String(attribute.value);
            return name + " +" + value;
        }).join("　");
    }

    /** 高阶套装技能使用原四阶同源技能配置与中文语言项。 */
    private static skillText(id: number, level: number): string {
        const config = GameConfig.instance;
        const skill = config.getConfig(GConfig.HeroSkill).find(row => row.type === id && row.level === level);
        const name = skill && config.getConfig(GConfig.Language, skill.lan_name)?.value;
        const description = skill && config.getConfig(GConfig.Language, skill.lan_describe)?.value;
        return [name, description].filter(Boolean).join("：");
    }

    /** 当前配置包中的原始圣器表，不维护第二份配置副本。 */
    private static config(): HeroArtifactConfig | null {
        return GameConfig.instance.getFileByPath(this.configPath) as HeroArtifactConfig | null;
    }

    /** 只接受已经实现的戒指 1 和项链 2。 */
    private static isSlot(value: unknown): value is number {
        return value === 1 || value === 2;
    }

    /** 检查原始消息对象，拒绝数组、null 和其他非法结构。 */
    private static object(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("圣器快照记录无效");
        }
        return value as Record<string, unknown>;
    }
}
