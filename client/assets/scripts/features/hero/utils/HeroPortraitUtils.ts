/**
 * 按英雄模板、星级和进化分支选择日服英雄详情立绘。
 * 仅查导入时生成的外观和布局映射，加载及 Spine 回退由详情页负责。
 */
import { HERO_EVOLUTION_MODELS, HERO_PORTRAITS, HERO_SKIN_MODELS } from "./HeroPortraitData";

/** 详情页定位完整立绘所需的本地资源路径及日服布局参数。 */
export interface HeroPortraitInfo {
    /** 包名与包内相对路径；由资源层补齐 SpriteFrame 后缀。 */
    readonly path: string;
    /** 等比转换后的完整画布宽高，单位为图片像素。 */
    readonly width: number;
    readonly height: number;
    /** 日服量取的人物外接框，按左、上、右、下排列，原点为图片左上像素。 */
    readonly box: readonly [number, number, number, number];
    /** 原布局的等比缩放系数。 */
    readonly zoom: number;
    /** 设计单位偏移量，向右为正。 */
    readonly offsetX: number;
    /** 设计单位偏移量，向上为正。 */
    readonly offsetY: number;
}

export class HeroPortraitUtils {
    /** 立绘配置查询无实例状态。 */
    private constructor() { }

    /**
     * 返回持久英雄当前形态的立绘及布局。无公开立绘时返回 null，由页面显示当前形态的 Spine。
     * @param templateId 英雄类型配置 ID。
     * @param star 当前英雄星级。
     * @param evolution 服务端快照中当前生效的进化分支和等级。
     */
    public static find(
        templateId: number,
        star: number,
        evolution?: Readonly<{ type: number; level: number }>,
    ): HeroPortraitInfo | null {
        const evolvedModel = evolution && HERO_EVOLUTION_MODELS[`${templateId}:${evolution.type}:${evolution.level}`];
        const model = evolvedModel ?? HeroPortraitUtils.modelForStar(templateId, star);
        const row = HERO_PORTRAITS[model];
        if (!row) {
            return null;
        }
        const [name, width, height, left, top, right, bottom, zoom, offsetX, offsetY] = row;
        return {
            path: `hero/portraits/${name}`,
            width,
            height,
            box: [left, top, right, bottom],
            zoom,
            offsetX,
            offsetY,
        };
    }

    /** 旧外观表以星级上限升序挑选；高于末个上限时仍使用末形态。 */
    private static modelForStar(templateId: number, star: number): number {
        const shape = HERO_SKIN_MODELS[templateId];
        if (!shape) {
            return templateId;
        }
        const [limits, models] = shape;
        const index = limits.findIndex(limit => limit >= star);
        return models[index < 0 ? models.length - 1 : index];
    }
}
