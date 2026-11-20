/**
 * 通用英雄获得窗口：复用旧RewardLayer的领取分支、RewardCell静态布局和原英雄/特效资源。
 * 由唯一奖励队列按原回执逐个展示，4/5星先播原揭幕帧再将英雄淡入；本窗不召唤、不发奖或修改名册。
 * 等级、星级和强化阶段只读冻结的真实发奖实例，关闭统一释放音效、骨骼及迟到资源，通知原队列一次。
 */
import { _decorator, AudioSource, Button, Label, Node, Sprite, SpriteFrame, UIOpacity } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GameProtocolCodecUtils } from "../../../platform/GameProtocolCodecUtils";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { HeroSkillView } from "../../hero/ui/HeroSkillView";
import { HeroSkillUtils, HeroSkillFace } from "../../hero/utils/HeroSkillUtils";
import type { HeroGrantItem } from "../data/RewardData";

/** 原通用队列的一次英雄展示，不携带召唤操作、凭证或当前名册。 */
export interface HeroRewardArgs {
    /** 本次真实事务的原UUID，与后续物品反馈共用。 */
    readonly receiptId: string;
    /** 本次真实创建并冻结的一个英雄实例；同回执多个英雄由原队列顺序打开。 */
    readonly hero: HeroGrantItem;
    /** 实际关闭并清理后单次通知，不能把打开排队当作已展示。 */
    readonly onClosed?: () => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-reward",
    prefab: "bundles/module/common/prefabs/HeroRewardView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("HeroRewardView")
export class HeroRewardView extends BaseView<HeroRewardArgs> {
    /** 原RewardCell完整内容容器，静态位置与0.8展示组保存在Prefab。 */
    @property(Node) panel: Node | null = null;
    /** 4/5星完整展示区；低星隐藏，改用原单格获得形式。 */
    @property(Node) highStar: Node | null = null;
    /** 原英雄骨骼挂点，关闭销毁本窗动态子节点。 */
    @property(Node) heroHost: Node | null = null;
    /** 旧两路prophet-tree循环骨骼的静态挂点，顺序与缩放由Prefab保存。 */
    @property([Node]) auraHosts: Node[] = [];
    /** 原揭幕帧，4/5星分别使用zi/jin原序列。 */
    @property(Sprite) introduction: Sprite | null = null;
    /** 旧星级循环帧，揭幕后开始，不把其寿命作为队列关闭屏障。 */
    @property(Sprite) heroEffect: Sprite | null = null;
    /** 原prophet-tree竖向光柱，揭幕后在英雄上层显示。 */
    @property(Sprite) heroLight: Sprite | null = null;
    /** 原名字条上方语言名称，不从当前名册反推。 */
    @property(Label) heroName: Label | null = null;
    /** 模板describe真实语言文本。 */
    @property(Label) heroDescription: Label | null = null;
    /** 真实模板元素图标。 */
    @property(Sprite) element: Sprite | null = null;
    /** 五个原星级节点，模板低星不伪造五星。 */
    @property([Node]) stars: Node[] = [];
    /** 冻结实例对应的四个只读技能图标，由原详情窗展示说明。 */
    @property([Sprite]) skillIcons: Sprite[] = [];
    /** 技能入口只读，不触发升级、强化或召唤。 */
    @property([Button]) skillButtons: Button[] = [];
    /** 三星及以下沿旧单英雄格，不新增另一份获得队列。 */
    @property(Node) lowStar: Node | null = null;
    /** 低星英雄格的真实头像。 */
    @property(Sprite) lowIcon: Sprite | null = null;
    /** 低星配置名称及原星级文字。 */
    @property(Label) lowName: Label | null = null;
    /** 原确定按钮，不提供再次招募或分享写入口。 */
    @property(Button) confirm: Button | null = null;
    /** 标题光效与单次彩带沿通用获得资源，静态位置由Prefab保存。 */
    @property(Sprite) titleEffect: Sprite | null = null;
    /** 原通用获得彩带只播一次，关闭或资源迟到不重新开始。 */
    @property(Sprite) confetti: Sprite | null = null;
    /** 本窗唯一获得音源，关页停止且解除clip引用。 */
    @property(AudioSource) rewardAudio: AudioSource | null = null;
    /** 当前显示参数指纹，重复同参不重播，另一实例必须先关原窗。 */
    private signature = "";
    /** 页面资源准备代次，开关递增，迟到结果不能恢复旧窗口。 */
    private preparation = 0;
    /** true表示本显示期已结束，不再推进帧或响应按钮。 */
    private released = true;
    /** 仅准备完成后启用update，资源等待不消耗揭幕帧。 */
    private presentationReady = false;
    /** 本窗已准备的揭幕、循环、标题与彩带原帧；引用仍归节点原资源池。 */
    private frames: readonly (readonly SpriteFrame[])[] = [];
    /** 从资源就绪开始累计的秒数，重复onOpen保持原进度。 */
    private elapsed = 0;
    /** 原揭幕帧长度对应的秒数；低星为0，不人为增加召唤等待。 */
    private revealSeconds = 0;
    /** 冻结实例投影的只读技能，不随后来名册成长改变。 */
    private skills: readonly HeroSkillFace[] = [];
    /** 本窗动态模型与两路光效，关闭时先销毁再释放原队列。 */
    private ownedNodes: Node[] = [];
    /** 本次参数关闭回调，取走后单次通知，异常不重复推进。 */
    private closedCallback: (() => void) | undefined;

