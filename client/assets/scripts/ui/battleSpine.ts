/**
 * 战斗和加载层的动态 spine。
 * resources.load("spine/<stem>") + sp.Skeleton。加载或挂组件失败时回调，不抛到外面。
 * 英雄槽没有请求的动作时留在 stand / idle。套里没有 hit 就不播受击。不播 bisha。
 * effect 模式给 batch2 命名特效：按名字播，没有这个动作就跳过，不拆站场。
 * 这些套是 Spine 3.7.94。播之前在内存里收成 spine-3.8 能读的皮和曲线，不改磁盘上的 json。
 * Creator 3.8.8 仍可能加载失败，失败只回调，攻击照旧。不播 bisha。
 */
import { Node, resources, sp } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSpineClip } from "../net/protocol/wireBattle";
import { plantHangLocomotion, upgradeSpine37Json } from "./spineUpgrade";
import { place, uiNode } from "./UiKit";

export interface SpineActor {
  /** 骨架节点。挂机行军不挪父格，父格留在地砖槽上。 */
  readonly node: Node;
  /** resources/spine 下的套名。演武用它找技能帧。 */
  readonly stem: string;
  play(clip: WireSpineClip): void;
  /** 命名特效。找不到动作时不播，也不当成加载失败。 */
  burst(name: string): void;
  /**
   * 按动作名播，不落到别的剪辑。没有这个名字就打日志并返回 false。
   * 骨架还在加载时先记下，加载完再播。
   */
  gesture(name: string): boolean;
}

export interface SpineMountOptions {
  /** batch2 特效。不要求套里有 stand。 */
  effect?: boolean;
  /** 1 面向右（左场的敌方）。-1 面向左（右场的我方）。缺省面向右。 */
  face?: -1 | 1;
  /** 骨架已经挂上并且播了开场动作。加载失败不调用。 */
  onReady?: () => void;
  /** 相对父节点的竖直座位。缺省：特效和点缀在 0，英雄在地砖 -36。 */
  seatY?: number;
  /** 英雄缩放。缺省 0.58。挂机站场传 HANG_ACTOR_SCALE。特效不读这项。 */
  scale?: number;
}

/** 挂机站场骨架。比森林战斗的 0.58 小，对齐日服挂机小人。 */
export const HANG_ACTOR_SCALE = 0.36;

const OPENING: { [stem: string]: WireSpineClip } = {
  zhandoujijian: "idle",
};

/** 大图缩小，光柱这类小图放大。没写的用 0.4。 */
const VFX_SCALE: { [stem: string]: number } = {
  yanwu: 0.12,
  chaihong: 0.1,
  hytx: 0.18,
  zhihuanfazhen: 0.14,
  "Dragon-1": 0.3,
  "Dragon-2": 0.28,
  "Dragon-3": 0.26,
  "Dragon-4": 0.22,
  zadan: 0.48,
  zadan_tx: 0.55,
  heidong: 0.5,
  guangzhu: 1.4,
  act: 0.4,
};

export interface NamedSpinePlay {
  /** 缺省循环。收起这类动作传 false，播完走 onComplete。 */
  loop?: boolean;
  onFail?: () => void;
  onComplete?: () => void;
  /** 骨架已经挂上并开始播。加载失败不调用。 */
  onReady?: () => void;
}

