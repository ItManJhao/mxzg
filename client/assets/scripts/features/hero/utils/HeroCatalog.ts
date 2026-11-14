/** 英雄模板显示投影：按需查询唯一GameConfig中的当前英雄行及必要的物品回退行。
 * 不再按页面复制整表或建立模板Map；仅返回名称、元素和图标，不持有玩家、配置或资源状态。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
export interface HeroTemplateFace {
    readonly templateId: number;
    readonly name: string;
    readonly elem: number | null;
    readonly icon: string | null;
}
/** 只计算一个模板的显示字段，配置所有权及索引归GameConfig。 */
export class HeroCatalog {
    /** 无状态工具只提供静态入口，不创建页面专属配置对象。 */
    private constructor() {
    }

    /**
     * 按模板主键读取已安装配置并投影当前显示；缺行返回null，调用方显示明确缺失。
     * @param config 默认使用应用唯一仓库，独立规则检查可传入已准备的真实GameConfig。
     */
    public static find(templateId: number, config: GameConfig = GameConfig.instance): HeroTemplateFace | null {
        if (!HeroCatalog.positive(templateId)) {
            return null;
        }
        const row = config.getConfig(GConfig.HeroType, templateId);
        if (!row) {
            return null;
        }
        const iconId = row.item_id;
        let icon = HeroCatalog.positive(iconId) ? ResManager.hero(iconId) : null;
        if (!icon) {
            const item = config.getConfig(GConfig.Item, templateId);
            // 保留原有仅接受hero-icon物品图标的回退，不把其他物品图片当英雄头像。
            if (item && typeof item.icon === "string" && /^hero-icon\/([A-Za-z0-9_-]+)$/.test(item.icon)) {
                icon = BagItemCatalog.iconSource(item);
            }
        }
        const elem = row.elem;
        return Object.freeze({
            templateId: row.type,
            name: typeof row.note === "string" && row.note.trim() ? row.note.trim() : "英雄 " + row.type,
            elem: HeroCatalog.positive(elem) && elem <= 5 ? elem : null,
            icon,
        });
    }

    /** 判断配置中的正整数 ID，不将占位值当作有效模板。 */
    private static positive(value: unknown): value is number {
        return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    }
}
