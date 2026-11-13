/**
 * 启动加载画面：由RemakeApp挂载已有LoadingLayer，显示真实任务进度、提示和失败重试。
 * 只负责加载层表现，不执行版本更新或保存账号状态；应用销毁时解除计时和等待。
 * 静态布局复用Prefab，运行时按当前可见区域铺满背景，不另造替代LoadingLayer。
 */
import { Button, Color, Label, Node, Prefab, UIOpacity, UITransform } from "cc";
import { GameConfig } from "../../config/GameConfig";
import { ConfigFileMap, ConfigName, GConfig } from "../../config/GConfig";
import { GameLog } from "../../core/GameLog";
import { LoginLayoutUtils } from "../../features/account/utils/LoginLayoutUtils";
import { BattleSpineService } from "../../features/battle/ui/BattleSpineService";
import { PrefabLoader } from "../../framework/assets/PrefabLoader";
import { UiKitUtils } from "../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../framework/ui/ViewportLayoutUtils";
/** 加载画面人物骨骼的资源名。 */
const BOOT_CAST_STEM = "jiemian";
/** 加载人物的待机动作。 */
const BOOT_CAST_CLIP = "stand";
/** LoadingLayer与logo过渡共用的底图。 */
export const LOADING_BG_FRAME = "maps/ui/map-bg-loading";
/**
 * 和登录页共用 768×1300 底图与 cover 规则，人物也走同一套宽度适配。
 * 和 LoadingLayer 预制里 Bg 的 contentSize 一致。
 */
export const LOADING_BG_DRAW_W = 768;
/** 加载底图的原始绘制高度，单位为设计像素。 */
export const LOADING_BG_DRAW_H = 1300;
/** 未由场景注入时使用的本地bootstrap加载层地址。 */
export const LOADING_PREFAB_PATH = "bundles/module/bootstrap/prefabs/LoadingLayer";
/** 进度条满长，单位为预制体局部像素。 */
const FILL_W = 524;
/** 进度条左端的局部横坐标。 */
const FILL_LEFT = -FILL_W / 2;
/** 多条提示的轮换间隔，单位为毫秒。 */
const TIP_MS = 3500;
/** 进度条动画骨骼的资源名。 */
const SPINE_STEM = "jindutiao";
/** 进度条动画的待机动作。 */
const SPINE_CLIP = "stand";
/** 提示字。清单要求 #ffeeb2。 */
export const BOOT_TIP_COLOR = new Color(255, 238, 178, 255);
/** 当前资源任务或失败提示的文字颜色。 */
export const BOOT_STAGE_COLOR = new Color(255, 244, 220, 255);
/** 百分比。 */
export const BOOT_PERCENT_COLOR = new Color(255, 248, 230, 255);
export class BootChrome {
    /** 当前淡出的结束函数；新一次显示、隐藏或销毁时兑现旧等待并取消计时。 */
    private cancelFade: (() => void) | null = null;
    /** 当前LoadingLayer实例，由本对象创建和销毁；未打开或已销毁时为null。 */
    private root: Node | null = null;
    /** 最近的真实任务比例，范围0到1；预制体挂载后重新绘制。 */
    private ratio = 0;
    /** 最近的任务说明或失败文字，不保存业务状态。 */
    private stage = "";
    /** 已清除富文本标记的提示；setTips替换，实例销毁后停止轮换。 */
    private tips: string[] = [];
    /** 当前提示下标；-1表示尚未选中，换提示列表时复位。 */
    private tipIndex = -1;
    /** 多提示轮换计时句柄；重新设置提示或销毁时解除。 */
    private tipTimer: ReturnType<typeof setInterval> | null = null;
    /** 等待玩家点击重试的完成口；新提示或销毁时将旧等待完成为false。 */
    private retryResolve: ((ok: boolean) => void) | null = null;
    /** true表示所属应用已销毁，后续异步资源不得重新挂载。 */
    private destroyed = false;
    /**
     * 保存应用提供的启动宿主及预制体读取口，不在构造时下载或创建节点。
     * @param parent 场景中的StartupHost，生命周期由RemakeApp持有。
     * @param load 读取场景已绑定的本地LoadingLayer；省略时使用统一加载器。
     */
    constructor(private readonly parent: Node, private readonly load?: () => Promise<Prefab>) {
    }

