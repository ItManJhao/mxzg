/** 好友支援关窗回归。Creator 可能先销毁嵌套按钮，再销毁持有按钮引用的列表卡。 */
import { strict as assert } from "node:assert";
import { Button, Node } from "cc";
import { DreamlandSupportCell } from "../assets/scripts/features/dreamland/ui/DreamlandSupportCell";

class ClosingSupportCell extends DreamlandSupportCell {
    /** 模拟关窗，按钮可仍在树中，也可已由 Creator 清除节点引用。 */
    public closeWithButton(button: Button | { node: null }): void {
        Object.assign(this, { actionButton: button });
        this.onDestroy();
    }
}

const closing = new ClosingSupportCell();
assert.doesNotThrow(() => closing.closeWithButton({ node: null }));

const buttonNode = new Node("SupportButton");
const button = buttonNode.addComponent(Button);
let removed = false;
buttonNode.off = (event, _callback, context) => {
    assert.equal(event, Button.EventType.CLICK);
    assert.equal(context, closing);
    removed = true;
};
closing.closeWithButton(button);
assert(removed, "仍存活的选择按钮需要解绑");
console.log("PASS 好友支援卡片按两种销毁顺序清理按钮");
