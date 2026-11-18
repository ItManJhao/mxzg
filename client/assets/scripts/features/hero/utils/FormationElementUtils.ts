/**
 * 根据现有出阵草稿预览元素克制和队伍光环，对齐服务端实战的同源配表。
 * 仅返回展示投影，不写玩家数据，不将对敌克制当成固定队伍加成。
 */
import { GameConfig } from "../../../config/GameConfig";
import type { FormationState } from "../data/FormationData";
import { FormationConfigUtils, type FormationBonus } from "./FormationConfigUtils";
import { HeroCatalog } from "./HeroCatalog";

/** 元素攻击方对守方的优势配对，区分双向关系。 */
export interface FormationElementRelation {
    /** 施加克制的元素编号。 */
    readonly attacker: number;
    /** 被克制的元素编号。 */
    readonly defender: number;
    /** 配表伤害倍率，10000 表示原伤害。 */
    readonly damage: number;
    /** 配表命中倍率，10000 表示原命中。 */
    readonly hit: number;
}

/** 同类光环的一档门槛及属性。 */
export interface FormationElementTier {
    /** elementaddition 原配置编号，供当前选中态和回归核对。 */
    readonly id: number;
    /** 依据原元素人数和语言模板绘制的条件。 */
    readonly condition: string;
    /** 当前这一档的全部属性文案。 */
    readonly bonus: string;
    /** true 表示本草稿实际生效的档位，同组至多一项。 */
    readonly active: boolean;
}

/** 同一类型的光环说明与当前激活情况。 */
export interface FormationElementGroup {
    /** 1 至 5 为单元素，6 为五元素组合。 */
    readonly type: number;
    /** 旧配置对应的光环名称。 */
    readonly name: string;
    /** true 表示本组达到至少一个门槛。 */
    readonly active: boolean;
    /** 按原规则表顺序展示的所有档位。 */
    readonly tiers: readonly FormationElementTier[];
}

/** 页面和弹窗使用同一草稿投影。 */
export interface FormationElementPreview {
    /** 用于页面入口的旧元素图尾码，未激活为 10000。 */
    readonly icon: string;
    /** 全队光环效果，空字符串表示未激活。 */
    readonly summary: string;
    /** 光环按属性编号汇总后的原值，仍使用旧表单位。 */
    readonly bonuses: readonly FormationBonus[];
    /** 按旧语言和实际克制配对显示的描述。 */
    readonly restraint: string;
    /** 来自配表的全部优势方向，供克制示意图核对。 */
    readonly relations: readonly FormationElementRelation[];
    /** 先展示激活的类别，同状态按原类别编号升序排列。 */
    readonly groups: readonly FormationElementGroup[];
}

/** 旧 heroelemmul 表各守方列，依次对应元素 1 至 5。 */
const ELEMENT_COLUMNS = ["fire", "water", "wood", "light", "dark"] as const;
/** 旧混合光环和对应组合图的编号。 */
const ALL_ELEMENTS_GROUP = 6;
/** 主线实战读取的最后一个普通参战位，9 号仍归助战。 */
const LAST_BATTLE_POSITION = 8;
/** 配表中无增减时的命中和伤害倍率。 */
const NEUTRAL_MULTIPLIER = 10000;

/** 光环说明的一档已解析配置，用于匹配与文案计算。 */
interface ElementTierConfig {
    /** 原光环编号。 */
    readonly id: number;
    /** 可包含重复元素，每一项需要一名对应元素的英雄。 */
    readonly elements: readonly number[];
    /** 描述条件的语言键。 */
    readonly language: number;
    /** 本档属性原值。 */
    readonly bonuses: readonly FormationBonus[];
}

/** 出阵元素展示工具，不建立额外的配置或玩家模型。 */
export class FormationElementUtils {
    /** 纯投影工具不创建实例。 */
    private constructor() { }

