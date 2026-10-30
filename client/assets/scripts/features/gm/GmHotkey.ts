import { input, Input, KeyCode, Node } from "cc";
import { GameLog } from "../../core/GameLog";
import { messageOf } from "../../core/errors";
import { gmDebugEnabled } from "../../net/transportSelect";
import { gmDebugPanel } from "./GmDebugPanel";

const keyTarget = {};
let installed = false;

function onGmKey(event: { keyCode: number }): void {
  if (event.keyCode !== KeyCode.F9 && event.keyCode !== KeyCode.BACKQUOTE) return;
  gmDebugPanel.toggle();
}

/** F9 / ` 开关面板。?gm=1 时进城就打开。挂机空地长按走 openGmDebug。 */
export function installGmHotkey(popupLayer: Node, toast: (text: string) => void): void {
  gmDebugPanel.bind(popupLayer, toast);
  if (!installed) {
    installed = true;
    try {
      input.on(Input.EventType.KEY_DOWN, onGmKey, keyTarget);
      GameLog.shared.info("GM", "F9 或反引号打开 GM。地址 ?gm=1 会直接打开。不改挂机页上的按钮");
    } catch (err) {
      installed = false;
      GameLog.shared.warn("GM", "快捷键没挂上 " + messageOf(err) + "。仍可用 ?gm=1 和挂机空地长按");
    }
  }
  if (gmDebugEnabled()) openGmDebug();
}

export function uninstallGmHotkey(): void {
  if (!installed) return;
  installed = false;
  input.off(Input.EventType.KEY_DOWN, onGmKey, keyTarget);
  gmDebugPanel.close();
}

export function openGmDebug(): void {
  gmDebugPanel.open();
}
