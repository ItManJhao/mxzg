import { _decorator, Mask, ScrollView, UITransform, Vec2, Widget } from "cc";
import { EDITOR, PREVIEW } from "cc/env";
import { SuperAxis, SuperContent } from "./SuperContent";

const { ccclass, property } = _decorator;

/** Native gestures, inertia, bounce and touch cancellation are inherited unchanged. */
@ccclass("SuperScroll")
export class SuperScroll extends ScrollView {
    @property({ override: true, visible: false }) horizontal = false;
    @property({ override: true, visible: false }) vertical = true;
    // Drag cancellation is mandatory for clickable list cells; it is not a second layout setting.
    @property({ override: true, visible: false }) cancelInnerEvents = true;

    private saved = new Vec2();

    get list(): SuperContent {
        if (!this.content) throw this.error("Content 未绑定，请拖入 view/content");
        const list = this.content.getComponent(SuperContent);
        if (!list) throw this.error("Content [" + this.content.name + "] 缺少 SuperContent");
        return list;
    }
    validateBindings(): void {
        const list = this.list;
        if (!this.content?.parent || this.content.parent.parent !== this.node) throw this.error("需要 Scroll → view → content 层级");
        const port = this.content.parent;
        if (!port.getComponent(UITransform)) throw this.error("view 缺少 UITransform");
        if (!port.getComponent(Mask)?.enabled) throw this.error("view 缺少启用的 Mask");
        if (this.node.getComponent(Mask)) throw this.error("Mask 应保存在 view，不能放在 Scroll 根节点");
        if (this.content.getComponent(Widget)?.enabled) throw this.error("Content Widget 与滚动位置冲突");
        list.validateBindings();
    }
    onEnable(): void {
        if (!EDITOR || PREVIEW) {
            this.validateBindings();
            this.syncAxis();
            this.content!.on(SuperContent.BEFORE_LAYOUT, this.beforeLayout, this);
            this.content!.on(SuperContent.AFTER_LAYOUT, this.afterLayout, this);
        }
        super.onEnable();
    }
    onDisable(): void {
        this.content?.off(SuperContent.BEFORE_LAYOUT, this.beforeLayout, this);
        this.content?.off(SuperContent.AFTER_LAYOUT, this.afterLayout, this);
        super.onDisable();
    }
    /** Positive distance from top-left. Native getScrollOffset uses a negative X. */
    readPosition(): Vec2 {
        const raw = this.getScrollOffset();
        return new Vec2(raw.x === 0 ? 0 : -raw.x, raw.y);
    }
    restorePosition(position: Readonly<Vec2>): void {
        this.syncAxis();
        const max = this.getMaxScrollOffset();
        this.stopAutoScroll();
        this.scrollToOffset(new Vec2(this.horizontal ? Math.max(0, Math.min(max.x, position.x)) : 0,
            this.vertical ? Math.max(0, Math.min(max.y, position.y)) : 0), 0);
    }
    toStart(): void { this.restorePosition(Vec2.ZERO); }
    private beforeLayout = (): void => { this.saved = this.readPosition(); this.stopAutoScroll(); };
    private afterLayout = (): void => { this.restorePosition(this.saved); };
    private syncAxis(): void {
        this.horizontal = this.list.scrollAxis === SuperAxis.Horizontal;
        this.vertical = !this.horizontal;
        this.cancelInnerEvents = true;
    }
    private error(field: string): Error { return new Error("SuperScroll [" + this.node.getPathInHierarchy() + "]: " + field); }
}
