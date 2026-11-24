/** 召唤法阵页面。展示各池、余额和冷却，确认消耗后由英雄控制器提交。 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { HeroRosterController } from "../HeroRosterController";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { FirstSummonData, type SummonCount, type SummonPool } from "../data/FirstSummonData";
import { SummonInfoView } from "./SummonInfoView";

const { ccclass, property } = _decorator;
/** 预制体上的排列顺序，先三个池，再分单次和十次。 */
const actions: readonly { pool: SummonPool; count: SummonCount }[] = [
    { pool: "NORMAL", count: 1 }, { pool: "NORMAL", count: 10 },
    { pool: "FRIENDSHIP", count: 1 }, { pool: "FRIENDSHIP", count: 10 },
    { pool: "ADVANCED", count: 1 }, { pool: "ADVANCED", count: 10 },
];

@UIRegistry.view({
    id: "first-summon",
    prefab: "bundles/module/hero/prefabs/FirstSummonView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("FirstSummonView")
export class FirstSummonView extends BaseView<void> {
    /** 预制体面板尺寸，用于统一等比适配。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 返回主城地图，已发出的请求仍由账号层接收结果。 */
    @property(Button) closeButton: Button | null = null;
    /** 显示基础单抽的免费冷却。 */
    @property(Label) stateLabel: Label | null = null;
    /** 显示统一背包Model已同步的积分余量。 */
    @property(Label) pointsLabel: Label | null = null;
    /** 六个抽取按钮，顺序与 actions 相同。 */
    @property([Button]) drawButtons: Button[] = [];
    /** 六个按钮内的消耗数量文本。 */
    @property([Label]) drawCosts: Label[] = [];
    /** 对应券、友情点或钻石图案，冷却或余额变化时切换。 */
    @property([Sprite]) drawCostIcons: Sprite[] = [];
    /** 基础、友情、高级三栏实时余额。 */
    @property([Label]) poolBalances: Label[] = [];
    /** 高级单抽免费时间。 */
    @property(Label) advancedFreeLabel: Label | null = null;
    /** 右上方显示积分使用比例。 */
    @property(Sprite) pointsFill: Sprite | null = null;
    /** 积分兑换提醒的可选定位节点，保留原尺寸与偏移。 */
    @property(Node) pointsDotAnchor: Node | null = null;
    /** 查看积分条件及领取。 */
    @property(Button) pointsButton: Button | null = null;
    /** 查看真实召唤概率。 */
    @property(Button) infoButton: Button | null = null;
    /** 查看原版推荐阵容。 */
    @property(Button) recommendButton: Button | null = null;
    /** 查看祈愿卡条件。 */
    @property(Button) prayerButton: Button | null = null;
    /** 高级十连钻石折扣。 */
    @property(Label) seniorDiscount: Label | null = null;
    /** 正式服素材的看板人物挂点。 */
    @property(Node) portraitHost: Node | null = null;
    /** 原召唤地图背景，按可见尺寸做等比覆盖。 */
    @property(Sprite) background: Sprite | null = null;
    /** 默认使用应用的英雄控制器，将召唤点击交给它。 */
    private controller = HeroRosterController.instance;
    /** 默认读取应用的英雄名册，显示服务器同步的免费资格。 */
    private roster = HeroRosterModel.instance;
    /** 与控制器读取同一份背包快照，显示召唤券和积分。 */
    private bag = BagModel.instance;
    /** 页面可见期间允许确认回调提交。 */
    private isSummonShown = false;

    /** 为隔离预览绑定当前角色的召唤控制器、名册和背包。 */
    public configure(controller: HeroRosterController, roster: HeroRosterModel, bag = BagModel.instance): void {
        this.controller = controller;
        this.roster = roster;
        this.bag = bag;
    }

    /** 校验静态布局并登记关闭、点击及可见区域监听。 */
    public onBind(): void {
        if (!this.panel || !this.closeButton || !this.stateLabel || !this.pointsLabel
            || this.drawButtons.length !== actions.length || this.drawCosts.length !== actions.length
            || this.drawCostIcons.length !== actions.length || this.poolBalances.length !== 3) {
            throw new Error("召唤预制体按钮、价格或余额绑定不完整");
        }
        this.listen(this.closeButton, () => this.close());
        this.drawButtons.forEach((button, index) => this.listen(button, () => this.draw(actions[index])));
        this.listen(this.infoButton, () => SummonInfoView.openFor(this, "rates", this.roster.snapshot.summonDetails));
        this.listen(this.recommendButton, () => SummonInfoView.openFor(this, "lineups"));
        this.listen(this.prayerButton, () => SummonInfoView.openFor(this, "prayer", this.roster.snapshot.summonDetails));
        this.listen(this.pointsButton, () => this.openPointExchange());
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        if (this.portraitHost) {
            BattleSpineService.instance.mountNamedSpine(this.portraitHost, "act", "act", { loop: true });
        }
    }

    /** 监听兑换红点和统一状态，按服务器时钟刷新两个免费单抽。 */
    public onOpen(): void {
        this.isSummonShown = true;
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.render));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.SummonProgress, this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.render));
        if (this.pointsDotAnchor) {
            const binding = RedDotBinding.atAnchor(this.pointsDotAnchor, GameRedDotKey.SUMMON_POINTS);
            this.ownListener(() => binding.dispose());
        }
        this.ownListener(EventDispatcher.instance.on("summon.repeat", this, selection => {
            if (this.isSummonShown) {
                this.draw(selection);
            }
        }));
        this.schedule(this.render, 1);
        this.ownListener(() => this.unschedule(this.render));
        this.render();
    }

    /** 关页后作废未处理的窗口操作。 */
    public onClose(): void {
        this.isSummonShown = false;
    }

    /** 按钮监听随当前页面释放。 */
    private listen(button: Button | null, action: () => void): void {
        const node = button?.node;
        node?.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node?.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 保留顶栏和底栏的空间，按实际可见宽高等比缩放三个召唤池。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const contentHeight = Math.max(1, box.height - 210);
        const scale = Math.min(1, box.width * 0.96 / panel.width, contentHeight / panel.height);
        panel.node.setScale(scale, scale, 1);
        const original = this.background?.spriteFrame?.originalSize;
        const background = this.background?.node.getComponent(UITransform);
        if (original && background && original.width > 0 && original.height > 0) {
            const cover = Math.max(box.width / original.width, box.height / original.height);
            background.setContentSize(original.width * cover, original.height * cover);
        }
    }

    /** 按可用券和免费资格更新消耗、积分、余额及六个按钮。 */
    private render(): void {
        const details = this.roster.snapshot.summonDetails;
        const busy = this.controller.summoning;
        this.stateLabel!.string = this.cooldownLabel("NORMAL");
        if (this.advancedFreeLabel) {
            this.advancedFreeLabel.string = this.cooldownLabel("ADVANCED");
        }
        for (const [index, action] of actions.entries()) {
            const quote = this.controller.quote(action.pool, action.count);
            const label = this.drawCosts[index];
            const icon = this.drawCostIcons[index];
            this.drawButtons[index].interactable = !!quote && !busy;
            label.string = !quote ? "—" : quote.free ? "免费" : quote.items && quote.diamonds
                ? `${quote.items}券+${quote.diamonds}钻` : String(quote.diamonds || quote.items);
            icon.node.active = !!quote && !quote.free;
            if (quote) {
                ResManager.setSprite(icon.node, ResManager.item(quote.diamonds && !quote.items ? 900002 : quote.itemId));
            }
        }
        const pools = ["NORMAL", "FRIENDSHIP", "ADVANCED"] as const;
        pools.forEach((pool, index) => {
            this.poolBalances[index].string = String(this.bag.quantity(FirstSummonData.cost(pool, 1).item_type));
        });
        const points = this.bag.quantity(FirstSummonData.POINT_ITEM_ID);
        const required = details?.pointsCost ?? FirstSummonData.cost("POINTS", 1).item_num;
        this.pointsLabel!.string = `${points}/${required}`;
        if (this.pointsFill) {
            this.pointsFill.fillRange = Math.min(1, points / required);
        }
        if (this.seniorDiscount) {
            const discount = Number(FirstSummonData.system("adv_summon_discount_show"));
            this.seniorDiscount.string = discount > 0 && discount < 100 ? `${discount / 10}折` : "";
        }
    }

    /** 将免费时间显示为固定宽度倒计时，零秒立即切换免费。 */
    private cooldownLabel(pool: "NORMAL" | "ADVANCED"): string {
        const remaining = this.roster.summonCooldown(pool);
        if (remaining === null) {
            return "";
        }
        if (!remaining) {
            return "本次免费";
        }
        const hours = Math.floor(remaining / 3600);
        const minutes = String(Math.floor(remaining / 60) % 60).padStart(2, "0");
        const seconds = String(remaining % 60).padStart(2, "0");
        return `${hours}:${minutes}:${seconds} 后免费`;
    }

    /** 部分高级券不足时显示混合用量，确认后只允许该次报价以内的钻石消耗。 */
    private draw({ pool, count }: { pool: SummonPool; count: SummonCount }): void {
        const quote = this.controller.quote(pool, count);
        if (quote?.items && quote.diamonds) {
            this.confirm("高级召唤", `使用 ${quote.items} 张高级召唤券和 ${quote.diamonds} 钻石？`,
                () => this.controller.summon(pool, count, quote.diamonds));
            return;
        }
        this.controller.summon(pool, count, quote?.diamonds);
    }

    /** 显示真实积分和区服资格，满足门槛才提供领取确认。 */
    private openPointExchange(): void {
        const state = this.roster.snapshot.summonDetails;
        const required = state?.pointsCost ?? FirstSummonData.cost("POINTS", 1).item_num;
        const points = this.bag.quantity(FirstSummonData.POINT_ITEM_ID);
        const message = `召唤积分 ${points}/${required}。兑换一次可获得五星英雄。`;
        if (!state?.pointsExchangeAvailable || points < required) {
            const condition = state?.pointsExchangeAvailable ? "召唤积分不足"
                : `需达到累计充值门槛${state?.pointRechargeRequired ? "（" + state.pointRechargeRequired + "）" : ""}`;
            this.confirm("积分召唤", `${message}\n${condition}`);
            return;
        }
        this.confirm("积分召唤", message, () => this.controller.summon("POINTS", 1));
    }

    /** 确认框归本页，返回或换号后不会再提交。 */
    private confirm(title: string, message: string, action?: () => void): void {
        void UIManager.instance.openChild(this, ConfirmView, {
            title, message, showCancel: !!action,
            onConfirm: () => {
                if (this.isSummonShown) {
                    action?.();
                }
            },
        }).catch(() => { /* UIManager 统一报告开窗失败。 */ });
    }
}
