/** 独立通关奖励专项：验证实际策划、原关卡回执、资格快照及预制体入口，不连接玩家环境。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterFirstRewardController } from "../assets/scripts/features/battle/MainChapterFirstRewardController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterState } from "../assets/scripts/features/battle/MainChapterModel";
import type { FirstRewardSend, MainChapterFirstRewardReceipt } from "../assets/scripts/features/battle/data/MainChapterFirstRewardData";
import { ChapterClearRewardUtils } from "../assets/scripts/features/battle/utils/ChapterClearRewardUtils";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 独立测试的持久成功回执。 */
const receiptId = "a0210000-1111-4111-8111-111111111111";
/** 所有测试回执属于同一隔离角色。 */
const roleId = "test-clear-reward-role";

/** 构造服务端同形主线快照；里程碑和独立奖励必须保留独立记录。 */
function state(maxCleared: number, claimedChapters: number[], eligibleChapters: number[], revision = 4): MainChapterState {
    return MainChapterController.readState({
        maxCleared, challengeLimit: 20, assetRevision: revision, pendingBattleId: null,
        milestoneProgress: { schemaVersion: 1, claimedIds: maxCleared >= 15 ? [1] : [] },
        firstRewardProgress: { schemaVersion: 1, claimedChapters, eligibleChapters },
    })!;
}

/** 一份冻结真实装备回执形状，仅说明实际到账。 */
function result(chapter: number): MainChapterFirstRewardReceipt {
    return {
        chapter, schemaVersion: 1, receiptId, roleId, assetRevision: 5,
        actual: {
            roleId, items: [{ itemId: 1001001, requested: 1, credited: 1, ignored: 0, reason: "NONE" }],
            bonuses: [], heroes: [], experience: [],
            ...{
                timedItems: [], stacks: [], tavern: [], spirits: { schemaVersion: 1, items: [] },
                wallet: { goldBefore: 0, goldAfter: 0, diamondsBefore: 0, diamondsAfter: 0 },
            },
        },
    };
}

/** 使用真实编解码产出的回包确认，客户端不能跳过信封或业务原键。 */
function sendFrame(name: Parameters<FirstRewardSend>[0], body: unknown, received: Parameters<FirstRewardSend>[2]): void {
    received(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1, kind: "response", ok: true, id: "separate-clear-reward", name, body,
    })));
}

/** 有界推进异步回执，不用固定延时判断已发放。 */
async function waitFor(check: () => boolean): Promise<void> {
    for (let i = 0; i < 40 && !check(); i++) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert(check());
}

/** 用实际统一配置核对第一批绝对关卡和奖励，旧里程碑第15关不影响独立档位。 */
async function verifyList(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const entries = ChapterClearRewardUtils.config(config.getFileByPath("config/firstrewardchapter"));
    assert.deepEqual(entries.slice(0, 5).map(row => row.chapter), [1, 5, 10, 15, 20]);
    assert.deepEqual(entries[0].items, [{ itemId: 1001001, quantity: 1 }, { itemId: 1002001, quantity: 1 }]);
    const pending = new MainChapterModel().firstRewardClaim;
    const rows = ChapterClearRewardUtils.rows(entries, state(15, [1], [5, 10, 15]), pending);
    assert.deepEqual(rows.slice(0, 4).map(row => [row.chapter, row.status]), [[5, "claim"], [10, "claim"], [15, "claim"], [20, "battle"]]);
    assert.equal(rows.length, entries.length);
    assert.equal(rows[rows.length - 1].status, "claimed");
    assert.equal(rows[rows.length - 1].chapter, 1);
    assert.equal(rows.find(row => row.chapter === 25)?.actionText, "暂未开放");
    assert(ChapterClearRewardUtils.rows(entries, null, pending).every(row => !row.enabled));
    assert.throws(() => state(15, [15], [15]), /进度冲突/);
    assert.throws(() => state(1, [], [5]), /进度冲突/);
}

/** 回执先到，里程碑相同关卡也不应触发展示；等待同一统一已领状态后只交一次。 */
async function verifyDualConfirmation(): Promise<void> {
    const model = new MainChapterModel();
    model.state = state(15, [], [15]);
    const controller = new MainChapterFirstRewardController(model);
    let refresh: (() => void) | undefined;
    const requests: Array<[string, number]> = [];
    const feedback: MainChapterFirstRewardReceipt[] = [];
    controller.configure(async (name, body, receive) => {
        requests.push([name, body.chapter]);
        sendFrame(name, result(body.chapter), receive);
    }, () => new Promise(resolve => { refresh = resolve; }), receipt => { feedback.push(receipt); });
    controller.initialize();
    try {
        const claim = controller.claim(15);
        assert.equal(controller.claim(15), claim);
        await waitFor(() => !!refresh);
        assert.equal(feedback.length, 0);
        controller.afterSnapshot();
        assert.equal(feedback.length, 0);
        assert.deepEqual(requests, [[Protocol.CHAPTER_FIRST_REWARD_CLAIM, 15]]);
        model.state = state(15, [15], [], 5);
        controller.afterSnapshot();
        refresh!();
        await claim;
        assert.deepEqual(feedback.map(value => [value.chapter, value.receiptId]), [[15, receiptId]]);
        assert.equal(model.firstRewardClaim.phase, "confirmed");
        await controller.recover(15);
        assert.equal(feedback.length, 1);
    } finally {
        controller.dispose();
    }
}

