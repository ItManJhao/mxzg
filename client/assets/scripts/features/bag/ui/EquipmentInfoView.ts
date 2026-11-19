/**
 * 普通装备详情：背包按库存键展示，英雄入口按当前槽位展示实际套装与更换、卸下操作。
 * 两处共用装备配置和预制体，装备写入交给英雄装备控制器，结果由统一快照回填。
 */
import { _decorator, Button, Color, Label, Node, Sprite, SpriteFrame } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroEquipmentController } from "../../hero/HeroEquipmentController";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { HeroRosterEvent } from "../../hero/utils/HeroRosterEvent";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../BagModel";
import { BagEvent } from "../utils/BagEvent";
import { EquipmentDetail, EquipmentDetailUtils } from "../utils/EquipmentDetailUtils";
import { EquipmentAttributeCellView } from "./EquipmentAttributeCellView";

/** 背包以稳定库存键打开，英雄以实例和槽位打开，更换入口由所属英雄页提供。 */
export type EquipmentInfoArgs = { readonly key: string } | {
    readonly heroId: string;
    readonly slot: number;
    readonly onReplace: () => void;
};

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
    /** 套装名称和当前入口所对应的实际穿戴件数。 */
    @property(Label) setName: Label | null = null;
    /** 固定两、三、四件套的三个槽，样式和条件区域由Prefab维护。 */
    @property([EquipmentAttributeCellView]) setRows: EquipmentAttributeCellView[] = [];
    /** 关闭本详情，不影响背包。 */
    @property(Button) closeButton: Button | null = null;
    /** 来源入口保留旧外观，本批只反馈未开放。 */
    @property(Button) sourceButton: Button | null = null;
    /** 背包入口提示从英雄详情选择穿戴目标。 */
    @property(Button) equipButton: Button | null = null;
    /** 英雄装备详情专用的更换、卸下按钮组。 */
    @property(Node) wearActions: Node | null = null;
    /** 转到当前部位的装备选择列表。 */
    @property(Button) replaceButton: Button | null = null;
    /** 将当前穿戴的装备交给控制器卸下。 */
    @property(Button) removeButton: Button | null = null;
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

    /** 按入口订阅库存或英雄槽位，重开前先移除上一轮监听。 */
    public onOpen(args?: EquipmentInfoArgs): void {
        if (!args || ("key" in args ? !args.key.startsWith("stack:")
            : !args.heroId || !Number.isInteger(args.slot) || args.slot < 1 || args.slot > 4)) {
            throw new Error("普通装备详情缺少库存键或英雄槽位");
        }
        this.validateBindings();
        this.releaseBindings();
        this.args = args;
        this.closed = false;
        this.bindButtons();
        if ("heroId" in args) {
            if (!this.wearActions || !this.replaceButton || !this.removeButton) {
                throw new Error("普通装备详情缺少更换或卸下绑定");
            }
            EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
            EventDispatcher.instance.on("hero-equipment:updated", this, this.onEquipmentChanged);
        } else {
            EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        }
        this.refresh();
    }

    /** 按当前入口读取权威状态；槽位清空或库存消失时关闭窗口。 */
    private refresh(): void {
        const args = this.args;
        if (this.closed || !args) {
            return;
        }
        const config = GameConfig.instance;
        const worn = "heroId" in args;
        const pieces = worn ? HeroRosterModel.instance.snapshot.heroes.find(row => row.id === args.heroId)?.equipment?.items : undefined;
        const itemId = worn ? pieces?.find(piece => piece.slot === args.slot)?.templateId
            : BagModel.instance.snapshot.items.find(row => "stack:" + (row.instanceId || row.itemId) === args.key)?.itemId;
        const definition = itemId ? config.getConfig(GConfig.Item, itemId) : undefined;
        if (!itemId || definition?.place !== 1 || definition.mode !== 1) {
            this.close();
            return;
        }
        const detail = EquipmentDetailUtils.read(itemId, config, pieces?.map(piece => piece.templateId));
        if (!detail) {
            UIManager.instance.toast("装备详情暂不可用，请检查显示配置");
            this.close();
            return;
        }
        this.equipButton!.node.active = !worn;
        this.sourceButton!.node.active = !worn;
        if (this.wearActions) {
            this.wearActions.active = worn;
        }
        if (worn) {
            this.refreshWearButtons();
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
                row.show(bonus.attributes[0], detail.set!.count >= bonus.required ? "（已激活）" : bonus.condition);
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

    /** 绑定共享和穿戴上下文的操作，关闭时逐项解绑。 */
    private bindButtons(): void {
        this.closeButton!.node.on(Button.EventType.CLICK, this.close, this);
        this.sourceButton!.node.on(Button.EventType.CLICK, this.showSourceNotice, this);
        this.equipButton!.node.on(Button.EventType.CLICK, this.showEquipNotice, this);
        this.replaceButton?.node.on(Button.EventType.CLICK, this.replace, this);
        this.removeButton?.node.on(Button.EventType.CLICK, this.unequip, this);
    }

    /** 来源写路由尚未恢复，只经全局飘字说明，不打开暂停模块。 */
    private showSourceNotice(): void {
        UIManager.instance.toast("装备来源暂未开放");
    }

    /** 背包没有目标英雄，提示从实际英雄槽位操作。 */
    private showEquipNotice(): void {
        UIManager.instance.toast("请在英雄详情选择装备部位");
    }

    /** 回到所属英雄页打开选择窗，避免原装备说明垫在候选列表下。 */
    private replace(): void {
        const args = this.args;
        if (!this.closed && args && "heroId" in args && !HeroEquipmentController.instance.busy) {
            this.close();
            args.onReplace();
        }
    }

    /** 读取该英雄当前真实装备，交给控制器做单件卸下。 */
    private unequip(): void {
        const args = this.args;
        if (!this.closed && args && "heroId" in args) {
            const hero = HeroRosterModel.instance.snapshot.heroes.find(row => row.id === args.heroId);
            const item = hero?.equipment?.items.find(piece => piece.slot === args.slot);
            if (item) {
                HeroEquipmentController.instance.unequip(args.heroId, item);
            }
        }
    }

    /** 操作结束后只处理本窗发起的卸下；失败恢复按钮，槽位从名册刷新。 */
    private onEquipmentChanged(receipt?: { heroId: string; action: string; slot?: number; changed: boolean }): void {
        const args = this.args;
        if (args && "heroId" in args && receipt?.changed && receipt.heroId === args.heroId
            && receipt.action === "UNEQUIP" && receipt.slot === args.slot) {
            this.close();
            return;
        }
        this.refreshWearButtons();
    }

    /** 在途期间禁用更换和卸下。 */
    private refreshWearButtons(): void {
        const ready = !HeroEquipmentController.instance.busy;
        this.replaceButton!.interactable = ready;
        this.removeButton!.interactable = ready;
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
        if (this.replaceButton?.node.isValid) {
            this.replaceButton.node.off(Button.EventType.CLICK, this.replace, this);
        }
        if (this.removeButton?.node.isValid) {
            this.removeButton.node.off(Button.EventType.CLICK, this.unequip, this);
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
