/** 梦境通关榜和发奖档位。窗口读取梦境权威排名，并显示服务器结算时间。 */
import { _decorator, Button, Label, Sprite, SpriteFrame, UITransform } from "cc";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { DreamlandRankEntryData } from "../../../platform/Protocol";
import { DreamlandController } from "../DreamlandController";
import { DreamlandModel } from "../DreamlandModel";
import { DreamlandSocialCell, type DreamlandSocialRow } from "./DreamlandSocialCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "dreamland-social",
    prefab: "bundles/module/dreamland/prefabs/DreamlandSocialView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("DreamlandSocialView")
export class DreamlandSocialView extends BaseView {
    /** 安全区不足时整体等比收缩的窗框。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 通关排行榜标题。 */
    @property(Label) private title: Label | null = null;
    /** 关闭本窗口并继续保留下方梦境大厅。 */
    @property(Button) private closeButton: Button | null = null;
    /** 切换通关排行和排行奖励。 */
    @property([Button]) private tabButtons: Button[] = [];
    /** 使用原页签选中和普通外观。 */
    @property([SpriteFrame]) private tabFrames: SpriteFrame[] = [];
    /** 两个页签的展示内容。 */
    @property([Label]) private tabLabels: Label[] = [];
    /** 当前页的排行榜或奖励档位。 */
    @property(SuperScroll) private rows: SuperScroll | null = null;
    /** 空列表时显示加载状态或明确的空列表原因。 */
    @property(Label) private empty: Label | null = null;
    /** 显示真实个人名次。 */
    @property(Label) private status: Label | null = null;
    /** 显示发奖方式和下一次自然日结算。 */
    @property(Label) private hint: Label | null = null;
    /** 隐藏通用排行框中原有的操作按钮挂点。 */
    @property(Button) private clearButton: Button | null = null;
    /** 当前页签索引，切换后滚回列表起点。 */
    private tab = 0;
    /** 本窗已经主动补读过的零点边界，按服务器秒记录。 */
    private refreshedBoundary = 0;

    /** 装配列表及按钮，打开时读取权威排行。 */
    public onOpen(): void {
        super.onOpen();
        if (!this.panel || !this.title || !this.rows || !this.status || !this.hint || !this.empty
            || !this.closeButton || !this.clearButton || this.tabButtons.length !== 2 || this.tabLabels.length !== 2
            || this.tabFrames.length !== 2) {
            throw new Error("梦境社交窗口绑定不完整");
        }
        this.rows.validateBindings();
        this.title.string = "通关排行";
        const labels = ["排行榜", "排行奖励"];
        this.tabLabels.forEach((label, index) => { label.string = labels[index]; });
        this.listen(this.closeButton, () => this.close());
        this.clearButton.node.active = false;
        this.tabButtons.forEach((button, index) => this.listen(button, () => {
            if (this.tab !== index) {
                this.tab = index;
                this.paint();
                this.rows!.toStart();
            }
        }));
        this.ownListener(EventDispatcher.instance.on("dreamland.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fit.bind(this)));
        this.schedule(this.tick, 1);
        this.paint();
        DreamlandController.instance.loadRanking();
    }

    /** 页面关闭时取消期次检查，保留控制器中的已提交请求。 */
    public onClose(): void {
        this.unschedule(this.tick);
    }

    /** 随当前游戏视口缩放窗框并保持居中。 */
    private fit(): void {
        const visible = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, visible.width / panel.width, visible.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 使用框架注册生命周期清理，避免窗口重开时重复触发。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 跟随服务器自然日更新倒计时并在零点补读一次。 */
    private readonly tick = (): void => {
        const boundary = DreamlandModel.instance.ranking?.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        if (boundary && now !== null && now >= boundary && this.refreshedBoundary !== boundary) {
            this.refreshedBoundary = boundary;
            DreamlandController.instance.loadRanking();
        }
        this.updateHint();
    };

    /** 绘制当前页签标题、列表和固定底栏。 */
    private paint(): void {
        this.tabButtons.forEach((button, index) => {
            button.node.getComponent(Sprite)!.spriteFrame = this.tabFrames[index === this.tab ? 0 : 1];
        });
        const rows = this.rankingRows();
        this.empty!.node.active = rows.length === 0;
        this.rows!.list.setData(rows, (node, row) => node.getComponent(DreamlandSocialCell)!.paint(row));
        this.updateHint();
    }

    /** 排名行和奖档以原始服务器顺序显示；榜外仍显示自己的通关层数。 */
    private rankingRows(): readonly DreamlandSocialRow[] {
        const ranking = DreamlandModel.instance.ranking;
        this.empty!.string = ranking ? "暂无通关记录" : "正在读取排行…";
        this.status!.string = ranking
            ? `我的排名  ${ranking.own.rank || "榜外"}    通关 ${ranking.own.floor} 层` : "";
        if (!ranking) {
            return [];
        }
        return this.tab === 0 ? ranking.entries.map((row: DreamlandRankEntryData) => ({
            title: `${row.name} · Lv.${row.level}`,
            detail: `通关 ${row.floor} 层    战力 ${row.power}`,
            portrait: row,
            marker: String(row.rank),
        })) : ranking.rewardTiers.map(tier => ({
            title: tier.minRank === tier.maxRank ? `第 ${tier.minRank} 名` : `第 ${tier.minRank}–${tier.maxRank} 名`,
            rewards: tier.rewards,
        }));
    }

    /** 使用服务器时间显示下次排行结算及奖励发送方式。 */
    private updateHint(): void {
        const model = DreamlandModel.instance;
        const now = ServerClock.instance.nowSeconds();
        const end = model.ranking?.resetAtSeconds;
        if (!end || now === null) {
            this.hint!.string = "每日零点通过邮件发放排行奖励";
            return;
        }
        const seconds = Math.max(0, end - now);
        const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
            .map(value => String(value).padStart(2, "0")).join(":");
        this.hint!.string = `结算倒计时  ${countdown}    奖励通过邮件发放`;
    }
}
