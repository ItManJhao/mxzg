/** 类型化资源加载适配：描述与加载分开，缓存、去重和持有计数全部交给现有 ResourcePool。 */
import { Asset, BufferAsset, Texture2D, TTFFont, TextAsset, ParticleAsset, assetManager, AudioClip, BitmapFont, EffectAsset, JsonAsset, Node, Prefab, sp, SpriteAtlas, SpriteFrame } from "cc";
import type { AssetManager } from "cc";
import type { ResourceDescriptor, ResourceKind } from "./ResourceTypes";
import { ResourcePool } from "./ResourcePool";
export interface ResourceAssetMap {
    SpriteFrame: SpriteFrame;
    SpriteAtlas: SpriteAtlas;
    Prefab: Prefab;
    AudioClip: AudioClip;
    SkeletonData: sp.SkeletonData;
    JsonAsset: JsonAsset;
    /** 压缩配置等二进制源，调用方处理后撤回临时持有。 */
    BufferAsset: BufferAsset;
    BitmapFont: BitmapFont;
    EffectAsset: EffectAsset;
    Texture2D: Texture2D;
    TTFFont: TTFFont;
    TextAsset: TextAsset;
    ParticleAsset: ParticleAsset;
    Asset: Asset;
}
export interface AssetScope {
    load<K extends ResourceKind>(descriptor: ResourceDescriptor<K>): Promise<ResourceAssetMap[K]>;
    /** 按包名/包内路径加载，类型仍受约束；路径不含扩展名，不访问内置resources。 */
    loadPath<K extends keyof ResourceAssetMap>(path: string, type: K): Promise<ResourceAssetMap[K]>;
    dispose(): void;
}
const types = {
    SpriteFrame,
    SpriteAtlas,
    Prefab,
    AudioClip,
    SkeletonData: sp.SkeletonData,
    JsonAsset,
    BufferAsset,
    BitmapFont,
    EffectAsset, Texture2D, TTFFont, TextAsset, ParticleAsset, Asset
};
/** 按引擎Bundle依赖元数据准备共享包；不另维护模块依赖清单。 */
async function readyBundle(name: string, ancestors: readonly string[] = []): Promise<AssetManager.Bundle> {
    if (ancestors.includes(name)) {
        throw new Error("Bundle循环依赖：" + ancestors.concat(name).join(" → "));
    }
    const bundle = assetManager.getBundle(name) || await new Promise<AssetManager.Bundle>((resolve, reject) => {
        assetManager.loadBundle(name, (error, value) => {
            if (error || !value) {
                reject(error || new Error("Bundle缺失：" + name));
            }
            else {
                resolve(value);
            }
        });
    });
    for (const dependency of bundle.deps || []) {
        await readyBundle(dependency, ancestors.concat(name));
    }
    return bundle;
}
const pool = new ResourcePool<Asset>({
    load: key => {
        const spec = JSON.parse(key) as {
            bundle: string;
            loadPath: string;
            type: keyof ResourceAssetMap;
            uuid?: string;
        };
        const type = types[spec.type];
        if (!type) {
            return Promise.reject(new Error("未知资源类型：" + spec.type));
        }
        return new Promise((resolve, reject) => {
            // 普通目录发布帧及原生附件按UUID取，避免同名Spine数据/附件路径歧义。
            if (!spec.loadPath && spec.uuid) {
                assetManager.loadAny({ uuid: spec.uuid }, (error, asset) => {
                    if (error || !asset) {
                        reject(error || new Error("UUID资源缺失：" + spec.uuid));
                    }
                    else if (spec.type === "Asset" && asset.nativeUrl && asset.nativeAsset == null) {
                        reject(new Error("原生资源内容缺失：" + spec.uuid));
                    }
                    else {
                        resolve(asset);
                    }
                });
                return;
            }
            const load = (bundle: AssetManager.Bundle) => bundle.load(spec.loadPath, type as typeof Asset, (error, asset) => {
                if (error || !asset) {
                    reject(error || new Error("资源加载失败：" + spec.bundle + "/" + spec.loadPath));
                }
                else {
                    resolve(asset);
                }
            });
            void readyBundle(spec.bundle).then(load, reject);
        });
    },
    retain: asset => {
        asset.addRef();
    },
    // 所有动态显示须持有自己的作用域；只撤回自己的引用，由引擎检查依赖，不强制releaseAsset。
    release: asset => {
        asset.decRef();
    },
    discard: asset => {
        asset.addRef();
        asset.decRef();
    },
});
/** 节点拥有者索引使用弱引用；销毁时解除动态图片/序列帧引用。 */
const nodeScopes = new WeakMap<Node, AssetScope>();
/** 主城底板的应用级作用域；配置源使用短期作用域，避免重复持有整份JSON或压缩字节。 */
let residentScope: AssetScope | null = null;
/** 资源生命周期入口：动态旧路径统一转换描述，禁止业务直接调用引擎加载器。 */
export class ResourceAssetsUtils {
    /** 创建拥有者作用域；关闭拒绝迟到结果并释放持有，可在同一作用域重试失败请求。 */
    public static createAssetScope(): AssetScope {
        const scope = pool.createScope();
        return {
            load: <K extends ResourceKind>(descriptor: ResourceDescriptor<K>) => scope.load(JSON.stringify({
                bundle: descriptor.bundle,
                loadPath: descriptor.loadPath,
                type: descriptor.type,
                ...(!descriptor.loadPath ? { uuid: descriptor.uuid } : {})
            })) as Promise<ResourceAssetMap[K]>,
            loadPath: <K extends keyof ResourceAssetMap>(path: string, type: K) => scope.load(JSON.stringify(ResourceAssetsUtils.address(path, type))) as Promise<ResourceAssetMap[K]>,
            dispose: () => scope.dispose(),
        };
    }

