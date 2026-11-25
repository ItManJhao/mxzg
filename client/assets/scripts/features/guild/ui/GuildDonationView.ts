/**
 * 公会捐献弹窗。预制体保存静态的三档捐献和宝箱位置，页面只渲染服务端状态并转交操作。
 * 公会归属、日限额和资产都由模块控制器及统一快照管理。
 */
import { _decorator, Button, Label, Sprite, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { RulesView } from "../../common/ui/RulesView";
import { GuildController } from "../GuildController";
import { GuildModel, type GuildDonationChest, type GuildDonationState, type GuildDonationTier } from "../GuildModel";

const { ccclass, property } = _decorator;

/** 打开时由公会大厅提供当前实际所属公会。 */
export interface GuildDonationArgs {
    readonly guildId: string;
}

@UIRegistry.view({
    id: "guild-donation",
    prefab: "bundles/module/guild/prefabs/GuildDonationView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildDonationView")
export class GuildDonationView extends BaseView<GuildDonationArgs> {
    /** 原版设计尺寸，用于小屏整体缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 右上角关闭当前捐献窗。 */
    @property(Button) private closeButton: Button | null = null;
    /** 使用通用规则说明弹窗。 */
    @property(Button) private rulesButton: Button | null = null;
    /** 当前公会的服务端等级。 */
    @property(Label) private levelLabel: Label | null = null;
    /** 实际经验和本级门槛。 */
    @property(Label) private experienceLabel: Label | null = null;
    /** 服务端等级表提供的下一等级成员上限。 */
    @property(Label) private nextLabel: Label | null = null;
    /** 公会经验条的水平填充，由进度投影约束在 0 至 1。 */
    @property(Sprite) private experienceFill: Sprite | null = null;
    /** 公会当日的实际合计点数。 */
    @property(Label) private pointsLabel: Label | null = null;
    /** 公会日积分条，超过最高宝箱时仍显示实际积分。 */
    @property(Sprite) private pointsFill: Sprite | null = null;
    /** 三个捐献操作按服务端配置编号从小到大绑定。 */
    @property([Button]) private donateButtons: Button[] = [];
    /** 各档位是否已捐献的操作文字。 */
    @property([Label]) private donateLabels: Label[] = [];
    /** 三个档位的金币或钻石数。 */
    @property([Label]) private costLabels: Label[] = [];
    /** 各档实际获得的公会勋章数。 */
    @property([Label]) private medalLabels: Label[] = [];
    /** 各档计入公会等级的经验。 */
    @property([Label]) private experienceLabels: Label[] = [];
    /** 三个费用图标随档位的配置货币更新。 */
    @property([Sprite]) private costIcons: Sprite[] = [];
    /** 背包金币的原版配置图。 */
    @property(SpriteFrame) private goldIcon: SpriteFrame | null = null;
    /** 背包钻石的原版配置图。 */
    @property(SpriteFrame) private diamondIcon: SpriteFrame | null = null;
    /** 宝箱即使未达进度也能查看奖励。 */
    @property([Button]) private chestButtons: Button[] = [];
    /** 三档关闭状态的原版宝箱图，按门槛从低到高。 */
    @property([SpriteFrame]) private closedChests: SpriteFrame[] = [];
    /** 达标或已领取时使用的三档开盖图。 */
    @property([SpriteFrame]) private openedChests: SpriteFrame[] = [];
    /** 服务端下发的三档日贡献门槛。 */
    @property([Label]) private chestLabels: Label[] = [];
    /** 跨日后最早下次补读的服务器秒，关闭时清零。 */
    private retryAfter = 0;

    /** 绑定预制体按钮和公会投影，跨日刷新仅在窗口开启期间运行。 */
    public onOpen(args?: GuildDonationArgs): void {
        super.onOpen(args);
        if (!args?.guildId) {
            throw new Error("公会捐献缺少公会身份");
        }
        this.bindClick(this.closeButton!, () => this.close());
        this.bindClick(this.rulesButton!, () => this.openRules());
        this.donateButtons.forEach((button, index) => this.bindClick(button, () => this.donate(index)));
        this.chestButtons.forEach((button, index) => this.bindClick(button, () => this.openChest(index)));
        this.ownListener(EventDispatcher.instance.on("guild.donation.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        GuildController.instance.setFeatureVisible("donation", true);
        this.schedule(this.refreshOnReset, 1);
        this.render();
    }

    /** 关闭只清理显示窗口与读取订阅，在途请求仍由当前会话接收。 */
    public onClose(): void {
        this.unschedule(this.refreshOnReset);
        this.retryAfter = 0;
        GuildController.instance.setFeatureVisible("donation", false);
    }

    /** 用预制体的尺寸整体贴合视口，不移动内部卡片。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height * 0.90 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 可回收窗口通过同一清理入口撤销按钮监听。 */
    private bindClick(button: Button, action: () => void): void {
        const buttonNode = button.node;
        buttonNode.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (buttonNode.isValid) {
                buttonNode.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 显示已校验的等级、当前日和配置，查询尚未返回时用占位。 */
    private render(): void {
        const view = GuildModel.instance.donation;
        if (view && view.guildId !== this.args?.guildId) {
            this.close();
            return;
        }
        const usable = !!view && this.today(view);
        const stats = usable ? view : null;
        this.levelLabel!.string = stats ? `公会等级${stats.level}` : "公会等级—";
        this.experienceLabel!.string = stats ? `${stats.experience}/${stats.nextLevelExperience}` : "—/—";
        this.nextLabel!.string = stats ? (stats.nextCapacity > 0 ? `下一级人数上限提升至${stats.nextCapacity}`
            : "公会等级已达上限") : "";
        this.experienceFill!.fillRange = stats ? Math.min(1, stats.experience / stats.nextLevelExperience) : 0;
        this.pointsLabel!.string = stats ? String(stats.dailyPoints) : "—";
        const target = stats?.chests[stats.chests.length - 1]?.points;
        this.pointsFill!.fillRange = stats && target ? Math.min(1, stats.dailyPoints / target) : 0;
        this.donateButtons.forEach((_button, index) => this.renderTier(index, view?.tiers[index], stats));
        this.chestButtons.forEach((button, index) => {
            const chest = view?.chests[index];
            this.chestLabels[index].string = chest ? String(chest.points) : "—";
            const opened = !!stats && !!chest && (chest.claimed || stats.dailyPoints >= chest.points);
            button.node.getComponent(Sprite)!.spriteFrame = opened ? this.openedChests[index] : this.closedChests[index];
            button.interactable = usable && !!chest;
        });
    }

    /** 显示指定档位，操作状态按同一日的实际捐献资格决定。 */
    private renderTier(index: number, tier: GuildDonationTier | undefined, state: GuildDonationState | null): void {
        this.costLabels[index].string = tier ? String(tier.costAmount) : "—";
        this.medalLabels[index].string = tier ? String(tier.medals) : "—";
        this.experienceLabels[index].string = tier ? String(tier.experience) : "—";
        this.costIcons[index].spriteFrame = tier?.costItemId === 900001 ? this.goldIcon : this.diamondIcon;
        this.donateLabels[index].string = tier && state?.donatedTier === tier.id ? "已捐献" : "捐献";
        this.donateButtons[index].interactable = !!tier && state?.donatedTier === 0 && !GuildController.instance.donationBusy;
    }

    /** 服务器时钟已跨过截止秒时暂停操作，最多十秒补读一次。 */
    private refreshOnReset(): void {
        const state = GuildModel.instance.donation;
        const now = ServerClock.instance.nowSeconds();
        if (state && now !== null && now >= state.resetAt && now >= this.retryAfter) {
            this.retryAfter = now + 10;
            this.render();
            GuildController.instance.refreshDonation();
        }
    }

    /** 比较服务器报价的截止时刻，时钟尚未初始化时由服务端兜底校验。 */
    private today(state: GuildDonationState): boolean {
        const now = ServerClock.instance.nowSeconds();
        return now === null || now < state.resetAt;
    }

    /** 玩家点击已展示价格的捐献档位，按旧交互即时提交。 */
    private donate(index: number): void {
        const state = GuildModel.instance.donation;
        const tier = state?.tiers[index];
        if (!state || !this.today(state) || !tier || state.donatedTier || GuildController.instance.donationBusy) {
            return;
        }
        GuildController.instance.donate(tier.id);
    }

    /** 宝箱未达标时可预览奖励，已达标用相同说明正文确认领取。 */
    private openChest(index: number): void {
        const state = GuildModel.instance.donation;
        const chest = state?.chests[index];
        if (!state || !this.today(state) || !chest) {
            return;
        }
        const message = this.describeChest(state, chest);
        if (chest.claimed || state.dailyPoints < chest.points) {
            void UIManager.instance.openChild(this, RulesView, { title: "贡献宝箱", message })
                .catch(() => { /* 窗口错误由 UIManager 处理。 */ });
            return;
        }
        void UIManager.instance.openChild(this, ConfirmView, {
            title: "贡献宝箱",
            message,
            confirmText: "领取",
            onConfirm: () => this.commit(state, () => GuildController.instance.claimDonation(chest.id)),
        }).catch(() => { /* 窗口错误由 UIManager 处理。 */ });
    }

    /** 按真实门槛与奖励数量生成同一份宝箱说明。 */
    private describeChest(state: GuildDonationState, chest: GuildDonationChest): string {
        const status = chest.claimed ? "今日已领取。" : `公会今日贡献 ${state.dailyPoints}/${chest.points}。`;
        const items = chest.rewards.map(item => `${this.itemName(item.itemId)} ×${item.quantity}`).join("、");
        return `${status}\n奖励：${items}`;
    }

    /** 关闭或跨日后旧确认窗不能把请求提交到新公会或新一天。 */
    private commit(before: GuildDonationState, action: () => void): void {
        const current = GuildModel.instance.donation;
        if (!current || current.guildId !== before.guildId || current.resetAt !== before.resetAt || !this.today(current)) {
            UIManager.instance.toast("捐献状态已刷新，请重新操作");
            return;
        }
        action();
    }

    /** 展示实际物品名，语言配置暂缺时仍能识别具体奖励。 */
    private itemName(itemId: number): string {
        const item = GameConfig.instance.getConfig(GConfig.Item, itemId);
        return (item?.name != null && GameConfig.instance.getConfig(GConfig.Language, item.name)?.value) || String(itemId);
    }

    /** 复用原捐献说明的三项规则，包括零点刷新和宝箱需要手动领取。 */
    private openRules(): void {
        void UIManager.instance.openChild(this, RulesView, {
            title: "公会捐献",
            message: "1. 捐献可获得公会勋章，并为公会增加经验。\n"
                + "2. 每名成员每天只能选择一种捐献，北京时间 0 点刷新。\n"
                + "3. 全公会每日贡献达到门槛后，成员可在刷新前手动领取相应宝箱。",
        }).catch(() => { /* 窗口错误由 UIManager 处理。 */ });
    }
}
