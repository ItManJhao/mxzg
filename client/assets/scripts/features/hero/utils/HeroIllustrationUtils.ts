/**
 * 英雄和进化图鉴的配置投影。供英雄列表与只读详情使用，历史解锁来自名册快照。
 * 等级、原始属性、技能和进化分支均按原客户端规则计算，不读写养成状态。
 */
import { GConfig } from "../../../config/GConfig";
import { ConfigUnavailable, GameConfig } from "../../../config/GameConfig";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import type { HeroIllustrationProgress, OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroSkillUtils, type HeroSkillFace } from "./HeroSkillUtils";

/** 每个配置星级独立成格。同一模板可在图鉴出现多次。 */
export interface HeroIllustrationEntry {
    /** 英雄模板 ID，与角色拥有的实例无关。 */
    readonly templateId: number;
    /** 该格代表的原始星级。 */
    readonly stars: number;
    /** 该星级所能达到的等级上限。 */
    readonly level: number;
    /** 原五系元素编号，范围 1～5。 */
    readonly elem: number;
    /** 当前语言下的英雄名称。 */
    readonly name: string;
    /** 当前形态的列表头像资源路径。 */
    readonly face: string | null;
    /** 图鉴详情使用的形态模型编号，可用于骨骼回退。 */
    readonly skinId: number;
    /** 旧英雄配置职业编号，供详情选择标识。 */
    readonly occupation: number;
    /** 当前角色是否曾获得不低于本星级的实例。进化图鉴公开展示。 */
    readonly unlocked: boolean;
    /** 原版进化图鉴为每个可进化模板展示两个最高等级分支。 */
    readonly evolutionBranches?: readonly HeroIllustrationBranch[];
}

/** 进化图鉴中的一条只读预览分支。 */
export interface HeroIllustrationBranch {
    /** 分支编号，1 为左，2 为右。 */
    readonly type: number;
    /** 本分支配置中的最高进化等级。 */
    readonly level: number;
    /** 进化小人和立绘共用的形态编号。 */
    readonly fashionId: number;
    /** 分支说明可使用的本地图标路径。 */
    readonly icon: string | null;
    /** 配置语言表给出的流派名。 */
    readonly name: string;
    /** 配置语言表给出的流派说明。 */
    readonly description: string;
    /** 被该分支强化的原技能 ID。 */
    readonly oldSkillId: number;
    /** 进化后技能配置 ID，可能和原 ID 相同。 */
    readonly newSkillId: number;
    /** 进化后技能的最高等级。 */
    readonly newSkillLevel: number;
    /** 累计属性，键为旧属性编号，值为定值或万分比。 */
    readonly attributes: ReadonlyMap<number, number>;
}

/** 两种图鉴共用的四维基础属性和技能详情投影。 */
export interface HeroIllustrationPreview {
    /** 图鉴预览使用的最高强化阶段。 */
    readonly stage: number;
    /** 无装备、助战或被动叠加的攻击。 */
    readonly attack: number;
    /** 无装备、助战或被动叠加的生命。 */
    readonly hp: number;
    /** 无装备、助战或被动叠加的防御。 */
    readonly defense: number;
    /** 无装备、助战或被动叠加的速度。 */
    readonly speed: number;
    /** 当前星级和阶段的四槽普通英雄技能。 */
    readonly skills: readonly HeroSkillFace[];
    /** 进化图鉴对比分支生效前后的同一技能。 */
    readonly evolutionSkills?: Readonly<{ before: HeroSkillFace; after: HeroSkillFace }>;
}

interface SkinRow {
    readonly type: number;
    readonly star_limit: string;
    readonly handbook: string;
    readonly skin: string;
}

interface PreviewTemplate {
    readonly type: number;
    readonly kind?: number;
    readonly elem?: number;
    readonly occupation?: number;
    readonly note?: string;
    readonly skill_1?: number;
    readonly skill_2?: number;
    readonly skill_3?: number;
    readonly skill_4?: number;
}

type AttributeKey = "atk" | "hp" | "def" | "spd";
type BaseRow = Readonly<Record<AttributeKey, number>> & { readonly type: number; readonly star: number };
type RateRow = Readonly<Record<`${AttributeKey}_rate` | `${AttributeKey}_grow`, number>> &
    { readonly hero_id: number; readonly grade: number };