/** 原响应丢失后同一关卡只能进入status恢复；换号后旧回包不能改当前原键。 */
async function verifyRecovery(): Promise<void> {
    const model = new MainChapterModel();
    model.state = state(1, [1], [], 5);
    const controller = new MainChapterFirstRewardController(model);
    const requests: Array<[string, number]> = [];
    let late: (() => void) | undefined;
    let shown = 0;
    controller.configure(async (name, body, receive) => {
        requests.push([name, body.chapter]);
        await new Promise<void>(resolve => {
            late = () => {
                sendFrame(name, { chapter: body.chapter, found: true, receipt: result(body.chapter) }, receive);
                resolve();
            };
        });
    }, async () => assert.fail("已接纳快照不应重新鉴权"), () => { shown++; });
    controller.initialize();
    try {
        const wait = controller.recover(1);
        await waitFor(() => !!late);
        controller.resetSession();
        late!();
        await wait;
        assert.equal(shown, 0);
        assert.equal(model.firstRewardClaim.phase, "idle");
        late = undefined;
        const resume = controller.recover(1);
        await waitFor(() => !!late);
        late!();
        await resume;
        assert.equal(shown, 1);
        assert.deepEqual(requests, [[Protocol.CHAPTER_FIRST_REWARD_STATUS, 1], [Protocol.CHAPTER_FIRST_REWARD_STATUS, 1]]);
    } finally {
        controller.dispose();
    }
}

/** 已经持久化的原意图由服务器明确拒绝时可清理；缺快照不能假定拒绝并丢掉原意图。 */
async function verifyEligibilityChange(): Promise<void> {
    const model = new MainChapterModel();
    model.state = MainChapterController.readState({ maxCleared: 1, assetRevision: 4, pendingBattleId: null });
    const controller = new MainChapterFirstRewardController(model);
    const requests: Array<[string, number]> = [];
    controller.configure(async (name, body, receive, fail) => {
        requests.push([name, body.chapter]);
        if (name === Protocol.CHAPTER_FIRST_REWARD_STATUS) {
            sendFrame(name, { chapter: body.chapter, found: false }, receive);
        } else {
            fail(new SocketFailure("FIRST_REWARD_NOT_REACHED", "尚未达到指定关卡"));
        }
    }, async () => assert.fail("未获得回执时不能刷新资产"), () => assert.fail("拒绝结果不能展示"));
    controller.initialize();
    try {
        await assert.rejects(controller.recover(5), /资格尚待服务器确认/);
        assert.equal(model.firstRewardClaim.chapter, 5);
        assert.deepEqual(requests, [[Protocol.CHAPTER_FIRST_REWARD_STATUS, 5]]);
        model.state = state(1, [], [1]);
        await assert.rejects(controller.recover(5), { code: "FIRST_REWARD_NOT_REACHED" });
        assert.equal(model.firstRewardClaim.phase, "idle");
        assert.equal(model.firstRewardClaim.chapter, null);
        assert.deepEqual(requests.slice(1), [[Protocol.CHAPTER_FIRST_REWARD_STATUS, 5], [Protocol.CHAPTER_FIRST_REWARD_CLAIM, 5]]);
    } finally {
        controller.dispose();
    }
}

/** 在真实Prefab验证独立入口及原有两个窗口入口同在，列表绑定跟随实际Cell资源。 */
function verifyPrefabs(): void {
    const root = "client/assets/bundles/module/battle/prefabs/";
    const read = (name: string): any => JSON.parse(readFileSync(root + name, "utf8").replace(/^\uFEFF/, ""));
    const main = read("MainChapterView.prefab");
    const binding = main.find((row: any) => row.rewardInfoButton && row.milestoneCard);
    assert(binding);
    const button = main[binding.clearRewardButton.__id__];
    assert.equal(main[button.node.__id__]._name, "ChapterClearRewardButton");
    assert.equal(main[binding.clearRewardDot.__id__]._active, false);
    const prefab = read("ChapterClearRewardView.prefab");
    const cell = read("ChapterClearRewardCell.prefab.meta");
    assert(prefab.some((row: any) => row.cellPrefab?.__uuid__ === cell.uuid && row.virtual === true));
}

/** 校验同源列表、协议恢复及Prefab资源。 */
async function main(): Promise<void> {
    await verifyList();
    await verifyDualConfirmation();
    await verifyRecovery();
    await verifyEligibilityChange();
    verifyPrefabs();
    console.log("通关奖励旧配置、原关卡回执、权威双确认、换号隔离和Prefab检查通过");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
