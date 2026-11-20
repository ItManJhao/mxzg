/**
 * 角色资料的系统设置窗口：展示当前区服，修改设备音频开关并转交既有账号切换操作。
 * 由角色资料打开，使用同一模态宿主。音频归 AudioPreferences，退出归账号层。
 */
import { _decorator, Button, Label, Node } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";

/** 由角色资料提供的区服名称和账号切换入口。 */
export interface RoleSettingsOpenArgs {
    /** 当前登录角色的区服显示名，目录缺行时可呈现真实区服 ID。 */
    readonly serverName: string;
    /** 用户选择切换账号后调用，沿用账号层的退出流程。 */
    readonly logout: () => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "role-settings",
    prefab: "bundles/module/login/prefabs/RoleSettingsView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RoleSettingsView")
export class RoleSettingsView extends BaseView<RoleSettingsOpenArgs> {
    /** 显示当前角色所在的区服。 */
    @property(Label) serverName: Label | null = null;
    /** 关闭设置，回到角色资料页。 */
    @property(Button) closeButton: Button | null = null;
    /** 背景音乐复选框的输入区。 */
    @property(Button) musicButton: Button | null = null;
    /** 背景音乐开启时显示的勾选图。 */
    @property(Node) musicCheck: Node | null = null;
    /** 音效复选框的输入区。 */
    @property(Button) effectsButton: Button | null = null;
    /** 音效开启时显示的勾选图。 */
    @property(Node) effectsCheck: Node | null = null;
    /** 显式退出当前账号，返回登录。 */
    @property(Button) logoutButton: Button | null = null;

    /** 首次挂载注册控件，页面关闭时 BaseView 统一解除。 */
    public onCreate(): void {
        this.bindButton(this.closeButton, () => this.close());
        this.bindButton(this.musicButton, () => {
            AudioPreferences.setMusicEnabled(!AudioPreferences.musicEnabled);
            this.paintAudio();
        });
        this.bindButton(this.effectsButton, () => {
            AudioPreferences.setEffectsEnabled(!AudioPreferences.effectsEnabled);
            this.paintAudio();
        });
        this.bindButton(this.logoutButton, () => this.logout());
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 展示本次真实区服资料，复选框以当前设备设置为准。 */
    public onOpen(args?: RoleSettingsOpenArgs): void {
        if (!args || !this.serverName || !this.musicCheck || !this.effectsCheck) {
            throw new Error("系统设置参数或预制体绑定缺失");
        }
        this.serverName.string = args.serverName;
        this.paintAudio();
    }

    /** 清除本次账号操作入口，由 BaseView 释放控件监听。 */
    public onClose(): void {
        this.args = undefined;
    }

    /** 点击只在该窗口生命周期内生效。 */
    private bindButton(button: Button | null, action: () => void): void {
        if (!button) {
            throw new Error("系统设置按钮未绑定");
        }
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 更新音乐、音效各自的勾选状态。 */
    private paintAudio(): void {
        this.musicCheck!.active = AudioPreferences.musicEnabled;
        this.effectsCheck!.active = AudioPreferences.effectsEnabled;
    }

    /** 关闭窗口并转交一次退出操作，重复点击不再次调用账号层。 */
    private logout(): void {
        const action = this.args?.logout;
        if (action) {
            this.args = undefined;
            this.close();
            action();
        }
    }
}
