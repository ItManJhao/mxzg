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
    /** 当前显示期本行操作，用于合并等待持久化时的连续点击。 */
    private intent: object | null = null;

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

    /** 关闭只清本页列表和回调，业务原关卡仍可从应用恢复。 */
    public onClose(): void {
        this.intent = null;
        this.config = [];
        if (this.chapters?.isValid && this.chapters.content?.isValid) {
            this.chapters.list.clear();
        }
    }

    /** 使用现有视口适配整体和长列表，不改预制体内部几何。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height * 0.84 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 用最新快照及原键等待状态刷新可视行，保留当前纵向滚动位。 */
    private render(): void {
        const model = MainChapterModel.instance;
        this.chapters!.list.setData(ChapterClearRewardUtils.rows(this.config, model.state, model.firstRewardClaim));
    }

    /** 配置行与复用节点绑定，不创建另一份目录或主动请求状态。 */
    private paint(node: Node, row: ChapterClearRewardRow): void {
        const cell = node.getComponent(ChapterClearRewardCell);
        if (!cell) {
            throw new Error("通关奖励列表缺少关卡行组件");
        }
        cell.bind(row);
    }

    /** 旧前往战斗只回到父页；领取和恢复都交应用按原绝对关卡处理。 */
    private perform(row: ChapterClearRewardRow): void {
        if (this.intent || !this.config.length || !row.enabled) {
            return;
        }
        if (row.status === "battle") {
            this.close();
            return;
        }
        const claim = MainChapterController.instance.requestFirstRewardClaim;
        if (!claim) {
            UIManager.instance.toast("通关奖励尚未准备好，请稍后重试");
            return;
        }
        const intent = {};
        this.intent = intent;
        const finish = (): void => {
            if (this.intent === intent) {
                this.intent = null;
            }
        };
        void claim(row.chapter).then(finish, finish);
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
