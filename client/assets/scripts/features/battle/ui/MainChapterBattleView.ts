/** 主线页内战场：由UIManager挂载到MainChapterView的BattleHost，保留共享导航与底部面板，播放完成后转交主线控制器结算，资产仍由服务端统一同步。 */
import { _decorator } from "cc";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterEndView } from "./ChapterEndView";
import { UIManager } from "../../../framework/ui/UIManager";
import { MainChapterReplay } from "../MainChapterModel";
import { BattleReplayPreview } from "./BattleReplayPreview";
import { BattleReplayUtils } from "../utils/BattleReplayUtils";
const { ccclass } = _decorator;
/** 已校验战报及调用页面的展示清理通知，不能修改服务器资产。 */
interface MainChapterBattleArgs {
    report: MainChapterReplay;
    onClosed(): void;
}
@ccclass("MainChapterBattleView")
export class MainChapterBattleView extends BaseView<MainChapterBattleArgs> {
    /** 本窗口播放器清理口，关闭立即释放动画、资源和结算弹层。 */
    private stopReplay: (() => void) | null = null;
    /** 关闭后阻止迟到资源挂回，和账号网络隔离无关。 */
    private closed = false;

    /** 使用既有BattlePage，异步准备期间允许UIManager取消打开。 */
    public onOpen(args?: MainChapterBattleArgs): void {
        super.onOpen(args);
        if (!args?.report) throw new Error("主线战报窗口参数缺失");
        this.closed = false;
        bindVisibleRefresh(this.node, () => this.fitViewport());
        this.beginOpen();
        void BattleReplayPreview.open(this.node, args.report.bytes, false, () => this.close(),
            undefined, "主线第" + args.report.mission + "关", true, won => this.completeBattle(won), false, () => this.closed).then(stop => {
            if (this.closed) { stop(); return; }
            this.stopReplay = stop;
            this.fitViewport();
            this.finishOpen();
        }).catch(error => {
            if (!this.closed) this.failOpen(error instanceof Error ? error : new Error(String(error)));
        });
    }

    /** 正常播完才结算当前待领奖战报；历史重播和失败不请求发奖，关闭不会触发此入口。 */
    private async completeBattle(won: boolean): Promise<void> {
        if (this.closed || !this.args) {
            return;
        }
        const battleId = this.args.report.battleId;
        const model = MainChapterModel.instance;
        let notice = won ? "此战报已结算" : "";
        let rewards: readonly { itemId: number; quantity: number }[] = [];
        if (won && model.state?.pendingBattleId === battleId) {
            try {
                await MainChapterController.instance.claim(battleId);
            } catch (error) {
                GameLog.shared.classified("MODULE", "warn", "MainChapterBattleView", "主线结算待恢复：" + String(error));
            }
            if (this.closed) {
                return;
            }
            const receipt = model.receipt;
            if (receipt?.battleId === battleId && receipt.action === "SETTLED") {
                rewards = receipt.rewards;
                notice = "本次获得";
            } else {
                notice = "结算尚未确认，请返回主线继续领取";
            }
        }
        if (!this.closed) {
            await UIManager.instance.open(ChapterEndView, {
                won, persistentChapter: true, rewards, notice,
                roleAppearance: MainChapterController.instance.readRoleAppearance(),
                units: BattleReplayUtils.units(this.args.report.bytes),
                names: BattleReplayUtils.names(this.args.report.bytes),
                experience: model.receipt?.battleId === battleId && model.receipt.action === "SETTLED"
                    ? model.receipt.experience : undefined,
                onClosed: () => {
                    if (!this.closed) {
                        this.close();
                    }
                },
            });
        }
    }

    /** 根节点随视口变化，背景统一由主线主页持有，不再另造全屏背景。 */
    private fitViewport(): void {
        if (!this.closed) {
            fitVisibleRoot(this.node);
        }
    }

    /** 关闭只取消显示，服务器已保存战报和待领奖继续保留。 */
    public onClose(): void {
        if (this.closed) return;
        this.closed = true;
        this.failOpen(new Error("主线战报窗口已关闭"));
        this.stopReplay?.();
        this.stopReplay = null;
        this.args?.onClosed();
    }
}
