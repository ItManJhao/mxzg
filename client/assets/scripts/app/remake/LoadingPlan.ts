/** 三阶段唯一人工配置入口：直接列资源或配置，不使用模块预热清单。
 * 未列入任何阶段的资源在实际使用时加载，不扫描全目录、不全量常驻。
 * 预制体的直接绑定依赖由Creator自动带入；加载资源不等于开放对应玩法。
 */
import { ResourceCatalog, ResourceDescriptor, ResourceKind } from "../../framework/assets/ResourceCatalog";
import { ConfigName, GConfig } from "../../config/GConfig";

/** 使用生成描述、Bundle内实际加载路径与类型，或需要解析的游戏配置。 */
export type LoadingTarget = ResourceDescriptor | { bundle: string; path: string; type: ResourceKind } | { config: ConfigName };

/** 三个数组分别决定加载时机；空数组表示该阶段不准备额外资源。 */
export const LOADING_PLAN: {
    /** 登录页面出现前必须完成的目标。 */
    login: readonly LoadingTarget[];
    /** 登录成功后、主城出现前必须完成的目标。 */
    enterGame: readonly LoadingTarget[];
    /** 主城显示后逐项准备的常用目标，不阻塞进入主城。 */
    background: readonly LoadingTarget[];
} = {
    login: [
        { config: GConfig.Language },
        { config: GConfig.LoadingTips },
        ResourceCatalog.spine.jiemian,
        ResourceCatalog.spine.jindutiao,
        ResourceCatalog.maps.map_bg_loading,
        ResourceCatalog.audio.bgm_logo,
        ResourceCatalog.prefab_login.ServerPickerView,
    ],
    enterGame: [
        { config: GConfig.OpenCondition },
        { config: GConfig.SystemGate },
        { config: GConfig.CityPosition },
        { config: GConfig.CityButton },
        { config: GConfig.CityEffect },
        { config: GConfig.Item },
        { config: GConfig.Language },
        { config: GConfig.TimeLimitItem },
        ResourceCatalog.prefab_remake_home.RemakeHomeView,
        ResourceCatalog.prefab_bag.BagView,
    ],
    background: [
        ResourceCatalog.prefab_bag.BagInfoView,
        ResourceCatalog.prefab_hero.HeroListView,
        ResourceCatalog.prefab_hero.HeroInfoView,
        ResourceCatalog.prefab_battle.MainChapterView,
        // 自定义资源示例：{ bundle: "resources", path: "spine/shangcheng", type: "SkeletonData" }
        // 图片路径须指向SpriteFrame，例如：ui/common/other_rare-4/spriteFrame。
    ],
};
