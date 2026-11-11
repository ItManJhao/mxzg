/**
 * 现有战斗演出、飘字和主城动态挂点使用的节点与显示辅助。
 * 这里只保留实际使用的构造方法；页面静态结构、布局和控件优先在 Prefab 中维护。
 */
import {
  Button,
  Color,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Layers,
  Node,
  Overflow,
  UITransform,
  VerticalTextAlignment,
} from "cc";

/** 为动态演出创建UI层节点；调用方负责挂载和销毁。 */
export function uiNode(name: string): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  return node;
}

/** 将动态节点挂到指定父节点，并设置父级局部坐标。 */
export function place(node: Node, parent: Node, x: number, y: number): Node {
  node.setPosition(x, y, 0);
  node.parent = parent;
  return node;
}

/** 更新已有Label文字；节点没有Label时不修改其他组件。 */
export function setText(node: Node, text: string): void {
  const label = node.getComponent(Label);
  if (label) label.string = text;
}

/** 创建系统字体Label，供飘字等动态内容使用；调用方负责生命周期。 */
export function createLabel(
  text: string,
  fontSize: number,
  options?: { color?: Color; width?: number; height?: number; align?: "center" | "left" }
): Node {
  const width = options?.width ?? 680;
  const height = options?.height ?? fontSize + 16;
  const node = uiNode("Label");
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = fontSize + 8;
  label.useSystemFont = true;
  label.fontFamily = "sans-serif";
  label.overflow = Overflow.CLAMP;
  label.horizontalAlign = options?.align === "left" ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
  label.verticalAlign = options?.height ? VerticalTextAlignment.TOP : VerticalTextAlignment.CENTER;
  label.color = options?.color ?? new Color(240, 240, 240, 255);
  return node;
}

/** 创建纯色Graphics矩形，供现有动态遮罩和演出底板使用。 */
export function createRect(name: string, width: number, height: number, color: Color): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const g = node.addComponent(Graphics);
  g.fillColor = color;
  g.rect(-width / 2, -height / 2, width, height);
  g.fill();
  return node;
}

/** 按已有节点尺寸重绘Graphics颜色；缺少绘制或尺寸组件时跳过。 */
export function paintRect(node: Node, color: Color): void {
  const g = node.getComponent(Graphics);
  const ui = node.getComponent(UITransform);
  if (!g || !ui) return;
  const size = ui.contentSize;
  const width = size && typeof size.width === "number" ? size.width : 0;
  const height = size && typeof size.height === "number" ? size.height : 0;
  if (typeof g.clear === "function") g.clear();
  g.fillColor = color;
  g.rect(-width / 2, -height / 2, width, height);
  g.fill();
}

/** 为现有演出回退入口创建按钮并绑定点击；节点销毁时结束监听。 */
export function createButton(
  text: string,
  onClick: () => void,
  width = 300,
  height = 56,
  fill?: Color,
  fontSize = 24
): Node {
  const root = uiNode("Btn");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(width, height);

  const bg = createRect("bg", width, height, fill ?? new Color(46, 110, 190, 255));
  bg.parent = root;

  const label = createLabel(text, fontSize, { width: width - 12, color: new Color(255, 255, 255, 255) });
  label.parent = root;

  const button = root.addComponent(Button);
  button.transition = Button.Transition.SCALE;
  button.zoomScale = 0.96;
  root.on(Button.EventType.CLICK, onClick);
  return root;
}
