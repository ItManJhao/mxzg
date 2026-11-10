/** 公共动态界面图片定义：页签、品质框、缺图占位和装备空槽在此统一命名。
 * 仅供页面显示取图；分阶段加载仅由LoadingPlan安排，不依赖本文件。
 * 图片实际路径和UUID由生成的ResourceCatalog提供，本文件只声明用途和顺序。
 */
import { ResourceCatalog, ResourceDescriptor } from "./ResourceCatalog";

export class CommonUiResources {
    /** 静态资源定义无需实例化。 */
    private constructor() {}

    /** 道具及奖励图片缺失时显示的占位图，不作为英雄头像占位。 */
    public static readonly itemPlaceholder = ResourceCatalog.common.backpack_spr_default;

    /** 页签普通与选中图片，供页面切换时选择显示。 */
    public static readonly tabs = {
        normal: ResourceCatalog.common.button_btn_tab_23,
        selected: ResourceCatalog.common.button_btn_tab_24,
    } as const;

    /** 取得品质0至6对应的已登记资源；异常品质使用0，不另列七份映射。 */
    public static qualityFrame(quality: number): ResourceDescriptor<"SpriteFrame"> {
        const value = Number.isInteger(quality) && quality >= 0 && quality <= 6 ? quality : 0;
        return ResourceCatalog.common[("other_rare_" + value) as keyof typeof ResourceCatalog.common];
    }

    /** 普通装备槽1至4的空槽图片，按槽位顺序排列；不表示已开放穿脱。 */
    public static readonly equipmentEmptySlots = [
        ResourceCatalog.common.other_spr_equip_1,
        ResourceCatalog.common.other_spr_equip_2,
        ResourceCatalog.common.other_spr_equip_3,
        ResourceCatalog.common.other_spr_equip_4,
    ] as const;
}
