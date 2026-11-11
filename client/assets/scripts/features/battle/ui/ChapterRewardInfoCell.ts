/**
 * 产物说明的可复用关卡行：接收当前关卡和只读配置，横向列表统一派发渲染与选择。
 * 行移出虚拟窗口时解除内部监听并清空格子；选择只向所属外层列表报告物品ID，不保存页面回调。
 */
import { _decorator, Component, Label, Node } from "cc";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagItemView } from "../../bag/ui/BagItemView";

const { ccclass, property } = _decorator;

@ccclass("ChapterRewardInfoCell")
export class ChapterRewardInfoCell extends Component {
    /** 内层物品选择转交给所属外层SuperContent的事件名，参数为当前物品配置ID。 */
    public static readonly ITEM_SELECTED = "chapter-reward-item-selected";

    /** 当前关卡标题，不表示已解锁或可挑战。 */
    @property(Label) title: Label | null = null;
    /** 横向产物列表，布局和格子资源均由Prefab保存。 */
    @property(SuperScroll) items: SuperScroll | null = null;

    /** 当前行的只读物品索引，复用时替换、销毁时清空，不包含库存。 */
    private catalog: BagItemCatalog | null = null;
    /** 当前关卡与页签的物品ID，复用时替换；临时停用后用于恢复内层列表。 */
    private ids: readonly number[] = [];
    /** 当前已登记事件的内层content，复用和停用时解除，避免重复选择。 */
    private listNode: Node | null = null;

    /** 替换当前行并重置横向起点；外层虚拟列表决定哪些关卡创建和渲染。 */
    public bind(stage: number, ids: readonly number[], catalog: BagItemCatalog): void {
        if (!this.title || !this.items) {
            throw new Error("产物说明关卡行绑定缺失");
        }
        this.title.string = "关卡" + stage;
        this.catalog = catalog;
        this.ids = ids;
        this.renderItems();
    }

    /** 用当前只读数据登记内层事件并提交列表；bind可在外层节点尚未激活时调用。 */
    private renderItems(): void {
        this.unbindList();
        if (!this.items || !this.catalog) {
            return;
        }
        const list = this.items.list;
        this.listNode = list.node;
        list.node.on(SuperContent.RENDER_ITEM, this.onRender, this);
        list.node.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        list.setData(this.ids);
        this.items.toStart();
    }

    /** 内层列表复用物品格时只绘制当前ID，产物说明不展示库存数量。 */
    private onRender(node: Node, id: number): void {
        const cell = node.getComponent(BagItemView);
        if (!cell || !this.catalog) {
            throw new Error("产物说明物品格或显示索引缺失");
        }
        cell.show({ itemId: id, quantity: 0 }, false, this.catalog.face(id, 0));
        cell.count!.node.active = false;
    }

    /** 选择当前内层数据后通知所属外层content，详情入口只由说明页面持有。 */
    private onSelect(id: number): void {
        if (this.catalog && this.node.activeInHierarchy) {
            this.node.parent?.emit(ChapterRewardInfoCell.ITEM_SELECTED, id);
        }
    }

    /** 行被外层复用或隐藏时释放内部列表监听，旧物品不能继续触发详情。 */
    private unbindList(): void {
        if (this.listNode?.isValid) {
            this.listNode.off(SuperContent.RENDER_ITEM, this.onRender, this);
            this.listNode.off(SuperContent.SELECT_ITEM, this.onSelect, this);
        }
        this.listNode = null;
    }

    /** 完整窗口暂时停用后可恢复当前行；已在激活前bind的行不重复登记和绘制。 */
    protected onEnable(): void {
        if (!this.listNode && this.catalog) {
            this.renderItems();
        }
    }

    /** 离开虚拟窗口或页面关闭时解除事件并清空内部映射，保留只读配置供再次激活。 */
    protected onDisable(): void {
        this.unbindList();
        if (this.items?.node?.isValid && this.items.content?.isValid) {
            this.items.list.clear();
        }
    }

    /** 引擎销毁次序不保证子列表仍有效，重复解除本行记录即可。 */
    protected onDestroy(): void {
        this.unbindList();
        this.catalog = null;
        this.ids = [];
    }
}
