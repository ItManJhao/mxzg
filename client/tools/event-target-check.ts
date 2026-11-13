/** 验证目标事件去重、批次解除及界面异常清理，不访问网络或玩家数据库。 */
import { strict as assert } from "node:assert";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
declare module "../assets/scripts/framework/EventDispatcher" {
    interface EventPayloads { "check.target": number; }
}
const bus = EventDispatcher.instance;
const owner = { count: 0, update(value: number) { this.count += value; } };
const other = { count: 0, update: owner.update };
bus.on("check.target", owner, owner.update);
bus.on("check.target", owner, owner.update);
bus.on("check.target", other, other.update);
assert.equal(bus.targetListenerCount(owner), 1);
bus.emit("check.target", 2);
assert.equal(owner.count, 2);
assert.equal(other.count, 2);
bus.offTarget(owner);
bus.emit("check.target", 3);
assert.equal(owner.count, 2);
assert.equal(other.count, 5);
bus.off("check.target", other, other.update);
let onceCalls = 0;
const once = () => { onceCalls++; bus.emit("check.target", 1); };
bus.once("check.target", owner, once);
bus.emit("check.target", 1);
assert.equal(onceCalls, 1);
assert.equal(bus.targetListenerCount(owner), 0);
bus.on("check.target", owner, owner.update);
EventDispatcher.batchNotifications(() => { bus.emit("check.target", 7); bus.offTarget(owner); });
assert.equal(owner.count, 2);
bus.on("check.target", other, () => bus.offTarget(owner));
bus.on("check.target", owner, owner.update);
bus.emit("check.target", 8);
assert.equal(owner.count, 2);
bus.offTarget(other);
assert.equal(bus.listenerCount("check.target"), 0);
class TargetView extends BaseView {
    calls = 0;
    /** 打开时直接登记目标监听，由 BaseView 负责关闭清理。 */
    onOpen(): void { bus.on("check.target", this, this.update); }
    /** 记录交付次数，检查回调的 this 绑定。 */
    update(): void { this.calls++; }
}
const view = new TargetView();
for (let i = 0; i < 3; i++) {
    view.runOpen();
    view.runOpen();
    assert.equal(bus.targetListenerCount(view), 1);
    bus.emit("check.target", 1);
    view.runClose();
    assert.equal(bus.targetListenerCount(view), 0);
}
assert.equal(view.calls, 3);
view.runOpen(); view.onDestroy();
assert.equal(bus.targetListenerCount(view), 0);
class BrokenBind extends TargetView {
    /** 模拟绑定中途失败，验证打开失败也不会遗留目标监听。 */
    onBind(): void { bus.on("check.target", this, this.update); throw new Error("bind failed"); }
}
const broken = new BrokenBind();
assert.throws(() => broken.runOpen(), /bind failed/);
assert.equal(bus.targetListenerCount(broken), 0);
class BrokenClose extends TargetView {
    disposed = false;
    /** 模拟关闭业务抛错，框架仍必须执行销毁和解除监听。 */
    onClose(): void { throw new Error("close failed"); }
    /** 记录 dispose 钩子是否在关闭异常后仍被执行。 */
    dispose(): void { this.disposed = true; }
}
const brokenClose = new BrokenClose(); brokenClose.runOpen();
assert.throws(() => brokenClose.runDispose(), /close failed/);
assert.equal(brokenClose.disposed, true);
assert.equal(bus.targetListenerCount(brokenClose), 0);
console.log("event-target passed: binding, deduplication, isolation, once reentrancy and removal during delivery");
