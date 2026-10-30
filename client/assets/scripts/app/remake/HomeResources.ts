import { assetManager, AssetManager, Prefab } from "cc";
import { ResourcePool } from "../../framework/assets/ResourcePool";
import { prepareCityConfig } from "../../config/RemakeConfig";

export const HOME_BUNDLE = "remake-home";
export const HOME_PREFAB = "RemakeHome";

function bundle(name: string): Promise<AssetManager.Bundle> {
  const ready = assetManager.getBundle(name);
  if (ready) return Promise.resolve(ready);
  return new Promise((resolve, reject) => {
    assetManager.loadBundle(name, (error, value) => {
      if (error || !value) reject(error || new Error("无法加载资源包：" + name));
      else resolve(value);
    });
  });
}

const pool = new ResourcePool<Prefab>({
  load: async key => {
    if (key !== "home") throw new Error("未登记的主城资源：" + key);
    // Required config failures propagate to the app's visible loading/retry layer.
    await prepareCityConfig();
    // Shared bundles have higher priority; load dependency metadata first.
    await bundle("resources");
    await bundle("prefabs");
    const home = await bundle(HOME_BUNDLE);
    return new Promise((resolve, reject) => {
      home.load(HOME_PREFAB, Prefab, (error, asset) => {
        if (error || !asset) reject(error || new Error("主城入口资源缺失"));
        else resolve(asset);
      });
    });
  },
  retain: asset => { asset.addRef(); },
  release: asset => { asset.decRef(false); },
});

/** First lazy feature bundle; kept by the app until page ownership migration is complete. */
export const createHomeResourceScope = () => pool.createScope();
