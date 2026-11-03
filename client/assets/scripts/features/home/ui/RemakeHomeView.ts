/**
 * 主城组合页面：实例化已有地图和导航栏，使用新账号资料显示资产，并管理子 View 生命周期。
 */
import { _decorator, Button, instantiate, Label, Node, Prefab } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import {RoleProfileView} from "../../account/ui/RoleProfileView";
import {paintRolePortrait} from "../../account/ui/RolePortrait";
import { CityChromeView } from "../../city/ui/CityChromeView";
import { CityHubView } from "../../city/ui/CityHubView";
import { CityChromeShell } from "../../city/ui/CityChromeShell";
import { prepareCityConfig, readCityGates } from "../../../config/RemakeConfig";
import type { AccountState } from "../../account/AccountModel";
import type { HomeActions, HomeView } from "../HomeController";

const { ccclass, property } = _decorator;

@ccclass("RemakeHomeView")
export class RemakeHomeView extends BaseView implements HomeView {
  @property(Prefab) cityPrefab: Prefab | null = null;
  @property(Prefab) chromePrefab: Prefab | null = null;
  @property(Node) cityHost: Node | null = null;
  @property(Node) chromeHost: Node | null = null;
  @property(Label) noticeLabel: Label | null = null;
  @property(Node) noticePanel: Node | null = null;
  /** 复用旧 SettingLayer 的只读角色资料预制体，由主城持有。 */
  @property(Prefab) profilePrefab: Prefab | null = null;
  /** 当前主城唯一详情实例，页面退出时销毁，不保存独立角色状态。 */
  private profile: RoleProfileView | null = null;
  private city: CityHubView | null = null;
  private chrome: CityChromeView | null = null;
  private role: AccountState["role"] = null;
  private actions: HomeActions | null = null;
  private closed = false;
  private extraUnbind: Array<() => void> = [];
  private currentFeature: "city" | "hero" | "bag" | "battle" = "city";

  get featureHost(): Node | null { return this.cityHost; }
  get cityContent(): Node | null { return this.city?.node || null; }

  /** 切换主城或背包只隐藏内容区；共用头像保留，角色详情同时收起。 */
  showFeature(id: "city" | "hero" | "bag" | "battle"): void {
    if (this.closed) return;
    this.currentFeature = id;
    if (this.city?.node.isValid) this.city.node.active = id === "city";
    this.profile?.hide();
    this.showNotice("");
    this.paintRole();
  }

  /** 主城页面打开后加载已有预制体，生命周期由 UIManager 管理。 */
  onOpen(): void {
    this.closed = false;
    this.beginOpen();
    void this.openCity();
  }

