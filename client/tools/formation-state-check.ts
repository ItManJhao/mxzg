/** 阵容模块回归：验证原请求重试、ACK与统一状态确认、有界鉴权及页面关闭后的模块存活。 */
import { strict as assert } from "node:assert";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { FormationEvent } from "../assets/scripts/features/hero/utils/FormationEvent";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { GameProtocolCodecUtils, GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { FormationSaveRequest } from "../assets/scripts/features/hero/data/FormationData";

const hero = { id: "00000000-0000-4000-8000-000000000001", templateId: 10105008, level: 1, star: 5 };
const draft = { expectedVersion: 0, formationId: 1, slots: [{ position: 2, heroId: hero.id }] };
/** 权威Model只能由同步流程写入，本测试模拟已校验的模块提交。 */
function sync(model: HeroRosterModel, version: number): void {
    model.replace({ status: "ready", heroes: [hero], error: "", mainFormation: { version,
        slots: version ? draft.slots : [], formationId: 1, unlockedIds: [1], assistanceUnlocked: false,
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    } });
    EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: model.version });
}
/** 通过真实二进制编码生成回执，模块仍须校验关联。 */
function receipt(body: FormationSaveRequest): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({ version: 1, kind: "response", name: Protocol.FORMATION_SAVE,
        id: "response", ok: true, body: { requestId: body.requestId, version: 1 } }));
}
/** 每个用例使用独立模块和Model，不依赖账号或UI。 */
function setup(send: (body: FormationSaveRequest) => Promise<GameFrame>,
    refreshSnapshot: Parameters<FormationController["configure"]>[1] = null) {
    const heroes = new HeroRosterModel(), saves = new FormationSaveModel();
    heroes.reset(); sync(heroes, 0);
    const controller = new FormationController(saves, heroes);
    controller.configure(async (body, received, failed) => {
        try { received(await send(body)); } catch (error) { failed(error); }
    }, refreshSnapshot); controller.initialize(); controller.resetSession();
    return { heroes, saves, controller };
}

/** 等待本轮已登记任务进入交付口，不提前等待仍由用例控制的网络结果。 */
async function settleTasks(): Promise<void> {
    await new Promise<void>(resolve => setImmediate(resolve));
}

/** 分别检查ACK待同步、原编号重试、重复点击合并及每轮一次鉴权。 */
async function main(): Promise<void> {
    let directSaves = 0;
    const p = setup(async body => {
        directSaves++;
        return receipt(body);
    });
    await p.controller.save(draft);
    assert.equal(p.heroes.snapshot.mainFormation!.version, 0, "回执不能写权威Model");
    assert(!p.saves.snapshot.busy, "未装配鉴权时须解除忙碌并保留明确重试入口");
    assert.equal(p.saves.snapshot.acknowledged, 1);
    const originalAck = p.saves.snapshot.pending;
    assert(originalAck, "ACK后仍保留原意图直到权威状态确认");
    await p.controller.save({ ...draft, slots: [] });
    assert.equal(directSaves, 1, "ACK已知时重试不能再次保存或生成新请求");
    assert.deepEqual(p.saves.snapshot.pending, originalAck);
    sync(p.heroes, 1); assert(!p.saves.snapshot.busy); assert.equal(p.saves.snapshot.message, "阵容已保存");
    assert.equal(p.saves.snapshot.pending, null);
    assert.equal(p.saves.snapshot.confirmedRequestId, originalAck.requestId);
    p.controller.dispose();

    let fail = true; const requests: FormationSaveRequest[] = [];
    const retry = setup(async body => { requests.push(structuredClone(body)); if (fail) throw new Error("断线"); return receipt(body); });
    await retry.controller.save(draft); assert(retry.saves.snapshot.pending); assert(!retry.saves.snapshot.busy);
    const page = {}; let notices = 0;
    EventDispatcher.instance.on(FormationEvent.SaveChanged, page, () => notices++);
    EventDispatcher.instance.offTarget(page); // 页面关闭不销毁模块，模拟重新打开后再重试。
    fail = false; await retry.controller.save({ ...draft, slots: [] });
    assert.deepEqual(requests[0], requests[1], "未确认时模块仅原样重试，不能更换参数");
    assert.equal(notices, 0); sync(retry.heroes, 1); assert(!retry.saves.snapshot.busy);
    retry.controller.dispose();

    let finish!: (frame: GameFrame) => void, sent!: FormationSaveRequest, calls = 0;
    const late = setup(body => { sent = body; calls++; return new Promise(resolve => { finish = resolve; }); });
    const first = late.controller.save(draft);
    const duplicate = late.controller.save(draft);
    assert.equal(first, duplicate, "重复点击共享已登记任务");
    await settleTasks();
    assert.equal(calls, 1);
    finish(receipt(sent)); await first;
    assert.deepEqual(late.saves.snapshot.pending, sent);
    assert.equal(late.saves.snapshot.acknowledged, 1);
    sync(late.heroes, 1); late.controller.dispose();
    assert.equal(EventDispatcher.instance.targetListenerCount(late.controller), 0);
    assert.equal("view" in late.controller, false); assert.equal("state" in late.controller, false);

    let refreshes = 0;
    let saveCalls = 0;
    let recovered!: ReturnType<typeof setup>;
    recovered = setup(async body => {
        saveCalls++;
        return receipt(body);
    }, async (received, failed) => {
        refreshes++;
        if (refreshes === 1) {
            failed(new Error("鉴权同步失败"));
            return;
        }
        // 同步首包回调可立即发布名册事件；旧版首包不能递归开启下一轮鉴权。
        sync(recovered.heroes, refreshes === 2 ? 0 : 1);
        received();
    });
    try {
        await recovered.controller.save(draft);
        const pending = recovered.saves.snapshot.pending;
        assert(pending);
        assert.equal(refreshes, 1);
        assert.equal(recovered.saves.snapshot.acknowledged, 1);
        assert(!recovered.saves.snapshot.busy);
        await recovered.controller.save({ ...draft, slots: [] });
        assert.equal(refreshes, 2, "旧版首包每轮只鉴权一次");
        assert.deepEqual(recovered.saves.snapshot.pending, pending);
        assert.equal(recovered.saves.snapshot.acknowledged, 1);
        assert(!recovered.saves.snapshot.busy);
        await recovered.controller.save({ ...draft, slots: [] });
        assert.equal(refreshes, 3);
        assert.equal(saveCalls, 1, "失败、旧版首包及成功恢复均只重试鉴权");
        assert.equal(recovered.saves.snapshot.pending, null);
        assert.equal(recovered.saves.snapshot.acknowledged, null);
        assert.equal(recovered.saves.snapshot.confirmedRequestId, pending.requestId);
    } finally {
        recovered.controller.dispose();
    }
    console.log("PASS formation module: authoritative isolation, original retry, shared task, ACK intent retention, one authentication per round, synchronous state recovery");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