    /** 校验完整静态绑定，按钮和适配沿BaseView生命周期统一清理。 */
    public onBind(): void {
        if (!this.panel || !this.highStar || !this.heroHost || this.auraHosts.length !== 2
            || !this.introduction || !this.heroEffect || !this.heroLight || !this.heroName || !this.heroDescription || !this.element
            || this.stars.length !== 5 || this.skillIcons.length !== 4 || this.skillButtons.length !== 4
            || !this.lowStar || !this.lowIcon || !this.lowName || !this.confirm
            || !this.titleEffect || !this.confetti || !this.rewardAudio) {
            throw new Error("英雄获得窗口静态绑定缺失");
        }
        this.confirm.node.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => this.confirm?.node.off(Button.EventType.CLICK, this.close, this));
        this.skillButtons.forEach((button, slot) => {
            const show = () => this.showSkill(slot);
            button.node.on(Button.EventType.CLICK, show);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, show));
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 展示真实冻结实例；同回执同实例重复参数不重播，不用模板代替持久身份。 */
    public onOpen(args: HeroRewardArgs): void {
        if (!args || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(args.receiptId)
            || (args.onClosed !== undefined && typeof args.onClosed !== "function")) {
            throw new Error("英雄获得窗口参数无效");
        }
        const hero = GameProtocolCodecUtils.validateHeroGrants([args.hero],
            [{ itemId: args.hero?.templateId, credited: 1 }])[0];
        const signature = JSON.stringify([args.receiptId, hero]);
        if (!this.released) {
            if (this.signature !== signature) {
                throw new Error("当前英雄获得反馈尚未关闭或内容不一致");
            }
            this.closedCallback = args.onClosed ?? this.closedCallback;
            return;
        }
        const config = GameConfig.instance;
        const template = config.requireConfig(GConfig.HeroType, hero.templateId);
        if (template.star !== hero.star || hero.star > 5 || template.describe === undefined) {
            throw new Error("英雄获得星级与原模板不一致");
        }
        const name = config.requireConfig(GConfig.Language, hero.templateId).value;
        const description = config.requireConfig(GConfig.Language, template.describe).value;
        if (typeof name !== "string" || !name.trim() || typeof description !== "string" || !description.trim()) {
            throw new Error("英雄获得名称或说明语言缺失：" + hero.templateId);
        }
        this.beginOpen();
        this.args = { ...args, hero };
        this.signature = signature;
        this.released = false;
        this.presentationReady = false;
        this.elapsed = 0;
        this.closedCallback = args.onClosed;
        this.panel!.active = false;
        this.heroName!.string = name;
        this.heroDescription!.string = description;
        this.lowName!.string = this.heroName!.string + "  " + "★".repeat(hero.star);
        this.highStar!.active = hero.star > 3;
        this.lowStar!.active = hero.star <= 3;
        this.skills = HeroSkillUtils.present({ id: hero.instanceId, templateId: hero.templateId,
            level: hero.level, star: hero.star, stage: hero.stage });
        this.stars.forEach((node, index) => { node.active = index < hero.star; });
        this.skillButtons.forEach((button, index) => {
            button.interactable = this.skills[index].available && this.skills[index].id > 0;
            button.node.active = this.skills[index].id > 0;
        });
        const preparation = ++this.preparation;
        void this.prepare(hero, preparation).catch(error => {
            if (this.current(preparation)) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 原资源统一在此准备；高星骨骼尚未就绪不露主体，关闭后的成功不挂载或播放。 */
    private async prepare(hero: HeroGrantItem, preparation: number): Promise<void> {
        const resources = ResourceAssetsUtils.forNode(this.node);
        const template = GameConfig.instance.requireConfig(GConfig.HeroType, hero.templateId);
        if (!template.elem || !template.item_id) {
            throw new Error("英雄获得元素或头像配置缺失：" + hero.templateId);
        }
        const color = hero.star === 5 ? "jin" : "zi";
        const paths = hero.star > 3 ? [
            ["reward-effect2_" + color + "-", 10],
            ["reward-effect_" + color + "-xun-", 6],
        ] as const : [["", 0], ["", 0]] as const;
        const sequences = [...paths, ["item-reward_effect-", 10], ["item-reward-effect-2_effect-bomb-", 11]] as const;
        const [frames, clip, element, icons, portrait] = await Promise.all([
            Promise.all(sequences.map(([prefix, count]) => Promise.all(Array.from({ length: count }, (_, index) =>
                ResManager.getSpriteFrame(this.node, ResManager.ui("common", prefix + index)))))),
            resources.loadPath("audio/" + (hero.star === 5 ? "summon5" : hero.star === 4 ? "summon4" : "summonlist"), "AudioClip"),
            ResManager.getSpriteFrame(this.node, ResManager.ui("hero", "hero-icon_elem-"
                + template.elem)),
            Promise.all(this.skills.map(skill => skill.icon
                ? ResManager.getSpriteFrame(this.node, skill.icon) : Promise.resolve(null))),
            hero.star > 3 ? this.mountModels(hero, preparation) : ResManager.getSpriteFrame(this.node,
                ResManager.hero(template.item_id)!),
        ]);
        if (!this.current(preparation)) {
            return;
        }
        this.frames = frames;
        this.revealSeconds = frames[0].length * 0.06;
        this.element!.spriteFrame = element;
        this.skillIcons.forEach((sprite, index) => { sprite.spriteFrame = icons[index]; });
        if (hero.star <= 3) {
            this.lowIcon!.spriteFrame = portrait as SpriteFrame;
        }
        this.rewardAudio!.clip = clip;
        AudioPreferences.playEffect(this.rewardAudio!);
        this.presentationReady = true;
        this.panel!.active = true;
        this.update(0);
        this.finishOpen();
    }

    /** 原英雄及两路常驻特效各归本窗已有挂点；任何加载失败让开窗失败，不伪装头像替代高星演出。 */
    private async mountModels(hero: HeroGrantItem, preparation: number): Promise<void> {
        const portrait = new Promise<void>((resolve, reject) => {
            const actor = BattleSpineService.instance.mountBattleSpine(this.heroHost!, String(hero.templateId),
                () => reject(new Error("英雄获得立绘加载失败：" + hero.templateId)),
                { seatY: 0, scale: 2.1, onReady: resolve });
            const opacity = actor.node.getComponent(UIOpacity) || actor.node.addComponent(UIOpacity);
            opacity.opacity = 0;
            this.ownedNodes.push(actor.node);
        });
        const effects = this.auraHosts.map((host, index) => new Promise<void>((resolve, reject) => {
            host.active = false;
            const node = new Node("RewardAura" + index);
            node.layer = host.layer;
            node.parent = host;
            this.ownedNodes.push(node);
            BattleSpineService.instance.mountNamedSpine(node, "prophet-tree-effect-" + (index === 0 ? 2 : 1), "stand",
                { loop: true, legacyPmaTexture: true, onReady: resolve,
                    onFail: () => reject(new Error("英雄获得光效加载失败")) });
        }));
        await Promise.all([portrait, ...effects]);
        if (!this.current(preparation)) {
            return;
        }
    }

    /** 以原帧间隔推进揭幕/循环/彩带；揭幕后英雄独立2秒淡入，不增加3秒召唤流程。 */
    public update(deltaSeconds: number): void {
        if (!this.presentationReady || this.released || !this.panel?.isValid) {
            return;
        }
        this.elapsed += Math.max(0, deltaSeconds);
        const [intro, loop, title, confetti] = this.frames;
        const revealing = this.elapsed < this.revealSeconds;
        this.introduction!.node.active = revealing;
        this.heroEffect!.node.active = !revealing && loop.length > 0;
        this.heroLight!.node.active = !revealing && this.highStar!.active;
        if (revealing) {
            this.introduction!.spriteFrame = intro[Math.min(intro.length - 1, Math.floor(this.elapsed / 0.06))];
        }
        if (loop.length) {
            this.heroEffect!.spriteFrame = loop[Math.floor(Math.max(0, this.elapsed - this.revealSeconds) / 0.12) % loop.length];
        }
        this.titleEffect!.spriteFrame = title[Math.floor(this.elapsed / 0.12) % title.length];
        const confettiIndex = Math.floor(this.elapsed / 0.08);
        this.confetti!.node.active = confettiIndex < confetti.length;
        this.confetti!.spriteFrame = confetti[Math.min(confettiIndex, confetti.length - 1)];
        this.auraHosts.forEach(node => { node.active = !revealing && this.highStar!.active; });
        const model = this.ownedNodes[0];
        if (model?.isValid) {
            const progress = Math.max(0, Math.min(1, (this.elapsed - this.revealSeconds) / 2));
            model.getComponent(UIOpacity)!.opacity = 255 * (progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress));
        }
    }

    /** 技能说明复用已有详情窗，冻结发放时阶段，不读取后来名册或触发养成。 */
    private showSkill(slot: number): void {
        const skill = this.skills[slot];
        if (this.released || !this.presentationReady || !skill?.id || !skill.available) {
            return;
        }
        void UIManager.instance.openChild(this, HeroSkillView, { slot, readonlyFace: skill })
            .catch(() => { /* 取消与打开失败由UIManager统一反馈。 */ });
    }

    /** 仅当前显示期接纳资源，账号隔离仍归应用与唯一奖励队列。 */
    private current(preparation: number): boolean {
        return !this.released && this.preparation === preparation && this.node.isValid;
    }

    /** 停止音效、清动态骨骼与帧引用，关闭后回调一次；不删除原事务或改名册。 */
    public onClose(): void {
        this.released = true;
        this.presentationReady = false;
        this.preparation++;
        this.frames = [];
        this.skills = [];
        this.signature = "";
        this.args = undefined;
        try {
            if (this.rewardAudio?.isValid) {
                try {
                    this.rewardAudio.stop();
                } finally {
                    this.rewardAudio.clip = null;
                }
            }
        } finally {
            for (const node of this.ownedNodes) {
                if (node.isValid) {
                    node.destroy();
                }
            }
            this.ownedNodes = [];
            for (const sprite of [this.introduction, this.heroEffect, this.titleEffect,
                this.confetti, this.element, this.lowIcon, ...this.skillIcons]) {
                if (sprite?.isValid) {
                    sprite.spriteFrame = null;
                }
            }
            this.finishOpen();
            const callback = this.closedCallback;
            this.closedCallback = undefined;
            if (callback) {
                void Promise.resolve().then(callback).catch(error => {
                    GameLog.shared.classified("MODULE", "error", "HeroRewardView", "英雄获得关闭回调失败：" + String(error));
                });
            }
        }
    }

    /** 异常销毁与正常关闭共用清理，队列不因重复dispose推进两次。 */
    public dispose(): void {
        if (!this.released || this.closedCallback) {
            this.onClose();
        }
    }
}
