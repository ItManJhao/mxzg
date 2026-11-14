/**
 * 全局飘字：复用场景已有的提示面板和Label，供UIManager.toast在登录前后统一显示结果。
 * 同一节点依次播放有界队列，以应用update推进上浮和淡入淡出，不创建页面、节点或计时器。
 * 文字保留完整原因并按场景宽度换行，应用销毁时清空队列并复原宿主状态。
 */
import { Label, Node, Overflow, UIOpacity, UITransform } from "cc";
import { GameLog } from "../../core/GameLog";

/** 一条完整提示及其播放时长，不根据文字猜测业务成功或失败。 */
interface ToastEntry {
    /** 完整显示文字，也是当前队列的去重键，不截断错误原因。 */
    text: string;
    /** 总播放秒数；0表示常驻，直到下条提示替换或应用销毁。 */
    duration: number;
}

export class ToastManager {
    /** 含当前提示在内最多保留八条；拥挤时淘汰最早待播项，保留当前和最新结果。 */
    private static readonly maxEntries = 8;
    /** 入场淡入最长0.18秒，短提示按总时长等比例收缩。 */
    private static readonly fadeInSeconds = 0.18;
    /** 退场淡出最长0.28秒，短提示按总时长等比例收缩。 */
    private static readonly fadeOutSeconds = 0.28;
    /** 从场景原位置向上移动的总距离，单位为Canvas局部坐标。 */
    private static readonly floatDistance = 48;
    /** 待播提示按进入顺序保存；当前项单独持有，重复文字不入队。 */
    private readonly pending: ToastEntry[] = [];
    /** 当前播放项，结束或dispose时清空。 */
    private current: ToastEntry | null = null;
    /** 当前项已播放秒数，开始下一项时归零，不使用墙钟或服务器时间。 */
    private elapsed = 0;
    /** true表示应用已结束；迟到的show/update不能重新激活场景节点。 */
    private disposed = false;
    /** 原提示位置，播放和销毁只复原这份场景坐标。 */
    private readonly origin: { x: number; y: number; z: number };
    /** 提示面板的场景尺寸组件，缺失时只显示文字，不另造布局节点。 */
    private readonly panelTransform: UITransform | null;
    /** 文字节点已有的场景尺寸组件，用于读取引擎计算的换行高度。 */
    private readonly textTransform: UITransform | null;
    /** 场景原面板高度，是内容自适应的最小高度，dispose时恢复。 */
    private readonly basePanelHeight: number;
    /** 场景原文字高度，用于恢复尺寸并保留上下留白。 */
    private readonly baseTextHeight: number;
    /** 原有面板透明度组件；没有时只添加组件，不增加节点或改变层级。 */
    private readonly opacity: UIOpacity | null;

    /**
     * 绑定场景已有的提示节点，初始保持隐藏，不接管页面或资源生命周期。
     * @param panel 由Remake.scene拥有的唯一提示面板，null时后续提示记录明确错误
     * @param label 场景绑定的提示Label，null时不以空白成功状态掩盖缺失
     */
    constructor(private readonly panel: Node | null, private readonly label: Label | null) {
        this.origin = panel ? { x: panel.position.x, y: panel.position.y, z: panel.position.z } : { x: 0, y: 0, z: 0 };
        this.panelTransform = panel?.isValid ? panel.getComponent(UITransform) : null;
        this.textTransform = label?.isValid ? label.node.getComponent(UITransform) : null;
        this.basePanelHeight = this.panelTransform?.contentSize.height || 0;
        this.baseTextHeight = this.textTransform?.contentSize.height || 0;
        this.opacity = panel?.isValid ? panel.getComponent(UIOpacity) || panel.addComponent(UIOpacity) : null;
        if (panel?.isValid) {
            panel.active = false;
        }
    }

