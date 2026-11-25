/** 旧通关奖励可复用行：显示原关卡进度、预览格及领取/前往/已领按钮。 */
import { _decorator, Button, Color, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { ChapterClearRewardUtils } from "../utils/ChapterClearRewardUtils";
import type { ChapterClearRewardItem, ChapterClearRewardRow } from "../utils/ChapterClearRewardUtils";

const { ccclass, property } = _decorator;

@ccclass("ChapterClearRewardCell")
export class ChapterClearRewardCell extends Component {
    /** 行操作通知仅向所属通关奖励列表发出。 */
    public static readonly ACTION = "chapter-clear-reward-action";
    /** 奖励物品选择通知，由所属窗口负责只读详情。 */
    public static readonly ITEM = "chapter-clear-reward-item";

    /** 旧关卡和当前绝对进度。 */
    @property(Label) title: Label | null = null;
    /** 奖励预览列表，复用共用背包格而不持有库存。 */
    @property(SuperScroll) rewards: SuperScroll | null = null;
    /** 旧行内前往/领取按钮。 */
    @property(Button) action: Button | null = null;
    /** 原操作文字。 */
    @property(Label) actionLabel: Label | null = null;
    /** 旧前往战斗使用绿色按钮。 */
    @property(SpriteFrame) battleButtonFrame: SpriteFrame | null = null;
    /** 旧领取使用橙色按钮。 */
    @property(SpriteFrame) claimButtonFrame: SpriteFrame | null = null;
    /** 已领取或未开放时用灰色静态钮。 */
    @property(SpriteFrame) disabledButtonFrame: SpriteFrame | null = null;
    /** 当前复用行的绝对关卡及动作，未绑定或销毁后无数据。 */
    private row: ChapterClearRewardRow | null = null;
    /** 内层列表监听归属；离开虚拟视口或销毁时解除。 */
    private content: Node | null = null;

    /** 校验预制体绑定后刷新当前行，标题保留旧版原进度及分隔符。 */
    public bind(row: ChapterClearRewardRow): void {
        if (!this.title || !this.rewards || !this.action || !this.actionLabel || !this.battleButtonFrame
            || !this.claimButtonFrame || !this.disabledButtonFrame || !this.action.node.getComponent(Sprite)) {
            throw new Error("ChapterClearRewardCell.prefab 缺少行内容或动作绑定");
        }
        this.row = row;
        this.title.string = `通关${row.chapter}关 (${row.progress ?? "—"} / ${row.chapter})`;
        this.actionLabel.string = row.actionText;
        this.action.interactable = row.enabled;
        this.action.node.getComponent(Sprite)!.spriteFrame = !row.enabled ? this.disabledButtonFrame
            : row.status === "battle" ? this.battleButtonFrame : this.claimButtonFrame;
        this.actionLabel.color = row.enabled ? new Color(255, 255, 255) : new Color(101, 81, 64);
        this.renderItems();
    }

    /** 行从虚拟池激活时重接一次按钮和内层列表。 */
    protected onEnable(): void {
        this.action?.node.on(Button.EventType.CLICK, this.perform, this);
        if (!this.content && this.row) {
            this.renderItems();
        }
    }

    /** 退出虚拟窗口时解绑存活节点；销毁期间内层列表自行回收。 */
    protected onDisable(): void {
        const actionNode = this.action?.node;
        if (actionNode?.isValid) {
            actionNode.off(Button.EventType.CLICK, this.perform, this);
        }
        this.disconnect();
        if (this.rewards?.node?.isValid && this.rewards.content?.isValid) {
            this.rewards.list.clear();
        }
    }

    /** 子节点销毁顺序不固定，重复安全地解除监听并清空行归属。 */
    protected onDestroy(): void {
        this.disconnect();
        this.row = null;
    }

    /** 内层预览同样由SuperContent管理，不手工实例化奖励格。 */
    private renderItems(): void {
        const list = this.rewards!.list;
        if (!this.content) {
            this.content = list.node;
            list.node.on(SuperContent.RENDER_ITEM, this.renderItem, this);
            list.node.on(SuperContent.SELECT_ITEM, this.inspect, this);
        }
        list.setData(this.row!.items);
        this.rewards!.toStart();
    }

    /** 按原配置绘制装备金星和奖励数量，碎片继续使用共用外观。 */
    private renderItem(node: Node, item: ChapterClearRewardItem): void {
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("通关奖励缺少共用物品格");
        }
        const face = BagItemCatalog.face(item.itemId, item.quantity);
        const equipmentStars = ChapterClearRewardUtils.equipmentStars(item.itemId);
        cell.show(item, false, face, true, false, false, equipmentStars);
    }

    /** 只把当前可用动作送给所属列表，不持有窗口或请求回调。 */
    private perform(): void {
        if (this.row?.enabled && this.node.activeInHierarchy) {
            this.node.parent?.emit(ChapterClearRewardCell.ACTION, this.row);
        }
    }

    /** 物品详情仍可从领取前后的列表行查看。 */
    private inspect(item: ChapterClearRewardItem): void {
        if (this.content && this.node.activeInHierarchy) {
            this.node.parent?.emit(ChapterClearRewardCell.ITEM, item);
        }
    }

    /** 解绑本行拥有的内层监听，不触及其他复用格。 */
    private disconnect(): void {
        if (this.content?.isValid) {
            this.content.off(SuperContent.RENDER_ITEM, this.renderItem, this);
            this.content.off(SuperContent.SELECT_ITEM, this.inspect, this);
        }
        this.content = null;
    }
}
