/**
 * 主城组合页面：实例化已有地图和导航栏，使用新账号资料显示资产，并管理子 View 生命周期。
 * 操作反馈转交 UIManager 的全局飘字；原主城背景音乐随本页面装配和释放。
 */
import { GameLog } from "../../../core/GameLog";
import { _decorator, AudioSource, Button, instantiate, Node, Prefab } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import { CityChromeView } from "../../city/ui/CityChromeView";
import { CityHubView } from "../../city/ui/CityHubView";
import { CityChromeShell } from "../../city/ui/CityChromeShell";
import { RemakeConfigUtils } from "../../../config/RemakeConfigUtils";
import { CityNavigationUtils } from "../../../config/CityNavigationUtils";
import { EntryGateUtils } from "../../../config/EntryGateUtils";
import type { AccountState } from "../../account/AccountModel";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import type { HomeActions, HomeView } from "./HomePageBinding";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "remake-home",
    prefab: "bundles/module/home/prefabs/RemakeHomeView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("RemakeHomeView")
export class RemakeHomeView extends BaseView implements HomeView {
    @property(Prefab) cityPrefab: Prefab | null = null;
    @property(Prefab) chromePrefab: Prefab | null = null;
    @property(Node) cityHost: Node | null = null;
    @property(Node) chromeHost: Node | null = null;
    /** 当前组合页面拥有的子节点，失败或关闭时销毁，避免残留半初始化界面。 */
    private childNodes: Node[] = [];
    private city: CityHubView | null = null;
    private chrome: CityChromeView | null = null;
    private role: AccountState["role"] = null;
    private actions: HomeActions | null = null;
    private closed = false;
    private extraUnbind: Array<() => void> = [];
    /** 主城内容区当前显示的页面，默认显示地图。 */
    private currentFeature: "city" | "hero" | "bag" | "battle" | "summon" | "market" | "dungeon" | "clan" | "fetter" | "arena" | "tower" = "city";
    /** 英雄详情将顶栏右侧资源切到英雄经验，离开时立即复原为钻石。 */
    private showHeroExperience = false;
    /** 主城加载后绑定的循环音源。进入战斗专属页面时停止，关主城时清理。 */
    private musicSource: AudioSource | null = null;

    get featureHost(): Node | null { return this.cityHost; }
    /** 切换主城或功能页并刷新底栏选中、音乐和顶栏。英雄详情显示英雄经验。 */
    showFeature(
        id: "city" | "hero" | "bag" | "battle" | "summon" | "market" | "dungeon" | "clan" | "fetter" | "arena" | "tower",
        showHeroExperience = false,
    ): void {
        if (this.closed) return;
        this.currentFeature = id;
        this.showHeroExperience = showHeroExperience;
        this.syncMusic();
        const cityNode = this.city?.node;
        if (cityNode?.isValid) {
            cityNode.active = id === "city";
        }
        UIManager.instance.closeById("role-profile");
        this.showNotice("");
        this.paintRole();
    }

