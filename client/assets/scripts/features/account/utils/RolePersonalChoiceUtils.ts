/** 个人空间五类装饰的展示投影，由装饰窗组合共享配置和服务端资格。 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { HERO_FACE_FALLBACK } from "../../hero/ui/HeroListPresentation";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import type { OwnedRoleTitle, RoleDecorations } from "../RoleController";

/** 装饰窗导航顺序与原装饰窗一致。 */
export type DecorationTab = "head" | "border" | "image" | "honor" | "title";

/** 头像或头像框的一格，选中时只保留当前显示操作。 */
export interface RolePortraitChoice {
    readonly id: number;
    readonly name: string;
    readonly icon: string;
    readonly hint: string;
    readonly available: boolean;
    readonly canActivate: boolean;
}

/** 贵重标记一行的权威充值进度及原配置属性。 */
export interface RoleHonorChoice {
    readonly id: number;
    readonly name: string;
    readonly icon: string;
    readonly bonus: string;
    readonly progress: string;
    readonly unlocked: boolean;
}

/** 形象窗口一条可预览的候选，只有权威解锁列表中的 ID 可以换用。 */
export interface RoleImageChoice {
    readonly id: number;
    readonly name: string;
    readonly star: number;
    readonly modelId: number;
    readonly icon: readonly string[];
    readonly condition: string;
    readonly bonus: string;
}

/** 称号卡的显示内容和来源提示。 */
export interface RoleTitleChoice {
    readonly id: number;
    readonly name: string;
    readonly icon: string;
    readonly condition: string;
    readonly bonus: string;
    readonly availability: string;
    readonly tag: string;
    readonly status: "permanent" | "active" | "locked" | "expired" | "unknown";
    readonly priority: number;
}

interface SkinRow {
    readonly type: number;
    readonly handbook: string;
    readonly star_limit: string;
    readonly skin: string;
}

export class RolePersonalChoiceUtils {
    /** 原称号的分组名，语言行缺失时按同源的排名条件回退。 */
    private static readonly TITLE_SOURCES: Readonly<Record<string, string>> = {
        main_champion_like: "冠军赛",
        main_ladder_war: "天梯争霸",
        main_team_arena: "组队竞技场",
        main_super_stage: "至尊段位赛",
    };

    /** 工具只读取原表，不单独维护角色解锁状态。 */
    private constructor() {}

    /** 旧头像先显示使用项，再按已解锁优先和原 ID 排序。 */
    public static heads(current: number, ownership: RoleDecorations | null): readonly RolePortraitChoice[] {
        const unlocked = new Set(ownership?.headIds);
        return GameConfig.instance.getConfig(GConfig.HeadUnlock).map(row => ({
            id: row.icon,
            name: "",
            icon: ResManager.head(row.icon)!,
            hint: RolePersonalChoiceUtils.lang(row.tips_lang, "该头像尚未解锁").replace(/<[^>]+>/g, ""),
            available: unlocked.has(row.icon),
            canActivate: false,
        })).sort((a, b) => RolePersonalChoiceUtils.portraitOrder(a, b, current));
    }

    /** 按旧排序显示当前框和有效持有框；可激活状态只用于预览，实际扣费由服务端决定。 */
    public static borders(
        current: number,
        ownership: RoleDecorations | null,
        now: number | null,
        quantity: (id: number) => number,
    ): readonly RolePortraitChoice[] {
        const expiration = new Map(ownership?.borders.map(row => [row.id, row.expiresAtSeconds]));
        return GameConfig.instance.getConfig(GConfig.RoleBorder).map(row => {
            const ends = expiration.get(row.icon);
            const available = ends === -1 || (ends !== undefined && now !== null && ends >= now);
            const cost = RolePersonalChoiceUtils.array<{ item_type: number; item_num: number }>(row.condition);
            return {
                id: row.icon,
                name: RolePersonalChoiceUtils.lang(row.name_lang, "头像框 " + row.icon),
                icon: ResManager.border(row.icon)!,
                hint: RolePersonalChoiceUtils.lang(row.tips_lang, "该头像框尚未激活").replace(/<[^>]+>/g, ""),
                available,
                canActivate: !!ownership && !available && row.active_type === 2 && !!cost.length
                    && cost.every(item => quantity(item.item_type) >= item.item_num),
            };
        }).sort((a, b) => RolePersonalChoiceUtils.portraitOrder(a, b, current));
    }

