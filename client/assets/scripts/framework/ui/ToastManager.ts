/**
 * 全局飘字：由应用管理场景的三个提示槽，供 UIManager.toast 在登录前后显示操作结果。
 * 新提示从中央出现并向上排列旧条目；每条独立播放，满槽时按到达顺序等待。
 * 应用换号和退出时清空当前及待播状态，所有动画只由应用帧推进。
 */
import { Label, Node, Overflow, UIOpacity, UITransform } from "cc";
import { GameLog } from "../../core/GameLog";

/** 一条完整反馈及播放时间，持续时间单位为秒。 */
interface ToastEntry {
    /** 原始提示文字，各次提交均独立播放。 */
    readonly text: string;
    /** 0 表示常驻，直到新反馈替换或清理。 */
    readonly duration: number;
}

/** 一个场景绘制槽及其本轮播放状态。 */
interface ToastSlot {
    /** 场景预先放置的九宫格底板和文字。 */
    readonly panel: Node;
    readonly label: Label;
    /** 布局按文字实测结果放大，组件缺失时不调整对应尺寸。 */
    readonly panelTransform: UITransform | null;
    readonly textTransform: UITransform | null;
    /** 槽空闲时恢复场景中的位置和最小尺寸。 */
    readonly origin: { x: number; y: number; z: number };
    readonly panelSize: { width: number; height: number } | null;
    readonly textSize: { width: number; height: number } | null;
    /** 控制底板与其子文字一起淡入和淡出。 */
    readonly opacity: UIOpacity;
    /** 正在播放的条目，隐藏或清理时清空。 */
    entry: ToastEntry | null;
    /** 条目已播放的秒数，绑定和回收时置零。 */
    elapsed: number;
}

export class ToastManager {
    /** 入场淡入最多 0.1 秒，短提示按总时长收缩。 */
    private static readonly fadeInSeconds = 0.1;
    /** 淡入结束后持续上浮的秒数，最后半秒同时淡出。 */
    private static readonly floatSeconds = 3;
    /** 退场淡出最多 0.5 秒，短提示按总时长收缩。 */
    private static readonly fadeOutSeconds = 0.5;
    /** 每条提示在原位置之上独立上浮的距离，单位为 Canvas 局部坐标。 */
    private static readonly floatDistance = 30;
    /** 日服底板左右的总留白，单位为 Canvas 局部坐标。 */
    private static readonly horizontalPadding = 30;
    /** 日服底板上下的总留白，单位为 Canvas 局部坐标。 */
    private static readonly verticalPadding = 16;
    /** 各条底板间的纵向距离，单位为 Canvas 局部坐标。 */
    private static readonly stackGap = 6;
    /** 普通提示的总时长，单位为秒。 */
    private static readonly defaultDuration = ToastManager.fadeInSeconds + ToastManager.floatSeconds;
    /** 场景绑定的提示槽，首次绑定后整个应用期间复用。 */
    private readonly slots: ToastSlot[] = [];
    /** 当前可见的槽按入场顺序排列，最新的显示在最下方。 */
    private readonly active: ToastSlot[] = [];
    /** 满槽时保留后续条目，按进入顺序分配空位。会话清理时归零。 */
    private readonly pending: ToastEntry[] = [];
    /** true 表示应用已结束，忽略迟到反馈。 */
    private disposed = false;

    /**
     * 绑定场景已有的面板和文字，额外文字使用各自的父节点作为独立提示底板。
     * @param panel 应用旧有的首个提示面板。
     * @param label 首个面板的提示文字，保留登录前的使用方式。
     * @param stackLabels 其余静态槽的文字组件。
     */
    constructor(panel: Node | null, label: Label | null, stackLabels: readonly Label[] = []) {
        this.registerSlot(panel, label);
        for (const stackLabel of stackLabels) {
            this.registerSlot(stackLabel?.node?.parent ?? null, stackLabel);
        }
    }

