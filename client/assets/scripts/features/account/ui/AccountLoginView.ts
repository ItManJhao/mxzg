/** 登录页面：由 UIManager 打开，账号 Controller 注入登录与选服操作；静态界面保存在同名预制体。 */
import { _decorator, Button, EditBox, Label, Node } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import type { AccountActions, AccountView } from "../AccountController";
import type { AccountState } from "../AccountModel";
import type { GameServer } from "../ServerSelection";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "remake-login",
    prefab: "bundles/module/login/prefabs/AccountLoginView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("AccountLoginView")
export class AccountLoginView extends BaseView implements AccountView {
    /** 本机开发账号输入框，不保存服务器凭证。 */
    @property(EditBox) accountInput: EditBox | null = null;
    /** 进入游戏按钮，将账号输入交给 Controller。 */
    @property(Button) loginButton: Button | null = null;
    /** 恢复本机会话入口。 */
    @property(Button) restoreButton: Button | null = null;
    /** 清除本机会话入口。 */
    @property(Button) logoutButton: Button | null = null;
    /** 连接进度；操作失败统一交全局飘字，不留在固定说明区。 */
    @property(Label) statusLabel: Label | null = null;
    /** 开发渠道说明，不作为角色资料窗口。 */
    @property(Label) profileLabel: Label | null = null;
    /** 仅开发联调使用的账号设置面板。 */
    @property(Node) developerPanel: Node | null = null;
    /** 展开或收起开发设置。 */
    @property(Button) developerButton: Button | null = null;
    /** 打开统一选服弹窗。 */
    @property(Button) serverButton: Button | null = null;
    /** 当前区服名称，由选服状态刷新。 */
    @property(Label) serverLabel: Label | null = null;

    /** 本页最近已反馈的账号错误，清空错误后允许同一操作再次反馈。 */
    private lastError = "";

    /** 绑定本页操作并返回解绑函数，页面关闭后不保留点击回调。 */
    bind(actions: AccountActions): () => void {
        for (const name of ["accountInput", "loginButton", "restoreButton", "logoutButton", "statusLabel", "profileLabel"]) {
            if (!(this as unknown as Record<string, unknown>)[name]) throw new Error("AccountLogin Prefab 未绑定 " + name);
        }
        const login = () => actions.login(this.accountInput!.string);
        const restore = () => actions.restore();
        const logout = () => actions.logout();
        const toggleDeveloper = () => {
            if (this.developerPanel) this.developerPanel.active = !this.developerPanel.active;
        };
        const stops: Array<() => void> = [];
        const listen = (button: Button | null, callback: () => void) => {
            const node = button?.node;
            if (!node) return;
            node.on(Button.EventType.CLICK, callback);
            // 保存实际节点，避免退出销毁后再读取已经清空的 Button.node。
            stops.push(() => { if (node.isValid) node.off(Button.EventType.CLICK, callback); });
        };
        listen(this.loginButton, login);
        listen(this.restoreButton, restore);
        listen(this.logoutButton, logout);
        listen(this.developerButton, toggleDeveloper);
        listen(this.serverButton, () => actions.chooseServer?.());
        return () => { for (const stop of stops.splice(0)) stop(); };
    }

    /** 根据账号状态更新操作及进度；新失败只通过全局飘字报告一次，不发请求。 */
    render(state: AccountState): void {
        this.loginButton!.interactable = !state.busy;
        this.restoreButton!.interactable = !state.busy;
        this.accountInput!.enabled = !state.busy;
        this.accountInput!.node.active = !state.role;
        this.logoutButton!.interactable = !state.busy;
        if (this.developerButton) this.developerButton.interactable = !state.busy;
        if (this.serverButton) this.serverButton.interactable = !state.busy;
        this.statusLabel!.string = state.busy ? "正在连接服务器…" : "";
        const error = state.error || "";
        if (error && error !== this.lastError) {
            UIManager.instance.toast(error);
        }
        this.lastError = error;
        this.profileLabel!.string = state.role ? `当前角色：${state.role.nickname}` : "仅供本机联调 · 暂未接入正式渠道账号";
    }
    /** 更新服务器名称，未同步时显示等待提示。 */
    renderServer(server: GameServer | null): void {
        if (this.serverLabel) this.serverLabel.string = server ? `${server.regionName} · ${server.name}  ▾` : "正在获取区服…";
    }
    /** 回填本机开发账号，不触发登录。 */
    prepareAccount(account: string): void { if (this.accountInput) this.accountInput.string = account; }
}
