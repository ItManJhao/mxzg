import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * CommonRedDot 的挂点。
 * 不计数、不按邮件或活动显隐。调用方自己改节点 active。
 */
@ccclass("CommonRedDotShell")
export class CommonRedDotShell extends Component {
  @property(Node)
  dot: Node | null = null;
}
