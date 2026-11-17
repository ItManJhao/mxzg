/**
 * 通用奖励应用装配专项：以可控UI能力检查归属、历史物品投影、实际展示通知和失败重试。
 * 复用真实反馈控制器、Model与协议；不连接玩家服，不把窗口替身当实际画面验收。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameLog } from "../assets/scripts/core/GameLog";
import { RewardBinding } from "../assets/scripts/app/remake/RewardBinding";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import type { RoleProfile } from "../assets/scripts/features/account/AccountModel";
import { ConfirmView } from "../assets/scripts/features/common/ui/ConfirmView";
import type { ConfirmArgs } from "../assets/scripts/features/common/ui/ConfirmView";
import { RewardView } from "../assets/scripts/features/reward/ui/RewardView";
import { RoleUpgradeView } from "../assets/scripts/features/reward/ui/RoleUpgradeView";
import { HeroRewardView } from "../assets/scripts/features/reward/ui/HeroRewardView";
import type { HeroRewardArgs } from "../assets/scripts/features/reward/ui/HeroRewardView";
import type { RewardArgs } from "../assets/scripts/features/reward/data/RewardData";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 正常检查不镜像预期失败日志；断言仍以进程失败交付。 */
GameLog.shared.mirrorConsole = false;

/** 可控窗口记录；真实onClosed与确认回调仍由RewardBinding提供。 */
interface TestWindow {
    /** 被测试装配请求打开的真实页面类，用于识别奖励与确认。 */
    readonly ctor: typeof RewardView | typeof RoleUpgradeView | typeof HeroRewardView | typeof ConfirmView;
    /** 调用方提供的不可变展示参数，不复制成另一套业务规则。 */
    readonly args: RewardArgs | HeroRewardArgs | ConfirmArgs;
    /** 本次真实窗口替身，只用于按实例关闭。 */
    readonly view: object;
    /** 尚未完成打开时由测试显式拒绝，模拟资源失败或取消。 */
    reject: ((error: unknown) => void) | null;
    /** 尚未完成打开时由测试显式完成，区分已入队、准备中与实际显示。 */
    resolve: ((view: object) => void) | null;
}

class BindingFixture {
    /** 当前账号状态；测试只改变身份，不从奖励修改余额。 */
    public readonly account = new AccountModel();
    /** 实际请求打开的奖励批次，含失败批次，便于判断是否重放或丢失。 */
    public readonly rewards: TestWindow[] = [];
    /** 实际请求打开的通用确认，取消后原反馈必须保留。 */
    public readonly confirms: TestWindow[] = [];
    /** 只记录装配在窗口真正打开后交付的回执编号，不从开窗请求推导已展示。 */
    public readonly presented: string[] = [];
    /** 通用TIPS模式产生的全局反馈，仅记录真实装配调用，不替代角色状态。 */
    public readonly toasts: string[] = [];
    /** 尚未关闭的窗口；准备中的窗口也保留，取消必须使其Promise拒绝。 */
    private readonly active = new Set<TestWindow>();
    /** 接下来一次奖励准备失败；同时触发onClosed，验证销毁不会伪装成成功。 */
    public failReward = false;
    /** 接下来一次奖励准备停住，供换号或销毁后再拒绝。 */
    public deferReward = false;
    /** 接下来一次重试确认准备失败，不应递归再弹同一确认。 */
    public failConfirm = false;
    /** 接下来一次重试确认准备停住，供重置取消在途窗口。 */
    public deferConfirm = false;
    /** 其他业务已有确认，奖励重试不能替换其操作意图。 */
    public otherConfirm = false;
    /** 其他窗口尚在准备时不抢占唯一确认入口。 */
    public otherOpening = 0;
    /** 测试是否误关闭其他业务的确认。 */
    public otherConfirmCloses = 0;
    /** 装配前保存真实UI能力，结束时恢复，避免影响其他专项。 */
    private readonly original = {
        open: UIManager.instance.open,
        close: UIManager.instance.close,
        closeById: UIManager.instance.closeById,
        isOpen: UIManager.instance.isOpen,
        snapshot: UIManager.instance.snapshot,
        toast: UIManager.instance.toast,
    };
    /** 应用真实奖励装配，使用受控UI但不替换反馈去重和队列。 */
    public readonly binding: RewardBinding;

