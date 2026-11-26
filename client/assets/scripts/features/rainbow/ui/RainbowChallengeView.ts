/**
 * 彩虹圣殿神位详情：显示守军模型、原技能、占领者、称号加成和挑战条件。
 * 页面只保存本次进化次数意图，独立出阵和赛果交给圣殿主页。
 */
import { _decorator, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RainbowSeat } from "../../../platform/Protocol";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import type { SpineActor } from "../../battle/ui/BattleSpineService";
import { HeroSkillView } from "../../hero/ui/HeroSkillView";
import type { HeroSkillFace } from "../../hero/utils/HeroSkillUtils";
import { RainbowController } from "../RainbowController";
import { RainbowModel } from "../RainbowModel";
import { RainbowPresentationUtils } from "../utils/RainbowPresentationUtils";

const { ccclass, property } = _decorator;

/** 由主页提供稳定的挑战目标和子窗导航。 */
export interface RainbowChallengeArgs {
    /** 当前详情绑定的神位 ID，刷新时按此 ID 读取最新占位。 */
    readonly seatId: number;
    /** 当前登录角色的持久 ID，仅用于判断该座是否由本人占有。 */
    readonly roleId: string;
    /** 转交按已选进化次数继续出阵的意图。 */
    readonly prepareFight: (seatId: number, evolution: number) => void;
    /** 打开神位的战报列表。 */
    readonly openHistory: () => void;
    /** 转交竞技场资格入口。 */
    readonly openArena: () => void;
}

