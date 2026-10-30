/**
 * Boot 启动流（B1）。
 *
 * 阶段：logo → version → hot-update → assets → 读表 → 登录门 → 同步角色包 → Main。
 * 画面是 LoadingLayer / UpdateLayer，不再写一行状态字。流程见 docs/boot-loading.md。
 * 登录是本组件在 Canvas 上生成的面板，不另建 Login 场景。
 * 默认 USE_P1_LOGIN_PREFAB 挂 1:1 的 UserLoginLayer（选服、公告、语言、错误壳）。
 * 改成 false 仍走 USE_LOGIN_PREFAB。缺 LoginPanel 预制只打日志，不手搓登录壳。
 * 创角仍是 USE_CREATE_ROLE_PREFAB。关掉创角预制仍走 buildCreateRolePanel。
 * 账号走 Proto.login / Proto.roleEnter；没有角色或点「创角」时再 Proto.roleCreate。
 * 默认连本机桥 ws://127.0.0.1:13111/game（转到 TCP 9902），不必加 ?transport=ws。
 * 隧道眼检 ?transport=ws&ws=wss://…/game 强制走这条 wss。只有 ?dev=mock / ?transport=mock 才进 Mock。
 * Mock 只在地址带 ?dev=mock 时打开。?transport=auto 短连失败停在「服未启动」，不进 Mock。
 * 打开后发心跳 1004，点登录再发 1001。s2c 1001 有角色就进同一套主城壳。
 * 进主城后角色数据只从 s2c 进 GameStore。
 * 空回包仍走创角 1002，再发一次 1001。金币钻石不从 Mock 填。
 * 连不上会提示检查 start-local-all.bat（或分拆的启服 / 桥脚本）。
 *
 * Creator 里怎么挂（仓库不改 .scene，避免脚本 uuid 对不上）：
 * 1. 用 Creator 3.8.8 打开 client 工程
 * 2. 打开 assets/scenes/legacy/Boot.scene
 * 3. 层级管理器选中 Canvas（不要挂到 Camera）
 * 4. 属性检查器 → 添加组件 → 自定义脚本 → Boot
 * 5. 保存场景。项目启动场景保持 Boot，再点预览
 * 6. 控制台应出现 [Boot] stage=version / hot-update / assets / config / login / sync / enter-main
 * 7. 选服后点「进入游戏」：默认连本机桥 13111/game，发心跳 1004，点登录发 1001。有角色则进主城
 *    ?dev=mock 才走 Mock 登录，成功后 director.loadScene("Main")
 *    账号不是 mock、或点「创角」时先出创角面板（Proto.roleCreate）
 *    Main 场景可以是空的。若 Canvas 上没有 MainApp，这里会补挂
 * 8. 勾选 skipLogin 只在 ?dev=mock 时跳过面板。默认真服仍显示登录
 *
 * 只预览 Main 时：给 Main 的 Canvas 手动挂 MainApp。
 * 安全区：启动和窗口变化时，登录面板挂在 SafeFrame 上，按可见区域缩进。不改场景。
 */
