import { StackView } from "./StackView";

/** 弹窗队列占位：同时只显示一张，关掉后自动出下一张。 */
export class PopupQueue {
  private waiting: { name: string; view: StackView }[] = [];
  private current: { name: string; view: StackView } | null = null;

  get currentName(): string | null {
    return this.current ? this.current.name : null;
  }

  get pending(): number {
    return this.waiting.length;
  }

  enqueue(name: string, view: StackView): void {
    if (!this.current) {
      this.current = { name, view };
      view.setVisible(true);
      return;
    }
    view.setVisible(false);
    this.waiting.push({ name, view });
  }

  closeCurrent(): string | null {
    if (!this.current) return null;
    const name = this.current.name;
    this.current.view.dispose();
    const next = this.waiting.shift() ?? null;
    this.current = next;
    if (this.current) this.current.view.setVisible(true);
    return name;
  }
}