  /** 加载原主城及顶栏，并挂载一个只读资料实例；关闭中断时不再创建节点。 */
  private async openCity(): Promise<void> {
    try {
      if (!this.cityPrefab || !this.chromePrefab || !this.cityHost || !this.chromeHost || !this.profilePrefab) throw new Error("RemakeHome 未绑定主城 Prefab 或宿主");
      await prepareCityConfig();
      if (this.closed) return;
      const cityNode = instantiate(this.cityPrefab);
      cityNode.parent = this.cityHost;
      this.city = cityNode.getComponent(CityHubView);
      const chromeNode = instantiate(this.chromePrefab);
      chromeNode.parent = this.chromeHost;
      this.chrome = chromeNode.getComponent(CityChromeView);
      if (!this.city || !this.chrome) throw new Error("已有主城 Prefab 缺少 View");
      // 主城持有两个子 View，随 UIManager 管理的主页面一起打开和释放。
      this.city.runOpen({
        onAtom: id => this.actions?.openFeature(id),
        onMainline: () => this.actions?.openFeature("mainline"),
        query: { level: () => this.role?.level || 1, openDay: () => 0, db: readCityGates },
      });
      this.chrome.runOpen({
        onTab: id => this.actions?.openFeature(id),
        actions: {
          openActivity: () => this.actions?.openFeature("activity"),
          openMore: () => this.actions?.openFeature("more"),
          openMail: () => this.actions?.openFeature("mail"),
        },
      });
      const profileNode = instantiate(this.profilePrefab);
      profileNode.parent = this.node;
      this.profile = profileNode.getComponent(RoleProfileView);
      if (!this.profile) throw new Error("角色资料预制体缺少 RoleProfileView");
      this.profile.bind(() => this.actions?.logout(), text => this.showNotice(text));
      this.profile.hide();
      this.noticePanel?.setSiblingIndex(this.node.children.length - 1);
      const avatar = this.chrome.avatar;
      if (!avatar) throw new Error("顶栏头像入口未绑定");
      const openProfile = () => {if (this.role) {this.profile?.render(this.role);this.profile?.show();}};
      avatar.on(Button.EventType.CLICK, openProfile);
      this.extraUnbind.push(() => avatar.off(Button.EventType.CLICK, openProfile));
      const shell = chromeNode.getComponent(CityChromeShell);
      if (shell?.monthCard) shell.monthCard.active = false;
      for (const button of [shell?.btnAddGold, shell?.btnAddGem]) {
        if (!button) continue;
        const open = () => this.actions?.openFeature("currency");
        button.on(Button.EventType.CLICK, open);
        this.extraUnbind.push(() => button.off(Button.EventType.CLICK, open));
      }
      this.paintRole();
      await Promise.all([this.city.whenReady(), this.chrome.whenReady()]);
      if (this.closed) return;
      this.finishOpen();
    } catch (error) {
      if (!this.closed) {
        console.error("[RemakeHome] city initialization", error);
        this.city?.runDispose();
        this.chrome?.runDispose();
        this.city = null;
        this.chrome = null;
        for (const unbind of this.extraUnbind.splice(0)) unbind();
        this.showNotice("主城加载失败，请退出登录后重试");
        // 保留错误提示，不将资源失败显示成资料加载成功。
        this.finishOpen();
      }
    }
  }

  /** 主城 Controller 注入已有操作；头像及详情按钮由所属实例统一清理。 */
  bind(actions: HomeActions): () => void {
    this.actions = actions;
    this.paintRole();
    return () => { if (this.actions === actions) this.actions = null; };
  }
  /** 订阅唯一角色状态，同时刷新顶栏和已打开的资料页，不追加角色查询。 */
  render(state: AccountState): void {
    this.role = state.role;
    if (!state.role) this.profile?.hide();
    this.paintRole();
  }

  showNotice(text: string): void {
    if (this.noticeLabel) this.noticeLabel.string = text;
    if (this.noticePanel) this.noticePanel.active = !!text;
  }

  /** 只显示服务器资料；头像与头像框分别解析，未知战力不伪造为零。 */
  private paintRole(): void {
    const role = this.role;
    if (!role || !this.chrome) return;
    this.chrome.setIdentity(role.nickname, "");
    this.chrome.setLevelBadge(String(role.level));
    this.chrome.setCurrencies(String(role.gold), String(role.diamonds));
    this.chrome.setPower(""); // 战力尚未接入，不将未知值伪装为零。
    paintRolePortrait(this.chrome.avatarFace, this.chrome.avatarBorder, role.basics?.headId, role.basics?.borderId);
    this.profile?.render(role);
    this.chrome.setCityExtras(false);
    this.chrome.setTabs(["city", "hero", "bag", "battle", "dungeon", "clan", "fetter"].map(id => ({
      id, text: "", state: id === this.currentFeature ? "selected" :
        id === "city" || this.actions?.availableFeatures?.includes(id) || (id === "hero" && this.actions?.heroAvailable) ? "open" : "locked",
    })));
    this.city?.refreshLocks();
  }

  /** 主城退出时销毁资料弹窗并解除头像、货币按钮和子页面监听。 */
  onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.failOpen(new Error("页面已关"));
    this.profile?.hide();
    this.profile?.node.destroy();
    this.profile = null;
    for (const unbind of this.extraUnbind.splice(0)) unbind();
    this.city?.runDispose();
    this.chrome?.runDispose();
    this.city = null;
    this.chrome = null;
  }

  /** 直接销毁主城节点时，先释放子界面，再交给基类清理目标监听和页面适配器。 */
  onDestroy(): void {
    try { this.onClose(); }
    finally { super.onDestroy(); }
  }
}
