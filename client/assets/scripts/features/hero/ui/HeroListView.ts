/**
 * 英雄列表页面：只展示注入的当前角色名册并转交筛选、重试与选择，不回退旧网络或图鉴。
 */
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterController } from "../HeroRosterController";
import { presentHeroRoster } from "../HeroRosterPresentation";
import type { HeroCatalog } from "../HeroCatalog";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { _decorator, Button, director, Director, HorizontalTextAlignment, Label, Node, Overflow, Prefab, UITransform, VerticalTextAlignment } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { heroCellLine, HeroListTab } from "./HeroListPresentation";
import { loadPrefab, spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { assignContentSize, positiveUiSize } from "../../../framework/ui/visibleFit";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroListBoardView } from "./HeroListBoardView";
import { HERO_TAB_BOOK, HERO_TAB_DRAGON, HERO_TAB_HERO, seatHeroParchment } from "./heroChrome";
import { mountHeroListPage } from "./heroMount";
import type { HeroRosterSource, HeroRosterView } from "../HeroRosterPresentation";

const { ccclass, property } = _decorator;

const TAB_ON = ResourceCatalog.common.button_btn_tab_24.path;
const TAB_OFF = ResourceCatalog.common.button_btn_tab_23.path;
const BOARD_PREFAB = ResourceCatalog.prefab_hero.HeroListBoardView.assetPath;

/**
 * 英雄列表。页签、羊皮纸和筛选都绑在 HeroListLayer / HeroListHeroLayer 上。
 * 格子数据只来自当前角色的 HeroRosterSource。
 * 点击英雄由应用注入的 openHero 打开普通升级弹窗；未接入的详情和圣龙功能只给出提示。
 */
@view({
  id: "hero",
  prefab: ResourceCatalog.prefab_hero.HeroListView.assetPath,
  layer: UILayer.Page,
  cache: false,
  allowMultiple: false,
  mount: mountHeroListPage,
})
@ccclass("HeroListView")
export class HeroListView extends BaseView implements HeroRosterView {
  @property(Button)
  btnHero: Button | null = null;

  @property(Button)
  btnBook: Button | null = null;

  @property(Button)
  btnDragon: Button | null = null;

  @property(Label)
  heroTitle: Label | null = null;

  @property(Label)
  bookTitle: Label | null = null;

  @property(Label)
  dragonTitle: Label | null = null;

  @property(Node)
  tabMenu: Node | null = null;

  @property(Node)
  hitLineup: Node | null = null;

  @property(Node)
  hitBubbleMenu: Node | null = null;

  @property(Node)
  bubble: Node | null = null;

  @property(Node)
  layerCapacity: Node | null = null;

  @property(Prefab)
  boardPrefab: Prefab | null = null;

@property(Node)
  sprBg: Node | null = null;

  @property(Node)
  parchment: Node | null = null;

  @property(Node)
  titleRoot: Node | null = null;

  private tab: HeroListTab = "hero";
  private elem = 0;
  private board: HeroListBoardView | null = null;
  private opened = false;
  /** 引擎会调用名为 start 的生命周期。打开逻辑不能用这个名字，否则和 onOpen 各挂一份板子。 */
  private boardOpening = false;
  private scrollReady = false;
  private tabsBound = false;
  private cityFit = false;
  private shownWatch: (() => void) | null = null;
  private roster: HeroRosterSource | null = null;
  private closed = false;
  private rosterModule:HeroRosterController|null=null;

  /** 应用挂载时注入模块与配置；页面只绑定显示和输入，不拥有模块生命周期。 */
  configureRoster(model:HeroRosterModel, controller:HeroRosterController, catalog:HeroCatalog, notice:(text:string)=>void, openHero?:(id:string)=>void):void {
    this.rosterModule=controller;
    this.useRoster({read:elem=>presentHeroRoster(model.snapshot,catalog,elem),
      retry:()=>{if(!this.closed){notice("");void controller.refresh();}},
      select:cell=>{if(this.closed)return;if(openHero && cell.instanceId)openHero(cell.instanceId);else notice(cell.name+" Lv"+cell.level+"，详情暂未开放");}});
  }
  /** Called by application composition before opening. A current role source is required. */
  useRoster(source: HeroRosterSource): void {
    if (this.opened) throw new Error("英雄数据源必须在开页前注入");
    this.roster = source;
  }
  refreshRoster(): void { if (!this.closed) this.refresh(); }

