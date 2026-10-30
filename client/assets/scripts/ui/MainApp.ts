/**
 * 主城壳。顶栏底栏和主城中间只挂预制。缺预制只打日志，不手搓一整城。
 * 从 Boot 进来时，若场景上没挂本组件，Boot 会 addComponent。
 * 顶栏和底栏在 UIShell 的 chrome 层，不进页面栈。系统面板走 PanelNav。
 * 已有页面再盖 USE_PAGE_PREFAB_SHELL 的 1:1 Prefab。没有壳的不另做一页。
 * 不改 Boot 的进城时序。主线「战斗」仍走挂机壳。
 * 主屏不再画红「活动」、蓝「更多」矩形，也不再铺调试按钮矩阵。
 * 这两颗入口在 CityChrome Prefab 上。主线从 CityHub 的 BtnMainline 进。
 */
import { _decorator, Color, Component, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import {
  CITY_BAR,
  CITY_TAB,
  entryAccess,
  entryLockLevel,
  findNavEntry,
} from "../config/nav";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { chapterPlaceLabel } from "../config/gameCatalog";
import { GameStore } from "../core/GameStore";
import {
  formatDiamondLine,
  formatGoldLine,
  formatLevelBadge,
  formatNameLine,
  formatServerLabel,
  formatSubLine,
  Session,
} from "../core/Session";
import { NetClient } from "../net/NetClient";
import { wireDebugEnabled } from "../net/transportSelect";
import { NetState } from "../net/NetTypes";
import { WireSession } from "../net/WireSession";
import { barIndex, barPageId, barSlideDir, selectedBarId } from "./barSlide";
import { CityChrome, mountCityChromePrefab, TabState } from "./CityChrome";
import { formatAvatarIcon, formatCombatPower } from "./hangHud";
import { CITY_CHROME_PREFAB_PATH, loadPrefab } from "./prefabLoad";
import { installGmHotkey, openGmDebug, uninstallGmHotkey } from "../features/gm/GmHotkey";
import { attachPagePrefabShell, HANG_PROBE_EVENT, mountHangBattleShell, USE_PAGE_PREFAB_SHELL } from "./pagePrefabShell";
import { pagePrefabShell } from "./prefabShellMap";
import { beginPageOpen } from "../framework/ui/UIOpenLog";
import { useBattleView } from "../features/battle/config/BattleFeatureFlag";
import { BattleHangView } from "../features/battle/ui/BattleHangView";
import { useCityView } from "../features/city/config/CityFeatureFlag";
import { useHeroView } from "../features/hero/config/HeroFeatureFlag";
import { HeroListView } from "../features/hero/ui/HeroListView";
import { CITY_CHROME_HOST, CITY_CHROME_VIEW_ID, CITY_MAP_HOST, CITY_VIEW_ID } from "../features/city/config/cityIds";
import { CityChromeView } from "../features/city/ui/CityChromeView";
import { CityHubView } from "../features/city/ui/CityHubView";
import { isOpenCancelled, UIManager } from "../framework/ui/UIManager";
import { WIRE_ILLUSTRAT_UNSYNCED_TOAST } from "../net/protocol/wireIllustrat";
import { WIRE_PET_UNSYNCED_TOAST } from "../net/protocol/wirePet";
import { WIRE_WORLD_UNSYNCED_TOAST } from "../net/protocol/wireWorld";
import { WIRE_PROMOTION_UNSYNCED_TOAST } from "../net/protocol/wirePromotion";
import { WIRE_FIRST_UNSYNCED_TOAST } from "../net/protocol/wireFirstRecharge";
import { WIRE_REIKI_UNSYNCED_TOAST } from "../net/protocol/wireReiki";
import { WIRE_ISLANDS_UNSYNCED_TOAST } from "../net/protocol/wireFloatingIslands";
import { WIRE_TOTEMS_UNSYNCED_TOAST } from "../net/protocol/wireTotems";
import { WIRE_ASTROLABE_UNSYNCED_TOAST } from "../net/protocol/wireAstrolabe";
import { WIRE_CUBE_UNSYNCED_TOAST } from "../net/protocol/wireTweakCube";
import { WIRE_DRAGON_UNSYNCED_TOAST } from "../net/protocol/wireDragon";
import { WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST } from "../net/protocol/wireDragonCollection";
import { WIRE_TITLE_UNSYNCED_TOAST } from "../net/protocol/wireTitle";
import { WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST } from "../net/protocol/wireHeadPortrait";
import { WIRE_BORDER_UNSYNCED_TOAST } from "../net/protocol/wireBorder";
import { WIRE_FASHION_UNSYNCED_TOAST } from "../net/protocol/wireFashion";
import { WIRE_WORN_FASHION_UNSYNCED_TOAST } from "../net/protocol/wireWornFashion";
import { WIRE_HERO_PRAYER_UNSYNCED_TOAST } from "../net/protocol/wireHeroPrayer";
import { WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST } from "../net/protocol/wirePetIllustrate";
import { WIRE_FETTER_UNSYNCED_TOAST } from "../net/protocol/wireFetter";
import { WIRE_FETTER_FASHION_UNSYNCED_TOAST } from "../net/protocol/wireFetterFashion";
import { WIRE_SHENBIN_UNSYNCED_TOAST } from "../net/protocol/wireShenBin";
import { WIRE_OCCUPATION_UNSYNCED_TOAST } from "../net/protocol/wireOccupation";
import { WIRE_ROLE_SHENBIN_UNSYNCED_TOAST } from "../net/protocol/wireRoleShenBin";
import { WIRE_FETTER_CONTRACT_UNSYNCED_TOAST } from "../net/protocol/wireFetterContract";
import { WIRE_FORMATION_UNSYNCED_TOAST } from "../net/protocol/wireFormation";
import { WIRE_LINEUP_UNSYNCED_TOAST } from "../net/protocol/wireLineUp";
import { WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST } from "../net/protocol/wireRunningPromotion";
import { WIRE_TOWER_REWARD_UNSYNCED_TOAST } from "../net/protocol/wireTowerReward";
import { WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST } from "../net/protocol/wireHeroLevelResetTimes";
import { WIRE_SIGN_IN_LIST_UNSYNCED_TOAST } from "../net/protocol/wireSignInList";
import { WIRE_DAILY_TASK_LIST_UNSYNCED_TOAST } from "../net/protocol/wireDailyTaskList";
import { WIRE_DAILY_WELFARE_LIST_UNSYNCED_TOAST } from "../net/protocol/wireDailyWelfareList";
import { WIRE_MOUTH_WELFARE_LIST_UNSYNCED_TOAST } from "../net/protocol/wireMouthWelfareList";
import { WIRE_WEEKEND_GIFT_UNSYNCED_TOAST } from "../net/protocol/wireWeekendGift";
import { WIRE_GOD_RELIC_UNSYNCED_TOAST } from "../net/protocol/wireGodRelic";
import { WIRE_HERO_PALACE_UNSYNCED_TOAST } from "../net/protocol/wireHeroPalace";
import { WIRE_RECHARGE_DAYS_B_UNSYNCED_TOAST } from "../net/protocol/wireRechargeDaysB";
import { WIRE_TIME_TOWER_UNSYNCED_TOAST } from "../net/protocol/wireTimeTower";
import { WIRE_SPACE_TIME_ADVENTURE_UNSYNCED_TOAST } from "../net/protocol/wireSpaceTimeAdventure";
import { WIRE_MAGIC_TOWER_ROAD_UNSYNCED_TOAST } from "../net/protocol/wireMagicTowerRoad";
import { WIRE_QI_SHEN_QI_UNSYNCED_TOAST } from "../net/protocol/wireQiShenQi";
import { WIRE_ZHU_SHEN_JI_TAN_UNSYNCED_TOAST } from "../net/protocol/wireZhuShenJiTan";
import { WIRE_MID_FOOD_UNSYNCED_TOAST } from "../net/protocol/wireMidFood";
import { WIRE_QIU_SHANG_MING_YUE_UNSYNCED_TOAST } from "../net/protocol/wireQiuShangMingYue";
import { WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST } from "../net/protocol/wireWanShengLottery";
import { WIRE_HEI_WU_MISSION_UNSYNCED_TOAST } from "../net/protocol/wireHeiWuMission";
import { WIRE_CHRISTMAS_GIFT_UNSYNCED_TOAST } from "../net/protocol/wireChristmasGift";
import { WIRE_SPRING_OUTING_UNSYNCED_TOAST } from "../net/protocol/wireSpringOuting";
import { WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST } from "../net/protocol/wireChristmasMission";
import { WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST } from "../net/protocol/wireMagicTowerLevelRank";
import { WIRE_SPRING_OUTING_GRID_UNSYNCED_TOAST } from "../net/protocol/wireSpringOutingGrid";
import { goal7BadJumpToast } from "../module/goal7/tasks";
import { WIRE_BATTLE_UNSYNCED_TOAST } from "../net/protocol/wireBattle";
import { WIRE_BAG_UNSYNCED_TOAST } from "../net/protocol/wireBag";
import { WIRE_HERO_UNSYNCED_TOAST } from "../net/protocol/wireHero";
import { WIRE_MAIL_UNSYNCED_TOAST } from "../net/protocol/wireMail";
import { WIRE_ACHIEVEMENT_UNSYNCED_TOAST } from "../net/protocol/wireAchievement";
import { WIRE_ACTIVITY_UNSYNCED_TOAST } from "../net/protocol/wireActivity";
import { WIRE_PVP_UNSYNCED_TOAST } from "../net/protocol/wirePvp";
import { WIRE_SEVEN_UNSYNCED_TOAST } from "../net/protocol/wireSevenDay";
import { WIRE_GOAL7_UNSYNCED_TOAST } from "../net/protocol/wireGoal7";
import { WIRE_WISH_UNSYNCED_TOAST } from "../net/protocol/wireWish";
import { WIRE_SUMMON_UNSYNCED_TOAST } from "../net/protocol/wireSummon";
import { WIRE_PROPHET_UNSYNCED_TOAST } from "../net/protocol/wireProphet";
import { WIRE_JEWEL_UNSYNCED_TOAST } from "../net/protocol/wireJewel";
import { PanelNav } from "./PanelNav";
import { UIShell } from "./UIShell";
import { CityMapHandle } from "./CityMap";
import { mountCityHubPrefab } from "./CityHub";
import { CITY_HUB_MORE_ID } from "./cityHubEntries";
import { cityAtomRoute } from "./cityMapLayout";
import { createRect, paintRect, place, setText, uiNode } from "./UiKit";

/** 只挂 CityChrome Prefab。缺预制只打日志，不手搓顶底栏。不改 Boot。 */
export const USE_CITY_CHROME_PREFAB = true;

/**
 * 主城中间只挂 CityHub Prefab（map-bg-city 和建筑按钮）。
 * 加载失败只打日志，不手搓地图。不改 Boot。
 */
export const USE_CITY_HUB_PREFAB = true;

const { ccclass } = _decorator;

const PAGE_BG = new Color(8, 16, 32, 255);
/** 主城地图出来前的底。跟白天城景的天，不要用页面那块藏青，否则进城像黑屏。 */
const CITY_SKY = new Color(176, 216, 242, 255);

@ccclass("MainApp")
export class MainApp extends Component {
  private shell: UIShell | null = null;
  private panels: PanelNav<Node> | null = null;
  private chrome: CityChrome | null = null;
  private hubView: CityHubView | null = null;
  private chromeView: CityChromeView | null = null;
  private built = false;
  private gateNode: Node | null = null;
  private mainButton: Node | null = null;
  private cityMap: CityMapHandle | null = null;
  private offWire: (() => void) | null = null;
  private netState: NetState = NetClient.shared.state;

  start() {
    if (this.built) return;
    this.built = true;
    void this.build();
  }

  onDestroy() {
    if (useCityView()) {
      UIManager.instance.closeById(CITY_VIEW_ID);
      UIManager.instance.closeById(CITY_CHROME_VIEW_ID);
      this.hubView = null;
      this.chromeView = null;
      this.cityMap = null;
      this.chrome = null;
    } else if (this.cityMap) {
      this.cityMap.dispose();
      this.cityMap = null;
    }
    this.detachWire();
    uninstallGmHotkey();
    this.shell?.dispose();
  }

  private async build(): Promise<void> {
    const canvas = this.resolveCanvas();
    this.shell = UIShell.mount(canvas);
    if (!this.isValid || !this.shell) return;
    const shell = this.shell;
    const onTab = (id: string) => this.onTab(id, true);
    // 主城页先挂上。顶栏预制若还要等，不能挡天空和建筑。
    this.panels = new PanelNav<Node>(
      shell,
      (id) => this.presentPage(id),
      (id) => this.noteClose(id)
    );
    this.panels.setBeforeOpen((id) => {
      UIManager.instance.keepOnly(id);
    });
    UIManager.instance.install(this.panels, {
      showToast: (text, durationMs) => shell.showToast(text, durationMs),
      onPageOpened: () => {
        this.refreshChrome();
      },
    });
    this.panels.start(this.buildCity());
    this.warmBarPrefabs();
    if (!ConfigDb.current) {
      try {
        await ConfigLoader.loadAll();
      } catch (err) {
        GameLog.shared.error("MainApp", "config load failed " + messageOf(err));
      }
    }
    if (!this.isValid || !this.shell) return;
    installGmHotkey(shell.popupLayer, (text) => {
      if (!this.isValid || !this.shell) return;
      this.shell.showToast(text, 2200);
    });
    const chromeActions = {
      openActivity: () => {
        GameLog.shared.info("MainApp", "活动按钮没有预制列表，不手搓按钮页");
      },
      openMore: () => {
        GameLog.shared.info("MainApp", "更多按钮没有预制列表，不手搓按钮页");
      },
      openMail: () => this.openMail(),
    };
    try {
      if (useCityView()) {
        UIManager.instance.setResidentHost(CITY_CHROME_HOST, () => (shell.chromeLayer.isValid ? shell.chromeLayer : null));
        const view = await UIManager.instance.open(CityChromeView, { onTab, actions: chromeActions });
        if (!this.isValid || !this.shell) {
          UIManager.instance.close(view);
          return;
        }
        this.chromeView = view;
        this.chrome = view;
      } else {
        this.chrome = await mountCityChromePrefab(shell.chromeLayer, onTab, chromeActions);
        if (!this.isValid || !this.shell) {
          if (this.chrome) this.chrome.root.destroy();
          this.chrome = null;
          return;
        }
      }
      GameLog.shared.info("MainApp", "city chrome prefab " + CITY_CHROME_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || !this.shell) return;
      if (isOpenCancelled(err)) return;
      GameLog.shared.warn("MainApp", "city chrome prefab " + messageOf(err) + "，不手搓顶底栏");
    }
    this.detachWire();
    this.offWire = WireSession.onSync(() => {
      if (!this.isValid) return;
      this.refreshHub();
    });
    this.refreshHub();
    const goldText = Session.source === "wire" && !Session.wireSync.gold ? "未同步" : String(Session.gold);
    const diamondText = Session.source === "wire" && !Session.wireSync.diamond ? "未同步" : String(Session.diamond);
    GameLog.shared.info(
      "MainApp",
      "city ready account=" +
        (Session.account || "(none)") +
        " role=" +
        (Session.role?.name || "(none)") +
        " server=" +
        formatServerLabel() +
        " gold=" +
        goldText +
        " diamond=" +
        diamondText +
        " source=" +
        Session.source
    );
  }

  private onTab(id: string, fromBar = false): void {
    if (fromBar && this.shell && this.shell.barSlideBusy()) return;
    const arm = () => {
      if (fromBar) this.beginBarSlide(id);
    };
    const seal = () => {
      if (fromBar) this.sealBarSlide();
    };
    if (id === "battle") {
      arm();
      this.openMainline();
      if (!useBattleView() || !this.shell?.barSlideWaiting()) seal();
      return;
    }
    if (id === "dungeon") {
      if (!this.allow("daily")) return;
      arm();
      this.openChild("daily");
      seal();
      return;
    }
    if (id === "clan" || id === "fetter") {
      if (!this.allow(id)) return;
      arm();
      this.openChild(id);
      seal();
      return;
    }
    if (id === "bag") {
      UIManager.instance.toast("历史入口背包已退役，请使用 Remake.scene");
      return;
    }
    if (id === "hero" && useHeroView()) {
      if (this.panels?.current === "hero") return;
      GameLog.shared.info("MainApp", "tab " + id);
      if (this.blockWirePage(id)) return;
      if (!this.allow(id)) return;
      if (Session.source !== "wire" && !this.ensureNet()) return;
      arm();
      this.openHeroView(true);
      if (fromBar && !this.shell?.barSlideWaiting()) this.sealBarSlide();
      return;
    }
    if (id === "hero") GameLog.shared.info("Hero", "打开实现 旧 fillHero");
    GameLog.shared.info("MainApp", "tab " + id);
    if (this.blockWirePage(id)) return;
    if (!this.allow(id)) return;
    if (Session.source !== "wire" && (id === "hero" || id === "summon" || id === "smith") && !this.ensureNet()) return;
    arm();
    this.panels?.openRoot(id);
    this.refreshChrome();
    seal();
  }

  /** 只有底栏七格、而且目标格和当前高亮不是同一格，才预约横向过场。 */
  private beginBarSlide(id: string): void {
    const shell = this.shell;
    if (!shell) return;
    const dir = barSlideDir(this.barIndexNow(), barIndex(id));
    if (dir === 0) return;
    shell.armBarSlide(dir, barPageId(id));
  }

  private sealBarSlide(): void {
    this.shell?.sealBarSlide();
  }

  /** 底栏高亮对应的格子。邮件这类子页没有高亮时，跟导航根走。 */
  private barIndexNow(): number {
    const current = this.panels?.current || "";
    const root = this.panels?.rootTab || CITY_TAB;
    for (let i = 0; i < CITY_BAR.length; i++) {
      if (this.barSelected(CITY_BAR[i].id, current, root)) return i;
    }
    for (let i = 0; i < CITY_BAR.length; i++) {
      if (this.barSelected(CITY_BAR[i].id, root, root)) return i;
    }
    return barIndex(root);
  }

  private openChild(id: string): void {
    if (this.blockWirePage(id)) return;
    if (!(Session.source === "wire" && (id === "arena" || id === "wish")) && !this.allow(id)) return;
    if (!pagePrefabShell(id) && Session.source === "wire" && (id === "mail" || id === "buygold" || id === "achieve" || id === "prophet" || id === "jewel" || id === "illustrat" || id === "pet" || id === "world" || id === "promotion" || id === "firstRecharge" || id === "reiki" || id === "islands" || id === "totems" || id === "astrolabe" || id === "tweakCube" || id === "dragon" || id === "dragonCollection" || id === "titleList" || id === "headPortrait" || id === "borderData" || id === "fashionList" || id === "wornFashion" || id === "heroPrayer" || id === "petIllustrate" || id === "fetterData" || id === "fetterFashion" || id === "shenBin" || id === "occupation" || id === "roleShenBin" || id === "fetterContract" || id === "formation" || id === "lineUp" || id === "runningPromotion" || id === "towerReward" || id === "heroLevelResetTimes" || id === "signInList" || id === "dailyTaskList" || id === "dailyWelfareList" || id === "mouthWelfareList" || id === "weekendGift" || id === "godRelic" || id === "heroPalace" || id === "rechargeDaysB" || id === "timeTower" || id === "spaceTimeAdventure" || id === "magicTowerRoad" || id === "qiShenQi" || id === "zhuShenJiTan" || id === "midFood" || id === "qiuShangMingYue" || id === "wanShengLottery" || id === "heiWuMission" || id === "christmasGift" || id === "springOuting" || id === "christmasMission" || id === "magicTowerLevelRank" || id === "springOutingGrid" || id === "arena" || id === "login7" || id === "goal7" || id === "wish")) {
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
    }
    if (
      Session.source !== "wire" &&
      (id === "arena" || id === "tower" || id === "daily" || id === "login7" || id === "goal7" || id === "wish" || id === "cafe" || id === "gift" || id === "limited") &&
      !this.ensureNet()
    ) {
      return;
    }
    if (id === "bag") {
      UIManager.instance.toast("历史入口背包已退役，请使用 Remake.scene");
      return;
    }
    if (id === "hero" && useHeroView()) {
      this.openHeroView(false);
      return;
    }
    if (id === "hero") GameLog.shared.info("Hero", "打开实现 旧 fillHero");
    this.panels?.openChild(id);
    this.refreshChrome();
  }

  /**
   * 底栏英雄先回到主城再打开，和原来的 openRoot 一样。
   * 从别的页跳进来时不拆掉下面那一层。
   * 预制还没进栈时不刷底栏。打开失败只丢掉还没开始的过场。
   */
  private openHeroView(asRoot: boolean): void {
    if (asRoot) this.popAboveCity();
    this.shell?.holdBarSlide();
    void UIManager.instance.open(HeroListView).catch((err) => {
      this.shell?.dropWaitingBarSlide("hero");
      if (isOpenCancelled(err)) return;
      GameLog.shared.error("MainApp", "英雄页没有打开 " + messageOf(err));
    });
  }

  /** 底栏切到英雄时，先关掉盖在主城上的页。不走 MainApp.back，避免把过场取消掉。 */
  private popAboveCity(): void {
    const panels = this.panels;
    if (!panels) return;
    let guard = 0;
    while (panels.current && panels.current !== CITY_TAB && guard < 16) {
      if (!panels.back()) break;
      guard += 1;
    }
  }

  private back(): void {
    this.shell?.cancelBarSlide();
    const closed = this.panels?.back() === true;
    if (!closed) return;
    GameLog.shared.info("MainApp", "back to " + (this.panels?.current || ""));
    this.refreshChrome();
  }

  /** 未开启只 Toast，不压页面。没有登记的页面（日志）直接放行。 */
  private allow(id: string): boolean {
    const entry = findNavEntry(id);
    if (!entry) return true;
    const access = entryAccess(entry, this.level(), this.day(), ConfigDb.current);
    if (access.open) return true;
    GameLog.shared.info("MainApp", "locked " + id);
    this.shell?.showToast(access.hint, 2200);
    return false;
  }

  /**
   * 原来的页面仍由 buildPage 做。壳加载失败时页面不动。主城不盖壳。
   * 底栏「战斗」自己铺挂机站场，不先画探针，也不等 BattlePanelLayer 才盖住探针。
   * ?dev=wire 才留着探针，并且不再盖挂机壳。
   */
  private presentPage(id: string): Node {
    const viewHost = UIManager.instance.createPageHost(id);
    if (viewHost) {
      if (id === "mainline") this.watchHangProbe(viewHost);
      return viewHost;
    }
    const expectsPrefab = id === "mainline" || (USE_PAGE_PREFAB_SHELL && id !== CITY_TAB && pagePrefabShell(id) !== null);
    beginPageOpen(id, expectsPrefab, "MainApp");
    const page = this.buildPage(id);
    if (id === "mainline") {
      this.watchHangProbe(page);
      void mountHangBattleShell(page);
      return page;
    }
    if (USE_PAGE_PREFAB_SHELL && id !== CITY_TAB) void attachPagePrefabShell(page, id);
    return page;
  }

  /** 挂机左侧空地长按打开 GM。新视图和旧壳都听这一下。 */
  private watchHangProbe(page: Node): void {
    page.on(HANG_PROBE_EVENT, () => {
      GameLog.shared.info("GM", "挂机空地长按，打开 GM");
      openGmDebug();
    });
  }

  /** 真服且地址带 ?dev=wire。不改连接，Mock 仍只认 ?dev=mock。 */
  private battleTabIsProbe(): boolean {
    return Session.source === "wire" && wireDebugEnabled();
  }

  private buildPage(id: string): Node {
    if (id === "mainline") return this.mountMainline();
    if (pagePrefabShell(id)) return uiNode("LiveShell");
    GameLog.shared.warn("MainApp", "没有预制壳，不另做一页 " + id);
    return uiNode("LiveShell");
  }

  private buildCity(): Node {
    const page = this.pageRoot("CityPage");
    const sky = page.getChildByName("bg");
    if (sky) paintRect(sky, CITY_SKY);
    const pageUi = page.getComponent(UITransform) || page.addComponent(UITransform);
    pageUi.setContentSize(720, 1280);
    pageUi.setAnchorPoint(0.5, 0.5);
    const mapHost = uiNode("CityMapHost");
    const hostUi = mapHost.addComponent(UITransform);
    hostUi.setContentSize(720, 1280);
    hostUi.setAnchorPoint(0.5, 0.5);
    mapHost.setPosition(0, 0, 0);
    mapHost.parent = page;
    if (useCityView()) void this.openCityHubView(mapHost);
    else void this.mountCityHub(mapHost);

    // 活动 / 更多入口在 CityChrome Prefab（ActGroup、UtilityRow/BtnMore）。这里不再画红蓝矩形。
    // 拖动提示、门槛和网络字是调试壳，正常进城不挂。

    const net = this.cityNet();
    this.netState = net.state;
    net.onState((state) => {
      if (!this.isValid) return;
      // 放弃重连时会先经过 reconnecting，再进 connecting，最后 closed。
      if (state === "closed" && (this.netState === "reconnecting" || this.netState === "connecting")) {
        this.shell?.showToast(errorText(ErrorCode.NET_CLOSED), 2200);
      }
      this.netState = state;
    });
    mapHost.setSiblingIndex(Math.max(0, page.children.length - 1));
    return page;
  }

  /**
   * CityHub Prefab 铺满主城中间。缺预制只打日志，不手搓一整城。
   * BtnMainline 走原来的 openMainline，挑战仍进已经接上的主线页。
   */
  private async mountCityHub(host: Node): Promise<void> {
    try {
      const handle = await mountCityHubPrefab(
        host,
        (atom) => this.onCityAtom(atom),
        () => this.openMainline(),
        {
          level: () => this.level(),
          openDay: () => this.day(),
          db: () => ConfigDb.current,
        }
      );
      if (!this.isValid || !host.isValid) {
        handle.dispose();
        handle.root.destroy();
        return;
      }
      this.cityMap = handle;
      if (handle.mainButton) this.mainButton = handle.mainButton;
      this.setMainButton(this.stageButtonText());
      if (host.isValid && host.parent) host.setSiblingIndex(Math.max(0, host.parent.children.length - 1));
    } catch (err) {
      GameLog.shared.warn("MainApp", "city hub prefab " + messageOf(err) + "，不手搓地图");
    }
  }

  /**
   * 新主城。CityHubView 自己绑视差和建筑，点击仍进 onCityAtom。
   * 缺预制只打日志，不手搓一整城。
   */
  private async openCityHubView(host: Node): Promise<void> {
    UIManager.instance.setResidentHost(CITY_MAP_HOST, () => (host.isValid ? host : null));
    try {
      const view = await UIManager.instance.open(CityHubView, {
        onAtom: (atom) => this.onCityAtom(atom),
        onMainline: () => this.openMainline(),
        query: {
          level: () => this.level(),
          openDay: () => this.day(),
          db: () => ConfigDb.current,
        },
      });
      if (!this.isValid || !host.isValid) {
        UIManager.instance.close(view);
        return;
      }
      this.hubView = view;
      this.cityMap = view;
      if (view.mainButton) this.mainButton = view.mainButton;
      this.setMainButton(this.stageButtonText());
      if (host.isValid && host.parent) host.setSiblingIndex(Math.max(0, host.parent.children.length - 1));
    } catch (err) {
      if (!this.isValid) return;
      if (isOpenCancelled(err)) return;
      GameLog.shared.warn("MainApp", "city hub view " + messageOf(err) + "，不手搓地图");
    }
  }

  /** 地图加载失败时主城按钮还在，不挡住进页面。 */

  /**
   * 建筑和活动图标。能对上的走原来的 onTab / open*，这样真服 Toast 和门槛还在。
   * 对不上的压进 PanelNav，Mock 出占位页，真服仍是「还没接」。
   */
  private onCityAtom(atom: string): void {
    GameLog.shared.info("MainApp", "city " + atom);
    const route = cityAtomRoute(atom);
    if (!route) {
      this.openChild(atom);
      return;
    }
    if (route.via === "tab") {
      this.onTab(route.panel);
      return;
    }
    if (route.panel === "shop") {
      this.openShop();
      return;
    }
    if (route.panel === "prophet") {
      this.openProphet();
      return;
    }
    if (route.panel === "login7") {
      this.openLogin7();
      return;
    }
    if (route.panel === "goal7") {
      this.openGoal7();
      return;
    }
    if (route.panel === "gift") {
      this.openGift();
      return;
    }
    if (route.panel === "limited") {
      this.openLimited();
      return;
    }
    this.openChild(route.panel);
  }



  /** 国服底栏高亮。当前页能对上七格时只亮那一格，避免英雄根和背包同时放大。 */
  private barSelected(id: string, current: string, root: string): boolean {
    return selectedBarId(current, root) === id;
  }

  private refreshChrome(): void {
    const chrome = this.chrome;
    if (!chrome) return;
    chrome.setIdentity(formatNameLine(), formatSubLine());
    chrome.setCurrencies(formatGoldLine(), formatDiamondLine());
    chrome.setPower(formatCombatPower());
    chrome.setLevelBadge(formatLevelBadge());
    chrome.setAvatar(formatAvatarIcon());
    const current = this.panels?.current || "";
    const root = this.panels?.rootTab || CITY_TAB;
    const tabs: TabState[] = [];
    for (let i = 0; i < CITY_BAR.length; i++) {
      const tab = CITY_BAR[i];
      const access = entryAccess(tab, this.level(), this.day(), ConfigDb.current);
      const state = !access.open ? "locked" : this.barSelected(tab.id, current, root) ? "selected" : "open";
      const lockLevel = access.open ? 0 : entryLockLevel(tab, ConfigDb.current);
      tabs.push({ id: tab.id, text: tab.title, state, lockLevel });
    }
    chrome.setTabs(tabs);
    chrome.setCityExtras(this.panels?.current === CITY_TAB);
  }

  private refreshHub(): void {
    if (this.gateNode && this.gateNode.isValid) setText(this.gateNode, this.gateText());
    this.setMainButton(this.stageButtonText());
    if (this.cityMap) this.cityMap.refreshLocks();
    this.refreshChrome();
  }

  /**
   * 打开挂机站场。空关卡也进壳。
   * 开关开着时经 UIManager 挂 BattleHangView。预制还没进栈时不刷底栏。
   * 打开失败只丢掉还没开始的过场。?battle=old 仍走原来的挂机壳。
   */
  private openMainline(): void {
    GameLog.shared.info("MainApp", "click mainline");
    GameLog.shared.info("Mainline", "开战入口=城内按钮 出阵=跳过原因=只打开挂机页");
    if (!useBattleView()) {
      GameLog.shared.info("Mainline", "打开实现 旧 mountHangBattleShell");
      this.openChild("mainline");
      return;
    }
    GameLog.shared.info("Mainline", "打开实现 新 BattleHangView");
    if (this.panels?.current === "mainline") return;
    this.shell?.holdBarSlide();
    void UIManager.instance.open(BattleHangView).catch((err) => {
      this.shell?.dropWaitingBarSlide("mainline");
      if (isOpenCancelled(err)) return;
      GameLog.shared.error("MainApp", "战斗页没有打开 " + messageOf(err));
    });
  }

  /**
   * 底栏第一次切页会卡在 prefabs 包的第一次加载上，英雄格子也要等这包。
   * 进城后就预热，不挡主城。失败只打日志，点开时还会再加载一次。
   */
  private warmBarPrefabs(): void {
    const paths = [
      "prefabs/ui/common/PagePrefabShell",
      "prefabs/ui/common/ListBackdrop",
      "prefabs/ui/battle/BattlePanelLayer",
      "prefabs/ui/battle/HangMissionChip",
      "prefabs/ui/hero/HeroListLayer",
      "prefabs/ui/hero/HeroListHeroLayer",
      "prefabs/ui/hero/HeroIconCell",
    ];
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      void loadPrefab(path).catch((err) => {
        GameLog.shared.warn("MainApp", "预热 " + path + " " + messageOf(err));
      });
    }
  }

  /** 两个 idx 都没有就 Toast。有任意一个则压入只读页，不走 Mock 的 stage.enter。打开不看 net.state。 */

  /**
   * 有 1:1 壳的页面直接打开。没有壳的不进只读列表，也不进离线页。
   * 空号照样进壳，格子跟服务器同步结果，可以为空。
   */
  private blockWirePage(id: string): boolean {
    if (this.livePage(id)) return false;
    GameLog.shared.info("MainApp", "skip substitute " + id);
    return true;
  }

  /** 主城，以及对照表里的 Prefab 壳。没有壳的活动列表和更多列表不进页面栈。 */
  private livePage(id: string): boolean {
    if (id === "city") return true;
    return pagePrefabShell(id) !== null;
  }

  /** 没收到过 s2c 5001 就停在主城。空列表也算同步，放行后页面写「空背包」。 */
  private blockWireBag(): boolean {
    if (WireSession.hasBag()) return false;
    GameLog.shared.info("MainApp", "wire bag unsynced");
    this.shell?.showToast(WIRE_BAG_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 15000 就停在主城。空列表也算同步，放行后页面写「空邮箱」。 */
  private blockWireMail(): boolean {
    if (WireSession.hasMail()) return false;
    GameLog.shared.info("MainApp", "wire mail unsynced");
    this.shell?.showToast(WIRE_MAIL_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4001 就停在主城。空名册也算同步，放行后页面写「空名册」。 */
  private blockWireHero(): boolean {
    if (WireSession.hasHero()) return false;
    GameLog.shared.info("MainApp", "wire hero unsynced");
    this.shell?.showToast(WIRE_HERO_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 17000 就停在主城。空表也算同步，放行后页面写「已同步空表」。Mock 也不进别的页。 */
  private blockWireBuyGold(): boolean {
    if (Session.source === "wire" && WireSession.hasActivity()) return false;
    GameLog.shared.info("MainApp", "wire buygold unsynced");
    this.shell?.showToast(WIRE_ACTIVITY_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 22000 就停在主城或玩法。空表也算同步。Mock 仍走原来的领取页。 */
  private blockWireSevenDay(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasSevenDay()) return false;
    GameLog.shared.info("MainApp", "wire login7 unsynced");
    this.shell?.showToast(WIRE_SEVEN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 21010 就停在主城或玩法。空表也算同步。不打开 Mock 七日目标，也不进 22000 / 17000。 */
  private blockWireGoal7(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasGoal7()) return false;
    GameLog.shared.info("MainApp", "wire goal7 unsynced");
    this.shell?.showToast(WIRE_GOAL7_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 13044 就停在主城。空表也算同步。不打开 Mock 召唤，也不抽、置换、确认置换。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireProphet(): boolean {
    if (Session.source === "wire" && WireSession.hasProphet()) return false;
    GameLog.shared.info("MainApp", "wire prophet unsynced");
    this.shell?.showToast(WIRE_PROPHET_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4101 就停在主城。空表也算同步。不替换，不卸下，不合成。Mock 主城这颗按钮同样只 Toast，不改原来的英雄页。 */
  private blockWireJewel(): boolean {
    if (Session.source === "wire" && WireSession.hasJewel()) return false;
    GameLog.shared.info("MainApp", "wire jewel unsynced");
    this.shell?.showToast(WIRE_JEWEL_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4013 就停在主城。空表也算同步。不领奖，不发 4014。Mock 主城这颗按钮同样只 Toast，不改原来的英雄页。 */
  private blockWireIllustrat(): boolean {
    if (Session.source === "wire" && WireSession.hasIllustrat()) return false;
    GameLog.shared.info("MainApp", "wire illustrat unsynced");
    this.shell?.showToast(WIRE_ILLUSTRAT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74100 就停在主城。空表也算同步。不升级，不携带，不卸下。不主动发 74105、74106。Mock 主城这颗按钮同样只 Toast。 */
  private blockWirePet(): boolean {
    if (Session.source === "wire" && WireSession.hasPet()) return false;
    GameLog.shared.info("MainApp", "wire pet unsynced");
    this.shell?.showToast(WIRE_PET_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 51001 就停在主城。空包体也算同步。不做 20101。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireWorld(): boolean {
    if (Session.source === "wire" && WireSession.hasWorld()) return false;
    GameLog.shared.info("MainApp", "wire world unsynced");
    this.shell?.showToast(WIRE_WORLD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 20001 就停在主城。空包体也算同步。不发 20018。不发 20004、20010。不做 3007。Mock 主城这颗按钮同样只 Toast。 */
  private blockWirePromotion(): boolean {
    if (Session.source === "wire" && WireSession.hasPromotion()) return false;
    GameLog.shared.info("MainApp", "wire promotion unsynced");
    this.shell?.showToast(WIRE_PROMOTION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 20012 就停在主城。空包体也算同步。不发 20013。不做 13260。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireFirstRecharge(): boolean {
    if (Session.source === "wire" && WireSession.hasFirstRecharge()) return false;
    GameLog.shared.info("MainApp", "wire first recharge unsynced");
    this.shell?.showToast(WIRE_FIRST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 70001 就停在主城。空包体也算同步。不发 70002、70003、70004、70005、70006。70007、70008 不当拉包请求。不做 20011。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireReiki(): boolean {
    if (Session.source === "wire" && WireSession.hasReiki()) return false;
    GameLog.shared.info("MainApp", "wire reiki unsynced");
    this.shell?.showToast(WIRE_REIKI_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 73001 就停在主城。空包体也算同步。不发 73002、73003、73004。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireIslands(): boolean {
    if (Session.source === "wire" && WireSession.hasIslands()) return false;
    GameLog.shared.info("MainApp", "wire islands unsynced");
    this.shell?.showToast(WIRE_ISLANDS_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74300 就停在主城。空表也算同步。不发 74301、74302、74303。74304 不当拉包。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTotems(): boolean {
    if (Session.source === "wire" && WireSession.hasTotems()) return false;
    GameLog.shared.info("MainApp", "wire totems unsynced");
    this.shell?.showToast(WIRE_TOTEMS_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 68001 就停在主城。空包体也算同步。不发 68002、68003、68004、68006。68005 不当拉包。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireAstrolabe(): boolean {
    if (Session.source === "wire" && WireSession.hasAstrolabe()) return false;
    GameLog.shared.info("MainApp", "wire astrolabe unsynced");
    this.shell?.showToast(WIRE_ASTROLABE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75501 就停在主城。空包体也算同步。不发 75502、75503、75504、75505。75506 不当拉包。不做 34001。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTweakCube(): boolean {
    if (Session.source === "wire" && WireSession.hasTweakCube()) return false;
    GameLog.shared.info("MainApp", "wire tweak cube unsynced");
    this.shell?.showToast(WIRE_CUBE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 59001 就停在主城。空包体也算同步。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 单独在其后拉包，勿与本请求合并，勿当写号。不做 34001。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDragon(): boolean {
    if (Session.source === "wire" && WireSession.hasDragon()) return false;
    GameLog.shared.info("MainApp", "wire dragon unsynced");
    this.shell?.showToast(WIRE_DRAGON_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 59010 就停在主城。空包体也算同步。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并。59001 单独到不算。不做 34001。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDragonCollection(): boolean {
    if (Session.source === "wire" && WireSession.hasDragonCollection()) return false;
    GameLog.shared.info("MainApp", "wire dragon collection unsynced");
    this.shell?.showToast(WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 55001 就停在主城。空包体也算同步。Title.proto 仅 55001 读写对，同模块无写号。59010 单独到不算。34001 另只读接在其后。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTitleList(): boolean {
    if (Session.source === "wire" && WireSession.hasTitleList()) return false;
    GameLog.shared.info("MainApp", "wire title list unsynced");
    this.shell?.showToast(WIRE_TITLE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 34001 就停在主城。空包体也算同步。不发 34002。34003 不当拉包。32001 另只读接在其后。不做 20011。55001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeadPortrait(): boolean {
    if (Session.source === "wire" && WireSession.hasHeadPortrait()) return false;
    GameLog.shared.info("MainApp", "wire head portrait unsynced");
    this.shell?.showToast(WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 32001 就停在主城。空包体也算同步。不发 32002。不发 32003。32003 不当拉包。4402 另只读接在其后。29001 有 page，硬禁。不做 20011。34001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireBorder(): boolean {
    if (Session.source === "wire" && WireSession.hasBorder()) return false;
    GameLog.shared.info("MainApp", "wire border unsynced");
    this.shell?.showToast(WIRE_BORDER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4402 就停在主城。空包体也算同步。不发 4403、4404、4405。4406 无实现，勿发。4401 另只读接在其后，勿合并。29001 有 page，硬禁。不做 20011。32001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFashion(): boolean {
    if (Session.source === "wire" && WireSession.hasFashion()) return false;
    GameLog.shared.info("MainApp", "wire fashion unsynced");
    this.shell?.showToast(WIRE_FASHION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4401 就停在主城。空包体也算同步。不发 4403、4404、4405。4406 无实现，勿发。与 4402 分刀，勿合并。4402 单独到不算。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireWornFashion(): boolean {
    if (Session.source === "wire" && WireSession.hasWornFashion()) return false;
    GameLog.shared.info("MainApp", "wire worn fashion unsynced");
    this.shell?.showToast(WIRE_WORN_FASHION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4201 就停在主城。空包体也算同步。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。4401 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeroPrayer(): boolean {
    if (Session.source === "wire" && WireSession.hasHeroPrayer()) return false;
    GameLog.shared.info("MainApp", "wire hero prayer unsynced");
    this.shell?.showToast(WIRE_HERO_PRAYER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74104 就停在主城。空包体也算同步。不发 74101、74102、74103。74105、74106 不当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。74100、4201 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWirePetIllustrate(): boolean {
    if (Session.source === "wire" && WireSession.hasPetIllustrate()) return false;
    GameLog.shared.info("MainApp", "wire pet illustrate unsynced");
    this.shell?.showToast(WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 28100 就停在主城。空包体也算同步。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。74104、4201 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFetter(): boolean {
    if (Session.source === "wire" && WireSession.hasFetter()) return false;
    GameLog.shared.info("MainApp", "wire fetter unsynced");
    this.shell?.showToast(WIRE_FETTER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 28200 就停在主城。空包体也算同步。不发 28201、28202、28203、28204、28205。28203 虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。28100、74104 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFetterFashion(): boolean {
    if (Session.source === "wire" && WireSession.hasFetterFashion()) return false;
    GameLog.shared.info("MainApp", "wire fetter fashion unsynced");
    this.shell?.showToast(WIRE_FETTER_FASHION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75601 就停在主城。空包体也算同步。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。28200、28100 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireShenBin(): boolean {
    if (Session.source === "wire" && WireSession.hasShenBin()) return false;
    GameLog.shared.info("MainApp", "wire shen bin unsynced");
    this.shell?.showToast(WIRE_SHENBIN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75606 就停在主城。空包体也算同步。不发 75607、75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。75601、28200 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireOccupation(): boolean {
    if (Session.source === "wire" && WireSession.hasOccupation()) return false;
    GameLog.shared.info("MainApp", "wire occupation unsynced");
    this.shell?.showToast(WIRE_OCCUPATION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75615 就停在主城。空包体也算同步。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。75606、75601 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireRoleShenBin(): boolean {
    if (Session.source === "wire" && WireSession.hasRoleShenBin()) return false;
    GameLog.shared.info("MainApp", "wire role shen bin unsynced");
    this.shell?.showToast(WIRE_ROLE_SHENBIN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 28107 就停在主城。空包体也算同步。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201–28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。75615、75606 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFetterContract(): boolean {
    if (Session.source === "wire" && WireSession.hasFetterContract()) return false;
    GameLog.shared.info("MainApp", "wire fetter contract unsynced");
    this.shell?.showToast(WIRE_FETTER_CONTRACT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 3099 就停在主城。空包体也算同步。不发 3097、3098、3100。不发 3102、3030。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。28107、75615 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFormation(): boolean {
    if (Session.source === "wire" && WireSession.hasFormation()) return false;
    GameLog.shared.info("MainApp", "wire formation unsynced");
    this.shell?.showToast(WIRE_FORMATION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 3101 就停在主城。空包体也算同步。不发 3100、3098、3097、3030、3102、3103。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。3099 单独到不算。20101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireLineUp(): boolean {
    if (Session.source === "wire" && WireSession.hasLineUp()) return false;
    GameLog.shared.info("MainApp", "wire lineup unsynced");
    this.shell?.showToast(WIRE_LINEUP_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 20101 就停在主城。空包体也算同步。同文件 20102 非空体勿挂。不发各活动领奖写号。不做 20011。51001、5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。3101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireRunningPromotion(): boolean {
    if (Session.source === "wire" && WireSession.hasRunningPromotion()) return false;
    GameLog.shared.info("MainApp", "wire running promotion unsynced");
    this.shell?.showToast(WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 3203 就停在主城。空包体也算同步。不发 3202、3204、3205、3206、3220。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。4601 有 page，硬禁。29001 有 page，硬禁。20101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTowerReward(): boolean {
    if (Session.source === "wire" && WireSession.hasTowerReward()) return false;
    GameLog.shared.info("MainApp", "wire tower reward unsynced");
    this.shell?.showToast(WIRE_TOWER_REWARD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4044 就停在主城。空包体也算同步。不发 4043。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。3203 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeroLevelResetTimes(): boolean {
    if (Session.source === "wire" && WireSession.hasHeroLevelResetTimes()) return false;
    GameLog.shared.info("MainApp", "wire hero level reset times unsynced");
    this.shell?.showToast(WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 13010 就停在主城。空包体也算同步。不发 13011。12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。4044 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSignInList(): boolean {
    if (Session.source === "wire" && WireSession.hasSignInList()) return false;
    GameLog.shared.info("MainApp", "wire sign in list unsynced");
    this.shell?.showToast(WIRE_SIGN_IN_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 12020 就停在主城。空包体也算同步。不发 12021。不发 12022。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。13010 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDailyTaskList(): boolean {
    if (Session.source === "wire" && WireSession.hasDailyTaskList()) return false;
    GameLog.shared.info("MainApp", "wire daily task list unsynced");
    this.shell?.showToast(WIRE_DAILY_TASK_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 26002 就停在主城。空包体也算同步。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。12020 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDailyWelfareList(): boolean {
    if (Session.source === "wire" && WireSession.hasDailyWelfareList()) return false;
    GameLog.shared.info("MainApp", "wire daily welfare list unsynced");
    this.shell?.showToast(WIRE_DAILY_WELFARE_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 26001 就停在主城。空包体也算同步。不重复拉 26002。不发明领奖写号。不发 12021。不发 12022。61001 周末礼包另只读接在其后，勿合并。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。26002 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMouthWelfareList(): boolean {
    if (Session.source === "wire" && WireSession.hasMouthWelfareList()) return false;
    GameLog.shared.info("MainApp", "wire mouth welfare list unsynced");
    this.shell?.showToast(WIRE_MOUTH_WELFARE_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 61001 就停在主城。空包体也算同步。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。26001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireWeekendGift(): boolean {
    if (Session.source === "wire" && WireSession.hasWeekendGift()) return false;
    GameLog.shared.info("MainApp", "wire weekend gift unsynced");
    this.shell?.showToast(WIRE_WEEKEND_GIFT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 62001 就停在主城。空包体也算同步。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。61001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireGodRelic(): boolean {
    if (Session.source === "wire" && WireSession.hasGodRelic()) return false;
    GameLog.shared.info("MainApp", "wire god relic unsynced");
    this.shell?.showToast(WIRE_GOD_RELIC_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 63001 就停在主城。空包体也算同步。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。62001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeroPalace(): boolean {
    if (Session.source === "wire" && WireSession.hasHeroPalace()) return false;
    GameLog.shared.info("MainApp", "wire hero palace unsynced");
    this.shell?.showToast(WIRE_HERO_PALACE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 69001 就停在主城。空包体也算同步。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。63001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireRechargeDaysB(): boolean {
    if (Session.source === "wire" && WireSession.hasRechargeDaysB()) return false;
    GameLog.shared.info("MainApp", "wire recharge days b unsynced");
    this.shell?.showToast(WIRE_RECHARGE_DAYS_B_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74001 就停在主城。空包体也算同步。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。69001 单独到不算。74120 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTimeTower(): boolean {
    if (Session.source === "wire" && WireSession.hasTimeTower()) return false;
    GameLog.shared.info("MainApp", "wire time tower unsynced");
    this.shell?.showToast(WIRE_TIME_TOWER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74120 就停在主城。空包体也算同步。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。74001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSpaceTimeAdventure(): boolean {
    if (Session.source === "wire" && WireSession.hasSpaceTimeAdventure()) return false;
    GameLog.shared.info("MainApp", "wire space time adventure unsynced");
    this.shell?.showToast(WIRE_SPACE_TIME_ADVENTURE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76542 就停在主城。空包体也算同步。不重复拉 74120。不发 76543。不发 76544。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76541。不发 76501。不夹发 74121。不夹发 74122。不做 75001。不做 73002。不做 71001。不做 20011。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。74120 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMagicTowerRoad(): boolean {
    if (Session.source === "wire" && WireSession.hasMagicTowerRoad()) return false;
    GameLog.shared.info("MainApp", "wire magic tower road unsynced");
    this.shell?.showToast(WIRE_MAGIC_TOWER_ROAD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75101 就停在主城。空包体也算同步。不重复拉 76542。不发 75102。75102 是购买推送 s2c，勿当 c2s。本模块无独立购写号。75121 诸神祭坛另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76542 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireQiShenQi(): boolean {
    if (Session.source === "wire" && WireSession.hasQiShenQi()) return false;
    GameLog.shared.info("MainApp", "wire qi shen qi unsynced");
    this.shell?.showToast(WIRE_QI_SHEN_QI_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75121 就停在主城。空包体也算同步。不重复拉 75101。不发 75122。75122 是抽奖，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireZhuShenJiTan(): boolean {
    if (Session.source === "wire" && WireSession.hasZhuShenJiTan()) return false;
    GameLog.shared.info("MainApp", "wire zhu shen ji tan unsynced");
    this.shell?.showToast(WIRE_ZHU_SHEN_JI_TAN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75131 就停在主城。空包体也算同步。不重复拉 75121。不发 75132。75132 是购买推送 s2c，勿当 c2s。不夹 75122。不夹 75102。75801 秋赏明月另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75121 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMidFood(): boolean {
    if (Session.source === "wire" && WireSession.hasMidFood()) return false;
    GameLog.shared.info("MainApp", "wire mid food unsynced");
    this.shell?.showToast(WIRE_MID_FOOD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75801 就停在主城。空包体也算同步。不重复拉 75131。不发 75802。不发 75803。不发 75804。75901 万圣抽奖另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。5001、51001、68001、70001 已有，勿重复。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75131 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireQiuShangMingYue(): boolean {
    if (Session.source === "wire" && WireSession.hasQiuShangMingYue()) return false;
    GameLog.shared.info("MainApp", "wire qiu shang ming yue unsynced");
    this.shell?.showToast(WIRE_QIU_SHANG_MING_YUE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75901 就停在主城。空包体也算同步。不重复拉 75801。不发 75902。不发 75903。不发 75904。不夹发 75931、75932。不夹发 75941–75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。不是赏月佳肴 75131。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75801 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireWanShengLottery(): boolean {
    if (Session.source === "wire" && WireSession.hasWanShengLottery()) return false;
    GameLog.shared.info("MainApp", "wire wan sheng lottery unsynced");
    this.shell?.showToast(WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76001 就停在主城。空包体也算同步。不重复拉 75901。不发 76002。不发 76003。不发 76004。不发 76005。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75901 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeiWuMission(): boolean {
    if (Session.source === "wire" && WireSession.hasHeiWuMission()) return false;
    GameLog.shared.info("MainApp", "wire hei wu mission unsynced");
    this.shell?.showToast(WIRE_HEI_WU_MISSION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76101 就停在主城。空包体也算同步。不重复拉 76001。不发 76102。旁支勿夹 76082–76084、76121–76122、76141–76143、76161–76163。76301 出游寻春另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是黑五活动 76001。不是万圣抽奖 75901。5001、51001、68001、70001 已有，勿重复。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireChristmasGift(): boolean {
    if (Session.source === "wire" && WireSession.hasChristmasGift()) return false;
    GameLog.shared.info("MainApp", "wire christmas gift unsynced");
    this.shell?.showToast(WIRE_CHRISTMAS_GIFT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76301 就停在主城。空包体也算同步。不重复拉 76101。不发 76302。不发 76303。不发 76304。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。不是黑五活动 76001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSpringOuting(): boolean {
    if (Session.source === "wire" && WireSession.hasSpringOuting()) return false;
    GameLog.shared.info("MainApp", "wire spring outing unsynced");
    this.shell?.showToast(WIRE_SPRING_OUTING_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76081 就停在主城。空包体也算同步。不重复拉 76301。不发 76082。不发 76083。不发 76084。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76301 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireChristmasMission(): boolean {
    if (Session.source === "wire" && WireSession.hasChristmasMission()) return false;
    GameLog.shared.info("MainApp", "wire christmas mission unsynced");
    this.shell?.showToast(WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76520 就停在主城。空包体也算同步。不重复拉 76081。不发 76501–76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76081 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMagicTowerLevelRank(): boolean {
    if (Session.source === "wire" && WireSession.hasMagicTowerLevelRank()) return false;
    GameLog.shared.info("MainApp", "wire magic tower level rank unsynced");
    this.shell?.showToast(WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76251 就停在主城。空包体也算同步。不重复拉 76520。不发 76252。不发 76253。备选 76271 本轮不做。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是关卡榜 76520。5001、51001、68001、70001 已有，勿重复。4601 有 page，硬禁。29001 有 page，硬禁。76520 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSpringOutingGrid(): boolean {
    if (Session.source === "wire" && WireSession.hasSpringOutingGrid()) return false;
    GameLog.shared.info("MainApp", "wire spring outing grid unsynced");
    this.shell?.showToast(WIRE_SPRING_OUTING_GRID_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4004 就停在底栏。空次数也算同步。不打开 Mock 召唤，也不召唤、领奖。 */
  private blockWireSummon(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasSummon()) return false;
    GameLog.shared.info("MainApp", "wire summon unsynced");
    this.shell?.showToast(WIRE_SUMMON_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 27001 就停在玩法。空表也算同步。不打开 Mock 许愿池，也不刷新、抽奖、领奖。 */
  private blockWireWish(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasWish()) return false;
    GameLog.shared.info("MainApp", "wire wish unsynced");
    this.shell?.showToast(WIRE_WISH_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 18001 就停在玩法。空对手表也算同步。Mock 仍走原来的挑战页。 */
  private blockWireArena(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasPvp()) return false;
    GameLog.shared.info("MainApp", "wire arena unsynced");
    this.shell?.showToast(WIRE_PVP_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 12010 就停在主城。空成就表也算同步。Mock 不回落。 */
  private blockWireAchievement(): boolean {
    if (Session.source === "wire" && WireSession.hasAchievement()) return false;
    GameLog.shared.info("MainApp", "wire achievement unsynced");
    this.shell?.showToast(WIRE_ACHIEVEMENT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 详情在只读页里。不另开 Mock 升级页。未同步时和列表同一句 Toast。 */
  private blockWireHeroDetail(): boolean {
    if (!WireSession.hasHero()) return this.blockWireHero();
    GameLog.shared.info("MainApp", "wire hero detail stays on the readonly page");
    return true;
  }

  /** 两个 idx 都没有就 Toast「真服未同步」，不打开 Mock。有任意一个（含 max_idx=0）则放行。 */
  private blockWireMainline(): boolean {
    if (WireSession.hasChapter()) return false;
    GameLog.shared.info("MainApp", "wire mainline unsynced");
    this.shell?.showToast(WIRE_BATTLE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没有 3004 的时间就停在主城。有数据则放行，页面用 WireIdlePage，不进 Mock 挂机。 */
  private blockWireIdle(): boolean {
    if (WireSession.hasIdle()) return false;
    GameLog.shared.info("MainApp", "wire idle unsynced");
    this.shell?.showToast("真服挂机未同步", 2200);
    return true;
  }

  /** 顶栏网络字样。真服看留着的那条连接，Mock 仍看共享客户端。 */
  private cityNet(): NetClient {
    if (Session.source === "wire" && WireSession.net) return WireSession.net;
    return NetClient.shared;
  }

  /** 底栏「英雄」「召唤」「铁匠铺」没连上时不进页面。详情走页面栈。 */
  private ensureNet(): boolean {
    if (NetClient.shared.state === "connected") return true;
    this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
    return false;
  }








  /** 玩法「竞技场」。真服收到 18001 后走只读页，不挑战。Mock 仍受主线 Lv8。 */


  /**
   * 主城和玩法都能进。Mock 新号第 1 天可领，不看主线等级和开服天。
   * 真服收到 22000 后走只读页，不领奖。没连上时不压页面。
   */
  private openLogin7(): void {
    GameLog.shared.info("MainApp", "click login7");
    if (this.blockWirePage("login7")) return;
    if (Session.source === "wire") {
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
      this.panels?.openChild("login7");
      this.refreshChrome();
      return;
    }
    if (!this.allow("login7")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("login7");
    this.refreshChrome();
  }



  /** 真服先知召唤。未同步 Toast。已同步压入只读页，不抽，不置换，不写金币。不走底栏召唤。 */
  private openProphet(): void {
    GameLog.shared.info("MainApp", "click prophet");
    if (this.blockWirePage("prophet")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("prophet");
    this.refreshChrome();
  }


  /** 真服英雄宝石。未同步 Toast。已同步压入只读页，不替换，不卸下，不合成，不写金币。不走底栏英雄。 */
  private openJewel(): void {
    GameLog.shared.info("MainApp", "click jewel");
    if (this.blockWirePage("jewel")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("jewel");
    this.refreshChrome();
  }


  /** 真服英雄图鉴。未同步 Toast。已同步压入只读页，不领奖，不发 4014，不写金币。不走底栏英雄。 */
  private openIllustrat(): void {
    GameLog.shared.info("MainApp", "click illustrat");
    if (this.blockWirePage("illustrat")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("illustrat");
    this.refreshChrome();
  }


  /** 真服宠物信息。未同步 Toast。已同步压入只读页，不升级，不携带，不卸下，不写金币。不走底栏英雄。 */
  private openPet(): void {
    GameLog.shared.info("MainApp", "click pet");
    if (this.blockWirePage("pet")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("pet");
    this.refreshChrome();
  }


  /** 真服世界等级。未同步 Toast。已同步压入只读页，不写金币。不做 20101。 */
  private openWorld(): void {
    GameLog.shared.info("MainApp", "click world");
    if (this.blockWirePage("world")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("world");
    this.refreshChrome();
  }


  /** 真服基金列表。未同步 Toast。已同步压入只读页，不领奖，不写金币。不发 20018。不发 20004、20010。不做 3007。 */
  private openPromotion(): void {
    GameLog.shared.info("MainApp", "click promotion");
    if (this.blockWirePage("promotion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("promotion");
    this.refreshChrome();
  }


  /** 真服超值首充。未同步 Toast。已同步压入只读页，不领奖，不写金币。不发 20013。不做 13260。 */
  private openFirstRecharge(): void {
    GameLog.shared.info("MainApp", "click first-recharge");
    if (this.blockWirePage("firstRecharge")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("firstRecharge");
    this.refreshChrome();
  }


  /** 真服灵器数据。未同步 Toast。已同步压入只读页，不激活，不穿，不卸，不转换，不合成。不发 70002–70006。不做 20011。 */
  private openReiki(): void {
    GameLog.shared.info("MainApp", "click reiki");
    if (this.blockWirePage("reiki")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("reiki");
    this.refreshChrome();
  }


  /** 真服浮空岛时间。未同步 Toast。已同步压入只读页，不挑战，不买次数。不发 73002、73003、73004。不做 20011。 */
  private openIslands(): void {
    GameLog.shared.info("MainApp", "click islands");
    if (this.blockWirePage("islands")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("islands");
    this.refreshChrome();
  }


  /** 真服图腾信息。未同步 Toast。已同步压入只读页，不升级，不升阶，不装备，不卸下，不更换，不重置。不发 74301、74302、74303。74304 勿当拉包。不做 20011。 */
  private openTotems(): void {
    GameLog.shared.info("MainApp", "click totems");
    if (this.blockWirePage("totems")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("totems");
    this.refreshChrome();
  }


  /** 真服星盘数据。未同步 Toast。已同步压入只读页，不激活元素，不点亮，不重置，不激活星盘。不发 68002、68003、68004、68006。68005 勿当拉包。不做 20011。 */
  private openAstrolabe(): void {
    GameLog.shared.info("MainApp", "click astrolabe");
    if (this.blockWirePage("astrolabe")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("astrolabe");
    this.refreshChrome();
  }


  /** 真服魔方数据。未同步 Toast。已同步压入只读页，不添加，不卸下，不开格子，不清 cd。不发 75502、75503、75504、75505。75506 勿当拉包。不做 34001。不做 20011。 */
  private openTweakCube(): void {
    GameLog.shared.info("MainApp", "click tweak cube");
    if (this.blockWirePage("tweakCube")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("tweakCube");
    this.refreshChrome();
  }


  /** 真服圣龙数据。未同步 Toast。已同步压入只读页，不放源石，不提升鉴定，不加速，不领奖，不升等级，不替换，不调顺序，不升星，不分解。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 单独拉包，勿与本请求合并，勿当写号。不做 34001。不做 20011。 */
  private openDragon(): void {
    GameLog.shared.info("MainApp", "click dragon");
    if (this.blockWirePage("dragon")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dragon");
    this.refreshChrome();
  }


  /** 真服圣物图鉴。未同步 Toast。已同步压入只读页，不放源石，不提升鉴定，不加速，不领奖，不升等级，不替换，不调顺序，不升星，不分解。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001。不做 20011。 */
  private openDragonCollection(): void {
    GameLog.shared.info("MainApp", "click dragon collection");
    if (this.blockWirePage("dragonCollection")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dragonCollection");
    this.refreshChrome();
  }


  /** 真服称号列表。未同步 Toast。已同步压入只读页。end_time：-1 永久，0 未激活，时间戳为到期。无扣费，无领奖，无日刷。Title.proto 仅 55001 读写对，同模块无写号。34001 另只读接在其后。不做 20011。 */
  private openTitleList(): void {
    GameLog.shared.info("MainApp", "click title list");
    if (this.blockWirePage("titleList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("titleList");
    this.refreshChrome();
  }


  /** 真服头像列表。未同步 Toast。已同步压入只读页。idx_list 是已解锁头像 id。无更换入口。不发 34002。34003 不当拉包。32001 另只读接在其后。不做 20011。 */
  private openHeadPortrait(): void {
    GameLog.shared.info("MainApp", "click head portrait");
    if (this.blockWirePage("headPortrait")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("headPortrait");
    this.refreshChrome();
  }


  /** 真服头像框数据。未同步 Toast。已同步压入只读页。units 是 id、active_state。无激活、切换入口。不发 32002。不发 32003。32003 不当拉包。4402 另只读接在其后。29001 有 page，硬禁。不做 20011。 */
  private openBorder(): void {
    GameLog.shared.info("MainApp", "click border data");
    if (this.blockWirePage("borderData")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("borderData");
    this.refreshChrome();
  }


  /** 真服激活皮肤列表。未同步 Toast。已同步压入只读页。list 是 hero_type、fashion_id、level、status、end_time。status：0 永久，1 限时。无激活、替换、升级入口。不发 4403、4404、4405。4406 无实现，勿发。4401 另只读接在其后，勿合并。29001 有 page，硬禁。不做 20011。 */
  private openFashion(): void {
    GameLog.shared.info("MainApp", "click fashion list");
    if (this.blockWirePage("fashionList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fashionList");
    this.refreshChrome();
  }


  /** 真服穿戴皮肤英雄列表。未同步 Toast。已同步压入只读页。list 是 hero_id、fashion_id。无激活、替换、升级入口。不发 4403、4404、4405。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。 */
  private openWornFashion(): void {
    GameLog.shared.info("MainApp", "click worn fashion");
    if (this.blockWirePage("wornFashion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("wornFashion");
    this.refreshChrome();
  }


  /** 真服英雄祈愿数据。未同步 Toast。已同步压入只读页。privilege、end_time。privilege：0/1。end_time 未开为 0。无祈愿写入口。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。 */
  private openHeroPrayer(): void {
    GameLog.shared.info("MainApp", "click hero prayer");
    if (this.blockWirePage("heroPrayer")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heroPrayer");
    this.refreshChrome();
  }


  /** 真服宠物图鉴。未同步 Toast。已同步压入只读页，列出已解锁宠物类型。无升级、携带、卸下入口。不发 74101、74102、74103。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。 */
  private openPetIllustrate(): void {
    GameLog.shared.info("MainApp", "click pet illustrate");
    if (this.blockWirePage("petIllustrate")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("petIllustrate");
    this.refreshChrome();
  }


  /** 真服羁绊数据。未同步 Toast。已同步压入只读页，列出 reset_count 和 goddess。无升级、升技、突破、重置、铸魂、契约、洗炼、领奖、精炼入口。不发 28101、28102、28104、28105、28106、28108、28109、28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。 */
  private openFetter(): void {
    GameLog.shared.info("MainApp", "click fetter");
    if (this.blockWirePage("fetterData")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fetterData");
    this.refreshChrome();
  }


  /** 真服羁绊皮肤。未同步 Toast。已同步压入只读页，列出 active_type 和 use_type。无熔炼、激活、领任务奖、使用皮肤入口。不发 28201、28202、28203、28204、28205。28203 任务列表虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。 */
  private openFetterFashion(): void {
    GameLog.shared.info("MainApp", "click fetter fashion");
    if (this.blockWirePage("fetterFashion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fetterFashion");
    this.refreshChrome();
  }


  /** 真服神兵数据。未同步 Toast。已同步压入只读页，列出 job、coreLv、equipData、fighting。无合成、装备、核心升级、分解入口。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。 */
  private openShenBin(): void {
    GameLog.shared.info("MainApp", "click shen bin");
    if (this.blockWirePage("shenBin")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("shenBin");
    this.refreshChrome();
  }


  /** 真服职级信息。未同步 Toast。已同步压入只读页，列出 oc_id 和 taskInfos。无晋升、手动完成任务入口。不发 75607、75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。 */
  private openOccupation(): void {
    GameLog.shared.info("MainApp", "click occupation");
    if (this.blockWirePage("occupation")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("occupation");
    this.refreshChrome();
  }


  /** 真服神兵道具。未同步 Toast。已同步压入只读页，列出 item_type 和 itemNum。902048 标精华。无合成、装备、分解、晋升入口。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。 */
  private openRoleShenBin(): void {
    GameLog.shared.info("MainApp", "click role shen bin");
    if (this.blockWirePage("roleShenBin")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("roleShenBin");
    this.refreshChrome();
  }


  /** 真服契约。未同步 Toast。已同步压入只读页，列出已激活 contracts。不保证顺序。无解锁契约、升级、升技、突破、重置、铸魂、洗炼入口。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201–28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。 */
  private openFetterContract(): void {
    GameLog.shared.info("MainApp", "click fetter contract");
    if (this.blockWirePage("fetterContract")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fetterContract");
    this.refreshChrome();
  }


  /** 真服阵法。未同步 Toast。已同步压入只读页，列出已解锁 unlockIds。不保证顺序。无解锁阵法、保存战斗队列入口。不发 3097、3098、3100。不发 3102、3030。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。 */
  private openFormation(): void {
    GameLog.shared.info("MainApp", "click formation");
    if (this.blockWirePage("formation")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("formation");
    this.refreshChrome();
  }


  /** 真服副本队列。未同步 Toast。已同步压入只读页，列出 list 与 assistance_unlock。无保存队列、解锁阵法入口。不发 3100、3098、3097、3030、3102、3103。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。 */
  private openLineUp(): void {
    GameLog.shared.info("MainApp", "click lineup");
    if (this.blockWirePage("lineUp")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("lineUp");
    this.refreshChrome();
  }


  /** 真服进行中活动。未同步 Toast。已同步压入只读页，列出 promotions。无领奖入口。同文件 20102 非空体勿挂。不发各活动领奖写号。不做 20011。51001、5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。 */
  private openRunningPromotion(): void {
    GameLog.shared.info("MainApp", "click running promotion");
    if (this.blockWirePage("runningPromotion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("runningPromotion");
    this.refreshChrome();
  }


  /** 真服爬塔首通已领。未同步 Toast。已同步压入只读页，列出已领 idx。无买票、领首通、扫荡入口。不发 3202、3204、3205、3206、3220。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openTowerReward(): void {
    GameLog.shared.info("MainApp", "click tower reward");
    if (this.blockWirePage("towerReward")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("towerReward");
    this.refreshChrome();
  }


  /** 真服英雄等级重生次数。未同步 Toast。已同步压入只读页，写出 times。无重生、扣费、清符文、降级、返还入口。不发 4043。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openHeroLevelResetTimes(): void {
    GameLog.shared.info("MainApp", "click hero level reset times");
    if (this.blockWirePage("heroLevelResetTimes")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heroLevelResetTimes");
    this.refreshChrome();
  }


  /** 真服签到列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 days、isSignIn、month、charged、newServer。无领奖入口。不发 13011。12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openSignInList(): void {
    GameLog.shared.info("MainApp", "click sign in list");
    if (this.blockWirePage("signInList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("signInList");
    this.refreshChrome();
  }


  /** 真服每日任务列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 Task、RewardBoxIdx、DailyValue。无领奖入口。不发 12021。不发 12022。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openDailyTaskList(): void {
    GameLog.shared.info("MainApp", "click daily task list");
    if (this.blockWirePage("dailyTaskList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dailyTaskList");
    this.refreshChrome();
  }


  /** 真服每日福利列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 list（giftPackId、num）。无领奖入口。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openDailyWelfareList(): void {
    GameLog.shared.info("MainApp", "click daily welfare list");
    if (this.blockWirePage("dailyWelfareList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dailyWelfareList");
    this.refreshChrome();
  }


  /** 真服每月福利列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 list（giftPackId、num）。无领奖入口。不重复拉 26002。不发明领奖写号。不发 12021。不发 12022。61001 周末礼包另只读接在其后，勿合并。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26002 分开发，勿合并。本刀不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openMouthWelfareList(): void {
    GameLog.shared.info("MainApp", "click mouth welfare list");
    if (this.blockWirePage("mouthWelfareList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("mouthWelfareList");
    this.refreshChrome();
  }


  /** 真服周末礼包。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 start_time、end_time、reward_status。无领奖入口。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26001 分开发，勿合并。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openWeekendGift(): void {
    GameLog.shared.info("MainApp", "click weekend gift");
    if (this.blockWirePage("weekendGift")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("weekendGift");
    this.refreshChrome();
  }


  /** 真服神迹遗物。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buyCount、canChallengeCount、starMap、starRewardRecord。无挑战、买次数、领星级奖、扫荡入口。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 61001 分开发，勿合并。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openGodRelic(): void {
    GameLog.shared.info("MainApp", "click god relic");
    if (this.blockWirePage("godRelic")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("godRelic");
    this.refreshChrome();
  }


  /** 真服英雄殿堂。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 type、rankRole、isReward、isWorship、serverRankRole。无膜拜、领排名奖入口。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 62001 分开发，勿合并。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openHeroPalace(): void {
    GameLog.shared.info("MainApp", "click hero palace");
    if (this.blockWirePage("heroPalace")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heroPalace");
    this.refreshChrome();
  }


  /** 真服积天豪礼2。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 day、money、hasReward。无领奖入口。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 63001 分开发，勿合并。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openRechargeDaysB(): void {
    GameLog.shared.info("MainApp", "click recharge days b");
    if (this.blockWirePage("rechargeDaysB")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("rechargeDaysB");
    this.refreshChrome();
  }


  /** 真服时空魔塔。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime。无挑战、无排行入口。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 69001 分开发，勿合并。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openTimeTower(): void {
    GameLog.shared.info("MainApp", "click time tower");
    if (this.blockWirePage("timeTower")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("timeTower");
    this.refreshChrome();
  }


  /** 真服时空冒险。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 unlock_route、not_route、energy、not_progress、end_time、shop_end_time、shop_list、status、product_end_time、product_id、product_buy、speed_buff。无选择航线、加点、修理、购买、改名、探索、放弃、执行、结算、礼包、疾风之力入口。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74001 分开发，勿合并。本刀不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openSpaceTimeAdventure(): void {
    GameLog.shared.info("MainApp", "click space time adventure");
    if (this.blockWirePage("spaceTimeAdventure")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("spaceTimeAdventure");
    this.refreshChrome();
  }


  /** 真服斩魔之路。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 normal_list、king_list、state。无领奖、无王者购买入口。不重复拉 74120。不发 76543。不发 76544。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76541。不发 76501。不夹发 74121。不夹发 74122。不做 75001。不做 73002。不做 71001。不做 20011。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74120 分开发，勿合并。本刀不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openMagicTowerRoad(): void {
    GameLog.shared.info("MainApp", "click magic tower road");
    if (this.blockWirePage("magicTowerRoad")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("magicTowerRoad");
    this.refreshChrome();
  }


  /** 真服七神器。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buy。无购买入口。不重复拉 76542。不发 75102。75102 是购买推送 s2c，勿当 c2s。本模块无独立购写号。75121 诸神祭坛另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76542 分开发，勿合并。不并入 76542。本刀不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openQiShenQi(): void {
    GameLog.shared.info("MainApp", "click qi shen qi");
    if (this.blockWirePage("qiShenQi")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("qiShenQi");
    this.refreshChrome();
  }


  /** 真服诸神祭坛。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 info.floor 与 moneyDrawNum。无抽奖入口。不重复拉 75101。不发 75122。75122 是抽奖，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75101 分开发，勿合并。不并入 75101。本刀不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openZhuShenJiTan(): void {
    GameLog.shared.info("MainApp", "click zhu shen ji tan");
    if (this.blockWirePage("zhuShenJiTan")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("zhuShenJiTan");
    this.refreshChrome();
  }


  /** 真服赏月佳肴。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buy。无购买入口。不重复拉 75121。不发 75132。75132 是购买推送 s2c，勿当 c2s。不夹 75122。不夹 75102。75801 秋赏明月另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75121 分开发，勿合并。不并入 75121。本刀不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openMidFood(): void {
    GameLog.shared.info("MainApp", "click mid food");
    if (this.blockWirePage("midFood")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("midFood");
    this.refreshChrome();
  }


  /** 真服秋赏明月。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 select_info、lottery_reward、lottery_count、lottery_best_remaining_count。无选档、无抽奖、无领次数奖入口。不重复拉 75131。不发 75802。不发 75803。不发 75804。75901 万圣抽奖另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75131 分开发，勿合并。不并入 75131。本刀不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openQiuShangMingYue(): void {
    GameLog.shared.info("MainApp", "click qiu shang ming yue");
    if (this.blockWirePage("qiuShangMingYue")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("qiuShangMingYue");
    this.refreshChrome();
  }


  /** 真服万圣抽奖。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 select_info、lottery_reward、lottery_count、lottery_best_remaining_count、last_lottery_id。无选档、无抽奖、无领次数奖入口。不重复拉 75801。不发 75902。不发 75903。不发 75904。不夹发 75931、75932。不夹发 75941–75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。不是赏月佳肴 75131。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75801 分开发，勿合并。不并入 75801。本刀不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openWanShengLottery(): void {
    GameLog.shared.info("MainApp", "click wan sheng lottery");
    if (this.blockWirePage("wanShengLottery")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("wanShengLottery");
    this.refreshChrome();
  }


  /** 真服黑五活动。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission、mission_box_reward_record、mission_reward_count、buy。无领任务奖、无进度写、无领任务箱、无购礼包入口。不重复拉 75901。不发 76002。不发 76003。不发 76004。不发 76005。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75901 分开发，勿合并。不并入 75901。本刀不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openHeiWuMission(): void {
    GameLog.shared.info("MainApp", "click hei wu mission");
    if (this.blockWirePage("heiWuMission")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heiWuMission");
    this.refreshChrome();
  }


  /** 真服约惠圣诞礼包。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buy。buy 是 repeated PSMapData，key 是礼包 idx，value 是已购次数。缺字段不写成 0。无购买入口。不重复拉 76001。不发 76102。旁支勿夹 76082–76084、76121–76122、76141–76143、76161–76163。76301 出游寻春另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是黑五活动 76001。不是万圣抽奖 75901。5001、51001、68001、70001 已有，勿重复。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76001 分开发，勿合并。不并入 76001。本刀不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openChristmasGift(): void {
    GameLog.shared.info("MainApp", "click christmas gift");
    if (this.blockWirePage("christmasGift")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("christmasGift");
    this.refreshChrome();
  }


  /** 真服出游寻春。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission、mission_box_reward_record、open_day。缺字段不写成 0。无领任务奖、无进度写、无领宝箱入口。不重复拉 76101。不发 76302。不发 76303。不发 76304。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。不是黑五活动 76001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76101 分开发，勿合并。不并入 76101。本刀不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openSpringOuting(): void {
    GameLog.shared.info("MainApp", "click spring outing");
    if (this.blockWirePage("springOuting")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("springOuting");
    this.refreshChrome();
  }


  /** 真服圣诞连线。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission、mission_box_reward_record、open_day。缺字段不写成 0。无领任务奖、无进度写、无领任务箱入口。不重复拉 76301。不发 76082。不发 76083。不发 76084。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76301 分开发，勿合并。不并入 76301。本刀不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openChristmasMission(): void {
    GameLog.shared.info("MainApp", "click christmas mission");
    if (this.blockWirePage("christmasMission")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("christmasMission");
    this.refreshChrome();
  }


  /** 真服关卡榜。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 self、list 以及行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank。缺字段不写成 0。有则含 0/-1 原样。不重复拉 76081。不发 76501–76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76081 分开发，勿合并。不并入 76081。 */
  private openMagicTowerLevelRank(): void {
    GameLog.shared.info("MainApp", "click magic tower level rank");
    if (this.blockWirePage("magicTowerLevelRank")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("magicTowerLevelRank");
    this.refreshChrome();
  }


  /** 真服春日踏青。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 curr_idx、scenic_record、scenic_count。缺字段不写成 0。有则含 0/-1 原样。不重复拉 76520。不发 76252。不发 76253。备选 76271 本轮不做。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是关卡榜 76520。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。与 76520 分开发，勿合并。不并入 76520。 */
  private openSpringOutingGrid(): void {
    GameLog.shared.info("MainApp", "click spring outing grid");
    if (this.blockWirePage("springOutingGrid")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("springOutingGrid");
    this.refreshChrome();
  }


  /** 真服点金。未同步 Toast。已同步压入只读页，不点金，不写金币。不走七日登录。 */
  private openBuyGold(): void {
    GameLog.shared.info("MainApp", "click buygold");
    if (this.blockWirePage("buygold")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("buygold");
    this.refreshChrome();
  }


  /** 真服成就记录。未同步 Toast。已同步（含空成就表）压入只读页，不领奖。 */
  private openAchievement(): void {
    GameLog.shared.info("MainApp", "click achieve");
    if (this.blockWirePage("achieve")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("achieve");
    this.refreshChrome();
  }


  /**
   * 主城和玩法都能进。不看主线等级和开服天。
   * Mock 没连上时不压页面。前往再压一层已有界面，返回回到本页。
   * 真服收到 21010 后走只读页，不领奖。没同步时 Toast，不回落 Mock。不从七日登录或点金进入。
   */
  private openGoal7(): void {
    GameLog.shared.info("MainApp", "click goal7");
    if (this.blockWirePage("goal7")) return;
    if (Session.source === "wire") {
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
      this.panels?.openChild("goal7");
      this.refreshChrome();
      return;
    }
    if (!this.allow("goal7")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("goal7");
    this.refreshChrome();
  }



  /**
   * 主城和玩法都能进。样例 opencondition 没有商店，新号即可进。
   * 没连上时不压页面。
   */
  private openShop(): void {
    GameLog.shared.info("MainApp", "click shop");
    if (this.blockWirePage("shop")) return;
    if (!this.allow("shop")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("shop");
    this.refreshChrome();
  }


  /**
   * 玩法「许愿池」。Mock 未到主线 Lv10 时 allow 已经 Toast，不会进到这里。只做低级。
   * 真服收到 27001 后走只读页，不看这把锁。没同步时 Toast，不回落 Mock。
   */


  /** 玩法「咖啡馆」。未到主线 Lv12 时 allow 已经 Toast，不会进到这里。 */

  /**
   * 主城和玩法都能进。不看主线等级和开服天。
   * 没连上时不压页面。页内再分升级有礼、每日礼包、首充和累充。
   */
  private openGift(): void {
    GameLog.shared.info("MainApp", "click gift");
    if (this.blockWirePage("gift")) return;
    if (!this.allow("gift")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("gift");
    this.refreshChrome();
  }


  /**
   * 主城和玩法都能进。不看主线等级和开服天。
   * 没连上时不压页面。页内再分限时兑换、点石成金和限时礼包。
   */
  private openLimited(): void {
    GameLog.shared.info("MainApp", "click limited");
    if (this.blockWirePage("limited")) return;
    if (!this.allow("limited")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("limited");
    this.refreshChrome();
  }


  /** 七日目标的「前往」。压在当前页上面，返回仍回到目标列表。 */
  private jumpFromGoal(jump: string): void {
    GameLog.shared.info("MainApp", "goal7 jump " + jump);
    if (this.blockWirePage(jump || "goal")) return;
    if (jump === "mainline") {
      this.openMainline();
      return;
    }
    if (jump === "idle") {
      this.openIdle();
      return;
    }
    if (jump === "hero" && Session.source === "wire") {
      if (!this.allow("hero")) return;
      if (useHeroView()) {
        this.openHeroView(false);
        return;
      }
      GameLog.shared.info("Hero", "打开实现 旧 fillHero");
      this.panels?.openChild("hero");
      this.refreshChrome();
      return;
    }
    if (jump === "summon" && Session.source === "wire") {
      if (!this.allow("summon")) return;
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
      this.panels?.openChild("summon");
      this.refreshChrome();
      return;
    }
    if (jump === "hero" || jump === "summon") {
      if (!this.allow(jump)) return;
      if (!this.ensureNet()) return;
      if (jump === "hero" && useHeroView()) {
        this.openHeroView(false);
        return;
      }
      if (jump === "hero") GameLog.shared.info("Hero", "打开实现 旧 fillHero");
      this.panels?.openChild(jump);
      this.refreshChrome();
      return;
    }
    this.shell?.showToast(goal7BadJumpToast(), 2200);
  }

  /** 玩法「日常副本」。未到主线 Lv15 时 allow 已经 Toast，不会进到这里。本页只做金币。 */

  /** 玩法「幻境之塔」。未到主线 Lv16 时 allow 已经 Toast，不会进到这里。不是幻魔塔。 */

  /** 底栏「铁匠铺」。未到主线 Lv5 时 allow 已经 Toast，不会进到这里。 */

  /**
   * 底栏「召唤」。Mock 仍单抽和十连。
   * 真服收到 4004 后走只读页。没同步时 Toast，不回落 Mock。不发 4002、4005。
   */




  /**
   * 主城和玩法都能进。opencondition 未开时只 Toast，和底栏锁一样。
   * 真服按 5001 是否到过，打开只读页或 Toast，不进 Mock 背包。已同步时不看 net.state。
   */
  private openBag(): void {
    GameLog.shared.info("MainApp", "click bag");
    this.openChild("bag");
  }

  /** 未同步 Toast。已同步（含空背包）压入只读页，不走 bag.list，也不看 net.state。 */



  /**
   * 主城和玩法都能进。opencondition 未开时只 Toast，和背包一样。
   * 没连上时不压页面。真服按 15000 是否到过，打开只读页或 Toast，不进 Mock 邮件。
   */
  private openMail(): void {
    GameLog.shared.info("MainApp", "click mail");
    this.openChild("mail");
  }

  /** 未同步 Toast。已同步（含空邮箱）压入只读页，不走 mail.list，不领取。 */



  /** 挂机收益壳。空号也打开，格子跟 GameStore。 */
  private openIdle(): void {
    GameLog.shared.info("MainApp", "click idle");
    this.openChild("idle");
  }



  /** 挂机壳的空宿主。战斗由 mountHangBattleShell 盖上，不再铺 WireMainlinePage。 */
  private mountMainline(): Node {
    return uiNode("LiveShell");
  }


  private mockStageId(): number {
    const stored = GameStore.mockStageId();
    if (stored !== null) return stored;
    return Session.stageId >= 1 ? Session.stageId : 1;
  }

  private stageButtonText(): string {
    let text: string;
    let idx: number | null = null;
    if (Session.source === "wire") {
      text = GameStore.source === "wire" ? GameStore.mainlineLabel() : WireSession.mainlineLabel();
      const chapter = GameStore.chapter();
      if (chapter.fromStore) idx = chapter.nowIdx !== null ? chapter.nowIdx : chapter.maxIdx;
    } else if (GameStore.source === "mock") {
      text = GameStore.mainlineLabel();
      idx = GameStore.mockStageId();
    } else {
      const stageId = Session.stageId >= 1 ? Session.stageId : 1;
      text = "主线 · 第" + stageId + "关";
      idx = stageId;
    }
    const place = chapterPlaceLabel(idx);
    return place ? text + " · " + place : text;
  }

  private setMainButton(text: string): void {
    const button = this.mainButton;
    if (!button || !button.isValid) return;
    const label = button.getChildByName("Label");
    if (label) {
      setText(label, text);
      label.active = false;
    }
    this.paintHeroRecommend(button);
  }

  /** 左下角用已有的英雄推荐图。点击仍是原来的主线，不另发协议。 */
  private paintHeroRecommend(button: Node): void {
    const mark = button as Node & { mxzgRecommend?: boolean };
    if (mark.mxzgRecommend) return;
    const sprite = button.getComponent(Sprite);
    if (!sprite) return;
    mark.mxzgRecommend = true;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const path = "ui/city/main-city_btn-hero-recommend-1/spriteFrame";
    resources.load(path, SpriteFrame, (err, frame) => {
      if (err || !frame || !button.isValid || !sprite.isValid) return;
      sprite.spriteFrame = frame;
    });
  }



  /** 只改本界面的开服天，方便看幻魔塔解锁。下一关结算会按 Mock 进度覆盖。 */


  private noteClose(id: string): void {
    if (id === CITY_HUB_MORE_ID) this.mainButton = null;
    if (this.shell && this.shell.deferBarNote(() => UIManager.instance.noteClosed(id))) return;
    UIManager.instance.noteClosed(id);
  }

  private detachWire(): void {
    if (this.offWire) {
      this.offWire();
      this.offWire = null;
    }
  }

  private gateText(): string {
    if (Session.source === "wire") {
      const name = Session.wireSync.name ? "角色名已同步。" : "角色名还没有从 s2c 2001 读到。";
      const missing: string[] = [];
      if (!Session.wireSync.level) missing.push("等级");
      missing.push("开服天");
      if (!Session.wireSync.gold) missing.push("金币");
      if (!Session.wireSync.diamond) missing.push("钻石");
      return "真服已登录。" + name + missing.join("、") + "仍是未同步";
    }
    const db = ConfigDb.current;
    const level = this.level();
    const day = this.day();
    if (!db) return "配置未加载";
    const open = listOpenEntries(db.opencondition, level, day);
    if (open.length === 0) return "Lv" + level + " / 开服D" + day + " 无入口";
    return "Lv" + level + " / 开服D" + day + " 已开：" + open.map((row) => row.name).join("、");
  }

  private level(): number {
    return Session.role?.level ?? 1;
  }

  private day(): number {
    return Session.openDay >= 1 ? Session.openDay : 1;
  }

  private pageRoot(name: string): Node {
    const page = uiNode(name);
    place(createRect("bg", 720, 1280, PAGE_BG), page, 0, 0);
    return page;
  }

  private resolveCanvas(): Node {
    const named = this.node.getChildByName("Canvas");
    if (named) return named;
    if (this.node.name === "Canvas") return this.node;
    const fromScene = this.node.scene?.getChildByName("Canvas");
    return fromScene ?? this.node;
  }
}
