/**
 * 里程碑实际领取客户端专项：复用Java独立H2结果，检查稳定键恢复、双确认、迟到及反馈互斥。
 * 不启动服务、不发放资产；网络与统一快照交付使用可控能力替身，业务校验运行真实Controller/PB。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { MainChapterMilestoneController } from "../assets/scripts/features/battle/MainChapterMilestoneController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterMilestoneReceipt, MainChapterMilestoneSend } from "../assets/scripts/features/battle/data/MainChapterMilestoneData";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { GameLog } from "../assets/scripts/core/GameLog";
import { RewardUtils } from "../assets/scripts/features/reward/utils/RewardUtils";
import { RewardModel } from "../assets/scripts/features/reward/RewardModel";

/** 从本轮真实独立H2产物读取，测试不手造成功资产或英雄实例。 */
const fixture = JSON.parse(readFileSync("backend/target/chapter-milestone-review.json", "utf8"));
/** 当前原冻结回执，后续测试修改均先深复制。 */
const receipt: MainChapterMilestoneReceipt = MainChapterMilestoneController.readReceipt(fixture.receipt);
/** 单纯帮助异步任务跨过实际Promise微任务，不使用睡眠或假时间。 */
async function flush(): Promise<void> { for (let count = 0; count < 12; count++) { await Promise.resolve(); } }
/** 深复制PB可表达的JSON测试输入，不复用生产冻结对象做篡改。 */
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

