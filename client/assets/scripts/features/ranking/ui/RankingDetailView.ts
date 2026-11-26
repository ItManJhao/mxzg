/** 榜单子窗，显示前三领奖台、排行榜和玩家本人的排名。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RankingBoardKind } from "../data/RankingData";
import { RankingController } from "../RankingController";
import { RankingModel } from "../RankingModel";
import { RankingDisplayUtils } from "./RankingDisplayUtils";
import { RankingEntryCell } from "./RankingEntryCell";

const { ccclass, property } = _decorator;

/** 指定从哪张榜首卡片进入详情。 */
export interface RankingDetailOpenArgs {
    /** 服务端登记的榜单类别。 */
    readonly kind: RankingBoardKind;
}

@UIRegistry.view({
    id: "ranking-detail",
    prefab: "bundles/module/ranking/prefabs/RankingDetailView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RankingDetailView")
export class RankingDetailView extends BaseView<RankingDetailOpenArgs> {
    /** 预制体的固定内框，按可见区域整体缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 窗口关闭按钮。 */
    @property(Button) private closeButton: Button | null = null;
    /** 对应总览入口的真实榜单名称。 */
    @property(Label) private titleLabel: Label | null = null;
    /** 区分角色名和公会名。 */
    @property(Label) private nameHeading: Label | null = null;
    /** 区分主线关卡、个人战力及公会战力。 */
    @property(Label) private scoreHeading: Label | null = null;
    /** 榜单内容，由虚拟列表复用行。 */
    @property(SuperScroll) private entries: SuperScroll | null = null;
    /** 当前没有榜单项时的空态文案。 */
    @property(Label) private emptyState: Label | null = null;
    /** 各领奖台名次的展示节点，按第一、第二、第三排列。 */
    @property([Node]) private podiumSlots: Node[] = [];
    /** 各名次的玩家头像或公会徽章。 */
    @property([Node]) private podiumFaces: Node[] = [];
    /** 角色前三名的实际头像边框。 */
    @property([Node]) private podiumBorders: Node[] = [];
    /** 各领奖台对应的名字标签。 */
    @property([Label]) private podiumNames: Label[] = [];
    /** 底部单独的本人和所在公会排名。 */
    @property(RankingEntryCell) private ownEntry: RankingEntryCell | null = null;
    /** 无本人记录时的底部文案。 */
    @property(Label) private ownHint: Label | null = null;

    /** 当前正显示的榜种，关闭后清空并取消本页重连刷新。 */
    private kind: RankingBoardKind | null = null;

    /** 请求对应榜单，首次打开绑定事件，复开只切换该榜的内容。 */
    public onOpen(args?: RankingDetailOpenArgs): void {
        if (!args || !this.panel || !this.closeButton || !this.titleLabel || !this.nameHeading || !this.scoreHeading
            || !this.entries || !this.emptyState || !this.ownEntry || !this.ownHint
            || [this.podiumSlots, this.podiumFaces, this.podiumBorders, this.podiumNames].some(nodes => nodes.length !== 3)) {
            throw new Error("排行详情缺少榜种、名单或领奖台绑定");
        }
        if (!this.kind) {
            this.entries.validateBindings();
            const closeNode = this.closeButton.node;
            closeNode.on(Button.EventType.CLICK, this.close, this);
            this.ownListener(() => {
                if (closeNode.isValid) {
                    closeNode.off(Button.EventType.CLICK, this.close, this);
                }
            });
            this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
            this.ownListener(EventDispatcher.instance.on("ranking.updated", this, this.render));
        } else if (this.kind !== args.kind) {
            RankingController.instance.closeDetail(this.kind);
        }
        this.kind = args.kind;
        this.titleLabel.string = RankingDisplayUtils.title(this.kind);
        this.nameHeading.string = RankingDisplayUtils.isGuild(this.kind) ? "公会名称" : "角色名称";
        this.scoreHeading.string = this.kind === "CHAPTER" ? "已通关" : RankingDisplayUtils.isGuild(this.kind) ? "公会战力" : "战力";
        RankingController.instance.loadDetail(this.kind);
        this.render();
        this.entries.toStart();
    }

    /** 关闭后停止刷新该榜并释放列表复用节点所持有的展示项。 */
    public onClose(): void {
        if (this.kind) {
            RankingController.instance.closeDetail(this.kind);
            this.kind = null;
        }
        if (this.entries?.content?.isValid) {
            this.entries.list.clear();
        }
    }

    /** 兼容窄屏及横向画布，保留预制体内部尺寸比例。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 使用详情状态同步领奖台、滚动榜单和本人排行。 */
    private render(): void {
        const kind = this.kind;
        if (!kind) {
            return;
        }
        const state = RankingModel.instance.detailFor(kind);
        const entries = state?.entries ?? [];
        this.entries!.list.setData(entries, (node, row) => {
            node.getComponent(RankingEntryCell)!.paint(row, kind, row.id === state?.own?.id);
        });
        for (const [index, slot] of this.podiumSlots.entries()) {
            const entry = entries[index];
            RankingDisplayUtils.paintPortrait(this.podiumFaces[index], this.podiumBorders[index], kind, entry);
            this.podiumNames[index].string = entry?.name ?? "";
            slot.active = !!entry;
        }
        this.emptyState!.node.active = entries.length === 0;
        this.emptyState!.string = state ? "暂无排行数据" : "等待排行同步";
        const own = state?.own;
        this.ownHint!.node.active = !own;
        this.ownHint!.string = state ? "未上榜" : "";
        if (own) {
            this.ownEntry!.paint(own, kind, true);
        } else {
            this.ownEntry!.reset(kind);
        }
        this.ownEntry!.node.active = !!own;
    }
}
