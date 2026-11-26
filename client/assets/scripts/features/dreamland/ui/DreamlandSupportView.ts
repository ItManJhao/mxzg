/** 梦境好友支援窗口。按两个页签展示权威的借用、派遣和自有英雄状态，操作交给 DreamlandController。 */
import { _decorator, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { DreamlandAssistanceData } from "../../../platform/Protocol";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { HeroRosterEvent } from "../../hero/utils/HeroRosterEvent";
import { DreamlandController } from "../DreamlandController";
import { DreamlandModel } from "../DreamlandModel";
import { DreamlandSupportCell, type DreamlandSupportRow } from "./DreamlandSupportCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "dreamland-support",
    prefab: "bundles/module/dreamland/prefabs/DreamlandSupportView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("DreamlandSupportView")
export class DreamlandSupportView extends BaseView {
    /** 参与安全视口等比适配的窗口主体。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭支援，返回下方保持原状的梦境主页。 */
    @property(Button) private closeButton: Button | null = null;
    /** 第一个按钮展示可借用的好友，第二个按钮展示本日派遣。 */
    @property([Button]) private tabButtons: Button[] = [];
    /** 原页签底图，按选中和未选中顺序绑定。 */
    @property([SpriteFrame]) private tabFrames: SpriteFrame[] = [];
    /** 我的支援当天尚未派遣时显示的提醒。 */
    @property(Node) private dispatchDot: Node | null = null;
    /** 当前页签的英雄卡列表；布局由预制体控制。 */
    @property(SuperScroll) private rows: SuperScroll | null = null;
    /** 固定的当前选择卡片嵌套预制体根。 */
    @property(Node) private selected: Node | null = null;
    /** 尚未读取或尚未选择时在深色选槽中显示。 */
    @property(Label) private selectionEmpty: Label | null = null;
    /** 预制体上的固定助战战力规则，两页保持可见。 */
    @property(Label) private notice: Label | null = null;
    /** 0 为好友助战，1 为我的支援；开窗总是从好友页进入。 */
    private tab = 0;
    /** 记录已请求补读的日结边界（Unix 秒），同一次跨日不重复发请求。 */
    private refreshedBoundary = 0;

    /** 从好友助战页打开，绑定静态窗口并查询当日支援。 */
    public onOpen(): void {
        super.onOpen();
        if (!this.panel || !this.closeButton || !this.rows || !this.selected?.getComponent(DreamlandSupportCell)
            || !this.dispatchDot || !this.selectionEmpty || !this.notice || this.tabButtons.length !== 2
            || this.tabFrames.length !== 2 || this.tabButtons.some(button => !button.node.getComponent(Sprite))) {
            throw new Error("梦境好友支援窗口预制体绑定不完整");
        }
        this.rows.validateBindings();
        this.listen(this.closeButton, () => this.close());
        this.tabButtons.forEach((button, index) => this.listen(button, () => this.selectTab(index)));
        this.ownListener(EventDispatcher.instance.on("dreamland.updated", this, this.paint));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.refreshPeriod, 1);
        this.paint();
        DreamlandController.instance.setAssistanceVisible(true);
    }

    /** 关闭时停止检查上海零点，控制器继续处理已发出的请求。 */
    public onClose(): void {
        this.unschedule(this.refreshPeriod);
        DreamlandController.instance.setAssistanceVisible(false);
    }

    /** 视口过小时缩小整张窗口，列表、页签和底部说明共享同一比例。 */
    private fit(): void {
        const visible = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, (visible.width - 22) / panel.width, visible.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 通过页面生命周期绑定静态按钮，关闭后移除监听。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 两个页签根据原快照立即换页，候选列表回到开头。 */
    private selectTab(tab: number): void {
        if (this.tab !== tab) {
            this.tab = tab;
            this.paint();
            this.rows!.toStart();
        }
    }

    /** 自然日切换时隐藏过期派遣并补读，期间不会以旧版本提交写操作。 */
    private readonly refreshPeriod = (): void => {
        const boundary = DreamlandModel.instance.assistance?.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        if (boundary && now !== null && now >= boundary && this.refreshedBoundary !== boundary) {
            this.refreshedBoundary = boundary;
            this.paint();
            DreamlandController.instance.loadAssistance();
        }
    };

    /** 绑定当前选择、候选名单和页签提醒。等待确认时保留展示并禁用写操作。 */
    private paint(): void {
        const model = DreamlandModel.instance;
        const cached = model.assistance;
        const now = ServerClock.instance.nowSeconds();
        const data = cached && (now === null || now < cached.resetAtSeconds) ? cached : null;
        const controller = DreamlandController.instance;
        const canAct = !!data && data.version === model.snapshot?.state.version && !controller.busy && !controller.awaitingResult;
        this.tabButtons.forEach((button, index) => {
            button.node.getComponent(Sprite)!.spriteFrame = this.tabFrames[index === this.tab ? 0 : 1];
        });
        this.dispatchDot!.active = !!data && !data.dispatched;
        const chosen = this.tab === 0 ? data?.selected : data?.dispatched;
        this.selected!.active = !!chosen;
        this.selectionEmpty!.node.parent!.active = !chosen;
        this.selectionEmpty!.string = data ? "当前未选择英雄" : "正在读取好友支援…";
        if (chosen) {
            const borrowed = this.tab === 0;
            const canClear = borrowed && !!data?.canSelect;
            this.selected!.getComponent(DreamlandSupportCell)!.paint({
                ...chosen,
                friendName: borrowed ? chosen.roleName : undefined,
                state: canClear ? undefined : "selected",
                button: canClear ? "取消" : undefined,
                action: canClear && canAct ? () => controller.actAssistance("CLEAR_ASSIST") : undefined,
            });
        }
        const rows = data ? (this.tab === 0 ? this.friendRows(data, canAct) : this.ownRows(data, canAct)) : [];
        this.rows!.list.setData(rows, (node, row) => node.getComponent(DreamlandSupportCell)!.paint(row));
    }

    /** 好友派遣按冻结战力降序，已选及超限行保留在名单里并显示独立状态。 */
    private friendRows(data: DreamlandAssistanceData, canAct: boolean): DreamlandSupportRow[] {
        return [...data.available].sort((left, right) => right.power - left.power).map(hero => {
            const selected = hero.heroId === data.selected?.heroId;
            const eligible = hero.power <= data.maxAssistPower;
            const selectable = !selected && eligible;
            return {
                ...hero,
                friendName: hero.roleName,
                state: selected ? "selected" : eligible ? undefined : "over-limit",
                button: selectable ? "选择" : undefined,
                action: selectable && canAct && data.canSelect
                    ? () => DreamlandController.instance.actAssistance("SELECT_ASSIST", hero.roleId) : undefined,
            };
        });
    }

    /** 我的支援使用名册单体战力降序，今日已派遣时仍保留完整名册。 */
    private ownRows(data: DreamlandAssistanceData, canAct: boolean): DreamlandSupportRow[] {
        return [...HeroRosterModel.instance.snapshot.heroes].sort((left, right) =>
            (right.panelStats?.power ?? -1) - (left.panelStats?.power ?? -1)).map(hero => {
            const selected = hero.id === data.dispatched?.heroId;
            return {
                templateId: hero.templateId, level: hero.level, star: hero.star,
                power: hero.panelStats?.power ?? null,
                state: selected ? "selected" : undefined,
                button: selected ? undefined : "选择",
                action: !selected && canAct ? () => this.dispatchHero(data, hero.id) : undefined,
            };
        });
    }

    /** 同日只允许派遣一次，其他行通过通用提示说明，发奖仍由服务器和通用奖励队列处理。 */
    private dispatchHero(data: DreamlandAssistanceData, heroId: string): void {
        if (data.dispatched) {
            UIManager.instance.toast("今天已经派遣过，请明天再来吧！");
        } else {
            DreamlandController.instance.actAssistance("DISPATCH_ASSIST", heroId);
        }
    }
}