import { _decorator, AudioClip, Component, director, Node, sp, SpriteFrame, sys, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import {
  ClientVersion,
  downloadWithProgress,
  browserSkipsRemoteVersion,
  fetchRemoteVersion,
  hotUpdateUrl,
  isH5Client,
  noteSkippedRemoteVersion,
  readClientVersion,
  remoteVersionUrls,
  versionNeedsUpdate,
} from "./clientVersion";
import { listOpenEntries } from "../config/gates";
import { NetClient } from "../net/NetClient";
import { WireSession } from "../net/WireSession";
import { WsTransport } from "../net/WsTransport";
import { WIRE_HEARTBEAT_MS } from "../net/protocol/frame";
import {
  LoginReplySummary,
  summarizeCreateReply,
  observedLoginChannel,
  observedLoginDevice,
  resolveLoginUid,
  summarizeLoginReply,
  wireBody,
  wireRoleReady,
} from "../net/protocol/wireLogin";
import { NetState } from "../net/NetTypes";
import {
  explainWireTimeout,
  parseTransportSearch,
  readPreviewSearch,
  resolveBootTransport,
  setMockRuntime,
  TransportChoice,
  WS_CLOSE_STATUS,
  WS_DOWN_STATUS,
  WS_OPEN_STATUS,
  wsDownDetail,
  wsDownLog,
} from "../net/transportSelect";
import { Proto } from "../net/protocol";
import { RoleEnterResp } from "../net/protocol/types";
import { buildCreateRolePanel, CreateRolePanelView, mountCreateRolePrefab } from "../ui/CreateRolePanel";
import { LoginHandlers, LoginPanelView, mountLoginPrefab } from "../ui/LoginPanel";
import { mountP1LoginPrefab, USER_LOGIN_PREFAB_PATH } from "../ui/p1Login";
import { CREATE_ROLE_PREFAB_PATH, LOGIN_PREFAB_PATH } from "../ui/prefabLoad";
import { BootChrome, BootCopy, loadBootCopy, preloadBootAsset } from "../ui/bootChrome";
import { playLogoSplash, LogoSplashHandle } from "../ui/logoSplash";
import { primeCityHub } from "../ui/CityHub";
import { liftStagedCity, stageCityShell } from "../ui/cityStage";
import { MainApp } from "../ui/MainApp";
import { bindSafeArea, SafeAreaBinding } from "../ui/SafeArea";
import { Toast } from "../ui/Toast";
import { uiNode } from "../ui/UiKit";
import { ErrorCode, errorText, GameError, messageOf } from "./errors";
import { GameLog } from "./GameLog";
import { GameStore } from "./GameStore";
import { browserPrefStore, loadLoginPrefs, PrefStore, resolveAccount, saveLoginPrefs, TransportPref } from "./LoginPrefs";
import { formatServerLabel, Session } from "./Session";

const { ccclass, property } = _decorator;

const STAGE_VERSION = "检查版本";
const STAGE_UPDATE = "更新资源";
const STAGE_ASSETS = "加载资源";
const STAGE_CONFIG = "读取配置";
const STAGE_LOGIN = "登录";
const STAGE_SYNC = "同步角色";
const SYNC_TIMEOUT_MS = 18000;
const SYNC_POLL_MS = 200;

const BOOT_SPRITE_FRAMES = [
  "ui/login/logo-scene_spr-logo/spriteFrame",
  "ui/login/bg-loading/spriteFrame",
  "ui/common/loading_spr-bg-2/spriteFrame",
  "ui/common/loading_progress-bg/spriteFrame",
  "ui/common/loading_progress/spriteFrame",
  "ui/common/loading_spr-progress-1/spriteFrame",
  "ui/common/loading_text-bg/spriteFrame",
];

/**
 * 默认挂 1:1 UserLoginLayer / ChooseServerLayer。
 * false 时仍走 USE_LOGIN_PREFAB。缺预制只打日志，不手搓登录壳。
 */
export const USE_P1_LOGIN_PREFAB = true;

/** 默认挂 Login Prefab。false 或缺预制时只打日志，不手搓登录壳。 */
export const USE_LOGIN_PREFAB = true;

/** 默认挂 CreateRole Prefab。false 时仍走 buildCreateRolePanel。 */
export const USE_CREATE_ROLE_PREFAB = true;

@ccclass("Boot")
export class Boot extends Component {
  @property
  account = "mock";

  /** 勾选后，仅 ?dev=mock 不显示登录面板。默认真服仍显示登录。 */
  @property
  skipLogin = false;

  private started = false;
  private entering = false;
  private canvas: Node | null = null;
  private safeFrame: Node | null = null;
  private safeBinding: SafeAreaBinding | null = null;
  private bootToast: Toast | null = null;
  private toastLayer: Node | null = null;
  private authBusy = false;
  private loginPanel: LoginPanelView | null = null;
  private createPanel: CreateRolePanelView | null = null;
  /** destroyAuthPanels 递增。过期的 Prefab 加载不再挂到画面上。 */
  private authEpoch = 0;
  private alive = true;
  private useWs = false;
  /** 登录页上点了「连本机服」之后，不再用地址把这次选择盖回 Mock。 */
  private holdTransport = false;
  /** ?transport=auto 时先短连。没带 ?dev=mock 时失败停在服未启动。 */
  private autoFallback = false;
  /** 地址显式 ?dev=mock 或 ?transport=mock。没写就关。 */
  private devMock = false;
  /** 只有 mock / ws 才会写进下次预览。没选过就保持上次的键。 */
  private transportPref?: TransportPref;
  /** 短连失败后，下一帧登录页用这句，而不是「账号」。 */
  private pendingStatus: string | null = null;
  private wsChoice: TransportChoice = parseTransportSearch("");
  private wsEpoch = 0;
  private wsLive = false;
  private wsNet: NetClient | null = null;
  private wsStateOff: (() => void) | null = null;
  /** 最近一次点登录时的账号。创角 1002 之后再发 1001 用它，不猜平台 uid。 */
  private wsAccount = "";
  private chrome: BootChrome | null = null;
  private logo: LogoSplashHandle | null = null;
  private syncEpoch = 0;
  private copyPromise: Promise<BootCopy> | null = null;
  /** 进主城前等包。这段时间断线不把加载层掀开。 */
  private syncing = false;

  start() {
    if (this.started) return;
    this.started = true;
    void this.runBoot();
  }

  onDestroy() {
    this.alive = false;
    this.syncEpoch += 1;
    this.wsEpoch += 1;
    if (this.logo) {
      this.logo.stop();
      this.logo.stopMusic();
      this.logo = null;
    }
    if (this.chrome) {
      this.chrome.destroy();
      this.chrome = null;
    }
    if (this.wsStateOff) {
      this.wsStateOff();
      this.wsStateOff = null;
    }
    const net = this.wsNet;
    this.wsNet = null;
    // 进主城时连接交给 WireSession，切场景不能把真服套接字关掉。
    if (net && WireSession.net !== net) net.close();
    if (this.safeBinding) {
      this.safeBinding.dispose();
      this.safeBinding = null;
    }
  }

  /**
   * 读本页、父页、最外层和 referrer 上的预览查询。
   * ?dev=mock / ?transport=mock 不离线。登录始终连本机桥。
   */
  private applyPreviewTransport(): void {
    const rawSearch = readPreviewSearch();
    this.wsChoice = parseTransportSearch(rawSearch);
    const stored = loadLoginPrefs(this.prefStore());
    const resolved = resolveBootTransport(this.wsChoice, stored?.transport);
    this.useWs = resolved.useWs;
    this.autoFallback = resolved.autoFallback;
    this.devMock = false;
    setMockRuntime(false);
    if (stored?.transport === "mock" || stored?.transport === "ws") this.transportPref = stored.transport;
    GameLog.shared.info(
      "Boot",
      "preview search=" +
        (rawSearch || "(empty)") +
        " kind=" +
        this.wsChoice.kind +
        " wsUrl=" +
        this.wsChoice.wsUrl +
        " explicit=" +
        (this.wsChoice.explicit ? "true" : "false") +
        " useWs=" +
        (this.useWs ? "true" : "false")
    );
    GameLog.shared.info(
      "Boot",
      "transport=" +
        (this.autoFallback ? "auto" : "ws") +
        " " +
        this.wsChoice.wsUrl +
        (this.wsChoice.kind === "mock" ? " 忽略 mock 参数，仍连本机桥" : " 连本机桥")
    );
  }

  private async runBoot(): Promise<void> {
    this.applyPreviewTransport();
    const canvas = this.resolveCanvas();
    this.canvas = canvas;
    const frame = this.mountSafeFrame(canvas);
    // 字标仍是 3×3，不拿来开屏，也不再拼焰环。底图和 LoadingLayer 同一张，淡出时加载层已经在下面。
    this.logo = playLogoSplash(frame, canvas);
    const chrome = new BootChrome(frame);
    this.chrome = chrome;
    void this.bootCopy();
    await this.logo.fadedIn;
    if (!this.alive || !this.isValid) return;
    await chrome.open("loading", this.logo.node);
    if (!this.alive || !this.isValid) return;
    await this.logo.held;
    if (!this.alive || !this.isValid) return;
    this.face(STAGE_VERSION);
    this.logo.stayOnTop();
    this.logo.dismiss();
    await this.logo.done;
    if (!this.alive || !this.isValid) return;

    const versionOk = await this.runVersionStage();
    if (!versionOk || !this.alive || !this.isValid) return;
    await this.runAssetStage();
    if (!this.alive || !this.isValid) return;
    const configOk = await this.loadConfig();
    if (!configOk || !this.alive || !this.isValid) return;

    if (this.skipLogin && !this.useWs) {
      this.face(STAGE_LOGIN);
      const skipped = await this.skipIntoMainLoop();
      if (skipped && this.alive && this.isValid) this.enterMain();
      return;
    }

    if (!this.isValid) return;
    this.showLogin(frame);
  }

  private bootCopy(): Promise<BootCopy> {
    if (this.copyPromise) {
      return this.copyPromise.then((cached) => {
        if (cached.tips.length > 0) return cached;
        this.copyPromise = null;
        return this.bootCopy();
      });
    }
    const pending = loadBootCopy().then((copy) => {
      if (this.alive && this.chrome && copy.tips.length > 0) this.chrome.setTips(copy.tips);
      return copy;
    });
    this.copyPromise = pending;
    return pending;
  }

  /**
   * 远程更大才进热更层。
   * 地址为空，或远程请求失败（网络、超时、404、CORS）时不挡启动，按本地已是最新跳过热更。
   * H5 / Creator 浏览器预览到不了 CDN 时走这条。
   * 版本表本身读失败仍会弹出失败层：先重试一次，再失败改成继续，避免停在 0%。
   * 返回 false 表示这一页已经被拆掉。
   */
  private async runVersionStage(): Promise<boolean> {
    const chrome = this.chrome;
    if (!chrome) return false;
    let failures = 0;
    for (;;) {
      if (!this.alive) return false;
      chrome.setRatio(0);
      await chrome.ensure("loading");
      this.face(STAGE_VERSION);
      try {
        const local = await readClientVersion();
        if (!this.alive) return false;
        GameLog.shared.info("Boot", "stage=version " + local.version);
        const browser = browserSkipsRemoteVersion();
        const empty = remoteVersionUrls(local, browser).length === 0;
        if (browser) noteSkippedRemoteVersion();
        const remote = empty ? null : await fetchRemoteVersion(local);
        if (!this.alive) return false;
        if (remote === null) {
          this.skipUnreachableVersion(local, empty);
          return true;
        }
        chrome.setRatio(1);
        if (!versionNeedsUpdate(local.version, remote)) {
          GameLog.shared.info("Boot", "stage=hot-update skip local=" + local.version + " remote=" + remote);
          return true;
        }
        GameLog.shared.info("Boot", "stage=hot-update remote=" + remote + " local=" + local.version);
        return await this.runHotUpdate(local);
      } catch (err) {
        if (!this.alive) return false;
        failures += 1;
        const text = messageOf(err);
        GameLog.shared.error("Boot", "stage=version " + text);
        const copy = await this.bootCopy();
        chrome.setRatio(0);
        await chrome.open("update");
        if (failures >= 2) {
          const skip = await chrome.prompt(
            (text || copy.versionFail) + "\n本地已是最新 / 跳过热更",
            copy.versionSkip
          );
          if (!skip || !this.alive) return false;
          GameLog.shared.warn("Boot", "stage=version 重试后仍失败，本地已是最新 / 跳过热更");
          GameLog.shared.info("Boot", "stage=hot-update skip 本地已是最新 / 跳过热更");
          chrome.setRatio(1);
          return true;
        }
        const again = await chrome.prompt(text || copy.versionFail, copy.retry);
        if (!again || !this.alive) return false;
      }
    }
  }

  /** 远程版本没读到。警告后跳过热更，后面继续加载资源。 */
  private skipUnreachableVersion(local: ClientVersion, empty: boolean): void {
    const browser = browserSkipsRemoteVersion();
    const where = browser ? " h5" : "";
    const why = browser
      ? "跳过远程版本，因为浏览器/预览。不请求 106.52.67.63:2011 和 cdn-mxzg.anyaojs.com"
      : empty
        ? "版本地址为空"
        : "远程版本不可达";
    GameLog.shared.warn("Boot", "stage=version " + why + where + "，本地已是最新 / 跳过热更 local=" + local.version);
    GameLog.shared.info(
      "Boot",
      "stage=hot-update skip local=" + local.version + " remote=" + (empty ? "empty" : "unreachable")
    );
    if (this.chrome) this.chrome.setRatio(1);
  }

  /**
   * 远程版本更高时走 UpdateLayer。
   * H5 只把进度条走完，不拉字节。其它平台下载 version.manifest，不改原生搜索路径。
   */
  private async runHotUpdate(local: ClientVersion): Promise<boolean> {
    const chrome = this.chrome;
    if (!chrome) return false;
    const copy = await this.bootCopy();
    chrome.setRatio(0);
    await chrome.open("update");
    const intro = copy.newVersion + "\n" + copy.wifi;
    let prompted = false;
    for (;;) {
      if (!this.alive) return false;
      chrome.setRatio(0);
      if (!prompted) {
        const go = await chrome.prompt(intro, "下载");
        if (!go || !this.alive) return false;
        prompted = true;
      }
      this.face(STAGE_UPDATE);
      try {
        if (isH5Client()) {
          GameLog.shared.info("Boot", "stage=hot-update h5 skip download");
          await this.animateChrome(900);
        } else {
          const url = hotUpdateUrl(local);
          if (!url) throw new Error("没有下载地址");
          await downloadWithProgress(url, (ratio) => {
            if (this.chrome) this.chrome.setRatio(ratio);
          });
          GameLog.shared.info("Boot", "stage=hot-update downloaded " + url);
        }
        if (!this.alive) return false;
        chrome.setRatio(1);
        return true;
      } catch (err) {
        if (!this.alive) return false;
        const text = messageOf(err);
        GameLog.shared.error("Boot", "stage=hot-update " + text);
        const again = await chrome.prompt(text, copy.retry);
        if (!again || !this.alive) return false;
      }
    }
  }

  private async animateChrome(ms: number): Promise<void> {
    const started = Date.now();
    while (this.alive && Date.now() - started < ms) {
      if (this.chrome) this.chrome.setRatio((Date.now() - started) / ms);
      await waitMs(16);
    }
    if (this.chrome) this.chrome.setRatio(1);
  }

  private async runAssetStage(): Promise<void> {
    const chrome = this.chrome;
    if (!chrome) return;
    GameLog.shared.info("Boot", "stage=assets");
    chrome.setRatio(0);
    await chrome.ensure("loading");
    this.face(STAGE_ASSETS);
    const jobs: Array<Promise<void>> = [];
    for (let i = 0; i < BOOT_SPRITE_FRAMES.length; i++) {
      jobs.push(preloadBootAsset(BOOT_SPRITE_FRAMES[i], SpriteFrame));
    }
    jobs.push(preloadBootAsset("spine/jindutiao", sp.SkeletonData));
    jobs.push(preloadBootAsset("audio/bgm-logo", AudioClip));
    // 预制在加载条里解完并实例化。进空的 Main 再解顶栏，清屏会黑几十秒。
    jobs.push(primeCityHub());
    if (this.canvas && this.canvas.isValid) jobs.push(stageCityShell(this.canvas));
    let finished = 0;
    const total = jobs.length;
    await Promise.all(
      jobs.map(async (job) => {
        await job;
        finished += 1;
        if (this.chrome && total > 0) this.chrome.setRatio(finished / total);
      })
    );
  }

  private async loadConfig(): Promise<boolean> {
    const chrome = this.chrome;
    GameLog.shared.info("Boot", "stage=config");
    if (chrome) {
      this.face(STAGE_CONFIG);
      chrome.setRatio(0);
    }
    for (;;) {
      if (!this.alive) return false;
      try {
        const db =
          ConfigDb.current ??
          (await ConfigLoader.loadAll((loaded, total) => {
            if (this.chrome && total > 0) this.chrome.setRatio(loaded / total);
          }));
        const open = listOpenEntries(db.opencondition, 1, 1).map((row) => row.id);
        const shown = open.slice(0, 12);
        const more = open.length > shown.length ? " +" + (open.length - shown.length) : "";
        GameLog.shared.info(
          "Boot",
          "config tables=" +
            db.tableCount +
            " rows=" +
            db.rowCount +
            " open@Lv1/D1 " +
            shown.join(",") +
            more
        );
        if (chrome) chrome.setRatio(1);
        return true;
      } catch (err) {
        if (!this.alive) return false;
        const text = messageOf(err);
        GameLog.shared.error("Boot", "config load failed " + text);
        if (!chrome) return false;
        const copy = await this.bootCopy();
        const again = await chrome.prompt(text, copy.retry);
        if (!again || !this.alive) return false;
        this.face(STAGE_CONFIG);
        chrome.setRatio(0);
      }
    }
  }

  private face(stage: string): void {
    if (!this.chrome) return;
    this.chrome.show();
    this.chrome.setStage(stage);
    this.raiseToast();
  }

  private raiseToast(): void {
    if (this.toastLayer && this.toastLayer.isValid && this.toastLayer.parent) {
      this.toastLayer.setSiblingIndex(Math.max(0, this.toastLayer.parent.children.length - 1));
    }
  }

  private async skipIntoMainLoop(): Promise<boolean> {
    for (;;) {
      if (!this.alive) return false;
      try {
        await this.skipIntoMain();
        return this.alive && this.isValid;
      } catch (err) {
        if (!this.alive) return false;
        const text = messageOf(err);
        GameLog.shared.error("Boot", "mock login " + text);
        this.showBootToast(text);
        if (!this.chrome) return false;
        const copy = await this.bootCopy();
        const again = await this.chrome.prompt(text, copy.retry);
        if (!again || !this.alive) return false;
        this.face(STAGE_LOGIN);
      }
    }
  }

  private showLogin(parent: Node): void {
    if (!this.holdTransport) this.applyPreviewTransport();
    this.authBusy = false;
    this.destroyAuthPanels();
    const epoch = this.authEpoch;
    GameLog.shared.info("Boot", "stage=login");
    this.face(STAGE_LOGIN);
    const stored = loadLoginPrefs(this.prefStore());
    const account = resolveAccount(stored?.account, this.account);
    const serverId = stored?.serverId ?? Session.serverId;
    const options = {
      account,
      serverId,
      mode: this.useWs ? ("ws" as const) : ("mock" as const),
      wsUrl: this.wsChoice.wsUrl,
    };
    const slot: { panel: LoginPanelView | null } = { panel: null };
    const handlers = {
      onEnter: () => {
        const panel = slot.panel;
        if (panel) void this.onLoginClicked(panel, false);
      },
      onCreate: () => {
        const panel = slot.panel;
        if (panel) void this.onLoginClicked(panel, true);
      },
      onMock: this.devMock
        ? () => {
            const panel = slot.panel;
            if (panel) this.onUseMock(panel);
          }
        : undefined,
      onLive: () => this.onUseLive(),
    };
    if (USE_P1_LOGIN_PREFAB) {
      void this.mountP1Login(parent, handlers, options, epoch, slot, account);
      return;
    }
    if (!USE_LOGIN_PREFAB) {
      GameLog.shared.warn("Boot", "LoginPanel 预制未开，不手搓登录壳");
      return;
    }
    void this.mountLoginFromPrefab(parent, handlers, options, epoch, slot, account);
  }

  private async mountP1Login(
    parent: Node,
    handlers: LoginHandlers,
    options: { account: string; serverId: number; mode: "mock" | "ws"; wsUrl?: string },
    epoch: number,
    slot: { panel: LoginPanelView | null },
    account: string
  ): Promise<void> {
    let panel: LoginPanelView | null = null;
    try {
      panel = await mountP1LoginPrefab(parent, handlers, options);
      if (!this.isValid || epoch !== this.authEpoch) {
        panel.root.destroy();
        return;
      }
      GameLog.shared.info("Boot", "login prefab p1 " + USER_LOGIN_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || epoch !== this.authEpoch) return;
      GameLog.shared.error("Boot", "login prefab p1 " + messageOf(err) + "，改用原来的登录");
      panel = await this.fallbackLogin(parent, handlers, options);
    }
    if (!panel || !this.isValid || epoch !== this.authEpoch) {
      if (panel) panel.root.destroy();
      return;
    }
    this.finishLogin(panel, slot, account);
  }

  /** P1 壳加载失败时，回到原来的 LoginPanel 预制。缺了只打日志。 */
  private async fallbackLogin(
    parent: Node,
    handlers: LoginHandlers,
    options: { account: string; serverId: number; mode: "mock" | "ws"; wsUrl?: string }
  ): Promise<LoginPanelView | null> {
    if (!USE_LOGIN_PREFAB) {
      GameLog.shared.warn("Boot", "LoginPanel 预制未开，不手搓登录壳");
      return null;
    }
    try {
      const panel = await mountLoginPrefab(parent, handlers, options);
      GameLog.shared.info("Boot", "login prefab " + LOGIN_PREFAB_PATH);
      return panel;
    } catch (err) {
      GameLog.shared.error("Boot", "login prefab " + messageOf(err) + "，不手搓登录壳");
      return null;
    }
  }

  private finishLogin(
    panel: LoginPanelView,
    slot: { panel: LoginPanelView | null },
    account: string
  ): void {
    slot.panel = panel;
    this.loginPanel = panel;
    const hint = GameStore.hintFor(account);
    if (hint) panel.setDetail(hint);
    if (this.useWs) {
      this.face(STAGE_LOGIN);
      void this.probeLocalWs();
      return;
    }
    if (this.chrome) this.chrome.hide();
    if (this.pendingStatus) {
      panel.setStatus(this.pendingStatus);
      panel.setDetail(this.devMock ? "服未启动。可点进入游戏走 Mock" : wsDownDetail(this.wsChoice.wsUrl));
      this.pendingStatus = null;
    }
  }

  private async mountLoginFromPrefab(
    parent: Node,
    handlers: LoginHandlers,
    options: { account: string; serverId: number; mode: "mock" | "ws"; wsUrl?: string },
    epoch: number,
    slot: { panel: LoginPanelView | null },
    account: string
  ): Promise<void> {
    let panel: LoginPanelView | null = null;
    try {
      panel = await mountLoginPrefab(parent, handlers, options);
      if (!this.isValid || epoch !== this.authEpoch) {
        panel.root.destroy();
        return;
      }
      GameLog.shared.info("Boot", "login prefab " + LOGIN_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || epoch !== this.authEpoch) return;
      GameLog.shared.error("Boot", "login prefab " + messageOf(err) + "，不手搓登录壳");
      return;
    }
    if (!panel || !this.isValid || epoch !== this.authEpoch) {
      if (panel) panel.root.destroy();
      return;
    }
    this.finishLogin(panel, slot, account);
  }

  private async onLoginClicked(panel: LoginPanelView, create: boolean): Promise<void> {
    if (this.useWs) {
      await this.onWsAuth(panel, create);
      return;
    }
    await this.onMockLoginClicked(panel, create);
  }

  /** 登录不再改走离线。按钮若还在，点了也留在本机桥。 */
  private onUseMock(panel: LoginPanelView): void {
    if (!this.alive || this.entering || this.authBusy) return;
    GameLog.shared.info("Boot", "离线入口已去掉，仍连 " + this.wsChoice.wsUrl);
    panel.setStatus("仍连本机桥");
    panel.setDetail("");
  }

  /** 登录或创角中途换了连接时，把进入按钮放开。组件已经拆掉就不动面板。 */
  private dropAuthBusy(panel?: { setBusy(on: boolean): void } | null): void {
    this.authBusy = false;
    if (!this.alive) return;
    if (panel) panel.setBusy(false);
    else if (this.loginPanel) this.loginPanel.setBusy(false);
  }

  private async probeLocalWs(): Promise<void> {
    if (!this.alive || this.entering || this.authBusy) return;
    this.authBusy = true;
    const panel = this.loginPanel;
    if (panel) panel.setBusy(true);
    const epoch = this.wsEpoch;
    const opened = await this.openWs(epoch);
    if (!this.alive) return;
    if (epoch !== this.wsEpoch || !this.useWs || !opened) {
      this.dropAuthBusy(this.loginPanel);
      return;
    }
    if (this.loginPanel) this.loginPanel.setBusy(false);
    this.authBusy = false;
    GameLog.shared.info("Boot", WS_OPEN_STATUS);
    if (this.chrome) this.chrome.hide();
  }

  /** 登录页上的「连本机服」。不立刻进主城，先打开桥再等用户点进入游戏。 */
  private onUseLive(): void {
    if (!this.alive || this.entering || this.authBusy) return;
    this.holdTransport = true;
    this.useWs = true;
    this.autoFallback = false;
    this.devMock = false;
    setMockRuntime(false);
    this.pendingStatus = null;
    const parent = this.loginPanel && this.loginPanel.root.parent;
    if (parent && parent.isValid) this.showLogin(parent);
  }

  /** 连上后 NetClient 会立刻发一拍心跳 1004，之后每 25 秒一拍。这里不发登录。 */
  private async openWs(epoch: number): Promise<boolean> {
    const url = this.wsChoice.wsUrl;
    const net = this.ensureWsNet();
    const already = net.state === "connected" && net.url === url;
    if (!already) this.face(STAGE_LOGIN);
    try {
      if (!already) await net.connect(url);
    } catch (err) {
      if (!this.alive || epoch !== this.wsEpoch) return false;
      this.autoFallback = false;
      GameLog.shared.error("Boot", "WebSocket 连接失败 " + messageOf(err) + "。" + wsDownLog(url));
      if (this.chrome) this.chrome.hide();
      if (this.loginPanel) {
        this.loginPanel.setStatus(WS_DOWN_STATUS);
        this.loginPanel.setDetail(wsDownDetail(url));
        this.loginPanel.setBusy(false);
      }
      this.authBusy = false;
      this.showBootToast(WS_DOWN_STATUS);
      return false;
    }
    if (!this.alive || epoch !== this.wsEpoch) return false;
    this.wsLive = true;
    this.autoFallback = false;
    this.transportPref = "ws";
    if (this.loginPanel) this.remember(resolveAccount(this.loginPanel.account(), this.account), this.loginPanel.serverId());
    // 登录回包可能和 2001、3007 粘在同一条消息里。先听着，进主城再写。
    WireSession.watch(net);
    return true;
  }

  private async onWsAuth(panel: LoginPanelView, create: boolean): Promise<void> {
    if (!this.alive || this.entering || this.authBusy) return;
    this.authBusy = true;
    panel.setBusy(true);
    const epoch = this.wsEpoch;
    const opened = await this.openWs(epoch);
    if (!this.alive) return;
    if (epoch !== this.wsEpoch || !this.useWs || !opened) {
      this.dropAuthBusy(panel);
      return;
    }
    const account = resolveAccount(panel.account(), this.account);
    const serverId = panel.serverId();
    const platformId = panel.platformId();
    const channelId = panel.channelId();
    const pfId = panel.pfId();
    this.wsAccount = account;
    this.remember(account, serverId);
    const uid = resolveLoginUid(account, platformId);
    if (uid === null) {
      GameLog.shared.warn("Ws", "账号「" + account + "」编不出平台 uid，1001 不写字段2。");
    } else {
      const pure = /^[1-9][0-9]{0,9}$/.test(account.trim());
      const fromPlatform = !pure && /^[1-9][0-9]{0,9}$/.test(platformId.trim());
      const how = pure ? "账号" : fromPlatform ? "平台ID" : "账号散列";
      GameLog.shared.info(
        "Ws",
        "登录字段2=" + uid + "（" + how + "） 字段6=" + observedLoginDevice(pfId) + " 字段7=" + observedLoginChannel(channelId)
      );
    }
    GameLog.shared.info("Ws", "选服 " + serverId + " 不写入登录包。两例 1001 的字段1都是 7、字段3都是 2。");
    this.face(STAGE_LOGIN);
    const nowSec = Math.floor(Date.now() / 1000);
    let body: Uint8Array;
    try {
      const msg = await this.ensureWsNet().request(
        "login",
        { account, uid, nowSec, platformId, channel: channelId, device: pfId },
        5000
      );
      body = wireBody(msg.data);
    } catch (err) {
      if (!this.alive) return;
      if (epoch !== this.wsEpoch || !this.useWs) {
        this.dropAuthBusy(panel);
        return;
      }
      const kind = wireTimeoutKind(err);
      const text = kind ? kind + " 请求超时" : messageOf(err);
      if (this.chrome) this.chrome.hide();
      if (kind) {
        const detail = this.noteWsTimeout(kind);
        if (this.loginPanel) {
          this.loginPanel.setStatus(text);
          this.loginPanel.setDetail(detail);
          this.loginPanel.setBusy(false);
        }
      } else {
        GameLog.shared.error("Boot", "登录 1001 " + text);
        if (this.loginPanel) {
          this.loginPanel.setStatus(text);
          this.loginPanel.setDetail("可再点一次");
          this.loginPanel.setBusy(false);
        }
      }
      this.authBusy = false;
      this.showBootToast(text);
      return;
    }
    if (!this.alive) return;
    if (epoch !== this.wsEpoch || !this.useWs) {
      this.dropAuthBusy(panel);
      return;
    }
    const summary = summarizeLoginReply(body);
    GameLog.shared.info("Boot", summary.status + " " + summary.detail);
    if (wireRoleReady(summary) && summary.roleId !== null) {
      if (create) GameLog.shared.info("Boot", "已有角色，未发创角 1002");
      void this.enterWireCity(account, serverId, summary.roleId, null, summary);
      return;
    }
    if (create && summary.empty) {
      const parent = panel.root.parent;
      setTimeout(() => {
        if (!this.alive || epoch !== this.wsEpoch || !this.useWs) {
          this.dropAuthBusy(null);
          return;
        }
        this.destroyAuthPanels();
        if (parent && parent.isValid) this.showCreate(parent, account, false, true);
        else this.authBusy = false;
      }, 0);
      return;
    }
    if (this.chrome) this.chrome.hide();
    if (this.loginPanel) {
      const extra = create && !summary.empty ? "已有回包，未发创角 1002。" : "";
      this.loginPanel.setStatus(summary.status);
      this.loginPanel.setDetail(extra + summary.detail);
      this.loginPanel.setBusy(false);
    }
    this.authBusy = false;
    this.showBootToast(summary.status);
  }

  private ensureWsNet(): NetClient {
    if (this.wsNet) return this.wsNet;
    const transport = new WsTransport({ connectTimeoutMs: this.autoFallback ? 1500 : 5000 });
    const net = new NetClient(transport, {
      heartbeatMs: WIRE_HEARTBEAT_MS,
      reconnectDelayMs: 800,
      maxReconnect: 0,
      requestTimeoutMs: 5000,
    });
    this.wsStateOff = net.onState((state) => this.onWsState(state));
    this.wsNet = net;
    return net;
  }

  private onWsState(state: NetState): void {
    if (!this.alive || !this.useWs) return;
    const panel = this.loginPanel;
    if (state === "connecting") {
      if (!this.syncing) this.face(STAGE_LOGIN);
      return;
    }
    if (state === "reconnecting") {
      GameLog.shared.info("Ws", "正在重连");
      if (panel) panel.setStatus("正在重连…");
      this.showBootToast("正在重连");
      return;
    }
    if (state === "closed" && this.wsLive) {
      this.wsLive = false;
      GameLog.shared.warn("Boot", WS_CLOSE_STATUS);
      if (!this.syncing && this.chrome) this.chrome.hide();
      if (panel) {
        panel.setStatus(WS_CLOSE_STATUS);
        panel.setDetail("可点进入游戏重试");
        panel.setBusy(false);
      }
      this.authBusy = false;
      this.showBootToast(WS_CLOSE_STATUS);
    }
  }

  private async onMockLoginClicked(panel: LoginPanelView, create: boolean): Promise<void> {
    if (this.entering || this.authBusy) return;
    this.authBusy = true;
    panel.setBusy(true);
    this.face(STAGE_LOGIN);
    const account = resolveAccount(panel.account(), this.account);
    const serverId = panel.serverId();
    try {
      const role = await this.loginAccount(account, serverId);
      if (!this.isValid) return;
      this.remember(account, serverId);
      if (create || !role.hasRole) {
        const parent = panel.root.parent;
        const hadRole = role.hasRole;
        // 等这次点击结束再拆掉面板，避免销毁当前按钮。
        setTimeout(() => {
          if (!this.isValid) return;
          this.destroyAuthPanels();
          if (parent && parent.isValid) this.showCreate(parent, account, hadRole);
          else this.authBusy = false;
        }, 0);
        return;
      }
      this.applyEntered(role);
      this.logEntered("mock login ok");
      this.enterMain();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Boot", "mock login " + text);
      if (!this.isValid) return;
      if (this.chrome) this.chrome.hide();
      panel.setStatus(text);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
  }

  /** 不显示面板。检查器账号优先；没有角色时用账号名自动创角，避免预览停在创角。 */
  private async skipIntoMain(): Promise<void> {
    const stored = loadLoginPrefs(this.prefStore());
    const account = resolveAccount(this.account, stored?.account);
    const serverId = stored?.serverId ?? Session.serverId;
    const role = await this.loginAccount(account, serverId);
    this.remember(account, serverId);
    if (role.hasRole) {
      this.applyEntered(role);
      this.logEntered("mock login ok");
      return;
    }
    GameLog.shared.info("Boot", "skipLogin create " + account);
    const net = NetClient.shared;
    const created = await Proto.roleCreate({ account, name: account }, net);
    if (!created.ok) throw new GameError(created.code ?? ErrorCode.ROLE_NAME_EMPTY, "role.create");
    const again = await Proto.roleEnter({ account }, net);
    if (!again.ok || !again.hasRole) throw new GameError(again.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
    this.applyEntered(again);
    this.logEntered("mock login ok");
  }

  private showCreate(parent: Node, account: string, hadRole: boolean, wire = false): void {
    this.authBusy = false;
    const epoch = this.authEpoch;
    const serverLabel = formatServerLabel(wire);
    GameLog.shared.info(
      "Boot",
      "stage=create account=" + account + " server=" + serverLabel + (wire ? " wire" : "")
    );
    if (this.chrome) this.chrome.hide();
    const options = {
      account,
      serverName: serverLabel,
      hadRole,
    };
    const slot: { panel: CreateRolePanelView | null } = { panel: null };
    const handlers = {
      onConfirm: () => {
        const panel = slot.panel;
        if (panel) void this.onCreateConfirmed(panel);
      },
      onBack: () => {
        if (this.authBusy) return;
        this.authBusy = true;
        setTimeout(() => {
          if (!this.isValid) return;
          this.showLogin(parent);
        }, 0);
      },
    };
    if (!USE_CREATE_ROLE_PREFAB) {
      const panel = buildCreateRolePanel(parent, handlers, options);
      slot.panel = panel;
      this.createPanel = panel;
      return;
    }
    void this.mountCreateFromPrefab(parent, handlers, options, epoch, slot);
  }

  private async mountCreateFromPrefab(
    parent: Node,
    handlers: { onConfirm: () => void; onBack: () => void },
    options: { account: string; serverName: string; hadRole: boolean; hint?: string },
    epoch: number,
    slot: { panel: CreateRolePanelView | null }
  ): Promise<void> {
    let panel: CreateRolePanelView | null = null;
    try {
      panel = await mountCreateRolePrefab(parent, handlers, options);
      if (!this.isValid || epoch !== this.authEpoch) {
        panel.root.destroy();
        return;
      }
      GameLog.shared.info("Boot", "create prefab " + CREATE_ROLE_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || epoch !== this.authEpoch) return;
      GameLog.shared.error("Boot", "create prefab " + messageOf(err) + "，改用代码 UI");
      panel = buildCreateRolePanel(parent, handlers, options);
    }
    if (!panel || !this.isValid || epoch !== this.authEpoch) {
      if (panel) panel.root.destroy();
      return;
    }
    slot.panel = panel;
    this.createPanel = panel;
  }

  private async onCreateConfirmed(panel: CreateRolePanelView): Promise<void> {
    if (this.useWs) {
      await this.onWsCreateConfirmed(panel);
      return;
    }
    if (this.entering || this.authBusy) return;
    this.authBusy = true;
    panel.setBusy(true);
    this.face(STAGE_LOGIN);
    try {
      const net = NetClient.shared;
      const resp = await Proto.roleCreate({ account: Session.account, name: panel.name() }, net);
      if (!this.isValid) return;
      if (!resp.ok) {
        const text = errorText(resp.code ?? ErrorCode.ROLE_NAME_EMPTY);
        if (this.chrome) this.chrome.hide();
        panel.setStatus(text);
        panel.setBusy(false);
        this.authBusy = false;
        this.showBootToast(text);
        return;
      }
      const role = await Proto.roleEnter({ account: Session.account }, net);
      if (!role.ok || !role.hasRole) throw new GameError(role.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
      this.applyEntered(role);
      this.logEntered("create ok");
      this.enterMain();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Boot", "create " + text);
      if (!this.isValid) return;
      if (this.chrome) this.chrome.hide();
      panel.setStatus(text);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
  }

  private async onWsCreateConfirmed(panel: CreateRolePanelView): Promise<void> {
    if (!this.alive || this.entering || this.authBusy) return;
    const name = panel.name().trim();
    if (!name) {
      panel.setStatus("角色名不能为空");
      this.showBootToast("角色名不能为空");
      return;
    }
    const net = this.ensureWsNet();
    if (net.state !== "connected") {
      panel.setStatus(WS_CLOSE_STATUS);
      this.showBootToast(WS_CLOSE_STATUS);
      return;
    }
    this.authBusy = true;
    panel.setBusy(true);
    const epoch = this.wsEpoch;
    this.face(STAGE_LOGIN);
    try {
      const createdMsg = await net.request("role.create", { name }, 5000);
      if (!this.alive) return;
      if (epoch !== this.wsEpoch || !this.useWs) {
        this.dropAuthBusy(panel);
        return;
      }
      const created = summarizeCreateReply(wireBody(createdMsg.data));
      GameLog.shared.info("Boot", created.status);
      const againMsg = await net.request("login", { account: this.wsAccount, nowSec: Math.floor(Date.now() / 1000) }, 5000);
      if (!this.alive) return;
      if (epoch !== this.wsEpoch || !this.useWs) {
        this.dropAuthBusy(panel);
        return;
      }
      const again = summarizeLoginReply(wireBody(againMsg.data));
      GameLog.shared.info("Boot", "创角后 " + again.status + " " + again.detail);
      if (wireRoleReady(again) && again.roleId !== null) {
        void this.enterWireCity(this.wsAccount, Session.serverId, again.roleId, name, again);
        return;
      }
      if (this.chrome) this.chrome.hide();
      panel.setStatus(again.status);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(again.status);
    } catch (err) {
      if (!this.alive) return;
      if (epoch !== this.wsEpoch || !this.useWs) {
        this.dropAuthBusy(panel);
        return;
      }
      const kind = wireTimeoutKind(err);
      const text = kind ? kind + " 请求超时" : messageOf(err);
      if (this.chrome) this.chrome.hide();
      if (kind) {
        panel.setStatus(text);
        this.noteWsTimeout(kind);
      } else {
        GameLog.shared.error("Boot", "创角 1002 " + text);
        panel.setStatus(text);
      }
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
  }

  /** 超时把最近的 Ws 行写进 GameLog，面板只留一行标志。返回这行标志。 */
  private noteWsTimeout(kind: string): string {
    const messages: string[] = [];
    const recent = GameLog.shared.recent();
    for (let i = 0; i < recent.length; i++) {
      if (recent[i].tag === "Ws") messages.push(recent[i].message);
    }
    const report = explainWireTimeout(messages);
    GameLog.shared.error("Boot", kind + " 请求超时。" + report.summary);
    for (let i = 0; i < report.tail.length; i++) {
      GameLog.shared.warn("Boot", "超时前 " + report.tail[i]);
    }
    return report.detail;
  }

  private async loginAccount(account: string, serverId: number): Promise<RoleEnterResp> {
    GameLog.shared.info("Boot", "stage=login account=" + account + " server=" + serverId);
    const net = NetClient.shared;
    if (net.state !== "connected") {
      await net.connect("mock://local");
    }
    Session.setServer(serverId);
    const login = await Proto.login({ account, serverId: Session.serverId }, net);
    if (!login.ok) throw new GameError(login.code ?? ErrorCode.LOGIN_FAILED, "login");
    Session.account = account;
    Session.token = login.token;
    if (typeof login.serverId === "number") Session.setServer(login.serverId);
    const role = await Proto.roleEnter({ account }, net);
    if (!role.ok) throw new GameError(role.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
    return role;
  }

  private applyEntered(role: RoleEnterResp): void {
    Session.applyEnter(role);
  }

  /** 真服有角色：只记角色 id（创角时加上刚填的名字），然后走和 Mock 一样的进主城。 */
  private async enterWireCity(
    account: string,
    serverId: number,
    roleId: number,
    name: string | null,
    summary: LoginReplySummary
  ): Promise<void> {
    Session.applyWireRole({ account, serverId, roleId, name });
    if (this.wsNet) {
      WireSession.hold(this.wsNet);
      WireSession.prepareCity();
      WireSession.flush();
      WireSession.pullRoleProfile();
      WireSession.pullChapter();
      WireSession.pullIdle();
    }
    GameLog.shared.info("Boot", summary.status + " " + summary.detail);
    this.logEntered("wire login ok");
    this.syncing = true;
    this.face(STAGE_SYNC);
    if (this.chrome) this.chrome.setRatio(0);
    GameLog.shared.info("Boot", "stage=sync");
    const ready = await this.waitCityPackets();
    this.syncing = false;
    if (!ready || !this.alive) {
      this.authBusy = false;
      if (this.chrome) this.chrome.hide();
      if (this.loginPanel) this.loginPanel.setBusy(false);
      if (this.createPanel) this.createPanel.setBusy(false);
      return;
    }
    this.authBusy = false;
    this.enterMain();
  }

  /** 等主城要的包。超时只重发三次拉取，不调用 prepareCity，已到的包留着。 */
  private waitCityPackets(): Promise<boolean> {
    const epoch = (this.syncEpoch += 1);
    const total = 8;
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let off = (): void => undefined;
      let waitingRetry = false;
      const started = { t: Date.now() };
      const finish = (ok: boolean) => {
        if (timer) clearTimeout(timer);
        timer = null;
        off();
        resolve(ok);
      };
      const repull = () => {
        WireSession.pullRoleProfile();
        WireSession.pullChapter();
        WireSession.pullIdle();
      };
      const tick = () => {
        if (waitingRetry) return;
        if (timer) clearTimeout(timer);
        timer = null;
        if (!this.alive || epoch !== this.syncEpoch) {
          finish(false);
          return;
        }
        const missing = WireSession.citySyncMissing();
        if (this.chrome) this.chrome.setRatio((total - missing.length) / total);
        if (missing.length === 0) {
          if (this.chrome) this.chrome.setRatio(1);
          finish(true);
          return;
        }
        if (Date.now() - started.t >= SYNC_TIMEOUT_MS) {
          off();
          waitingRetry = true;
          const text = "同步超时，还缺 " + missing.join("、");
          GameLog.shared.warn("Boot", "stage=sync " + text);
          const ask = this.chrome ? this.chrome.prompt(text, "重试") : Promise.resolve(false);
          void ask.then((again) => {
            waitingRetry = false;
            if (!again || !this.alive || epoch !== this.syncEpoch) {
              finish(false);
              return;
            }
            repull();
            started.t = Date.now();
            this.face(STAGE_SYNC);
            off = WireSession.onSync(tick);
            timer = setTimeout(tick, SYNC_POLL_MS);
          });
          return;
        }
        timer = setTimeout(tick, SYNC_POLL_MS);
      };
      off = WireSession.onSync(tick);
      tick();
    });
  }

  /** 改走 Mock 时关掉桥。进主城后的连接在 WireSession 里，这里也放下。 */
  private dropWs(): void {
    this.wsEpoch += 1;
    this.wsLive = false;
    const net = this.wsNet;
    this.wsNet = null;
    WireSession.release(net);
    if (net) net.close();
    else WireSession.close();
  }

  private logEntered(prefix: string): void {
    const name = Session.role ? Session.role.name : "";
    GameLog.shared.info(
      "Boot",
      prefix + " " + Session.account + " " + name + " " + formatServerLabel() + " stage " + Session.stageId
    );
  }

  private remember(account: string, serverId: number): void {
    const transport = this.transportPref === "mock" || this.transportPref === "ws" ? this.transportPref : undefined;
    saveLoginPrefs({ account, serverId, transport }, this.prefStore());
  }

  private prefStore(): PrefStore | null {
    try {
      const local = sys.localStorage as PrefStore | null | undefined;
      if (local && typeof local.getItem === "function" && typeof local.setItem === "function") return local;
    } catch (_err) {
      // 再用浏览器 localStorage。
    }
    return browserPrefStore();
  }

  private destroyAuthPanels(): void {
    this.authEpoch += 1;
    if (this.loginPanel) {
      this.loginPanel.root.destroy();
      this.loginPanel = null;
    }
    if (this.createPanel) {
      this.createPanel.root.destroy();
      this.createPanel = null;
    }
  }

  private showBootToast(text: string): void {
    const parent = this.toastParent();
    if (!parent || !this.isValid) return;
    if (!this.bootToast || !this.toastLayer || !this.toastLayer.isValid) {
      const layer = uiNode("BootToast");
      const ui = layer.addComponent(UITransform);
      ui.setContentSize(2000, 2000);
      layer.parent = parent;
      this.toastLayer = layer;
      this.bootToast = new Toast(layer);
    }
    if (this.toastLayer.parent === parent) {
      this.toastLayer.setSiblingIndex(Math.max(0, parent.children.length - 1));
    }
    this.bootToast.show(text, 2200);
  }

  private mountSafeFrame(canvas: Node): Node {
    const frame = uiNode("SafeFrame");
    const ui = frame.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    frame.parent = canvas;
    this.safeFrame = frame;
    this.safeBinding = bindSafeArea({
      canvas,
      targets: [{ node: frame }],
    });
    return frame;
  }

  private toastParent(): Node | null {
    if (this.safeFrame && this.safeFrame.isValid) return this.safeFrame;
    if (this.canvas && this.canvas.isValid) return this.canvas;
    return null;
  }

  private enterMain(): void {
    if (this.entering) return;
    this.entering = true;
    if (this.logo) this.logo.stopMusic();
    // 先把已经实例化的主城改成常驻，再换场景。留在 Boot 的 Canvas 里会被一起拆掉。
    liftStagedCity();
    GameLog.shared.info("Boot", "stage=enter-main");
    director.loadScene("Main", (err, scene) => {
      if (err || !scene) {
        GameLog.shared.error("Boot", "loadScene Main failed " + messageOf(err));
        this.entering = false;
        return;
      }
      const canvas = scene.getChildByName("Canvas");
      if (!canvas) {
        GameLog.shared.error("Boot", "Main scene has no Canvas");
        return;
      }
      if (!canvas.getComponent(MainApp)) {
        canvas.addComponent(MainApp);
      }
      GameLog.shared.info("Boot", "Main ready");
    });
  }

  private resolveCanvas(): Node {
    if (this.node.name === "Canvas") return this.node;
    const child = this.node.getChildByName("Canvas");
    if (child) return child;
    const fromScene = this.node.scene?.getChildByName("Canvas");
    if (fromScene) return fromScene;
    GameLog.shared.warn("Boot", "Canvas not found, parent UI on " + this.node.name);
    return this.node;
  }
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** NetClient 把 cmd 放在 GameError.detail。只有超时才换成长说明。 */
function wireTimeoutKind(err: unknown): string | null {
  if (!(err instanceof GameError) || err.code !== ErrorCode.NET_TIMEOUT) return null;
  if (err.detail === "role.create") return "创角 1002";
  if (err.detail === "login") return "登录 1001";
  return "请求";
}