class MilestoneClaimChecks {
    /** Java三份真实帧经TS严格解析和重编完全一致；实例与原回执严格保留。 */
    public static protocol(): void {
        for (const part of ["claimed", "status", "snapshot"]) {
            const frame = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync(
                "backend/target/chapter-milestone-" + part + ".pb")));
            assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(frame)), frame);
        }
        for (const mutate of [
            (value: any) => { value.actual.roleId = "another-role"; },
            (value: any) => { value.actual.heroes.push(copy(value.actual.heroes[0])); },
            (value: any) => { value.actual.heroes[0].templateId++; },
            (value: any) => { value.actual.heroes[0].stage = -1; },
            (value: any) => { value.state.milestoneProgress.claimedIds = []; },
            (value: any) => { value.assetRevision++; },
        ]) {
            const value = copy(fixture.receipt);
            mutate(value);
            assert.throws(() => MainChapterMilestoneController.readReceipt(value));
        }
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ version: 1, kind: "request",
            name: Protocol.CHAPTER_MILESTONE_CLAIM, body: { rewardId: 100, roleId: "forged" } }));
    }

    /** 回执先到必须等统一集合及revision；缺状态只鉴权一次，重复快照/恢复不重发或重弹。 */
    public static async doubleConfirmation(): Promise<void> {
        const model = new MainChapterModel();
        model.state = { maxCleared: 15, pendingBattleId: null, assetRevision: receipt.assetRevision - 1,
            challengeLimit: 20, milestoneProgress: { schemaVersion: 1, claimedIds: [] } };
        const controller = new MainChapterMilestoneController(model);
        const names: string[] = [];
        let refreshes = 0, deliveries = 0;
        controller.configure(async (name, body, received) => {
            names.push(name);
            assert.deepEqual(body, { rewardId: 100 });
            received({ version: 1, kind: "response", name, ok: true, body: fixture.receipt });
        }, async () => { refreshes++; }, async () => { deliveries++; });
        controller.initialize();
        await controller.claim(100);
        assert.equal(deliveries, 0);
        assert.equal(refreshes, 1);
        assert.equal(model.milestoneClaim.phase, "pending");
        const latest = { ...receipt.state, maxCleared: 20, challengeLimit: 20,
            assetRevision: receipt.assetRevision + 2 };
        model.state = latest;
        controller.afterSnapshot();
        controller.afterSnapshot();
        await flush();
        assert.equal(deliveries, 1);
        assert.equal(model.milestoneClaim.phase, "confirmed");
        assert.equal(model.state, latest, "历史receipt.state不可回写当前进度/范围");
        await controller.recover(100);
        assert.deepEqual(names, [Protocol.CHAPTER_MILESTONE_CLAIM]);
        controller.dispose();
    }

    /** 冷原键先status；若提交已完成只读旧结果，尚未提交才按同键补一次原领取。 */
    public static async stableRecovery(): Promise<void> {
        for (const found of [true, false]) {
            const model = new MainChapterModel();
            model.state = receipt.state;
            const controller = new MainChapterMilestoneController(model);
            const names: string[] = [];
            let deliveries = 0;
            controller.configure(async (name, body, received) => {
                names.push(name);
                received({ version: 1, kind: "response", name, ok: true,
                    body: name === Protocol.CHAPTER_MILESTONE_STATUS
                        ? { rewardId: 100, found, ...(found ? { receipt: fixture.receipt } : {}) } : fixture.receipt });
            }, async () => assert.fail("已有足够统一快照不应额外同步"), async () => { deliveries++; });
            controller.initialize();
            const first = controller.recover(100);
            assert.equal(first, controller.recover(100));
            await first;
            assert.deepEqual(names, found ? [Protocol.CHAPTER_MILESTONE_STATUS]
                : [Protocol.CHAPTER_MILESTONE_STATUS, Protocol.CHAPTER_MILESTONE_CLAIM]);
            assert.equal(deliveries, 1);
            controller.dispose();
        }
    }

    /** 旧在途回调和排队交付在重置后失效，不把旧英雄或反馈交给新身份。 */
    public static async lateAndReset(): Promise<void> {
        const model = new MainChapterModel();
        model.state = receipt.state;
        const controller = new MainChapterMilestoneController(model);
        let received: Parameters<MainChapterMilestoneSend>[2] | null = null;
        let resolve!: () => void;
        let deliveries = 0;
        controller.configure(async (_name, _body, next) => {
            received = next;
            await new Promise<void>(done => { resolve = done; });
        }, async () => {}, async () => { deliveries++; });
        controller.initialize();
        const task = controller.claim(100);
        await flush();
        controller.resetSession();
        (received as unknown as Parameters<MainChapterMilestoneSend>[2])({ version: 1, kind: "response",
            name: Protocol.CHAPTER_MILESTONE_CLAIM, ok: true, body: fixture.receipt });
        resolve();
        await task;
        assert.equal(model.milestoneClaim.receipt, null);
        assert.equal(deliveries, 0);
        controller.dispose();
    }

    /** 异步通用反馈交付共享一份Promise；失败原结果仍在，显式重试只交反馈不再次领取。 */
    public static async feedbackFailureAndConcurrentSnapshots(): Promise<void> {
        const model = new MainChapterModel();
        model.state = receipt.state;
        const controller = new MainChapterMilestoneController(model);
        let calls = 0, sends = 0;
        let reject!: (error: Error) => void;
        controller.configure(async (name, _body, received) => {
            sends++;
            received({ version: 1, kind: "response", name, ok: true, body: fixture.receipt });
        }, async () => {}, async () => {
            calls++;
            if (calls === 1) { await new Promise<void>((_done, failed) => { reject = failed; }); }
        });
        controller.initialize();
        const first = controller.claim(100);
        await flush();
        controller.afterSnapshot();
        controller.afterSnapshot();
        assert.equal(calls, 1);
        reject(new Error("独立展示故障"));
        await assert.rejects(first, /独立展示故障/);
        controller.afterSnapshot();
        await flush();
        assert.equal(calls, 1, "普通推送不自动循环重试失败窗口");
        await controller.recover(100);
        assert.equal(calls, 2);
        assert.equal(sends, 1);
        controller.dispose();
    }

    /** 新英雄反馈沿原回执队列去重，同ID换实例必须冲突，不生成第二份英雄获得队列。 */
    public static heroFeedback(): void {
        const notice = RewardUtils.fromActual(receipt.receiptId, receipt.assetRevision, receipt.actual)!;
        assert.equal(notice.heroes!.length, 1);
        assert.deepEqual(notice.heroes, receipt.actual.heroes);
        assert.equal(notice.items.find(item => item.itemId === 10105007)!.credited, 1);
        const model = new RewardModel();
        assert.equal(model.accept(notice), true);
        assert.equal(model.accept(notice), false);
        assert.throws(() => model.accept({ ...notice, heroes: [{ ...notice.heroes![0],
            instanceId: "12345678-1234-4234-8234-123456789012" }] }));
        assert.throws(() => GameProtocolCodecUtils.validateRewardNotice({ ...notice,
            heroes: [notice.heroes![0], notice.heroes![0]] }));
        assert.equal(RewardUtils.fromActual(receipt.receiptId, receipt.assetRevision,
            receipt.actual, "POPUP", "bonuses"), null, "已单独展示基础英雄时不把实例当升级附赠重播");
    }
}

/** 单进程逐组验证，不连接现有账号，不把历史fixture当本次资产提交。 */
async function main(): Promise<void> {
    GameLog.shared.mirrorConsole = false;
    MilestoneClaimChecks.protocol();
    await MilestoneClaimChecks.doubleConfirmation();
    await MilestoneClaimChecks.stableRecovery();
    await MilestoneClaimChecks.lateAndReset();
    await MilestoneClaimChecks.feedbackFailureAndConcurrentSnapshots();
    MilestoneClaimChecks.heroFeedback();
    console.log("PASS milestone claim 6 groups: real Java PB, stable recovery, double confirmation, lifecycle and shared hero feedback");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