    /** 加载并挂载原LoadingLayer；keepAbove保持在其上方，供logo淡出时平滑交接。 */
    async open(keepAbove?: Node | null): Promise<void> {
        if (this.destroyed || !this.parent.isValid) {
            return;
        }
        this.destroyRoot();
        let root: Node | null = null;
        try {
            const prefab = this.load ? await this.load() : await PrefabLoader.loadPrefab(LOADING_PREFAB_PATH);
            if (this.destroyed || !this.parent.isValid) {
                return;
            }
            root = PrefabLoader.spawnPrefab(prefab, this.parent);
        }
        catch (err) {
            if (this.destroyed || !this.parent.isValid) {
                return;
            }
            GameLog.shared.classified("APP", "warn", "BootChrome", "LoadingLayer打开失败：" + String(err));
            return;
        }
        this.root = root;
        this.bindRetry();
        this.apply();
        this.mountSpine();
        this.mountCast();
        this.bindFill();
        this.raise();
        BootChrome.placeAbove(this.parent, keepAbove);
    }

    /** 更新当前任务说明；尚未挂载时先保存，挂载后统一绘制。 */
    setStage(text: string): void {
        this.stage = text;
        const node = this.child("Message");
        if (node) {
            UiKitUtils.setText(node, text);
        }
        BootChrome.tintLabel(node, BOOT_STAGE_COLOR);
    }

    /** 将真实任务比例限制在0到1，更新遮罩宽度、条头位置和百分比。 */
    setRatio(ratio: number): void {
        const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
        this.ratio = clamped;
        const width = Math.round(FILL_W * clamped);
        const mask = this.child("BarMask");
        if (mask) {
            const ui = mask.getComponent(UITransform);
            if (ui) {
                const height = ui.contentSize && ui.contentSize.height > 0 ? ui.contentSize.height : 40;
                ui.setContentSize(width, height);
            }
        }
        const head = this.child("BarHead");
        if (head) {
            head.setPosition(FILL_LEFT + width, head.position.y, 0);
        }
        const percent = this.child("Percent");
        if (percent) {
            UiKitUtils.setText(percent, Math.round(clamped * 100) + "%");
        }
        BootChrome.tintLabel(percent, BOOT_PERCENT_COLOR);
    }

