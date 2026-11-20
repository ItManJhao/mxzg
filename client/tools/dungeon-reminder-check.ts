/**
 * 验证金币副本的红点资格、后台合并和前台优先级。
 * 使用真实控制器和路由，替换认证通道以控制交付顺序与连接失败。
 */
import { strict as assert } from "node:assert";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol } from "../assets/scripts/platform/Protocol";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { DailyDungeonController } from "../assets/scripts/features/dungeon/DailyDungeonController";
import { DailyDungeonModel, type DailyDungeonState } from "../assets/scripts/features/dungeon/DailyDungeonModel";

/** 测试手动交付的一次已认证读取或写操作。 */
interface TestRequest {
    readonly name: AuthenticatedGameProtocol;
    readonly body: unknown;
    readonly received: (frame: GameFrame) => void;
    readonly failed: (error: unknown) => void;
}

const requests: TestRequest[] = [];
const operations = {
    /** 记录实际发送的协议，测试随后选择回包顺序。 */
    deliver(name: AuthenticatedGameProtocol, body: unknown, received: TestRequest["received"], failed: TestRequest["failed"]): Promise<void> {
        requests.push({ name, body, received, failed });
        return Promise.resolve();
    },
};
const controller = DailyDungeonController.instance;
const model = DailyDungeonModel.instance;
const manager = RedDotManager.instance;
const canPlay: DailyDungeonState = {
    stageId: 1, titleLanguageId: 10, wins: 0, freeLimit: 2, totalLimit: 5, nextCostDiamonds: 0,
    resetAtSeconds: 600, power: 5000, requiredPower: 3000, cleared: false, unlocked: true,
    canChallenge: true, rewardPreview: [],
};

/** 交付一份合约形状和真实协议名均匹配的确认状态。 */
function resolveList(request: TestRequest, state: DailyDungeonState): void {
    assert.equal(request.name, Protocol.DAILY_DUNGEON_LIST);
    assert.deepEqual(request.body, {});
    request.received({ version: 1, kind: "response", name: request.name, ok: true, body: state });
}

/** 查看副本底栏是否从金币叶子获取到提醒。 */
function ready(): boolean {
    return manager.isVisible(GameRedDotKey.DUNGEON);
}

controller.configure(operations as unknown as AccountOperations, {
    /** 本专项不发放奖励。 */
    restoreActual() { assert.fail("提醒查询不能触发奖励反馈"); },
});
controller.initialize();
try {
    // 资格变化合并一次跟读，第一份旧结果不刷新红点或前台状态。
    controller.refreshReminder();
    controller.refreshReminder();
    assert.equal(controller.busy, false);
    assert.equal(requests.length, 1);
    resolveList(requests[0], { ...canPlay, canChallenge: false });
    assert.equal(requests.length, 2);
    assert.equal(model.state, null);
    resolveList(requests[1], canPlay);
    assert.equal(model.state, canPlay);
    assert.equal(ready(), true);

    // 打开前台不会挂在后台等回包；旧的免费次数不能覆盖之后的权威结果。
    controller.refreshReminder();
    controller.setVisible(true);
    assert.equal(requests.length, 4);
    assert.equal(controller.busy, true);
    resolveList(requests[2], canPlay);
    assert.equal(controller.busy, true);
    const paidOnly = { ...canPlay, wins: canPlay.freeLimit, nextCostDiamonds: 10 };
    resolveList(requests[3], paidOnly);
    assert.equal(model.state, paidOnly);
    assert.equal(ready(), false);

    // 后台失败无前台等待。挑战断线时，只有原入口能再次提交同一命令。
    controller.setVisible(false);
    controller.refreshReminder();
    requests[4].failed(new Error("后台读取失败"));
    assert.equal(controller.busy, false);
    assert.equal(model.state, paidOnly);
    controller.challenge();
    assert.equal(requests[5].name, Protocol.DAILY_DUNGEON_CHALLENGE);
    requests[5].failed(new SocketFailure("DISCONNECTED"));
    controller.refreshReminder();
    assert.equal(requests.length, 6);
    controller.setVisible(true);
    assert.equal(requests[6].name, Protocol.DAILY_DUNGEON_CHALLENGE);
    assert.deepEqual(requests[6].body, requests[5].body);

    // 隔离账号切换后，即使通道还交付一份旧读取，也不能重新点亮入口。
    controller.resetSession();
    manager.reset();
    controller.refreshReminder();
    controller.resetSession();
    resolveList(requests[7], canPlay);
    assert.equal(ready(), false);
    assert.equal(model.state, null);
} finally {
    controller.dispose();
    manager.reset();
}

console.log("dungeon-reminder passed: authoritative free quota, coalesced read, foreground priority and account reset");
