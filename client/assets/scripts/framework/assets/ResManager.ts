/** 图片资源统一入口：集中图标路径规则、获取与赋值，供页面和展示工具调用。
 * 显式取图沿用节点作用域；赋图只持有当前图片及本次在途候选，复用现有ResourcePool。
 * 不维护图片清单或新增缓存；换图、失效和销毁撤回本次拥有者，旧请求不再赋图。
 */
import { Node, Sprite, SpriteFrame } from "cc";
import { GameLog } from "../../core/GameLog";
import { AssetScope, createAssetScope, ResourceAssetsUtils } from "./ResourceAssets";
import { ResourceDescriptor } from "./ResourceTypes";

export type SpriteSource = string | ResourceDescriptor<"SpriteFrame">;

/** 本次赋图的规范资源地址；键只用于合并同节点请求，不缓存图片。 */
interface SpriteTarget {
    /** 与资源池一致的包、路径或UUID及类型身份。 */
    key: string;
    /** 加载时交给现有资源池的描述副本。 */
    descriptor: ResourceDescriptor<"SpriteFrame">;
}

/** 已显示图片的唯一赋图拥有者，等新图接替或明确清空后释放。 */
interface DisplayedSprite {
    /** 当前显示资源的规范身份。 */
    key: string;
    /** 保护当前SpriteFrame的资源作用域，不持有历史图片。 */
    scope: AssetScope;
    /** 已赋给Sprite的图片，用于同图复用和识别外部替换。 */
    frame: SpriteFrame;
    /** 当前显示仍属本轮业务的判断，同图重绑时更新。 */
    isCurrent: () => boolean;
}

/** 本次候选加载；对象身份隔离迟到结果，相同候选只保留一份请求。 */
interface SpriteRequest {
    /** 有序候选键，重复赋图时据此合并在途任务。 */
    signature: string;
    /** 本次候选共用的拥有者，成功后转交当前显示，否则释放。 */
    scope: AssetScope;
    /** 最新调用方的有效性判断，重复在途请求时替换旧闭包。 */
    isCurrent: () => boolean;
}

/** 单图片节点的赋图生命周期，不包含按资源地址索引的缓存。 */
interface SpriteBinding {
    /** 当前节点上的Sprite组件，组件被替换时清理旧拥有者。 */
    image: Sprite;
    /** 当前仍显示的资源，尚未由setSprite成功赋图时为null。 */
    displayed: DisplayedSprite | null;
    /** 当前在途候选，成功、失败、取消或清空后为null。 */
    pending: SpriteRequest | null;
}

export class ResManager {
    /** 按模块目录和原始文件名取得Bundle内图片路径，不查询名称清单。 */
    public static ui(module: string, name: string): string {
        return module + "/ui/" + name;
    }

    /** 品质0至6对应公共品质框；非法品质回退0，不维护逐项映射。 */
    public static qualityFrame(quality: number): string {
        const value = Number.isInteger(quality) && quality >= 0 && quality <= 6 ? quality : 0;
        return this.ui("common", "other_rare-" + value);
    }

    /** 每个图片节点当前显示及在途拥有者；弱引用不延长节点寿命，不保存历史图片。 */
    private static readonly bindings = new WeakMap<Node, SpriteBinding>();

    /** 统一入口无需创建实例。 */
    private constructor() {}

    /** 获取图片并由owner节点持有；共享缓存和在途请求，销毁后拒绝迟到结果。
     * 字符串为包名/包内不带/spriteFrame的路径；描述支持其他Bundle或UUID。
     * 本入口显式持有至owner销毁，独立于setSprite的单张显示生命周期；失败向调用方拒绝。
     */
    public static getSpriteFrame(owner: Node, source: SpriteSource): Promise<SpriteFrame> {
        return ResourceAssetsUtils.forNode(owner).load(
            typeof source === "string" ? ResourceAssetsUtils.sprite(source) : source,
        );
    }

    /** 显示单张图片或有序候选；同图与相同在途任务复用，旧图持有至新图真正接替。
     * null清空并释放赋图拥有者；失效/销毁不交付迟到结果，失败记录后继续回退。
     */
    public static setSprite(
        node: Node | null,
        source: SpriteSource | readonly SpriteSource[] | null,
        isCurrent: () => boolean = () => true,
    ): void {
        if (!node?.isValid) {
            if (node) {
                const binding = this.bindings.get(node);
                if (binding) {
                    this.clearBinding(binding);
                }
            }
            return;
        }
        const image = node.getComponent(Sprite);
        if (!image) {
            const binding = this.bindings.get(node);
            if (binding) {
                this.clearBinding(binding);
            }
            return;
        }
        const binding = this.bindingFor(node, image);
        const sources: readonly SpriteSource[] = source === null ? []
            : typeof source === "string" || !Array.isArray(source) ? [source as SpriteSource] : source;
        if (!sources.length) {
            this.clearBinding(binding);
            return;
        }
        if (!isCurrent()) {
            this.cancelPending(binding);
            this.releaseInvalidDisplay(binding);
            return;
        }
        const targets = sources.map(value => this.spriteTarget(value));
        const signature = JSON.stringify(targets.map(target => target.key));
        if (binding.pending?.signature === signature) {
            binding.pending.isCurrent = isCurrent;
            return;
        }
        this.cancelPending(binding);
        if (binding.displayed?.key === targets[0].key) {
            // Cell可能先清空旧图；相同资源仍由当前作用域持有，直接恢复以免等待Promise闪空。
            image.spriteFrame = binding.displayed.frame;
            binding.displayed.isCurrent = isCurrent;
            return;
        }
        const request: SpriteRequest = { signature, scope: createAssetScope(), isCurrent };
        binding.pending = request;
        void this.loadSprite(node, binding, request, targets);
    }