@UIRegistry.view({
    id: "rainbow-challenge", prefab: "bundles/module/rainbow/prefabs/RainbowChallengeView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RainbowChallengeView")
export class RainbowChallengeView extends BaseView<RainbowChallengeArgs> {
    /** 守军、技能和选项使用同一个纸面随可见区缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 退出挑战详情回到神位地图。 */
    @property(Button) private closeButton: Button | null = null;
    /** 当前神位历史记录按钮。 */
    @property(Button) private historyButton: Button | null = null;
    /** 请求进入实际竞技场以提升名次。 */
    @property(Button) private arenaButton: Button | null = null;
    /** 通过资格校验后交给主页进入出阵。 */
    @property(Button) private challengeButton: Button | null = null;
    /** 挑战或已占领状态的按钮文案。 */
    @property(Label) private challengeCaption: Label | null = null;
    /** 顺序为进化 1、5、10 次的点击区。 */
    @property([Button]) private options: Button[] = [];
    /** 与三个选项一一对应的勾选图。 */
    @property([Node]) private checks: Node[] = [];
    /** 有玩家占位时展示身份，没有占领者时隐藏整组。 */
    @property(Node) private owner: Node | null = null;
    /** 占领玩家配戴的头像图。 */
    @property(Sprite) private avatar: Sprite | null = null;
    /** 占领玩家配戴的头像框。 */
    @property(Sprite) private avatarBorder: Sprite | null = null;
    /** 当前神位玩家名称。 */
    @property(Label) private ownerName: Label | null = null;
    /** 当前神位玩家角色等级。 */
    @property(Label) private ownerLevel: Label | null = null;
    /** 神位人物待机动画的静态挂点。 */
    @property(Node) private hero: Node | null = null;
    /** 当前类型对应的原始称号徽记。 */
    @property(Sprite) private title: Sprite | null = null;
    /** 服务端快照当前累计进化次数。 */
    @property(Label) private evolution: Label | null = null;
    /** 称号固定攻击百分比加成。 */
    @property(Label) private attackBonus: Label | null = null;
    /** 称号固定生命百分比加成。 */
    @property(Label) private healthBonus: Label | null = null;
    /** 此神位资格门槛与当前竞技场名次。 */
    @property(Label) private rank: Label | null = null;
    /** 从服务端截止时间计算的剩余冷却。 */
    @property(Label) private cooldown: Label | null = null;
    /** 先主动 2 个再被动 4 个的六个静态图标槽。 */
    @property([Sprite]) private iconSprites: Sprite[] = [];
    /** 六个槽的同等级数字覆盖层。 */
    @property([Label]) private skillLevels: Label[] = [];
    /** 点击后访问同一英雄技能说明窗口，空槽隐藏。 */
    @property([Button]) private skillButtons: Button[] = [];
    /** 按神位类型 1～3 保存的原称号 SpriteFrame。 */
    @property([SpriteFrame]) private titleFrames: SpriteFrame[] = [];
    /** 当前界面上选择的进化次数，首次打开默认为 1。 */
    private chosenEvolution = 1;
    /** 当前展示的头像身份缓存，仅用于避免重挂同一头像。 */
    private portraitKey = "";
    /** 当前已经绑定技能栈与占领者的最新神位对象。 */
    private shownSeat: RainbowSeat | null = null;
    /** 当前详情待机演员；换形象或关闭时销毁。 */
    private actor: SpineActor | null = null;

    /** 完成静态绑定和一次状态读取；后续时间流动只刷新资格。 */
    public onOpen(args?: RainbowChallengeArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.closeButton || !this.historyButton || !this.arenaButton
            || !this.challengeButton || !this.challengeCaption || !this.owner || !this.avatar
            || !this.avatarBorder || !this.ownerName || !this.ownerLevel || !this.hero || !this.title
            || !this.evolution || !this.attackBonus || !this.healthBonus || !this.rank || !this.cooldown
            || this.options.length !== 3 || this.checks.length !== 3 || this.titleFrames.length !== 3
            || this.skillButtons.length !== 6 || this.iconSprites.length !== 6 || this.skillLevels.length !== 6) {
            throw new Error("彩虹圣殿挑战窗的参数或预制体绑定缺失");
        }
        this.ownListener(RainbowPresentationUtils.bindButton(this.closeButton, () => this.close()));
        this.ownListener(RainbowPresentationUtils.bindButton(this.historyButton, args.openHistory));
        this.ownListener(RainbowPresentationUtils.bindButton(this.arenaButton, () => {
            this.close();
            args.openArena();
        }));
        this.ownListener(RainbowPresentationUtils.bindButton(this.challengeButton, () => this.fight()));
        this.options.forEach((button, index) => {
            const count = [1, 5, 10][index];
            this.ownListener(RainbowPresentationUtils.bindButton(button, () => this.selectEvolution(count)));
        });
        this.skillButtons.forEach((button, index) => {
            this.ownListener(RainbowPresentationUtils.bindButton(button, () => this.openSkill(index)));
        });
        this.ownListener(EventDispatcher.instance.on("rainbow.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => RainbowPresentationUtils.fitPanel(this.node, this.panel!)));
        this.selectEvolution(1);
        this.paint();
        this.schedule(this.paintEligibility, 1);
    }

    /** 停止时间刷新，让角色演员和资源持有者随窗口退出。 */
    public onClose(): void {
        this.unschedule(this.paintEligibility);
        this.actor?.node.destroy();
        this.actor = null;
        this.shownSeat = null;
        this.portraitKey = "";
    }

    /** 仅在服务端神位状态发生改变时更新技能、肖像和属性静态区。 */
    private paint(): void {
        const seat = RainbowModel.instance.state?.seats.find(row => row.id === this.args?.seatId);
        if (!seat) {
            this.close();
            return;
        }
        if (seat !== this.shownSeat) {
            if (!this.shownSeat || RainbowPresentationUtils.skinId(this.shownSeat) !== RainbowPresentationUtils.skinId(seat)) {
                this.actor?.node.destroy();
                this.actor = RainbowPresentationUtils.mountStand(this.hero!, RainbowPresentationUtils.skinId(seat), 0.86);
            }
            this.shownSeat = seat;
            this.title!.spriteFrame = this.titleFrames[seat.type - 1];
            this.evolution!.string = RainbowPresentationUtils.language(54252)
                .replace(/<[^>]+>/g, "").replace("%s", String(seat.evolution));
            this.attackBonus!.string = "攻击 +" + RainbowPresentationUtils.bonus(seat.attackBonus);
            this.healthBonus!.string = "生命 +" + RainbowPresentationUtils.bonus(seat.healthBonus);
            this.paintOwner(seat.owner);
            this.paintSkills();
        }
        this.paintEligibility();
    }

    /** 用角色头像和框映射展示实际占领者，缺席时保持原窗留空。 */
    private paintOwner(owner: RainbowSeat["owner"]): void {
        this.owner!.active = !!owner;
        if (!owner) {
            this.portraitKey = "";
            return;
        }
        this.ownerName!.string = owner.name;
        this.ownerLevel!.string = String(owner.level);
        const key = owner.headId + ":" + owner.borderId;
        if (key !== this.portraitKey) {
            this.portraitKey = key;
            RolePortraitUtils.paint(this.avatar!.node, this.avatarBorder!.node, owner.headId, owner.borderId);
        }
    }

    /** 同时展示个人名次、条件和冷却，自己的神位仅可查看。 */
    private paintEligibility(): void {
        const state = RainbowModel.instance.state;
        const seat = this.shownSeat;
        if (!state || !seat) {
            return;
        }
        const ownSeat = seat.owner?.roleId === this.args?.roleId;
        const remaining = RainbowPresentationUtils.remaining(state.cooldownUntil);
        this.rank!.string = "竞技场前 " + seat.requiredRank + " 名可挑战　当前名次：" + (state.arenaRank || "未上榜");
        this.cooldown!.string = remaining ? RainbowPresentationUtils.language(54306)
            .replace("%s", RainbowPresentationUtils.countdown(remaining)) : "";
        const controller = RainbowController.instance;
        this.challengeButton!.interactable = controller.needsRetry || (!ownSeat && !controller.busy);
        this.challengeCaption!.string = controller.needsRetry ? "恢复挑战" : ownSeat ? "已占领" : "挑战";
    }

    /** 保存本次挑战参数，更新三个复选框且保持互斥。 */
    private selectEvolution(count: number): void {
        this.chosenEvolution = count;
        this.checks.forEach((node, index) => {
            node.active = [1, 5, 10][index] === count;
        });
    }

    /** 按原 2 个主动与 4 个被动槽位置读取服务器技能定义。 */
    private skillAt(index: number): RainbowSeat["activeSkills"][number] | undefined {
        return index < 2 ? this.shownSeat?.activeSkills[index] : this.shownSeat?.passiveSkills[index - 2];
    }

    /** 将服务器技能映射到已经导入的图标，等级来自该神位配置。 */
    private paintSkills(): void {
        this.skillButtons.forEach((button, index) => {
            const skill = this.skillAt(index);
            button.node.active = !!skill;
            if (skill) {
                this.skillLevels[index].string = String(skill.level);
                ResManager.setSprite(this.iconSprites[index].node, ResManager.skill(skill.id));
            }
        });
    }

    /** 将神位技能按同等级语言行交给通用只读详情窗。 */
    private openSkill(index: number): void {
        const skill = this.skillAt(index);
        if (!skill) {
            return;
        }
        const config = GameConfig.instance;
        const row = config.getConfig(GConfig.HeroSkill).find(item => item.type === skill.id && item.level === skill.level);
        const name = row && config.getConfig(GConfig.Language, row.lan_name)?.value;
        const description = row && config.getConfig(GConfig.Language, row.lan_describe)?.value;
        if (!name || !description) {
            UIManager.instance.toast("该技能说明暂不可用");
            return;
        }
        const face: HeroSkillFace = {
            slot: 0, id: skill.id, level: skill.level, available: true, unlockStage: null,
            name, description, icon: ResManager.skill(skill.id),
        };
        void UIManager.instance.openChild(this, HeroSkillView, { slot: 0, readonlyFace: face })
            .catch(() => { /* 失败由统一开窗入口反馈。 */ });
    }

    /** 明确反馈资格不足和冷却，服务端在实际挑战时仍会重新核实。 */
    private fight(): void {
        const state = RainbowModel.instance.state;
        const seat = this.shownSeat;
        const controller = RainbowController.instance;
        if (controller.needsRetry) {
            controller.refreshVisible();
            return;
        }
        if (!state || !seat || controller.busy || seat.owner?.roleId === this.args?.roleId) {
            return;
        }
        if (!state.arenaRank || state.arenaRank > seat.requiredRank) {
            UIManager.instance.toast(RainbowPresentationUtils.language(54305).replace("%s", String(seat.requiredRank)));
            return;
        }
        const remaining = RainbowPresentationUtils.remaining(state.cooldownUntil);
        if (remaining === null) {
            UIManager.instance.toast("正在同步圣殿状态");
            return;
        }
        if (remaining > 0) {
            UIManager.instance.toast(RainbowPresentationUtils.language(54306)
                .replace("%s", RainbowPresentationUtils.countdown(remaining)));
            return;
        }
        this.args?.prepareFight(seat.id, this.chosenEvolution);
    }
}