  /** 读取应用注入的当前名册；缺少数据源时明确报错，禁止回退旧名册。 */
  private readModel() {
    if (!this.roster) throw new Error("HeroListView requires the current role roster source");
    return this.roster.read(this.elem);
  }

  /** 确认当前名册源后开始挂载已有列表，重复打开沿用已绑定板子。 */
  onOpen(): void {
    if (!this.roster) throw new Error("HeroListView requires the current role roster source");
    this.closed = false;
    if(this.rosterModule){EventDispatcher.instance.on(HeroRosterEvent.Updated,this,this.refreshRoster);void this.rosterModule.refresh();}
    GameLog.shared.info("Hero", "打开实现 新 HeroListView");
    if (this.opened) {
      this.refresh();
      return;
    }
    this.opened = true;
    this.beginOpen();
    void this.openBoard();
  }

  /** 停止本页尺寸观察并结束未完成的开页等待，不销毁模块名册。 */
  onClose(): void {
    this.closed = true;
    EventDispatcher.instance.offTarget(this);
    this.failOpen(new Error("页面已关"));
    this.clearShownWatch();
  }

  /** 页真正露出时再铺格子。打开过程里节点还不在场景上，不能在那时把格子挂出去。 */
  onEnable(): void {
    if (!this.board) return;
    this.refresh();
  }

  private async openBoard(): Promise<void> {
    if (this.boardOpening) return;
    this.boardOpening = true;
    const started = Date.now();
    try {
      this.silenceHits();
      this.hideBubble();
      this.fitTitles();
      this.bindTabs();
      await this.ensurePrefabs();
      if (this.closed || !this.node || !this.node.isValid) {
        this.failOpen(new Error("页面已关"));
        return;
      }
      this.board = this.adoptBoard();
      if (!this.board) {
        this.failOpen(new Error("HeroListHeroLayer 没有挂上"));
        return;
      }
      this.board.bindElem((id) => this.pickElem(id));
      this.fitCityMiddle();
      this.primeCapacity();
      this.refresh();
      if (!this.scrollReady && this.node.activeInHierarchy) {
        this.failOpen(new Error("HeroListHeroLayer 的 spr_box 下没有 HeroScroll"));
        return;
      }
      GameLog.shared.info("Hero", "英雄列表挂上 " + (Date.now() - started) + "ms");
      this.finishOpen();
    } catch (err) {
      GameLog.shared.warn("Hero", "英雄列表没有挂上 " + messageOf(err));
      this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
    }
  }

  /** 页面只保证板子资源；Cell 及列表参数由板子内的 SuperContent 配置。 */
  private async ensurePrefabs(): Promise<void> {
    if (!this.boardPrefab) {
      GameLog.shared.warn("Hero", "boardPrefab 未绑定，改走路径加载");
      this.boardPrefab = await loadPrefab(BOARD_PREFAB);
    }

  }

  /**
   * 只留一份羊皮纸。
   * HeroListLayer 没有内嵌这份板子时才 spawn。已经有的（含多挂）不再生成。
   * 预制根曾写成 (-320,-480)，那是居中父节点用的偏移。列表自己已经按底左锚点居中，再套一次会把筛选和格子挤到左下。
   */
  private adoptBoard(): HeroListBoardView | null {
    const found = this.boardsOnPage();
    for (let i = 1; i < found.length; i++) {
      const extra = found[i].node;
      GameLog.shared.warn("Hero", "多挂了一份 HeroListHeroLayer，拆掉");
      if (extra && extra.isValid) extra.destroy();
    }
    const board = found.length > 0 ? found[0] : this.spawnBoard();
    if (!board || !board.node) return null;
    this.seatBoard(board.node);
    if (this.tabMenu && this.tabMenu.parent === this.node && board.node.parent === this.node) {
      board.node.setSiblingIndex(this.tabMenu.getSiblingIndex());
    }
    if (this.layerCapacity) this.layerCapacity.active = false;
    return board;
  }

  private boardsOnPage(): HeroListBoardView[] {
    const found: HeroListBoardView[] = [];
    if (!this.node) return found;
    const kids = this.node.children;
    for (let i = 0; i < kids.length; i++) {
      const board = kids[i].getComponent(HeroListBoardView) as HeroListBoardView | null;
      if (board) found.push(board);
    }
    return found;
  }

