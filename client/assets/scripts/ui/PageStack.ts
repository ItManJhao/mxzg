import { StackView } from "./StackView";

/** 一层页面栈：打开时藏起上一页，关闭时销毁当前页并露出上一页。 */
export class PageStack {
  private items: { name: string; view: StackView }[] = [];

  get depth(): number {
    return this.items.length;
  }

  get current(): string | null {
    if (this.items.length === 0) return null;
    return this.items[this.items.length - 1].name;
  }

  open(name: string, view: StackView): void {
    const prev = this.items[this.items.length - 1];
    if (prev) prev.view.setVisible(false);
    view.setVisible(true);
    this.items.push({ name, view });
  }

  close(): string | null {
    const top = this.items.pop();
    if (!top) return null;
    top.view.dispose();
    const prev = this.items[this.items.length - 1];
    if (prev) prev.view.setVisible(true);
    return top.name;
  }
}
