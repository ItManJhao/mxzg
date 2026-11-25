/**
 * 主线快速战斗窗口，显示服务器报价及当前关卡的参考产物。
 * 用户确认后由主线控制器领取。奖励、钻石及契约进度随服务端事务更新。
 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ServerClock } from "../../../core/ServerClock";
import { BaseView } from "../../../framework/ui/BaseView";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { RulesView } from "../../common/ui/RulesView";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterRewardInfoUtils } from "../utils/ChapterRewardInfoUtils";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "chapter-quick-battle",
    prefab: "bundles/module/battle/prefabs/MainChapterQuickBattleView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("MainChapterQuickBattleView")
export class MainChapterQuickBattleView extends BaseView {
    /** 静态面板的设计尺寸，用于在竖屏视口内等比适配整窗。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 关卡掉落的四列竖向列表，布局、遮罩和复用格在预制体中维护。 */
    @property(SuperScroll) rewards: SuperScroll = null!;
    /** 关闭窗口。 */
    @property(Button) closeButton: Button = null!;
    /** 打开快速战斗的玩法说明。 */
    @property(Button) infoButton: Button = null!;
    /** 快速战斗、重试和刷新报价共用的操作键。 */
    @property(Button) battleButton: Button = null!;
    /** 按报价显示本次免费提示、剩余次数或等级要求。 */
    @property(Label) countLabel: Label = null!;
    /** 横幅右侧展示服务器提供的每日可用次数。 */
    @property(Label) bannerQuota: Label = null!;
    /** 展示服务器实际费用和请求状态的按钮文字。 */
    @property(Label) battleLabel: Label = null!;
    /** 免费操作的公共红点锚点，位于快速战斗按钮右上角。 */
    @property(Node) freeReminderAnchor: Node = null!;
    /** 当前窗口持有的红点，关窗撤销等待中的加载和可见状态。 */
    private freeReminder: RedDotBinding | null = null;
    /** 列表当前展示的已通关关卡，0 表示尚未绑定或窗口已关闭。 */
    private rewardStage = 0;

    /** 绑定界面后取得当前报价；只读产物先从已安装的配置展示。 */
    public onOpen(): void {
        if (!this.panel) {
            throw new Error("MainChapterQuickBattleView.prefab 缺少面板绑定");
        }
        this.rewards.validateBindings();
        const rewardList = this.rewards.list.node;
        rewardList.on(SuperContent.SELECT_ITEM, this.showItem, this);
        this.ownListener(() => {
            if (rewardList.isValid) {
                rewardList.off(SuperContent.SELECT_ITEM, this.showItem, this);
            }
        });
        this.freeReminder = RedDotBinding.atAnchor(this.freeReminderAnchor);
        this.bindButton(this.closeButton, () => this.close());
        this.bindButton(this.infoButton, () => this.showRules());
        this.bindButton(this.battleButton, () => this.onBattle());
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.refreshExpiredQuote, 1);
        this.render();
        MainChapterController.instance.refreshQuickBattle();
    }

    /** 宽屏按设计尺寸展示，窄屏或短屏等比收进可见区域。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height * 0.84 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 按现有页面生命周期绑定一次点击监听。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 根据服务器报价刷新可用次数、费用和按钮状态。 */
    private render(): void {
        const model = MainChapterModel.instance;
        const stage = Math.max(1, model.state?.maxCleared ?? 0);
        if (this.rewardStage !== stage) {
            const table = GameConfig.instance.getFileByPath("config/chapterreward");
            const items = ChapterRewardInfoUtils.idleItemsForStage(table, stage);
            this.rewards.list.setData(items, (node, itemId) => this.paintReward(node, itemId));
            this.rewards.toStart();
            this.rewardStage = stage;
        }
        const quote = model.quickBattle;
        const remaining = quote ? quote.maxCount - quote.usedCount : 0;
        const free = !!quote?.unlocked && remaining > 0 && quote.costDiamonds === 0;
        this.bannerQuota.string = quote?.unlocked ? String(quote.maxCount) + " 次" : "—";
        this.countLabel.string = !quote ? "次数未同步"
            : !quote.unlocked ? "角色达到 20 级后开放"
            : free && !model.quickBattleRequest ? "本次免费"
            : "剩余 " + remaining + "/" + quote.maxCount + " 次";
        this.battleLabel.string = model.quickBattleBusy ? "请稍候"
            : model.quickBattleRequest ? "确认上次结果"
            : !quote ? "刷新次数"
            : remaining === 0 && quote.unlocked ? "今日次数已用完"
            : quote.costDiamonds > 0 ? quote.costDiamonds + " 钻快速战斗" : "快速战斗";
        this.battleButton.interactable = !model.quickBattleBusy
            && (!!model.quickBattleRequest || !quote || (quote.unlocked && remaining > 0));
        this.freeReminder?.setVisible(free && !model.quickBattleBusy && !model.quickBattleRequest);
    }

    /** 绘制掉落种类及真实星级；数量为零仅表示预览不展示数量。 */
    private paintReward(node: Node, itemId: number): void {
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("快速战斗掉落列表缺少共用物品格");
        }
        const stars = GameConfig.instance.getConfig(GConfig.EquipmentType, itemId)?.star ?? 0;
        cell.show({ itemId, quantity: 0 }, false, BagItemCatalog.face(itemId, 0), true, false, false, stars);
    }

    /** 打开期间跨日时刷新报价，避免继续展示昨天的计数。 */
    private refreshExpiredQuote(): void {
        const quote = MainChapterModel.instance.quickBattle;
        const now = ServerClock.instance.nowSeconds();
        if (quote && now !== null && now >= quote.resetAt) {
            MainChapterController.instance.refreshQuickBattle();
        }
    }

    /** 免费直接发送，付费或冒险点满额由共享确认框收集玩家明确操作。 */
    private onBattle(): void {
        const model = MainChapterModel.instance;
        const controller = MainChapterController.instance;
        if (model.quickBattleRequest) {
            controller.claimQuickBattle(null);
            return;
        }
        const quote = model.quickBattle;
        if (!quote) {
            controller.refreshQuickBattle();
            return;
        }
        if (!quote.unlocked || quote.usedCount >= quote.maxCount) {
            return;
        }
        if (quote.costDiamonds === 0 && !quote.tavernFull) {
            controller.claimQuickBattle(quote);
            return;
        }
        const price = quote.costDiamonds > 0 ? "消耗 " + quote.costDiamonds + " 钻石，" : "";
        const warning = quote.tavernFull ? "\n冒险点已满，超出上限的部分无法领取。" : "";
        void UIManager.instance.openChild(this, ConfirmView, {
            title: "快速战斗",
            message: price + "领取 2 小时挂机收益？" + warning,
            onConfirm: () => controller.claimQuickBattle(quote),
        }).catch(() => { /* 由 UIManager 统一处理开窗失败。 */ });
    }

    /** 查看产物配置，不附加背包数量或领取能力。 */
    private showItem(itemId: number): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: BagItemCatalog.face(itemId, 0),
        }).catch(() => { /* 由 UIManager 统一处理开窗失败。 */ });
    }

    /** 显示普通快速战斗的结算、收费和每日重置说明。 */
    private showRules(): void {
        void UIManager.instance.openChild(this, RulesView, {
            title: "快速战斗规则",
            message: "1. 每次快速战斗可获得当前挂机关卡 120 分钟的收益。\n"
                + "2. 每天首次普通快速战斗免费，后续以按钮显示的钻石费用为准。\n"
                + "3. 每天北京时间 0 点重置次数。",
        }).catch(() => { /* 由 UIManager 统一处理开窗失败。 */ });
    }

    /** 关窗清理显示监听、定时刷新与详情子窗。 */
    public onClose(): void {
        this.unschedule(this.refreshExpiredQuote);
        UIManager.instance.closeChildren(this);
        this.freeReminder?.dispose();
        this.freeReminder = null;
        if (this.rewards?.isValid && this.rewards.content?.isValid) {
            this.rewards.list.clear();
        }
        this.rewardStage = 0;
    }
}
