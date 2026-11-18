/**
 * 界面分层及同一宿主内的绘制顺序，枚举从底到顶排列。
 * Page 进页面栈。其他层通过 hostId 挂到应用登记的宿主，独立宿主之间按场景节点顺序绘制。
 */
export enum UILayer {
    /** 主界面与功能页，交给应用页面栈。 */
    Page = "page",
    /** 页面内战场，沿用当前战斗宿主。 */
    Battle = "battle",
    /** 页面之上的常驻状态界面。 */
    Hud = "hud",
    /** 普通功能弹窗和详情。 */
    Popup = "popup",
    /** 应位于普通弹窗之上的确认与选择窗口。 */
    Dialog = "dialog",
    /** 新手引导与操作提示，覆盖业务窗口，交互由引导界面定义。 */
    Guide = "guide",
    /** 需要压在业务对话框上方的系统提示。 */
    System = "system",
    /** 短时提示，位于同宿主最上方。 */
    Toast = "toast",
}

/** UIManager 按该顺序将同宿主的新实例或重开实例放到本层顶部。 */
export const UI_LAYER_ORDER: readonly UILayer[] = Object.freeze(Object.values(UILayer));

/** 可选用共享模态和父页开关归属的窗口层。 */
export const UI_WINDOW_LAYERS: ReadonlySet<UILayer> = new Set([UILayer.Popup, UILayer.Dialog, UILayer.Guide, UILayer.System]);
