/**
 * 公会科技弹窗。预制体保存四个职业、六个节点和费用构图，页面只渲染服务端进度。
 * 角色钱包和勋章从唯一资产快照读取，点亮与重置通过公会科技控制器确认。
 */
import { _decorator, AudioSource, Button, Color, Label, Node, Sprite, SpriteFrame, Tween, tween, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { GuildTechnologyBranch } from "../../../platform/Protocol";
import type { AccountModel } from "../../account/AccountModel";
import { BagModel } from "../../bag/BagModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { RulesView } from "../../common/ui/RulesView";
import { GuildModel } from "../GuildModel";
import { GuildTechnologyController } from "../GuildTechnologyController";
import { GuildTechnologyModel } from "../GuildTechnologyModel";
import { GuildTechnologyResetView } from "./GuildTechnologyResetView";

const { ccclass, property } = _decorator;

/** 公会大厅传入当次归属和统一角色余额的读取入口。 */
export interface GuildTechnologyArgs {
    readonly guildId: string;
    readonly account: AccountModel;
}

/** 六种节点构图共用，每个职业通过属性编号选择实际图标。 */
const ATTRIBUTE_IDS = [101, 102, 201, 207, 208, 212, 219, 222, 270, 291] as const;
/** 原 attrshow 使用同一图标表示一组攻击或辅助属性。 */
const SUMMARY_ICON_IDS = [101, 223, 220, 220, 220, 224, 224, 220, 220, 224] as const;
/** 小图以速度、生命、攻击、辅助的预制体顺序保存。 */
const SUMMARY_ICON_ORDER = [101, 223, 220, 224] as const;
/** 费用位置从左往右为勋章、金币。 */
const COST_IDS = [901301, 900001] as const;
/** 只标记实际余额不足，服务器仍逐笔校验价格。 */
const INK = new Color(122, 71, 45);
const INSUFFICIENT = new Color(233, 91, 72);
/** 按旧 effect2 表保存每帧秒数。 */
const POINT_FRAME_SECONDS = 0.12;
const STAGE_FRAME_SECONDS = 0.06;

@UIRegistry.view({
    id: "guild-technology",
    prefab: "bundles/module/guild/prefabs/GuildTechnologyView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildTechnologyView")
export class GuildTechnologyView extends BaseView<GuildTechnologyArgs> {
    /** 原版纸面位置与大小，小屏整体等比缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 右上关闭键。 */
    @property(Button) private closeButton: Button | null = null;
    /** 打开原技术规则说明。 */
    @property(Button) private rulesButton: Button | null = null;
    /** 右下点亮或中断后重试。 */
    @property(Button) private lightButton: Button | null = null;
    /** 根据当前加载、满级和重试状态更换按钮文字。 */
    @property(Label) private lightLabel: Label | null = null;
    /** 只对当前职业打开费用与返还确认。 */
    @property(Button) private resetButton: Button | null = null;
    /** 四个职业按旧配置编号从小到大排列。 */
    @property([Button]) private professionButtons: Button[] = [];
    /** 四个页签的 Sprite，View 只替换选中状态的底图。 */
    @property([Sprite]) private professionTabs: Sprite[] = [];
    /** 原职业页签未选底图，按职业编号绑定。 */
    @property([SpriteFrame]) private inactiveTabs: SpriteFrame[] = [];
    /** 原职业页签已选底图，按职业编号绑定。 */
    @property([SpriteFrame]) private activeTabs: SpriteFrame[] = [];
    /** 角色当前技术等级和总层数。 */
    @property(Label) private stageLabel: Label | null = null;
    /** 环中心显示点亮下一节点的单次属性增量。 */
    @property(Label) private nextLabel: Label | null = null;
    /** 环上的六个节点从顶部顺时针排列。 */
    @property([Sprite]) private nodes: Sprite[] = [];
    /** 每条边的原箭头，位置只随边的展示循环变化。 */
    @property([Node]) private arrows: Node[] = [];
    /** 下次点亮节点的静态发光定位。 */
    @property(Node) private nextGlow: Node | null = null;
    /** 服务器确认点亮后移到该节点的原逐帧亮光。 */
    @property(Sprite) private pointEffect: Sprite | null = null;
    /** 每圈首个节点确认后，在科技盘中央播放原升阶效果。 */
    @property(Sprite) private stageEffect: Sprite | null = null;
    /** 按原序列编号保存八张节点点亮帧。 */
    @property([SpriteFrame]) private pointFrames: SpriteFrame[] = [];
    /** 按原序列编号保存十张升阶帧。 */
    @property([SpriteFrame]) private stageFrames: SpriteFrame[] = [];
    /** 按 ATTRIBUTE_IDS 顺序保存节点图标。 */
    @property([SpriteFrame]) private nodeIcons: SpriteFrame[] = [];
    /** 技术加成框中的六个累计属性图标。 */
    @property([Sprite]) private summaryIcons: Sprite[] = [];
    /** 按 SUMMARY_ICON_ORDER 保存累计属性的四种小图。 */
    @property([SpriteFrame]) private attributeIcons: SpriteFrame[] = [];
    /** 技术加成框中从左到右逐行排列的六行属性。 */
    @property([Label]) private summaryLabels: Label[] = [];
    /** 勋章和金币图标支持打开原物品说明。 */
    @property([Button]) private costButtons: Button[] = [];
    /** 显示两种实际余额和下一节点的需要量。 */
    @property([Label]) private costLabels: Label[] = [];
    /** 服务端确认点亮后仅在当前窗口播放的旧科技音效。 */
    @property(AudioSource) private pointAudio: AudioSource | null = null;

    /** 当前职业视图索引。每次打开默认第一个职业。 */
    private selected = 0;
    /** 最近绘制的当前职业权威进度，用来播放确认后的点亮演出。 */
    private displayedBranch: GuildTechnologyBranch | null = null;

    /** 装配窗口布局及当前公会相关的资产、科技回包订阅。 */
    public onOpen(args?: GuildTechnologyArgs): void {
        super.onOpen(args);
        if (!args?.guildId || !args.account.snapshot.role || !this.panel || !this.closeButton || !this.rulesButton
            || !this.lightButton || !this.lightLabel || !this.resetButton || !this.stageLabel || !this.nextLabel
            || !this.nextGlow || !this.pointEffect || !this.stageEffect || this.pointFrames.length !== 8
            || this.stageFrames.length !== 10 || this.professionButtons.length !== 4 || this.professionTabs.length !== 4
            || this.inactiveTabs.length !== 4 || this.activeTabs.length !== 4 || this.nodes.length !== 6
            || this.arrows.length !== 6 || this.summaryIcons.length !== 6 || this.summaryLabels.length !== 6
            || this.costButtons.length !== 2 || this.costLabels.length !== 2 || this.nodeIcons.length !== ATTRIBUTE_IDS.length
            || this.attributeIcons.length !== SUMMARY_ICON_ORDER.length) {
            throw new Error("公会科技的参数或预制体绑定缺失");
        }
        this.selected = 0;
        this.displayedBranch = null;
        this.onClick(this.closeButton, () => this.close());
        this.onClick(this.rulesButton, () => this.openRules());
        this.onClick(this.lightButton, () => this.point());
        this.onClick(this.resetButton, () => this.openReset());
        this.professionButtons.forEach((button, index) => this.onClick(button, () => this.select(index)));
        this.costButtons.forEach((button, index) => this.onClick(button, () => this.showItem(COST_IDS[index])));
        this.ownListener(EventDispatcher.instance.on("guild.technology.updated", this, this.paint));
        this.ownListener(EventDispatcher.instance.on("guild.updated", this, this.paint));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.paint));
        this.ownListener(args.account.subscribe(() => this.paint()));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.startArrows();
        GuildTechnologyController.instance.setVisible(true);
        this.paint();
    }

    /** 离开时结束原图动画和窗口订阅；已发出的服务端请求归控制器。 */
    public onClose(): void {
        GuildTechnologyController.instance.setVisible(false);
        for (const node of this.arrows) {
            Tween.stopAllByTarget(node);
        }
        this.stopEffects();
        this.displayedBranch = null;
    }

    /** 原 660 × 880 的纸面缩放后保留边框，内部节点坐标由预制体决定。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 用窗口生命周期统一撤销该次按钮监听。 */
    private onClick(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 让每条边的方向箭头循环移动，与当前职业进度和重置无关。 */
    private startArrows(): void {
        this.arrows.forEach((arrow, index) => {
            const start = this.nodes[index].node.position.clone();
            const end = this.nodes[(index + 1) % this.nodes.length].node.position.clone();
            arrow.setPosition(start);
            tween(arrow).repeatForever(tween<Node>().to(2.5, { position: end }).set({ position: start })).start();
        });
    }

    /** 切换展示职业，避免把其他职业旧累计进度误当本次点亮。 */
    private select(index: number): void {
        this.selected = index;
        this.displayedBranch = null;
        this.stopEffects();
        this.paint();
    }

    /** 从科技和资产快照投影当前职业；退出本公会时关闭已打开的子窗。 */
    private paint(): void {
        if (GuildModel.instance.snapshot?.guild?.id !== this.args?.guildId) {
            this.close();
            return;
        }
        const state = GuildTechnologyModel.instance.state;
        const controller = GuildTechnologyController.instance;
        const branch = state?.member ? state.branches.find(row => row.profession === this.selected + 1) : undefined;
        this.professionTabs.forEach((tab, index) => {
            tab.spriteFrame = index === this.selected ? this.activeTabs[index] : this.inactiveTabs[index];
            this.professionButtons[index].interactable = index !== this.selected && !controller.busy;
        });
        const next = branch?.next;
        this.stageLabel!.string = branch ? `科技等级(${branch.stage}/${state!.maxStage})` : "科技等级(—/—)";
        this.nextLabel!.string = next && branch ? this.attributeText(branch.nodes[next.slot - 1])
            : branch ? "科技已满级" : "";
        this.paintNodes(branch);
        this.paintCosts(branch);
        this.lightLabel!.string = controller.needsRetry || (!branch && !controller.busy) ? "重试" : next ? "点亮"
            : branch ? "已满级" : "读取中";
        this.lightButton!.interactable = controller.needsRetry || (!controller.busy && (!branch || !!next));
        this.resetButton!.interactable = !!branch && !controller.busy;
        const previous = this.displayedBranch;
        if (branch && previous?.profession === branch.profession) {
            if (branch.stage > previous.stage || (branch.stage === previous.stage && branch.step > previous.step)) {
                this.playPoint(branch.step - 1);
            } else if (branch.step === 0 && previous.step > 0) {
                this.stopEffects();
            }
        }
        this.displayedBranch = branch ?? null;
    }

    /** 保留当前层节点的点亮状态，并显示每种属性的累计值。 */
    private paintNodes(branch: GuildTechnologyBranch | undefined): void {
        const next = branch?.next;
        this.nextGlow!.active = !!next;
        if (next) {
            this.nextGlow!.setPosition(this.nodes[next.slot - 1].node.position);
        }
        this.nodes.forEach((icon, index) => {
            const node = branch?.nodes[index];
            if (node) {
                const slot = ATTRIBUTE_IDS.findIndex(attribute => attribute === node.attributeId);
                icon.spriteFrame = this.nodeIcons[slot] ?? null;
                const smallIcon = SUMMARY_ICON_ORDER.findIndex(attribute => attribute === SUMMARY_ICON_IDS[slot]);
                this.summaryIcons[index].spriteFrame = this.attributeIcons[smallIcon] ?? null;
                this.summaryLabels[index].string = this.attributeText(node, node.total);
            } else {
                this.summaryLabels[index].string = "—";
            }
            icon.grayscale = !branch || branch.step < index + 1;
        });
    }

    /** 根据角色快照和下一节点真实报价显示余额，低于报价时显示红字。 */
    private paintCosts(branch: GuildTechnologyBranch | undefined): void {
        const next = branch?.next;
        const amounts = [this.medals(), this.gold()];
        const costs = [next?.medals, next?.gold];
        this.costLabels.forEach((label, index) => {
            const needed = costs[index];
            const balance = amounts[index];
            label.string = needed === undefined ? (branch ? "已满级" : "—")
                : `${UiKitUtils.formatAmount(balance)}/${UiKitUtils.formatAmount(needed)}`;
            label.color = needed !== undefined && balance < needed ? INSUFFICIENT : INK;
        });
    }

    /** 沿用原属性文案及万分比数值，速度使用整数更新。 */
    private attributeText(node: GuildTechnologyBranch["nodes"][number], amount = node.increment): string {
        const format = GameConfig.instance.getConfig(GConfig.Language, 2140000 + node.attributeId)?.value;
        return format?.replace("##p##", String(amount / 100)).replace("%d", String(amount)) ?? "—";
    }

    /** 只有权威进度前进后才播放原点亮动画和音效，每圈首格额外播升阶动画。 */
    private playPoint(index: number): void {
        const point = this.pointEffect!;
        point.node.setPosition(this.nodes[index].node.position);
        this.playFrames(point, this.pointFrames, POINT_FRAME_SECONDS);
        if (index === 0) {
            this.playFrames(this.stageEffect!, this.stageFrames, STAGE_FRAME_SECONDS);
        }
        if (this.pointAudio) {
            AudioPreferences.playEffect(this.pointAudio);
        }
    }

    /** 在预制挂点按原顺序播放帧，同一挂点的新动画替换上一轮。 */
    private playFrames(sprite: Sprite, frames: readonly SpriteFrame[], frameSeconds: number): void {
        const target = sprite.node;
        Tween.stopAllByTarget(target);
        sprite.spriteFrame = frames[0];
        target.active = true;
        const playback = tween(target);
        for (const frame of frames.slice(1)) {
            playback.delay(frameSeconds).call(() => { sprite.spriteFrame = frame; });
        }
        playback.delay(frameSeconds).call(() => { target.active = false; }).start();
    }

    /** 切职业、重置或关闭时清除上次的点亮反馈和声音，保留原方向箭头。 */
    private stopEffects(): void {
        for (const effect of [this.pointEffect, this.stageEffect]) {
            if (effect?.isValid) {
                Tween.stopAllByTarget(effect.node);
                effect.node.active = false;
            }
        }
        if (this.pointAudio?.isValid) {
            this.pointAudio.stop();
        }
    }

    /** 点击点亮后重新校验当前快照，服务端收到的只包含选中职业。 */
    private point(): void {
        const controller = GuildTechnologyController.instance;
        const state = GuildTechnologyModel.instance.state;
        if (controller.needsRetry || !state?.member) {
            controller.refreshVisible();
            return;
        }
        const branch = state.branches.find(row => row.profession === this.selected + 1);
        const next = branch?.next;
        if (!branch || !next || controller.busy) {
            return;
        }
        if (next.blocked) {
            UIManager.instance.toast(`请先将其他职业科技提升至${next.stage - state.stageGap}级`);
        } else if (this.medals() < next.medals || this.gold() < next.gold) {
            UIManager.instance.toast("材料不足");
        } else {
            controller.upgrade(branch.profession);
        }
    }

    /** 交由重置确认窗展示当前服务器报价，科技未点亮时保持旧版提示。 */
    private openReset(): void {
        const state = GuildTechnologyModel.instance.state;
        const branch = state?.branches.find(row => row.profession === this.selected + 1);
        if (!state?.member || !branch || GuildTechnologyController.instance.busy) {
            return;
        }
        if (!branch.step) {
            UIManager.instance.toast("该职业科技尚未点亮");
            return;
        }
        void UIManager.instance.openChild(this, GuildTechnologyResetView, {
            guildId: this.args!.guildId,
            account: this.args!.account,
            profession: branch.profession,
            version: state.version,
        }).catch(() => { /* UIManager 负责反馈开窗失败。 */ });
    }

    /** 查看旧职业科技规则，离会时失效且再次入会后恢复原进度。 */
    private openRules(): void {
        const config = GameConfig.instance;
        void UIManager.instance.openChild(this, RulesView, {
            title: config.getConfig(GConfig.Language, 42024)?.value ?? "公会技能",
            message: config.getConfig(GConfig.Language, 42025)?.value?.replace(/\\n/g, "\n")
                ?? "点亮科技可提高对应职业英雄的属性。离会后加成暂时失效，重新加入公会后恢复。",
        }).catch(() => { /* UIManager 负责反馈开窗失败。 */ });
    }

    /** 原费用图标打开同源物品说明。 */
    private showItem(itemId: number): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: BagItemCatalog.face(itemId, itemId === COST_IDS[0] ? this.medals() : this.gold()),
        }).catch(() => { /* UIManager 负责反馈开窗失败。 */ });
    }

    /** 从唯一背包模型读取勋章的实际库存。 */
    private medals(): number {
        return BagModel.instance.quantity(COST_IDS[0]);
    }

    /** 从角色权威钱包读取实际金币。 */
    private gold(): number {
        return this.args?.account.snapshot.role?.gold ?? 0;
    }
}
