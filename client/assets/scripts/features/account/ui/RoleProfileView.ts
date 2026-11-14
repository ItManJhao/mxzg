/** 自身角色资料只读 View：复用旧 SettingLayer，UIManager 统一开关并订阅唯一账号状态；不查询角色、不修改资产。 */
import { _decorator, Button, Label, Node, view as ccView } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import type { AccountModel } from "../AccountModel";
import type { RoleProfile } from "../AccountModel";
import { RolePortraitUtils } from "../utils/RolePortraitUtils";

const { ccclass, property } = _decorator;

/** 应用层注入唯一账号状态与既有操作，不携带凭证或另存角色快照。 */
export interface RoleProfileOpenArgs {
    /** 唯一角色资料来源，打开订阅、关闭退订。 */
    model: AccountModel;
    /** 用户明确点击退出时交回账号服务。 */
    logout: () => void;
    /** 只读入口的提示出口。 */
    notice: (text: string) => void;
}
@UIRegistry.view({
    id: "role-profile",
    prefab: "bundles/module/login/prefabs/RoleProfileView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RoleProfileView")
export class RoleProfileView extends BaseView<RoleProfileOpenArgs> {
    /** 服务器昵称，长昵称按预制区域收缩。 */
    @property(Label) nickname: Label | null = null;
    /** 字符串角色 ID，不转换为数值或伪造旧服编号。 */
    @property(Label) roleId: Label | null = null;
    /** 角色等级，不是英雄等级。 */
    @property(Label) level: Label | null = null;
    /** 独立头像资源节点。 */
    @property(Node) face: Node | null = null;
    /** 独立头像框资源节点。 */
    @property(Node) border: Node | null = null;
    /** 关闭资料页按钮。 */
    @property(Button) closeButton: Button | null = null;
    /** 只读保留入口：头像、改名、形象及称号，点击仅说明未开放。 */
    @property([Button]) readonlyButtons: Button[] = [];
    /** 原设置按钮，仅保留已存在的退出登录功能。 */
    @property(Button) settingsButton: Button | null = null;
    /** 账号设置小面板，默认隐藏，不能改角色属性。 */
    @property(Node) settingsPanel: Node | null = null;
    /** 明确标注退出登录，不将点击设置直接解释为退出。 */
    @property(Button) logoutButton: Button | null = null;
    /** 设置面板返回按钮。 */
    @property(Button) settingsClose: Button | null = null;
    /** 当前实例的按钮注销函数；重复绑定先清理，销毁时释放。 */
    private stops: Array<() => void> = [];
    /** 当前模型订阅；重复打开先退订，关闭时释放。 */
    private stopModel: (() => void) | null = null;

    /** 主城注入已有账号操作和提示出口；关闭详情不会退出登录。 */
    bind(logout: () => void, notice: (text: string) => void): void {
        this.release();
        const bind = (button: Button | null, action: () => void) => {
            if (!button) throw new Error("角色详情按钮未绑定");
            const node = button.node;
            node.on(Button.EventType.CLICK, action);
            this.stops.push(() => {
                if (node.isValid) node.off(Button.EventType.CLICK, action);
            });
        };
        bind(this.closeButton, () => this.close());
        bind(this.settingsButton, () => {
            if (this.settingsPanel) this.settingsPanel.active = true;
        });
        bind(this.settingsClose, () => {
            if (this.settingsPanel) this.settingsPanel.active = false;
        });
        bind(this.logoutButton, logout);
        for (const button of this.readonlyButtons) bind(button, () => notice("当前为角色资料只读展示，该操作暂未开放"));
    }

    /** 由本页的唯一账号状态订阅刷新；空角色关闭窗口，不持有第二份角色数据。 */
    render(role: Readonly<RoleProfile> | null): void {
        if (!role) {
            this.close();
            return;
        }
        if (!this.nickname || !this.roleId || !this.level) throw new Error("角色详情资料未绑定");
        this.nickname.string = role.nickname;
        this.roleId.string = "角色 ID：" + role.id;
        this.level.string = String(role.level);
        RolePortraitUtils.paint(this.face, this.border, role.basics?.headId, role.basics?.borderId);
    }

    /** UIManager 打开弹窗，绑定按钮并订阅唯一状态；不追加角色查询。 */
    onOpen(args?: RoleProfileOpenArgs): void {
        if (!args?.model.snapshot.role) throw new Error("角色尚未初始化，不能打开资料");
        this.args = args;
        this.bind(args.logout, args.notice);
        this.stopModel?.();
        this.stopModel = args.model.subscribe(state => {
            if (state.busy || !state.role) this.close();
            else this.render(state.role);
        });
        this.render(args.model.snapshot.role);
        if (this.settingsPanel) this.settingsPanel.active = false;
        this.fit();
        ccView.off("canvas-resize", this.fit, this);
        ccView.on("canvas-resize", this.fit, this);
    }

    /** 统一关闭时清理按钮、模型订阅和视口适配。 */
    onClose(): void {
        ccView.off("canvas-resize", this.fit, this);
        this.release();
        this.stopModel?.();
        this.stopModel = null;
        this.args = undefined;
    }

    /** 只适配资料面板的整体比例；遮罩尺寸与空白关闭统一归ModalLayer，不重排旧节点。 */
    private fit(): void {
        const size = ccView.getVisibleSize();
        const scale = Math.min(1, size.width / 640, size.height / 880);
        this.node.setScale(scale, scale, 1);
    }

    /** 释放当前实例绑定，防止重复开关累计回调。 */
    private release(): void {
        for (const stop of this.stops.splice(0)) stop();
    }

    /** 引擎直接销毁节点时，同样交由 BaseView 结束窗口生命周期。 */
    onDestroy(): void {
        ccView.off("canvas-resize", this.fit, this);
        this.release();
    }
}
