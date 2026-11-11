/** 图片资源统一入口：集中图标路径规则、获取与赋值，供页面和展示工具调用。
 * 复用ResourceAssetsUtils的节点作用域和现有ResourcePool；不建立另一份资源缓存。
 * 不维护图片可用清单；缺图按路径去重记录，节点销毁和旧显示请求不再赋图。
 */
import { Node, Sprite, SpriteFrame } from "cc";
import { GameLog } from "../../core/GameLog";
import { ResourceAssetsUtils } from "./ResourceAssets";
import { ResourceDescriptor } from "./ResourceTypes";

export type SpriteSource = string | ResourceDescriptor<"SpriteFrame">;

export class ResManager {
    /** 按模块目录和原始文件名取得resources内图片路径，不查询名称清单。 */
    public static ui(module: string, name: string): string {
        return "ui/" + module + "/" + name;
    }

    /** 品质0至6对应公共品质框；非法品质回退0，不维护逐项映射。 */
    public static qualityFrame(quality: number): string {
        const value = Number.isInteger(quality) && quality >= 0 && quality <= 6 ? quality : 0;
        return this.ui("common", "other_rare-" + value);
    }

    /** 每个图片节点的最新赋图代次；弱引用不延长节点寿命，不保存图片缓存。 */
    private static readonly revisions = new WeakMap<Node, number>();

    /** 统一入口无需创建实例。 */
    private constructor() {}

    /** 获取图片并由owner节点持有；共享缓存和在途请求，销毁后拒绝迟到结果。
     * 字符串为resources内不带/spriteFrame的路径；描述支持其他Bundle或UUID。
     * 失败向调用方拒绝，由setSprite处理日志和候选图回退。
     */
    public static getSpriteFrame(owner: Node, source: SpriteSource): Promise<SpriteFrame> {
        return ResourceAssetsUtils.forNode(owner).load(
            typeof source === "string" ? ResourceAssetsUtils.sprite(source) : source,
        );
    }

    /** 显示单张图片或依次尝试候选图；仅最新请求且isCurrent仍为true时赋图。
     * null表示清空当前图片并使旧请求失效，不发请求；实际加载失败打印路径和原因后继续回退。
     */
    public static setSprite(
        node: Node | null,
        source: SpriteSource | readonly SpriteSource[] | null,
        isCurrent: () => boolean = () => true,
    ): void {
        const sources: readonly SpriteSource[] = source === null ? []
            : typeof source === "string" || !Array.isArray(source) ? [source as SpriteSource] : source;
        if (!node?.isValid) {
            return;
        }
        const image = node.getComponent(Sprite);
        if (!image) {
            return;
        }
        const revision = (this.revisions.get(node) || 0) + 1;
        this.revisions.set(node, revision);
        if (source === null) {
            image.spriteFrame = null;
            return;
        }
        const current = () => node.isValid && image.isValid && this.revisions.get(node) === revision && isCurrent();
        const load = async () => {
            for (const source of sources) {
                if (!current()) {
                    return;
                }
                try {
                    const frame = await this.getSpriteFrame(node, source);
                    if (current()) {
                        image.spriteFrame = frame;
                    }
                    return;
                } catch (error) {
                    if (current()) {
                        const path = typeof source === "string" ? "resources/" + source
                            : source.bundle + "/" + source.loadPath;
                        GameLog.shared.warnOnce("FRAMEWORK", "ResManager", "IMAGE_LOAD_FAILED:" + path,
                            "图片加载失败：" + path + "；原因：" + String(error));
                    }
                }
            }
        };
        void load();
    }

    /** 按物品配置图标后缀生成路径，允许配置共图；不检查文件存在性。 */
    public static item(id: number | string): string | null {
        if (typeof id === "number" && (!Number.isSafeInteger(id) || id <= 0)) {
            return null;
        }
        const suffix = String(id);
        return /^[A-Za-z0-9_-]+$/.test(suffix) ? "icons/item/backpack_" + suffix : null;
    }

    /** 按英雄配置item_id生成基础头像路径；不以模板ID或当前星级替代。 */
    public static hero(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 1 ? "ui/hero/hero-icon_" + id : null;
    }

    /** 按战报冻结portraitIconId生成头像路径，不查询当前英雄外观。 */
    public static portrait(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 1 ? "ui/hero/hero-icon_" + id : null;
    }

    /** 按配置ID生成路径，不检查图片是否存在；非法ID返回null。 */
    public static head(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 0 ? "ui/hero/head-icon_" + id : null;
    }

    /** 按配置ID生成路径，不检查图片是否存在；非法ID返回null。 */
    public static skill(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 1 ? "ui/hero/skill-icon_" + id : null;
    }

    /** 按配置ID生成路径，不检查图片是否存在；非法ID返回null。 */
    public static equipment(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 1 ? "icons/item/backpack_" + id : null;
    }

    /** 0为默认框，其余沿用旧编号偏移；是否缺图由加载结果判断。 */
    public static border(id: number): string | null {
        if (!Number.isSafeInteger(id) || id < 0 || !Number.isSafeInteger(id + 1005000)) {
            return null;
        }
        return id === 0 ? "ui/bag/backpack_border-default" : "icons/item/backpack_" + (1005000 + id);
    }
}
