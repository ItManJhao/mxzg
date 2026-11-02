/** 启动资源键对应生成目录描述；复用统一 ResourcePool 作用域，不拥有第二份资源缓存。 */
import { Asset } from "cc";
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { createAssetScope } from "../../framework/assets/ResourceAssets";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
export const STARTUP_RESOURCES = {
  loginCast: ResourceCatalog.spine.jiemian,
  loadingBar: ResourceCatalog.spine.jindutiao,
  loginBackdrop: ResourceCatalog.maps.map_bg_loading,
  loginMusic: ResourceCatalog.audio.bgm_logo,
};
export const STARTUP_RESOURCE_KEYS = Object.keys(STARTUP_RESOURCES) as Array<keyof typeof STARTUP_RESOURCES>;
/** 兼顾启动进度使用的语义键，将实际加载与释放交给共享资源作用域。 */
export function createStartupResourceScope(): ResourceScope<Asset> {
  const scope = createAssetScope();
  return {
    load: key => {
      const descriptor = STARTUP_RESOURCES[key as keyof typeof STARTUP_RESOURCES];
      return descriptor ? scope.load(descriptor) : Promise.reject(new Error("未登记的启动资源：" + key));
    },
    dispose: () => scope.dispose(),
  };
}
