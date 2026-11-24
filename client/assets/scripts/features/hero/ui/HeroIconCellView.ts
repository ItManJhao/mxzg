/**
 * 英雄头像格子：按展示数据更新图片、等级、星级和调用方指定的红点。
 * 点击由列表派发给所属页面；本组件不持有选择回调、页面导航或名册状态。
 */
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { HeroPortraitDisplayUtils } from "../utils/HeroPortraitDisplayUtils";
import { HERO_FACE_FALLBACK, HeroCellModel } from "./HeroListPresentation";

const { ccclass, property } = _decorator;

const ELEMENT_FRAMES = [ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-0", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-1", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-2", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-3", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-4", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-5", "SpriteFrame")] as const;

/**
 * 英雄头像及标记由调用方的预制体绑定；名册预制体另配原版品质和星级资源。
 */
@ccclass("HeroIconCellView")
export class HeroIconCellView extends Component {
    @property(Button)
    button: Button | null = null;
    @property(Node)
    face: Node | null = null;

    @property(Label)
    nameLabel: Label | null = null;

    @property(Node)
    elem: Node | null = null;

    @property([Node])
    stars: Node[] = [];

    @property(Label)
    levelLabel: Label | null = null;

    @property(Node)
    lock: Node | null = null;

    @property(Node)
    battle: Node | null = null;

    /** 英雄名册的品质框。其他用途的头像格不绑定此字段。 */
    @property(Sprite) rosterFrame: Sprite | null = null;

    /** 名册品质框按日服编号 0～5 排列，编号 0 用于空位。 */
    @property([SpriteFrame]) rosterFrames: SpriteFrame[] = [];

    /** 名册普通星资源，按金星、紫星顺序绑定。 */
    @property([SpriteFrame]) rosterStarFrames: SpriteFrame[] = [];

    /** 名册十星及以上使用的翼徽，其他头像格不绑定。 */
    @property(Node) rosterStarBadge: Node | null = null;

    /** 十一至十三星叠在翼徽上的星差数字，随当前格子的星级刷新。 */
    @property(Node) rosterStarBadgeNumber: Node | null = null;

    /** 名册和创造法阵的可选红点锚点，保留预制体位置和尺寸。 */
    @property(Node)
    reminderAnchor: Node | null = null;

    /** 当前格绑定的英雄红点路径，未授权显示时为 null。 */
    private redDotPath: string | null = null;
    /** 格子的公共红点首次需要时创建，复用时只切换显示来源。 */
    private reminder: RedDotBinding | null = null;

    /** 图片绘制代次，复用和销毁时递增，拒绝旧图片覆盖当前格子。 */
    private revision = 0;

    /** 校验各头像格共有的绑定，以及名册预制体专有的品质与星级资源。 */
    validateBindings(): void {
        const fields = {
            button: this.button, face: this.face, nameLabel: this.nameLabel, elem: this.elem,
            levelLabel: this.levelLabel, lock: this.lock, battle: this.battle
        };
        for (const [field, value] of Object.entries(fields)) {
            if (!value) throw new Error("assets/bundles/module/hero/prefabs/HeroIconCellView.prefab / HeroIconCellView: 缺失绑定 " + field);
        }
        if (this.stars.length !== 5 || this.stars.some(star => !star))
            throw new Error("assets/bundles/module/hero/prefabs/HeroIconCellView.prefab / HeroIconCellView: stars 必须绑定五颗星");
        if (!this.face!.getComponent(Sprite))
            throw new Error("assets/bundles/module/hero/prefabs/HeroIconCellView.prefab / HeroIconCellView: face 缺少 Sprite");
        if (this.rosterFrame && !HeroPortraitDisplayUtils.hasRankBindings(this)) {
            throw new Error("英雄名册格缺少品质框或星级资源");
        }
    }

    /**
     * 更新格子显示和可选状态，并使复用前的头像请求和红点监听失效。
     * @param redDotPath 只由名册传入。省略或传 null 时隐藏红点。
     */
    show(cell: HeroCellModel, redDotPath: string | null = null): void {
        this.validateBindings();
        const revision = ++this.revision;
        const empty = cell.kind === "empty";
        this.paintFace(cell, empty, revision);
        this.paintName(cell, empty);
        this.paintElem(cell, empty, revision);
        const star = empty ? 0 : cell.stars;
        if (this.rosterFrame) {
            HeroPortraitDisplayUtils.paintRank(this, star, () => this.isValid && revision === this.revision);
        } else {
            HeroPortraitDisplayUtils.paintStars(this.stars, star);
        }
        if (this.levelLabel) {
            HeroPortraitDisplayUtils.paintLevel(this.levelLabel, empty ? null : cell.level);
        }
        if (this.lock) this.lock.active = !empty && cell.locked;
        if (this.battle) this.battle.active = !empty && cell.deployed && cell.kind === "owned";
        this.button!.interactable = !empty;
        this.redDotPath = redDotPath;
        if (this.enabled && this.node.activeInHierarchy) {
            this.refreshReminder();
        }
    }

    /** 回收格先接收数据再激活，激活时刷新当前行的提醒。 */
    public onEnable(): void {
        this.refreshReminder();
    }

    /** 格子离开视口或所属页面关闭时，隐藏红点并解除原条目订阅。 */
    public onDisable(): void {
        this.reminder?.bindPath(null);
    }

    /** 名册格订阅当前英雄的即时汇总；配方格可按列表传入的就绪状态直接展示。 */
    protected refreshReminder(): void {
        this.setReminder(this.redDotPath);
    }

    /** 使用英雄路径订阅汇总，或按配方是否就绪直接显示同一实例。 */
    protected setReminder(source: string | boolean | null): void {
        if (source && !this.reminder && this.reminderAnchor?.isValid) {
            this.reminder = RedDotBinding.atAnchor(this.reminderAnchor);
        }
        if (typeof source === "boolean") {
            this.reminder?.setVisible(source);
        } else {
            this.reminder?.bindPath(source);
        }
    }

    /** 头像仅接受本轮显示请求，空格或后续英雄不能被旧回包覆盖。 */
    private paintFace(cell: HeroCellModel, empty: boolean, revision: number): void {
        if (!this.face) return;
        const image = this.face.getComponent(Sprite);
        if (image) image.grayscale = !empty && cell.kind === "locked";
        if (empty || !cell.face) {
            this.face.active = false;
            return;
        }
        this.face.active = true;
        if (image) image.spriteFrame = null;
        ResManager.setSprite(this.face, [cell.face, HERO_FACE_FALLBACK], () => this.isValid && revision === this.revision);
    }

    private paintName(cell: HeroCellModel, empty: boolean): void {
        if (!this.nameLabel) return;
        const show = !empty && cell.showName && cell.name.length > 0;
        this.nameLabel.node.active = show;
        this.nameLabel.string = show ? cell.name : "";
    }

    /** 共用格按元素绘制。名册使用独立的顶部元素筛选，头像上隐藏元素图标。 */
    private paintElem(cell: HeroCellModel, empty: boolean, revision: number): void {
        if (!this.elem) return;
        const show = !this.rosterFrame && !empty && cell.elem !== null && !!ELEMENT_FRAMES[cell.elem];
        this.elem.active = show;
        if (show && cell.elem !== null) {
            ResManager.setSprite(this.elem, ELEMENT_FRAMES[cell.elem], () => this.isValid && revision === this.revision);
        }
    }

    /** 销毁时废弃在途图片并释放红点监听。 */
    onDestroy(): void {
        this.revision++;
        this.reminder?.dispose();
    }
}
