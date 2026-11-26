/**
 * 勇者试炼每日难度窗口。三档横幅及奖励格由预制体提供，资格由服务器确认。
 * 开窗时读取试炼 Model；选定请求由控制器一次提交。
 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BaseView } from "../../../framework/ui/BaseView";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { TrialDifficulty } from "../../../platform/Protocol";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { TrialController } from "../TrialController";
import { TrialModel } from "../TrialModel";
import { TrialViewUtils } from "../utils/TrialViewUtils";

const { ccclass, property } = _decorator;

export interface TrialDifficultyArgs {
    /** 还未选难度时关闭，返回副本大厅。 */
    readonly cancel: () => void;
}

@UIRegistry.view({ id: "trial-difficulty", prefab: "bundles/module/trial/prefabs/TrialDifficultyView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: false } })
@ccclass("TrialDifficultyView")
export class TrialDifficultyView extends BaseView<TrialDifficultyArgs> {
    /** 固定面板负责三档原版横幅和底部提示的缩放。 */
    @property(UITransform) private panel: UITransform | null = null;

    /** 关闭难度窗口并返回副本大厅。 */
    @property(Button) private closeButton: Button | null = null;

    /** 按普通、精英、噩梦顺序确认选择。 */
    @property([Button]) private choices: Button[] = [];

    /** 各档的战力和通关前置；尚未接通的战斗规则单独说明。 */
    @property([Label]) private requirements: Label[] = [];

    /** 每档并排两格，展示该难度整轮配置奖励。 */
    @property([Node]) private rewardSlots: Node[] = [];

    /** 断线后在当前弹窗补读原选定结果。 */
    @property(Button) private retryButton: Button | null = null;

    /** 初次显示订阅进度，并绑定三档选择、查看物品及返回。 */
    public onOpen(args?: TrialDifficultyArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.closeButton || !this.retryButton || this.choices.length !== 3
            || this.requirements.length !== 3 || this.rewardSlots.length !== 6) {
            throw new Error("勇者试炼难度窗口绑定不完整");
        }
        this.ownListener(TrialViewUtils.listen(this.closeButton, () => {
            this.close();
            args.cancel();
        }));
        this.ownListener(TrialViewUtils.listen(this.retryButton, () => TrialController.instance.refreshVisible()));
        this.choices.forEach((button, index) => this.ownListener(TrialViewUtils.listen(button,
            () => TrialController.instance.act("selectDifficulty", { choice: index + 1 }))));
        this.rewardSlots.forEach((node, index) => {
            const button = node.getComponent(BagItemView)!.button!;
            this.ownListener(TrialViewUtils.listen(button, () => this.openReward(index)));
        });
        this.ownListener(EventDispatcher.instance.on("trial.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => TrialViewUtils.fit(this.node, this.panel!)));
        this.paint();
    }

    /** 以服务端资格显示选择或解锁条件，服务端确认后自动回到地图。 */
    private paint(): void {
        const state = TrialModel.instance.snapshot?.state;
        const controller = TrialController.instance;
        if (state?.difficulty) {
            this.close();
            return;
        }
        this.closeButton!.interactable = !controller.busy && !controller.awaitingResult;
        this.retryButton!.node.active = controller.awaitingResult && !controller.busy;
        this.choices.forEach((button, index) => {
            const tier = state?.difficulties.find(row => row.id === index + 1);
            const unlocked = !!tier?.combatReady && tier.id <= (state?.maxDifficulty ?? 0);
            button.node.active = unlocked;
            button.interactable = !controller.busy && !controller.awaitingResult;
            const requirement = this.requirements[index];
            requirement.node.parent!.active = !unlocked && !!tier;
            if (tier && !unlocked) {
                requirement.string = this.unlockHint(tier, state?.completedDifficulty ?? 0);
            }
            TrialViewUtils.rewards(this.rewardSlots.slice(index * 2, index * 2 + 2), this.displayRewards(tier));
        });
    }

    /** 显示尚未满足的原版解锁条件，保留服务端给出的实际战力门槛。 */
    private unlockHint(tier: TrialDifficulty, completedDifficulty: number): string {
        if (!tier.combatReady) {
            return "战斗规则待接入";
        }
        const config = GameConfig.instance;
        const powerText = (config.requireConfig(GConfig.Language, 41245).value ?? "战力%s开启")
            .replace("%s", String(tier.minimumPower));
        if (tier.id <= completedDifficulty + 1) {
            return powerText;
        }
        const clearText = config.requireConfig(GConfig.Language, 41246 + tier.id).value ?? "通关上一难度后开启";
        return `${clearText}\n${powerText}`;
    }

    /** 打开服务器下发的奖励物品说明，背包余额仍由统一状态提供。 */
    private openReward(index: number): void {
        const tier = TrialModel.instance.snapshot?.state.difficulties.find(row => row.id === Math.floor(index / 2) + 1);
        const reward = this.displayRewards(tier)[index % 2];
        if (reward) {
            void UIManager.instance.openChild(this, BagInfoView, {
                source: "description",
                face: BagItemCatalog.face(reward.itemId, reward.quantity),
            }).catch(() => { /* UIManager 负责开窗错误反馈。 */ });
        }
    }

    /** 按旧版顺序展示金币和试炼血，并保持打开说明时的索引一致。 */
    private displayRewards(tier: TrialDifficulty | undefined): TrialDifficulty["rewards"] {
        return [...(tier?.rewards ?? [])].sort((left, right) => left.itemId - right.itemId);
    }
}
