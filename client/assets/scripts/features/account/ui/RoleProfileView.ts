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
    /** 本次打开的按钮、资料和尺寸监听，重开前与关闭时统一解除。 */
    private readonly stops: Array<() => void> = [];

    /** 打开资料窗并订阅当前角色；同一窗口重新打开时以最新参数重新绑定一次。 */
    public onOpen(args?: RoleProfileOpenArgs): void {
        if (!args?.model.snapshot.role) {
            throw new Error("角色尚未初始化，不能打开资料");
        }
        this.releaseBindings();
        this.args = args;
        this.bindButtons(args);
        this.stops.push(args.model.subscribe(state => {
            if (state.busy || !state.role) {
                this.close();
                return;
            }
            this.render(state.role);
        }));
        this.render(args.model.snapshot.role);
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
        this.fit();
        ccView.on("canvas-resize", this.fit, this);
        this.stops.push(() => ccView.off("canvas-resize", this.fit, this));
    }

    /** 页面关闭和引擎直接销毁都经 BaseView 进入此处，结束当前显示期的全部监听。 */
    public onClose(): void {
        this.releaseBindings();
        this.args = undefined;
    }

    /** 注册当前窗口的设置、退出和只读按钮。 */
    private bindButtons(args: RoleProfileOpenArgs): void {
        this.bindButton(this.closeButton, () => this.close());
        this.bindButton(this.settingsButton, () => {
            if (this.settingsPanel) {
                this.settingsPanel.active = true;
            }
        });
        this.bindButton(this.settingsClose, () => {
            if (this.settingsPanel) {
                this.settingsPanel.active = false;
            }
        });
        this.bindButton(this.logoutButton, args.logout);
        for (const button of this.readonlyButtons) {
            this.bindButton(button, () => args.notice("当前为角色资料只读展示，该操作暂未开放"));
        }
    }

    /** 保存注册时的节点，组件随窗口销毁后仍可安全移除本次点击监听。 */
    private bindButton(button: Button | null, action: () => void): void {
        if (!button) {
            throw new Error("角色详情按钮未绑定");
        }
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.stops.push(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 用最新角色更新昵称、编号、等级和头像，在窗口中只保留显示所需的数据。 */
    private render(role: Readonly<RoleProfile>): void {
        if (!this.nickname || !this.roleId || !this.level) {
            throw new Error("角色详情资料未绑定");
        }
        this.nickname.string = role.nickname;
        this.roleId.string = "角色 ID：" + role.id;
        this.level.string = String(role.level);
        RolePortraitUtils.paint(this.face, this.border, role.basics?.headId, role.basics?.borderId);
    }

    /** 适配资料面板的整体比例，共享模态层负责屏幕遮罩。 */
    private fit(): void {
        const size = ccView.getVisibleSize();
        const scale = Math.min(1, size.width / 640, size.height / 880);
        this.node.setScale(scale, scale, 1);
    }

    /** 逐项解绑，重复关闭或重新打开时不会累加监听。 */
    private releaseBindings(): void {
        for (const stop of this.stops.splice(0)) {
            stop();
        }
    }
}
