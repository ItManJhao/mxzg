/**
 * 开机过渡：由RemakeApp启动，淡入、停留后交接到已有LoadingLayer，点击可跳过等待。
 * 图片跟随过渡节点持有；背景音乐独立持有，进入主城或应用销毁后停止。
 * 复用加载画面底图，过小的失败抽出logo不显示，不拼造替代图像。
 */
import { AudioSource, BlockInputEvents, Node, Sprite, SpriteFrame, UIOpacity, UITransform } from "cc";
import { GameLog } from "../../core/GameLog";
import { ResourceAssetsUtils } from "../../framework/assets/ResourceAssetsUtils";
import { TrackedTimers } from "../../framework/TrackedTimers";
import { UiKitUtils } from "../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../framework/ui/ViewportLayoutUtils";
import { BootChrome, LOADING_BG_DRAW_H, LOADING_BG_DRAW_W, LOADING_BG_FRAME } from "./BootChrome";
/** 首次底图淡入时长，单位为秒。 */
export const LOGO_FADE_IN_SEC = 1;
/** 默认停留时长，单位为秒；玩家点击可提前结束。 */
export const LOGO_HOLD_SEC = 1;
/** LoadingLayer已铺好后的淡出时长，单位为秒。 */
export const LOGO_FADE_OUT_SEC = 0.5;
/** 原logo资源路径，过小的抽出图片不会显示。 */
export const LOGO_SPRITE = "login/ui/logo-scene_spr-logo";
/** 从淡入起播放、进入主城后停止的原背景音乐。 */
export const LOGO_BGM = "audio/bgm-logo";
/** 宽或高不超过这个数，当成失败抽出，不拿来当开机图。 */
export const LOGO_SPECK_MAX = 8;
/** 玩家跳过后交接加载画面的淡出时长，单位为秒。 */
const SKIP_FADE_SEC = 0.15;
/** 应用持有的过渡句柄；停止后所有等待均结束，不允许迟到资源重新播放。 */
export interface LogoSplashHandle {
    /** 过渡根节点，供LoadingLayer挂载时保持覆盖顺序。 */
    readonly node: Node;
    /** 底图已经淡入。这时再挂 LoadingLayer，避免半透明时透出加载层。 */
    fadedIn: Promise<void>;
    /** 停留结束，或点一下跳过。淡出要等加载层铺好再开始。 */
    held: Promise<void>;
    /** 淡出或停止后完成，完成时过渡节点已请求销毁。 */
    done: Promise<void>;
    /** 淡出并拆掉。LoadingLayer 要已经在这层下面。 */
    dismiss(): void;
    /** 立即结束过渡、解除监听与计时，不改变应用任务进度。 */
    stop(): void;
    /** 进主城时停掉。启动失败时也停。 */
    stopMusic(): void;
}
/** 开机过渡工厂：每次播放状态归返回句柄持有，工具类不保存共享可变状态。 */
export class LogoSplashUtils {
    /** 仅提供静态入口，禁止创建工具实例。 */
    private constructor() {
    }

