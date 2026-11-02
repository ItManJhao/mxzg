import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * CommonPanel 的节点引用。
 * 只有节点引用。不加载界面，不发消息。
 */
@ccclass("CommonPanelShell")
export class CommonPanelShell extends Component {
  @property(Node)
  frame: Node | null = null;

  @property(Node)
  titleBar: Node | null = null;

  @property(Node)
  title: Node | null = null;

  @property(Node)
  btnClose: Node | null = null;

  @property(Node)
  content: Node | null = null;
}