    /** 主城打开后加载预制体，并在培养页响应英雄经验库存变化。 */
    onOpen(): void {
        this.closed = false;
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, () => {
            if (this.showHeroExperience) {
                this.paintCurrencies();
            }
        }));
        this.beginOpen();
        void this.openCity();
    }

    /** 加载主城及顶栏，登记仍存活的入口节点；等子页就绪后完成打开。 */
    private async openCity(): Promise<void> {
        try {
            if (!this.cityPrefab || !this.chromePrefab || !this.cityHost || !this.chromeHost) throw new Error("RemakeHome 未绑定主城 Prefab 或宿主");
            if (this.closed) return;
            const cityNode = instantiate(this.cityPrefab);
            this.childNodes.push(cityNode);
            cityNode.parent = this.cityHost;
            this.city = cityNode.getComponent(CityHubView);
            const chromeNode = instantiate(this.chromePrefab);
            this.childNodes.push(chromeNode);
            chromeNode.parent = this.chromeHost;
            this.chrome = chromeNode.getComponent(CityChromeView);
            if (!this.city || !this.chrome) throw new Error("已有主城 Prefab 缺少 View");
            // 主城持有两个子 View，随 UIManager 管理的主页面一起打开和释放。
            this.city.runOpen({
                onAtom: id => this.actions?.openFeature(id),
                onMainline: () => this.actions?.openFeature("mainline"),
                query: { level: () => this.role?.level || 1, openDay: () => 0, db: RemakeConfigUtils.readCityGates },
            });
            this.chrome.runOpen({
                onTab: id => this.actions?.openFeature(id),
                actions: {
                    openActivity: () => this.actions?.openFeature("activity"),
                    openMore: () => this.actions?.openFeature("more"),
                    openMail: () => this.actions?.openFeature("mail"),
                    openQuest: () => this.actions?.openFeature("quest"),
                },
            });
            const avatar = this.chrome.avatar;
            if (!avatar) throw new Error("顶栏头像入口未绑定");
            const openProfile = () => { if (this.role) this.actions?.openFeature("role-profile"); };
            avatar.on(Button.EventType.CLICK, openProfile);
            this.extraUnbind.push(() => {
                if (avatar.isValid) {
                    avatar.off(Button.EventType.CLICK, openProfile);
                }
            });
            const shell = chromeNode.getComponent(CityChromeShell);
            if (shell?.monthCard) shell.monthCard.active = false;
            for (const button of [shell?.btnAddGold, shell?.btnAddGem]) {
                if (!button) continue;
                const open = () => this.actions?.openFeature("currency");
                button.on(Button.EventType.CLICK, open);
                this.extraUnbind.push(() => {
                    if (button.isValid) {
                        button.off(Button.EventType.CLICK, open);
                    }
                });
            }
            this.paintRole();
            await Promise.all([this.city.whenReady(), this.chrome.whenReady()]);
            if (this.closed || !this.node?.isValid) {
                return;
            }
            this.finishOpen();
            void this.loadMusic();
        } catch (error) {
            if (!this.closed) {
                GameLog.shared.classified("MODULE", "error", "RemakeHomeView", "主城初始化失败：" + String(error));
                this.disposeChildren();
                // 不能把失败报告为就绪，否则第二段进度会显示成功并撤去加载层。
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    /** 读取旧版主城原曲，异步返回时仅给仍打开且存活的页面创建音源。 */
    private async loadMusic(): Promise<void> {
        try {
            const clip = await ResourceAssetsUtils.forNode(this.node).loadPath("audio/bgm-main-city", "AudioClip");
            if (this.closed || !this.node?.isValid) {
                return;
            }
            const source = this.node.addComponent(AudioSource);
            source.clip = clip;
            source.loop = true;
            this.musicSource = source;
            this.syncMusic();
        } catch (error) {
            if (!this.closed) {
                GameLog.shared.warnOnce("MODULE", "RemakeHomeView", "CITY_MUSIC", String(error));
            }
        }
    }

    /** 进入各自持有音源的功能区域后暂停主城配乐。 */
    private syncMusic(): void {
        const source = this.musicSource;
        if (!source) {
            return;
        }
        if (this.currentFeature === "battle" || this.currentFeature === "dungeon" || this.currentFeature === "clan"
            || this.currentFeature === "arena" || this.currentFeature === "tower") {
            AudioPreferences.stopMusic(source);
        } else {
            AudioPreferences.playMusic(source);
        }
    }

    /** 页面绑定提供已开放的功能入口；头像及详情按钮由所属实例统一清理。 */
    bind(actions: HomeActions): () => void {
        this.actions = actions;
        this.paintRole();
        return () => { if (this.actions === actions) this.actions = null; };
    }
    /** 订阅唯一角色状态，刷新顶栏，资料弹窗独立订阅同一状态，不追加角色查询。 */
    render(state: AccountState): void {
        this.role = state.role;
        if (!state.role) UIManager.instance.closeById("role-profile");
        this.paintRole();
    }

    /** 转交当前页面的操作反馈；空串与已关闭页面不改变其他页面的全局提示队列。 */
    showNotice(text: string): void {
        if (!this.closed && text.trim()) {
            UIManager.instance.toast(text);
        }
    }

    /** 从统一快照刷新角色资料和当前战力，活动与快捷组只在主城地图显示。 */
    private paintRole(): void {
        const role = this.role;
        if (!role || !this.chrome) return;
        this.chrome.setIdentity(role.nickname, "");
        this.chrome.setLevelBadge(String(role.level));
        this.chrome.setExperience(role.basics?.experience, role.basics?.experienceToNextLevel);
        this.paintCurrencies();
        this.chrome.setPower(role.power === undefined ? "" : String(role.power));
        RolePortraitUtils.paint(this.chrome.avatarFace, this.chrome.avatarBorder, role.basics?.headId, role.basics?.borderId);
        this.chrome.setCityExtras(this.currentFeature === "city");
        const selectedTab = ["summon", "market", "arena", "tower"].includes(this.currentFeature) ? "city" : this.currentFeature;
        this.chrome.setTabs(["city", "hero", "bag", "battle", "dungeon", "clan", "fetter"].map(id => {
            const gated = id === "dungeon" || id === "clan";
            const gate = gated ? CityNavigationUtils.bottomGate(id) : undefined;
            const gateOpen = !gated || !!gate && EntryGateUtils.isEntryOpen(gate, role.level, 0);
            const available = id === "city" || (this.actions?.availableFeatures?.includes(id) && gateOpen);
            return {
                id,
                text: "",
                state: id === selectedTab ? "selected" : available ? "open" : "locked",
                lockLevel: gate?.level,
            };
        }));
        this.city?.refreshLocks();
    }

    /** 顶栏按旧界面缩写大额资源；不影响账号／背包中的原始余额。 */
    private paintCurrencies(): void {
        if (this.role && this.chrome) {
            const secondary = this.showHeroExperience ? BagModel.instance.quantity(900101) : this.role.diamonds;
            this.chrome.setCurrencies(UiKitUtils.formatAmount(this.role.gold), UiKitUtils.formatAmount(secondary), this.showHeroExperience);
        }
    }

    /** 主城退出时停止场景音乐、关闭资料弹窗并解除头像、货币按钮和子页面监听。 */
    onClose(): void {
        if (this.closed) return;
        this.closed = true;
        if (this.musicSource) {
            AudioPreferences.stopMusic(this.musicSource);
            this.musicSource = null;
        }
        this.failOpen(new Error("页面已关"));
        UIManager.instance.closeById("role-profile");
        this.disposeChildren();
    }

    /** 先解绑，再关闭子视图和销毁其节点；重复清理不影响其他页面。 */
    private disposeChildren(): void {
        for (const unbind of this.extraUnbind.splice(0)) unbind();
        this.city?.runDispose();
        this.chrome?.runDispose();
        this.city = null;
        this.chrome = null;
        for (const node of this.childNodes.splice(0)) if (node.isValid) node.destroy();
    }

    /** 直接销毁主城节点时，先释放子界面，再交给基类清理目标监听和页面适配器。 */
    onDestroy(): void {
        try { this.onClose(); }
        finally { super.onDestroy(); }
    }
}
