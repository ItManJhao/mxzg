/**
 * 共享设计坐标常量：由可见区域计算和挂机站位读取，与 project.json 的 640×1280 保持一致。
 * 当前窗口尺寸及缩放由ViewportLayoutUtils读取引擎状态，静态界面布局由预制体维护。
 */
/** 项目设计宽度，单位为设计像素；不代表当前屏幕的可见宽度。 */
export const DESIGN_WIDTH = 640;
/** 项目设计高度，单位为设计像素；竖屏使用 Fit Height。 */
export const DESIGN_HEIGHT = 1280;
