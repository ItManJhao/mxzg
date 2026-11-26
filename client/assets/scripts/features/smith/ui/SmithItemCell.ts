/** 铁匠铺配方、筛选器和预览共用的物品格。格子只绑定当前列表数据，不持有库存。 */
import { _decorator, Button, Component, Node } from "cc";
import { GConfig } from "../../../config/GConfig";
import { GameConfig } from "../../../config/GameConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroGrowthDisplayUtils } from "../../hero/utils/HeroGrowthDisplayUtils";
import { HeroJewelUtils } from "../../hero/utils/HeroJewelUtils";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";

/** 列表行的显示数据，使用配置 ID，独立实例选择另由列表携带。 */
export interface SmithItemFace {
    readonly itemId: number;
    readonly quantity: number;
    readonly selected?: boolean;
    readonly ready?: boolean;
    readonly stars?: number;
    /** 宝石法阵自带底座时显示裸图标和星级，隐藏通用物品品质边框。 */
    readonly plainIcon?: boolean;
}

const { ccclass, property } = _decorator;

@ccclass("SmithItemCell")
export class SmithItemCell extends Component {
    /** 绑定通用物品格的预制体根，由其显示图标与品质。 */
    @property(Node) private itemNode: Node | null = null;
    /** 高亮表示当前选中配方或实例。 */
    @property(Node) private highlight: Node | null = null;
    /** 当前物料和金币足够时显示的红点。 */
    @property(Node) private reminder: Node | null = null;
    /** onLoad 绑定的点击节点，销毁时若仍存在则解绑。 */
    private clickTarget: Node | null = null;
    /** 当前虚拟行的点击处理，重复绑定替换旧闭包。 */
    private clicked: (() => void) | null = null;

    /** 绑定实际物品和星级。法阵使用独立底座，只有传入回调时才允许点击。 */
    public show(face: SmithItemFace | null, clicked?: () => void): void {
        const item = this.itemNode?.getComponent(BagItemView);
        if (!item?.button || !this.highlight || !this.reminder) {
            throw new Error("SmithItemCell.prefab 缺少铁匠铺物品格绑定");
        }
        this.clicked = clicked ?? null;
        this.highlight.active = face?.selected === true;
        this.reminder.active = face?.ready === true;
        if (!face) {
            item.show(null, false);
            return;
        }
        const jewel = HeroJewelUtils.definition(face.itemId);
        const jewelStars = jewel ? HeroGrowthDisplayUtils.starAppearance(jewel.star) : null;
        const stars = jewelStars?.count ?? face.stars
            ?? GameConfig.instance.getConfig(GConfig.EquipmentType, face.itemId)?.star ?? 0;
        item.show(face, false, BagItemCatalog.face(face.itemId, face.quantity), !!clicked, false, false, stars);
        item.frame!.active = face.plainIcon !== true;
        for (const star of item.shardStars) {
            if (star.active) {
                ResManager.setSprite(star, jewelStars?.frame ?? "common/ui/other_star-0");
            }
        }
    }

    /** 开始使用前只绑定一次点击，虚拟列表刷新直接更换当前处理。 */
    protected onLoad(): void {
        const item = this.itemNode?.getComponent(BagItemView);
        this.clickTarget = item?.button?.node ?? null;
        this.clickTarget?.on(Button.EventType.CLICK, this.select, this);
    }

    /** 触发当前行；复用、滚出或关闭时不存在独立业务状态。 */
    private select(): void {
        this.clicked?.();
    }

    /** 子物品先销毁时跳过解绑，不再查找它的组件列表。 */
    protected onDestroy(): void {
        if (this.clickTarget?.isValid) {
            this.clickTarget.off(Button.EventType.CLICK, this.select, this);
        }
        this.clicked = null;
        this.clickTarget = null;
    }
}
