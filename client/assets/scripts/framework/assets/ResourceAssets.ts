/** 类型化资源加载适配：描述与加载分开，缓存、去重和持有计数全部交给现有 ResourcePool。 */
import { Asset, assetManager, AudioClip, JsonAsset, Prefab, resources, sp, SpriteAtlas, SpriteFrame } from "cc";
import { ResourcePool } from "./ResourcePool";
import type { ResourceDescriptor, ResourceKind } from "./ResourceCatalog";

export interface ResourceAssetMap { SpriteFrame: SpriteFrame; SpriteAtlas: SpriteAtlas; Prefab: Prefab; AudioClip: AudioClip; SkeletonData: sp.SkeletonData; JsonAsset: JsonAsset; }
export interface AssetScope {
    load<K extends ResourceKind>(descriptor: ResourceDescriptor<K>): Promise<ResourceAssetMap[K]>;
    dispose(): void;
}
const types = { SpriteFrame, SpriteAtlas, Prefab, AudioClip, SkeletonData: sp.SkeletonData, JsonAsset };
const pool = new ResourcePool<Asset>({
    load: key => {
        const spec = JSON.parse(key) as ResourceDescriptor;
        const type = types[spec.type];
        if (!type) return Promise.reject(new Error("未知资源类型：" + spec.type));
        return new Promise((resolve, reject) => {
            const load = (bundle: typeof resources) => bundle.load(spec.loadPath, type as typeof Asset, (error, asset) => {
                if (error || !asset) reject(error || new Error("资源加载失败：" + spec.bundle + "/" + spec.loadPath));
                else resolve(asset);
            });
            if (spec.bundle === "resources") load(resources);
            else {
                const ready = assetManager.getBundle(spec.bundle);
                if (ready) load(ready);
                else assetManager.loadBundle(spec.bundle, (error, bundle) => {
                    if (error || !bundle) reject(error || new Error("Bundle 缺失：" + spec.bundle));
                    else load(bundle);
                });
            }
        });
    },
    retain: asset => { asset.addRef(); },
    // 尚有序列化引用与旧显示加载器共享纹理，只释放作用域持有，不强制清理引擎缓存。
    release: asset => { asset.decRef(false); },
});

/** 创建拥有者作用域；关闭拒绝迟到结果并释放持有，可在同一作用域重试失败请求。 */
export function createAssetScope(): AssetScope {
    const scope = pool.createScope();
    return {
        load: <K extends ResourceKind>(descriptor: ResourceDescriptor<K>) => scope.load(JSON.stringify(descriptor)) as Promise<ResourceAssetMap[K]>,
        dispose: () => scope.dispose(),
    };
}
