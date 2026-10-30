/**
 * P1 登录壳。Boot 在 USE_P1_LOGIN_PREFAB 时挂这里。
 * 看见的是 UserLoginLayer；点服务器条打开 ChooseServerLayer。
 * 进游戏仍走 Boot 原来的 onEnter。关掉本开关就回到 LoginPanel / 代码登录。
 */
import { BlockInputEvents, Button, Color, Label, Node, Overflow, UITransform } from "cc";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { isP1ProgressStatus } from "./prefabShellMap";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { LoginHandlers, LoginPanelOptions, LoginPanelView } from "./LoginPanel";
import { bindTap, findDescendant, liftNode, mountCcbiView } from "./pagePrefabShell";
import { createButton, createField, createLabel, createRect, place, setText, TextField, uiNode } from "./UiKit";

export const USER_LOGIN_PREFAB_PATH = "prefabs/ui/legacy-login/UserLoginLayer";
export const CHOOSE_SERVER_PREFAB_PATH = "prefabs/ui/login/ChooseServerLayer";
export const CHOOSE_SERVER_CELL_PATH = "prefabs/ui/login/ChooseServerCell";
export const NOTICE_PREFAB_PATH = "prefabs/ui/login/NoticeLayer";
export const LANGUAGE_PREFAB_PATH = "prefabs/ui/login/LanguageSelectLayer";
export const ERROR_PREFAB_PATH = "prefabs/ui/login/ErrorLayer";

