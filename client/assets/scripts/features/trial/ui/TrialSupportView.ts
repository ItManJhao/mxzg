/**
 * 勇者试炼好友助战窗口。好友与我的支援各自使用同一个虚拟列表，
 * 权威派遣、借用与已出阵资格由 TrialModel 提供。
 */
import { _decorator, Button, Label, Sprite, SpriteFrame, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { TrialAssistance } from "../../../platform/Protocol";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { HeroRosterEvent } from "../../hero/utils/HeroRosterEvent";
import { TrialController } from "../TrialController";
import { TrialModel } from "../TrialModel";
import { TrialViewUtils } from "../utils/TrialViewUtils";
import { TrialSupportCell, type TrialSupportRow } from "./TrialSupportCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({ id: "trial-support", prefab: "bundles/module/trial/prefabs/TrialSupportView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: true } })
@ccclass("TrialSupportView")
export class TrialSupportView extends BaseView {
    /** 本窗口的适配单位为整张原样面板。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭后回到地图，助战选择仍落在试炼当前日。 */
    @property(Button) private closeButton: Button | null = null;
    /** 好友助战和我的支援两个入口。 */
    @property([Button]) private tabs: Button[] = [];
    /** 选中、未选中两种原画页签。 */
    @property([SpriteFrame]) private tabFrames: SpriteFrame[] = [];
    /** 页签对应的候选人，格子结构与滚动由预制体决定。 */
    @property(SuperScroll) private rows: SuperScroll | null = null;
    /** 页尾固定限制和当期借用资格说明。 */
    @property(Label) private notice: Label | null = null;
    /** 0 表示好友助战，1 表示自己的可派遣英雄。 */
    private tab = 0;

    /** 从好友助战页开始，查询当日名单并监听角色变化。 */
    public onOpen(): void {
        super.onOpen();
        if (!this.panel || !this.closeButton || !this.rows || !this.notice || this.tabs.length !== 2
            || this.tabFrames.length !== 2) {
            throw new Error("勇者试炼助战窗口绑定不完整");
        }
        this.rows.validateBindings();
        this.ownListener(TrialViewUtils.listen(this.closeButton, () => this.close()));
        this.tabs.forEach((button, index) => this.ownListener(TrialViewUtils.listen(button, () => this.selectTab(index))));
        this.ownListener(EventDispatcher.instance.on("trial.updated", this, this.paint));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => TrialViewUtils.fit(this.node, this.panel!)));
        this.paint();
        TrialController.instance.loadAssistance();
    }

    /** 点击不同页签回到候选名单顶部。 */
    private selectTab(index: number): void {
        if (index !== this.tab) {
            this.tab = index;
            this.paint();
            this.rows!.toStart();
        }
    }

    /** 复用已确认日内名单，断线期间禁用写操作。 */
    private paint(): void {
        const model = TrialModel.instance;
        const data = model.assistance;
        const controller = TrialController.instance;
        const ready = !!data && data.version === model.snapshot?.state.version
            && !controller.busy && !controller.awaitingResult;
        this.tabs.forEach((button, index) => {
            button.node.getComponent(Sprite)!.spriteFrame = this.tabFrames[index === this.tab ? 0 : 1];
        });
        this.notice!.string = this.tab === 0 ? "助战战力不可超过己方单个英雄最高战力的 120%"
            : data ? `已派遣 ${data.dispatched.length}/${data.dispatchLimit}　可派遣 Lv.40 及以上英雄` : "可派遣 Lv.40 及以上英雄";
        const rows = data ? (this.tab ? this.ownRows(data, ready) : this.friendRows(data, ready)) : [];
        this.rows!.list.setData(rows, (node, row) => node.getComponent(TrialSupportCell)!.paint(row));
    }

    /** 好友英雄按战力排序；借将保存至阵容后锁定当天的撤销操作。 */
    private friendRows(data: TrialAssistance, ready: boolean): TrialSupportRow[] {
        const all = new Map(data.available.map(hero => [hero.heroId, hero]));
        data.selected.forEach(hero => all.set(hero.heroId, hero));
        return [...all.values()].sort((left, right) => right.power - left.power).map(hero => {
            const selected = data.selected.find(row => row.heroId === hero.heroId);
            const exceedsLimit = !selected && hero.power > data.maxAssistPower;
            const action = () => {
                if (!selected && data.selected.length >= 3) {
                    UIManager.instance.toast("今日最多选择 3 名助战英雄");
                } else {
                    TrialController.instance.act(selected ? "cancelAssist" : "selectAssist", { targetId: hero.heroId });
                }
            };
            return { ...hero, exceedsLimit, status: selected?.used ? "已出阵" : undefined,
                button: selected?.used || exceedsLimit ? undefined : selected ? "取消" : "选择",
                action: ready && !selected?.used && !exceedsLimit ? action : undefined };
        });
    }

    /** Lv.40 达标的名册按真实单体战力排序，已派遣时仍展示完整名单。 */
    private ownRows(data: TrialAssistance, ready: boolean): TrialSupportRow[] {
        return [...HeroRosterModel.instance.snapshot.heroes]
            .filter(hero => hero.level >= 40)
            .sort((left, right) => (right.panelStats?.power ?? -1) - (left.panelStats?.power ?? -1))
            .map(hero => {
                const dispatched = data.dispatched.find(row => row.heroId === hero.id);
                const act = !dispatched && ready && data.dispatched.length < data.dispatchLimit;
                return { templateId: hero.templateId, level: hero.level, star: hero.star,
                    power: dispatched?.power ?? hero.panelStats?.power ?? null,
                    status: dispatched ? "已派遣" : undefined, button: dispatched ? undefined : "派遣",
                    action: act ? () => TrialController.instance.act("dispatchAssist", { targetId: hero.id }) : undefined };
            });
    }
}
