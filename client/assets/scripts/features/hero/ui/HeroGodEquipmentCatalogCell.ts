/** 神装图鉴单格，复用旧品质标记、数字星级和套装图标，点击由虚拟列表交给页面。 */
import { _decorator, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { HeroGodEquipmentCatalogUtils, type GodEquipmentCatalogRow } from "../utils/HeroGodEquipmentCatalogUtils";

const { ccclass, property } = _decorator;

@ccclass("HeroGodEquipmentCatalogCell")
export class HeroGodEquipmentCatalogCell extends Component {
    /** 图鉴实际装备的图片节点。 */
    @property(Node) private itemIcon: Node | null = null;
    /** 在原星级底图上叠加一至五星的数字图片。 */
    @property(Node) private starNumber: Node | null = null;
    /** 该模板所属的套装图标。 */
    @property(Node) private setIcon: Node | null = null;
    /** 原物品名称。 */
    @property(Label) private itemName: Label | null = null;
    /** 原套装名称。 */
    @property(Label) private setName: Label | null = null;

    /** 用真实模板完整覆盖虚拟格，异步赋图由共享资源管理器处理。 */
    public show(row: GodEquipmentCatalogRow): void {
        const face = BagItemCatalog.face(row.templateId, 1);
        this.itemName!.string = face.title;
        this.setName!.string = HeroGodEquipmentCatalogUtils.setName(row.setType);
        ResManager.setSprite(this.itemIcon, [face.icon, face.fallback]);
        ResManager.setSprite(this.starNumber, ResManager.ui("bag", "backpack_lbl-star-" + row.star));
        ResManager.setSprite(this.setIcon, ResManager.ui("common", "artifact_spr-suit-type-" + row.setType));
    }
}
