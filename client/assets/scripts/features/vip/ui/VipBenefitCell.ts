/**
 * VIP 权益窗的滚动格子，显示一条带配置高亮的权益。
 * 分隔线由最后一条解锁权益承载，位置、颜色和图标由预制体保存。
 */
import { _decorator, Component, Node, RichText } from "cc";

const { ccclass, property } = _decorator;

/** 一项权益的显示数据，不等于运行时权益已经接通。 */
export interface VipBenefitDisplay {
    /** 允许的颜色标签已由页面转换为 Cocos RichText。 */
    readonly text: string;
    /** 下一行开始数值加成区时，在本行下沿显示金色分隔线。 */
    readonly groupSeparator: boolean;
}

@ccclass("VipBenefitCell")
export class VipBenefitCell extends Component {
    /** 权益内容，正文颜色和换行宽度由预制体控制。 */
    @property(RichText) private text: RichText | null = null;
    /** 解锁组的尾部分隔线，复用时按当前行重新决定显隐。 */
    @property(Node) private groupSeparator: Node | null = null;

    /** 更新当前权益文案与分组标记。 */
    public render(value: VipBenefitDisplay): void {
        this.text!.string = value.text;
        this.groupSeparator!.active = value.groupSeparator;
    }
}
