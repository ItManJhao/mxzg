/** 页面栈 / 弹窗队列用的最小视图。节点适配在 UIShell。 */
export interface StackView {
  setVisible(visible: boolean): void;
  dispose(): void;
}
