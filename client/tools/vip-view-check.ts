/** 使用真实配置及引擎替身检查契约任务、VIP 权益和关闭清理，无需登录或写入角色。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Label, Node, RichText, Sprite, UITransform } from "cc";
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
import { VipBenefitCell, type VipBenefitDisplay } from "../assets/scripts/features/vip/ui/VipBenefitCell";
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
        portraitUnlock: new Node().addComponent(Label),
        portraitArtwork: new Node("PortraitArtwork"),
        skillIcon: new Node("SkillIcon"),
        skillArtwork: new Node("SkillArtwork"),
        portraitSlots: Array.from({ length: 5 }, () => new Node()),
        previousPortrait: new Node().addComponent(Button),
        nextPortrait: new Node().addComponent(Button),
        benefitsButton: new Node().addComponent(Button),
        fetterPowerButton: new Node().addComponent(Button),
        privilegeHint: new Node().addComponent(Label),
        privilegeBadge: new Node("PrivilegeBadge"),
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
        title: new Node().addComponent(RichText),
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

/** 核对卡片纯文字断言，具体颜色另由原任务标签检查。 */
function plain(text: string): string {
    return text.replace(/<[^>]*>/g, "");
}

/** 验证女神预览、特权公告、等级任务、领取以及服务端快照驱动的红点。 */
async function checkTasks(): Promise<void> {
    const fixture = taskFixture();
    const { page, bindings, list } = fixture;
    const { cell, bindings: taskBindings } = taskCell();
    const missing = taskCell(false);
    const restoreRedDot = RedDotFixture.stubLoad();
    const jumps: string[] = [];
    const claims: number[] = [];
    const shown: Array<{ owner: object; view: object }> = [];
    const hints: string[] = [];
    const portraits: string[] = [];
    const artwork = new Map<Node, unknown>();
    const originalOpen = UIManager.instance.openChild;
    const originalToast = UIManager.instance.toast;
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
    UIManager.instance.toast = message => { hints.push(message); };
    ResManager.setSprite = (node, source) => {
        if (node) {
            artwork.set(node, source);
        }
    };
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
        assert.equal(bindings.progressLabel.string, "1/4");
        assert.equal(bindings.portraitUnlock.string, "VIP 1 解锁");
        assert.equal(artwork.get(bindings.portraitArtwork), "vip/ui/fetters-lang_fetter-10101");
        assert.equal(artwork.get(bindings.skillIcon), "vip/ui/fetters_skill_200010001");
        assert.equal(artwork.get(bindings.skillArtwork), "vip/ui/fetters-lang_spr-skill-10101");
        assert.equal(bindings.privilegeHint.string, "预览：解锁2倍战斗速度");
        assert.equal(bindings.privilegeBadge.active, true);
        assert.deepEqual(portraits, ["10101"]);
        bindings.nextPortrait.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.portraitUnlock.string, "VIP 6 解锁");
        assert.equal(artwork.get(bindings.portraitArtwork), "vip/ui/fetters-lang_fetter-10201");
        assert.equal(artwork.get(bindings.skillIcon), "vip/ui/fetters_skill_200020001");
        assert.equal(artwork.get(bindings.skillArtwork), "vip/ui/fetters-lang_spr-skill-10201");
        assert.deepEqual(portraits, ["10101", "10201"]);

        const cards = list.data();
        assert.equal(cards.length, 4);
        assert.match(plain(cards[0].description), /通关主线3关.*3\/3/);
        assert.match(cards[0].description, /<color=#159400>3<\/color>/);
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
        bindings.fetterPowerButton.node.emit(Button.EventType.CLICK);
        assert.deepEqual(hints, ["羁绊之力暂未开放"], "羁绊养成不冒用特权弹窗");
        assert.equal(shown.length, 1);

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
        assert.equal(bindings.progressLabel.string, "0/4");
        const vipTwoCards = list.data();
        assert.deepEqual(vipTwoCards.map(card => card.destination), ["battle", "battle", "gold-dungeon", "main_summon"]);
        assert.match(plain(vipTwoCards[2].description), /参与1次日常副本.*0\/1/);
        assert.match(plain(vipTwoCards[3].description), /获得3个5星英雄.*2\/3/);
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
        assert.equal(bindings.progressLabel.string, "1/4");
        assert(RedDotManager.instance.isVisible(GameRedDotKey.VIP), "其他任务依然可领取时底栏 VIP 保持亮起");

        const nextTier = [
            { id: 101300, target: 100, progress: 99, claimed: false },
            { id: 101400, target: 10, progress: 9, claimed: false },
            { id: 101500, target: 5, progress: 4, claimed: false },
            { id: 101600, target: 30, progress: 29, claimed: false },
        ];
        VipController.instance.onNotify(Protocol.SESSION_AUTHENTICATE, {
            initial: { revision: 6, vip: { level: 3, tasks: nextTier } },
        });
        applicationDots.refreshSnapshot(true);
        assert.equal(bindings.levelLabel.string, "VIP 3");
        assert.equal(bindings.progressLabel.string, "0/4");
        const vipThreeCards = list.data();
        assert(vipThreeCards.every(card => !card.claimable && card.actionText === "前 往"));
        assert.deepEqual(vipThreeCards.map(card => card.destination), ["battle", "main_summon", "battle", "tower"]);
        assert.match(vipThreeCards[2].description, /快速作战.*4\/5/);
        assert.match(vipThreeCards[3].description, /29\/30/);
        list.content.emit(SuperContent.RENDER_ITEM, cellNode, list.data()[0]);
        assert.equal(dot.active, false, "升档后复用的任务格不保留上一档红点");
        assert(!RedDotManager.instance.isVisible(GameRedDotKey.VIP), "恢复 VIP3 后底栏不保留上一档红点");

        const vipFourReady = nextTier.map(task => ({ ...task, progress: task.target }));
        VipController.instance.onNotify(Protocol.STATE_CHANGED, { revision: 7, vip: { level: 3, tasks: vipFourReady } });
        applicationDots.refreshSnapshot();
        assert(RedDotManager.instance.isVisible(GameRedDotKey.VIP));
        assert(list.data().every(card => card.claimable && card.reward.itemId === 900002 && card.reward.quantity === 40));
        list.content.emit(SuperContent.RENDER_ITEM, cellNode, list.data()[3]);
        taskBindings.actionButton.node.emit(Button.EventType.CLICK);
        assert.equal(claims.at(-1), 101600);

        VipController.instance.onNotify(Protocol.STATE_CHANGED, {
            revision: 8, vip: { level: 4, tasks: [{ id: 101700, target: 110, claimed: false }] },
        });
        applicationDots.refreshSnapshot();
        assert.equal(bindings.levelLabel.string, "VIP 4");
        assert(!RedDotManager.instance.isVisible(GameRedDotKey.VIP));

        VipModel.instance.update({ level: 13, tasks: [] });
        EventDispatcher.instance.emit(VipModel.Updated, undefined);
        assert.equal(bindings.taskPanel.active, false);
        assert.equal(bindings.statusLabel.string, "契约已全部解锁");
        assert.equal(bindings.portraitUnlock.string, "VIP 6 已解锁");
        assert.equal(bindings.privilegeBadge.active, false);
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
        UIManager.instance.toast = originalToast;
        BattleSpineService.instance.mountNamedSpine = originalSpine;
        VipController.instance.claim = originalClaim;
        ResManager.setSprite = originalSprite;
    }
}

