/** 应用配置分组与 Creator 读取装配；数据仅存于 GameConfig，不建立第二份配置仓库。 */
import { JsonAsset, resources } from "cc";
import { GameConfig } from "./GameConfig";
import { GConfig } from "./GConfig";
import type { GateSnapshot } from "./nav";

/** Creator 读取 JSON；版本标识由发布资源选择器处理，当前仅支持本机同版本资源。 */
function loadConfigJson(path: string, version: string): Promise<unknown> {
    if (version !== "initial") return Promise.reject(new Error("本机配置未提供资源版本：" + version));
    return new Promise((resolve, reject) => resources.load(path, JsonAsset, (error, asset) => {
        if (error || !asset || asset.json == null) reject(error || new Error("配置资源缺失：" + path));
        else resolve(asset.json);
    }));
}
GameConfig.instance.initialize(loadConfigJson);
export const REMAKE_CONFIG_GROUPS = {
    startup: [GConfig.Language, GConfig.LoadingTips],
    city: [GConfig.OpenCondition, GConfig.SystemGate, GConfig.CityPosition, GConfig.CityButton, GConfig.CityEffect],
    hero: [GConfig.HeroType, GConfig.Item],
    heroDetail: [GConfig.HeroType, GConfig.HeroSkill, GConfig.HeroStar, GConfig.HeroUpgrade, GConfig.Language, GConfig.Item],
    heroLevel: [GConfig.HeroLevel],
    inventory: [GConfig.Item, GConfig.Language, GConfig.TimeLimitItem],
} as const;
/** 首屏只加载文字与提示，不提前加载主城、英雄和库存配置。 */
export const prepareStartupConfig = (progress?: (done: number, total: number) => void) => GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.startup, progress);
/** 主城打开前原子准备其配置组。 */
export const prepareCityConfig = () => GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.city);
/** 英雄与出阵打开前准备展示配置，共享已加载请求。 */
export const prepareHeroConfig = () => GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.hero);
/** 普通升级详情打开时才加载当前等级消耗表，不扩大登录/列表预载。 */
export const prepareHeroLevelConfig = () => GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.heroLevel);
/** 背包打开前准备库存显示配置。 */
export const prepareInventoryConfig = () => GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.inventory);
/** 未准备主城组时返回 null；就绪后直接引用只读配置，不再维护门槛副本。 */
export function readCityGates(): GateSnapshot | null {
    if (GameConfig.instance.status(GConfig.OpenCondition).state !== "ready" || GameConfig.instance.status(GConfig.SystemGate).state !== "ready") return null;
    return { opencondition: GameConfig.instance.getConfig(GConfig.OpenCondition), systemGate: GameConfig.instance.getConfig(GConfig.SystemGate) };
}

/** 只读详情打开前准备技能与星级规则，不增加登录或列表首屏加载。 */
export const prepareHeroDetailConfig = () => GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.heroDetail);
