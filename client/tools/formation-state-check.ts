/** 阵容模块回归：不创建View，验证回执、统一同步、关窗后请求保留与并发提交。 */
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
function setup(send: (body: FormationSaveRequest) => Promise<GameFrame>) {
    const heroes = new HeroRosterModel(), saves = new FormationSaveModel();
    heroes.reset(); sync(heroes, 0);
    const controller = new FormationController(saves, heroes);
    controller.configure(async (body, received, failed) => {
        try { received(await send(body)); } catch (error) { failed(error); }
    }); controller.initialize(); controller.resetSession();
    return { heroes, saves, controller };
}
/** 正常同步、未确认重试和并发业务边界分别检查。 */
async function main(): Promise<void> {
    const p = setup(async body => receipt(body));
    await p.controller.save(draft);
    assert.equal(p.heroes.snapshot.mainFormation!.version, 0, "回执不能写权威Model");
    assert(p.saves.snapshot.busy); assert.equal(p.saves.snapshot.acknowledged, 1);
    sync(p.heroes, 1); assert(!p.saves.snapshot.busy); assert.equal(p.saves.snapshot.message, "阵容已保存");
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
    const first = late.controller.save(draft); await late.controller.save(draft); assert.equal(calls, 1);
    finish(receipt(sent)); await first;
    assert.equal(late.saves.snapshot.pending, null); assert.equal(late.saves.snapshot.acknowledged, 1);
    sync(late.heroes, 1); late.controller.dispose();
    assert.equal(EventDispatcher.instance.targetListenerCount(late.controller), 0);
    assert.equal("view" in late.controller, false); assert.equal("state" in late.controller, false);
    console.log("PASS formation module: no View/draft, authoritative isolation, event-only refresh, pending survives window closure, original retry, concurrent submission guard");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
