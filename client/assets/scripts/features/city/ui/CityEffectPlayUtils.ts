/**
 * 主城地图特效：序列帧轮播 + spine（dx / chuanghu）。
 * 序列挂到中景的父节点上、画在近景板之后，避免被建筑图标和近景盖成静帧。
 * 帧按序号往下要，缺一张就停，不再一次等 64 张不存在的帧。
 * dx 播不出来时改播 portrait 光球序列。失败打 GameLog。
 */
import { TrackedTimers } from "../../../framework/TrackedTimers";
import { ResourceAssetsUtils, AssetScope } from "../../../framework/assets/ResourceAssetsUtils";
import { Node, Sprite, SpriteFrame, UITransform, Vec3 } from "cc";
import { GameLog } from "../../../core/GameLog";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { CITY_SPINE_FRAME_FALLBACK, CityEffectSpot, CityMapLayoutUtils } from "./CityMapLayoutUtils";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
const FRAME_MS = 80;
const FOLLOW_MS = 32;
const FRAME_WAIT_MS = 1200;
const FRAME_CAP = 32;
export interface CityEffectHandle {
    stop(): void;
}
type PlaceFn = (node: Node, parent: Node, x: number, y: number) => void;
/** 主城动态特效工具：按布局描述挂载帧动画与骨骼，资源和计时器由返回的停止函数随页面释放。 */
export class CityEffectPlayUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 在已有 views（按节点名索引）上启动 layout.effects。 */
    public static startCityEffects(views: Map<string, Node>, effects: CityEffectSpot[], placeBottomLeft: PlaceFn): CityEffectHandle {
        const stops: Array<() => void> = [];
        for (let i = 0; i < effects.length; i++) {
            const spot = effects[i];
            const parent = views.get(spot.parent);
            if (!parent) {
                GameLog.shared.classified("MODULE", "warn", "CityFx", "missing parent " + spot.parent + " for " + spot.name);
                continue;
            }
            if (spot.kind === "spine" && spot.spine) {
                const stop = CityEffectPlayUtils.mountSpineEffect(views, parent, spot, placeBottomLeft);
                if (stop) {
                    stops.push(stop);
                }
                continue;
            }
            const stop = CityEffectPlayUtils.mountAnimEffect(views, parent, spot, placeBottomLeft);
            if (stop) {
                stops.push(stop);
            }
        }
        GameLog.shared.classified("MODULE", "info", "CityFx", "started effects=" + effects.length + " runners=" + stops.length);
        return {
            stop() {
                for (let i = 0; i < stops.length; i++) {
                    stops[i]();
                }
                stops.length = 0;
            },
        };
    }

    /** 按配置挂载主城帧动画，返回停止函数，缺少资源参数时返回null。 */
    private static mountAnimEffect(views: Map<string, Node>, parent: Node, spot: CityEffectSpot, placeBottomLeft: PlaceFn): (() => void) | null {
        let stem = CityMapLayoutUtils.effectFrameStem(spot.name);
        if (!stem && spot.frame) {
            stem = spot.frame.replace(/-\d+$/, "");
        }
        if (!stem) {
            GameLog.shared.classified("MODULE", "warn", "CityFx", "no frame stem for " + spot.name);
            return null;
        }
        const node = CityEffectPlayUtils.ensureFxNode(views, parent, spot.name);
        const stopFollow = CityEffectPlayUtils.followLayer(node, parent, spot.x, spot.y, placeBottomLeft);
        const stopFrames = CityEffectPlayUtils.playFrameStem(node, stem);
        return () => {
            stopFollow();
            stopFrames();
        };
    }

    /** 按配置挂载主城骨骼特效，返回随页面关闭释放资源的停止函数。 */
    private static mountSpineEffect(views: Map<string, Node>, parent: Node, spot: CityEffectSpot, placeBottomLeft: PlaceFn): (() => void) | null {
        const stem = spot.spine as string;
        const node = CityEffectPlayUtils.ensureFxNode(views, parent, spot.name);
        const stopFollow = CityEffectPlayUtils.followLayer(node, parent, spot.x, spot.y, placeBottomLeft);
        let stopFrames: (() => void) | null = null;
        BattleSpineService.instance.mountNamedSpine(node, stem, "stand", {
            onFail: () => {
                const fallback = CITY_SPINE_FRAME_FALLBACK[stem];
                if (!fallback) {
                    return;
                }
                GameLog.shared.classified("MODULE", "warn", "CityFx", "spine miss " + stem + " → " + fallback);
                stopFrames = CityEffectPlayUtils.playFrameStem(node, fallback);
            },
        });
        return () => {
            stopFollow();
            if (stopFrames) {
                stopFrames();
            }
            if (node.isValid) {
                node.destroy();
            }
        };
    }

    /** 复用现有特效节点，缺少时创建对应动态挂点并登记到页面索引。 */
    private static ensureFxNode(views: Map<string, Node>, parent: Node, name: string): Node {
        let node = views.get("fx-" + name) || parent.getChildByName("fx-" + name);
        if (!node) {
            node = UiKitUtils.uiNode("fx-" + name);
            const ui = node.addComponent(UITransform);
            ui.setContentSize(64, 64);
            ui.setAnchorPoint(0.5, 0.5);
            node.parent = parent;
            views.set("fx-" + name, node);
        }
        return node;
    }

    /**
     * 近景板是中景的后绘制兄弟，中景里的特效会被它和后挂的建筑图标挡住。
     * 把特效挂到同一视差父节点的最后，每拍用中景的本地坐标换算世界坐标，滚动仍跟着中景。
     */
    private static followLayer(node: Node, layer: Node, x: number, y: number, placeBottomLeft: PlaceFn): () => void {
        const host = layer.parent;
        const ui = layer.getComponent(UITransform) as (UITransform & {
            convertToWorldSpaceAR?: (point: Vec3) => Vec3;
        }) | null;
        if (!host || !ui || typeof ui.convertToWorldSpaceAR !== "function") {
            placeBottomLeft(node, layer, x, y);
            if (node.parent) {
                node.setSiblingIndex(Math.max(0, node.parent.children.length - 1));
            }
            return () => undefined;
        }
        const convert = ui.convertToWorldSpaceAR.bind(ui);
        node.parent = host;
        node.setSiblingIndex(Math.max(0, host.children.length - 1));
        let alive = true;
        const sync = () => {
            if (!alive || !node.isValid || !layer.isValid) {
                return;
            }
            const size = ViewportLayoutUtils.uiSize(ui) || { width: 0, height: 0 };
            const ax = typeof ui.anchorX === "number" ? ui.anchorX : 0.5;
            const ay = typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
            const world = convert(new Vec3(x - size.width * ax, y - size.height * ay, 0));
            const setter = node as Node & {
                setWorldPosition?: (pos: Vec3) => void;
            };
            if (world && typeof setter.setWorldPosition === "function") {
                setter.setWorldPosition(world);
            }
            const scale = layer.scale;
            if (scale) {
                node.setScale(scale.x, scale.y, 1);
            }
        };
        sync();
        const timer = TrackedTimers.interval(sync, FOLLOW_MS);
        return () => {
            alive = false;
            TrackedTimers.clear(timer);
        };
    }

    /** 按帧组路径开始循环播放，返回解除计时器和资源作用域的函数。 */
    private static playFrameStem(node: Node, stem: string): () => void {
        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const trimable = sprite as Sprite & {
            trim?: boolean;
        };
        if (typeof trimable.trim === "boolean") {
            trimable.trim = false;
        }
        let timer: ReturnType<typeof setInterval> | null = null;
        let alive = true;
        const stop = () => {
            alive = false;
            if (timer) {
                TrackedTimers.clear(timer);
                timer = null;
            }
        };
        void CityEffectPlayUtils.loadFrameSequence(stem, ResourceAssetsUtils.forNode(node)).then((frames) => {
            if (!alive || !node.isValid) {
                return;
            }
            if (frames.length === 0) {
                GameLog.shared.classified("MODULE", "warn", "CityFx", "anim frames empty " + stem);
                return;
            }
            CityEffectPlayUtils.applyFrame(node, sprite, frames[0]);
            if (frames.length === 1) {
                GameLog.shared.classified("MODULE", "info", "CityFx", "anim static " + stem);
                return;
            }
            let index = 0;
            timer = TrackedTimers.interval(() => {
                if (!alive || !node.isValid) {
                    stop();
                    return;
                }
                index = (index + 1) % frames.length;
                CityEffectPlayUtils.applyFrame(node, sprite, frames[index]);
            }, FRAME_MS);
            GameLog.shared.classified("MODULE", "info", "CityFx", "anim loop " + stem + " frames=" + frames.length);
        });
        return stop;
    }

    /** 将特效帧写到有效节点并同步绘制尺寸，不改变父级布局。 */
    private static applyFrame(node: Node, sprite: Sprite, frame: SpriteFrame): void {
        sprite.spriteFrame = frame;
        let w = 0;
        let h = 0;
        try {
            const size = frame.originalSize;
            if (size && typeof size.width === "number") {
                w = size.width;
            }
            if (size && typeof size.height === "number") {
                h = size.height;
            }
        }
        catch (_err) {
            w = 0;
            h = 0;
        }
        const ui = node.getComponent(UITransform);
        if (w > 0 && h > 0) {
            ViewportLayoutUtils.assignContentSize(ui, w, h);
        }
        const dirty = sprite as Sprite & {
            markForUpdateRenderData?: (force?: boolean) => void;
        };
        if (typeof dirty.markForUpdateRenderData === "function") {
            dirty.markForUpdateRenderData(true);
        }
    }

    /** 在给定资源作用域顺序探测帧组，遇到缺帧结束，保留有界等待。 */
    private static loadFrameSequence(stem: string, scope: AssetScope): Promise<SpriteFrame[]> {
        const probed: (SpriteFrame | null)[] = [];
        const step = (index: number): Promise<SpriteFrame[]> => {
            if (index >= FRAME_CAP) {
                return Promise.resolve(CityMapLayoutUtils.takeFrameRun(probed));
            }
            return CityEffectPlayUtils.loadOne(stem + "-" + String(index), scope).then((frame) => {
                probed.push(frame);
                if (!frame && index > 0) {
                    return CityMapLayoutUtils.takeFrameRun(probed);
                }
                if (!frame && index === 0) {
                    return step(1);
                }
                return step(index + 1);
            });
        };
        return step(0);
    }

    /** 在给定资源作用域加载一帧，超时或缺失返回null，不取消其它资源。 */
    private static loadOne(path: string, scope: AssetScope): Promise<SpriteFrame | null> {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (frame: SpriteFrame | null) => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(frame);
            };
            const timer = TrackedTimers.timeout(() => finish(null), FRAME_WAIT_MS);
            try {
                scope.load(ResourceAssetsUtils.sprite(path)).then(asset => {
                    TrackedTimers.clear(timer);
                    finish(asset);
                }, () => {
                    TrackedTimers.clear(timer);
                    finish(null);
                });
            }
            catch (_e) {
                TrackedTimers.clear(timer);
                finish(null);
            }
        });
    }
}
