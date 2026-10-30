import { Button, Color, Node } from "cc";
import { ConfigDb } from "../../config/ConfigLoader";
import { GameLog, monoNow } from "../../core/GameLog";
import { WireSession } from "../../net/WireSession";
import { createButton, createField, createLabel, createRect, place, setText, TextField, uiNode } from "../../ui/UiKit";
import { gmClosedDetail, GmSendResult, sendGmAddHero, sendGmAddItem, sendGmRefreshBag, sendGmTableOp } from "./GmActions";
import { GM_ITEM_COMMAND, gmPanelOps } from "./GmCatalog";

const PANEL_W = 640;
const PANEL_H = 860;

/**
 * 调试 GM。代码面板，不占 GMLayer 预制（那张是清引用 / 报错）。
 * 只在弹窗层上，不挂到挂机宿主，避免把「GM 加英雄」画回主线页。
 */
export class GmDebugPanel {
  private root: Node | null = null;
  private layer: Node | null = null;
  private toast: ((text: string) => void) | null = null;
  private status: Node | null = null;
  private heroField: TextField | null = null;
  private itemField: TextField | null = null;
  private countField: TextField | null = null;
  private offSync: (() => void) | null = null;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  private heroSerial = 0;
  private errorSerial = 0;

  bind(layer: Node, toast: (text: string) => void): void {
    this.layer = layer;
    this.toast = toast;
  }

  toggle(): void {
    if (this.root && this.root.isValid) this.close();
    else this.open();
  }

  open(): void {
    if (!this.layer || !this.layer.isValid) return;
    if (this.root && this.root.isValid) return;
    const started = monoNow();
    const root = uiNode("GmDebugPanel");
    const dim = createRect("dim", 2000, 2000, new Color(0, 0, 0, 150));
    const dimButton = dim.addComponent(Button);
    dimButton.transition = Button.Transition.NONE;
    dim.on(Button.EventType.CLICK, () => this.close());
    place(dim, root, 0, 0);

    const panel = createRect("panel", PANEL_W, PANEL_H, new Color(32, 26, 22, 242));
    const swallow = panel.addComponent(Button);
    swallow.transition = Button.Transition.NONE;
    place(panel, root, 0, 0);

    place(createLabel("GM 调试", 28, { width: 400, color: new Color(255, 228, 180, 255) }), panel, -70, 390);
    place(
      createButton("关闭", () => this.close(), 120, 44, new Color(92, 64, 48, 255), 22),
      panel,
      230,
      390
    );
    place(
      createLabel("只发 c2s 2015。不改本地背包和名册。服端 gm.cmd.open=false 时没有回包。", 18, {
        width: 580,
        height: 56,
        align: "left",
        color: new Color(220, 200, 170, 255),
      }),
      panel,
      0,
      330
    );

    place(createLabel("英雄类型", 20, { width: 120, align: "left" }), panel, -240, 250);
    this.heroField = createField("10505010", 200, 44, { text: "10505010", maxLength: 12 });
    place(this.heroField.node, panel, -40, 250);
    place(createButton("加英雄", () => this.onHero(), 150, 44, undefined, 22), panel, 200, 250);
    place(createLabel("星级固定 9，等 s2c 4030", 16, { width: 560, align: "left", color: new Color(180, 170, 150, 255) }), panel, 0, 210);

    place(createLabel("道具 id", 20, { width: 100, align: "left" }), panel, -250, 150);
    this.itemField = createField("item 表 idx", 180, 44, { maxLength: 12 });
    place(this.itemField.node, panel, -90, 150);
    this.countField = createField("数量", 100, 44, { text: "1", maxLength: 8 });
    place(this.countField.node, panel, 70, 150);
    place(createButton("加道具", () => this.onItem(), 140, 44, undefined, 22), panel, 210, 150);
    place(
      createLabel("命令 " + GM_ITEM_COMMAND + "。gm.xlsx 道具页没有 gm_command，服端不认则背包不变。", 16, {
        width: 580,
        height: 40,
        align: "left",
        color: new Color(180, 170, 150, 255),
      }),
      panel,
      0,
      105
    );

    const ops = gmPanelOps(tableRows());
    let y = 40;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const label = op.params.length > 0 ? op.title + "  " + op.command + " " + op.params.join(",") : op.title + "  " + op.command;
      place(
        createButton(label, () => this.apply(sendGmTableOp(op)), 560, 46, new Color(58, 78, 96, 255), 20),
        panel,
        0,
        y
      );
      y -= 58;
    }
    place(createButton("刷新背包  c2s 5001", () => this.apply(sendGmRefreshBag()), 560, 46, new Color(70, 90, 64, 255), 20), panel, 0, y);