    /**
     * 提交一次独立反馈，立即显示或在满槽时等待。
     * @param durationMs 总播放毫秒，默认 3100。非正数表示常驻，非有限数使用默认值。
     */
    public show(text: string, durationMs?: number): void {
        if (this.disposed || !text?.trim()) {
            return;
        }
        if (!this.slots.some(slot => this.isSlotValid(slot))) {
            GameLog.shared.classified("FRAMEWORK", "error", "ToastManager", text);
            return;
        }
        // 持续显示的启动错误在首个新结果到达时让位，其他有限提示仍各自播完。
        this.releaseActive(slot => slot.entry?.duration === 0 || !this.isSlotValid(slot));

        const duration = durationMs !== undefined && Number.isFinite(durationMs)
            ? Math.max(0, durationMs / 1000)
            : ToastManager.defaultDuration;
        this.pending.push({ text, duration });
        this.fillSlots();
        this.paint();
    }

    /** 逐帧推进各槽及待播提示；长帧沿到期顺序消费时间，确保空位按时接续。 */
    public update(dt: number): void {
        if (this.disposed || !Number.isFinite(dt) || dt < 0 || (!this.active.length && !this.pending.length)) {
            return;
        }
        this.releaseActive(slot => !this.isSlotValid(slot));
        this.fillSlots();
        if (!this.active.length) {
            this.dispose();
            return;
        }
        let remaining = dt;
        while (this.active.length && remaining > 0) {
            const step = this.advanceActive(remaining);
            remaining -= step;
            this.releaseActive(slot => slot.entry!.duration > 0 && slot.elapsed >= slot.entry!.duration);
            this.fillSlots();
        }
        this.paint();
    }

    /** 换号时清空旧角色的所有反馈；槽的原场景状态复原，可重新用于下一角色。 */
    public clear(): void {
        if (this.disposed) {
            return;
        }
        this.pending.length = 0;
        this.releaseActive(() => true);
    }

    /** 应用销毁时清理场景槽和队列，并终止迟到交付。 */
    public dispose(): void {
        this.clear();
        this.disposed = true;
    }

    /** 为一个现有场景面板记录初始位置、尺寸和透明度组件。 */
    private registerSlot(panel: Node | null, label: Label | null): void {
        if (!panel?.isValid || !label?.isValid || this.slots.some(slot => slot.panel === panel)) {
            return;
        }
        const { x, y, z } = panel.position;
        const panelTransform = panel.getComponent(UITransform);
        const textTransform = label.node.getComponent(UITransform);
        this.slots.push({
            panel,
            label,
            panelTransform,
            textTransform,
            origin: { x, y, z },
            panelSize: panelTransform ? { ...panelTransform.contentSize } : null,
            textSize: textTransform ? { ...textTransform.contentSize } : null,
            opacity: panel.getComponent(UIOpacity) ?? panel.addComponent(UIOpacity),
            entry: null,
            elapsed: 0,
        });
        panel.active = false;
    }

    /** 判断当前绘制槽是否仍属于有效场景节点，销毁时释放它的运行状态。 */
    private isSlotValid(slot: ToastSlot): boolean {
        return slot.panel.isValid && slot.label.isValid && slot.opacity.isValid;
    }

    /** 把队首反馈依次交给有效空槽，不覆盖正在播放的有限反馈。 */
    private fillSlots(): void {
        for (const slot of this.slots) {
            if (!this.pending.length) {
                break;
            }
            if (!slot.entry && this.isSlotValid(slot)) {
                const entry = this.pending.shift()!;
                // 进入播放前已有更新的反馈时，仍展示常驻项一次，然后把槽还给队列。
                this.begin(slot, entry.duration === 0 && this.pending.length > 0
                    ? { ...entry, duration: ToastManager.defaultDuration }
                    : entry);
                this.active.push(slot);
            }
        }
    }

