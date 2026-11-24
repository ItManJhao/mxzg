/** 创建公会时打开的徽章选择窗，选中实际徽章后交回表单。 */
import { _decorator, Button, Node, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GuildBadgeCell } from "./GuildBadgeCell";
import { GuildBadgeUtils } from "./GuildBadgeUtils";

const { ccclass, property } = _decorator;

/** 确认选择时更新所属创建页的徽章草稿。 */
export interface GuildBadgePickerArgs {
    readonly onSelect: (id: number) => void;
}

@UIRegistry.view({
    id: "guild-badge-picker",
    prefab: "bundles/module/guild/prefabs/GuildBadgePickerView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildBadgePickerView")
export class GuildBadgePickerView extends BaseView<GuildBadgePickerArgs> {
    /** 使用同一视口宽度适配的窗口面板。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 预制体配置五列虚拟滚动。 */
    @property(SuperScroll) private _scroll: SuperScroll | null = null;
    /** 右上角关闭入口。 */
    @property(Button) private _close: Button | null = null;

    /** 绑定滚动列表的渲染和选择动作，默认徽章 0 仍可随机分配给创建表单。 */
    public onOpen(args?: GuildBadgePickerArgs): void {
        super.onOpen(args);
        this._scroll!.validateBindings();
        const content = this._scroll!.list.node;
        const close = this._close!.node;
        content.on(SuperContent.RENDER_ITEM, this.renderBadge, this);
        content.on(SuperContent.SELECT_ITEM, this.selectBadge, this);
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this._scroll!.list.setData(Array.from({ length: GuildBadgeUtils.maxId }, (_, index) => index + 1));
    }

    /** 在小屏幕按整个预制体面板缩放，避免排列被裁切。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 交给对应徽章格绘制图片。 */
    private renderBadge(node: Node, badgeId: number): void {
        node.getComponent(GuildBadgeCell)!.render(badgeId);
    }

    /** 选中一枚徽章后回填表单并关闭选择窗。 */
    private selectBadge(badgeId: number): void {
        this.args?.onSelect(badgeId);
        this.close();
    }
}
