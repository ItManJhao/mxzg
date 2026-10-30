import { isOpenCancelled } from "../../framework/ui/UIManager";

interface FeatureUi {
  keepOnly(id: string): void;
  openById(id: string): Promise<unknown>;
  back(): boolean;
}
interface FeatureHost {
  current(): string | null;
  authorized(): boolean;
  notice(text: string): void;
}
export const REMAKE_FEATURE_ROUTES: Readonly<Record<string,string>> = { hero:"hero",bag:"bag",battle:"remake-campaign" };

/** Feature intent is separate from login/Start intent. Loading never removes the home root. */
export class HomeFeatureNavigation {
  private epoch = 0;
  private disposed = false;
  constructor(private readonly ui: FeatureUi, private readonly host: FeatureHost) {}

  open(id: string): boolean {
    if (id === "mainline") id = "battle";
    const pages = REMAKE_FEATURE_ROUTES;
    const titles: Record<string,string> = { hero:"英雄", bag:"背包", battle:"战斗" };
    if (id !== "city" && !pages[id]) return false;
    if (this.disposed || !this.host.authorized()) return true;
    if (id === "city") {
      this.reset();
      this.ui.keepOnly("remake-home");
      this.ui.back();
      this.host.notice("");
      return true;
    }
    const page = pages[id];
    if (this.host.current() === page) {
      this.reset(); this.ui.keepOnly(page); this.host.notice(""); return true;
    }
    const epoch = ++this.epoch;
    this.host.notice("正在准备" + titles[id] + "界面…");
    this.ui.keepOnly(page);
    void this.ui.openById(page).then(() => {
      if (this.accepts(epoch)) this.host.notice("");
    }).catch(error => {
      if (!this.accepts(epoch)) return;
      if (isOpenCancelled(error)) {
        // A rapid hero -> city -> hero may still share the first cancelled UIManager job.
        this.open(id);
        return;
      }
      console.error("[RemakeFeature]", error);
      this.host.notice(titles[id] + "界面加载失败，请再次点击重试");
    });
    return true;
  }
  reset(): void { this.epoch++; }
  dispose(): void { this.disposed = true; this.reset(); }
  private accepts(epoch: number): boolean {
    return !this.disposed && epoch === this.epoch && this.host.authorized();
  }
}