interface SkillRow {
    readonly type: number;
    readonly level: number;
    readonly lan_name: number;
    readonly lan_describe: number;
}

interface EvolutionRow {
    readonly hero_type: number;
    readonly evolve_type: number;
    readonly level: number;
    readonly evolve_fashion_id: number;
    readonly evolve_icon_id: number;
    readonly skill_old_id: number;
    readonly skill_id: number;
    readonly skill_level: number;
    readonly attr: string;
    readonly evo_name: number;
    readonly evolve_desc: number;
}

interface LegacyIllustration {
    readonly rows: readonly SkinRow[];
    readonly templates: readonly PreviewTemplate[];
    readonly base: readonly BaseRow[];
    readonly rates: readonly RateRow[];
    readonly skills: readonly SkillRow[];
}

export class HeroIllustrationUtils {
    /** 图鉴投影无会话或实例状态。 */
    private constructor() { }

    /** 使用历史最高星级，旧服务端未带字段时才读取当前名册作为可确认的下限。 */
    public static list(
        elem: number,
        owned: readonly Pick<OwnedHero, "templateId" | "star">[] = [],
        progress?: readonly HeroIllustrationProgress[],
        config: GameConfig = GameConfig.instance,
    ): readonly HeroIllustrationEntry[] {
        const maxStars = new Map<number, number>();
        const history = progress ?? owned.map(hero => ({ templateId: hero.templateId, maxStar: hero.star }));
        for (const row of history) {
            maxStars.set(row.templateId, Math.max(row.maxStar, maxStars.get(row.templateId) ?? 0));
        }
        const legacy = this.legacyData(config);
        const entries: HeroIllustrationEntry[] = [];
        for (const skin of this.skinRows(config, legacy)) {
            const template = this.template(config, legacy, skin.type);
            if (!template || template.kind !== 1 || template.elem !== elem) {
                continue;
            }
            const handbook = this.numbers(skin.handbook);
            const limits = this.numbers(skin.star_limit);
            const models = this.numbers(skin.skin);
            for (const [index, stars] of handbook.entries()) {
                const level = config.getConfig(GConfig.HeroStar, stars)?.level_limit;
                const iconIndex = limits.findIndex(limit => limit >= stars);
                const faceModel = models[iconIndex < 0 ? models.length - 1 : iconIndex];
                const skinId = models[index];
                if (!level || !faceModel || !skinId) {
                    this.warnMissing("BOOK_ROW", `${skin.type}:${stars}`);
                    continue;
                }
                entries.push(this.entry(template, stars, level, skinId, faceModel, (maxStars.get(skin.type) ?? 0) >= stars, config));
            }
        }
        return entries.sort((left, right) => right.stars - left.stars || right.templateId - left.templateId);
    }

    /** 按原表首条记录的顺序浏览已配置进化的英雄，每个分支使用自己的最高等级。 */
    public static evolutions(elem: number, config: GameConfig = GameConfig.instance): readonly HeroIllustrationEntry[] {
        const legacy = this.legacyData(config);
        const skins = new Map(this.skinRows(config, legacy).map(skin => [skin.type, skin]));
        const rows = (config.getFileByPath("config/heroevolvelevel") as { rows: readonly EvolutionRow[] }).rows;
        const branchesByHero = new Map<number, Map<number, EvolutionRow>>();
        for (const row of rows) {
            const template = this.template(config, legacy, row.hero_type);
            if (template?.elem !== elem || !skins.has(row.hero_type)) {
                continue;
            }
            const branches = branchesByHero.get(row.hero_type) ?? new Map<number, EvolutionRow>();
            const previous = branches.get(row.evolve_type);
            if (!previous || row.level > previous.level) {
                branches.set(row.evolve_type, row);
            }
            branchesByHero.set(row.hero_type, branches);
        }
        const entries: HeroIllustrationEntry[] = [];
        for (const [templateId, branches] of branchesByHero) {
            const skin = skins.get(templateId)!;
            const limits = this.numbers(skin.star_limit);
            const models = this.numbers(skin.skin);
            const stars = limits[limits.length - 1];
            const skinId = models[models.length - 1];
            const level = config.getConfig(GConfig.HeroStar, stars)?.level_limit;
            const left = branches.get(1);
            const right = branches.get(2);
            if (!level || !skinId || !left || !right) {
                this.warnMissing("EVOLUTION_ROW", String(templateId));
                continue;
            }
            const entry = this.entry(this.template(config, legacy, templateId)!, stars, level, skinId, skinId, true, config);
            entries.push({ ...entry, evolutionBranches: [this.branch(left, config), this.branch(right, config)] });
        }
        return entries;
    }