    /** 复用原装饰顺序，当前使用项在先，已解锁在未解锁之前。 */
    private static portraitOrder(a: RolePortraitChoice, b: RolePortraitChoice, current: number): number {
        return Number(b.id === current) - Number(a.id === current)
            || Number(b.available) - Number(a.available) || a.id - b.id;
    }

    /** 日服累计充值门槛和展示单位沿原表，资格由服务端提供的累计值决定。 */
    public static honors(ownership: RoleDecorations | null): readonly RoleHonorChoice[] {
        return GameConfig.instance.getConfig(GConfig.RolePeerage).map(row => {
            const unlocked = ownership !== null && ownership.totalRecharge >= row.recharge;
            const bonus = RolePersonalChoiceUtils.array<Readonly<Record<string, number>>>(row.ability)
                .map(entry => Object.entries(entry).map(([key, value]) => {
                    const template = RolePersonalChoiceUtils.lang(2140000 + Number(key), "属性 " + key + ":##p##%");
                    return template.replace("##p##", String(value / 100));
                }).join(" ")).join("  ");
            const progress = ownership === null ? "等待累计充值同步"
                : "累计充值：" + ownership.totalRecharge / 100 + "/" + row.recharge / 100 + "pt";
            return {
                id: row.level,
                name: row.nick,
                icon: ResManager.ui("role", "setting-identification_spr-" + row.level + "-da"),
                bonus,
                progress,
                unlocked,
            };
        }).sort((a, b) => a.id - b.id);
    }

    /** 形象和英雄展示复用旧英雄格的星级品质色。 */
    public static heroFrame(star: number): string {
        const quality = star >= 10 ? 5 : star >= 5 ? 4 : star >= 4 ? 3 : star >= 3 ? 2 : star > 0 ? 1 : 0;
        return ResManager.ui("common", "other_rare-" + quality);
    }

    /** 根据原英雄格星段选择金星、进阶星和高星徽章。 */
    public static heroStarMarkers(star: number): { count: number; icon: string } {
        if (star >= 10) {
            return { count: 1, icon: ResManager.ui("bag", "backpack_spr-star-bg-2") };
        }
        return {
            count: star <= 5 ? star : star - 5,
            icon: ResManager.ui("common", "other_star-" + (star > 5 ? 1 : 0)),
        };
    }

    /** 旧形象编码用一亿作为星级分界，皮肤 ID 原样保存。 */
    public static imageTab(imageId: number): number {
        const star = Math.floor(imageId / 100_000_000);
        return star >= 10 ? 2 : star >= 6 ? 1 : imageId && !star ? 3 : 0;
    }