/** 任务卡红点对齐正式服的领取按钮右上角，图像仍由公共预制体提供。 */
function checkTaskRedDotAnchor(): void {
    const rows = JSON.parse(readFileSync("client/assets/bundles/module/vip/prefabs/VipTaskCell.prefab", "utf8"));
    const owner = rows.find((row: Record<string, unknown>) => row.reminderAnchor);
    const anchor = rows[owner.reminderAnchor.__id__];
    assert.equal(anchor._name, "ClaimReminderAnchor");
    assert.equal(anchor._active, true);
    assert.deepEqual([anchor._lpos.x, anchor._lpos.y], [120, 10]);
    assert.equal(anchor._components.length, 1);
    const ui = rows[anchor._components[0].__id__];
    assert.equal(ui.__type__, "cc.UITransform");
    assert.deepEqual([ui._contentSize.width, ui._contentSize.height], [26, 26]);
}

/** 核对默认预览下一档、原高亮与分隔线、滑入边界、满级和关闭清理。 */
function checkBenefits(): void {
    const root = new Node("VipBenefits");
    const popup = root.addComponent(VipBenefitsView);
    const panel = new Node("Panel");
    panel.parent = root;
    const scroll = new Node("Scroll");
    scroll.parent = panel;
    scroll.addComponent(UITransform).setContentSize(478, 534);
    const list = scrollFixture<VipBenefitDisplay>(scroll);
    const bindings = { panel: panel.addComponent(UITransform), currentLabel: new Node().addComponent(Label),
        levelLabel: new Node().addComponent(Label), previous: new Node().addComponent(Button),
        next: new Node().addComponent(Button), benefitList: list.scroll };
    bindings.panel.setContentSize(640, 840);
    Object.assign(popup, bindings);
    VipModel.instance.update({ level: 0, tasks: [] });
    try {
        popup.runOpen();
        assert.equal(bindings.currentLabel.string, "下一级");
        assert.equal(bindings.levelLabel.string, "VIP1");
        assert.equal(bindings.previous.node.active, false);
        assert.equal(bindings.next.node.active, true);
        assert.deepEqual(list.data().map(row => plain(row.text)), [
            "解锁羁绊女神机械纪元·妮可", "战斗2倍速度解锁", "市场刷新次数上限 +5", "英雄背包数量上限 +25",
        ]);
        assert.deepEqual(list.data().map(row => row.groupSeparator), [false, true, false, false]);
        assert.match(list.data()[2].text, /<color=#0d9963> \+5<\/color>/);
        const row = new Node("BenefitRow").addComponent(VipBenefitCell);
        const text = new Node().addComponent(RichText);
        const groupSeparator = new Node("GroupSeparator");
        Object.assign(row, { text, groupSeparator });
        list.content.emit(SuperContent.RENDER_ITEM, row.node, list.data()[1]);
        assert.equal(groupSeparator.active, true);
        assert.equal(text.string, "<color=#0d9963>战斗2倍速度解锁</color>");

        bindings.next.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.levelLabel.string, "VIP2");
        assert.equal(scroll.position.x, -478);
        bindings.next.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.levelLabel.string, "VIP2", "过渡期间连续点击不会跳档");
        popup.update(0.5);
        assert.equal(scroll.position.x, 0);
        const duration = list.data().find(item => /额外挂机时间/.test(item.text));
        assert.match(duration?.text ?? "", /1小时/);
        list.content.emit(SuperContent.RENDER_ITEM, row.node, duration);
        assert.equal(text.string, duration?.text);
        assert.equal(groupSeparator.active, false, "复用到数值行时清掉旧分隔线");
        bindings.previous.node.emit(Button.EventType.CLICK);
        assert.equal(scroll.position.x, 478);
        popup.runClose();
        bindings.next.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.levelLabel.string, "VIP1", "关窗后原按钮不再操作页面");
        VipModel.instance.update({ level: 13, tasks: [] });
        popup.runOpen();
        assert.equal(scroll.position.x, 0);
        assert.equal(bindings.currentLabel.string, "已满级");
        assert.equal(bindings.levelLabel.string, "VIP13");
        assert.equal(bindings.next.node.active, false);
        bindings.previous.node.emit(Button.EventType.CLICK);
        assert.equal(bindings.levelLabel.string, "VIP12");
        assert.equal(bindings.currentLabel.string, "已满级");
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
    console.log("VIP 界面通过任务领取、前往、VIP4 恢复与红点、权益翻页及关闭检查");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