    /** 计算图鉴四维，进化预览按原客户端先加定值再乘万分比的顺序应用分支。 */
    public static preview(
        entry: HeroIllustrationEntry,
        branch?: HeroIllustrationBranch,
        config: GameConfig = GameConfig.instance,
    ): HeroIllustrationPreview | null {
        const legacy = this.legacyData(config);
        const template = this.template(config, legacy, entry.templateId);
        const ranks = config.getConfig(GConfig.HeroUpgrade);
        const stage = Math.min(entry.stars, Math.max(...ranks.map(row => row.grade)));
        const stageStart = config.getConfig(GConfig.HeroUpgrade, stage - 1)?.level ?? 1;
        const baseRows = (config.getFileByPath("config/herobase") as { rows: readonly BaseRow[] }).rows;
        const rateRows = (config.getFileByPath("config/heroupgraderate") as { rows: readonly RateRow[] }).rows;
        const base = baseRows.find(row => row.type === entry.templateId && row.star === entry.stars)
            ?? legacy?.base.find(row => row.type === entry.templateId && row.star === entry.stars);
        const rate = rateRows.find(row => row.hero_id === entry.templateId && row.grade === stage)
            ?? legacy?.rates.find(row => row.hero_id === entry.templateId && row.grade === stage);
        if (!template || !base || !rate || entry.level < stageStart) {
            this.warnMissing("PREVIEW_STATS", `${entry.templateId}:${entry.stars}`);
            return null;
        }
        const delta = entry.level - stageStart;
        const attrs = branch?.attributes;
        const attack = this.attribute(base, rate, "atk", delta, attrs?.get(220), attrs?.get(201));
        const hp = this.attribute(base, rate, "hp", delta, attrs?.get(223), attrs?.get(102));
        const defense = this.attribute(base, rate, "def", delta, attrs?.get(224), attrs?.get(202));
        const speed = this.attribute(base, rate, "spd", delta, attrs?.get(101), attrs?.get(204));
        const skills = config.getConfig(GConfig.HeroType, entry.templateId)
            ? HeroSkillUtils.present({ templateId: entry.templateId, stage, star: entry.stars }, config)
            : this.legacySkills(template, stage, entry.stars, config, legacy?.skills ?? []);
        const before = branch && skills.find(skill => skill.id === branch.oldSkillId);
        const evolutionSkills = branch && before ? {
            before,
            after: this.skill(config, config.getConfig(GConfig.HeroSkill), before.slot, branch.newSkillId, branch.newSkillLevel),
        } : undefined;
        return { stage, attack, hp, defense, speed, skills, evolutionSkills };
    }

    /** 原图鉴各属性在全部档位成长与分支修正完成后才取整。 */
    private static attribute(
        base: BaseRow, rate: RateRow, key: AttributeKey, delta: number, addition = 0, ratio = 0,
    ): number {
        const initial = base[key] * rate[`${key}_rate`] / 10000;
        const growth = delta * base[key] * rate[`${key}_grow`] / 10000;
        return Math.floor((initial + growth + addition) * (1 + ratio / 10000));
    }

    /** 将模板、编排星级与两个不同用途的原版外观编号组成一个图鉴格。 */
    private static entry(
        template: PreviewTemplate, stars: number, level: number, skinId: number, faceModel: number,
        unlocked: boolean, config: GameConfig,
    ): HeroIllustrationEntry {
        return {
            templateId: template.type, stars, level, elem: template.elem!, occupation: template.occupation ?? 0,
            name: this.language(config, template.type) || template.note || `英雄 ${template.type}`,
            face: ResManager.hero(faceModel + 10000000), skinId, unlocked,
        };
    }

