/**
 * 背包普通装备的只读详情：按唯一库存键读取当前物品，显示旧版评分、基础属性和未激活套装。
 * 由BagView经UIManager打开；完整结构、品质样式、有限属性槽及竖屏适配保存在Prefab。
 * 页面只消费配置投影和BagModel，不请求库存、不生成装备实例，不执行穿脱或来源跳转。
 */
import { _decorator, Button, Color, Label, Node, Sprite, SpriteFrame } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../BagModel";
import { BagEvent } from "../utils/BagEvent";
import { EquipmentDetail, EquipmentDetailUtils } from "../utils/EquipmentDetailUtils";
import { EquipmentAttributeCellView } from "./EquipmentAttributeCellView";

/** 库存入口只传背包格子的稳定键，不传配置副本、角色归属或可过期的持有数量。 */
export interface EquipmentInfoArgs {
    /** 普通库存的stack:记录ID键；旧快照缺记录ID时沿用背包当前投影的键。 */
    readonly key: string;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "equipment-info",
    prefab: "bundles/module/bag/prefabs/EquipmentInfoView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("EquipmentInfoView")
export class EquipmentInfoView extends BaseView<EquipmentInfoArgs> {
    /** 完整面板；其高度由Prefab的Layout随可见分区收缩。 */
    @property(Node) panel: Node | null = null;
    /** 当前配置的装备图标，不显示持有数量。 */
    @property(Sprite) icon: Sprite | null = null;
    /** 原公共品质框，随当前普通装备稀有度取图。 */
    @property(Sprite) iconFrame: Sprite | null = null;
    /** 由Prefab提供六档原标题帧，显示时只选择对应档。 */
    @property(Sprite) banner: Sprite | null = null;
    /** 装备名称，颜色取Prefab的真实品质样式。 */
    @property(Label) nameLabel: Label | null = null;
    /** 本地化装备部位类型，与普通道具数量行分开。 */
    @property(Label) typeLabel: Label | null = null;
    /** 旧评分公式得到的最终整数，视图不再次计算。 */
    @property(Label) scoreLabel: Label | null = null;
    /** 装备配置说明，静态区域由Prefab保存。 */
    @property(Label) description: Label | null = null;
    /** 前五颗黄星及最后一颗红星；旧6星显示一颗红星，不借用英雄高星样式。 */
    @property([Node]) stars: Node[] = [];
    /** 旧配置最多两条基础属性，对应Prefab中的两个有限静态槽。 */
    @property([EquipmentAttributeCellView]) attributeRows: EquipmentAttributeCellView[] = [];
    /** 无套装时隐藏的完整分区，布局组件自动移除其占位。 */
    @property(Node) setPanel: Node | null = null;
    /** 套装名称和旧背包未穿戴计数0/4，不从当前英雄猜激活状态。 */
    @property(Label) setName: Label | null = null;
    /** 固定两、三、四件套的三个槽，样式和条件区域由Prefab维护。 */
    @property([EquipmentAttributeCellView]) setRows: EquipmentAttributeCellView[] = [];
    /** 关闭本详情，不影响背包。 */
    @property(Button) closeButton: Button | null = null;
    /** 来源入口保留旧外观，本批只反馈未开放。 */
    @property(Button) sourceButton: Button | null = null;
    /** 装备入口保留旧外观，本批不发起穿戴请求。 */
    @property(Button) equipButton: Button | null = null;
    /** 按旧rare=1至6保存的原标题图片，不在代码维护资源地址表。 */
    @property([SpriteFrame]) rarityBanners: SpriteFrame[] = [];
    /** 按旧rare=1至6保存的名字颜色，便于直接在Prefab修改。 */
    @property([Color]) nameColors: Color[] = [];
    /** 当前绘制代次，换物品或关窗递增以拒绝迟到图片。 */
    private paintVersion = 0;
    /** true表示窗口关闭，不再消费库存事件或显示异步反馈。 */
    private closed = true;

    /** 对齐窗口根，子节点的尺寸、布局与统一缩放由Prefab维护。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 绑定实际库存键；配置已在登录后统一安装，重开只撤销旧监听，不重建配置索引或发请求。 */
    public onOpen(args?: EquipmentInfoArgs): void {
        if (!args?.key?.startsWith("stack:")) {
            throw new Error("普通装备详情缺少库存键");
        }
        this.validateBindings();
        this.releaseBindings();
        this.args = args;
        this.closed = false;
        this.bindButtons();
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        this.refresh();
    }

    /** 按同一个库存键重读最新持有；条目删除或类型不符时关窗，不借用其他记录顶替。 */
    private refresh(): void {
        if (this.closed) {
            return;
        }
        const item = BagModel.instance.snapshot.items.find(row => "stack:" + (row.instanceId || row.itemId) === this.args?.key);
        const definition = item ? GameConfig.instance.getConfig(GConfig.Item, item.itemId) : undefined;
        if (!item || definition?.place !== 1 || definition.mode !== 1) {
            this.close();
            return;
        }
        const detail = EquipmentDetailUtils.read(item.itemId);
        if (!detail) {
            UIManager.instance.toast("装备详情暂不可用，请检查显示配置");
            this.close();
            return;
        }
        this.paint(detail);
    }