    /**
     * 使用草稿开放的普通参战格和实际英雄元素预览队伍，关闭弹窗不会改变原草稿。
     * @throws 克制表、光环表或实际英雄元素不完整时，返回可定位的配置错误。
     */
    public static forDraft(
        state: Pick<FormationState, "heroes" | "lineup" | "openPositions">,
        config: GameConfig = GameConfig.instance,
    ): FormationElementPreview {
        const counts = this.countDraftElements(state, config);
        const totals = new Map<number, number>();
        const groups: FormationElementGroup[] = [];
        for (const [type, rules] of this.readTiers(config)) {
            // 当前战斗按表序保留同类最后命中的档，真实旧表的高档位排在同组后面。
            let selected: ElementTierConfig | undefined;
            for (const rule of rules) {
                if (this.matches(rule.elements, counts)) {
                    selected = rule;
                }
            }
            for (const { attribute, value } of selected?.bonuses ?? []) {
                totals.set(attribute, (totals.get(attribute) ?? 0) + value);
            }
            groups.push({
                type,
                name: FormationConfigUtils.text(config, 49100 + type),
                active: selected !== undefined,
                tiers: rules.map(rule => ({
                    id: rule.id,
                    condition: this.condition(config, type, rule),
                    bonus: rule.bonuses.map(bonus => FormationConfigUtils.formatBonus(config, bonus)).join(" "),
                    active: rule === selected,
                })),
            });
        }
        groups.sort((a, b) => Number(b.active) - Number(a.active) || a.type - b.type);
        const bonuses = Array.from(totals, ([attribute, value]) => ({ attribute, value }));
        const summary = bonuses.length
            ? FormationConfigUtils.text(config, 49153)
                + bonuses.map(bonus => FormationConfigUtils.formatBonus(config, bonus)).join(" ")
            : "";
        const relations = this.readRelations(config);
        return {
            icon: this.icon(groups),
            summary,
            bonuses,
            restraint: this.describeRestraint(config, relations),
            relations,
            groups,
        };
    }

    /** 只统计草稿中有效参战的已持有实例，和现有战斗输入一样排除助战与敌方。 */
    private static countDraftElements(
        state: Pick<FormationState, "heroes" | "lineup" | "openPositions">,
        config: GameConfig,
    ): ReadonlyMap<number, number> {
        const openPositions = new Set(state.openPositions ?? []);
        const occupied = new Set(state.lineup.slots.filter(slot =>
            slot.position >= 1 && slot.position <= LAST_BATTLE_POSITION && openPositions.has(slot.position),
        ).map(slot => slot.heroId));
        const counts = new Map<number, number>();
        for (const hero of state.heroes) {
            if (!occupied.has(hero.id)) {
                continue;
            }
            const element = HeroCatalog.find(hero.templateId, config)?.elem;
            if (element === null || element === undefined) {
                throw new Error("出阵英雄元素缺失：" + hero.templateId);
            }
            counts.set(element, (counts.get(element) ?? 0) + 1);
        }
        return counts;
    }

    /** 按表序分组解析各元素和混合光环，不补造缺失门槛。 */
    private static readTiers(config: GameConfig): ReadonlyMap<number, readonly ElementTierConfig[]> {
        const groups = new Map<number, ElementTierConfig[]>();
        const ids = new Set<number>();
        for (const row of FormationConfigUtils.rows(config, "config/elementaddition")) {
            const id = FormationConfigUtils.id(row.idx, "elementaddition.idx");
            const type = FormationConfigUtils.id(row.type, "elementaddition.type");
            const elements = FormationConfigUtils.array(row.elements, "elementaddition.elements " + id)
                .map(value => this.elementId(value, "elementaddition.elements " + id));
            if (ids.has(id) || type > ALL_ELEMENTS_GROUP || !elements.length) {
                throw new Error("elementaddition 出阵光环配置无效或重复：" + id);
            }
            ids.add(id);
            const rules = groups.get(type) ?? [];
            rules.push({
                id,
                elements,
                language: FormationConfigUtils.id(row.lan, "elementaddition.lan"),
                bonuses: FormationConfigUtils.bonuses(row.ability, "elementaddition " + id),
            });
            groups.set(type, rules);
        }
        return groups;
    }

