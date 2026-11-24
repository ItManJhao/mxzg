/** 使用真实配置及引擎替身检查契约任务、VIP 权益和关闭清理，无需登录或写入角色。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Label, Node, Sprite, UITransform } from "cc";
import { ApplicationRedDots } from "../assets/scripts/app/remake/ApplicationRedDots";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { VipController } from "../assets/scripts/features/vip/VipController";
import { VipModel } from "../assets/scripts/features/vip/VipModel";
import { VipBenefitCell } from "../assets/scripts/features/vip/ui/VipBenefitCell";
import { VipBenefitsView } from "../assets/scripts/features/vip/ui/VipBenefitsView";
import { VipTaskCell, type VipTaskDisplay } from "../assets/scripts/features/vip/ui/VipTaskCell";
import { VipView } from "../assets/scripts/features/vip/ui/VipView";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { RedDotFixture } from "./RedDotFixture";

/** 隔离窗口的内容节点，保留真实开关与复用事件，只拦截引擎滚动布局。 */
function scrollFixture<T>(root: Node) {
    const scroll = root.addComponent(SuperScroll);
    const content = new Node("Content");
    const list = content.addComponent(SuperContent);
    let data: readonly T[] = [];
    content.parent = root;
    scroll.content = content;
    scroll.toStart = () => {};
    list.setData = rows => { data = rows as readonly T[]; };
    return { scroll, content, data: () => data };
}

/** 用真实事件方法构造最小任务页和复用行，数据与操作走生产接口。 */
function taskFixture() {
    const root = new Node("VipPage");
    const page = root.addComponent(VipView);
    const list = scrollFixture<VipTaskDisplay>(root);
    const bindings = {
        panel: root.addComponent(UITransform),
        levelLabel: new Node().addComponent(Label),
        progressLabel: new Node().addComponent(Label),
        progressFill: new Node().addComponent(Sprite),
        statusLabel: new Node().addComponent(Label),
        portraitLabel: new Node().addComponent(Label),
        portraitSlots: Array.from({ length: 5 }, () => new Node()),
        previousPortrait: new Node().addComponent(Button),
        nextPortrait: new Node().addComponent(Button),
        benefitsButton: new Node().addComponent(Button),
        backButton: new Node().addComponent(Button),
        taskPanel: new Node(),
        tasks: list.scroll,
    };
    bindings.panel.width = 640;
    bindings.panel.height = 1100;
    Object.assign(page, bindings);
    return { page, bindings, list };
}

/** 任务卡的少量引擎引用，模拟 Prefab 完成字段恢复后的 onLoad 时点。 */
function taskCell(withReminder = true) {
    const node = new Node("TaskCell");
    const cell = new VipTaskCell();
    const reminderAnchor = withReminder ? new Node("ClaimReminderAnchor") : null;
    if (reminderAnchor) {
        reminderAnchor.parent = node;
        reminderAnchor.addComponent(UITransform).setContentSize(18, 18);
    }
    const bindings = {
        node,
        title: new Node().addComponent(Label),
        rewardFrame: new Node(),
        rewardIcon: new Node(),
        quantity: new Node().addComponent(Label),
        rewardButton: new Node().addComponent(Button),
        actionButton: new Node().addComponent(Button),
        actionText: new Node().addComponent(Label),
        status: new Node().addComponent(Label),
        reminderAnchor,
    };
    Object.assign(cell, bindings);
    Reflect.get(cell, "onLoad").call(cell);
    return { cell, bindings };
}