    /** 读取旧皮肤图鉴的星段，按星级及模板号倒序，当前形象放到本页首格。 */
    public static images(tab: number, currentId: number): readonly RoleImageChoice[] {
        const config = GameConfig.instance;
        if (tab === 3) {
            return config.getConfig(GConfig.HeroFashion).map(row => {
                const face = HeroCatalog.find(row.hero_type);
                const name = RolePersonalChoiceUtils.lang(row.fashion_name, row.hero_name || face?.name || String(row.fashion_id));
                return {
                    id: row.fashion_id, name, star: 0, modelId: row.fashion_id,
                    icon: [ResManager.portrait(row.fashion_id), face?.icon, HERO_FACE_FALLBACK]
                        .filter((source): source is string => !!source),
                    condition: "拥有皮肤「" + name + "」", bonus: "",
                };
            }).sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId) || a.id - b.id);
        }
        const choices: RoleImageChoice[] = [];
        for (const row of RolePersonalChoiceUtils.rows<SkinRow>("skin")) {
            if (config.getConfig(GConfig.HeroType, row.type)?.kind !== 1) {
                continue;
            }
            const limits = RolePersonalChoiceUtils.array<number>(row.star_limit);
            const skins = RolePersonalChoiceUtils.array<number>(row.skin);
            const face = HeroCatalog.find(row.type);
            for (const star of RolePersonalChoiceUtils.array<number>(row.handbook)) {
                const id = star * 100_000_000 + row.type;
                if (RolePersonalChoiceUtils.imageTab(id) !== tab) {
                    continue;
                }
                // 旧资源表以星级上界分段，超过最后一段时仍用最后一个造型。
                const firstLimit = limits.findIndex(limit => star <= limit);
                const index = firstLimit === -1 ? limits.length - 1 : firstLimit;
                const modelId = skins[index] || row.type;
                choices.push({
                    id, name: face?.name || String(row.type), star, modelId,
                    icon: [modelId === row.type ? null : ResManager.portrait(modelId), face?.icon, HERO_FACE_FALLBACK]
                        .filter((source): source is string => !!source),
                    condition: "解锁条件：达到" + star + "星",
                    bonus: RolePersonalChoiceUtils.lang(41273, "无属性加成"),
                });
            }
        }
        return choices.sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId) || b.id - a.id);
    }

    /** 以权威期限覆盖称号目录，永久置顶，其后是有效限时称号。 */
    public static titles(states: readonly OwnedRoleTitle[] | null, now: number | null): readonly RoleTitleChoice[] {
        const expires = new Map(states?.map(state => [state.idx, state.endTimeSeconds]));
        return GameConfig.instance.getConfig(GConfig.RoleTitle).map(row => {
            const end = expires.get(row.idx);
            const status = states === null ? "unknown" : end === -1 ? "permanent" : end === undefined ? "locked"
                : end === 0 ? "expired" : now === null ? "unknown" : now < end ? "active" : "expired";
            const availability = status === "permanent" ? "永久" : status === "active" && now !== null && end !== undefined
                ? "剩余 " + RolePersonalChoiceUtils.duration(end - now) : status === "expired" ? "已失效"
                : status === "locked" ? (row.time > 0 ? "未获得 · 限时" : "未获得 · 永久") : "等待状态同步";
            return {
                id: row.idx, name: row.name, status, availability,
                tag: row.time > 0 ? "限时" : "永久",
                icon: ResManager.ui("role", "role-title_title" + row.resources_id),
                condition: RolePersonalChoiceUtils.lang(row.remark,
                    RolePersonalChoiceUtils.titleCondition(row.idx, row.jump, row.condition)),
                bonus: RolePersonalChoiceUtils.attributes(row.ability),
                priority: status === "permanent" ? 2 : status === "active" ? 1 : 0,
            } as const;
        }).sort((a, b) => b.priority - a.priority || a.id - b.id);
    }

    /** 旧称号条件为起止名次，来源由旧跳转参数确定；至尊组后半为巅峰决赛。 */
    private static titleCondition(id: number, jump: string, rank: string): string {
        const target = (JSON.parse(jump) as { readonly event_arg: string }).event_arg;
        const source = target === "main_super_stage" && id > 12 ? "巅峰赛决赛" : RolePersonalChoiceUtils.TITLE_SOURCES[target];
        if (!source) {
            return "获取条件配置缺失";
        }
        const [first, last] = rank.split("_");
        return source + "第" + (first === last || !last ? first : first + "～" + last) + "名";
    }

    /** 使用当前语言表读取旧称号和形象的原文案。 */
    private static lang(key: number, fallback: string): string {
        const text = GameConfig.instance.getConfig(GConfig.Language, key)?.value;
        return typeof text === "string" && text.length ? text : fallback;
    }

    /** 根据旧类型编号拼接原属性名称和数值。 */
    private static attributes(value: string): string {
        const rows = RolePersonalChoiceUtils.array<Readonly<Record<string, number>>>(value);
        const attributes: string[] = [];
        for (const row of rows) {
            for (const [key, amount] of Object.entries(row)) {
                const label = RolePersonalChoiceUtils.lang(122000 + Number(key), "属性 " + key);
                attributes.push(label + " +" + amount);
            }
        }
        return attributes.join("  ");
    }

    /** 把服务器剩余秒数转换为称号行显示的天、时、分、秒。 */
    private static duration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds % 3600 / 60);
        const remainder = seconds % 60;
        return hours >= 24 ? Math.floor(hours / 24) + "天" + hours % 24 + "小时"
            : hours ? hours + "小时" + minutes + "分" : minutes ? minutes + "分" + remainder + "秒" : remainder + "秒";
    }

    /** 旧导出的数组单元格可能保留 JSON 文本，统一读取不保存副本。 */
    private static array<T>(value: string | readonly T[]): readonly T[] {
        return typeof value === "string" ? JSON.parse(value) as readonly T[] : value;
    }

    /** 读取整包内旧表数据；内容不随窗口重复请求。 */
    private static rows<T>(name: string): readonly T[] {
        return (GameConfig.instance.getFileByPath("config/" + name) as { readonly rows: readonly T[] }).rows;
    }

}
