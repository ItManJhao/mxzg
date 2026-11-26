/**
 * 试炼地图点开关卡或宝箱的详情。按服务器快照展示关卡守军、继承生命和奖励，
 * 出阵转交父页，领宝箱走试炼控制器。
 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { TrialNode } from "../../../platform/Protocol";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { TrialController } from "../TrialController";
import { TrialModel } from "../TrialModel";
import { TrialViewUtils } from "../utils/TrialViewUtils";

const { ccclass, property } = _decorator;

export interface TrialStageArgs {
    /** 原地图节点编号，宝箱也占一个编号。 */
    readonly stageId: number;
    /** 当前详情确认出阵后，由父页管理独立阵容窗口。 */
    readonly formation: () => void;
}

@UIRegistry.view({ id: "trial-stage", prefab: "bundles/module/trial/prefabs/TrialStageView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: true } })
@ccclass("TrialStageView")
export class TrialStageView extends BaseView<TrialStageArgs> {
    /** 两种详情在预制体内分别使用原版尺寸。 */
    @property(UITransform) private battlePanel: UITransform | null = null;
    /** 宝箱保留独立短面板。 */
    @property(UITransform) private chestPanel: UITransform | null = null;
    /** 战斗详情的关闭入口。 */
    @property(Button) private battleClose: Button | null = null;
    /** 宝箱详情的关闭入口。 */
    @property(Button) private chestClose: Button | null = null;
    /** 出阵，或关闭已通关的详情。 */
    @property(Button) private battleAction: Button | null = null;
    /** 领取，或关闭未达到条件的详情。 */
    @property(Button) private chestAction: Button | null = null;
    /** 当前能挑战时显示「出阵」。 */
    @property(Label) private battleActionLabel: Label | null = null;
    /** 按宝箱资格显示「领取」或「确定」。 */
    @property(Label) private chestActionLabel: Label | null = null;
    /** 对外显示的关数，不包含宝箱占用的编号。 */
    @property(Label) private stageLabel: Label | null = null;
    /** 守军角色头像。 */
    @property(Sprite) private avatar: Sprite | null = null;
    /** 守军角色名称。 */
    @property(Label) private opponentName: Label | null = null;
    /** 守军角色等级。 */
    @property(Label) private opponentLevel: Label | null = null;
    /** 服务端从敌方阵容计算的战力。 */
    @property(Label) private opponentPower: Label | null = null;
    /** 由站位 1 至 8 顺序索引的头像节点。 */
    @property([Node]) private opponentSlots: Node[] = [];
    /** 与八个头像同序的剩余生命填充。 */
    @property([Sprite]) private healthBars: Sprite[] = [];
    /** 战斗关卡配置奖励，保留固定二格。 */
    @property([Node]) private battleRewards: Node[] = [];
    /** 宝箱配置奖励，按实际数量显示预制体格。 */
    @property([Node]) private chestRewards: Node[] = [];
    /** 当前头像加载代次，切换状态或销毁时拒绝旧资源。 */
    private avatarRevision = 0;
    /** 已点击领取，确认到账后自动关闭原窗口。 */
    private claiming = false;

    /** 绑定两个面板的操作，按当前关卡类型和进度选择显示。 */
    public onOpen(args?: TrialStageArgs): void {
        super.onOpen(args);
        if (!this.battlePanel || !this.chestPanel || !this.battleClose || !this.chestClose
            || !this.battleAction || !this.chestAction || !this.battleActionLabel || !this.chestActionLabel
            || !this.stageLabel || !this.avatar || !this.opponentName || !this.opponentLevel || !this.opponentPower
            || this.opponentSlots.length !== 8 || this.healthBars.length !== 8 || !this.stage) {
            throw new Error("勇者试炼关卡窗口绑定或关卡数据不完整");
        }
        for (const button of [this.battleClose, this.chestClose]) {
            this.ownListener(TrialViewUtils.listen(button, () => this.close()));
        }
        this.ownListener(TrialViewUtils.listen(this.battleAction, () => this.confirmBattle()));
        this.ownListener(TrialViewUtils.listen(this.chestAction, () => this.confirmChest()));
        this.bindRewards(this.battleRewards);
        this.bindRewards(this.chestRewards);
        this.ownListener(EventDispatcher.instance.on("trial.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.paint();
    }

    /** 关掉当前详情时使迟到的头像结果失效。 */
    public onClose(): void {
        this.avatarRevision++;
    }

    /** 直接读取唯一状态中的节点，跨日后不再用旧关卡领奖。 */
    private get stage(): TrialNode | undefined {
        return TrialModel.instance.snapshot?.state.nodes.find(row => row.node === this.args?.stageId);
    }

    /** 关卡与宝箱面板分别按自身宽高适配。 */
    private fit(): void {
        const panel = this.stage?.type === "chest" ? this.chestPanel : this.battlePanel;
        TrialViewUtils.fit(this.node, panel!);
    }

    /** 同步奖励、阵型和可用操作；宝箱只有可领时显示领取，其余状态只作预览。 */
    private paint(): void {
        const stage = this.stage;
        if (!stage || (this.claiming && stage.status === "cleared")) {
            this.close();
            return;
        }
        const chest = stage.type === "chest";
        this.battlePanel!.node.active = !chest;
        this.chestPanel!.node.active = chest;
        const controller = TrialController.instance;
        const blocked = controller.busy || controller.awaitingResult;
        if (chest) {
            this.chestActionLabel!.string = stage.status === "available" ? "领取" : "确定";
            this.chestAction!.interactable = !blocked;
            TrialViewUtils.rewards(this.chestRewards, stage.rewards);
            return;
        }
        this.stageLabel!.string = `第 ${stage.displayLevel} 关`;
        const combatBlocked = stage.status === "blocked";
        this.battleActionLabel!.string = combatBlocked ? "暂未开放" : stage.status === "available" ? "出阵" : "确定";
        this.battleAction!.interactable = !blocked && !combatBlocked;
        TrialViewUtils.rewards(this.battleRewards, stage.rewards);
        const opponent = stage.opponent;
        this.opponentName!.string = opponent?.name ?? "";
        this.opponentLevel!.string = opponent ? String(opponent.level) : "";
        this.opponentPower!.string = opponent ? String(opponent.power) : "";
        const portrait = ++this.avatarRevision;
        if (opponent) {
            ResManager.setSprite(this.avatar!.node, [ResManager.head(opponent.avatarId), ResManager.head(0)]
                .filter((path): path is string => path !== null), () => portrait === this.avatarRevision && this.node.isValid);
        }
        this.opponentSlots.forEach((slot, index) => {
            const unit = opponent?.heroes.find(hero => hero.position === index + 1);
            TrialViewUtils.hero(slot, unit);
            const fill = this.healthBars[index];
            fill.node.parent!.active = !!unit;
            fill.fillRange = unit && unit.maxHp > 0 ? Math.min(1, Math.max(0, unit.hp / unit.maxHp)) : 0;
        });
    }

    /** 把当前可战关交给阵容窗；其他状态仅关详情。 */
    private confirmBattle(): void {
        const start = this.stage?.status === "available";
        const formation = this.args?.formation;
        this.close();
        if (start) {
            formation?.();
        }
    }

    /** 用当前可领节点提交宝箱回执，播报实际发放由应用处理。 */
    private confirmChest(): void {
        const stage = this.stage;
        if (stage?.status === "available") {
            this.claiming = true;
            TrialController.instance.act("claim", { choice: stage.node });
        } else {
            this.close();
        }
    }

    /** 每个静态奖励格只绑定一次点击，读取最新同一位置的奖励。 */
    private bindRewards(nodes: readonly Node[]): void {
        nodes.forEach((node, index) => {
            this.ownListener(TrialViewUtils.listen(node.getComponent(BagItemView)!.button!, () => {
                const item = this.stage?.rewards[index];
                if (item) {
                    void UIManager.instance.openChild(this, BagInfoView, {
                        source: "description", face: BagItemCatalog.face(item.itemId, item.quantity),
                    }).catch(() => { /* UIManager 负责开窗错误反馈。 */ });
                }
            }));
        });
    }
}
