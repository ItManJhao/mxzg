/**
 * 每日任务及成就共用窗口，从 QuestModel 读取权威任务进度和活跃宝箱。
 * 页面保存当前页签和滚动位置，领取交给 QuestController，功能跳转交给打开方。
 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { QuestController } from "../QuestController";
import { QuestModel } from "../QuestModel";
import type { QuestMilestone, QuestReward, QuestSnapshot, QuestTab, QuestTask } from "../data/QuestState";
import { QuestTaskCell } from "./QuestTaskCell";

/** 从任务入口打开时默认每日页，完成横幅可直接指定成就页。 */
export interface QuestViewArgs {
    /** 显示的初始页签，缺省时显示每日任务。 */
    readonly tab?: QuestTab;
    /** 尝试进入已接通的功能，成功受理时返回 true。 */
    readonly navigate?: (destination: string) => boolean;
    /** 检查当前入口是否可用，未配置时以可用的导航回调和任务目标为准。 */
    readonly canNavigate?: (destination: string) => boolean;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "quest",
    prefab: "bundles/module/common/prefabs/QuestView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("QuestView")
export class QuestView extends BaseView<QuestViewArgs> {
    /** 640×1280 设计内的完整面板，窄屏按比例适配。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 窗口右上角关闭键。 */
    @property(Button) private closeButton: Button | null = null;
    /** 两个页签按钮，顺序为每日、成就。 */
    @property([Button]) private tabs: Button[] = [];
    /** 与按钮同序的浅色选中底图。 */
    @property([Node]) private selectedTabs: Node[] = [];
    /** 与页签同序的公共红点位置。 */
    @property([Node]) private tabDotAnchors: Node[] = [];
    /** 每日活动页容器，包含活跃度轨道和短列表。 */
    @property(Node) private dailyPage: Node | null = null;
    /** 成就页容器，整个内容区均用于任务列表。 */
    @property(Node) private achievementPage: Node | null = null;
    /** 每日页的虚拟任务列表。 */
    @property(SuperScroll) private dailyList: SuperScroll | null = null;
    /** 成就页的虚拟任务列表。 */
    @property(SuperScroll) private achievementList: SuperScroll | null = null;
    /** 加载中或空列表提示，随当前页签显示。 */
    @property(Label) private emptyText: Label | null = null;
    /** 活跃度填充，长度以最后一个服务端里程碑为上限。 */
    @property(Sprite) private activityFill: Sprite | null = null;
    /** 角色今日活跃值，显示到最后一档门槛为止。 */
    @property(Label) private activityPoints: Label | null = null;
    /** 里程碑奖励按钮，按从低到高的阈值顺序绑定。 */
    @property([Button]) private milestoneButtons: Button[] = [];
    /** 与里程碑按钮同序的物品图，未同步时隐藏父按钮。 */
    @property([Sprite]) private milestoneIcons: Sprite[] = [];
    /** 与里程碑按钮同序的道具数量。 */
    @property([Label]) private milestoneQuantities: Label[] = [];
    /** 与里程碑按钮同序的活跃阈值，未同步时留空。 */
    @property([Label]) private milestoneTargets: Label[] = [];
    /** 已达到门槛且未领的里程碑使用公共红点。 */
    @property([Node]) private milestoneDotAnchors: Node[] = [];

    /** 当前页签；第一次打开及同窗复开时从 args 读取。 */
    private tab: QuestTab = "daily";
    /** 本次显示期首次绑定后为 true，避免 UIManager 复开叠加事件。 */
    private opened = false;
    /** 从预制体锚点托管的两个页签红点，关窗时释放实例。 */
    private tabDots: RedDotBinding[] = [];
    /** 各活跃奖励红点绑定，关窗时释放实例。 */
    private milestoneDots: RedDotBinding[] = [];

    /** 绑定窗口与快照监听；已显示时只响应复开目标页签。 */
    public onOpen(args?: QuestViewArgs): void {
        super.onOpen(args);
        if (!this.opened) {
            this.validateBindings();
            this.bindControls();
            this.opened = true;
            QuestController.instance.setVisible(true);
        }
        this.selectTab(args?.tab ?? "daily");
    }

