/** 验证试炼跨日恢复重放原回执后，仍会主动更新今日难度。 */
import { strict as assert } from "node:assert";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import { TrialController } from "../assets/scripts/features/trial/TrialController";
import { TrialModel } from "../assets/scripts/features/trial/TrialModel";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { RewardUtils } from "../assets/scripts/features/reward/utils/RewardUtils";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol, type TrialCommand, type TrialState } from "../assets/scripts/platform/Protocol";

/** 等待测试交付结果的一条认证请求。 */
interface PendingRequest {
    readonly name: GameFrame["name"];
    readonly body: unknown;
    readonly reply: (body: unknown) => void;
    readonly reject: (error: Error) => void;
}

/** 构造难度未选和已选两种服务端快照，早期节点按已补奖后的状态返回。 */
function trialState(version: number, resetAtSeconds: number, difficulty: number): TrialState {
    const reward = { itemId: 901201, quantity: 1 };
    return {
        version, minimumLevel: 30, resetAtSeconds, difficulty, maxDifficulty: 3, completedDifficulty: 2,
        currentNode: difficulty ? 5 : 0, reviveUsed: 0, reviveLimit: 0, formationId: 1, slots: [], heroHealth: [],
        todayRewards: difficulty ? [reward] : [],
        difficulties: [0, 1000000, 1800000].map((minimumPower, index) => ({
            id: index + 1, minimumPower, rewards: [reward], combatReady: true,
        })),
        nodes: difficulty ? Array.from({ length: 20 }, (_, index) => {
            const node = index + 1;
            const chest = node % 4 === 0;
            return { node, type: chest ? "chest" : "battle", status: node < 5 ? "cleared" : node === 5 ? "available" : "locked",
                displayLevel: chest ? 0 : node - Math.floor(node / 4), rewards: [reward] };
        }) : [],
    };
}

/** 验证昨日补奖原回执可恢复发奖展示，当前界面随后使用今日资格继续选档。 */
function checkPreviousDaySelectionReceipt(): void {
    const controller = new TrialController();
    const model = TrialModel.instance;
    const clock = ServerClock.instance;
    const pending: PendingRequest[] = [];
    const restoredRewards: string[] = [];
    const operations: Pick<AccountOperations, "deliver"> = {
        deliver: (name, body, received, failed) => new Promise<void>(resolve => {
            pending.push({
                name, body,
                reply: snapshot => {
                    received({ version: 1, ok: true, kind: "response", name, body: snapshot });
                    resolve();
                },
                reject: error => {
                    failed(error);
                    resolve();
                },
            });
        }),
    };
    const previousBoundary = 1800000000;
    controller.configure(operations as AccountOperations, {
        restoreActual: (id, revision, actual) => {
            const notice = RewardUtils.fromActual(id, revision, actual);
            assert.deepEqual(notice?.items, [{ itemId: 901201, credited: 1185 }]);
            restoredRewards.push(id);
            return "queued";
        },
    });
    const originalToast = UIManager.instance.toast;
    UIManager.instance.toast = () => {};
    try {
        controller.initialize();
        clock.synchronize((previousBoundary - 60) * 1000);
        controller.setVisible(true);
        const initial = pending.shift();
        assert.ok(initial);
        assert.equal(initial.name, Protocol.TRIAL_STATE);
        initial.reply(trialState(7, previousBoundary, 0));
        controller.act("selectDifficulty", { choice: 3 });
        const firstSelection = pending.shift();
        assert.ok(firstSelection);
        assert.equal(firstSelection.name, Protocol.TRIAL_ACT);
        const originalCommand = firstSelection.body as TrialCommand;
        firstSelection.reject(new SocketFailure("DISCONNECTED", "连接已断开"));
        assert.ok(controller.awaitingResult);

        clock.synchronize((previousBoundary + 60) * 1000);
        controller.refreshVisible();
        const retriedSelection = pending.shift();
        assert.ok(retriedSelection);
        assert.equal(retriedSelection.name, Protocol.TRIAL_ACT);
        assert.deepEqual(retriedSelection.body, originalCommand);
        retriedSelection.reply({
            requestId: originalCommand.requestId, roleId: "trial-test", assetRevision: 8,
            action: "selectDifficulty", state: trialState(8, previousBoundary, 3),
            actual: { roleId: "trial-test", items: [{ itemId: 901201, credited: 1185 }], bonuses: [], heroes: [] },
        });
        assert.deepEqual(restoredRewards, [originalCommand.requestId]);
        assert.equal(model.snapshot, null);
        assert.equal(controller.awaitingResult, false);

        const nextDayRead = pending.shift();
        assert.ok(nextDayRead);
        assert.equal(nextDayRead.name, Protocol.TRIAL_STATE);
        assert.deepEqual(nextDayRead.body, {});
        nextDayRead.reply(trialState(9, previousBoundary + 86400, 0));
        assert.equal(model.resetAtSeconds, previousBoundary + 86400);
        assert.equal(controller.busy, false);
        assert.equal(pending.length, 0);
    } finally {
        controller.dispose();
        clock.invalidate();
        UIManager.instance.toast = originalToast;
    }
}

checkPreviousDaySelectionReceipt();
console.log("PASS 试炼跨日原回执重放、补奖反馈与次日难度刷新");
