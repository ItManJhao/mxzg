/** 主城页面适配器：订阅唯一账号状态，向应用层转交页面入口，不创建弹窗或修改资产。 */
import { AccountModel } from "../account/AccountModel";
import type { AccountState } from "../account/AccountModel";
import { AccountService } from "../account/AccountService";

export interface HomeActions { logout(): void; openFeature(id: string): void; heroAvailable?: boolean; availableFeatures?: readonly string[]; }
export interface HomeView {
    bind(actions: HomeActions): () => void;
    render(state: AccountState): void;
    showNotice(text: string): void;
}

/** Home reads the account Model; it never copies profile data into another store. */
export class HomeController {
    private disposers: Array<() => void> = [];
    constructor(private readonly account: AccountModel, private readonly service: AccountService,
        private readonly view: HomeView, private readonly openFeature?: (id: string) => boolean) { }

    /** 绑定主城操作并订阅账号资料，角色详情入口交由应用统一注册的 UIManager 打开。 */
    show(): void {
        if (this.disposers.length) return;
        const unbind = this.view.bind({
            logout: () => this.service.logout(), heroAvailable: !!this.openFeature,
            availableFeatures: this.openFeature ? ["bag", "hero", "battle", "mainline"] : [], openFeature: id => {
                if ((id === "battle" || id === "mainline" || id === "hero" || id === "bag" || id === "city" || id === "role-profile") && this.openFeature?.(id)) return;
                this.view.showNotice(id === "city" ? "" : "该模块暂停，待登录和背包完善后按原项目重做");
            }
        });
        this.disposers = [unbind, this.account.subscribe(state => this.view.render(state))];
        try { this.view.render(this.account.snapshot); }
        catch (error) { this.close(); throw error; }
    }
    close(): void { for (const dispose of this.disposers.splice(0)) dispose(); }
}
