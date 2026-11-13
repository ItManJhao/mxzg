/** 三阶段唯一人工配置入口：直接列页面、资源或配置，不使用模块预热清单。
 * 未列入任何阶段的资源在实际使用时加载，不扫描全目录、不全量常驻。
 * 预制体的直接绑定依赖由Creator自动带入；加载资源不等于开放对应玩法。
 */
import { ResourceAssetsUtils } from "../../framework/assets/ResourceAssetsUtils";
import { ResourceDescriptor, ResourceKind } from "../../framework/assets/ResourceTypes";
import { ConfigName, GConfig } from "../../config/GConfig";
import type { ViewClass } from "../../framework/ui/UIRegistry";
import { ServerPickerView } from "../../features/account/ui/ServerPickerView";
import { RemakeHomeView } from "../../features/home/ui/RemakeHomeView";
import { BagView } from "../../features/bag/ui/BagView";
import { BagInfoView } from "../../features/bag/ui/BagInfoView";
import { HeroListView } from "../../features/hero/ui/HeroListView";
import { HeroInfoView } from "../../features/hero/ui/HeroInfoView";
import { MainChapterView } from "../../features/battle/ui/MainChapterView";

/** 页面只引用View类的唯一Prefab定义；预载不调用prepare。其他目标直接写资源或需要解析的配置。 */
export type LoadingTarget = ResourceDescriptor | { bundle: string; path: string; type: ResourceKind }
    | { config: ConfigName } | { page: ViewClass<unknown> };

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
        ResourceAssetsUtils.describe("spine", "jiemian", "SkeletonData"),
        ResourceAssetsUtils.describe("spine", "jindutiao", "SkeletonData"),
        ResourceAssetsUtils.describe("maps", "ui/map-bg-loading", "SpriteFrame"),
        ResourceAssetsUtils.describe("audio", "bgm-logo", "AudioClip"),
        { page: ServerPickerView },
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
        { page: RemakeHomeView },
        { page: BagView },
    ],
    background: [
        { page: BagInfoView },
        { page: HeroListView },
        { page: HeroInfoView },
        { page: MainChapterView },
        // 自定义资源示例：{ bundle: "spine", path: "shangcheng", type: "SkeletonData" }
        // 图片路径须指向SpriteFrame，例如：common包内ui/other_rare-4/spriteFrame。
    ],
};
