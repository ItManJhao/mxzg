/**
 * 开机 logo。旧 lua 不在仓库里，淡入淡出按这套资源常用的三段：
 * 淡入 1 秒、停留 1 秒、淡出 0.5 秒。点一下跳过停留和淡出。
 * bgm-logo 从淡入开始循环，进主城再停。
 * logo-scene_spr-logo.png 仍是 3×3 的失败抽出。比 LOGO_SPECK_MAX 还小就不显示。
 * 不再把左右饰纹拼成焰环，也不铺黑底。画面用 LoadingLayer 同一张 bg-loading，
 * cover 和加载层一致。淡出时加载层已经在下面，不会收回成黑屏。
 */
import { AudioSource,BlockInputEvents,Node,Sprite,SpriteFrame,UIOpacity,UITransform } from "cc";
import { GameLog } from "../../core/GameLog";
import { createAssetScope,ResourceAssetsUtils } from "../../framework/assets/ResourceAssets";
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { TrackedTimers } from "../../framework/TrackedTimers";
import { place,uiNode } from "../../framework/ui/UiKit";
import { bindVisibleRefresh } from "../../framework/ui/visibleFit";
import { fitLoadingBackdrop,LOADING_BG_DRAW_H,LOADING_BG_DRAW_W,LOADING_BG_FRAME } from "./bootChrome";

export const LOGO_FADE_IN_SEC = 1;
export const LOGO_HOLD_SEC = 1;
export const LOGO_FADE_OUT_SEC = 0.5;
export const LOGO_SPRITE = ResourceCatalog.login.logo_scene_spr_logo.path;
export const LOGO_BGM = ResourceCatalog.audio.bgm_logo.loadPath;
/** 宽或高不超过这个数，当成失败抽出，不拿来当开机图。 */
export const LOGO_SPECK_MAX = 8;
const SKIP_FADE_SEC = 0.15;

export interface LogoSplashHandle {
  readonly node: Node;
  /** 底图已经淡入。这时再挂 LoadingLayer，避免半透明时透出加载层。 */
  fadedIn: Promise<void>;
  /** 停留结束，或点一下跳过。淡出要等加载层铺好再开始。 */
  held: Promise<void>;
  done: Promise<void>;
  skip(): void;
  stayOnTop(): void;
  /** 淡出并拆掉。LoadingLayer 要已经在这层下面。 */
  dismiss(): void;
  stop(): void;
  /** 进主城时停掉。启动失败时也停。 */
  stopMusic(): void;
}

export function logoFrameIsSpeck(frame: SpriteFrame | null | undefined): boolean {
  if (!frame || !frame.originalSize) return true;
  const width = frame.originalSize.width;
  const height = frame.originalSize.height;
  if (!(width > LOGO_SPECK_MAX) || !(height > LOGO_SPECK_MAX)) return true;
  return false;
}

