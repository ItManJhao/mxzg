/** 由tools/prefab-plan.json和generate_resources.cjs生成的Prefab准入查询，不手工修改。 */
const paths = new Set<string>([
    "bundles/module/bag/prefabs/BagInfoView",
    "bundles/module/bag/prefabs/BagTabView",
    "bundles/module/bag/prefabs/BagView",
    "bundles/module/battle/prefabs/BattleDetailCell",
    "bundles/module/battle/prefabs/BattleDetailLayer",
    "bundles/module/battle/prefabs/BattlePage",
    "bundles/module/battle/prefabs/ChapterEndView",
    "bundles/module/battle/prefabs/ChapterRewardInfoCell",
    "bundles/module/battle/prefabs/ChapterRewardInfoView",
    "bundles/module/battle/prefabs/MainChapterBattleView",
    "bundles/module/battle/prefabs/MainChapterView",
    "bundles/module/battle/prefabs/SkillAuditCellView",
    "bundles/module/battle/prefabs/SkillAuditView",
    "bundles/module/bootstrap/prefabs/LoadingLayer",
    "bundles/module/common/prefabs/BagItemView",
    "bundles/module/common/prefabs/CommonPanel1",
    "bundles/module/gm/prefabs/GmOptionCellView",
    "bundles/module/gm/prefabs/GmView",
    "bundles/module/hero/prefabs/FormationHeroCellView",
    "bundles/module/hero/prefabs/FormationView",
    "bundles/module/hero/prefabs/HeroIconCellView",
    "bundles/module/hero/prefabs/HeroInfoView",
    "bundles/module/hero/prefabs/HeroListView",
    "bundles/module/hero/prefabs/HeroSkillView",
    "bundles/module/home/prefabs/CityChromeView",
    "bundles/module/home/prefabs/CityHubView",
    "bundles/module/home/prefabs/RemakeHomeView",
    "bundles/module/login/prefabs/AccountLoginView",
    "bundles/module/login/prefabs/RoleProfileView",
    "bundles/module/login/prefabs/ServerCellView",
    "bundles/module/login/prefabs/ServerPickerView",
    "bundles/module/login/prefabs/UpdateLayer"
]);

/** 当前阶段允许加载的Prefab地址查询，不表示玩法全部开放。 */
export class PrefabPlanUtils {
    private constructor() { }

    /** 地址存在于当前生成计划时返回true，供统一加载器拒绝退役页面。 */
    public static prefabInPlan(assetPath: string): boolean {
        return paths.has(assetPath);
    }
}
