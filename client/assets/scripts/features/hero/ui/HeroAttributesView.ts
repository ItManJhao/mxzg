/** 英雄属性明细，读取唯一名册快照并沿用旧属性图标。未接入的加成只记录范围。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";

/** 现有面板中的四项服务端实际数值，与旧属性编号一一对应。 */
const attributes = [[220, "atk"], [223, "hp"], [224, "def"], [101, "spd"]] as const;
const { ccclass, property } = _decorator;

/** 一行权威属性展示，编号用于同源文本和图标。 */
interface AttributeRow {
    readonly id: number;
    readonly value: number;
}

@UIRegistry.view({
    id: "hero-attributes",
    prefab: "bundles/module/hero/prefabs/HeroAttributesView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroAttributesView")
export class HeroAttributesView extends BaseView<{ heroId: string }> {
    /** 按可见区域等比缩放的旧版属性面板。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 点击后关闭属性说明并返回英雄。 */
    @property(Button) closeButton: Button | null = null;
    /** 只包含服务端实际下发数值的属性列表。 */
    @property(SuperScroll) list: SuperScroll | null = null;
    /** 标识当前数据与正式服全量加成的差距。 */
    @property(Label) coverageLabel: Label | null = null;

    /** 上屏时订阅当前英雄和虚拟列表，关闭时同步清理。 */
    public onOpen(args: { heroId: string }): void {
        if (!args?.heroId || !this.panel || !this.closeButton || !this.list || !this.coverageLabel) {
            throw new Error("英雄属性窗缺少参数或预制体绑定");
        }
        const list = this.list.list.node;
        const close = this.closeButton.node;
        list.on(SuperContent.RENDER_ITEM, this.renderRow, this);
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            list.off(SuperContent.RENDER_ITEM, this.renderRow, this);
            close.off(Button.EventType.CLICK, this.close, this);
            EventDispatcher.instance.offTarget(this);
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        this.refresh();
    }

    /** 读取选中英雄的服务器面板，装备变更到达后同步更新。 */
    private refresh(): void {
        const hero = HeroRosterModel.instance.snapshot.heroes.find(row => row.id === this.args?.heroId);
        const stats = hero?.panelStats;
        if (!stats) {
            this.close();
            return;
        }
        this.coverageLabel!.node.active = !stats.complete;
        this.coverageLabel!.string = "已计入装备与套装，其余加成待接入";
        this.list!.list.setData(attributes.map(([id, field]) => ({ id, value: stats.values[field] })));
    }

    /** 使用原属性名称和图标绘制当前虚拟行。 */
    private renderRow(node: Node, row: AttributeRow): void {
        const label = node.getChildByName("Text")?.getComponent(Label);
        const icon = node.getChildByName("Icon");
        if (!label || !icon) {
            throw new Error("英雄属性行缺少图标和文字");
        }
        const name = GameConfig.instance.getConfig(GConfig.Language, 2150000 + row.id)?.value;
        label.string = `${name ?? row.id}：${row.value}`;
        ResManager.setSprite(icon, ResManager.ui("hero", `hero-info-2_spr-attribute-${row.id}`));
    }

    /** 按同一可见区规则适配内容区，保留共享模态的全屏范围。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.90 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