    /** 为节点登记一次销毁清理；同节点更换Sprite组件时不保留旧显示与在途拥有者。 */
    private static bindingFor(node: Node, image: Sprite): SpriteBinding {
        let binding = this.bindings.get(node);
        if (!binding) {
            binding = { image, displayed: null, pending: null };
            this.bindings.set(node, binding);
            node.once(Node.EventType.NODE_DESTROYED, () => {
                const current = this.bindings.get(node);
                if (current) {
                    this.clearBinding(current);
                }
                this.bindings.delete(node);
            });
        } else if (binding.image !== image) {
            this.clearBinding(binding);
            binding.image = image;
        }
        return binding;
    }

    /** 规范化单个候选；地址身份与资源池一致，不把UUID另算成相同路径的第二份资源。 */
    private static spriteTarget(source: SpriteSource): SpriteTarget {
        const descriptor = typeof source === "string" ? ResourceAssetsUtils.sprite(source) : { ...source };
        return {
            key: JSON.stringify([descriptor.bundle, descriptor.loadPath || descriptor.uuid, descriptor.type]),
            descriptor,
        };
    }

    /** 依次加载本轮候选；成功先交付新图再释放旧图，取消与失败始终撤回本轮作用域。 */
    private static async loadSprite(
        node: Node,
        binding: SpriteBinding,
        request: SpriteRequest,
        targets: readonly SpriteTarget[],
    ): Promise<void> {
        const current = () => node.isValid && binding.image.isValid && binding.pending === request && request.isCurrent();
        try {
            for (const target of targets) {
                if (!current()) {
                    return;
                }
                if (binding.displayed?.key === target.key) {
                    binding.image.spriteFrame = binding.displayed.frame;
                    binding.displayed.isCurrent = request.isCurrent;
                    return;
                }
                try {
                    const frame = await request.scope.load(target.descriptor);
                    if (!current()) {
                        return;
                    }
                    const previous = binding.displayed;
                    binding.image.spriteFrame = frame;
                    binding.displayed = { key: target.key, frame, scope: request.scope, isCurrent: request.isCurrent };
                    binding.pending = null;
                    previous?.scope.dispose();
                    return;
                } catch (error) {
                    if (!current()) {
                        return;
                    }
                    const descriptor = target.descriptor;
                    const path = descriptor.assetPath || descriptor.bundle + "/" + (descriptor.loadPath || descriptor.uuid);
                    GameLog.shared.warnOnce("FRAMEWORK", "ResManager", "IMAGE_LOAD_FAILED:" + target.key,
                        "图片加载失败：" + path + "；原因：" + String(error));
                }
            }
        } finally {
            if (binding.pending === request) {
                binding.pending = null;
                request.scope.dispose();
                this.releaseInvalidDisplay(binding);
            }
        }
    }

    /** 撤销旧在途候选；迟到Promise凭请求对象身份失效，不撤回仍显示的旧图。 */
    private static cancelPending(binding: SpriteBinding): void {
        const pending = binding.pending;
        binding.pending = null;
        pending?.scope.dispose();
    }

    /** 没有有效新请求时清理已失效的显示；仍有效的旧图在新图失败后继续受保护。 */
    private static releaseInvalidDisplay(binding: SpriteBinding): void {
        const displayed = binding.displayed;
        if (!displayed || binding.image.isValid && binding.image.spriteFrame === displayed.frame && displayed.isCurrent()) {
            return;
        }
        if (binding.image.isValid && binding.image.spriteFrame === displayed.frame) {
            binding.image.spriteFrame = null;
        }
        binding.displayed = null;
        displayed.scope.dispose();
    }

    /** 清空图片后撤回赋图拥有者；不影响getSpriteFrame显式取得的节点作用域。 */
    private static clearBinding(binding: SpriteBinding): void {
        this.cancelPending(binding);
        if (binding.image.isValid) {
            binding.image.spriteFrame = null;
        }
        const displayed = binding.displayed;
        binding.displayed = null;
        displayed?.scope.dispose();
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
        return Number.isSafeInteger(id) && id >= 1 ? "hero/ui/hero-icon_" + id : null;
    }

    /** 按战报冻结portraitIconId生成头像路径，不查询当前英雄外观。 */
    public static portrait(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 1 ? "hero/ui/hero-icon_" + id : null;
    }

    /** 按配置ID生成路径，不检查图片是否存在；非法ID返回null。 */
    public static head(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 0 ? "hero/ui/head-icon_" + id : null;
    }

    /** 按配置ID生成路径，不检查图片是否存在；非法ID返回null。 */
    public static skill(id: number): string | null {
        return Number.isSafeInteger(id) && id >= 1 ? "hero/ui/skill-icon_" + id : null;
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
        return id === 0 ? "bag/ui/backpack_border-default" : "icons/item/backpack_" + (1005000 + id);
    }
}