    /** 安装本例UI能力并建立已认证角色；需要时观察实际展示，默认保留旧单参数装配。 */
    public constructor(observePresented = false) {
        this.changeOwner("isolated-role");
        const ui = UIManager.instance;
        ui.open = ((ctor: TestWindow["ctor"], args: TestWindow["args"]) => {
            const row: TestWindow = { ctor, args, view: {}, reject: null, resolve: null };
            const reward = ctor === RewardView || ctor === RoleUpgradeView || ctor === HeroRewardView;
            assert(reward || ctor === ConfirmView);
            (reward ? this.rewards : this.confirms).push(row);
            this.active.add(row);
            if (reward ? this.failReward : this.failConfirm) {
                if (reward) {
                    this.failReward = false;
                    (args as RewardArgs | HeroRewardArgs).onClosed?.();
                } else {
                    this.failConfirm = false;
                }
                this.active.delete(row);
                return Promise.reject(new Error(reward ? "测试奖励资源不可用" : "测试确认资源不可用"));
            }
            if (reward ? this.deferReward : this.deferConfirm) {
                this.deferReward = this.deferConfirm = false;
                return new Promise<object>((resolve, reject) => {
                    row.resolve = resolve;
                    row.reject = reject;
                });
            }
            return Promise.resolve(row.view);
        }) as typeof ui.open;
        ui.toast = ((message: string) => { this.toasts.push(message); }) as typeof ui.toast;
        ui.isOpen = ((target: unknown) => target === "confirm" && (this.otherConfirm
            || Array.from(this.active).some(row => row.ctor === ConfirmView && !row.reject))) as typeof ui.isOpen;
        ui.snapshot = () => ({ opening: this.otherOpening + Array.from(this.active).filter(row => !!row.reject).length });
        ui.close = ((view: object) => {
            const row = Array.from(this.active).find(window => window.view === view);
            if (!row) {
                return false;
            }
            this.close(row);
            return true;
        }) as typeof ui.close;
        ui.closeById = ((id: string) => {
            if (id === "confirm" && this.otherConfirm) {
                this.otherConfirm = false;
                this.otherConfirmCloses++;
            }
            const rows = Array.from(this.active).filter(row => (row.ctor === RewardView ? "reward"
                : row.ctor === RoleUpgradeView ? "role-upgrade" : row.ctor === HeroRewardView ? "hero-reward" : "confirm") === id);
            rows.forEach(row => this.close(row));
            return rows.length > 0;
        }) as typeof ui.closeById;
        this.binding = observePresented
            ? new RewardBinding(this.account, receiptId => this.presented.push(receiptId))
            : new RewardBinding(this.account);
    }

    /** 提供独立身份，余额在整个反馈流程保持不变。 */
    public changeOwner(id: string, busy = false): void {
        const role: RoleProfile = { id, nickname: "测试角色", level: 1, gold: 17, diamonds: 3, serverId: "local-test" };
        this.account.replace({ busy, role, error: "" });
    }

    /** 通知与历史恢复使用同一原回执编号；fixture不会生成或提交资产变化。 */
    public notice(index = 1, roleId = this.account.snapshot.role!.id): RewardNotice {
        return { schemaVersion: 1, receiptId: "12345678-1234-4234-8234-" + String(index).padStart(12, "0"),
            roleId, assetRevision: 7, mode: "POPUP", items: [{ itemId: 900001, credited: 2 }] };
    }

    /** 真升级与普通奖励共用原回执；默认空物品专门核对只有升级时的队列及窗口。 */
    public upgrade(index = 1): RewardNotice {
        return { ...this.notice(index), items: [], roleUpgrade: { beforeLevel: 1, afterLevel: 3 } };
    }

    /** 用实际模板原星级构造本轮冻结实例；同模板多个实例与items真实到账数逐项对应。 */
    public heroes(index: number, templates: readonly number[], gold = 0): RewardNotice {
        const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
        const rows = JSON.parse(readFileSync(resolveBundleFile("config/herotype.json"), "utf8")).rows;
        const counts = new Map<number, number>();
        const heroes = templates.map((templateId, offset) => {
            const row = rows.find((value: { type: number }) => value.type === templateId);
            assert(row, "英雄奖励夹具必须来自真实模板");
            counts.set(templateId, (counts.get(templateId) || 0) + 1);
            return { instanceId: "22345678-1234-4234-8234-" + String(index * 10 + offset).padStart(12, "0"),
                templateId, star: row.star, level: 1, stage: 0 };
        });
        return { ...this.notice(index), heroes,
            items: [...counts].map(([itemId, credited]) => ({ itemId, credited }))
                .concat(gold > 0 ? [{ itemId: 900001, credited: gold }] : []) };
    }