    /** 将纯投影写入已有有限槽位，布局和样式只选择Prefab保存的内容，不手算坐标或高度。 */
    private paint(detail: EquipmentDetail): void {
        if (detail.attributes.length > this.attributeRows.length || (detail.set?.bonuses.length || 0) > this.setRows.length
            || detail.set?.bonuses.some(bonus => bonus.attributes.length !== 1)) {
            throw new Error("EquipmentInfoView静态属性槽与装备配置不一致：" + detail.itemId);
        }
        this.nameLabel!.string = detail.name;
        this.nameLabel!.color = this.nameColors[detail.rarity - 1];
        this.typeLabel!.string = detail.typeLine;
        this.scoreLabel!.string = String(detail.score);
        this.description!.string = "       " + detail.description;
        this.banner!.spriteFrame = this.rarityBanners[detail.rarity - 1];
        this.stars.forEach((star, index) => { star.active = detail.star === 6 ? index === 5 : index < detail.star; });
        this.attributeRows.forEach((row, index) => {
            const attribute = detail.attributes[index];
            row.node.active = !!attribute;
            if (attribute) {
                row.show(attribute);
            } else {
                row.clear();
            }
        });
        this.setPanel!.active = !!detail.set;
        this.setName!.string = detail.set ? detail.set.name + "（" + detail.set.count + "/" + detail.set.total + "）" : "";
        this.setRows.forEach((row, index) => {
            const bonus = detail.set?.bonuses[index];
            row.node.active = !!bonus;
            if (bonus) {
                row.show(bonus.attributes[0], bonus.condition);
            } else {
                row.clear();
            }
        });
        const version = ++this.paintVersion;
        const current = () => !this.closed && this.node.isValid && version === this.paintVersion;
        ResManager.setSprite(this.icon!.node, detail.icon, current);
        ResManager.setSprite(this.iconFrame!.node, ResManager.qualityFrame(detail.rarity), current);
    }

    /** 核对完整Prefab、六档品质样式和有限静态槽，资源错误交给统一开窗边界。 */
    private validateBindings(): void {
        for (const [field, value] of Object.entries({
            panel: this.panel, icon: this.icon, iconFrame: this.iconFrame, banner: this.banner,
            nameLabel: this.nameLabel, typeLabel: this.typeLabel, scoreLabel: this.scoreLabel, description: this.description,
            setPanel: this.setPanel, setName: this.setName, closeButton: this.closeButton,
            sourceButton: this.sourceButton, equipButton: this.equipButton,
        })) {
            if (!value) {
                throw new Error("EquipmentInfoView.prefab缺少绑定：" + field);
            }
        }
        if (this.stars.length !== 6 || this.attributeRows.length !== 2 || this.setRows.length !== 3
            || this.rarityBanners.length !== 6 || this.rarityBanners.some(frame => !frame)
            || this.nameColors.length !== 6 || this.nameColors.some(color => !color)) {
            throw new Error("EquipmentInfoView.prefab星级、属性槽或六档品质样式绑定无效");
        }
        for (const row of [...this.attributeRows, ...this.setRows]) {
            row.validateBindings();
        }
    }

    /** 绑定当前窗口的关闭和只读按钮；重开前已先解除旧回调。 */
    private bindButtons(): void {
        this.closeButton!.node.on(Button.EventType.CLICK, this.close, this);
        this.sourceButton!.node.on(Button.EventType.CLICK, this.showSourceNotice, this);
        this.equipButton!.node.on(Button.EventType.CLICK, this.showEquipNotice, this);
    }

    /** 来源写路由尚未恢复，只经全局飘字说明，不打开暂停模块。 */
    private showSourceNotice(): void {
        UIManager.instance.toast("装备来源暂未开放");
    }

    /** 装备穿脱保持关闭，不提交任何资产请求。 */
    private showEquipNotice(): void {
        UIManager.instance.toast("装备穿脱暂未开放");
    }

    /** 解除本窗库存订阅与按钮，不清理其他页面或模块持有的监听。 */
    private releaseBindings(): void {
        EventDispatcher.instance.offTarget(this);
        if (this.closeButton?.node?.isValid) {
            this.closeButton.node.off(Button.EventType.CLICK, this.close, this);
        }
        if (this.sourceButton?.node?.isValid) {
            this.sourceButton.node.off(Button.EventType.CLICK, this.showSourceNotice, this);
        }
        if (this.equipButton?.node?.isValid) {
            this.equipButton.node.off(Button.EventType.CLICK, this.showEquipNotice, this);
        }
    }

    /** 关窗撤回图片、异步绘制与监听；统一配置、唯一库存和公共资源池继续由模块/应用拥有。 */
    public onClose(): void {
        this.closed = true;
        this.paintVersion++;
        this.releaseBindings();
        ResManager.setSprite(this.icon?.node || null, null);
        ResManager.setSprite(this.iconFrame?.node || null, null);
        for (const row of [...this.attributeRows, ...this.setRows]) {
            row.clear();
        }
        this.args = undefined;
    }
}