/** 进度条、掉落堆这类单节点特效。失败只留空节点并回调，不抛。 */
export function mountNamedSpine(host: Node, stem: string, clip: string, play?: NamedSpinePlay): void {
  const loop = !play || play.loop !== false;
  const fail = (): void => {
    GameLog.shared.warn("BattleSpine", "named miss spine/" + stem + " clip=" + clip);
    if (play && play.onFail) play.onFail();
  };
  const arm = (view: sp.Skeleton): void => {
    view.setAnimation(0, clip, loop);
    if (loop || !play || !play.onComplete) return;
    const done = play.onComplete;
    const listen = view as sp.Skeleton & { setCompleteListener?: (cb: (() => void) | null) => void };
    if (typeof listen.setCompleteListener === "function") listen.setCompleteListener(() => done());
    else setTimeout(done, 2400);
  };
  try {
    resources.load("spine/" + stem, sp.SkeletonData, (err, asset) => {
      if (!host.isValid) return;
      if (err || !asset) {
        fail();
        return;
      }
      try {
        const view = host.getComponent(sp.Skeleton) || host.addComponent(sp.Skeleton);
        view.premultipliedAlpha = false;
        view.skeletonData = runtimeSpineData(stem, asset);
        const skinned = view as sp.Skeleton & { setSkin?: (name: string) => void };
        if (typeof skinned.setSkin === "function") {
          try {
            skinned.setSkin("default");
          } catch (_skinErr) {
            /* no default skin */
          }
        }
        arm(view);
        if (play && play.onReady) play.onReady();
      } catch (_err) {
        fail();
      }
    });
  } catch (_err) {
    fail();
  }
}

export function mountBattleSpine(parent: Node, stem: string, onFail: () => void, options?: SpineMountOptions): SpineActor {
  const effect = !!(options && options.effect);
  const node = uiNode("spine-" + stem);
  const accent = stem === "zhandoujijian" || stem === "battle-sword";
  const namedScale = VFX_SCALE[stem];
  const asked = options && typeof options.scale === "number" && options.scale > 0 ? options.scale : 0;
  const scale = effect ? (typeof namedScale === "number" ? namedScale : 0.4) : accent ? 0.16 : asked > 0 ? asked : 0.58;
  const face = options && options.face === -1 ? -1 : 1;
  node.setScale(scale * face, scale, 1);
  const seatY = options && typeof options.seatY === "number" ? options.seatY : effect || accent ? 0 : -36;
  place(node, parent, 0, seatY);
  let skel: sp.Skeleton | null = null;
  let dead = false;
  let pending: string | null = null;
  let pendingHero: WireSpineClip | null = null;
  let exact: string | null = null;
  const fail = (): void => {
    if (dead) return;
    dead = true;
    GameLog.shared.warn("BattleSpine", "hero/vfx miss spine/" + stem);
    onFail();
  };
  const playNamed = (name: string, hero: boolean): void => {
    if (!skel || !node.isValid) return;
    const chosen = hero ? pickClip(skel, name as WireSpineClip) : pickNamed(skel, name);
    if (!chosen) return;
    const loop = chosen === "stand" || chosen === "idle";
    try {
      skel.setAnimation(0, chosen, loop);
    } catch (err) {
      fail();
    }
  };
  const playExact = (name: string): boolean => {
    if (!skel || !node.isValid) return false;
    let found = false;
    try {
      found = !!skel.findAnimation(name);
    } catch (err) {
      return false;
    }
    if (!found) {
      GameLog.shared.warn("BattleSpine", "clip miss spine/" + stem + " " + name);
      return false;
    }
    const loop = name === "run" || name === "walk" || name === "stand" || name === "idle";
    try {
      skel.setAnimation(0, name, loop);
      return true;
    } catch (err) {
      fail();
      return false;
    }
  };
  const play = (clip: WireSpineClip): void => {
    exact = null;
    pendingHero = clip;
    playNamed(clip, true);
  };
  const burst = (name: string): void => {
    pending = name;
    playNamed(name, false);
  };
  const gesture = (name: string): boolean => {
    exact = name;
    pendingHero = null;
    if (!skel) return true;
    const played = playExact(name);
    if (!played) exact = null;
    return played;
  };
  try {
    resources.load("spine/" + stem, sp.SkeletonData, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        fail();
        return;
      }
      try {
        const view = node.addComponent(sp.Skeleton);
        view.premultipliedAlpha = false;
        view.skeletonData = runtimeSpineData(stem, asset);
        const skinned = view as sp.Skeleton & { setSkin?: (name: string) => void };
        if (typeof skinned.setSkin === "function") {
          try {
            skinned.setSkin("default");
          } catch (skinErr) {
            /* 缺省皮仍可播站场和攻击 */
          }
        }
        // 骨架挂上后再写朝向，避免缩放被组件清掉。
        node.setScale(scale * face, scale, 1);
        skel = view;
        if (effect) {
          if (pending) burst(pending);
          return;
        }
        const ready = options && options.onReady;
        if (exact) {
          if (playExact(exact)) {
            if (ready && !dead) ready();
            return;
          }
        }
        const opening = pendingHero || OPENING[stem] || "stand";
        if (!pickClip(view, opening)) fail();
        else {
          play(opening);
          if (ready && !dead) ready();
        }
      } catch (loadErr) {
        fail();
      }
    });
  } catch (err) {
    fail();
  }
  return { node, stem, play, burst, gesture };
}