  private spawnBoard(): HeroListBoardView | null {
    if (!this.boardPrefab || !this.node || !this.node.isValid) return null;
    const node = spawnPrefab(this.boardPrefab, this.node);
    const board = node.getComponent(HeroListBoardView);
    if (!board) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 上没有 HeroListBoardView");
      return null;
    }
    return board;
  }

  /**
   * 羊皮纸占满顶栏和底栏之间。页签和板子跟着纸的上沿抬。
   * 滚动视口仍只露大约 3.5 行。
   * 没绑 spr_bg 时不动，检查里的板子留在底左。
   */
  private fitCityMiddle(): void {
    if (this.cityFit || !this.sprBg || !this.board) return;
    const bgUi = this.sprBg.getComponent(UITransform);
    const size = positiveUiSize(bgUi);
    if (!bgUi || !size) return;
    const scale = Math.abs(this.node.scale.x);
    const seat = seatHeroParchment(this.sprBg.position.y, size.height, this.node.position.y, scale);
    assignContentSize(bgUi, size.width, seat.height);
    this.sprBg.setPosition(this.sprBg.position.x, seat.centerY, this.sprBg.position.z);
    if (this.parchment) {
      const plate = this.parchment.getComponent(UITransform);
      const plateSize = positiveUiSize(plate);
      const width = plateSize && plateSize.width > 1 ? plateSize.width : size.width;
      assignContentSize(plate, width, seat.height);
      this.parchment.setPosition(this.parchment.position.x, seat.centerY, this.parchment.position.z);
    }
    this.lift(this.titleRoot, seat.extraTop);
    this.lift(this.tabMenu, seat.extraTop);
    this.lift(this.board.node, seat.extraTop);
    this.board.pinLower(seat.bottom);
    this.cityFit = true;
  }

  private lift(node: Node | null, extra: number): void {
    if (!node || extra === 0) return;
    node.setPosition(node.position.x, node.position.y + extra, node.position.z);
  }

  /** 和 HeroListLayer 同一套底左坐标。羊皮纸、筛选、格子都留在这一层里面，不压底栏。 */
  private seatBoard(node: Node): void {
    const ui = node.getComponent(UITransform);
    if (ui) ui.setAnchorPoint(0, 0);
    const x = node.position.x;
    const y = node.position.y;
    if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
      GameLog.shared.info("Hero", "HeroListHeroLayer 从 (" + Math.round(x) + "," + Math.round(y) + ") 收回羊皮纸底左");
    }
    node.setPosition(0, 0, 0);
  }

  /** 预制上写着「空间：20/40」。进场景之前就换成名册，避免先闪假数。 */
  private primeCapacity(): void {
    const board = this.board;
    if (!board) return;
    const model = this.readModel();
    board.setCapacity(model.capacityLine);
    if (!model.synced) board.setEmpty(model.emptyText);
  }

  /** 等待页面可见后验证统一列表绑定，再用当前名册更新显示。 */
  private refresh(): void {
    if (this.closed || !this.node || !this.node.isValid || !this.board) return;
    if (!this.node.activeInHierarchy) {
      this.watchShown();
      return;
    }
    if (!this.scrollReady) this.scrollReady = this.board.prepare();
    if (!this.scrollReady) {
      this.watchShown();
      return;
    }
    this.paint();
  }

  private watchShown(): void {
    if (this.shownWatch) return;
    const retry = () => {
      if (!this.node || !this.node.isValid) {
        this.clearShownWatch();
        return;
      }
      if (!this.node.activeInHierarchy) return;
      this.clearShownWatch();
      this.refresh();
    };
    this.shownWatch = retry;
    director.on(Director.EVENT_AFTER_UPDATE, retry);
    const shown = (Node.EventType as { ACTIVE_IN_HIERARCHY_CHANGED?: string }).ACTIVE_IN_HIERARCHY_CHANGED;
    if (shown) this.node.on(shown, retry);
    this.node.once(Node.EventType.NODE_DESTROYED, () => this.clearShownWatch());
  }

  private clearShownWatch(): void {
    if (!this.shownWatch) return;
    director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
    const shown = (Node.EventType as { ACTIVE_IN_HIERARCHY_CHANGED?: string }).ACTIVE_IN_HIERARCHY_CHANGED;
    if (shown && this.node && this.node.isValid) this.node.off(shown, this.shownWatch);
    this.shownWatch = null;
  }

  /** 只提交当前筛选展示条目；格子复用、排版、内容尺寸和滚动位置交给统一列表。 */
  private paint(): void {
    const board = this.board;
    const content = board ? board.content : null;
    if (!board || !content || !content.isValid) return;
    this.paintTabs();
    board.setCorner(this.tab);
    if (this.roster) {
      if (board.skin) board.skin.active = false;
      if (board.evolve) board.evolve.active = false;
    }
    board.markElem(this.elem);
    const model = this.readModel();
    board.setCapacity(model.capacityLine);
    board.setEmpty(model.emptyText);
    board.scroll.list.setData(model.cells,(node,face)=>{
      const cell=node.getComponent(HeroIconCellView);
      if(!cell)throw new Error("HeroIconCellView Prefab 缺少格子组件");
      cell.show(face,heroCellLine(face)?()=>this.roster?.select(face):null);
    });
  }

  /** 切换筛选后回到列表起点；普通数据刷新保留滚动位置。 */
  private pickElem(id: number): void {
    if (id === this.elem) return;
    this.elem = id;
    this.refresh();
    this.board?.scroll.toStart();
  }


  /** 绑定当前英雄页查询重试入口，隐藏尚未接入的图鉴和圣龙页签。 */
  private bindTabs(): void {
    if (this.tabsBound) return;
    this.tabsBound = true;
    if (this.tabMenu && this.tabMenu.parent) {
      this.tabMenu.active = true;
      this.tabMenu.setSiblingIndex(this.tabMenu.parent.children.length - 1);
    } else {
      GameLog.shared.warn("Hero", "HeroListLayer 没有 UIMenu_1");
    }
    if (this.roster) {
      this.listenTab(this.btnHero, () => this.roster?.retry());
      if (this.btnBook) this.btnBook.node.active = false;
      if (this.btnDragon) this.btnDragon.node.active = false;
      return;
    }
  }

  private listenTab(button: Button | null, pick: () => void): void {
    if (!button || !button.node) {
      GameLog.shared.warn("Hero", "HeroListLayer 页签没有绑上");
      return;
    }
    button.node.active = true;
    button.transition = Button.Transition.NONE;
    button.interactable = true;
    button.node.on(Button.EventType.CLICK, pick);
  }

  private paintTabs(): void {
    this.paintTab(this.btnHero, this.tab === "hero");
    this.paintTab(this.btnBook, this.tab === "book");
    this.paintTab(this.btnDragon, false);
  }

  private paintTab(button: Button | null, on: boolean): void {
    if (!button || !button.node) return;
    button.transition = Button.Transition.NONE;
    paintSpritePaths(button.node, [on ? TAB_ON : TAB_OFF]);
  }

  private fitTitles(): void {
    this.fitTitle(this.heroTitle, HERO_TAB_HERO);
    this.fitTitle(this.bookTitle, HERO_TAB_BOOK);
    this.fitTitle(this.dragonTitle, HERO_TAB_DRAGON);
  }

  /** 先给字一块能画的尺寸，再 SHRINK。0×0 再收缩会把页签字裁没。 */
  private fitTitle(label: Label | null, text: string): void {
    if (!label || !label.node) return;
    label.string = text;
    label.fontSize = 20;
    label.lineHeight = 24;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    let ui = label.node.getComponent(UITransform);
    if (!ui) ui = label.node.addComponent(UITransform);
    const parent = label.node.parent ? label.node.parent.getComponent(UITransform) : null;
    const parentSize = positiveUiSize(parent);
    const width = parentSize && parentSize.width > 8 ? Math.max(8, parentSize.width - 8) : 104;
    const height = parentSize && parentSize.height > 8 ? Math.max(8, Math.min(32, parentSize.height - 4)) : 32;
    assignContentSize(ui, width, height);
    label.overflow = Overflow.SHRINK;
  }

  /** 绑了详情预制才打开。否则仍提示格子上的名字和等级。 */
  private hideBubble(): void {
    if (this.bubble) this.bubble.active = false;
  }

  /** 全屏 menu 会盖住格子。页签那排留着，其余大 menu 收成 0。 */
  private silenceHits(): void {
    this.zeroIfHuge(this.hitLineup);
    this.zeroIfHuge(this.hitBubbleMenu);
  }

  private zeroIfHuge(node: Node | null): void {
    if (!node) return;
    const ui = node.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }

  private toast(text: string): void {
    GameLog.shared.info("Hero", text);
    UIManager.instance.toast(text);
  }

}
