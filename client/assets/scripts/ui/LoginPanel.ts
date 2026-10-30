import { Color, Label, Node, Overflow, UITransform } from "cc";
import { GameServer, MOCK_SERVERS } from "../core/servers";
import {
  bindClick,
  loadPrefab,
  LOGIN_PREFAB_PATH,
  readEditBox,
  requireNode,
  setInteractable,
  spawnPrefab,
  tintSprite,
  writeEditBox,
} from "./prefabLoad";
import { setText } from "./UiKit";

export interface LoginHandlers {
  onEnter: () => void;
  onCreate: () => void;
  onMock?: () => void;
  /** Mock 登录页上的「连本机服」。Prefab 没有这颗钮，代码 UI 和 P1 壳才放。 */
  onLive?: () => void;
}

export interface LoginPanelView {
  root: Node;
  setStatus(text: string): void;
  setDetail(text: string): void;
  setBusy(busy: boolean): void;
  account(): string;
  password(): string;
  serverId(): number;
  /** P1 平台ID。代码登录面板没有这一栏，返回空串。 */
  platformId(): string;
  /** P1 CHANNEL_ID。空串表示仍用 mxzg-web-1001。 */
  channelId(): string;
  /** P1 PF_ID。空串表示仍用 localdev。 */
  pfId(): string;
}

export interface LoginPanelOptions {
  account?: string;
  serverId?: number;
  /** 登录只列本机桥。 */
  mode?: "mock" | "ws";
  wsUrl?: string;
}

/** 登录只显示本机桥。 */
function loginServers(_ws: boolean): GameServer[] {
  return [{ id: 1, name: "本机桥" }];
}

function pickedServer(_ws: boolean, _serverId?: number): GameServer {
  return { id: 1, name: "本机桥" };
}

const PREFAB_SELECTED = new Color(255, 214, 150, 255);
const PREFAB_IDLE = new Color(255, 255, 255, 255);

/**
 * 绑定 LoginPanel.prefab。节点名对齐 Prefab，对外仍是 LoginPanelView。
 * 路径相对 assets：prefabs/ui/legacy-login/LoginPanel。不走 resources.load。
 */
export async function mountLoginPrefab(
  parent: Node,
  handlers: LoginHandlers,
  options?: LoginPanelOptions
): Promise<LoginPanelView> {
  const prefab = await loadPrefab(LOGIN_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return bindLoginPrefab(root, handlers, options);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

/** 标题格子只有 60 高。48 号会顶出盒子，收成大约 0.55 倍高度。 */
function fitCardTitle(root: Node): void {
  const title = requireNode(root, "Card/Title");
  const label = title.getComponent(Label);
  const ui = title.getComponent(UITransform);
  if (!label || !ui) return;
  const height = ui.contentSize.height;
  if (!(height > 8) || !(label.fontSize > height * 0.7)) return;
  const font = Math.max(12, Math.floor(height * 0.55));
  label.fontSize = font;
  label.lineHeight = font + 4;
  label.overflow = Overflow.SHRINK;
}

function bindLoginPrefab(
  root: Node,
  handlers: LoginHandlers,
  options?: LoginPanelOptions
): LoginPanelView {
  const subtitle = "本机 WebSocket " + (options?.wsUrl || "");
  fitCardTitle(root);
  setText(requireNode(root, "Card/Subtitle"), subtitle);

  const accountField = requireNode(root, "Card/AccountField");
  const passwordField = requireNode(root, "Card/PasswordField");
  writeEditBox(accountField, options?.account ?? "");

  const picked = requireNode(root, "Card/Picked");
  const status = requireNode(root, "Card/Status");
  const detail = requireNode(root, "Card/Detail");
  setText(status, "");
  setText(detail, "");

  const choices = loginServers(true);
  let selected = pickedServer(true, options?.serverId);
  const buttons: Array<{ server: GameServer; node: Node }> = [];
  for (let i = 0; i < MOCK_SERVERS.length; i++) {
    const slot = MOCK_SERVERS[i];
    const node = requireNode(root, "Card/ServerRow/Btn_" + slot.id);
    let server: GameServer | null = null;
    for (let j = 0; j < choices.length; j++) {
      if (choices[j].id === slot.id) server = choices[j];
    }
    if (!server) {
      node.active = false;
      continue;
    }
    node.active = true;
    const label = node.getChildByName("Label");
    if (label) setText(label, server.name);
    bindClick(node, () => {
      selected = server;
      paintServers();
      setText(picked, "已选 " + server.name);
    });
    buttons.push({ server, node });
  }

  function paintServers(): void {
    for (let i = 0; i < buttons.length; i++) {
      const row = buttons[i];
      tintSprite(row.node, row.server.id === selected.id ? PREFAB_SELECTED : PREFAB_IDLE);
    }
  }
  paintServers();
  setText(picked, "已选 " + selected.name);

  const enterNode = requireNode(root, "Card/BtnEnter");
  const createNode = requireNode(root, "Card/BtnCreate");
  const mockNode = requireNode(root, "Card/BtnMock");
  bindClick(enterNode, handlers.onEnter);
  bindClick(createNode, handlers.onCreate);
  mockNode.active = false;

  return {
    root,
    setStatus(text: string) {
      setText(status, text);
    },
    setDetail(text: string) {
      setText(detail, text);
    },
    setBusy(busy: boolean) {
      setInteractable(enterNode, !busy);
      setInteractable(createNode, !busy);
      setInteractable(mockNode, !busy);
    },
    account(): string {
      return readEditBox(accountField);
    },
    password(): string {
      return readEditBox(passwordField);
    },
    serverId(): number {
      return selected.id;
    },
    platformId(): string {
      return "";
    },
    channelId(): string {
      return "";
    },
    pfId(): string {
      return "";
    },
  };
}
