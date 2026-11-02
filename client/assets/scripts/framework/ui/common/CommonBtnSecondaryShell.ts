import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * CommonBtnSecondary 的节点引用。
 * 不注册点击，不读协议。
 */
@ccclass("CommonBtnSecondaryShell")
export class CommonBtnSecondaryShell extends Component {
  @property(Node)
  label: Node | null = null;
}