/** 验证真实配置的等级任务、前往与领取，以及角色快照驱动的任务格和底栏红点。 */
async function checkTasks(): Promise<void> {
    const fixture = taskFixture();
    const { page, bindings, list } = fixture;
    const { cell, bindings: taskBindings } = taskCell();
    const missing = taskCell(false);
    const restoreRedDot = RedDotFixture.stubLoad();
    const jumps: string[] = [];
    const claims: number[] = [];
    const shown: Array<{ owner: object; view: object }> = [];
    const portraits: string[] = [];
    const originalOpen = UIManager.instance.openChild;
    const originalSpine = BattleSpineService.instance.mountNamedSpine;
    const originalClaim = VipController.instance.claim;
    const originalSprite = ResManager.setSprite;
    const account = new AccountModel();
    const applicationDots = new ApplicationRedDots(account);
    UIManager.instance.openChild = async (owner, view) => {
        shown.push({ owner, view });
        return null!;
    };
    BattleSpineService.instance.mountNamedSpine = (_host, name, clip) => {
        assert.equal(clip, "stand");
        portraits.push(name);
    };
    VipController.instance.claim = id => { claims.push(id); };
    ResManager.setSprite = () => {};
    list.content.parent = page.node;
    try {
        VipModel.instance.update({ level: 0, tasks: [
            { id: 100100, target: 3, progress: 3, claimed: false },
            { id: 100200, target: 5, progress: 2, claimed: false },
            { id: 100300, target: 1, progress: 1, claimed: true },
            { id: 100400, target: 2, claimed: false },
        ] });
        page.runOpen({ openFeature: id => { jumps.push(id); return true; } });
        assert.equal(bindings.levelLabel.string, "VIP 0");
        assert.equal(bindings.taskPanel.active, true);
        assert.equal(bindings.progressFill.fillRange, 0.25);
        assert.match(bindings.progressLabel.string, /VIP 1 .*1\/4/);
        assert.match(bindings.portraitLabel.string, /妮可.*VIP 1 解锁/);
        assert.deepEqual(portraits, ["10101"]);
        bindings.nextPortrait.node.emit(Button.EventType.CLICK);
        assert.match(bindings.portraitLabel.string, /格雷.*VIP 6 解锁/);
        assert.deepEqual(portraits, ["10101", "10201"]);

        const cards = list.data();
        assert.equal(cards.length, 4);
        assert.match(cards[0].description, /通关主线3关.*3\/3/);
        assert.deepEqual(cards[0].reward, { itemId: 900002, quantity: 20 });
        assert.equal(cards[2].status, "已领取");
        assert.equal(cards[3].status, "玩法尚未接入");
        assert(!cards[3].description.includes("0/2"));
        assert.equal(cards[3].actionText, "");

        const cellNode = taskBindings.node;
        cellNode.getComponent = () => cell;
        list.content.emit(SuperContent.RENDER_ITEM, cellNode, cards[0]);
        await Promise.resolve();
        const anchor = taskBindings.reminderAnchor!;
        const dot = anchor.getChildByName("RedDot")!;
        assert.equal(dot.active, true);
        assert.equal((dot.getComponent(UITransform) as UITransform).width, 18);
        Reflect.get(cell, "onDisable").call(cell);
        assert.equal(dot.active, false, "任务格离开视口后隐藏提醒");
        Reflect.get(cell, "onEnable").call(cell);
        assert.equal(anchor.getChildByName("RedDot"), dot, "同一个任务格复用原红点实例");
        assert.equal(dot.active, true);
        taskBindings.actionButton.node.emit(Button.EventType.CLICK);
        assert.deepEqual(claims, [100100]);
        Object.assign(VipController.instance, { pending: true });
        list.content.emit(SuperContent.RENDER_ITEM, cellNode, cards[0]);
        assert.equal(taskBindings.actionButton.interactable, false);
        Object.assign(VipController.instance, { pending: false });
        list.content.emit(SuperContent.RENDER_ITEM, cellNode, cards[1]);
        taskBindings.actionButton.node.emit(Button.EventType.CLICK);
        assert.deepEqual(jumps, ["battle"]);
        assert.equal(dot.active, false);
        missing.bindings.node.getComponent = () => missing.cell;
        list.content.emit(SuperContent.RENDER_ITEM, missing.bindings.node, cards[0]);
        missing.bindings.actionButton.node.emit(Button.EventType.CLICK);
        assert.deepEqual(claims, [100100, 100100], "缺少辅助红点时仍可绑定当前领奖操作");
        bindings.benefitsButton.node.emit(Button.EventType.CLICK);
        assert.deepEqual(shown, [{ owner: page, view: VipBenefitsView }]);

        const role = { id: "vip-tier", nickname: "契约任务测试", level: 24, gold: 0, diamonds: 0 };
        account.replace({ busy: false, error: "", role });
        const unfinished = [
            { id: 100900, target: 70, progress: 69, claimed: false },
            { id: 101000, target: 25, progress: 24, claimed: false },
            { id: 101100, target: 1, progress: 0, claimed: false },
            { id: 101200, target: 3, progress: 2, claimed: false },
        ];
        VipController.instance.onNotify(Protocol.STATE_CHANGED, { revision: 1, vip: { level: 2, tasks: unfinished } });
        applicationDots.setReady(true);
        assert.equal(bindings.levelLabel.string, "VIP 2");
        assert.match(bindings.progressLabel.string, /VIP 3 .*0\/4/);
        const vipTwoCards = list.data();
        assert.deepEqual(vipTwoCards.map(card => card.destination), ["battle", "battle", "gold-dungeon", "main_summon"]);
        assert.match(vipTwoCards[2].description, /参与1次日常副本.*0\/1/);
        assert.match(vipTwoCards[3].description, /获得3个5星英雄.*2\/3/);
        for (const card of vipTwoCards.slice(2)) {
            assert.equal(card.actionText, "前 往");
            list.content.emit(SuperContent.RENDER_ITEM, cellNode, card);
            taskBindings.actionButton.node.emit(Button.EventType.CLICK);
        }
        assert.deepEqual(jumps, ["battle", "gold-dungeon", "main_summon"]);
        assert(!RedDotManager.instance.isVisible(GameRedDotKey.VIP), "全部尚未达标时底栏 VIP 不亮");

        const complete = unfinished.map(task => ({ ...task, progress: task.target }));
        account.replace({ busy: false, error: "", role: { ...role, level: 25 } });
        VipController.instance.onNotify(Protocol.STATE_CHANGED, { revision: 2, vip: { level: 2, tasks: complete } });
        applicationDots.refreshSnapshot();
        assert(RedDotManager.instance.isVisible(GameRedDotKey.VIP), "服务端同步达标后点亮底栏 VIP");
        for (const card of list.data()) {
            assert.equal(card.actionText, "领 取");
            assert.deepEqual(card.reward, { itemId: 900002, quantity: 30 });
            list.content.emit(SuperContent.RENDER_ITEM, cellNode, card);
            taskBindings.actionButton.node.emit(Button.EventType.CLICK);
        }
        assert.deepEqual(claims.slice(2), complete.map(task => task.id));
        assert.equal(dot.active, true);
        const firstClaimed = [{ ...complete[0], claimed: true }, ...complete.slice(1)];
        VipController.instance.onNotify(Protocol.STATE_CHANGED, { revision: 3, vip: { level: 2, tasks: firstClaimed } });
        applicationDots.refreshSnapshot();
        assert.equal(list.data()[0].status, "已领取");
        assert.match(bindings.progressLabel.string, /VIP 3 .*1\/4/);
        assert(RedDotManager.instance.isVisible(GameRedDotKey.VIP), "其他任务依然可领取时底栏 VIP 保持亮起");

        const nextTier = [
            { id: 101300, target: 100, claimed: false },
            { id: 101400, target: 10, claimed: false },
            { id: 101500, target: 5, claimed: false },
            { id: 101600, target: 30, claimed: false },
        ];
        VipController.instance.onNotify(Protocol.SESSION_AUTHENTICATE, {
            initial: { revision: 6, vip: { level: 3, tasks: nextTier } },
        });
        applicationDots.refreshSnapshot(true);
        assert.equal(bindings.levelLabel.string, "VIP 3");
        assert.match(bindings.progressLabel.string, /VIP 4 .*0\/4/);
        assert(list.data().every(card => !card.claimable && card.actionText === ""));
        list.content.emit(SuperContent.RENDER_ITEM, cellNode, list.data()[0]);
        assert.equal(dot.active, false, "升档后复用的任务格不保留上一档红点");
        assert(!RedDotManager.instance.isVisible(GameRedDotKey.VIP), "恢复 VIP3 后底栏不保留上一档红点");

        VipModel.instance.update({ level: 13, tasks: [] });
        EventDispatcher.instance.emit(VipModel.Updated, undefined);
        assert.equal(bindings.taskPanel.active, false);
        assert.equal(bindings.statusLabel.string, "契约已全部解锁");
        assert.match(bindings.portraitLabel.string, /出战待接入/);
        page.runDispose();
        bindings.nextPortrait.node.emit(Button.EventType.CLICK);
        assert.deepEqual(portraits, ["10101", "10201"], "切页后旧按钮不再加载预览");
        taskBindings.actionButton.node.destroy();
        Reflect.get(cell, "onDestroy").call(cell);
        assert.equal(anchor.children.length, 0, "任务格销毁后不保留红点实例");
    } finally {
        applicationDots.dispose();
        restoreRedDot();
        Reflect.get(missing.cell, "onDestroy").call(missing.cell);
        page.runDispose();
        VipModel.instance.reset();
        UIManager.instance.openChild = originalOpen;
        BattleSpineService.instance.mountNamedSpine = originalSpine;
        VipController.instance.claim = originalClaim;
        ResManager.setSprite = originalSprite;
    }
}

