/** 好友支援卡片，复用英雄头像格的品质、星级、等级和元素。由窗口绑定数据及当前操作。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { HeroIconCellView } from "../../hero/ui/HeroIconCellView";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";

const { ccclass, property } = _decorator;

/** 共用选中卡和候选行；战力为空时明确隐藏数值，不把未同步当成零。 */
export interface DreamlandSupportRow {
    readonly templateId: number;
    readonly level: number;
    readonly star: number;
    readonly power: number | null;
    readonly friendName?: string;
    readonly state?: "selected" | "over-limit";
    readonly button?: string;
    readonly action?: () => void;
}

@ccclass("DreamlandSupportCell")
export class DreamlandSupportCell extends Component {
    /** 通用头像预制体根，显示英雄外观和属性，无头像点击操作。 */
    @property(Node) private portrait: Node | null = null;
    /** 英雄名称。 */
    @property(Label) private title: Label | null = null;
    /** 来自名册或派遣快照的单体战力。 */
    @property(Label) private detail: Label | null = null;
    /** 有战力值时显示在数字左侧。 */
    @property(Node) private powerIcon: Node | null = null;
    /** 好友助战显示所属好友；己方派遣行隐藏。 */
    @property(Label) private owner: Label | null = null;
    /** 原版绿色已选提示。 */
    @property(Label) private stateLabel: Label | null = null;
    /** 战力超限使用旧版红字图，和选择按钮占用同一区域。 */
    @property(Node) private limitBadge: Node | null = null;
    /** 候选行选择或在上方卡片撤下当前助战。 */
    @property(Button) private actionButton: Button | null = null;
    /** 与当前按钮操作同步的文案。 */
    @property(Label) private actionLabel: Label | null = null;
    /** 虚拟列表重绑时先替换当前点击回调；没有可执行操作时为空。 */
    private action: (() => void) | null = null;

    /** 每个实例只注册一次点击，虚拟行复用时由 paint 更换当前操作。 */
    protected onLoad(): void {
        this.validateBindings();
        this.actionButton!.node.on(Button.EventType.CLICK, this.onAction, this);
    }

    /** 销毁行时释放操作；嵌套按钮若已先销毁，其节点已经解除监听。 */
    protected onDestroy(): void {
        this.action = null;
        const buttonNode = this.actionButton?.node;
        if (buttonNode?.isValid) {
            buttonNode.off(Button.EventType.CLICK, this.onAction, this);
        }
    }

    /** 按原名册样式绘制英雄，并为当前行显示一个操作或状态。 */
    public paint(row: DreamlandSupportRow): void {
        const face = HeroCatalog.find(row.templateId);
        const name = face?.name ?? `英雄 ${row.templateId}`;
        const portrait = this.portrait!.getComponent(HeroIconCellView)!;
        portrait.show({
            kind: "catalog", name, showName: false, face: face?.icon ?? null, elem: face?.elem ?? null,
            level: row.level, stars: row.star, locked: false, deployed: false,
        });
        portrait.button!.enabled = false;
        this.title!.string = name;
        this.detail!.string = row.power === null ? "" : String(row.power);
        this.powerIcon!.active = row.power !== null;
        this.owner!.node.active = !!row.friendName;
        this.owner!.string = row.friendName ? `来自好友：${row.friendName}` : "";
        this.stateLabel!.node.active = row.state === "selected";
        this.limitBadge!.active = row.state === "over-limit";
        this.action = row.action ?? null;
        this.actionButton!.node.active = !!row.button;
        this.actionButton!.interactable = this.action !== null;
        this.actionLabel!.string = row.button ?? "";
    }

    /** 校验两个 prefab 的嵌套头像及卡片所需绑定。 */
    private validateBindings(): void {
        if (!this.portrait?.getComponent(HeroIconCellView) || !this.title || !this.detail || !this.powerIcon
            || !this.owner || !this.stateLabel || !this.limitBadge || !this.actionButton || !this.actionLabel) {
            throw new Error("梦境好友支援卡片预制体绑定不完整");
        }
    }

    /** 只提交行当前可用的操作，回收和禁用的按钮没有业务副作用。 */
    private onAction(): void {
        if (this.actionButton!.interactable && this.node.activeInHierarchy) {
            this.action?.();
        }
    }
}
