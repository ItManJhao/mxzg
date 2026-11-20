/**
 * 检查红点管理器的父子汇总、批次交付、分支回收及角色重置。
 * 直接使用生产事件派发器，不依赖 Creator 或服务器。
 */
import { strict as assert } from "node:assert";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";

const manager = RedDotManager.instance;

/** 模拟页面绑定已有红点状态，记录后续更新次数和顺序。 */
function observe(path: string): { updates: boolean[]; stop: () => void } {
    const updates: boolean[] = [];
    const stop = manager.watch(path, visible => updates.push(visible));
    return { updates, stop };
}

/** 同一父级下的多个叶子互不覆盖，关闭最后一个才熄灭。 */
function checkAggregation(): void {
    const hero = observe("hero");
    const equipment = observe("hero.one.equipment");
    const weapon = observe("hero.one.equipment.weapon");
    const bag = observe("bag");
    manager.setMany({ "hero.one.equipment.weapon": true, "hero.two.upgrade": true });
    manager.set("hero.one.equipment.weapon", true);
    assert.deepEqual(hero.updates, [false, true]);
    assert.deepEqual(equipment.updates, [false, true]);
    assert.deepEqual(weapon.updates, [false, true]);
    assert.deepEqual(bag.updates, [false]);

    manager.setMany({ "hero.one.equipment.weapon": false, "hero.one.equipment.armor": true });
    assert.deepEqual(equipment.updates, [false, true]);
    assert.deepEqual(weapon.updates, [false, true, false]);
    manager.set("hero.one.equipment.armor", false);
    assert.equal(manager.isVisible("hero"), true);
    manager.set("hero.two.upgrade", false);
    assert.deepEqual(hero.updates, [false, true, false]);
    assert.deepEqual(equipment.updates, [false, true, false]);

    for (const binding of [hero, equipment, weapon, bag]) {
        binding.stop();
    }
}

/** 整批替换时回收已离开名册的实例，保留其他分支和正确的父级状态。 */
function checkReplacement(): void {
    const hero = observe("hero");
    const removed = observe("hero.removed.upgrade");
    manager.set("bag.compose", true);
    manager.replaceBranch("hero", { "hero.removed.upgrade": true });
    manager.replaceBranch("hero", { "hero.added.equipment.1": true });
    assert.deepEqual(hero.updates, [false, true]);
    assert.deepEqual(removed.updates, [false, true, false]);
    assert.equal(manager.isVisible("hero.added.equipment"), true);
    assert.equal(manager.isVisible("bag"), true);
    assert.throws(() => manager.replaceBranch("hero", { "hero.added.equipment.1": false, "bag.compose": false }));
    assert.equal(manager.isVisible("hero.added"), true);
    assert.equal(manager.isVisible("bag"), true);
    manager.replaceBranch("hero", {});
    assert.deepEqual(hero.updates, [false, true, false]);
    assert.equal(manager.isVisible("bag.compose"), true);
    hero.stop();
    removed.stop();
    manager.reset();
}

/** 与资产事件同批合并，已解绑的页面不收到队列中的更新。 */
function checkLifecycle(): void {
    const oldPage = observe("battle");
    EventDispatcher.batchNotifications(() => {
        manager.set("battle.reward.clear", true);
        oldPage.stop();
        oldPage.stop();
    });
    assert.deepEqual(oldPage.updates, [false]);
    const newPage = observe("battle");
    assert.deepEqual(newPage.updates, [true]);

    EventDispatcher.batchNotifications(() => {
        manager.reset();
        assert.equal(manager.isVisible("battle"), false);
        manager.set("battle.reward.milestone", true);
        assert.deepEqual(newPage.updates, [true]);
    });
    assert.equal(manager.isVisible("battle.reward.clear"), false);
    assert.equal(manager.isVisible("battle.reward.milestone"), true);
    assert.deepEqual(newPage.updates, [true]);

    manager.reset();
    manager.reset();
    assert.deepEqual(newPage.updates, [true, false]);
    newPage.stop();
}

checkAggregation();
checkReplacement();
checkLifecycle();
console.log("red-dot passed: ancestor aggregation, atomic branch replacement, subscriptions and character reset");