export async function mountP1LoginPrefab(
  parent: Node,
  handlers: LoginHandlers,
  options?: LoginPanelOptions
): Promise<LoginPanelView> {
  const host = uiNode("P1Login");
  const hostUi = host.addComponent(UITransform);
  hostUi.setContentSize(2000, 2000);
  host.addComponent(BlockInputEvents);
  host.parent = parent;

  const accountField = { current: null as TextField | null };
  const platformField = { current: null as TextField | null };
  const channelField = { current: null as TextField | null };
  const pfField = { current: null as TextField | null };
  const statusNode = place(createLabel("", 20, { color: new Color(255, 244, 210, 255), width: 640 }), host, 0, -400);
  const detailNode = place(createLabel("", 16, { color: new Color(190, 205, 225, 255), width: 640, height: 48 }), host, 0, -448);
  let selected = { id: 1, name: "本机桥" };
  let serverLabel: Node | null = null;
  let loginButton: Node | null = null;
  let busy = false;
  let errorLayer: Node | null = null;
  let errorToken = 0;

  const setBusyNodes = (on: boolean) => {
    busy = on;
    if (!loginButton) return;
    const button = loginButton.getComponent(Button);
    if (button) button.interactable = !on;
  };

  try {
    const prefab = await loadPrefab(USER_LOGIN_PREFAB_PATH);
    const view = spawnPrefab(prefab, host);
    mountCcbiView(view);

    const userBg = findDescendant(view, "spr_user_bg");
    if (!userBg) throw new Error("UserLoginLayer 缺少 spr_user_bg");
    accountField.current = overlayField(userBg, "账号", options?.account ?? "");
    const platformBg = findDescendant(view, "spr_platform_bg");
    if (platformBg) platformField.current = overlayField(platformBg, "正整数，可空", "");
    const channelBg = findDescendant(view, "spr_channel_bg");
    if (channelBg) channelField.current = overlayField(channelBg, "可空", "", 32);
    const pfBg = findDescendant(view, "spr_pf_bg");
    if (pfBg) pfField.current = overlayField(pfBg, "可空", "", 32);

    const serverBg = findDescendant(view, "spr_server_bg");
    if (!serverBg) throw new Error("UserLoginLayer 缺少 spr_server_bg");
    serverLabel = overlayCaption(serverBg, selected.name);
    bindTap(serverBg, () => {
      if (!busy) void openChooseServer();
    });
    if (serverLabel) {
      bindTap(serverLabel, () => {
        if (!busy) void openChooseServer();
      });
    }

    loginButton = findDescendant(view, "btn_login");
    if (!loginButton) throw new Error("UserLoginLayer 缺少 btn_login");
    liftNode(loginButton, view);
    bindTap(loginButton, () => handlers.onEnter());

    const close = findDescendant(view, "btn_close");
    if (close) {
      liftNode(close, view);
      bindTap(close, () => {
        void openSimple(LANGUAGE_PREFAB_PATH, (layer) => {
          const confirm = findDescendant(layer, "btn_confirm");
          const dismiss = findDescendant(layer, "btn_close");
          if (confirm) bindTap(confirm, () => dismissLayer(layer));
          if (dismiss) bindTap(dismiss, () => dismissLayer(layer));
        });
      });
    }

    place(createButton("创角", () => handlers.onCreate(), 200, 44), host, 0, -520);

    void openSimple(NOTICE_PREFAB_PATH, (layer) => {
      const confirm = findDescendant(layer, "btn_confirm");
      const dismiss = findDescendant(layer, "btn_close");
      if (confirm) {
        liftNode(confirm, layer);
        bindTap(confirm, () => dismissLayer(layer));
      }
      if (dismiss) {
        liftNode(dismiss, layer);
        bindTap(dismiss, () => dismissLayer(layer));
      }
    });
  } catch (err) {
    host.destroy();
    throw err;
  }

  function paintServer(): void {
    if (serverLabel) setText(serverLabel, selected.name);
  }

  async function openChooseServer(): Promise<void> {
    await openSimple(CHOOSE_SERVER_PREFAB_PATH, (layer) => {
      const dismiss = findDescendant(layer, "btn_close");
      if (dismiss) {
        liftNode(dismiss, layer);
        bindTap(dismiss, () => dismissLayer(layer));
      }
      void fillServers(layer, () => dismissLayer(layer));
    });
  }

  async function fillServers(layer: Node, close: () => void): Promise<void> {
    const content = findDescendant(layer, "content");
    if (!content) return;
    const tabWell = findDescendant(layer, "spr_tab_bg");
    if (tabWell) tabWell.active = false;
    const rows = [{ id: 1, name: "本机桥" }];
    try {
      const cellPrefab = await loadPrefab(CHOOSE_SERVER_CELL_PATH);
      if (!content.isValid) return;
      for (let i = 0; i < rows.length; i++) {
        const server = rows[i];
        const cell = spawnPrefab(cellPrefab, content);
        placeCell(content, cell, i);
        const name = findDescendant(cell, "lbl_server_name");
        if (name) showServerName(name, server.name);
        const best = findDescendant(cell, "spr_best");
        if (best) best.active = i === 0;
        bindTap(cell, () => {
          selected = server;
          paintServer();
          close();
        });
      }
    } catch (err) {
      GameLog.shared.error("Boot", "choose server cell " + messageOf(err));
    }
  }

  async function openSimple(path: string, bind: (view: Node) => void): Promise<void> {
    const layer = uiNode("P1Layer");
    const ui = layer.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    layer.addComponent(BlockInputEvents);
    // 盖住整个登录宿主。720 宽的半透明层盖不住两侧，账号条和状态字会透出来。
    place(createRect("dim", 2000, 2000, new Color(8, 16, 32, 255)), layer, 0, 0);
    layer.parent = host;
    layer.setSiblingIndex(Math.max(0, host.children.length - 1));
    try {
      const prefab = await loadPrefab(path);
      if (!layer.isValid) return;
      const view = spawnPrefab(prefab, layer);
      mountCcbiView(view);
      bind(view);
      GameLog.shared.info("Boot", "login layer " + path);
    } catch (err) {
      GameLog.shared.error("Boot", "login layer " + path + " " + messageOf(err));
      if (layer.isValid) layer.destroy();
    }
  }

  function dismissLayer(view: Node): void {
    const layer = view.parent;
    if (layer && layer.isValid && layer.name === "P1Layer") layer.destroy();
    else if (view.isValid) view.destroy();
  }

  async function showError(text: string, token: number): Promise<void> {
    if (token !== errorToken) return;
    if (errorLayer && errorLayer.isValid) {
      const msg = findDescendant(errorLayer, "P1ErrorText");
      if (msg) setText(msg, text);
      return;
    }
    const layer = uiNode("P1Layer");
    const ui = layer.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    layer.addComponent(BlockInputEvents);
    layer.parent = host;
    try {
      const prefab = await loadPrefab(ERROR_PREFAB_PATH);
      if (!layer.isValid || token !== errorToken) {
        if (layer.isValid) layer.destroy();
        return;
      }
      const view = spawnPrefab(prefab, layer);
      mountCcbiView(view);
      const msg = createLabel(text, 22, { color: new Color(80, 40, 20, 255), width: 520, height: 180 });
      msg.name = "P1ErrorText";
      msg.parent = view;
      msg.setPosition(320, 480, 0);
      const close = findDescendant(view, "btn_all_equip");
      const dismiss = () => {
        if (layer.isValid) layer.destroy();
        if (errorLayer === layer) errorLayer = null;
      };
      if (close) {
        liftNode(close, view);
        bindTap(close, dismiss);
      } else {
        place(createButton("关闭", dismiss, 160, 44), layer, 0, -200);
      }
      errorLayer = layer;
      GameLog.shared.info("Boot", "login layer " + ERROR_PREFAB_PATH);
    } catch (err) {
      GameLog.shared.error("Boot", "login layer " + ERROR_PREFAB_PATH + " " + messageOf(err));
      if (layer.isValid) layer.destroy();
    }
  }

  return {
    root: host,
    setStatus(text: string) {
      setText(statusNode, text);
      errorToken += 1;
      if (isP1ProgressStatus(text)) {
        if (errorLayer && errorLayer.isValid) errorLayer.destroy();
        errorLayer = null;
        return;
      }
      void showError(text, errorToken);
    },
    setDetail(text: string) {
      setText(detailNode, text);
    },
    setBusy(on: boolean) {
      setBusyNodes(on);
    },
    account(): string {
      return accountField.current ? accountField.current.getValue() : "";
    },
    password(): string {
      return "";
    },
    serverId(): number {
      return selected.id;
    },
    platformId(): string {
      return platformField.current ? platformField.current.getValue() : "";
    },
    channelId(): string {
      return channelField.current ? channelField.current.getValue() : "";
    },
    pfId(): string {
      return pfField.current ? pfField.current.getValue() : "";
    },
  };
}

