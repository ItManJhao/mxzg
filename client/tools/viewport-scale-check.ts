/**
 * 统一比例组件检查：验证窄屏、宽屏上限、缓存重开及Widget更新顺序。
 * 只验证比例和生命周期，不模拟Creator真实Widget排版；几何效果另做浏览器复验。
 */
import assert from "node:assert/strict";
import { Node, UITransform, Widget } from "cc";
import { ViewportScale } from "../assets/scripts/framework/ui/ViewportScale";

/** 创建明确的根视口与设计内容，不使用业务名或机型清单。 */
function fixture(): { root: Node; bounds: UITransform; content: Node; adapter: ViewportScale; order: string[] } {
    const root = new Node("PageRoot");
    const bounds = root.addComponent(UITransform);
    bounds.setContentSize(640, 1280);
    const content = new Node("Content");
    content.parent = root;
    const panel = new Node("Panel");
    panel.parent = content;
    const order: string[] = [];
    content.addComponent(Widget).updateAlignment = () => order.push("Content");
    panel.addComponent(Widget).updateAlignment = () => order.push("Panel");
    const adapter = new ViewportScale();
    adapter.node = root;
    adapter.target = content;
    adapter.onLoad();
    adapter.onEnable();
    return { root, bounds, content, adapter, order };
}

const sample = fixture();
sample.bounds.setContentSize(590.4, 1280);
sample.adapter.lateUpdate();
assert.equal(sample.content.scale.x, 590.4 / 640);
assert.equal(sample.content.scale.x, sample.content.scale.y, "内容必须等比，不横向压缩人物与图标");
assert.deepEqual(sample.order, ["Content", "Panel"], "先更新父约束，再更新子约束");
sample.adapter.lateUpdate();
assert.equal(sample.order.length, 2, "尺寸未变时不每帧遍历Widget");
sample.bounds.setContentSize(820, 1280);
sample.adapter.lateUpdate();
assert.equal(sample.content.scale.x, 1, "默认宽屏不超过设计大小");
const count = sample.order.length;
sample.bounds.setContentSize(820, 960);
sample.adapter.lateUpdate();
assert.equal(sample.order.length, count + 2, "仅高度变化也刷新纵向Widget");
sample.adapter.onEnable();
sample.adapter.lateUpdate();
assert.equal(sample.order.length, count + 4, "缓存页重开重新按当前视口对齐");
sample.adapter.maxScale = 1.2;
sample.adapter.lateUpdate();
assert.equal(sample.content.scale.x, 1.2, "显式最大比例由Prefab参数控制");
sample.root.destroy();

const invalid = new ViewportScale();
invalid.node = new Node("InvalidRoot");
invalid.target = invalid.node;
assert.throws(() => invalid.onLoad(), /独立内容容器/);
invalid.node.destroy();
console.log("PASS viewport scale: shared ratio, cap, resize, reopen and Widget ordering");