    /** 用真实Protobuf事件交付当前角色的已提交结果。 */
    public deliver(notice = this.notice()): void {
        this.binding.receive(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
            version: 1, kind: "event", name: Protocol.REWARD_GRANTED,
            connectionId: "isolated-connection", body: notice,
        })));
    }

    /** 模拟唯一资产入口已接纳版本，再明确交付主城宿主就绪；不修改任何奖励资产。 */
    public ready(revision = 7): void {
        this.binding.afterSnapshot({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: { revision } });
        this.binding.setReady(true);
    }

    /** 完成指定窗口的资源准备；此前仅请求打开，不能触发实际展示完成通知。 */
    public finishOpen(row: TestWindow): void {
        assert(this.active.has(row), "只能完成仍属于当前UI的准备窗口");
        const resolve = row.resolve;
        assert(resolve, "窗口应仍在等待准备完成");
        row.resolve = null;
        row.reject = null;
        resolve(row.view);
    }

    /** 普通关闭或取消必须结束当前窗口；正在准备时拒绝其打开Promise。 */
    public close(row: TestWindow): void {
        if (!this.active.delete(row)) {
            return;
        }
        if (row.ctor === RewardView || row.ctor === RoleUpgradeView || row.ctor === HeroRewardView) {
            (row.args as RewardArgs | HeroRewardArgs).onClosed?.();
        } else {
            (row.args as ConfirmArgs).onCancel?.();
        }
        row.reject?.(new Error("测试窗口准备已取消"));
        row.reject = null;
        row.resolve = null;
    }

    /** 按真实确认顺序先关闭原窗口，再交付其明确重试意图。 */
    public confirm(row = this.confirms[this.confirms.length - 1]): void {
        this.active.delete(row);
        (row.args as ConfirmArgs).onConfirm();
    }

    /** 应用退出后恢复真实UI能力，避免全局替身泄漏。 */
    public dispose(): void {
        this.binding.dispose();
        Object.assign(UIManager.instance, this.original);
    }
}

class RewardBindingChecks {
    /** 等待UI打开、失败暂停及确认调度的微任务，不用真实计时器猜测结束。 */
    private static async settle(): Promise<void> {
        for (let index = 0; index < 24; index++) {
            await Promise.resolve();
        }
    }

