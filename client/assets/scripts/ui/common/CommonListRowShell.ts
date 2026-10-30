import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * CommonListRow 的节点引用。
 * 不拉列表，不绑定具体功能。
 */
@ccclass("CommonListRowShell")
export class CommonListRowShell extends Component {
  @property(Node)
  icon: Node | null = null;

  @property(Node)
  title: Node | null = null;

  @property(Node)
  subtitle: Node | null = null;

  @property(Node)
  action: Node | null = null;
}
