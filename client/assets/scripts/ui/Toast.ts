import { Color, Node } from "cc";
import { createLabel, place, uiNode } from "./UiKit";

/** Toast 占位：同一时间一张，到时销毁。 */
export class Toast {
  private current: Node | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private layer: Node) {}

  show(text: string, durationMs = 1600): void {
    console.log("[UI] toast " + text);
    this.clear();
    const node = uiNode("Toast");
    const label = createLabel(text, 24, { color: new Color(255, 236, 190, 255), width: 640 });
    label.parent = node;
    place(node, this.layer, 0, 200);
    this.current = node;
    this.timer = setTimeout(() => this.clear(), durationMs);
    const maybe = this.timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.current && this.current.isValid) this.current.destroy();
    this.current = null;
  }
}