    /** 真实英雄实例复用唯一反馈队列；按原星级分段，最后一段真正打开才报告整批已展示。 */
    private static async checkHeroFlows(): Promise<number> {
        let checks = 0;
        {
            const test = new BindingFixture(true);
            try {
                const notice = test.heroes(90, [10105007]);
                assert.equal(notice.heroes![0].star, 5, "首里程碑英雄必须采用模板原五星");
                test.deliver(notice);
                test.ready(6);
                await this.settle();
                assert.equal(test.rewards.length, 0, "英雄不能越过统一revision门槛");
                test.deferReward = true;
                test.ready();
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.rewards[0].ctor, HeroRewardView);
                assert.deepEqual((test.rewards[0].args as HeroRewardArgs).hero, notice.heroes![0]);
                assert.deepEqual(test.presented, [], "英雄仅准备中不能报告已展示");
                test.finishOpen(test.rewards[0]);
                await this.settle();
                assert.deepEqual(test.presented, [notice.receiptId]);
                test.close(test.rewards[0]);
                test.binding.restore(notice);
                await this.settle();
                assert.equal(test.rewards.length, 1, "仅英雄奖励不能补出重复type7物品格窗口");
                assert.equal(test.account.snapshot.role!.gold, 17);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const notice = test.heroes(91, [10105007], 10);
                test.ready();
                test.deliver(notice);
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.rewards[0].ctor, HeroRewardView);
                assert.deepEqual(test.presented, [], "混合奖励的英雄段不等于整批已经展示");
                test.binding.restore(notice);
                test.deferReward = true;
                test.close(test.rewards[0]);
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal(test.rewards[1].ctor, RewardView);
                const rest = test.rewards[1].args as RewardArgs;
                assert.equal(rest.receiptId, notice.receiptId);
                assert.deepEqual(rest.heroes, []);
                assert.deepEqual(rest.items, [{ itemId: 900001, credited: 10 }], "后段应剔除已展示英雄的type7格");
                assert.deepEqual(test.presented, [], "后段准备未完成不能提前清业务原意图");
                test.finishOpen(test.rewards[1]);
                await this.settle();
                assert.deepEqual(test.presented, [notice.receiptId]);
                test.close(test.rewards[1]);
                await this.settle();
                assert.equal(test.rewards.length, 2);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const notice = test.heroes(92, [10101001, 10105007, 10104004, 10105007, 10203003]);
                test.ready();
                test.deliver(notice);
                test.deliver(test.notice(93));
                const expected = [...notice.heroes!].sort((left, right) => right.star - left.star);
                for (let index = 0; index < expected.length; index++) {
                    await this.settle();
                    assert.equal(test.rewards.length, index + 1, "关闭本英雄前不能准备下一英雄或下一批");
                    assert.equal(test.rewards[index].ctor, HeroRewardView);
                    assert.deepEqual((test.rewards[index].args as HeroRewardArgs).hero, expected[index],
                        "原星级降序且同星级保持冻结实例顺序");
                    assert.deepEqual(test.presented, index === expected.length - 1 ? [notice.receiptId] : []);
                    test.close(test.rewards[index]);
                    (test.rewards[index].args as HeroRewardArgs).onClosed?.();
                }
                await this.settle();
                assert.equal(test.rewards.length, expected.length + 1);
                assert.equal(test.rewards[expected.length].ctor, RewardView);
                assert.deepEqual(test.presented, [notice.receiptId, test.notice(93).receiptId]);
            } finally { test.dispose(); }
            checks++;
        }
        for (const timing of ["opening", "opened"] as const) {
            const test = new BindingFixture(true);
            try {
                test.ready();
                test.deferReward = timing === "opening";
                test.deliver(test.heroes(94, [10105007, 10104004], 2));
                const old = test.rewards[0];
                const lateResolve = old.resolve;
                const lateReject = old.reject;
                if (timing === "opened") {
                    await this.settle();
                }
                test.binding.resetSession();
                test.changeOwner("new-owner");
                test.ready();
                const next = test.notice(95);
                test.deliver(next);
                lateResolve?.(old.view);
                lateReject?.(new Error("旧英雄资源迟到失败"));
                (old.args as HeroRewardArgs).onClosed?.();
                await this.settle();
                assert.equal(test.rewards.length, 2, "旧英雄结束不能续开第二英雄或旧金币后段");
                assert.equal(test.rewards[1].ctor, RewardView);
                assert.deepEqual(test.presented, [next.receiptId]);
                assert.equal(test.confirms.length, 0, "旧英雄迟到失败不能影响新身份");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const notice = test.heroes(96, [10105007, 10104004]);
                test.failReward = true;
                test.ready();
                test.deliver(notice);
                await this.settle();
                assert.equal(test.confirms.length, 1);
                assert.deepEqual(test.presented, []);
                assert.equal(test.rewards[0].ctor, HeroRewardView);
                test.confirm();
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.deepEqual((test.rewards[1].args as HeroRewardArgs).hero, notice.heroes![0]);
                assert.deepEqual(test.presented, []);
                test.close(test.rewards[1]);
                await this.settle();
                assert.equal(test.rewards.length, 3);
                assert.equal(test.rewards[2].ctor, HeroRewardView);
                assert.deepEqual((test.rewards[2].args as HeroRewardArgs).hero, notice.heroes![1]);
                assert.deepEqual(test.presented, [notice.receiptId], "失败重试仍只在最后英雄段报告整批");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                test.ready();
                test.deliver(test.heroes(97, [10105007, 10104004], 2));
                await this.settle();
                test.binding.dispose();
                (test.rewards[0].args as HeroRewardArgs).onClosed?.();
                await this.settle();
                assert.equal(test.rewards.length, 1, "销毁后不能续开后段英雄或金币");
                assert.deepEqual(test.presented, []);
                assert.equal(test.confirms.length, 0);
            } finally { test.dispose(); }
            checks++;
        }
        return checks;
    }

    /** 真升级复用原通用队列、确认和作用域，覆盖空奖励、失败重试及旧窗口迟到。 */
    private static async checkUpgradeFlows(): Promise<number> {
        let checks = 0;
        {
            const test = new BindingFixture(true);
            try {
                const notice = test.upgrade(70);
                test.deliver(notice);
                test.binding.restore(notice);
                test.ready(6);
                await this.settle();
                assert.equal(test.rewards.length, 0, "只有升级也不能越过统一资产版本门槛");
                test.ready();
                test.deliver(test.notice(71));
                await this.settle();
                assert.equal(test.rewards.length, 1, "升级和后一笔普通奖励共用一个队列");
                assert.equal(test.rewards[0].ctor, RoleUpgradeView);
                assert.deepEqual((test.rewards[0].args as RewardArgs).items, []);
                assert.deepEqual((test.rewards[0].args as RewardArgs).roleUpgrade, notice.roleUpgrade);
                assert.deepEqual(test.presented, [notice.receiptId]);
                test.close(test.rewards[0]);
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal(test.rewards[1].ctor, RewardView);
                (test.rewards[0].args as RewardArgs).onClosed?.();
                test.binding.restore(notice);
                await this.settle();
                assert.equal(test.rewards.length, 2, "重复关闭和原回执不能消费或重放后一笔");
            } finally { test.dispose(); }
            checks++;
        }
        for (const startsWithUpgrade of [false, true]) {
            const test = new BindingFixture(true);
            try {
                const base = test.notice(72);
                const upgraded = { ...base, roleUpgrade: { beforeLevel: 1, afterLevel: 3 } };
                test.binding.restore(startsWithUpgrade ? upgraded : base);
                assert.throws(() => test.binding.restore(startsWithUpgrade ? base : upgraded), /内容不一致/,
                    "同回执从无升级变为有升级或反向改变不能另造展示");
                if (startsWithUpgrade) {
                    assert.throws(() => test.binding.restore({ ...upgraded,
                        roleUpgrade: { beforeLevel: 1, afterLevel: 4 } }), /内容不一致/);
                }
                test.ready();
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.rewards[0].ctor, startsWithUpgrade ? RoleUpgradeView : RewardView);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const notice = test.upgrade(73);
                test.failReward = true;
                test.ready();
                test.deliver(notice);
                test.deliver(test.notice(74));
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.rewards[0].ctor, RoleUpgradeView);
                assert.equal(test.confirms.length, 1);
                assert.deepEqual(test.presented, [], "升级准备失败及销毁不能登记实际展示");
                test.close(test.confirms[0]);
                test.ready(8);
                test.binding.restore(notice);
                await this.settle();
                assert.equal(test.rewards.length, 1, "取消重试后新快照和重复恢复不得自动再弹升级");
                test.binding.retry();
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal(test.rewards[1].ctor, RoleUpgradeView);
                assert.equal((test.rewards[1].args as RewardArgs).receiptId, notice.receiptId);
                assert.deepEqual(test.presented, [notice.receiptId]);
                test.close(test.rewards[1]);
                await this.settle();
                assert.equal(test.rewards.length, 3);
                assert.equal(test.rewards[2].ctor, RewardView);
                assert.deepEqual(test.presented, [notice.receiptId, test.notice(74).receiptId]);
            } finally { test.dispose(); }
            checks++;
        }
        for (const timing of ["opening", "opened"] as const) {
            const test = new BindingFixture(true);
            try {
                test.deferReward = timing === "opening";
                test.ready();
                test.deliver(test.upgrade(75));
                const old = test.rewards[0];
                const lateReject = old.reject;
                test.binding.resetSession();
                test.changeOwner("new-owner");
                test.ready();
                test.deliver(test.upgrade(76));
                await this.settle();
                (old.args as RewardArgs).onClosed?.();
                lateReject?.(new Error("旧升级资源迟到失败"));
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal(test.rewards[1].ctor, RoleUpgradeView);
                assert.deepEqual(test.presented, [test.notice(76).receiptId], "旧升级完成不得报告为新身份已展示");
                assert.equal(test.confirms.length, 0, "旧升级失败不得干扰新角色或弹重试确认");
                test.close(test.rewards[1]);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                test.ready();
                test.deliver(test.upgrade(77));
                test.binding.dispose();
                await this.settle();
                (test.rewards[0].args as RewardArgs).onClosed?.();
                assert.deepEqual(test.presented, []);
                assert.equal(test.confirms.length, 0);
                assert.equal(test.rewards.length, 1);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                test.ready();
                test.deliver({ ...test.upgrade(78), mode: "SILENT" });
                test.deliver({ ...test.upgrade(79), mode: "TIPS" });
                await this.settle();
                assert.equal(test.rewards.length, 0);
                assert.deepEqual(test.toasts, ["角色等级 1 → 3"], "静默保持不显示，TIPS升级复用全局飘字");
                assert.deepEqual(test.presented, [], "TIPS不伪造升级窗口已显示通知");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const actual = { roleId: "isolated-role", items: [], bonuses: [],
                    experience: [{ beforeLevel: 1, beforeExperience: 9, requested: 1, accepted: 1,
                        ignored: 0, level: 2, experience: 0, diamonds: 0 }] };
                test.ready();
                assert.equal(test.binding.restoreActual(test.notice(80).receiptId, 7, actual, "bonuses"), "queued");
                await this.settle();
                assert.equal(test.rewards[0].ctor, RoleUpgradeView);
                assert.deepEqual((test.rewards[0].args as RewardArgs).items, []);
                assert.deepEqual((test.rewards[0].args as RewardArgs).roleUpgrade, { beforeLevel: 1, afterLevel: 2 },
                    "正常主线只投影附赠时仍保留真实升级，不能因零赠钻丢失");
                test.close(test.rewards[0]);
                await this.settle();
                assert.equal(test.binding.restoreActual(test.notice(81).receiptId, 7, actual, "all"), "queued");
                await this.settle();
                assert.equal(test.rewards[1].ctor, RoleUpgradeView);
                assert.deepEqual((test.rewards[1].args as RewardArgs).items, []);
                assert.deepEqual((test.rewards[1].args as RewardArgs).roleUpgrade, { beforeLevel: 1, afterLevel: 2 });
                assert.equal(test.account.snapshot.role!.level, 1, "历史升级展示不能写回当前角色等级");
            } finally { test.dispose(); }
            checks++;
        }
        return checks;
    }

    /** 每例均释放装配和替身，验证失败恢复不会写资产或跨身份打开窗口。 */
    public static async run(): Promise<void> {
        let checks = await this.checkUpgradeFlows();
        checks += await this.checkHeroFlows();
        {
            const test = new BindingFixture(true);
            try {
                const actual = { roleId: "isolated-role", items: [
                    { itemId: 900001, credited: 4000 }, { itemId: 900002, credited: 151 },
                    { itemId: 900003, credited: 50 },
                ], bonuses: [{ source: "ROLE_LEVEL_UP", itemId: 900002, quantity: 10 }],
                experience: [{ beforeLevel: 1, beforeExperience: 0, requested: 50, accepted: 50,
                    ignored: 0, level: 2, experience: 1, diamonds: 10 }] };
                test.ready();
                assert.equal(test.binding.restoreActual(test.notice(60).receiptId, 7, actual, "bonuses"), "queued");
                await this.settle();
                assert.equal(test.rewards[0].ctor, RoleUpgradeView);
                assert.deepEqual((test.rewards[0].args as RewardArgs).roleUpgrade, { beforeLevel: 1, afterLevel: 2 });
                assert.deepEqual((test.rewards[0].args as RewardArgs).items, [{ itemId: 900002, credited: 10 }],
                    "普通胜利后的通用窗只展示独立附赠，不把首通151钻再算一次");
                test.close(test.rewards[0]);
                await this.settle();
                test.binding.restoreActual(test.notice(60).receiptId, 7, actual, "bonuses");
                await this.settle();
                assert.equal(test.rewards.length, 1, "重复原回执不重复弹赠钻");
                test.binding.restoreActual(test.notice(61).receiptId, 7, actual);
                await this.settle();
                assert.equal(test.rewards[1].ctor, RoleUpgradeView);
                assert.deepEqual((test.rewards[1].args as RewardArgs).items,
                    [{ itemId: 900001, credited: 4000 }, { itemId: 900002, credited: 161 },
                        { itemId: 900003, credited: 50 }],
                    "冷恢复基础实际和附赠在同一通用窗按ID合计一次");
                test.close(test.rewards[1]);
                await this.settle();
                assert.equal(test.binding.restoreActual(test.notice(62).receiptId, 7,
                    { ...actual, bonuses: [], experience: [] }, "bonuses"), "empty", "无实际升级及附赠不弹空奖励窗");
                assert.throws(() => test.binding.restoreActual(test.notice(63).receiptId, 7,
                    { ...actual, roleId: "other-role" }), /当前.*角色/);
                assert.equal(test.account.snapshot.role!.gold, 17);
                assert.equal(test.account.snapshot.role!.diamonds, 3, "奖励显示不提交任何历史钱包或资产");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.deliver();
                test.binding.restore(test.notice());
                test.ready(6);
                assert.equal(test.rewards.length, 0);
                test.ready();
                await this.settle();
                assert.equal(test.rewards.length, 1);
                test.close(test.rewards[0]);
                await this.settle();
                test.deliver();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.account.snapshot.role!.gold, 17);
                assert.equal(test.account.snapshot.role!.diamonds, 3);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.failReward = true;
                test.ready();
                test.deliver();
                test.deliver(test.notice(2));
                await this.settle();
                assert.equal(test.rewards.length, 1, "失败销毁回调不能消费原批次或放行后续奖励");
                assert.equal(test.confirms.length, 1);
                assert.equal((test.confirms[0].args as ConfirmArgs).message, "奖励已到账，显示未完成。是否重试？");
                test.confirm();
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal((test.rewards[1].args as RewardArgs).receiptId, test.notice().receiptId);
                test.close(test.rewards[1]);
                await this.settle();
                assert.equal(test.rewards.length, 3);
                assert.equal((test.rewards[2].args as RewardArgs).receiptId, test.notice(2).receiptId);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.failReward = true;
                test.ready();
                test.deliver();
                await this.settle();
                test.close(test.confirms[0]);
                test.deliver(test.notice(2));
                test.ready(8);
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.confirms.length, 1);
                test.binding.retry();
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal((test.rewards[1].args as RewardArgs).receiptId, test.notice().receiptId);
            } finally { test.dispose(); }
            checks++;
        }
        for (const occupied of ["visible", "preparing"] as const) {
            const test = new BindingFixture();
            try {
                test.otherConfirm = occupied === "visible";
                test.otherOpening = occupied === "preparing" ? 1 : 0;
                test.failReward = true;
                test.ready();
                test.deliver();
                await this.settle();
                assert.equal(test.confirms.length, 0);
                test.binding.resetSession();
                assert.equal(test.otherConfirmCloses, 0);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.deferReward = true;
                test.ready();
                test.deliver();
                test.binding.resetSession();
                test.changeOwner("new-owner");
                test.ready();
                test.deliver(test.notice(2));
                await this.settle();
                assert.equal(test.confirms.length, 0, "旧奖励准备失败不得询问新身份");
                assert.equal(test.rewards.length, 2);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.failReward = true;
                test.ready();
                test.deliver();
                await this.settle();
                const oldArgs = test.confirms[0].args as ConfirmArgs;
                test.binding.resetSession();
                test.changeOwner("new-owner");
                test.failReward = true;
                test.ready();
                test.deliver(test.notice(2));
                await this.settle();
                assert.equal(test.confirms.length, 2);
                oldArgs.onConfirm();
                await this.settle();
                assert.equal(test.rewards.length, 2, "旧确认不得重试新身份的失败队首");
                test.confirm();
                await this.settle();
                assert.equal(test.rewards.length, 3);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.failReward = true;
                test.deferConfirm = true;
                test.ready();
                test.deliver();
                await this.settle();
                assert.equal(test.confirms.length, 1);
                test.binding.resetSession();
                await this.settle();
                test.confirm(test.confirms[0]);
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.confirms.length, 1);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.failReward = true;
                test.failConfirm = true;
                test.ready();
                test.deliver();
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.equal(test.confirms.length, 1);
                await this.settle();
                assert.equal(test.confirms.length, 1, "确认自身失败不循环开窗");
                test.binding.retry();
                await this.settle();
                assert.equal(test.rewards.length, 2);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.failReward = true;
                test.ready();
                test.deliver();
                await this.settle();
                const oldArgs = test.confirms[0].args as ConfirmArgs;
                test.binding.retry();
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal(UIManager.instance.isOpen("confirm"), false);
                oldArgs.onConfirm();
                await this.settle();
                assert.equal(test.rewards.length, 2, "显式重试已关闭的旧确认不得再次推进队列");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                assert.throws(() => test.deliver(test.notice(1, "other-role")), /不属于/);
                test.changeOwner("isolated-role", true);
                assert.throws(() => test.deliver(), /不属于/);
                test.changeOwner("isolated-role");
                test.ready();
                test.deliver();
                await this.settle();
                assert.equal(test.rewards.length, 1, "归属拒绝不能占用当前正确回执编号");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture();
            try {
                test.deferReward = true;
                test.ready();
                test.deliver();
                test.binding.dispose();
                await this.settle();
                test.binding.retry();
                test.binding.restore(test.notice(2));
                assert.equal(test.confirms.length, 0);
                assert.equal(test.rewards.length, 1);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const receiptId = test.notice(31).receiptId;
                assert.equal(test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                    { itemId: 900003, quantity: 0 },
                    { itemId: 900001, quantity: 3 },
                    { itemId: 900101, quantity: 4 },
                ]), "queued");
                assert.equal(test.rewards.length, 0, "交付恢复队列不代表宿主或统一资产状态已就绪");
                assert.deepEqual(test.presented, [], "入队不能抢先登记实际展示");
                test.ready(6);
                await this.settle();
                assert.equal(test.rewards.length, 0, "历史反馈仍须等待原事务资产版本");
                test.deferReward = true;
                test.ready();
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.deepEqual(test.presented, [], "资源准备中不能登记实际展示");
                assert.deepEqual((test.rewards[0].args as RewardArgs).items, [
                    { itemId: 900001, credited: 5 },
                    { itemId: 900101, credited: 4 },
                ]);
                test.finishOpen(test.rewards[0]);
                await this.settle();
                assert.deepEqual(test.presented, [receiptId]);
                assert.equal(test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900101, quantity: 4 },
                    { itemId: 900001, quantity: 5 },
                ]), "queued", "同内容去重结果仍表示原批次已交队列");
                await this.settle();
                assert.equal(test.rewards.length, 1);
                test.close(test.rewards[0]);
                await this.settle();
                assert.deepEqual(test.presented, [receiptId], "关闭及重复交付不得再次登记实际展示");
                assert.equal(test.account.snapshot.role!.gold, 17);
                assert.equal(test.account.snapshot.role!.diamonds, 3);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const receiptId = test.notice(32).receiptId;
                test.ready();
                assert.equal(test.binding.restoreItems(receiptId, 7, []), "empty");
                assert.equal(test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 0 },
                    { itemId: 900001, quantity: 0 },
                ]), "empty");
                await this.settle();
                assert.equal(test.rewards.length, 0, "无正实际奖励不能创建空通知或空窗口");
                assert.deepEqual(test.presented, []);
                assert.equal(test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                ]), "queued", "空结果不得占用持久回执的去重编号");
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.deepEqual(test.presented, [receiptId]);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const receiptId = test.notice(33).receiptId;
                const invalidRows: unknown[] = [
                    null,
                    {},
                    [null],
                    [{ itemId: 0, quantity: 1 }],
                    [{ itemId: -1, quantity: 1 }],
                    [{ itemId: 900001.5, quantity: 1 }],
                    [{ itemId: 0x100000000, quantity: 1 }],
                    [{ itemId: Number.MAX_SAFE_INTEGER + 1, quantity: 1 }],
                    [{ itemId: 900001, quantity: -1 }],
                    [{ itemId: 900001, quantity: 0.5 }],
                    [{ itemId: 900001, quantity: Number.NaN }],
                    [{ itemId: 900001, quantity: Number.POSITIVE_INFINITY }],
                    [{ itemId: 900001, quantity: Number.MAX_SAFE_INTEGER + 1 }],
                    [{ itemId: 900001, quantity: "1" }],
                    [{ itemId: 900001, quantity: 2 }, { itemId: 900001, quantity: -1 }],
                    [
                        { itemId: 900001, quantity: Number.MAX_SAFE_INTEGER },
                        { itemId: 900001, quantity: 1 },
                    ],
                ];
                for (const rows of invalidRows) {
                    assert.throws(() => test.binding.restoreItems(receiptId, 7,
                        rows as { itemId: number; quantity: number }[]), Error,
                    "非法历史物品明细必须整批拒绝，不保留局部正奖励");
                }
                for (const revision of [0, -1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
                    assert.throws(() => test.binding.restoreItems(receiptId, revision, [
                        { itemId: 900001, quantity: 2 },
                    ]));
                }
                assert.throws(() => test.binding.restoreItems("chapter:" + receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                ]));
                assert.equal(test.rewards.length, 0);
                assert.deepEqual(test.presented, []);
                test.ready();
                assert.equal(test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                ]), "queued", "整包拒绝不能污染后续正确回执的去重状态");
                await this.settle();
                assert.equal(test.rewards.length, 1);
                assert.deepEqual(test.presented, [receiptId]);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const receiptId = test.notice(34).receiptId;
                test.changeOwner("isolated-role", true);
                assert.throws(() => test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                ]));
                test.account.replace({ busy: false, role: null, error: "" });
                assert.throws(() => test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                ]));
                test.changeOwner("new-owner");
                assert.equal(test.binding.restoreItems(receiptId, 7, [
                    { itemId: 900001, quantity: 2 },
                ]), "queued");
                test.binding.restore({ ...test.notice(34, "new-owner"), items: [{ itemId: 900001, credited: 2 }] });
                test.ready();
                await this.settle();
                assert.equal(test.rewards.length, 1, "历史物品投影应复用当前认证角色并与真实通知共用去重");
                assert.deepEqual(test.presented, [receiptId]);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const first = test.notice(35).receiptId;
                const second = test.notice(36).receiptId;
                const rows = [{ itemId: 900001, quantity: 2 }];
                test.failReward = true;
                test.ready();
                assert.equal(test.binding.restoreItems(first, 7, rows), "queued");
                assert.equal(test.binding.restoreItems(second, 7, rows), "queued");
                await this.settle();
                assert.deepEqual(test.presented, [], "准备失败及其销毁回调均不能登记已展示");
                assert.equal(test.rewards.length, 1);
                test.close(test.confirms[0]);
                assert.equal(test.binding.restoreItems(first, 7, rows), "queued");
                test.ready(8);
                await this.settle();
                assert.equal(test.rewards.length, 1, "重复恢复与新快照不能自动重试失败队首");
                test.binding.retry();
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.equal((test.rewards[1].args as RewardArgs).receiptId, first);
                assert.deepEqual(test.presented, [first]);
                test.binding.retry();
                await this.settle();
                assert.equal(test.rewards.length, 2, "正在展示时重复重试不能换序或再开同一批次");
                test.close(test.rewards[1]);
                await this.settle();
                assert.equal(test.rewards.length, 3);
                assert.equal((test.rewards[2].args as RewardArgs).receiptId, second);
                assert.deepEqual(test.presented, [first, second], "失败后仍按原队列顺序交付实际展示");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                const oldReceiptId = test.notice(37).receiptId;
                const newReceiptId = test.notice(38).receiptId;
                test.ready();
                test.binding.restoreItems(oldReceiptId, 7, [{ itemId: 900001, quantity: 2 }]);
                // 打开已完成，但其成功续段尚未执行；重置必须撤销旧作用域的实际展示通知。
                test.binding.resetSession();
                test.changeOwner("new-owner");
                test.ready();
                test.binding.restoreItems(newReceiptId, 7, [{ itemId: 900001, quantity: 2 }]);
                await this.settle();
                assert.equal(test.rewards.length, 2);
                assert.deepEqual(test.presented, [newReceiptId], "旧身份迟到成功不能报告为新身份展示");
                assert.equal(test.confirms.length, 0);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                test.deferReward = true;
                test.ready();
                test.binding.restoreItems(test.notice(39).receiptId, 7, [{ itemId: 900001, quantity: 2 }]);
                await this.settle();
                assert.deepEqual(test.presented, []);
                test.binding.resetSession();
                test.changeOwner("new-owner");
                test.ready();
                test.binding.restoreItems(test.notice(40).receiptId, 7, [{ itemId: 900001, quantity: 2 }]);
                await this.settle();
                assert.deepEqual(test.presented, [test.notice(40).receiptId]);
                assert.equal(test.confirms.length, 0, "旧身份取消准备的迟到失败不能询问新身份");
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                test.ready();
                test.binding.restoreItems(test.notice(41).receiptId, 7, [{ itemId: 900001, quantity: 2 }]);
                test.binding.dispose();
                await this.settle();
                assert.deepEqual(test.presented, [], "应用销毁后迟到成功不能交付实际展示通知");
                assert.equal(test.confirms.length, 0);
                assert.equal(test.rewards.length, 1);
            } finally { test.dispose(); }
            checks++;
        }
        {
            const test = new BindingFixture(true);
            try {
                test.ready();
                test.deliver({ ...test.notice(42), mode: "SILENT" });
                await this.settle();
                assert.equal(test.rewards.length, 0);
                assert.deepEqual(test.presented, [], "静默接纳不能被报告为奖励窗口实际展示");
            } finally { test.dispose(); }
            checks++;
        }
        console.log("PASS " + checks + " reward binding cases: snapshot gating, item recovery projection, actual presentation, explicit retry and stale scope isolation");
    }
}

void RewardBindingChecks.run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
