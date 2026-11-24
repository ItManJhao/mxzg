/**
 * 主线快速战斗窗口，显示服务器报价及当前关卡的参考产物。
 * 用户确认后由主线控制器领取。奖励、钻石及契约进度随服务端事务更新。
 */
import { _decorator, Button, instantiate, Label, Node, Prefab } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { ServerClock } from "../../../core/ServerClock";
import { BaseView } from "../../../framework/ui/BaseView";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterRewardInfoUtils } from "../utils/ChapterRewardInfoUtils";
import { ChapterRewardInfoCell } from "./ChapterRewardInfoCell";

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
    /** 关卡产物行的静态宿主，负责承接其物品选择事件。 */
    @property(Node) rewardHost: Node = null!;
    /** 与主线产物说明共享的只读关卡行。 */
    @property(Prefab) rewardRowPrefab: Prefab = null!;
    /** 关闭窗口。 */
    @property(Button) closeButton: Button = null!;
    /** 快速战斗、重试和刷新报价共用的操作键。 */
    @property(Button) battleButton: Button = null!;
    /** 今日次数或解锁提示。 */
    @property(Label) countLabel: Label = null!;
    /** 展示服务器实际费用和请求状态的按钮文字。 */
    @property(Label) battleLabel: Label = null!;
    /** 本窗口持有的产物行，随窗口销毁。 */
    private rewardRow: ChapterRewardInfoCell | null = null;
    /** 当前产物行显示的全局关卡，通关进度变化后刷新。 */
    private rewardStage = 0;

    /** 绑定界面后取得当前报价；只读产物先从已安装的配置展示。 */
    public onOpen(): void {
        const rewardNode = instantiate(this.rewardRowPrefab);
        this.rewardRow = rewardNode.getComponent(ChapterRewardInfoCell);
        this.rewardHost.addChild(rewardNode);
        this.rewardHost.on(ChapterRewardInfoCell.ITEM_SELECTED, this.showItem, this);
        this.ownListener(() => {
            if (this.rewardHost?.isValid) {
                this.rewardHost.off(ChapterRewardInfoCell.ITEM_SELECTED, this.showItem, this);
            }
        });
        this.bindButton(this.closeButton, () => this.close());
        this.bindButton(this.battleButton, () => this.onBattle());
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.render));
        this.schedule(this.refreshExpiredQuote, 1);
        this.render();
        MainChapterController.instance.refreshQuickBattle();
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
        if (this.rewardRow && this.rewardStage !== stage) {
            const table = GameConfig.instance.getFileByPath("config/chapterreward");
            this.rewardRow.bind(stage, ChapterRewardInfoUtils.idleItemsForStage(table, stage));
            this.rewardStage = stage;
        }
        const quote = model.quickBattle;
        this.countLabel.string = !quote ? "次数未同步"
            : !quote.unlocked ? "角色达到 20 级后开放"
            : "今日剩余 " + (quote.maxCount - quote.usedCount) + "/" + quote.maxCount + " 次";
        this.battleLabel.string = model.quickBattleBusy ? "请稍候"
            : model.quickBattleRequest ? "确认上次结果"
            : !quote ? "刷新次数"
            : quote.usedCount === quote.maxCount ? "今日次数已用完"
            : quote.costDiamonds === 0 ? "免费快速战斗" : quote.costDiamonds + " 钻快速战斗";
        this.battleButton.interactable = !model.quickBattleBusy
            && (!!model.quickBattleRequest || !quote || (quote.unlocked && quote.usedCount < quote.maxCount));
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

    /** 关窗清理显示监听、定时刷新与详情子窗。 */
    public onClose(): void {
        this.unschedule(this.refreshExpiredQuote);
        UIManager.instance.closeChildren(this);
        this.rewardRow = null;
        this.rewardStage = 0;
    }
}
