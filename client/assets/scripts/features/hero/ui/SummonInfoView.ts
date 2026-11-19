/** 召唤法阵的概率公示、推荐阵容及祈愿说明，使用同一个只读滚动窗口。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { ServerClock } from "../../../core/ServerClock";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { FirstSummonData, type SummonDetails } from "../data/FirstSummonData";
import { SummonReferenceUtils, type SummonReferenceRow } from "../utils/SummonReferenceUtils";

const { ccclass, property } = _decorator;
/** 顺序与预制体页签一致，最后一个页签展示祈愿条件。 */
const pools = ["NORMAL", "FRIENDSHIP", "ADVANCED", "POINTS"] as const;

/** 公示、推荐及祈愿使用不同数据，共享面板布局。 */
type SummonInfoKind = "rates" | "lineups" | "prayer";
interface SummonInfoArgs {
    /** 本次打开的说明类型。 */
    readonly kind: SummonInfoKind;
    /** 打开时的祈愿资格，由当前快照提供。 */
    readonly state?: SummonDetails | null;
}

@UIRegistry.view({
    id: "summon-info",
    prefab: "bundles/module/hero/prefabs/SummonInfoView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("SummonInfoView")
export class SummonInfoView extends BaseView<SummonInfoArgs> {
    /** 固定内容区宽高，窄屏时整体缩小。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 关闭说明并返回召唤。 */
    @property(Button) closeButton: Button | null = null;
    /** 当前说明的标题。 */
    @property(Label) titleLabel: Label | null = null;
    /** 基础、友情、高级、积分、祈愿五个公示页签。 */
    @property([Button]) tabs: Button[] = [];
    /** 各页签的预制体文字。 */
    @property([Label]) tabLabels: Label[] = [];
    /** 当前选中的公示页签背景。 */
    @property([Node]) tabHighlights: Node[] = [];
    /** 虚拟列表，按视口渲染文字和头像。 */
    @property(SuperScroll) list: SuperScroll | null = null;

    /** 打开任一说明，召唤页面关闭时一并回收窗口。 */
    public static openFor(owner: BaseView<unknown>, kind: SummonInfoKind, state?: SummonDetails | null): void {
        void UIManager.instance.openChild(owner, SummonInfoView, { kind, state })
            .catch(() => { /* 开窗失败由 UIManager 统一报告。 */ });
    }

    /** 注册滚动列表和页签，公示默认展示高级召唤。 */
    public onOpen(args?: SummonInfoArgs): void {
        if (!args || !this.panel || !this.closeButton || !this.titleLabel || !this.list
            || this.tabs.length !== 5 || this.tabHighlights.length !== 5 || this.tabLabels.length !== 5) {
            throw new Error("召唤说明预制体绑定不完整");
        }
        this.titleLabel.string = { rates: "召唤概率", lineups: "阵容推荐", prayer: "召唤祈愿" }[args.kind];
        const content = this.list.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderRow, this);
        this.ownListener(() => content.off(SuperContent.RENDER_ITEM, this.renderRow, this));
        this.listen(this.closeButton, () => this.close());
        this.tabs.forEach((button, index) => {
            button.node.active = args.kind === "rates";
            this.listen(button, () => this.showRates(index));
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        if (args.kind === "rates") {
            this.showRates(2);
        } else if (args.kind === "lineups") {
            this.showRows(SummonReferenceUtils.lineups());
        } else {
            this.showRows(this.prayerRows(args.state));
        }
    }

    /** 当前角色的祈愿积分和正式解锁方式，支付入口开放后才能购买资格。 */
    private prayerRows(state?: SummonDetails | null): SummonReferenceRow[] {
        const required = Number(FirstSummonData.system("adv_summon_wish_time"));
        const duration = Number(FirstSummonData.system("hero_prayer_duration"));
        const points = BagModel.instance.quantity(900303);
        return [
            { text: `祈愿点数  ${points}/${required}`, icon: ResManager.ui("hero", "summon-hero-prayer_btn-prayer-1") },
            { text: "高级召唤累积祈愿点数" },
            { text: `购买祈愿礼包后解锁，资格有效期 ${duration} 天` },
            { text: "祈愿开放后可选择火、水、木元素" },
            { text: (state?.prayerEndsAtSeconds ?? 0) > (ServerClock.instance.nowSeconds() ?? 0)
                ? "当前账号有祈愿资格" : "本服支付尚未开放" },
        ];
    }

    /** 切换概率公示并回到列表开头。 */
    private showRates(index: number): void {
        this.tabHighlights.forEach((node, current) => { node.active = index === current; });
        const pool = pools[index];
        this.showRows(pool ? SummonReferenceUtils.rates(pool) : this.prayerRows(this.args?.state));
    }

    /** 更新当前说明的虚拟列表并回到第一条。 */
    private showRows(rows: readonly SummonReferenceRow[]): void {
        this.list!.list.setData(rows);
        this.list!.toStart();
    }

    /** 复用虚拟行，切换话题时清理上一行头像。 */
    private renderRow(node: Node, row: SummonReferenceRow): void {
        const label = node.getChildByName("Text")?.getComponent(Label);
        const icon = node.getChildByName("Icon");
        if (!label || !icon) {
            throw new Error("召唤说明条目缺少文字或图标");
        }
        label.string = row.text;
        icon.active = !!row.icon;
        ResManager.setSprite(icon, row.icon ?? null);
    }

    /** 沿现有可见区规则缩放说明面板。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 登记短期按钮监听，关闭窗口时解除。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => node.off(Button.EventType.CLICK, callback));
    }
}