    /** 从每分支的最高等级行保留原技能、累计属性与具体进化外观。 */
    private static branch(row: EvolutionRow, config: GameConfig): HeroIllustrationBranch {
        const attributes = new Map<number, number>();
        const values = JSON.parse(row.attr) as readonly Readonly<Record<string, number>>[];
        for (const value of values) {
            for (const [id, amount] of Object.entries(value)) {
                attributes.set(Number(id), (attributes.get(Number(id)) ?? 0) + amount);
            }
        }
        return {
            type: row.evolve_type, level: row.level, fashionId: row.evolve_fashion_id,
            name: this.language(config, row.evo_name), description: this.language(config, row.evolve_desc),
            icon: ResManager.hero(row.evolve_icon_id),
            oldSkillId: row.skill_old_id, newSkillId: row.skill_id, newSkillLevel: row.skill_level, attributes,
        };
    }

    /** 补充英雄的技能同样受强化阶段限制，唯一技能说明来源仍是原语言配置。 */
    private static legacySkills(
        template: PreviewTemplate, stage: number, stars: number, config: GameConfig, rows: readonly SkillRow[],
    ): readonly HeroSkillFace[] {
        const grade = config.requireConfig(GConfig.HeroUpgrade, stage);
        const rank = config.requireConfig(GConfig.HeroStar, stars);
        const levels = [rank.skill1, rank.skill2, rank.skill3, rank.skill4];
        const enabled = [grade.skill1, grade.skill2, grade.skill3, grade.skill4];
        const ids = [template.skill_1, template.skill_2, template.skill_3, template.skill_4];
        return ids.map((id, index) => this.skill(config, rows, index, id ?? 0, enabled[index] ? levels[index] : 0));
    }

    /** 用同等级技能行生成图鉴技能说明，缺少行或语言时保留不可点击的明确状态。 */
    private static skill(
        config: GameConfig, rows: readonly SkillRow[], slot: number, id: number, level: number,
    ): HeroSkillFace {
        if (!id) {
            return { slot, id, level: 0, unlockStage: null, available: true, icon: null, name: "", description: "" };
        }
        const row = rows.find(value => value.type === id && value.level === Math.max(level, 1));
        const name = row ? this.language(config, row.lan_name) : "";
        const description = row ? this.language(config, row.lan_describe) : "";
        if (!name || !description) {
            this.warnMissing("PREVIEW_SKILL", `${id}:${level}`);
        }
        return { slot, id, level, unlockStage: null, available: !!name && !!description, icon: ResManager.skill(id),
            name: name || "技能配置缺失", description: description || "技能说明暂不可用" };
    }

    /** 从现行模板读取公共数据。原版专属补充只在图鉴内可见。 */
    private static template(config: GameConfig, legacy: LegacyIllustration | null, id: number): PreviewTemplate | undefined {
        return config.getConfig(GConfig.HeroType, id) ?? legacy?.templates.find(row => row.type === id);
    }

    /** 优先使用现行策划表，再补齐其缺少的原版图鉴皮肤行。 */
    private static skinRows(config: GameConfig, legacy: LegacyIllustration | null): readonly SkinRow[] {
        const active = (config.getFileByPath("config/skin") as { rows: readonly SkinRow[] }).rows;
        const types = new Set(active.map(row => row.type));
        return active.concat(legacy?.rows.filter(row => !types.has(row.type)) ?? []);
    }

    /** 旧包兼容时使用已有策划行，刷新完整包后恢复原版补充。 */
    private static legacyData(config: GameConfig): LegacyIllustration | null {
        try {
            return config.getFileByPath("config/hero-illustration") as LegacyIllustration;
        } catch (error) {
            if (!(error instanceof ConfigUnavailable)) {
                throw error;
            }
            this.warnMissing("PREVIEW_CONFIG", "hero-illustration");
            return null;
        }
    }

    /** 皮肤配置以 JSON 文本存储升序上限和对应模型号。 */
    private static numbers(values: string): readonly number[] {
        return JSON.parse(values) as readonly number[];
    }

    /** 读取配置包中的当前语言值，拒绝把缺失字段显示为 undefined。 */
    private static language(config: GameConfig, key: number): string {
        return config.getConfig(GConfig.Language, key)?.value?.trim() ?? "";
    }

    /** 同一缺失配置只报告一次，避免反复切页重刷模块日志。 */
    private static warnMissing(code: string, key: string): void {
        GameLog.shared.warnOnce("MODULE", "HeroIllustrationUtils", `${code}:${key}`, `图鉴缺少配置 ${key}`);
    }
}