function showServerName(node: Node, text: string): void {
  const ui = node.getComponent(UITransform);
  if (ui && ui.contentSize.width < 8) ui.setContentSize(460, 48);
  const label = node.getComponent(Label);
  if (label) label.overflow = Overflow.SHRINK;
  setText(node, text);
}

function overlayField(host: Node, placeholder: string, text: string, maxLength = 16): TextField {
  const ui = host.getComponent(UITransform);
  const width = ui ? Math.max(80, ui.contentSize.width - 28) : 420;
  const height = ui ? Math.max(36, ui.contentSize.height - 16) : 48;
  const field = createField(placeholder, width, height, { text, maxLength });
  const bg = field.node.getChildByName("bg");
  if (bg) bg.active = false;
  placeOn(host, field.node);
  return field;
}

function overlayCaption(host: Node, text: string): Node {
  const ui = host.getComponent(UITransform);
  const width = ui ? Math.max(80, ui.contentSize.width - 28) : 420;
  const label = createLabel(text, 22, { color: new Color(70, 42, 16, 255), width, align: "left" });
  placeOn(host, label);
  return label;
}

function placeOn(host: Node, child: Node): void {
  const ui = host.getComponent(UITransform);
  if (!ui) {
    child.parent = host;
    return;
  }
  const x = (0.5 - ui.anchorX) * ui.contentSize.width;
  const y = (0.5 - ui.anchorY) * ui.contentSize.height;
  child.setPosition(x, y, 0);
  child.parent = host;
}

function placeCell(content: Node, cell: Node, index: number): void {
  const ui = content.getComponent(UITransform);
  const cui = cell.getComponent(UITransform);
  const anchorY = ui ? ui.anchorY : 1;
  const anchorX = ui ? ui.anchorX : 0;
  const width = ui ? ui.contentSize.width : 362;
  const height = ui ? ui.contentSize.height : 602;
  const cw = cui ? cui.contentSize.width : 360;
  const ch = cui ? cui.contentSize.height : 80;
  const cax = cui ? cui.anchorX : 0;
  const cay = cui ? cui.anchorY : 0;
  const top = (1 - anchorY) * height;
  const left = -anchorX * width;
  cell.setPosition(left + (width - cw) * 0.5 + cax * cw, top - index * ch - (1 - cay) * ch, 0);
}