const runtimePacks: { [stem: string]: sp.SkeletonData } = {};

/** 原资源的 wasm 缓存按 uuid 记住第一次解析。3.7 失败过的 uuid 不能复用，所以副本用 #38。 */
function runtimeSpineData(stem: string, asset: sp.SkeletonData): sp.SkeletonData {
  const cached = runtimePacks[stem];
  if (cached) return cached;
  try {
    const src = asset as sp.SkeletonData & {
      skeletonJson?: unknown;
      _skeletonJson?: unknown;
      atlasText?: string;
      textures?: unknown;
      textureNames?: unknown;
      scale?: number;
      _uuid?: string;
    };
    const raw = src.skeletonJson || src._skeletonJson;
    if (!raw || !src.atlasText) {
      if (raw) {
        try {
          (src as { skeletonJson?: unknown }).skeletonJson = upgradeSpine37Json(raw);
        } catch (assignErr) {
          /* 写不回去就仍用原套 */
        }
      }
      return asset;
    }
    const copy = new sp.SkeletonData();
    const dst = copy as sp.SkeletonData & {
      skeletonJson?: unknown;
      atlasText?: string;
      textures?: unknown;
      textureNames?: unknown;
      scale?: number;
      _uuid?: string;
    };
    const uuid = (src._uuid || stem) + "#38";
    dst._uuid = uuid;
    dst.atlasText = src.atlasText;
    dst.textures = src.textures;
    dst.textureNames = src.textureNames;
    if (typeof src.scale === "number") dst.scale = src.scale;
    dst._uuid = uuid;
    const upgraded = upgradeSpine37Json(raw);
    dst.skeletonJson = plantHangLocomotion(upgraded === raw ? JSON.parse(JSON.stringify(upgraded)) : upgraded) as typeof copy.skeletonJson;
    runtimePacks[stem] = copy;
    return copy;
  } catch (err) {
    return asset;
  }
}

function pickClip(skel: sp.Skeleton, clip: WireSpineClip): string | null {
  const order: WireSpineClip[] = [clip];
  if (clip === "hit") {
    order.push("stand");
    order.push("idle");
  } else if (clip === "attack" || clip === "die") {
    order.push("stand");
    order.push("idle");
  } else if (clip === "stand") order.push("idle");
  else order.push("stand");
  for (let i = 0; i < order.length; i++) {
    try {
      if (skel.findAnimation(order[i])) return order[i];
    } catch (err) {
      return null;
    }
  }
  return null;
}

function pickNamed(skel: sp.Skeleton, name: string): string | null {
  const order = [name, "stand", "idle", "act1", "act", "attack"];
  const seen: { [key: string]: boolean } = {};
  for (let i = 0; i < order.length; i++) {
    const clip = order[i];
    if (seen[clip]) continue;
    seen[clip] = true;
    try {
      if (skel.findAnimation(clip)) return clip;
    } catch (err) {
      return null;
    }
  }
  return null;
}
