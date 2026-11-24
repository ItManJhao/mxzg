/**
 * 公会里的单行输入窗，由创建、搜索或编辑页面作为子窗打开。
 * 只保留本次输入草稿；确定交回原始文本，取消或父页关闭不改变任何数据。
 */
import { _decorator, Button, EditBox, game } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";

const { ccclass, property } = _decorator;

/** 调用方提供当前草稿、输入长度和确认后的处理方式。 */
export interface GuildTextInputOpenArgs {
    /** 打开时原样回填的内容。 */
    readonly initialValue: string;
    /** 编辑器允许的 UTF-16 单元数；名称加权长度和其他业务校验仍由原页面和服务器处理。 */
    readonly maxLength: number;
    /** 只在明确确认后回传本次草稿；空字符串是否允许由调用方决定。 */
    readonly onConfirm: (value: string) => void;
}

@UIRegistry.view({
    id: "guild-text-input",
    prefab: "bundles/module/guild/prefabs/GuildTextInputView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("GuildTextInputView")
export class GuildTextInputView extends BaseView<GuildTextInputOpenArgs> {
    /** 引擎原生文本编辑器，负责键入、粘贴及输入法上屏。 */
    @property(EditBox) private _input: EditBox | null = null;

    /** 关闭窗口而不更新父页的草稿。 */
    @property(Button) private _cancel: Button | null = null;

    /** 确认并交回当前编辑结果。 */
    @property(Button) private _confirm: Button | null = null;

    /** 是否已登记本显示期的监听，复用窗口只替换参数，不重复订阅。 */
    private listening = false;

    /** 应用最近一次传入的草稿与输入上限，再聚焦预制体里的文本框。 */
    public onOpen(args?: GuildTextInputOpenArgs): void {
        const { _input: editBox, _cancel: cancel, _confirm: confirm } = this;
        if (!args || !editBox || !cancel || !confirm) {
            throw new Error("公会输入窗缺少打开参数或预制体绑定");
        }
        super.onOpen(args);
        this.unschedule(this.confirmInput);
        this.unschedule(this.focusInput);
        editBox.blur();
        editBox.maxLength = args.maxLength;
        editBox.string = args.initialValue;
        this.bindInput(editBox, cancel, confirm);
        this.scheduleOnce(this.focusInput);
    }

    /** 主动撤销待处理键盘提交并离开编辑态，父页关闭时也不会回填。 */
    public onClose(): void {
        this.args = undefined;
        this.unschedule(this.confirmInput);
        this.unschedule(this.focusInput);
        if (this._input?.isValid) {
            this._input.blur();
        }
    }

    /** 在整个显示期绑定一次输入及按键，关闭时一并解绑。 */
    private bindInput(editBox: EditBox, cancel: Button, confirm: Button): void {
        if (this.listening) {
            return;
        }
        this.listening = true;
        const editNode = editBox.node;
        const cancelNode = cancel.node;
        const confirmNode = confirm.node;
        const document = game.canvas?.ownerDocument;
        editNode.on(EditBox.EventType.EDITING_RETURN, this.onEditingReturn, this);
        cancelNode.on(Button.EventType.CLICK, this.close, this);
        confirmNode.on(Button.EventType.CLICK, this.confirmInput, this);
        document?.addEventListener("keydown", this.onWebKeyDown, true);
        this.ownListener(() => {
            this.listening = false;
            document?.removeEventListener("keydown", this.onWebKeyDown, true);
            if (editNode.isValid) {
                editNode.off(EditBox.EventType.EDITING_RETURN, this.onEditingReturn, this);
            }
            if (cancelNode.isValid) {
                cancelNode.off(Button.EventType.CLICK, this.close, this);
            }
            if (confirmNode.isValid) {
                confirmNode.off(Button.EventType.CLICK, this.confirmInput, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 下一帧布局完成后聚焦；浏览器如限制软键盘自动打开，仍可点输入框编辑。 */
    private focusInput(): void {
        if (this.args && this._input?.isValid) {
            this._input.focus();
        }
    }

    /** 等引擎本次回车/键盘回调结束后再提交，避免回调还在使用被关闭的 EditBox。 */
    private onEditingReturn(): void {
        this.scheduleOnce(this.confirmInput);
    }

    /** Web 合成字期间回车只上屏；普通 Esc 取消，Tab 不穿透到下方表单。 */
    private readonly onWebKeyDown = (event: KeyboardEvent): void => {
        if (!this.node.activeInHierarchy) {
            return;
        }
        const focused = this._input?.isFocused();
        if (event.isComposing || event.keyCode === 229) {
            if (focused && (event.keyCode === 13 || event.key === "Enter" || event.key === "Escape")) {
                // 只阻止引擎接到回车，不阻止浏览器输入法完成候选字。
                event.stopPropagation();
            }
            return;
        }
        if (event.key === "Escape" || (event.key === "Tab" && focused)) {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Escape") {
                this.close();
            }
        }
    };

    /** 只确认一次；先结束编辑并关闭子窗，再让父页决定是否提交业务。 */
    private confirmInput(): void {
        const { args, _input: editBox } = this;
        if (!args || !editBox) {
            return;
        }
        this.args = undefined;
        editBox.blur();
        const value = editBox.string;
        this.close();
        args.onConfirm(value);
    }
}
