/**
 * 主城常驻聊天按钮的拖动手势，由 CityChromeView 随显示期绑定。
 * 初始位置、尺寸和图层由预制体维护；拖动位置只保存在当前主城，不写账号数据。
 */
import { Button, EventTouch, Node, UITransform, Vec3 } from "cc";

/** 一次从按钮开始的手势，起点和按钮位置都在视口根节点本地坐标系中。 */
interface ChatGesture {
    /** 引擎触点 ID，其他手指不能接管当前拖动。 */
    readonly id: number;
    /** 按下位置，供距离阈值和拖动偏移计算使用。 */
    readonly start: Vec3;
    /** 按下时按钮的位置，保留手指与按钮中心的偏移。 */
    readonly origin: Vec3;
    /** 越过移动阈值后一直为 true，直到松手或取消。 */
    moved: boolean;
}

export class CityChatDrag {
    /** 以视口逻辑像素计的点击容差，避免手指微抖误拖。 */
    private static readonly moveThreshold = 8;

    /** 当前触点手势；松手、取消或视口变化时清空。 */
    private gesture: ChatGesture | null = null;

    /** 最近拖到的视口本地位置；首次拖动前为 null，保留预制体默认摆放。 */
    private draggedPosition: Vec3 | null = null;

    /**
     * 使用现有 UI 节点接入手势，不改变层级或创建控件。
     * @param viewport 主城常驻层的全屏根变换，随实际可见区更新。
     * @param dock 聊天按钮的直接父层，在预制体中绑定缩放和贴底约束。
     * @param button 聊天图标本身的按钮组件。
     * @param icon 当前按钮的尺寸与锚点，决定拖动边界。
     * @param onTap 只有本按钮上的短触碰才触发的操作。
     */
    public constructor(
        private readonly viewport: UITransform,
        private readonly dock: UITransform,
        private readonly button: Button,
        private readonly icon: UITransform,
        private readonly onTap: () => void,
    ) {}

    /** 只监听从按钮开始的触摸；返回主城退出时使用的清理句柄。 */
    public bind(): () => void {
        const node = this.button.node;
        const viewportNode = this.viewport.node;
        const dockNode = this.dock.node;
        const initial = node.position;
        const initialPosition = new Vec3(initial.x, initial.y, initial.z);
        node.on(Node.EventType.TOUCH_START, this.onStart, this);
        node.on(Node.EventType.TOUCH_MOVE, this.onMove, this);
        node.on(Node.EventType.TOUCH_END, this.onEnd, this);
        node.on(Node.EventType.TOUCH_CANCEL, this.onCancel, this);
        viewportNode.on(Node.EventType.SIZE_CHANGED, this.onViewportChanged, this);
        dockNode.on(Node.EventType.TRANSFORM_CHANGED, this.place, this);
        return () => {
            this.gesture = null;
            if (viewportNode.isValid) {
                viewportNode.off(Node.EventType.SIZE_CHANGED, this.onViewportChanged, this);
            }
            if (dockNode.isValid) {
                dockNode.off(Node.EventType.TRANSFORM_CHANGED, this.place, this);
            }
            if (node.isValid) {
                node.off(Node.EventType.TOUCH_START, this.onStart, this);
                node.off(Node.EventType.TOUCH_MOVE, this.onMove, this);
                node.off(Node.EventType.TOUCH_END, this.onEnd, this);
                node.off(Node.EventType.TOUCH_CANCEL, this.onCancel, this);
                if (this.draggedPosition) {
                    node.setPosition(initialPosition.x, initialPosition.y, initialPosition.z);
                }
            }
            this.draggedPosition = null;
        };
    }

    /** 接管最先从聊天按钮按下的触点，记录实际手指位置与当前按钮位置。 */
    private onStart(event: EventTouch): void {
        const id = event.getID();
        if (id === null || this.gesture || !this.button.interactable || !this.button.enabled) {
            return;
        }
        const world = this.dock.convertToWorldSpaceAR(this.button.node.position);
        this.gesture = {
            id,
            start: this.pointer(event),
            origin: this.viewport.convertToNodeSpaceAR(world),
            moved: false,
        };
    }

    /** 越过容差后跟随原触点，同时把完整图标限制在可见区内。 */
    private onMove(event: EventTouch): void {
        const gesture = this.gesture;
        if (!gesture || gesture.id !== event.getID()) {
            return;
        }
        const current = this.pointer(event);
        const dx = current.x - gesture.start.x;
        const dy = current.y - gesture.start.y;
        if (!gesture.moved && Math.hypot(dx, dy) < CityChatDrag.moveThreshold) {
            return;
        }
        gesture.moved = true;
        this.draggedPosition = this.clamp(new Vec3(gesture.origin.x + dx, gesture.origin.y + dy, gesture.origin.z));
        this.place();
    }

    /** 处理最后一个触点位置；拖动后停留原地，短按才执行操作。 */
    private onEnd(event: EventTouch): void {
        const gesture = this.gesture;
        if (!gesture || gesture.id !== event.getID()) {
            return;
        }
        this.onMove(event);
        this.gesture = null;
        if (!gesture.moved && this.button.enabled && this.button.interactable) {
            this.onTap();
        }
    }

    /** 取消时不触发点击，保留已经拖到的位置。 */
    private onCancel(event: EventTouch): void {
        if (this.gesture?.id === event.getID()) {
            this.gesture = null;
        }
    }

    /** 视口几何改变时结束旧手势，并在新边界内保留上一次拖放位置。 */
    private onViewportChanged(): void {
        this.gesture = null;
        this.place();
    }

    /** 将引擎触点换算到视口本地坐标，保证窄屏和缩放父层不改变拖动位移。 */
    private pointer(event: EventTouch): Vec3 {
        const point = event.getUILocation();
        return this.viewport.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0));
    }

    /** 适配父层 Widget / ViewportScale 后重新投影；未拖过按钮不接管预制坐标。 */
    private place(): void {
        if (!this.draggedPosition || !this.button.node.isValid) {
            return;
        }
        const world = this.viewport.convertToWorldSpaceAR(this.clamp(this.draggedPosition));
        const local = this.dock.convertToNodeSpaceAR(world);
        this.button.node.setPosition(local.x, local.y, local.z);
    }

    /** 用实际图标大小与锚点夹紧四边；极小视口下优先保留中心。 */
    private clamp(position: Vec3): Vec3 {
        const icon = this.icon;
        const width = icon.width * Math.abs(this.dock.node.scale.x * icon.node.scale.x);
        const height = icon.height * Math.abs(this.dock.node.scale.y * icon.node.scale.y);
        const left = -this.viewport.width * this.viewport.anchorX + width * icon.anchorX;
        const bottom = -this.viewport.height * this.viewport.anchorY + height * icon.anchorY;
        const right = left + this.viewport.width - width;
        const top = bottom + this.viewport.height - height;
        const axis = (value: number, min: number, max: number) => min <= max
            ? Math.max(min, Math.min(value, max)) : (min + max) / 2;
        return new Vec3(axis(position.x, left, right), axis(position.y, bottom, top), position.z);
    }
}
