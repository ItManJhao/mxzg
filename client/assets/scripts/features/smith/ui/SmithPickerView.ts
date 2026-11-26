/** 铁匠铺的精灵和神装选取窗。只选择真实库存实例，确认后将字符串 ID 交回原页的选择草稿。 */
import { _decorator, Button, Label, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagEvent } from "../../bag/utils/BagEvent";
import { HeroRosterEvent } from "../../hero/utils/HeroRosterEvent";
import { SmithCategoryCell } from "./SmithCategoryCell";
import { SmithItemCell, type SmithItemFace } from "./SmithItemCell";

/** 选格的字符串键始终保留为持久实例 ID。 */
export interface SmithPickerChoice extends SmithItemFace {
    readonly instanceId: string;
    readonly group?: number;
}

/** 页面提供实时库存投影与确认入口，列表不修改背包或名册。 */
interface SmithPickerArgs {
    readonly title: string;
    readonly limit: 1 | 3;
    readonly selected: readonly string[];
    readonly candidates: () => readonly SmithPickerChoice[];
    readonly categories?: readonly {group: number; title: string}[];
    /** 神装升星要求同一配置的三件独立实例。 */
    readonly sameTemplate?: boolean;
    readonly confirm: (ids: readonly string[]) => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "smith-inventory-picker",
    prefab: "bundles/module/smith/prefabs/SmithPickerView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("SmithPickerView")
export class SmithPickerView extends BaseView<SmithPickerArgs> {
    /** 按精灵、神装排列的原尺寸面板，只激活本次使用的面板。 */
    @property([UITransform]) private panels: UITransform[] = [];
    /** 按精灵、神装排列的标题牌文字。 */
    @property([Label]) private titles: Label[] = [];
    /** 神装面板内的横向套装列表。 */
    @property(SuperScroll) private categoryBar: SuperScroll | null = null;
    /** 按精灵、神装排列的独立实例列表。 */
    @property([SuperScroll]) private itemLists: SuperScroll[] = [];
    /** 按精灵、神装排列的右侧已选计数。 */
    @property([Label]) private counts: Label[] = [];
    /** 按精灵、神装排列的底部确认按钮。 */
    @property([Button]) private accepts: Button[] = [];
    /** 按精灵、神装排列的右上关闭按钮。 */
    @property([Button]) private cancels: Button[] = [];
    /** 窗口打开时从调用参数确定的面板下标，0 为精灵，1 为带套装分类的神装。 */
    private activePanel = 0;
    /** 当前选择，随库存刷新删除失效实例，关窗后不持有。 */
    private ids = new Set<string>();
    /** 当前套装过滤，0 表示全部类别。 */
    private group = 0;

    /** 打开精灵或神装的对应面板，并绑定本次选择的控件。 */
    public onOpen(args?: SmithPickerArgs): void {
        const groups = [this.panels, this.titles, this.itemLists, this.counts, this.accepts, this.cancels];
        if (!args || !this.categoryBar || groups.some(group => group.length !== 2 || !group[0] || !group[1])) {
            throw new Error("铁匠铺库存选择缺少参数或预制体绑定");
        }
        super.onOpen(args);
        this.ids = new Set(args.selected);
        this.group = 0;
        this.activePanel = args.categories?.length ? 1 : 0;
        this.panels.forEach((panel, index) => { panel.node.active = index === this.activePanel; });
        this.titles[this.activePanel].string = args.title;
        if (this.activePanel === 1) {
            const categoryList = this.categoryBar.list.node;
            categoryList.on(SuperContent.SELECT_ITEM, this.selectGroup, this);
            this.ownListener(() => {
                if (categoryList.isValid) {
                    categoryList.off(SuperContent.SELECT_ITEM, this.selectGroup, this);
                }
            });
        }
        this.listen(this.accepts[this.activePanel], this.confirm);
        this.listen(this.cancels[this.activePanel], this.close);
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel.bind(this)));
        this.refresh();
        this.itemLists[this.activePanel].toStart();
    }

    /** 绑定本次窗口按钮，不接触已销毁节点。 */
    private listen(button: Button, action: () => void): void {
        const target = button.node;
        target.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (target.isValid) {
                target.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 根据当前组返回到列表起始处。 */
    private selectGroup(row: { group: number }): void {
        this.group = row.group;
        this.refresh();
        this.itemLists[this.activePanel].toStart();
    }

    /** 清理已失效实例并重绘当前类别，切换筛选保留合法已选择。 */
    private refresh(): void {
        const args = this.args!;
        const options = args.candidates();
        const allowed = new Set(options.map(row => row.instanceId));
        this.ids = new Set([...this.ids].filter(id => allowed.has(id)));
        const selectedTemplate = args.sameTemplate ? options.find(row => this.ids.has(row.instanceId))?.itemId : undefined;
        const visible = options.filter(row => (!this.group || row.group === this.group)
            && (selectedTemplate === undefined || row.itemId === selectedTemplate));
        if (this.activePanel === 1) {
            this.categoryBar!.list.setData(args.categories ?? [], (node, row) => {
                node.getComponent(SmithCategoryCell)!.show(row.title, row.group === this.group);
            });
        }
        this.counts[this.activePanel].string = `已选数量（${this.ids.size}/${args.limit}）`;
        this.itemLists[this.activePanel].list.setData(visible, (node, item) => {
            node.getComponent(SmithItemCell)!.show({ ...item, selected: this.ids.has(item.instanceId) },
                () => this.select(item.instanceId));
        });
    }

    /** 单选替换已选项，多选在角色持有的有效实例中限制上限。 */
    private select(id: string): void {
        if (!this.ids.delete(id)) {
            if (this.args!.limit === 1) {
                this.ids.clear();
            }
            if (this.ids.size < this.args!.limit) {
                this.ids.add(id);
            }
        }
        this.refresh();
    }

    /** 提交复制后的选择，关闭窗口释放自己的临时列表。 */
    private confirm(): void {
        const submit = this.args!.confirm;
        const chosen = Array.from(this.ids);
        this.close();
        submit(chosen);
    }

    /** 分别适配精灵和神装面板，窄屏保留完整框面和底部按钮。 */
    private fitPanel(): void {
        const area = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panels[this.activePanel];
        const scale = Math.min(1, area.width * 0.96 / panel.width, area.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