/** 启动图片归logo节点，音乐由独立句柄持有，停止后拒绝迟到音频。 */
export function playLogoSplash(parent: Node, audioHost: Node): LogoSplashHandle {
  const root = uiNode("LogoSplash");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  root.addComponent(BlockInputEvents);
  const opacity = root.addComponent(UIOpacity);
  opacity.opacity = 0;
  root.parent = parent;

  const bg = uiNode("Bg");
  const bgUi = bg.addComponent(UITransform);
  bgUi.setContentSize(LOADING_BG_DRAW_W, LOADING_BG_DRAW_H);
  const bgSprite = bg.addComponent(Sprite);
  bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  bg.addComponent(UIOpacity);
  place(bg, root, 0, 0);

  const logo = uiNode("logo-scene_spr-logo");
  const logoUi = logo.addComponent(UITransform);
  const sprite = logo.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.RAW;
  sprite.enabled = false;
  logo.addComponent(UIOpacity);
  place(logo, root, 0, 0);
  bindVisibleRefresh(root, () => {
    if (root.isValid) fitLoadingBackdrop(root);
  });

  let skipped = false;
  let stopped = false;
  let dismissStarted = false;
  let audio: AudioSource | null = null;
  const musicScope = createAssetScope();
  let musicStopped = false;
  /** 音乐寿命长于logo节点；进入主城或宿主销毁时单独停止并释放。 */
  const stopMusic = () => {
    if (musicStopped) return;
    musicStopped = true;
    if (audio?.isValid) { audio.stop(); audio.clip = null; }
    audio = null;
    musicScope.dispose();
  };
  audioHost.once(Node.EventType.NODE_DESTROYED, stopMusic);
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  let fadeTimer: ReturnType<typeof setInterval> | null = null;
  let fadeResolve: (() => void) | null = null;

  let fadedSettled = false;
  let heldSettled = false;
  let resolveFaded: () => void = () => undefined;
  let resolveHeld: () => void = () => undefined;
  let resolveDone: (() => void) | null = null;
  const fadedIn = new Promise<void>((resolve) => {
    resolveFaded = resolve;
  });
  const held = new Promise<void>((resolve) => {
    resolveHeld = resolve;
  });
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const settleFaded = () => {
    if (fadedSettled) return;
    fadedSettled = true;
    resolveFaded();
  };
  const settleHeld = () => {
    if (heldSettled) return;
    heldSettled = true;
    settleFaded();
    resolveHeld();
  };
  const settleDone = () => {
    if (!resolveDone) return;
    const finishDone = resolveDone;
    resolveDone = null;
    finishDone();
  };

  const clearTimers = () => {
    for (let i = 0; i < timers.length; i++) TrackedTimers.clear(timers[i]);
    timers.length = 0;
  };
  const cancelFade = () => {
    if (fadeTimer) {
      TrackedTimers.clear(fadeTimer);
      fadeTimer = null;
    }
    const resolve = fadeResolve;
    fadeResolve = null;
    if (resolve) resolve();
  };

  const finish = () => {
    if (stopped) return;
    stopped = true;
    clearTimers();
    cancelFade();
    root.off(Node.EventType.TOUCH_END, onSkip);
    if (root.isValid) root.destroy();
    settleFaded();
    settleHeld();
    settleDone();
  };

  root.once(Node.EventType.NODE_DESTROYED, finish);

  const stayOnTop = () => {
    if (stopped || !root.isValid || !root.parent) return;
    root.setSiblingIndex(Math.max(0, root.parent.children.length - 1));
  };

  let onSkip = (): void => undefined;
  onSkip = () => {
    if (skipped || stopped || dismissStarted) return;
    skipped = true;
    clearTimers();
    cancelFade();
    opacity.opacity = 255;
    syncChildOpacity(opacity);
    settleHeld();
  };
  root.on(Node.EventType.TOUCH_END, onSkip);

  ResourceAssetsUtils.loadForNode(logo, LOGO_SPRITE + "/spriteFrame", "SpriteFrame", (err, frame) => {
    if (stopped || !logo.isValid) return;
    if (err || !frame || logoFrameIsSpeck(frame)) return;
    sprite.enabled = true;
    sprite.spriteFrame = frame;
    const size = frame.originalSize;
    if (size && size.width > 0 && size.height > 0) logoUi.setContentSize(size.width, size.height);
  });
  void musicScope.loadPath(LOGO_BGM, "AudioClip").then(clip => {
    if (musicStopped || !audioHost.isValid) return;
    audio = audioHost.getComponent(AudioSource) || audioHost.addComponent(AudioSource);
    audio.clip = clip;
    audio.loop = true;
    audio.play();
  }).catch(error => {
    if (!musicStopped) GameLog.shared.classified("APP", "warn", "Boot", "启动音乐加载失败：" + String(error));
  });

  const fade = (from: number, to: number, seconds: number): Promise<void> => {
    cancelFade();
    opacity.opacity = from;
    syncChildOpacity(opacity);
    if (seconds <= 0 || stopped) {
      opacity.opacity = to;
      syncChildOpacity(opacity);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      fadeResolve = resolve;
      const started = Date.now();
      fadeTimer = TrackedTimers.interval(() => {
        if (stopped || !opacity.isValid) {
          cancelFade();
          return;
        }
        const t = Math.min(1, (Date.now() - started) / (seconds * 1000));
        opacity.opacity = from + (to - from) * t;
        syncChildOpacity(opacity);
        if (t >= 1) cancelFade();
      }, 16);
    });
  };

  let fadeStarted = false;
  const begin = () => {
    if (fadeStarted || stopped || skipped) return;
    fadeStarted = true;
    void fade(0, 255, LOGO_FADE_IN_SEC).then(() => {
      if (stopped || skipped) return;
      settleFaded();
      const hold = TrackedTimers.timeout(() => {
        if (stopped || skipped) return;
        settleHeld();
      }, LOGO_HOLD_SEC * 1000);
      timers.push(hold);
    });
  };
  ResourceAssetsUtils.loadForNode(bg, LOADING_BG_FRAME + "/spriteFrame", "SpriteFrame", (err, frame) => {
    if (!stopped && bg.isValid) {
      if (err || !frame) GameLog.shared.classified("APP", "warn", "Boot", "logo backdrop miss " + LOADING_BG_FRAME);
      else bgSprite.spriteFrame = frame;
    }
    begin();
  });

  return {
    node: root,
    fadedIn,
    held,
    done,
    skip() {
      if (root.isValid) root.emit(Node.EventType.TOUCH_END);
    },
    stayOnTop,
    dismiss() {
      if (stopped || dismissStarted) return;
      dismissStarted = true;
      settleHeld();
      const seconds = skipped ? SKIP_FADE_SEC : LOGO_FADE_OUT_SEC;
      void fade(opacity.opacity, 0, seconds).then(() => finish());
    },
    stop() {
      finish();
    },
    stopMusic,
  };
}

function syncChildOpacity(opacity: UIOpacity): void {
  const node = opacity.node;
  if (!node || !node.isValid) return;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i].getComponent(UIOpacity);
    if (child) child.opacity = opacity.opacity;
  }
}
