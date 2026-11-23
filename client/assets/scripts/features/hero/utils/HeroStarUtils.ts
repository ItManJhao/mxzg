/**
 * 把旧升星配方投影为材料行、替代品与只读消费文案。
 * 英雄详情用已同步名册筛选素材，最终角色归属与扣费由服务器复核。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig, type HeroTypeRow } from "../../../config/GConfig";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroCatalog } from "./HeroCatalog";

/** 来自英雄模板原表的单行材料。 */
interface RawStarMaterial {
    readonly type: number;
    readonly elem: number;
    readonly star: number;
    readonly num: number;
    readonly replace_item?: number;
}

/** 角色背包内的一项实际物品成本。 */
export interface HeroStarCost {
    readonly itemId: number;
    readonly quantity: number;
}

/** 对应配置原顺序中的一行，0 表示任意类型或元素，-1 表示与目标同类。 */
export interface HeroStarMaterialRow {
    readonly row: number;
    readonly templateId: number;
    readonly element: number;
    readonly star: number;
    readonly count: number;
    readonly replacementItemId: number | null;
    readonly label: string;
}

/** 下一星的完整展示输入，角色等级与世界等级满足其一即可。 */
export interface HeroStarRecipe {
    readonly fromStar: number;
    readonly toStar: number;
    readonly roleLevel: number;
    readonly worldLevel: number;
    readonly minimumOwnedStar: number;
    readonly minimumOwnedHeroes: number;
    readonly costs: readonly HeroStarCost[];
    readonly rows: readonly HeroStarMaterialRow[];
}

/** 配方与候选均由当前已安装配置和名册计算，切换区服或英雄不保留旧数据。 */
export class HeroStarUtils {
    /** 元素索引与 HeroType 对应，0 是通配。 */
    private static readonly elementLabels = ["任意系", "火系", "水系", "木系", "光系", "暗系"];

    /** 配方与选择计算不需要创建工具实例。 */
    private constructor() {}

    /** 遇到第一个空配方时停止，以连续可达星级决定详情页签和符文显示。 */
    public static highestStar(hero: OwnedHero, config = GameConfig.instance): number {
        const template = config.getConfig(GConfig.HeroType, hero.templateId);
        let star = hero.star;
        while (this.materialsAt(template, star + 1).length > 0) {
            star++;
        }
        return star;
    }

    /** 下一星没有配方时返回空数组。 */
    private static materialsAt(template: HeroTypeRow | undefined, star: number): readonly RawStarMaterial[] {
        const source = template?.[`to_${star}_star` as keyof HeroTypeRow];
        return typeof source === "string" && source ? JSON.parse(source) as RawStarMaterial[] : [];
    }

    /** 按当前实例或图鉴中的模板和星级读取真实配方，没有后续配方则返回 null。 */
    public static recipe(hero: Pick<OwnedHero, "templateId" | "star">, config = GameConfig.instance): HeroStarRecipe | null {
        const template = config.getConfig(GConfig.HeroType, hero.templateId);
        const toStar = hero.star + 1;
        const materials = this.materialsAt(template, toStar);
        if (!materials.length) {
            return null;
        }
        const rank = config.requireConfig(GConfig.HeroStar, hero.star);
        const costs = new Map<number, number>();
        for (const items of [rank.upstar_cost, rank.need_item]) {
            const rows: Array<{ item_type: number; item_num: number }> = JSON.parse(items || "[]");
            for (const item of rows) {
                costs.set(item.item_type, (costs.get(item.item_type) ?? 0) + item.item_num);
            }
        }
        const [minimumOwnedStar, minimumOwnedHeroes] = toStar === 14 ? this.ownedRequirement(config) : [0, 0];
        return {
            fromStar: hero.star,
            toStar,
            roleLevel: rank.role_level_require ?? 0,
            worldLevel: rank.world_level_require ?? 0,
            minimumOwnedStar,
            minimumOwnedHeroes,
            costs: Array.from(costs, ([itemId, quantity]) => ({ itemId, quantity })),
            rows: materials.map((material, row) => {
                const replacement = material.replace_item || null;
                const group = material.elem === -1 ? "同系" : this.elementLabels[material.elem];
                const name = material.type > 0 ? HeroCatalog.find(material.type, config)?.name ?? String(material.type)
                    : material.type === -1 ? "同名英雄" : `${group}英雄`;
                const replacementName = replacement ? BagItemCatalog.face(replacement, 1, config).title : "";
                return {
                    row,
                    templateId: material.type,
                    element: material.elem,
                    star: material.star,
                    count: material.num,
                    replacementItemId: replacement,
                    label: `${material.star}星${name} ×${material.num}${replacementName ? `（可用${replacementName}替代）` : ""}`,
                };
            }),
        };
    }

    /** 按模板和原配方筛选实际素材，主英雄未选时 id 可省略，已选时始终排除本体。 */
    public static candidates(target: Pick<OwnedHero, "templateId"> & { readonly id?: string },
        row: HeroStarMaterialRow, owned: readonly OwnedHero[],
        selectedHeroIds: Iterable<string>, config = GameConfig.instance): readonly OwnedHero[] {
        const selected = new Set(selectedHeroIds);
        const type = row.templateId === -1 ? target.templateId : row.templateId;
        const element = row.element === -1 ? config.requireConfig(GConfig.HeroType, target.templateId).elem : row.element;
        return owned.filter(hero => hero.id !== target.id && hero.locked === false && hero.deployed === false
            && !selected.has(hero.id) && hero.star === row.star
            && (type === 0 || hero.templateId === type)
            && (element === 0 || config.requireConfig(GConfig.HeroType, hero.templateId).elem === element));
    }

    /** 与旧 14 星条件共用系统策划规则，值依次是最低星级及要求数量。 */
    private static ownedRequirement(config: GameConfig): readonly [number, number] {
        const table = config.getFileByPath("config/system") as { rows: readonly { key: string; value: unknown }[] } | null;
        const value = table?.rows.find(row => row.key === "need_star_num")?.value;
        if (typeof value !== "string") {
            throw new Error("缺少 14 星名册条件");
        }
        return JSON.parse(value) as [number, number];
    }
}
