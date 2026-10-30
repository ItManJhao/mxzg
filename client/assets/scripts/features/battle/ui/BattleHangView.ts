import { _decorator, Button, Color, director, Director, HorizontalTextAlignment, Label, Node, Overflow, Prefab, UITransform, VerticalTextAlignment } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { GameStore } from "../../../core/GameStore";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";
import { WireSession } from "../../../net/WireSession";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { liftNode, startShellFight } from "../../../ui/pagePrefabShell";
import { assignContentSize } from "../../../ui/visibleFit";
import { hangFace } from "../model/hangFace";
import { HangMissionChipView } from "./HangMissionChipView";
import { mountBattleHang, seatHangChip } from "./battleMount";
import { dressHangChrome } from "./hangPanelDress";

const { ccclass, property } = _decorator;

const CHIP_PREFAB = "prefabs/ui/battle/HangMissionChip";
const LATER_MAP = "章节地图仍走旧挂机";
const LATER_GROW = "战力UP仍走旧挂机";
const LATER_QUICK = "高速战斗仍走旧挂机";
const SHELL_MISSING = "挂机壳还没挂上";
const FIGHT_FAILED = "开战没有开始";
/** CCBI lbl_mission_name：字号 45，缩放 0.8，rgb(254,255,255)。位置留在预制上。 */
const MISSION_INK = new Color(254, 255, 255, 255);
/** CCBI 收益字：字号 40，缩放 0.5，右对齐，白色。不改成 16 号再拉成 118 宽。 */
const RATE_INK = new Color(254, 255, 255, 255);

/**
 * 挂机战斗主面板。底栏三钮、收益和计时绑在 BattlePanelLayer 上。
 * 金环只写关号。章关长文案在左侧 HangMissionChip。数据来自 GameStore 和 chapterreward，这里不解协议。
 * 点「战斗」进入 startShellFight。结算、章节地图、快速战斗和战力UP留在旧壳。
 */
@view({
  id: "mainline",
  prefab: "prefabs/ui/battle/BattlePanelLayer",
  layer: UILayer.Page,
  cache: false,
  allowMultiple: false,
  mount: mountBattleHang,
})
@ccclass("BattleHangView")
export class BattleHangView extends BaseView {
  @property(Button)
  btnBattle: Button | null = null;

  @property(Button)
  btnLineup: Button | null = null;

  @property(Button)
  btnSpeed: Button | null = null;

  @property(Label)
  battleTitle: Label | null = null;

  @property(Label)
  lineupTitle: Label | null = null;

  @property(Label)
  speedTitle: Label | null = null;

  @property(Label)
  clockLabel: Label | null = null;

  @property(Label)
  goldLabel: Label | null = null;

  @property(Label)
  soulsLabel: Label | null = null;

  @property(Label)
  expLabel: Label | null = null;

  @property(Label)
  bubbleLabel: Label | null = null;

  @property(Node)
  worldMap: Node | null = null;

  @property(Node)
  mapLabel: Node | null = null;

  @property(Node)
  worldIcon: Node | null = null;

  @property(Node)
  missionName: Node | null = null;

  @property(Node)
  hitMenu: Node | null = null;

  @property(Prefab)
  chipPrefab: Prefab | null = null;

  private opened = false;
  private clicksBound = false;
  private chip: HangMissionChipView | null = null;
  private openedAt = 0;
  private offSync: (() => void) | null = null;
  private offStore: (() => void) | null = null;
  private faceKey = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private clockTick: (() => void) | null = null;
  private followChrome: (() => void) | null = null;
  private clockNoted = false;

  onOpen(): void {
    GameLog.shared.info("Mainline", "打开实现 新 BattleHangView");
    if (this.opened) {
      this.watchStore();
      this.refresh();
      this.armChrome();
      return;
    }
    this.opened = true;
    this.openedAt = Date.now();
    this.beginOpen();
    void this.initialize();
  }

