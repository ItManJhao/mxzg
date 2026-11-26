/**
 * 勇者试炼助战的列表卡，使用固定的共用英雄头像与原版按钮区域。
 * 每次虚拟列表重绑只替换当前操作，不读取其他玩家数据。
 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { TrialViewUtils } from "../utils/TrialViewUtils";

const { ccclass, property } = _decorator;

/** 由分页窗口汇总的只读助战行，按钮不可用时 action 为空。 */
export interface TrialSupportRow {
    readonly templateId: number;
    readonly level: number;
    readonly star: number;
    readonly power: number | null;
    readonly roleName?: string;
    readonly status?: string;
    readonly exceedsLimit?: boolean;
    readonly button?: string;
    readonly action?: () => void;
}

@ccclass("TrialSupportCell")
export class TrialSupportCell extends Component {
    /** 静态嵌套的英雄头像，统一绘制等级、星级与元素。 */
    @property(Node) private portrait: Node | null = null;
    /** 当前助战英雄的配置名称。 */
    @property(Label) private title: Label | null = null;
    /** 服务端派遣镜像或自有面板的单英雄战力。 */
    @property(Label) private detail: Label | null = null;
    /** 战力已同步时才展示图标。 */
    @property(Node) private powerIcon: Node | null = null;
    /** 好友昵称，进入自有英雄页时隐藏。 */
    @property(Label) private owner: Label | null = null;
    /** 派遣完成或借用已入过队时显示的状态。 */
    @property(Label) private stateLabel: Label | null = null;
    /** 超出服务端给定的助战战力上限时显示原版标记。 */
    @property(Node) private limitBadge: Node | null = null;
    /** 选择、撤下或派遣英雄。 */
    @property(Button) private actionButton: Button | null = null;
    /** 当前合法行为在复用时由窗口传入。 */
    @property(Label) private actionLabel: Label | null = null;
    /** 回收时只保留最近一行的行为，销毁时清空。 */
    private action: (() => void) | undefined;
    /** 同一格只注册一次，节点销毁时解绑。 */
    private unlisten: (() => void) | null = null;

    /** 检查结构后安装一次卡片按钮。 */
    protected onLoad(): void {
        if (!this.portrait || !this.title || !this.detail || !this.powerIcon || !this.owner
            || !this.stateLabel || !this.limitBadge || !this.actionButton || !this.actionLabel) {
            throw new Error("勇者试炼助战卡绑定不完整");
        }
        this.unlisten = TrialViewUtils.listen(this.actionButton, () => this.action?.());
    }

    /** 旧行回调不会在卡片销毁后继续申请变更。 */
    protected onDestroy(): void {
        this.action = undefined;
        this.unlisten?.();
        this.unlisten = null;
    }

    /** 更新英雄及单个操作区域，暂无战力时不显示猜测值。 */
    public paint(row: TrialSupportRow): void {
        this.action = row.action;
        TrialViewUtils.hero(this.portrait!, row);
        this.title!.string = HeroCatalog.find(row.templateId)?.name ?? `英雄 ${row.templateId}`;
        this.detail!.string = row.power === null ? "" : String(row.power);
        this.powerIcon!.active = row.power !== null;
        this.owner!.node.active = !!row.roleName;
        this.owner!.string = row.roleName ? `来自好友 ${row.roleName}` : "";
        this.limitBadge!.active = !!row.exceedsLimit;
        this.stateLabel!.node.active = !!row.status;
        this.stateLabel!.string = row.status ?? "";
        this.actionButton!.node.active = !!row.button;
        this.actionButton!.interactable = !!row.action;
        this.actionLabel!.string = row.button ?? "";
    }
}
