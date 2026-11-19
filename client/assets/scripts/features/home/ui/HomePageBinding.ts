/**
 * 主城页面适配器。主城打开时绑定功能入口并订阅唯一账号 Model，退出页面时解除绑定。
 * 地图和底栏的功能入口共用应用注入的导航。
 */
import type { AccountModel, AccountState } from "../../account/AccountModel";

/** 主城地图及底部导航共用的点击入口和页签显示状态。 */
export interface HomeActions {
    openFeature(id: string): void;
    /** 已接通的功能页签，缺省时仅显示主城可用。 */
    availableFeatures?: readonly string[];
}

export interface HomeView {
    bind(actions: HomeActions): () => void;
    render(state: AccountState): void;
    showNotice(text: string): void;
}

/** 主城读取导航登记的可用页签，点击也由同一导航判定是否受理。 */
interface HomeNavigation {
    readonly tabs: readonly string[];
    open(id: string): boolean;
}

export class HomePageBinding {
    /** 本次显示期的按钮与资料订阅，在 close 时一并解除。 */
    private readonly disposers: Array<() => void> = [];

    /**
     * @param account 提供顶栏及主城解锁条件需要的唯一角色资料。
     * @param view 当前主城页，负责绑定按钮和刷新显示。
     * @param navigation 应用注入当前可用的页签与导航入口。独立显示主城时可省略。
     * @param openRoleEntry 主城显示或领取资格变化后，打开当前角色的新手窗口。
     */
    public constructor(
        private readonly account: AccountModel,
        private readonly view: HomeView,
        private readonly navigation?: HomeNavigation,
        private readonly openRoleEntry?: (step: "name" | "gift") => void,
    ) {}

    /** 刷新角色资料，按服务端状态依次打开命名和赠礼窗口。 */
    public show(): void {
        if (this.disposers.length) {
            return;
        }
        try {
            this.disposers.push(this.view.bind({
                openFeature: id => this.onFeatureClick(id),
                availableFeatures: this.navigation?.tabs ?? [],
            }));
            let previousStep: "name" | "gift" | null = null;
            const render = (state: AccountState) => {
                this.view.render(state);
                const role = state.role;
                const step = role?.firstNamed === false ? "name" : role?.welcomeGiftAvailable === true ? "gift" : null;
                if (step !== previousStep) {
                    previousStep = step;
                    if (step) {
                        this.openRoleEntry?.(step);
                    }
                }
            };
            this.disposers.push(this.account.subscribe(render));
            render(this.account.snapshot);
        } catch (error) {
            this.close();
            throw error;
        }
    }

    /** 解除本页的交互和角色资料订阅，其他窗口继续接收各自的更新。 */
    public close(): void {
        for (const dispose of this.disposers.splice(0)) {
            dispose();
        }
    }

    /** 将地图、底栏和资料入口交给导航，主城关闭后忽略残留点击。 */
    private onFeatureClick(id: string): void {
        if (!this.disposers.length) {
            return;
        }
        if (this.navigation?.open(id)) {
            return;
        }
        this.view.showNotice(id === "city" ? "" : "该模块暂停，待登录和背包完善后按原项目重做");
    }
}