    /** 把一项反馈装入空槽，以引擎测量的实际换行尺寸调整九宫格底板。 */
    private begin(slot: ToastSlot, entry: ToastEntry): void {
        const { label, panel, panelTransform, panelSize, textTransform, textSize } = slot;
        slot.entry = entry;
        slot.elapsed = 0;
        label.string = entry.text;
        label.enableWrapText = false;
        label.overflow = Overflow.NONE;
        panel.active = true;
        label.updateRenderData(true);
        if (textTransform && textSize && textTransform.contentSize.width > textSize.width) {
            label.enableWrapText = true;
            label.overflow = Overflow.RESIZE_HEIGHT;
            textTransform.setContentSize(textSize.width, textSize.height);
            label.updateRenderData(true);
        }
        if (panelTransform && panelSize && textTransform) {
            panelTransform.setContentSize(
                Math.max(panelSize.width, textTransform.contentSize.width + ToastManager.horizontalPadding),
                Math.max(panelSize.height, textTransform.contentSize.height + ToastManager.verticalPadding),
            );
        }
    }

    /** 向前推进到最先到期的一项或本帧末尾，返回真正消费的秒数。 */
    private advanceActive(remaining: number): number {
        let step = remaining;
        for (const slot of this.active) {
            const duration = slot.entry!.duration;
            if (duration > 0) {
                step = Math.min(step, duration - slot.elapsed);
            }
        }
        for (const slot of this.active) {
            slot.elapsed += step;
        }
        return step;
    }

    /** 各槽独立计算透明度和上浮进度，按真实底板高度将旧提示推到新提示上方。 */
    private paint(): void {
        let lowerTop = -Infinity;
        for (let index = this.active.length - 1; index >= 0; index--) {
            const slot = this.active[index];
            const duration = slot.entry!.duration;
            const fadeIn = duration > 0 ? Math.min(ToastManager.fadeInSeconds, duration / 3) : ToastManager.fadeInSeconds;
            const fadeOut = duration > 0 ? Math.min(ToastManager.fadeOutSeconds, duration / 3) : 0;
            const entering = Math.min(1, slot.elapsed / fadeIn);
            const leaving = duration > 0 ? Math.min(1, Math.max(0, (slot.elapsed - duration + fadeOut) / fadeOut)) : 0;
            const alpha = entering === 1 ? 1 : 1 - 2 ** (-10 * entering);
            slot.opacity.opacity = Math.round(255 * alpha * (1 - leaving));

            const travel = duration > 0 ? Math.min(1, Math.max(0, (slot.elapsed - fadeIn) / ToastManager.floatSeconds)) : 0;
            const halfHeight = (slot.panelTransform?.contentSize.height ?? 36) / 2;
            const y = Math.max(slot.origin.y + ToastManager.floatDistance * travel, lowerTop + halfHeight + ToastManager.stackGap);
            slot.panel.setPosition(slot.origin.x, y, slot.origin.z);
            lowerTop = y + halfHeight;
        }
    }

    /** 回收满足条件的槽，保留其余条目的播放顺序和计时。 */
    private releaseActive(shouldRelease: (slot: ToastSlot) => boolean): void {
        for (let index = this.active.length - 1; index >= 0; index--) {
            const slot = this.active[index];
            if (shouldRelease(slot)) {
                this.active.splice(index, 1);
                this.resetSlot(slot);
            }
        }
    }

    /** 停播并复原单槽的布局和文字，已销毁的场景组件只清理内存引用。 */
    private resetSlot(slot: ToastSlot): void {
        const { panel, label, opacity, origin, panelTransform, panelSize, textTransform, textSize } = slot;
        slot.entry = null;
        slot.elapsed = 0;
        if (panel.isValid) {
            panel.active = false;
            panel.setPosition(origin.x, origin.y, origin.z);
        }
        if (opacity.isValid) {
            opacity.opacity = 255;
        }
        if (label.isValid) {
            label.string = "";
        }
        if (textTransform?.isValid && textSize) {
            textTransform.setContentSize(textSize.width, textSize.height);
        }
        if (panelTransform?.isValid && panelSize) {
            panelTransform.setContentSize(panelSize.width, panelSize.height);
        }
    }
}
