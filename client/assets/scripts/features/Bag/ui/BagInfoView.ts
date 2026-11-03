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
    /** 详情背景的 Prefab 绑定，当前代码不修改。 */
    @property(Node)
    bg: Node | null = null;

    /** 物品名称文本，由 Prefab 绑定。 */
    @property(Label)
    propName: Label | null = null;

    /** 数量说明文本，由 Prefab 绑定。 */
    @property(Label)
    propType: Label | null = null;

    /** 配置说明文本，由 Prefab 绑定。 */
    @property(Label)
    desc: Label | null = null;

    /** Prefab 绑定的图标节点，未绑定时为 null。 */
    @property(Node)
    icon: Node | null = null;

    /** 稀有度底框节点，由 Prefab 绑定。 */
    @property(Node)
    rare: Node | null = null;

    /** 关闭详情按钮，不关闭背包页。 */
    @property(Button)
    btnClose: Button | null = null;

    /** 当前仅作确认关闭按钮，尚未接入使用道具。 */
    @property(Button)
    btnEnter: Button | null = null;

    /** 确认按钮文案，当前显示“确定”。 */
    @property(Label)
    enterLabel: Label | null = null;

    /** 物品来源按钮，当前置灰并提示尚未开放。 */
    @property(Button)
    btnSrc: Button | null = null;

    /** 旧详情操作节点，目前隐藏，保留序列化绑定。 */
    @property(Node)
    btnDetail: Node | null = null;

    /** 旧分解操作节点，目前隐藏，尚未恢复分解业务。 */
    @property(Node)
    btnDecompose: Node | null = null;

    /** 旧全屏交互层，展示时收缩过大尺寸，避免阻挡关闭。 */
    @property(Node)
    hitMenu: Node | null = null;

    /** 旧关闭交互层，展示时同样处理过大遮挡。 */
    @property(Node)
    hitMenuClose: Node | null = null;

    /** 挂载层传入的关闭回调，show 时替换，销毁时释放。 */
    private onClose: (() => void) | null = null;
    /** 页面传入的提示回调，销毁时清空，避免持有旧页面。 */
    private toast: ((text: string) => void) | null = null;
    /** 按钮是否已经绑定；重复 show 不重复注册，销毁时重置。 */
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