    /**
     * 排队显示完整提示，当前或待播同文字去重；新提示可替换常驻提示，避免队列永久阻塞。
     * @param durationMs 总播放毫秒，默认4000；非正数保留常驻语义，非有限数使用默认值
     */
    public show(text: string, durationMs = 4000): void {
        if (this.disposed || !text?.trim()) {
            return;
        }
        if (!this.panel?.isValid || !this.label?.isValid) {
            GameLog.shared.classified("FRAMEWORK", "error", "ToastManager", text);
            return;
        }
        if (this.current?.text === text || this.pending.some(entry => entry.text === text)) {
            return;
        }
        const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs / 1000) : 4;
        const entry = { text, duration };
        if (!this.current || this.current.duration === 0) {
            this.begin(entry);
            return;
        }
        if (this.pending.length >= ToastManager.maxEntries - 1) {
            this.pending.shift();
        }
        this.pending.push(entry);
    }

    /** 按应用帧的秒数推进当前和后续提示；非法时间忽略，宿主销毁后停止并清空队列。 */
    public update(dt: number): void {
        if (this.disposed || !Number.isFinite(dt) || dt < 0 || !this.current) {
            return;
        }
        if (!this.panel?.isValid || !this.label?.isValid) {
            this.dispose();
            return;
        }
        let remaining = dt;
        while (this.current) {
            if (this.current.duration === 0) {
                // 常驻项可能在前一条播放时入队；其后已有更新结果时同样允许替换，不能堵住队列。
                const next = this.pending.shift();
                if (next) {
                    this.begin(next);
                    continue;
                }
                this.elapsed += remaining;
                this.paint();
                return;
            }
            const available = this.current.duration - this.elapsed;
            if (remaining < available) {
                this.elapsed += remaining;
                this.paint();
                return;
            }
            remaining -= available;
            const next = this.pending.shift();
            if (!next) {
                this.current = null;
                this.hide();
                return;
            }
            this.begin(next);
        }
    }

    /** 换号时清空旧角色当前和待播提示、复原场景布局；仍允许下一角色继续show。 */
    public clear(): void {
        if (this.disposed) {
            return;
        }
        this.pending.length = 0;
        this.current = null;
        this.elapsed = 0;
        this.hide();
        if (this.label?.isValid) {
            this.label.string = "";
        }
        if (this.textTransform?.isValid) {
            this.textTransform.setContentSize(this.textTransform.contentSize.width, this.baseTextHeight);
        }
        if (this.panelTransform?.isValid) {
            this.panelTransform.setContentSize(this.panelTransform.contentSize.width, this.basePanelHeight);
        }
    }

    /** 应用结束时彻底清理并终止；重复调用安全，迟到消息不能重新显示。 */
    public dispose(): void {
        this.clear();
        this.disposed = true;
    }

    /** 开始一条提示，复用原Label并让引擎按场景宽度计算完整文字高度。 */
    private begin(entry: ToastEntry): void {
        this.current = entry;
        this.elapsed = 0;
        this.label!.string = entry.text;
        this.label!.enableWrapText = true;
        this.label!.overflow = Overflow.RESIZE_HEIGHT;
        this.panel!.active = true;
        this.label!.updateRenderData(true);
        if (this.panelTransform && this.textTransform) {
            const padding = Math.max(0, this.basePanelHeight - this.baseTextHeight);
            this.panelTransform.setContentSize(this.panelTransform.contentSize.width,
                Math.max(this.basePanelHeight, this.textTransform.contentSize.height + padding));
        }
        this.paint();
    }

    /** 只改变唯一面板的透明度和局部Y，淡入后保持可读，退场时继续上浮。 */
    private paint(): void {
        if (!this.current || !this.panel?.isValid || !this.opacity?.isValid) {
            return;
        }
        const duration = this.current.duration;
        const fadeIn = duration > 0 ? Math.min(ToastManager.fadeInSeconds, duration / 3) : ToastManager.fadeInSeconds;
        const fadeOut = duration > 0 ? Math.min(ToastManager.fadeOutSeconds, duration / 3) : 0;
        const entering = Math.min(1, this.elapsed / fadeIn);
        const leaving = duration > 0 ? Math.min(1, Math.max(0, (this.elapsed - duration + fadeOut) / fadeOut)) : 0;
        this.opacity.opacity = Math.round(255 * entering * (1 - leaving));
        const travel = 0.25 * entering + 0.75 * leaving;
        this.panel.setPosition(this.origin.x, this.origin.y + ToastManager.floatDistance * travel, this.origin.z);
    }

    /** 隐藏并复原唯一节点，不销毁场景拥有的宿主，也不创建替代面板。 */
    private hide(): void {
        if (this.panel?.isValid) {
            this.panel.active = false;
            this.panel.setPosition(this.origin.x, this.origin.y, this.origin.z);
        }
        if (this.opacity?.isValid) {
            this.opacity.opacity = 255;
        }
    }
}