    this.status = createLabel("F9 或挂机左侧空地长按可关。", 18, {
      width: 580,
      height: 120,
      align: "left",
      color: new Color(255, 236, 210, 255),
    });
    place(this.status, panel, 0, -370);

    root.parent = this.layer;
    root.setSiblingIndex(Math.max(0, this.layer.children.length - 1));
    this.root = root;
    this.heroSerial = WireSession.gmHeroSerial;
    this.errorSerial = WireSession.wireErrorSerial;
    this.offSync = WireSession.onSync(() => this.onSync());
    GameLog.shared.openView("GmDebugPanel", "(none)", { ms: Math.max(0, Math.round(monoNow() - started)), tag: "GM" });
    GameLog.shared.info("GM", "打开调试面板。代码面板，没有 Prefab");
  }

  close(): void {
    this.clearWait();
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
    if (this.root && this.root.isValid) this.root.destroy();
    this.root = null;
    this.status = null;
    this.heroField = null;
    this.itemField = null;
    this.countField = null;
  }

  private onHero(): void {
    const result = sendGmAddHero(this.heroField ? this.heroField.getValue() : "");
    this.apply(result);
    const wait = result.wait;
    if (!result.ok || !wait) return;
    this.clearWait();
    this.waitTimer = setTimeout(() => {
      this.waitTimer = null;
      if (!this.root || !this.root.isValid) return;
      if (WireSession.gmHeroSerial !== wait.heroBefore) return;
      if (WireSession.wireErrorSerial !== wait.errorBefore) return;
      this.show(gmClosedDetail());
    }, wait.ms);
    const timer = this.waitTimer as { unref?: () => void };
    if (timer && typeof timer.unref === "function") timer.unref();
  }

  private onItem(): void {
    this.apply(
      sendGmAddItem(this.itemField ? this.itemField.getValue() : "", this.countField ? this.countField.getValue() : "")
    );
  }

  private onSync(): void {
    if (!this.root || !this.root.isValid) return;
    if (WireSession.wireErrorSerial !== this.errorSerial) {
      this.errorSerial = WireSession.wireErrorSerial;
      this.show("s2c 1005 " + (WireSession.wireErrorText || "服端错误"));
      return;
    }
    if (WireSession.gmHeroSerial !== this.heroSerial) {
      this.heroSerial = WireSession.gmHeroSerial;
      this.show("s2c 4030 英雄实例 " + (WireSession.gmHeroId === null ? "未到" : String(WireSession.gmHeroId)));
    }
  }

  private apply(result: GmSendResult): void {
    this.show(result.detail);
  }

  private show(text: string): void {
    if (this.status && this.status.isValid) setText(this.status, text);
    GameLog.shared.info("GM", text);
    if (this.toast) this.toast(text);
  }

  private clearWait(): void {
    if (!this.waitTimer) return;
    clearTimeout(this.waitTimer);
    this.waitTimer = null;
  }
}

export const gmDebugPanel = new GmDebugPanel();

function tableRows(): unknown {
  const db = ConfigDb.current;
  if (!db) return null;
  const file = db.tables.get("gm");
  return file ? file.rows : null;
}
