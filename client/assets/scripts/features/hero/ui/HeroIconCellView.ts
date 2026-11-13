/**
 * 英雄头像格子：按传入展示数据更新图片、等级和星级，保持Prefab结构和绑定可编辑。
 * 点击由列表派发给所属页面；本组件不持有选择回调、页面导航或名册状态。
 */
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { HERO_FACE_FALLBACK, HeroCellModel } from "./HeroListPresentation";

const { ccclass, property } = _decorator;

const ELEMENT_FRAMES = [ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-0", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-1", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-2", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-3", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-4", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-5", "SpriteFrame")] as const;

/**
 * HeroIconCell 上的一格。脸、名字、元素、星、等级、锁和出战标都绑在预制上。
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

    /** 图片绘制代次，复用和销毁时递增，拒绝旧图片覆盖当前格子。 */
    private revision = 0;

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
    }

    /** 复用格子时更新显示和可选状态，并使旧图标加载结果失效；不绑定点击。 */
    show(cell: HeroCellModel): void {
        this.validateBindings();
        const revision = ++this.revision;
        const empty = cell.kind === "empty";
        this.paintFace(cell, empty, revision);
        this.paintName(cell, empty);
        this.paintElem(cell, empty, revision);
        this.paintStars(empty ? 0 : cell.stars);
        this.paintLevel(empty ? null : cell.level);
        if (this.lock) this.lock.active = !empty && cell.locked;
        if (this.battle) this.battle.active = !empty && cell.deployed && cell.kind === "owned";
        this.button!.interactable = !empty;
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

    /** 显示合法元素图标并保留完整Bundle描述；未知元素隐藏，复用后拒绝旧结果。 */
    private paintElem(cell: HeroCellModel, empty: boolean, revision: number): void {
        if (!this.elem) return;
        const show = !empty && cell.elem !== null && !!ELEMENT_FRAMES[cell.elem];
        this.elem.active = show;
        if (show && cell.elem !== null) {
            ResManager.setSprite(this.elem, ELEMENT_FRAMES[cell.elem], () => this.isValid && revision === this.revision);
        }
    }

    private paintStars(count: number): void {
        const n = count > 5 ? 5 : count < 0 ? 0 : count;
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            if (!star) continue;
            star.active = i < n;
        }
    }

    /** 销毁时废弃全部在途图片；列表选择监听由所属列表释放。 */
    onDestroy(): void {
        this.revision++;
    }

    private paintLevel(level: number | null): void {
        if (!this.levelLabel) return;
        const show = level !== null;
        this.levelLabel.node.active = show;
        this.levelLabel.string = show ? String(level) : "";
    }
}