    /** 每个门槛元素消耗一名对应英雄，重复元素不能重复使用同一名英雄。 */
    private static matches(elements: readonly number[], counts: ReadonlyMap<number, number>): boolean {
        const remaining = new Map(counts);
        for (const element of elements) {
            const count = remaining.get(element) ?? 0;
            if (!count) {
                return false;
            }
            remaining.set(element, count - 1);
        }
        return true;
    }

    /** 单元素文案填入人数和元素名，混合光环使用完整原条件。 */
    private static condition(config: GameConfig, type: number, rule: ElementTierConfig): string {
        const template = FormationConfigUtils.text(config, rule.language);
        if (type === ALL_ELEMENTS_GROUP) {
            return template;
        }
        return template.replace("%s", String(rule.elements.length))
            .replace("%s", FormationConfigUtils.text(config, 51000 + type));
    }

    /** 复用旧组合图编码，混合光环优先，否则把激活类别按降序拼接。 */
    private static icon(groups: readonly FormationElementGroup[]): string {
        const activeTypes = groups.filter(group => group.active).map(group => group.type).sort((a, b) => b - a);
        if (activeTypes[0] === ALL_ELEMENTS_GROUP) {
            return String(ALL_ELEMENTS_GROUP);
        }
        return activeTypes.join("") || "10000";
    }

    /** 读取五元素攻守完整配对，只将有实际优势的方向交给界面。 */
    private static readRelations(config: GameConfig): readonly FormationElementRelation[] {
        const seen = new Set<number>();
        const relations: FormationElementRelation[] = [];
        for (const row of FormationConfigUtils.rows(config, "config/heroelemmul")) {
            const attacker = this.elementId(row.idx, "heroelemmul.idx");
            if (seen.has(attacker)) {
                throw new Error("heroelemmul 元素克制攻方重复：" + attacker);
            }
            seen.add(attacker);
            ELEMENT_COLUMNS.forEach((column, index) => {
                const pair = FormationConfigUtils.array(row[column], "heroelemmul " + attacker + "/" + column);
                const [damage, hit] = pair;
                if (pair.length !== 2 || typeof damage !== "number" || !Number.isSafeInteger(damage)
                        || typeof hit !== "number" || !Number.isSafeInteger(hit)) {
                    throw new Error("heroelemmul 伤害和命中倍率无效：" + attacker + "/" + column);
                }
                if (damage > NEUTRAL_MULTIPLIER || hit > NEUTRAL_MULTIPLIER) {
                    relations.push({ attacker, defender: index + 1, damage, hit });
                }
            });
        }
        if (seen.size !== ELEMENT_COLUMNS.length) {
            throw new Error("heroelemmul 元素克制配置不完整");
        }
        return relations;
    }

    /** 五向优势一致时沿用一行提升说明，有差异时逐对标明对应数值。 */
    private static describeRestraint(config: GameConfig, relations: readonly FormationElementRelation[]): string {
        const values = relations.map(({ damage, hit }) => [
            FormationConfigUtils.formatBonus(config, { attribute: 221, value: damage - NEUTRAL_MULTIPLIER }),
            FormationConfigUtils.formatBonus(config, { attribute: 226, value: hit - NEUTRAL_MULTIPLIER }),
        ].join(" "));
        if (!values.length) {
            return "";
        }
        const heading = FormationConfigUtils.text(config, 49152);
        if (values.every(value => value === values[0])) {
            return heading + values[0];
        }
        return heading + relations.map(({ attacker, defender }, index) =>
            FormationConfigUtils.text(config, 51000 + attacker) + " → "
            + FormationConfigUtils.text(config, 51000 + defender) + " " + values[index],
        ).join(" · ");
    }

    /** 战斗元素来自同源五类，不将未知配置按中性处理。 */
    private static elementId(value: unknown, field: string): number {
        const id = FormationConfigUtils.id(value, field);
        if (id > ELEMENT_COLUMNS.length) {
            throw new Error(field + "：未知元素 " + id);
        }
        return id;
    }
}
