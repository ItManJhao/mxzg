/**
 * 精灵实例专用详情：按旧版分区显示名称、真实基础属性和技能图文，由背包格子经UIManager打开。
 * 静态结构、样式及竖屏适配保存在Prefab，共享模态由页面参数提供；不查询库存或执行精灵养成。
 * 权威实例归BagModel，关页清理监听、按钮和赋图作用域，避免旧实例图片迟到覆盖。
 */
import { _decorator, Button, Label, Node, Sprite } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../BagModel";
import { BagEvent } from "../utils/BagEvent";
import { BagItemCatalog } from "../utils/BagItemCatalog";

/** 库存入口只传实例投影键；不传角色归属或可过期的属性副本。 */
export interface SpiritInfoArgs {
    /** 与背包格子一致的spirit:实例ID键，始终保留字符串精度。 */
    readonly key: string;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "spirit-info",
    prefab: "bundles/module/bag/prefabs/SpiritInfoView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("SpiritInfoView")
export class SpiritInfoView extends BaseView<SpiritInfoArgs> {
    /** 完整面板挂点，尺寸与Widget/ViewportScale配置归Prefab。 */
    @property(Node) panel: Node | null = null;
    /** 真实精灵物品图标，按需加载且不显示数量。 */
    @property(Sprite) icon: Sprite | null = null;
    /** 当前蓝色精灵的标题底图，原图在Prefab绑定。 */
    @property(Sprite) banner: Sprite | null = null;
    /** 精灵配置名称，不包含实例ID或数量。 */
    @property(Label) nameLabel: Label | null = null;
    /** 固定精灵类型说明，与普通道具数量栏分开。 */
    @property(Label) typeLabel: Label | null = null;
    /** 已生成特性的中文属性名称。 */
    @property(Label) attributeName: Label | null = null;
    /** 配置投影中对应真实特性的数值。 */
    @property(Label) attributeValue: Label | null = null;
    /** 随特性编号切换的原属性图标。 */
    @property(Sprite) attributeIcon: Sprite | null = null;
    /** 实例精确等级技能名称，颜色归Prefab。 */
    @property(Label) skillName: Label | null = null;
    /** 完整技能说明，换行和可显示区域归Prefab。 */
    @property(Label) skillDescription: Label | null = null;
    /** 同等级技能图标，圆框保存在Prefab，不动态组装。 */
    @property(Sprite) skillIcon: Sprite | null = null;
    /** 关闭本窗口，不关闭背包。 */
    @property(Button) closeButton: Button | null = null;
    /** 来源入口保留外观，目前仅提示尚未开放。 */
    @property(Button) sourceButton: Button | null = null;
    /** 合成入口保留旧版位置，当前不执行业务。 */
    @property(Button) combineButton: Button | null = null;
    /** 重生入口保留旧版位置，当前不执行业务。 */
    @property(Button) rebirthButton: Button | null = null;
    /** 分解入口保留旧版位置，当前不执行业务。 */
    @property(Button) decomposeButton: Button | null = null;
    /** 装备入口保留旧版位置，当前不执行业务。 */
    @property(Button) equipButton: Button | null = null;
    /** 每次刷新与关闭递增，阻止旧实例的迟到图片覆盖当前展示。 */
    private paintVersion = 0;

    /** 仅铺满窗口根；面板居中、尺寸及缩放由Prefab处理。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 绑定当前实例及只读刷新；重复打开先解除本窗口旧监听，不请求或修改任何资产。 */
    public onOpen(args?: SpiritInfoArgs): void {
        if (!args?.key?.startsWith("spirit:")) {
            throw new Error("精灵详情缺少实例键");
        }
        this.args = args;
        EventDispatcher.instance.offTarget(this);
        this.bindButtons();
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        this.refresh();
    }

