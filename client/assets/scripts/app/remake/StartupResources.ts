import { Asset, AudioClip, resources, sp, SpriteFrame } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";

/** Startup dependencies have readable IDs; feature catalogs will be added after auditing. */
export const STARTUP_RESOURCES = {
  loginCast: { path: "spine/jiemian", type: sp.SkeletonData },
  loadingBar: { path: "spine/jindutiao", type: sp.SkeletonData },
  loginBackdrop: { path: "ui/maps/map-bg-loading/spriteFrame", type: SpriteFrame },
  loginMusic: { path: "audio/bgm-logo", type: AudioClip },
};
export const STARTUP_RESOURCE_KEYS = Object.keys(STARTUP_RESOURCES) as Array<keyof typeof STARTUP_RESOURCES>;

const pool = new ResourcePool<Asset>({
  load: key => {
    const spec = STARTUP_RESOURCES[key as keyof typeof STARTUP_RESOURCES];
    if (!spec) return Promise.reject(new Error("未登记的启动资源：" + key));
    return new Promise((resolve, reject) => {
      resources.load(spec.path, spec.type as typeof Asset, (error, asset) => {
        if (error || !asset) reject(error || new Error("缺少资源：" + key));
        else resolve(asset);
      });
    });
  },
  retain: asset => { asset.addRef(); },
  // Legacy pages still load these shared assets without scopes. Drop our pin,
  // but preserve engine cache until their ownership is migrated and verified.
  release: asset => { asset.decRef(false); },
});
export const createStartupResourceScope = () => pool.createScope();
