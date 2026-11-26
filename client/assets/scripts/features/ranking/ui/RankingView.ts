/** 主城排行榜弹窗，展示本服与跨服榜首，点击卡片打开对应的完整榜单。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RankingBoard, RankingBoardKind } from "../data/RankingData";
import { RankingController } from "../RankingController";
import { RankingModel } from "../RankingModel";
import { RankingBoardCell } from "./RankingBoardCell";
import { RankingDetailView } from "./RankingDetailView";
import { RankingDisplayUtils } from "./RankingDisplayUtils";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "ranking",
    prefab: "bundles/module/ranking/prefabs/RankingView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RankingView")
export class RankingView extends BaseView {
    /** 榜单弹窗固定比例，窄屏时整体适配。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 返回主城的预制体关闭按钮。 */
    @property(Button) private closeButton: Button | null = null;
    /** 页签标签，顺序为本服、跨服。 */
    @property([Button]) private scopeButtons: Button[] = [];
    /** 本服及跨服的选中贴图，与 scopeButtons 同序。 */
    @property([Node]) private scopeHighlights: Node[] = [];
    /** 两个页签右上角的红点位置。 */
    @property([Node]) private scopeDotAnchors: Node[] = [];
    /** 排行卡片以 SuperScroll 虚拟列表显示。 */
    @property(SuperScroll) private boards: SuperScroll | null = null;
    /** 目标区服无榜首数据时的空态反馈。 */
    @property(Label) private emptyState: Label | null = null;

    /** true 显示跨服，重新开窗时恢复本服。 */
    private cross = false;
    /** 当前是否已开启订阅，防止框架重复打开并绑定同一窗口。 */
    private open = false;
    /** 分别显示本服和跨服的待点赞红点，离开弹窗即解除。 */
    private scopeDots: RedDotBinding[] = [];

    /** 注册窗口监听并请求一次权威榜首数据。 */
    public onOpen(): void {
        if (this.open) {
            return;
        }
        if (!this.panel || !this.closeButton || !this.boards || !this.emptyState
            || [this.scopeButtons, this.scopeHighlights, this.scopeDotAnchors].some(nodes => nodes.length !== 2)) {
            throw new Error("排行榜未绑定窗口、页签或榜单");
        }
        this.boards.validateBindings();
        this.scopeDots = this.scopeDotAnchors.map(anchor => RedDotBinding.atAnchor(anchor));
        this.bindClick(this.closeButton, this.close);
        this.bindClick(this.scopeButtons[0], () => this.selectScope(false));
        this.bindClick(this.scopeButtons[1], () => this.selectScope(true));
        const content = this.boards.list.node;
        content.on(SuperContent.SELECT_ITEM, this.showDetail, this);
        content.on(RankingBoardCell.LIKE, this.like, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.ownListener(EventDispatcher.instance.on("ranking.updated", this, this.render));
        this.cross = false;
        this.open = true;
        RankingController.instance.setVisible(true);
        this.render();
        this.boards.toStart();
    }

    /** 关闭后撤销页面可见状态和红点，未完成的业务请求留在控制器。 */
    public onClose(): void {
        if (!this.open) {
            return;
        }
        this.open = false;
        RankingController.instance.setVisible(false);
        if (this.boards?.content?.isValid) {
            this.boards.list.clear();
        }
        this.scopeDots.forEach(dot => dot.dispose());
        this.scopeDots = [];
    }

    /** 单独解绑本窗口点击监听。 */
    private bindClick(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 按可视区域统一缩放面板，卡片及选项位置保留在 Prefab。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 切换本服或跨服并回到列表顶部，未达到跨服等级时保留当前选项。 */
    private selectScope(cross: boolean): void {
        if (cross === this.cross) {
            return;
        }
        const state = RankingModel.instance.state;
        if (cross && !state?.crossUnlocked) {
            if (state) {
                UIManager.instance.toast(`角色达到 ${state.crossLevel} 级开启跨服排行`);
            }
            return;
        }
        this.cross = cross;
        this.render();
        this.boards!.toStart();
    }

    /** 同步页签、卡片和红点，不生成本地榜首或推断跨服资格。 */
    private render(): void {
        const state = RankingModel.instance.state;
        const allBoards = state?.boards ?? [];
        if (this.cross && !state?.crossUnlocked) {
            this.cross = false;
        }
        const busy = RankingController.instance.busy;
        const current = allBoards.filter(board => RankingDisplayUtils.isCross(board.kind) === this.cross);
        this.boards!.list.setData(current, (node, board) => node.getComponent(RankingBoardCell)!.paint(board, busy));
        this.emptyState!.node.active = current.length === 0;
        this.emptyState!.string = state ? "暂无排行数据" : "等待排行同步";
        for (const [index, highlight] of this.scopeHighlights.entries()) {
            const cross = index === 1;
            highlight.active = cross === this.cross;
            this.scopeDots[index].setVisible(allBoards.some(board => RankingDisplayUtils.isCross(board.kind) === cross
                && !!board.leader && !board.liked));
        }
    }

    /** 由当前卡片开启所属榜单子窗，关掉总览时同时关闭。 */
    private showDetail(board: RankingBoard): void {
        void UIManager.instance.openChild(this, RankingDetailView, { kind: board.kind }).catch(error => {
            if (this.open && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("暂时无法打开榜单");
            }
        });
    }

    /** 将卡片点赞交给业务控制器，通过回包刷新奖励状态。 */
    private like(kind: RankingBoardKind): void {
        RankingController.instance.like(kind);
    }
}
