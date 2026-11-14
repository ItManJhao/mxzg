/**
 * GM 阵容试战独立窗口：从 Prefab 保存的前三关按钮发起当前阵容只读演示。
 * 应用负责通信和战斗生命周期，本窗仅处理选择、防重复和飘字，不推进关卡或发放奖励。
 */
import { _decorator, Button, Label } from "cc";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GmBattleArgs } from "../data/GmViewArgs";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "gm-battle",
    prefab: "bundles/module/gm/prefabs/GmBattleView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("GmBattleView")
export class GmBattleView extends BaseView<GmBattleArgs> {
    /** 当前测试角色说明。 */
    @property(Label) owner: Label | null = null;
    /** 固定只读说明和准备状态，结果和错误统一用全局飘字。 */
    @property(Label) message: Label | null = null;
    /** 按顺序对应前三关的静态按钮。 */
    @property([Button]) battleButtons: Button[] = [];
    /** 关闭本窗，返回下方总菜单。 */
    @property(Button) closeButton: Button | null = null;
    /** 关闭后忽略迟到的演示准备结果。 */
    private closed = true;
    /** true 表示一次演示正在准备，阻止重复点击。 */
    private busy = false;
    /** 当前打开登记的事件清理函数。 */
    private stops: Array<() => void> = [];

    /** 绑定前三关入口；布局和比例使用 Prefab、Widget 和 ViewportScale。 */
    onOpen(args: GmBattleArgs): void {
        this.releaseBindings();
        this.args = args;
        this.closed = false;
        this.busy = false;
        this.owner!.string = "当前角色：" + args.nickname;
        this.message!.string = "仅演示当前阵容，不推进关卡、不发放奖励。";
        ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.battleButtons.forEach((button, index) => {
            button.interactable = true;
            this.bindButton(button, () => void this.play(index + 1));
        });
        this.bindButton(this.closeButton!, () => this.close());
    }

    /** 等待应用准备演示，同窗一次只请求一关，失败恢复重试入口。 */
    private async play(mission: number): Promise<void> {
        const args = this.args;
        if (this.closed || this.busy || !args) {
            return;
        }
        this.busy = true;
        this.battleButtons.forEach(button => button.interactable = false);
        this.message!.string = "正在准备阵容试战…";
        try {
            await args.openLineupBattle(mission);
            if (!this.closed && this.args === args) {
                UIManager.instance.toast("阵容试战已开始");
            }
        } catch (error) {
            if (!this.closed && this.args === args && !UIManager.isOpenCancelled(error)
                && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("阵容试战失败：" + ErrorUtils.messageOf(error));
            }
        } finally {
            if (!this.closed && this.args === args) {
                this.busy = false;
                this.battleButtons.forEach(button => button.interactable = true);
                this.message!.string = "仅演示当前阵容，不推进关卡、不发放奖励。";
            }
        }
    }

    /** 绑定本窗按钮及对应清理，重复打开不会累加请求。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.stops.push(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 关窗只清理展示监听和迟到回调，真实演示生命周期由应用管理。 */
    onClose(): void {
        this.closed = true;
        this.busy = false;
        this.releaseBindings();
        this.args = undefined;
    }

    /** 解除本次打开登记的监听。 */
    private releaseBindings(): void {
        for (const stop of this.stops.splice(0)) {
            stop();
        }
    }
}
