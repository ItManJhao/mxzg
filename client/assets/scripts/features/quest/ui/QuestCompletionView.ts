/** 顶部成就达成提示。静态布局由 Prefab 保存，只负责本次提示的显示、动画和点击。 */
import { _decorator, Button, Label, Node, tween, Tween, UITransform, Vec3, Widget } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";

const { ccclass, property } = _decorator;

/** 由应用注入本次提示文案和前往成就页的操作。 */
interface QuestCompletionArgs {
    readonly title: string;
    readonly openAchievements: () => boolean;
}

@UIRegistry.view({
    id: "quest-completion",
    prefab: "bundles/module/common/prefabs/QuestCompletionView",
    layer: UILayer.Toast,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
})
@ccclass("QuestCompletionView")
export class QuestCompletionView extends BaseView<QuestCompletionArgs> {
    /** 固定在外根顶部的锚点，视口更新时重算 Widget。 */
    @property(Widget) private topDock: Widget | null = null;
    /** 上下滑动的横幅，只在其自身范围内响应点击。 */
    @property(Node) private banner: Node | null = null;
    /** 显示本次成就的真实名称。 */
    @property(Label) private taskLabel: Label | null = null;
    /** 打开成就页的点击区域。 */
    @property(Button) private openButton: Button | null = null;

    /** 顶部滑入并停留，点击成就名或停留结束后收起。 */
    public onOpen(args?: QuestCompletionArgs): void {
        const { banner, taskLabel, openButton, topDock } = this;
        if (!args || !banner || !taskLabel || !openButton || !topDock) {
            throw new Error("顶部成就提示绑定缺失");
        }
        super.onOpen(args);
        const height = banner.getComponent(UITransform)?.height ?? 106;
        const shown = banner.position.clone();
        const hidden = new Vec3(shown.x, shown.y + height, shown.z);
        taskLabel.string = args.title;
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => {
            ViewportLayoutUtils.fitVisibleRoot(this.node);
            topDock.updateAlignment();
        }));
        const open = (): void => {
            if (args.openAchievements()) {
                this.close();
            }
        };
        const buttonNode = openButton.node;
        buttonNode.on(Button.EventType.CLICK, open);
        this.ownListener(() => {
            if (buttonNode.isValid) {
                buttonNode.off(Button.EventType.CLICK, open);
            }
        });
        this.ownListener(() => Tween.stopAllByTarget(banner));
        banner.setPosition(hidden);
        tween(banner).to(0.45, { position: shown }, { easing: "quadOut" })
            .delay(3.1).to(0.45, { position: hidden }, { easing: "quadIn" })
            .call(() => this.close()).start();
    }
}
