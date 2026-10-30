import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * CommonBtnPrimary 的节点引用。
 * 不注册点击，不读协议。
 */
@ccclass("CommonBtnPrimaryShell")
export class CommonBtnPrimaryShell extends Component {
  @property(Node)
  label: Node | null = null;
}
