/**
 * 通用发奖控制器专项：使用真实通知协议验证统一快照门槛、去重、批次顺序和展示失败恢复。
 * 窗口与飘字仅以可控能力替身观察生命周期，不连接玩家服务，不模拟资产写入。
 */
import { strict as assert } from "node:assert";
import { GameLog } from "../assets/scripts/core/GameLog";
import { RewardController } from "../assets/scripts/features/reward/RewardController";
import { RewardDisplayFixture } from "./RewardDisplayFixture";
import type { RewardArgs } from "../assets/scripts/features/reward/data/RewardData";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";

/** 本机检查隐藏正常日志，失败仍以断言和进程状态交付。 */
GameLog.shared.mirrorConsole = false;

class RewardControllerChecks {
    /** 完整有效通知；编号尾段随用例变化，仍使用真实UUID格式。 */
    private static notice(index = 1, changes: Partial<RewardNotice> = {}): RewardNotice {
        return {
            schemaVersion: 1,
            receiptId: "12345678-1234-4234-8234-" + String(index).padStart(12, "0"),
            roleId: "isolated-role",
            assetRevision: 7,
            mode: "POPUP",
            items: [{ itemId: 101, credited: 2 }],
            ...changes,
        };
    }

    /** 同一原奖励回执携带真实升级；空物品列表也由既有队列完成，不另造升级通知编号。 */
    private static upgrade(index = 1, changes: Partial<RewardNotice> = {}): RewardNotice {
        return this.notice(index, {
            items: [],
            roleUpgrade: { beforeLevel: 1, afterLevel: 3 },
            ...changes,
        });
    }

