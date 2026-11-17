/** 主线页内战场：由UIManager挂载到MainChapterView的BattleHost，保留共享导航与底部面板，播放完成后转交主线控制器结算，资产仍由服务端统一同步。 */
import { _decorator } from "cc";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterEndView } from "./ChapterEndView";
import { UIManager } from "../../../framework/ui/UIManager";
import { MainChapterReplay } from "../MainChapterModel";
import type { MainChapterReceipt } from "../MainChapterModel";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BattleReplayPreview } from "./BattleReplayPreview";
import { BattleReplayUtils } from "../utils/BattleReplayUtils";
import { ChapterMilestoneUtils } from "../utils/ChapterMilestoneUtils";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
const { ccclass } = _decorator;
/** 已校验战报及调用页面的展示清理通知，不能修改服务器资产。 */
interface MainChapterBattleArgs {
    /** 服务端冻结战报，恢复确认时也保留原双方统计与外观。 */
    report: MainChapterReplay;
    /** true仅恢复本应用已结束战斗的结算，不重新播放或生成新挑战。 */
    settlementOnly?: boolean;
    /** 调用页面清理显示占用；不取消模块结算意图。 */
    onClosed(): void;
}
@UIRegistry.view({
    id: "main-chapter-battle",
    prefab: "bundles/module/battle/prefabs/MainChapterBattleView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "main-chapter-field",
})
@ccclass("MainChapterBattleView")
export class MainChapterBattleView extends BaseView<MainChapterBattleArgs> {
    /** 本窗口播放器清理口，关闭立即释放动画、资源和结算弹层。 */
    private stopReplay: (() => void) | null = null;
    /** 关闭后阻止迟到资源挂回，和账号网络隔离无关。 */
    private closed = false;
    /** null尚未播完；设置后合并同帧多次结束回调，重连不再重播演出。 */
    private finishedWon: boolean | null = null;
    /** true仅等待本窗口原战斗的双确认，历史回放与失败不订阅结果展示。 */
    private awaitingSettlement = false;
    /** 本窗口已开始打开结果页，阻止重复快照或回执重复开窗；关闭时取消该打开。 */
    private resultOpening = false;

    /** 使用既有BattlePage，异步准备期间允许UIManager取消打开。 */
    public onOpen(args?: MainChapterBattleArgs): void {
        super.onOpen(args);
        if (!args?.report) {
            throw new Error("主线战报窗口参数缺失");
        }
        this.closed = false;
        this.finishedWon = null;
        this.awaitingSettlement = false;
        this.resultOpening = false;
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.showConfirmedSettlement));
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport());
        this.beginOpen();
        if (args.settlementOnly) {
            this.fitViewport();
            this.finishOpen();
            void this.completeBattle(true);
            return;
        }
        void BattleReplayPreview.open(this.node, args.report.bytes, false, () => this.close(),
            undefined, "主线第" + args.report.mission + "关", true, won => this.completeBattle(won), false, () => this.closed).then(stop => {
            if (this.closed) {
                stop();
                return;
            }
            this.stopReplay = stop;
            this.fitViewport();
            this.finishOpen();
        }).catch(error => {
            if (!this.closed) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 演出只提交一次原战斗意图；待确认时保留当前页，重连事件再交付结果，不开假成功页。 */
    private async completeBattle(won: boolean): Promise<void> {
        if (this.closed || !this.args || this.finishedWon !== null) {
            return;
        }
        this.finishedWon = won;
        const battleId = this.args.report.battleId;
        const model = MainChapterModel.instance;
        const receipt = model.receipt;
        const settlement = model.settlement;
        if (settlement?.battleId === battleId && settlement.presentation === "reward") {
            this.close();
            return;
        }
        const current = model.state?.pendingBattleId === battleId
            || (receipt?.battleId === battleId && receipt.action === "BATTLE")
            || (settlement?.battleId === battleId && !settlement.presented);
        if (won && current) {
            this.awaitingSettlement = true;
            try {
                await MainChapterController.instance.claim(battleId);
            } catch (error) {
                GameLog.shared.classified("MODULE", "warn", "MainChapterBattleView", "主线结算确认失败：" + String(error));
            }
            this.showConfirmedSettlement();
            return;
        }
        await this.showResult(null, won ? "此战报已结算" : "");
    }

    /** 模块更新后只消费原编号且已双确认的回执；关闭和历史回放均不因事件迟到开窗。 */
    private showConfirmedSettlement = (): void => {
        if (this.closed || !this.awaitingSettlement || !this.args || this.resultOpening) {
            return;
        }
        const controller = MainChapterController.instance;
        const receipt = controller.confirmedSettlement(this.args.report.battleId);
        if (receipt && MainChapterModel.instance.settlement?.presentation === "battle"
            && !MainChapterModel.instance.settlement.presented) {
            void this.showResult(receipt, "本次获得");
        }
    };

    /** 结果页归本战场持有；下一目标只消费最新快照，父页关闭或窗口被接管后停止旧续段。 */
    private async showResult(receipt: MainChapterReceipt | null, notice: string): Promise<void> {
        if (this.closed || !this.args || this.resultOpening) {
            return;
        }
        this.resultOpening = true;
        try {
            const result = await UIManager.instance.openChild(this, ChapterEndView, {
                won: this.finishedWon === true, persistentChapter: true, rewards: receipt?.rewards || [], notice,
                roleAppearance: MainChapterController.instance.readRoleAppearance(),
                units: BattleReplayUtils.units(this.args.report.bytes),
                names: BattleReplayUtils.names(this.args.report.bytes),
                experience: receipt?.experience,
                nextTarget: this.finishedWon === true ? ChapterMilestoneUtils.hint(
                    MainChapterModel.instance.state,
                    () => GameConfig.instance.getConfig(GConfig.ChapterExtraReward),
                    id => GameConfig.instance.getConfig(GConfig.Language, id)?.value,
                ) : undefined,
                onClosed: () => {
                    if (receipt) {
                        MainChapterController.instance.afterBattleResultClosed(receipt.battleId);
                    }
                    if (!this.closed) {
                        this.close();
                    }
                },
            });
            if (!this.closed && receipt && UIManager.instance.ownsChild(this, result)) {
                MainChapterController.instance.markSettlementPresented(receipt.battleId);
            }
        } catch (error) {
            if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("结算界面打开失败，请返回主线重试");
                GameLog.shared.classified("MODULE", "warn", "MainChapterBattleView", String(error));
            }
        }
    }

    /** 根节点随视口变化，背景统一由主线主页持有，不再另造全屏背景。 */
    private fitViewport(): void {
        if (!this.closed) {
            ViewportLayoutUtils.fitVisibleRoot(this.node);
        }
    }

    /** 关闭播放器并通知父页；BaseView释放本战场仍持有的结果页，模块结算意图不随界面关闭。 */
    public onClose(): void {
        if (this.closed) {
            return;
        }
        this.closed = true;
        EventDispatcher.instance.offTarget(this);
        this.failOpen(new Error("主线战报窗口已关闭"));
        this.stopReplay?.();
        this.stopReplay = null;
        this.args?.onClosed();
    }
}
