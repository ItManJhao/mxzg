/** 通用列表滚动宿主：沿用原生拖动、惯性和点击取消，完整重排保位，滚动时只通知虚拟范围换绑。 */
import { _decorator, Mask, ScrollView, UITransform, Vec2, Widget } from "cc";
import { EDITOR, PREVIEW } from "cc/env";
import { SuperAxis, SuperContent } from "./SuperContent";

const { ccclass, property } = _decorator;

/** 沿用原生手势、惯性、回弹和点击取消，只协调方向与列表完整重排。 */
@ccclass("SuperScroll")
export class SuperScroll extends ScrollView {
    /** 横向滚动由SuperContent布局方向决定，不维护另一份Inspector配置。 */
    @property({ override: true, visible: false }) horizontal = false;
    /** 纵向滚动与横向互斥，由列表方向同步。 */
    @property({ override: true, visible: false }) vertical = true;
    /** 拖动必须取消格子点击，防止滚动结束误选；始终保持启用。 */
    @property({ override: true, visible: false }) cancelInnerEvents = true;

    /** 完整重排开始前保存的左上起算偏移，重排结束后恢复并钳制到新范围。 */
    private saved = new Vec2();

    /** 取得唯一内容组件；绑定不完整时拒绝继续布局，交由开页边界处理。 */
    get list(): SuperContent {
        if (!this.content) {
            throw this.error("Content 未绑定，请拖入 view/content");
        }
        const list = this.content.getComponent(SuperContent);
        if (!list) {
            throw this.error("Content [" + this.content.name + "] 缺少 SuperContent");
        }
        return list;
    }

    /** 校验Prefab的滚动层级、裁剪及冲突Widget，不在运行时组装另一套列表。 */
    validateBindings(): void {
        const list = this.list;
        if (!this.content?.parent || this.content.parent.parent !== this.node) {
            throw this.error("需要 Scroll → view → content 层级");
        }
        const port = this.content.parent;
        if (!port.getComponent(UITransform)) {
            throw this.error("view 缺少 UITransform");
        }
        if (!port.getComponent(Mask)?.enabled) {
            throw this.error("view 缺少启用的 Mask");
        }
        if (this.node.getComponent(Mask)) {
            throw this.error("Mask 应保存在 view，不能放在 Scroll 根节点");
        }
        if (this.content.getComponent(Widget)?.enabled) {
            throw this.error("Content Widget 与滚动位置冲突");
        }
        list.validateBindings();
    }

    /** 运行时校验绑定并订阅完整重排通知；编辑器继续使用原生样板。 */
    onEnable(): void {
        if (!EDITOR || PREVIEW) {
            this.validateBindings();
            this.syncAxis();
            this.content!.on(SuperContent.BEFORE_LAYOUT, this.beforeLayout, this);
            this.content!.on(SuperContent.AFTER_LAYOUT, this.afterLayout, this);
        }
        super.onEnable();
    }

    /** 停用时解除本组件的重排监听，再交原生ScrollView清理输入。 */
    onDisable(): void {
        this.content?.off(SuperContent.BEFORE_LAYOUT, this.beforeLayout, this);
        this.content?.off(SuperContent.AFTER_LAYOUT, this.afterLayout, this);
        super.onDisable();
    }

    /** 返回距内容左上角的正向距离；原生getScrollOffset的横向值需取反。 */
    readPosition(): Vec2 {
        const raw = this.getScrollOffset();
        return new Vec2(raw.x === 0 ? 0 : -raw.x, raw.y);
    }

    /** 将逻辑滚动位置限制到当前content尺寸，并同步虚拟范围，零时长跳转也立即生效。 */
    restorePosition(position: Readonly<Vec2>): void {
        this.syncAxis();
        const max = this.getMaxScrollOffset();
        this.stopAutoScroll();
        this.scrollToOffset(new Vec2(
            this.horizontal ? Math.max(0, Math.min(max.x, position.x)) : 0,
            this.vertical ? Math.max(0, Math.min(max.y, position.y)) : 0,
        ), 0);
        this.list.refreshVisible();
    }

    /** 切分类等明确需要归零的操作回到起点；普通数据刷新不调用它。 */
    toStart(): void {
        this.restorePosition(Vec2.ZERO);
    }

    /** 数据或几何完整重排前保存位置并停止惯性，普通滚动换绑不经过这里。 */
    private beforeLayout = (): void => {
        this.saved = this.readPosition();
        this.stopAutoScroll();
    };

    /** 完整重排后恢复合法位置，避免content尺寸变化把原位置遗留在范围外。 */
    private afterLayout = (): void => {
        this.restorePosition(this.saved);
    };

    /** 从内容布局同步唯一滚动方向，确保拖动仍取消格子按压。 */
    private syncAxis(): void {
        this.horizontal = this.list.scrollAxis === SuperAxis.Horizontal;
        this.vertical = !this.horizontal;
        this.cancelInnerEvents = true;
    }

    /** 附带实际节点路径返回绑定错误，便于人工定位Prefab。 */
    private error(field: string): Error {
        return new Error("SuperScroll [" + this.node.getPathInHierarchy() + "]: " + field);
    }
}
