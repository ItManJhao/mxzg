/** 应用配置分组与 Creator 读取装配；数据仅存于 GameConfig，不建立第二份配置仓库。 */
import { ResourceAssetsUtils } from "../framework/assets/ResourceAssetsUtils";
import { GameConfig } from "./GameConfig";
import { GConfig } from "./GConfig";
import type { GateSnapshot } from "./CityNavigationUtils";
/** Creator 读取 JSON；版本标识由发布资源选择器处理，当前仅支持本机同版本资源。 */
function loadConfigJson(path: string, version: string): Promise<unknown> {
    if (version !== "initial") {
        return Promise.reject(new Error("本机配置未提供资源版本：" + version));
    }
    return ResourceAssetsUtils.loadConfig(path);
}
GameConfig.instance.initialize(loadConfigJson);
export const REMAKE_CONFIG_GROUPS = {
    city: [GConfig.OpenCondition, GConfig.SystemGate, GConfig.CityPosition, GConfig.CityButton, GConfig.CityEffect],
    hero: [GConfig.HeroType, GConfig.Item],
    heroDetail: [GConfig.EquipmentType, GConfig.HeroType, GConfig.HeroSkill, GConfig.HeroStar, GConfig.HeroUpgrade, GConfig.Language, GConfig.Item],
    inventory: [GConfig.Item, GConfig.Language, GConfig.TimeLimitItem],
} as const;
/** 页面配置前置与主城门槛快照入口，唯一存储仍归GameConfig。 */
export class RemakeConfigUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 主城打开前原子准备其配置组。 */
    public static prepareCityConfig() {
        return GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.city);
    }

    /** 英雄与出阵打开前准备展示配置，共享已加载请求。 */
    public static prepareHeroConfig() {
        return GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.hero);
    }

    /** 背包打开前准备库存显示配置。 */
    public static prepareInventoryConfig() {
        return GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.inventory);
    }

    /** 未准备主城组时返回 null；就绪后直接引用只读配置，不再维护门槛副本。 */
    public static readCityGates(): GateSnapshot | null {
        if (GameConfig.instance.status(GConfig.OpenCondition).state !== "ready" || GameConfig.instance.status(GConfig.SystemGate).state !== "ready") {
            return null;
        }
        return { opencondition: GameConfig.instance.getConfig(GConfig.OpenCondition), systemGate: GameConfig.instance.getConfig(GConfig.SystemGate) };
    }

    /** 只读详情打开前准备技能与星级规则，不增加登录或列表首屏加载。 */
    public static prepareHeroDetailConfig() {
        return GameConfig.instance.prepare(REMAKE_CONFIG_GROUPS.heroDetail);
    }
}
