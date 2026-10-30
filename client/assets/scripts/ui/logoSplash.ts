/**
 * 开机 logo。旧 lua 不在仓库里，淡入淡出按这套资源常用的三段：
 * 淡入 1 秒、停留 1 秒、淡出 0.5 秒。点一下跳过停留和淡出。
 * bgm-logo 从淡入开始循环，进主城再停。
 * logo-scene_spr-logo.png 仍是 3×3 的失败抽出。比 LOGO_SPECK_MAX 还小就不显示。
 * 不再把左右饰纹拼成焰环，也不铺黑底。画面用 LoadingLayer 同一张 bg-loading，
 * cover 和加载层一致。淡出时加载层已经在下面，不会收回成黑屏。
 */
import { AudioClip, AudioSource, BlockInputEvents, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from "cc";
import { GameLog } from "../core/GameLog";
import { LOADING_BG_DRAW_H, LOADING_BG_DRAW_W, LOADING_BG_FRAME, fitLoadingBackdrop } from "./bootChrome";
import { bindVisibleRefresh } from "./visibleFit";
import { place, uiNode } from "./UiKit";

export const LOGO_FADE_IN_SEC = 1;
export const LOGO_HOLD_SEC = 1;
export const LOGO_FADE_OUT_SEC = 0.5;
export const LOGO_SPRITE = "ui/login/logo-scene_spr-logo";
export const LOGO_BGM = "audio/bgm-logo";
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
    for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers.length = 0;
  };
  const cancelFade = () => {
    if (fadeTimer) {
      clearInterval(fadeTimer);
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

  resources.load(LOGO_SPRITE + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (stopped || !logo.isValid) return;
    if (err || !frame || logoFrameIsSpeck(frame)) return;
    sprite.enabled = true;
    sprite.spriteFrame = frame;
    const size = frame.originalSize;
    if (size && size.width > 0 && size.height > 0) logoUi.setContentSize(size.width, size.height);
  });
  resources.load(LOGO_BGM, AudioClip, (err, clip) => {
    if (stopped || !audioHost.isValid || err || !clip) return;
    audio = audioHost.getComponent(AudioSource) || audioHost.addComponent(AudioSource);
    audio.clip = clip;
    audio.loop = true;
    audio.play();
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
      fadeTimer = setInterval(() => {
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
      const hold = setTimeout(() => {
        if (stopped || skipped) return;
        settleHeld();
      }, LOGO_HOLD_SEC * 1000);
      timers.push(hold);
    });
  };
  resources.load(LOADING_BG_FRAME + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (!stopped && bg.isValid) {
      if (err || !frame) GameLog.shared.warn("Boot", "logo backdrop miss " + LOADING_BG_FRAME);
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
    stopMusic() {
      if (audio) audio.stop();
    },
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