    /** 退订打开期状态并释放奖励贴图，已发出的领奖由模块继续处理。 */
    public onClose(): void {
        if (!this.opened) {
            return;
        }
        this.opened = false;
        QuestController.instance.setVisible(false);
        for (const scroll of [this.dailyList!, this.achievementList!]) {
            if (scroll.content?.isValid) {
                scroll.list.clear();
            }
        }
        for (const binding of [...this.tabDots, ...this.milestoneDots]) {
            binding.dispose();
        }
        this.tabDots = [];
        this.milestoneDots = [];
        for (const icon of this.milestoneIcons) {
            ResManager.setSprite(icon.node, null);
        }
    }

    /** 加载入口检查必需节点和两种视口的滚动绑定。 */
    private validateBindings(): void {
        const slots = this.milestoneButtons.length;
        if (!this.panel || !this.closeButton || !this.dailyPage || !this.achievementPage
            || !this.dailyList || !this.achievementList || !this.emptyText || !this.activityFill
            || !this.activityPoints || this.tabs.length !== 2 || this.selectedTabs.length !== 2
            || this.tabDotAnchors.length !== 2 || slots !== 5 || this.milestoneIcons.length !== slots
            || this.milestoneQuantities.length !== slots || this.milestoneTargets.length !== slots
            || this.milestoneDotAnchors.length !== slots) {
            throw new Error("QuestView.prefab 缺少每日、成就或活跃奖励绑定");
        }
        this.dailyList.validateBindings();
        this.achievementList.validateBindings();
    }