    /** 真实Protobuf事件往返后经登记路由交付，不在测试中直接伪造其他模块协议。 */
    private static deliver(controller: RewardController, notice: RewardNotice): void {
        const frame = GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
            version: 1,
            kind: "event",
            name: Protocol.REWARD_GRANTED,
            connectionId: "isolated-connection",
            body: notice,
        }));
        ProtocolRouter.instance.dispatch(controller, frame);
    }

    /** 等待展示Promise及后续队列推进完成；不用真实计时器或网络等待。 */
    private static async settle(): Promise<void> {
        for (let index = 0; index < 12; index++) {
            await Promise.resolve();
        }
    }

    /** 构建可控窗口，测试自行关闭每笔；后续窗口不得提前替换当前展示。 */
    private static fixture() {
        const display = new RewardDisplayFixture({
            currentRole: { id: "isolated-role", nickname: "展示测试", level: 1, gold: 0, diamonds: 0 },
            requireRoleOwner: roleId => assert.equal(roleId, "isolated-role"),
        });
        const popups: RewardArgs[] = [];
        const close: (() => void)[] = [];
        const tips: RewardNotice[] = [];
        display.popup = args => {
            popups.push(args);
            return new Promise<void>(resolve => close.push(resolve));
        };
        display.tips = notice => tips.push(notice);
        return { model: display.queue, controller: display.receiver, display, popups, close, tips };
    }

    /** 在每例结束释放监听与内存，随后核对所有关键流程。 */
    public static async run(): Promise<void> {
        let checks = 0;
        {
            const test = this.fixture();
            this.deliver(test.controller, this.notice());
            assert.equal(test.model.snapshot.phase, "waiting-ready");
            test.controller.observeRevision(6);
            test.controller.setReady(true);
            assert.equal(test.model.snapshot.phase, "waiting-state");
            assert.equal(test.popups.length, 0);
            test.controller.observeRevision(7);
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.phase, "showing");
            test.close[0]();
            await this.settle();
            assert.equal(test.model.snapshot.phase, "idle");
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            test.controller.observeRevision(10);
            test.controller.setReady(true);
            const original = this.notice(1, { items: [{ itemId: 102, credited: 3 }, { itemId: 101, credited: 2 }] });
            this.deliver(test.controller, original);
            assert.equal(test.controller.restore(original), false);
            assert.equal(test.controller.restore({ ...original, items: [...original.items].reverse() }), false);
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.acceptedCount, 1);
            test.close[0]();
            await this.settle();
            this.deliver(test.controller, original);
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.phase, "idle");
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            const original = this.notice();
            test.controller.restore(original);
            const before = test.model.snapshot;
            for (const conflict of [
                { ...original, assetRevision: 8 },
                { ...original, mode: "TIPS" },
                { ...original, roleId: "other-result-owner" },
                { ...original, items: [{ itemId: 101, credited: 3 }] },
                { ...original, roleUpgrade: { beforeLevel: 1, afterLevel: 3 } },
            ]) {
                assert.throws(() => test.controller.restore(conflict), /内容不一致/);
                assert.deepEqual(test.model.snapshot, before);
            }
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            const original = this.upgrade(1, { items: [{ itemId: 101, credited: 2 }] });
            test.controller.restore(original);
            for (const roleUpgrade of [undefined, { beforeLevel: 1, afterLevel: 4 }, { beforeLevel: 2, afterLevel: 3 }]) {
                assert.throws(() => test.controller.restore({ ...original, roleUpgrade }), /内容不一致/,
                    "同回执删掉或改变升级信息也属于冲突，不能另弹第二窗");
            }
            assert.equal(test.model.snapshot.pending.length, 1);
            assert.equal(test.model.snapshot.acceptedCount, 1);
            assert.deepEqual(test.model.snapshot.pending[0].roleUpgrade, { beforeLevel: 1, afterLevel: 3 });
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            const original = this.upgrade();
            this.deliver(test.controller, original);
            assert.equal(test.model.snapshot.phase, "waiting-ready");
            assert.equal(test.model.snapshot.pending.length, 1);
            assert.equal(test.model.snapshot.pending[0].receiptId, original.receiptId);
            test.controller.setReady(true);
            test.controller.observeRevision(6);
            assert.equal(test.popups.length, 0, "升级同样等待原事务统一资产版本");
            test.controller.observeRevision(7);
            assert.equal(test.popups.length, 1);
            assert.equal(test.popups[0].receiptId, original.receiptId);
            assert.deepEqual(test.popups[0].items, []);
            assert.deepEqual(test.popups[0].roleUpgrade, original.roleUpgrade);
            assert(Object.isFrozen(test.popups[0].roleUpgrade));
            assert.equal(test.controller.restore(original), false);
            test.close[0]();
            await this.settle();
            this.deliver(test.controller, original);
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.phase, "idle");
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            for (const invalid of [
                { ...this.notice(), schemaVersion: 2 },
                { ...this.notice(), receiptId: "invalid" },
                { ...this.notice(), roleId: "" },
                { ...this.notice(), assetRevision: 0 },
                { ...this.notice(), assetRevision: Number.MAX_SAFE_INTEGER + 1 },
                { ...this.notice(), mode: "UNKNOWN" },
                { ...this.notice(), items: [] },
                { ...this.notice(), items: [{ itemId: 101, credited: 0 }] },
                { ...this.notice(), items: [{ itemId: 101, credited: 1.5 }] },
                { ...this.notice(), items: [{ itemId: 0, credited: 1 }] },
                { ...this.notice(), items: [{ itemId: 101, credited: 1 }, { itemId: 101, credited: 2 }] },
            ]) {
                assert.throws(() => test.controller.restore(invalid));
                assert.equal(test.model.snapshot.acceptedCount, 0);
                assert.equal(test.model.snapshot.pending.length, 0);
            }
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            const silent = this.upgrade(1, { mode: "SILENT" });
            this.deliver(test.controller, silent);
            assert.equal(test.controller.restore(silent), false);
            assert.equal(test.model.snapshot.acceptedCount, 1);
            assert.equal(test.model.snapshot.pending.length, 0);
            test.controller.setReady(true);
            test.controller.observeRevision(100);
            await this.settle();
            assert.equal(test.popups.length, 0);
            assert.equal(test.tips.length, 0);
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            const tips = this.upgrade(1, { mode: "TIPS" });
            test.controller.setReady(true);
            test.controller.restore(tips);
            assert.equal(test.tips.length, 0);
            test.controller.observeRevision(7);
            await this.settle();
            assert.deepEqual(test.tips, [tips]);
            assert.equal(test.popups.length, 0);
            assert.equal(test.model.snapshot.phase, "idle");
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            test.controller.observeRevision(100);
            test.controller.setReady(true);
            this.deliver(test.controller, this.notice(1));
            this.deliver(test.controller, this.notice(2));
            this.deliver(test.controller, this.notice(3, { mode: "TIPS" }));
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.pending.length, 3);
            test.close[0]();
            await this.settle();
            assert.equal(test.popups.length, 2);
            assert.equal(test.popups[1].receiptId, this.notice(2).receiptId);
            assert.equal(test.tips.length, 0);
            test.close[1]();
            await this.settle();
            assert.equal(test.tips.length, 1);
            assert.equal(test.model.snapshot.pending.length, 0);
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            let attempts = 0;
            test.display.popup = async () => {
                attempts++;
                if (attempts === 1) {
                    throw new Error("测试窗口打开失败");
                }
            };
            test.controller.observeRevision(100);
            test.controller.setReady(true);
            test.controller.restore(this.notice(1));
            await this.settle();
            assert.equal(test.model.snapshot.phase, "failed");
            assert.equal(test.model.snapshot.pending.length, 1);
            test.controller.observeRevision(101);
            test.controller.setReady(false);
            test.controller.setReady(true);
            test.controller.restore(this.notice(2));
            await this.settle();
            assert.equal(attempts, 1);
            test.controller.retry();
            await this.settle();
            assert.equal(attempts, 3);
            assert.equal(test.model.snapshot.phase, "idle");
            assert.equal(test.model.snapshot.acceptedCount, 2);
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            test.controller.setReady(true);
            test.controller.observeRevision(7);
            test.controller.restore(this.notice(1));
            test.display.resetSession();
            assert.equal(test.model.snapshot.ready, false);
            assert.equal(test.model.snapshot.assetRevision, 0);
            assert.equal(test.model.snapshot.acceptedCount, 0);
            // 新展示复用同一编号时，旧窗口的关闭也不能消费新队首。
            test.controller.restore(this.notice(1, { roleId: "new-owner", assetRevision: 1 }));
            test.controller.observeRevision(1);
            test.controller.setReady(true);
            test.close[0]();
            await this.settle();
            assert.equal(test.model.snapshot.pending.length, 1);
            assert.equal(test.model.snapshot.activeReceiptId, this.notice(1).receiptId);
            test.close[1]();
            await this.settle();
            assert.equal(test.model.snapshot.phase, "idle");
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            const original = this.upgrade(1, { items: [{ itemId: 101, credited: 2 }] });
            test.controller.restore(original);
            (original.items[0] as { credited: number }).credited = 99;
            (original.roleUpgrade as { afterLevel: number }).afterLevel = 9;
            assert.equal(test.model.snapshot.pending[0].items[0].credited, 2);
            assert.equal(Object.isFrozen(test.model.snapshot.pending[0]), true);
            assert.equal(Object.isFrozen(test.model.snapshot.pending[0].items), true);
            assert.equal(Object.isFrozen(test.model.snapshot.pending[0].items[0]), true);
            assert.deepEqual(test.model.snapshot.pending[0].roleUpgrade, { beforeLevel: 1, afterLevel: 3 });
            assert.equal(Object.isFrozen(test.model.snapshot.pending[0].roleUpgrade), true);
            test.controller.observeRevision(9);
            test.controller.observeRevision(7);
            assert.equal(test.model.snapshot.assetRevision, 9);
            assert.throws(() => test.controller.observeRevision(-1));
            assert.throws(() => test.controller.observeRevision(Number.NaN));
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            test.controller.observeRevision(9);
            test.controller.setReady(true);
            test.controller.restore(this.notice(1));
            test.controller.restore(this.notice(2));
            test.display.dispose();
            test.close[0]();
            await this.settle();
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.acceptedCount, 0);
            assert.equal(test.model.snapshot.pending.length, 0);
            assert.throws(() => this.deliver(test.controller, this.notice(3)), /不属于已登记/);
            assert.throws(() => test.controller.restore(this.notice(3)), /尚未初始化/);
            const reopened = this.fixture();
            reopened.display.popup = async () => {};
            reopened.controller.observeRevision(1);
            reopened.controller.setReady(true);
            reopened.controller.restore(this.notice(3, { assetRevision: 1 }));
            await this.settle();
            assert.equal(reopened.model.snapshot.phase, "idle");
            reopened.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            test.controller.observeRevision(10);
            test.controller.setReady(true);
            this.deliver(test.controller, this.notice(1));
            this.deliver(test.controller, this.notice(2));
            test.controller.setReady(false);
            test.close[0]();
            await this.settle();
            assert.equal(test.popups.length, 1);
            assert.equal(test.model.snapshot.phase, "waiting-ready");
            test.controller.setReady(true);
            assert.equal(test.popups.length, 2);
            test.close[1]();
            await this.settle();
            assert.equal(test.model.snapshot.phase, "idle");
            test.display.dispose();
            checks++;
        }
        {
            const test = this.fixture();
            let rejectOld: (reason: unknown) => void = () => undefined;
            test.display.popup = () => new Promise<void>((_resolve, reject) => { rejectOld = reject; });
            test.controller.observeRevision(10);
            test.controller.setReady(true);
            test.controller.restore(this.notice(1));
            test.display.resetSession();
            test.display.popup = async () => {};
            test.controller.restore(this.notice(2, { assetRevision: 1, mode: "TIPS" }));
            test.controller.observeRevision(1);
            test.controller.setReady(true);
            rejectOld(new Error("旧窗口迟到失败"));
            await this.settle();
            assert.equal(test.model.snapshot.phase, "idle");
            assert.equal(test.model.snapshot.acceptedCount, 1);
            assert.equal(test.model.snapshot.message, "");
            assert.equal(test.tips.length, 1);
            test.display.dispose();
            checks++;
        }
        console.log("PASS " + checks + " reward controller cases: real protocol, snapshot gate, dedupe, FIFO, retry and stale UI isolation");
    }
}

void RewardControllerChecks.run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
