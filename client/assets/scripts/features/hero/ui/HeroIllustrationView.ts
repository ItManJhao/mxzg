/**
 * 英雄图鉴与进化图鉴的只读预览。布局、导航按钮和技能挂点由 Prefab 提供；
 * 属性从旧配置计算，素材加载和前后翻页不读取或改变已拥有英雄的实例。
 */
import { _decorator, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import { ResourceAssetsUtils, type AssetScope } from "../../../framework/assets/ResourceAssetsUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BattleSpineService, type SpineActor } from "../../battle/ui/BattleSpineService";
import { HeroGrowthDisplayUtils } from "../utils/HeroGrowthDisplayUtils";
import {
    HeroIllustrationUtils,
    type HeroIllustrationBranch,
    type HeroIllustrationEntry,
    type HeroIllustrationPreview,
} from "../utils/HeroIllustrationUtils";
import { HeroPortraitUtils } from "../utils/HeroPortraitUtils";
import { HeroSkillUtils, type HeroSkillFace } from "../utils/HeroSkillUtils";
import { HeroSkillView } from "./HeroSkillView";

/** 当前图鉴的筛选结果和起始索引均由打开方提供。 */
interface HeroIllustrationArgs {
    readonly entries: readonly HeroIllustrationEntry[];
    readonly index: number;
    readonly evolution?: boolean;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-illustration",
    prefab: "bundles/module/hero/prefabs/HeroIllustrationView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("HeroIllustrationView")
export class HeroIllustrationView extends BaseView<HeroIllustrationArgs> {
    /** 与原英雄详情共用的回退入口。 */
    @property(Button) private backButton: Button | null = null;
    /** 当所选条目之前还有配置时显示。 */
    @property(Button) private previousButton: Button | null = null;
    /** 当所选条目之后还有配置时显示。 */
    @property(Button) private nextButton: Button | null = null;
    /** 名称及对应元素，不读取实例昵称。 */
    @property(Label) private nameLabel: Label | null = null;
    /** 跟随名称显示当前元素标识。 */
    @property(Node) private elementIcon: Node | null = null;
    /** 金星或紫星的五个显示位置。 */
    @property([Node]) private stars: Node[] = [];
    /** 十星以上的翼徽底图。 */
    @property(Node) private starBadge: Node | null = null;
    /** 十一至十三星叠在翼徽上的数字。 */
    @property(Node) private starNumber: Node | null = null;
    /** 职业名称和图标来自旧英雄与语言表。 */
    @property(Label) private profession: Label | null = null;
    /** 职业图标跟随当前预览条目。 */
    @property(Node) private professionIcon: Node | null = null;
    /** 最大等级和当前预览等级，图鉴两项均取星级上限。 */
    @property(Label) private level: Label | null = null;
    /** 预览阶级从左到右排列的进阶标记。 */
    @property([Node]) private grades: Node[] = [];
    /** 依次显示攻击、生命、防御与速度。 */
    @property([Label]) private attributes: Label[] = [];
    /** 普通图鉴的四个技能图标，空槽使用原版占位。 */
    @property([Button]) private skills: Button[] = [];
    /** 对应技能的名称，展示配置不足时说明缺失。 */
    @property([Label]) private skillNames: Label[] = [];
    /** 对应技能的等级角标，未解锁时隐藏。 */
    @property([Label]) private skillLevels: Label[] = [];
    /** 普通四技能区与进化技能对比区一次只显示其一。 */
    @property(Node) private skillRow: Node | null = null;
    /** 进化技能对比区，显示转化箭头和前后技能。 */
    @property(Node) private evolutionSkillRow: Node | null = null;
    /** 进化前、后的两个技能详情入口。 */
    @property([Button]) private evolutionSkills: Button[] = [];
    /** 进化前后的技能名称。 */
    @property([Label]) private evolutionSkillNames: Label[] = [];
    /** 进化两侧祭台的点击区，对应原配置两条分支。 */
    @property([Button]) private branchButtons: Button[] = [];
    /** 祭台静态 Sprite，切换时用原来的选中和未选中图。 */
    @property([Sprite]) private branchSeats: Sprite[] = [];
    /** 原祭台未选中、选中两张图。 */
    @property([SpriteFrame]) private branchSeatFrames: SpriteFrame[] = [];
    /** 两侧祭台展示配置中的分支名称。 */
    @property([Label]) private branchNames: Label[] = [];
    /** 两侧祭台展示实际最高进化等级。 */
    @property([Label]) private branchLevels: Label[] = [];
    /** 描述进化分支的名称和升级效果。 */
    @property(Label) private evolutionDescription: Label | null = null;
    /** 普通图鉴的立绘图层，透明图的锚点按既有立绘数据求得。 */
    @property(Sprite) private portrait: Sprite | null = null;
    /** 立绘缺失时从该挂点显示旧骨骼。 */
    @property(Node) private portraitFallback: Node | null = null;
    /** 进化前后两个骨骼挂点及其底座的共同父节点。 */
    @property(Node) private evolutionStage: Node | null = null;
    /** 两条进化分支的骨骼展示静态挂点。 */
    @property([Node]) private evolutionModels: Node[] = [];
    /** 图鉴当前索引，打开及左右切换时改变。 */
    private index = 0;
    /** 当前进化分支下标，普通图鉴不使用。 */
    private branch = 0;
    /** 当前技能说明的冻结值，翻页时随属性同步替换。 */
    private preview: HeroIllustrationPreview | null = null;
    /** 切换序号用于使迟到的图标绘制失效，关页时递增。 */
    private paintRevision = 0;
    /** 当前立绘的单独资源持有域，切换或关页即释放。 */
    private portraitScope: AssetScope | null = null;
    /** 当前的备用或进化骨骼，换页或关闭时销毁。 */
    private actors: SpineActor[] = [];

    /** 验证只读数据及 Prefab，再绑定本次所需的按钮。 */
    public onOpen(args: HeroIllustrationArgs): void {
        if (!args?.entries[args.index] || !this.backButton || !this.previousButton || !this.nextButton
            || !this.nameLabel || !this.elementIcon || !this.starBadge || !this.starNumber
            || !this.profession || !this.professionIcon || !this.level || this.attributes.length !== 4
            || this.skills.length !== 4 || this.skillNames.length !== 4 || this.skillLevels.length !== 4
            || !this.skillRow || !this.evolutionSkillRow || this.evolutionSkills.length !== 2
            || this.evolutionSkillNames.length !== 2 || !this.evolutionDescription || !this.portrait
            || !this.portraitFallback || !this.evolutionStage || this.evolutionModels.length !== 2
            || this.branchButtons.length !== 2 || this.branchSeats.length !== 2 || this.branchSeatFrames.length !== 2
            || this.branchNames.length !== 2 || this.branchLevels.length !== 2) {
            throw new Error("英雄图鉴预览缺少参数或预制体绑定");
        }
        super.onOpen(args);
        this.index = args.index;
        this.branch = 0;
        this.bind(this.backButton, () => this.close());
        this.bind(this.previousButton, () => this.step(-1));
        this.bind(this.nextButton, () => this.step(1));
        this.skills.forEach((button, index) => this.bind(button, () => this.showSkill(this.preview?.skills[index])));
        this.evolutionSkills.forEach((button, index) => this.bind(button, () => {
            const comparison = this.preview?.evolutionSkills;
            this.showSkill(index === 0 ? comparison?.before : comparison?.after);
        }));
        this.branchButtons.forEach((button, index) => this.bind(button, () => {
            if (index !== this.branch) {
                this.branch = index;
                this.refresh(false);
            }
        }));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
        this.refresh();
    }

    /** 关闭时使在途图标失效并立即释放当前立绘和骨骼。 */
    public onClose(): void {
        this.paintRevision++;
        this.clearArt();
        this.preview = null;
    }

    /** 页面销毁或重开均不会残留旧按钮监听。 */
    private bind(button: Button, action: () => void): void {
        const target = button.node;
        target.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (target.isValid) {
                target.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 按进入详情时的同元素顺序切换，边界之外不改变状态。 */
    private step(direction: -1 | 1): void {
        const next = this.index + direction;
        if (this.args?.entries[next]) {
            this.index = next;
            this.branch = 0;
            this.refresh();
        }
    }

    /** 用同一配置条目刷新满级面板；切分支时只刷新属性和选中状态，保留两个已加载的骨骼。 */
    private refresh(reloadArt = true): void {
        const entry = this.args!.entries[this.index];
        const branch = this.args!.evolution ? entry.evolutionBranches?.[this.branch] : undefined;
        const revision = ++this.paintRevision;
        const current = () => this.isValid && this.paintRevision === revision;
        this.preview = HeroIllustrationUtils.preview(entry, branch);
        this.nameLabel!.string = entry.name;
        this.level!.string = `等级：${entry.level}/${entry.level}`;
        const profession = GameConfig.instance.getConfig(GConfig.Language, 111000 + entry.occupation)?.value;
        this.profession!.string = profession ? `职业：${profession}` : "";
        this.professionIcon!.active = !!profession;
        ResManager.setSprite(this.professionIcon, profession ? ResManager.ui("hero", `hero-info_icon-occup-${entry.occupation}`) : null, current);
        ResManager.setSprite(this.elementIcon, ResManager.ui("hero", `hero-icon_elem-${entry.elem}`), current);
        this.paintRank(entry.stars, current);
        const attributes = this.preview;
        const values = [attributes?.attack, attributes?.hp, attributes?.defense, attributes?.speed];
        this.attributes.forEach((label, index) => { label.string = values[index]?.toString() ?? "—"; });
        this.grades.forEach((mark, index) => { mark.active = index < (attributes?.stage ?? 0); });
        this.previousButton!.node.active = this.index > 0;
        this.nextButton!.node.active = this.index + 1 < this.args!.entries.length;
        this.paintSkills(entry, branch, current);
        if (reloadArt) {
            this.paintArt(entry, current);
        } else {
            this.actors[this.branch]?.play("attack");
        }
    }

    /** 头部沿用名册星级规则，普通星级按当前颗数居中。 */
    private paintRank(rank: number, current: () => boolean): void {
        const shape = HeroGrowthDisplayUtils.starAppearance(rank);
        this.stars.forEach((star, index) => {
            star.active = index < shape.count;
            if (star.active) {
                ResManager.setSprite(star, shape.frame, current);
            }
        });
        this.starBadge!.active = !!shape.badge;
        this.starNumber!.active = !!shape.number;
        ResManager.setSprite(this.starBadge, shape.badge, current);
        ResManager.setSprite(this.starNumber, shape.number, current);
    }

    /** 普通技能展示四槽，进化条目展示旧技能到新技能及分支说明。 */
    private paintSkills(entry: HeroIllustrationEntry, branch: HeroIllustrationBranch | undefined, current: () => boolean): void {
        this.skillRow!.active = !this.args!.evolution;
        this.evolutionSkillRow!.active = !!this.args!.evolution;
        this.skills.forEach((button, index) => {
            const skill = this.preview?.skills[index];
            this.paintSkill(button, this.skillNames[index], skill, current);
            const badge = this.skillLevels[index].node.parent!;
            badge.active = !!skill?.level;
            this.skillLevels[index].string = skill?.level ? String(skill.level) : "";
        });
        const comparison = this.preview?.evolutionSkills;
        this.paintSkill(this.evolutionSkills[0], this.evolutionSkillNames[0], comparison?.before, current);
        this.paintSkill(this.evolutionSkills[1], this.evolutionSkillNames[1], comparison?.after, current);
        this.evolutionDescription!.string = [comparison?.after.description || branch?.description]
            .filter((text): text is string => !!text)
            .map(text => text.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, ""))
            .join("\n");
        this.branchButtons.forEach((button, index) => {
            const option = entry.evolutionBranches?.[index];
            button.node.active = !!option;
            button.interactable = !!option && index !== this.branch;
            this.branchSeats[index].spriteFrame = this.branchSeatFrames[index === this.branch ? 1 : 0];
            this.branchNames[index].string = option?.name ?? "";
            this.branchLevels[index].string = option ? `+${option.level}` : "";
        });
    }

    /** 未配置或未解锁槽显示原空图、灰态和真实可用说明。 */
    private paintSkill(button: Button, label: Label, skill: HeroSkillFace | undefined, current: () => boolean): void {
        button.interactable = !!skill?.id && skill.available;
        const sprite = button.node.getComponent(Sprite)!;
        sprite.grayscale = !!skill?.id && !skill.level;
        label.string = skill?.name ?? "";
        ResManager.setSprite(button.node, skill?.icon ?? "hero/ui/hero-info_spr-new-9", current);
    }

    /** 复用只读技能说明，不传入实例标识或发起培养请求。 */
    private showSkill(skill: HeroSkillFace | undefined): void {
        if (skill?.id && skill.available) {
            void UIManager.instance.openChild(this, HeroSkillView, { slot: skill.slot, readonlyFace: skill })
                .catch(() => { /* UIManager 负责报告加载异常。 */ });
        }
    }

    /** 进化同时展示两条分支的形态，普通图鉴优先显示该星级的全身图。 */
    private paintArt(entry: HeroIllustrationEntry, current: () => boolean): void {
        this.clearArt();
        const evolution = this.args!.evolution;
        this.evolutionStage!.active = !!evolution;
        if (evolution) {
            entry.evolutionBranches?.forEach((option, index) => this.mountActor(this.evolutionModels[index], option.fashionId, 1.55));
            return;
        }
        const art = HeroPortraitUtils.find(entry.templateId, entry.stars);
        if (!art) {
            this.mountActor(this.portraitFallback!, entry.skinId, 2.05);
            return;
        }
        const scope = ResourceAssetsUtils.createAssetScope();
        this.portraitScope = scope;
        void scope.load(ResourceAssetsUtils.sprite(art.path)).then(frame => {
            if (!current() || this.portraitScope !== scope) {
                return;
            }
            const sprite = this.portrait!;
            const [left, , right] = art.box;
            const scale = 490 * art.zoom / Math.max(1, right - left);
            const transform = sprite.node.getComponent(UITransform)!;
            sprite.spriteFrame = frame;
            transform.setContentSize(art.width, art.height);
            transform.setAnchorPoint((left + right) / 2 / art.width, 1);
            sprite.node.setPosition(art.offsetX, art.offsetY);
            sprite.node.setScale(scale, scale, 1);
            sprite.node.active = true;
        }, error => {
            if (current() && this.portraitScope === scope) {
                scope.dispose();
                this.portraitScope = null;
                GameLog.shared.warnOnce("MODULE", "HeroIllustrationView", "PORTRAIT:" + art.path, String(error));
                this.mountActor(this.portraitFallback!, entry.skinId, 2.05);
            }
        });
    }

    /** 将实际皮肤骨骼绑定到静态挂点；服务负责报告图片缺失。 */
    private mountActor(parent: Node, skinId: number, scale: number): void {
        this.actors.push(BattleSpineService.instance.mountBattleSpine(parent, String(skinId), () => {}, { scale }));
    }

    /** 丢弃上一形态的请求和绘制节点，重读时只保留当前条目的资源。 */
    private clearArt(): void {
        if (this.portrait?.isValid) {
            this.portrait.spriteFrame = null;
            this.portrait.node.active = false;
        }
        this.portraitScope?.dispose();
        this.portraitScope = null;
        for (const actor of this.actors) {
            if (actor.node.isValid) {
                actor.node.destroy();
            }
        }
        this.actors = [];
    }
}
