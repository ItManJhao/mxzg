import { BlockInputEvents, Button, Color, Node, UITransform } from "cc";
import {
  bindClick,
  CREATE_ROLE_PREFAB_PATH,
  loadPrefab,
  readEditBox,
  requireNode,
  setInteractable,
  spawnPrefab,
  writeEditBox,
} from "./prefabLoad";
import { createButton, createField, createLabel, createRect, place, setText, TextField, uiNode } from "./UiKit";

export interface CreateRolePanelView {
  root: Node;
  setStatus(text: string): void;
  setBusy(busy: boolean): void;
  /** 原始输入，不去空白。全空格仍交给 Proto.roleCreate。 */
  name(): string;
}

export interface CreateRolePanelOptions {
  account: string;
  serverName: string;
  /** 该账号在 Mock 里已经有角色。确认后会换成新名字，并重置主线。 */
  hadRole: boolean;
  /** 有这段时盖过 Mock 的提示。WS 创角用来说明只发 1002。 */
  hint?: string;
}

/**
 * 创角面板。确认由调用方走 Proto.roleCreate，再 Proto.roleEnter。
 * USE_CREATE_ROLE_PREFAB 为 false，或 Prefab 加载失败时，Boot 仍调用这里。
 */
export function buildCreateRolePanel(
  parent: Node,
  handlers: { onConfirm: () => void; onBack: () => void },
  options: CreateRolePanelOptions
): CreateRolePanelView {
  const root = uiNode("CreateRolePanel");
  const rootUi = root.addComponent(UITransform);
  rootUi.setContentSize(2000, 2000);
  root.addComponent(BlockInputEvents);
  root.parent = parent;

  const card = createRect("card", 560, 520, new Color(16, 28, 52, 245));
  place(card, root, 0, 20);

  place(createLabel("创角", 48, { color: new Color(255, 228, 170, 255), width: 500 }), root, 0, 200);
  const hint = options.hint
    ? options.hint
    : options.hadRole
      ? "已有角色。确认后换成新名字，主线回到第 1 关"
      : "这个账号还没有角色";
  place(createLabel(hint, 20, { color: new Color(180, 196, 220, 255), width: 500 }), root, 0, 140);
  place(
    createLabel(options.serverName + " · " + options.account, 22, { color: new Color(240, 240, 240, 255), width: 500 }),
    root,
    0,
    96
  );

  place(createLabel("角色名", 20, { color: new Color(180, 196, 220, 255), width: 460 }), root, 0, 40);
  const nameField = createField("请输入角色名", 460, 52, { maxLength: 12 });
  place(nameField.node, root, 0, -8);

  const status = createLabel("填写名字后确认", 20, { color: new Color(240, 240, 240, 255), width: 500 });
  place(status, root, 0, -70);

  const confirmNode = createButton("确认创角", handlers.onConfirm, 280, 56);
  place(confirmNode, root, 0, -140);
  const backNode = createButton("返回", handlers.onBack, 280, 52, new Color(62, 78, 104, 255));
  place(backNode, root, 0, -210);

  const confirm = confirmNode.getComponent(Button);
  const back = backNode.getComponent(Button);

  return {
    root,
    setStatus(text: string) {
      setText(status, text);
    },
    setBusy(busy: boolean) {
      if (confirm) confirm.interactable = !busy;
      if (back) back.interactable = !busy;
    },
    name(): string {
      return readField(nameField);
    },
  };
}

function readField(field: TextField): string {
  return field.getValue();
}

/**
 * 绑定 CreateRolePanel.prefab。节点：Mask,Bg,Card/{CardBg,Title,Hint,Meta,NameLabel,NameField,Status,BtnConfirm,BtnBack}。
 * 路径相对 assets：prefabs/ui/login/CreateRolePanel。不走 resources.load。
 */
export async function mountCreateRolePrefab(
  parent: Node,
  handlers: { onConfirm: () => void; onBack: () => void },
  options: CreateRolePanelOptions
): Promise<CreateRolePanelView> {
  const prefab = await loadPrefab(CREATE_ROLE_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return bindCreateRolePrefab(root, handlers, options);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

function bindCreateRolePrefab(
  root: Node,
  handlers: { onConfirm: () => void; onBack: () => void },
  options: CreateRolePanelOptions
): CreateRolePanelView {
  const hint = options.hint
    ? options.hint
    : options.hadRole
      ? "已有角色。确认后换成新名字，主线回到第 1 关"
      : "这个账号还没有角色";
  setText(requireNode(root, "Card/Hint"), hint);
  setText(requireNode(root, "Card/Meta"), options.serverName + " · " + options.account);
  const nameField = requireNode(root, "Card/NameField");
  writeEditBox(nameField, "");
  const status = requireNode(root, "Card/Status");
  setText(status, "填写名字后确认");

  const confirmNode = requireNode(root, "Card/BtnConfirm");
  const backNode = requireNode(root, "Card/BtnBack");
  bindClick(confirmNode, handlers.onConfirm);
  bindClick(backNode, handlers.onBack);

  return {
    root,
    setStatus(text: string) {
      setText(status, text);
    },
    setBusy(busy: boolean) {
      setInteractable(confirmNode, !busy);
      setInteractable(backNode, !busy);
    },
    name(): string {
      return readEditBox(nameField);
    },
  };
}
