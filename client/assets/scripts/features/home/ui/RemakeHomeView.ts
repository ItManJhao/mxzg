import { _decorator, Button, instantiate, Label, Node, Prefab, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { CityChromeView } from "../../city/ui/CityChromeView";
import { CityHubView } from "../../city/ui/CityHubView";
import { CityChromeShell } from "../../../ui/CityChromeShell";
import { prepareCityConfig, readCityGates, remakeConfig } from "../../../config/RemakeConfig";
import type { AccountState } from "../../account/AccountModel";
import type { HomeActions, HomeView } from "../HomeController";

const { ccclass, property } = _decorator;

@ccclass("RemakeHomeView")
export class RemakeHomeView extends BaseView implements HomeView {
  @property(Label) profileLabel: Label | null = null;
  @property(Button) logoutButton: Button | null = null;
  @property(Prefab) cityPrefab: Prefab | null = null;
  @property(Prefab) chromePrefab: Prefab | null = null;
  @property(Node) cityHost: Node | null = null;
  @property(Node) chromeHost: Node | null = null;
  @property(Node) accountPanel: Node | null = null;
  @property(Button) accountButton: Button | null = null;
  @property(Label) noticeLabel: Label | null = null;
  @property(Node) noticePanel: Node | null = null;
  @property(Node) accountTools: Node | null = null;
  private city: CityHubView | null = null;
  private chrome: CityChromeView | null = null;
  private role: AccountState["role"] = null;
  private actions: HomeActions | null = null;
  private closed = false;
  private extraUnbind: Array<() => void> = [];
  private currentFeature: "city" | "hero" | "bag" | "battle" = "city";

  get featureHost(): Node | null { return this.cityHost; }
  get cityContent(): Node | null { return this.city?.node || null; }

  /** The shared chrome/account tools stay on the root; only city content is hidden. */
  showFeature(id: "city" | "hero" | "bag" | "battle"): void {
    if (this.closed) return;
    this.currentFeature = id;
    if (this.city?.node.isValid) this.city.node.active = id === "city";
    if (this.accountPanel) this.accountPanel.active = false;
    this.showNotice("");
    this.paintRole();
  }

  onOpen(): void {
    this.closed = false;
    this.beginOpen();
    view.on("canvas-resize", this.fitTools, this);
    this.fitTools();
    void this.openCity();
  }

  private async openCity(): Promise<void> {
    try {
      if (!this.cityPrefab || !this.chromePrefab || !this.cityHost || !this.chromeHost) throw new Error("RemakeHome 未绑定主城 Prefab 或宿主");
      await prepareCityConfig();
      if (this.closed) return;
      const cityNode = instantiate(this.cityPrefab);
      cityNode.parent = this.cityHost;
      this.city = cityNode.getComponent(CityHubView);
      const chromeNode = instantiate(this.chromePrefab);
      chromeNode.parent = this.chromeHost;
      this.chrome = chromeNode.getComponent(CityChromeView);
      if (!this.city || !this.chrome) throw new Error("已有主城 Prefab 缺少 View");
      // Existing Views are owned children of this page. UIManager opens/closes the
      // page; it drives both children's BaseView lifetimes, with no old MainApp.
      this.city.runOpen({
        onAtom: id => this.actions?.openFeature(id),
        onMainline: () => this.actions?.openFeature("mainline"),
        query: { level: () => this.role?.level || 1, openDay: () => 0, db: readCityGates },
        loadConfig: <T>(path: string) => remakeConfig.read<T>(path),
      });
      this.chrome.runOpen({
        onTab: id => this.actions?.openFeature(id),
        actions: {
          openActivity: () => this.actions?.openFeature("activity"),
          openMore: () => this.actions?.openFeature("more"),
          openMail: () => this.actions?.openFeature("mail"),
        },
      });
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
        // Keep logout available so a failed art load does not trap the session.
        this.finishOpen();
      }
    }
  }

  bind(actions: HomeActions): () => void {
    if (!this.profileLabel || !this.logoutButton) throw new Error("RemakeHome Prefab 未绑定 profileLabel 或 logoutButton");
    const logout = () => actions.logout();
    this.actions = actions;
    this.paintRole();
    const toggleAccount = () => { if (this.accountPanel) this.accountPanel.active = !this.accountPanel.active; };
    this.logoutButton.node.on(Button.EventType.CLICK, logout);
    this.accountButton?.node.on(Button.EventType.CLICK, toggleAccount);
    return () => {
      this.actions = null;
      this.logoutButton!.node.off(Button.EventType.CLICK, logout);
      this.accountButton?.node.off(Button.EventType.CLICK, toggleAccount);
    };
  }
  render(state: AccountState): void {
    const role = state.role;
    this.role = role;
    this.profileLabel!.string = role ? `${role.nickname}\n角色 ID：${role.id}` : "会话已结束，正在返回登录";
    this.paintRole();
  }

  showNotice(text: string): void {
    if (this.noticeLabel) this.noticeLabel.string = text;
    if (this.noticePanel) this.noticePanel.active = !!text;
  }

  private paintRole(): void {
    const role = this.role;
    if (!role || !this.chrome) return;
    this.chrome.setIdentity(role.nickname, "");
    this.chrome.setLevelBadge(String(role.level));
    this.chrome.setCurrencies(String(role.gold), String(role.diamonds));
    this.chrome.setPower(""); // The new role endpoint has no combat power or avatar.
    this.chrome.setAvatar(null);
    this.chrome.setCityExtras(false);
    this.chrome.setTabs(["city", "hero", "bag", "battle", "dungeon", "clan", "fetter"].map(id => ({
      id, text: "", state: id === this.currentFeature ? "selected" :
        id === "city" || this.actions?.availableFeatures?.includes(id) || (id === "hero" && this.actions?.heroAvailable) ? "open" : "locked",
    })));
    this.city?.refreshLocks();
  }

  private fitTools(): void {
    const { width, height } = view.getVisibleSize();
    const scale = Math.min(1, width / 640);
    this.accountTools?.setScale(scale, scale, 1);
    this.accountTools?.setPosition(0, height / 2 - 112 * scale, 0);
  }

  onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.failOpen(new Error("页面已关"));
    view.off("canvas-resize", this.fitTools, this);
    for (const unbind of this.extraUnbind.splice(0)) unbind();
    this.city?.runDispose();
    this.chrome?.runDispose();
    this.city = null;
    this.chrome = null;
  }

  onDestroy(): void {
    this.onClose();
  }
}
