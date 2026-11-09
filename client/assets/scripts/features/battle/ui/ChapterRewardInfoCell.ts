/** 产物说明关卡行，由说明页传入静态配置；屏幕外清空物品格，避免850关同时加载图片。 */
import { _decorator, Component, Label, Rect, UITransform } from "cc";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagItemView } from "../../bag/ui/BagItemView";
const { ccclass, property } = _decorator;

@ccclass("ChapterRewardInfoCell")
export class ChapterRewardInfoCell extends Component {
    /** 静态关卡标题，不表示已解锁。 */
    @property(Label) title: Label | null = null;
    /** 旧横向产物列表；布局与格子尺寸由Prefab保存。 */
    @property(SuperScroll) items: SuperScroll | null = null;
    /** 当前页选中的产物ID，切换页签时替换。 */
    private ids: readonly number[] = [];
    /** 当前页面注入的只读物品配置；无数据时为null。 */
    private catalog: BagItemCatalog | null = null;
    /** 页面注入的详情入口，不执行获取或使用。 */
    private onItem: ((id: number) => void) | null = null;
    /** true表示本行已绘制图标，离开可视区域时清空。 */
    private drawn = false;

    /** 替换本行配置并清除旧格子，实际进入可视区域时才绘制。 */
    public bind(stage: number, ids: readonly number[], catalog: BagItemCatalog, onItem: (id: number) => void): void {
        if (!this.title || !this.items) {
            throw new Error("产物说明关卡行绑定缺失");
        }
        this.title.string = "关卡" + stage;
        this.ids = ids;
        this.catalog = catalog;
        this.onItem = onItem;
        this.items.list.clear();
        this.drawn = false;
    }

    /** 根据父列表裁剪区域挂载/清空图标；不手算格子位置或滚动高度。 */
    public refreshVisible(port: Rect): void {
        const visible = this.getComponent(UITransform)!.getBoundingBoxToWorld().intersects(port);
        if (visible === this.drawn || !this.items || !this.catalog) {
            return;
        }
        this.drawn = visible;
        if (!visible) {
            this.items.list.clear();
            return;
        }
        this.items.list.setData(this.ids, (node, id) => {
            const cell = node.getComponent(BagItemView);
            if (!cell) {
                throw new Error("产物说明物品格绑定缺失");
            }
            cell.show({ itemId: id, quantity: 0 }, false, () => this.onItem?.(id), this.catalog!.face(id, 0));
            cell.count!.node.active = false;
        });
        this.items.toStart();
    }
}