/** 任务卡红点位置由原预制体锚点保留，图像由公共预制体提供。 */
function checkTaskRedDotAnchor(): void {
    const rows = JSON.parse(readFileSync("client/assets/bundles/module/vip/prefabs/VipTaskCell.prefab", "utf8"));
    const owner = rows.find((row: Record<string, unknown>) => row.reminderAnchor);
    const anchor = rows[owner.reminderAnchor.__id__];
    assert.equal(anchor._name, "ClaimReminderAnchor");
    assert.equal(anchor._active, true);
    assert.deepEqual([anchor._lpos.x, anchor._lpos.y], [112, 3]);
    assert.equal(anchor._components.length, 1);
    const ui = rows[anchor._components[0].__id__];
    assert.equal(ui.__type__, "cc.UITransform");
    assert.deepEqual([ui._contentSize.width, ui._contentSize.height], [18, 18]);
}

/** 核对权益预览的文案、数值、档位翻页和窗口关闭。 */
function checkBenefits(): void {
    const root = new Node("VipBenefits");
    const popup = root.addComponent(VipBenefitsView);
    const list = scrollFixture<string>(root);
    const bindings = { panel: root.addComponent(UITransform), currentLabel: new Node().addComponent(Label),
        levelLabel: new Node().addComponent(Label), previous: new Node().addComponent(Button),
        next: new Node().addComponent(Button), closeButton: new Node().addComponent(Button), benefitList: list.scroll };
    bindings.panel.width = 540;
    bindings.panel.height = 690;
    Object.assign(popup, bindings);
    VipModel.instance.update({ level: 0, tasks: [] });
    try {
        popup.runOpen();
        assert.equal(bindings.currentLabel.string, "当前 VIP 0");
        assert.equal(bindings.levelLabel.string, "VIP 1 权益预览");
        assert(list.data().some(text => /英雄背包数量上限.*25/.test(text)));
        assert(list.data().some(text => /市场刷新次数上限.*5/.test(text)));
        assert(list.data().some(text => /战斗2倍速度.*播放待接入/.test(text)));
        bindings.next.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.levelLabel.string, "VIP 2 权益预览");
        const duration = list.data().find(text => /额外挂机时间/.test(text));
        assert.match(duration ?? "", /1小时/);
        const row = new Node("BenefitRow").addComponent(VipBenefitCell);
        const label = new Node().addComponent(Label);
        Object.assign(row, { text: label });
        list.content.emit(SuperContent.RENDER_ITEM, row.node, duration);
        assert.equal(label.string, duration);
        popup.runDispose();
        bindings.next.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.levelLabel.string, "VIP 2 权益预览");
    } finally {
        popup.runDispose();
        VipModel.instance.reset();
    }
}

/** 以同一数据包加载条件和权益，再分别验证任务和权益两条界面路径。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkTaskRedDotAnchor();
    await checkTasks();
    checkBenefits();
    console.log("VIP 界面通过任务领取、前往、VIP3 恢复与红点、权益翻页及关闭检查");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
