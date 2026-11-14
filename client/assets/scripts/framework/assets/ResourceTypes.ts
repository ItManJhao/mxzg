/** 资源加载契约：只声明类型和加载地址，由资源池与加载计划共用；不登记资源清单。 */
export type ResourceKind = "SpriteFrame" | "SpriteAtlas" | "Prefab" | "AudioClip" | "SkeletonData" | "JsonAsset" | "BufferAsset" | "Texture2D" | "BitmapFont" | "TTFFont" | "TextAsset" | "EffectAsset" | "ParticleAsset" | "Asset";
export interface ResourceDescriptor<K extends ResourceKind = ResourceKind> {
    /** Creator资源包名称，不等同于业务模块名。 */
    readonly bundle: string;
    /** 包内资源路径，不包含图片的spriteFrame子资源后缀。 */
    readonly path: string;
    /** 页面可提供相对assets的真实源路径；未指定来源时为包名/包内逻辑地址，仅供登记与诊断。 */
    readonly assetPath: string;
    /** 传给引擎的实际加载路径；空字符串表示按UUID加载。 */
    readonly loadPath: string;
    /** 决定引擎加载类型及返回值类型。 */
    readonly type: K;
    /** 按UUID加载时使用；普通路径加载为空字符串。 */
    readonly uuid: string;
}
