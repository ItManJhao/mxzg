/**
 * 物品详情显示组件：由背包页面传入已查询的配置与数量，绑定既有 Prefab 字段。
 */
import {_decorator, Button, Component, Label, Node, Sprite, UITransform} from "cc";
import {GameLog} from "../../../core/GameLog";
import {BagFace} from "../data/BagItemData";
import {positiveUiSize} from "../../../framework/ui/visibleFit";
import {paintSpritePaths} from "../../../framework/kit/SpritePaint";

const {ccclass, property} = _decorator;

/**
 * BagInfoView 只展示当前库存详情，确认关闭，不承担道具使用业务。
 * 关闭只收起这张详情，不关背包页。
 */
@ccclass("BagInfoView")
export class BagInfoView extends Component {
    @property(Node)
    bg: Node | null = null;

    @property(Label)
    propName: Label | null = null;

    @property(Label)
    propType: Label | null = null;

    @property(Label)
    desc: Label | null = null;

    @property(Node)
    icon: Node | null = null;

    @property(Node)
    rare: Node | null = null;

    @property(Button)
    btnClose: Button | null = null;

    @property(Button)
    btnEnter: Button | null = null;

    @property(Label)
    enterLabel: Label | null = null;

    @property(Button)
    btnSrc: Button | null = null;

    @property(Node)
    btnDetail: Node | null = null;

    @property(Node)
    btnDecompose: Node | null = null;

    @property(Node)
    hitMenu: Node | null = null;

    @property(Node)
    hitMenuClose: Node | null = null;

    private onClose: (() => void) | null = null;
    private toast: ((text: string) => void) | null = null;
    private wired = false;

    /** 展示配置与数量；重复展示只替换回调，不重复绑定按钮。 */
    show(face: BagFace, onClose: () => void, toast: (text: string) => void): void {
        this.onClose = onClose;
        this.toast = toast;
        if (this.propName) this.propName.string = face.title;
        if (this.propType) this.propType.string = face.typeLine;
        if (this.desc) {
            this.desc.node.active = true;
            this.desc.string = face.body || " ";
        }
        paintSpritePaths(this.icon, [face.icon, face.fallback]);
        if (this.rare) paintSpritePaths(this.rare, [face.frame]);
        else GameLog.shared.warn("Bag", "BagInfoView 下没有 spr_rare");
        if (this.btnDetail) this.btnDetail.active = false;
        if (this.btnDecompose) this.btnDecompose.active = false;
        const confirmImage = this.btnEnter?.node.getComponent(Sprite);
        if (confirmImage) confirmImage.grayscale = false;
        this.gray(this.btnSrc);
        if (this.enterLabel) this.enterLabel.string = "确定";
        if (this.btnEnter) this.btnEnter.node.active = true;
        this.silence(this.hitMenu);
        this.silence(this.hitMenuClose);
        this.wire();
    }

    /** 确认或关闭仅退出详情，不触发库存写入。 */
    private readonly closeInfo = (): void => {
        this.onClose?.();
    };

    /** 当前没有来源流程，明确提示功能尚未开放。 */
    private readonly showSourceNotice = (): void => {
        this.toast?.("物品来源暂未开放");
    };

    /** 每个详情实例只登记一次交互，回调读取最新展示数据。 */
    private wire(): void {
        if (this.wired) return;
        this.wired = true;
        this.btnClose?.node.on(Button.EventType.CLICK, this.closeInfo);
        this.btnEnter?.node.on(Button.EventType.CLICK, this.closeInfo);
        this.btnSrc?.node.on(Button.EventType.CLICK, this.showSourceNotice);
    }

    /** 来源入口维持当前未开放的灰色展示。 */
    private gray(button: Button | null): void {
        if (!button) return;
        const image = button.node.getComponent(Sprite);
        if (image) image.grayscale = true;
    }

    /** 销毁时解除仍存活按钮的回调并释放页面引用；Creator 可能已先销毁子按钮并清空其 node。 */
    onDestroy(): void {
        this.btnClose?.node?.off(Button.EventType.CLICK, this.closeInfo);
        this.btnEnter?.node?.off(Button.EventType.CLICK, this.closeInfo);
        this.btnSrc?.node?.off(Button.EventType.CLICK, this.showSourceNotice);
        this.onClose = null;
        this.toast = null;
        this.wired = false;
    }

    /** 全屏 menu 会挡住关闭。只处理绑上来的那一个。 */
    private silence(menu: Node | null): void {
        if (!menu) return;
        const ui = menu.getComponent(UITransform);
        const size = positiveUiSize(ui);
        if (!ui || !size || size.width < 500 || size.height < 500) return;
        ui.setContentSize(0, 0);
    }
}
