/** 永恒梦境奖励详情。展示原策划给出的三组产物类型，物品点击复用背包详情。 */
import { _decorator, Button } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";

const { ccclass, property } = _decorator;

/** 旧 infiniterewardshow 中的首通、排行、每日前三组独立产物，依组内顺序绑定。 */
const rewardItemIds = [900101, 900202, 901401, 900101, 900101, 900001] as const;

@UIRegistry.view({ id: "dreamland-rewards", prefab: "bundles/module/dreamland/prefabs/DreamlandRewardView",
    layer: UILayer.Popup, hostId: "remake-modal", cache: false, allowMultiple: false,
    modal: { mask: true, closeOnOutside: true } })
@ccclass("DreamlandRewardView")
export class DreamlandRewardView extends BaseView {
    /** 右上关闭按钮，仅收回此说明窗。 */
    @property(Button) private closeButton: Button | null = null;
    /** 六个产物预览项，在编辑器按首通、排行、每日三组布置。 */
    @property([Button]) private itemButtons: Button[] = [];

    /** 显示当期配置的静态产物组并绑定点击说明。 */
    public onOpen(): void {
        if (!this.closeButton || this.itemButtons.length !== rewardItemIds.length) {
            throw new Error("永恒梦境奖励详情绑定不完整");
        }
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
        this.bindButton(this.closeButton, () => this.close());
        this.itemButtons.forEach((button, index) => this.bindButton(button, () => this.openItem(rewardItemIds[index])));
    }

    /** 按配置打开产物说明，展示数量1只用于生成物品说明，不付款或授奖。 */
    private openItem(itemId: number): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description", face: { ...BagItemCatalog.face(itemId, 1), typeLine: "梦境产物" },
        }).catch(() => { /* 统一开窗入口反馈异常。 */ });
    }

    /** 在当前显示期绑定按钮，统一随窗关闭解除。 */
    private bindButton(button: Button, listener: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, listener);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, listener);
            }
        });
    }
}