    /** 启动图片归logo节点，音乐由独立句柄持有，停止后拒绝迟到音频。 */
    public static playLogoSplash(parent: Node, audioHost: Node): LogoSplashHandle {
        const root = UiKitUtils.uiNode("LogoSplash");
        const ui = root.addComponent(UITransform);
        ui.setContentSize(720, 1280);
        root.addComponent(BlockInputEvents);
        const opacity = root.addComponent(UIOpacity);
        opacity.opacity = 0;
        root.parent = parent;
        const bg = UiKitUtils.uiNode("Bg");
        const bgUi = bg.addComponent(UITransform);
        bgUi.setContentSize(LOADING_BG_DRAW_W, LOADING_BG_DRAW_H);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bg.addComponent(UIOpacity);
        UiKitUtils.place(bg, root, 0, 0);
        const logo = UiKitUtils.uiNode("logo-scene_spr-logo");
        const logoUi = logo.addComponent(UITransform);
        const sprite = logo.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.RAW;
        sprite.enabled = false;
        logo.addComponent(UIOpacity);
        UiKitUtils.place(logo, root, 0, 0);
        ViewportLayoutUtils.bindVisibleRefresh(root, () => {
            if (root.isValid) {
                BootChrome.fitLoadingBackdrop(root);
            }
        });
        let skipped = false;
        let stopped = false;
        let dismissStarted = false;
        let audio: AudioSource | null = null;
        const musicScope = ResourceAssetsUtils.createAssetScope();
        let musicStopped = false;
        /** 音乐寿命长于logo节点；进入主城或宿主销毁时单独停止并释放。 */
        const stopMusic = () => {
            if (musicStopped) {
                return;
            }
            musicStopped = true;
            if (audio?.isValid) {
                audio.stop();
                audio.clip = null;
            }
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
            if (fadedSettled) {
                return;
            }
            fadedSettled = true;
            resolveFaded();
        };
        const settleHeld = () => {
            if (heldSettled) {
                return;
            }
            heldSettled = true;
            settleFaded();
            resolveHeld();
        };
        const settleDone = () => {
            if (!resolveDone) {
                return;
            }
            const finishDone = resolveDone;
            resolveDone = null;
            finishDone();
        };
        const clearTimers = () => {
            for (let i = 0; i < timers.length; i++) {
                TrackedTimers.clear(timers[i]);
            }
            timers.length = 0;
        };
        const cancelFade = () => {
            if (fadeTimer) {
                TrackedTimers.clear(fadeTimer);
                fadeTimer = null;
            }
            const resolve = fadeResolve;
            fadeResolve = null;
            if (resolve) {
                resolve();
            }
        };
        const finish = () => {
            if (stopped) {
                return;
            }
            stopped = true;
            clearTimers();
            cancelFade();
            root.off(Node.EventType.TOUCH_END, onSkip);
            if (root.isValid) {
                root.destroy();
            }
            settleFaded();
            settleHeld();
            settleDone();
        };
        root.once(Node.EventType.NODE_DESTROYED, finish);
        let onSkip = (): void => undefined;
        onSkip = () => {
            if (skipped || stopped || dismissStarted) {
                return;
            }
            skipped = true;
            clearTimers();
            cancelFade();
            opacity.opacity = 255;
            LogoSplashUtils.syncChildOpacity(opacity);
            settleHeld();
        };
        root.on(Node.EventType.TOUCH_END, onSkip);
        ResourceAssetsUtils.loadForNode(logo, LOGO_SPRITE + "/spriteFrame", "SpriteFrame", (err, frame) => {
            if (stopped || !logo.isValid) {
                return;
            }
            if (err || !frame || LogoSplashUtils.logoFrameIsSpeck(frame)) {
                return;
            }
            sprite.enabled = true;
            sprite.spriteFrame = frame;
            const size = frame.originalSize;
            if (size && size.width > 0 && size.height > 0) {
                logoUi.setContentSize(size.width, size.height);
            }
        });
        void musicScope.loadPath(LOGO_BGM, "AudioClip").then(clip => {
            if (musicStopped || !audioHost.isValid) {
                return;
            }
            audio = audioHost.getComponent(AudioSource) || audioHost.addComponent(AudioSource);
            audio.clip = clip;
            audio.loop = true;
            audio.play();
        }).catch(error => {
            if (!musicStopped) {
                GameLog.shared.classified("APP", "warn", "Boot", "启动音乐加载失败：" + String(error));
            }
        });
        const fade = (from: number, to: number, seconds: number): Promise<void> => {
            cancelFade();
            opacity.opacity = from;
            LogoSplashUtils.syncChildOpacity(opacity);
            if (seconds <= 0 || stopped) {
                opacity.opacity = to;
                LogoSplashUtils.syncChildOpacity(opacity);
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
                    LogoSplashUtils.syncChildOpacity(opacity);
                    if (t >= 1) {
                        cancelFade();
                    }
                }, 16);
            });
        };
        let fadeStarted = false;
        const begin = () => {
            if (fadeStarted || stopped || skipped) {
                return;
            }
            fadeStarted = true;
            void fade(0, 255, LOGO_FADE_IN_SEC).then(() => {
                if (stopped || skipped) {
                    return;
                }
                settleFaded();
                const hold = TrackedTimers.timeout(() => {
                    if (stopped || skipped) {
                        return;
                    }
                    settleHeld();
                }, LOGO_HOLD_SEC * 1000);
                timers.push(hold);
            });
        };
        ResourceAssetsUtils.loadForNode(bg, LOADING_BG_FRAME + "/spriteFrame", "SpriteFrame", (err, frame) => {
            if (!stopped && bg.isValid) {
                if (err || !frame) {
                    GameLog.shared.classified("APP", "warn", "Boot", "logo backdrop miss " + LOADING_BG_FRAME);
                }
                else {
                    bgSprite.spriteFrame = frame;
                }
            }
            begin();
        });
        return {
            node: root,
            fadedIn,
            held,
            done,
            dismiss() {
                if (stopped || dismissStarted) {
                    return;
                }
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

    /** 检查logo是否缺失或尺寸过小；true表示不应作为开机图显示。 */
    private static logoFrameIsSpeck(frame: SpriteFrame | null | undefined): boolean {
        if (!frame || !frame.originalSize) {
            return true;
        }
        const width = frame.originalSize.width;
        const height = frame.originalSize.height;
        if (!(width > LOGO_SPECK_MAX) || !(height > LOGO_SPECK_MAX)) {
            return true;
        }
        return false;
    }

    /** 同步现有子图片的透明度，保持当前过渡资源的淡入淡出表现。 */
    private static syncChildOpacity(opacity: UIOpacity): void {
        const node = opacity.node;
        if (!node || !node.isValid) {
            return;
        }
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) {
            const child = kids[i].getComponent(UIOpacity);
            if (child) {
                child.opacity = opacity.opacity;
            }
        }
    }
}
