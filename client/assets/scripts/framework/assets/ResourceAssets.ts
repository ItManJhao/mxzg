/** 类型化资源加载适配：描述与加载分开，缓存、去重和持有计数全部交给现有 ResourcePool。 */
import {
    Asset,
    Texture2D, TTFFont, TextAsset, ParticleAsset,
    assetManager,
    AudioClip,
    BitmapFont,
    EffectAsset,
    JsonAsset,
    Node,
    Prefab,
    resources,
    sp,
    SpriteAtlas,
    SpriteFrame
} from "cc";
import type {ResourceDescriptor, ResourceKind} from "./ResourceTypes";
import {ResourcePool} from "./ResourcePool";

export interface ResourceAssetMap {
    SpriteFrame: SpriteFrame;
    SpriteAtlas: SpriteAtlas;
    Prefab: Prefab;
    AudioClip: AudioClip;
    SkeletonData: sp.SkeletonData;
    JsonAsset: JsonAsset;
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

    /** 动态路径已由配置解析时使用，类型仍受约束；路径不含扩展名。 */
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
    BitmapFont,
    EffectAsset, Texture2D, TTFFont, TextAsset, ParticleAsset, Asset
};

/** 按引擎Bundle依赖元数据准备共享包；不另维护模块依赖清单。 */
async function readyBundle(name: string, ancestors: readonly string[] = []): Promise<typeof resources> {
    if (ancestors.includes(name)) {
        throw new Error("Bundle循环依赖：" + ancestors.concat(name).join(" → "));
    }
    const bundle = assetManager.getBundle(name) || await new Promise<typeof resources>((resolve, reject) => {
        assetManager.loadBundle(name, (error, value) => {
            if (error || !value) {
                reject(error || new Error("Bundle缺失：" + name));
            } else {
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
        const spec = JSON.parse(key) as { bundle: string; loadPath: string; type: keyof ResourceAssetMap; uuid?: string };
        const type = types[spec.type];
        if (!type) return Promise.reject(new Error("未知资源类型：" + spec.type));
        return new Promise((resolve, reject) => {
            // 普通目录发布帧及原生附件按UUID取，避免同名Spine数据/附件路径歧义。
            if (!spec.loadPath && spec.uuid) {
                assetManager.loadAny({ uuid: spec.uuid }, (error, asset) => {
                    if (error || !asset) reject(error || new Error("UUID资源缺失：" + spec.uuid));
                    // Creator可能只打印原生缺失而仍返回Asset；此时不能把空壳记为准备成功。
                    else if (spec.type === "Asset" && asset.nativeUrl && asset.nativeAsset == null) {
                        reject(new Error("原生资源内容缺失：" + spec.uuid));
                    }
                    else resolve(asset);
                });
                return;
            }
            const load = (bundle: typeof resources) => bundle.load(spec.loadPath, type as typeof Asset, (error, asset) => {
                if (error || !asset) reject(error || new Error("资源加载失败：" + spec.bundle + "/" + spec.loadPath));
                else resolve(asset);
            });
            if (spec.bundle === "resources") load(resources);
            else {
                void readyBundle(spec.bundle).then(load, reject);
            }
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

/** 创建拥有者作用域；关闭拒绝迟到结果并释放持有，可在同一作用域重试失败请求。 */
export function createAssetScope(): AssetScope {
    const scope = pool.createScope();
    return {
        load: <K extends ResourceKind>(descriptor: ResourceDescriptor<K>) => scope.load(JSON.stringify({
            bundle: descriptor.bundle,
            loadPath: descriptor.loadPath,
            type: descriptor.type,
            ...(!descriptor.loadPath ? { uuid: descriptor.uuid } : {})
        })) as Promise<ResourceAssetMap[K]>,
        loadPath: <K extends keyof ResourceAssetMap>(path: string, type: K) =>
            scope.load(JSON.stringify({bundle: "resources", loadPath: path, type})) as Promise<ResourceAssetMap[K]>,
        dispose: () => scope.dispose(),
    };
}

/** 节点拥有者索引使用弱引用；销毁时解除动态图片/序列帧引用。 */
const nodeScopes = new WeakMap<Node, AssetScope>();
/** 配置与主城底板的应用级作用域；与节点资源分开统计，应用结束后清理。 */
let residentScope: AssetScope | null = null;

/** 资源生命周期入口：动态旧路径统一转换描述，禁止业务直接调用引擎加载器。 */
export class ResourceAssetsUtils {
    /** 从明确的包名、路径和类型创建加载目标，不查询资源目录或维护存在性清单。
     * 图片路径不含spriteFrame后缀；特殊Bundle可显式提供相对assets的源路径。
     */
    public static describe<K extends ResourceKind>(
        bundle: string, path: string, type: K, assetPath = bundle + "/" + path,
    ): ResourceDescriptor<K> {
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

    /** 配置仓库与后台复用同一JSON请求；现有应用常驻作用域在退出时统一释放。 */
    public static async loadConfig(path: string): Promise<unknown> {
        if (!residentScope) {
            residentScope = createAssetScope();
        }
        const asset = await residentScope.loadPath(path, "JsonAsset");
        if (asset.json == null) {
            throw new Error("配置资源缺失：" + path);
        }
        return asset.json;
    }

    /** 返回唯一类型化池统计；不把资源数冒充纹理显存或JS堆大小。 */
    public static snapshot(): ReturnType<typeof pool.snapshot> {
        return pool.snapshot();
    }

    /** 将已有resources动态路径转为明确SpriteFrame描述，不猜测或替换资源名。 */
    public static sprite(path: string): ResourceDescriptor<"SpriteFrame"> {
        return {
            bundle: "resources", path, assetPath: "resources/" + path,
            loadPath: path + "/spriteFrame", type: "SpriteFrame", uuid: ""
        };
    }

    /** 取得节点拥有的作用域；节点销毁前资源始终有引用，销毁后迟到结果拒绝交付。 */
    public static forNode(node: Node): AssetScope {
        if (!node.isValid) throw new Error("资源拥有节点已销毁");
        let scope = nodeScopes.get(node);
        if (!scope) {
            scope = createAssetScope();
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
    public static loadForNode<K extends keyof ResourceAssetMap>(
        node: Node, path: string, type: K,
        done: (error: unknown, asset: ResourceAssetMap[K] | null) => void,
    ): void {
        if (!node.isValid) return;
        this.forNode(node).loadPath(path, type).then(
            asset => done(null, asset),
            error => done(error, null),
        );
    }

    /** 旧地图底板是显式应用缓存，不自动清理仍在显示的共享图片。 */
    public static loadResidentSprite(path: string): Promise<SpriteFrame> {
        if (!residentScope) residentScope = createAssetScope();
        return residentScope.load(this.sprite(path));
    }

    /** 必须先关闭页面并清空旧地图索引，再撤回应用级缓存持有。 */
    public static releaseResidents(): void {
        residentScope?.dispose();
        residentScope = null;
    }
}