  onClose(): void {
    this.clearTimer();
    this.clearChrome();
    if (this.offStore) {
      this.offStore();
      this.offStore = null;
    }
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private async initialize(): Promise<void> {
    try {
      this.hidePlaceholders();
      this.silenceMenu();
      this.seatTitles();
      this.bindClicks();
      await this.ensureChip();
      if (!this.node || !this.node.isValid) {
        this.failOpen(new Error("页面已关"));
        return;
      }
      this.chip = this.spawnChip();
      if (!this.chip) {
        this.failOpen(new Error("HangMissionChip 没有挂上"));
        return;
      }
      this.offSync = WireSession.onSync(() => this.refresh());
      this.watchStore();
      this.refresh();
      this.armClock();
      this.armChrome();
      this.node.once(Node.EventType.NODE_DESTROYED, () => {
        this.clearTimer();
        this.clearChrome();
      });
      this.finishOpen();
    } catch (err) {
      GameLog.shared.warn("Mainline", "挂机面板没有挂上 " + messageOf(err));
      this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
    }
  }

  private async ensureChip(): Promise<void> {
    if (this.chipPrefab) return;
    GameLog.shared.warn("Mainline", "chipPrefab 未绑定，改走路径加载");
    this.chipPrefab = await loadPrefab(CHIP_PREFAB);
  }

  private spawnChip(): HangMissionChipView | null {
    if (!this.chipPrefab || !this.node || !this.node.isValid) return null;
    const parent = this.node.parent && this.node.parent.isValid ? this.node.parent : this.node;
    const node = spawnPrefab(this.chipPrefab, parent);
    node.name = "HangMissionChip";
    const chip = node.getComponent(HangMissionChipView);
    if (!chip) {
      GameLog.shared.warn("Mainline", "HangMissionChip 上没有 HangMissionChipView");
      return null;
    }
    seatHangChip(node);
    node.on(Button.EventType.CLICK, () => UIManager.instance.toast(LATER_MAP));
    return chip;
  }

  private hidePlaceholders(): void {
    const hidden = [this.worldMap, this.mapLabel, this.worldIcon];
    for (let i = 0; i < hidden.length; i++) {
      const node = hidden[i];
      if (node) node.active = false;
    }
  }

  private silenceMenu(): void {
    const menu = this.hitMenu;
    if (!menu) return;
    assignContentSize(menu.getComponent(UITransform), 0, 0);
  }

  private seatTitles(): void {
    this.writeTitle(this.battleTitle, "战斗");
    this.writeTitle(this.lineupTitle, "战力UP");
    this.writeTitle(this.speedTitle, "高速战斗");
  }

  private writeTitle(label: Label | null, text: string): void {
    if (!label) return;
    label.string = text;
  }

  private bindClicks(): void {
    if (this.clicksBound) return;
    this.clicksBound = true;
    this.bindButton(this.btnBattle, () => this.fight());
    this.bindButton(this.btnLineup, () => UIManager.instance.toast(LATER_GROW));
    this.bindButton(this.btnSpeed, () => UIManager.instance.toast(LATER_QUICK));
  }

  private bindButton(button: Button | null, fn: () => void): void {
    if (!button || !button.node) return;
    const node = button.node;
    const mark = node as Node & { mxzgHangTap?: boolean };
    if (mark.mxzgHangTap) return;
    mark.mxzgHangTap = true;
    let last = 0;
    const fire = () => {
      const now = Date.now();
      if (now - last < 80) return;
      last = now;
      fn();
    };
    node.on(Button.EventType.CLICK, fire);
    node.on(Node.EventType.TOUCH_END, fire);
  }

  /**
   * btn_battle 在 640×960 的 menu 下面。进场景前世界矩阵是空的，只收 menu 点不中。
   * 抬到 PagePrefabShell 上，进了场景再抬一次，和旧挂机壳同一套。
   */
  private armChrome(): void {
    this.liftChrome();
    if (this.followChrome) return;
    const retry = () => {
      if (!this.node || !this.node.isValid) {
        this.clearChrome();
        return;
      }
      const seated = !!this.node.parent && this.node.activeInHierarchy;
      this.liftChrome();
      if (!seated) return;
      this.clearChrome();
    };
    this.followChrome = retry;
    director.on(Director.EVENT_AFTER_UPDATE, retry);
  }

  private clearChrome(): void {
    if (!this.followChrome) return;
    director.off(Director.EVENT_AFTER_UPDATE, this.followChrome);
    this.followChrome = null;
  }

  private liftChrome(): void {
    const shell = this.namedAncestor("PagePrefabShell");
    const host = shell && shell.isValid ? shell : null;
    if (!host) return;
    this.liftButton(this.btnBattle, host);
    this.liftButton(this.btnLineup, host);
    this.liftButton(this.btnSpeed, host);
  }

  private liftButton(button: Button | null, host: Node): void {
    if (!button || !button.node || !button.node.isValid) return;
    liftNode(button.node, host);
    this.poke(button.node);
  }

  /** 进了场景再拨一下 active，指针列表才会收这颗钮。没进场景时不拨。 */
  private poke(node: Node): void {
    if (!node.parent || node.activeInHierarchy === false) return;
    try {
      node.active = false;
      node.active = true;
    } catch (_err) {
      if (!node.active) node.active = true;
    }
  }

  private fight(): void {
    const shell = this.namedAncestor("PagePrefabShell");
    const page = this.namedAncestor("LiveShell");
    if (!shell || !shell.isValid || !page || !page.isValid) {
      const chain = this.parentChain();
      GameLog.shared.info("Mainline", "开战入口=战斗按钮 出阵=跳过原因=挂机壳还没挂上");
      GameLog.shared.warn("Mainline", SHELL_MISSING + " " + chain);
      UIManager.instance.toast(SHELL_MISSING);
      return;
    }
    try {
      const started = startShellFight(shell, page, "战斗按钮");
      if (!started) {
        GameLog.shared.warn("Mainline", FIGHT_FAILED + " " + this.parentChain());
        UIManager.instance.toast(FIGHT_FAILED);
      }
    } catch (err) {
      GameLog.shared.warn("Mainline", FIGHT_FAILED + " " + messageOf(err));
      UIManager.instance.toast(FIGHT_FAILED);
    }
  }

  private namedAncestor(name: string): Node | null {
    let cur: Node | null = this.node;
    while (cur) {
      if (cur.name === name && cur.isValid) return cur;
      cur = cur.parent;
    }
    return null;
  }

  private parentChain(): string {
    const names: string[] = [];
    let cur: Node | null = this.node;
    while (cur && names.length < 8) {
      names.push(cur.name || "(unnamed)");
      cur = cur.parent;
    }
    return names.join("→");
  }

  private watchStore(): void {
    if (this.offStore) return;
    this.offStore = GameStore.subscribe(() => this.refresh());
  }

  private refresh(): void {
    if (!this.node || !this.node.isValid) return;
    const face = hangFace(Date.now(), this.openedAt);
    const key = face.caption + "|" + face.gold + "|" + face.souls + "|" + face.exp;
    if (key !== this.faceKey) {
      this.faceKey = key;
      GameLog.shared.info("Mainline", "挂机关卡刷新 " + face.caption + " 金" + face.gold + " 魂" + face.souls + " 经验" + face.exp);
    }
    this.noteClock(face.clock);
    this.writeRate(this.goldLabel, face.gold);
    this.writeRate(this.soulsLabel, face.souls);
    this.writeRate(this.expLabel, face.exp);
    this.writeClock(this.clockLabel, face.clock);
    this.writeClock(this.bubbleLabel, face.clock);
    this.writeMission(face.ring);
    if (this.chip) this.chip.show(face.caption);
    dressHangChrome(this.node, face);
  }

  private noteClock(clock: string): void {
    if (this.clockNoted) return;
    this.clockNoted = true;
    GameLog.shared.info("Mainline", "开战入口=挂机计时 出阵=跳过原因=只刷新收益");
    const idle = GameStore.idle();
    const anchor = idle.fromStore ? idle.rewardTime : idle.anchorMs;
    GameLog.shared.info("Mainline", "挂机计时 起点 " + anchor + " 显示 " + clock);
  }

  private writeMission(text: string): void {
    const node = this.missionName;
    if (!node || !node.isValid) return;
    node.active = true;
    node.setScale(0.8, 0.8, 1);
    const label = node.getComponent(Label);
    if (!label) return;
    label.string = text;
    label.fontSize = 45;
    label.lineHeight = 45;
    label.overflow = Overflow.NONE;
    label.color = MISSION_INK;
  }

  private writeRate(label: Label | null, text: string): void {
    if (!label || !label.node || !label.node.isValid) return;
    label.node.setScale(0.5, 0.5, 1);
    const ui = label.node.getComponent(UITransform);
    if (ui) ui.setAnchorPoint(1, 0.5);
    try {
      label.string = text;
      label.fontSize = 40;
      label.lineHeight = 40;
      label.overflow = Overflow.NONE;
      label.horizontalAlign = HorizontalTextAlignment.RIGHT;
      label.verticalAlign = VerticalTextAlignment.CENTER;
      label.color = RATE_INK;
    } catch (_err) {
      label.string = text;
    }
  }

  private writeClock(label: Label | null, text: string): void {
    if (!label) return;
    label.string = text;
  }

  /** 跟组件时钟走。检查环境没有 schedule 时退回 setInterval，并 unref，避免卡住进程。 */
  private armClock(): void {
    this.clearTimer();
    const tick = () => this.refresh();
    this.clockTick = tick;
    const host = this as BattleHangView & { schedule?: (cb: () => void, interval: number) => void };
    if (typeof host.schedule === "function") {
      host.schedule(tick, 1);
      return;
    }
    this.timer = setInterval(tick, 1000);
    const handle = this.timer as { unref?: () => void };
    if (typeof handle.unref === "function") handle.unref();
  }

  private clearTimer(): void {
    const tick = this.clockTick;
    const host = this as BattleHangView & { unschedule?: (cb: () => void) => void };
    if (tick && typeof host.unschedule === "function") host.unschedule(tick);
    this.clockTick = null;
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
