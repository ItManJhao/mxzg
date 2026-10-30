import { _decorator, Component, sp } from "cc";
import { upgradeSpine37Json } from "./SpineJson";

const { ccclass, property } = _decorator;
let nextRuntimeId = 0;

/** Prefab supplies the asset and placement. Convert a private copy, never the source. */
@ccclass("CompatibleSpine")
export class CompatibleSpine extends Component {
  @property(sp.SkeletonData) source: sp.SkeletonData | null = null;
  @property clip = "stand";
  private runtime: sp.SkeletonData | null = null;
  private player: sp.Skeleton | null = null;

  onLoad(): void {
    if (!this.source) return;
    try {
      const source = this.source;
      const runtime = new sp.SkeletonData();
      this.runtime = runtime;
      // Runtime caches are keyed by UUID. Do not reuse a previously parsed 3.7 asset.
      (runtime as sp.SkeletonData & { _uuid: string })._uuid = source.uuid + "#compatible38-" + (++nextRuntimeId);
      runtime.atlasText = source.atlasText;
      runtime.textures = source.textures;
      runtime.textureNames = source.textureNames;
      runtime.scale = source.scale;
      runtime.skeletonJson = upgradeSpine37Json(source.skeletonJson) as typeof source.skeletonJson;
      this.player = this.node.getComponent(sp.Skeleton) || this.node.addComponent(sp.Skeleton);
      this.player.premultipliedAlpha = false;
      this.player.skeletonData = runtime;
      this.player.setSkin("default");
      this.player.setAnimation(0, this.clip, true);
    } catch (error) {
      console.error("[CompatibleSpine] " + this.clip, error);
    }
  }

  onDestroy(): void {
    // Node teardown may already have destroyed UITransform. The skeletonData setter
    // updates that transform, so do not call it here (isValid is not a teardown guard).
    // Skeleton owns its renderer teardown. Release our data after all components finish.
    const runtime = this.runtime;
    this.runtime = null;
    this.player = null;
    if (runtime) setTimeout(() => { if (runtime.isValid) runtime.destroy(); }, 0);
  }
}
