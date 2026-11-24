/**
 * 新角色进入主城后的首次命名窗口。输入和按钮状态归本页，
 * 角色名与命名完成状态由服务器快照刷新。
 */
import { _decorator, Button, EditBox, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../AccountModel";
import { RoleController, RoleNameEvent } from "../RoleController";

const { ccclass, property } = _decorator;

/** 主城为命名窗口提供当前应用的角色资料与协议入口。 */
interface RoleNameArgs {
    /** 唯一角色快照，决定是否需要弹窗以及何时关闭。 */
    readonly model: AccountModel;
    /** 负责获取随机名和提交首次命名。 */
    readonly controller: RoleController;
}

@UIRegistry.view({
    id: "role-name",
    prefab: "bundles/module/login/prefabs/RoleNameView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("RoleNameView")
export class RoleNameView extends BaseView<RoleNameArgs> {
    /** 静态面板尺寸，用于小屏等比缩放。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 玩家手输的昵称或随机名回包给出的建议。 */
    @property(EditBox) nameInput: EditBox | null = null;
    /** 重新获取建议昵称。 */
    @property(Button) randomButton: Button | null = null;
    /** 提交当前输入。 */
    @property(Button) confirmButton: Button | null = null;
    /** 随机请求发出时的原输入，null 表示没有在途建议。 */
    private inputBeforeSuggestion: string | null = null;
    /** 等待命名请求回包时防止重复点击。 */
    private submitting = false;

    /** 仅为服务器标记未命名的角色打开子窗口，随主城关闭或换号释放。 */
    public static openFor(owner: BaseView<unknown>, model: AccountModel, controller: RoleController): void {
        if (model.snapshot.role?.firstNamed !== false) {
            return;
        }
        const ui = UIManager.instance;
        void ui.openChild(owner, RoleNameView, { model, controller }).then(view => {
            if (ui.ownsChild(owner, view) && model.snapshot.role?.firstNamed !== false) {
                view.close();
            }
        }).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                ui.toast("命名窗口打开失败，请重试");
            }
        });
    }

    /** 校验静态绑定，登记本次打开的按钮节点、快照与协议反馈。 */
    public onOpen(args?: RoleNameArgs): void {
        const { panel, nameInput, randomButton, confirmButton } = this;
        if (!args || !panel || !nameInput || !randomButton || !confirmButton) {
            throw new Error("首次命名窗口缺少角色入口或预制体绑定");
        }
        if (args.model.snapshot.role?.firstNamed !== false) {
            return;
        }
        const randomNode = randomButton.node;
        const confirmNode = confirmButton.node;
        randomNode.on(Button.EventType.CLICK, this.randomize, this);
        confirmNode.on(Button.EventType.CLICK, this.confirm, this);
        this.ownListener(() => {
            if (randomNode.isValid) {
                randomNode.off(Button.EventType.CLICK, this.randomize, this);
            }
            if (confirmNode.isValid) {
                confirmNode.off(Button.EventType.CLICK, this.confirm, this);
            }
        });
        const events = EventDispatcher.instance;
        this.ownListener(events.on(RoleNameEvent.Suggested, this, this.showSuggestion));
        this.ownListener(events.on(RoleNameEvent.Submitted, this, this.finishSubmission));
        this.ownListener(args.model.subscribe(state => {
            if (state.role?.firstNamed !== false) {
                this.close();
            }
        }));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        this.randomize();
    }

    /** 清空本页在途显示状态，释放输入。 */
    public onClose(): void {
        this.inputBeforeSuggestion = null;
        this.submitting = false;
    }

    /** 适配可见区域，在窄屏保留输入框与两个按钮。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.88 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 记录当前输入并向服务端申请新建议。 */
    private randomize(): void {
        if (this.inputBeforeSuggestion !== null || this.submitting) {
            return;
        }
        this.inputBeforeSuggestion = this.nameInput!.string;
        this.randomButton!.interactable = false;
        this.args!.controller.randomName();
    }

    /** 仅在玩家没有继续输入时填入建议，保护在等待期间输入的名字。 */
    private showSuggestion(nickname: string | null): void {
        if (nickname && !this.submitting && this.nameInput!.string === this.inputBeforeSuggestion) {
            this.nameInput!.string = nickname;
        }
        this.inputBeforeSuggestion = null;
        this.randomButton!.interactable = !this.submitting;
    }

    /** 发送当前输入，校验与重名判断均由服务器处理。 */
    private confirm(): void {
        if (this.submitting) {
            return;
        }
        const nickname = this.nameInput!.string.trim();
        if (!nickname) {
            UIManager.instance.toast("请输入角色名");
            return;
        }
        this.submitting = true;
        this.confirmButton!.interactable = false;
        this.randomButton!.interactable = false;
        this.args!.controller.setFirstName(nickname);
    }

    /** 回包后恢复按钮；只有确认角色资料已更新的快照才能关闭窗口。 */
    private finishSubmission(): void {
        this.submitting = false;
        this.confirmButton!.interactable = true;
        this.randomButton!.interactable = this.inputBeforeSuggestion === null;
    }
}