    /** 从包名、包内路径和类型创建加载目标，不推测包的物理分组或维护资源清单。
     * 图片路径不含spriteFrame后缀；未提供源路径时保留逻辑地址，页面可传相对assets的真实路径。
     */
    public static describe<K extends ResourceKind>(bundle: string, path: string, type: K, assetPath = bundle + "/" + path): ResourceDescriptor<K> {
        return {
            bundle,
            path,
            assetPath,
            loadPath: type === "SpriteFrame" ? path + "/spriteFrame" : path,
            type,
            uuid: "",
        };
    }

    private constructor() {
    }

    /** 启动表经共享池读取，返回数据后撤回JsonAsset持有；GameConfig拥有校验后的只读内容。 */
    public static async loadConfig(path: string): Promise<unknown> {
        const scope = ResourceAssetsUtils.createAssetScope();
        try {
            const asset = await scope.loadPath(path, "JsonAsset");
            if (asset.json == null) {
                throw new Error("配置资源缺失：" + path);
            }
            return asset.json;
        } finally {
            scope.dispose();
        }
    }

    /** 返回唯一类型化池统计；不把资源数冒充纹理显存或JS堆大小。 */
    public static snapshot(): ReturnType<typeof pool.snapshot> {
        return pool.snapshot();
    }

    /**
     * 将逻辑地址或bundles/module、bundles/resources下的源路径统一解析为原Bundle加载键。
     * 两个父分组不参与包名、远程地址或缓存身份；拒绝空段、目录穿越及未迁移的旧物理路径。
     */
    public static address<K extends ResourceKind>(path: string, type: K): {
        bundle: string;
        loadPath: string;
        type: K;
    } {
        const parts = path.split("/");
        if (path.includes("\\") || parts.some(part => !part || part === "." || part === "..")) {
            throw new Error("资源地址须使用正斜线，且不能含空段或目录穿越：" + path);
        }
        if (parts[0] === "bundles") {
            if (parts[1] !== "module" && parts[1] !== "resources") {
                throw new Error("资源源路径须使用bundles/module或bundles/resources：" + path);
            }
            parts.splice(0, 2);
        }
        if (parts.length < 2) {
            throw new Error("资源地址必须包含包名和包内路径：" + path);
        }
        return { bundle: parts[0], loadPath: parts.slice(1).join("/"), type };
    }

    /** 图片地址统一为“包名/包内路径”；补齐SpriteFrame后缀，共享现有资源池。 */
    public static sprite(path: string): ResourceDescriptor<"SpriteFrame"> {
        const address = ResourceAssetsUtils.address(path, "SpriteFrame");
        return ResourceAssetsUtils.describe(address.bundle, address.loadPath, "SpriteFrame", path);
    }

    /** 取得节点拥有的作用域；节点销毁前资源始终有引用，销毁后迟到结果拒绝交付。 */
    public static forNode(node: Node): AssetScope {
        if (!node.isValid) {
            throw new Error("资源拥有节点已销毁");
        }
        let scope = nodeScopes.get(node);
        if (!scope) {
            scope = ResourceAssetsUtils.createAssetScope();
            const owned = scope;
            nodeScopes.set(node, owned);
            node.once(Node.EventType.NODE_DESTROYED, () => {
                owned.dispose();
                nodeScopes.delete(node);
            });
        }
        return scope;
    }

    /** 兼容旧回调式挂载，节点持有资源；失败仍回调，不吞掉必要的完成通知。 */
    public static loadForNode<K extends keyof ResourceAssetMap>(node: Node, path: string, type: K, done: (error: unknown, asset: ResourceAssetMap[K] | null) => void): void {
        if (!node.isValid) {
            return;
        }
        ResourceAssetsUtils.forNode(node).loadPath(path, type).then(asset => done(null, asset), error => done(error, null));
    }

    /** 旧地图底板是显式应用缓存，不自动清理仍在显示的共享图片。 */
    public static loadResidentSprite(path: string): Promise<SpriteFrame> {
        if (!residentScope) {
            residentScope = ResourceAssetsUtils.createAssetScope();
        }
        return residentScope.load(ResourceAssetsUtils.sprite(path));
    }

    /** 必须先关闭页面并清空旧地图索引，再撤回应用级缓存持有。 */
    public static releaseResidents(): void {
        residentScope?.dispose();
        residentScope = null;
    }
}
