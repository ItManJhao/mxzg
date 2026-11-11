/**
 * 挂机到账收据展示：复用 ItemRewardLayer 的滚动窗口和 BagItemView 的品质物品格。
 * 由 CampaignView 挂载并随页面销毁；点击只关闭显示，不请求领取或修改资产。
 */
import { BlockInputEvents, Color, Node, UITransform, view } from "cc";
import { loadPrefab, spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { bindTap } from "../../../framework/ui/PrefabLayout";
import { createRect, paintRect } from "../../../framework/ui/UiKit";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { BagItemView } from "../../bag/ui/BagItemView";
import type { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { IdleReward } from "../IdleApi";

/** 加载已配置 SuperContent/Cell 的窗口，呈现全部真实奖励；父页面在加载期间关闭时不挂载。 */
export async function mountIdleRewards(parent: Node, rewards: readonly IdleReward[], catalog: BagItemCatalog, close: () => void, isCurrent: () => boolean): Promise<Node | null> {
    const panelPrefab = await loadPrefab("prefabs/ui/item/ItemRewardLayer");
    if (!parent.isValid || !isCurrent()) return null;
    const hold = new Node("IdleRewardHold");
    hold.addComponent(UITransform);
    hold.addComponent(BlockInputEvents);
    try {
        const dim = createRect("dim", 640, 1280, new Color(8, 16, 32, 180));
        dim.parent = hold;
        bindTap(dim, close);
        const panel = spawnPrefab(panelPrefab, hold);
        panel.addComponent(BlockInputEvents);
        const scroll = panel.getChildByName("scroll_view")?.getComponent(SuperScroll);
        const footer = panel.getChildByName("CCSprite_1");
        if (!scroll || !footer) throw new Error("ItemRewardLayer 滚动或关闭节点缺失");
        bindTap(footer, close);
        scroll.validateBindings();
        scroll.list.setData(rewards, (cell, reward) => {
            cell.getComponent(BagItemView)!.show(reward, false, null, catalog.face(reward.itemId, reward.quantity));
        });
        const shell = parent.getChildByName("PagePrefabShell");
        hold.parent = shell?.active ? shell : parent;
        bindVisibleRefresh(hold, () => {
            fitVisibleRoot(hold);
            const size = view.getVisibleSize();
            dim.getComponent(UITransform)!.setContentSize(size.width, size.height);
            paintRect(dim, new Color(8, 16, 32, 180));
            const scale = Math.min(1, size.width * 0.94 / 640, size.height * 0.8 / 480);
            panel.setScale(scale, scale, 1);
            panel.setPosition(-320 * scale, -200 * scale, 0);
        });
        scroll.toStart();
        return hold;
    } catch (error) {
        hold.destroy();
        throw error;
    }
}