    /** 将静态按钮和两个同构列表接入本页关闭时统一释放的监听范围。 */
    private bindControls(): void {
        this.bindClick(this.closeButton!, this.close);
        this.bindClick(this.tabs[0], () => this.selectTab("daily"));
        this.bindClick(this.tabs[1], () => this.selectTab("achievement"));
        this.tabDots = this.tabDotAnchors.map(anchor => RedDotBinding.atAnchor(anchor));
        this.milestoneDots = this.milestoneDotAnchors.map(anchor => RedDotBinding.atAnchor(anchor));
        for (const [index, button] of this.milestoneButtons.entries()) {
            this.bindClick(button, () => this.inspectMilestone(index));
        }
        for (const scroll of [this.dailyList!, this.achievementList!]) {
            const content = scroll.list.node;
            content.on(SuperContent.RENDER_ITEM, this.renderTask, this);
            content.on(QuestTaskCell.ACTION, this.perform, this);
            content.on(QuestTaskCell.ITEM, this.inspectReward, this);
            this.ownListener(() => {
                if (content.isValid) {
                    content.targetOff(this);
                }
            });
        }
        this.ownListener(EventDispatcher.instance.on("quest.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
    }

    /** 将按钮连接到当前显示期，关窗时仅移除本页绑定。 */
    private bindClick(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback, this);
            }
        });
    }

    /** 按可见区域等比缩放整体窗口，任务与奖励位置由预制体维护。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.97 / panel.width, box.height * 0.86 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 选择显示区与对应的选中底图，两个列表各保留滚动位置。 */
    private selectTab(tab: QuestTab): void {
        this.tab = tab;
        const daily = tab === "daily";
        this.dailyPage!.active = daily;
        this.achievementPage!.active = !daily;
        this.selectedTabs[0].active = daily;
        this.selectedTabs[1].active = !daily;
        this.render();
    }

    /** 刷新当前可见列表，同时同步每日和成就的领取提示。 */
    private render(): void {
        if (!this.opened) {
            return;
        }
        const snapshot = QuestModel.instance.snapshot;
        const daily = this.tab === "daily";
        const tasks = (daily ? snapshot?.daily : snapshot?.achievements) ?? [];
        const scroll = daily ? this.dailyList! : this.achievementList!;
        scroll.list.setData(tasks);
        this.emptyText!.node.active = !tasks.length;
        this.emptyText!.string = snapshot ? "暂无任务" : "等待任务同步";
        const milestoneReady = snapshot?.milestones.some(milestone =>
            snapshot.activityPoints >= milestone.points && !milestone.claimed);
        this.tabDots[0].setVisible(!!milestoneReady || !!snapshot?.daily.some(task => this.canClaim(task)));
        this.tabDots[1].setVisible(!!snapshot?.achievements.some(task => this.canClaim(task)));
        if (daily) {
            this.renderMilestones(snapshot);
        }
    }

    /** 刷新服务端活跃分数与固定五档奖励，已领图标置灰。 */
    private renderMilestones(snapshot: QuestSnapshot | null): void {
        const milestones = snapshot?.milestones ?? [];
        const points = snapshot?.activityPoints ?? 0;
        const maximum = milestones[milestones.length - 1]?.points ?? 1;
        this.activityFill!.fillRange = Math.min(1, points / maximum);
        this.activityPoints!.string = snapshot ? String(Math.min(points, maximum)) : "—";
        for (const [index, button] of this.milestoneButtons.entries()) {
            const milestone = milestones[index];
            const item = milestone?.rewards[0];
            const icon = this.milestoneIcons[index];
            const ready = !!milestone && !milestone.claimed && points >= milestone.points;
            button.node.active = !!item;
            button.interactable = !ready || !QuestController.instance.busy;
            icon.grayscale = !!milestone?.claimed;
            this.milestoneTargets[index].string = milestone ? String(milestone.points) : "";
            this.milestoneQuantities[index].string = item ? `x${item.quantity}` : "";
            this.milestoneDots[index].setVisible(ready);
            const face = item ? BagItemCatalog.face(item.itemId, item.quantity) : null;
            ResManager.setSprite(icon.node, face ? [face.icon, face.fallback] : null);
        }
    }

    /** 绑定当前虚拟行的快照与当前宿主所能处理的任务目的地。 */
    private renderTask(node: Node, task: QuestTask): void {
        const cell = node.getComponent(QuestTaskCell);
        if (!cell) {
            throw new Error("任务列表缺少 QuestTaskCell");
        }
        const canNavigate = !!task.destination && !!this.args?.navigate && (this.args.canNavigate?.(task.destination) ?? true);
        cell.bind(task, QuestController.instance.busy, canNavigate);
    }

    /** 达成且尚未领取的任务可以提交领奖。 */
    private canClaim(task: QuestTask): boolean {
        return !task.claimed && task.current >= task.target;
    }

    /** 领奖交给模块；未完成任务在宿主确认受理跳转后关闭窗口。 */
    private perform(task: QuestTask): void {
        const controller = QuestController.instance;
        if (this.canClaim(task)) {
            if (!controller.busy) {
                void controller.claimTask(this.tab, task.id);
            }
            return;
        }
        if (task.destination && this.args?.navigate?.(task.destination)) {
            this.close();
        } else {
            UIManager.instance.toast("功能暂未开放");
        }
    }

    /** 点击达标的活跃奖励立即领取，其余状态仍可查看奖励详情。 */
    private inspectMilestone(index: number): void {
        const snapshot = QuestModel.instance.snapshot;
        const milestone: QuestMilestone | undefined = snapshot?.milestones[index];
        if (!milestone || !snapshot) {
            return;
        }
        const controller = QuestController.instance;
        if (snapshot.activityPoints >= milestone.points && !milestone.claimed) {
            if (!controller.busy) {
                void controller.claimMilestone(milestone.id);
            }
            return;
        }
        if (milestone.rewards[0]) {
            this.inspectReward(milestone.rewards[0]);
        }
    }

    /** 用共有道具详情展示奖励配置，并在父窗口关闭时清理子窗。 */
    private inspectReward(reward: QuestReward): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: BagItemCatalog.face(reward.itemId, reward.quantity),
        }).catch(() => { /* 加载失败由 UIManager 统一提示。 */ });
    }
}
