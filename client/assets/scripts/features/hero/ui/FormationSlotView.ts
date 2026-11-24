/**
 * 出阵编辑的单个阵位，显示草稿英雄、开放状态和当前阵型的格位属性。
 * 头像外观复用名册绘制，整张卡归阵位的拖拽容器；服务器阵容由上层持有。
 */
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroPortraitDisplayUtils } from "../utils/HeroPortraitDisplayUtils";
import { HERO_FACE_FALLBACK } from "./HeroListPresentation";

const { ccclass, property } = _decorator;

/** 出阵页本次草稿中，实际占用这个格位的英雄显示数据。 */
export interface FormationSlotHero {
    readonly face: string | null;
    readonly stars: number;
    readonly level: number;
}

/** 格位的布局由预制体保存，出阵页传入本格的草稿状态。 */
@ccclass("FormationSlotView")
export class FormationSlotView extends Component {
    /** 服务端阵位编号，与界面数组顺序独立。 */
    @property({ tooltip: "服务端站位编号 1–9，与节点在数组中的顺序无关", min: 1, max: 9, step: 1 })
    position = 1;

    /** 由出阵页统一接收拖拽，本按钮决定本位是否允许操作。 */
    @property(Button) button: Button | null = null;

    /** 完整英雄卡容器，移动时图像、品质、等级和星级随它同行。 */
    @property(Node) portrait: Node | null = null;

    /** 容器中的纯头像 Sprite，不叠加元素图标。 */
    @property(Node) face: Node | null = null;

    /** 在头像背后的品质底框。 */
    @property(Sprite) rosterFrame: Sprite | null = null;

    /** 与英雄名册相同的 0～5 档品质图。 */
    @property([SpriteFrame]) rosterFrames: SpriteFrame[] = [];

    /** 与英雄名册相同的两种星星，依次为金星和紫星。 */
    @property([SpriteFrame]) rosterStarFrames: SpriteFrame[] = [];

    /** 普通星的五个预制体节点，位置由水平布局维护。 */
    @property([Node]) stars: Node[] = [];

    /** 十星起显示的翼徽。 */
    @property(Node) rosterStarBadge: Node | null = null;

    /** 十一至十三星时在翼徽上显示的数字。 */
    @property(Node) rosterStarBadgeNumber: Node | null = null;

    /** 英雄实际等级，使用预制体中的右上角白字。 */
    @property(Label) levelLabel: Label | null = null;

    /** 当前阵型不允许使用此格时显示。 */
    @property(Node) lock: Node | null = null;

    /** 普通位显示属性加成，助阵位保留预制体文案。 */
    @property(Label) caption: Label | null = null;

    /** 检查预制体有完整的头像卡、状态及合法的服务端编号。 */
    public validateBindings(): void {
        const prefix = "assets/bundles/module/hero/prefabs/FormationView.prefab / " + this.node.name + " / FormationSlotView: ";
        const required = {
            button: this.button,
            portrait: this.portrait,
            face: this.face?.getComponent(Sprite),
            lock: this.lock,
            caption: this.caption,
            levelLabel: this.levelLabel,
        };
        for (const [field, value] of Object.entries(required)) {
            if (!value) {
                throw new Error(prefix + "缺失绑定 " + field);
            }
        }
        if (!HeroPortraitDisplayUtils.hasRankBindings(this)) {
            throw new Error(prefix + "缺失品质框或星级资源");
        }
        if (!Number.isInteger(this.position) || this.position < 1 || this.position > 9) {
            throw new Error(prefix + "position 必须为 1–9");
        }
    }

    /** 开放格可绘制草稿英雄和格位加成，空位仅保留加成；bonus 为 null 保留助战文案。 */
    public show(allowed: boolean, busy: boolean, hero: FormationSlotHero | null, bonus: string | null): void {
        this.button!.interactable = allowed && !busy;
        this.lock!.active = !allowed;
        this.paintHero(allowed ? hero : null);
        if (bonus !== null) {
            this.caption!.string = bonus;
            this.caption!.node.active = allowed && bonus.length > 0;
        }
    }

    /** 显示整张英雄卡；交换或撤下时立即取消旧头像，避免读到上一格的英雄。 */
    private paintHero(hero: FormationSlotHero | null): void {
        const face = this.face!;
        this.portrait!.active = hero !== null;
        face.getComponent(Sprite)!.spriteFrame = null;
        const source = hero?.face ? [hero.face, HERO_FACE_FALLBACK] : HERO_FACE_FALLBACK;
        ResManager.setSprite(face, hero ? source : null);
        HeroPortraitDisplayUtils.paintRank(this, hero?.stars ?? 0);
        HeroPortraitDisplayUtils.paintLevel(this.levelLabel!, hero?.level ?? null);
    }
}