    /** 替换提示并重新开始轮换；旧计时先解除，单条提示不创建计时器。 */
    setTips(lines: string[]): void {
        const next: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const clean = BootChrome.stripHtml(lines[i]);
            if (clean) {
                next.push(clean);
            }
        }
        this.tips = next;
        this.tipIndex = -1;
        this.rotateTip();
        if (this.tipTimer) {
            clearInterval(this.tipTimer);
        }
        if (next.length > 1) {
            this.tipTimer = setInterval(() => this.rotateTip(), TIP_MS);
        }
    }

    /** 取消旧淡出并显示当前加载画面，不改变真实任务进度。 */
    show(): void {
        this.cancelFade?.();
        if (this.root && this.root.isValid) {
            const opacity = this.root.getComponent(UIOpacity);
            if (opacity) {
                opacity.opacity = 255;
            }
            this.root.active = true;
            this.raise();
        }
    }

    /** 隐藏加载层及重试按钮，淡出等待在隐藏前完成。 */
    hide(): void {
        this.cancelFade?.();
        if (this.root && this.root.isValid) {
            this.root.active = false;
        }
        const retry = this.child("Retry");
        if (retry) {
            retry.active = false;
        }
    }

    /** 停在当前层上，等按钮。销毁时得到 false。 */
    prompt(message: string, buttonLabel: string): Promise<boolean> {
        this.show();
        this.setStage(message);
        this.setRetryLabel(buttonLabel);
        const retry = this.child("Retry");
        if (retry) {
            retry.active = true;
        }
        return new Promise((resolve) => {
            if (this.retryResolve) {
                this.retryResolve(false);
            }
            if (!retry) {
                this.retryResolve = null;
                resolve(false);
                return;
            }
            this.retryResolve = resolve;
        });
    }

    /** 应用退出时停止淡出和提示计时、结束重试等待并销毁已有实例。 */
    destroy(): void {
        this.cancelFade?.();
        this.destroyed = true;
        if (this.tipTimer) {
            clearInterval(this.tipTimer);
        }
        this.tipTimer = null;
        if (this.retryResolve) {
            const resolve = this.retryResolve;
            this.retryResolve = null;
            resolve(false);
        }
        this.destroyRoot();
    }

    /** true表示已有可用LoadingLayer实例，不代表资源准备任务已经完成。 */
    get isReady(): boolean {
        return !!this.root?.isValid;
    }

    /** 仅执行加载层视觉淡出；取消或销毁也完成Promise，不伪造任务进度。 */
    fadeOut(seconds = 0.3): Promise<void> {
        this.cancelFade?.();
        const root = this.root;
        if (!root?.isValid) {
            return Promise.resolve();
        }
        const opacity = root.getComponent(UIOpacity) || root.addComponent(UIOpacity);
        return new Promise(resolve => {
            const started = Date.now();
            const finish = () => {
                clearInterval(timer);
                if (this.cancelFade === finish) {
                    this.cancelFade = null;
                }
                resolve();
            };
            const timer = setInterval(() => {
                if (!root.isValid) {
                    finish();
                    return;
                }
                const fraction = seconds > 0 ? Math.min(1, (Date.now() - started) / (seconds * 1000)) : 1;
                opacity.opacity = Math.round(255 * (1 - fraction));
                if (fraction === 1) {
                    finish();
                }
            }, 16);
            this.cancelFade = finish;
        });
    }

    /** 向新挂载实例绘制已保存的任务说明、进度和提示。 */
    private apply(): void {
        this.setStage(this.stage);
        this.setRatio(this.ratio);
        this.rotateTip();
        const retry = this.child("Retry");
        if (retry) {
            retry.active = false;
        }
    }

    /** 选择下一条提示；多条时避免与上一条相同，空列表不绘制。 */
    private rotateTip(): void {
        if (this.tips.length === 0) {
            return;
        }
        if (this.tips.length === 1) {
            this.tipIndex = 0;
        }
        else {
            let next = this.tipIndex;
            do {
                next = Math.floor(Math.random() * this.tips.length);
            } while (next === this.tipIndex);
            this.tipIndex = next;
        }
        const node = this.child("Tips");
        if (node) {
            UiKitUtils.setText(node, this.tips[this.tipIndex]);
        }
        BootChrome.tintLabel(node, BOOT_TIP_COLOR);
    }

    /** 在预制体已有进度条挂点播放原骨骼动画，不改变进度完成口径。 */
    private mountSpine(): void {
        const host = this.child("BarMask/Spine");
        if (!host) {
            return;
        }
        BattleSpineService.instance.mountNamedSpine(host, SPINE_STEM, SPINE_CLIP);
    }

    /** 正式服加载画面中间的人物特效。缺套只打日志，底图和进度条仍在。 */
    private mountCast(): void {
        const root = this.root;
        if (!root) {
            return;
        }
        const host = UiKitUtils.uiNode("BootCast");
        host.addComponent(UITransform).setContentSize(720, 972);
        UiKitUtils.place(host, root, 0, 0);
        const bg = root.getChildByName("Bg");
        if (bg) {
            host.setSiblingIndex(bg.getSiblingIndex() + 1);
        }
        BattleSpineService.instance.mountNamedSpine(host, BOOT_CAST_STEM, BOOT_CAST_CLIP, {
            onFail: () => GameLog.shared.classified("APP", "warn", "Boot", "loading cast miss spine/" + BOOT_CAST_STEM + " clip=" + BOOT_CAST_CLIP),
        });
    }

    /**
     * 抵消 SafeFrame 在窄屏上的缩小，加载层铺满可见高。
     * 背景按 cover 放大，避免上下或左右留黑边。
     */
    private bindFill(): void {
        const root = this.root;
        if (!root) {
            return;
        }
        const apply = () => this.fitRoot();
        ViewportLayoutUtils.bindVisibleRefresh(root, apply);
        const later = setTimeout(apply, 160);
        root.once(Node.EventType.NODE_DESTROYED, () => clearTimeout(later));
    }

    /** 按当前可见区铺满已有加载根和背景，不创建替代页面。 */
    private fitRoot(): void {
        const root = this.root;
        if (!root || !root.isValid) {
            return;
        }
        BootChrome.fitLoadingBackdrop(root);
    }

    /** 绑定预制体中的重试按钮，点击只结束当前prompt等待。 */
    private bindRetry(): void {
        const retry = this.child("Retry");
        if (!retry || !retry.getComponent(Button)) {
            return;
        }
        retry.on(Button.EventType.CLICK, () => {
            retry.active = false;
            const resolve = this.retryResolve;
            this.retryResolve = null;
            if (resolve) {
                resolve(true);
            }
        });
    }

    /** 更新预制体中已有重试按钮的文字。 */
    private setRetryLabel(text: string): void {
        const label = this.child("Retry/Label");
        if (label) {
            UiKitUtils.setText(label, text);
        }
    }

    /** 将当前加载实例放到启动宿主最上层，阻止旧页面盖住进度。 */
    private raise(): void {
        const root = this.root;
        const parent = root && root.parent;
        if (!root || !parent) {
            return;
        }
        root.setSiblingIndex(Math.max(0, parent.children.length - 1));
    }

    /** 查找当前加载实例的已有子节点；实例未就绪或已销毁时返回null。 */
    private child(path: string): Node | null {
        if (!this.root || !this.root.isValid) {
            return null;
        }
        return PrefabLoader.findNode(this.root, path);
    }

    /** 释放当前加载实例并清除引用，重复调用安全。 */
    private destroyRoot(): void {
        if (this.root && this.root.isValid) {
            this.root.destroy();
        }
        this.root = null;
    }

    /** 从已准备配置读取加载提示；提示不可用时返回空数组，不发起额外资源请求。 */
    public static async readLoadingTips(read: <N extends ConfigName>(name: N) => Promise<ConfigFileMap[N]> = name => Promise.resolve(GameConfig.instance.getFile(name))): Promise<string[]> {
        const tips: string[] = [];
        try {
            const language = await read(GConfig.Language);
            const words = BootChrome.indexLanguage(language.rows);
            const file = await read(GConfig.LoadingTips);
            for (const row of file.rows) {
                const text = words[String(row.tips)];
                if (text) {
                    tips.push(text);
                }
            }
        }
        catch {
            // 必需配置的加载失败由三段准备流程处理；缺少可选提示时仍保留加载和重试画面。
        }
        return tips;
    }

    /** 和 LoadingLayer 一样：根铺满可见区域，Bg 再按 cover 放大，不留黑边。 */
    public static fitLoadingBackdrop(root: Node): void {
        if (!root.isValid) {
            return;
        }
        const box = ViewportLayoutUtils.fitVisibleRoot(root);
        const layout = LoginLayoutUtils.calculate(box.width, box.height);
        const cast = root.getChildByName("BootCast");
        if (cast) {
            cast.setScale(layout.castScale, layout.castScale, 1);
            cast.setPosition(0, layout.castY, 0);
        }
        const bg = root.getChildByName("Bg");
        if (!bg) {
            return;
        }
        const ui = bg.getComponent(UITransform);
        if (ui) {
            ui.setContentSize(layout.backgroundWidth, layout.backgroundHeight);
        }
        bg.setScale(1, 1, 1);
    }

    /** 让同一宿主内仍有效的过渡节点位于LoadingLayer上方。 */
    private static placeAbove(parent: Node, node?: Node | null): void {
        if (!node || !node.isValid || !parent || !parent.isValid || node.parent !== parent) {
            return;
        }
        node.setSiblingIndex(Math.max(0, parent.children.length - 1));
    }

    /** 更新已有Label颜色，缺少节点或组件时跳过。 */
    private static tintLabel(node: Node | null, color: Color): void {
        if (!node) {
            return;
        }
        const label = node.getComponent(Label);
        if (label) {
            label.color = color;
        }
    }

    /** 为已读取的语言行建立提示查询索引，忽略非法行并清除富文本标记。 */
    private static indexLanguage(rows: unknown): {
        [key: string]: string;
    } {
        const map: {
            [key: string]: string;
        } = {};
        const list = Array.isArray(rows) ? rows : [];
        for (let i = 0; i < list.length; i++) {
            const row = list[i];
            if (!row || typeof row !== "object") {
                continue;
            }
            const rec = row as {
                key?: unknown;
                value?: unknown;
            };
            if (rec.key === undefined || rec.key === null || typeof rec.value !== "string") {
                continue;
            }
            map[String(rec.key)] = BootChrome.stripHtml(rec.value);
        }
        return map;
    }

    /** 将加载提示转换为可直接显示的纯文字。 */
    private static stripHtml(raw: string): string {
        return raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    }
}
