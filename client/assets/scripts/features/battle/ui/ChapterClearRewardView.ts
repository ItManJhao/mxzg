/** 独立通关奖励窗口：沿旧目录与服务器资格展示，由主线作为子窗打开，资产变更交应用。 */
import { _decorator, Button, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterClearRewardUtils } from "../utils/ChapterClearRewardUtils";
import type { ChapterClearRewardConfig, ChapterClearRewardItem, ChapterClearRewardRow } from "../utils/ChapterClearRewardUtils";
import { ChapterClearRewardCell } from "./ChapterClearRewardCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "chapter-clear-reward",
    prefab: "bundles/module/battle/prefabs/ChapterClearRewardView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ChapterClearRewardView")
export class ChapterClearRewardView extends BaseView {
    /** 旧面板静态尺寸，整体匹配竖屏可见区域。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 关闭当前窗口，不取消已发起领奖。 */
    @property(Button) closeButton: Button | null = null;
    /** 纵向虚拟列表，托管原目录的可视行。 */
    @property(SuperScroll) chapters: SuperScroll | null = null;
    /** 登录后共享配置的本次显示投影；关闭后释放。 */
    private config: readonly ChapterClearRewardConfig[] = [];
    /** 当前窗口正在等回包的关卡，关闭后撤销本页的按钮状态。 */
    private intent: { chapter: number } | null = null;

    /** 挂载静态窗口，并从当前唯一主线状态生成旧列表。 */
    public onOpen(): void {
        if (!this.panel || !this.closeButton || !this.chapters) {
            throw new Error("ChapterClearRewardView.prefab 缺少面板或列表绑定");
        }
        this.config = ChapterClearRewardUtils.config(GameConfig.instance.getFileByPath("config/firstrewardchapter"));
        this.chapters.validateBindings();
        const content = this.chapters.list.node;
        content.on(SuperContent.RENDER_ITEM, this.paint, this);
        content.on(ChapterClearRewardCell.ACTION, this.perform, this);
        content.on(ChapterClearRewardCell.ITEM, this.inspect, this);
        const close = this.closeButton.node;
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.paint, this);
                content.off(ChapterClearRewardCell.ACTION, this.perform, this);
                content.off(ChapterClearRewardCell.ITEM, this.inspect, this);
            }
        });
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.render();
        this.chapters.toStart();
    }

    /** 关闭清空列表和按钮状态，已经发出的请求由应用接收。 */
    public onClose(): void {
        this.intent = null;
        this.config = [];
        if (this.chapters?.isValid && this.chapters.content?.isValid) {
            this.chapters.list.clear();
        }
    }

    /** 纸面最多铺满竖屏宽度，短屏维持高度上限；内部几何由预制体维护。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height * 0.84 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 用服务器资格和当前按钮状态刷新可视行，保留纵向滚动位。 */
    private render(): void {
        const model = MainChapterModel.instance;
        this.chapters!.list.setData(ChapterClearRewardUtils.rows(this.config, model.state, this.intent?.chapter));
    }

    /** 配置行与复用节点绑定，不创建另一份目录或主动请求状态。 */
    private paint(node: Node, row: ChapterClearRewardRow): void {
        const cell = node.getComponent(ChapterClearRewardCell);
        if (!cell) {
            throw new Error("通关奖励列表缺少关卡行组件");
        }
        cell.bind(row);
    }

    /** 前往战斗回到父页，领取点击按绝对关卡交给主线控制器。 */
    private perform(row: ChapterClearRewardRow): void {
        if (this.intent || !this.config.length || !row.enabled) {
            return;
        }
        if (row.status === "battle") {
            this.close();
            return;
        }
        const intent = { chapter: row.chapter };
        this.intent = intent;
        this.render();
        const finish = (): void => {
            if (this.intent === intent) {
                this.intent = null;
                this.render();
            }
        };
        void MainChapterController.instance.claimFirstReward(row.chapter).then(finish, finish);
    }

    /** 物品格只读详情属于当前窗口，关父窗自动清理子窗。 */
    private inspect(item: ChapterClearRewardItem): void {
        if (this.config.length) {
            void UIManager.instance.openChild(this, BagInfoView, {
                source: "description",
                face: BagItemCatalog.face(item.itemId, item.quantity),
            }).catch(() => { /* UIManager 统一处理准备失败和取消。 */ });
        }
    }
}
