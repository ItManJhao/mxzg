/**
 * 开发 GM 总入口：从完整 Prefab 打开英雄、道具、技能和阵容试战独立窗口。
 * 子窗复用应用提供的唯一控制器，模态由 UIManager 共享；关窗取消迟到的子窗加载。
 */
import {_decorator, Button, Label} from "cc";
import {ErrorUtils} from "../../../core/ErrorUtils";
import {BaseView} from "../../../framework/ui/BaseView";
import {UILayer} from "../../../framework/ui/UILayer";
import {UIManager} from "../../../framework/ui/UIManager";
import {UIRegistry} from "../../../framework/ui/UIRegistry";
import {ViewportLayoutUtils} from "../../../framework/ui/ViewportLayoutUtils";
import {GmOpenArgs} from "../data/GmViewArgs";
import {GmGrantView} from "./GmGrantView";
import {GmBattleView} from "./GmBattleView";

const {ccclass, property} = _decorator;

@UIRegistry.view({
    id: "gm",
    prefab: "bundles/module/gm/prefabs/GmView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: {mask: true, closeOnOutside: false},
})
@ccclass("GmView")
export class GmView extends BaseView<GmOpenArgs> {
    /** 当前测试角色说明，不保存或修改资产。 */
    @property(Label) owner: Label | null = null;
    /** 打开英雄发放独立窗口。 */
    @property(Button) heroButton: Button | null = null;
    /** 打开道具发放独立窗口。 */
    @property(Button) itemButton: Button | null = null;
    /** 调用应用提供的技能验收入口。 */
    @property(Button) skillButton: Button | null = null;
    /** 打开前三关只读阵容试战窗口。 */
    @property(Button) battleButton: Button | null = null;
    /** 关闭整个 GM 窗口链，不注销角色。 */
    @property(Button) closeButton: Button | null = null;
    /** 固定使用说明及开关状态；操作结果统一用全局飘字。 */
    @property(Label) message: Label | null = null;
    /** 关闭后不展示迟到的异步结果。 */
    private closed = true;
    /** 子入口准备期间阻止重复打开。 */
    private openingChild = false;
    /** 本次打开登记的事件清理函数。 */
    private stops: Array<() => void> = [];

    /** 绑定四类入口并查询真实开关；布局和比例由 Prefab、Widget 与 ViewportScale 保存。 */
    onOpen(args: GmOpenArgs): void {
        this.releaseBindings();
        this.args = args;
        this.closed = false;
        this.openingChild = false;
        this.owner!.string = "当前角色：" + args.nickname + "\n" + args.roleId;
        this.message!.string = "正在检查服务端 GM 开关…";
        ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.bindButton(this.heroButton!, () => void this.openGrant("hero"));
        this.bindButton(this.itemButton!, () => void this.openGrant("item"));
        this.bindButton(this.skillButton!, () => void this.openSkill());
        this.bindButton(this.battleButton!, () => void this.openBattle());
        this.bindButton(this.closeButton!, () => this.close());
        this.refreshButtons();
        void this.readStatus(args);
    }

    /** 查询真实开关；失败保留不可确认状态并通过统一飘字报告，不伪装为开启。 */
    private async readStatus(args: GmOpenArgs): Promise<void> {
        try {
            const enabled = await args.controller.enabled();
            if (!this.closed && this.args === args) {
                this.message!.string = enabled
                    ? "仅用于当前测试角色。选择功能进入对应 GM 窗口。"
                    : "服务端 GM 已关闭，发放不可用；只读测试仍可打开。";
            }
        } catch (error) {
            if (!this.closed && this.args === args) {
                this.message!.string = "服务端 GM 状态暂不可用，请重新打开检查。";
                UIManager.instance.toast("GM 状态检查失败：" + ErrorUtils.messageOf(error));
            }
        }
    }

    /** 按固定类别打开独立发放窗，实际加载失败已由 UIManager 报告，不重复飘字。 */
    private async openGrant(kind: "hero" | "item"): Promise<void> {
        const args = this.args;
        if (this.closed || this.openingChild || !args) {
            return;
        }
        this.openingChild = true;
        this.refreshButtons();
        try {
            await UIManager.instance.open(GmGrantView, {
                controller: args.controller,
                roleId: args.roleId,
                nickname: args.nickname,
                kind,
            });
        } catch (_error) {
            // UIManager 已报告实际加载失败；取消打开不提示。
        } finally {
            this.finishChildOpening(args);
        }
    }

    /** 技能验收由应用组织；业务失败在仍打开的本窗边界通过全局飘字报告。 */
    private async openSkill(): Promise<void> {
        const args = this.args;
        if (this.closed || this.openingChild || !args?.openSkillAudit) {
            return;
        }
        this.openingChild = true;
        this.refreshButtons();
        try {
            await args.openSkillAudit();
        } catch (error) {
            if (!this.closed && this.args === args && !UIManager.isOpenCancelled(error)
                && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("技能测试没有打开：" + ErrorUtils.messageOf(error));
            }
        } finally {
            this.finishChildOpening(args);
        }
    }

    /** 打开独立试战选择窗，应用继续负责通信和演示生命周期。 */
    private async openBattle(): Promise<void> {
        const args = this.args;
        if (this.closed || this.openingChild || !args?.openLineupBattle) {
            return;
        }
        this.openingChild = true;
        this.refreshButtons();
        try {
            await UIManager.instance.open(GmBattleView, {
                nickname: args.nickname,
                openLineupBattle: args.openLineupBattle,
            });
        } catch (_error) {
            // 窗口加载失败由 UIManager 统一提示，菜单保留重试入口。
        } finally {
            this.finishChildOpening(args);
        }
    }

    /** 仅恢复发起这次打开的菜单，旧承诺不能改写重新打开后的状态。 */
    private finishChildOpening(args: GmOpenArgs): void {
        if (!this.closed && this.args === args) {
            this.openingChild = false;
            this.refreshButtons();
        }
    }

    /** 同步忙碌与应用能力；未装配的测试入口保留可见但不可点击。 */
    private refreshButtons(): void {
        const ready = !this.closed && !this.openingChild;
        this.heroButton!.interactable = ready;
        this.itemButton!.interactable = ready;
        this.skillButton!.interactable = ready && !!this.args?.openSkillAudit;
        this.battleButton!.interactable = ready && !!this.args?.openLineupBattle;
    }

    /** 登记本窗按钮动作及清理，重复打开不累积监听。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.stops.push(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 关闭时取消发放、试战子窗及在途打开，控制器仍保留结果未明的幂等请求。 */
    onClose(): void {
        this.closed = true;
        this.openingChild = false;
        this.releaseBindings();
        this.args = undefined;
        UIManager.instance.closeById("gm-grant");
        UIManager.instance.closeById("gm-battle");
    }

    /** 解除本次登记的监听，不影响其他窗口。 */
    private releaseBindings(): void {
        for (const stop of this.stops.splice(0)) {
            stop();
        }
    }
}