    /** 按稳定实例键重读Model；实例删除或账号重置后关闭，不从同物品其他件借用属性。 */
    private refresh(): void {
        const key = this.args?.key;
        const spirit = BagModel.instance.snapshot.spiritItems.find(row => "spirit:" + row.instanceId === key);
        if (!spirit) {
            this.close();
            return;
        }
        const detail = BagItemCatalog.spiritDetail(spirit);
        const version = ++this.paintVersion;
        const current = () => version === this.paintVersion && this.node.isValid;
        if (this.nameLabel) {
            this.nameLabel.string = detail.face.title;
        }
        if (this.typeLabel) {
            this.typeLabel.string = "类型：精灵";
        }
        if (this.attributeName) {
            this.attributeName.string = detail.attributeName + "：";
        }
        if (this.attributeValue) {
            this.attributeValue.string = detail.attributeValue;
        }
        if (this.skillName) {
            this.skillName.string = detail.skillName;
        }
        if (this.skillDescription) {
            this.skillDescription.string = detail.skillDescription;
        }
        ResManager.setSprite(this.icon?.node || null, [detail.face.icon, detail.face.fallback], current);
        ResManager.setSprite(this.attributeIcon?.node || null, detail.attributeIcon, current);
        ResManager.setSprite(this.skillIcon?.node || null, detail.skillIcon, current);
    }

    /** 只登记一次按钮回调；旧操作可点击查看未开放说明，不发起养成或领取请求。 */
    private bindButtons(): void {
        this.closeButton?.node.off(Button.EventType.CLICK, this.close, this);
        this.closeButton?.node.on(Button.EventType.CLICK, this.close, this);
        const actions: [Button | null, () => void][] = [
            [this.sourceButton, this.showSourceNotice],
            [this.combineButton, this.showCombineNotice],
            [this.rebirthButton, this.showRebirthNotice],
            [this.decomposeButton, this.showDecomposeNotice],
            [this.equipButton, this.showEquipNotice],
        ];
        for (const [button, action] of actions) {
            button?.node.off(Button.EventType.CLICK, action, this);
            button?.node.on(Button.EventType.CLICK, action, this);
        }
    }

    /** 来源规则尚未恢复，只显示范围提示。 */
    private readonly showSourceNotice = (): void => { UIManager.instance.toast("精灵来源暂未开放"); };
    /** 合成业务保持关闭。 */
    private readonly showCombineNotice = (): void => { UIManager.instance.toast("精灵合成暂未开放"); };
    /** 重生业务保持关闭。 */
    private readonly showRebirthNotice = (): void => { UIManager.instance.toast("精灵重生暂未开放"); };
    /** 分解业务保持关闭。 */
    private readonly showDecomposeNotice = (): void => { UIManager.instance.toast("精灵分解暂未开放"); };
    /** 穿戴业务保持关闭。 */
    private readonly showEquipNotice = (): void => { UIManager.instance.toast("精灵装备暂未开放"); };

    /** 关窗解除本窗按钮与库存订阅，并撤回赋图拥有者；Model及共享资源池独立存活。 */
    public onClose(): void {
        this.paintVersion++;
        EventDispatcher.instance.offTarget(this);
        this.closeButton?.node?.off(Button.EventType.CLICK, this.close, this);
        this.sourceButton?.node?.off(Button.EventType.CLICK, this.showSourceNotice, this);
        this.combineButton?.node?.off(Button.EventType.CLICK, this.showCombineNotice, this);
        this.rebirthButton?.node?.off(Button.EventType.CLICK, this.showRebirthNotice, this);
        this.decomposeButton?.node?.off(Button.EventType.CLICK, this.showDecomposeNotice, this);
        this.equipButton?.node?.off(Button.EventType.CLICK, this.showEquipNotice, this);
        ResManager.setSprite(this.icon?.node || null, null);
        ResManager.setSprite(this.attributeIcon?.node || null, null);
        ResManager.setSprite(this.skillIcon?.node || null, null);
        this.args = undefined;
    }
}
